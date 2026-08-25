import {
  SourceSpanRole,
} from '../kernel/address.js';
import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  ClaimHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  TypeScriptDeclarationIdentity,
} from '../kernel/identity.js';
import {
  compactFieldProvenance,
  fieldProvenanceWhenDistinct,
} from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import { Container } from '../di/container.js';
import {
  ContainerRootMaterializationRequest,
  ContainerRootMaterializer,
} from '../di/container-materializer.js';
import {
  DiKeyIdentityEmitter,
} from '../di/di-key-identity-emitter.js';
import {
  FrameworkIntrinsicDiKey,
} from '../di/framework-intrinsic-di-key.js';
import {
  DiInstanceProviderPublication,
  DiInstanceProviderPublicationMaterializer,
} from '../di/world-publication.js';
import {
  RegistrationValueKind,
  RegistrationValueReference,
} from '../registration/registration-reference.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import { ResourceTargetReference } from '../resources/resource-reference.js';
import {
  AppRoot,
  AppRootConfig,
  type AppRootConfigField,
} from './app-root.js';
import { Aurelia } from './aurelia.js';
import {
  AureliaContainerEvaluationKind,
  AureliaFacadeContainerState,
} from './aurelia-evaluation-runtime.js';
import { ConfigurationEvaluationBindingFrame } from './configuration-evaluation-bindings.js';
import {
  AppRootConfigObservation,
  ConfigurationStepObservation,
  ConfigurationTargetObservation,
} from './configuration-observation.js';
import type { ConfigurationRecognitionContext } from './configuration-recognition-context.js';
import {
  ConfigurationStepKind,
} from './configuration-sequence.js';
import {
  ConfigurationKernelPublication,
  ConfigurationSourceRecordSet,
} from './configuration-publication.js';

export class AureliaApplicationDraft {
  constructor(
    readonly local: string,
    readonly records: readonly KernelStoreRecord[],
    readonly targetIdentityHandle: IdentityHandle,
    readonly targetProductHandle: ProductHandle,
    readonly producedProductHandles: readonly ProductHandle[],
    readonly container: Container,
    readonly createdContainer: Container | null,
    readonly createdContainerRequest: ContainerRootMaterializationRequest | null,
    readonly containerProvenanceHandle: ProvenanceHandle | null,
    readonly aurelia: Aurelia,
    readonly createdAurelia: boolean,
    readonly aureliaSource: ConfigurationSourceRecordSet | null,
    readonly aureliaClaimHandles: readonly ClaimHandle[],
    readonly constructorProviders: readonly DiInstanceProviderPublication[],
    readonly appRootConfig: AppRootConfigEmission | null,
    readonly appRoot: AppRoot | null,
    readonly appRootClaimHandles: readonly ClaimHandle[],
  ) {}
}

export class AppRootConfigEmission {
  constructor(
    readonly local: string,
    readonly records: readonly KernelStoreRecord[],
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly config: AppRootConfig,
    readonly source: ConfigurationSourceRecordSet,
    readonly openSeamHandles: readonly OpenSeamHandle[],
  ) {}
}

class ConfigurationTargetEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly target: ResourceTargetReference,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

/** Prepares and publishes exact Aurelia facade creation and app-root operations. */
export class AureliaApplicationMaterializer {
  private readonly rootContainers: ContainerRootMaterializer;
  private readonly keyIdentities: DiKeyIdentityEmitter;
  private readonly instanceProviders: DiInstanceProviderPublicationMaterializer;
  private readonly kernelPublication: KernelPublicationContext;

  constructor(
    readonly store: KernelStore,
    readonly publication: ConfigurationKernelPublication,
    kernelPublication: KernelPublicationContext,
    readonly evaluationBindings: ConfigurationEvaluationBindingFrame,
  ) {
    this.kernelPublication = kernelPublication;
    this.rootContainers = new ContainerRootMaterializer(store, kernelPublication);
    this.keyIdentities = new DiKeyIdentityEmitter(kernelPublication);
    this.instanceProviders = new DiInstanceProviderPublicationMaterializer(store);
  }

