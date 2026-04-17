import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = dirname(scriptDir);
const outDir = join(packageDir, 'out');
const legacyBuildInfoPath = join(packageDir, 'tsconfig.tsbuildinfo');
const buildStageRoot = join(packageDir, '.build-stage');
const stageId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
const stageDir = join(buildStageRoot, stageId);
const stageOutDir = join(packageDir, `.out-stage-${stageId}`);
const stageBuildInfoPath = join(stageDir, 'tsconfig.tsbuildinfo');
const stageConfigPath = join(packageDir, 'tsconfig.build-stage.json');
const previousOutDir = join(packageDir, '.out-previous');
const require = createRequire(import.meta.url);
const tscEntry = require.resolve('typescript/bin/tsc');

mkdirSync(stageDir, { recursive: true });
rmSync(legacyBuildInfoPath, { force: true });
writeFileSync(stageConfigPath, JSON.stringify({
  extends: './tsconfig.json',
  compilerOptions: {
    outDir: relative(packageDir, stageOutDir).replace(/\\/g, '/'),
    tsBuildInfoFile: relative(packageDir, stageBuildInfoPath).replace(/\\/g, '/'),
  },
}, null, 2));

const result = spawnSync(process.execPath, [tscEntry, '-p', stageConfigPath], {
  cwd: packageDir,
  stdio: 'inherit',
});

if (result.status !== 0) {
  rmSync(stageConfigPath, { force: true });
  rmSync(stageOutDir, { recursive: true, force: true });
  rmSync(stageDir, { recursive: true, force: true });
  process.exit(result.status ?? 1);
}

rmSync(previousOutDir, { recursive: true, force: true });
if (existsSync(outDir)) {
  renameSync(outDir, previousOutDir);
}
// TODO: Normalize or inline staged sourcemaps after the swap. The last-known-good
// out/ preservation works, but Vitest still reports missing original sources
// against the moved sourcemap paths in this staged build layout.
renameSync(stageOutDir, outDir);
rmSync(previousOutDir, { recursive: true, force: true });
rmSync(stageConfigPath, { force: true });
rmSync(stageDir, { recursive: true, force: true });
