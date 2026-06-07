import {
  appBuilderDomainFieldDisplayMemberName,
  appBuilderDomainFieldChoiceTypeAliases,
  type AppBuilderDomainFieldSourceModel,
} from './domain-field-source.js';
import {
  appBuilderDomainIdentityTypeScriptType,
  AppBuilderDomainFieldValueKind,
  type AppBuilderDomainIdentityValueKind,
} from './domain-model.js';
import {
  appBuilderLowerCamelCase,
  appBuilderSeedRecordLiteral,
} from './source-lowering-helpers.js';

/** Source shape used when generated code constructs a domain entity. */
export enum AppBuilderDomainEntityConstructionInputStyle {
  /** Keep small entities compact with ordered constructor parameters. */
  PositionalParameters = 'positional-parameters',
  /** Use named object input when ordered arguments would become brittle. */
  NamedObject = 'named-object',
}

const NAMED_OBJECT_CONSTRUCTION_FIELD_THRESHOLD = 5;

/** Source model for an ordinary generated domain entity class. */
export interface AppBuilderDomainEntityExtraPropertySourceModel {
  readonly memberName: string;
  readonly typeScriptType: string;
  readonly parameterModifier?: 'public' | 'readonly';
}

/** Source model for an ordinary generated domain entity class. */
export interface AppBuilderDomainEntityClassSourceModel {
  readonly entityTypeName: string;
  readonly identityMemberName: string;
  readonly identityValueKind: AppBuilderDomainIdentityValueKind;
  readonly fields: readonly AppBuilderDomainFieldSourceModel[];
  /** Extra domain properties such as owned child/value-object relationships. */
  readonly extraProperties?: readonly AppBuilderDomainEntityExtraPropertySourceModel[];
  /** Default field modifier when no action-derived mutable field set is supplied. */
  readonly fieldParameterModifier?: 'public' | 'readonly';
  /** Field names that emitted source is known to mutate and therefore cannot be readonly. */
  readonly mutableFieldNames?: readonly string[];
  readonly constructionInputStyle?: AppBuilderDomainEntityConstructionInputStyle;
  readonly includeChoiceTypeAliases?: boolean;
  /** Emit presentation-oriented getters for fields that need display labels. */
  readonly includeDisplayAccessors?: boolean;
  /** Restrict display accessors to user-facing fields when some constructor fields are internal linkage state. */
  readonly displayAccessorFields?: readonly AppBuilderDomainFieldSourceModel[];
}

/** One property expression used to construct a generated domain entity. */
export interface AppBuilderDomainEntityConstructionPropertySource {
  readonly memberName: string;
  readonly expression: string;
}

/** Formatting context for a generated domain entity construction expression. */
export interface AppBuilderDomainEntityConstructionExpressionSourceOptions {
  /** Indentation before multiline named-object properties. */
  readonly baseIndent?: string;
}

/** One generated display helper function for record-shaped domain entities. */
export interface AppBuilderDomainEntityDisplayFunction {
  readonly field: AppBuilderDomainFieldSourceModel;
  readonly functionName: string;
}

/** Source text plus function identities for record-shaped domain display helpers. */
export interface AppBuilderDomainEntityDisplayFunctionSource {
  readonly text: string;
  readonly functions: readonly AppBuilderDomainEntityDisplayFunction[];
}

/** Source model for helper functions when the domain entity is an interface/record. */
export interface AppBuilderDomainEntityDisplayFunctionSourceModel {
  readonly entityTypeName: string;
  readonly fields: readonly AppBuilderDomainFieldSourceModel[];
  readonly parameterName?: string;
}

