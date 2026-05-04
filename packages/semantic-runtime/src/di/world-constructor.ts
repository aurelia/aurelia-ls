import { SemanticClaim } from '../kernel/claim.js';
import {
  OpenSeam,
} from '../kernel/open-seam.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  ClaimHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  DiProductIdentity,
  InterfaceDiKeyIdentity,
  ResourceDiKeyIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  compactFieldProvenance,
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
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import type { ConfigurationStep } from '../configuration/configuration-sequence.js';
import type {
  BuiltInResourceEmission,
  ConfiguredBuiltInResourceCatalogEmission,
} from '../resources/built-in-resource-catalog-materializer.js';
import {
  runtimeResourceKeyForKind,
  ResourceDefinitionKind,
} from '../resources/resource-kind.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import {
  isResolverRegistrationStrategy,
  OpenRegistrationAdmission,
  ParameterizedRegistryAdmission,
  FrameworkRegistrationAdmission,
  ResourceRegistrationAdmission,
  RegistryRegistrationAdmission,
  RegistrationKeyRole,
  RegistrationStrategy,
  ResolverRegistrationAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import type { Container } from './container.js';
import { ContainerRegistrationOperation, type ContainerRegistrationField } from './container-registration.js';
import {
  ContainerResourceSlot,
  ContainerResolverSlot,
  ContainerSelfResolverSlot,
  type ContainerSlotField,
} from './container-slot.js';
import { Resolver, type ResolverField } from './resolver.js';
import {
  ParameterizedRegistry,
  RegistryRegistrationState,
  RegistryValue,
  type RegistryField,
} from './registry.js';
import { DiWorldConstructionEmission } from './world-construction.js';

class DiSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class DiProductEmission<TProduct> {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly product: TProduct,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly openSeams: readonly OpenSeam[] = [],
  ) {}
}

class DiRegistrationOperationEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly product: ContainerRegistrationOperation,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly acceptRegistrationClaimHandle: ClaimHandle,
  ) {}
}

class DiClaimEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly handles: readonly ClaimHandle[],
  ) {}
}

class DiResourceSlotEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly slots: readonly ContainerResourceSlot[],
    readonly claimHandles: readonly ClaimHandle[],
    readonly openSeams: readonly OpenSeam[] = [],
  ) {}
}

/** Spends configuration-owned registration products into abstract DI container state. */
export class DiWorldConstructor {
  private readonly emittedIdentityHandles = new Set<IdentityHandle>();

  constructor(
    /** Hot analysis store that receives DI world-construction records. */
    readonly store: KernelStore,
  ) {}

