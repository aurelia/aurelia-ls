import type { DiWorldConstructionEmission } from '../di/world-construction.js';
import type { Container } from '../di/container.js';
import type {
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type {
  BuiltInResourceEmission,
  ConfiguredBuiltInResourceCatalogEmission,
} from '../resources/built-in-resource-catalog-materializer.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import {
  readRuntimeResourceKey,
  ResourceDefinitionKind,
} from '../resources/resource-kind.js';
import {
  TemplateResourceVisibilityKind,
  TemplateVisibleResource,
} from '../template/compiler-world-reference.js';
import {
  addVisibleDefinitionResource,
  directDependencyDefinitions,
} from '../template/resource-scope-builder.js';
import type { AppRoot } from './app-root.js';

/**
 * Computes the resource surface visible to one compiler world from DI resource slots plus app-local definitions.
 *
 * Configuration and DI decide which registration effects exist. This class only projects those effects into the
 * compiler-world resource scope shape, then adds the app root component and its declared local dependencies.
 */
export class AppWorldResourceVisibilityComposer {
  construct(
    container: Container,
    diWorld: DiWorldConstructionEmission,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    appRoot: AppRoot | null,
  ): readonly TemplateVisibleResource[] {
    const frame = new AppWorldResourceVisibilityFrame(
      container,
      diWorld,
      configuredResources,
      resourceDefinitions,
      appRoot,
    );
    frame.addContainerResources();
    frame.addRootAndDirectDependencyResources();
    return frame.toResources();
  }
}

class AppWorldResourceVisibilityFrame {
  private readonly resources: TemplateVisibleResource[] = [];
  private readonly seenLookupKeys = new Set<string>();
  private readonly seenResourceProducts = new Set<ProductHandle>();
  private readonly configuredResourceByProduct: ReadonlyMap<ProductHandle, BuiltInResourceEmission>;

  constructor(
    readonly container: Container,
    readonly diWorld: DiWorldConstructionEmission,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    readonly resourceDefinitions: ResourceDefinitionIndex | null,
    readonly appRoot: AppRoot | null,
  ) {
    this.configuredResourceByProduct = configuredResourcesByProduct(configuredResources);
  }

  addContainerResources(): void {
    for (const visibleSlot of visibleResourceSlotsForContainer(this.container, this.diWorld)) {
      this.addVisibleSlotResource(visibleSlot);
    }
  }

  addRootAndDirectDependencyResources(): void {
    const rootDefinition = rootComponentDefinition(this.appRoot, this.resourceDefinitions);
    if (rootDefinition == null || !this.addRootDefinition(rootDefinition)) {
      return;
    }
    for (const dependency of directDependencyDefinitions(rootDefinition, this.resourceDefinitions)) {
      this.addDefinitionResource(
        dependency,
        TemplateResourceVisibilityKind.Local,
        dependency.sourceAddressHandle,
      );
    }
  }

  toResources(): readonly TemplateVisibleResource[] {
    return this.resources;
  }

  private addVisibleSlotResource(visibleSlot: VisibleContainerResourceSlot): void {
    if (this.seenLookupKeys.has(visibleSlot.resourceKey)) {
      return;
    }
    if (this.addConfiguredResourceForSlot(visibleSlot)
      || this.addDefinitionResourceForSlot(visibleSlot)) {
      return;
    }
    this.addParsedKeyResourceForSlot(visibleSlot);
  }

  private addConfiguredResourceForSlot(visibleSlot: VisibleContainerResourceSlot): boolean {
    const configuredResource = visibleSlot.resourceProductHandle == null
      ? null
      : this.configuredResourceByProduct.get(visibleSlot.resourceProductHandle) ?? null;
    if (configuredResource == null || configuredResource.resource.productHandle == null) {
      return false;
    }
    if (this.seenResourceProducts.has(configuredResource.resource.productHandle)) {
      return true;
    }
    this.seenLookupKeys.add(visibleSlot.resourceKey);
    this.seenResourceProducts.add(configuredResource.resource.productHandle);
    this.resources.push(new TemplateVisibleResource(
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
    return true;
  }

  private addDefinitionResourceForSlot(visibleSlot: VisibleContainerResourceSlot): boolean {
    const resourceDefinition = this.resourceDefinitions?.lookupByProduct(visibleSlot.resourceProductHandle) ?? null;
    if (resourceDefinition == null) {
      return false;
    }
    const added = this.addDefinitionResource(
      resourceDefinition,
      visibleSlot.visibilityKind,
      visibleSlot.sourceAddressHandle,
    );
    if (added) {
      this.seenLookupKeys.add(visibleSlot.resourceKey);
      return true;
    }
    return resourceDefinition.productHandle != null
      && this.seenResourceProducts.has(resourceDefinition.productHandle);
  }

  private addParsedKeyResourceForSlot(visibleSlot: VisibleContainerResourceSlot): void {
    const parsedKey = readRuntimeResourceKey(visibleSlot.resourceKey);
    if (parsedKey == null || parsedKey.resourceKind === ResourceDefinitionKind.BindingCommand) {
      return;
    }
    this.seenLookupKeys.add(visibleSlot.resourceKey);
    this.resources.push(new TemplateVisibleResource(
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

  private addRootDefinition(rootDefinition: CustomElementDefinition): boolean {
    return this.addDefinitionResource(
      rootDefinition,
      TemplateResourceVisibilityKind.AppRoot,
      this.appRoot?.component?.addressHandle ?? rootDefinition.sourceAddressHandle,
      'front',
    );
  }

  private addDefinitionResource(
    definition: FullResourceDefinition,
    visibilityKind: TemplateResourceVisibilityKind,
    fallbackSourceAddressHandle: TemplateVisibleResource['sourceAddressHandle'],
    position: 'front' | 'back' = 'back',
  ): boolean {
    return addVisibleDefinitionResource(
      this.resources,
      this.seenLookupKeys,
      this.seenResourceProducts,
      definition,
      visibilityKind,
      fallbackSourceAddressHandle,
      position,
    );
  }
}

interface VisibleContainerResourceSlot {
  readonly resourceKey: string;
  readonly resourceProductHandle: ProductHandle | null;
  readonly resourceIdentityHandle: IdentityHandle | null;
  readonly sourceAddressHandle: TemplateVisibleResource['sourceAddressHandle'];
  readonly visibilityKind: TemplateResourceVisibilityKind;
}

function configuredResourcesByProduct(
  configuredResources: ConfiguredBuiltInResourceCatalogEmission,
): ReadonlyMap<ProductHandle, BuiltInResourceEmission> {
  const result = new Map<ProductHandle, BuiltInResourceEmission>();
  for (const emission of configuredResources.catalogEmission.resources) {
    if (emission.resource.productHandle != null) {
      result.set(emission.resource.productHandle, emission);
    }
  }
  return result;
}

function rootComponentDefinition(
  appRoot: AppRoot | null,
  resourceDefinitions: ResourceDefinitionIndex | null,
): CustomElementDefinition | null {
  const definition = resourceDefinitions?.lookupByTargetReference(appRoot?.component ?? null) ?? null;
  if (
    !(definition instanceof CustomElementDefinition)
    || definition.productHandle == null
  ) {
    return null;
  }

  return definition;
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
