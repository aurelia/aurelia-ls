import type { CustomElementDefinition } from '../resources/index.js';
import { AuSlotsInfo } from '../compiler/au-slots-info.js';
import {
  ElementInvocationContext,
  ElementInvocationContextOpenSeam,
} from '../compiler/element-invocation-context.js';
import {
  Controller,
  ElementController,
  RenderLocation,
} from '../compiler/controller.js';
import { HydrationContext } from '../compiler/hydration-context.js';
import { ControllerLocalStateMaterializer } from '../compiler/controller-local-state.js';
import {
  HydrationConstructionContractMaterializer,
} from '../compiler/hydration-construction.js';
import {
  HydrationPublication,
  HydrationPublicationContract,
  HydrationPublicationStateMaterializer,
} from '../compiler/hydration-publication.js';
import {
  CompilerAnonymousElementDefinition,
  type CompilerProjectionSlot,
  type CompiledElementNode,
} from '../compiler/compiled-template.js';
import { LookupScopeAssemblyBuilder } from '../compiler/lookup-scope-assembly.js';
import { CompilerChildWorldBuilder } from '../compiler/child-world-formation.js';
import { PreparedHydrateElementInstruction } from '../compiler/prepared-resource-hydration.js';
import {
  AuSlotContentSelection,
  AuSlotPreparation,
  AuSlotPreparationOpenSeam,
} from './au-slot-preparation.js';
import { ViewFactory } from '../compiler/view-factory.js';
import type { InstructionRenderer } from './instruction-renderer.js';
import type { InstructionRendererAdmissionProvenance } from './renderer-admission.js';

export const CUSTOM_ELEMENT_PREPARATION_OPEN_SEAM_KINDS = [
  'element-dependencies-open',
  'children-binding-open',
  'slotted-watcher-open',
  'projection-open',
  'construction-dependencies-open',
  'construction-lookup-regime-open',
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
    readonly hydrationContext: HydrationContext,
    readonly hydrationPublication: HydrationPublicationContract,
    readonly hydrationPublishedContainerState: readonly import('../registrations/index.js').ContainerStateEntry[] = [],
    readonly hydrationPublishedContainerStateOpenSeams: readonly import('../registrations/index.js').ContainerStateOpenSeam[] = [],
    readonly controllerLocalContainerState: readonly import('../registrations/index.js').ContainerStateEntry[] = [],
    readonly controllerLocalContainerStateOpenSeams: readonly import('../registrations/index.js').ContainerStateOpenSeam[] = [],
    readonly auSlot: AuSlotPreparation | null = null,
    readonly renderLocation: RenderLocation | null = null,
    readonly openSeams: readonly CustomElementPreparationOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}

export class CustomElementRenderer implements InstructionRenderer {
  private readonly childWorldBuilder = new CompilerChildWorldBuilder();
  private readonly constructionContractMaterializer = new HydrationConstructionContractMaterializer();
  private readonly publicationStateMaterializer = new HydrationPublicationStateMaterializer();
  private readonly controllerLocalStateMaterializer = new ControllerLocalStateMaterializer();
  private readonly lookupScopeBuilder = new LookupScopeAssemblyBuilder();
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
        hostElement.structuralCarrier.projectionExtraction,
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
    const auSlotsInfo = instruction.projections == null
      ? null
      : new AuSlotsInfo(
        instruction.projections.readProjectedSlotNames(),
        'Projected slot names prepared from compile-time projection extraction.',
      );
    const publishedAuSlotsInfo = auSlotsInfo ?? new AuSlotsInfo(
      [],
      'Runtime createElementContainer(...) still publishes IAuSlotsInfo when no projections close, but the provider resolves an empty AuSlotsInfo by default.',
    );

