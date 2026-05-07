import path from 'node:path';
import ts from 'typescript';

export class TypeSystemProjectOptions {
  constructor(
    readonly compilerOptions: ts.CompilerOptions,
    readonly ambientSourceFiles: readonly ts.SourceFile[],
  ) {}
}

export function buildTypeSystemProjectOptions(rootDir: string): TypeSystemProjectOptions {
  return new TypeSystemProjectOptions(
    readCompilerOptions(rootDir),
    [semanticRuntimeAmbientSourceFile(rootDir)],
  );
}

function readCompilerOptions(rootDir: string): ts.CompilerOptions {
  const configFile = path.join(rootDir, 'tsconfig.json');
  if (!ts.sys.fileExists(configFile)) {
    return defaultCompilerOptions(rootDir);
  }

  const read = ts.readConfigFile(configFile, ts.sys.readFile);
  if (read.error != null || read.config == null) {
    return defaultCompilerOptions(rootDir);
  }

  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    path.dirname(configFile),
  );
  return {
    ...defaultCompilerOptions(rootDir),
    ...parsed.options,
  };
}

function defaultCompilerOptions(rootDir: string): ts.CompilerOptions {
  const aureliaTypePaths = discoverAureliaTypePaths(rootDir);
  return {
    allowJs: true,
    allowArbitraryExtensions: true,
    checkJs: false,
    experimentalDecorators: false,
    ignoreDeprecations: '6.0',
    jsx: ts.JsxEmit.Preserve,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.Latest,
    ...(aureliaTypePaths == null
      ? {}
      : {
        baseUrl: aureliaTypePaths.baseUrl,
        paths: aureliaTypePaths.paths,
      }),
  };
}

function semanticRuntimeAmbientSourceFile(rootDir: string): ts.SourceFile {
  const fileName = path.join(rootDir, '.semantic-runtime', 'ambient.d.ts');
  return ts.createSourceFile(
    fileName,
    [
      "declare module '*.html' {",
      '  const template: string;',
      '  export default template;',
      '}',
      '',
    ].join('\n'),
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  );
}

function discoverAureliaTypePaths(rootDir: string): {
  readonly baseUrl: string;
  readonly paths: Record<string, string[]>;
} | null {
  const workspaceRoot = discoverAureliaCheckoutRoot(rootDir);
  if (workspaceRoot == null) {
    return null;
  }

  const paths: Record<string, string[]> = {};
  for (const pkg of aureliaPackageTypeMappings()) {
    const relative = normalizePath(path.relative(workspaceRoot, path.join(
      workspaceRoot,
      'aurelia',
      'packages',
      pkg.packageDir,
      'dist',
      'types',
      'index.d.ts',
    )));
    if (ts.sys.fileExists(path.join(workspaceRoot, relative))) {
      paths[pkg.specifier] = [relative];
    }
  }

  return Object.keys(paths).length === 0
    ? null
    : {
      baseUrl: workspaceRoot,
      paths,
    };
}

function discoverAureliaCheckoutRoot(rootDir: string): string | null {
  let current = path.resolve(rootDir);
  while (true) {
    const candidate = path.join(current, 'aurelia', 'packages', 'kernel', 'dist', 'types', 'index.d.ts');
    if (ts.sys.fileExists(candidate)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function aureliaPackageTypeMappings(): readonly { readonly specifier: string; readonly packageDir: string }[] {
  return [
    { specifier: 'aurelia', packageDir: 'aurelia' },
    { specifier: '@aurelia/expression-parser', packageDir: 'expression-parser' },
    { specifier: '@aurelia/fetch-client', packageDir: 'fetch-client' },
    { specifier: '@aurelia/kernel', packageDir: 'kernel' },
    { specifier: '@aurelia/metadata', packageDir: 'metadata' },
    { specifier: '@aurelia/platform', packageDir: 'platform' },
    { specifier: '@aurelia/platform-browser', packageDir: 'platform-browser' },
    { specifier: '@aurelia/route-recognizer', packageDir: 'route-recognizer' },
    { specifier: '@aurelia/router', packageDir: 'router' },
    { specifier: '@aurelia/runtime', packageDir: 'runtime' },
    { specifier: '@aurelia/runtime-html', packageDir: 'runtime-html' },
    { specifier: '@aurelia/template-compiler', packageDir: 'template-compiler' },
    { specifier: '@aurelia/testing', packageDir: 'testing' },
  ];
}

function normalizePath(fileName: string): string {
  return path.normalize(fileName).replace(/\\/g, '/');
}
