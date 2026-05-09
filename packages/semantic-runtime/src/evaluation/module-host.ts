import {
  existsSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { readPackageManifest } from '../boot/host-files.js';
import { buildProjectCompilerOptions } from '../boot/project-compiler-options.js';
import {
  EvaluationModuleGraph,
  normalizeModuleKey,
  readEvaluationModuleRecord,
} from './module-graph.js';
import { guessScriptKind } from './ts-syntax.js';

const MODULE_EXTENSIONS = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.html',
  '.css',
] as const;

const MODULE_INDEX_FILES = [
  'index.ts',
  'index.tsx',
  'index.js',
  'index.jsx',
  'index.mjs',
  'index.cjs',
  'index.json',
] as const;

/** Source host boundary for recursive module graph construction. */
export interface EvaluationModuleSourceHost {
  /** Read and parse one module key into a TypeScript source file. */
  readSourceFile(moduleKey: string): ts.SourceFile | null;
  /** Resolve an authored module specifier from one module key. */
  resolveModuleSpecifier(fromModuleKey: string, moduleSpecifier: string): string | null;
}

/** File-system implementation for local source modules. */
export class FileSystemEvaluationModuleSourceHost implements EvaluationModuleSourceHost {
  private readonly sourceFileCache = new Map<string, ts.SourceFile | null>();
  private readonly moduleResolutionHost: ts.ModuleResolutionHost;

  constructor(
    /** Root directory for relative module keys. */
    readonly rootDir: string,
    /** Compiler options used to resolve authored module specifiers. */
    readonly compilerOptions: ts.CompilerOptions = buildProjectCompilerOptions(rootDir),
  ) {
    this.moduleResolutionHost = {
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
      directoryExists: ts.sys.directoryExists,
      getCurrentDirectory: () => this.rootDir,
      getDirectories: ts.sys.getDirectories,
      realpath: ts.sys.realpath,
    };
  }

  readSourceFile(moduleKey: string): ts.SourceFile | null {
    const absolute = this.toAbsolutePath(moduleKey);
    const normalized = normalizeModuleKey(absolute);
    const cached = this.sourceFileCache.get(normalized);
    if (cached !== undefined) {
      return cached;
    }
    if (!existsSync(absolute)) {
      this.sourceFileCache.set(normalized, null);
      return null;
    }
    const text = readFileSync(absolute, 'utf8');
    const assetText = assetModuleText(absolute, text);
    const moduleText = assetText ?? text;
    const sourceFile = ts.createSourceFile(
      absolute,
      moduleText,
      ts.ScriptTarget.Latest,
      true,
      assetText == null ? guessScriptKind(absolute) : ts.ScriptKind.TS,
    );
    this.sourceFileCache.set(normalized, sourceFile);
    return sourceFile;
  }

  resolveModuleSpecifier(fromModuleKey: string, moduleSpecifier: string): string | null {
    const fromAbsolute = this.toAbsolutePath(fromModuleKey);
    const modulePathSpecifier = moduleSpecifierWithoutQuery(moduleSpecifier);
    const resolved = ts.resolveModuleName(
      modulePathSpecifier,
      fromAbsolute,
      this.compilerOptions,
      this.moduleResolutionHost,
    ).resolvedModule;
    const resolvedSourcePath = this.sourceModulePathForResolvedModule(resolved, fromAbsolute, modulePathSpecifier);
    if (resolvedSourcePath != null) {
      return this.moduleKeyForAbsolutePath(resolvedSourcePath);
    }
    if (!modulePathSpecifier.startsWith('./') && !modulePathSpecifier.startsWith('../')) {
      return null;
    }
    const base = path.resolve(path.dirname(fromAbsolute), modulePathSpecifier);
    for (const candidate of candidateModulePaths(base)) {
      if (existsSync(candidate)) {
        return this.moduleKeyForAbsolutePath(candidate);
      }
    }
    return null;
  }

