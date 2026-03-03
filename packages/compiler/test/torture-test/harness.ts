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
import { createProjectDepGraph } from "../../out/core/graph/graph.js";
import {
  conclusionNodeId,
  manifestNodeId,
  configNodeId,
  type ProjectDepGraph,
  type ProjectDepNodeId,
  type ObservationEntry,
  type ConvergenceFunction,
  type EvidenceSource,
  type UnitEvaluator,
} from "../../out/core/graph/types.js";
import {
  interpretProject,
  createUnitEvaluator,
} from "../../out/core/interpret/interpreter.js";
import { createConvergence } from "../../out/core/convergence/convergence.js";
import type { GreenValue } from "../../out/value/green.js";
import type { Sourced } from "../../out/value/sourced.js";

// New architecture imports (for analyzeTemplate)
import {
  lowerTemplate,
  type TemplateSemantics,
  type LoweringInput,
} from "../../out/core/template/semantic-analysis.js";
import {
  buildCatalog,
  scopedCatalog,
} from "../../out/core/resource/catalog.js";
import {
  BUILTIN_RESOURCES,
  BUILTIN_VOCABULARY,
} from "../../out/core/resource/builtins.js";
import type {
  FieldValue,
  ResourceGreen,
  CustomElementGreen,
  CustomAttributeGreen,
  TemplateControllerGreen,
  ValueConverterGreen,
  BindingBehaviorGreen,
  BindableGreen,
  ResourceCatalogGreen,
  VocabularyGreen as NewVocabularyGreen,
  BindingCommandGreen,
  AttributePatternGreen,
  ScopeCompleteness as NewScopeCompleteness,
  ResourceKind as NewResourceKind,
  CaptureValue,
  ProcessContentValue,
  DependencyRef,
  WatchDefinition,
  ShadowOptions,
} from "../../out/core/resource/types.js";
import type { BindingMode } from "../../out/model/ir.js";

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
} from "../../out/core/scope/scope-visibility.js";

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
} from "../../out/core/vocabulary/vocabulary.js";

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
// Template Analysis (Tier 6)

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
// Tier 7: Incremental Evaluation Infrastructure
// =============================================================================

import type {
  GraphEvent,
  GraphEventListener,
} from "../../out/core/graph/types.js";

export type { GraphEvent };

/**
 * A structured trace of one edit cycle: file change → staleness
 * propagation → re-evaluation → cutoff/change detection.
 *
 * The trace captures graph events as a structured log. It is the
 * foundation for tier 7 assertions AND production-grade incremental
 * debugging. Designed to scale to 1000+ node graphs without changing
 * the API.
 *
 * Events are partitioned by type for O(1) query by the assertion
 * helpers. The raw event stream is preserved for debugging.
 */
export class EditCycleTrace implements GraphEventListener {
  /** All events in emission order. */
  readonly events: GraphEvent[] = [];

  // ── Partitioned indexes (built lazily from events) ──────────────────

  private _staleNodes?: Set<string>;
  private _evaluatedNodes?: Set<string>;
  private _cutoffNodes?: Set<string>;
  private _changedNodes?: Set<string>;
  private _refreshedObs?: Set<string>;

  onEvent(event: GraphEvent): void {
    this.events.push(event);
    // Invalidate lazy indexes
    this._staleNodes = undefined;
    this._evaluatedNodes = undefined;
    this._cutoffNodes = undefined;
    this._changedNodes = undefined;
    this._refreshedObs = undefined;
  }

  /** Nodes that received staleness propagation. */
  get staleNodes(): ReadonlySet<string> {
    if (!this._staleNodes) {
      this._staleNodes = new Set(
        this.events
          .filter(e => e.type === 'staleness-propagated')
          .map(e => (e as any).nodeId)
      );
    }
    return this._staleNodes;
  }

  /** Evaluation nodes whose callback was actually invoked. */
  get evaluatedNodes(): ReadonlySet<string> {
    if (!this._evaluatedNodes) {
      this._evaluatedNodes = new Set(
        this.events
          .filter(e => e.type === 'evaluation-invoked')
          .map(e => (e as any).nodeId)
      );
    }
    return this._evaluatedNodes;
  }

  /** Conclusion nodes where cutoff fired (re-converged, same green). */
  get cutoffNodes(): ReadonlySet<string> {
    if (!this._cutoffNodes) {
      this._cutoffNodes = new Set(
        this.events
          .filter(e => e.type === 'cutoff-fired')
          .map(e => (e as any).conclusionId)
      );
    }
    return this._cutoffNodes;
  }

