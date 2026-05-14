import { BasisKind, BasisTransitionKind, type BasisTransition } from "./basis.js";
import { ContinuationKind, ContinuationPriority } from "./continuation.js";
import { EvidenceKind } from "./evidence.js";
import { HandleKind, HandleNamespace } from "./handle.js";
import { LensId } from "./lens.js";
import { LocusKind } from "./locus.js";

/** Schema marker for the Atlas navigation grammar. */
export const NAVIGATION_GRAMMAR_VERSION =
  "atlas-navigation-grammar-v0" as const;

/** Coarse plane of a navigation route, kept separate from the route relation itself. */
export const enum NavigationPlane {
  /** Move through source, range, symbol, handle, or page addressing. */
  Addressing = "addressing",
  /** Inspect source, type, quick-info, diagnostics, or evidence details. */
  Inspection = "inspection",
  /** Move through declarations, imports, exports, modules, symbols, or document structure. */
  Structure = "structure",
  /** Move through references, calls, definitions, or flow evidence. */
  Flow = "flow",
  /** Move through product, bridge, framework, evaluator, DI, materialization, or claim meaning. */
  Semantic = "semantic",
  /** Move through Atlas contracts and source-backed maintenance surfaces. */
  Maintenance = "maintenance",
}

/** Relation expressed by a route. This names the edge, not the source or target domain. */
export const enum NavigationRelation {
  /** The target inquiry continues the same ordered answer. */
  NextPageOf = "next-page-of",
  /** The target inquiry changes projection over the same basis and subject. */
  ProjectionOf = "projection-of",
  /** The target inquiry narrows filters, locus, or subject while preserving the same answer family. */
  RefinementOf = "refinement-of",
  /** The target inquiry inspects source behind a subject, evidence row, or route row. */
  SourceFor = "source-for",
  /** The target inquiry inspects TypeChecker facts behind a subject, evidence row, or route row. */
  TypeFactsFor = "type-facts-for",
  /** The target inquiry follows references of a symbol-like subject. */
  ReferencesOf = "references-of",
  /** The target inquiry follows definitions, implementations, or type definitions of a symbol-like subject. */
  DefinitionsOf = "definitions-of",
  /** The target inquiry follows call hierarchy edges around a callable subject. */
  CallHierarchyOf = "call-hierarchy-of",
  /** The target inquiry inspects exact call-site syntax, callee facts, and argument facts. */
  CallSitesOf = "call-sites-of",
  /** The target inquiry traces static invocation/effect rows for a source, symbol, or framework surface. */
  EffectsOf = "effects-of",
  /** The target inquiry reads diagnostics or static coherence pressure for the subject. */
  DiagnosticsFor = "diagnostics-for",
  /** The target inquiry reads exact edit affordances or edit plans for the subject. */
  EditPlanFor = "edit-plan-for",
  /** The target inquiry resolves product-to-framework mirror targets. */
  MirrorTargetOf = "mirror-target-of",
  /** The target inquiry follows semantic provenance or product/framework transformation flow. */
  ProvenanceOf = "provenance-of",
  /** The target inquiry follows an explicit open seam that blocked closure. */
  SeamFor = "seam-for",
  /** The target inquiry enters a framework semantic flow such as DI, compile, render, or lifecycle. */
  FrameworkFlowOf = "framework-flow-of",
}

/** Static endpoint shape for one side of a navigation rule. */
export interface NavigationEndpointSpec {
  /** Optional lens that owns this endpoint. */
  readonly lens?: LensId;
  /** Optional projection that narrows this endpoint. */
  readonly projection?: string;
  /** Optional locus kind accepted or produced by this endpoint. */
  readonly locus?: LocusKind;
  /** Optional evidence kind accepted or produced by this endpoint. */
  readonly evidenceKind?: EvidenceKind;
  /** Optional handle namespace accepted or produced by this endpoint. */
  readonly handleNamespace?: HandleNamespace;
  /** Optional handle kind accepted or produced by this endpoint. */
  readonly handleKind?: HandleKind;
}

