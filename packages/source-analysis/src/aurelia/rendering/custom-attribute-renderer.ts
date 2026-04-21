import type { CustomAttributeDefinition } from '../resources/index.js';
import {
  AttributeInvocationContext,
  AttributeInvocationContextOpenSeam,
} from '../compiler/attribute-invocation-context.js';
import { AttributeController, Controller } from '../compiler/controller.js';
import type { CompiledElementNode } from '../compiler/compiled-template.js';
import { CompilerChildWorldBuilder } from '../compiler/child-world-formation.js';
import type { CompilerAttributeBindingLowering } from '../compiler/custom-attribute-binding-lowering.js';
import { PreparedHydrateAttributeInstruction } from '../compiler/prepared-resource-hydration.js';
import type { InstructionRenderer } from './instruction-renderer.js';
import type { InstructionRendererAdmissionProvenance } from './renderer-admission.js';

export const CUSTOM_ATTRIBUTE_PREPARATION_OPEN_SEAM_KINDS = [
  'attribute-dependencies-open',
  'prop-render-open',
] as const;

export type CustomAttributePreparationOpenSeamKind =
  typeof CUSTOM_ATTRIBUTE_PREPARATION_OPEN_SEAM_KINDS[number];

export class CustomAttributePreparationOpenSeam {
  constructor(
    readonly kind: CustomAttributePreparationOpenSeamKind,
    readonly note: string | null = null,
  ) {}
}

export class CustomAttributePreparation {
  constructor(
    readonly hostElement: CompiledElementNode,
    readonly resource: CustomAttributeDefinition,
    readonly controller: AttributeController,
    readonly invocation: AttributeInvocationContext,
    readonly lowering: CompilerAttributeBindingLowering,
    readonly openSeams: readonly CustomAttributePreparationOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}

export class CustomAttributeRenderer implements InstructionRenderer {
  private readonly childWorldBuilder = new CompilerChildWorldBuilder();
  readonly referenceName = 'CustomAttributeRenderer';
  readonly instructionKind = 'hydrate-attribute' as const;

  constructor(
    readonly admission: InstructionRendererAdmissionProvenance,
    readonly note: string | null = 'Builtin CustomAttributeRenderer prepares an attribute child world and hydrates a custom-attribute controller.',
  ) {}

  prepareCustomAttributes(
    parentController: Controller,
    hostElement: CompiledElementNode,
  ): readonly CustomAttributePreparation[] {
    return this.prepareCustomAttributesFromInstructions(
      parentController,
      hostElement.structuralCarrier.customAttributeBindings
        .filter((current): current is CompilerAttributeBindingLowering & { resource: CustomAttributeDefinition } => current.resource.kind === 'custom-attribute')
        .map((current) => new PreparedHydrateAttributeInstruction(
          hostElement,
          current.resource,
          current,
          'Prepared hydrate-attribute instruction derived from the current compiled-element carrier.',
        )),
    );
  }

  prepareCustomAttributesFromInstructions(
    parentController: Controller,
    instructions: readonly PreparedHydrateAttributeInstruction[],
  ): readonly CustomAttributePreparation[] {
    return instructions
      .map((current, index) => this.prepareOne(parentController, current, index))
      .filter((current): current is CustomAttributePreparation => current != null);
  }

  private prepareOne(
    parentController: Controller,
    instruction: PreparedHydrateAttributeInstruction,
    index: number,
  ): CustomAttributePreparation | null {
    const hostElement = instruction.hostElement;
    const resource = instruction.resource;
    const lowering = instruction.lowering;
    const worldFormation = this.childWorldBuilder.create(parentController.world, {
      suffix: `attr:${sanitizeName(resource.name)}:${index}`,
      owner: resource.type,
      mode: 'child-world',
      includeDependencyOpenSeam: true,
      note: 'invokeAttribute-like child world for a custom-attribute controller.',
    });
    const invocation = new AttributeInvocationContext(
      resource,
      parentController,
      worldFormation.resultWorld,
      worldFormation,
      instruction,
      null,
      null,
      [
        new AttributeInvocationContextOpenSeam(
          'published-di-surface-open',
          'invokeAttribute(...) publishes IController, IInstruction, IRenderLocation, and IViewFactory into a child container. The clean-room records that publication contract here, but it does not yet materialize those DI entries as a separate container-state slice.',
        ),
        new AttributeInvocationContextOpenSeam(
          'attribute-dependencies-open',
          'definition.dependencies are known to register into this controller-owned child world at runtime, but the later registration-subject consequence is still provisional in the clean-room model.',
        ),
      ],
      'Tooling-time invokeAttribute-like context over the CA controller child world.',
    );
    // TODO: runtime invokeAttribute(...) registers instance providers for the
    // current controller, instruction, location, and view-factory into the CA
    // child container. Represent that only when the DI layer can model those
    // temporally scoped instance publications, not as a detached shim.
    const controller = Controller.$attr(
      worldFormation.resultWorld,
      resource,
      parentController,
      null,
      null,
      worldFormation,
    );

    return new CustomAttributePreparation(
      hostElement,
      resource,
      controller,
      invocation,
      lowering,
      [
        new CustomAttributePreparationOpenSeam(
          'attribute-dependencies-open',
          'Custom-attribute definition.dependencies are preserved on the support surface, but their later registration-subject consequence inside the CA child world is still provisional.',
        ),
        new CustomAttributePreparationOpenSeam(
          'prop-render-open',
          'Renderer-driven property/binding consumption over the CA controller still belongs to a later layer; this slice stops at controller/invocation preparation.',
        ),
      ],
      'Generic CustomAttributeRenderer-like preparation over one lowered custom-attribute use.',
    );
  }

  prepareCustomElement(
    _parentController: Controller,
    _hostElement: CompiledElementNode,
  ): null {
    return null;
  }

  prepareTemplateController(
    _parentController: Controller,
    _hostElement: CompiledElementNode,
  ): null {
    return null;
  }
}

function sanitizeName(
  name: string | null,
): string {
  return (name ?? 'anonymous').replaceAll(':', '_');
}
