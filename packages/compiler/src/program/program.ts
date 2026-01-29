// Compiler facade
import {
  compileTemplate,
  type CompileOverlayResult,
  type TemplateCompilation,
  type TemplateDiagnostics,
  type StageMetaSnapshot,
} from "../facade.js";

// Model imports (via barrel)
import type { NormalizedPath } from "../model/index.js";

// Language imports (via barrel)
import {
  buildSemanticsSnapshotFromProject,
  type ProjectSnapshot,
  type TemplateContext,
  type ResourceScopeId,
} from "../schema/index.js";
import {
  fingerprintAttrRes,
  fingerprintAttributePatternConfig,
  fingerprintBindingBehaviorSig,
  fingerprintBindingCommandConfig,
  fingerprintElementRes,
  fingerprintTemplateControllerUsage,
  fingerprintValueConverterSig,
} from "../fingerprint/index.js";

// Parsing imports (via barrel)
import type { AttributeParser, IExpressionParser } from "../parsing/index.js";

// Shared imports (via barrel)
import { debug, type VmReflection, type ModuleResolver } from "../shared/index.js";

// Pipeline imports (via barrel)
import type { CacheOptions, FingerprintHints, FingerprintToken, StageOutputs, StageKey } from "../pipeline/index.js";
import { stableHash, stableHashSemantics } from "../pipeline/index.js";

// Synthesis imports (via barrel)
import type { TemplateMappingArtifact, TemplateQueryFacade } from "../synthesis/index.js";

// Program layer imports
import type { DocumentSnapshot, DocumentUri } from "./primitives.js";
import { InMemorySourceStore, type SourceStore } from "./sources.js";
import { InMemoryProvenanceIndex, type ProvenanceIndex } from "./provenance.js";
import { canonicalDocumentUri, deriveTemplatePaths, normalizeDocumentUri, type CanonicalDocumentUri } from "./paths.js";

export type TemplateContextResolver = (uri: DocumentUri) => TemplateContext | null | undefined;

export interface TemplateProgramOptions {
  readonly vm: VmReflection;
  readonly isJs: boolean;
  readonly project: ProjectSnapshot;
  /** Optional per-template context resolver (scope/local imports). */
  readonly templateContext?: TemplateContextResolver;
  readonly moduleResolver: ModuleResolver;
  readonly attrParser?: AttributeParser;
  readonly exprParser?: IExpressionParser;
  readonly cache?: CacheOptions;
  readonly fingerprints?: FingerprintHints;
  readonly overlayBaseName?: string;
  readonly sourceStore?: SourceStore;
  readonly provenance?: ProvenanceIndex;
  readonly telemetry?: TemplateProgramTelemetry;
}

type ProgramOptions = Omit<TemplateProgramOptions, "sourceStore" | "provenance" | "telemetry">;
type ResolvedProgramOptions = ProgramOptions & { readonly fingerprints: FingerprintHints };

interface CachedCompilation {
  readonly compilation: TemplateCompilation;
  readonly version: number;
  readonly contentHash: string;
  readonly optionsFingerprint: string;
  readonly contextFingerprint: string;
  readonly scopeId: ResourceScopeId | null;
}

interface CoreStageCacheEntry {
  readonly stages: Pick<StageOutputs, "10-lower" | "20-link" | "30-bind" | "40-typecheck">;
  readonly version: number;
  readonly contentHash: string;
  readonly optionsFingerprint: string;
  readonly contextFingerprint: string;
  readonly scopeId: ResourceScopeId | null;
}

const STAGE_ORDER: readonly StageKey[] = [
  "10-lower",
  "20-link",
  "30-bind",
  "40-typecheck",
  "50-usage",
  "overlay:plan",
  "overlay:emit",
] as const;

const CORE_STAGE_KEYS: readonly StageKey[] = ["10-lower", "20-link", "30-bind", "40-typecheck"];

interface CacheAccessEntry {
  readonly programCacheHit: boolean;
  readonly stageMeta: StageMetaSnapshot;
  readonly version: number;
  readonly contentHash: string;
}

interface CacheAccessRecord {
  overlay?: CacheAccessEntry;
}

export interface TemplateDependencySet {
  readonly scopeId: ResourceScopeId | null;
  readonly vm: string;
  readonly elements: readonly string[];
  readonly attributes: readonly string[];
  readonly controllers: readonly string[];
  readonly commands: readonly string[];
  readonly patterns: readonly string[];
  readonly valueConverters: readonly string[];
  readonly bindingBehaviors: readonly string[];
}

export interface TemplateDependencyRecord {
  readonly deps: TemplateDependencySet;
  readonly fingerprint: string;
}

export interface TemplateProgramUpdateResult {
  readonly changed: boolean;
  readonly invalidated: readonly DocumentUri[];
  readonly retained: readonly DocumentUri[];
  readonly mode: "none" | "global" | "dependency";
}

