import type {
  AtlasWorkRoute,
  AtlasWorkRouteDocAnchor,
  AtlasWorkRouteLensAnchor,
  AtlasWorkRouteMatchStrength,
  AtlasWorkRouteRole,
  AtlasWorkRouteScriptAnchor,
  AtlasWorkRouteSourceAnchor,
  ATLAS_WORK_ROUTER_VERSION,
} from "./atlas-work-router-contracts.js";
import type { AtlasMemoryRecordRow } from "./atlas-memory-contracts.js";
import type { AtlasMemoryNextActionRow } from "./atlas-memory-next-actions.js";
import type {
  FrameworkCorpusExpectedEffectDescriptorRow,
  FrameworkCorpusFixtureSeedRow,
} from "./framework-corpus-analysis.js";
import type {
  AtlasSelfClassSurfaceRow,
  AtlasSelfFunctionSurfaceRow,
  AtlasSelfSourceFileSurfaceRow,
  AtlasSelfVariableSurfaceRow,
} from "./self-analysis.js";
import type {
  ProductArchitectureClassSurfaceRow,
  ProductArchitectureDeclarationRow,
  ProductArchitectureFunctionSurfaceRow,
  ProductArchitectureModuleRow,
} from "./product-architecture-analysis.js";
import type { SourceRange } from "../locus.js";

/** Value returned by atlas.work-router. */
export interface AtlasWorkRouterValue {
  /** Schema marker. */
  readonly version: typeof ATLAS_WORK_ROUTER_VERSION;
  /** Compact catalog and match rollup. */
  readonly rollup: AtlasWorkRouterRollup;
  /** Matched route rows. */
  readonly routes?: readonly AtlasWorkRouteRow[];
  /** Route plans joining route anchors to live Atlas substrates. */
  readonly routePlans?: readonly AtlasWorkRoutePlanRow[];
  /** Route health rows that expose catalog grounding gaps. */
  readonly routeHealth?: readonly AtlasWorkRouteHealthRow[];
  /** Current git worktree rows joined to matching work routes. */
  readonly workset?: readonly AtlasWorkRouteWorksetRow[];
  /** Atlas memory next-action rows joined back to owning work routes. */
  readonly memoryCoverage?: readonly AtlasWorkRouteMemoryCoverageRow[];
  /** Route catalog definitions, returned by the schema projection. */
  readonly catalog?: readonly AtlasWorkRoute[];
}

/** Compact counts for one work-router answer. */
export interface AtlasWorkRouterRollup {
  /** Route definitions in the static catalog. */
  readonly routeCount: number;
  /** Routes matched after caller filters. */
  readonly matchedRouteCount: number;
  /** Matched routes by authority class. */
  readonly byMatchStrength: Readonly<Record<AtlasWorkRouteMatchStrength, number>>;
  /** Routes whose best match was only descriptive prose. */
  readonly weakTextMatchCount: number;
  /** Routes with live memory records/actions joined into the answer. */
  readonly routeWithMemoryCount: number;
  /** Routes with framework corpus fixture seeds joined into the answer. */
  readonly routeWithFixtureSeedCount: number;
  /** Routes with product architecture source anchors found in semantic-runtime. */
  readonly routeWithSourceMatchCount: number;
}

/** One route row with explicit match evidence. */
export interface AtlasWorkRouteRow {
  /** Stable route id. */
  readonly id: string;
  /** Human-readable route title. */
  readonly title: string;
  /** Compact route summary. */
  readonly summary: string;
  /** Route domains. */
  readonly domains: readonly string[];
  /** Work roles this route can safely start. */
  readonly roles: readonly AtlasWorkRouteRole[];
  /** Declared route terms. */
  readonly terms: readonly string[];
  /** Sort score for this inquiry; higher rows are better starts. */
  readonly matchScore: number;
  /** Strongest match authority behind the score. */
  readonly matchStrength: AtlasWorkRouteMatchStrength;
  /** Human-readable match facts. */
  readonly matchedBy: readonly string[];
  /** Anchor counts grouped by anchor kind. */
  readonly anchorCounts: Readonly<Record<string, number>>;
  /** Explicit neighboring route ids. */
  readonly relatedRouteIds: readonly string[];
  /** Warnings or boundaries that should steer follow-up work. */
  readonly cautions: readonly string[];
}

