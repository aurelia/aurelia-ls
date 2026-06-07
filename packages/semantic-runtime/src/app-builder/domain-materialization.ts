import {
  AppBuilderDomainFieldValueKind,
  AppBuilderDomainIdentityValueKind,
  appBuilderDomainFieldUsesFiniteOptions,
  AppBuilderDomainSlotKey,
  AppBuilderDomainSlotKind,
  type AppBuilderDomainSlot,
  type AppBuilderFieldSchemaDomainSlotExpectation,
  type AppBuilderDomainFieldDescriptor,
  type AppBuilderDomainSlotAssignment,
} from './domain-model.js';
import { AppBuilderDomainSourceKind, type AppBuilderDomainDescriptor } from './domain-descriptor.js';
import {
  appBuilderIsTypeScriptIdentifier,
  appBuilderKebabCase,
  appBuilderLowerCamelCase,
  appBuilderPascalCase,
} from './source-lowering-helpers.js';

/** Issue kind produced while turning caller domain slots into a concrete domain descriptor. */
export enum AppBuilderDomainMaterializationIssueKind {
  /** The caller supplied the same slot key more than once. */
  DuplicateSlotAssignment = 'duplicate-slot-assignment',
  /** A required domain slot was not supplied and cannot be derived. */
  MissingRequiredSlot = 'missing-required-slot',
  /** The caller supplied a slot value with a shape that does not match the slot key. */
  InvalidSlotValue = 'invalid-slot-value',
  /** The field schema is real but cannot satisfy the selected source-lowering composition. */
  IncompatibleFieldSchema = 'incompatible-field-schema',
}

/** Domain materialization issue that can be mapped into public workflow issues. */
export interface AppBuilderDomainMaterializationIssue {
  readonly issueKind: AppBuilderDomainMaterializationIssueKind;
  readonly slotKey?: AppBuilderDomainSlotKey;
  readonly summary: string;
}

/** Result of resolving caller slot assignments into the descriptor consumed by source lowerers. */
export type AppBuilderCallerDomainMaterializationResult =
  | AppBuilderDomainDescriptor
  | readonly AppBuilderDomainMaterializationIssue[];

/** Domain-slot context consumed by caller-domain materialization. */
export interface AppBuilderDomainMaterializationTarget {
  /** Stable id used in diagnostics for the app-builder source-lowering target. */
  readonly id: string;
  /** Domain slots that this materialization target requires or accepts. */
  readonly domainSlots: readonly AppBuilderDomainSlot[];
}

/** Indexed caller assignments plus duplicate-key issues discovered during indexing. */
interface AppBuilderDomainAssignmentIndexFrame {
  /** Caller domain slot assignments keyed by slot key. */
  readonly assignmentByKey: ReadonlyMap<AppBuilderDomainSlotKey, AppBuilderDomainSlotAssignment>;
  /** Duplicate-key issues found while building the index. */
  readonly issues: readonly AppBuilderDomainMaterializationIssue[];
}

/** Caller domain slots projected into the materializer's concrete input vocabulary. */
interface AppBuilderDomainMaterializedSlotFrame {
  /** Required slot keys for the selected materialization target. */
  readonly requiredKeys: ReadonlySet<AppBuilderDomainSlotKey>;
  /** Caller-supplied or derivable entity title. */
  readonly entityTitle: string | null;
  /** Caller-supplied field schema after structural validation. */
  readonly fields: readonly AppBuilderDomainFieldDescriptor[] | null;
  /** Caller-supplied identity value kind after enum validation. */
  readonly identityValueKind: AppBuilderDomainIdentityValueKind | null;
}

/** Derived TypeScript/domain names used by the final descriptor. */
interface AppBuilderDomainDerivedNameFrame {
  /** Concrete entity type name. */
  readonly entityTypeName: string;
  /** Concrete collection member name. */
  readonly collectionMemberName: string;
  /** Concrete identity member name. */
  readonly identityMemberName: string;
}

