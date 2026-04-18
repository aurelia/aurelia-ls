import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = dirname(scriptDir);
const repoRoot = dirname(dirname(packageDir));
const defaultFixtureRoot = join(packageDir, 'fixtures', 'aurelia-framework-exports');

async function main() {
  const { repoPath: repoArg, outDir: outDirArg } = parseArgs(process.argv.slice(2));
  const outDir = resolve(packageDir, outDirArg ?? defaultFixtureRoot);

  let api;
  try {
    api = await import('../out/aurelia-framework-goldens.js');
  } catch (error) {
    console.error('Unable to load built source-analysis output for aurelia framework goldens.');
    console.error('Run `pnpm --filter @aurelia-ls/source-analysis build` first.');
    throw error;
  }

  const repoPath = api.resolveAureliaFrameworkRepoPath({
    repoPath: repoArg,
    searchFrom: repoRoot,
  });

  if (!repoPath) {
    throw new Error(
      'Unable to resolve the Aurelia framework repo. Pass --repo <path> or set AURELIA_FRAMEWORK_REPO.',
    );
  }

  const suite = api.collectAureliaFrameworkGoldens({ repoPath });
  writeSuite(outDir, suite, api.packageNameToGoldenFileName);

  console.log(`Wrote Aurelia framework export goldens to ${outDir}`);
  console.log(`Packages: ${suite.manifest.packageCount}`);
  console.log(`Exports:  ${suite.manifest.exportCount}`);
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

function writeSuite(outDir, suite, packageNameToGoldenFileName) {
  const packagesDir = join(outDir, 'packages');
  mkdirSync(packagesDir, { recursive: true });

  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      rmSync(join(packagesDir, entry.name), { force: true });
    }
  }

  writeJson(join(outDir, 'manifest.json'), suite.manifest);

  for (const pkg of suite.packages) {
    writeJson(
      join(packagesDir, packageNameToGoldenFileName(pkg.packageName)),
      pkg,
    );
  }
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
