import {
  TemplateCompletionSiteKind,
  type TemplateCompletionCursorContext,
} from '../inquiry/template-completion.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  RuntimeBindingDataFlow,
  RuntimeBindingDataFlowSourceAssignmentKind,
  RuntimeBindingDataFlowSourceAssignmentReasonKind,
} from '../observation/runtime-binding-observation.js';
import {
  RuntimeBindingScopeIssue,
  RuntimeBindingScopeIssueCertainty,
  RuntimeBindingScopeIssueKind,
} from '../template/runtime-binding-scope-issue.js';
import {
  type RuntimeBindingIssue,
  RuntimeBindingIssueKind,
} from '../template/runtime-binding-issue.js';
import {
  type RuntimeBindingBehaviorIssue,
  RuntimeBindingBehaviorIssueKind,
} from '../template/runtime-binding-behavior.js';
import type { RuntimeValueConverterIssue } from '../template/runtime-value-converter.js';
import type { RuntimeBindingTargetAccess } from '../template/runtime-binding.js';
import {
  type RuntimeControllerIssue,
  RuntimeControllerIssueKind,
} from '../template/runtime-controller-issue.js';
import {
  type RuntimeRendererIssue,
  RuntimeRendererIssueKind,
} from '../template/runtime-renderer-issue.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import {
  CheckerTypeMemberKind,
  CheckerTypeShapeKind,
} from '../type-system/type-shape.js';
import {
  RuntimeAstFrameworkErrorCode,
  RuntimeHtmlAstFrameworkErrorCode as RuntimeHtmlAstFrameworkErrorCodes,
  type RuntimeHtmlAstFrameworkErrorCode,
} from '../type-system/framework-error-code.js';
import {
  RuntimeHtmlObservationFrameworkErrorCode,
  RuntimeObservationFrameworkErrorCode,
} from '../observation/framework-error-code.js';
import type { RouterIssueModel } from '../router/model.js';
import type { CheckerExpressionTypeOpenSubject } from '../type-system/expression-type-evaluation.js';
import type {
  SemanticTemplateCursorDiagnosticRow,
  SemanticTemplateCursorInfoResult,
  SemanticTemplateCursorMemberRow,
  SemanticTemplateCursorSuggestionActionTargetRow,
  SemanticTemplateCursorSuggestionRow,
  SemanticTemplateCursorSuggestionValueTypeSource,
  SemanticTemplateDiagnosticRow,
} from './contracts.js';
import {
  describeAddress,
  type SemanticSourceReference,
} from './source-reference.js';

export function cursorDiagnosticRows(
  store: KernelStore,
  siteKind: TemplateCompletionSiteKind | `${TemplateCompletionSiteKind}`,
  missingInputs: readonly string[],
  selectedMemberName: string | null,
  selectedMember: SemanticTemplateCursorMemberRow | null,
  memberOwnerType: SemanticTemplateCursorInfoResult['memberOwnerType'],
  memberOwnerTypeProductHandle: TemplateCompletionCursorContext['query']['memberOwnerTypeProductHandle'],
  memberOwnerTypeOpenSubject: CheckerExpressionTypeOpenSubject | null,
  source: SemanticTemplateCursorDiagnosticRow['source'],
  expectedValueTypeDisplay: string | null = null,
  expectedValueTypeSource: SemanticTemplateCursorSuggestionValueTypeSource | null = null,
): readonly SemanticTemplateCursorDiagnosticRow[] {
  if (siteKind !== TemplateCompletionSiteKind.ExpressionMember || selectedMemberName == null) {
    return [];
  }

  const ownerType = readOwnerType(store, memberOwnerTypeProductHandle);
  if (ownerType == null) {
    return missingOwnerTypeDiagnostic(
      store,
      missingInputs,
      source,
      selectedMemberName,
      memberOwnerType,
      memberOwnerTypeOpenSubject,
      expectedValueTypeDisplay,
      expectedValueTypeSource,
    );
  }

  if (selectedMember?.memberKind === CheckerTypeMemberKind.IndexSignature) {
    return [indexSignatureOwnerDiagnostic(source, selectedMemberName, selectedMember, memberOwnerType)];
  }
  if (ownerType.shapeKind === CheckerTypeShapeKind.Any) {
    return [anyOwnerDiagnostic(
      source,
      selectedMemberName,
      memberOwnerType,
      expectedValueTypeDisplay,
      expectedValueTypeSource,
    )];
  }
  if (ownerType.members.length === 0 && selectedMember == null && noMembersOwnerTypeIsWeak(ownerType.shapeKind)) {
    return [emptyOwnerDiagnostic(
      source,
      selectedMemberName,
      memberOwnerType,
      expectedValueTypeDisplay,
      expectedValueTypeSource,
    )];
  }
  if (selectedMember == null) {
    return [missingMemberDiagnostic(
      source,
      selectedMemberName,
      ownerType.shapeKind,
      memberOwnerType,
      expectedValueTypeDisplay,
      expectedValueTypeSource,
    )];
  }
  return [];
}

export function bindingSourceAssignmentDiagnosticKind(
  sourceAssignmentKind: RuntimeBindingDataFlowSourceAssignmentKind | null,
): SemanticTemplateCursorDiagnosticRow['diagnosticKind'] | null {
  switch (sourceAssignmentKind) {
    case RuntimeBindingDataFlowSourceAssignmentKind.RuntimeAssignableWithTypeScriptStrictness:
      return 'binding-source-assignment-strictness';
    case RuntimeBindingDataFlowSourceAssignmentKind.RuntimeUnassignable:
      return 'binding-source-assignment-runtime-noop';
    default:
      return null;
  }
}

export function bindingSourceAssignmentReasonKinds(
  dataFlow: RuntimeBindingDataFlow,
): readonly RuntimeBindingDataFlowSourceAssignmentReasonKind[] {
  return dataFlow.sourceAssignmentReasonKinds.length === 0
    ? [RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceUnresolved]
    : dataFlow.sourceAssignmentReasonKinds;
}

export function bindingSourceAssignmentDiagnostic(
  store: KernelStore,
  dataFlow: RuntimeBindingDataFlow,
  reasonKinds: readonly RuntimeBindingDataFlowSourceAssignmentReasonKind[],
  diagnosticKind: SemanticTemplateCursorDiagnosticRow['diagnosticKind'],
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): SemanticTemplateCursorDiagnosticRow {
  const primaryReasonKind = reasonKinds[0]
    ?? RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceUnresolved;
  const runtimeNoop = diagnosticKind === 'binding-source-assignment-runtime-noop';
  const frameworkErrorCode = bindingSourceAssignmentFrameworkErrorCode(reasonKinds);
  const frameworkRuntimeError = frameworkErrorCode != null;
  const ownerType = dataFlow.sourceAssignmentTargetType ?? dataFlow.sourceType ?? null;
  const ownerSource = describeAddress(
    store,
    ownerType?.sourceAddressHandle
      ?? null,
  );
  const valueTypeDisplay = dataFlow.targetValueType?.display ?? dataFlow.targetPropertyType?.display ?? null;
  const suggestion = bindingSourceAssignmentSuggestion(
    dataFlow,
    source,
    ownerSource,
    reasonKinds,
    runtimeNoop,
    valueTypeDisplay,
  );

  return {
    diagnosticKind,
    diagnosticAuthority: frameworkRuntimeError
      ? 'framework-error-code'
      : runtimeNoop
      ? 'framework-runtime-behavior'
      : 'semantic-authoring-policy',
    frameworkErrorCode,
    severity: frameworkRuntimeError ? 'error' : 'warning',
    summary: bindingSourceAssignmentSummary(dataFlow, runtimeNoop),
    missingInput: `binding-source-assignment:${primaryReasonKind}`,
    missingInputs: reasonKinds.map((reasonKind) => `binding-source-assignment:${reasonKind}`),
    source,
    selectedMemberName: dataFlow.sourceName,
    ownerTypeDisplay: ownerType?.display ?? null,
    ownerTypeShapeKind: ownerType?.shapeKind ?? null,
    ownerTypeOrigin: ownerType?.origin ?? null,
    suggestion: {
      suggestionKind: suggestion.suggestionKind,
      actionKind: suggestion.actionKind,
      actionTarget: suggestion.actionTarget,
      summary: suggestion.summary,
      targetMemberName: dataFlow.sourceName,
      ownerTypeDisplay: ownerType?.display ?? null,
      valueTypeDisplay,
      valueTypeSource: valueTypeDisplay == null ? null : suggestion.valueTypeSource,
    },
  };
}

