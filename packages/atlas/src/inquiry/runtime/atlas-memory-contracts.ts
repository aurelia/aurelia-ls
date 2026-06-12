import type {
  ProductArchitectureClassSurfaceRoleId,
  ProductArchitectureClassSurfaceRow,
} from "./product-architecture-analysis.js";
import type { ProductArchitectureSourceReference } from "./product-architecture-source.js";
import type {
  AtlasSelfClassSurfaceRow,
  AtlasSelfFunctionSurfaceRow,
  AtlasSelfSourceFileModuleShape,
  AtlasSelfSourceFileSurfaceRow,
  AtlasSelfVariableSurfaceRow,
} from "./self-analysis.js";
/** Schema marker for the filesystem-backed Atlas memory store. */
export const ATLAS_MEMORY_SCHEMA_VERSION = "atlas-memory.v1";

/** Repository-relative storage location for durable Atlas memory. */
export const ATLAS_MEMORY_REPO_PATH = "packages/atlas/memory/atlas-memory.json";

/** Durable memory record families. */
export type AtlasMemoryRecordKind =
  | "pressure-frontier"
  | "intentional-shape"
  | "reuse-guide"
  | "decision"
  | "doc-shard";

/** Whether an active pressure-frontier should appear as autonomous next work. */
export type AtlasMemoryNextActionPolicy =
  /** Surface this pressure-frontier as a normal next-action candidate. */
  | "proactive"
  /** Keep this frontier as guidance when the current task touches its domain, but do not let it drive unfiltered work. */
  | "when-touched"
  /** Keep the record queryable, but never turn it into a computed next action. */
  | "hidden";

/** Parse persisted next-action policy values without duplicating schema switches in readers and writers. */
export function atlasMemoryNextActionPolicyValue(
  value: unknown,
): AtlasMemoryNextActionPolicy | undefined {
  switch (value) {
    case "proactive":
    case "when-touched":
    case "hidden":
      return value;
    default:
      return undefined;
  }
}

/** Effective next-action policy after applying record-kind defaults. */
export function atlasMemoryEffectiveNextActionPolicy(
  record: Pick<AtlasMemoryRecord, "kind" | "nextActionPolicy">,
): AtlasMemoryNextActionPolicy | undefined {
  const explicit = atlasMemoryNextActionPolicyValue(record.nextActionPolicy);
  if (explicit !== undefined) {
    return explicit;
  }
  return record.kind === "pressure-frontier" ? "proactive" : undefined;
}

/** Live status computed by Atlas from the current worktree. */
export type AtlasMemoryComputedStatus =
  | "active"
  | "intentional-live"
  | "reference"
  | "resolved"
  | "stale-source"
  | "stale-check";

/** Source anchor carried by durable memory records. */
export interface AtlasMemorySourceAnchor {
  /** Anchor discriminator. */
  readonly kind: "source";
  /** Repository-relative source path. */
  readonly filePath: string;
  /** Optional symbol or declaration name for human orientation. */
  readonly symbolName?: string;
  /** Optional line hint used when exact source evidence is not known. */
  readonly line?: number;
  /** Grounded explanation of why this source matters. */
  readonly summary?: string;
}

/** Lens anchor carried by durable memory records. */
export interface AtlasMemoryLensAnchor {
  /** Anchor discriminator. */
  readonly kind: "lens";
  /** Stable Atlas lens id. */
  readonly lensId: string;
  /** Optional projection to ask first. */
  readonly projection?: string;
  /** Optional compact filter payload. */
  readonly filters?: Record<string, unknown>;
  /** Grounded explanation of why this lens matters. */
  readonly summary?: string;
}

/** Script anchor carried by durable memory records. */
export interface AtlasMemoryScriptAnchor {
  /** Anchor discriminator. */
  readonly kind: "script";
  /** Exact package script command. */
  readonly command: string;
  /** Grounded explanation of why this command matters. */
  readonly summary?: string;
}

/** Documentation anchor carried by durable memory records. */
export interface AtlasMemoryDocAnchor {
  /** Anchor discriminator. */
  readonly kind: "doc";
  /** Repository-relative documentation path. */
  readonly path: string;
  /** Optional heading or section label. */
  readonly heading?: string;
  /** Grounded explanation of why this document matters. */
  readonly summary?: string;
}

