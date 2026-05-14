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
  evidenceBreadcrumb,
  type Evidence,
} from "../evidence.js";
import { HandleKind, HandleNamespace } from "../handle.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import type { SourceRange } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
  navigationRoute,
} from "../navigation.js";
import { PagedRowFamily } from "../paged-row-family.js";
import {
  type AuLinkRollup,
  type SourceProject,
} from "../../source/index.js";
import type { AuLinkMirrorFilters } from "./bridge-aulink-mirror.js";
import {
  readAuLinkUsageComparisonModel,
  type AuLinkMemberSurfaceRow,
  type AuLinkUsageConsumerRow,
  type AuLinkUsageComparisonRollup,
  type AuLinkUsageComparisonRow,
  type AuLinkUsageMemberComparisonRow,
  type AuLinkUsageSiteRow,
} from "./bridge-aulink-usage.js";
import {
  AULINK_MIRROR_DETAIL_BUDGET,
  auLinkBasis,
  callSitesRangeContinuation,
  auLinkCheckerBasis,
  frameworkBasis,
  isUnscopedBridgeInquiry,
  mirrorProjectionContinuation,
  nextPageRoute,
  sourceRangeContinuation,
} from "./bridge-aulink-lens-support.js";
import {
  callSiteArgumentFilters,
  singletonRecordFilter,
  stringField,
} from "./lens-filter-utils.js";

/** Compact public row for per-link usage comparison. */
export interface AuLinkUsageComparisonSummaryRow {
  readonly id: string;
  readonly linkId: string;
  readonly packageId: string;
  readonly symbolName: string;
  readonly targetStatus: string;
  readonly placementCount: number;
  readonly frameworkCandidateCount: number;
  readonly productTargetNames: readonly string[];
  readonly productAreas: Readonly<Record<string, number>>;
  readonly frameworkUsageScope: string;
  readonly frameworkSubjectNames: readonly string[];
  readonly frameworkUsageCount: number;
  readonly frameworkMemberUsageCount: number;
  readonly productUsageCount: number;
  readonly productMemberUsageCount: number;
  readonly frameworkMemberNameCount: number;
  readonly productMemberNameCount: number;
  readonly sharedMemberNameCount: number;
  readonly frameworkOnlyMemberNameCount: number;
  readonly productOnlyMemberNameCount: number;
  readonly publicSharedMemberNameCount: number;
  readonly publicFrameworkOnlyMemberNameCount: number;
  readonly publicProductOnlyMemberNameCount: number;
  readonly publicMemberDivergenceCount: number;
  readonly frameworkConsumerPackages: Readonly<Record<string, number>>;
  readonly productConsumerAreas: Readonly<Record<string, number>>;
  readonly frameworkUsageRoles: Readonly<Record<string, number>>;
  readonly productUsageRoles: Readonly<Record<string, number>>;
  readonly firstProductSource?: SourceRange;
  readonly firstFrameworkSource?: SourceRange;
  readonly summary: string;
}

/** Value lanes owned by the bridge.aulink usage-comparison projections. */
export interface BridgeAuLinkUsageValue {
  /** Exact filters applied to the auLink model. */
  readonly filters: AuLinkMirrorFilters;
  /** Rollup for the filtered auLink model. */
  readonly rollup: AuLinkRollup;
  /** Rollup for framework/product usage comparison, when requested. */
  readonly usageComparisonRollup?: AuLinkUsageComparisonRollup;
  /** Per-link comparison between Aurelia-side API usage and semantic-runtime mirror usage. */
  readonly usageComparison?: readonly AuLinkUsageComparisonSummaryRow[];
  /** Member declaration surface comparison between auLink framework and product targets. */
  readonly memberSurface?: readonly AuLinkMemberSurfaceRow[];
  /** Member-level framework/product usage comparison rows for auLink mirror targets. */
  readonly usageMembers?: readonly AuLinkUsageMemberComparisonRow[];
  /** Exact framework-side or product-side source usage rows for auLink mirror targets. */
  readonly usageSites?: readonly AuLinkUsageSiteRow[];
  /** Usage-site groups by the declaration owner consuming one auLink target/member. */
  readonly usageConsumers?: readonly AuLinkUsageConsumerRow[];
}

interface AnswerBridgeAuLinkUsageProjectionInit {
  readonly inquiry: Inquiry;
  readonly sourceProject: SourceProject;
  readonly filters: AuLinkMirrorFilters;
  readonly rollup: AuLinkRollup;
  readonly projection: string;
  readonly limit: number;
  readonly offset: number;
}

const AULINK_USAGE_COMPARISON_ROW_FAMILY =
  new PagedRowFamily<AuLinkUsageComparisonRow>({
    id: "bridge.aulink:usage-comparison",
    rowLabel: "auLink usage comparison row(s)",
    evidenceForRow: evidenceForUsageComparison,
    continuationsForPage: usageComparisonContinuations,
  });

const AULINK_MEMBER_SURFACE_ROW_FAMILY =
  new PagedRowFamily<AuLinkMemberSurfaceRow>({
    id: "bridge.aulink:member-surface",
    rowLabel: "auLink member surface row(s)",
    evidenceForRow: evidenceForMemberSurface,
    continuationsForPage: memberSurfaceContinuations,
  });

