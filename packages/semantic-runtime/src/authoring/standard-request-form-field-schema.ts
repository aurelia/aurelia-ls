import {
  indentSourceLines,
  sourceText,
} from './source-template.js';
import {
  kebabSourceName,
  lowerCamelSourceName,
  lowerTitleSourceName,
  pascalSourceName,
  pluralizeLastSourceNameWord,
  singularizeSourceNameWord,
  sourceNameWords,
  titleSourceName,
} from './source-name.js';
import {
  standardRequestFormFieldTemplate,
  type StandardRequestFormDomainNames,
} from './standard-request-form-source-templates.js';
import { SourcePatternModules } from './source-pattern-modules.js';
import type { AuthoringSourcePatternModule } from './source-plan.js';
import { splitSourceFieldSchemaItems } from './source-field-schema.js';
import {
  normalizedSourceOptionsParameterValue,
  sourceOptionSchemaGroupForField,
  sourceOptionSchemaGroups,
  sourceStringLiteral,
} from './source-option-schema.js';

export interface StandardRequestFormFieldSchema {
  readonly sourceParameterValue: string;
  readonly sourceOptionsParameterValue: string | null;
  readonly fields: readonly StandardRequestFormField[];
}

export interface StandardRequestFormField {
  readonly propertyName: string;
  readonly label: string;
  readonly controlKind: StandardRequestFormFieldControlKind;
  readonly typeName: string;
  readonly defaultValueExpression: string;
  readonly sampleValueExpression: string;
  readonly requiredForSubmit: boolean;
  readonly inputType: string | null;
  readonly optionTypeName: string | null;
  readonly optionPropertyName: string | null;
  readonly optionValues: readonly StandardRequestFormFieldOption[];
}

export interface StandardRequestFormFieldOption {
  readonly value: string;
  readonly label: string;
}

export interface StandardRequestFormFieldControlTemplateInput {
  readonly fieldShellElementName: string | null;
  readonly sourceName: string;
  readonly stateExpression: string;
  readonly validationEnabled: boolean;
  readonly validationTrigger: string | null;
  readonly validationErrorCollectionName?: string | null;
}

export type StandardRequestFormFieldControlKind =
  | 'text-input'
  | 'number-input'
  | 'date-input'
  | 'email-input'
  | 'tel-input'
  | 'secret-input'
  | 'textarea'
  | 'checkbox'
  | 'checkbox-collection'
  | 'select-single';

interface StandardRequestFormFieldControlDefinition {
  readonly usesNativeValue: boolean;
  readonly usesCheckedBinding: boolean;
  readonly usesSelectBinding: boolean;
  readonly usesFieldShell: boolean;
  readonly hasOptionDomain: boolean;
  readonly inputType: string | null;
  readonly targetProperty: string;
  readonly valueChannelKind: string;
  readonly valueChannelSummary: string;
  readonly defaultValueExpression: string;
  readonly requiredForSubmit: boolean;
  readonly typeName: (optionTypeName: string | null) => string;
  readonly sampleValueExpression: (propertyName: string) => string;
}

