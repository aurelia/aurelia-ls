import {
  appBuilderDomainFieldSeedLiteral,
  appBuilderDomainFieldSourceModels,
  type AppBuilderDomainFieldSourceModel,
} from './domain-field-source.js';
import {
  appBuilderDomainIdentityTypeScriptType,
  AppBuilderDomainIdentityValueKind,
  type AppBuilderDomainFieldDescriptor,
} from './domain-model.js';
import {
  appBuilderDomainCollectionInitializerSource,
} from './domain-collection-source.js';
import {
  appBuilderDomainEntityConstructionExpressionSource,
} from './domain-entity-source.js';
import {
  appBuilderSeedRecordLiteral,
  appBuilderLowerCamelCase,
} from './source-lowering-helpers.js';
import {
  indentSourceLines,
} from '../source-plan/source-template.js';
import {
  SourcePlanFileRole,
  SourcePlanLanguage,
  SourcePlanOperationKind,
  type SourcePlanFileArtifact,
} from '../source-plan/source-plan.js';
import { typeScriptSourceText } from '../source-plan/typescript-source-text.js';
import type { TypeScriptImportRequirement } from '../source-plan/typescript-import-source.js';
import type {
  AppBuilderSeedRecord,
} from './seed-data.js';

/** Source model for a generated in-memory collection service boundary. */
export interface AppBuilderServiceCollectionSourceModel {
  readonly serviceClassName: string;
  readonly recordTypeName: string;
  readonly loadMethodName: string;
  readonly entityTypeName: string;
  readonly collectionMemberName: string;
  readonly identityMemberName: string;
  readonly identityValueKind: AppBuilderDomainIdentityValueKind;
  readonly fields: readonly AppBuilderDomainFieldDescriptor[];
  readonly seedRecords: readonly AppBuilderSeedRecord[];
  readonly recordTypeSourceKind?: AppBuilderServiceCollectionRecordTypeSourceKind;
  readonly recordTypeImport?: TypeScriptImportRequirement | null;
  readonly findMethod?: AppBuilderServiceCollectionFindMethodSourceModel | null;
  readonly filterMethods?: readonly AppBuilderServiceCollectionFilterMethodSourceModel[];
  readonly createMethods?: readonly AppBuilderServiceCollectionCreateMethodSourceModel[];
  readonly updateMethods?: readonly AppBuilderServiceCollectionUpdateMethodSourceModel[];
  readonly relatedCollections?: readonly AppBuilderServiceCollectionRelatedCollectionSourceModel[];
  readonly extraProperties?: readonly AppBuilderServiceCollectionExtraPropertySourceModel[];
}

/** How a generated service collection obtains the TypeScript item type it returns. */
export enum AppBuilderServiceCollectionRecordTypeSourceKind {
  /** Emit a record interface in the service file itself. */
  GeneratedRecordInterface = 'generated-record-interface',
  /** Import and construct an existing generated domain entity class. */
  ImportedDomainEntity = 'imported-domain-entity',
}

/** Predicate emitted by one generated in-memory service collection filter method. */
export enum AppBuilderServiceCollectionFilterPredicateKind {
  /** Compare the selected field to the filter parameter with strict equality. */
  Equals = 'equals',
  /** Match a string field by case-insensitive substring text. */
  TextContains = 'text-contains',
}

/** Stable value list for service collection filter predicate transport schemas. */
export const APP_BUILDER_SERVICE_COLLECTION_FILTER_PREDICATE_KINDS = [
  AppBuilderServiceCollectionFilterPredicateKind.Equals,
  AppBuilderServiceCollectionFilterPredicateKind.TextContains,
] as const;

/** Filter method emitted for an explicit in-memory service collection field. */
export interface AppBuilderServiceCollectionFilterMethodSourceModel {
  readonly methodName: string;
  readonly fieldName: string;
  readonly parameterName: string;
  readonly predicateKind: AppBuilderServiceCollectionFilterPredicateKind;
}

/** Find/read method emitted for an explicit in-memory service collection identity lookup. */
export interface AppBuilderServiceCollectionFindMethodSourceModel {
  readonly methodName: string;
  readonly parameterName?: string;
  readonly parameterTypeScriptType?: string;
  readonly compareAsRouteParameter?: boolean;
}

/** Create/write method emitted for an explicit in-memory service collection. */
export interface AppBuilderServiceCollectionCreateMethodSourceModel {
  readonly methodName: string;
  readonly inputFieldNames: readonly string[];
}

