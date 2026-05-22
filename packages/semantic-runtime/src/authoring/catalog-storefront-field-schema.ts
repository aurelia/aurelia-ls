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
  sourceFieldSchemaReadonlyConstructorParameters,
  sourceFieldSchemaReadonlyRecordFields,
  splitSourceFieldSchemaItems,
  uniqueSourceFieldSchemaPropertyName,
} from './source-field-schema.js';
import {
  normalizedSourceOptionsParameterValue,
  sourceOptionSchemaGroupForField,
  sourceOptionSchemaGroups,
  sourceStringLiteral,
} from './source-option-schema.js';
import { indentSourceLines, sourceText } from './source-template.js';
import type { CatalogStorefrontDomainNames } from './catalog-storefront-source-plan.js';

export interface CatalogStorefrontFieldSchema {
  readonly sourceParameterValue: string;
  readonly sourceOptionsParameterValue: string | null;
  readonly fields: readonly CatalogStorefrontField[];
  readonly primaryField: CatalogStorefrontField;
  readonly summaryField: CatalogStorefrontField;
  readonly priceField: CatalogStorefrontField | null;
  readonly stockField: CatalogStorefrontField | null;
  readonly badgeField: CatalogStorefrontField | null;
}

export interface CatalogStorefrontFieldFeatureProfile {
  /** A price-like field exists and the generated card/detail source should expose price presentation. */
  readonly hasPricePresentation: boolean;
  /** A stock/availability-like field exists and should own checked filters, disabled actions, and stock labels. */
  readonly hasStockSemantics: boolean;
  /** A select-backed badge/category/status field exists and should own badge filters plus card emphasis. */
  readonly hasBadgeSemantics: boolean;
  /** The card source should exercise switch/case availability flow for a stock-aware catalog item. */
  readonly hasAvailabilitySwitch: boolean;
  /** The card source should exercise class-toggle and style-property channels from domain getters. */
  readonly hasCardStyleBindings: boolean;
}

export interface CatalogStorefrontField {
  readonly propertyName: string;
  readonly label: string;
  readonly kind: CatalogStorefrontFieldKind;
  readonly typeName: string;
  readonly optionTypeName: string | null;
  readonly options: readonly CatalogStorefrontFieldOption[];
  readonly numeric: boolean;
}

export interface CatalogStorefrontFieldOption {
  readonly value: string;
  readonly label: string;
}

export type CatalogStorefrontFieldKind =
  | 'text'
  | 'number'
  | 'select'
  | 'boolean';

export const DEFAULT_CATALOG_STOREFRONT_FIELD_SCHEMA_PARAMETER = 'title, description, category select, monthly price number, available toggle';

export interface CatalogStorefrontCustomDetailTemplateInput {
  readonly domain: CatalogStorefrontDomainNames;
  readonly fieldSchema: CatalogStorefrontFieldSchema;
  readonly collectionLabelLower: string;
  readonly collectionPropertyName: string;
  readonly detailRouteParameterName: string;
  readonly detailRouteQueryRefName: string;
  readonly includeSelectionAction?: boolean;
  readonly listRoutePath: string;
  readonly readEntityMethodName: string;
  readonly selectEntityMethodName: string;
}

export function catalogStorefrontFieldSchemaFromParameter(
  value?: string | null,
  optionsValue?: string | null,
): CatalogStorefrontFieldSchema | null {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length === 0) {
    return null;
  }
  const usedPropertyNames = new Map<string, number>();
  const fields = splitSourceFieldSchemaItems(trimmed)
    .map((item) => catalogStorefrontFieldFromItem(item, usedPropertyNames))
    .filter((field): field is CatalogStorefrontField => field != null);
  if (fields.length === 0) {
    return null;
  }
  const sourceOptionsParameterValue = normalizedSourceOptionsParameterValue(optionsValue);
  const fieldsWithOptions = sourceOptionsParameterValue == null
    ? fields
    : applySourceOptionSchema(fields, sourceOptionsParameterValue);
  return {
    sourceParameterValue: trimmed,
    sourceOptionsParameterValue,
    fields: fieldsWithOptions,
    primaryField: primaryCatalogField(fieldsWithOptions),
    summaryField: summaryCatalogField(fieldsWithOptions),
    priceField: priceCatalogField(fieldsWithOptions),
    stockField: stockCatalogField(fieldsWithOptions),
    badgeField: badgeCatalogField(fieldsWithOptions),
  };
}

