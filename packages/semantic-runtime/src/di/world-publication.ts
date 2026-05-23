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
  ConfigurationIdentity,
  DiProductIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type OpenSeamKindKey,
  type ProductKindKey,
} from '../kernel/vocabulary.js';
import {
  AppTaskCallbackKind,
  AppTaskDefinition,
  ConfigurationCallbackReference,
} from '../configuration/app-task.js';
import type { BuiltInResourceEmission } from '../resources/built-in-resource-catalog-materializer.js';
import { ResourceFrameworkErrorCode } from '../resources/framework-error-code.js';
import {
  runtimeResourceKeyForKind,
  ResourceDefinitionKind,
} from '../resources/resource-kind.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import {
  ResourceIssueKind,
  ResourceIssuePhase,
  type ResourceIssue,
} from '../resources/resource-issue.js';
import {
  ResourceIssuePublication,
  ResourceIssuePublisher,
} from '../resources/resource-issue-publication.js';
import {
  ParameterizedRegistryAdmission,
  ResolverRegistrationAdmission,
  RegistryRegistrationAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import {
  FrameworkRegistrationKind,
  RegistryBodyKind,
  RegistrationKeyReference,
  RegistrationValueReference,
} from '../registration/registration-reference.js';
import type {
  FrameworkAppTaskEffect,
  FrameworkFactoryEffect,
  FrameworkResolverEffect,
} from './framework-registration-effects.js';
import type { Container } from './container.js';
import { ContainerRegistrationOperation } from './container-registration.js';
import {
  ParameterizedRegistry,
  RegistryRegistrationState,
  RegistryValue,
} from './registry.js';

import {
  ContainerFactorySlot,
  ContainerResourceSlot,
  ContainerResolverSlot,
  ContainerSelfResolverSlot,
} from './container-slot.js';
import type { DiIssue } from './di-issue.js';
import { DiKeyIdentityEmitter } from './di-key-identity-emitter.js';
import { DiIssuePublisher } from './di-issue-publication.js';
import {
  Resolver,
  type ResolverStrategy,
  resolverStrategyForRegistrationStrategy,
} from './resolver.js';

export class DiSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

export class DiProductEmission<TProduct> {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly product: TProduct,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly openSeams: readonly OpenSeam[] = [],
  ) {}
}

interface PublishedDiProductRecordSpec {
  readonly productKindKey: ProductKindKey;
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
  readonly parentIdentityHandle: IdentityHandle | null;
  readonly ownerIdentityHandle: IdentityHandle | null;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly providesKeyClaimHandle: ClaimHandle;
  readonly keyIdentityHandle: IdentityHandle;
  readonly provenanceHandle: ProvenanceHandle;
  readonly materializationLocal: string;
}

export class DiFrameworkRegistrationEffectEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly resolvers: readonly Resolver[],
    readonly resolverSlots: readonly ContainerResolverSlot[],
    readonly factorySlots: readonly ContainerFactorySlot[],
    readonly resourceSlots: readonly ContainerResourceSlot[],
    readonly appTasks: readonly AppTaskDefinition[],
    readonly openSeams: readonly OpenSeam[] = [],
    readonly issues: readonly DiIssue[] = [],
    readonly resourceIssues: readonly ResourceIssue[] = [],
  ) {}
}

export class DiRegistrationOperationEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly product: ContainerRegistrationOperation,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly acceptRegistrationClaimHandle: ClaimHandle,
  ) {}
}

export class DiRegistrationOperationHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly acceptRegistrationClaimHandle: ClaimHandle,
  ) {}
}

export class DiClaimEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly handles: readonly ClaimHandle[],
  ) {}
}

export class DiParameterizedRegistryPublicationEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly registry: ParameterizedRegistry | null,
    readonly openSeams: readonly OpenSeam[],
  ) {}
}

export class DiRegistryPublicationEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly registry: RegistryValue,
    readonly openSeams: readonly OpenSeam[],
  ) {}
}

export class DiFrameworkAppTaskPublicationEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly appTask: AppTaskDefinition,
  ) {}
}

function recordsForPublishedDiProduct(
  store: KernelStore,
  spec: PublishedDiProductRecordSpec,
): readonly KernelStoreRecord[] {
  return [
    new DiProductIdentity(
      spec.identityHandle,
      spec.productKindKey,
      spec.parentIdentityHandle,
      spec.ownerIdentityHandle,
      spec.sourceAddressHandle,
    ),
    new SemanticClaim(
      spec.providesKeyClaimHandle,
      spec.productHandle,
      KernelVocabulary.Di.ProvidesKey.key,
      spec.keyIdentityHandle,
      spec.provenanceHandle,
    ),
    new MaterializedProduct(
      spec.productHandle,
      spec.productKindKey,
      spec.identityHandle,
      spec.sourceAddressHandle,
      spec.provenanceHandle,
    ),
    new MaterializationRecord(
      store.handles.materialization(spec.materializationLocal),
      spec.identityHandle,
      [spec.productHandle],
      [spec.providesKeyClaimHandle],
    ),
  ];
}

