import { createHash } from "node:crypto";

import {
  CompilerTransformedTemplateComment,
  CompilerTransformedTemplateElement,
  CompilerTransformedTemplateFragment,
  CompilerTransformedTemplateText,
  expressionProductHandlesForInstruction,
  orderTemplateCompilerContextFamilyDefinitions,
  TemplateCompilerContextFamilyCompilationState,
  TemplateCompilerContextFamilyValueGeometryKind,
  TemplateCompilerContextFamilyValueOwnerKind,
  type CompilerTransformedTemplateNode,
  type TemplateCompilerContextFamilyCompilationResult,
  type TemplateCompilerContextFamilyValue,
  type TemplateCompilerContextFamilyValueContext,
} from "@aurelia-ls/semantic-runtime/browser-template";
import {
  assertCompilerCaseData,
  canonicalCompilerJson,
} from "./compiler-canonical-data.js";

export const SEMANTIC_FROZEN_FAMILY_OBSERVER_VERSION =
  "aurelia-ls/aot-semantic-frozen-family/v1" as const;

export type SemanticFrozenFamilyPath = readonly (string | number)[];

export interface SemanticFrozenFamilyAttribute {
  readonly name: string;
  readonly value: string;
  readonly namespaceUri: string | null;
  readonly prefix: string | null;
}

export type SemanticFrozenFamilyNode =
  | { readonly kind: "fragment"; readonly children: readonly SemanticFrozenFamilyNode[] }
  | {
      readonly kind: "element";
      readonly tagName: string;
      readonly namespaceUri: string;
      readonly attributes: readonly SemanticFrozenFamilyAttribute[];
      readonly children: readonly SemanticFrozenFamilyNode[];
      readonly content: readonly SemanticFrozenFamilyNode[] | null;
    }
  | { readonly kind: "text"; readonly value: string; readonly textKind: string }
  | { readonly kind: "comment"; readonly value: string; readonly semanticKind: string };

export interface SemanticFrozenFamilyTemplate {
  readonly kind: "template";
  readonly namespaceUri: string;
  readonly attributes: readonly SemanticFrozenFamilyAttribute[];
  readonly content: readonly SemanticFrozenFamilyNode[];
}

export type SemanticFrozenFamilyDefinitionOwner =
  | { readonly kind: "root" }
  | {
      readonly kind: "template-controller" | "projection";
      readonly parentDefinitionIndex: number;
      readonly rowIndex: number;
      readonly instructionIndex: number;
      readonly instructionKind: string;
      readonly slotName: string | null;
      readonly fieldPath: SemanticFrozenFamilyPath;
    };

export interface SemanticFrozenFamilyTargetGeometry {
  readonly kind: "marker-target" | "render-location";
  readonly markerPath: SemanticFrozenFamilyPath;
  readonly targetPath: SemanticFrozenFamilyPath;
  readonly targetNodeKind: "element" | "text" | "comment";
  readonly startPath: SemanticFrozenFamilyPath | null;
  readonly endPath: SemanticFrozenFamilyPath | null;
}

export interface SemanticFrozenFamilyRow {
  readonly targetKind: string;
  readonly semanticInstructionKinds: readonly string[];
  readonly frameworkInstructionKinds: readonly string[];
  readonly geometry: SemanticFrozenFamilyTargetGeometry;
}

export interface SemanticFrozenFamilyDefinition {
  readonly definitionIndex: number;
  readonly owner: SemanticFrozenFamilyDefinitionOwner;
  readonly name: { readonly kind: "declared"; readonly value: string } | { readonly kind: "compiler-generated" };
  readonly contextRole: string;
  readonly state: string;
  readonly needsCompile: false;
  readonly hasSlots: boolean;
  readonly template: SemanticFrozenFamilyTemplate;
  readonly geometryAlignment: "one-final-geometry-per-row";
  readonly rows: readonly SemanticFrozenFamilyRow[];
  readonly surrogateInstructionKinds: readonly string[];
}

