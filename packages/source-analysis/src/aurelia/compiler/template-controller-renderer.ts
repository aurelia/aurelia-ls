import type { TemplateControllerDefinition } from '../resources/index.js';
import {
  AttributeInvocationContext,
  AttributeInvocationContextOpenSeam,
} from './attribute-invocation-context.js';
import { AttributeController, Controller, RenderLocation } from './controller.js';
import type { CompiledElementNode } from './compiled-template.js';
import { CompilerChildWorldBuilder } from './child-world-formation.js';
import {
  TemplateControllerProfileResolver,
} from './template-controller-profile.js';
import type { TemplateControllerProfile } from './template-controller-profile.js';
import type { InstructionRenderer } from '../rendering/instruction-renderer.js';
import type { InstructionRendererAdmissionProvenance } from '../rendering/renderer-admission.js';
import { ViewFactory } from './view-factory.js';

export const TEMPLATE_CONTROLLER_PREPARATION_OPEN_SEAM_KINDS = [
  'attribute-dependencies-open',
  'view-realization-deferred',
  'linked-branch-profile-open',
] as const;

export type TemplateControllerPreparationOpenSeamKind =
  typeof TEMPLATE_CONTROLLER_PREPARATION_OPEN_SEAM_KINDS[number];

export class TemplateControllerPreparationOpenSeam {
  constructor(
    readonly kind: TemplateControllerPreparationOpenSeamKind,
    readonly note: string | null = null,
  ) {}
}

export class TemplateControllerPreparation {
  constructor(
    readonly hostElement: CompiledElementNode,
    readonly resource: TemplateControllerDefinition,
    readonly profile: TemplateControllerProfile,
    readonly controller: AttributeController,
    readonly renderLocation: RenderLocation,
    readonly invocation: AttributeInvocationContext,
    readonly viewFactory: ViewFactory,
    readonly openSeams: readonly TemplateControllerPreparationOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}

export class TemplateControllerRenderer implements InstructionRenderer {
  private readonly childWorldBuilder = new CompilerChildWorldBuilder();
  private readonly profileResolver = new TemplateControllerProfileResolver();
  readonly referenceName = 'TemplateControllerRenderer';
  readonly instructionKind = 'hydrate-template-controller' as const;

  constructor(
    readonly admission: InstructionRendererAdmissionProvenance,
    readonly note: string | null = 'Builtin TemplateControllerRenderer prepares the TC controller world, render location, and nested view-factory, while later value-driven behavior decides when synthetic views are realized.',
  ) {}

  prepareTemplateController(
    parentController: Controller,
    hostElement: CompiledElementNode,
  ): TemplateControllerPreparation | null {
    const lowering = hostElement.templateControllerLowering;
    if (lowering == null) {
      return null;
    }

    const instruction = lowering.outermostInstruction;
    // NOTE: runtime spends only the outermost TC instruction at the current
    // element. Inner TCs live inside the nested anonymous definition and only
    // become current later when a built-in family actually prepares or realizes
    // synthetic views through the prepared view-factory.
    const renderLocation = new RenderLocation(
      `render-location:${hostElement.authored.id}:${instruction.resource.id}`,
      hostElement,
      'Template-controller render anchor carried separately from the CA controller, matching runtime’s render-location split.',
    );
    const controllerWorldFormation = this.childWorldBuilder.create(parentController.world, {
      suffix: `attr:${sanitizeName(instruction.resource.name)}`,
      owner: instruction.resource.type,
      mode: 'child-world',
      includeDependencyOpenSeam: true,
      note: 'invokeAttribute-like child world for the template-controller custom-attribute controller.',
    });
    const viewWorldFormation = this.childWorldBuilder.create(parentController.world, {
      suffix: `view:${sanitizeName(instruction.resource.name)}`,
      owner: instruction.resource.type,
      mode: instruction.resource.containerStrategy === 'new'
        ? 'child-world-inherit-parent-resources'
        : 'reuse-parent-world',
      note: instruction.resource.containerStrategy === 'new'
        ? 'View-factory world mirrors runtime containerStrategy=new by requesting a fresh child world that inherits parent resources.'
        : 'View-factory world mirrors runtime containerStrategy=reuse by reusing the parent consulted world.',
    });
    const viewFactory = new ViewFactory(
      `view-factory:${instruction.resource.id}:${viewWorldFormation.resultWorld.world.id}`,
      viewWorldFormation.resultWorld,
      instruction.definition,
      viewWorldFormation,
      'Prepared TC view-factory shell over the nested anonymous definition produced during compile-time structural lowering. The factory is available to later runtime-like behavior, but ordinary compiler preparation does not create synthetic views yet.',
    );
    const invocation = new AttributeInvocationContext(
      instruction.resource,
      parentController,
      controllerWorldFormation.resultWorld,
      controllerWorldFormation,
      instruction,
      renderLocation,
      viewFactory,
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
      'Tooling-time invokeAttribute-like context over the TC controller child world.',
    );
    // TODO: runtime invokeAttribute(...) also registers IController,
    // IInstruction, IRenderLocation, and IViewFactory into the attribute child
    // container. The clean-room keeps the invocation contract explicit first;
    // the finer DI publication layer should land later rather than being
    // over-compressed here.
    const controller = Controller.$attr(
      controllerWorldFormation.resultWorld,
      instruction.resource,
      parentController,
      viewFactory,
      renderLocation,
      controllerWorldFormation,
    );
    const profile = this.profileResolver.resolve(instruction.resource);
    const openSeams: TemplateControllerPreparationOpenSeam[] = [
      new TemplateControllerPreparationOpenSeam(
        'attribute-dependencies-open',
        'Template-controller definition.dependencies are preserved on the support surface, but their later registration-subject consequence inside controller-owned child worlds is still provisional.',
      ),
      new TemplateControllerPreparationOpenSeam(
        'view-realization-deferred',
        'Generic TC preparation stops before synthetic-view creation. Builtin profiles and later runtime-like value surfaces decide when a prepared view factory actually realizes one or more synthetic views.',
      ),
    ];

    if (profile.profileKind === 'custom') {
      openSeams.push(new TemplateControllerPreparationOpenSeam(
        'linked-branch-profile-open',
        'No builtin product profile matched this template controller. Generic preparation is still valid, but later branch/link/view semantics remain open until a custom profile overlay is attached.',
      ));
    }

    return new TemplateControllerPreparation(
      hostElement,
      instruction.resource,
      profile,
      controller,
      renderLocation,
      invocation,
      viewFactory,
      openSeams,
      'Generic TemplateControllerRenderer-like preparation over one outermost TC instruction.',
    );
  }

  prepareCustomElement(
    _parentController: Controller,
    _hostElement: CompiledElementNode,
  ): null {
    return null;
  }

  prepareCustomAttributes(
    _parentController: Controller,
    _hostElement: CompiledElementNode,
  ): readonly [] {
    return [];
  }
}

function sanitizeName(
  name: string | null,
): string {
  return (name ?? 'anonymous').replaceAll(':', '_');
}