/** Route plan joining one selected route to live Atlas substrates. */
export interface AtlasWorkRoutePlanRow {
  /** Stable route id. */
  readonly routeId: string;
  /** Route title. */
  readonly title: string;
  /** Match authority carried over from the route row. */
  readonly matchStrength: AtlasWorkRouteMatchStrength;
  /** Ordered authority lanes to consult before editing. */
  readonly authority: readonly string[];
  /** First useful questions after selecting this route. */
  readonly nextQuestions: readonly string[];
  /** Explicit neighboring route ids that should be checked when this route exposes adjacent pressure. */
  readonly relatedRouteIds: readonly string[];
  /** Source anchors plus live semantic-runtime matches. */
  readonly sourceAnchors: readonly AtlasWorkRouteSourcePlanRow[];
  /** Lens anchors that should be asked before editing through this route. */
  readonly lensAnchors: readonly AtlasWorkRouteLensAnchor[];
  /** Script anchors that provide compact pressure or verification lanes for this route. */
  readonly scriptAnchors: readonly AtlasWorkRouteScriptAnchor[];
  /** Documentation anchors that explain route intent or boundaries. */
  readonly docAnchors: readonly AtlasWorkRouteDocAnchor[];
  /** Memory rows that match route source, structurally filtered lens, doc, script, auLink, or memory anchors. */
  readonly memoryRecords: readonly AtlasMemoryRecordRow[];
  /** Memory next actions that match route source, structurally filtered lens, doc, script, auLink, or memory anchors. */
  readonly memoryNextActions: readonly AtlasMemoryNextActionRow[];
  /** Corpus fixture seeds that match route corpus anchors. */
  readonly fixtureSeeds: readonly FrameworkCorpusFixtureSeedRow[];
  /** Expected-effect descriptors that match route corpus anchors. */
  readonly expectedEffects: readonly FrameworkCorpusExpectedEffectDescriptorRow[];
  /** Query canaries that should keep routing to this route through structural ontology. */
  readonly queryCanaries: readonly AtlasWorkRouteQueryCanaryRow[];
  /** Exact AUR label extracted from a diagnostic route query, when present. */
  readonly frameworkErrorCodeLabel?: string;
  /** Explicit route cautions. */
  readonly cautions: readonly string[];
  /** Compact route-plan summary. */
  readonly summary: string;
}

/** Health issue discovered while joining one work route to live substrates. */
export interface AtlasWorkRouteHealthIssue {
  /** Stable issue kind. */
  readonly kind:
    | "missing-source-anchor"
    | "empty-memory-join"
    | "empty-fixture-seed-join"
    | "empty-expected-effect-join"
    | "query-canary-miss"
    | "missing-next-question";
  /** Issue severity. */
  readonly severity: "warning";
  /** Compact explanation. */
  readonly summary: string;
}

/** Work-route catalog health row. */
export interface AtlasWorkRouteHealthRow {
  /** Stable route id. */
  readonly routeId: string;
  /** Route title. */
  readonly title: string;
  /** Match authority carried over from the route row. */
  readonly matchStrength: AtlasWorkRouteMatchStrength;
  /** Count of declared source anchors. */
  readonly sourceAnchorCount: number;
  /** Count of source anchors found in the live source project. */
  readonly foundSourceAnchorCount: number;
  /** Count of route anchors eligible for durable memory joins. */
  readonly memoryAnchorCount: number;
  /** Count of memory records joined through route memory-join anchors. */
  readonly memoryRecordCount: number;
  /** Count of corpus anchors declared by the route. */
  readonly corpusAnchorCount: number;
  /** Count of fixture seeds joined through route corpus anchors. */
  readonly fixtureSeedCount: number;
  /** Count of expected-effect descriptors joined through route corpus anchors. */
  readonly expectedEffectCount: number;
  /** Count of query canaries declared by the route. */
  readonly queryCanaryCount: number;
  /** Count of declared query canaries that do not currently route with enough authority. */
  readonly failingQueryCanaryCount: number;
  /** Grounding issues that should be fixed before trusting this route for autonomous work. */
  readonly issues: readonly AtlasWorkRouteHealthIssue[];
  /** Compact health summary. */
  readonly summary: string;
}

/** One changed worktree file matched to a work route. */
export interface AtlasWorkRouteWorksetFileRow {
  /** Git porcelain status code for this path. */
  readonly status: string;
  /** Repository-relative changed path. */
  readonly filePath: string;
  /** Route-owned evidence kinds that matched this file. */
  readonly matchKinds: readonly string[];
}

/** Changed-file slice for one route. */
export interface AtlasWorkRouteWorksetRow {
  /** Stable route id. */
  readonly routeId: string;
  /** Route title. */
  readonly title: string;
  /** Number of changed files matched to this route. */
  readonly changedFileCount: number;
  /** Bounded changed-file rows. */
  readonly changedFiles: readonly AtlasWorkRouteWorksetFileRow[];
  /** Number of route source/doc anchors that matched at least one changed file. */
  readonly matchedAnchorCount: number;
  /** Number of memory record source/doc/fixture/live-check anchors that matched at least one changed file. */
  readonly matchedMemoryAnchorCount: number;
  /** Number of route memory records whose shard file changed. */
  readonly matchedMemoryShardCount: number;
  /** Compact workset summary. */
  readonly summary: string;
}

