import type {
  StaticEvaluationRuntimeHost,
  StaticEvaluationRuntimeHostOperations,
} from './evaluator.js';
import {
  StaticInvocationDispatchKind,
  StaticInvocationNotApplicable,
} from './invocation.js';

const defaultGraphIsolatedBranchOperations: StaticEvaluationRuntimeHostOperations = {};

/** Canonical host for generic ECMAScript evaluation, including unresolved sibling-branch isolation. */
export const DefaultStaticEvaluationRuntimeHost: StaticEvaluationRuntimeHost = {
  graphIsolatedBranchOperations: defaultGraphIsolatedBranchOperations,
};

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
): StaticEvaluationRuntimeHost {
  const delegatedInvocation = (
    baseEvaluateInvocation: StaticEvaluationRuntimeHostOperations['evaluateInvocation'],
  ): NonNullable<StaticEvaluationRuntimeHostOperations['evaluateInvocation']> =>
    (frame, host) => {
      const result = evaluateInvocation(frame, host);
      return result.kind === StaticInvocationDispatchKind.NotApplicable
        ? baseEvaluateInvocation?.(frame, host) ?? StaticInvocationNotApplicable
        : result;
    };
  const branchOperations = baseHost.graphIsolatedBranchOperations;
  return {
    ...baseHost,
    graphIsolatedBranchOperations: branchOperations == null
      ? undefined
      : {
          ...branchOperations,
          evaluateInvocation: delegatedInvocation(branchOperations.evaluateInvocation),
        },
    evaluateInvocation: delegatedInvocation(baseHost.evaluateInvocation),
  };
}
