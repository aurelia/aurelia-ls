import ts from "typescript";

import {
  canonicalSourceSymbolKey,
  symbolForExpression,
} from "./symbols.js";

/** Exact syntax/member role observed at one TypeScript identifier usage site. */
export type TypeScriptUsageRoleId =
  | "import"
  | "export"
  | "type-reference"
  | "heritage"
  | "new-expression"
  | "call-expression"
  | "member-call"
  | "member-reference"
  | "value-reference";

export const TypeScriptUsageRole = {
  Import: "import",
  Export: "export",
  TypeReference: "type-reference",
  Heritage: "heritage",
  NewExpression: "new-expression",
  CallExpression: "call-expression",
  MemberCall: "member-call",
  MemberReference: "member-reference",
  ValueReference: "value-reference",
} as const satisfies Readonly<Record<string, TypeScriptUsageRoleId>>;

export type TypeScriptUsageCallKind = "call" | "new";

/** Compact syntax/checker facts for one argument passed at a usage call site. */
export interface TypeScriptUsageCallArgument {
  readonly index: number;
  readonly spread: boolean;
  readonly text: string;
  readonly syntaxKindName: string;
  readonly symbolName?: string;
  readonly fullyQualifiedName?: string;
  readonly literalValue?: string | number | boolean | null;
}

/** Compact call-shape metadata attached to a usage site when the usage participates in a call. */
export interface TypeScriptUsageCallSite {
  readonly kind: TypeScriptUsageCallKind;
  readonly calleeName: string;
  readonly calleeText: string;
  readonly receiverText?: string;
  readonly argumentCount: number;
  readonly arguments: readonly TypeScriptUsageCallArgument[];
}

/** Aggregate call-shape value spaces observed across usage rows. */
export interface TypeScriptUsageCallAggregate {
  readonly callCalleeNames: Readonly<Record<string, number>>;
  readonly callArgumentTexts: Readonly<Record<string, number>>;
  readonly callArgumentSymbolNames: Readonly<Record<string, number>>;
  readonly callArgumentFullyQualifiedNames: Readonly<Record<string, number>>;
}

/** Count compact call-shape facts across usage-like rows that optionally carry call metadata. */
export function usageCallAggregate(
  rows: readonly { readonly call?: TypeScriptUsageCallSite }[],
): TypeScriptUsageCallAggregate {
  return {
    callCalleeNames: countBy(
      rows.flatMap((row) => row.call === undefined ? [] : [row.call.calleeName]),
      (calleeName) => calleeName,
    ),
    callArgumentTexts: countBy(
      rows.flatMap((row) => row.call?.arguments.map((argument) => argument.text) ?? []),
      (text) => text,
    ),
    callArgumentSymbolNames: countBy(
      rows.flatMap((row) =>
        row.call?.arguments.flatMap((argument) =>
          argument.symbolName === undefined ? [] : [argument.symbolName],
        ) ?? [],
      ),
      (symbolName) => symbolName,
    ),
    callArgumentFullyQualifiedNames: countBy(
      rows.flatMap((row) =>
        row.call?.arguments.flatMap((argument) =>
          argument.fullyQualifiedName === undefined ? [] : [argument.fullyQualifiedName],
        ) ?? [],
      ),
      (fullyQualifiedName) => fullyQualifiedName,
    ),
  };
}

export function usageRoleForIdentifier(
  identifier: ts.Identifier,
): TypeScriptUsageRoleId | null {
  const parent = identifier.parent;
  if (ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent)) {
    return TypeScriptUsageRole.Import;
  }
  if (ts.isExportSpecifier(parent)) {
    return TypeScriptUsageRole.Export;
  }
  if (isDeclarationName(identifier)) {
    return null;
  }
  if (ts.isPropertyAccessExpression(parent) && parent.name === identifier) {
    return ts.isCallExpression(parent.parent) && parent.parent.expression === parent
      ? TypeScriptUsageRole.MemberCall
      : TypeScriptUsageRole.MemberReference;
  }
  if (ts.isTypeReferenceNode(parent)) {
    return TypeScriptUsageRole.TypeReference;
  }
  if (ts.isExpressionWithTypeArguments(parent) && ts.isHeritageClause(parent.parent)) {
    return TypeScriptUsageRole.Heritage;
  }
  if (ts.isNewExpression(parent) && parent.expression === identifier) {
    return TypeScriptUsageRole.NewExpression;
  }
  if (ts.isCallExpression(parent) && parent.expression === identifier) {
    return TypeScriptUsageRole.CallExpression;
  }
  if (isTypePositionIdentifier(identifier)) {
    return TypeScriptUsageRole.TypeReference;
  }
  return TypeScriptUsageRole.ValueReference;
}

export function usageText(identifier: ts.Identifier): string {
  const parent = identifier.parent;
  if (ts.isPropertyAccessExpression(parent) && parent.name === identifier) {
    return parent.getText(identifier.getSourceFile());
  }
  return identifier.getText(identifier.getSourceFile());
}