function bindingSourceAssignmentFrameworkErrorCode(
  reasonKinds: readonly RuntimeBindingDataFlowSourceAssignmentReasonKind[],
): RuntimeAstFrameworkErrorCode | null {
  if (reasonKinds.includes(RuntimeBindingDataFlowSourceAssignmentReasonKind.HostAccessScopeAssignment)) {
    return RuntimeAstFrameworkErrorCode.AstNoAssignHost;
  }
  if (reasonKinds.includes(RuntimeBindingDataFlowSourceAssignmentReasonKind.NullishAssignment)) {
    return RuntimeAstFrameworkErrorCode.AstNullishAssignment;
  }
  return null;
}

export function bindingDataFlowFrameworkErrorDiagnostic(
  dataFlow: RuntimeBindingDataFlow,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): SemanticTemplateCursorDiagnosticRow | null {
  if (dataFlow.frameworkErrorCode == null) {
    return null;
  }
  const frameworkErrorCode = dataFlow.frameworkErrorCode;
  const selectArrayOnSingleSelect =
    frameworkErrorCode === RuntimeHtmlObservationFrameworkErrorCode.SelectObserverArrayOnNonMultiSelect;
  const readonlyCollectionSize =
    frameworkErrorCode === RuntimeObservationFrameworkErrorCode.AssignReadonlySize;
  const readonlyComputedProperty =
    frameworkErrorCode === RuntimeObservationFrameworkErrorCode.AssignReadonlyComputedProperty;
  return {
    diagnosticKind: 'runtime-binding-framework-error',
    diagnosticAuthority: 'framework-error-code',
    frameworkErrorCode,
    severity: 'error',
    summary: selectArrayOnSingleSelect
      ? `Aurelia SelectValueObserver ${frameworkErrorCode} rejects an array-valued source update on a non-multiple <select>.`
      : readonlyCollectionSize
        ? `Aurelia CollectionSizeObserver ${frameworkErrorCode} rejects writes to Map/Set size.`
        : readonlyComputedProperty
          ? `Aurelia ComputedObserver ${frameworkErrorCode} rejects writes to a getter-only target property.`
      : `Aurelia runtime binding ${frameworkErrorCode} rejects this binding data flow.`,
    missingInput: `binding-data-flow:${frameworkErrorCode}`,
    missingInputs: [`binding-data-flow:${frameworkErrorCode}`],
    source,
    selectedMemberName: dataFlow.sourceName,
    ownerTypeDisplay: dataFlow.sourceType?.display ?? null,
    ownerTypeShapeKind: dataFlow.sourceType?.shapeKind ?? null,
    ownerTypeOrigin: dataFlow.sourceType?.origin ?? null,
    suggestion: {
      suggestionKind: 'fix-template-syntax',
      actionKind: 'rewrite-template-syntax',
      actionTarget: suggestionActionTarget('template-syntax', source, dataFlow.sourceName, null),
      summary: selectArrayOnSingleSelect
        ? 'Add the multiple attribute to the select or bind value to a scalar selection source.'
        : 'Align the binding target semantics with the source value shape.',
      targetMemberName: dataFlow.sourceName,
      ownerTypeDisplay: dataFlow.sourceType?.display ?? null,
      valueTypeDisplay: dataFlow.targetValueType?.display ?? dataFlow.targetPropertyType?.display ?? null,
      valueTypeSource: 'binding-target',
    },
  };
}

export function expressionParseErrorDiagnostic(
  message: string,
  frameworkErrorCode: string | null,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): SemanticTemplateCursorDiagnosticRow {
  return {
    diagnosticKind: 'expression-parse-error',
    diagnosticAuthority: frameworkErrorCode == null
      ? 'semantic-authoring-policy'
      : 'framework-error-code',
    frameworkErrorCode,
    severity: 'error',
    summary: frameworkErrorCode == null
      ? `The expression parser rejected this template expression: ${message}.`
      : `Aurelia expression parser ${frameworkErrorCode} rejects this template expression: ${message}.`,
    missingInput: frameworkErrorCode == null
      ? 'expression-parse:unmapped'
      : `expression-parse:${frameworkErrorCode}`,
    missingInputs: [
      frameworkErrorCode == null
        ? 'expression-parse:unmapped'
        : `expression-parse:${frameworkErrorCode}`,
    ],
    source,
    selectedMemberName: null,
    ownerTypeDisplay: null,
    ownerTypeShapeKind: null,
    ownerTypeOrigin: null,
    suggestion: {
      suggestionKind: 'fix-expression-syntax',
      actionKind: 'rewrite-expression',
      actionTarget: suggestionActionTarget('expression', source, null, null),
      summary: 'Rewrite the expression so it matches Aurelia expression parser grammar for this binding context.',
      targetMemberName: null,
      ownerTypeDisplay: null,
      valueTypeDisplay: null,
      valueTypeSource: null,
    },
  };
}

export function templateCompilerErrorDiagnostic(
  message: string,
  frameworkErrorCode: string | null,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
  severity: SemanticTemplateDiagnosticRow['severity'] = 'error',
): SemanticTemplateCursorDiagnosticRow {
  return {
    diagnosticKind: 'template-compiler-error',
    diagnosticAuthority: frameworkErrorCode == null
      ? 'semantic-authoring-policy'
      : 'framework-error-code',
    frameworkErrorCode,
    severity,
    summary: frameworkErrorCode == null
      ? `The template compiler rejected this template syntax: ${message}.`
      : `Aurelia template compiler ${frameworkErrorCode} rejects this template syntax: ${message}.`,
    missingInput: frameworkErrorCode == null
      ? 'template-compiler:unmapped'
      : `template-compiler:${frameworkErrorCode}`,
    missingInputs: [
      frameworkErrorCode == null
        ? 'template-compiler:unmapped'
        : `template-compiler:${frameworkErrorCode}`,
    ],
    source,
    selectedMemberName: null,
    ownerTypeDisplay: null,
    ownerTypeShapeKind: null,
    ownerTypeOrigin: null,
    suggestion: {
      suggestionKind: 'fix-template-syntax',
      actionKind: 'rewrite-template-syntax',
      actionTarget: suggestionActionTarget('template-syntax', source, null, null),
      summary: 'Rewrite the authored template syntax so it matches Aurelia template compiler grammar.',
      targetMemberName: null,
      ownerTypeDisplay: null,
      valueTypeDisplay: null,
      valueTypeSource: null,
    },
  };
}