export interface SemanticFrozenFamilyDerivation {
  readonly operationOrdinal: number;
  readonly inputCount: number;
  readonly outputCount: number;
  readonly causeCount: number;
}

export interface SemanticFrozenFamilySourceOpenSeam {
  readonly seamKindKey: string;
  readonly reasonKinds: readonly string[];
}

export interface SemanticFrozenFamilyUnavailableReason {
  readonly stage: string;
  readonly reasonKind: string;
  readonly stableKeyCount: number;
}

export const SEMANTIC_FROZEN_FAMILY_EXACT_FIELDS = [
  "definition-ownership",
  "transformed-template",
  "row-order",
  "instruction-kind-order",
  "target-geometry",
  "needs-compile",
  "has-slots",
  "structural-derivation-cardinality",
  "source-correspondence-seam-posture",
] as const;

export const SEMANTIC_FROZEN_FAMILY_OMITTED_JIT_FIELDS = [
  "instruction-values",
  "expression-ast-wires",
  "resolved-resource-identities",
  "definition-runtime-metadata",
  "dependency-runtime-values",
  "surrogate-instruction-values",
  "executable-function-identities",
] as const;

export type SemanticFrozenFamilyObservation =
  | {
      readonly schemaVersion: typeof SEMANTIC_FROZEN_FAMILY_OBSERVER_VERSION;
      readonly kind: "exact";
      readonly state: "exact";
      readonly stage: "frozen-value";
      readonly structuralDigest: string;
      readonly definitions: readonly SemanticFrozenFamilyDefinition[];
      readonly derivations: readonly SemanticFrozenFamilyDerivation[];
      readonly sourceOpenSeams: readonly SemanticFrozenFamilySourceOpenSeam[];
      readonly liveExpressionCount: number;
      readonly referencedLiveExpressionCount: number;
      readonly instructionValueCount: number;
      readonly exactFields: typeof SEMANTIC_FROZEN_FAMILY_EXACT_FIELDS;
      readonly omittedJitFields: typeof SEMANTIC_FROZEN_FAMILY_OMITTED_JIT_FIELDS;
    }
  | {
      readonly schemaVersion: typeof SEMANTIC_FROZEN_FAMILY_OBSERVER_VERSION;
      readonly kind: "unavailable";
      readonly state: Exclude<`${TemplateCompilerContextFamilyCompilationState}`, "exact">;
      readonly stage: string;
      readonly reasons: readonly SemanticFrozenFamilyUnavailableReason[];
      readonly exactFields: readonly [];
      readonly omittedJitFields: typeof SEMANTIC_FROZEN_FAMILY_OMITTED_JIT_FIELDS;
    };

export interface SemanticFrozenFamilyOrderedDefinition {
  readonly context: TemplateCompilerContextFamilyValueContext;
  readonly owner: SemanticFrozenFamilyDefinitionOwner;
}

class TransformedTemplateNormalizer {
  private readonly nodesByProduct: ReadonlyMap<string, CompilerTransformedTemplateNode>;
  private readonly attributesByProduct: ReadonlyMap<
    string,
    TemplateCompilerContextFamilyValueContext["attributes"][number]
  >;
  private readonly pathsByProduct = new Map<string, SemanticFrozenFamilyPath>();

  constructor(private readonly context: TemplateCompilerContextFamilyValueContext) {
    this.nodesByProduct = new Map(context.nodes.map((node) => [node.productHandle, node]));
    this.attributesByProduct = new Map(context.attributes.map((attribute) => [attribute.productHandle, attribute]));
  }

  normalize(): SemanticFrozenFamilyTemplate {
    const carrier = this.node(this.context.tree.compilerCarrier.productHandle);
    const content = this.node(this.context.tree.compilerContent.productHandle);
    if (!(carrier instanceof CompilerTransformedTemplateElement)) {
      throw new Error("Semantic frozen-family compiler carrier is not one transformed element.");
    }
    if (!(content instanceof CompilerTransformedTemplateFragment)) {
      throw new Error("Semantic frozen-family compiler content is not one transformed fragment.");
    }
    this.recordPath(carrier, []);
    this.recordPath(content, ["content"]);
    return {
      kind: "template",
      namespaceUri: carrier.namespaceUri,
      attributes: carrier.attributes.map((reference) => this.attribute(reference.productHandle)),
      content: content.children.map((reference, index) =>
        this.normalizeNode(reference.productHandle, ["content", index])
      ),
    };
  }

