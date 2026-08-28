import assert from "node:assert/strict";
import type { Key } from "@aurelia/kernel";
import {
  AttrSyntax,
  itHydrateAttribute,
  itHydrateElement,
  itHydrateLetElement,
  itHydrateTemplateController,
  itIteratorBinding,
  itSpreadElementProp,
  type IElementComponentDefinition,
  type IInstruction,
  type ProcessContentHook,
} from "@aurelia/template-compiler";
import type { BatchCaseExecution } from "./batch-contracts.js";
import type {
  CompilerCase,
  CompilerCaseData,
  CompilerElementDefinition,
  CompilerFocusedInvariant,
  CompilerOracleExpectedProduct,
  CompilerSetupFactory,
  CompilerTemplateSource,
  CompilerWorldRef,
} from "./compiler-case.js";
import { assertCompilerCaseData } from "./compiler-canonical-data.js";
import { JitCompilerInvocationError } from "./jit-compiler-oracle.js";
import type {
  JitCompilerExecution,
  JitCompilerBypassExecution,
  JitCompilerOracle,
  JitCompilerRequest,
  JitCompilerSpreadRequest,
} from "./jit-compiler-oracle.js";

/** Fresh JIT-side values produced for one named setup invocation. */
export interface JitCompilerSetupMaterialization {
  readonly exports: Readonly<Record<string, unknown>>;
  readonly witness: CompilerCaseData;
  dispose?(): void | Promise<void>;
}

/** Restricted setup context: factories can create DOM inputs but cannot invoke the compiler oracle. */
export interface JitCompilerSetupContext {
  createElement(tagName: string): globalThis.Element;
  createTemplate(markup: string): globalThis.HTMLTemplateElement;
}

/** Lane-specific materializer for one neutral setup factory id. */
export interface JitCompilerSetupMaterializer {
  readonly factoryId: string;
  materialize(args: CompilerCaseData | undefined, context: JitCompilerSetupContext):
    JitCompilerSetupMaterialization | Promise<JitCompilerSetupMaterialization>;
}

interface MaterializedSetups {
  readonly bySymbol: ReadonlyMap<string, JitCompilerSetupMaterialization>;
  readonly ordered: readonly JitCompilerSetupMaterialization[];
}

/** Framework-JIT product retained after case execution and setup disposal. */
export type JitCompilerCaseOutcome =
  | { readonly kind: "compiled-definition"; readonly value: JitCompilerExecution["compiled"] }
  | { readonly kind: "unchanged-definition"; readonly value: JitCompilerBypassExecution["definition"] }
  | { readonly kind: "spread-instructions"; readonly value: readonly IInstruction[] }
  | { readonly kind: "compiler-error"; readonly error: unknown };

interface JitCompilerCaseRun {
  readonly outcome: JitCompilerCaseOutcome;
  readonly execution: void | BatchCaseExecution;
}

/** JIT-side adapter for the runner-neutral compiler case dialect. */
export class JitCompilerCaseExecutor {
  readonly #factories: ReadonlyMap<string, CompilerSetupFactory>;
  readonly #materializers: ReadonlyMap<string, JitCompilerSetupMaterializer>;

  public constructor(
    factories: readonly CompilerSetupFactory[] = [],
    materializers: readonly JitCompilerSetupMaterializer[] = [],
  ) {
    this.#factories = new Map(factories.map((factory) => [factory.factoryId, factory]));
    this.#materializers = new Map(materializers.map((materializer) => [materializer.factoryId, materializer]));
    if (this.#materializers.size !== materializers.length) {
      throw new Error("JIT compiler setup materializer ids must be unique.");
    }
    for (const materializer of materializers) {
      if (!this.#factories.has(materializer.factoryId)) {
        throw new Error(`JIT materializer ${materializer.factoryId} has no neutral setup factory.`);
      }
    }
  }