export function runtimeControllerIssueDiagnostic(
  issue: RuntimeControllerIssue,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): SemanticTemplateCursorDiagnosticRow {
  const suggestion = runtimeControllerIssueSuggestion(issue);
  return {
    diagnosticKind: 'runtime-controller-framework-error',
    diagnosticAuthority: 'framework-error-code',
    frameworkErrorCode: issue.frameworkErrorCode,
    severity: 'error',
    summary: `Aurelia runtime controller ${issue.frameworkErrorCode ?? ''} rejects this controller input: ${issue.message}.`,
    missingInput: issue.frameworkErrorCode == null
      ? `runtime-controller:${issue.issueKind}`
      : `runtime-controller:${issue.frameworkErrorCode}`,
    missingInputs: [
      issue.frameworkErrorCode == null
        ? `runtime-controller:${issue.issueKind}`
        : `runtime-controller:${issue.frameworkErrorCode}`,
    ],
    source,
    selectedMemberName: null,
    ownerTypeDisplay: null,
    ownerTypeShapeKind: null,
    ownerTypeOrigin: null,
    suggestion: {
      suggestionKind: 'fix-template-syntax',
      actionKind: 'rewrite-template-syntax',
      actionTarget: suggestionActionTarget('template-syntax', source, null, null),
      summary: suggestion,
      targetMemberName: null,
      ownerTypeDisplay: null,
      valueTypeDisplay: null,
      valueTypeSource: null,
    },
  };
}

function runtimeControllerIssueSuggestion(issue: RuntimeControllerIssue): string {
  switch (issue.issueKind) {
    case RuntimeControllerIssueKind.ElementResourceNotFound:
    case RuntimeControllerIssueKind.AttributeResourceNotFound:
    case RuntimeControllerIssueKind.AttributeTemplateControllerResourceNotFound:
      return 'Register the referenced resource in the app/resource scope or rewrite the template to use an available resource name.';
    case RuntimeControllerIssueKind.ViewFactoryProviderNotReady:
      return 'Inject IViewFactory only from template-controller view models, or move this resource to an API that does not require a nested view factory.';
    case RuntimeControllerIssueKind.RepeatInvalidKeyBindingCommand:
    case RuntimeControllerIssueKind.RepeatInvalidContextualBindingCommand:
    case RuntimeControllerIssueKind.RepeatExtraneousBinding:
      return 'Use only supported repeat options: static key/contextual values or key.bind/contextual.bind.';
    case RuntimeControllerIssueKind.AuComposeInvalidScopeBehavior:
      return 'Use an au-compose scopeBehavior value supported by Aurelia.';
    case RuntimeControllerIssueKind.AuComposeComponentNameNotFound:
      return 'Register the named custom element in the parent component scope or use an available au-compose component name.';
    case RuntimeControllerIssueKind.AuComposeInvalidFlushMode:
      return 'Use an au-compose flushMode value supported by Aurelia.';
    case RuntimeControllerIssueKind.ElseWithoutIf:
      return 'Place else immediately after an if template controller in the same rendered child-controller sequence.';
    case RuntimeControllerIssueKind.SwitchInvalidUsage:
      return 'Place case/default-case under the synthetic view created by a parent switch template controller.';
    case RuntimeControllerIssueKind.SwitchNoMultipleDefault:
      return 'Keep at most one default-case for each switch template controller.';
    case RuntimeControllerIssueKind.PortalInvalidInsertPosition:
      return 'Use one of the DOM InsertPosition values supported by Aurelia portal.';
    case RuntimeControllerIssueKind.PortalQueryEmpty:
    case RuntimeControllerIssueKind.PortalNoTarget:
      return 'Provide a non-empty portal target when strict target resolution is enabled.';
    case RuntimeControllerIssueKind.PromiseInvalidUsage:
      return 'Place pending/then/catch under the synthetic view created by a parent promise.resolve template controller.';
    case RuntimeControllerIssueKind.ControllerPropertyNotCoercible:
    case RuntimeControllerIssueKind.ControllerPropertyNoChangeHandler:
      return 'Adjust the bindable setter/callback shape so Aurelia can install the required runtime observer support.';
    default:
      return 'Rewrite the authored template/controller input so it matches Aurelia runtime semantics.';
  }
}

export function runtimeBindingIssueDiagnostic(
  issue: RuntimeBindingIssue,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): SemanticTemplateCursorDiagnosticRow {
  return {
    diagnosticKind: 'runtime-binding-framework-error',
    diagnosticAuthority: 'framework-error-code',
    frameworkErrorCode: issue.frameworkErrorCode,
    severity: 'error',
    summary: `Aurelia runtime binding ${issue.frameworkErrorCode ?? ''} rejects this binding input: ${issue.message}.`,
    missingInput: issue.frameworkErrorCode == null
      ? `runtime-binding:${issue.issueKind}`
      : `runtime-binding:${issue.frameworkErrorCode}`,
    missingInputs: [
      issue.frameworkErrorCode == null
        ? `runtime-binding:${issue.issueKind}`
        : `runtime-binding:${issue.frameworkErrorCode}`,
    ],
    source,
    selectedMemberName: null,
    ownerTypeDisplay: null,
    ownerTypeShapeKind: null,
    ownerTypeOrigin: null,
    suggestion: {
      suggestionKind: 'fix-template-syntax',
      actionKind: 'rewrite-template-syntax',
      actionTarget: suggestionActionTarget('template-syntax', source, null, null),
      summary: runtimeBindingIssueSuggestion(issue),
      targetMemberName: null,
      ownerTypeDisplay: null,
      valueTypeDisplay: null,
      valueTypeSource: null,
    },
  };
}

function runtimeBindingIssueSuggestion(issue: RuntimeBindingIssue): string {
  switch (issue.issueKind) {
    case RuntimeBindingIssueKind.TranslationKeyNotFound:
      return 'Add a t or t.bind translation key on the same element, or remove the t-params binding.';
    case RuntimeBindingIssueKind.TranslationParameterAlreadyExists:
      return 'Keep only one t-params.bind parameter binding on a translated element.';
    case RuntimeBindingIssueKind.TranslationKeyInvalid:
      return 'Make the translation key expression evaluate to a string before i18n runs.';
    case RuntimeBindingIssueKind.SpreadScopeContextMissing:
    case RuntimeBindingIssueKind.SpreadTemplateControllerUnsupported:
      return 'Rewrite the captured attribute or spread transfer so the runtime SpreadBinding can admit it.';
    default:
      return 'Rewrite the authored binding input so it matches Aurelia runtime binding semantics.';
  }
}

