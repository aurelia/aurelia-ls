import { splitWhitespace } from '../strings.js';
import { normalizeHtmlTagName } from '../template/html-ir.js';
import {
  AttributeBinding,
  RuntimeBindingSourceOperationKind,
  RuntimeBindingTargetKind,
  RuntimeBindingTargetOperationKind,
  type RuntimeBindingSourceOperation,
  type RuntimeBindingTargetAccess,
  type RuntimeBindingTargetOperation,
} from '../template/runtime-binding.js';
import {
  RuntimeBindingValueChannelAuthority,
  RuntimeBindingValueChannelCouplingKind,
  RuntimeBindingValueChannelKind,
} from './runtime-binding-observation.js';
import type {
  BindingSourceTypeReader,
  BindingValueChannelDraftContext,
  RuntimeBindingValueChannelDraft,
  RuntimeValueChannelBinding,
} from './binding-value-channel-draft-types.js';
import { RuntimeBindingValueChannelDraftSupport } from './binding-value-channel-draft-support.js';

export class DirectBindingValueChannelDrafts {
  constructor(private readonly owner: RuntimeBindingValueChannelDraftSupport) {}

  valueChannelDraftForTargetOperation(
    local: string,
    targetOperation: RuntimeBindingTargetOperation | null,
    readSourceType: BindingSourceTypeReader,
    context: BindingValueChannelDraftContext,
  ): RuntimeBindingValueChannelDraft {
    if (targetOperation == null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: null,
        valueDomain: [],
        isCollection: null,
        openReason: 'Runtime binding did not carry a direct target-operation product for value-channel materialization.',
      };
    }
    const sourceType = readSourceType();
    const runtimeInputType = this.owner.types.targetOperationRuntimeInputType(`${local}:runtime-input`, sourceType, targetOperation);
    if (targetOperation.openReason != null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: runtimeInputType,
        valueDomain: [],
        isCollection: null,
        openReason: targetOperation.openReason,
      };
    }
    if (
      targetOperation.operationKind === RuntimeBindingTargetOperationKind.PropertySet
      && (targetOperation.targetKind === RuntimeBindingTargetKind.BindingContext
        || targetOperation.targetKind === RuntimeBindingTargetKind.OverrideContext)
    ) {
      return {
        channelKind: RuntimeBindingValueChannelKind.ScopeSlot,
        authority: sourceType == null
          ? RuntimeBindingValueChannelAuthority.TargetOperation
          : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
        runtimeValueType: runtimeInputType,
        valueDomain: targetOperation.affectedNames,
        isCollection: false,
        openReason: null,
      };
    }

    switch (targetOperation.operationKind) {
      case RuntimeBindingTargetOperationKind.PropertySet:
      case RuntimeBindingTargetOperationKind.AttributeSet:
      case RuntimeBindingTargetOperationKind.ClassListAdd:
      case RuntimeBindingTargetOperationKind.StyleCssTextAppend:
        return {
          channelKind: RuntimeBindingValueChannelKind.Open,
          authority: RuntimeBindingValueChannelAuthority.Open,
          runtimeValueType: sourceType,
          valueDomain: targetOperation.affectedNames,
          isCollection: null,
          openReason: 'Renderer-owned static target operation reached AttributeBinding value-channel materialization.',
        };
      case RuntimeBindingTargetOperationKind.EventListenerAdd:
        const invocationValueType = this.owner.types.eventHandlerInvocationValueType(
          `${local}:event-handler`,
          sourceType,
          targetOperation,
          context,
          targetOperation.sourceAddressHandle,
        );
        return {
          channelKind: RuntimeBindingValueChannelKind.EventHandlerInvocation,
          authority: sourceType == null
            ? RuntimeBindingValueChannelAuthority.TargetOperation
            : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
          runtimeValueType: invocationValueType,
          valueDomain: targetOperation.affectedNames,
          isCollection: false,
          openReason: null,
        };
      case RuntimeBindingTargetOperationKind.TextContentSet:
        return {
          channelKind: RuntimeBindingValueChannelKind.TextContent,
          authority: sourceType == null
            ? RuntimeBindingValueChannelAuthority.TargetOperation
            : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
          runtimeValueType: runtimeInputType,
          valueDomain: [],
          isCollection: false,
          openReason: null,
        };
      case RuntimeBindingTargetOperationKind.ClassListToggle:
        return this.classToggleValueChannelDraft(local, targetOperation, readSourceType);
      case RuntimeBindingTargetOperationKind.StyleSetProperty:
        return this.stylePropertyValueChannelDraft(local, targetOperation, readSourceType);
      case RuntimeBindingTargetOperationKind.AttributeSetOrRemove:
        return {
          channelKind: RuntimeBindingValueChannelKind.AttributeValue,
          authority: sourceType == null
            ? RuntimeBindingValueChannelAuthority.TargetOperation
            : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
          runtimeValueType: runtimeInputType,
          valueDomain: targetOperation.affectedNames,
          isCollection: null,
          openReason: null,
        };
      case RuntimeBindingTargetOperationKind.Open:
        return {
          channelKind: RuntimeBindingValueChannelKind.Open,
          authority: RuntimeBindingValueChannelAuthority.Open,
          runtimeValueType: sourceType,
          valueDomain: [],
          isCollection: null,
          openReason: targetOperation.openReason ?? 'AttributeBinding target operation stayed open.',
        };
    }
  }

  valueChannelDraftForSourceOperation(
    sourceOperation: RuntimeBindingSourceOperation | null,
    readSourceType?: BindingSourceTypeReader,
  ): RuntimeBindingValueChannelDraft {
    if (sourceOperation == null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: null,
        valueDomain: [],
        isCollection: null,
        openReason: 'Runtime binding did not carry a source-operation product for value-channel materialization.',
      };
    }
    if (sourceOperation.openReason != null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: sourceOperation.targetType,
        valueDomain: [],
        isCollection: null,
        openReason: sourceOperation.openReason,
      };
    }
    switch (sourceOperation.operationKind) {
      case RuntimeBindingSourceOperationKind.RefAssignTarget:
        return {
          channelKind: RuntimeBindingValueChannelKind.RefTarget,
          authority: RuntimeBindingValueChannelAuthority.SourceOperation,
          runtimeValueType: sourceOperation.targetType,
          valueDomain: [],
          isCollection: false,
          openReason: null,
        };
      case RuntimeBindingSourceOperationKind.StateDispatchAction: {
        const sourceType = readSourceType?.() ?? null;
        return {
          channelKind: RuntimeBindingValueChannelKind.StateDispatchAction,
          authority: sourceType == null
            ? RuntimeBindingValueChannelAuthority.SourceOperation
            : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
          runtimeValueType: sourceType,
          valueDomain: [sourceOperation.targetName],
          isCollection: false,
          openReason: null,
        };
      }
      case RuntimeBindingSourceOperationKind.Open:
        return {
          channelKind: RuntimeBindingValueChannelKind.Open,
          authority: RuntimeBindingValueChannelAuthority.Open,
          runtimeValueType: sourceOperation.targetType,
          valueDomain: [],
          isCollection: null,
          openReason: sourceOperation.openReason ?? 'Runtime source operation stayed open.',
        };
    }
  }

  classValueChannelDraft(
    binding: RuntimeValueChannelBinding,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
  ): RuntimeBindingValueChannelDraft {
    const sourceType = readSourceType();
    if (binding instanceof AttributeBinding && binding.attr === 'class') {
      const classTokens = splitWhitespace(binding.target);
      if (classTokens.length === 0) {
        return {
          channelKind: RuntimeBindingValueChannelKind.ClassToggle,
          authority: RuntimeBindingValueChannelAuthority.Open,
          runtimeValueType: sourceType,
          valueDomain: [],
          isCollection: false,
          openReason: 'Class attribute binding did not expose any class token to toggle.',
        };
      }
      return {
        channelKind: RuntimeBindingValueChannelKind.ClassToggle,
        authority: sourceType == null
          ? RuntimeBindingValueChannelAuthority.BindingExpression
          : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
        runtimeValueType: sourceType ?? this.owner.types.unknownRuntimeInputType(`${targetAccess.productHandle}:class-toggle-input`, targetAccess.sourceAddressHandle),
        valueDomain: classTokens,
        isCollection: classTokens.length > 1,
        openReason: null,
      };
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.ClassAttributeTokens,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetAccess
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: sourceType ?? this.owner.types.unknownRuntimeInputType(`${targetAccess.productHandle}:class-attribute-input`, targetAccess.sourceAddressHandle),
      valueDomain: [],
      isCollection: null,
      openReason: null,
    };
  }

  elementModelValueChannelDraft(
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
  ): RuntimeBindingValueChannelDraft | null {
    if (targetAccess.targetProperty !== 'model') {
      return null;
    }
    const element = this.owner.htmlElementFor(targetAccess.targetNode);
    const tagName = element == null ? null : normalizeHtmlTagName(element.tagName);
    if (tagName !== 'INPUT' && tagName !== 'OPTION') {
      return null;
    }
    const sourceType = readSourceType();
    return {
      channelKind: RuntimeBindingValueChannelKind.ElementModelValue,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetAccess
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: sourceType ?? this.owner.types.unknownRuntimeInputType(`${targetAccess.productHandle}:element-model-input`, targetAccess.sourceAddressHandle),
      valueDomain: [],
      isCollection: false,
      observerCouplings: tagName === 'OPTION'
        ? [RuntimeBindingValueChannelCouplingKind.SelectOptionValueDomain]
        : [
          RuntimeBindingValueChannelCouplingKind.CheckedElementValueDomain,
          RuntimeBindingValueChannelCouplingKind.CheckedElementValueObserver,
        ],
      openReason: null,
    };
  }

  styleValueChannelDraft(
    binding: RuntimeValueChannelBinding,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
  ): RuntimeBindingValueChannelDraft {
    const sourceType = readSourceType();
    if (binding instanceof AttributeBinding && binding.attr === 'style') {
      const styleTarget = binding.target.trim();
      if (styleTarget.length > 0 && styleTarget !== 'style') {
        return {
          channelKind: RuntimeBindingValueChannelKind.StylePropertyValue,
          authority: sourceType == null
            ? RuntimeBindingValueChannelAuthority.BindingExpression
            : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
          runtimeValueType: sourceType ?? this.owner.types.unknownRuntimeInputType(`${targetAccess.productHandle}:style-property-input`, targetAccess.sourceAddressHandle),
          valueDomain: [styleTarget],
          isCollection: false,
          openReason: null,
        };
      }
      return {
        channelKind: RuntimeBindingValueChannelKind.StyleAttributeRules,
        authority: sourceType == null
          ? RuntimeBindingValueChannelAuthority.BindingExpression
          : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
        runtimeValueType: sourceType ?? this.owner.types.unknownRuntimeInputType(`${targetAccess.productHandle}:style-attribute-input`, targetAccess.sourceAddressHandle),
        valueDomain: [],
        isCollection: null,
        openReason: null,
      };
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.StyleAttributeRules,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetAccess
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: sourceType ?? this.owner.types.unknownRuntimeInputType(`${targetAccess.productHandle}:style-attribute-input`, targetAccess.sourceAddressHandle),
      valueDomain: [],
      isCollection: null,
      openReason: null,
    };
  }

  attributeValueChannelDraft(
    readSourceType: BindingSourceTypeReader,
    targetAccess: RuntimeBindingTargetAccess,
  ): RuntimeBindingValueChannelDraft {
    const sourceType = readSourceType();
    return {
      channelKind: RuntimeBindingValueChannelKind.AttributeValue,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetAccess
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: sourceType ?? this.owner.types.targetAccessRuntimeInputType(`${targetAccess.productHandle}:attribute-input`, targetAccess),
      valueDomain: [],
      isCollection: null,
      openReason: null,
    };
  }

  customMatcherFunctionValueChannelDraft(
    local: string,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
  ): RuntimeBindingValueChannelDraft | null {
    if (targetAccess.targetProperty !== 'matcher') {
      return null;
    }
    const target = this.owner.htmlElementFor(targetAccess.targetNode);
    const tagName = target == null ? null : normalizeHtmlTagName(target.tagName);
    if (tagName !== 'INPUT' && tagName !== 'SELECT') {
      return null;
    }
    const sourceType = readSourceType();
    return {
      channelKind: RuntimeBindingValueChannelKind.CustomMatcherFunction,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetAccess
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: this.owner.types.customMatcherFunctionType(
        `${local}:custom-matcher-function`,
        sourceType,
        targetAccess.sourceAddressHandle,
      ),
      valueDomain: [],
      isCollection: false,
      openReason: null,
    };
  }

  private classToggleValueChannelDraft(
    local: string,
    targetOperation: RuntimeBindingTargetOperation,
    readSourceType: BindingSourceTypeReader,
  ): RuntimeBindingValueChannelDraft {
    const sourceType = readSourceType();
    const runtimeInputType = this.owner.types.targetOperationRuntimeInputType(`${local}:class-toggle-input`, sourceType, targetOperation);
    if (targetOperation.affectedNames.length === 0) {
      return {
        channelKind: RuntimeBindingValueChannelKind.ClassToggle,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: runtimeInputType,
        valueDomain: [],
        isCollection: false,
        openReason: 'Class attribute binding did not expose any class token to toggle.',
      };
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.ClassToggle,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetOperation
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: runtimeInputType,
      valueDomain: targetOperation.affectedNames,
      isCollection: targetOperation.affectedNames.length > 1,
      openReason: null,
    };
  }

  private stylePropertyValueChannelDraft(
    local: string,
    targetOperation: RuntimeBindingTargetOperation,
    readSourceType: BindingSourceTypeReader,
  ): RuntimeBindingValueChannelDraft {
    const sourceType = readSourceType();
    const runtimeInputType = this.owner.types.targetOperationRuntimeInputType(`${local}:style-property-input`, sourceType, targetOperation);
    return {
      channelKind: RuntimeBindingValueChannelKind.StylePropertyValue,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetOperation
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: runtimeInputType,
      valueDomain: targetOperation.affectedNames,
      isCollection: false,
      openReason: null,
    };
  }
}
