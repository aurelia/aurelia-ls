import {
  FrameworkRelationshipMechanism,
  FrameworkRelationshipRelation,
} from "../../framework/relationships.js";
import type { SourceProject } from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import { clampBudget } from "../budget.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  type Evidence,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind, RepoRootLocus, type SourceRange } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
  type NavigationRouteClaim,
} from "../navigation.js";
import {
  FrameworkBindingEffectKind,
  type FrameworkBindingEffectRow,
  type FrameworkBindingSetupRow,
  type FrameworkObserverEntityRow,
} from "./framework-entities.js";
import {
  filtersFromInquiry,
  type FrameworkDiscoveryFilters,
} from "./framework-filters.js";
import {
  readFrameworkObservationFlowEntityLinks,
  readFrameworkObservationFlowSites,
  readFrameworkObservationInternalRelationships,
  readFrameworkObservationSurfaceMethods,
  type FrameworkObservationFlowEntityLinkRow,
  type FrameworkObservationFlowSiteRow,
  type FrameworkObservationInternalRelationshipRow,
  type FrameworkObservationSurfaceMethodRow,
} from "./framework-observation-internals.js";
import { readFrameworkObserverEntities } from "./framework-observer-entities.js";
import { readFrameworkBindingEffects, readFrameworkBindingSetups } from "./framework-rendering-graph.js";
import {
  readFrameworkRenderingRelationships,
  type FrameworkRenderingRelationshipRow,
} from "./framework-rendering-relationships.js";
import {
  checkerBasis,
  evidenceLimit,
  pageInfo,
  pageOffset,
  pageRows,
  sourceIndexBasis,
  sourceRangeFromFileSpan,
} from "./framework-support.js";

/** Value returned by framework.observation. */
export interface FrameworkObservationValue {
  readonly observerCount?: number;
  readonly bindingLookupCount?: number;
  readonly bindingSetupCount?: number;
  readonly relationshipCount?: number;
  readonly surfaceMethodCount?: number;
  readonly flowSiteCount?: number;
  readonly flowEntityLinkCount?: number;
  readonly observerKinds?: Readonly<Record<string, number>>;
  readonly observerCapabilities?: Readonly<Record<string, number>>;
  readonly bindingLookupNames?: Readonly<Record<string, number>>;
  readonly bindingSetupKinds?: Readonly<Record<string, number>>;
  readonly surfaceKinds?: Readonly<Record<string, number>>;
  readonly flowSiteKinds?: Readonly<Record<string, number>>;
  readonly flowEntityMatchBases?: Readonly<Record<string, number>>;
  readonly relationshipRelations?: Readonly<Record<string, number>>;
  readonly relationshipMechanisms?: Readonly<Record<string, number>>;
  readonly relationshipPhases?: Readonly<Record<string, number>>;
  readonly observers?: readonly FrameworkObserverEntityRow[];
  readonly bindingLookups?: readonly FrameworkBindingEffectRow[];
  readonly bindingSetups?: readonly FrameworkBindingSetupRow[];
  readonly surfaceMethods?: readonly FrameworkObservationSurfaceMethodRow[];
  readonly flowSites?: readonly FrameworkObservationFlowSiteRow[];
  readonly flowEntityLinks?: readonly FrameworkObservationFlowEntityLinkRow[];
  readonly relationships?: readonly FrameworkObservationRelationshipRow[];
}

interface FrameworkObservationFilters extends FrameworkDiscoveryFilters {
  readonly surfaceKind?: string;
  readonly siteKind?: string;
  readonly methodName?: string;
  readonly targetName?: string;
  readonly matchBasis?: string;
  readonly relation?: string;
  readonly mechanism?: string;
  readonly phase?: string;
}

type FrameworkObservationRelationshipRow =
  | FrameworkRenderingRelationshipRow
  | FrameworkObservationInternalRelationshipRow;