  private sourceModulePathForResolvedModule(
    resolved: ts.ResolvedModuleFull | undefined,
    fromAbsolute: string,
    moduleSpecifier: string,
  ): string | null {
    if (resolved == null) {
      return null;
    }
    const resolvedFileName = path.resolve(resolved.resolvedFileName);
    const fileName = canonicalExistingPath(resolvedFileName);
    const externalPackageRoot = externalPackageRootForPath(fileName);

    if (isDeclarationFile(fileName)) {
      if (externalPackageRoot == null) {
        return null;
      }
      if (!shouldMapExternalPackageDeclarationToSource(externalPackageRoot)) {
        return null;
      }
      const sourcePath = sourceModulePathForPackageDeclaration(fileName, externalPackageRoot);
      return sourcePath != null
        && this.shouldAdmitExternalPackageSource(fromAbsolute, sourcePath, moduleSpecifier, externalPackageRoot)
        ? sourcePath
        : null;
    }

    if (!isEvaluationModulePath(fileName) || !existsSync(fileName)) {
      return null;
    }

    if (externalPackageRoot != null) {
      return this.shouldAdmitExternalPackageSource(fromAbsolute, fileName, moduleSpecifier, externalPackageRoot)
        ? fileName
        : null;
    }
    return fileName;
  }

  private shouldAdmitExternalPackageSource(
    fromAbsolute: string,
    resolvedFileName: string,
    moduleSpecifier: string,
    externalPackageRoot: string,
  ): boolean {
    const fromExternalPackageRoot = externalPackageRootForPath(fromAbsolute);
    if (fromExternalPackageRoot != null) {
      if (samePath(fromExternalPackageRoot, externalPackageRoot)) {
        return isRelativeModuleSpecifier(moduleSpecifier) && isAuthoredPackageSourceModule(resolvedFileName, externalPackageRoot);
      }
      return !isRelativeModuleSpecifier(moduleSpecifier)
        && isAuthoredPackageSourceModule(resolvedFileName, externalPackageRoot);
    }
    return !isRelativeModuleSpecifier(moduleSpecifier)
      && isAuthoredPackageSourceModule(resolvedFileName, externalPackageRoot);
  }

  private toAbsolutePath(moduleKey: string): string {
    return path.isAbsolute(moduleKey)
      ? moduleKey
      : path.join(this.rootDir, moduleKey);
  }

  private moduleKeyForAbsolutePath(absolutePath: string): string {
    const absolute = path.resolve(absolutePath);
    return isPathWithin(absolute, this.rootDir)
      ? normalizeModuleKey(path.relative(this.rootDir, absolute))
      : normalizeModuleKey(absolute);
  }
}

/** One module edge that could not be resolved while building an evaluation graph. */
export class EvaluationModuleResolutionOpen {
  constructor(
    /** Module key that authored the unresolved edge. */
    readonly fromModuleKey: string,
    /** Module specifier text as authored. */
    readonly moduleSpecifier: string,
    /** Source node that carried the module specifier. */
    readonly node: ts.Node,
  ) {}
}

/** Result of recursively building an evaluation module graph. */
export class EvaluationModuleGraphBuildResult {
  constructor(
    /** Directed module graph over all reached local source files. */
    readonly graph: EvaluationModuleGraph,
    /** Module-resolution openings observed while walking imports and re-exports. */
    readonly unresolvedModules: readonly EvaluationModuleResolutionOpen[],
  ) {}
}

/** Build a local source module graph from one entry module using the supplied host. */
export function buildEvaluationModuleGraph(
  entryModuleKey: string,
  host: EvaluationModuleSourceHost,
): EvaluationModuleGraphBuildResult {
  const graph = new EvaluationModuleGraph();
  const unresolvedModules: EvaluationModuleResolutionOpen[] = [];
  const visited = new Set<string>();

  function visit(moduleKey: string): void {
    const normalizedModuleKey = normalizeModuleKey(moduleKey);
    if (visited.has(normalizedModuleKey)) {
      return;
    }
    visited.add(normalizedModuleKey);
    const sourceFile = host.readSourceFile(normalizedModuleKey);
    if (sourceFile == null) {
      return;
    }

    const record = readEvaluationModuleRecord(sourceFile, normalizedModuleKey);
    graph.addModule(record);
    const moduleSpecifiers = uniqueModuleEdges([
      ...record.imports.map((entry) => ({ moduleSpecifier: entry.moduleSpecifier, node: entry.node })),
      ...record.exports
        .filter((entry) => entry.moduleSpecifier != null)
        .map((entry) => ({ moduleSpecifier: entry.moduleSpecifier as string, node: entry.node })),
    ]);

    for (const edge of moduleSpecifiers) {
      const target = host.resolveModuleSpecifier(normalizedModuleKey, edge.moduleSpecifier);
      graph.linkModule(normalizedModuleKey, edge.moduleSpecifier, target);
      if (target == null) {
        if (isRelativeModuleSpecifier(edge.moduleSpecifier)) {
          unresolvedModules.push(new EvaluationModuleResolutionOpen(normalizedModuleKey, edge.moduleSpecifier, edge.node));
        }
        continue;
      }
      visit(target);
    }
  }

  visit(entryModuleKey);
  return new EvaluationModuleGraphBuildResult(graph, unresolvedModules);
}