const AULINK_USAGE_MEMBER_ROW_FAMILY =
  new PagedRowFamily<AuLinkUsageMemberComparisonRow>({
    id: "bridge.aulink:usage-members",
    rowLabel: "auLink usage member row(s)",
    evidenceForRow: evidenceForUsageMember,
    continuationsForPage: usageMemberContinuations,
  });

const AULINK_USAGE_SITE_ROW_FAMILY =
  new PagedRowFamily<AuLinkUsageSiteRow>({
    id: "bridge.aulink:usage-sites",
    rowLabel: "auLink usage site row(s)",
    evidenceForRow: evidenceForUsageSite,
    continuationsForPage: usageSiteContinuations,
  });

const AULINK_USAGE_CONSUMER_ROW_FAMILY =
  new PagedRowFamily<AuLinkUsageConsumerRow>({
    id: "bridge.aulink:usage-consumers",
    rowLabel: "auLink usage consumer row(s)",
    evidenceForRow: evidenceForAuLinkUsageConsumer,
    continuationsForPage: auLinkUsageConsumerContinuations,
  });

/** Answer one bridge.aulink usage projection, or decline non-usage projections. */
export function answerBridgeAuLinkUsageProjection(
  init: AnswerBridgeAuLinkUsageProjectionInit,
): Answer<BridgeAuLinkUsageValue> | undefined {
  const {
    inquiry,
    sourceProject,
    filters,
    rollup,
    projection,
    limit,
    offset,
  } = init;

  if (projection === "usage-comparison") {
    const comparison = readAuLinkUsageComparisonModel(sourceProject, filters, {
      queryScope: "row",
    });
    if (isUnscopedBridgeInquiry(inquiry, filters)) {
      return createAnswer(
        inquiry,
        comparison.rollup.linkCount === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        usageComparisonSummary(
          comparison,
          "ask for a packageId, linkId, productArea, row budget, or page to expand comparison rows",
        ),
        {
          value: {
            filters,
            rollup,
            usageComparisonRollup: comparison.rollup,
          },
          basis: usageComparisonBasis(sourceProject),
          evidence: [],
          continuations: usageComparisonOverviewContinuations(inquiry, comparison),
        },
      );
    }
    return AULINK_USAGE_COMPARISON_ROW_FAMILY.answer({
      inquiry,
      rows: comparison.rows,
      limit,
      offset,
      basis: usageComparisonBasis(sourceProject),
      value: (page) => ({
        filters,
        rollup,
        usageComparisonRollup: comparison.rollup,
        usageComparison: page.rows.map((row) =>
          compactUsageComparisonRow(row, comparison.surfaceRows),
        ),
      }),
      summary: (page) =>
        usageComparisonSummary(comparison, `returned ${page.rows.length} comparison row(s)`),
    });
  }

  if (projection === "member-surface") {
    const comparison = readAuLinkUsageComparisonModel(sourceProject, filters, {
      queryScope: "detail",
    });
    if (isUnscopedBridgeInquiry(inquiry, filters)) {
      return createAnswer(
        inquiry,
        comparison.rollup.linkCount === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        usageComparisonSummary(
          comparison,
          "ask for a packageId, linkId, memberName, side, presence, row budget, or page to expand member declaration surface rows",
        ),
        {
          value: {
            filters,
            rollup,
            usageComparisonRollup: comparison.rollup,
          },
          basis: usageComparisonBasis(sourceProject),
          evidence: [],
          continuations: memberSurfaceOverviewContinuations(inquiry),
        },
      );
    }
    return AULINK_MEMBER_SURFACE_ROW_FAMILY.answer({
      inquiry,
      rows: comparison.surfaceRows,
      limit,
      offset,
      basis: usageComparisonBasis(sourceProject),
      value: (page) => ({
        filters,
        rollup,
        usageComparisonRollup: comparison.rollup,
        memberSurface: page.rows,
      }),
      summary: (page) =>
        usageDetailSummary(
          comparison,
          "member surface",
          comparison.surfaceRows.length,
          page.rows.length,
        ),
    });
  }

  if (projection === "usage-members") {
    const comparison = readAuLinkUsageComparisonModel(sourceProject, filters, {
      queryScope: "detail",
    });
    if (isUnscopedBridgeInquiry(inquiry, filters)) {
      return createAnswer(
        inquiry,
        comparison.rollup.linkCount === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        usageComparisonSummary(
          comparison,
          "ask for a packageId, linkId, memberName, side, presence, row budget, or page to expand member rows",
        ),
        {
          value: {
            filters,
            rollup,
            usageComparisonRollup: comparison.rollup,
          },
          basis: usageComparisonBasis(sourceProject),
          evidence: [],
          continuations: usageMemberOverviewContinuations(inquiry),
        },
      );
    }
    return AULINK_USAGE_MEMBER_ROW_FAMILY.answer({
      inquiry,
      rows: comparison.memberRows,
      limit,
      offset,
      basis: usageComparisonBasis(sourceProject),
      value: (page) => ({
        filters,
        rollup,
        usageComparisonRollup: comparison.rollup,
        usageMembers: page.rows,
      }),
      summary: (page) =>
        usageDetailSummary(
          comparison,
          "member",
          comparison.memberRows.length,
          page.rows.length,
        ),
    });
  }

  if (projection === "usage-sites") {
    const comparison = readAuLinkUsageComparisonModel(sourceProject, filters, {
      queryScope: "detail",
    });
    if (isUnscopedBridgeInquiry(inquiry, filters)) {
      return createAnswer(
        inquiry,
        comparison.rollup.linkCount === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        usageComparisonSummary(
          comparison,
          "ask for a packageId, linkId, memberName, side, productArea, row budget, or page to expand exact usage sites",
        ),
        {
          value: {
            filters,
            rollup,
            usageComparisonRollup: comparison.rollup,
          },
          basis: usageComparisonBasis(sourceProject),
          evidence: [],
          continuations: usageSiteOverviewContinuations(inquiry),
        },
      );
    }
    return AULINK_USAGE_SITE_ROW_FAMILY.answer({
      inquiry,
      rows: comparison.siteRows,
      limit,
      offset,
      basis: usageComparisonBasis(sourceProject),
      value: (page) => ({
        filters,
        rollup,
        usageComparisonRollup: comparison.rollup,
        usageSites: page.rows,
      }),
      summary: (page) =>
        usageDetailSummary(
          comparison,
          "usage site",
          comparison.siteRows.length,
          page.rows.length,
        ),
    });
  }

  if (projection === "usage-consumers") {
    const comparison = readAuLinkUsageComparisonModel(sourceProject, filters, {
      queryScope: "detail",
    });
    if (isUnscopedBridgeInquiry(inquiry, filters)) {
      return createAnswer(
        inquiry,
        comparison.rollup.linkCount === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        usageComparisonSummary(
          comparison,
          "ask for a packageId, linkId, memberName, side, ownerName, productArea, row budget, or page to expand usage consumer rows",
        ),
        {
          value: {
            filters,
            rollup,
            usageComparisonRollup: comparison.rollup,
          },
          basis: usageComparisonBasis(sourceProject),
          evidence: [],
          continuations: usageConsumerOverviewContinuations(inquiry),
        },
      );
    }
    return AULINK_USAGE_CONSUMER_ROW_FAMILY.answer({
      inquiry,
      rows: comparison.consumerRows,
      limit,
      offset,
      basis: usageComparisonBasis(sourceProject),
      value: (page) => ({
        filters,
        rollup,
        usageComparisonRollup: comparison.rollup,
        usageConsumers: page.rows,
      }),
      summary: (page) =>
        usageDetailSummary(
          comparison,
          "usage consumer",
          comparison.consumerRows.length,
          page.rows.length,
        ),
    });
  }

  return undefined;
}

