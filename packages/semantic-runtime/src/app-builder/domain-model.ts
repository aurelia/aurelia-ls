import type { AppBuilderSeedRecordValue } from './seed-data.js';

/** Kind of caller/domain slot a pattern composition may need before source can be lowered. */
export enum AppBuilderDomainSlotKind {
  /** Human-readable entity name, such as Support Ticket or Product Tier. */
  EntityTitle = 'entity-title',
  /** TypeScript-safe entity type name derived from or supplied by the caller. */
  EntityTypeName = 'entity-type-name',
  /** Collection member/property name, such as tickets or productTiers. */
  CollectionMemberName = 'collection-member-name',
  /** Scalar identity member or route parameter name. */
  IdentityMemberName = 'identity-member-name',
  /** Scalar identity value kind used when generated source emits typed entity identities. */
  IdentityValueKind = 'identity-value-kind',
  /** Field schema describing names, labels, value kinds, options, and generated controls. */
  FieldSchema = 'field-schema',
  /** Operation name such as load, submit, save, archive, or refresh. */
  OperationName = 'operation-name',
  /** Presentation/copy material that should stay reference-scenario or host-adapted unless explicitly requested. */
  PresentationCopy = 'presentation-copy',
}

/** Stable slot identity used when a pattern asks the caller or domain descriptor for one app-domain value. */
export enum AppBuilderDomainSlotKey {
  /** Human-facing item/entity label for the generated domain. */
  EntityTitle = 'entity-title',
  /** TypeScript-safe class name for the generated domain entity. */
  EntityTypeName = 'entity-type-name',
  /** State collection member used by list or browse patterns. */
  CollectionMemberName = 'collection-member-name',
  /** Scalar identity member used by records, route params, or lookups. */
  IdentityMemberName = 'identity-member-name',
  /** Scalar identity value kind used by records, entity constructors, and lookup source. */
  IdentityValueKind = 'identity-value-kind',
  /** Field schema used to lower data, controls, labels, and value channels. */
  FieldSchema = 'field-schema',
}

/** Primitive scalar identity kind app-builder can emit for generated domain entities. */
export enum AppBuilderDomainIdentityValueKind {
  /** String identity such as a slug, SKU, UUID, or caller-owned stable key. */
  String = 'string',
  /** Numeric identity such as an in-memory integer id or database-like surrogate key. */
  Number = 'number',
}

/** Stable value list for domain identity-kind transport schemas. */
export const APP_BUILDER_DOMAIN_IDENTITY_VALUE_KINDS = [
  AppBuilderDomainIdentityValueKind.String,
  AppBuilderDomainIdentityValueKind.Number,
] as const;

/** Primitive value kind for caller/domain fields that app-builder can lower. */
export enum AppBuilderDomainFieldValueKind {
  /** Human-readable string field. */
  Text = 'text',
  /** Boolean state field. */
  Boolean = 'boolean',
  /** Numeric scalar field. */
  Number = 'number',
  /** Date-like field lowered through `value-as-date` and represented as `Date | null`. */
  Date = 'date',
  /** One value selected from a finite caller/domain option set. */
  Choice = 'choice',
  /** Zero or more values selected from a finite caller/domain option set. */
  ChoiceSet = 'choice-set',
}

/** Stable value list for public app-builder field-schema menus and transport schemas. */
export const APP_BUILDER_DOMAIN_FIELD_VALUE_KINDS = [
  AppBuilderDomainFieldValueKind.Text,
  AppBuilderDomainFieldValueKind.Boolean,
  AppBuilderDomainFieldValueKind.Number,
  AppBuilderDomainFieldValueKind.Date,
  AppBuilderDomainFieldValueKind.Choice,
  AppBuilderDomainFieldValueKind.ChoiceSet,
] as const;

