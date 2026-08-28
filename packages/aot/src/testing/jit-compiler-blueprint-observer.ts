import { createHash } from "node:crypto";
import {
  CustomAttribute,
  CustomAttributeDefinition,
  CustomElement,
  CustomElementDefinition,
} from "@aurelia/runtime-html";
import {
  AttrSyntax,
  itAttributeBinding,
  itHydrateAttribute,
  itHydrateElement,
  itHydrateLetElement,
  itHydrateTemplateController,
  itInterpolation,
  itIteratorBinding,
  itLetBinding,
  itListenerBinding,
  itMultiAttr,
  itPropertyBinding,
  itRefBinding,
  itSetAttribute,
  itSetClassAttribute,
  itSetProperty,
  itSetStyleAttribute,
  itSpreadElementProp,
  itSpreadTransferedBinding,
  itSpreadValueBinding,
  itStylePropertyBinding,
  itTextBinding,
  type IElementComponentDefinition,
  type IInstruction,
} from "@aurelia/template-compiler";
import type {
  CompilerCase,
  CompilerCaseData,
  CompilerOracleExpectedProduct,
} from "./compiler-case.js";
import {
  assertCompilerCaseData,
  canonicalCompilerJson,
} from "./compiler-canonical-data.js";
import type {
  JitCompilerCaseExecutor,
  JitCompilerCaseOutcome,
} from "./jit-compiler-case-executor.js";
import type {
  JitCompiledDefinition,
  JitCompilerOracle,
} from "./jit-compiler-oracle.js";

export const JIT_COMPILER_BLUEPRINT_OBSERVER_VERSION =
  "aurelia-ls/aot-jit-compiler-blueprint/v1" as const;

export type JitCompilerBlueprintPath = readonly (string | number)[];

export interface JitCompilerBlueprintAttribute {
  readonly name: string;
  readonly value: string;
  readonly namespaceUri: string | null;
  readonly prefix: string | null;
}

export type JitCompilerBlueprintNode =
  | { readonly kind: "fragment"; readonly children: readonly JitCompilerBlueprintNode[] }
  | {
      readonly kind: "element";
      readonly tagName: string;
      readonly namespaceUri: string;
      readonly attributes: readonly JitCompilerBlueprintAttribute[];
      readonly children: readonly JitCompilerBlueprintNode[];
      readonly content: readonly JitCompilerBlueprintNode[] | null;
    }
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "comment"; readonly value: string }
  | { readonly kind: "doctype"; readonly name: string; readonly publicId: string; readonly systemId: string };

export type JitCompilerBlueprintTemplate =
  | { readonly kind: "absent" }
  | { readonly kind: "markup"; readonly value: string }
  | {
      readonly kind: "template";
      readonly namespaceUri: string;
      readonly attributes: readonly JitCompilerBlueprintAttribute[];
      readonly content: readonly JitCompilerBlueprintNode[];
    }
  | { readonly kind: "node"; readonly node: JitCompilerBlueprintNode };

export type JitCompilerBlueprintDefinitionOwner =
  | { readonly kind: "root" }
  | {
      readonly kind: "template-controller" | "instruction-definition";
      readonly parentDefinitionIndex: number;
      readonly rowIndex: number;
      readonly instructionIndex: number;
      readonly instructionKind: string;
      readonly fieldPath: JitCompilerBlueprintPath;
    }
  | {
      readonly kind: "projection";
      readonly parentDefinitionIndex: number;
      readonly rowIndex: number;
      readonly instructionIndex: number;
      readonly instructionKind: string;
      readonly slotName: string;
      readonly fieldPath: JitCompilerBlueprintPath;
    };

export interface JitCompilerBlueprintTargetMarker {
  /** Final-DOM marker-shape candidate; the JIT product carries no authored/generated origin identity. */
  readonly ordinal: number;
  readonly rowIndex: number | null;
  readonly kind: "marker-target" | "render-location" | "open";
  readonly markerPath: JitCompilerBlueprintPath;
  readonly targetPath: JitCompilerBlueprintPath | null;
  readonly targetNodeKind: "element" | "text" | "comment" | "doctype" | null;
  readonly startPath: JitCompilerBlueprintPath | null;
  readonly endPath: JitCompilerBlueprintPath | null;
}

export interface JitCompilerBlueprintDefinition {
  readonly definitionIndex: number;
  readonly owner: JitCompilerBlueprintDefinitionOwner;
  readonly name: { readonly kind: "declared"; readonly value: string } | { readonly kind: "compiler-generated" };
  readonly type: string;
  readonly needsCompile: boolean | null;
  readonly containerless: boolean;
  readonly hasSlots: boolean;
  readonly shadowOptions: { readonly mode: string } | null;
  readonly enhance: boolean;
  readonly capture: CompilerCaseData;
  readonly bindables: CompilerCaseData;
  readonly dependencies: readonly CompilerCaseData[];
  readonly executableFields: {
    readonly hasType: boolean;
    readonly hasProcessContent: boolean;
  };
  readonly template: JitCompilerBlueprintTemplate;
  readonly targetAlignment: "wire-count-aligned" | "unresolved";
  readonly targetMarkers: readonly JitCompilerBlueprintTargetMarker[];
  readonly rows: readonly (readonly CompilerCaseData[])[];
  readonly surrogates: readonly CompilerCaseData[];
}