function evidenceForUsageComparison(row: AuLinkUsageComparisonRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.firstProductSource ?? row.firstFrameworkSource,
    handle: {
      namespace: HandleNamespace.Product,
      kind: HandleKind.ProductClaim,
      id: row.id,
      label: row.linkId,
      summary: "auLink usage comparison row",
    },
    data: compactUsageComparisonEvidence(row),
  };
}

function navigationEvidenceForUsageComparison(row: AuLinkUsageComparisonRow): Evidence {
  return evidenceBreadcrumb(evidenceForUsageComparison(row));
}

function compactUsageComparisonEvidence(
  row: AuLinkUsageComparisonRow,
): Record<string, unknown> {
  return {
    linkId: row.linkId,
    targetStatus: row.targetStatus,
    frameworkUsageScope: row.frameworkUsageScope,
    frameworkUsageCount: row.frameworkUsageCount,
    productUsageCount: row.productUsageCount,
    memberNameCounts: {
      shared: row.sharedMemberNames.length,
      frameworkOnly: row.frameworkOnlyMemberNames.length,
      productOnly: row.productOnlyMemberNames.length,
    },
  };
}

function compactUsageComparisonRow(
  row: AuLinkUsageComparisonRow,
  surfaceRows: readonly AuLinkMemberSurfaceRow[],
): AuLinkUsageComparisonSummaryRow {
  const publicCounts = publicMemberCountsForLink(row, surfaceRows);
  return {
    id: row.id,
    linkId: row.linkId,
    packageId: row.packageId,
    symbolName: row.symbolName,
    targetStatus: row.targetStatus,
    placementCount: row.placementCount,
    frameworkCandidateCount: row.frameworkCandidateCount,
    productTargetNames: row.productTargetNames,
    productAreas: row.productAreas,
    frameworkUsageScope: row.frameworkUsageScope,
    frameworkSubjectNames: row.frameworkSubjectNames,
    frameworkUsageCount: row.frameworkUsageCount,
    frameworkMemberUsageCount: row.frameworkMemberUsageCount,
    productUsageCount: row.productUsageCount,
    productMemberUsageCount: row.productMemberUsageCount,
    frameworkMemberNameCount: row.frameworkMemberNames.length,
    productMemberNameCount: row.productMemberNames.length,
    sharedMemberNameCount: row.sharedMemberNames.length,
    frameworkOnlyMemberNameCount: row.frameworkOnlyMemberNames.length,
    productOnlyMemberNameCount: row.productOnlyMemberNames.length,
    publicSharedMemberNameCount: publicCounts.shared,
    publicFrameworkOnlyMemberNameCount: publicCounts.frameworkOnly,
    publicProductOnlyMemberNameCount: publicCounts.productOnly,
    publicMemberDivergenceCount: publicCounts.frameworkOnly + publicCounts.productOnly,
    frameworkConsumerPackages: row.frameworkConsumerPackages,
    productConsumerAreas: row.productConsumerAreas,
    frameworkUsageRoles: row.frameworkUsageRoles,
    productUsageRoles: row.productUsageRoles,
    firstProductSource: row.firstProductSource,
    firstFrameworkSource: row.firstFrameworkSource,
    summary: row.summary,
  };
}

