import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type Basis,
} from "../basis.js";
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
  OpenSeamKind,
  type Evidence,
  type OpenSeam,
} from "../evidence.js";
import { HandleKind, HandleNamespace, type InquiryHandle } from "../handle.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind, type SourceRange } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
  type NavigationRouteClaim,
} from "../navigation.js";
import {
  AuLinkGapKind,
  readAuLinkModel,
  sourceRangeForAuLinkFrameworkCandidate,
  sourceRangeForAuLinkAnchor,
  sourceRangeForAuLinkCatalog,
  sourceRangeForAuLinkTarget,
  type AuLinkAnchorRow,
  type AuLinkCatalogEntry,
  type AuLinkFilters,
  type AuLinkFrameworkTargetCandidate,
  type AuLinkFrameworkTargetResolution,
  type AuLinkGapRow,
  type AuLinkModel,
  type AuLinkRollup,
  type SourceProject,
} from "../../source/index.js";

/** Value returned by the bridge.aulink runtime lens. */
export interface BridgeAuLinkValue {
  /** Exact filters applied to the auLink model. */
  readonly filters: AuLinkFilters;
  /** Rollup for the filtered model. */
  readonly rollup: AuLinkRollup;
  /** Catalog rows included for catalog-aware projections. */
  readonly catalog?: readonly AuLinkCatalogEntry[];
  /** Anchor rows included for anchor projections. */
  readonly anchors?: readonly AuLinkAnchorRow[];
  /** Framework-side target rows included for target projections. */
  readonly targets?: readonly AuLinkFrameworkTargetResolution[];
  /** Gap rows included for gap projections. */
  readonly gaps?: readonly AuLinkGapRow[];
}

/** Answer auLink bridge inquiries from semantic-runtime source and TypeChecker state. */
export function answerBridgeAuLink(
  /** Inquiry being answered. */
  inquiry: Inquiry,
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
): Answer<BridgeAuLinkValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = filtersFromInquiry(inquiry);
  const model = readAuLinkModel(sourceProject, filters);
  const limit = clampBudget(inquiry.budget?.rows, 80, 1_000);
  const offset = pageOffset(inquiry);

  if (projection === "anchors") {
    const page = pageRows(model.anchors, offset, limit);
    const value: BridgeAuLinkValue = {
      filters,
      rollup: model.rollup,
      anchors: page.rows,
    };
    return createAnswer(
      inquiry,
      page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
      `Returned ${page.rows.length} of ${model.anchors.length} auLink anchor row(s).`,
      {
        value,
        basis: [auLinkBasis(sourceProject), checkerBasis(sourceProject)],
        evidence: page.rows
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForAnchor),
        openSeams: model.gaps
          .slice(0, evidenceLimit(inquiry))
          .map(openSeamForGap),
        page: {
          size: limit,
          cursor: inquiry.page?.cursor,
          returned: page.rows.length,
          total: model.anchors.length,
          ...(page.nextOffset === undefined
            ? {}
            : { nextCursor: String(page.nextOffset) }),
        },
        continuations: anchorContinuations(
          inquiry,
          page.rows,
          page.nextOffset,
          limit,
        ),
      },
    );
  }

  if (projection === "gaps") {
    const page = pageRows(model.gaps, offset, limit);
    const value: BridgeAuLinkValue = {
      filters,
      rollup: model.rollup,
      gaps: page.rows,
    };
    return createAnswer(
      inquiry,
      page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
      `Returned ${page.rows.length} of ${model.gaps.length} auLink gap row(s).`,
      {
        value,
        basis: [auLinkBasis(sourceProject), checkerBasis(sourceProject)],
        evidence: page.rows
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForGap),
        openSeams: page.rows
          .slice(0, evidenceLimit(inquiry))
          .map(openSeamForGap),
        page: {
          size: limit,
          cursor: inquiry.page?.cursor,
          returned: page.rows.length,
          total: model.gaps.length,
          ...(page.nextOffset === undefined
            ? {}
            : { nextCursor: String(page.nextOffset) }),
        },
        continuations: gapContinuations(
          inquiry,
          page.rows,
          page.nextOffset,
          limit,
        ),
      },
    );
  }

  if (projection === "targets") {
    const page = pageRows(model.frameworkTargets, offset, limit);
    const value: BridgeAuLinkValue = {
      filters,
      rollup: model.rollup,
      targets: page.rows,
    };
    return createAnswer(
      inquiry,
      page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
      `Returned ${page.rows.length} of ${model.frameworkTargets.length} auLink framework target row(s).`,
      {
        value,
        basis: [
          auLinkBasis(sourceProject),
          checkerBasis(sourceProject),
          frameworkBasis(sourceProject),
        ],
        evidence: page.rows
          .slice(0, evidenceLimit(inquiry))
          .flatMap(evidenceForFrameworkTarget),
        openSeams: page.rows
          .filter((target) => target.status !== "resolved")
          .slice(0, evidenceLimit(inquiry))
          .map(openSeamForFrameworkTarget),
        page: {
          size: limit,
          cursor: inquiry.page?.cursor,
          returned: page.rows.length,
          total: model.frameworkTargets.length,
          ...(page.nextOffset === undefined
            ? {}
            : { nextCursor: String(page.nextOffset) }),
        },
        continuations: targetContinuations(
          inquiry,
          page.rows,
          page.nextOffset,
          limit,
        ),
      },
    );
  }

  const value: BridgeAuLinkValue = {
    filters,
    rollup: model.rollup,
  };
  const outcome =
    model.rollup.catalogEntries === 0 && model.rollup.anchors === 0
      ? OutcomeKind.Miss
      : OutcomeKind.Hit;
  return createAnswer(inquiry, outcome, summaryForRollup(model.rollup), {
    value,
    basis: [auLinkBasis(sourceProject), checkerBasis(sourceProject)],
    evidence: summaryEvidence(model, inquiry),
    openSeams: model.gaps.slice(0, evidenceLimit(inquiry)).map(openSeamForGap),
    continuations: summaryContinuations(inquiry, filters, model),
  });
}

