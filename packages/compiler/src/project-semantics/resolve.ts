import type ts from "typescript";
import type {
  CatalogConfidence,
  CatalogGap,
  ApiSurfaceSnapshot,
  CompilerDiagnostic,
  DiagnosticsCatalog,
  DiagnosticEmitter,
  RawDiagnostic,
  NormalizedPath,
  ResourceCatalog,
  ResourceDef,
  ResourceGraph,
  ResourceScopeId,
  SemanticSnapshot,
  Semantics,
  SemanticsWithCaches,
  TemplateSyntaxRegistry,
  CompileTrace,
} from './compiler.js';
import {
  asDocumentUri,
  normalizePathForId,
  NOOP_TRACE,
  debug,
} from './compiler.js';
import type { FileFacts, FileContext } from "./extract/file-facts.js";
import type { AnalysisGap } from "./evaluate/types.js";
import type { DefineMap } from "./defines.js";
import type { RegistrationAnalysis, RegistrationSite, RegistrationEvidence } from "./register/types.js";
import type { ConventionConfig } from "./conventions/types.js";
import type { Logger } from "./types.js";
import type { FileSystemContext } from "./project/context.js";
import { extractAllFileFacts, extractFileContext } from "./extract/file-facts-extractor.js";
import { evaluateFileFacts } from "./evaluate/index.js";
import { buildExportBindingMap } from "./exports/export-resolver.js";
import { matchFileFacts } from "./recognize/pipeline.js";
import { createRegistrationAnalyzer } from "./register/analyzer.js";
import { buildResourceGraph } from "./scope/builder.js";
import { orphansToDiagnostics, unresolvedToDiagnostics, unresolvedRefsToDiagnostics, type UnresolvedResourceInfo } from "./diagnostics/index.js";
import { buildSemanticsArtifacts } from "./assemble/build.js";
import { stripSourcedNodes } from "./assemble/strip.js";
import { discoverTemplates } from "./templates/index.js";
import type { InlineTemplateInfo, TemplateInfo } from "./templates/types.js";
import { buildApiSurfaceSnapshot, buildSemanticSnapshot } from "./snapshot/index.js";

export type { InlineTemplateInfo, TemplateInfo } from "./templates/types.js";

/**
 * Configuration for resolution.
 */
export interface ResolutionConfig {
  /** Convention configuration for inference */
  conventions?: ConventionConfig;
  /** Base semantics to build upon */
  baseSemantics?: Semantics;
  /** Default scope for resources */
  defaultScope?: ResourceScopeId | null;
  /** Optional trace for instrumentation */
  trace?: CompileTrace;
  /** Optional package root (for resolution context metadata) */
  packagePath?: string;
  /** Optional package root mapping for stable snapshot ids */
  packageRoots?: ReadonlyMap<string, string> | Readonly<Record<string, string>>;
  /** Compile-time constant definitions (e.g. window.__AU_DEF__ = true) */
  defines?: DefineMap;
  /**
   * Memory profiling knob.
   * When enabled, drops ts.Node references from Sourced<T> after analysis.
   * Keeps location/value provenance but reduces heap retention from AST graphs.
   */
  stripSourcedNodes?: boolean;
  /**
   * Partial evaluation test hooks.
   * Used by integration tests to validate analysis-failed gaps.
   */
  partialEvaluation?: {
    failOnFiles?: ReadonlySet<NormalizedPath> | readonly NormalizedPath[];
  };
  /**
   * File system context for sibling detection.
   *
   * When provided, enables the sibling-file convention:
   * `foo.ts` + `foo.html` as adjacent files -> custom element "foo"
   */
  fileSystem?: FileSystemContext;
  /**
   * Template extensions to look for as siblings.
   * Only used when fileSystem is provided.
   * @default ['.html']
   */
  templateExtensions?: readonly string[];
  /**
   * Style extensions to look for as siblings.
   * Only used when fileSystem is provided.
   * @default ['.css', '.scss']
   */
  styleExtensions?: readonly string[];
  /** Diagnostics emitter (required). */
  diagnostics: ResolutionDiagnosticEmitter;
}