/** Fixture anchor carried by durable memory records. */
export interface AtlasMemoryFixtureAnchor {
  /** Anchor discriminator. */
  readonly kind: "fixture";
  /** Repository-relative fixture path. */
  readonly path: string;
  /** Optional fixture scenario or cluster label. */
  readonly scenario?: string;
  /** Grounded explanation of why this fixture matters. */
  readonly summary?: string;
}

/** auLink anchor carried by durable memory records. */
export interface AtlasMemoryAuLinkAnchor {
  /** Anchor discriminator. */
  readonly kind: "auLink";
  /** Stable auLink id such as `runtime-html:AttrMapper`. */
  readonly linkId: string;
  /** Optional semantic-runtime declaration name expected to carry the decorator. */
  readonly symbolName?: string;
  /** Grounded explanation of why this auLink concept matters. */
  readonly summary?: string;
}

/** External public reference carried by durable memory records. */
export interface AtlasMemoryExternalAnchor {
  /** Anchor discriminator. */
  readonly kind: "external";
  /** Public URL used as pressure input or migration context. */
  readonly url: string;
  /** Grounded explanation of why this external reference matters. */
  readonly summary?: string;
}

/** One durable memory anchor. */
export type AtlasMemoryAnchor =
  | AtlasMemorySourceAnchor
  | AtlasMemoryLensAnchor
  | AtlasMemoryScriptAnchor
  | AtlasMemoryDocAnchor
  | AtlasMemoryFixtureAnchor
  | AtlasMemoryAuLinkAnchor
  | AtlasMemoryExternalAnchor;

/** Exact query/search tokens contributed by a durable memory anchor. */
export function atlasMemoryAnchorQueryValues(
  anchor: AtlasMemoryAnchor,
): readonly string[] {
  switch (anchor.kind) {
    case "source":
      return [
        anchor.filePath,
        anchor.symbolName,
        anchor.summary,
      ].filter(isDefinedMemorySearchValue);
    case "lens":
      return [
        anchor.lensId,
        anchor.projection,
        anchor.summary,
        ...Object.entries(anchor.filters ?? {}).map(([key, value]) =>
          `${key}:${String(value)}`
        ),
      ].filter(isDefinedMemorySearchValue);
    case "script":
      return [anchor.command, anchor.summary].filter(isDefinedMemorySearchValue);
    case "doc":
      return [anchor.path, anchor.heading, anchor.summary].filter(isDefinedMemorySearchValue);
    case "fixture":
      return [anchor.path, anchor.scenario, anchor.summary].filter(isDefinedMemorySearchValue);
    case "auLink":
      return [anchor.linkId, anchor.symbolName, anchor.summary].filter(isDefinedMemorySearchValue);
    case "external":
      return [anchor.url, anchor.summary].filter(isDefinedMemorySearchValue);
  }
}

/** Compact single-string form for anchor search surfaces that do not need weighted tokens. */
export function atlasMemoryAnchorSearchText(anchor: AtlasMemoryAnchor): string {
  return atlasMemoryAnchorQueryValues(anchor).join(" ");
}

export function isDefinedMemorySearchValue(value: string | undefined): value is string {
  return value !== undefined && value.length > 0;
}

/** Live check that joins memory to semantic-runtime class pressure. */
export interface AtlasMemoryProductLargeClassCheck {
  /** Live check discriminator. */
  readonly kind: "product-large-class";
  /** Class declaration name to find in product.architecture. */
  readonly className: string;
  /** Optional repository-relative file path to disambiguate the class. */
  readonly filePath?: string;
  /** Optional line-count threshold that keeps a pressure frontier live. */
  readonly minLineCount?: number;
  /** Optional method-count threshold that keeps a pressure frontier live. */
  readonly minMethodCount?: number;
}

/** Live check that joins memory to a source file existing in the current checkout. */
export interface AtlasMemorySourceFileExistsCheck {
  /** Live check discriminator. */
  readonly kind: "source-file-exists";
  /** Repository-relative source or documentation path. */
  readonly filePath: string;
}

