import type {
  AddressHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  TemplateCompilerServiceKind,
  TemplateCompilerServiceReference,
} from './compiler-world-reference.js';
import {
  resourceCompilerHookEffectKind,
  ResourceCompilerHookEffectKind,
  type ResourceDependencyReference,
} from '../resources/resource-reference.js';
import type { CssClassMappingAuthorityReference } from './css-class-mapping.js';

/** Whether the complete `TemplateCompilerHooks.findAll(...)` membership is known for one compiler invocation. */
export const enum TemplateCompilerHookMembershipState {
  ExactNone = 'exact-none',
  ExactList = 'exact-list',
  Open = 'open',
}

/** Aurelia resolves only the requestor leaf and root hook registrations; intermediate ancestors are excluded. */
export const enum TemplateCompilerHookLane {
  Leaf = 'leaf',
  Root = 'root',
}

/** Semantic source that can contribute one hook-set member. */
export const enum TemplateCompilerHookEntryCauseKind {
  ResolverSlot = 'resolver-slot',
  RegistryDependency = 'registry-dependency',
}

/** Known hook family retained independently from whether its callable body can execute statically. */
export const enum TemplateCompilerHookKind {
  Registered = 'registered',
  CssModules = 'css-modules',
}

/** Closure of the optional `compiling` member on one exact hook-set member. */
export const enum TemplateCompilerHookCallableAuthorityKind {
  /** The exact resolved entry has no callable `compiling` member. */
  Absent = 'absent',
  /** Framework-owned behavior has an exact semantic implementation. */
  BuiltIn = 'built-in',
  /** Reached member access or invocation is proven to complete abruptly. */
  Abrupt = 'abrupt',
  /** Candidate-current static execution authority exists for the callable plus receiver. */
  StaticCallable = 'static-callable',
  /** Membership is known, but the callable or receiver remains unresolved. */
  Open = 'open',
}

/** Completion of one provider while `findAll(...)` resolves the complete hook array before invoking any member. */
export const enum TemplateCompilerHookProviderResolutionKind {
  Value = 'value',
  Open = 'open',
  Abrupt = 'abrupt',
}

export const enum TemplateCompilerHookProviderSetState {
  Complete = 'complete',
  Open = 'open',
  Abrupt = 'abrupt',
}

/** First pre-walk boundary selected after membership, provider-array resolution, and ordered callable inspection. */
export const enum TemplateCompilerHookExecutionAdmissionKind {
  ExactNoEffect = 'exact-no-effect',
  MembershipOpen = 'membership-open',
  ProviderOpen = 'provider-open',
  ProviderAbrupt = 'provider-abrupt',
  CallableOpen = 'callable-open',
  CallableAbrupt = 'callable-abrupt',
}

export class TemplateCompilerHookExecutionAdmission {
  constructor(
    readonly admissionKind: TemplateCompilerHookExecutionAdmissionKind,
    /** First provider or callable boundary in global leaf-then-root order, when one exact member owns it. */
    readonly entryOrdinal: number | null,
  ) {}
}

/** Why hook membership cannot be claimed as an exact list. */
export const enum TemplateCompilerHookOpenReasonKind {
  DiMembership = 'di-membership',
  RegistryDependency = 'registry-dependency',
  CompilerWorld = 'compiler-world',
}

export class TemplateCompilerHookEntryCause {
  constructor(
    readonly causeKind: TemplateCompilerHookEntryCauseKind,
    readonly productHandle: ProductHandle | null,
    readonly identityHandle: IdentityHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    /** Stable registry-effect/member discriminator when the cause is not a materialized DI slot. */
    readonly registryEffectKey: string | null = null,
  ) {}
}

export class TemplateCompilerHookCallableAuthority {
  constructor(
    readonly authorityKind: TemplateCompilerHookCallableAuthorityKind,
    readonly identityHandle: IdentityHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    /** Candidate-local slot key; evaluator values and receivers remain generation-owned. */
    readonly callableSlotKey: string | null = null,
    readonly reason: string | null = null,
    readonly openSeamHandles: readonly OpenSeamHandle[] = [],
  ) {}
}

export class TemplateCompilerHookProviderAuthority {
  constructor(
    readonly resolutionKind: TemplateCompilerHookProviderResolutionKind,
    readonly reason: string | null = null,
    readonly openSeamHandles: readonly OpenSeamHandle[] = [],
  ) {}
}