  /** Conclusion nodes where convergence produced a different green. */
  get changedNodes(): ReadonlySet<string> {
    if (!this._changedNodes) {
      this._changedNodes = new Set(
        this.events
          .filter(e => e.type === 'conclusion-changed')
          .map(e => (e as any).conclusionId)
      );
    }
    return this._changedNodes;
  }

  /** Observation nodes that were refreshed (source re-evaluated). */
  get refreshedObservations(): ReadonlySet<string> {
    if (!this._refreshedObs) {
      this._refreshedObs = new Set(
        this.events
          .filter(e => e.type === 'observation-refreshed')
          .map(e => (e as any).observationId)
      );
    }
    return this._refreshedObs;
  }

  /** Clear all recorded events (for multi-edit-cycle tests). */
  clear(): void {
    this.events.length = 0;
    this._staleNodes = undefined;
    this._evaluatedNodes = undefined;
    this._cutoffNodes = undefined;
    this._changedNodes = undefined;
    this._refreshedObs = undefined;
  }
}

/**
 * A mutable interpreter session that supports file edits and
 * incremental re-evaluation. This is the tier 7 test harness.
 *
 * Usage:
 *   const session = createMutableSession(files);
 *   // Initial state assertions (tiers 1-6)
 *   const trace = session.editFile('/src/counter.ts', newContent);
 *   // Post-edit assertions using trace
 *   assertCutoff(trace, 'conclusion:custom-element:counter::name');
 */
export interface MutableSession {
  /** The interpreter result (graph, program, evidence). Mutable. */
  readonly result: InterpreterResult;

  /**
   * Edit a file and perform incremental re-evaluation.
   *
   * 1. Updates the in-memory file content
   * 2. Creates a new TS program with the updated file
   * 3. Marks the file as stale in the graph
   * 4. Returns a trace of the edit cycle
   *
   * The trace records graph events ONLY for this edit cycle.
   * Pull conclusions after editFile() to trigger lazy re-evaluation.
   */
  editFile(path: string, newContent: string): EditCycleTrace;

  /**
   * Pull a conclusion and trigger any pending re-evaluation.
   * Events are recorded on the most recent edit's trace.
   */
  pull(resourceKey: string, fieldPath: string): unknown;

  /** The trace from the most recent editFile() call. */
  readonly currentTrace: EditCycleTrace;
}

/**
 * A stable event listener that delegates to the current EditCycleTrace.
 * The graph captures this at construction time — it never changes.
 * The `target` is swapped per edit cycle.
 */
class TraceProxy implements GraphEventListener {
  target: EditCycleTrace;
  constructor(initial: EditCycleTrace) { this.target = initial; }
  onEvent(event: GraphEvent): void { this.target.onEvent(event); }
}

/**
 * Create a mutable interpreter session for tier 7 tests.
 *
 * The session wraps the interpreter with a mutable file store and
 * a properly-wired unit evaluator. When a file is edited, the graph's
 * staleness propagation and lazy re-evaluation work correctly because
 * the unit evaluator captures a mutable reference to the current
 * TS program.
 */
