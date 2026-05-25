/** Receiver categories that ProxyObservable collection method policy can distinguish statically. */
export const enum RuntimeProxyCollectionReceiverKind {
  /** TypeChecker-visible Array or tuple receiver. */
  Array = 'array',
  /** TypeChecker-visible Map receiver. */
  Map = 'map',
  /** TypeChecker-visible Set receiver. */
  Set = 'set',
  /** Receiver shape is not closed, so policy must stay permissive over the modeled method union. */
  Unknown = 'unknown',
  /** Receiver shape is known and no modeled collection policy applies. */
  None = 'none',
}

export type RuntimeProxyConcreteCollectionReceiverKind = Exclude<
  RuntimeProxyCollectionReceiverKind,
  RuntimeProxyCollectionReceiverKind.Unknown | RuntimeProxyCollectionReceiverKind.None
>;

/** ProxyObservable collection method policy lanes, matching wrapper behavior rather than JavaScript method names alone. */
export const enum RuntimeProxyCollectionMethodSet {
  /** Wrapper methods that call observeCollection(...). */
  Observed = 'observedMethods',
  /** Wrapper methods intercepted by ProxyObservable even when they do not collect the collection. */
  Intercepted = 'interceptedMethods',
  /** Wrapper methods whose return value can remain a proxy-observable carrier. */
  WrappedResult = 'wrappedResultMethods',
}

export interface RuntimeProxyCollectionMethodPolicy {
  readonly observedMethods: ReadonlySet<string>;
  readonly interceptedMethods: ReadonlySet<string>;
  readonly wrappedResultMethods: ReadonlySet<string>;
}

/** Pseudo-method name used for framework ProxyObservable collection reads through Symbol.iterator. */
export const runtimeProxyIteratorMethodName = 'Symbol.iterator';

const runtimeProxyObservedArrayMethods: ReadonlySet<string> = new Set([
  runtimeProxyIteratorMethodName,
  'map',
  'every',
  'filter',
  'includes',
  'indexOf',
  'lastIndexOf',
  'find',
  'findIndex',
  'flat',
  'flatMap',
  'join',
  'reduce',
  'reduceRight',
  'slice',
  'some',
  'sort',
  'keys',
  'values',
  'entries',
]);

const runtimeProxyObservedMapMethods: ReadonlySet<string> = new Set([
  runtimeProxyIteratorMethodName,
  'forEach',
  'has',
  'get',
  'keys',
  'values',
  'entries',
]);

const runtimeProxyObservedSetMethods: ReadonlySet<string> = new Set([
  runtimeProxyIteratorMethodName,
  'forEach',
  'has',
  'keys',
  'values',
  'entries',
]);

/** ProxyObservable wrapper method policy keyed by the runtime collection receiver brand. */
export const runtimeProxyCollectionMethodPolicies: Readonly<Record<
  RuntimeProxyConcreteCollectionReceiverKind,
  RuntimeProxyCollectionMethodPolicy
>> = {
  [RuntimeProxyCollectionReceiverKind.Array]: {
    observedMethods: runtimeProxyObservedArrayMethods,
    interceptedMethods: new Set([
      ...runtimeProxyObservedArrayMethods,
      'push',
      'pop',
      'reverse',
      'shift',
      'unshift',
      'splice',
    ]),
    wrappedResultMethods: new Set([
      'map',
      'filter',
      'find',
      'flat',
      'flatMap',
      'pop',
      'reduce',
      'reduceRight',
      'reverse',
      'shift',
      'slice',
      'sort',
      'splice',
    ]),
  },
  [RuntimeProxyCollectionReceiverKind.Map]: {
    observedMethods: runtimeProxyObservedMapMethods,
    interceptedMethods: new Set([
      ...runtimeProxyObservedMapMethods,
      'clear',
      'delete',
      'set',
    ]),
    wrappedResultMethods: new Set([
      'get',
      'set',
    ]),
  },
  [RuntimeProxyCollectionReceiverKind.Set]: {
    observedMethods: runtimeProxyObservedSetMethods,
    interceptedMethods: new Set([
      ...runtimeProxyObservedSetMethods,
      'clear',
      'delete',
      'add',
    ]),
    wrappedResultMethods: new Set([
      'add',
    ]),
  },
};

