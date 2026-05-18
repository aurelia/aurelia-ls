import { SemanticClaim, nullableClaim } from '../kernel/claim.js';
import type {
  ClaimHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  CompilerIdentity,
  BindingIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  OpenSeam,
} from '../kernel/open-seam.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type BindingKindKey,
} from '../kernel/vocabulary.js';
import type {
  TemplateRenderedInstruction,
} from './compiler-world.js';
import {
  type RuntimeBindingScopeEffect,
  RuntimeTargetOperation,
  type RuntimeBinding,
} from './runtime-binding.js';
import type {
  RuntimeControllerFrame,
} from './runtime-controller.js';
import type {
  RuntimeRenderer,
} from './runtime-renderer.js';
import type {
  RuntimeRenderingSourceSet,
} from './runtime-rendering-source.js';

export class RuntimeBindingRenderContext {
  constructor(
    /** Store-local renderer invocation key that created the binding. */
    readonly local: string,
    /** Runtime binding created by the renderer. */
    readonly binding: RuntimeBinding,
    /** Controller whose Rendering.render loop owns the binding. */
    readonly renderingController: RuntimeControllerFrame,
    /** Runtime target controller selected by renderer dispatch. */
    readonly targetController: RuntimeControllerFrame,
  ) {}
}

class RuntimeBindingPublication {
  constructor(
    readonly local: string,
    readonly instructionClaim: SemanticClaim,
    readonly rendererClaim: SemanticClaim,
    readonly materializationClaimHandles: readonly ClaimHandle[],
  ) {}

  get ownedClaims(): readonly SemanticClaim[] {
    return [this.instructionClaim, this.rendererClaim];
  }
}

class RuntimeTargetOperationPublication {
  constructor(
    readonly local: string,
    readonly claims: readonly SemanticClaim[],
  ) {}
}

class RuntimeScopeEffectPublication {
  constructor(
    readonly local: string,
    readonly claim: SemanticClaim,
  ) {}

  get claimHandles(): readonly ClaimHandle[] {
    return [this.claim.handle];
  }
}

export class RuntimeRenderedInstructionRecorder {
  constructor(
    readonly store: KernelStore,
  ) {}

  recordRenderedInstructions(
    renderedInstructions: readonly TemplateRenderedInstruction[],
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    claims: SemanticClaim[],
    targetOperations: RuntimeTargetOperation[],
    scopeEffects: RuntimeBindingScopeEffect[],
    bindingRenderContexts: RuntimeBindingRenderContext[],
    bindings: RuntimeBinding[],
    openSeams: OpenSeam[],
    controllerBindingClaimHandles: ReadonlyMap<ProductHandle, readonly ClaimHandle[]>,
  ): void {
    for (const rendered of renderedInstructions) {
      if (rendered.renderer.productHandle == null) {
        continue;
      }
      const instructionUsesRendererClaim = this.instructionUsesRendererClaim(
        rendered.local,
        rendered.instruction.productHandle,
        rendered.renderer.productHandle,
        source,
      );
      claims.push(instructionUsesRendererClaim);

      for (const operation of rendered.targetOperations) {
        this.recordTargetOperation(rendered.local, operation, rendered.renderer, source, records, claims, targetOperations, openSeams);
      }

      for (const binding of rendered.bindings) {
        this.recordRuntimeBinding(rendered, binding, source, records, claims, scopeEffects, bindingRenderContexts, bindings, controllerBindingClaimHandles);
      }
    }
  }

