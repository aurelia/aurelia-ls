import type ts from "typescript";
import type { NormalizedPath, ResourceGraph, Semantics, ResourceScopeId } from "@aurelia-ls/domain";
import { normalizePathForId } from "@aurelia-ls/domain";
import type { SourceFacts } from "./extraction/types.js";
import type { ResourceCandidate, ResolverDiagnostic } from "./inference/types.js";
import type { RegistrationIntent } from "./registration/types.js";
import type { ConventionConfig } from "./conventions/types.js";
import type { Logger } from "./types.js";
import { extractAllFacts } from "./extraction/extractor.js";
import { createResolverPipeline } from "./inference/resolver-pipeline.js";
import { createRegistrationAnalyzer } from "./registration/analyzer.js";
import { buildResourceGraph } from "./scope/builder.js";
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
}

/**
 * Result of running resolution.
 */
export interface ResolutionResult {
  /** The constructed resource graph */
  resourceGraph: ResourceGraph;
  /** All resource candidates identified */
  candidates: readonly ResourceCandidate[];
  /** Registration intents for all candidates */
  intents: readonly RegistrationIntent[];
  /** Template-to-component mappings for elements */
  templates: readonly TemplateInfo[];
  /** Diagnostics from resolution */
  diagnostics: readonly ResolutionDiagnostic[];
  /** Extracted facts (for debugging/tooling) */
  facts: Map<NormalizedPath, SourceFacts>;
}

/**
 * Template-to-component mapping for scope resolution.
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
 * 1. Extraction: AST → SourceFacts
 * 2. Inference: SourceFacts → ResourceCandidate[]
 * 3. Registration Analysis: ResourceCandidate[] → RegistrationIntent[]
 * 4. Scope Construction: RegistrationIntent[] → ResourceGraph
 */
export function resolve(
  program: ts.Program,
  config?: ResolutionConfig,
  logger?: Logger,
): ResolutionResult {
  const log = logger ?? nullLogger;

  // Layer 1: Extraction
  log.info("[resolution] extracting facts...");
  const facts = extractAllFacts(program);

  // Layer 2: Inference
  log.info("[resolution] resolving candidates...");
  const pipeline = createResolverPipeline(config?.conventions);
  const { candidates, diagnostics: resolverDiags } = pipeline.resolve(facts);

  // Layer 3: Registration Analysis
  log.info("[resolution] analyzing registration...");
  const analyzer = createRegistrationAnalyzer();
  const intents = analyzer.analyze(candidates, facts, program);

  // Layer 4: Scope Construction
  log.info("[resolution] building resource graph...");
  const resourceGraph = buildResourceGraph(intents, config?.baseSemantics, config?.defaultScope);

  const globalCount = intents.filter((i) => i.kind === "global").length;
  const localCount = intents.filter((i) => i.kind === "local").length;
  const unknownCount = intents.filter((i) => i.kind === "unknown").length;

  // Layer 5: Template Discovery
  log.info("[resolution] discovering templates...");
  const templates = discoverTemplates(intents, program, resourceGraph);

  log.info(
    `[resolution] complete: ${candidates.length} resources (${globalCount} global, ${localCount} local, ${unknownCount} unknown), ${templates.length} templates`,
  );

  return {
    resourceGraph,
    candidates,
    intents,
    templates,
    diagnostics: resolverDiags.map(toDiagnostic),
    facts,
  };
}

function toDiagnostic(d: ResolverDiagnostic): ResolutionDiagnostic {
  return {
    code: d.code,
    message: d.message,
    source: d.source,
    severity: d.severity,
  };
}

const nullLogger: Logger = {
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Discover templates for element resources.
 *
 * For each element:
 * 1. Use explicit templatePath from decorator/static $au if present
 * 2. Otherwise, apply convention: foo.ts → foo.html
 * 3. Check if the file exists in the program
 */
function discoverTemplates(
  intents: readonly RegistrationIntent[],
  program: ts.Program,
  resourceGraph: ResourceGraph,
): TemplateInfo[] {
  const templates: TemplateInfo[] = [];
  const sourceFiles = new Set(program.getSourceFiles().map((sf) => normalizePathForId(sf.fileName)));

  for (const intent of intents) {
    const { resource } = intent;

    // Only elements have templates
    if (resource.kind !== "element") continue;

    const componentPath = resource.source;
    const templatePath = resolveTemplatePath(componentPath, resource.templatePath, sourceFiles);

    if (!templatePath) continue;

    // Determine scope ID
    const scopeId = computeScopeId(intent, resourceGraph);

    templates.push({
      templatePath,
      componentPath,
      scopeId,
      className: resource.className,
      resourceName: resource.name,
    });
  }

  return templates;
}

/**
 * Resolve the template path for a component.
 *
 * Priority:
 * 1. Explicit templatePath from decorator/static $au (resolved relative to component)
 * 2. Convention: same name with .html extension
 *
 * Note: Inline templates (template content, not paths) are NOT supported.
 * If the template starts with "<", it's inline content, not a path.
 */
function resolveTemplatePath(
  componentPath: NormalizedPath,
  explicitTemplate: string | undefined,
  knownFiles: Set<NormalizedPath>,
): NormalizedPath | null {
  const dir = dirname(componentPath);
  const base = basename(componentPath);

  if (explicitTemplate) {
    // Skip inline templates (content starts with "<")
    const trimmed = explicitTemplate.trim();
    if (trimmed.startsWith("<")) {
      // Inline template - not a file path, fall through to convention
    } else {
      // Explicit template path - resolve relative to component
      const resolved = resolvePath(dir, explicitTemplate);
      const normalized = normalizePathForId(resolved);
      // We accept explicit paths even if they don't exist in the program
      // (they might be virtual or loaded separately)
      return normalized;
    }
  }

  // Convention: foo.ts → foo.html, foo.js → foo.html
  const htmlName = base.replace(/\.(ts|js|tsx|jsx)$/, ".html");
  if (htmlName === base) {
    // No extension match, can't apply convention
    return null;
  }

  const conventionPath = normalizePathForId(resolvePath(dir, htmlName));

  // Only return if the file exists in the program's known files
  // or if we can reasonably assume it exists (check both with and without normalization)
  if (knownFiles.has(conventionPath)) {
    return conventionPath;
  }

  // Also check without full normalization (for case-sensitive file systems)
  const rawPath = resolvePath(dir, htmlName);
  const rawNormalized = normalizePathForId(rawPath);
  if (knownFiles.has(rawNormalized)) {
    return rawNormalized;
  }

  // Convention file doesn't exist in program, but we'll still return it
  // as templates are often not part of the TypeScript program
  return conventionPath;
}

/**
 * Compute the scope ID for a resource based on its registration intent.
 */
function computeScopeId(intent: RegistrationIntent, resourceGraph: ResourceGraph): ResourceScopeId {
  if (intent.kind === "local" && intent.scope) {
    // Local scope: "local:{componentPath}"
    return `local:${intent.scope}` as ResourceScopeId;
  }

  // Global or unknown: use root scope
  return resourceGraph.root;
}
