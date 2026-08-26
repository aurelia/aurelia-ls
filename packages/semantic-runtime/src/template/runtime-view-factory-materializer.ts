import { SemanticClaim, nullableClaim } from '../kernel/claim.js';
import type { ProductHandle } from '../kernel/handles.js';
import { ConfigurationIdentity } from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { ViewFactory } from '../configuration/controller.js';
import type { Container } from '../di/container.js';
import type { CompiledTemplate } from './compiled-template.js';
import { RuntimeRendererAllocation } from './runtime-renderer.js';
import {
  RuntimeControllerAssemblyStage,
  RuntimeControllerAssemblyStepKind,
  type RuntimeControllerFrame,
} from './runtime-controller.js';
import type { RuntimeRenderingSourceSet } from './runtime-rendering-source.js';

export class RuntimeViewFactoryMaterialization {
  constructor(
    readonly ownerController: RuntimeControllerFrame,
    readonly container: Container,
    readonly viewFactory: ViewFactory,
    readonly compiledTemplate: CompiledTemplate,
    readonly claims: readonly SemanticClaim[],
  ) {}
}

/** Materializes runtime IViewFactory values from compiler-owned generated definitions. */
export class RuntimeViewFactoryMaterializer {
  constructor(readonly store: KernelStore) {}

  ensureForController(
    local: string,
    controller: RuntimeControllerFrame,
    factoryContainer: Container,
    compiledTemplate: CompiledTemplate,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    viewFactories: ViewFactory[],
    viewFactoryByController: Map<ProductHandle, RuntimeViewFactoryMaterialization>,
  ): RuntimeViewFactoryMaterialization {
    const existing = viewFactoryByController.get(controller.productHandle) ?? null;
    if (existing != null) {
      if (existing.compiledTemplate.productHandle !== compiledTemplate.productHandle) {
        throw new Error(
          `Runtime controller '${controller.productHandle}' cannot own view factories for both `
          + `'${existing.compiledTemplate.productHandle}' and '${compiledTemplate.productHandle}'.`,
        );
      }
      return existing;
    }
    const viewFactory = this.createViewFactory(
      local,
      controller,
      factoryContainer,
      compiledTemplate,
    );
    this.recordViewFactoryLifecycle(controller, viewFactory);
    const claims = this.claimsForViewFactory(
      local,
      controller,
      viewFactory,
      compiledTemplate,
      source,
    );
    const materialization = new RuntimeViewFactoryMaterialization(
      controller,
      factoryContainer,
      viewFactory,
      compiledTemplate,
      claims,
    );
    viewFactories.push(viewFactory);
    viewFactoryByController.set(controller.productHandle, materialization);
    records.push(...this.recordsForViewFactoryProduct(local, controller, viewFactory, source, claims));
    return materialization;
  }

  private createViewFactory(
    local: string,
    controller: RuntimeControllerFrame,
    factoryContainer: Container,
    compiledTemplate: CompiledTemplate,
  ): ViewFactory {
    const allocation = this.allocate(local);
    return new ViewFactory(
      allocation.productHandle,
      allocation.identityHandle,
      generatedEmbeddedViewName(compiledTemplate.productHandle),
      factoryContainer.toReference(),
      compiledTemplate.productHandle,
      controller.instructionProductHandle,
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
    compiledTemplate: CompiledTemplate,
    source: RuntimeRenderingSourceSet,
  ): readonly SemanticClaim[] {
    return [
      new SemanticClaim(
        this.store.handles.claim(`${local}:controller-uses-view-factory`),
        controller.productHandle,
        KernelVocabulary.Configuration.ControllerUsesViewFactory.key,
        viewFactory.productHandle,
        source.provenanceHandle,
      ),
      new SemanticClaim(
        this.store.handles.claim(`${local}:uses-compiled-template`),
        viewFactory.productHandle,
        KernelVocabulary.Configuration.ViewFactoryUsesCompiledTemplate.key,
        compiledTemplate.productHandle,
        source.provenanceHandle,
      ),
      ...nullableClaim(controller.instructionProductHandle == null
        ? null
        : new SemanticClaim(
            this.store.handles.claim(`${local}:instruction-creates-view-factory`),
            controller.instructionProductHandle,
            KernelVocabulary.Configuration.InstructionCreatesViewFactory.key,
            viewFactory.productHandle,
            source.provenanceHandle,
          )),
    ];
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

  private allocate(local: string): RuntimeRendererAllocation {
    return new RuntimeRendererAllocation(
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }
}

function generatedEmbeddedViewName(compiledTemplateProductHandle: ProductHandle): string {
  return `anonymous-${stableShortHash(compiledTemplateProductHandle)}`;
}

function stableShortHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