    const renderLocation = resource.policy.containerless === true
      ? new RenderLocation(
        `render-location:${hostElement.authored.id}:${resource.id}`,
        hostElement,
        'Containerless custom element render anchor prepared separately from the CE controller, matching runtime’s render-location split.',
      )
      : null;
    const boundarySource = readHydrationBoundarySource(hostElement);
    const worldFormation = this.childWorldBuilder.create(parentController.world, {
      suffix: `el:${sanitizeName(resource.name)}`,
      owner: resource.type,
      mode: 'child-world',
      includeDependencyOpenSeam: true,
      note: 'createElementContainer-like child world for a custom-element renderer path.',
    });
    const publicationContract = new HydrationPublicationContract(
      'create-element-container',
      [
        new HydrationPublication(
          'IController',
          'value',
          parentController,
          'createElementContainer(...) publishes the current rendering controller into the CE child container.',
          boundarySource,
        ),
        new HydrationPublication(
          'IInstruction',
          'value',
          instruction,
          'createElementContainer(...) publishes the hydrate-element instruction into the CE child container.',
          boundarySource,
        ),
        new HydrationPublication(
          'IRenderLocation',
          renderLocation == null ? 'nullable' : 'value',
          renderLocation,
          renderLocation == null
            ? 'Runtime createElementContainer(...) always registers IRenderLocation, but containerless=false resolves it to null.'
            : 'Runtime createElementContainer(...) publishes the containerless render location into the CE child container.',
          boundarySource,
        ),
        new HydrationPublication(
          'IViewFactory',
          'throwing',
          null,
          'Runtime createElementContainer(...) always registers IViewFactory, but the default CE path uses a provider that throws if resolved.',
          boundarySource,
        ),
        new HydrationPublication(
          'IAuSlotsInfo',
          auSlotsInfo == null ? 'empty-default' : 'value',
          publishedAuSlotsInfo,
          auSlotsInfo == null
            ? 'Runtime createElementContainer(...) publishes an empty AuSlotsInfo when no projections close.'
            : 'Runtime createElementContainer(...) publishes projected slot names into the CE child container.',
          boundarySource,
        ),
      ],
      'Runtime-shaped publication contract over createElementContainer(...).',
    );
    const publicationState = this.publicationStateMaterializer.materialize(
      resource.type,
      worldFormation.resultWorld.world,
      boundarySource,
      publicationContract,
    );
    const invocation = new ElementInvocationContext(
      resource,
      parentController,
      worldFormation.resultWorld,
      worldFormation,
      instruction,
      auSlotsInfo,
      renderLocation,
      publicationContract,
      publicationState.entries,
      publicationState.openSeams,
      [
        new ElementInvocationContextOpenSeam(
          'published-di-surface-open',
          'createElementContainer(...) publication now closes as both a runtime-shaped publication contract and a keyed child-container overlay. Later lookup-time behavior is now surfaced separately as construction lookup requirements, but the actual container-lookup evaluator still belongs to a later slice.',
        ),
        new ElementInvocationContextOpenSeam(
          'projection-slots-open',
          auSlotsInfo == null
            ? 'Projection/slot publication from hydrate-element instructions is not modeled yet, so the element invocation context keeps projection setup open.'
            : 'Projected slot names are known from compile-time [au-slot] extraction and are carried through a runtime-shaped AuSlotsInfo value, but DI publication and deeper <au-slot> topology still belong to a later slice.',
        ),
        new ElementInvocationContextOpenSeam(
          'element-dependencies-open',
          'definition.dependencies now spend the bounded direct-register constructable subset into controller-local keyed overlay state. Resource-key visibility and richer registry-object consequence still remain open at the child-world layer.',
        ),
      ],
      'Tooling-time createElementContainer-like context over the CE child world.',
    );
    // TODO: child-container publication now closes as keyed overlay state for
    // instance/null/throwing/default providers. The remaining later slice is
    // lookup-time behavior layered above that state, such as
    // fromHydrationContext(key) => hydrationContext.controller.container.get(own(key)).
    const controller = Controller.$el(
      worldFormation.resultWorld,
      resource,
      parentController,
      hostElement,
      worldFormation,
    );
    const hydrationContext = new HydrationContext(
      `hydration-context:${controller.id}`,
      controller,
      instruction,
      readParentHydrationContext(parentController),
      'Runtime-shaped CE hydration context over the current element controller and hydrate-element instruction.',
    );
    const hydrationPublication = new HydrationPublicationContract(
      'controller-hydration-context',
      [
        new HydrationPublication(
          'IHydrationContext',
          'value',
          hydrationContext,
          'Controller.$el(...) publishes a custom-element-owned hydration context into the CE container for later internal-template consumers.',
          boundarySource,
        ),
      ],
      'Runtime-shaped CE hydration-context publication contract.',
    );
    const hydrationPublicationState = this.publicationStateMaterializer.materialize(
      resource.type,
      worldFormation.resultWorld.world,
      boundarySource,
      hydrationPublication,
    );
    const controllerLocalState = this.controllerLocalStateMaterializer.materializeDefinitionTypeInstance(
      resource.type,
      worldFormation.resultWorld.world,
      boundarySource,
      'custom-element controller',
    );
    const dependencyLocalState = this.controllerLocalStateMaterializer.materializeDefinitionDependencies(
      resource.dependencies,
      worldFormation.resultWorld.resources,
      worldFormation.resultWorld.world,
      boundarySource,
      'custom-element controller',
    );
    const lookupScope = this.lookupScopeBuilder.attachControllerScope(
      controller,
      [
        ...publicationState.entries,
        ...hydrationPublicationState.entries,
        ...controllerLocalState.entries,
        ...dependencyLocalState.entries,
      ],
      {
        note: 'Lookup scope over the custom-element child container overlay, including renderer publication, controller-owned definition.Type state, bounded definition.dependencies consequence, and hydration-context publication.',
      },
    );
    invocation.lookupScope = lookupScope;
    const constructionContract = this.constructionContractMaterializer.materialize(resource.type);
    const constructionOpenSeams = readUnsatisfiedRequirements(
      constructionContract.requirements,
      [publicationContract, hydrationPublication],
    );
    const constructionLookupOpenSeams = readLookupRequirementSeams(
      constructionContract.lookupRequirements,
    );
    const auSlot = resource.name === 'au-slot'
      ? this.prepareAuSlot(parentController, hostElement, instruction, resource)
      : null;
    const openSeams: CustomElementPreparationOpenSeam[] = [
      ...(resource.dependencies.entries.length > 0 || dependencyLocalState.openSeams.length > 0
        ? [
          new CustomElementPreparationOpenSeam(
            'element-dependencies-open',
            dependencyLocalState.entries.length > 0
              ? 'Custom-element definition.dependencies now spend the bounded direct-register constructable subset into controller-local keyed overlay state. Resource-key visibility, richer registry objects, and hidden/non-visible resource registrations still remain explicit later seams.'
              : 'Custom-element definition.dependencies are preserved on the support surface, but their direct-register consequence did not yet close under the current bounded subject-resolution pass.',
          ),
        ]
        : []),
      ...(resource.childrenSurface.declarations.length > 0
        ? [
          new CustomElementPreparationOpenSeam(
            'children-binding-open',
            'Children declarations are preserved on the CE support surface, but runtime hydrating would still need to install readonly getter/getObserver plumbing and ChildrenBinding instances. That observation spend is intentionally left to a later controller/runtime slice.',
          ),
        ]
        : []),
      ...(resource.slottedSurface.declarations.length > 0
        ? [
          new CustomElementPreparationOpenSeam(
            'slotted-watcher-open',
            'Slotted declarations are preserved on the CE support surface, but runtime hydrating would still need to install readonly getter/getObserver plumbing, register IAuSlotWatcher into the CE child container, and controller.addBinding(...) later. That watcher spend is intentionally left to a later projection/controller slice.',
          ),
        ]
        : []),
      new CustomElementPreparationOpenSeam(
        'projection-open',
        auSlotsInfo == null
          ? 'Projection ownership, slot publication, <au-slot> topology, and later child-controller linkage still belong to a later renderer preparation slice.'
          : 'Compile-time projection grouping closed the projected slot names for this host element and the invocation now carries AuSlotsInfo, but runtime slot publication, <au-slot> topology spend, and later child-controller linkage still belong to a later slice.',
      ),
      ...constructionOpenSeams.map((current) => new CustomElementPreparationOpenSeam(
        'construction-dependencies-open',
        current,
      )),
      ...constructionLookupOpenSeams.map((current) => new CustomElementPreparationOpenSeam(
        'construction-lookup-regime-open',
        current,
      )),
    ];

