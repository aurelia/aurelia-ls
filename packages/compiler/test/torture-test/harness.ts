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
  manifestNodeId,
  configNodeId,
  type ProjectDepGraph,
  type ProjectDepNodeId,
  type ObservationEntry,
  type ConvergenceFunction,
  type EvidenceSource,
} from "../../out/project-semantics/deps/types.js";
import {
  interpretProject,
  createUnitEvaluator,
} from "../../out/project-semantics/interpret/interpreter.js";
import { createConvergence } from "../../out/project-semantics/deps/convergence.js";
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

const SHARED_OPTS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  noEmit: true,
  experimentalDecorators: true,
  // Skip type-checking lib files — we only need their declarations for
  // resolution, not their correctness. Saves ~30% of program creation.
  skipDefaultLibCheck: true,
  skipLibCheck: true,
};

/**
 * Cached lib.d.ts source files. TypeScript's default libs are immutable
 * and position-independent — parsing them once and reusing across all
 * test programs eliminates the dominant per-test cost (~60 lib files).
 */
const libSourceFileCache = new Map<string, ts.SourceFile>();

/**
 * Shared base CompilerHost — created once, reused across all programs.
 * Its getSourceFile is wrapped to add caching.
 */
const sharedBaseHost = ts.createCompilerHost(SHARED_OPTS, true);

/** Pre-parsed aurelia stubs source file. */
const aureliaStubsSourceFile = ts.createSourceFile(
  "/node_modules/aurelia/index.d.ts",
  AURELIA_STUBS,
  ts.ScriptTarget.ES2022,
  true,
);

/**
 * Previous program for incremental reuse. TypeScript's createProgram
 * accepts an oldProgram parameter — it skips re-parsing unchanged
 * source files. Since lib files never change between tests, this
 * gives us free structural sharing.
 */
let previousProgram: ts.Program | undefined;

const normalize = (f: string) => f.replace(/\\/g, "/");

/**
 * Create a TypeScript program from in-memory fixture files.
 * Automatically includes Aurelia type stubs.
 *
 * Performance: caches lib.d.ts source files across invocations,
 * reuses the previous program for structural sharing, and skips
 * lib type-checking.
 */
