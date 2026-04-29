import type { KernelStore } from '../kernel/store.js';
import type {
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import { DiWorldConstructionProducer } from '../di/world-construction-producer.js';
import type { DiWorldConstructionEmission } from '../di/world-construction.js';
import type { Container } from '../di/container.js';
import {
  type BuiltInAttributePatternEmission,
  type BuiltInBindingCommandEmission,
  ConfiguredBuiltInSyntaxCatalogProducer,
  type ConfiguredBuiltInSyntaxCatalogEmission,
} from '../template/built-in-syntax-producer.js';
import {
  ConfiguredBuiltInResourceCatalogProducer,
  type ConfiguredBuiltInResourceCatalogEmission,
} from '../resources/built-in-resource-producer.js';
import type {
  FullResourceDefinition,
} from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import {
  readRuntimeResourceKey,
  ResourceDefinitionKind,
} from '../resources/resource-kind.js';
import {
  TemplateCompilerWorldKind,
  TemplateResourceVisibilityKind,
  TemplateVisibleResource,
} from '../template/compiler-world.js';
import {
  TemplateCompilerWorldConstructionInput,
  TemplateCompilerWorldProducer,
  type TemplateCompilerWorldEmission,
} from '../template/compiler-world-producer.js';
import {
  frameworkRegistrationKindForAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import type { AppRoot } from './app-root.js';
import type { ConfigurationKernelEmission } from './configuration-kernel-emitter.js';

/**
 * Current app-world production envelope.
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
    /** Compiler worlds created for app roots with modeled containers. */
    readonly compilerWorlds: readonly TemplateCompilerWorldEmission[],
  ) {}
}

/** Composes the current configuration, DI, and compiler-world producers without adding a new semantic layer. */
export class AureliaAppWorldProducer {
  private readonly diWorldProducer: DiWorldConstructionProducer;
  private readonly configuredSyntaxProducer: ConfiguredBuiltInSyntaxCatalogProducer;
  private readonly configuredResourceProducer: ConfiguredBuiltInResourceCatalogProducer;
  private readonly compilerWorldProducer: TemplateCompilerWorldProducer;

  constructor(
    /** Hot analysis store shared by the composed producers. */
    readonly store: KernelStore,
  ) {
    this.diWorldProducer = new DiWorldConstructionProducer(store);
    this.configuredSyntaxProducer = new ConfiguredBuiltInSyntaxCatalogProducer(store);
    this.configuredResourceProducer = new ConfiguredBuiltInResourceCatalogProducer(store);
    this.compilerWorldProducer = new TemplateCompilerWorldProducer(store);
  }

  construct(
    configuration: ConfigurationKernelEmission,
    resources: ResourceDefinitionIndex | null = null,
  ): AureliaAppWorldEmission {
    const configuredSyntax = this.configuredSyntaxProducer.materialize(configuration);
    const configuredResources = this.configuredResourceProducer.materialize(configuration);
    const diWorld = this.diWorldProducer.construct(configuration, configuredResources, resources);
    const compilerWorlds = this.constructCompilerWorlds(configuration, diWorld, configuredSyntax, configuredResources, resources);

    return new AureliaAppWorldEmission(
      configuration,
      diWorld,
      configuredSyntax,
      configuredResources,
      compilerWorlds,
    );
  }

  private constructCompilerWorlds(
    configuration: ConfigurationKernelEmission,
    diWorld: DiWorldConstructionEmission,
    configuredSyntax: ConfiguredBuiltInSyntaxCatalogEmission,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
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
      const resources = resourcesForContainer(container, diWorld, configuredResources, resourceDefinitions);

      compilerWorlds.push(this.compilerWorldProducer.construct(new TemplateCompilerWorldConstructionInput(
        `app-root:${appRoot.productHandle}`,
        TemplateCompilerWorldKind.AppRoot,
        container,
        appRoot,
        resources,
        syntax.attributePatterns,
        syntax.bindingCommands,
        TemplateResourceVisibilityKind.Configured,
        appRoot.sourceAddressHandle,
      )));
    }

    return compilerWorlds;
  }
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
      const compilerDefinition = isTemplateCompilableDefinition(configuredResource.definition)
        ? configuredResource.definition
        : null;
      resources.push(new TemplateVisibleResource(
        configuredResource.resource.resourceKind,
        configuredResource.resource.name,
        configuredResource.resource.aliases,
        configuredResource.resource.productHandle,
        configuredResource.resource.identityHandle,
        compilerDefinition?.productHandle ?? null,
        compilerDefinition,
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
      const compilerDefinition = isTemplateCompilableDefinition(resourceDefinition)
        ? resourceDefinition
        : null;
      resources.push(new TemplateVisibleResource(
        resourceDefinition.type,
        resourceDefinition.name,
        resourceDefinition.aliases.map((alias) => alias.name),
        resourceDefinition.productHandle,
        resourceDefinition.identityHandle,
        compilerDefinition?.productHandle ?? null,
        compilerDefinition,
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

  return resources;
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

function isTemplateCompilableDefinition(
  definition: FullResourceDefinition | null,
): definition is NonNullable<typeof definition> & { readonly type: ResourceDefinitionKind.CustomElement | ResourceDefinitionKind.CustomAttribute } {
  return definition != null
    && (definition.type === ResourceDefinitionKind.CustomElement
      || definition.type === ResourceDefinitionKind.CustomAttribute);
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

function admitsRuntimeCompilerServices(admissions: readonly RegistrationAdmissionProduct[]): boolean {
  return admissions.some((admission) =>
    frameworkRegistrationKindForAdmission(admission) === FrameworkRegistrationKind.StandardConfiguration
  );
}