    return new CustomElementPreparation(
      hostElement,
      resource,
      controller,
      invocation,
      hydrationContext,
      hydrationPublication,
      hydrationPublicationState.entries,
      hydrationPublicationState.openSeams,
      [
        ...controllerLocalState.entries,
        ...dependencyLocalState.entries,
      ],
      [
        ...controllerLocalState.openSeams,
        ...dependencyLocalState.openSeams,
      ],
      auSlot,
      renderLocation,
      openSeams,
      'Generic CustomElementRenderer-like preparation over a compiled element receiver.',
    );
  }

  prepareCustomAttributes(): readonly never[] {
    return [];
  }

  prepareTemplateController(): null {
    return null;
  }

  private prepareAuSlot(
    parentController: Controller,
    hostElement: CompiledElementNode,
    instruction: PreparedHydrateElementInstruction,
    resource: CustomElementDefinition,
  ): AuSlotPreparation {
    const nameAttribute = hostElement.authored.attributes.find((current) => current.rawName === 'name');
    const slotName = nameAttribute?.rawValue.length
      ? nameAttribute.rawValue
      : 'default';
    const fallbackProjection = instruction.projections?.findSlot('default') ?? null;
    const parentProjection = readParentProjection(parentController, hostElement, slotName);
    const selectedProjection = parentProjection ?? fallbackProjection;
    const selection = new AuSlotContentSelection(
      parentProjection != null
        ? 'projected'
        : selectedProjection != null
          ? 'fallback'
          : 'empty',
      selectedProjection,
      fallbackProjection,
      parentProjection,
      parentProjection != null
        ? 'AuSlot selected projected content from the owning element hydration instruction.'
        : selectedProjection != null
          ? 'AuSlot selected fallback content from its own hydrate-element instruction.'
          : 'AuSlot closed to the runtime empty-template path because neither projected nor fallback content was available.',
    );
    const projectionOwnerWorld = parentProjection == null
      ? null
      : parentController.parent?.world ?? parentController.world;
    const worldFormation = this.childWorldBuilder.create(parentController.world, {
      suffix: `slot:${sanitizeName(slotName)}`,
      owner: resource.type,
      mode: parentProjection == null
        ? 'child-world-inherit-parent-resources'
        : 'child-world-use-projection-owner-resources',
      resourceSourceWorld: projectionOwnerWorld,
      note: parentProjection == null
        ? 'AuSlot fallback or empty content creates a child world that inherits parent resources, matching the runtime fallback branch.'
        : 'AuSlot projected content creates a child world from the owning element while sourcing resources from the projection declaration site, matching runtime container.useResources(...) intent.',
    });
    const definition = new CompilerAnonymousElementDefinition(
      `au-slot:${hostElement.authored.id}:${slotName}`,
      'marker-only-wrapper',
      null,
      null,
      selectedProjection?.targetNodes ?? [],
      [],
      selection.kind === 'empty'
        ? 'AuSlot selected the runtime empty-template path because no projected or fallback content was available.'
        : selection.kind === 'projected'
          ? 'AuSlot selected projected content prepared from the parent hydration instruction.'
          : 'AuSlot selected fallback content prepared from its own hydrate-element instruction.',
    );
    const viewFactory = new ViewFactory(
      `view-factory:au-slot:${resource.id}:${hostElement.authored.id}:${slotName}`,
      worldFormation.resultWorld,
      definition,
      worldFormation,
      selection.kind === 'projected'
        ? 'Prepared AuSlot view-factory over projected content, with projection-owner resource carry-over modeled on the world formation.'
        : 'Prepared AuSlot view-factory over fallback or empty content.',
    );
    const openSeams: AuSlotPreparationOpenSeam[] = [];
    if (parentProjection == null && parentController.controllerKind !== 'custom-element') {
      openSeams.push(new AuSlotPreparationOpenSeam(
        'parent-projection-source-open',
        'Projected-content lookup is only closed when an owning element controller with authored host context is available. Synthetic/projection-owned hydration-context shadowing still belongs to a later slice.',
      ));
    }

    openSeams.push(
      new AuSlotPreparationOpenSeam(
        'slot-watcher-runtime-open',
        'Runtime AuSlot starts/stops slot watchers and DOM mutation observation during attaching/detaching. That value-driven watcher lifecycle is intentionally left open in the clean-room model.',
      ),
      new AuSlotPreparationOpenSeam(
        'host-scope-bridge-open',
        'Runtime AuSlot bridges outer/inner scope and $host when projected content is realized. That scope bridge remains a later lifecycle/runtime slice.',
      ),
    );

    return new AuSlotPreparation(
      hostElement,
      slotName,
      selection,
      definition,
      viewFactory,
      worldFormation,
      openSeams,
      nameAttribute == null
        ? 'Builtin AuSlot preparation defaulted the slot name to `default`, matching runtime processContent when no literal name attribute is present.'
        : 'Builtin AuSlot preparation recovered the literal slot name directly from authored markup. Runtime receives the same value through processContent-written instruction.data.',
    );
  }
}

