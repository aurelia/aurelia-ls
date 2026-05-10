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
  type OpenSeam,
} from "../evidence.js";
import { HandleKind, HandleNamespace, type InquiryHandle } from "../handle.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind, type SourceRange } from "../locus.js";
import { PagedRowFamily } from "../paged-row-family.js";
import {
  evidenceLimit,
  pageOffset,
  rowLimit,
} from "../paging.js";
import {
  AuLinkGapKind,
  readAuLinkModel,
  sourceRangeForAuLinkAnchor,
  sourceRangeForAuLinkFileSpan,
  sourceRangeForAuLinkTarget,
  type AuLinkAnchorRow,
  type AuLinkCatalogEntry,
  type AuLinkFrameworkTargetCandidate,
  type AuLinkFrameworkTargetResolution,
  type AuLinkGapRow,
  type AuLinkModel,
  type AuLinkRollup,
  type SourceProject,
} from "../../source/index.js";
import {
  readAuLinkMirrorModel,
  type AuLinkMirrorFilters,
  type AuLinkMirrorObligationEvidenceRow,
  type AuLinkMirrorRoleEvidenceRow,
  type AuLinkMirrorRollup,
  type AuLinkMirrorRow,
} from "./bridge-aulink-mirror.js";
import {
  answerBridgeAuLinkUsageProjection,
  type BridgeAuLinkUsageValue,
} from "./bridge-aulink-usage-lenses.js";
export type { AuLinkUsageComparisonSummaryRow } from "./bridge-aulink-usage-lenses.js";
import {
  AULINK_MIRROR_DETAIL_BUDGET,
  auLinkBasis,
  auLinkCheckerBasis,
  frameworkBasis,
  isUnscopedBridgeInquiry,
  mirrorProjectionContinuation,
  mirrorTargetRoute,
  nextPageRoute,
  ownerProjectionContinuation,
  projectionRoute,
  seamRoute,
  sourceRangeContinuation,
  sourceRoute,
  typeFactsRoute,
} from "./bridge-aulink-lens-support.js";

/** Value returned by the bridge.aulink runtime lens. */
export interface BridgeAuLinkValue extends BridgeAuLinkUsageValue {
  /** Rollup for the higher-order mirror model, when requested. */
  readonly mirrorRollup?: AuLinkMirrorRollup;
  /** Catalog rows included for catalog-aware projections. */
  readonly catalog?: readonly AuLinkCatalogEntry[];
  /** Anchor rows included for anchor projections. */
  readonly anchors?: readonly AuLinkAnchorRow[];
  /** Framework-side target rows included for target projections. */
  readonly targets?: readonly AuLinkFrameworkTargetResolution[];
  /** Gap rows included for gap projections. */
  readonly gaps?: readonly AuLinkGapRow[];
  /** Compact per-auLink mirror rows joined to framework semantic role evidence. */
  readonly mirror?: readonly AuLinkMirrorRow[];
  /** Exact framework relationship rows matched to auLink targets. */
  readonly roleEvidence?: readonly AuLinkMirrorRoleEvidenceRow[];
  /** Exact emulation obligation rows matched to auLink targets. */
  readonly obligations?: readonly AuLinkMirrorObligationEvidenceRow[];
}

const AULINK_ANCHOR_ROW_FAMILY = new PagedRowFamily<AuLinkAnchorRow>({
  id: "bridge.aulink:anchors",
  rowLabel: "auLink anchor row(s)",
  evidenceForRow: evidenceForAnchor,
  continuationsForPage: auLinkAnchorContinuations,
});

const AULINK_GAP_ROW_FAMILY = new PagedRowFamily<AuLinkGapRow>({
  id: "bridge.aulink:gaps",
  rowLabel: "auLink gap row(s)",
  evidenceForRow: evidenceForGap,
  continuationsForPage: gapContinuations,
});

