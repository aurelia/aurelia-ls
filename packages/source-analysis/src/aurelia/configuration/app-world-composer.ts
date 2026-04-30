import type { KernelStore } from '../kernel/store.js';
import type {
  IdentityHandle,
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
  readRuntimeResourceKey,
  ResourceDefinitionKind,
  runtimeResourceKeyForKind,
} from '../resources/resource-kind.js';
import {
  TemplateCompilerWorldKind,
  TemplateResourceVisibilityKind,
  TemplateVisibleResource,
} from '../template/compiler-world.js';
import {
  TemplateCompilerWorldConstructionInput,
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

  constructor(
    /** Hot analysis store shared by the composed materializers. */
    readonly store: KernelStore,
  ) {
    this.diWorldConstructor = new DiWorldConstructor(store);
    this.configuredSyntaxMaterializer = new ConfiguredBuiltInSyntaxCatalogMaterializer(store);
    this.configuredResourceMaterializer = new ConfiguredBuiltInResourceCatalogMaterializer(store);
    this.configuredRendererMaterializer = new ConfiguredBuiltInRuntimeRendererCatalogMaterializer(store);
    this.compilerWorldMaterializer = new TemplateCompilerWorldMaterializer(store);
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
      const resources = resourcesForContainer(container, diWorld, configuredResources, resourceDefinitions, appRoot);

      compilerWorlds.push(this.compilerWorldMaterializer.construct(new TemplateCompilerWorldConstructionInput(
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
  const catalogProductHandles = rendererCatalogProductHandlesForAdmissions(admissions, configuredRenderers);
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
  const catalogProductHandles = syntaxCatalogProductHandlesForAdmissions(admissions, configuredSyntax);
  return {
    attributePatterns: configuredSyntax.catalogEmission.attributePatterns.filter((pattern) =>
      catalogProductHandles.has(pattern.catalogProductHandle)
    ),
    bindingCommands: configuredSyntax.catalogEmission.bindingCommands.filter((command) =>
      catalogProductHandles.has(command.catalogProductHandle)
    ),
  };
}

interface VisibleContainerResourceSlot {
  readonly resourceKey: string;
  readonly resourceProductHandle: ProductHandle | null;
  readonly resourceIdentityHandle: IdentityHandle | null;
  readonly sourceAddressHandle: TemplateVisibleResource['sourceAddressHandle'];
  readonly visibilityKind: TemplateResourceVisibilityKind;
}

function resourcesForContainer(
  container: Container,
  diWorld: DiWorldConstructionEmission,
  configuredResources: ConfiguredBuiltInResourceCatalogEmission,
  resourceDefinitions: ResourceDefinitionIndex | null,
  appRoot: AppRoot | null,
): readonly TemplateVisibleResource[] {
  const configuredResourceByProduct = new Map(configuredResources.catalogEmission.resources.map((emission) => [
    emission.resource.productHandle,
    emission,
  ]));
  const resources: TemplateVisibleResource[] = [];
  const seenLookupKeys = new Set<string>();
  const seenResourceProducts = new Set<ProductHandle>();

  for (const visibleSlot of visibleResourceSlotsForContainer(container, diWorld)) {
    if (seenLookupKeys.has(visibleSlot.resourceKey)) {
      continue;
    }
    seenLookupKeys.add(visibleSlot.resourceKey);

    const configuredResource = visibleSlot.resourceProductHandle == null
      ? null
      : configuredResourceByProduct.get(visibleSlot.resourceProductHandle) ?? null;
    if (configuredResource != null && configuredResource.resource.productHandle != null) {
      if (seenResourceProducts.has(configuredResource.resource.productHandle)) {
        continue;
      }
      seenResourceProducts.add(configuredResource.resource.productHandle);
      resources.push(new TemplateVisibleResource(
        configuredResource.resource.resourceKind,
        configuredResource.resource.name,
        configuredResource.resource.aliases,
        configuredResource.resource.productHandle,
        configuredResource.resource.identityHandle,
        configuredResource.definition?.productHandle ?? null,
        configuredResource.definition,
        visibleSlot.visibilityKind,
        configuredResource.resource.sourceAddressHandle ?? visibleSlot.sourceAddressHandle,
      ));
      continue;
    }

    const resourceDefinition = resourceDefinitions?.lookupByProduct(visibleSlot.resourceProductHandle) ?? null;
    if (resourceDefinition != null
      && resourceDefinition.productHandle != null
      && resourceDefinition.type !== ResourceDefinitionKind.AttributePattern) {
      if (seenResourceProducts.has(resourceDefinition.productHandle)) {
        continue;
      }
      seenResourceProducts.add(resourceDefinition.productHandle);
      resources.push(new TemplateVisibleResource(
        resourceDefinition.type,
        resourceDefinition.name,
        resourceDefinition.aliases.map((alias) => alias.name),
        resourceDefinition.productHandle,
        resourceDefinition.identityHandle,
        resourceDefinition.productHandle,
        resourceDefinition,
        visibleSlot.visibilityKind,
        resourceDefinition.sourceAddressHandle ?? visibleSlot.sourceAddressHandle,
      ));
      continue;
    }

    const parsedKey = readRuntimeResourceKey(visibleSlot.resourceKey);
    if (parsedKey == null || parsedKey.resourceKind === ResourceDefinitionKind.BindingCommand) {
      continue;
    }
    resources.push(new TemplateVisibleResource(
      parsedKey.resourceKind,
      parsedKey.name,
      [],
      visibleSlot.resourceProductHandle,
      visibleSlot.resourceIdentityHandle,
      null,
      null,
      visibleSlot.visibilityKind,
      visibleSlot.sourceAddressHandle,
    ));
  }

  const rootComponent = rootComponentResource(appRoot, resourceDefinitions);
  if (rootComponent != null) {
    const resourceKey = runtimeResourceKeyForKind(rootComponent.resourceKind, rootComponent.name);
    if (
      (resourceKey == null || !seenLookupKeys.has(resourceKey))
      && (
        rootComponent.resourceProductHandle == null
        || !seenResourceProducts.has(rootComponent.resourceProductHandle)
      )
    ) {
      if (resourceKey != null) {
        seenLookupKeys.add(resourceKey);
      }
      if (rootComponent.resourceProductHandle != null) {
        seenResourceProducts.add(rootComponent.resourceProductHandle);
      }
      resources.unshift(rootComponent);
    }
  }

  return resources;
}

function rootComponentResource(
  appRoot: AppRoot | null,
  resourceDefinitions: ResourceDefinitionIndex | null,
): TemplateVisibleResource | null {
  const definition = resourceDefinitions?.lookupByTargetReference(appRoot?.component ?? null) ?? null;
  if (
    definition == null
    || definition.productHandle == null
    || definition.type !== ResourceDefinitionKind.CustomElement
  ) {
    return null;
  }

  return new TemplateVisibleResource(
    definition.type,
    definition.name,
    definition.aliases.map((alias) => alias.name),
    definition.productHandle,
    definition.identityHandle,
    definition.productHandle,
    definition,
    TemplateResourceVisibilityKind.AppRoot,
    appRoot?.component?.addressHandle ?? definition.sourceAddressHandle,
  );
}

function visibleResourceSlotsForContainer(
  container: Container,
  diWorld: DiWorldConstructionEmission,
): readonly VisibleContainerResourceSlot[] {
  const containerProductHandle = container.productHandle;
  const rootProductHandle = container.readRootReference().productHandle;
  const slots: VisibleContainerResourceSlot[] = [];

  for (const slot of diWorld.resourceSlots) {
    if (slot.container.productHandle === containerProductHandle) {
      slots.push({
        resourceKey: slot.resourceKey,
        resourceProductHandle: slot.resourceProductHandle,
        resourceIdentityHandle: slot.resourceIdentityHandle,
        sourceAddressHandle: slot.sourceAddressHandle,
        visibilityKind: TemplateResourceVisibilityKind.Local,
      });
    }
  }

  if (rootProductHandle == null || rootProductHandle === containerProductHandle) {
    return slots;
  }

  for (const slot of diWorld.resourceSlots) {
    if (slot.container.productHandle === rootProductHandle) {
      slots.push({
        resourceKey: slot.resourceKey,
        resourceProductHandle: slot.resourceProductHandle,
        resourceIdentityHandle: slot.resourceIdentityHandle,
        sourceAddressHandle: slot.sourceAddressHandle,
        visibilityKind: TemplateResourceVisibilityKind.Inherited,
      });
    }
  }

  return slots;
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

function syntaxCatalogProductHandlesForAdmissions(
  admissions: readonly RegistrationAdmissionProduct[],
  configuredSyntax: ConfiguredBuiltInSyntaxCatalogEmission,
): ReadonlySet<ProductHandle> {
  const admissionProductHandles = new Set<ProductHandle>();
  for (const admission of admissions) {
    admissionProductHandles.add(admission.productHandle);
  }
  if (admissionProductHandles.size === 0) {
    return new Set();
  }

  const catalogProductHandles = new Set<ProductHandle>();
  for (const selection of configuredSyntax.selections) {
    if (!admissionProductHandles.has(selection.registrationAdmissionProductHandle)) {
      continue;
    }
    for (const catalogProductHandle of selection.catalogProductHandles) {
      catalogProductHandles.add(catalogProductHandle);
    }
  }
  return catalogProductHandles;
}

function rendererCatalogProductHandlesForAdmissions(
  admissions: readonly RegistrationAdmissionProduct[],
  configuredRenderers: ConfiguredBuiltInRuntimeRendererCatalogEmission,
): ReadonlySet<ProductHandle> {
  const admissionProductHandles = new Set<ProductHandle>();
  for (const admission of admissions) {
    admissionProductHandles.add(admission.productHandle);
  }
  if (admissionProductHandles.size === 0) {
    return new Set();
  }

  const catalogProductHandles = new Set<ProductHandle>();
  for (const selection of configuredRenderers.selections) {
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
