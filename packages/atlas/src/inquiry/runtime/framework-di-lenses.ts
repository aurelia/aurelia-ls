import {
  readFrameworkDiIndex,
  type FrameworkDiKeyRow,
} from "../../framework/di-index.js";
import {
  readFrameworkConfigurationDiWorld,
  FrameworkDiDependencyRow,
  FrameworkDiResolverSlot,
  FrameworkDiResourceSlot,
  FrameworkDiVariableDependencyRead,
} from "../../framework/di-world.js";
import {
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipAtom,
} from "../../framework/relationships.js";
import type { SourceProject } from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type Basis,
} from "../basis.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  OpenSeamKind,
  type Evidence,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import {
  NavigationPlane,
  NavigationRelation,
} from "../navigation.js";
import { evidenceLimit, pageInfo, pageOffset, pageRows, rowLimit } from "../paging.js";
import {
  FrameworkRowContinuationBuilder,
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";
import {
  readFrameworkDiGraph,
  type FrameworkDiGraphComponentRow,
  type FrameworkDiGraphEdgeRow,
  type FrameworkDiGraphValue,
} from "./framework-di-graph.js";
import { evidenceForDiRelationship } from "./framework-evidence.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { countBy, route } from "./framework-support.js";
import { stringFiltersFromRecord } from "./lens-filter-utils.js";

/** Value returned by framework.di. */
export interface FrameworkDiValue {
  /** DI relationship index schema version. */
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
  /** DI graph projection shaped after registration admission, container state, lookup, and materialization layers. */
  readonly diGraph?: FrameworkDiGraphValue;
  /** Configuration or bundle DI world projection from booted source values. */
  readonly configurationWorld?: FrameworkConfigurationDiWorldValue;
}

/** Value returned for framework.di world/dependency projections. */
export interface FrameworkConfigurationDiWorldValue {
  /** Package that owns the selected configuration or bundle export. */
  readonly packageId: string;
  /** Selected configuration or bundle export name. */
  readonly exportName: string;
  /** Stable owner label used by the abstract DI world. */
  readonly owner: string;
  /** Number of configuration/registry admissions. */
  readonly admissionCount: number;
  /** Number of modeled resolver slots. */
  readonly resolverSlotCount: number;
  /** Number of modeled resource slots. */
  readonly resourceSlotCount: number;
  /** Number of provider dependency edges. */
  readonly dependencyCount: number;
  /** Number of variable-carried provider dependency reads. */
  readonly variableDependencyCount: number;
  /** Number of open DI-world boundaries. */
  readonly openCount: number;
  /** Resolver slots returned by world/slots projections. */
  readonly resolverSlots?: readonly FrameworkDiResolverSlot[];
  /** Resource slots returned by world/slots projections. */
  readonly resourceSlots?: readonly FrameworkDiResourceSlot[];
  /** Dependency rows returned by dependency projections. */
  readonly dependencies?: readonly FrameworkDiDependencyRow[];
  /** Variable-carried dependency reads returned by dependency projections. */
  readonly variableDependencies?: readonly FrameworkDiVariableDependencyRead[];
}

const CHECKER_PROJECTION_BASIS = [BasisKind.TypeScriptChecker] as const;

interface FrameworkDiFilters {
  readonly packageId?: string;
  readonly relation?: string;
  readonly mechanism?: string;
  readonly phase?: string;
  readonly key?: string;
  readonly strategy?: string;
  readonly routeKind?: string;
  readonly nodeKind?: string;
  readonly edgeKind?: string;
  readonly dependencyKey?: string;
  readonly configurationPackageId?: string;
  readonly configurationExportName?: string;
  readonly query?: string;
}

const DI_KEY_ROW_FAMILY = new PagedRowFamily<FrameworkDiKeyRow>({
  id: "framework.di:keys",
  rowLabel: "framework DI key row(s)",
  evidenceForRow: evidenceForDiKey,
  continuationsForPage: diKeyContinuations,
});

const DI_RELATIONSHIP_ROW_FAMILY =
  new PagedRowFamily<FrameworkRelationshipAtom>({
    id: "framework.di:relationships",
    rowLabel: "framework DI relationship atom(s)",
    evidenceForRow: evidenceForDiRelationship,
    continuationsForPage: diRelationshipContinuations,
  });

const DI_GRAPH_EDGE_ROW_FAMILY = new PagedRowFamily<FrameworkDiGraphEdgeRow>({
  id: "framework.di:graph",
  rowLabel: "framework DI graph edge(s)",
  evidenceForRow: evidenceForDiGraphEdge,
  continuationsForPage: graphEdgeContinuations,
});

const DI_GRAPH_COMPONENT_ROW_FAMILY =
  new PagedRowFamily<FrameworkDiGraphComponentRow>({
    id: "framework.di:dag",
    rowLabel: "framework DI dependency component(s)",
    evidenceForRow: evidenceForDiGraphComponent,
    continuationsForPage: graphComponentContinuations,
  });

/** Answer framework.di inquiries from kernel DI relationship atoms. */
export function answerFrameworkDi(
  /** Inquiry being answered. */
  inquiry: Inquiry,
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
): Answer<FrameworkDiValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = frameworkDiFiltersFromInquiry(inquiry);
  const index = readFrameworkDiIndex(sourceProject);
  const keys = index.keys.filter((row) => diKeyMatches(row, filters));
  const relationships = diRelationshipProjectionRows(
    index.relationships,
    projection,
  ).filter((row) => diRelationshipMatches(row, filters));
  const limit = rowLimit(inquiry);
  const offset = pageOffset(inquiry);
  const basis = [frameworkDiBasis(sourceProject)];

  if (
    projection === "world" ||
    projection === "slots" ||
    projection === "dependencies"
  ) {
    const worldBasis = [
      frameworkDiBasis(sourceProject),
      frameworkDiWorldBasis(sourceProject),
    ];
    const worldPackageId = filters.configurationPackageId ?? filters.packageId ?? "runtime-html";
    const worldExportName = filters.configurationExportName ?? "StandardConfiguration";
    const world = readFrameworkConfigurationDiWorld(
      sourceProject,
      worldPackageId,
      worldExportName,
    );
    const rows = (projection === "dependencies"
      ? [...world.dependencies.filter(row => diWorldDependencyMatches(row, filters)),
         ...world.variableDependencies.filter(row => diWorldVariableDependencyMatches(row, filters))]
      : [...world.resolverSlots.filter(row => diWorldSlotMatches(row, filters)),
         ...world.resourceSlots.filter(row => diWorldResourceSlotMatches(row, filters))])
      .filter(row => {
        if (filters.packageId === undefined) return true;
        const file = row.source && sourceProject.readSourceFile(row.source.filePath);
        return file != null && sourceProject.sourceFileIdentity(file)?.packageId === filters.packageId;
      });
    const page = pageRows<typeof rows[number]>(rows, offset, limit);
    const evidence = page.rows.slice(0, evidenceLimit(inquiry)).map(row => {
      if (row instanceof FrameworkDiResolverSlot) return evidenceForDiWorldResolverSlot(row);
      if (row instanceof FrameworkDiResourceSlot) return evidenceForDiWorldResourceSlot(row);
      return evidenceForDiWorldLookupSupport(row);
    });
    const outcome = world.opens.length === 0
      ? (rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit)
      : (rows.length === 0 ? OutcomeKind.Open : OutcomeKind.Partial);
    return createAnswer(
      inquiry,
      outcome,
      `Returned ${page.rows.length} of ${rows.length} matching ${projection === "dependencies" ? "dependency" : "slot"} row(s) from ${world.configurationExport}; ${world.opens.length} open configuration boundary(s).`,
      {
        value: {
          version: index.version,
          keyCount: keys.length,
          relationshipCount: relationships.length,
          relations: countBy(relationships, (row) => row.relation),
          mechanisms: countBy(relationships, (row) => row.mechanism),
          phases: countBy(relationships, (row) => row.phase),
          configurationWorld: {
            packageId: worldPackageId,
            exportName: worldExportName,
            owner: world.configurationExport,
            admissionCount: world.admissions.length,
            resolverSlotCount: world.resolverSlots.length,
            resourceSlotCount: world.resourceSlots.length,
            dependencyCount: world.dependencies.length,
            variableDependencyCount: world.variableDependencies.length,
            openCount: world.opens.length,
            ...(projection === "dependencies"
              ? {
                  dependencies: page.rows.filter(row => row instanceof FrameworkDiDependencyRow),
                  variableDependencies: page.rows.filter(row => row instanceof FrameworkDiVariableDependencyRead),
                }
              : {
                  resolverSlots: page.rows.filter(row => row instanceof FrameworkDiResolverSlot),
                  resourceSlots: page.rows.filter(row => row instanceof FrameworkDiResourceSlot),
                }),
          },
        },
        basis: worldBasis,
        evidence,
        openSeams: world.opens.slice(0, Math.max(1, evidenceLimit(inquiry))).map(open => ({
          id: open.id,
          kind: OpenSeamKind.InsufficientBasis,
          summary: open.reason,
          evidence: { kind: EvidenceKind.OpenSeam, role: EvidenceRole.Boundary, summary: open.reason, source: open.source },
        })),
        page: pageInfo(inquiry, page.rows.length, rows.length, limit, page.nextOffset),
        continuations: [
          ...(page.nextOffset === undefined ? [] : [
            nextPageContinuation(inquiry, `framework.di:${projection}:next-page`, "Read the next page of this DI world.", page.nextOffset, limit),
          ]),
          ...diWorldContinuations(inquiry, worldPackageId, worldExportName, filters),
        ],
      },
    );
  }

  if (projection === "graph") {
    const graph = readFrameworkDiGraph(sourceProject, filters);
    return DI_GRAPH_EDGE_ROW_FAMILY.answer({
      inquiry,
      rows: graph.edges,
      limit,
      offset,
      basis,
      value: (page) => ({
        version: index.version,
        keyCount: keys.length,
        relationshipCount: relationships.length,
        relations: countBy(relationships, (row) => row.relation),
        mechanisms: countBy(relationships, (row) => row.mechanism),
        phases: countBy(relationships, (row) => row.phase),
        diGraph: {
          ...graph.value,
          nodes: graph.nodes,
          edges: page.rows,
        },
      }),
      summary: (page) =>
        `Framework DI graph has ${graph.nodes.length} node(s), ${graph.edges.length} edge(s), and ${graph.components.length} dependency component(s); returned ${page.rows.length} edge row(s).`,
    });
  }

  if (projection === "dag") {
    const graph = readFrameworkDiGraph(sourceProject, filters);
    return DI_GRAPH_COMPONENT_ROW_FAMILY.answer({
      inquiry,
      rows: graph.components,
      limit,
      offset,
      basis,
      value: (page) => ({
        version: index.version,
        keyCount: keys.length,
        relationshipCount: relationships.length,
        relations: countBy(relationships, (row) => row.relation),
        mechanisms: countBy(relationships, (row) => row.mechanism),
        phases: countBy(relationships, (row) => row.phase),
        diGraph: {
          ...graph.value,
          components: page.rows,
        },
      }),
      summary: (page) =>
        `Framework DI dependency DAG has ${graph.components.length} component(s), including ${graph.value.cyclicComponentCount} cyclic component(s); returned ${page.rows.length} component row(s).`,
    });
  }

  if (projection === "keys") {
    return DI_KEY_ROW_FAMILY.answer({
      inquiry,
      rows: keys,
      limit,
      offset,
      basis,
      value: (page) => ({
        version: index.version,
        keyCount: keys.length,
        relationshipCount: relationships.length,
        relations: index.rollup.relations,
        mechanisms: index.rollup.mechanisms,
        phases: index.rollup.phases,
        keys: page.rows,
      }),
    });
  }

  if (
    projection === "facts" ||
    projection === "relationships" ||
    projection === "registrations" ||
    projection === "providers" ||
    projection === "lookups" ||
    projection === "materializations" ||
    projection === "evidence"
  ) {
    return DI_RELATIONSHIP_ROW_FAMILY.answer({
      inquiry,
      rows: relationships,
      limit,
      offset,
      basis,
      value: (page) => ({
        version: index.version,
        keyCount: keys.length,
        relationshipCount: relationships.length,
        relations: countBy(relationships, (row) => row.relation),
        mechanisms: countBy(relationships, (row) => row.mechanism),
        phases: countBy(relationships, (row) => row.phase),
        relationships: page.rows,
      }),
    });
  }

  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Framework DI index has ${keys.length} DI key row(s) and ${relationships.length} relationship atom(s).`,
    {
      value: {
        version: index.version,
        keyCount: keys.length,
        relationshipCount: relationships.length,
        relations: countBy(relationships, (row) => row.relation),
        mechanisms: countBy(relationships, (row) => row.mechanism),
        phases: countBy(relationships, (row) => row.phase),
      },
      basis,
      evidence: [
        ...keys.slice(0, 2).map(evidenceForDiKey),
        ...relationships.slice(0, 4).map(evidenceForDiRelationship),
      ],
      continuations: diSummaryContinuations(inquiry),
    },
  );
}

function diRelationshipProjectionRows(
  rows: readonly FrameworkRelationshipAtom[],
  projection: string,
): readonly FrameworkRelationshipAtom[] {
  switch (projection) {
    case "registrations":
      return rows.filter(
        (row) =>
          row.phase === FrameworkRelationshipPhase.Registration ||
          row.relation === FrameworkRelationshipRelation.CreatesRegistration ||
          row.relation === FrameworkRelationshipRelation.CreatesResolver ||
          row.relation === FrameworkRelationshipRelation.RegistersProvider ||
          row.relation === FrameworkRelationshipRelation.ProvidesKey ||
          row.relation === FrameworkRelationshipRelation.StoresResolverSlot ||
          row.relation === FrameworkRelationshipRelation.StoresResourceSlot ||
          row.relation === FrameworkRelationshipRelation.AliasesKey ||
          row.relation === FrameworkRelationshipRelation.InvokesRegistry,
      );
    case "providers":
      return rows.filter(
        (row) =>
          row.relation === FrameworkRelationshipRelation.ProvidesKey ||
          (row.relation === FrameworkRelationshipRelation.AliasesKey &&
            row.to.kind === FrameworkRelationshipEndpointKind.Expression) ||
          row.relation === FrameworkRelationshipRelation.RegistersProvider,
      );
    case "lookups":
      return rows.filter(
        (row) =>
          row.phase === FrameworkRelationshipPhase.Lookup ||
          row.phase === FrameworkRelationshipPhase.Resolution ||
          row.relation === FrameworkRelationshipRelation.LooksUpKey ||
          row.relation === FrameworkRelationshipRelation.ResolvesKey ||
          row.relation === FrameworkRelationshipRelation.DelegatesLookup,
      );
    case "materializations":
      return rows.filter(
        (row) =>
          row.phase === FrameworkRelationshipPhase.Materialization ||
          row.relation === FrameworkRelationshipRelation.MaterializesKey ||
          row.relation === FrameworkRelationshipRelation.ConstructsInstance ||
          row.relation === FrameworkRelationshipRelation.CreatesFactory,
      );
    default:
      return rows;
  }
}

function frameworkDiFiltersFromInquiry(inquiry: Inquiry): FrameworkDiFilters {
  return {
    ...frameworkDiFiltersFromRecord(inquiry.subject),
    ...frameworkDiFiltersFromRecord(inquiry.filters),
  };
}

const frameworkDiFilterKeys = [
  "packageId",
  "relation",
  "mechanism",
  "phase",
  "key",
  "strategy",
  "routeKind",
  "nodeKind",
  "edgeKind",
  "dependencyKey",
  "configurationPackageId",
  "configurationExportName",
  "query",
] as const satisfies readonly (keyof FrameworkDiFilters & string)[];

function frameworkDiFiltersFromRecord(value: unknown): FrameworkDiFilters {
  return stringFiltersFromRecord<FrameworkDiFilters>(value, frameworkDiFilterKeys);
}

function diKeyMatches(
  row: FrameworkDiKeyRow,
  filters: FrameworkDiFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.key === undefined ||
      row.interfaceKey === filters.key ||
      row.exportName === filters.key) &&
    (filters.query === undefined ||
      row.exportName.includes(filters.query) ||
      row.interfaceKey.includes(filters.query) ||
      row.packageId.includes(filters.query))
  );
}

function diRelationshipMatches(
  row: FrameworkRelationshipAtom,
  filters: FrameworkDiFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.relation === undefined || row.relation === filters.relation) &&
    (filters.mechanism === undefined || row.mechanism === filters.mechanism) &&
    (filters.phase === undefined || row.phase === filters.phase) &&
    (filters.key === undefined ||
      row.key === filters.key ||
      row.from.name === filters.key ||
      row.to.name === filters.key) &&
    (filters.strategy === undefined || row.strategy === filters.strategy) &&
    (filters.query === undefined ||
      row.summary.includes(filters.query) ||
      row.from.name.includes(filters.query) ||
      row.to.name.includes(filters.query) ||
      row.key?.includes(filters.query) === true ||
      row.value?.includes(filters.query) === true)
  );
}

function diWorldSlotMatches(
  row: FrameworkDiResolverSlot,
  filters: FrameworkDiFilters,
): boolean {
  return (
    (filters.key === undefined ||
      row.key.name === filters.key ||
      row.provider.name === filters.key) &&
    (filters.strategy === undefined || row.strategy === filters.strategy) &&
    (filters.query === undefined ||
      row.summary.includes(filters.query) ||
      row.key.name.includes(filters.query) ||
      row.provider.name.includes(filters.query))
  );
}

function diWorldResourceSlotMatches(
  row: FrameworkDiResourceSlot,
  filters: FrameworkDiFilters,
): boolean {
  return (
    (filters.key === undefined ||
      row.key.name === filters.key ||
      row.resource.name === filters.key) &&
    (filters.query === undefined ||
      row.summary.includes(filters.query) ||
      row.key.name.includes(filters.query) ||
      row.resource.name.includes(filters.query))
  );
}

function diWorldDependencyMatches(
  row: FrameworkDiDependencyRow,
  filters: FrameworkDiFilters,
): boolean {
  return (
    (filters.key === undefined ||
      row.ownerKey.name === filters.key ||
      row.ownerProvider.name === filters.key) &&
    (filters.dependencyKey === undefined ||
      row.dependencyKey.name === filters.dependencyKey) &&
    (filters.query === undefined ||
      row.summary.includes(filters.query) ||
      row.ownerKey.name.includes(filters.query) ||
      row.ownerProvider.name.includes(filters.query) ||
      row.dependencyKey.name.includes(filters.query))
  );
}

function diWorldVariableDependencyMatches(
  row: FrameworkDiVariableDependencyRead,
  filters: FrameworkDiFilters,
): boolean {
  return (
    (filters.key === undefined ||
      row.ownerKey.name === filters.key ||
      row.ownerProvider.name === filters.key) &&
    (filters.dependencyKey === undefined ||
      row.variableKey.expressionText === filters.dependencyKey ||
      row.variableKey.symbolName === filters.dependencyKey) &&
    (filters.query === undefined ||
      row.summary.includes(filters.query) ||
      row.ownerKey.name.includes(filters.query) ||
      row.ownerProvider.name.includes(filters.query) ||
      row.variableKey.expressionText.includes(filters.query) ||
      row.variableKey.symbolName?.includes(filters.query) === true ||
      row.variableKey.checkerType?.includes(filters.query) === true)
  );
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

function evidenceForDiWorldResolverSlot(
  row: FrameworkDiResolverSlot,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.DiRegistration,
    role: EvidenceRole.Support,
    confidence: EvidenceConfidence.Strong,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function evidenceForDiWorldResourceSlot(
  row: FrameworkDiResourceSlot,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.ResourceDefinition,
    role: EvidenceRole.Support,
    confidence: EvidenceConfidence.Strong,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function evidenceForDiWorldLookupSupport(
  row: FrameworkDiDependencyRow | FrameworkDiVariableDependencyRead,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.DiLookup,
    role: EvidenceRole.Support,
    confidence: EvidenceConfidence.Strong,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function diSummaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    projectionContinuation(
      inquiry,
      "framework.di:keys",
      "keys",
      "Inspect DI InterfaceSymbol keys before following provider and lookup mechanics.",
      { basis: CHECKER_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.di:registrations",
      "registrations",
      "Inspect provider and resolver registration mechanics in kernel DI.",
      { basis: CHECKER_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.di:providers",
      "providers",
      "Inspect DI key provider and alias targets where Atlas can see them exactly.",
      { basis: CHECKER_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.di:lookups",
      "lookups",
      "Inspect lookup and resolution mechanics in kernel DI.",
      { basis: CHECKER_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.di:graph",
      "graph",
      "Inspect registration, slot, lookup, materialization, and dependency edges as one typed DI graph.",
      { basis: CHECKER_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.di:world",
      "world",
      "Inspect a selected configuration or bundle as a spent DI world derived from booted framework source values.",
      { basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker] },
    ),
    projectionContinuation(
      inquiry,
      "framework.di:dependencies",
      "dependencies",
      "Inspect provider dependency edges discovered after spending the selected configuration or bundle registrations.",
      { basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker] },
    ),
    projectionContinuation(
      inquiry,
      "framework.di:dag",
      "dag",
      "Inspect the SCC-collapsed DI key dependency graph.",
      { basis: CHECKER_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.di:materializations",
      "materializations",
      "Inspect the low-level construction and factory sites behind DI materialization.",
      { basis: CHECKER_PROJECTION_BASIS },
    ),
  ];
}

function diWorldContinuations(inquiry: Inquiry, packageId: string, exportName: string, filters: FrameworkDiFilters): readonly Continuation[] {
  const continuations = [
    projectionContinuation(
      inquiry,
      "framework.di:world",
      "world",
      "Inspect resolver and resource slots produced by configuration or bundle spending.",
      { basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker] },
    ),
    projectionContinuation(
      inquiry,
      "framework.di:dependencies",
      "dependencies",
      "Inspect provider dependency edges produced by the DI world scanner.",
      { basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker] },
    ),
  ];
  if (packageId === "runtime-html" && exportName === "StandardConfiguration") {
    continuations.push(projectionContinuation(
      inquiry,
      "framework.materialization:dependencies",
      "dependencies",
      "Inspect materialization evidence from StandardConfiguration and declared DI provider seeds.",
      {
        lens: LensId.FrameworkMaterialization,
        basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
        filters: {
          ...(filters.packageId ? { packageId: filters.packageId } : {}),
          ...(filters.key ? { key: filters.key } : {}),
          ...(filters.dependencyKey ? { dependencyKey: filters.dependencyKey } : {}),
        },
      },
    ));
  }
  return continuations;
}

function diKeyContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkDiKeyRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.di:keys:next-page",
        "Continue DI key rows.",
        nextOffset,
        limit,
      ),
    );
  }
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForDiKey(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.di:keys",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect the exact createInterface source for this DI key.",
        "Exact createInterface source for a DI key.",
        { basis: [BasisKind.SourceText] },
      ),
    );
    if (row.defaultRegistrationAtomIds.length > 0) {
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.di:keys:providers:${index}`,
          "providers",
          "Inspect the default provider registration attached to this InterfaceSymbol.",
          {
            filters: {
              ...inquiry.filters,
              key: row.interfaceKey,
            },
            evidence,
            basis: CHECKER_PROJECTION_BASIS,
            summary: "Default provider atoms for one DI key.",
          },
        ),
      );
    }
  }
  return continuations;
}

