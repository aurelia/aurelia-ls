import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import type {
  ClaimPredicateKey,
} from '../kernel/vocabulary.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import {
  RuntimeExpressionAccessOwnerKind,
  type RuntimeExpressionAccessPhase,
  type RuntimeExpressionAccessTargetLink,
  type RuntimeExpressionAccessTargetResolution,
  type RuntimeExpressionAccessTracking,
  type RuntimeExpressionAccessUse,
  type RuntimeExpressionOperationKind,
} from './runtime-expression-access-use.js';
import type { RuntimeExpressionAccessPublicationDraft } from './runtime-expression-access-draft.js';
import {
  type RuntimeExpressionAccessPublication,
  publishRuntimeExpressionAccessUse,
} from './runtime-expression-access-publication.js';
import type {
  RuntimeOperationRealization,
  RuntimeOperationReachability,
} from './runtime-operation.js';

export interface RuntimeSourceAccessUseDraft extends RuntimeExpressionAccessPublicationDraft {
  readonly tracking: RuntimeExpressionAccessTracking;
  readonly targetResolution: RuntimeExpressionAccessTargetResolution;
  readonly targetLinks: readonly RuntimeExpressionAccessTargetLink[];
}

export interface RuntimeSourceAccessUsePublicationRequest {
  readonly store: KernelStore;
  readonly publication: KernelPublicationContext;
  readonly local: string;
  readonly ownerKind:
    | RuntimeExpressionAccessOwnerKind.RuntimeWatcher
    | RuntimeExpressionAccessOwnerKind.SourceEffectPlan
    | RuntimeExpressionAccessOwnerKind.ComputedObserver;
  readonly ownerProductHandle: ProductHandle;
  readonly ownerIdentityHandle: IdentityHandle;
  readonly ownerSourceAddressHandle: AddressHandle | null;
  readonly operationKind: RuntimeExpressionOperationKind;
  readonly operationIndex: number | null;
  readonly phase: RuntimeExpressionAccessPhase;
  readonly realization: RuntimeOperationRealization;
  readonly reachability: RuntimeOperationReachability;
  readonly provenanceHandle: ProvenanceHandle;
  readonly claimPredicateKey: ClaimPredicateKey;
  readonly drafts: readonly RuntimeSourceAccessUseDraft[];
}

export class RuntimeSourceAccessUsePublication {
  constructor(
    readonly accessUses: readonly RuntimeExpressionAccessUse[],
    /** Transient draft/detail pairs used to derive observation effects before publication closes. */
    readonly publications: readonly RuntimeExpressionAccessPublication[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Publish TypeScript-backed access occurrences through the same durable access-use envelope as template operations. */
export function publishRuntimeSourceAccessUses(
  request: RuntimeSourceAccessUsePublicationRequest,
): RuntimeSourceAccessUsePublication {
  const publications = request.drafts.map((draft, index) =>
    publishRuntimeExpressionAccessUse({
      store: request.store,
      publication: request.publication,
      local: `${request.local}:access:${index}`,
      index,
      ownerKind: request.ownerKind,
      ownerProductHandle: request.ownerProductHandle,
      ownerIdentityHandle: request.ownerIdentityHandle,
      operationProductHandle: null,
      expressionProductHandle: null,
      scopeProductHandle: null,
      operationKind: request.operationKind,
      operationIndex: request.operationIndex,
      phase: request.phase,
      tracking: draft.tracking,
      realization: request.realization,
      reachability: request.reachability,
      draft,
      resolution: null,
      targetResolution: draft.targetResolution,
      targetLinks: draft.targetLinks,
      carrierSourceAddressHandle: request.ownerSourceAddressHandle,
      provenanceHandle: request.provenanceHandle,
      claims: [{
        localName: 'owner',
        subjectProductHandle: request.ownerProductHandle,
        predicateKey: request.claimPredicateKey,
      }],
    })
  );
  return new RuntimeSourceAccessUsePublication(
    publications.map((publication) => publication.detail),
    publications,
    publications.flatMap((publication) => publication.records),
  );
}
