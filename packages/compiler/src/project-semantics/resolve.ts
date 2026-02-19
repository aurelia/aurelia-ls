import ts from "typescript";
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
  ProjectSemantics,
  MaterializedSemantics,
  TemplateSyntaxRegistry,
  CompileTrace,
} from './compiler.js';
import {
  asDocumentUri,
  normalizePathForId,
  isConservativeGap,
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
import { collectTemplateFactCollection } from "./extract/template-facts.js";
import { evaluateFileFacts } from "./evaluate/index.js";
import { buildExportBindingMap } from "./exports/export-resolver.js";
import { matchFileFacts } from "./recognize/pipeline.js";
import { createRegistrationAnalyzer } from "./register/analyzer.js";
import { buildResourceGraph } from "./scope/builder.js";
import {
  definitionConvergenceToDiagnostics,
  orphansToDiagnostics,
  unresolvedToDiagnostics,
  unresolvedRefsToDiagnostics,
  type UnresolvedResourceInfo,
} from "./diagnostics/index.js";
import { buildSemanticsArtifacts } from "./assemble/build.js";
import type {
  DefinitionConvergenceRecord,
} from "./assemble/build.js";
import { createDiscoveryConvergenceOverrides } from "./definition/candidate-overrides.js";
import { collectTemplateMetaDefinitionCandidates } from "./definition/template-meta-candidates.js";
import { stripSourcedNodes } from "./assemble/strip.js";
import { discoverTemplates } from "./templates/index.js";
import type { InlineTemplateInfo, TemplateInfo } from "./templates/types.js";
import { buildApiSurfaceSnapshot, buildSemanticSnapshot } from "./snapshot/index.js";

export type { InlineTemplateInfo, TemplateInfo } from "./templates/types.js";

/**
 * Configuration for project-semantics discovery.
 */
export interface ProjectSemanticsDiscoveryConfig {
  /** Convention configuration for inference */
  conventions?: ConventionConfig;
  /** Base semantics to build upon */
  baseSemantics?: ProjectSemantics;
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
  diagnostics: ProjectSemanticsDiscoveryDiagnosticEmitter;
}

/**
 * Result of running project-semantics discovery.
 */
export interface ProjectSemanticsDiscoveryResult {
  /** Full semantics with provenance */
  semantics: MaterializedSemantics;
  /** Minimal catalog for lowering */
  catalog: ResourceCatalog;
  /** Syntax registry for parsing and emitting */
  syntax: TemplateSyntaxRegistry;
  /** Package root used for project-local precedence evaluation. */
  packagePath?: NormalizedPath;
  /** The constructed resource graph */
  resourceGraph: ResourceGraph;
  /** Stable semantic snapshot (for diffing/manifests) */
  semanticSnapshot: SemanticSnapshot;
  /** API surface summary snapshot */
  apiSurfaceSnapshot: ApiSurfaceSnapshot;
  /**
   * Definition channels for explicit authority/evidence/convergence contracts.
   *
   * `authority`: converged definitions used for semantic truth.
   * `evidence`: all candidates that entered convergence.
   * `convergence`: winner/loser reasons from convergence.
   */
  definition: ProjectSemanticsDefinitionChannels;
  /** Registration analysis results */
  registration: RegistrationAnalysis;
  /** External template files (convention-based: foo.ts -> foo.html) */
  templates: readonly TemplateInfo[];
  /** Inline templates (string literals in decorators/static $au) */
  inlineTemplates: readonly InlineTemplateInfo[];
  /** Diagnostics from project-semantics discovery */
  diagnostics: readonly ProjectSemanticsDiscoveryDiagnostic[];
  /** Extracted facts with partial evaluation applied */
  facts: Map<NormalizedPath, FileFacts>;
}

export interface ProjectSemanticsDefinitionChannels {
  /** Converged definitions consumed as semantic authority. */
  authority: readonly ResourceDef[];
  /** Raw candidates that entered definition convergence. */
  evidence: readonly ResourceDef[];
  /** Convergence reason traces produced by the definition solver. */
  convergence: readonly DefinitionConvergenceRecord[];
}

/**
 * Diagnostic from project-semantics discovery.
 */
export type ProjectSemanticsDiscoveryDiagnostic = RawDiagnostic;

export type ProjectSemanticsDiscoveryDiagnosticEmitter = DiagnosticEmitter<DiagnosticsCatalog>;

/**
 * Main entry point: run the full project semantics discovery pipeline.
 *
 * Pipeline (stage map):
 * extract: AST -> FileFacts (with import resolution)
 * exports: FileFacts -> ExportBindingMap
 * evaluate: FileFacts -> resolved FileFacts + gaps
 * recognize: FileFacts -> ResourceDef[] + gaps
 * template-facts: recognized resources + contexts -> routed template facts
 * assemble: ResourceDef[] -> Semantics + Catalog + Syntax
 * register: ResourceDef[] + FileFacts -> RegistrationAnalysis
 * scope: RegistrationAnalysis -> ResourceGraph
 * snapshot: Semantics + ResourceGraph -> snapshots
 * templates: RegistrationAnalysis + ResourceGraph -> templates
 */
export function discoverProjectSemantics(
  program: ts.Program,
  config?: ProjectSemanticsDiscoveryConfig,
  logger?: Logger,
): ProjectSemanticsDiscoveryResult {
  const diagEmitter = config?.diagnostics;
  if (!diagEmitter) {
    throw new Error("discoverProjectSemantics requires diagnostics emitter; missing emitter is a wiring error.");
  }
  const trace = config?.trace ?? NOOP_TRACE;
  const log = logger ?? nullLogger;

  return trace.span("discovery.project", () => {
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
    const recognizedResources: ResourceDef[] = [];
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
      recognizedResources.push(...matchResult.resources);
      matcherGaps.push(...matchResult.gaps);
    }
    trace.event("discovery.patternMatching.done", { resourceCount: recognizedResources.length });
    debug.project("patternMatching.complete", {
      resourceCount: recognizedResources.length,
      gapCount: matcherGaps.length,
    });

    // Stage: template-facts
    log.info("[discovery] collecting template facts...");
    trace.event("discovery.templateFacts.start");
    const templateFacts = collectTemplateFactCollection(
      recognizedResources,
      contexts,
      config?.fileSystem,
      (specifier, fromFile) => resolveProjectModulePath(program, specifier, fromFile),
    );
    trace.event("discovery.templateFacts.done", {
      ownedCount: templateFacts.owned.length,
      ambiguityCount: templateFacts.ambiguities.length,
      missingOwnerCount: templateFacts.missingOwners.length,
    });
    debug.project("templateFacts.complete", {
      ownedCount: templateFacts.owned.length,
      ambiguityCount: templateFacts.ambiguities.length,
      missingOwnerCount: templateFacts.missingOwners.length,
    });

    const templateMetaCandidates = collectTemplateMetaDefinitionCandidates(
      templateFacts,
    );
    const candidateOverrides = createDiscoveryConvergenceOverrides(
      recognizedResources,
      templateMetaCandidates.candidates,
      config?.packagePath,
    );
    const convergedResources = [
      ...recognizedResources,
      ...templateMetaCandidates.candidates,
    ];

    const analysisGaps = [
      ...evaluation.gaps,
      ...matcherGaps,
      ...templateMetaCandidates.gaps,
    ];
    const catalogGaps = analysisGaps.map(analysisGapToCatalogGap);
    const catalogConfidence = catalogConfidenceFromGaps(analysisGaps);

    // Stage: assemble
    log.info("[discovery] building semantics artifacts...");
    trace.event("discovery.semantics.start");
    const { semantics, catalog, syntax, definitionAuthority, definitionConvergence } = buildSemanticsArtifacts(
      convergedResources,
      config?.baseSemantics,
      {
        confidence: catalogConfidence,
        ...(catalogGaps.length ? { gaps: catalogGaps } : {}),
        ...(candidateOverrides.size > 0 ? { candidateOverrides } : {}),
      },
    );
    trace.event("discovery.semantics.done", {
      resourceCount: definitionAuthority.length,
    });

    // Stage: register
    log.info("[discovery] analyzing registration...");
    trace.event("discovery.registration.start");
    const analyzer = createRegistrationAnalyzer();
    const registration = analyzer.analyze(
      definitionAuthority,
      facts,
      exportBindings,
      templateFacts,
      templateMetaCandidates.localTemplateAuthorities,
    );
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
      `[discovery] complete: authority=${definitionAuthority.length} evidence=${convergedResources.length} (${globalCount} global, ${localCount} local, ${registration.orphans.length} orphans), ${templates.length} external + ${inlineTemplates.length} inline templates`,
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

    const convergenceDiagnostics = definitionConvergenceToDiagnostics(definitionConvergence, diagEmitter);

    // Merge all diagnostics: matcher gaps + convergence + orphans + unresolved patterns + unresolved refs
    const allDiagnostics: ProjectSemanticsDiscoveryDiagnostic[] = [
      ...analysisGaps.map((gap) => gapToDiagnostic(gap, diagEmitter)),
      ...convergenceDiagnostics,
      ...orphansToDiagnostics(registration.orphans, diagEmitter),
      ...unresolvedToDiagnostics(registration.unresolved, diagEmitter),
      ...unresolvedRefsToDiagnostics(unresolvedRefs, diagEmitter),
    ];

    trace.setAttributes({
      "discovery.resourceCount": definitionAuthority.length,
      "discovery.resourceEvidenceCount": convergedResources.length,
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
      const stripped = stripSourcedNodes(recognizedResources);
      trace.event("discovery.stripSourcedNodes", { removed: stripped.removed });
      debug.project("stripSourcedNodes.complete", { removed: stripped.removed });
    }

    return {
      semantics,
      catalog,
      syntax,
      ...(config?.packagePath ? { packagePath: normalizePathForId(config.packagePath) } : {}),
      resourceGraph,
      semanticSnapshot,
      apiSurfaceSnapshot,
      definition: {
        authority: definitionAuthority,
        evidence: convergedResources,
        convergence: definitionConvergence,
      },
      registration,
      templates,
      inlineTemplates,
      diagnostics: allDiagnostics,
      facts,
    };
  });
}

/**
 * Convert an AnalysisGap to a ProjectSemanticsDiscoveryDiagnostic.
 *
 * The uri field is only included when gap has location information.
 * The file path is normalized since GapLocation.file is a plain string.
 */
function gapToDiagnostic(gap: AnalysisGap, emitter: ProjectSemanticsDiscoveryDiagnosticEmitter): ProjectSemanticsDiscoveryDiagnostic {
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

/** Exported for testing (Pattern B: gap identity survival through catalog boundary). */
export function analysisGapToCatalogGap(gap: AnalysisGap): CatalogGap {
  const message = `${gap.what}: ${gap.suggestion}`;
  const resource = gap.where?.file;
  return {
    kind: gap.why.kind,
    message,
    ...(resource != null && { resource }),
    ...(gap.resource != null && { resourceKind: gap.resource.kind, resourceName: gap.resource.name }),
  };
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
    case "local-template-definition":
      return evidence.component;
  }
}

function resolveProjectModulePath(
  program: ts.Program,
  specifier: string,
  fromFile: NormalizedPath,
): NormalizedPath | null {
  const result = ts.resolveModuleName(
    specifier,
    fromFile,
    program.getCompilerOptions(),
    ts.sys,
  );

  if (result.resolvedModule?.resolvedFileName) {
    let resolved = result.resolvedModule.resolvedFileName;
    if (resolved.endsWith(".js")) {
      const tsCandidate = resolved.slice(0, -3) + ".ts";
      if (ts.sys.fileExists(tsCandidate)) {
        resolved = tsCandidate;
      }
    }
    return normalizePathForId(resolved);
  }

  if (specifier.endsWith(".js") && (specifier.startsWith("./") || specifier.startsWith("../"))) {
    const tsSpecifier = specifier.slice(0, -3) + ".ts";
    const mapped = ts.resolveModuleName(
      tsSpecifier,
      fromFile,
      program.getCompilerOptions(),
      ts.sys,
    );
    if (mapped.resolvedModule?.resolvedFileName) {
      return normalizePathForId(mapped.resolvedModule.resolvedFileName);
    }
  }

  return null;
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
