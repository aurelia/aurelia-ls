import {
  readCallHierarchy,
  readCallSites,
  sourceSelectorForRange,
  SourceProjectMemo,
  type SourceDeclarationKind,
  type SourceDeclarationRow,
  type SourceFileIdentity,
  type SourceProject,
  type SourceSpan,
  type TypeScriptCallHierarchyEdge,
  type TypeScriptCallSiteEntry,
} from "../source/index.js";
import { uniqueSortedStrings } from "../collections.js";
import { FRAMEWORK_DISCOVERY_SEEDS, type FrameworkDiscoveryAnchor, type FrameworkFlowDefinition } from "./discovery-seeds.js";

/** Resolution status for one framework discovery seed anchor. */
export const enum FrameworkAnchorResolutionStatus {
  /** Exactly one admitted top-level framework declaration matches the seed anchor. */
  Resolved = "resolved",
  /** More than one admitted top-level declaration matches the seed anchor. */
  Ambiguous = "ambiguous",
  /** The package is admitted but no top-level declaration matches the seed anchor. */
  Unresolved = "unresolved",
  /** The seed anchor names a framework package not admitted by the hot source project. */
  PackageUnadmitted = "package-unadmitted",
}

/** Exact framework declaration candidate for one seed anchor. */
export interface FrameworkAnchorCandidate {
  /** Stable candidate id derived from the seed anchor and source declaration. */
  readonly id: string;
  /** Seed anchor id this candidate resolves. */
  readonly anchorId: string;
  /** Framework package that owns the declaration. */
  readonly packageId: string;
  /** Framework symbol name. */
  readonly symbolName: string;
  /** Source declaration kind. */
  readonly declarationKind: SourceDeclarationKind;
  /** File that contains the declaration. */
  readonly file: SourceFileIdentity;
  /** Source span for the declaration. */
  readonly span: SourceSpan;
  /** True when the declaration is top-level exported. */
  readonly exported: boolean;
  /** TypeChecker symbol key when available. */
  readonly symbolKey: string | null;
}

/** Seed anchor joined against the hot source declaration index. */
export interface FrameworkAnchorResolution {
  /** Stable resolution id. */
  readonly id: string;
  /** Seed anchor being resolved. */
  readonly anchor: FrameworkDiscoveryAnchor;
  /** Resolution status. */
  readonly status: FrameworkAnchorResolutionStatus;
  /** Exact declaration candidates. */
  readonly candidates: readonly FrameworkAnchorCandidate[];
  /** Diagnostic note when the resolution did not close to exactly one candidate. */
  readonly diagnostic?: string;
}

/** Rollup for the current framework discovery index. */
export interface FrameworkDiscoverySeedIndexRollup {
  /** Number of seed anchors in the seed. */
  readonly anchors: number;
  /** Number of anchors with exactly one framework declaration. */
  readonly resolvedAnchors: number;
  /** Number of anchors with multiple framework declarations. */
  readonly ambiguousAnchors: number;
  /** Number of anchors with no matching framework declaration. */
  readonly unresolvedAnchors: number;
  /** Number of anchors whose package is not admitted. */
  readonly packageUnadmittedAnchors: number;
  /** Number of framework flow definitions in the seed. */
  readonly flows: number;
  /** Number of source-bound or open flow seed rows derived from anchors. */
  readonly flowSeeds: number;
  /** Number of flow seed rows whose anchor resolved to exactly one source declaration. */
  readonly sourceBoundFlowSeeds: number;
  /** Number of flow seed rows blocked by anchor or flow-definition resolution. */
  readonly openFlowSeeds: number;
}

/** Rollup for the current framework discovery index. */
export interface FrameworkDiscoveryIndexRollup extends FrameworkDiscoverySeedIndexRollup {
  /** Number of call-hierarchy edge rows precomputed for source-bound flow seeds. */
  readonly flowCallEdges: number;
  /** Number of exact call-site rows precomputed from framework flow call edges. */
  readonly flowCallSites: number;
}

