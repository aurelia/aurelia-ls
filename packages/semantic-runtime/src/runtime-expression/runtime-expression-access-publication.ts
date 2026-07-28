import type { SourceSpan } from '../expression/source-span.js';
import { SemanticClaim } from '../kernel/claim.js';
import type {
  AddressHandle,
  HotDetailHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { RuntimeExpressionIdentity } from '../kernel/identity.js';
import { SourceSpanRole } from '../kernel/address.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import {
  type ClaimPredicateKey,
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import {
  sourceAddressForRuntimeExpressionSpan,
} from '../template/runtime-expression-source-address.js';
import type { RuntimeExpressionAccessPublicationDraft } from './runtime-expression-access-draft.js';
import {
  RuntimeExpressionAccessUse,
  RuntimeExpressionExecutionQualifier,
  type RuntimeExpressionAccessOwnerKind,
  type RuntimeExpressionAccessPhase,
  type RuntimeExpressionAccessTargetLink,
  type RuntimeExpressionAccessTargetResolution,
  type RuntimeExpressionAccessTracking,
  type RuntimeExpressionOperationKind,
} from './runtime-expression-access-use.js';
import type {
  RuntimeOperationRealization,
  RuntimeOperationReachability,
} from './runtime-operation.js';

export interface RuntimeExpressionAccessPublicationClaim {
  readonly localName: string;
  readonly subjectProductHandle: ProductHandle;
  readonly predicateKey: ClaimPredicateKey;
}

export interface RuntimeExpressionAccessPublicationInput {
  readonly store: KernelStore;
  readonly publication: KernelPublicationContext;
  readonly local: string;
  readonly index: number;
  readonly ownerKind: RuntimeExpressionAccessOwnerKind;
  readonly ownerProductHandle: ProductHandle;
  readonly ownerIdentityHandle: IdentityHandle | null;
  /** Exact data-flow, resource application, instruction, watcher, effect-plan, or computed operation product. */
  readonly operationProductHandle: ProductHandle | null;
  readonly expressionProductHandle: ProductHandle | null;
  readonly scopeProductHandle: ProductHandle | null;
  readonly operationKind: RuntimeExpressionOperationKind;
  readonly operationIndex: number | null;
  readonly phase: RuntimeExpressionAccessPhase;
  readonly tracking: RuntimeExpressionAccessTracking;
  readonly realization: RuntimeOperationRealization;
  readonly reachability: RuntimeOperationReachability;
  readonly draft: RuntimeExpressionAccessPublicationDraft;
  readonly targetResolution: RuntimeExpressionAccessTargetResolution;
  readonly targetLinks: readonly RuntimeExpressionAccessTargetLink[];
  /** Owner or expression carrier used only when the parser span has no source-file identity. */
  readonly carrierSourceAddressHandle: AddressHandle | null;
  readonly provenanceHandle: ProvenanceHandle;
  readonly claims: readonly RuntimeExpressionAccessPublicationClaim[];
}

export class RuntimeExpressionAccessPublication {
  constructor(
    readonly detail: RuntimeExpressionAccessUse,
    /** Transient source occurrence retained until observation effects have been derived. */
    readonly draft: RuntimeExpressionAccessPublicationDraft,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

interface RuntimeExpressionAccessSourcePublication {
  readonly sourceAddressHandle: AddressHandle | null;
  readonly nameSourceAddressHandle: AddressHandle | null;
  readonly qualifierSourceAddressHandles: readonly (AddressHandle | null)[];
  readonly records: readonly KernelStoreRecord[];
}

/** Publish one owner-qualified access use without flattening source, target, or operation identity. */
export function publishRuntimeExpressionAccessUse(
  input: RuntimeExpressionAccessPublicationInput,
): RuntimeExpressionAccessPublication {
  const productHandle = input.store.handles.product(input.local);
  const identityHandle = input.store.handles.identity(input.local);
  const source = publishAccessSources(input);
  const claims = input.claims.map((claim) => new SemanticClaim(
    input.store.handles.claim(`${input.local}:${claim.localName}`),
    claim.subjectProductHandle,
    claim.predicateKey,
    productHandle,
    input.provenanceHandle,
  ));
  const detail = new RuntimeExpressionAccessUse(
    productHandle,
    identityHandle,
    input.ownerKind,
    input.ownerProductHandle,
    input.operationProductHandle,
    input.operationKind,
    input.operationIndex,
    input.expressionProductHandle,
    input.scopeProductHandle,
    input.draft.origin,
    input.draft.accessForm,
    input.draft.role,
    input.phase,
    input.tracking,
    input.realization,
    input.reachability,
    input.draft.scopeLookupAncestor,
    input.draft.authoredScopeAncestor,
    input.draft.callbackScopeDepth,
    input.draft.lexicalLocal,
    input.targetResolution,
    input.targetLinks,
    input.draft.executionQualifiers.map((qualifier, index) => new RuntimeExpressionExecutionQualifier(
      qualifier.kind,
      source.qualifierSourceAddressHandles[index] ?? null,
      qualifier.operationName,
    )),
    input.draft.minimumExecutions,
    input.draft.maximumExecutions,
    input.draft.coverage,
    input.draft.coverageReason,
    source.sourceAddressHandle,
    source.nameSourceAddressHandle,
  );
  return new RuntimeExpressionAccessPublication(detail, input.draft, [
    ...source.records,
    new RuntimeExpressionIdentity(
      identityHandle,
      KernelVocabulary.RuntimeExpression.AccessUse.key,
      input.ownerIdentityHandle,
      source.sourceAddressHandle,
      runtimeExpressionAccessIdentityLocalName(input),
    ),
    new MaterializedProduct(
      productHandle,
      KernelVocabulary.RuntimeExpression.AccessUse.key,
      identityHandle,
      source.sourceAddressHandle,
      input.provenanceHandle,
    ),
    ...claims,
    new MaterializationRecord(
      input.store.handles.materialization(input.local),
      identityHandle,
      [productHandle],
      claims.map((claim) => claim.handle),
    ),
  ]);
}

function publishAccessSources(
  input: RuntimeExpressionAccessPublicationInput,
): RuntimeExpressionAccessSourcePublication {
  const records: KernelStoreRecord[] = [];
  const source = publishAccessSourceSpan(
    input,
    input.draft.sourceSpan,
    'source',
    SourceSpanRole.Range,
    true,
  );
  records.push(...source.records);
  const nameSource = publishAccessSourceSpan(
    input,
    input.draft.nameSourceSpan,
    'name',
    SourceSpanRole.Name,
    false,
  );
  records.push(...nameSource.records);
  const qualifierSourceAddressHandles = input.draft.executionQualifiers.map((qualifier, index) => {
    const qualifierSource = publishAccessSourceSpan(
      input,
      qualifier.sourceSpan,
      `qualifier:${index}`,
      SourceSpanRole.Range,
      false,
    );
    records.push(...qualifierSource.records);
    return qualifierSource.handle;
  });
  return {
    sourceAddressHandle: source.handle,
    nameSourceAddressHandle: nameSource.handle,
    qualifierSourceAddressHandles,
    records,
  };
}

function publishAccessSourceSpan(
  input: RuntimeExpressionAccessPublicationInput,
  span: SourceSpan | null,
  suffix: string,
  role: SourceSpanRole,
  fallbackToCarrier: boolean,
): { readonly handle: AddressHandle | null; readonly records: readonly KernelStoreRecord[] } {
  return span == null
    ? { handle: fallbackToCarrier ? input.carrierSourceAddressHandle : null, records: [] }
    : sourceAddressForRuntimeExpressionSpan(
        input.publication,
        `${input.local}:${suffix}`,
        input.carrierSourceAddressHandle,
        span,
        role,
      );
}

function runtimeExpressionAccessIdentityLocalName(
  input: RuntimeExpressionAccessPublicationInput,
): string {
  const operationIndex = input.operationIndex == null ? '' : `:${input.operationIndex}`;
  return `${input.operationKind}${operationIndex}:access:${input.index}`;
}