function publicMemberCountsForLink(
  row: AuLinkUsageComparisonRow,
  surfaceRows: readonly AuLinkMemberSurfaceRow[],
): {
  readonly shared: number;
  readonly frameworkOnly: number;
  readonly productOnly: number;
} {
  let shared = 0;
  let frameworkOnly = 0;
  let productOnly = 0;
  for (const surface of surfaceRows) {
    if (surface.linkId !== row.linkId) {
      continue;
    }
    const frameworkPublic = surface.frameworkAccessKinds.public !== undefined;
    const productPublic = surface.productAccessKinds.public !== undefined;
    if (surface.presence === "both" && frameworkPublic && productPublic) {
      shared++;
    } else if (surface.presence === "framework-only" && frameworkPublic) {
      frameworkOnly++;
    } else if (surface.presence === "product-only" && productPublic) {
      productOnly++;
    }
  }
  return { shared, frameworkOnly, productOnly };
}

function evidenceForMemberSurface(row: AuLinkMemberSurfaceRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.firstProductSource ?? row.firstFrameworkSource,
    handle: {
      namespace: HandleNamespace.Product,
      kind: HandleKind.ProductClaim,
      id: row.id,
      label: `${row.linkId}.${row.memberName}`,
      summary: `member-surface/${row.presence}`,
    },
    data: {
      linkId: row.linkId,
      memberName: row.memberName,
      presence: row.presence,
      frameworkDeclarationCount: row.frameworkDeclarationCount,
      productDeclarationCount: row.productDeclarationCount,
      frameworkDeclarationKinds: row.frameworkDeclarationKinds,
      productDeclarationKinds: row.productDeclarationKinds,
      frameworkUsageCount: row.frameworkUsageCount,
      productUsageCount: row.productUsageCount,
      firstFrameworkSource: row.firstFrameworkSource,
      firstProductSource: row.firstProductSource,
    },
  };
}

function evidenceForUsageMember(row: AuLinkUsageMemberComparisonRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.firstProductSource ?? row.firstFrameworkSource,
    handle: {
      namespace: HandleNamespace.Product,
      kind: HandleKind.ProductClaim,
      id: row.id,
      label: `${row.linkId}.${row.memberName}`,
      summary: row.presence,
    },
    data: {
      linkId: row.linkId,
      memberName: row.memberName,
      presence: row.presence,
      frameworkUsageCount: row.frameworkUsageCount,
      productUsageCount: row.productUsageCount,
    },
  };
}

function evidenceForUsageSite(row: AuLinkUsageSiteRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.source,
    handle: {
      namespace:
        row.side === "framework"
          ? HandleNamespace.Framework
          : HandleNamespace.Product,
      kind:
        row.side === "framework"
          ? HandleKind.EvaluatorValue
          : HandleKind.ProductClaim,
      id: row.id,
      label:
        row.memberName === undefined
          ? row.linkId
          : `${row.linkId}.${row.memberName}`,
      summary: `${row.side}/${row.role}`,
    },
    data: row,
  };
}

function evidenceForAuLinkUsageConsumer(row: AuLinkUsageConsumerRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.firstSource,
    handle: {
      namespace:
        row.side === "framework"
          ? HandleNamespace.Framework
          : HandleNamespace.Product,
      kind:
        row.side === "framework"
          ? HandleKind.EvaluatorValue
          : HandleKind.ProductClaim,
      id: row.id,
      label:
        row.memberName === undefined
          ? row.linkId
          : `${row.linkId}.${row.memberName}`,
      summary:
        row.ownerMemberName === undefined
          ? row.ownerName
          : `${row.ownerName}.${row.ownerMemberName}`,
    },
    data: {
      linkId: row.linkId,
      memberName: row.memberName,
      side: row.side,
      ownerKind: row.ownerKind,
      ownerName: row.ownerName,
      ownerMemberKind: row.ownerMemberKind,
      ownerMemberName: row.ownerMemberName,
      usageCount: row.usageCount,
      usageRoles: row.usageRoles,
    },
  };
}