const standardRequestFormFieldControlDefinitions = {
  'text-input': {
    usesNativeValue: true,
    usesCheckedBinding: false,
    usesSelectBinding: false,
    usesFieldShell: true,
    hasOptionDomain: false,
    inputType: 'text',
    targetProperty: 'value',
    valueChannelKind: 'raw-property',
    valueChannelSummary: 'the native value channel',
    defaultValueExpression: "''",
    requiredForSubmit: true,
    typeName: () => 'string',
    sampleValueExpression: (propertyName) =>
      propertyName.endsWith('Name') || propertyName === 'name' || propertyName === 'title' || propertyName.endsWith('Title')
        ? 'label'
        : "''",
  },
  'number-input': {
    usesNativeValue: true,
    usesCheckedBinding: false,
    usesSelectBinding: false,
    usesFieldShell: true,
    hasOptionDomain: false,
    inputType: 'number',
    targetProperty: 'valueAsNumber',
    valueChannelKind: 'raw-property',
    valueChannelSummary: 'the native value channel',
    defaultValueExpression: '0',
    requiredForSubmit: false,
    typeName: () => 'number',
    sampleValueExpression: (propertyName) =>
      propertyName.endsWith('Count') || propertyName === 'count'
        ? '1'
        : '0',
  },
  'date-input': {
    usesNativeValue: true,
    usesCheckedBinding: false,
    usesSelectBinding: false,
    usesFieldShell: true,
    hasOptionDomain: false,
    inputType: 'date',
    targetProperty: 'value',
    valueChannelKind: 'raw-property',
    valueChannelSummary: 'the native value channel',
    defaultValueExpression: "''",
    requiredForSubmit: true,
    typeName: () => 'string',
    sampleValueExpression: (propertyName) =>
      propertyName.toLowerCase().includes('end')
        ? "'2026-01-15'"
        : "'2026-01-01'",
  },
  'email-input': {
    usesNativeValue: true,
    usesCheckedBinding: false,
    usesSelectBinding: false,
    usesFieldShell: true,
    hasOptionDomain: false,
    inputType: 'email',
    targetProperty: 'value',
    valueChannelKind: 'raw-property',
    valueChannelSummary: 'the native value channel',
    defaultValueExpression: "''",
    requiredForSubmit: true,
    typeName: () => 'string',
    sampleValueExpression: () => "`${label.toLowerCase().replace(' ', '.')}@example.test`",
  },
  'tel-input': {
    usesNativeValue: true,
    usesCheckedBinding: false,
    usesSelectBinding: false,
    usesFieldShell: true,
    hasOptionDomain: false,
    inputType: 'tel',
    targetProperty: 'value',
    valueChannelKind: 'raw-property',
    valueChannelSummary: 'the native value channel',
    defaultValueExpression: "''",
    requiredForSubmit: true,
    typeName: () => 'string',
    sampleValueExpression: () => "'+31 20 000 0000'",
  },
  'secret-input': {
    usesNativeValue: true,
    usesCheckedBinding: false,
    usesSelectBinding: false,
    usesFieldShell: true,
    hasOptionDomain: false,
    inputType: 'password',
    targetProperty: 'value',
    valueChannelKind: 'raw-property',
    valueChannelSummary: 'the native value channel',
    defaultValueExpression: "''",
    requiredForSubmit: true,
    typeName: () => 'string',
    sampleValueExpression: () => "`sample-${id}-${label.toLowerCase().replace(' ', '-')}`",
  },
  textarea: {
    usesNativeValue: true,
    usesCheckedBinding: false,
    usesSelectBinding: false,
    usesFieldShell: false,
    hasOptionDomain: false,
    inputType: null,
    targetProperty: 'value',
    valueChannelKind: 'raw-property',
    valueChannelSummary: 'the native value channel',
    defaultValueExpression: "''",
    requiredForSubmit: false,
    typeName: () => 'string',
    sampleValueExpression: () => "`Notes for ${label}`",
  },
  checkbox: {
    usesNativeValue: false,
    usesCheckedBinding: true,
    usesSelectBinding: false,
    usesFieldShell: false,
    hasOptionDomain: false,
    inputType: null,
    targetProperty: 'checked',
    valueChannelKind: 'checked-boolean',
    valueChannelSummary: 'the checked boolean value channel',
    defaultValueExpression: 'false',
    requiredForSubmit: false,
    typeName: () => 'boolean',
    sampleValueExpression: () => 'false',
  },
  'checkbox-collection': {
    usesNativeValue: false,
    usesCheckedBinding: true,
    usesSelectBinding: false,
    usesFieldShell: false,
    hasOptionDomain: true,
    inputType: null,
    targetProperty: 'checked',
    valueChannelKind: 'checked-collection-membership',
    valueChannelSummary: 'checked collection membership channels',
    defaultValueExpression: '[]',
    requiredForSubmit: false,
    typeName: (optionTypeName) => `${optionTypeName ?? 'string'}[]`,
    sampleValueExpression: () => '[]',
  },
  'select-single': {
    usesNativeValue: true,
    usesCheckedBinding: false,
    usesSelectBinding: true,
    usesFieldShell: false,
    hasOptionDomain: true,
    inputType: null,
    targetProperty: 'value',
    valueChannelKind: 'select-single-option-value',
    valueChannelSummary: 'a single-select option value channel',
    defaultValueExpression: 'null',
    requiredForSubmit: false,
    typeName: (optionTypeName) => `${optionTypeName ?? 'string'} | null`,
    sampleValueExpression: () => 'null',
  },
} as const satisfies Record<StandardRequestFormFieldControlKind, StandardRequestFormFieldControlDefinition>;

export function standardRequestFormFieldUsesNativeValue(
  field: StandardRequestFormField,
): boolean {
  return controlDefinitionForField(field).usesNativeValue;
}

export function standardRequestFormFieldUsesCheckedBinding(
  field: StandardRequestFormField,
): boolean {
  return controlDefinitionForField(field).usesCheckedBinding;
}

export function standardRequestFormFieldUsesSelectBinding(
  field: StandardRequestFormField,
): boolean {
  return controlDefinitionForField(field).usesSelectBinding;
}

export function standardRequestFormFieldUsesFieldShell(
  field: StandardRequestFormField,
): boolean {
  return controlDefinitionForField(field).usesFieldShell;
}

export function standardRequestFormFieldTargetProperty(
  field: StandardRequestFormField,
): string {
  return controlDefinitionForField(field).targetProperty;
}

export function standardRequestFormFieldValueChannelKind(
  field: StandardRequestFormField,
): string {
  return controlDefinitionForField(field).valueChannelKind;
}

export function standardRequestFormFieldValueChannelSummary(
  field: StandardRequestFormField,
): string {
  return controlDefinitionForField(field).valueChannelSummary;
}

export interface StandardRequestFormValidationFieldTokens {
  readonly formImport: string;
  readonly stateImport: string;
  readonly formFields: string;
  readonly constructorBody: string;
}

export interface StandardRequestFormCustomTemplateInput {
  readonly domain: StandardRequestFormDomainNames;
  readonly fieldSchema: StandardRequestFormFieldSchema;
  readonly fieldShellElementName: string | null;
  readonly formSummary: string;
  readonly submitTrigger: string;
  readonly submitLabel: string;
  readonly validationTrigger: string | null;
  readonly validationEnabled: boolean;
}

export function standardRequestFormFieldSchemaFromParameter(
  value?: string | null,
  optionsValue?: string | null,
): StandardRequestFormFieldSchema | null {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length === 0) {
    return null;
  }
  const fields = splitSourceFieldSchemaItems(trimmed)
    .map(standardRequestFormFieldFromItem)
    .filter((field): field is StandardRequestFormField => field != null);
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

