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
  /** Field schema describing names, labels, value kinds, options, and generated controls. */
  FieldSchema = 'field-schema',
  /** Operation name such as load, submit, save, archive, or refresh. */
  OperationName = 'operation-name',
  /** Presentation/copy material that should stay reference-scenario or host-adapted unless explicitly requested. */
  PresentationCopy = 'presentation-copy',
}

/** Stable slot identity used when a pattern asks the caller/domain preset for one app-domain value. */
export enum AppBuilderDomainSlotKey {
  /** Human-facing item/entity label for the generated domain. */
  EntityTitle = 'entity-title',
  /** TypeScript-safe class name for the generated domain entity. */
  EntityTypeName = 'entity-type-name',
  /** State collection member used by list or browse patterns. */
  CollectionMemberName = 'collection-member-name',
  /** Scalar identity member used by records, route params, or lookups. */
  IdentityMemberName = 'identity-member-name',
  /** Field schema used to lower data, controls, labels, and value channels. */
  FieldSchema = 'field-schema',
}

/** Domain slot required or accepted by an app-builder pattern composition. */
export interface AppBuilderDomainSlot {
  readonly kind: AppBuilderDomainSlotKind;
  readonly key: AppBuilderDomainSlotKey;
  readonly summary: string;
  readonly required: boolean;
}

/** Caller/domain model shape independent of any specific Aurelia source file. */
export interface AppBuilderDomainModelSpec {
  readonly slots: readonly AppBuilderDomainSlot[];
}