export function defaultCatalogStorefrontFieldSchema(): CatalogStorefrontFieldSchema {
  const schema = catalogStorefrontFieldSchemaFromParameter(DEFAULT_CATALOG_STOREFRONT_FIELD_SCHEMA_PARAMETER);
  if (schema == null) {
    throw new Error('Default catalog storefront field schema did not produce any fields.');
  }
  return schema;
}

export function minimalCatalogStorefrontFieldSchema(): CatalogStorefrontFieldSchema {
  const schema = catalogStorefrontFieldSchemaFromParameter('name, summary');
  if (schema == null) {
    throw new Error('Minimal catalog storefront field schema did not produce any fields.');
  }
  return schema;
}

export function catalogStorefrontFieldFeatureProfile(
  fieldSchema: CatalogStorefrontFieldSchema,
): CatalogStorefrontFieldFeatureProfile {
  const hasPricePresentation = fieldSchema.priceField != null;
  const hasStockSemantics = fieldSchema.stockField != null;
  const hasBadgeSemantics = fieldSchema.badgeField != null;
  return {
    hasPricePresentation,
    hasStockSemantics,
    hasBadgeSemantics,
    hasAvailabilitySwitch: hasStockSemantics,
    hasCardStyleBindings: hasBadgeSemantics,
  };
}

export function isCompactCatalogStorefrontFeatureProfile(
  featureProfile: CatalogStorefrontFieldFeatureProfile,
): boolean {
  return !featureProfile.hasPricePresentation
    && !featureProfile.hasStockSemantics
    && !featureProfile.hasBadgeSemantics
    && !featureProfile.hasAvailabilitySwitch
    && !featureProfile.hasCardStyleBindings;
}

export function catalogStorefrontUsesReferencePresentation(fieldSchema: CatalogStorefrontFieldSchema): boolean {
  return !isCompactCatalogStorefrontFeatureProfile(catalogStorefrontFieldFeatureProfile(fieldSchema));
}

export function catalogStorefrontFieldSchemaOptionParameterValue(
  fieldSchema: CatalogStorefrontFieldSchema | null,
): string | undefined {
  if (fieldSchema == null) {
    return undefined;
  }
  if (fieldSchema.sourceOptionsParameterValue != null) {
    return fieldSchema.sourceOptionsParameterValue;
  }
  const optionGroups = fieldSchema.fields
    .filter(catalogStorefrontFieldHasOptionDomain)
    .map((field) => `${lowerTitleSourceName(sourceNameWords(field.label))}: ${field.options.map((option) => option.label).join(', ')}`);
  return optionGroups.length === 0
    ? 'no generated option domains'
    : optionGroups.join('; ');
}

export function catalogStorefrontFieldSchemaHasOptionDomains(
  fieldSchema: CatalogStorefrontFieldSchema | null,
): boolean {
  return fieldSchema?.fields.some(catalogStorefrontFieldHasOptionDomain) ?? false;
}

export function catalogStorefrontCustomEntityModelSource(
  domain: CatalogStorefrontDomainNames,
  fieldSchema: CatalogStorefrontFieldSchema,
): string {
  const typeDeclarations = customFieldTypeDeclarations(domain, fieldSchema);
  const constructorParameters = [
    'readonly id: string,',
    sourceFieldSchemaReadonlyConstructorParameters(fieldSchema.fields),
  ].join('\n');
  const classMembers = [
    `constructor(
${indentSourceLines(constructorParameters, '  ')}
) {}`,
    customFieldLabelGetters(fieldSchema),
    customContractGetters(domain, fieldSchema),
  ]
    .filter((member) => member.length > 0)
    .join('\n\n');
  const selectLabelFunctions = customSelectLabelFunctions(fieldSchema);
  return sourceText(`${typeDeclarations.length === 0 ? '' : `${typeDeclarations}\n\n`}export class ${domain.entityClassName} {
${indentSourceLines(classMembers, '  ')}
}
${selectLabelFunctions.length === 0 ? '' : `\n\n${selectLabelFunctions}`}
`);
}