/** Emit an ordinary domain class with optional accessor behavior grounded in real domain state. */
export function appBuilderDomainEntityClassSource(
  model: AppBuilderDomainEntityClassSourceModel,
): string {
  const choiceTypeAliases = model.includeChoiceTypeAliases === false
    ? []
    : appBuilderDomainFieldChoiceTypeAliases(model.fields);
  const choiceTypeAliasText = choiceTypeAliases.length === 0 ? '' : `${choiceTypeAliases.join('\n')}\n\n`;
  const includeDisplayAccessors = model.includeDisplayAccessors === true;
  const displayAccessorFields = model.displayAccessorFields ?? model.fields;
  const displayHelpers = includeDisplayAccessors
    ? domainEntityDisplayHelperSource({
        entityTypeName: model.entityTypeName,
        fields: displayAccessorFields,
      })
    : '';
  const constructionInputStyle = appBuilderDomainEntityConstructionInputStyle(model);
  if (constructionInputStyle === AppBuilderDomainEntityConstructionInputStyle.NamedObject) {
    return `${choiceTypeAliasText}${displayHelpers}${domainEntityNamedInputInterfaceSource(model)}

export class ${model.entityTypeName} {
${domainEntityNamedInputPropertySource(model)}

  constructor(init: ${domainEntityNamedInputInterfaceName(model.entityTypeName)}) {
${domainEntityNamedInputAssignmentSource(model)}
  }${includeDisplayAccessors ? domainEntityDisplayGetterSource({
      entityTypeName: model.entityTypeName,
      fields: displayAccessorFields,
    }) : ''}
}
`;
  }
  const constructorFields = domainEntityConstructorProperties(model).map((property) => (
    `    ${property.parameterModifier} ${property.memberName}: ${property.typeScriptType},`
  )).join('\n');
  return `${choiceTypeAliasText}${displayHelpers}export class ${model.entityTypeName} {
  constructor(
    readonly ${model.identityMemberName}: ${appBuilderDomainIdentityTypeScriptType(model.identityValueKind)},
${constructorFields}
  ) {}${includeDisplayAccessors ? domainEntityDisplayGetterSource({
      entityTypeName: model.entityTypeName,
      fields: displayAccessorFields,
    }) : ''}
}
`;
}

/** Pick the default construction-input shape for generated domain entity source. */
export function appBuilderDomainEntityConstructionInputStyle(
  model: Pick<AppBuilderDomainEntityClassSourceModel, 'fields' | 'constructionInputStyle'> & {
    readonly extraProperties?: readonly unknown[];
  },
): AppBuilderDomainEntityConstructionInputStyle {
  if (model.constructionInputStyle != null) {
    return model.constructionInputStyle;
  }
  return model.fields.length + (model.extraProperties?.length ?? 0) >= NAMED_OBJECT_CONSTRUCTION_FIELD_THRESHOLD
    ? AppBuilderDomainEntityConstructionInputStyle.NamedObject
    : AppBuilderDomainEntityConstructionInputStyle.PositionalParameters;
}

/** Emit a `new Entity(...)` expression that matches the generated entity constructor shape. */
export function appBuilderDomainEntityConstructionExpressionSource(
  model: Pick<AppBuilderDomainEntityClassSourceModel, 'entityTypeName' | 'fields' | 'constructionInputStyle'>,
  properties: readonly AppBuilderDomainEntityConstructionPropertySource[],
  options: AppBuilderDomainEntityConstructionExpressionSourceOptions = {},
): string {
  const constructionInputStyle = model.constructionInputStyle
    ?? (properties.length - 1 >= NAMED_OBJECT_CONSTRUCTION_FIELD_THRESHOLD
      ? AppBuilderDomainEntityConstructionInputStyle.NamedObject
      : AppBuilderDomainEntityConstructionInputStyle.PositionalParameters);
  if (constructionInputStyle === AppBuilderDomainEntityConstructionInputStyle.PositionalParameters) {
    return `new ${model.entityTypeName}(${properties.map((property) => property.expression).join(', ')})`;
  }
  const baseIndent = options.baseIndent ?? '';
  const propertyRows = properties
    .map((property) => domainEntityNamedObjectPropertyRow(property, baseIndent))
    .join('\n');
  return `new ${model.entityTypeName}({
${propertyRows}
${baseIndent}})`;
}