function readParentProjection(
  controller: Controller,
  currentHostElement: CompiledElementNode,
  slotName: string,
): CompilerProjectionSlot | null {
  let current: Controller | null = controller;
  while (current != null) {
    if (current instanceof ElementController
      && current.hostElement != null
      && current.hostElement.authored.id !== currentHostElement.authored.id) {
      return current.hostElement.structuralCarrier.projectionExtraction?.findSlot(slotName) ?? null;
    }
    current = current.parent;
  }
  return null;
}

function sanitizeName(
  name: string | null,
): string {
  return (name ?? 'anonymous').replaceAll(':', '_');
}

function readParentHydrationContext(
  controller: Controller | null,
): HydrationContext | null {
  if (controller == null) {
    return null;
  }

  if (controller instanceof ElementController) {
    return new HydrationContext(
      `hydration-context:ancestor:${controller.id}`,
      controller,
      null,
      readParentHydrationContext(controller.parent),
      'Ancestor hydration context reconstructed from the existing element-controller chain. Ancestor hydrate-element instructions are not threaded yet.',
    );
  }

  return readParentHydrationContext(controller.parent);
}

function readHydrationBoundarySource(
  hostElement: CompiledElementNode,
) {
  return hostElement.authored.provenance.ref?.source ?? null;
}

