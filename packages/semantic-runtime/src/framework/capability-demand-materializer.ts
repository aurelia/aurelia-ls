import path from 'node:path';
import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  sourceSpanContains,
  type SourceSpanAddress,
} from '../kernel/address.js';
import {
  type BootPackageManifest,
  isHostPathWithin,
  manifestWorkspacesIncludeProject,
  readPackageManifest,
  sameHostPath,
} from '../boot/host-files.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import { SemanticClaim } from '../kernel/claim.js';
import type { SourceSpan } from '../expression/source-span.js';
import type {
  BindingBehaviorExpression,
  ValueConverterExpression,
} from '../expression/ast.js';
import type {
  AddressHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { OpenSeam } from '../kernel/open-seam.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import { FrameworkIdentity } from '../kernel/identity.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelPublicationPlan,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelMaterializationReadView,
  type KernelStoreReadView,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  sourceSpanAddressForAddress,
} from '../kernel/source-address.js';
import { uniqueStrings } from '../kernel/collections.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import {
  FrameworkCapabilityConfigurationMembership,
  i18nTranslationSyntaxConfigurationForAdmission,
  validationHtmlResourceConfigurationForAdmission,
} from '../configuration/framework-capability-configuration.js';
import type { AppTaskDefinition } from '../configuration/app-task.js';
import {
  type DiContainerChainFacts,
} from '../di/container-chain.js';
import type { DiWorldConstructionEmission } from '../di/world-construction.js';
import { registrationAdmissionsVisibleToContainer } from '../di/world-construction.js';
import {
  FrameworkRegistrationCapability,
  frameworkRegistrationAdmissionCarriesCapability,
  frameworkRegistrationKindsForCapability,
  frameworkRegistrationModuleNamesForCapability,
} from '../registration/framework-registration-manifest.js';
import {
  frameworkRegistrationKindForAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  compileAttributePatternDefinition,
  isBetterAttributePatternScore,
  type AttributePatternScore,
  type AttributeSyntax,
} from '../template/attribute-syntax.js';
import {
  BuiltInBindingCommandName,
  BuiltInSyntaxGroup,
  findUniqueBuiltInBindingCommandByName,
  parseBuiltInAttributeSyntax,
  type BuiltInAttributePattern,
  type BuiltInBindingCommand,
} from '../template/built-in-syntax.js';
import {
  bindingBehaviorResourceOccurrences,
  valueConverterResourceOccurrences,
} from '../template/expression-resource-occurrence.js';
import {
  findVisibleTemplateResource,
  readBuiltInVisibleTemplateResource,
} from '../template/compiler-resource-lookup.js';
import {
  runtimeAcceptedBindingExpressionAstForParse,
} from '../template/expression-parse-projection.js';
import {
  HtmlElement,
  HtmlElementAttributeOwner,
  htmlElementAttributeOwnersByAttributeProduct,
  htmlElementLookupName,
  type HtmlAttribute,
} from '../template/html-ir.js';
import type {
  TemplateCompilationProjectEmission,
  TemplateResourceRuntimeAnalysisEmission,
} from '../template/template-compilation-project-pass.js';
import {
  sourceAddressForRuntimeExpressionSpan,
} from '../template/runtime-expression-source-address.js';
import type {
  TemplateExpressionParse,
} from '../template/value-site.js';
import {
  resourceLocalCompilerReachableHtmlAttributeProductHandles,
  resourceLocalCompilerReachableHtmlNodeProductHandles,
} from '../template/runtime-resource-ownership.js';
import {
  resourceLocalEffectiveTemplateExpressionParses,
} from '../template/template-expression-selection.js';
import {
  allBuiltInResources,
  BuiltInResourcePackage,
  type BuiltInResource,
} from '../resources/built-in-resources.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  FrameworkCapabilityAdmissionState,
  FrameworkCapabilityAvailabilityState,
  FrameworkCapabilityDemand,
  FrameworkCapabilityDemandKind,
  FrameworkCapabilityDemandProjectResult,
  FrameworkCapabilityDemandSiteKind,
  FrameworkCapabilityPackageEvidence,
  FrameworkCapabilityPackageEvidenceKind,
  type FrameworkCapabilityPackageEvidenceScope,
} from './capability-demand.js';
import { FrameworkProductDetails } from './product-details.js';
import {
  FrameworkServiceRoot,
  FrameworkServiceRootBasis,
  FrameworkServiceRootKind,
  frameworkServiceRootBasisResolvesDiKey,
} from './service-root.js';
import type { FrameworkServiceRootEnrichmentProjectResult } from './service-root-enrichment-materializer.js';

interface CapabilityDemandSite {
  readonly siteKind: FrameworkCapabilityDemandSiteKind;
  readonly demandKind: FrameworkCapabilityDemandKind;
  readonly requiredCapability: FrameworkRegistrationCapability;
  readonly authoredName: string;
  readonly admissionState: FrameworkCapabilityAdmissionState;
  readonly blockingOpenSeamHandles?: readonly OpenSeamHandle[];
  readonly sourceAddressHandle: AddressHandle | null;
  readonly ownerIdentityHandle: IdentityHandle | null;
  readonly resource?: TemplateResourceRuntimeAnalysisEmission;
  readonly localKeyParts?: readonly string[];
  readonly templateSourceAddressHandle?: AddressHandle | null;
  readonly resourceDefinitionProductHandle?: ProductHandle | null;
  readonly analysisContextProductHandle?: ProductHandle | null;
  readonly admissionSourceAddressHandles?: readonly AddressHandle[];
  readonly configurationSourceAddressHandles?: readonly AddressHandle[];
  readonly expressionResourceApplicationProductHandles?: readonly ProductHandle[];
  readonly sourceRecords?: readonly KernelStoreRecord[];
}

interface CapabilityAvailabilityEvidenceContext {
  readonly byPackageName: ReadonlyMap<string, readonly FrameworkCapabilityPackageEvidence[]>;
}

class CapabilityDemandPublication {
  constructor(
    readonly demand: FrameworkCapabilityDemand,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Materializes authored framework capability demands after template front-door compilation. */
export class FrameworkCapabilityDemandMaterializer {
  constructor(
    readonly store: KernelStore,
    readonly publication: KernelPublicationContext,
  ) {}

  materializeAndEmit(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    templates: TemplateCompilationProjectEmission,
    configuration: ConfigurationKernelEmission,
    diWorld: DiWorldConstructionEmission,
    containerChainFacts: DiContainerChainFacts,
    serviceRoots: readonly FrameworkServiceRoot[],
    serviceRootEnrichment: FrameworkServiceRootEnrichmentProjectResult,
  ): FrameworkCapabilityDemandProjectResult {
    const availability = readCapabilityAvailabilityEvidence(project, typeSystem);
    const publications = capabilityDemandSites(
      this.publication,
      typeSystem,
      templates,
      configuration,
      diWorld,
      containerChainFacts,
      serviceRoots,
      serviceRootEnrichment,
    ).map((site, index) => this.publishDemand(project, site, availability, index));
    const records = publications.flatMap((publication) => publication.records);
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(records, `framework-capability-demands:${project.projectKey}`),
      publishProductDetails(
        FrameworkProductDetails.CapabilityDemand,
        publications.map((publication) => publication.demand),
      ),
    ));
    return new FrameworkCapabilityDemandProjectResult(
      publications.map((publication) => publication.demand),
      records,
    );
  }

