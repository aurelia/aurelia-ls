import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = dirname(scriptDir);
const repoRoot = dirname(dirname(packageDir));
const defaultFixturePath = join(
  packageDir,
  'fixtures',
  'aurelia-configurations',
  'golden.json',
);

async function main() {
  const { repoPath: repoArg, outPath: outPathArg } = parseArgs(process.argv.slice(2));
  const outPath = resolve(packageDir, outPathArg ?? defaultFixturePath);

  let api;
  try {
    api = await import('../out/aurelia-configuration-goldens.js');
  } catch (error) {
    console.error('Unable to load built source-analysis output for aurelia configuration goldens.');
    console.error('Run `pnpm --filter @aurelia-ls/source-analysis build` first.');
    throw error;
  }

  const repoPath = api.resolveAureliaFrameworkRepoPath({
    repoPath: repoArg,
    searchFrom: repoRoot,
  });

  if (!repoPath) {
    throw new Error(
      'Unable to resolve the Aurelia framework repo. Pass --repo <path> or point at the in-repo aurelia submodule.',
    );
  }

  const suite = api.collectAureliaConfigurationGoldens({ repoPath });
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(suite, null, 2)}\n`);

  console.log(`Wrote Aurelia configuration goldens to ${outPath}`);
  console.log(`Bundle arrays:    ${suite.summary.bundleArrayCount}`);
  console.log(`Registry objects: ${suite.summary.registryObjectCount}`);
  console.log(`Factory methods:  ${suite.summary.factoryMethodCount}`);
}

function parseArgs(args) {
  const parsed = {
    outPath: undefined,
    repoPath: undefined,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--repo') {
      parsed.repoPath = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--out') {
      parsed.outPath = args[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
