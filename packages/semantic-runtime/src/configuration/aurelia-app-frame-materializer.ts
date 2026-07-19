import ts from 'typescript';
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
  ConfigurationSequenceObservation,
  ConfigurationStepObservation,
  ConfigurationTargetObservation,
} from './configuration-observation.js';
import type { ConfigurationRecognitionContext } from './configuration-recognition-context.js';
import {
  ConfigurationStepKind,
} from './configuration-sequence.js';
import {
  claimHandlesForConfigurationProduct,
  ConfigurationKernelPublication,
  ConfigurationProductHandles,
  ConfigurationSourceRecordSet,
} from './configuration-publication.js';

export class AureliaAppFrame {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly container: Container,
    readonly createdContainer: Container | null,
    readonly aurelia: Aurelia,
    readonly appRootConfig: AppRootConfig | null,
    readonly appRoot: AppRoot | null,
    readonly productHandles: readonly ProductHandle[],
    readonly claims: readonly ClaimHandle[],
    readonly publishesProducts: boolean,
  ) {}

  asReference(): AureliaAppFrame {
    return new AureliaAppFrame(
      [],
      this.container,
      null,
      this.aurelia,
      this.appRootConfig,
      this.appRoot,
      this.productHandles,
      this.claims,
      false,
    );
  }
}

class AppRootConfigEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly productHandle: ProductHandle,
    readonly config: AppRootConfig,
  ) {}
}

class AppFrameRootConfigEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly appRootConfig: AppRootConfigEmission | null,
    readonly usesConfigClaimHandle: ClaimHandle | null,
  ) {}
}

class AppFrameClaimEmission {
  constructor(
    readonly records: readonly SemanticClaim[],
    readonly appRootUsesConfigClaim: SemanticClaim | null,
    readonly aureliaClaimHandles: readonly ClaimHandle[],
  ) {}
}

class ConfigurationTargetEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly target: ResourceTargetReference,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

/** Materializes the Aurelia facade/root-container/AppRoot admission frame for a configuration sequence. */
export class AureliaAppFrameMaterializer {
  private readonly rootContainers: ContainerRootMaterializer;

  constructor(
    readonly store: KernelStore,
    readonly publication: ConfigurationKernelPublication,
    kernelPublication: KernelPublicationContext,
    readonly evaluationBindings: ConfigurationEvaluationBindingFrame,
  ) {
    this.rootContainers = new ContainerRootMaterializer(store, kernelPublication);
  }

  materialize(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationSequenceObservation,
    sequenceLocal: string,
    provenanceHandle: ProvenanceHandle,
    resources: ResourceDefinitionIndex | null,
  ): AureliaAppFrame | null {
    const appStep = appAdmissionStep(observation);
    const aureliaEvaluation = appStep?.aureliaEvaluation ?? null;
    if (
      appStep == null
      || aureliaEvaluation == null
      || aureliaEvaluation.containerState !== AureliaFacadeContainerState.Closed
      || aureliaEvaluation.containerEvaluation == null
    ) {
      return null;
    }
    const existingFrame = this.evaluationBindings.appFrameForEvaluation(aureliaEvaluation);
    if (existingFrame != null) {
      return existingFrame.asReference();
    }

    const records: KernelStoreRecord[] = [];
    const appLocal = `${sequenceLocal}:app`;
    const source = this.publication.recordsForSource(
      context,
      appStep.sourceNode,
      `configuration-app:${appLocal}`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      'Aurelia app admission boundary.',
      SourceSpanRole.Range,
    );
    records.push(...source.records);

    const containerEvaluation = aureliaEvaluation.containerEvaluation;
    let container = this.evaluationBindings.containerForEvaluation(containerEvaluation);
    let createdContainer: Container | null = null;
    let containerRequest: ContainerRootMaterializationRequest | null = null;
    let containerProvenanceHandle = source.provenanceHandle;
    if (container == null) {
      if (
        containerEvaluation.kind === AureliaContainerEvaluationKind.AuthoredRoot
        || containerEvaluation.kind === AureliaContainerEvaluationKind.AuthoredChild
      ) {
        throw new Error('An Aurelia facade using an authored container must be emitted after that container.');
      }
      const containerSource = this.publication.recordsForSource(
        context,
        containerEvaluation.sourceNode,
        `configuration-container:${appLocal}`,
        EvidenceKind.ConfigurationFlow,
        [EvidenceRole.Configuration],
        'Implicit Aurelia facade root container.',
        SourceSpanRole.Range,
      );
      records.push(...containerSource.records);
      containerRequest = new ContainerRootMaterializationRequest(
        appLocal,
        containerSource.addressHandle,
        appStep.receiverLocalName,
      );
      container = this.rootContainers.create(containerRequest);
      createdContainer = container;
      containerProvenanceHandle = containerSource.provenanceHandle;
      this.evaluationBindings.bindContainer(containerEvaluation, container);
    }

    const appRootConfig = this.recordsForAppFrameRootConfig(context, observation, appLocal, resources);
    records.push(...appRootConfig.records);

    const appRoot = appRootConfig.appRootConfig == null
      ? null
      : this.appRootForAppFrame(appLocal, container, appRootConfig.appRootConfig);

    const aurelia = this.aureliaForAppFrame(appLocal, container, appRoot, source);
    const appClaims = this.recordsForAppFrameClaims(
      appLocal,
      container,
      appRoot,
      appRootConfig.appRootConfig,
      appRootConfig.usesConfigClaimHandle,
      aurelia,
      provenanceHandle,
    );
    records.push(...appClaims.records);
    if (containerRequest != null) {
      records.push(...this.rootContainers.recordsFor(
        containerRequest,
        container,
        containerProvenanceHandle,
        claimHandlesForConfigurationProduct(appClaims.records, container.productHandle),
      ));
    }
    records.push(
      ...this.recordsForAppFrameProducts(
        appLocal,
        appStep,
        appRoot,
        aurelia,
        source,
        provenanceHandle,
        appClaims,
      ),
    );

    const frame = new AureliaAppFrame(
      records,
      container,
      createdContainer,
      aurelia,
      appRootConfig.appRootConfig?.config ?? null,
      appRoot,
      [
        container.productHandle,
        aurelia.productHandle,
        ...(appRootConfig.appRootConfig?.productHandle == null ? [] : [appRootConfig.appRootConfig.productHandle]),
        ...(appRoot == null ? [] : [appRoot.productHandle]),
      ],
      appClaims.aureliaClaimHandles,
      true,
    );
    this.evaluationBindings.bindAppFrame(aureliaEvaluation, frame);
    return frame;
  }

