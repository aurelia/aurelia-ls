import type { KernelStore } from '../kernel/store.js';
import {
  AttributeBinding,
  ContentBinding,
  LetBinding,
  ListenerBinding,
  PropertyBinding,
  RefBinding,
  SpreadValueBinding,
  StateDispatchBinding,
  RuntimeBindingTargetAccessStrategy,
  type RuntimeBindingSourceOperation,
  type RuntimeBindingTargetAccess,
  type RuntimeBindingTargetOperation,
} from '../template/runtime-binding.js';
import type { CheckerTypeProjector } from '../type-system/checker-projector.js';
import type {
  BindingSourceTypeReader,
  BindingValueChannelDraftContext,
  RuntimeBindingValueChannelDraft,
  RuntimeValueChannelBinding,
} from './binding-value-channel-draft-types.js';
import {
  RuntimeBindingValueChannelAuthority,
  RuntimeBindingValueChannelKind,
} from './runtime-binding-observation.js';
import {
  BuiltInTemplateControllerFlowKind,
  type BuiltInTemplateControllerSemantics,
} from '../template/template-controller-semantics.js';
import { CheckedObserverChannelDrafts } from './checked-observer-channel-drafts.js';
import { DirectBindingValueChannelDrafts } from './direct-binding-value-channel-drafts.js';
import { RuntimeBindingValueChannelDraftSupport } from './binding-value-channel-draft-support.js';
import { SelectValueObserverChannelDrafts } from './select-value-observer-channel-drafts.js';

export type {
  BindingSourceTypeReader,
  BindingValueChannelDraftContext,
  BindingValueExpression,
  CheckedSourceShape,
  RuntimeBindingValueChannelDraft,
  RuntimeValueChannelBinding,
  SelectMultipleMode,
} from './binding-value-channel-draft-types.js';

class RuntimeBindingValueChannelDraftFrame {
  private readonly readSourceType: BindingSourceTypeReader;

  constructor(
    private readonly support: RuntimeBindingValueChannelDraftSupport,
    private readonly directBinding: DirectBindingValueChannelDrafts,
    private readonly selectObserver: SelectValueObserverChannelDrafts,
    private readonly checkedObserver: CheckedObserverChannelDrafts,
    private readonly local: string,
    private readonly binding: RuntimeValueChannelBinding,
    private readonly targetAccess: RuntimeBindingTargetAccess | null,
    private readonly targetOperation: RuntimeBindingTargetOperation | null,
    private readonly sourceOperation: RuntimeBindingSourceOperation | null,
    private readonly context: BindingValueChannelDraftContext,
  ) {
    this.readSourceType = support.sourceTypeReaderForBinding(
      binding,
      context,
      targetAccess?.targetProperty ?? null,
    );
  }

  read(): RuntimeBindingValueChannelDraft {
    if (this.binding instanceof RefBinding || this.binding instanceof StateDispatchBinding) {
      return this.directBinding.valueChannelDraftForSourceOperation(this.sourceOperation, this.readSourceType);
    }
    if (this.binding instanceof SpreadValueBinding && this.targetAccess == null) {
      return this.openSpreadBindingWithoutClosedBindable();
    }
    if (
      this.binding instanceof AttributeBinding
      || this.binding instanceof ContentBinding
      || this.binding instanceof LetBinding
      || this.binding instanceof ListenerBinding
    ) {
      return this.directBinding.valueChannelDraftForTargetOperation(
        this.local,
        this.targetOperation,
        this.readSourceType,
        this.context,
      );
    }
    if (this.targetAccess == null) {
      return this.openMissingTargetAccess();
    }
    if (this.targetAccess.openReason != null) {
      return this.openTargetAccess();
    }
    if (this.targetAccess.frameworkErrorCode != null) {
      return this.rejectedTargetAccess();
    }
    return this.closedTargetAccessDraft();
  }

