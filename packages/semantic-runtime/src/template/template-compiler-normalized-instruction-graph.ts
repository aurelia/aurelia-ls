import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import type { ProductHandle } from '../kernel/handles.js';
import { InstructionIdentity } from '../kernel/identity.js';
import {
  AttributeClassificationKind,
  type AttributeClassification,
  type AttributeSyntax,
} from './attribute-syntax.js';
import type { MultiBindingSegment } from './binding-command-execution.js';
import {
  type HtmlAttribute,
  type HtmlAttributeReference,
  type HtmlElement,
  type HtmlElementAttributeOwner,
  type HtmlText,
} from './html-ir.js';
import {
  HydrateAttributeInstruction,
  HydrateElementInstruction,
  HydrateLetElementInstruction,
  HydrateTemplateControllerInstruction,
  InterpolationInstruction,
  IteratorBindingInstruction,
  MultiAttrInstruction,
  SetPropertyInstruction,
  SpreadElementPropBindingInstruction,
  expressionProductHandlesForInstruction,
  nestedInstructionProductHandlesForInstructions,
  type TemplateInstruction,
} from './instruction-ir.js';
import type { TemplateResourceCompilationEmission } from './template-compilation-project-pass.js';
import type { TemplateCompilerNormalizedClaimIndex } from './template-compiler-normalized-claim-index.js';
import type { TemplateCompilerNormalizedOwnershipBuilder } from './template-compiler-normalized-ownership.js';
import {
  sameNormalizedAttributeReference,
  sameNormalizedNodeReference,
} from './template-compiler-normalized-reference.js';
import {
  TemplateCompilerNormalizedContainmentRelation,
  TemplateCompilerNormalizedDownstreamInstruction,
  TemplateCompilerNormalizedDownstreamInstructionDisposition,
  TemplateCompilerNormalizedDownstreamInstructionExclusionKind,
  TemplateCompilerNormalizedDownstreamInstructionInventory,
  TemplateCompilerNormalizedSiteMismatch,
  TemplateCompilerNormalizedSiteMismatchKind,
  type TemplateCompilerNormalizedSite,
  type TemplateCompilerNormalizedTextSite,
} from './template-compiler-normalized-site-model.js';
import type { TemplateExpressionParse } from './value-site.js';

export interface TemplateCompilerNormalizedInstructionGraphContext {
  readonly compilation: TemplateResourceCompilationEmission;
  readonly ownership: TemplateCompilerNormalizedOwnershipBuilder;
  readonly claimIndex: TemplateCompilerNormalizedClaimIndex;
  readonly normalizedInstructionsByProduct: ReadonlyMap<ProductHandle, TemplateInstruction>;
  readonly createdInstructionsByProduct: ReadonlyMap<ProductHandle, TemplateInstruction>;
  readonly primaryExpressionParsesByProduct: ReadonlyMap<ProductHandle, TemplateExpressionParse>;
  readonly secondaryExpressionParsesByProduct: ReadonlyMap<ProductHandle, TemplateExpressionParse>;
  readonly topLevelSyntaxesByProduct: ReadonlyMap<ProductHandle, AttributeSyntax>;
  readonly classificationsBySyntax: ReadonlyMap<ProductHandle, readonly AttributeClassification[]>;
  readonly elementsByProduct: ReadonlyMap<ProductHandle, HtmlElement>;
  readonly textsByProduct: ReadonlyMap<ProductHandle, HtmlText>;
  readonly ownerForSyntax: (syntax: AttributeSyntax) => HtmlElementAttributeOwner | null;
  readonly mismatch: (
    kind: TemplateCompilerNormalizedSiteMismatchKind,
    relation: string,
    summary: string,
    handles: readonly ProductHandle[],
  ) => void;
  readonly missing: (relation: string, ownerHandle: ProductHandle, missingHandle: ProductHandle | null) => void;
  readonly crossReference: (relation: string, summary: string, handles: readonly ProductHandle[]) => void;
  readonly validateUniqueHandles: (
    handles: readonly ProductHandle[],
    relation: string,
    ownerHandle: ProductHandle,
  ) => void;
}

class DownstreamInstructionParityFrame {
  readonly mismatches: TemplateCompilerNormalizedSiteMismatch[] = [];

  mismatch(
    kind: TemplateCompilerNormalizedSiteMismatchKind,
    relation: string,
    summary: string,
    handles: readonly ProductHandle[],
  ): void {
    this.mismatches.push(new TemplateCompilerNormalizedSiteMismatch(kind, relation, summary, handles));
  }

