import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const fixtureRoot = path.join(packageRoot, 'fixtures/authoring');
const frameworkPackageRoot = path.join(workspaceRoot, 'aurelia/packages');
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'aurelia-ls-authoring-typecheck-'));

try {
  const requestedRoots = process.argv.slice(2).map((arg) =>
    path.isAbsolute(arg) ? path.resolve(arg) : path.resolve(workspaceRoot, arg)
  );
  const fixtureRoots = requestedRoots.length > 0
    ? requestedRoots
    : await defaultAuthoringFixtureRoots();
  const pathMappings = await aureliaPackagePathMappings();
  const results = [];

  for (const root of fixtureRoots) {
    const result = await typecheckFixture(root, pathMappings);
    results.push(result);
  }

  const failed = results.filter((result) => !result.ok);
  const summary = {
    ok: failed.length === 0,
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

async function defaultAuthoringFixtureRoots() {
  const entries = await readdir(fixtureRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && (entry.name.startsWith('generated-') || entry.name === 'storefront'))
    .map((entry) => path.join(fixtureRoot, entry.name));
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

  const overlayPath = path.join(tempRoot, `${path.basename(root)}.tsconfig.json`);
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
