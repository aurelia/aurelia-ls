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

  export interface IRegistry {
    register(container: any): void;
  }

  /** Aurelia application builder — default export */
  class Aurelia {
    register(...registrations: any[]): this;
    app(config: any): this;
    start(): void;
  }
  export default Aurelia;
}

declare module '@aurelia/i18n' {
  export const I18nConfiguration: {
    customize(cb: (options: any) => void): any;
    register(container: any): void;
  };
}

declare module '@aurelia/router' {
  export const RouterConfiguration: {
    register(container: any): void;
  };
}

declare module '@aurelia/state' {
  export const StateDefaultConfiguration: {
    init(state: any, ...reducers: any[]): any;
    register(container: any): void;
  };
}

declare module '@aurelia/state' {
  export const StateDefaultConfiguration: {
    init(state: any, handler: any): any;
    register(container: any): void;
  };
}

declare module '@aurelia/compat-v1' {
  export const delegateSyntax: {
    register(container: any): void;
  };
  export const callSyntax: {
    register(container: any): void;
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

// =============================================================================
// Scope-Visibility Assertions (Tier 4+)
// =============================================================================

import {
  evaluateScopeVisibility,
  type ScopeVisibilityGreen,
} from "../../out/project-semantics/deps/scope-visibility.js";

export interface ScopeVisibilityResult {
  /** Per-scope visibility data, keyed by CE name */
  scopes: Map<string, ScopeVisibilityGreen>;
}

/**
 * Run scope-visibility evaluation on an InterpreterResult.
 * Returns the visibility data for all CE scopes.
 */
export function evaluateVisibility(
  result: InterpreterResult,
): ScopeVisibilityResult {
  const raw = evaluateScopeVisibility(result.graph);
  const scopes = new Map<string, ScopeVisibilityGreen>();
  for (const [name, data] of raw) {
    scopes.set(name, data.green);
  }
  return { scopes };
}

/**
 * Assert that a resource is visible in a CE's template scope.
 *
 * @param vis - Scope-visibility result from evaluateVisibility
 * @param resourceName - The resource name to check (e.g., 'shared-nav')
 * @param scopeOwner - The CE whose template scope to check (e.g., 'app')
 * @param level - Expected lookup level: 'local' or 'root'
 */
export function assertVisible(
  vis: ScopeVisibilityResult,
  resourceName: string,
  scopeOwner: string,
  level: 'local' | 'root',
): void {
  const scope = vis.scopes.get(scopeOwner);
  if (!scope) {
    throw new Error(
      `No scope found for '${scopeOwner}'. ` +
      `Available scopes: [${[...vis.scopes.keys()].join(', ')}]`
    );
  }

  const entry = scope.visible.get(resourceName);
  if (!entry) {
    throw new Error(
      `Resource '${resourceName}' is NOT visible in '${scopeOwner}' scope. ` +
      `Visible resources: [${[...scope.visible.keys()].join(', ')}]`
    );
  }

  if (entry.lookupLevel !== level) {
    throw new Error(
      `Resource '${resourceName}' IS visible in '${scopeOwner}' scope but ` +
      `via ${entry.lookupLevel} lookup, expected ${level}`
    );
  }
}

/**
 * Assert that a resource is NOT visible in a CE's template scope.
 */
export function assertNotVisible(
  vis: ScopeVisibilityResult,
  resourceName: string,
  scopeOwner: string,
): void {
  const scope = vis.scopes.get(scopeOwner);
  if (!scope) {
    throw new Error(
      `No scope found for '${scopeOwner}'. ` +
      `Available scopes: [${[...vis.scopes.keys()].join(', ')}]`
    );
  }

  const entry = scope.visible.get(resourceName);
  if (entry) {
    throw new Error(
      `Resource '${resourceName}' SHOULD NOT be visible in '${scopeOwner}' ` +
      `scope but found via ${entry.lookupLevel} lookup`
    );
  }
}

/**
 * Assert that a scope is complete (all registration paths analyzed).
 */
export function assertComplete(
  vis: ScopeVisibilityResult,
  scopeOwner: string,
): void {
  const scope = vis.scopes.get(scopeOwner);
  if (!scope) {
    throw new Error(
      `No scope found for '${scopeOwner}'. ` +
      `Available scopes: [${[...vis.scopes.keys()].join(', ')}]`
    );
  }

  if (scope.completeness.state !== 'complete') {
    throw new Error(
      `Scope '${scopeOwner}' should be COMPLETE but has gaps: ` +
      JSON.stringify(scope.completeness.gaps)
    );
  }
}

/**
 * Assert that a scope is NOT complete (has registration gaps).
 */
export function assertNotComplete(
  vis: ScopeVisibilityResult,
  scopeOwner: string,
): void {
  const scope = vis.scopes.get(scopeOwner);
  if (!scope) {
    throw new Error(
      `No scope found for '${scopeOwner}'. ` +
      `Available scopes: [${[...vis.scopes.keys()].join(', ')}]`
    );
  }

  if (scope.completeness.state !== 'incomplete') {
    throw new Error(
      `Scope '${scopeOwner}' should be INCOMPLETE but is marked complete`
    );
  }
}

/**
 * Assert that a scope has a registration gap with specific properties.
 */
export function assertRegistrationGap(
  vis: ScopeVisibilityResult,
  scopeOwner: string,
  match: { site?: string; reason?: string },
): void {
  const scope = vis.scopes.get(scopeOwner);
  if (!scope) {
    throw new Error(
      `No scope found for '${scopeOwner}'. ` +
      `Available scopes: [${[...vis.scopes.keys()].join(', ')}]`
    );
  }

  if (scope.completeness.state !== 'incomplete') {
    throw new Error(
      `Scope '${scopeOwner}' has no gaps (is complete). ` +
      `Expected a gap matching ${JSON.stringify(match)}`
    );
  }

  const found = scope.completeness.gaps.some(g =>
    (!match.site || g.site.includes(match.site)) &&
    (!match.reason || g.reason.includes(match.reason))
  );

  if (!found) {
    throw new Error(
      `No gap matching ${JSON.stringify(match)} found in '${scopeOwner}' scope. ` +
      `Gaps: ${JSON.stringify(scope.completeness.gaps)}`
    );
  }
}

// =============================================================================
// Vocabulary Assertions (Tier 5)
// =============================================================================

import {
  evaluateVocabulary,
  type VocabularyGreen,
  type BindingCommandEntry,
  type AttributePatternEntry,
} from "../../out/project-semantics/deps/vocabulary.js";

export interface VocabularyResult {
  green: VocabularyGreen;
}

/**
 * Evaluate the vocabulary registry for a project.
 *
 * Builds the frozen vocabulary from core builtins, detected plugins,
 * and root registration analysis.
 */
export function evaluateProjectVocabulary(
  result: InterpreterResult,
): VocabularyResult {
  // Pull root registration data for plugin detection
  const rootRegs = pullValue(result.graph, "root-registrations", "registrations");
  const rootGaps = pullValue(result.graph, "root-registrations", "gaps");

  const refs = Array.isArray(rootRegs) ? rootRegs.filter((r): r is string => typeof r === 'string') : [];
  const gaps = Array.isArray(rootGaps) ? rootGaps.filter((g): g is string => typeof g === 'string') : [];

  const { green } = evaluateVocabulary(refs, gaps);
  return { green };
}

/**
 * Assert that a binding command is in the vocabulary with expected behavioral fields.
 */
export function assertInVocabulary(
  vocab: VocabularyResult,
  name: string,
  expected?: Partial<Pick<BindingCommandEntry, 'ignoreAttr' | 'outputInstruction' | 'expressionEntry'>>,
): void {
  const cmd = vocab.green.commands.get(name);
  if (!cmd) {
    throw new Error(
      `Binding command '${name}' is NOT in the vocabulary. ` +
      `Known commands: [${[...vocab.green.commands.keys()].join(', ')}]`
    );
  }

  if (expected) {
    if (expected.ignoreAttr !== undefined && cmd.ignoreAttr !== expected.ignoreAttr) {
      throw new Error(
        `BC '${name}': ignoreAttr expected ${expected.ignoreAttr}, got ${cmd.ignoreAttr}`
      );
    }
    if (expected.outputInstruction !== undefined && cmd.outputInstruction !== expected.outputInstruction) {
      throw new Error(
        `BC '${name}': outputInstruction expected '${expected.outputInstruction}', got '${cmd.outputInstruction}'`
      );
    }
    if (expected.expressionEntry !== undefined && cmd.expressionEntry !== expected.expressionEntry) {
      throw new Error(
        `BC '${name}': expressionEntry expected '${expected.expressionEntry}', got '${cmd.expressionEntry}'`
      );
    }
  }
}

/**
 * Assert that an attribute pattern is in the vocabulary.
 */
export function assertPatternInVocabulary(
  vocab: VocabularyResult,
  className: string,
  expectedPatterns?: readonly string[],
): void {
  const found = vocab.green.patterns.find(p => p.className === className);
  if (!found) {
    throw new Error(
      `Attribute pattern '${className}' is NOT in the vocabulary. ` +
      `Known patterns: [${vocab.green.patterns.map(p => p.className).join(', ')}]`
    );
  }

  if (expectedPatterns) {
    const actualPatterns = [...found.patterns].sort();
    const expected = [...expectedPatterns].sort();
    if (JSON.stringify(actualPatterns) !== JSON.stringify(expected)) {
      throw new Error(
        `AP '${className}': patterns expected [${expected.join(', ')}], got [${actualPatterns.join(', ')}]`
      );
    }
  }
}

/**
 * Assert that the vocabulary is complete.
 */
export function assertVocabularyComplete(vocab: VocabularyResult): void {
  if (vocab.green.completeness.state !== 'complete') {
    throw new Error(
      `Vocabulary should be COMPLETE but has gaps: ` +
      JSON.stringify(vocab.green.completeness.gaps)
    );
  }
}

/**
 * Assert that the vocabulary is NOT complete (has gaps).
 */
export function assertVocabularyNotComplete(vocab: VocabularyResult): void {
  if (vocab.green.completeness.state !== 'incomplete') {
    throw new Error(
      `Vocabulary should be INCOMPLETE but is marked complete`
    );
  }
}

/**
 * Assert that the vocabulary has a gap matching the given criteria.
 */
export function assertVocabularyGap(
  vocab: VocabularyResult,
  match: { site?: string; reason?: string },
): void {
  if (vocab.green.completeness.state !== 'incomplete') {
    throw new Error(
      `Vocabulary has no gaps (is complete). Expected a gap matching ${JSON.stringify(match)}`
    );
  }

  const found = vocab.green.completeness.gaps.some(g =>
    (!match.site || g.site.includes(match.site)) &&
    (!match.reason || g.reason.includes(match.reason))
  );

  if (!found) {
    throw new Error(
      `No vocabulary gap matching ${JSON.stringify(match)}. ` +
      `Gaps: ${JSON.stringify(vocab.green.completeness.gaps)}`
    );
  }
}

// =============================================================================
// Template Analysis Assertions (Tier 6)
// =============================================================================

import {
  evaluateTemplateAnalysis,
  type TemplateAnalysisResult,
  type ElementAnalysis,
  type AttributeAnalysis,
  type Classification,
  type ClassificationCategory,
  type ElementResolution,
  type BindingInfo,
  type BindingMode,
  type ScopeEntry,
  type ScopeChainSnapshot,
  type TcInfo,
} from "../../out/project-semantics/deps/template-analysis.js";

export type { TemplateAnalysisResult, ElementAnalysis, AttributeAnalysis, Classification, ClassificationCategory, ElementResolution, BindingInfo, BindingMode, ScopeEntry, ScopeChainSnapshot, TcInfo };

/**
 * Run template analysis for a CE's inline template.
 *
 * Evaluates scope-visibility and vocabulary, then runs the 8-step
 * classification on the CE's template content.
 */
export function analyzeTemplate(
  result: InterpreterResult,
  ceName: string,
): TemplateAnalysisResult {
  // Pull the CE's template content from conclusions
  // The interpreter stores it as 'inlineTemplate' (from extract-fields.ts)
  const resourceKey = `custom-element:${ceName}`;
  const templateContent = pullValue(result.graph, resourceKey, 'inlineTemplate');

  if (typeof templateContent !== 'string') {
    throw new Error(
      `No template content found for CE '${ceName}'. ` +
      `Got: ${JSON.stringify(templateContent)}`
    );
  }

  // Evaluate upstream tiers
  const vis = evaluateVisibility(result);
  const vocab = evaluateProjectVocabulary(result);

  const scopeGreen = vis.scopes.get(ceName);
  if (!scopeGreen) {
    throw new Error(
      `No scope-visibility found for CE '${ceName}'. ` +
      `Available scopes: [${[...vis.scopes.keys()].join(', ')}]`
    );
  }

  return evaluateTemplateAnalysis(
    templateContent,
    ceName,
    vocab.green,
    scopeGreen,
    result.graph,
  );
}

/**
 * Find an element analysis by tag name.
 * Returns the first match in depth-first order.
 */
export function findElement(
  analysis: TemplateAnalysisResult,
  tagName: string,
): ElementAnalysis {
  const el = analysis.elements.find(e => e.tagName.toLowerCase() === tagName.toLowerCase());
  if (!el) {
    throw new Error(
      `No element '${tagName}' found in template analysis. ` +
      `Elements: [${analysis.elements.map(e => e.tagName).join(', ')}]`
    );
  }
  return el;
}

/**
 * Find all elements with a given tag name.
 */
export function findElements(
  analysis: TemplateAnalysisResult,
  tagName: string,
): ElementAnalysis[] {
  return analysis.elements.filter(e => e.tagName.toLowerCase() === tagName.toLowerCase());
}

/**
 * Find an attribute analysis by raw attribute name on an element.
 */
export function findAttr(
  el: ElementAnalysis,
  attrName: string,
): AttributeAnalysis {
  const attr = el.attributes.find(a => a.rawName === attrName);
  if (!attr) {
    throw new Error(
      `No attribute '${attrName}' found on <${el.tagName}>. ` +
      `Attributes: [${el.attributes.map(a => a.rawName).join(', ')}]`
    );
  }
  return attr;
}

/**
 * Find an attribute by its AP-parsed target (not raw name).
 * Useful when the raw name includes binding syntax (e.g., 'value.bind').
 */
export function findAttrByTarget(
  el: ElementAnalysis,
  target: string,
): AttributeAnalysis {
  const attr = el.attributes.find(a =>
    a.syntax ? a.syntax.target === target : a.rawName === target
  );
  if (!attr) {
    throw new Error(
      `No attribute with target '${target}' found on <${el.tagName}>. ` +
      `Attributes: [${el.attributes.map(a => a.syntax ? `${a.rawName}→${a.syntax.target}` : a.rawName).join(', ')}]`
    );
  }
  return attr;
}

/**
 * Assert an attribute is classified at a specific step and category.
 */
export function assertClassified(
  attr: AttributeAnalysis,
  step: number,
  category: ClassificationCategory,
): void {
  if (attr.classification.step !== step) {
    throw new Error(
      `Attribute '${attr.rawName}': expected step ${step}, ` +
      `got step ${attr.classification.step} (${attr.classification.category})`
    );
  }
  if (attr.classification.category !== category) {
    throw new Error(
      `Attribute '${attr.rawName}': expected category '${category}', ` +
      `got '${attr.classification.category}' at step ${attr.classification.step}`
    );
  }
}

/**
 * Assert an element resolved as a custom element.
 */
export function assertResolvedCe(
  el: ElementAnalysis,
  expectedResourceKey?: string,
): void {
  if (el.resolution.kind !== 'custom-element') {
    throw new Error(
      `<${el.tagName}> expected to resolve as CE, ` +
      `got '${el.resolution.kind}'`
    );
  }
  if (expectedResourceKey && el.resolution.resourceKey !== expectedResourceKey) {
    throw new Error(
      `<${el.tagName}> resolved as CE but wrong key: ` +
      `expected '${expectedResourceKey}', got '${el.resolution.resourceKey}'`
    );
  }
}

/**
 * Assert an element resolved as plain HTML (not a CE, not unknown).
 */
export function assertPlainHtml(el: ElementAnalysis): void {
  if (el.resolution.kind !== 'plain-html') {
    throw new Error(
      `<${el.tagName}> expected to be plain HTML, ` +
      `got '${el.resolution.kind}'`
    );
  }
}

/**
 * Assert an element was not found in the resource catalog.
 */
export function assertElementNotFound(
  el: ElementAnalysis,
  expectGrounded: boolean,
): void {
  if (el.resolution.kind !== 'not-found') {
    throw new Error(
      `<${el.tagName}> expected to be 'not-found', ` +
      `got '${el.resolution.kind}'`
    );
  }
  if (el.resolution.grounded !== expectGrounded) {
    throw new Error(
      `<${el.tagName}> not-found grounded: expected ${expectGrounded}, ` +
      `got ${el.resolution.grounded}`
    );
  }
}

/**
 * Assert binding info on an attribute.
 */
export function assertBinding(
  attr: AttributeAnalysis,
  expected: {
    instructionType?: string;
    mode?: BindingMode | null;
    targetProperty?: string | null;
    expressionEntry?: string | null;
  },
): void {
  if (!attr.binding) {
    throw new Error(
      `Attribute '${attr.rawName}' has no binding info (expected binding)`
    );
  }
  if (expected.instructionType !== undefined && attr.binding.instructionType !== expected.instructionType) {
    throw new Error(
      `Attribute '${attr.rawName}': instructionType expected '${expected.instructionType}', ` +
      `got '${attr.binding.instructionType}'`
    );
  }
  if (expected.mode !== undefined && attr.binding.mode !== expected.mode) {
    throw new Error(
      `Attribute '${attr.rawName}': mode expected '${expected.mode}', ` +
      `got '${attr.binding.mode}'`
    );
  }
  if (expected.targetProperty !== undefined && attr.binding.targetProperty !== expected.targetProperty) {
    throw new Error(
      `Attribute '${attr.rawName}': targetProperty expected '${expected.targetProperty}', ` +
      `got '${attr.binding.targetProperty}'`
    );
  }
  if (expected.expressionEntry !== undefined && attr.binding.expressionEntry !== expected.expressionEntry) {
    throw new Error(
      `Attribute '${attr.rawName}': expressionEntry expected '${expected.expressionEntry}', ` +
      `got '${attr.binding.expressionEntry}'`
    );
  }
}

/**
 * Assert that an attribute has NO binding info (truly plain, sub-path 8a).
 */
export function assertNoBinding(attr: AttributeAnalysis): void {
  if (attr.binding !== null) {
    throw new Error(
      `Attribute '${attr.rawName}' should have NO binding but has: ` +
      `${attr.binding.instructionType}`
    );
  }
}

/**
 * Assert that an element has no Aurelia-specific instructions
 * (no HydrateElement, no binding, no HydrateAttribute). Rung 4.
 */
export function assertNotApplicable(el: ElementAnalysis): void {
  // Element should be plain HTML
  if (el.resolution.kind === 'custom-element') {
    throw new Error(
      `<${el.tagName}> should be not-applicable but resolved as CE: ${el.resolution.resourceKey}`
    );
  }

  // All attributes should be plain with no binding
  for (const attr of el.attributes) {
    if (attr.classification.step !== 8 || attr.classification.category !== 'plain-attribute') {
      throw new Error(
        `<${el.tagName}> attr '${attr.rawName}' should be plain (step 8) but is ` +
        `${attr.classification.category} at step ${attr.classification.step}`
      );
    }
  }
}

/**
 * Pull a combined bindable map from per-field conclusion nodes.
 * Bindables are stored as individual fields (bindable:name:property,
 * bindable:name:mode), not as a single 'bindables' conclusion.
 * This helper reconstructs the combined view for test assertions.
 */
export function pullBindables(
  graph: ProjectDepGraph,
  resourceKey: string,
): Record<string, { property: string; mode?: string }> | undefined {
  const prefix = `conclusion:${resourceKey}::bindable:`;
  const nodes = graph.nodesByPrefix(prefix);
  const names = new Set<string>();

  for (const nodeId of nodes) {
    const afterPrefix = nodeId.slice(prefix.length);
    const colonIdx = afterPrefix.indexOf(':');
    if (colonIdx > 0) {
      names.add(afterPrefix.slice(0, colonIdx));
    }
  }

  if (names.size === 0) return undefined;

  const result: Record<string, { property: string; mode?: string }> = {};
  for (const name of names) {
    const property = pullValue(graph, resourceKey, `bindable:${name}:property`);
    const mode = pullValue(graph, resourceKey, `bindable:${name}:mode`);
    result[name] = {
      property: typeof property === 'string' ? property : name,
      ...(mode !== undefined ? { mode: String(mode) } : {}),
    };
  }
  return result;
}

// =============================================================================
// Scope Chain Assertions (Tier 6D)
// =============================================================================

/**
 * Assert the scope chain at an element has a CE boundary.
 */
export function assertCeBoundary(
  el: ElementAnalysis,
  ceName: string,
): void {
  const boundary = el.scopeChain.find(s => s.kind === 'ce-boundary');
  if (!boundary) {
    throw new Error(
      `<${el.tagName}> scope chain has no CE boundary. ` +
      `Chain: [${el.scopeChain.map(s => s.kind).join(' → ')}]`
    );
  }
  if (boundary.kind === 'ce-boundary' && boundary.ceName !== ceName) {
    throw new Error(
      `<${el.tagName}> CE boundary is '${boundary.ceName}', expected '${ceName}'`
    );
  }
}

/**
 * Assert that the scope chain contains a repeat scope entry with
 * the expected iterator variable.
 */
export function assertRepeatScope(
  el: ElementAnalysis,
  iteratorVar: string,
): void {
  const repeat = el.scopeChain.find(s => s.kind === 'repeat');
  if (!repeat) {
    throw new Error(
      `<${el.tagName}> scope chain has no repeat entry. ` +
      `Chain: [${el.scopeChain.map(s => s.kind).join(' → ')}]`
    );
  }
  if (repeat.kind === 'repeat' && repeat.iteratorVar !== iteratorVar) {
    throw new Error(
      `<${el.tagName}> repeat iteratorVar is '${repeat.iteratorVar}', expected '${iteratorVar}'`
    );
  }
}

/**
 * Assert the scope chain has the expected structure (list of kinds).
 */
export function assertScopeChain(
  el: ElementAnalysis,
  expected: readonly string[],
): void {
  const actual = el.scopeChain.map(s => s.kind);
  if (actual.length !== expected.length || !actual.every((k, i) => k === expected[i])) {
    throw new Error(
      `<${el.tagName}> scope chain mismatch.\n` +
      `  Expected: [${expected.join(' → ')}]\n` +
      `  Actual:   [${actual.join(' → ')}]`
    );
  }
}

/**
 * Assert that no scope entry in the chain has isBoundary: true
 * (except possibly the CE boundary at the end).
 */
export function assertNoBoundaryExceptCe(el: ElementAnalysis): void {
  for (const entry of el.scopeChain) {
    if (entry.isBoundary && entry.kind !== 'ce-boundary') {
      throw new Error(
        `<${el.tagName}> has a non-CE boundary scope entry: ${entry.kind}`
      );
    }
  }
}

/**
 * Assert that TC attributes on an element are in the expected wrapping order.
 */
export function assertTcOrder(
  el: ElementAnalysis,
  expectedOrder: readonly string[],
): void {
  const actual = el.tcAttributes.map(tc => tc.name);
  if (actual.length !== expectedOrder.length || !actual.every((n, i) => n === expectedOrder[i])) {
    throw new Error(
      `<${el.tagName}> TC order mismatch.\n` +
      `  Expected: [${expectedOrder.join(', ')}]\n` +
      `  Actual:   [${actual.join(', ')}]`
    );
  }
}