export function createMutableSession(
  files: Record<string, string>,
  options?: { enableConventions?: boolean },
): MutableSession {
  const evidence: EvidenceMap = new Map();
  const normalizeP = (f: string) => f.replace(/\\/g, "/");

  // Mutable file store — editFile() updates this
  const fileStore = new Map(
    Object.entries(files).map(([k, v]) => [normalizeP(k), v])
  );

  // Mutable program reference — re-created on each edit
  let currentProgram = createFixtureProgram(Object.fromEntries(fileStore));

  // Stable trace proxy — the graph holds a reference to this.
  // We swap the target per edit cycle.
  let currentTrace = new EditCycleTrace();
  const proxy = new TraceProxy(currentTrace);

  // Build the interpreter config (mutable — reads currentProgram)
  function buildConfig() {
    return {
      program: currentProgram,
      graph,
      packagePath: "/",
      enableConventions: options?.enableConventions ?? true,
      readFile: (path: string) => fileStore.get(normalizeP(path)),
    };
  }

  // The unit evaluator captures the mutable config reference.
  // When the graph needs to re-evaluate a stale unit, it calls
  // createUnitEvaluator with the CURRENT program (post-edit).
  // We use a trampoline that always reads the current config.
  const unitEvaluator: UnitEvaluator = (file, unitKey) => {
    const liveEval = createUnitEvaluator(buildConfig());
    liveEval(file, unitKey);
  };

  const graph = createProjectDepGraph(
    unitEvaluator,
    createTrackingConvergence(evidence),
    proxy,
  );

  // Initial full evaluation
  const config = buildConfig();
  const sourceFiles = [...fileStore.keys()]
    .filter(f => f.endsWith('.ts'))
    .map(f => f as NormalizedPath);
  interpretProject(sourceFiles, config);

  // Pull all conclusions to populate concludedGreen values.
  // This ensures value-sensitive cutoff works on the first edit cycle.
  // Without this, oldGreen would be undefined (never converged) and
  // cutoff comparison would always fail, reporting "changed" for
  // structurally identical values.
  const allConclusions = graph.nodesByKind('conclusion');
  for (const concId of allConclusions) {
    graph.evaluation.pull(concId);
  }

  // Clear initial evaluation events — tier 7 only cares about edits
  currentTrace.clear();

  const result: InterpreterResult = { graph, program: currentProgram, evidence };

  return {
    result,
    get currentTrace() { return currentTrace; },

    editFile(path: string, newContent: string): EditCycleTrace {
      const normalizedPath = normalizeP(path);
      const isNewFile = !fileStore.has(normalizedPath);

      // 1. Update file store
      fileStore.set(normalizedPath, newContent);

      // 2. Create new TS program with updated files
      currentProgram = createFixtureProgram(Object.fromEntries(fileStore));
      (result as any).program = currentProgram;

      // 3. Fresh trace for this edit cycle
      currentTrace = new EditCycleTrace();
      proxy.target = currentTrace;

      // Mark edited file stale (propagates through dependency edges)
      if (!isNewFile) {
        graph.invalidation.markFileStale(normalizedPath as NormalizedPath);
      }

      // Re-interpret ALL .ts files with the updated program.
      // This handles: new files, new exports, import-graph changes,
      // root registration rescanning, and cross-file value propagation
      // (e.g., a constant change in file A propagating to file B's
      // resource name through the import). The graph's interning and
      // cutoff ensure that unchanged observations produce no downstream
      // work — re-interpreting a file whose output hasn't changed is
      // a no-op at the conclusion level.
      const config = buildConfig();
      const allTsFiles = [...fileStore.keys()]
        .filter(f => f.endsWith('.ts'))
        .map(f => f as NormalizedPath);
      interpretProject(allTsFiles, config);

      return currentTrace;
    },

    pull(resourceKey: string, fieldPath: string): unknown {
      return pullValue(graph, resourceKey, fieldPath);
    },
  };
}


// =============================================================================
// Tier 7 Assertion Helpers
// =============================================================================

/**
 * Assert that a conclusion node had cutoff fire (re-converged, same green).
 * The node was on the staleness path, was re-evaluated, but produced
 * the same structural content — downstream was NOT affected.
 */
export function assertCutoff(trace: EditCycleTrace, conclusionId: string): void {
  if (!trace.cutoffNodes.has(conclusionId)) {
    const wasChanged = trace.changedNodes.has(conclusionId);
    const wasStale = trace.staleNodes.has(conclusionId);
    throw new Error(
      `Expected cutoff at '${conclusionId}' but ` +
      (wasChanged ? 'conclusion CHANGED (no cutoff)' :
       wasStale ? 'node was stale but never re-converged (not pulled?)' :
       'node was never on the staleness path')
    );
  }
}

/**
 * Assert that a conclusion node changed (re-converged, different green).
 */
export function assertChanged(trace: EditCycleTrace, conclusionId: string): void {
  if (!trace.changedNodes.has(conclusionId)) {
    const wasCutoff = trace.cutoffNodes.has(conclusionId);
    throw new Error(
      `Expected conclusion change at '${conclusionId}' but ` +
      (wasCutoff ? 'cutoff fired (same green)' : 'node was never re-converged')
    );
  }
}

/**
 * Assert that a node was NOT on the staleness propagation path at all.
 * This is the strongest freshness assertion: the edit didn't touch
 * this node's dependency subgraph.
 */
export function assertFresh(trace: EditCycleTrace, nodeId: string): void {
  if (trace.staleNodes.has(nodeId)) {
    throw new Error(
      `Expected '${nodeId}' to be fresh but it received staleness propagation`
    );
  }
}

/**
 * Assert that a node WAS marked stale during propagation.
 */
