import { createHash } from "node:crypto";

import {
  CustomElementCaptureKind,
  TemplateCompilerCompiledDefinitionNameKind,
  TemplateCompilerCompiledDefinitionFamilyState,
  type TemplateCompilerCompiledDefinitionFamilyResult,
  type TemplateCompilerCompiledDefinitionOverlay,
} from "@aurelia-ls/semantic-runtime/browser-template";
import type { CompilerCaseData } from "./compiler-case.js";
import {
  assertCompilerCaseData,
  canonicalCompilerJson,
} from "./compiler-canonical-data.js";
import type {
  SemanticFrozenFamilyDefinition,
  SemanticFrozenFamilyNode,
  SemanticFrozenFamilyObservation,
} from "./semantic-frozen-family-observer.js";
import type { SemanticRuntimeInstructionFamilyObservation } from "./semantic-runtime-instruction-family-observer.js";

export const SEMANTIC_COMPILED_DEFINITION_FAMILY_OBSERVER_VERSION =
  "aurelia-ls/aot-semantic-compiled-definition-family/v2" as const;

export const SEMANTIC_COMPILED_DEFINITION_DEPENDENCY_POSTURE =
  "pre-rehydration-unique-source-declared-resource-identities" as const;

export const SEMANTIC_COMPILED_DEFINITION_COMMON_JIT_FIELDS = [
  "definition-index",
  "definition-owner",
  "name-intent",
  "resource-type",
  "needs-compile",
  "containerless",
  "has-slots",
  "shadow-options",
  "enhance",
  "capture-value",
  "bindable-values",
  "unique-source-declared-resource-dependency-identities",
  "transformed-template",
  "target-alignment",
  "target-markers",
  "runtime-instruction-rows",
  "surrogate-instruction-values",
] as const;

export const SEMANTIC_COMPILED_DEFINITION_OMITTED_FIELDS = [
  "root-type-executable-presence",
  "root-process-content-executable-presence",
  "root-aliases",
  "root-resource-key",
  "root-injectable",
  "root-watches",
  "root-strict",
  "root-semantic-target-identity",
  "root-definition-provenance",
  "native-slot-outlet-values",
  "concrete-generated-name",
  "runtime-rehydrated-anonymous-type",
  "dependency-executable-value-identities",
  "dependency-registry-module-and-plain-constructable-values",
  "repeated-source-dependency-registration-effects",
  "compiler-added-local-type-values",
  "post-rehydration-dependency-values",
] as const;

export type SemanticCompiledDefinitionSourceDependencyIdentity = Readonly<{
  [key: string]: CompilerCaseData;
  kind: "source-declared-resource-dependency";
  resourceKind: "custom-element" | "custom-attribute";
  resourceKey: string;
  name: string;
  aliases: readonly string[];
}>;

export function semanticCompiledDefinitionSourceDependencyIdentity(
  resourceKind: SemanticCompiledDefinitionSourceDependencyIdentity["resourceKind"],
  resourceKey: string,
  name: string,
  aliases: readonly string[],
): SemanticCompiledDefinitionSourceDependencyIdentity {
  if (resourceKey.length === 0 || name.length === 0) {
    throw new Error("Source-declared resource dependency identity requires a resource key and name.");
  }
  return {
    kind: "source-declared-resource-dependency",
    resourceKind,
    resourceKey,
    name,
    aliases,
  };
}

/**
 * Cross-world identity slice for the gallery's unique source-declared CE/CA dependencies.
 *
 * The associated semantic root still owns the exact ordered ResourceDependencyReferences. These portable rows only
 * name the resource-registration identity shared with the independently materialized JIT world; they do not stand in
 * for arbitrary dependency runtime values or compiler-created local Types.
 */
export class SemanticCompiledDefinitionSourceDependencySlice {
  constructor(
    readonly root: TemplateCompilerCompiledDefinitionOverlay,
    readonly values: readonly SemanticCompiledDefinitionSourceDependencyIdentity[],
  ) {
    if (
      values.length !== root.dependencies.length
      || root.compilerAddedDependencies.length !== 0
      || new Set(values.map((value) => value.resourceKey)).size !== values.length
    ) {
      throw new Error(
        "Source-declared dependency slice requires unique root resource keys and cannot cross into local Types.",
      );
    }
  }
}

