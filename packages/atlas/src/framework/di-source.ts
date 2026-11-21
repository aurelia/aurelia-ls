import ts from "typescript";

import type { SourceRange } from "../inquiry/locus.js";
import {
  declarationName,
  requiredSourceRangeForNode,
  sourceRangeKey,
  SourceProjectKeyedMemo,
  symbolForExpressionName,
  type SourceProject,
} from "../source/index.js";

/** Recover the exact expression or declaration recorded by a DI source endpoint. */
export function sourceNodeForDiRange(project: SourceProject, range: SourceRange | undefined): ts.Node | null {
  if (range === undefined) return null;
  const file = project.readSourceFile(range.filePath);
  if (file === null) return null;
  const start = file.getPositionOfLineAndCharacter(range.start.line, range.start.character);
  const end = file.getPositionOfLineAndCharacter(range.end.line, range.end.character);
  function find(node: ts.Node): ts.Node | undefined {
    if (node.pos > start || node.end < end) return undefined;
    if (node.end === end && node.getStart(file!) === start && !ts.isSourceFile(node)) return node;
    return ts.forEachChild(node, find);
  }
  return find(file) ?? null;
}

const providerDeclarationKeys = new SourceProjectKeyedMemo<string, string>();

/** Compare provider endpoints by their declarations, falling back to the exact source expression. */
export function diProviderSourceKey(project: SourceProject, source: SourceRange | undefined): string | null {
  if (source === undefined) return null;
  const address = sourceRangeKey(source);
  return providerDeclarationKeys.read(project, address, () => {
    const node = sourceNodeForDiRange(project, source);
    if (node && (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node))) {
      const declaration = symbolForExpressionName(project.checker, node)?.valueDeclaration;
      if (declaration) return sourceRangeKey(requiredSourceRangeForNode(project, declaration));
    }
    return address;
  });
}

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
  seen = new Set<ts.Expression>(),
): boolean {
  if (seen.has(expression)) return false;
  seen.add(expression);
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
      return isCreateInterfaceExpression(sourceProject, declaration.initializer, seen);
    }
    return false;
  }) === true;
}
