import type {
  StaticEvaluationRuntimeHost,
  StaticEvaluationRuntimeHostOperations,
} from './evaluator.js';
import {
  StaticInvocationDispatchKind,
  StaticInvocationNotApplicable,
} from './invocation.js';
import type { EvaluationClassValue, EvaluationFunctionValue, EvaluationValue } from './values.js';

const defaultGraphIsolatedBranchOperations: StaticEvaluationRuntimeHostOperations = {};

/** Canonical host for generic ECMAScript evaluation, including unresolved sibling-branch isolation. */
export const DefaultStaticEvaluationRuntimeHost: StaticEvaluationRuntimeHost = {
  graphIsolatedBranchOperations: defaultGraphIsolatedBranchOperations,
};

/** Unknown dispatch ownership cannot license execution of a possible host placeholder as ordinary source. */
export function isStaticEvaluationCallableExternallyOwned(
  host: StaticEvaluationRuntimeHostOperations,
  value: EvaluationFunctionValue | EvaluationClassValue,
): boolean {
  return host.isCallableExternallyOwned?.(value) ?? host.evaluateInvocation != null;
}

/** A metadata owner must explicitly prove that ordinary snapshot storage can omit its state. */
export function staticEvaluationRuntimeHostCanShareSnapshotValue(
  host: StaticEvaluationRuntimeHostOperations,
  value: EvaluationValue,
): boolean {
  return host.canShareSnapshotValue?.(value) ?? host.transferValueMetadata == null;
}

/** Materialize a complete host permitted inside one graph-isolated unresolved branch. */
export function graphIsolatedStaticEvaluationRuntimeHost(
  host: StaticEvaluationRuntimeHost,
): StaticEvaluationRuntimeHost | null {
  const operations = host.graphIsolatedBranchOperations;
  return operations == null
    ? null
    : {
        ...operations,
        graphIsolatedBranchOperations: operations,
      };
}

/** Layer one invocation dispatcher over an existing static-evaluation runtime host. */
export function delegateStaticEvaluationRuntimeHost(
  baseHost: StaticEvaluationRuntimeHost,
  evaluateInvocation: NonNullable<StaticEvaluationRuntimeHost['evaluateInvocation']>,
  isCallableExternallyOwned?: NonNullable<StaticEvaluationRuntimeHost['isCallableExternallyOwned']>,
): StaticEvaluationRuntimeHost {
  const delegatedInvocation = (
    baseOperations: StaticEvaluationRuntimeHostOperations,
  ): NonNullable<StaticEvaluationRuntimeHostOperations['evaluateInvocation']> =>
    (frame, host) => {
      const result = evaluateInvocation(frame, host);
      return result.kind === StaticInvocationDispatchKind.NotApplicable
        ? baseOperations.evaluateInvocation?.(frame, host) ?? StaticInvocationNotApplicable
        : result;
    };
  const branchOperations = baseHost.graphIsolatedBranchOperations;
  const delegatedOwnership = (
    baseOperations: StaticEvaluationRuntimeHostOperations,
  ): NonNullable<StaticEvaluationRuntimeHostOperations['isCallableExternallyOwned']> =>
    value => isCallableExternallyOwned == null
      || isCallableExternallyOwned(value)
      || isStaticEvaluationCallableExternallyOwned(baseOperations, value);
  return {
    ...baseHost,
    isCallableExternallyOwned: delegatedOwnership(baseHost),
    graphIsolatedBranchOperations: branchOperations == null
      ? undefined
      : {
          ...branchOperations,
          isCallableExternallyOwned: delegatedOwnership(branchOperations),
          evaluateInvocation: delegatedInvocation(branchOperations),
        },
    evaluateInvocation: delegatedInvocation(baseHost),
  };
}
