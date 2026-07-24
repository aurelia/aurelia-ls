import { SemanticClaim, nullableClaim } from '../kernel/claim.js';
import type {
  ClaimHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  AureliaResourceIdentity,
  AureliaResourceDeclarationKind,
  ConfigurationIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import {
  ViewFactory,
} from '../configuration/controller.js';
import type { Container } from '../di/container.js';
import {
  CustomElementDefinition,
  CustomElementCaptureDefinition,
  CustomElementCaptureKind,
  CustomElementTemplateDefinition,
  CustomElementTemplateKind,
} from '../resources/custom-element-definition.js';
import {
  runtimeResourceKeyForKind,
  ResourceDefinitionKind,
} from '../resources/resource-kind.js';
import {
  InstructionReference,
  ResourceTargetReference,
} from '../resources/resource-reference.js';
import {
  RuntimeRendererAllocation,
} from './runtime-renderer.js';
import {
  RuntimeControllerFrame,
  RuntimeControllerAssemblyStage,
  RuntimeControllerAssemblyStepKind,
} from './runtime-controller.js';
import type {
  TemplateInstructionSequence,
} from './instruction-ir.js';
import { TemplateProductDetails } from './product-details.js';
import type {
  RuntimeRenderingSourceSet,
} from './runtime-rendering-source.js';

export class RuntimeViewFactoryMaterialization {
  constructor(
    readonly ownerController: RuntimeControllerFrame,
    readonly container: Container,
    readonly viewFactory: ViewFactory,
    readonly definition: CustomElementDefinition,
    readonly instructionSequenceProductHandle: ProductHandle,
    readonly claims: readonly SemanticClaim[],
  ) {}
}

class RuntimeEmbeddedViewDefinitionPublication {
  constructor(
    readonly allocation: RuntimeRendererAllocation,
    readonly definition: CustomElementDefinition,
  ) {}
}

class RuntimeEmbeddedViewDefinitionShape {
  constructor(
    readonly target: ResourceTargetReference,
    readonly key: string,
    readonly capture: CustomElementCaptureDefinition,
    readonly template: CustomElementTemplateDefinition,
    readonly instructions: readonly InstructionReference[],
  ) {}
}

/** Materializes runtime IViewFactory values and their generated embedded custom-element definitions. */
export class RuntimeViewFactoryMaterializer {
  constructor(
    readonly store: KernelStore,
    private readonly publication: KernelPublicationContext,
  ) {}

  ensureForController(
    local: string,
    definitionLocal: string,
    controller: RuntimeControllerFrame,
    factoryContainer: Container,
    instructionSequenceProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    viewFactories: ViewFactory[],
    embeddedDefinitions: CustomElementDefinition[],
    viewFactoryByController: Map<ProductHandle, RuntimeViewFactoryMaterialization>,
    embeddedDefinitionByInstructionSequence: Map<ProductHandle, CustomElementDefinition>,
  ): RuntimeViewFactoryMaterialization {
    const existing = viewFactoryByController.get(controller.productHandle) ?? null;
    if (existing != null) {
      if (existing.instructionSequenceProductHandle !== instructionSequenceProductHandle) {
        throw new Error(
          `Runtime controller '${controller.productHandle}' cannot own view factories for both `
          + `'${existing.instructionSequenceProductHandle}' and '${instructionSequenceProductHandle}'.`,
        );
      }
      return existing;
    }
    const viewFactory = this.recordViewFactory(
      local,
      definitionLocal,
      controller,
      factoryContainer,
      instructionSequenceProductHandle,
      source,
      records,
      viewFactories,
      embeddedDefinitions,
      embeddedDefinitionByInstructionSequence,
    );
    viewFactoryByController.set(controller.productHandle, viewFactory);
    return viewFactory;
  }

  private recordViewFactory(
    local: string,
    definitionLocal: string,
    controller: RuntimeControllerFrame,
    factoryContainer: Container,
    instructionSequenceProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    viewFactories: ViewFactory[],
    embeddedDefinitions: CustomElementDefinition[],
    embeddedDefinitionByInstructionSequence: Map<ProductHandle, CustomElementDefinition>,
  ): RuntimeViewFactoryMaterialization {
    const definition = this.ensureEmbeddedViewDefinition(
      definitionLocal,
      controller,
      instructionSequenceProductHandle,
      source,
      records,
      embeddedDefinitions,
      embeddedDefinitionByInstructionSequence,
    );
    const viewFactory = this.createViewFactory(
      local,
      controller,
      factoryContainer,
      definition,
      instructionSequenceProductHandle,
    );
    this.recordViewFactoryLifecycle(controller, viewFactory);
    const claims = this.claimsForViewFactory(local, controller, viewFactory, definition, instructionSequenceProductHandle, source);
    viewFactories.push(viewFactory);
    records.push(
      ...this.recordsForViewFactoryProduct(local, controller, viewFactory, source, claims),
    );
    return new RuntimeViewFactoryMaterialization(
      controller,
      factoryContainer,
      viewFactory,
      definition,
      instructionSequenceProductHandle,
      claims,
    );
  }

  private createViewFactory(
    local: string,
    controller: RuntimeControllerFrame,
    factoryContainer: Container,
    definition: CustomElementDefinition,
    instructionSequenceProductHandle: ProductHandle,
  ): ViewFactory {
    const allocation = this.allocate(local);
    return new ViewFactory(
      allocation.productHandle,
      allocation.identityHandle,
      definition.name,
      factoryContainer.toReference(),
      definition.productHandle,
      controller.instructionProductHandle,
      instructionSequenceProductHandle,
      controller.toReference(),
      controller.sourceAddressHandle,
    );
  }

  private recordViewFactoryLifecycle(
    controller: RuntimeControllerFrame,
    viewFactory: ViewFactory,
  ): void {
    controller.recordAssemblyStep(
      RuntimeControllerAssemblyStage.Hydration,
      RuntimeControllerAssemblyStepKind.CreateViewFactory,
      viewFactory.productHandle,
      viewFactory.sourceAddressHandle,
      'Rendering.getViewFactory materialized the controller-owned view factory.',
    );
  }

  private claimsForViewFactory(
    local: string,
    controller: RuntimeControllerFrame,
    viewFactory: ViewFactory,
    definition: CustomElementDefinition,
    instructionSequenceProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): readonly SemanticClaim[] {
    return [
      this.controllerUsesViewFactoryClaim(local, controller, viewFactory, source),
      this.viewFactoryUsesDefinitionClaim(local, viewFactory, definition, source),
      this.viewFactoryUsesInstructionSequenceClaim(local, viewFactory, instructionSequenceProductHandle, source),
      ...nullableClaim(this.instructionCreatesViewFactoryClaim(local, controller, viewFactory, source)),
    ];
  }

  private controllerUsesViewFactoryClaim(
    local: string,
    controller: RuntimeControllerFrame,
    viewFactory: ViewFactory,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:controller-uses-view-factory`),
      controller.productHandle,
      KernelVocabulary.Configuration.ControllerUsesViewFactory.key,
      viewFactory.productHandle,
      source.provenanceHandle,
    );
  }

  private viewFactoryUsesDefinitionClaim(
    local: string,
    viewFactory: ViewFactory,
    definition: CustomElementDefinition,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:uses-definition`),
      viewFactory.productHandle,
      KernelVocabulary.Configuration.ViewFactoryUsesDefinition.key,
      definition.productHandle!,
      source.provenanceHandle,
    );
  }

  private viewFactoryUsesInstructionSequenceClaim(
    local: string,
    viewFactory: ViewFactory,
    instructionSequenceProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:uses-instruction-sequence`),
      viewFactory.productHandle,
      KernelVocabulary.Configuration.ViewFactoryUsesInstructionSequence.key,
      instructionSequenceProductHandle,
      source.provenanceHandle,
    );
  }

  private instructionCreatesViewFactoryClaim(
    local: string,
    controller: RuntimeControllerFrame,
    viewFactory: ViewFactory,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim | null {
    return controller.instructionProductHandle == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`${local}:instruction-creates-view-factory`),
        controller.instructionProductHandle,
        KernelVocabulary.Configuration.InstructionCreatesViewFactory.key,
        viewFactory.productHandle,
        source.provenanceHandle,
      );
  }

  private recordsForViewFactoryProduct(
    local: string,
    controller: RuntimeControllerFrame,
    viewFactory: ViewFactory,
    source: RuntimeRenderingSourceSet,
    claims: readonly SemanticClaim[],
  ): readonly KernelStoreRecord[] {
    return [
      new ConfigurationIdentity(
        viewFactory.identityHandle,
        KernelVocabulary.Configuration.ViewFactory.key,
        controller.identityHandle,
        viewFactory.sourceAddressHandle,
        viewFactory.name,
      ),
      new MaterializedProduct(
        viewFactory.productHandle,
        KernelVocabulary.Configuration.ViewFactory.key,
        viewFactory.identityHandle,
        viewFactory.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:view-factory`),
        viewFactory.identityHandle,
        [viewFactory.productHandle],
        claims.map((claim) => claim.handle),
      ),
    ];
  }

  private ensureEmbeddedViewDefinition(
    local: string,
    controller: RuntimeControllerFrame,
    instructionSequenceProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    embeddedDefinitions: CustomElementDefinition[],
    embeddedDefinitionByInstructionSequence: Map<ProductHandle, CustomElementDefinition>,
  ): CustomElementDefinition {
    const existing = embeddedDefinitionByInstructionSequence.get(instructionSequenceProductHandle) ?? null;
    if (existing != null) {
      return existing;
    }
    const publication = this.publishEmbeddedViewDefinition(local, controller, instructionSequenceProductHandle);
    embeddedDefinitionByInstructionSequence.set(instructionSequenceProductHandle, publication.definition);
    embeddedDefinitions.push(publication.definition);
    records.push(
      ...this.recordsForEmbeddedViewDefinitionProduct(local, publication, controller, source),
    );
    return publication.definition;
  }

  private publishEmbeddedViewDefinition(
    local: string,
    controller: RuntimeControllerFrame,
    instructionSequenceProductHandle: ProductHandle,
  ): RuntimeEmbeddedViewDefinitionPublication {
    const allocation = this.allocate(local);
    const sequence = this.publication.readProductDetail(
      TemplateProductDetails.InstructionSequence,
      instructionSequenceProductHandle,
    );
    const name = generatedEmbeddedViewName(instructionSequenceProductHandle);
    return new RuntimeEmbeddedViewDefinitionPublication(
      allocation,
      this.createEmbeddedViewDefinition(allocation, name, controller, sequence),
    );
  }

  private createEmbeddedViewDefinition(
    allocation: RuntimeRendererAllocation,
    name: string,
    controller: RuntimeControllerFrame,
    sequence: TemplateInstructionSequence | null,
  ): CustomElementDefinition {
    const shape = this.embeddedViewDefinitionShape(name, controller, sequence);
    return new CustomElementDefinition(
      allocation.productHandle,
      allocation.identityHandle,
      shape.template.addressHandle,
      shape.target,
      name,
      [],
      shape.key,
      shape.capture,
      shape.template,
      shape.instructions,
      [],
      null,
      false,
      [],
      [],
      false,
      null,
      false,
      false,
      [],
      null,
      null,
      [],
    );
  }

  private embeddedViewDefinitionShape(
    name: string,
    controller: RuntimeControllerFrame,
    sequence: TemplateInstructionSequence | null,
  ): RuntimeEmbeddedViewDefinitionShape {
    const sourceAddressHandle = sequence?.sourceAddressHandle ?? controller.sourceAddressHandle;
    return new RuntimeEmbeddedViewDefinitionShape(
      new ResourceTargetReference(null, sourceAddressHandle, name, null),
      runtimeResourceKeyForKind(ResourceDefinitionKind.CustomElement, name)!,
      new CustomElementCaptureDefinition(CustomElementCaptureKind.None),
      new CustomElementTemplateDefinition(
        CustomElementTemplateKind.DomNode,
        null,
        sourceAddressHandle,
        null,
      ),
      instructionReferencesForEmbeddedView(sequence),
    );
  }

  private recordsForEmbeddedViewDefinitionProduct(
    local: string,
    publication: RuntimeEmbeddedViewDefinitionPublication,
    controller: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
  ): readonly KernelStoreRecord[] {
    const sourceAddressHandle = publication.definition.template?.addressHandle
      ?? controller.sourceAddressHandle;
    return [
      new AureliaResourceIdentity(
        publication.allocation.identityHandle,
        AureliaResourceDeclarationKind.CustomElement,
        publication.definition.name,
        null,
      ),
      new MaterializedProduct(
        publication.allocation.productHandle,
        KernelVocabulary.Resource.Definition.key,
        publication.allocation.identityHandle,
        sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:embedded-view-definition`),
        publication.allocation.identityHandle,
        [publication.allocation.productHandle],
      ),
    ];
  }

  private allocate(local: string): RuntimeRendererAllocation {
    return new RuntimeRendererAllocation(
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }
}

function instructionReferencesForEmbeddedView(
  sequence: TemplateInstructionSequence | null,
): readonly InstructionReference[] {
  return sequence?.instructions.flatMap((instruction) =>
    instruction.productHandle == null ? [] : [new InstructionReference(instruction.productHandle)]
  ) ?? [];
}

function generatedEmbeddedViewName(
  instructionSequenceProductHandle: ProductHandle,
): string {
  return `anonymous-${stableShortHash(instructionSequenceProductHandle)}`;
}

function stableShortHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
