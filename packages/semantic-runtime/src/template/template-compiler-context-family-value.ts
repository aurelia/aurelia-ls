import type { ProductHandle } from '../kernel/handles.js';
import type { OpenSeam } from '../kernel/open-seam.js';
import type { ProductDetailReadView } from '../kernel/product-details.js';
import type { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type {
  CompiledTemplate,
  TemplateRenderTarget,
} from './compiled-template.js';
import {
  TemplateCompilerTargetContextStructuralAuthorityKind,
} from './compiler-target-plan.js';
import {
  TemplateInstructionKind,
  type TemplateInstruction,
  type TemplateInstructionSequence,
} from './instruction-ir.js';
import {
  CompilerTransformedTemplateComment,
  CompilerTransformedTemplateElement,
  CompilerTransformedTemplateText,
  type CompilerTransformedTemplateAttribute,
  type CompilerTransformedTemplateNode,
  type CompilerTransformedTemplateTree,
} from './template-structure.js';
import type { TemplateStructureDerivation } from './template-structure-derivation.js';
import type {
  TemplateCompilerContextFamilyFrozenContext,
  TemplateCompilerContextFamilyFrozenValue,
} from './template-compiler-context-family-frozen-value.js';
import {
  projectTemplateCompilerContextFamilyExpressionValue,
  type TemplateCompilerContextFamilyExpressionValue,
} from './template-compiler-context-family-expression-value.js';
import { TemplateCompilerTargetGeometryKind } from './template-compiler-structural-execution.js';

const compiledFamilyValueAuthority = {};

export const enum TemplateCompilerContextFamilyValueOwnerKind {
  Root = 'root',
  TemplateController = 'template-controller',
  Projection = 'projection',
}

/** Final definition-owner edge without exposing the target-plan context that established it. */
export class TemplateCompilerContextFamilyValueOwner {
  constructor(
    readonly ownerKind: TemplateCompilerContextFamilyValueOwnerKind,
    readonly parentCompiledTemplateProductHandle: ProductHandle | null,
    readonly instruction: TemplateInstruction | null,
    readonly slotName: string | null,
  ) {
    const root = ownerKind === TemplateCompilerContextFamilyValueOwnerKind.Root;
    const projection = ownerKind === TemplateCompilerContextFamilyValueOwnerKind.Projection;
    if (
      root !== (parentCompiledTemplateProductHandle == null && instruction == null)
      || (!root && (parentCompiledTemplateProductHandle == null || instruction == null))
      || projection !== (slotName != null)
    ) {
      throw new Error('Compiled context-family owner lost root, instruction, parent, or slot authority.');
    }
  }
}

export const enum TemplateCompilerContextFamilyValueGeometryKind {
  Marker = 'marker',
  RenderLocation = 'render-location',
}

export class TemplateCompilerContextFamilyMarkerGeometry {
  readonly geometryKind = TemplateCompilerContextFamilyValueGeometryKind.Marker;

  constructor(
    readonly marker: CompilerTransformedTemplateComment,
    readonly target: CompilerTransformedTemplateElement | CompilerTransformedTemplateText,
  ) {}

  get logicalTarget(): CompilerTransformedTemplateElement | CompilerTransformedTemplateText {
    return this.target;
  }
}

export class TemplateCompilerContextFamilyRenderLocationGeometry {
  readonly geometryKind = TemplateCompilerContextFamilyValueGeometryKind.RenderLocation;

  constructor(
    readonly marker: CompilerTransformedTemplateComment,
    readonly start: CompilerTransformedTemplateComment,
    readonly end: CompilerTransformedTemplateComment,
  ) {}

  get logicalTarget(): CompilerTransformedTemplateComment {
    return this.end;
  }
}

export type TemplateCompilerContextFamilyValueGeometry =
  | TemplateCompilerContextFamilyMarkerGeometry
  | TemplateCompilerContextFamilyRenderLocationGeometry;

/** One final runtime target row with its actual instructions and transformed-node geometry. */
export class TemplateCompilerContextFamilyValueRow {
  constructor(
    readonly target: TemplateRenderTarget,
    readonly sequence: TemplateInstructionSequence,
    readonly instructions: readonly TemplateInstruction[],
    readonly geometry: TemplateCompilerContextFamilyValueGeometry,
  ) {
    if (
      target.instructionSequenceProductHandle !== sequence.productHandle
      || sequence.ownerProductHandle !== target.productHandle
      || sequence.instructions.length !== instructions.length
    ) {
      throw new Error('Compiled context-family row lost target, sequence, or instruction coverage.');
    }
  }
}

/** Consumer-neutral final context. Mutable occurrence and allocation machinery ends before this view. */
export class TemplateCompilerContextFamilyValueContext {
  constructor(
    readonly owner: TemplateCompilerContextFamilyValueOwner,
    readonly tree: CompilerTransformedTemplateTree,
    readonly nodes: readonly CompilerTransformedTemplateNode[],
    readonly attributes: readonly CompilerTransformedTemplateAttribute[],
    readonly rows: readonly TemplateCompilerContextFamilyValueRow[],
    readonly compiledTemplate: CompiledTemplate,
  ) {
    if (
      compiledTemplate.transformedTree?.productHandle !== tree.productHandle
      || compiledTemplate.targets.length !== rows.length
      || compiledTemplate.targets.some((target, ordinal) => target !== rows[ordinal]?.target)
    ) {
      throw new Error('Compiled context-family context lost tree, target, or row coverage.');
    }
  }
}

/** Recursive compiler-definition discovery location over the final context family. */
export class TemplateCompilerContextFamilyDefinitionLocation {
  constructor(
    readonly context: TemplateCompilerContextFamilyValueContext,
    readonly parentContext: TemplateCompilerContextFamilyValueContext | null,
    readonly parentRowIndex: number | null,
    readonly parentInstructionIndex: number | null,
  ) {
    const root = context.owner.ownerKind === TemplateCompilerContextFamilyValueOwnerKind.Root;
    const parentInstruction = parentContext == null || parentRowIndex == null || parentInstructionIndex == null
      ? null
      : parentContext.rows[parentRowIndex]?.instructions[parentInstructionIndex] ?? null;
    if (
      root !== (parentContext == null && parentRowIndex == null && parentInstructionIndex == null)
      || (!root && (
        parentContext == null
        || parentInstruction !== context.owner.instruction
        || context.owner.parentCompiledTemplateProductHandle !== parentContext.compiledTemplate.productHandle
      ))
    ) {
      throw new Error('Compiled context-family definition location lost root or parent instruction ownership.');
    }
  }
}

/** Narrow public view over one current in-process frozen family. */
export class TemplateCompilerContextFamilyValue {
  readonly #authority: object;
  readonly #productDetails: ProductDetailReadView;
  readonly #liveExpressionByProduct: ReadonlyMap<ProductHandle, TemplateCompilerContextFamilyExpressionValue>;

  constructor(
    authority: object,
    readonly rootDefinition: CustomElementDefinition,
    readonly contexts: readonly TemplateCompilerContextFamilyValueContext[],
    readonly derivations: readonly TemplateStructureDerivation[],
    readonly instructions: readonly TemplateInstruction[],
    readonly sourceOpenSeams: readonly OpenSeam[],
    readonly liveExpressions: readonly TemplateCompilerContextFamilyExpressionValue[],
    productDetails: ProductDetailReadView,
    private readonly current: () => boolean,
  ) {
    this.#liveExpressionByProduct = new Map(liveExpressions.map((expression) => [
      expression.productHandle,
      expression,
    ]));
    if (
      authority !== compiledFamilyValueAuthority
      || contexts.length === 0
      || contexts[0]?.owner.ownerKind !== TemplateCompilerContextFamilyValueOwnerKind.Root
      || this.#liveExpressionByProduct.size !== liveExpressions.length
      || liveExpressions.some((expression) => !expression.isModuleConstructed())
    ) {
      throw new Error('Compiled context-family value lost root or family coverage.');
    }
    this.#authority = authority;
    this.#productDetails = productDetails;
  }

  get root(): TemplateCompilerContextFamilyValueContext {
    return this.contexts[0]!;
  }

  get compiledTemplates(): readonly CompiledTemplate[] {
    return this.contexts.map((context) => context.compiledTemplate);
  }

  liveExpressionForProduct(productHandle: ProductHandle): TemplateCompilerContextFamilyExpressionValue | null {
    return this.#liveExpressionByProduct.get(productHandle) ?? null;
  }

  isModuleConstructed(): boolean {
    return this.#authority === compiledFamilyValueAuthority;
  }

  hasProductDetailAuthority(productDetails: ProductDetailReadView): boolean {
    return this.isModuleConstructed() && this.#productDetails === productDetails;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed() && this.current();
  }
}