export function recordsForDiSource(
  store: KernelStore,
  local: string,
  summary: string,
  addressHandle: AddressHandle | null,
): DiSourceSet {
  const evidenceHandle = store.handles.evidence(local);
  const provenanceHandle = store.handles.provenance(local);
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

export function recordsForDiOpenSeam(
  store: KernelStore,
  local: string,
  seamKindKey: OpenSeamKindKey,
  summary: string,
  addressHandle: AddressHandle | null,
): {
  readonly records: readonly KernelStoreRecord[];
  readonly seam: OpenSeam;
} {
  const evidenceHandle = store.handles.evidence(local);
  const provenanceHandle = store.handles.provenance(local);
  const seamHandle = store.handles.openSeam(local);
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

export class DiRegistryPublicationMaterializer {
  constructor(private readonly store: KernelStore) {}

  recordsForParameterizedRegistry(
    container: Container,
    admission: ParameterizedRegistryAdmission,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiParameterizedRegistryPublicationEmission {
    const records: KernelStoreRecord[] = [];
    const openSeams: OpenSeam[] = [];
    if (admission.registryLookupKey == null) {
      const seam = recordsForDiOpenSeam(this.store,
        `${local}:parameterized-registry-open-key`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        'ParameterizedRegistry admission did not expose a closed registry lookup key.',
        admission.sourceAddressHandle,
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
      return new DiParameterizedRegistryPublicationEmission(records, null, openSeams);
    }

    const registry = this.parameterizedRegistryForAdmission(local, admission);
    const registryResult = registry.register(container);
    const seam = recordsForDiOpenSeam(this.store,
      `${local}:parameterized-registry-open`,
      KernelVocabulary.Di.OpenRegistryBody.key,
      summaryForParameterizedRegistryResult(registryResult?.state ?? RegistryRegistrationState.Open),
      admission.sourceAddressHandle,
    );
    records.push(
      ...this.recordsForParameterizedRegistryProduct(local, container, admission, registry, provenanceHandle, [seam.seam.handle]),
      ...seam.records,
    );
    openSeams.push(seam.seam);
    return new DiParameterizedRegistryPublicationEmission(records, registry, openSeams);
  }

  recordsForRegistry(
    container: Container,
    admission: RegistryRegistrationAdmission,
    local: string,
    provenanceHandle: ProvenanceHandle,
    registryBodyInterpreted: boolean,
  ): DiRegistryPublicationEmission {
    const registry = this.registryForAdmission(local, admission);
    const openSummary = registryBodyInterpreted ? null : summaryForRegistryAdmissionOpen(admission);
    const seam = openSummary == null
      ? null
      : recordsForDiOpenSeam(this.store,
        `${local}:registry-open`,
        KernelVocabulary.Di.OpenRegistryBody.key,
        openSummary,
        admission.sourceAddressHandle,
      );
    const records: KernelStoreRecord[] = [
      ...this.recordsForRegistryProduct(
        local,
        container,
        admission,
        registry,
        provenanceHandle,
        seam == null ? [] : [seam.seam.handle],
      ),
      ...(seam?.records ?? []),
    ];
    return new DiRegistryPublicationEmission(records, registry, seam == null ? [] : [seam.seam]);
  }

  private parameterizedRegistryForAdmission(
    local: string,
    admission: ParameterizedRegistryAdmission,
  ): ParameterizedRegistry {
    return new ParameterizedRegistry(
      this.store.handles.product(`${local}:parameterized-registry`),
      this.store.handles.identity(`${local}:parameterized-registry`),
      admission.registryLookupKey!,
      admission.registryParameters,
      admission.sourceAddressHandle,
      [],
    );
  }

  private recordsForParameterizedRegistryProduct(
    local: string,
    container: Container,
    admission: ParameterizedRegistryAdmission,
    registry: ParameterizedRegistry,
    provenanceHandle: ProvenanceHandle,
    openSeamHandles: readonly OpenSeamHandle[],
  ): readonly KernelStoreRecord[] {
    return [
      new DiProductIdentity(
        registry.identityHandle,
        KernelVocabulary.Di.ParameterizedRegistry.key,
        container.identityHandle,
        admission.identityHandle,
        admission.sourceAddressHandle,
      ),
      new MaterializedProduct(
        registry.productHandle,
        KernelVocabulary.Di.ParameterizedRegistry.key,
        registry.identityHandle,
        admission.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:parameterized-registry`),
        registry.identityHandle,
        [registry.productHandle],
        [],
        openSeamHandles,
      ),
    ];
  }

  private registryForAdmission(
    local: string,
    admission: RegistryRegistrationAdmission,
  ): RegistryValue {
    return new RegistryValue(
      this.store.handles.product(`${local}:registry`),
      this.store.handles.identity(`${local}:registry`),
      admission.registryValue,
      admission.sourceAddressHandle,
      [],
    );
  }

  private recordsForRegistryProduct(
    local: string,
    container: Container,
    admission: RegistryRegistrationAdmission,
    registry: RegistryValue,
    provenanceHandle: ProvenanceHandle,
    openSeamHandles: readonly OpenSeamHandle[],
  ): readonly KernelStoreRecord[] {
    return [
      new DiProductIdentity(
        registry.identityHandle,
        KernelVocabulary.Di.Registry.key,
        container.identityHandle,
        admission.identityHandle,
        admission.sourceAddressHandle,
      ),
      new MaterializedProduct(
        registry.productHandle,
        KernelVocabulary.Di.Registry.key,
        registry.identityHandle,
        admission.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:registry`),
        registry.identityHandle,
        [registry.productHandle],
        [],
        openSeamHandles,
      ),
    ];
  }
}

export class DiFrameworkAppTaskPublicationMaterializer {
  constructor(
    private readonly store: KernelStore,
    private readonly keyIdentityEmitter: DiKeyIdentityEmitter,
  ) {}

  recordsForFrameworkAppTaskEffect(
    admission: RegistrationAdmissionProduct,
    effect: FrameworkAppTaskEffect,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiFrameworkAppTaskPublicationEmission {
    const records: KernelStoreRecord[] = [];
    const keyIdentityHandle = this.store.handles.identity(`${local}:key:${effect.keyName}`);
    this.keyIdentityEmitter.emitInterfaceKeyIdentity(records, keyIdentityHandle, effect.keyName, admission.sourceAddressHandle);

    const task = this.frameworkAppTaskDefinition(admission, effect, local, keyIdentityHandle);
    records.push(...this.recordsForFrameworkAppTaskProduct(admission, effect, local, task, provenanceHandle));

    return new DiFrameworkAppTaskPublicationEmission(records, task);
  }

  private frameworkAppTaskDefinition(
    admission: RegistrationAdmissionProduct,
    effect: FrameworkAppTaskEffect,
    local: string,
    keyIdentityHandle: IdentityHandle,
  ): AppTaskDefinition {
    return new AppTaskDefinition(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      effect.slot,
      AppTaskCallbackKind.ResolvedKey,
      new RegistrationKeyReference(
        keyIdentityHandle,
        admission.sourceAddressHandle,
        effect.keyName,
      ),
      new ConfigurationCallbackReference(
        null,
        null,
        admission.sourceAddressHandle,
        effect.callbackName,
      ),
      admission.sourceAddressHandle,
      [],
    );
  }

  private recordsForFrameworkAppTaskProduct(
    admission: RegistrationAdmissionProduct,
    effect: FrameworkAppTaskEffect,
    local: string,
    task: AppTaskDefinition,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return [
      new ConfigurationIdentity(
        task.identityHandle,
        KernelVocabulary.Configuration.AppTask.key,
        admission.identityHandle,
        admission.sourceAddressHandle,
        `AppTask.${effect.slot}`,
      ),
      new MaterializedProduct(
        task.productHandle,
        KernelVocabulary.Configuration.AppTask.key,
        task.identityHandle,
        admission.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(local),
        task.identityHandle,
        [task.productHandle],
      ),
    ];
  }
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

function summaryForRegistryAdmissionOpen(admission: RegistryRegistrationAdmission): string | null {
  switch (admission.registryValue?.registryBody?.bodyKind) {
    case RegistryBodyKind.AliasedResourcesRegistry:
      return 'aliasedResourcesRegistry(...) module input or alias arguments are not statically closed enough for registry body interpretation.';
    case undefined:
      break;
  }
  switch (admission.registryValue?.frameworkKind) {
    case FrameworkRegistrationKind.StandardConfiguration:
      return null;
    case FrameworkRegistrationKind.RuntimeHtmlDefaultComponents:
      return null;
    case FrameworkRegistrationKind.I18nConfiguration:
      return null;
    case FrameworkRegistrationKind.ValidationConfiguration:
      return null;
    case FrameworkRegistrationKind.ValidationHtmlConfiguration:
      return null;
    case FrameworkRegistrationKind.RouterConfiguration:
      return null;
    case FrameworkRegistrationKind.RouterDefaultComponents:
      return null;
    case FrameworkRegistrationKind.RouterDefaultResources:
      return null;
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return null;
    case FrameworkRegistrationKind.DialogConfiguration:
      return null;
    case FrameworkRegistrationKind.UiVirtualizationDefaultConfiguration:
      return 'DefaultVirtualizationConfiguration resource headers can feed DI resource slots; collection-strategy and DOM-renderer service registrations are not spent yet.';
    case FrameworkRegistrationKind.AppTask:
      return null;
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
      return 'Framework syntax group effects can be selected by template compilation, but DI has not spent remaining expanded registrations yet.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return 'DefaultResources resource headers can feed DI resource slots; non-resource spread effects are still open.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultRenderers:
      return 'DefaultRenderers runtime renderer effects can feed template compilation, but DI has not spent remaining expanded registrations yet.';
    case null:
    case undefined:
      return 'IRegistry registration body has not been interpreted by DI world construction yet.';
  }
}

interface DiResolverPublication {
  readonly ownerIdentityHandle: IdentityHandle;
  readonly key: RegistrationKeyReference;
  readonly keyIdentityHandle: IdentityHandle;
  readonly strategy: ResolverStrategy;
  readonly state: RegistrationValueReference | null;
  readonly sourceAddressHandle: AddressHandle | null;
}

interface DiResolverPublicationEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly resolver: Resolver;
  readonly resolverSlot: ContainerResolverSlot;
}

interface DiFactoryPublicationEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly factorySlot: ContainerFactorySlot;
}

interface DiResolverPublicationHandles {
  readonly resolverProductHandle: ProductHandle;
  readonly resolverIdentityHandle: IdentityHandle;
  readonly resolverProvidesKeyClaimHandle: ClaimHandle;
  readonly resolverSlotProductHandle: ProductHandle;
  readonly resolverSlotIdentityHandle: IdentityHandle;
  readonly resolverSlotProvidesKeyClaimHandle: ClaimHandle;
}

export class DiResourceSlotEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly slots: readonly ContainerResourceSlot[],
    readonly claimHandles: readonly ClaimHandle[],
    readonly openSeams: readonly OpenSeam[] = [],
    readonly issues: readonly DiIssue[] = [],
    readonly resourceIssues: readonly ResourceIssue[] = [],
  ) {}
}

interface RuntimeHtmlResourceDuplicateDiagnostic {
  readonly issueKind: ResourceIssueKind;
  readonly frameworkErrorCode: string;
  readonly message: string;
}

class DiResourceSlotPublication {
  constructor(
    readonly resourceKind: ResourceDefinitionKind,
    readonly lookupName: string,
    readonly registrationName: string,
    readonly resourceIdentityHandle: IdentityHandle,
    readonly resourceProductHandle: ProductHandle,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly projectKey: string | null,
    readonly duplicateDiagnostic: RuntimeHtmlResourceDuplicateDiagnostic | null,
  ) {}
}

class DiResourceSlotHandles {
  constructor(
    readonly slotLocal: string,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly keyIdentityHandle: IdentityHandle,
    readonly claimHandle: ClaimHandle,
  ) {}

  get claimHandles(): readonly ClaimHandle[] {
    return [this.claimHandle];
  }
}

class DiContainerSelfResolverHandles {
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

export class DiResolverPublicationMaterializer {
  constructor(
    private readonly store: KernelStore,
    private readonly keyIdentityEmitter: DiKeyIdentityEmitter,
  ) {}

  resolverPublicationForAdmission(
    admission: ResolverRegistrationAdmission,
  ): DiResolverPublication | null {
    if (admission.targetKey?.identityHandle == null) {
      return null;
    }
    const strategy = resolverStrategyForRegistrationStrategy(admission.strategy);
    if (strategy == null) {
      return null;
    }
    return {
      ownerIdentityHandle: admission.identityHandle,
      key: admission.targetKey,
      keyIdentityHandle: admission.targetKey.identityHandle,
      strategy,
      state: admission.registeredValue,
      sourceAddressHandle: admission.sourceAddressHandle,
    };
  }

  recordsForResolverPublication(
    container: Container,
    publication: DiResolverPublication,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiResolverPublicationEmission {
    const handles = this.resolverPublicationHandles(local);
    const resolver = this.resolverForPublication(publication, handles);
    const resolverSlot = this.resolverSlotForPublication(container, publication, resolver, handles);
    return {
      records: this.recordsForResolverPublicationProducts(
        container,
        publication,
        resolver,
        resolverSlot,
        handles,
        local,
        provenanceHandle,
      ),
      resolver,
      resolverSlot,
    };
  }

  recordsForFrameworkResolverEffect(
    container: Container,
    admission: RegistrationAdmissionProduct,
    effect: FrameworkResolverEffect,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly resolver: Resolver;
    readonly resolverSlot: ContainerResolverSlot;
  } {
    const records: KernelStoreRecord[] = [];
    const keyIdentityHandle = this.store.handles.identity(`${local}:key:${effect.keyName}`);
    this.keyIdentityEmitter.emitInterfaceKeyIdentity(records, keyIdentityHandle, effect.keyName, admission.sourceAddressHandle);

    const publication = this.frameworkResolverPublication(
      admission,
      effect,
      keyIdentityHandle,
    );
    const emission = this.recordsForResolverPublication(container, publication, local, provenanceHandle);
    records.push(...emission.records);
    return {
      records,
      resolver: emission.resolver,
      resolverSlot: emission.resolverSlot,
    };
  }

  recordsForFrameworkFactoryEffect(
    container: Container,
    admission: RegistrationAdmissionProduct,
    effect: FrameworkFactoryEffect,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiFactoryPublicationEmission {
    const records: KernelStoreRecord[] = [];
    const keyIdentityHandle = this.store.handles.identity(`${local}:key:${effect.keyName}`);
    this.keyIdentityEmitter.emitInterfaceKeyIdentity(records, keyIdentityHandle, effect.keyName, admission.sourceAddressHandle);

    const identityHandle = this.store.handles.identity(`${local}:factory-slot`);
    const slot = new ContainerFactorySlot(
      this.store.handles.product(`${local}:factory-slot`),
      container.toReference(),
      keyIdentityHandle,
      null,
      admission.sourceAddressHandle,
      [],
    );
    records.push(...recordsForPublishedDiProduct(this.store, {
      productKindKey: KernelVocabulary.Di.FactorySlot.key,
      productHandle: slot.productHandle,
      identityHandle,
      parentIdentityHandle: container.identityHandle,
      ownerIdentityHandle: admission.identityHandle,
      sourceAddressHandle: admission.sourceAddressHandle,
      providesKeyClaimHandle: this.store.handles.claim(`${local}:factory-slot-provides-key`),
      keyIdentityHandle,
      provenanceHandle,
      materializationLocal: `${local}:factory-slot`,
    }));
    return { records, factorySlot: slot };
  }

  private resolverPublicationHandles(local: string): DiResolverPublicationHandles {
    return {
      resolverProductHandle: this.store.handles.product(`${local}:resolver`),
      resolverIdentityHandle: this.store.handles.identity(`${local}:resolver`),
      resolverProvidesKeyClaimHandle: this.store.handles.claim(`${local}:resolver-provides-key`),
      resolverSlotProductHandle: this.store.handles.product(`${local}:resolver-slot`),
      resolverSlotIdentityHandle: this.store.handles.identity(`${local}:resolver-slot`),
      resolverSlotProvidesKeyClaimHandle: this.store.handles.claim(`${local}:resolver-slot-provides-key`),
    };
  }

  private resolverForPublication(
    publication: DiResolverPublication,
    handles: DiResolverPublicationHandles,
  ): Resolver {
    return new Resolver(
      handles.resolverProductHandle,
      handles.resolverIdentityHandle,
      publication.key,
      publication.strategy,
      publication.state,
      publication.sourceAddressHandle,
      [],
    );
  }

  private resolverSlotForPublication(
    container: Container,
    publication: DiResolverPublication,
    resolver: Resolver,
    handles: DiResolverPublicationHandles,
  ): ContainerResolverSlot {
    return new ContainerResolverSlot(
      handles.resolverSlotProductHandle,
      container.toReference(),
      publication.keyIdentityHandle,
      resolver,
      resolver.productHandle,
      publication.strategy,
      false,
      publication.sourceAddressHandle,
      [],
    );
  }

  private recordsForResolverPublicationProducts(
    container: Container,
    publication: DiResolverPublication,
    resolver: Resolver,
    resolverSlot: ContainerResolverSlot,
    handles: DiResolverPublicationHandles,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return [
      ...this.recordsForPublishedResolver(container, publication, resolver, handles, local, provenanceHandle),
      ...this.recordsForPublishedResolverSlot(container, publication, resolverSlot, handles, local, provenanceHandle),
    ];
  }

  private recordsForPublishedResolver(
    container: Container,
    publication: DiResolverPublication,
    resolver: Resolver,
    handles: DiResolverPublicationHandles,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return recordsForPublishedDiProduct(this.store, {
      productKindKey: KernelVocabulary.Di.Resolver.key,
      productHandle: resolver.productHandle,
      identityHandle: resolver.identityHandle,
      parentIdentityHandle: container.identityHandle,
      ownerIdentityHandle: publication.ownerIdentityHandle,
      sourceAddressHandle: publication.sourceAddressHandle,
      providesKeyClaimHandle: handles.resolverProvidesKeyClaimHandle,
      keyIdentityHandle: publication.keyIdentityHandle,
      provenanceHandle,
      materializationLocal: `${local}:resolver`,
    });
  }

  private recordsForPublishedResolverSlot(
    container: Container,
    publication: DiResolverPublication,
    resolverSlot: ContainerResolverSlot,
    handles: DiResolverPublicationHandles,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return recordsForPublishedDiProduct(this.store, {
      productKindKey: KernelVocabulary.Di.ResolverSlot.key,
      productHandle: resolverSlot.productHandle,
      identityHandle: handles.resolverSlotIdentityHandle,
      parentIdentityHandle: container.identityHandle,
      ownerIdentityHandle: publication.ownerIdentityHandle,
      sourceAddressHandle: publication.sourceAddressHandle,
      providesKeyClaimHandle: handles.resolverSlotProvidesKeyClaimHandle,
      keyIdentityHandle: publication.keyIdentityHandle,
      provenanceHandle,
      materializationLocal: `${local}:resolver-slot`,
    });
  }

  private frameworkResolverPublication(
    admission: RegistrationAdmissionProduct,
    effect: FrameworkResolverEffect,
    keyIdentityHandle: IdentityHandle,
  ): DiResolverPublication {
    return {
      ownerIdentityHandle: admission.identityHandle,
      key: new RegistrationKeyReference(
        keyIdentityHandle,
        admission.sourceAddressHandle,
        effect.keyName,
      ),
      keyIdentityHandle,
      strategy: effect.strategy,
      state: effect.valueKind == null
        ? null
        : new RegistrationValueReference(
          effect.valueKind,
          null,
          null,
          admission.sourceAddressHandle,
          effect.valueName,
        ),
      sourceAddressHandle: admission.sourceAddressHandle,
    };
  }
}

export class DiResourceSlotPublicationMaterializer {
  private readonly issuePublisher: DiIssuePublisher;
  private readonly resourceIssuePublisher: ResourceIssuePublisher;

  constructor(
    private readonly store: KernelStore,
    private readonly keyIdentityEmitter: DiKeyIdentityEmitter,
  ) {
    this.issuePublisher = new DiIssuePublisher(store);
    this.resourceIssuePublisher = new ResourceIssuePublisher(store);
  }

  recordsForResourceDefinitionSlot(
    container: Container,
    definition: FullResourceDefinition,
    lookupName: string,
    local: string,
    provenanceHandle: ProvenanceHandle,
    projectKey: string | null,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly slot: ContainerResourceSlot | null;
    readonly claimHandles: readonly ClaimHandle[];
    readonly issues: readonly DiIssue[];
    readonly resourceIssues: readonly ResourceIssue[];
  } | null {
    if (definition.identityHandle == null || definition.productHandle == null) {
      return null;
    }
    const registrationName = resourceRegistrationName(definition);
    if (registrationName == null) {
      return null;
    }
    return this.recordsForResourceSlot(
      container,
      new DiResourceSlotPublication(
        definition.type,
        lookupName,
        registrationName,
        definition.identityHandle,
        definition.productHandle,
        definition.sourceAddressHandle,
        projectKey,
        runtimeHtmlDuplicateDiagnosticForKind(definition.type, registrationName),
      ),
      local,
      provenanceHandle,
    );
  }

  recordsForBuiltInResourceSlot(
    container: Container,
    resource: BuiltInResourceEmission['resource'],
    lookupName: string,
    local: string,
    provenanceHandle: ProvenanceHandle,
    projectKey: string | null,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly slot: ContainerResourceSlot | null;
    readonly claimHandles: readonly ClaimHandle[];
    readonly issues: readonly DiIssue[];
    readonly resourceIssues: readonly ResourceIssue[];
  } | null {
    if (resource.identityHandle == null || resource.productHandle == null) {
      return null;
    }
    return this.recordsForResourceSlot(
      container,
      new DiResourceSlotPublication(
        resource.resourceKind,
        lookupName,
        resource.name,
        resource.identityHandle,
        resource.productHandle,
        resource.sourceAddressHandle,
        projectKey,
        runtimeHtmlDuplicateDiagnosticForKind(resource.resourceKind, resource.name),
      ),
      local,
      provenanceHandle,
    );
  }

  private recordsForResourceSlot(
    container: Container,
    publication: DiResourceSlotPublication,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly slot: ContainerResourceSlot | null;
    readonly claimHandles: readonly ClaimHandle[];
    readonly issues: readonly DiIssue[];
    readonly resourceIssues: readonly ResourceIssue[];
  } | null {
    const resourceKey = runtimeResourceKeyForKind(publication.resourceKind, publication.lookupName);
    if (resourceKey == null) {
      return null;
    }
    const existingSlot = container.readResourceSlots().find((slot) => slot.resourceKey === resourceKey) ?? null;
    if (existingSlot != null) {
      const sourceAddressHandle = this.resourceSlotSourceAddress(container, publication);
      const resourceIssue = this.publishRuntimeHtmlDuplicateResourceIssue(
        local,
        publication,
        sourceAddressHandle,
        provenanceHandle,
      );
      if (resourceIssue != null) {
        return {
          records: resourceIssue.records,
          slot: null,
          claimHandles: [],
          issues: [],
          resourceIssues: [resourceIssue.issue],
        };
      }
      const issue = this.issuePublisher.publishResourceAlreadyExists(
        `${local}:duplicate-resource-key`,
        container,
        resourceKey,
        existingSlot,
        publication.resourceProductHandle,
        sourceAddressHandle,
      );
      return {
        records: issue.records,
        slot: null,
        claimHandles: [],
        issues: [issue.issue],
        resourceIssues: [],
      };
    }

    const records: KernelStoreRecord[] = [];
    const handles = this.resourceSlotHandles(container, local, resourceKey);
    this.keyIdentityEmitter.emitResourceKeyIdentity(
      records,
      handles.keyIdentityHandle,
      publication.resourceIdentityHandle,
      resourceKey,
      this.resourceSlotSourceAddress(container, publication),
    );

    const slot = this.resourceSlotForPublication(container, publication, resourceKey, handles);
    records.push(
      ...this.recordsForResourceSlotProduct(
        container,
        slot,
        handles,
        provenanceHandle,
      ),
    );
    return {
      records,
      slot,
      claimHandles: handles.claimHandles,
      issues: [],
      resourceIssues: [],
    };
  }

  private publishRuntimeHtmlDuplicateResourceIssue(
    local: string,
    publication: DiResourceSlotPublication,
    sourceAddressHandle: AddressHandle | null,
    provenanceHandle: ProvenanceHandle,
  ): ResourceIssuePublication | null {
    if (publication.projectKey == null || publication.duplicateDiagnostic == null) {
      return null;
    }
    return this.resourceIssuePublisher.publish(
      `${local}:duplicate-resource-key`,
      publication.projectKey,
      publication.resourceIdentityHandle,
      provenanceHandle,
      ResourceIssuePhase.ResourceRegistration,
      publication.duplicateDiagnostic.issueKind,
      publication.duplicateDiagnostic.message,
      publication.duplicateDiagnostic.frameworkErrorCode,
      sourceAddressHandle,
      'warning',
    );
  }

  private resourceSlotHandles(
    container: Container,
    local: string,
    resourceKey: string,
  ): DiResourceSlotHandles {
    const slotLocal = `di-resource-slot:${container.productHandle}:${resourceKey}`;
    return new DiResourceSlotHandles(
      slotLocal,
      this.store.handles.product(slotLocal),
      this.store.handles.identity(slotLocal),
      this.store.handles.identity(`di-key:resource:${resourceKey}`),
      this.store.handles.claim(`${local}:provides-key`),
    );
  }

  private resourceSlotForPublication(
    container: Container,
    publication: DiResourceSlotPublication,
    resourceKey: string,
    handles: DiResourceSlotHandles,
  ): ContainerResourceSlot {
    return new ContainerResourceSlot(
      handles.productHandle,
      container.toReference(),
      resourceKey,
      handles.keyIdentityHandle,
      publication.resourceIdentityHandle,
      publication.resourceProductHandle,
      null,
      this.resourceSlotSourceAddress(container, publication),
      [],
    );
  }

  private resourceSlotSourceAddress(
    container: Container,
    publication: DiResourceSlotPublication,
  ): AddressHandle | null {
    return publication.sourceAddressHandle ?? container.sourceAddressHandle;
  }

  private recordsForResourceSlotProduct(
    container: Container,
    slot: ContainerResourceSlot,
    handles: DiResourceSlotHandles,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return [
      this.resourceSlotIdentity(container, slot, handles),
      this.resourceSlotProvidesKeyClaim(slot, handles, provenanceHandle),
      this.resourceSlotProduct(slot, handles, provenanceHandle),
      this.resourceSlotMaterialization(slot, handles),
    ];
  }

  private resourceSlotIdentity(
    container: Container,
    slot: ContainerResourceSlot,
    handles: DiResourceSlotHandles,
  ): DiProductIdentity {
    return new DiProductIdentity(
      handles.identityHandle,
      KernelVocabulary.Di.ResourceSlot.key,
      container.identityHandle,
      slot.resourceIdentityHandle,
      slot.sourceAddressHandle,
    );
  }

  private resourceSlotProvidesKeyClaim(
    slot: ContainerResourceSlot,
    handles: DiResourceSlotHandles,
    provenanceHandle: ProvenanceHandle,
  ): SemanticClaim {
    return new SemanticClaim(
      handles.claimHandle,
      slot.productHandle,
      KernelVocabulary.Di.ProvidesKey.key,
      handles.keyIdentityHandle,
      provenanceHandle,
    );
  }

  private resourceSlotProduct(
    slot: ContainerResourceSlot,
    handles: DiResourceSlotHandles,
    provenanceHandle: ProvenanceHandle,
  ): MaterializedProduct {
    return new MaterializedProduct(
      slot.productHandle,
      KernelVocabulary.Di.ResourceSlot.key,
      handles.identityHandle,
      slot.sourceAddressHandle,
      provenanceHandle,
    );
  }

  private resourceSlotMaterialization(
    slot: ContainerResourceSlot,
    handles: DiResourceSlotHandles,
  ): MaterializationRecord {
    return new MaterializationRecord(
      this.store.handles.materialization(handles.slotLocal),
      handles.identityHandle,
      [slot.productHandle],
      handles.claimHandles,
    );
  }
}

function runtimeHtmlDuplicateDiagnosticForKind(
  resourceKind: ResourceDefinitionKind,
  resourceName: string,
): RuntimeHtmlResourceDuplicateDiagnostic | null {
  switch (resourceKind) {
    case ResourceDefinitionKind.CustomElement:
      return {
        issueKind: ResourceIssueKind.CustomElementAlreadyRegistered,
        frameworkErrorCode: ResourceFrameworkErrorCode.ElementExisted,
        message: `Element "${resourceName}" has already been registered.`,
      };
    case ResourceDefinitionKind.CustomAttribute:
    case ResourceDefinitionKind.TemplateController:
      return {
        issueKind: ResourceIssueKind.CustomAttributeAlreadyRegistered,
        frameworkErrorCode: ResourceFrameworkErrorCode.AttributeExisted,
        message: `Attribute "${resourceName}" has already been registered.`,
      };
    case ResourceDefinitionKind.ValueConverter:
      return {
        issueKind: ResourceIssueKind.ValueConverterAlreadyRegistered,
        frameworkErrorCode: ResourceFrameworkErrorCode.ValueConverterExisted,
        message: `Value converter ${resourceName} has already been registered.`,
      };
    case ResourceDefinitionKind.BindingBehavior:
      return {
        issueKind: ResourceIssueKind.BindingBehaviorAlreadyRegistered,
        frameworkErrorCode: ResourceFrameworkErrorCode.BindingBehaviorExisted,
        message: `Binding behavior ${resourceName} has already been registered.`,
      };
    case ResourceDefinitionKind.BindingCommand:
    case ResourceDefinitionKind.AttributePattern:
      return null;
  }
}

function resourceRegistrationName(definition: FullResourceDefinition): string | null {
  return 'name' in definition ? definition.name : null;
}

export class DiContainerSelfResolverPublicationMaterializer {
  constructor(
    private readonly store: KernelStore,
    private readonly keyIdentityEmitter: DiKeyIdentityEmitter,
  ) {}

  recordsForContainerSelfResolver(container: Container): DiProductEmission<ContainerSelfResolverSlot> {
    const local = `di-self-resolver:${container.productHandle}`;
    const source = recordsForDiSource(
      this.store,
      `${local}:source`,
      'Container constructor installs the built-in IContainer self resolver.',
      container.sourceAddressHandle,
    );
    const records: KernelStoreRecord[] = [...source.records];
    const handles = this.containerSelfResolverHandles(local);
    this.keyIdentityEmitter.emitInterfaceKeyIdentity(
      records,
      handles.keyIdentityHandle,
      'IContainer',
      container.sourceAddressHandle,
    );

    const slot = this.containerSelfResolverSlot(
      handles.productHandle,
      container,
      handles.keyIdentityHandle,
    );
    records.push(
      ...this.recordsForContainerSelfResolverProduct(
        local,
        container,
        slot,
        handles,
        source.provenanceHandle,
      ),
    );
    return new DiProductEmission(records, slot, handles.productHandle, handles.identityHandle);
  }

  private containerSelfResolverHandles(local: string): DiContainerSelfResolverHandles {
    return new DiContainerSelfResolverHandles(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      this.store.handles.identity('di-key:interface:IContainer'),
      this.store.handles.claim(`${local}:provides-key`),
      this.store.handles.claim(`${local}:container-produces-product`),
    );
  }

  private containerSelfResolverSlot(
    productHandle: ProductHandle,
    container: Container,
    keyIdentityHandle: IdentityHandle,
  ): ContainerSelfResolverSlot {
    return new ContainerSelfResolverSlot(
      productHandle,
      container.toReference(),
      keyIdentityHandle,
      container.sourceAddressHandle,
      [],
    );
  }

  private recordsForContainerSelfResolverProduct(
    local: string,
    container: Container,
    slot: ContainerSelfResolverSlot,
    handles: DiContainerSelfResolverHandles,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return [
      this.containerSelfResolverIdentity(container, handles),
      ...this.containerSelfResolverClaims(container, slot, handles, provenanceHandle),
      this.containerSelfResolverProduct(slot, handles, container.sourceAddressHandle, provenanceHandle),
      this.containerSelfResolverMaterialization(local, slot, handles),
    ];
  }

  private containerSelfResolverIdentity(
    container: Container,
    handles: DiContainerSelfResolverHandles,
  ): DiProductIdentity {
    return new DiProductIdentity(
      handles.identityHandle,
      KernelVocabulary.Di.SelfResolverSlot.key,
      container.identityHandle,
      handles.keyIdentityHandle,
      container.sourceAddressHandle,
    );
  }

  private containerSelfResolverClaims(
    container: Container,
    slot: ContainerSelfResolverSlot,
    handles: DiContainerSelfResolverHandles,
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    return [
      new SemanticClaim(
        handles.providesKeyClaimHandle,
        slot.productHandle,
        KernelVocabulary.Di.ProvidesKey.key,
        handles.keyIdentityHandle,
        provenanceHandle,
      ),
      new SemanticClaim(
        handles.producedClaimHandle,
        container.productHandle,
        KernelVocabulary.Di.ProducesProduct.key,
        slot.productHandle,
        provenanceHandle,
      ),
    ];
  }

  private containerSelfResolverProduct(
    slot: ContainerSelfResolverSlot,
    handles: DiContainerSelfResolverHandles,
    sourceAddressHandle: AddressHandle | null,
    provenanceHandle: ProvenanceHandle,
  ): MaterializedProduct {
    return new MaterializedProduct(
      slot.productHandle,
      KernelVocabulary.Di.SelfResolverSlot.key,
      handles.identityHandle,
      sourceAddressHandle,
      provenanceHandle,
    );
  }

  private containerSelfResolverMaterialization(
    local: string,
    slot: ContainerSelfResolverSlot,
    handles: DiContainerSelfResolverHandles,
  ): MaterializationRecord {
    return new MaterializationRecord(
      this.store.handles.materialization(local),
      handles.identityHandle,
      [slot.productHandle],
      handles.claimHandles,
    );
  }
}
