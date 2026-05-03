import {
  FrameworkRelationshipMechanism,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipEndpointKind,
} from "../../framework/relationships.js";
import type { SourceProject } from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import {
  readFrameworkRenderingRelationships,
  type FrameworkRenderingRelationshipFilters,
  type FrameworkRenderingRelationshipRow,
} from "./framework-rendering-relationships.js";

/** Compact consequence kind produced by resolved rendering/runtime rows. */
export type FrameworkRenderConsequenceKind =
  | "binding-admission"
  | "binding-effect"
  | "binding-production"
  | "child-controller-admission"
  | "controller-creation"
  | "instruction-dispatch"
  | "observation-setup"
  | "observer-lookup"
  | "recursive-dispatch"
  | "template-controller-link";

/** Detail projection that owns the source atom behind one consequence row. */
export type FrameworkRenderConsequenceDetailProjection =
  | "binding-admissions"
  | "binding-effects"
  | "binding-products"
  | "binding-setups"
  | "controller-creations"
  | "instruction-dispatches"
  | "relationships";

/** Filters accepted by framework.rendering render-consequences. */
export interface FrameworkRenderConsequenceFilters
  extends FrameworkRenderingRelationshipFilters {
  /** Filter by compact consequence kind. */
  readonly consequenceKind?: string;
}

/** Compact runtime product/effect row derived from rendering relationship atoms. */
export interface FrameworkRenderConsequenceRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id that owns the source row. */
  readonly packageId: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Runtime consequence kind. */
  readonly consequenceKind: FrameworkRenderConsequenceKind;
  /** Underlying semantic relation. */
  readonly relation: FrameworkRelationshipRelation;
  /** Runtime/source mechanism that produced the consequence. */
  readonly mechanism: FrameworkRelationshipMechanism;
  /** Rendering/hydration/binding/lifecycle/observation phase. */
  readonly phase: string;
  /** Source-side actor, usually a renderer, binding, syntax producer, or instruction concept. */
  readonly actorName: string;
  /** Source-side actor endpoint kind. */
  readonly actorKind: FrameworkRelationshipEndpointKind;
  /** Consumed input or source concept for the consequence. */
  readonly inputName: string;
  /** Product, target method, effect, binding, renderer, or controller slot reached. */
  readonly targetName: string;
  /** Target endpoint kind. */
  readonly targetKind: FrameworkRelationshipEndpointKind;
  /** Projection that owns the detailed row family for this consequence. */
  readonly detailProjection: FrameworkRenderConsequenceDetailProjection;
  /** Exact filters for opening the detailed row family. */
  readonly detailFilters: Readonly<Record<string, string>>;
  /** Relationship row id that produced this consequence. */
  readonly relationshipId: string;
  /** Source row id behind the relationship. */
  readonly sourceRowId: string;
  /** Exact source evidence for the consequence. */
  readonly source: SourceRange;
  /** Human-facing consequence summary. */
  readonly summary: string;
}

/** Render-consequence read mode after applying the inquiry shape. */
export type FrameworkRenderConsequenceReadMode = "overview" | "filtered";

/** Compact renderer consequence row set with overview/detail selection made explicit. */
export interface FrameworkRenderConsequenceRead {
  /** Rows visible to the current inquiry after overview/detail selection and filtering. */
  readonly rows: readonly FrameworkRenderConsequenceRow[];
  /** Whether this read is the default overview or a filter-driven detail read. */
  readonly mode: FrameworkRenderConsequenceReadMode;
  /** Total compact renderer consequences known to the relationship substrate. */
  readonly totalRowCount: number;
  /** Rows selected by the default overview policy. */
  readonly overviewRowCount: number;
}

const CONSEQUENCE_OVERVIEW_KIND_QUOTAS: Readonly<
  Partial<Record<FrameworkRenderConsequenceKind, number>>
> = {
  "binding-admission": 2,
  "binding-effect": 1,
  "binding-production": 3,
  "child-controller-admission": 3,
  "controller-creation": 3,
  "instruction-dispatch": 3,
  "observation-setup": 1,
  "observer-lookup": 1,
  "recursive-dispatch": 2,
  "template-controller-link": 1,
};

/** Read compact rendering consequences derived from normalized relationship rows. */
export function readFrameworkRenderConsequences(
  sourceProject: SourceProject,
  filters: FrameworkRenderConsequenceFilters,
): readonly FrameworkRenderConsequenceRow[] {
  return readFrameworkRenderConsequenceRead(sourceProject, filters).rows;
}