/** Materialize caller-supplied domain slots for a source-lowering target. */
export function materializeAppBuilderCallerDomainForTarget(
  target: AppBuilderDomainMaterializationTarget,
  assignments: readonly AppBuilderDomainSlotAssignment[],
): AppBuilderCallerDomainMaterializationResult {
  const assignmentFrame = domainAssignmentIndexFrame(assignments);
  const slotFrame = domainMaterializedSlotFrame(target, assignmentFrame.assignmentByKey);
  const entityTitle = slotFrame.entityTitle;
  const fields = slotFrame.fields;
  const identityValueKind = slotFrame.identityValueKind;
  const issues = [
    ...assignmentFrame.issues,
    ...requiredDomainSlotIssues(target, slotFrame),
    ...domainSlotAssignmentShapeIssues(assignmentFrame.assignmentByKey, fields),
  ];
  if (fields != null) {
    issues.push(
      ...fieldSchemaNameIssues(fields),
      ...fieldSchemaChoiceOptionIssues(fields),
      ...fieldSchemaExpectationIssues(target, fields),
    );
  }

  if (issues.length > 0 || entityTitle == null || fields == null || identityValueKind == null) {
    return issues;
  }

  const derivedNames = domainDerivedNameFrame(entityTitle, assignmentFrame.assignmentByKey);
  const derivedIssues = [
    ...derivedNameIssues(
      derivedNames.entityTypeName,
      derivedNames.collectionMemberName,
      derivedNames.identityMemberName,
    ),
    ...fieldSchemaIdentityIssues(fields, derivedNames.identityMemberName),
  ];
  if (derivedIssues.length > 0) {
    return derivedIssues;
  }

  return materializedDomainDescriptor(entityTitle, fields, identityValueKind, derivedNames);
}

function domainAssignmentIndexFrame(
  assignments: readonly AppBuilderDomainSlotAssignment[],
): AppBuilderDomainAssignmentIndexFrame {
  const issues: AppBuilderDomainMaterializationIssue[] = [];
  const assignmentByKey = new Map<AppBuilderDomainSlotKey, AppBuilderDomainSlotAssignment>();
  for (const assignment of assignments) {
    if (assignmentByKey.has(assignment.key)) {
      issues.push({
        issueKind: AppBuilderDomainMaterializationIssueKind.DuplicateSlotAssignment,
        slotKey: assignment.key,
        summary: `Domain slot '${assignment.key}' was supplied more than once.`,
      });
      continue;
    }
    assignmentByKey.set(assignment.key, assignment);
  }
  return { assignmentByKey, issues };
}

function domainMaterializedSlotFrame(
  target: AppBuilderDomainMaterializationTarget,
  assignmentByKey: ReadonlyMap<AppBuilderDomainSlotKey, AppBuilderDomainSlotAssignment>,
): AppBuilderDomainMaterializedSlotFrame {
  const requiredKeys = new Set(target.domainSlots.filter((slot) => slot.required).map((slot) => slot.key));
  return {
    requiredKeys,
    entityTitle: stringSlotValue(assignmentByKey, AppBuilderDomainSlotKey.EntityTitle),
    fields: fieldSchemaSlotValue(assignmentByKey),
    identityValueKind: identityValueKindSlotValue(assignmentByKey),
  };
}

function requiredDomainSlotIssues(
  target: AppBuilderDomainMaterializationTarget,
  slots: AppBuilderDomainMaterializedSlotFrame,
): readonly AppBuilderDomainMaterializationIssue[] {
  const issues: AppBuilderDomainMaterializationIssue[] = [];
  if (slots.requiredKeys.has(AppBuilderDomainSlotKey.EntityTitle) && slots.entityTitle == null) {
    issues.push({
      issueKind: AppBuilderDomainMaterializationIssueKind.MissingRequiredSlot,
      slotKey: AppBuilderDomainSlotKey.EntityTitle,
      summary: `Domain materialization target '${target.id}' requires a caller-supplied entity title.`,
    });
  }
  if (slots.requiredKeys.has(AppBuilderDomainSlotKey.FieldSchema) && slots.fields == null) {
    issues.push({
      issueKind: AppBuilderDomainMaterializationIssueKind.MissingRequiredSlot,
      slotKey: AppBuilderDomainSlotKey.FieldSchema,
      summary: `Domain materialization target '${target.id}' requires a caller-supplied field schema.`,
    });
  }
  if (slots.requiredKeys.has(AppBuilderDomainSlotKey.IdentityValueKind) && slots.identityValueKind == null) {
    issues.push({
      issueKind: AppBuilderDomainMaterializationIssueKind.MissingRequiredSlot,
      slotKey: AppBuilderDomainSlotKey.IdentityValueKind,
      summary: `Domain materialization target '${target.id}' requires a caller-supplied identity value kind.`,
    });
  }
  return issues;
}

