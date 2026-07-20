import type { KernelStore } from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import type { FrameworkSupportCatalogs } from '../framework/framework-support-authority.js';
import type { ProjectBootFrame } from '../boot/frames.js';
import type {
  ProductHandle,
} from '../kernel/handles.js';
import { DiWorldConstructor } from '../di/world-constructor.js';
import { DiWorldConstructionEmission } from '../di/world-construction.js';
import {
  DiResolveCallIssueMaterializer,
  type DiResolveCallIssueMaterialization,
} from '../di/resolve-call-issues.js';
import {
  DiInjectDecoratorIssueMaterializer,
  type DiInjectDecoratorIssueMaterialization,
} from '../di/inject-decorator-issues.js';
import {
  DiContainerApiIssueMaterializer,
  type DiContainerApiIssueMaterialization,
} from '../di/container-api-issues.js';
import {
  DiDependencyCycleIssueMaterializer,
  type DiDependencyCycleIssueMaterialization,
} from '../di/dependency-cycle-issues.js';
import type { Container } from '../di/container.js';
import {
  type BuiltInAttributePatternEmission,
  type BuiltInBindingCommandEmission,
  ConfiguredBuiltInSyntaxCatalogMaterializer,
  type ConfiguredBuiltInSyntaxCatalogEmission,
} from '../template/built-in-syntax-catalog-materializer.js';
import {
  ConfiguredBuiltInRuntimeRendererCatalogMaterializer,
  type BuiltInRuntimeRendererEmission,
  type ConfiguredBuiltInRuntimeRendererCatalogEmission,
} from '../template/runtime-renderer-catalog-materializer.js';
import {
  ConfiguredBuiltInResourceCatalogMaterializer,
  type ConfiguredBuiltInResourceCatalogEmission,
} from '../resources/built-in-resource-catalog-materializer.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import {
  TemplateCompilerWorldKind,
} from '../template/compiler-world.js';
import { TemplateResourceVisibilityKind } from '../template/compiler-world-reference.js';
import {
  TemplateCompilerWorldConstructionRequest,
  TemplateCompilerWorldMaterializer,
  type TemplateCompilerWorldEmission,
} from '../template/compiler-world-materializer.js';
import {
  ResourceRegistrationAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import type { AppRoot } from './app-root.js';
import type { ConfigurationKernelEmission } from './configuration-kernel-emitter.js';
import type { ConfigurationRecognitionProjectResult } from './configuration-recognition-project-pass.js';
import {
  FrameworkServiceCustomizationRecognitionPass,
  type FrameworkServiceCustomizationProjectResult,
} from './framework-service-customization.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type { StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import { DiProviderActivationView } from '../di/provider-activation.js';
import {
  AppWorldResourceVisibilityComposer,
} from './app-world-resource-visibility.js';
import { RegisteredSyntaxResourceMaterializer } from '../template/registered-syntax-resource-materializer.js';
import { readDiContainerChainFacts, type DiContainerChainFacts } from '../di/container-chain.js';
import {
  FrameworkIntrinsicDiKey,
  frameworkIntrinsicDiKeyLocal,
} from '../di/framework-intrinsic-di-key.js';
import type { IdentityHandle } from '../kernel/handles.js';

/**
 * Current app-world composition envelope.
 *
 * This is deliberately not a kernel product. It is the orchestration answer for the current composition pass: spend
 * recognized configuration registrations into DI, materialize framework-owned syntax/resource catalogs from known
 * framework registration effects, then create compiler worlds only for app roots whose container is already modeled.
 */
export class AureliaAppWorldEmission {
  constructor(
    /** Configuration products and registration admissions that feed this app-world pass. */
    readonly configuration: ConfigurationKernelEmission,
    /** Abstract DI container state produced from configuration-owned registration admissions. */
    readonly diWorld: DiWorldConstructionEmission,
    /** Framework-owned syntax catalogs admitted by recognized framework registrations. */
    readonly configuredSyntax: ConfiguredBuiltInSyntaxCatalogEmission,
    /** Framework-owned resource header catalogs admitted by recognized framework registrations. */
    readonly configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    /** Framework-owned runtime renderer catalogs admitted by recognized framework registrations. */
    readonly configuredRenderers: ConfiguredBuiltInRuntimeRendererCatalogEmission,
    /** App-authored mutations of framework compiler/observer services recognized from AppTasks. */
    readonly frameworkServiceCustomizations: FrameworkServiceCustomizationProjectResult,
    /** Compiler worlds created for app roots with modeled containers. */
    readonly compilerWorlds: readonly TemplateCompilerWorldEmission[],
  ) {}
}

/** Composes the current configuration, DI, and compiler-world materializers without adding a new semantic layer. */
export class AureliaAppWorldComposer {
  private readonly diWorldConstructor: DiWorldConstructor;
  private readonly configuredSyntaxMaterializer: ConfiguredBuiltInSyntaxCatalogMaterializer;
  private readonly configuredResourceMaterializer: ConfiguredBuiltInResourceCatalogMaterializer;
  private readonly configuredRendererMaterializer: ConfiguredBuiltInRuntimeRendererCatalogMaterializer;
  private readonly compilerWorldMaterializer: TemplateCompilerWorldMaterializer;
  private readonly resourceVisibilityComposer: AppWorldResourceVisibilityComposer;

  constructor(
    /** Hot analysis store shared by the composed materializers. */
    readonly store: KernelStore,
    /** Publication owner for app-specific catalogs and compiler worlds. */
    readonly publication: KernelPublicationContext,
    /** Stable framework catalogs borrowed by this app composition. */
    readonly support: FrameworkSupportCatalogs,
  ) {
    this.diWorldConstructor = new DiWorldConstructor(store, publication);
    this.configuredSyntaxMaterializer = new ConfiguredBuiltInSyntaxCatalogMaterializer(store, publication, support);
    this.configuredResourceMaterializer = new ConfiguredBuiltInResourceCatalogMaterializer(store, publication, support);
    this.configuredRendererMaterializer = new ConfiguredBuiltInRuntimeRendererCatalogMaterializer(store, publication, support);
    this.compilerWorldMaterializer = new TemplateCompilerWorldMaterializer(
      publication,
    );
    this.resourceVisibilityComposer = new AppWorldResourceVisibilityComposer();
  }

  construct(
    configuration: ConfigurationRecognitionProjectResult,
    resources: ResourceDefinitionIndex,
    typeSystem: TypeSystemProject,
    project: ProjectBootFrame,
  ): AureliaAppWorldEmission {
    const kernelConfiguration = configuration.readConfiguration();
    const configuredSyntax = this.configuredSyntaxMaterializer.materialize(kernelConfiguration);
    const configuredResources = this.configuredResourceMaterializer.materialize(kernelConfiguration, typeSystem);
    const configuredRenderers = this.configuredRendererMaterializer.materialize(kernelConfiguration);
    const diWorld = this.constructDiWorld(
      kernelConfiguration,
      configuredResources,
      resources,
      project,
      typeSystem,
      configuration.evaluation,
    );
    const frameworkServiceCustomizations = new FrameworkServiceCustomizationRecognitionPass(
      this.store,
      this.publication,
    ).recognize(configuration, diWorld);
    const compilerWorlds = this.constructCompilerWorlds(
      kernelConfiguration,
      diWorld,
      configuredSyntax,
      configuredResources,
      configuredRenderers,
      frameworkServiceCustomizations,
      resources,
    );

    return new AureliaAppWorldEmission(
      kernelConfiguration,
      diWorld,
      configuredSyntax,
      configuredResources,
      configuredRenderers,
      frameworkServiceCustomizations,
      compilerWorlds,
    );
  }

  private constructDiWorld(
    kernelConfiguration: ConfigurationKernelEmission,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resources: ResourceDefinitionIndex,
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    evaluation: StaticProjectEvaluationResult,
  ): DiWorldConstructionEmission {
    const diWorld = this.diWorldConstructor.construct(
      kernelConfiguration,
      configuredResources,
      evaluation,
      typeSystem,
      resources,
      project.projectKey,
    );
    const activation = new DiProviderActivationView(
      this.publication,
      evaluation.forkSession(),
      typeSystem,
      kernelConfiguration,
      diWorld,
    );
    const sourceIssues = [
      new DiResolveCallIssueMaterializer(this.store, this.publication).materialize(project, typeSystem),
      new DiInjectDecoratorIssueMaterializer(this.store, this.publication).materialize(project, typeSystem),
      new DiContainerApiIssueMaterializer(this.store, this.publication).materialize(
        project,
        typeSystem,
        activation,
      ),
      new DiDependencyCycleIssueMaterializer(this.store, this.publication).materialize(
        project,
        typeSystem,
        activation,
      ),
    ];
    return appendDiSourceIssues(diWorld, sourceIssues);
  }

  private constructCompilerWorlds(
    configuration: ConfigurationKernelEmission,
    diWorld: DiWorldConstructionEmission,
    configuredSyntax: ConfiguredBuiltInSyntaxCatalogEmission,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    configuredRenderers: ConfiguredBuiltInRuntimeRendererCatalogEmission,
    frameworkServiceCustomizations: FrameworkServiceCustomizationProjectResult,
    resourceDefinitions: ResourceDefinitionIndex | null,
  ): readonly TemplateCompilerWorldEmission[] {
    return new AppRootCompilerWorldFrame(
      this.publication,
      this.compilerWorldMaterializer,
      this.resourceVisibilityComposer,
      configuration,
      diWorld,
      configuredSyntax,
      configuredResources,
      configuredRenderers,
      frameworkServiceCustomizations,
      resourceDefinitions,
    ).construct();
  }
}

function appendDiSourceIssues(
  diWorld: DiWorldConstructionEmission,
  sourceIssues: readonly DiSourceIssueMaterialization[],
): DiWorldConstructionEmission {
  const issues = sourceIssues.flatMap((materialization) => materialization.issues);
  const records = sourceIssues.flatMap((materialization) => materialization.records);
  if (issues.length === 0) {
    return diWorld;
  }
  return new DiWorldConstructionEmission(
    diWorld.containers,
    diWorld.registrationOperations,
    diWorld.resolvers,
    diWorld.registries,
    diWorld.parameterizedRegistries,
    diWorld.resolverSlots,
    diWorld.factorySlots,
    diWorld.selfResolverSlots,
    diWorld.resourceSlots,
    diWorld.registeredAppTasks,
    diWorld.openSeams,
    [...diWorld.issues, ...issues],
    diWorld.resourceIssues,
    [...diWorld.records, ...records],
  );
}

type DiSourceIssueMaterialization =
  | DiResolveCallIssueMaterialization
  | DiInjectDecoratorIssueMaterialization
  | DiContainerApiIssueMaterialization
  | DiDependencyCycleIssueMaterialization;

class AppRootCompilerWorldFrame {
  private readonly containersByProduct: ReadonlyMap<Container['productHandle'], Container>;
  private readonly registeredSyntaxResourceMaterializer: RegisteredSyntaxResourceMaterializer;
  private readonly containerChainFacts: DiContainerChainFacts;
  private readonly templateCompilerKeyIdentityHandle: IdentityHandle;

  constructor(
    publication: KernelPublicationContext,
    private readonly compilerWorldMaterializer: TemplateCompilerWorldMaterializer,
    private readonly resourceVisibilityComposer: AppWorldResourceVisibilityComposer,
    private readonly configuration: ConfigurationKernelEmission,
    private readonly diWorld: DiWorldConstructionEmission,
    private readonly configuredSyntax: ConfiguredBuiltInSyntaxCatalogEmission,
    private readonly configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    private readonly configuredRenderers: ConfiguredBuiltInRuntimeRendererCatalogEmission,
    private readonly frameworkServiceCustomizations: FrameworkServiceCustomizationProjectResult,
    private readonly resourceDefinitions: ResourceDefinitionIndex | null,
  ) {
    this.containersByProduct = new Map(configuration.containers.map((container) => [container.productHandle, container]));
    this.registeredSyntaxResourceMaterializer = new RegisteredSyntaxResourceMaterializer(publication);
    this.containerChainFacts = readDiContainerChainFacts(publication);
    this.templateCompilerKeyIdentityHandle = publication.handles.identity(
      frameworkIntrinsicDiKeyLocal(FrameworkIntrinsicDiKey.ITemplateCompiler),
    );
  }

  construct(): readonly TemplateCompilerWorldEmission[] {
    return this.configuration.appRoots.flatMap((appRoot) => {
      const compilerWorld = this.constructForAppRoot(appRoot);
      return compilerWorld == null ? [] : [compilerWorld];
    });
  }

  private constructForAppRoot(appRoot: AppRoot): TemplateCompilerWorldEmission | null {
    const container = containerForAppRoot(appRoot, this.containersByProduct);
    if (container == null) {
      return null;
    }
    const admissions = registrationAdmissionsSpentIntoContainer(container, this.configuration, this.diWorld);
    if (!this.containerChainFacts.providerIsOnConsultingChain(
      this.templateCompilerKeyIdentityHandle,
      container.identityHandle,
    )) {
      return null;
    }
    const syntax = syntaxForAdmissions(admissions, this.configuredSyntax);
    const runtimeRenderers = runtimeRenderersForAdmissions(admissions, this.configuredRenderers);
    const resources = this.resourceVisibilityComposer.construct(
      container,
      this.diWorld,
      this.configuredResources,
      this.resourceDefinitions,
      appRoot,
    );
    const registeredSyntax = this.registeredSyntaxResourceMaterializer.materialize({
      localKey: `app-root:${appRoot.productHandle}`,
      admissions: admissions.filter((admission): admission is ResourceRegistrationAdmission =>
        admission instanceof ResourceRegistrationAdmission
      ),
      visibleResources: resources,
      resourceDefinitions: this.resourceDefinitions,
    });
    return this.compilerWorldMaterializer.construct(new TemplateCompilerWorldConstructionRequest(
      `app-root:${appRoot.productHandle}`,
      TemplateCompilerWorldKind.AppRoot,
      container,
      appRoot.toReference(),
      resources,
      [...syntax.attributePatterns, ...registeredSyntax.attributePatterns],
      [...syntax.bindingCommands, ...registeredSyntax.bindingCommands],
      runtimeRenderers,
      TemplateResourceVisibilityKind.Configured,
      appRoot.sourceAddressHandle,
      this.frameworkServiceCustomizations.attributeMapper,
      this.frameworkServiceCustomizations.nodeObserverLocator,
    ));
  }
}

function runtimeRenderersForAdmissions(
  admissions: readonly RegistrationAdmissionProduct[],
  configuredRenderers: ConfiguredBuiltInRuntimeRendererCatalogEmission,
): readonly BuiltInRuntimeRendererEmission[] {
  const catalogProductHandles = catalogProductHandlesForAdmissions(admissions, configuredRenderers.selections);
  return configuredRenderers.catalogEmission.renderers.filter((renderer) =>
    catalogProductHandles.has(renderer.catalogProductHandle)
  );
}

function containerForAppRoot(
  appRoot: AppRoot,
  containersByProduct: ReadonlyMap<Container['productHandle'], Container>,
): Container | null {
  return appRoot.container.productHandle == null
    ? null
    : containersByProduct.get(appRoot.container.productHandle) ?? null;
}

function syntaxForAdmissions(
  admissions: readonly RegistrationAdmissionProduct[],
  configuredSyntax: ConfiguredBuiltInSyntaxCatalogEmission,
): {
  readonly attributePatterns: readonly BuiltInAttributePatternEmission[];
  readonly bindingCommands: readonly BuiltInBindingCommandEmission[];
} {
  const catalogProductHandles = catalogProductHandlesForAdmissions(admissions, configuredSyntax.selections);
  return {
    attributePatterns: configuredSyntax.catalogEmission.attributePatterns.filter((pattern) =>
      catalogProductHandles.has(pattern.catalogProductHandle)
    ),
    bindingCommands: configuredSyntax.catalogEmission.bindingCommands.filter((command) =>
      catalogProductHandles.has(command.catalogProductHandle)
    ),
  };
}

function registrationAdmissionsSpentIntoContainer(
  container: Container,
  configuration: ConfigurationKernelEmission,
  diWorld: DiWorldConstructionEmission,
): readonly RegistrationAdmissionProduct[] {
  const admissionByProduct = new Map(configuration.registrationAdmissions.map((admission) => [
    admission.productHandle,
    admission,
  ]));
  return diWorld.registrationOperations.flatMap((operation) => {
    if (operation.container.productHandle !== container.productHandle || operation.admissionProductHandle == null) {
      return [];
    }
    const admission = admissionByProduct.get(operation.admissionProductHandle) ?? null;
    return admission == null ? [] : [admission];
  });
}

interface ConfiguredCatalogSelection {
  readonly registrationAdmissionProductHandle: ProductHandle;
  readonly catalogProductHandles: readonly ProductHandle[];
}

function catalogProductHandlesForAdmissions(
  admissions: readonly RegistrationAdmissionProduct[],
  selections: readonly ConfiguredCatalogSelection[],
): ReadonlySet<ProductHandle> {
  const admissionProductHandles = new Set<ProductHandle>();
  for (const admission of admissions) {
    admissionProductHandles.add(admission.productHandle);
  }
  if (admissionProductHandles.size === 0) {
    return new Set();
  }

  const catalogProductHandles = new Set<ProductHandle>();
  for (const selection of selections) {
    if (!admissionProductHandles.has(selection.registrationAdmissionProductHandle)) {
      continue;
    }
    for (const catalogProductHandle of selection.catalogProductHandles) {
      catalogProductHandles.add(catalogProductHandle);
    }
  }
  return catalogProductHandles;
}
