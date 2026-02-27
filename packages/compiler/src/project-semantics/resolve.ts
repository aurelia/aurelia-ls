// Project Pipeline — L2 Architecture
//
// Pipeline stages: extract → characterize → converge
//
// Extract: AST → FileFacts (per-file, cacheable by IncrementalDiscovery)
// Characterize: FileFacts → recognized resources + observations + gaps
// Converge: resources → semantics + catalog + scope + templates + diagnostics
//
// This is the L2 project pipeline decomposition. Each stage is a named
// function with explicit inputs and outputs.

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
import { collectTemplateFactCollection, type TemplateFactCollection } from "./extract/template-facts.js";
import { evaluateFileFacts } from "./evaluate/partial-evaluation.js";
import { buildExportBindingMap } from "./exports/export-resolver.js";
import type { ExportBindingMap } from "./exports/types.js";
import {
  matchFileFacts,
  type MatchSource,
  type RecognizedBindingCommand,
  type RecognizedAttributePattern,
} from "./recognize/pipeline.js";
import {
  sortAndDedupeAttributePatterns,
  sortAndDedupeBindingCommands,
} from "./recognize/extensions.js";
import { createRegistrationAnalyzer } from "./register/analyzer.js";
import { buildResourceGraph } from "./scope/builder.js";
import {
  definitionConvergenceToDiagnostics,
  orphansToDiagnostics,
  unresolvedRefsToDiagnostics,
  unresolvedToDiagnostics,
  type UnresolvedResourceInfo,
} from "./diagnostics/convert.js";
import { buildSemanticsArtifacts } from "./assemble/build.js";
import type {
  DefinitionConvergenceRecord,
} from "./assemble/build.js";
import { createDiscoveryConvergenceOverrides } from "./definition/candidate-overrides.js";
import { collectTemplateMetaDefinitionCandidates } from "./definition/template-meta-candidates.js";
import { stripSourcedNodes } from "./assemble/strip.js";
import { discoverTemplates } from "./templates/discover.js";
import type { InlineTemplateInfo, TemplateInfo } from "./templates/types.js";
import { buildApiSurfaceSnapshot } from "./snapshot/api-surface-snapshot.js";
import { buildSemanticSnapshot } from "./snapshot/semantic-snapshot.js";
export type { InlineTemplateInfo, TemplateInfo } from "./templates/types.js";

// ============================================================================
// Configuration
// ============================================================================

export interface ProjectSemanticsDiscoveryConfig {
  conventions?: ConventionConfig;
  baseSemantics?: ProjectSemantics;
  defaultScope?: ResourceScopeId | null;
  trace?: CompileTrace;
  packagePath?: string;
  packageRoots?: ReadonlyMap<string, string> | Readonly<Record<string, string>>;
  defines?: DefineMap;
  stripSourcedNodes?: boolean;
  partialEvaluation?: {
    failOnFiles?: ReadonlySet<NormalizedPath> | readonly NormalizedPath[];
  };
  fileSystem?: FileSystemContext;
  templateExtensions?: readonly string[];
  styleExtensions?: readonly string[];
  diagnostics: ProjectSemanticsDiscoveryDiagnosticEmitter;
}

// ============================================================================
// Result Types
// ============================================================================

export interface ProjectSemanticsDiscoveryResult {
  semantics: MaterializedSemantics;
  catalog: ResourceCatalog;
  syntax: TemplateSyntaxRegistry;
  packagePath?: NormalizedPath;
  resourceGraph: ResourceGraph;
  semanticSnapshot: SemanticSnapshot;
  apiSurfaceSnapshot: ApiSurfaceSnapshot;
  definition: ProjectSemanticsDefinitionChannels;
  registration: RegistrationAnalysis;
  templates: readonly TemplateInfo[];
  inlineTemplates: readonly InlineTemplateInfo[];
  diagnostics: readonly ProjectSemanticsDiscoveryDiagnostic[];
  recognizedBindingCommands: readonly RecognizedBindingCommand[];
  recognizedAttributePatterns: readonly RecognizedAttributePattern[];
  facts: Map<NormalizedPath, FileFacts>;
}

export interface ProjectSemanticsDefinitionChannels {
  authority: readonly ResourceDef[];
  evidence: readonly ResourceDef[];
  convergence: readonly DefinitionConvergenceRecord[];
}

