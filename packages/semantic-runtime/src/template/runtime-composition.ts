import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import { auLink } from '../kernel/au-link.js';
import type { ControllerReference } from '../configuration/controller.js';
import type { RuntimeBindingReference } from './runtime-binding.js';
import type { OpenSeamReasonKind } from '../kernel/open-seam.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';
import type { EvaluationPromiseSettlementKind } from '../evaluation/values.js';

export const enum CompositionComponentResolutionKind {
  /** `component` resolved from a statically evaluated constructable or resource name. */
  StaticValue = 'static-value',
  /** `component` resolved from TypeChecker-visible constructable candidates when value evaluation stayed open. */
  TypeCandidate = 'type-candidate',
  /** `component` is a non-resource object view-model; template association may still be separate. */
  ObjectViewModel = 'object-view-model',
  /** `template`-only composition; component activation does not participate. */
  TemplateOnly = 'template-only',
  /** The thenable `component` input is known to reject before composition can select a component. */
  Rejected = 'rejected',
  /** The composition input was present but could not be reduced to a modeled runtime branch. */
  Open = 'open',
}

export const enum CompositionComponentCandidateCoverageKind {
  /** Component resolution did not use a TypeChecker candidate set. */
  NotApplicable = 'not-applicable',
  /** Every member of a finite exact named-class basis resolved to at least one custom-element definition. */
  Complete = 'complete',
  /** Useful resource identities were retained, but the candidate basis or its resource mapping was not exhaustive. */
  Partial = 'partial',
  /** No useful custom-element identity could be retained from the open TypeChecker shape. */
  Open = 'open',
}

export const enum CompositionModelResolutionKind {
  /** No `model` input was supplied. */
  Absent = 'absent',
  /** `model` reduced to a static evaluator value. */
  StaticValue = 'static-value',
  /** `model` is visible by type but still needs runtime value identity. */
  TypeVisible = 'type-visible',
  /** The model binding could not be evaluated or typed precisely enough. */
  Open = 'open',
}

export const enum CompositionInputConsumptionKind {
  /** The input was not supplied. */
  Absent = 'absent',
  /** The framework consumes the input value directly without thenable assimilation. */
  Direct = 'direct',
  /** The framework accepts a direct value or awaits a thenable before consuming the input. */
  AwaitThenable = 'await-thenable',
}

export const enum CompositionInputValueStateKind {
  /** The input was not supplied. */
  Absent = 'absent',
  /** A direct input value is statically closed. */
  Closed = 'closed',
  /** A thenable input is known to fulfill with closed value evidence. */
  Fulfilled = 'fulfilled',
  /** A thenable input is known to reject. */
  Rejected = 'rejected',
  /** The input value, thenable settlement, or fulfillment evidence remains open. */
  Open = 'open',
}

export const enum CompositionRenderingContextKind {
  /** Composition was materialized in the compiler resource that owns its authored instruction. */
  DefinitionResource = 'definition-resource',
  /** Composition was materialized while a parent resource recursively rendered the authored instruction. */
  RecursiveResourceInstance = 'recursive-resource-instance',
}

export const enum CompositionActivateMethodKind {
  /** Candidate view model exposes a callable `activate` method. */
  Present = 'present',
  /** Candidate view model does not expose `activate`; AuCompose simply skips the model handoff. */
  Absent = 'absent',
  /** Candidate view model exposes `activate`, but its closed TypeScript contract is non-callable. */
  NonCallable = 'non-callable',
  /** The target type was not precise enough to decide whether `activate` exists or is callable. */
  Open = 'open',
}

