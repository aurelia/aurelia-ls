import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  expectedPatternCatalogCount,
  patternReleaseSentinels,
} from './pattern-sentinels.mjs';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const releaseRoot = path.join(packageRoot, '.release');
const tarballPath = path.resolve(process.argv[2] ?? await latestReleaseTarball(releaseRoot));
const fixtureWorkspaceRoot = path.join(
  workspaceRoot,
  'packages/semantic-runtime/fixtures/pressure/app-pattern-state-backed-form',
);
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'au-mcp-release-probe-'));

try {
  await fs.writeFile(
    path.join(tempRoot, 'package.json'),
    `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`,
  );

  run('npm install', 'npm', ['install', '--ignore-scripts', tarballPath], tempRoot);

  const installedEntry = path.join(tempRoot, 'node_modules/@aurelia-ls/mcp/au-mcp.js');
  const installedPackageJsonPath = path.join(tempRoot, 'node_modules/@aurelia-ls/mcp/package.json');
  const installedDocsRoot = path.join(tempRoot, 'node_modules/@aurelia-ls/mcp/docs/aurelia-user-docs');
  const installedDocsManifestPath = path.join(tempRoot, 'node_modules/@aurelia-ls/mcp/docs/aurelia-user-docs.manifest.json');
  const binShim = process.platform === 'win32'
    ? path.join(tempRoot, 'node_modules/.bin/au-mcp.cmd')
    : path.join(tempRoot, 'node_modules/.bin/au-mcp');
  assert(existsSync(installedEntry), 'release package installed au-mcp.js');
  assert(existsSync(installedPackageJsonPath), 'release package installed package.json');
  assert(existsSync(binShim), 'release package installed au-mcp bin shim');
  assert(existsSync(installedDocsRoot), 'release package installed bundled Aurelia docs root');
  assert(existsSync(path.join(installedDocsRoot, 'TOC.md')), 'bundled Aurelia docs include TOC.md');
  assert(existsSync(installedDocsManifestPath), 'release package installed bundled Aurelia docs manifest');

  const docsManifest = JSON.parse(await fs.readFile(installedDocsManifestPath, 'utf8'));
  const installedPackageJson = JSON.parse(await fs.readFile(installedPackageJsonPath, 'utf8'));
  assert(installedPackageJson.name === '@aurelia-ls/mcp', 'installed release package has the expected package name');
  assert(docsManifest.corpusId === 'aurelia-user-docs', 'docs manifest identifies aurelia-user-docs corpus');
  assert(docsManifest.snapshot?.fileCount >= 600, 'docs manifest reports full user-docs file set');
  assert(docsManifest.snapshot?.markdownFileCount >= 600, 'docs manifest reports full markdown docs set');
  assert(typeof docsManifest.snapshot?.sha256 === 'string' && docsManifest.snapshot.sha256.length === 64, 'docs manifest has aggregate sha256');

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [installedEntry],
    cwd: tempRoot,
  });
  const client = new Client({ name: 'au-mcp-release-probe', version: '0.0.0' });

  try {
    await client.connect(transport);

    const serverVersion = client.getServerVersion();
    assert(serverVersion?.name === 'au-mcp', 'server announces au-mcp name');
    assert(
      serverVersion?.version === installedPackageJson.version,
      `server announces installed release version ${installedPackageJson.version}`,
    );

    const tools = await client.listTools();
    const toolNames = new Set(tools.tools.map((tool) => tool.name));
    const prompts = await client.listPrompts();
    const resources = await client.listResources();
    const resourceUris = new Set(resources.resources.map((resource) => resource.uri));

    assert(toolNames.has('aurelia_workspace_overview'), 'workspace overview tool is registered');
    assert(toolNames.has('aurelia_app_overview'), 'app overview tool is registered');
    assert(toolNames.has('aurelia_app_query_batch'), 'app query batch tool is registered');
    assert(toolNames.has('aurelia_pattern_menu'), 'pattern menu tool is registered');
    assert(toolNames.has('aurelia_pattern_example'), 'pattern example tool is registered');
    assert(toolNames.has('aurelia_docs_search'), 'bundled docs search tool is registered');
    assert(toolNames.has('aurelia_docs_fetch'), 'bundled docs fetch tool is registered');
    assert(!toolNames.has('aurelia_app_builder_catalog'), 'legacy app-builder catalog tool is retired');
    assert(!toolNames.has('aurelia_app_builder_query'), 'legacy app-builder query tool is retired');
    assert(prompts.prompts.some((prompt) => prompt.name === 'aurelia_orient_workspace'), 'orientation prompt is registered');
    assert(resourceUris.has('aurelia://semantic-runtime/app-queries'), 'app query catalog resource is registered');
    assert(resourceUris.has('aurelia://patterns/menu'), 'pattern menu resource is registered');
    assert(resourceUris.has('aurelia://docs/index'), 'bundled docs index resource is registered');
    assert(!resourceUris.has('aurelia://semantic-runtime/app-builder'), 'legacy app-builder catalog resource is retired');

    const patternMenu = await client.callTool({
      name: 'aurelia_pattern_menu',
      arguments: { query: 'conditional' },
    });
    const patternMenuValue = structuredValue(patternMenu);
    assert(
      Array.isArray(patternMenuValue?.items) && patternMenuValue.items.some((item) => item.patternId === 'template.conditional-rendering'),
      'installed package pattern menu returned newly admitted conditional rendering pattern',
    );
    const fullPatternMenu = await client.callTool({
      name: 'aurelia_pattern_menu',
      arguments: {},
    });
    const fullPatternItems = structuredValue(fullPatternMenu)?.items;
    assert(
      Array.isArray(fullPatternItems) && fullPatternItems.length === expectedPatternCatalogCount,
      `installed package pattern menu exposed the guarded ${expectedPatternCatalogCount}-pattern catalog`,
    );
    assert(
      Buffer.byteLength(JSON.stringify(fullPatternItems), 'utf8') < 20_000,
      'installed package pattern menu stayed compact for first-choice MCP lookup',
    );

    const patternExample = await client.callTool({
      name: 'aurelia_pattern_example',
      arguments: { patternId: 'template.conditional-rendering' },
    });
    const patternExampleValue = structuredValue(patternExample);
    assert(
      Array.isArray(patternExampleValue?.support?.followUp)
        && patternExampleValue.support.followUp.some((row) => row.tool === 'aurelia_template_diagnostics')
        && patternExampleValue.support.followUp.some((row) => row.tool === 'aurelia_diagnostic_overview'),
      'installed package pattern example returned semantic-runtime follow-up hints',
    );
    await verifyLatestPatternTranche(client);

    const docsSearch = await client.callTool({
      name: 'aurelia_docs_search',
      arguments: { query: 'route parameters loading', page: { size: 5 } },
    });
    const docsSearchValue = structuredValue(docsSearch);
    assert(
      Array.isArray(docsSearchValue?.items) && docsSearchValue.items.some((item) => item.documentPath === 'router/route-parameters.md'),
      'installed package docs search returned router route-parameter docs',
    );
    assert(
      docsSearchValue.items.every((item) => !item.documentPath.startsWith('router-direct/')),
      'installed package docs search excludes router-direct rows',
    );
    const docsSearchItem = docsSearchValue.items.find((item) => item.documentPath === 'router/route-parameters.md') ?? docsSearchValue.items[0];
    const docsFetch = await client.callTool({
      name: 'aurelia_docs_fetch',
      arguments: {
        documentPath: docsSearchItem.documentPath,
        sectionAnchor: docsSearchItem.sectionAnchor,
        maxChars: 4000,
      },
    });
    const docsFetchValue = structuredValue(docsFetch);
    assert(docsFetchValue?.documentPath === docsSearchItem.documentPath, 'installed package docs fetch returned the requested document');
    assert(Array.isArray(docsFetchValue?.sections) && docsFetchValue.sections.length >= 1, 'installed package docs fetch returned bounded sections');

    const overview = await client.callTool({
      name: 'aurelia_workspace_overview',
      arguments: { workspaceRoot: fixtureWorkspaceRoot },
    });
    assert(overview?.structuredContent?.value != null, 'workspace overview returned structured content');

    console.log([
      'MCP release tarball probe passed.',
      `- tarball: ${tarballPath}`,
      `- installed into: ${tempRoot}`,
      `- server: ${serverVersion.name}@${serverVersion.version}`,
      `- tools: ${tools.tools.length}`,
      `- prompts: ${prompts.prompts.length}`,
      `- resources: ${resources.resources.length}`,
      `- docs files: ${docsManifest.snapshot.fileCount}`,
      `- docs sha256: ${docsManifest.snapshot.sha256}`,
    ].join('\n'));
  } finally {
    await client.close();
  }
} catch (error) {
  console.error(`Release tarball probe temp dir: ${tempRoot}`);
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
    throw new Error(`Release probe assertion failed: ${message}`);
  }
}