  private publishDemand(
    project: ProjectBootFrame,
    site: CapabilityDemandSite,
    availability: CapabilityAvailabilityEvidenceContext,
    index: number,
  ): CapabilityDemandPublication {
    const local = frameworkCapabilityDemandLocalKey(project.projectKey, site, index);
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const candidateModuleNames = frameworkRegistrationModuleNamesForCapability(site.requiredCapability);
    const candidatePackageNames = uniqueStrings(candidateModuleNames.map(packageNameForSpecifier), 'sorted');
    const packageEvidence = uniquePackageEvidence(
      candidatePackageNames.flatMap((packageName) => availability.byPackageName.get(packageName) ?? []),
    );
    const availabilityState = packageEvidence.length > 0
      ? FrameworkCapabilityAvailabilityState.EvidenceFound
      : FrameworkCapabilityAvailabilityState.NoLocalEvidence;
    const recommendedModuleName = recommendedModule(candidateModuleNames, packageEvidence);
    const demand = new FrameworkCapabilityDemand(
      productHandle,
      identityHandle,
      project.projectKey,
      site.siteKind,
      site.demandKind,
      site.requiredCapability,
      frameworkRegistrationKindsForCapability(site.requiredCapability),
      candidateModuleNames,
      site.admissionState,
      site.blockingOpenSeamHandles ?? [],
      availabilityState,
      packageEvidence,
      recommendedModuleName,
      site.authoredName,
      site.sourceAddressHandle,
      site.ownerIdentityHandle,
      site.templateSourceAddressHandle ?? site.resource?.compilation.unit.templateSource.sourceAddressHandle ?? null,
      site.resourceDefinitionProductHandle ?? site.resource?.compilation.definition.productHandle ?? null,
      site.analysisContextProductHandle ?? site.resource?.compilation.analysisContextProductHandle ?? null,
      site.admissionSourceAddressHandles ?? [],
      site.configurationSourceAddressHandles ?? [],
    );
    const applicationClaims = (site.expressionResourceApplicationProductHandles ?? []).map(
      (applicationProductHandle, applicationIndex) => new SemanticClaim(
        this.store.handles.claim(`${local}:expression-resource-application:${applicationIndex}`),
        productHandle,
        KernelVocabulary.Framework.CapabilityDemandHasExpressionResourceApplication.key,
        applicationProductHandle,
        provenanceHandle,
      ),
    );
    const records = [
      ...(site.sourceRecords ?? []),
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.Diagnostic, EvidenceRole.Configuration],
        `Authored ${site.siteKind} "${site.authoredName}" requires framework capability ${site.requiredCapability}.`,
        site.sourceAddressHandle,
      ),
      new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
      new FrameworkIdentity(
        identityHandle,
        KernelVocabulary.Framework.CapabilityDemand.key,
        site.ownerIdentityHandle,
        site.sourceAddressHandle,
        site.requiredCapability,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Framework.CapabilityDemand.key,
        identityHandle,
        site.sourceAddressHandle,
        provenanceHandle,
      ),
      ...applicationClaims,
      new MaterializationRecord(
        this.store.handles.materialization(local),
        identityHandle,
        [productHandle],
        applicationClaims.map((claim) => claim.handle),
      ),
    ];
    return new CapabilityDemandPublication(demand, records);
  }
}

function capabilityDemandSites(
  publication: KernelPublicationContext,
  typeSystem: TypeSystemProject,
  templates: TemplateCompilationProjectEmission,
  configuration: ConfigurationKernelEmission,
  diWorld: DiWorldConstructionEmission,
  containerChainFacts: DiContainerChainFacts,
  serviceRoots: readonly FrameworkServiceRoot[],
  serviceRootEnrichment: FrameworkServiceRootEnrichmentProjectResult,
): readonly CapabilityDemandSite[] {
  const templateAdmissions = new TemplateCapabilityAdmissionContext(
    publication,
    configuration,
    diWorld,
    containerChainFacts,
  );
  return uniqueDemandSites([
    ...templates.resources,
    ...templates.authoringResources,
  ].flatMap((resource) => [
    ...syntaxCapabilityDemandSites(resource, templateAdmissions),
    ...bindingCommandCapabilityDemandSites(resource, templateAdmissions),
    ...resourceCapabilityDemandSites(publication, resource, templateAdmissions),
    ...expressionResourceCapabilityDemandSites(publication, resource, templateAdmissions),
  ]).concat(sourceServiceApiCapabilityDemandSites(
    publication,
    typeSystem,
    templates,
    configuration,
    diWorld,
    containerChainFacts,
    serviceRoots,
    serviceRootEnrichment,
  )));
}

function sourceServiceApiCapabilityDemandSites(
  publication: KernelPublicationContext,
  typeSystem: TypeSystemProject,
  templates: TemplateCompilationProjectEmission,
  configuration: ConfigurationKernelEmission,
  diWorld: DiWorldConstructionEmission,
  containerChainFacts: DiContainerChainFacts,
  serviceRoots: readonly FrameworkServiceRoot[],
  serviceRootEnrichment: FrameworkServiceRootEnrichmentProjectResult,
): readonly CapabilityDemandSite[] {
  const admissionContext = new SourceServiceApiAdmissionContext(
    publication,
    typeSystem,
    templates,
    configuration,
    diWorld,
    containerChainFacts,
    serviceRoots,
    serviceRootEnrichment,
  );
  return serviceRoots.flatMap((root): readonly CapabilityDemandSite[] => {
    if (!frameworkServiceRootBasisResolvesDiKey(root.basis)) {
      return [];
    }
    const descriptor = sourceServiceApiDemandDescriptor(root);
    if (descriptor == null) {
      return [];
    }
    const admission = admissionContext.admissionForRoot(root, descriptor.requiredCapability);
    return [{
      siteKind: FrameworkCapabilityDemandSiteKind.SourceServiceApi,
      demandKind: descriptor.demandKind,
      requiredCapability: descriptor.requiredCapability,
      authoredName: root.serviceKeyName,
      admissionState: admission.admissionState,
      blockingOpenSeamHandles: admission.blockingOpenSeamHandles,
      sourceAddressHandle: root.evidenceSourceAddressHandle ?? root.sourceAddressHandle,
      ownerIdentityHandle: root.identityHandle,
      localKeyParts: [
        'source-service-api',
        localKeyPart(root.projectKey),
        localKeyPart(root.sourcePath),
        root.rootKind,
        localKeyPart(root.serviceKeyName),
        localKeyPart(descriptor.requiredCapability),
        root.start.toString(),
        root.end.toString(),
        root.evidenceStart.toString(),
        root.evidenceEnd.toString(),
      ],
      templateSourceAddressHandle: null,
      resourceDefinitionProductHandle: null,
    }];
  });
}

class SourceServiceApiAdmission {
  constructor(
    readonly admissionState: FrameworkCapabilityAdmissionState,
    readonly blockingOpenSeamHandles: readonly OpenSeamHandle[] = [],
  ) {}
}

class SourceServiceApiAdmissionContext {
  private readonly chainFacts: DiContainerChainFacts;
  private readonly registrationHidingOpenSeams: readonly OpenSeam[];
  private readonly constrainedRegistrationHidingOpenSeamAdmissions: ReadonlyMap<
    OpenSeamHandle,
    readonly RegistrationAdmissionProduct[]
  >;
  private readonly registrationHidingOpenSeamContainerScopes: ReadonlyMap<OpenSeamHandle, readonly IdentityHandle[]>;
  private readonly serviceRootsByProduct: ReadonlyMap<ProductHandle, FrameworkServiceRoot>;
  private readonly appTaskContainerIdentitiesByTask: ReadonlyMap<ProductHandle, readonly IdentityHandle[]>;
  private readonly consultingContainerCache = new Map<ProductHandle, IdentityHandle | null>();
  private readonly consultingContainerStack = new Set<ProductHandle>();

  constructor(
    private readonly publication: KernelPublicationContext,
    private readonly typeSystem: TypeSystemProject,
    private readonly templates: TemplateCompilationProjectEmission,
    private readonly configuration: ConfigurationKernelEmission,
    diWorld: DiWorldConstructionEmission,
    chainFacts: DiContainerChainFacts,
    serviceRoots: readonly FrameworkServiceRoot[],
    private readonly serviceRootEnrichment: FrameworkServiceRootEnrichmentProjectResult,
  ) {
    this.chainFacts = chainFacts;
    const openSeamFacts = registrationHidingOpenSeamFacts(
      diWorld,
      configuration,
    );
    this.registrationHidingOpenSeams = openSeamFacts.seams;
    this.constrainedRegistrationHidingOpenSeamAdmissions = openSeamFacts.constrainedAdmissions;
    this.registrationHidingOpenSeamContainerScopes = openSeamFacts.containerScopes;
    this.serviceRootsByProduct = new Map(serviceRoots.map((root) => [root.productHandle, root]));
    this.appTaskContainerIdentitiesByTask = appTaskContainerIdentitiesByTask(diWorld);
  }

  admissionForRoot(
    root: FrameworkServiceRoot,
    requiredCapability: FrameworkRegistrationCapability,
  ): SourceServiceApiAdmission {
    if (!frameworkServiceRootBasisResolvesDiKey(root.basis)) {
      return new SourceServiceApiAdmission(FrameworkCapabilityAdmissionState.NotAdmitted);
    }
    const resolvedKeyHandles = root.serviceKeyIdentityHandle == null ? [] : [root.serviceKeyIdentityHandle];
    const consultingContainer = this.consultingContainerIdentityForRoot(root);
    if (
      consultingContainer != null
      && resolvedKeyHandles.some((keyHandle) => this.chainFacts.providerIsOnConsultingChain(keyHandle, consultingContainer))
    ) {
      return new SourceServiceApiAdmission(FrameworkCapabilityAdmissionState.Admitted);
    }
    const blockingOpenSeams = this.registrationHidingOpenSeamsForRoot(
      root,
      requiredCapability,
      consultingContainer,
    );
    if (blockingOpenSeams.length > 0) {
      return new SourceServiceApiAdmission(
        FrameworkCapabilityAdmissionState.AdmissionUnknown,
        blockingOpenSeams.map((seam) => seam.handle),
      );
    }
    if (consultingContainer == null) {
      const hasWorldProvider = resolvedKeyHandles.some((keyHandle) => this.chainFacts.hasProviderForKey(keyHandle));
      return hasWorldProvider
        ? new SourceServiceApiAdmission(FrameworkCapabilityAdmissionState.AdmittedChainUnproven)
        : new SourceServiceApiAdmission(FrameworkCapabilityAdmissionState.AdmissionUnknown);
    }
    return new SourceServiceApiAdmission(FrameworkCapabilityAdmissionState.NotAdmitted);
  }