/** One known member in the leaf-then-root hook projection. */
export class TemplateCompilerHookEntry {
  constructor(
    readonly lane: TemplateCompilerHookLane,
    /** Exact hook ordinal inside this leaf or root lane when membership is exact. */
    readonly laneOrdinal: number,
    /** Exact resolver-slot or component-dependency ordinal inside its source collection. */
    readonly sourceOrdinal: number,
    readonly hookKind: TemplateCompilerHookKind,
    readonly cause: TemplateCompilerHookEntryCause,
    readonly provider: TemplateCompilerHookProviderAuthority,
    readonly callable: TemplateCompilerHookCallableAuthority,
    /** Shared leaf-locus mapping captured by every framework-generated CSS Modules hook. */
    readonly cssClassMapping: CssClassMappingAuthorityReference | null = null,
  ) {}
}

export class TemplateCompilerHookOpenReason {
  constructor(
    readonly reasonKind: TemplateCompilerHookOpenReasonKind,
    /** Locus whose membership is open; null means the whole compiler-world projection is unavailable. */
    readonly lane: TemplateCompilerHookLane | null,
    readonly summary: string,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly openSeamHandles: readonly OpenSeamHandle[] = [],
  ) {}
}

/** Product-free candidate used while composing or deriving a compiler world. */
export class TemplateCompilerHookSetCandidate {
  static readonly exactNone = new TemplateCompilerHookSetCandidate(
    TemplateCompilerHookMembershipState.ExactNone,
    [],
    [],
  );

  constructor(
    readonly membershipState: TemplateCompilerHookMembershipState,
    readonly entries: readonly TemplateCompilerHookEntry[],
    readonly openReasons: readonly TemplateCompilerHookOpenReason[],
  ) {
    if (
      (membershipState === TemplateCompilerHookMembershipState.ExactNone && entries.length > 0)
      || (membershipState === TemplateCompilerHookMembershipState.ExactList && entries.length === 0)
      || (membershipState !== TemplateCompilerHookMembershipState.Open && openReasons.length > 0)
      || (membershipState === TemplateCompilerHookMembershipState.Open && openReasons.length === 0)
    ) {
      throw new Error(`Compiler-hook membership '${membershipState}' has incoherent entries or open reasons.`);
    }
  }

  static exactList(entries: readonly TemplateCompilerHookEntry[]): TemplateCompilerHookSetCandidate {
    return entries.length === 0
      ? TemplateCompilerHookSetCandidate.exactNone
      : new TemplateCompilerHookSetCandidate(
          TemplateCompilerHookMembershipState.ExactList,
          [...entries],
          [],
        );
  }

  static open(
    entries: readonly TemplateCompilerHookEntry[],
    reasons: readonly TemplateCompilerHookOpenReason[],
  ): TemplateCompilerHookSetCandidate {
    return new TemplateCompilerHookSetCandidate(
      TemplateCompilerHookMembershipState.Open,
      [...entries],
      [...reasons],
    );
  }

  get providerSetState(): TemplateCompilerHookProviderSetState {
    return providerSetState(this.membershipState, this.entries);
  }

  get firstProviderBoundaryOrdinal(): number | null {
    return firstProviderBoundaryOrdinal(this.entries);
  }
}

/** Conservative default for compiler worlds whose DI/registry hook membership has not yet been projected. */
export const unmodeledTemplateCompilerHooks = TemplateCompilerHookSetCandidate.open(
  [],
  [new TemplateCompilerHookOpenReason(
    TemplateCompilerHookOpenReasonKind.CompilerWorld,
    null,
    'TemplateCompilerHooks membership has not been projected for this compiler world.',
    null,
  )],
);

/** Durable compiler-world service that separates hook membership from per-entry callable closure. */
export class TemplateCompilerHookSet {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly membershipState: TemplateCompilerHookMembershipState,
    readonly entries: readonly TemplateCompilerHookEntry[],
    readonly openReasons: readonly TemplateCompilerHookOpenReason[],
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}

  toReference(): TemplateCompilerServiceReference {
    return new TemplateCompilerServiceReference(
      TemplateCompilerServiceKind.CompilerHooks,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }

  get providerSetState(): TemplateCompilerHookProviderSetState {
    return providerSetState(this.membershipState, this.entries);
  }

  get firstProviderBoundaryOrdinal(): number | null {
    return firstProviderBoundaryOrdinal(this.entries);
  }

  toCandidate(): TemplateCompilerHookSetCandidate {
    return new TemplateCompilerHookSetCandidate(
      this.membershipState,
      this.entries,
      this.openReasons,
    );
  }
}