  private closedTargetAccessDraft(): RuntimeBindingValueChannelDraft {
    const targetAccess = this.targetAccess!;
    const customMatcher = this.directBinding.customMatcherFunctionValueChannelDraft(
      this.local,
      targetAccess,
      this.readSourceType,
    );
    if (customMatcher != null) {
      return customMatcher;
    }
    switch (targetAccess.strategy) {
      case RuntimeBindingTargetAccessStrategy.ClassAttributeAccessor:
        return this.directBinding.classValueChannelDraft(this.binding, targetAccess, this.readSourceType);
      case RuntimeBindingTargetAccessStrategy.StyleAttributeAccessor:
        return this.directBinding.styleValueChannelDraft(this.binding, targetAccess, this.readSourceType);
      case RuntimeBindingTargetAccessStrategy.AttributeNSAccessor:
      case RuntimeBindingTargetAccessStrategy.DataAttributeAccessor:
        return this.directBinding.attributeValueChannelDraft(this.readSourceType, targetAccess);
      case RuntimeBindingTargetAccessStrategy.SelectValueObserver:
        return this.selectValueObserverDraft(targetAccess);
      case RuntimeBindingTargetAccessStrategy.CheckedObserver:
        return this.checkedObserverDraft(targetAccess);
      default:
        return this.templateControllerValueChannelDraft(targetAccess)
          ?? this.rawPropertyValueChannelDraft(targetAccess);
    }
  }

  private rawPropertyValueChannelDraft(targetAccess: RuntimeBindingTargetAccess): RuntimeBindingValueChannelDraft {
    const elementModel = this.directBinding.elementModelValueChannelDraft(targetAccess, this.readSourceType);
    if (elementModel != null) {
      return elementModel;
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.RawProperty,
      authority: RuntimeBindingValueChannelAuthority.TargetAccess,
      runtimeValueType: this.support.types.targetAccessRuntimeInputType(`${this.local}:target-access-input`, targetAccess),
      valueDomain: [],
      isCollection: null,
      openReason: null,
    };
  }

  private templateControllerValueChannelDraft(targetAccess: RuntimeBindingTargetAccess): RuntimeBindingValueChannelDraft | null {
    const semantics = this.support.templateControllerSemanticsForTargetAccess(targetAccess, this.context);
    if (semantics == null || semantics.valueProperty !== targetAccess.targetProperty) {
      return null;
    }
    const channelKind = templateControllerValueChannelKind(semantics);
    if (channelKind === RuntimeBindingValueChannelKind.RawProperty) {
      return null;
    }
    const sourceType = this.readSourceType();
    const runtimeValueType = this.templateControllerRuntimeValueType(semantics, targetAccess, sourceType);
    return {
      channelKind,
      authority: sourceType == null
        && runtimeValueType == null
        ? RuntimeBindingValueChannelAuthority.TargetAccess
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: runtimeValueType ?? this.support.types.targetAccessRuntimeInputType(`${this.local}:template-controller-input`, targetAccess),
      valueDomain: [],
      isCollection: null,
      openReason: null,
    };
  }

  private templateControllerRuntimeValueType(
    semantics: BuiltInTemplateControllerSemantics,
    targetAccess: RuntimeBindingTargetAccess,
    sourceType: ReturnType<BindingSourceTypeReader>,
  ): ReturnType<BindingSourceTypeReader> {
    if (semantics.flowKind === BuiltInTemplateControllerFlowKind.PromiseFulfilled) {
      return this.support.promiseFulfilledValueTypeForTemplateControllerBranch(
        this.local,
        targetAccess,
        this.context,
      ) ?? sourceType;
    }
    return sourceType;
  }

