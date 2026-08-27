import { SemanticClaim } from '../kernel/claim.js';
import {
  OpenSeam,
  type OpenSeamReasonKind,
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
import { recordsForSourceOpenSeam } from '../kernel/source-open-seam.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import {
  KernelVocabulary,
  type OpenSeamKindKey,
  type ProductKindKey,
} from '../kernel/vocabulary.js';
import type { StaticProjectEvaluationSourceIndex } from '../evaluation/project-source-index.js';
import {
  evaluationOpenSeamDefaultReasonKinds,
  type EvaluationOpenSeam,
} from '../evaluation/seams.js';
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
  ResourceIssueRelatedInformation,
} from '../resources/resource-issue.js';
import {
  type ResourceIssuePublication,
  ResourceIssuePublisher,
} from '../resources/resource-issue-publication.js';
import type {
  RegistrationAdmissionField,
  RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import {
  type FrameworkRegistrationKind,
  RegistryBodyKind,
  RegistrationKeyReference,
  RegistrationValueReference,
} from '../registration/registration-reference.js';
import { frameworkRegistrationModuleNamesForCapability } from '../registration/framework-registration-manifest.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  frameworkDiRegistrationEffectsForKind,
  type FrameworkAppTaskEffect,
  type FrameworkFactoryEffect,
  type FrameworkResolverEffect,
} from './framework-registration-effects.js';
import type { Container } from './container.js';
import type { ContainerLookupKey } from './container-key.js';
import { type ContainerRegistrationOperation } from './container-registration.js';
import {
  ParameterizedRegistry,
  type RegistryField,
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
import {
  type DiKeyIdentityEmitter,
  type DiKeyIdentityEmission,
  resourceDiKeyIdentityLocal,
} from './di-key-identity-emitter.js';
import {
  FrameworkIntrinsicDiKey,
  frameworkIntrinsicDiKeyLocal,
} from './framework-intrinsic-di-key.js';
import { DiIssuePublisher } from './di-issue-publication.js';
import { InstanceProvider } from './instance-provider.js';
import {
  Resolver,
  type ResolverField,
  ResolverStrategy,
} from './resolver.js';
import { DiResourceSlotExclusion } from './world-construction.js';

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

/** One framework-created InstanceProvider and the container resolver-map row that exposes it. */
export class DiInstanceProviderPublication {
  constructor(
    readonly local: string,
    readonly container: Container,
    readonly ownerIdentityHandle: IdentityHandle,
    readonly keyIdentityHandle: IdentityHandle,
    readonly provider: InstanceProvider,
    readonly providerIdentityHandle: IdentityHandle,
    readonly resolverSlot: ContainerResolverSlot,
    readonly resolverSlotIdentityHandle: IdentityHandle,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}

  get productHandles(): readonly ProductHandle[] {
    return [this.provider.productHandle, this.resolverSlot.productHandle];
  }
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
  readonly additionalClaimHandles: readonly ClaimHandle[];
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
    readonly resourceSlotExclusions: readonly DiResourceSlotExclusion[] = [],
  ) {}
}

export class DiRegistrationOperationEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly product: ContainerRegistrationOperation,
    readonly containerProducesOperationClaimHandle: ClaimHandle,
    readonly operationAppliesAdmissionClaimHandle: ClaimHandle,
    readonly operationUsesRegistrationValueClaimHandle: ClaimHandle | null,
  ) {}
}

export class DiRegistrationOperationHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly containerProducesOperationClaimHandle: ClaimHandle,
    readonly operationAppliesAdmissionClaimHandle: ClaimHandle,
    readonly operationUsesRegistrationValueClaimHandle: ClaimHandle,
  ) {}
}

export class DiClaimEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly handles: readonly ClaimHandle[],
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
      [spec.providesKeyClaimHandle, ...spec.additionalClaimHandles],
    ),
  ];
}

/** Publishes runtime-html's constructor/context InstanceProvider objects without routing them through app registrations. */
export class DiInstanceProviderPublicationMaterializer {
  constructor(
    private readonly store: KernelStore,
  ) {}

