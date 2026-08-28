import { createHash } from "node:crypto";

import {
  TemplateCompilerFrameworkInstructionType,
  TemplateCompilerRuntimeElementDataKind,
  TemplateCompilerRuntimeInstructionFamilyState,
  type RuntimeExpressionAstValue,
  type TemplateCompilerRuntimeDefinitionReferenceValue,
  type TemplateCompilerRuntimeElementDataValue,
  type TemplateCompilerRuntimeInstructionFamilyResult,
  type TemplateCompilerRuntimeInstructionValue,
  type TemplateCompilerRuntimeProjectionValue,
  type TemplateCompilerRuntimeResourceNameValue,
} from "@aurelia-ls/semantic-runtime/browser-template";
import type { CompilerCaseData } from "./compiler-case.js";
import {
  assertCompilerCaseData,
  canonicalCompilerJson,
} from "./compiler-canonical-data.js";
import { orderSemanticFrozenFamilyDefinitions } from "./semantic-frozen-family-observer.js";

export const SEMANTIC_RUNTIME_INSTRUCTION_FAMILY_OBSERVER_VERSION =
  "aurelia-ls/aot-semantic-runtime-instruction-family/v1" as const;

export type SemanticRuntimeInstructionFamilyObservation =
  | {
      readonly schemaVersion: typeof SEMANTIC_RUNTIME_INSTRUCTION_FAMILY_OBSERVER_VERSION;
      readonly kind: "exact";
      readonly state: "exact";
      readonly resourceRepresentation: "name";
      readonly instructionCount: number;
      readonly rowInstructionCount: number;
      readonly wireDigest: string;
      readonly definitions: readonly {
        readonly definitionIndex: number;
        readonly rows: readonly (readonly CompilerCaseData[])[];
      }[];
    }
  | {
      readonly schemaVersion: typeof SEMANTIC_RUNTIME_INSTRUCTION_FAMILY_OBSERVER_VERSION;
      readonly kind: "unavailable";
      readonly state: "pending" | "ineligible";
      readonly reasonKinds: readonly string[];
    };

export function semanticRuntimeInstructionFamilyWireDigest(
  definitions: Extract<SemanticRuntimeInstructionFamilyObservation, { readonly kind: "exact" }>["definitions"],
): string {
  return digest(canonicalCompilerJson({ definitions }));
}

/** Plain-data normalization of semantic-runtime's framework-shaped instruction values. */
export function observeSemanticRuntimeInstructionFamily(
  result: TemplateCompilerRuntimeInstructionFamilyResult,
): SemanticRuntimeInstructionFamilyObservation {
  if (!result.isModuleConstructed()) {
    throw new Error("Runtime instruction observer requires a semantic-runtime-constructed result.");
  }
  if (result.state !== TemplateCompilerRuntimeInstructionFamilyState.Exact || result.value == null) {
    const observation: SemanticRuntimeInstructionFamilyObservation = {
      schemaVersion: SEMANTIC_RUNTIME_INSTRUCTION_FAMILY_OBSERVER_VERSION,
      kind: "unavailable",
      state: result.state === TemplateCompilerRuntimeInstructionFamilyState.Ineligible ? "ineligible" : "pending",
      reasonKinds: result.reasons.map((reason) => reason.reasonKind),
    };
    assertCompilerCaseData(observation, "semantic-runtime-instruction-family/unavailable");
    return observation;
  }
  if (!result.value.isCurrent()) throw new Error("Runtime instruction family changed before portable observation.");
  const ordered = orderSemanticFrozenFamilyDefinitions(result.value.family);
  const definitionIndexes = new Map(ordered.map((definition, index) => [definition.context, index]));
  const definitions = ordered.map((definition, definitionIndex) => ({
    definitionIndex,
    rows: definition.context.rows.map((row) => row.instructions.map((instruction) => {
      const value = result.value!.valueForInstruction(instruction);
      if (value == null) throw new Error(`Runtime instruction '${instruction.productHandle}' has no exact value.`);
      return normalizeInstruction(value, definitionIndexes);
    })),
  }));
  const observation: SemanticRuntimeInstructionFamilyObservation = {
    schemaVersion: SEMANTIC_RUNTIME_INSTRUCTION_FAMILY_OBSERVER_VERSION,
    kind: "exact",
    state: "exact",
    resourceRepresentation: result.value.resourceRepresentation,
    instructionCount: result.value.instructions.length,
    rowInstructionCount: definitions.reduce((count, definition) =>
      count + definition.rows.reduce((rowCount, row) => rowCount + row.length, 0)
    , 0),
    wireDigest: semanticRuntimeInstructionFamilyWireDigest(definitions),
    definitions,
  };
  assertCompilerCaseData(observation, "semantic-runtime-instruction-family/exact");
  return observation;
}