/** Update/write method emitted for an explicit in-memory service collection. */
export interface AppBuilderServiceCollectionUpdateMethodSourceModel {
  readonly methodName: string;
  readonly inputFieldNames: readonly string[];
}

/** Related collection emitted inside a generated service when domain entity construction needs related objects. */
export interface AppBuilderServiceCollectionRelatedCollectionSourceModel {
  readonly entityTypeName: string;
  readonly collectionMemberName: string;
  readonly identityMemberName: string;
  readonly fields: readonly AppBuilderDomainFieldDescriptor[];
  readonly seedRecords: readonly AppBuilderSeedRecord[];
  readonly recordTypeImport: TypeScriptImportRequirement;
}

/** Extra domain property emitted for generated service records, such as an object-valued relationship. */
export interface AppBuilderServiceCollectionExtraPropertySourceModel {
  readonly memberName: string;
  readonly typeScriptType: string;
  readonly seedExpressionForRecord: (record: AppBuilderSeedRecord, recordIndex: number) => string;
  readonly defaultExpression: string;
}

/** Build a service file artifact for a caller-domain collection boundary. */
export function appBuilderServiceCollectionFileArtifact(
  sourceTargetPath: string,
  model: AppBuilderServiceCollectionSourceModel,
): SourcePlanFileArtifact {
  const source = appBuilderServiceCollectionSource(model);
  return {
    path: sourceTargetPath,
    role: SourcePlanFileRole.Service,
    language: SourcePlanLanguage.TypeScript,
    operationKind: SourcePlanOperationKind.CreateServiceModel,
    text: source.text,
    contributions: source.contributions,
  };
}

/** Emit a small service boundary whose data shape is derived from explicit domain and seed inputs. */
export function appBuilderServiceCollectionSource(
  model: AppBuilderServiceCollectionSourceModel,
): ReturnType<typeof typeScriptSourceText> {
  const filterMethods = (model.filterMethods ?? []).map((filterMethod) =>
    serviceCollectionFilterMethodSource(model, filterMethod));
  const createMethods = (model.createMethods ?? []).map((createMethod) =>
    serviceCollectionCreateMethodSource(model, createMethod));
  const updateMethods = (model.updateMethods ?? []).map((updateMethod) =>
    serviceCollectionUpdateMethodSource(model, updateMethod));
  const methods = [
    `  async ${model.loadMethodName}(): Promise<readonly ${model.recordTypeName}[]> {
    return this.${model.collectionMemberName};
  }`,
    ...(model.findMethod == null ? [] : [serviceCollectionFindMethodSource(model, model.findMethod)]),
    ...filterMethods,
    ...createMethods,
    ...updateMethods,
  ].join('\n\n');
  const typeDeclarations = [
    serviceCollectionRecordInterfaceSource(model),
    serviceCollectionMutableRecordInterfaceSource(model),
  ].filter((source) => source.length > 0).join('\n\n');
  const relatedCollections = serviceCollectionRelatedCollectionSources(model);
  const relatedCollectionSource = relatedCollections.length === 0
    ? ''
    : `${relatedCollections.join('\n')}\n\n`;
  const bodyText = [
    typeDeclarations,
    `export class ${model.serviceClassName} {
${relatedCollectionSource}  private readonly ${model.collectionMemberName}: ${serviceCollectionCollectionType(model)}[] = ${serviceCollectionRecordsLiteral(model)};

${methods}
}`,
  ].filter((source) => source.length > 0).join('\n\n');
  return typeScriptSourceText(`${bodyText}\n`, serviceCollectionImportRequirements(model));
}

function serviceCollectionRecordInterfaceSource(
  model: AppBuilderServiceCollectionSourceModel,
): string {
  if (serviceCollectionRecordTypeSourceKind(model) === AppBuilderServiceCollectionRecordTypeSourceKind.ImportedDomainEntity) {
    return '';
  }
  const fieldModels = appBuilderDomainFieldSourceModels(model.fields, {
    entityTypeName: model.entityTypeName,
    valueSets: [],
  });
  const fieldSource = [
    `  readonly ${model.identityMemberName}: ${appBuilderDomainIdentityTypeScriptType(model.identityValueKind)};`,
    ...fieldModels.map((field) =>
      `  readonly ${field.memberName}: ${field.typeScriptType};`),
    ...serviceCollectionExtraProperties(model).map((property) =>
      `  readonly ${property.memberName}: ${property.typeScriptType};`),
  ].join('\n');
  return `export interface ${model.recordTypeName} {
${fieldSource}
}`;
}