export interface StageReuseSummary {
  readonly seeded: readonly StageKey[];
  readonly fromCache: readonly StageKey[];
  readonly computed: readonly StageKey[];
  readonly meta: StageMetaSnapshot;
}

export interface TemplateProgramCacheEntryStats {
  readonly version: number;
  readonly contentHash: string;
  readonly optionsFingerprint: string;
  readonly programCacheHit: boolean;
  readonly stageReuse: StageReuseSummary | null;
}

export interface TemplateProgramCoreCacheEntryStats extends TemplateProgramCacheEntryStats {
  readonly stages: readonly StageKey[];
}

export interface TemplateProgramProvenanceStats {
  readonly totalEdges: number;
  readonly overlayEdges: number;
  readonly runtimeEdges: number;
  readonly overlayUri: DocumentUri | null;
  readonly runtimeUri: DocumentUri | null;
}

export interface TemplateProgramDocumentStats {
  readonly uri: DocumentUri;
  readonly version: number | null;
  readonly contentHash: string | null;
  readonly compilation?: TemplateProgramCacheEntryStats;
  readonly core?: TemplateProgramCoreCacheEntryStats;
  readonly provenance: TemplateProgramProvenanceStats;
}

export interface TemplateProgramCacheStats {
  readonly optionsFingerprint: string;
  readonly totals: {
    readonly sources: number;
    readonly compilation: number;
    readonly core: number;
    readonly provenanceEdges: number;
  };
  readonly documents: readonly TemplateProgramDocumentStats[];
}

export interface TemplateProgramCacheAccessEvent {
  readonly kind: "overlay";
  readonly uri: DocumentUri;
  readonly version: number;
  readonly contentHash: string;
  readonly optionsFingerprint: string;
  readonly programCacheHit: boolean;
  readonly stageReuse: StageReuseSummary;
}

export interface TemplateProgramMaterializationEvent {
  readonly kind: "overlay";
  readonly uri: DocumentUri;
  readonly durationMs: number;
  readonly programCacheHit: boolean;
  readonly stageReuse: StageReuseSummary;
}

export interface TemplateProgramProvenanceEvent {
  readonly templateUri: DocumentUri;
  readonly overlayUri: DocumentUri | null;
  readonly runtimeUri: DocumentUri | null;
  readonly overlayEdges: number;
  readonly runtimeEdges: number;
  readonly totalEdges: number;
}

export interface TemplateProgramTelemetry {
  readonly onCacheAccess?: (event: TemplateProgramCacheAccessEvent) => void;
  readonly onMaterialization?: (event: TemplateProgramMaterializationEvent) => void;
  readonly onProvenance?: (event: TemplateProgramProvenanceEvent) => void;
}

/**
 * High-level facade over the Aurelia template pipeline.
 * Owns documents, compilation cache, provenance ingestion, and product helpers.
 *
 * Construction options are assumed stable for the lifetime of the program.
 * Hosts should compare `optionsFingerprint` to detect option drift and recreate
 * a program instead of mutating it in place.
 */
export interface TemplateProgram {
  readonly options: ResolvedProgramOptions;
  readonly optionsFingerprint: string;
  readonly sources: SourceStore;
  readonly provenance: ProvenanceIndex;
  readonly telemetry: TemplateProgramTelemetry | undefined;

  upsertTemplate(uri: DocumentUri, text: string, version?: number): void;
  invalidateTemplate(uri: DocumentUri): void;
  invalidateAll(): void;
  closeTemplate(uri: DocumentUri): void;

  getDiagnostics(uri: DocumentUri): TemplateDiagnostics;
  getOverlay(uri: DocumentUri): CompileOverlayResult;
  buildAllOverlays(): ReadonlyMap<DocumentUri, CompileOverlayResult>;
  getQuery(uri: DocumentUri): TemplateQueryFacade;
  getMapping(uri: DocumentUri): TemplateMappingArtifact | null;
  getCompilation(uri: DocumentUri): TemplateCompilation;
  getCacheStats(target?: DocumentUri): TemplateProgramCacheStats;
  updateOptions?(options: TemplateProgramOptions): TemplateProgramUpdateResult;
}

export class DefaultTemplateProgram implements TemplateProgram {
  options: ResolvedProgramOptions;
  optionsFingerprint: string;
  readonly sources: SourceStore;
  readonly provenance: ProvenanceIndex;
  readonly telemetry: TemplateProgramTelemetry | undefined;

  private fingerprintHints: FingerprintHints;
  private readonly compilationCache = new Map<DocumentUri, CachedCompilation>();
  private readonly coreCache = new Map<DocumentUri, CoreStageCacheEntry>();
  private readonly accessTrace = new Map<DocumentUri, CacheAccessRecord>();
  private readonly dependencyIndex = new Map<DocumentUri, TemplateDependencyRecord>();