const AULINK_FRAMEWORK_TARGET_ROW_FAMILY =
  new PagedRowFamily<AuLinkFrameworkTargetResolution>({
    id: "bridge.aulink:targets",
    rowLabel: "auLink framework target row(s)",
    evidenceForRow: evidenceForFrameworkTarget,
    continuationsForPage: targetContinuations,
  });

const AULINK_MIRROR_ROW_FAMILY =
  new PagedRowFamily<AuLinkMirrorRow>({
    id: "bridge.aulink:mirror",
    rowLabel: "auLink mirror row(s)",
    evidenceForRow: evidenceForMirrorRow,
    continuationsForPage: mirrorContinuations,
  });

const AULINK_ROLE_EVIDENCE_ROW_FAMILY =
  new PagedRowFamily<AuLinkMirrorRoleEvidenceRow>({
    id: "bridge.aulink:role-evidence",
    rowLabel: "auLink mirror role evidence row(s)",
    evidenceForRow: evidenceForRoleEvidence,
    continuationsForPage: roleEvidenceContinuations,
  });

const AULINK_OBLIGATION_ROW_FAMILY =
  new PagedRowFamily<AuLinkMirrorObligationEvidenceRow>({
    id: "bridge.aulink:obligations",
    rowLabel: "auLink mirror obligation row(s)",
    evidenceForRow: evidenceForObligationEvidence,
    continuationsForPage: obligationContinuations,
  });