function serviceCollectionMutableRecordInterfaceSource(
  model: AppBuilderServiceCollectionSourceModel,
): string {
  if ((model.updateMethods ?? []).length === 0
    || serviceCollectionRecordTypeSourceKind(model) === AppBuilderServiceCollectionRecordTypeSourceKind.ImportedDomainEntity) {
    return '';
  }
  const fieldModels = appBuilderDomainFieldSourceModels(model.fields, {
    entityTypeName: model.entityTypeName,
    valueSets: [],
  });
  const mutableRecordTypeName = serviceCollectionMutableRecordTypeName(model);
  const fieldSource = [
    `  ${model.identityMemberName}: ${appBuilderDomainIdentityTypeScriptType(model.identityValueKind)};`,
    ...fieldModels.map((field) =>
      `  ${field.memberName}: ${field.typeScriptType};`),
    ...serviceCollectionExtraProperties(model).map((property) =>
      `  ${property.memberName}: ${property.typeScriptType};`),
  ].join('\n');
  return `interface ${mutableRecordTypeName} {
${fieldSource}
}`;
}

function serviceCollectionCollectionType(
  model: AppBuilderServiceCollectionSourceModel,
): string {
  if (serviceCollectionRecordTypeSourceKind(model) === AppBuilderServiceCollectionRecordTypeSourceKind.ImportedDomainEntity) {
    return model.recordTypeName;
  }
  return (model.updateMethods ?? []).length === 0
    ? model.recordTypeName
    : serviceCollectionMutableRecordTypeName(model);
}

function serviceCollectionMutableRecordTypeName(
  model: AppBuilderServiceCollectionSourceModel,
): string {
  return `Mutable${model.recordTypeName}`;
}

function serviceCollectionRecordsLiteral(
  model: AppBuilderServiceCollectionSourceModel,
): string {
  if (model.seedRecords.length === 0) {
    return '[]';
  }
  if (serviceCollectionRecordTypeSourceKind(model) === AppBuilderServiceCollectionRecordTypeSourceKind.ImportedDomainEntity) {
    return appBuilderDomainCollectionInitializerSource({
      entityTypeName: model.recordTypeName,
      identityMemberName: model.identityMemberName,
    }, serviceCollectionFieldModels(model), model.seedRecords, {
      rowIndent: '    ',
      closingIndent: '  ',
      extraProperties: serviceCollectionExtraProperties(model).map((property) => ({
        memberName: property.memberName,
        expressionForRecord: property.seedExpressionForRecord,
      })),
    });
  }
  const recordText = model.seedRecords
    .map((record, recordIndex) => indentSourceLines(serviceCollectionRecordLiteral(model, record, recordIndex), '    '))
    .join(',\n');
  return `[
${recordText},
  ]`;
}

function serviceCollectionFindMethodSource(
  model: AppBuilderServiceCollectionSourceModel,
  findMethod: AppBuilderServiceCollectionFindMethodSourceModel,
): string {
  const itemName = appBuilderLowerCamelCase(model.entityTypeName);
  const parameterName = findMethod.parameterName ?? model.identityMemberName;
  const parameterType = findMethod.parameterTypeScriptType ?? appBuilderDomainIdentityTypeScriptType(model.identityValueKind);
  const memberExpression = `${itemName}.${model.identityMemberName}`;
  const comparisonExpression = findMethod.compareAsRouteParameter === true
    ? (model.identityValueKind === AppBuilderDomainIdentityValueKind.String
      ? `${memberExpression} === ${parameterName}`
      : `String(${memberExpression}) === ${parameterName}`)
    : `${memberExpression} === ${parameterName}`;
  return `  async ${findMethod.methodName}(${parameterName}: ${parameterType}): Promise<${model.recordTypeName} | null> {
    return this.${model.collectionMemberName}.find((${itemName}) => ${comparisonExpression}) ?? null;
  }`;
}

