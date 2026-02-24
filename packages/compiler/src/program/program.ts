// Template Program — L2 Architecture
//
// Owns document lifecycle and compilation caching for a set of templates.
// Invalidation is driven by the dependency graph at the model level.
// The program is a thin wrapper over compileTemplate (facade.ts) with
// per-document content-hash caching. No fingerprint-based invalidation,
// no per-stage caching, no dependency index — the dep graph handles all of that.

import {
  compileTemplate,
  type CompileOptions,
  type CompileOverlayResult,
  type TemplateCompilation,
  type TemplateDiagnostics,
} from "../facade.js";

import type { NormalizedPath } from "../model/index.js";
import type { DependencyGraph, TemplateContext, ResourceScopeId } from "../schema/index.js";
import type { SemanticModelQuery } from "../schema/model.js";
import type { AttributeParser, IExpressionParser } from "../parsing/index.js";
import { debug, createTrace, createConsoleExporter, NOOP_TRACE, type VmReflection, type ModuleResolver, type CompileTrace } from "../shared/index.js";
import { stableHash } from "../pipeline/index.js";
import type { TemplateMappingArtifact, TemplateQueryFacade } from "../synthesis/index.js";

import type { DocumentSnapshot, DocumentUri } from "./primitives.js";
import { InMemorySourceStore, type SourceStore } from "./sources.js";
import { InMemoryProvenanceIndex, type ProvenanceIndex } from "./provenance.js";
import { canonicalDocumentUri, deriveTemplatePaths, normalizeDocumentUri, type CanonicalDocumentUri } from "./paths.js";

// ============================================================================
// Options
// ============================================================================

export type TemplateContextResolver = (uri: DocumentUri) => TemplateContext | null | undefined;

export interface TemplateProgramOptions {
  readonly vm: VmReflection;
  readonly isJs: boolean;
  /** Semantic authority — the query IS the model. */
  readonly query: SemanticModelQuery;
  /** Per-template scope/local-import resolver. */
  readonly templateContext?: TemplateContextResolver;
  readonly moduleResolver: ModuleResolver;
  readonly attrParser?: AttributeParser;
  readonly exprParser?: IExpressionParser;
  readonly overlayBaseName?: string;
  readonly sourceStore?: SourceStore;
  readonly provenance?: ProvenanceIndex;
  /** Trace for per-compilation instrumentation. */
  readonly trace?: CompileTrace;
}

// ============================================================================
// Update Result
// ============================================================================

export interface TemplateProgramUpdateResult {
  readonly changed: boolean;
  /** How invalidation was determined: "dependency" for selective, "full" for brute-force. */
  readonly mode?: "dependency" | "full";
  readonly invalidated: readonly DocumentUri[];
  readonly retained: readonly DocumentUri[];
}

// ============================================================================
// Template Program Interface
// ============================================================================

export interface TemplateProgram {
  readonly query: SemanticModelQuery;
  readonly sources: SourceStore;
  readonly provenance: ProvenanceIndex;
  readonly options: TemplateProgramOptions;
  /** Model fingerprint — changes when semantics change. */
  readonly optionsFingerprint: string;

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
  updateOptions(options: TemplateProgramOptions): TemplateProgramUpdateResult;
  getCacheStats(uri?: DocumentUri): CacheStats;
}

// ============================================================================
// Cache Stats
// ============================================================================

export interface CacheStatsDocument {
  readonly version: number;
  readonly compilation?: {
    readonly programCacheHit: boolean;
    readonly stageReuse?: { readonly seeded: readonly string[]; readonly computed: readonly string[] };
  };
  readonly core?: unknown;
  readonly provenance: {
    readonly totalEdges: number;
    readonly overlayEdges?: number;
  };
}

export interface CacheStats {
  readonly documents: readonly CacheStatsDocument[];
  readonly totals: {
    readonly sources: number;
    readonly compilation: number;
    /** Core pipeline cache count (currently mirrors compilation). */
    readonly core: number;
    readonly provenanceEdges: number;
  };
}

// ============================================================================
// Cached Compilation
// ============================================================================

interface CachedCompilation {
  readonly compilation: TemplateCompilation;
  readonly contentHash: string;
  readonly programCacheHit: boolean;
  readonly stageReuse: { readonly seeded: readonly string[]; readonly computed: readonly string[] };
}

