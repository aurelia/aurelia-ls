import { TypeScriptDeclarationIdentity } from '../kernel/identity.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  KernelStoreBatch,
  type KernelStore,
} from '../kernel/store.js';
import { SourceSpanRole } from '../kernel/address.js';
import ts from 'typescript';
import {
  sourceSpanForCheckerDeclaration,
  sourceSpanForCheckerNode,
} from './declaration-source.js';
import {
  checkerSymbolMemberKind,
  declarationsForCheckerSymbol,
} from './checker-member-surface.js';
import type {
  CheckerTypeMember,
  CheckerTypeMemberKind,
} from './type-shape.js';

export interface CheckerSymbolMemberSourceProjection {
  readonly memberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null;
  readonly sourceAddressHandle: AddressHandle | null;
}

/**
 * Read the navigable source address for a checker member.
 *
 * Checker-backed members usually carry a declaration identity whose kernel record already owns the declaration source
 * span. Synthetic members and open checker members can still keep a direct source address on the hot member detail.
 */
export function checkerTypeMemberSourceAddressHandle(
  store: KernelStore,
  member: CheckerTypeMember,
): AddressHandle | null {
  if (member.sourceAddressHandle != null) {
    return member.sourceAddressHandle;
  }
  if (member.declarationIdentityHandle == null) {
    return null;
  }
  const identity = store.readIdentity(member.declarationIdentityHandle);
  return identity instanceof TypeScriptDeclarationIdentity
    ? identity.declarationAddressHandle
    : null;
}

/** Materialize a navigable member declaration source for a raw checker symbol. */
export function checkerSymbolMemberSourceProjection(
  store: KernelStore,
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[] = declarationsForCheckerSymbol(symbol),
): CheckerSymbolMemberSourceProjection {
  const publication = sourceSpanForCheckerDeclaration(store, symbol, declarations, SourceSpanRole.Name);
  store.commitMissing(new KernelStoreBatch(
    publication?.records ?? [],
    `type-system:checker-symbol-member-source:${symbol.getName()}`,
  ));
  return {
    memberKind: checkerSymbolMemberKind(symbol, declarations),
    sourceAddressHandle: publication?.address.handle ?? null,
  };
}

/** Read the best source address for the value type produced by a checker member. */
export function checkerTypeMemberValueSourceAddressHandle(
  store: KernelStore,
  member: CheckerTypeMember,
): AddressHandle | null {
  if (member.carrier == null) {
    return checkerTypeMemberSourceAddressHandle(store, member);
  }
  return checkerSymbolMemberValueSourceProjection(
    store,
    member.carrier.symbol,
    member.carrier.declarations,
  ).sourceAddressHandle;
}

/** Materialize the type annotation / return type source for a raw checker member when it exists. */
export function checkerSymbolMemberValueSourceProjection(
  store: KernelStore,
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[] = declarationsForCheckerSymbol(symbol),
): CheckerSymbolMemberSourceProjection {
  const typeNode = memberValueTypeNode(declarations);
  if (typeNode == null) {
    return checkerSymbolMemberSourceProjection(store, symbol, declarations);
  }
  const publication = sourceSpanForCheckerNode(
    store,
    `checker-symbol-member-value-source:${symbol.getName()}`,
    typeNode,
    SourceSpanRole.Type,
  );
  store.commitMissing(new KernelStoreBatch(
    publication.records,
    `type-system:checker-symbol-member-value-source:${symbol.getName()}`,
  ));
  return {
    memberKind: checkerSymbolMemberKind(symbol, declarations),
    sourceAddressHandle: publication.address.handle,
  };
}

function memberValueTypeNode(
  declarations: readonly ts.Declaration[],
): ts.Node | null {
  for (const declaration of declarations) {
    const node = memberDeclarationTypeNode(declaration);
    if (node != null) {
      return node;
    }
  }
  return null;
}

function memberDeclarationTypeNode(
  declaration: ts.Declaration,
): ts.Node | null {
  if (ts.isPropertyDeclaration(declaration)
    || ts.isPropertySignature(declaration)
    || ts.isVariableDeclaration(declaration)
    || ts.isParameter(declaration)
    || ts.isMethodDeclaration(declaration)
    || ts.isMethodSignature(declaration)
    || ts.isFunctionDeclaration(declaration)
    || ts.isFunctionExpression(declaration)
    || ts.isArrowFunction(declaration)
    || ts.isGetAccessorDeclaration(declaration)
    || ts.isCallSignatureDeclaration(declaration)
    || ts.isConstructSignatureDeclaration(declaration)
    || ts.isIndexSignatureDeclaration(declaration)
    || ts.isTypeAliasDeclaration(declaration)) {
    return declaration.type ?? null;
  }
  if (ts.isSetAccessorDeclaration(declaration)) {
    return declaration.parameters[0]?.type ?? null;
  }
  return null;
}