export type SemanticCompiledDefinitionFamilyObservation =
  | {
      readonly schemaVersion: typeof SEMANTIC_COMPILED_DEFINITION_FAMILY_OBSERVER_VERSION;
      readonly kind: "exact";
      readonly state: "exact";
      readonly definitionCount: number;
      readonly definitionDigest: string;
      readonly definitions: readonly CompilerCaseData[];
      readonly dependencyPosture: typeof SEMANTIC_COMPILED_DEFINITION_DEPENDENCY_POSTURE;
      readonly commonJitFields: typeof SEMANTIC_COMPILED_DEFINITION_COMMON_JIT_FIELDS;
      readonly omittedFields: typeof SEMANTIC_COMPILED_DEFINITION_OMITTED_FIELDS;
    }
  | {
      readonly schemaVersion: typeof SEMANTIC_COMPILED_DEFINITION_FAMILY_OBSERVER_VERSION;
      readonly kind: "unavailable";
      readonly state: "pending" | "ineligible";
      readonly reasonKinds: readonly string[];
      readonly stableKeyCounts: readonly number[];
      readonly dependencyPosture: typeof SEMANTIC_COMPILED_DEFINITION_DEPENDENCY_POSTURE;
      readonly commonJitFields: readonly [];
      readonly omittedFields: typeof SEMANTIC_COMPILED_DEFINITION_OMITTED_FIELDS;
    };

export function observeSemanticCompiledDefinitionFamily(
  result: TemplateCompilerCompiledDefinitionFamilyResult,
  frozen: SemanticFrozenFamilyObservation,
  runtimeInstructions: SemanticRuntimeInstructionFamilyObservation | null,
  sourceDependencies: SemanticCompiledDefinitionSourceDependencySlice | null,
): SemanticCompiledDefinitionFamilyObservation {
  if (!result.isModuleConstructed()) {
    throw new Error("Compiled-definition observer requires a semantic-runtime-constructed result.");
  }
  if (result.state !== TemplateCompilerCompiledDefinitionFamilyState.Exact || result.value == null) {
    const observation: SemanticCompiledDefinitionFamilyObservation = {
      schemaVersion: SEMANTIC_COMPILED_DEFINITION_FAMILY_OBSERVER_VERSION,
      kind: "unavailable",
      state: result.state === TemplateCompilerCompiledDefinitionFamilyState.Pending ? "pending" : "ineligible",
      reasonKinds: result.reasons.map((reason) => reason.reasonKind),
      stableKeyCounts: result.reasons.map((reason) => reason.stableKeys.length),
      dependencyPosture: SEMANTIC_COMPILED_DEFINITION_DEPENDENCY_POSTURE,
      commonJitFields: [],
      omittedFields: SEMANTIC_COMPILED_DEFINITION_OMITTED_FIELDS,
    };
    assertCompilerCaseData(observation, "semantic-compiled-definition-family/unavailable");
    return observation;
  }
  if (!result.value.isCurrent()) throw new Error("Compiled-definition family changed before portable observation.");
  if (sourceDependencies == null || sourceDependencies.root !== result.value.root) {
    throw new Error("Exact compiled-definition observation requires its root source-dependency slice.");
  }
  if (frozen.kind !== "exact" || runtimeInstructions?.kind !== "exact") {
    throw new Error("Exact compiled-definition observation requires exact structural and instruction observations.");
  }
  if (
    result.value.definitions.length !== frozen.definitions.length
    || result.value.definitions.length !== runtimeInstructions.definitions.length
  ) {
    throw new Error("Compiled-definition observation lost structural or instruction definition coverage.");
  }
  const projectionReasons: string[] = [];
  const definitions: CompilerCaseData[] = result.value.definitions.map((definition, definitionIndex): CompilerCaseData => {
    const structure = frozen.definitions[definitionIndex];
    const instructions = runtimeInstructions.definitions[definitionIndex];
    if (
      structure == null
      || instructions == null
      || structure.definitionIndex !== definitionIndex
      || instructions.definitionIndex !== definitionIndex
      || definition.surrogateValues.length !== instructions.surrogates.length
    ) {
      throw new Error(`Compiled-definition observation lost definition ${definitionIndex} alignment.`);
    }
    const capture = normalizeCapture(definition, projectionReasons);
    const bindables = normalizeBindables(definition, projectionReasons);
    const dependencies = normalizeDependencies(definition, sourceDependencies, projectionReasons);
    const name: CompilerCaseData = definition.name.nameKind === TemplateCompilerCompiledDefinitionNameKind.Declared
      ? { kind: "declared", value: definition.name.value }
      : { kind: "compiler-generated" };
    return {
      definitionIndex,
      owner: normalizeOwner(structure),
      name,
      type: definition.type,
      needsCompile: definition.needsCompile,
      containerless: definition.containerless,
      hasSlots: definition.hasSlots,
      shadowOptions: definition.shadowOptions == null ? null : { mode: definition.shadowOptions.mode },
      enhance: definition.enhance,
      capture,
      bindables,
      dependencies,
      executableFields: {
        hasType: definition.executableType != null,
        hasProcessContent: definition.processContent != null,
      },
      template: normalizeTemplate(structure),
      targetAlignment: "wire-count-aligned",
      targetMarkers: structure.rows.map((row, rowIndex) => ({
        ordinal: rowIndex,
        rowIndex,
        ...row.geometry,
      })),
      rows: instructions.rows,
      surrogates: instructions.surrogates,
    };
  });
  if (projectionReasons.length > 0) {
    const observation: SemanticCompiledDefinitionFamilyObservation = {
      schemaVersion: SEMANTIC_COMPILED_DEFINITION_FAMILY_OBSERVER_VERSION,
      kind: "unavailable",
      state: "pending",
      reasonKinds: [...new Set(projectionReasons)],
      stableKeyCounts: [...new Set(projectionReasons)].map(() => 0),
      dependencyPosture: SEMANTIC_COMPILED_DEFINITION_DEPENDENCY_POSTURE,
      commonJitFields: [],
      omittedFields: SEMANTIC_COMPILED_DEFINITION_OMITTED_FIELDS,
    };
    assertCompilerCaseData(observation, "semantic-compiled-definition-family/projection-pending");
    return observation;
  }
  const observation: SemanticCompiledDefinitionFamilyObservation = {
    schemaVersion: SEMANTIC_COMPILED_DEFINITION_FAMILY_OBSERVER_VERSION,
    kind: "exact",
    state: "exact",
    definitionCount: definitions.length,
    definitionDigest: semanticCompiledDefinitionDigest(definitions),
    definitions,
    dependencyPosture: SEMANTIC_COMPILED_DEFINITION_DEPENDENCY_POSTURE,
    commonJitFields: SEMANTIC_COMPILED_DEFINITION_COMMON_JIT_FIELDS,
    omittedFields: SEMANTIC_COMPILED_DEFINITION_OMITTED_FIELDS,
  };
  assertCompilerCaseData(observation, "semantic-compiled-definition-family/exact");
  return observation;
}