  private registrationHidingOpenSeamsForRoot(
    root: FrameworkServiceRoot,
    requiredCapability: FrameworkRegistrationCapability,
    consultingContainer: IdentityHandle | null,
  ): readonly OpenSeam[] {
    const consultingChain = consultingContainer == null
      ? null
      : new Set(this.chainFacts.containerChainIdentityHandles(consultingContainer));
    return this.registrationHidingOpenSeams.filter((seam) =>
      this.registrationHidingOpenSeamBlocksRoot(seam, root, requiredCapability, consultingChain)
    );
  }

  private registrationHidingOpenSeamBlocksRoot(
    seam: OpenSeam,
    root: FrameworkServiceRoot,
    requiredCapability: FrameworkRegistrationCapability,
    consultingChain: ReadonlySet<IdentityHandle> | null,
  ): boolean {
    const constrainedAdmissions = this.constrainedRegistrationHidingOpenSeamAdmissions.get(seam.handle);
    if (
      constrainedAdmissions != null
      && !constrainedAdmissions.some((admission) =>
        frameworkRegistrationAdmissionCarriesCapability(admission, requiredCapability)
      )
    ) {
      return false;
    }
    const scopedContainers = this.registrationHidingOpenSeamContainerScopes.get(seam.handle) ?? [];
    if (scopedContainers.length > 0) {
      return consultingChain == null
        ? sourceAddressesMayShareFile(this.publication, root.sourceAddressHandle, seam.addressHandle)
        : scopedContainers.some((container) => consultingChain.has(container));
    }
    return consultingChain == null
      && sourceAddressesMayShareFile(this.publication, root.sourceAddressHandle, seam.addressHandle);
  }

  private consultingContainerIdentityForRoot(root: FrameworkServiceRoot): IdentityHandle | null {
    if (this.consultingContainerCache.has(root.productHandle)) {
      return this.consultingContainerCache.get(root.productHandle) ?? null;
    }
    if (this.consultingContainerStack.has(root.productHandle)) {
      return null;
    }
    this.consultingContainerStack.add(root.productHandle);
    const resolved = this.resolveConsultingContainerIdentityForRoot(root);
    this.consultingContainerStack.delete(root.productHandle);
    this.consultingContainerCache.set(root.productHandle, resolved);
    return resolved;
  }

  private resolveConsultingContainerIdentityForRoot(root: FrameworkServiceRoot): IdentityHandle | null {
    switch (root.basis) {
      case FrameworkServiceRootBasis.AppTaskDeclaredKey:
        return this.appTaskConsultingContainerIdentity(root);
      case FrameworkServiceRootBasis.ContainerGetBacked:
        return this.containerGetConsultingContainerIdentity(root);
      case FrameworkServiceRootBasis.DiActivationBacked:
        return this.resourceActivationConsultingContainerIdentity(root);
      case FrameworkServiceRootBasis.DirectConstructor:
        return this.chainFacts.containerIdentityHandleForProduct(
          this.serviceRootEnrichment.directContainerProductHandleForRoot(root.productHandle),
        );
      case FrameworkServiceRootBasis.FrameworkTypeAnnotation:
      case FrameworkServiceRootBasis.DeclarationSourceMatched:
      case FrameworkServiceRootBasis.CandidateOpen:
        return null;
    }
  }

  private containerGetConsultingContainerIdentity(root: FrameworkServiceRoot): IdentityHandle | null {
    if (root.ownerProductHandle == null) {
      return null;
    }
    const owner = this.serviceRootsByProduct.get(root.ownerProductHandle) ?? null;
    return owner == null
      ? null
      : this.consultingContainerIdentityForRoot(owner);
  }

  private appTaskConsultingContainerIdentity(root: FrameworkServiceRoot): IdentityHandle | null {
    const rootSpan = sourceSpanAddressForAddress(this.publication, root.sourceAddressHandle);
    if (rootSpan == null) {
      return null;
    }
    const containerHandles = this.configuration.appTasks.flatMap((appTask) => {
      if (!appTaskContainsRoot(this.publication, appTask, rootSpan)) {
        return [];
      }
      return this.appTaskContainerIdentitiesByTask.get(appTask.productHandle) ?? [];
    });
    return uniqueIdentityHandleOrNull(containerHandles);
  }

  private resourceActivationConsultingContainerIdentity(root: FrameworkServiceRoot): IdentityHandle | null {
    const rootSpan = sourceSpanAddressForAddress(this.publication, root.sourceAddressHandle);
    if (rootSpan == null) {
      return null;
    }
    const matchingResources = [
      ...this.templates.resources,
      ...this.templates.authoringResources,
    ].filter((resource) =>
      resourceDefinitionContainsSpan(this.publication, this.typeSystem, resource, rootSpan)
    );
    const appRootResources = matchingResources.filter((resource) =>
      resource.compilation.definition.productHandle != null
      && resource.compilation.definition.productHandle === resource.compilation.appRootDefinitionProductHandle
    );
    // App.app({ component }) proves activation in this cohort; compiler visibility in sibling worlds does not.
    const activationResources = appRootResources.length > 0 ? appRootResources : matchingResources;
    const containerHandles = activationResources.flatMap((resource) => {
      const containerIdentityHandle = this.chainFacts.containerIdentityHandleForProduct(
        resource.compilation.compilerWorld.container.productHandle,
      );
      return containerIdentityHandle == null ? [] : [containerIdentityHandle];
    });
    return uniqueIdentityHandleOrNull(containerHandles);
  }
}

function appTaskContainsRoot(
  store: KernelStoreReadView,
  appTask: AppTaskDefinition,
  rootSpan: SourceSpanAddress,
): boolean {
  const callbackSpan = sourceSpanAddressForAddress(store, appTask.callback?.addressHandle ?? null);
  const keySpan = sourceSpanAddressForAddress(store, appTask.key?.addressHandle ?? null);
  const taskSpan = sourceSpanAddressForAddress(store, appTask.sourceAddressHandle);
  return spanContains(callbackSpan, rootSpan)
    || spanContains(keySpan, rootSpan)
    || spanContains(taskSpan, rootSpan);
}

function appTaskContainerIdentitiesByTask(
  world: DiWorldConstructionEmission,
): ReadonlyMap<ProductHandle, readonly IdentityHandle[]> {
  const result = new Map<ProductHandle, Set<IdentityHandle>>();
  for (const registration of world.registeredAppTasks) {
    const containerIdentityHandle = registration.container.identityHandle;
    if (containerIdentityHandle == null) {
      continue;
    }
    let containers = result.get(registration.task.productHandle);
    if (containers == null) {
      containers = new Set();
      result.set(registration.task.productHandle, containers);
    }
    containers.add(containerIdentityHandle);
  }
  return new Map([...result].map(([handle, containers]) => [handle, [...containers]]));
}

function resourceDefinitionContainsSpan(
  store: KernelStoreReadView,
  typeSystem: TypeSystemProject,
  resource: TemplateResourceRuntimeAnalysisEmission,
  rootSpan: SourceSpanAddress,
): boolean {
  const definition = resource.compilation.definition;
  if ([
    sourceSpanAddressForAddress(store, definition.sourceAddressHandle),
    sourceSpanAddressForAddress(store, definition.target.addressHandle),
  ].some((span) => spanContains(span, rootSpan))) {
    return true;
  }
  const targetName = definition.target.localName;
  if (targetName == null) {
    return false;
  }
  const sourceFilePath = sourceFilePathForSpan(store, rootSpan);
  const sourceFile = sourceFilePath == null
    ? null
    : typeSystem.readProgramSourceFileByPath(sourceFilePath);
  return sourceFile == null
    ? false
    : classDeclarationNamedContainsSpan(sourceFile, targetName, rootSpan);
}

function spanContains(
  outer: SourceSpanAddress | null,
  inner: SourceSpanAddress,
): boolean {
  return outer != null && sourceSpanContains(outer, inner);
}

function sourceFilePathForSpan(
  store: KernelStoreReadView,
  span: SourceSpanAddress,
): string | null {
  const file = store.read(span.fileHandle);
  return file?.kind === 'source-file-address' ? file.path : null;
}

