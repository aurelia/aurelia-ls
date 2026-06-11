import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const releaseRoot = path.join(packageRoot, '.release');
const tarballPath = path.resolve(process.argv[2] ?? await latestReleaseTarball(releaseRoot));
const releasePackageJson = JSON.parse(await fs.readFile(path.join(releaseRoot, 'package/package.json'), 'utf8'));
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
  const binShim = process.platform === 'win32'
    ? path.join(tempRoot, 'node_modules/.bin/au-mcp.cmd')
    : path.join(tempRoot, 'node_modules/.bin/au-mcp');
  assert(existsSync(installedEntry), 'release package installed au-mcp.js');
  assert(existsSync(binShim), 'release package installed au-mcp bin shim');

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
      serverVersion?.version === releasePackageJson.version,
      `server announces release version ${releasePackageJson.version}`,
    );

    const tools = await client.listTools();
    const toolNames = new Set(tools.tools.map((tool) => tool.name));
    const prompts = await client.listPrompts();
    const resources = await client.listResources();

    assert(toolNames.has('aurelia_workspace_overview'), 'workspace overview tool is registered');
    assert(toolNames.has('aurelia_app_overview'), 'app overview tool is registered');
    assert(toolNames.has('aurelia_app_query_batch'), 'app query batch tool is registered');
    assert(prompts.prompts.some((prompt) => prompt.name === 'aurelia_orient_workspace'), 'orientation prompt is registered');
    assert(
      resources.resources.some((resource) => resource.uri === 'aurelia://semantic-runtime/app-queries'),
      'app query catalog resource is registered',
    );

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