/**
 * Result of running resolution.
 */
export interface ResolutionResult {
  /** Full semantics with provenance */
  semantics: SemanticsWithCaches;
  /** Minimal catalog for lowering */
  catalog: ResourceCatalog;
  /** Syntax registry for parsing and emitting */
  syntax: TemplateSyntaxRegistry;
  /** The constructed resource graph */
  resourceGraph: ResourceGraph;
  /** Stable semantic snapshot (for diffing/manifests) */
  semanticSnapshot: SemanticSnapshot;
  /** API surface summary snapshot */
  apiSurfaceSnapshot: ApiSurfaceSnapshot;
  /** All resource definitions identified */
  resources: readonly ResourceDef[];
  /** Registration analysis results */
  registration: RegistrationAnalysis;
  /** External template files (convention-based: foo.ts -> foo.html) */
  templates: readonly TemplateInfo[];
  /** Inline templates (string literals in decorators/static $au) */
  inlineTemplates: readonly InlineTemplateInfo[];
  /** Diagnostics from resolution */
  diagnostics: readonly ResolutionDiagnostic[];
  /** Extracted facts with partial evaluation applied */
  facts: Map<NormalizedPath, FileFacts>;
}

/**
 * Diagnostic from resolution.
 */
export type ResolutionDiagnostic = RawDiagnostic;

export type ResolutionDiagnosticEmitter = DiagnosticEmitter<DiagnosticsCatalog>;

/**
 * Main entry point: run the full project semantics discovery pipeline.
 *
 * Pipeline (stage map):
 * extract: AST -> FileFacts (with import resolution)
 * exports: FileFacts -> ExportBindingMap
 * evaluate: FileFacts -> resolved FileFacts + gaps
 * recognize: FileFacts -> ResourceDef[] + gaps
 * assemble: ResourceDef[] -> Semantics + Catalog + Syntax
 * register: ResourceDef[] + FileFacts -> RegistrationAnalysis
 * scope: RegistrationAnalysis -> ResourceGraph
 * snapshot: Semantics + ResourceGraph -> snapshots
 * templates: RegistrationAnalysis + ResourceGraph -> templates
 */