export function assertStale(trace: EditCycleTrace, nodeId: string): void {
  if (!trace.staleNodes.has(nodeId)) {
    throw new Error(
      `Expected '${nodeId}' to be stale but it was never marked stale`
    );
  }
}

/**
 * Assert that an evaluation callback was invoked for a specific node.
 */
export function assertEvaluated(trace: EditCycleTrace, evalNodeId: string): void {
  if (!trace.evaluatedNodes.has(evalNodeId)) {
    throw new Error(
      `Expected evaluation of '${evalNodeId}' but callback was not invoked`
    );
  }
}

/**
 * Assert that an evaluation callback was NOT invoked for a specific node.
 */
export function assertNotEvaluated(trace: EditCycleTrace, evalNodeId: string): void {
  if (trace.evaluatedNodes.has(evalNodeId)) {
    throw new Error(
      `Expected '${evalNodeId}' to NOT be re-evaluated but callback was invoked`
    );
  }
}

/**
 * Full propagation scope assertion: specifies exactly which conclusion
 * nodes were affected (cutoff or changed) and which stayed fresh.
 */
export function assertPropagationScope(
  trace: EditCycleTrace,
  expected: {
    cutoff?: string[];
    changed?: string[];
    fresh?: string[];
  },
): void {
  for (const id of expected.cutoff ?? []) assertCutoff(trace, id);
  for (const id of expected.changed ?? []) assertChanged(trace, id);
  for (const id of expected.fresh ?? []) assertFresh(trace, id);
}

// =============================================================================
// Graph → ResourceCatalogGreen Bridge
// =============================================================================

/**
 * Project the reactive graph's per-field conclusion nodes into a
 * ResourceCatalogGreen that lowerTemplate() can consume.
 *
 * This is the bridge from the old architecture to the new one. It reads
 * conclusion nodes from the graph and assembles them into ResourceGreen types.
 *
 * Field path → FieldValue mapping:
 * - Sourced<T> absent (undefined) → { state: 'absent' }
 * - Sourced<T> { origin: 'source', state: 'unknown' } → { state: 'unknown', reasonKind }
 * - Sourced<T> { value } → { state: 'known', value }
 */
export function graphToResourceCatalog(
  graph: ProjectDepGraph,
): ResourceCatalogGreen {
  // Step 1: Find all resources by scanning conclusion nodes for 'kind' fields
  const resourceKeys = new Set<string>();
  const conclusionNodes = graph.nodesByPrefix('conclusion:');

  for (const nodeId of conclusionNodes) {
    // nodeId format: conclusion:{kind}:{name}::{fieldPath}
    const afterConclusion = nodeId.slice('conclusion:'.length);
    const separatorIdx = afterConclusion.indexOf('::');
    if (separatorIdx > 0) {
      resourceKeys.add(afterConclusion.slice(0, separatorIdx));
    }
  }

  // Step 2: For each resource, assemble a ResourceGreen
  const resources: ResourceGreen[] = [];

  for (const resourceKey of resourceKeys) {
    // Skip non-resource keys (root-registrations, etc.)
    if (!resourceKey.includes(':')) continue;

    const colonIdx = resourceKey.indexOf(':');
    const kindStr = resourceKey.slice(0, colonIdx);
    const name = resourceKey.slice(colonIdx + 1);

    // Only process the 5 resource kinds
    if (!isResourceKind(kindStr)) continue;

    const green = assembleResourceGreen(graph, resourceKey, kindStr as NewResourceKind, name);
    if (green) resources.push(green);
  }

  // Step 3: Merge with builtins (builtins are the floor)
  const builtinCatalog = buildCatalog(BUILTIN_RESOURCES);
  const sourceCatalog = buildCatalog(resources);

  // Source analysis overrides builtins for the same name
  return {
    elements: { ...builtinCatalog.elements, ...sourceCatalog.elements },
    attributes: { ...builtinCatalog.attributes, ...sourceCatalog.attributes },
    controllers: { ...builtinCatalog.controllers, ...sourceCatalog.controllers },
    valueConverters: { ...builtinCatalog.valueConverters, ...sourceCatalog.valueConverters },
    bindingBehaviors: { ...builtinCatalog.bindingBehaviors, ...sourceCatalog.bindingBehaviors },
  };
}

function isResourceKind(s: string): s is NewResourceKind {
  return s === 'custom-element' || s === 'custom-attribute' ||
    s === 'template-controller' || s === 'value-converter' ||
    s === 'binding-behavior';
}

