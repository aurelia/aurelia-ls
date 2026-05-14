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
  ContainerIdentity,
  ContainerIdentityKind,
  TypeScriptDeclarationIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  compactFieldProvenance,
  FieldProvenance,
} from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import { ContainerConfiguration } from '../di/container-configuration.js';
import { Container } from '../di/container.js';
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
  ConfigurationKernelPublication,
  ConfigurationProductHandles,
  ConfigurationSourceRecordSet,
} from './configuration-publication.js';

export class AureliaAppFrame {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly container: Container,
    readonly aurelia: Aurelia,
    readonly appRootConfig: AppRootConfig | null,
    readonly appRoot: AppRoot | null,
    readonly productHandles: readonly ProductHandle[],
    readonly claims: readonly ClaimHandle[],
  ) {}
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
  constructor(
    readonly store: KernelStore,
    readonly publication: ConfigurationKernelPublication,
  ) {}

  materialize(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationSequenceObservation,
    sequenceLocal: string,
    provenanceHandle: ProvenanceHandle,
    resources: ResourceDefinitionIndex | null,
  ): AureliaAppFrame | null {
    const appStep = appAdmissionStep(observation);
    if (appStep == null) {
      return null;
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

    const container = this.containerForAppFrame(appLocal, source);

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
    records.push(
      ...this.recordsForAppFrameProducts(
        appLocal,
        appStep,
        container,
        appRoot,
        aurelia,
        source,
        provenanceHandle,
        appClaims,
      ),
    );

    return new AureliaAppFrame(
      records,
      container,
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
    );
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

  private containerForAppFrame(
    appLocal: string,
    source: ConfigurationSourceRecordSet,
  ): Container {
    return new Container(
      this.store.handles.product(`di-container:${appLocal}`),
      this.store.handles.identity(`di-container:${appLocal}`),
      ContainerIdentityKind.Root,
      null,
      null,
      source.addressHandle,
      [],
      ContainerConfiguration.DEFAULT,
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
    container: Container,
    appRoot: AppRoot | null,
    aurelia: Aurelia,
    source: ConfigurationSourceRecordSet,
    provenanceHandle: ProvenanceHandle,
    appClaims: AppFrameClaimEmission,
  ): readonly KernelStoreRecord[] {
    return [
      ...this.containerRecordsForAppFrame(
        appLocal,
        appStep,
        container,
        source,
        claimHandlesForProduct(appClaims.records, container.productHandle),
      ),
      ...(appRoot == null ? [] : this.appRootRecordsForAppFrame(
        appLocal,
        appStep,
        appRoot,
        provenanceHandle,
        claimHandlesForProduct(appClaims.records, appRoot.productHandle),
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

  private containerRecordsForAppFrame(
    appLocal: string,
    appStep: ConfigurationStepObservation,
    container: Container,
    source: ConfigurationSourceRecordSet,
    claimHandles: readonly ClaimHandle[],
  ): readonly KernelStoreRecord[] {
    return [
      new ContainerIdentity(
        container.identityHandle,
        ContainerIdentityKind.Root,
        null,
        null,
        source.addressHandle,
        appStep.receiverLocalName,
      ),
      new MaterializedProduct(
        container.productHandle,
        KernelVocabulary.Di.Container.key,
        container.identityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`di-container:${appLocal}`),
        container.identityHandle,
        [container.productHandle],
        claimHandles,
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
        host == null ? null : new FieldProvenance('host', host.provenanceHandle),
        component == null ? null : new FieldProvenance('component', component.provenanceHandle),
        observation.allowActionlessForm == null ? null : new FieldProvenance('allowActionlessForm', source.provenanceHandle),
        observation.strictBinding == null ? null : new FieldProvenance('strictBinding', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
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

function claimHandlesForProduct(
  records: readonly KernelStoreRecord[],
  productHandle: ProductHandle,
): readonly ClaimHandle[] {
  return records
    .filter((record): record is SemanticClaim => record.kind === 'semantic-claim')
    .filter((claim) => claim.subjectHandle === productHandle || claim.objectHandle === productHandle)
    .map((claim) => claim.handle);
}
