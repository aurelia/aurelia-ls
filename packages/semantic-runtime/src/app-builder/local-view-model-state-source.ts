import {
  uniqueByKey,
} from '../collections.js';
import {
  SourcePlan,
  SourcePlanAssembly,
  SourcePlanConflictPolicy,
  SourcePlanFileRole,
  SourcePlanFormattingPolicy,
  SourcePlanLanguage,
  SourcePlanOperationKind,
  SourcePlanPackageToolingPolicy,
  SourcePlanPolicy,
  SourcePlanTextAuthority,
} from '../source-plan/source-plan.js';
import type {
  AppBuilderDomainFieldDescriptor,
  AppBuilderDomainIdentityValueKind,
  AppBuilderDomainValueSetDescriptor,
} from './domain-model.js';
import {
  appBuilderDomainIdentityTypeScriptType,
} from './domain-model.js';
import type { AppBuilderDomainDescriptor } from './domain-descriptor.js';
import {
  appBuilderDomainCollectionInitializerSource,
  appBuilderDomainSeedRecordConstructionExpressionSource,
} from './domain-collection-source.js';
import { appBuilderDomainEntityClassSource } from './domain-entity-source.js';
import {
  appBuilderDomainValueObjectClassSource,
  appBuilderDomainValueObjectSeedRecordConstructionExpressionSource,
} from './domain-value-object-source.js';
import {
  appBuilderDomainFieldChoiceTypeAliases,
  appBuilderDomainFieldDisplayExpression,
  appBuilderDomainFieldsWithValueSetSelections,
  appBuilderDomainFieldOptionClassMemberSource,
  appBuilderDomainFieldDefaultValue,
  appBuilderDomainFieldSeedLiteral,
  appBuilderDomainFieldSourceModels,
  appBuilderDomainFiniteOptionFields,
  type AppBuilderDomainFieldValueSetSelection,
  type AppBuilderDomainFieldSourceModel,
} from './domain-field-source.js';
import {
  AppBuilderDomainFieldValueKind,
  AppBuilderDomainRelationshipKind,
  AppBuilderDomainRelationshipLocalValueKind,
  type AppBuilderDomainRelationshipDescriptor,
} from './domain-model.js';
import type { AppBuilderSeedRecord } from './seed-data.js';
import type { AppBuilderSeedRecordObject } from './seed-data.js';
import {
  appBuilderLowerCamelCase,
  appBuilderPascalCase,
  appBuilderSeedRecordLiteral,
  appBuilderTypeScriptClassMemberFragmentsText,
} from './source-lowering-helpers.js';
import {
  type AppBuilderPartSourceFragment,
  AppBuilderPartSourceFragmentKind,
  type AppBuilderSourceFragmentOrigin,
} from './part-source-invocation.js';
import {
  appBuilderPartSourceFragmentsContributions,
} from './source-plan-contributions.js';

export interface AppBuilderLocalViewModelStateSourcePlanRequest {
  readonly rootDir: string;
  readonly componentPath: string;
  readonly className: string;
  readonly fields: readonly AppBuilderDomainFieldDescriptor[];
  readonly valueSets?: readonly AppBuilderDomainValueSetDescriptor[];
  readonly fieldValueSetSelections?: readonly AppBuilderDomainFieldValueSetSelection[];
  readonly fieldObjectStates?: readonly AppBuilderLocalViewModelFieldObjectStateSourceModel[];
  readonly collectionState?: AppBuilderLocalViewModelCollectionStateSourceModel | null;
  readonly actionFeedbackState?: readonly AppBuilderLocalViewModelActionFeedbackStateSourceModel[];
  readonly fragmentOrigin?: AppBuilderSourceFragmentOrigin;
}

/** Local status state emitted for explicit action feedback. */
export interface AppBuilderLocalViewModelActionFeedbackStateSourceModel {
  readonly actionName: string;
  readonly statusMemberName: string;
}

/** Source shape used for object-shaped local form state. */
export enum AppBuilderLocalViewModelFieldObjectStateSourceKind {
  /** Emit a compact interface plus object literal for rooted local state with no domain behavior. */
  RecordLiteral = 'record-literal',
  /** Emit an ordinary mutable TypeScript class so the object can own simple derived state. */
  DomainValueObjectClass = 'domain-value-object-class',
}

/** Derived local object getter emitted from explicit field metadata. */
export interface AppBuilderLocalViewModelFieldObjectReadinessSourceModel {
  /** TypeScript-safe getter name emitted on the local object class, such as `canSubmit`. */
  readonly memberName: string;
  /** Domain field members whose required-state checks feed the generated getter. */
  readonly requiredFieldNames: readonly string[];
}

/** Object-shaped local state emitted for forms that bind through one explicit receiver expression. */
export interface AppBuilderLocalViewModelFieldObjectStateSourceModel {
  /** TypeScript-safe view-model member used as the binding receiver, such as `draftTask`. */
  readonly memberName: string;
  /** TypeScript-safe interface name emitted for the local object shape. */
  readonly typeName: string;
  /** Domain fields owned by this local object state. */
  readonly fields: readonly AppBuilderDomainFieldDescriptor[];
  /** Source shape selected for this object state. */
  readonly sourceKind?: AppBuilderLocalViewModelFieldObjectStateSourceKind;
  /** Optional derived readiness getter emitted only by class-backed local object state. */
  readonly readiness?: AppBuilderLocalViewModelFieldObjectReadinessSourceModel | null;
}

/** Explicit local collection state emitted directly on a generated component view-model. */
export interface AppBuilderLocalViewModelCollectionStateSourceModel {
  readonly domain: AppBuilderDomainDescriptor;
  readonly seedRecords: readonly AppBuilderSeedRecord[];
  /** Domain entity fields that emitted component methods are known to mutate. */
  readonly mutableFieldNames?: readonly string[];
  /** Reference-one relationships that require local related collections and lookup helpers. */
  readonly referenceRelationships?: readonly AppBuilderLocalViewModelReferenceRelationshipSourceModel[];
  /** Owned-child relationships that require nested local domain source. */
  readonly ownedRelationships?: readonly AppBuilderLocalViewModelOwnedRelationshipSourceModel[];
  /** Nested value-object relationships that require identityless local object source. */
  readonly nestedValueObjectRelationships?: readonly AppBuilderLocalViewModelNestedValueObjectRelationshipSourceModel[];
  /** Local collection query state emitted as explicit view-model fields and derived collection getters. */
  readonly queryState?: AppBuilderLocalViewModelCollectionQueryStateSourceModel | null;
  /** Local row-selection state emitted as explicit selected-identity fields and helpers. */
  readonly selectionState?: AppBuilderLocalViewModelCollectionSelectionStateSourceModel | null;
}

