import { AppBuilderControlId } from './control-catalog.js';
import {
  AppBuilderDomainFieldValueKind,
  appBuilderDomainFieldUsesFiniteOptions,
  type AppBuilderDomainFieldDescriptor,
  type AppBuilderDomainFieldOptionDescriptor,
  type AppBuilderDomainValueSetDescriptor,
  type AppBuilderNumericFieldConstraintDescriptor,
} from './domain-model.js';
import {
  appBuilderPascalCase,
  appBuilderSeedRecordLiteral,
} from './source-lowering-helpers.js';
import type { AppBuilderSeedRecord, AppBuilderSeedRecordValue } from './seed-data.js';
import { indentSourceLines, singleQuotedTypeScriptStringLiteralText } from '../source-plan/source-template.js';
import {
  lowerCamelSourceName,
  singularizeSourceNameWord,
  sourceNameWords,
} from '../source-plan/source-name.js';

/** Source-lowering view of one domain field; keeps field-schema semantics out of concrete source templates. */
export interface AppBuilderDomainFieldSourceModel {
  readonly field: AppBuilderDomainFieldDescriptor;
  readonly memberName: string;
  readonly memberSegment: string;
  readonly valueKind: AppBuilderDomainFieldValueKind;
  readonly typeScriptType: string;
  readonly controlId: AppBuilderControlId;
  readonly optionTypeName: string | null;
  readonly optionMemberName: string | null;
  readonly options: readonly AppBuilderDomainFieldOptionDescriptor[];
  readonly numericConstraints: AppBuilderNumericFieldConstraintDescriptor | null;
}

/** Caller context used when turning field schemas into source-oriented field rows. */
export interface AppBuilderDomainFieldSourceModelOptions {
  /** TypeScript-safe entity type name used to derive choice type aliases. */
  readonly entityTypeName?: string;
  /** Reusable finite option domains that fields may reference through valueSetName. */
  readonly valueSets?: readonly AppBuilderDomainValueSetDescriptor[];
}

/** Internal field-to-value-set selection carried from a generated composition into local source state. */
export interface AppBuilderDomainFieldValueSetSelection {
  /** Domain field member that should draw finite options from a reusable value set. */
  readonly fieldName: string;
  /** Reusable domain value-set member that should back the selected field when the field has no own option source. */
  readonly valueSetName: string;
}

/** Source-generation policy for scalar domain field value kinds. */
interface AppBuilderScalarDomainFieldValuePolicy {
  /** Default control part used when a draft form renders this field directly. */
  readonly controlId: AppBuilderControlId;
  /** Runtime default value used when generated source needs an empty draft or missing seed field. */
  readonly defaultValue: string | number | boolean | null;
}

/** Field value-kind policy table for scalar kinds; finite choices derive type/default from their options. */
const APP_BUILDER_SCALAR_DOMAIN_FIELD_VALUE_POLICIES = {
  [AppBuilderDomainFieldValueKind.Text]: {
    controlId: AppBuilderControlId.TextInput,
    defaultValue: '',
  },
  [AppBuilderDomainFieldValueKind.Boolean]: {
    controlId: AppBuilderControlId.Checkbox,
    defaultValue: false,
  },
  [AppBuilderDomainFieldValueKind.Number]: {
    controlId: AppBuilderControlId.NumberInput,
    defaultValue: 0,
  },
  [AppBuilderDomainFieldValueKind.Date]: {
    controlId: AppBuilderControlId.DateInput,
    defaultValue: null,
  },
} satisfies Readonly<Record<Exclude<AppBuilderDomainFieldValueKind, AppBuilderDomainFieldValueKind.Choice | AppBuilderDomainFieldValueKind.ChoiceSet>, AppBuilderScalarDomainFieldValuePolicy>>;

