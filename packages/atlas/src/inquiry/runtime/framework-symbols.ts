import ts from "typescript";

import {
  SourceDeclarationKind,
  type SourceProject,
  type SourceTargetRow,
} from "../../source/index.js";
import { sourceSpan } from "./framework-support.js";
import { unwrapExpression } from "./framework-ts-utils.js";

export function declarationNameText(
  declaration: ts.Declaration,
): string | null {
  const name = (declaration as { readonly name?: ts.Node | null }).name;
  return name !== undefined && name !== null && ts.isIdentifier(name)
    ? name.text
    : null;
}

export function valueDeclarationParts(declaration: ts.Declaration): {
  readonly nameNode: ts.Node;
  readonly declarationNode: ts.Node;
  readonly declarationKind: SourceDeclarationKind;
} | null {
  if (ts.isClassDeclaration(declaration) && declaration.name !== undefined) {
    return {
      nameNode: declaration.name,
      declarationNode: declaration,
      declarationKind: SourceDeclarationKind.Class,
    };
  }
  if (ts.isFunctionDeclaration(declaration) && declaration.name !== undefined) {
    return {
      nameNode: declaration.name,
      declarationNode: declaration,
      declarationKind: SourceDeclarationKind.Function,
    };
  }
  if (
    ts.isVariableDeclaration(declaration) &&
    ts.isIdentifier(declaration.name)
  ) {
    return {
      nameNode: declaration.name,
      declarationNode: declaration,
      declarationKind: SourceDeclarationKind.Variable,
    };
  }
  if (ts.isEnumDeclaration(declaration)) {
    return {
      nameNode: declaration.name,
      declarationNode: declaration,
      declarationKind: SourceDeclarationKind.Enum,
    };
  }
  return null;
}

export function memberNamesForValueName(
  sourceProject: SourceProject,
  nameNode: ts.Node,
): readonly string[] {
  const checker = sourceProject.checker;
  const symbol = checker.getSymbolAtLocation(nameNode);
  const type =
    symbol === undefined
      ? checker.getTypeAtLocation(nameNode)
      : checker.getTypeOfSymbolAtLocation(symbol, nameNode);
  return [
    ...new Set(type.getProperties().map((property) => property.getName())),
  ].sort();
}

export function declarationsForExpressionSymbol(
  sourceProject: SourceProject,
  expression: ts.Expression,
): readonly ts.Declaration[] {
  const current = unwrapExpression(expression);
  const symbol = ts.isIdentifier(current)
    ? sourceProject.checker.getSymbolAtLocation(current)
    : ts.isPropertyAccessExpression(current)
    ? sourceProject.checker.getSymbolAtLocation(current.name) ??
      sourceProject.checker.getSymbolAtLocation(current)
    : sourceProject.checker.getSymbolAtLocation(current);
  if (symbol === undefined) {
    return [];
  }
  const resolved =
    (symbol.flags & ts.SymbolFlags.Alias) !== 0
      ? sourceProject.checker.getAliasedSymbol(symbol)
      : symbol;
  return resolved.getDeclarations() ?? symbol.getDeclarations() ?? [];
}

export function declarationKey(declaration: ts.Declaration): string | null {
  const sourceFile = declaration.getSourceFile();
  const span = sourceSpan(sourceFile, declaration);
  return sourceLocationKey(sourceFile.fileName, span.start, span.end);
}

export function targetDeclarationKey(target: SourceTargetRow): string | null {
  return target.file === undefined || target.span === undefined
    ? null
    : sourceLocationKey(
        target.file.absolutePath,
        target.span.start,
        target.span.end,
      );
}

export function sourceLocationKey(
  fileName: string,
  start: number,
  end: number,
): string {
  return `${fileName.replace(/\\/gu, "/").toLowerCase()}:${start}:${end}`;
}

export function uniqueById<TRow extends { readonly id: string }>(
  rows: readonly TRow[],
): readonly TRow[] {
  const byId = new Map<string, TRow>();
  for (const row of rows) {
    byId.set(row.id, row);
  }
  return [...byId.values()];
}