function evidenceForDiGraphEdge(row: FrameworkDiGraphEdgeRow): Evidence {
  return {
    id: row.id,
    kind:
      row.layer === "lookup" || row.layer === "resolution"
        ? EvidenceKind.DiLookup
        : row.layer === "admission" || row.layer === "container-state"
        ? EvidenceKind.DiRegistration
        : EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function evidenceForDiGraphComponent(
  row: FrameworkDiGraphComponentRow,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: row.summary,
    data: row,
  };
}

function graphEdgeContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkDiGraphEdgeRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.di:graph:next-page",
        "Continue DI graph edge rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.di:graph:dag",
      "dag",
      "Collapse key dependency and alias edges into DAG components.",
      { basis: CHECKER_PROJECTION_BASIS },
    ),
  );
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForDiGraphEdge(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.di:graph",
      index,
      evidence,
    );
    if (row.source !== undefined) {
      continuations.push(
        builder.source(
          "source",
          row.source,
          "Inspect source behind this DI graph edge.",
          "Source behind a DI graph edge.",
        ),
      );
    }
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.di:graph:key:${index}`,
        "graph",
        "Stay in the graph and narrow to the edge target name.",
        {
          filters: {
            ...inquiry.filters,
            key: row.toName,
          },
          evidence,
          basis: CHECKER_PROJECTION_BASIS,
        },
      ),
    );
  }
  return continuations;
}

function graphComponentContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkDiGraphComponentRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.di:dag:next-page",
        "Continue DI dependency component rows.",
        nextOffset,
        limit,
      ),
    );
  }
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const key = row.keyNames[0];
    if (key === undefined) {
      continue;
    }
    const evidence = evidenceForDiGraphComponent(row);
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.di:dag:graph:${index}`,
        "graph",
        "Inspect graph edges touching this dependency component key.",
        {
          filters: {
            ...inquiry.filters,
            key,
          },
          evidence,
          basis: CHECKER_PROJECTION_BASIS,
        },
      ),
    );
  }
  return continuations;
}

function diRelationshipContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkRelationshipAtom[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.di:relationships:next-page",
        "Continue DI relationship atoms.",
        nextOffset,
        limit,
      ),
    );
  }
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForDiRelationship(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.di:relationships",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect the exact source for this DI relationship atom.",
        "Exact source for a DI relationship atom.",
      ),
    );
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
        route: route(
          NavigationPlane.Semantic,
          NavigationRelation.RefinementOf,
          [BasisKind.TypeScriptChecker],
          "Narrow DI relationship atoms by key.",
        ),
      });
    }
  }
  return continuations;
}

function frameworkDiBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.TypeScriptChecker,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary:
      "Answered from framework DI relationship atoms derived from Aurelia kernel source and checker-backed call facts.",
    identity: sourceProject.snapshot().identity,
  };
}

function frameworkDiWorldBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.StaticEvaluator,
    closure: BasisClosure.Partial,
    authority: BasisAuthority.Evaluator,
    freshness: BasisFreshness.Live,
    summary:
      "Answered from linked framework source-module evaluation and abstract DI world spending.",
    identity: sourceProject.snapshot().identity,
  };
}