function serviceCollectionFilterMethodSource(
  model: AppBuilderServiceCollectionSourceModel,
  filterMethod: AppBuilderServiceCollectionFilterMethodSourceModel,
): string {
  const field = serviceCollectionFieldModels(model).find((candidate) => candidate.memberName === filterMethod.fieldName);
  if (field == null) {
    throw new Error(`Service collection filter method '${filterMethod.methodName}' references unknown field '${filterMethod.fieldName}'.`);
  }
  if (filterMethod.predicateKind === AppBuilderServiceCollectionFilterPredicateKind.TextContains
    && field.typeScriptType !== 'string') {
    throw new Error(`Service collection text filter method '${filterMethod.methodName}' needs a string field.`);
  }
  const itemName = appBuilderLowerCamelCase(model.entityTypeName);
  if (filterMethod.predicateKind === AppBuilderServiceCollectionFilterPredicateKind.TextContains) {
    return `  async ${filterMethod.methodName}(${filterMethod.parameterName}: string): Promise<readonly ${model.recordTypeName}[]> {
    const normalizedQuery = ${filterMethod.parameterName}.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      return this.${model.collectionMemberName};
    }
    return this.${model.collectionMemberName}.filter((${itemName}) => ${itemName}.${field.memberName}.toLowerCase().includes(normalizedQuery));
  }`;
  }
  return `  async ${filterMethod.methodName}(${filterMethod.parameterName}: ${field.typeScriptType}): Promise<readonly ${model.recordTypeName}[]> {
    return this.${model.collectionMemberName}.filter((${itemName}) => ${itemName}.${field.memberName} === ${filterMethod.parameterName});
  }`;
}

function serviceCollectionCreateMethodSource(
  model: AppBuilderServiceCollectionSourceModel,
  createMethod: AppBuilderServiceCollectionCreateMethodSourceModel,
): string {
  if (model.identityValueKind !== AppBuilderDomainIdentityValueKind.Number) {
    throw new Error(`Service collection create method '${createMethod.methodName}' needs numeric identity support.`);
  }
  const fieldModels = serviceCollectionFieldModels(model);
  const extraProperties = serviceCollectionExtraProperties(model);
  const inputProperties = createMethod.inputFieldNames.map((fieldName) => {
    const property = serviceCollectionPropertyModel(model, fieldName);
    if (property == null) {
      throw new Error(`Service collection create method '${createMethod.methodName}' references unknown field '${fieldName}'.`);
    }
    return property;
  });
  const inputFieldNames = new Set(inputProperties.map((field) => field.memberName));
  const itemName = appBuilderLowerCamelCase(model.entityTypeName);
  const parameterSource = inputProperties
    .map((property) => `${property.memberName}: ${property.typeScriptType}`)
    .join(', ');
  const recordSource = [
    `${model.identityMemberName}: nextId,`,
    ...fieldModels.map((field) => {
      if (inputFieldNames.has(field.memberName)) {
        return `${field.memberName},`;
      }
      return `${field.memberName}: ${appBuilderDomainFieldSeedLiteral(undefined, field)},`;
    }),
    ...extraProperties.map((property) => {
      if (inputFieldNames.has(property.memberName)) {
        return `${property.memberName},`;
      }
      return `${property.memberName}: ${property.defaultExpression},`;
    }),
  ].map((line) => `      ${line}`).join('\n');
  if (serviceCollectionRecordTypeSourceKind(model) === AppBuilderServiceCollectionRecordTypeSourceKind.ImportedDomainEntity) {
    const entityExpression = appBuilderDomainEntityConstructionExpressionSource({
      entityTypeName: model.recordTypeName,
      fields: fieldModels,
    }, [
      { memberName: model.identityMemberName, expression: 'nextId' },
      ...fieldModels.map((field) => ({
        memberName: field.memberName,
        expression: inputFieldNames.has(field.memberName)
          ? field.memberName
          : appBuilderDomainFieldSeedLiteral(undefined, field),
      })),
      ...extraProperties.map((property) => ({
        memberName: property.memberName,
        expression: inputFieldNames.has(property.memberName)
          ? property.memberName
          : property.defaultExpression,
      })),
    ], {
      baseIndent: '    ',
    });
    return `  async ${createMethod.methodName}(${parameterSource}): Promise<readonly ${model.recordTypeName}[]> {
    const nextId = this.${model.collectionMemberName}.length === 0 ? 1 : Math.max(...this.${model.collectionMemberName}.map((${itemName}) => ${itemName}.${model.identityMemberName})) + 1;
    this.${model.collectionMemberName}.push(${entityExpression});
    return this.${model.collectionMemberName};
  }`;
  }
  return `  async ${createMethod.methodName}(${parameterSource}): Promise<readonly ${model.recordTypeName}[]> {
    const nextId = this.${model.collectionMemberName}.length === 0 ? 1 : Math.max(...this.${model.collectionMemberName}.map((${itemName}) => ${itemName}.${model.identityMemberName})) + 1;
    this.${model.collectionMemberName}.push({
${recordSource}
    });
    return this.${model.collectionMemberName};
  }`;
}