function customContractGetters(
  domain: CatalogStorefrontDomainNames,
  fieldSchema: CatalogStorefrontFieldSchema,
): string {
  const featureProfile = catalogStorefrontFieldFeatureProfile(fieldSchema);
  return [
    fieldSatisfiesCatalogContract(fieldSchema.primaryField, 'name')
      ? null
      : `get name(): string {
  return ${fieldStringExpression(fieldSchema.primaryField)};
}`,
    fieldSatisfiesCatalogContract(fieldSchema.summaryField, 'summary')
      ? null
      : `get summary(): string {
  return ${fieldStringExpression(fieldSchema.summaryField)};
}`,
    !featureProfile.hasPricePresentation
      ? null
      : fieldSchema.priceField != null && fieldSatisfiesCatalogContract(fieldSchema.priceField, 'price')
      ? null
      : `get price(): number {
  return ${fieldSchema.priceField == null ? '0' : `this.${fieldSchema.priceField.propertyName}`};
}`,
    !featureProfile.hasPricePresentation
      ? null
      : `get priceLabel(): string {
  return '$' + this.price.toFixed(2);
}`,
    !featureProfile.hasStockSemantics
      ? null
      : fieldSchema.stockField != null && fieldSatisfiesCatalogContract(fieldSchema.stockField, 'inStock')
      ? null
      : `get inStock(): boolean {
  return ${stockExpression(fieldSchema)};
}`,
    !featureProfile.hasBadgeSemantics
      ? null
      : fieldSchema.badgeField != null && fieldSatisfiesCatalogContract(fieldSchema.badgeField, 'badge')
      ? null
      : `get badge(): ${domain.entityBadgeTypeName} {
  return ${badgeExpression(domain, fieldSchema)};
}`,
    !featureProfile.hasBadgeSemantics
      ? null
      : `get isHighlighted(): boolean {
  return this.badge !== 'standard';
}`,
    !featureProfile.hasCardStyleBindings
      ? null
      : `get cardPadding(): string {
  return this.isHighlighted ? '1.25rem' : '1rem';
}`,
    !featureProfile.hasCardStyleBindings
      ? null
      : `get cardAccentColor(): string {
  return this.isHighlighted ? '#0f766e' : '#d0d7de';
}`,
    !featureProfile.hasStockSemantics
      ? null
      : `get stockLabel(): string {
  return this.inStock ? 'In stock' : 'Back soon';
}`,
    !featureProfile.hasAvailabilitySwitch
      ? null
      : `get availability(): ${domain.entityAvailabilityTypeName} {
  if (this.inStock) {
    return ${featureProfile.hasBadgeSemantics ? "this.isHighlighted ? 'limited' : 'in-stock'" : "'in-stock'"};
  }
  return 'backorder';
}`,
  ]
    .filter((getter): getter is string => getter != null)
    .join('\n\n');
}

export function catalogStorefrontCustomServiceSource(
  serviceClassName: string,
  modelModule: string,
  domain: CatalogStorefrontDomainNames,
  fieldSchema: CatalogStorefrontFieldSchema,
): string {
  const typeNames = [
    ...fieldSchema.fields
      .map((field) => field.optionTypeName)
      .filter((typeName): typeName is string => typeName != null),
  ];
  const typeImport = typeNames.length === 0 ? '' : `, type ${typeNames.join(', type ')}`;
  return sourceText(`import { ${domain.entityClassName}${typeImport} } from '${modelModule}';

interface ${domain.entityClassName}Record {
  readonly id: string;
${indentSourceLines(sourceFieldSchemaReadonlyRecordFields(fieldSchema.fields), '  ')}
}

const featuredRecords: readonly ${domain.entityClassName}Record[] = [
${indentSourceLines(customSampleRecords(domain, fieldSchema), '  ')}
];

export class ${serviceClassName} {
  async ${domain.loadFeaturedCollectionMethodName}(): Promise<readonly ${domain.entityClassName}[]> {
    return featuredRecords.map(create${domain.entityClassName});
  }
}

function create${domain.entityClassName}(record: ${domain.entityClassName}Record): ${domain.entityClassName} {
  return new ${domain.entityClassName}(
    record.id,
${indentSourceLines(customConstructorArguments(fieldSchema), '    ')}
  );
}
`);
}

