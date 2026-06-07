/** Primitive seed value that can be emitted directly as a TypeScript literal. */
export type AppBuilderSeedRecordPrimitive = string | number | boolean | null;

/** Public nested seed-record object shape accepted by current app-builder source lowerers. */
export interface AppBuilderSeedRecordObject extends Readonly<Record<string, AppBuilderSeedRecordValue>> {}

/** Public seed-record value shape accepted by current app-builder source lowerers. */
export type AppBuilderSeedRecordValue =
  | AppBuilderSeedRecordPrimitive
  | readonly AppBuilderSeedRecordPrimitive[]
  | AppBuilderSeedRecordObject
  | readonly AppBuilderSeedRecordObject[];

/** Public seed record keyed by generated domain identity and field members. */
export interface AppBuilderSeedRecord extends Readonly<Record<string, AppBuilderSeedRecordValue>> {}

/** Entity-scoped seed records used when one generated app fixture supplies more than one domain collection. */
export interface AppBuilderEntitySeedRecordGroup {
  /** Entity type name these records initialize. */
  readonly entityName: string;
  /** Caller-supplied records for that entity. */
  readonly records: readonly AppBuilderSeedRecord[];
}

/** Seed data set identity; records are selected separately from the domain shape. */
export enum AppBuilderSeedDataSetId {
  /** Generate no sample records while keeping the domain and UI mechanics intact. */
  None = 'none',
  /** Use records supplied directly by the app-builder caller for the selected domain. */
  CallerSupplied = 'caller-supplied',
}

/** Stable value list for app-builder seed-data-set transport schemas. */
export const APP_BUILDER_SEED_DATA_SET_IDS = [
  AppBuilderSeedDataSetId.None,
  AppBuilderSeedDataSetId.CallerSupplied,
] as const;

/** Intended audience for a seed data set. */
export enum AppBuilderSeedDataAudience {
  /** Suitable for public generated app source. */
  PublicGeneratedSource = 'public-generated-source',
  /** Suitable for demos where visible sample content is expected. */
  Demo = 'demo',
  /** Suitable for pressure-fixture inspection but not ideal as generated app output. */
  InspectionFixture = 'inspection-fixture',
  /** Caller owns the records and app-builder should not invent them. */
  CallerSupplied = 'caller-supplied',
}

/** Amount of visible generated seed data to emit. */
export enum AppBuilderSeedDataDensity {
  /** No records. */
  None = 'none',
  /** One record, usually enough to prove non-empty rendering. */
  Minimal = 'minimal',
  /** A small set that proves repeat/value-flow without becoming a demo app. */
  Small = 'small',
  /** Richer data intended for demo or analysis pressure. */
  Rich = 'rich',
}

/** Purpose served by a seed data set. */
export enum AppBuilderSeedDataPurpose {
  /** Shows the normal happy path for the generated app. */
  HappyPath = 'happy-path',
  /** Keeps the empty-state path available or intentionally selected. */
  EmptyState = 'empty-state',
  /** Exercises binding, checked/value channels, derived getters, or mutation flow. */
  ValueFlow = 'value-flow',
  /** Exercises visual length, labels, or display variation. */
  DisplayRichness = 'display-richness',
  /** Exercises unusual values and should stay out of public generated source unless requested. */
  EdgeCase = 'edge-case',
}

/** Seed data set that can fill generated app or pressure records for a compatible domain descriptor. */
export interface AppBuilderSeedDataSetDescriptor {
  readonly id: AppBuilderSeedDataSetId;
  readonly title: string;
  readonly summary: string;
  readonly audience: AppBuilderSeedDataAudience;
  readonly density: AppBuilderSeedDataDensity;
  readonly purposes: readonly AppBuilderSeedDataPurpose[];
  readonly records: readonly AppBuilderSeedRecord[];
}