export function usageCallForIdentifier(
  checker: ts.TypeChecker,
  identifier: ts.Identifier,
): TypeScriptUsageCallSite | null {
  const call = usageCallExpressionForIdentifier(identifier);
  if (call === null) {
    return null;
  }
  const sourceFile = identifier.getSourceFile();
  const args = [...call.arguments ?? []];
  return {
    kind: ts.isNewExpression(call) ? "new" : "call",
    calleeName: usageCallCalleeName(call.expression),
    calleeText: cappedText(call.expression, sourceFile),
    ...receiverTextField(call.expression, sourceFile),
    argumentCount: args.length,
    arguments: args.map((argument, index) =>
      usageCallArgument(checker, sourceFile, argument, index),
    ),
  };
}

export function isDeclarationName(identifier: ts.Identifier): boolean {
  const parent = identifier.parent;
  return (
    (ts.isClassDeclaration(parent) && parent.name === identifier) ||
    (ts.isInterfaceDeclaration(parent) && parent.name === identifier) ||
    (ts.isFunctionDeclaration(parent) && parent.name === identifier) ||
    (ts.isVariableDeclaration(parent) && parent.name === identifier) ||
    (ts.isTypeAliasDeclaration(parent) && parent.name === identifier) ||
    (ts.isEnumDeclaration(parent) && parent.name === identifier) ||
    (ts.isMethodDeclaration(parent) && parent.name === identifier) ||
    (ts.isMethodSignature(parent) && parent.name === identifier) ||
    (ts.isPropertyDeclaration(parent) && parent.name === identifier) ||
    (ts.isPropertySignature(parent) && parent.name === identifier) ||
    (ts.isParameter(parent) && parent.name === identifier)
  );
}

export function isTypePositionIdentifier(identifier: ts.Identifier): boolean {
  let current: ts.Node = identifier;
  while (current.parent !== undefined) {
    const parent = current.parent;
    if (
      ts.isTypeNode(parent) ||
      ts.isInterfaceDeclaration(parent) ||
      ts.isTypeAliasDeclaration(parent)
    ) {
      return true;
    }
    if (ts.isExpressionStatement(parent) || ts.isBlock(parent) || ts.isSourceFile(parent)) {
      return false;
    }
    if (ts.isExpression(current)) {
      return false;
    }
    current = parent;
  }
  return false;
}

type TypeScriptUsageCallExpression = ts.CallExpression | ts.NewExpression;

function usageCallExpressionForIdentifier(
  identifier: ts.Identifier,
): TypeScriptUsageCallExpression | null {
  const parent = identifier.parent;
  if (
    ts.isPropertyAccessExpression(parent) &&
    parent.name === identifier &&
    ts.isCallExpression(parent.parent) &&
    parent.parent.expression === parent
  ) {
    return parent.parent;
  }
  if (
    ts.isCallExpression(parent) &&
    parent.expression === identifier
  ) {
    return parent;
  }
  if (
    ts.isNewExpression(parent) &&
    parent.expression === identifier
  ) {
    return parent;
  }
  return null;
}

function usageCallArgument(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  argument: ts.Expression,
  index: number,
): TypeScriptUsageCallArgument {
  const spread = ts.isSpreadElement(argument);
  const expression = spread ? argument.expression : argument;
  const symbol = symbolForExpression(checker, expression);
  return {
    index,
    spread,
    text: cappedText(expression, sourceFile),
    syntaxKindName: ts.SyntaxKind[expression.kind] ?? String(expression.kind),
    ...(symbol === null ? {} : {
      symbolName: symbol.getName(),
      fullyQualifiedName: fullyQualifiedName(checker, symbol),
    }),
    ...literalValueField(expression),
  };
}

function usageCallCalleeName(expression: ts.Expression): string {
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isElementAccessExpression(expression)) {
    return expression.argumentExpression?.getText(expression.getSourceFile()) ?? expression.getText(expression.getSourceFile());
  }
  return expression.getText(expression.getSourceFile());
}

function receiverTextField(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
): { readonly receiverText?: string } {
  if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
    return { receiverText: cappedText(expression.expression, sourceFile) };
  }
  return {};
}

function cappedText(node: ts.Node, sourceFile: ts.SourceFile): string {
  return node.getText(sourceFile).slice(0, 200);
}

function fullyQualifiedName(checker: ts.TypeChecker, symbol: ts.Symbol): string {
  try {
    return canonicalSourceSymbolKey(checker.getFullyQualifiedName(symbol));
  } catch {
    return symbol.getName();
  }
}

function literalValueField(
  expression: ts.Expression,
): { readonly literalValue?: string | number | boolean | null } {
  if (ts.isStringLiteralLike(expression)) {
    return { literalValue: expression.text };
  }
  if (ts.isNumericLiteral(expression)) {
    return { literalValue: Number(expression.text) };
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    return { literalValue: true };
  }
  if (expression.kind === ts.SyntaxKind.FalseKeyword) {
    return { literalValue: false };
  }
  if (expression.kind === ts.SyntaxKind.NullKeyword) {
    return { literalValue: null };
  }
  return {};
}

function countBy<T>(
  values: readonly T[],
  keyFor: (value: T) => string,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const value of values) {
    const key = keyFor(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