  geometry(rowIndex: number): SemanticFrozenFamilyTargetGeometry {
    const row = this.context.rows[rowIndex];
    if (row == null) throw new Error(`Semantic frozen-family row ${rowIndex} is absent.`);
    const geometry = row.geometry;
    if (geometry.geometryKind === TemplateCompilerContextFamilyValueGeometryKind.Marker) {
      return {
        kind: "marker-target",
        markerPath: this.path(geometry.marker),
        targetPath: this.path(geometry.target),
        targetNodeKind: geometry.target instanceof CompilerTransformedTemplateElement ? "element" : "text",
        startPath: null,
        endPath: null,
      };
    }
    return {
      kind: "render-location",
      markerPath: this.path(geometry.marker),
      targetPath: this.path(geometry.logicalTarget),
      targetNodeKind: "comment",
      startPath: this.path(geometry.start),
      endPath: this.path(geometry.end),
    };
  }

  private normalizeNode(productHandle: string, path: SemanticFrozenFamilyPath): SemanticFrozenFamilyNode {
    const node = this.node(productHandle);
    this.recordPath(node, path);
    if (node instanceof CompilerTransformedTemplateFragment) {
      return {
        kind: "fragment",
        children: node.children.map((reference, index) =>
          this.normalizeNode(reference.productHandle, [...path, "children", index])
        ),
      };
    }
    if (node instanceof CompilerTransformedTemplateElement) {
      const content = node.templateContent == null
        ? null
        : this.templateContent(node.templateContent.productHandle, [...path, "content"]);
      return {
        kind: "element",
        tagName: node.tagName,
        namespaceUri: node.namespaceUri,
        attributes: node.attributes.map((reference) => this.attribute(reference.productHandle)),
        children: node.children.map((reference, index) =>
          this.normalizeNode(reference.productHandle, [...path, "children", index])
        ),
        content,
      };
    }
    if (node instanceof CompilerTransformedTemplateText) {
      return { kind: "text", value: node.text, textKind: node.textKind };
    }
    if (node instanceof CompilerTransformedTemplateComment) {
      return { kind: "comment", value: node.text, semanticKind: node.semanticKind };
    }
    throw new Error(`Semantic frozen-family node '${productHandle}' has an unsupported final kind.`);
  }

  private templateContent(productHandle: string, path: SemanticFrozenFamilyPath): readonly SemanticFrozenFamilyNode[] {
    const content = this.node(productHandle);
    if (!(content instanceof CompilerTransformedTemplateFragment)) {
      throw new Error(`Semantic frozen-family template content '${productHandle}' is not a fragment.`);
    }
    this.recordPath(content, path);
    return content.children.map((reference, index) =>
      this.normalizeNode(reference.productHandle, [...path, index])
    );
  }

  private node(productHandle: string): CompilerTransformedTemplateNode {
    const node = this.nodesByProduct.get(productHandle) ?? null;
    if (node == null) throw new Error(`Semantic frozen-family node '${productHandle}' is absent.`);
    return node;
  }

  private attribute(productHandle: string): SemanticFrozenFamilyAttribute {
    const attribute = this.attributesByProduct.get(productHandle) ?? null;
    if (attribute == null) throw new Error(`Semantic frozen-family attribute '${productHandle}' is absent.`);
    return {
      name: attribute.name,
      value: attribute.value,
      namespaceUri: attribute.namespaceUri,
      prefix: attribute.prefix,
    };
  }