function normalizeInstruction(
  value: TemplateCompilerRuntimeInstructionValue,
  definitionIndexes: ReadonlyMap<object, number>,
): CompilerCaseData {
  switch (value.type) {
    case TemplateCompilerFrameworkInstructionType.PropertyBinding:
      return {
        kind: "property-binding",
        type: value.type,
        from: normalizeSemanticRuntimeExpressionAstForObservation(value.from),
        to: value.to,
        mode: value.mode,
      };
    case TemplateCompilerFrameworkInstructionType.Interpolation:
      return {
        kind: "interpolation",
        type: value.type,
        from: normalizeSemanticRuntimeExpressionAstForObservation(value.from),
        to: value.to,
      };
    case TemplateCompilerFrameworkInstructionType.ListenerBinding:
      return {
        kind: "listener-binding",
        type: value.type,
        capture: value.capture,
        from: normalizeSemanticRuntimeExpressionAstForObservation(value.from),
        modifier: value.modifier,
        to: value.to,
      };
    case TemplateCompilerFrameworkInstructionType.TextBinding:
      return {
        kind: "text-binding",
        type: value.type,
        from: normalizeSemanticRuntimeExpressionAstForObservation(value.from),
      };
    case TemplateCompilerFrameworkInstructionType.LetBinding:
      return {
        kind: "let-binding",
        type: value.type,
        from: normalizeSemanticRuntimeExpressionAstForObservation(value.from),
        to: value.to,
      };
    case TemplateCompilerFrameworkInstructionType.HydrateLetElement:
      return {
        kind: "hydrate-let-element",
        type: value.type,
        instructions: value.instructions.map((instruction) => normalizeInstruction(instruction, definitionIndexes)),
        toBindingContext: value.toBindingContext,
      };
    case TemplateCompilerFrameworkInstructionType.HydrateTemplateController:
      return {
        kind: "hydrate-template-controller",
        type: value.type,
        alias: { kind: "undefined" },
        def: normalizeDefinition(value.def, definitionIndexes),
        props: value.props.map((instruction) => normalizeInstruction(instruction, definitionIndexes)),
        res: normalizeResource(value.res),
      };
    case TemplateCompilerFrameworkInstructionType.HydrateElement:
      return {
        kind: "hydrate-element",
        type: value.type,
        captures: value.captures.map((capture) => normalizeUnknown(capture)),
        containerless: value.containerless,
        data: normalizeElementData(value.data),
        projections: value.projections?.map((projection) => normalizeProjection(projection, definitionIndexes)) ?? null,
        props: value.props.map((instruction) => normalizeInstruction(instruction, definitionIndexes)),
        res: normalizeResource(value.res),
      };
  }
}

function normalizeDefinition(
  value: TemplateCompilerRuntimeDefinitionReferenceValue,
  definitionIndexes: ReadonlyMap<object, number>,
): CompilerCaseData {
  const definitionIndex = definitionIndexes.get(value.definition) ?? null;
  if (definitionIndex == null) throw new Error("Runtime instruction references a foreign compiled definition.");
  return { kind: "compiled-definition-reference", definitionIndex };
}

function normalizeProjection(
  value: TemplateCompilerRuntimeProjectionValue,
  definitionIndexes: ReadonlyMap<object, number>,
): CompilerCaseData {
  return {
    slotName: value.slotName,
    definition: normalizeDefinition(value.definition, definitionIndexes),
  };
}