  prepareStep(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationStepObservation,
    stepLocal: string,
    stepSource: ConfigurationSourceRecordSet,
    resources: ResourceDefinitionIndex | null,
  ): AureliaApplicationDraft | null {
    const aureliaEvaluation = observation.aureliaEvaluation;
    if (
      aureliaEvaluation == null
      || aureliaEvaluation.containerState !== AureliaFacadeContainerState.Closed
      || aureliaEvaluation.containerEvaluation == null
    ) {
      return null;
    }

    const records: KernelStoreRecord[] = [];
    const containerEvaluation = aureliaEvaluation.containerEvaluation;
    let container = this.evaluationBindings.containerForEvaluation(containerEvaluation);
    let createdContainer: Container | null = null;
    let containerRequest: ContainerRootMaterializationRequest | null = null;
    let containerProvenanceHandle: ProvenanceHandle | null = null;
    let aurelia = this.evaluationBindings.aureliaForEvaluation(aureliaEvaluation);
    let aureliaSource: ConfigurationSourceRecordSet | null = null;
    let aureliaClaimHandles: readonly ClaimHandle[] = [];
    let constructorProviders: readonly DiInstanceProviderPublication[] = [];
    const createsAurelia = aurelia == null && aureliaEvaluation.sourceNode === observation.sourceNode;
    if (aurelia == null && !createsAurelia) {
      throw new Error('An Aurelia facade use must be emitted after its exact creation operation.');
    }

    if (createsAurelia && container == null) {
      if (
        containerEvaluation.kind === AureliaContainerEvaluationKind.AuthoredRoot
        || containerEvaluation.kind === AureliaContainerEvaluationKind.AuthoredChild
      ) {
        throw new Error('An Aurelia facade using an authored container must be emitted after that container.');
      }
      const containerSource = this.publication.recordsForSource(
        context,
        containerEvaluation.sourceNode,
        `configuration-container:${stepLocal}:facade`,
        EvidenceKind.ConfigurationFlow,
        [EvidenceRole.Configuration],
        'Implicit Aurelia facade root container.',
        SourceSpanRole.Range,
      );
      records.push(...containerSource.records);
      containerRequest = new ContainerRootMaterializationRequest(
        `configuration-facade:${stepLocal}`,
        containerSource.addressHandle,
        observation.receiverLocalName,
      );
      container = this.rootContainers.create(containerRequest);
      createdContainer = container;
      containerProvenanceHandle = containerSource.provenanceHandle;
      this.evaluationBindings.bindContainer(containerEvaluation, container);
    }
    if (container == null) {
      throw new Error('A closed Aurelia facade evaluation must resolve one exact container.');
    }

    if (createsAurelia) {
      aureliaSource = stepSource;
      const handles = this.publication.configurationProductHandles(`configuration-aurelia:${stepLocal}`);
      const rootProviderKey = this.intrinsicKeyIdentity(
        records,
        FrameworkIntrinsicDiKey.IAppRoot,
        stepSource.addressHandle,
      );
      const rootProvider = this.instanceProviders.prepare(
        `configuration-aurelia:${stepLocal}:IAppRoot`,
        container,
        handles.identityHandle,
        rootProviderKey,
        'IAppRoot',
        null,
        null,
        stepSource.addressHandle,
      );
      aurelia = new Aurelia(
        handles.productHandle,
        handles.identityHandle,
        container.toReference(),
        rootProvider.provider,
        stepSource.addressHandle,
        [],
      );
      const aureliaValue = new RegistrationValueReference(
        RegistrationValueKind.Instance,
        aurelia.identityHandle,
        aurelia.productHandle,
        stepSource.addressHandle,
        'Aurelia',
      );
      const aureliaInterfaceKey = this.intrinsicKeyIdentity(
        records,
        FrameworkIntrinsicDiKey.IAurelia,
        stepSource.addressHandle,
      );
      const aureliaClassKey = this.aureliaClassKeyIdentity(context, records, stepLocal, stepSource.addressHandle);
      const aureliaInterfaceProvider = this.instanceProviders.prepare(
        `configuration-aurelia:${stepLocal}:IAurelia`,
        container,
        aurelia.identityHandle,
        aureliaInterfaceKey,
        'IAurelia',
        aureliaValue,
        null,
        stepSource.addressHandle,
      );
      const aureliaClassProvider = this.instanceProviders.prepare(
        `configuration-aurelia:${stepLocal}:Aurelia`,
        container,
        aurelia.identityHandle,
        aureliaClassKey,
        'Aurelia',
        aureliaValue,
        null,
        stepSource.addressHandle,
      );
      constructorProviders = [aureliaInterfaceProvider, aureliaClassProvider, rootProvider];
      constructorProviders.forEach((provider) => container.registerResolver(provider.resolverSlot));
      const ownsContainer = this.publication.recordsForAureliaOwnsContainerClaim(
        stepLocal,
        aurelia.productHandle,
        container.productHandle,
        stepSource.provenanceHandle,
      );
      records.push(...ownsContainer.records);
      aureliaClaimHandles = ownsContainer.handles;
      this.evaluationBindings.bindAurelia(aureliaEvaluation, aurelia);
    }
    if (aurelia == null) {
      throw new Error('A closed Aurelia facade operation must resolve one exact facade.');
    }

    const appRootConfig = observation.stepKind === ConfigurationStepKind.AureliaApp
      && observation.appRootConfig != null
        ? this.recordsForAppRootConfig(context, observation.appRootConfig, stepLocal, resources)
        : null;
    records.push(...(appRootConfig?.records ?? []));
    const appRoot = appRootConfig == null
      ? null
      : this.appRootForStep(stepLocal, container, appRootConfig);
    if (appRoot != null) {
      aurelia.rootProvider.prepare(new RegistrationValueReference(
        RegistrationValueKind.Instance,
        appRoot.identityHandle,
        appRoot.productHandle,
        appRoot.sourceAddressHandle,
        'IAppRoot',
      ));
    }
    const appRootClaims = appRoot == null || appRootConfig == null
      ? []
      : this.recordsForAppRootClaims(stepLocal, aurelia, appRoot, appRootConfig, stepSource.provenanceHandle);
    records.push(...appRootClaims);
    const appRootClaimHandles = appRootClaims.map((claim) => claim.handle);

    const target = observation.stepKind === ConfigurationStepKind.CreateAurelia
      ? container
      : aurelia;
    return new AureliaApplicationDraft(
      stepLocal,
      records,
      target.identityHandle,
      target.productHandle,
      [
        ...(createdContainer == null ? [] : [createdContainer.productHandle]),
        ...(createsAurelia ? [aurelia.productHandle] : []),
        ...constructorProviders.flatMap((provider) => provider.productHandles),
        ...(appRootConfig == null ? [] : [appRootConfig.productHandle]),
        ...(appRoot == null ? [] : [appRoot.productHandle]),
      ],
      container,
      createdContainer,
      containerRequest,
      containerProvenanceHandle,
      aurelia,
      createsAurelia,
      aureliaSource,
      aureliaClaimHandles,
      constructorProviders,
      appRootConfig,
      appRoot,
      appRootClaimHandles,
    );
  }

