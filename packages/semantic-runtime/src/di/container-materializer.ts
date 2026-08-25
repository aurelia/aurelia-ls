import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  ClaimHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type { RegistrationValueReference } from '../registration/registration-reference.js';
import {
  ContainerIdentity,
  ContainerIdentityKind,
  DiProductIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  type KernelStore,
  type KernelStoreReadView,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type ProductKindKey,
} from '../kernel/vocabulary.js';
import {
  Container,
} from './container.js';
import {
  ContainerConfiguration,
  type ContainerConfigurationRequest,
} from './container-configuration.js';
import {
  ContainerResolverSlot,
  ContainerResourceSlot,
  ContainerSelfResolverSlot,
} from './container-slot.js';
import {
  ResolverStrategy,
} from './resolver.js';
import { DiKeyIdentityEmitter } from './di-key-identity-emitter.js';
import { FrameworkIntrinsicDiKey } from './framework-intrinsic-di-key.js';
import {
  DiContainerSelfResolverPublicationMaterializer,
  DiInstanceProviderPublicationMaterializer,
  DiResourceSlotPublicationMaterializer,
} from './world-publication.js';

export interface ContainerContextResolverSlotInput {
    /** Interface symbol name used as the DI key identity. */
    readonly interfaceName: FrameworkIntrinsicDiKey;
    /** Source address for the renderer/controller operation that installed the contextual provider. */
    readonly sourceAddressHandle?: AddressHandle | null;
    /** Exact prepared contextual value, when the semantic model owns one. */
    readonly instance?: RegistrationValueReference | null;
    /** Runtime product identity that owns the contextual provider. */
    readonly ownerIdentityHandle?: IdentityHandle | null;
}

export class ContainerContextResolverSlotRequest {
  readonly interfaceName: FrameworkIntrinsicDiKey;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly instance: RegistrationValueReference | null;
  readonly ownerIdentityHandle: IdentityHandle | null;

  constructor(input: ContainerContextResolverSlotInput) {
    this.interfaceName = input.interfaceName;
    this.sourceAddressHandle = input.sourceAddressHandle ?? null;
    this.instance = input.instance ?? null;
    this.ownerIdentityHandle = input.ownerIdentityHandle ?? null;
  }
}

export class ContainerRootMaterializationRequest {
  constructor(
    /** Store-local key for the source-created root container. */
    readonly localKey: string,
    /** Source address for the app boundary or `createContainer(...)` expression. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Human-oriented source name for traces. */
    readonly localName: string | null,
    /** Runtime-shaped root-container configuration. */
    readonly configuration: ContainerConfiguration | ContainerConfigurationRequest | null = null,
  ) {}
}

/** Shared root-container construction and publication used by app facades and direct `createContainer(...)` calls. */
export class ContainerRootMaterializer {
  private readonly selfResolvers: DiContainerSelfResolverPublicationMaterializer;

  constructor(
    private readonly store: KernelStore,
    records: KernelStoreReadView,
  ) {
    this.selfResolvers = new DiContainerSelfResolverPublicationMaterializer(
      store,
      new DiKeyIdentityEmitter(records),
    );
  }

  create(input: ContainerRootMaterializationRequest): Container {
    const local = `di-container:${input.localKey}`;
    return new Container(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      ContainerIdentityKind.Root,
      null,
      null,
      input.sourceAddressHandle,
      [],
      ContainerConfiguration.from(input.configuration),
    );
  }

  recordsFor(
    input: ContainerRootMaterializationRequest,
    container: Container,
    provenanceHandle: ProvenanceHandle,
    claimHandles: readonly ClaimHandle[] = [],
  ): readonly KernelStoreRecord[] {
    const local = `di-container:${input.localKey}`;
    const selfResolver = this.selfResolvers.recordsForContainerSelfResolver(container);
    container.registerSelfResolver(selfResolver.product);
    return [
      new ContainerIdentity(
        container.identityHandle,
        ContainerIdentityKind.Root,
        null,
        null,
        input.sourceAddressHandle,
        input.localName,
      ),
      new MaterializedProduct(
        container.productHandle,
        KernelVocabulary.Di.Container.key,
        container.identityHandle,
        input.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(local),
        container.identityHandle,
        [container.productHandle],
        claimHandles,
      ),
      ...selfResolver.records,
    ];
  }
}