/** Emit display helper functions for record-shaped domain entities that cannot own accessors. */
export function appBuilderDomainEntityDisplayFunctionSource(
  model: AppBuilderDomainEntityDisplayFunctionSourceModel,
): AppBuilderDomainEntityDisplayFunctionSource {
  const parameterName = model.parameterName ?? appBuilderLowerCamelCase(model.entityTypeName);
  const fields = displayHelperFields(model.fields);
  const functions = fields.map((field): AppBuilderDomainEntityDisplayFunction => ({
    field,
    functionName: domainEntityDisplayFunctionName(model.entityTypeName, field),
  }));
  if (functions.length === 0) {
    return {
      text: '',
      functions,
    };
  }
  const mapSource = domainEntityDisplayHelperSource(model);
  const functionSource = functions.map(({ field, functionName }) => {
    switch (field.valueKind) {
      case AppBuilderDomainFieldValueKind.Date:
        return `export function ${functionName}(${parameterName}: ${model.entityTypeName}): string {
  return ${parameterName}.${field.memberName} == null ? 'No date' : ${parameterName}.${field.memberName}.toLocaleDateString();
}`;
      case AppBuilderDomainFieldValueKind.Choice:
        return `export function ${functionName}(${parameterName}: ${model.entityTypeName}): string {
  return ${domainEntityChoiceLabelMapName(model.entityTypeName, field)}[${parameterName}.${field.memberName}];
}`;
      case AppBuilderDomainFieldValueKind.ChoiceSet:
        return `export function ${functionName}(${parameterName}: ${model.entityTypeName}): string {
  return ${parameterName}.${field.memberName}.length === 0 ? 'None' : ${parameterName}.${field.memberName}.map((value) => ${domainEntityChoiceLabelMapName(model.entityTypeName, field)}[value]).join(', ');
}`;
      case AppBuilderDomainFieldValueKind.Text:
      case AppBuilderDomainFieldValueKind.Boolean:
      case AppBuilderDomainFieldValueKind.Number:
        return '';
    }
  }).filter((source) => source.length > 0);
  return {
    text: `${mapSource}${functionSource.join('\n\n')}\n\n`,
    functions,
  };
}

function domainEntityDisplayHelperSource(
  model: Pick<AppBuilderDomainEntityClassSourceModel, 'entityTypeName' | 'fields'>,
): string {
  const labelMaps = model.fields
    .filter((field) =>
      field.valueKind === AppBuilderDomainFieldValueKind.Choice
      || field.valueKind === AppBuilderDomainFieldValueKind.ChoiceSet
    )
    .map((field) => {
      if (field.optionTypeName == null) {
        throw new Error(`Domain field '${field.memberName}' must have an option type name before label helpers can be lowered.`);
      }
      const mapName = domainEntityChoiceLabelMapName(model.entityTypeName, field);
      const entries = field.options.map((option) =>
        `  ${appBuilderSeedRecordLiteral(option.value)}: ${appBuilderSeedRecordLiteral(option.title)},`
      ).join('\n');
      return `const ${mapName}: Record<${field.optionTypeName}, string> = {
${entries}
};`;
    });
  return labelMaps.length === 0 ? '' : `${labelMaps.join('\n\n')}\n\n`;
}

function domainEntityNamedInputInterfaceSource(
  model: AppBuilderDomainEntityClassSourceModel,
): string {
  const identityType = appBuilderDomainIdentityTypeScriptType(model.identityValueKind);
  const fields = domainEntityConstructorProperties(model)
    .map((property) => `  readonly ${property.memberName}: ${property.typeScriptType};`)
    .join('\n');
  return `export interface ${domainEntityNamedInputInterfaceName(model.entityTypeName)} {
  readonly ${model.identityMemberName}: ${identityType};
${fields}
}`;
}

function domainEntityNamedInputPropertySource(
  model: AppBuilderDomainEntityClassSourceModel,
): string {
  const identityType = appBuilderDomainIdentityTypeScriptType(model.identityValueKind);
  const fields = domainEntityConstructorProperties(model)
    .map((property) => `  ${property.parameterModifier} ${property.memberName}: ${property.typeScriptType};`)
    .join('\n');
  return `  readonly ${model.identityMemberName}: ${identityType};
${fields}`;
}

function domainEntityConstructorProperties(
  model: AppBuilderDomainEntityClassSourceModel,
): readonly AppBuilderDomainEntityExtraPropertySourceModel[] {
  return [
    ...model.fields.map((field): AppBuilderDomainEntityExtraPropertySourceModel => ({
      memberName: field.memberName,
      typeScriptType: field.typeScriptType,
      parameterModifier: domainEntityFieldParameterModifier(model, field),
    })),
    ...(model.extraProperties ?? []).map((property): AppBuilderDomainEntityExtraPropertySourceModel => ({
      ...property,
      parameterModifier: property.parameterModifier ?? 'readonly',
    })),
  ];
}

