import type {
  AddressHandle,
  EvidenceHandle,
  OpenSeamHandle,
} from './handles.js';
import type { OpenSeamKindKey } from './vocabulary.js';

export const enum OpenSeamReasonKind {
  HostEnvironmentValue = 'host-environment-value',
  ExternalModuleValue = 'external-module-value',
  AsyncExecutionValue = 'async-execution-value',
  BindingSourceNeedsRuntimeValue = 'binding-source-needs-runtime-value',
  BindingSourceSlotNoStaticValue = 'binding-source-slot-no-static-value',
  BindingSourceMemberNoStaticValue = 'binding-source-member-no-static-value',
  BindingSourceUnsupportedExpression = 'binding-source-unsupported-expression',
  BindingValueChannelSelectTargetOpen = 'binding-value-channel-select-target-open',
  BindingValueChannelSelectOptionValueOpen = 'binding-value-channel-select-option-value-open',
  BindingValueChannelSelectOptionDomainOpen = 'binding-value-channel-select-option-domain-open',
  BindingValueChannelSelectMultipleSourceOpen = 'binding-value-channel-select-multiple-source-open',
  BindingValueChannelDynamicSelectMultiple = 'binding-value-channel-dynamic-select-multiple',
  RouterInstructionNeedsRouteContext = 'router-instruction-needs-route-context',
  RouterInstructionNeedsStaticValue = 'router-instruction-needs-static-value',
  RouterHrefExternalityOpen = 'router-href-externality-open',
  RouterInstructionMissingValue = 'router-instruction-missing-value',
  RouterInstructionParseFailure = 'router-instruction-parse-failure',
  RouterViewportResolutionOpen = 'router-viewport-resolution-open',
  RouterRedirectTargetOpen = 'router-redirect-target-open',
}

/** First-class unresolved point that must not disappear behind nulls or missing arrays. */
export class OpenSeam {
  /** String discriminator for serialized open-seam records. */
  readonly kind = 'open-seam' as const;

  constructor(
    /** Store-local handle for this open seam. */
    readonly handle: OpenSeamHandle,
    /** Controlled vocabulary key describing the seam category. */
    readonly seamKindKey: OpenSeamKindKey,
    /** Short explanation of what remained unresolved. */
    readonly summary: string,
    /** Optional address handle where the unresolved pressure is visible. */
    readonly addressHandle: AddressHandle | null = null,
    /** Optional direct evidence handle that produced the seam. */
    readonly evidenceHandle: EvidenceHandle | null = null,
    /** Stable machine-readable reasons that summarize the lower-level open pressure. */
    readonly reasonKinds: readonly OpenSeamReasonKind[] = [],
  ) {}
}