/** Status for a framework flow seed derived from one anchor plus one flow. */
export const enum FrameworkFlowSeedStatus {
  /** Seed flow is backed by exactly one source declaration candidate. */
  SourceBound = "source-bound",
  /** Seed flow is blocked because the anchor resolved to multiple source declarations. */
  AmbiguousAnchor = "ambiguous-anchor",
  /** Seed flow is blocked because the anchor did not resolve to a source declaration. */
  UnresolvedAnchor = "unresolved-anchor",
  /** Seed flow is blocked because the anchor package is not admitted. */
  PackageUnadmitted = "package-unadmitted",
  /** Seed flow names a flow that has no definition in the seed. */
  MissingFlowDefinition = "missing-flow-definition",
}

/** Source-bound framework flow seed used before full semantic route indexing exists. */
export interface FrameworkFlowSeedRow {
  /** Stable row id. */
  readonly id: string;
  /** Flow seed status. */
  readonly status: FrameworkFlowSeedStatus;
  /** Anchor resolution this flow seed starts from. */
  readonly anchorResolution: FrameworkAnchorResolution;
  /** Flow id named by the seed anchor. */
  readonly flow: string;
  /** Flow definition when the seed currently defines it. */
  readonly flowDefinition?: FrameworkFlowDefinition;
  /** Exact source candidates inherited from the anchor resolution. */
  readonly candidates: readonly FrameworkAnchorCandidate[];
  /** Diagnostic note when this seed cannot become a source-bound row yet. */
  readonly diagnostic?: string;
}

/** Call-hierarchy edge joined to the framework flow seed that produced it. */
export interface FrameworkFlowCallEdgeRow {
  /** Stable row id. */
  readonly id: string;
  /** Source-bound flow seed that produced this call edge. */
  readonly flowSeed: FrameworkFlowSeedRow;
  /** TypeScript call-hierarchy edge. */
  readonly edge: TypeScriptCallHierarchyEdge;
}

/** Grouped callee target for framework flow call edges. */
export interface FrameworkFlowCallTargetRow {
  /** Stable group id. */
  readonly id: string;
  /** Framework flow that owns this target group. */
  readonly flow: string;
  /** Incoming or outgoing direction relative to the source-bound seed. */
  readonly direction: string;
  /** Callee item name. */
  readonly targetName: string;
  /** Callee item package id, when known. */
  readonly targetPackageId: string | null;
  /** Number of call-edge rows in this group. */
  readonly edgeCount: number;
  /** Seed anchors that produced edges for this target. */
  readonly anchorIds: readonly string[];
  /** Call-edge rows in this group. */
  readonly edges: readonly FrameworkFlowCallEdgeRow[];
}

/** Exact call-site row joined to the framework flow call edge and seed that produced it. */
export interface FrameworkFlowCallSiteRow {
  /** Stable row id. */
  readonly id: string;
  /** Flow seed that produced the call edge. */
  readonly flowSeed: FrameworkFlowSeedRow;
  /** Call-hierarchy edge whose caller span produced this call site. */
  readonly callEdge: FrameworkFlowCallEdgeRow;
  /** Zero-based index into the call edge's caller spans. */
  readonly spanIndex: number;
  /** Exact TypeScript call-site row. */
  readonly callSite: TypeScriptCallSiteEntry;
}

/** Hot framework discovery index built from the static seed and source declaration index. */
export interface FrameworkDiscoveryIndex {
  /** seed schema version used to build this index. */
  readonly seedVersion: typeof FRAMEWORK_DISCOVERY_SEEDS.schemaVersion;
  /** Framework flow definitions from the seed. */
  readonly flows: readonly FrameworkFlowDefinition[];
  /** Seed anchor resolutions. */
  readonly anchors: readonly FrameworkAnchorResolution[];
  /** Anchor plus flow rows used to start framework semantic discovery. */
  readonly flowSeeds: readonly FrameworkFlowSeedRow[];
  /** First-page call-hierarchy edges attached to source-bound flow seeds. */
  readonly flowCallEdges: readonly FrameworkFlowCallEdgeRow[];
  /** Exact TypeScript call-site rows expanded from precomputed flow call edges. */
  readonly flowCallSites: readonly FrameworkFlowCallSiteRow[];
  /** Compact status counts. */
  readonly rollup: FrameworkDiscoveryIndexRollup;
}

