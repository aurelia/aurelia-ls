import path from 'node:path';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';
import type { ProjectBootFrame } from '../boot/frames.js';
import {
  normalizeModuleKey,
} from '../evaluation/module-graph.js';
import type { StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import { buildTypeSystemProjectOptions } from './project-options.js';

export type TypeSystemProjectPhaseName =
  | 'evaluated-source-index'
  | 'project-options'
  | 'ambient-source-index'
  | 'compiler-host'
  | 'program'
  | 'checker';

export interface TypeSystemProjectPhaseTiming {
  readonly name: TypeSystemProjectPhaseName;
  readonly milliseconds: number;
}

export interface TypeSystemProjectProfile {
  readonly totalMilliseconds: number;
  readonly phases: readonly TypeSystemProjectPhaseTiming[];
}

interface TypeSystemSourceFileIndexes {
  readonly byPath: Map<string, ts.SourceFile>;
  readonly byModuleKey: Map<string, ts.SourceFile>;
}

/** Current TypeScript Program/checker epoch for one booted project frame. */
export class TypeSystemProject {
  private readonly moduleExportsBySpecifier = new Map<string, ReadonlyMap<string, ts.Symbol> | null>();

  constructor(
    /** Project frame whose evaluated source files anchor this checker epoch. */
    readonly project: ProjectBootFrame,
    /** Static evaluation whose parsed source files are reused by this program. */
    readonly evaluation: StaticProjectEvaluationResult,
    /** TypeScript Program for current project source and reachable dependencies. */
    readonly program: ts.Program,
    /** Checker owned by the current Program. */
    readonly checker: ts.TypeChecker,
    /** Timing profile for this checker epoch. */
    readonly profile: TypeSystemProjectProfile,
    private readonly sourceFilesByModuleKey: ReadonlyMap<string, ts.SourceFile>,
    private readonly sourceFilesByPath: ReadonlyMap<string, ts.SourceFile>,
  ) {}

  /** Read a source file by evaluator module key. */
  readSourceFileByModuleKey(moduleKey: string): ts.SourceFile | null {
    return this.sourceFilesByModuleKey.get(normalizeModuleKey(moduleKey)) ?? null;
  }

  /** Read a source file by absolute or project-relative path. */
  readSourceFileByPath(fileName: string): ts.SourceFile | null {
    return this.sourceFilesByPath.get(normalizeTypeSystemPath(resolveProjectPath(this.project.rootDir, fileName))) ?? null;
  }

  /** Read the evaluator module key that owns a TypeChecker source file, when it is in the evaluated project graph. */
  readModuleKeyForSourceFile(sourceFile: ts.SourceFile): string | null {
    const normalized = normalizeTypeSystemPath(sourceFile.fileName);
    for (const [moduleKey, candidate] of this.sourceFilesByModuleKey) {
      if (normalizeTypeSystemPath(candidate.fileName) === normalized) {
        return moduleKey;
      }
    }
    return null;
  }

  /**
   * Read the runtime instance/value type for a resource target node.
   *
   * Class declarations and class references produce the instance type because Aurelia resource metadata targets the
   * runtime view-model/controller instance. Non-constructable targets fall back to the checker type at the site.
   */
  readRuntimeTargetType(node: ts.Node): ts.Type | null {
    const declaration = classDeclarationForTarget(this.checker, node);
    if (declaration != null) {
      const declared = declaredClassInstanceType(this.checker, declaration);
      if (declared != null) {
        return declared;
      }
    }

    const type = this.checker.getTypeAtLocation(node);
    const constructed = constructedReturnType(this.checker, type);
    return constructed ?? type ?? null;
  }

  /** Read the runtime instance/value type for an exported framework target, such as runtime-html `If`. */
  readRuntimeTargetTypeForExport(
    moduleSpecifier: string,
    exportName: string,
  ): ts.Type | null {
    const symbol = this.readExportedSymbol(moduleSpecifier, exportName);
    if (symbol == null) {
      return null;
    }

    const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0] ?? null;
    if (declaration != null && (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration))) {
      const declared = declaredClassInstanceType(this.checker, declaration);
      if (declared != null) {
        return declared;
      }
    }

    const valueDeclaration = symbol.valueDeclaration ?? symbol.declarations?.[0] ?? null;
    const valueType = valueDeclaration == null
      ? null
      : this.checker.getTypeOfSymbolAtLocation(symbol, valueDeclaration);
    return valueType == null ? null : constructedReturnType(this.checker, valueType) ?? valueType;
  }

  /**
   * Read the constructor prototype chain for a class declaration in the same order as Aurelia's
   * `getPrototypeChain(Type)`: the concrete class first, then its base classes.
   */
  readClassPrototypeChain(
    declaration: ts.ClassLikeDeclarationBase,
  ): readonly ts.ClassLikeDeclarationBase[] {
    const chain: ts.ClassLikeDeclarationBase[] = [declaration];
    const seen = new Set<string>([classDeclarationKey(declaration)]);
    let current: ts.ClassLikeDeclarationBase | null = declaration;
    while ((current = this.readBaseClassDeclaration(current)) != null) {
      const key = classDeclarationKey(current);
      if (seen.has(key)) {
        break;
      }
      seen.add(key);
      chain.push(current);
    }
    return chain;
  }

  private readExportedSymbol(
    moduleSpecifier: string,
    exportName: string,
  ): ts.Symbol | null {
    const exports = this.readModuleExports(moduleSpecifier);
    const symbol = exports?.get(exportName) ?? null;
    return symbol == null ? null : this.resolveAliasedSymbol(symbol);
  }

  private readModuleExports(moduleSpecifier: string): ReadonlyMap<string, ts.Symbol> | null {
    if (this.moduleExportsBySpecifier.has(moduleSpecifier)) {
      return this.moduleExportsBySpecifier.get(moduleSpecifier)!;
    }

    const sourceFile = this.resolveModuleSourceFile(moduleSpecifier);
    const moduleSymbol = sourceFile == null ? null : this.checker.getSymbolAtLocation(sourceFile) ?? null;
    const exports = moduleSymbol == null
      ? null
      : new Map(this.checker.getExportsOfModule(moduleSymbol).map((symbol) => [symbol.getName(), symbol] as const));
    this.moduleExportsBySpecifier.set(moduleSpecifier, exports);
    return exports;
  }

  private resolveModuleSourceFile(moduleSpecifier: string): ts.SourceFile | null {
    const containingFile = path.join(this.project.rootDir, '.semantic-runtime', 'framework-type-probe.ts');
    const resolved = ts.resolveModuleName(
      moduleSpecifier,
      containingFile,
      this.program.getCompilerOptions(),
      ts.sys,
    ).resolvedModule?.resolvedFileName ?? null;
    return resolved == null ? null : this.program.getSourceFile(resolved) ?? null;
  }

  private resolveAliasedSymbol(symbol: ts.Symbol): ts.Symbol {
    return (symbol.flags & ts.SymbolFlags.Alias) === 0
      ? symbol
      : this.checker.getAliasedSymbol(symbol);
  }

  private readBaseClassDeclaration(
    declaration: ts.ClassLikeDeclarationBase,
  ): ts.ClassLikeDeclarationBase | null {
    const heritageClause = declaration.heritageClauses?.find((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword) ?? null;
    const expression = heritageClause?.types[0]?.expression ?? null;
    if (expression == null) {
      return null;
    }

    const symbol = this.checker.getSymbolAtLocation(expression) ?? null;
    const resolved = symbol == null ? null : this.resolveAliasedSymbol(symbol);
    const declarations = resolved?.declarations ?? (resolved?.valueDeclaration == null ? [] : [resolved.valueDeclaration]);
    for (const candidate of declarations) {
      const classDeclaration = classDeclarationFromDeclaration(candidate);
      if (classDeclaration != null) {
        return classDeclaration;
      }
    }
    return null;
  }
}