function classDeclarationNamedContainsSpan(
  sourceFile: ts.SourceFile,
  className: string,
  span: SourceSpanAddress,
): boolean {
  let matched = false;
  const visit = (node: ts.Node): void => {
    if (matched) {
      return;
    }
    if (
      ts.isClassDeclaration(node)
      && node.name?.text === className
      && node.getStart(sourceFile) <= span.start
      && span.end <= node.end
    ) {
      matched = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return matched;
}

function uniqueIdentityHandleOrNull(
  handles: readonly IdentityHandle[],
): IdentityHandle | null {
  const unique = new Set(handles);
  return unique.size === 1
    ? [...unique][0] ?? null
    : null;
}

class TemplateCapabilityAdmission {
  constructor(
    readonly admissionState: FrameworkCapabilityAdmissionState,
    readonly admissionSourceAddressHandles: readonly AddressHandle[] = [],
    readonly configurationSourceAddressHandles: readonly AddressHandle[] = [],
    readonly blockingOpenSeamHandles: readonly OpenSeamHandle[] = [],
  ) {}
}

class TemplateCapabilityAdmissionContext {
  private readonly admissionsByContainer = new Map<ProductHandle, readonly RegistrationAdmissionProduct[]>();

  constructor(
    private readonly store: KernelMaterializationReadView,
    private readonly configuration: ConfigurationKernelEmission,
    private readonly world: DiWorldConstructionEmission,
    private readonly containerChainFacts: DiContainerChainFacts,
  ) {}

  forSyntax(
    resource: TemplateResourceRuntimeAnalysisEmission,
    syntax: AttributeSyntax,
    demand: CapabilityDemandDescriptor,
    admitted: boolean,
  ): TemplateCapabilityAdmission {
    const admissionSources = this.admissionSourceAddressHandles(resource, demand.requiredCapability);
    if (demand.requiredCapability === FrameworkRegistrationCapability.I18nTranslationSyntax) {
      return this.forConfiguredSurface(
        resource,
        demand.requiredCapability,
        admitted,
        (admission) => {
          const configuration = i18nTranslationSyntaxConfigurationForAdmission(
            this.store,
            this.configuration,
            admission,
          );
          return {
            membership: configuration.membership(syntax.rawName),
            exclusionSourceAddressHandle: configuration.exclusionSourceAddressHandle(syntax.rawName),
            openSeamHandles: configuration.openSeamHandles,
          };
        },
      );
    }
    return new TemplateCapabilityAdmission(
      admissionStateForBoolean(admitted),
      admissionSources,
    );
  }

  forResource(
    resource: TemplateResourceRuntimeAnalysisEmission,
    builtIn: BuiltInResource,
    demand: CapabilityDemandDescriptor,
    admitted: boolean,
  ): TemplateCapabilityAdmission {
    const admissionSources = this.admissionSourceAddressHandles(resource, demand.requiredCapability);
    if (builtIn.packageId === BuiltInResourcePackage.ValidationHtml) {
      return this.forConfiguredSurface(
        resource,
        demand.requiredCapability,
        admitted,
        (admission) => {
          const configuration = validationHtmlResourceConfigurationForAdmission(
            this.store,
            this.configuration,
            admission,
          );
          return {
            membership: configuration.membership(builtIn.name),
            exclusionSourceAddressHandle: configuration.exclusionSourceAddressHandle(builtIn.name),
            openSeamHandles: configuration.openSeamHandles(builtIn.name),
          };
        },
      );
    }
    return new TemplateCapabilityAdmission(
      admissionStateForBoolean(admitted),
      admissionSources,
    );
  }

  forCapability(
    resource: TemplateResourceRuntimeAnalysisEmission,
    capability: FrameworkRegistrationCapability,
    admitted: boolean,
  ): TemplateCapabilityAdmission {
    return new TemplateCapabilityAdmission(
      admissionStateForBoolean(admitted),
      this.admissionSourceAddressHandles(resource, capability),
    );
  }

  private forConfiguredSurface(
    resource: TemplateResourceRuntimeAnalysisEmission,
    capability: FrameworkRegistrationCapability,
    admitted: boolean,
    configurationForAdmission: (admission: RegistrationAdmissionProduct) => ConfiguredSurfaceMembership,
  ): TemplateCapabilityAdmission {
    const admissions = this.admissionsForResource(resource)
      .filter((admission) => frameworkRegistrationAdmissionCarriesCapability(admission, capability));
    const admissionSources = [...new Set(admissions.flatMap((admission) =>
      admission.sourceAddressHandle == null ? [] : [admission.sourceAddressHandle]
    ))];
    if (admissions.length === 0) {
      return new TemplateCapabilityAdmission(
        FrameworkCapabilityAdmissionState.NotAdmitted,
        admissionSources,
      );
    }
    const memberships = admissions.map(configurationForAdmission);
    if (memberships.some((membership) =>
      membership.membership === FrameworkCapabilityConfigurationMembership.Included
    )) {
      return new TemplateCapabilityAdmission(
        admitted
          ? FrameworkCapabilityAdmissionState.Admitted
          : FrameworkCapabilityAdmissionState.AdmissionUnknown,
        admissionSources,
      );
    }
    const openMemberships = memberships.filter((membership) =>
      membership.membership === FrameworkCapabilityConfigurationMembership.Open
    );
    if (openMemberships.length > 0) {
      return new TemplateCapabilityAdmission(
        FrameworkCapabilityAdmissionState.AdmissionUnknown,
        admissionSources,
        [],
        [...new Set(openMemberships.flatMap((membership) => membership.openSeamHandles))],
      );
    }
    return new TemplateCapabilityAdmission(
      FrameworkCapabilityAdmissionState.ConfiguredOut,
      admissionSources,
      [...new Set(memberships.flatMap((membership) =>
        membership.exclusionSourceAddressHandle == null ? [] : [membership.exclusionSourceAddressHandle]
      ))],
    );
  }

  private admissionSourceAddressHandles(
    resource: TemplateResourceRuntimeAnalysisEmission,
    capability: FrameworkRegistrationCapability,
  ): readonly AddressHandle[] {
    return [...new Set(this.admissionsForResource(resource)
      .filter((admission) => frameworkRegistrationAdmissionCarriesCapability(admission, capability))
      .flatMap((admission) => admission.sourceAddressHandle == null ? [] : [admission.sourceAddressHandle]))];
  }

  private admissionsForResource(
    resource: TemplateResourceRuntimeAnalysisEmission,
  ): readonly RegistrationAdmissionProduct[] {
    const container = resource.compilation.compilerWorld.container;
    const containerProductHandle = container.productHandle;
    if (containerProductHandle == null) {
      return [];
    }
    let admissions = this.admissionsByContainer.get(containerProductHandle);
    if (admissions == null) {
      admissions = registrationAdmissionsVisibleToContainer(
        container,
        this.configuration.registrationAdmissions,
        this.world,
        this.containerChainFacts,
      );
      this.admissionsByContainer.set(containerProductHandle, admissions);
    }
    return admissions;
  }
}

interface ConfiguredSurfaceMembership {
  readonly membership: FrameworkCapabilityConfigurationMembership;
  readonly exclusionSourceAddressHandle: AddressHandle | null;
  readonly openSeamHandles: readonly OpenSeamHandle[];
}

function admissionStateForBoolean(
  admitted: boolean,
): FrameworkCapabilityAdmissionState {
  return admitted
    ? FrameworkCapabilityAdmissionState.Admitted
    : FrameworkCapabilityAdmissionState.NotAdmitted;
}

function compilerWorldBuiltInAttributePatternMatchForSyntax(
  resource: TemplateResourceRuntimeAnalysisEmission,
  syntax: AttributeSyntax,
): readonly [handler: BuiltInAttributePattern, score: AttributePatternScore] | null {
  const compiledPatternProductHandle = syntax.compiledPatternProductHandle;
  if (compiledPatternProductHandle == null) {
    return null;
  }
  const pattern = resource.compilation.compilerWorld.attributePatterns.find((candidate) =>
    candidate.handler != null
    && candidate.compiledPatterns.some((compiled) => compiled.productHandle === compiledPatternProductHandle)
  ) ?? null;
  const compiled = pattern?.compiledPatterns.find((candidate) =>
    candidate.productHandle === compiledPatternProductHandle
  ) ?? null;
  return pattern?.handler != null && compiled != null
    ? [pattern.handler, compiled.score]
    : null;
}

function compilerWorldBuiltInBindingCommand(
  resource: TemplateResourceRuntimeAnalysisEmission,
  commandName: string,
): BuiltInBindingCommand | null {
  const executable = resource.compilation.compilerWorld.bindingCommandResolver.get(commandName);
  if (executable == null) {
    return null;
  }
  return resource.compilation.compilerWorld.bindingCommands.find((command) =>
    command.executable.productHandle === executable.productHandle
  )?.handler ?? null;
}

function syntaxCapabilityDemandSites(
  resource: TemplateResourceRuntimeAnalysisEmission,
  admissionContext: TemplateCapabilityAdmissionContext,
): readonly CapabilityDemandSite[] {
  const compilerReachableAttributes = resourceLocalCompilerReachableHtmlAttributeProductHandles(resource);
  return resource.compilation.authoredAttributeSyntaxes.flatMap((syntax) => {
    if (
      syntax.attribute.productHandle == null
      || !compilerReachableAttributes.has(syntax.attribute.productHandle)
    ) {
      return [];
    }
    const admittedPattern = compilerWorldBuiltInAttributePatternMatchForSyntax(resource, syntax);
    const admittedHandler = admittedPattern?.[0] ?? null;
    const handler = admittedHandler ?? parseBuiltInAttributeSyntax(syntax.rawName, syntax.rawValue).handler;
    if (handler == null) {
      return [];
    }
    const demand = capabilityForBuiltInSyntaxGroup(handler.group);
    if (demand == null) {
      return [];
    }
    const sites = [siteForAttributeSyntax(
      resource,
      syntax,
      demand,
      admissionContext.forSyntax(resource, syntax, demand, admittedHandler != null),
    )];
    const knownPattern = parseBuiltInAttributeSyntax(syntax.rawName, syntax.rawValue);
    if (
      admittedPattern != null
      && knownPattern.handler != null
      && knownPattern.pattern != null
      && knownPattern.handler.group !== admittedHandler?.group
      && isBetterAttributePatternScore(
        compileAttributePatternDefinition(knownPattern.pattern).score,
        admittedPattern[1],
      )
    ) {
      const knownDemand = capabilityForBuiltInSyntaxGroup(knownPattern.handler.group);
      if (knownDemand != null) {
        sites.push(siteForAttributeSyntax(
          resource,
          syntax,
          knownDemand,
          admissionContext.forSyntax(resource, syntax, knownDemand, false),
        ));
      }
    }
    return sites;
  });
}

function bindingCommandCapabilityDemandSites(
  resource: TemplateResourceRuntimeAnalysisEmission,
  admissionContext: TemplateCapabilityAdmissionContext,
): readonly CapabilityDemandSite[] {
  const compilerReachableAttributes = resourceLocalCompilerReachableHtmlAttributeProductHandles(resource);
  return resource.compilation.authoredAttributeSyntaxes.flatMap((syntax) => {
    if (
      syntax.attribute.productHandle == null
      || !compilerReachableAttributes.has(syntax.attribute.productHandle)
    ) {
      return [];
    }
    const commandName = syntax.command?.toLowerCase() ?? null;
    if (commandName == null) {
      return [];
    }
    const admittedCommand = compilerWorldBuiltInBindingCommand(resource, commandName);
    const command = admittedCommand ?? findUniqueBuiltInBindingCommandByName(commandName);
    if (command == null) {
      return [];
    }
    const demand = capabilityForBuiltInBindingCommand(command);
    if (demand == null) {
      return [];
    }
    return [siteForAttributeSyntax(
      resource,
      syntax,
      demand,
      admissionContext.forSyntax(resource, syntax, demand, admittedCommand != null),
    )];
  });
}

function resourceCapabilityDemandSites(
  publication: KernelPublicationContext,
  resource: TemplateResourceRuntimeAnalysisEmission,
  admissionContext: TemplateCapabilityAdmissionContext,
): readonly CapabilityDemandSite[] {
  const attributesByProduct = new Map(resource.compilation.html.attributes.map((attribute) => [attribute.productHandle, attribute]));
  const ownersByAttributeProduct = htmlElementAttributeOwnersByAttributeProduct(
    resource.compilation.html.nodes,
    resource.compilation.html.attributes,
  );
  const compilerReachableNodes = resourceLocalCompilerReachableHtmlNodeProductHandles(resource);
  const compilerReachableAttributes = resourceLocalCompilerReachableHtmlAttributeProductHandles(resource);
  return [
    ...elementResourceCapabilityDemandSites(
      publication,
      resource,
      ownersByAttributeProduct,
      compilerReachableNodes,
      admissionContext,
    ),
    ...attributeResourceCapabilityDemandSites(
      publication,
      resource,
      attributesByProduct,
      ownersByAttributeProduct,
      compilerReachableAttributes,
      admissionContext,
    ),
  ];
}

function elementResourceCapabilityDemandSites(
  publication: KernelPublicationContext,
  resource: TemplateResourceRuntimeAnalysisEmission,
  ownersByAttributeProduct: ReadonlyMap<string, HtmlElementAttributeOwner>,
  compilerReachableNodes: ReadonlySet<ProductHandle>,
  admissionContext: TemplateCapabilityAdmissionContext,
): readonly CapabilityDemandSite[] {
  const elementOwners = elementOwnersForResource(resource, ownersByAttributeProduct);
  return elementOwners.flatMap((owner) => {
    if (!compilerReachableNodes.has(owner.element.productHandle)) {
      return [];
    }
    const lookupName = htmlElementLookupName(owner.element, owner);
    const selected = resource.compilation.compilerWorld.resourceResolver.el(lookupName);
    const builtIn = selected == null
      ? builtInResourceFor(ResourceDefinitionKind.CustomElement, lookupName)
      : readBuiltInVisibleTemplateResource(publication, selected);
    if (builtIn == null) {
      return [];
    }
    const demand = capabilityForBuiltInResource(builtIn);
    if (demand == null) {
      return [];
    }
    return [siteForElementResource(
      resource,
      owner.element,
      lookupName,
      demand,
      admissionContext.forResource(resource, builtIn, demand, selected != null),
    )];
  });
}

function attributeResourceCapabilityDemandSites(
  publication: KernelPublicationContext,
  resource: TemplateResourceRuntimeAnalysisEmission,
  attributesByProduct: ReadonlyMap<string, HtmlAttribute>,
  ownersByAttributeProduct: ReadonlyMap<string, HtmlElementAttributeOwner>,
  compilerReachableAttributes: ReadonlySet<ProductHandle>,
  admissionContext: TemplateCapabilityAdmissionContext,
): readonly CapabilityDemandSite[] {
  return resource.compilation.attributeSyntax.syntaxes.flatMap((syntax) => {
    if (
      syntax.attribute.productHandle == null
      || !compilerReachableAttributes.has(syntax.attribute.productHandle)
    ) {
      return [];
    }
    const attribute = syntax.attribute.productHandle == null
      ? null
      : attributesByProduct.get(syntax.attribute.productHandle) ?? null;
    const owner = syntax.attribute.productHandle == null
      ? null
      : ownersByAttributeProduct.get(syntax.attribute.productHandle) ?? null;
    const selected = resource.compilation.compilerWorld.resourceResolver.attr(syntax.target);
    const builtIn = selected == null
      ? builtInAttributeResourceForSyntax(syntax, attribute, owner)
      : readBuiltInVisibleTemplateResource(publication, selected);
    if (
      builtIn == null
      || suppressBuiltInAttributeResourceDemand(builtIn, syntax, attribute, owner)
    ) {
      return [];
    }
    const demand = capabilityForBuiltInResource(builtIn);
    if (demand == null) {
      return [];
    }
    return [siteForAttributeSyntax(
      resource,
      syntax,
      demand,
      admissionContext.forResource(resource, builtIn, demand, selected != null),
    )];
  });
}

function expressionResourceCapabilityDemandSites(
  publication: KernelPublicationContext,
  resource: TemplateResourceRuntimeAnalysisEmission,
  admissionContext: TemplateCapabilityAdmissionContext,
): readonly CapabilityDemandSite[] {
  return resourceLocalEffectiveTemplateExpressionParses(publication, resource).flatMap((parse, parseIndex) => {
    const expression = runtimeAcceptedBindingExpressionAstForParse(parse);
    if (expression == null) {
      return [];
    }
    return [
      ...valueConverterResourceOccurrences(expression).flatMap(({ expression: converter }, converterIndex) =>
        siteForExpressionResource(
          publication,
          resource,
          parse,
          converter,
          `parse:${parseIndex}:value-converter:${converterIndex}`,
          admissionContext,
        )
      ),
      ...bindingBehaviorResourceOccurrences(expression).flatMap(({ expression: behavior }, behaviorIndex) =>
        siteForExpressionResource(
          publication,
          resource,
          parse,
          behavior,
          `parse:${parseIndex}:binding-behavior:${behaviorIndex}`,
          admissionContext,
        )
      ),
    ];
  });
}

function siteForAttributeSyntax(
  resource: TemplateResourceRuntimeAnalysisEmission,
  syntax: AttributeSyntax,
  demand: CapabilityDemandDescriptor,
  admission: TemplateCapabilityAdmission,
): CapabilityDemandSite {
  return {
    siteKind: FrameworkCapabilityDemandSiteKind.TemplateAttribute,
    demandKind: demand.demandKind,
    requiredCapability: demand.requiredCapability,
    authoredName: syntax.rawName,
    admissionState: admission.admissionState,
    blockingOpenSeamHandles: admission.blockingOpenSeamHandles,
    admissionSourceAddressHandles: admission.admissionSourceAddressHandles,
    configurationSourceAddressHandles: admission.configurationSourceAddressHandles,
    sourceAddressHandle: syntax.sourceAddressHandle,
    ownerIdentityHandle: syntax.identityHandle,
    resource,
  };
}

function siteForElementResource(
  resource: TemplateResourceRuntimeAnalysisEmission,
  element: HtmlElement,
  lookupName: string,
  demand: CapabilityDemandDescriptor,
  admission: TemplateCapabilityAdmission,
): CapabilityDemandSite {
  return {
    siteKind: FrameworkCapabilityDemandSiteKind.TemplateElement,
    demandKind: demand.demandKind,
    requiredCapability: demand.requiredCapability,
    authoredName: lookupName,
    admissionState: admission.admissionState,
    blockingOpenSeamHandles: admission.blockingOpenSeamHandles,
    admissionSourceAddressHandles: admission.admissionSourceAddressHandles,
    configurationSourceAddressHandles: admission.configurationSourceAddressHandles,
    sourceAddressHandle: element.sourceAddressHandle,
    ownerIdentityHandle: element.identityHandle,
    resource,
  };
}

function siteForExpressionResource(
  publication: KernelPublicationContext,
  resource: TemplateResourceRuntimeAnalysisEmission,
  parse: TemplateExpressionParse,
  expression: ValueConverterExpression | BindingBehaviorExpression,
  localPart: string,
  admissionContext: TemplateCapabilityAdmissionContext,
): readonly CapabilityDemandSite[] {
  const isValueConverter = expression.$kind === 'ValueConverter';
  const siteKind = isValueConverter
    ? FrameworkCapabilityDemandSiteKind.TemplateValueConverter
    : FrameworkCapabilityDemandSiteKind.TemplateBindingBehavior;
  const resourceKind = isValueConverter
    ? ResourceDefinitionKind.ValueConverter
    : ResourceDefinitionKind.BindingBehavior;
  const authoredName = expression.name.name;
  const nameSpan = expression.name.span;
  const expressionSource = sourceAddressForRuntimeExpressionSpan(
    publication,
    [
      'framework-capability-demand-expression',
      localKeyPart(resource.compilation.localKey),
      localKeyPart(parse.productHandle),
      localKeyPart(localPart),
      localKeyPart(authoredName),
    ].join(':'),
    parse.sourceAddressHandle,
    nameSpan,
  );
  const plan = resource.runtimeAnalysis.expressionResourcePlan;
  const planFacts = isValueConverter
    ? (() => {
        const entries = plan.readValueConverterEntries(parse.productHandle, expression);
        return {
          admitted: entries.length === 0
            ? null
            : entries.every((entry) => entry.resource != null),
          selectedBuiltIn: entries.find((entry) => entry.builtInResource != null)?.builtInResource ?? null,
          hasUnresolvedResource: entries.length === 0 || entries.some((entry) => entry.resource == null),
          applicationProductHandles: entries.flatMap((entry) =>
            resource.runtimeAnalysis.valueConverter.readApplicationsForPlanEntry(entry).map((application) =>
              application.productHandle
            )
          ),
        };
      })()
    : (() => {
        const entries = plan.readBindingBehaviorEntries(parse.productHandle, expression);
        return {
          admitted: entries.length === 0
            ? null
            : entries.every((entry) => entry.resource != null),
          selectedBuiltIn: entries.find((entry) => entry.builtInResource != null)?.builtInResource ?? null,
          hasUnresolvedResource: entries.length === 0 || entries.some((entry) => entry.resource == null),
          applicationProductHandles: entries.flatMap((entry) =>
            resource.runtimeAnalysis.bindingBehavior.readApplicationsForPlanEntry(entry).map((application) =>
              application.productHandle
            )
          ),
        };
      })();
  const visibleResource = findVisibleTemplateResource(
    resource.compilation.compilerWorld.resourceScope,
    resourceKind,
    authoredName,
  );
  const visibleBuiltIn = readBuiltInVisibleTemplateResource(publication, visibleResource);
  const builtIn = planFacts.selectedBuiltIn
    ?? (
      planFacts.hasUnresolvedResource
        ? visibleResource == null
          ? builtInResourceFor(resourceKind, authoredName)
          : visibleBuiltIn
        : null
    );
  if (builtIn == null) {
    return [];
  }
  const demand = capabilityForBuiltInResource(builtIn);
  if (demand == null) {
    return [];
  }
  const admitted = planFacts.admitted ?? visibleResource != null;
  const admission = admissionContext.forCapability(resource, demand.requiredCapability, admitted);
  return [{
    siteKind,
    demandKind: demand.demandKind,
    requiredCapability: demand.requiredCapability,
    authoredName,
    admissionState: admission.admissionState,
    admissionSourceAddressHandles: admission.admissionSourceAddressHandles,
    sourceAddressHandle: expressionSource.handle,
    ownerIdentityHandle: parse.identityHandle,
    expressionResourceApplicationProductHandles: planFacts.applicationProductHandles,
    resource,
    sourceRecords: expressionSource.records,
  }];
}

interface CapabilityDemandDescriptor {
  readonly demandKind: FrameworkCapabilityDemandKind;
  readonly requiredCapability: FrameworkRegistrationCapability;
}

function capabilityForBuiltInSyntaxGroup(
  group: BuiltInSyntaxGroup,
): CapabilityDemandDescriptor | null {
  switch (group) {
    case BuiltInSyntaxGroup.DefaultBindingSyntax:
      return {
        demandKind: FrameworkCapabilityDemandKind.RuntimeHtmlDefaultBindingSyntax,
        requiredCapability: FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingSyntax,
      };
    case BuiltInSyntaxGroup.ShortHandBindingSyntax:
      return {
        demandKind: FrameworkCapabilityDemandKind.RuntimeHtmlShortHandBindingSyntax,
        requiredCapability: FrameworkRegistrationCapability.RuntimeHtmlShortHandBindingSyntax,
      };
    case BuiltInSyntaxGroup.PromiseTemplateControllerSyntax:
      return {
        demandKind: FrameworkCapabilityDemandKind.RuntimeHtmlDefaultResources,
        requiredCapability: FrameworkRegistrationCapability.RuntimeHtmlDefaultResources,
      };
    case BuiltInSyntaxGroup.I18nTranslationSyntax:
      return {
        demandKind: FrameworkCapabilityDemandKind.I18nTranslationSyntax,
        requiredCapability: FrameworkRegistrationCapability.I18nTranslationSyntax,
      };
    case BuiltInSyntaxGroup.StateSyntax:
      return {
        demandKind: FrameworkCapabilityDemandKind.StateBindingSyntax,
        requiredCapability: FrameworkRegistrationCapability.StateBindingSyntax,
      };
    case BuiltInSyntaxGroup.DefaultBindingLanguage:
      return {
        demandKind: FrameworkCapabilityDemandKind.RuntimeHtmlDefaultBindingLanguage,
        requiredCapability: FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingLanguage,
      };
  }
}

function capabilityForBuiltInBindingCommand(
  command: BuiltInBindingCommand,
): CapabilityDemandDescriptor | null {
  switch (command.group) {
    case BuiltInSyntaxGroup.DefaultBindingLanguage:
      return {
        demandKind: FrameworkCapabilityDemandKind.RuntimeHtmlDefaultBindingLanguage,
        requiredCapability: FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingLanguage,
      };
    case BuiltInSyntaxGroup.I18nTranslationSyntax:
      return {
        demandKind: FrameworkCapabilityDemandKind.I18nTranslationSyntax,
        requiredCapability: FrameworkRegistrationCapability.I18nTranslationSyntax,
      };
    case BuiltInSyntaxGroup.StateSyntax:
      return {
        demandKind: FrameworkCapabilityDemandKind.StateBindingSyntax,
        requiredCapability: FrameworkRegistrationCapability.StateBindingSyntax,
      };
  }
}

function capabilityForBuiltInResource(
  resource: BuiltInResource,
): CapabilityDemandDescriptor | null {
  switch (resource.packageId) {
    case BuiltInResourcePackage.RuntimeHtml:
      return {
        demandKind: FrameworkCapabilityDemandKind.RuntimeHtmlDefaultResources,
        requiredCapability: FrameworkRegistrationCapability.RuntimeHtmlDefaultResources,
      };
    case BuiltInResourcePackage.I18n:
      return {
        demandKind: FrameworkCapabilityDemandKind.I18nDefaultResources,
        requiredCapability: FrameworkRegistrationCapability.I18nDefaultResources,
      };
    case BuiltInResourcePackage.ValidationHtml:
      return {
        demandKind: FrameworkCapabilityDemandKind.ValidationHtmlDefaultResources,
        requiredCapability: FrameworkRegistrationCapability.ValidationHtmlDefaultResources,
      };
    case BuiltInResourcePackage.Router:
      return {
        demandKind: FrameworkCapabilityDemandKind.RouterDefaultResources,
        requiredCapability: FrameworkRegistrationCapability.RouterDefaultResources,
      };
    case BuiltInResourcePackage.UiVirtualization:
      return {
        demandKind: FrameworkCapabilityDemandKind.UiVirtualizationDefaultResources,
        requiredCapability: FrameworkRegistrationCapability.UiVirtualizationDefaultResources,
      };
    case BuiltInResourcePackage.State:
      return {
        demandKind: FrameworkCapabilityDemandKind.StateDefaultResources,
        requiredCapability: FrameworkRegistrationCapability.StateDefaultResources,
      };
  }
}

function sourceServiceApiDemandDescriptor(
  root: FrameworkServiceRoot,
): CapabilityDemandDescriptor | null {
  if (
    root.rootKind !== FrameworkServiceRootKind.Service
    || !frameworkServiceRootBasisResolvesDiKey(root.basis)
  ) {
    return null;
  }
  switch (root.serviceKeyName) {
    case 'IDialogService':
    case 'DialogService':
      return {
        demandKind: FrameworkCapabilityDemandKind.DialogServiceResolvers,
        requiredCapability: FrameworkRegistrationCapability.DialogServiceResolvers,
      };
    case 'IValidationRules':
      return {
        demandKind: FrameworkCapabilityDemandKind.ValidationServiceResolvers,
        requiredCapability: FrameworkRegistrationCapability.ValidationServiceResolvers,
      };
    case 'IHttpClient':
    case 'HttpClient':
    case 'ValidationRules':
    default:
      return null;
  }
}

function builtInResourceFor(
  resourceKind: ResourceDefinitionKind,
  name: string,
): BuiltInResource | null {
  const normalized = name.toLowerCase();
  return allBuiltInResources().find((resource) =>
    resource.resourceKind === resourceKind
    && (
      resource.name.toLowerCase() === normalized
      || resource.aliases.some((alias) => alias.toLowerCase() === normalized)
    )
  ) ?? null;
}

function builtInAttributeResourceForSyntax(
  syntax: AttributeSyntax,
  attribute: HtmlAttribute | null,
  owner: HtmlElementAttributeOwner | null,
): BuiltInResource | null {
  const builtIn = builtInResourceFor(ResourceDefinitionKind.TemplateController, syntax.target)
    ?? builtInResourceFor(ResourceDefinitionKind.CustomAttribute, syntax.target);
  if (builtIn == null || suppressBuiltInAttributeResourceDemand(builtIn, syntax, attribute, owner)) {
    return null;
  }
  return builtIn;
}

function suppressBuiltInAttributeResourceDemand(
  resource: BuiltInResource,
  syntax: AttributeSyntax,
  attribute: HtmlAttribute | null,
  owner: HtmlElementAttributeOwner | null,
): boolean {
  if (resource.packageId !== BuiltInResourcePackage.Router || resource.name !== 'href') {
    return false;
  }
  const explicitExternal = owner?.attributes.some((candidate) =>
    candidate.rawName.toLowerCase() === 'external'
    || candidate.rawName.toLowerCase() === 'data-external'
  ) ?? false;
  if (explicitExternal) {
    return true;
  }
  return !routerHrefHasRouterOwnershipCue(syntax, attribute);
}

function routerHrefHasRouterOwnershipCue(
  syntax: AttributeSyntax,
  attribute: HtmlAttribute | null,
): boolean {
  return syntax.command === BuiltInBindingCommandName.Bind
    || syntax.command === BuiltInBindingCommandName.ToView
    || syntax.command === BuiltInBindingCommandName.OneTime
    || attribute?.rawValue.includes('route.bind') === true
    || attribute?.rawValue.includes('params.bind') === true
    || attribute?.rawValue.includes('context.bind') === true;
}

function elementOwnersForResource(
  resource: TemplateResourceRuntimeAnalysisEmission,
  ownersByAttributeProduct: ReadonlyMap<string, HtmlElementAttributeOwner>,
): readonly HtmlElementAttributeOwner[] {
  const ownersByElement = new Map<string, HtmlElementAttributeOwner>();
  for (const owner of ownersByAttributeProduct.values()) {
    ownersByElement.set(owner.element.productHandle, owner);
  }
  for (const node of resource.compilation.html.nodes) {
    if (node instanceof HtmlElement && !ownersByElement.has(node.productHandle)) {
      ownersByElement.set(node.productHandle, new HtmlElementAttributeOwner(node, node.toReference(), []));
    }
  }
  return [...ownersByElement.values()];
}

function uniqueDemandSites(
  sites: readonly CapabilityDemandSite[],
): readonly CapabilityDemandSite[] {
  const seen = new Set<string>();
  const result: CapabilityDemandSite[] = [];
  for (const site of sites) {
    const key = [
      site.resourceDefinitionProductHandle ?? site.resource?.compilation.definition.productHandle ?? site.localKeyParts?.join(':') ?? '',
      site.analysisContextProductHandle ?? site.resource?.compilation.analysisContextProductHandle ?? '',
      site.siteKind,
      site.requiredCapability,
      site.authoredName,
      site.sourceAddressHandle ?? '',
    ].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(site);
  }
  return result;
}

function frameworkCapabilityDemandLocalKey(
  projectKey: string,
  site: CapabilityDemandSite,
  index: number,
): string {
  return [
    'framework-capability-demand',
    projectKey,
    ...(site.localKeyParts ?? [
      localKeyPart(site.analysisContextProductHandle ?? site.resource?.compilation.analysisContextProductHandle ?? 'no-analysis-context'),
      localKeyPart(site.resource?.compilation.localKey ?? 'unknown'),
      index.toString(),
      localKeyPart(site.authoredName),
    ]),
  ].join(':');
}

interface RegistrationHidingOpenSeamFacts {
  readonly seams: readonly OpenSeam[];
  readonly constrainedAdmissions: ReadonlyMap<OpenSeamHandle, readonly RegistrationAdmissionProduct[]>;
  readonly containerScopes: ReadonlyMap<OpenSeamHandle, readonly IdentityHandle[]>;
}

/**
 * Project registration uncertainty from the exact DI spending loci that produced it.
 * A missing or user-authored admission leaves the seam unconstrained; a missing container
 * leaves it world-scoped. Neither uncertainty is reconstructed from publication topology.
 */
function registrationHidingOpenSeamFacts(
  world: DiWorldConstructionEmission,
  configuration: ConfigurationKernelEmission,
): RegistrationHidingOpenSeamFacts {
  const seamsByHandle = new Map(
    [
      ...world.openSeams,
      ...configuration.openSeamScopes.map((scope) => scope.seam),
    ]
      .filter(isRegistrationHidingOpenSeam)
      .map((seam) => [seam.handle, seam] as const),
  );
  const admissionsByProduct = new Map<ProductHandle, RegistrationAdmissionProduct>(
    configuration.registrationAdmissions.map((admission) => [admission.productHandle, admission]),
  );
  const admissionsBySeam = new Map<OpenSeamHandle, Map<ProductHandle, RegistrationAdmissionProduct>>();
  const admissionUnconstrainedSeams = new Set<OpenSeamHandle>();
  const containersBySeam = new Map<OpenSeamHandle, Set<IdentityHandle>>();
  const containerUnconstrainedSeams = new Set<OpenSeamHandle>();

  const recordScope = (
    seam: OpenSeam,
    admissionProductHandle: ProductHandle | null,
    containerIdentityHandle: IdentityHandle | null,
  ): void => {
    if (!seamsByHandle.has(seam.handle)) {
      return;
    }
    const admission = admissionProductHandle == null
      ? null
      : admissionsByProduct.get(admissionProductHandle) ?? null;
    if (admission == null || frameworkRegistrationKindForAdmission(admission) == null) {
      admissionUnconstrainedSeams.add(seam.handle);
    } else {
      let admissions = admissionsBySeam.get(seam.handle);
      if (admissions == null) {
        admissions = new Map();
        admissionsBySeam.set(seam.handle, admissions);
      }
      admissions.set(admission.productHandle, admission);
    }

    if (containerIdentityHandle == null) {
      containerUnconstrainedSeams.add(seam.handle);
    } else {
      let containers = containersBySeam.get(seam.handle);
      if (containers == null) {
        containers = new Set();
        containersBySeam.set(seam.handle, containers);
      }
      containers.add(containerIdentityHandle);
    }
  };

  for (const scope of configuration.openSeamScopes) {
    recordScope(scope.seam, null, scope.containerIdentityHandle);
  }
  for (const scope of world.registrationOpenSeamScopes) {
    recordScope(scope.seam, scope.admissionProductHandle, scope.containerIdentityHandle);
  }

  return {
    seams: [...seamsByHandle.values()],
    constrainedAdmissions: new Map(
      [...admissionsBySeam]
        .filter(([handle]) => !admissionUnconstrainedSeams.has(handle))
        .map(([handle, admissions]) => [handle, [...admissions.values()]] as const),
    ),
    containerScopes: new Map(
      [...containersBySeam]
        .filter(([handle]) => !containerUnconstrainedSeams.has(handle))
        .map(([handle, containers]) => [handle, [...containers]] as const),
    ),
  };
}

function isRegistrationHidingOpenSeam(
  seam: OpenSeam,
): boolean {
  switch (seam.seamKindKey) {
    case KernelVocabulary.Di.OpenRegistryBody.key:
      return true;
    case KernelVocabulary.Di.OpenRegistrationSpending.key:
      return seam.reasonKinds.some(isRegistrationHidingDiSpendingReason);
    case KernelVocabulary.Registration.OpenKeyExpression.key:
    case KernelVocabulary.Registration.OpenValueExpression.key:
    case KernelVocabulary.Registration.OpenStrategy.key:
    case KernelVocabulary.Registration.OpenSpread.key:
    case KernelVocabulary.Registration.OpenAliasTarget.key:
      return true;
    default:
      return false;
  }
}

function sourceAddressesMayShareFile(
  store: KernelStoreReadView,
  leftHandle: AddressHandle | null,
  rightHandle: AddressHandle | null,
): boolean {
  const left = sourceSpanAddressForAddress(store, leftHandle);
  const right = sourceSpanAddressForAddress(store, rightHandle);
  return left == null
    || right == null
    || left.fileHandle === right.fileHandle;
}

function uniqueIdentityHandles(
  handles: readonly IdentityHandle[],
): readonly IdentityHandle[] {
  return [...new Set(handles)];
}

function isRegistrationHidingDiSpendingReason(
  reason: OpenSeamReasonKind,
): boolean {
  switch (reason) {
    case OpenSeamReasonKind.DiRegistrationContainerOpen:
    case OpenSeamReasonKind.DiRegistrationAdmissionOpen:
    case OpenSeamReasonKind.DiRegistrationKeyOpen:
    case OpenSeamReasonKind.DiRegistrationStrategyOpen:
    case OpenSeamReasonKind.DiRegistrationPublicationOpen:
    case OpenSeamReasonKind.DiRegistryBodyOpen:
      return true;
    default:
      return false;
  }
}

function readCapabilityAvailabilityEvidence(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): CapabilityAvailabilityEvidenceContext {
  const rows = [
    ...manifestDependencyEvidence(project, readPackageManifest(project.inputGeneration.host, project.rootDir), FrameworkCapabilityPackageEvidenceKind.ProjectManifestDependency),
    ...manifestDependencyEvidence(project, nearestWorkspaceManifestForProject(project), FrameworkCapabilityPackageEvidenceKind.WorkspaceManifestDependency),
    ...sourceImportEvidence(project, typeSystem),
  ];
  return {
    byPackageName: groupEvidenceByPackage(rows),
  };
}

function manifestDependencyEvidence(
  project: ProjectBootFrame,
  manifest: BootPackageManifest | null,
  kind: FrameworkCapabilityPackageEvidenceKind.ProjectManifestDependency | FrameworkCapabilityPackageEvidenceKind.WorkspaceManifestDependency,
): readonly FrameworkCapabilityPackageEvidence[] {
  if (manifest == null) {
    return [];
  }
  return [
    ...manifestDependencyScopeEvidence(manifest.dependencies, 'dependencies', kind),
    ...manifestDependencyScopeEvidence(manifest.peerDependencies, 'peerDependencies', kind),
    ...manifestDependencyScopeEvidence(manifest.devDependencies, 'devDependencies', kind),
    ...manifestDependencyScopeEvidence(manifest.optionalDependencies, 'optionalDependencies', kind),
  ].map((row) => new FrameworkCapabilityPackageEvidence(
    row.evidenceKind,
    row.packageName,
    row.moduleName,
    row.scope,
    project.sourceFiles[0]?.addressHandle ?? null,
  ));
}

function manifestDependencyScopeEvidence(
  value: unknown,
  scope: Exclude<FrameworkCapabilityPackageEvidenceScope, 'import'>,
  kind: FrameworkCapabilityPackageEvidenceKind.ProjectManifestDependency | FrameworkCapabilityPackageEvidenceKind.WorkspaceManifestDependency,
): readonly {
  readonly evidenceKind: FrameworkCapabilityPackageEvidenceKind;
  readonly packageName: string;
  readonly moduleName: string;
  readonly scope: FrameworkCapabilityPackageEvidenceScope;
}[] {
  if (value == null || typeof value !== 'object') {
    return [];
  }
  return Object.keys(value)
    .filter(isAureliaPackageSpecifier)
    .map((packageName) => ({
      evidenceKind: kind,
      packageName,
      moduleName: packageName,
      scope,
    }));
}

function sourceImportEvidence(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly FrameworkCapabilityPackageEvidence[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    if (sourceFile == null) {
      return [];
    }
    const moduleNames = sourceFile.statements.flatMap((statement) => {
      if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) {
        return [];
      }
      const specifier = statement.moduleSpecifier;
      return specifier != null && (ts.isStringLiteral(specifier) || ts.isNoSubstitutionTemplateLiteral(specifier))
        ? [specifier.text]
        : [];
    });
    return uniqueStrings(moduleNames.map(packageNameForSpecifier).filter(isAureliaPackageSpecifier), 'sorted')
      .map((packageName) => new FrameworkCapabilityPackageEvidence(
        FrameworkCapabilityPackageEvidenceKind.SourceImport,
        packageName,
        packageName,
        'import',
        source.addressHandle,
      ));
  });
}