  private recordPath(node: CompilerTransformedTemplateNode, path: SemanticFrozenFamilyPath): void {
    const existing = this.pathsByProduct.get(node.productHandle) ?? null;
    if (existing != null && canonicalCompilerJson(existing) !== canonicalCompilerJson(path)) {
      throw new Error(`Semantic frozen-family node '${node.productHandle}' has more than one final path.`);
    }
    this.pathsByProduct.set(node.productHandle, path);
  }

  private path(node: CompilerTransformedTemplateNode): SemanticFrozenFamilyPath {
    const path = this.pathsByProduct.get(node.productHandle) ?? null;
    if (path == null) throw new Error(`Semantic frozen-family target '${node.productHandle}' has no final path.`);
    return path;
  }
}

/** Portable structural characterization only; this does not claim exhaustive JIT wire equivalence. */
export function observeSemanticFrozenFamily(
  result: TemplateCompilerContextFamilyCompilationResult,
): SemanticFrozenFamilyObservation {
  if (!result.isExact() || result.value == null) {
    const observation: SemanticFrozenFamilyObservation = {
      schemaVersion: SEMANTIC_FROZEN_FAMILY_OBSERVER_VERSION,
      kind: "unavailable",
      state: unavailableCompilationState(result.state),
      stage: result.stage,
      reasons: result.reasons.map((reason) => ({
        stage: reason.stage,
        reasonKind: reason.reasonKind,
        stableKeyCount: reason.stableKeys.length,
      })),
      exactFields: [],
      omittedJitFields: SEMANTIC_FROZEN_FAMILY_OMITTED_JIT_FIELDS,
    };
    assertCompilerCaseData(observation, "semantic-frozen-family/unavailable");
    return observation;
  }
  if (!result.value.isCurrent()) {
    throw new Error("Semantic frozen-family value changed before portable observation.");
  }
  const definitions = orderSemanticFrozenFamilyDefinitions(result.value).map((record, definitionIndex) =>
    normalizeDefinition(result.value!, record, definitionIndex)
  );
  const derivations = result.value.derivations.map((derivation): SemanticFrozenFamilyDerivation => {
    if (derivation.operationOrdinal == null) {
      throw new Error("Semantic frozen-family compiler derivation has no operation ordinal.");
    }
    return {
      operationOrdinal: derivation.operationOrdinal,
      inputCount: derivation.inputs.length,
      outputCount: derivation.outputs.length,
      causeCount: derivation.causeHandles.length,
    };
  });
  const sourceOpenSeams = result.value.sourceOpenSeams.map((seam): SemanticFrozenFamilySourceOpenSeam => ({
    seamKindKey: seam.seamKindKey,
    reasonKinds: seam.reasonKinds,
  }));
  const liveExpressionCount = result.value.liveExpressions.length;
  const referencedExpressionHandles = new Set(result.value.instructions.flatMap((instruction) =>
    expressionProductHandlesForInstruction(instruction)
  ));
  const referencedLiveExpressionCount = result.value.liveExpressions.filter((expression) =>
    referencedExpressionHandles.has(expression.productHandle)
  ).length;
  const instructionValueCount = result.value.instructions.length;
  const structuralValue = { definitions, derivations, sourceOpenSeams };
  const observation: SemanticFrozenFamilyObservation = {
    schemaVersion: SEMANTIC_FROZEN_FAMILY_OBSERVER_VERSION,
    kind: "exact",
    state: "exact",
    stage: "frozen-value",
    structuralDigest: digest(canonicalCompilerJson(structuralValue)),
    definitions,
    derivations,
    sourceOpenSeams,
    liveExpressionCount,
    referencedLiveExpressionCount,
    instructionValueCount,
    exactFields: SEMANTIC_FROZEN_FAMILY_EXACT_FIELDS,
    omittedJitFields: SEMANTIC_FROZEN_FAMILY_OMITTED_JIT_FIELDS,
  };
  assertCompilerCaseData(observation, "semantic-frozen-family/exact");
  return observation;
}