  public async execute(candidate: CompilerCase, oracle: JitCompilerOracle): Promise<void | BatchCaseExecution> {
    return (await this.#run(candidate, oracle)).execution;
  }

  /** Capture the framework product after every focused JIT invariant has passed. */
  public async captureOutcome(candidate: CompilerCase, oracle: JitCompilerOracle): Promise<JitCompilerCaseOutcome> {
    return (await this.#run(candidate, oracle)).outcome;
  }

  async #run(candidate: CompilerCase, oracle: JitCompilerOracle): Promise<JitCompilerCaseRun> {
    const setups = await this.#materializeSetups(candidate, oracle);
    let result: void | BatchCaseExecution;
    let outcome: JitCompilerCaseOutcome | undefined;
    let executionFailed = false;
    let executionError: unknown;
    try {
      const expectedProduct = frameworkJitExpectedProduct(candidate);
      if (expectedProduct === "compiler-error") {
        const error = this.#executeForError(candidate, oracle, setups);
        outcome = { kind: "compiler-error", error };
        verifyJitInvariants(candidate, outcome);
        result = undefined;
      } else if (candidate.world.entry.kind === "compile") {
        if (expectedProduct === "unchanged-definition") {
          const execution = oracle.bypass(this.#compileRequest(candidate, setups));
          outcome = { kind: "unchanged-definition", value: execution.definition };
          verifyJitInvariants(candidate, outcome);
          result = execution;
        } else {
          assert.equal(expectedProduct, "compiled-definition", `${candidate.id}: JIT oracle product`);
          const execution = oracle.compile(this.#compileRequest(candidate, setups));
          outcome = { kind: "compiled-definition", value: execution.compiled };
          verifyJitInvariants(candidate, outcome);
          result = execution;
        }
      } else {
        assert.equal(expectedProduct, "spread-instructions", `${candidate.id}: JIT oracle product`);
        const execution = oracle.compileSpread(this.#spreadRequest(candidate, oracle, setups));
        outcome = { kind: "spread-instructions", value: execution.instructions };
        verifyJitInvariants(candidate, outcome);
        result = execution;
      }
    } catch (error) {
      executionFailed = true;
      executionError = error;
      result = undefined;
    }
    const disposalErrors = await disposeSetups(setups.ordered);
    if (executionFailed) {
      if (disposalErrors.length > 0) {
        throw new AggregateError(
          [executionError, ...disposalErrors],
          `Compiler case ${candidate.id} failed and setup disposal also failed.`,
        );
      }
      throw executionError;
    }
    if (disposalErrors.length > 0) {
      throw new AggregateError(disposalErrors, `Compiler case ${candidate.id} setup disposal failed.`);
    }
    if (outcome == null) {
      throw new Error(`Compiler case ${candidate.id} completed without a framework product.`);
    }
    return { outcome, execution: result };
  }

  async #materializeSetups(candidate: CompilerCase, oracle: JitCompilerOracle): Promise<MaterializedSetups> {
    const bySymbol = new Map<string, JitCompilerSetupMaterialization>();
    const ordered: JitCompilerSetupMaterialization[] = [];
    try {
      for (const invocation of candidate.world.setups) {
        const materializer = this.#materializers.get(invocation.factory);
        const factory = this.#factories.get(invocation.factory);
        if (factory == null) {
          throw new Error(
            `Compiler case ${candidate.id} setup ${invocation.symbol} references unknown setup factory ${invocation.factory}.`,
          );
        }
        if (materializer == null) {
          throw new Error(
            `Compiler case ${candidate.id} setup ${invocation.symbol} references unknown JIT factory ${invocation.factory}.`,
          );
        }
        const context: JitCompilerSetupContext = {
          createElement: (tagName) => oracle.createElement(tagName),
          createTemplate: (markup) => oracle.createTemplate(markup),
        };
        const materialized = await materializer.materialize(invocation.args, context);
        ordered.push(materialized);
        assertCompilerCaseData(materialized.witness, `${candidate.id}/${invocation.symbol}/jit-witness`);
        assert.deepEqual(
          materialized.witness,
          factory.describe(invocation.args),
          `${candidate.id}/${invocation.symbol}: JIT setup witness`,
        );
        validateMaterializedExports(candidate.id, invocation.symbol, factory.exports, materialized.exports);
        bySymbol.set(invocation.symbol, materialized);
      }
    } catch (error) {
      const disposalErrors = await disposeSetups(ordered);
      if (disposalErrors.length > 0) {
        throw new AggregateError(
          [error, ...disposalErrors],
          `Compiler case ${candidate.id} setup materialization and cleanup failed.`,
        );
      }
      throw error;
    }
    return { bySymbol, ordered };
  }

  #compileRequest(candidate: CompilerCase, setups: MaterializedSetups): JitCompilerRequest {
    const entry = candidate.world.entry;
    assert.equal(entry.kind, "compile", `${candidate.id}: compile entry`);
    const registrations = materializeRegistrations(candidate, setups);
    return {
      definition: materializeDefinition(entry.definition, setups, registrations.dependencies),
      rootRegistrationsBefore: registrations.rootBefore,
      rootRegistrationsAfter: registrations.rootAfter,
      localRegistrations: registrations.local,
      debug: candidate.world.compiler.debug,
      resolveResources: candidate.world.compiler.resolveResources,
    };
  }

  #spreadRequest(
    candidate: CompilerCase,
    oracle: JitCompilerOracle,
    setups: MaterializedSetups,
  ): JitCompilerSpreadRequest {
    const entry = candidate.world.entry;
    assert.equal(entry.kind, "compile-spread", `${candidate.id}: compileSpread entry`);
    const registrations = materializeRegistrations(candidate, setups);
    const target = entry.target.kind === "element"
      ? oracle.createElement(entry.target.tagName)
      : resolveWorldRef(entry.target.value, setups) as globalThis.Element;
    return {
      definition: materializeDefinition(entry.requestor, setups, registrations.dependencies),
      attributes: entry.attributes.map((attribute) => new AttrSyntax(
        attribute.rawName,
        attribute.rawValue,
        attribute.target,
        attribute.command,
        attribute.parts ?? null,
      )),
      target,
      targetDefinition: entry.targetDefinition == null
        ? undefined
        : materializeDefinition(entry.targetDefinition, setups, []),
      rootRegistrationsBefore: registrations.rootBefore,
      rootRegistrationsAfter: registrations.rootAfter,
      localRegistrations: registrations.local,
      debug: candidate.world.compiler.debug,
      resolveResources: candidate.world.compiler.resolveResources,
    };
  }

  #executeForError(candidate: CompilerCase, oracle: JitCompilerOracle, setups: MaterializedSetups): unknown {
    const invoke = candidate.world.entry.kind === "compile"
      ? (() => {
          const request = this.#compileRequest(candidate, setups);
          return () => oracle.compile(request);
        })()
      : (() => {
          const request = this.#spreadRequest(candidate, oracle, setups);
          return () => oracle.compileSpread(request);
        })();
    try {
      invoke();
    } catch (error) {
      if (error instanceof JitCompilerInvocationError) {
        return error.frameworkError;
      }
      throw error;
    }
    assert.fail(`Compiler case ${candidate.id} expected the framework JIT to throw.`);
  }
}

