import {
  FrameworkRelationshipMechanism,
  FrameworkRelationshipRelation,
} from "../../framework/relationships.js";
import type { SourceProject } from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
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
import { RepoRootLocus, type SourceRange } from "../locus.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { pageOffset, rowLimit } from "../paging.js";
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
  countBy,
  sourceIndexBasis,
  sourceRangeFromFileSpan,
} from "./framework-support.js";
import { evidenceForObserverEntity } from "./framework-evidence.js";
import {
  FrameworkRowContinuationBuilder,
  FrameworkSemanticRouteBuilder,
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";
import { FrameworkSemanticRoutes } from "./framework-route-catalog.js";
import { stringFilter } from "./lens-filter-utils.js";

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

export interface FrameworkObservationFilters extends FrameworkDiscoveryFilters {
  readonly surfaceKind?: string;
  readonly siteKind?: string;
  readonly methodName?: string;
  readonly targetName?: string;
  readonly matchBasis?: string;
  readonly relation?: string;
  readonly mechanism?: string;
  readonly phase?: string;
}

export type FrameworkObservationRelationshipRow =
  | FrameworkRenderingRelationshipRow
  | FrameworkObservationInternalRelationshipRow;

interface FrameworkObservationRollupParts {
  readonly observers?: readonly FrameworkObserverEntityRow[];
  readonly bindingLookups?: readonly FrameworkBindingEffectRow[];
  readonly bindingSetups?: readonly FrameworkBindingSetupRow[];
  readonly surfaceMethods?: readonly FrameworkObservationSurfaceMethodRow[];
  readonly flowSites?: readonly FrameworkObservationFlowSiteRow[];
  readonly flowEntityLinks?: readonly FrameworkObservationFlowEntityLinkRow[];
  readonly relationships?: readonly FrameworkObservationRelationshipRow[];
}

const OBSERVATION_ENTITY_ROW_FAMILY =
  new PagedRowFamily<FrameworkObserverEntityRow>({
    id: "framework.observation:entities",
    rowLabel: "framework observer entity row(s)",
    evidenceForRow: evidenceForObserverEntity,
    continuationsForPage: entityContinuations,
  });

const OBSERVATION_BINDING_LOOKUP_ROW_FAMILY =
  new PagedRowFamily<FrameworkBindingEffectRow>({
    id: "framework.observation:binding-lookups",
    rowLabel: "framework binding observer lookup row(s)",
    evidenceForRow: evidenceForBindingLookup,
    continuationsForPage: bindingLookupContinuations,
  });

const OBSERVATION_BINDING_SETUP_ROW_FAMILY =
  new PagedRowFamily<FrameworkBindingSetupRow>({
    id: "framework.observation:binding-setups",
    rowLabel: "framework binding observation setup row(s)",
    evidenceForRow: evidenceForObservationBindingSetup,
    continuationsForPage: observationBindingSetupContinuations,
  });

const OBSERVATION_SURFACE_METHOD_ROW_FAMILY =
  new PagedRowFamily<FrameworkObservationSurfaceMethodRow>({
    id: "framework.observation:surface-methods",
    rowLabel: "framework observation surface method row(s)",
    evidenceForRow: evidenceForSurfaceMethod,
    continuationsForPage: surfaceMethodContinuations,
  });

const OBSERVATION_FLOW_SITE_ROW_FAMILY =
  new PagedRowFamily<FrameworkObservationFlowSiteRow>({
    id: "framework.observation:flow-sites",
    rowLabel: "framework observation flow site row(s)",
    evidenceForRow: evidenceForFlowSite,
    continuationsForPage: flowSiteContinuations,
  });

const OBSERVATION_FLOW_ENTITY_LINK_ROW_FAMILY =
  new PagedRowFamily<FrameworkObservationFlowEntityLinkRow>({
    id: "framework.observation:flow-entity-links",
    rowLabel: "framework observation flow-to-entity link row(s)",
    evidenceForRow: evidenceForFlowEntityLink,
    continuationsForPage: flowEntityLinkContinuations,
  });

const OBSERVATION_RELATIONSHIP_ROW_FAMILY =
  new PagedRowFamily<FrameworkObservationRelationshipRow>({
    id: "framework.observation:relationships",
    rowLabel: "framework observation relationship row(s)",
    evidenceForRow: evidenceForObservationRelationship,
    continuationsForPage: observationRelationshipContinuations,
  });

/** Answer framework.observation inquiries from observer entities and binding observer rows. */
export function answerFrameworkObservation(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<FrameworkObservationValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = observationFiltersFromInquiry(inquiry);
  const limit = rowLimit(inquiry);
  const offset = pageOffset(inquiry);

  switch (projection) {
    case "entities": {
      const observers = readFrameworkObserverEntities(sourceProject, filters);
      return observationPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVATION_ENTITY_ROW_FAMILY,
        observationBaseValue({ observers }),
        observers,
        offset,
        limit,
        "observers",
      );
    }
    case "binding-lookups": {
      const bindingLookups = readFrameworkBindingEffects(sourceProject, {
        ...filters,
        effectKind: FrameworkBindingEffectKind.ObserverLookup,
      });
      return observationPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVATION_BINDING_LOOKUP_ROW_FAMILY,
        observationBaseValue({ bindingLookups }),
        bindingLookups,
        offset,
        limit,
        "bindingLookups",
      );
    }
    case "binding-setups": {
      const bindingSetups = readFrameworkBindingSetups(sourceProject, filters);
      return observationPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVATION_BINDING_SETUP_ROW_FAMILY,
        observationBaseValue({ bindingSetups }),
        bindingSetups,
        offset,
        limit,
        "bindingSetups",
      );
    }
    case "surface-methods": {
      const surfaceMethods = readFrameworkObservationSurfaceMethods(
        sourceProject,
        filters,
      );
      return observationPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVATION_SURFACE_METHOD_ROW_FAMILY,
        observationBaseValue({ surfaceMethods }),
        surfaceMethods,
        offset,
        limit,
        "surfaceMethods",
      );
    }
    case "flow-sites": {
      const flowSites = readFrameworkObservationFlowSites(
        sourceProject,
        filters,
      );
      return observationPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVATION_FLOW_SITE_ROW_FAMILY,
        observationBaseValue({ flowSites }),
        flowSites,
        offset,
        limit,
        "flowSites",
      );
    }
    case "flow-entity-links": {
      const flowEntityLinks = readFrameworkObservationFlowEntityLinks(
        sourceProject,
        filters,
      );
      return observationPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVATION_FLOW_ENTITY_LINK_ROW_FAMILY,
        observationBaseValue({ flowEntityLinks }),
        flowEntityLinks,
        offset,
        limit,
        "flowEntityLinks",
      );
    }
    case "relationships": {
      const relationships = readFrameworkObservationRelationships(
        sourceProject,
        filters,
      );
      return observationPagedAnswer(
        inquiry,
        sourceProject,
        OBSERVATION_RELATIONSHIP_ROW_FAMILY,
        observationBaseValue({ relationships }),
        relationships,
        offset,
        limit,
        "relationships",
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
      const relationships = readFrameworkObservationRelationships(
        sourceProject,
        filters,
      );
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
          continuations: observationSummaryContinuations(inquiry),
        },
      );
    }
  }
}