  private recordsForAppFrameRootConfig(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationSequenceObservation,
    appLocal: string,
    resources: ResourceDefinitionIndex | null,
  ): AppFrameRootConfigEmission {
    const observationConfig = observation.steps.find((step) => step.appRootConfig != null)?.appRootConfig ?? null;
    if (observationConfig == null) {
      return new AppFrameRootConfigEmission([], null, null);
    }

    const appRootConfig = this.recordsForAppRootConfig(context, observationConfig, appLocal, resources);
    return new AppFrameRootConfigEmission(
      appRootConfig.records,
      appRootConfig,
      this.store.handles.claim(`configuration-app-root:${appLocal}:uses-config`),
    );
  }

  private recordsForAppFrameClaims(
    appLocal: string,
    container: Container,
    appRoot: AppRoot | null,
    appRootConfig: AppRootConfigEmission | null,
    appRootConfigClaimHandle: ClaimHandle | null,
    aurelia: Aurelia,
    provenanceHandle: ProvenanceHandle,
  ): AppFrameClaimEmission {
    const aureliaClaims = this.publication.recordsForAureliaClaims(
      appLocal,
      aurelia.productHandle,
      container.productHandle,
      appRoot?.productHandle ?? null,
      provenanceHandle,
    );
    const appRootUsesConfigClaim = appRoot == null || appRootConfig == null || appRootConfigClaimHandle == null
      ? null
      : new SemanticClaim(
        appRootConfigClaimHandle,
        appRoot.productHandle,
        KernelVocabulary.Configuration.AppRootUsesConfig.key,
        appRootConfig.productHandle,
        provenanceHandle,
      );
    return new AppFrameClaimEmission(
      [
        ...aureliaClaims.records.filter((record): record is SemanticClaim => record.kind === 'semantic-claim'),
        ...(appRootUsesConfigClaim == null ? [] : [appRootUsesConfigClaim]),
      ],
      appRootUsesConfigClaim,
      aureliaClaims.handles,
    );
  }