export interface ContainerChildMaterializationInput {
    /** Store-local key for this child-container materialization. */
    readonly localKey: string;
    /** Parent runtime container frame. */
    readonly parent: Container;
    /** Source address for the renderer/controller operation that created the child. */
    readonly sourceAddressHandle: AddressHandle | null;
    /** Human-oriented trace name for this child container. */
    readonly localName?: string | null;
    /** Contextual providers installed by the runtime hydration helper. */
    readonly contextResolvers?: readonly ContainerContextResolverSlotRequest[];
    /** Optional createChild configuration. Omit for runtime's default child-container path. */
    readonly configuration?: ContainerConfiguration | ContainerConfigurationRequest | null;
    /**
     * Record detail policy for framework contextual resolver slots.
     *
     * Some inquiry profiles need these slots modeled for DI lookup but do not need every renderer-created contextual
     * provider published as kernel products up front. Detailed topology lanes can still request full publication.
     */
    readonly contextResolverRecordPolicy?: ContainerContextResolverRecordPolicy;
    /**
     * Explicit source for runtime `useResources(...)`.
     *
     * This is independent from configuration-driven parent-resource inheritance. Supplying both is invalid because
     * the framework uses them as alternative child-container construction paths.
     */
    readonly resourceImportSource?: Container | null;
}

export class ContainerChildMaterializationRequest {
  readonly localKey: string;
  readonly parent: Container;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly localName: string | null;
  readonly contextResolvers: readonly ContainerContextResolverSlotRequest[];
  readonly configuration: ContainerConfiguration | ContainerConfigurationRequest | null;
  readonly contextResolverRecordPolicy: ContainerContextResolverRecordPolicy;
  readonly resourceImportSource: Container | null;

  constructor(input: ContainerChildMaterializationInput) {
    this.localKey = input.localKey;
    this.parent = input.parent;
    this.sourceAddressHandle = input.sourceAddressHandle;
    this.localName = input.localName ?? null;
    this.contextResolvers = input.contextResolvers ?? [];
    this.configuration = input.configuration ?? null;
    this.contextResolverRecordPolicy = input.contextResolverRecordPolicy
      ?? ContainerContextResolverRecordPolicy.PublishAll;
    this.resourceImportSource = input.resourceImportSource ?? null;
  }
}

export const enum ContainerContextResolverRecordPolicy {
  /** Publish each contextual resolver slot as DI key identity, resolver-slot product, claims, and materialization. */
  PublishAll = 'publish-all',
  /** Keep slots candidate-local under the enclosing container computation and omit duplicate kernel graph rows. */
  ModelOnly = 'model-only',
}

export class ContainerChildMaterializationEmission {
  private readonly mutableContextResolverSlots: ContainerResolverSlot[];

  constructor(
    /** Child runtime container frame. */
    readonly container: Container,
    /** Built-in IContainer self resolver row installed by container construction. */
    readonly selfResolverSlot: ContainerSelfResolverSlot,
    /** Runtime contextual resolver slots installed around controller hydration. */
    contextResolverSlots: readonly ContainerResolverSlot[],
    /** Child-owned resource rows copied by parent inheritance or an explicit runtime `useResources(...)` call. */
    readonly resourceSlots: readonly ContainerResourceSlot[],
    /** Kernel records for the container product and child-owned DI slots. */
    readonly records: readonly KernelStoreRecord[],
  ) {
    this.mutableContextResolverSlots = [...contextResolverSlots];
  }

  get contextResolverSlots(): readonly ContainerResolverSlot[] {
    return [...this.mutableContextResolverSlots];
  }

  recordInstalledContextResolver(slot: ContainerResolverSlot): void {
    this.mutableContextResolverSlots.push(slot);
  }
}

export class ContainerContextResolverMaterializationEmission {
  constructor(
    readonly slot: ContainerResolverSlot,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

export type ContainerChildMaterializationPhaseName =
  | 'source'
  | 'container'
  | 'self-resolver'
  | 'resource-imports'
  | 'context-resolvers'
  | 'records';

export type ContainerChildMaterializationMeasure = <TValue>(
  name: ContainerChildMaterializationPhaseName,
  read: () => TValue,
) => TValue;

class ContainerMaterializationSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class ContainerSlotEmission<TSlot> {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly slot: TSlot,
  ) {}
}

class ContainerSlotEmissionSet<TSlot> {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly slots: readonly TSlot[],
  ) {}
}

class ContainerSlotProductHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly keyIdentityHandle: IdentityHandle,
    readonly providesKeyClaimHandle: ClaimHandle,
    readonly producedClaimHandle: ClaimHandle,
  ) {}

  get claimHandles(): readonly ClaimHandle[] {
    return [
      this.providesKeyClaimHandle,
      this.producedClaimHandle,
    ];
  }
}

const unmeasuredContainerChildMaterialization: ContainerChildMaterializationMeasure = (_name, read) => read();

/** Shared materializer for runtime-created child containers and their constructor/context slots. */
export class ContainerChildMaterializer {
  private readonly keyIdentityEmitter: DiKeyIdentityEmitter;
  private readonly selfResolvers: DiContainerSelfResolverPublicationMaterializer;
  private readonly instanceProviders: DiInstanceProviderPublicationMaterializer;
  private readonly resourceSlots: DiResourceSlotPublicationMaterializer;

  constructor(
    /** Hot analysis store used for handle allocation and duplicate identity checks. */
    readonly store: KernelStore,
    /** Current publication view, including records staged earlier in the same generation. */
    records: KernelStoreReadView,
  ) {
    this.keyIdentityEmitter = new DiKeyIdentityEmitter(records);
    this.selfResolvers = new DiContainerSelfResolverPublicationMaterializer(store, this.keyIdentityEmitter);
    this.instanceProviders = new DiInstanceProviderPublicationMaterializer(store);
    this.resourceSlots = new DiResourceSlotPublicationMaterializer(store, this.keyIdentityEmitter);
  }

  materializeChild(
    input: ContainerChildMaterializationRequest,
    measure: ContainerChildMaterializationMeasure = unmeasuredContainerChildMaterialization,
  ): ContainerChildMaterializationEmission {
    const child = measure('container', () => this.create(input));
    return this.recordsFor(input, child, [], measure);
  }

  /** Install one later framework contextual provider into an already-created child container. */
  installContextResolver(
    child: ContainerChildMaterializationEmission,
    localKey: string,
    request: ContainerContextResolverSlotRequest,
    provenanceHandle: ProvenanceHandle,
    recordPolicy: ContainerContextResolverRecordPolicy = ContainerContextResolverRecordPolicy.PublishAll,
  ): ContainerContextResolverMaterializationEmission {
    const emission = this.recordsForContextResolverSlot(
      child.container,
      request,
      `di-child-container:${localKey}:context`,
      provenanceHandle,
      recordPolicy === ContainerContextResolverRecordPolicy.PublishAll,
    );
    child.container.registerResolver(emission.slot);
    child.recordInstalledContextResolver(emission.slot);
    return new ContainerContextResolverMaterializationEmission(emission.slot, emission.records);
  }

  /** Create a child frame before its causal claims are published. */
  create(input: ContainerChildMaterializationRequest): Container {
    const local = `di-child-container:${input.localKey}`;
    return this.createChildContainer(input, local);
  }

  /** Publish one already-created child after its causal claims are known. */
  recordsFor(
    input: ContainerChildMaterializationRequest,
    child: Container,
    claimHandles: readonly ClaimHandle[],
    measure: ContainerChildMaterializationMeasure = unmeasuredContainerChildMaterialization,
  ): ContainerChildMaterializationEmission {
    const local = `di-child-container:${input.localKey}`;
    const source = measure('source', () => this.recordsForSource(
      local,
      'Runtime child container created from a parent controller/container boundary.',
      input.sourceAddressHandle,
    ));
    const selfResolver = measure('self-resolver', () =>
      this.selfResolvers.recordsForContainerSelfResolver(child)
    );
    child.registerSelfResolver(selfResolver.product);
    const resourceImports = measure('resource-imports', () =>
      this.recordsForImportedResourceSlots(child, input, source.provenanceHandle)
    );
    const contextResolvers = measure('context-resolvers', () =>
      this.recordsForContextResolverSlots(child, input, local, source.provenanceHandle)
    );
    contextResolvers.slots.forEach((slot) => child.registerResolver(slot));

    const records: KernelStoreRecord[] = measure('records', () => [
      ...source.records,
      ...this.recordsForChildContainer(input, local, source, child, claimHandles),
      ...selfResolver.records,
      ...resourceImports.records,
      ...contextResolvers.records,
    ]);

    return new ContainerChildMaterializationEmission(
      child,
      selfResolver.product,
      contextResolvers.slots,
      resourceImports.slots,
      records,
    );
  }