/** Live check that joins memory to an admitted TypeScript source declaration. */
export interface AtlasMemorySourceDeclarationExistsCheck {
  /** Live check discriminator. */
  readonly kind: "source-declaration-exists";
  /** Repository-relative source path. */
  readonly filePath: string;
  /** Declaration name to find in the admitted source project. */
  readonly symbolName: string;
}

/** Live check that joins memory to Atlas self-analysis source-file pressure. */
export interface AtlasMemoryAtlasSelfSourceFileCheck {
  /** Live check discriminator. */
  readonly kind: "atlas-self-source-file";
  /** Repository-relative Atlas source path. */
  readonly filePath: string;
  /** Optional file line threshold that keeps a pressure frontier live. */
  readonly minLineCount?: number;
  /** Optional outgoing local-import threshold that keeps coupling pressure live. */
  readonly minOutgoingLocalImportCount?: number;
  /** Optional incoming local-import threshold that keeps centrality pressure live. */
  readonly minIncomingLocalImportCount?: number;
  /** Optional cross-area outgoing import threshold that keeps coupling pressure live. */
  readonly minCrossAreaOutgoingImportCount?: number;
  /** Optional expected module shape observed by atlas.self. */
  readonly moduleShape?: AtlasSelfSourceFileModuleShape;
}

/** Live check that joins memory to Atlas self-analysis class pressure. */
export interface AtlasMemoryAtlasSelfClassCheck {
  /** Live check discriminator. */
  readonly kind: "atlas-self-class";
  /** Class declaration name to find in atlas.self. */
  readonly className: string;
  /** Optional repository-relative file path to disambiguate the class. */
  readonly filePath?: string;
  /** Optional class line threshold that keeps a pressure frontier live. */
  readonly minLineCount?: number;
  /** Optional method threshold that keeps a pressure frontier live. */
  readonly minMethodCount?: number;
}

/** Live check that joins memory to Atlas self-analysis function pressure. */
export interface AtlasMemoryAtlasSelfFunctionCheck {
  /** Live check discriminator. */
  readonly kind: "atlas-self-function";
  /** Function or method declaration name to find in atlas.self. */
  readonly functionName: string;
  /** Optional repository-relative file path to disambiguate the function. */
  readonly filePath?: string;
  /** Optional function line threshold that keeps a pressure frontier live. */
  readonly minLineCount?: number;
  /** Optional direct call threshold that keeps function-density pressure live. */
  readonly minCallCount?: number;
}

/** Live check that joins memory to Atlas self-analysis variable pressure. */
export interface AtlasMemoryAtlasSelfVariableCheck {
  /** Live check discriminator. */
  readonly kind: "atlas-self-variable";
  /** Top-level variable declaration name to find in atlas.self. */
  readonly variableName: string;
  /** Optional repository-relative file path to disambiguate the declaration. */
  readonly filePath?: string;
  /** Optional variable line threshold that keeps variable-density pressure live. */
  readonly minLineCount?: number;
  /** Optional large initializer threshold for table/catalog-shaped declarations. */
  readonly minInitializerEntryCount?: number;
  /** Optional initializer kind expected by the live check. */
  readonly initializerKind?: AtlasSelfVariableSurfaceRow["initializerKind"];
}

/** Live check that joins memory to a semantic-runtime auLink decorator placement. */
export interface AtlasMemoryAuLinkExistsCheck {
  /** Live check discriminator. */
  readonly kind: "auLink-exists";
  /** Stable auLink id to find in semantic-runtime source. */
  readonly linkId: string;
  /** Optional semantic-runtime declaration name to disambiguate the placement. */
  readonly symbolName?: string;
  /** Optional repository-relative source path to disambiguate the placement. */
  readonly filePath?: string;
}

/** One live check attached to a memory record. */
export type AtlasMemoryLiveCheck =
  | AtlasMemoryProductLargeClassCheck
  | AtlasMemorySourceFileExistsCheck
  | AtlasMemorySourceDeclarationExistsCheck
  | AtlasMemoryAtlasSelfSourceFileCheck
  | AtlasMemoryAtlasSelfClassCheck
  | AtlasMemoryAtlasSelfFunctionCheck
  | AtlasMemoryAtlasSelfVariableCheck
  | AtlasMemoryAuLinkExistsCheck;