export function catalogStorefrontCustomDetailTemplateSource(
  input: CatalogStorefrontCustomDetailTemplateInput,
): string {
  const entity = input.domain.entityVariableName;
  const featureProfile = catalogStorefrontFieldFeatureProfile(input.fieldSchema);
  const disabledAttribute = featureProfile.hasStockSemantics
    ? ` disabled.bind="!${entity}.inStock"`
    : '';
  const selectionAction = input.includeSelectionAction === false
    ? ''
    : `
    <button type="button" click.trigger="state.${input.selectEntityMethodName}(${entity}.id)"${disabledAttribute}>Select</button>`;
  return sourceText(`<section class="${input.domain.entityKebabName}-detail">
  <a load="${input.listRoutePath}">All ${input.collectionLabelLower}</a>

  <let ${entity}.bind="state.${input.collectionPropertyName}.${input.readEntityMethodName}(routeParams.${input.detailRouteParameterName})"></let>
  <template if.bind="${entity}">
    <h1>\${${entity}.name}</h1>
    <p>\${${entity}.summary}</p>
    <dl>
${customDetailRows(input.fieldSchema, entity)}
      <dt>Opened from</dt>
      <dd>\${routeParams.${input.detailRouteQueryRefName} ?? 'catalog'}</dd>
    </dl>${selectionAction}
  </template>
  <p else>Loading ${input.domain.entityTitle} \${routeParams.${input.detailRouteParameterName}}...</p>
</section>
`);
}

export function catalogStorefrontCustomBadgeFilterValues(
  fieldSchema: CatalogStorefrontFieldSchema,
): string {
  const filterValues = new Set<string>(['all']);
  for (const option of fieldSchema.badgeField?.options ?? []) {
    filterValues.add(option.value);
  }
  filterValues.add('standard');
  return [...filterValues]
    .map((value) => JSON.stringify(value))
    .join(', ');
}

function catalogStorefrontFieldFromItem(
  item: string,
  usedPropertyNames: Map<string, number>,
): CatalogStorefrontField | null {
  const kind = inferFieldKind(item);
  const words = sourceNameWords(cleanSourceFieldSchemaLabel(item, {
    boolean: kind === 'boolean',
    number: kind === 'number',
    select: kind === 'select',
  }));
  if (words.length === 0) {
    return null;
  }
  const requestedPropertyName = lowerCamelSourceName(words);
  const propertyName = uniqueSourceFieldSchemaPropertyName(
    catalogStorefrontFieldPropertyName(requestedPropertyName, kind),
    usedPropertyNames,
  );
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
    numeric: kind === 'number',
  };
}

function applySourceOptionSchema(
  fields: readonly CatalogStorefrontField[],
  value: string,
): readonly CatalogStorefrontField[] {
  const groups = sourceOptionSchemaGroups(value);
  if (groups.length === 0) {
    return fields;
  }
  return fields.map((field) => {
    if (!catalogStorefrontFieldHasOptionDomain(field)) {
      return field;
    }
    const group = sourceOptionSchemaGroupForField(
      field,
      groups,
      fields,
      catalogStorefrontFieldHasOptionDomain,
      catalogOptionDomainFieldKeys,
    );
    return group == null
      ? field
      : {
        ...field,
        options: group.options,
      };
  });
}

function catalogOptionDomainFieldKeys(field: CatalogStorefrontField): readonly string[] {
  return [
    field.propertyName,
    field.label,
    lowerCamelSourceName(sourceNameWords(field.label)),
    ...(field.optionTypeName == null ? [] : [field.optionTypeName]),
  ];
}

function catalogStorefrontFieldHasOptionDomain(field: CatalogStorefrontField): boolean {
  return field.kind === 'select';
}