/** Read compact rendering consequences while preserving overview/detail counts. */
export function readFrameworkRenderConsequenceRead(
  sourceProject: SourceProject,
  filters: FrameworkRenderConsequenceFilters,
): FrameworkRenderConsequenceRead {
  const allRows = readFrameworkRenderingRelationships(sourceProject, filters)
    .map(renderConsequenceForRelationship)
    .filter((row): row is FrameworkRenderConsequenceRow => row !== null)
    .filter((row) => renderConsequenceMatches(row, filters))
    .sort(renderConsequenceCompare);
  const overviewRows = renderConsequenceOverviewRows(allRows);
  const useOverview = shouldUseRenderConsequenceOverview(filters);
  return {
    rows: useOverview ? overviewRows : allRows,
    mode: useOverview ? "overview" : "filtered",
    totalRowCount: allRows.length,
    overviewRowCount: overviewRows.length,
  };
}

/** Read all compact rendering consequences without applying overview selection. */
export function readFrameworkRenderConsequenceRows(
  sourceProject: SourceProject,
  filters: FrameworkRenderConsequenceFilters,
): readonly FrameworkRenderConsequenceRow[] {
  return readFrameworkRenderingRelationships(sourceProject, filters)
    .map(renderConsequenceForRelationship)
    .filter((row): row is FrameworkRenderConsequenceRow => row !== null)
    .filter((row) => renderConsequenceMatches(row, filters))
    .sort(renderConsequenceCompare);
}

function renderConsequenceForRelationship(
  row: FrameworkRenderingRelationshipRow,
): FrameworkRenderConsequenceRow | null {
  const consequenceKind = consequenceKindForRelationship(row);
  if (consequenceKind === null) {
    return null;
  }
  const detail = consequenceDetail(row, consequenceKind);
  return {
    id: `framework-render-consequence:${row.id}`,
    packageId: row.packageId,
    packageName: row.packageName,
    consequenceKind,
    relation: row.relation,
    mechanism: row.mechanism,
    phase: row.phase,
    actorName: row.from.name,
    actorKind: row.from.kind,
    inputName: row.from.name,
    targetName: row.to.name,
    targetKind: row.to.kind,
    detailProjection: detail.projection,
    detailFilters: detail.filters,
    relationshipId: row.id,
    sourceRowId: row.sourceRowId,
    source: row.source,
    summary: consequenceSummary(row, consequenceKind),
  };
}

function consequenceKindForRelationship(
  row: FrameworkRenderingRelationshipRow,
): FrameworkRenderConsequenceKind | null {
  switch (row.relation) {
    case FrameworkRelationshipRelation.AdmitsBinding:
      return "binding-admission";
    case FrameworkRelationshipRelation.AdmitsChildController:
      return "child-controller-admission";
    case FrameworkRelationshipRelation.ConfiguresObservation:
      return "observation-setup";
    case FrameworkRelationshipRelation.CreatesController:
      return "controller-creation";
    case FrameworkRelationshipRelation.DispatchesInstruction:
      return row.mechanism ===
        FrameworkRelationshipMechanism.RecursiveRendererDispatch
        ? "recursive-dispatch"
        : "instruction-dispatch";
    case FrameworkRelationshipRelation.InvokesCallback:
      return "template-controller-link";
    case FrameworkRelationshipRelation.LooksUpObserver:
      return "observer-lookup";
    case FrameworkRelationshipRelation.PerformsBindingEffect:
      return "binding-effect";
    case FrameworkRelationshipRelation.ProducesBinding:
      return "binding-production";
    default:
      return null;
  }
}

function consequenceDetail(
  row: FrameworkRenderingRelationshipRow,
  consequenceKind: FrameworkRenderConsequenceKind,
): {
  readonly projection: FrameworkRenderConsequenceDetailProjection;
  readonly filters: Readonly<Record<string, string>>;
} {
  switch (consequenceKind) {
    case "binding-admission":
      return {
        projection: "binding-admissions",
        filters: { bindingName: row.to.name },
      };
    case "binding-effect":
    case "observer-lookup":
      return {
        projection: "binding-effects",
        filters: { bindingName: row.from.name },
      };
    case "binding-production":
      return {
        projection: "binding-products",
        filters: { bindingName: row.to.name },
      };
    case "child-controller-admission":
    case "controller-creation":
    case "recursive-dispatch":
    case "template-controller-link":
      return {
        projection: "controller-creations",
        filters: { rendererName: row.from.name },
      };
    case "instruction-dispatch":
      return {
        projection: "instruction-dispatches",
        filters: { rendererName: row.to.name },
      };
    case "observation-setup":
      return {
        projection: "binding-setups",
        filters: { bindingName: row.from.name },
      };
  }
}