export type JitCompilerBlueprintOutcome =
  | {
      readonly kind: "compiled-definition";
      readonly rootDefinitionIndex: 0;
      readonly definitions: readonly JitCompilerBlueprintDefinition[];
    }
  | {
      readonly kind: "unchanged-definition";
      readonly rootDefinitionIndex: 0;
      readonly definitions: readonly JitCompilerBlueprintDefinition[];
    }
  | {
      readonly kind: "spread-instructions";
      readonly instructions: readonly CompilerCaseData[];
    }
  | {
      readonly kind: "compiler-error";
      readonly error: {
        readonly name: string;
        readonly code: string | null;
        readonly message: string;
      };
    };

export interface JitCompilerBlueprintObservationData {
  readonly schemaVersion: typeof JIT_COMPILER_BLUEPRINT_OBSERVER_VERSION;
  readonly caseId: string;
  readonly family: string;
  readonly entryKind: CompilerCase["world"]["entry"]["kind"];
  readonly expectedProduct: CompilerOracleExpectedProduct;
  readonly caseDigest: string;
  readonly worldDigest: string;
  readonly outcome: JitCompilerBlueprintOutcome;
}

/** Exact canonical observation and its convenience digest; the digest is never the comparison authority. */
export class JitCompilerBlueprintObservation {
  readonly canonicalData: string;
  readonly digest: string;

  constructor(readonly data: JitCompilerBlueprintObservationData) {
    assertCompilerCaseData(data, `${data.caseId}/jit-blueprint`);
    this.canonicalData = canonicalCompilerJson(data);
    this.digest = digestText(this.canonicalData);
  }
}

export interface JitCompilerBlueprintBatchData {
  readonly schemaVersion: typeof JIT_COMPILER_BLUEPRINT_OBSERVER_VERSION;
  readonly selectedCaseCount: number;
  readonly caseSetDigest: string;
  readonly observations: readonly JitCompilerBlueprintObservationData[];
}

/** One sequential batch over a shared process platform, stripped of nondeterministic timing and generated names. */
export class JitCompilerBlueprintBatch {
  readonly data: JitCompilerBlueprintBatchData;
  readonly canonicalData: string;
  readonly digest: string;

  constructor(readonly observations: readonly JitCompilerBlueprintObservation[]) {
    this.data = {
      schemaVersion: JIT_COMPILER_BLUEPRINT_OBSERVER_VERSION,
      selectedCaseCount: observations.length,
      caseSetDigest: digestCanonical(observations.map((observation) => ({
        caseId: observation.data.caseId,
        caseDigest: observation.data.caseDigest,
      }))),
      observations: observations.map((observation) => observation.data),
    };
    assertCompilerCaseData(this.data, "jit-blueprint-batch");
    this.canonicalData = canonicalCompilerJson(this.data);
    this.digest = digestText(this.canonicalData);
  }
}

/** Digest is a fast precheck only; canonical structural data remains the equality authority. */
export function sameJitCompilerBlueprintBatch(
  left: JitCompilerBlueprintBatch,
  right: JitCompilerBlueprintBatch,
): boolean {
  return left.digest === right.digest && left.canonicalData === right.canonicalData;
}

/** Observation-only adapter that reuses the established JIT case world/setup executor. */
export class JitCompilerBlueprintObserver {
  constructor(readonly executor: JitCompilerCaseExecutor) {}

  async observeCase(candidate: CompilerCase, oracle: JitCompilerOracle): Promise<JitCompilerBlueprintObservation> {
    const expectedProduct = frameworkJitExpectedProduct(candidate);
    const execution = await this.executor.captureOutcome(candidate, oracle);
    if (execution.kind !== expectedProduct) {
      throw new Error(
        `JIT blueprint case ${candidate.id} expected ${expectedProduct}, received ${execution.kind}.`,
      );
    }
    return new JitCompilerBlueprintObservation({
      schemaVersion: JIT_COMPILER_BLUEPRINT_OBSERVER_VERSION,
      caseId: candidate.id,
      family: candidate.family,
      entryKind: candidate.world.entry.kind,
      expectedProduct,
      caseDigest: digestCanonical(candidate),
      worldDigest: digestCanonical(candidate.world),
      outcome: normalizeOutcome(execution, candidate),
    });
  }

  async observeCases(
    cases: readonly CompilerCase[],
    oracle: JitCompilerOracle,
  ): Promise<JitCompilerBlueprintBatch> {
    const observations: JitCompilerBlueprintObservation[] = [];
    for (const candidate of cases) {
      observations.push(await this.observeCase(candidate, oracle));
    }
    return new JitCompilerBlueprintBatch(observations);
  }
}

/** Normalize one already-compiled definition family without re-entering the compiler or owning its lifecycle. */
export function normalizeJitCompiledDefinitionFamily(
  definition: IElementComponentDefinition,
  rootNameIntent: string,
): readonly JitCompilerBlueprintDefinition[] {
  return new DefinitionFamilyNormalizer("compiler-output", rootNameIntent).normalize(definition);
}

