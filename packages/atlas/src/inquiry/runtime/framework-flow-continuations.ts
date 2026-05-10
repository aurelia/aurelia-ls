import {
  sourceRangeForFrameworkAnchorCandidate,
  sourceRangeForFrameworkFlowCallEdge,
  sourceRangeForFrameworkFlowCallSite,
  type FrameworkAnchorResolution,
  type FrameworkDiscoveryAnchor,
  type FrameworkFlowCallEdgeRow,
  type FrameworkFlowCallSiteRow,
  type FrameworkFlowCallTargetRow,
  type FrameworkFlowSeedRow,
} from "../../framework/index.js";
import { SourceSelectorScheme } from "../../source/index.js";
import { BasisKind } from "../basis.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind, RepoRootLocus } from "../locus.js";
import { NavigationPlane, NavigationRelation } from "../navigation.js";
import {
  FrameworkRowContinuationBuilder,
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";
import {
  evidenceForAnchorResolution,
  evidenceForCallEdge,
  evidenceForFrameworkFlowCallSite,
  evidenceForCallTarget,
  evidenceForFlowSeed,
} from "./framework-evidence.js";
import { route } from "./framework-support.js";
export function flowContinuations(
  inquiry: Inquiry,
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.discovery:flows:next-page",
        "Continue framework flow definitions.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:anchors",
      "anchors",
      "Inspect seed anchors related to these flows.",
    ),
  );
  return continuations;
}