function consequenceSummary(
  row: FrameworkRenderingRelationshipRow,
  consequenceKind: FrameworkRenderConsequenceKind,
): string {
  return `${consequenceKind}: ${row.summary}`;
}

function renderConsequenceMatches(
  row: FrameworkRenderConsequenceRow,
  filters: FrameworkDiscoveryFilters & {
    readonly consequenceKind?: string;
    readonly relation?: string;
    readonly mechanism?: string;
    readonly phase?: string;
  },
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.consequenceKind === undefined ||
      row.consequenceKind === filters.consequenceKind) &&
    (filters.relation === undefined || row.relation === filters.relation) &&
    (filters.mechanism === undefined || row.mechanism === filters.mechanism) &&
    (filters.phase === undefined || row.phase === filters.phase) &&
    (filters.rendererName === undefined ||
      row.actorName === filters.rendererName ||
      row.targetName === filters.rendererName ||
      row.detailFilters.rendererName === filters.rendererName) &&
    (filters.bindingName === undefined ||
      row.actorName === filters.bindingName ||
      row.targetName === filters.bindingName ||
      row.detailFilters.bindingName === filters.bindingName) &&
    (filters.instructionName === undefined ||
      row.inputName === filters.instructionName ||
      row.targetName === filters.instructionName ||
      row.detailFilters.instructionName === filters.instructionName) &&
    (filters.fromName === undefined || row.actorName === filters.fromName) &&
    (filters.toName === undefined || row.targetName === filters.toName) &&
    (filters.query === undefined ||
      [
        row.consequenceKind,
        row.relation,
        row.mechanism,
        row.phase,
        row.actorName,
        row.inputName,
        row.targetName,
        row.summary,
      ].some((value) => value.includes(filters.query!)))
  );
}

function renderConsequenceOverviewRows(
  rows: readonly FrameworkRenderConsequenceRow[],
): readonly FrameworkRenderConsequenceRow[] {
  const usedByKind = new Map<FrameworkRenderConsequenceKind, number>();
  const overview: FrameworkRenderConsequenceRow[] = [];
  for (const row of rows) {
    const quota = CONSEQUENCE_OVERVIEW_KIND_QUOTAS[row.consequenceKind] ?? 0;
    const used = usedByKind.get(row.consequenceKind) ?? 0;
    if (used >= quota) {
      continue;
    }
    overview.push(row);
    usedByKind.set(row.consequenceKind, used + 1);
  }
  return overview;
}

function shouldUseRenderConsequenceOverview(
  filters: FrameworkRenderConsequenceFilters,
): boolean {
  return (
    filters.packageId === undefined &&
    filters.query === undefined &&
    filters.consequenceKind === undefined &&
    filters.relation === undefined &&
    filters.mechanism === undefined &&
    filters.phase === undefined &&
    filters.rendererName === undefined &&
    filters.bindingName === undefined &&
    filters.instructionName === undefined &&
    filters.fromName === undefined &&
    filters.toName === undefined
  );
}

function renderConsequenceCompare(
  left: FrameworkRenderConsequenceRow,
  right: FrameworkRenderConsequenceRow,
): number {
  return (
    packagePriority(left.packageId) - packagePriority(right.packageId) ||
    consequenceKindPriority(left.consequenceKind) -
      consequenceKindPriority(right.consequenceKind) ||
    left.phase.localeCompare(right.phase) ||
    left.actorName.localeCompare(right.actorName) ||
    left.targetName.localeCompare(right.targetName)
  );
}

function packagePriority(packageId: string): number {
  switch (packageId) {
    case "runtime-html":
      return 0;
    case "runtime":
      return 1;
    case "template-compiler":
      return 2;
    default:
      return 10;
  }
}

function consequenceKindPriority(kind: FrameworkRenderConsequenceKind): number {
  switch (kind) {
    case "instruction-dispatch":
      return 0;
    case "controller-creation":
      return 1;
    case "child-controller-admission":
      return 2;
    case "recursive-dispatch":
      return 3;
    case "template-controller-link":
      return 4;
    case "binding-production":
      return 5;
    case "binding-admission":
      return 6;
    case "observer-lookup":
      return 7;
    case "observation-setup":
      return 8;
    case "binding-effect":
      return 9;
  }
}