function usageComparisonBasis(sourceProject: SourceProject): readonly Basis[] {
  return [
    auLinkBasis(sourceProject),
    auLinkCheckerBasis(sourceProject),
    frameworkBasis(sourceProject),
    {
      kind: BasisKind.TypeScriptChecker,
      closure: BasisClosure.Exact,
      authority: BasisAuthority.Checker,
      freshness: BasisFreshness.Live,
      summary:
        "Compared framework API usage rows with semantic-runtime usage rows for auLink mirror target symbols.",
      identity: sourceProject.snapshot().identity,
    },
  ];
}

function usageComparisonSummary(
  comparison: {
    readonly rollup: AuLinkUsageComparisonRollup;
  },
  returned: string,
): string {
  const rollup = comparison.rollup;
  return `auLink usage comparison has ${rollup.linkCount} link row(s): ${rollup.linksWithBothUsage} with usage on both sides, ${rollup.linksWithFrameworkOnlyUsage} framework-only, ${rollup.linksWithProductOnlyUsage} product-only, and ${rollup.linksWithNoUsage} with no non-declaration usage; ${rollup.frameworkUsageCount} framework usage row(s), ${rollup.productUsageCount} product usage row(s), and ${rollup.linksWithMemberDivergence} member-divergent link row(s); ${returned}.`;
}

function usageDetailSummary(
  comparison: {
    readonly rollup: AuLinkUsageComparisonRollup;
  },
  detailKind: string,
  totalDetailRows: number,
  returnedDetailRows: number,
): string {
  const rollup = comparison.rollup;
  return `auLink usage detail selected ${rollup.linkCount} link row(s) with ${totalDetailRows} matching ${detailKind} row(s); returned ${returnedDetailRows}. Link-level totals across selected links: ${rollup.frameworkUsageCount} framework usage row(s), ${rollup.productUsageCount} product usage row(s), and ${rollup.linksWithMemberDivergence} member-divergent link row(s).`;
}

function usageComparisonOverviewContinuations(
  inquiry: Inquiry,
  comparison: {
    readonly rollup: AuLinkUsageComparisonRollup;
  },
): readonly Continuation[] {
  const continuations: Continuation[] = [
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-comparison:mirror",
      "mirror",
      "Return to compact auLink mirror rows before selecting usage detail.",
      {},
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-comparison:members",
      "usage-members",
      "Inspect member-level framework/product usage rows before opening source sites.",
      {},
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-comparison:member-surface",
      "member-surface",
      "Inspect member declaration coverage before interpreting usage divergence.",
      {},
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-comparison:sites",
      "usage-sites",
      "Inspect exact framework-side and product-side usage source sites.",
      {},
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-comparison:consumers",
      "usage-consumers",
      "Group usage sites by the framework or product declaration that consumes the linked target.",
      {},
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
  ];
  for (const packageId of Object.keys(comparison.rollup.packages).slice(0, 6)) {
    continuations.push(
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:usage-comparison:package:${packageId}`,
        "usage-comparison",
        `Inspect usage comparison rows for ${packageId}.`,
        { packageId },
        undefined,
        AULINK_MIRROR_DETAIL_BUDGET,
      ),
    );
  }
  for (const productArea of Object.keys(comparison.rollup.productAreas).slice(0, 6)) {
    continuations.push(
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:usage-comparison:product-area:${productArea}`,
        "usage-comparison",
        `Inspect usage comparison rows with product placements in ${productArea}.`,
        { productArea },
        undefined,
        AULINK_MIRROR_DETAIL_BUDGET,
      ),
    );
  }
  return continuations;
}

function memberSurfaceOverviewContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:member-surface:comparison",
      "usage-comparison",
      "Return to per-link usage comparison rows.",
      {},
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:member-surface:framework-only",
      "member-surface",
      "Inspect members declared on the Aurelia framework side only.",
      { presence: "framework-only" },
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:member-surface:product-only",
      "member-surface",
      "Inspect members declared on the semantic-runtime side only.",
      { presence: "product-only" },
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:member-surface:both",
      "member-surface",
      "Inspect members declared on both sides of the auLink bridge.",
      { presence: "both" },
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
  ];
}

function usageMemberOverviewContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-members:comparison",
      "usage-comparison",
      "Return to per-link usage comparison rows.",
      {},
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-members:framework-only",
      "usage-members",
      "Inspect member rows observed on the Aurelia framework side only.",
      { presence: "framework-only" },
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-members:product-only",
      "usage-members",
      "Inspect member rows observed on the semantic-runtime side only.",
      { presence: "product-only" },
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-members:both",
      "usage-members",
      "Inspect member rows observed on both sides of the auLink bridge.",
      { presence: "both" },
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
  ];
}

function usageSiteOverviewContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-sites:members",
      "usage-members",
      "Return to member-level usage rows before selecting exact source sites.",
      {},
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-sites:consumers",
      "usage-consumers",
      "Group exact source sites by their owning declaration before opening source.",
      {},
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-sites:framework",
      "usage-sites",
      "Inspect exact Aurelia-side usage sites.",
      { side: "framework" },
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-sites:product",
      "usage-sites",
      "Inspect exact semantic-runtime-side usage sites.",
      { side: "product" },
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
  ];
}

function usageConsumerOverviewContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-consumers:sites",
      "usage-sites",
      "Open exact usage source sites for the selected owner/member filters.",
      {},
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-consumers:members",
      "usage-members",
      "Return to member-level usage rows before selecting owner groups.",
      {},
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-consumers:product",
      "usage-consumers",
      "Inspect semantic-runtime owner groups.",
      { side: "product" },
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-consumers:framework",
      "usage-consumers",
      "Inspect Aurelia framework owner groups.",
      { side: "framework" },
      undefined,
      AULINK_MIRROR_DETAIL_BUDGET,
    ),
  ];
}

function usageComparisonContinuations(
  inquiry: Inquiry,
  rows: readonly AuLinkUsageComparisonRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push({
      id: "bridge.aulink:usage-comparison:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the auLink usage comparison page.",
      inquiry: {
        ...inquiry,
        page: { size: limit, cursor: String(nextOffset) },
      },
      route: nextPageRoute("Next auLink usage comparison page."),
    });
  }
  continuations.push(
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-comparison:mirror",
      "mirror",
      "Return to compact mirror rows for the same filters.",
    ),
  );
  for (const [index, row] of rows.slice(0, 4).entries()) {
    const evidence = navigationEvidenceForUsageComparison(row);
    continuations.push(
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:usage-comparison:members:${index}`,
        "usage-members",
        "Inspect member-level usage comparison rows for this auLink id.",
        { linkId: row.linkId },
        evidence,
      ),
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:usage-comparison:member-surface:${index}`,
        "member-surface",
        "Inspect member declaration coverage for this auLink id.",
        { linkId: row.linkId },
        evidence,
      ),
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:usage-comparison:sites:${index}`,
        "usage-sites",
        "Inspect exact usage source sites for this auLink id.",
        { linkId: row.linkId },
        evidence,
      ),
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:usage-comparison:consumers:${index}`,
        "usage-consumers",
        "Group usage sites by owner declaration for this auLink id.",
        { linkId: row.linkId },
        evidence,
      ),
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:usage-comparison:anchors:${index}`,
        "anchors",
        "Inspect the product anchor placement for this usage comparison row.",
        { linkId: row.linkId },
        evidence,
      ),
    );
    if (
      row.frameworkUsageScope === "implementation-shape" ||
      row.frameworkUsageScope === "subject"
    ) {
      continuations.push({
        id: `bridge.aulink:usage-comparison:framework-api:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Primary,
        rationale:
          "Inspect the framework API usage rows backing the Aurelia side of this comparison.",
        inquiry: {
          lens: LensId.FrameworkApi,
          locus: inquiry.locus,
          projection: "usages",
          filters:
            row.frameworkUsageScope === "implementation-shape"
              ? { packageId: row.packageId, implementationName: row.symbolName }
              : { packageId: row.packageId, subjectName: row.symbolName },
          budget: inquiry.budget ?? AULINK_MIRROR_DETAIL_BUDGET,
        },
        evidence: [evidence],
        route: navigationRoute(
          NavigationPlane.Semantic,
          NavigationRelation.ProjectionOf,
          [BasisKind.AuLink, BasisKind.TypeScriptChecker],
          "Framework API usage rows behind this auLink usage comparison.",
        ),
      });
    } else {
      continuations.push(
        mirrorProjectionContinuation(
          inquiry,
          `bridge.aulink:usage-comparison:targets:${index}`,
          "targets",
          "Inspect the framework target declaration backing this usage comparison row.",
          { linkId: row.linkId },
          evidence,
        ),
      );
    }
    if (row.firstProductSource !== undefined) {
      continuations.push(
        sourceRangeContinuation(
          `bridge.aulink:usage-comparison:product-source:${index}`,
          "Inspect the product mirror declaration for this comparison row.",
          row.firstProductSource,
          evidence,
        ),
      );
    }
    if (row.firstFrameworkSource !== undefined) {
      continuations.push(
        sourceRangeContinuation(
          `bridge.aulink:usage-comparison:framework-source:${index}`,
          "Inspect the framework declaration for this comparison row.",
          row.firstFrameworkSource,
          evidence,
        ),
      );
    }
  }
  return continuations;
}

