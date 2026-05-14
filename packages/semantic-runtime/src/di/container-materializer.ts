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
import {
  ContainerIdentity,
  ContainerIdentityKind,
  DiProductIdentity,
  InterfaceDiKeyIdentity,
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
  ContainerSelfResolverSlot,
} from './container-slot.js';
import {
  ResolverStrategy,
} from './resolver.js';

export class ContainerContextResolverSlotRequest {
  constructor(
    /** Interface symbol name used as the DI key identity. */
    readonly interfaceName: string,
    /** Source address for the renderer/controller operation that installed the contextual provider. */
    readonly sourceAddressHandle: AddressHandle | null = null,
  ) {}
}

export class ContainerChildMaterializationRequest {
  constructor(
    /** Store-local key for this child-container materialization. */
    readonly localKey: string,
    /** Parent runtime container frame. */
    readonly parent: Container,
    /** Source address for the renderer/controller operation that created the child. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Human-oriented trace name for this child container. */
    readonly localName: string | null = null,
    /** Contextual providers installed by the runtime hydration helper. */
    readonly contextResolvers: readonly ContainerContextResolverSlotRequest[] = [],
    /** Optional createChild configuration. Omit for runtime's default child-container path. */
    readonly configuration: ContainerConfiguration | ContainerConfigurationRequest | null = null,
  ) {}
}

export class ContainerChildMaterializationEmission {
  constructor(
    /** Child runtime container frame. */
    readonly container: Container,
    /** Built-in IContainer self resolver row installed by container construction. */
    readonly selfResolverSlot: ContainerSelfResolverSlot,
    /** Runtime contextual resolver slots installed around controller hydration. */
    readonly contextResolverSlots: readonly ContainerResolverSlot[],
    /** Kernel records for the container product and child-owned DI slots. */
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

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

/** Shared materializer for runtime-created child containers and their constructor/context slots. */
export class ContainerChildMaterializer {
  private readonly emittedIdentityHandles = new Set<IdentityHandle>();

  constructor(
    /** Hot analysis store used for handle allocation and duplicate identity checks. */
    readonly store: KernelStore,
  ) {}

  materializeChild(input: ContainerChildMaterializationRequest): ContainerChildMaterializationEmission {
    const local = `di-child-container:${input.localKey}`;
    const source = this.recordsForSource(
      local,
      'Runtime child container created from a parent controller/container boundary.',
      input.sourceAddressHandle,
    );
    const child = this.createChildContainer(input, local);
    const selfResolver = this.recordsForContainerSelfResolver(child, source.provenanceHandle);
    child.registerSelfResolver(selfResolver.slot);
    const contextResolvers = this.recordsForContextResolverSlots(child, input, local, source.provenanceHandle);
    contextResolvers.slots.forEach((slot) => child.registerResolver(slot));

    const records: KernelStoreRecord[] = [
      ...source.records,
      ...this.recordsForChildContainer(input, local, source, child),
      ...selfResolver.records,
      ...contextResolvers.records,
    ];

    return new ContainerChildMaterializationEmission(
      child,
      selfResolver.slot,
      contextResolvers.slots,
      records,
    );
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
        [],
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
    input.contextResolvers.forEach((contextResolver, index) => {
      const slot = this.recordsForContextResolverSlot(
        child,
        contextResolver,
        `${local}:context:${index}`,
        provenanceHandle,
      );
      records.push(...slot.records);
      contextResolverSlots.push(slot.slot);
    });
    return new ContainerSlotEmissionSet(records, contextResolverSlots);
  }

  private recordsForContainerSelfResolver(
    container: Container,
    provenanceHandle: ProvenanceHandle,
  ): ContainerSlotEmission<ContainerSelfResolverSlot> {
    const local = `di-self-resolver:${container.productHandle}`;
    const records: KernelStoreRecord[] = [];
    const keyIdentityHandle = this.store.handles.identity('di-key:interface:IContainer');
    this.emitInterfaceKeyIdentity(records, keyIdentityHandle, 'IContainer', container.sourceAddressHandle);

    const handles = this.containerSlotProductHandles(local, keyIdentityHandle);
    const slot = this.containerSelfResolverSlot(container, handles);
    records.push(
      ...this.recordsForContainerSlotProduct(
        local,
        container,
        handles,
        KernelVocabulary.Di.SelfResolverSlot.key,
        container.sourceAddressHandle,
        provenanceHandle,
      ),
    );
    return new ContainerSlotEmission(records, slot);
  }

  private containerSelfResolverSlot(
    container: Container,
    handles: ContainerSlotProductHandles,
  ): ContainerSelfResolverSlot {
    return new ContainerSelfResolverSlot(
      handles.productHandle,
      container.toReference(),
      handles.keyIdentityHandle,
      container.sourceAddressHandle,
      [],
    );
  }

  private recordsForContextResolverSlot(
    container: Container,
    input: ContainerContextResolverSlotRequest,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): ContainerSlotEmission<ContainerResolverSlot> {
    const records: KernelStoreRecord[] = [];
    const keyIdentityHandle = this.store.handles.identity(`di-key:interface:${input.interfaceName}`);
    this.emitInterfaceKeyIdentity(records, keyIdentityHandle, input.interfaceName, input.sourceAddressHandle);

    const handles = this.containerSlotProductHandles(local, keyIdentityHandle);
    const slot = this.contextResolverSlot(container, input, handles);
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
    handles: ContainerSlotProductHandles,
  ): ContainerResolverSlot {
    return new ContainerResolverSlot(
      handles.productHandle,
      container.toReference(),
      handles.keyIdentityHandle,
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

  private emitInterfaceKeyIdentity(
    records: KernelStoreRecord[],
    handle: IdentityHandle,
    interfaceName: string,
    addressHandle: AddressHandle | null,
  ): void {
    if (this.emittedIdentityHandles.has(handle) || this.store.readIdentity(handle) != null) {
      return;
    }
    this.emittedIdentityHandles.add(handle);
    records.push(new InterfaceDiKeyIdentity(
      handle,
      interfaceName,
      null,
      addressHandle,
    ));
  }
}
