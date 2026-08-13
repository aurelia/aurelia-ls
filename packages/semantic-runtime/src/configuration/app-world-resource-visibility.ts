import type { DiWorldConstructionEmission } from '../di/world-construction.js';
import type { DiResourceSlotExclusion } from '../di/world-construction.js';
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
  TemplateResourceScopeExclusion,
  TemplateResourceScopeExclusionReason,
  TemplateResourceScopeLane,
  TemplateResourceScopeBlockedLookup,
  TemplateResourceScopeLookup,
  TemplateResourceScopeResolution,
} from '../template/compiler-world.js';
import {
  sameTemplateVisibleResource,
  TemplateResourceVisibilityKind,
  TemplateVisibleResource,
} from '../template/compiler-world-reference.js';
import {
  directDependencyDefinitions,
  visibleResourceForDefinition,
  visibleResourceLookupKeys,
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
  ): TemplateResourceScopeResolution {
    const frame = new AppWorldResourceVisibilityFrame(
      container,
      diWorld,
      configuredResources,
      resourceDefinitions,
      appRoot,
    );
    frame.addContainerResources();
    frame.addContainerBlockedLookups();
    frame.addContainerResourceExclusions();
    frame.addRootAndDirectDependencyResources();
    return frame.toResolution();
  }
}

class AppWorldResourceVisibilityFrame {
  private readonly resources: TemplateVisibleResource[] = [];
  private readonly exclusions: TemplateResourceScopeExclusion[] = [];
  private readonly seenLookupKeys = new Set<string>();
  private readonly seenResourceProducts = new Set<ProductHandle>();
  private readonly winnerByLookupKey = new Map<string, VisibleResourceWinner>();
  private readonly winnerByResourceProduct = new Map<ProductHandle, VisibleResourceWinner>();
  private readonly blockedByLookupKey = new Map<string, TemplateResourceScopeBlockedLookup>();
  /** App-root controller dependencies occupy a child container and therefore overlay every baseline DI lookup. */
  private readonly childWinnerByLookupKey = new Map<string, VisibleResourceWinner>();
  private readonly childBlockedByLookupKey = new Map<string, TemplateResourceScopeBlockedLookup>();
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

  addContainerBlockedLookups(): void {
    for (const blocked of visibleBlockedResourceLookupsForContainer(this.container)) {
      if (this.winnerByLookupKey.has(blocked.lookupKey) || this.blockedByLookupKey.has(blocked.lookupKey)) {
        continue;
      }
      this.seenLookupKeys.add(blocked.lookupKey);
      this.blockedByLookupKey.set(blocked.lookupKey, blocked);
    }
  }

  addContainerResourceExclusions(): void {
    for (const visibleExclusion of visibleResourceSlotExclusionsForContainer(this.container, this.diWorld)) {
      this.addVisibleSlotExclusion(visibleExclusion);
    }
  }

  addRootAndDirectDependencyResources(): void {
    const rootDefinition = rootComponentDefinition(this.appRoot, this.resourceDefinitions);
    if (rootDefinition == null) return;
    for (const dependency of directDependencyDefinitions(rootDefinition, this.resourceDefinitions)) {
      this.addChildDefinitionResource(
        dependency,
        TemplateResourceVisibilityKind.Local,
        dependency.sourceAddressHandle,
      );
    }
    this.retainRootOwnerResource(rootDefinition);
  }

  toResolution(): TemplateResourceScopeResolution {
    const lookups = [...this.winnerByLookupKey].map(([lookupKey, winner]) => new TemplateResourceScopeLookup(
      lookupKey,
      winner.resource,
      winner.lane,
      winner.sourceAddressHandle,
    ));
    return new TemplateResourceScopeResolution(
      this.effectiveResources(),
      terminalAppScopeExclusions(this.exclusions, this.winnerByLookupKey),
      lookups,
      [...this.blockedByLookupKey.values()],
    );
  }

  private effectiveResources(): readonly TemplateVisibleResource[] {
    const winners = [...this.winnerByLookupKey.values()].map((winner) => winner.resource);
    const rootProductHandle = rootComponentDefinition(this.appRoot, this.resourceDefinitions)?.productHandle ?? null;
    return this.resources.filter((resource, index) => {
      if (resource.resourceProductHandle === rootProductHandle) return true;
      if (!winners.some((winner) => sameTemplateVisibleResource(winner, resource))) return false;
      return this.resources.findIndex((candidate) => sameTemplateVisibleResource(candidate, resource)) === index;
    });
  }

