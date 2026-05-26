import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const frameworkPackageRoot = path.join(workspaceRoot, 'aurelia/packages');
const defaultFixtureRootSpecs = [
  {
    root: path.join(packageRoot, 'fixtures/pressure'),
    include: (root) => path.basename(root).startsWith('app-pattern-'),
  },
  {
    root: path.join(packageRoot, 'fixtures/app-builder/goldens'),
    include: () => true,
  },
];
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'aurelia-ls-fixture-typecheck-'));

try {
  const requestedRoots = process.argv.slice(2).map((arg) =>
    path.isAbsolute(arg) ? path.resolve(arg) : path.resolve(workspaceRoot, arg)
  );
  const fixtureRoots = requestedRoots.length > 0
    ? requestedRoots
    : await discoverTypecheckableFixtureRoots(defaultFixtureRootSpecs);
  const pathMappings = await aureliaPackagePathMappings();
  const results = [];

  for (const root of fixtureRoots) {
    results.push(await typecheckFixture(root, pathMappings));
  }

  const failed = results.filter((result) => !result.ok);
  const summary = {
    ok: failed.length === 0,
    fixtureCount: results.length,
    fixtures: results,
  };
  if (failed.length > 0) {
    console.error(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(summary, null, 2));
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

async function discoverTypecheckableFixtureRoots(rootSpecs) {
  const discovered = [];
  for (const spec of rootSpecs) {
    await collectTypecheckableFixtureRoots(spec.root, discovered, spec.include);
  }
  return discovered.sort();
}

async function collectTypecheckableFixtureRoots(root, discovered, include) {
  if (!await fileExists(path.join(root, 'package.json')) || !await fileExists(path.join(root, 'tsconfig.json'))) {
    for (const entry of await readdirIfExists(root)) {
      if (entry.isDirectory()) {
        await collectTypecheckableFixtureRoots(path.join(root, entry.name), discovered, include);
      }
    }
    return;
  }
  if (!include(root)) {
    return;
  }
  discovered.push(root);
}

async function aureliaPackagePathMappings() {
  const mappings = {};
  const entries = await readdir(frameworkPackageRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const packageJsonPath = path.join(frameworkPackageRoot, entry.name, 'package.json');
    const packageJson = await readJsonIfExists(packageJsonPath);
    if (packageJson == null || typeof packageJson.name !== 'string') {
      continue;
    }
    const typesPath = path.join(frameworkPackageRoot, entry.name, 'dist/types/index.d.ts');
    if (!await fileExists(typesPath)) {
      continue;
    }
    mappings[packageJson.name] = [slash(path.relative(workspaceRoot, typesPath))];
  }
  return mappings;
}

async function typecheckFixture(root, pathMappings) {
  const packageJson = await readJsonIfExists(path.join(root, 'package.json'));
  const tsconfigPath = path.join(root, 'tsconfig.json');
  if (packageJson == null || !await fileExists(tsconfigPath)) {
    return {
      fixture: slash(path.relative(workspaceRoot, root)),
      ok: false,
      reason: 'missing-package-or-tsconfig',
    };
  }

  const overlayPath = path.join(tempRoot, `${safeFileName(path.relative(packageRoot, root))}.tsconfig.json`);
  await writeFile(overlayPath, JSON.stringify({
    extends: slash(tsconfigPath),
    compilerOptions: {
      baseUrl: slash(workspaceRoot),
      paths: pathMappings,
      ignoreDeprecations: '6.0',
      noEmit: true,
    },
  }, null, 2));

  const diagnostics = readTypecheckDiagnostics(overlayPath);

  return {
    fixture: slash(path.relative(workspaceRoot, root)),
    ok: diagnostics.length === 0,
    dependencies: Object.keys(packageJson.dependencies ?? {}).sort(),
    diagnostics,
  };
}

function readTypecheckDiagnostics(configPath) {
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error != null) {
    return [formatDiagnostic(config.error)];
  }
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path.dirname(configPath),
  );
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  return [...parsed.errors, ...ts.getPreEmitDiagnostics(program)].map(formatDiagnostic);
}

function formatDiagnostic(diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  if (diagnostic.file != null && diagnostic.start != null) {
    const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    const fileName = slash(path.relative(workspaceRoot, diagnostic.file.fileName));
    return `${fileName}(${position.line + 1},${position.character + 1}): TS${diagnostic.code}: ${message}`;
  }
  return `TS${diagnostic.code}: ${message}`;
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function readdirIfExists(dirPath) {
  try {
    return await readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function slash(value) {
  return value.replaceAll(path.sep, '/');
}

function safeFileName(value) {
  return slash(value).replace(/[^a-z0-9._-]/gi, '_');
}
