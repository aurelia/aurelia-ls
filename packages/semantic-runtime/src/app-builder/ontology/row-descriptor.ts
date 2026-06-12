import { APP_BUILDER_AFFORDANCE_ROWS } from './affordance.js';
import { APP_BUILDER_APPLICATION_PATTERN_ROWS } from './application-pattern.js';
import { APP_BUILDER_COLLECTION_CONCEPT_ROWS } from './collection.js';
import {
  APP_BUILDER_CONTROL_MANIFEST_ROWS,
  APP_BUILDER_CONTROL_PATTERN_ROWS,
  APP_BUILDER_CONTROL_REALIZATION_POLICY_ROWS,
} from './control.js';
import { APP_BUILDER_EFFECT_CONTRACT_ROWS } from './effect.js';
import {
  APP_BUILDER_INPUT_CONTRACT_ROWS,
  APP_BUILDER_INPUT_FACET_ROWS,
} from './input.js';
import { APP_BUILDER_POLICY_AXIS_ROWS } from './policy.js';
import {
  AppBuilderOntologyRowKind,
  appBuilderOntologyRowRef,
  type AppBuilderOntologyRowRef,
} from './relation.js';
import {
  APP_BUILDER_STYLING_MECHANISM_ROWS,
  APP_BUILDER_VISUAL_POLICY_ROWS,
} from './style.js';
import type { AppBuilderOntologyStatus } from './status.js';
import { appBuilderProjectedOntologyStatus } from '../policy/status-projection.js';

/** Read-only descriptor for any admitted app-builder ontology row. */
export interface AppBuilderOntologyRowDescriptor {
  /** Stable row reference across ontology projections. */
  readonly ref: AppBuilderOntologyRowRef;
  /** Display title for AI-facing menus and diagnostics. */
  readonly title: string;
  /** Compact row explanation without requiring family-specific joins. */
  readonly summary: string;
  /** Row-local status declaration before policy/registry projection. */
  readonly declaredStatus: AppBuilderOntologyStatus;
  /** Honest modeling/implementation/recommendation status projected for public answers. */
  readonly status: AppBuilderOntologyStatus;
}

/** All admitted app-builder ontology rows in a descriptor shape shared by projections. */
export const APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS: readonly AppBuilderOntologyRowDescriptor[] = [
  ...APP_BUILDER_INPUT_CONTRACT_ROWS.map((row): AppBuilderOntologyRowDescriptor =>
    appBuilderOntologyRowDescriptorFromStatus(AppBuilderOntologyRowKind.InputContract, row.id, row.title, row.summary, row.status)
  ),
  ...APP_BUILDER_INPUT_FACET_ROWS.map((row): AppBuilderOntologyRowDescriptor =>
    appBuilderOntologyRowDescriptorFromStatus(AppBuilderOntologyRowKind.InputFacet, row.id, row.title, row.summary, row.status)
  ),
  ...APP_BUILDER_POLICY_AXIS_ROWS.map((row): AppBuilderOntologyRowDescriptor =>
    appBuilderOntologyRowDescriptorFromStatus(AppBuilderOntologyRowKind.PolicyAxis, row.id, row.title, row.summary, row.status)
  ),
  ...APP_BUILDER_EFFECT_CONTRACT_ROWS.map((row): AppBuilderOntologyRowDescriptor =>
    appBuilderOntologyRowDescriptorFromStatus(AppBuilderOntologyRowKind.EffectContract, row.id, row.title, row.summary, row.status)
  ),
  ...APP_BUILDER_AFFORDANCE_ROWS.map((row): AppBuilderOntologyRowDescriptor =>
    appBuilderOntologyRowDescriptorFromStatus(AppBuilderOntologyRowKind.Affordance, row.id, row.title, row.summary, row.status)
  ),
  ...APP_BUILDER_APPLICATION_PATTERN_ROWS.map((row): AppBuilderOntologyRowDescriptor =>
    appBuilderOntologyRowDescriptorFromStatus(AppBuilderOntologyRowKind.ApplicationPattern, row.id, row.title, row.problemSolved, row.status)
  ),
  ...APP_BUILDER_COLLECTION_CONCEPT_ROWS.map((row): AppBuilderOntologyRowDescriptor =>
    appBuilderOntologyRowDescriptorFromStatus(AppBuilderOntologyRowKind.CollectionConcept, row.id, row.title, row.summary, row.status)
  ),
  ...APP_BUILDER_CONTROL_PATTERN_ROWS.map((row): AppBuilderOntologyRowDescriptor =>
    appBuilderOntologyRowDescriptorFromStatus(AppBuilderOntologyRowKind.ControlPattern, row.id, row.title, row.summary, row.status)
  ),
  ...APP_BUILDER_CONTROL_REALIZATION_POLICY_ROWS.map((row): AppBuilderOntologyRowDescriptor =>
    appBuilderOntologyRowDescriptorFromStatus(AppBuilderOntologyRowKind.ControlRealizationPolicy, row.id, row.title, row.summary, row.status)
  ),
  ...APP_BUILDER_CONTROL_MANIFEST_ROWS.map((row): AppBuilderOntologyRowDescriptor =>
    appBuilderOntologyRowDescriptorFromStatus(AppBuilderOntologyRowKind.ControlManifest, row.id, row.title, row.summary, row.status)
  ),
  ...APP_BUILDER_STYLING_MECHANISM_ROWS.map((row): AppBuilderOntologyRowDescriptor =>
    appBuilderOntologyRowDescriptorFromStatus(AppBuilderOntologyRowKind.StylingMechanism, row.id, row.title, row.summary, row.status)
  ),
  ...APP_BUILDER_VISUAL_POLICY_ROWS.map((row): AppBuilderOntologyRowDescriptor =>
    appBuilderOntologyRowDescriptorFromStatus(AppBuilderOntologyRowKind.VisualPolicy, row.id, row.title, row.summary, row.status)
  ),
] as const;