/** Whether a field value kind can carry finite option descriptors or needs a dynamic value domain. */
export enum AppBuilderDomainFieldOptionPolicy {
  /** The field kind does not accept an `options` array. */
  None = 'none',
  /** The field kind needs either finite options/value-set input or a source-lowering value-domain expression. */
  FiniteOrDynamic = 'finite-or-dynamic',
}

/** Public description of one field-schema value kind accepted by app-builder. */
export interface AppBuilderDomainFieldValueKindDescriptor {
  readonly valueKind: AppBuilderDomainFieldValueKind;
  readonly title: string;
  readonly summary: string;
  readonly seedDataShape: string;
  readonly optionPolicy: AppBuilderDomainFieldOptionPolicy;
}

/** Menu-visible minimum count for a field value kind in a composition's field schema. */
export interface AppBuilderDomainFieldValueKindRequirement {
  readonly valueKind: AppBuilderDomainFieldValueKind;
  readonly minCount: number;
  readonly summary: string;
}

/** Return the TypeScript source type for a generated domain identity value. */
export function appBuilderDomainIdentityTypeScriptType(
  valueKind: AppBuilderDomainIdentityValueKind,
): string {
  switch (valueKind) {
    case AppBuilderDomainIdentityValueKind.String:
      return 'string';
    case AppBuilderDomainIdentityValueKind.Number:
      return 'number';
  }
}

/** Structured field-schema expectation for a domain-slot menu row. */
export interface AppBuilderFieldSchemaDomainSlotExpectation {
  readonly supportedValueKinds: readonly AppBuilderDomainFieldValueKind[];
  readonly requiredValueKinds: readonly AppBuilderDomainFieldValueKindRequirement[];
  readonly summary: string;
}

/** Public app-builder field value-kind descriptors for domain slot menus. */
export const APP_BUILDER_DOMAIN_FIELD_VALUE_KIND_DESCRIPTORS: readonly AppBuilderDomainFieldValueKindDescriptor[] = [
  {
    valueKind: AppBuilderDomainFieldValueKind.Text,
    title: 'Text',
    summary: 'String property lowered to text inputs, text interpolation, and string seed values.',
    seedDataShape: 'string',
    optionPolicy: AppBuilderDomainFieldOptionPolicy.None,
  },
  {
    valueKind: AppBuilderDomainFieldValueKind.Boolean,
    title: 'Boolean',
    summary: 'Boolean property lowered to checked bindings, branches, or status toggles.',
    seedDataShape: 'boolean',
    optionPolicy: AppBuilderDomainFieldOptionPolicy.None,
  },
  {
    valueKind: AppBuilderDomainFieldValueKind.Number,
    title: 'Number',
    summary: 'Numeric property lowered to number-oriented native value channels.',
    seedDataShape: 'number',
    optionPolicy: AppBuilderDomainFieldOptionPolicy.None,
  },
  {
    valueKind: AppBuilderDomainFieldValueKind.Date,
    title: 'Date',
    summary: 'Date-like property lowered through value-as-date and typed as Date | null.',
    seedDataShape: 'ISO date string or null',
    optionPolicy: AppBuilderDomainFieldOptionPolicy.None,
  },
  {
    valueKind: AppBuilderDomainFieldValueKind.Choice,
    title: 'Choice',
    summary: 'One selected value from finite options, a named value set, or an explicit dynamic value domain.',
    seedDataShape: 'one option value string',
    optionPolicy: AppBuilderDomainFieldOptionPolicy.FiniteOrDynamic,
  },
  {
    valueKind: AppBuilderDomainFieldValueKind.ChoiceSet,
    title: 'Choice Set',
    summary: 'Zero or more selected values from finite options, a named value set, or an explicit dynamic value domain.',
    seedDataShape: 'array of option value strings',
    optionPolicy: AppBuilderDomainFieldOptionPolicy.FiniteOrDynamic,
  },
];

