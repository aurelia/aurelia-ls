import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { CompilerIdentity } from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import { OpenSeam } from '../kernel/open-seam.js';
import {
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type ClaimPredicateKey,
  type OpenSeamKindKey,
  type ProductKindKey,
} from '../kernel/vocabulary.js';
import {
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
  RefBinding,
  type RuntimeBinding,
  type RuntimeBindingBindHost,
  RuntimeBindingBindContext,
  RuntimeBindingTargetAccess,
  RuntimeBindingTargetAccessLookup,
  type RuntimeBindingTargetAccessField,
  RuntimeBindingTarget,
  type RuntimeBindingTargetAccessRequest,
  RuntimeBindingTargetOperation,
  RuntimeBindingTargetOperationAuthority,
  type RuntimeBindingTargetOperationField,
  type RuntimeBindingTargetOperationRequest,
  RuntimeBindingTargetOperationKind,
  RuntimeBindingSourceOperation,
  RuntimeBindingSourceOperationAuthority,
  type RuntimeBindingSourceOperationField,
  type RuntimeBindingSourceOperationRequest,
  RuntimeBindingSourceOperationKind,
  RuntimeTargetOperationOwnerKind,
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

export interface RuntimeControllerBindMaterializationRequest {
  /** Store-local key shared with the template compilation pass. */
  readonly localKey: string;
  /** Runtime bindings and render contexts produced by renderer dispatch. */
  readonly runtimeRendering: RuntimeRenderingEmission;
  /** Checker-backed scopes available to binding.bind source observation. */
  readonly scopes: TemplateScopeConstructionEmission;
  /** Current TypeChecker epoch used by ObserverLocator lookup, when available. */
  readonly typeSystem: TypeSystemProject | null;
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

class RuntimeControllerBindSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class RuntimeControllerBindProductHandles {
  constructor(
    readonly local: string,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

class RuntimeControllerBindProductPublication<TProduct> {
  constructor(
    readonly product: TProduct,
    readonly claim: SemanticClaim,
    readonly records: readonly KernelStoreRecord[],
  ) {}

  appendTo(
    records: KernelStoreRecord[],
    claims: SemanticClaim[],
    products: TProduct[],
  ): void {
    claims.push(this.claim);
    products.push(this.product);
    records.push(...this.records);
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
  private readonly observerLocator: ObserverLocator;

  constructor(
    /** Hot analysis store that receives controller bind-time products. */
    readonly store: KernelStore,
  ) {
    this.observerLocator = new ObserverLocator(store);
  }

  materialize(input: RuntimeControllerBindMaterializationRequest): RuntimeControllerBindEmission {
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
    const source = this.recordsForSource(input.localKey);
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
    const handles = this.productHandles(`${request.localKey}:target-access`);
    const publication = this.targetAccessPublication(handles, request, target, lookup, source);
    if (lookup.openReason != null) {
      this.recordOpenSeam(
        `${handles.local}:open`,
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
    const handles = this.productHandles(`${request.localKey}:target-operation`);
    const publication = this.targetOperationPublication(handles, request, target, operationKind, openReason, source);
    if (openReason != null) {
      this.recordOpenSeam(
        `${handles.local}:open`,
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
    const handles = this.productHandles(`${request.localKey}:source-operation`);
    const publication = this.sourceOperationPublication(handles, request, target, operationKind, openReason, source);
    if (openReason != null) {
      this.recordOpenSeam(
        `${handles.local}:open`,
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

  private productHandles(local: string): RuntimeControllerBindProductHandles {
    return new RuntimeControllerBindProductHandles(
      local,
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
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

  private targetAccessPublication(
    handles: RuntimeControllerBindProductHandles,
    request: RuntimeBindingTargetAccessRequest,
    target: RuntimeBindingTarget,
    lookup: ObserverLocatorLookupResult,
    source: RuntimeControllerBindSourceSet,
  ): RuntimeControllerBindProductPublication<RuntimeBindingTargetAccess> {
    const access = this.targetAccessProduct(handles, request, target, lookup, source);
    const claim = this.runtimeBindingProductClaim(
      `${handles.local}:runtime-binding-uses-target-access`,
      request.binding.productHandle,
      KernelVocabulary.Binding.RuntimeBindingUsesTargetAccess.key,
      handles.productHandle,
      source,
    );
    const records = this.runtimeBindingProductRecords(
      handles,
      KernelVocabulary.Binding.TargetAccess.key,
      request.binding.identityHandle,
      request.binding.sourceAddressHandle,
      source,
      `${request.lookup}:${target.targetKind}:${request.targetProperty}`,
      'target-access',
      claim,
    );
    return new RuntimeControllerBindProductPublication(access, claim, records);
  }

  private targetAccessProduct(
    handles: RuntimeControllerBindProductHandles,
    request: RuntimeBindingTargetAccessRequest,
    target: RuntimeBindingTarget,
    lookup: ObserverLocatorLookupResult,
    source: RuntimeControllerBindSourceSet,
  ): RuntimeBindingTargetAccess {
    return new RuntimeBindingTargetAccess(
      handles.productHandle,
      handles.identityHandle,
      request.binding.toReference(),
      request.lookup,
      lookup.targetKind,
      target.targetNode,
      target.targetControllerProductHandle,
      request.targetProperty,
      lookup.strategy,
      lookup.eventNames,
      lookup.targetType,
      lookup.propertyType,
      lookup.propertyExists,
      lookup.isWritable,
      lookup.isObservable,
      lookup.authority,
      lookup.openReason,
      request.binding.sourceAddressHandle,
      this.targetAccessFieldProvenance(this.targetAccessFields(target, lookup), source),
    );
  }

  private targetOperationPublication(
    handles: RuntimeControllerBindProductHandles,
    request: RuntimeBindingTargetOperationRequest,
    target: RuntimeBindingTarget,
    operationKind: RuntimeBindingTargetOperationKind,
    openReason: string | null,
    source: RuntimeControllerBindSourceSet,
  ): RuntimeControllerBindProductPublication<RuntimeBindingTargetOperation> {
    const operation = this.targetOperationProduct(handles, request, target, operationKind, openReason, source);
    const claim = this.runtimeBindingProductClaim(
      `${handles.local}:runtime-binding-uses-target-operation`,
      request.binding.productHandle,
      KernelVocabulary.Binding.RuntimeBindingUsesTargetOperation.key,
      handles.productHandle,
      source,
    );
    const records = this.runtimeBindingProductRecords(
      handles,
      KernelVocabulary.Binding.TargetOperation.key,
      request.binding.identityHandle,
      request.binding.sourceAddressHandle,
      source,
      `${operationKind}:${target.targetKind}:${request.targetAttribute}:${request.targetProperty}`,
      'target-operation',
      claim,
    );
    return new RuntimeControllerBindProductPublication(operation, claim, records);
  }

  private targetOperationProduct(
    handles: RuntimeControllerBindProductHandles,
    request: RuntimeBindingTargetOperationRequest,
    target: RuntimeBindingTarget,
    operationKind: RuntimeBindingTargetOperationKind,
    openReason: string | null,
    source: RuntimeControllerBindSourceSet,
  ): RuntimeBindingTargetOperation {
    return new RuntimeBindingTargetOperation(
      handles.productHandle,
      handles.identityHandle,
      RuntimeTargetOperationOwnerKind.RuntimeBinding,
      request.binding.toReference(),
      null,
      request.binding.instructionProductHandle,
      request.binding.instructionIdentityHandle,
      target.targetKind,
      target.targetNode,
      target.targetControllerProductHandle,
      request.targetAttribute,
      request.targetProperty,
      null,
      operationKind,
      request.affectedNames,
      this.targetOperationAuthority(openReason),
      openReason,
      request.binding.sourceAddressHandle,
      this.targetOperationFieldProvenance(this.targetOperationFields(request, target, openReason), source),
    );
  }

  private sourceOperationPublication(
    handles: RuntimeControllerBindProductHandles,
    request: RuntimeBindingSourceOperationRequest,
    target: RuntimeBindingSourceOperationTarget,
    operationKind: RuntimeBindingSourceOperationKind,
    openReason: string | null,
    source: RuntimeControllerBindSourceSet,
  ): RuntimeControllerBindProductPublication<RuntimeBindingSourceOperation> {
    const operation = this.sourceOperationProduct(handles, request, target, operationKind, openReason, source);
    const claim = this.runtimeBindingProductClaim(
      `${handles.local}:runtime-binding-uses-source-operation`,
      request.binding.productHandle,
      KernelVocabulary.Binding.RuntimeBindingUsesSourceOperation.key,
      handles.productHandle,
      source,
    );
    const records = this.runtimeBindingProductRecords(
      handles,
      KernelVocabulary.Binding.SourceOperation.key,
      request.binding.identityHandle,
      request.binding.sourceAddressHandle,
      source,
      `${operationKind}:${target.targetKind}:${request.targetName}`,
      'source-operation',
      claim,
    );
    return new RuntimeControllerBindProductPublication(operation, claim, records);
  }

  private sourceOperationProduct(
    handles: RuntimeControllerBindProductHandles,
    request: RuntimeBindingSourceOperationRequest,
    target: RuntimeBindingSourceOperationTarget,
    operationKind: RuntimeBindingSourceOperationKind,
    openReason: string | null,
    source: RuntimeControllerBindSourceSet,
  ): RuntimeBindingSourceOperation {
    return new RuntimeBindingSourceOperation(
      handles.productHandle,
      handles.identityHandle,
      request.binding.toReference(),
      request.binding.instructionProductHandle,
      request.binding.instructionIdentityHandle,
      target.targetKind,
      target.targetNode,
      target.targetControllerProductHandle,
      request.targetName,
      target.targetType,
      operationKind,
      this.sourceOperationAuthority(openReason),
      openReason,
      request.binding.sourceAddressHandle,
      this.sourceOperationFieldProvenance(this.sourceOperationFields(target, openReason), source),
    );
  }

  private runtimeBindingProductClaim(
    local: string,
    bindingProductHandle: ProductHandle,
    predicateKey: ClaimPredicateKey,
    productHandle: ProductHandle,
    source: RuntimeControllerBindSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(local),
      bindingProductHandle,
      predicateKey,
      productHandle,
      source.provenanceHandle,
    );
  }

  private runtimeBindingProductRecords(
    handles: RuntimeControllerBindProductHandles,
    productKindKey: ProductKindKey,
    parentIdentityHandle: IdentityHandle,
    sourceAddressHandle: AddressHandle | null,
    source: RuntimeControllerBindSourceSet,
    identityValue: string,
    materializationSlot: string,
    claim: SemanticClaim,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        handles.identityHandle,
        productKindKey,
        parentIdentityHandle,
        sourceAddressHandle,
        identityValue,
      ),
      new MaterializedProduct(
        handles.productHandle,
        productKindKey,
        handles.identityHandle,
        sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${handles.local}:${materializationSlot}`),
        handles.identityHandle,
        [handles.productHandle],
        [claim.handle],
      ),
    ];
  }

  private targetAccessFields(
    target: RuntimeBindingTarget,
    lookup: ObserverLocatorLookupResult,
  ): readonly (RuntimeBindingTargetAccessField | null)[] {
    return [
      'binding',
      'lookup',
      'targetKind',
      target.targetNode == null ? null : 'targetNode',
      target.targetControllerProductHandle == null ? null : 'targetController',
      'targetProperty',
      'strategy',
      lookup.eventNames.length === 0 ? null : 'events',
      lookup.targetType == null ? null : 'targetType',
      lookup.propertyType == null ? null : 'propertyType',
      lookup.propertyExists == null ? null : 'propertyExists',
      lookup.isWritable == null ? null : 'isWritable',
      'isObservable',
      'authority',
      lookup.openReason == null ? null : 'openReason',
      'source',
    ];
  }

  private targetOperationFields(
    request: RuntimeBindingTargetOperationRequest,
    target: RuntimeBindingTarget,
    openReason: string | null,
  ): readonly (RuntimeBindingTargetOperationField | null)[] {
    return [
      'ownerKind',
      'binding',
      'instruction',
      'targetKind',
      target.targetNode == null ? null : 'targetNode',
      target.targetControllerProductHandle == null ? null : 'targetController',
      'targetAttribute',
      'targetProperty',
      'operationKind',
      request.affectedNames.length === 0 ? null : 'affectedNames',
      'authority',
      openReason == null ? null : 'openReason',
      'source',
    ];
  }

  private sourceOperationFields(
    target: RuntimeBindingSourceOperationTarget,
    openReason: string | null,
  ): readonly (RuntimeBindingSourceOperationField | null)[] {
    return [
      'binding',
      'instruction',
      'targetKind',
      target.targetNode == null ? null : 'targetNode',
      target.targetControllerProductHandle == null ? null : 'targetController',
      'targetName',
      target.targetType == null ? null : 'targetType',
      'operationKind',
      'authority',
      openReason == null ? null : 'openReason',
      'source',
    ];
  }

  private targetOperationAuthority(openReason: string | null): RuntimeBindingTargetOperationAuthority {
    return openReason == null
      ? RuntimeBindingTargetOperationAuthority.RuntimeBindingImplementation
      : RuntimeBindingTargetOperationAuthority.Open;
  }

  private sourceOperationAuthority(openReason: string | null): RuntimeBindingSourceOperationAuthority {
    return openReason == null
      ? RuntimeBindingSourceOperationAuthority.RuntimeBindingImplementation
      : RuntimeBindingSourceOperationAuthority.Open;
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
    if ((binding instanceof PropertyBinding || binding instanceof SpreadValueBinding) && targetController != null) {
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

  private targetAccessFieldProvenance(
    fields: readonly (RuntimeBindingTargetAccessField | null)[],
    source: RuntimeControllerBindSourceSet,
  ): readonly FieldProvenance<RuntimeBindingTargetAccessField>[] {
    return fields
      .filter((field): field is RuntimeBindingTargetAccessField => field != null)
      .map((field) => new FieldProvenance(field, source.provenanceHandle));
  }

  private targetOperationFieldProvenance(
    fields: readonly (RuntimeBindingTargetOperationField | null)[],
    source: RuntimeControllerBindSourceSet,
  ): readonly FieldProvenance<RuntimeBindingTargetOperationField>[] {
    return fields
      .filter((field): field is RuntimeBindingTargetOperationField => field != null)
      .map((field) => new FieldProvenance(field, source.provenanceHandle));
  }

  private sourceOperationFieldProvenance(
    fields: readonly (RuntimeBindingSourceOperationField | null)[],
    source: RuntimeControllerBindSourceSet,
  ): readonly FieldProvenance<RuntimeBindingSourceOperationField>[] {
    return fields
      .filter((field): field is RuntimeBindingSourceOperationField => field != null)
      .map((field) => new FieldProvenance(field, source.provenanceHandle));
  }

  private recordOpenSeam(
    local: string,
    summary: string,
    addressHandle: AddressHandle | null,
    source: RuntimeControllerBindSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
    seamKindKey: OpenSeamKindKey = KernelVocabulary.Binding.OpenTargetAccess.key,
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

  private recordsForSource(local: string): RuntimeControllerBindSourceSet {
    const evidenceHandle = this.store.handles.evidence(`runtime-controller-bind:${local}`);
    const provenanceHandle = this.store.handles.provenance(`runtime-controller-bind:${local}`);
    return new RuntimeControllerBindSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'Runtime Controller.bind materialization from rendered controller bindings and binding-owned target semantics.',
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

class RuntimeBindingSourceOperationTarget {
  constructor(
    readonly targetKind: RuntimeBindingTargetKind,
    readonly targetNode: RuntimeBindingSourceOperation['targetNode'],
    readonly targetControllerProductHandle: ProductHandle | null,
    readonly targetType: RuntimeBindingSourceOperation['targetType'],
    readonly openReason: string | null,
  ) {}

  static open(openReason: string): RuntimeBindingSourceOperationTarget {
    return new RuntimeBindingSourceOperationTarget(
      RuntimeBindingTargetKind.Unknown,
      null,
      null,
      null,
      openReason,
    );
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
