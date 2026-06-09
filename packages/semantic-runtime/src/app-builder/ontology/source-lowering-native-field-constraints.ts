import {
  AppBuilderControlId,
} from '../control-catalog.js';
import type {
  AppBuilderTextFieldConstraintDescriptor,
} from '../domain-model.js';
import {
  AppBuilderDomainFieldValueKind,
} from '../domain-model.js';
import type {
  AppBuilderDomainFieldSourceModel,
} from '../domain-field-source.js';
import {
  AppBuilderPartSlotKind,
} from '../part-application.js';
import type {
  AppBuilderPartSlotAssignment,
} from '../part-source-invocation.js';

/** Target-neutral issue kind for native field-local constraint lowering. */
export enum AppBuilderNativeFieldConstraintIssueKind {
  /** Supplied text constraints cannot be safely emitted as native attributes. */
  InvalidTextConstraints = 'invalid-text-constraints',
  /** Supplied text constraints target a control that does not spend text attributes. */
  UnsupportedTextConstraints = 'unsupported-text-constraints',
}

/** Stable value list for native field-local constraint issues. */
export const APP_BUILDER_NATIVE_FIELD_CONSTRAINT_ISSUE_KINDS = [
  AppBuilderNativeFieldConstraintIssueKind.InvalidTextConstraints,
  AppBuilderNativeFieldConstraintIssueKind.UnsupportedTextConstraints,
] as const;

/** Target-neutral issue row for native field-local constraints. */
export interface AppBuilderNativeFieldConstraintIssue {
  /** Stable issue category. */
  readonly issueKind: AppBuilderNativeFieldConstraintIssueKind;
  /** Domain fields involved in this constraint issue. */
  readonly fieldNames: readonly string[];
  /** Compact explanation suitable for MCP/IDE display. */
  readonly summary: string;
}

/** Selected native field-local constraints projected into low-level part slots. */
export interface AppBuilderNativeFieldConstraintSelection {
  /** Slot assignments that the low-level part source lowerer can spend. */
  readonly slotAssignments: readonly AppBuilderPartSlotAssignment[];
  /** Missing/invalid constraint issue when constraints are not lowerable. */
  readonly issue: AppBuilderNativeFieldConstraintIssue | null;
}

/** Select caller-supplied field-local constraints for one concrete native control. */
export function appBuilderSelectNativeFieldConstraints(
  controlId: AppBuilderControlId,
  selectedField: AppBuilderDomainFieldSourceModel,
): AppBuilderNativeFieldConstraintSelection {
  const textConstraints = selectedField.field.textConstraints ?? null;
  const issue = appBuilderTextConstraintIssue(controlId, selectedField.memberName, textConstraints);
  if (issue != null) {
    return {
      slotAssignments: [],
      issue,
    };
  }
  return {
    slotAssignments: [
      ...nativeRequiredSlotAssignments(controlId, selectedField),
      ...textConstraintSlotAssignments(controlId, textConstraints),
    ],
    issue: null,
  };
}

function nativeRequiredSlotAssignments(
  controlId: AppBuilderControlId,
  selectedField: AppBuilderDomainFieldSourceModel,
): readonly AppBuilderPartSlotAssignment[] {
  return selectedField.field.required === true && appBuilderControlCanSpendNativeRequired(controlId, selectedField)
    ? [{ slotKind: AppBuilderPartSlotKind.NativeRequired, value: 'true' }]
    : [];
}

function appBuilderControlCanSpendNativeRequired(
  controlId: AppBuilderControlId,
  selectedField: AppBuilderDomainFieldSourceModel,
): boolean {
  if (selectedField.valueKind === AppBuilderDomainFieldValueKind.Boolean
    || selectedField.valueKind === AppBuilderDomainFieldValueKind.ChoiceSet) {
    return false;
  }
  switch (controlId) {
    case AppBuilderControlId.TextInput:
    case AppBuilderControlId.EmailInput:
    case AppBuilderControlId.UrlInput:
    case AppBuilderControlId.TelInput:
    case AppBuilderControlId.PasswordInput:
    case AppBuilderControlId.SearchInput:
    case AppBuilderControlId.TimeInput:
    case AppBuilderControlId.DateTimeLocalInput:
    case AppBuilderControlId.MonthInput:
    case AppBuilderControlId.WeekInput:
    case AppBuilderControlId.NumberInput:
    case AppBuilderControlId.DateInput:
    case AppBuilderControlId.TextArea:
    case AppBuilderControlId.RadioGroup:
    case AppBuilderControlId.SingleSelect:
      return true;
    case AppBuilderControlId.RangeInput:
    case AppBuilderControlId.Checkbox:
    case AppBuilderControlId.CheckboxList:
    case AppBuilderControlId.MultiSelect:
      return false;
  }
}