export function runtimeRendererIssueDiagnostic(
  issue: RuntimeRendererIssue,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): SemanticTemplateCursorDiagnosticRow {
  return {
    diagnosticKind: 'runtime-renderer-framework-error',
    diagnosticAuthority: 'framework-error-code',
    frameworkErrorCode: issue.frameworkErrorCode,
    severity: 'error',
    summary: `Aurelia runtime renderer ${issue.frameworkErrorCode ?? ''} rejects this instruction input: ${issue.message}.`,
    missingInput: issue.frameworkErrorCode == null
      ? `runtime-renderer:${issue.issueKind}`
      : `runtime-renderer:${issue.frameworkErrorCode}`,
    missingInputs: [
      issue.frameworkErrorCode == null
        ? `runtime-renderer:${issue.issueKind}`
        : `runtime-renderer:${issue.frameworkErrorCode}`,
    ],
    source,
    selectedMemberName: null,
    ownerTypeDisplay: null,
    ownerTypeShapeKind: null,
    ownerTypeOrigin: null,
    suggestion: {
      suggestionKind: 'fix-template-syntax',
      actionKind: 'rewrite-template-syntax',
      actionTarget: suggestionActionTarget('template-syntax', source, null, null),
      summary: runtimeRendererIssueSuggestion(issue),
      targetMemberName: null,
      ownerTypeDisplay: null,
      valueTypeDisplay: null,
      valueTypeSource: null,
    },
  };
}

function runtimeRendererIssueSuggestion(issue: RuntimeRendererIssue): string {
  switch (issue.issueKind) {
    case RuntimeRendererIssueKind.NotSupportedViewRefApi:
      return 'Use element.ref, controller.ref, component.ref, or a named custom-element/custom-attribute ref target instead of view.ref.';
    case RuntimeRendererIssueKind.RefHostIsNotCustomElement:
      return 'Use controller.ref or component.ref only on a custom element host, or use element.ref for ordinary DOM elements.';
    case RuntimeRendererIssueKind.NamedRefHostIsNotCustomElement:
      return 'Use a ref target that matches a custom attribute on this element, or place the named custom-element ref on that custom element host.';
    case RuntimeRendererIssueKind.RefTargetNotFound:
      return 'Use element.ref, controller.ref, component.ref, or a ref target that matches a custom element or custom attribute controller on the same element.';
    case RuntimeRendererIssueKind.SpreadingInvalidTarget:
      return 'Use spread value syntax only for custom-element bindable spreading, such as ...$bindables or $bindables.spread on a custom element.';
    default:
      return 'Rewrite the authored template instruction so it matches Aurelia renderer semantics.';
  }
}

export function runtimeBindingBehaviorIssueDiagnostic(
  issue: RuntimeBindingBehaviorIssue,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): SemanticTemplateCursorDiagnosticRow {
  const suggestion = runtimeBindingBehaviorIssueSuggestion(issue);
  return {
    diagnosticKind: 'runtime-binding-behavior-framework-error',
    diagnosticAuthority: 'framework-error-code',
    frameworkErrorCode: issue.frameworkErrorCode,
    severity: 'error',
    summary: `Aurelia runtime binding behavior ${issue.frameworkErrorCode ?? ''} rejects this binding: ${issue.message}.`,
    missingInput: issue.frameworkErrorCode == null
      ? `runtime-binding-behavior:${issue.issueKind}`
      : `runtime-binding-behavior:${issue.frameworkErrorCode}`,
    missingInputs: [
      issue.frameworkErrorCode == null
        ? `runtime-binding-behavior:${issue.issueKind}`
        : `runtime-binding-behavior:${issue.frameworkErrorCode}`,
    ],
    source,
    selectedMemberName: null,
    ownerTypeDisplay: null,
    ownerTypeShapeKind: null,
    ownerTypeOrigin: null,
    suggestion: {
      suggestionKind: 'fix-template-syntax',
      actionKind: 'rewrite-template-syntax',
      actionTarget: suggestionActionTarget('template-syntax', source, null, null),
      summary: suggestion,
      targetMemberName: null,
      ownerTypeDisplay: null,
      valueTypeDisplay: null,
      valueTypeSource: null,
    },
  };
}

function runtimeBindingBehaviorIssueSuggestion(issue: RuntimeBindingBehaviorIssue): string {
  switch (issue.issueKind) {
    case RuntimeBindingBehaviorIssueKind.BindingAlreadyHasRateLimited:
      return 'Keep only one rate-limiting behavior on this binding, or combine the behavior arguments into one rate limiter.';
    case RuntimeBindingBehaviorIssueKind.BindingAlreadyHasTargetSubscriber:
      return 'Keep only one target-subscriber binding behavior on this binding, or combine the subscriber behavior into one custom binding behavior.';
    case RuntimeBindingBehaviorIssueKind.AttrInvalidBinding:
      return 'Use attr only on property bindings that can route through AttributeBindingBehavior.';
    case RuntimeBindingBehaviorIssueKind.SelfInvalidUsage:
      return 'Use self only on listener bindings created by trigger or capture.';
    case RuntimeBindingBehaviorIssueKind.SignalInvalidUsage:
    case RuntimeBindingBehaviorIssueKind.SignalNoSignals:
      return 'Use signal only on bindings with handleChange and at least one signal name.';
    case RuntimeBindingBehaviorIssueKind.UpdateTriggerInvalidUsage:
    case RuntimeBindingBehaviorIssueKind.UpdateTriggerNoTriggers:
    case RuntimeBindingBehaviorIssueKind.UpdateTriggerNodePropertyNotObservable:
      return 'Use updateTrigger only on two-way/from-view property bindings with at least one event argument and a NodeObserverLocator event-backed target.';
    case RuntimeBindingBehaviorIssueKind.ValidateInvalidBindingType:
    case RuntimeBindingBehaviorIssueKind.ValidateInvalidBindingTarget:
      return 'Use validate on a two-way/from-view property binding whose target is a DOM node or custom-element view model.';
    case RuntimeBindingBehaviorIssueKind.ValidateInvalidTriggerName:
      return 'Use one of the ValidationTrigger names: manual, blur, focusout, change, changeOrBlur, or changeOrFocusout.';
    case RuntimeBindingBehaviorIssueKind.ValidateInvalidController:
      return 'Pass nullish or a ValidationController instance as the second validate argument.';
    case RuntimeBindingBehaviorIssueKind.ValidateExtraneousArguments:
      return 'Keep validate arguments to trigger, controller, and rules.';
    case RuntimeBindingBehaviorIssueKind.ValidationControllerUnknownExpression:
      return 'Bind validate to a property path rooted in the binding scope, such as person.name or person[addressKey].';
  }
}

export function runtimeValueConverterIssueDiagnostic(
  issue: RuntimeValueConverterIssue,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): SemanticTemplateCursorDiagnosticRow {
  return {
    diagnosticKind: 'runtime-value-converter-framework-error',
    diagnosticAuthority: 'framework-error-code',
    frameworkErrorCode: issue.frameworkErrorCode,
    severity: 'error',
    summary: `Aurelia runtime value converter ${issue.frameworkErrorCode} rejects this binding: ${issue.message}.`,
    missingInput: `runtime-value-converter:${issue.frameworkErrorCode}`,
    missingInputs: [`runtime-value-converter:${issue.frameworkErrorCode}`],
    source,
    selectedMemberName: null,
    ownerTypeDisplay: null,
    ownerTypeShapeKind: null,
    ownerTypeOrigin: null,
    suggestion: {
      suggestionKind: 'register-di-service',
      actionKind: 'register-service',
      actionTarget: suggestionActionTarget('service', source, 'ISanitizer', null),
      summary: 'Register an app ISanitizer implementation before using the built-in sanitize value converter.',
      targetMemberName: 'ISanitizer',
      ownerTypeDisplay: null,
      valueTypeDisplay: null,
      valueTypeSource: null,
    },
  };
}

