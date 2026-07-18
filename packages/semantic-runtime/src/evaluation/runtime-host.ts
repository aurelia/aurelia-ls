import type { StaticEvaluationRuntimeHost } from './evaluator.js';

/** Layer one call-expression interpreter over an existing static-evaluation runtime host. */
export function delegateStaticEvaluationRuntimeHost(
  baseHost: StaticEvaluationRuntimeHost,
  evaluateCallExpression: NonNullable<StaticEvaluationRuntimeHost['evaluateCallExpression']>,
): StaticEvaluationRuntimeHost {
  return {
    transferValueMetadata: (source, target, transfer) =>
      baseHost.transferValueMetadata?.(source, target, transfer),
    resolveIdentifier: (identifier, environment, moduleKey) =>
      baseHost.resolveIdentifier?.(identifier, environment, moduleKey) ?? null,
    resolveCommonJsRequire: (moduleKey, moduleSpecifier, node) =>
      baseHost.resolveCommonJsRequire?.(moduleKey, moduleSpecifier, node) ?? null,
    resolveDynamicImport: (moduleKey, moduleSpecifier, node) =>
      baseHost.resolveDynamicImport?.(moduleKey, moduleSpecifier, node) ?? null,
    evaluateCallExpression: (call, environment, moduleKey, depth, host) =>
      evaluateCallExpression(call, environment, moduleKey, depth, host)
        ?? baseHost.evaluateCallExpression?.(call, environment, moduleKey, depth, host)
        ?? null,
    evaluateNewExpression: (expression, environment, moduleKey, depth, host) =>
      baseHost.evaluateNewExpression?.(expression, environment, moduleKey, depth, host) ?? null,
  };
}
