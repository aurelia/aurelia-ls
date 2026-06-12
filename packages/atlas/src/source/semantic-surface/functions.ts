import ts from "typescript";

import type { SourceProject } from "../project.js";
import { isNestedExecutionBoundary, unwrapExpression } from "./ast.js";

export type LocalFunctionDeclaration =
  (ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction) & {
    readonly body: ts.Block;
  };

/** Resolve a same-file function-like declaration reached by an identifier call. */
export function localFunctionDeclarationForCall(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
): LocalFunctionDeclaration | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isIdentifier(expression)) {
    return null;
  }
  const symbol = sourceProject.checker.getSymbolAtLocation(expression);
  const declaration = symbol
    ?.getDeclarations()
    ?.find(
      (candidate): candidate is ts.FunctionDeclaration | ts.VariableDeclaration =>
        (ts.isFunctionDeclaration(candidate) ||
          ts.isVariableDeclaration(candidate)) &&
        candidate.getSourceFile().fileName === sourceFile.fileName,
    );
  if (declaration === undefined) {
    return null;
  }
  if (ts.isFunctionDeclaration(declaration)) {
    return declaration.body === undefined ? null : declaration as LocalFunctionDeclaration;
  }
  if (declaration.initializer === undefined) {
    return null;
  }
  const initializer = unwrapExpression(declaration.initializer);
  return (
    (ts.isFunctionExpression(initializer) || ts.isArrowFunction(initializer)) &&
    ts.isBlock(initializer.body)
  )
    ? initializer as LocalFunctionDeclaration
    : null;
}

export function returnExpressions(node: ts.Node): readonly ts.Expression[] {
  const expressions: ts.Expression[] = [];
  const visit = (current: ts.Node): void => {
    if (current !== node && isNestedExecutionBoundary(current)) {
      return;
    }
    if (ts.isReturnStatement(current) && current.expression !== undefined) {
      expressions.push(current.expression);
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return expressions;
}