/** Order root and generated definitions exactly as recursive framework instruction discovery encounters them. */
export function orderTemplateCompilerContextFamilyDefinitions(
  value: TemplateCompilerContextFamilyValue,
): readonly TemplateCompilerContextFamilyDefinitionLocation[] {
  const childrenByInstruction = new Map<TemplateInstruction, TemplateCompilerContextFamilyValueContext[]>();
  for (const context of value.contexts) {
    const instruction = context.owner.instruction;
    if (instruction == null) continue;
    const children = childrenByInstruction.get(instruction);
    if (children == null) childrenByInstruction.set(instruction, [context]);
    else children.push(context);
  }
  const locations: TemplateCompilerContextFamilyDefinitionLocation[] = [];
  const seen = new Set<ProductHandle>();
  const visit = (
    context: TemplateCompilerContextFamilyValueContext,
    parentContext: TemplateCompilerContextFamilyValueContext | null,
    parentRowIndex: number | null,
    parentInstructionIndex: number | null,
  ): void => {
    if (seen.has(context.compiledTemplate.productHandle)) {
      throw new Error('Compiled context-family definition has more than one recursive owner location.');
    }
    seen.add(context.compiledTemplate.productHandle);
    locations.push(new TemplateCompilerContextFamilyDefinitionLocation(
      context,
      parentContext,
      parentRowIndex,
      parentInstructionIndex,
    ));
    for (const [rowIndex, row] of context.rows.entries()) {
      for (const [instructionIndex, instruction] of row.instructions.entries()) {
        for (const child of orderedDefinitionChildren(
          instruction,
          childrenByInstruction.get(instruction) ?? [],
        )) {
          visit(child, context, rowIndex, instructionIndex);
        }
      }
    }
  };
  visit(value.root, null, null, null);
  if (locations.length !== value.contexts.length || seen.size !== value.contexts.length) {
    throw new Error('Compiled context-family definition order did not cover every unique context.');
  }
  return locations;
}