export function standardRequestFormFieldSchemaFromRecipeRequest(
  requestFields?: string | null,
  optionsValue?: string | null,
  requestEntityName?: string | null,
): StandardRequestFormFieldSchema | null {
  const effectiveRequestFields = requestFields ?? standardRequestFormImplicitFieldSchema(requestEntityName);
  return standardRequestFormFieldSchemaFromParameter(effectiveRequestFields, optionsValue);
}

function standardRequestFormImplicitFieldSchema(
  requestEntityName?: string | null,
): string | null {
  // A caller-named domain with no authored field schema should not inherit the rich ServiceRequest
  // reference fields. Keep one neutral field as a source-applicable adaptation anchor instead.
  return requestEntityName?.trim() === '' || requestEntityName == null ? null : 'name';
}

export function standardRequestFormCustomStateSource(
  stateClassName: string,
  domain: StandardRequestFormDomainNames,
  fieldSchema: StandardRequestFormFieldSchema,
): string {
  return sourceText(`${standardRequestFormFieldTypeDeclarations(fieldSchema)}
export class ${domain.entityClassName} {
  constructor(
    readonly id: string,
${indentSourceLines(standardRequestFormFieldConstructorParameters(fieldSchema), '    ')}
    public submitCount: number,
  ) {}

  get canSubmit(): boolean {
    return ${standardRequestFormCanSubmitExpression(fieldSchema)};
  }
}

export class ${stateClassName} {
  readonly ${domain.selectionIdsPropertyName} = ['${domain.sampleIdPrefix}-1', '${domain.sampleIdPrefix}-2'];
  ${domain.selectedSelectionIdPropertyName} = '${domain.sampleIdPrefix}-1';
${indentSourceLines(standardRequestFormStateOptionProperties(fieldSchema), '  ')}
  private readonly ${domain.collectionPropertyName} = new Map<string, ${domain.entityClassName}>([
    ['${domain.sampleIdPrefix}-1', ${domain.createEntityFunctionName}('${domain.sampleIdPrefix}-1', ${sourceStringLiteral(customSampleLabel(domain, 1))})],
    ['${domain.sampleIdPrefix}-2', ${domain.createEntityFunctionName}('${domain.sampleIdPrefix}-2', ${sourceStringLiteral(customSampleLabel(domain, 2))})],
  ]);

  get submittedCount(): number {
    let count = 0;
    for (const ${domain.entityVariableName} of this.${domain.collectionPropertyName}.values()) {
      count += ${domain.entityVariableName}.submitCount;
    }
    return count;
  }

  ${domain.readEntityMethodName}(${domain.selectionIdName}: string): ${domain.entityClassName} | null {
    return this.${domain.collectionPropertyName}.get(${domain.selectionIdName}) ?? null;
  }

  ${domain.submitEntityMethodName}(${domain.selectionIdName}: string): void {
    const ${domain.entityVariableName} = this.${domain.readEntityMethodName}(${domain.selectionIdName});
    if (${domain.entityVariableName} != null) {
      ${domain.entityVariableName}.submitCount += 1;
    }
  }
}

${customCreateFunction(domain, fieldSchema)}
`);
}

export function standardRequestFormCustomDraftStateSource(
  stateClassName: string,
  domain: StandardRequestFormDomainNames,
  fieldSchema: StandardRequestFormFieldSchema,
): string {
  return sourceText(`${standardRequestFormFieldTypeDeclarations(fieldSchema)}
export class ${domain.entityClassName} {
  constructor(
    readonly id: string,
${indentSourceLines(standardRequestFormFieldConstructorParameters(fieldSchema), '    ')}
    public submitCount: number,
  ) {}

  get canSubmit(): boolean {
    return ${standardRequestFormCanSubmitExpression(fieldSchema)};
  }
}

export class ${stateClassName} {
${indentSourceLines(standardRequestFormStateOptionProperties(fieldSchema), '  ')}
  readonly ${domain.entityVariableName} = ${domain.createEntityFunctionName}('${domain.sampleIdPrefix}-draft', ${sourceStringLiteral(customSampleLabel(domain, 1))});

  get submittedCount(): number {
    return this.${domain.entityVariableName}.submitCount;
  }

  ${domain.submitEntityMethodName}(): void {
    this.${domain.entityVariableName}.submitCount += 1;
  }
}

${customCreateFunction(domain, fieldSchema)}
`);
}

