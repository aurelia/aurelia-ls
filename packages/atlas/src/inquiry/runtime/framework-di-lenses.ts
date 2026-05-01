import {
  readFrameworkDiIndex,
  type FrameworkDiKeyRow,
} from "../../framework/di-index.js";
import {
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipAtom,
} from "../../framework/relationships.js";
import type { SourceProject } from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import { BasisAuthority, BasisClosure, BasisFreshness, BasisKind, type Basis } from "../basis.js";
import { clampBudget } from "../budget.js";
import { ContinuationKind, ContinuationPriority, type Continuation } from "../continuation.js";
import { EvidenceConfidence, EvidenceKind, EvidenceRole, type Evidence } from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind, RepoRootLocus, type SourceRange } from "../locus.js";
import { NavigationPlane, NavigationRelation, type NavigationRouteClaim } from "../navigation.js";

/** Value returned by framework.di. */
export interface FrameworkDiValue {
  /** DI relationship index schema/cache version. */
  readonly version: string;
  /** Number of DI key rows after filtering. */
  readonly keyCount: number;
  /** Number of relationship atoms after filtering. */
  readonly relationshipCount: number;
  /** Relationship counts grouped by semantic relation. */
  readonly relations: Readonly<Record<string, number>>;
  /** Relationship counts grouped by mechanism. */
  readonly mechanisms: Readonly<Record<string, number>>;
  /** Relationship counts grouped by phase. */
  readonly phases: Readonly<Record<string, number>>;
  /** DI key rows returned by key projections. */
  readonly keys?: readonly FrameworkDiKeyRow[];
  /** DI relationship atoms returned by fact/relationship projections. */
  readonly relationships?: readonly FrameworkRelationshipAtom[];
}

interface FrameworkDiFilters {
  readonly packageId?: string;
  readonly relation?: string;
  readonly mechanism?: string;
  readonly phase?: string;
  readonly key?: string;
  readonly strategy?: string;
  readonly query?: string;
}

