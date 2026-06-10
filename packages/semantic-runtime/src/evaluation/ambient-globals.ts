import ts from 'typescript';
import type { ProjectBootFrame, SourceFileAdmission } from '../boot/frames.js';
import {
  SourceFileRole,
  SourceLanguage,
} from '../kernel/address.js';
import { EvaluationBoundaryKind, EvaluationBoundaryValue } from './values.js';
import type { StaticEvaluationRuntimeHost } from './evaluator.js';

/**
 * Project-local ambient global declarations that bundlers or host environments provide at runtime.
 */
export class StaticEvaluationAmbientGlobalDeclarations {
  constructor(
    /** Ambient variable names visible to project source evaluation. */
    private readonly names: ReadonlySet<string>,
  ) {}

  resolveIdentifier(
    identifier: ts.Identifier,
  ): EvaluationBoundaryValue | null {
    return this.names.has(identifier.text)
      ? new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, identifier.text, identifier)
      : null;
  }
}

/**
 * Read ambient `declare const/let/var` globals from project `.d.ts` files for static evaluation.
 */
export function readStaticEvaluationAmbientGlobalDeclarations(
  project: ProjectBootFrame,
  readSourceFile: (moduleKey: string) => ts.SourceFile | null,
): StaticEvaluationAmbientGlobalDeclarations {
  const names = new Set<string>();
  for (const admission of project.sourceFiles) {
    if (!isAmbientDeclarationAdmission(admission)) {
      continue;
    }
    const sourceFile = readSourceFile(admission.path);
    if (sourceFile?.isDeclarationFile !== true) {
      continue;
    }
    collectSourceFileAmbientGlobalNames(sourceFile, names);
  }
  return new StaticEvaluationAmbientGlobalDeclarations(names);
}

/**
 * Layer project ambient globals behind caller-provided runtime host intrinsics.
 */
export function withStaticEvaluationAmbientGlobals(
  runtimeHost: StaticEvaluationRuntimeHost,
  ambientGlobals: StaticEvaluationAmbientGlobalDeclarations,
): StaticEvaluationRuntimeHost {
  return {
    ...runtimeHost,
    resolveIdentifier: (identifier, environment, moduleKey) =>
      runtimeHost.resolveIdentifier?.(identifier, environment, moduleKey)
      ?? ambientGlobals.resolveIdentifier(identifier),
  };
}

function isAmbientDeclarationAdmission(
  admission: Pick<SourceFileAdmission, 'language' | 'role'>,
): boolean {
  return admission.language === SourceLanguage.TypeScript && admission.role === SourceFileRole.Declaration;
}

function collectSourceFileAmbientGlobalNames(
  sourceFile: ts.SourceFile,
  names: Set<string>,
): void {
  if (!ts.isExternalModule(sourceFile)) {
    collectAmbientVariableNames(sourceFile.statements, names);
  }
  for (const statement of sourceFile.statements) {
    if (isDeclareGlobalStatement(statement)) {
      collectAmbientVariableNames(statement.body.statements, names);
    }
  }
}

function isDeclareGlobalStatement(
  statement: ts.Statement,
): statement is ts.ModuleDeclaration & { readonly body: ts.ModuleBlock } {
  return ts.isModuleDeclaration(statement)
    && ts.isIdentifier(statement.name)
    && statement.name.text === 'global'
    && statement.body != null
    && ts.isModuleBlock(statement.body);
}

function collectAmbientVariableNames(
  statements: ts.NodeArray<ts.Statement>,
  names: Set<string>,
): void {
  for (const statement of statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) {
        names.add(declaration.name.text);
      }
    }
  }
}