interface InstructionLocation {
  readonly parentDefinitionIndex: number;
  readonly rowIndex: number;
  readonly instructionIndex: number;
  readonly instructionType: number;
  readonly path: JitCompilerBlueprintPath;
}

interface DefinitionRecord {
  readonly definition: IElementComponentDefinition;
  readonly owner: JitCompilerBlueprintDefinitionOwner;
  normalized: JitCompilerBlueprintDefinition | null;
  normalizing: boolean;
}

type DefinitionFamilyPosture = "compiler-output" | "precompiled-wire";

class DefinitionFamilyNormalizer {
  private readonly definitionIndexes = new WeakMap<object, number>();
  private readonly records: DefinitionRecord[] = [];
  private readonly values = new BlueprintValueNormalizer(this);

  constructor(
    private readonly posture: DefinitionFamilyPosture,
    private readonly rootNameIntent: string,
  ) {}

  normalize(root: IElementComponentDefinition): readonly JitCompilerBlueprintDefinition[] {
    const rootIndex = this.register(root, { kind: "root" });
    if (rootIndex !== 0) throw new Error("JIT blueprint root definition did not receive index zero.");
    this.normalizeDefinition(rootIndex);
    return this.records.map((record, index) => {
      if (record.normalized == null) {
        throw new Error(`JIT blueprint definition ${index} was discovered but not normalized.`);
      }
      return record.normalized;
    });
  }

  reference(definition: IElementComponentDefinition, location: InstructionLocation): CompilerCaseData {
    const owner = definitionOwner(location);
    const index = this.register(definition, owner);
    this.normalizeDefinition(index);
    return { kind: "compiled-definition-reference", definitionIndex: index };
  }

  acceptsChildDefinition(value: unknown): value is IElementComponentDefinition {
    return this.posture === "compiler-output"
      ? isCompilerOutputDefinition(value)
      : isPrecompiledWireDefinition(value);
  }

  private register(definition: IElementComponentDefinition, owner: JitCompilerBlueprintDefinitionOwner): number {
    const existing = this.definitionIndexes.get(definition);
    if (existing != null) {
      const previousOwner = this.records[existing]!.owner;
      if (canonicalCompilerJson(previousOwner) !== canonicalCompilerJson(owner)) {
        throw new Error(`JIT compiled definition ${existing} is referenced by more than one owner path.`);
      }
      return existing;
    }
    const index = this.records.length;
    this.definitionIndexes.set(definition, index);
    this.records.push({ definition, owner, normalized: null, normalizing: false });
    return index;
  }

  private normalizeDefinition(index: number): void {
    const record = this.records[index]!;
    if (record.normalized != null || record.normalizing) return;
    record.normalizing = true;
    try {
      const definition = record.definition;
      const rows = (definition.instructions ?? []).map((row, rowIndex) =>
        row.map((instruction, instructionIndex) => this.values.instruction(instruction, {
          parentDefinitionIndex: index,
          rowIndex,
          instructionIndex,
          instructionType: instruction.type,
          path: [],
        }))
      );
      const surrogates = (definition.surrogates ?? []).map((instruction, instructionIndex) =>
        this.values.instruction(instruction, {
          parentDefinitionIndex: index,
          rowIndex: -1,
          instructionIndex,
          instructionType: instruction.type,
          path: ["surrogates", instructionIndex],
        })
      );
      const template = normalizeTemplate(definition.template);
      const targetMarkers = collectTargetMarkers(definition.template, rows.length);
      const hasStructuralTemplate = template.kind === "template" || template.kind === "node";
      record.normalized = {
        definitionIndex: index,
        owner: record.owner,
        name: this.definitionName(index, definition),
        type: definition.type ?? "custom-element",
        needsCompile: definition.needsCompile ?? null,
        containerless: definition.containerless ?? false,
        hasSlots: definition.hasSlots ?? false,
        shadowOptions: definition.shadowOptions == null ? null : { mode: definition.shadowOptions.mode },
        enhance: definition.enhance ?? false,
        capture: this.values.value(definition.capture ?? false, null, ["capture"]),
        bindables: definition.bindables == null ? {} : this.values.definitionBindables(definition.bindables),
        dependencies: (definition.dependencies ?? []).map((dependency, dependencyIndex) =>
          this.values.value(dependency, null, ["dependencies", dependencyIndex])
        ),
        executableFields: {
          hasType: definition.Type != null,
          hasProcessContent: definition.processContent != null,
        },
        template,
        targetAlignment: hasStructuralTemplate && targetMarkers.length === rows.length
          ? "wire-count-aligned"
          : "unresolved",
        targetMarkers,
        rows,
        surrogates,
      };
    } finally {
      record.normalizing = false;
    }
  }

  private definitionName(
    index: number,
    definition: IElementComponentDefinition,
  ): JitCompilerBlueprintDefinition["name"] {
    if (this.posture === "precompiled-wire") {
      return { kind: "declared", value: definition.name };
    }
    return index === 0 && this.rootNameIntent.length > 0
      ? { kind: "declared", value: this.rootNameIntent }
      : { kind: "compiler-generated" };
  }
}