export type ProjectSemanticsDiscoveryDiagnostic = RawDiagnostic;
export type ProjectSemanticsDiscoveryDiagnosticEmitter = DiagnosticEmitter<DiagnosticsCatalog>;

// ============================================================================
// Characterization Output (intermediate — between extract and converge)
// ============================================================================

export interface CharacterizationResult {
  /** Evaluated facts (with partial evaluation applied) */
  readonly facts: Map<NormalizedPath, FileFacts>;
  /** Export binding map */
  readonly exportBindings: ExportBindingMap;
  /** Recognized resources */
  readonly resources: readonly ResourceDef[];
  /** Recognized binding commands */
  readonly bindingCommands: readonly RecognizedBindingCommand[];
  /** Recognized attribute patterns */
  readonly attributePatterns: readonly RecognizedAttributePattern[];
  /** All analysis gaps */
  readonly gaps: readonly AnalysisGap[];
  /** Match sources (for convergence override ordering) */
  readonly matchSources: ReadonlyMap<ResourceDef, MatchSource>;
  /** File contexts (for registration analysis) */
  readonly contexts: ReadonlyMap<NormalizedPath, FileContext>;
  /** Template fact collection */
  readonly templateFacts: TemplateFactCollection;
  /** Template meta definition candidates */
  readonly templateMetaCandidates: readonly ResourceDef[];
  /** Template meta gaps */
  readonly templateMetaGaps: readonly AnalysisGap[];
  /** Local template authorities */
  readonly localTemplateAuthorities: ReadonlyMap<string, ResourceDef>;
}

// ============================================================================
// Top-Level Entry Points
// ============================================================================

/**
 * Full project semantics discovery: extract + characterize + converge.
 */
export function discoverProjectSemantics(
  program: ts.Program,
  config?: ProjectSemanticsDiscoveryConfig,
  logger?: Logger,
): ProjectSemanticsDiscoveryResult {
  const trace = config?.trace ?? NOOP_TRACE;
  const log = logger ?? nullLogger;

  return trace.span("discovery.project", () => {
    const sourceFileCount = program.getSourceFiles().length;
    trace.setAttributes({ "discovery.sourceFileCount": sourceFileCount });
    debug.project("start", { sourceFileCount, hasFileSystem: !!config?.fileSystem });

    // Stage 1: Extract
    log.info("[discovery] extracting facts...");
    const rawFacts = trace.span("discovery:extract", () => extractAllFileFacts(program, {
      fileSystem: config?.fileSystem,
      templateExtensions: config?.templateExtensions,
      styleExtensions: config?.styleExtensions,
    }));
    debug.project("extraction.complete", { factCount: rawFacts.size });

    // Stages 2-10
    return discoverFromFacts(rawFacts, program, config, logger);
  });
}

/**
 * Run stages 2-10 from pre-extracted facts.
 *
 * Decomposed into characterize() → converge().
 */
export function discoverFromFacts(
  rawFacts: Map<NormalizedPath, FileFacts>,
  program: ts.Program,
  config?: ProjectSemanticsDiscoveryConfig,
  logger?: Logger,
): ProjectSemanticsDiscoveryResult {
  const diagEmitter = config?.diagnostics;
  if (!diagEmitter) {
    throw new Error("discoverFromFacts requires diagnostics emitter.");
  }
  const log = logger ?? nullLogger;

  const trace = config?.trace ?? NOOP_TRACE;

  // Stage 2: Characterize (exports + evaluate + recognize + template-facts)
  log.info("[discovery] characterizing...");
  const characterized = trace.span("discovery:characterize", () => characterize(rawFacts, program, config));

  // Stage 3: Converge (assemble + register + scope + snapshot + templates + diagnostics)
  log.info("[discovery] converging...");
  const result = trace.span("discovery:converge", () => converge(characterized, program, config, diagEmitter));

  log.info(
    `[discovery] complete: authority=${result.definition.authority.length} ` +
    `evidence=${result.definition.evidence.length}, ` +
    `${result.templates.length} external + ${result.inlineTemplates.length} inline templates`,
  );

  return result;
}

// ============================================================================
// Stage: Characterize
// ============================================================================

/**
 * Characterize: exports → evaluate → recognize → template-facts.
 *
 * Transforms raw FileFacts into recognized resources with analysis gaps.
 * This is the L2 "characterize" stage — produces observations from source analysis.
 */