export function createFixtureProgram(
  files: Record<string, string>,
): ts.Program {
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

  const roots = Object.keys(files);

  const host: ts.CompilerHost = {
    ...sharedBaseHost,
    getCurrentDirectory: () => "/",
    getCanonicalFileName: (f) => normalize(f),
    fileExists: (f) => mem.has(normalize(f)) || sharedBaseHost.fileExists(f),
    readFile: (f) => mem.get(normalize(f)) ?? sharedBaseHost.readFile(f),
    directoryExists: (d) => {
      const key = normalize(d);
      return dirs.has(key) || sharedBaseHost.directoryExists?.(d) || false;
    },
    getSourceFile: (f, lang, onErr, shouldCreate) => {
      const key = normalize(f);

      // In-memory fixture files — always fresh
      if (mem.has(key)) {
        return ts.createSourceFile(f, mem.get(key)!, lang, true);
      }

      // Aurelia stubs — pre-parsed singleton
      if (key === "/node_modules/aurelia/index.d.ts") {
        return aureliaStubsSourceFile;
      }

      // Lib files — cache parsed source files across all programs
      const cached = libSourceFileCache.get(key);
      if (cached) return cached;

      const sf = sharedBaseHost.getSourceFile(f, lang, onErr, shouldCreate);
      if (sf) {
        libSourceFileCache.set(key, sf);
      }
      return sf;
    },
  };

  const program = ts.createProgram(roots, SHARED_OPTS, host, previousProgram);
  previousProgram = program;
  return program;
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

/**
 * Creates a convergence function that uses the product's convergence
 * algebra (5 operators) and also records evidence source metadata for
 * form/tier assertions in tests.
 */
function createTrackingConvergence(evidenceMap: EvidenceMap): ConvergenceFunction {
  return createConvergence((resourceKey, fieldPath, source) => {
    evidenceMap.set(evidenceKey(resourceKey, fieldPath), source);
  });
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
// Non-Analysis Fixture Injection (Tier 3+)
// =============================================================================

/**
 * A non-analysis evidence fixture: manifest, config, or builtin
 * observation injected alongside analysis observations.
 */
export interface EvidenceFixture {
  /** Evidence rank */
  tier: "builtin" | "config" | "manifest" | "explicit-config";
  /** Resource identity */
  resource: { name: string; kind: string; className: string };
  /** Per-field known values */
  fields?: Record<string, unknown>;
}

/**
 * Inject a non-analysis observation fixture into the graph.
 * Creates observation nodes for each field and wires them to
 * the same conclusion nodes the interpreter uses.
 */
export function injectFixture(
  result: InterpreterResult,
  fixture: EvidenceFixture,
): void {
  const { graph } = result;
  const resourceKey = `${fixture.resource.kind}:${fixture.resource.name}`;
  const tier = fixture.tier === "explicit-config" ? "config" : fixture.tier;
  const source: EvidenceSource = { tier: tier as any, form: fixture.tier };

  // Synthetic evaluation node for this fixture source
  const evalNode = (fixture.tier === "manifest"
    ? manifestNodeId(resourceKey)
    : fixture.tier === "builtin"
    ? `eval:builtin:${resourceKey}`
    : configNodeId(resourceKey)) as any;

  // Identity fields
  registerFixtureField(graph, resourceKey, "name", fixture.resource.name, source, evalNode);
  registerFixtureField(graph, resourceKey, "className", fixture.resource.className, source, evalNode);
  registerFixtureField(graph, resourceKey, "kind", fixture.resource.kind, source, evalNode);

  // Per-field values
  if (fixture.fields) {
    for (const [fieldPath, value] of Object.entries(fixture.fields)) {
      registerFixtureField(graph, resourceKey, fieldPath, value, source, evalNode);
    }
  }
}

function registerFixtureField(
  graph: ProjectDepGraph,
  resourceKey: string,
  fieldPath: string,
  value: unknown,
  source: EvidenceSource,
  evalNode: any,
): void {
  const green = valueToGreenFixture(value);
  const red: Sourced<unknown> = { origin: "source", state: "known", value };

  graph.observations.registerObservation(
    resourceKey,
    fieldPath,
    source,
    green,
    red,
    evalNode,
  );
}

function valueToGreenFixture(value: unknown): GreenValue {
  if (value === null || value === undefined || typeof value === "string" ||
      typeof value === "number" || typeof value === "boolean") {
    return { kind: "literal", value: value as string | number | boolean | null | undefined };
  }
  if (Array.isArray(value)) {
    return { kind: "array", elements: value.map(valueToGreenFixture) };
  }
  if (typeof value === "object") {
    const props = new Map<string, GreenValue>();
    for (const [k, v] of Object.entries(value)) {
      props.set(k, valueToGreenFixture(v));
    }
    return { kind: "object", properties: props, methods: new Map() };
  }
  return { kind: "unknown", reasonKind: "unsupported-value" };
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

  // 6. absent fields: field was evaluated and found not specified.
  // Per T2005: absent is a successful evaluation result (value = undefined),
  // distinct from unknown (gap). The field MAY have an observation (with
  // value undefined) — that's correct. We check the extracted value.
  if (spec.absentFields) {
    for (const fieldPath of spec.absentFields) {
      const actual = pullValue(graph, resourceKey, fieldPath);
      if (actual !== undefined) {
        throw new Error(
          `Field '${fieldPath}' should be ABSENT for ${resourceKey} ` +
          `but has value: ${JSON.stringify(actual)}`
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

// =============================================================================
// Cross-File Edge Assertions (Tier 2+)
// =============================================================================

/**
 * Assert that a cross-file evaluation edge exists: the interpreter
 * evaluated a file as a dependency of another file's evaluation.
 *
 * Checks for evaluation nodes (`eval:`) for units in the dependency file.
 * This proves the interpreter actually followed the import — not just
 * that the file was processed independently by interpretProject.
 */
export function assertEvaluationEdge(
  result: InterpreterResult,
  depFilePath: string,
  unitKey: string,
): void {
  const evalId = `eval:${depFilePath}#${unitKey}`;
  if (!result.graph.hasNode(evalId as any)) {
    throw new Error(
      `No evaluation node for ${depFilePath}#${unitKey}. ` +
      `The interpreter did not evaluate this unit. ` +
      `Graph has ${result.graph.nodeCount} nodes.`
    );
  }
}

/**
 * Assert that observation nodes exist for a specific resource.
 * Returns the list of field paths that have observations.
 */
export function observedFieldsFor(
  result: InterpreterResult,
  resourceKey: string,
): string[] {
  const prefix = `conclusion:${resourceKey}:`;
  const conclusionIds = result.graph.nodesByPrefix(prefix);
  const fields: string[] = [];
  for (const id of conclusionIds) {
    const fieldPath = id.slice(prefix.length);
    // Only include fields that have actual values (not just identity)
    if (fieldPath !== "name" && fieldPath !== "className" && fieldPath !== "kind") {
      const val = pullRed(result.graph, resourceKey, fieldPath);
      if (val !== undefined) {
        fields.push(fieldPath);
      }
    }
  }
  return fields.sort();
}

/**
 * Assert that a resource has ONLY the specified observed fields
 * (beyond identity: name, className, kind). Any unexpected field
 * is a test failure.
 */
export function assertExactFields(
  result: InterpreterResult,
  resourceKey: string,
  expectedFields: string[],
): void {
  const actual = observedFieldsFor(result, resourceKey);
  const expected = [...expectedFields].sort();

  const unexpected = actual.filter(f => !expected.includes(f));
  const missing = expected.filter(f => !actual.includes(f));

  if (unexpected.length > 0 || missing.length > 0) {
    const parts: string[] = [];
    if (unexpected.length > 0) parts.push(`unexpected: [${unexpected.join(", ")}]`);
    if (missing.length > 0) parts.push(`missing: [${missing.join(", ")}]`);
    throw new Error(
      `Field set mismatch for ${resourceKey}: ${parts.join("; ")}. ` +
      `Actual fields: [${actual.join(", ")}]`
    );
  }
}