export function sameTemplateCompilerHookSetCandidate(
  left: TemplateCompilerHookSetCandidate,
  right: TemplateCompilerHookSetCandidate,
): boolean {
  return left.membershipState === right.membershipState
    && sameArrays(left.entries, right.entries, sameTemplateCompilerHookEntry)
    && sameArrays(left.openReasons, right.openReasons, sameTemplateCompilerHookOpenReason);
}

export function templateCompilerHookExecutionAdmission(
  hooks: Pick<
    TemplateCompilerHookSet,
    'membershipState' | 'entries' | 'providerSetState' | 'firstProviderBoundaryOrdinal'
  >,
): TemplateCompilerHookExecutionAdmission {
  if (hooks.membershipState === TemplateCompilerHookMembershipState.Open) {
    return new TemplateCompilerHookExecutionAdmission(
      TemplateCompilerHookExecutionAdmissionKind.MembershipOpen,
      null,
    );
  }
  switch (hooks.providerSetState) {
    case TemplateCompilerHookProviderSetState.Open:
      return new TemplateCompilerHookExecutionAdmission(
        TemplateCompilerHookExecutionAdmissionKind.ProviderOpen,
        hooks.firstProviderBoundaryOrdinal,
      );
    case TemplateCompilerHookProviderSetState.Abrupt:
      return new TemplateCompilerHookExecutionAdmission(
        TemplateCompilerHookExecutionAdmissionKind.ProviderAbrupt,
        hooks.firstProviderBoundaryOrdinal,
      );
    case TemplateCompilerHookProviderSetState.Complete:
      break;
  }
  for (const [entryOrdinal, entry] of hooks.entries.entries()) {
    switch (entry.callable.authorityKind) {
      case TemplateCompilerHookCallableAuthorityKind.Absent:
        continue;
      case TemplateCompilerHookCallableAuthorityKind.Abrupt:
        return new TemplateCompilerHookExecutionAdmission(
          TemplateCompilerHookExecutionAdmissionKind.CallableAbrupt,
          entryOrdinal,
        );
      case TemplateCompilerHookCallableAuthorityKind.BuiltIn:
      case TemplateCompilerHookCallableAuthorityKind.StaticCallable:
      case TemplateCompilerHookCallableAuthorityKind.Open:
        return new TemplateCompilerHookExecutionAdmission(
          TemplateCompilerHookExecutionAdmissionKind.CallableOpen,
          entryOrdinal,
        );
    }
  }
  return new TemplateCompilerHookExecutionAdmission(
    TemplateCompilerHookExecutionAdmissionKind.ExactNoEffect,
    null,
  );
}

/**
 * Replace the parent leaf lane with one component dependency list while retaining only Aurelia's root lane.
 *
 * `preserveParentLeaf` is reserved for the app-root definition whose configured container is itself the requestor
 * leaf. Descendant component compilers intentionally ignore that intermediate lane.
 */
