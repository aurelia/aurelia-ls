import {
  kebabSourceName,
  lowerCamelSourceName,
  lowerTitleSourceName,
  pascalSourceName,
  sourceNameWords,
  titleSourceName,
} from './source-name.js';
import {
  cleanSourceFieldSchemaLabel,
  splitSourceFieldSchemaItems,
  uniqueSourceFieldSchemaPropertyName,
} from './source-field-schema.js';
import {
  normalizedSourceOptionsParameterValue,
  sourceOptionSchemaGroupForField,
  sourceOptionSchemaGroups,
} from './source-option-schema.js';

export interface SearchableDataTableFieldSchema {
  readonly sourceParameterValue: string;
  readonly sourceOptionsParameterValue: string | null;
  readonly fields: readonly SearchableDataTableField[];
}

export interface SearchableDataTableFeatureProfile {
  /** Facet controls for select/boolean fields are source-owned in this table variant. */
  readonly hasFacetFilters: boolean;
  /** Column sort state, sortable headers, and sort-derived row projection are source-owned. */
  readonly hasSortControls: boolean;
  /** Page size/current-page state and footer navigation are source-owned. */
  readonly hasPaginationControls: boolean;
  /** Row selection state, page-selection toggles, and selection summary UI are source-owned. */
  readonly hasSelectionControls: boolean;
  /** Checked collection binding is emitted for selection controls. */
  readonly hasCheckedSelectionChannel: boolean;
  /** The table emits class/style channels beyond the baseline active-filter class token. */
  readonly hasTableStyleBindings: boolean;
}

export interface SearchableDataTableRowProjectionNames {
  readonly filteredCollectionGetterName: string;
  readonly sortedCollectionGetterName: string;
  readonly pageCollectionGetterName: string;
}

export interface SearchableDataTableField {
  readonly propertyName: string;
  readonly label: string;
  readonly kind: SearchableDataTableFieldKind;
  readonly typeName: string;
  readonly optionTypeName: string | null;
  readonly options: readonly SearchableDataTableFieldOption[];
  readonly filterPropertyName: string | null;
  readonly filterOptionPropertyName: string | null;
  readonly numeric: boolean;
}

export interface SearchableDataTableFieldOption {
  readonly value: string;
  readonly label: string;
}

export type SearchableDataTableFieldKind =
  | 'text'
  | 'email'
  | 'number'
  | 'date'
  | 'select'
  | 'boolean';

export const DEFAULT_SEARCHABLE_DATA_TABLE_FIELD_SCHEMA_PARAMETER = 'name, category select, status select, updated date, count number, flagged toggle';

export {
  searchableDataTableCustomDomainModelSource,
} from './searchable-data-table-field-domain-source.js';
export {
  searchableDataTableCustomServiceSource,
} from './searchable-data-table-field-service-source.js';
export {
  searchableDataTableCustomStateSource,
} from './searchable-data-table-field-state-source.js';
export type {
  SearchableDataTableCustomDetailTemplateInput,
  SearchableDataTableCustomTemplateInput,
} from './searchable-data-table-field-template-source.js';
export {
  searchableDataTableCustomDetailTemplateSource,
  searchableDataTableCustomTemplateSource,
} from './searchable-data-table-field-template-source.js';

export function searchableDataTableFieldSchemaFromParameter(
  value?: string | null,
  optionsValue?: string | null,
): SearchableDataTableFieldSchema | null {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length === 0) {
    return null;
  }
  const usedPropertyNames = new Map<string, number>();
  const fields = splitSourceFieldSchemaItems(trimmed)
    .map((item) => searchableDataTableFieldFromItem(item, usedPropertyNames))
    .filter((field): field is SearchableDataTableField => field != null);
  const sourceOptionsParameterValue = normalizedSourceOptionsParameterValue(optionsValue);
  const fieldsWithOptions = sourceOptionsParameterValue == null
    ? fields
    : applySourceOptionSchema(fields, sourceOptionsParameterValue);
  return fields.length === 0
    ? null
    : {
      sourceParameterValue: trimmed,
      sourceOptionsParameterValue,
      fields: fieldsWithOptions,
    };
}

export function defaultSearchableDataTableFieldSchema(): SearchableDataTableFieldSchema {
  const schema = searchableDataTableFieldSchemaFromParameter(DEFAULT_SEARCHABLE_DATA_TABLE_FIELD_SCHEMA_PARAMETER);
  if (schema == null) {
    throw new Error('Default searchable data table field schema did not produce any fields.');
  }
  return schema;
}