  private addVisibleSlotResource(visibleSlot: VisibleContainerResourceSlot): void {
    if (this.seenLookupKeys.has(visibleSlot.resourceKey)) {
      this.recordVisibleSlotConflict(visibleSlot);
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
      this.rememberNormalizedSlot(visibleSlot, configuredResource.resource.productHandle);
      return true;
    }
    this.seenLookupKeys.add(visibleSlot.resourceKey);
    this.seenResourceProducts.add(configuredResource.resource.productHandle);
    const resource = new TemplateVisibleResource(
      configuredResource.resource.resourceKind,
      configuredResource.resource.name,
      configuredResource.resource.aliases,
      configuredResource.resource.productHandle,
      configuredResource.resource.identityHandle,
      configuredResource.definition?.productHandle ?? null,
      visibleSlot.visibilityKind,
      visibleSlot.sourceAddressHandle ?? configuredResource.resource.sourceAddressHandle,
    );
    this.resources.push(resource);
    this.rememberWinner(
      resource,
      visibleSlotLane(visibleSlot),
      [visibleSlot.resourceKey],
      visibleSlot.keySourceAddressHandle,
    );
    return true;
  }

  private addDefinitionResourceForSlot(visibleSlot: VisibleContainerResourceSlot): boolean {
    const resourceDefinition = this.resourceDefinitions?.lookupByProduct(visibleSlot.resourceProductHandle) ?? null;
    if (resourceDefinition == null) {
      return false;
    }
    if (
      resourceDefinition.productHandle != null
      && this.seenResourceProducts.has(resourceDefinition.productHandle)
    ) {
      this.rememberNormalizedSlot(visibleSlot, resourceDefinition.productHandle);
      return true;
    }
    const resource = visibleResourceForDefinition(
      resourceDefinition,
      visibleSlot.visibilityKind,
      visibleSlot.sourceAddressHandle,
    );
    if (resource == null) return false;
    this.seenLookupKeys.add(visibleSlot.resourceKey);
    if (resource.resourceProductHandle != null) {
      this.seenResourceProducts.add(resource.resourceProductHandle);
    }
    this.resources.push(resource);
    this.rememberWinner(
      resource,
      visibleSlotLane(visibleSlot),
      [visibleSlot.resourceKey],
      visibleSlot.keySourceAddressHandle,
    );
    return true;
  }

  private addParsedKeyResourceForSlot(visibleSlot: VisibleContainerResourceSlot): void {
    const parsedKey = readRuntimeResourceKey(visibleSlot.resourceKey);
    if (parsedKey == null || parsedKey.resourceKind === ResourceDefinitionKind.BindingCommand) {
      return;
    }
    this.seenLookupKeys.add(visibleSlot.resourceKey);
    const resource = new TemplateVisibleResource(
      parsedKey.resourceKind,
      parsedKey.name,
      [],
      visibleSlot.resourceProductHandle,
      visibleSlot.resourceIdentityHandle,
      null,
      visibleSlot.visibilityKind,
      visibleSlot.sourceAddressHandle,
    );
    this.resources.push(resource);
    this.rememberWinner(
      resource,
      visibleSlotLane(visibleSlot),
      [visibleSlot.resourceKey],
      visibleSlot.keySourceAddressHandle,
    );
  }

  private retainRootOwnerResource(rootDefinition: CustomElementDefinition): void {
    const root = visibleResourceForDefinition(
      rootDefinition,
      TemplateResourceVisibilityKind.AppRoot,
      this.appRoot?.component?.addressHandle ?? rootDefinition.sourceAddressHandle,
    );
    if (root == null || this.resources.some((resource) =>
      resource.resourceProductHandle != null
      && resource.resourceProductHandle === root.resourceProductHandle
    )) return;
    this.resources.unshift(root);
  }

