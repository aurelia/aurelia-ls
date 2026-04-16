import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = dirname(scriptDir);
const outDir = join(packageDir, 'out');
const buildInfoPath = join(packageDir, 'tsconfig.tsbuildinfo');
const require = createRequire(import.meta.url);
const tscEntry = require.resolve('typescript/bin/tsc');

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}
if (existsSync(buildInfoPath)) {
  rmSync(buildInfoPath, { force: true });
}

const result = spawnSync(process.execPath, [tscEntry, '-b'], {
  cwd: packageDir,
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
