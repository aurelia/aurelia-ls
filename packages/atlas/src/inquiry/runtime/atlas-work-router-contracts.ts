import type { LensId } from "../lens.js";

/** Schema marker for Atlas's typed work-routing catalog. */
export const ATLAS_WORK_ROUTER_VERSION = "atlas-work-router.v1";

/** Match authority for one work route candidate. */
export type AtlasWorkRouteMatchStrength =
  /** No caller filter selected this row; catalog order is being shown for orientation. */
  | "catalog-default"
  /** A caller supplied an exact route id, lens id, auLink id, source path, symbol, effect kind, or recipe key. */
  | "exact-structural"
  /** The current worktree matched route-owned source, doc, path, memory-shard, or memory-anchor evidence. */
  | "workset-structural"
  /** Live product/source pressure matched route-owned source anchors. */
  | "product-structural"
  /** Live Atlas memory next-action pressure matched route-owned memory, source, lens, or auLink anchors. */
  | "memory-structural"
  /** A caller matched declared route domains, roles, or route-owned vocabulary terms. */
  | "declared-route-term"
  /** A caller matched a route through explicit related-route adjacency rather than text similarity. */
  | "adjacent-ontology"
  /** A caller matched only descriptive prose; this should be treated as ontology pressure, not proof. */
  | "weak-text";

/** Route role: the kind of work the route is meant to help an agent start. */
export type AtlasWorkRouteRole =
  | "orient"
  | "author"
  | "analyze"
  | "refactor"
  | "verify"
  | "document"
  | "improve-atlas";

/** Spoken or task-shaped query that must keep routing to a route through structural ontology. */
export interface AtlasWorkRouteQueryCanary {
  /** Query phrase future agents or users are likely to ask. */
  readonly query: string;
  /** Minimum acceptable match strength for this phrase. Defaults to declared-route-term. */
  readonly minimumStrength?: AtlasWorkRouteMatchStrength;
  /** Why this phrase matters as a route coverage canary. */
  readonly summary: string;
}

/** Cross-cutting route completeness dimension that should be discoverable from adjacent topics. */
export const enum AtlasWorkRouteCoverageDimension {
  /** Source-bearing routes should reuse shared authored-text and line/offset boundaries instead of local file reads. */
  AuthoredSourceTextBoundary = "authored-source-text-boundary",
  /** Checker-bearing routes should reuse TypeSystemProject/checker helpers instead of feature-local TypeChecker forks. */
  CheckerValueAccess = "checker-value-access",
  /** Public answer families still need intent-aware typed continuations threaded through route-local APIs. */
  IntentAwareContinuations = "intent-aware-continuations",
  /** Public answer families that materialize through query-claim retention, reuse, disposal, or telemetry policy. */
  QueryClaimGraph = "query-claim-graph",
}

/** Route-local state for a cross-cutting coverage dimension. */
export const enum AtlasWorkRouteCoverageState {
  /** Route-local obligation is implemented and should have a witness when possible. */
  Covered = "covered",
  /** Route-local obligation exists but still has known gaps. */
  Partial = "partial",
  /** Route-local obligation is relevant and not implemented yet. */
  Missing = "missing",
  /** Dimension has been considered and does not apply to this route. */
  NotApplicable = "not-applicable",
}

/** Evidence depth for a route-local coverage row; prevents structural wiring from masquerading as semantic verification. */
export const enum AtlasWorkRouteCoverageDepth {
  /** Public surfaces can carry the dimension, but route-specific semantics have not been checked deeply. */
  Wired = "wired",
  /** Route-specific products, evidence, or framework semantics are reflected in the dimension. */
  Semantic = "semantic",
  /** A contract, fixture canary, concrete query, or source-level proof witnesses the route-specific behavior. */
  Verified = "verified",
}

/** Route-local coverage for cross-cutting product dimensions that should surface from adjacent topics. */
export interface AtlasWorkRouteCoverage {
  /** Cross-cutting dimension being covered or explicitly not applicable. */
  readonly dimension: AtlasWorkRouteCoverageDimension;
  /** Current route-local state for this dimension. */
  readonly state: AtlasWorkRouteCoverageState;
  /** Depth of evidence behind the current state, when this route has any implemented coverage. */
  readonly depth?: AtlasWorkRouteCoverageDepth;
  /** Route that owns the dimension's substrate, when this route is only a consumer or pressure lane. */
  readonly ownerRouteId?: string;
  /** Grounded explanation of what is covered, missing, or intentionally out of scope. */
  readonly summary: string;
}