/** Reusable route rule used to explain and audit continuation generation. */
export interface NavigationRouteSpec {
  /** Stable route id for continuation claims and maintenance checks. */
  readonly id: string;
  /** Coarse route plane. */
  readonly plane: NavigationPlane;
  /** Exact relation this route represents. */
  readonly relation: NavigationRelation;
  /** Source endpoint pattern. */
  readonly from: NavigationEndpointSpec;
  /** Target endpoint pattern. */
  readonly to: NavigationEndpointSpec;
  /** Continuation kind normally used for this route. */
  readonly continuationKind: ContinuationKind;
  /** Default priority when the answer has no stronger local reason. */
  readonly defaultPriority: ContinuationPriority;
  /** Basis kinds that can honestly support this route. */
  readonly supportedBasis: readonly BasisKind[];
  /** Optional basis movement when this route intentionally changes authority. */
  readonly basisTransition?: BasisTransition;
  /** Evidence kinds commonly produced or consumed by this route. */
  readonly evidenceKinds: readonly EvidenceKind[];
  /** Grounded explanation of when this route should be offered. */
  readonly summary: string;
}

/** Compact route claim attached to an emitted continuation. */
export interface NavigationRouteClaim {
  /** Route spec id when the continuation follows a declared route. */
  readonly specId?: string;
  /** Domain-level route declaration when a semantic catalog owns the exact endpoint topology. */
  readonly semanticRouteId?: string;
  /** Coarse route plane. */
  readonly plane: NavigationPlane;
  /** Exact relation claimed by the continuation. */
  readonly relation: NavigationRelation;
  /** Basis kinds the continuation expects or preserves. */
  readonly basis?: readonly BasisKind[];
  /** Explicit basis movement when the continuation changes authority. */
  readonly basisTransition?: BasisTransition;
  /** Short explanation for route audit output. */
  readonly summary?: string;
}

/** Versioned static navigation grammar. */
export interface NavigationGrammar {
  /** Schema marker for compaction-safe navigation orientation. */
  readonly schemaVersion: typeof NAVIGATION_GRAMMAR_VERSION;
  /** Operating rules for route generation and promotion. */
  readonly principles: readonly string[];
  /** Route specs currently recognized by Atlas. */
  readonly routes: readonly NavigationRouteSpec[];
}

/** Declare a route claim from a known route spec. */
export function routeClaim(
  spec: NavigationRouteSpec,
  summary?: string,
): NavigationRouteClaim {
  const claim = {
    specId: spec.id,
    plane: spec.plane,
    relation: spec.relation,
    basis: spec.supportedBasis,
  };
  if (spec.basisTransition !== undefined) {
    Object.assign(claim, { basisTransition: spec.basisTransition });
  }
  if (summary !== undefined) {
    Object.assign(claim, { summary });
  }
  return claim;
}

/** Build an ad-hoc route claim when a continuation has not been promoted to a named route spec yet. */
export function navigationRoute(
  plane: NavigationPlane,
  relation: NavigationRelation,
  basis: readonly BasisKind[],
  summary: string,
  basisTransition?: BasisTransition,
): NavigationRouteClaim {
  return {
    plane,
    relation,
    basis,
    summary,
    basisTransition,
  };
}

/** Build the common next-page route used by paged answer families. */
export function nextPageRouteClaim(summary: string): NavigationRouteClaim {
  return navigationRoute(
    NavigationPlane.Addressing,
    NavigationRelation.NextPageOf,
    [],
    summary,
  );
}

/** Build the common source-inspection route used by source, bridge, and TypeScript lenses. */
export function sourceInspectionRoute(summary: string): NavigationRouteClaim {
  return navigationRoute(
    NavigationPlane.Inspection,
    NavigationRelation.SourceFor,
    [BasisKind.SourceText, BasisKind.TypeScriptProgram],
    summary,
  );
}

/** Build the common TypeChecker fact-inspection route used by source, bridge, and TypeScript lenses. */
export function typeFactsInspectionRoute(summary: string): NavigationRouteClaim {
  return navigationRoute(
    NavigationPlane.Inspection,
    NavigationRelation.TypeFactsFor,
    [BasisKind.TypeScriptChecker],
    summary,
  );
}

