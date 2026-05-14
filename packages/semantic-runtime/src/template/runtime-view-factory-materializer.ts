import { SemanticClaim, nullableClaim } from '../kernel/claim.js';
import type {
  ClaimHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  AureliaResourceIdentity,
  AureliaResourceIdentityKind,
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
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import {
  ViewFactory,
} from '../configuration/controller.js';
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
  RuntimeControllerLifecycleStage,
  RuntimeControllerLifecycleStepKind,
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
    readonly templateController: RuntimeControllerFrame,
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
  ) {}

  ensureForTemplateController(
    local: string,
    controller: RuntimeControllerFrame,
    instructionSequenceProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    viewFactories: ViewFactory[],
    embeddedDefinitions: CustomElementDefinition[],
    viewFactoryByController: Map<ProductHandle, RuntimeViewFactoryMaterialization>,
  ): RuntimeViewFactoryMaterialization {
    const existing = viewFactoryByController.get(controller.productHandle) ?? null;
    if (existing != null) {
      return existing;
    }
    const viewFactory = this.recordViewFactory(
      local,
      controller,
      instructionSequenceProductHandle,
      source,
      records,
      viewFactories,
      embeddedDefinitions,
    );
    viewFactoryByController.set(controller.productHandle, viewFactory);
    return viewFactory;
  }

  private recordViewFactory(
    local: string,
    controller: RuntimeControllerFrame,
    instructionSequenceProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    viewFactories: ViewFactory[],
    embeddedDefinitions: CustomElementDefinition[],
  ): RuntimeViewFactoryMaterialization {
    const definition = this.recordEmbeddedViewDefinition(
      `${local}:definition`,
      controller,
      instructionSequenceProductHandle,
      source,
      records,
      embeddedDefinitions,
    );
    const viewFactory = this.createViewFactory(local, controller, definition, instructionSequenceProductHandle);
    this.recordViewFactoryLifecycle(controller, viewFactory);
    const claims = this.claimsForViewFactory(local, controller, viewFactory, definition, instructionSequenceProductHandle, source);
    viewFactories.push(viewFactory);
    records.push(
      ...this.recordsForViewFactoryProduct(local, controller, viewFactory, source, claims),
    );
    return new RuntimeViewFactoryMaterialization(
      controller,
      viewFactory,
      definition,
      instructionSequenceProductHandle,
      claims,
    );
  }

  private createViewFactory(
    local: string,
    controller: RuntimeControllerFrame,
    definition: CustomElementDefinition,
    instructionSequenceProductHandle: ProductHandle,
  ): ViewFactory {
    const allocation = this.allocate(local);
    return new ViewFactory(
      allocation.productHandle,
      allocation.identityHandle,
      definition.name,
      controller.container,
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
    controller.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Hydration,
      RuntimeControllerLifecycleStepKind.CreateViewFactory,
      viewFactory.productHandle,
      viewFactory.sourceAddressHandle,
      'Rendering.getViewFactory materialized the template-controller view factory.',
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

  private recordEmbeddedViewDefinition(
    local: string,
    controller: RuntimeControllerFrame,
    instructionSequenceProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    embeddedDefinitions: CustomElementDefinition[],
  ): CustomElementDefinition {
    const publication = this.publishEmbeddedViewDefinition(local, controller, instructionSequenceProductHandle);
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
    const name = generatedEmbeddedViewName(controller);
    const sequence = this.store.productDetails.read(
      TemplateProductDetails.InstructionSequence,
      instructionSequenceProductHandle,
    );
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
      controller.sourceAddressHandle,
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
    return new RuntimeEmbeddedViewDefinitionShape(
      new ResourceTargetReference(null, controller.sourceAddressHandle, name, null),
      runtimeResourceKeyForKind(ResourceDefinitionKind.CustomElement, name)!,
      new CustomElementCaptureDefinition(CustomElementCaptureKind.None),
      new CustomElementTemplateDefinition(
        CustomElementTemplateKind.DomNode,
        null,
        sequence?.sourceAddressHandle ?? controller.sourceAddressHandle,
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
    return [
      new AureliaResourceIdentity(
        publication.allocation.identityHandle,
        AureliaResourceIdentityKind.CustomElement,
        publication.definition.name,
        null,
      ),
      new MaterializedProduct(
        publication.allocation.productHandle,
        KernelVocabulary.Resource.Definition.key,
        publication.allocation.identityHandle,
        controller.sourceAddressHandle,
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
  controller: RuntimeControllerFrame,
): string {
  const seed = controller.instructionProductHandle ?? controller.productHandle;
  return `anonymous-${stableShortHash(seed)}`;
}

function stableShortHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