  prepare(
    local: string,
    container: Container,
    ownerIdentityHandle: IdentityHandle,
    keyIdentityHandle: IdentityHandle,
    friendlyName: string,
    instance: RegistrationValueReference | null,
    type: ContainerLookupKey | null,
    sourceAddressHandle: AddressHandle | null,
  ): DiInstanceProviderPublication {
    const provider = new InstanceProvider(
      this.store.handles.product(`${local}:provider`),
      this.store.handles.identity(`${local}:provider`),
      friendlyName,
      instance,
      type,
      sourceAddressHandle,
      [],
    );
    const resolverSlot = new ContainerResolverSlot(
      this.store.handles.product(`${local}:resolver-slot`),
      container.toReference(),
      keyIdentityHandle,
      provider,
      provider.productHandle,
      ResolverStrategy.instance,
      false,
      sourceAddressHandle,
      [],
    );
    return new DiInstanceProviderPublication(
      local,
      container,
      ownerIdentityHandle,
      keyIdentityHandle,
      provider,
      provider.identityHandle,
      resolverSlot,
      this.store.handles.identity(`${local}:resolver-slot`),
      sourceAddressHandle,
    );
  }

  recordsFor(
    publication: DiInstanceProviderPublication,
    provenanceHandle: ProvenanceHandle,
    producerClaimHandlesByProduct: ReadonlyMap<ProductHandle, ClaimHandle>,
  ): readonly KernelStoreRecord[] {
    return this.recordsForPublication(
      publication,
      provenanceHandle,
      [producerClaimHandleFor(publication.provider.productHandle, producerClaimHandlesByProduct)],
      [producerClaimHandleFor(publication.resolverSlot.productHandle, producerClaimHandlesByProduct)],
    );
  }

  /** Publish a framework-created contextual provider whose owning container operation is its complete producer. */
  recordsForContextual(
    publication: DiInstanceProviderPublication,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return this.recordsForPublication(publication, provenanceHandle, [], []);
  }

  private recordsForPublication(
    publication: DiInstanceProviderPublication,
    provenanceHandle: ProvenanceHandle,
    providerAdditionalClaimHandles: readonly ClaimHandle[],
    resolverSlotAdditionalClaimHandles: readonly ClaimHandle[],
  ): readonly KernelStoreRecord[] {
    const providerProducedClaimHandle = this.store.handles.claim(`${publication.local}:container-produces-provider`);
    const slotProducedClaimHandle = this.store.handles.claim(`${publication.local}:container-produces-resolver-slot`);
    return [
      new SemanticClaim(
        providerProducedClaimHandle,
        publication.container.productHandle,
        KernelVocabulary.Di.ProducesProduct.key,
        publication.provider.productHandle,
        provenanceHandle,
      ),
      ...recordsForPublishedDiProduct(this.store, {
        productKindKey: KernelVocabulary.Di.Resolver.key,
        productHandle: publication.provider.productHandle,
        identityHandle: publication.providerIdentityHandle,
        parentIdentityHandle: publication.container.identityHandle,
        ownerIdentityHandle: publication.ownerIdentityHandle,
        sourceAddressHandle: publication.sourceAddressHandle,
        providesKeyClaimHandle: this.store.handles.claim(`${publication.local}:provider-provides-key`),
        keyIdentityHandle: publication.keyIdentityHandle,
        provenanceHandle,
        materializationLocal: `${publication.local}:provider`,
        additionalClaimHandles: [
          providerProducedClaimHandle,
          ...providerAdditionalClaimHandles,
        ],
      }),
      new SemanticClaim(
        slotProducedClaimHandle,
        publication.container.productHandle,
        KernelVocabulary.Di.ProducesProduct.key,
        publication.resolverSlot.productHandle,
        provenanceHandle,
      ),
      ...recordsForPublishedDiProduct(this.store, {
        productKindKey: KernelVocabulary.Di.ResolverSlot.key,
        productHandle: publication.resolverSlot.productHandle,
        identityHandle: publication.resolverSlotIdentityHandle,
        parentIdentityHandle: publication.container.identityHandle,
        ownerIdentityHandle: publication.ownerIdentityHandle,
        sourceAddressHandle: publication.sourceAddressHandle,
        providesKeyClaimHandle: this.store.handles.claim(`${publication.local}:resolver-slot-provides-key`),
        keyIdentityHandle: publication.keyIdentityHandle,
        provenanceHandle,
        materializationLocal: `${publication.local}:resolver-slot`,
        additionalClaimHandles: [
          slotProducedClaimHandle,
          ...resolverSlotAdditionalClaimHandles,
        ],
      }),
    ];
  }
}

