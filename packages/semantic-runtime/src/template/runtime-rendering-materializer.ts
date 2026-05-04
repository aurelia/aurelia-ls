import { SemanticClaim } from '../kernel/claim.js';
import { ContainerReference } from '../di/container.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import {
  OpenSeam,
} from '../kernel/open-seam.js';
import type {
  AddressHandle,
  ClaimHandle,
  EvidenceHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  BindingIdentity,
  ConfigurationIdentity,
  CompilerIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import type { CompiledTemplateEmission } from './compiled-template-materializer.js';
import {
  type RuntimeBinding,
  type RuntimeBindingScopeEffect,
} from './runtime-binding.js';
import {
  RuntimeRendererAllocation,
  type RuntimeRenderer,
} from './runtime-renderer.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import {
  TemplateRenderingRunInput,
  TemplateRenderingTargetInput,
} from './compiler-world.js';
import { TemplateProductDetails } from './product-details.js';
import {
  RuntimeControllerCreationInput,
  RuntimeControllerCreationKind,
  RuntimeControllerFrame,
} from './runtime-controller.js';
import {
  CustomElementDefinition,
} from '../resources/custom-element-definition.js';
import {
  CustomAttributeDefinition,
} from '../resources/custom-attribute-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';

export class RuntimeRenderingMaterializationInput {
  constructor(
    /** Store-local key shared with the template compilation pass. */
    readonly localKey: string,
    /** Custom element definition whose template is being rendered. */
    readonly definition: CustomElementDefinition,
    /** Compiled-template rows that renderer emulation spends into runtime binding models. */
    readonly compiledTemplate: CompiledTemplateEmission,
    /** Compiler world whose Rendering service selects runtime renderers. */
    readonly compilerWorld: TemplateCompilerWorldEmission,
  ) {}
}

export class RuntimeRenderingEmission {
  private readonly bindingsByInstruction = new Map<ProductHandle, RuntimeBinding>();
  private readonly effectsByOwner = new Map<ProductHandle, RuntimeBindingScopeEffect[]>();
  private readonly controllersByInstruction = new Map<ProductHandle, RuntimeControllerFrame>();

  constructor(
    /** Root custom-element controller that invoked the render pass. */
    readonly rootController: RuntimeControllerFrame,
    /** Runtime controllers created or reached during renderer emulation. */
    readonly controllers: readonly RuntimeControllerFrame[],
    /** Runtime binding instances materialized from lowered instruction products. */
    readonly bindings: readonly RuntimeBinding[],
    /** Binding effects that can create or mutate runtime template scope. */
    readonly scopeEffects: readonly RuntimeBindingScopeEffect[],
    /** Open renderer-loop pressures that should remain visible to inquiry. */
    readonly openSeams: readonly OpenSeam[],
    /** Kernel records emitted for binding products, effect products, provenance, and claims. */
    readonly records: readonly KernelStoreRecord[],
  ) {
    for (const binding of bindings) {
      this.bindingsByInstruction.set(binding.instructionProductHandle, binding);
    }
    for (const effect of scopeEffects) {
      let effects = this.effectsByOwner.get(effect.ownerInstructionProductHandle);
      if (effects === undefined) {
        effects = [];
        this.effectsByOwner.set(effect.ownerInstructionProductHandle, effects);
      }
      effects.push(effect);
    }
    for (const controller of controllers) {
      if (controller.instructionProductHandle != null) {
        this.controllersByInstruction.set(controller.instructionProductHandle, controller);
      }
    }
  }

  readBindingForInstruction(productHandle: ProductHandle): RuntimeBinding | null {
    return this.bindingsByInstruction.get(productHandle) ?? null;
  }

  readScopeEffectsForOwner(productHandle: ProductHandle): readonly RuntimeBindingScopeEffect[] {
    return this.effectsByOwner.get(productHandle) ?? [];
  }

  readControllerForInstruction(productHandle: ProductHandle): RuntimeControllerFrame | null {
    return this.controllersByInstruction.get(productHandle) ?? null;
  }
}

class RuntimeRenderingSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

/** Materializes renderer-owned controller, binding, scope-effect, provenance, and claim products after Rendering dispatch. */
export class RuntimeRenderingMaterializer {
  constructor(
    /** Hot analysis store that receives runtime binding products. */
    readonly store: KernelStore,
  ) {}