/** Builds the TypeChecker epoch shared by resource, template, and inquiry passes. */
export class TypeSystemProjectBuilder {
  build(
    project: ProjectBootFrame,
    evaluation: StaticProjectEvaluationResult,
  ): TypeSystemProject {
    const started = performance.now();
    const phases: TypeSystemProjectPhaseTiming[] = [];
    const evaluatedSources = measureTypeSystemProjectPhase(phases, 'evaluated-source-index', () =>
      evaluation.readEvaluatedSources()
    );
    const sourceFiles = typeSystemSourceFileIndexes(evaluatedSources);

    const projectOptions = measureTypeSystemProjectPhase(phases, 'project-options', () =>
      buildTypeSystemProjectOptions(project.rootDir)
    );
    measureTypeSystemProjectPhase(phases, 'ambient-source-index', () =>
      addAmbientSourceFiles(sourceFiles.byPath, projectOptions.ambientSourceFiles)
    );

    const options = projectOptions.compilerOptions;
    const host = measureTypeSystemProjectPhase(phases, 'compiler-host', () =>
      createTypeSystemCompilerHost(options, sourceFiles.byPath)
    );

    const rootNames = [...sourceFiles.byPath.keys()];
    const program = measureTypeSystemProjectPhase(phases, 'program', () =>
      ts.createProgram(rootNames, options, host)
    );
    const checker = measureTypeSystemProjectPhase(phases, 'checker', () =>
      program.getTypeChecker()
    );
    return new TypeSystemProject(
      project,
      evaluation,
      program,
      checker,
      {
        totalMilliseconds: performance.now() - started,
        phases,
      },
      sourceFiles.byModuleKey,
      sourceFiles.byPath,
    );
  }
}