function uniqueModuleEdges(
  edges: readonly { readonly moduleSpecifier: string; readonly node: ts.Node }[],
): readonly { readonly moduleSpecifier: string; readonly node: ts.Node }[] {
  const seen = new Set<string>();
  const unique: { readonly moduleSpecifier: string; readonly node: ts.Node }[] = [];
  for (const edge of edges) {
    if (seen.has(edge.moduleSpecifier)) {
      continue;
    }
    seen.add(edge.moduleSpecifier);
    unique.push(edge);
  }
  return unique;
}

function isRelativeModuleSpecifier(moduleSpecifier: string): boolean {
  return moduleSpecifier.startsWith('./') || moduleSpecifier.startsWith('../');
}

function moduleSpecifierWithoutQuery(moduleSpecifier: string): string {
  const queryIndex = moduleSpecifier.search(/[?#]/);
  return queryIndex === -1 ? moduleSpecifier : moduleSpecifier.slice(0, queryIndex);
}

function candidateModulePaths(base: string): readonly string[] {
  const direct = candidateDirectModulePaths(base);
  const indexes = MODULE_INDEX_FILES.map((file) => path.join(base, file));
  return [...direct, ...indexes];
}

function candidateDirectModulePaths(base: string): readonly string[] {
  const extension = path.extname(base);
  if (extension === '.js' || extension === '.jsx' || extension === '.mjs' || extension === '.cjs') {
    const withoutExtension = base.slice(0, -extension.length);
    return [
      base,
      `${withoutExtension}.ts`,
      `${withoutExtension}.tsx`,
      `${withoutExtension}.js`,
      `${withoutExtension}.jsx`,
      `${withoutExtension}.mjs`,
      `${withoutExtension}.cjs`,
    ];
  }
  return MODULE_EXTENSIONS.map((candidateExtension) => `${base}${candidateExtension}`);
}

function canonicalExistingPath(fileName: string): string {
  try {
    return realpathSync.native(fileName);
  } catch {
    return fileName;
  }
}

function assetModuleText(fileName: string, text: string): string | null {
  switch (path.extname(fileName).toLowerCase()) {
    case '.json':
      return `export default ${text.trim()};`;
    case '.html':
    case '.css':
      return `export default ${JSON.stringify(text)};`;
    default:
      return null;
  }
}

function isEvaluationModulePath(fileName: string): boolean {
  switch (path.extname(fileName).toLowerCase()) {
    case '.ts':
    case '.tsx':
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
    case '.json':
    case '.html':
    case '.css':
      return true;
    default:
      return false;
  }
}

function isDeclarationFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.d.ts') || lower.endsWith('.d.mts') || lower.endsWith('.d.cts');
}

function sourceModulePathForPackageDeclaration(
  declarationFileName: string,
  packageRoot: string,
): string | null {
  const relativePath = normalizeModuleKey(path.relative(packageRoot, declarationFileName));
  const declarationBase = stripDeclarationExtension(relativePath);
  if (declarationBase == null) {
    return null;
  }

  for (const candidateBase of sourceCandidateBasesForDeclarationBase(declarationBase)) {
    for (const candidate of candidateModulePaths(path.join(packageRoot, candidateBase))) {
      if (
        existsSync(candidate)
        && isEvaluationModulePath(candidate)
        && isAuthoredPackageSourceModule(candidate, packageRoot)
      ) {
        return canonicalExistingPath(candidate);
      }
    }
  }
  return null;
}

function shouldMapExternalPackageDeclarationToSource(packageRoot: string): boolean {
  const manifest = readPackageManifest(packageRoot);
  if (manifest == null) {
    return false;
  }
  const name = typeof manifest.name === 'string' ? manifest.name : null;
  if (name === 'aurelia' || name?.startsWith('@aurelia/')) {
    return false;
  }
  if (name?.toLowerCase().includes('aurelia') === true) {
    return true;
  }
  return dependencyNames(manifest).some((dependency) =>
    dependency === 'aurelia' || dependency.startsWith('@aurelia/')
  );
}

function dependencyNames(manifest: Record<string, unknown>): readonly string[] {
  return [
    ...dependencyGroupNames(manifest.dependencies),
    ...dependencyGroupNames(manifest.peerDependencies),
    ...dependencyGroupNames(manifest.devDependencies),
  ];
}

function dependencyGroupNames(value: unknown): readonly string[] {
  return value != null && typeof value === 'object'
    ? Object.keys(value)
    : [];
}

function stripDeclarationExtension(relativePath: string): string | null {
  const lower = relativePath.toLowerCase();
  if (lower.endsWith('.d.ts')) {
    return relativePath.slice(0, -'.d.ts'.length);
  }
  if (lower.endsWith('.d.mts')) {
    return relativePath.slice(0, -'.d.mts'.length);
  }
  if (lower.endsWith('.d.cts')) {
    return relativePath.slice(0, -'.d.cts'.length);
  }
  return null;
}

function sourceCandidateBasesForDeclarationBase(declarationBase: string): readonly string[] {
  const candidates: string[] = [];
  addSourceCandidateBase(candidates, declarationBase.replace(/^dist\/types\//, 'src/'));
  addSourceCandidateBase(candidates, declarationBase.replace(/^dist\//, 'src/'));
  addSourceCandidateBase(candidates, declarationBase.replace(/^types\//, 'src/'));
  addSourceCandidateBase(candidates, declarationBase);
  if (declarationBase.endsWith('/index')) {
    addSourceCandidateBase(candidates, 'src/index');
  }
  return candidates;
}

function addSourceCandidateBase(candidates: string[], value: string): void {
  if (!candidates.includes(value)) {
    candidates.push(value);
  }
}

function isAuthoredPackageSourceModule(fileName: string, packageRoot: string): boolean {
  const relativePath = normalizeModuleKey(path.relative(packageRoot, fileName));
  if (relativePath.startsWith('../') || path.isAbsolute(relativePath)) {
    return false;
  }
  const segments = relativePath.split('/');
  if (segments.includes('dist') || segments.includes('lib') || segments.includes('umd') || segments.includes('cjs') || segments.includes('esm')) {
    return false;
  }
  const extension = path.extname(fileName).toLowerCase();
  if (segments[0] === 'src') {
    return isEvaluationModulePath(fileName);
  }
  return extension === '.ts' || extension === '.tsx';
}

function externalPackageRootForPath(fileName: string): string | null {
  const normalized = normalizeModuleKey(path.resolve(fileName));
  const segments = normalized.split('/');
  const nodeModulesIndex = segments.lastIndexOf('node_modules');
  if (nodeModulesIndex === -1 || nodeModulesIndex + 1 >= segments.length) {
    return null;
  }
  const packageNameIndex = nodeModulesIndex + 1;
  const packageName = segments[packageNameIndex];
  if (packageName == null) {
    return null;
  }
  const endIndex = packageName.startsWith('@')
    ? packageNameIndex + 2
    : packageNameIndex + 1;
  return endIndex <= segments.length
    ? segments.slice(0, endIndex).join('/')
    : null;
}

function samePath(left: string, right: string): boolean {
  return normalizeModuleKey(path.resolve(left)).toLowerCase() === normalizeModuleKey(path.resolve(right)).toLowerCase();
}

function isPathWithin(fileName: string, rootDir: string): boolean {
  const relativePath = path.relative(path.resolve(rootDir), path.resolve(fileName));
  return (
    relativePath === ''
    || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  );
}
