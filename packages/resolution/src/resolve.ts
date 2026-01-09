import type ts from "typescript";
import type {
  CatalogConfidence,
  CatalogGap,
  NormalizedPath,
  ResourceCatalog,
  ResourceGraph,
  ResourceDef,
  ResourceScopeId,
  Semantics,
  SemanticsWithCaches,
  TemplateSyntaxRegistry,
  CompileTrace,
} from "@aurelia-ls/compiler";
import { normalizePathForId, NOOP_TRACE, debug } from "@aurelia-ls/compiler";
import type { FileFacts, FileContext } from "./extraction/file-facts.js";
import type { AnalysisGap } from "./analysis/types.js";
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
import { unwrapSourced } from "./semantics/sourced.js";
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
export interface ResolutionDiagnostic {
  code: string;
  message: string;
  source?: NormalizedPath;
  severity: "error" | "warning" | "info";
}

/**
 * Main entry point: run the full resolution pipeline.
 *
 * Pipeline:
 * 1. Extraction (Layer 1): AST → FileFacts (with import resolution)
 * 2. Export Binding (Layer 1.5): FileFacts → ExportBindingMap
 * 3. Partial Evaluation (Layer 2): FileFacts → resolved FileFacts + gaps
 * 4. Pattern Matching (Layer 3): FileFacts → ResourceDef[]
 * 5. Semantics (Layer 4): ResourceDef[] → Semantics + Catalog + Syntax
 * 6. Registration Analysis (Layer 5): ResourceDef[] + FileFacts → RegistrationAnalysis
 * 7. Scope Construction (Layer 6): RegistrationAnalysis → ResourceGraph
 * 8. Template Discovery (Layer 7): RegistrationAnalysis + ResourceGraph → templates
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

    // Layer 7: Template Discovery
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
    });

    return {
      semantics,
      catalog,
      syntax,
      resourceGraph,
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
 * The source field is only included when gap has location information.
 * The file path is normalized since GapLocation.file is a plain string.
 */
function gapToDiagnostic(gap: AnalysisGap): ResolutionDiagnostic {
  const diagnostic: ResolutionDiagnostic = {
    code: `gap:${gap.why.kind}`,
    message: `${gap.what}: ${gap.suggestion}`,
    severity: "warning",
  };
  if (gap.where?.file) {
    diagnostic.source = normalizePathForId(gap.where.file);
  }
  return diagnostic;
}

function analysisGapToCatalogGap(gap: AnalysisGap): CatalogGap {
  const message = `${gap.what}: ${gap.suggestion}`;
  const resource = gap.where?.file;
  return resource
    ? { kind: gap.why.kind, message, resource }
    : { kind: gap.why.kind, message };
}

function catalogConfidenceFromGaps(gaps: AnalysisGap[]): CatalogConfidence {
  return gaps.length === 0 ? "complete" : "partial";
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
    const scopeId = computeScopeId(site, resourceGraph);
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
    const scopeId = resourceGraph.root; // Orphans go to root scope
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

