import type { SourceSpan } from '../expression/source-span.js';
import { SemanticClaim } from '../kernel/claim.js';
import type {
  AddressHandle,
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
import type {
  RuntimeExpressionAccessDraft,
  RuntimeExpressionAccessPublicationDraft,
} from './runtime-expression-access-draft.js';
import {
  RuntimeBindingExpressionAccessResolution,
  type RuntimeBindingExpressionAccessContextKind,
} from './runtime-binding-expression-access-resolution.js';
import {
  RuntimeExpressionAccessOrigin,
  RuntimeExpressionAccessOwnerKind,
  RuntimeExpressionAccessUse,
  RuntimeExpressionExecutionQualifier,
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
import {
  TemplateExpressionAccessOccurrence,
} from './template-expression-access-occurrence.js';

export class TemplateExpressionAccessOccurrencePublication {
  constructor(
    readonly detail: TemplateExpressionAccessOccurrence,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

export interface TemplateExpressionAccessOccurrencePublicationInput {
  readonly store: KernelStore;
  readonly publication: KernelPublicationContext;
  readonly local: string;
  readonly expressionProductHandle: ProductHandle;
  readonly draft: RuntimeExpressionAccessDraft;
  readonly carrierSourceAddressHandle: AddressHandle | null;
}

/** Publish one parse-owned authored access token without attaching runtime execution semantics. */
export function publishTemplateExpressionAccessOccurrence(
  input: TemplateExpressionAccessOccurrencePublicationInput,
): TemplateExpressionAccessOccurrencePublication {
  const source = sourceAddressForRuntimeExpressionSpan(
    input.publication,
    `${input.local}:source`,
    input.carrierSourceAddressHandle,
    input.draft.sourceSpan,
    SourceSpanRole.Range,
  );
  const nameSource = input.draft.nameSourceSpan == null
    ? { handle: null, records: [] }
    : sourceAddressForRuntimeExpressionSpan(
        input.publication,
        `${input.local}:name`,
        input.carrierSourceAddressHandle,
        input.draft.nameSourceSpan,
        SourceSpanRole.Name,
      );
  return new TemplateExpressionAccessOccurrencePublication(
    new TemplateExpressionAccessOccurrence(
      input.store.handles.hotDetail(input.local),
      input.expressionProductHandle,
      input.draft.expression,
      input.draft.accessForm,
      source.handle,
      nameSource.handle,
    ),
    [...source.records, ...nameSource.records],
  );
}

export interface RuntimeBindingExpressionAccessResolutionPublicationInput {
  readonly store: KernelStore;
  readonly publication: KernelPublicationContext;
  readonly local: string;
  readonly bindingProductHandle: ProductHandle;
  readonly bindingIdentityHandle: IdentityHandle;
  readonly occurrence: TemplateExpressionAccessOccurrence;
  readonly contextKind: RuntimeBindingExpressionAccessContextKind;
  readonly scopeProductHandle: ProductHandle | null;
  readonly draft: RuntimeExpressionAccessDraft;
  readonly targetResolution: RuntimeExpressionAccessTargetResolution;
  readonly targetLinks: readonly RuntimeExpressionAccessTargetLink[];
}

/** Publish one binding-context target interpretation independently from runtime operation reachability. */
export function publishRuntimeBindingExpressionAccessResolution(
  input: RuntimeBindingExpressionAccessResolutionPublicationInput,
): RuntimeBindingExpressionAccessResolution {
  return new RuntimeBindingExpressionAccessResolution(
    input.store.handles.hotDetail(input.local),
    input.bindingProductHandle,
    input.bindingIdentityHandle,
    input.occurrence,
    input.contextKind,
    input.scopeProductHandle,
    input.draft.scopeLookupAncestor,
    input.draft.authoredScopeAncestor,
    input.draft.callbackScopeDepth,
    input.draft.lexicalLocal,
    input.targetResolution,
    input.targetLinks,
  );
}

export interface RuntimeExpressionAccessPublicationClaim {
  readonly localName: string;
  readonly subjectProductHandle: ProductHandle;
  readonly predicateKey: ClaimPredicateKey;
}

interface RuntimeExpressionAccessPublicationBase {
  readonly store: KernelStore;
  readonly publication: KernelPublicationContext;
  readonly local: string;
  readonly index: number;
  /** Exact data-flow, resource application, instruction, watcher, effect-plan, or computed operation product. */
  readonly operationProductHandle: ProductHandle | null;
  readonly operationKind: RuntimeExpressionOperationKind;
  readonly operationIndex: number | null;
  readonly phase: RuntimeExpressionAccessPhase;
  readonly tracking: RuntimeExpressionAccessTracking;
  readonly realization: RuntimeOperationRealization;
  readonly reachability: RuntimeOperationReachability;
  readonly draft: RuntimeExpressionAccessPublicationDraft;
  /** Owner or expression carrier used only when the parser span has no source-file identity. */
  readonly carrierSourceAddressHandle: AddressHandle | null;
  readonly provenanceHandle: ProvenanceHandle;
}

/** An operation spending an existing authored binding-context resolution. */
export interface RuntimeExpressionResolvedAccessPublicationInput extends RuntimeExpressionAccessPublicationBase {
  readonly resolution: RuntimeBindingExpressionAccessResolution;
}

/** A generated or TypeScript-backed operation with no authored binding-context resolution. */
export interface RuntimeExpressionStandaloneAccessPublicationInput extends RuntimeExpressionAccessPublicationBase {
  readonly resolution: null;
  readonly ownerKind: RuntimeExpressionAccessOwnerKind;
  readonly ownerProductHandle: ProductHandle;
  readonly ownerIdentityHandle: IdentityHandle | null;
  readonly expressionProductHandle: ProductHandle | null;
  readonly scopeProductHandle: ProductHandle | null;
  readonly targetResolution: RuntimeExpressionAccessTargetResolution;
  readonly targetLinks: readonly RuntimeExpressionAccessTargetLink[];
  readonly claims: readonly RuntimeExpressionAccessPublicationClaim[];
}

export type RuntimeExpressionAccessPublicationInput =
  | RuntimeExpressionResolvedAccessPublicationInput
  | RuntimeExpressionStandaloneAccessPublicationInput;

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

interface RuntimeExpressionAccessSourcePublicationInput {
  readonly publication: KernelPublicationContext;
  readonly local: string;
  readonly carrierSourceAddressHandle: AddressHandle | null;
}

/** Publish one owner-qualified access use without flattening source, target, or operation identity. */
export function publishRuntimeExpressionAccessUse(
  input: RuntimeExpressionAccessPublicationInput,
): RuntimeExpressionAccessPublication {
  const productHandle = input.store.handles.product(input.local);
  const identityHandle = input.store.handles.identity(input.local);
  const resolution = input.resolution;
  const authority = resolution == null
    ? {
        ownerKind: input.ownerKind,
        ownerProductHandle: input.ownerProductHandle,
        ownerIdentityHandle: input.ownerIdentityHandle,
        expressionProductHandle: input.expressionProductHandle,
        scopeProductHandle: input.scopeProductHandle,
        targetResolution: input.targetResolution,
        targetLinks: input.targetLinks,
        claims: input.claims,
      }
    : {
        ownerKind: RuntimeExpressionAccessOwnerKind.Binding,
        ownerProductHandle: resolution.bindingProductHandle,
        ownerIdentityHandle: resolution.bindingIdentityHandle,
        expressionProductHandle: resolution.expressionProductHandle,
        scopeProductHandle: resolution.scopeProductHandle,
        targetResolution: resolution.targetResolution,
        targetLinks: resolution.targetLinks,
        claims: [{
          localName: 'owner',
          subjectProductHandle: resolution.bindingProductHandle,
          predicateKey: KernelVocabulary.RuntimeExpression.RuntimeBindingUsesAccessUse.key,
        }],
      };
  const authoredSource = resolution == null
    ? publishAccessSources(input)
    : publishAccessQualifierSources(input);
  const source = resolution == null
    ? authoredSource
    : {
        ...authoredSource,
        sourceAddressHandle: resolution.sourceAddressHandle,
        nameSourceAddressHandle: resolution.nameSourceAddressHandle,
      };
  const claims = authority.claims.map((claim) => new SemanticClaim(
    input.store.handles.claim(`${input.local}:${claim.localName}`),
    claim.subjectProductHandle,
    claim.predicateKey,
    productHandle,
    input.provenanceHandle,
  ));
  const detail = new RuntimeExpressionAccessUse(
    productHandle,
    identityHandle,
    authority.ownerKind,
    authority.ownerProductHandle,
    input.operationProductHandle,
    input.operationKind,
    input.operationIndex,
    authority.expressionProductHandle,
    authority.scopeProductHandle,
    resolution?.occurrence.detailHandle ?? null,
    resolution?.detailHandle ?? null,
    resolution == null ? input.draft.origin : RuntimeExpressionAccessOrigin.Authored,
    resolution?.occurrence.accessForm ?? input.draft.accessForm,
    input.draft.role,
    input.phase,
    input.tracking,
    input.realization,
    input.reachability,
    resolution?.scopeLookupAncestor ?? input.draft.scopeLookupAncestor,
    resolution?.authoredScopeAncestor ?? input.draft.authoredScopeAncestor,
    resolution?.callbackScopeDepth ?? input.draft.callbackScopeDepth,
    resolution?.lexicalLocal ?? input.draft.lexicalLocal,
    authority.targetResolution,
    authority.targetLinks,
    input.draft.executionQualifiers.map(
      (qualifier, index) => new RuntimeExpressionExecutionQualifier(
        qualifier.kind,
        source.qualifierSourceAddressHandles[index] ?? null,
        qualifier.operationName,
      ),
    ),
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
      authority.ownerIdentityHandle,
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

function publishAccessQualifierSources(
  input: RuntimeExpressionAccessPublicationInput,
): RuntimeExpressionAccessSourcePublication {
  const records: KernelStoreRecord[] = [];
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
    sourceAddressHandle: null,
    nameSourceAddressHandle: null,
    qualifierSourceAddressHandles,
    records,
  };
}

function publishAccessSourceSpan(
  input: RuntimeExpressionAccessSourcePublicationInput,
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
