import { readStaticOwnProperty } from '../evaluation/property-access.js';
import {
  StaticCallableExecutionBinding,
  StaticCallableExecutionBindings,
  StaticCallableSlot,
} from '../evaluation/function-execution.js';
import {
  EvaluationObjectPropertyPresence,
  EvaluationObjectPropertyState,
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';
import { ContainerResolverSlot } from '../di/container-slot.js';
import { frameworkRegistrationKindForOperation } from '../di/container-registration.js';
import {
  DiAllResourcesMembershipState,
  DiProviderActivationState,
  type DiAllResourcesProviderEntry,
} from '../di/provider-activation.js';
import {
  DiAllResourcesRegistrationPressureLane,
  type DiDirectKeyAllResourcesActivation,
} from '../di/provider-membership.js';
import {
  TemplateCompilerHookCallableAuthority,
  TemplateCompilerHookCallableAuthorityKind,
  TemplateCompilerHookEntry,
  TemplateCompilerHookEntryCause,
  TemplateCompilerHookEntryCauseKind,
  TemplateCompilerHookKind,
  TemplateCompilerHookLane,
  TemplateCompilerHookOpenReason,
  TemplateCompilerHookOpenReasonKind,
  TemplateCompilerHookProviderAuthority,
  TemplateCompilerHookProviderResolutionKind,
  TemplateCompilerHookSetCandidate,
} from './compiler-hook-world.js';
import {
  FrameworkRegistrationCapability,
  frameworkRegistrationCapabilitiesForKind,
} from '../registration/framework-registration-manifest.js';

/** Candidate-local hook projection keeps durable world facts separate from live evaluator callable authority. */
export class TemplateCompilerHookDiProjection {
  constructor(
    readonly candidate: TemplateCompilerHookSetCandidate,
    readonly callableBindings: StaticCallableExecutionBindings,
  ) {}
}

/** Project generic DI membership into the neutral compiler-world hook-set contract. */
export function projectTemplateCompilerHooksFromDi(
  activation: DiDirectKeyAllResourcesActivation,
  worldLocalKey: string,
): TemplateCompilerHookDiProjection {
  let leafOrdinal = 0;
  let rootOrdinal = 0;
  const callableBindings: StaticCallableExecutionBinding[] = [];
  const entries = activation.entries.map((entry) => {
    const lane = entry.handler === entry.handler.root
      ? TemplateCompilerHookLane.Root
      : TemplateCompilerHookLane.Leaf;
    const sourceOrdinal = lane === TemplateCompilerHookLane.Root ? rootOrdinal++ : leafOrdinal++;
    return hookEntryForProvider(entry, lane, sourceOrdinal, worldLocalKey, callableBindings);
  });
  const relevantRegistrationPressure = activation.registrationOpenPressure.filter((pressure) => {
    const frameworkKind = pressure.operation == null
      ? null
      : frameworkRegistrationKindForOperation(pressure.operation);
    return frameworkKind == null
      || frameworkRegistrationCapabilitiesForKind(frameworkKind).includes(
        FrameworkRegistrationCapability.TemplateCompilerHooks,
      );
  });
  const openReasons = relevantRegistrationPressure.map((pressure) =>
    new TemplateCompilerHookOpenReason(
      TemplateCompilerHookOpenReasonKind.DiMembership,
      hookLaneForPressure(pressure.lane),
      pressure.seam.summary,
      pressure.seam.addressHandle,
      [pressure.seam.handle],
    )
  );
  if (
    activation.resolverMembershipState === DiAllResourcesMembershipState.Open
    && openReasons.length === 0
  ) {
    openReasons.push(new TemplateCompilerHookOpenReason(
      TemplateCompilerHookOpenReasonKind.DiMembership,
      null,
      'TemplateCompilerHooks resolver-slot membership could not be ordered exactly.',
      null,
    ));
  }
  const candidate = activation.resolverMembershipState === DiAllResourcesMembershipState.Exact
    && openReasons.length === 0
    ? TemplateCompilerHookSetCandidate.exactList(entries)
    : TemplateCompilerHookSetCandidate.open(entries, openReasons);
  return new TemplateCompilerHookDiProjection(
    candidate,
    new StaticCallableExecutionBindings(callableBindings),
  );
}

function hookEntryForProvider(
  entry: DiAllResourcesProviderEntry,
  lane: TemplateCompilerHookLane,
  sourceOrdinal: number,
  worldLocalKey: string,
  callableBindings: StaticCallableExecutionBinding[],
): TemplateCompilerHookEntry {
  const resolver = entry.slot instanceof ContainerResolverSlot ? entry.slot.resolver : null;
  return new TemplateCompilerHookEntry(
    lane,
    sourceOrdinal,
    sourceOrdinal,
    TemplateCompilerHookKind.Registered,
    new TemplateCompilerHookEntryCause(
      TemplateCompilerHookEntryCauseKind.ResolverSlot,
      entry.slot.productHandle,
      resolver?.identityHandle ?? null,
      entry.slot.sourceAddressHandle,
    ),
    providerAuthorityForProvider(entry),
    callableAuthorityForProvider(entry, worldLocalKey, callableBindings),
  );
}

function providerAuthorityForProvider(
  entry: DiAllResourcesProviderEntry,
): TemplateCompilerHookProviderAuthority {
  const activation = entry.activation;
  if (
    activation.state === DiProviderActivationState.Failed
    || activation.state === DiProviderActivationState.Cycle
    || activation.abruptCompletion != null
  ) {
    return new TemplateCompilerHookProviderAuthority(
      TemplateCompilerHookProviderResolutionKind.Abrupt,
      activation.reason ?? 'Compiler-hook provider resolution completed abruptly.',
    );
  }
  if (
    (activation.state === DiProviderActivationState.Value && activation.value != null
      || activation.state === DiProviderActivationState.Undefined)
    && activation.openSeams.length === 0
  ) {
    return new TemplateCompilerHookProviderAuthority(TemplateCompilerHookProviderResolutionKind.Value);
  }
  return new TemplateCompilerHookProviderAuthority(
    TemplateCompilerHookProviderResolutionKind.Open,
    activation.reason ?? (
      activation.openSeams.map((seam) => seam.summary).join(' | ')
      || 'Compiler-hook provider resolution remains open.'
    ),
  );
}

function callableAuthorityForProvider(
  entry: DiAllResourcesProviderEntry,
  worldLocalKey: string,
  callableBindings: StaticCallableExecutionBinding[],
): TemplateCompilerHookCallableAuthority {
  const activation = entry.activation;
  const resolver = entry.slot instanceof ContainerResolverSlot ? entry.slot.resolver : null;
  const identityHandle = resolver?.identityHandle ?? null;
  const sourceAddressHandle = entry.slot.sourceAddressHandle;
  const provider = providerAuthorityForProvider(entry);
  if (provider.resolutionKind !== TemplateCompilerHookProviderResolutionKind.Value) {
    return new TemplateCompilerHookCallableAuthority(
      TemplateCompilerHookCallableAuthorityKind.Open,
      identityHandle,
      sourceAddressHandle,
      null,
      'Hook callable reachability depends on complete provider-array resolution.',
    );
  }
  if (activation.state === DiProviderActivationState.Undefined) {
    return new TemplateCompilerHookCallableAuthority(
      TemplateCompilerHookCallableAuthorityKind.Abrupt,
      identityHandle,
      sourceAddressHandle,
      null,
      'Hook provider resolved undefined, so reading its compiling member completes abruptly.',
    );
  }
  const value = activation.value!;
  if (value.kind === EvaluationValueKind.Undefined || value.kind === EvaluationValueKind.Null) {
    return new TemplateCompilerHookCallableAuthority(
      TemplateCompilerHookCallableAuthorityKind.Abrupt,
      identityHandle,
      sourceAddressHandle,
      null,
      'Hook entry is nullish, so reading its compiling member completes abruptly.',
    );
  }
  const compiling = readStaticOwnProperty(value, 'compiling');
  if (compiling == null) {
    return new TemplateCompilerHookCallableAuthority(
      hasClosedPropertyMembership(value)
        ? TemplateCompilerHookCallableAuthorityKind.Absent
        : TemplateCompilerHookCallableAuthorityKind.Open,
      identityHandle,
      sourceAddressHandle,
      null,
      hasClosedPropertyMembership(value)
        ? null
        : 'Hook entry property membership is open, so compiling may still exist.',
    );
  }
  if (
    compiling.state !== EvaluationObjectPropertyState.Closed
    || compiling.presence !== EvaluationObjectPropertyPresence.Present
    || compiling.openSeams.length > 0
    || compiling.presenceOpenSeams.length > 0
  ) {
    return new TemplateCompilerHookCallableAuthority(
      TemplateCompilerHookCallableAuthorityKind.Open,
      identityHandle,
      sourceAddressHandle,
      null,
      'Hook compiling member value or presence is open.',
    );
  }
  switch (compiling.value.kind) {
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
      return new TemplateCompilerHookCallableAuthority(
        TemplateCompilerHookCallableAuthorityKind.Absent,
        identityHandle,
        sourceAddressHandle,
      );
    case EvaluationValueKind.Function: {
      const target = entry.callableTarget(compiling.value, value);
      if (target == null) {
        return new TemplateCompilerHookCallableAuthority(
          TemplateCompilerHookCallableAuthorityKind.Open,
          identityHandle,
          sourceAddressHandle,
          null,
          'Hook compiling function is exact, but its evaluator source is unavailable for candidate-local execution.',
        );
      }
      const slot = new StaticCallableSlot(
        `template-compiler-world:${worldLocalKey}:compiler-hook:${entry.slot.productHandle}:compiling`,
      );
      callableBindings.push(new StaticCallableExecutionBinding(slot, target));
      return new TemplateCompilerHookCallableAuthority(
        TemplateCompilerHookCallableAuthorityKind.StaticCallable,
        identityHandle,
        sourceAddressHandle,
        slot.key,
      );
    }
    default:
      return new TemplateCompilerHookCallableAuthority(
        TemplateCompilerHookCallableAuthorityKind.Abrupt,
        identityHandle,
        sourceAddressHandle,
        null,
        'Hook compiling member is present but non-callable.',
      );
  }
}

function hasClosedPropertyMembership(value: EvaluationValue): boolean {
  switch (value.kind) {
    case EvaluationValueKind.Object:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
      return !value.mayHaveUnknownProperties && value.shapeOpenSeams.length === 0;
    case EvaluationValueKind.Instance:
      return !value.mayHaveUnknownProperties
        && value.shapeOpenSeams.length === 0
        && value.constructionOpenSeams.length === 0;
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
    case EvaluationValueKind.Unknown:
    case EvaluationValueKind.BoundaryValue:
      return false;
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.BigInt:
    case EvaluationValueKind.String:
    case EvaluationValueKind.StringPattern:
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Date:
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
      return true;
  }
}

function hookLaneForPressure(
  lane: DiAllResourcesRegistrationPressureLane,
): TemplateCompilerHookLane | null {
  switch (lane) {
    case DiAllResourcesRegistrationPressureLane.Leaf:
      return TemplateCompilerHookLane.Leaf;
    case DiAllResourcesRegistrationPressureLane.Root:
      return TemplateCompilerHookLane.Root;
    case DiAllResourcesRegistrationPressureLane.Global:
      return null;
  }
}
