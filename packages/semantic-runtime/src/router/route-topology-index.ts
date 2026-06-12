import type { IdentityHandle } from '../kernel/handles.js';
import type {
  RouteConfigContextModel,
  RouteConfigModel,
  RouteContextModel,
} from './model.js';
import type { RouteConfigContextMaterializationProjectResult } from './route-context-materialization.js';
import type { RouteRuntimeTopologyProjectResult } from './route-runtime-topology.js';

export function routeConfigIndex(
  result: RouteConfigContextMaterializationProjectResult,
): ReadonlyMap<IdentityHandle, RouteConfigModel> {
  return new Map(result.readRouteConfigs().map((routeConfig) => [routeConfig.identityHandle, routeConfig] as const));
}

export function routeConfigContextIndex(
  result: RouteConfigContextMaterializationProjectResult,
): ReadonlyMap<IdentityHandle, RouteConfigContextModel> {
  return new Map(result.readRouteConfigContexts().map((context) => [context.identityHandle, context] as const));
}

export function routeConfigByContextIdentity(
  result: RouteConfigContextMaterializationProjectResult,
): ReadonlyMap<IdentityHandle, RouteConfigModel> {
  const configs = routeConfigIndex(result);
  return new Map(result.readRouteConfigContexts().flatMap((context) => {
    const routeConfig = routeConfigForContextOrNull(context, configs);
    return routeConfig == null
      ? []
      : [[context.identityHandle, routeConfig] as const];
  }));
}

export function routeConfigContextsByComponentDefinition(
  result: RouteConfigContextMaterializationProjectResult,
): ReadonlyMap<IdentityHandle, readonly RouteConfigContextModel[]> {
  const configs = routeConfigIndex(result);
  const contextsByDefinition = new Map<IdentityHandle, RouteConfigContextModel[]>();
  for (const context of result.readRouteConfigContexts()) {
    const routeConfig = routeConfigForContextOrNull(context, configs);
    const definitionIdentity = routeConfig?.component?.resolvedIdentityHandle ?? null;
    if (definitionIdentity != null) {
      const existing = contextsByDefinition.get(definitionIdentity);
      if (existing == null) {
        contextsByDefinition.set(definitionIdentity, [context]);
      } else {
        existing.push(context);
      }
    }
  }
  return contextsByDefinition;
}

export function routeRuntimeContextsByComponentDefinition(
  routeConfigContexts: RouteConfigContextMaterializationProjectResult,
  routeRuntime: RouteRuntimeTopologyProjectResult,
): ReadonlyMap<IdentityHandle, readonly RouteContextModel[]> {
  const routeConfigContextsByDefinition = routeConfigContextsByComponentDefinition(routeConfigContexts);
  const routeContextsByDefinition = new Map<IdentityHandle, RouteContextModel[]>();
  for (const [definitionIdentity, contexts] of routeConfigContextsByDefinition) {
    const routeContexts = contexts.flatMap((context) =>
      routeRuntime.routeContextsForRouteConfigContext(context.identityHandle)
    );
    if (routeContexts.length > 0) {
      routeContextsByDefinition.set(definitionIdentity, routeContexts);
    }
  }
  return routeContextsByDefinition;
}

export function requiredRouteConfigForContext(
  context: RouteConfigContextModel,
  configs: ReadonlyMap<IdentityHandle, RouteConfigModel>,
): RouteConfigModel {
  const routeConfig = routeConfigForContextOrNull(context, configs);
  if (routeConfig == null) {
    const identityHandle = context.config.identityHandle;
    if (identityHandle == null) {
      throw new Error(`RouteConfigContext '${context.identityHandle}' is missing its RouteConfig identity reference.`);
    }
    throw new Error(`RouteConfigContext '${context.identityHandle}' references unmaterialized RouteConfig '${identityHandle}'.`);
  }
  return routeConfig;
}

function routeConfigForContextOrNull(
  context: RouteConfigContextModel,
  configs: ReadonlyMap<IdentityHandle, RouteConfigModel>,
): RouteConfigModel | null {
  const identityHandle = context.config.identityHandle;
  return identityHandle == null
    ? null
    : configs.get(identityHandle) ?? null;
}