/** Relationship shape between domain entities or value objects supplied as app-builder input. */
export enum AppBuilderDomainRelationshipKind {
  /** One entity references one related entity by identity or object reference. */
  ReferenceOne = 'reference-one',
  /** One entity references many related entities by identity or object reference. */
  ReferenceMany = 'reference-many',
  /** One entity owns one child entity/value whose lifecycle belongs to the parent. */
  OwnsOne = 'owns-one',
  /** One entity owns many child entities/values whose lifecycle belongs to the parent. */
  OwnsMany = 'owns-many',
  /** A nested value object is structurally part of the parent entity. */
  NestedValueObject = 'nested-value-object',
}

/** Stable value list for domain relationship-kind transport schemas. */
export const APP_BUILDER_DOMAIN_RELATIONSHIP_KINDS = [
  AppBuilderDomainRelationshipKind.ReferenceOne,
  AppBuilderDomainRelationshipKind.ReferenceMany,
  AppBuilderDomainRelationshipKind.OwnsOne,
  AppBuilderDomainRelationshipKind.OwnsMany,
  AppBuilderDomainRelationshipKind.NestedValueObject,
] as const;

/** How a local reference relationship stores its selected related value. */
export enum AppBuilderDomainRelationshipLocalValueKind {
  /** Store the related entity identity in a scalar local field. */
  Identity = 'identity',
  /** Store the related domain object reference directly on the local entity/draft. */
  Object = 'object',
}

/** Stable value list for reference relationship local-value transport schemas. */
export const APP_BUILDER_DOMAIN_RELATIONSHIP_LOCAL_VALUE_KINDS = [
  AppBuilderDomainRelationshipLocalValueKind.Identity,
  AppBuilderDomainRelationshipLocalValueKind.Object,
] as const;

/** User/domain action kind supplied as app-builder input before source lowerers decide how to realize it. */
export enum AppBuilderDomainActionKind {
  /** Create a new domain entity or value. */
  Create = 'create',
  /** Update an existing domain entity or value. */
  Update = 'update',
  /** Save or commit a draft/domain state. */
  Save = 'save',
  /** Delete or remove a domain entity/value. */
  Delete = 'delete',
  /** Archive or soft-remove an entity without deleting it. */
  Archive = 'archive',
  /** Mark a task/work item as complete. */
  Complete = 'complete',
  /** Assign a relation such as owner, assignee, category, or parent. */
  Assign = 'assign',
  /** Submit a form or command to a service/persistence boundary. */
  Submit = 'submit',
  /** Refresh or reload domain data. */
  Refresh = 'refresh',
  /** Caller-defined action not covered by the first-ring vocabulary. */
  Custom = 'custom',
}

/** Stable value list for domain action-kind transport schemas. */
export const APP_BUILDER_DOMAIN_ACTION_KINDS = [
  AppBuilderDomainActionKind.Create,
  AppBuilderDomainActionKind.Update,
  AppBuilderDomainActionKind.Save,
  AppBuilderDomainActionKind.Delete,
  AppBuilderDomainActionKind.Archive,
  AppBuilderDomainActionKind.Complete,
  AppBuilderDomainActionKind.Assign,
  AppBuilderDomainActionKind.Submit,
  AppBuilderDomainActionKind.Refresh,
  AppBuilderDomainActionKind.Custom,
] as const;

/** Scope where a domain action primarily applies. */
export enum AppBuilderDomainActionScope {
  /** Action applies to a whole collection. */
  Collection = 'collection',
  /** Action applies to one entity. */
  Entity = 'entity',
  /** Action applies to form/draft state. */
  Form = 'form',
  /** Action primarily changes navigation or selected area. */
  Navigation = 'navigation',
  /** Action crosses a service/integration boundary. */
  Integration = 'integration',
}

/** Stable value list for domain action-scope transport schemas. */
export const APP_BUILDER_DOMAIN_ACTION_SCOPES = [
  AppBuilderDomainActionScope.Collection,
  AppBuilderDomainActionScope.Entity,
  AppBuilderDomainActionScope.Form,
  AppBuilderDomainActionScope.Navigation,
  AppBuilderDomainActionScope.Integration,
] as const;