  constructor(options: TemplateProgramOptions) {
    const { sourceStore, provenance, telemetry, ...rest } = options;
    this.fingerprintHints = normalizeFingerprintHints(rest);
    this.options = { ...rest, fingerprints: this.fingerprintHints };
    this.optionsFingerprint = computeProgramOptionsFingerprint(rest, this.fingerprintHints);
    this.sources = sourceStore ?? new InMemorySourceStore();
    this.provenance = provenance ?? new InMemoryProvenanceIndex();
    this.telemetry = telemetry;
  }

  upsertTemplate(uri: DocumentUri, text: string, version?: number): void {
    const canonical = this.canonicalUri(uri);
    this.resetDocumentState(canonical, false);
    this.sources.set(canonical.uri, text, version);
  }

  invalidateTemplate(uri: DocumentUri): void {
    const canonical = this.canonicalUri(uri);
    this.resetDocumentState(canonical, false);
  }

  invalidateAll(): void {
    for (const uri of this.collectKnownUris()) {
      this.resetDocumentState(this.canonicalUri(uri), false);
    }
  }

  closeTemplate(uri: DocumentUri): void {
    const canonical = this.canonicalUri(uri);
    this.resetDocumentState(canonical, true);
  }

  private snapshot(uri: DocumentUri): DocumentSnapshot {
    const canonical = this.canonicalUri(uri);
    const snap = this.sources.get(canonical.uri);
    if (!snap) {
      throw new Error(`TemplateProgram: no snapshot for document ${String(canonical.uri)}. Call upsertTemplate(...) first.`);
    }
    return snap;
  }

  getCompilation(uri: DocumentUri): TemplateCompilation {
    const canonical = this.canonicalUri(uri);
    const snap = this.snapshot(canonical.uri);
    const startedAt = nowMs();
    const contentHash = hashSnapshotContent(snap);
    const context = resolveTemplateContext(this.options, canonical.uri);
    const contextFingerprint = fingerprintTemplateContext(context);
    const scopeId = context.scopeId ?? null;
    const cached = this.compilationCache.get(canonical.uri);
    if (
      cached &&
      cached.contextFingerprint === contextFingerprint &&
      cached.optionsFingerprint === this.optionsFingerprint &&
      cached.contentHash === contentHash
    ) {
      if (!this.dependencyIndex.has(canonical.uri)) {
        this.dependencyIndex.set(canonical.uri, buildDependencyRecord(canonical.uri, cached.compilation, this.options));
      }
      if (cached.version !== snap.version) {
        this.compilationCache.set(canonical.uri, { ...cached, version: snap.version });
      }
      this.recordAccess(canonical.uri, "overlay", {
        programCacheHit: true,
        stageMeta: cached.compilation.meta,
        version: snap.version,
        contentHash,
      });
      const stageReuse = summarizeStageMeta(cached.compilation.meta);
      const durationMs = elapsedMs(startedAt);
      this.emitCacheAccess("overlay", canonical.uri, snap.version, contentHash, stageReuse, true);
      this.emitMaterialization("overlay", canonical.uri, durationMs, stageReuse, true);
      return cached.compilation;
    }
    if (cached) {
      if (cached.contextFingerprint !== contextFingerprint) {
        debug.workspace("program.cache.context-miss", {
          uri: canonical.uri,
          cachedContext: cached.contextFingerprint,
          currentContext: contextFingerprint,
          cachedScope: cached.scopeId ?? null,
          currentScope: scopeId ?? null,
        });
      } else if (cached.optionsFingerprint !== this.optionsFingerprint) {
        debug.workspace("program.cache.fingerprint-miss", {
          uri: canonical.uri,
          cachedFingerprint: cached.optionsFingerprint,
          currentFingerprint: this.optionsFingerprint,
        });
      } else if (cached.contentHash !== contentHash) {
        debug.workspace("program.cache.content-miss", {
          uri: canonical.uri,
          cachedHash: cached.contentHash,
          currentHash: contentHash,
        });
      }
    }

    // NOTE: program-level cache is guarded by content hash + options fingerprint.
    const templatePaths = deriveTemplatePaths(
      canonical.uri,
      withOverlayBase(this.options.isJs, this.options.overlayBaseName),
    );
    const compileOpts = this.buildCompileOptions(snap, templatePaths.template.path);
    const seed = this.coreSeed(canonical.uri, contentHash);
    const compilation = compileTemplate(compileOpts, seed ?? undefined);

    // Feed overlay mapping into provenance for downstream features.
    const overlayUri = normalizeDocumentUri(compilation.overlay.overlayPath);
    this.provenance.addOverlayMapping(canonical.uri, overlayUri, compilation.mapping);

    this.coreCache.set(canonical.uri, {
      stages: {
        "10-lower": compilation.ir,
        "20-link": compilation.linked,
        "30-bind": compilation.scope,
        "40-typecheck": compilation.typecheck,
      },
      version: snap.version,
      contentHash,
      optionsFingerprint: this.optionsFingerprint,
      contextFingerprint,
      scopeId,
    });

    const stageReuse = summarizeStageMeta(compilation.meta);
    const durationMs = elapsedMs(startedAt);
    this.compilationCache.set(canonical.uri, {
      compilation,
      version: snap.version,
      contentHash,
      optionsFingerprint: this.optionsFingerprint,
      contextFingerprint,
      scopeId,
    });
    this.dependencyIndex.set(canonical.uri, buildDependencyRecord(canonical.uri, compilation, this.options));
    this.recordAccess(canonical.uri, "overlay", {
      programCacheHit: false,
      stageMeta: compilation.meta,
      version: snap.version,
      contentHash,
    });
    this.emitCacheAccess("overlay", canonical.uri, snap.version, contentHash, stageReuse, false);
    this.emitMaterialization("overlay", canonical.uri, durationMs, stageReuse, false);
    this.emitProvenanceStats(canonical.uri);
    return compilation;
  }

