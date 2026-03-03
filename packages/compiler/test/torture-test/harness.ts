/**
 * Torture Test Harness — Claim Catalog Comparison Infrastructure
 *
 * Fresh test infrastructure for the reactive semantic architecture.
 * Does NOT share utilities with the existing test suite.
 *
 * Creates an in-memory TypeScript program from fixture source,
 * runs the interpreter (observation-layer evaluation callback),
 * and reads observations from the dep graph for comparison.
 */

import * as ts from "typescript";
import type { NormalizedPath } from "../../out/model/identity.js";
import { createProjectDepGraph } from "../../out/project-semantics/deps/graph.js";
import {
  conclusionNodeId,
  type ProjectDepGraph,
  type ObservationEntry,
  type ConvergenceFunction,
  type EvidenceSource,
} from "../../out/project-semantics/deps/types.js";
import {
  interpretProject,
  createUnitEvaluator,
} from "../../out/project-semantics/interpret/interpreter.js";
import type { GreenValue } from "../../out/value/green.js";
import type { Sourced } from "../../out/value/sourced.js";

// =============================================================================
// Aurelia Type Stubs
// =============================================================================

/**
 * Minimal type declarations for Aurelia 2 decorators and APIs.
 * The interpreter only needs the decorator names to be resolvable —
 * it doesn't execute the decorators, it pattern-matches on them.
 */
const AURELIA_STUBS = `
declare module 'aurelia' {
  export function customElement(nameOrConfig: string | Record<string, any>): ClassDecorator;
  export function customAttribute(nameOrConfig: string | Record<string, any>): ClassDecorator;
  export function templateController(nameOrConfig: string | Record<string, any>): ClassDecorator;
  export function valueConverter(nameOrConfig: string | Record<string, any>): ClassDecorator;
  export function bindingBehavior(nameOrConfig: string | Record<string, any>): ClassDecorator;
  export function bindingCommand(nameOrConfig: string | Record<string, any>): ClassDecorator;
  export function attributePattern(config: Record<string, any>): ClassDecorator;

  export function bindable(nameOrConfig?: string | Record<string, any>): PropertyDecorator & ClassDecorator;
  export function containerless(target: any): void;
  export function useShadowDOM(configOrTarget?: any): any;
  export function capture(target: any): void;
  export function processContent(fn: Function): ClassDecorator;
  export function watch(expression: string): MethodDecorator;

  export const BindingMode: {
    default: 0;
    oneTime: 1;
    toView: 2;
    fromView: 4;
    twoWay: 6;
  };

  export const CustomElement: {
    define(config: Record<string, any>, target?: any): any;
  };

  export const CustomAttribute: {
    define(config: Record<string, any>, target?: any): any;
  };

  export const ValueConverter: {
    define(config: Record<string, any>, target?: any): any;
  };

  export const BindingBehavior: {
    define(config: Record<string, any>, target?: any): any;
  };

  export const BindingCommand: {
    define(config: Record<string, any>, target?: any): any;
  };
}
`;

// =============================================================================
// In-Memory Program Creation
// =============================================================================

/**
 * Create a TypeScript program from in-memory fixture files.
 * Automatically includes Aurelia type stubs.
 */
export function createFixtureProgram(
  files: Record<string, string>,
): ts.Program {
  const opts: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    noEmit: true,
    experimentalDecorators: true,
  };

  const normalize = (f: string) => f.replace(/\\/g, "/");

  // Add aurelia stubs
  const allFiles: Record<string, string> = {
    "/node_modules/aurelia/index.d.ts": AURELIA_STUBS,
    ...files,
  };

  const mem = new Map(
    Object.entries(allFiles).map(([k, v]) => [normalize(k), v])
  );

  // Collect directories
  const dirs = new Set<string>();
  for (const p of mem.keys()) {
    let dir = p;
    while ((dir = dir.substring(0, dir.lastIndexOf("/"))) && dir !== "") {
      dirs.add(dir);
    }
    dirs.add("/");
  }

  // Only use source files as roots (not .d.ts stubs)
  const roots = Object.keys(files);
  const base = ts.createCompilerHost(opts, true);

  const host: ts.CompilerHost = {
    ...base,
    getCurrentDirectory: () => "/",
    getCanonicalFileName: (f) => normalize(f),
    fileExists: (f) => mem.has(normalize(f)) || base.fileExists(f),
    readFile: (f) => mem.get(normalize(f)) ?? base.readFile(f),
    directoryExists: (d) => {
      const key = normalize(d);
      return dirs.has(key) || base.directoryExists?.(d) || false;
    },
    getSourceFile: (f, lang, onErr, shouldCreate) => {
      const key = normalize(f);
      if (mem.has(key)) {
        return ts.createSourceFile(f, mem.get(key)!, lang, true);
      }
      return base.getSourceFile(f, lang, onErr, shouldCreate);
    },
  };

  return ts.createProgram(roots, opts, host);
}

