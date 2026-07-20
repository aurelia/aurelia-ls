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
  return {
    evaluationValueGraph: baseHost.evaluationValueGraph,
    transferValueMetadata: (source, target, transfer) =>
      baseHost.transferValueMetadata?.(source, target, transfer),
    resolveIdentifier: (identifier, environment, moduleKey) =>
      baseHost.resolveIdentifier?.(identifier, environment, moduleKey) ?? null,
    resolveCommonJsRequire: (moduleKey, moduleSpecifier, node) =>
      baseHost.resolveCommonJsRequire?.(moduleKey, moduleSpecifier, node) ?? null,
    resolveDynamicImport: (moduleKey, moduleSpecifier, node) =>
      baseHost.resolveDynamicImport?.(moduleKey, moduleSpecifier, node) ?? null,
    evaluateInvocation: (frame, host) => {
      const result = evaluateInvocation(frame, host);
      return result.kind === StaticInvocationDispatchKind.NotApplicable
        ? baseHost.evaluateInvocation?.(frame, host) ?? StaticInvocationNotApplicable
        : result;
    },
  };
}