  missing(relation: string, owner: ProductHandle, missing: ProductHandle | null): void {
    this.mismatch(
      TemplateCompilerNormalizedSiteMismatchKind.DownstreamInstructionInventoryMismatch,
      relation,
      'Downstream instruction parity references an absent authored-precedent product.',
      missing == null ? [owner] : [owner, missing],
    );
  }

  unique(handles: readonly ProductHandle[], relation: string, owner: ProductHandle): void {
    const occupied = new Set<ProductHandle>();
    for (const handle of handles) {
      if (occupied.has(handle)) {
        this.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.DuplicateReference,
          relation,
          'Downstream instruction parity repeats one product reference.',
          [owner, handle],
        );
      }
      occupied.add(handle);
    }
  }
}

/** Validates normalized instruction ownership and inventories downstream compiled-template outputs. */
export class TemplateCompilerNormalizedInstructionGraphValidator {
  constructor(private readonly context: TemplateCompilerNormalizedInstructionGraphContext) {}

  validatePlainMultiBindingInstruction(
    segment: MultiBindingSegment,
    instruction: TemplateInstruction,
    parses: readonly TemplateExpressionParse[],
    attribute: HtmlAttribute,
    owner: HtmlElement,
  ): void {
    if (
      !this.matchesPlainMultiBindingInstruction(segment, instruction, parses, attribute, owner)
    ) {
      this.context.crossReference(
        'plain-multi-binding-segment/instruction',
        'Plain multi-binding instruction does not match the segment bindable, value, source, attribute, and owner.',
        [segment.productHandle, instruction.productHandle],
      );
    }
    this.validateInstructionExpressions(segment.productHandle, instruction, parses);
  }

  matchesPlainMultiBindingInstruction(
    segment: MultiBindingSegment,
    instruction: TemplateInstruction,
    parses: readonly TemplateExpressionParse[],
    attribute: HtmlAttribute,
    owner: HtmlElement,
  ): boolean {
    const expectedKey = this.plainMultiBindingInstructionKeyForSegment(segment, parses, attribute, owner);
    return expectedKey != null
      && expectedKey === this.plainMultiBindingInstructionKey(instruction)
      && sameInstructionOrigin(instruction, attribute, owner);
  }

  plainMultiBindingInstructionKeyForSegment(
    segment: MultiBindingSegment,
    parses: readonly TemplateExpressionParse[],
    attribute: HtmlAttribute,
    owner: HtmlElement,
  ): string | null {
    const parse = parses.length === 1 ? parses[0]! : null;
    const expectedSet = parse?.resultKind === ExpressionParseResultKind.InterpolationAbsent;
    const target = segment.bindable?.definition.name ?? null;
    if (target == null || (!expectedSet && parse == null)) return null;
    return JSON.stringify([
      expectedSet ? 'set-property' : 'interpolation',
      owner.productHandle,
      attribute.productHandle,
      segment.sourceAddressHandle,
      target,
      expectedSet ? segment.rawValue : parse?.productHandle,
    ]);
  }

  plainMultiBindingInstructionKey(instruction: TemplateInstruction): string | null {
    const attribute = instructionAttributeReference(instruction);
    if (attribute?.productHandle == null || instruction.node.productHandle == null) return null;
    if (instruction instanceof SetPropertyInstruction) {
      return JSON.stringify([
        'set-property',
        instruction.node.productHandle,
        attribute.productHandle,
        instruction.sourceAddressHandle,
        instruction.targetProperty,
        instruction.value,
      ]);
    }
    if (instruction instanceof InterpolationInstruction && instruction.expressionProductHandles.length === 1) {
      return JSON.stringify([
        'interpolation',
        instruction.node.productHandle,
        attribute.productHandle,
        instruction.sourceAddressHandle,
        instruction.target,
        instruction.expressionProductHandles[0],
      ]);
    }
    return null;
  }