export function standardRequestFormCustomServiceBackedStateSource(
  stateClassName: string,
  serviceClassName: string,
  serviceModule: string,
  domain: StandardRequestFormDomainNames,
  fieldSchema: StandardRequestFormFieldSchema,
): string {
  return sourceText(`import { resolve } from 'aurelia';
import { ${serviceClassName} } from '${serviceModule}';

${standardRequestFormFieldTypeDeclarations(fieldSchema)}
export class ${domain.entityClassName} {
  constructor(
    readonly id: string,
${indentSourceLines(standardRequestFormFieldConstructorParameters(fieldSchema), '    ')}
    public submitCount: number,
  ) {}

  get canSubmit(): boolean {
    return ${standardRequestFormCanSubmitExpression(fieldSchema)};
  }
}

export class ${stateClassName} {
  private readonly ${domain.servicePropertyName} = resolve(${serviceClassName});
  private readonly ${domain.collectionPropertyName} = new Map<string, ${domain.entityClassName}>();

  ${domain.selectedSelectionIdPropertyName} = '';
  ${domain.loadingPropertyName} = false;
${indentSourceLines(standardRequestFormStateOptionProperties(fieldSchema), '  ')}
  get ${domain.selectionIdsPropertyName}(): readonly string[] {
    return [...this.${domain.collectionPropertyName}.keys()];
  }

  get submittedCount(): number {
    let count = 0;
    for (const ${domain.entityVariableName} of this.${domain.collectionPropertyName}.values()) {
      count += ${domain.entityVariableName}.submitCount;
    }
    return count;
  }

  ${domain.readEntityMethodName}(${domain.selectionIdName}: string): ${domain.entityClassName} | null {
    return this.${domain.collectionPropertyName}.get(${domain.selectionIdName}) ?? null;
  }

  async ${domain.loadEntitiesMethodName}(): Promise<void> {
    if (this.${domain.collectionPropertyName}.size > 0 || this.${domain.loadingPropertyName}) {
      return;
    }

    this.${domain.loadingPropertyName} = true;
    try {
      this.${domain.replaceEntitiesMethodName}(await this.${domain.servicePropertyName}.${domain.loadEntitiesMethodName}());
      this.${domain.selectedSelectionIdPropertyName} = this.${domain.selectionIdsPropertyName}[0] ?? '';
    } finally {
      this.${domain.loadingPropertyName} = false;
    }
  }

  async ${domain.submitEntityMethodName}(${domain.selectionIdName}: string): Promise<void> {
    const ${domain.entityVariableName} = this.${domain.readEntityMethodName}(${domain.selectionIdName});
    if (${domain.entityVariableName} != null) {
      ${domain.entityVariableName}.submitCount += 1;
      await this.${domain.servicePropertyName}.${domain.submitEntityMethodName}(${domain.entityVariableName});
    }
  }

  private ${domain.replaceEntitiesMethodName}(${domain.collectionPropertyName}: readonly ${domain.entityClassName}[]): void {
    this.${domain.collectionPropertyName}.clear();
    for (const ${domain.entityVariableName} of ${domain.collectionPropertyName}) {
      this.${domain.collectionPropertyName}.set(${domain.entityVariableName}.id, ${domain.entityVariableName});
    }
  }
}
`);
}

export function standardRequestFormCustomServiceBackedDraftStateSource(
  stateClassName: string,
  serviceClassName: string,
  serviceModule: string,
  domain: StandardRequestFormDomainNames,
  fieldSchema: StandardRequestFormFieldSchema,
): string {
  return sourceText(`import { resolve } from 'aurelia';
import { ${serviceClassName} } from '${serviceModule}';

${standardRequestFormFieldTypeDeclarations(fieldSchema)}
export class ${domain.entityClassName} {
  constructor(
    readonly id: string,
${indentSourceLines(standardRequestFormFieldConstructorParameters(fieldSchema), '    ')}
    public submitCount: number,
  ) {}

  get canSubmit(): boolean {
    return ${standardRequestFormCanSubmitExpression(fieldSchema)};
  }
}

export class ${stateClassName} {
  private readonly ${domain.servicePropertyName} = resolve(${serviceClassName});
${indentSourceLines(standardRequestFormStateOptionProperties(fieldSchema), '  ')}
  readonly ${domain.entityVariableName} = ${domain.createEntityFunctionName}('${domain.sampleIdPrefix}-draft', ${sourceStringLiteral(customSampleLabel(domain, 1))});
  isSubmitting = false;

  get submittedCount(): number {
    return this.${domain.entityVariableName}.submitCount;
  }

  async ${domain.submitEntityMethodName}(): Promise<void> {
    if (this.isSubmitting || !this.${domain.entityVariableName}.canSubmit) {
      return;
    }

    this.isSubmitting = true;
    try {
      await this.${domain.servicePropertyName}.${domain.submitEntityMethodName}(this.${domain.entityVariableName});
      this.${domain.entityVariableName}.submitCount += 1;
    } finally {
      this.isSubmitting = false;
    }
  }
}

${customCreateFunction(domain, fieldSchema)}
`);
}

export function standardRequestFormCustomServiceSource(
  serviceClassName: string,
  stateModule: string,
  domain: StandardRequestFormDomainNames,
  fieldSchema: StandardRequestFormFieldSchema,
): string {
  return sourceText(`import { ${domain.entityClassName} } from '${stateModule}';

export class ${serviceClassName} {
  async ${domain.loadEntitiesMethodName}(): Promise<readonly ${domain.entityClassName}[]> {
    return [
      ${domain.createEntityFunctionName}('${domain.sampleIdPrefix}-1', ${sourceStringLiteral(customSampleLabel(domain, 1))}),
      ${domain.createEntityFunctionName}('${domain.sampleIdPrefix}-2', ${sourceStringLiteral(customSampleLabel(domain, 2))}),
    ];
  }

  async ${domain.submitEntityMethodName}(_${domain.entityVariableName}: ${domain.entityClassName}): Promise<void> {
    return;
  }
}

${customCreateFunction(domain, fieldSchema)}
`);
}

export function standardRequestFormCustomServiceSubmissionSource(
  serviceClassName: string,
  stateModule: string,
  domain: StandardRequestFormDomainNames,
): string {
  return sourceText(`import { ${domain.entityClassName} } from '${stateModule}';

export class ${serviceClassName} {
  async ${domain.submitEntityMethodName}(_${domain.entityVariableName}: ${domain.entityClassName}): Promise<void> {
    return;
  }
}
`);
}