/** Union of ProxyObservable methods that collect a collection read. */
export const runtimeProxyObservedCollectionMethods = runtimeProxyCollectionMethodUnion(
  RuntimeProxyCollectionMethodSet.Observed,
);

/** Union of ProxyObservable methods intercepted by wrapper policy. */
export const runtimeProxyInterceptedCollectionMethods = runtimeProxyCollectionMethodUnion(
  RuntimeProxyCollectionMethodSet.Intercepted,
);

/** Union of ProxyObservable methods whose return value may stay proxy-observable. */
export const runtimeProxyWrappedCallResultMethods = runtimeProxyCollectionMethodUnion(
  RuntimeProxyCollectionMethodSet.WrappedResult,
);

export interface RuntimeProxyCollectionCallbackObservationPolicy {
  readonly visitCallback: boolean;
  readonly wrappedParameterIndexes: readonly number[];
}

export function runtimeProxyCollectionMethodsForSet(
  methodSet: RuntimeProxyCollectionMethodSet,
): ReadonlySet<string> {
  switch (methodSet) {
    case RuntimeProxyCollectionMethodSet.Observed:
      return runtimeProxyObservedCollectionMethods;
    case RuntimeProxyCollectionMethodSet.Intercepted:
      return runtimeProxyInterceptedCollectionMethods;
    case RuntimeProxyCollectionMethodSet.WrappedResult:
      return runtimeProxyWrappedCallResultMethods;
  }
}

export function runtimeProxyCollectionReceiverCanUseMethod(
  kind: RuntimeProxyCollectionReceiverKind,
  methodName: string,
  methodSet: RuntimeProxyCollectionMethodSet,
): boolean {
  if (kind === RuntimeProxyCollectionReceiverKind.Unknown) {
    return runtimeProxyCollectionMethodsForSet(methodSet).has(methodName);
  }
  if (kind === RuntimeProxyCollectionReceiverKind.None) {
    return false;
  }
  return runtimeProxyCollectionMethodPolicies[kind][methodSet].has(methodName);
}

export function runtimeProxyCollectionCallbackObservationPolicy(
  methodName: string,
  receiverKind: RuntimeProxyCollectionReceiverKind,
): RuntimeProxyCollectionCallbackObservationPolicy {
  switch (methodName) {
    case 'map':
    case 'every':
    case 'filter':
    case 'find':
    case 'findIndex':
    case 'flatMap':
    case 'some':
      return { visitCallback: true, wrappedParameterIndexes: [0] };
    case 'reduce':
    case 'reduceRight':
      return { visitCallback: true, wrappedParameterIndexes: [1] };
    case 'sort':
      return { visitCallback: true, wrappedParameterIndexes: [] };
    case 'forEach': {
      const wrappedParameterIndexes = receiverKind === RuntimeProxyCollectionReceiverKind.Map
        || receiverKind === RuntimeProxyCollectionReceiverKind.Set
        || receiverKind === RuntimeProxyCollectionReceiverKind.Unknown
        ? [0, 1]
        : [0];
      return { visitCallback: true, wrappedParameterIndexes };
    }
    default:
      return { visitCallback: false, wrappedParameterIndexes: [] };
  }
}

function runtimeProxyCollectionMethodUnion(
  methodSet: RuntimeProxyCollectionMethodSet,
): ReadonlySet<string> {
  const methods = new Set<string>();
  for (const policy of Object.values(runtimeProxyCollectionMethodPolicies)) {
    for (const methodName of policy[methodSet]) {
      methods.add(methodName);
    }
  }
  return methods;
}
