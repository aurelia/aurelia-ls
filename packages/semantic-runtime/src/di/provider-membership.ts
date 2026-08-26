import type ts from 'typescript';

import type { ConfigurationOpenSeamScope } from '../configuration/configuration-kernel-emitter.js';
import type { OpenSeam } from '../kernel/open-seam.js';
import type { Container } from './container.js';
import type { ContainerRegistrationOperation } from './container-registration.js';
import type { ContainerLookupKey } from './container-key.js';
import {
  DiAllResourcesMembershipState,
  type DiAllResourcesProviderEntry,
} from './provider-activation.js';
import {
  registrationHidingOpenPressureAtContainerLoci,
  registrationOpenSeamCanHideDirectKey,
} from './registration-open-pressure.js';
import type { DiWorldConstructionEmission } from './world-construction.js';

/** Runtime lane at which unresolved registration may change direct-key `allResources` membership. */
export const enum DiAllResourcesRegistrationPressureLane {
  Leaf = 'leaf',
  Root = 'root',
  /** Registration pressure whose receiving container could not be bounded. */
  Global = 'global',
}

/** One unresolved registration fact preserved at its exact selected membership lane. */
export class DiDirectKeyRegistrationPressure {
  constructor(
    readonly seam: OpenSeam,
    readonly operation: ContainerRegistrationOperation | null,
    readonly lane: DiAllResourcesRegistrationPressureLane,
    /** Exact selected handler for finite pressure; null only for genuinely global pressure. */
    readonly handler: Container | null,
  ) {}
}

/** Direct-key provider membership after combining live resolver activation with unresolved registration pressure. */
export class DiDirectKeyAllResourcesActivation {
  constructor(
    /** Canonical direct key spent by the lookup; no friendly-name matching participates. */
    readonly key: ContainerLookupKey,
    /** Exact known providers in leaf-registration order followed by root-registration order. */
    readonly entries: readonly DiAllResourcesProviderEntry[],
    /** Registration pressure capable of changing membership, retained at the selected leaf/root/global lane. */
    readonly registrationOpenPressure: readonly DiDirectKeyRegistrationPressure[],
    /** Whether the resolver lookup itself retained closed slot ordering. */
    readonly resolverMembershipState: DiAllResourcesMembershipState,
  ) {}

  /** Membership is exact only when both resolver lookup and registration spending close. */
  get membershipState(): DiAllResourcesMembershipState {
    return this.resolverMembershipState === DiAllResourcesMembershipState.Exact
      && this.registrationOpenPressure.length === 0
      ? DiAllResourcesMembershipState.Exact
      : DiAllResourcesMembershipState.Open;
  }

  /** Deduplicated compatibility projection for consumers that do not need lane attribution. */
  get registrationOpenSeams(): readonly OpenSeam[] {
    const seams = new Map<OpenSeam['handle'], OpenSeam>();
    for (const pressure of this.registrationOpenPressure) {
      seams.set(pressure.seam.handle, pressure.seam);
    }
    return [...seams.values()];
  }
}

/**
 * Activate direct-key membership under Aurelia's current-container-plus-root `allResources` rule.
 *
 * Each entry retains its complete `DiProviderActivationResult`, so an exact member whose value is open, failed,
 * cyclic, or abrupt remains distinct from membership uncertainty. DI scopes unresolved registration pressure against
 * the canonical key without baking any framework-service name into the query.
 */
export function activateDirectKeyAllResources(
  world: DiWorldConstructionEmission,
  configurationOpenSeamScopes: readonly ConfigurationOpenSeamScope[],
  requestor: Container,
  key: ContainerLookupKey,
  dependencyNode: ts.Node | null = null,
): DiDirectKeyAllResourcesActivation {
  const activation = world.providerActivation.activateAllResourcesDirectKey(
    requestor,
    key,
    dependencyNode,
  );
  const loci = new Set([
    requestor.identityHandle,
    requestor.root.identityHandle,
  ]);
  const registrationOpenPressure = registrationHidingOpenPressureAtContainerLoci(
    world,
    configurationOpenSeamScopes,
    loci,
    (operation) => registrationOpenSeamCanHideDirectKey(operation, key),
  ).map((pressure) => {
    if (pressure.containerIdentityHandle == null) {
      return new DiDirectKeyRegistrationPressure(
        pressure.seam,
        pressure.operation,
        DiAllResourcesRegistrationPressureLane.Global,
        null,
      );
    }
    if (requestor !== requestor.root && pressure.containerIdentityHandle === requestor.identityHandle) {
      return new DiDirectKeyRegistrationPressure(
        pressure.seam,
        pressure.operation,
        DiAllResourcesRegistrationPressureLane.Leaf,
        requestor,
      );
    }
    if (pressure.containerIdentityHandle !== requestor.root.identityHandle) {
      throw new Error('Direct-key registration pressure escaped the selected leaf/root loci.');
    }
    return new DiDirectKeyRegistrationPressure(
      pressure.seam,
      pressure.operation,
      DiAllResourcesRegistrationPressureLane.Root,
      requestor.root,
    );
  });
  return new DiDirectKeyAllResourcesActivation(
    key,
    activation.entries,
    registrationOpenPressure,
    activation.state,
  );
}
