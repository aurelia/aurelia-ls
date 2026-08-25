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
  /** A source-oriented read could not select complete immutable evidence from reached invocation occurrences. */
  StaticEvaluationInvocationSourceReadOpen = 'static-evaluation-invocation-source-read-open',
  /** Static evaluation reached a classic loop statement that is not in the modeled finite-loop subset. */
  StaticEvaluationUnsupportedLoopStatement = 'static-evaluation-unsupported-loop-statement',
  /** Static evaluation reached a compound assignment before compound mutation semantics were modeled. */
  StaticEvaluationUnsupportedCompoundAssignment = 'static-evaluation-unsupported-compound-assignment',
  /** Static evaluation produced modeled abrupt control flow instead of an expression value. */
  StaticEvaluationAbruptCompletion = 'static-evaluation-abrupt-completion',
  /** Resource dependencies metadata could not be fully enumerated as static entries. */
  ResourceDefinitionDependenciesOpen = 'resource-definition-dependencies-open',
  /** One resource dependency entry did not resolve to a class, function, or registry dependency. */
  ResourceDefinitionDependencyEntryOpen = 'resource-definition-dependency-entry-open',
  /** Resource bindable metadata could not be fully converged from decorator/static/definition source. */
  ResourceBindableConfigurationOpen = 'resource-bindable-configuration-open',
  /** Resource annotation metadata could not be fully converged from decorator source. */
  ResourceAnnotationOpen = 'resource-annotation-open',
  /** Resource watch metadata could not be fully converged from decorator/static/definition source. */
  ResourceWatchOpen = 'resource-watch-open',
  /** Resource recognition could not close the class/function target named by a definition carrier. */
  ResourceDefinitionTargetOpen = 'resource-definition-target-open',
  /** Resource recognition could not close the canonical authored/runtime name of a definition carrier. */
  ResourceDefinitionNameOpen = 'resource-definition-name-open',
  /** A present resource definition field closed to a value shape that the framework metadata contract does not accept. */
  ResourceDefinitionFieldOpen = 'resource-definition-field-open',
  /** A legal framework feature exists but this semantic-runtime substrate has not modeled it yet. */
  FeatureNotYetModeled = 'feature-not-yet-modeled',
  /** Binding-command dispatch reached an executable body with no modeled lowering semantics. */
  BindingCommandExecutableBodyOpen = 'binding-command-executable-body-open',
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
  /** ObserverLocator could not close which observer or accessor implementation setup would install. */
  BindingObserverSelectionOpen = 'binding-observer-selection-open',
  /** Observer setup required a coercer or callback capability whose support could not be proven. */
  BindingObserverCapabilityOpen = 'binding-observer-capability-open',
  /** Observer setup could not prove whether authored bindable metadata requires coercion or callbacks. */
  BindingObserverRequirementOpen = 'binding-observer-requirement-open',
  /** A binding phase did not receive the target-side product required for materialization. */
  BindingTargetProductMissing = 'binding-target-product-missing',
  /** A binding phase did not receive the value-channel product required for materialization. */
  BindingValueChannelProductMissing = 'binding-value-channel-product-missing',
  /** Observer/accessor value transport semantics remained open after target selection. */
  BindingValueChannelSemanticsOpen = 'binding-value-channel-semantics-open',
  /** Binding mode could not close to a supported source/target flow direction. */
  BindingModeOpen = 'binding-mode-open',
  /** Runtime binding data flow did not receive the instruction scope required for source lookup. */
  BindingScopeOpen = 'binding-scope-open',
  /** Runtime binding data flow did not receive an evaluable authored source expression. */
  BindingExpressionOpen = 'binding-expression-open',
  /** Target-to-source data flow could not prove the runtime source assignment operation. */
  BindingSourceAssignmentOpen = 'binding-source-assignment-open',
  /** Controller creation could not obtain the runtime container required for a child controller. */
  RuntimeControllerContainerOpen = 'runtime-controller-container-open',
  /** Runtime rendering could not retrieve a compiler/runtime product referenced by the active rendering world. */
  RuntimeRenderingProductMissing = 'runtime-rendering-product-missing',
  /** Runtime rendering reached an instruction for which no modeled renderer was available. */
  RuntimeRenderingRendererUnavailable = 'runtime-rendering-renderer-unavailable',
  /** Runtime rendering could not close the container or hydration context required for nested composition. */
  RuntimeRenderingContextOpen = 'runtime-rendering-context-open',
  /** Configuration recognition could not close the configured application/container target. */
  ConfigurationTargetOpen = 'configuration-target-open',
  /** Configuration recognition could not close an authored callback or callback body. */
  ConfigurationCallbackOpen = 'configuration-callback-open',
  /** Configuration recognition could not close a required option or argument. */
  ConfigurationOptionOpen = 'configuration-option-open',
  /** TypeChecker projection produced a descriptor outside every modeled type-shape lane. */
  TypeProjectionUnclassified = 'type-projection-unclassified',
  /** One runtime-composition input retained a usable value or type while its source value remained open. */
  RuntimeCompositionInputOpen = 'runtime-composition-input-open',
  /** Runtime composition could not close custom-element candidate resolution or the composed-child handoff. */
  RuntimeCompositionComponentResolutionOpen = 'runtime-composition-component-resolution-open',
  /** An app-owned template controller's lifecycle could not close the Scope supplied to its synthetic child view. */
  TemplateControllerScopeOpen = 'template-controller-scope-open',
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
  /** Router instruction input closed to a value shape the framework does not accept. */
  RouterInstructionValueInvalid = 'router-instruction-value-invalid',
  /** Router viewport resolution could not close the viewport target. */
  RouterViewportResolutionOpen = 'router-viewport-resolution-open',
  /** An au-viewport bindable value could not close to the string semantics used by viewport matching. */
  RouterViewportValueOpen = 'router-viewport-value-open',
  /** An au-viewport lives under controller flow whose runtime presence or multiplicity is not singular. */
  RouterViewportPresenceOpen = 'router-viewport-presence-open',
  /** Router redirect materialization could not close the redirect target. */
  RouterRedirectTargetOpen = 'router-redirect-target-open',
  /** RouteConfig has an instance getRouteConfig hook whose runtime result may override pre-hook fields. */
  RouterRouteConfigDynamicHook = 'router-route-config-dynamic-hook',
  /** RouteConfig.configure syntax was observed without positive module-execution evidence. */
  RouterRouteConfigExecutionUnproven = 'router-route-config-execution-unproven',
  /** Multiple effective RouteConfig contributions could not be placed in one proven execution order. */
  RouterRouteConfigExecutionOrderOpen = 'router-route-config-execution-order-open',
  /** One or more authored RouteConfig fields could not be reduced to a closed scalar or reference. */
  RouterRouteConfigValueOpen = 'router-route-config-value-open',
  /** Recursive RouteConfig application was bounded instead of expanding an infinite effective child graph. */
  RouterRouteConfigRecursiveApplication = 'router-route-config-recursive-application',
  /** Spread hydration could not close the binding/context needed to expand spread entries. */
  SpreadHydrationContextOpen = 'spread-hydration-context-open',
  /** DI world construction could not find the target container for a registration step. */
  DiRegistrationContainerOpen = 'di-registration-container-open',
  /** DI world construction could not find the admitted registration product referenced by configuration. */
  DiRegistrationAdmissionOpen = 'di-registration-admission-open',
  /** DI world construction could not close the DI key required to publish a container slot. */
  DiRegistrationKeyOpen = 'di-registration-key-open',
  /** DI world construction reached a registration strategy that has no modeled container effect yet. */
  DiRegistrationStrategyOpen = 'di-registration-strategy-open',
  /** DI world construction could not publish a resolver or resource slot from an otherwise recognized admission. */
  DiRegistrationPublicationOpen = 'di-registration-publication-open',
  /** DI world construction reached an IRegistry body whose effects have not been interpreted. */
  DiRegistryBodyOpen = 'di-registry-body-open',
  /** DI world construction could not close resource definition facts needed to publish resource slots. */
  DiResourceSlotOpen = 'di-resource-slot-open',
  /** Registration recognition could not close the DI key expression. */
  RegistrationKeyOpen = 'registration-key-open',
  /** Registration recognition could not close the registered value expression. */
  RegistrationValueOpen = 'registration-value-open',
  /** Registration recognition could not classify a registration strategy. */
  RegistrationStrategyOpen = 'registration-strategy-open',
  /** Registration recognition reached a spread argument or spread member. */
  RegistrationSpreadOpen = 'registration-spread-open',
  /** Registration recognition could not close an alias target. */
  RegistrationAliasTargetOpen = 'registration-alias-target-open',
  /** Framework service-root recognition saw source evidence that is not positive root evidence yet. */
  FrameworkServiceRootCandidateOpen = 'framework-service-root-candidate-open',
}

