import type { KernelStore } from '../kernel/store.js';
import type {
  ProductHandle,
} from '../kernel/handles.js';
import { DiWorldConstructor } from '../di/world-constructor.js';
import type { DiWorldConstructionEmission } from '../di/world-construction.js';
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
  frameworkRegistrationKindForAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import type { AppRoot } from './app-root.js';
import type { ConfigurationKernelEmission } from './configuration-kernel-emitter.js';
import {
  AppWorldResourceVisibilityComposer,
} from './app-world-resource-visibility.js';

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
    configuration: ConfigurationKernelEmission,
    resources: ResourceDefinitionIndex | null = null,
  ): AureliaAppWorldEmission {
    const configuredSyntax = this.configuredSyntaxMaterializer.materialize(configuration);
    const configuredResources = this.configuredResourceMaterializer.materialize(configuration);
    const configuredRenderers = this.configuredRendererMaterializer.materialize(configuration);
    const diWorld = this.diWorldConstructor.construct(configuration, configuredResources, resources);
    const compilerWorlds = this.constructCompilerWorlds(
      configuration,
      diWorld,
      configuredSyntax,
      configuredResources,
      configuredRenderers,
      resources,
    );

    return new AureliaAppWorldEmission(
      configuration,
      diWorld,
      configuredSyntax,
      configuredResources,
      configuredRenderers,
      compilerWorlds,
    );
  }

  private constructCompilerWorlds(
    configuration: ConfigurationKernelEmission,
    diWorld: DiWorldConstructionEmission,
    configuredSyntax: ConfiguredBuiltInSyntaxCatalogEmission,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    configuredRenderers: ConfiguredBuiltInRuntimeRendererCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
  ): readonly TemplateCompilerWorldEmission[] {
    const containersByProduct = new Map(configuration.containers.map((container) => [container.productHandle, container]));
    const compilerWorlds: TemplateCompilerWorldEmission[] = [];

    for (const appRoot of configuration.appRoots) {
      const container = containerForAppRoot(appRoot, containersByProduct);
      if (container == null) {
        continue;
      }
      const admissions = registrationAdmissionsForAppRoot(appRoot, configuration);
      if (!admitsRuntimeCompilerServices(admissions)) {
        continue;
      }
      const syntax = syntaxForAdmissions(admissions, configuredSyntax);
      const runtimeRenderers = runtimeRenderersForAdmissions(admissions, configuredRenderers);
      const resources = this.resourceVisibilityComposer.construct(
        container,
        diWorld,
        configuredResources,
        resourceDefinitions,
        appRoot,
      );

      compilerWorlds.push(this.compilerWorldMaterializer.construct(new TemplateCompilerWorldConstructionRequest(
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
      )));
    }

    return compilerWorlds;
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
    frameworkRegistrationKindForAdmission(admission) === FrameworkRegistrationKind.StandardConfiguration
  );
}