function domainEntityFieldParameterModifier(
  model: AppBuilderDomainEntityClassSourceModel,
  field: AppBuilderDomainFieldSourceModel,
): 'public' | 'readonly' {
  if (model.mutableFieldNames != null) {
    return model.mutableFieldNames.includes(field.memberName) ? 'public' : 'readonly';
  }
  return model.fieldParameterModifier ?? 'readonly';
}

function domainEntityNamedInputAssignmentSource(
  model: AppBuilderDomainEntityClassSourceModel,
): string {
  return [
    `    this.${model.identityMemberName} = init.${model.identityMemberName};`,
    ...domainEntityConstructorProperties(model).map((property) => `    this.${property.memberName} = init.${property.memberName};`),
  ].join('\n');
}

function domainEntityNamedInputInterfaceName(
  entityTypeName: string,
): string {
  return `${entityTypeName}Init`;
}

function domainEntityDisplayGetterSource(
  model: Pick<AppBuilderDomainEntityClassSourceModel, 'entityTypeName' | 'fields'>,
): string {
  return displayHelperFields(model.fields)
    .map((field) => {
      const displayMemberName = appBuilderDomainFieldDisplayMemberName(field);
      switch (field.valueKind) {
        case AppBuilderDomainFieldValueKind.Date:
          return `

  get ${displayMemberName}(): string {
    return this.${field.memberName} == null ? 'No date' : this.${field.memberName}.toLocaleDateString();
  }`;
        case AppBuilderDomainFieldValueKind.Choice:
          return `

  get ${displayMemberName}(): string {
    return ${domainEntityChoiceLabelMapName(model.entityTypeName, field)}[this.${field.memberName}];
  }`;
        case AppBuilderDomainFieldValueKind.ChoiceSet:
          return `

  get ${displayMemberName}(): string {
    return this.${field.memberName}.length === 0 ? 'None' : this.${field.memberName}.map((value) => ${domainEntityChoiceLabelMapName(model.entityTypeName, field)}[value]).join(', ');
  }`;
        case AppBuilderDomainFieldValueKind.Text:
        case AppBuilderDomainFieldValueKind.Boolean:
        case AppBuilderDomainFieldValueKind.Number:
          return '';
      }
    }).join('');
}

function domainEntityNamedObjectPropertyRow(
  property: AppBuilderDomainEntityConstructionPropertySource,
  baseIndent: string,
): string {
  const propertyIndent = `${baseIndent}  `;
  const expressionLines = property.expression.split('\n');
  if (expressionLines.length === 1) {
    return `${propertyIndent}${property.memberName}: ${property.expression},`;
  }
  const continuationIndent = `${baseIndent}    `;
  const formattedExpression = expressionLines
    .map((line, index) => {
      if (index === 0) {
        return line;
      }
      const trimmed = line.trimStart();
      const isClosingLine = index === expressionLines.length - 1 && /^[\]}]/.test(trimmed);
      return `${isClosingLine ? propertyIndent : continuationIndent}${trimmed}`;
    })
    .join('\n');
  return `${propertyIndent}${property.memberName}: ${formattedExpression},`;
}

function displayHelperFields(
  fields: readonly AppBuilderDomainFieldSourceModel[],
): readonly AppBuilderDomainFieldSourceModel[] {
  return fields.filter((field) =>
    field.valueKind === AppBuilderDomainFieldValueKind.Date
    || field.valueKind === AppBuilderDomainFieldValueKind.Choice
    || field.valueKind === AppBuilderDomainFieldValueKind.ChoiceSet
  );
}

function domainEntityDisplayFunctionName(
  entityTypeName: string,
  field: AppBuilderDomainFieldSourceModel,
): string {
  const prefix = entityTypeName.length === 0 ? '' : appBuilderLowerCamelCase(entityTypeName);
  return `${prefix}${field.memberSegment}Label`;
}

function domainEntityChoiceLabelMapName(
  entityTypeName: string,
  field: AppBuilderDomainFieldSourceModel,
): string {
  const prefix = entityTypeName.length === 0 ? '' : appBuilderLowerCamelCase(entityTypeName);
  return `${prefix}${field.memberSegment}Titles`;
}