export const enum CompositionActivationModelHandoffKind {
  /** Candidate has no `activate`; framework runtime has no model lifecycle handoff to type-check. */
  ActivateAbsent = 'activate-absent',
  /** Candidate has a closed non-callable `activate` contract; initial AuCompose composition would throw. */
  ActivateNonCallable = 'activate-non-callable',
  /** Candidate has `activate()` with no first parameter. */
  ParameterlessActivate = 'parameterless-activate',
  /** Candidate has `activate(model)`, but the host did not supply a model binding. */
  ModelAbsent = 'model-absent',
  /** Candidate has `activate(model)` and the model binding type is assignable to the first parameter. */
  ModelAssignable = 'model-assignable',
  /** Candidate has `activate(model)`, but the model binding type is not assignable to the first parameter. */
  ModelUnassignable = 'model-unassignable',
  /** Candidate has `activate(model)`, but the model binding type remains open. */
  ModelTypeOpen = 'model-type-open',
  /** Candidate has an `activate` property, but its callable parameter type remains open. */
  ActivationParameterOpen = 'activation-parameter-open',
  /** Candidate target type was not precise enough to classify the lifecycle handoff. */
  Open = 'open',
}

export class CompositionActivationModelHandoff {
  constructor(
    /** Whether the resolved view model exposes a callable `activate` method. */
    readonly methodKind: CompositionActivateMethodKind | `${CompositionActivateMethodKind}`,
    /** Handoff classification for AuCompose `comp.activate?.(model)` and `update(model)`. */
    readonly handoffKind: CompositionActivationModelHandoffKind | `${CompositionActivationModelHandoffKind}`,
    /** First `activate` parameter type, when one exists and was projected. */
    readonly activationParameterType: CheckerTypeReference | null,
    /** Model binding source type at the `<au-compose model.bind>` site, when visible. */
    readonly modelType: CheckerTypeReference | null,
    /** Checker answer for `model -> activate(parameter)` assignability, when both sides share a checker epoch. */
    readonly modelAssignableToParameter: boolean | null,
    /** Why the handoff remained open, if it did. */
    readonly openReason: string | null,
  ) {}
}

export class CompositionResolvedComponent {
  constructor(
    /** Custom-element definition product resolved for this composition branch. */
    readonly definitionProductHandle: ProductHandle,
    /** Custom-element resource name. */
    readonly name: string,
    /** TypeScript class name, when known. */
    readonly className: string | null,
    /** Compiled template product available for recursive rendering, when the project compiled it. */
    readonly compiledTemplateProductHandle: ProductHandle | null,
    /** Aggregate runtime controller created by AuCompose.compose for a closed custom-element branch, when modeled. */
    readonly composedController: ControllerReference | null,
    /** How this candidate was reached. */
    readonly resolutionKind: CompositionComponentResolutionKind | `${CompositionComponentResolutionKind}`,
    /** Lifecycle/model handoff for this component branch. */
    readonly activationModelHandoff: CompositionActivationModelHandoff,
  ) {}
}