export function minimalSearchableDataTableFieldSchema(): SearchableDataTableFieldSchema {
  const schema = searchableDataTableFieldSchemaFromParameter('name');
  if (schema == null) {
    throw new Error('Minimal searchable data table field schema did not produce any fields.');
  }
  return schema;
}

export function referenceSearchableDataTableFeatureProfile(
  fieldSchema: SearchableDataTableFieldSchema,
): SearchableDataTableFeatureProfile {
  return {
    hasFacetFilters: searchableDataTableFieldSchemaHasOptionOrBooleanFilters(fieldSchema),
    hasSortControls: true,
    hasPaginationControls: true,
    hasSelectionControls: true,
    hasCheckedSelectionChannel: true,
    hasTableStyleBindings: true,
  };
}

export function starterSearchableDataTableFeatureProfile(
  fieldSchema: SearchableDataTableFieldSchema,
): SearchableDataTableFeatureProfile {
  return {
    hasFacetFilters: searchableDataTableFieldSchemaHasOptionOrBooleanFilters(fieldSchema),
    hasSortControls: false,
    hasPaginationControls: false,
    hasSelectionControls: false,
    hasCheckedSelectionChannel: false,
    hasTableStyleBindings: false,
  };
}

export function compactSearchableDataTableFeatureProfile(): SearchableDataTableFeatureProfile {
  return {
    hasFacetFilters: false,
    hasSortControls: false,
    hasPaginationControls: false,
    hasSelectionControls: false,
    hasCheckedSelectionChannel: false,
    hasTableStyleBindings: false,
  };
}

export function isCompactSearchableDataTableFeatureProfile(
  featureProfile: SearchableDataTableFeatureProfile,
): boolean {
  return !featureProfile.hasFacetFilters
    && !featureProfile.hasSortControls
    && !featureProfile.hasPaginationControls
    && !featureProfile.hasSelectionControls
    && !featureProfile.hasCheckedSelectionChannel
    && !featureProfile.hasTableStyleBindings;
}

export function searchableDataTableUsesReferencePresentation(
  featureProfile: SearchableDataTableFeatureProfile,
): boolean {
  return featureProfile.hasSortControls
    || featureProfile.hasPaginationControls
    || featureProfile.hasSelectionControls
    || featureProfile.hasCheckedSelectionChannel
    || featureProfile.hasTableStyleBindings;
}

export function searchableDataTableRowsGetterName(
  names: SearchableDataTableRowProjectionNames,
  featureProfile: SearchableDataTableFeatureProfile,
): string {
  if (featureProfile.hasPaginationControls) {
    return names.pageCollectionGetterName;
  }
  if (featureProfile.hasSortControls) {
    return names.sortedCollectionGetterName;
  }
  return names.filteredCollectionGetterName;
}

export function searchableDataTableFieldSchemaOptionParameterValue(
  fieldSchema: SearchableDataTableFieldSchema | null,
): string | undefined {
  if (fieldSchema == null) {
    return undefined;
  }
  if (fieldSchema.sourceOptionsParameterValue != null) {
    return fieldSchema.sourceOptionsParameterValue;
  }
  const optionGroups = fieldSchema.fields
    .filter(searchableDataTableFieldHasOptionDomain)
    .map((field) => `${lowerTitleSourceName(sourceNameWords(field.label))}: ${field.options.map((option) => option.label).join(', ')}`);
  return optionGroups.length === 0
    ? 'no generated option domains'
    : optionGroups.join('; ');
}

export function searchableDataTableFieldSchemaHasOptionDomains(
  fieldSchema: SearchableDataTableFieldSchema | null,
): boolean {
  return fieldSchema?.fields.some(searchableDataTableFieldHasOptionDomain) ?? false;
}

function searchableDataTableFieldSchemaHasOptionOrBooleanFilters(
  fieldSchema: SearchableDataTableFieldSchema,
): boolean {
  return fieldSchema.fields.some((field) => field.kind === 'select' || field.kind === 'boolean');
}