function appBuilderTextConstraintIssue(
  controlId: AppBuilderControlId,
  fieldName: string,
  constraints: AppBuilderTextFieldConstraintDescriptor | null,
): AppBuilderNativeFieldConstraintIssue | null {
  if (constraints == null) {
    return null;
  }
  if (!appBuilderControlCanSpendTextConstraints(controlId)) {
    return {
      issueKind: AppBuilderNativeFieldConstraintIssueKind.UnsupportedTextConstraints,
      fieldNames: [fieldName],
      summary: `Field '${fieldName}' supplies textConstraints, but control '${controlId}' does not lower native text constraint attributes.`,
    };
  }
  const validationSummary = appBuilderTextConstraintValidationSummary(constraints);
  return validationSummary == null
    ? null
    : {
        issueKind: AppBuilderNativeFieldConstraintIssueKind.InvalidTextConstraints,
        fieldNames: [fieldName],
        summary: `Field '${fieldName}' has textConstraints that cannot be spent by control '${controlId}': ${validationSummary}`,
      };
}

function appBuilderControlCanSpendTextConstraints(
  controlId: AppBuilderControlId,
): boolean {
  switch (controlId) {
    case AppBuilderControlId.TextInput:
    case AppBuilderControlId.EmailInput:
    case AppBuilderControlId.UrlInput:
    case AppBuilderControlId.TelInput:
    case AppBuilderControlId.PasswordInput:
    case AppBuilderControlId.SearchInput:
    case AppBuilderControlId.TextArea:
      return true;
    case AppBuilderControlId.TimeInput:
    case AppBuilderControlId.DateTimeLocalInput:
    case AppBuilderControlId.MonthInput:
    case AppBuilderControlId.WeekInput:
    case AppBuilderControlId.NumberInput:
    case AppBuilderControlId.DateInput:
    case AppBuilderControlId.RangeInput:
    case AppBuilderControlId.Checkbox:
    case AppBuilderControlId.CheckboxList:
    case AppBuilderControlId.RadioGroup:
    case AppBuilderControlId.SingleSelect:
    case AppBuilderControlId.MultiSelect:
      return false;
  }
}

function appBuilderTextConstraintValidationSummary(
  constraints: AppBuilderTextFieldConstraintDescriptor,
): string | null {
  if (constraints.minLength != null && !nonNegativeInteger(constraints.minLength)) {
    return 'minLength must be a non-negative integer.';
  }
  if (constraints.maxLength != null && !positiveInteger(constraints.maxLength)) {
    return 'maxLength must be a positive integer.';
  }
  if (constraints.minLength != null && constraints.maxLength != null && constraints.maxLength < constraints.minLength) {
    return 'maxLength must be greater than or equal to minLength.';
  }
  if (constraints.pattern != null && constraints.pattern.trim().length === 0) {
    return 'pattern must be a non-empty native pattern attribute value.';
  }
  if (constraints.pattern != null && /[\r\n]/.test(constraints.pattern)) {
    return 'pattern must fit in one HTML attribute value.';
  }
  return null;
}

function textConstraintSlotAssignments(
  controlId: AppBuilderControlId,
  constraints: AppBuilderTextFieldConstraintDescriptor | null,
): readonly AppBuilderPartSlotAssignment[] {
  if (constraints == null || !appBuilderControlCanSpendTextConstraints(controlId)) {
    return [];
  }
  return [
    ...optionalConstraintSlot(AppBuilderPartSlotKind.TextMinLength, constraints.minLength),
    ...optionalConstraintSlot(AppBuilderPartSlotKind.TextMaxLength, constraints.maxLength),
    ...optionalConstraintSlot(AppBuilderPartSlotKind.TextPattern, constraints.pattern),
  ];
}

function optionalConstraintSlot(
  slotKind: AppBuilderPartSlotKind,
  value: number | string | null | undefined,
): readonly AppBuilderPartSlotAssignment[] {
  return value == null ? [] : [{ slotKind, value: String(value) }];
}

function nonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function positiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}
