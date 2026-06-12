import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(packageRoot, '../..');
const packageJsonPath = path.join(packageRoot, 'package.json');
const workspacePackageJsonPath = path.join(workspaceRoot, 'package.json');
const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
const workspacePackageJson = JSON.parse(await fs.readFile(workspacePackageJsonPath, 'utf8'));
const releaseVersion = process.env.AURELIA_MCP_RELEASE_VERSION ?? `${packageJson.version}-preview.1`;
const releaseRoot = path.resolve(process.env.AURELIA_MCP_RELEASE_DIR ?? path.join(packageRoot, '.release'));
const stageDir = path.join(releaseRoot, 'package');
const bundlePath = path.join(stageDir, 'au-mcp.js');

ensureDirectoryContains(releaseRoot, stageDir, 'release staging directory');

const serverEntry = path.join(packageRoot, 'out/server.js');
if (!existsSync(serverEntry)) {
  throw new Error(`Build output is missing: ${serverEntry}. Run pnpm --filter @aurelia-ls/mcp build first.`);
}

await fs.rm(stageDir, { recursive: true, force: true });
await fs.mkdir(stageDir, { recursive: true });

await esbuild.build({
  entryPoints: [serverEntry],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: bundlePath,
  external: [
    '@modelcontextprotocol/sdk',
    '@modelcontextprotocol/sdk/*',
    'typescript',
    'zod',
  ],
  define: {
    __AURELIA_MCP_SERVER_VERSION__: JSON.stringify(releaseVersion),
  },
  legalComments: 'none',
});

await ensureExecutableShebang(bundlePath);

const releasePackageJson = {
  name: packageJson.name,
  version: releaseVersion,
  description: 'Aurelia MCP server (semantic-runtime) preview distribution via GitHub Releases',
  license: 'MIT',
  type: 'module',
  bin: {
    'au-mcp': './au-mcp.js',
  },
  files: [
    'au-mcp.js',
  ],
  engines: workspacePackageJson.engines ?? { node: '>=22.13 <25' },
  repository: {
    type: 'git',
    url: 'https://github.com/aurelia/aurelia-ls.git',
    directory: 'packages/mcp',
  },
  dependencies: {
    '@modelcontextprotocol/sdk': packageJson.dependencies['@modelcontextprotocol/sdk'],
    zod: packageJson.dependencies.zod,
  },
  peerDependencies: {
    typescript: '>=5.9 <7',
  },
};

await fs.writeFile(
  path.join(stageDir, 'package.json'),
  `${JSON.stringify(releasePackageJson, null, 2)}\n`,
);

await fs.mkdir(releaseRoot, { recursive: true });
const pack = spawnCommand('npm', ['pack', stageDir, '--pack-destination', releaseRoot], {
  cwd: packageRoot,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});
if (pack.status !== 0) {
  throw new Error([
    'npm pack failed.',
    pack.error?.message,
    (pack.stdout ?? '').trim(),
    (pack.stderr ?? '').trim(),
  ].filter(Boolean).join('\n'));
}

const tarballName = pack.stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);
const tarballPath = tarballName == null ? null : path.join(releaseRoot, tarballName);
console.log(JSON.stringify({
  packageName: releasePackageJson.name,
  version: releasePackageJson.version,
  releaseRoot,
  stageDir,
  bundlePath,
  tarballPath,
  peerDependencies: releasePackageJson.peerDependencies,
}, null, 2));

async function ensureExecutableShebang(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  const withShebang = text.startsWith('#!')
    ? text
    : `#!/usr/bin/env node\n${text}`;
  if (withShebang !== text) {
    await fs.writeFile(filePath, withShebang);
  }
  await fs.chmod(filePath, 0o755);
}

function ensureDirectoryContains(parent, child, label) {
  const relative = path.relative(parent, child);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing unsafe ${label}: ${child}`);
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