  getDiagnostics(uri: DocumentUri): TemplateDiagnostics {
    return this.getCompilation(uri).diagnostics;
  }

  getOverlay(uri: DocumentUri): CompileOverlayResult {
    return this.getCompilation(uri).overlay;
  }

  buildAllOverlays(): ReadonlyMap<DocumentUri, CompileOverlayResult> {
    const results = new Map<DocumentUri, CompileOverlayResult>();
    for (const snap of this.sources.all()) {
      const canonical = this.canonicalUri(snap.uri);
      results.set(canonical.uri, this.getOverlay(canonical.uri));
    }
    return results;
  }

  getQuery(uri: DocumentUri): TemplateQueryFacade {
    return this.getCompilation(uri).query;
  }

  getMapping(uri: DocumentUri): TemplateMappingArtifact | null {
    return this.getCompilation(uri).mapping ?? null;
  }

  getCacheStats(target?: DocumentUri): TemplateProgramCacheStats {
    const filterUri = target ? this.canonicalUri(target).uri : null;
    const provenanceStats = this.provenance.stats();
    const documents: TemplateProgramDocumentStats[] = [];
    const uris = filterUri ? [filterUri] : Array.from(this.collectKnownUris());

    for (const uri of uris) {
      const canonical = this.canonicalUri(uri);
      const snap = this.sources.get(canonical.uri);
      const compilation = this.compilationCache.get(canonical.uri);
      const core = this.coreCache.get(canonical.uri);
      const provenance = this.provenance.templateStats(canonical.uri);

      const contentHash =
        (snap ? hashSnapshotContent(snap) : null) ??
        compilation?.contentHash ??
        core?.contentHash ??
        null;

      documents.push({
        uri: canonical.uri,
        version: snap?.version ?? null,
        contentHash,
        ...(compilation ? { compilation: this.overlayCacheStats(canonical.uri, compilation) } : {}),
        ...(core ? { core: this.coreCacheStats(core) } : {}),
        provenance: {
          totalEdges: provenance.totalEdges,
          overlayEdges: provenance.overlayEdges,
          runtimeEdges: provenance.runtimeEdges,
          overlayUri: provenance.overlayUri,
          runtimeUri: provenance.runtimeUri,
        },
      });
    }

    documents.sort((a, b) => a.uri.localeCompare(b.uri));

    return {
      optionsFingerprint: this.optionsFingerprint,
      totals: {
        sources: this.countSources(),
        compilation: this.compilationCache.size,
        core: this.coreCache.size,
        provenanceEdges: provenanceStats.totalEdges,
      },
      documents,
    };
  }