export class CompositionContextReference {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

@auLink('runtime-html:CompositionContext')
export class CompositionContext {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    /** Runtime au-compose controller whose bindable inputs produced this context. */
    readonly hostControllerProductHandle: ProductHandle,
    /** Rendering parent controller whose scope/container are used by AuCompose. */
    readonly parentControllerProductHandle: ProductHandle | null,
    /** HydrateElementInstruction for the `<au-compose>` element. */
    readonly instructionProductHandle: ProductHandle | null,
    readonly staticTemplate: string | null,
    readonly staticComponent: string | null,
    readonly staticModel: string | null,
    readonly templateInputConsumptionKind: CompositionInputConsumptionKind | `${CompositionInputConsumptionKind}`,
    readonly templateInputValueStateKind: CompositionInputValueStateKind | `${CompositionInputValueStateKind}`,
    /** Evaluator Promise settlement for the framework-awaited template input, when it is known to be a Promise. */
    readonly templateInputSettlementKind: EvaluationPromiseSettlementKind | `${EvaluationPromiseSettlementKind}` | null,
    /** Type consumed after thenable assimilation, when the template binding has a checker-visible source type. */
    readonly templateInputType: CheckerTypeReference | null,
    /** Loaded template string when static evaluation proves the value consumed by AuCompose. */
    readonly resolvedTemplate: string | null,
    readonly componentInputConsumptionKind: CompositionInputConsumptionKind | `${CompositionInputConsumptionKind}`,
    readonly componentInputValueStateKind: CompositionInputValueStateKind | `${CompositionInputValueStateKind}`,
    /** Evaluator Promise settlement for the framework-awaited component input, when it is known to be a Promise. */
    readonly componentInputSettlementKind: EvaluationPromiseSettlementKind | `${EvaluationPromiseSettlementKind}` | null,
    /** Type consumed after thenable assimilation, when the component binding has a checker-visible source type. */
    readonly componentInputType: CheckerTypeReference | null,
    readonly modelInputConsumptionKind: CompositionInputConsumptionKind | `${CompositionInputConsumptionKind}`,
    readonly modelInputValueStateKind: CompositionInputValueStateKind | `${CompositionInputValueStateKind}`,
    readonly scopeBehaviorInputConsumptionKind: CompositionInputConsumptionKind | `${CompositionInputConsumptionKind}`,
    readonly scopeBehaviorInputValueStateKind: CompositionInputValueStateKind | `${CompositionInputValueStateKind}`,
    readonly tagInputConsumptionKind: CompositionInputConsumptionKind | `${CompositionInputConsumptionKind}`,
    readonly tagInputValueStateKind: CompositionInputValueStateKind | `${CompositionInputValueStateKind}`,
    readonly flushModeInputConsumptionKind: CompositionInputConsumptionKind | `${CompositionInputConsumptionKind}`,
    readonly flushModeInputValueStateKind: CompositionInputValueStateKind | `${CompositionInputValueStateKind}`,
    readonly templateBinding: RuntimeBindingReference | null,
    readonly componentBinding: RuntimeBindingReference | null,
    readonly modelBinding: RuntimeBindingReference | null,
    readonly scopeBehaviorBinding: RuntimeBindingReference | null,
    readonly tagBinding: RuntimeBindingReference | null,
    readonly flushModeBinding: RuntimeBindingReference | null,
    readonly composingBinding: RuntimeBindingReference | null,
    readonly compositionBinding: RuntimeBindingReference | null,
    readonly templateExpressionProductHandle: ProductHandle | null,
    readonly componentExpressionProductHandle: ProductHandle | null,
    readonly modelExpressionProductHandle: ProductHandle | null,
    /** Effective `scopeBehavior` value when static or defaulted; dynamic/open values stay null. */
    readonly scopeBehavior: 'auto' | 'scoped' | null,
    /** Effective `flushMode` value when static or defaulted; dynamic/open values stay null. */
    readonly flushMode: 'sync' | 'async' | null,
    /** Effective non-custom-element host tag when static; null means containerless/default or dynamic/open. */
    readonly tag: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}

  toReference(): CompositionContextReference {
    return new CompositionContextReference(
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

@auLink('runtime-html:ICompositionController')
@auLink('runtime-html:CompositionController')
export class CompositionController {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly context: CompositionContextReference,
    /** Runtime au-compose controller that owns the composition property. */
    readonly hostControllerProductHandle: ProductHandle,
    /** Parent rendering controller used for activation scope handoff. */
    readonly parentControllerProductHandle: ProductHandle | null,
    /** Whether this row came from the instruction owner's own analysis or a recursive parent render. */
    readonly renderingContextKind: CompositionRenderingContextKind | `${CompositionRenderingContextKind}`,
    readonly componentResolutionKind: CompositionComponentResolutionKind | `${CompositionComponentResolutionKind}`,
    /** Completeness of the TypeChecker candidate set when `componentResolutionKind` is `type-candidate`. */
    readonly componentCandidateCoverageKind: CompositionComponentCandidateCoverageKind | `${CompositionComponentCandidateCoverageKind}`,
    readonly modelResolutionKind: CompositionModelResolutionKind | `${CompositionModelResolutionKind}`,
    readonly resolvedComponents: readonly CompositionResolvedComponent[],
    readonly objectViewModelActivationHandoff: CompositionActivationModelHandoff | null,
    readonly openReason: string | null,
    readonly openReasonKinds: readonly OpenSeamReasonKind[],
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}