/** Anchor role inside one work route. */
export type AtlasWorkRouteAnchorRole =
  | "primary"
  | "supporting"
  | "pressure"
  | "grounding"
  | "caution";

/** Source declaration or file that should be inspected for a route. */
export interface AtlasWorkRouteSourceAnchor {
  /** Anchor discriminator. */
  readonly kind: "source";
  /** Repository-relative source path. */
  readonly filePath: string;
  /** Optional declaration name when the route is about a specific surface. */
  readonly symbolName?: string;
  /** How this anchor should be weighed inside the route. */
  readonly role: AtlasWorkRouteAnchorRole;
  /** Grounded explanation of why this source is relevant. */
  readonly summary: string;
}

/** Atlas lens continuation that should be asked for a route. */
export interface AtlasWorkRouteLensAnchor {
  /** Anchor discriminator. */
  readonly kind: "lens";
  /** Stable Atlas lens id. */
  readonly lensId: LensId;
  /** Preferred projection to ask first. */
  readonly projection?: string;
  /** Preferred structural filters to apply. */
  readonly filters?: Readonly<Record<string, unknown>>;
  /** How this anchor should be weighed inside the route. */
  readonly role: AtlasWorkRouteAnchorRole;
  /** Grounded explanation of why this lens is relevant. */
  readonly summary: string;
}

/** Atlas memory filter that should be joined for a route. */
export interface AtlasWorkRouteMemoryAnchor {
  /** Anchor discriminator. */
  readonly kind: "memory";
  /** Memory domains to join exactly before falling back to text. */
  readonly domains: readonly string[];
  /** Optional memory anchor lens id filter. */
  readonly anchorLensId?: LensId;
  /** Optional source symbol filter. */
  readonly symbolName?: string;
  /** Optional auLink filter. */
  readonly auLinkId?: string;
  /** How this anchor should be weighed inside the route. */
  readonly role: AtlasWorkRouteAnchorRole;
  /** Grounded explanation of why this memory lane is relevant. */
  readonly summary: string;
}

/** Framework corpus filter that should seed examples or framework grounding for a route. */
export interface AtlasWorkRouteCorpusAnchor {
  /** Anchor discriminator. */
  readonly kind: "framework-corpus";
  /** Preferred framework corpus projection. */
  readonly projection: "docs" | "doc-snippets" | "tests" | "test-snippets" | "expected-effects" | "fixture-seeds";
  /** Declared corpus concept such as forms, router, templates, or observation. */
  readonly concept?: string;
  /** Optional corpus query used when concept/effect filters are too broad for the route's actual pressure. */
  readonly query?: string;
  /** Expected semantic effect kind when the route should join fixture-effect descriptors. */
  readonly effectKind?: string;
  /** Authoring recipe key when the route should join recipe-seeded fixture examples. */
  readonly recipeKey?: string;
  /** Typed fixture-seed classification kind when route pressure needs an exact reason lane. */
  readonly classificationKind?: string;
  /** Typed fixture-seed classification key when route pressure needs an exact reason lane. */
  readonly classificationKey?: string;
  /** Expected-effect filter field when the route needs one concrete semantic fact. */
  readonly expectedEffectFilterField?: string;
  /** Expected-effect filter value when the route needs one concrete semantic fact. */
  readonly expectedEffectFilterValue?: string;
  /** Fixture seed authority lane: docs/promoted pattern or framework-test behavior grounding. */
  readonly seedUse?: "authoring-taste" | "behavior-grounding";
  /** How this anchor should be weighed inside the route. */
  readonly role: AtlasWorkRouteAnchorRole;
  /** Grounded explanation of why this corpus lane is relevant. */
  readonly summary: string;
}