  private recordRuntimeBinding(
    rendered: TemplateRenderedInstruction,
    binding: RuntimeBinding,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    claims: SemanticClaim[],
    scopeEffects: RuntimeBindingScopeEffect[],
    bindingRenderContexts: RuntimeBindingRenderContext[],
    bindings: RuntimeBinding[],
    controllerBindingClaimHandles: ReadonlyMap<ProductHandle, readonly ClaimHandle[]>,
  ): void {
    const bindingScopeEffects = rendered.scopeEffects.filter((effect) =>
      effect.binding.productHandle === binding.productHandle
    );
    const scopeEffectClaims = bindingScopeEffects.map((effect) =>
      this.recordScopeEffect(rendered.local, binding, effect, source, records, claims, scopeEffects)
    );
    const targetControllerClaim = rendered.targetController.productHandle === rendered.renderingController.productHandle
      ? null
      : this.runtimeBindingTargetsControllerClaim(
        rendered.local,
        binding.productHandle,
        rendered.targetController.productHandle,
        source,
      );
    const ownerBindingClaim = rendered.bindingOwner == null
      ? null
      : this.runtimeBindingOwnsRuntimeBindingClaim(
        rendered.local,
        rendered.bindingOwner.productHandle,
        binding.productHandle,
        source,
      );
    if (targetControllerClaim != null) {
      claims.push(targetControllerClaim);
    }
    if (ownerBindingClaim != null) {
      claims.push(ownerBindingClaim);
    }
    bindingRenderContexts.push(new RuntimeBindingRenderContext(
      rendered.local,
      binding,
      rendered.renderingController,
      rendered.targetController,
    ));
    this.recordBinding(
      rendered.local,
      binding,
      rendered.instruction.identityHandle,
      rendered.renderer,
      source,
      records,
      bindings,
      scopeEffectClaims,
      [
        ...(targetControllerClaim == null ? [] : [targetControllerClaim]),
        ...(ownerBindingClaim == null ? [] : [ownerBindingClaim]),
      ],
      controllerBindingClaimHandles.get(binding.productHandle) ?? [],
    );
  }

  private recordBinding(
    local: string,
    binding: RuntimeBinding,
    instructionIdentityHandle: IdentityHandle,
    renderer: RuntimeRenderer,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    bindings: RuntimeBinding[],
    scopeEffectClaims: readonly SemanticClaim[],
    targetControllerClaims: readonly SemanticClaim[],
    controllerBindingClaimHandles: readonly ClaimHandle[],
  ): void {
    const semanticBindingKindKey = renderer.semanticBindingKindKey;
    if (semanticBindingKindKey == null || renderer.productHandle == null) {
      return;
    }
    const bindingLocal = `${local}:binding:${binding.productHandle}`;
    const publication = this.publishRuntimeBinding(
      bindingLocal,
      binding,
      renderer.productHandle,
      source,
      scopeEffectClaims,
      targetControllerClaims,
      controllerBindingClaimHandles,
    );
    bindings.push(binding);
    records.push(...this.recordsForRuntimeBinding(binding, instructionIdentityHandle, semanticBindingKindKey, publication, source));
  }

  private publishRuntimeBinding(
    bindingLocal: string,
    binding: RuntimeBinding,
    rendererProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
    scopeEffectClaims: readonly SemanticClaim[],
    targetControllerClaims: readonly SemanticClaim[],
    controllerBindingClaimHandles: readonly ClaimHandle[],
  ): RuntimeBindingPublication {
    const instructionClaim = this.instructionCreatesBindingClaim(bindingLocal, binding.instructionProductHandle, binding.productHandle, source);
    const rendererClaim = this.rendererCreatesBindingClaim(bindingLocal, rendererProductHandle, binding.productHandle, source);
    return new RuntimeBindingPublication(
      bindingLocal,
      instructionClaim,
      rendererClaim,
      runtimeBindingMaterializationClaimHandles(
        [instructionClaim, rendererClaim, ...scopeEffectClaims, ...targetControllerClaims],
        controllerBindingClaimHandles,
      ),
    );
  }