  updateOptions(options: TemplateProgramOptions): TemplateProgramUpdateResult {
    const { sourceStore, provenance, telemetry, ...rest } = options;
    void sourceStore;
    void provenance;
    void telemetry;

    const nextHints = normalizeFingerprintHints(rest);
    const nextOptions: ResolvedProgramOptions = { ...rest, fingerprints: nextHints };
    const nextFingerprint = computeProgramOptionsFingerprint(rest, nextHints);
    debug.workspace("program.update", {
      currentFingerprint: this.optionsFingerprint,
      nextFingerprint,
      cacheEntries: this.compilationCache.size,
    });

    if (nextFingerprint === this.optionsFingerprint) {
      this.options = nextOptions;
      this.fingerprintHints = nextHints;
      const retained = Array.from(this.compilationCache.keys());
      debug.workspace("program.update.result", {
        mode: "none",
        invalidated: 0,
        retained: retained.length,
      });
      return { changed: false, invalidated: [], retained, mode: "none" };
    }

    if (isGlobalOptionChange(this.options, nextOptions, this.fingerprintHints, nextHints)) {
      const invalidated = Array.from(this.collectKnownUris());
      this.options = nextOptions;
      this.optionsFingerprint = nextFingerprint;
      this.fingerprintHints = nextHints;
      this.invalidateAll();
      debug.workspace("program.update.result", {
        mode: "global",
        invalidated: invalidated.length,
        retained: 0,
      });
      return { changed: true, invalidated, retained: [], mode: "global" };
    }

    const invalidated: DocumentUri[] = [];
    const retained: DocumentUri[] = [];

    for (const [uri, cached] of Array.from(this.compilationCache.entries())) {
      const record = this.dependencyIndex.get(uri) ?? buildDependencyRecord(uri, cached.compilation, this.options);
      const nextContext = resolveTemplateContext(nextOptions, uri);
      const nextDepsFingerprint = computeDependencyFingerprint(record.deps, nextOptions, nextContext);
      if (nextDepsFingerprint !== record.fingerprint) {
        debug.workspace("program.invalidate.deps", {
          uri,
          scopeId: record.deps.scopeId ?? null,
          vm: record.deps.vm,
          elements: record.deps.elements,
          attributes: record.deps.attributes,
          controllers: record.deps.controllers,
          commands: record.deps.commands,
          patterns: record.deps.patterns,
          valueConverters: record.deps.valueConverters,
          bindingBehaviors: record.deps.bindingBehaviors,
        });
        invalidated.push(uri);
        this.resetDocumentState(this.canonicalUri(uri), false);
        continue;
      }
      retained.push(uri);
      this.dependencyIndex.set(uri, { deps: record.deps, fingerprint: nextDepsFingerprint });
      this.compilationCache.set(uri, { ...cached, optionsFingerprint: nextFingerprint });
      const core = this.coreCache.get(uri);
      if (core) {
        this.coreCache.set(uri, { ...core, optionsFingerprint: nextFingerprint });
      }
    }

    this.options = nextOptions;
    this.optionsFingerprint = nextFingerprint;
    this.fingerprintHints = nextHints;

    debug.workspace("program.update.result", {
      mode: "dependency",
      invalidated: invalidated.length,
      retained: retained.length,
    });
    return { changed: true, invalidated, retained, mode: "dependency" };
  }

  private coreSeed(
    uri: DocumentUri,
    contentHash: string,
  ): Partial<Record<StageKey, StageOutputs[StageKey]>> | null {
    const cached = this.coreCache.get(uri);
    if (!cached) return null;
    const contextFingerprint = fingerprintTemplateContext(resolveTemplateContext(this.options, uri));
    if (cached.contextFingerprint !== contextFingerprint) return null;
    if (cached.optionsFingerprint !== this.optionsFingerprint) return null;
    if (cached.contentHash !== contentHash) return null;
    return {
      "10-lower": cached.stages["10-lower"],
      "20-link": cached.stages["20-link"],
      "30-bind": cached.stages["30-bind"],
      "40-typecheck": cached.stages["40-typecheck"],
    };
  }

  private overlayCacheStats(uri: DocumentUri, cached: CachedCompilation): TemplateProgramCacheEntryStats {
    const access = this.accessTrace.get(uri)?.overlay;
    return {
      version: cached.version,
      contentHash: cached.contentHash,
      optionsFingerprint: cached.optionsFingerprint,
      programCacheHit: access?.programCacheHit ?? false,
      stageReuse: summarizeStageMeta(cached.compilation.meta),
    };
  }

  private coreCacheStats(cached: CoreStageCacheEntry): TemplateProgramCoreCacheEntryStats {
    return {
      version: cached.version,
      contentHash: cached.contentHash,
      optionsFingerprint: cached.optionsFingerprint,
      programCacheHit: false,
      stageReuse: null,
      stages: CORE_STAGE_KEYS,
    };
  }

  private recordAccess(uri: DocumentUri, kind: "overlay", access: CacheAccessEntry): void {
    const existing = this.accessTrace.get(uri) ?? {};
    this.accessTrace.set(uri, { ...existing, [kind]: access });
  }

  private emitCacheAccess(
    kind: TemplateProgramCacheAccessEvent["kind"],
    uri: DocumentUri,
    version: number,
    contentHash: string,
    stageReuse: StageReuseSummary,
    programCacheHit: boolean,
  ): void {
    this.telemetry?.onCacheAccess?.({
      kind,
      uri,
      version,
      contentHash,
      optionsFingerprint: this.optionsFingerprint,
      programCacheHit,
      stageReuse,
    });
  }