/** Local query-state source needed by first-ring collection query rungs. */
export interface AppBuilderLocalViewModelCollectionQueryStateSourceModel {
  /** Optional filter/search query state emitted before pagination. */
  readonly filter?: AppBuilderLocalViewModelCollectionFilterQueryStateSourceModel | null;
  /** Optional local pagination state over the raw or filtered collection. */
  readonly pagination?: AppBuilderLocalViewModelCollectionPaginationQueryStateSourceModel | null;
}

/** Local query-state source needed by first-ring collection filter/search rungs. */
export interface AppBuilderLocalViewModelCollectionFilterQueryStateSourceModel {
  /** View-model member bound by generated filter controls. */
  readonly filterMemberName: string;
  /** Derived collection getter consumed by generated collection projections. */
  readonly filteredCollectionMemberName: string;
  /** Domain field members searched by the derived local filter getter. */
  readonly filterFieldNames: readonly string[];
}

/** Local query-state source needed by first-ring local pagination rungs. */
export interface AppBuilderLocalViewModelCollectionPaginationQueryStateSourceModel {
  /** One-based current page member bound or displayed by generated pagination controls. */
  readonly currentPageMemberName: string;
  /** Readonly page-size member used by the generated page getter. */
  readonly pageSizeMemberName: string;
  /** Derived page-count getter consumed by generated pagination status. */
  readonly pageCountMemberName: string;
  /** Derived collection getter consumed by generated collection projections. */
  readonly paginatedCollectionMemberName: string;
  /** Source collection member or getter paginated by the generated page getter. */
  readonly sourceCollectionMemberName: string;
  /** Method invoked by the generated previous-page control. */
  readonly previousPageMethodName: string;
  /** Method invoked by the generated next-page control. */
  readonly nextPageMethodName: string;
  /** Caller-selected positive page size. */
  readonly pageSize: number;
  /** Optional one-based initial page, defaulting to the first page. */
  readonly initialPage?: number;
}

/** Local row-selection state needed by first-ring scalar-identity selection rungs. */
export interface AppBuilderLocalViewModelCollectionSelectionStateSourceModel {
  /** View-model array member storing selected scalar identities. */
  readonly selectedIdentityMemberName: string;
  /** Domain identity member read from each selected item. */
  readonly identityMemberName: string;
  /** Scalar identity kind used by the selected identity array. */
  readonly identityValueKind: AppBuilderDomainIdentityValueKind;
  /** Method invoked by generated row-selection checkbox controls. */
  readonly toggleSelectionMethodName: string;
}

/** Related collection source needed by a local reference-one relationship. */
export interface AppBuilderLocalViewModelReferenceRelationshipSourceModel {
  /** Caller-owned relationship descriptor selected from DomainRelationships. */
  readonly relationship: AppBuilderDomainRelationshipDescriptor;
  /** Related entity domain descriptor materialized from scoped DomainEntities and DomainFields. */
  readonly relatedDomain: AppBuilderDomainDescriptor;
  /** Caller-supplied related seed records. */
  readonly seedRecords: readonly AppBuilderSeedRecord[];
}

/** Owned child collection source needed by a local owns-many relationship. */
export interface AppBuilderLocalViewModelOwnedRelationshipSourceModel {
  /** Caller-owned relationship descriptor selected from DomainRelationships. */
  readonly relationship: AppBuilderDomainRelationshipDescriptor;
  /** Owned child entity domain descriptor materialized from scoped DomainEntities and DomainFields. */
  readonly ownedDomain: AppBuilderDomainDescriptor;
}

/** Nested value-object source needed by a local nested-value-object relationship. */
export interface AppBuilderLocalViewModelNestedValueObjectRelationshipSourceModel {
  /** Caller-owned relationship descriptor selected from DomainRelationships. */
  readonly relationship: AppBuilderDomainRelationshipDescriptor;
  /** Caller-supplied value-object fields scoped by relationship toEntityName. */
  readonly fields: readonly AppBuilderDomainFieldDescriptor[];
}

/** Reusable local view-model state fragments before a concrete component file is assembled. */
export interface AppBuilderLocalViewModelStateSourceFragments {
  readonly typeScriptTopLevelFragments: readonly AppBuilderPartSourceFragment[];
  readonly classMemberFragments: readonly AppBuilderPartSourceFragment[];
}

/** Build a component view-model file whose local fields are explicit caller/domain input, not inferred sample data. */
export function appBuilderLocalViewModelStateSourcePlan(
  request: AppBuilderLocalViewModelStateSourcePlanRequest,
): SourcePlan {
  const fragments = appBuilderLocalViewModelStateSourceFragments(request);
  return new SourcePlanAssembly(
    request.rootDir,
    new SourcePlanPolicy(
      SourcePlanConflictPolicy.MustNotExist,
      SourcePlanFormattingPolicy.AppBuilderBaseline,
      SourcePlanPackageToolingPolicy.NotModeled,
    ),
    SourcePlanTextAuthority.AppBuilderGenerated,
  ).addFile({
    path: request.componentPath,
    role: SourcePlanFileRole.Component,
    language: SourcePlanLanguage.TypeScript,
    operationKind: SourcePlanOperationKind.CreateComponentViewModel,
    text: appBuilderLocalViewModelStateSourceFromFragments(request.className, fragments),
    contributions: appBuilderPartSourceFragmentsContributions([
      ...fragments.typeScriptTopLevelFragments,
      ...fragments.classMemberFragments,
    ], SourcePlanLanguage.TypeScript),
  }).build();
}