export function frameworkFlowAnchorContinuations(
  inquiry: Inquiry,
  anchors: readonly FrameworkAnchorResolution[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.discovery:anchors:next-page",
        "Continue framework seed anchors.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:flows",
      "flows",
      "Inspect flow definitions behind these anchors.",
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:flow-seeds",
      "flow-seeds",
      "Inspect source-bound flow seeds derived from these anchors.",
    ),
  );
  for (const [index, resolution] of anchors.slice(0, 3).entries()) {
    const anchor = resolution.anchor;
    const firstCandidate = resolution.candidates[0];
    const selector = declarationSelectorForAnchor(anchor);
    const evidence = evidenceForAnchorResolution(resolution);
    const sourceLocus =
      firstCandidate === undefined
        ? RepoRootLocus
        : {
            kind: LocusKind.SourceRange as const,
            range: sourceRangeForFrameworkAnchorCandidate(firstCandidate),
          };
    continuations.push({
      id: `framework.discovery:anchors:source:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority:
        firstCandidate === undefined
          ? ContinuationPriority.Secondary
          : ContinuationPriority.Primary,
      rationale:
        firstCandidate === undefined
          ? "Resolve this framework seed anchor through the TypeScript source substrate."
          : "Inspect the exact framework declaration resolved for this seed anchor.",
      inquiry: {
        lens: LensId.TsSource,
        locus: sourceLocus,
        ...(firstCandidate === undefined ? { subject: selector } : {}),
        projection: firstCandidate === undefined ? "summary" : "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.SourceFor,
        [BasisKind.SourceText, BasisKind.TypeScriptProgram],
        "Source declaration for a framework seed anchor.",
      ),
    });
    continuations.push({
      id: `framework.discovery:anchors:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for this framework seed anchor.",
      inquiry: {
        lens: LensId.TsType,
        locus:
          firstCandidate === undefined
            ? RepoRootLocus
            : {
                kind: LocusKind.SourceRange as const,
                range: sourceRangeForFrameworkAnchorCandidate(firstCandidate),
              },
        ...(firstCandidate === undefined ? { subject: selector } : {}),
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Inspection,
        NavigationRelation.TypeFactsFor,
        [BasisKind.TypeScriptChecker],
        "Type facts for a framework seed anchor.",
      ),
    });
    if (anchor.source.auLinkId !== undefined) {
      continuations.push({
        id: `framework.discovery:anchors:aulink:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale:
          "Inspect semantic-runtime auLink mirror pressure for this framework seed anchor.",
        inquiry: {
          lens: LensId.BridgeAuLink,
          locus: RepoRootLocus,
          subject: anchor.source.auLinkId,
          projection: "targets",
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Semantic,
          NavigationRelation.MirrorTargetOf,
          [BasisKind.AuLink, BasisKind.TypeScriptChecker],
          "auLink mirror target for a framework seed anchor.",
        ),
      });
    }
  }
  return continuations;
}

export function flowSeedContinuations(
  inquiry: Inquiry,
  flowSeeds: readonly FrameworkFlowSeedRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.discovery:flow-seeds:next-page",
        "Continue framework flow seed rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:anchors",
      "anchors",
      "Return to seed anchors behind these flow seeds.",
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:flows",
      "flows",
      "Inspect flow definitions behind these flow seeds.",
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:call-edges",
      "call-edges",
      "Inspect precomputed call edges attached to these flow seeds.",
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:call-sites",
      "call-sites",
      "Inspect exact call-site arguments attached to these flow seeds.",
    ),
  );
  for (const [index, seed] of flowSeeds.slice(0, 3).entries()) {
    const firstCandidate = seed.candidates[0];
    const evidence = evidenceForFlowSeed(seed);
    if (firstCandidate !== undefined) {
      const source = sourceRangeForFrameworkAnchorCandidate(firstCandidate);
      const builder = new FrameworkRowContinuationBuilder(
        inquiry,
        "framework.discovery:flow-seeds",
        index,
        evidence,
      );
      continuations.push(
        builder.source(
          "source",
          source,
          "Inspect the source declaration that currently seeds this framework flow.",
          "Source declaration that seeds a framework flow.",
          { basis: [BasisKind.SourceText, BasisKind.TypeScriptProgram] },
        ),
      );
      continuations.push({
        id: `framework.discovery:flow-seeds:call-hierarchy:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale:
          "Inspect call hierarchy around the source declaration that seeds this framework flow.",
        inquiry: {
          lens: LensId.TsType,
          locus: {
            kind: LocusKind.SourceRange,
            range: source,
          },
          projection: "call-hierarchy",
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Flow,
          NavigationRelation.CallHierarchyOf,
          [BasisKind.TypeScriptChecker],
          "Call hierarchy around a framework flow seed.",
        ),
      });
    }
    if (seed.anchorResolution.anchor.source.auLinkId !== undefined) {
      continuations.push({
        id: `framework.discovery:flow-seeds:aulink:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale:
          "Inspect semantic-runtime auLink mirror pressure for this framework flow seed.",
        inquiry: {
          lens: LensId.BridgeAuLink,
          locus: RepoRootLocus,
          subject: seed.anchorResolution.anchor.source.auLinkId,
          projection: "targets",
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Semantic,
          NavigationRelation.MirrorTargetOf,
          [BasisKind.AuLink, BasisKind.TypeScriptChecker],
          "auLink mirror target for a framework flow seed.",
        ),
      });
    }
  }
  return continuations;
}

export function callEdgeContinuations(
  inquiry: Inquiry,
  callEdges: readonly FrameworkFlowCallEdgeRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.discovery:call-edges:next-page",
        "Continue framework flow call edges.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:flow-seeds",
      "flow-seeds",
      "Return to the source-bound flow seeds behind these call edges.",
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:call-sites",
      "call-sites",
      "Expand these call edges into exact call-site argument rows.",
    ),
  );
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:call-targets",
      "call-targets",
      "Group these call edges by callee target.",
    ),
  );
  for (const [index, row] of callEdges.slice(0, 3).entries()) {
    const source = sourceRangeForFrameworkFlowCallEdge(row);
    if (source === null) {
      continue;
    }
    const evidence = evidenceForCallEdge(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.discovery:call-edges",
      index,
      evidence,
    );
    continuations.push({
      id: `framework.discovery:call-edges:call-sites:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect exact call-site argument facts behind this framework flow call edge.",
      inquiry: {
        ...inquiry,
        projection: "call-sites",
        filters: {
          ...inquiry.filters,
          flow: row.flowSeed.flow,
          direction: row.edge.direction,
          fromPackageId: row.edge.from.file.packageId ?? undefined,
          toPackageId: row.edge.to.file.packageId ?? undefined,
          fromName: row.edge.from.name,
          toName: row.edge.to.name,
        },
        page: undefined,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Flow,
        NavigationRelation.CallSitesOf,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Exact call-site facts behind a framework flow call edge.",
      ),
    });
    continuations.push(
      builder.source(
        "source",
        source,
        "Inspect the source call site behind this framework flow call edge.",
        "Source call site behind a framework flow call edge.",
        { basis: [BasisKind.SourceText, BasisKind.TypeScriptProgram] },
      ),
      builder.typeFacts(
        "type",
        source,
        "Inspect TypeChecker facts for this framework flow call site.",
        "Type facts for a framework flow call edge.",
      ),
    );
  }
  return continuations;
}