/** One route match for a live Atlas memory next action. */
export interface AtlasWorkRouteMemoryCoverageRouteRow {
  /** Route that owns the memory action structurally. */
  readonly routeId: string;
  /** Route title. */
  readonly title: string;
  /** Memory-anchor score behind the match. */
  readonly score: number;
}

/** Live memory next-action coverage through typed work routes. */
export interface AtlasWorkRouteMemoryCoverageRow {
  /** Memory next-action row id. */
  readonly id: string;
  /** Memory next-action kind. */
  readonly kind: string;
  /** Backing record id, when this action is record-shaped. */
  readonly recordId?: string;
  /** Backing memory status. */
  readonly status: string;
  /** Ranking weight copied from atlas.memory:next. */
  readonly rank: number;
  /** Domains copied from the memory next action. */
  readonly domains: readonly string[];
  /** True when at least one work route owns this action structurally. */
  readonly routed: boolean;
  /** Matching route rows ordered by score. */
  readonly routeMatches: readonly AtlasWorkRouteMemoryCoverageRouteRow[];
  /** Compact memory action summary. */
  readonly actionSummary: string;
  /** Compact coverage summary. */
  readonly summary: string;
}

/** Live source match for one source anchor. */
export interface AtlasWorkRouteSourcePlanRow {
  /** Source anchor declared by the route. */
  readonly anchor: AtlasWorkRouteSourceAnchor;
  /** True when a module or class matched the anchor path/symbol. */
  readonly found: boolean;
  /** True when the source file itself is admitted into Atlas's hot TypeScript world. */
  readonly admittedSourceFileFound: boolean;
  /** Generic declaration matches from any admitted package, used before package-specific architecture lenses interpret the file. */
  readonly admittedSourceDeclarations: readonly AtlasWorkRouteAdmittedSourceDeclarationRow[];
  /** Matching class surfaces. */
  readonly classSurfaces: readonly ProductArchitectureClassSurfaceRow[];
  /** Matching declaration surfaces, including function and type declarations. */
  readonly declarations: readonly ProductArchitectureDeclarationRow[];
  /** Matching function/method body surfaces, including class members when the anchor names a class. */
  readonly functionSurfaces: readonly ProductArchitectureFunctionSurfaceRow[];
  /** Matching source modules. */
  readonly modules: readonly ProductArchitectureModuleRow[];
  /** Matching Atlas class surfaces when the anchor points inside packages/atlas. */
  readonly atlasClassSurfaces: readonly AtlasSelfClassSurfaceRow[];
  /** Matching Atlas function surfaces when the anchor points inside packages/atlas. */
  readonly atlasFunctionSurfaces: readonly AtlasSelfFunctionSurfaceRow[];
  /** Matching Atlas variable surfaces when the anchor points inside packages/atlas. */
  readonly atlasVariableSurfaces: readonly AtlasSelfVariableSurfaceRow[];
  /** Matching Atlas source-file surfaces when the anchor points inside packages/atlas. */
  readonly atlasSourceFiles: readonly AtlasSelfSourceFileSurfaceRow[];
  /** Compact source-plan summary. */
  readonly summary: string;
}

/** Package-neutral declaration match for a work-route source anchor. */
export interface AtlasWorkRouteAdmittedSourceDeclarationRow {
  /** Declaration kind from the source substrate. */
  readonly kind: string;
  /** Declaration name, when available. */
  readonly name: string | null;
  /** Admitted package that owns the declaration file. */
  readonly packageId: string | null;
  /** Repository-relative declaration file path. */
  readonly filePath: string;
  /** True when the declaration is exported from its local source file. */
  readonly exported: boolean;
  /** Exact declaration span. */
  readonly source: SourceRange;
  /** Compact display summary. */
  readonly summary: string;
}

/** Health row for one route-owned spoken-query canary. */
export interface AtlasWorkRouteQueryCanaryRow {
  /** Query phrase being checked. */
  readonly query: string;
  /** Route that owns this canary. */
  readonly expectedRouteId: string;
  /** Minimum acceptable match authority. */
  readonly minimumStrength: AtlasWorkRouteMatchStrength;
  /** Best route selected by the live matcher, when any route matched. */
  readonly actualRouteId?: string;
  /** Match authority of the selected route, when any route matched. */
  readonly actualMatchStrength?: AtlasWorkRouteMatchStrength;
  /** True when the selected route and match authority satisfy the canary. */
  readonly passed: boolean;
  /** Canary rationale. */
  readonly summary: string;
}