/** Build reusable local view-model state fragments from explicit domain fields. */
export function appBuilderLocalViewModelStateSourceFragments(
  request: Omit<AppBuilderLocalViewModelStateSourcePlanRequest, 'rootDir' | 'componentPath'>,
): AppBuilderLocalViewModelStateSourceFragments {
  const selectedFields = appBuilderDomainFieldsWithValueSetSelections(
    request.fields,
    request.fieldValueSetSelections ?? [],
  );
  const fieldTypeOwnerName = request.collectionState?.domain.entityTypeName ?? request.className;
  const fields = appBuilderDomainFieldSourceModels(selectedFields, {
    entityTypeName: fieldTypeOwnerName,
    valueSets: request.valueSets ?? [],
  });
  const fieldObjectStates = localViewModelFieldObjectStateSourceModels(
    request.fieldObjectStates ?? [],
    request.fieldValueSetSelections ?? [],
    request.valueSets ?? [],
  );
  const collectionState = request.collectionState == null
    ? null
    : appBuilderLocalViewModelCollectionStateSourceFragments(request.collectionState, request.valueSets ?? [], request.fragmentOrigin);
  const localFieldChoiceTypeAliases = collectionState == null
    ? appBuilderDomainFieldChoiceTypeAliases(fields)
    : [];
  const fieldObjectChoiceTypeAliases = uniqueByKey(
    fieldObjectStates.flatMap((state) => appBuilderDomainFieldChoiceTypeAliases(state.fields)),
    (text) => text,
  );
  const optionFields = uniqueByKey(
    [
      ...appBuilderDomainFiniteOptionFields(fields),
      ...fieldObjectStates.flatMap((state) => appBuilderDomainFiniteOptionFields(state.fields)),
    ],
    (field) => field.optionMemberName ?? field.memberName,
  );
  return {
    typeScriptTopLevelFragments: [
      ...uniqueByKey([...localFieldChoiceTypeAliases, ...fieldObjectChoiceTypeAliases], (text) => text).map((text) =>
        typeScriptTopLevelDeclarationFragment(text, request.fragmentOrigin)),
      ...fieldObjectStates.map((state) =>
        typeScriptTopLevelDeclarationFragment(localViewModelFieldObjectStateDeclarationSource(state), request.fragmentOrigin)),
      ...(collectionState?.typeScriptTopLevelFragments ?? []),
    ],
    classMemberFragments: [
      ...optionFields.map((field) =>
        typeScriptClassMemberFragment(appBuilderDomainFieldOptionClassMemberSource(field), request.fragmentOrigin)),
      ...fields.map((field) =>
        typeScriptClassMemberFragment(
          `${field.memberName}: ${field.typeScriptType} = ${appBuilderSeedRecordLiteral(appBuilderDomainFieldDefaultValue(field))};`,
          request.fragmentOrigin,
        )),
      ...fieldObjectStates.map((state) =>
        typeScriptClassMemberFragment(localViewModelFieldObjectStateMemberSource(state), request.fragmentOrigin)),
      ...uniqueActionFeedbackState(request.actionFeedbackState ?? []).map((feedback) =>
        typeScriptClassMemberFragment(`${feedback.statusMemberName}: string = '';`, request.fragmentOrigin)),
      ...(collectionState?.classMemberFragments ?? []),
    ],
  };
}

function uniqueActionFeedbackState(
  values: readonly AppBuilderLocalViewModelActionFeedbackStateSourceModel[],
): readonly AppBuilderLocalViewModelActionFeedbackStateSourceModel[] {
  const byMemberName = new Map<string, AppBuilderLocalViewModelActionFeedbackStateSourceModel>();
  for (const value of values) {
    if (!byMemberName.has(value.statusMemberName)) {
      byMemberName.set(value.statusMemberName, value);
    }
  }
  return [...byMemberName.values()];
}

interface LocalViewModelFieldObjectStateSourceModel {
  readonly memberName: string;
  readonly typeName: string;
  readonly fields: readonly AppBuilderDomainFieldSourceModel[];
  readonly sourceKind: AppBuilderLocalViewModelFieldObjectStateSourceKind;
  readonly readiness: AppBuilderLocalViewModelFieldObjectReadinessSourceModel | null;
}

function localViewModelFieldObjectStateSourceModels(
  states: readonly AppBuilderLocalViewModelFieldObjectStateSourceModel[],
  fieldValueSetSelections: readonly AppBuilderDomainFieldValueSetSelection[],
  valueSets: readonly AppBuilderDomainValueSetDescriptor[],
): readonly LocalViewModelFieldObjectStateSourceModel[] {
  return states.map((state) => {
    const selectedFields = appBuilderDomainFieldsWithValueSetSelections(
      state.fields,
      fieldValueSetSelections,
    );
    return {
      memberName: state.memberName,
      typeName: state.typeName,
      sourceKind: state.sourceKind ?? AppBuilderLocalViewModelFieldObjectStateSourceKind.RecordLiteral,
      readiness: state.readiness ?? null,
      fields: appBuilderDomainFieldSourceModels(selectedFields, {
        entityTypeName: state.typeName,
        valueSets,
      }),
    };
  });
}

function localViewModelFieldObjectStateDeclarationSource(
  state: LocalViewModelFieldObjectStateSourceModel,
): string {
  switch (state.sourceKind) {
    case AppBuilderLocalViewModelFieldObjectStateSourceKind.RecordLiteral:
      return localViewModelFieldObjectStateInterfaceSource(state);
    case AppBuilderLocalViewModelFieldObjectStateSourceKind.DomainValueObjectClass:
      return localViewModelFieldObjectStateClassSource(state);
  }
}

function localViewModelFieldObjectStateInterfaceSource(
  state: LocalViewModelFieldObjectStateSourceModel,
): string {
  const fields = state.fields.map((field) => `  ${field.memberName}: ${field.typeScriptType};`).join('\n');
  return `interface ${state.typeName} {
${fields}
}`;
}

function localViewModelFieldObjectStateClassSource(
  state: LocalViewModelFieldObjectStateSourceModel,
): string {
  const fields = state.fields.map((field) =>
    `    public ${field.memberName}: ${field.typeScriptType},`
  ).join('\n');
  return `export class ${state.typeName} {
  constructor(
${fields}
  ) {}${localViewModelFieldObjectStateReadinessGetterSource(state)}
}`;
}

function localViewModelFieldObjectStateReadinessGetterSource(
  state: LocalViewModelFieldObjectStateSourceModel,
): string {
  const readiness = state.readiness;
  if (readiness == null || readiness.requiredFieldNames.length === 0) {
    return '';
  }
  const fieldsByName = new Map(state.fields.map((field) => [field.memberName, field]));
  const expressions = readiness.requiredFieldNames
    .map((fieldName) => fieldsByName.get(fieldName) ?? null)
    .filter((field): field is AppBuilderDomainFieldSourceModel => field != null)
    .map(localViewModelRequiredFieldReadyExpression);
  if (expressions.length === 0) {
    return '';
  }
  return `

  get ${readiness.memberName}(): boolean {
    return ${expressions.join(' && ')};
  }`;
}

function localViewModelRequiredFieldReadyExpression(
  field: AppBuilderDomainFieldSourceModel,
): string {
  switch (field.valueKind) {
    case AppBuilderDomainFieldValueKind.Text:
    case AppBuilderDomainFieldValueKind.Choice:
      return `this.${field.memberName}.trim().length > 0`;
    case AppBuilderDomainFieldValueKind.ChoiceSet:
      return `this.${field.memberName}.length > 0`;
    case AppBuilderDomainFieldValueKind.Date:
      return `this.${field.memberName}.trim().length > 0`;
    case AppBuilderDomainFieldValueKind.Number:
      return `Number.isFinite(this.${field.memberName})`;
    case AppBuilderDomainFieldValueKind.Boolean:
      return `this.${field.memberName}`;
  }
}

function localViewModelFieldObjectStateMemberSource(
  state: LocalViewModelFieldObjectStateSourceModel,
): string {
  switch (state.sourceKind) {
    case AppBuilderLocalViewModelFieldObjectStateSourceKind.RecordLiteral:
      return localViewModelFieldObjectStateRecordMemberSource(state);
    case AppBuilderLocalViewModelFieldObjectStateSourceKind.DomainValueObjectClass:
      return localViewModelFieldObjectStateClassMemberSource(state);
  }
}

