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
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import {
  CheckerTypeMemberKind,
  CheckerTypeShapeKind,
} from '../type-system/type-shape.js';
import type {
  SemanticTemplateCursorDiagnosticRow,
  SemanticTemplateCursorInfoResult,
  SemanticTemplateCursorMemberRow,
  SemanticTemplateCursorSuggestionActionTargetRow,
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
  source: SemanticTemplateCursorDiagnosticRow['source'],
): readonly SemanticTemplateCursorDiagnosticRow[] {
  if (siteKind !== TemplateCompletionSiteKind.ExpressionMember || selectedMemberName == null) {
    return [];
  }

  const ownerType = readOwnerType(store, memberOwnerTypeProductHandle);
  if (ownerType == null) {
    return missingOwnerTypeDiagnostic(missingInputs, source, selectedMemberName, memberOwnerType);
  }

  if (selectedMember?.memberKind === CheckerTypeMemberKind.IndexSignature) {
    return [indexSignatureOwnerDiagnostic(source, selectedMemberName, selectedMember, memberOwnerType)];
  }
  if (ownerType.shapeKind === CheckerTypeShapeKind.Any) {
    return [anyOwnerDiagnostic(source, selectedMemberName, memberOwnerType)];
  }
  if (ownerType.members.length === 0 && selectedMember == null) {
    return [emptyOwnerDiagnostic(source, selectedMemberName, memberOwnerType)];
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
  const declareMember = reasonKinds.includes(RuntimeBindingDataFlowSourceAssignmentReasonKind.ScopeSlotMissingTypeCheckerMember);
  const ownerSource = describeAddress(
    store,
    dataFlow.sourceAssignmentTargetType?.sourceAddressHandle
      ?? dataFlow.sourceType?.sourceAddressHandle
      ?? null,
  );
  const valueTypeDisplay = dataFlow.targetValueType?.display ?? dataFlow.targetPropertyType?.display ?? null;

  return {
    diagnosticKind,
    diagnosticAuthority: runtimeNoop
      ? 'framework-runtime-behavior'
      : 'semantic-authoring-policy',
    frameworkErrorCode: null,
    severity: 'warning',
    summary: bindingSourceAssignmentSummary(dataFlow, runtimeNoop),
    missingInput: `binding-source-assignment:${primaryReasonKind}`,
    missingInputs: reasonKinds.map((reasonKind) => `binding-source-assignment:${reasonKind}`),
    source,
    selectedMemberName: dataFlow.sourceName,
    ownerTypeDisplay: dataFlow.sourceType?.display ?? null,
    ownerTypeShapeKind: null,
    ownerTypeOrigin: null,
    suggestion: {
      suggestionKind: runtimeNoop
        ? 'use-assignable-expression'
        : declareMember
        ? 'declare-assignable-member'
        : 'inspect-owner-type',
      actionKind: runtimeNoop
        ? 'rewrite-expression'
        : declareMember
        ? 'declare-member'
        : 'inspect-owner-type',
      actionTarget: bindingSourceAssignmentActionTarget(dataFlow, source, ownerSource, runtimeNoop, declareMember),
      summary: runtimeNoop
        ? 'Use an assignable Aurelia expression such as a scope, member, keyed, value-converter, or binding-behavior target.'
        : 'Declare the assigned source on the view-model or state type so TypeScript and template tooling agree with Aurelia runtime assignment.',
      targetMemberName: dataFlow.sourceName,
      ownerTypeDisplay: dataFlow.sourceAssignmentTargetType?.display ?? dataFlow.sourceType?.display ?? null,
      valueTypeDisplay,
    },
  };
}

function readOwnerType(
  store: KernelStore,
  productHandle: ProductHandle | null,
) {
  return productHandle == null
    ? null
    : store.productDetails.read(TypeSystemProductDetails.TypeShape, productHandle);
}

function missingOwnerTypeDiagnostic(
  missingInputs: readonly string[],
  source: SemanticTemplateCursorDiagnosticRow['source'],
  selectedMemberName: string,
  memberOwnerType: SemanticTemplateCursorInfoResult['memberOwnerType'],
): readonly SemanticTemplateCursorDiagnosticRow[] {
  const missingInput = expressionMemberOwnerTypeMissingInput(missingInputs);
  if (missingInput == null) {
    return [];
  }
  const missingScopeSlot = missingInput === 'expression-member-owner-type:missing-slot-type';
  return [weakOwnerDiagnostic(
    missingInput,
    expressionMemberOwnerTypeMissingSummary(missingInput),
    source,
    selectedMemberName,
    memberOwnerType,
    {
      suggestionKind: missingScopeSlot ? 'declare-scope-slot-type' : 'inspect-owner-type',
      actionKind: missingScopeSlot ? 'declare-scope-slot' : 'inspect-owner-type',
      actionTarget: missingScopeSlot
        ? suggestionActionTarget('scope-slot', source, selectedMemberName, null)
        : suggestionActionTarget('owner-type', memberOwnerType?.source ?? source, selectedMemberName, memberOwnerType?.display ?? null),
      summary: missingScopeSlot
        ? 'Declare or infer the template scope slot type so member access can be checked and navigated.'
        : 'Check whether the member owner expression can be typed by the current template scope and TypeChecker project.',
      targetMemberName: selectedMemberName,
      ownerTypeDisplay: memberOwnerType?.display ?? null,
      valueTypeDisplay: null,
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
      actionTarget: suggestionActionTarget('owner-type', memberOwnerType?.source ?? null, selectedMemberName, memberOwnerType?.display ?? null),
      summary: 'Declare a typed property on the owner type, or replace the broad index-signature record with an interface that includes this member.',
      targetMemberName: selectedMemberName,
      ownerTypeDisplay: memberOwnerType?.display ?? null,
      valueTypeDisplay: selectedMember.typeDisplay,
    },
  );
}

function anyOwnerDiagnostic(
  source: SemanticTemplateCursorDiagnosticRow['source'],
  selectedMemberName: string,
  memberOwnerType: SemanticTemplateCursorInfoResult['memberOwnerType'],
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
      actionTarget: suggestionActionTarget('owner-type', memberOwnerType?.source ?? null, selectedMemberName, memberOwnerType?.display ?? null),
      summary: 'Replace the any-typed owner with a named interface or class so template tooling can project members.',
      targetMemberName: selectedMemberName,
      ownerTypeDisplay: memberOwnerType?.display ?? null,
      valueTypeDisplay: null,
    },
  );
}

function emptyOwnerDiagnostic(
  source: SemanticTemplateCursorDiagnosticRow['source'],
  selectedMemberName: string,
  memberOwnerType: SemanticTemplateCursorInfoResult['memberOwnerType'],
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
      actionTarget: suggestionActionTarget('owner-type', memberOwnerType?.source ?? null, selectedMemberName, memberOwnerType?.display ?? null),
      summary: 'Check whether the owner expression has the intended declared type and whether that type is visible to the TypeChecker.',
      targetMemberName: selectedMemberName,
      ownerTypeDisplay: memberOwnerType?.display ?? null,
      valueTypeDisplay: null,
    },
  );
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
  runtimeNoop: boolean,
  declareMember: boolean,
): SemanticTemplateCursorSuggestionActionTargetRow {
  if (runtimeNoop) {
    return suggestionActionTarget('expression', source, dataFlow.sourceName, null);
  }
  if (ownerSource == null && declareMember) {
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