function filtersFromInquiry(inquiry: Inquiry): AuLinkFilters {
  return {
    ...filtersFromSubject(inquiry.subject),
    ...filtersFromRecord(inquiry.filters),
  };
}

function filtersFromSubject(subject: unknown): AuLinkFilters {
  if (typeof subject === "string" && subject.includes(":")) {
    return { linkId: subject };
  }
  if (subject !== null && typeof subject === "object") {
    return filtersFromRecord(subject as Record<string, unknown>);
  }
  return {};
}

function filtersFromRecord(
  source: Record<string, unknown> | undefined,
): AuLinkFilters {
  if (source === undefined) {
    return {};
  }
  return {
    ...stringField(source, "linkId"),
    ...stringField(source, "packageId"),
    ...stringField(source, "targetName"),
    ...stringField(source, "filePath"),
    ...stringField(source, "frameworkStatus"),
    ...(typeof source.symbolName === "string"
      ? { symbolName: source.symbolName }
      : {}),
    ...(typeof source.frameworkSymbol === "string"
      ? { symbolName: source.frameworkSymbol }
      : {}),
  };
}

function stringField(
  source: Record<string, unknown>,
  key: keyof AuLinkFilters,
): object {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}

function summaryForRollup(rollup: AuLinkRollup): string {
  return `Read ${rollup.anchors} auLink anchor(s), ${rollup.catalogEntries} catalog entrie(s), ${rollup.gaps} gap row(s), and ${rollup.resolvedFrameworkTargets} resolved framework target(s).`;
}

function summaryEvidence(
  model: AuLinkModel,
  inquiry: Inquiry,
): readonly Evidence[] {
  const limit = evidenceLimit(inquiry);
  const anchors = model.anchors.slice(0, limit).map(evidenceForAnchor);
  if (anchors.length >= limit) {
    return anchors;
  }
  return [
    ...anchors,
    ...model.gaps.slice(0, limit - anchors.length).map(evidenceForGap),
  ];
}