function localViewModelFieldObjectStateRecordMemberSource(
  state: LocalViewModelFieldObjectStateSourceModel,
): string {
  const fieldValues = localViewModelFieldObjectStateFieldInitializers(state)
    .map((field) => `  ${field.memberName}: ${field.expression},`)
    .join('\n');
  return `${state.memberName}: ${state.typeName} = {
${fieldValues}
};`;
}

function localViewModelFieldObjectStateClassMemberSource(
  state: LocalViewModelFieldObjectStateSourceModel,
): string {
  const fieldValues = localViewModelFieldObjectStateFieldInitializers(state)
    .map((field) => field.expression)
    .join(', ');
  return `${state.memberName} = new ${state.typeName}(${fieldValues});`;
}

function localViewModelFieldObjectStateFieldInitializers(
  state: LocalViewModelFieldObjectStateSourceModel,
): readonly {
  readonly memberName: string;
  readonly expression: string;
}[] {
  return state.fields.map((field) => ({
    memberName: field.memberName,
    expression: appBuilderDomainFieldSeedLiteral(undefined, field),
  }));
}

/** Build TypeScript source for local view-model field state from explicit domain fields. */
export function appBuilderLocalViewModelStateSource(
  request: Omit<AppBuilderLocalViewModelStateSourcePlanRequest, 'rootDir' | 'componentPath'>,
): string {
  return appBuilderLocalViewModelStateSourceFromFragments(
    request.className,
    appBuilderLocalViewModelStateSourceFragments(request),
  );
}

function appBuilderLocalViewModelStateSourceFromFragments(
  className: string,
  fragments: AppBuilderLocalViewModelStateSourceFragments,
): string {
  const typeAliases = fragments.typeScriptTopLevelFragments.map((fragment) => fragment.text);
  const classMembers = appBuilderTypeScriptClassMemberFragmentsText(fragments.classMemberFragments);
  return [
    ...typeAliases,
    typeAliases.length === 0 ? '' : '',
    `export class ${className} {`,
    classMembers,
    '}',
    '',
  ]
    .filter((line, index, lines) => line.length > 0 || (index > 0 && lines[index - 1]!.length > 0))
    .join('\n');
}

function typeScriptTopLevelDeclarationFragment(
  text: string,
  origin: AppBuilderSourceFragmentOrigin | undefined,
): AppBuilderPartSourceFragment {
  return {
    kind: AppBuilderPartSourceFragmentKind.TypeScriptTopLevelDeclaration,
    text,
    requiredImports: [],
    ...(origin == null ? {} : { origin }),
  };
}

function appBuilderLocalViewModelCollectionStateSourceFragments(
  collectionState: AppBuilderLocalViewModelCollectionStateSourceModel,
  valueSets: readonly AppBuilderDomainValueSetDescriptor[],
  origin: AppBuilderSourceFragmentOrigin | undefined,
): AppBuilderLocalViewModelStateSourceFragments {
  const fields = appBuilderDomainFieldSourceModels(collectionState.domain.fields, {
    entityTypeName: collectionState.domain.entityTypeName,
    valueSets,
  });
  const relationshipModels = localViewModelReferenceRelationshipModels(collectionState, fields, valueSets);
  const ownedRelationshipModels = localViewModelOwnedRelationshipModels(collectionState, valueSets);
  const nestedValueObjectModels = localViewModelNestedValueObjectRelationshipModels(collectionState, valueSets);
  const referenceEntityModels = uniqueByKey(
    relationshipModels,
    (relationship) => relationship.relatedDomain.entityTypeName,
  );
  const referenceCollectionModels = uniqueByKey(
    relationshipModels,
    (relationship) => relationship.relatedDomain.collectionMemberName,
  );
  const entitySource = appBuilderDomainEntityClassSource({
    entityTypeName: collectionState.domain.entityTypeName,
    identityMemberName: collectionState.domain.identityMemberName,
    identityValueKind: collectionState.domain.identityValueKind,
    fields,
    extraProperties: [
      ...ownedRelationshipModels.map((relationship) => ({
        memberName: relationship.localMemberName,
        typeScriptType: ownedRelationshipTypeScriptType(relationship),
        parameterModifier: 'readonly' as const,
      })),
      ...relationshipModels
        .filter((relationship) => relationship.localValueKind === AppBuilderDomainRelationshipLocalValueKind.Object)
        .map((relationship) => ({
          memberName: relationship.localMemberName,
          typeScriptType: `${relationship.relatedDomain.entityTypeName} | null`,
          parameterModifier: 'public' as const,
        })),
      ...nestedValueObjectModels.map((relationship) => ({
        memberName: relationship.localMemberName,
        typeScriptType: nestedValueObjectRelationshipTypeScriptType(relationship),
        parameterModifier: 'readonly' as const,
      })),
    ],
    mutableFieldNames: collectionState.mutableFieldNames,
  });
  const collectionSource = appBuilderDomainCollectionInitializerSource(
    collectionState.domain,
    fields,
    collectionState.seedRecords,
    {
      rowIndent: '  ',
      closingIndent: '',
      extraProperties: [
        ...ownedRelationshipModels.map((relationship) => ({
          memberName: relationship.localMemberName,
          expressionForRecord: (record: AppBuilderSeedRecord) => ownedRelationshipSeedValueExpression(record, relationship),
        })),
        ...nestedValueObjectModels.map((relationship) => ({
          memberName: relationship.localMemberName,
          expressionForRecord: (record: AppBuilderSeedRecord) => nestedValueObjectSeedValueExpression(record, relationship),
        })),
        ...relationshipModels
          .filter((relationship) => relationship.localValueKind === AppBuilderDomainRelationshipLocalValueKind.Object)
          .map((relationship) => ({
            memberName: relationship.localMemberName,
            expressionForRecord: (record: AppBuilderSeedRecord) => referenceObjectRelationshipSeedValueExpression(record, relationship),
          })),
      ],
    },
  );
  const queryStateFragments = localViewModelCollectionQueryStateFragments(collectionState, fields, origin);
  const selectionStateFragments = localViewModelCollectionSelectionFragments(
    collectionState,
    collectionState.selectionState ?? null,
    origin,
  );
  return {
    typeScriptTopLevelFragments: [
      typeScriptTopLevelDeclarationFragment(entitySource.trimEnd(), origin),
      ...referenceEntityModels.map((relationship) =>
        typeScriptTopLevelDeclarationFragment(localViewModelRelatedEntitySource(relationship).trimEnd(), origin)),
      ...ownedRelationshipModels.map((relationship) =>
        typeScriptTopLevelDeclarationFragment(localViewModelOwnedEntitySource(relationship).trimEnd(), origin)),
      ...nestedValueObjectModels.map((relationship) =>
        typeScriptTopLevelDeclarationFragment(localViewModelNestedValueObjectSource(relationship).trimEnd(), origin)),
    ],
    classMemberFragments: [
      ...referenceCollectionModels.map((relationship) =>
        typeScriptClassMemberFragment(localViewModelRelatedCollectionSource(relationship), origin)),
      typeScriptClassMemberFragment(
        `readonly ${collectionState.domain.collectionMemberName}: ${collectionState.domain.entityTypeName}[] = ${collectionSource};`,
        origin,
      ),
      ...relationshipModels
        .filter((relationship) => relationship.localValueKind === AppBuilderDomainRelationshipLocalValueKind.Object)
        .map((relationship) =>
          typeScriptClassMemberFragment(localViewModelReferenceRelationshipDraftSource(relationship), origin)),
      ...queryStateFragments,
      ...selectionStateFragments,
      ...relationshipModels.map((relationship) =>
        typeScriptClassMemberFragment(localViewModelReferenceRelationshipMethodsSource(collectionState.domain, relationship), origin)),
      ...ownedRelationshipModels.map((relationship) =>
        typeScriptClassMemberFragment(localViewModelOwnedRelationshipMethodsSource(collectionState.domain, relationship), origin)),
      ...nestedValueObjectModels.map((relationship) =>
        typeScriptClassMemberFragment(localViewModelNestedValueObjectRelationshipMethodsSource(collectionState.domain, relationship), origin)),
    ],
  };
}