export function expressionRuntimeEvaluationErrorDiagnostic(
  frameworkErrorCode: RuntimeAstFrameworkErrorCode | RuntimeHtmlAstFrameworkErrorCode,
  message: string,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
  selectedMemberName: string | null,
): SemanticTemplateCursorDiagnosticRow {
  const suggestion = expressionRuntimeEvaluationSuggestion(frameworkErrorCode, source, selectedMemberName);
  return {
    diagnosticKind: 'expression-runtime-evaluation-error',
    diagnosticAuthority: 'framework-error-code',
    frameworkErrorCode,
    severity: 'error',
    summary: `Aurelia runtime astEvaluate ${frameworkErrorCode} rejects this template expression: ${message}.`,
    missingInput: `runtime-ast:${frameworkErrorCode}`,
    missingInputs: [`runtime-ast:${frameworkErrorCode}`],
    source,
    selectedMemberName,
    ownerTypeDisplay: null,
    ownerTypeShapeKind: null,
    ownerTypeOrigin: null,
    suggestion: {
      suggestionKind: suggestion.suggestionKind,
      actionKind: suggestion.actionKind,
      actionTarget: suggestion.actionTarget,
      summary: suggestion.summary,
      targetMemberName: selectedMemberName,
      ownerTypeDisplay: null,
      valueTypeDisplay: null,
      valueTypeSource: null,
    },
  };
}

function expressionRuntimeEvaluationSuggestion(
  frameworkErrorCode: RuntimeAstFrameworkErrorCode | RuntimeHtmlAstFrameworkErrorCode,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
  selectedMemberName: string | null,
): Pick<SemanticTemplateCursorSuggestionRow, 'suggestionKind' | 'actionKind' | 'actionTarget' | 'summary'> {
  switch (frameworkErrorCode) {
    case RuntimeAstFrameworkErrorCode.AstHostNotFound:
      return {
        suggestionKind: 'resolve-runtime-boundary',
        actionKind: 'declare-runtime-boundary',
        actionTarget: suggestionActionTarget('runtime-boundary', source, '$host', null),
        summary: 'Use $host only in a template scope that supplies the Aurelia host context, such as an au-slot boundary.',
      };
    case RuntimeHtmlAstFrameworkErrorCodes.AstConverterNotFound:
      return {
        suggestionKind: 'register-resource',
        actionKind: 'register-resource',
        actionTarget: suggestionActionTarget('resource', source, selectedMemberName, 'value-converter'),
        summary: 'Register or import a value converter with this name into the compiler resource scope.',
      };
    case RuntimeHtmlAstFrameworkErrorCodes.AstBehaviorNotFound:
      return {
        suggestionKind: 'register-resource',
        actionKind: 'register-resource',
        actionTarget: suggestionActionTarget('resource', source, selectedMemberName, 'binding-behavior'),
        summary: 'Register or import a binding behavior with this name into the compiler resource scope.',
      };
    case RuntimeHtmlAstFrameworkErrorCodes.AstBehaviorDuplicated:
      return {
        suggestionKind: 'remove-duplicate-binding-behavior',
        actionKind: 'rewrite-expression',
        actionTarget: suggestionActionTarget('expression', source, selectedMemberName, null),
        summary: 'Remove the duplicate binding behavior application or combine the behavior arguments into one application.',
      };
    case RuntimeAstFrameworkErrorCode.AstNullishMemberAccess:
    case RuntimeAstFrameworkErrorCode.AstNullishKeyedAccess:
      return {
        suggestionKind: 'guard-nullish-expression',
        actionKind: 'rewrite-expression',
        actionTarget: suggestionActionTarget('expression', source, selectedMemberName, null),
        summary: 'Guard the nullish owner with optional chaining, a fallback, or a template controller that narrows the value before access.',
      };
    case RuntimeAstFrameworkErrorCode.AstIncrementInfiniteLoop:
      return {
        suggestionKind: 'avoid-observed-increment',
        actionKind: 'rewrite-expression',
        actionTarget: suggestionActionTarget('expression', source, selectedMemberName, null),
        summary: 'Move the increment into an event handler or method so observed source-to-target evaluation does not mutate while collecting dependencies.',
      };
    default:
      return {
        suggestionKind: 'use-callable-expression',
        actionKind: 'rewrite-expression',
        actionTarget: suggestionActionTarget('expression', source, selectedMemberName, null),
        summary: 'Rewrite the expression so the runtime call target is callable in this binding scope.',
      };
  }
}

export function runtimeBindingScopeIssueDiagnostic(
  issue: RuntimeBindingScopeIssue,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): SemanticTemplateCursorDiagnosticRow {
  if (issue.issueKind === RuntimeBindingScopeIssueKind.RepeatNonIterable) {
    return repeatNonIterableDiagnostic(issue, source);
  }
  return {
    diagnosticKind: 'runtime-binding-scope-framework-error',
    diagnosticAuthority: 'framework-error-code',
    frameworkErrorCode: issue.frameworkErrorCode,
    severity: issue.certainty === RuntimeBindingScopeIssueCertainty.Definite ? 'error' : 'warning',
    summary: issue.certainty === RuntimeBindingScopeIssueCertainty.Definite
      ? `Aurelia runtime astAssign ${issue.frameworkErrorCode ?? ''} rejects this repeat destructuring source: ${issue.message}.`
      : `Aurelia runtime astAssign ${issue.frameworkErrorCode ?? ''} may reject this repeat destructuring source: ${issue.message}.`,
    missingInput: issue.frameworkErrorCode == null
      ? `runtime-binding-scope:${issue.issueKind}`
      : `runtime-binding-scope:${issue.frameworkErrorCode}`,
    missingInputs: [
      issue.frameworkErrorCode == null
        ? `runtime-binding-scope:${issue.issueKind}`
        : `runtime-binding-scope:${issue.frameworkErrorCode}`,
    ],
    source,
    selectedMemberName: null,
    ownerTypeDisplay: issue.sourceType?.display ?? null,
    ownerTypeShapeKind: issue.sourceType?.shapeKind ?? null,
    ownerTypeOrigin: issue.sourceType?.origin ?? null,
    suggestion: {
      suggestionKind: 'use-safe-destructuring-source',
      actionKind: 'rewrite-expression',
      actionTarget: suggestionActionTarget('expression', source, null, issue.sourceType?.display ?? null),
      summary: 'Ensure the repeat item source is object-shaped before destructuring, or guard the repeat with template control flow.',
      targetMemberName: null,
      ownerTypeDisplay: issue.sourceType?.display ?? null,
      valueTypeDisplay: null,
      valueTypeSource: null,
    },
  };
}

export function routerIssueDiagnostic(
  issue: RouterIssueModel,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): SemanticTemplateCursorDiagnosticRow {
  return {
    diagnosticKind: 'router-framework-error',
    diagnosticAuthority: issue.frameworkErrorCode == null ? 'framework-runtime-behavior' : 'framework-error-code',
    frameworkErrorCode: issue.frameworkErrorCode,
    severity: issue.severity,
    summary: issue.message,
    missingInput: `router:${issue.issueKind}`,
    missingInputs: [`router:${issue.issueKind}`],
    source,
    selectedMemberName: null,
    ownerTypeDisplay: null,
    ownerTypeShapeKind: null,
    ownerTypeOrigin: null,
    suggestion: {
      suggestionKind: 'fix-router-instruction',
      actionKind: 'rewrite-expression',
      actionTarget: suggestionActionTarget('expression', source, null, issue.expected),
      summary: 'Rewrite the router instruction to a route string, routeable component, or viewport instruction that the router can materialize.',
      targetMemberName: null,
      ownerTypeDisplay: null,
      valueTypeDisplay: issue.expected,
      valueTypeSource: null,
    },
  };
}