export function discoverProjectSemantics(
  program: ts.Program,
  config?: ResolutionConfig,
  logger?: Logger,
): ResolutionResult {
  const diagEmitter = config?.diagnostics;
  if (!diagEmitter) {
    throw new Error("discovery.resolve requires diagnostics emitter; missing emitter is a wiring error.");
  }
  const trace = config?.trace ?? NOOP_TRACE;
  const log = logger ?? nullLogger;

  return trace.span("discovery.resolve", () => {
    const sourceFileCount = program.getSourceFiles().length;
    trace.setAttributes({
      "discovery.sourceFileCount": sourceFileCount,
    });

    debug.project("start", { sourceFileCount, hasFileSystem: !!config?.fileSystem });

    // Stage: extract
    log.info("[discovery] extracting facts...");
    trace.event("discovery.extraction.start");
    const rawFacts = extractAllFileFacts(program, {
      fileSystem: config?.fileSystem,
      templateExtensions: config?.templateExtensions,
      styleExtensions: config?.styleExtensions,
    });
    trace.event("discovery.extraction.done", { factCount: rawFacts.size });
    debug.project("extraction.complete", { factCount: rawFacts.size });

    // Stage: exports
    log.info("[discovery] building export bindings...");
    trace.event("discovery.binding.start");
    const exportBindings = buildExportBindingMap(rawFacts);
    trace.event("discovery.binding.done", {
      fileCount: exportBindings.size,
    });
    debug.project("binding.complete", {
      fileCount: exportBindings.size,
    });

    // Stage: evaluate
    log.info("[discovery] partially evaluating values...");
    trace.event("discovery.partialEvaluation.start");
    const evaluation = evaluateFileFacts(rawFacts, exportBindings, {
      packagePath: config?.packagePath,
      defines: config?.defines,
      failOnFiles: config?.partialEvaluation?.failOnFiles,
    });
    trace.event("discovery.partialEvaluation.done", {
      factCount: evaluation.facts.size,
      gapCount: evaluation.gaps.length,
    });
    debug.project("partialEvaluation.complete", {
      factCount: evaluation.facts.size,
      gapCount: evaluation.gaps.length,
    });

    const facts = evaluation.facts;

    // Stage: recognize
    log.info("[discovery] matching patterns...");
    trace.event("discovery.patternMatching.start");
    const allResources: ResourceDef[] = [];
    const matcherGaps: AnalysisGap[] = [];
    const contexts = new Map<NormalizedPath, FileContext>();

    for (const [filePath, fileFacts] of facts) {
      // Get file context for convention matching
      const context = extractFileContext(filePath, {
        fileSystem: config?.fileSystem,
        templateExtensions: config?.templateExtensions,
        styleExtensions: config?.styleExtensions,
      }, program);

      // Store context for later use by registration analyzer
      contexts.set(filePath, context);

      // Run pattern matchers on classes AND define calls
      const matchResult = matchFileFacts(fileFacts, context);
      allResources.push(...matchResult.resources);
      matcherGaps.push(...matchResult.gaps);
    }
    trace.event("discovery.patternMatching.done", { resourceCount: allResources.length });
    debug.project("patternMatching.complete", {
      resourceCount: allResources.length,
      gapCount: matcherGaps.length,
    });

    const analysisGaps = [...evaluation.gaps, ...matcherGaps];
    const catalogGaps = analysisGaps.map(analysisGapToCatalogGap);
    const catalogConfidence = catalogConfidenceFromGaps(analysisGaps);

    // Stage: assemble
    log.info("[discovery] building semantics artifacts...");
    trace.event("discovery.semantics.start");
    const { semantics, catalog, syntax } = buildSemanticsArtifacts(allResources, config?.baseSemantics, {
      confidence: catalogConfidence,
      ...(catalogGaps.length ? { gaps: catalogGaps } : {}),
    });
    trace.event("discovery.semantics.done", {
      resourceCount: allResources.length,
    });

    // Stage: register
    log.info("[discovery] analyzing registration...");
    trace.event("discovery.registration.start");
    const analyzer = createRegistrationAnalyzer();
    const registration = analyzer.analyze(allResources, facts, exportBindings, contexts);
    trace.event("discovery.registration.done", {
      siteCount: registration.sites.length,
      orphanCount: registration.orphans.length,
      unresolvedCount: registration.unresolved.length,
    });
    debug.project("registration.complete", {
      siteCount: registration.sites.length,
      orphanCount: registration.orphans.length,
      unresolvedCount: registration.unresolved.length,
    });

    // Stage: scope
    log.info("[discovery] building resource graph...");
    trace.event("discovery.scope.start");
    const resourceGraph = buildResourceGraph(registration, config?.baseSemantics, config?.defaultScope);
    trace.event("discovery.scope.done");

    const globalCount = registration.sites.filter((s) => s.scope.kind === "global").length;
    const localCount = registration.sites.filter((s) => s.scope.kind === "local").length;

    debug.project("scope.complete", {
      globalCount,
      localCount,
      orphanCount: registration.orphans.length,
    });

    // Stage: snapshot
    log.info("[discovery] building snapshots...");
    trace.event("discovery.snapshots.start");
    const snapshotIdOptions = {
      rootDir: config?.packagePath ?? program.getCurrentDirectory(),
      packageRoots: config?.packageRoots,
    };
    const semanticSnapshot = buildSemanticSnapshot(semantics, {
      ...snapshotIdOptions,
      graph: resourceGraph,
      catalog,
    });
    const apiSurfaceSnapshot = buildApiSurfaceSnapshot(semantics, snapshotIdOptions);
    trace.event("discovery.snapshots.done", {
      semanticSymbolCount: semanticSnapshot.symbols.length,
      apiSymbolCount: apiSurfaceSnapshot.symbols.length,
    });

    // Stage: templates
    log.info("[discovery] discovering templates...");
    trace.event("discovery.templates.start");
    const { templates, inlineTemplates } = discoverTemplates(registration, program, resourceGraph);
    trace.event("discovery.templates.done", {
      externalCount: templates.length,
      inlineCount: inlineTemplates.length,
    });
    debug.project("templates.complete", {
      externalCount: templates.length,
      inlineCount: inlineTemplates.length,
    });

    log.info(
      `[discovery] complete: ${allResources.length} resources (${globalCount} global, ${localCount} local, ${registration.orphans.length} orphans), ${templates.length} external + ${inlineTemplates.length} inline templates`,
    );

    // Extract unresolved resource refs from registration sites
    const unresolvedRefs: UnresolvedResourceInfo[] = registration.sites
      .filter((s): s is RegistrationSite & { resourceRef: { kind: "unresolved"; name: string; reason: string } } =>
        s.resourceRef.kind === "unresolved"
      )
      .map((s) => ({
        name: s.resourceRef.name,
        reason: s.resourceRef.reason,
        file: getFileFromEvidence(s.evidence),
        span: s.span,
      }));

    // Merge all diagnostics: matcher gaps + orphans + unresolved patterns + unresolved refs
    const allDiagnostics: ResolutionDiagnostic[] = [
      ...analysisGaps.map((gap) => gapToDiagnostic(gap, diagEmitter)),
      ...orphansToDiagnostics(registration.orphans, diagEmitter),
      ...unresolvedToDiagnostics(registration.unresolved, diagEmitter),
      ...unresolvedRefsToDiagnostics(unresolvedRefs, diagEmitter),
    ];

    trace.setAttributes({
      "discovery.resourceCount": allResources.length,
      "discovery.globalCount": globalCount,
      "discovery.localCount": localCount,
      "discovery.orphanCount": registration.orphans.length,
      "discovery.unresolvedCount": registration.unresolved.length,
      "discovery.templateCount": templates.length,
      "discovery.inlineTemplateCount": inlineTemplates.length,
      "discovery.analysisGapCount": analysisGaps.length,
      "discovery.partialEvaluationGapCount": evaluation.gaps.length,
      "discovery.diagnosticCount": allDiagnostics.length,
      "discovery.semanticSnapshotSymbolCount": semanticSnapshot.symbols.length,
      "discovery.apiSnapshotSymbolCount": apiSurfaceSnapshot.symbols.length,
    });

    if (config?.stripSourcedNodes) {
      const stripped = stripSourcedNodes(allResources);
      trace.event("discovery.stripSourcedNodes", { removed: stripped.removed });
      debug.project("stripSourcedNodes.complete", { removed: stripped.removed });
    }

    return {
      semantics,
      catalog,
      syntax,
      resourceGraph,
      semanticSnapshot,
      apiSurfaceSnapshot,
      resources: allResources,
      registration,
      templates,
      inlineTemplates,
      diagnostics: allDiagnostics,
      facts,
    };
  });
}

