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
    root: path.join(packageRoot, 'fixtures/app-builder'),
    include: (root) => isDefaultTypecheckAppBuilderFixtureName(path.basename(root)),
  },
  {
    root: path.join(packageRoot, 'fixtures/pressure'),
    include: (root) => isDefaultTypecheckPressureFixtureName(path.basename(root)),
  },
];
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'aurelia-ls-fixture-typecheck-'));

try {
  const requestedRoots = await Promise.all(process.argv.slice(2).map(resolveRequestedRoot));
  const fixtureRoots = requestedRoots.length > 0
    ? await discoverTypecheckableFixtureRoots(requestedRoots.map((root) => ({
        root,
        include: () => true,
      })))
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
  const hasPackageTypecheck = await fileExists(path.join(root, 'package.json'))
    && await fileExists(path.join(root, 'tsconfig.json'));
  const hasSourceOnlyTypecheck = await fileExists(path.join(root, 'semantic-fixture.json'))
    && (await collectTypeScriptFixtureSourceFiles(root)).length > 0;
  if (!hasPackageTypecheck && !hasSourceOnlyTypecheck) {
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

async function resolveRequestedRoot(arg) {
  if (path.isAbsolute(arg)) {
    return path.resolve(arg);
  }
  const candidates = [
    path.resolve(packageRoot, arg),
    path.resolve(workspaceRoot, arg),
    path.resolve(process.cwd(), arg),
  ];
  for (const candidate of candidates) {
    if (await fileExists(path.join(candidate, 'package.json')) || await directoryExists(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
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
    const sourceFiles = await collectTypeScriptFixtureSourceFiles(root);
    if (sourceFiles.length > 0) {
      return typecheckSourceOnlyFixture(root, sourceFiles, pathMappings);
    }
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

async function typecheckSourceOnlyFixture(root, sourceFiles, pathMappings) {
  const overlayPath = path.join(tempRoot, `${safeFileName(path.relative(packageRoot, root))}.tsconfig.json`);
  await writeFile(overlayPath, JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      strict: true,
      skipLibCheck: true,
      allowArbitraryExtensions: true,
      baseUrl: slash(workspaceRoot),
      paths: pathMappings,
      ignoreDeprecations: '6.0',
      noEmit: true,
    },
    files: sourceFiles.map(slash),
  }, null, 2));

  const diagnostics = readTypecheckDiagnostics(overlayPath);

  return {
    fixture: slash(path.relative(workspaceRoot, root)),
    ok: diagnostics.length === 0,
    dependencies: [],
    sourceOnly: true,
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

async function directoryExists(dirPath) {
  try {
    await readdir(dirPath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
      return false;
    }
    throw error;
  }
}

async function collectTypeScriptFixtureSourceFiles(root) {
  const srcRoot = path.join(root, 'src');
  const files = [];
  await collectTypeScriptFiles(srcRoot, files);
  return files.sort();
}

async function collectTypeScriptFiles(root, files) {
  for (const entry of await readdirIfExists(root)) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      await collectTypeScriptFiles(entryPath, files);
      continue;
    }
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(entryPath);
    }
  }
}

function slash(value) {
  return value.replaceAll(path.sep, '/');
}

function safeFileName(value) {
  return slash(value).replace(/[^a-z0-9._-]/gi, '_');
}

function isDefaultTypecheckPressureFixtureName(fileName) {
  return fileName.startsWith('app-pattern-')
    || fileName.startsWith('app-builder-');
}

function isDefaultTypecheckAppBuilderFixtureName(fileName) {
  return fileName.length > 0;
}