// =============================================================================
// Evidence-Tracking Convergence
// =============================================================================

/**
 * Evidence source metadata captured during convergence.
 * Maps (resourceKey, fieldPath) → EvidenceSource of the winning observation.
 */
export type EvidenceMap = Map<string, EvidenceSource>;

function evidenceKey(resourceKey: string, fieldPath: string): string {
  return `${resourceKey}::${fieldPath}`;
}

const TIER_ORDER: Record<string, number> = {
  "analysis-explicit": 4,
  "analysis-convention": 3,
  "manifest": 2,
  "config": 1,
  "builtin": 0,
};

/**
 * Creates a convergence function that also records evidence source metadata
 * for each converged field. This enables form/tier assertions in tests.
 */
function createTrackingConvergence(evidenceMap: EvidenceMap): ConvergenceFunction {
  return (resourceKey, fieldPath, observations) => {
    if (observations.length === 1) {
      evidenceMap.set(evidenceKey(resourceKey, fieldPath), observations[0]!.source);
      return { green: observations[0]!.green, red: observations[0]!.red };
    }
    // Multiple observations: pick highest tier
    const sorted = [...observations].sort(
      (a, b) => (TIER_ORDER[b.source.tier] ?? 0) - (TIER_ORDER[a.source.tier] ?? 0)
    );
    evidenceMap.set(evidenceKey(resourceKey, fieldPath), sorted[0]!.source);
    return { green: sorted[0]!.green, red: sorted[0]!.red };
  };
}

// =============================================================================
// Interpreter Runner
// =============================================================================

export interface InterpreterResult {
  graph: ProjectDepGraph;
  program: ts.Program;
  /** Evidence source metadata from convergence, keyed by "resourceKey::fieldPath" */
  evidence: EvidenceMap;
}

/**
 * Run the interpreter on fixture files and return the populated graph.
 */
export function runInterpreter(
  files: Record<string, string>,
  options?: { enableConventions?: boolean },
): InterpreterResult {
  const evidence: EvidenceMap = new Map();
  const program = createFixtureProgram(files);
  const graph = createProjectDepGraph(
    () => {},
    createTrackingConvergence(evidence),
  );

  // Build a readFile function that serves all files (including .html)
  const normalize = (f: string) => f.replace(/\\/g, "/");
  const allFilesMap = new Map(
    Object.entries(files).map(([k, v]) => [normalize(k), v])
  );

  const config = {
    program,
    graph,
    packagePath: "/",
    enableConventions: options?.enableConventions ?? true,
    readFile: (path: string) => allFilesMap.get(normalize(path)),
  };

  // Only pass .ts files to the interpreter (it finds .html via readFile)
  const sourceFiles = Object.keys(files)
    .filter(f => f.endsWith('.ts'))
    .map(f => f as NormalizedPath);
  interpretProject(sourceFiles, config);

  return { graph, program, evidence };
}

// =============================================================================
// Observation Query
// =============================================================================

/**
 * Pull the raw Sourced<T> (red) value from the graph.
 */
export function pullRed(
  graph: ProjectDepGraph,
  resourceKey: string,
  fieldPath: string,
): Sourced<unknown> | undefined {
  const concId = conclusionNodeId(resourceKey, fieldPath);
  return graph.evaluation.pull<unknown>(concId);
}

/**
 * Extract the value from a Sourced wrapper.
 */
export function extractValue<T>(sourced: Sourced<T> | undefined): T | undefined {
  if (!sourced) return undefined;
  if (sourced.origin === 'source') {
    return sourced.state === 'known' ? sourced.value : undefined;
  }
  return sourced.value;
}

/**
 * Pull a field value and extract it in one step.
 */
export function pullValue(
  graph: ProjectDepGraph,
  resourceKey: string,
  fieldPath: string,
): unknown {
  return extractValue(pullRed(graph, resourceKey, fieldPath));
}

/**
 * Check if a resource was recognized by querying its 'name' field.
 */
export function isRecognized(
  graph: ProjectDepGraph,
  kind: string,
  name: string,
): boolean {
  return pullRed(graph, `${kind}:${name}`, "name") !== undefined;
}

