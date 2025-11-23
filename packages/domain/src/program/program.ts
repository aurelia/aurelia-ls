import {
  compileTemplate,
  compileTemplateToSSR,
  type CompileOverlayResult,
  type CompileSsrResult,
  type TemplateCompilation,
  type TemplateDiagnostics,
} from "../compiler/facade.js";
import { DEFAULT as SEM_DEFAULT, type Semantics } from "../compiler/language/registry.js";
import type { ResourceGraph, ResourceScopeId } from "../compiler/language/resource-graph.js";
import type { AttributeParser } from "../compiler/language/syntax.js";
import type { IExpressionParser } from "../parsers/expression-api.js";
import type { CacheOptions, FingerprintHints, FingerprintToken } from "../compiler/pipeline/engine.js";
import { stableHash } from "../compiler/pipeline/hash.js";
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

type ProgramOptions = Omit<TemplateProgramOptions, "sourceStore" | "provenance">;
type ResolvedProgramOptions = ProgramOptions & { readonly fingerprints: FingerprintHints };

interface CachedCompilation {
  readonly compilation: TemplateCompilation;
  readonly version: number;
  readonly contentHash: string;
  readonly optionsFingerprint: string;
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
  readonly options: ResolvedProgramOptions;
  readonly optionsFingerprint: string;
  readonly sources: SourceStore;
  readonly provenance: ProvenanceIndex;

  private readonly fingerprintHints: FingerprintHints;
  private readonly compilationCache = new Map<DocumentUri, CachedCompilation>();

  constructor(options: TemplateProgramOptions) {
    const { sourceStore, provenance, ...rest } = options;
    this.fingerprintHints = normalizeFingerprintHints(rest);
    this.options = { ...rest, fingerprints: this.fingerprintHints };
    this.optionsFingerprint = computeProgramOptionsFingerprint(rest, this.fingerprintHints);
    this.sources = sourceStore ?? new InMemorySourceStore();
    this.provenance = provenance ?? new InMemoryProvenanceIndex();
  }

  upsertTemplate(uri: DocumentUri, text: string, version?: number): void {
    const canonical = this.canonicalUri(uri);
    this.sources.set(canonical.uri, text, version);
    this.compilationCache.delete(canonical.uri);
  }

  closeTemplate(uri: DocumentUri): void {
    const canonical = this.canonicalUri(uri);
    this.sources.delete(canonical.uri);
    this.compilationCache.delete(canonical.uri);
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
    const contentHash = hashSnapshotContent(snap);
    const cached = this.compilationCache.get(canonical.uri);
    if (cached && cached.optionsFingerprint === this.optionsFingerprint && cached.contentHash === contentHash) {
      if (cached.version !== snap.version) {
        this.compilationCache.set(canonical.uri, { ...cached, version: snap.version });
      }
      return cached.compilation;
    }

    // NOTE: program-level cache is guarded by content hash + options fingerprint.
    const templatePaths = deriveTemplatePaths(canonical.uri, withOverlayBase(this.options.isJs, this.options.overlayBaseName));
    const compileOpts = this.buildCompileOptions(snap, templatePaths.template.path);
    const compilation = compileTemplate(compileOpts);

    // Feed overlay mapping into provenance for downstream features.
    const overlayUri = normalizeDocumentUri(compilation.overlay.overlayPath);
    this.provenance.addOverlayMapping(canonical.uri, overlayUri, compilation.mapping);

    this.compilationCache.set(canonical.uri, {
      compilation,
      version: snap.version,
      contentHash,
      optionsFingerprint: this.optionsFingerprint,
    });
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
    opts.fingerprints = this.fingerprintHints;

    return opts;
  }
}

function withOverlayBase(isJs: boolean, overlayBaseName: string | undefined): { isJs: boolean; overlayBaseName?: string } {
  return overlayBaseName === undefined ? { isJs } : { isJs, overlayBaseName };
}

function hashSnapshotContent(snap: DocumentSnapshot): string {
  return stableHash(snap.text);
}

function computeProgramOptionsFingerprint(options: ProgramOptions, hints: FingerprintHints): string {
  const sem = options.semantics ?? SEM_DEFAULT;
  const overlayHint = hints.overlay ?? { isJs: options.isJs, syntheticPrefix: options.vm.getSyntheticPrefix?.() ?? "__AU_TTC_" };
  const fingerprint: Record<string, FingerprintHints[keyof FingerprintHints]> = {
    isJs: options.isJs,
    overlayBaseName: options.overlayBaseName ?? null,
    semantics: hints.semantics ?? stableHash(sem),
    resourceGraph: fingerprintResourceGraph(options, sem),
    attrParser: hints.attrParser ?? (options.attrParser ? "custom" : "default"),
    exprParser: hints.exprParser ?? (options.exprParser ? "custom" : "default"),
    vm: hints.vm ?? fingerprintVm(options.vm),
    overlay: overlayHint,
    ssr: hints.ssr ?? null,
    analyze: hints.analyze ?? null,
    extra: extractExtraFingerprintHints(hints),
  };
  return stableHash(fingerprint);
}

function normalizeFingerprintHints(options: ProgramOptions): FingerprintHints {
  const base: FingerprintHints = { ...(options.fingerprints ?? {}) };
  const sem = options.semantics ?? SEM_DEFAULT;
  if (base.semantics === undefined) base.semantics = stableHash(sem);
  if (base.attrParser === undefined) base.attrParser = options.attrParser ? "custom" : "default";
  if (base.exprParser === undefined) base.exprParser = options.exprParser ? "custom" : "default";
  if (base.vm === undefined) base.vm = fingerprintVm(options.vm);
  if (base.overlay === undefined) {
    const syntheticPrefix = options.vm.getSyntheticPrefix?.() ?? "__AU_TTC_";
    base.overlay = { isJs: options.isJs, syntheticPrefix };
  }
  return base;
}

function fingerprintResourceGraph(
  options: ProgramOptions,
  sem: Semantics,
): { readonly graph: string; readonly scope: ResourceScopeId | null } | null {
  const graph = options.resourceGraph ?? sem.resourceGraph ?? null;
  if (!graph) return null;
  const scope = options.resourceScope ?? sem.defaultScope ?? graph.root ?? null;
  return { graph: stableHash(graph), scope };
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
    if (key === "attrParser" || key === "exprParser" || key === "semantics" || key === "vm" || key === "overlay" || key === "ssr" || key === "analyze") {
      continue;
    }
    if (value === undefined) continue;
    extras[key] = value;
  }
  return Object.keys(extras).length ? extras : null;
}
