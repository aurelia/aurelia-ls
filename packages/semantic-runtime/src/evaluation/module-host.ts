import {
  existsSync,
  readFileSync,
} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
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
] as const;

const MODULE_INDEX_FILES = [
  'index.ts',
  'index.tsx',
  'index.js',
  'index.jsx',
  'index.mjs',
  'index.cjs',
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

  constructor(
    /** Root directory for relative module keys. */
    readonly rootDir: string,
  ) {}

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
    const sourceFile = ts.createSourceFile(
      absolute,
      text,
      ts.ScriptTarget.Latest,
      true,
      guessScriptKind(absolute),
    );
    this.sourceFileCache.set(normalized, sourceFile);
    return sourceFile;
  }

  resolveModuleSpecifier(fromModuleKey: string, moduleSpecifier: string): string | null {
    if (!moduleSpecifier.startsWith('./') && !moduleSpecifier.startsWith('../')) {
      return null;
    }
    const fromAbsolute = this.toAbsolutePath(fromModuleKey);
    const base = path.resolve(path.dirname(fromAbsolute), moduleSpecifier);
    for (const candidate of candidateModulePaths(base)) {
      if (existsSync(candidate)) {
        return normalizeModuleKey(path.relative(this.rootDir, candidate));
      }
    }
    return null;
  }

  private toAbsolutePath(moduleKey: string): string {
    return path.isAbsolute(moduleKey)
      ? moduleKey
      : path.join(this.rootDir, moduleKey);
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