interface CachedLowerResult {
  readonly ir: import("../model/index.js").IrModule;
  readonly contentHash: string;
  readonly vocabFingerprint: string;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultTemplateProgram implements TemplateProgram {
  query: SemanticModelQuery;
  options: TemplateProgramOptions;
  optionsFingerprint: string;
  readonly sources: SourceStore;
  readonly provenance: ProvenanceIndex;

  #modelFingerprint: string;
  #vocabFingerprint: string;
  readonly #compilationCache = new Map<DocumentUri, CachedCompilation>();
  readonly #lowerCache = new Map<DocumentUri, CachedLowerResult>();

  constructor(options: TemplateProgramOptions) {
    this.options = options;
    this.query = options.query;
    this.#modelFingerprint = options.query.model.fingerprint;
    this.#vocabFingerprint = stableHash(options.query.model.syntax);
    this.optionsFingerprint = this.#modelFingerprint;
    this.sources = options.sourceStore ?? new InMemorySourceStore();
    this.provenance = options.provenance ?? new InMemoryProvenanceIndex();
  }

  upsertTemplate(uri: DocumentUri, text: string, version?: number): void {
    const canonical = canonicalDocumentUri(uri);
    const prev = this.sources.get(canonical.uri);
    if (prev) {
      if (version !== undefined && version < prev.version) return;
      const unchangedVersion = version === undefined || version === prev.version;
      if (unchangedVersion && prev.text === text) return;
    }
    this.#compilationCache.delete(canonical.uri);
    this.sources.set(canonical.uri, text, version);
  }

  invalidateTemplate(uri: DocumentUri): void {
    const canonical = canonicalDocumentUri(uri);
    this.#compilationCache.delete(canonical.uri);
    this.provenance.removeDocument(canonical.uri);
  }

  invalidateAll(): void {
    for (const uri of this.#compilationCache.keys()) {
      this.provenance.removeDocument(uri);
    }
    this.#compilationCache.clear();
  }

  closeTemplate(uri: DocumentUri): void {
    const canonical = canonicalDocumentUri(uri);
    this.#compilationCache.delete(canonical.uri);
    this.#lowerCache.delete(canonical.uri);
    this.provenance.removeDocument(canonical.uri);
    this.sources.delete(canonical.uri);
  }

  getCompilation(uri: DocumentUri): TemplateCompilation {
    const canonical = canonicalDocumentUri(uri);
    const snap = this.sources.get(canonical.uri);
    if (!snap) {
      throw new Error(`TemplateProgram: no document for ${String(canonical.uri)}. Call upsertTemplate first.`);
    }

    const contentHash = stableHash(snap.text);
    const cached = this.#compilationCache.get(canonical.uri);
    if (cached && cached.contentHash === contentHash) {
      // Mark as cache hit for stats
      this.#compilationCache.set(canonical.uri, { ...cached, programCacheHit: true });
      return cached.compilation;
    }

    // Check per-stage lower cache: reuse IR if content + vocabulary unchanged
    const cachedLower = this.#lowerCache.get(canonical.uri);
    const canReuseLower = cachedLower
      && cachedLower.contentHash === contentHash
      && cachedLower.vocabFingerprint === this.#vocabFingerprint;
    const seededIr = canReuseLower ? cachedLower.ir : undefined;

    // Compile (skip lower stage when seeded IR available)
    const templatePaths = deriveTemplatePaths(
      canonical.uri,
      { isJs: this.options.isJs, overlayBaseName: this.options.overlayBaseName },
    );
    const templateContext = this.options.templateContext?.(canonical.uri) ?? undefined;
    const trace = this.options.trace ?? NOOP_TRACE;
    const compilation = trace.span("program:compile", () => compileTemplate({
      html: snap.text,
      templateFilePath: templatePaths.template.path,
      isJs: this.options.isJs,
      vm: this.options.vm,
      query: this.query,
      moduleResolver: this.options.moduleResolver,
      templateContext: templateContext ?? undefined,
      attrParser: this.options.attrParser,
      exprParser: this.options.exprParser,
      overlayBaseName: this.options.overlayBaseName,
      trace,
      seededIr,
    }));

    // Cache the lowered IR for future reuse
    if (!canReuseLower) {
      this.#lowerCache.set(canonical.uri, {
        ir: compilation.ir,
        contentHash,
        vocabFingerprint: this.#vocabFingerprint,
      });
    }
    const stageReuse = canReuseLower
      ? { seeded: ["10-lower"] as const, computed: ["20-link", "30-bind", "40-typecheck", "50-usage", "overlay:plan", "overlay:emit"] as const }
      : { seeded: [] as const, computed: ["10-lower", "20-link", "30-bind", "40-typecheck", "50-usage", "overlay:plan", "overlay:emit"] as const };

    // Feed overlay mapping into provenance
    const overlayUri = normalizeDocumentUri(compilation.overlay.overlayPath);
    this.provenance.addOverlayMapping(canonical.uri, overlayUri, compilation.mapping);

