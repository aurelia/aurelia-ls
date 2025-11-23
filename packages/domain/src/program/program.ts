import {
  compileTemplate,
  compileTemplateToSSR,
  type CompileOverlayResult,
  type CompileSsrResult,
  type TemplateCompilation,
  type TemplateDiagnostics,
} from "../compiler/facade.js";
import type { Semantics } from "../compiler/language/registry.js";
import type { ResourceGraph, ResourceScopeId } from "../compiler/language/resource-graph.js";
import type { AttributeParser } from "../compiler/language/syntax.js";
import type { IExpressionParser } from "../parsers/expression-api.js";
import type { CacheOptions, FingerprintHints } from "../compiler/pipeline/engine.js";
import type { VmReflection } from "../compiler/phases/50-plan/overlay/types.js";
import type { TemplateMappingArtifact, TemplateQueryFacade } from "../contracts.js";
import type { DocumentSnapshot, DocumentUri } from "./primitives.js";
import { InMemorySourceStore, type SourceStore } from "./sources.js";
import { InMemoryProvenanceIndex, type ProvenanceIndex } from "./provenance.js";
import { canonicalDocumentUri, deriveTemplatePaths, normalizeDocumentUri, type CanonicalDocumentUri } from "./paths.js";
import type { NormalizedPath } from "../compiler/model/identity.js";

export interface TemplateProgramOptions {
  readonly vm: VmReflection;
  readonly isJs: boolean;
  readonly semantics?: Semantics;
  readonly resourceGraph?: ResourceGraph;
  readonly resourceScope?: ResourceScopeId | null;
  readonly attrParser?: AttributeParser;
  readonly exprParser?: IExpressionParser;
  readonly cache?: CacheOptions;
  readonly fingerprints?: FingerprintHints;
  readonly overlayBaseName?: string;
  readonly sourceStore?: SourceStore;
  readonly provenance?: ProvenanceIndex;
}

/**
 * High-level facade over the Aurelia template pipeline.
 * Owns documents, compilation cache, provenance ingestion, and product helpers.
 *
 * Construction options are assumed stable for the lifetime of the program; cache
 * keys are based on (uri, version). If options change, create a new program.
 */
export interface TemplateProgram {
  readonly options: Omit<TemplateProgramOptions, "sourceStore" | "provenance">;
  readonly sources: SourceStore;
  readonly provenance: ProvenanceIndex;

  upsertTemplate(uri: DocumentUri, text: string, version?: number): void;
  closeTemplate(uri: DocumentUri): void;

  getDiagnostics(uri: DocumentUri): TemplateDiagnostics;
  getOverlay(uri: DocumentUri): CompileOverlayResult;
  getSsr(uri: DocumentUri): CompileSsrResult;
  getQuery(uri: DocumentUri): TemplateQueryFacade;
  getMapping(uri: DocumentUri): TemplateMappingArtifact | null;
  getCompilation(uri: DocumentUri): TemplateCompilation;
}

export class DefaultTemplateProgram implements TemplateProgram {
  readonly options: Omit<TemplateProgramOptions, "sourceStore" | "provenance">;
  readonly sources: SourceStore;
  readonly provenance: ProvenanceIndex;

  private readonly compilationCache = new Map<DocumentUri, TemplateCompilation>();
  private readonly versionsAtCompile = new Map<DocumentUri, number>();

  constructor(options: TemplateProgramOptions) {
    const { sourceStore, provenance, ...rest } = options;
    this.options = rest;
    this.sources = sourceStore ?? new InMemorySourceStore();
    this.provenance = provenance ?? new InMemoryProvenanceIndex();
  }

  upsertTemplate(uri: DocumentUri, text: string, version?: number): void {
    const canonical = this.canonicalUri(uri);
    this.sources.set(canonical.uri, text, version);
    this.compilationCache.delete(canonical.uri);
    this.versionsAtCompile.delete(canonical.uri);
  }