/** Durable memory record loaded from the JSON store. */
export interface AtlasMemoryRecord {
  /** Stable memory id, used by filters and continuations. */
  readonly id: string;
  /** Record family. */
  readonly kind: AtlasMemoryRecordKind;
  /** Broad problem domains such as evaluator, router, app-builder, or fixture verification. */
  readonly domains: readonly string[];
  /** Compact human summary. */
  readonly summary: string;
  /** Why this record exists and what future Codex should preserve. */
  readonly rationale?: string;
  /** Actionable reuse or next-step guidance. */
  readonly guidance?: readonly string[];
  /** Optional scheduling policy for active pressure-frontier records. Defaults to proactive. */
  readonly nextActionPolicy?: AtlasMemoryNextActionPolicy;
  /** Anchors to source, lenses, scripts, or docs. */
  readonly anchors?: readonly AtlasMemoryAnchor[];
  /** Live checks that keep the record honest against the current worktree. */
  readonly liveChecks?: readonly AtlasMemoryLiveCheck[];
  /** ISO date string for first materialization. */
  readonly createdAt?: string;
  /** ISO date string for last durable update. */
  readonly updatedAt?: string;
}

/** Shard entry in the root JSON storage manifest. */
export interface AtlasMemoryShardReference {
  /** Repository-relative shard path. */
  readonly path: string;
  /** Human summary for the shard. */
  readonly summary?: string;
}

/** Root JSON storage manifest. */
export interface AtlasMemoryManifest {
  /** Schema marker. */
  readonly schemaVersion: typeof ATLAS_MEMORY_SCHEMA_VERSION;
  /** Repository-relative shard files that contain durable records. */
  readonly shards: readonly AtlasMemoryShardReference[];
}

/** Records loaded from one shard file. */
export interface AtlasMemoryShard {
  /** Schema marker. */
  readonly schemaVersion: typeof ATLAS_MEMORY_SCHEMA_VERSION;
  /** Durable records. */
  readonly records: readonly AtlasMemoryRecord[];
}

/** One durable memory record with storage provenance attached by the store reader. */
export interface AtlasMemoryStoredRecord {
  /** Durable record payload. */
  readonly record: AtlasMemoryRecord;
  /** Repository-relative shard path that supplied the record. */
  readonly shardPath: string;
  /** Zero-based record index within the normalized shard payload. */
  readonly shardIndex: number;
  /** One-based line of the record id inside the shard file, when found. */
  readonly shardLine?: number;
}

/** Durable memory records loaded from every manifest shard. */
export interface AtlasMemoryDatabase {
  /** Schema marker. */
  readonly schemaVersion: typeof ATLAS_MEMORY_SCHEMA_VERSION;
  /** Durable records with storage provenance. */
  readonly records: readonly AtlasMemoryStoredRecord[];
}

/** One issue observed while reading durable memory. */
export interface AtlasMemoryStorageIssue {
  /** Issue id. */
  readonly id: string;
  /** Issue summary. */
  readonly summary: string;
}

/** Result of loading the durable memory database. */
export interface AtlasMemoryStoreRead {
  /** Absolute JSON storage path. */
  readonly storagePath: string;
  /** True when the JSON storage file exists. */
  readonly storageExists: boolean;
  /** Parsed database, empty when missing or invalid. */
  readonly database: AtlasMemoryDatabase;
  /** Storage issues that should be visible to maintainers. */
  readonly issues: readonly AtlasMemoryStorageIssue[];
}

/** One live check result for a record. */
export interface AtlasMemoryLiveCheckResult {
  /** Original live check. */
  readonly check: AtlasMemoryLiveCheck;
  /** Check-local status before record-level reduction. */
  readonly status: "active" | "present" | "resolved" | "stale-source" | "stale-check";
  /** Grounded summary of the observed live fact. */
  readonly summary: string;
  /** Product class source when available. */
  readonly source?: ProductArchitectureSourceReference;
  /** Matched class row when available. */
  readonly productClass?: ProductArchitectureClassSurfaceRow;
  /** Matched Atlas source-file row when available. */
  readonly atlasSelfSourceFile?: AtlasSelfSourceFileSurfaceRow;
  /** Matched Atlas class row when available. */
  readonly atlasSelfClass?: AtlasSelfClassSurfaceRow;
  /** Matched Atlas function row when available. */
  readonly atlasSelfFunction?: AtlasSelfFunctionSurfaceRow;
  /** Matched Atlas variable row when available. */
  readonly atlasSelfVariable?: AtlasSelfVariableSurfaceRow;
}