export function standardRequestFormCustomTemplateSource(
  input: StandardRequestFormCustomTemplateInput,
): string {
  const fields = input.fieldSchema.fields
    .map((field) => standardRequestFormFieldControlTemplate(field, {
      fieldShellElementName: input.fieldShellElementName,
      sourceName: `${input.domain.entityVariableName}.${field.propertyName}`,
      stateExpression: 'state',
      validationEnabled: input.validationEnabled,
      validationTrigger: input.validationTrigger,
      validationErrorCollectionName: `${field.propertyName}Errors`,
    }))
    .join('\n\n');
  return sourceText(`<let ${input.domain.entityVariableName}.bind="state.${input.domain.readEntityMethodName}(${input.domain.selectionIdName})"></let>
<template if.bind="${input.domain.entityVariableName} != null">
  <form class.bind="${input.domain.entityVariableName}.canSubmit ? 'form-ready' : 'form-pending'" submit.trigger="${input.submitTrigger}">${input.formSummary}
${fields}

    ${input.submitLabel}
  </form>
</template>
<p else>Loading ${input.domain.entityLabelLower}...</p>
`);
}

export function standardRequestFormCustomDraftTemplateSource(
  input: StandardRequestFormCustomTemplateInput,
): string {
  const fields = input.fieldSchema.fields
    .map((field) => standardRequestFormFieldControlTemplate(field, {
      fieldShellElementName: input.fieldShellElementName,
      sourceName: `${input.domain.entityVariableName}.${field.propertyName}`,
      stateExpression: 'state',
      validationEnabled: input.validationEnabled,
      validationTrigger: input.validationTrigger,
      validationErrorCollectionName: `${field.propertyName}Errors`,
    }))
    .join('\n\n');
  return sourceText(`<let ${input.domain.entityVariableName}.bind="state.${input.domain.entityVariableName}"></let>
<form class.bind="${input.domain.entityVariableName}.canSubmit ? 'form-ready' : 'form-pending'" submit.trigger="${input.submitTrigger}">${input.formSummary}
${fields}

  ${input.submitLabel}
</form>
`);
}

export function standardRequestFormCustomValidationTokens(
  domain: StandardRequestFormDomainNames,
  fieldSchema: StandardRequestFormFieldSchema,
): StandardRequestFormValidationFieldTokens {
  const validationFields = fieldSchema.fields
    .filter((field) => field.requiredForSubmit && fieldSupportsFieldShell(field))
    .map((field) => `  ${field.propertyName}Errors: ValidationResultTarget[] = [];`)
    .join('\n');
  const ruleLines = fieldSchema.fields
    .filter((field) => field.requiredForSubmit)
    .flatMap((field) => [
      `      .ensure((${domain.entityVariableName}) => ${domain.entityVariableName}.${field.propertyName})`,
      '      .required()',
      ...(field.controlKind === 'email-input' ? ['      .email()'] : []),
    ]);
  return {
    formImport: "import { IValidationRules } from '@aurelia/validation';\nimport { IValidationController, type ValidationResultTarget } from '@aurelia/validation-html';\n",
    stateImport: `, ${domain.entityClassName}`,
    formFields: validationFields.length === 0
      ? `  private readonly validationRules = resolve(IValidationRules);
  private readonly validationController = resolve(IValidationController);
`
      : `  private readonly validationRules = resolve(IValidationRules);
  private readonly validationController = resolve(IValidationController);

${validationFields}
`,
    constructorBody: `

  constructor() {
    this.validationRules
      .on(${domain.entityClassName})
${ruleLines.join('\n')};
  }
`,
  };
}

export function standardRequestFormFieldSchemaOptionSummary(
  fieldSchema: StandardRequestFormFieldSchema | null,
): string | undefined {
  if (fieldSchema == null) {
    return undefined;
  }
  const optionLabels = fieldSchema.fields
    .filter((field) => field.controlKind === 'select-single' || field.controlKind === 'checkbox-collection')
    .map((field) => `${field.label} options`);
  return optionLabels.length === 0
    ? 'no generated option domains'
    : optionLabels.join(', ');
}

export function standardRequestFormFieldSchemaOptionParameterValue(
  fieldSchema: StandardRequestFormFieldSchema | null,
): string | undefined {
  if (fieldSchema == null) {
    return undefined;
  }
  if (fieldSchema.sourceOptionsParameterValue != null) {
    return fieldSchema.sourceOptionsParameterValue;
  }
  const optionGroups = fieldSchema.fields
    .filter(fieldHasOptionDomain)
    .map((field) => `${lowerTitleSourceName(sourceNameWords(field.label))}: ${field.optionValues.map((option) => option.label).join(', ')}`);
  return optionGroups.length === 0
    ? 'no generated option domains'
    : optionGroups.join('; ');
}