  closeTemplate(uri: DocumentUri): void {
    const canonical = this.canonicalUri(uri);
    this.sources.delete(canonical.uri);
    this.compilationCache.delete(canonical.uri);
    this.versionsAtCompile.delete(canonical.uri);
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
    const cached = this.compilationCache.get(canonical.uri);
    if (cached && this.versionsAtCompile.get(canonical.uri) === snap.version) {
      return cached;
    }

    // NOTE: cache key is (uri, version) assuming options are stable per program.
    // If you swap semantics/resource graph/parsers, create a new program instance.
    const templatePaths = deriveTemplatePaths(canonical.uri, withOverlayBase(this.options.isJs, this.options.overlayBaseName));
    const compileOpts = this.buildCompileOptions(snap, templatePaths.template.path);
    const compilation = compileTemplate(compileOpts);

    // Feed overlay mapping into provenance for downstream features.
    const overlayUri = normalizeDocumentUri(compilation.overlay.overlayPath);
    this.provenance.addOverlayMapping(canonical.uri, overlayUri, compilation.mapping);

    this.compilationCache.set(canonical.uri, compilation);
    this.versionsAtCompile.set(canonical.uri, snap.version);
    return compilation;
  }

  getDiagnostics(uri: DocumentUri): TemplateDiagnostics {
    return this.getCompilation(uri).diagnostics;
  }

  getOverlay(uri: DocumentUri): CompileOverlayResult {
    return this.getCompilation(uri).overlay;
  }

  getSsr(uri: DocumentUri): CompileSsrResult {
    const canonical = this.canonicalUri(uri);
    const snap = this.snapshot(canonical.uri);
    const templatePaths = deriveTemplatePaths(canonical.uri, withOverlayBase(this.options.isJs, this.options.overlayBaseName));
    // SSR currently runs its own product builder; if/when overlay + SSR share
    // a session, this can be optimized to reuse pipeline artifacts.
    const compileOpts = this.buildCompileOptions(snap, templatePaths.template.path);
    return compileTemplateToSSR(compileOpts);
  }

  getQuery(uri: DocumentUri): TemplateQueryFacade {
    return this.getCompilation(uri).query;
  }

  getMapping(uri: DocumentUri): TemplateMappingArtifact | null {
    return this.getCompilation(uri).mapping ?? null;
  }

  private canonicalUri(input: DocumentUri): CanonicalDocumentUri {
    return canonicalDocumentUri(input);
  }

  private buildCompileOptions(snap: DocumentSnapshot, templatePath: NormalizedPath) {
    const opts: {
      html: string;
      templateFilePath: string;
      isJs: boolean;
      vm: VmReflection;
      semantics?: Semantics;
      resourceGraph?: ResourceGraph;
      resourceScope?: ResourceScopeId | null;
      attrParser?: AttributeParser;
      exprParser?: IExpressionParser;
      overlayBaseName?: string;
      cache?: CacheOptions;
      fingerprints?: FingerprintHints;
    } = {
      html: snap.text,
      templateFilePath: templatePath,
      isJs: this.options.isJs,
      vm: this.options.vm,
    };

    if (this.options.semantics !== undefined) opts.semantics = this.options.semantics;
    if (this.options.resourceGraph !== undefined) opts.resourceGraph = this.options.resourceGraph;
    if (this.options.resourceScope !== undefined) opts.resourceScope = this.options.resourceScope ?? null;
    if (this.options.attrParser !== undefined) opts.attrParser = this.options.attrParser;
    if (this.options.exprParser !== undefined) opts.exprParser = this.options.exprParser;
    if (this.options.overlayBaseName !== undefined) opts.overlayBaseName = this.options.overlayBaseName;
    if (this.options.cache !== undefined) opts.cache = this.options.cache;
    if (this.options.fingerprints !== undefined) opts.fingerprints = this.options.fingerprints;

    return opts;
  }
}

function withOverlayBase(isJs: boolean, overlayBaseName: string | undefined): { isJs: boolean; overlayBaseName?: string } {
  return overlayBaseName === undefined ? { isJs } : { isJs, overlayBaseName };
}
