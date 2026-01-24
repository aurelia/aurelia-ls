import type ts from "typescript";
import type {
  CatalogConfidence,
  CatalogGap,
  ApiSurfaceSnapshot,
  CompilerDiagnostic,
  RawDiagnostic,
  NormalizedPath,
  ResourceCatalog,
  ResourceGraph,
  ResourceDef,
  ResourceScopeId,
  SemanticSnapshot,
  Semantics,
  SemanticsWithCaches,
  TemplateSyntaxRegistry,
  CompileTrace,
} from "@aurelia-ls/compiler";
import {
  asDocumentUri,
  createDiagnosticEmitter,
  diagnosticsByCategory,
  normalizePathForId,
  NOOP_TRACE,
  debug,
} from "@aurelia-ls/compiler";
import type { FileFacts, FileContext } from "./extraction/file-facts.js";
import type { AnalysisGap } from "./analysis/types.js";
import type { DefineMap } from "./defines.js";
import type { RegistrationAnalysis, RegistrationSite, RegistrationEvidence } from "./registration/types.js";
import type { ConventionConfig } from "./conventions/types.js";
import type { Logger } from "./types.js";
import type { FileSystemContext } from "./project/context.js";
import { extractAllFileFacts, extractFileContext } from "./extraction/file-facts-extractor.js";
import { evaluateFileFacts } from "./analysis/index.js";
import { buildExportBindingMap } from "./binding/export-resolver.js";
import { matchFileFacts } from "./patterns/pipeline.js";
import { createRegistrationAnalyzer } from "./registration/analyzer.js";
import { buildResourceGraph } from "./scope/builder.js";
import { orphansToDiagnostics, unresolvedToDiagnostics, unresolvedRefsToDiagnostics, type UnresolvedResourceInfo } from "./diagnostics/index.js";
import { buildSemanticsArtifacts } from "./semantics/build.js";
import { stripSourcedNodes } from "./semantics/strip.js";
import { unwrapSourced } from "./semantics/sourced.js";
import { buildApiSurfaceSnapshot, buildSemanticSnapshot } from "./snapshots/index.js";
import { dirname, resolve as resolvePath, basename } from "node:path";

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
   * `foo.ts` + `foo.html` as adjacent files → custom element "foo"
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
  /** External template files (convention-based: foo.ts → foo.html) */
  templates: readonly TemplateInfo[];
  /** Inline templates (string literals in decorators/static $au) */
  inlineTemplates: readonly InlineTemplateInfo[];
  /** Diagnostics from resolution */
  diagnostics: readonly ResolutionDiagnostic[];
  /** Extracted facts with partial evaluation applied */
  facts: Map<NormalizedPath, FileFacts>;
}

/**
 * External template file mapping (convention-based discovery).
 */
export interface TemplateInfo {
  /** Path to the .html template file */
  templatePath: NormalizedPath;
  /** Path to the .ts component file */
  componentPath: NormalizedPath;
  /** Scope ID for compilation ("root" or "local:...") */
  scopeId: ResourceScopeId;
  /** Component class name */
  className: string;
  /** Resource name (kebab-case) */
  resourceName: string;
}

/**
 * Inline template info (template content embedded in .ts file).
 */
export interface InlineTemplateInfo {
  /** The inline template content (HTML string) */
  content: string;
  /** Path to the .ts component file containing the inline template */
  componentPath: NormalizedPath;
  /** Scope ID for compilation ("root" or "local:...") */
  scopeId: ResourceScopeId;
  /** Component class name */
  className: string;
  /** Resource name (kebab-case) */
  resourceName: string;
}

/**
 * Diagnostic from resolution.
 */
export type ResolutionDiagnostic = RawDiagnostic;

const GAP_EMITTER = createDiagnosticEmitter(diagnosticsByCategory.gaps, { source: "resolution" });

/**
 * Main entry point: run the full resolution pipeline.
 *
 * Pipeline:
 * 1. Extraction (Layer 1): AST -> FileFacts (with import resolution)
 * 2. Export Binding (Layer 1.5): FileFacts -> ExportBindingMap
 * 3. Partial Evaluation (Layer 2): FileFacts -> resolved FileFacts + gaps
 * 4. Pattern Matching (Layer 3): FileFacts -> ResourceDef[]
 * 5. Semantics (Layer 4): ResourceDef[] -> Semantics + Catalog + Syntax
 * 6. Registration Analysis (Layer 5): ResourceDef[] + FileFacts -> RegistrationAnalysis
 * 7. Scope Construction (Layer 6): RegistrationAnalysis -> ResourceGraph
 * 8. Snapshot Export (Layer 7): Semantics + ResourceGraph -> snapshots
 * 9. Template Discovery (Layer 8): RegistrationAnalysis + ResourceGraph -> templates
 */