  recordsForProducts(
    draft: AureliaApplicationDraft,
    producerClaimHandlesByProduct: ReadonlyMap<ProductHandle, ClaimHandle>,
  ): readonly KernelStoreRecord[] {
    const aureliaProvenanceHandle = draft.aureliaSource?.provenanceHandle ?? null;
    return [
      ...(draft.createdContainer == null
        || draft.createdContainerRequest == null
        || draft.containerProvenanceHandle == null
        ? []
        : this.rootContainers.recordsFor(
            draft.createdContainerRequest,
            draft.createdContainer,
            draft.containerProvenanceHandle,
            [producerClaimHandle(producerClaimHandlesByProduct, draft.createdContainer.productHandle)],
          )),
      ...(draft.createdAurelia && draft.aureliaSource != null
        ? this.recordsForAureliaProduct(draft, producerClaimHandlesByProduct)
        : []),
      ...(aureliaProvenanceHandle == null
        ? []
        : draft.constructorProviders.flatMap((provider) => this.instanceProviders.recordsFor(
            provider,
            aureliaProvenanceHandle,
            producerClaimHandlesByProduct,
          ))),
      ...(draft.appRootConfig == null
        ? []
        : this.recordsForAppRootConfigProduct(
            draft.appRootConfig,
            producerClaimHandlesByProduct,
          )),
      ...(draft.appRoot == null
        ? []
        : this.recordsForAppRootProduct(draft, producerClaimHandlesByProduct)),
    ];
  }

