import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { stageReleaseWorkspace } from '../../../scripts/release-workspace.mjs';
import { probeSavedTemplateDiagnostics } from './probe-saved-template-diagnostics.mjs';
import { probeWorkspaceTopology } from './probe-workspace-topology.mjs';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const tarballPath = path.resolve(process.argv[2] ?? await latestReleaseTarball(path.join(packageRoot, '.release')));
const receiptPath = process.argv[3];
const typescript = process.env.AURELIA_MCP_PROJECT_LOCAL_TYPESCRIPT_VERSION ?? '5.9.3';
const tarball = await fs.readFile(tarballPath);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'au-mcp-project-local-probe-'));
const projectRoot = path.join(tempRoot, 'app');
const started = performance.now();

try {
  const roots = stageReleaseWorkspace(projectRoot, { typeScriptVersion: typescript });
  const inlineManifest = await readJson(path.join(roots.inlineRoot, 'package.json'));
  const frameworkVersion = inlineManifest.dependencies.aurelia;

  const rootManifestPath = path.join(projectRoot, 'package.json');
  const manifest = await readJson(rootManifestPath);
  manifest.devDependencies = { typescript, '@aurelia-ls/mcp': pathToFileURL(tarballPath).href };
  await writeJson(rootManifestPath, manifest);
  npmInstall(projectRoot);

  const entry = path.join(projectRoot, 'node_modules/@aurelia-ls/mcp/au-mcp.js');
  const require = createRequire(entry);
  const lock = await readJson(path.join(projectRoot, 'package-lock.json'));
  const installed = lock.packages['node_modules/@aurelia-ls/mcp'];
  const integrity = 'sha512-' + createHash('sha512').update(tarball).digest('base64');
  assert.equal(installed.integrity, integrity, 'npm installed the supplied release archive');
  assert.equal(lock.packages['node_modules/aurelia'].version, frameworkVersion);
  assert.equal(lock.packages['node_modules/@aurelia/vite-plugin'].version, frameworkVersion);
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

  async function withInstalledClient(operation) {
    const client = new Client({ name: 'au-mcp-project-local-install-probe', version: '1' });
    try {
      await client.connect(new StdioClientTransport({
        command: process.execPath,
        args: ['--max-old-space-size=8192', entry],
        cwd: projectRoot,
      }));
      assert.equal(client.getServerVersion()?.name, 'au-mcp');
      assert.equal(client.getServerVersion()?.version, installed.version);
      return await operation(client);
    } finally {
      await client.close();
    }
  }

  const result = await withInstalledClient(async client => {
    for (const workspaceRoot of [roots.conventionRoot, roots.inlineRoot]) {
      await checkProjectTypeScript(client, workspaceRoot, require.resolve('typescript/package.json'));
    }
    const topology = await probeWorkspaceTopology(client, projectRoot, roots);
    const saved = await probeSavedTemplateDiagnostics(client, roots, withInstalledClient);
    const caches = await client.callTool({ name: 'aurelia_analysis_cache_overview', arguments: {} }, undefined, { timeout: 120_000 });
    assert(!caches.isError, caches.content?.[0]?.text);
    const { totalSessions, process: { processMemory } } = caches.structuredContent.value;
    return {
      topology, saved,
      afterRestoration: { totalSessions, rssBytes: processMemory.rssBytes, heapUsedBytes: processMemory.heapUsedBytes },
    };
  });
  const receipt = {
    tarball: tarballPath,
    tarballSha256: sha256(tarball),
    entrySha256: sha256(await fs.readFile(entry)),
    version: installed.version,
    artifactIntegrity: integrity,
    project: projectRoot,
    host: { platform: process.platform, arch: process.arch, node: process.version },
    typescript,
    relation: 'same-package',
    aurelia: frameworkVersion,
    vite: lock.packages['node_modules/vite'].version,
    sdk: lock.packages['node_modules/@modelcontextprotocol/sdk'].version,
    elapsedSeconds: Math.round((performance.now() - started) / 1000),
    ...result,
  };
  if (receiptPath != null) await writeJson(receiptPath, receipt);
  console.log('MCP project-local install probe passed.\n' + JSON.stringify(receipt, null, 2));
} catch (error) {
  console.error(`Project-local install probe retained its workspace at ${projectRoot}`);
  throw error;
}

async function checkProjectTypeScript(client, workspaceRoot, checkerManifest) {
  const result = await client.callTool({
    name: 'aurelia_app_query',
    arguments: { workspaceRoot, queryKind: 'typescript-diagnostic-summary', sourceFilePath: 'src/main.ts', page: { size: 0 } },
  }, undefined, { timeout: 120_000 });
  assert(!result.isError, result.content?.[0]?.text);
  const answer = result.structuredContent?.value;
  assert.equal(answer?.result, 'answered', answer?.summary);
  assert.equal(answer.coverage, 'complete');
  const value = answer.value;
  assert.equal(value.totalDiagnosticRows, 0);
  assert.equal(value.typeScript.versionRelation, 'same-package');
  assert.equal(value.typeScript.analyzer.version, typescript);
  assert.equal(value.typeScript.workspace.version, typescript);
  assert.equal(await fs.realpath(value.typeScript.analyzer.packageJsonPath), await fs.realpath(checkerManifest));
  assert.equal(await fs.realpath(value.typeScript.workspace.packageJsonPath), await fs.realpath(checkerManifest));
  assert(value.displayText.includes('relation=same-package'));
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function writeJson(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n');
}

function npmInstall(cwd) {
  // Only a constant command reaches cmd.exe. The tarball URI lives in the manifest.
  const options = { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };
  const result = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/c', 'npm install --no-fund --no-audit'], options)
    : spawnSync('npm', ['install', '--no-fund', '--no-audit'], options);
  if (result.status !== 0) throw new Error(['npm install failed', result.error?.message, result.stdout, result.stderr].filter(Boolean).join('\n'));
}

async function latestReleaseTarball(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const tarballs = await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tgz'))
    .map(async (entry) => {
      const fullPath = path.join(root, entry.name);
      const stat = await fs.stat(fullPath);
      return { fullPath, mtimeMs: stat.mtimeMs };
    }));
  tarballs.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const latest = tarballs[0]?.fullPath;
  if (latest == null) {
    throw new Error(`No release tarball found under ${root}. Run pnpm --filter @aurelia-ls/mcp release:pack first.`);
  }
  return latest;
}