export function standardRequestFormFieldSchemaModules(
  fieldSchema: StandardRequestFormFieldSchema | null,
  options: { readonly includeFieldShell?: boolean } = {},
): readonly AuthoringSourcePatternModule[] | undefined {
  if (fieldSchema == null) {
    return undefined;
  }
  const modules: AuthoringSourcePatternModule[] = [
    SourcePatternModules.NativeFormValueChannels,
    SourcePatternModules.TemplateControllerFlow,
    SourcePatternModules.ClassStyleChannels,
  ];
  if (fieldSchema.fields.some(fieldUsesTextValueChannel)) {
    modules.push(SourcePatternModules.NativeTextValueChannel);
  }
  if (fieldSchema.fields.some((field) => field.controlKind === 'checkbox')) {
    modules.push(SourcePatternModules.CheckedBooleanChannel);
  }
  if (fieldSchema.fields.some((field) => field.controlKind === 'checkbox-collection')) {
    modules.push(SourcePatternModules.CheckedCollectionChannel);
  }
  if (fieldSchema.fields.some((field) => field.controlKind === 'select-single')) {
    modules.push(SourcePatternModules.SelectOptionModelChannel);
  }
  if ((options.includeFieldShell ?? true) && fieldSchema.fields.some(fieldUsesFieldShell)) {
    modules.push(SourcePatternModules.CaptureAttributeFieldShell);
  }
  return modules;
}

export function standardRequestFormFieldSchemaHasOptionDomains(
  fieldSchema: StandardRequestFormFieldSchema | null,
): boolean {
  return fieldSchema?.fields.some(fieldHasOptionDomain) ?? false;
}

export function standardRequestFormFieldNames(
  fieldSchema: StandardRequestFormFieldSchema | null,
): readonly string[] {
  return fieldSchema?.fields.map((field) => field.propertyName) ?? [];
}

function standardRequestFormFieldFromItem(
  item: string,
): StandardRequestFormField | null {
  const controlKind = inferControlKind(item);
  const words = sourceNameWords(cleanFieldLabel(item, controlKind));
  if (words.length === 0) {
    return null;
  }
  const optionWords = controlKind === 'checkbox-collection'
    ? words.map(singularizeSourceNameWord)
    : words;
  const propertyWords = controlKind === 'checkbox-collection'
    ? pluralizeLastSourceNameWord(optionWords)
    : optionWords;
  const label = titleSourceName(propertyWords);
  const propertyName = propertyNameForField(propertyWords, controlKind);
  const optionTypeName = controlKind === 'select-single' || controlKind === 'checkbox-collection'
    ? pascalSourceName(optionWords)
    : null;
  const optionPropertyName = controlKind === 'select-single' || controlKind === 'checkbox-collection'
    ? `${lowerCamelSourceName(optionWords)}Options`
    : null;
  const optionValues = controlKind === 'select-single' || controlKind === 'checkbox-collection'
    ? defaultOptionValues(optionWords)
    : [];
  const sampleValueExpression = controlKind === 'checkbox-collection'
    ? `[${optionValues[0] == null ? '' : sourceStringLiteral(optionValues[0].value)}]`
    : sampleValueForControl(controlKind, propertyName);
  return {
    propertyName,
    label,
    controlKind,
    typeName: typeNameForControl(controlKind, optionTypeName),
    defaultValueExpression: defaultValueForControl(controlKind),
    sampleValueExpression,
    requiredForSubmit: controlDefinitionForControl(controlKind).requiredForSubmit,
    inputType: inputTypeForControl(controlKind),
    optionTypeName,
    optionPropertyName,
    optionValues,
  };
}

function applySourceOptionSchema(
  fields: readonly StandardRequestFormField[],
  value: string,
): readonly StandardRequestFormField[] {
  const groups = sourceOptionSchemaGroups(value);
  if (groups.length === 0) {
    return fields;
  }
  return fields.map((field) => {
    if (!fieldHasOptionDomain(field)) {
      return field;
    }
    const group = sourceOptionSchemaGroupForField(
      field,
      groups,
      fields,
      fieldHasOptionDomain,
      optionDomainFieldKeys,
    );
    return group == null
      ? field
      : {
        ...field,
        optionValues: group.options,
        sampleValueExpression: sampleValueForFieldWithOptions(field, group.options),
      };
  });
}

function optionDomainFieldKeys(field: StandardRequestFormField): readonly string[] {
  const labelWords = sourceNameWords(field.label);
  const singularLabelWords = labelWords.map(singularizeSourceNameWord);
  const pluralLabelWords = pluralizeLastSourceNameWord(singularLabelWords);
  return [
    field.propertyName,
    field.label,
    titleSourceName(singularLabelWords),
    titleSourceName(pluralLabelWords),
    lowerCamelSourceName(singularLabelWords),
    lowerCamelSourceName(pluralLabelWords),
    ...(field.optionTypeName == null ? [] : [field.optionTypeName]),
    ...(field.optionPropertyName == null ? [] : [field.optionPropertyName]),
  ];
}

function sampleValueForFieldWithOptions(
  field: StandardRequestFormField,
  options: readonly StandardRequestFormFieldOption[],
): string {
  if (field.controlKind === 'checkbox-collection') {
    return `[${options[0] == null ? '' : sourceStringLiteral(options[0].value)}]`;
  }
  if (field.controlKind === 'select-single') {
    return options[0] == null ? 'null' : sourceStringLiteral(options[0].value);
  }
  return field.sampleValueExpression;
}

function fieldHasOptionDomain(field: StandardRequestFormField): boolean {
  return controlDefinitionForField(field).hasOptionDomain;
}

function controlDefinitionForField(
  field: StandardRequestFormField,
): StandardRequestFormFieldControlDefinition {
  return controlDefinitionForControl(field.controlKind);
}

function controlDefinitionForControl(
  controlKind: StandardRequestFormFieldControlKind,
): StandardRequestFormFieldControlDefinition {
  return standardRequestFormFieldControlDefinitions[controlKind];
}

