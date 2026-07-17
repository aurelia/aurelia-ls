import { TypeScriptDeclarationIdentity } from '../kernel/identity.js';
import type { AddressHandle, KernelRecordHandle } from '../kernel/handles.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreReadView,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelPublicationPlan,
  type KernelPublicationContext,
} from '../kernel/publication.js';
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
  store: KernelStoreReadView,
  member: CheckerTypeMember,
): AddressHandle | null {
  if (member.sourceAddressHandle != null) {
    return member.sourceAddressHandle;
  }
  if (member.declarationIdentityHandle == null) {
    return null;
  }
  const identity = store.read(member.declarationIdentityHandle);
  return identity instanceof TypeScriptDeclarationIdentity
    ? identity.declarationAddressHandle
    : null;
}

/** Materialize a navigable member declaration source for a raw checker symbol. */
export function checkerSymbolMemberSourceProjection(
  store: KernelStore,
  publication: KernelPublicationContext,
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[] = declarationsForCheckerSymbol(symbol),
): CheckerSymbolMemberSourceProjection {
  const source = sourceSpanForCheckerDeclaration(store, publication, symbol, declarations, SourceSpanRole.Name);
  publishMissingSourceRecords(
    publication,
    source?.records ?? [],
    `type-system:checker-symbol-member-source:${symbol.getName()}`,
  );
  return {
    memberKind: checkerSymbolMemberKind(symbol, declarations),
    sourceAddressHandle: source?.address.handle ?? null,
  };
}

/** Read the best source address for the value type produced by a checker member. */
export function checkerTypeMemberValueSourceAddressHandle(
  store: KernelStore,
  publication: KernelPublicationContext,
  member: CheckerTypeMember,
): AddressHandle | null {
  if (member.carrier == null) {
    return checkerTypeMemberSourceAddressHandle(publication, member);
  }
  return checkerSymbolMemberValueSourceProjection(
    store,
    publication,
    member.carrier.symbol,
    member.carrier.declarations,
  ).sourceAddressHandle;
}

/** Materialize the type annotation / return type source for a raw checker member when it exists. */
export function checkerSymbolMemberValueSourceProjection(
  store: KernelStore,
  publication: KernelPublicationContext,
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[] = declarationsForCheckerSymbol(symbol),
): CheckerSymbolMemberSourceProjection {
  const typeNode = memberValueTypeNode(declarations);
  if (typeNode == null) {
    return checkerSymbolMemberSourceProjection(store, publication, symbol, declarations);
  }
  const source = sourceSpanForCheckerNode(
    store,
    publication,
    `checker-symbol-member-value-source:${symbol.getName()}`,
    typeNode,
    SourceSpanRole.Type,
  );
  publishMissingSourceRecords(
    publication,
    source.records,
    `type-system:checker-symbol-member-value-source:${symbol.getName()}`,
  );
  return {
    memberKind: checkerSymbolMemberKind(symbol, declarations),
    sourceAddressHandle: source.address.handle,
  };
}

function publishMissingSourceRecords(
  publication: KernelPublicationContext,
  records: readonly KernelStoreRecord[],
  label: string,
): void {
  const missing = records.filter((record) =>
    publication.read(record.handle as KernelRecordHandle) == null
  );
  if (missing.length > 0) {
    publication.publish(new KernelPublicationPlan(new KernelStoreBatch(missing, label)));
  }
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