/** Answer framework.di inquiries from kernel DI relationship atoms. */
export function answerFrameworkDi(
  /** Inquiry being answered. */
  inquiry: Inquiry,
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
): Answer<FrameworkDiValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = filtersFromInquiry(inquiry);
  const index = readFrameworkDiIndex(sourceProject);
  const keys = index.keys.filter((row) => diKeyMatches(row, filters));
  const relationships = relationshipProjectionRows(index.relationships, projection).filter((row) => relationshipMatches(row, filters));
  const limit = clampBudget(inquiry.budget?.rows, 80, 1_000);
  const offset = pageOffset(inquiry);

  if (projection === "keys") {
    const page = pageRows(keys, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${keys.length} framework DI key row(s).`, {
      value: {
        version: index.version,
        keyCount: keys.length,
        relationshipCount: relationships.length,
        relations: index.rollup.relations,
        mechanisms: index.rollup.mechanisms,
        phases: index.rollup.phases,
        keys: page.rows,
      },
      basis: [frameworkDiBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForDiKey),
      page: pageInfo(inquiry, page.rows.length, keys.length, limit, page.nextOffset),
      continuations: diKeyContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "facts" || projection === "relationships" || projection === "registrations" || projection === "providers" || projection === "lookups" || projection === "materializations" || projection === "evidence") {
    const page = pageRows(relationships, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${relationships.length} framework DI relationship atom(s).`, {
      value: {
        version: index.version,
        keyCount: keys.length,
        relationshipCount: relationships.length,
        relations: countBy(relationships, (row) => row.relation),
        mechanisms: countBy(relationships, (row) => row.mechanism),
        phases: countBy(relationships, (row) => row.phase),
        relationships: page.rows,
      },
      basis: [frameworkDiBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForRelationship),
      page: pageInfo(inquiry, page.rows.length, relationships.length, limit, page.nextOffset),
      continuations: relationshipContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  return createAnswer(inquiry, OutcomeKind.Hit, `Framework DI index has ${keys.length} DI key row(s) and ${relationships.length} relationship atom(s).`, {
    value: {
      version: index.version,
      keyCount: keys.length,
      relationshipCount: relationships.length,
      relations: countBy(relationships, (row) => row.relation),
      mechanisms: countBy(relationships, (row) => row.mechanism),
      phases: countBy(relationships, (row) => row.phase),
    },
    basis: [frameworkDiBasis(sourceProject)],
    evidence: [
      ...keys.slice(0, 2).map(evidenceForDiKey),
      ...relationships.slice(0, 4).map(evidenceForRelationship),
    ],
    continuations: diSummaryContinuations(inquiry),
  });
}

function relationshipProjectionRows(rows: readonly FrameworkRelationshipAtom[], projection: string): readonly FrameworkRelationshipAtom[] {
  switch (projection) {
    case "registrations":
      return rows.filter((row) =>
        row.phase === FrameworkRelationshipPhase.Registration
        || row.relation === FrameworkRelationshipRelation.CreatesRegistration
        || row.relation === FrameworkRelationshipRelation.CreatesResolver
        || row.relation === FrameworkRelationshipRelation.RegistersProvider
        || row.relation === FrameworkRelationshipRelation.ProvidesKey
        || row.relation === FrameworkRelationshipRelation.StoresResolverSlot
        || row.relation === FrameworkRelationshipRelation.StoresResourceSlot
        || row.relation === FrameworkRelationshipRelation.AliasesKey
        || row.relation === FrameworkRelationshipRelation.InvokesRegistry);
    case "providers":
      return rows.filter((row) =>
        row.relation === FrameworkRelationshipRelation.ProvidesKey
        || row.relation === FrameworkRelationshipRelation.AliasesKey && row.to.kind === FrameworkRelationshipEndpointKind.Expression
        || row.relation === FrameworkRelationshipRelation.RegistersProvider);
    case "lookups":
      return rows.filter((row) =>
        row.phase === FrameworkRelationshipPhase.Lookup
        || row.phase === FrameworkRelationshipPhase.Resolution
        || row.relation === FrameworkRelationshipRelation.LooksUpKey
        || row.relation === FrameworkRelationshipRelation.ResolvesKey
        || row.relation === FrameworkRelationshipRelation.DelegatesLookup);
    case "materializations":
      return rows.filter((row) =>
        row.phase === FrameworkRelationshipPhase.Materialization
        || row.relation === FrameworkRelationshipRelation.MaterializesKey
        || row.relation === FrameworkRelationshipRelation.ConstructsInstance
        || row.relation === FrameworkRelationshipRelation.CreatesFactory);
    default:
      return rows;
  }
}

function filtersFromInquiry(inquiry: Inquiry): FrameworkDiFilters {
  return {
    ...filtersFromRecord(inquiry.subject),
    ...filtersFromRecord(inquiry.filters),
  };
}

function filtersFromRecord(value: unknown): FrameworkDiFilters {
  if (value === null || typeof value !== "object") {
    return {};
  }
  const source = value as Record<string, unknown>;
  return {
    ...stringFilter(source, "packageId"),
    ...stringFilter(source, "relation"),
    ...stringFilter(source, "mechanism"),
    ...stringFilter(source, "phase"),
    ...stringFilter(source, "key"),
    ...stringFilter(source, "strategy"),
    ...stringFilter(source, "query"),
  };
}

function stringFilter(source: Record<string, unknown>, key: keyof FrameworkDiFilters): object {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}

function diKeyMatches(row: FrameworkDiKeyRow, filters: FrameworkDiFilters): boolean {
  return (filters.packageId === undefined || row.packageId === filters.packageId)
    && (filters.key === undefined || row.interfaceKey === filters.key || row.exportName === filters.key)
    && (filters.query === undefined
      || row.exportName.includes(filters.query)
      || row.interfaceKey.includes(filters.query)
      || row.packageId.includes(filters.query));
}

function relationshipMatches(row: FrameworkRelationshipAtom, filters: FrameworkDiFilters): boolean {
  return (filters.packageId === undefined || row.packageId === filters.packageId)
    && (filters.relation === undefined || row.relation === filters.relation)
    && (filters.mechanism === undefined || row.mechanism === filters.mechanism)
    && (filters.phase === undefined || row.phase === filters.phase)
    && (filters.key === undefined || row.key === filters.key || row.from.name === filters.key || row.to.name === filters.key)
    && (filters.strategy === undefined || row.strategy === filters.strategy)
    && (filters.query === undefined
      || row.summary.includes(filters.query)
      || row.from.name.includes(filters.query)
      || row.to.name.includes(filters.query)
      || row.key?.includes(filters.query) === true
      || row.value?.includes(filters.query) === true);
}

function evidenceForDiKey(row: FrameworkDiKeyRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.DiRegistration,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.packageId}:${row.exportName} defines DI key ${row.interfaceKey}`,
    source: row.source,
    data: row,
  };
}

function evidenceForRelationship(row: FrameworkRelationshipAtom): Evidence {
  return {
    id: row.id,
    kind: evidenceKindForRelationship(row),
    role: EvidenceRole.Subject,
    confidence: evidenceConfidenceForRelationship(row),
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function evidenceKindForRelationship(row: FrameworkRelationshipAtom): EvidenceKind {
  switch (row.relation) {
    case FrameworkRelationshipRelation.LooksUpKey:
    case FrameworkRelationshipRelation.ResolvesKey:
    case FrameworkRelationshipRelation.DelegatesLookup:
      return EvidenceKind.DiLookup;
    case FrameworkRelationshipRelation.MaterializesKey:
    case FrameworkRelationshipRelation.ConstructsInstance:
    case FrameworkRelationshipRelation.CreatesFactory:
      return EvidenceKind.TypeFact;
    default:
      return EvidenceKind.DiRegistration;
  }
}

function evidenceConfidenceForRelationship(row: FrameworkRelationshipAtom): EvidenceConfidence {
  switch (row.closure) {
    case "exact":
      return EvidenceConfidence.Exact;
    case "modeled":
      return EvidenceConfidence.Strong;
    case "partial":
    case "open":
      return EvidenceConfidence.Unknown;
  }
  return EvidenceConfidence.Unknown;
}

function diSummaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    projectionContinuation(inquiry, "framework.di:keys", "keys", "Inspect DI InterfaceSymbol keys before following provider and lookup mechanics."),
    projectionContinuation(inquiry, "framework.di:registrations", "registrations", "Inspect provider and resolver registration mechanics in kernel DI."),
    projectionContinuation(inquiry, "framework.di:providers", "providers", "Inspect DI key provider and alias targets where Atlas can see them exactly."),
    projectionContinuation(inquiry, "framework.di:lookups", "lookups", "Inspect lookup and resolution mechanics in kernel DI."),
    projectionContinuation(inquiry, "framework.di:materializations", "materializations", "Inspect the low-level construction and factory sites behind DI materialization."),
  ];
}

function diKeyContinuations(inquiry: Inquiry, rows: readonly FrameworkDiKeyRow[], nextOffset: number | undefined, limit: number): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.di:keys:next-page", "Continue DI key rows.", nextOffset, limit));
  }
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForDiKey(row);
    continuations.push({
      id: `framework.di:keys:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect the exact createInterface source for this DI key.",
      inquiry: {
        lens: LensId.TsSource,
        locus: sourceRangeLocus(row.source),
        projection: "text",
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText], "Exact createInterface source for a DI key."),
    });
    if (row.defaultRegistrationAtomIds.length > 0) {
      continuations.push({
        id: `framework.di:keys:providers:${index}`,
        kind: ContinuationKind.SwitchProjection,
        priority: ContinuationPriority.Primary,
        rationale: "Inspect the default provider registration attached to this InterfaceSymbol.",
        inquiry: {
          ...inquiry,
          projection: "providers",
          filters: {
            ...inquiry.filters,
            key: row.interfaceKey,
          },
          page: undefined,
        },
        evidence: [evidence],
        route: route(NavigationPlane.Semantic, NavigationRelation.ProjectionOf, [BasisKind.TypeScriptChecker], "Default provider atoms for one DI key."),
      });
    }
  }
  return continuations;
}