interface FrameworkObservationRollupInput {
  readonly observers?: readonly FrameworkObserverEntityRow[];
  readonly bindingLookups?: readonly FrameworkBindingEffectRow[];
  readonly bindingSetups?: readonly FrameworkBindingSetupRow[];
  readonly surfaceMethods?: readonly FrameworkObservationSurfaceMethodRow[];
  readonly flowSites?: readonly FrameworkObservationFlowSiteRow[];
  readonly flowEntityLinks?: readonly FrameworkObservationFlowEntityLinkRow[];
  readonly relationships?: readonly FrameworkObservationRelationshipRow[];
}

/** Answer framework.observation inquiries from observer entities and binding observer rows. */
export function answerFrameworkObservation(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<FrameworkObservationValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = observationFiltersFromInquiry(inquiry);
  const limit = clampBudget(inquiry.budget?.rows, 80, 1_000);
  const offset = pageOffset(inquiry);

  switch (projection) {
    case "entities": {
      const observers = readFrameworkObserverEntities(sourceProject, filters);
      return observationPageAnswer(
        inquiry,
        sourceProject,
        observationBaseValue({ observers }),
        observers,
        offset,
        limit,
        "observers",
        "framework observer entity row(s)",
        evidenceForObserverEntity,
        entityContinuations,
      );
    }
    case "binding-lookups": {
      const bindingLookups = readFrameworkBindingEffects(sourceProject, {
        ...filters,
        effectKind: FrameworkBindingEffectKind.ObserverLookup,
      });
      return observationPageAnswer(
        inquiry,
        sourceProject,
        observationBaseValue({ bindingLookups }),
        bindingLookups,
        offset,
        limit,
        "bindingLookups",
        "framework binding observer lookup row(s)",
        evidenceForBindingLookup,
        bindingLookupContinuations,
      );
    }
    case "binding-setups": {
      const bindingSetups = readFrameworkBindingSetups(sourceProject, filters);
      return observationPageAnswer(
        inquiry,
        sourceProject,
        observationBaseValue({ bindingSetups }),
        bindingSetups,
        offset,
        limit,
        "bindingSetups",
        "framework binding observation setup row(s)",
        evidenceForBindingSetup,
        bindingSetupContinuations,
      );
    }
    case "surface-methods": {
      const surfaceMethods = readFrameworkObservationSurfaceMethods(
        sourceProject,
        filters,
      );
      return observationPageAnswer(
        inquiry,
        sourceProject,
        observationBaseValue({ surfaceMethods }),
        surfaceMethods,
        offset,
        limit,
        "surfaceMethods",
        "framework observation surface method row(s)",
        evidenceForSurfaceMethod,
        surfaceMethodContinuations,
      );
    }
    case "flow-sites": {
      const flowSites = readFrameworkObservationFlowSites(
        sourceProject,
        filters,
      );
      return observationPageAnswer(
        inquiry,
        sourceProject,
        observationBaseValue({ flowSites }),
        flowSites,
        offset,
        limit,
        "flowSites",
        "framework observation flow site row(s)",
        evidenceForFlowSite,
        flowSiteContinuations,
      );
    }
    case "flow-entity-links": {
      const flowEntityLinks = readFrameworkObservationFlowEntityLinks(
        sourceProject,
        filters,
      );
      return observationPageAnswer(
        inquiry,
        sourceProject,
        observationBaseValue({ flowEntityLinks }),
        flowEntityLinks,
        offset,
        limit,
        "flowEntityLinks",
        "framework observation flow-to-entity link row(s)",
        evidenceForFlowEntityLink,
        flowEntityLinkContinuations,
      );
    }
    case "relationships": {
      const relationships = readObservationRelationships(sourceProject, filters);
      return observationPageAnswer(
        inquiry,
        sourceProject,
        observationBaseValue({ relationships }),
        relationships,
        offset,
        limit,
        "relationships",
        "framework observation relationship row(s)",
        evidenceForObservationRelationship,
        relationshipContinuations,
      );
    }
    case "summary":
    default: {
      const observers = readFrameworkObserverEntities(sourceProject, filters);
      const bindingLookups = readFrameworkBindingEffects(sourceProject, {
        ...filters,
        effectKind: FrameworkBindingEffectKind.ObserverLookup,
      });
      const bindingSetups = readFrameworkBindingSetups(sourceProject, filters);
      const surfaceMethods = readFrameworkObservationSurfaceMethods(
        sourceProject,
        filters,
      );
      const flowSites = readFrameworkObservationFlowSites(
        sourceProject,
        filters,
      );
      const flowEntityLinks = readFrameworkObservationFlowEntityLinks(
        sourceProject,
        filters,
      );
      const relationships = readObservationRelationships(sourceProject, filters);
      const baseValue = observationBaseValue({
        observers,
        bindingLookups,
        bindingSetups,
        surfaceMethods,
        flowSites,
        flowEntityLinks,
        relationships,
      });
      return createAnswer(
        inquiry,
        OutcomeKind.Hit,
        `Framework observation index has ${observers.length} observer entity row(s), ${bindingLookups.length} binding lookup row(s), ${bindingSetups.length} binding setup row(s), ${surfaceMethods.length} observation surface method row(s), ${flowSites.length} flow site row(s), ${flowEntityLinks.length} flow-to-entity link row(s), and ${relationships.length} relationship row(s).`,
        {
          value: baseValue,
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: [
            ...observers.slice(0, 2).map(evidenceForObserverEntity),
            ...bindingLookups.slice(0, 2).map(evidenceForBindingLookup),
            ...flowSites.slice(0, 2).map(evidenceForFlowSite),
            ...flowEntityLinks.slice(0, 2).map(evidenceForFlowEntityLink),
            ...relationships.slice(0, 2).map(evidenceForObservationRelationship),
          ],
          continuations: summaryContinuations(inquiry),
        },
      );
    }
  }
}