function repeatNonIterableDiagnostic(
  issue: RuntimeBindingScopeIssue,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): SemanticTemplateCursorDiagnosticRow {
  return {
    diagnosticKind: 'runtime-binding-scope-framework-error',
    diagnosticAuthority: 'framework-error-code',
    frameworkErrorCode: issue.frameworkErrorCode,
    severity: issue.certainty === RuntimeBindingScopeIssueCertainty.Definite ? 'error' : 'warning',
    summary: issue.certainty === RuntimeBindingScopeIssueCertainty.Definite
      ? `Aurelia runtime repeat ${issue.frameworkErrorCode ?? ''} rejects this repeat source: ${issue.message}.`
      : `Aurelia runtime repeat ${issue.frameworkErrorCode ?? ''} may reject this repeat source unless an app IRepeatableHandler handles it: ${issue.message}.`,
    missingInput: issue.frameworkErrorCode == null
      ? `runtime-repeat:${issue.issueKind}`
      : `runtime-repeat:${issue.frameworkErrorCode}`,
    missingInputs: [
      issue.frameworkErrorCode == null
        ? `runtime-repeat:${issue.issueKind}`
        : `runtime-repeat:${issue.frameworkErrorCode}`,
    ],
    source,
    selectedMemberName: null,
    ownerTypeDisplay: issue.sourceType?.display ?? null,
    ownerTypeShapeKind: issue.sourceType?.shapeKind ?? null,
    ownerTypeOrigin: issue.sourceType?.origin ?? null,
    suggestion: {
      suggestionKind: 'use-repeatable-source',
      actionKind: 'rewrite-expression',
      actionTarget: suggestionActionTarget('expression', source, null, issue.sourceType?.display ?? null),
      summary: 'Use an array, set, map, number, nullish guard, or a source with an app-registered repeatable handler.',
      targetMemberName: null,
      ownerTypeDisplay: issue.sourceType?.display ?? null,
      valueTypeDisplay: null,
      valueTypeSource: null,
    },
  };
}

export function bindingTargetAccessFrameworkErrorDiagnostic(
  targetAccess: RuntimeBindingTargetAccess,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): SemanticTemplateCursorDiagnosticRow | null {
  if (targetAccess.frameworkErrorCode == null) {
    return null;
  }
  return {
    diagnosticKind: 'binding-target-access-framework-error',
    diagnosticAuthority: 'framework-error-code',
    frameworkErrorCode: targetAccess.frameworkErrorCode,
    severity: 'error',
    summary: targetAccess.diagnosticReason
      ?? `Aurelia runtime ${targetAccess.frameworkErrorCode} rejects this binding target observer lookup.`,
    missingInput: `binding-target-access:${targetAccess.frameworkErrorCode}`,
    missingInputs: [`binding-target-access:${targetAccess.frameworkErrorCode}`],
    source,
    selectedMemberName: targetAccess.targetProperty,
    ownerTypeDisplay: targetAccess.targetType?.display ?? null,
    ownerTypeShapeKind: null,
    ownerTypeOrigin: targetAccess.targetType?.origin ?? null,
    suggestion: bindingTargetAccessFrameworkErrorSuggestion(targetAccess, source),
  };
}

function bindingTargetAccessFrameworkErrorSuggestion(
  targetAccess: RuntimeBindingTargetAccess,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): SemanticTemplateCursorSuggestionRow | null {
  if (targetAccess.frameworkErrorCode !== RuntimeHtmlObservationFrameworkErrorCode.NodeObserverStrategyNotFound) {
    return null;
  }
  return {
    suggestionKind: 'configure-node-observer',
    actionKind: 'configure-observer',
    actionTarget: suggestionActionTarget(
      'observer-config',
      source,
      targetAccess.targetProperty,
      targetAccess.targetType?.display ?? null,
    ),
    summary:
      `Configure NodeObserverLocator.useConfig(...) for '${targetAccess.targetProperty}' or change the binding target to a framework-supported observable property/attribute.`,
    targetMemberName: targetAccess.targetProperty,
    ownerTypeDisplay: targetAccess.targetType?.display ?? null,
    valueTypeDisplay: targetAccess.propertyType?.display ?? null,
    valueTypeSource: 'binding-target',
  };
}

type BindingSourceAssignmentSuggestionPolicy = {
  readonly suggestionKind: SemanticTemplateCursorSuggestionRow['suggestionKind'];
  readonly actionKind: SemanticTemplateCursorSuggestionRow['actionKind'];
  readonly actionTarget: SemanticTemplateCursorSuggestionActionTargetRow;
  readonly summary: string;
  readonly valueTypeSource: SemanticTemplateCursorSuggestionValueTypeSource | null;
};

function bindingSourceAssignmentSuggestion(
  dataFlow: RuntimeBindingDataFlow,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
  ownerSource: SemanticSourceReference | null,
  reasonKinds: readonly RuntimeBindingDataFlowSourceAssignmentReasonKind[],
  runtimeNoop: boolean,
  valueTypeDisplay: string | null,
): BindingSourceAssignmentSuggestionPolicy {
  if (runtimeNoop) {
    if (reasonKinds.includes(RuntimeBindingDataFlowSourceAssignmentReasonKind.NullishAssignment)) {
      return {
        suggestionKind: 'guard-nullish-expression',
        actionKind: 'rewrite-expression',
        actionTarget: suggestionActionTarget('expression', source, dataFlow.sourceName, null),
        summary: 'Initialize or guard the nullish owner before writing through the member or keyed assignment target.',
        valueTypeSource: null,
      };
    }
    return {
      suggestionKind: 'use-assignable-expression',
      actionKind: 'rewrite-expression',
      actionTarget: suggestionActionTarget('expression', source, dataFlow.sourceName, null),
      summary: 'Use an assignable Aurelia expression such as a scope, member, keyed, value-converter, or binding-behavior target.',
      valueTypeSource: null,
    };
  }

  if (bindingSourceAssignmentHasMissingMember(reasonKinds)) {
    return {
      suggestionKind: 'declare-assignable-member',
      actionKind: 'declare-member',
      actionTarget: bindingSourceAssignmentActionTarget(dataFlow, source, ownerSource, true),
      summary: 'Declare the assigned source on the view-model, state, or template scope type so TypeScript and Aurelia runtime assignment agree.',
      valueTypeSource: valueTypeDisplay == null ? null : 'assignment-target',
    };
  }

  if (bindingSourceAssignmentHasReadonlySource(reasonKinds)) {
    return {
      suggestionKind: 'make-source-writable',
      actionKind: 'change-member-mutability',
      actionTarget: bindingSourceAssignmentActionTarget(dataFlow, source, ownerSource, false),
      summary: 'Make the source member writable, add a setter, or bind writeback to a writable state slot.',
      valueTypeSource: valueTypeDisplay == null ? null : 'assignment-target',
    };
  }

  if (reasonKinds.includes(RuntimeBindingDataFlowSourceAssignmentReasonKind.TargetToSourceTypeMismatch)) {
    return {
      suggestionKind: 'align-assignment-type',
      actionKind: 'change-member-type',
      actionTarget: bindingSourceAssignmentActionTarget(dataFlow, source, ownerSource, false),
      summary: 'Align the source member type with the value written by the target observer, or narrow the target value channel.',
      valueTypeSource: valueTypeDisplay == null ? null : 'assignment-target',
    };
  }

  return {
    suggestionKind: 'inspect-owner-type',
    actionKind: 'inspect-owner-type',
    actionTarget: bindingSourceAssignmentActionTarget(dataFlow, source, ownerSource, false),
    summary: 'Inspect the source and owner type before choosing whether app source, runtime policy, or semantic substrate should change.',
    valueTypeSource: valueTypeDisplay == null ? null : 'assignment-target',
  };
}