  private recordsForImportedResourceSlots(
    child: Container,
    input: ContainerChildMaterializationRequest,
    provenanceHandle: ProvenanceHandle,
  ): ContainerSlotEmissionSet<ContainerResourceSlot> {
    const inheritsParentResources = child.readConfiguration().inheritParentResources;
    if (inheritsParentResources && input.resourceImportSource != null) {
      throw new Error(
        `Child container '${child.productHandle}' cannot combine parent-resource inheritance with an explicit `
        + 'useResources(...) source.',
      );
    }
    const sourceContainer = inheritsParentResources
      ? input.parent
      : input.resourceImportSource;
    if (sourceContainer == null) {
      return new ContainerSlotEmissionSet([], []);
    }

    const records: KernelStoreRecord[] = [];
    const slots = child.useResources(sourceContainer, (target, sourceSlot) => {
      const publication = this.resourceSlots.recordsForImportedResourceSlot(
        target,
        sourceSlot,
        input.sourceAddressHandle,
        provenanceHandle,
      );
      records.push(...publication.records);
      return publication.slot;
    });
    return new ContainerSlotEmissionSet(records, slots);
  }

  private createChildContainer(
    input: ContainerChildMaterializationRequest,
    local: string,
  ): Container {
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const parentReference = input.parent.toReference();
    const rootReference = input.parent.root.toReference();
    return input.parent.createChild(
      (parent, configuration) => new Container(
        productHandle,
        identityHandle,
        ContainerIdentityKind.Child,
        parentReference,
        rootReference,
        input.sourceAddressHandle,
        [],
        configuration,
        parent,
      ),
      input.configuration ?? undefined,
    );
  }

  private recordsForChildContainer(
    input: ContainerChildMaterializationRequest,
    local: string,
    source: ContainerMaterializationSourceSet,
    child: Container,
    claimHandles: readonly ClaimHandle[],
  ): readonly KernelStoreRecord[] {
    return [
      new ContainerIdentity(
        child.identityHandle,
        ContainerIdentityKind.Child,
        input.parent.identityHandle,
        input.parent.root.identityHandle,
        input.sourceAddressHandle,
        input.localName,
      ),
      new MaterializedProduct(
        child.productHandle,
        KernelVocabulary.Di.Container.key,
        child.identityHandle,
        input.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(local),
        child.identityHandle,
        [child.productHandle],
        claimHandles,
      ),
    ];
  }

  private recordsForContextResolverSlots(
    child: Container,
    input: ContainerChildMaterializationRequest,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): ContainerSlotEmissionSet<ContainerResolverSlot> {
    const records: KernelStoreRecord[] = [];
    const contextResolverSlots: ContainerResolverSlot[] = [];
    const publishRecords = input.contextResolverRecordPolicy === ContainerContextResolverRecordPolicy.PublishAll;
    input.contextResolvers.forEach((contextResolver, index) => {
      const slot = this.recordsForContextResolverSlot(
        child,
        contextResolver,
        `${local}:context:${index}`,
        provenanceHandle,
        publishRecords,
      );
      records.push(...slot.records);
      contextResolverSlots.push(slot.slot);
    });
    return new ContainerSlotEmissionSet(records, contextResolverSlots);
  }

  private recordsForContextResolverSlot(
    container: Container,
    input: ContainerContextResolverSlotRequest,
    local: string,
    provenanceHandle: ProvenanceHandle,
    publishRecords: boolean,
  ): ContainerSlotEmission<ContainerResolverSlot> {
    const records: KernelStoreRecord[] = [];
    const keyIdentityHandle = this.keyIdentityEmitter.interfaceKeyIdentityHandle(input.interfaceName);
    if (input.instance != null) {
      const ownerIdentityHandle = input.ownerIdentityHandle ?? input.instance.identityHandle;
      if (ownerIdentityHandle == null) {
        throw new Error(
          `Contextual provider '${input.interfaceName}' needs an owning identity for its prepared instance.`,
        );
      }
      if (publishRecords) {
        this.keyIdentityEmitter.emitInterfaceKeyIdentity(
          records,
          keyIdentityHandle,
          input.interfaceName,
          null,
          input.sourceAddressHandle,
        );
      }
      const provider = this.instanceProviders.prepare(
        local,
        container,
        ownerIdentityHandle,
        keyIdentityHandle,
        input.interfaceName,
        input.instance,
        null,
        input.sourceAddressHandle,
      );
      if (publishRecords) {
        records.push(...this.instanceProviders.recordsForContextual(provider, provenanceHandle));
      }
      return new ContainerSlotEmission(records, provider.resolverSlot);
    }
    if (!publishRecords) {
      return new ContainerSlotEmission(
        records,
        this.contextResolverSlot(
          container,
          input,
          this.store.handles.product(local),
          keyIdentityHandle,
        ),
      );
    }
    this.keyIdentityEmitter.emitInterfaceKeyIdentity(records, keyIdentityHandle, input.interfaceName, null, input.sourceAddressHandle);

    const handles = this.containerSlotProductHandles(local, keyIdentityHandle);
    const slot = this.contextResolverSlot(container, input, handles.productHandle, handles.keyIdentityHandle);
    records.push(
      ...this.recordsForContainerSlotProduct(
        local,
        container,
        handles,
        KernelVocabulary.Di.ResolverSlot.key,
        input.sourceAddressHandle,
        provenanceHandle,
      ),
    );
    return new ContainerSlotEmission(records, slot);
  }