function localViewModelCollectionQueryStateFragments(
  collectionState: AppBuilderLocalViewModelCollectionStateSourceModel,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  origin: AppBuilderSourceFragmentOrigin | undefined,
): readonly AppBuilderPartSourceFragment[] {
  const queryState = collectionState.queryState;
  if (queryState == null) {
    return [];
  }
  return [
    ...localViewModelCollectionFilterFragments(collectionState, fields, queryState.filter ?? null, origin),
    ...localViewModelCollectionPaginationFragments(collectionState, queryState.pagination ?? null, origin),
  ];
}

function localViewModelCollectionFilterFragments(
  collectionState: AppBuilderLocalViewModelCollectionStateSourceModel,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  filterState: AppBuilderLocalViewModelCollectionFilterQueryStateSourceModel | null,
  origin: AppBuilderSourceFragmentOrigin | undefined,
): readonly AppBuilderPartSourceFragment[] {
  if (filterState == null) {
    return [];
  }
  const filterFields = filterState.filterFieldNames.flatMap((fieldName) => {
    const field = fields.find((candidate) => candidate.memberName === fieldName);
    return field == null ? [] : [field];
  });
  if (filterFields.length === 0) {
    return [];
  }
  return [
    typeScriptClassMemberFragment(`${filterState.filterMemberName}: string = '';`, origin),
    typeScriptClassMemberFragment(
      localViewModelCollectionFilterGetterSource(collectionState.domain, filterState, filterFields),
      origin,
    ),
  ];
}

function localViewModelCollectionFilterGetterSource(
  domain: AppBuilderDomainDescriptor,
  queryState: AppBuilderLocalViewModelCollectionFilterQueryStateSourceModel,
  filterFields: readonly AppBuilderDomainFieldSourceModel[],
): string {
  const itemName = appBuilderLowerCamelCase(domain.entityTypeName);
  const filterValues = filterFields
    .map((field) => `String(${appBuilderDomainFieldDisplayExpression(field, itemName)}).toLowerCase().includes(filterText)`)
    .join('\n      || ');
  return `get ${queryState.filteredCollectionMemberName}(): ${domain.entityTypeName}[] {
  const filterText = this.${queryState.filterMemberName}.trim().toLowerCase();
  if (filterText.length === 0) {
    return this.${domain.collectionMemberName};
  }
  return this.${domain.collectionMemberName}.filter((${itemName}) =>
    ${filterValues}
  );
}`;
}

function localViewModelCollectionPaginationFragments(
  collectionState: AppBuilderLocalViewModelCollectionStateSourceModel,
  paginationState: AppBuilderLocalViewModelCollectionPaginationQueryStateSourceModel | null,
  origin: AppBuilderSourceFragmentOrigin | undefined,
): readonly AppBuilderPartSourceFragment[] {
  if (paginationState == null) {
    return [];
  }
  return [
    typeScriptClassMemberFragment(
      `${paginationState.currentPageMemberName}: number = ${paginationState.initialPage ?? 1};`,
      origin,
    ),
    typeScriptClassMemberFragment(
      `readonly ${paginationState.pageSizeMemberName}: number = ${paginationState.pageSize};`,
      origin,
    ),
    typeScriptClassMemberFragment(
      localViewModelCollectionPageCountGetterSource(paginationState),
      origin,
    ),
    typeScriptClassMemberFragment(
      localViewModelCollectionPageGetterSource(collectionState.domain, paginationState),
      origin,
    ),
    typeScriptClassMemberFragment(
      localViewModelCollectionPageNavigationSource(paginationState),
      origin,
    ),
  ];
}

function localViewModelCollectionPageCountGetterSource(
  queryState: AppBuilderLocalViewModelCollectionPaginationQueryStateSourceModel,
): string {
  return `get ${queryState.pageCountMemberName}(): number {
  return Math.max(1, Math.ceil(this.${queryState.sourceCollectionMemberName}.length / this.${queryState.pageSizeMemberName}));
}`;
}

function localViewModelCollectionPageGetterSource(
  domain: AppBuilderDomainDescriptor,
  queryState: AppBuilderLocalViewModelCollectionPaginationQueryStateSourceModel,
): string {
  return `get ${queryState.paginatedCollectionMemberName}(): ${domain.entityTypeName}[] {
  const safePage = Math.min(Math.max(1, this.${queryState.currentPageMemberName}), this.${queryState.pageCountMemberName});
  const start = (safePage - 1) * this.${queryState.pageSizeMemberName};
  return this.${queryState.sourceCollectionMemberName}.slice(start, start + this.${queryState.pageSizeMemberName});
}`;
}

function localViewModelCollectionPageNavigationSource(
  queryState: AppBuilderLocalViewModelCollectionPaginationQueryStateSourceModel,
): string {
  return `${queryState.previousPageMethodName}(): void {
  this.${queryState.currentPageMemberName} = Math.max(1, this.${queryState.currentPageMemberName} - 1);
}

${queryState.nextPageMethodName}(): void {
  this.${queryState.currentPageMemberName} = Math.min(this.${queryState.pageCountMemberName}, this.${queryState.currentPageMemberName} + 1);
}`;
}

