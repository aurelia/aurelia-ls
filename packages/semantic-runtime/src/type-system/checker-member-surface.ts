import ts from 'typescript';
import { CheckerTypeMemberKind } from './type-shape.js';

export function declarationsForCheckerSymbol(symbol: ts.Symbol | null): readonly ts.Declaration[] {
  return symbol?.getDeclarations() ?? [];
}

export function checkerSymbolMemberKind(
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[] = declarationsForCheckerSymbol(symbol),
): CheckerTypeMemberKind {
  if ((symbol.flags & ts.SymbolFlags.Method) !== 0) {
    return CheckerTypeMemberKind.Method;
  }
  if ((symbol.flags & (ts.SymbolFlags.GetAccessor | ts.SymbolFlags.SetAccessor)) !== 0) {
    return CheckerTypeMemberKind.Accessor;
  }
  if ((symbol.flags & ts.SymbolFlags.Constructor) !== 0) {
    return CheckerTypeMemberKind.Constructor;
  }
  if ((symbol.flags & ts.SymbolFlags.Property) !== 0) {
    return CheckerTypeMemberKind.Property;
  }
  if (declarations.some((declaration) => ts.isCallSignatureDeclaration(declaration))) {
    return CheckerTypeMemberKind.CallSignature;
  }
  if (declarations.some((declaration) => ts.isIndexSignatureDeclaration(declaration))) {
    return CheckerTypeMemberKind.IndexSignature;
  }
  return CheckerTypeMemberKind.Unknown;
}

export function checkerSymbolIsOptional(
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[] = declarationsForCheckerSymbol(symbol),
): boolean {
  return (symbol.flags & ts.SymbolFlags.Optional) !== 0
    || declarations.some((declaration) => 'questionToken' in declaration && declaration.questionToken != null);
}

export function checkerDeclarationsAreReadonly(
  declarations: readonly ts.Declaration[],
): boolean {
  return declarations.some((declaration) =>
    ts.canHaveModifiers(declaration)
    && ts.getModifiers(declaration)?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) === true
  );
}