/**
 * Convert an AnalysisGap to a ResolutionDiagnostic.
 *
 * The uri field is only included when gap has location information.
 * The file path is normalized since GapLocation.file is a plain string.
 */
function gapToDiagnostic(gap: AnalysisGap, emitter: ResolutionDiagnosticEmitter): ResolutionDiagnostic {
  const code = mapGapKindToCode(gap.why.kind);
  const uri = gap.where?.file
    ? asDocumentUri(normalizePathForId(gap.where.file))
    : undefined;
  const diagnostic = toRawDiagnostic(emitter.emit(code, {
    message: `${gap.what}: ${gap.suggestion}`,
    severity: code === "aurelia/gap/cache-corrupt" ? "warning" : "info",
    data: { gapKind: gap.why.kind },
  }));
  return uri ? { ...diagnostic, uri } : diagnostic;
}

function toRawDiagnostic(diag: CompilerDiagnostic): RawDiagnostic {
  const { span, ...rest } = diag;
  return span ? { ...rest, span } : { ...rest };
}

function analysisGapToCatalogGap(gap: AnalysisGap): CatalogGap {
  const message = `${gap.what}: ${gap.suggestion}`;
  const resource = gap.where?.file;
  return resource
    ? { kind: gap.why.kind, message, resource }
    : { kind: gap.why.kind, message };
}