  materialize(input: RuntimeRenderingMaterializationInput): RuntimeRenderingEmission {
    const emission = this.recordsForRendering(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `runtime-rendering:${input.localKey}`));
    }
    this.registerProductDetails(emission);
    return emission;
  }

  private registerProductDetails(emission: RuntimeRenderingEmission): void {
    for (const binding of emission.bindings) {
      this.store.productDetails.add(TemplateProductDetails.RuntimeBinding, binding.productHandle, binding);
    }
    for (const effect of emission.scopeEffects) {
      this.store.productDetails.add(TemplateProductDetails.RuntimeBindingScopeEffect, effect.productHandle, effect);
    }
  }

  private recordsForRendering(input: RuntimeRenderingMaterializationInput): RuntimeRenderingEmission {
    const records: KernelStoreRecord[] = [];
    const bindings: RuntimeBinding[] = [];
    const scopeEffects: RuntimeBindingScopeEffect[] = [];
    const openSeams: OpenSeam[] = [];
    const claims: SemanticClaim[] = [];
    const source = this.recordsForSource(input.localKey);
    records.push(...source.records);
    const rootController = this.createRootController(input, source);
    const renderTargets = this.renderTargetInputs(input, source, records, openSeams);

    const renderResult = input.compilerWorld.rendering.render(new TemplateRenderingRunInput(
      input.localKey,
      input.compiledTemplate.compiledTemplate,
      renderTargets,
      input.compiledTemplate.instructions,
      rootController,
      source.provenanceHandle,
      {
        allocate: (allocationLocal) => this.allocate(allocationLocal),
        createChildController: (creation) => this.createChildController(creation, source, records, openSeams),
      },
    ));
    const controllerBindingClaimHandles = this.controllerBindingClaimHandles(input.localKey, renderResult.controllers);

    for (const open of renderResult.openInstructions) {
      this.recordOpenSeam(
        open.local,
        open.summary,
        open.addressHandle,
        source,
        records,
        openSeams,
      );
    }

    for (const rendered of renderResult.renderedInstructions) {
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

      if (rendered.bindings.length === 0) {
        continue;
      }
      for (const binding of rendered.bindings) {
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
        if (targetControllerClaim != null) {
          claims.push(targetControllerClaim);
        }
        this.recordBinding(
          rendered.local,
          binding,
          rendered.renderer,
          source,
          records,
          bindings,
          scopeEffectClaims,
          targetControllerClaim == null ? [] : [targetControllerClaim],
          controllerBindingClaimHandles.get(binding.productHandle) ?? [],
        );
      }
    }

    for (const controller of renderResult.controllers) {
      this.recordController(`${input.localKey}:controller:${controller.productHandle}`, controller, source, records, claims);
    }
    records.push(...claims);
    return new RuntimeRenderingEmission(rootController, renderResult.controllers, bindings, scopeEffects, openSeams, records);
  }

  private renderTargetInputs(
    input: RuntimeRenderingMaterializationInput,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
  ): readonly TemplateRenderingTargetInput[] {
    const sequencesByProduct = new Map(input.compiledTemplate.instructionSequences.map((sequence) => [sequence.productHandle, sequence]));
    const instructionsByProduct = new Map(input.compiledTemplate.instructions.map((instruction) => [instruction.productHandle, instruction]));
    const targets: TemplateRenderingTargetInput[] = [];
    input.compiledTemplate.renderTargets.forEach((target, index) => {
      const sequence = sequencesByProduct.get(target.instructionSequenceProductHandle) ?? null;
      if (sequence == null) {
        this.recordOpenSeam(
          `${input.localKey}:target:${index}:missing-instruction-sequence`,
          `Compiled render target '${target.productHandle}' points at an instruction sequence that is not available to runtime Rendering.`,
          target.sourceAddressHandle,
          source,
          records,
          openSeams,
        );
        return;
      }
      const instructions = sequence.instructions
        .map((reference) => reference.productHandle == null
          ? null
          : instructionsByProduct.get(reference.productHandle) ?? null
        )
        .filter((instruction): instruction is NonNullable<typeof instruction> => instruction != null);
      if (instructions.length !== sequence.instructions.length) {
        this.recordOpenSeam(
          `${input.localKey}:target:${index}:missing-instructions`,
          `Compiled instruction sequence '${sequence.productHandle}' contains instruction references that could not be hydrated for runtime Rendering.`,
          sequence.sourceAddressHandle,
          source,
          records,
          openSeams,
        );
      }
      targets.push(new TemplateRenderingTargetInput(target, sequence, instructions));
    });
    return targets;
  }

  private recordBinding(
    local: string,
    binding: RuntimeBinding,
    renderer: RuntimeRenderer,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    bindings: RuntimeBinding[],
    scopeEffectClaims: readonly SemanticClaim[],
    targetControllerClaims: readonly SemanticClaim[],
    controllerBindingClaimHandles: readonly ClaimHandle[],
  ): void {
    if (renderer.semanticBindingKindKey == null || renderer.productHandle == null) {
      return;
    }
    const bindingLocal = `${local}:binding:${binding.productHandle}`;
    const instructionClaim = this.instructionCreatesBindingClaim(bindingLocal, binding.instructionProductHandle, binding.productHandle, source);
    const rendererCreatesBindingClaim = this.rendererCreatesBindingClaim(bindingLocal, renderer.productHandle, binding.productHandle, source);
    const bindingClaims = [
      instructionClaim,
      rendererCreatesBindingClaim,
      ...scopeEffectClaims,
      ...targetControllerClaims,
    ];
    const bindingClaimHandles = [
      ...bindingClaims.map((claim) => claim.handle),
      ...controllerBindingClaimHandles,
    ];
    bindings.push(binding);
    records.push(
      new BindingIdentity(
        binding.identityHandle,
        binding.instructionIdentityHandle,
        renderer.semanticBindingKindKey,
      ),
      new MaterializedProduct(
        binding.productHandle,
        KernelVocabulary.Binding.RuntimeBinding.key,
        binding.identityHandle,
        binding.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${bindingLocal}:runtime-binding`),
        binding.identityHandle,
        [binding.productHandle],
        bindingClaimHandles,
      ),
      instructionClaim,
      rendererCreatesBindingClaim,
    );
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
    const claim = new SemanticClaim(
      this.store.handles.claim(`${local}:binding-creates-scope-effect:${effect.productHandle}`),
      binding.productHandle,
      KernelVocabulary.Binding.RuntimeBindingCreatesScopeEffect.key,
      effect.productHandle,
      source.provenanceHandle,
    );
    claims.push(claim);
    scopeEffects.push(effect);
    records.push(
      new CompilerIdentity(
        effect.identityHandle,
        KernelVocabulary.Binding.ScopeEffect.key,
        binding.identityHandle,
        effect.sourceAddressHandle,
        `${effect.effectKind}:${local}`,
      ),
      new MaterializedProduct(
        effect.productHandle,
        KernelVocabulary.Binding.ScopeEffect.key,
        effect.identityHandle,
        effect.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:scope-effect:${effect.productHandle}`),
        effect.identityHandle,
        [effect.productHandle],
        [claim.handle],
      ),
    );
    return claim;
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

  private recordController(
    local: string,
    controller: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    externalClaims: readonly SemanticClaim[],
  ): void {
    const childClaims = controller.readChildren().map((child) =>
      new SemanticClaim(
        this.store.handles.claim(`${local}:has-child:${child.productHandle}`),
        controller.productHandle,
        KernelVocabulary.Configuration.ControllerHasChild.key,
        child.productHandle,
        source.provenanceHandle,
      )
    );
    const bindingClaims = controller.readBindings().map((binding) =>
      new SemanticClaim(
        this.store.handles.claim(`${local}:owns-binding:${binding.productHandle}`),
        controller.productHandle,
        KernelVocabulary.Configuration.ControllerOwnsRuntimeBinding.key,
        binding.productHandle,
        source.provenanceHandle,
      )
    );
    const instructionClaim = controller.instructionProductHandle == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`${local}:instruction-creates-controller`),
        controller.instructionProductHandle,
        KernelVocabulary.Configuration.InstructionCreatesController.key,
        controller.productHandle,
        source.provenanceHandle,
      );
    const claims = [
      ...childClaims,
      ...bindingClaims,
      ...(instructionClaim == null ? [] : [instructionClaim]),
    ];
    const materializationClaimHandles = uniqueClaimHandles([
      ...claims.map((claim) => claim.handle),
      ...claimsForProduct(externalClaims, controller.productHandle).map((claim) => claim.handle),
    ]);
    records.push(
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
        materializationClaimHandles,
      ),
      ...claims,
    );
  }

  private controllerBindingClaimHandles(
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

  private createRootController(
    input: RuntimeRenderingMaterializationInput,
    source: RuntimeRenderingSourceSet,
  ): RuntimeControllerFrame {
    const allocation = this.allocate(`${input.localKey}:controller:root`);
    return new RuntimeControllerFrame(
      RuntimeControllerCreationKind.RootCustomElement,
      allocation.productHandle,
      allocation.identityHandle,
      input.definition.name,
      input.compilerWorld.world.container,
      input.definition.productHandle,
      input.definition.target,
      input.definition.sourceAddressHandle,
      null,
      null,
      null,
      input.definition.strict,
      input.definition.sourceAddressHandle,
      source.provenanceHandle,
    );
  }

  private createChildController(
    creation: RuntimeControllerCreationInput,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
  ): RuntimeControllerFrame | null {
    if (creation.parent == null || creation.instruction == null) {
      return null;
    }
    const allocation = this.allocate(`${creation.local}:controller`);
    const definition = this.definitionForController(creation);
    const container = new ContainerReference(
      null,
      null,
      creation.instruction.sourceAddressHandle,
      `${creation.creationKind}:container`,
    );
    this.recordOpenSeam(
      `${creation.local}:open-controller-container`,
      `Renderer-created controller '${creation.creationKind}' needs runtime child-container materialization before DI-sensitive answers can treat its container as closed.`,
      creation.instruction.sourceAddressHandle,
      source,
      records,
      openSeams,
      KernelVocabulary.Di.OpenChildContainer.key,
    );
    const frame = new RuntimeControllerFrame(
      creation.creationKind,
      allocation.productHandle,
      allocation.identityHandle,
      controllerName(creation, definition),
      container,
      definition?.productHandle ?? null,
      definition instanceof CustomElementDefinition || definition instanceof CustomAttributeDefinition
        ? definition.target
        : null,
      creation.instruction.sourceAddressHandle,
      creation.parent,
      creation.instruction.productHandle,
      creation.instruction.identityHandle,
      definition instanceof CustomElementDefinition ? definition.strict : null,
      creation.instruction.sourceAddressHandle,
      source.provenanceHandle,
    );
    creation.parent.addChild(frame);
    return frame;
  }

  private definitionForController(
    creation: RuntimeControllerCreationInput,
  ): CustomElementDefinition | CustomAttributeDefinition | null {
    const productHandle = creation.instruction?.definitionProductHandle ?? null;
    if (productHandle == null) {
      return null;
    }
    const definition = this.store.productDetails.read(ResourceProductDetails.Definition, productHandle);
    if (definition instanceof CustomElementDefinition || definition instanceof CustomAttributeDefinition) {
      return definition;
    }
    return null;
  }

  private allocate(local: string): RuntimeRendererAllocation {
    return new RuntimeRendererAllocation(
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }

  private recordOpenSeam(
    local: string,
    summary: string,
    addressHandle: AddressHandle | null,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
    seamKindKey: OpenSeamKindKey = KernelVocabulary.Instruction.OpenInstruction.key,
  ): void {
    const seam = new OpenSeam(
      this.store.handles.openSeam(local),
      seamKindKey,
      summary,
      addressHandle,
      source.evidenceHandle,
    );
    openSeams.push(seam);
    records.push(seam);
  }

  private recordsForSource(local: string): RuntimeRenderingSourceSet {
    const evidenceHandle = this.store.handles.evidence(`runtime-rendering:${local}`);
    const provenanceHandle = this.store.handles.provenance(`runtime-rendering:${local}`);
    return new RuntimeRenderingSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'Runtime binding emulation from lowered instruction products and renderer semantics.',
          null,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          [evidenceHandle],
        ),
      ],
      evidenceHandle,
      provenanceHandle,
    );
  }
}

function controllerName(
  creation: RuntimeControllerCreationInput,
  definition: CustomElementDefinition | CustomAttributeDefinition | null,
): string | null {
  if (creation.creationKind === RuntimeControllerCreationKind.TemplateController
    && creation.instruction != null
    && 'controllerName' in creation.instruction) {
    return creation.instruction.controllerName;
  }
  return definition?.name ?? null;
}

function claimsForProduct(
  claims: readonly SemanticClaim[],
  productHandle: ProductHandle,
): readonly SemanticClaim[] {
  return claims.filter((claim) =>
    claim.subjectHandle === productHandle
    || claim.objectHandle === productHandle
  );
}

function uniqueClaimHandles(
  handles: readonly ClaimHandle[],
): readonly ClaimHandle[] {
  return [...new Set(handles)];
}