export function semanticCompiledDefinitionDigest(definitions: readonly CompilerCaseData[]): string {
  return `sha256:${createHash("sha256").update(canonicalCompilerJson({ definitions })).digest("hex")}`;
}

function normalizeOwner(definition: SemanticFrozenFamilyDefinition): CompilerCaseData {
  const owner = definition.owner;
  if (owner.kind === "root") return owner;
  return owner.kind === "projection"
    ? {
        kind: owner.kind,
        parentDefinitionIndex: owner.parentDefinitionIndex,
        rowIndex: owner.rowIndex,
        instructionIndex: owner.instructionIndex,
        instructionKind: owner.instructionKind,
        slotName: owner.slotName,
        fieldPath: owner.fieldPath,
      }
    : {
        kind: owner.kind,
        parentDefinitionIndex: owner.parentDefinitionIndex,
        rowIndex: owner.rowIndex,
        instructionIndex: owner.instructionIndex,
        instructionKind: owner.instructionKind,
        fieldPath: owner.fieldPath,
      };
}

function normalizeCapture(
  definition: TemplateCompilerCompiledDefinitionOverlay,
  reasons: string[],
): CompilerCaseData {
  if (definition.capture == null || definition.capture.kind === CustomElementCaptureKind.None) return false;
  if (definition.capture.kind === CustomElementCaptureKind.All) return true;
  reasons.push("capture-predicate-comparison-pending");
  return { kind: "capture-predicate-reference" };
}

function normalizeBindables(
  definition: TemplateCompilerCompiledDefinitionOverlay,
  reasons: string[],
): CompilerCaseData {
  if (definition.bindables.length === 0) return {};
  reasons.push("bindable-value-comparison-pending");
  return {};
}

function normalizeDependencies(
  definition: TemplateCompilerCompiledDefinitionOverlay,
  sourceDependencies: SemanticCompiledDefinitionSourceDependencySlice,
  reasons: string[],
): readonly CompilerCaseData[] {
  if (definition === sourceDependencies.root) return sourceDependencies.values;
  if (definition.dependencies.length === 0 && definition.compilerAddedDependencies.length === 0) return [];
  reasons.push("dependency-value-comparison-pending");
  return [];
}

function normalizeTemplate(definition: SemanticFrozenFamilyDefinition): CompilerCaseData {
  return {
    kind: "template",
    namespaceUri: definition.template.namespaceUri,
    attributes: definition.template.attributes.map(normalizeAttribute),
    content: definition.template.content.map(normalizeNode),
  };
}

function normalizeNode(node: SemanticFrozenFamilyNode): CompilerCaseData {
  switch (node.kind) {
    case "fragment":
      return { kind: node.kind, children: node.children.map(normalizeNode) };
    case "element":
      return {
        kind: node.kind,
        tagName: node.tagName,
        namespaceUri: node.namespaceUri,
        attributes: node.attributes.map(normalizeAttribute),
        children: node.children.map(normalizeNode),
        content: node.content?.map(normalizeNode) ?? null,
      };
    case "text":
      return { kind: node.kind, value: node.value };
    case "comment":
      return { kind: node.kind, value: node.value };
  }
}

function normalizeAttribute(attribute: {
  readonly name: string;
  readonly value: string;
  readonly namespaceUri: string | null;
  readonly prefix: string | null;
}): CompilerCaseData {
  return {
    name: attribute.name,
    value: attribute.value,
    namespaceUri: attribute.namespaceUri,
    prefix: attribute.prefix,
  };
}