function localViewModelCollectionSelectionFragments(
  collectionState: AppBuilderLocalViewModelCollectionStateSourceModel,
  selectionState: AppBuilderLocalViewModelCollectionSelectionStateSourceModel | null,
  origin: AppBuilderSourceFragmentOrigin | undefined,
): readonly AppBuilderPartSourceFragment[] {
  if (selectionState == null) {
    return [];
  }
  const identityType = appBuilderDomainIdentityTypeScriptType(selectionState.identityValueKind);
  return [
    typeScriptClassMemberFragment(
      `${selectionState.selectedIdentityMemberName}: ${identityType}[] = [];`,
      origin,
    ),
    typeScriptClassMemberFragment(
      localViewModelCollectionSelectionToggleSource(collectionState.domain, selectionState),
      origin,
    ),
  ];
}

function localViewModelCollectionSelectionToggleSource(
  domain: AppBuilderDomainDescriptor,
  selectionState: AppBuilderLocalViewModelCollectionSelectionStateSourceModel,
): string {
  const itemName = appBuilderLowerCamelCase(domain.entityTypeName);
  return `${selectionState.toggleSelectionMethodName}(${itemName}: ${domain.entityTypeName}): void {
  const identity = ${itemName}.${selectionState.identityMemberName};
  if (this.${selectionState.selectedIdentityMemberName}.includes(identity)) {
    this.${selectionState.selectedIdentityMemberName} = this.${selectionState.selectedIdentityMemberName}.filter((selectedIdentity) => selectedIdentity !== identity);
    return;
  }
  this.${selectionState.selectedIdentityMemberName} = [...this.${selectionState.selectedIdentityMemberName}, identity];
}`;
}

interface AppBuilderLocalViewModelReferenceRelationshipModel {
  readonly relationship: AppBuilderDomainRelationshipDescriptor;
  readonly relatedDomain: AppBuilderDomainDescriptor;
  readonly relatedFields: readonly AppBuilderDomainFieldSourceModel[];
  readonly relatedRecords: readonly AppBuilderSeedRecord[];
  readonly relatedItemName: string;
  readonly localField: AppBuilderDomainFieldSourceModel | null;
  readonly localMemberName: string;
  readonly localValueKind: AppBuilderDomainRelationshipLocalValueKind;
  readonly foreignFieldName: string;
  readonly displayField: AppBuilderDomainFieldSourceModel;
  readonly relatedLookupMethodName: string;
  readonly labelMethodName: string;
}

interface AppBuilderLocalViewModelOwnedRelationshipModel {
  readonly relationship: AppBuilderDomainRelationshipDescriptor;
  readonly ownedDomain: AppBuilderDomainDescriptor;
  readonly ownedFields: readonly AppBuilderDomainFieldSourceModel[];
  readonly ownedItemName: string;
  readonly localMemberName: string;
  readonly displayField: AppBuilderDomainFieldSourceModel;
  readonly labelMethodName: string;
}

interface AppBuilderLocalViewModelNestedValueObjectRelationshipModel {
  readonly relationship: AppBuilderDomainRelationshipDescriptor;
  readonly valueObjectTypeName: string;
  readonly fields: readonly AppBuilderDomainFieldSourceModel[];
  readonly valueObjectItemName: string;
  readonly localMemberName: string;
  readonly displayField: AppBuilderDomainFieldSourceModel;
  readonly labelMethodName: string;
}

function localViewModelReferenceRelationshipModels(
  collectionState: AppBuilderLocalViewModelCollectionStateSourceModel,
  primaryFields: readonly AppBuilderDomainFieldSourceModel[],
  valueSets: readonly AppBuilderDomainValueSetDescriptor[],
): readonly AppBuilderLocalViewModelReferenceRelationshipModel[] {
  return (collectionState.referenceRelationships ?? []).map((source) => {
    const relationship = source.relationship;
    const relatedFields = appBuilderDomainFieldSourceModels(source.relatedDomain.fields, {
      entityTypeName: source.relatedDomain.entityTypeName,
      valueSets,
    });
    const localFieldName = requiredRelationshipValue(relationship.localFieldName, relationship.name, 'localFieldName');
    const foreignFieldName = requiredRelationshipValue(relationship.foreignFieldName, relationship.name, 'foreignFieldName');
    const displayFieldName = requiredRelationshipValue(relationship.displayFieldName, relationship.name, 'displayFieldName');
    const localValueKind = relationship.localValueKind ?? AppBuilderDomainRelationshipLocalValueKind.Identity;
    const localField = primaryFields.find((field) => field.memberName === localFieldName) ?? null;
    const displayField = relatedFields.find((field) => field.memberName === displayFieldName);
    if (localField == null && localValueKind === AppBuilderDomainRelationshipLocalValueKind.Identity) {
      throw new Error(`Relationship '${relationship.name}' localFieldName '${localFieldName}' is not part of '${collectionState.domain.entityTypeName}'.`);
    }
    if (displayField == null) {
      throw new Error(`Relationship '${relationship.name}' displayFieldName '${displayFieldName}' is not part of '${source.relatedDomain.entityTypeName}'.`);
    }
    return {
      relationship,
      relatedDomain: source.relatedDomain,
      relatedFields,
      relatedRecords: source.seedRecords,
      relatedItemName: appBuilderLowerCamelCase(source.relatedDomain.entityTypeName),
      localMemberName: localFieldName,
      localValueKind,
      localField,
      foreignFieldName,
      displayField,
      relatedLookupMethodName: appBuilderLocalViewModelRelationshipLookupMethodName(
        relationship.name,
        collectionState.domain.entityTypeName,
      ),
      labelMethodName: appBuilderLocalViewModelRelationshipLabelMethodName(
        relationship.name,
        collectionState.domain.entityTypeName,
      ),
    };
  });
}

function localViewModelOwnedRelationshipModels(
  collectionState: AppBuilderLocalViewModelCollectionStateSourceModel,
  valueSets: readonly AppBuilderDomainValueSetDescriptor[],
): readonly AppBuilderLocalViewModelOwnedRelationshipModel[] {
  return (collectionState.ownedRelationships ?? []).map((source) => {
    const relationship = source.relationship;
    const ownedFields = appBuilderDomainFieldSourceModels(source.ownedDomain.fields, {
      entityTypeName: source.ownedDomain.entityTypeName,
      valueSets,
    });
    const localMemberName = requiredRelationshipValue(relationship.localFieldName, relationship.name, 'localFieldName');
    const displayFieldName = requiredRelationshipValue(relationship.displayFieldName, relationship.name, 'displayFieldName');
    const displayField = ownedFields.find((field) => field.memberName === displayFieldName);
    if (displayField == null) {
      throw new Error(`Relationship '${relationship.name}' displayFieldName '${displayFieldName}' is not part of '${source.ownedDomain.entityTypeName}'.`);
    }
    return {
      relationship,
      ownedDomain: source.ownedDomain,
      ownedFields,
      ownedItemName: appBuilderLowerCamelCase(source.ownedDomain.entityTypeName),
      localMemberName,
      displayField,
      labelMethodName: appBuilderLocalViewModelRelationshipLabelMethodName(
        relationship.name,
        collectionState.domain.entityTypeName,
      ),
    };
  });
}

