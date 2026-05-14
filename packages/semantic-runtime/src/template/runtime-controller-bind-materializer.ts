import type { SemanticClaim } from '../kernel/claim.js';
import type {
  ProductHandle,
} from '../kernel/handles.js';
import { OpenSeam } from '../kernel/open-seam.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import {
  NodeObserverLocatorConfiguration,
  ObserverLocator,
  ObserverLocatorLookupRequest,
  ObserverLocatorLookupResult,
} from '../observation/observer-locator.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { HtmlElement, HtmlText } from './html-ir.js';
import { TemplateProductDetails } from './product-details.js';
import {
  PropertyBinding,
  InterpolationBinding,
  RefBinding,
  type RuntimeBinding,
  type RuntimeBindingBindHost,
  RuntimeBindingBindContext,
  RuntimeBindingTargetAccess,
  RuntimeBindingTargetAccessLookup,
  RuntimeBindingTarget,
  type RuntimeBindingTargetAccessRequest,
  RuntimeBindingTargetOperation,
  type RuntimeBindingTargetOperationRequest,
  RuntimeBindingTargetOperationKind,
  RuntimeBindingSourceOperation,
  type RuntimeBindingSourceOperationRequest,
  RuntimeBindingSourceOperationKind,
  RuntimeBindingTargetKind,
  SpreadValueBinding,
} from './runtime-binding.js';
import type {
  RuntimeRenderingEmission,
} from './runtime-rendering-materializer.js';
import type {
  RuntimeBindingRenderContext,
} from './runtime-rendered-instruction-recorder.js';
import type {
  RuntimeControllerBindHost,
  RuntimeControllerFrame,
} from './runtime-controller.js';
import type { TemplateScopeConstructionEmission } from './template-controller-scope-materializer.js';
import {
  HydrateAttributeInstruction,
  HydrateElementInstruction,
} from './instruction-ir.js';
import {
  RuntimeBindingSourceOperationTarget,
  RuntimeControllerBindPublisher,
  type RuntimeControllerBindSourceSet,
} from './runtime-controller-bind-publication.js';

export interface RuntimeControllerBindMaterializationRequest {
  /** Store-local key shared with the template compilation pass. */
  readonly localKey: string;
  /** Runtime bindings and render contexts produced by renderer dispatch. */
  readonly runtimeRendering: RuntimeRenderingEmission;
  /** Checker-backed scopes available to binding.bind source observation. */
  readonly scopes: TemplateScopeConstructionEmission;
  /** Current TypeChecker epoch used by ObserverLocator lookup, when available. */
  readonly typeSystem: TypeSystemProject | null;
  /** App-authored NodeObserverLocator service state visible to this runtime binding analysis. */
  readonly nodeObserverLocatorConfiguration?: NodeObserverLocatorConfiguration | null;
}

export class RuntimeControllerBindEmission {
  private readonly targetAccessesByBinding = new Map<ProductHandle, RuntimeBindingTargetAccess[]>();
  private readonly targetOperationsByBinding = new Map<ProductHandle, RuntimeBindingTargetOperation[]>();
  private readonly sourceOperationsByBinding = new Map<ProductHandle, RuntimeBindingSourceOperation[]>();

  constructor(
    /** Target-side accessors or observers selected while controller-owned bindings bind. */
    readonly targetAccesses: readonly RuntimeBindingTargetAccess[],
    /** Direct target update operations selected while controller-owned bindings bind. */
    readonly targetOperations: readonly RuntimeBindingTargetOperation[],
    /** Source-side update operations selected while controller-owned bindings bind. */
    readonly sourceOperations: readonly RuntimeBindingSourceOperation[],
    /** Open Controller.bind pressures that should remain visible to inquiry. */
    readonly openSeams: readonly OpenSeam[],
    /** Kernel records emitted for target products, provenance, and claims. */
    readonly records: readonly KernelStoreRecord[],
  ) {
    for (const access of targetAccesses) {
      if (access.binding.productHandle == null) {
        continue;
      }
      let accesses = this.targetAccessesByBinding.get(access.binding.productHandle);
      if (accesses === undefined) {
        accesses = [];
        this.targetAccessesByBinding.set(access.binding.productHandle, accesses);
      }
      accesses.push(access);
    }
    for (const operation of targetOperations) {
      if (operation.binding?.productHandle == null) {
        continue;
      }
      let operations = this.targetOperationsByBinding.get(operation.binding.productHandle);
      if (operations === undefined) {
        operations = [];
        this.targetOperationsByBinding.set(operation.binding.productHandle, operations);
      }
      operations.push(operation);
    }
    for (const operation of sourceOperations) {
      if (operation.binding.productHandle == null) {
        continue;
      }
      let operations = this.sourceOperationsByBinding.get(operation.binding.productHandle);
      if (operations === undefined) {
        operations = [];
        this.sourceOperationsByBinding.set(operation.binding.productHandle, operations);
      }
      operations.push(operation);
    }
  }