  private appRootForStep(
    stepLocal: string,
    container: Container,
    appRootConfig: AppRootConfigEmission,
  ): AppRoot {
    return new AppRoot(
      this.store.handles.product(`configuration-app-root:${stepLocal}`),
      this.store.handles.identity(`configuration-app-root:${stepLocal}`),
      appRootConfig.config,
      container.toReference(),
      appRootConfig.config.hostAddressHandle,
      appRootConfig.config.component,
      null,
      null,
      appRootConfig.config.sourceAddressHandle,
      [],
    );
  }

  private recordsForAppRootClaims(
    stepLocal: string,
    aurelia: Aurelia,
    appRoot: AppRoot,
    appRootConfig: AppRootConfigEmission,
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    const hasAppRoot = this.publication.recordsForAureliaHasAppRootClaim(
      stepLocal,
      aurelia.productHandle,
      appRoot.productHandle,
      provenanceHandle,
    );
    return [
      ...hasAppRoot.records.filter((record): record is SemanticClaim => record instanceof SemanticClaim),
      new SemanticClaim(
        this.store.handles.claim(`configuration-app-root:${stepLocal}:uses-config`),
        appRoot.productHandle,
        KernelVocabulary.Configuration.AppRootUsesConfig.key,
        appRootConfig.productHandle,
        provenanceHandle,
      ),
    ];
  }

  private recordsForAureliaProduct(
    draft: AureliaApplicationDraft,
    producerClaimHandlesByProduct: ReadonlyMap<ProductHandle, ClaimHandle>,
  ): readonly KernelStoreRecord[] {
    return this.publication.configurationProductRecords({
      local: `configuration-aurelia:${draft.local}`,
      productHandle: draft.aurelia.productHandle,
      identityHandle: draft.aurelia.identityHandle,
      productKindKey: KernelVocabulary.Configuration.Aurelia.key,
      ownerHandle: null,
      sourceAddressHandle: draft.aureliaSource!.addressHandle,
      provenanceHandle: draft.aureliaSource!.provenanceHandle,
      localName: null,
      claimHandles: [
        ...draft.aureliaClaimHandles,
        producerClaimHandle(producerClaimHandlesByProduct, draft.aurelia.productHandle),
      ],
      openSeamHandles: [],
    });
  }

  private recordsForAppRootConfigProduct(
    emission: AppRootConfigEmission,
    producerClaimHandlesByProduct: ReadonlyMap<ProductHandle, ClaimHandle>,
  ): readonly KernelStoreRecord[] {
    return this.publication.configurationProductRecords({
      local: `configuration-app-root-config:${emission.local}`,
      productHandle: emission.productHandle,
      identityHandle: emission.identityHandle,
      productKindKey: KernelVocabulary.Configuration.AppRootConfig.key,
      ownerHandle: null,
      sourceAddressHandle: emission.source.addressHandle,
      provenanceHandle: emission.source.provenanceHandle,
      localName: null,
      claimHandles: [producerClaimHandle(producerClaimHandlesByProduct, emission.productHandle)],
      openSeamHandles: emission.openSeamHandles,
    });
  }