function summaryContinuations(
  inquiry: Inquiry,
  filters: AuLinkFilters,
  model: AuLinkModel,
): readonly Continuation[] {
  const continuations: Continuation[] = [
    {
      id: "bridge.aulink:anchors",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect exact auLink decorator placements.",
      inquiry: {
        lens: LensId.BridgeAuLink,
        locus: inquiry.locus,
        subject: filters,
        projection: "anchors",
        budget: inquiry.budget,
      },
      route: projectionRoute(
        "auLink decorator placements for the current filters.",
      ),
    },
    {
      id: "bridge.aulink:gaps",
      kind: ContinuationKind.SwitchProjection,
      priority:
        model.gaps.length === 0
          ? ContinuationPriority.Secondary
          : ContinuationPriority.Primary,
      rationale: "Inspect exact catalog and placement gaps.",
      inquiry: {
        lens: LensId.BridgeAuLink,
        locus: inquiry.locus,
        subject: filters,
        projection: "gaps",
        budget: inquiry.budget,
      },
      route: seamRoute(
        "auLink catalog and placement gaps for the current filters.",
      ),
    },
    {
      id: "bridge.aulink:targets",
      kind: ContinuationKind.SwitchProjection,
      priority:
        model.rollup.unresolvedFrameworkTargets > 0 ||
        model.rollup.ambiguousFrameworkTargets > 0
          ? ContinuationPriority.Primary
          : ContinuationPriority.Secondary,
      rationale: "Resolve auLink ids to exact Aurelia framework declarations.",
      inquiry: {
        lens: LensId.BridgeAuLink,
        locus: inquiry.locus,
        subject: filters,
        projection: "targets",
        budget: inquiry.budget,
      },
      route: mirrorTargetRoute(
        "Framework targets for the current auLink filters.",
      ),
    },
  ];

  const firstAnchor = model.anchors[0];
  if (firstAnchor !== undefined) {
    continuations.push(
      sourceContinuation(
        "bridge.aulink:source:0",
        "Inspect the source behind the first auLink anchor.",
        firstAnchor,
        sourceRangeForAuLinkAnchor(firstAnchor),
      ),
    );
  }
  return continuations;
}

function anchorContinuations(
  inquiry: Inquiry,
  anchors: readonly AuLinkAnchorRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push({
      id: "bridge.aulink:anchors:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the auLink anchor page.",
      inquiry: {
        ...inquiry,
        page: { size: limit, cursor: String(nextOffset) },
      },
      route: nextPageRoute("Next auLink anchor page."),
    });
  }
  continuations.push({
    id: "bridge.aulink:gaps",
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale: "Inspect catalog and placement gaps for the same filters.",
    inquiry: {
      ...inquiry,
      projection: "gaps",
      page: undefined,
    },
    route: seamRoute("Catalog and placement gaps for the same auLink filters."),
  });
  continuations.push({
    id: "bridge.aulink:targets",
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale: "Resolve these anchors against Aurelia framework declarations.",
    inquiry: {
      ...inquiry,
      projection: "targets",
      page: undefined,
    },
    route: mirrorTargetRoute(
      "Framework declaration targets for these auLink anchors.",
    ),
  });
  for (const [index, anchor] of anchors.slice(0, 3).entries()) {
    continuations.push(
      sourceContinuation(
        `bridge.aulink:anchors:source:${index}`,
        "Inspect the decorator source for this auLink anchor.",
        anchor,
        sourceRangeForAuLinkAnchor(anchor),
      ),
    );
    continuations.push({
      id: `bridge.aulink:anchors:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Inspect TypeChecker facts for the decorated product declaration.",
      inquiry: {
        lens: LensId.TsType,
        locus: {
          kind: LocusKind.SourceRange,
          range: sourceRangeForAuLinkTarget(anchor),
        },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidenceForAnchor(anchor)],
      route: typeFactsRoute(
        "Type facts for the decorated product declaration.",
      ),
    });
  }
  return continuations;
}

function targetContinuations(
  inquiry: Inquiry,
  targets: readonly AuLinkFrameworkTargetResolution[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push({
      id: "bridge.aulink:targets:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the auLink framework target page.",
      inquiry: {
        ...inquiry,
        page: { size: limit, cursor: String(nextOffset) },
      },
      route: nextPageRoute("Next auLink framework target page."),
    });
  }
  continuations.push({
    id: "bridge.aulink:anchors",
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale: "Return to product-side auLink placements for the same filters.",
    inquiry: {
      ...inquiry,
      projection: "anchors",
      page: undefined,
    },
    route: projectionRoute("Return to product-side auLink placements."),
  });
  for (const [index, target] of targets.slice(0, 3).entries()) {
    const firstCandidate = target.candidates[0];
    if (firstCandidate === undefined) {
      continue;
    }
    continuations.push({
      id: `bridge.aulink:targets:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect the framework declaration resolved by this auLink id.",
      inquiry: {
        lens: LensId.TsSource,
        locus: {
          kind: LocusKind.SourceRange,
          range: sourceRangeForAuLinkFrameworkCandidate(firstCandidate),
        },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidenceForFrameworkCandidate(firstCandidate)],
      route: sourceRoute("Framework declaration source for an auLink target."),
    });
    continuations.push({
      id: `bridge.aulink:targets:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for the framework declaration.",
      inquiry: {
        lens: LensId.TsType,
        locus: {
          kind: LocusKind.SourceRange,
          range: sourceRangeForAuLinkFrameworkCandidate(firstCandidate),
        },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidenceForFrameworkCandidate(firstCandidate)],
      route: typeFactsRoute(
        "Type facts for the framework declaration resolved by auLink.",
      ),
    });
  }
  return continuations;
}

function gapContinuations(
  inquiry: Inquiry,
  gaps: readonly AuLinkGapRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push({
      id: "bridge.aulink:gaps:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the auLink gap page.",
      inquiry: {
        ...inquiry,
        page: { size: limit, cursor: String(nextOffset) },
      },
      route: nextPageRoute("Next auLink gap page."),
    });
  }
  continuations.push({
    id: "bridge.aulink:anchors",
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale: "Inspect decorator placements for the same filters.",
    inquiry: {
      ...inquiry,
      projection: "anchors",
      page: undefined,
    },
    route: projectionRoute("Decorator placements for the same auLink filters."),
  });
  for (const [index, gap] of gaps.slice(0, 3).entries()) {
    const source = sourceRangeForGap(gap);
    if (source === null) {
      continue;
    }
    continuations.push({
      id: `bridge.aulink:gaps:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect the source behind this auLink gap.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidenceForGap(gap)],
      route: sourceRoute("Source range behind an auLink gap."),
    });
  }
  return continuations;
}