  readTargetAccessesForBinding(productHandle: ProductHandle): readonly RuntimeBindingTargetAccess[] {
    return this.targetAccessesByBinding.get(productHandle) ?? [];
  }

  readTargetOperationsForBinding(productHandle: ProductHandle): readonly RuntimeBindingTargetOperation[] {
    return this.targetOperationsByBinding.get(productHandle) ?? [];
  }

  readSourceOperationsForBinding(productHandle: ProductHandle): readonly RuntimeBindingSourceOperation[] {
    return this.sourceOperationsByBinding.get(productHandle) ?? [];
  }
}

class RuntimeControllerBindMaterializationHost implements RuntimeControllerBindHost, RuntimeBindingBindHost {
  private readonly targetControllerByBinding = new Map<ProductHandle, RuntimeControllerFrame | null>();

  constructor(
    private readonly materializer: RuntimeControllerBindMaterializer,
    private readonly input: RuntimeControllerBindMaterializationRequest,
    private readonly source: RuntimeControllerBindSourceSet,
    private readonly records: KernelStoreRecord[],
    private readonly claims: SemanticClaim[],
    private readonly targetAccesses: RuntimeBindingTargetAccess[],
    private readonly targetOperations: RuntimeBindingTargetOperation[],
    private readonly sourceOperations: RuntimeBindingSourceOperation[],
    private readonly openSeams: OpenSeam[],
  ) {}

  inputForBinding(
    controller: RuntimeControllerFrame,
    binding: RuntimeBinding,
    index: number,
  ): RuntimeBindingBindContext {
    const renderContext = this.input.runtimeRendering.readRenderContextForBinding(binding.productHandle);
    const targetController = targetControllerForContext(renderContext);
    this.targetControllerByBinding.set(binding.productHandle, targetController);
    const local = renderContext?.local
      ?? `${this.input.localKey}:controller:${controller.productHandle}:binding:${index}`;
    return new RuntimeBindingBindContext(
      `${local}:binding:${binding.productHandle}`,
      this,
      binding instanceof SpreadValueBinding
        ? this.materializer.spreadValueTargetProperties(targetController)
        : [],
    );
  }

  materializeTargetAccess(request: RuntimeBindingTargetAccessRequest): RuntimeBindingTargetAccess {
    return this.materializer.materializeTargetAccess(
      this.input,
      request,
      this.targetControllerByBinding.get(request.binding.productHandle) ?? null,
      this.source,
      this.records,
      this.claims,
      this.targetAccesses,
      this.openSeams,
    );
  }

  materializeTargetOperation(request: RuntimeBindingTargetOperationRequest): RuntimeBindingTargetOperation {
    return this.materializer.materializeTargetOperation(
      request,
      this.targetControllerByBinding.get(request.binding.productHandle) ?? null,
      this.source,
      this.records,
      this.claims,
      this.targetOperations,
      this.openSeams,
    );
  }

  materializeSourceOperation(request: RuntimeBindingSourceOperationRequest): RuntimeBindingSourceOperation {
    return this.materializer.materializeSourceOperation(
      this.input,
      request,
      this.targetControllerByBinding.get(request.binding.productHandle) ?? null,
      this.source,
      this.records,
      this.claims,
      this.sourceOperations,
      this.openSeams,
    );
  }
}