function observationPageAnswer<TRow>(
  inquiry: Inquiry,
  sourceProject: SourceProject,
  baseValue: FrameworkObservationValue,
  rows: readonly TRow[],
  offset: number,
  limit: number,
  key:
    | "observers"
    | "bindingLookups"
    | "bindingSetups"
    | "surfaceMethods"
    | "flowSites"
    | "flowEntityLinks"
    | "relationships",
  label: string,
  evidenceForRow: (row: TRow) => Evidence,
  continuationsForRows: (
    inquiry: Inquiry,
    rows: readonly TRow[],
    nextOffset: number | undefined,
    limit: number,
  ) => readonly Continuation[],
): Answer<FrameworkObservationValue> {
  const page = pageRows(rows, offset, limit);
  return createAnswer(
    inquiry,
    page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Returned ${page.rows.length} of ${rows.length} ${label}.`,
    {
      value: {
        ...baseValue,
        [key]: page.rows,
      } as FrameworkObservationValue,
      basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForRow),
      page: pageInfo(
        inquiry,
        page.rows.length,
        rows.length,
        limit,
        page.nextOffset,
      ),
      continuations: continuationsForRows(
        inquiry,
        page.rows,
        page.nextOffset,
        limit,
      ),
    },
  );
}

function observationBaseValue(
  input: FrameworkObservationRollupInput,
): FrameworkObservationValue {
  const {
    observers,
    bindingLookups,
    bindingSetups,
    surfaceMethods,
    flowSites,
    flowEntityLinks,
    relationships,
  } = input;
  return {
    ...(observers === undefined
      ? {}
      : {
          observerCount: observers.length,
          observerKinds: countBy(observers.flatMap((row) => row.observerKinds)),
          observerCapabilities: countBy(
            observers.flatMap((row) => row.observerCapabilities),
          ),
        }),
    ...(bindingLookups === undefined
      ? {}
      : {
          bindingLookupCount: bindingLookups.length,
          bindingLookupNames: countBy(
            bindingLookups.map((row) => row.effectName),
          ),
        }),
    ...(bindingSetups === undefined
      ? {}
      : {
          bindingSetupCount: bindingSetups.length,
          bindingSetupKinds: countBy(bindingSetups.map((row) => row.setupKind)),
        }),
    ...(surfaceMethods === undefined
      ? {}
      : {
          surfaceMethodCount: surfaceMethods.length,
          surfaceKinds: countBy(surfaceMethods.map((row) => row.surfaceKind)),
        }),
    ...(flowSites === undefined
      ? {}
      : {
          flowSiteCount: flowSites.length,
          flowSiteKinds: countBy(flowSites.map((row) => row.siteKind)),
        }),
    ...(flowEntityLinks === undefined
      ? {}
      : {
          flowEntityLinkCount: flowEntityLinks.length,
          flowEntityMatchBases: countBy(
            flowEntityLinks.map((row) => row.matchBasis),
          ),
        }),
    ...(relationships === undefined
      ? {}
      : {
          relationshipCount: relationships.length,
          relationshipRelations: countBy(
            relationships.map((row) => row.relation),
          ),
          relationshipMechanisms: countBy(
            relationships.map((row) => row.mechanism),
          ),
          relationshipPhases: countBy(relationships.map((row) => row.phase)),
        }),
  };
}

function readObservationRelationships(
  sourceProject: SourceProject,
  filters: FrameworkObservationFilters,
): readonly FrameworkObservationRelationshipRow[] {
  const internalRelationships = shouldReadInternalObservationRelationships(
    filters,
  )
    ? readFrameworkObservationInternalRelationships(sourceProject, filters)
    : [];
  const renderingRelationships = shouldReadRenderingObservationRelationships(
    filters,
  )
    ? readFrameworkRenderingRelationships(sourceProject, filters).filter(
        isObservationRelationship,
      )
    : [];
  return [...renderingRelationships, ...internalRelationships];
}

function shouldReadInternalObservationRelationships(
  filters: FrameworkObservationFilters,
): boolean {
  return (
    filters.mechanism === undefined ||
    internalObservationMechanisms.has(
      filters.mechanism as FrameworkRelationshipMechanism,
    )
  );
}

function shouldReadRenderingObservationRelationships(
  filters: FrameworkObservationFilters,
): boolean {
  if (
    filters.surfaceKind !== undefined ||
    filters.siteKind !== undefined ||
    filters.methodName !== undefined ||
    filters.matchBasis !== undefined
  ) {
    return false;
  }
  if (
    filters.relation !== undefined &&
    filters.relation !== FrameworkRelationshipRelation.LooksUpObserver &&
    filters.relation !== FrameworkRelationshipRelation.ConfiguresObservation
  ) {
    return false;
  }
  return (
    filters.mechanism === undefined ||
    renderingObservationMechanisms.has(
      filters.mechanism as FrameworkRelationshipMechanism,
    )
  );
}

const internalObservationMechanisms: ReadonlySet<FrameworkRelationshipMechanism> =
  new Set([
    FrameworkRelationshipMechanism.ObserverLocator,
    FrameworkRelationshipMechanism.NodeObserverLocator,
    FrameworkRelationshipMechanism.DirtyChecker,
    FrameworkRelationshipMechanism.Connectable,
    FrameworkRelationshipMechanism.CollectionObserver,
    FrameworkRelationshipMechanism.WatchDecorator,
    FrameworkRelationshipMechanism.WatchRegistry,
    FrameworkRelationshipMechanism.WatchMetadata,
    FrameworkRelationshipMechanism.Watcher,
    FrameworkRelationshipMechanism.Effect,
  ]);

const renderingObservationMechanisms: ReadonlySet<FrameworkRelationshipMechanism> =
  new Set([
    FrameworkRelationshipMechanism.ObserverLookup,
    FrameworkRelationshipMechanism.BindingSetup,
  ]);

function isObservationRelationship(
  row: FrameworkRenderingRelationshipRow,
): boolean {
  return (
    row.relation === FrameworkRelationshipRelation.LooksUpObserver ||
    row.relation === FrameworkRelationshipRelation.ConfiguresObservation
  );
}

function observationFiltersFromInquiry(
  inquiry: Inquiry,
): FrameworkObservationFilters {
  return {
    ...filtersFromInquiry(inquiry),
    ...axisFiltersFromRecord(inquiry.subject),
    ...axisFiltersFromRecord(inquiry.filters),
  };
}

function axisFiltersFromRecord(value: unknown): FrameworkObservationFilters {
  if (value === null || typeof value !== "object") {
    return {};
  }
  const source = value as Record<string, unknown>;
  return {
    ...stringFilter(source, "surfaceKind"),
    ...stringFilter(source, "siteKind"),
    ...stringFilter(source, "methodName"),
    ...stringFilter(source, "targetName"),
    ...stringFilter(source, "matchBasis"),
    ...stringFilter(source, "relation"),
    ...stringFilter(source, "mechanism"),
    ...stringFilter(source, "phase"),
  };
}

function stringFilter(
  source: Record<string, unknown>,
  key: keyof FrameworkObservationFilters,
): object {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}

function evidenceForObserverEntity(row: FrameworkObserverEntityRow): Evidence {
  const source = sourceForObserverEntity(row);
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: `${row.packageId}:${row.exportEntry.exportName} observer roles [${row.observerKinds.join(", ")}].`,
    ...(source === undefined ? {} : { source }),
    data: row,
  };
}

function evidenceForBindingLookup(row: FrameworkBindingEffectRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.bindingName}.${row.methodName} looks up observation through ${row.effectName}.`,
    source: row.source,
    data: row,
  };
}