function memberSurfaceContinuations(
  inquiry: Inquiry,
  rows: readonly AuLinkMemberSurfaceRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push({
      id: "bridge.aulink:member-surface:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the auLink member surface page.",
      inquiry: {
        ...inquiry,
        page: { size: limit, cursor: String(nextOffset) },
      },
      route: nextPageRoute("Next auLink member surface page."),
    });
  }
  continuations.push(
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:member-surface:usage-members",
      "usage-members",
      "Compare usage for the same member filters after checking declaration coverage.",
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:member-surface:comparison",
      "usage-comparison",
      "Return to per-link usage comparison rows for the same filters.",
    ),
  );
  for (const [index, row] of rows.slice(0, 4).entries()) {
    const evidence = evidenceForMemberSurface(row);
    continuations.push(
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:member-surface:usage:${index}`,
        "usage-members",
        "Inspect usage rows for this declared member.",
        { linkId: row.linkId, memberName: row.memberName },
        evidence,
      ),
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:member-surface:sites:${index}`,
        "usage-sites",
        "Inspect exact usage source sites for this declared member.",
        { linkId: row.linkId, memberName: row.memberName },
        evidence,
      ),
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:member-surface:consumers:${index}`,
        "usage-consumers",
        "Group usage sites for this declared member by owner declaration.",
        { linkId: row.linkId, memberName: row.memberName },
        evidence,
      ),
    );
    if (row.firstFrameworkSource !== undefined) {
      continuations.push(
        sourceRangeContinuation(
          `bridge.aulink:member-surface:framework-source:${index}`,
          "Inspect the first Aurelia-side member declaration.",
          row.firstFrameworkSource,
          evidence,
        ),
      );
    }
    if (row.firstProductSource !== undefined) {
      continuations.push(
        sourceRangeContinuation(
          `bridge.aulink:member-surface:product-source:${index}`,
          "Inspect the first semantic-runtime member declaration.",
          row.firstProductSource,
          evidence,
        ),
      );
    }
  }
  return continuations;
}

function usageMemberContinuations(
  inquiry: Inquiry,
  rows: readonly AuLinkUsageMemberComparisonRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push({
      id: "bridge.aulink:usage-members:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the auLink usage member page.",
      inquiry: {
        ...inquiry,
        page: { size: limit, cursor: String(nextOffset) },
      },
      route: nextPageRoute("Next auLink usage member page."),
    });
  }
  continuations.push(
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-members:comparison",
      "usage-comparison",
      "Return to per-link usage comparison rows for the same filters.",
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-members:sites",
      "usage-sites",
      "Open exact usage source sites for the same filters.",
    ),
  );
  for (const [index, row] of rows.slice(0, 4).entries()) {
    const evidence = evidenceForUsageMember(row);
    continuations.push(
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:usage-members:sites:${index}`,
        "usage-sites",
        "Inspect exact usage source sites for this member.",
        { linkId: row.linkId, memberName: row.memberName },
        evidence,
      ),
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:usage-members:consumers:${index}`,
        "usage-consumers",
        "Group usage sites for this member by owner declaration.",
        { linkId: row.linkId, memberName: row.memberName },
        evidence,
      ),
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:usage-members:comparison:${index}`,
        "usage-comparison",
        "Return to the per-link comparison row that owns this member.",
        { linkId: row.linkId },
        evidence,
      ),
    );
    if (row.firstFrameworkSource !== undefined) {
      continuations.push(
        sourceRangeContinuation(
          `bridge.aulink:usage-members:framework-source:${index}`,
          "Inspect the first Aurelia-side source site for this member.",
          row.firstFrameworkSource,
          evidence,
        ),
      );
    }
    if (row.firstProductSource !== undefined) {
      continuations.push(
        sourceRangeContinuation(
          `bridge.aulink:usage-members:product-source:${index}`,
          "Inspect the first semantic-runtime source site for this member.",
          row.firstProductSource,
          evidence,
        ),
      );
    }
  }
  return continuations;
}

function auLinkUsageConsumerContinuations(
  inquiry: Inquiry,
  rows: readonly AuLinkUsageConsumerRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push({
      id: "bridge.aulink:usage-consumers:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the auLink usage consumer page.",
      inquiry: {
        ...inquiry,
        page: { size: limit, cursor: String(nextOffset) },
      },
      route: nextPageRoute("Next auLink usage consumer page."),
    });
  }
  continuations.push(
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-consumers:sites",
      "usage-sites",
      "Open exact usage source sites for the same owner filters.",
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-consumers:members",
      "usage-members",
      "Return to member-level usage rows for the same filters.",
    ),
  );
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForAuLinkUsageConsumer(row);
    continuations.push(
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:usage-consumers:sites:${index}`,
        "usage-sites",
        "Inspect exact source sites for this owner group.",
        {
          linkId: row.linkId,
          side: row.side,
          ownerName: row.ownerName,
          memberName: row.memberName,
          ownerMemberName: row.ownerMemberName,
        },
        evidence,
      ),
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:usage-consumers:comparison:${index}`,
        "usage-comparison",
        "Return to the per-link comparison row that owns this consumer.",
        { linkId: row.linkId },
        evidence,
      ),
    );
    continuations.push(
      sourceRangeContinuation(
        `bridge.aulink:usage-consumers:first-source:${index}`,
        "Inspect the first source site behind this owner group.",
        row.firstSource,
        evidence,
      ),
    );
    if (row.ownerSource !== undefined) {
      continuations.push(
        sourceRangeContinuation(
          `bridge.aulink:usage-consumers:owner-source:${index}`,
          "Inspect the owner declaration for this usage group.",
          row.ownerSource,
          evidence,
        ),
      );
    }
    if (row.ownerMemberSource !== undefined) {
      continuations.push(
        sourceRangeContinuation(
          `bridge.aulink:usage-consumers:owner-member-source:${index}`,
          "Inspect the owner member declaration for this usage group.",
          row.ownerMemberSource,
          evidence,
        ),
        callSitesRangeContinuation(
          `bridge.aulink:usage-consumers:owner-member-call-sites:${index}`,
          "Inspect TypeScript call-site facts inside the owner member for this usage group.",
          row.ownerMemberSource,
          evidence,
        ),
      );
      if (row.memberName !== undefined && row.usageRoles["member-call"] !== undefined) {
        continuations.push(
          callSitesRangeContinuation(
            `bridge.aulink:usage-consumers:owner-member-api-call-sites:${index}`,
            "Inspect TypeScript call-site facts for the consumed member inside the owner member.",
            row.ownerMemberSource,
            evidence,
            {
              calleeName: row.memberName,
              ...singletonRecordFilter(row.callArgumentTexts, "argumentText"),
              ...singletonRecordFilter(row.callArgumentSymbolNames, "argumentSymbolName"),
              ...singletonRecordFilter(
                row.callArgumentFullyQualifiedNames,
                "argumentFullyQualifiedName",
              ),
              ...callSiteArgumentFilters(inquiry.filters),
            },
          ),
        );
      }
    }
    const frameworkApiContinuation = frameworkApiUsageConsumerContinuation(
      inquiry,
      row,
      index,
      evidence,
    );
    if (frameworkApiContinuation !== undefined) {
      continuations.push(frameworkApiContinuation);
    }
  }
  return continuations;
}

