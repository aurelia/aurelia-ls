import type ts from "typescript";
import type { NormalizedPath, ResourceGraph, Semantics, ResourceScopeId } from "@aurelia-ls/domain";
import type { SourceFacts } from "./extraction/types.js";
import type { ResourceCandidate, ResolverDiagnostic } from "./inference/types.js";
import type { RegistrationIntent } from "./registration/types.js";
import type { ConventionConfig } from "./conventions/types.js";
import type { Logger } from "./types.js";
import { extractAllFacts } from "./extraction/extractor.js";
import { createResolverPipeline } from "./inference/resolver-pipeline.js";
import { createRegistrationAnalyzer } from "./registration/analyzer.js";
import { buildResourceGraph } from "./scope/builder.js";

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
  /** Diagnostics from resolution */
  diagnostics: readonly ResolutionDiagnostic[];
  /** Extracted facts (for debugging/tooling) */
  facts: Map<NormalizedPath, SourceFacts>;
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

  log.info(
    `[resolution] complete: ${candidates.length} resources (${globalCount} global, ${localCount} local, ${unknownCount} unknown)`,
  );

  return {
    resourceGraph,
    candidates,
    intents,
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