function sourceContinuation(
  id: string,
  rationale: string,
  anchor: AuLinkAnchorRow,
  range: SourceRange,
): Continuation {
  return {
    id,
    kind: ContinuationKind.InspectEvidence,
    priority: ContinuationPriority.Secondary,
    rationale,
    inquiry: {
      lens: LensId.TsSource,
      locus: { kind: LocusKind.SourceRange, range },
      projection: "text",
    },
    evidence: [evidenceForAnchor(anchor)],
    route: sourceRoute("Source range behind an auLink anchor."),
  };
}

function nextPageRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Addressing,
    NavigationRelation.NextPageOf,
    [],
    summary,
  );
}

function projectionRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Semantic,
    NavigationRelation.ProjectionOf,
    [BasisKind.AuLink],
    summary,
  );
}

function sourceRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Inspection,
    NavigationRelation.SourceFor,
    [BasisKind.SourceText, BasisKind.TypeScriptProgram],
    summary,
  );
}

function typeFactsRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Inspection,
    NavigationRelation.TypeFactsFor,
    [BasisKind.TypeScriptChecker],
    summary,
  );
}

function mirrorTargetRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Semantic,
    NavigationRelation.MirrorTargetOf,
    [BasisKind.AuLink, BasisKind.TypeScriptChecker],
    summary,
  );
}

function seamRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Semantic,
    NavigationRelation.SeamFor,
    [BasisKind.AuLink],
    summary,
  );
}

function continuationRoute(
  plane: NavigationPlane,
  relation: NavigationRelation,
  basis: readonly BasisKind[],
  summary: string,
): NavigationRouteClaim {
  return { plane, relation, basis, summary };
}

function evidenceForAnchor(anchor: AuLinkAnchorRow): Evidence {
  return {
    id: anchor.id,
    kind: EvidenceKind.AuLinkAnchor,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${anchor.target.name ?? "<anonymous>"} -> ${anchor.linkId}`,
    source: sourceRangeForAuLinkAnchor(anchor),
    handle: handleForAnchor(anchor),
    data: anchor,
  };
}

function evidenceForGap(gap: AuLinkGapRow): Evidence {
  return {
    id: gap.id,
    kind: EvidenceKind.OpenSeam,
    role: EvidenceRole.Diagnostic,
    confidence: EvidenceConfidence.Exact,
    summary: summaryForGap(gap),
    ...(sourceRangeForGap(gap) === null
      ? {}
      : { source: sourceRangeForGap(gap) ?? undefined }),
    handle: handleForGap(gap),
    data: gap,
  };
}

function evidenceForFrameworkTarget(
  target: AuLinkFrameworkTargetResolution,
): readonly Evidence[] {
  if (target.candidates.length === 0) {
    return [
      {
        id: target.id,
        kind: EvidenceKind.OpenSeam,
        role: EvidenceRole.Boundary,
        confidence: EvidenceConfidence.Exact,
        summary: `${target.linkId} framework target is ${target.status}.`,
        handle: handleForFrameworkTarget(target),
        data: target,
      },
    ];
  }
  return target.candidates.map(evidenceForFrameworkCandidate);
}

function evidenceForFrameworkCandidate(
  candidate: AuLinkFrameworkTargetCandidate,
): Evidence {
  return {
    id: candidate.id,
    kind: EvidenceKind.Symbol,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${candidate.linkId} -> ${candidate.kind} ${candidate.symbolName}`,
    source: sourceRangeForAuLinkFrameworkCandidate(candidate),
    handle: {
      namespace: HandleNamespace.Framework,
      kind: HandleKind.EvaluatorValue,
      id: candidate.id,
      label: candidate.linkId,
      summary: candidate.file.repoPath,
    },
    data: candidate,
  };
}