/** Current standalone JIT runner is characterization-only; equivalence needs a multi-lane coordinator. */
export function validateJitCharacterizationCases(cases: readonly CompilerCase[]): void {
  for (const candidate of cases) {
    if (
      candidate.oracles.lanes.length !== 1
      || candidate.oracles.lanes[0]?.id !== "framework-jit"
    ) {
      throw new Error(`JIT-only runner cannot execute non-JIT oracle lanes for ${candidate.id}.`);
    }
    if (candidate.oracles.claims.length > 0) {
      throw new Error(`JIT-only runner cannot satisfy equivalence claims for ${candidate.id}.`);
    }
    if (candidate.closure.some((claim) => claim.state === "closed")) {
      throw new Error(`JIT-only runner cannot publish closed conservation claims for ${candidate.id}.`);
    }
  }
}

interface MaterializedRegistrations {
  readonly dependencies: Key[];
  readonly rootBefore: unknown[];
  readonly rootAfter: unknown[];
  readonly local: unknown[];
}

function materializeRegistrations(candidate: CompilerCase, setups: MaterializedSetups): MaterializedRegistrations {
  const result: MaterializedRegistrations = {
    dependencies: [],
    rootBefore: [],
    rootAfter: [],
    local: [],
  };
  for (const registration of candidate.world.registrations) {
    const value = resolveWorldRef(registration.value, setups);
    const values = registration.cardinality === "many"
      ? requireRegistrationArray(candidate.id, registration.value, value)
      : [value];
    switch (registration.site) {
      case "definition-dependency":
        result.dependencies.push(...values as Key[]);
        break;
      case "root-before-standard-configuration":
        result.rootBefore.push(...values);
        break;
      case "root-after-standard-configuration":
        result.rootAfter.push(...values);
        break;
      case "compilation-local":
        result.local.push(...values);
        break;
    }
  }
  return result;
}