  private emitMaterialization(
    kind: TemplateProgramMaterializationEvent["kind"],
    uri: DocumentUri,
    durationMs: number,
    stageReuse: StageReuseSummary,
    programCacheHit: boolean,
  ): void {
    this.telemetry?.onMaterialization?.({
      kind,
      uri,
      durationMs,
      programCacheHit,
      stageReuse,
    });
  }

  private emitProvenanceStats(templateUri: DocumentUri): void {
    const handler = this.telemetry?.onProvenance;
    if (!handler) return;
    const stats = this.provenance.templateStats(templateUri);
    handler({
      templateUri: stats.templateUri,
      overlayUri: stats.overlayUri,
      runtimeUri: stats.runtimeUri,
      overlayEdges: stats.overlayEdges,
      runtimeEdges: stats.runtimeEdges,
      totalEdges: stats.totalEdges,
    });
  }

  private resetDocumentState(canonical: CanonicalDocumentUri, dropSource: boolean): void {
    debug.workspace("program.reset", {
      uri: canonical.uri,
      dropSource,
    });
    this.compilationCache.delete(canonical.uri);
    this.coreCache.delete(canonical.uri);
    this.accessTrace.delete(canonical.uri);
    this.dependencyIndex.delete(canonical.uri);
    this.provenance.removeDocument(canonical.uri);
    if (dropSource) this.sources.delete(canonical.uri);
  }

  private collectKnownUris(): Set<DocumentUri> {
    const uris = new Set<DocumentUri>();
    for (const snap of this.sources.all()) {
      uris.add(this.canonicalUri(snap.uri).uri);
    }
    for (const key of this.compilationCache.keys()) uris.add(this.canonicalUri(key).uri);
    for (const key of this.coreCache.keys()) uris.add(this.canonicalUri(key).uri);
    const prov = this.provenance.stats();
    for (const doc of prov.documents) uris.add(this.canonicalUri(doc.uri).uri);
    return uris;
  }

  private countSources(): number {
    let count = 0;
    for (const _ of this.sources.all()) count += 1;
    return count;
  }

  private canonicalUri(input: DocumentUri): CanonicalDocumentUri {
    return canonicalDocumentUri(input);
  }

  private buildCompileOptions(snap: DocumentSnapshot, templatePath: NormalizedPath) {
    const templateContext = resolveTemplateContext(this.options, snap.uri);
    const opts: {
      html: string;
      templateFilePath: string;
      isJs: boolean;
      vm: VmReflection;
      project: ProjectSnapshot;
      templateContext?: TemplateContext;
      attrParser?: AttributeParser;
      exprParser?: IExpressionParser;
      moduleResolver: ModuleResolver;
      overlayBaseName?: string;
      cache?: CacheOptions;
      fingerprints?: FingerprintHints;
    } = {
      html: snap.text,
      templateFilePath: templatePath,
      isJs: this.options.isJs,
      vm: this.options.vm,
      project: this.options.project,
      moduleResolver: this.options.moduleResolver,
    };
    if (templateContext) opts.templateContext = templateContext;
    if (this.options.attrParser !== undefined) opts.attrParser = this.options.attrParser;
    if (this.options.exprParser !== undefined) opts.exprParser = this.options.exprParser;
    if (this.options.overlayBaseName !== undefined) opts.overlayBaseName = this.options.overlayBaseName;
    if (this.options.cache !== undefined) opts.cache = this.options.cache;
    opts.fingerprints = this.fingerprintHints;

    return opts;
  }
}

function nowMs(): number {
  return Date.now();
}

function elapsedMs(startedAt: number): number {
  return nowMs() - startedAt;
}

function withOverlayBase(
  isJs: boolean,
  overlayBaseName: string | undefined,
): { isJs: boolean; overlayBaseName?: string } {
  const base: { isJs: boolean; overlayBaseName?: string } = { isJs };
  if (overlayBaseName !== undefined) base.overlayBaseName = overlayBaseName;
  return base;
}

function summarizeStageMeta(meta: StageMetaSnapshot): StageReuseSummary {
  const seeded: StageKey[] = [];
  const fromCache: StageKey[] = [];
  const computed: StageKey[] = [];
  for (const key of STAGE_ORDER) {
    const entry = meta[key];
    if (!entry) continue;
    if (entry.source === "seed") {
      seeded.push(key);
    } else if (entry.source === "cache") {
      fromCache.push(key);
    } else {
      computed.push(key);
    }
  }
  return { seeded, fromCache, computed, meta };
}

function hashSnapshotContent(snap: DocumentSnapshot): string {
  return stableHash(snap.text);
}

