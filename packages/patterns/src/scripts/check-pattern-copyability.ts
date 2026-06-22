import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';
import { aureliaPatternExamples } from '../pattern-catalog.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const workspaceRoot = path.resolve(packageRoot, '..', '..');
const fixtureRoot = path.resolve(workspaceRoot, '.temp', 'pattern-quality-tscheck');
const aureliaRoot = path.resolve(process.env.AURELIA_FRAMEWORK_ROOT ?? path.join(workspaceRoot, 'aurelia'));

const aureliaTypePaths = {
  aurelia: path.resolve(aureliaRoot, 'packages', 'aurelia', 'dist', 'types', 'index.d.ts'),
  '@aurelia/kernel': path.resolve(aureliaRoot, 'packages', 'kernel', 'dist', 'types', 'index.d.ts'),
  '@aurelia/runtime-html': path.resolve(aureliaRoot, 'packages', 'runtime-html', 'dist', 'types', 'index.d.ts'),
  '@aurelia/router': path.resolve(aureliaRoot, 'packages', 'router', 'dist', 'types', 'index.d.ts'),
  '@aurelia/fetch-client': path.resolve(aureliaRoot, 'packages', 'fetch-client', 'dist', 'types', 'index.d.ts'),
  '@aurelia/validation': path.resolve(aureliaRoot, 'packages', 'validation', 'dist', 'types', 'index.d.ts'),
  '@aurelia/validation-html': path.resolve(aureliaRoot, 'packages', 'validation-html', 'dist', 'types', 'index.d.ts'),
  '@aurelia/dialog': path.resolve(aureliaRoot, 'packages', 'dialog', 'dist', 'types', 'index.d.ts'),
  '@aurelia/i18n': path.resolve(aureliaRoot, 'packages', 'i18n', 'dist', 'types', 'index.d.ts'),
  '@aurelia/ui-virtualization': path.resolve(aureliaRoot, 'packages', 'ui-virtualization', 'dist', 'types', 'index.d.ts')
};

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: () => workspaceRoot,
  getNewLine: () => '\n'
};

for (const [packageName, typePath] of Object.entries(aureliaTypePaths)) {
  if (!existsSync(typePath)) {
    throw new Error(`Missing Aurelia declaration path for ${packageName}: ${typePath}`);
  }
}

if (!fixtureRoot.startsWith(path.resolve(workspaceRoot, '.temp') + path.sep)) {
  throw new Error(`Refusing to clean unexpected fixture root: ${fixtureRoot}`);
}

rmSync(fixtureRoot, { recursive: true, force: true });
mkdirSync(fixtureRoot, { recursive: true });

const pathMap = Object.fromEntries(
  Object.entries(aureliaTypePaths).map(([packageName, typePath]) => [
    packageName,
    [typePath.replaceAll('\\', '/')]
  ])
);
const failures: { patternId: string; output: string }[] = [];

for (const pattern of aureliaPatternExamples) {
  const projectRoot = path.join(fixtureRoot, pattern.patternId);
  const sourceRoot = path.join(projectRoot, 'src');
  mkdirSync(sourceRoot, { recursive: true });

  for (const file of pattern.source.files) {
    const destination = safePatternDestination(sourceRoot, file.path, pattern.patternId);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, file.contents, 'utf8');
  }

  const configPath = path.join(projectRoot, 'tsconfig.json');
  writeFileSync(configPath, `${JSON.stringify({
    compilerOptions: {
      target: 'ES2023',
      lib: ['ES2023', 'DOM', 'DOM.Iterable'],
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      strict: true,
      noUncheckedIndexedAccess: true,
      exactOptionalPropertyTypes: false,
      skipLibCheck: true,
      noEmit: true,
      allowImportingTsExtensions: true,
      experimentalDecorators: false,
      paths: pathMap,
      ignoreDeprecations: '6.0'
    },
    include: ['src/**/*.ts']
  }, null, 2)}\n`, 'utf8');

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    projectRoot,
    undefined,
    configPath
  );
  const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
  const diagnostics = [
    ...(configFile.error === undefined ? [] : [configFile.error]),
    ...parsedConfig.errors,
    ...program.getOptionsDiagnostics(),
    ...program.getSyntacticDiagnostics(),
    ...program.getSemanticDiagnostics()
  ];

  if (diagnostics.length > 0) {
    failures.push({
      patternId: pattern.patternId,
      output: ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost).trim()
    });
  }
}

if (failures.length > 0) {
  process.stderr.write(`Pattern copyability guard failed for ${failures.length} pattern(s).\n`);
  for (const failure of failures) {
    process.stderr.write(`\n--- ${failure.patternId} ---\n${failure.output}\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write(`Pattern copyability guard passed for ${aureliaPatternExamples.length} pattern(s).\n`);
}

function safePatternDestination(sourceRoot: string, filePath: string, patternId: string): string {
  const root = path.resolve(sourceRoot);
  const destination = path.resolve(root, filePath);
  if (!destination.startsWith(root + path.sep)) {
    throw new Error(`${patternId} source file path escapes the pattern fixture root: ${filePath}`);
  }
  return destination;
}