function serviceCollectionUpdateMethodSource(
  model: AppBuilderServiceCollectionSourceModel,
  updateMethod: AppBuilderServiceCollectionUpdateMethodSourceModel,
): string {
  const inputProperties = updateMethod.inputFieldNames.map((fieldName) => {
    const property = serviceCollectionPropertyModel(model, fieldName);
    if (property == null) {
      throw new Error(`Service collection update method '${updateMethod.methodName}' references unknown field '${fieldName}'.`);
    }
    return property;
  });
  if (inputProperties.length === 0) {
    throw new Error(`Service collection update method '${updateMethod.methodName}' needs at least one input field.`);
  }
  const itemName = appBuilderLowerCamelCase(model.entityTypeName);
  const identityType = appBuilderDomainIdentityTypeScriptType(model.identityValueKind);
  const parameterSource = [
    `${model.identityMemberName}: ${identityType}`,
    ...inputProperties.map((property) => `${property.memberName}: ${property.typeScriptType}`),
  ].join(', ');
  const assignmentSource = inputProperties
    .map((property) => `      ${itemName}.${property.memberName} = ${property.memberName};`)
    .join('\n');
  return `  async ${updateMethod.methodName}(${parameterSource}): Promise<readonly ${model.recordTypeName}[]> {
    const ${itemName} = this.${model.collectionMemberName}.find((candidate) => candidate.${model.identityMemberName} === ${model.identityMemberName});
    if (${itemName} != null) {
${assignmentSource}
    }
    return this.${model.collectionMemberName};
  }`;
}

function serviceCollectionRecordLiteral(
  model: AppBuilderServiceCollectionSourceModel,
  record: AppBuilderSeedRecord,
  recordIndex: number,
): string {
  const fieldModels = serviceCollectionFieldModels(model);
  const propertySource = [
    `${model.identityMemberName}: ${appBuilderSeedRecordLiteral(record[model.identityMemberName])},`,
    ...fieldModels.map((field) =>
      `${field.memberName}: ${appBuilderDomainFieldSeedLiteral(record, field)},`),
    ...serviceCollectionExtraProperties(model).map((property) =>
      `${property.memberName}: ${property.seedExpressionForRecord(record, recordIndex)},`),
  ].map((line) => `  ${line}`).join('\n');
  return `{
${propertySource}
}`;
}

function serviceCollectionFieldModels(
  model: AppBuilderServiceCollectionSourceModel,
): readonly AppBuilderDomainFieldSourceModel[] {
  return appBuilderDomainFieldSourceModels(model.fields, {
    entityTypeName: model.entityTypeName,
    valueSets: [],
  });
}

function serviceCollectionExtraProperties(
  model: AppBuilderServiceCollectionSourceModel,
): readonly AppBuilderServiceCollectionExtraPropertySourceModel[] {
  return model.extraProperties ?? [];
}

function serviceCollectionPropertyModel(
  model: AppBuilderServiceCollectionSourceModel,
  memberName: string,
): { readonly memberName: string; readonly typeScriptType: string } | null {
  return serviceCollectionFieldModels(model).find((field) => field.memberName === memberName)
    ?? serviceCollectionExtraProperties(model).find((property) => property.memberName === memberName)
    ?? null;
}

function serviceCollectionRelatedCollectionSources(
  model: AppBuilderServiceCollectionSourceModel,
): readonly string[] {
  return (model.relatedCollections ?? []).map((collection) => {
    const fields = appBuilderDomainFieldSourceModels(collection.fields, {
      entityTypeName: collection.entityTypeName,
      valueSets: [],
    });
    const collectionSource = appBuilderDomainCollectionInitializerSource({
      entityTypeName: collection.entityTypeName,
      identityMemberName: collection.identityMemberName,
    }, fields, collection.seedRecords, {
      rowIndent: '    ',
      closingIndent: '  ',
    });
    return `  private readonly ${collection.collectionMemberName}: ${collection.entityTypeName}[] = ${collectionSource};`;
  });
}

function serviceCollectionImportRequirements(
  model: AppBuilderServiceCollectionSourceModel,
): readonly TypeScriptImportRequirement[] {
  const recordTypeImports = serviceCollectionRecordTypeSourceKind(model) === AppBuilderServiceCollectionRecordTypeSourceKind.ImportedDomainEntity
    && model.recordTypeImport != null
    ? [model.recordTypeImport]
    : [];
  return [
    ...recordTypeImports,
    ...(model.relatedCollections ?? []).map((collection) => collection.recordTypeImport),
  ];
}

function serviceCollectionRecordTypeSourceKind(
  model: AppBuilderServiceCollectionSourceModel,
): AppBuilderServiceCollectionRecordTypeSourceKind {
  return model.recordTypeSourceKind ?? AppBuilderServiceCollectionRecordTypeSourceKind.GeneratedRecordInterface;
}