function domainSlotAssignmentShapeIssues(
  assignmentByKey: ReadonlyMap<AppBuilderDomainSlotKey, AppBuilderDomainSlotAssignment>,
  fields: readonly AppBuilderDomainFieldDescriptor[] | null,
): readonly AppBuilderDomainMaterializationIssue[] {
  const issues: AppBuilderDomainMaterializationIssue[] = [];
  for (const [key, assignment] of assignmentByKey) {
    if (key === AppBuilderDomainSlotKey.FieldSchema) {
      if (fields == null) {
        issues.push({
          issueKind: AppBuilderDomainMaterializationIssueKind.InvalidSlotValue,
          slotKey: key,
          summary: `Domain slot '${key}' must be an array of fields with name, title, and valueKind.`,
        });
      }
      continue;
    }
    if (key === AppBuilderDomainSlotKey.IdentityValueKind) {
      if (!Object.values(AppBuilderDomainIdentityValueKind).includes(assignment.value as AppBuilderDomainIdentityValueKind)) {
        issues.push({
          issueKind: AppBuilderDomainMaterializationIssueKind.InvalidSlotValue,
          slotKey: key,
          summary: `Domain slot '${key}' must be one of ${Object.values(AppBuilderDomainIdentityValueKind).join(', ')}.`,
        });
      }
      continue;
    }
    if (typeof assignment.value !== 'string' || assignment.value.trim().length === 0) {
      issues.push({
        issueKind: AppBuilderDomainMaterializationIssueKind.InvalidSlotValue,
        slotKey: key,
        summary: `Domain slot '${key}' must be a non-empty string.`,
      });
      continue;
    }
    if (key !== AppBuilderDomainSlotKey.EntityTitle && !appBuilderIsTypeScriptIdentifier(assignment.value)) {
      issues.push({
        issueKind: AppBuilderDomainMaterializationIssueKind.InvalidSlotValue,
        slotKey: key,
        summary: `Domain slot '${key}' must be a TypeScript identifier when supplied explicitly.`,
      });
    }
  }
  return issues;
}

function domainDerivedNameFrame(
  entityTitle: string,
  assignmentByKey: ReadonlyMap<AppBuilderDomainSlotKey, AppBuilderDomainSlotAssignment>,
): AppBuilderDomainDerivedNameFrame {
  const entityTypeName = stringSlotValue(assignmentByKey, AppBuilderDomainSlotKey.EntityTypeName)
    ?? appBuilderPascalCase(entityTitle);
  return {
    entityTypeName,
    collectionMemberName: stringSlotValue(assignmentByKey, AppBuilderDomainSlotKey.CollectionMemberName)
      ?? pluralLowerCamel(entityTypeName),
    identityMemberName: stringSlotValue(assignmentByKey, AppBuilderDomainSlotKey.IdentityMemberName)
      ?? 'id',
  };
}

function materializedDomainDescriptor(
  entityTitle: string,
  fields: readonly AppBuilderDomainFieldDescriptor[],
  identityValueKind: AppBuilderDomainIdentityValueKind,
  derivedNames: AppBuilderDomainDerivedNameFrame,
): AppBuilderDomainDescriptor {
  return {
    id: `caller.${appBuilderKebabCase(derivedNames.entityTypeName)}`,
    sourceKind: AppBuilderDomainSourceKind.CallerSupplied,
    title: `${entityTitle} Domain`,
    summary: `Caller-supplied ${entityTitle} domain slots.`,
    entityTitle,
    entityTypeName: derivedNames.entityTypeName,
    collectionMemberName: derivedNames.collectionMemberName,
    identityMemberName: derivedNames.identityMemberName,
    identityValueKind,
    fields,
    slotKinds: [
      AppBuilderDomainSlotKind.EntityTitle,
      AppBuilderDomainSlotKind.EntityTypeName,
      AppBuilderDomainSlotKind.CollectionMemberName,
      AppBuilderDomainSlotKind.IdentityMemberName,
      AppBuilderDomainSlotKind.IdentityValueKind,
      AppBuilderDomainSlotKind.FieldSchema,
    ],
  };
}

function derivedNameIssues(
  entityTypeName: string,
  collectionMemberName: string,
  identityMemberName: string,
): readonly AppBuilderDomainMaterializationIssue[] {
  const issues: AppBuilderDomainMaterializationIssue[] = [];
  if (!appBuilderIsTypeScriptIdentifier(entityTypeName)) {
    issues.push({
      issueKind: AppBuilderDomainMaterializationIssueKind.InvalidSlotValue,
      slotKey: AppBuilderDomainSlotKey.EntityTypeName,
      summary: `Derived entity type name '${entityTypeName}' is not a TypeScript identifier; supply an explicit entity-type-name slot.`,
    });
  }
  if (!appBuilderIsTypeScriptIdentifier(collectionMemberName)) {
    issues.push({
      issueKind: AppBuilderDomainMaterializationIssueKind.InvalidSlotValue,
      slotKey: AppBuilderDomainSlotKey.CollectionMemberName,
      summary: `Derived collection member name '${collectionMemberName}' is not a TypeScript identifier; supply an explicit collection-member-name slot.`,
    });
  }
  if (!appBuilderIsTypeScriptIdentifier(identityMemberName)) {
    issues.push({
      issueKind: AppBuilderDomainMaterializationIssueKind.InvalidSlotValue,
      slotKey: AppBuilderDomainSlotKey.IdentityMemberName,
      summary: `Derived identity member name '${identityMemberName}' is not a TypeScript identifier; supply an explicit identity-member-name slot.`,
    });
  }
  return issues;
}

