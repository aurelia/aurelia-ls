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
}

// ============================================================================
// Cached Compilation
// ============================================================================

interface CachedCompilation {
  readonly compilation: TemplateCompilation;
  readonly contentHash: string;
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
  readonly #compilationCache = new Map<DocumentUri, CachedCompilation>();

  constructor(options: TemplateProgramOptions) {
    this.options = options;
    this.query = options.query;
    this.#modelFingerprint = options.query.model.fingerprint;
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
    this.#compilationCache.delete(canonicalDocumentUri(uri).uri);
  }

  invalidateAll(): void {
    this.#compilationCache.clear();
  }

  closeTemplate(uri: DocumentUri): void {
    const canonical = canonicalDocumentUri(uri);
    this.#compilationCache.delete(canonical.uri);
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
      return cached.compilation;
    }

    // Compile
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
    }));

    // Feed overlay mapping into provenance
    const overlayUri = normalizeDocumentUri(compilation.overlay.overlayPath);
    this.provenance.addOverlayMapping(canonical.uri, overlayUri, compilation.mapping);

    this.#compilationCache.set(canonical.uri, { compilation, contentHash });
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
   * Update the semantic authority. Invalidates all cached compilations
   * if the model fingerprint changed (dep graph determines what changed).
   */
  updateOptions(options: TemplateProgramOptions): TemplateProgramUpdateResult {
    const nextFingerprint = options.query.model.fingerprint;
    const changed = nextFingerprint !== this.#modelFingerprint;

    this.options = options;
    this.query = options.query;
    this.#modelFingerprint = nextFingerprint;
    this.optionsFingerprint = nextFingerprint;

    if (changed) {
      const invalidated = Array.from(this.#compilationCache.keys());
      this.invalidateAll();
      return { changed: true, invalidated, retained: [] };
    }

    return { changed: false, invalidated: [], retained: Array.from(this.#compilationCache.keys()) };
  }
}
