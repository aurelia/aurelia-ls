import path from 'node:path';
import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  readSemanticProjectAppSourceSyntax,
} from '../boot/project-shape.js';
import { StaticModuleEvaluationExpressionReader } from '../evaluation/expression-reader.js';
import {
  buildEvaluationModuleGraphForEntries,
  FileSystemEvaluationModuleSourceHost,
  type EvaluationModuleResolutionPolicy,
} from '../evaluation/module-host.js';
import { isRelativeModuleSpecifier } from '../evaluation/module-specifier.js';
import { compilerOptionsPathsCanResolve } from '../evaluation/package-source-resolution.js';
import type { EvaluationModuleGraph } from '../evaluation/module-graph.js';
import {
  computationReadCurrentnessError,
  type ComputationRead,
} from '../kernel/computation-lifecycle.js';
import {
  isEvaluatedProjectSource,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import { normalizeModuleKey } from '../evaluation/module-graph.js';
import { StaticProjectEvaluationSourceIndex } from '../evaluation/project-source-index.js';
import { ConfigurationRecognitionContext } from './configuration-recognition-context.js';
import { ConfigurationRecognitionPass } from './configuration-recognition-pass.js';
import { ConfigurationStepKind } from './configuration-sequence.js';
import {
  SemanticApplicationEntrypointPolicy,
  normalizeSemanticApplicationEntrypointPolicy,
} from './app-analysis.js';

export const SEMANTIC_RUNTIME_APP_ENTRYPOINT_SELECTION_REQUIRED_ERROR_CODE =
  'SEMANTIC_RUNTIME_APP_ENTRYPOINT_SELECTION_REQUIRED' as const;

/** Bounded, identity-free facts about one connected activation component. */
export interface SemanticApplicationEntrypointClusterSummary {
  readonly activationSourceCount: number;
  readonly activationSiteCount: number;
}

export type SemanticApplicationEntrypointEvidenceKind = 'authored-direct' | 'evaluated-closed';
export type SemanticApplicationEntrypointConnectivity = 'complete' | 'inconclusive' | 'not-required';
export type SemanticApplicationEntrypointSelectionReason = 'independent-graphs' | 'connectivity-inconclusive';

/** Bounded `.app(...)` entrypoint topology recognized before TypeScript and template construction. */
export interface SemanticApplicationEntrypointPreflightResult {
  readonly evidenceKind: SemanticApplicationEntrypointEvidenceKind;
  readonly connectivity: SemanticApplicationEntrypointConnectivity;
  /** Unresolved script edges, non-literal dynamic imports/requires, or evaluator-owned module-linkage openings. */
  readonly openExecutableModuleEdgeCount: number;
  readonly activationSourceCount: number;
  readonly activationSiteCount: number;
  readonly entrypointClusterCount: number;
  readonly clusters: readonly SemanticApplicationEntrypointClusterSummary[];
}

/** Nominal refusal to aggregate multiple independent application entrypoint graphs implicitly. */
export class SemanticApplicationEntrypointSelectionRequiredError extends Error {
  readonly code = SEMANTIC_RUNTIME_APP_ENTRYPOINT_SELECTION_REQUIRED_ERROR_CODE;

  constructor(
    readonly projectKey: string,
    readonly activationSourceCount: number,
    readonly activationSiteCount: number,
    readonly entrypointClusterCount: number,
    readonly entrypointEvidenceKind: SemanticApplicationEntrypointEvidenceKind,
    readonly entrypointSelectionReason: SemanticApplicationEntrypointSelectionReason,
    readonly openExecutableModuleEdgeCount: number,
  ) {
    super(
      (entrypointSelectionReason === 'connectivity-inconclusive'
        ? `Project '${projectKey}' has ${entrypointClusterCount} apparent Aurelia application entrypoint graphs `
          + `across ${activationSourceCount} activation source file(s), but ${openExecutableModuleEdgeCount} `
          + 'executable module edge(s) keep their connectivity inconclusive. '
        : `Project '${projectKey}' contains ${entrypointClusterCount} independent ${entrypointEvidenceKind === 'authored-direct'
          ? 'directly authored'
          : 'statically evaluated'} Aurelia application entrypoint graphs `
          + `across ${activationSourceCount} activation source file(s) and ${activationSiteCount} .app(...) call(s). `)
      + 'Select a project containing one entrypoint graph, split the entrypoints into separate projects, or explicitly request '
      + `applicationEntrypointPolicy='${SemanticApplicationEntrypointPolicy.AggregateIndependentGraphs}' `
      + 'to analyze the independent graphs together.',
    );
    this.name = 'SemanticApplicationEntrypointSelectionRequiredError';
  }
}

export function isSemanticApplicationEntrypointSelectionRequiredError(
  error: unknown,
): error is SemanticApplicationEntrypointSelectionRequiredError {
  return error instanceof SemanticApplicationEntrypointSelectionRequiredError;
}

/** Refuse implicit cross-entrypoint composition while preserving explicit aggregate analysis. */
export function requireSupportedSemanticApplicationEntrypoints(
  projectKey: string,
  preflight: SemanticApplicationEntrypointPreflightResult,
  policy:
    | SemanticApplicationEntrypointPolicy
    | `${SemanticApplicationEntrypointPolicy}`
    | null
    | undefined,
): void {
  if (
    preflight.entrypointClusterCount <= 1
    || normalizeSemanticApplicationEntrypointPolicy(policy)
      === SemanticApplicationEntrypointPolicy.AggregateIndependentGraphs
  ) {
    return;
  }
  throw new SemanticApplicationEntrypointSelectionRequiredError(
    projectKey,
    preflight.activationSourceCount,
    preflight.activationSiteCount,
    preflight.entrypointClusterCount,
    preflight.evidenceKind,
    preflight.connectivity === 'inconclusive' ? 'connectivity-inconclusive' : 'independent-graphs',
    preflight.openExecutableModuleEdgeCount,
  );
}

interface ApplicationActivationSource {
  readonly activationSiteCount: number;
  readonly originEntryModuleKeys: ReadonlySet<string>;
}

interface MutableApplicationEntrypointCluster {
  activationSourceCount: number;
  activationSiteCount: number;
  readonly originEntryModuleKeys: Set<string>;
}

/**
 * Recognize closed application activations and group them by their static execution provenance.
 *
 * Every admitted source is an evaluator root. Two activation sources still belong to one application graph when an
 * outer entry reaches both: their origin-entry sets intersect. Disjoint sets are independent build/page entrypoints,
 * even when a broad TypeScript project happens to contain both. This pass only indexes retained invocation evidence;
 * it does not replay evaluator functions or mutate the admitted baseline graph.
 */
export function readSemanticApplicationEntrypointPreflight(
  evaluation: StaticProjectEvaluationResult,
): SemanticApplicationEntrypointPreflightResult {
  const recognition = new ConfigurationRecognitionPass();
  const sourceIndex = new StaticProjectEvaluationSourceIndex(evaluation);
  const activationSources: ApplicationActivationSource[] = [];

  for (const source of evaluation.sources) {
    if (!isEvaluatedProjectSource(source)) {
      continue;
    }
    const observations = recognition.recognize(new ConfigurationRecognitionContext(
      source.sourceFile,
      source.moduleKey,
      source.admission.projectKey,
      source.admission.addressHandle,
      source.evaluation,
      new StaticModuleEvaluationExpressionReader(source.evaluation),
      null,
      sourceIndex,
    ));
    const activationSiteCount = observations.reduce((count, observation) =>
      count + observation.steps.filter((step) => step.stepKind === ConfigurationStepKind.AureliaApp).length,
    0);
    if (activationSiteCount === 0) {
      continue;
    }
    const originEntryModuleKeys = new Set(source.origins.map((origin) =>
      normalizeModuleKey(origin.entryModuleKey)
    ));
    if (originEntryModuleKeys.size === 0) {
      originEntryModuleKeys.add(normalizeModuleKey(source.moduleKey));
    }
    activationSources.push({ activationSiteCount, originEntryModuleKeys });
  }

  const openExecutableModuleEdgeCount = evaluation.readUnresolvedModules().filter((edge) =>
    !isInertAssetModuleSpecifier(edge.moduleSpecifier)
  ).length + evaluation.readGraphOpenValues().length;
  return summarizeApplicationEntrypoints(
    activationSources,
    'evaluated-closed',
    openExecutableModuleEdgeCount === 0 ? 'complete' : 'inconclusive',
    openExecutableModuleEdgeCount,
  );
}

/**
 * Prove disjoint direct activation graphs from boot syntax and the evaluator's module graph before value evaluation.
 *
 * The graph is only built when more than one source carries direct imported-Aurelia `.app(...)` evidence. Ordinary
 * single-entry apps pay only the source syntax scan and fall through to the exact evaluator-backed check.
 */
export function readSemanticApplicationEntrypointSourcePreflight(
  project: ProjectBootFrame,
  moduleResolutionPolicy: EvaluationModuleResolutionPolicy,
): SemanticApplicationEntrypointPreflightResult {
  const inputReadScope = project.inputGeneration.createReadScope(
    'semantic-application-entrypoint-source-preflight',
  );
  const outcome = project.inputGeneration.withReadScope(inputReadScope, () => {
    const syntax = readSemanticProjectAppSourceSyntax(project);
    const directActivations = syntax.map((source) => ({
      sourcePath: source.sourcePath,
      activationSiteCount: source.authoredDirectApplicationEntrypointCount,
    })).filter((source) => source.activationSiteCount > 0);
    if (directActivations.length <= 1) {
      return {
        requiresCurrentnessProof: false,
        result: summarizeApplicationEntrypoints(directActivations.map((source) => ({
          activationSiteCount: source.activationSiteCount,
          originEntryModuleKeys: new Set([normalizeModuleKey(source.sourcePath)]),
        })), 'authored-direct', 'not-required', 0),
      };
    }

    const entryModuleKeys = syntax.map((source) => normalizeModuleKey(source.sourcePath));
    const host = new FileSystemEvaluationModuleSourceHost(
      project.rootDir,
      inputReadScope.host,
      project.compilerOptions.options,
      moduleResolutionPolicy,
      project.authoredSources,
    );
    const graph = buildEvaluationModuleGraphForEntries(entryModuleKeys, host).graph;
    const reachability = entryModuleKeys.map((entryModuleKey) => ({
      entryModuleKey,
      reachable: reachableEvaluationModuleKeys(graph, entryModuleKey),
    }));
    const openExecutableModuleEdgeCount = countPotentialLocalNullModuleEdges(
      graph,
      project.compilerOptions.options,
    ) + countNonLiteralDynamicModuleEdges(graph);
    return {
      requiresCurrentnessProof: true,
      result: summarizeApplicationEntrypoints(directActivations.map((source) => {
        const moduleKey = normalizeModuleKey(source.sourcePath);
        return {
          activationSiteCount: source.activationSiteCount,
          originEntryModuleKeys: new Set(reachability
            .filter((entry) => entry.reachable.has(moduleKey))
            .map((entry) => entry.entryModuleKey)),
        };
      }), 'authored-direct', openExecutableModuleEdgeCount === 0 ? 'complete' : 'inconclusive',
      openExecutableModuleEdgeCount),
    };
  });
  if (outcome.requiresCurrentnessProof) {
    requireCurrentPreflightInputs(project, inputReadScope.readRegisteredInputs());
  }
  return outcome.result;
}

function summarizeApplicationEntrypoints(
  activationSources: readonly ApplicationActivationSource[],
  evidenceKind: SemanticApplicationEntrypointEvidenceKind,
  connectivity: SemanticApplicationEntrypointConnectivity,
  openExecutableModuleEdgeCount: number,
): SemanticApplicationEntrypointPreflightResult {
  const clusters: MutableApplicationEntrypointCluster[] = [];
  for (const source of activationSources) {
    const connected = clusters.filter((cluster) => setsIntersect(
      cluster.originEntryModuleKeys,
      source.originEntryModuleKeys,
    ));
    if (connected.length === 0) {
      clusters.push({
        activationSourceCount: 1,
        activationSiteCount: source.activationSiteCount,
        originEntryModuleKeys: new Set(source.originEntryModuleKeys),
      });
      continue;
    }
    const retained = connected[0]!;
    retained.activationSourceCount += 1;
    retained.activationSiteCount += source.activationSiteCount;
    for (const origin of source.originEntryModuleKeys) {
      retained.originEntryModuleKeys.add(origin);
    }
    for (const merged of connected.slice(1)) {
      retained.activationSourceCount += merged.activationSourceCount;
      retained.activationSiteCount += merged.activationSiteCount;
      for (const origin of merged.originEntryModuleKeys) {
        retained.originEntryModuleKeys.add(origin);
      }
      clusters.splice(clusters.indexOf(merged), 1);
    }
  }

  const summaries = clusters
    .map((cluster): SemanticApplicationEntrypointClusterSummary => Object.freeze({
      activationSourceCount: cluster.activationSourceCount,
      activationSiteCount: cluster.activationSiteCount,
    }))
    .sort((left, right) =>
      right.activationSourceCount - left.activationSourceCount
      || right.activationSiteCount - left.activationSiteCount
    );
  return Object.freeze({
    evidenceKind,
    connectivity,
    openExecutableModuleEdgeCount,
    activationSourceCount: activationSources.length,
    activationSiteCount: activationSources.reduce((count, source) => count + source.activationSiteCount, 0),
    entrypointClusterCount: summaries.length,
    clusters: Object.freeze(summaries),
  });
}

function countNonLiteralDynamicModuleEdges(graph: EvaluationModuleGraph): number {
  let count = 0;
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const specifier = node.arguments[0];
      if (
        specifier != null
        && !ts.isStringLiteralLike(specifier)
        && (
          node.expression.kind === ts.SyntaxKind.ImportKeyword
          || (ts.isIdentifier(node.expression) && node.expression.text === 'require')
        )
      ) {
        count += 1;
      }
    }
    ts.forEachChild(node, visit);
  };
  for (const module of graph.readModules()) {
    ts.forEachChild(module.sourceFile, visit);
  }
  return count;
}