function catalogStorefrontFieldPropertyName(
  requestedPropertyName: string,
  kind: CatalogStorefrontFieldKind,
): string {
  return CATALOG_STOREFRONT_CONTRACT_PROPERTY_NAMES.has(requestedPropertyName)
    && !catalogFieldCanOwnContractMember(requestedPropertyName, kind)
    ? `${requestedPropertyName}Value`
    : requestedPropertyName;
}

function catalogFieldCanOwnContractMember(
  propertyName: string,
  kind: CatalogStorefrontFieldKind,
): boolean {
  switch (propertyName) {
    case 'name':
    case 'summary':
      return kind === 'text';
    case 'price':
      return kind === 'number';
    case 'inStock':
      return kind === 'boolean';
    default:
      return false;
  }
}

const CATALOG_STOREFRONT_CONTRACT_PROPERTY_NAMES = new Set([
  'id',
  'name',
  'summary',
  'price',
  'priceLabel',
  'inStock',
  'badge',
  'isHighlighted',
  'cardPadding',
  'cardAccentColor',
  'stockLabel',
  'availability',
]);

function inferFieldKind(item: string): CatalogStorefrontFieldKind {
  const normalized = item.toLowerCase();
  if (/\b(price|cost|amount|total|rate|percent|percentage|stock|inventory|quantity|qty|count|score|rating)\b/u.test(normalized)) {
    return 'number';
  }
  if (/\b(available|availability|stocked|instock|in-stock|active|enabled|published|featured|checked|toggle|switch|checkbox)\b/u.test(normalized)) {
    return 'boolean';
  }
  if (/\b(category|type|status|badge|tag|tags|group|segment|tier|color|colour|variant|select|option|choice)\b/u.test(normalized)) {
    return 'select';
  }
  return 'text';
}

function fieldTypeName(kind: CatalogStorefrontFieldKind, optionTypeName: string | null): string {
  switch (kind) {
    case 'select':
      return optionTypeName ?? 'string';
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'text':
      return 'string';
  }
}

function customFieldTypeDeclarations(
  domain: CatalogStorefrontDomainNames,
  fieldSchema: CatalogStorefrontFieldSchema,
): string {
  const featureProfile = catalogStorefrontFieldFeatureProfile(fieldSchema);
  const fieldOptionTypes = fieldSchema.fields
    .filter((field) => field.kind === 'select' && field.optionTypeName != null)
    .map((field) => `export type ${field.optionTypeName} = ${field.options.map((option) => sourceStringLiteral(option.value)).join(' | ')};`);
  const badgeType = fieldSchema.badgeField?.optionTypeName == null
    ? `export type ${domain.entityBadgeTypeName} = 'standard';`
    : `export type ${domain.entityBadgeTypeName} = ${fieldSchema.badgeField.optionTypeName} | 'standard';`;
  const availabilityType = `export type ${domain.entityAvailabilityTypeName} = 'in-stock' | 'limited' | 'backorder';`;
  return [
    ...fieldOptionTypes,
    ...(featureProfile.hasBadgeSemantics ? [badgeType] : []),
    ...(featureProfile.hasAvailabilitySwitch ? [availabilityType] : []),
  ].join('\n');
}

function customFieldLabelGetters(fieldSchema: CatalogStorefrontFieldSchema): string {
  return fieldSchema.fields
    .map((field) => {
      const labelGetterName = fieldLabelGetterName(field);
      if (labelGetterName == null) {
        return null;
      }
      return `get ${labelGetterName}(): string {
  return ${fieldLabelExpression(field)};
}`;
    })
    .filter((getter): getter is string => getter != null)
    .join('\n\n');
}

function fieldLabelExpression(field: CatalogStorefrontField): string {
  switch (field.kind) {
    case 'select':
      return `label${pascalSourceName(sourceNameWords(field.propertyName))}(this.${field.propertyName})`;
    case 'boolean':
      return `this.${field.propertyName} ? 'Yes' : 'No'`;
    case 'number':
      return `this.${field.propertyName}.toLocaleString()`;
    case 'text':
      return `this.${field.propertyName}`;
  }
}