function relationshipContinuations(inquiry: Inquiry, rows: readonly FrameworkRelationshipAtom[], nextOffset: number | undefined, limit: number): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.di:relationships:next-page", "Continue DI relationship atoms.", nextOffset, limit));
  }
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForRelationship(row);
    continuations.push({
      id: `framework.di:relationships:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect the exact source for this DI relationship atom.",
      inquiry: {
        lens: LensId.TsSource,
        locus: sourceRangeLocus(row.source),
        projection: "text",
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Exact source for a DI relationship atom."),
    });
    if (row.key !== undefined) {
      continuations.push({
        id: `framework.di:relationships:key:${index}`,
        kind: ContinuationKind.Narrow,
        priority: ContinuationPriority.Secondary,
        rationale: "Stay in the DI lens and narrow to the same key expression.",
        inquiry: {
          ...inquiry,
          filters: {
            ...inquiry.filters,
            key: row.key,
          },
          page: undefined,
        },
        evidence: [evidence],
        route: route(NavigationPlane.Semantic, NavigationRelation.ProjectionOf, [BasisKind.TypeScriptChecker], "Narrow DI relationship atoms by key."),
      });
    }
  }
  return continuations;
}

function projectionContinuation(inquiry: Inquiry, id: string, projection: string, rationale: string): Continuation {
  return {
    id,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: {
      ...inquiry,
      projection,
      page: undefined,
    },
    route: route(NavigationPlane.Semantic, NavigationRelation.ProjectionOf, [BasisKind.TypeScriptChecker], rationale),
  };
}

function nextPageContinuation(inquiry: Inquiry, id: string, rationale: string, nextOffset: number, limit: number): Continuation {
  return {
    id,
    kind: ContinuationKind.NextPage,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: {
      ...inquiry,
      page: { size: limit, cursor: String(nextOffset) },
    },
    route: route(NavigationPlane.Addressing, NavigationRelation.NextPageOf, [], rationale),
  };
}

function sourceRangeLocus(range: SourceRange) {
  return {
    kind: LocusKind.SourceRange,
    range,
  } as const;
}

function pageInfo(inquiry: Inquiry, returned: number, total: number, limit: number, nextOffset: number | undefined) {
  return {
    size: limit,
    cursor: inquiry.page?.cursor,
    returned,
    total,
    ...(nextOffset === undefined ? {} : { nextCursor: String(nextOffset) }),
  };
}

function pageRows<TValue>(
  rows: readonly TValue[],
  offset: number,
  limit: number,
): { readonly rows: readonly TValue[]; readonly nextOffset?: number } {
  const page = rows.slice(offset, offset + limit);
  const nextOffset = offset + page.length < rows.length ? offset + page.length : undefined;
  return {
    rows: page,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

function pageOffset(inquiry: Inquiry): number {
  const cursor = inquiry.page?.cursor;
  if (cursor === undefined) {
    return 0;
  }
  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function evidenceLimit(inquiry: Inquiry): number {
  return clampBudget(inquiry.budget?.evidencePerSubject, 5, 20);
}

function frameworkDiBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.TypeScriptChecker,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary: "Answered from cached framework DI relationship atoms derived from Aurelia kernel source and checker-backed call facts.",
    identity: sourceProject.snapshot().identity,
  };
}

function route(
  plane: NavigationPlane,
  relation: NavigationRelation,
  basis: readonly BasisKind[],
  summary: string,
): NavigationRouteClaim {
  return { plane, relation, basis, summary };
}

function countBy<TValue>(rows: readonly TValue[], keyFor: (row: TValue) => string): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = keyFor(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}