/** Convert caller/domain field descriptors into reusable source-lowering field rows. */
export function appBuilderDomainFieldSourceModels(
  fields: readonly AppBuilderDomainFieldDescriptor[],
  options: AppBuilderDomainFieldSourceModelOptions = {},
): readonly AppBuilderDomainFieldSourceModel[] {
  return fields.map((field) => {
    const memberSegment = appBuilderPascalCase(field.name);
    const finiteOptions = appBuilderDomainFieldResolvedOptions(field, options.valueSets ?? []);
    const hasFiniteOptionSource = finiteOptions.length > 0;
    const fieldWithResolvedOptions = finiteOptions === field.options
      ? field
      : { ...field, options: finiteOptions };
    const optionTypeName = appBuilderDomainFieldUsesFiniteOptions(field) && hasFiniteOptionSource
      ? (field.optionTypeName ?? `${appBuilderPascalCase(options.entityTypeName ?? 'Domain')}${appBuilderDomainFieldOptionTypeNameSegment(field)}`)
      : null;
    return {
      field: fieldWithResolvedOptions,
      memberName: field.name,
      memberSegment,
      valueKind: field.valueKind,
      typeScriptType: appBuilderDomainFieldTypeScriptType(fieldWithResolvedOptions, optionTypeName),
      controlId: appBuilderDomainFieldControlId(field),
      optionTypeName,
      optionMemberName: appBuilderDomainFieldUsesFiniteOptions(field) && hasFiniteOptionSource
        ? appBuilderDomainFieldOptionMemberName(field)
        : null,
      options: finiteOptions,
      numericConstraints: field.numericConstraints ?? null,
    };
  });
}

/** Apply composition-selected reusable value sets to fields that do not already own a finite option source. */
export function appBuilderDomainFieldsWithValueSetSelections(
  fields: readonly AppBuilderDomainFieldDescriptor[],
  selections: readonly AppBuilderDomainFieldValueSetSelection[],
): readonly AppBuilderDomainFieldDescriptor[] {
  const valueSetNamesByField = new Map<string, string>();
  for (const selection of selections) {
    if (selection.fieldName.length === 0 || selection.valueSetName.length === 0 || valueSetNamesByField.has(selection.fieldName)) {
      continue;
    }
    valueSetNamesByField.set(selection.fieldName, selection.valueSetName);
  }
  if (valueSetNamesByField.size === 0) {
    return fields;
  }
  return fields.map((field) => {
    const valueSetName = valueSetNamesByField.get(field.name);
    if (
      valueSetName == null
      || !appBuilderDomainFieldUsesFiniteOptions(field)
      || field.valueSetName != null
      || (field.options?.length ?? 0) > 0
    ) {
      return field;
    }
    return {
      ...field,
      valueSetName,
    };
  });
}

/** Source member for field-local finite options; choice-set names use singular last-word options. */
export function appBuilderDomainFieldOptionMemberName(
  field: AppBuilderDomainFieldDescriptor,
): string {
  if (field.valueSetName != null && field.valueSetName.length > 0) {
    return field.valueSetName;
  }
  const words = sourceNameWords(field.name);
  const optionDomainWords = field.valueKind === AppBuilderDomainFieldValueKind.ChoiceSet
    ? [...words.slice(0, -1), singularizeSourceNameWord(words[words.length - 1] ?? 'item')]
    : words;
  return `${lowerCamelSourceName(optionDomainWords)}Options`;
}

/** Type-name segment for one finite option value; choice-set fields use singular last-word aliases. */
export function appBuilderDomainFieldOptionTypeNameSegment(
  field: AppBuilderDomainFieldDescriptor,
): string {
  const words = sourceNameWords(field.name);
  const optionValueWords = field.valueKind === AppBuilderDomainFieldValueKind.ChoiceSet
    ? [...words.slice(0, -1), singularizeSourceNameWord(words[words.length - 1] ?? 'item')]
    : words;
  return appBuilderPascalCase(optionValueWords.join(' '));
}