function customSelectLabelFunctions(fieldSchema: CatalogStorefrontFieldSchema): string {
  return fieldSchema.fields
    .filter((field) => field.kind === 'select' && field.optionTypeName != null)
    .map((field) => `function label${pascalSourceName(sourceNameWords(field.propertyName))}(value: ${field.optionTypeName}): string {
  switch (value) {
${indentSourceLines(field.options.map((option) => `case '${option.value}':
  return '${option.label}';`).join('\n'), '    ')}
  }
}`)
    .join('\n\n');
}

function fieldStringExpression(field: CatalogStorefrontField): string {
  switch (field.kind) {
    case 'boolean':
      return `this.${field.propertyName} ? '${field.label}' : 'Not ${field.label.toLowerCase()}'`;
    case 'number':
      return `String(this.${field.propertyName})`;
    case 'select':
    case 'text':
      return `this.${fieldLabelMemberName(field)}`;
  }
}

function fieldLabelGetterName(field: CatalogStorefrontField): string | null {
  if (catalogContractLabelMemberCanDescribeField(field)) {
    return null;
  }
  return defaultFieldLabelMemberName(field);
}

function fieldLabelMemberName(field: CatalogStorefrontField): string {
  if (catalogContractLabelMemberCanDescribeField(field)) {
    return field.propertyName === 'price' ? 'priceLabel' : 'stockLabel';
  }
  return defaultFieldLabelMemberName(field);
}

function defaultFieldLabelMemberName(field: CatalogStorefrontField): string {
  const defaultName = `${field.propertyName}Label`;
  return CATALOG_STOREFRONT_CONTRACT_PROPERTY_NAMES.has(defaultName)
    ? `${field.propertyName}ValueLabel`
    : defaultName;
}

function catalogContractLabelMemberCanDescribeField(
  field: CatalogStorefrontField,
): boolean {
  return (field.propertyName === 'price' && field.kind === 'number')
    || ((field.propertyName === 'inStock' || field.propertyName === 'stock') && field.kind === 'boolean');
}

function fieldSatisfiesCatalogContract(
  field: CatalogStorefrontField,
  contractMemberName: string,
): boolean {
  return field.propertyName === contractMemberName
    && catalogFieldCanOwnContractMember(field.propertyName, field.kind);
}

function badgeExpression(
  domain: CatalogStorefrontDomainNames,
  fieldSchema: CatalogStorefrontFieldSchema,
): string {
  if (fieldSchema.badgeField == null) {
    return `'standard'`;
  }
  return `this.${fieldSchema.badgeField.propertyName}`;
}

function customSampleRecords(
  domain: CatalogStorefrontDomainNames,
  fieldSchema: CatalogStorefrontFieldSchema,
): string {
  return Array.from({ length: 3 }, (_, index) => {
    const assignments = fieldSchema.fields
      .map((field) => `${field.propertyName}: ${sampleValueExpression(field, index)}`)
      .join(', ');
    return `{ id: '${domain.entityKebabName}-${index + 1}', ${assignments} },`;
  }).join('\n');
}

function customConstructorArguments(fieldSchema: CatalogStorefrontFieldSchema): string {
  return fieldSchema.fields
    .map((field) => `record.${field.propertyName},`)
    .join('\n');
}

function sampleValueExpression(field: CatalogStorefrontField, index: number): string {
  switch (field.kind) {
    case 'number':
      return `${(index + 2) * 24}`;
    case 'boolean':
      return index !== 2 ? 'true' : 'false';
    case 'select':
      return `'${field.options[index % field.options.length]!.value}'`;
    case 'text':
      return `'${sampleText(field, index)}'`;
  }
}

function sampleText(field: CatalogStorefrontField, index: number): string {
  return `${field.label} ${index + 1}`;
}

function customDetailRows(
  fieldSchema: CatalogStorefrontFieldSchema,
  entityVariableName: string,
): string {
  return fieldSchema.fields
    .map((field) => `      <dt>${field.label}</dt>
      <dd>\${${entityVariableName}.${fieldLabelMemberName(field)}}</dd>`)
    .join('\n');
}