function characterize(
  rawFacts: Map<NormalizedPath, FileFacts>,
  program: ts.Program,
  config?: ProjectSemanticsDiscoveryConfig,
): CharacterizationResult {
  // 2a. Export bindings
  const exportBindings = buildExportBindingMap(rawFacts);

  // 2b. Partial evaluation
  const evaluation = evaluateFileFacts(rawFacts, exportBindings, {
    packagePath: config?.packagePath,
    defines: config?.defines,
    failOnFiles: config?.partialEvaluation?.failOnFiles,
  });
  const facts = evaluation.facts;

  // 2c. Pattern recognition
  const resources: ResourceDef[] = [];
  const bindingCommands: RecognizedBindingCommand[] = [];
  const attributePatterns: RecognizedAttributePattern[] = [];
  const matcherGaps: AnalysisGap[] = [];
  const matchSources = new Map<ResourceDef, MatchSource>();
  const contexts = new Map<NormalizedPath, FileContext>();

  for (const [filePath, fileFacts] of facts) {
    const context = extractFileContext(filePath, {
      fileSystem: config?.fileSystem,
      templateExtensions: config?.templateExtensions,
      styleExtensions: config?.styleExtensions,
    }, program);
    contexts.set(filePath, context);

    const matchResult = matchFileFacts(fileFacts, context);
    resources.push(...matchResult.resources);
    bindingCommands.push(...matchResult.bindingCommands);
    attributePatterns.push(...matchResult.attributePatterns);
    matcherGaps.push(...matchResult.gaps);
    for (const [resource, source] of matchResult.matchSources) {
      matchSources.set(resource, source);
    }
    debug.project("characterize.file", {
      filePath,
      classCount: fileFacts.classes.length,
      siblingCount: context.siblings.length,
      matchedResources: matchResult.resources.length,
      matchedCommands: matchResult.bindingCommands.length,
      gapCount: matchResult.gaps.length,
    });
  }

  // 2d. Template facts
  const templateFacts = collectTemplateFactCollection(
    resources,
    contexts,
    config?.fileSystem,
    (specifier, fromFile) => resolveProjectModulePath(program, specifier, fromFile),
  );

  const templateMetaResult = collectTemplateMetaDefinitionCandidates(templateFacts);

  return {
    facts,
    exportBindings,
    resources,
    bindingCommands: sortAndDedupeBindingCommands(bindingCommands),
    attributePatterns: sortAndDedupeAttributePatterns(attributePatterns),
    gaps: [...evaluation.gaps, ...matcherGaps, ...templateMetaResult.gaps],
    matchSources,
    contexts,
    templateFacts,
    templateMetaCandidates: templateMetaResult.candidates,
    templateMetaGaps: templateMetaResult.gaps,
    localTemplateAuthorities: templateMetaResult.localTemplateAuthorities,
  };
}

// ============================================================================
// Stage: Converge
// ============================================================================

/**
 * Converge: assemble → register → scope → snapshot → templates → diagnostics.
 *
 * Transforms characterized resources into the final semantic model components.
 * This is the L2 "converge" stage — produces conclusions from observations.
 */
