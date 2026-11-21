import ts from 'typescript';

import {
  EvaluationBinding,
  EvaluationBindingKind,
  EvaluationBindingState,
  LinkedEvaluationExport,
  type ModuleEnvironmentRecord,
} from './environment.js';
import type { StaticEvaluationImportValues } from './evaluator.js';
import { EvaluationOpenSeamKind } from './seams.js';
import {
  EvaluationBoundaryKind,
  EvaluationBoundaryValue,
  EvaluationUndefined,
  EvaluationFunctionValue,
  EvaluationUnknownValue,
} from './values.js';
import { hasModifier } from './ts-syntax.js';

export interface StaticDeclarationInstantiationHost {
  open(
    seamKind: EvaluationOpenSeamKind,
    summary: string,
    node: ts.Node,
    moduleKey: string,
  ): void;
}

/** Instantiate import/function bindings and declare class lexical cells before a module body executes. */
export function instantiateStaticModuleDeclarations(
  sourceFile: ts.SourceFile,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  imports: StaticEvaluationImportValues,
  host: StaticDeclarationInstantiationHost,
): void {
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      instantiateStaticImportDeclaration(statement, environment, moduleKey, imports, host);
      continue;
    }
    if (ts.isFunctionDeclaration(statement)) {
      instantiateStaticFunctionDeclaration(statement, environment);
      continue;
    }
    if (ts.isClassDeclaration(statement)) {
      const localName = statement.name?.text
        ?? (hasModifier(statement, ts.SyntaxKind.DefaultKeyword) ? 'default' : null);
      if (localName == null) {
        continue;
      }
      environment.declareBinding(
        localName,
        EvaluationBindingKind.Class,
        false,
        statement,
      );
    }
  }
}

/** Instantiate function declarations hoisted to an interpreted block body. */
export function instantiateStaticBlockFunctionDeclarations(
  block: ts.Block,
  environment: ModuleEnvironmentRecord,
): void {
  for (const statement of block.statements) {
    if (ts.isFunctionDeclaration(statement)) {
      instantiateStaticFunctionDeclaration(statement, environment);
    }
  }
}

function instantiateStaticFunctionDeclaration(
  statement: ts.FunctionDeclaration,
  environment: ModuleEnvironmentRecord,
): void {
  const localName = statement.name?.text
    ?? (hasModifier(statement, ts.SyntaxKind.DefaultKeyword) ? 'default' : null);
  if (localName == null) {
    return;
  }
  environment.initializeBinding(
    localName,
    hasModifier(statement, ts.SyntaxKind.DeclareKeyword)
      ? new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, localName, statement)
      : new EvaluationFunctionValue(statement, environment, statement),
    EvaluationBindingKind.Function,
    false,
    statement,
    [],
  );
}

function instantiateStaticImportDeclaration(
  statement: ts.ImportDeclaration,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  imports: StaticEvaluationImportValues,
  host: StaticDeclarationInstantiationHost,
): void {
  if (!ts.isStringLiteral(statement.moduleSpecifier)) {
    host.open(
      EvaluationOpenSeamKind.DynamicImport,
      'Import declaration did not close to a string module specifier.',
      statement.moduleSpecifier,
      moduleKey,
    );
    return;
  }
  const clause = statement.importClause;
  if (clause == null || clause.isTypeOnly) return;
  function link(localName: string, node: ts.Node) {
    const imported = imports.get(localName);
    if (imported instanceof LinkedEvaluationExport) {
      environment.installBinding(new EvaluationBinding(localName, EvaluationBindingKind.Import, false, node,
        EvaluationBindingState.Initialized, EvaluationUndefined, [], imported.binding));
    } else {
      environment.initializeBinding(localName, imported?.value
        ?? new EvaluationUnknownValue('Import binding is not linked to its source module in this evaluator pass.', node),
      EvaluationBindingKind.Import, false, node, imported?.openSeams ?? []);
    }
  }
  if (clause.name != null) {
    link(clause.name.text, clause);
  }
  if (clause.namedBindings == null) {
    return;
  }
  if (ts.isNamespaceImport(clause.namedBindings)) {
    link(clause.namedBindings.name.text, clause.namedBindings);
    return;
  }
  for (const element of clause.namedBindings.elements) {
    if (!element.isTypeOnly) link(element.name.text, element);
  }
}
