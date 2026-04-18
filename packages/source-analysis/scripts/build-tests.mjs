import {
  cpSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = dirname(scriptDir);
const outDir = join(packageDir, 'out-test');
const legacyBuildInfoPath = join(packageDir, 'tsconfig.test.tsbuildinfo');
const buildStageRoot = join(packageDir, '.build-test-stage');
const stageId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
const stageDir = join(buildStageRoot, stageId);
const stageOutDir = join(packageDir, `.out-test-stage-${stageId}`);
const stageBuildInfoPath = join(stageDir, 'tsconfig.test.tsbuildinfo');
const stageConfigPath = join(packageDir, 'tsconfig.test.build-stage.json');
const previousOutDir = join(packageDir, '.out-test-previous');
const require = createRequire(import.meta.url);
const tscEntry = require.resolve('typescript/bin/tsc');

mkdirSync(stageDir, { recursive: true });
rmSync(legacyBuildInfoPath, { force: true });
writeFileSync(stageConfigPath, JSON.stringify({
  extends: './tsconfig.test.json',
  compilerOptions: {
    noEmit: false,
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

try {
  symlinkSync(join(packageDir, 'out'), join(stageOutDir, 'out'), 'junction');
} catch {
  cpSync(join(packageDir, 'out'), join(stageOutDir, 'out'), { recursive: true });
}

rmSync(previousOutDir, { recursive: true, force: true });
if (existsSync(outDir)) {
  renameSync(outDir, previousOutDir);
}
renameSync(stageOutDir, outDir);
rmSync(previousOutDir, { recursive: true, force: true });
rmSync(stageConfigPath, { force: true });
rmSync(stageDir, { recursive: true, force: true });