function evidenceForBindingSetup(row: FrameworkBindingSetupRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${row.producerName} configures ${row.bindingName} observation through ${row.setupMethodName}.`,
    source: row.source,
    data: row,
  };
}

function evidenceForSurfaceMethod(
  row: FrameworkObservationSurfaceMethodRow,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function evidenceForFlowSite(row: FrameworkObservationFlowSiteRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function evidenceForFlowEntityLink(
  row: FrameworkObservationFlowEntityLinkRow,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence:
      row.matchBasis === "fully-qualified-name"
        ? EvidenceConfidence.Exact
        : EvidenceConfidence.Strong,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function evidenceForObservationRelationship(
  row: FrameworkObservationRelationshipRow,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function summaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    projectionContinuation(
      inquiry,
      "framework.observation:entities",
      "entities",
      "Inspect observer/reactivity entity rows.",
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:binding-lookups",
      "binding-lookups",
      "Inspect binding observer/accessor lookup rows.",
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:binding-setups",
      "binding-setups",
      "Inspect binding observation setup override rows.",
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:surface-methods",
      "surface-methods",
      "Inspect observer-locator, connectable, watcher, effect, registry, and metadata surface methods.",
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:flow-sites",
      "flow-sites",
      "Inspect source-backed observation flow sites inside locator, dirty-checker, and connectable surfaces.",
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:flow-entity-links",
      "flow-entity-links",
      "Inspect flow-site targets linked back to public observer entity rows.",
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:relationships",
      "relationships",
      "Inspect normalized observation relationships.",
    ),
  ];
}

function entityContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObserverEntityRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...observerEntitySourceContinuations(
      inquiry,
      rows,
      nextOffset,
      limit,
      "framework.observation:entities",
      "Continue observer entity rows.",
      "Inspect observer entity source.",
    ),
    ...rows.slice(0, 3).map((row, index) =>
      observerEntityFlowLinksContinuation(
        row,
        index,
        evidenceForObserverEntity(row),
      ),
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:entities:lookups",
      "binding-lookups",
      "Jump from observer entities to binding lookup consumers.",
    ),
  ];
}

function bindingLookupContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkBindingEffectRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...sourceContinuations(
      inquiry,
      rows,
      nextOffset,
      limit,
      "framework.observation:binding-lookups",
      "Continue binding observer lookup rows.",
      "Inspect binding observer lookup source.",
    ),
    ...rows.slice(0, 3).map((row, index) =>
      observerCapabilityContinuation(
        row.effectName,
        index,
        evidenceForBindingLookup(row),
      ),
    ),
    ...rows.slice(0, 3).map((row, index) =>
      observerLookupFlowContinuation(
        row,
        index,
        evidenceForBindingLookup(row),
      ),
    ),
    ...rows.slice(0, 3).map((row, index) =>
      observerLookupEntityLinkContinuation(
        row,
        index,
        evidenceForBindingLookup(row),
      ),
    ),
  ];
}

function bindingSetupContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkBindingSetupRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return sourceContinuations(
    inquiry,
    rows,
    nextOffset,
    limit,
    "framework.observation:binding-setups",
    "Continue binding observation setup rows.",
    "Inspect binding observation setup source.",
  );
}

function surfaceMethodContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObservationSurfaceMethodRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return sourceContinuations(
    inquiry,
    rows,
    nextOffset,
    limit,
    "framework.observation:surface-methods",
    "Continue observation surface method rows.",
    "Inspect observation surface method source.",
  );
}

function flowSiteContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObservationFlowSiteRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return [
    ...sourceContinuations(
      inquiry,
      rows,
      nextOffset,
      limit,
      "framework.observation:flow-sites",
      "Continue observation flow site rows.",
      "Inspect observation flow site source.",
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:flow-sites:entity-links",
      "flow-entity-links",
      "Jump from observation flow sites to public observer entity links.",
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:flow-sites:relationships",
      "relationships",
      "Jump from observation flow sites to normalized observation relationships.",
    ),
  ];
}

function flowEntityLinkContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObservationFlowEntityLinkRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [
    ...sourceContinuations(
      inquiry,
      rows,
      nextOffset,
      limit,
      "framework.observation:flow-entity-links",
      "Continue observation flow-to-entity link rows.",
      "Inspect observation flow site source.",
    ),
  ];
  for (const [index, row] of rows.slice(0, 3).entries()) {
    continuations.push({
      id: `framework.observation:flow-entity-links:entity:${index}`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Jump to the public observer entity row linked from this flow site.",
      inquiry: {
        lens: LensId.FrameworkObservation,
        locus: RepoRootLocus,
        projection: "entities",
        filters: {
          packageId: row.entityPackageId,
          exportName: row.entityExportName,
        },
        page: undefined,
      },
      route: route(
        NavigationPlane.Semantic,
        NavigationRelation.FrameworkFlowOf,
        "Observation flow-to-entity link back to observer entity catalog.",
      ),
    });
    if (row.entitySource === undefined) {
      continue;
    }
    continuations.push({
      id: `framework.observation:flow-entity-links:entity-source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect the public observer entity declaration linked from this flow site.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.entitySource },
        projection: "text",
      },
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        "Source for linked observer entity declaration.",
      ),
    });
  }
  return continuations;
}

function relationshipContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObservationRelationshipRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  return sourceContinuations(
    inquiry,
    rows,
    nextOffset,
    limit,
    "framework.observation:relationships",
    "Continue observation relationship rows.",
    "Inspect observation relationship source.",
  );
}

function observerCapabilityContinuation(
  effectName: string,
  index: number,
  evidence: Evidence,
): Continuation {
  return {
    id: `framework.observation:binding-lookups:observer-capability:${index}`,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale:
      "Inspect observer entities with the capability implied by this binding lookup.",
    inquiry: {
      lens: LensId.FrameworkObservation,
      locus: RepoRootLocus,
      projection: "entities",
      filters: { observerCapability: observerCapabilityForLookup(effectName) },
      page: undefined,
    },
    evidence: [evidence],
    route: route(
      NavigationPlane.Semantic,
      NavigationRelation.FrameworkFlowOf,
      "Binding observer lookup to observer capability catalog.",
    ),
  };
}

function observerEntityFlowLinksContinuation(
  row: FrameworkObserverEntityRow,
  index: number,
  evidence: Evidence,
): Continuation {
  return {
    id: `framework.observation:entities:flow-entity-links:${index}`,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Primary,
    rationale:
      "Inspect observation subsystem flow sites linked to this public observer entity.",
    inquiry: {
      lens: LensId.FrameworkObservation,
      locus: RepoRootLocus,
      projection: "flow-entity-links",
      filters: {
        exportName: row.exportEntry.exportName,
      },
      page: undefined,
    },
    evidence: [evidence],
    route: route(
      NavigationPlane.Semantic,
      NavigationRelation.FrameworkFlowOf,
      "Observer entity catalog to observation subsystem flow links.",
    ),
  };
}