  validateOwnedInstructionGraph(
    ownerProductHandle: ProductHandle,
    instructions: readonly TemplateInstruction[],
    parses: readonly TemplateExpressionParse[],
    attribute: HtmlAttribute,
    element: HtmlElement,
  ): void {
    this.validateProducerClaims(ownerProductHandle, instructions);
    const instructionByProduct = new Map(instructions.map((instruction) => [instruction.productHandle, instruction]));
    const instructionOrdinal = new Map(instructions.map((instruction, ordinal) => [instruction.productHandle, ordinal]));
    const parsesByHandle = new Map(parses.map((parse) => [parse.productHandle, parse]));
    const earlierMultiAttrHandles: ProductHandle[] = [];
    for (const instruction of instructions) {
      if (!sameInstructionOrigin(instruction, attribute, element)) {
        this.context.crossReference(
          'owned-instruction/origin',
          'Normalized instruction does not retain its producer attribute and element.',
          [ownerProductHandle, instruction.productHandle, attribute.productHandle, element.productHandle],
        );
      }
      this.validateInstructionExpressions(ownerProductHandle, instruction, parses, parsesByHandle);
      this.validateInstructionClaimRoles(ownerProductHandle, instruction);
      const nested = instructionProductHandles(instruction);
      const iteratorTails = new Set(nestedInstructionProductHandlesForInstructions([instruction]));
      this.context.validateUniqueHandles(nested, 'instruction/nested-products', instruction.productHandle);
      nested.forEach((handle, ordinal) => {
        const child = instructionByProduct.get(handle) ?? null;
        const childOwner = this.context.ownership.ownerOf(handle);
        const isIteratorTail = iteratorTails.has(handle);
        const invalidIteratorTail = isIteratorTail && (
          !(child instanceof MultiAttrInstruction)
          || (instructionOrdinal.get(handle) ?? Number.MAX_SAFE_INTEGER)
            >= (instructionOrdinal.get(instruction.productHandle) ?? -1)
        );
        if (child == null || childOwner?.ownerProductHandle !== ownerProductHandle || invalidIteratorTail) {
          this.context.mismatch(
            TemplateCompilerNormalizedSiteMismatchKind.InstructionReferenceMismatch,
            isIteratorTail ? 'iterator-instruction/tail-products' : 'instruction/product-references',
            isIteratorTail
              ? 'Iterator tail reference is not an earlier MultiAttr instruction owned by the same command lowering.'
              : 'Instruction product reference is not owned by the same command lowering.',
            [instruction.productHandle, handle],
          );
        }
        this.context.ownership.contain(
          instruction.productHandle,
          handle,
          isIteratorTail
            ? TemplateCompilerNormalizedContainmentRelation.IteratorInstructionContainsTailInstruction
            : TemplateCompilerNormalizedContainmentRelation.InstructionContainsInstruction,
          ordinal,
        );
      });
      if (instruction instanceof IteratorBindingInstruction) {
        if (!sameHandleSequence(instruction.tailInstructionProductHandles, earlierMultiAttrHandles)) {
          this.context.mismatch(
            TemplateCompilerNormalizedSiteMismatchKind.InstructionReferenceMismatch,
            'iterator-instruction/tail-order',
            'Iterator tail handles do not equal the exact ordered earlier MultiAttr subsequence.',
            [instruction.productHandle, ...instruction.tailInstructionProductHandles],
          );
        }
      }
      if (instruction instanceof MultiAttrInstruction) earlierMultiAttrHandles.push(instruction.productHandle);
    }
  }

  validateProducerClaims(
    producerProductHandle: ProductHandle,
    instructions: readonly TemplateInstruction[],
  ): void {
    const claimed = this.context.claimIndex.instructionsForProducer(producerProductHandle);
    const actual = instructions.map((instruction) => instruction.productHandle);
    if (!sameHandleSequence(claimed, actual)) {
      this.context.mismatch(
        TemplateCompilerNormalizedSiteMismatchKind.InstructionReferenceMismatch,
        'instruction-producer/claims',
        'ProducesInstruction claims do not exactly match the producer instruction sequence.',
        [producerProductHandle, ...actual],
      );
    }
  }

  validateInstructionClaimRoles(
    producerProductHandle: ProductHandle,
    instruction: TemplateInstruction,
  ): void {
    const claimed = this.context.claimIndex.expressionParsesForInstruction(
      producerProductHandle,
      instruction.productHandle,
    );
    const actual = expressionProductHandlesForInstruction(instruction);
    if (!sameHandleSequence(claimed, actual)) {
      this.context.mismatch(
        TemplateCompilerNormalizedSiteMismatchKind.InstructionReferenceMismatch,
        'instruction-expression/claims',
        'UsesExpressionParse claims do not exactly match instruction expression roles and order.',
        [producerProductHandle, instruction.productHandle, ...actual],
      );
    }
  }