function orderedDefinitionChildren(
  instruction: TemplateInstruction,
  children: readonly TemplateCompilerContextFamilyValueContext[],
): readonly TemplateCompilerContextFamilyValueContext[] {
  if (children.length === 0) return [];
  switch (instruction.instructionKind) {
    case TemplateInstructionKind.HydrateTemplateController:
      if (
        children.length !== 1
        || children[0]?.owner.ownerKind !== TemplateCompilerContextFamilyValueOwnerKind.TemplateController
        || children[0].compiledTemplate.productHandle !== instruction.childCompiledTemplate?.productHandle
      ) {
        throw new Error('Compiled context-family template-controller child does not match its instruction definition.');
      }
      return children;
    case TemplateInstructionKind.HydrateElement: {
      const byProduct = new Map(children.map((child) => [child.compiledTemplate.productHandle, child]));
      const ordered = instruction.projections.map((projection) => {
        const child = byProduct.get(projection.compiledTemplate.productHandle) ?? null;
        if (
          child == null
          || child.owner.ownerKind !== TemplateCompilerContextFamilyValueOwnerKind.Projection
          || child.owner.slotName !== projection.slotName
        ) {
          throw new Error(`Compiled context-family projection '${projection.slotName}' has no exact child context.`);
        }
        return child;
      });
      if (ordered.length !== children.length || new Set(ordered).size !== ordered.length) {
        throw new Error('Compiled context-family projection order did not cover every child context.');
      }
      return ordered;
    }
    default:
      throw new Error(`Instruction '${instruction.instructionKind}' unexpectedly owns a compiled definition.`);
  }
}