function requireRegistrationArray(caseId: string, ref: CompilerWorldRef, value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Compiler case ${caseId} registration ${ref.setup}.${ref.export} must export an array.`);
  }
  return value;
}

function materializeDefinition(
  definition: CompilerElementDefinition,
  setups: MaterializedSetups,
  dependencies: readonly Key[],
): IElementComponentDefinition {
  return {
    name: definition.name,
    type: "custom-element",
    template: materializeTemplate(definition.template, setups),
    instructions: materializePrecompiledInstructionRows(definition.instructions, setups),
    surrogates: definition.surrogates as unknown as IElementComponentDefinition["surrogates"],
    dependencies,
    needsCompile: definition.needsCompile,
    containerless: definition.containerless,
    hasSlots: definition.hasSlots,
    shadowOptions: definition.shadowOptions,
    enhance: definition.enhance,
    capture: typeof definition.capture === "object"
      ? resolveWorldRef(definition.capture, setups) as (attrName: string) => boolean
      : definition.capture,
    processContent: definition.processContent == null
      ? definition.processContent
      : resolveWorldRef(definition.processContent, setups) as ProcessContentHook,
    Type: definition.Type == null
      ? undefined
      : resolveWorldRef(definition.Type, setups) as IElementComponentDefinition["Type"],
    bindables: definition.bindables == null
      ? undefined
      : definition.bindables.map((bindable) => ({
          name: bindable.name,
          attribute: bindable.attribute,
          mode: bindable.mode,
          set: bindable.set == null
            ? undefined
            : resolveWorldRef(bindable.set, setups) as (value: unknown) => unknown,
        })),
  };
}

function materializePrecompiledInstructionRows(
  rows: CompilerElementDefinition["instructions"],
  setups: MaterializedSetups,
): IElementComponentDefinition["instructions"] {
  return rows?.map((row) => row.map((instruction) => materializePrecompiledInstruction(instruction, setups)));
}

function materializePrecompiledInstruction(
  instruction: CompilerCaseData,
  setups: MaterializedSetups,
): IInstruction {
  if (instruction == null || Array.isArray(instruction) || typeof instruction !== "object") {
    throw new Error("Precompiled compiler case instruction must be one data record.");
  }
  const record = instruction as Readonly<Record<string, CompilerCaseData>>;
  const type = record.type;
  if (typeof type !== "number") {
    throw new Error("Precompiled compiler case instruction requires a numeric type.");
  }
  const fields: Record<string, unknown> = { ...record };
  if (
    (type === itHydrateElement || type === itHydrateAttribute || type === itHydrateTemplateController)
    && record.props != null
  ) {
    fields.props = materializeNestedInstructionArray(record.props, setups, "props");
  } else if (type === itHydrateLetElement && record.instructions != null) {
    fields.instructions = materializeNestedInstructionArray(record.instructions, setups, "instructions");
  } else if (type === itIteratorBinding && record.props != null) {
    fields.props = materializeNestedInstructionArray(record.props, setups, "props");
  } else if (type === itSpreadElementProp && record.instruction != null) {
    fields.instruction = materializePrecompiledInstruction(record.instruction, setups);
  }
  if (type === itHydrateTemplateController) {
    fields.def = materializePrecompiledChildDefinition(record.def, setups, "def");
  }
  if (type === itHydrateElement && record.projections != null) {
    fields.projections = materializePrecompiledProjections(record.projections, setups);
  }
  return fields as unknown as IInstruction;
}

function materializeNestedInstructionArray(
  value: CompilerCaseData,
  setups: MaterializedSetups,
  field: string,
): readonly IInstruction[] {
  if (!Array.isArray(value)) {
    throw new Error(`Precompiled compiler case ${field} must be an instruction array.`);
  }
  const instructions = value as readonly CompilerCaseData[];
  return instructions.map((instruction) => materializePrecompiledInstruction(instruction, setups));
}

function materializePrecompiledProjections(
  value: CompilerCaseData,
  setups: MaterializedSetups,
): Readonly<Record<string, IElementComponentDefinition>> {
  if (value == null || Array.isArray(value) || typeof value !== "object") {
    throw new Error("Precompiled compiler case projections must be one slot record.");
  }
  return Object.fromEntries(Object.entries(value).map(([slotName, definition]) => [
    slotName,
    materializePrecompiledChildDefinition(definition, setups, `projections.${slotName}`),
  ]));
}

function materializePrecompiledChildDefinition(
  value: CompilerCaseData | undefined,
  setups: MaterializedSetups,
  field: string,
): IElementComponentDefinition {
  if (value == null || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`Precompiled compiler case ${field} must be one element definition.`);
  }
  const definition = value as unknown as CompilerElementDefinition;
  if (definition.type !== "custom-element" || typeof definition.name !== "string") {
    throw new Error(`Precompiled compiler case ${field} is not a custom-element definition.`);
  }
  return materializeDefinition(definition, setups, []);
}

function materializeTemplate(
  source: CompilerTemplateSource | null | undefined,
  setups: MaterializedSetups,
): string | globalThis.Node | null | undefined {
  return source == null
    ? source
    : source.kind === "markup"
      ? source.value
      : resolveWorldRef(source.value, setups) as string | globalThis.Node;
}

function resolveWorldRef(ref: CompilerWorldRef, setups: MaterializedSetups): unknown {
  const setup = setups.bySymbol.get(ref.setup);
  if (setup == null) {
    throw new Error(`Unknown compiler setup symbol ${ref.setup}.`);
  }
  if (!Object.hasOwn(setup.exports, ref.export)) {
    throw new Error(`Compiler setup ${ref.setup} has no export ${ref.export}.`);
  }
  return setup.exports[ref.export];
}

function validateMaterializedExports(
  caseId: string,
  setupSymbol: string,
  declared: readonly string[],
  exports: Readonly<Record<string, unknown>>,
): void {
  const prototype: unknown = Object.getPrototypeOf(exports);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`Compiler case ${caseId} setup ${setupSymbol} exports must be a plain record.`);
  }
  const keys = Reflect.ownKeys(exports);
  if (keys.some((key) => typeof key !== "string")) {
    throw new Error(`Compiler case ${caseId} setup ${setupSymbol} exports must use string keys.`);
  }
  const actual = (keys as string[]).sort();
  const expected = [...declared].sort();
  assert.deepEqual(actual, expected, `Compiler case ${caseId} setup ${setupSymbol} export names`);
  for (const key of actual) {
    const descriptor = Object.getOwnPropertyDescriptor(exports, key)!;
    if (!("value" in descriptor)) {
      throw new Error(`Compiler case ${caseId} setup ${setupSymbol} export ${key} must be a data property.`);
    }
  }
}

function frameworkJitExpectedProduct(candidate: CompilerCase): CompilerOracleExpectedProduct {
  const lanes = candidate.oracles.lanes.filter((lane) => lane.id === "framework-jit");
  assert.equal(lanes.length, 1, `${candidate.id}: exactly one framework-jit lane`);
  return lanes[0]!.expectedProduct;
}

function verifyJitInvariants(candidate: CompilerCase, outcome: JitCompilerCaseOutcome): void {
  for (const invariant of candidate.invariants) {
    if (!invariant.lanes.includes("framework-jit")) {
      continue;
    }
    const actual = selectedInvariantValue(invariant, outcome);
    const label = `${candidate.id} [framework-jit/${invariant.id}] ${invariant.description}`;
    if (invariant.assertion.kind === "equal") {
      assert.deepEqual(actual, invariant.assertion.expected, label);
    } else {
      if (typeof actual !== "string") {
        throw new Error(`${label}: selected value must be text`);
      }
      assert.ok(actual.includes(invariant.assertion.expected), label);
    }
  }
}

function selectedInvariantValue(invariant: CompilerFocusedInvariant, outcome: JitCompilerCaseOutcome): unknown {
  const selector = invariant.selector;
  switch (selector.kind) {
    case "definition-field":
      return definitionOutcome(outcome, selector.kind)[selector.field];
    case "definition-bindable-count": {
      const bindables = definitionOutcome(outcome, selector.kind).bindables;
      return Array.isArray(bindables) ? bindables.length : Object.keys(bindables ?? {}).length;
    }
    case "definition-bindable-field": {
      const bindables = definitionOutcome(outcome, selector.kind).bindables;
      if (!Array.isArray(bindables)) {
        throw new Error(`${selector.kind}: expected authored bindable array input.`);
      }
      return (bindables[selector.bindable] as unknown as Readonly<Record<string, unknown>> | undefined)
        ?.[selector.field];
    }
    case "instruction-row-count":
      return definitionOutcome(outcome, selector.kind).instructions?.length;
    case "surrogate-count":
      return definitionOutcome(outcome, selector.kind).surrogates?.length;
    case "template-node-name":
      {
        const template = definitionOutcome(outcome, selector.kind).template;
        return typeof template === "object" && template != null ? template.nodeName : null;
      }
    case "template-outer-html":
      {
        const template = definitionOutcome(outcome, selector.kind).template;
        return typeof template === "object" && template != null && "outerHTML" in template
          ? (template as globalThis.Element).outerHTML
          : null;
      }
    case "instruction-row-width":
      return definitionOutcome(outcome, selector.kind).instructions?.[selector.row]?.length;
    case "instruction-field":
      return (definitionOutcome(outcome, selector.kind).instructions?.[selector.row]?.[selector.instruction] as unknown as
        Readonly<Record<string, unknown>> | undefined)?.[selector.field];
    case "instruction-path": {
      const instruction = definitionOutcome(outcome, selector.kind).instructions?.[selector.row]?.[selector.instruction];
      return readProductPath(instruction, selector.path, selector.kind);
    }
    case "surrogate-field":
      return (definitionOutcome(outcome, selector.kind).surrogates?.[selector.instruction] as unknown as
        Readonly<Record<string, unknown>> | undefined)?.[selector.field];
    case "definition-dependencies-count":
      return definitionOutcome(outcome, selector.kind).dependencies?.length ?? 0;
    case "spread-instruction-count":
      return spreadOutcome(outcome, selector.kind).length;
    case "spread-instruction-field":
      return (spreadOutcome(outcome, selector.kind)[selector.instruction] as unknown as
        Readonly<Record<string, unknown>> | undefined)?.[selector.field];
    case "compiler-error-code":
      return compilerErrorCode(errorOutcome(outcome, selector.kind));
    case "compiler-error-message":
      {
        const error = errorOutcome(outcome, selector.kind);
        return error instanceof Error ? error.message : String(error);
      }
  }
}

function readProductPath(value: unknown, path: readonly (string | number)[], selector: string): unknown {
  let current = value;
  for (const segment of path) {
    if (current == null || (typeof current !== "object" && typeof current !== "function")) {
      throw new Error(`Invariant selector ${selector} cannot read path segment ${String(segment)}.`);
    }
    if (!Object.hasOwn(current, segment)) {
      throw new Error(`Invariant selector ${selector} cannot find path segment ${String(segment)}.`);
    }
    current = (current as Readonly<Record<PropertyKey, unknown>>)[segment];
  }
  return current;
}

function definitionOutcome(
  outcome: JitCompilerCaseOutcome,
  selector: CompilerFocusedInvariant["selector"]["kind"],
): JitCompilerExecution["compiled"] | JitCompilerBypassExecution["definition"] {
  if (outcome.kind !== "compiled-definition" && outcome.kind !== "unchanged-definition") {
    throw new Error(`Invariant selector ${selector} cannot read JIT product ${outcome.kind}.`);
  }
  return outcome.value;
}

function spreadOutcome(
  outcome: JitCompilerCaseOutcome,
  selector: CompilerFocusedInvariant["selector"]["kind"],
): readonly IInstruction[] {
  if (outcome.kind !== "spread-instructions") {
    throw new Error(`Invariant selector ${selector} cannot read JIT product ${outcome.kind}.`);
  }
  return outcome.value;
}

function errorOutcome(
  outcome: JitCompilerCaseOutcome,
  selector: CompilerFocusedInvariant["selector"]["kind"],
): unknown {
  if (outcome.kind !== "compiler-error") {
    throw new Error(`Invariant selector ${selector} cannot read JIT product ${outcome.kind}.`);
  }
  return outcome.error;
}

async function disposeSetups(
  materializations: readonly JitCompilerSetupMaterialization[],
): Promise<readonly unknown[]> {
  const errors: unknown[] = [];
  for (let index = materializations.length - 1; index >= 0; --index) {
    try {
      await materializations[index]!.dispose?.();
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
}

function compilerErrorCode(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  return /\bAUR\d{4}\b/u.exec(message)?.[0] ?? null;
}