class BlueprintValueNormalizer {
  private readonly referenceIndexes = new WeakMap<object, number>();
  private readonly symbolReferenceIndexes = new Map<symbol, number>();
  private nextReferenceIndex = 0;

  constructor(private readonly family: DefinitionFamilyNormalizer | null) {}

  instruction(instruction: IInstruction, location: InstructionLocation): CompilerCaseData {
    const result: Record<string, CompilerCaseData> = {
      kind: instructionKind(instruction.type),
      type: instruction.type,
    };
    for (const key of enumerableDataPropertyNames(instruction, `JIT instruction ${instruction.type}`, true)) {
      if (key === "type") continue;
      const fieldValue = dataPropertyValue(instruction, key, `JIT instruction ${instruction.type}`);
      result[key] = this.instructionField(instruction.type, key, fieldValue, location);
    }
    return result;
  }

  definitionBindables(value: unknown): CompilerCaseData {
    if (Array.isArray(value)) return this.value(value, null, ["bindables"]);
    if (value == null || typeof value !== "object") {
      throw new Error("JIT compiled-definition bindables must be an authored array or normalized record.");
    }
    return this.bindableDescriptions(value as Readonly<Record<string, {
      readonly attribute: string;
      readonly callback: string;
      readonly mode: number;
      readonly name: string;
      readonly set: object & { readonly name?: string };
    }>>);
  }

  private instructionField(
    instructionType: number,
    key: string,
    value: unknown,
    location: InstructionLocation,
  ): CompilerCaseData {
    const path = [...location.path, key];
    if (
      key === "res"
      && (
        instructionType === itHydrateElement
        || instructionType === itHydrateAttribute
        || instructionType === itHydrateTemplateController
      )
    ) {
      return this.resourceValue(value, path);
    }
    if (instructionType === itHydrateTemplateController && key === "def") {
      return this.compiledDefinition(value, location, path);
    }
    if (instructionType === itHydrateElement && key === "projections") {
      return this.projections(value, location);
    }
    if (
      (key === "props" && (
        instructionType === itHydrateElement
        || instructionType === itHydrateAttribute
        || instructionType === itHydrateTemplateController
        || instructionType === itIteratorBinding
      ))
      || (instructionType === itHydrateLetElement && key === "instructions")
    ) {
      return this.nestedInstructions(value, location, path);
    }
    if (instructionType === itSpreadElementProp && key === "instruction") {
      return this.nestedInstruction(value, location, path);
    }
    return this.value(value, location, path);
  }

