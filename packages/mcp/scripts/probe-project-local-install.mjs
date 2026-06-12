import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const releaseRoot = path.join(packageRoot, '.release');
const tarballPath = path.resolve(process.argv[2] ?? await latestReleaseTarball(releaseRoot));
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'au-mcp-project-local-probe-'));
const projectRoot = path.join(tempRoot, 'app');
const expectedTypeScriptVersion = process.env.AURELIA_MCP_PROJECT_LOCAL_TYPESCRIPT_VERSION ?? '5.9.3';

try {
  await fs.mkdir(path.join(projectRoot, 'src'), { recursive: true });
  await fs.writeFile(
    path.join(projectRoot, 'package.json'),
    `${JSON.stringify({
      private: true,
      type: 'module',
      devDependencies: {
        typescript: expectedTypeScriptVersion,
      },
    }, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(projectRoot, 'tsconfig.json'),
    `${JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        noEmit: true,
      },
      include: ['src/**/*.ts'],
    }, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(projectRoot, 'src/main.ts'),
    'export const answer: number = 42;\n',
  );

  run('npm install project-local MCP', 'npm', [
    'install',
    '--ignore-scripts',
    '--save-dev',
    `typescript@${expectedTypeScriptVersion}`,
    tarballPath,
  ], projectRoot);

  const installedEntry = path.join(projectRoot, 'node_modules/@aurelia-ls/mcp/au-mcp.js');
  assert(existsSync(installedEntry), 'project-local install created node_modules/@aurelia-ls/mcp/au-mcp.js');

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [installedEntry],
    cwd: projectRoot,
  });
  const client = new Client({ name: 'au-mcp-project-local-install-probe', version: '0.0.0' });

  try {
    await client.connect(transport);

    const diagnostics = await client.callTool({
      name: 'aurelia_app_query',
      arguments: {
        workspaceRoot: projectRoot,
        sourceFilePath: 'src/main.ts',
        queryKind: 'typescript-diagnostic-summary',
        page: { size: 0 },
      },
    });
    const value = structuredValue(diagnostics);
    const typeScript = value?.typeScript;
    assert(typeScript != null, 'TypeScript diagnostic summary returned TypeScript environment');
    assert(typeScript.analyzer.version === expectedTypeScriptVersion, `analyzer TypeScript is ${expectedTypeScriptVersion}`);
    assert(typeScript.workspace?.version === expectedTypeScriptVersion, `workspace TypeScript is ${expectedTypeScriptVersion}`);
    assert(typeScript.versionRelation === 'same-package', 'analyzer and workspace TypeScript relation is same-package');
    assert(
      normalizePackagePath(typeScript.analyzer.packageJsonPath) === normalizePackagePath(typeScript.workspace.packageJsonPath),
      'analyzer and workspace TypeScript package paths are identical',
    );
    assert(value.totalDiagnosticRows === 0, 'project-local synthetic TypeScript project has zero diagnostics');
    assert(value.displayText.includes('relation=same-package'), 'display text reports same-package TypeScript relation');

    console.log([
      'MCP project-local install probe passed.',
      `- tarball: ${tarballPath}`,
      `- project: ${projectRoot}`,
      `- TypeScript: ${typeScript.analyzer.version}`,
      `- relation: ${typeScript.versionRelation}`,
    ].join('\n'));
  } finally {
    await client.close();
  }
} catch (error) {
  console.error(`Project-local install probe temp dir: ${tempRoot}`);
  throw error;
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

function structuredValue(result) {
  return result?.structuredContent?.value?.value ?? result?.structuredContent?.value ?? null;
}

function run(label, command, args, cwd) {
  const result = spawnCommand(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error([
      `${label} failed.`,
      result.error?.message,
      (result.stdout ?? '').trim(),
      (result.stderr ?? '').trim(),
    ].filter(Boolean).join('\n'));
  }
  return result;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Project-local install probe assertion failed: ${message}`);
  }
}

function normalizePackagePath(packageJsonPath) {
  const normalized = path.resolve(packageJsonPath);
  return process.platform === 'win32'
    ? normalized.toLowerCase()
    : normalized;
}

function spawnCommand(command, args, options) {
  if (process.platform !== 'win32') {
    return spawnSync(command, args, options);
  }
  return spawnSync(process.env.ComSpec ?? 'cmd.exe', [
    '/d',
    '/s',
    '/c',
    [command, ...args.map(quoteWindowsShellArgument)].join(' '),
  ], options);
}

function quoteWindowsShellArgument(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:\\@+=,-]+$/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '\\"')}"`;
}