function groupEvidenceByPackage(
  rows: readonly FrameworkCapabilityPackageEvidence[],
): ReadonlyMap<string, readonly FrameworkCapabilityPackageEvidence[]> {
  const mutable = new Map<string, FrameworkCapabilityPackageEvidence[]>();
  for (const row of rows) {
    const existing = mutable.get(row.packageName);
    if (existing == null) {
      mutable.set(row.packageName, [row]);
    } else {
      existing.push(row);
    }
  }
  return mutable;
}

function recommendedModule(
  candidateModuleNames: readonly string[],
  packageEvidence: readonly FrameworkCapabilityPackageEvidence[],
): string | null {
  for (const candidate of candidateModuleNames) {
    if (packageEvidence.some((row) => row.packageName === packageNameForSpecifier(candidate))) {
      return candidate;
    }
  }
  return candidateModuleNames[0] ?? null;
}

function uniquePackageEvidence(
  rows: readonly FrameworkCapabilityPackageEvidence[],
): readonly FrameworkCapabilityPackageEvidence[] {
  const seen = new Set<string>();
  const result: FrameworkCapabilityPackageEvidence[] = [];
  for (const row of rows) {
    const key = [
      row.evidenceKind,
      row.packageName,
      row.moduleName,
      row.scope,
      row.sourceAddressHandle ?? '',
    ].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(row);
  }
  return result.sort((left, right) =>
    left.packageName.localeCompare(right.packageName)
    || left.evidenceKind.localeCompare(right.evidenceKind)
    || left.scope.localeCompare(right.scope)
  );
}

function packageNameForSpecifier(specifier: string): string {
  const parts = specifier.split('/');
  if (specifier.startsWith('@')) {
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return parts[0] ?? specifier;
}

function isAureliaPackageSpecifier(specifier: string): boolean {
  return specifier === 'aurelia' || specifier.startsWith('@aurelia/');
}

function nearestWorkspaceManifestForProject(
  project: ProjectBootFrame,
): BootPackageManifest | null {
  const workspaceRoot = path.resolve(project.workspaceRootDir);
  const projectRoot = path.resolve(project.rootDir);
  let current = path.dirname(projectRoot);

  while (isHostPathWithin(current, workspaceRoot)) {
    const manifest = readPackageManifest(project.inputGeneration.host, current);
    if (manifest != null && manifestWorkspacesIncludeProject(manifest, current, projectRoot)) {
      return manifest;
    }
    if (sameHostPath(current, workspaceRoot)) {
      break;
    }
    current = path.dirname(current);
  }

  return null;
}