  private addChildDefinitionResource(
    definition: FullResourceDefinition,
    visibilityKind: TemplateResourceVisibilityKind,
    fallbackSourceAddressHandle: TemplateVisibleResource['sourceAddressHandle'],
  ): boolean {
    const contender = visibleResourceForDefinition(definition, visibilityKind, fallbackSourceAddressHandle);
    if (contender == null) return false;
    const lane = TemplateResourceScopeLane.Local;
    const lookups = visibleResourceLookupKeys(contender).map((lookupKey) => new TemplateResourceScopeLookup(
      lookupKey,
      contender,
      lane,
      exactDefinitionLookupSource(definition, lookupKey, fallbackSourceAddressHandle),
    ));
    const primary = lookups[0] ?? null;
    const localPrimary = primary == null ? null : this.childWinnerByLookupKey.get(primary.lookupKey) ?? null;
    if (
      primary != null
      && (localPrimary != null || this.childBlockedByLookupKey.has(primary.lookupKey))
    ) {
      if (localPrimary != null && !sameResourceProduct(localPrimary.resource, contender)) {
        this.exclusions.push(scopeExclusionFromWinner(localPrimary, contender, primary.lookupKey, primary.sourceAddressHandle));
      }
      if (isAttributeRegistrationResource(contender)) {
        for (const alias of lookups.slice(1)) {
          this.blockChildLookup(alias.lookupKey, alias.sourceAddressHandle);
        }
      }
      return false;
    }

    let admitted = false;
    for (const lookup of lookups) {
      const existing = this.childWinnerByLookupKey.get(lookup.lookupKey) ?? null;
      if (existing != null) {
        if (!sameResourceProduct(existing.resource, contender)) {
          this.exclusions.push(scopeExclusionFromWinner(
            existing,
            contender,
            lookup.lookupKey,
            lookup.sourceAddressHandle,
          ));
        }
        continue;
      }
      if (this.childBlockedByLookupKey.has(lookup.lookupKey)) {
        continue;
      }
      const baseline = this.winnerByLookupKey.get(lookup.lookupKey) ?? null;
      if (baseline != null && !sameResourceProduct(baseline.resource, contender)) {
        this.exclusions.push(scopeExclusionFromWinner(
          new VisibleResourceWinner(contender, lane, lookup.sourceAddressHandle),
          baseline.resource,
          lookup.lookupKey,
          baseline.sourceAddressHandle,
          TemplateResourceScopeLane.Inherited,
        ));
      }
      this.seenLookupKeys.add(lookup.lookupKey);
      const winner = new VisibleResourceWinner(
        contender,
        lane,
        lookup.sourceAddressHandle,
      );
      this.childWinnerByLookupKey.set(lookup.lookupKey, winner);
      this.winnerByLookupKey.set(lookup.lookupKey, winner);
      this.blockedByLookupKey.delete(lookup.lookupKey);
      admitted = true;
    }
    if (admitted) {
      const existingResource = this.resources.findIndex((resource) => sameResourceProduct(resource, contender));
      if (existingResource >= 0) this.resources.splice(existingResource, 1);
      this.resources.unshift(contender);
      if (contender.resourceProductHandle != null) {
        this.seenResourceProducts.add(contender.resourceProductHandle);
        this.winnerByResourceProduct.set(contender.resourceProductHandle, new VisibleResourceWinner(
          contender,
          lane,
          contender.sourceAddressHandle,
        ));
      }
    }
    return admitted;
  }

  private blockChildLookup(
    lookupKey: string,
    sourceAddressHandle: TemplateVisibleResource['sourceAddressHandle'],
  ): void {
    if (this.childWinnerByLookupKey.has(lookupKey) || this.childBlockedByLookupKey.has(lookupKey)) {
      return;
    }
    const blocked = new TemplateResourceScopeBlockedLookup(
      lookupKey,
      TemplateResourceScopeLane.Local,
      sourceAddressHandle,
    );
    this.childBlockedByLookupKey.set(lookupKey, blocked);
    this.winnerByLookupKey.delete(lookupKey);
    this.blockedByLookupKey.set(lookupKey, blocked);
    this.seenLookupKeys.add(lookupKey);
  }