function bindingSourceAssignmentHasMissingMember(
  reasonKinds: readonly RuntimeBindingDataFlowSourceAssignmentReasonKind[],
): boolean {
  return reasonKinds.includes(RuntimeBindingDataFlowSourceAssignmentReasonKind.ScopeSlotMissingTypeCheckerMember)
    || reasonKinds.includes(RuntimeBindingDataFlowSourceAssignmentReasonKind.OwnerMemberNotProjected)
    || reasonKinds.includes(RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberDeclarationMissing);
}

function bindingSourceAssignmentHasReadonlySource(
  reasonKinds: readonly RuntimeBindingDataFlowSourceAssignmentReasonKind[],
): boolean {
  return reasonKinds.includes(RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberReadonly)
    || reasonKinds.includes(RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberGetterWithoutSetter);
}

function readOwnerType(
  store: KernelStore,
  productHandle: ProductHandle | null,
) {
  return productHandle == null
    ? null
    : store.productDetails.read(TypeSystemProductDetails.TypeShape, productHandle);
}

function memberOwnerTypeActionSource(
  memberOwnerType: SemanticTemplateCursorInfoResult['memberOwnerType'],
): SemanticTemplateCursorDiagnosticRow['source'] {
  return memberOwnerType?.declarationSource ?? memberOwnerType?.source ?? null;
}

function missingOwnerTypeDiagnostic(
  store: KernelStore,
  missingInputs: readonly string[],
  source: SemanticTemplateCursorDiagnosticRow['source'],
  selectedMemberName: string,
  memberOwnerType: SemanticTemplateCursorInfoResult['memberOwnerType'],
  memberOwnerTypeOpenSubject: CheckerExpressionTypeOpenSubject | null,
  expectedValueTypeDisplay: string | null,
  expectedValueTypeSource: SemanticTemplateCursorSuggestionValueTypeSource | null,
): readonly SemanticTemplateCursorDiagnosticRow[] {
  const missingInput = expressionMemberOwnerTypeMissingInput(missingInputs);
  if (missingInput == null) {
    return [];
  }
  const missingScopeSlot = missingInput === 'expression-member-owner-type:missing-slot-type';
  const subjectTarget = missingOwnerSubjectActionTarget(store, memberOwnerTypeOpenSubject);
  const actionTarget = missingScopeSlot && subjectTarget != null
    ? subjectTarget
    : missingScopeSlot
      ? suggestionActionTarget('scope-slot', source, selectedMemberName, null)
      : suggestionActionTarget('owner-type', memberOwnerTypeActionSource(memberOwnerType) ?? source, selectedMemberName, memberOwnerType?.display ?? null);
  return [weakOwnerDiagnostic(
    missingInput,
    expressionMemberOwnerTypeMissingSummary(missingInput),
    source,
    selectedMemberName,
    memberOwnerType,
    {
      suggestionKind: missingScopeSlot ? 'declare-scope-slot-type' : 'inspect-owner-type',
      actionKind: missingScopeSlot ? 'declare-scope-slot' : 'inspect-owner-type',
      actionTarget,
      summary: missingScopeSlot
        ? 'Declare or infer the template scope slot type so member access can be checked and navigated.'
        : 'Check whether the member owner expression can be typed by the current template scope and TypeChecker project.',
      targetMemberName: selectedMemberName,
      ownerTypeDisplay: memberOwnerType?.display ?? null,
      valueTypeDisplay: expectedValueTypeDisplay,
      valueTypeSource: expectedValueTypeDisplay == null ? null : expectedValueTypeSource,
    },
  )];
}

function indexSignatureOwnerDiagnostic(
  source: SemanticTemplateCursorDiagnosticRow['source'],
  selectedMemberName: string,
  selectedMember: SemanticTemplateCursorMemberRow,
  memberOwnerType: SemanticTemplateCursorInfoResult['memberOwnerType'],
): SemanticTemplateCursorDiagnosticRow {
  return weakOwnerDiagnostic(
    'expression-member-owner-type:index-signature-only',
    'Member access is backed by an index signature, so completion cannot enumerate concrete property names.',
    source,
    selectedMemberName,
    memberOwnerType,
    {
      suggestionKind: 'declare-explicit-member',
      actionKind: 'declare-member',
      actionTarget: suggestionActionTarget('owner-type', memberOwnerTypeActionSource(memberOwnerType), selectedMemberName, memberOwnerType?.display ?? null),
      summary: 'Declare a typed property on the owner type, or replace the broad index-signature record with an interface that includes this member.',
      targetMemberName: selectedMemberName,
      ownerTypeDisplay: memberOwnerType?.display ?? null,
      valueTypeDisplay: selectedMember.typeDisplay,
      valueTypeSource: selectedMember.typeDisplay == null ? null : 'selected-member',
    },
  );
}

function anyOwnerDiagnostic(
  source: SemanticTemplateCursorDiagnosticRow['source'],
  selectedMemberName: string,
  memberOwnerType: SemanticTemplateCursorInfoResult['memberOwnerType'],
  expectedValueTypeDisplay: string | null,
  expectedValueTypeSource: SemanticTemplateCursorSuggestionValueTypeSource | null,
): SemanticTemplateCursorDiagnosticRow {
  return weakOwnerDiagnostic(
    'expression-member-owner-type:any',
    'Member access is backed by any, so the runtime can evaluate it but semantic tooling cannot prove the member surface.',
    source,
    selectedMemberName,
    memberOwnerType,
    {
      suggestionKind: 'replace-any-owner',
      actionKind: 'replace-owner-type',
      actionTarget: suggestionActionTarget('owner-type', memberOwnerTypeActionSource(memberOwnerType), selectedMemberName, memberOwnerType?.display ?? null),
      summary: 'Replace the any-typed owner with a named interface or class so template tooling can project members.',
      targetMemberName: selectedMemberName,
      ownerTypeDisplay: memberOwnerType?.display ?? null,
      valueTypeDisplay: expectedValueTypeDisplay,
      valueTypeSource: expectedValueTypeDisplay == null ? null : expectedValueTypeSource,
    },
  );
}