  buildDownstreamInstructionInventory(
    attributeSites: readonly TemplateCompilerNormalizedSite[],
    textSites: readonly TemplateCompilerNormalizedTextSite[],
  ): TemplateCompilerNormalizedDownstreamInstructionInventory {
    const parity = new DownstreamInstructionParityFrame();
    const attributeSitesByProducerIdentity = new Map(attributeSites.flatMap((site) => [
      [site.syntax.identityHandle, site] as const,
      [site.classification.identityHandle, site] as const,
    ]));
    const textSitesByProducerIdentity = new Map(textSites.map((site) => [site.text.identityHandle, site]));
    const instructionIdentities = new Map<TemplateInstruction['identityHandle'], InstructionIdentity>();
    for (const record of this.context.compilation.compiledTemplate.records) {
      if (!(record instanceof InstructionIdentity)) continue;
      if (instructionIdentities.has(record.handle)) {
        parity.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.DuplicateProduct,
          'compiled-created-instruction/identity',
          'Compiled instruction identity is repeated.',
          [],
        );
      }
      instructionIdentities.set(record.handle, record);
    }
    const createdSeen = new Set<ProductHandle>();
    for (const instruction of this.context.compilation.compiledTemplate.createdInstructions) {
      if (
        createdSeen.has(instruction.productHandle)
        || this.context.normalizedInstructionsByProduct.has(instruction.productHandle)
      ) {
        parity.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.DuplicateProduct,
          'compiled-created-instruction/product-handle',
          'Created instruction product collides with another downstream or normalized instruction.',
          [instruction.productHandle],
        );
      }
      createdSeen.add(instruction.productHandle);
    }
    const allInstructions = new Map<ProductHandle, TemplateInstruction>([
      ...this.context.normalizedInstructionsByProduct,
      ...this.context.createdInstructionsByProduct,
    ]);
    const aggregateSeen = new Set<ProductHandle>();
    for (const instruction of this.context.compilation.compiledTemplate.instructions) {
      if (aggregateSeen.has(instruction.productHandle)) {
        parity.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.DuplicateReference,
          'compiled-template/instruction-inventory',
          'Compiled-template instruction inventory repeats one product handle.',
          [instruction.productHandle],
        );
      }
      aggregateSeen.add(instruction.productHandle);
      if (allInstructions.get(instruction.productHandle) !== instruction) {
        parity.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.DownstreamInstructionInventoryMismatch,
          'compiled-template/instruction-inventory',
          'Compiled-template instruction inventory contains a foreign or non-identical instruction object.',
          [instruction.productHandle],
        );
      }
    }
    for (const [handle, instruction] of allInstructions) {
      if (!aggregateSeen.has(handle)) {
        parity.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.DownstreamInstructionInventoryMismatch,
          'compiled-template/reverse-instruction-membership',
          'Normalized or created instruction is absent from the compiled aggregate inventory.',
          [instruction.productHandle],
        );
      }
    }

    const rows: TemplateCompilerNormalizedDownstreamInstruction[] = [];
    const attributeOutputs: TemplateCompilerNormalizedDownstreamInstruction[] = [];
    const textOutputs: TemplateCompilerNormalizedDownstreamInstruction[] = [];
    const excludedStructuralOutputs: TemplateCompilerNormalizedDownstreamInstruction[] = [];
    for (const instruction of this.context.compilation.compiledTemplate.createdInstructions) {
      if (!aggregateSeen.has(instruction.productHandle)) {
        parity.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.DownstreamInstructionInventoryMismatch,
          'compiled-created-instruction/aggregate-membership',
          'Compiled-template-created instruction is absent from the compiled instruction inventory.',
          [instruction.productHandle],
        );
      }
      const identity = instructionIdentities.get(instruction.identityHandle) ?? null;
      if (identity == null) {
        parity.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.DownstreamInstructionInventoryMismatch,
          'compiled-created-instruction/identity',
          'Compiled-template-created instruction has no independent InstructionIdentity owner.',
          [instruction.productHandle],
        );
      }
      const attributeSite = identity == null
        ? null
        : attributeSitesByProducerIdentity.get(identity.ownerHandle) ?? null;
      const textSite = identity == null
        ? null
        : textSitesByProducerIdentity.get(identity.ownerHandle) ?? null;
      let row: TemplateCompilerNormalizedDownstreamInstruction;
      if (attributeSite != null) {
        this.validateDownstreamInstruction(instruction, attributeSite, null, allInstructions, parity);
        row = new TemplateCompilerNormalizedDownstreamInstruction(
          instruction,
          TemplateCompilerNormalizedDownstreamInstructionDisposition.RegenerateFromAttributeSite,
          attributeSite,
          null,
          null,
        );
        attributeOutputs.push(row);
      } else if (textSite != null) {
        this.validateDownstreamInstruction(instruction, null, textSite, allInstructions, parity);
        row = new TemplateCompilerNormalizedDownstreamInstruction(
          instruction,
          TemplateCompilerNormalizedDownstreamInstructionDisposition.RegenerateFromTextSite,
          null,
          textSite,
          null,
        );
        textOutputs.push(row);
      } else {
        this.validateDownstreamInstruction(instruction, null, null, allInstructions, parity);
        row = new TemplateCompilerNormalizedDownstreamInstruction(
          instruction,
          TemplateCompilerNormalizedDownstreamInstructionDisposition.ExcludedStructuralOutput,
          null,
          null,
          TemplateCompilerNormalizedDownstreamInstructionExclusionKind.NoSingularAttributeOrTextProducer,
        );
        excludedStructuralOutputs.push(row);
      }
      rows.push(row);
    }
    return new TemplateCompilerNormalizedDownstreamInstructionInventory(
      rows,
      attributeOutputs,
      textOutputs,
      excludedStructuralOutputs,
      parity.mismatches,
    );
  }

  private validateInstructionExpressions(
    ownerProductHandle: ProductHandle,
    instruction: TemplateInstruction,
    parses: readonly TemplateExpressionParse[],
    allowedParsesByHandle: ReadonlyMap<ProductHandle, TemplateExpressionParse> = new Map(
      parses.map((parse) => [parse.productHandle, parse]),
    ),
  ): void {
    const expressionHandles = expressionProductHandlesForInstruction(instruction);
    this.context.validateUniqueHandles(expressionHandles, 'instruction/expression-products', instruction.productHandle);
    for (const handle of expressionHandles) {
      const parse = this.expressionParse(handle);
      const parseOwner = this.context.ownership.ownerOf(handle);
      if (
        parse == null
        || allowedParsesByHandle.get(handle) !== parse
        || parseOwner == null
      ) {
        this.context.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.InstructionReferenceMismatch,
          'instruction/expression-products',
          'Instruction expression reference is not an exact parse owned by the same normalized producer.',
          [ownerProductHandle, instruction.productHandle, handle],
        );
      }
    }
  }

  private validateDownstreamInstruction(
    instruction: TemplateInstruction,
    attributeSite: TemplateCompilerNormalizedSite | null,
    textSite: TemplateCompilerNormalizedTextSite | null,
    allInstructions: ReadonlyMap<ProductHandle, TemplateInstruction>,
    parity: DownstreamInstructionParityFrame,
  ): void {
    const authoredNode = instruction.node.productHandle == null
      ? null
      : this.context.elementsByProduct.get(instruction.node.productHandle)
        ?? this.context.textsByProduct.get(instruction.node.productHandle)
        ?? null;
    if (authoredNode == null || !sameNormalizedNodeReference(instruction.node, authoredNode)) {
      parity.mismatch(
        TemplateCompilerNormalizedSiteMismatchKind.CrossReferenceMismatch,
        'compiled-created-instruction/authored-node',
        'Compiled-template-created instruction does not retain an exact authored element/text node reference.',
        [instruction.productHandle, ...productHandle(instruction.node.productHandle)],
      );
    }
    const expectedNode = attributeSite?.owner.element ?? textSite?.text ?? null;
    if (
      attributeSite != null
      && !sameNormalizedAttributeReference(
        instructionAttributeReference(instruction),
        attributeSite.attribute,
      )
    ) {
      parity.mismatch(
        TemplateCompilerNormalizedSiteMismatchKind.CrossReferenceMismatch,
        'compiled-created-instruction/attribute',
        'Compiled-template-created instruction does not retain its exact authored attribute reference.',
        [instruction.productHandle, attributeSite.attribute.productHandle],
      );
    }
    if (expectedNode != null && !sameNormalizedNodeReference(instruction.node, expectedNode)) {
      parity.mismatch(
        TemplateCompilerNormalizedSiteMismatchKind.CrossReferenceMismatch,
        'compiled-created-instruction/node',
        'Compiled-template-created instruction does not retain its exact authored site node.',
        [instruction.productHandle, expectedNode.productHandle],
      );
    }
    const allowedParses = attributeSite?.readExpressionParses()
      ?? (textSite == null ? [] : [textSite.expressionParse]);
    const allowedParseHandles = new Set(allowedParses.map((parse) => parse.productHandle));
    const expressionHandles = expressionProductHandlesForInstruction(instruction);
    parity.unique(
      expressionHandles,
      'compiled-created-instruction/expression-products',
      instruction.productHandle,
    );
    for (const handle of expressionHandles) {
      if (this.expressionParse(handle) == null || !allowedParseHandles.has(handle)) {
        parity.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.InstructionReferenceMismatch,
          'compiled-created-instruction/expression-products',
          'Compiled-template-created instruction expression does not belong to its exact normalized site.',
          [instruction.productHandle, handle],
        );
      }
    }
    const nestedHandles = instructionProductHandles(instruction);
    parity.unique(nestedHandles, 'compiled-created-instruction/product-references', instruction.productHandle);
    for (const handle of nestedHandles) {
      const nested = allInstructions.get(handle) ?? null;
      if (nested == null || instruction.node.productHandle !== nested.node.productHandle) {
        parity.mismatch(
          TemplateCompilerNormalizedSiteMismatchKind.InstructionReferenceMismatch,
          'compiled-created-instruction/product-references',
          'Compiled-template-created instruction references a missing or foreign-node instruction product.',
          [instruction.productHandle, handle],
        );
      }
    }
    if (instruction instanceof HydrateElementInstruction) {
      parity.unique(
        instruction.captureSyntaxProductHandles,
        'hydrate-element/capture-syntax-products',
        instruction.productHandle,
      );
      for (const syntaxHandle of instruction.captureSyntaxProductHandles) {
        const syntax = this.context.topLevelSyntaxesByProduct.get(syntaxHandle) ?? null;
        const owner = syntax == null ? null : this.context.ownerForSyntax(syntax);
        const classifications = this.context.classificationsBySyntax.get(syntaxHandle) ?? [];
        if (
          syntax == null
          || owner == null
          || !sameNormalizedNodeReference(instruction.node, owner.element)
          || classifications.length !== 1
          || classifications[0]?.classificationKind !== AttributeClassificationKind.Captured
        ) {
          parity.mismatch(
            TemplateCompilerNormalizedSiteMismatchKind.InstructionReferenceMismatch,
            'hydrate-element/capture-syntax-products',
            'Hydrate-element capture syntax is missing or belongs to a different authored element.',
            [instruction.productHandle, syntaxHandle],
          );
        }
      }
    }
  }

  private expressionParse(productHandle: ProductHandle): TemplateExpressionParse | null {
    return this.context.primaryExpressionParsesByProduct.get(productHandle)
      ?? this.context.secondaryExpressionParsesByProduct.get(productHandle)
      ?? null;
  }
}

