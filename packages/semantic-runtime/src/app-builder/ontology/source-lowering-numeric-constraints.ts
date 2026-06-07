import {
  AppBuilderControlId,
} from '../control-catalog.js';
import type {
  AppBuilderNumericFieldConstraintDescriptor,
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

/** Target-neutral issue kind for native numeric source-lowering constraints. */
export enum AppBuilderNumericControlConstraintIssueKind {
  /** A native range control lacks explicit minimum, maximum, or step input. */
  MissingRangeConstraints = 'missing-range-constraints',
  /** Supplied numeric constraints cannot be safely emitted as native attributes. */
  InvalidConstraints = 'invalid-constraints',
}

/** Stable value list for native numeric source-lowering constraint issues. */
export const APP_BUILDER_NUMERIC_CONTROL_CONSTRAINT_ISSUE_KINDS = [
  AppBuilderNumericControlConstraintIssueKind.MissingRangeConstraints,
  AppBuilderNumericControlConstraintIssueKind.InvalidConstraints,
] as const;

/** Target-neutral issue row for native numeric source-lowering constraints. */
export interface AppBuilderNumericControlConstraintIssue {
  /** Stable issue category. */
  readonly issueKind: AppBuilderNumericControlConstraintIssueKind;
  /** Domain fields involved in this constraint issue. */
  readonly fieldNames: readonly string[];
  /** Compact explanation suitable for MCP/IDE display. */
  readonly summary: string;
}

/** Selected native numeric-control constraints projected into low-level part slots. */
export interface AppBuilderNumericControlConstraintSelection {
  /** Slot assignments that the low-level part source lowerer can spend. */
  readonly slotAssignments: readonly AppBuilderPartSlotAssignment[];
  /** Missing/invalid constraint issue when constraints are not lowerable. */
  readonly issue: AppBuilderNumericControlConstraintIssue | null;
}

/** Select numeric constraints for one concrete field-control source invocation. */
export function appBuilderSelectNumericControlConstraints(
  controlId: AppBuilderControlId,
  selectedField: AppBuilderDomainFieldSourceModel,
): AppBuilderNumericControlConstraintSelection {
  if (!appBuilderNumericControlCanSpendConstraints(controlId)) {
    return {
      slotAssignments: [],
      issue: null,
    };
  }
  const constraints = selectedField.numericConstraints;
  const fieldName = selectedField.memberName;
  if (controlId === AppBuilderControlId.RangeInput && !appBuilderCompleteRangeConstraints(constraints)) {
    return {
      slotAssignments: [],
      issue: {
        issueKind: AppBuilderNumericControlConstraintIssueKind.MissingRangeConstraints,
        fieldNames: [fieldName],
        summary: `Range control '${controlId}' needs field '${fieldName}' to supply numericConstraints.minimum, numericConstraints.maximum, and numericConstraints.step before source can be lowered without browser-default range semantics.`,
      },
    };
  }
  const validationSummary = constraints == null ? null : appBuilderNumericConstraintValidationSummary(constraints);
  if (validationSummary != null) {
    return {
      slotAssignments: [],
      issue: {
        issueKind: AppBuilderNumericControlConstraintIssueKind.InvalidConstraints,
        fieldNames: [fieldName],
        summary: `Field '${fieldName}' has numericConstraints that cannot be spent by control '${controlId}': ${validationSummary}`,
      },
    };
  }
  return {
    slotAssignments: appBuilderNumericConstraintSlotAssignments(constraints),
    issue: null,
  };
}

/** Preflight range readiness beyond coarse domain-field facet presence. */
export function appBuilderRangeConstraintPreflightIssue(
  fields: readonly AppBuilderDomainFieldSourceModel[],
): AppBuilderNumericControlConstraintIssue | null {
  const numericFields = fields.filter((field) => field.controlId === AppBuilderControlId.NumberInput);
  if (numericFields.length === 0) {
    return null;
  }
  const invalidIssues = numericFields
    .map((field) => appBuilderSelectNumericControlConstraints(AppBuilderControlId.RangeInput, field).issue)
    .filter((issue): issue is AppBuilderNumericControlConstraintIssue => issue != null);
  if (invalidIssues.length < numericFields.length) {
    return null;
  }
  const invalidConstraintIssue = invalidIssues.find((issue) =>
    issue.issueKind === AppBuilderNumericControlConstraintIssueKind.InvalidConstraints
  );
  if (invalidConstraintIssue != null) {
    return {
      issueKind: AppBuilderNumericControlConstraintIssueKind.InvalidConstraints,
      fieldNames: numericFields.map((field) => field.memberName),
      summary: `Range source lowering found only invalid numeric field constraints: ${invalidConstraintIssue.summary}`,
    };
  }
  return {
    issueKind: AppBuilderNumericControlConstraintIssueKind.MissingRangeConstraints,
    fieldNames: numericFields.map((field) => field.memberName),
    summary: `Range source lowering needs at least one supplied number field with numericConstraints.minimum, numericConstraints.maximum, and numericConstraints.step.`,
  };
}

function appBuilderNumericControlCanSpendConstraints(
  controlId: AppBuilderControlId,
): boolean {
  switch (controlId) {
    case AppBuilderControlId.NumberInput:
    case AppBuilderControlId.RangeInput:
      return true;
    case AppBuilderControlId.TextInput:
    case AppBuilderControlId.DateInput:
    case AppBuilderControlId.TextArea:
    case AppBuilderControlId.Checkbox:
    case AppBuilderControlId.CheckboxList:
    case AppBuilderControlId.RadioGroup:
    case AppBuilderControlId.SingleSelect:
    case AppBuilderControlId.MultiSelect:
      return false;
  }
}

function appBuilderCompleteRangeConstraints(
  constraints: AppBuilderNumericFieldConstraintDescriptor | null,
): constraints is Required<AppBuilderNumericFieldConstraintDescriptor> {
  return constraints != null
    && constraints.minimum != null
    && constraints.maximum != null
    && constraints.step != null;
}

function appBuilderNumericConstraintValidationSummary(
  constraints: AppBuilderNumericFieldConstraintDescriptor,
): string | null {
  if (constraints.minimum != null && !Number.isFinite(constraints.minimum)) {
    return 'minimum must be a finite number.';
  }
  if (constraints.maximum != null && !Number.isFinite(constraints.maximum)) {
    return 'maximum must be a finite number.';
  }
  if (constraints.step != null && (!Number.isFinite(constraints.step) || constraints.step <= 0)) {
    return 'step must be a finite positive number.';
  }
  if (constraints.minimum != null && constraints.maximum != null && constraints.maximum <= constraints.minimum) {
    return 'maximum must be greater than minimum.';
  }
  return null;
}

function appBuilderNumericConstraintSlotAssignments(
  constraints: AppBuilderNumericFieldConstraintDescriptor | null,
): readonly AppBuilderPartSlotAssignment[] {
  if (constraints == null) {
    return [];
  }
  return [
    ...optionalNumericPartSlot(AppBuilderPartSlotKind.NumericMinimum, constraints.minimum),
    ...optionalNumericPartSlot(AppBuilderPartSlotKind.NumericMaximum, constraints.maximum),
    ...optionalNumericPartSlot(AppBuilderPartSlotKind.NumericStep, constraints.step),
  ];
}

function optionalNumericPartSlot(
  slotKind: AppBuilderPartSlotKind,
  value: number | null | undefined,
): readonly AppBuilderPartSlotAssignment[] {
  return value == null ? [] : [{ slotKind, value: String(value) }];
}