/** Answer auLink bridge inquiries from semantic-runtime source and TypeChecker state. */
export function answerBridgeAuLink(
  /** Inquiry being answered. */
  inquiry: Inquiry,
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
): Answer<BridgeAuLinkValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = auLinkMirrorFiltersFromInquiry(inquiry);
  const model = readAuLinkModel(sourceProject, filters);
  const limit = rowLimit(inquiry);
  const offset = pageOffset(inquiry);

  if (projection === "anchors") {
    return AULINK_ANCHOR_ROW_FAMILY.answer({
      inquiry,
      rows: model.anchors,
      limit,
      offset,
      basis: [auLinkBasis(sourceProject), auLinkCheckerBasis(sourceProject)],
      value: (page) => ({
        filters,
        rollup: model.rollup,
        anchors: page.rows,
      }),
      openSeams: () =>
        model.gaps.slice(0, evidenceLimit(inquiry)).map(openSeamForGap),
    });
  }

  if (projection === "gaps") {
    return AULINK_GAP_ROW_FAMILY.answer({
      inquiry,
      rows: model.gaps,
      limit,
      offset,
      basis: [auLinkBasis(sourceProject), auLinkCheckerBasis(sourceProject)],
      value: (page) => ({
        filters,
        rollup: model.rollup,
        gaps: page.rows,
      }),
      openSeams: (page) =>
        page.rows.slice(0, evidenceLimit(inquiry)).map(openSeamForGap),
    });
  }

  if (projection === "targets") {
    return AULINK_FRAMEWORK_TARGET_ROW_FAMILY.answer({
      inquiry,
      rows: model.frameworkTargets,
      limit,
      offset,
      basis: [
        auLinkBasis(sourceProject),
        auLinkCheckerBasis(sourceProject),
        frameworkBasis(sourceProject),
      ],
      value: (page) => ({
        filters,
        rollup: model.rollup,
        targets: page.rows,
      }),
      openSeams: (page) =>
        page.rows
          .filter((target) => target.status !== "resolved")
          .slice(0, evidenceLimit(inquiry))
          .map(openSeamForFrameworkTarget),
    });
  }

  if (projection === "mirror") {
    const mirror = readAuLinkMirrorModel(sourceProject, filters);
    if (isUnscopedBridgeInquiry(inquiry, filters)) {
      return createAnswer(
        inquiry,
        mirror.rollup.linkCount === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        mirrorSummary(mirror, "ask for a filter, row budget, or detail projection to expand rows"),
        {
          value: {
            filters,
            rollup: model.rollup,
            mirrorRollup: mirror.rollup,
          },
          basis: mirrorBasis(sourceProject),
          evidence: [],
          continuations: mirrorOverviewContinuations(inquiry, mirror),
        },
      );
    }
    return AULINK_MIRROR_ROW_FAMILY.answer({
      inquiry,
      rows: mirror.rows,
      limit,
      offset,
      basis: mirrorBasis(sourceProject),
      value: (page) => ({
        filters,
        rollup: model.rollup,
        mirrorRollup: mirror.rollup,
        mirror: page.rows,
      }),
      summary: (page) =>
        mirrorSummary(mirror, `returned ${page.rows.length} mirror row(s)`),
    });
  }

  if (projection === "role-evidence") {
    const mirror = readAuLinkMirrorModel(sourceProject, filters);
    if (isUnscopedBridgeInquiry(inquiry, filters)) {
      return createAnswer(
        inquiry,
        mirror.rollup.roleEvidenceCount === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        mirrorSummary(
          mirror,
          "ask for a roleFamily, sourceLens, linkId, row budget, or page to expand role evidence",
        ),
        {
          value: {
            filters,
            rollup: model.rollup,
            mirrorRollup: mirror.rollup,
          },
          basis: mirrorBasis(sourceProject),
          evidence: [],
          continuations: roleEvidenceOverviewContinuations(inquiry, mirror),
        },
      );
    }
    return AULINK_ROLE_EVIDENCE_ROW_FAMILY.answer({
      inquiry,
      rows: mirror.roleEvidence,
      limit,
      offset,
      basis: mirrorBasis(sourceProject),
      value: (page) => ({
        filters,
        rollup: model.rollup,
        mirrorRollup: mirror.rollup,
        roleEvidence: page.rows,
      }),
      summary: (page) =>
        mirrorSummary(mirror, `returned ${page.rows.length} role evidence row(s)`),
    });
  }

  if (projection === "obligations") {
    const mirror = readAuLinkMirrorModel(sourceProject, filters);
    if (isUnscopedBridgeInquiry(inquiry, filters)) {
      return createAnswer(
        inquiry,
        mirror.rollup.emulationObligationCount === 0
          ? OutcomeKind.Miss
          : OutcomeKind.Hit,
        mirrorSummary(
          mirror,
          "ask for an emulationMode, obligationKind, linkId, row budget, or page to expand obligations",
        ),
        {
          value: {
            filters,
            rollup: model.rollup,
            mirrorRollup: mirror.rollup,
          },
          basis: mirrorBasis(sourceProject),
          evidence: [],
          continuations: obligationOverviewContinuations(inquiry, mirror),
        },
      );
    }
    return AULINK_OBLIGATION_ROW_FAMILY.answer({
      inquiry,
      rows: mirror.obligationEvidence,
      limit,
      offset,
      basis: mirrorBasis(sourceProject),
      value: (page) => ({
        filters,
        rollup: model.rollup,
        mirrorRollup: mirror.rollup,
        obligations: page.rows,
      }),
      summary: (page) =>
        mirrorSummary(mirror, `returned ${page.rows.length} obligation row(s)`),
    });
  }

  const usageAnswer = answerBridgeAuLinkUsageProjection({
    inquiry,
    sourceProject,
    filters,
    rollup: model.rollup,
    projection,
    limit,
    offset,
  });
  if (usageAnswer !== undefined) {
    return usageAnswer;
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
    basis: [auLinkBasis(sourceProject), auLinkCheckerBasis(sourceProject)],
    evidence: summaryEvidence(model, inquiry),
    openSeams: model.gaps.slice(0, evidenceLimit(inquiry)).map(openSeamForGap),
    continuations: auLinkSummaryContinuations(inquiry, filters, model),
  });
}

