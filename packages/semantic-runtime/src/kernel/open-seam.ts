import type {
  AddressHandle,
  EvidenceHandle,
  OpenSeamHandle,
} from './handles.js';
import type { OpenSeamKindKey } from './vocabulary.js';

export const enum OpenSeamReasonKind {
  /** Static evaluation reached a value supplied by browser, Node, bundler, or other host environment state. */
  HostEnvironmentValue = 'host-environment-value',
  /** Static evaluation reached a package/module boundary outside the local authored source graph. */
  ExternalModuleValue = 'external-module-value',
  /** Static evaluation reached a value produced by async execution outside the synchronous analysis turn. */
  AsyncExecutionValue = 'async-execution-value',
  /** Static evaluation stopped at an explicit recursion, statement, or analysis budget guardrail. */
  StaticEvaluationGuardrailLimit = 'static-evaluation-guardrail-limit',
  /** Static evaluation reached a legal statement shape it does not model yet. */
  StaticEvaluationUnsupportedStatement = 'static-evaluation-unsupported-statement',
  /** Static evaluation reached a legal expression shape it does not model yet. */
  StaticEvaluationUnsupportedExpression = 'static-evaluation-unsupported-expression',
  /** Static evaluation reached a binding pattern shape it cannot represent in its environment record. */
  StaticEvaluationUnsupportedBindingPattern = 'static-evaluation-unsupported-binding-pattern',
  /** Static evaluation could not find an identifier in the current modeled environment. */
  StaticEvaluationIdentifierNotInEnvironment = 'static-evaluation-identifier-not-in-environment',
  /** Static evaluation could not resolve a module specifier into the local source graph. */
  StaticEvaluationModuleNotResolved = 'static-evaluation-module-not-resolved',
  /** Static evaluation reached a call whose target or receiver required runtime execution. */
  StaticEvaluationDynamicCall = 'static-evaluation-dynamic-call',
  /** Static evaluation reached a branch condition that required runtime execution. */
  StaticEvaluationDynamicBranch = 'static-evaluation-dynamic-branch',
  /** Static evaluation reached a loop shape or iteration source that required runtime execution. */
  StaticEvaluationDynamicLoop = 'static-evaluation-dynamic-loop',
  /** Static evaluation reached a mutation it could not represent without executing runtime behavior. */
  StaticEvaluationDynamicMutation = 'static-evaluation-dynamic-mutation',
  /** Static evaluation reached a dynamic import or non-literal import edge. */
  StaticEvaluationDynamicImport = 'static-evaluation-dynamic-import',
  /** Static evaluation reached a classic loop statement that is not in the modeled finite-loop subset. */
  StaticEvaluationUnsupportedLoopStatement = 'static-evaluation-unsupported-loop-statement',
  /** Static evaluation reached a compound assignment before compound mutation semantics were modeled. */
  StaticEvaluationUnsupportedCompoundAssignment = 'static-evaluation-unsupported-compound-assignment',
  /** Resource dependencies metadata could not be fully enumerated as static entries. */
  ResourceDefinitionDependenciesOpen = 'resource-definition-dependencies-open',
  /** One resource dependency entry did not resolve to a class, function, or registry dependency. */
  ResourceDefinitionDependencyEntryOpen = 'resource-definition-dependency-entry-open',
  /** Binding-source value evaluation needs runtime binding state rather than a static source value. */
  BindingSourceNeedsRuntimeValue = 'binding-source-needs-runtime-value',
  /** Binding-source lookup found a scope slot whose static value is not available. */
  BindingSourceSlotNoStaticValue = 'binding-source-slot-no-static-value',
  /** Binding-source member lookup found a member whose static value is not available. */
  BindingSourceMemberNoStaticValue = 'binding-source-member-no-static-value',
  /** Binding-source value evaluation reached an expression form it does not model yet. */
  BindingSourceUnsupportedExpression = 'binding-source-unsupported-expression',
  /** Binding-source projection could not close a source type surface without guessing. */
  BindingSourceTypeOpen = 'binding-source-type-open',
  /** Binding-source projection could not close a referenced resource surface without guessing. */
  BindingSourceResourceOpen = 'binding-source-resource-open',
  /** Select value-channel analysis could not close the authored select target. */
  BindingValueChannelSelectTargetOpen = 'binding-value-channel-select-target-open',
  /** Select value-channel analysis could not close option value/model facts. */
  BindingValueChannelSelectOptionValueOpen = 'binding-value-channel-select-option-value-open',
  /** Select value-channel analysis could not close the option value domain. */
  BindingValueChannelSelectOptionDomainOpen = 'binding-value-channel-select-option-domain-open',
  /** Multiple-select value-channel analysis could not close a compatible collection source. */
  BindingValueChannelSelectMultipleSourceOpen = 'binding-value-channel-select-multiple-source-open',
  /** Select value-channel analysis reached a dynamic single/multiple mode mix. */
  BindingValueChannelDynamicSelectMultiple = 'binding-value-channel-dynamic-select-multiple',
  /** Router instruction materialization needed a route context that was not available. */
  RouterInstructionNeedsRouteContext = 'router-instruction-needs-route-context',
  /** Router instruction materialization needed a static value that did not close. */
  RouterInstructionNeedsStaticValue = 'router-instruction-needs-static-value',
  /** Router href analysis could not decide whether a href is external or app-routed. */
  RouterHrefExternalityOpen = 'router-href-externality-open',
  /** Router href analysis found click interception disabled for the authored link. */
  RouterHrefClickInterceptionDisabled = 'router-href-click-interception-disabled',
  /** Router href click interception could not close the routed target. */
  RouterHrefClickInterceptionTargetOpen = 'router-href-click-interception-target-open',
  /** Router instruction materialization did not receive a required instruction value. */
  RouterInstructionMissingValue = 'router-instruction-missing-value',
  /** Router instruction parsing could not parse the authored instruction value. */
  RouterInstructionParseFailure = 'router-instruction-parse-failure',
  /** Router viewport resolution could not close the viewport target. */
  RouterViewportResolutionOpen = 'router-viewport-resolution-open',
  /** Router redirect materialization could not close the redirect target. */
  RouterRedirectTargetOpen = 'router-redirect-target-open',
  /** Spread hydration could not close the binding/context needed to expand spread entries. */
  SpreadHydrationContextOpen = 'spread-hydration-context-open',
}

export interface OpenSeamReasonSource {
  readonly reasonKind: OpenSeamReasonKind | `${OpenSeamReasonKind}`;
  readonly summary: string;
  readonly addressHandle: AddressHandle | null;
  readonly evidenceHandle?: EvidenceHandle | null;
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
    /** Optional per-reason source/evidence rows when one seam has adjacent contributing source sites. */
    readonly reasonSources: readonly OpenSeamReasonSource[] = [],
  ) {}
}