/**
 * Read a field from graph conclusions and convert to FieldValue<T>.
 */
function readField<T>(graph: ProjectDepGraph, resourceKey: string, fieldPath: string): FieldValue<T> {
  const sourced = pullRed(graph, resourceKey, fieldPath);
  if (!sourced) return { state: 'absent' };

  if (sourced.origin === 'source' && sourced.state === 'unknown') {
    return { state: 'unknown', reasonKind: 'opaque-expression' };
  }

  const value = sourced.origin === 'source'
    ? (sourced.state === 'known' ? sourced.value : undefined)
    : sourced.value;

  if (value === undefined) return { state: 'absent' };
  return { state: 'known', value: value as T };
}

/**
 * Read bindables from graph conclusions and assemble into BindableGreen records.
 */
function readBindables(graph: ProjectDepGraph, resourceKey: string): Readonly<Record<string, BindableGreen>> {
  const prefix = `conclusion:${resourceKey}::bindable:`;
  const nodes = graph.nodesByPrefix(prefix);
  const bindableNames = new Set<string>();

  for (const nodeId of nodes) {
    const afterPrefix = nodeId.slice(prefix.length);
    const colonIdx = afterPrefix.indexOf(':');
    if (colonIdx > 0) {
      bindableNames.add(afterPrefix.slice(0, colonIdx));
    }
  }

  const result: Record<string, BindableGreen> = {};
  for (const propName of bindableNames) {
    const property = extractValue(pullRed(graph, resourceKey, `bindable:${propName}:property`));
    const attribute = readField<string>(graph, resourceKey, `bindable:${propName}:attribute`);
    const mode = readField<BindingMode>(graph, resourceKey, `bindable:${propName}:mode`);
    const primary = readField<boolean>(graph, resourceKey, `bindable:${propName}:primary`);
    const type = readField<string>(graph, resourceKey, `bindable:${propName}:type`);

    result[propName] = {
      property: typeof property === 'string' ? property : propName,
      attribute: attribute.state === 'absent' ? { state: 'known', value: propName } : attribute,
      mode: mode.state === 'absent' ? { state: 'known', value: 'default' as BindingMode } : mode,
      primary: primary.state === 'absent' ? { state: 'known', value: false } : primary,
      type,
    };
  }
  return result;
}

/**
 * Assemble a single ResourceGreen from graph conclusions.
 */
function assembleResourceGreen(
  graph: ProjectDepGraph,
  resourceKey: string,
  kind: NewResourceKind,
  name: string,
): ResourceGreen | null {
  const className = extractValue(pullRed(graph, resourceKey, 'className'));
  if (typeof className !== 'string') return null; // Not a recognized resource

  switch (kind) {
    case 'custom-element': {
      const bindables = readBindables(graph, resourceKey);
      return {
        kind: 'custom-element',
        name,
        className,
        containerless: readField<boolean>(graph, resourceKey, 'containerless'),
        capture: readField<CaptureValue>(graph, resourceKey, 'capture'),
        processContent: readField<ProcessContentValue>(graph, resourceKey, 'processContent'),
        shadowOptions: readField<ShadowOptions | null>(graph, resourceKey, 'shadowOptions'),
        template: readField<string>(graph, resourceKey, 'inlineTemplate'),
        enhance: readField<boolean>(graph, resourceKey, 'enhance'),
        strict: readField<boolean | undefined>(graph, resourceKey, 'strict'),
        aliases: readField<readonly string[]>(graph, resourceKey, 'aliases'),
        dependencies: readField<readonly DependencyRef[]>(graph, resourceKey, 'dependencies'),
        watches: readField<readonly WatchDefinition[]>(graph, resourceKey, 'watches'),
        bindables,
      } satisfies CustomElementGreen;
    }

    case 'custom-attribute': {
      const bindables = readBindables(graph, resourceKey);
      return {
        kind: 'custom-attribute',
        name,
        className,
        noMultiBindings: readField<boolean>(graph, resourceKey, 'noMultiBindings'),
        defaultProperty: readField<string>(graph, resourceKey, 'defaultProperty'),
        aliases: readField<readonly string[]>(graph, resourceKey, 'aliases'),
        dependencies: readField<readonly DependencyRef[]>(graph, resourceKey, 'dependencies'),
        watches: readField<readonly WatchDefinition[]>(graph, resourceKey, 'watches'),
        bindables,
      } satisfies CustomAttributeGreen;
    }

    case 'template-controller': {
      const bindables = readBindables(graph, resourceKey);
      // TC semantics come from builtins — the graph doesn't store them.
      // Look up from the builtin catalog.
      const builtinCatalog = buildCatalog(BUILTIN_RESOURCES);
      const builtinTc = builtinCatalog.controllers[name.toLowerCase()];
      return {
        kind: 'template-controller',
        name,
        className,
        noMultiBindings: readField<boolean>(graph, resourceKey, 'noMultiBindings'),
        defaultProperty: readField<string>(graph, resourceKey, 'defaultProperty'),
        containerStrategy: readField<'reuse' | 'new'>(graph, resourceKey, 'containerStrategy'),
        aliases: readField<readonly string[]>(graph, resourceKey, 'aliases'),
        dependencies: readField<readonly DependencyRef[]>(graph, resourceKey, 'dependencies'),
        watches: readField<readonly WatchDefinition[]>(graph, resourceKey, 'watches'),
        bindables,
        semantics: builtinTc?.semantics ?? null,
      } satisfies TemplateControllerGreen;
    }

    case 'value-converter':
      return {
        kind: 'value-converter',
        name,
        className,
        aliases: readField<readonly string[]>(graph, resourceKey, 'aliases'),
        fromType: readField<string>(graph, resourceKey, 'fromType'),
        toType: readField<string>(graph, resourceKey, 'toType'),
        hasFromView: readField<boolean>(graph, resourceKey, 'hasFromView'),
        signals: readField<readonly string[]>(graph, resourceKey, 'signals'),
      } satisfies ValueConverterGreen;

    case 'binding-behavior':
      return {
        kind: 'binding-behavior',
        name,
        className,
        aliases: readField<readonly string[]>(graph, resourceKey, 'aliases'),
        isFactory: readField<boolean>(graph, resourceKey, 'isFactory'),
      } satisfies BindingBehaviorGreen;

    default:
      return null;
  }
}