function frameworkApiUsageConsumerContinuation(
  inquiry: Inquiry,
  row: AuLinkUsageConsumerRow,
  index: number,
  evidence: Evidence,
): Continuation | undefined {
  if (row.side !== "framework") {
    return undefined;
  }
  const usageRoles = Object.keys(row.usageRoles);
  return {
    id: `bridge.aulink:usage-consumers:framework-api:${index}`,
    kind: ContinuationKind.SwitchLens,
    priority: ContinuationPriority.Secondary,
    rationale:
      "Inspect the native framework.api owner group behind this framework-side bridge usage consumer.",
    inquiry: {
      lens: LensId.FrameworkApi,
      locus: inquiry.locus,
      projection: "usage-consumers",
      filters: {
        implementationName: row.symbolName,
        memberName: row.memberName,
        ownerName: row.ownerName,
        ownerMemberName: row.ownerMemberName,
        role: usageRoles.length === 1 ? usageRoles[0] : undefined,
        ...singletonRecordFilter(row.callCalleeNames, "callCalleeName"),
        ...singletonRecordFilter(row.callArgumentTexts, "callArgumentText"),
        ...singletonRecordFilter(row.callArgumentSymbolNames, "callArgumentSymbolName"),
        ...singletonRecordFilter(
          row.callArgumentFullyQualifiedNames,
          "callArgumentFullyQualifiedName",
        ),
        ...frameworkCallFiltersFromBridgeFilters(inquiry.filters),
      },
      budget: inquiry.budget ?? AULINK_MIRROR_DETAIL_BUDGET,
    },
    evidence: [evidence],
    route: navigationRoute(
      NavigationPlane.Semantic,
      NavigationRelation.ProjectionOf,
      [BasisKind.AuLink, BasisKind.TypeScriptChecker],
      "Native framework.api owner group behind this auLink usage consumer.",
    ),
  };
}

function frameworkCallFiltersFromBridgeFilters(
  filters: Inquiry["filters"],
): Record<string, string> {
  if (filters === undefined) {
    return {};
  }
  return {
    ...stringField(filters, "callCalleeName", "callCalleeName"),
    ...stringField(filters, "callArgumentText", "callArgumentText"),
    ...stringField(filters, "callArgumentSymbolName", "callArgumentSymbolName"),
    ...stringField(
      filters,
      "callArgumentFullyQualifiedName",
      "callArgumentFullyQualifiedName",
    ),
  };
}

function usageSiteContinuations(
  inquiry: Inquiry,
  rows: readonly AuLinkUsageSiteRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push({
      id: "bridge.aulink:usage-sites:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the auLink usage site page.",
      inquiry: {
        ...inquiry,
        page: { size: limit, cursor: String(nextOffset) },
      },
      route: nextPageRoute("Next auLink usage site page."),
    });
  }
  continuations.push(
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-sites:members",
      "usage-members",
      "Return to member-level usage rows for the same filters.",
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-sites:consumers",
      "usage-consumers",
      "Group source sites by owner declaration for the same filters.",
    ),
    mirrorProjectionContinuation(
      inquiry,
      "bridge.aulink:usage-sites:comparison",
      "usage-comparison",
      "Return to per-link usage comparison rows for the same filters.",
    ),
  );
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForUsageSite(row);
    continuations.push(
      sourceRangeContinuation(
        `bridge.aulink:usage-sites:source:${index}`,
        "Inspect the exact source site behind this usage row.",
        row.source,
        evidence,
      ),
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:usage-sites:members:${index}`,
        "usage-members",
        "Return to the member comparison row for this usage site.",
        {
          linkId: row.linkId,
          memberName: row.memberName,
        },
        evidence,
      ),
      mirrorProjectionContinuation(
        inquiry,
        `bridge.aulink:usage-sites:consumer:${index}`,
        "usage-consumers",
        "Inspect the owner group for this usage site.",
        {
          linkId: row.linkId,
          side: row.side,
          ownerName: row.owner.ownerName,
          memberName: row.memberName,
          ownerMemberName: row.owner.ownerMemberName,
        },
        evidence,
      ),
    );
  }
  return continuations;
}