/** Resolve field-local or reusable value-set options for a finite domain field. */
export function appBuilderDomainFieldResolvedOptions(
  field: AppBuilderDomainFieldDescriptor,
  valueSets: readonly AppBuilderDomainValueSetDescriptor[] = [],
): readonly AppBuilderDomainFieldOptionDescriptor[] {
  if (!appBuilderDomainFieldUsesFiniteOptions(field)) {
    return [];
  }
  if (field.options != null && field.options.length > 0) {
    return field.options;
  }
  const valueSet = field.valueSetName == null
    ? null
    : valueSets.find((candidate) =>
        candidate.name === field.valueSetName
        && (candidate.valueKind == null || candidate.valueKind === field.valueKind)) ?? null;
  return valueSet?.options ?? [];
}

/** Pick the first field matching a value kind for pattern mechanics that need a representative field. */
export function appBuilderPrimaryDomainField(
  fields: readonly AppBuilderDomainFieldSourceModel[],
  valueKind: AppBuilderDomainFieldValueKind,
): AppBuilderDomainFieldSourceModel | null {
  return fields.find((field) => field.valueKind === valueKind) ?? null;
}

/** TypeScript type emitted for a generated domain field. */
export function appBuilderDomainFieldTypeScriptType(
  field: AppBuilderDomainFieldDescriptor,
  optionTypeName: string | null = null,
): string {
  switch (field.valueKind) {
    case AppBuilderDomainFieldValueKind.Text:
      return 'string';
    case AppBuilderDomainFieldValueKind.Boolean:
      return 'boolean';
    case AppBuilderDomainFieldValueKind.Number:
      return 'number';
    case AppBuilderDomainFieldValueKind.Date:
      return 'Date | null';
    case AppBuilderDomainFieldValueKind.Choice: {
      const optionValueType = optionTypeName
        ?? (field.options == null || field.options.length === 0 ? 'string' : appBuilderDomainFieldChoiceLiteralType(field));
      return optionValueType;
    }
    case AppBuilderDomainFieldValueKind.ChoiceSet: {
      const optionValueType = optionTypeName
        ?? (field.options == null || field.options.length === 0 ? 'string' : appBuilderDomainFieldChoiceLiteralType(field));
      return `${optionValueType}[]`;
    }
  }
}

/** Source-lowering control used for a generated draft-form field. */
export function appBuilderDomainFieldControlId(
  field: AppBuilderDomainFieldDescriptor,
): AppBuilderControlId {
  switch (field.valueKind) {
    case AppBuilderDomainFieldValueKind.Choice:
      return AppBuilderControlId.SingleSelect;
    case AppBuilderDomainFieldValueKind.ChoiceSet:
      return AppBuilderControlId.MultiSelect;
    default:
      return APP_BUILDER_SCALAR_DOMAIN_FIELD_VALUE_POLICIES[field.valueKind].controlId;
  }
}

/** Default runtime value for a generated domain field. */
export function appBuilderDomainFieldDefaultValue(
  field: AppBuilderDomainFieldDescriptor | AppBuilderDomainFieldSourceModel,
): AppBuilderSeedRecordValue {
  const descriptor = 'field' in field ? field.field : field;
  if (descriptor.defaultValue !== undefined) {
    return descriptor.defaultValue;
  }
  switch (descriptor.valueKind) {
    case AppBuilderDomainFieldValueKind.Choice:
      return descriptor.options?.[0]?.value ?? '';
    case AppBuilderDomainFieldValueKind.ChoiceSet:
      return [];
    default:
      return APP_BUILDER_SCALAR_DOMAIN_FIELD_VALUE_POLICIES[descriptor.valueKind].defaultValue;
  }
}

/** Seed/default literal for one generated domain field. */
export function appBuilderDomainFieldSeedLiteral(
  record: AppBuilderSeedRecord | undefined,
  field: AppBuilderDomainFieldSourceModel,
): string {
  const value = record?.[field.memberName] ?? appBuilderDomainFieldDefaultValue(field);
  if (field.valueKind === AppBuilderDomainFieldValueKind.Date && typeof value === 'string') {
    return `new Date(${singleQuotedTypeScriptStringLiteralText(value)})`;
  }
  return appBuilderSeedRecordLiteral(value);
}

