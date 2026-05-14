import type { KernelStore } from '../kernel/store.js';
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
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import {
  FrameworkRegistrationCapability,
  frameworkRegistrationAdmissionCarriesCapability,
} from '../registration/framework-registration-manifest.js';
import type { AppRoot } from './app-root.js';
import type { ConfigurationKernelEmission } from './configuration-kernel-emitter.js';
import type { ConfigurationRecognitionProjectResult } from './configuration-recognition-project-pass.js';
import {
  FrameworkServiceCustomizationRecognitionPass,
  type FrameworkServiceCustomizationProjectResult,
} from './framework-service-customization.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  AppWorldResourceVisibilityComposer,
} from './app-world-resource-visibility.js';
import {
  buildRegistryBodyStepIndex,
  type RegistryBodyStepIndex,
} from './registry-body-index.js';

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
  ) {
    this.diWorldConstructor = new DiWorldConstructor(store);
    this.configuredSyntaxMaterializer = new ConfiguredBuiltInSyntaxCatalogMaterializer(store);
    this.configuredResourceMaterializer = new ConfiguredBuiltInResourceCatalogMaterializer(store);
    this.configuredRendererMaterializer = new ConfiguredBuiltInRuntimeRendererCatalogMaterializer(store);
    this.compilerWorldMaterializer = new TemplateCompilerWorldMaterializer(store);
    this.resourceVisibilityComposer = new AppWorldResourceVisibilityComposer();
  }

  construct(
    configuration: ConfigurationRecognitionProjectResult,
    resources: ResourceDefinitionIndex | null = null,
    typeSystem: TypeSystemProject | null = null,
    project: ProjectBootFrame | null = null,
  ): AureliaAppWorldEmission {
    const kernelConfiguration = configuration.readConfiguration();
    const frameworkServiceCustomizations = new FrameworkServiceCustomizationRecognitionPass().recognize(this.store, configuration);
    const configuredSyntax = this.configuredSyntaxMaterializer.materialize(kernelConfiguration);
    const configuredResources = this.configuredResourceMaterializer.materialize(kernelConfiguration, typeSystem);
    const configuredRenderers = this.configuredRendererMaterializer.materialize(kernelConfiguration);
    const diWorld = this.constructDiWorld(
      kernelConfiguration,
      configuredResources,
      resources,
      project,
      typeSystem,
    );
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
    resources: ResourceDefinitionIndex | null,
    project: ProjectBootFrame | null,
    typeSystem: TypeSystemProject | null,
  ): DiWorldConstructionEmission {
    const diWorld = this.diWorldConstructor.construct(
      kernelConfiguration,
      configuredResources,
      resources,
      project?.projectKey ?? null,
    );
    if (project == null || typeSystem == null) {
      return diWorld;
    }
    const sourceIssues = [
      new DiResolveCallIssueMaterializer(this.store).materialize(project, typeSystem),
      new DiInjectDecoratorIssueMaterializer(this.store).materialize(project, typeSystem),
      new DiContainerApiIssueMaterializer(this.store).materialize(project, typeSystem),
      new DiDependencyCycleIssueMaterializer(this.store).materialize(project, typeSystem),
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
      this.store,
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
    diWorld.appTasks,
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
  private readonly registryBodyIndex: RegistryBodyStepIndex;

  constructor(
    store: KernelStore,
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
    this.registryBodyIndex = buildRegistryBodyStepIndex(store, configuration);
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
    const admissions = registrationAdmissionsForAppRoot(appRoot, this.configuration, this.registryBodyIndex);
    if (!admitsRuntimeCompilerServices(admissions)) {
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
    return this.compilerWorldMaterializer.construct(new TemplateCompilerWorldConstructionRequest(
      `app-root:${appRoot.productHandle}`,
      TemplateCompilerWorldKind.AppRoot,
      container,
      appRoot,
      resources,
      syntax.attributePatterns,
      syntax.bindingCommands,
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

function registrationAdmissionsForAppRoot(
  appRoot: AppRoot,
  configuration: ConfigurationKernelEmission,
  registryBodyIndex: RegistryBodyStepIndex,
): readonly RegistrationAdmissionProduct[] {
  const admissionByProduct = new Map(configuration.registrationAdmissions.map((admission) => [admission.productHandle, admission]));
  const sequenceProductHandles = new Set<ProductHandle>();
  for (const sequence of configuration.sequences) {
    if (sequence.appRoot?.productHandle === appRoot.productHandle) {
      sequenceProductHandles.add(sequence.productHandle);
    }
  }
  if (sequenceProductHandles.size === 0) {
    return [];
  }

  const admissions: RegistrationAdmissionProduct[] = [];
  const seenAdmissionHandles = new Set<ProductHandle>();
  for (const step of configuration.steps) {
    if (step.sequence?.productHandle == null || !sequenceProductHandles.has(step.sequence.productHandle)) {
      continue;
    }
    for (const admissionProductHandle of step.registrationAdmissionProductHandles) {
      if (seenAdmissionHandles.has(admissionProductHandle)) {
        continue;
      }
      seenAdmissionHandles.add(admissionProductHandle);
      const admission = admissionByProduct.get(admissionProductHandle);
      if (admission != null) {
        admissions.push(admission);
        for (const bodyAdmissionHandle of registryBodyIndex.admissionProductHandlesForAdmission(admission)) {
          const bodyAdmission = admissionByProduct.get(bodyAdmissionHandle);
          if (bodyAdmission == null || seenAdmissionHandles.has(bodyAdmission.productHandle)) {
            continue;
          }
          seenAdmissionHandles.add(bodyAdmission.productHandle);
          admissions.push(bodyAdmission);
        }
      }
    }
  }
  return admissions;
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

function admitsRuntimeCompilerServices(admissions: readonly RegistrationAdmissionProduct[]): boolean {
  return admissions.some((admission) =>
    frameworkRegistrationAdmissionCarriesCapability(
      admission,
      FrameworkRegistrationCapability.RuntimeHtmlCompilerServices,
    )
  );
}
