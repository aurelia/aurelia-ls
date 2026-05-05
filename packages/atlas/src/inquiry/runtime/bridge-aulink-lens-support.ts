import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type Basis,
} from "../basis.js";
import type { Budget } from "../budget.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import type { Evidence } from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind, type SourceRange } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
  type NavigationRouteClaim,
} from "../navigation.js";
import type { SourceProject } from "../../source/index.js";

/** Default detail budget for bridge projections that expand from compact rows. */
export const AULINK_MIRROR_DETAIL_BUDGET: Budget = {
  rows: 20,
  evidencePerSubject: 3,
};

/** True when a bridge inquiry is still at the unfiltered overview level. */
export function isUnscopedBridgeInquiry(
  inquiry: Inquiry,
  filters: object,
): boolean {
  return (
    inquiry.budget?.rows === undefined &&
    inquiry.page === undefined &&
    Object.values(filters).every((value) => value === undefined)
  );
}

/** Route metadata for paging within one bridge projection. */
export function nextPageRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Addressing,
    NavigationRelation.NextPageOf,
    [],
    summary,
  );
}

/** Route metadata for semantic bridge projection hops. */
export function projectionRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Semantic,
    NavigationRelation.ProjectionOf,
    [BasisKind.AuLink],
    summary,
  );
}

/** Route metadata for source-inspection hops. */
export function sourceRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Inspection,
    NavigationRelation.SourceFor,
    [BasisKind.SourceText, BasisKind.TypeScriptProgram],
    summary,
  );
}

/** Route metadata for TypeScript fact-inspection hops. */
export function typeFactsRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Inspection,
    NavigationRelation.TypeFactsFor,
    [BasisKind.TypeScriptChecker],
    summary,
  );
}

/** Route metadata for exact TypeScript call-site hops. */
export function callSitesRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Flow,
    NavigationRelation.CallSitesOf,
    [BasisKind.TypeScriptChecker, BasisKind.SourceText],
    summary,
  );
}

/** Route metadata for auLink mirror-target hops. */
export function mirrorTargetRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Semantic,
    NavigationRelation.MirrorTargetOf,
    [BasisKind.AuLink, BasisKind.TypeScriptChecker],
    summary,
  );
}

/** Route metadata for modeled bridge seams. */
export function seamRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Semantic,
    NavigationRelation.SeamFor,
    [BasisKind.AuLink],
    summary,
  );
}

/** Build a stable navigation route claim. */
export function continuationRoute(
  plane: NavigationPlane,
  relation: NavigationRelation,
  basis: readonly BasisKind[],
  summary: string,
): NavigationRouteClaim {
  return { plane, relation, basis, summary };
}

/** Switch to another projection within bridge.aulink while preserving filters. */
export function mirrorProjectionContinuation(
  inquiry: Inquiry,
  id: string,
  projection: string,
  rationale: string,
  filters: Inquiry["filters"] = {},
  evidence?: Evidence,
  budget?: Budget,
): Continuation {
  const nextBudget = budget ?? inquiry.budget ?? AULINK_MIRROR_DETAIL_BUDGET;
  return {
    id,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale,
    inquiry: {
      ...inquiry,
      projection,
      filters: {
        ...(inquiry.filters ?? {}),
        ...filters,
      },
      ...(nextBudget === undefined ? {} : { budget: nextBudget }),
      page: undefined,
    },
    ...(evidence === undefined ? {} : { evidence: [evidence] }),
    route: projectionRoute(`bridge.aulink ${projection} projection.`),
  };
}

/** Switch to the framework projection that produced a bridge evidence row. */
export function ownerProjectionContinuation(
  inquiry: Inquiry,
  id: string,
  lens: LensId,
  projection: string,
  filters: Inquiry["filters"],
  rationale: string,
  evidence: Evidence,
  basis: readonly BasisKind[],
): Continuation {
  return {
    id,
    kind:
      lens === inquiry.lens
        ? ContinuationKind.SwitchProjection
        : ContinuationKind.SwitchLens,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: {
      lens,
      locus: inquiry.locus,
      projection,
      filters,
      budget: inquiry.budget,
    },
    evidence: [evidence],
    route: continuationRoute(
      NavigationPlane.Semantic,
      NavigationRelation.ProjectionOf,
      basis,
      "Owning framework projection for this mirror evidence row.",
    ),
  };
}

/** Inspect one source range behind a bridge evidence row. */
export function sourceRangeContinuation(
  id: string,
  rationale: string,
  range: SourceRange,
  evidence: Evidence,
): Continuation {
  return {
    id,
    kind: ContinuationKind.InspectEvidence,
    priority: ContinuationPriority.Secondary,
    rationale,
    inquiry: {
      lens: LensId.TsSource,
      locus: {
        kind: LocusKind.SourceRange,
        range,
      },
      projection: "text",
    },
    evidence: [evidence],
    route: sourceRoute("Source range behind auLink mirror evidence."),
  };
}

/** Inspect TypeScript call sites inside a source range behind a bridge row. */
export function callSitesRangeContinuation(
  id: string,
  rationale: string,
  range: SourceRange,
  evidence: Evidence,
  filters?: Inquiry["filters"],
): Continuation {
  return {
    id,
    kind: ContinuationKind.SwitchLens,
    priority: ContinuationPriority.Secondary,
    rationale,
    inquiry: {
      lens: LensId.TsType,
      locus: {
        kind: LocusKind.SourceRange,
        range,
      },
      projection: "call-sites",
      ...(filters === undefined ? {} : { filters }),
    },
    evidence: [evidence],
    route: callSitesRoute("Call-site facts inside auLink mirror evidence."),
  };
}

/** Basis for semantic-runtime auLink declarations and placements. */
export function auLinkBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.AuLink,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Product,
    freshness: BasisFreshness.Live,
    summary:
      "Answered from semantic-runtime auLink overload declarations and decorator placements.",
    identity: sourceProject.snapshot().identity,
  };
}

/** Basis for TypeScript checker-backed bridge reads. */
export function checkerBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.TypeScriptChecker,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary:
      "Resolved auLink decorator calls through the current TypeScript TypeChecker.",
    identity: sourceProject.snapshot().identity,
  };
}

/** Basis for framework source declarations admitted into the bridge model. */
export function frameworkBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.TypeScriptProgram,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary:
      "Resolved framework-side auLink targets from admitted Aurelia package declarations.",
    identity: sourceProject.snapshot().identity,
  };
}