  private addVisibleSlotExclusion(visible: VisibleContainerResourceSlotExclusion): void {
    const loser = this.visibleResourceForSlot({
      resourceKey: visible.exclusion.resourceKey,
      resourceProductHandle: visible.exclusion.excludedResourceProductHandle,
      resourceIdentityHandle: visible.exclusion.excludedResourceIdentityHandle,
      sourceAddressHandle: visible.exclusion.excludedRegistrationSourceAddressHandle,
      keySourceAddressHandle: visible.exclusion.excludedKeySourceAddressHandle,
      visibilityKind: visible.visibilityKind,
    });
    const winnerProductHandle = visible.exclusion.winner.resourceProductHandle;
    const winner = this.winnerByLookupKey.get(visible.exclusion.resourceKey)
      ?? (winnerProductHandle == null
        ? null
        : this.winnerByResourceProduct.get(winnerProductHandle) ?? null);
    if (winner == null || loser == null) {
      return;
    }
    this.exclusions.push(new TemplateResourceScopeExclusion(
      winner.resource.resourceProductHandle != null
        && winner.resource.resourceProductHandle === loser.resourceProductHandle
        ? TemplateResourceScopeExclusionReason.DuplicateProduct
        : TemplateResourceScopeExclusionReason.LookupKeyConflict,
      winner.lane,
      visibilityLane(visible.visibilityKind),
      [visible.exclusion.resourceKey],
      winner.resource,
      loser,
      visible.exclusion.winner.keySourceAddressHandle ?? winner.sourceAddressHandle,
      visible.exclusion.excludedKeySourceAddressHandle ?? loser.sourceAddressHandle,
    ));
  }

  private recordVisibleSlotConflict(visibleSlot: VisibleContainerResourceSlot): void {
    const winner = this.winnerByLookupKey.get(visibleSlot.resourceKey) ?? null;
    const loser = this.visibleResourceForSlot(visibleSlot);
    if (winner == null || loser == null) {
      return;
    }
    const loserLane = visibleSlotLane(visibleSlot);
    const duplicateProduct = winner.resource.resourceProductHandle != null
      && winner.resource.resourceProductHandle === loser.resourceProductHandle;
    // Accepted slots only reveal cross-container fallback. Same-product rows normalize here; true same-container
    // duplicate registrations are retained by the DI exclusion carrier instead.
    if (duplicateProduct) {
      return;
    }
    this.exclusions.push(new TemplateResourceScopeExclusion(
      TemplateResourceScopeExclusionReason.LookupKeyConflict,
      winner.lane,
      loserLane,
      [visibleSlot.resourceKey],
      winner.resource,
      loser,
      winner.sourceAddressHandle,
      loser.sourceAddressHandle,
    ));
  }

  private visibleResourceForSlot(visibleSlot: VisibleContainerResourceSlot): TemplateVisibleResource | null {
    const configuredResource = visibleSlot.resourceProductHandle == null
      ? null
      : this.configuredResourceByProduct.get(visibleSlot.resourceProductHandle) ?? null;
    if (configuredResource?.resource.productHandle != null) {
      return new TemplateVisibleResource(
        configuredResource.resource.resourceKind,
        configuredResource.resource.name,
        configuredResource.resource.aliases,
        configuredResource.resource.productHandle,
        configuredResource.resource.identityHandle,
        configuredResource.definition?.productHandle ?? null,
        visibleSlot.visibilityKind,
        visibleSlot.sourceAddressHandle ?? configuredResource.resource.sourceAddressHandle,
      );
    }
    const definition = this.resourceDefinitions?.lookupByProduct(visibleSlot.resourceProductHandle) ?? null;
    const definitionResource = definition == null
      ? null
      : visibleResourceForDefinition(definition, visibleSlot.visibilityKind, visibleSlot.sourceAddressHandle);
    if (definitionResource != null) {
      return definitionResource;
    }
    const parsedKey = readRuntimeResourceKey(visibleSlot.resourceKey);
    return parsedKey == null || parsedKey.resourceKind === ResourceDefinitionKind.BindingCommand
      ? null
      : new TemplateVisibleResource(
          parsedKey.resourceKind,
          parsedKey.name,
          [],
          visibleSlot.resourceProductHandle,
          visibleSlot.resourceIdentityHandle,
          null,
          visibleSlot.visibilityKind,
          visibleSlot.sourceAddressHandle,
        );
  }