function computeProgramOptionsFingerprint(options: ProgramOptions, hints: FingerprintHints): string {
  const project = options.project;
  const sem = project.semantics;
  const overlayHint = hints.overlay ?? { isJs: options.isJs, syntheticPrefix: options.vm.getSyntheticPrefix?.() ?? "__AU_TTC_" };
  const catalogHint = hints.catalog ?? stableHash(project.catalog);
  const syntaxHint = hints.syntax ?? stableHash(project.syntax);
  const moduleResolverHint = hints.moduleResolver ?? "custom";
  const graphHint = project.resourceGraph ? stableHash(project.resourceGraph) : null;
  const fingerprint: Record<string, FingerprintHints[keyof FingerprintHints]> = {
    isJs: options.isJs,
    overlayBaseName: options.overlayBaseName ?? null,
    semantics: hints.semantics ?? stableHashSemantics(sem),
    catalog: catalogHint,
    syntax: syntaxHint,
    resourceGraph: graphHint,
    defaultScope: project.defaultScope ?? null,
    attrParser: hints.attrParser ?? (options.attrParser ? "custom" : "default"),
    exprParser: hints.exprParser ?? (options.exprParser ? "custom" : "default"),
    vm: hints.vm ?? fingerprintVm(options.vm),
    overlay: overlayHint,
    analyze: hints.analyze ?? null,
    moduleResolver: moduleResolverHint,
    extra: extractExtraFingerprintHints(hints),
  };
  return stableHash(fingerprint);
}

function normalizeFingerprintHints(options: ProgramOptions): FingerprintHints {
  const base: FingerprintHints = { ...(options.fingerprints ?? {}) };
  const sem = options.project.semantics;
  if (base.semantics === undefined) base.semantics = stableHashSemantics(sem);
  if (base.catalog === undefined) base.catalog = stableHash(options.project.catalog);
  if (base.syntax === undefined) base.syntax = stableHash(options.project.syntax);
  if (base.attrParser === undefined) base.attrParser = options.attrParser ? "custom" : "default";
  if (base.exprParser === undefined) base.exprParser = options.exprParser ? "custom" : "default";
  if (base.vm === undefined) base.vm = fingerprintVm(options.vm);
  if (base.moduleResolver === undefined) base.moduleResolver = "custom";
  if (base.overlay === undefined) {
    const syntheticPrefix = options.vm.getSyntheticPrefix?.() ?? "__AU_TTC_";
    base.overlay = { isJs: options.isJs, syntheticPrefix };
  }
  return base;
}

function fingerprintVm(vm: VmReflection): string {
  if (hasQualifiedVm(vm)) return vm.getQualifiedRootVmTypeExpr();
  return vm.getRootVmTypeExpr();
}

function hasQualifiedVm(vm: VmReflection): vm is VmReflection & { getQualifiedRootVmTypeExpr: () => string } {
  return typeof (vm as { getQualifiedRootVmTypeExpr?: unknown }).getQualifiedRootVmTypeExpr === "function";
}

function extractExtraFingerprintHints(hints: FingerprintHints): Record<string, FingerprintToken> | null {
  const extras: Record<string, FingerprintToken> = {};
  for (const [key, value] of Object.entries(hints)) {
    if (
      key === "attrParser" ||
      key === "exprParser" ||
      key === "catalog" ||
      key === "syntax" ||
      key === "semantics" ||
      key === "vm" ||
      key === "overlay" ||
      key === "analyze" ||
      key === "moduleResolver"
    ) {
      continue;
    }
    if (value === undefined) continue;
    extras[key] = value;
  }
  return Object.keys(extras).length ? extras : null;
}

function buildDependencyRecord(
  uri: DocumentUri,
  compilation: TemplateCompilation,
  options: ResolvedProgramOptions,
): TemplateDependencyRecord {
  const context = resolveTemplateContext(options, uri);
  const deps = collectTemplateDependencies(compilation, options, context);
  const fingerprint = computeDependencyFingerprint(deps, options, context);
  return { deps, fingerprint };
}

function collectTemplateDependencies(
  compilation: TemplateCompilation,
  options: ResolvedProgramOptions,
  context: TemplateContext,
): TemplateDependencySet {
  const usage = compilation.usage;
  const scopeId = context.scopeId ?? null;
  return {
    scopeId,
    vm: fingerprintVm(options.vm),
    elements: normalizeResourceNames(usage.elements),
    attributes: normalizeResourceNames(usage.attributes),
    controllers: normalizeResourceNames(usage.controllers),
    commands: normalizeNames(usage.commands),
    patterns: normalizeNames(usage.patterns),
    valueConverters: normalizeResourceNames(usage.valueConverters),
    bindingBehaviors: normalizeResourceNames(usage.bindingBehaviors),
  };
}

function normalizeResourceNames(names: readonly string[]): string[] {
  const out = new Set<string>();
  for (const name of names) {
    if (!name) continue;
    out.add(name.toLowerCase());
  }
  return Array.from(out).sort((a, b) => a.localeCompare(b));
}

