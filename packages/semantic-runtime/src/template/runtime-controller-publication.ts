import {
  SemanticClaim,
  claimsForProduct,
  nullableClaim,
} from '../kernel/claim.js';
import type {
  ClaimHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
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
import { TemplateProductDetails } from './product-details.js';
import {
  RuntimeControllerCreationKind,
  RuntimeControllerFrame,
} from './runtime-controller.js';
import type { RuntimeRenderingSourceSet } from './runtime-rendering-source.js';
import type { RuntimeViewFactoryMaterialization } from './runtime-view-factory-materializer.js';
import type { TemplateRuntimeAnalysisProjectContext } from './template-runtime-analysis-context.js';

class RuntimeControllerPublication {
  constructor(
    readonly claims: readonly SemanticClaim[],
    readonly materializationClaimHandles: readonly ClaimHandle[],
  ) {}
}

export class RuntimeControllerPublicationMaterializer {
  constructor(
    private readonly store: KernelStore,
  ) {}

  recordController(
    local: string,
    controller: RuntimeControllerFrame,
    projectContext: TemplateRuntimeAnalysisProjectContext,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    externalClaims: readonly SemanticClaim[],
    viewFactoryByController: ReadonlyMap<ProductHandle, RuntimeViewFactoryMaterialization>,
  ): void {
    const publication = this.publishController(
      local,
      controller,
      projectContext,
      source,
      externalClaims,
      viewFactoryByController,
    );
    records.push(
      ...this.recordsForControllerProduct(local, controller, source, publication),
    );
  }

  controllerBindingClaimHandles(
    localKey: string,
    controllers: readonly RuntimeControllerFrame[],
  ): ReadonlyMap<ProductHandle, readonly ClaimHandle[]> {
    const result = new Map<ProductHandle, ClaimHandle[]>();
    for (const controller of controllers) {
      const local = `${localKey}:controller:${controller.productHandle}`;
      for (const binding of controller.readBindings()) {
        let handles = result.get(binding.productHandle);
        if (handles === undefined) {
          handles = [];
          result.set(binding.productHandle, handles);
        }
        handles.push(this.store.handles.claim(`${local}:owns-binding:${binding.productHandle}`));
      }
    }
    return result;
  }

  private publishController(
    local: string,
    controller: RuntimeControllerFrame,
    projectContext: TemplateRuntimeAnalysisProjectContext,
    source: RuntimeRenderingSourceSet,
    externalClaims: readonly SemanticClaim[],
    viewFactoryByController: ReadonlyMap<ProductHandle, RuntimeViewFactoryMaterialization>,
  ): RuntimeControllerPublication {
    const claims = this.claimsForController(
      local,
      controller,
      projectContext,
      source,
      viewFactoryByController,
    );
    return new RuntimeControllerPublication(
      claims,
      this.materializationClaimHandlesForController(controller, claims, externalClaims),
    );
  }

  private claimsForController(
    local: string,
    controller: RuntimeControllerFrame,
    projectContext: TemplateRuntimeAnalysisProjectContext,
    source: RuntimeRenderingSourceSet,
    viewFactoryByController: ReadonlyMap<ProductHandle, RuntimeViewFactoryMaterialization>,
  ): readonly SemanticClaim[] {
    const viewFactory = viewFactoryByController.get(controller.productHandle) ?? null;
    return [
      ...this.childClaimsForController(local, controller, source),
      ...this.bindingClaimsForController(local, controller, source),
      ...nullableClaim(this.instructionCreatesControllerClaim(local, controller, source)),
      ...nullableClaim(this.controllerUsesCompiledTemplateClaim(local, controller, projectContext, source)),
      ...nullableClaim(this.controllerUsesInstructionSequenceClaim(local, controller, source)),
      ...(viewFactory == null ? [] : viewFactory.claims),
      ...nullableClaim(this.viewFactoryCreatesSyntheticViewClaim(local, controller, source)),
    ];
  }

  private childClaimsForController(
    local: string,
    controller: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
  ): readonly SemanticClaim[] {
    return controller.readChildren().map((child) => new SemanticClaim(
      this.store.handles.claim(`${local}:has-child:${child.productHandle}`),
      controller.productHandle,
      KernelVocabulary.Configuration.ControllerHasChild.key,
      child.productHandle,
      source.provenanceHandle,
    ));
  }

  private bindingClaimsForController(
    local: string,
    controller: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
  ): readonly SemanticClaim[] {
    return controller.readBindings().map((binding) => new SemanticClaim(
      this.store.handles.claim(`${local}:owns-binding:${binding.productHandle}`),
      controller.productHandle,
      KernelVocabulary.Configuration.ControllerOwnsRuntimeBinding.key,
      binding.productHandle,
      source.provenanceHandle,
    ));
  }

  private instructionCreatesControllerClaim(
    local: string,
    controller: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim | null {
    return controller.instructionProductHandle == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`${local}:instruction-creates-controller`),
        controller.instructionProductHandle,
        KernelVocabulary.Configuration.InstructionCreatesController.key,
        controller.productHandle,
        source.provenanceHandle,
      );
  }

  private controllerUsesCompiledTemplateClaim(
    local: string,
    controller: RuntimeControllerFrame,
    projectContext: TemplateRuntimeAnalysisProjectContext,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim | null {
    const compiledTemplateProductHandle = projectContext.readCompiledTemplateForDefinition(controller.definitionProductHandle);
    return compiledTemplateProductHandle == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`${local}:uses-compiled-template`),
        controller.productHandle,
        KernelVocabulary.Configuration.ControllerUsesCompiledTemplate.key,
        compiledTemplateProductHandle,
        source.provenanceHandle,
      );
  }

  private controllerUsesInstructionSequenceClaim(
    local: string,
    controller: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim | null {
    const instructionSequenceProductHandle = instructionSequenceProductHandleForController(this.store, controller);
    return instructionSequenceProductHandle == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`${local}:uses-instruction-sequence`),
        controller.productHandle,
        KernelVocabulary.Configuration.ControllerUsesInstructionSequence.key,
        instructionSequenceProductHandle,
        source.provenanceHandle,
      );
  }

  private viewFactoryCreatesSyntheticViewClaim(
    local: string,
    controller: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim | null {
    return controller.creationKind !== RuntimeControllerCreationKind.SyntheticView
      || controller.viewFactoryProductHandle == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`${local}:view-factory-creates-synthetic-view`),
        controller.viewFactoryProductHandle,
        KernelVocabulary.Configuration.ViewFactoryCreatesSyntheticView.key,
        controller.productHandle,
        source.provenanceHandle,
      );
  }

  private materializationClaimHandlesForController(
    controller: RuntimeControllerFrame,
    claims: readonly SemanticClaim[],
    externalClaims: readonly SemanticClaim[],
  ): readonly ClaimHandle[] {
    return uniqueClaimHandles([
      ...claims.map((claim) => claim.handle),
      ...claimsForProduct(externalClaims, controller.productHandle).map((claim) => claim.handle),
    ]);
  }

  private recordsForControllerProduct(
    local: string,
    controller: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
    publication: RuntimeControllerPublication,
  ): readonly KernelStoreRecord[] {
    return [
      new ConfigurationIdentity(
        controller.identityHandle,
        KernelVocabulary.Configuration.Controller.key,
        controller.parent?.identityHandle ?? null,
        controller.sourceAddressHandle,
        controller.name,
      ),
      new MaterializedProduct(
        controller.productHandle,
        KernelVocabulary.Configuration.Controller.key,
        controller.identityHandle,
        controller.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:runtime-controller`),
        controller.identityHandle,
        [controller.productHandle],
        publication.materializationClaimHandles,
      ),
      ...publication.claims,
    ];
  }
}

function childInstructionSequenceProductHandleForInstruction(
  store: KernelStore,
  instructionProductHandle: ProductHandle,
): ProductHandle | null {
  const instruction = store.productDetails.read(TemplateProductDetails.Instruction, instructionProductHandle);
  if (instruction == null || !('childInstructionSequenceProductHandle' in instruction)) {
    return null;
  }
  return typeof instruction.childInstructionSequenceProductHandle === 'string'
    ? instruction.childInstructionSequenceProductHandle
    : null;
}

function instructionSequenceProductHandleForController(
  store: KernelStore,
  controller: RuntimeControllerFrame,
): ProductHandle | null {
  if (controller.instructionSequenceProductHandle != null) {
    return controller.instructionSequenceProductHandle;
  }
  if (controller.instructionProductHandle == null) {
    return null;
  }
  return childInstructionSequenceProductHandleForInstruction(store, controller.instructionProductHandle);
}

function uniqueClaimHandles(
  handles: readonly ClaimHandle[],
): readonly ClaimHandle[] {
  return [...new Set(handles)];
}