/** Causal boundary family derived from typed seam reasons, never from product namespaces or prose. */
export const enum OpenSeamBoundaryKind {
  /** The current reason vocabulary proves an open fact but not one unique causal boundary yet. */
  CauseUnresolved = 'cause-unresolved',
  /** A value or module needed by analysis was absent from the modeled static environment. */
  StaticEnvironmentGap = 'static-environment-gap',
  /** Closing the fact would require executing user, host, or framework runtime behavior. */
  RuntimeExecutionBoundary = 'runtime-execution-boundary',
  /** The source is legal, but the corresponding semantic substrate is not implemented yet. */
  UnsupportedSubstrate = 'unsupported-substrate',
  /** Analysis intentionally stopped at a finite recursion, statement, or expansion guardrail. */
  AnalysisGuardrail = 'analysis-guardrail',
  /** TypeChecker-backed projection could not close a type or member surface without guessing. */
  TypeCheckerProjectionBoundary = 'type-checker-projection-boundary',
  /** Framework-shaped evidence remained open after the relevant substrate had been reached. */
  FrameworkSemanticBoundary = 'framework-semantic-boundary',
}

/** Classify one typed reason by the causal boundary that kept the product open. */
export function openSeamBoundaryKindForReason(
  reasonKind: OpenSeamReasonKind,
): OpenSeamBoundaryKind {
  switch (reasonKind) {
    case OpenSeamReasonKind.HostEnvironmentValue:
    case OpenSeamReasonKind.ExternalModuleValue:
    case OpenSeamReasonKind.StaticEvaluationIdentifierNotInEnvironment:
    case OpenSeamReasonKind.StaticEvaluationModuleNotResolved:
      return OpenSeamBoundaryKind.StaticEnvironmentGap;

    case OpenSeamReasonKind.AsyncExecutionValue:
    case OpenSeamReasonKind.StaticEvaluationDynamicCall:
    case OpenSeamReasonKind.StaticEvaluationDynamicBranch:
    case OpenSeamReasonKind.StaticEvaluationDynamicLoop:
    case OpenSeamReasonKind.StaticEvaluationDynamicMutation:
    case OpenSeamReasonKind.StaticEvaluationDynamicImport:
    case OpenSeamReasonKind.BindingSourceNeedsRuntimeValue:
    case OpenSeamReasonKind.RuntimeCompositionInputOpen:
    case OpenSeamReasonKind.RouterRouteConfigDynamicHook:
    case OpenSeamReasonKind.RouterRouteConfigExecutionUnproven:
      return OpenSeamBoundaryKind.RuntimeExecutionBoundary;

    case OpenSeamReasonKind.StaticEvaluationGuardrailLimit:
    case OpenSeamReasonKind.RouterRouteConfigRecursiveApplication:
      return OpenSeamBoundaryKind.AnalysisGuardrail;

    case OpenSeamReasonKind.StaticEvaluationUnsupportedStatement:
    case OpenSeamReasonKind.StaticEvaluationUnsupportedExpression:
    case OpenSeamReasonKind.StaticEvaluationUnsupportedBindingPattern:
    case OpenSeamReasonKind.StaticEvaluationInvocationSourceReadOpen:
    case OpenSeamReasonKind.StaticEvaluationUnsupportedLoopStatement:
    case OpenSeamReasonKind.StaticEvaluationUnsupportedCompoundAssignment:
    case OpenSeamReasonKind.FeatureNotYetModeled:
    case OpenSeamReasonKind.BindingSourceUnsupportedExpression:
    case OpenSeamReasonKind.BindingTargetProductMissing:
    case OpenSeamReasonKind.BindingValueChannelProductMissing:
    case OpenSeamReasonKind.BindingExpressionOpen:
    case OpenSeamReasonKind.BindingCommandExecutableBodyOpen:
    case OpenSeamReasonKind.RuntimeRenderingProductMissing:
    case OpenSeamReasonKind.RuntimeRenderingRendererUnavailable:
    case OpenSeamReasonKind.DiRegistrationStrategyOpen:
    case OpenSeamReasonKind.DiRegistryBodyOpen:
      return OpenSeamBoundaryKind.UnsupportedSubstrate;

    case OpenSeamReasonKind.BindingSourceTypeOpen:
    case OpenSeamReasonKind.TypeProjectionUnclassified:
      return OpenSeamBoundaryKind.TypeCheckerProjectionBoundary;

    case OpenSeamReasonKind.StaticEvaluationAbruptCompletion:
    case OpenSeamReasonKind.BindingSourceSlotNoStaticValue:
    case OpenSeamReasonKind.BindingSourceMemberNoStaticValue:
      return OpenSeamBoundaryKind.CauseUnresolved;

    case OpenSeamReasonKind.ResourceDefinitionDependenciesOpen:
    case OpenSeamReasonKind.ResourceDefinitionDependencyEntryOpen:
    case OpenSeamReasonKind.ResourceBindableConfigurationOpen:
    case OpenSeamReasonKind.ResourceAnnotationOpen:
    case OpenSeamReasonKind.ResourceWatchOpen:
    case OpenSeamReasonKind.ResourceDefinitionTargetOpen:
    case OpenSeamReasonKind.ResourceDefinitionNameOpen:
    case OpenSeamReasonKind.ResourceDefinitionFieldOpen:
    case OpenSeamReasonKind.BindingSourceResourceOpen:
    case OpenSeamReasonKind.BindingObserverSelectionOpen:
    case OpenSeamReasonKind.BindingObserverCapabilityOpen:
    case OpenSeamReasonKind.BindingObserverRequirementOpen:
    case OpenSeamReasonKind.BindingValueChannelSemanticsOpen:
    case OpenSeamReasonKind.BindingModeOpen:
    case OpenSeamReasonKind.BindingScopeOpen:
    case OpenSeamReasonKind.BindingSourceAssignmentOpen:
    case OpenSeamReasonKind.RuntimeControllerContainerOpen:
    case OpenSeamReasonKind.RuntimeRenderingContextOpen:
    case OpenSeamReasonKind.ConfigurationTargetOpen:
    case OpenSeamReasonKind.ConfigurationCallbackOpen:
    case OpenSeamReasonKind.ConfigurationOptionOpen:
    case OpenSeamReasonKind.RuntimeCompositionComponentResolutionOpen:
    case OpenSeamReasonKind.TemplateControllerScopeOpen:
    case OpenSeamReasonKind.BindingValueChannelSelectTargetOpen:
    case OpenSeamReasonKind.BindingValueChannelSelectOptionValueOpen:
    case OpenSeamReasonKind.BindingValueChannelSelectOptionDomainOpen:
    case OpenSeamReasonKind.BindingValueChannelSelectMultipleSourceOpen:
    case OpenSeamReasonKind.BindingValueChannelDynamicSelectMultiple:
    case OpenSeamReasonKind.RouterInstructionNeedsRouteContext:
    case OpenSeamReasonKind.RouterInstructionNeedsStaticValue:
    case OpenSeamReasonKind.RouterHrefExternalityOpen:
    case OpenSeamReasonKind.RouterHrefClickInterceptionDisabled:
    case OpenSeamReasonKind.RouterHrefClickInterceptionTargetOpen:
    case OpenSeamReasonKind.RouterInstructionMissingValue:
    case OpenSeamReasonKind.RouterInstructionParseFailure:
    case OpenSeamReasonKind.RouterInstructionValueInvalid:
    case OpenSeamReasonKind.RouterViewportResolutionOpen:
    case OpenSeamReasonKind.RouterViewportValueOpen:
    case OpenSeamReasonKind.RouterViewportPresenceOpen:
    case OpenSeamReasonKind.RouterRedirectTargetOpen:
    case OpenSeamReasonKind.RouterRouteConfigExecutionOrderOpen:
    case OpenSeamReasonKind.RouterRouteConfigValueOpen:
    case OpenSeamReasonKind.SpreadHydrationContextOpen:
    case OpenSeamReasonKind.DiRegistrationContainerOpen:
    case OpenSeamReasonKind.DiRegistrationAdmissionOpen:
    case OpenSeamReasonKind.DiRegistrationKeyOpen:
    case OpenSeamReasonKind.DiRegistrationPublicationOpen:
    case OpenSeamReasonKind.DiResourceSlotOpen:
    case OpenSeamReasonKind.RegistrationKeyOpen:
    case OpenSeamReasonKind.RegistrationValueOpen:
    case OpenSeamReasonKind.RegistrationStrategyOpen:
    case OpenSeamReasonKind.RegistrationSpreadOpen:
    case OpenSeamReasonKind.RegistrationAliasTargetOpen:
    case OpenSeamReasonKind.FrameworkServiceRootCandidateOpen:
      return OpenSeamBoundaryKind.FrameworkSemanticBoundary;
  }
  const exhaustiveReason: never = reasonKind;
  return exhaustiveReason;
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
    readonly addressHandle: AddressHandle | null,
    /** Optional direct evidence handle that produced the seam. */
    readonly evidenceHandle: EvidenceHandle | null,
    /** Stable machine-readable reasons that summarize the lower-level open pressure. */
    readonly reasonKinds: readonly OpenSeamReasonKind[],
    /** Optional per-reason source/evidence rows when one seam has adjacent contributing source sites. */
    readonly reasonSources: readonly OpenSeamReasonSource[] = [],
  ) {
    if (reasonKinds.length === 0) {
      throw new Error(
        `Open seam '${seamKindKey}' must retain at least one typed causal reason: ${summary}`,
      );
    }
  }
}