function fieldSchemaNameIssues(
  fields: readonly AppBuilderDomainFieldDescriptor[],
): readonly AppBuilderDomainMaterializationIssue[] {
  const issues: AppBuilderDomainMaterializationIssue[] = [];
  const names = new Set<string>();
  for (const field of fields) {
    if (names.has(field.name)) {
      issues.push({
        issueKind: AppBuilderDomainMaterializationIssueKind.InvalidSlotValue,
        slotKey: AppBuilderDomainSlotKey.FieldSchema,
        summary: `Domain field schema contains duplicate field name '${field.name}'.`,
      });
    }
    names.add(field.name);
  }
  return issues;
}

function fieldSchemaIdentityIssues(
  fields: readonly AppBuilderDomainFieldDescriptor[],
  identityMemberName: string,
): readonly AppBuilderDomainMaterializationIssue[] {
  if (!fields.some((field) => field.name === identityMemberName)) {
    return [];
  }
  return [{
    issueKind: AppBuilderDomainMaterializationIssueKind.InvalidSlotValue,
    slotKey: AppBuilderDomainSlotKey.FieldSchema,
    summary: `Domain field schema must not redeclare identity member '${identityMemberName}'.`,
  }];
}

function stringSlotValue(
  assignmentByKey: ReadonlyMap<AppBuilderDomainSlotKey, AppBuilderDomainSlotAssignment>,
  key: AppBuilderDomainSlotKey,
): string | null {
  const assignment = assignmentByKey.get(key);
  if (assignment == null || assignment.key === AppBuilderDomainSlotKey.FieldSchema) {
    return null;
  }
  const value = assignment.value.trim();
  return value.length === 0 ? null : value;
}

function fieldSchemaSlotValue(
  assignmentByKey: ReadonlyMap<AppBuilderDomainSlotKey, AppBuilderDomainSlotAssignment>,
): readonly AppBuilderDomainFieldDescriptor[] | null {
  const assignment = assignmentByKey.get(AppBuilderDomainSlotKey.FieldSchema);
  if (assignment == null || assignment.key !== AppBuilderDomainSlotKey.FieldSchema || !Array.isArray(assignment.value)) {
    return null;
  }
  const fields: AppBuilderDomainFieldDescriptor[] = [];
  for (const field of assignment.value) {
    if (!isDomainFieldDescriptor(field)) {
      return null;
    }
    fields.push(field);
  }
  return fields;
}

function identityValueKindSlotValue(
  assignmentByKey: ReadonlyMap<AppBuilderDomainSlotKey, AppBuilderDomainSlotAssignment>,
): AppBuilderDomainIdentityValueKind | null {
  const assignment = assignmentByKey.get(AppBuilderDomainSlotKey.IdentityValueKind);
  if (assignment == null || assignment.key !== AppBuilderDomainSlotKey.IdentityValueKind) {
    return null;
  }
  return Object.values(AppBuilderDomainIdentityValueKind).includes(assignment.value)
    ? assignment.value
    : null;
}

function isDomainFieldDescriptor(
  value: unknown,
): value is AppBuilderDomainFieldDescriptor {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const field = value as AppBuilderDomainFieldDescriptor;
  return typeof field.name === 'string'
    && field.name.trim().length > 0
    && appBuilderIsTypeScriptIdentifier(field.name)
    && typeof field.title === 'string'
    && field.title.trim().length > 0
    && Object.values(AppBuilderDomainFieldValueKind).includes(field.valueKind)
    && (field.optionTypeName == null || typeof field.optionTypeName === 'string')
    && (field.options == null || Array.isArray(field.options));
}