function catalogConfidenceFromGaps(gaps: AnalysisGap[]): CatalogConfidence {
  if (gaps.length === 0) return "complete";
  for (const gap of gaps) {
    if (isConservativeGap(gap.why.kind)) {
      return "conservative";
    }
  }
  return "partial";
}

function isConservativeGap(kind: AnalysisGap["why"]["kind"]): boolean {
  switch (kind) {
    // Package structure failures: analysis could not proceed reliably.
    case "package-not-found":
    case "invalid-package-json":
    case "missing-package-field":
    case "entry-point-not-found":
    case "no-entry-points":
    case "complex-exports":
    case "workspace-no-source-dir":
    case "workspace-entry-not-found":
    // Import/resolution failures.
    case "unresolved-import":
    case "circular-import":
    case "external-package":
    // Format/parse failures.
    case "unsupported-format":
    case "no-source":
    case "minified-code":
    case "parse-error":
    case "analysis-failed":
      return true;
    default:
      return false;
  }
}

/**
 * Extract the file path from registration evidence.
 *
 * All evidence types contain a file or component path that indicates
 * where the registration was declared.
 */
function getFileFromEvidence(evidence: RegistrationEvidence): NormalizedPath {
  switch (evidence.kind) {
    case "aurelia-register":
    case "container-register":
    case "plugin":
      return evidence.file;
    case "static-dependencies":
    case "decorator-dependencies":
    case "static-au-dependencies":
    case "template-import":
      return evidence.component;
  }
}

const nullLogger: Logger = {
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};


function mapGapKindToCode(kind: string): "aurelia/gap/partial-eval" | "aurelia/gap/unknown-registration" | "aurelia/gap/cache-corrupt" {
  if (kind === "cache-corrupt") return "aurelia/gap/cache-corrupt";
  if (UNKNOWN_REGISTRATION_GAP_KINDS.has(kind)) return "aurelia/gap/unknown-registration";
  if (PARTIAL_EVAL_GAP_KINDS.has(kind)) return "aurelia/gap/partial-eval";
  return "aurelia/gap/partial-eval";
}

const UNKNOWN_REGISTRATION_GAP_KINDS = new Set([
  "dynamic-value",
  "function-return",
  "computed-property",
  "spread-unknown",
  "unsupported-pattern",
  "conditional-registration",
  "loop-variable",
  "invalid-resource-name",
]);

const PARTIAL_EVAL_GAP_KINDS = new Set([
  "package-not-found",
  "invalid-package-json",
  "missing-package-field",
  "entry-point-not-found",
  "no-entry-points",
  "complex-exports",
  "workspace-no-source-dir",
  "workspace-entry-not-found",
  "unresolved-import",
  "circular-import",
  "external-package",
  "legacy-decorators",
  "no-source",
  "minified-code",
  "unsupported-format",
  "analysis-failed",
  "parse-error",
]);


/**
 * Compute the scope ID for a resource based on its registration site.
 */
function computeScopeId(site: RegistrationSite, resourceGraph: ResourceGraph): ResourceScopeId {
  if (site.scope.kind === "local") {
    // Local scope: "local:{componentPath}"
    return `local:${site.scope.owner}` as ResourceScopeId;
  }

  // Global: use root scope
  return resourceGraph.root;
}
