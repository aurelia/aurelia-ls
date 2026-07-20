import type { StaticEvaluationRuntimeHost } from './evaluator.js';
import {
  StaticInvocationDispatchKind,
  StaticInvocationNotApplicable,
} from './invocation.js';

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
