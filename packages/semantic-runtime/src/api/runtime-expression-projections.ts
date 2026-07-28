import type { ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import { RuntimeExpressionProductDetails } from '../runtime-expression/product-details.js';
import {
  RuntimeExpressionAccessOrigin,
  type RuntimeExpressionAccessUse,
} from '../runtime-expression/runtime-expression-access-use.js';
import type {
  SemanticRuntimeExpressionAccessUseOccurrenceRow,
  SemanticRuntimeExpressionAccessUseRow,
  SemanticRuntimeExpressionAccessUseSummaryRow,
} from './contracts.js';
import { describeAddress } from './source-reference.js';

/** Shared public projection for the access facts consumed by observation and runtime-expression queries. */
export function runtimeExpressionAccessUseSummaryRow(
  store: KernelStore,
  accessUse: RuntimeExpressionAccessUse,
): SemanticRuntimeExpressionAccessUseSummaryRow {
  return {
    operationKind: accessUse.operationKind,
    operationIndex: accessUse.operationIndex,
    origin: accessUse.origin,
    authored: accessUse.origin === RuntimeExpressionAccessOrigin.Authored,
    accessForm: accessUse.accessForm,
    role: accessUse.role,
    phase: accessUse.phase,
    tracking: accessUse.tracking,
    realization: accessUse.realization,
    reachability: accessUse.reachability,
    scopeLookupAncestor: accessUse.scopeLookupAncestor,
    authoredScopeAncestor: accessUse.authoredScopeAncestor,
    callbackScopeDepth: accessUse.callbackScopeDepth,
    lexicalLocal: accessUse.lexicalLocal,
    targetResolution: accessUse.targetResolution,
    targetCount: accessUse.targetLinks.length,
    executionQualifiers: accessUse.executionQualifiers.map((qualifier) => ({
      kind: qualifier.kind,
      operationName: qualifier.operationName,
      source: describeAddress(store, qualifier.sourceAddressHandle),
    })),
    minimumExecutions: accessUse.minimumExecutions,
    maximumExecutions: accessUse.maximumExecutions,
    coverage: accessUse.coverage,
    coverageReason: accessUse.coverageReason,
  };
}

export function runtimeExpressionAccessUseRow(
  definitionName: string | null,
  accessUse: RuntimeExpressionAccessUse,
  store: KernelStore,
  handles: boolean,
): SemanticRuntimeExpressionAccessUseRow {
  return {
    definitionName,
    ownerKind: accessUse.ownerKind,
    ...runtimeExpressionAccessUseOccurrenceRow(store, accessUse, handles),
    ...(handles
      ? {
          handles: {
            accessUseProductHandle: accessUse.productHandle,
            accessUseIdentityHandle: accessUse.identityHandle,
            ownerProductHandle: accessUse.ownerProductHandle,
            operationProductHandle: accessUse.operationProductHandle,
            expressionProductHandle: accessUse.expressionProductHandle,
            scopeProductHandle: accessUse.scopeProductHandle,
            sourceAddressHandle: accessUse.sourceAddressHandle,
            nameSourceAddressHandle: accessUse.nameSourceAddressHandle,
          },
        }
      : {}),
  };
}

export function runtimeExpressionAccessUseOccurrenceRow(
  store: KernelStore,
  accessUse: RuntimeExpressionAccessUse,
  handles: boolean = false,
): SemanticRuntimeExpressionAccessUseOccurrenceRow {
  return {
    ...runtimeExpressionAccessUseSummaryRow(store, accessUse),
    targetLinks: accessUse.targetLinks.map((target) => ({
      declarationSource: describeAddress(store, target.declarationSourceAddressHandle),
      ...(handles
        ? {
            authorityProductHandle: target.authorityProductHandle,
            targetIdentityHandle: target.targetIdentityHandle,
            targetTypeMemberHandle: target.targetTypeMemberHandle,
            targetTypeSourceMemberHandle: target.targetTypeSourceMemberHandle,
            declarationSourceAddressHandle: target.declarationSourceAddressHandle,
          }
        : {}),
    })),
    executionQualifiers: accessUse.executionQualifiers.map((qualifier) => ({
      kind: qualifier.kind,
      operationName: qualifier.operationName,
      source: describeAddress(store, qualifier.sourceAddressHandle),
      ...(handles ? { sourceAddressHandle: qualifier.sourceAddressHandle } : {}),
    })),
    source: describeAddress(store, accessUse.sourceAddressHandle),
    nameSource: describeAddress(store, accessUse.nameSourceAddressHandle),
  };
}

/** Observation products require access lineage; a missing detail is kernel corruption, not an open answer. */
export function requireRuntimeExpressionAccessUseOccurrenceRow(
  store: KernelStore,
  productHandle: ProductHandle,
  handles: boolean,
): SemanticRuntimeExpressionAccessUseOccurrenceRow {
  const accessUse = store.readProductDetail(RuntimeExpressionProductDetails.AccessUse, productHandle);
  if (accessUse == null) {
    throw new Error(`Runtime expression access-use '${productHandle}' is unavailable.`);
  }
  return runtimeExpressionAccessUseOccurrenceRow(store, accessUse, handles);
}