function producerClaimHandleFor(
  productHandle: ProductHandle,
  producerClaimHandlesByProduct: ReadonlyMap<ProductHandle, ClaimHandle>,
): ClaimHandle {
  const handle = producerClaimHandlesByProduct.get(productHandle);
  if (handle == null) {
    throw new Error(`DI product ${productHandle} has no exact configuration producer claim.`);
  }
  return handle;
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
  reasonKinds: readonly OpenSeamReasonKind[],
): {
  readonly records: readonly KernelStoreRecord[];
  readonly seam: OpenSeam;
} {
  const evidenceHandle = store.handles.evidence(local);
  const provenanceHandle = store.handles.provenance(local);
  const seamHandle = store.handles.openSeam(local);
  const seam = new OpenSeam(seamHandle, seamKindKey, summary, addressHandle, evidenceHandle, reasonKinds);
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

/** Retain candidate-local evaluator pressure at its exact source locus inside one DI application. */
export function recordsForDiEvaluationOpenSeams(
  store: KernelStore,
  sourceIndex: StaticProjectEvaluationSourceIndex,
  local: string,
  evaluationOpenSeams: readonly EvaluationOpenSeam[],
  fallbackAddressHandle: AddressHandle | null,
): {
  readonly records: readonly KernelStoreRecord[];
  readonly seams: readonly OpenSeam[];
} {
  const records: KernelStoreRecord[] = [];
  const seams: OpenSeam[] = [];
  evaluationOpenSeams.forEach((evaluationSeam, index) => {
    const sourceFile = evaluationSeam.node.getSourceFile();
    const sourceFileAddressHandle = sourceIndex.addressHandleForNode(evaluationSeam.node);
    const reasonKinds = evaluationSeam.reasonKinds.length === 0
      ? evaluationOpenSeamDefaultReasonKinds(evaluationSeam.seamKind)
      : evaluationSeam.reasonKinds;
    const seamLocal = `${local}:${index}`;
    const emission = sourceFileAddressHandle == null
      ? recordsForDiOpenSeam(
          store,
          seamLocal,
          evaluationSeam.seamKind,
          evaluationSeam.summary,
          fallbackAddressHandle,
          reasonKinds,
        )
      : (() => {
          const sourceEmission = recordsForSourceOpenSeam(store, {
            localKey: seamLocal,
            openKind: evaluationSeam.seamKind,
            summary: evaluationSeam.summary,
            sourceFileAddressHandle,
            start: evaluationSeam.node.getStart(sourceFile),
            end: evaluationSeam.node.end,
            evidenceRoles: [EvidenceRole.Diagnostic, EvidenceRole.Registration],
            reasonKinds,
          });
          const seam = sourceEmission.records.find((record): record is OpenSeam =>
            record instanceof OpenSeam && record.handle === sourceEmission.handle
          );
          if (seam == null) {
            throw new Error('DI evaluator-pressure publication did not emit its promised open seam.');
          }
          return { records: sourceEmission.records, seam };
        })();
    records.push(...emission.records);
    seams.push(emission.seam);
  });
  return { records, seams };
}

export class DiRegistryPublicationMaterializer {
  constructor(private readonly store: KernelStore) {}

  /** Publish one reusable ParameterizedRegistry independently from any container application. */
  recordsForCanonicalParameterizedRegistry(
    key: RegistrationKeyReference,
    params: readonly RegistrationValueReference[],
    sourceAddressHandle: AddressHandle | null,
    fieldProvenance: readonly FieldProvenance<RegistryField>[],
    ownerIdentityHandle: IdentityHandle | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly registry: ParameterizedRegistry;
  } {
    const registry = new ParameterizedRegistry(
      this.store.handles.product(`${local}:parameterized-registry`),
      this.store.handles.identity(`${local}:parameterized-registry`),
      key,
      params,
      sourceAddressHandle,
      fieldProvenance,
    );
    return {
      records: this.recordsForParameterizedRegistryProduct(
        local,
        null,
        ownerIdentityHandle,
        sourceAddressHandle,
        registry,
        provenanceHandle,
        [],
      ),
      registry,
    };
  }

  /** Publish one reusable IRegistry-shaped runtime value independently from any container application. */
  recordsForCanonicalRegistry(
    registryValue: RegistrationValueReference | null,
    sourceAddressHandle: AddressHandle | null,
    fieldProvenance: readonly FieldProvenance<RegistryField>[],
    ownerIdentityHandle: IdentityHandle | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly registry: RegistryValue;
  } {
    const registry = new RegistryValue(
      this.store.handles.product(`${local}:registry`),
      this.store.handles.identity(`${local}:registry`),
      registryValue,
      sourceAddressHandle,
      fieldProvenance,
    );
    return {
      records: this.recordsForRegistryProduct(
        local,
        null,
        ownerIdentityHandle,
        sourceAddressHandle,
        registry,
        provenanceHandle,
        [],
      ),
      registry,
    };
  }

  private recordsForParameterizedRegistryProduct(
    local: string,
    containerIdentityHandle: IdentityHandle | null,
    ownerIdentityHandle: IdentityHandle | null,
    sourceAddressHandle: AddressHandle | null,
    registry: ParameterizedRegistry,
    provenanceHandle: ProvenanceHandle,
    openSeamHandles: readonly OpenSeamHandle[],
  ): readonly KernelStoreRecord[] {
    return [
      new DiProductIdentity(
        registry.identityHandle,
        KernelVocabulary.Di.ParameterizedRegistry.key,
        containerIdentityHandle,
        ownerIdentityHandle,
        sourceAddressHandle,
      ),
      new MaterializedProduct(
        registry.productHandle,
        KernelVocabulary.Di.ParameterizedRegistry.key,
        registry.identityHandle,
        sourceAddressHandle,
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

  private recordsForRegistryProduct(
    local: string,
    containerIdentityHandle: IdentityHandle | null,
    ownerIdentityHandle: IdentityHandle | null,
    sourceAddressHandle: AddressHandle | null,
    registry: RegistryValue,
    provenanceHandle: ProvenanceHandle,
    openSeamHandles: readonly OpenSeamHandle[],
  ): readonly KernelStoreRecord[] {
    return [
      new DiProductIdentity(
        registry.identityHandle,
        KernelVocabulary.Di.Registry.key,
        containerIdentityHandle,
        ownerIdentityHandle,
        sourceAddressHandle,
      ),
      new MaterializedProduct(
        registry.productHandle,
        KernelVocabulary.Di.Registry.key,
        registry.identityHandle,
        sourceAddressHandle,
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
    private readonly publication: KernelPublicationContext,
    private readonly keyIdentityEmitter: DiKeyIdentityEmitter,
  ) {}

  recordsForFrameworkAppTaskEffect(
    admission: RegistrationAdmissionProduct,
    effect: FrameworkAppTaskEffect,
    typeSystem: TypeSystemProject,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiFrameworkAppTaskPublicationEmission {
    const records: KernelStoreRecord[] = [];
    const keyIdentity = emitFrameworkEffectKeyIdentity(
      records,
      this.store,
      this.publication,
      this.keyIdentityEmitter,
      typeSystem,
      effect,
      local,
      admission.sourceAddressHandle,
    );

    const task = this.frameworkAppTaskDefinition(admission, effect, local, keyIdentity);
    records.push(...this.recordsForFrameworkAppTaskProduct(admission, effect, local, task, provenanceHandle));

    return new DiFrameworkAppTaskPublicationEmission(records, task);
  }

  private frameworkAppTaskDefinition(
    admission: RegistrationAdmissionProduct,
    effect: FrameworkAppTaskEffect,
    local: string,
    keyIdentity: DiKeyIdentityEmission,
  ): AppTaskDefinition {
    return new AppTaskDefinition(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      effect.slot,
      AppTaskCallbackKind.ResolvedKey,
      new RegistrationKeyReference(
        keyIdentity.identityHandle,
        admission.sourceAddressHandle,
        effect.keyName,
        keyIdentity.keyKind,
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

export function summaryForParameterizedRegistryResult(state: RegistryRegistrationState): string {
  switch (state) {
    case RegistryRegistrationState.Delegated:
      return 'ParameterizedRegistry found a registry key, but delegated registry body interpretation is still open.';
    case RegistryRegistrationState.ParameterAdmission:
      return 'ParameterizedRegistry fell back to registering object parameters; recursive parameter spending is still open.';
    case RegistryRegistrationState.Open:
      return 'ParameterizedRegistry could not close its registry key or parameter registration behavior yet.';
  }
}

export function summaryForRegistryValueOpen(
  registryValue: RegistrationValueReference | null,
): string | null {
  switch (registryValue?.registryBody?.bodyKind) {
    case RegistryBodyKind.AliasedResourcesRegistry:
      return 'aliasedResourcesRegistry(...) module input or alias arguments are not statically closed enough for registry body interpretation.';
    case RegistryBodyKind.TemplateCompilerHooks:
      return 'TemplateCompilerHooks registry target did not close to one constructable hook provider.';
    case undefined:
      break;
  }
  const frameworkKind = registryValue?.frameworkKind;
  if (frameworkKind != null) {
    return frameworkDiRegistrationEffectsForKind(frameworkKind).openSummary;
  }
  return 'IRegistry registration body has not been interpreted by DI world construction yet.';
}

export interface DiResolverPublication {
  readonly ownerIdentityHandle: IdentityHandle;
  readonly key: RegistrationKeyReference;
  readonly keyIdentityHandle: IdentityHandle;
  readonly strategy: ResolverStrategy;
  readonly state: RegistrationValueReference | null;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly fieldProvenance: readonly FieldProvenance<ResolverField>[];
}

export interface DiResolverPublicationEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly resolver: Resolver;
  readonly resolverSlot: ContainerResolverSlot;
}

/** Preserve key/state witness precision while projecting registration facts into a runtime Resolver. */
export function resolverFieldProvenanceForRegistration(
  provenance: readonly FieldProvenance<RegistrationAdmissionField>[],
): readonly FieldProvenance<ResolverField>[] {
  return compactFieldProvenance<ResolverField>(provenance.map((entry) => {
    switch (entry.field) {
      case 'targetKey':
        return new FieldProvenance('_key', entry.provenanceHandle);
      case 'registeredValue':
        return new FieldProvenance('_state', entry.provenanceHandle);
      case 'strategy':
        return new FieldProvenance('_strategy', entry.provenanceHandle);
      case 'source':
        return new FieldProvenance('source', entry.provenanceHandle);
      case 'admissionKind':
      case 'keyRole':
      case 'registryParameters':
      case 'resourceLookupNameOverride':
        return null;
    }
  }));
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
    readonly exclusions: readonly DiResourceSlotExclusion[] = [],
  ) {}
}

interface ResourceDuplicateDiagnostic {
  readonly issueKind: ResourceIssueKind;
  readonly frameworkErrorCode: string | null;
  readonly message: string;
}

class DiResourceSlotPublication {
  constructor(
    readonly resourceKind: ResourceDefinitionKind,
    readonly lookupName: string,
    readonly registrationName: string,
    readonly resourceIdentityHandle: IdentityHandle,
    readonly resourceProductHandle: ProductHandle,
    /** Registration site that owns the container slot. */
    readonly registrationSourceAddressHandle: AddressHandle | null,
    /** Best available witness for this runtime key; registration-site fallback when key-local syntax is absent. */
    readonly keySourceAddressHandle: AddressHandle | null,
    readonly projectKey: string | null,
    readonly duplicateDiagnostic: ResourceDuplicateDiagnostic | null,
  ) {}
}

class DiResourceSlotHandles {
  constructor(
    readonly slotLocal: string,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly keyIdentityHandle: IdentityHandle,
    readonly providesKeyClaimHandle: ClaimHandle,
    readonly producedClaimHandle: ClaimHandle,
    readonly importedFromClaimHandle: ClaimHandle | null,
  ) {}

  get claimHandles(): readonly ClaimHandle[] {
    return [
      this.providesKeyClaimHandle,
      this.producedClaimHandle,
      ...(this.importedFromClaimHandle == null ? [] : [this.importedFromClaimHandle]),
    ];
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
    private readonly publication: KernelPublicationContext,
    private readonly keyIdentityEmitter: DiKeyIdentityEmitter,
  ) {}

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

  /** Publish one reusable runtime Resolver independently from any container application. */
  recordsForCanonicalResolver(
    publication: DiResolverPublication,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly resolver: Resolver;
  } {
    const handles = this.resolverPublicationHandles(local);
    const resolver = this.resolverForPublication(publication, handles);
    return {
      records: this.recordsForPublishedResolver(
        null,
        publication,
        resolver,
        handles,
        local,
        provenanceHandle,
      ),
      resolver,
    };
  }

  /** Publish the container-owned slot created when an existing Resolver is registered. */
  recordsForCanonicalResolverSlot(
    container: Container,
    publication: DiResolverPublication,
    resolver: Resolver,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly resolverSlot: ContainerResolverSlot;
  } {
    const handles = this.resolverPublicationHandles(local);
    const resolverSlot = this.resolverSlotForPublication(container, publication, resolver, handles);
    return {
      records: this.recordsForPublishedResolverSlot(
        container,
        publication,
        resolverSlot,
        handles,
        local,
        provenanceHandle,
      ),
      resolverSlot,
    };
  }

  recordsForFrameworkResolverEffect(
    container: Container,
    admission: RegistrationAdmissionProduct,
    frameworkKind: FrameworkRegistrationKind,
    effect: FrameworkResolverEffect,
    typeSystem: TypeSystemProject,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly resolver: Resolver;
    readonly resolverSlot: ContainerResolverSlot;
  } {
    const records: KernelStoreRecord[] = [];
    const keyIdentity = emitFrameworkEffectKeyIdentity(
      records,
      this.store,
      this.publication,
      this.keyIdentityEmitter,
      typeSystem,
      effect,
      local,
      admission.sourceAddressHandle,
    );

    const publication = this.frameworkResolverPublication(
      admission,
      frameworkKind,
      effect,
      keyIdentity,
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
    typeSystem: TypeSystemProject,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiFactoryPublicationEmission {
    const records: KernelStoreRecord[] = [];
    const keyIdentity = emitFrameworkEffectKeyIdentity(
      records,
      this.store,
      this.publication,
      this.keyIdentityEmitter,
      typeSystem,
      effect,
      local,
      admission.sourceAddressHandle,
    );

    const identityHandle = this.store.handles.identity(`${local}:factory-slot`);
    const slot = new ContainerFactorySlot(
      this.store.handles.product(`${local}:factory-slot`),
      container.toReference(),
      keyIdentity.identityHandle,
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
      keyIdentityHandle: keyIdentity.identityHandle,
      provenanceHandle,
      materializationLocal: `${local}:factory-slot`,
      additionalClaimHandles: [],
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
      publication.fieldProvenance,
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
    container: Container | null,
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
      parentIdentityHandle: container?.identityHandle ?? null,
      ownerIdentityHandle: publication.ownerIdentityHandle,
      sourceAddressHandle: publication.sourceAddressHandle,
      providesKeyClaimHandle: handles.resolverProvidesKeyClaimHandle,
      keyIdentityHandle: publication.keyIdentityHandle,
      provenanceHandle,
      materializationLocal: `${local}:resolver`,
      additionalClaimHandles: [],
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
      additionalClaimHandles: [],
    });
  }

  private frameworkResolverPublication(
    admission: RegistrationAdmissionProduct,
    frameworkKind: FrameworkRegistrationKind,
    effect: FrameworkResolverEffect,
    keyIdentity: DiKeyIdentityEmission,
  ): DiResolverPublication {
    return {
      ownerIdentityHandle: admission.identityHandle,
      key: new RegistrationKeyReference(
        keyIdentity.identityHandle,
        admission.sourceAddressHandle,
        effect.keyName,
        keyIdentity.keyKind,
      ),
      keyIdentityHandle: keyIdentity.identityHandle,
      strategy: effect.strategy,
      state: effect.valueKind == null
        ? null
        : new RegistrationValueReference(
          effect.valueKind,
          null,
          null,
          admission.sourceAddressHandle,
          effect.valueName,
          frameworkKind,
        ),
      sourceAddressHandle: admission.sourceAddressHandle,
      fieldProvenance: [],
    };
  }
}

function emitFrameworkEffectKeyIdentity(
  records: KernelStoreRecord[],
  store: KernelStore,
  publication: KernelPublicationContext,
  emitter: DiKeyIdentityEmitter,
  typeSystem: TypeSystemProject,
  effect: FrameworkResolverEffect | FrameworkFactoryEffect | FrameworkAppTaskEffect,
  local: string,
  sourceAddressHandle: AddressHandle | null,
): DiKeyIdentityEmission {
  return emitter.emitExportedKeyIdentity(
    records,
    publication,
    typeSystem,
    frameworkRegistrationModuleNamesForCapability(effect.capability),
    effect.keyName,
    store.handles.identity(`${local}:key:${effect.keyName}`),
    sourceAddressHandle,
  );
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
    registrationSourceAddressHandle: AddressHandle | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
    projectKey: string | null,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly slot: ContainerResourceSlot | null;
    readonly claimHandles: readonly ClaimHandle[];
    readonly issues: readonly DiIssue[];
    readonly resourceIssues: readonly ResourceIssue[];
    readonly exclusions: readonly DiResourceSlotExclusion[];
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
        registrationSourceAddressHandle ?? definition.sourceAddressHandle,
        resourceKeySourceAddress(definition, lookupName, registrationSourceAddressHandle),
        projectKey,
        resourceDuplicateDiagnosticForLookup(definition.type, registrationName, lookupName),
      ),
      local,
      provenanceHandle,
    );
  }

  recordsForBuiltInResourceSlot(
    container: Container,
    resource: BuiltInResourceEmission['resource'],
    lookupName: string,
    registrationSourceAddressHandle: AddressHandle | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
    projectKey: string | null,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly slot: ContainerResourceSlot | null;
    readonly claimHandles: readonly ClaimHandle[];
    readonly issues: readonly DiIssue[];
    readonly resourceIssues: readonly ResourceIssue[];
    readonly exclusions: readonly DiResourceSlotExclusion[];
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
        registrationSourceAddressHandle ?? resource.sourceAddressHandle,
        resource.sourceAddressHandle,
        projectKey,
        resourceDuplicateDiagnosticForLookup(resource.resourceKind, resource.name, lookupName),
      ),
      local,
      provenanceHandle,
    );
  }

  /**
   * Copy one already-published runtime resource row into a child container.
   *
   * Aurelia's `createChild({ inheritParentResources: true })` and `useResources(...)` reuse the same resource
   * resolver under a new container-owned lookup row. The resource/key identities therefore stay stable while the
   * slot product and its import provenance belong to the receiving container.
   */
  recordsForImportedResourceSlot(
    container: Container,
    sourceSlot: ContainerResourceSlot,
    sourceAddressHandle: AddressHandle | null,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly slot: ContainerResourceSlot;
  } {
    const handles = this.importedResourceSlotHandles(container, sourceSlot);
    const slot = new ContainerResourceSlot(
      handles.productHandle,
      container.toReference(),
      sourceSlot.resourceKey,
      sourceSlot.keyIdentityHandle,
      sourceSlot.resourceIdentityHandle,
      sourceSlot.resourceProductHandle,
      sourceSlot.resolverProductHandle,
      sourceAddressHandle,
      sourceSlot.keySourceAddressHandle,
      [],
    );
    return {
      records: this.recordsForResourceSlotProduct(
        container,
        slot,
        handles,
        provenanceHandle,
        sourceSlot,
      ),
      slot,
    };
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
    readonly exclusions: readonly DiResourceSlotExclusion[];
  } | null {
    const resourceKey = runtimeResourceKeyForKind(publication.resourceKind, publication.lookupName);
    if (resourceKey == null) {
      return null;
    }
    const existingSlot = container.readResourceSlots().find((slot) => slot.resourceKey === resourceKey) ?? null;
    if (existingSlot != null) {
      const sourceAddressHandle = this.resourceSlotSourceAddress(container, publication);
      const exclusion = new DiResourceSlotExclusion(
        resourceKey,
        existingSlot,
        publication.resourceIdentityHandle,
        publication.resourceProductHandle,
        sourceAddressHandle,
        publication.keySourceAddressHandle,
      );
      const resourceIssue = this.publishRuntimeHtmlDuplicateResourceIssue(
        local,
        publication,
        existingSlot,
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
          exclusions: [exclusion],
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
        exclusions: [exclusion],
      };
    }

    const records: KernelStoreRecord[] = [];
    const handles = this.resourceSlotHandles(
      container,
      local,
      publication.resourceIdentityHandle,
      resourceKey,
    );
    this.keyIdentityEmitter.emitResourceKeyIdentity(
      records,
      handles.keyIdentityHandle,
      publication.resourceIdentityHandle,
      resourceKey,
      publication.keySourceAddressHandle,
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
      exclusions: [],
    };
  }

  private publishRuntimeHtmlDuplicateResourceIssue(
    local: string,
    publication: DiResourceSlotPublication,
    existingSlot: ContainerResourceSlot,
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
      existingSlot.sourceAddressHandle == null
        ? []
        : [new ResourceIssueRelatedInformation(
            'Resource was first registered here.',
            existingSlot.sourceAddressHandle,
          )],
      'warning',
    );
  }

  private resourceSlotHandles(
    container: Container,
    local: string,
    resourceIdentityHandle: IdentityHandle,
    resourceKey: string,
  ): DiResourceSlotHandles {
    const slotLocal = `di-resource-slot:${container.productHandle}:${resourceKey}`;
    return new DiResourceSlotHandles(
      slotLocal,
      this.store.handles.product(slotLocal),
      this.store.handles.identity(slotLocal),
      this.store.handles.identity(resourceDiKeyIdentityLocal(
        resourceIdentityHandle,
        resourceKey,
      )),
      this.store.handles.claim(`${local}:provides-key`),
      this.store.handles.claim(`${slotLocal}:container-produces-product`),
      null,
    );
  }

  private importedResourceSlotHandles(
    container: Container,
    sourceSlot: ContainerResourceSlot,
  ): DiResourceSlotHandles {
    const slotLocal = `di-resource-slot:${container.productHandle}:${sourceSlot.resourceKey}`;
    return new DiResourceSlotHandles(
      slotLocal,
      this.store.handles.product(slotLocal),
      this.store.handles.identity(slotLocal),
      sourceSlot.keyIdentityHandle,
      this.store.handles.claim(`${slotLocal}:provides-key`),
      this.store.handles.claim(`${slotLocal}:container-produces-product`),
      this.store.handles.claim(`${slotLocal}:imported-from:${sourceSlot.productHandle}`),
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
      publication.keySourceAddressHandle,
      [],
    );
  }

  private resourceSlotSourceAddress(
    container: Container,
    publication: DiResourceSlotPublication,
  ): AddressHandle | null {
    return publication.registrationSourceAddressHandle ?? container.sourceAddressHandle;
  }

  private recordsForResourceSlotProduct(
    container: Container,
    slot: ContainerResourceSlot,
    handles: DiResourceSlotHandles,
    provenanceHandle: ProvenanceHandle,
    importedFrom: ContainerResourceSlot | null = null,
  ): readonly KernelStoreRecord[] {
    return [
      this.resourceSlotIdentity(container, slot, handles),
      ...this.resourceSlotClaims(container, slot, handles, provenanceHandle, importedFrom),
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

  private resourceSlotClaims(
    container: Container,
    slot: ContainerResourceSlot,
    handles: DiResourceSlotHandles,
    provenanceHandle: ProvenanceHandle,
    importedFrom: ContainerResourceSlot | null,
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
      ...(handles.importedFromClaimHandle == null || importedFrom == null
        ? []
        : [new SemanticClaim(
            handles.importedFromClaimHandle,
            slot.productHandle,
            KernelVocabulary.Di.ResourceSlotImportedFrom.key,
            importedFrom.productHandle,
            provenanceHandle,
          )]),
    ];
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

function resourceDuplicateDiagnosticForLookup(
  resourceKind: ResourceDefinitionKind,
  resourceName: string,
  lookupName: string,
): ResourceDuplicateDiagnostic | null {
  if (lookupName !== resourceName) {
    return {
      issueKind: ResourceIssueKind.ResourceAliasAlreadyRegistered,
      frameworkErrorCode: null,
      message: `Resource alias "${lookupName}" is already registered; the first registration remains effective.`,
    };
  }
  return runtimeHtmlDuplicateDiagnosticForKind(resourceKind, resourceName);
}

function runtimeHtmlDuplicateDiagnosticForKind(
  resourceKind: ResourceDefinitionKind,
  resourceName: string,
): ResourceDuplicateDiagnostic | null {
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
      return {
        issueKind: ResourceIssueKind.BindingCommandAlreadyRegistered,
        frameworkErrorCode: ResourceFrameworkErrorCode.BindingCommandExisted,
        message: `Binding command ${resourceName} has already been registered.`,
      };
    case ResourceDefinitionKind.AttributePattern:
      return null;
  }
}

function resourceRegistrationName(definition: FullResourceDefinition): string | null {
  return 'name' in definition ? definition.name : null;
}

function resourceKeySourceAddress(
  definition: FullResourceDefinition,
  lookupName: string,
  registrationSourceAddressHandle: AddressHandle | null,
): AddressHandle | null {
  if (definition.type === ResourceDefinitionKind.AttributePattern) {
    return registrationSourceAddressHandle ?? definition.sourceAddressHandle;
  }
  if (lookupName === definition.name) {
    return definition.nameSourceAddressHandle ?? definition.sourceAddressHandle;
  }
  const alias = definition.aliases.find((candidate) => candidate.name === lookupName) ?? null;
  return alias?.addressHandle ?? registrationSourceAddressHandle ?? definition.sourceAddressHandle;
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
      FrameworkIntrinsicDiKey.IContainer,
      null,
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
      this.store.handles.identity(frameworkIntrinsicDiKeyLocal(FrameworkIntrinsicDiKey.IContainer)),
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