function observationPagedAnswer<TRow>(
  inquiry: Inquiry,
  sourceProject: SourceProject,
  rowFamily: PagedRowFamily<TRow>,
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
): Answer<FrameworkObservationValue> {
  return rowFamily.answer({
    inquiry,
    rows,
    offset,
    limit,
    basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
    value: (page) =>
      ({
        ...baseValue,
        [key]: page.rows,
      }) as FrameworkObservationValue,
  });
}

function observationBaseValue(
  parts: FrameworkObservationRollupParts,
): FrameworkObservationValue {
  const {
    observers,
    bindingLookups,
    bindingSetups,
    surfaceMethods,
    flowSites,
    flowEntityLinks,
    relationships,
  } = parts;
  return {
    ...(observers === undefined
      ? {}
      : {
          observerCount: observers.length,
          observerKinds: countBy(
            observers.flatMap((row) => row.observerKinds),
            (value) => value,
          ),
          observerCapabilities: countBy(
            observers.flatMap((row) => row.observerCapabilities),
            (value) => value,
          ),
        }),
    ...(bindingLookups === undefined
      ? {}
      : {
          bindingLookupCount: bindingLookups.length,
          bindingLookupNames: countBy(bindingLookups, (row) => row.effectName),
        }),
    ...(bindingSetups === undefined
      ? {}
      : {
          bindingSetupCount: bindingSetups.length,
          bindingSetupKinds: countBy(bindingSetups, (row) => row.setupKind),
        }),
    ...(surfaceMethods === undefined
      ? {}
      : {
          surfaceMethodCount: surfaceMethods.length,
          surfaceKinds: countBy(surfaceMethods, (row) => row.surfaceKind),
        }),
    ...(flowSites === undefined
      ? {}
      : {
          flowSiteCount: flowSites.length,
          flowSiteKinds: countBy(flowSites, (row) => row.siteKind),
        }),
    ...(flowEntityLinks === undefined
      ? {}
      : {
          flowEntityLinkCount: flowEntityLinks.length,
          flowEntityMatchBases: countBy(
            flowEntityLinks,
            (row) => row.matchBasis,
          ),
        }),
    ...(relationships === undefined
      ? {}
      : {
          relationshipCount: relationships.length,
          relationshipRelations: countBy(relationships, (row) => row.relation),
          relationshipMechanisms: countBy(
            relationships,
            (row) => row.mechanism,
          ),
          relationshipPhases: countBy(relationships, (row) => row.phase),
        }),
  };
}

