import type {
  CustomAttributeDefinition,
  CustomElementDefinition,
  TemplateControllerDefinition,
} from '../resources/index.js';
import type { CompiledElementNode, CompilerAnonymousElementDefinition } from './compiled-template.js';
import type { CompilerConsultedWorld } from './compiler-consulted-world.js';
import type { CompilerChildWorldFormation } from './child-world-formation.js';
import type { ViewFactory } from './view-factory.js';

export const CONTROLLER_KINDS = [
  'custom-element',
  'custom-attribute',
  'synthetic-view',
] as const;

export type ControllerKind =
  typeof CONTROLLER_KINDS[number];

export class RenderLocation {
  constructor(
    readonly id: string,
    readonly hostElement: CompiledElementNode,
    readonly note: string | null = null,
  ) {}
}

export interface Controller {
  readonly id: string;
  readonly controllerKind: ControllerKind;
  readonly world: CompilerConsultedWorld;
  readonly parent: Controller | null;
  readonly worldFormation: CompilerChildWorldFormation | null;
  readonly note: string | null;
}

export class ElementController implements Controller {
  readonly controllerKind = 'custom-element' as const;

  constructor(
    readonly id: string,
    readonly world: CompilerConsultedWorld,
    readonly definition: CustomElementDefinition | null = null,
    readonly parent: Controller | null = null,
    readonly hostElement: CompiledElementNode | null = null,
    readonly worldFormation: CompilerChildWorldFormation | null = null,
    readonly note: string | null = null,
  ) {}
}

export class AttributeController implements Controller {
  readonly controllerKind = 'custom-attribute' as const;

  constructor(
    readonly id: string,
    readonly world: CompilerConsultedWorld,
    readonly definition: CustomAttributeDefinition | TemplateControllerDefinition,
    readonly parent: Controller | null = null,
    readonly viewFactory: ViewFactory | null = null,
    readonly renderLocation: RenderLocation | null = null,
    readonly worldFormation: CompilerChildWorldFormation | null = null,
    readonly note: string | null = null,
  ) {}
}

export class SyntheticView implements Controller {
  readonly controllerKind = 'synthetic-view' as const;

  constructor(
    readonly id: string,
    readonly world: CompilerConsultedWorld,
    readonly definition: CompilerAnonymousElementDefinition,
    readonly viewFactory: ViewFactory,
    readonly parent: Controller | null = null,
    readonly worldFormation: CompilerChildWorldFormation | null = null,
    readonly note: string | null = null,
  ) {}
}

export const Controller = {
  $el(
    world: CompilerConsultedWorld,
    definition: CustomElementDefinition | null = null,
    parent: Controller | null = null,
    hostElement: CompiledElementNode | null = null,
    worldFormation: CompilerChildWorldFormation | null = null,
  ): ElementController {
    // NOTE: unlike runtime, tooling can create an element-controller shell
    // before a concrete view-model instance or host DOM node exists. That lets
    // later compilation/hydration planning talk about the owning CE world
    // boundary without pretending runtime values already exist.
    return new ElementController(
      `controller:el:${definition?.id ?? world.world.id}`,
      world,
      definition,
      parent,
      hostElement,
      worldFormation,
      definition == null
        ? 'Tooling-owned element-controller shell without a concrete runtime CE definition yet.'
        : 'Element-controller shell over a consulted world and optional authored host element.',
    );
  },

  $attr(
    world: CompilerConsultedWorld,
    definition: CustomAttributeDefinition | TemplateControllerDefinition,
    parent: Controller | null = null,
    viewFactory: ViewFactory | null = null,
    renderLocation: RenderLocation | null = null,
    worldFormation: CompilerChildWorldFormation | null = null,
  ): AttributeController {
    return new AttributeController(
      `controller:attr:${definition.id}:${world.world.id}`,
      world,
      definition,
      parent,
      viewFactory,
      renderLocation,
      worldFormation,
      'Custom-attribute/template-controller controller shell over a consulted child world.',
    );
  },

  $view(
    viewFactory: ViewFactory,
    parent: Controller | null = null,
  ): SyntheticView {
    return new SyntheticView(
      `controller:view:${viewFactory.id}`,
      viewFactory.world,
      viewFactory.definition,
      viewFactory,
      parent,
      viewFactory.worldFormation,
      'Synthetic-view controller shell created from a view-factory over a nested anonymous definition.',
    );
  },
};