function normalizeResource(value: TemplateCompilerRuntimeResourceNameValue): CompilerCaseData {
  return { kind: "resource-name-reference", name: value.name };
}

function normalizeElementData(value: TemplateCompilerRuntimeElementDataValue): CompilerCaseData {
  switch (value.dataKind) {
    case TemplateCompilerRuntimeElementDataKind.None:
      return {};
    case TemplateCompilerRuntimeElementDataKind.AuSlot:
      return { name: value.name };
  }
}

export function normalizeSemanticRuntimeExpressionAstForObservation(
  value: RuntimeExpressionAstValue,
): CompilerCaseData {
  return normalizeUnknown(value);
}

function normalizeUnknown(value: unknown): CompilerCaseData {
  if (value === undefined) return { kind: "undefined" };
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) throw new Error("Runtime instruction contains noncanonical number.");
    return value;
  }
  if (Array.isArray(value)) return value.map(normalizeUnknown);
  if (typeof value !== "object") throw new Error(`Runtime instruction contains unsupported '${typeof value}' value.`);
  const taggedTemplate = hasTaggedTemplateKind(value);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    taggedTemplate && key === "cooked"
      ? normalizeTaggedTemplateCooked(child)
      : normalizeUnknown(child),
  ]));
}

function normalizeTaggedTemplateCooked(value: unknown): CompilerCaseData {
  if (!Array.isArray(value)) {
    throw new Error("Runtime tagged-template value has no cooked array.");
  }
  const rawDescriptor = Object.getOwnPropertyDescriptor(value, "raw");
  if (rawDescriptor == null) throw new Error("Runtime tagged-template cooked value has no raw array.");
  const rawValue: unknown = "value" in rawDescriptor ? rawDescriptor.value : null;
  if (!rawDescriptor.enumerable || !Array.isArray(rawValue)) {
    throw new Error("Runtime tagged-template cooked value has no enumerable raw string array.");
  }
  const cooked = canonicalTaggedTemplateStrings(value, "cooked");
  const raw = canonicalTaggedTemplateStrings(rawValue, "raw");
  assertTaggedTemplateCookedArray(value);
  if (rawValue !== value) assertPlainStringArray(rawValue, "raw");
  if (value.length !== rawValue.length) {
    throw new Error("Runtime tagged-template cooked and raw arrays have different lengths.");
  }
  return {
    kind: "tagged-template-cooked",
    cooked,
    raw,
  };
}

function hasTaggedTemplateKind(value: object): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(value, "$kind");
  return descriptor != null
    && "value" in descriptor
    && descriptor.enumerable === true
    && descriptor.value === "TaggedTemplate";
}

function assertTaggedTemplateCookedArray(value: readonly unknown[]): void {
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string")) {
    throw new Error("Runtime tagged-template cooked value contains a symbol key.");
  }
  const names = (keys as string[]).filter((key) => key !== "length" && key !== "raw");
  if (names.length !== value.length) {
    throw new Error("Runtime tagged-template cooked value is sparse or contains an unsupported property.");
  }
  assertStringElements(value, "cooked");
}

function assertPlainStringArray(value: readonly unknown[], label: string): void {
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string")) {
    throw new Error(`Runtime tagged-template ${label} value contains a symbol key.`);
  }
  const names = (keys as string[]).filter((key) => key !== "length");
  if (names.length !== value.length) {
    throw new Error(`Runtime tagged-template ${label} value is sparse or contains an extended property.`);
  }
  assertStringElements(value, label);
}

function assertStringElements(value: readonly unknown[], label: string): void {
  for (let index = 0; index < value.length; ++index) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor == null
      || !("value" in descriptor)
      || !descriptor.enumerable
      || typeof descriptor.value !== "string"
    ) {
      throw new Error(`Runtime tagged-template ${label}[${index}] is not one enumerable string value.`);
    }
  }
}

function canonicalTaggedTemplateStrings(value: readonly unknown[], label: string): readonly string[] {
  return value.map((entry, index) => {
    if (typeof entry !== "string") {
      throw new Error(`Runtime tagged-template ${label}[${index}] is not a string value.`);
    }
    return entry;
  });
}

function digest(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