function countPotentialLocalNullModuleEdges(
  graph: EvaluationModuleGraph,
  compilerOptions: ts.CompilerOptions,
): number {
  let count = 0;
  for (const module of graph.readModules()) {
    const edges = [
      ...module.imports.map((entry) => ({
        moduleSpecifier: entry.moduleSpecifier,
        resolutionMode: entry.resolutionMode,
      })),
      ...module.exports.flatMap((entry) => entry.moduleSpecifier == null
        ? []
        : [{ moduleSpecifier: entry.moduleSpecifier, resolutionMode: entry.resolutionMode }]),
    ];
    for (const edge of edges) {
      if (
        graph.readLinkedModule(module.moduleKey, edge.moduleSpecifier, edge.resolutionMode) == null
        && potentialProjectLocalModuleSpecifier(edge.moduleSpecifier, compilerOptions)
      ) {
        count += 1;
      }
    }
  }
  return count;
}

function potentialProjectLocalModuleSpecifier(
  moduleSpecifier: string,
  compilerOptions: ts.CompilerOptions,
): boolean {
  if (isInertAssetModuleSpecifier(moduleSpecifier)) {
    return false;
  }
  if (
    isRelativeModuleSpecifier(moduleSpecifier)
    || path.isAbsolute(moduleSpecifier)
    || moduleSpecifier.startsWith('/')
    || moduleSpecifier.startsWith('@/')
    || moduleSpecifier.startsWith('~/')
    || moduleSpecifier.startsWith('#')
  ) {
    return true;
  }
  return compilerOptionsPathsCanResolve(compilerOptions, moduleSpecifier);
}