function auLinkMirrorFiltersFromInquiry(inquiry: Inquiry): AuLinkMirrorFilters {
  return {
    ...auLinkMirrorFiltersFromSubject(inquiry.subject),
    ...auLinkMirrorFiltersFromRecord(inquiry.filters),
  };
}

function auLinkMirrorFiltersFromSubject(subject: unknown): AuLinkMirrorFilters {
  if (typeof subject === "string" && subject.includes(":")) {
    return { linkId: subject };
  }
  if (subject !== null && typeof subject === "object") {
    return auLinkMirrorFiltersFromRecord(subject as Record<string, unknown>);
  }
  return {};
}

function auLinkMirrorFiltersFromRecord(
  source: Record<string, unknown> | undefined,
): AuLinkMirrorFilters {
  if (source === undefined) {
    return {};
  }
  return {
    linkId: nonEmptyString(source.linkId),
    packageId: nonEmptyString(source.packageId),
    targetName: nonEmptyString(source.targetName),
    filePath: nonEmptyString(source.filePath),
    frameworkStatus: nonEmptyString(source.frameworkStatus),
    roleFamily: nonEmptyString(source.roleFamily),
    relation: nonEmptyString(source.relation),
    sourceLens: nonEmptyString(source.sourceLens),
    sourceProjection: nonEmptyString(source.sourceProjection),
    emulationLayer: nonEmptyString(source.emulationLayer),
    emulationMode: nonEmptyString(source.emulationMode),
    obligationKind: nonEmptyString(source.obligationKind),
    productArea: nonEmptyString(source.productArea),
    productDeclarationKind: nonEmptyString(source.productDeclarationKind),
    hasRoleEvidence: booleanFilterValue(source.hasRoleEvidence),
    hasEmulationObligations: booleanFilterValue(source.hasEmulationObligations),
    side: nonEmptyString(source.side),
    memberName: nonEmptyString(source.memberName),
    memberAccess: nonEmptyString(source.memberAccess),
    frameworkScopeMode: nonEmptyString(source.frameworkScopeMode),
    frameworkMemberAccess: nonEmptyString(source.frameworkMemberAccess),
    productMemberAccess: nonEmptyString(source.productMemberAccess),
    memberDeclarationKind: nonEmptyString(source.memberDeclarationKind),
    presence: nonEmptyString(source.presence),
    ownerName: nonEmptyString(source.ownerName),
    ownerKind: nonEmptyString(source.ownerKind),
    ownerMemberName: nonEmptyString(source.ownerMemberName),
    usageRole: nonEmptyString(source.usageRole),
    callCalleeName: nonEmptyString(source.callCalleeName),
    callArgumentText: nonEmptyString(source.callArgumentText),
    callArgumentSymbolName: nonEmptyString(source.callArgumentSymbolName),
    callArgumentFullyQualifiedName: nonEmptyString(source.callArgumentFullyQualifiedName),
    query: nonEmptyString(source.query),
    orderBy: nonEmptyString(source.orderBy),
    symbolName: nonEmptyString(source.symbolName) ?? nonEmptyString(source.frameworkSymbol),
  };
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function booleanFilterValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
}