const ONTOLOGY_ROW_DESCRIPTORS_BY_KEY = new Map<string, AppBuilderOntologyRowDescriptor>(
  APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS.map((row) => [appBuilderOntologyRowRefKey(row.ref), row]),
);

/** Resolve an ontology row descriptor by stable row reference. */
export function appBuilderOntologyRowDescriptor(
  ref: AppBuilderOntologyRowRef,
): AppBuilderOntologyRowDescriptor | undefined {
  return ONTOLOGY_ROW_DESCRIPTORS_BY_KEY.get(appBuilderOntologyRowRefKey(ref));
}

/** Stable key for exact app-builder ontology row references. */
export function appBuilderOntologyRowRefKey(
  ref: AppBuilderOntologyRowRef,
): string {
  return `${ref.kind}\0${ref.domain}\0${ref.id}`;
}

/** Output order for ontology row reference de-duplication. */
export type AppBuilderOntologyRowRefOrder = 'preserve' | 'sorted';

/** De-duplicate ontology row references by stable row key for transport and lowering summaries. */
export function appBuilderUniqueOntologyRowRefs(
  refs: readonly AppBuilderOntologyRowRef[],
  order: AppBuilderOntologyRowRefOrder = 'preserve',
): readonly AppBuilderOntologyRowRef[] {
  const seen = new Set<string>();
  const uniqueRefs: AppBuilderOntologyRowRef[] = [];
  for (const ref of refs) {
    const key = appBuilderOntologyRowRefKey(ref);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueRefs.push(ref);
  }
  return order === 'sorted'
    ? [...uniqueRefs].sort((left, right) =>
        appBuilderOntologyRowRefKey(left).localeCompare(appBuilderOntologyRowRefKey(right))
      )
    : uniqueRefs;
}

function appBuilderOntologyRowDescriptorFromStatus(
  kind: AppBuilderOntologyRowKind,
  id: string,
  title: string,
  summary: string,
  declaredStatus: AppBuilderOntologyStatus,
): AppBuilderOntologyRowDescriptor {
  const ref = appBuilderOntologyRowRef(kind, id);
  return {
    ref,
    title,
    summary,
    declaredStatus,
    status: appBuilderProjectedOntologyStatus(ref, declaredStatus),
  };
}
