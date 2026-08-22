import type { ConfigurationOpenSeamScope } from '../configuration/configuration-kernel-emitter.js';
import type { IdentityHandle } from '../kernel/handles.js';
import {
  OpenSeamReasonKind,
  type OpenSeam,
} from '../kernel/open-seam.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  frameworkRegistrationCapabilitiesForKind,
  type FrameworkRegistrationCapability,
} from '../registration/framework-registration-manifest.js';
import {
  OpenRegistrationAdmission,
  ParameterizedRegistryAdmission,
  RegistrationStrategy,
  ResourceRegistrationAdmission,
  RegistryRegistrationAdmission,
} from '../registration/registration-admission.js';
import {
  frameworkRegistrationKindForOperation,
  type ContainerRegistrationOperation,
} from './container-registration.js';
import type { DiContainerChainFacts } from './container-chain.js';
import type { DiWorldConstructionEmission } from './world-construction.js';
import {
  readRuntimeResourceKey,
  resourceKindsShareRegistrationIdentity,
} from '../resources/resource-kind.js';

export type RegistrationOpenOperationPredicate = (
  operation: ContainerRegistrationOperation | null,
) => boolean;

export interface RegistrationOpenPressureFact {
  readonly seam: OpenSeam;
  readonly operation: ContainerRegistrationOperation | null;
  /** Every known receiving container; null means no exact container locus survived. */
  readonly containerIdentityHandles: readonly IdentityHandle[] | null;
}

/** Exact unresolved-registration facts before any consumer-specific capability or locus filter. */
export function registrationOpenPressureFacts(
  world: DiWorldConstructionEmission,
  configurationOpenSeamScopes: readonly ConfigurationOpenSeamScope[],
): readonly RegistrationOpenPressureFact[] {
  return [
    ...world.registrationOpenSeamScopes.map((scope): RegistrationOpenPressureFact => ({
      seam: scope.seam,
      operation: scope.operation,
      containerIdentityHandles: scope.containerIdentityHandle == null
        ? null
        : [scope.containerIdentityHandle],
    })),
    ...configurationOpenSeamScopes.flatMap((scope): readonly RegistrationOpenPressureFact[] =>
      isConfigurationRegistrationHidingOpenSeam(scope.seam)
        ? [{
            seam: scope.seam,
            operation: null,
            containerIdentityHandles: scope.containerIdentityHandles,
          }]
        : []
    ),
  ];
}

/**
 * Select unresolved registration pressure that can affect one consulting container chain.
 * Configuration and DI consumers share this owner so missing-provider/resource conclusions cannot drift by lane.
 */
export function registrationHidingOpenSeamsForContainer(
  world: DiWorldConstructionEmission,
  configurationOpenSeamScopes: readonly ConfigurationOpenSeamScope[],
  chainFacts: DiContainerChainFacts,
  containerIdentityHandle: IdentityHandle | null,
  operationCanHide: RegistrationOpenOperationPredicate,
): readonly OpenSeam[] {
  const chain = containerIdentityHandle == null
    ? null
    : new Set(chainFacts.containerChainIdentityHandles(containerIdentityHandle));
  const seams = new Map<OpenSeam['handle'], OpenSeam>();
  for (const fact of registrationOpenPressureFacts(world, configurationOpenSeamScopes)) {
    const containerMatches = chain == null
      ? true
      : fact.containerIdentityHandles?.some((identityHandle) => chain.has(identityHandle)) === true;
    if (
      containerMatches
      && operationCanHide(fact.operation)
    ) {
      seams.set(fact.seam.handle, fact.seam);
    }
  }
  return [...seams.values()];
}

/** Unclassified registration pressure can add or replace an arbitrary userland resource key. */
export function registrationOpenSeamCanHideResource(
  operation: ContainerRegistrationOperation | null,
  requestedLookupKeys: ReadonlySet<string> | null = null,
): boolean {
  if (operation == null) return true;
  if (frameworkRegistrationKindForOperation(operation) != null) return false;
  if (operation.admission instanceof ResourceRegistrationAdmission) {
    if (requestedLookupKeys == null) return true;
    const value = operation.admission.registeredValue;
    if (value.resourceLookupKeys.length > 0) {
      return value.resourceLookupKeys.some((key) => requestedLookupKeys.has(key));
    }
    if (value.resourceKind == null) return true;
    return [...requestedLookupKeys].some((key) => {
      const requested = readRuntimeResourceKey(key);
      return requested != null
        && resourceKindsShareRegistrationIdentity(value.resourceKind!, requested.resourceKind);
    });
  }
  return operationMayInstallUnknownResources(operation);
}

/** A known framework registration constrains pressure to the capabilities carried by that group. */
export function registrationOpenSeamCanHideFrameworkCapability(
  operation: ContainerRegistrationOperation | null,
  capability: FrameworkRegistrationCapability,
): boolean {
  if (operation == null) return true;
  const frameworkKind = frameworkRegistrationKindForOperation(operation);
  return frameworkKind == null
    ? operationMayInstallUnknownFrameworkCapabilities(operation)
    : frameworkRegistrationCapabilitiesForKind(frameworkKind).includes(capability);
}

function operationMayInstallUnknownResources(
  operation: ContainerRegistrationOperation,
): boolean {
  const admission = operation.admission;
  if (
    admission instanceof RegistryRegistrationAdmission
    || admission instanceof ParameterizedRegistryAdmission
  ) {
    return true;
  }
  if (!(admission instanceof OpenRegistrationAdmission)) {
    return false;
  }
  switch (admission.strategy) {
    case RegistrationStrategy.Unknown:
    case RegistrationStrategy.Registry:
    case RegistrationStrategy.Resource:
    case RegistrationStrategy.RecursiveCarrier:
    case RegistrationStrategy.FrameworkGroup:
      return true;
    default:
      return false;
  }
}

function operationMayInstallUnknownFrameworkCapabilities(
  operation: ContainerRegistrationOperation,
): boolean {
  const admission = operation.admission;
  if (admission instanceof RegistryRegistrationAdmission || admission instanceof ParameterizedRegistryAdmission) {
    return true;
  }
  if (!(admission instanceof OpenRegistrationAdmission)) {
    return false;
  }
  switch (admission.strategy) {
    case RegistrationStrategy.Unknown:
    case RegistrationStrategy.Registry:
    case RegistrationStrategy.RecursiveCarrier:
    case RegistrationStrategy.FrameworkGroup:
      return true;
    default:
      return false;
  }
}

/** Configuration pressure predating DI application can still hide a registration effect. */
export function isConfigurationRegistrationHidingOpenSeam(
  seam: OpenSeam,
): boolean {
  switch (seam.seamKindKey) {
    case KernelVocabulary.Di.OpenRegistryBody.key:
      return true;
    case KernelVocabulary.Di.OpenRegistrationSpending.key:
      return seam.reasonKinds.some(isRegistrationHidingReason);
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

function isRegistrationHidingReason(reason: OpenSeamReasonKind): boolean {
  switch (reason) {
    case OpenSeamReasonKind.DiRegistrationContainerOpen:
    case OpenSeamReasonKind.DiRegistrationAdmissionOpen:
    case OpenSeamReasonKind.DiRegistrationKeyOpen:
    case OpenSeamReasonKind.DiRegistrationStrategyOpen:
    case OpenSeamReasonKind.DiRegistrationPublicationOpen:
    case OpenSeamReasonKind.DiRegistryBodyOpen:
    case OpenSeamReasonKind.DiResourceSlotOpen:
      return true;
    default:
      return false;
  }
}