function inferControlKind(item: string): StandardRequestFormFieldControlKind {
  const normalized = item.toLowerCase();
  if (/\b(checkboxes|checked collection|checked list)\b/u.test(normalized)) {
    return 'checkbox-collection';
  }
  if (/\b(phone|telephone|tel)\b/u.test(normalized)) {
    return 'tel-input';
  }
  if (/\b(number|numeric|stock|quantity|qty|count|amount|total|price|rate|percent|percentage)\b/u.test(normalized)) {
    return 'number-input';
  }
  if (/\b(date|time|day|due|start|end)\b/u.test(normalized)) {
    return 'date-input';
  }
  if (/\b(toggle|toggles|switch|checkbox|checked|enabled|disabled|active)\b/u.test(normalized)) {
    return 'checkbox';
  }
  if (/\b(select|dropdown|choice|choices|option|options|language|status|category|type)\b/u.test(normalized)) {
    return 'select-single';
  }
  if (/\b(email|e-mail)\b/u.test(normalized)) {
    return 'email-input';
  }
  if (/\b(password|secret|token|api key|apikey|access key)\b/u.test(normalized)) {
    return 'secret-input';
  }
  if (/\b(notes|note|description|comments|comment|message)\b/u.test(normalized)) {
    return 'textarea';
  }
  return 'text-input';
}