function normalizeNames(names: readonly string[]): string[] {
  const out = new Set<string>();
  for (const name of names) {
    if (!name) continue;
    out.add(name);
  }
  return Array.from(out).sort((a, b) => a.localeCompare(b));
}

function computeDependencyFingerprint(
  deps: TemplateDependencySet,
  options: ResolvedProgramOptions,
  context: TemplateContext,
): string {
  const scoped = buildSemanticsSnapshotFromProject(options.project, context);
  const resources = scoped.semantics.resources;
  const syntax = scoped.syntax;
  const global = {
    dom: stableHash(scoped.semantics.dom),
    events: stableHash(scoped.semantics.events),
    naming: stableHash(scoped.semantics.naming),
    twoWayDefaults: stableHash(scoped.semantics.twoWayDefaults),
  };
  const localImportsFingerprint = context.localImports ? stableHash(context.localImports) : null;

  const resourceFingerprints = [
    ...deps.elements.map((name) => ({
      kind: "element",
      name,
      fingerprint: fingerprintElementRes(resources.elements[name]),
    })),
    ...deps.attributes.map((name) => ({
      kind: "attribute",
      name,
      fingerprint: fingerprintAttrRes(resources.attributes[name]),
    })),
    ...deps.controllers.map((name) => ({
      kind: "controller",
      name,
      fingerprint: fingerprintTemplateControllerUsage(
        resources.controllers[name],
        resources.attributes[name],
      ),
    })),
    ...deps.valueConverters.map((name) => ({
      kind: "value-converter",
      name,
      fingerprint: fingerprintValueConverterSig(resources.valueConverters[name]),
    })),
    ...deps.bindingBehaviors.map((name) => ({
      kind: "binding-behavior",
      name,
      fingerprint: fingerprintBindingBehaviorSig(resources.bindingBehaviors[name]),
    })),
  ];

  const commandFingerprints = deps.commands.map((name) => ({
    name,
    fingerprint: fingerprintBindingCommandConfig(syntax.bindingCommands[name]),
  }));

  const patternMap = new Map(syntax.attributePatterns.map((p) => [p.pattern, p]));
  const patternFingerprints = deps.patterns.map((pattern) => ({
    pattern,
    fingerprint: fingerprintAttributePatternConfig(patternMap.get(pattern)),
  }));

    return stableHash({
      scopeId: deps.scopeId ?? null,
      localImports: localImportsFingerprint,
      vm: deps.vm,
      global,
      resources: resourceFingerprints,
      commands: commandFingerprints,
      patterns: patternFingerprints,
  });
}

function resolveTemplateContext(options: ResolvedProgramOptions, uri: DocumentUri): TemplateContext {
  const provided = options.templateContext?.(uri) ?? null;
  const graph = options.project.resourceGraph ?? null;
  const defaultScope = options.project.defaultScope ?? graph?.root ?? null;
  const scopeId = provided && provided.scopeId !== undefined ? provided.scopeId : defaultScope;
  const localImports = provided?.localImports;
  return {
    ...(scopeId !== undefined ? { scopeId } : {}),
    ...(localImports ? { localImports } : {}),
  };
}

function fingerprintTemplateContext(context: TemplateContext): string {
  return stableHash({
    scopeId: context.scopeId ?? null,
    localImports: context.localImports ? stableHash(context.localImports) : null,
  });
}

function isGlobalOptionChange(
  current: ResolvedProgramOptions,
  next: ResolvedProgramOptions,
  currentHints: FingerprintHints,
  nextHints: FingerprintHints,
): boolean {
  if (current.isJs !== next.isJs) return true;
  if ((current.overlayBaseName ?? null) !== (next.overlayBaseName ?? null)) return true;

  const currentAttr = stableHash(currentHints.attrParser ?? null);
  const nextAttr = stableHash(nextHints.attrParser ?? null);
  if (currentAttr !== nextAttr) return true;

  const currentExpr = stableHash(currentHints.exprParser ?? null);
  const nextExpr = stableHash(nextHints.exprParser ?? null);
  if (currentExpr !== nextExpr) return true;

  const currentOverlay = stableHash(currentHints.overlay ?? null);
  const nextOverlay = stableHash(nextHints.overlay ?? null);
  if (currentOverlay !== nextOverlay) return true;

  const currentAnalyze = stableHash(currentHints.analyze ?? null);
  const nextAnalyze = stableHash(nextHints.analyze ?? null);
  if (currentAnalyze !== nextAnalyze) return true;

  const currentModuleResolver = stableHash(currentHints.moduleResolver ?? null);
  const nextModuleResolver = stableHash(nextHints.moduleResolver ?? null);
  if (currentModuleResolver !== nextModuleResolver) return true;

  return false;
}
