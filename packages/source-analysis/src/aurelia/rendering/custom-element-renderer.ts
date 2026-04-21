import type { CustomElementDefinition } from '../resources/index.js';
import {
  ElementInvocationContext,
  ElementInvocationContextOpenSeam,
} from '../compiler/element-invocation-context.js';
import {
  Controller,
  ElementController,
  RenderLocation,
} from '../compiler/controller.js';
import type { CompiledElementNode } from '../compiler/compiled-template.js';
import { CompilerChildWorldBuilder } from '../compiler/child-world-formation.js';
import { PreparedHydrateElementInstruction } from '../compiler/prepared-resource-hydration.js';
import type { InstructionRenderer } from './instruction-renderer.js';
import type { InstructionRendererAdmissionProvenance } from './renderer-admission.js';

export const CUSTOM_ELEMENT_PREPARATION_OPEN_SEAM_KINDS = [
  'element-dependencies-open',
  'projection-open',
] as const;

export type CustomElementPreparationOpenSeamKind =
  typeof CUSTOM_ELEMENT_PREPARATION_OPEN_SEAM_KINDS[number];

export class CustomElementPreparationOpenSeam {
  constructor(
    readonly kind: CustomElementPreparationOpenSeamKind,
    readonly note: string | null = null,
  ) {}
}

export class CustomElementPreparation {
  constructor(
    readonly hostElement: CompiledElementNode,
    readonly resource: CustomElementDefinition,
    readonly controller: ElementController,
    readonly invocation: ElementInvocationContext,
    readonly renderLocation: RenderLocation | null = null,
    readonly openSeams: readonly CustomElementPreparationOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}

export class CustomElementRenderer implements InstructionRenderer {
  private readonly childWorldBuilder = new CompilerChildWorldBuilder();
  readonly referenceName = 'CustomElementRenderer';
  readonly instructionKind = 'hydrate-element' as const;

  constructor(
    readonly admission: InstructionRendererAdmissionProvenance,
    readonly note: string | null = 'Builtin CustomElementRenderer prepares an element child world, invokes the CE, and hydrates an element controller.',
  ) {}

  prepareCustomElement(
    parentController: Controller,
    hostElement: CompiledElementNode,
  ): CustomElementPreparation | null {
    const resource = hostElement.structuralCarrier.classification.receiverElement;
    if (resource == null) {
      return null;
    }
    return this.prepareCustomElementFromInstruction(
      parentController,
      new PreparedHydrateElementInstruction(
        hostElement,
        resource,
        'Prepared hydrate-element instruction derived from the current compiled-element carrier.',
      ),
    );
  }

  prepareCustomElementFromInstruction(
    parentController: Controller,
    instruction: PreparedHydrateElementInstruction,
  ): CustomElementPreparation | null {
    const hostElement = instruction.hostElement;
    const resource = instruction.resource;

    const renderLocation = resource.policy.containerless === true
      ? new RenderLocation(
        `render-location:${hostElement.authored.id}:${resource.id}`,
        hostElement,
        'Containerless custom element render anchor prepared separately from the CE controller, matching runtime’s render-location split.',
      )
      : null;
    const worldFormation = this.childWorldBuilder.create(parentController.world, {
      suffix: `el:${sanitizeName(resource.name)}`,
      owner: resource.type,
      mode: 'child-world',
      includeDependencyOpenSeam: true,
      note: 'createElementContainer-like child world for a custom-element renderer path.',
    });
    const invocation = new ElementInvocationContext(
      resource,
      parentController,
      worldFormation.resultWorld,
      worldFormation,
      instruction,
      renderLocation,
      [
        new ElementInvocationContextOpenSeam(
          'published-di-surface-open',
          'createElementContainer(...) publishes IController, IInstruction, IRenderLocation, IViewFactory, and optional slot info into a child container. The clean-room records that publication contract here, but it does not yet materialize those DI entries as a separate container-state slice.',
        ),
        new ElementInvocationContextOpenSeam(
          'projection-slots-open',
          'Projection/slot publication from hydrate-element instructions is not modeled yet, so the element invocation context keeps projection setup open.',
        ),
        new ElementInvocationContextOpenSeam(
          'element-dependencies-open',
          'definition.dependencies are known to register into this custom-element child world at runtime, but the later registration-subject consequence is still provisional in the clean-room model.',
        ),
      ],
      'Tooling-time createElementContainer-like context over the CE child world.',
    );
    // TODO: runtime createElementContainer(...) registers instance providers for
    // IController, IInstruction, IRenderLocation, IViewFactory, and optional
    // slot info into the child container. Do not summarize that as a fake
    // publication object; land it only when the compile-time DI layer can
    // represent those temporally scoped instance publications honestly.
    const controller = Controller.$el(
      worldFormation.resultWorld,
      resource,
      parentController,
      hostElement,
      worldFormation,
    );

    return new CustomElementPreparation(
      hostElement,
      resource,
      controller,
      invocation,
      renderLocation,
      [
        new CustomElementPreparationOpenSeam(
          'element-dependencies-open',
          'Custom-element definition.dependencies are preserved on the support surface, but their later registration-subject consequence inside the CE child world is still provisional.',
        ),
        new CustomElementPreparationOpenSeam(
          'projection-open',
          'Projection ownership, slot publication, and later child-controller linkage still belong to a later renderer preparation slice.',
        ),
      ],
      'Generic CustomElementRenderer-like preparation over a compiled element receiver.',
    );
  }

  prepareCustomAttributes(): readonly never[] {
    return [];
  }

  prepareTemplateController(): null {
    return null;
  }
}

function sanitizeName(
  name: string | null,
): string {
  return (name ?? 'anonymous').replaceAll(':', '_');
}