function cleanFieldLabel(
  item: string,
  controlKind: StandardRequestFormFieldControlKind,
): string {
  let cleaned = item
    .replace(/\b(field|input|control)\b/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (controlKind === 'select-single') {
    cleaned = cleaned.replace(/\b(select|dropdown|choice|choices|option|options)\b/giu, ' ');
  }
  if (controlKind === 'checkbox') {
    cleaned = cleaned.replace(/\b(toggle|toggles|switch|checkbox|checked)\b/giu, ' ');
  }
  if (controlKind === 'checkbox-collection') {
    cleaned = cleaned.replace(/\b(checkboxes|checked collection|checked list)\b/giu, ' ');
  }
  if (controlKind === 'number-input') {
    cleaned = cleaned.replace(/\b(number|numeric)\b/giu, ' ');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

function propertyNameForField(
  words: readonly string[],
  controlKind: StandardRequestFormFieldControlKind,
): string {
  if (controlKind === 'checkbox' && !booleanFieldUsesPredicateName(words)) {
    return lowerCamelSourceName([...words, 'enabled']);
  }
  return lowerCamelSourceName(words);
}

function booleanFieldUsesPredicateName(
  words: readonly string[],
): boolean {
  const lastWord = words[words.length - 1];
  return lastWord != null && [
    'active',
    'archived',
    'available',
    'disabled',
    'enabled',
    'favorite',
    'featured',
    'flagged',
    'hidden',
    'locked',
    'paid',
    'private',
    'public',
    'published',
    'required',
    'selected',
    'starred',
    'subscribed',
    'verified',
    'visible',
  ].includes(lastWord);
}

function typeNameForControl(
  controlKind: StandardRequestFormFieldControlKind,
  optionTypeName: string | null,
): string {
  return controlDefinitionForControl(controlKind).typeName(optionTypeName);
}

function defaultValueForControl(
  controlKind: StandardRequestFormFieldControlKind,
): string {
  return controlDefinitionForControl(controlKind).defaultValueExpression;
}

function sampleValueForControl(
  controlKind: StandardRequestFormFieldControlKind,
  propertyName: string,
): string {
  return controlDefinitionForControl(controlKind).sampleValueExpression(propertyName);
}

function inputTypeForControl(
  controlKind: StandardRequestFormFieldControlKind,
): string | null {
  return controlDefinitionForControl(controlKind).inputType;
}

function defaultOptionValues(words: readonly string[]): readonly StandardRequestFormFieldOption[] {
  const base = kebabSourceName(words);
  return [
    { value: `${base}-one`, label: `${titleSourceName(words)} One` },
    { value: `${base}-two`, label: `${titleSourceName(words)} Two` },
  ];
}

export function standardRequestFormFieldTypeDeclarations(
  fieldSchema: StandardRequestFormFieldSchema,
): string {
  const declarations = fieldSchema.fields
    .filter((field) => (field.controlKind === 'select-single' || field.controlKind === 'checkbox-collection') && field.optionTypeName != null)
    .map((field) => `export type ${field.optionTypeName} = ${field.optionValues.map((option) => sourceStringLiteral(option.value)).join(' | ')};`);
  return declarations.length === 0 ? '' : `${declarations.join('\n')}\n\n`;
}

export function standardRequestFormFieldConstructorParameters(
  fieldSchema: StandardRequestFormFieldSchema,
): string {
  return fieldSchema.fields
    .map((field) => `public ${field.propertyName}: ${field.typeName},`)
    .join('\n');
}

export function standardRequestFormCanSubmitExpression(
  fieldSchema: StandardRequestFormFieldSchema,
  sourceExpression = 'this',
): string {
  const requiredFields = fieldSchema.fields.filter((field) => field.requiredForSubmit);
  if (requiredFields.length === 0) {
    return 'true';
  }
  return requiredFields
    .map((field) => `${sourceExpression}.${field.propertyName} !== ''`)
    .join(' && ');
}

export function standardRequestFormStateOptionProperties(
  fieldSchema: StandardRequestFormFieldSchema,
): string {
  return fieldSchema.fields
    .filter((field) => (field.controlKind === 'select-single' || field.controlKind === 'checkbox-collection') && field.optionPropertyName != null && field.optionTypeName != null)
    .map((field) => `readonly ${field.optionPropertyName}: readonly ${field.optionTypeName}[] = [${field.optionValues.map((option) => sourceStringLiteral(option.value)).join(', ')}];`)
    .join('\n');
}

export function standardRequestFormFieldSampleValueArguments(
  fieldSchema: StandardRequestFormFieldSchema,
): string {
  return fieldSchema.fields
    .map((field) => `    ${field.sampleValueExpression},`)
    .join('\n');
}

function customCreateFunction(
  domain: StandardRequestFormDomainNames,
  fieldSchema: StandardRequestFormFieldSchema,
): string {
  return `function ${domain.createEntityFunctionName}(id: string, label: string): ${domain.entityClassName} {
  return new ${domain.entityClassName}(
    id,
${standardRequestFormFieldSampleValueArguments(fieldSchema)}
    0,
  );
}`;
}

function customSampleLabel(
  domain: StandardRequestFormDomainNames,
  ordinal: 1 | 2,
): string {
  return `${domain.entityTitle} ${ordinal === 1 ? 'One' : 'Two'}`;
}

export function standardRequestFormFieldControlTemplate(
  field: StandardRequestFormField,
  input: StandardRequestFormFieldControlTemplateInput,
): string {
  switch (field.controlKind) {
    case 'text-input':
    case 'date-input':
    case 'number-input':
    case 'email-input':
    case 'tel-input':
    case 'secret-input':
      return standardRequestFormFieldInputTemplate(field, input);
    case 'textarea':
      return `    <label for="${kebabSourceName(sourceNameWords(field.propertyName))}">${field.label}</label>
    <textarea id="${kebabSourceName(sourceNameWords(field.propertyName))}" ${customValueBinding(input.sourceName, input.validationEnabled, input.validationTrigger, field)}></textarea>`;
    case 'checkbox':
      return `    <label>
      <input type="checkbox" checked.bind="${input.sourceName}">
      ${field.label}
    </label>`;
    case 'checkbox-collection':
      return `    <fieldset>
      <legend>${field.label}</legend>
      <label repeat.for="option of ${input.stateExpression}.${field.optionPropertyName}">
        <input type="checkbox" model.bind="option" checked.bind="${input.sourceName}">
        \${option}
      </label>
    </fieldset>`;
    case 'select-single':
      return `    <label for="${kebabSourceName(sourceNameWords(field.propertyName))}">${field.label}</label>
    <select id="${kebabSourceName(sourceNameWords(field.propertyName))}" value.bind="${input.sourceName}">
      <option model.bind="null">Choose...</option>
      <option repeat.for="option of ${input.stateExpression}.${field.optionPropertyName}" model.bind="option">\${option}</option>
    </select>`;
  }
}

function standardRequestFormFieldInputTemplate(
  field: StandardRequestFormField,
  input: StandardRequestFormFieldControlTemplateInput,
): string {
  const inputId = kebabSourceName(sourceNameWords(field.propertyName));
  const valueBinding = customValueBinding(input.sourceName, input.validationEnabled, input.validationTrigger, field);
  const errorCollectionName = input.validationEnabled && field.requiredForSubmit
    ? input.validationErrorCollectionName ?? `${field.propertyName}Errors`
    : null;
  if (input.fieldShellElementName != null) {
    return standardRequestFormFieldTemplate({
      fieldShellElementName: input.fieldShellElementName,
      inputId,
      label: field.label,
      type: field.inputType ?? 'text',
      valueBinding,
      errorCollectionName,
    });
  }
  const inputSource = `    <label for="${inputId}">${field.label}</label>
    <input id="${inputId}" type="${field.inputType ?? 'text'}" ${valueBinding}>`;
  if (errorCollectionName == null) {
    return inputSource;
  }
  return `    <div class.bind="${errorCollectionName}.length > 0 ? 'field-stack field-invalid' : 'field-stack'" validation-errors.from-view="${errorCollectionName}">
${indentSourceLines(inputSource, '  ')}
      <p class="error" repeat.for="error of ${errorCollectionName}">\${error.result.message}</p>
    </div>`;
}

function customValueBinding(
  sourceName: string,
  validationEnabled: boolean,
  validationTrigger: string | null,
  field: StandardRequestFormField,
): string {
  if (field.controlKind === 'number-input') {
    return `value-as-number.bind="${sourceName}"`;
  }
  if (!validationEnabled || !field.requiredForSubmit) {
    return `value.bind="${sourceName}"`;
  }
  const triggerArgument = validationTrigger == null ? '' : `:'${validationTrigger}'`;
  return `value.two-way="${sourceName} & validate${triggerArgument}"`;
}

function fieldSupportsFieldShell(
  field: StandardRequestFormField,
): boolean {
  return fieldUsesFieldShell(field);
}

function fieldUsesFieldShell(
  field: StandardRequestFormField,
): boolean {
  return field.controlKind === 'text-input'
    || field.controlKind === 'number-input'
    || field.controlKind === 'date-input'
    || field.controlKind === 'email-input'
    || field.controlKind === 'secret-input';
}

function fieldUsesTextValueChannel(
  field: StandardRequestFormField,
): boolean {
  return field.controlKind === 'text-input'
    || field.controlKind === 'number-input'
    || field.controlKind === 'date-input'
    || field.controlKind === 'email-input'
    || field.controlKind === 'secret-input'
    || field.controlKind === 'textarea';
}