/** Hot framework discovery seed index before expensive call graph expansion. */
export interface FrameworkDiscoverySeedIndex {
  /** seed schema version used to build this index. */
  readonly seedVersion: typeof FRAMEWORK_DISCOVERY_SEEDS.schemaVersion;
  /** Framework flow definitions from the seed. */
  readonly flows: readonly FrameworkFlowDefinition[];
  /** Seed anchor resolutions. */
  readonly anchors: readonly FrameworkAnchorResolution[];
  /** Anchor plus flow rows used to start framework semantic discovery. */
  readonly flowSeeds: readonly FrameworkFlowSeedRow[];
  /** Compact seed status counts. */
  readonly rollup: FrameworkDiscoverySeedIndexRollup;
}

const seedIndexMemo = new SourceProjectMemo<FrameworkDiscoverySeedIndex>();
const discoveryIndexMemo = new SourceProjectMemo<FrameworkDiscoveryIndex>();

interface FrameworkDiscoveryBuildContext {
  readonly callHierarchyByCandidate: Map<string, readonly TypeScriptCallHierarchyEdge[]>;
  readonly callSitesBySpan: Map<string, readonly TypeScriptCallSiteEntry[]>;
}

/** Build or read the memoized framework discovery seed index for one hot source project. */
export function readFrameworkDiscoverySeedIndex(
  /** Hot source project held by the Atlas daemon. */
  sourceProject: SourceProject,
): FrameworkDiscoverySeedIndex {
  return seedIndexMemo.read(sourceProject, () =>
    createFrameworkDiscoverySeedIndex(sourceProject),
  );
}

/** Build or read the memoized framework discovery index for one hot source project. */
export function readFrameworkDiscoveryIndex(
  /** Hot source project held by the Atlas daemon. */
  sourceProject: SourceProject,
): FrameworkDiscoveryIndex {
  return discoveryIndexMemo.read(sourceProject, () =>
    createFrameworkDiscoveryIndex(sourceProject),
  );
}

/** Convert a framework anchor candidate span to an inquiry source range. */
export function sourceRangeForFrameworkAnchorCandidate(
  /** Candidate to convert. */
  candidate: FrameworkAnchorCandidate,
) {
  return {
    filePath: candidate.file.repoPath,
    start: {
      line: candidate.span.startLine - 1,
      character: candidate.span.startCharacter - 1,
    },
    end: {
      line: candidate.span.endLine - 1,
      character: candidate.span.endCharacter - 1,
    },
  };
}

/** Convert a framework flow call edge to the caller-side source range, when present. */
export function sourceRangeForFrameworkFlowCallEdge(
  /** Call edge row to convert. */
  row: FrameworkFlowCallEdgeRow,
) {
  const span = row.edge.fromSpans[0];
  if (span === undefined) {
    return null;
  }
  return sourceRangeForFileSpan(row.edge.from.file.repoPath, span);
}

/** Convert an exact framework flow call-site row to an inquiry source range. */
export function sourceRangeForFrameworkFlowCallSite(
  /** Call-site row to convert. */
  row: FrameworkFlowCallSiteRow,
) {
  return sourceRangeForFileSpan(row.callSite.file.repoPath, row.callSite.span);
}

/** Group framework flow call edges by flow, direction, and callee target. */
export function groupFrameworkFlowCallTargets(
  /** Call-edge rows to group. */
  rows: readonly FrameworkFlowCallEdgeRow[],
): readonly FrameworkFlowCallTargetRow[] {
  const groups = new Map<string, FrameworkFlowCallEdgeRow[]>();
  for (const row of rows) {
    const key = [
      row.flowSeed.flow,
      row.edge.direction,
      row.edge.to.file.packageId ?? "<unknown>",
      row.edge.to.name,
    ].join(":");
    groups.set(key, [...groups.get(key) ?? [], row]);
  }
  return [...groups.entries()]
    .map(([id, edges]) => {
      const first = edges[0]!;
      return {
        id,
        flow: first.flowSeed.flow,
        direction: first.edge.direction,
        targetName: first.edge.to.name,
        targetPackageId: first.edge.to.file.packageId,
        edgeCount: edges.length,
        anchorIds: uniqueSortedStrings(edges.map((edge) => edge.flowSeed.anchorResolution.anchor.id)),
        edges,
      };
    })
    .sort(compareCallTargets);
}

