import type { TemplateControllerDefinition } from '../resources/index.js';
import {
  AttributeInvocationContext,
  AttributeInvocationContextOpenSeam,
} from './attribute-invocation-context.js';
import { AuSlotsInfo } from './au-slots-info.js';
import { AttributeController, Controller, RenderLocation } from './controller.js';
import type { CompiledElementNode } from './compiled-template.js';
import { CompilerChildWorldBuilder } from './child-world-formation.js';
import { LookupScopeAssemblyBuilder } from './lookup-scope-assembly.js';
import {
  TemplateControllerProfileResolver,
} from './template-controller-profile.js';
import type { TemplateControllerProfile } from './template-controller-profile.js';
import {
  HydrationConstructionContract,
  HydrationConstructionContractMaterializer,
} from './hydration-construction.js';
import { ControllerLocalStateMaterializer } from './controller-local-state.js';
import {
  HydrationPublication,
  HydrationPublicationContract,
  HydrationPublicationStateMaterializer,
} from './hydration-publication.js';
import { PreparedHydrateTemplateControllerInstruction } from './prepared-resource-hydration.js';
import type { InstructionRenderer } from '../rendering/instruction-renderer.js';
import type { InstructionRendererAdmissionProvenance } from '../rendering/renderer-admission.js';
import { ViewFactory } from './view-factory.js';

export const TEMPLATE_CONTROLLER_PREPARATION_OPEN_SEAM_KINDS = [
  'attribute-dependencies-open',
  'view-realization-deferred',
  'linked-branch-profile-open',
  'construction-dependencies-open',
  'construction-lookup-regime-open',
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
    readonly controllerLocalContainerState: readonly import('../registrations/index.js').ContainerStateEntry[] = [],
    readonly controllerLocalContainerStateOpenSeams: readonly import('../registrations/index.js').ContainerStateOpenSeam[] = [],
    readonly constructionRequirements: HydrationConstructionContract,
    readonly openSeams: readonly TemplateControllerPreparationOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}