export function projectTemplateCompilerContextFamilyValue(
  frozen: TemplateCompilerContextFamilyFrozenValue,
  productDetails: ProductDetailReadView,
): TemplateCompilerContextFamilyValue {
  const contexts = frozen.contexts.map((context) => projectContext(context));
  const instructions = frozen.instructions;
  const liveAllocation = frozen.preparation.execution.attachment.target.allocation.rows.receipt.traversal.audit
    .transcript.allocationSnapshot;
  const liveExpressions = liveAllocation.expressionAllocations.map(
    (allocation) => projectTemplateCompilerContextFamilyExpressionValue(
      allocation,
      () => liveAllocation.isCurrent() && frozen.isCurrent(),
    ),
  );
  return new TemplateCompilerContextFamilyValue(
    compiledFamilyValueAuthority,
    frozen.rootDefinition,
    contexts,
    frozen.derivations,
    instructions,
    frozen.browserInput.openSeams,
    liveExpressions,
    productDetails,
    () => frozen.isCurrent(),
  );
}

function projectContext(
  context: TemplateCompilerContextFamilyFrozenContext,
): TemplateCompilerContextFamilyValueContext {
  const rows = context.rows.map((row) => new TemplateCompilerContextFamilyValueRow(
    row.target,
    row.sequence,
    row.preparation.row.instructions,
    projectGeometry(context, row.preparation.geometry),
  ));
  return new TemplateCompilerContextFamilyValueContext(
    projectOwner(context),
    context.tree,
    context.nodes,
    context.attributes,
    rows,
    context.compiledTemplate,
  );
}

function projectOwner(
  context: TemplateCompilerContextFamilyFrozenContext,
): TemplateCompilerContextFamilyValueOwner {
  const target = context.preparation.context;
  const parent = target.ownerContext?.compiledTemplate.productHandle ?? null;
  switch (target.structuralAuthority.authorityKind) {
    case TemplateCompilerTargetContextStructuralAuthorityKind.Root:
      return new TemplateCompilerContextFamilyValueOwner(
        TemplateCompilerContextFamilyValueOwnerKind.Root,
        null,
        null,
        null,
      );
    case TemplateCompilerTargetContextStructuralAuthorityKind.TemplateController:
      return new TemplateCompilerContextFamilyValueOwner(
        TemplateCompilerContextFamilyValueOwnerKind.TemplateController,
        parent,
        target.structuralAuthority.instruction,
        null,
      );
    case TemplateCompilerTargetContextStructuralAuthorityKind.Projection:
      return new TemplateCompilerContextFamilyValueOwner(
        TemplateCompilerContextFamilyValueOwnerKind.Projection,
        parent,
        target.structuralAuthority.instruction,
        target.structuralAuthority.projection.slotName,
      );
  }
}

function projectGeometry(
  context: TemplateCompilerContextFamilyFrozenContext,
  geometry: TemplateCompilerContextFamilyFrozenContext['preparation']['rows'][number]['geometry'],
): TemplateCompilerContextFamilyValueGeometry {
  const marker = transformedNode(context, geometry.marker);
  if (!(marker instanceof CompilerTransformedTemplateComment)) {
    throw new Error(`Target geometry marker '${geometry.marker.occurrenceKey}' is not one transformed comment.`);
  }
  switch (geometry.geometryKind) {
    case TemplateCompilerTargetGeometryKind.Marker: {
      const target = transformedNode(context, geometry.target);
      if (
        !(target instanceof CompilerTransformedTemplateElement)
        && !(target instanceof CompilerTransformedTemplateText)
      ) {
        throw new Error(`Marker target '${geometry.target.occurrenceKey}' is not one transformed element or text.`);
      }
      return new TemplateCompilerContextFamilyMarkerGeometry(marker, target);
    }
    case TemplateCompilerTargetGeometryKind.RenderLocation: {
      const start = transformedNode(context, geometry.start);
      const end = transformedNode(context, geometry.end);
      if (
        !(start instanceof CompilerTransformedTemplateComment)
        || !(end instanceof CompilerTransformedTemplateComment)
      ) {
        throw new Error(`Render location '${geometry.row.localKey}' lost transformed start or end comments.`);
      }
      return new TemplateCompilerContextFamilyRenderLocationGeometry(marker, start, end);
    }
  }
}

function transformedNode(
  context: TemplateCompilerContextFamilyFrozenContext,
  occurrence: Parameters<TemplateCompilerContextFamilyFrozenContext['nodeByOccurrence']['get']>[0],
): CompilerTransformedTemplateNode {
  const node = context.nodeByOccurrence.get(occurrence) ?? null;
  if (node == null) {
    throw new Error(`Final context has no transformed node for occurrence '${occurrence.occurrenceKey}'.`);
  }
  return node;
}