  private rememberNormalizedSlot(
    visibleSlot: VisibleContainerResourceSlot,
    resourceProductHandle: ProductHandle,
  ): void {
    const winner = this.winnerByResourceProduct.get(resourceProductHandle);
    if (winner != null) {
      this.seenLookupKeys.add(visibleSlot.resourceKey);
      this.winnerByLookupKey.set(visibleSlot.resourceKey, new VisibleResourceWinner(
        winner.resource,
        visibleSlotLane(visibleSlot),
        visibleSlot.keySourceAddressHandle,
      ));
    }
  }

  private rememberWinner(
    resource: TemplateVisibleResource,
    lane: TemplateResourceScopeLane,
    lookupKeys: readonly string[],
    sourceAddressHandle: TemplateVisibleResource['sourceAddressHandle'],
  ): void {
    const winner = new VisibleResourceWinner(resource, lane, sourceAddressHandle);
    if (resource.resourceProductHandle != null) {
      this.winnerByResourceProduct.set(resource.resourceProductHandle, winner);
    }
    for (const key of lookupKeys) {
      this.winnerByLookupKey.set(key, winner);
    }
  }

}

interface VisibleContainerResourceSlot {
  readonly resourceKey: string;
  readonly resourceProductHandle: ProductHandle | null;
  readonly resourceIdentityHandle: IdentityHandle | null;
  readonly sourceAddressHandle: TemplateVisibleResource['sourceAddressHandle'];
  readonly keySourceAddressHandle: TemplateVisibleResource['sourceAddressHandle'];
  readonly visibilityKind: TemplateResourceVisibilityKind;
}

interface VisibleContainerResourceSlotExclusion {
  readonly exclusion: DiResourceSlotExclusion;
  readonly visibilityKind: TemplateResourceVisibilityKind;
}

class VisibleResourceWinner {
  constructor(
    readonly resource: TemplateVisibleResource,
    readonly lane: TemplateResourceScopeLane,
    readonly sourceAddressHandle: TemplateVisibleResource['sourceAddressHandle'],
  ) {}
}

function visibilityLane(
  visibilityKind: TemplateResourceVisibilityKind,
): TemplateResourceScopeLane {
  return visibilityKind === TemplateResourceVisibilityKind.Inherited
    ? TemplateResourceScopeLane.Inherited
    : TemplateResourceScopeLane.Local;
}

function visibleSlotLane(slot: VisibleContainerResourceSlot): TemplateResourceScopeLane {
  return visibilityLane(slot.visibilityKind);
}

function sameResourceProduct(
  left: TemplateVisibleResource,
  right: TemplateVisibleResource,
): boolean {
  return left.resourceProductHandle != null
    && left.resourceProductHandle === right.resourceProductHandle;
}

function isAttributeRegistrationResource(resource: TemplateVisibleResource): boolean {
  return resource.resourceKind === ResourceDefinitionKind.CustomAttribute
    || resource.resourceKind === ResourceDefinitionKind.TemplateController;
}

function scopeExclusionFromWinner(
  winner: VisibleResourceWinner,
  loser: TemplateVisibleResource,
  lookupKey: string,
  loserSourceAddressHandle: TemplateVisibleResource['sourceAddressHandle'],
  loserLane: TemplateResourceScopeLane = TemplateResourceScopeLane.Local,
): TemplateResourceScopeExclusion {
  return new TemplateResourceScopeExclusion(
    TemplateResourceScopeExclusionReason.LookupKeyConflict,
    winner.lane,
    loserLane,
    [lookupKey],
    winner.resource,
    loser,
    winner.sourceAddressHandle,
    loserSourceAddressHandle,
  );
}

function terminalAppScopeExclusions(
  exclusions: readonly TemplateResourceScopeExclusion[],
  winners: ReadonlyMap<string, VisibleResourceWinner>,
): readonly TemplateResourceScopeExclusion[] {
  return exclusions.flatMap((exclusion) => {
    if (
      exclusion.reason !== TemplateResourceScopeExclusionReason.LookupKeyConflict
      || exclusion.lookupKeys.length === 0
    ) return [exclusion];
    const keysByWinner = new Map<VisibleResourceWinner, string[]>();
    for (const lookupKey of exclusion.lookupKeys) {
      const winner = winners.get(lookupKey) ?? null;
      if (winner == null) continue;
      const keys = keysByWinner.get(winner) ?? [];
      keys.push(lookupKey);
      keysByWinner.set(winner, keys);
    }
    return [...keysByWinner].flatMap(([winner, lookupKeys]) =>
      sameResourceProduct(winner.resource, exclusion.loser)
        ? []
        : [new TemplateResourceScopeExclusion(
            exclusion.reason,
            winner.lane,
            exclusion.loserLane,
            lookupKeys,
            winner.resource,
            exclusion.loser,
            winner.sourceAddressHandle,
            exclusion.loserKeySourceAddressHandle,
          )]
    );
  });
}