function summaryForRollup(rollup: AuLinkRollup): string {
  const facetText = rollup.multiFacetPlacementGroups === 0
    ? ""
    : `, ${rollup.multiFacetPlacementGroups} multi-facet placement group(s)`;
  return `Read ${rollup.anchors} auLink anchor(s), ${rollup.catalogEntries} catalog entrie(s), ${rollup.gaps} gap row(s)${facetText}, and ${rollup.resolvedFrameworkTargets} resolved framework target(s).`;
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

function auLinkSummaryContinuations(
  inquiry: Inquiry,
  filters: AuLinkMirrorFilters,
  model: AuLinkModel,
): readonly Continuation[] {
  const continuations: Continuation[] = [
    {
      id: "bridge.aulink:mirror",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale:
        "Join auLink anchors to exact framework semantic roles and emulation obligations.",
      inquiry: {
        lens: LensId.BridgeAuLink,
        locus: inquiry.locus,
        subject: filters,
        projection: "mirror",
        budget: inquiry.budget,
      },
      route: projectionRoute(
        "Higher-order mirror rows for the current auLink filters.",
      ),
    },
    {
      id: "bridge.aulink:usage-comparison",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale:
        "Compare Aurelia-side framework API usage with semantic-runtime usage of the auLink mirror targets.",
      inquiry: {
        lens: LensId.BridgeAuLink,
        locus: inquiry.locus,
        subject: filters,
        projection: "usage-comparison",
        budget: inquiry.budget,
      },
      route: projectionRoute(
        "Framework/product usage comparison rows for the current auLink filters.",
      ),
    },
    {
      id: "bridge.aulink:usage-consumers",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Group framework and semantic-runtime usage by the declaration that consumes each auLink target.",
      inquiry: {
        lens: LensId.BridgeAuLink,
        locus: inquiry.locus,
        subject: filters,
        projection: "usage-consumers",
        budget: inquiry.budget ?? AULINK_MIRROR_DETAIL_BUDGET,
      },
      route: projectionRoute(
        "Framework/product usage owner groups for the current auLink filters.",
      ),
    },
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
      id: "bridge.aulink:role-evidence",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Inspect exact framework rows that attach semantic roles to auLink targets.",
      inquiry: {
        lens: LensId.BridgeAuLink,
        locus: inquiry.locus,
        subject: filters,
        projection: "role-evidence",
        budget: inquiry.budget ?? AULINK_MIRROR_DETAIL_BUDGET,
      },
      route: projectionRoute(
        "Framework role evidence behind the current auLink filters.",
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
      auLinkSourceContinuation(
        "bridge.aulink:source:0",
        "Inspect the source behind the first auLink anchor.",
        firstAnchor,
        sourceRangeForAuLinkAnchor(firstAnchor),
      ),
    );
  }
  return continuations;
}

function auLinkAnchorContinuations(
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
    id: "bridge.aulink:mirror",
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Primary,
    rationale:
      "Join these anchors to framework semantic roles and emulation obligations.",
    inquiry: {
      ...inquiry,
      projection: "mirror",
      page: undefined,
    },
    route: projectionRoute("Mirror rows for the same auLink filters."),
  });
  continuations.push({
    id: "bridge.aulink:usage-comparison",
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Primary,
    rationale:
      "Compare Aurelia-side API usage with semantic-runtime usage for the same auLink filters.",
    inquiry: {
      ...inquiry,
      projection: "usage-comparison",
      page: undefined,
    },
    route: projectionRoute("Usage comparison rows for the same auLink filters."),
  });
  continuations.push({
    id: "bridge.aulink:usage-consumers",
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale:
      "Group framework and semantic-runtime usage sites by owner declaration for the same auLink filters.",
    inquiry: {
      ...inquiry,
      projection: "usage-consumers",
      budget: inquiry.budget ?? AULINK_MIRROR_DETAIL_BUDGET,
      page: undefined,
    },
    route: projectionRoute("Usage owner groups for the same auLink filters."),
  });
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
      auLinkSourceContinuation(
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
    id: "bridge.aulink:mirror",
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Primary,
    rationale:
      "Join these framework targets to semantic role and emulation evidence.",
    inquiry: {
      ...inquiry,
      projection: "mirror",
      page: undefined,
    },
    route: projectionRoute("Mirror rows for the same auLink filters."),
  });
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
          range: sourceRangeForAuLinkFileSpan(firstCandidate),
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
          range: sourceRangeForAuLinkFileSpan(firstCandidate),
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