function sameInstructionOrigin(
  instruction: TemplateInstruction,
  attribute: HtmlAttribute,
  element: HtmlElement,
): boolean {
  return sameNormalizedNodeReference(instruction.node, element)
    && sameNormalizedAttributeReference(instructionAttributeReference(instruction), attribute);
}

function instructionAttributeReference(instruction: TemplateInstruction): HtmlAttributeReference | null {
  return 'attribute' in instruction ? instruction.attribute : null;
}

function instructionProductHandles(instruction: TemplateInstruction): readonly ProductHandle[] {
  // Only intra-instruction ownership edges belong to this graph. Resource and generated-definition references retain
  // their compiler-world/compiled-template authorities and are not normalized-site products.
  if (instruction instanceof HydrateElementInstruction) return instruction.bindableInstructionProductHandles;
  if (instruction instanceof HydrateAttributeInstruction) return instruction.bindingInstructionProductHandles;
  if (instruction instanceof HydrateTemplateControllerInstruction) return instruction.bindingInstructionProductHandles;
  if (instruction instanceof HydrateLetElementInstruction) return instruction.instructionProductHandles;
  if (instruction instanceof IteratorBindingInstruction) return instruction.tailInstructionProductHandles;
  if (instruction instanceof SpreadElementPropBindingInstruction) return [instruction.instructionProductHandle];
  return [];
}

function sameHandleSequence(left: readonly ProductHandle[], right: readonly ProductHandle[]): boolean {
  return left.length === right.length && left.every((handle, index) => handle === right[index]);
}

function productHandle(handle: ProductHandle | null): readonly ProductHandle[] {
  return handle == null ? [] : [handle];
}