  value(
    value: unknown,
    location: InstructionLocation | null,
    path: JitCompilerBlueprintPath,
    ancestors: Set<object> = new Set(),
  ): CompilerCaseData {
    if (value === undefined) return { kind: "undefined" };
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (!Number.isFinite(value) || Object.is(value, -0)) {
        throw new Error(`JIT blueprint value ${pathLabel(path)} contains a non-canonical number.`);
      }
      return value;
    }
    if (typeof value === "bigint") return { kind: "bigint", value: value.toString() };
    if (typeof value === "symbol") {
      const globalKey = Symbol.keyFor(value);
      return globalKey == null
        ? {
            kind: "local-symbol-reference",
            referenceIndex: this.symbolReferenceIndex(value),
            description: value.description ?? null,
          }
        : { kind: "global-symbol-reference", key: globalKey };
    }
    if (typeof value === "function") return this.functionReference(value);
    if (value instanceof CustomElementDefinition || value instanceof CustomAttributeDefinition) {
      return this.resourceReference(value, value);
    }
    if (isDomNode(value)) return normalizeDomNode(value) as unknown as CompilerCaseData;
    if (ancestors.has(value)) {
      throw new Error(`JIT blueprint value ${pathLabel(path)} contains a cycle outside compiled-definition edges.`);
    }
    ancestors.add(value);
    try {
      if (Array.isArray(value)) {
        assertCanonicalArray(value, pathLabel(path));
        return value.map((child, index) => this.value(child, location, [...path, index], ancestors));
      }
      if (value instanceof AttrSyntax) {
        return {
          kind: "attribute-syntax",
          fields: this.recordFields(value, location, path, ancestors),
        };
      }
      const prototype: unknown = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        const constructorName = (prototype as { readonly constructor?: { readonly name?: string } }).constructor?.name;
        throw new Error(
          `JIT blueprint value ${pathLabel(path)} has unsupported prototype ${constructorName || "<anonymous>"}.`,
        );
      }
      return this.recordFields(value, location, path, ancestors);
    } finally {
      ancestors.delete(value);
    }
  }

  private projections(value: unknown, location: InstructionLocation): CompilerCaseData {
    if (value == null) return null;
    if (typeof value !== "object" || Array.isArray(value)) {
      throw new Error("JIT hydrate-element projections must be a keyed object or null.");
    }
    return enumerableDataPropertyNames(value, "JIT hydrate-element projections", false).map((slotName) => {
      const definition = dataPropertyValue(value, slotName, "JIT hydrate-element projections");
      return {
        slotName,
        definition: this.compiledDefinition(
          definition,
          location,
          [...location.path, "projections", slotName],
        ),
      };
    });
  }

  private compiledDefinition(
    value: unknown,
    location: InstructionLocation,
    path: JitCompilerBlueprintPath,
  ): CompilerCaseData {
    if (this.family == null || !this.family.acceptsChildDefinition(value)) {
      throw new Error(`JIT child-definition field ${pathLabel(path)} does not contain a compiled definition.`);
    }
    return this.family.reference(value, { ...location, path });
  }

  private nestedInstructions(
    value: unknown,
    location: InstructionLocation,
    path: JitCompilerBlueprintPath,
  ): CompilerCaseData {
    if (!Array.isArray(value)) {
      throw new Error(`JIT nested-instruction field ${pathLabel(path)} is not an array.`);
    }
    assertCanonicalArray(value, pathLabel(path));
    return value.map((candidate, index) => this.nestedInstruction(candidate, location, [...path, index]));
  }

  private nestedInstruction(
    value: unknown,
    location: InstructionLocation,
    path: JitCompilerBlueprintPath,
  ): CompilerCaseData {
    if (value == null || typeof value !== "object") {
      throw new Error(`JIT nested-instruction field ${pathLabel(path)} does not contain an instruction.`);
    }
    const type = dataPropertyValue(value, "type", `JIT nested-instruction field ${pathLabel(path)}`);
    if (!Number.isSafeInteger(type) || (type as number) < 0) {
      throw new Error(`JIT nested-instruction field ${pathLabel(path)} has an invalid instruction type.`);
    }
    return this.instruction(value as IInstruction, { ...location, instructionType: type as number, path });
  }

  private resourceValue(value: unknown, path: JitCompilerBlueprintPath): CompilerCaseData {
    if (typeof value === "string") return { kind: "resource-name-reference", name: value };
    if (typeof value === "function") return this.functionReference(value);
    if (value instanceof CustomElementDefinition || value instanceof CustomAttributeDefinition) {
      return this.resourceReference(value, value);
    }
    throw new Error(`JIT resource field ${pathLabel(path)} has an unsupported value.`);
  }

  private functionReference(value: object & { readonly name?: string }): CompilerCaseData {
    if (CustomElement.isType(value)) {
      return this.resourceReference(value, CustomElement.getDefinition(value));
    }
    if (CustomAttribute.isType(value)) {
      return this.resourceReference(value, CustomAttribute.getDefinition(value));
    }
    return this.opaqueFunctionReference(value);
  }

  private opaqueFunctionReference(value: object & { readonly name?: string }): CompilerCaseData {
    return {
      kind: "opaque-function-reference",
      referenceIndex: this.referenceIndex(value),
      name: value.name || null,
    };
  }

  private resourceReference(
    value: object,
    definition: CustomElementDefinition | CustomAttributeDefinition,
  ): CompilerCaseData {
    const common = {
      kind: "resource-reference",
      referenceIndex: this.referenceIndex(value),
      resourceKey: definition.key,
      name: definition.name,
      aliases: definition.aliases,
      bindables: this.bindableDescriptions(definition.bindables),
    };
    if (definition instanceof CustomElementDefinition) {
      return {
        ...common,
        resourceKind: "custom-element",
        capture: typeof definition.capture === "function"
          ? this.opaqueFunctionReference(definition.capture)
          : definition.capture,
        containerless: definition.containerless,
        enhance: definition.enhance,
        hasSlots: definition.hasSlots,
        needsCompile: definition.needsCompile,
        processContent: definition.processContent == null
          ? null
          : this.opaqueFunctionReference(definition.processContent),
        shadowMode: definition.shadowOptions?.mode ?? null,
        strict: definition.strict ?? null,
        Type: this.opaqueFunctionReference(definition.Type),
      };
    }
    return {
      ...common,
      resourceKind: "custom-attribute",
      defaultProperty: definition.defaultProperty,
      isTemplateController: definition.isTemplateController,
      noMultiBindings: definition.noMultiBindings,
      containerStrategy: definition.containerStrategy,
      Type: this.opaqueFunctionReference(definition.Type),
    };
  }

  private bindableDescriptions(
    bindables: Readonly<Record<string, {
      readonly attribute: string;
      readonly callback: string;
      readonly mode: number;
      readonly name: string;
      readonly set: object & { readonly name?: string };
    }>>,
  ): CompilerCaseData {
    return enumerableDataPropertyNames(bindables, "JIT resource bindables", true).map((property) => {
      const bindable = dataPropertyValue(bindables, property, "JIT resource bindables") as {
        readonly attribute: string;
        readonly callback: string;
        readonly mode: number;
        readonly name: string;
        readonly set: object & { readonly name?: string };
      };
      return {
        property,
        name: bindable.name,
        attribute: bindable.attribute,
        callback: bindable.callback,
        mode: bindable.mode,
        set: this.opaqueFunctionReference(bindable.set),
      };
    });
  }

  private referenceIndex(value: object): number {
    const existing = this.referenceIndexes.get(value);
    if (existing != null) return existing;
    const index = this.nextReferenceIndex++;
    this.referenceIndexes.set(value, index);
    return index;
  }

  private symbolReferenceIndex(value: symbol): number {
    const existing = this.symbolReferenceIndexes.get(value);
    if (existing != null) return existing;
    const index = this.nextReferenceIndex++;
    this.symbolReferenceIndexes.set(value, index);
    return index;
  }

  private recordFields(
    value: object,
    location: InstructionLocation | null,
    path: JitCompilerBlueprintPath,
    ancestors: Set<object>,
  ): CompilerCaseData {
    const result: Record<string, CompilerCaseData> = {};
    const taggedTemplate = hasTaggedTemplateKind(value);
    for (const key of enumerableDataPropertyNames(value, `JIT blueprint value ${pathLabel(path)}`, true)) {
      const fieldValue = dataPropertyValue(value, key, `JIT blueprint value ${pathLabel(path)}`);
      if (taggedTemplate && key === "cooked") {
        if (!Array.isArray(fieldValue)) {
          throw new Error(`JIT tagged-template value ${pathLabel(path)} has no cooked array.`);
        }
        result[key] = normalizeJitTaggedTemplateCooked(fieldValue, pathLabel([...path, key]));
      } else {
        result[key] = this.value(fieldValue, location, [...path, key], ancestors);
      }
    }
    return result;
  }
}