function auLinkSourceContinuation(
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
    source: sourceRangeForAuLinkFileSpan(candidate),
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

function evidenceForMirrorRow(row: AuLinkMirrorRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.AuLinkAnchor,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.firstProductSource ?? row.firstFrameworkSource,
    handle: {
      namespace: HandleNamespace.Product,
      kind: HandleKind.ProductClaim,
      id: row.id,
      label: row.linkId,
      summary: "auLink mirror row",
    },
    data: row,
  };
}

function evidenceForRoleEvidence(row: AuLinkMirrorRoleEvidenceRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.source,
    handle: {
      namespace: HandleNamespace.Framework,
      kind: HandleKind.EvaluatorValue,
      id: row.id,
      label: row.linkId,
      summary: `${row.roleFamily}/${row.relation}`,
    },
    data: row,
  };
}

function evidenceForObligationEvidence(
  row: AuLinkMirrorObligationEvidenceRow,
): Evidence {
  return {
    id: row.id,
    kind:
      row.mode === "typescript-handoff" ||
      row.mode === "virtualized-runtime" ||
      row.closure === "open"
        ? EvidenceKind.OpenSeam
        : EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence:
      row.closure === "exact"
        ? EvidenceConfidence.Exact
        : row.closure === "open"
          ? EvidenceConfidence.Unknown
          : EvidenceConfidence.Strong,
    summary: row.summary,
    source: row.source,
    handle: {
      namespace: HandleNamespace.Framework,
      kind: HandleKind.EvaluatorValue,
      id: row.id,
      label: row.linkId,
      summary: `${row.layer}/${row.mode}`,
    },
    data: row,
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
    : sourceRangeForAuLinkFileSpan(gap.catalog);
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

function mirrorBasis(sourceProject: SourceProject): readonly Basis[] {
  return [
    auLinkBasis(sourceProject),
    auLinkCheckerBasis(sourceProject),
    frameworkBasis(sourceProject),
    {
      kind: BasisKind.StaticEvaluator,
      closure: BasisClosure.Budgeted,
      authority: BasisAuthority.Evaluator,
      freshness: BasisFreshness.Live,
      summary:
        "Joined auLink targets to Atlas framework relationship and emulation-obligation substrates.",
      identity: sourceProject.snapshot().identity,
    },
  ];
}

function mirrorSummary(
  mirror: {
    readonly rollup: AuLinkMirrorRollup;
  },
  returned: string,
): string {
  return `auLink mirror has ${mirror.rollup.linkCount} link row(s), ${mirror.rollup.roleEvidenceCount} framework role evidence row(s), and ${mirror.rollup.emulationObligationCount} emulation obligation row(s); ${returned}.`;
}

function mirrorOverviewContinuations(
  inquiry: Inquiry,
  mirror: {
    readonly rollup: AuLinkMirrorRollup;
  },
): readonly Continuation[] {
  const continuations: Continuation[] = [
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:mirror:pressure",
      "mirror",
      "Inspect the highest-pressure auLink mirror rows first.",
      { orderBy: "mirrorPressure" },
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:mirror:role-evidence",
      "role-evidence",
      "Inspect exact framework relationship rows behind the mirror.",
      {},
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:mirror:obligations",
      "obligations",
      "Inspect framework emulation obligations behind the mirror.",
      {},
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
  ];
  if (mirror.rollup.linksWithoutRoleEvidence > 0) {
    continuations.push(
      mirrorProjectionContinuation(
        inquiry,
        "bridge.aulink:mirror:without-role-evidence",
        "mirror",
        "Inspect auLink rows that have no attached framework relationship evidence.",
        { hasRoleEvidence: false, orderBy: "emulationObligation" },
        undefined,
        AULINK_MIRROR_DETAIL_BUDGET,
      ),
    );
  }
  if (mirror.rollup.linksWithoutEmulationObligations > 0) {
    continuations.push(
      mirrorProjectionContinuation(
        inquiry,
        "bridge.aulink:mirror:without-emulation-obligations",
        "mirror",
        "Inspect auLink rows that have framework role evidence but no attached emulation obligation.",
        {
          hasRoleEvidence: true,
          hasEmulationObligations: false,
          orderBy: "roleEvidence",
        },
        undefined,
        AULINK_MIRROR_DETAIL_BUDGET,
      ),
    );
  }
  for (const sourceLens of Object.keys(mirror.rollup.sourceLenses).slice(0, 4)) {
    continuations.push(
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:mirror:source-lens:${sourceLens}`,
        "mirror",
        `Inspect mirror rows with ${sourceLens} role evidence.`,
        { sourceLens },
        undefined,
        AULINK_MIRROR_DETAIL_BUDGET,
      ),
    );
  }
  for (const productArea of Object.keys(mirror.rollup.productAreas).slice(0, 4)) {
    continuations.push(
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:mirror:product-area:${productArea}`,
        "mirror",
        `Inspect mirror rows whose product placement is in ${productArea}.`,
        { productArea },
        undefined,
        AULINK_MIRROR_DETAIL_BUDGET,
      ),
    );
  }
  for (const emulationMode of Object.keys(mirror.rollup.emulationModes).slice(0, 4)) {
    continuations.push(
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:mirror:emulation-mode:${emulationMode}`,
        "mirror",
        `Inspect mirror rows with ${emulationMode} obligations.`,
        { emulationMode },
        undefined,
        AULINK_MIRROR_DETAIL_BUDGET,
      ),
    );
  }
  return continuations;
}

function roleEvidenceOverviewContinuations(
  inquiry: Inquiry,
  mirror: {
    readonly rollup: AuLinkMirrorRollup;
  },
): readonly Continuation[] {
  const continuations: Continuation[] = [
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:role-evidence:mirror",
      "mirror",
      "Return to compact auLink mirror rows before selecting role evidence detail.",
      {},
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
  ];
  for (const roleFamily of Object.keys(mirror.rollup.roleFamilies).slice(0, 6)) {
    continuations.push(
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:role-evidence:family:${roleFamily}`,
        "role-evidence",
        `Inspect ${roleFamily} role evidence rows.`,
        { roleFamily },
        undefined,
        AULINK_MIRROR_DETAIL_BUDGET,
      ),
    );
  }
  for (const sourceLens of Object.keys(mirror.rollup.sourceLenses).slice(0, 6)) {
    continuations.push(
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:role-evidence:source-lens:${sourceLens}`,
        "role-evidence",
        `Inspect role evidence rows owned by ${sourceLens}.`,
        { sourceLens },
        undefined,
        AULINK_MIRROR_DETAIL_BUDGET,
      ),
    );
  }
  return continuations;
}

function obligationOverviewContinuations(
  inquiry: Inquiry,
  mirror: {
    readonly rollup: AuLinkMirrorRollup;
  },
): readonly Continuation[] {
  const continuations: Continuation[] = [
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:obligations:mirror",
      "mirror",
      "Return to compact auLink mirror rows before selecting obligation detail.",
      {},
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
  ];
  for (const emulationMode of Object.keys(mirror.rollup.emulationModes).slice(0, 6)) {
    continuations.push(
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:obligations:mode:${emulationMode}`,
        "obligations",
        `Inspect ${emulationMode} obligation rows.`,
        { emulationMode },
        undefined,
        AULINK_MIRROR_DETAIL_BUDGET,
      ),
    );
  }
  for (const obligationKind of Object.keys(mirror.rollup.obligationKinds).slice(0, 6)) {
    continuations.push(
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:obligations:kind:${obligationKind}`,
        "obligations",
        `Inspect ${obligationKind} obligation rows.`,
        { obligationKind },
        undefined,
        AULINK_MIRROR_DETAIL_BUDGET,
      ),
    );
  }
  return continuations;
}

function mirrorContinuations(
  inquiry: Inquiry,
  rows: readonly AuLinkMirrorRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push({
      id: "bridge.aulink:mirror:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the auLink mirror page.",
      inquiry: {
        ...inquiry,
        page: { size: limit, cursor: String(nextOffset) },
      },
      route: nextPageRoute("Next auLink mirror page."),
    });
  }
  continuations.push(
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:mirror:role-evidence",
      "role-evidence",
      "Inspect exact framework role evidence for these mirror rows.",
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:mirror:obligations",
      "obligations",
      "Inspect emulation obligations attached to these mirror rows.",
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const evidence = evidenceForMirrorRow(row);
    continuations.push(
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:mirror:role-evidence:${index}`,
        "role-evidence",
        "Inspect exact framework role rows for this auLink id.",
        { linkId: row.linkId },
        evidence,
      ),
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:mirror:obligations:${index}`,
        "obligations",
        "Inspect emulation obligations for this auLink id.",
        { linkId: row.linkId },
        evidence,
      ),
    );
    if (row.firstProductSource !== undefined) {
      continuations.push(
        sourceRangeContinuation(
          `bridge.aulink:mirror:product-source:${index}`,
          "Inspect the product placement source for this mirror row.",
          row.firstProductSource,
          evidence,
        ),
      );
    }
    if (row.firstFrameworkSource !== undefined) {
      continuations.push(
        sourceRangeContinuation(
          `bridge.aulink:mirror:framework-source:${index}`,
          "Inspect the framework target source for this mirror row.",
          row.firstFrameworkSource,
          evidence,
        ),
      );
    }
  }
  return continuations;
}

function roleEvidenceContinuations(
  inquiry: Inquiry,
  rows: readonly AuLinkMirrorRoleEvidenceRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push({
      id: "bridge.aulink:role-evidence:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the auLink mirror role evidence page.",
      inquiry: {
        ...inquiry,
        page: { size: limit, cursor: String(nextOffset) },
      },
      route: nextPageRoute("Next auLink mirror role evidence page."),
    });
  }
  continuations.push(
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:role-evidence:mirror",
      "mirror",
      "Return to compact mirror rows for the same filters.",
    ),
  );
  for (const [index, row] of rows.slice(0, 4).entries()) {
    const evidence = evidenceForRoleEvidence(row);
    continuations.push(
      sourceRangeContinuation(
        `bridge.aulink:role-evidence:source:${index}`,
        "Inspect the source behind this framework role row.",
        row.source,
        evidence,
      ),
      ownerProjectionContinuation(
        inquiry,
        `bridge.aulink:role-evidence:owner:${index}`,
        row.sourceLens,
        row.sourceProjection,
        row.detailFilters,
        "Inspect the framework projection that owns this role row.",
        evidence,
        row.basis,
      ),
    );
  }
  return continuations;
}

function obligationContinuations(
  inquiry: Inquiry,
  rows: readonly AuLinkMirrorObligationEvidenceRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push({
      id: "bridge.aulink:obligations:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the auLink mirror obligation page.",
      inquiry: {
        ...inquiry,
        page: { size: limit, cursor: String(nextOffset) },
      },
      route: nextPageRoute("Next auLink mirror obligation page."),
    });
  }
  continuations.push(
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:obligations:mirror",
      "mirror",
      "Return to compact mirror rows for the same filters.",
    ),
  );
  for (const [index, row] of rows.slice(0, 4).entries()) {
    const evidence = evidenceForObligationEvidence(row);
    if (row.source !== undefined) {
      continuations.push(
        sourceRangeContinuation(
          `bridge.aulink:obligations:source:${index}`,
          "Inspect the source behind this emulation obligation.",
          row.source,
          evidence,
        ),
      );
    }
    continuations.push(
      ownerProjectionContinuation(
        inquiry,
        `bridge.aulink:obligations:owner:${index}`,
        row.sourceLens,
        row.sourceProjection,
        row.detailFilters,
        "Inspect the framework projection that owns this obligation.",
        evidence,
        row.basis,
      ),
    );
  }
  return continuations;
}