function primaryCatalogField(fields: readonly CatalogStorefrontField[]): CatalogStorefrontField {
  return fields.find((field) => field.kind === 'text' && field.propertyName === 'name')
    ?? fields.find((field) => field.kind === 'text' && fieldMatchesCatalogWords(field, /\b(name|title|label)\b/u))
    ?? firstFieldOfKind(fields, 'text')
    ?? fields[0]!;
}

function summaryCatalogField(fields: readonly CatalogStorefrontField[]): CatalogStorefrontField {
  return fields.find((field) => field.kind === 'text' && field.propertyName === 'summary')
    ?? fields.find((field) => field.kind === 'text' && fieldMatchesCatalogWords(field, /\b(summary|description|notes|detail)\b/u))
    ?? fields.find((field) => field.kind === 'text' && field !== primaryCatalogField(fields))
    ?? primaryCatalogField(fields);
}

function priceCatalogField(fields: readonly CatalogStorefrontField[]): CatalogStorefrontField | null {
  return fields.find((field) => field.kind === 'number' && field.propertyName === 'price')
    ?? fields.find((field) => field.kind === 'number' && fieldMatchesCatalogWords(field, /\b(price|cost|amount|rate)\b/u))
    ?? firstFieldOfKind(fields, 'number');
}

function stockCatalogField(fields: readonly CatalogStorefrontField[]): CatalogStorefrontField | null {
  return fields.find((field) => field.kind === 'boolean' && field.propertyName === 'inStock')
    ?? fields.find((field) => (field.kind === 'boolean' || field.kind === 'number') && fieldMatchesCatalogWords(field, /\b(stock|available|availability|active|enabled|published|inventory|quantity|count)\b/u))
    ?? firstFieldOfKind(fields, 'boolean');
}

function badgeCatalogField(fields: readonly CatalogStorefrontField[]): CatalogStorefrontField | null {
  return fields.find((field) => field.kind === 'select' && field.propertyName === 'badge')
    ?? fields.find((field) => field.kind === 'select' && fieldMatchesCatalogWords(field, /\b(badge|status|category|type|tier|tag)\b/u))
    ?? firstFieldOfKind(fields, 'select');
}

function fieldMatchesCatalogWords(
  field: CatalogStorefrontField,
  pattern: RegExp,
): boolean {
  return pattern.test(field.propertyName)
    || pattern.test(field.label.toLowerCase());
}

function firstFieldOfKind(
  fields: readonly CatalogStorefrontField[],
  kind: CatalogStorefrontFieldKind,
): CatalogStorefrontField | null {
  return fields.find((field) => field.kind === kind) ?? null;
}

function defaultOptionValues(words: readonly string[]): readonly CatalogStorefrontFieldOption[] {
  const lowerWords = words.map((word) => word.toLowerCase());
  if (lowerWords.includes('status') || lowerWords.includes('availability')) {
    return [
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'archived', label: 'Archived' },
    ];
  }
  if (lowerWords.includes('tier')) {
    return [
      { value: 'basic', label: 'Basic' },
      { value: 'standard', label: 'Standard' },
      { value: 'premium', label: 'Premium' },
    ];
  }
  if (lowerWords.includes('category') || lowerWords.includes('type')) {
    return [
      { value: 'core', label: 'Core' },
      { value: 'featured', label: 'Featured' },
      { value: 'seasonal', label: 'Seasonal' },
    ];
  }
  const base = kebabSourceName(words);
  return [
    { value: `${base}-one`, label: `${titleSourceName(words)} One` },
    { value: `${base}-two`, label: `${titleSourceName(words)} Two` },
    { value: `${base}-three`, label: `${titleSourceName(words)} Three` },
  ];
}

function stockExpression(fieldSchema: CatalogStorefrontFieldSchema): string {
  if (fieldSchema.stockField == null) {
    return 'true';
  }
  if (fieldSchema.stockField.kind === 'number') {
    return `this.${fieldSchema.stockField.propertyName} > 0`;
  }
  return `this.${fieldSchema.stockField.propertyName}`;
}