/** Caller-supplied relationship input before a source lowerer decides how to realize it. */
export interface AppBuilderDomainRelationshipDescriptor {
  /** Stable relationship name in caller/app vocabulary. */
  readonly name: string;
  /** Human-facing relationship label when generated source renders the relationship. */
  readonly title?: string;
  /** Relationship shape. */
  readonly kind: AppBuilderDomainRelationshipKind;
  /** Source entity name when multiple entities exist. */
  readonly fromEntityName?: string;
  /** Target entity or value-object name. */
  readonly toEntityName: string;
  /** Local field that stores the relationship identity/value. */
  readonly localFieldName?: string;
  /** Whether a reference relationship stores an identity value or object reference locally. */
  readonly localValueKind?: AppBuilderDomainRelationshipLocalValueKind;
  /** Related field that the local field references. */
  readonly foreignFieldName?: string;
  /** Field suitable for displaying the related value. */
  readonly displayFieldName?: string;
  /** Whether generated UI/domain code should treat the relationship as required. */
  readonly required?: boolean;
}

/** Caller-supplied action input before a source lowerer decides how to realize it. */
export interface AppBuilderDomainActionDescriptor {
  /** Stable action name in caller/app vocabulary. */
  readonly name: string;
  /** General action kind. */
  readonly kind: AppBuilderDomainActionKind;
  /** Primary scope where the action applies. */
  readonly scope?: AppBuilderDomainActionScope;
  /** Entity the action targets when applicable. */
  readonly targetEntityName?: string;
  /** Domain field names the action reads or writes when applicable. */
  readonly inputFieldNames?: readonly string[];
  /** Whether the action mutates durable state. */
  readonly mutatesState?: boolean;
  /** Optional caller-authored explanation used by the AI/tooling, not source generation by itself. */
  readonly summary?: string;
}

/** Default app-builder field schema support before a composition narrows it. */
export const APP_BUILDER_ANY_FIELD_SCHEMA_EXPECTATION: AppBuilderFieldSchemaDomainSlotExpectation = {
  supportedValueKinds: APP_BUILDER_DOMAIN_FIELD_VALUE_KINDS,
  requiredValueKinds: [],
  summary: 'Any supported caller/domain field value kind.',
};

/** Current collection and form source lowerers need at least one text and one boolean field. */
export const APP_BUILDER_TEXT_BOOLEAN_FIELD_SCHEMA_EXPECTATION: AppBuilderFieldSchemaDomainSlotExpectation = {
  supportedValueKinds: APP_BUILDER_DOMAIN_FIELD_VALUE_KINDS,
  requiredValueKinds: [
    {
      valueKind: AppBuilderDomainFieldValueKind.Text,
      minCount: 1,
      summary: 'At least one text field supplies the primary label/input value channel.',
    },
    {
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
      minCount: 1,
      summary: 'At least one boolean field supplies checked/branch value-channel pressure.',
    },
  ],
  summary: 'At least one text field and one boolean field; additional number, date, choice, and choice-set fields are allowed.',
};

/** Browse/detail source lowerers need a stable label field while other display fields remain open-ended. */
export const APP_BUILDER_TEXT_FIELD_SCHEMA_EXPECTATION: AppBuilderFieldSchemaDomainSlotExpectation = {
  supportedValueKinds: APP_BUILDER_DOMAIN_FIELD_VALUE_KINDS,
  requiredValueKinds: [
    {
      valueKind: AppBuilderDomainFieldValueKind.Text,
      minCount: 1,
      summary: 'At least one text field supplies the primary list/detail label.',
    },
  ],
  summary: 'At least one text field; additional boolean, number, date, choice, and choice-set fields are allowed.',
};

/** One selectable value for a finite domain choice field. */
export interface AppBuilderDomainFieldOptionDescriptor {
  readonly value: string;
  readonly title: string;
}