function openSeamForGap(gap: AuLinkGapRow): OpenSeam {
  return {
    id: gap.id,
    kind: OpenSeamKind.Unknown,
    summary: summaryForGap(gap),
    evidence: evidenceForGap(gap),
    basis: {
      kind: BasisKind.AuLink,
      closure: BasisClosure.Open,
      authority: BasisAuthority.Product,
      freshness: BasisFreshness.Live,
      summary:
        "auLink catalog and placement comparison exposed an unresolved bridge gap.",
    },
    handle: handleForGap(gap),
    data: gap,
  };
}

function openSeamForFrameworkTarget(
  target: AuLinkFrameworkTargetResolution,
): OpenSeam {
  return {
    id: target.id,
    kind:
      target.status === "ambiguous"
        ? OpenSeamKind.UnresolvedSymbol
        : OpenSeamKind.InsufficientBasis,
    summary: `auLink id ${target.linkId} framework target is ${target.status}.`,
    evidence: evidenceForFrameworkTarget(target)[0],
    basis: {
      kind: BasisKind.TypeScriptProgram,
      closure: BasisClosure.Open,
      authority: BasisAuthority.Checker,
      freshness: BasisFreshness.Live,
      summary:
        "Framework target resolution could not close to exactly one declaration.",
    },
    handle: handleForFrameworkTarget(target),
    data: target,
  };
}

function summaryForGap(gap: AuLinkGapRow): string {
  switch (gap.kind) {
    case AuLinkGapKind.CatalogUnplaced:
      return `Catalog id ${gap.linkId} has no decorator placement.`;
    case AuLinkGapKind.PlacementWithoutCatalog:
      return `Decorator placement ${gap.linkId} is not declared by the auLink catalog.`;
    case AuLinkGapKind.DuplicatePlacement:
      return `auLink id ${gap.linkId} has ${gap.count} decorator placements.`;
  }
}

function sourceRangeForGap(gap: AuLinkGapRow): SourceRange | null {
  const firstAnchor = gap.anchors[0];
  if (firstAnchor !== undefined) {
    return sourceRangeForAuLinkAnchor(firstAnchor);
  }
  return gap.catalog === undefined
    ? null
    : sourceRangeForAuLinkCatalog(gap.catalog);
}

function handleForAnchor(anchor: AuLinkAnchorRow): InquiryHandle {
  return {
    namespace: HandleNamespace.Product,
    kind: HandleKind.AuLinkAnchor,
    id: anchor.id,
    label: anchor.linkId,
    summary: anchor.target.name ?? undefined,
  };
}

function handleForGap(gap: AuLinkGapRow): InquiryHandle {
  return {
    namespace: HandleNamespace.Product,
    kind: HandleKind.OpenSeam,
    id: gap.id,
    label: gap.linkId,
    summary: gap.kind,
  };
}

function handleForFrameworkTarget(
  target: AuLinkFrameworkTargetResolution,
): InquiryHandle {
  return {
    namespace: HandleNamespace.Framework,
    kind: HandleKind.EvaluatorValue,
    id: target.id,
    label: target.linkId,
    summary: target.status,
  };
}

function auLinkBasis(sourceProject: SourceProject): Basis {
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

function checkerBasis(sourceProject: SourceProject): Basis {
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

function frameworkBasis(sourceProject: SourceProject): Basis {
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

function pageRows<TValue>(
  rows: readonly TValue[],
  offset: number,
  limit: number,
): { readonly rows: readonly TValue[]; readonly nextOffset?: number } {
  const page = rows.slice(offset, offset + limit);
  const nextOffset =
    offset + page.length < rows.length ? offset + page.length : undefined;
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