export function deriveTemplateCompilerHooksForDependencies(
  parent: TemplateCompilerHookSetCandidate,
  dependencies: readonly ResourceDependencyReference[],
  preserveParentLeaf: boolean,
  dependencyOpenReasons: readonly TemplateCompilerHookOpenReason[] = [],
): TemplateCompilerHookSetCandidate {
  const retainedLeafEntries = preserveParentLeaf
    ? parent.entries.filter((entry) => entry.lane === TemplateCompilerHookLane.Leaf)
    : [];
  const localLeafEntries: TemplateCompilerHookEntry[] = [];
  const retainedRootEntries = parent.entries.filter((entry) => entry.lane === TemplateCompilerHookLane.Root);
  const retainedLeafReasons = preserveParentLeaf
    ? parent.openReasons.filter((reason) => reason.lane === TemplateCompilerHookLane.Leaf)
    : [];
  const localLeafReasons: TemplateCompilerHookOpenReason[] = [...dependencyOpenReasons];
  const retainedRootOrGlobalReasons = parent.openReasons.filter((reason) =>
    reason.lane == null || reason.lane === TemplateCompilerHookLane.Root
  );
  const hasDependencyOpenAuthority = dependencyOpenReasons.some((reason) =>
    reason.reasonKind === TemplateCompilerHookOpenReasonKind.RegistryDependency
  );
  let localHookOrdinal = 0;
  dependencies.forEach((dependency, sourceOrdinal) => {
    const effectKind = resourceCompilerHookEffectKind(dependency);
    switch (effectKind) {
      case ResourceCompilerHookEffectKind.None:
        return;
      case ResourceCompilerHookEffectKind.CssModules:
        localLeafEntries.push(componentRegistryHookEntry(
          dependency,
          retainedLeafEntries.length + localHookOrdinal++,
          sourceOrdinal,
          TemplateCompilerHookKind.CssModules,
        ));
        return;
      case ResourceCompilerHookEffectKind.TemplateCompilerHook:
        localLeafEntries.push(componentRegistryHookEntry(
          dependency,
          retainedLeafEntries.length + localHookOrdinal++,
          sourceOrdinal,
          TemplateCompilerHookKind.Registered,
        ));
        return;
      case ResourceCompilerHookEffectKind.OpenRegistry:
        if (!hasDependencyOpenAuthority) {
          localLeafReasons.push(new TemplateCompilerHookOpenReason(
            TemplateCompilerHookOpenReasonKind.RegistryDependency,
            TemplateCompilerHookLane.Leaf,
            `Component dependency '${dependency.localName ?? dependency.keyName ?? sourceOrdinal}' has opaque registry effects that may register TemplateCompilerHooks.`,
            null,
          ));
        }
        return;
    }
  });
  const entries = [...retainedLeafEntries, ...localLeafEntries, ...retainedRootEntries];
  const openReasons = [
    ...retainedLeafReasons,
    ...localLeafReasons,
    ...retainedRootOrGlobalReasons,
  ];
  return openReasons.length > 0
    ? TemplateCompilerHookSetCandidate.open(entries, openReasons)
    : TemplateCompilerHookSetCandidate.exactList(entries);
}

/**
 * JIT-generated local elements re-register the owner's component dependencies in their own leaf container.
 * Retain only registry-dependency leaf entries; resolver-slot leaf entries belonged to the now-intermediate owner.
 */
export function templateCompilerHooksInheritedByLocalDefinition(
  parent: TemplateCompilerHookSetCandidate,
): TemplateCompilerHookSetCandidate {
  let leafOrdinal = 0;
  const leafEntries = parent.entries
    .filter((entry) =>
      entry.lane === TemplateCompilerHookLane.Leaf
      && entry.cause.causeKind === TemplateCompilerHookEntryCauseKind.RegistryDependency
    )
    .map((entry) => new TemplateCompilerHookEntry(
      TemplateCompilerHookLane.Leaf,
      leafOrdinal++,
      entry.sourceOrdinal,
      entry.hookKind,
      entry.cause,
      entry.provider.resolutionKind === TemplateCompilerHookProviderResolutionKind.Open
        ? new TemplateCompilerHookProviderAuthority(
            entry.provider.resolutionKind,
            entry.provider.reason,
          )
        : entry.provider,
      entry.callable.authorityKind === TemplateCompilerHookCallableAuthorityKind.Open
        ? new TemplateCompilerHookCallableAuthority(
            entry.callable.authorityKind,
            entry.callable.identityHandle,
            entry.callable.sourceAddressHandle,
            entry.callable.callableSlotKey,
            entry.callable.reason,
          )
        : entry.callable,
    ));
  const rootEntries = parent.entries.filter((entry) => entry.lane === TemplateCompilerHookLane.Root);
  const openReasons = parent.openReasons.filter((reason) =>
    reason.lane == null
    || reason.lane === TemplateCompilerHookLane.Root
    || (
      reason.lane === TemplateCompilerHookLane.Leaf
      && reason.reasonKind === TemplateCompilerHookOpenReasonKind.RegistryDependency
    )
  );
  const entries = [...leafEntries, ...rootEntries];
  return openReasons.length > 0
    ? TemplateCompilerHookSetCandidate.open(entries, openReasons)
    : TemplateCompilerHookSetCandidate.exactList(entries);
}