/** Type aliases emitted for finite choice fields in generated domain-model source. */
export function appBuilderDomainFieldChoiceTypeAliases(
  fields: readonly AppBuilderDomainFieldSourceModel[],
): readonly string[] {
  return fields
    .filter((field) => appBuilderDomainFieldUsesFiniteOptions(field) && field.optionTypeName != null)
    .map((field) => `export type ${field.optionTypeName} = ${appBuilderDomainFieldChoiceLiteralType(field.field)};`);
}

/** Source for an option-domain property on a generated state class. */
export function appBuilderDomainFieldOptionPropertySource(
  field: AppBuilderDomainFieldSourceModel,
): string {
  return indentSourceLines(appBuilderDomainFieldOptionClassMemberSource(field), '  ');
}

/** Indentation-neutral class-member source for an option-domain property. */
export function appBuilderDomainFieldOptionClassMemberSource(
  field: AppBuilderDomainFieldSourceModel,
): string {
  if (field.optionMemberName == null || field.optionTypeName == null) {
    throw new Error(`Domain field '${field.memberName}' does not define a finite option domain.`);
  }
  const options = field.options.map((option) => (
    `  { value: ${appBuilderSeedRecordLiteral(option.value)}, title: ${appBuilderSeedRecordLiteral(option.title)} },`
  )).join('\n');
  return `readonly ${field.optionMemberName}: readonly { readonly value: ${field.optionTypeName}; readonly title: string }[] = [
${options}
];`;
}

/** Choice fields that need generated option-domain source. */
export function appBuilderDomainChoiceFields(
  fields: readonly AppBuilderDomainFieldSourceModel[],
): readonly AppBuilderDomainFieldSourceModel[] {
  return fields.filter((field) => field.valueKind === AppBuilderDomainFieldValueKind.Choice);
}

/** Choice and choice-set fields that need generated option-domain source. */
export function appBuilderDomainFiniteOptionFields(
  fields: readonly AppBuilderDomainFieldSourceModel[],
): readonly AppBuilderDomainFieldSourceModel[] {
  return fields.filter((field) =>
    appBuilderDomainFieldUsesFiniteOptions(field)
    && field.optionMemberName != null
    && field.options.length > 0);
}

/** Member name a generated domain entity should expose for display-friendly field text. */
export function appBuilderDomainFieldDisplayMemberName(
  field: AppBuilderDomainFieldSourceModel,
): string {
  switch (field.valueKind) {
    case AppBuilderDomainFieldValueKind.Date:
    case AppBuilderDomainFieldValueKind.Choice:
    case AppBuilderDomainFieldValueKind.ChoiceSet:
      return `${field.memberName}Label`;
    case AppBuilderDomainFieldValueKind.Text:
    case AppBuilderDomainFieldValueKind.Boolean:
    case AppBuilderDomainFieldValueKind.Number:
      return field.memberName;
  }
}

/** Template expression for display-friendly field text, optionally qualified by a receiver expression. */
export function appBuilderDomainFieldDisplayExpression(
  field: AppBuilderDomainFieldSourceModel,
  receiverExpression?: string,
): string {
  const memberName = appBuilderDomainFieldDisplayMemberName(field);
  return receiverExpression == null || receiverExpression.length === 0
    ? memberName
    : `${receiverExpression}.${memberName}`;
}

function appBuilderDomainFieldChoiceLiteralType(
  field: AppBuilderDomainFieldDescriptor,
): string {
  const options = field.options ?? [];
  if (options.length === 0) {
    throw new Error(`Choice field '${field.name}' must define at least one option before source can be lowered.`);
  }
  return options.map((option) => singleQuotedTypeScriptStringLiteralText(option.value)).join(' | ');
}