  construct(
    configuration: ConfigurationKernelEmission,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null = null,
  ): DiWorldConstructionEmission {
    this.emittedIdentityHandles.clear();

    const records: KernelStoreRecord[] = [];
    const registrationOperations: ContainerRegistrationOperation[] = [];
    const resolvers: Resolver[] = [];
    const registries: RegistryValue[] = [];
    const parameterizedRegistries: ParameterizedRegistry[] = [];
    const resolverSlots: ContainerResolverSlot[] = [];
    const selfResolverSlots: ContainerSelfResolverSlot[] = [];
    const resourceSlots: ContainerResourceSlot[] = [];
    const openSeams: OpenSeam[] = [];

    const containersByProduct = new Map<ProductHandle, Container>();
    for (const container of configuration.containers) {
      containersByProduct.set(container.productHandle, container);
      const selfResolver = this.recordsForContainerSelfResolver(container);
      records.push(...selfResolver.records);
      selfResolverSlots.push(selfResolver.product);
      container.registerSelfResolver(selfResolver.product);
    }

    const aureliaContainerByProduct = new Map<ProductHandle, Container>();
    for (const aurelia of configuration.aurelias) {
      if (aurelia.container.productHandle == null) {
        continue;
      }
      const container = containersByProduct.get(aurelia.container.productHandle);
      if (container != null) {
        aureliaContainerByProduct.set(aurelia.productHandle, container);
      }
    }

    const containerBySequenceProduct = new Map<ProductHandle, Container>();
    for (const sequence of configuration.sequences) {
      if (sequence.aurelia?.productHandle == null) {
        continue;
      }
      const container = aureliaContainerByProduct.get(sequence.aurelia.productHandle);
      if (container != null) {
        containerBySequenceProduct.set(sequence.productHandle, container);
      }
    }

    const admissionsByProduct = new Map<ProductHandle, RegistrationAdmissionProduct>();
    for (const admission of configuration.registrationAdmissions) {
      admissionsByProduct.set(admission.productHandle, admission);
    }

    for (const step of configuration.steps) {
      if (step.registrationAdmissionProductHandles.length === 0) {
        continue;
      }

      const container = this.containerForStep(step, containerBySequenceProduct);
      if (container == null) {
        const seam = this.recordsForOpenSeam(
          `di-open-container:${step.productHandle}`,
          KernelVocabulary.Di.OpenRegistrationSpending.key,
          'Configuration step admitted registrations, but DI world construction could not identify the receiving container.',
          step.sourceAddressHandle,
        );
        records.push(...seam.records);
        openSeams.push(seam.seam);
        continue;
      }

      for (const admissionProductHandle of step.registrationAdmissionProductHandles) {
        const admission = admissionsByProduct.get(admissionProductHandle);
        if (admission == null) {
          const seam = this.recordsForOpenSeam(
            `di-open-admission:${step.productHandle}:${admissionProductHandle}`,
            KernelVocabulary.Di.OpenRegistrationSpending.key,
            'Configuration step referenced a registration admission product that was not present in the configuration emission.',
            step.sourceAddressHandle,
          );
          records.push(...seam.records);
          openSeams.push(seam.seam);
          continue;
        }

        const spent = this.recordsForRegistrationSpending(container, step, admission, configuredResources, resourceDefinitions);
        records.push(...spent.records);
        registrationOperations.push(spent.operation);
        resolvers.push(...spent.resolvers);
        registries.push(...spent.registries);
        parameterizedRegistries.push(...spent.parameterizedRegistries);
        resolverSlots.push(...spent.resolverSlots);
        resourceSlots.push(...spent.resourceSlots);
        openSeams.push(...spent.openSeams);
      }
    }

    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'di-world-construction'));
    }

    return new DiWorldConstructionEmission(
      configuration.containers,
      registrationOperations,
      resolvers,
      registries,
      parameterizedRegistries,
      resolverSlots,
      selfResolverSlots,
      resourceSlots,
      openSeams,
      records,
    );
  }

  private containerForStep(
    step: ConfigurationStep,
    containerBySequenceProduct: ReadonlyMap<ProductHandle, Container>,
  ): Container | null {
    return step.sequence?.productHandle == null
      ? null
      : containerBySequenceProduct.get(step.sequence.productHandle) ?? null;
  }

  private recordsForRegistrationSpending(
    container: Container,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly operation: ContainerRegistrationOperation;
    readonly resolvers: readonly Resolver[];
    readonly registries: readonly RegistryValue[];
    readonly parameterizedRegistries: readonly ParameterizedRegistry[];
    readonly resolverSlots: readonly ContainerResolverSlot[];
    readonly resourceSlots: readonly ContainerResourceSlot[];
    readonly openSeams: readonly OpenSeam[];
  } {
    const records: KernelStoreRecord[] = [];
    const resolvers: Resolver[] = [];
    const registries: RegistryValue[] = [];
    const parameterizedRegistries: ParameterizedRegistry[] = [];
    const resolverSlots: ContainerResolverSlot[] = [];
    const resourceSlots: ContainerResourceSlot[] = [];
    const openSeams: OpenSeam[] = [];
    const local = `di-registration:${step.productHandle}:${admission.productHandle}`;
    const source = this.recordsForSource(
      `${local}:source`,
      'Configuration-owned registration admission spent into DI world construction.',
      step.sourceAddressHandle ?? admission.sourceAddressHandle,
    );
    records.push(...source.records);

    const operation = this.operationForAdmission(container, admission, local, source.provenanceHandle);
    records.push(...operation.records);
    container.register(operation.product);
    const operationMaterializationClaimHandles = [operation.acceptRegistrationClaimHandle];

    if (admission instanceof OpenRegistrationAdmission) {
      const seam = this.recordsForOpenSeam(
        `${local}:open-admission`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        summaryForOpenRegistrationAdmission(admission),
        admission.sourceAddressHandle,
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
    } else if (admission instanceof ResolverRegistrationAdmission) {
      const emission = this.recordsForResolverAdmission(container, admission, local, source.provenanceHandle);
      records.push(...emission.records);
      resolvers.push(...emission.resolvers);
      resolverSlots.push(...emission.resolverSlots);
      openSeams.push(...emission.openSeams);
      const productClaims = this.recordsForOperationProductClaims(
        `${local}:resolver-products`,
        operation.product.productHandle,
        [
          ...emission.resolvers.map((resolver) => resolver.productHandle),
          ...emission.resolverSlots.map((slot) => slot.productHandle),
        ],
        source.provenanceHandle,
      );
      records.push(...productClaims.records);
      operationMaterializationClaimHandles.push(...productClaims.handles);
      for (const slot of emission.resolverSlots) {
        container.registerResolver(slot);
      }
    } else if (admission instanceof ParameterizedRegistryAdmission) {
      const emission = this.recordsForParameterizedRegistry(
        container,
        admission,
        local,
        source.provenanceHandle,
      );
      records.push(...emission.records);
      if (emission.registry != null) {
        parameterizedRegistries.push(emission.registry);
        const productClaims = this.recordsForOperationProductClaims(
          `${local}:parameterized-registry-products`,
          operation.product.productHandle,
          [emission.registry.productHandle],
          source.provenanceHandle,
        );
        records.push(...productClaims.records);
        operationMaterializationClaimHandles.push(...productClaims.handles);
      }
      openSeams.push(...emission.openSeams);
    } else if (admission instanceof RegistryRegistrationAdmission) {
      const emission = this.recordsForRegistry(
        container,
        admission,
        local,
        source.provenanceHandle,
      );
      records.push(...emission.records);
      registries.push(emission.registry);
      const slotEmission = this.recordsForConfiguredResourceSlots(
        container,
        admission,
        configuredResources,
        `${local}:registry-resources`,
        source.provenanceHandle,
      );
      const slots = slotEmission.slots;
      records.push(...slotEmission.records);
      resourceSlots.push(...slots);
      for (const slot of slots) {
        container.registerResource(slot);
      }
      const productClaims = this.recordsForOperationProductClaims(
        `${local}:registry-products`,
        operation.product.productHandle,
        [
          emission.registry.productHandle,
          ...slots.map((slot) => slot.productHandle),
        ],
        source.provenanceHandle,
      );
      records.push(...productClaims.records);
      operationMaterializationClaimHandles.push(...productClaims.handles);
      openSeams.push(...emission.openSeams);
    } else if (admission instanceof ResourceRegistrationAdmission) {
      const slotEmission = this.recordsForResourceAdmission(
        container,
        admission,
        resourceDefinitions,
        `${local}:resource`,
        source.provenanceHandle,
      );
      records.push(...slotEmission.records);
      resourceSlots.push(...slotEmission.slots);
      for (const slot of slotEmission.slots) {
        container.registerResource(slot);
      }
      const productClaims = this.recordsForOperationProductClaims(
        `${local}:resource-products`,
        operation.product.productHandle,
        slotEmission.slots.map((slot) => slot.productHandle),
        source.provenanceHandle,
      );
      records.push(...productClaims.records);
      operationMaterializationClaimHandles.push(...productClaims.handles);
      openSeams.push(...slotEmission.openSeams);
    } else if (admission instanceof FrameworkRegistrationAdmission) {
      const slotEmission = this.recordsForConfiguredResourceSlots(
        container,
        admission,
        configuredResources,
        `${local}:framework-resources`,
        source.provenanceHandle,
      );
      const slots = slotEmission.slots;
      records.push(...slotEmission.records);
      resourceSlots.push(...slots);
      for (const slot of slots) {
        container.registerResource(slot);
      }
      const productClaims = this.recordsForOperationProductClaims(
        `${local}:framework-resource-products`,
        operation.product.productHandle,
        slots.map((slot) => slot.productHandle),
        source.provenanceHandle,
      );
      records.push(...productClaims.records);
      operationMaterializationClaimHandles.push(...productClaims.handles);

      const seam = this.recordsForOpenSeam(
        `${local}:framework-registration-open`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        summaryForFrameworkRegistrationOpen(admission.frameworkKind),
        admission.sourceAddressHandle,
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
    }
    records.push(...this.recordsForOperationEnvelope(
      local,
      operation,
      operationMaterializationClaimHandles,
      openSeams.map((seam) => seam.handle),
      source.provenanceHandle,
    ));

    return {
      records,
      operation: operation.product,
      resolvers,
      registries,
      parameterizedRegistries,
      resolverSlots,
      resourceSlots,
      openSeams,
    };
  }

  private operationForAdmission(
    container: Container,
    admission: RegistrationAdmissionProduct,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiRegistrationOperationEmission {
    const productHandle = this.store.handles.product(`${local}:operation`);
    const identityHandle = this.store.handles.identity(`${local}:operation`);
    const claimHandle = this.store.handles.claim(`${local}:container-accepts-registration`);
    const operation = new ContainerRegistrationOperation(
      productHandle,
      identityHandle,
      container.toReference(),
      admission.productHandle,
      admission.sourceAddressHandle,
      admission.sourceAddressHandle ?? container.sourceAddressHandle,
      compactFieldProvenance<ContainerRegistrationField>([
        new FieldProvenance('container', provenanceHandle),
        new FieldProvenance('admission', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );
    const records: KernelStoreRecord[] = [
      new DiProductIdentity(
        identityHandle,
        KernelVocabulary.Di.ContainerRegistration.key,
        container.identityHandle,
        admission.identityHandle,
        operation.sourceAddressHandle,
      ),
      new SemanticClaim(
        claimHandle,
        container.productHandle,
        KernelVocabulary.Di.AcceptsRegistration.key,
        admission.productHandle,
        provenanceHandle,
      ),
    ];
    return new DiRegistrationOperationEmission(records, operation, productHandle, identityHandle, claimHandle);
  }

  private recordsForOperationEnvelope(
    local: string,
    operation: DiRegistrationOperationEmission,
    materializationClaimHandles: readonly ClaimHandle[],
    openSeamHandles: readonly OpenSeamHandle[],
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return [
      new MaterializedProduct(
        operation.productHandle,
        KernelVocabulary.Di.ContainerRegistration.key,
        operation.identityHandle,
        operation.product.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:operation`),
        operation.identityHandle,
        [operation.productHandle],
        materializationClaimHandles,
        openSeamHandles,
      ),
    ];
  }

  private recordsForOperationProductClaims(
    local: string,
    operationProductHandle: ProductHandle,
    producedProductHandles: readonly ProductHandle[],
    provenanceHandle: ProvenanceHandle,
  ): DiClaimEmission {
    const handles: ClaimHandle[] = [];
    const records = producedProductHandles.map((productHandle, index) => {
      const handle = this.store.handles.claim(`${local}:${index}`);
      handles.push(handle);
      return new SemanticClaim(
        handle,
        operationProductHandle,
        KernelVocabulary.Di.ProducesProduct.key,
        productHandle,
        provenanceHandle,
      );
    });
    return new DiClaimEmission(records, handles);
  }

  private recordsForResolverAdmission(
    container: Container,
    admission: ResolverRegistrationAdmission,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly resolvers: readonly Resolver[];
    readonly resolverSlots: readonly ContainerResolverSlot[];
    readonly openSeams: readonly OpenSeam[];
  } {
    const records: KernelStoreRecord[] = [];
    const openSeams: OpenSeam[] = [];
    if (admission.keyRole !== RegistrationKeyRole.AdmittedKey || admission.targetKey?.identityHandle == null) {
      const seam = this.recordsForOpenSeam(
        `${local}:open-key`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        'Resolver admission could not produce a container slot because the admitted DI key stayed open.',
        admission.sourceAddressHandle,
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
      return { records, resolvers: [], resolverSlots: [], openSeams };
    }

    if (!isResolverRegistrationStrategy(admission.strategy)) {
      const seam = this.recordsForOpenSeam(
        `${local}:open-strategy`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        `DI world construction does not yet spend ${admission.strategy} admissions into concrete container effects.`,
        admission.sourceAddressHandle,
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
      return { records, resolvers: [], resolverSlots: [], openSeams };
    }

    const resolver = this.recordsForResolver(container, admission, local, provenanceHandle);
    const slot = this.recordsForResolverSlot(container, admission, resolver.productHandle, local, provenanceHandle);
    records.push(...resolver.records, ...slot.records);
    return {
      records,
      resolvers: [resolver.product],
      resolverSlots: [slot.product],
      openSeams,
    };
  }

  private recordsForResolver(
    container: Container,
    admission: ResolverRegistrationAdmission,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiProductEmission<Resolver> {
    const productHandle = this.store.handles.product(`${local}:resolver`);
    const identityHandle = this.store.handles.identity(`${local}:resolver`);
    const keyIdentityHandle = admission.targetKey!.identityHandle!;
    const claimHandle = this.store.handles.claim(`${local}:resolver-provides-key`);
    const resolver = new Resolver(
      productHandle,
      identityHandle,
      admission.targetKey!,
      admission.strategy,
      admission.registeredValue,
      admission.sourceAddressHandle,
      compactFieldProvenance<ResolverField>([
        new FieldProvenance('_key', provenanceHandle),
        new FieldProvenance('_strategy', provenanceHandle),
        admission.registeredValue == null ? null : new FieldProvenance('_state', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );
    const records: KernelStoreRecord[] = [
      new DiProductIdentity(
        identityHandle,
        KernelVocabulary.Di.Resolver.key,
        container.identityHandle,
        admission.identityHandle,
        admission.sourceAddressHandle,
      ),
      new SemanticClaim(
        claimHandle,
        productHandle,
        KernelVocabulary.Di.ProvidesKey.key,
        keyIdentityHandle,
        provenanceHandle,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Di.Resolver.key,
        identityHandle,
        admission.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:resolver`),
        identityHandle,
        [productHandle],
        [claimHandle],
      ),
    ];
    return new DiProductEmission(records, resolver, productHandle, identityHandle);
  }

  private recordsForResolverSlot(
    container: Container,
    admission: ResolverRegistrationAdmission,
    resolverProductHandle: ProductHandle,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiProductEmission<ContainerResolverSlot> {
    const productHandle = this.store.handles.product(`${local}:resolver-slot`);
    const identityHandle = this.store.handles.identity(`${local}:resolver-slot`);
    const keyIdentityHandle = admission.targetKey!.identityHandle!;
    const claimHandle = this.store.handles.claim(`${local}:resolver-slot-provides-key`);
    const slot = new ContainerResolverSlot(
      productHandle,
      container.toReference(),
      keyIdentityHandle,
      resolverProductHandle,
      admission.strategy,
      false,
      admission.sourceAddressHandle,
      compactFieldProvenance<ContainerSlotField>([
        new FieldProvenance('container', provenanceHandle),
        new FieldProvenance('key', provenanceHandle),
        new FieldProvenance('resolver', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );
    const records: KernelStoreRecord[] = [
      new DiProductIdentity(
        identityHandle,
        KernelVocabulary.Di.ResolverSlot.key,
        container.identityHandle,
        admission.identityHandle,
        admission.sourceAddressHandle,
      ),
      new SemanticClaim(
        claimHandle,
        productHandle,
        KernelVocabulary.Di.ProvidesKey.key,
        keyIdentityHandle,
        provenanceHandle,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Di.ResolverSlot.key,
        identityHandle,
        admission.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:resolver-slot`),
        identityHandle,
        [productHandle],
        [claimHandle],
      ),
    ];
    return new DiProductEmission(records, slot, productHandle, identityHandle);
  }

  private recordsForParameterizedRegistry(
    container: Container,
    admission: ParameterizedRegistryAdmission,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly registry: ParameterizedRegistry | null;
    readonly openSeams: readonly OpenSeam[];
  } {
    const records: KernelStoreRecord[] = [];
    const openSeams: OpenSeam[] = [];
    if (admission.registryLookupKey == null) {
      const seam = this.recordsForOpenSeam(
        `${local}:parameterized-registry-open-key`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        'ParameterizedRegistry admission did not expose a closed registry lookup key.',
        admission.sourceAddressHandle,
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
      return { records, registry: null, openSeams };
    }

    const productHandle = this.store.handles.product(`${local}:parameterized-registry`);
    const identityHandle = this.store.handles.identity(`${local}:parameterized-registry`);
    const registry = new ParameterizedRegistry(
      productHandle,
      identityHandle,
      admission.registryLookupKey,
      admission.registryParameters,
      admission.sourceAddressHandle,
      compactFieldProvenance<RegistryField>([
        new FieldProvenance('key', provenanceHandle),
        admission.registryParameters.length === 0 ? null : new FieldProvenance('params', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );
    const registryResult = registry.register(container);
    const seam = this.recordsForOpenSeam(
      `${local}:parameterized-registry-open`,
      KernelVocabulary.Di.OpenRegistryBody.key,
      summaryForParameterizedRegistryResult(registryResult?.state ?? RegistryRegistrationState.Open),
      admission.sourceAddressHandle,
    );
    records.push(
      new DiProductIdentity(
        identityHandle,
        KernelVocabulary.Di.ParameterizedRegistry.key,
        container.identityHandle,
        admission.identityHandle,
        admission.sourceAddressHandle,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Di.ParameterizedRegistry.key,
        identityHandle,
        admission.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:parameterized-registry`),
        identityHandle,
        [productHandle],
        [],
        [seam.seam.handle],
      ),
      ...seam.records,
    );
    openSeams.push(seam.seam);
    return { records, registry, openSeams };
  }

  private recordsForRegistry(
    container: Container,
    admission: RegistryRegistrationAdmission,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly registry: RegistryValue;
    readonly openSeams: readonly OpenSeam[];
  } {
    const productHandle = this.store.handles.product(`${local}:registry`);
    const identityHandle = this.store.handles.identity(`${local}:registry`);
    const registry = new RegistryValue(
      productHandle,
      identityHandle,
      admission.registryValue,
      admission.sourceAddressHandle,
      compactFieldProvenance<RegistryField>([
        admission.registryValue == null ? null : new FieldProvenance('registryValue', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );
    const seam = this.recordsForOpenSeam(
      `${local}:registry-open`,
      KernelVocabulary.Di.OpenRegistryBody.key,
      summaryForRegistryAdmissionOpen(admission),
      admission.sourceAddressHandle,
    );
    const records: KernelStoreRecord[] = [
      new DiProductIdentity(
        identityHandle,
        KernelVocabulary.Di.Registry.key,
        container.identityHandle,
        admission.identityHandle,
        admission.sourceAddressHandle,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Di.Registry.key,
        identityHandle,
        admission.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:registry`),
        identityHandle,
        [productHandle],
        [],
        [seam.seam.handle],
      ),
      ...seam.records,
    ];
    return { records, registry, openSeams: [seam.seam] };
  }

  private recordsForResourceAdmission(
    container: Container,
    admission: ResourceRegistrationAdmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiResourceSlotEmission {
    const records: KernelStoreRecord[] = [];
    const slots: ContainerResourceSlot[] = [];
    const claimHandles: ClaimHandle[] = [];
    const openSeams: OpenSeam[] = [];

    const definition = resourceDefinitions?.lookupByProduct(admission.registeredValue.productHandle) ?? null;
    if (definition == null) {
      const seam = this.recordsForOpenSeam(
        `${local}:definition-open`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        'Resource registration admission did not resolve to a full resource definition during DI world construction.',
        admission.sourceAddressHandle,
      );
      return new DiResourceSlotEmission(seam.records, [], [], [seam.seam]);
    }

    const names = resourceLookupNames(definition);
    names.forEach((name, index) => {
      const slot = this.recordsForResourceDefinitionSlot(
        container,
        definition,
        name,
        `${local}:${index}`,
        provenanceHandle,
      );
      if (slot == null) {
        return;
      }
      records.push(...slot.records);
      slots.push(slot.slot);
      claimHandles.push(...slot.claimHandles);
    });

    if (slots.length === 0) {
      const seam = this.recordsForOpenSeam(
        `${local}:no-resource-key`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        'Resource registration did not produce any runtime resource-key rows.',
        admission.sourceAddressHandle,
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
    }

    return new DiResourceSlotEmission(records, slots, claimHandles, openSeams);
  }

  private recordsForConfiguredResourceSlots(
    container: Container,
    admission: RegistrationAdmissionProduct,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiResourceSlotEmission {
    const selection = configuredResources.selections.find((candidate) =>
      candidate.registrationAdmissionProductHandle === admission.productHandle
    );
    if (selection == null) {
      return new DiResourceSlotEmission([], [], []);
    }

    const resourceEmissions: BuiltInResourceEmission[] = [];
    for (const catalogProductHandle of selection.catalogProductHandles) {
      resourceEmissions.push(...configuredResources.catalogEmission.resources.filter((resource) =>
        resource.catalogProductHandle === catalogProductHandle
      ));
    }

    const records: KernelStoreRecord[] = [];
    const slots: ContainerResourceSlot[] = [];
    const claimHandles: ClaimHandle[] = [];
    resourceEmissions.forEach((emission, resourceIndex) => {
      const resource = emission.resource;
      const names = [resource.name, ...resource.aliases];
      names.forEach((name, nameIndex) => {
        const slot = this.recordsForBuiltInResourceSlot(
          container,
          resource,
          name,
          `${local}:${resourceIndex}:${nameIndex}`,
          provenanceHandle,
        );
        if (slot == null) {
          return;
        }
        records.push(...slot.records);
        slots.push(slot.slot);
        claimHandles.push(...slot.claimHandles);
      });
    });

    return new DiResourceSlotEmission(records, slots, claimHandles);
  }

  private recordsForResourceDefinitionSlot(
    container: Container,
    definition: FullResourceDefinition,
    lookupName: string,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly slot: ContainerResourceSlot;
    readonly claimHandles: readonly ClaimHandle[];
  } | null {
    if (definition.identityHandle == null || definition.productHandle == null) {
      return null;
    }

    const resourceKey = runtimeResourceKeyForKind(definition.type, lookupName);
    if (resourceKey == null || container.hasResource(resourceKey, false)) {
      return null;
    }

    const records: KernelStoreRecord[] = [];
    const productHandle = this.store.handles.product(`di-resource-slot:${container.productHandle}:${resourceKey}`);
    const identityHandle = this.store.handles.identity(`di-resource-slot:${container.productHandle}:${resourceKey}`);
    const keyIdentityHandle = this.store.handles.identity(`di-key:resource:${resourceKey}`);
    this.emitResourceKeyIdentity(
      records,
      keyIdentityHandle,
      definition.identityHandle,
      resourceKey,
      definition.sourceAddressHandle ?? container.sourceAddressHandle,
    );

    const claimHandle = this.store.handles.claim(`${local}:provides-key`);
    const slot = new ContainerResourceSlot(
      productHandle,
      container.toReference(),
      resourceKey,
      keyIdentityHandle,
      definition.identityHandle,
      definition.productHandle,
      null,
      definition.sourceAddressHandle ?? container.sourceAddressHandle,
      compactFieldProvenance<ContainerSlotField>([
        new FieldProvenance('container', provenanceHandle),
        new FieldProvenance('key', provenanceHandle),
        new FieldProvenance('resource', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );
    records.push(
      new DiProductIdentity(
        identityHandle,
        KernelVocabulary.Di.ResourceSlot.key,
        container.identityHandle,
        definition.identityHandle,
        slot.sourceAddressHandle,
      ),
      new SemanticClaim(
        claimHandle,
        productHandle,
        KernelVocabulary.Di.ProvidesKey.key,
        keyIdentityHandle,
        provenanceHandle,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Di.ResourceSlot.key,
        identityHandle,
        slot.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`di-resource-slot:${container.productHandle}:${resourceKey}`),
        identityHandle,
        [productHandle],
        [claimHandle],
      ),
    );
    return {
      records,
      slot,
      claimHandles: [claimHandle],
    };
  }

  private recordsForBuiltInResourceSlot(
    container: Container,
    resource: BuiltInResourceEmission['resource'],
    lookupName: string,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly slot: ContainerResourceSlot;
    readonly claimHandles: readonly ClaimHandle[];
  } | null {
    if (resource.identityHandle == null || resource.productHandle == null) {
      return null;
    }

    const resourceKey = runtimeResourceKeyForKind(resource.resourceKind, lookupName);
    if (resourceKey == null || container.hasResource(resourceKey, false)) {
      return null;
    }

    const records: KernelStoreRecord[] = [];
    const productHandle = this.store.handles.product(`di-resource-slot:${container.productHandle}:${resourceKey}`);
    const identityHandle = this.store.handles.identity(`di-resource-slot:${container.productHandle}:${resourceKey}`);
    const keyIdentityHandle = this.store.handles.identity(`di-key:resource:${resourceKey}`);
    this.emitResourceKeyIdentity(
      records,
      keyIdentityHandle,
      resource.identityHandle,
      resourceKey,
      resource.sourceAddressHandle ?? container.sourceAddressHandle,
    );

    const claimHandle = this.store.handles.claim(`${local}:provides-key`);
    const slot = new ContainerResourceSlot(
      productHandle,
      container.toReference(),
      resourceKey,
      keyIdentityHandle,
      resource.identityHandle,
      resource.productHandle,
      null,
      resource.sourceAddressHandle ?? container.sourceAddressHandle,
      compactFieldProvenance<ContainerSlotField>([
        new FieldProvenance('container', provenanceHandle),
        new FieldProvenance('key', provenanceHandle),
        new FieldProvenance('resource', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );
    records.push(
      new DiProductIdentity(
        identityHandle,
        KernelVocabulary.Di.ResourceSlot.key,
        container.identityHandle,
        resource.identityHandle,
        slot.sourceAddressHandle,
      ),
      new SemanticClaim(
        claimHandle,
        productHandle,
        KernelVocabulary.Di.ProvidesKey.key,
        keyIdentityHandle,
        provenanceHandle,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Di.ResourceSlot.key,
        identityHandle,
        slot.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`di-resource-slot:${container.productHandle}:${resourceKey}`),
        identityHandle,
        [productHandle],
        [claimHandle],
      ),
    );
    return {
      records,
      slot,
      claimHandles: [claimHandle],
    };
  }

  private recordsForContainerSelfResolver(container: Container): DiProductEmission<ContainerSelfResolverSlot> {
    const local = `di-self-resolver:${container.productHandle}`;
    const source = this.recordsForSource(
      `${local}:source`,
      'Container constructor installs the built-in IContainer self resolver.',
      container.sourceAddressHandle,
    );
    const records: KernelStoreRecord[] = [...source.records];
    const keyIdentityHandle = this.store.handles.identity('di-key:interface:IContainer');
    this.emitInterfaceKeyIdentity(
      records,
      keyIdentityHandle,
      'IContainer',
      container.sourceAddressHandle,
    );

    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const providesKeyClaimHandle = this.store.handles.claim(`${local}:provides-key`);
    const producedClaimHandle = this.store.handles.claim(`${local}:container-produces-product`);
    const slot = new ContainerSelfResolverSlot(
      productHandle,
      container.toReference(),
      keyIdentityHandle,
      container.sourceAddressHandle,
      compactFieldProvenance<ContainerSlotField>([
        new FieldProvenance('container', source.provenanceHandle),
        new FieldProvenance('key', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    records.push(
      new DiProductIdentity(
        identityHandle,
        KernelVocabulary.Di.SelfResolverSlot.key,
        container.identityHandle,
        keyIdentityHandle,
        container.sourceAddressHandle,
      ),
      new SemanticClaim(
        providesKeyClaimHandle,
        productHandle,
        KernelVocabulary.Di.ProvidesKey.key,
        keyIdentityHandle,
        source.provenanceHandle,
      ),
      new SemanticClaim(
        producedClaimHandle,
        container.productHandle,
        KernelVocabulary.Di.ProducesProduct.key,
        productHandle,
        source.provenanceHandle,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Di.SelfResolverSlot.key,
        identityHandle,
        container.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(local),
        identityHandle,
        [productHandle],
        [providesKeyClaimHandle, producedClaimHandle],
      ),
    );
    return new DiProductEmission(records, slot, productHandle, identityHandle);
  }

  private recordsForSource(
    local: string,
    summary: string,
    addressHandle: AddressHandle | null,
  ): DiSourceSet {
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    const records: KernelStoreRecord[] = [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.ConfigurationFlow,
        [EvidenceRole.Registration],
        summary,
        addressHandle,
      ),
      new ProvenanceRecord(
        provenanceHandle,
        [evidenceHandle],
      ),
    ];
    return new DiSourceSet(records, provenanceHandle);
  }

  private recordsForOpenSeam(
    local: string,
    seamKindKey: OpenSeamKindKey,
    summary: string,
    addressHandle: AddressHandle | null,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly seam: OpenSeam;
  } {
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    const seamHandle = this.store.handles.openSeam(local);
    const seam = new OpenSeam(seamHandle, seamKindKey, summary, addressHandle, evidenceHandle);
    return {
      records: [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.Diagnostic, EvidenceRole.Registration],
          summary,
          addressHandle,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          [evidenceHandle],
        ),
        seam,
      ],
      seam,
    };
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

  private emitResourceKeyIdentity(
    records: KernelStoreRecord[],
    handle: IdentityHandle,
    resourceIdentityHandle: IdentityHandle,
    resourceKey: string,
    addressHandle: AddressHandle | null,
  ): void {
    if (this.emittedIdentityHandles.has(handle) || this.store.readIdentity(handle) != null) {
      return;
    }
    this.emittedIdentityHandles.add(handle);
    records.push(new ResourceDiKeyIdentity(
      handle,
      resourceIdentityHandle,
      resourceKey,
      addressHandle,
    ));
  }
}

function resourceLookupNames(definition: FullResourceDefinition): readonly string[] {
  if (definition.type === ResourceDefinitionKind.AttributePattern) {
    return [];
  }
  return [definition.name, ...definition.aliases.map((alias) => alias.name)];
}

function summaryForParameterizedRegistryResult(state: RegistryRegistrationState): string {
  switch (state) {
    case RegistryRegistrationState.Delegated:
      return 'ParameterizedRegistry found a registry key, but delegated registry body interpretation is still open.';
    case RegistryRegistrationState.ParameterAdmission:
      return 'ParameterizedRegistry fell back to registering object parameters; recursive parameter spending is still open.';
    case RegistryRegistrationState.Open:
      return 'ParameterizedRegistry could not close its registry key or parameter registration behavior yet.';
  }
}

function summaryForOpenRegistrationAdmission(admission: OpenRegistrationAdmission): string {
  switch (admission.strategy) {
    case RegistrationStrategy.Unknown:
      return 'Registration admission was preserved, but recognition could not classify its runtime strategy yet.';
    case RegistrationStrategy.Resource:
      return 'Resource registration admission was preserved for later resource-to-container spending.';
    case RegistrationStrategy.PlainClassSelf:
      return 'Plain-class fallback admission was preserved for later default resolver and auto-registration modeling.';
    case RegistrationStrategy.ObjectMap:
      return 'Object-map registration admission was preserved for later recursive entry spending.';
    case RegistrationStrategy.Factory:
      return 'Factory registration admission was preserved for later factory-map modeling.';
    case RegistrationStrategy.Defer:
      return 'Deferred registration admission was preserved, but its parameterized registry shape was not closed.';
    case RegistrationStrategy.FrameworkGroup:
      return 'Framework registration admission was preserved, but its framework effect package was not classified.';
    case RegistrationStrategy.Registry:
    case RegistrationStrategy.Instance:
    case RegistrationStrategy.Singleton:
    case RegistrationStrategy.Transient:
    case RegistrationStrategy.Callback:
    case RegistrationStrategy.CachedCallback:
    case RegistrationStrategy.AliasTo:
    case RegistrationStrategy.Resolver:
    case RegistrationStrategy.Array:
      return `Registration admission was preserved as open because ${admission.strategy} could not be spent by this product type.`;
  }
}

function summaryForRegistryAdmissionOpen(admission: RegistryRegistrationAdmission): string {
  switch (admission.registryValue?.frameworkKind) {
    case FrameworkRegistrationKind.StandardConfiguration:
      return 'StandardConfiguration syntax and default resource effects can feed template compilation, but DI has not spent the remaining resolver and renderer effects yet.';
    case FrameworkRegistrationKind.I18nConfiguration:
      return 'I18nConfiguration syntax and resource effects can feed template compilation, but DI has not spent the remaining services, tasks, renderer effects, or dynamic alias options yet.';
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return 'StateDefaultConfiguration syntax and state binding-behavior effects can feed template compilation, but DI has not spent store services, tasks, and renderer effects yet.';
    case FrameworkRegistrationKind.AppTask:
      return 'AppTask registry admission is preserved for lifecycle-slot dispatch; DI does not spend the task callback body into container slots.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
      return 'Framework syntax group effects can be selected by template compilation, but DI has not spent remaining expanded registrations yet.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return 'DefaultResources resource headers can feed DI resource slots; non-resource spread effects are still open.';
    case null:
    case undefined:
      return 'IRegistry registration body has not been interpreted by DI world construction yet.';
  }
}

function summaryForFrameworkRegistrationOpen(frameworkKind: FrameworkRegistrationKind): string {
  switch (frameworkKind) {
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
      return 'DefaultBindingSyntax spread syntax effects can be selected by template compilation; EventModifierRegistration and remaining DI effects are not spent yet.';
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
      return 'ShortHandBindingSyntax spread syntax effects can be selected by template compilation.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
      return 'DefaultBindingLanguage spread syntax effects can be selected by template compilation.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return 'DefaultResources spread resource headers can feed DI resource slots; non-resource spread effects are still open.';
    case FrameworkRegistrationKind.StandardConfiguration:
      return 'StandardConfiguration syntax and default resource effects can feed template compilation, but DI has not spent the remaining resolver and renderer effects yet.';
    case FrameworkRegistrationKind.I18nConfiguration:
      return 'I18nConfiguration syntax and resource effects can feed template compilation, but DI has not spent the remaining services, tasks, renderer effects, or dynamic alias options yet.';
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return 'StateDefaultConfiguration syntax and state binding-behavior effects can feed template compilation, but DI has not spent store services, tasks, and renderer effects yet.';
    case FrameworkRegistrationKind.AppTask:
      return 'AppTask registry admission is preserved for lifecycle-slot dispatch; DI does not spend the task callback body into container slots.';
  }
}