  private selectValueObserverDraft(targetAccess: RuntimeBindingTargetAccess): RuntimeBindingValueChannelDraft {
    if (!(this.binding instanceof PropertyBinding)) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: null,
        openReason: 'SelectValueObserver value-channel materialization expected a runtime PropertyBinding product.',
      };
    }
    return this.selectObserver.valueChannelDraft(this.local, this.binding, targetAccess, this.readSourceType, this.context);
  }

  private checkedObserverDraft(targetAccess: RuntimeBindingTargetAccess): RuntimeBindingValueChannelDraft {
    if (!(this.binding instanceof PropertyBinding)) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: null,
        openReason: 'CheckedObserver value-channel materialization expected a runtime PropertyBinding product.',
      };
    }
    return this.checkedObserver.valueChannelDraft(this.local, this.binding, targetAccess, this.readSourceType, this.context);
  }

  private openSpreadBindingWithoutClosedBindable(): RuntimeBindingValueChannelDraft {
    return {
      channelKind: RuntimeBindingValueChannelKind.Open,
      authority: RuntimeBindingValueChannelAuthority.Open,
      runtimeValueType: this.readSourceType(),
      valueDomain: [],
      isCollection: null,
      openReason: 'SpreadValueBinding could not close its target bindable keys for per-bindable inner PropertyBinding materialization.',
    };
  }

  private openMissingTargetAccess(): RuntimeBindingValueChannelDraft {
    return {
      channelKind: RuntimeBindingValueChannelKind.Open,
      authority: RuntimeBindingValueChannelAuthority.Open,
      runtimeValueType: null,
      valueDomain: [],
      isCollection: null,
      openReason: 'Runtime binding did not carry a target accessor or observer product for value-channel materialization.',
    };
  }

  private openTargetAccess(): RuntimeBindingValueChannelDraft {
    const targetAccess = this.targetAccess!;
    return {
      channelKind: RuntimeBindingValueChannelKind.Open,
      authority: RuntimeBindingValueChannelAuthority.Open,
      runtimeValueType: targetAccess.propertyType,
      valueDomain: [],
      isCollection: null,
      openReason: targetAccess.openReason,
    };
  }

  private rejectedTargetAccess(): RuntimeBindingValueChannelDraft {
    const targetAccess = this.targetAccess!;
    return {
      channelKind: RuntimeBindingValueChannelKind.RejectedTargetAccess,
      authority: RuntimeBindingValueChannelAuthority.TargetAccess,
      runtimeValueType: targetAccess.propertyType,
      valueDomain: [],
      isCollection: null,
      openReason: null,
    };
  }
}

function templateControllerValueChannelKind(
  semantics: BuiltInTemplateControllerSemantics,
): RuntimeBindingValueChannelKind {
  switch (semantics.flowKind) {
    case BuiltInTemplateControllerFlowKind.Conditional:
      return RuntimeBindingValueChannelKind.TemplateControllerTruthiness;
    case BuiltInTemplateControllerFlowKind.ValueScope:
      return RuntimeBindingValueChannelKind.TemplateControllerValueScope;
    case BuiltInTemplateControllerFlowKind.Switch:
      return RuntimeBindingValueChannelKind.TemplateControllerSwitchValue;
    case BuiltInTemplateControllerFlowKind.SwitchCase:
    case BuiltInTemplateControllerFlowKind.SwitchDefault:
      return RuntimeBindingValueChannelKind.TemplateControllerSwitchCaseValue;
    case BuiltInTemplateControllerFlowKind.Promise:
      return RuntimeBindingValueChannelKind.TemplateControllerPromiseValue;
    case BuiltInTemplateControllerFlowKind.PromisePending:
    case BuiltInTemplateControllerFlowKind.PromiseFulfilled:
    case BuiltInTemplateControllerFlowKind.PromiseRejected:
      return RuntimeBindingValueChannelKind.TemplateControllerPromiseBranchValue;
    case BuiltInTemplateControllerFlowKind.Iteration:
      return RuntimeBindingValueChannelKind.TemplateControllerIteration;
    case BuiltInTemplateControllerFlowKind.PassThrough:
    case BuiltInTemplateControllerFlowKind.ConditionalElse:
      return RuntimeBindingValueChannelKind.RawProperty;
  }
}

export class RuntimeBindingValueChannelDraftMaterializer {
  private readonly support: RuntimeBindingValueChannelDraftSupport;
  private readonly directBinding: DirectBindingValueChannelDrafts;
  private readonly selectObserver: SelectValueObserverChannelDrafts;
  private readonly checkedObserver: CheckedObserverChannelDrafts;

  constructor(
    store: KernelStore,
    typeProjector: CheckerTypeProjector,
  ) {
    this.support = new RuntimeBindingValueChannelDraftSupport(store, typeProjector);
    this.directBinding = new DirectBindingValueChannelDrafts(this.support);
    this.selectObserver = new SelectValueObserverChannelDrafts(this.support);
    this.checkedObserver = new CheckedObserverChannelDrafts(this.support);
  }

  valueChannelDraftForBinding(
    local: string,
    binding: RuntimeValueChannelBinding,
    targetAccess: RuntimeBindingTargetAccess | null,
    targetOperation: RuntimeBindingTargetOperation | null,
    sourceOperation: RuntimeBindingSourceOperation | null,
    context: BindingValueChannelDraftContext,
  ): RuntimeBindingValueChannelDraft {
    return new RuntimeBindingValueChannelDraftFrame(
      this.support,
      this.directBinding,
      this.selectObserver,
      this.checkedObserver,
      local,
      binding,
      targetAccess,
      targetOperation,
      sourceOperation,
      context,
    ).read();
  }
}
