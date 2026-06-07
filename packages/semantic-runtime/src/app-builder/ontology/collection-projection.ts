/** Collection field projection role used by collection display input payloads. */
export enum AppBuilderCollectionDisplayRole {
  /** Primary item title/name display. */
  Title = 'title',
  /** Short secondary text or description display. */
  Summary = 'summary',
  /** Status/state badge, text, or indicator display. */
  Status = 'status',
  /** Date/time field display. */
  Date = 'date',
  /** Numeric field display. */
  Number = 'number',
  /** Boolean field display. */
  Boolean = 'boolean',
  /** Related entity/value-object display. */
  Relation = 'relation',
}

/** Stable value list for collection display role input payload schemas. */
export const APP_BUILDER_COLLECTION_DISPLAY_ROLES = [
  AppBuilderCollectionDisplayRole.Title,
  AppBuilderCollectionDisplayRole.Summary,
  AppBuilderCollectionDisplayRole.Status,
  AppBuilderCollectionDisplayRole.Date,
  AppBuilderCollectionDisplayRole.Number,
  AppBuilderCollectionDisplayRole.Boolean,
  AppBuilderCollectionDisplayRole.Relation,
] as const;

/** Table column display kind used by collection table input payloads. */
export enum AppBuilderCollectionTableColumnDisplayKind {
  /** Plain text rendering. */
  Text = 'text',
  /** Numeric rendering. */
  Number = 'number',
  /** Date/time rendering. */
  Date = 'date',
  /** Boolean rendering. */
  Boolean = 'boolean',
  /** Choice/enum rendering. */
  Choice = 'choice',
  /** Relationship or owned value rendering. */
  Relation = 'relation',
  /** Row action rendering. */
  Action = 'action',
}

/** Stable value list for collection table column display-kind input payload schemas. */
export const APP_BUILDER_COLLECTION_TABLE_COLUMN_DISPLAY_KINDS = [
  AppBuilderCollectionTableColumnDisplayKind.Text,
  AppBuilderCollectionTableColumnDisplayKind.Number,
  AppBuilderCollectionTableColumnDisplayKind.Date,
  AppBuilderCollectionTableColumnDisplayKind.Boolean,
  AppBuilderCollectionTableColumnDisplayKind.Choice,
  AppBuilderCollectionTableColumnDisplayKind.Relation,
  AppBuilderCollectionTableColumnDisplayKind.Action,
] as const;

/** Caller-supplied field projection row for list/card/table presentation. */
export interface AppBuilderCollectionDisplayFieldPayload {
  /** Domain field name to project. */
  readonly fieldName: string;
  /** Presentation role the field should play. */
  readonly role: AppBuilderCollectionDisplayRole;
  /** Optional human-facing label/header override for roles that render labels. */
  readonly label?: string;
}

/** Caller-supplied table column row for table presentation. */
export interface AppBuilderCollectionTableColumnPayload {
  /** Domain field name used as the accessor for field-backed columns. */
  readonly fieldName?: string;
  /** Domain action name used for action columns. */
  readonly actionName?: string;
  /** Domain relationship name used for relationship-backed display columns. */
  readonly relationshipName?: string;
  /** Human-facing table column header. */
  readonly header: string;
  /** How the column value is presented. */
  readonly displayKind?: AppBuilderCollectionTableColumnDisplayKind;
  /** Exact Aurelia router instruction when an action or relationship column spends router navigation. */
  readonly routeInstruction?: string;
  /** Exact Aurelia router binding expression for `load.bind` when navigation is computed as one route expression. */
  readonly routeBindingExpression?: string;
  /** Exact route params binding expression when an action or relationship column spends router navigation. */
  readonly routeParamsExpression?: string;
  /** Exact route context binding expression when an action or relationship column spends router navigation. */
  readonly routeContextExpression?: string;
  /** Exact active-state binding expression when an action or relationship column spends router navigation. */
  readonly routeActiveExpression?: string;
  /** Router target attribute name when an action or relationship column spends router navigation. */
  readonly routeTargetAttributeName?: string;
  /** Visible link text when an action column spends router navigation. */
  readonly linkText?: string;
  /** Whether local/server sorting should be offered for this field-backed column. */
  readonly sortable?: boolean;
  /** Whether local/server filtering should be offered for this field-backed column. */
  readonly filterable?: boolean;
}