function componentRegistryHookEntry(
  dependency: ResourceDependencyReference,
  laneOrdinal: number,
  sourceOrdinal: number,
  hookKind: TemplateCompilerHookKind,
): TemplateCompilerHookEntry {
  return new TemplateCompilerHookEntry(
    TemplateCompilerHookLane.Leaf,
    laneOrdinal,
    sourceOrdinal,
    hookKind,
    new TemplateCompilerHookEntryCause(
      TemplateCompilerHookEntryCauseKind.RegistryDependency,
      null,
      dependency.identityHandle,
      null,
      [
        dependency.registryKind ?? '',
        dependency.moduleKey ?? '',
        dependency.localName ?? '',
        dependency.keyName ?? '',
      ].join('\0'),
    ),
    new TemplateCompilerHookProviderAuthority(
      hookKind === TemplateCompilerHookKind.CssModules
        ? TemplateCompilerHookProviderResolutionKind.Value
        : TemplateCompilerHookProviderResolutionKind.Open,
      hookKind === TemplateCompilerHookKind.CssModules
        ? null
        : 'Component hook provider construction has not been executed in the component leaf container.',
    ),
    new TemplateCompilerHookCallableAuthority(
      hookKind === TemplateCompilerHookKind.CssModules
        ? TemplateCompilerHookCallableAuthorityKind.BuiltIn
        : TemplateCompilerHookCallableAuthorityKind.Open,
      dependency.identityHandle,
      null,
      null,
      hookKind === TemplateCompilerHookKind.CssModules
        ? null
        : 'Component hook membership is known, but receiver-bearing callable execution is not yet available.',
    ),
  );
}

function sameTemplateCompilerHookEntry(
  left: TemplateCompilerHookEntry,
  right: TemplateCompilerHookEntry,
): boolean {
  return left.lane === right.lane
    && left.laneOrdinal === right.laneOrdinal
    && left.sourceOrdinal === right.sourceOrdinal
    && left.hookKind === right.hookKind
    && left.cause.causeKind === right.cause.causeKind
    && left.cause.productHandle === right.cause.productHandle
    && left.cause.identityHandle === right.cause.identityHandle
    && left.cause.sourceAddressHandle === right.cause.sourceAddressHandle
    && left.cause.registryEffectKey === right.cause.registryEffectKey
    && left.provider.resolutionKind === right.provider.resolutionKind
    && left.provider.reason === right.provider.reason
    && sameArrays(left.provider.openSeamHandles, right.provider.openSeamHandles, (a, b) => a === b)
    && left.callable.authorityKind === right.callable.authorityKind
    && left.callable.identityHandle === right.callable.identityHandle
    && left.callable.sourceAddressHandle === right.callable.sourceAddressHandle
    && left.callable.callableSlotKey === right.callable.callableSlotKey
    && left.callable.reason === right.callable.reason
    && sameArrays(left.callable.openSeamHandles, right.callable.openSeamHandles, (a, b) => a === b)
    && sameCssClassMappingReference(left.cssClassMapping, right.cssClassMapping);
}

function sameCssClassMappingReference(
  left: CssClassMappingAuthorityReference | null,
  right: CssClassMappingAuthorityReference | null,
): boolean {
  return left === right
    || left != null
      && right != null
      && left.productHandle === right.productHandle
      && left.identityHandle === right.identityHandle
      && left.sourceAddressHandle === right.sourceAddressHandle;
}

function sameTemplateCompilerHookOpenReason(
  left: TemplateCompilerHookOpenReason,
  right: TemplateCompilerHookOpenReason,
): boolean {
  return left.reasonKind === right.reasonKind
    && left.lane === right.lane
    && left.summary === right.summary
    && left.sourceAddressHandle === right.sourceAddressHandle
    && sameArrays(left.openSeamHandles, right.openSeamHandles, (a, b) => a === b);
}

function providerSetState(
  membershipState: TemplateCompilerHookMembershipState,
  entries: readonly TemplateCompilerHookEntry[],
): TemplateCompilerHookProviderSetState {
  if (membershipState === TemplateCompilerHookMembershipState.Open) {
    return TemplateCompilerHookProviderSetState.Open;
  }
  const boundary = firstProviderBoundaryOrdinal(entries);
  return boundary == null
    ? TemplateCompilerHookProviderSetState.Complete
    : entries[boundary]!.provider.resolutionKind === TemplateCompilerHookProviderResolutionKind.Abrupt
      ? TemplateCompilerHookProviderSetState.Abrupt
      : TemplateCompilerHookProviderSetState.Open;
}

function firstProviderBoundaryOrdinal(
  entries: readonly TemplateCompilerHookEntry[],
): number | null {
  const ordinal = entries.findIndex((entry) =>
    entry.provider.resolutionKind !== TemplateCompilerHookProviderResolutionKind.Value
  );
  return ordinal < 0 ? null : ordinal;
}

function sameArrays<T>(
  left: readonly T[],
  right: readonly T[],
  same: (left: T, right: T) => boolean,
): boolean {
  return left.length === right.length && left.every((value, index) => same(value, right[index]!));
}