function fieldSchemaChoiceOptionIssues(
  fields: readonly AppBuilderDomainFieldDescriptor[],
): readonly AppBuilderDomainMaterializationIssue[] {
  const issues: AppBuilderDomainMaterializationIssue[] = [];
  for (const field of fields) {
    const options = field.options ?? [];
    if (!appBuilderDomainFieldUsesFiniteOptions(field)) {
      if (field.optionTypeName != null) {
        issues.push({
          issueKind: AppBuilderDomainMaterializationIssueKind.InvalidSlotValue,
          slotKey: AppBuilderDomainSlotKey.FieldSchema,
          summary: `Domain field '${field.name}' supplies optionTypeName, but option type aliases are only valid for finite choice fields.`,
        });
      }
      if (options.length > 0) {
        issues.push({
          issueKind: AppBuilderDomainMaterializationIssueKind.InvalidSlotValue,
          slotKey: AppBuilderDomainSlotKey.FieldSchema,
          summary: `Domain field '${field.name}' supplies options, but options are only valid for finite choice fields.`,
        });
      }
      continue;
    }
    if (field.optionTypeName != null && !appBuilderIsTypeScriptIdentifier(field.optionTypeName)) {
      issues.push({
        issueKind: AppBuilderDomainMaterializationIssueKind.InvalidSlotValue,
        slotKey: AppBuilderDomainSlotKey.FieldSchema,
        summary: `Finite choice field '${field.name}' optionTypeName must be a TypeScript-safe identifier.`,
      });
    }
    const optionValues = new Set<string>();
    for (const option of options) {
      if (!isDomainFieldOptionDescriptor(option)) {
        issues.push({
          issueKind: AppBuilderDomainMaterializationIssueKind.InvalidSlotValue,
          slotKey: AppBuilderDomainSlotKey.FieldSchema,
          summary: `Finite choice field '${field.name}' options must have non-empty value and title strings.`,
        });
        continue;
      }
      if (optionValues.has(option.value)) {
        issues.push({
          issueKind: AppBuilderDomainMaterializationIssueKind.InvalidSlotValue,
          slotKey: AppBuilderDomainSlotKey.FieldSchema,
          summary: `Finite choice field '${field.name}' contains duplicate option value '${option.value}'.`,
        });
      }
      optionValues.add(option.value);
    }
  }
  return issues;
}

function isDomainFieldOptionDescriptor(
  value: unknown,
): value is NonNullable<AppBuilderDomainFieldDescriptor['options']>[number] {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const option = value as NonNullable<AppBuilderDomainFieldDescriptor['options']>[number];
  return typeof option.value === 'string'
    && option.value.trim().length > 0
    && typeof option.title === 'string'
    && option.title.trim().length > 0;
}

function fieldSchemaExpectationForComposition(
  target: AppBuilderDomainMaterializationTarget,
): AppBuilderFieldSchemaDomainSlotExpectation | null {
  return target.domainSlots.find((slot) => slot.key === AppBuilderDomainSlotKey.FieldSchema)?.fieldSchema ?? null;
}

function fieldSchemaExpectationIssues(
  target: AppBuilderDomainMaterializationTarget,
  fields: readonly AppBuilderDomainFieldDescriptor[],
): readonly AppBuilderDomainMaterializationIssue[] {
  const expectation = fieldSchemaExpectationForComposition(target);
  if (expectation == null) {
    return [];
  }

  const issues: AppBuilderDomainMaterializationIssue[] = [];
  const supportedValueKinds = new Set(expectation.supportedValueKinds);
  for (const field of fields) {
    if (!supportedValueKinds.has(field.valueKind)) {
      issues.push({
        issueKind: AppBuilderDomainMaterializationIssueKind.IncompatibleFieldSchema,
        slotKey: AppBuilderDomainSlotKey.FieldSchema,
        summary: `Domain materialization target '${target.id}' does not currently support '${field.valueKind}' fields in its field schema.`,
      });
    }
  }
  for (const requirement of expectation.requiredValueKinds) {
    const count = fields.filter((field) => field.valueKind === requirement.valueKind).length;
    if (count < requirement.minCount) {
      issues.push({
        issueKind: AppBuilderDomainMaterializationIssueKind.IncompatibleFieldSchema,
        slotKey: AppBuilderDomainSlotKey.FieldSchema,
        summary: `Domain materialization target '${target.id}' requires at least ${requirement.minCount} '${requirement.valueKind}' field(s). ${requirement.summary}`,
      });
    }
  }
  return issues;
}

function pluralLowerCamel(
  entityTypeName: string,
): string {
  const base = appBuilderLowerCamelCase(entityTypeName);
  if (base.endsWith('y') && !/[aeiou]y$/i.test(base)) {
    return `${base.slice(0, -1)}ies`;
  }
  if (/(s|x|z|ch|sh)$/i.test(base)) {
    return `${base}es`;
  }
  return `${base}s`;
}