export function orderSemanticFrozenFamilyDefinitions(
  value: TemplateCompilerContextFamilyValue,
): readonly SemanticFrozenFamilyOrderedDefinition[] {
  const locations = orderTemplateCompilerContextFamilyDefinitions(value);
  const indexes = new Map(locations.map((location, index) => [location.context, index]));
  return locations.map((location): SemanticFrozenFamilyOrderedDefinition => {
    const context = location.context;
    if (context.owner.ownerKind === TemplateCompilerContextFamilyValueOwnerKind.Root) {
      return { context, owner: { kind: "root" } };
    }
    const parentContext = location.parentContext;
    const rowIndex = location.parentRowIndex;
    const instructionIndex = location.parentInstructionIndex;
    if (parentContext == null || rowIndex == null || instructionIndex == null) {
      throw new Error("Semantic frozen-family generated definition has no exact parent location.");
    }
    const parentDefinitionIndex = indexes.get(parentContext) ?? null;
    const instruction = parentContext.rows[rowIndex]?.instructions[instructionIndex] ?? null;
    if (parentDefinitionIndex == null || instruction == null || instruction !== context.owner.instruction) {
      throw new Error("Semantic frozen-family generated definition lost its shared family owner location.");
    }
    return {
      context,
      owner: {
        kind: context.owner.ownerKind,
        parentDefinitionIndex,
        rowIndex,
        instructionIndex,
        instructionKind: frameworkInstructionKind(instruction.instructionKind),
        slotName: context.owner.slotName,
        fieldPath: context.owner.ownerKind === TemplateCompilerContextFamilyValueOwnerKind.Projection
          ? ["projections", context.owner.slotName!]
          : ["def"],
      },
    };
  });
}

function normalizeDefinition(
  value: TemplateCompilerContextFamilyValue,
  record: SemanticFrozenFamilyOrderedDefinition,
  definitionIndex: number,
): SemanticFrozenFamilyDefinition {
  const context = record.context;
  const normalizer = new TransformedTemplateNormalizer(context);
  const template = normalizer.normalize();
  if (context.compiledTemplate.needsCompile !== false) {
    throw new Error(`Semantic frozen-family definition ${definitionIndex} is not compiler-final.`);
  }
  return {
    definitionIndex,
    owner: record.owner,
    name: definitionIndex === 0
      ? { kind: "declared", value: value.rootDefinition.name }
      : { kind: "compiler-generated" },
    contextRole: context.compiledTemplate.context.role,
    state: context.compiledTemplate.state,
    needsCompile: false,
    hasSlots: context.compiledTemplate.hasSlots,
    template,
    geometryAlignment: "one-final-geometry-per-row",
    rows: context.rows.map((row, rowIndex) => ({
      targetKind: row.target.targetKind,
      semanticInstructionKinds: row.instructions.map((instruction) => instruction.instructionKind),
      frameworkInstructionKinds: row.instructions.map((instruction) =>
        frameworkInstructionKind(instruction.instructionKind)
      ),
      geometry: normalizer.geometry(rowIndex),
    })),
    surrogateInstructionKinds: context.compiledTemplate.surrogateSequence?.instructions.map((instruction) =>
      frameworkInstructionKind(instruction.instructionKind)
    ) ?? [],
  };
}

function frameworkInstructionKind(semanticKind: string): string {
  switch (semanticKind) {
    case "multi-attr": return "multi-attribute";
    case "spread-transfered-binding": return "spread-transferred-binding";
    case "spread-element-prop-binding": return "spread-element-property";
    default: return semanticKind;
  }
}

function unavailableCompilationState(
  state: TemplateCompilerContextFamilyCompilationState,
): Exclude<`${TemplateCompilerContextFamilyCompilationState}`, "exact"> {
  switch (state) {
    case TemplateCompilerContextFamilyCompilationState.Pending:
    case TemplateCompilerContextFamilyCompilationState.Ineligible:
    case TemplateCompilerContextFamilyCompilationState.Open:
    case TemplateCompilerContextFamilyCompilationState.Abrupt:
      return state;
    case TemplateCompilerContextFamilyCompilationState.Exact:
      throw new Error("Exact semantic family cannot be projected as unavailable.");
  }
}

function digest(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