/** Reusable finite option domain supplied independently from a field descriptor. */
export interface AppBuilderDomainValueSetDescriptor {
  readonly name: string;
  readonly title?: string;
  readonly valueKind?: AppBuilderDomainFieldValueKind;
  readonly options: readonly AppBuilderDomainFieldOptionDescriptor[];
}

/** Numeric control boundary facts supplied by the caller/domain before source lowering spends them. */
export interface AppBuilderNumericFieldConstraintDescriptor {
  /** Static minimum value when native number/range controls need a lower bound. */
  readonly minimum?: number;
  /** Static maximum value when native number/range controls need an upper bound. */
  readonly maximum?: number;
  /** Static step interval when native number/range controls need discrete increments. */
  readonly step?: number;
}

/** Field supplied by a domain descriptor or caller slot before app-builder lowers source text. */
export interface AppBuilderDomainFieldDescriptor {
  /** Entity type/name this field belongs to when a domain model supplies multiple entities. */
  readonly entityName?: string;
  readonly name: string;
  readonly title: string;
  readonly valueKind: AppBuilderDomainFieldValueKind;
  readonly required?: boolean;
  /** Explicit empty/draft value to emit when generated source initializes this field. */
  readonly defaultValue?: AppBuilderSeedRecordValue;
  readonly numericConstraints?: AppBuilderNumericFieldConstraintDescriptor;
  readonly valueSetName?: string;
  /** Explicit TypeScript alias name for one finite option value; useful when a choice-set field has a plural member name. */
  readonly optionTypeName?: string;
  readonly options?: readonly AppBuilderDomainFieldOptionDescriptor[];
}

/** Whether this field kind is backed by a finite option domain supplied by the caller or public preset. */
export function appBuilderDomainFieldUsesFiniteOptions(
  field: Pick<AppBuilderDomainFieldDescriptor, 'valueKind'>,
): boolean {
  return field.valueKind === AppBuilderDomainFieldValueKind.Choice
    || field.valueKind === AppBuilderDomainFieldValueKind.ChoiceSet;
}

/** Domain slot required or accepted by an app-builder pattern composition. */
export interface AppBuilderDomainSlot {
  readonly kind: AppBuilderDomainSlotKind;
  readonly key: AppBuilderDomainSlotKey;
  readonly summary: string;
  readonly required: boolean;
  /** Structured constraints when this slot is the caller-supplied field schema. */
  readonly fieldSchema?: AppBuilderFieldSchemaDomainSlotExpectation;
}

/** Domain slot assignment for a scalar caller-supplied domain value. */
export interface AppBuilderScalarDomainSlotAssignment {
  readonly key:
    | AppBuilderDomainSlotKey.EntityTitle
    | AppBuilderDomainSlotKey.EntityTypeName
    | AppBuilderDomainSlotKey.CollectionMemberName
    | AppBuilderDomainSlotKey.IdentityMemberName;
  readonly value: string;
}

/** Domain slot assignment for the generated entity identity value kind. */
export interface AppBuilderIdentityValueKindDomainSlotAssignment {
  readonly key: AppBuilderDomainSlotKey.IdentityValueKind;
  readonly value: AppBuilderDomainIdentityValueKind;
}

/** Domain slot assignment for the caller-supplied field schema. */
export interface AppBuilderFieldSchemaDomainSlotAssignment {
  readonly key: AppBuilderDomainSlotKey.FieldSchema;
  readonly value: readonly AppBuilderDomainFieldDescriptor[];
}

/** Caller-supplied domain value keyed by the slot menu. */
export type AppBuilderDomainSlotAssignment =
  | AppBuilderScalarDomainSlotAssignment
  | AppBuilderIdentityValueKindDomainSlotAssignment
  | AppBuilderFieldSchemaDomainSlotAssignment;

/** Caller/domain model shape independent of any specific Aurelia source file. */
export interface AppBuilderDomainModelSpec {
  readonly slots: readonly AppBuilderDomainSlot[];
}
