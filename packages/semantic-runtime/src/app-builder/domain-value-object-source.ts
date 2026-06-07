import {
  appBuilderDomainFieldChoiceTypeAliases,
  appBuilderDomainFieldSeedLiteral,
  type AppBuilderDomainFieldSourceModel,
} from './domain-field-source.js';
import {
  appBuilderDomainEntityConstructionInputStyle,
  AppBuilderDomainEntityConstructionInputStyle,
  type AppBuilderDomainEntityConstructionExpressionSourceOptions,
  type AppBuilderDomainEntityConstructionPropertySource,
} from './domain-entity-source.js';
import type { AppBuilderSeedRecord } from './seed-data.js';

/** Source model for an identityless generated domain value object class. */
export interface AppBuilderDomainValueObjectClassSourceModel {
  /** TypeScript-safe value-object class name. */
  readonly valueObjectTypeName: string;
  /** Value-object fields supplied by caller domain input. */
  readonly fields: readonly AppBuilderDomainFieldSourceModel[];
  /** Default field modifier for generated constructor properties. */
  readonly fieldParameterModifier?: 'public' | 'readonly';
  /** Construction source shape for generated seed values. */
  readonly constructionInputStyle?: AppBuilderDomainEntityConstructionInputStyle;
  /** Whether finite choice type aliases should be emitted with this value object. */
  readonly includeChoiceTypeAliases?: boolean;
}

/** Emit an identityless value-object class from caller-supplied fields. */
export function appBuilderDomainValueObjectClassSource(
  model: AppBuilderDomainValueObjectClassSourceModel,
): string {
  const choiceTypeAliases = model.includeChoiceTypeAliases === false
    ? []
    : appBuilderDomainFieldChoiceTypeAliases(model.fields);
  const choiceTypeAliasText = choiceTypeAliases.length === 0 ? '' : `${choiceTypeAliases.join('\n')}\n\n`;
  const constructionInputStyle = appBuilderDomainEntityConstructionInputStyle({
    fields: model.fields,
    constructionInputStyle: model.constructionInputStyle,
  });
  if (constructionInputStyle === AppBuilderDomainEntityConstructionInputStyle.NamedObject) {
    return `${choiceTypeAliasText}${domainValueObjectNamedInputInterfaceSource(model)}

export class ${model.valueObjectTypeName} {
${domainValueObjectNamedInputPropertySource(model)}

  constructor(init: ${domainValueObjectNamedInputInterfaceName(model.valueObjectTypeName)}) {
${domainValueObjectNamedInputAssignmentSource(model)}
  }
}
`;
  }
  const constructorFields = model.fields.map((field) => (
    `    ${model.fieldParameterModifier ?? 'readonly'} ${field.memberName}: ${field.typeScriptType},`
  )).join('\n');
  return `${choiceTypeAliasText}export class ${model.valueObjectTypeName} {
  constructor(
${constructorFields}
  ) {}
}
`;
}

/** Emit a `new ValueObject(...)` expression from a caller seed record. */
export function appBuilderDomainValueObjectSeedRecordConstructionExpressionSource(
  model: Pick<AppBuilderDomainValueObjectClassSourceModel, 'valueObjectTypeName' | 'fields' | 'constructionInputStyle'>,
  record: AppBuilderSeedRecord,
  options: AppBuilderDomainEntityConstructionExpressionSourceOptions = {},
): string {
  return appBuilderDomainValueObjectConstructionExpressionSource(
    model,
    model.fields.map((field) => ({
      memberName: field.memberName,
      expression: appBuilderDomainFieldSeedLiteral(record, field),
    })),
    options,
  );
}

/** Emit a `new ValueObject(...)` expression from explicit property expressions. */
export function appBuilderDomainValueObjectConstructionExpressionSource(
  model: Pick<AppBuilderDomainValueObjectClassSourceModel, 'valueObjectTypeName' | 'fields' | 'constructionInputStyle'>,
  properties: readonly AppBuilderDomainEntityConstructionPropertySource[],
  options: AppBuilderDomainEntityConstructionExpressionSourceOptions = {},
): string {
  const constructionInputStyle = appBuilderDomainEntityConstructionInputStyle({
    fields: model.fields,
    constructionInputStyle: model.constructionInputStyle,
  });
  if (constructionInputStyle === AppBuilderDomainEntityConstructionInputStyle.PositionalParameters) {
    return `new ${model.valueObjectTypeName}(${properties.map((property) => property.expression).join(', ')})`;
  }
  const baseIndent = options.baseIndent ?? '';
  const propertyRows = properties
    .map((property) => domainValueObjectNamedObjectPropertyRow(property, baseIndent))
    .join('\n');
  return `new ${model.valueObjectTypeName}({
${propertyRows}
${baseIndent}})`;
}

function domainValueObjectNamedObjectPropertyRow(
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

function domainValueObjectNamedInputInterfaceSource(
  model: AppBuilderDomainValueObjectClassSourceModel,
): string {
  const fields = model.fields
    .map((field) => `  readonly ${field.memberName}: ${field.typeScriptType};`)
    .join('\n');
  return `export interface ${domainValueObjectNamedInputInterfaceName(model.valueObjectTypeName)} {
${fields}
}`;
}

function domainValueObjectNamedInputPropertySource(
  model: AppBuilderDomainValueObjectClassSourceModel,
): string {
  return model.fields
    .map((field) => `  ${model.fieldParameterModifier ?? 'readonly'} ${field.memberName}: ${field.typeScriptType};`)
    .join('\n');
}

function domainValueObjectNamedInputAssignmentSource(
  model: AppBuilderDomainValueObjectClassSourceModel,
): string {
  return model.fields
    .map((field) => `    this.${field.memberName} = init.${field.memberName};`)
    .join('\n');
}

function domainValueObjectNamedInputInterfaceName(
  valueObjectTypeName: string,
): string {
  return `${valueObjectTypeName}Init`;
}