/**
 * Get the evidence source for a specific field's winning observation.
 */
export function getEvidence(
  result: InterpreterResult,
  resourceKey: string,
  fieldPath: string,
): EvidenceSource | undefined {
  // Ensure the conclusion has been pulled (convergence runs lazily)
  pullRed(result.graph, resourceKey, fieldPath);
  return result.evidence.get(evidenceKey(resourceKey, fieldPath));
}

// =============================================================================
// Full Claim Assertion
// =============================================================================

/**
 * Full claim specification matching the manifest's expected output format.
 *
 * Every 1A entry specifies: kind, name, className, form, gap profile.
 * Every 1B+ entry adds: per-field expected values.
 */
export interface ClaimSpec {
  /** Expected resource kind */
  kind: string;
  /** Expected resource name */
  name: string;
  /** Expected class name */
  className: string;
  /** Expected declaration form: 'decorator', 'static-$au', 'convention', etc. */
  form: string;
  /** Per-field expected values (beyond identity) */
  fields?: Record<string, unknown>;
  /** Fields that MUST be absent (gap profile) */
  absentFields?: string[];
}

/**
 * Assert a full claim specification against the graph.
 *
 * Checks all six dimensions the manifest specifies:
 * 1. kind — via resource key
 * 2. name — via name observation value
 * 3. className — via className observation value
 * 4. form — via evidence source metadata
 * 5. fields — per-field value assertions
 * 6. gaps — absent field assertions
 *
 * Returns the resource key for ad-hoc follow-up assertions.
 */
export function assertClaim(
  result: InterpreterResult,
  spec: ClaimSpec,
): string {
  const resourceKey = `${spec.kind}:${spec.name}`;
  const { graph } = result;

  // 1+2. kind + name: resource must be recognized with correct name
  const nameValue = pullValue(graph, resourceKey, "name");
  if (nameValue === undefined) {
    throw new Error(
      `Resource NOT recognized: expected ${resourceKey}. ` +
      `Graph has ${graph.nodeCount} nodes, ${graph.edgeCount} edges.`
    );
  }
  if (nameValue !== spec.name) {
    throw new Error(
      `Name mismatch for ${resourceKey}: expected '${spec.name}', got '${nameValue}'`
    );
  }

  // 3. className
  const classNameValue = pullValue(graph, resourceKey, "className");
  if (classNameValue !== spec.className) {
    throw new Error(
      `className mismatch for ${resourceKey}: expected '${spec.className}', got '${classNameValue}'`
    );
  }

  // 4. form: check evidence source on the name field
  const nameEvidence = getEvidence(result, resourceKey, "name");
  if (nameEvidence && spec.form) {
    if (nameEvidence.form !== spec.form) {
      throw new Error(
        `form mismatch for ${resourceKey}: expected '${spec.form}', got '${nameEvidence.form}'`
      );
    }
  }

  // 5. fields: per-field value assertions
  if (spec.fields) {
    for (const [fieldPath, expectedValue] of Object.entries(spec.fields)) {
      const actual = pullValue(graph, resourceKey, fieldPath);
      if (typeof expectedValue === 'object' && expectedValue !== null) {
        // Deep comparison for objects/arrays
        const actualJson = JSON.stringify(actual);
        const expectedJson = JSON.stringify(expectedValue);
        if (actualJson !== expectedJson) {
          throw new Error(
            `Field '${fieldPath}' mismatch for ${resourceKey}: ` +
            `expected ${expectedJson}, got ${actualJson}`
          );
        }
      } else if (actual !== expectedValue) {
        throw new Error(
          `Field '${fieldPath}' mismatch for ${resourceKey}: ` +
          `expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actual)}`
        );
      }
    }
  }

  // 6. gaps: fields that must be absent
  if (spec.absentFields) {
    for (const fieldPath of spec.absentFields) {
      const actual = pullRed(graph, resourceKey, fieldPath);
      if (actual !== undefined) {
        throw new Error(
          `Field '${fieldPath}' should be ABSENT for ${resourceKey} ` +
          `but has value: ${JSON.stringify(extractValue(actual))}`
        );
      }
    }
  }

  return resourceKey;
}

/**
 * Assert that a resource is NOT recognized under a given key.
 */
export function assertNotRecognized(
  graph: ProjectDepGraph,
  kind: string,
  name: string,
): void {
  if (isRecognized(graph, kind, name)) {
    throw new Error(
      `Resource SHOULD NOT be recognized but was: ${kind}:${name}`
    );
  }
}
