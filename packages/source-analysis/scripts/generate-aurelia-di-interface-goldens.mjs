import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = dirname(scriptDir);
const repoRoot = dirname(dirname(packageDir));
const defaultFixtureRoot = join(packageDir, 'fixtures', 'aurelia-di-interfaces');

async function main() {
  const { repoPath: repoArg, outDir: outDirArg } = parseArgs(process.argv.slice(2));
  const outDir = resolve(packageDir, outDirArg ?? defaultFixtureRoot);

  let api;
  try {
    api = await import('../out/aurelia/index.js');
    await import('../out/aurelia-framework-goldens.js');
  } catch (error) {
    console.error('Unable to load built source-analysis output for Aurelia DI interface goldens.');
    console.error('Run `pnpm --filter @aurelia-ls/source-analysis build` first.');
    throw error;
  }

  const frameworkApi = await import('../out/aurelia-framework-goldens.js');
  const repoPath = frameworkApi.resolveAureliaFrameworkRepoPath({
    repoPath: repoArg,
    searchFrom: repoRoot,
  });

  if (!repoPath) {
    throw new Error(
      'Unable to resolve the Aurelia framework repo. Pass --repo <path> or set AURELIA_FRAMEWORK_REPO.',
    );
  }

  const suite = api.collectAureliaDiInterfaceGoldens({ repoPath });
  writeSuite(outDir, suite);

  console.log(`Wrote Aurelia DI interface goldens to ${outDir}`);
  console.log(`Packages:   ${suite.summary.packageCount}`);
  console.log(`Interfaces: ${suite.summary.interfaceCount}`);
}

function parseArgs(args) {
  const parsed = {
    repoPath: undefined,
    outDir: undefined,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--repo') {
      parsed.repoPath = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--out-dir') {
      parsed.outDir = args[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function writeSuite(outDir, suite) {
  mkdirSync(outDir, { recursive: true });

  const legacyPackagesDir = join(outDir, 'packages');
  if (existsSync(legacyPackagesDir)) {
    rmSync(legacyPackagesDir, { recursive: true, force: true });
  }

  rmSync(join(outDir, 'manifest.json'), { force: true });
  writeJson(join(outDir, 'golden.json'), suite);
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