function readUnsatisfiedRequirements(
  requirements: readonly import('../compiler/hydration-construction.js').HydrationConstructionRequirement[],
  contracts: readonly HydrationPublicationContract[],
): readonly string[] {
  const notes: string[] = [];
  for (const requirement of requirements) {
    const publication = contracts
      .map((current) => requirement.key == null
        ? current.find(requirement.token)
        : current.findByKey(requirement.key))
      .find((current) => current != null) ?? null;

    if (publication == null) {
      notes.push(`Resource constructor/field dependency ${requirement.token} is not published by the current CE preparation boundary.`);
      continue;
    }

    if (publication.availability === 'throwing') {
      notes.push(`Resource constructor/field dependency ${requirement.token} would hit a throwing provider under the current CE preparation boundary.`);
    }
  }
  return notes;
}

function readLookupRequirementSeams(
  requirements: readonly import('../compiler/hydration-construction.js').HydrationLookupRequirement[],
): readonly string[] {
  return requirements.map((current) =>
    current.key == null
      ? 'Resource constructor/field dependency uses fromHydrationContext(...), but the inner lookup key did not close under the current DI reader.'
      : `Resource constructor/field dependency ${current.key.debugName ?? current.key.id} uses fromHydrationContext(...), so later lookup-time routing still needs to resolve own(key) against the nearest hydration-context controller container.`,
  );
}