function typeSystemSourceFileIndexes(
  evaluatedSources: ReturnType<StaticProjectEvaluationResult['readEvaluatedSources']>,
): TypeSystemSourceFileIndexes {
  const byPath = new Map<string, ts.SourceFile>();
  const byModuleKey = new Map<string, ts.SourceFile>();
  for (const source of evaluatedSources) {
    byPath.set(normalizeTypeSystemPath(source.sourceFile.fileName), source.sourceFile);
    byModuleKey.set(normalizeModuleKey(source.moduleKey), source.sourceFile);
  }
  return { byPath, byModuleKey };
}

function addAmbientSourceFiles(
  byPath: Map<string, ts.SourceFile>,
  ambientSourceFiles: readonly ts.SourceFile[],
): void {
  for (const ambientSource of ambientSourceFiles) {
    byPath.set(normalizeTypeSystemPath(ambientSource.fileName), ambientSource);
  }
}

function createTypeSystemCompilerHost(
  options: ts.CompilerOptions,
  byPath: ReadonlyMap<string, ts.SourceFile>,
): ts.CompilerHost {
  const compilerHost = ts.createCompilerHost(options, true);
  const defaultGetSourceFile = compilerHost.getSourceFile.bind(compilerHost);
  compilerHost.getSourceFile = (
    fileName,
    languageVersionOrOptions,
    onError,
    shouldCreateNewSourceFile,
  ) => {
    const existing = byPath.get(normalizeTypeSystemPath(fileName));
    return existing ?? defaultGetSourceFile(fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile);
  };
  return compilerHost;
}

function classDeclarationForTarget(
  checker: ts.TypeChecker,
  node: ts.Node,
): ts.ClassLikeDeclarationBase | null {
  if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
    return node;
  }
  if (
    ts.isIdentifier(node)
    && (ts.isClassDeclaration(node.parent) || ts.isClassExpression(node.parent))
    && node.parent.name === node
  ) {
    return node.parent;
  }
  if (ts.isIdentifier(node)) {
    const symbol = checker.getSymbolAtLocation(node) ?? null;
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0] ?? null;
    if (declaration != null && (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration))) {
      return declaration;
    }
  }
  return null;
}

function declaredClassInstanceType(
  checker: ts.TypeChecker,
  declaration: ts.ClassLikeDeclarationBase,
): ts.Type | null {
  const symbol = declaration.name == null ? checker.getSymbolAtLocation(declaration) : checker.getSymbolAtLocation(declaration.name);
  return symbol == null ? null : checker.getDeclaredTypeOfSymbol(symbol);
}

function constructedReturnType(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  const signature = type.getConstructSignatures()[0] ?? null;
  return signature == null ? null : checker.getReturnTypeOfSignature(signature);
}

function classDeclarationFromDeclaration(
  declaration: ts.Declaration,
): ts.ClassLikeDeclarationBase | null {
  if (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration)) {
    return declaration;
  }
  if (ts.isVariableDeclaration(declaration) && declaration.initializer != null && ts.isClassExpression(declaration.initializer)) {
    return declaration.initializer;
  }
  return null;
}

function classDeclarationKey(
  declaration: ts.ClassLikeDeclarationBase,
): string {
  const sourceFile = declaration.getSourceFile();
  return `${sourceFile.fileName}:${declaration.pos}:${declaration.end}`;
}

function resolveProjectPath(rootDir: string, fileName: string): string {
  return path.isAbsolute(fileName) ? fileName : path.join(rootDir, fileName);
}

function normalizeTypeSystemPath(fileName: string): string {
  return path.normalize(fileName).replace(/\\/g, '/');
}

function measureTypeSystemProjectPhase<TValue>(
  phases: TypeSystemProjectPhaseTiming[],
  name: TypeSystemProjectPhaseName,
  read: () => TValue,
): TValue {
  const started = performance.now();
  const value = read();
  phases.push({
    name,
    milliseconds: performance.now() - started,
  });
  return value;
}