function structuredValue(result) {
  return result?.structuredContent?.value?.value ?? result?.structuredContent?.value ?? null;
}

async function verifyLatestPatternTranche(client) {
  for (const sentinel of patternReleaseSentinels) {
    const menu = await client.callTool({
      name: 'aurelia_pattern_menu',
      arguments: { query: sentinel.query },
    });
    const menuItems = structuredValue(menu)?.items;
    assert(
      Array.isArray(menuItems) && menuItems.some((item) => item.patternId === sentinel.patternId),
      `installed package pattern menu query "${sentinel.query}" returned ${sentinel.patternId}`,
    );

    const example = await client.callTool({
      name: 'aurelia_pattern_example',
      arguments: { patternId: sentinel.patternId },
    });
    const value = structuredValue(example);
    assert(value?.patternId === sentinel.patternId, `installed package pattern example returned ${sentinel.patternId}`);
    assertPatternSupport(value, sentinel);
  }
}

function assertPatternSupport(value, sentinel) {
  const followUp = value?.support?.followUp;
  assert(Array.isArray(followUp) && followUp.length > 0, `${sentinel.patternId} returned support.followUp hints`);
  assert(followUp.length <= 3, `${sentinel.patternId} support.followUp stayed compact`);
  for (const tool of sentinel.followUpTools) {
    assert(followUp.some((row) => row.tool === tool), `${sentinel.patternId} returned ${tool} follow-up`);
  }
  for (const queryKind of sentinel.followUpQueryKinds ?? []) {
    assert(
      followUp.some((row) => row.tool === 'aurelia_app_query' && row.queryKind === queryKind),
      `${sentinel.patternId} returned ${queryKind} follow-up`,
    );
  }

  const refs = value?.support?.refs ?? [];
  const refUrls = refs.map((ref) => ref.url);
  for (const docsRef of sentinel.docsRefs) {
    assert(refUrls.some((url) => url.includes(docsRef)), `${sentinel.patternId} returned docs ref ${docsRef}`);
  }
  assert(!JSON.stringify(value).includes('aurelia_app_builder'), `${sentinel.patternId} avoids retired app-builder vocabulary`);
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