function searchableDataTableFieldFromItem(
  item: string,
  usedPropertyNames: Map<string, number>,
): SearchableDataTableField | null {
  const kind = inferFieldKind(item);
  const words = sourceNameWords(cleanSourceFieldSchemaLabel(item, {
    boolean: kind === 'boolean',
    number: kind === 'number',
    select: kind === 'select',
  }));
  if (words.length === 0) {
    return null;
  }
  const propertyName = uniqueSourceFieldSchemaPropertyName(lowerCamelSourceName(words), usedPropertyNames);
  const label = titleSourceName(words);
  const optionTypeName = kind === 'select' ? pascalSourceName(words) : null;
  const options = kind === 'select' ? defaultOptionValues(words) : [];
  return {
    propertyName,
    label,
    kind,
    typeName: fieldTypeName(kind, optionTypeName),
    optionTypeName,
    options,
    filterPropertyName: fieldFilterPropertyName(propertyName, kind),
    filterOptionPropertyName: kind === 'select' ? `${propertyName}Options` : null,
    numeric: kind === 'number',
  };
}

function applySourceOptionSchema(
  fields: readonly SearchableDataTableField[],
  value: string,
): readonly SearchableDataTableField[] {
  const groups = sourceOptionSchemaGroups(value);
  if (groups.length === 0) {
    return fields;
  }
  return fields.map((field) => {
    if (!searchableDataTableFieldHasOptionDomain(field)) {
      return field;
    }
    const group = sourceOptionSchemaGroupForField(
      field,
      groups,
      fields,
      searchableDataTableFieldHasOptionDomain,
      tableOptionDomainFieldKeys,
    );
    return group == null
      ? field
      : {
        ...field,
        options: group.options,
      };
  });
}

function tableOptionDomainFieldKeys(field: SearchableDataTableField): readonly string[] {
  return [
    field.propertyName,
    field.label,
    lowerCamelSourceName(sourceNameWords(field.label)),
    ...(field.optionTypeName == null ? [] : [field.optionTypeName]),
    ...(field.filterOptionPropertyName == null ? [] : [field.filterOptionPropertyName]),
  ];
}

function searchableDataTableFieldHasOptionDomain(field: SearchableDataTableField): boolean {
  return field.kind === 'select';
}

function inferFieldKind(item: string): SearchableDataTableFieldKind {
  const normalized = item.toLowerCase();
  if (/\b(email|e-mail)\b/u.test(normalized)) {
    return 'email';
  }
  if (/\b(count|total|amount|quantity|qty|number|score|points|tasks|price|cost|rate|percent|percentage)\b/u.test(normalized)) {
    return 'number';
  }
  if (/\b(date|time|day|login|created|updated|opened|closed|due)\b/u.test(normalized)) {
    return 'date';
  }
  if (/\b(toggle|toggles|switch|checkbox|checked|enabled|disabled|active|archived|flagged|published)\b/u.test(normalized)) {
    return 'boolean';
  }
  if (/\b(select|dropdown|choice|choices|option|options|role|status|category|type|priority|stage|state)\b/u.test(normalized)) {
    return 'select';
  }
  return 'text';
}

function fieldTypeName(kind: SearchableDataTableFieldKind, optionTypeName: string | null): string {
  switch (kind) {
    case 'select':
      return optionTypeName ?? 'string';
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'date':
    case 'email':
    case 'text':
      return 'string';
  }
}

function fieldFilterPropertyName(propertyName: string, kind: SearchableDataTableFieldKind): string | null {
  switch (kind) {
    case 'select':
      return `selected${pascalSourceName(sourceNameWords(propertyName))}`;
    case 'boolean':
      return `only${pascalSourceName(sourceNameWords(propertyName))}`;
    case 'date':
    case 'email':
    case 'number':
    case 'text':
      return null;
  }
}

function defaultOptionValues(words: readonly string[]): readonly SearchableDataTableFieldOption[] {
  const lowerWords = words.map((word) => word.toLowerCase());
  if (lowerWords.includes('status') || lowerWords.includes('state')) {
    return [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'pending', label: 'Pending' },
    ];
  }
  if (lowerWords.includes('priority')) {
    return [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
    ];
  }
  if (lowerWords.includes('role')) {
    return [
      { value: 'admin', label: 'Admin' },
      { value: 'manager', label: 'Manager' },
      { value: 'member', label: 'Member' },
    ];
  }
  const base = kebabSourceName(words);
  return [
    { value: `${base}-one`, label: `${titleSourceName(words)} One` },
    { value: `${base}-two`, label: `${titleSourceName(words)} Two` },
    { value: `${base}-three`, label: `${titleSourceName(words)} Three` },
  ];
}