function createFrameworkDiscoverySeedIndex(sourceProject: SourceProject): FrameworkDiscoverySeedIndex {
  const startedAt = performance.now();
  const packageIds = new Set(sourceProject.snapshot().summary.packages.map((entry) => entry.id));
  const topLevelRows = sourceProject.topLevelDeclarationRows();
  const afterSourceIndex = performance.now();
  const anchors = FRAMEWORK_DISCOVERY_SEEDS.anchors.map((anchor) => resolveAnchor(anchor, packageIds, topLevelRows));
  const flowDefinitions = new Map(FRAMEWORK_DISCOVERY_SEEDS.flows.map((flow) => [flow.flow, flow]));
  const flowSeeds = anchors.flatMap((anchor) => anchor.anchor.flows.map((flow) => flowSeedFor(anchor, flow, flowDefinitions.get(flow))));
  const afterSeeds = performance.now();
  if (process.env.ATLAS_PROFILE_FRAMEWORK_BOOT === "1") {
    console.error(JSON.stringify({
      event: "atlas.framework.discovery.seed.profile",
      sourceIndexMs: Math.round(afterSourceIndex - startedAt),
      seedMs: Math.round(afterSeeds - afterSourceIndex),
      totalMs: Math.round(afterSeeds - startedAt),
      flowSeeds: flowSeeds.length,
    }));
  }
  const rollup: FrameworkDiscoverySeedIndexRollup = {
    anchors: anchors.length,
    resolvedAnchors: anchors.filter((anchor) => anchor.status === FrameworkAnchorResolutionStatus.Resolved).length,
    ambiguousAnchors: anchors.filter((anchor) => anchor.status === FrameworkAnchorResolutionStatus.Ambiguous).length,
    unresolvedAnchors: anchors.filter((anchor) => anchor.status === FrameworkAnchorResolutionStatus.Unresolved).length,
    packageUnadmittedAnchors: anchors.filter((anchor) => anchor.status === FrameworkAnchorResolutionStatus.PackageUnadmitted).length,
    flows: FRAMEWORK_DISCOVERY_SEEDS.flows.length,
    flowSeeds: flowSeeds.length,
    sourceBoundFlowSeeds: flowSeeds.filter((row) => row.status === FrameworkFlowSeedStatus.SourceBound).length,
    openFlowSeeds: flowSeeds.filter((row) => row.status !== FrameworkFlowSeedStatus.SourceBound).length,
  };
  return {
    seedVersion: FRAMEWORK_DISCOVERY_SEEDS.schemaVersion,
    flows: FRAMEWORK_DISCOVERY_SEEDS.flows,
    anchors,
    flowSeeds,
    rollup,
  };
}

function createFrameworkDiscoveryIndex(sourceProject: SourceProject): FrameworkDiscoveryIndex {
  const seedIndex = readFrameworkDiscoverySeedIndex(sourceProject);
  const startedAt = performance.now();
  const context: FrameworkDiscoveryBuildContext = {
    callHierarchyByCandidate: new Map(),
    callSitesBySpan: new Map(),
  };
  const flowCallEdges = seedIndex.flowSeeds.flatMap((seed) => callEdgesForFlowSeed(sourceProject, seed, context));
  const afterCallEdges = performance.now();
  const flowCallSites = flowCallEdges.flatMap((edge) => callSitesForFlowCallEdge(sourceProject, edge, context));
  const afterCallSites = performance.now();
  if (process.env.ATLAS_PROFILE_FRAMEWORK_BOOT === "1") {
    console.error(JSON.stringify({
      event: "atlas.framework.discovery.profile",
      callEdgesMs: Math.round(afterCallEdges - startedAt),
      callSitesMs: Math.round(afterCallSites - afterCallEdges),
      totalMs: Math.round(afterCallSites - startedAt),
      flowSeeds: seedIndex.flowSeeds.length,
      callEdges: flowCallEdges.length,
      callSites: flowCallSites.length,
      cachedCallHierarchyTargets: context.callHierarchyByCandidate.size,
      cachedCallSiteSpans: context.callSitesBySpan.size,
    }));
  }
  const rollup: FrameworkDiscoveryIndexRollup = {
    ...seedIndex.rollup,
    flowCallEdges: flowCallEdges.length,
    flowCallSites: flowCallSites.length,
  };
  return {
    seedVersion: seedIndex.seedVersion,
    flows: seedIndex.flows,
    anchors: seedIndex.anchors,
    flowSeeds: seedIndex.flowSeeds,
    flowCallEdges,
    flowCallSites,
    rollup,
  };
}