/** Materializes Controller.bind target-access products after renderer dispatch has created runtime bindings. */
export class RuntimeControllerBindMaterializer {
  private observerLocator: ObserverLocator;
  private readonly publisher: RuntimeControllerBindPublisher;

  constructor(
    /** Hot analysis store that receives controller bind-time products. */
    readonly store: KernelStore,
  ) {
    this.observerLocator = new ObserverLocator(store);
    this.publisher = new RuntimeControllerBindPublisher(store);
  }

  materialize(input: RuntimeControllerBindMaterializationRequest): RuntimeControllerBindEmission {
    this.observerLocator = new ObserverLocator(
      this.store,
      input.nodeObserverLocatorConfiguration ?? NodeObserverLocatorConfiguration.empty,
    );
    const emission = this.recordsForControllerBind(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `runtime-controller-bind:${input.localKey}`));
    }
    this.registerProductDetails(emission);
    return emission;
  }

  private registerProductDetails(emission: RuntimeControllerBindEmission): void {
    for (const access of emission.targetAccesses) {
      this.store.productDetails.add(TemplateProductDetails.RuntimeBindingTargetAccess, access.productHandle, access);
    }
    for (const operation of emission.targetOperations) {
      this.store.productDetails.add(TemplateProductDetails.RuntimeBindingTargetOperation, operation.productHandle, operation);
    }
    for (const operation of emission.sourceOperations) {
      this.store.productDetails.add(TemplateProductDetails.RuntimeBindingSourceOperation, operation.productHandle, operation);
    }
  }

  private resolveTargetAccess(input: ObserverLocatorLookupRequest): ObserverLocatorLookupResult {
    switch (input.lookup) {
      case RuntimeBindingTargetAccessLookup.Accessor:
        return this.observerLocator.getAccessor(input);
      case RuntimeBindingTargetAccessLookup.Observer:
        return this.observerLocator.getObserver(input);
      case RuntimeBindingTargetAccessLookup.Open:
        return ObserverLocatorLookupResult.open(
          input,
          'Binding mode did not close to an ObserverLocator accessor or observer lookup.',
        );
    }
  }

  private recordsForControllerBind(input: RuntimeControllerBindMaterializationRequest): RuntimeControllerBindEmission {
    const records: KernelStoreRecord[] = [];
    const targetAccesses: RuntimeBindingTargetAccess[] = [];
    const targetOperations: RuntimeBindingTargetOperation[] = [];
    const sourceOperations: RuntimeBindingSourceOperation[] = [];
    const openSeams: OpenSeam[] = [];
    const claims: SemanticClaim[] = [];
    const source = this.publisher.recordsForSource(input.localKey);
    records.push(...source.records);
    const host = new RuntimeControllerBindMaterializationHost(
      this,
      input,
      source,
      records,
      claims,
      targetAccesses,
      targetOperations,
      sourceOperations,
      openSeams,
    );

    for (const controller of input.runtimeRendering.controllers) {
      controller.bind({
        localKey: `${input.localKey}:controller:${controller.productHandle}`,
        host,
      });
    }

    records.push(...claims);
    return new RuntimeControllerBindEmission(targetAccesses, targetOperations, sourceOperations, openSeams, records);
  }

  materializeTargetAccess(
    input: RuntimeControllerBindMaterializationRequest,
    request: RuntimeBindingTargetAccessRequest,
    targetController: RuntimeControllerFrame | null,
    source: RuntimeControllerBindSourceSet,
    records: KernelStoreRecord[],
    claims: SemanticClaim[],
    targetAccesses: RuntimeBindingTargetAccess[],
    openSeams: OpenSeam[],
  ): RuntimeBindingTargetAccess {
    const target = this.targetAccessTarget(request.binding, targetController);
    const lookup = this.resolveTargetAccess(this.targetAccessLookupRequest(input, request, target));
    const publication = this.publisher.targetAccessPublication(`${request.localKey}:target-access`, request, target, lookup, source);
    if (lookup.openReason != null) {
      this.publisher.recordOpenSeam(
        `${publication.local}:open`,
        lookup.openReason,
        request.binding.sourceAddressHandle,
        source,
        records,
        openSeams,
        KernelVocabulary.Binding.OpenTargetAccess.key,
      );
    }
    publication.appendTo(records, claims, targetAccesses);
    return publication.product;
  }

  materializeTargetOperation(
    request: RuntimeBindingTargetOperationRequest,
    targetController: RuntimeControllerFrame | null,
    source: RuntimeControllerBindSourceSet,
    records: KernelStoreRecord[],
    claims: SemanticClaim[],
    targetOperations: RuntimeBindingTargetOperation[],
    openSeams: OpenSeam[],
  ): RuntimeBindingTargetOperation {
    const target = this.targetOperationTarget(request.binding, targetController);
    const openReason = target.targetKind === RuntimeBindingTargetKind.Unknown
      ? 'AttributeBinding.updateTarget did not carry a closed authored HTMLElement target.'
      : null;
    const operationKind = openReason == null
      ? request.operationKind
      : RuntimeBindingTargetOperationKind.Open;
    const publication = this.publisher.targetOperationPublication(`${request.localKey}:target-operation`, request, target, operationKind, openReason, source);
    if (openReason != null) {
      this.publisher.recordOpenSeam(
        `${publication.local}:open`,
        openReason,
        request.binding.sourceAddressHandle,
        source,
        records,
        openSeams,
        KernelVocabulary.Binding.OpenTargetOperation.key,
      );
    }
    publication.appendTo(records, claims, targetOperations);
    return publication.product;
  }

  materializeSourceOperation(
    input: RuntimeControllerBindMaterializationRequest,
    request: RuntimeBindingSourceOperationRequest,
    targetController: RuntimeControllerFrame | null,
    source: RuntimeControllerBindSourceSet,
    records: KernelStoreRecord[],
    claims: SemanticClaim[],
    sourceOperations: RuntimeBindingSourceOperation[],
    openSeams: OpenSeam[],
  ): RuntimeBindingSourceOperation {
    const target = this.sourceOperationTarget(input, request.binding, request.targetName, targetController);
    const openReason = target.openReason;
    const operationKind = openReason == null
      ? request.operationKind
      : RuntimeBindingSourceOperationKind.Open;
    const publication = this.publisher.sourceOperationPublication(`${request.localKey}:source-operation`, request, target, operationKind, openReason, source);
    if (openReason != null) {
      this.publisher.recordOpenSeam(
        `${publication.local}:open`,
        openReason,
        request.binding.sourceAddressHandle,
        source,
        records,
        openSeams,
        KernelVocabulary.Binding.OpenSourceOperation.key,
      );
    }
    publication.appendTo(records, claims, sourceOperations);
    return publication.product;
  }

  private targetAccessLookupRequest(
    input: RuntimeControllerBindMaterializationRequest,
    request: RuntimeBindingTargetAccessRequest,
    target: RuntimeBindingTarget,
  ): ObserverLocatorLookupRequest {
    return new ObserverLocatorLookupRequest(
      request.localKey,
      request.lookup,
      target.targetKind,
      request.targetProperty,
      input.typeSystem,
      target.targetType,
      target.tagName,
      target.namespace,
      request.sourceAddressHandle,
    );
  }

  spreadValueTargetProperties(
    targetController: RuntimeControllerFrame | null,
  ): readonly string[] {
    const definitionProductHandle = targetController?.definitionProductHandle ?? null;
    if (definitionProductHandle == null) {
      return [];
    }
    const definition = this.store.productDetails.read(ResourceProductDetails.Definition, definitionProductHandle);
    return definition instanceof CustomElementDefinition
      ? definition.bindables.map((bindable) => bindable.name)
      : [];
  }

  targetAccessTarget(
    binding: RuntimeBinding,
    targetController: RuntimeControllerFrame | null,
  ): RuntimeBindingTarget {
    // Runtime renderer getTarget(...) uses a controller view-model when renderer dispatch supplied a target controller.
    // Otherwise the binding target is the authored host node, even when the tag name is dash-cased.
    if ((binding instanceof PropertyBinding
      || binding instanceof InterpolationBinding
      || binding instanceof SpreadValueBinding)
      && targetController != null) {
      return new RuntimeBindingTarget(
        RuntimeBindingTargetKind.ControllerViewModel,
        null,
        targetController.productHandle,
        targetController.viewModel?.targetType ?? null,
        null,
        null,
      );
    }

    const element = this.htmlElementFor(binding.node);
    if (element == null) {
      return new RuntimeBindingTarget(
        RuntimeBindingTargetKind.Unknown,
        null,
        null,
        null,
        null,
        null,
      );
    }

    return new RuntimeBindingTarget(
      RuntimeBindingTargetKind.Node,
      binding.node,
      null,
      null,
      element.tagName,
      element.namespace,
    );
  }

  targetOperationTarget(
    binding: RuntimeBinding,
    targetController: RuntimeControllerFrame | null,
  ): RuntimeBindingTarget {
    const node = this.htmlNodeFor(binding.node);
    if (node == null) {
      return new RuntimeBindingTarget(
        RuntimeBindingTargetKind.Unknown,
        null,
        targetController?.productHandle ?? null,
        targetController?.viewModel?.targetType ?? null,
        null,
        null,
      );
    }
    if (node instanceof HtmlText) {
      return new RuntimeBindingTarget(
        RuntimeBindingTargetKind.Node,
        binding.node,
        null,
        null,
        null,
        null,
      );
    }
    return new RuntimeBindingTarget(
      RuntimeBindingTargetKind.Node,
      binding.node,
      null,
      null,
      node.tagName,
      node.namespace,
    );
  }

  sourceOperationTarget(
    input: RuntimeControllerBindMaterializationRequest,
    binding: RuntimeBinding,
    refTargetName: string,
    targetController: RuntimeControllerFrame | null,
  ): RuntimeBindingSourceOperationTarget {
    if (!(binding instanceof RefBinding)) {
      return RuntimeBindingSourceOperationTarget.open(
        'Runtime source operation materialization currently only closes RefBinding.updateSource.',
      );
    }

    switch (refTargetName) {
      case 'element':
        return this.refElementTarget(input, binding);
      case 'controller':
        return this.refControllerTarget(input, binding, targetController);
      case 'view':
        return RuntimeBindingSourceOperationTarget.open('view.ref is not supported by Aurelia runtime-html.');
      case 'component':
        return this.refComponentTarget(input, binding, null, targetController);
      default:
        return this.refNamedControllerTarget(input, binding, refTargetName, targetController);
    }
  }

  private refElementTarget(
    input: RuntimeControllerBindMaterializationRequest,
    binding: RefBinding,
  ): RuntimeBindingSourceOperationTarget {
    const element = this.htmlElementFor(binding.node);
    if (element == null) {
      return RuntimeBindingSourceOperationTarget.open('RefBinding element target did not carry a closed authored HTMLElement target.');
    }
    const targetType = this.observerLocator.getAccessor(new ObserverLocatorLookupRequest(
      `${input.localKey}:ref:${binding.productHandle}:element-target-type`,
      RuntimeBindingTargetAccessLookup.Accessor,
      RuntimeBindingTargetKind.Node,
      'nodeType',
      input.typeSystem,
      null,
      element.tagName,
      element.namespace,
      binding.sourceAddressHandle,
    )).targetType;
    return new RuntimeBindingSourceOperationTarget(
      RuntimeBindingTargetKind.Node,
      binding.node,
      null,
      targetType,
      null,
    );
  }

  private refControllerTarget(
    input: RuntimeControllerBindMaterializationRequest,
    binding: RefBinding,
    targetController: RuntimeControllerFrame | null,
  ): RuntimeBindingSourceOperationTarget {
    const controller = targetController
      ?? this.elementControllerForBinding(input, binding, null);
    if (controller == null) {
      return RuntimeBindingSourceOperationTarget.open(
        'RefBinding controller target could not find a custom-element controller for the authored node.',
      );
    }
    return new RuntimeBindingSourceOperationTarget(
      RuntimeBindingTargetKind.Controller,
      null,
      controller.productHandle,
      null,
      null,
    );
  }

  private refComponentTarget(
    input: RuntimeControllerBindMaterializationRequest,
    binding: RefBinding,
    elementName: string | null,
    targetController: RuntimeControllerFrame | null,
  ): RuntimeBindingSourceOperationTarget {
    const controller = elementName == null
      ? targetController ?? this.elementControllerForBinding(input, binding, null)
      : this.elementControllerForBinding(input, binding, elementName);
    if (controller == null) {
      return RuntimeBindingSourceOperationTarget.open(
        elementName == null
          ? 'RefBinding component target could not find a custom-element controller for the authored node.'
          : `RefBinding named custom-element target '${elementName}' was not found on the authored node.`,
      );
    }
    return new RuntimeBindingSourceOperationTarget(
      RuntimeBindingTargetKind.ControllerViewModel,
      null,
      controller.productHandle,
      controller.viewModel?.targetType ?? null,
      null,
    );
  }

  private refNamedControllerTarget(
    input: RuntimeControllerBindMaterializationRequest,
    binding: RefBinding,
    targetName: string,
    targetController: RuntimeControllerFrame | null,
  ): RuntimeBindingSourceOperationTarget {
    const attributeController = this.attributeControllerForBinding(input, binding, targetName);
    if (attributeController != null) {
      return new RuntimeBindingSourceOperationTarget(
        RuntimeBindingTargetKind.ControllerViewModel,
        null,
        attributeController.productHandle,
        attributeController.viewModel?.targetType ?? null,
        null,
      );
    }
    return this.refComponentTarget(input, binding, targetName, targetController);
  }

  private elementControllerForBinding(
    input: RuntimeControllerBindMaterializationRequest,
    binding: RefBinding,
    elementName: string | null,
  ): RuntimeControllerFrame | null {
    for (const controller of input.runtimeRendering.controllers) {
      if (controller.instructionProductHandle == null) {
        continue;
      }
      const instruction = this.store.productDetails.read(TemplateProductDetails.Instruction, controller.instructionProductHandle);
      if (!(instruction instanceof HydrateElementInstruction)) {
        continue;
      }
      if (!sameNode(instruction.node, binding.node)) {
        continue;
      }
      if (elementName == null || instruction.elementName === elementName || controller.name === elementName) {
        return controller;
      }
    }
    return null;
  }

  private attributeControllerForBinding(
    input: RuntimeControllerBindMaterializationRequest,
    binding: RefBinding,
    attributeName: string,
  ): RuntimeControllerFrame | null {
    for (const controller of input.runtimeRendering.controllers) {
      if (controller.instructionProductHandle == null) {
        continue;
      }
      const instruction = this.store.productDetails.read(TemplateProductDetails.Instruction, controller.instructionProductHandle);
      if (!(instruction instanceof HydrateAttributeInstruction)) {
        continue;
      }
      if (sameNode(instruction.node, binding.node) && instruction.attributeName === attributeName) {
        return controller;
      }
    }
    return null;
  }

  private htmlElementFor(reference: RuntimeBindingTargetAccess['targetNode']): HtmlElement | null {
    if (reference?.productHandle == null) {
      return null;
    }
    const node = this.store.productDetails.read(TemplateProductDetails.HtmlNode, reference.productHandle);
    return node instanceof HtmlElement ? node : null;
  }

  private htmlNodeFor(reference: RuntimeBindingTargetAccess['targetNode']): HtmlElement | HtmlText | null {
    if (reference?.productHandle == null) {
      return null;
    }
    const node = this.store.productDetails.read(TemplateProductDetails.HtmlNode, reference.productHandle);
    return node instanceof HtmlElement || node instanceof HtmlText ? node : null;
  }

}

function targetControllerForContext(
  context: RuntimeBindingRenderContext | null,
): RuntimeControllerFrame | null {
  if (context == null || context.targetController.productHandle === context.renderingController.productHandle) {
    return null;
  }
  return context.targetController;
}

function sameNode(
  left: { productHandle: ProductHandle | null },
  right: { productHandle: ProductHandle | null },
): boolean {
  return left.productHandle != null && left.productHandle === right.productHandle;
}