function converge(
  characterized: CharacterizationResult,
  program: ts.Program,
  config: ProjectSemanticsDiscoveryConfig | undefined,
  diagEmitter: ProjectSemanticsDiscoveryDiagnosticEmitter,
): ProjectSemanticsDiscoveryResult {
  // Prepare convergence inputs
  const candidateOverrides = createDiscoveryConvergenceOverrides(
    characterized.resources as ResourceDef[],
    characterized.templateMetaCandidates as ResourceDef[],
    config?.packagePath,
    characterized.matchSources as Map<ResourceDef, MatchSource>,
  );
  const allResources = [
    ...characterized.resources,
    ...characterized.templateMetaCandidates,
    // Local templates are compiled from <template as-custom-element="...">
    // declarations. They're first-class resources with proper symbolIds,
    // discoverable through the definition authority channel like any CE.
    ...Array.from(characterized.localTemplateAuthorities.values()),
  ];
  const catalogGaps = characterized.gaps.map(analysisGapToCatalogGap);
  const catalogConfidence = catalogConfidenceFromGaps(characterized.gaps as AnalysisGap[]);

  // 3a. Assemble semantics
  const {
    semantics,
    catalog,
    syntax,
    definitionAuthority,
    definitionConvergence,
    mergeUncertaintyGaps,
  } = buildSemanticsArtifacts(
    allResources,
    config?.baseSemantics,
    {
      confidence: catalogConfidence,
      ...(catalogGaps.length ? { gaps: catalogGaps } : {}),
      ...(candidateOverrides.size > 0 ? { candidateOverrides } : {}),
      ...(characterized.bindingCommands.length > 0 ? { recognizedBindingCommands: characterized.bindingCommands } : {}),
      ...(characterized.attributePatterns.length > 0 ? { recognizedAttributePatterns: characterized.attributePatterns } : {}),
    },
  );

  // 3b. Registration analysis
  const analyzer = createRegistrationAnalyzer();
  const registration = analyzer.analyze(
    definitionAuthority,
    characterized.facts,
    characterized.exportBindings,
    characterized.templateFacts,
    characterized.localTemplateAuthorities,
  );

  // 3c. Scope graph
  const resourceGraph = buildResourceGraph(registration, config?.baseSemantics, config?.defaultScope);

  // 3d. Snapshots
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

  // 3e. Template discovery
  const { templates, inlineTemplates } = discoverTemplates(registration, program, resourceGraph);

  // 3f. Diagnostics
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

  const allDiagnostics: ProjectSemanticsDiscoveryDiagnostic[] = [
    ...(characterized.gaps as AnalysisGap[]).map((gap) => gapToDiagnostic(gap, diagEmitter)),
    ...mergeUncertaintyGaps.map((gap) => catalogGapToDiagnostic(gap, diagEmitter)),
    ...definitionConvergenceToDiagnostics(definitionConvergence, diagEmitter),
    ...orphansToDiagnostics(registration.orphans, diagEmitter),
    ...unresolvedToDiagnostics(registration.unresolved, diagEmitter),
    ...unresolvedRefsToDiagnostics(unresolvedRefs, diagEmitter),
  ];

  // Optional: strip AST node references for memory
  if (config?.stripSourcedNodes) {
    stripSourcedNodes(characterized.resources as ResourceDef[]);
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
      evidence: allResources,
      convergence: definitionConvergence,
    },
    registration,
    templates,
    inlineTemplates,
    diagnostics: allDiagnostics,
    recognizedBindingCommands: characterized.bindingCommands as RecognizedBindingCommand[],
    recognizedAttributePatterns: characterized.attributePatterns as RecognizedAttributePattern[],
    facts: characterized.facts,
  };
}

// ============================================================================
// Diagnostic Helpers
// ============================================================================

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

function catalogGapToDiagnostic(
  gap: CatalogGap,
  emitter: ProjectSemanticsDiscoveryDiagnosticEmitter,
): ProjectSemanticsDiscoveryDiagnostic {
  const uri = gap.resource
    ? asDocumentUri(normalizePathForId(gap.resource))
    : undefined;
  const diagnostic = toRawDiagnostic(emitter.emit("aurelia/gap/unknown-registration", {
    message: gap.message,
    severity: "info",
    data: { gapKind: gap.kind },
  }));
  return uri ? { ...diagnostic, uri } : diagnostic;
}

function toRawDiagnostic(diag: CompilerDiagnostic): RawDiagnostic {
  const { span, ...rest } = diag;
  return span ? { ...rest, span } : { ...rest };
}

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

function catalogConfidenceFromGaps(gaps: readonly AnalysisGap[]): CatalogConfidence {
  if (gaps.length === 0) return "complete";
  for (const gap of gaps) {
    if (isConservativeGap(gap.why.kind)) return "conservative";
  }
  return "partial";
}

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
  "dynamic-value", "function-return", "computed-property", "spread-unknown",
  "unsupported-pattern", "conditional-registration", "loop-variable", "invalid-resource-name",
]);

const PARTIAL_EVAL_GAP_KINDS = new Set([
  "package-not-found", "invalid-package-json", "missing-package-field", "entry-point-not-found",
  "no-entry-points", "complex-exports", "workspace-no-source-dir", "workspace-entry-not-found",
  "unresolved-import", "circular-import", "external-package", "legacy-decorators",
  "no-source", "minified-code", "unsupported-format", "analysis-failed", "parse-error",
]);