  private recordsForRuntimeBinding(
    binding: RuntimeBinding,
    instructionIdentityHandle: IdentityHandle,
    semanticBindingKindKey: BindingKindKey,
    publication: RuntimeBindingPublication,
    source: RuntimeRenderingSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new BindingIdentity(
        binding.identityHandle,
        instructionIdentityHandle,
        semanticBindingKindKey,
      ),
      new MaterializedProduct(
        binding.productHandle,
        KernelVocabulary.Binding.RuntimeBinding.key,
        binding.identityHandle,
        binding.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${publication.local}:runtime-binding`),
        binding.identityHandle,
        [binding.productHandle],
        publication.materializationClaimHandles,
      ),
      ...publication.ownedClaims,
    ];
  }

  private recordTargetOperation(
    local: string,
    operation: RuntimeTargetOperation,
    renderer: RuntimeRenderer,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    claims: SemanticClaim[],
    targetOperations: RuntimeTargetOperation[],
    openSeams: OpenSeam[],
  ): void {
    if (renderer.productHandle == null) {
      return;
    }
    const operationLocal = `${local}:target-operation:${operation.productHandle}`;
    const publication = this.publishTargetOperation(operationLocal, operation, renderer.productHandle, source);
    this.recordOpenTargetOperationSeam(operationLocal, operation, source, records, openSeams);
    claims.push(...publication.claims);
    targetOperations.push(operation);
    records.push(...this.recordsForTargetOperation(operation, renderer, publication, source));
  }

  private publishTargetOperation(
    operationLocal: string,
    operation: RuntimeTargetOperation,
    rendererProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): RuntimeTargetOperationPublication {
    const claims = [
      this.rendererUsesTargetOperationClaim(operationLocal, rendererProductHandle, operation.productHandle, source),
      ...nullableClaim(operation.instructionProductHandle == null
        ? null
        : this.instructionCreatesTargetOperationClaim(
          operationLocal,
          operation.instructionProductHandle,
          operation.productHandle,
          source,
        )),
    ];
    return new RuntimeTargetOperationPublication(operationLocal, claims);
  }

  private recordOpenTargetOperationSeam(
    operationLocal: string,
    operation: RuntimeTargetOperation,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
  ): void {
    if (operation.openReason == null) {
      return;
    }
    const seam = new OpenSeam(
      this.store.handles.openSeam(`${operationLocal}:open`),
      KernelVocabulary.Binding.OpenTargetOperation.key,
      operation.openReason,
      operation.sourceAddressHandle,
      source.evidenceHandle,
    );
    openSeams.push(seam);
    records.push(seam);
  }

  private recordsForTargetOperation(
    operation: RuntimeTargetOperation,
    renderer: RuntimeRenderer,
    publication: RuntimeTargetOperationPublication,
    source: RuntimeRenderingSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        operation.identityHandle,
        KernelVocabulary.Binding.TargetOperation.key,
        renderer.identityHandle,
        operation.sourceAddressHandle,
        `${operation.operationKind}:${operation.targetKind}:${operation.targetAttribute}:${operation.targetProperty}`,
      ),
      new MaterializedProduct(
        operation.productHandle,
        KernelVocabulary.Binding.TargetOperation.key,
        operation.identityHandle,
        operation.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${publication.local}:target-operation`),
        operation.identityHandle,
        [operation.productHandle],
        publication.claims.map((claim) => claim.handle),
      ),
    ];
  }

  private recordScopeEffect(
    local: string,
    binding: RuntimeBinding,
    effect: RuntimeBindingScopeEffect,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    claims: SemanticClaim[],
    scopeEffects: RuntimeBindingScopeEffect[],
  ): SemanticClaim {
    const publication = this.publishScopeEffect(local, binding, effect, source);
    claims.push(publication.claim);
    scopeEffects.push(effect);
    records.push(...this.recordsForScopeEffect(effect, binding, publication, source));
    return publication.claim;
  }

  private publishScopeEffect(
    local: string,
    binding: RuntimeBinding,
    effect: RuntimeBindingScopeEffect,
    source: RuntimeRenderingSourceSet,
  ): RuntimeScopeEffectPublication {
    return new RuntimeScopeEffectPublication(
      local,
      new SemanticClaim(
        this.store.handles.claim(`${local}:binding-creates-scope-effect:${effect.productHandle}`),
        binding.productHandle,
        KernelVocabulary.Binding.RuntimeBindingCreatesScopeEffect.key,
        effect.productHandle,
        source.provenanceHandle,
      ),
    );
  }

  private recordsForScopeEffect(
    effect: RuntimeBindingScopeEffect,
    binding: RuntimeBinding,
    publication: RuntimeScopeEffectPublication,
    source: RuntimeRenderingSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        effect.identityHandle,
        KernelVocabulary.Binding.ScopeEffect.key,
        binding.identityHandle,
        effect.sourceAddressHandle,
        `${effect.effectKind}:${publication.local}`,
      ),
      new MaterializedProduct(
        effect.productHandle,
        KernelVocabulary.Binding.ScopeEffect.key,
        effect.identityHandle,
        effect.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${publication.local}:scope-effect:${effect.productHandle}`),
        effect.identityHandle,
        [effect.productHandle],
        publication.claimHandles,
      ),
    ];
  }

  private instructionCreatesBindingClaim(
    local: string,
    instructionProductHandle: ProductHandle,
    bindingProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:instruction-creates-runtime-binding`),
      instructionProductHandle,
      KernelVocabulary.Binding.InstructionCreatesRuntimeBinding.key,
      bindingProductHandle,
      source.provenanceHandle,
    );
  }

  private instructionUsesRendererClaim(
    local: string,
    instructionProductHandle: ProductHandle,
    rendererProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:instruction-uses-runtime-renderer`),
      instructionProductHandle,
      KernelVocabulary.Binding.InstructionUsesRuntimeRenderer.key,
      rendererProductHandle,
      source.provenanceHandle,
    );
  }

  private rendererCreatesBindingClaim(
    local: string,
    rendererProductHandle: ProductHandle,
    bindingProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:runtime-renderer-creates-runtime-binding`),
      rendererProductHandle,
      KernelVocabulary.Binding.RuntimeRendererCreatesRuntimeBinding.key,
      bindingProductHandle,
      source.provenanceHandle,
    );
  }

  private instructionCreatesTargetOperationClaim(
    local: string,
    instructionProductHandle: ProductHandle,
    targetOperationProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:instruction-creates-target-operation`),
      instructionProductHandle,
      KernelVocabulary.Binding.InstructionCreatesTargetOperation.key,
      targetOperationProductHandle,
      source.provenanceHandle,
    );
  }

  private rendererUsesTargetOperationClaim(
    local: string,
    rendererProductHandle: ProductHandle,
    targetOperationProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:runtime-renderer-uses-target-operation`),
      rendererProductHandle,
      KernelVocabulary.Binding.RuntimeRendererUsesTargetOperation.key,
      targetOperationProductHandle,
      source.provenanceHandle,
    );
  }

  private runtimeBindingTargetsControllerClaim(
    local: string,
    bindingProductHandle: ProductHandle,
    controllerProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:runtime-binding-targets-controller`),
      bindingProductHandle,
      KernelVocabulary.Binding.RuntimeBindingTargetsController.key,
      controllerProductHandle,
      source.provenanceHandle,
    );
  }

  private runtimeBindingOwnsRuntimeBindingClaim(
    local: string,
    ownerBindingProductHandle: ProductHandle,
    bindingProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:runtime-binding-owns-runtime-binding`),
      ownerBindingProductHandle,
      KernelVocabulary.Binding.RuntimeBindingOwnsRuntimeBinding.key,
      bindingProductHandle,
      source.provenanceHandle,
    );
  }
}

function runtimeBindingMaterializationClaimHandles(
  ownedClaims: readonly SemanticClaim[],
  controllerBindingClaimHandles: readonly ClaimHandle[],
): readonly ClaimHandle[] {
  return [
    ...ownedClaims.map((claim) => claim.handle),
    ...controllerBindingClaimHandles,
  ];
}