  private contextResolverSlot(
    container: Container,
    input: ContainerContextResolverSlotRequest,
    productHandle: ProductHandle,
    keyIdentityHandle: IdentityHandle,
  ): ContainerResolverSlot {
    return new ContainerResolverSlot(
      productHandle,
      container.toReference(),
      keyIdentityHandle,
      null,
      null,
      ResolverStrategy.instance,
      false,
      input.sourceAddressHandle,
      [],
    );
  }

  private containerSlotProductHandles(
    local: string,
    keyIdentityHandle: IdentityHandle,
  ): ContainerSlotProductHandles {
    return new ContainerSlotProductHandles(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      keyIdentityHandle,
      this.store.handles.claim(`${local}:provides-key`),
      this.store.handles.claim(`${local}:container-produces-product`),
    );
  }

  private recordsForContainerSlotProduct(
    local: string,
    container: Container,
    handles: ContainerSlotProductHandles,
    productKind: ProductKindKey,
    sourceAddressHandle: AddressHandle | null,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return [
      this.containerSlotIdentity(container, handles, productKind, sourceAddressHandle),
      ...this.containerSlotClaims(container, handles, provenanceHandle),
      this.containerSlotProduct(handles, productKind, sourceAddressHandle, provenanceHandle),
      this.containerSlotMaterialization(local, handles),
    ];
  }

  private containerSlotIdentity(
    container: Container,
    handles: ContainerSlotProductHandles,
    productKind: ProductKindKey,
    sourceAddressHandle: AddressHandle | null,
  ): DiProductIdentity {
    return new DiProductIdentity(
      handles.identityHandle,
      productKind,
      container.identityHandle,
      handles.keyIdentityHandle,
      sourceAddressHandle,
    );
  }

  private containerSlotClaims(
    container: Container,
    handles: ContainerSlotProductHandles,
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    return [
      new SemanticClaim(
        handles.providesKeyClaimHandle,
        handles.productHandle,
        KernelVocabulary.Di.ProvidesKey.key,
        handles.keyIdentityHandle,
        provenanceHandle,
      ),
      new SemanticClaim(
        handles.producedClaimHandle,
        container.productHandle,
        KernelVocabulary.Di.ProducesProduct.key,
        handles.productHandle,
        provenanceHandle,
      ),
    ];
  }

  private containerSlotProduct(
    handles: ContainerSlotProductHandles,
    productKind: ProductKindKey,
    sourceAddressHandle: AddressHandle | null,
    provenanceHandle: ProvenanceHandle,
  ): MaterializedProduct {
    return new MaterializedProduct(
      handles.productHandle,
      productKind,
      handles.identityHandle,
      sourceAddressHandle,
      provenanceHandle,
    );
  }

  private containerSlotMaterialization(
    local: string,
    handles: ContainerSlotProductHandles,
  ): MaterializationRecord {
    return new MaterializationRecord(
      this.store.handles.materialization(local),
      handles.identityHandle,
      [handles.productHandle],
      handles.claimHandles,
    );
  }

  private recordsForSource(
    local: string,
    summary: string,
    addressHandle: AddressHandle | null,
  ): ContainerMaterializationSourceSet {
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    return new ContainerMaterializationSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.Configuration],
          summary,
          addressHandle,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          [evidenceHandle],
        ),
      ],
      provenanceHandle,
    );
  }

}