    this.#compilationCache.set(canonical.uri, { compilation, contentHash, programCacheHit: false, stageReuse });
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
      results.set(snap.uri, this.getOverlay(snap.uri));
    }
    return results;
  }

  getQuery(uri: DocumentUri): TemplateQueryFacade {
    return this.getCompilation(uri).query;
  }

  getMapping(uri: DocumentUri): TemplateMappingArtifact | null {
    return this.getCompilation(uri).mapping ?? null;
  }

  /**
   * Update the semantic authority. Uses the dependency graph to selectively
   * invalidate only templates that depend on changed resources.
   *
   * Algorithm:
   * 1. Diff old vs new model entries to find changed convergence-entry nodes.
   * 2. Walk the dep graph (getAffected) to find template-compilation nodes
   *    that transitively depend on the changed entries.
   * 3. Invalidate only those templates; retain the rest.
   */
  updateOptions(options: TemplateProgramOptions): TemplateProgramUpdateResult {
    const nextFingerprint = options.query.model.fingerprint;
    const changed = nextFingerprint !== this.#modelFingerprint;
    const prevModel = this.query.model;

    const nextVocabFingerprint = stableHash(options.query.model.syntax);
    const vocabChanged = nextVocabFingerprint !== this.#vocabFingerprint;

    this.options = options;
    this.query = options.query;
    this.#modelFingerprint = nextFingerprint;
    this.#vocabFingerprint = nextVocabFingerprint;
    this.optionsFingerprint = nextFingerprint;

    // Vocabulary change (frozen tier) → clear lower caches so all templates re-lower
    if (vocabChanged) {
      this.#lowerCache.clear();
    }

    if (!changed) {
      return { changed: false, invalidated: [], retained: Array.from(this.#compilationCache.keys()) };
    }

    // Diff model entries to find which convergence-entry nodes changed
    const prevEntries = prevModel.entries;
    const nextEntries = options.query.model.entries;
    const depGraph = prevModel.deps;

    const changedNodeIds: import("../schema/dependency-graph.js").DepNodeId[] = [];
    // Find added or modified entries
    for (const [key, nextEntry] of nextEntries) {
      const prevEntry = prevEntries.get(key);
      if (!prevEntry || stableHash(prevEntry.def) !== stableHash(nextEntry.def)) {
        const nodeId = depGraph.findNode('convergence-entry', key);
        if (nodeId) changedNodeIds.push(nodeId);
      }
    }
    // Find removed entries
    for (const key of prevEntries.keys()) {
      if (!nextEntries.has(key)) {
        const nodeId = depGraph.findNode('convergence-entry', key);
        if (nodeId) changedNodeIds.push(nodeId);
      }
    }

    // If no specific resource changes identified (e.g., vocabulary or config change),
    // or if the dep graph has no recorded edges, fall back to full invalidation.
    if (changedNodeIds.length === 0 || depGraph.edgeCount === 0) {
      const invalidated = Array.from(this.#compilationCache.keys());
      this.invalidateAll();
      return { changed: true, mode: "full", invalidated, retained: [] };
    }

    // Walk the dep graph to find affected template-compilation nodes
    const affected = depGraph.getAffected(changedNodeIds);
    const affectedTemplates = new Set<string>();
    for (const nodeId of affected) {
      const node = depGraph.nodes.get(nodeId);
      if (node?.kind === 'template-compilation') {
        affectedTemplates.add(node.key);
      }
    }

    // Selectively invalidate only affected templates
    const invalidated: DocumentUri[] = [];
    const retained: DocumentUri[] = [];
    for (const uri of this.#compilationCache.keys()) {
      // Match by checking if the template's compilation path is in the affected set.
      // The dep graph keys template-compilation nodes by templateFilePath, while
      // the compilation cache keys by DocumentUri. We need to check both forms.
      const paths = deriveTemplatePaths(uri, { isJs: this.options.isJs, overlayBaseName: this.options.overlayBaseName });
      if (affectedTemplates.has(paths.template.path) || affectedTemplates.has(uri)) {
        this.#compilationCache.delete(uri);
        this.provenance.removeDocument(uri);
        invalidated.push(uri);
      } else {
        retained.push(uri);
      }
    }

    return { changed: true, mode: "dependency", invalidated, retained };
  }

  getCacheStats(uri?: DocumentUri): CacheStats {
    if (uri) {
      const canonical = canonicalDocumentUri(uri);
      const snap = this.sources.get(canonical.uri);
      const cached = this.#compilationCache.get(canonical.uri);
      const pStats = this.provenance.templateStats(canonical.uri);

      const doc: CacheStatsDocument = {
        version: snap?.version ?? 0,
        ...(cached ? {
          compilation: {
            programCacheHit: cached.programCacheHit,
            stageReuse: cached.stageReuse,
          },
        } : {}),
        provenance: {
          totalEdges: pStats.totalEdges,
          ...(pStats.overlayEdges > 0 ? { overlayEdges: pStats.overlayEdges } : {}),
        },
      };

      return {
        documents: [doc],
        totals: {
          sources: snap ? 1 : 0,
          compilation: cached ? 1 : 0,
          core: cached ? 1 : 0,
          provenanceEdges: pStats.totalEdges,
        },
      };
    }

    // Aggregate totals across all documents
    let totalSources = 0;
    let totalCompilations = 0;
    let totalProvenanceEdges = 0;

    for (const snap of this.sources.all()) {
      totalSources++;
      if (this.#compilationCache.has(snap.uri)) totalCompilations++;
      totalProvenanceEdges += this.provenance.templateStats(snap.uri).totalEdges;
    }

    return {
      documents: [],
      totals: {
        sources: totalSources,
        compilation: totalCompilations,
        core: totalCompilations,
        provenanceEdges: totalProvenanceEdges,
      },
    };
  }
}