// =============================================================================
// Vocabulary Conversion (old → new format)
// =============================================================================

/**
 * Convert the old VocabularyGreen (Map-based, from vocabulary.ts) to the
 * new VocabularyGreen (Record-based, from resource/types.ts).
 */
function convertVocabulary(
  oldVocab: VocabularyGreen,
): NewVocabularyGreen {
  const commands: Record<string, BindingCommandGreen> = {};

  for (const [name, entry] of oldVocab.commands) {
    commands[name] = {
      name: entry.name,
      commandKind: mapCommandKind(entry),
      ignoreAttr: entry.ignoreAttr,
      expressionEntry: (entry.expressionEntry ?? 'IsProperty') as any,
    };
  }

  // Use builtin patterns as the canonical source — they're already in the
  // new format. The old vocabulary patterns don't carry enough info.
  return {
    commands,
    patterns: BUILTIN_VOCABULARY.patterns,
  };
}

function mapCommandKind(entry: BindingCommandEntry): 'property' | 'listener' | 'iterator' | 'ref' | 'attribute' | 'style' | 'translation' {
  const name = entry.name;
  if (name === 'trigger' || name === 'capture') return 'listener';
  if (name === 'for') return 'iterator';
  if (name === 'ref') return 'ref';
  if (name === 'attr') return 'attribute';
  if (name === 'style') return 'style';
  if (name === 'class') return 'attribute';
  if (name === 't' || name === 't.bind') return 'translation';
  return 'property';
}

// =============================================================================
// analyzeTemplate — New Architecture Path
// =============================================================================

/**
 * Analyze a template using the NEW single-pass lowerTemplate() from
 * semantic-analysis.ts. This is the replacement for analyzeTemplate()
 * that consumes ResourceCatalogGreen directly instead of going through
 * the old template-analysis.ts.
 *
 * The bridge:
 * 1. graphToResourceCatalog() projects graph conclusions into ResourceGreen types
 * 2. convertVocabulary() adapts the vocabulary format
 * 3. lowerTemplate() runs the single-pass analysis
 */