function resolveAnchor(
  anchor: FrameworkDiscoveryAnchor,
  packageIds: ReadonlySet<string>,
  rows: readonly SourceDeclarationRow[],
): FrameworkAnchorResolution {
  if (!packageIds.has(anchor.source.packageId)) {
    return {
      id: anchor.id,
      anchor,
      status: FrameworkAnchorResolutionStatus.PackageUnadmitted,
      candidates: [],
      diagnostic: `Package ${anchor.source.packageId} is not admitted into the hot source project.`,
    };
  }
  const matchingRows = rows
    .filter((row) => row.file.packageId === anchor.source.packageId)
    .filter((row) => row.name === anchor.source.symbolName)
    .filter((row) => anchor.source.declarationKind === undefined || row.kind === anchor.source.declarationKind);
  const sourceRows = matchingRows.filter(isSourceDeclarationRow);
  const candidateRows = sourceRows.length === 0 ? matchingRows : sourceRows;
  const candidates = candidateRows
    .map((row) => candidateForRow(anchor, row));
  if (candidates.length === 1) {
    return {
      id: anchor.id,
      anchor,
      status: FrameworkAnchorResolutionStatus.Resolved,
      candidates,
    };
  }
  if (candidates.length > 1) {
    return {
      id: anchor.id,
      anchor,
      status: FrameworkAnchorResolutionStatus.Ambiguous,
      candidates,
      diagnostic: `Seed anchor ${anchor.id} resolved to ${candidates.length} top-level declarations.`,
    };
  }
  return {
    id: anchor.id,
    anchor,
    status: FrameworkAnchorResolutionStatus.Unresolved,
    candidates,
    diagnostic: `No top-level declaration matched ${anchor.source.packageId}:${anchor.source.symbolName}.`,
  };
}

function isSourceDeclarationRow(row: SourceDeclarationRow): boolean {
  return row.file.repoPath.includes("/src/");
}

function flowSeedFor(
  anchorResolution: FrameworkAnchorResolution,
  flow: string,
  flowDefinition: FrameworkFlowDefinition | undefined,
): FrameworkFlowSeedRow {
  if (flowDefinition === undefined) {
    return {
      id: `${anchorResolution.id}:flow:${flow}`,
      status: FrameworkFlowSeedStatus.MissingFlowDefinition,
      anchorResolution,
      flow,
      candidates: anchorResolution.candidates,
      diagnostic: `Flow ${flow} is named by ${anchorResolution.id} but has no framework flow definition.`,
    };
  }
  if (anchorResolution.status === FrameworkAnchorResolutionStatus.Resolved) {
    return {
      id: `${anchorResolution.id}:flow:${flow}`,
      status: FrameworkFlowSeedStatus.SourceBound,
      anchorResolution,
      flow,
      flowDefinition,
      candidates: anchorResolution.candidates,
    };
  }
  if (anchorResolution.status === FrameworkAnchorResolutionStatus.Ambiguous) {
    return {
      id: `${anchorResolution.id}:flow:${flow}`,
      status: FrameworkFlowSeedStatus.AmbiguousAnchor,
      anchorResolution,
      flow,
      flowDefinition,
      candidates: anchorResolution.candidates,
      diagnostic: `Flow ${flow} is blocked by ambiguous anchor ${anchorResolution.id}.`,
    };
  }
  if (anchorResolution.status === FrameworkAnchorResolutionStatus.PackageUnadmitted) {
    return {
      id: `${anchorResolution.id}:flow:${flow}`,
      status: FrameworkFlowSeedStatus.PackageUnadmitted,
      anchorResolution,
      flow,
      flowDefinition,
      candidates: anchorResolution.candidates,
      diagnostic: `Flow ${flow} is blocked because package ${anchorResolution.anchor.source.packageId} is not admitted.`,
    };
  }
  return {
    id: `${anchorResolution.id}:flow:${flow}`,
    status: FrameworkFlowSeedStatus.UnresolvedAnchor,
    anchorResolution,
    flow,
    flowDefinition,
    candidates: anchorResolution.candidates,
    diagnostic: `Flow ${flow} is blocked by unresolved anchor ${anchorResolution.id}.`,
  };
}