function requireCurrentPreflightInputs(
  project: ProjectBootFrame,
  reads: readonly ComputationRead[],
): void {
  project.requireCurrent();
  for (const read of reads) {
    const validation = read.validate();
    if (!validation.isCurrent) {
      throw computationReadCurrentnessError(
        read,
        validation,
        `Application entrypoint source preflight for ${project.projectKey} observed changed project inputs.`,
      );
    }
  }
  project.requireCurrent();
}

function isInertAssetModuleSpecifier(moduleSpecifier: string): boolean {
  const suffix = moduleSpecifier.search(/[?#]/);
  const pathPart = suffix === -1 ? moduleSpecifier : moduleSpecifier.slice(0, suffix);
  switch (path.extname(pathPart).toLowerCase()) {
    case '.css':
    case '.scss':
    case '.sass':
    case '.less':
    case '.styl':
    case '.html':
    case '.htm':
    case '.json':
    case '.svg':
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.webp':
    case '.avif':
      return true;
    default:
      return false;
  }
}

function reachableEvaluationModuleKeys(
  graph: EvaluationModuleGraph,
  entryModuleKey: string,
): ReadonlySet<string> {
  const reachable = new Set<string>();
  const visit = (moduleKey: string): void => {
    const normalizedModuleKey = normalizeModuleKey(moduleKey);
    if (reachable.has(normalizedModuleKey)) {
      return;
    }
    reachable.add(normalizedModuleKey);
    const record = graph.readModule(normalizedModuleKey);
    if (record == null) {
      return;
    }
    for (const edge of [
      ...record.imports.map((entry) => ({
        moduleSpecifier: entry.moduleSpecifier,
        resolutionMode: entry.resolutionMode,
      })),
      ...record.exports
        .filter((entry) => entry.moduleSpecifier != null)
        .map((entry) => ({
          moduleSpecifier: entry.moduleSpecifier as string,
          resolutionMode: entry.resolutionMode,
        })),
    ]) {
      const target = graph.readLinkedModule(
        normalizedModuleKey,
        edge.moduleSpecifier,
        edge.resolutionMode,
      );
      if (target != null) {
        visit(target);
      }
    }
  };
  visit(entryModuleKey);
  return reachable;
}

function setsIntersect(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
  for (const value of smaller) {
    if (larger.has(value)) {
      return true;
    }
  }
  return false;
}