function normalizeOutcome(
  outcome: JitCompilerCaseOutcome,
  candidate: CompilerCase,
): JitCompilerBlueprintOutcome {
  switch (outcome.kind) {
    case "compiled-definition": {
      if (candidate.world.entry.kind !== "compile") {
        throw new Error(`JIT case ${candidate.id} produced a definition from a non-compile entry.`);
      }
      return {
        kind: "compiled-definition",
        rootDefinitionIndex: 0,
        definitions: normalizeJitCompiledDefinitionFamily(
          outcome.value,
          candidate.world.entry.definition.name,
        ),
      };
    }
    case "unchanged-definition": {
      if (candidate.world.entry.kind !== "compile") {
        throw new Error(`JIT case ${candidate.id} bypassed from a non-compile entry.`);
      }
      return {
        kind: "unchanged-definition",
        rootDefinitionIndex: 0,
        definitions: new DefinitionFamilyNormalizer(
          "precompiled-wire",
          candidate.world.entry.definition.name,
        ).normalize(outcome.value),
      };
    }
    case "spread-instructions": {
      const values = new BlueprintValueNormalizer(null);
      return {
        kind: "spread-instructions",
        instructions: outcome.value.map((instruction, instructionIndex) => values.instruction(instruction, {
          parentDefinitionIndex: -1,
          rowIndex: -1,
          instructionIndex,
          instructionType: instruction.type,
          path: [],
        })),
      };
    }
    case "compiler-error":
      return {
        kind: "compiler-error",
        error: normalizedError(outcome.error),
      };
  }
}

function normalizeTemplate(value: IElementComponentDefinition["template"]): JitCompilerBlueprintTemplate {
  if (value == null) return { kind: "absent" };
  if (typeof value === "string") return { kind: "markup", value };
  if (isTemplateElement(value)) {
    return {
      kind: "template",
      namespaceUri: value.namespaceURI ?? "",
      attributes: normalizeAttributes(value.attributes),
      content: Array.from(value.content.childNodes, normalizeDomNode),
    };
  }
  if (isDomNode(value)) return { kind: "node", node: normalizeDomNode(value) };
  throw new Error("JIT definition template is neither markup nor a DOM node.");
}

function normalizeDomNode(node: globalThis.Node): JitCompilerBlueprintNode {
  switch (node.nodeType) {
    case 11:
      return {
        kind: "fragment",
        children: Array.from(node.childNodes, normalizeDomNode),
      };
    case 1: {
      const element = node as globalThis.Element;
      return {
        kind: "element",
        tagName: element.localName,
        namespaceUri: element.namespaceURI ?? "",
        attributes: normalizeAttributes(element.attributes),
        children: isTemplateElement(element)
          ? []
          : Array.from(element.childNodes, normalizeDomNode),
        content: isTemplateElement(element)
          ? Array.from(element.content.childNodes, normalizeDomNode)
          : null,
      };
    }
    case 3:
      return { kind: "text", value: node.nodeValue ?? "" };
    case 8:
      return { kind: "comment", value: node.nodeValue ?? "" };
    case 10: {
      const doctype = node as globalThis.DocumentType;
      return {
        kind: "doctype",
        name: doctype.name,
        publicId: doctype.publicId,
        systemId: doctype.systemId,
      };
    }
    default:
      throw new Error(`JIT blueprint encountered unsupported DOM node type ${node.nodeType}.`);
  }
}

function normalizeAttributes(attributes: globalThis.NamedNodeMap): readonly JitCompilerBlueprintAttribute[] {
  return Array.from(attributes, (attribute) => ({
    name: attribute.name,
    value: attribute.value,
    namespaceUri: attribute.namespaceURI,
    prefix: attribute.prefix,
  }));
}

function collectTargetMarkers(
  template: IElementComponentDefinition["template"],
  rowCount: number,
): readonly JitCompilerBlueprintTargetMarker[] {
  const candidates: Omit<JitCompilerBlueprintTargetMarker, "ordinal" | "rowIndex">[] = [];
  if (isTemplateElement(template)) {
    collectTargetMarkersFromSiblings(template.content.childNodes, ["content"], candidates);
  } else if (isDomNode(template)) {
    collectTargetMarkersFromSiblings(template.childNodes, ["node", "children"], candidates);
  }
  const exact = candidates.length === rowCount;
  return candidates.map((candidate, ordinal) => ({
    ordinal,
    rowIndex: exact ? ordinal : null,
    ...candidate,
  }));
}