  private recordsForAppRootProduct(
    draft: AureliaApplicationDraft,
    producerClaimHandlesByProduct: ReadonlyMap<ProductHandle, ClaimHandle>,
  ): readonly KernelStoreRecord[] {
    const appRoot = draft.appRoot!;
    const config = draft.appRootConfig!;
    return this.publication.configurationProductRecords({
      local: `configuration-app-root:${draft.local}`,
      productHandle: appRoot.productHandle,
      identityHandle: appRoot.identityHandle,
      productKindKey: KernelVocabulary.Configuration.AppRoot.key,
      ownerHandle: draft.aurelia.identityHandle,
      sourceAddressHandle: appRoot.sourceAddressHandle,
      provenanceHandle: config.source.provenanceHandle,
      localName: null,
      claimHandles: [
        ...draft.appRootClaimHandles,
        producerClaimHandle(producerClaimHandlesByProduct, appRoot.productHandle),
      ],
      openSeamHandles: config.openSeamHandles,
    });
  }

  private recordsForAppRootConfig(
    context: ConfigurationRecognitionContext,
    observation: AppRootConfigObservation,
    local: string,
    resources: ResourceDefinitionIndex | null,
  ): AppRootConfigEmission {
    const source = this.publication.recordsForSource(
      context,
      observation.sourceNode,
      `configuration-app-root-config:${local}`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      'AppRoot config admitted by Aurelia app flow.',
      SourceSpanRole.Range,
    );

    const host = this.recordsForAppRootHost(context, observation, local);
    const component = this.recordsForAppRootComponent(context, observation, local, resources);
    const openSeams = this.publication.recordsForOpenSeams(
      context,
      observation.openSeams,
      `configuration-app-root-config:${local}`,
    );
    const handles = this.publication.configurationProductHandles(`configuration-app-root-config:${local}`);
    const config = this.appRootConfigForObservation(observation, source, host, component);

    return new AppRootConfigEmission(
      local,
      [
        ...source.records,
        ...(host == null ? [] : host.records),
        ...(component == null ? [] : component.records),
        ...openSeams.records,
      ],
      handles.productHandle,
      handles.identityHandle,
      config,
      source,
      openSeams.handles,
    );
  }

  private intrinsicKeyIdentity(
    records: KernelStoreRecord[],
    key: FrameworkIntrinsicDiKey,
    sourceAddressHandle: ConfigurationSourceRecordSet['addressHandle'],
  ): IdentityHandle {
    const identityHandle = this.keyIdentities.interfaceKeyIdentityHandle(key);
    this.keyIdentities.emitInterfaceKeyIdentity(records, identityHandle, key, null, sourceAddressHandle);
    return identityHandle;
  }

  private aureliaClassKeyIdentity(
    context: ConfigurationRecognitionContext,
    records: KernelStoreRecord[],
    local: string,
    sourceAddressHandle: ConfigurationSourceRecordSet['addressHandle'],
  ): IdentityHandle {
    if (context.typeSystem == null) {
      throw new Error('Exact Aurelia constructor DI effects require the shared TypeChecker project.');
    }
    return this.keyIdentities.emitExportedKeyIdentity(
      records,
      this.kernelPublication,
      context.typeSystem,
      ['@aurelia/runtime-html', 'aurelia'],
      'Aurelia',
      this.store.handles.identity(`configuration-aurelia:${local}:key:Aurelia`),
      sourceAddressHandle,
    ).identityHandle;
  }

