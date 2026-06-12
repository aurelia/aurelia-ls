import ts from "typescript";

import {
  declarationName,
  propertyOrIdentifierName,
  symbolForExpressionName,
  type SourceProject,
} from "../source/index.js";

/** Return true when a call expression semantically resolves to Aurelia createInterface. */
export function isCreateInterfaceCall(
  /** Hot source project that owns the current TypeChecker. */
  sourceProject: SourceProject,
  /** Call expression to classify. */
  call: ts.CallExpression,
): boolean {
  return (
    returnsTypeNamed(sourceProject, call, "InterfaceSymbol") &&
    isCreateInterfaceExpression(sourceProject, call.expression)
  );
}

function returnsTypeNamed(
  sourceProject: SourceProject,
  call: ts.CallExpression,
  typeName: string,
): boolean {
  const signature = sourceProject.checker.getResolvedSignature(call);
  const type =
    signature === undefined
      ? sourceProject.checker.getTypeAtLocation(call)
      : sourceProject.checker.getReturnTypeOfSignature(signature);
  return sourceProject.checker.typeToString(type, call).includes(typeName);
}

function isCreateInterfaceExpression(
  sourceProject: SourceProject,
  expression: ts.Expression,
): boolean {
  const visibleName = propertyOrIdentifierName(
    expression,
    expression.getSourceFile(),
  );
  if (visibleName === "createInterface") {
    return true;
  }
  const symbol = symbolForExpressionName(sourceProject.checker, expression);
  return symbol?.getDeclarations()?.some((declaration) => {
    const packageId =
      sourceProject.sourceFileIdentity(declaration.getSourceFile())?.packageId;
    if (packageId === "kernel" && declarationName(declaration) === "createInterface") {
      return true;
    }
    if (
      ts.isVariableDeclaration(declaration) &&
      declaration.initializer !== undefined
    ) {
      return isCreateInterfaceExpression(sourceProject, declaration.initializer);
    }
    return false;
  }) === true;
}