function localViewModelNestedValueObjectRelationshipModels(
  collectionState: AppBuilderLocalViewModelCollectionStateSourceModel,
  valueSets: readonly AppBuilderDomainValueSetDescriptor[],
): readonly AppBuilderLocalViewModelNestedValueObjectRelationshipModel[] {
  return (collectionState.nestedValueObjectRelationships ?? []).map((source) => {
    const relationship = source.relationship;
    const fields = appBuilderDomainFieldSourceModels(source.fields, {
      entityTypeName: appBuilderPascalCase(relationship.toEntityName),
      valueSets,
    });
    const localMemberName = requiredRelationshipValue(relationship.localFieldName, relationship.name, 'localFieldName');
    const displayFieldName = requiredRelationshipValue(relationship.displayFieldName, relationship.name, 'displayFieldName');
    const displayField = fields.find((field) => field.memberName === displayFieldName);
    if (displayField == null) {
      throw new Error(`Relationship '${relationship.name}' displayFieldName '${displayFieldName}' is not part of value object '${relationship.toEntityName}'.`);
    }
    const valueObjectTypeName = appBuilderPascalCase(relationship.toEntityName);
    return {
      relationship,
      valueObjectTypeName,
      fields,
      valueObjectItemName: appBuilderLowerCamelCase(valueObjectTypeName),
      localMemberName,
      displayField,
      labelMethodName: appBuilderLocalViewModelRelationshipLabelMethodName(
        relationship.name,
        collectionState.domain.entityTypeName,
      ),
    };
  });
}

/** Method name for a local relationship lookup helper generated from a relationship and primary entity type. */
export function appBuilderLocalViewModelRelationshipLookupMethodName(
  relationshipName: string,
  primaryEntityTypeName: string,
): string {
  return `${appBuilderLowerCamelCase(relationshipName)}For${primaryEntityTypeName}`;
}

/** Method name for a local relationship label helper generated from a relationship and primary entity type. */
export function appBuilderLocalViewModelRelationshipLabelMethodName(
  relationshipName: string,
  primaryEntityTypeName: string,
): string {
  return `${appBuilderLowerCamelCase(relationshipName)}LabelFor${primaryEntityTypeName}`;
}

function localViewModelRelatedEntitySource(
  relationship: AppBuilderLocalViewModelReferenceRelationshipModel,
): string {
  return appBuilderDomainEntityClassSource({
    entityTypeName: relationship.relatedDomain.entityTypeName,
    identityMemberName: relationship.relatedDomain.identityMemberName,
    identityValueKind: relationship.relatedDomain.identityValueKind,
    fields: relationship.relatedFields,
    fieldParameterModifier: 'readonly',
    includeDisplayAccessors: true,
  });
}

function localViewModelOwnedEntitySource(
  relationship: AppBuilderLocalViewModelOwnedRelationshipModel,
): string {
  return appBuilderDomainEntityClassSource({
    entityTypeName: relationship.ownedDomain.entityTypeName,
    identityMemberName: relationship.ownedDomain.identityMemberName,
    identityValueKind: relationship.ownedDomain.identityValueKind,
    fields: relationship.ownedFields,
    fieldParameterModifier: 'readonly',
    includeDisplayAccessors: true,
  });
}

function localViewModelNestedValueObjectSource(
  relationship: AppBuilderLocalViewModelNestedValueObjectRelationshipModel,
): string {
  return appBuilderDomainValueObjectClassSource({
    valueObjectTypeName: relationship.valueObjectTypeName,
    fields: relationship.fields,
    fieldParameterModifier: 'readonly',
  });
}

function ownedRelationshipTypeScriptType(
  relationship: AppBuilderLocalViewModelOwnedRelationshipModel,
): string {
  switch (relationship.relationship.kind) {
    case AppBuilderDomainRelationshipKind.OwnsMany:
      return `${relationship.ownedDomain.entityTypeName}[]`;
    case AppBuilderDomainRelationshipKind.OwnsOne:
      return relationship.relationship.required === true
        ? relationship.ownedDomain.entityTypeName
        : `${relationship.ownedDomain.entityTypeName} | null`;
    case AppBuilderDomainRelationshipKind.ReferenceOne:
    case AppBuilderDomainRelationshipKind.ReferenceMany:
    case AppBuilderDomainRelationshipKind.NestedValueObject:
      throw new Error(`Relationship '${relationship.relationship.name}' is not supported by local owned-relationship source.`);
  }
}

function nestedValueObjectRelationshipTypeScriptType(
  relationship: AppBuilderLocalViewModelNestedValueObjectRelationshipModel,
): string {
  return relationship.relationship.required === true
    ? relationship.valueObjectTypeName
    : `${relationship.valueObjectTypeName} | null`;
}

function localViewModelRelatedCollectionSource(
  relationship: AppBuilderLocalViewModelReferenceRelationshipModel,
): string {
  const collectionSource = appBuilderDomainCollectionInitializerSource(
    relationship.relatedDomain,
    relationship.relatedFields,
    relationship.relatedRecords,
    { rowIndent: '  ', closingIndent: '' },
  );
  return `readonly ${relationship.relatedDomain.collectionMemberName}: ${relationship.relatedDomain.entityTypeName}[] = ${collectionSource};`;
}

function localViewModelReferenceRelationshipDraftSource(
  relationship: AppBuilderLocalViewModelReferenceRelationshipModel,
): string {
  return `${relationship.localMemberName}: ${relationship.relatedDomain.entityTypeName} | null = this.${relationship.relatedDomain.collectionMemberName}[0] ?? null;`;
}

function referenceObjectRelationshipSeedValueExpression(
  record: AppBuilderSeedRecord,
  relationship: AppBuilderLocalViewModelReferenceRelationshipModel,
): string {
  const localValue = record[relationship.localMemberName];
  if (localValue == null) {
    return 'null';
  }
  return `this.${relationship.relatedDomain.collectionMemberName}.find((${relationship.relatedItemName}) => ${relationship.relatedItemName}.${relationship.foreignFieldName} === ${appBuilderSeedRecordLiteral(localValue)}) ?? null`;
}

function ownedRelationshipSeedValueExpression(
  record: AppBuilderSeedRecord,
  relationship: AppBuilderLocalViewModelOwnedRelationshipModel,
): string {
  const value = record[relationship.localMemberName];
  if (relationship.relationship.kind === AppBuilderDomainRelationshipKind.OwnsOne) {
    if (isAppBuilderSeedRecordObject(value)) {
      return appBuilderDomainSeedRecordConstructionExpressionSource(
        relationship.ownedDomain,
        relationship.ownedFields,
        value,
        { baseIndent: '    ' },
      );
    }
    return 'null';
  }
  const seedRecords = Array.isArray(value)
    ? value.filter(isAppBuilderSeedRecordObject)
    : [];
  return appBuilderDomainCollectionInitializerSource(
    relationship.ownedDomain,
    relationship.ownedFields,
    seedRecords,
    { rowIndent: '    ', closingIndent: '  ' },
  );
}

