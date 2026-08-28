import type { ProductHandle } from '../kernel/handles.js';
import type { OpenSeam } from '../kernel/open-seam.js';
import type { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type {
  CompiledTemplate,
  TemplateRenderTarget,
} from './compiled-template.js';
import {
  TemplateCompilerTargetContextStructuralAuthorityKind,
} from './compiler-target-plan.js';
import type {
  TemplateInstruction,
  TemplateInstructionSequence,
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

/** Narrow public view over one current in-process frozen family. */
export class TemplateCompilerContextFamilyValue {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly rootDefinition: CustomElementDefinition,
    readonly contexts: readonly TemplateCompilerContextFamilyValueContext[],
    readonly derivations: readonly TemplateStructureDerivation[],
    readonly instructions: readonly TemplateInstruction[],
    readonly sourceOpenSeams: readonly OpenSeam[],
    private readonly current: () => boolean,
  ) {
    if (
      authority !== compiledFamilyValueAuthority
      || contexts.length === 0
      || contexts[0]?.owner.ownerKind !== TemplateCompilerContextFamilyValueOwnerKind.Root
    ) {
      throw new Error('Compiled context-family value lost root or family coverage.');
    }
    this.#authority = authority;
  }

  get root(): TemplateCompilerContextFamilyValueContext {
    return this.contexts[0]!;
  }

  get compiledTemplates(): readonly CompiledTemplate[] {
    return this.contexts.map((context) => context.compiledTemplate);
  }

  isCurrent(): boolean {
    return this.#authority === compiledFamilyValueAuthority && this.current();
  }
}

export function projectTemplateCompilerContextFamilyValue(
  frozen: TemplateCompilerContextFamilyFrozenValue,
): TemplateCompilerContextFamilyValue {
  const contexts = frozen.contexts.map((context) => projectContext(context));
  const instructions = frozen.instructions;
  return new TemplateCompilerContextFamilyValue(
    compiledFamilyValueAuthority,
    frozen.rootDefinition,
    contexts,
    frozen.derivations,
    instructions,
    frozen.browserInput.openSeams,
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