function exactDefinitionLookupSource(
  definition: FullResourceDefinition,
  lookupKey: string,
  fallback: TemplateVisibleResource['sourceAddressHandle'],
): TemplateVisibleResource['sourceAddressHandle'] {
  if (definition.type === ResourceDefinitionKind.AttributePattern) return definition.sourceAddressHandle ?? fallback;
  const parsed = readRuntimeResourceKey(lookupKey);
  if (parsed?.name === definition.name) {
    return definition.nameSourceAddressHandle ?? definition.sourceAddressHandle ?? fallback;
  }
  return definition.aliases.find((alias) => alias.name === parsed?.name)?.addressHandle
    ?? definition.sourceAddressHandle
    ?? fallback;
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
        keySourceAddressHandle: slot.keySourceAddressHandle,
        visibilityKind: TemplateResourceVisibilityKind.Local,
      });
    }
  }

  if (rootProductHandle == null || rootProductHandle === containerProductHandle) {
    return slots;
  }

  for (const slot of diWorld.resourceSlots) {
    if (slot.container.productHandle === rootProductHandle) {
      if (container.hasBlockedResource(slot.resourceKey)) {
        continue;
      }
      slots.push({
        resourceKey: slot.resourceKey,
        resourceProductHandle: slot.resourceProductHandle,
        resourceIdentityHandle: slot.resourceIdentityHandle,
        sourceAddressHandle: slot.sourceAddressHandle,
        keySourceAddressHandle: slot.keySourceAddressHandle,
        visibilityKind: TemplateResourceVisibilityKind.Inherited,
      });
    }
  }

  return slots;
}

function visibleBlockedResourceLookupsForContainer(
  container: Container,
): readonly TemplateResourceScopeBlockedLookup[] {
  const blocked: TemplateResourceScopeBlockedLookup[] = container.readBlockedResourceKeys().map((lookupKey) =>
    new TemplateResourceScopeBlockedLookup(
      lookupKey,
      TemplateResourceScopeLane.Local,
      null,
    )
  );
  const root = container.root;
  if (root === container) return blocked;
  const localKeys = new Set([
    ...container.readResourceSlots().map((slot) => slot.resourceKey),
    ...container.readBlockedResourceKeys(),
  ]);
  for (const lookupKey of root.readBlockedResourceKeys()) {
    if (!localKeys.has(lookupKey)) {
      blocked.push(new TemplateResourceScopeBlockedLookup(
        lookupKey,
        TemplateResourceScopeLane.Inherited,
        null,
      ));
    }
  }
  return blocked;
}

function visibleResourceSlotExclusionsForContainer(
  container: Container,
  diWorld: DiWorldConstructionEmission,
): readonly VisibleContainerResourceSlotExclusion[] {
  const containerProductHandle = container.productHandle;
  const rootProductHandle = container.readRootReference().productHandle;
  const exclusions: VisibleContainerResourceSlotExclusion[] = [];

  for (const exclusion of diWorld.resourceSlotExclusions) {
    if (exclusion.winner.container.productHandle === containerProductHandle) {
      exclusions.push({
        exclusion,
        visibilityKind: TemplateResourceVisibilityKind.Local,
      });
    }
  }

  if (rootProductHandle == null || rootProductHandle === containerProductHandle) {
    return exclusions;
  }

  for (const exclusion of diWorld.resourceSlotExclusions) {
    if (exclusion.winner.container.productHandle === rootProductHandle) {
      exclusions.push({
        exclusion,
        visibilityKind: TemplateResourceVisibilityKind.Inherited,
      });
    }
  }
  return exclusions;
}
