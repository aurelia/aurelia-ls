import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aureliaPatternExamples } from '@aurelia-ls/patterns';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '@aurelia-ls/semantic-runtime';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const semanticRuntimePackageRoot = path.join(repoRoot, 'packages', 'semantic-runtime');
const aureliaWorkspaceRoot = path.join(repoRoot, 'aurelia');
const fixtureTempRoot = path.join(semanticRuntimePackageRoot, '.temp');
const fixtureRoot = path.join(fixtureTempRoot, 'mcp-pattern-semantic-diagnostics');
const patternFrameworkPackages = [
  'aurelia',
  '@aurelia/kernel',
  '@aurelia/runtime-html',
  '@aurelia/router',
  '@aurelia/fetch-client',
  '@aurelia/validation',
  '@aurelia/validation-html',
  '@aurelia/dialog',
  '@aurelia/i18n',
  '@aurelia/ui-virtualization',
];
const aureliaBootstrapWitness = {
  packageName: '@aurelia/platform-browser',
  workspacePackagePath: path.join('packages', 'platform-browser'),
};

if (path.dirname(fixtureRoot) !== fixtureTempRoot) {
  throw new Error(`Refusing to clean unexpected fixture root: ${fixtureRoot}`);
}

// Keep these synthetic projects beneath semantic-runtime's package boundary so ordinary TypeScript lookup consumes
// the framework links declared by @aurelia-ls/semantic-runtime. This is fixture bootstrap, not permission for
// semantic-runtime to infer the sibling Aurelia checkout.
await assertPatternFixtureDependencies();
await fs.rm(fixtureRoot, { recursive: true, force: true });
await fs.mkdir(fixtureRoot, { recursive: true });

const projects = [];

for (const pattern of aureliaPatternExamples) {
  const projectRoot = path.join(fixtureRoot, pattern.patternId);
  const sourceRoot = path.join(projectRoot, 'src');
  await fs.mkdir(sourceRoot, { recursive: true });

  for (const file of pattern.source.files) {
    const destination = safePatternDestination(sourceRoot, file.path, pattern.patternId);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, file.contents, 'utf8');
  }

  projects.push({
    projectKey: pattern.patternId,
    rootDir: projectRoot,
    sourceFiles: pattern.source.files.map((file) => ({
      path: `src/${file.path}`.replaceAll('\\', '/'),
    })),
  });
}

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  projects,
});
const failures = [];

for (const pattern of aureliaPatternExamples) {
  const answer = await runtime.answerAppQuery({
    projectKey: pattern.patternId,
    kind: SemanticAppQueryKind.AppDiagnostics,
    analysisDepth: 'binding-observation',
    diagnosticProjection: 'type-projection',
    page: { size: 50 },
    appRetention: 'dispose-app',
  });
  const rows = diagnosticRows(answer);
  if (rows.length > 0) {
    failures.push({
      patternId: pattern.patternId,
      diagnostics: rows.map(compactDiagnosticRow),
    });
  }
}

if (failures.length > 0) {
  process.stderr.write(`Pattern semantic diagnostics contract failed for ${failures.length} pattern(s).\n`);
  process.stderr.write(`${JSON.stringify(failures, null, 2)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Pattern semantic diagnostics contract passed for ${aureliaPatternExamples.length} pattern(s).\n`);
}

function diagnosticRows(answer) {
  if (Array.isArray(answer?.value?.rows)) {
    return answer.value.rows;
  }
  if (Array.isArray(answer?.value?.value?.rows)) {
    return answer.value.value.rows;
  }
  return [];
}

function compactDiagnosticRow(row) {
  return {
    diagnosticKind: row.diagnosticKind ?? null,
    frameworkCode: row.frameworkCode ?? row.frameworkErrorCode ?? row.code ?? null,
    summary: row.summary ?? null,
    source: row.source?.label ?? row.source?.path ?? null,
  };
}

function safePatternDestination(sourceRoot, filePath, patternId) {
  const root = path.resolve(sourceRoot);
  const destination = path.resolve(root, filePath);
  if (!destination.startsWith(root + path.sep)) {
    throw new Error(`${patternId} source file path escapes the pattern fixture root: ${filePath}`);
  }
  return destination;
}

async function assertPatternFixtureDependencies() {
  for (const packageName of patternFrameworkPackages) {
    const manifestPath = path.join(
      semanticRuntimePackageRoot,
      'node_modules',
      ...packageName.split('/'),
      'package.json',
    );
    let manifest;
    try {
      manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    } catch (cause) {
      throw new Error(
        `Missing semantic-runtime pattern fixture dependency '${packageName}' at ${manifestPath}. Run pnpm install at the repository root.`,
        { cause },
      );
    }
    if (manifest?.name !== packageName) {
      throw new Error(
        `Semantic-runtime pattern fixture dependency '${packageName}' resolved to manifest name '${String(manifest?.name)}' at ${manifestPath}.`,
      );
    }
  }

  // Exact linked-source resolution follows the direct `aurelia` package link into its physical workspace source.
  // A representative transitive workspace link proves that the Aurelia checkout's own dependency closure was bootstrapped too.
  const witnessManifestPath = path.join(
    aureliaWorkspaceRoot,
    'node_modules',
    ...aureliaBootstrapWitness.packageName.split('/'),
    'package.json',
  );
  const workspaceManifestPath = path.join(
    aureliaWorkspaceRoot,
    aureliaBootstrapWitness.workspacePackagePath,
    'package.json',
  );
  let witnessManifest;
  try {
    witnessManifest = JSON.parse(await fs.readFile(witnessManifestPath, 'utf8'));
  } catch (cause) {
    throw new Error(
      `Missing Aurelia workspace dependency closure witness '${aureliaBootstrapWitness.packageName}' at ${witnessManifestPath}. Run pnpm bootstrap:aurelia at the repository root; an Aurelia build is not required.`,
      { cause },
    );
  }
  if (witnessManifest?.name !== aureliaBootstrapWitness.packageName) {
    throw new Error(
      `Aurelia workspace dependency closure witness '${aureliaBootstrapWitness.packageName}' resolved to manifest name '${String(witnessManifest?.name)}' at ${witnessManifestPath}. Run pnpm bootstrap:aurelia at the repository root.`,
    );
  }

  let installedManifestRealPath;
  let workspaceManifestRealPath;
  try {
    [installedManifestRealPath, workspaceManifestRealPath] = await Promise.all([
      fs.realpath(witnessManifestPath),
      fs.realpath(workspaceManifestPath),
    ]);
  } catch (cause) {
    throw new Error(
      `Unable to verify the linked Aurelia workspace dependency '${aureliaBootstrapWitness.packageName}'. Run pnpm bootstrap:aurelia at the repository root.`,
      { cause },
    );
  }
  if (path.relative(installedManifestRealPath, workspaceManifestRealPath) !== '') {
    throw new Error(
      `Aurelia workspace dependency '${aureliaBootstrapWitness.packageName}' at ${witnessManifestPath} does not link to ${workspaceManifestPath}. Run pnpm bootstrap:aurelia at the repository root.`,
    );
  }
}