export function resolve(
  program: ts.Program,
  config?: ResolutionConfig,
  logger?: Logger,
): ResolutionResult {
  const trace = config?.trace ?? NOOP_TRACE;
  const log = logger ?? nullLogger;

  return trace.span("resolution.resolve", () => {
    const sourceFileCount = program.getSourceFiles().length;
    trace.setAttributes({
      "resolution.sourceFileCount": sourceFileCount,
    });

    debug.resolution("start", { sourceFileCount, hasFileSystem: !!config?.fileSystem });

    // Layer 1: Extraction
    log.info("[resolution] extracting facts...");
    trace.event("resolution.extraction.start");
    const rawFacts = extractAllFileFacts(program, {
      fileSystem: config?.fileSystem,
      templateExtensions: config?.templateExtensions,
      styleExtensions: config?.styleExtensions,
    });
    trace.event("resolution.extraction.done", { factCount: rawFacts.size });
    debug.resolution("extraction.complete", { factCount: rawFacts.size });

    // Layer 1.5: Export Binding Resolution
    log.info("[resolution] building export bindings...");
    trace.event("resolution.binding.start");
    const exportBindings = buildExportBindingMap(rawFacts);
    trace.event("resolution.binding.done", {
      fileCount: exportBindings.size,
    });
    debug.resolution("binding.complete", {
      fileCount: exportBindings.size,
    });

    // Layer 2: Partial Evaluation
    log.info("[resolution] partially evaluating values...");
    trace.event("resolution.partialEvaluation.start");
    const evaluation = evaluateFileFacts(rawFacts, exportBindings, {
      packagePath: config?.packagePath,
      defines: config?.defines,
      failOnFiles: config?.partialEvaluation?.failOnFiles,
    });
    trace.event("resolution.partialEvaluation.done", {
      factCount: evaluation.facts.size,
      gapCount: evaluation.gaps.length,
    });
    debug.resolution("partialEvaluation.complete", {
      factCount: evaluation.facts.size,
      gapCount: evaluation.gaps.length,
    });

    const facts = evaluation.facts;

    // Layer 3: Pattern Matching
    log.info("[resolution] matching patterns...");
    trace.event("resolution.patternMatching.start");
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
    trace.event("resolution.patternMatching.done", { resourceCount: allResources.length });
    debug.resolution("patternMatching.complete", {
      resourceCount: allResources.length,
      gapCount: matcherGaps.length,
    });

    const analysisGaps = [...evaluation.gaps, ...matcherGaps];
    const catalogGaps = analysisGaps.map(analysisGapToCatalogGap);
    const catalogConfidence = catalogConfidenceFromGaps(analysisGaps);

    // Layer 4: Semantics + Catalog + Syntax
    log.info("[resolution] building semantics artifacts...");
    trace.event("resolution.semantics.start");
    const { semantics, catalog, syntax } = buildSemanticsArtifacts(allResources, config?.baseSemantics, {
      confidence: catalogConfidence,
      ...(catalogGaps.length ? { gaps: catalogGaps } : {}),
    });
    trace.event("resolution.semantics.done", {
      resourceCount: allResources.length,
    });

    // Layer 5: Registration Analysis
    log.info("[resolution] analyzing registration...");
    trace.event("resolution.registration.start");
    const analyzer = createRegistrationAnalyzer();
    const registration = analyzer.analyze(allResources, facts, exportBindings, contexts);
    trace.event("resolution.registration.done", {
      siteCount: registration.sites.length,
      orphanCount: registration.orphans.length,
      unresolvedCount: registration.unresolved.length,
    });
    debug.resolution("registration.complete", {
      siteCount: registration.sites.length,
      orphanCount: registration.orphans.length,
      unresolvedCount: registration.unresolved.length,
    });

    // Layer 6: Scope Construction
    log.info("[resolution] building resource graph...");
    trace.event("resolution.scope.start");
    const resourceGraph = buildResourceGraph(registration, config?.baseSemantics, config?.defaultScope);
    trace.event("resolution.scope.done");

    const globalCount = registration.sites.filter((s) => s.scope.kind === "global").length;
    const localCount = registration.sites.filter((s) => s.scope.kind === "local").length;

    debug.resolution("scope.complete", {
      globalCount,
      localCount,
      orphanCount: registration.orphans.length,
    });

    // Layer 7: Snapshot Export
    log.info("[resolution] building snapshots...");
    trace.event("resolution.snapshots.start");
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
    trace.event("resolution.snapshots.done", {
      semanticSymbolCount: semanticSnapshot.symbols.length,
      apiSymbolCount: apiSurfaceSnapshot.symbols.length,
    });

    // Layer 8: Template Discovery
    log.info("[resolution] discovering templates...");
    trace.event("resolution.templates.start");
    const { templates, inlineTemplates } = discoverTemplates(registration, program, resourceGraph);
    trace.event("resolution.templates.done", {
      externalCount: templates.length,
      inlineCount: inlineTemplates.length,
    });
    debug.resolution("templates.complete", {
      externalCount: templates.length,
      inlineCount: inlineTemplates.length,
    });

    log.info(
      `[resolution] complete: ${allResources.length} resources (${globalCount} global, ${localCount} local, ${registration.orphans.length} orphans), ${templates.length} external + ${inlineTemplates.length} inline templates`,
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
      ...analysisGaps.map(gapToDiagnostic),
      ...orphansToDiagnostics(registration.orphans),
      ...unresolvedToDiagnostics(registration.unresolved),
      ...unresolvedRefsToDiagnostics(unresolvedRefs),
    ];

    trace.setAttributes({
      "resolution.resourceCount": allResources.length,
      "resolution.globalCount": globalCount,
      "resolution.localCount": localCount,
      "resolution.orphanCount": registration.orphans.length,
      "resolution.unresolvedCount": registration.unresolved.length,
      "resolution.templateCount": templates.length,
      "resolution.inlineTemplateCount": inlineTemplates.length,
      "resolution.analysisGapCount": analysisGaps.length,
      "resolution.partialEvaluationGapCount": evaluation.gaps.length,
      "resolution.diagnosticCount": allDiagnostics.length,
      "resolution.semanticSnapshotSymbolCount": semanticSnapshot.symbols.length,
      "resolution.apiSnapshotSymbolCount": apiSurfaceSnapshot.symbols.length,
    });

    if (config?.stripSourcedNodes) {
      const stripped = stripSourcedNodes(allResources);
      trace.event("resolution.stripSourcedNodes", { removed: stripped.removed });
      debug.resolution("stripSourcedNodes.complete", { removed: stripped.removed });
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
function gapToDiagnostic(gap: AnalysisGap): ResolutionDiagnostic {
  const code = mapGapKindToCode(gap.why.kind);
  const uri = gap.where?.file
    ? asDocumentUri(normalizePathForId(gap.where.file))
    : undefined;
  const diagnostic = toRawDiagnostic(GAP_EMITTER.emit(code, {
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

interface DiscoveredTemplates {
  templates: TemplateInfo[];
  inlineTemplates: InlineTemplateInfo[];
}

/**
 * Discover templates for element resources.
 *
 * For each element:
 * - If it has an inline template (string literal), add to inlineTemplates
 * - Otherwise, apply convention (foo.ts → foo.html) and add to templates
 *
 * Processes both registered resources (sites) and orphaned resources (declared
 * but never registered). Orphans like the root `my-app` component still need
 * their templates discovered.
 */
function discoverTemplates(
  registration: RegistrationAnalysis,
  program: ts.Program,
  resourceGraph: ResourceGraph,
): DiscoveredTemplates {
  const templates: TemplateInfo[] = [];
  const inlineTemplates: InlineTemplateInfo[] = [];
  const sourceFiles = new Set(program.getSourceFiles().map((sf) => normalizePathForId(sf.fileName)));
  const processedResources = new Set<ResourceDef>();

  // Process registered resources (from registration sites)
  for (const site of registration.sites) {
    // Only process resolved resources
    if (site.resourceRef.kind !== "resolved") continue;

    const resource = site.resourceRef.resource;

    // Avoid duplicates (a resource may have multiple registration sites)
    if (processedResources.has(resource)) continue;
    processedResources.add(resource);

    // Only elements have templates
    if (resource.kind !== "custom-element") continue;
    if (!resource.file) continue;

    const componentPath = resource.file;
    const scopeId = scopeIdForResource(resource, registration, resourceGraph, componentPath);
    const className = unwrapSourced(resource.className) ?? "unknown";
    const resourceName = unwrapSourced(resource.name) ?? "unknown";
    const inlineTemplate = unwrapSourced(resource.inlineTemplate);

    // Check for inline template first
    if (inlineTemplate !== undefined) {
      inlineTemplates.push({
        content: inlineTemplate,
        componentPath,
        scopeId,
        className,
        resourceName,
      });
      continue;
    }

    // No inline template - try convention-based discovery
    const templatePath = resolveTemplatePath(componentPath, sourceFiles);

    if (!templatePath) continue;

    templates.push({
      templatePath,
      componentPath,
      scopeId,
      className,
      resourceName,
    });
  }

  // Process orphaned resources (declared but never registered)
  // Orphans like `my-app` are valid elements that need template discovery.
  // They go to root scope since they have no explicit registration.
  for (const orphan of registration.orphans) {
    const resource = orphan.resource;

    // Avoid duplicates (shouldn't happen, but defensive)
    if (processedResources.has(resource)) continue;
    processedResources.add(resource);

    // Only elements have templates
    if (resource.kind !== "custom-element") continue;
    if (!resource.file) continue;

    const componentPath = resource.file;
    const scopeId = scopeIdForComponent(componentPath, resourceGraph);
    const className = unwrapSourced(resource.className) ?? "unknown";
    const resourceName = unwrapSourced(resource.name) ?? "unknown";
    const inlineTemplate = unwrapSourced(resource.inlineTemplate);

    // Check for inline template first
    if (inlineTemplate !== undefined) {
      inlineTemplates.push({
        content: inlineTemplate,
        componentPath,
        scopeId,
        className,
        resourceName,
      });
      continue;
    }

    // No inline template - try convention-based discovery
    const templatePath = resolveTemplatePath(componentPath, sourceFiles);

    if (!templatePath) continue;

    templates.push({
      templatePath,
      componentPath,
      scopeId,
      className,
      resourceName,
    });
  }

  return { templates, inlineTemplates };
}

/**
 * Resolve the template path for a component using convention.
 *
 * Convention: foo.ts → foo.html (same directory).
 *
 * This is called only when there's no inline template. For external templates,
 * developers use:
 *   import template from './foo.html';
 *   @customElement({ template })
 *
 * Since we can't resolve identifier references statically, we use convention.
 */
function resolveTemplatePath(
  componentPath: NormalizedPath,
  _knownFiles: Set<NormalizedPath>,
): NormalizedPath | null {
  // Convention: foo.ts → foo.html, foo.js → foo.html
  const dir = dirname(componentPath);
  const base = basename(componentPath);
  const htmlName = base.replace(/\.(ts|js|tsx|jsx)$/, ".html");

  if (htmlName === base) {
    // No extension match, can't apply convention
    return null;
  }

  return normalizePathForId(resolvePath(dir, htmlName));
}

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

function scopeIdForComponent(
  componentPath: NormalizedPath,
  resourceGraph: ResourceGraph,
): ResourceScopeId {
  const localScopeId = `local:${componentPath}` as ResourceScopeId;
  if (localScopeId in resourceGraph.scopes) return localScopeId;
  return resourceGraph.root;
}

function scopeIdForResource(
  resource: ResourceDef,
  registration: RegistrationAnalysis,
  resourceGraph: ResourceGraph,
  componentPath: NormalizedPath,
): ResourceScopeId {
  const componentScope = scopeIdForComponent(componentPath, resourceGraph);
  if (componentScope !== resourceGraph.root) return componentScope;

  const localOwners: NormalizedPath[] = [];
  for (const site of registration.sites) {
    if (site.resourceRef.kind !== "resolved") continue;
    if (site.resourceRef.resource !== resource) continue;
    if (site.scope.kind !== "local") continue;
    localOwners.push(site.scope.owner);
  }
  if (localOwners.length > 0) {
    const owner = [...localOwners].sort()[0]!;
    const localScopeId = `local:${owner}` as ResourceScopeId;
    if (localScopeId in resourceGraph.scopes) return localScopeId;
  }
  return componentScope;
}

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

