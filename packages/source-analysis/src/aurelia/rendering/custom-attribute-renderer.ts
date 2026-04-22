import type { CustomAttributeDefinition } from '../resources/index.js';
import { AuSlotsInfo } from '../compiler/au-slots-info.js';
import {
  AttributeInvocationContext,
  AttributeInvocationContextOpenSeam,
} from '../compiler/attribute-invocation-context.js';
import {
  HydrationConstructionContract,
  HydrationConstructionContractMaterializer,
} from '../compiler/hydration-construction.js';
import {
  HydrationPublication,
  HydrationPublicationContract,
  HydrationPublicationStateMaterializer,
} from '../compiler/hydration-publication.js';
import { AttributeController, Controller } from '../compiler/controller.js';
import { ControllerLocalStateMaterializer } from '../compiler/controller-local-state.js';
import type { CompiledElementNode } from '../compiler/compiled-template.js';
import { CompilerChildWorldBuilder } from '../compiler/child-world-formation.js';
import type { CompilerAttributeBindingLowering } from '../compiler/custom-attribute-binding-lowering.js';
import { LookupScopeAssemblyBuilder } from '../compiler/lookup-scope-assembly.js';
import { PreparedHydrateAttributeInstruction } from '../compiler/prepared-resource-hydration.js';
import type { InstructionRenderer } from './instruction-renderer.js';
import type { InstructionRendererAdmissionProvenance } from './renderer-admission.js';

export const CUSTOM_ATTRIBUTE_PREPARATION_OPEN_SEAM_KINDS = [
  'attribute-dependencies-open',
  'prop-render-open',
  'construction-dependencies-open',
  'construction-lookup-regime-open',
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
    readonly controllerLocalContainerState: readonly import('../registrations/index.js').ContainerStateEntry[] = [],
    readonly controllerLocalContainerStateOpenSeams: readonly import('../registrations/index.js').ContainerStateOpenSeam[] = [],
    readonly constructionRequirements: HydrationConstructionContract,
    readonly openSeams: readonly CustomAttributePreparationOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}