function collectTargetMarkersFromSiblings(
  siblings: globalThis.NodeListOf<globalThis.ChildNode>,
  collectionPath: JitCompilerBlueprintPath,
  output: Omit<JitCompilerBlueprintTargetMarker, "ordinal" | "rowIndex">[],
): void {
  for (let index = 0; index < siblings.length; ++index) {
    const node = siblings[index]!;
    const path = [...collectionPath, index];
    if (node.nodeType === 8 && node.nodeValue === "au") {
      const next = siblings[index + 1] ?? null;
      const afterNext = siblings[index + 2] ?? null;
      if (
        next?.nodeType === 8
        && next.nodeValue === "au-start"
        && afterNext?.nodeType === 8
        && afterNext.nodeValue === "au-end"
      ) {
        output.push({
          kind: "render-location",
          markerPath: path,
          targetPath: [...collectionPath, index + 2],
          targetNodeKind: "comment",
          startPath: [...collectionPath, index + 1],
          endPath: [...collectionPath, index + 2],
        });
      } else {
        output.push({
          kind: next == null ? "open" : "marker-target",
          markerPath: path,
          targetPath: next == null ? null : [...collectionPath, index + 1],
          targetNodeKind: next == null ? null : domNodeKind(next),
          startPath: null,
          endPath: null,
        });
      }
    }
    if (node.nodeType === 1) {
      const element = node as globalThis.Element;
      if (!isTemplateElement(element)) {
        collectTargetMarkersFromSiblings(element.childNodes, [...path, "children"], output);
      }
    }
  }
}

function domNodeKind(node: globalThis.Node): JitCompilerBlueprintTargetMarker["targetNodeKind"] {
  switch (node.nodeType) {
    case 1: return "element";
    case 3: return "text";
    case 8: return "comment";
    case 10: return "doctype";
    default: return null;
  }
}

function definitionOwner(location: InstructionLocation): JitCompilerBlueprintDefinitionOwner {
  const projectionIndex = location.path.lastIndexOf("projections");
  const instructionKindName = instructionKind(location.instructionType);
  if (projectionIndex >= 0) {
    const slotName = location.path[projectionIndex + 1];
    if (typeof slotName !== "string") {
      throw new Error(`JIT projection definition at ${pathLabel(location.path)} has no slot-name segment.`);
    }
    return {
      kind: "projection",
      parentDefinitionIndex: location.parentDefinitionIndex,
      rowIndex: location.rowIndex,
      instructionIndex: location.instructionIndex,
      instructionKind: instructionKindName,
      slotName,
      fieldPath: location.path,
    };
  }
  return {
    kind: location.instructionType === itHydrateTemplateController
      ? "template-controller"
      : "instruction-definition",
    parentDefinitionIndex: location.parentDefinitionIndex,
    rowIndex: location.rowIndex,
    instructionIndex: location.instructionIndex,
    instructionKind: instructionKindName,
    fieldPath: location.path,
  };
}

function enumerableDataPropertyNames(
  value: object,
  label: string,
  sort: boolean,
): readonly string[] {
  const names: string[] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      throw new Error(`${label} contains unsupported symbol key ${String(key)}.`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor == null || !("value" in descriptor)) {
      throw new Error(`${label}.${key} is not a data property.`);
    }
    if (!descriptor.enumerable) {
      throw new Error(`${label}.${key} is non-enumerable.`);
    }
    names.push(key);
  }
  return sort ? names.sort() : names;
}

function dataPropertyValue(value: object, key: string, label: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor == null || !("value" in descriptor) || !descriptor.enumerable) {
    throw new Error(`${label}.${key} is not one enumerable data property.`);
  }
  return descriptor.value;
}

function assertCanonicalArray(value: readonly unknown[], label: string): void {
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string")) {
    throw new Error(`${label} contains an unsupported symbol array key.`);
  }
  const names = (keys as string[]).filter((key) => key !== "length");
  if (names.length !== value.length) {
    throw new Error(`${label} is sparse or contains extended array properties.`);
  }
  for (let index = 0; index < value.length; ++index) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor == null || !("value" in descriptor) || !descriptor.enumerable) {
      throw new Error(`${label}[${index}] is not one enumerable data property.`);
    }
  }
}

function normalizeJitTaggedTemplateCooked(
  value: readonly unknown[],
  label: string,
): CompilerCaseData {
  const rawDescriptor = Object.getOwnPropertyDescriptor(value, "raw");
  if (rawDescriptor == null) throw new Error(`${label} has no tagged-template raw array.`);
  const rawValue: unknown = "value" in rawDescriptor ? rawDescriptor.value : null;
  if (!rawDescriptor.enumerable || !Array.isArray(rawValue)) {
    throw new Error(`${label} has no enumerable tagged-template raw string array.`);
  }
  assertTaggedTemplateCookedArray(value, label);
  const raw = rawValue;
  if (raw !== value) assertCanonicalArray(raw, `${label}.raw`);
  assertTaggedTemplateStrings(raw, `${label}.raw`);
  if (value.length !== raw.length) {
    throw new Error(`${label} has different tagged-template cooked and raw lengths.`);
  }
  return {
    kind: "tagged-template-cooked",
    cooked: canonicalJitTaggedTemplateStrings(value, label),
    raw: canonicalJitTaggedTemplateStrings(raw, `${label}.raw`),
  };
}