  private appRootForAppFrame(
    appLocal: string,
    container: Container,
    appRootConfig: AppRootConfigEmission,
  ): AppRoot {
    return new AppRoot(
      this.store.handles.product(`configuration-app-root:${appLocal}`),
      this.store.handles.identity(`configuration-app-root:${appLocal}`),
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

  private aureliaForAppFrame(
    appLocal: string,
    container: Container,
    appRoot: AppRoot | null,
    source: ConfigurationSourceRecordSet,
  ): Aurelia {
    return new Aurelia(
      this.store.handles.product(`configuration-aurelia:${appLocal}`),
      this.store.handles.identity(`configuration-aurelia:${appLocal}`),
      container.toReference(),
      null,
      appRoot?.toReference() ?? null,
      null,
      source.addressHandle,
      [],
    );
  }

  private recordsForAppFrameProducts(
    appLocal: string,
    appStep: ConfigurationStepObservation,
    appRoot: AppRoot | null,
    aurelia: Aurelia,
    source: ConfigurationSourceRecordSet,
    provenanceHandle: ProvenanceHandle,
    appClaims: AppFrameClaimEmission,
  ): readonly KernelStoreRecord[] {
    return [
      ...(appRoot == null ? [] : this.appRootRecordsForAppFrame(
        appLocal,
        appStep,
        appRoot,
        provenanceHandle,
        claimHandlesForConfigurationProduct(appClaims.records, appRoot.productHandle),
      )),
      ...this.aureliaRecordsForAppFrame(
        appLocal,
        appStep,
        aurelia,
        source,
        appClaims.aureliaClaimHandles,
      ),
    ];
  }

  private appRootRecordsForAppFrame(
    appLocal: string,
    appStep: ConfigurationStepObservation,
    appRoot: AppRoot,
    provenanceHandle: ProvenanceHandle,
    claimHandles: readonly ClaimHandle[],
  ): readonly KernelStoreRecord[] {
    return this.publication.configurationProductRecords({
      local: `configuration-app-root:${appLocal}`,
      productHandle: appRoot.productHandle,
      identityHandle: appRoot.identityHandle,
      productKindKey: KernelVocabulary.Configuration.AppRoot.key,
      ownerHandle: null,
      sourceAddressHandle: appRoot.sourceAddressHandle,
      provenanceHandle,
      localName: appStep.receiverLocalName,
      claimHandles,
    });
  }

  private aureliaRecordsForAppFrame(
    appLocal: string,
    appStep: ConfigurationStepObservation,
    aurelia: Aurelia,
    source: ConfigurationSourceRecordSet,
    claimHandles: readonly ClaimHandle[],
  ): readonly KernelStoreRecord[] {
    return this.publication.configurationProductRecords({
      local: `configuration-aurelia:${appLocal}`,
      productHandle: aurelia.productHandle,
      identityHandle: aurelia.identityHandle,
      productKindKey: KernelVocabulary.Configuration.Aurelia.key,
      ownerHandle: null,
      sourceAddressHandle: source.addressHandle,
      provenanceHandle: source.provenanceHandle,
      localName: appStep.receiverLocalName,
      claimHandles,
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
    const handles = this.publication.configurationProductHandles(`configuration-app-root-config:${local}`);
    const config = this.appRootConfigForObservation(observation, source, host, component);

    return new AppRootConfigEmission(
      [
        ...source.records,
        ...(host == null ? [] : host.records),
        ...(component == null ? [] : component.records),
        ...this.recordsForAppRootConfigProduct(local, observation, source, handles),
      ],
      handles.productHandle,
      config,
    );
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

  private recordsForAppRootConfigProduct(
    local: string,
    observation: AppRootConfigObservation,
    source: ConfigurationSourceRecordSet,
    handles: ConfigurationProductHandles,
  ): readonly KernelStoreRecord[] {
    return this.publication.configurationProductRecords({
      local: `configuration-app-root-config:${local}`,
      productHandle: handles.productHandle,
      identityHandle: handles.identityHandle,
      productKindKey: KernelVocabulary.Configuration.AppRootConfig.key,
      ownerHandle: null,
      sourceAddressHandle: source.addressHandle,
      provenanceHandle: source.provenanceHandle,
      localName: observation.component?.localName ?? null,
    });
  }

  private recordsForTarget(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationTargetObservation,
    local: string,
    resources: ResourceDefinitionIndex | null,
  ): ConfigurationTargetEmission {
    const source = this.recordsForTargetSource(context, observation, local);
    const records: KernelStoreRecord[] = [...source.records];
    const definition = this.resourceDefinitionForTarget(context, observation, resources);
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
    context: ConfigurationRecognitionContext,
    observation: ConfigurationTargetObservation,
    resources: ResourceDefinitionIndex | null,
  ): FullResourceDefinition | null {
    return resources != null && ts.isExpression(observation.node)
      ? resources.lookupExpression(observation.node, context.expressionReader)
      : null;
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

function appAdmissionStep(
  observation: ConfigurationSequenceObservation,
): ConfigurationStepObservation | null {
  return observation.steps.find((step) =>
    step.stepKind === ConfigurationStepKind.CreateAurelia
    || step.stepKind === ConfigurationStepKind.AureliaRegister
    || step.stepKind === ConfigurationStepKind.AureliaApp
  ) ?? null;
}