function nestedValueObjectSeedValueExpression(
  record: AppBuilderSeedRecord,
  relationship: AppBuilderLocalViewModelNestedValueObjectRelationshipModel,
): string {
  const value = record[relationship.localMemberName];
  if (isAppBuilderSeedRecordObject(value)) {
    return appBuilderDomainValueObjectSeedRecordConstructionExpressionSource(
      {
        valueObjectTypeName: relationship.valueObjectTypeName,
        fields: relationship.fields,
      },
      value,
      { baseIndent: '    ' },
    );
  }
  return 'null';
}

function localViewModelReferenceRelationshipMethodsSource(
  primaryDomain: AppBuilderDomainDescriptor,
  relationship: AppBuilderLocalViewModelReferenceRelationshipModel,
): string {
  const primaryItemName = appBuilderLowerCamelCase(primaryDomain.entityTypeName);
  if (relationship.localValueKind === AppBuilderDomainRelationshipLocalValueKind.Object) {
    return `${relationship.relatedLookupMethodName}(${primaryItemName}: ${primaryDomain.entityTypeName}): ${relationship.relatedDomain.entityTypeName} | null {
  return ${primaryItemName}.${relationship.localMemberName};
}

${relationship.labelMethodName}(${primaryItemName}: ${primaryDomain.entityTypeName}): string {
  const ${relationship.relatedItemName} = this.${relationship.relatedLookupMethodName}(${primaryItemName});
  return ${relationship.relatedItemName} == null ? '' : String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, relationship.relatedItemName)});
}

match${relationship.relatedDomain.entityTypeName}(left: ${relationship.relatedDomain.entityTypeName} | null, right: ${relationship.relatedDomain.entityTypeName} | null): boolean {
  return left?.${relationship.foreignFieldName} === right?.${relationship.foreignFieldName};
}`;
  }
  if (relationship.relationship.kind === AppBuilderDomainRelationshipKind.ReferenceMany) {
    return `${relationship.relatedLookupMethodName}(${primaryItemName}: ${primaryDomain.entityTypeName}): ${relationship.relatedDomain.entityTypeName}[] {
  return this.${relationship.relatedDomain.collectionMemberName}.filter((${relationship.relatedItemName}) => ${primaryItemName}.${relationship.localField!.memberName}.includes(${relationship.relatedItemName}.${relationship.foreignFieldName}));
}

${relationship.labelMethodName}(${primaryItemName}: ${primaryDomain.entityTypeName}): string {
  const ${relationship.relatedDomain.collectionMemberName} = this.${relationship.relatedLookupMethodName}(${primaryItemName});
  return ${relationship.relatedDomain.collectionMemberName}.length === 0 ? '' : ${relationship.relatedDomain.collectionMemberName}.map((${relationship.relatedItemName}) => String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, relationship.relatedItemName)})).join(', ');
}`;
  }
  return `${relationship.relatedLookupMethodName}(${primaryItemName}: ${primaryDomain.entityTypeName}): ${relationship.relatedDomain.entityTypeName} | null {
  return this.${relationship.relatedDomain.collectionMemberName}.find((${relationship.relatedItemName}) => ${relationship.relatedItemName}.${relationship.foreignFieldName} === ${primaryItemName}.${relationship.localField!.memberName}) ?? null;
}

${relationship.labelMethodName}(${primaryItemName}: ${primaryDomain.entityTypeName}): string {
  const ${relationship.relatedItemName} = this.${relationship.relatedLookupMethodName}(${primaryItemName});
  return ${relationship.relatedItemName} == null ? '' : String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, relationship.relatedItemName)});
}`;
}

function localViewModelOwnedRelationshipMethodsSource(
  primaryDomain: AppBuilderDomainDescriptor,
  relationship: AppBuilderLocalViewModelOwnedRelationshipModel,
): string {
  const primaryItemName = appBuilderLowerCamelCase(primaryDomain.entityTypeName);
  if (relationship.relationship.kind === AppBuilderDomainRelationshipKind.OwnsOne) {
    if (relationship.relationship.required === true) {
      return `${relationship.labelMethodName}(${primaryItemName}: ${primaryDomain.entityTypeName}): string {
  return String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, `${primaryItemName}.${relationship.localMemberName}`)});
}`;
    }
    return `${relationship.labelMethodName}(${primaryItemName}: ${primaryDomain.entityTypeName}): string {
  const ${relationship.ownedItemName} = ${primaryItemName}.${relationship.localMemberName};
  return ${relationship.ownedItemName} == null ? '' : String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, relationship.ownedItemName)});
}`;
  }
  return `${relationship.labelMethodName}(${primaryItemName}: ${primaryDomain.entityTypeName}): string {
  return ${primaryItemName}.${relationship.localMemberName}.length === 0 ? '' : ${primaryItemName}.${relationship.localMemberName}.map((${relationship.ownedItemName}) => String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, relationship.ownedItemName)})).join(', ');
}`;
}

function localViewModelNestedValueObjectRelationshipMethodsSource(
  primaryDomain: AppBuilderDomainDescriptor,
  relationship: AppBuilderLocalViewModelNestedValueObjectRelationshipModel,
): string {
  const primaryItemName = appBuilderLowerCamelCase(primaryDomain.entityTypeName);
  if (relationship.relationship.required === true) {
    return `${relationship.labelMethodName}(${primaryItemName}: ${primaryDomain.entityTypeName}): string {
  return String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, `${primaryItemName}.${relationship.localMemberName}`)});
}`;
  }
  return `${relationship.labelMethodName}(${primaryItemName}: ${primaryDomain.entityTypeName}): string {
  const ${relationship.valueObjectItemName} = ${primaryItemName}.${relationship.localMemberName};
  return ${relationship.valueObjectItemName} == null ? '' : String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, relationship.valueObjectItemName)});
}`;
}

function isAppBuilderSeedRecordObject(
  value: AppBuilderSeedRecord[string] | undefined,
): value is AppBuilderSeedRecordObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredRelationshipValue(
  value: string | undefined,
  relationshipName: string,
  fieldName: string,
): string {
  if (value == null || value.trim().length === 0) {
    throw new Error(`Relationship '${relationshipName}' must supply ${fieldName} before local source can be emitted.`);
  }
  return value;
}

function typeScriptClassMemberFragment(
  text: string,
  origin: AppBuilderSourceFragmentOrigin | undefined,
): AppBuilderPartSourceFragment {
  return {
    kind: AppBuilderPartSourceFragmentKind.TypeScriptClassMember,
    text,
    requiredImports: [],
    ...(origin == null ? {} : { origin }),
  };
}