export function analyzeTemplate(
  result: InterpreterResult,
  ceName: string,
): TemplateSemantics {
  // Pull the CE's template content from conclusions
  const resourceKey = `custom-element:${ceName}`;
  const templateContent = pullValue(result.graph, resourceKey, 'inlineTemplate');

  if (typeof templateContent !== 'string') {
    throw new Error(
      `No template content found for CE '${ceName}'. ` +
      `Got: ${JSON.stringify(templateContent)}`
    );
  }

  // Build the resource catalog from graph conclusions + builtins
  const catalog = graphToResourceCatalog(result.graph);

  // Evaluate and convert vocabulary
  const vocab = evaluateProjectVocabulary(result);
  const newVocab = convertVocabulary(vocab.green);

  // Evaluate scope completeness
  const vis = evaluateVisibility(result);
  const scopeGreen = vis.scopes.get(ceName);
  const completeness: NewScopeCompleteness = scopeGreen
    ? {
        complete: scopeGreen.completeness.state === 'complete',
        gaps: scopeGreen.completeness.state === 'incomplete'
          ? scopeGreen.completeness.gaps.map(g => ({ site: g.site, reason: g.reason }))
          : [],
      }
    : { complete: true, gaps: [] };

  return lowerTemplate({
    html: templateContent,
    scopeOwner: ceName,
    catalog,
    vocabulary: newVocab,
    completeness,
  });
}

// Re-export new types for test files
import type {
  ElementSemantics,
  AttributeSemantics,
  ScopeFrame,
} from "../../out/core/template/semantic-analysis.js";

export type {
  TemplateSemantics,
  ElementSemantics,
  AttributeSemantics,
  Classification,
  ClassificationCategory,
  BindingTarget,
  ScopeFrame,
  ScopeFrameKind,
  LocalBinding,
  ControllerSemantics,
  ElementResolution,
  TextSemantics,
  GapSignal,
} from "../../out/core/template/semantic-analysis.js";

// =============================================================================
// New Path Assertion Helpers
// =============================================================================

/**
 * Find an element in new-path TemplateSemantics by tag name.
 */
export function findElement(
  semantics: TemplateSemantics,
  tagName: string,
): ElementSemantics {
  const el = semantics.elements.find(e => e.tagName.toLowerCase() === tagName.toLowerCase());
  if (!el) {
    throw new Error(
      `[NEW] No element '${tagName}' found. ` +
      `Elements: [${semantics.elements.map(e => e.tagName).join(', ')}]`
    );
  }
  return el;
}

/**
 * Find all elements in new-path TemplateSemantics by tag name.
 */
export function findElements(
  semantics: TemplateSemantics,
  tagName: string,
): ElementSemantics[] {
  return semantics.elements.filter(e => e.tagName.toLowerCase() === tagName.toLowerCase());
}

/**
 * Find an attribute in new-path ElementSemantics by raw name.
 */
export function findAttr(
  el: ElementSemantics,
  attrName: string,
): AttributeSemantics {
  const attr = el.attributes.find(a => a.rawName === attrName);
  if (!attr) {
    throw new Error(
      `[NEW] No attribute '${attrName}' on <${el.tagName}>. ` +
      `Attributes: [${el.attributes.map(a => a.rawName).join(', ')}]`
    );
  }
  return attr;
}

/**
 * Category name mapping from old to new.
 */
const CATEGORY_MAP: Record<string, string> = {
  'special-attribute': 'special',
  'captured-attribute': 'captured',
  'spread-transferred': 'spread-transferred',
  'override-bc': 'override-command',
  'spread-value': 'spread-value',
  'ce-bindable': 'element-bindable',
  'custom-attribute': 'custom-attribute',
  'template-controller': 'template-controller',
  'plain-attribute': 'plain-attribute',
};

/**
 * Assert classification on new-path attribute (using old-path category names
 * for compatibility — maps automatically).
 */
export function assertClassified(
  attr: AttributeSemantics,
  step: number,
  oldCategory: string,
): void {
  const newCategory = CATEGORY_MAP[oldCategory] ?? oldCategory;
  if (attr.classification.step !== step) {
    throw new Error(
      `[NEW] Expected step ${step} but got ${attr.classification.step} ` +
      `for '${attr.rawName}' (category: ${attr.classification.category})`
    );
  }
  if (attr.classification.category !== newCategory) {
    throw new Error(
      `[NEW] Expected category '${newCategory}' but got '${attr.classification.category}' ` +
      `for '${attr.rawName}' at step ${step}`
    );
  }
}

/**
 * Assert CE resolution on new-path element.
 */
export function assertResolvedCe(
  el: ElementSemantics,
  expectedName: string,
): void {
  if (el.resolution.kind !== 'custom-element') {
    throw new Error(
      `[NEW] Expected CE resolution but got '${el.resolution.kind}' for <${el.tagName}>`
    );
  }
  if (el.resolution.resource.name !== expectedName) {
    throw new Error(
      `[NEW] Expected CE '${expectedName}' but resolved '${el.resolution.resource.name}' for <${el.tagName}>`
    );
  }
}

