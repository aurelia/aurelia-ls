import { readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = dirname(scriptDir);
const repoDir = dirname(dirname(packageDir));
const outTestDir = join(packageDir, 'out-test');
const outTestRoot = join(outTestDir, 'test');
const preloadPath = join(outTestRoot, 'node-test-global-setup.js');

const args = process.argv.slice(2);
const coverage = args.includes('--coverage');
const filters = args.filter((arg) => arg !== '--coverage');

const env = { ...process.env };
env.AURELIA_RESOLUTION_STRIP_SOURCED_NODES ??= '1';
env.AURELIA_HARNESS_TRIM ??= '1';

const nodeOptions = env.NODE_OPTIONS ?? '';
const heapArg = /\b--max-old-space-size=\d+\b/.test(nodeOptions)
  ? null
  : '--max-old-space-size=4096';

const files = filters.length > 0
  ? filters.map(resolveFilterToBuiltTest)
  : collectTestFiles(outTestRoot);

if (files.length === 0) {
  console.error('No built source-analysis test files were found. Run the test build first.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [
  ...(heapArg ? [heapArg] : []),
  '--test',
  '--test-isolation=none',
  '--test-concurrency=1',
  '--enable-source-maps',
  '--import',
  pathToFileURL(preloadPath).href,
  ...(coverage ? ['--experimental-test-coverage'] : []),
  ...files,
], {
  cwd: repoDir,
  stdio: 'inherit',
  env,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);

function collectTestFiles(rootDir) {
  const files = [];
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function resolveFilterToBuiltTest(filter) {
  const absoluteFilter = resolve(packageDir, filter);
  const candidate = normalizeFilterPath(absoluteFilter);
  if (statExists(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }

  const packageRelative = relative(packageDir, absoluteFilter).replace(/\\/g, '/');
  const testRelative = packageRelative.startsWith('test/')
    ? packageRelative
    : packageRelative.includes('/test/')
      ? packageRelative.slice(packageRelative.indexOf('/test/') + 1)
      : packageRelative;
  const builtCandidate = normalizeFilterPath(join(outTestDir, testRelative));
  if (statExists(builtCandidate) && statSync(builtCandidate).isFile()) {
    return builtCandidate;
  }

  throw new Error(`Unable to map source-analysis test filter "${filter}" to a built Node test file.`);
}

function normalizeFilterPath(pathValue) {
  if (pathValue.endsWith('.ts')) {
    return pathValue.slice(0, -3) + '.js';
  }
  return pathValue;
}

function statExists(pathValue) {
  try {
    statSync(pathValue);
    return true;
  } catch {
    return false;
  }
}