export function callTargetContinuations(
  inquiry: Inquiry,
  callTargets: readonly FrameworkFlowCallTargetRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.discovery:call-targets:next-page",
        "Continue framework flow call targets.",
        nextOffset,
        limit,
      ),
    );
  }
  for (const [index, target] of callTargets.slice(0, 3).entries()) {
    continuations.push({
      id: `framework.discovery:call-targets:edges:${index}`,
      kind: ContinuationKind.Narrow,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect call edges behind this grouped framework call target.",
      inquiry: {
        ...inquiry,
        projection: "call-edges",
        filters: {
          ...inquiry.filters,
          flow: target.flow,
          direction: target.direction,
          toPackageId: target.targetPackageId ?? undefined,
          toName: target.targetName,
        },
        page: undefined,
      },
      evidence: [evidenceForCallTarget(target)],
      route: route(
        NavigationPlane.Flow,
        NavigationRelation.CallHierarchyOf,
        [BasisKind.TypeScriptChecker],
        "Call edges behind a grouped framework call target.",
      ),
    });
    continuations.push({
      id: `framework.discovery:call-targets:call-sites:${index}`,
      kind: ContinuationKind.Narrow,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect exact call-site arguments behind this grouped framework call target.",
      inquiry: {
        ...inquiry,
        projection: "call-sites",
        filters: {
          ...inquiry.filters,
          flow: target.flow,
          direction: target.direction,
          toPackageId: target.targetPackageId ?? undefined,
          toName: target.targetName,
        },
        page: undefined,
      },
      evidence: [evidenceForCallTarget(target)],
      route: route(
        NavigationPlane.Flow,
        NavigationRelation.CallSitesOf,
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        "Exact call-site facts behind a grouped framework call target.",
      ),
    });
  }
  return continuations;
}

export function callSiteContinuations(
  inquiry: Inquiry,
  callSites: readonly FrameworkFlowCallSiteRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.discovery:call-sites:next-page",
        "Continue framework flow call sites.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.discovery:call-edges",
      "call-edges",
      "Return to grouped call-hierarchy edges behind these exact call sites.",
    ),
  );
  for (const [index, row] of callSites.slice(0, 3).entries()) {
    const source = sourceRangeForFrameworkFlowCallSite(row);
    const evidence = evidenceForFrameworkFlowCallSite(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.discovery:call-sites",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        source,
        "Inspect source behind this exact framework flow call site.",
        "Source range behind an exact framework flow call site.",
        { basis: [BasisKind.SourceText, BasisKind.TypeScriptProgram] },
      ),
      builder.typeFacts(
        "type",
        source,
        "Inspect TypeChecker facts for this exact framework flow call site.",
        "Type facts for an exact framework flow call site.",
      ),
    );
  }
  return continuations;
}

export function declarationSelectorForAnchor(anchor: FrameworkDiscoveryAnchor) {
  return {
    scheme: SourceSelectorScheme.Declaration,
    name: anchor.source.symbolName,
    packageId: anchor.source.packageId,
    kind: anchor.source.declarationKind,
  };
}
