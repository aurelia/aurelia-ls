import type { AppBuilderDomainPresetId } from './domain-preset.js';

/** Seed data set identity; records are selected separately from the domain shape. */
export enum AppBuilderSeedDataSetId {
  /** Generate no starter records while keeping the domain and UI mechanics intact. */
  None = 'none',
  /** Public-friendly starter records for the task-list domain. */
  TaskListPublicSmall = 'task-list.public-small',
  /** Internal inspection records for exercising task-list value and display flow. */
  TaskListInspectionFlow = 'task-list.inspection-flow',
}

/** Intended audience for a seed data set. */
export enum AppBuilderSeedDataAudience {
  /** Suitable for public starter source. */
  PublicStarter = 'public-starter',
  /** Suitable for demos where visible sample content is expected. */
  Demo = 'demo',
  /** Suitable for fixture/golden inspection but not ideal as generated app output. */
  InspectionFixture = 'inspection-fixture',
  /** Caller owns the records and app-builder should not invent them. */
  CallerSupplied = 'caller-supplied',
}

/** Amount of visible starter data to emit. */
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
  /** Exercises unusual values and should stay out of public starters unless requested. */
  EdgeCase = 'edge-case',
}

/** Seed data set that can fill starter records for a compatible domain preset. */
export interface AppBuilderSeedDataSetDescriptor {
  readonly id: AppBuilderSeedDataSetId;
  readonly title: string;
  readonly summary: string;
  readonly audience: AppBuilderSeedDataAudience;
  readonly density: AppBuilderSeedDataDensity;
  readonly purposes: readonly AppBuilderSeedDataPurpose[];
  readonly domainPresetId?: AppBuilderDomainPresetId;
  readonly records: readonly Record<string, string | number | boolean>[];
}
