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

/** Current TypeScript Program/checker epoch for one booted project frame. */
export class TypeSystemProject {
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
    const byPath = new Map<string, ts.SourceFile>();
    const byModuleKey = new Map<string, ts.SourceFile>();

    for (const source of evaluatedSources) {
      const absolutePath = normalizeTypeSystemPath(source.sourceFile.fileName);
      byPath.set(absolutePath, source.sourceFile);
      byModuleKey.set(normalizeModuleKey(source.moduleKey), source.sourceFile);
    }

    const projectOptions = measureTypeSystemProjectPhase(phases, 'project-options', () =>
      buildTypeSystemProjectOptions(project.rootDir)
    );
    measureTypeSystemProjectPhase(phases, 'ambient-source-index', () => {
      for (const ambientSource of projectOptions.ambientSourceFiles) {
        byPath.set(normalizeTypeSystemPath(ambientSource.fileName), ambientSource);
      }
    });

    const options = projectOptions.compilerOptions;
    const host = measureTypeSystemProjectPhase(phases, 'compiler-host', () => {
      const compilerHost = ts.createCompilerHost(options, true);
      const defaultGetSourceFile = compilerHost.getSourceFile.bind(compilerHost);
      compilerHost.getSourceFile = (
        fileName,
        languageVersionOrOptions,
        onError,
        shouldCreateNewSourceFile,
      ) => {
        const normalized = normalizeTypeSystemPath(fileName);
        const existing = byPath.get(normalized);
        if (existing != null) {
          return existing;
        }
        return defaultGetSourceFile(fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile);
      };
      return compilerHost;
    });

    const rootNames = [...byPath.keys()];
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
      byModuleKey,
      byPath,
    );
  }
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
