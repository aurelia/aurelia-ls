import ts from 'typescript';

import { readStaticClassProperties, type StaticClassEvaluationHost } from './class-values.js';
import {
  EvaluationBindingKind,
  type ModuleEnvironmentRecord,
} from './environment.js';
import type { StaticEvaluationImportValues } from './evaluator.js';
import { EvaluationOpenSeamKind } from './seams.js';
import {
  EvaluationClassValue,
  EvaluationFunctionValue,
  EvaluationUnknownValue,
} from './values.js';
import { hasModifier } from './ts-syntax.js';

export interface StaticDeclarationInstantiationHost {
  readonly classHost: StaticClassEvaluationHost;

  open(
    seamKind: EvaluationOpenSeamKind,
    summary: string,
    node: ts.Node,
    moduleKey: string,
  ): void;
}

/** Instantiate import, function, and class bindings before a module body executes. */
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
      environment.initializeBinding(
        localName,
        new EvaluationClassValue(
          statement,
          environment,
          statement,
          readStaticClassProperties(statement, environment, moduleKey, 0, host.classHost),
        ),
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
    new EvaluationFunctionValue(statement, environment, statement),
    EvaluationBindingKind.Function,
    false,
    statement,
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
  if (clause == null) {
    return;
  }
  if (clause.name != null) {
    const imported = imports.get(clause.name.text);
    environment.initializeBinding(
      clause.name.text,
      imported ?? new EvaluationUnknownValue('Default import binding is not linked to its source module in this evaluator pass.', clause.name),
      EvaluationBindingKind.Import,
      false,
      clause,
    );
  }
  if (clause.namedBindings == null) {
    return;
  }
  if (ts.isNamespaceImport(clause.namedBindings)) {
    const imported = imports.get(clause.namedBindings.name.text);
    environment.initializeBinding(
      clause.namedBindings.name.text,
      imported ?? new EvaluationUnknownValue('Namespace import binding is not linked to its source module in this evaluator pass.', clause.namedBindings.name),
      EvaluationBindingKind.Import,
      false,
      clause.namedBindings,
    );
    return;
  }
  for (const element of clause.namedBindings.elements) {
    const imported = imports.get(element.name.text);
    environment.initializeBinding(
      element.name.text,
      imported ?? new EvaluationUnknownValue('Named import binding is not linked to its source module in this evaluator pass.', element.name),
      EvaluationBindingKind.Import,
      false,
      element,
    );
  }
}
