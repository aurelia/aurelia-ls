import path from 'node:path';
import ts from 'typescript';
import type { ProjectBootFrame } from '../boot/frames.js';
import {
  normalizeModuleKey,
} from '../evaluation/module-graph.js';
import type { StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import { buildTypeSystemProjectOptions } from './project-options.js';

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
    private readonly sourceFilesByModuleKey: ReadonlyMap<string, ts.SourceFile>,
    private readonly sourceFilesByPath: ReadonlyMap<string, ts.SourceFile>,
  ) {}

  /** Read a source file by evaluator module key. */
  readSourceFileByModuleKey(moduleKey: string): ts.SourceFile | null {
    return this.sourceFilesByModuleKey.get(normalizeModuleKey(moduleKey)) ?? null;
  }

  /** Read a source file by absolute or project-relative path. */
  readSourceFileByPath(fileName: string): ts.SourceFile | null {
    return this.sourceFilesByPath.get(normalizePath(resolveProjectPath(this.project.rootDir, fileName))) ?? null;
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
    const evaluatedSources = evaluation.readEvaluatedSources();
    const byPath = new Map<string, ts.SourceFile>();
    const byModuleKey = new Map<string, ts.SourceFile>();

    for (const source of evaluatedSources) {
      const absolutePath = normalizePath(source.sourceFile.fileName);
      byPath.set(absolutePath, source.sourceFile);
      byModuleKey.set(normalizeModuleKey(source.moduleKey), source.sourceFile);
    }

    const projectOptions = buildTypeSystemProjectOptions(project.rootDir);
    for (const ambientSource of projectOptions.ambientSourceFiles) {
      byPath.set(normalizePath(ambientSource.fileName), ambientSource);
    }

    const options = projectOptions.compilerOptions;
    const host = ts.createCompilerHost(options, true);
    const defaultGetSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (
      fileName,
      languageVersionOrOptions,
      onError,
      shouldCreateNewSourceFile,
    ) => {
      const normalized = normalizePath(fileName);
      const existing = byPath.get(normalized);
      if (existing != null) {
        return existing;
      }
      return defaultGetSourceFile(fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile);
    };

    const rootNames = [...byPath.keys()];
    const program = ts.createProgram(rootNames, options, host);
    return new TypeSystemProject(
      project,
      evaluation,
      program,
      program.getTypeChecker(),
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

function normalizePath(fileName: string): string {
  return path.normalize(fileName).replace(/\\/g, '/');
}