function observerLookupFlowContinuation(
  row: FrameworkBindingEffectRow,
  index: number,
  evidence: Evidence,
): Continuation {
  return {
    id: `framework.observation:binding-lookups:flow-sites:${index}`,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Primary,
    rationale:
      "Jump from a binding observer lookup API to matching observation subsystem flow sites.",
    inquiry: {
      lens: LensId.FrameworkObservation,
      locus: RepoRootLocus,
      projection: "flow-sites",
      filters: { methodName: row.effectName },
      page: undefined,
    },
    evidence: [evidence],
    route: route(
      NavigationPlane.Semantic,
      NavigationRelation.FrameworkFlowOf,
      "Binding observer lookup to ObserverLocator flow sites.",
    ),
  };
}

function observerLookupEntityLinkContinuation(
  row: FrameworkBindingEffectRow,
  index: number,
  evidence: Evidence,
): Continuation {
  return {
    id: `framework.observation:binding-lookups:flow-entity-links:${index}`,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale:
      "Jump from a binding observer lookup API to linked observer entity rows inside the observation subsystem.",
    inquiry: {
      lens: LensId.FrameworkObservation,
      locus: RepoRootLocus,
      projection: "flow-entity-links",
      filters: { methodName: row.effectName },
      page: undefined,
    },
    evidence: [evidence],
    route: route(
      NavigationPlane.Semantic,
      NavigationRelation.FrameworkFlowOf,
      "Binding observer lookup to observer entity links.",
    ),
  };
}

function observerEntitySourceContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkObserverEntityRow[],
  nextOffset: number | undefined,
  limit: number,
  idPrefix: string,
  nextPageRationale: string,
  sourceRationale: string,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push({
      id: `${idPrefix}:next-page`,
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Secondary,
      rationale: nextPageRationale,
      inquiry: {
        ...inquiry,
        page: { size: limit, cursor: String(nextOffset) },
      },
    });
  }
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const source = sourceForObserverEntity(row);
    if (source === undefined) {
      continue;
    }
    continuations.push({
      id: `${idPrefix}:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: sourceRationale,
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "text",
      },
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        "Source for observer entity row.",
      ),
    });
  }
  return continuations;
}

function sourceForObserverEntity(
  row: FrameworkObserverEntityRow,
): SourceRange | undefined {
  const target = row.exportEntry.targets[0];
  if (target?.file === undefined || target.span === undefined) {
    return undefined;
  }
  return sourceRangeFromFileSpan(target.file.repoPath, target.span);
}

function observerCapabilityForLookup(effectName: string): string {
  switch (effectName) {
    case "getAccessor":
      return "locate-accessor";
    case "getArrayObserver":
    case "getMapObserver":
    case "getSetObserver":
      return "locate-collection-observer";
    default:
      return "locate-observer";
  }
}

function sourceContinuations<TRow extends { readonly source: SourceRange }>(
  inquiry: Inquiry,
  rows: readonly TRow[],
  nextOffset: number | undefined,
  limit: number,
  idPrefix: string,
  nextPageRationale: string,
  sourceRationale: string,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push({
      id: `${idPrefix}:next-page`,
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Secondary,
      rationale: nextPageRationale,
      inquiry: {
        ...inquiry,
        page: { size: limit, cursor: String(nextOffset) },
      },
    });
  }
  for (const [index, row] of rows.slice(0, 3).entries()) {
    continuations.push({
      id: `${idPrefix}:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: sourceRationale,
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: row.source },
        projection: "text",
      },
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        "Source for observation row.",
      ),
    });
  }
  return continuations;
}

function projectionContinuation(
  inquiry: Inquiry,
  id: string,
  projection: string,
  rationale: string,
): Continuation {
  return {
    id,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: { ...inquiry, projection, page: undefined },
    route: route(
      NavigationPlane.Semantic,
      NavigationRelation.ProjectionOf,
      `framework.observation:${projection}`,
    ),
  };
}

function route(
  plane: NavigationPlane,
  relation: NavigationRelation,
  summary: string,
): NavigationRouteClaim {
  return { plane, relation, basis: [], summary };
}

function countBy(values: readonly string[]): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}