/**
 * Assert plain HTML resolution.
 */
export function assertPlainHtml(
  el: ElementSemantics,
): void {
  if (el.resolution.kind !== 'plain-html') {
    throw new Error(
      `[NEW] Expected plain-html but got '${el.resolution.kind}' for <${el.tagName}>`
    );
  }
}

/**
 * Assert not-found resolution with grounded flag.
 */
export function assertElementNotFound(
  el: ElementSemantics,
  grounded: boolean,
): void {
  if (el.resolution.kind !== 'not-found') {
    throw new Error(
      `[NEW] Expected not-found but got '${el.resolution.kind}' for <${el.tagName}>`
    );
  }
  if (el.resolution.grounded !== grounded) {
    throw new Error(
      `[NEW] Expected grounded=${grounded} but got ${el.resolution.grounded} for <${el.tagName}>`
    );
  }
}

/**
 * Assert no binding on new-path attribute.
 */
export function assertNoBinding(
  attr: AttributeSemantics,
): void {
  if (attr.binding !== null) {
    throw new Error(
      `[NEW] Expected no binding but got '${attr.binding.kind}' for '${attr.rawName}'`
    );
  }
}

/**
 * Assert binding kind and properties on new-path attribute.
 */
export function assertBinding(
  attr: AttributeSemantics,
  expected: {
    kind?: string;
    effectiveMode?: string;
    property?: string;
    expressionEntry?: string;
  },
): void {
  if (!attr.binding) {
    throw new Error(
      `[NEW] Expected binding but got null for '${attr.rawName}'`
    );
  }
  if (expected.kind !== undefined && attr.binding.kind !== expected.kind) {
    throw new Error(
      `[NEW] Expected binding kind '${expected.kind}' but got '${attr.binding.kind}' for '${attr.rawName}'`
    );
  }
  if (expected.effectiveMode !== undefined) {
    const mode = 'effectiveMode' in attr.binding ? (attr.binding as any).effectiveMode : undefined;
    if (mode !== expected.effectiveMode) {
      throw new Error(
        `[NEW] Expected mode '${expected.effectiveMode}' but got '${mode}' for '${attr.rawName}'`
      );
    }
  }
  if (expected.property !== undefined) {
    const prop = 'property' in attr.binding ? (attr.binding as any).property
      : 'targetProperty' in attr.binding ? (attr.binding as any).targetProperty
      : 'bindable' in attr.binding ? (attr.binding as any).bindable?.property
      : undefined;
    if (prop !== expected.property) {
      throw new Error(
        `[NEW] Expected property '${expected.property}' but got '${prop}' for '${attr.rawName}'`
      );
    }
  }
  if (expected.expressionEntry !== undefined) {
    const entry = 'expressionEntry' in attr.binding ? (attr.binding as any).expressionEntry : undefined;
    if (entry !== expected.expressionEntry) {
      throw new Error(
        `[NEW] Expected expressionEntry '${expected.expressionEntry}' but got '${entry}' for '${attr.rawName}'`
      );
    }
  }
}

/**
 * Collect scope chain from new-path ScopeFrame linked list into an array of kinds.
 */
export function collectScopeChain(
  frame: ScopeFrame,
): string[] {
  const chain: string[] = [];
  let current: ScopeFrame | null = frame;
  while (current) {
    chain.push(current.kind);
    current = current.parent;
  }
  return chain;
}

/**
 * Assert scope chain on new-path element matches expected kinds.
 */
export function assertScopeChain(
  el: ElementSemantics,
  expectedKinds: string[],
): void {
  const chain = collectScopeChain(el.frame);
  const expected = expectedKinds.join(' → ');
  const actual = chain.join(' → ');
  if (JSON.stringify(chain) !== JSON.stringify(expectedKinds)) {
    throw new Error(
      `[NEW] Expected scope chain [${expected}] but got [${actual}] for <${el.tagName}>`
    );
  }
}

/**
 * Assert that the new-path element produces no Aurelia-specific bindings
 * (rung 4: not applicable).
 */
export function assertNotApplicable(
  el: ElementSemantics,
): void {
  for (const attr of el.attributes) {
    if (attr.binding !== null) {
      throw new Error(
        `[NEW] Expected no Aurelia bindings on <${el.tagName}> but '${attr.rawName}' has binding kind '${attr.binding.kind}'`
      );
    }
  }
}