/** Durable memory record joined to live checks. */
export interface AtlasMemoryRecordRow {
  /** Stable row id. */
  readonly id: string;
  /** Durable record. */
  readonly record: AtlasMemoryRecord;
  /** Repository-relative shard path that supplied the record. */
  readonly shardPath: string;
  /** Zero-based record index within the normalized shard payload. */
  readonly shardIndex: number;
  /** One-based line of the record id inside the shard file, when found. */
  readonly shardLine?: number;
  /** Record kind copied for filters. */
  readonly kind: AtlasMemoryRecordKind;
  /** Domains copied for filters. */
  readonly domains: readonly string[];
  /** Computed worktree status. */
  readonly status: AtlasMemoryComputedStatus;
  /** Effective scheduling policy for next-action computation after record-kind defaults. */
  readonly nextActionPolicy?: AtlasMemoryNextActionPolicy;
  /** Live check results. */
  readonly liveChecks: readonly AtlasMemoryLiveCheckResult[];
  /** Compact row summary. */
  readonly summary: string;
}

/** Live semantic-runtime frontier with no durable memory record yet. */
export interface AtlasMemoryUntrackedProductClassFrontier {
  /** Stable row id. */
  readonly id: string;
  /** Class declaration name. */
  readonly className: string;
  /** Repository-relative source path. */
  readonly filePath: string;
  /** Product source area inferred by product.architecture. */
  readonly area: string;
  /** Domains inferred for filtering untracked live pressure. */
  readonly domains: readonly string[];
  /** Method count. */
  readonly methodCount: number;
  /** Property/accessor count. */
  readonly propertyCount: number;
  /** Source span line count. */
  readonly lineCount: number;
  /** Coarse class role from product.architecture for pressure triage. */
  readonly surfaceRole: ProductArchitectureClassSurfaceRoleId;
  /** Human-readable reason for the inferred class role. */
  readonly surfaceRoleReason: string;
  /** Exact class source. */
  readonly source: ProductArchitectureSourceReference;
  /** Compact row summary. */
  readonly summary: string;
}

/** Rollup computed from memory rows and live pressure. */
export interface AtlasMemoryRollup {
  /** Durable record count. */
  readonly recordCount: number;
  /** Record counts by durable kind. */
  readonly byKind: Readonly<Record<string, number>>;
  /** Record counts by computed status. */
  readonly byStatus: Readonly<Record<string, number>>;
  /** Number of untracked live large product classes. */
  readonly untrackedProductClassFrontierCount: number;
  /** Untracked live product class frontier counts by semantic-runtime source area. */
  readonly untrackedProductClassFrontiersByArea: Readonly<Record<string, number>>;
  /** Untracked live product class frontier counts by product.architecture class role. */
  readonly untrackedProductClassFrontiersBySurfaceRole: Readonly<Record<string, number>>;
  /** Storage issue count. */
  readonly storageIssueCount: number;
}

/** Complete Atlas memory analysis for one source project read. */
export interface AtlasMemoryAnalysis {
  /** Schema marker. */
  readonly version: typeof ATLAS_MEMORY_SCHEMA_VERSION;
  /** Absolute JSON storage path. */
  readonly storagePath: string;
  /** True when the storage file exists. */
  readonly storageExists: boolean;
  /** Durable records joined to live checks. */
  readonly records: readonly AtlasMemoryRecordRow[];
  /** Live product class frontiers not covered by durable records. */
  readonly untrackedProductClassFrontiers: readonly AtlasMemoryUntrackedProductClassFrontier[];
  /** Rollup counts. */
  readonly rollup: AtlasMemoryRollup;
  /** Storage issues. */
  readonly issues: readonly AtlasMemoryStorageIssue[];
}

/** Select stale or resolved durable memory rows that need re-checking before reuse. */