export class TemplateControllerRenderer implements InstructionRenderer {
  private readonly childWorldBuilder = new CompilerChildWorldBuilder();
  private readonly profileResolver = new TemplateControllerProfileResolver();
  private readonly constructionContractMaterializer = new HydrationConstructionContractMaterializer();
  private readonly publicationStateMaterializer = new HydrationPublicationStateMaterializer();
  private readonly controllerLocalStateMaterializer = new ControllerLocalStateMaterializer();
  private readonly lookupScopeBuilder = new LookupScopeAssemblyBuilder();
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
    return this.prepareTemplateControllerFromInstruction(
      parentController,
      new PreparedHydrateTemplateControllerInstruction(
        hostElement,
        lowering.outermostInstruction,
        'Prepared hydrate-template-controller instruction derived from template-controller structural lowering.',
      ),
    );
  }

  prepareTemplateControllerFromInstruction(
    parentController: Controller,
    instruction: PreparedHydrateTemplateControllerInstruction,
  ): TemplateControllerPreparation | null {
    const hostElement = instruction.hostElement;
    const loweredInstruction = instruction.loweredInstruction;

    // NOTE: runtime spends only the outermost TC instruction at the current
    // element. Inner TCs live inside the nested anonymous definition and only
    // become current later when a built-in family actually prepares or realizes
    // synthetic views through the prepared view-factory.
    const renderLocation = new RenderLocation(
      `render-location:${hostElement.authored.id}:${loweredInstruction.resource.id}`,
      hostElement,
      'Template-controller render anchor carried separately from the CA controller, matching runtime’s render-location split.',
    );
    const boundarySource = hostElement.authored.provenance.ref?.source ?? null;
    const controllerWorldFormation = this.childWorldBuilder.create(parentController.world, {
      suffix: `attr:${sanitizeName(loweredInstruction.resource.name)}`,
      owner: loweredInstruction.resource.type,
      mode: 'child-world',
      includeDependencyOpenSeam: true,
      note: 'invokeAttribute-like child world for the template-controller custom-attribute controller.',
    });
    const viewWorldFormation = this.childWorldBuilder.create(parentController.world, {
      suffix: `view:${sanitizeName(loweredInstruction.resource.name)}`,
      owner: loweredInstruction.resource.type,
      mode: loweredInstruction.resource.containerStrategy === 'new'
        ? 'child-world-inherit-parent-resources'
        : 'reuse-parent-world',
      note: loweredInstruction.resource.containerStrategy === 'new'
        ? 'View-factory world mirrors runtime containerStrategy=new by requesting a fresh child world that inherits parent resources.'
        : 'View-factory world mirrors runtime containerStrategy=reuse by reusing the parent consulted world.',
    });
    const viewFactory = new ViewFactory(
      `view-factory:${loweredInstruction.resource.id}:${viewWorldFormation.resultWorld.world.id}`,
      viewWorldFormation.resultWorld,
      loweredInstruction.definition,
      viewWorldFormation,
      'Prepared TC view-factory shell over the nested anonymous definition produced during compile-time structural lowering. The factory is available to later runtime-like behavior, but ordinary compiler preparation does not create synthetic views yet.',
    );
    const publishedAuSlotsInfo = new AuSlotsInfo(
      [],
      'Runtime invokeAttribute(...) publishes an empty/default AuSlotsInfo for template controllers.',
    );
    const publicationContract = new HydrationPublicationContract(
      'invoke-attribute',
      [
        new HydrationPublication(
          'IController',
          'value',
          parentController,
          'invokeAttribute(...) publishes the current rendering controller into the TC child container.',
          boundarySource,
        ),
        new HydrationPublication(
          'IInstruction',
          'value',
          instruction,
          'invokeAttribute(...) publishes the hydrate-template-controller instruction into the TC child container.',
          boundarySource,
        ),
        new HydrationPublication(
          'IRenderLocation',
          'value',
          renderLocation,
          'invokeAttribute(...) publishes the template-controller render location into the TC child container.',
          boundarySource,
        ),
        new HydrationPublication(
          'IViewFactory',
          'value',
          viewFactory,
          'invokeAttribute(...) publishes the prepared template-controller view factory into the TC child container.',
          boundarySource,
        ),
        new HydrationPublication(
          'IAuSlotsInfo',
          'empty-default',
          publishedAuSlotsInfo,
          'Runtime invokeAttribute(...) publishes an empty/default slot-info provider when no explicit slot info is supplied.',
          boundarySource,
        ),
      ],
      'Runtime-shaped publication contract over invokeAttribute(...) for a template controller.',
    );
    const publicationState = this.publicationStateMaterializer.materialize(
      loweredInstruction.resource.type,
      controllerWorldFormation.resultWorld.world,
      boundarySource,
      publicationContract,
    );
    const invocation = new AttributeInvocationContext(
      loweredInstruction.resource,
      parentController,
      controllerWorldFormation.resultWorld,
      controllerWorldFormation,
      instruction,
      renderLocation,
      viewFactory,
      publicationContract,
      publicationState.entries,
      publicationState.openSeams,
      [
        new AttributeInvocationContextOpenSeam(
          'published-di-surface-open',
          'invokeAttribute(...) publication now closes as both a runtime-shaped publication contract and a keyed child-container overlay. Later lookup-time behavior is now surfaced separately as construction lookup requirements, but the actual container-lookup evaluator still belongs to a later slice.',
        ),
        new AttributeInvocationContextOpenSeam(
          'attribute-dependencies-open',
          'definition.dependencies now spend the bounded direct-register constructable subset into controller-local keyed overlay state. Resource-key visibility and richer registry-object consequence still remain open at the child-world layer.',
        ),
      ],
      'Tooling-time invokeAttribute-like context over the TC controller child world.',
    );
    // TODO: child-container publication now closes as keyed overlay state. The
    // remaining later slice is lookup-time behavior layered above that state,
    // such as fromHydrationContext(key) => hydrationContext.controller.container.get(own(key)).
    const controller = Controller.$attr(
      controllerWorldFormation.resultWorld,
      loweredInstruction.resource,
      parentController,
      viewFactory,
      renderLocation,
      controllerWorldFormation,
    );
    const controllerLocalState = this.controllerLocalStateMaterializer.materializeDefinitionTypeInstance(
      loweredInstruction.resource.type,
      controllerWorldFormation.resultWorld.world,
      boundarySource,
      'template-controller controller',
    );
    const dependencyLocalState = this.controllerLocalStateMaterializer.materializeDefinitionDependencies(
      loweredInstruction.resource.dependencies,
      controllerWorldFormation.resultWorld.resources,
      controllerWorldFormation.resultWorld.world,
      boundarySource,
      'template-controller controller',
    );
    const lookupScope = this.lookupScopeBuilder.attachControllerScope(
      controller,
      [
        ...publicationState.entries,
        ...controllerLocalState.entries,
        ...dependencyLocalState.entries,
      ],
      {
        note: 'Lookup scope over the template-controller child container overlay rooted at invokeAttribute(...), plus controller-owned definition.Type state and bounded definition.dependencies consequence.',
      },
    );
    invocation.lookupScope = lookupScope;
    const profile = this.profileResolver.resolve(loweredInstruction.resource);
    const constructionRequirements = this.constructionContractMaterializer.materialize(loweredInstruction.resource.type);
    const constructionLookupOpenSeams = readLookupRequirementSeams(
      constructionRequirements.lookupRequirements,
    );
    const openSeams: TemplateControllerPreparationOpenSeam[] = [
      ...(loweredInstruction.resource.dependencies.entries.length > 0 || dependencyLocalState.openSeams.length > 0
        ? [
          new TemplateControllerPreparationOpenSeam(
            'attribute-dependencies-open',
            dependencyLocalState.entries.length > 0
              ? 'Template-controller definition.dependencies now spend the bounded direct-register constructable subset into controller-local keyed overlay state. Resource-key visibility, richer registry objects, and hidden/non-visible registrations still remain explicit later seams.'
              : 'Template-controller definition.dependencies are preserved on the support surface, but their direct-register consequence did not yet close under the current bounded subject-resolution pass.',
          ),
        ]
        : []),
      new TemplateControllerPreparationOpenSeam(
        'view-realization-deferred',
        'Generic TC preparation stops before synthetic-view creation. Builtin profiles and later runtime-like value surfaces decide when a prepared view factory actually realizes one or more synthetic views.',
      ),
      ...readUnsatisfiedRequirements(constructionRequirements.requirements, publicationContract).map((current) =>
        new TemplateControllerPreparationOpenSeam(
          'construction-dependencies-open',
          current,
        )),
      ...constructionLookupOpenSeams.map((current) =>
        new TemplateControllerPreparationOpenSeam(
          'construction-lookup-regime-open',
          current,
        )),
    ];

    if (profile.profileKind === 'custom') {
      openSeams.push(new TemplateControllerPreparationOpenSeam(
        'linked-branch-profile-open',
        'No builtin product profile matched this template controller. Generic preparation is still valid, but later branch/link/view semantics remain open until a custom profile overlay is attached.',
      ));
    }

    return new TemplateControllerPreparation(
      hostElement,
      loweredInstruction.resource,
      profile,
      controller,
      renderLocation,
      invocation,
      viewFactory,
      [
        ...controllerLocalState.entries,
        ...dependencyLocalState.entries,
      ],
      [
        ...controllerLocalState.openSeams,
        ...dependencyLocalState.openSeams,
      ],
      constructionRequirements,
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

function readUnsatisfiedRequirements(
  requirements: readonly import('./hydration-construction.js').HydrationConstructionRequirement[],
  contract: HydrationPublicationContract,
): readonly string[] {
  const notes: string[] = [];
  for (const requirement of requirements) {
    const publication = requirement.key == null
      ? contract.find(requirement.token)
      : contract.findByKey(requirement.key);
    if (publication == null) {
      notes.push(`Resource constructor/field dependency ${requirement.token} is not published by the current template-controller preparation boundary.`);
      continue;
    }

    if (publication.availability === 'throwing') {
      notes.push(`Resource constructor/field dependency ${requirement.token} would hit a throwing provider under the current template-controller preparation boundary.`);
    }
  }
  return notes;
}

function readLookupRequirementSeams(
  requirements: readonly import('./hydration-construction.js').HydrationLookupRequirement[],
): readonly string[] {
  return requirements.map((current) =>
    current.key == null
      ? 'Resource constructor/field dependency uses fromHydrationContext(...), but the inner lookup key did not close under the current DI reader.'
      : `Resource constructor/field dependency ${current.key.debugName ?? current.key.id} uses fromHydrationContext(...), so later lookup-time routing still needs to resolve own(key) against the nearest hydration-context controller container.`,
  );
}