function basisTransition(
  kind: BasisTransitionKind,
  from: readonly BasisKind[],
  to: readonly BasisKind[],
  summary: string,
): BasisTransition {
  return { kind, from, to, summary };
}

/** Generic inquiry routes that every substrate can reuse before product/framework meaning is added. */
export const CORE_NAVIGATION_ROUTES: readonly NavigationRouteSpec[] = [
  {
    id: "page.next",
    plane: NavigationPlane.Addressing,
    relation: NavigationRelation.NextPageOf,
    from: {},
    to: {},
    continuationKind: ContinuationKind.NextPage,
    defaultPriority: ContinuationPriority.Primary,
    supportedBasis: [
      BasisKind.SourceText,
      BasisKind.TypeScriptProgram,
      BasisKind.TypeScriptChecker,
      BasisKind.StaticEvaluator,
      BasisKind.ProductVocabulary,
      BasisKind.AuLink,
      BasisKind.AtlasContract,
    ],
    evidenceKinds: [],
    basisTransition: basisTransition(
      BasisTransitionKind.Preserve,
      [
        BasisKind.SourceText,
        BasisKind.TypeScriptProgram,
        BasisKind.TypeScriptChecker,
        BasisKind.StaticEvaluator,
        BasisKind.ProductVocabulary,
        BasisKind.AuLink,
        BasisKind.AtlasContract,
      ],
      [
        BasisKind.SourceText,
        BasisKind.TypeScriptProgram,
        BasisKind.TypeScriptChecker,
        BasisKind.StaticEvaluator,
        BasisKind.ProductVocabulary,
        BasisKind.AuLink,
        BasisKind.AtlasContract,
      ],
      "Paging preserves the answer basis while advancing within the same ordered row family.",
    ),
    summary: "Continue an ordered answer without changing the question shape.",
  },
  {
    id: "projection.same-subject",
    plane: NavigationPlane.Addressing,
    relation: NavigationRelation.ProjectionOf,
    from: {},
    to: {},
    continuationKind: ContinuationKind.SwitchProjection,
    defaultPriority: ContinuationPriority.Secondary,
    supportedBasis: [
      BasisKind.AtlasContract,
      BasisKind.SourceText,
      BasisKind.TypeScriptProgram,
      BasisKind.TypeScriptChecker,
      BasisKind.StaticEvaluator,
      BasisKind.ProductVocabulary,
      BasisKind.AuLink,
    ],
    evidenceKinds: [],
    basisTransition: basisTransition(
      BasisTransitionKind.Preserve,
      [
        BasisKind.AtlasContract,
        BasisKind.SourceText,
        BasisKind.TypeScriptProgram,
        BasisKind.TypeScriptChecker,
        BasisKind.StaticEvaluator,
        BasisKind.ProductVocabulary,
        BasisKind.AuLink,
      ],
      [
        BasisKind.AtlasContract,
        BasisKind.SourceText,
        BasisKind.TypeScriptProgram,
        BasisKind.TypeScriptChecker,
        BasisKind.StaticEvaluator,
        BasisKind.ProductVocabulary,
        BasisKind.AuLink,
      ],
      "Projection switches keep the same subject and authority while changing the answer shape.",
    ),
    summary: "Switch projection over the same subject, filters, and basis.",
  },
  {
    id: "inquiry.refine",
    plane: NavigationPlane.Addressing,
    relation: NavigationRelation.RefinementOf,
    from: {},
    to: {},
    continuationKind: ContinuationKind.Narrow,
    defaultPriority: ContinuationPriority.Secondary,
    supportedBasis: [
      BasisKind.AtlasContract,
      BasisKind.SourceText,
      BasisKind.TypeScriptProgram,
      BasisKind.TypeScriptChecker,
      BasisKind.StaticEvaluator,
      BasisKind.ProductVocabulary,
      BasisKind.AuLink,
    ],
    evidenceKinds: [],
    basisTransition: basisTransition(
      BasisTransitionKind.Refine,
      [
        BasisKind.AtlasContract,
        BasisKind.SourceText,
        BasisKind.TypeScriptProgram,
        BasisKind.TypeScriptChecker,
        BasisKind.StaticEvaluator,
        BasisKind.ProductVocabulary,
        BasisKind.AuLink,
      ],
      [
        BasisKind.AtlasContract,
        BasisKind.SourceText,
        BasisKind.TypeScriptProgram,
        BasisKind.TypeScriptChecker,
        BasisKind.StaticEvaluator,
        BasisKind.ProductVocabulary,
        BasisKind.AuLink,
      ],
      "Refinement narrows the inquiry without crossing into a different authority lane.",
    ),
    summary:
      "Narrow filters, locus, or subject while preserving the current answer family.",
  },
  {
    id: "evidence.source",
    plane: NavigationPlane.Inspection,
    relation: NavigationRelation.SourceFor,
    from: { evidenceKind: EvidenceKind.SourceSpan },
    to: {
      lens: LensId.TsSource,
      projection: "text",
      locus: LocusKind.SourceRange,
    },
    continuationKind: ContinuationKind.InspectEvidence,
    defaultPriority: ContinuationPriority.Primary,
    supportedBasis: [
      BasisKind.SourceText,
      BasisKind.TypeScriptProgram,
      BasisKind.TypeScriptChecker,
    ],
    evidenceKinds: [
      EvidenceKind.SourceSpan,
      EvidenceKind.Symbol,
      EvidenceKind.TypeFact,
      EvidenceKind.CallSite,
    ],
    basisTransition: basisTransition(
      BasisTransitionKind.Handoff,
      [BasisKind.TypeScriptProgram, BasisKind.TypeScriptChecker],
      [BasisKind.SourceText],
      "Source inspection hands off from symbol/checker-backed evidence to exact source text.",
    ),
    summary:
      "Inspect exact source behind evidence that carries or resolves to a source range.",
  },
  {
    id: "symbol.type-facts",
    plane: NavigationPlane.Inspection,
    relation: NavigationRelation.TypeFactsFor,
    from: {
      handleNamespace: HandleNamespace.Symbol,
      handleKind: HandleKind.Symbol,
    },
    to: { lens: LensId.TsType, projection: "facts" },
    continuationKind: ContinuationKind.SwitchLens,
    defaultPriority: ContinuationPriority.Secondary,
    supportedBasis: [BasisKind.TypeScriptChecker],
    evidenceKinds: [EvidenceKind.Symbol, EvidenceKind.TypeFact],
    summary: "Inspect TypeChecker facts for a symbol-like target.",
  },
  {
    id: "symbol.references",
    plane: NavigationPlane.Flow,
    relation: NavigationRelation.ReferencesOf,
    from: { handleKind: HandleKind.Symbol },
    to: { lens: LensId.TsType, projection: "references" },
    continuationKind: ContinuationKind.SwitchProjection,
    defaultPriority: ContinuationPriority.Primary,
    supportedBasis: [BasisKind.TypeScriptChecker],
    evidenceKinds: [EvidenceKind.Symbol, EvidenceKind.SourceSpan],
    summary: "Follow exact TypeScript references for a symbol-like target.",
  },
  {
    id: "symbol.definitions",
    plane: NavigationPlane.Structure,
    relation: NavigationRelation.DefinitionsOf,
    from: { handleKind: HandleKind.Symbol },
    to: { lens: LensId.TsType, projection: "definitions" },
    continuationKind: ContinuationKind.SwitchProjection,
    defaultPriority: ContinuationPriority.Secondary,
    supportedBasis: [BasisKind.TypeScriptChecker],
    evidenceKinds: [EvidenceKind.Symbol, EvidenceKind.SourceSpan],
    summary:
      "Follow TypeScript definitions, implementations, and type definitions.",
  },
  {
    id: "symbol.call-hierarchy",
    plane: NavigationPlane.Flow,
    relation: NavigationRelation.CallHierarchyOf,
    from: { handleKind: HandleKind.Symbol },
    to: { lens: LensId.TsType, projection: "call-hierarchy" },
    continuationKind: ContinuationKind.SwitchProjection,
    defaultPriority: ContinuationPriority.Secondary,
    supportedBasis: [BasisKind.TypeScriptChecker],
    evidenceKinds: [EvidenceKind.CallSite, EvidenceKind.Symbol],
    summary: "Follow incoming and outgoing TypeScript call hierarchy edges.",
  },
  {
    id: "call-site.arguments",
    plane: NavigationPlane.Flow,
    relation: NavigationRelation.CallSitesOf,
    from: { evidenceKind: EvidenceKind.CallSite },
    to: {
      lens: LensId.TsType,
      projection: "call-sites",
      evidenceKind: EvidenceKind.CallSite,
    },
    continuationKind: ContinuationKind.SwitchProjection,
    defaultPriority: ContinuationPriority.Primary,
    supportedBasis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
    evidenceKinds: [
      EvidenceKind.CallSite,
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
    ],
    basisTransition: basisTransition(
      BasisTransitionKind.Join,
      [BasisKind.SourceText, BasisKind.TypeScriptChecker],
      [BasisKind.SourceText, BasisKind.TypeScriptChecker],
      "Call-site inspection joins exact syntax with checker-resolved callee and argument facts.",
    ),
    summary:
      "Inspect exact call expressions, resolved signatures, and argument facts behind call-site evidence.",
  },
  {
    id: "evaluator.effects",
    plane: NavigationPlane.Semantic,
    relation: NavigationRelation.EffectsOf,
    from: { evidenceKind: EvidenceKind.Symbol },
    to: { lens: LensId.FrameworkEvaluator, projection: "effects" },
    continuationKind: ContinuationKind.SwitchLens,
    defaultPriority: ContinuationPriority.Primary,
    supportedBasis: [
      BasisKind.StaticEvaluator,
      BasisKind.TypeScriptChecker,
      BasisKind.SourceText,
    ],
    evidenceKinds: [
      EvidenceKind.Symbol,
      EvidenceKind.SourceSpan,
      EvidenceKind.CallSite,
      EvidenceKind.OpenSeam,
    ],
    summary:
      "Trace static invocation and effect rows for a source-backed framework symbol or member body.",
  },
  {
    id: "type.diagnostics",
    plane: NavigationPlane.Maintenance,
    relation: NavigationRelation.DiagnosticsFor,
    from: {},
    to: { lens: LensId.TsType, projection: "diagnostics" },
    continuationKind: ContinuationKind.SwitchProjection,
    defaultPriority: ContinuationPriority.Secondary,
    supportedBasis: [BasisKind.TypeScriptChecker],
    evidenceKinds: [EvidenceKind.TypeFact, EvidenceKind.SourceSpan],
    summary:
      "Inspect TypeScript diagnostics for the current selector or source locus.",
  },
  {
    id: "edit.rename",
    plane: NavigationPlane.Maintenance,
    relation: NavigationRelation.EditPlanFor,
    from: {},
    to: { lens: LensId.TsType, projection: "rename" },
    continuationKind: ContinuationKind.SwitchProjection,
    defaultPriority: ContinuationPriority.Secondary,
    supportedBasis: [BasisKind.TypeScriptChecker],
    evidenceKinds: [EvidenceKind.TypeFact, EvidenceKind.SourceSpan],
    summary: "Inspect rename affordances before producing edit plans.",
  },
  {
    id: "aulink.targets",
    plane: NavigationPlane.Semantic,
    relation: NavigationRelation.MirrorTargetOf,
    from: {
      lens: LensId.BridgeAuLink,
      projection: "anchors",
      evidenceKind: EvidenceKind.AuLinkAnchor,
    },
    to: { lens: LensId.BridgeAuLink, projection: "targets" },
    continuationKind: ContinuationKind.SwitchProjection,
    defaultPriority: ContinuationPriority.Primary,
    supportedBasis: [BasisKind.AuLink, BasisKind.TypeScriptChecker],
    evidenceKinds: [
      EvidenceKind.AuLinkAnchor,
      EvidenceKind.Symbol,
      EvidenceKind.OpenSeam,
    ],
    summary:
      "Resolve product-side auLink anchors to exact Aurelia framework declarations.",
  },
  {
    id: "semantic.provenance",
    plane: NavigationPlane.Semantic,
    relation: NavigationRelation.ProvenanceOf,
    from: {},
    to: {},
    continuationKind: ContinuationKind.SwitchLens,
    defaultPriority: ContinuationPriority.Secondary,
    supportedBasis: [
      BasisKind.StaticEvaluator,
      BasisKind.TypeScriptChecker,
      BasisKind.AuLink,
    ],
    evidenceKinds: [
      EvidenceKind.DiRegistration,
      EvidenceKind.DiLookup,
      EvidenceKind.ResourceDefinition,
      EvidenceKind.TypeFact,
      EvidenceKind.AuLinkAnchor,
      EvidenceKind.ProductClaim,
    ],
    summary:
      "Move from a derived semantic row back to the source relationship, bridge, provider, or product fact that produced it.",
  },
  {
    id: "open-seam.inspect",
    plane: NavigationPlane.Semantic,
    relation: NavigationRelation.SeamFor,
    from: { evidenceKind: EvidenceKind.OpenSeam },
    to: { handleKind: HandleKind.OpenSeam },
    continuationKind: ContinuationKind.InspectOpenSeam,
    defaultPriority: ContinuationPriority.Primary,
    supportedBasis: [
      BasisKind.StaticEvaluator,
      BasisKind.AuLink,
      BasisKind.AtlasContract,
    ],
    evidenceKinds: [EvidenceKind.OpenSeam],
    summary: "Inspect the exact unresolved boundary that stopped closure.",
  },
  {
    id: "framework.flow",
    plane: NavigationPlane.Semantic,
    relation: NavigationRelation.FrameworkFlowOf,
    from: { lens: LensId.FrameworkDiscovery },
    to: { handleNamespace: HandleNamespace.Framework },
    continuationKind: ContinuationKind.SwitchLens,
    defaultPriority: ContinuationPriority.Primary,
    supportedBasis: [
      BasisKind.AtlasContract,
      BasisKind.TypeScriptChecker,
      BasisKind.StaticEvaluator,
    ],
    evidenceKinds: [
      EvidenceKind.MaintenanceSignal,
      EvidenceKind.SourceSpan,
      EvidenceKind.TypeFact,
      EvidenceKind.CallSite,
      EvidenceKind.DiRegistration,
      EvidenceKind.DiLookup,
      EvidenceKind.OpenSeam,
    ],
    summary:
      "Enter an Aurelia framework behavior flow from discovery seeds or an indexed framework route row.",
  },
  {
    id: "framework.admission.flow",
    plane: NavigationPlane.Semantic,
    relation: NavigationRelation.FrameworkFlowOf,
    from: { lens: LensId.FrameworkAdmission },
    to: { handleNamespace: HandleNamespace.Framework },
    continuationKind: ContinuationKind.SwitchLens,
    defaultPriority: ContinuationPriority.Primary,
    supportedBasis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
    evidenceKinds: [
      EvidenceKind.DiRegistration,
      EvidenceKind.ResourceDefinition,
      EvidenceKind.TypeFact,
      EvidenceKind.SourceSpan,
      EvidenceKind.OpenSeam,
    ],
    summary:
      "Move from framework admission relationship rows into DI, resource, registry, lifecycle, or further admission flow.",
  },
];

/** Static navigation grammar exported through Atlas inquiry contracts. */
export const NAVIGATION_GRAMMAR: NavigationGrammar = {
  schemaVersion: NAVIGATION_GRAMMAR_VERSION,
  principles: [
    "A route relation names the edge being followed, not the domain that owns either endpoint.",
    "A route plane groups route relations for orientation only; it must not imply authority.",
    "Continuations should claim a route when they follow a declared grammar rule.",
    "Answer-local continuations can exist while a behavior is still being discovered, but repeated local rules should be promoted into the grammar.",
    "Framework-specific meaning should use framework route rows above this grammar instead of overloading generic source/type routes.",
  ],
  routes: CORE_NAVIGATION_ROUTES,
};