function hasTaggedTemplateKind(value: object): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(value, "$kind");
  return descriptor != null
    && "value" in descriptor
    && descriptor.enumerable === true
    && descriptor.value === "TaggedTemplate";
}

function assertTaggedTemplateCookedArray(value: readonly unknown[], label: string): void {
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string")) {
    throw new Error(`${label} contains an unsupported tagged-template symbol key.`);
  }
  const names = (keys as string[]).filter((key) => key !== "length" && key !== "raw");
  if (names.length !== value.length) {
    throw new Error(`${label} is sparse or contains an unsupported tagged-template property.`);
  }
  assertTaggedTemplateStrings(value, label);
}

function assertTaggedTemplateStrings(value: readonly unknown[], label: string): void {
  for (let index = 0; index < value.length; ++index) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor == null
      || !("value" in descriptor)
      || !descriptor.enumerable
      || typeof descriptor.value !== "string"
    ) {
      throw new Error(`${label}[${index}] is not one enumerable tagged-template string.`);
    }
  }
}

function canonicalJitTaggedTemplateStrings(value: readonly unknown[], label: string): readonly string[] {
  return value.map((entry, index) => {
    if (typeof entry !== "string") {
      throw new Error(`${label}[${index}] is not a tagged-template string value.`);
    }
    return entry;
  });
}

function normalizedError(error: unknown): { readonly name: string; readonly code: string | null; readonly message: string } {
  const message = error instanceof Error ? error.message : String(error);
  return {
    name: error instanceof Error ? error.name : "ThrownValue",
    code: /\bAUR\d{4}\b/u.exec(message)?.[0] ?? null,
    message,
  };
}

function frameworkJitExpectedProduct(candidate: CompilerCase): CompilerOracleExpectedProduct {
  const lanes = candidate.oracles.lanes.filter((lane) => lane.id === "framework-jit");
  if (lanes.length !== 1) {
    throw new Error(`JIT blueprint case ${candidate.id} must declare exactly one framework-jit lane.`);
  }
  return lanes[0]!.expectedProduct;
}

function isCompilerOutputDefinition(value: unknown): value is JitCompiledDefinition {
  return isPrecompiledWireDefinition(value)
    && value.needsCompile === false
    && isTemplateElement(value.template);
}

function isPrecompiledWireDefinition(value: unknown): value is IElementComponentDefinition {
  if (value == null || typeof value !== "object") return false;
  const candidate = value as Partial<IElementComponentDefinition>;
  return candidate.type === "custom-element"
    && typeof candidate.name === "string"
    && (
      candidate.template == null
      || typeof candidate.template === "string"
      || isDomNode(candidate.template)
    )
    && (candidate.instructions === undefined || Array.isArray(candidate.instructions))
    && (candidate.surrogates === undefined || Array.isArray(candidate.surrogates));
}

function isTemplateElement(value: unknown): value is globalThis.HTMLTemplateElement {
  return isDomNode(value)
    && value.nodeType === 1
    && (value as globalThis.Element).localName === "template"
    && "content" in value;
}

function isDomNode(value: unknown): value is globalThis.Node {
  return value != null
    && typeof value === "object"
    && typeof (value as { readonly nodeType?: unknown }).nodeType === "number"
    && typeof (value as { readonly nodeName?: unknown }).nodeName === "string";
}

function instructionKind(type: number): string {
  switch (type) {
    case itHydrateElement: return "hydrate-element";
    case itHydrateAttribute: return "hydrate-attribute";
    case itHydrateTemplateController: return "hydrate-template-controller";
    case itHydrateLetElement: return "hydrate-let-element";
    case itSetProperty: return "set-property";
    case itInterpolation: return "interpolation";
    case itPropertyBinding: return "property-binding";
    case itLetBinding: return "let-binding";
    case itRefBinding: return "ref-binding";
    case itIteratorBinding: return "iterator-binding";
    case itMultiAttr: return "multi-attribute";
    case itTextBinding: return "text-binding";
    case itListenerBinding: return "listener-binding";
    case itAttributeBinding: return "attribute-binding";
    case itStylePropertyBinding: return "style-property-binding";
    case itSetAttribute: return "set-attribute";
    case itSetClassAttribute: return "set-class-attribute";
    case itSetStyleAttribute: return "set-style-attribute";
    case itSpreadTransferedBinding: return "spread-transferred-binding";
    case itSpreadElementProp: return "spread-element-property";
    case itSpreadValueBinding: return "spread-value-binding";
    default: return `instruction-${type}`;
  }
}

function pathLabel(path: JitCompilerBlueprintPath): string {
  return path.length === 0 ? "$" : `$.${path.map(String).join(".")}`;
}

function digestCanonical(value: unknown): string {
  return digestText(canonicalCompilerJson(value));
}

function digestText(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