export class CustomAttributeRenderer implements InstructionRenderer {
  private readonly childWorldBuilder = new CompilerChildWorldBuilder();
  private readonly constructionContractMaterializer = new HydrationConstructionContractMaterializer();
  private readonly publicationStateMaterializer = new HydrationPublicationStateMaterializer();
  private readonly controllerLocalStateMaterializer = new ControllerLocalStateMaterializer();
  private readonly lookupScopeBuilder = new LookupScopeAssemblyBuilder();
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
    const publishedAuSlotsInfo = new AuSlotsInfo(
      [],
      'Runtime invokeAttribute(...) publishes an empty/default AuSlotsInfo for plain custom attributes.',
    );
    const boundarySource = hostElement.authored.provenance.ref?.source ?? null;
    const worldFormation = this.childWorldBuilder.create(parentController.world, {
      suffix: `attr:${sanitizeName(resource.name)}:${index}`,
      owner: resource.type,
      mode: 'child-world',
      includeDependencyOpenSeam: true,
      note: 'invokeAttribute-like child world for a custom-attribute controller.',
    });
    const publicationContract = new HydrationPublicationContract(
      'invoke-attribute',
      [
        new HydrationPublication(
          'IController',
          'value',
          parentController,
          'invokeAttribute(...) publishes the current rendering controller into the CA child container.',
          boundarySource,
        ),
        new HydrationPublication(
          'IInstruction',
          'value',
          instruction,
          'invokeAttribute(...) publishes the hydrate-attribute instruction into the CA child container.',
          boundarySource,
        ),
        new HydrationPublication(
          'IRenderLocation',
          'nullable',
          null,
          'Runtime invokeAttribute(...) still publishes IRenderLocation for plain custom attributes, but resolves it to null.',
          boundarySource,
        ),
        new HydrationPublication(
          'IViewFactory',
          'throwing',
          null,
          'Runtime invokeAttribute(...) publishes IViewFactory for plain custom attributes through a provider that throws when resolved.',
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
      'Runtime-shaped publication contract over invokeAttribute(...) for a plain custom attribute.',
    );
    const publicationState = this.publicationStateMaterializer.materialize(
      resource.type,
      worldFormation.resultWorld.world,
      boundarySource,
      publicationContract,
    );
    const invocation = new AttributeInvocationContext(
      resource,
      parentController,
      worldFormation.resultWorld,
      worldFormation,
      instruction,
      null,
      null,
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
      'Tooling-time invokeAttribute-like context over the CA controller child world.',
    );
    // TODO: child-container publication now closes as keyed overlay state. The
    // remaining later slice is lookup-time behavior layered above that state,
    // such as fromHydrationContext(key) => hydrationContext.controller.container.get(own(key)).
    const controller = Controller.$attr(
      worldFormation.resultWorld,
      resource,
      parentController,
      null,
      null,
      worldFormation,
    );
    const controllerLocalState = this.controllerLocalStateMaterializer.materializeDefinitionTypeInstance(
      resource.type,
      worldFormation.resultWorld.world,
      boundarySource,
      'custom-attribute controller',
    );
    const dependencyLocalState = this.controllerLocalStateMaterializer.materializeDefinitionDependencies(
      resource.dependencies,
      worldFormation.resultWorld.resources,
      worldFormation.resultWorld.world,
      boundarySource,
      'custom-attribute controller',
    );
    const lookupScope = this.lookupScopeBuilder.attachControllerScope(
      controller,
      [
        ...publicationState.entries,
        ...controllerLocalState.entries,
        ...dependencyLocalState.entries,
      ],
      {
        note: 'Lookup scope over the custom-attribute child container overlay rooted at invokeAttribute(...), plus controller-owned definition.Type state and bounded definition.dependencies consequence.',
      },
    );
    invocation.lookupScope = lookupScope;
    const constructionRequirements = this.constructionContractMaterializer.materialize(resource.type);
    const constructionOpenSeams = readUnsatisfiedRequirements(
      constructionRequirements.requirements,
      publicationContract,
    );
    const constructionLookupOpenSeams = readLookupRequirementSeams(
      constructionRequirements.lookupRequirements,
    );

    return new CustomAttributePreparation(
      hostElement,
      resource,
      controller,
      invocation,
      lowering,
      [
        ...controllerLocalState.entries,
        ...dependencyLocalState.entries,
      ],
      [
        ...controllerLocalState.openSeams,
        ...dependencyLocalState.openSeams,
      ],
      constructionRequirements,
      [
        ...(resource.dependencies.entries.length > 0 || dependencyLocalState.openSeams.length > 0
          ? [
            new CustomAttributePreparationOpenSeam(
              'attribute-dependencies-open',
              dependencyLocalState.entries.length > 0
                ? 'Custom-attribute definition.dependencies now spend the bounded direct-register constructable subset into controller-local keyed overlay state. Resource-key visibility, richer registry objects, and hidden/non-visible registrations still remain explicit later seams.'
                : 'Custom-attribute definition.dependencies are preserved on the support surface, but their direct-register consequence did not yet close under the current bounded subject-resolution pass.',
            ),
          ]
          : []),
        new CustomAttributePreparationOpenSeam(
          'prop-render-open',
          'Renderer-driven property/binding consumption over the CA controller still belongs to a later layer; this slice stops at controller/invocation preparation.',
        ),
        ...constructionOpenSeams.map((current) => new CustomAttributePreparationOpenSeam(
          'construction-dependencies-open',
          current,
        )),
        ...constructionLookupOpenSeams.map((current) => new CustomAttributePreparationOpenSeam(
          'construction-lookup-regime-open',
          current,
        )),
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

function readUnsatisfiedRequirements(
  requirements: readonly import('../compiler/hydration-construction.js').HydrationConstructionRequirement[],
  contract: HydrationPublicationContract,
): readonly string[] {
  const notes: string[] = [];
  for (const requirement of requirements) {
    const publication = requirement.key == null
      ? contract.find(requirement.token)
      : contract.findByKey(requirement.key);
    if (publication == null) {
      notes.push(`Resource constructor/field dependency ${requirement.token} is not published by the current custom-attribute preparation boundary.`);
      continue;
    }

    if (publication.availability === 'throwing') {
      notes.push(`Resource constructor/field dependency ${requirement.token} would hit a throwing provider under the current custom-attribute preparation boundary.`);
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