function callEdgesForFlowSeed(
  sourceProject: SourceProject,
  seed: FrameworkFlowSeedRow,
  context: FrameworkDiscoveryBuildContext,
): readonly FrameworkFlowCallEdgeRow[] {
  if (seed.status !== FrameworkFlowSeedStatus.SourceBound) {
    return [];
  }
  const candidate = seed.candidates[0];
  if (candidate === undefined) {
    return [];
  }
  const cached = context.callHierarchyByCandidate.get(candidate.id);
  const edges = cached ?? readCallHierarchy(sourceProject, sourceSelectorForRange(sourceRangeForFrameworkAnchorCandidate(candidate)), {
    limit: 80,
    offset: 0,
  }).edges;
  if (cached === undefined) {
    context.callHierarchyByCandidate.set(candidate.id, edges);
  }
  return edges.map((edge) => ({
    id: `${seed.id}:call:${edge.id}`,
    flowSeed: seed,
    edge,
  }));
}

function callSitesForFlowCallEdge(
  sourceProject: SourceProject,
  row: FrameworkFlowCallEdgeRow,
  context: FrameworkDiscoveryBuildContext,
): readonly FrameworkFlowCallSiteRow[] {
  return row.edge.fromSpans.flatMap((span, spanIndex) => {
    const key = `${row.edge.from.file.absolutePath}:${span.start}:${span.end}`;
    const cached = context.callSitesBySpan.get(key);
    const callSites = cached ?? readCallSites(sourceProject, sourceSelectorForRange(sourceRangeForFileSpan(row.edge.from.file.repoPath, span)), { limit: 5, offset: 0 }).callSites;
    if (cached === undefined) {
      context.callSitesBySpan.set(key, callSites);
    }
    return callSites.map((callSite, callSiteIndex) => ({
      id: `${row.id}:site:${spanIndex}:${callSiteIndex}:${callSite.id}`,
      flowSeed: row.flowSeed,
      callEdge: row,
      spanIndex,
      callSite,
    }));
  });
}

function sourceRangeForFileSpan(filePath: string, span: SourceSpan) {
  return {
    filePath,
    start: {
      line: span.startLine - 1,
      character: span.startCharacter - 1,
    },
    end: {
      line: span.endLine - 1,
      character: span.endCharacter - 1,
    },
  };
}

function compareCallTargets(left: FrameworkFlowCallTargetRow, right: FrameworkFlowCallTargetRow): number {
  return left.flow.localeCompare(right.flow)
    || left.direction.localeCompare(right.direction)
    || (right.edgeCount - left.edgeCount)
    || (left.targetPackageId ?? "").localeCompare(right.targetPackageId ?? "")
    || left.targetName.localeCompare(right.targetName);
}

function candidateForRow(anchor: FrameworkDiscoveryAnchor, row: SourceDeclarationRow): FrameworkAnchorCandidate {
  return {
    id: `${anchor.id}:${row.file.repoPath}:${row.span.start}`,
    anchorId: anchor.id,
    packageId: anchor.source.packageId,
    symbolName: anchor.source.symbolName,
    declarationKind: row.kind,
    file: row.file,
    span: row.span,
    exported: row.exported,
    symbolKey: row.symbolKey,
  };
}
