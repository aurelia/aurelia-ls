import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import {
  KernelVocabulary,
  type ProductKindKey,
} from '../kernel/vocabulary.js';
import { BuiltInBindingBehaviorName } from '../resources/built-in-resources.js';
import {
  RuntimeHtmlBindingBehaviorFrameworkErrorCode,
  type RuntimeHtmlBindingBehaviorFrameworkErrorCode as RuntimeHtmlBindingBehaviorFrameworkErrorCodeValue,
  ValidationHtmlBindingBehaviorFrameworkErrorCode,
  type ValidationHtmlBindingBehaviorFrameworkErrorCode as ValidationHtmlBindingBehaviorFrameworkErrorCodeValue,
} from './framework-error-code.js';
import type {
  RuntimeBindingReference,
  RuntimeBindingTargetAccessReference,
} from './runtime-binding.js';

export const enum RuntimeBindingBehaviorApplicationPhase {
  Bind = 'bind',
}

export type RuntimeBindingBehaviorApplicationField =
  | 'binding'
  | 'targetAccess'
  | 'phase'
  | 'behaviorName'
  | 'argumentCount'
  | 'staticArgumentValues'
  | 'source';

export class RuntimeBindingBehaviorApplicationReference {
  constructor(
    readonly behaviorName: string,
    readonly productHandle: ProductHandle | null,
    readonly identityHandle: IdentityHandle | null,
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Runtime binding-behavior application over an already-rendered binding. */
export class RuntimeBindingBehaviorApplication {
  readonly productKindKey: ProductKindKey = KernelVocabulary.Binding.BehaviorApplication.key;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly binding: RuntimeBindingReference,
    readonly targetAccess: RuntimeBindingTargetAccessReference | null,
    readonly phase: RuntimeBindingBehaviorApplicationPhase,
    readonly behaviorName: string,
    readonly argumentCount: number,
    readonly staticArgumentValues: readonly string[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingBehaviorApplicationField>[] = [],
  ) {}

  toReference(): RuntimeBindingBehaviorApplicationReference {
    return new RuntimeBindingBehaviorApplicationReference(
      this.behaviorName,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

export const enum RuntimeBindingBehaviorIssuePhase {
  Bind = 'bind',
}

export const enum RuntimeBindingBehaviorIssueKind {
  SelfInvalidUsage = 'self-invalid-usage',
  SignalInvalidUsage = 'signal-invalid-usage',
  SignalNoSignals = 'signal-no-signals',
  UpdateTriggerNoTriggers = 'update-trigger-no-triggers',
  UpdateTriggerInvalidUsage = 'update-trigger-invalid-usage',
  UpdateTriggerNodePropertyNotObservable = 'update-trigger-node-property-not-observable',
  AttrInvalidBinding = 'attr-invalid-binding',
  BindingAlreadyHasRateLimited = 'binding-already-has-rate-limited',
  BindingAlreadyHasTargetSubscriber = 'binding-already-has-target-subscriber',
  ValidateInvalidBindingType = 'validate-invalid-binding-type',
  ValidateExtraneousArguments = 'validate-extraneous-arguments',
  ValidateInvalidTriggerName = 'validate-invalid-trigger-name',
  ValidateInvalidController = 'validate-invalid-controller',
  ValidateInvalidBindingTarget = 'validate-invalid-binding-target',
  ValidationControllerUnknownExpression = 'validation-controller-unknown-expression',
}

export type RuntimeBindingBehaviorFrameworkErrorCodeValue =
  | RuntimeHtmlBindingBehaviorFrameworkErrorCodeValue
  | ValidationHtmlBindingBehaviorFrameworkErrorCodeValue;

export type RuntimeBindingBehaviorIssueField =
  | 'application'
  | 'binding'
  | 'targetAccess'
  | 'phase'
  | 'issueKind'
  | 'message'
  | 'frameworkErrorCode'
  | 'source';

/** Framework-runtime issue discovered while applying a binding behavior. */
export class RuntimeBindingBehaviorIssue {
  readonly productKindKey: ProductKindKey = KernelVocabulary.Binding.BehaviorIssue.key;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly application: RuntimeBindingBehaviorApplicationReference,
    readonly binding: RuntimeBindingReference,
    readonly targetAccess: RuntimeBindingTargetAccessReference | null,
    readonly phase: RuntimeBindingBehaviorIssuePhase,
    readonly issueKind: RuntimeBindingBehaviorIssueKind,
    readonly message: string,
    readonly frameworkErrorCode: RuntimeBindingBehaviorFrameworkErrorCodeValue | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingBehaviorIssueField>[] = [],
  ) {}
}

export type UpdateTriggerBindingBehaviorBindContext = {
  readonly eventArgumentCount: number;
  readonly bindingIsPropertyBinding: boolean;
  readonly bindingAllowsTargetToSource: boolean;
  readonly hasNodeObserverConfig: boolean | null;
  readonly targetProperty: string | null;
};

export type UpdateTriggerBindingBehaviorBindIssue = {
  readonly issueKind: RuntimeBindingBehaviorIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: RuntimeHtmlBindingBehaviorFrameworkErrorCodeValue;
};

export type BuiltInBindingBehaviorBindIssue = {
  readonly issueKind: RuntimeBindingBehaviorIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: RuntimeBindingBehaviorFrameworkErrorCodeValue;
};

export type SelfBindingBehaviorBindContext = {
  readonly bindingIsListenerBinding: boolean;
};

export type SignalBindingBehaviorBindContext = {
  readonly bindingCanHandleChange: boolean;
  readonly signalArgumentCount: number;
};

export type AttrBindingBehaviorBindContext = {
  readonly bindingIsPropertyBinding: boolean;
};

export type RateLimitBindingBehaviorBindContext = {
  readonly rateLimitAlreadyApplied: boolean;
};

export const enum ValidateBindingBehaviorArgumentKind {
  Unknown = 'unknown',
  Nullish = 'nullish',
  TriggerString = 'trigger-string',
  ValidationController = 'validation-controller',
  InvalidStatic = 'invalid-static',
}

export type ValidateBindingBehaviorArgument = {
  readonly kind: ValidateBindingBehaviorArgumentKind;
  readonly value: string | null;
};

export type ValidateBindingBehaviorBindContext = {
  readonly bindingIsPropertyBinding: boolean;
  readonly targetIsNodeOrControllerViewModel: boolean | null;
  readonly argumentCount: number;
  readonly triggerArgument: ValidateBindingBehaviorArgument;
  readonly controllerArgument: ValidateBindingBehaviorArgument;
  readonly preExtraneousArgumentsCannotThrow: boolean;
};

@auLink('runtime-html:SelfBindingBehavior', { facet: 'binding-behavior-semantics' })
export class SelfBindingBehavior {
  readonly name = BuiltInBindingBehaviorName.Self;

  bind(context: SelfBindingBehaviorBindContext): BuiltInBindingBehaviorBindIssue | null {
    if (!context.bindingIsListenerBinding) {
      return {
        issueKind: RuntimeBindingBehaviorIssueKind.SelfInvalidUsage,
        message: 'self can only be applied to listener bindings created by trigger or capture commands.',
        frameworkErrorCode: RuntimeHtmlBindingBehaviorFrameworkErrorCode.SelfBehaviorInvalidUsage,
      };
    }
    return null;
  }
}

@auLink('runtime-html:SignalBindingBehavior', { facet: 'binding-behavior-semantics' })
export class SignalBindingBehavior {
  readonly name = BuiltInBindingBehaviorName.Signal;

  bind(context: SignalBindingBehaviorBindContext): BuiltInBindingBehaviorBindIssue | null {
    if (!context.bindingCanHandleChange) {
      return {
        issueKind: RuntimeBindingBehaviorIssueKind.SignalInvalidUsage,
        message: 'signal can only be applied to bindings with a handleChange callback.',
        frameworkErrorCode: RuntimeHtmlBindingBehaviorFrameworkErrorCode.SignalBehaviorInvalidUsage,
      };
    }
    if (context.signalArgumentCount === 0) {
      return {
        issueKind: RuntimeBindingBehaviorIssueKind.SignalNoSignals,
        message: 'signal requires at least one signal name argument.',
        frameworkErrorCode: RuntimeHtmlBindingBehaviorFrameworkErrorCode.SignalBehaviorNoSignals,
      };
    }
    return null;
  }
}

@auLink('runtime-html:AttrBindingBehavior', { facet: 'binding-behavior-semantics' })
export class AttrBindingBehavior {
  readonly name = BuiltInBindingBehaviorName.Attr;

  bind(context: AttrBindingBehaviorBindContext): BuiltInBindingBehaviorBindIssue | null {
    if (!context.bindingIsPropertyBinding) {
      return {
        issueKind: RuntimeBindingBehaviorIssueKind.AttrInvalidBinding,
        message: 'attr can only be applied to PropertyBinding instances.',
        frameworkErrorCode: RuntimeHtmlBindingBehaviorFrameworkErrorCode.AttrBehaviorInvalidBinding,
      };
    }
    return null;
  }
}

abstract class RateLimitBindingBehavior {
  abstract readonly name: BuiltInBindingBehaviorName.Debounce | BuiltInBindingBehaviorName.Throttle;

  bind(context: RateLimitBindingBehaviorBindContext): BuiltInBindingBehaviorBindIssue | null {
    if (context.rateLimitAlreadyApplied) {
      return {
        issueKind: RuntimeBindingBehaviorIssueKind.BindingAlreadyHasRateLimited,
        message: 'Only one rate-limiting binding behavior can be applied to the same binding.',
        frameworkErrorCode: RuntimeHtmlBindingBehaviorFrameworkErrorCode.BindingAlreadyHasRateLimited,
      };
    }
    return null;
  }
}

@auLink('runtime-html:DebounceBindingBehavior', { facet: 'binding-behavior-semantics' })
export class DebounceBindingBehavior extends RateLimitBindingBehavior {
  readonly name = BuiltInBindingBehaviorName.Debounce;
}

@auLink('runtime-html:ThrottleBindingBehavior', { facet: 'binding-behavior-semantics' })
export class ThrottleBindingBehavior extends RateLimitBindingBehavior {
  readonly name = BuiltInBindingBehaviorName.Throttle;
}

@auLink('validation-html:ValidateBindingBehavior', { facet: 'binding-behavior-semantics' })
export class ValidateBindingBehavior {
  readonly name = BuiltInBindingBehaviorName.Validate;

  bind(context: ValidateBindingBehaviorBindContext): BuiltInBindingBehaviorBindIssue | null {
    if (!context.bindingIsPropertyBinding) {
      return {
        issueKind: RuntimeBindingBehaviorIssueKind.ValidateInvalidBindingType,
        message: 'validate can only be applied to PropertyBinding instances.',
        frameworkErrorCode: ValidationHtmlBindingBehaviorFrameworkErrorCode.ValidateBindingBehaviorOnInvalidBindingType,
      };
    }
    if (context.targetIsNodeOrControllerViewModel === false) {
      return {
        issueKind: RuntimeBindingBehaviorIssueKind.ValidateInvalidBindingTarget,
        message: 'validate requires a binding target that is a platform Node or a custom-element view model.',
        frameworkErrorCode: ValidationHtmlBindingBehaviorFrameworkErrorCode.ValidateBindingBehaviorInvalidBindingTarget,
      };
    }
    const triggerIssue = this.triggerIssue(context.triggerArgument);
    if (triggerIssue != null) {
      return triggerIssue;
    }
    if (context.controllerArgument.kind === ValidateBindingBehaviorArgumentKind.InvalidStatic) {
      return {
        issueKind: RuntimeBindingBehaviorIssueKind.ValidateInvalidController,
        message: 'validate controller argument must be nullish or a ValidationController instance.',
        frameworkErrorCode: ValidationHtmlBindingBehaviorFrameworkErrorCode.ValidateBindingBehaviorInvalidController,
      };
    }
    if (context.argumentCount > 3 && context.preExtraneousArgumentsCannotThrow) {
      return {
        issueKind: RuntimeBindingBehaviorIssueKind.ValidateExtraneousArguments,
        message: 'validate accepts at most trigger, controller, and rules arguments.',
        frameworkErrorCode: ValidationHtmlBindingBehaviorFrameworkErrorCode.ValidateBindingBehaviorExtraneousArgs,
      };
    }
    return null;
  }

  private triggerIssue(argument: ValidateBindingBehaviorArgument): BuiltInBindingBehaviorBindIssue | null {
    if (argument.kind === ValidateBindingBehaviorArgumentKind.Unknown
      || argument.kind === ValidateBindingBehaviorArgumentKind.Nullish) {
      return null;
    }
    if (argument.kind === ValidateBindingBehaviorArgumentKind.TriggerString
      && validationTriggerNames.has(argument.value ?? '')) {
      return null;
    }
    return {
      issueKind: RuntimeBindingBehaviorIssueKind.ValidateInvalidTriggerName,
      message: 'validate trigger argument must be one of the ValidationTrigger names.',
      frameworkErrorCode: ValidationHtmlBindingBehaviorFrameworkErrorCode.ValidateBindingBehaviorInvalidTriggerName,
    };
  }
}

const validationTriggerNames = new Set([
  'manual',
  'blur',
  'focusout',
  'change',
  'changeOrBlur',
  'changeOrFocusout',
]);

@auLink('validation-html:ValidationController', { facet: 'validation-controller-semantics' })
export class ValidationController {
  propertyExpressionIssue(expressionKind: string | null): BuiltInBindingBehaviorBindIssue | null {
    if (expressionKind == null) {
      return null;
    }
    return {
      issueKind: RuntimeBindingBehaviorIssueKind.ValidationControllerUnknownExpression,
      message: `ValidationController cannot derive a property path from '${expressionKind}' expressions.`,
      frameworkErrorCode: ValidationHtmlBindingBehaviorFrameworkErrorCode.ValidationControllerUnknownExpression,
    };
  }
}

/**
 * Semantic-runtime model of Aurelia's UpdateTriggerBindingBehavior.bind phase.
 *
 * The runtime behavior mutates PropertyBinding's target observer after Controller.bind has selected a target. The
 * static counterpart only claims exact framework errors when the same bind-time facts are closed.
 */
@auLink('runtime-html:UpdateTriggerBindingBehavior', { facet: 'binding-behavior-semantics' })
export class UpdateTriggerBindingBehavior {
  readonly name = BuiltInBindingBehaviorName.UpdateTrigger;

  bind(context: UpdateTriggerBindingBehaviorBindContext): UpdateTriggerBindingBehaviorBindIssue | null {
    if (context.eventArgumentCount === 0) {
      return {
        issueKind: RuntimeBindingBehaviorIssueKind.UpdateTriggerNoTriggers,
        message: 'updateTrigger requires at least one event name argument.',
        frameworkErrorCode: RuntimeHtmlBindingBehaviorFrameworkErrorCode.UpdateTriggerNoTriggers,
      };
    }
    if (!context.bindingIsPropertyBinding || !context.bindingAllowsTargetToSource) {
      return {
        issueKind: RuntimeBindingBehaviorIssueKind.UpdateTriggerInvalidUsage,
        message: 'updateTrigger can only be applied to two-way or from-view PropertyBinding instances.',
        frameworkErrorCode: RuntimeHtmlBindingBehaviorFrameworkErrorCode.UpdateTriggerInvalidUsage,
      };
    }
    if (context.hasNodeObserverConfig === false) {
      return {
        issueKind: RuntimeBindingBehaviorIssueKind.UpdateTriggerNodePropertyNotObservable,
        message: `NodeObserverLocator has no event observer configuration for property '${context.targetProperty ?? 'unknown'}'.`,
        frameworkErrorCode: RuntimeHtmlBindingBehaviorFrameworkErrorCode.UpdateTriggerNodePropertyNotObservable,
      };
    }
    return null;
  }
}