export function readFrameworkObservationRelationships(
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

function evidenceForObservationBindingSetup(row: FrameworkBindingSetupRow): Evidence {
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

function observationSummaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    projectionContinuation(
      inquiry,
      "framework.observation:entities",
      "entities",
      "Inspect observer/reactivity entity rows.",
      { basis: [], summary: "framework.observation:entities" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:binding-lookups",
      "binding-lookups",
      "Inspect binding observer/accessor lookup rows.",
      { basis: [], summary: "framework.observation:binding-lookups" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:binding-setups",
      "binding-setups",
      "Inspect binding observation setup override rows.",
      { basis: [], summary: "framework.observation:binding-setups" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:surface-methods",
      "surface-methods",
      "Inspect observer-locator, connectable, watcher, effect, registry, and metadata surface methods.",
      { basis: [], summary: "framework.observation:surface-methods" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:flow-sites",
      "flow-sites",
      "Inspect source-backed observation flow sites inside locator, dirty-checker, and connectable surfaces.",
      { basis: [], summary: "framework.observation:flow-sites" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:flow-entity-links",
      "flow-entity-links",
      "Inspect flow-site targets linked back to public observer entity rows.",
      { basis: [], summary: "framework.observation:flow-entity-links" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:relationships",
      "relationships",
      "Inspect normalized observation relationships.",
      { basis: [], summary: "framework.observation:relationships" },
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
      { basis: [], summary: "framework.observation:binding-lookups" },
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

function observationBindingSetupContinuations(
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
      { basis: [], summary: "framework.observation:flow-entity-links" },
    ),
    projectionContinuation(
      inquiry,
      "framework.observation:flow-sites:relationships",
      "relationships",
      "Jump from observation flow sites to normalized observation relationships.",
      { basis: [], summary: "framework.observation:relationships" },
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
    const semanticRoute = new FrameworkSemanticRouteBuilder(
      inquiry,
      "framework.observation:flow-entity-links",
      index,
    );
    continuations.push(
      semanticRoute.continuation(
        FrameworkSemanticRoutes.ObservationToEntities,
        "entity",
        {
          filters: {
            packageId: row.entityPackageId,
            exportName: row.entityExportName,
          },
          rationale:
            "Jump to the public observer entity row linked from this flow site.",
          routeSummary:
            "Observation flow-to-entity link back to observer entity catalog.",
        },
      ),
    );
    if (row.entitySource === undefined) {
      continue;
    }
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.observation:flow-entity-links",
      index,
    );
    continuations.push(
      builder.source(
        "entity-source",
        row.entitySource,
        "Inspect the public observer entity declaration linked from this flow site.",
        "Source for linked observer entity declaration.",
        { priority: ContinuationPriority.Secondary },
      ),
    );
  }
  return continuations;
}

function observationRelationshipContinuations(
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
  const semanticRoute = new FrameworkSemanticRouteBuilder(
    {
      lens: LensId.FrameworkObservation,
      locus: RepoRootLocus,
      projection: "binding-lookups",
    },
    "framework.observation:binding-lookups",
    index,
    evidence,
  );
  return semanticRoute.continuation(
    FrameworkSemanticRoutes.ObservationToEntities,
    "observer-capability",
    {
      filters: { observerCapability: observerCapabilityForLookup(effectName) },
      rationale:
        "Inspect observer entities with the capability implied by this binding lookup.",
      routeSummary: "Binding observer lookup to observer capability catalog.",
      priority: ContinuationPriority.Secondary,
    },
  );
}

function observerEntityFlowLinksContinuation(
  row: FrameworkObserverEntityRow,
  index: number,
  evidence: Evidence,
): Continuation {
  const semanticRoute = new FrameworkSemanticRouteBuilder(
    {
      lens: LensId.FrameworkObservation,
      locus: RepoRootLocus,
      projection: "entities",
    },
    "framework.observation:entities",
    index,
    evidence,
  );
  return semanticRoute.continuation(
    FrameworkSemanticRoutes.ObservationToFlowEntityLinks,
    "flow-entity-links",
    {
      filters: {
        exportName: row.exportEntry.exportName,
      },
      rationale:
        "Inspect observation subsystem flow sites linked to this public observer entity.",
      routeSummary: "Observer entity catalog to observation subsystem flow links.",
    },
  );
}

function observerLookupFlowContinuation(
  row: FrameworkBindingEffectRow,
  index: number,
  evidence: Evidence,
): Continuation {
  const semanticRoute = new FrameworkSemanticRouteBuilder(
    {
      lens: LensId.FrameworkObservation,
      locus: RepoRootLocus,
      projection: "binding-lookups",
    },
    "framework.observation:binding-lookups",
    index,
    evidence,
  );
  return semanticRoute.continuation(
    FrameworkSemanticRoutes.ObservationToFlowSites,
    "flow-sites",
    {
      filters: { methodName: row.effectName },
      rationale:
        "Jump from a binding observer lookup API to matching observation subsystem flow sites.",
      routeSummary: "Binding observer lookup to ObserverLocator flow sites.",
    },
  );
}

function observerLookupEntityLinkContinuation(
  row: FrameworkBindingEffectRow,
  index: number,
  evidence: Evidence,
): Continuation {
  const semanticRoute = new FrameworkSemanticRouteBuilder(
    {
      lens: LensId.FrameworkObservation,
      locus: RepoRootLocus,
      projection: "binding-lookups",
    },
    "framework.observation:binding-lookups",
    index,
    evidence,
  );
  return semanticRoute.continuation(
    FrameworkSemanticRoutes.ObservationToFlowEntityLinks,
    "flow-entity-links",
    {
      filters: { methodName: row.effectName },
      rationale:
        "Jump from a binding observer lookup API to linked observer entity rows inside the observation subsystem.",
      routeSummary: "Binding observer lookup to observer entity links.",
      priority: ContinuationPriority.Secondary,
    },
  );
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
    continuations.push(
      nextPageContinuation(
        inquiry,
        `${idPrefix}:next-page`,
        nextPageRationale,
        nextOffset,
        limit,
        { priority: ContinuationPriority.Secondary },
      ),
    );
  }
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const source = sourceForObserverEntity(row);
    if (source === undefined) {
      continue;
    }
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      idPrefix,
      index,
    );
    continuations.push(
      builder.source(
        "source",
        source,
        sourceRationale,
        "Source for observer entity row.",
      ),
    );
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
    continuations.push(
      nextPageContinuation(
        inquiry,
        `${idPrefix}:next-page`,
        nextPageRationale,
        nextOffset,
        limit,
        { priority: ContinuationPriority.Secondary },
      ),
    );
  }
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      idPrefix,
      index,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        sourceRationale,
        "Source for observation row.",
      ),
    );
  }
  return continuations;
}