  private recordsForAppRootHost(
    context: ConfigurationRecognitionContext,
    observation: AppRootConfigObservation,
    local: string,
  ): ConfigurationSourceRecordSet | null {
    return observation.hostExpression == null
      ? null
      : this.publication.recordsForSource(
        context,
        observation.hostExpression,
        `configuration-app-root-config:${local}:host`,
        EvidenceKind.ConfigurationFlow,
        [EvidenceRole.Configuration],
        'AppRoot host expression.',
        SourceSpanRole.Value,
      );
  }

  private recordsForAppRootComponent(
    context: ConfigurationRecognitionContext,
    observation: AppRootConfigObservation,
    local: string,
    resources: ResourceDefinitionIndex | null,
  ): ConfigurationTargetEmission | null {
    return observation.component == null
      ? null
      : this.recordsForTarget(context, observation.component, `configuration-app-root-config:${local}:component`, resources);
  }

  private appRootConfigForObservation(
    observation: AppRootConfigObservation,
    source: ConfigurationSourceRecordSet,
    host: ConfigurationSourceRecordSet | null,
    component: ConfigurationTargetEmission | null,
  ): AppRootConfig {
    return new AppRootConfig(
      host?.addressHandle ?? null,
      component?.target ?? null,
      observation.allowActionlessForm,
      observation.strictBinding,
      null,
      source.addressHandle,
      compactFieldProvenance<AppRootConfigField>([
        fieldProvenanceWhenDistinct('host', host?.provenanceHandle, source.provenanceHandle),
        fieldProvenanceWhenDistinct('component', component?.provenanceHandle, source.provenanceHandle),
      ]),
    );
  }

  private recordsForTarget(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationTargetObservation,
    local: string,
    resources: ResourceDefinitionIndex | null,
  ): ConfigurationTargetEmission {
    const source = this.recordsForTargetSource(context, observation, local);
    const records: KernelStoreRecord[] = [...source.records];
    const definition = this.resourceDefinitionForTarget(observation, resources);
    const identityHandle = this.targetIdentityHandle(observation, local, definition);
    records.push(...this.recordsForTargetIdentity(context, observation, source, identityHandle, definition));
    return new ConfigurationTargetEmission(
      records,
      new ResourceTargetReference(
        identityHandle,
        source.addressHandle,
        observation.localName,
        definition?.target.targetType ?? null,
      ),
      source.provenanceHandle,
    );
  }

  private recordsForTargetSource(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationTargetObservation,
    local: string,
  ): ConfigurationSourceRecordSet {
    return this.publication.recordsForSource(
      context,
      observation.node,
      `${local}:source`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      'AppRoot component target expression.',
      SourceSpanRole.Value,
    );
  }

  private resourceDefinitionForTarget(
    observation: ConfigurationTargetObservation,
    resources: ResourceDefinitionIndex | null,
  ): FullResourceDefinition | null {
    return resources?.lookupValue(observation.evaluation.value) ?? null;
  }

  private targetIdentityHandle(
    observation: ConfigurationTargetObservation,
    local: string,
    definition: FullResourceDefinition | null,
  ): IdentityHandle | null {
    return definition?.target.identityHandle
      ?? (observation.isDeclaration && observation.localName != null
        ? this.store.handles.identity(local)
        : null);
  }

  private recordsForTargetIdentity(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationTargetObservation,
    source: ConfigurationSourceRecordSet,
    identityHandle: IdentityHandle | null,
    definition: FullResourceDefinition | null,
  ): readonly TypeScriptDeclarationIdentity[] {
    return definition == null && identityHandle != null
      ? [
        new TypeScriptDeclarationIdentity(
          identityHandle,
          context.moduleKey,
          null,
          observation.localName,
          source.addressHandle,
        ),
      ]
      : [];
  }
}

function producerClaimHandle(
  handles: ReadonlyMap<ProductHandle, ClaimHandle>,
  productHandle: ProductHandle,
): ClaimHandle {
  const handle = handles.get(productHandle);
  if (handle == null) {
    throw new Error(`Configuration product ${productHandle} has no exact producer claim.`);
  }
  return handle;
}