/** auLink identity that should be mirrored back to the Aurelia framework before changing semantic-runtime. */
export interface AtlasWorkRouteAuLinkAnchor {
  /** Anchor discriminator. */
  readonly kind: "auLink";
  /** Stable product-to-framework auLink id. */
  readonly linkId: string;
  /** Optional product declaration expected to carry the auLink. */
  readonly symbolName?: string;
  /** How this anchor should be weighed inside the route. */
  readonly role: AtlasWorkRouteAnchorRole;
  /** Grounded explanation of why this framework mirror matters. */
  readonly summary: string;
}

/** Script command that gives a compact first read for a route. */
export interface AtlasWorkRouteScriptAnchor {
  /** Anchor discriminator. */
  readonly kind: "script";
  /** Package script command to run. */
  readonly command: string;
  /** How this anchor should be weighed inside the route. */
  readonly role: AtlasWorkRouteAnchorRole;
  /** Grounded explanation of why this script matters. */
  readonly summary: string;
}

/** Durable documentation anchor for route steering that should survive compactions. */
export interface AtlasWorkRouteDocAnchor {
  /** Anchor discriminator. */
  readonly kind: "doc";
  /** Repository-relative markdown path. */
  readonly path: string;
  /** Optional section or heading. */
  readonly heading?: string;
  /** How this anchor should be weighed inside the route. */
  readonly role: AtlasWorkRouteAnchorRole;
  /** Grounded explanation of why this doc matters. */
  readonly summary: string;
}

/** Route-owned path prefix for current-workset grouping when exact declaration anchors are intentionally too narrow. */
export interface AtlasWorkRoutePathAnchor {
  /** Anchor discriminator. */
  readonly kind: "path";
  /** Repository-relative file or directory prefix owned by this route for workset/path filtering. */
  readonly pathPrefix: string;
  /** How this anchor should be weighed inside the route. */
  readonly role: AtlasWorkRouteAnchorRole;
  /** Grounded explanation of why this path belongs to the route. */
  readonly summary: string;
}

/** One typed route anchor. */
export type AtlasWorkRouteAnchor =
  | AtlasWorkRouteSourceAnchor
  | AtlasWorkRouteLensAnchor
  | AtlasWorkRouteMemoryAnchor
  | AtlasWorkRouteCorpusAnchor
  | AtlasWorkRouteAuLinkAnchor
  | AtlasWorkRouteScriptAnchor
  | AtlasWorkRouteDocAnchor
  | AtlasWorkRoutePathAnchor;

/** One typed work route. Routes are ontology rows, not fuzzy task labels. */
export interface AtlasWorkRoute {
  /** Stable route id used by filters, continuations, and memory records. */
  readonly id: string;
  /** Alternate exact handles accepted by routeId filters when memory or human-facing names intentionally differ from the canonical id. */
  readonly aliases?: readonly string[];
  /** Human-readable route title. */
  readonly title: string;
  /** Compact summary of what this route is for. */
  readonly summary: string;
  /** Product/problem domains that must stay exact route vocabulary. */
  readonly domains: readonly string[];
  /** Work roles this route can safely start. */
  readonly roles: readonly AtlasWorkRouteRole[];
  /** Declared search terms owned by the route; query hits here are weaker than structural filters but stronger than prose. */
  readonly terms: readonly string[];
  /** Human-language route canaries checked by route-health; these do not replace ontology terms or anchors. */
  readonly queryCanaries?: readonly AtlasWorkRouteQueryCanary[];
  /** Explicit cross-cutting coverage rows, used when a topic should rediscover broader incomplete dimensions. */
  readonly coverage?: readonly AtlasWorkRouteCoverage[];
  /** Concrete source, lens, memory, corpus, script, doc, or auLink anchors. */
  readonly anchors: readonly AtlasWorkRouteAnchor[];
  /** Ordered authority lanes to consult before making changes through this route. */
  readonly authority: readonly string[];
  /** Things future agents should avoid over-assuming when this route matches. */
  readonly cautions: readonly string[];
  /** First useful questions after selecting this route. */
  readonly nextQuestions: readonly string[];
  /** Explicit neighboring routes; adjacency is declared rather than inferred by similar prose. */
  readonly relatedRouteIds: readonly string[];
}