function emptyOwnerDiagnostic(
  source: SemanticTemplateCursorDiagnosticRow['source'],
  selectedMemberName: string,
  memberOwnerType: SemanticTemplateCursorInfoResult['memberOwnerType'],
  expectedValueTypeDisplay: string | null,
  expectedValueTypeSource: SemanticTemplateCursorSuggestionValueTypeSource | null,
): SemanticTemplateCursorDiagnosticRow {
  return weakOwnerDiagnostic(
    'expression-member-owner-type:no-members',
    'The owner type has no projected members at this cursor, so the selected member cannot be validated or navigated.',
    source,
    selectedMemberName,
    memberOwnerType,
    {
      suggestionKind: 'inspect-owner-type',
      actionKind: 'inspect-owner-type',
      actionTarget: suggestionActionTarget('owner-type', memberOwnerTypeActionSource(memberOwnerType), selectedMemberName, memberOwnerType?.display ?? null),
      summary: 'Check whether the owner expression has the intended declared type and whether that type is visible to the TypeChecker.',
      targetMemberName: selectedMemberName,
      ownerTypeDisplay: memberOwnerType?.display ?? null,
      valueTypeDisplay: expectedValueTypeDisplay,
      valueTypeSource: expectedValueTypeDisplay == null ? null : expectedValueTypeSource,
    },
  );
}

function missingMemberDiagnostic(
  source: SemanticTemplateCursorDiagnosticRow['source'],
  selectedMemberName: string,
  ownerTypeShapeKind: CheckerTypeShapeKind,
  memberOwnerType: SemanticTemplateCursorInfoResult['memberOwnerType'],
  expectedValueTypeDisplay: string | null,
  expectedValueTypeSource: SemanticTemplateCursorSuggestionValueTypeSource | null,
): SemanticTemplateCursorDiagnosticRow {
  const declareMember = missingMemberCanBeDeclared(ownerTypeShapeKind);
  return {
    diagnosticKind: 'missing-expression-member',
    diagnosticAuthority: 'semantic-authoring-policy',
    frameworkErrorCode: null,
    severity: declareMember ? 'warning' : 'information',
    summary: 'The selected member is not projected on the owner type, so semantic tooling cannot validate or navigate it.',
    missingInput: 'expression-member:selected-member-missing',
    missingInputs: ['expression-member:selected-member-missing'],
    source,
    selectedMemberName,
    ownerTypeDisplay: memberOwnerType?.display ?? null,
    ownerTypeShapeKind: memberOwnerType?.shapeKind ?? ownerTypeShapeKind,
    ownerTypeOrigin: memberOwnerType?.origin ?? null,
    suggestion: {
      suggestionKind: declareMember ? 'declare-explicit-member' : 'inspect-owner-type',
      actionKind: declareMember ? 'declare-member' : 'inspect-owner-type',
      actionTarget: suggestionActionTarget('owner-type', memberOwnerTypeActionSource(memberOwnerType), selectedMemberName, memberOwnerType?.display ?? null),
      summary: declareMember
        ? 'Declare this member on the owner type, or change the expression so it targets the type that actually owns the member.'
        : 'Inspect the owner expression type; the member may belong on a callback return type, model type, or different expression.',
      targetMemberName: selectedMemberName,
      ownerTypeDisplay: memberOwnerType?.display ?? null,
      valueTypeDisplay: expectedValueTypeDisplay,
      valueTypeSource: expectedValueTypeDisplay == null ? null : expectedValueTypeSource,
    },
  };
}

function missingMemberCanBeDeclared(ownerTypeShapeKind: CheckerTypeShapeKind): boolean {
  switch (ownerTypeShapeKind) {
    case CheckerTypeShapeKind.Class:
    case CheckerTypeShapeKind.Interface:
    case CheckerTypeShapeKind.Object:
      return true;
    default:
      return false;
  }
}

function noMembersOwnerTypeIsWeak(ownerTypeShapeKind: CheckerTypeShapeKind): boolean {
  switch (ownerTypeShapeKind) {
    case CheckerTypeShapeKind.Any:
    case CheckerTypeShapeKind.Unknown:
    case CheckerTypeShapeKind.TypeParameter:
    case CheckerTypeShapeKind.Unclassified:
      return true;
    default:
      return false;
  }
}

function bindingSourceAssignmentSummary(
  dataFlow: RuntimeBindingDataFlow,
  runtimeNoop: boolean,
): string {
  return dataFlow.sourceAssignmentReason
    ?? (runtimeNoop
      ? 'Aurelia runtime assignment does not update the binding source for this expression shape.'
      : 'Binding assignment is accepted by Aurelia runtime semantics, but TypeScript cannot prove the source write.');
}

function bindingSourceAssignmentActionTarget(
  dataFlow: RuntimeBindingDataFlow,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
  ownerSource: SemanticSourceReference | null,
  preferScopeSlot: boolean,
): SemanticTemplateCursorSuggestionActionTargetRow {
  if (ownerSource == null && preferScopeSlot) {
    return suggestionActionTarget('scope-slot', source, dataFlow.sourceName, null);
  }
  return suggestionActionTarget(
    'owner-type',
    ownerSource,
    dataFlow.sourceName,
    dataFlow.sourceAssignmentTargetType?.display ?? dataFlow.sourceType?.display ?? null,
  );
}

function expressionMemberOwnerTypeMissingInput(
  missingInputs: readonly string[],
): string | null {
  return missingInputs.find((missingInput) =>
    missingInput.startsWith('expression-member-owner-type:')
  ) ?? null;
}

function expressionMemberOwnerTypeMissingSummary(
  missingInput: string,
): string {
  if (missingInput === 'expression-member-owner-type:missing-slot-type') {
    return 'The member owner comes from a template scope slot whose TypeScript type is not available, so the selected member cannot be validated or navigated.';
  }
  return 'The member owner expression could not be typed, so the selected member cannot be validated or navigated.';
}

function missingOwnerSubjectActionTarget(
  store: KernelStore,
  subject: CheckerExpressionTypeOpenSubject | null,
): SemanticTemplateCursorSuggestionActionTargetRow | null {
  if (subject?.subjectKind !== 'scope-slot') {
    return null;
  }
  return suggestionActionTarget(
    'scope-slot',
    describeAddress(store, subject.sourceAddressHandle),
    subject.name,
    subject.typeReference?.display ?? null,
  );
}

function weakOwnerDiagnostic(
  missingInput: string,
  summary: string,
  source: SemanticTemplateCursorDiagnosticRow['source'],
  selectedMemberName: string,
  memberOwnerType: SemanticTemplateCursorInfoResult['memberOwnerType'],
  suggestion: NonNullable<SemanticTemplateCursorDiagnosticRow['suggestion']>,
): SemanticTemplateCursorDiagnosticRow {
  return {
    diagnosticKind: 'weak-expression-member-owner',
    diagnosticAuthority: 'semantic-authoring-policy',
    frameworkErrorCode: null,
    severity: 'information',
    summary,
    missingInput,
    missingInputs: [missingInput],
    source,
    selectedMemberName,
    ownerTypeDisplay: memberOwnerType?.display ?? null,
    ownerTypeShapeKind: memberOwnerType?.shapeKind ?? null,
    ownerTypeOrigin: memberOwnerType?.origin ?? null,
    suggestion,
  };
}

function suggestionActionTarget(
  targetKind: SemanticTemplateCursorSuggestionActionTargetRow['targetKind'],
  source: SemanticSourceReference | null,
  memberName: string | null,
  typeDisplay: string | null,
): SemanticTemplateCursorSuggestionActionTargetRow {
  return {
    targetKind,
    source,
    memberName,
    typeDisplay,
  };
}
