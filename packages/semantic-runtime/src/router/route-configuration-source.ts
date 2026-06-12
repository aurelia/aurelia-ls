import { singleQuotedTypeScriptStringLiteralText } from '../source-plan/source-template.js';

/** Authored source model for one object-literal route config. */
export interface RouterRouteConfigSource {
  readonly id?: string;
  readonly path: string;
  readonly redirectTo?: string;
  readonly componentIdentifier?: string;
  readonly title?: string;
  readonly viewport?: string;
  readonly routes?: readonly RouterRouteConfigSource[];
}

/** Authored source model for a root `@route(...)` decorator. */
export interface RouterRouteDecoratorSourceRequest {
  readonly title?: string;
  readonly routes: readonly RouterRouteConfigSource[];
}

/** Authored source request for a caller-supplied route configuration expression. */
export interface RouterRouteDecoratorExpressionSourceRequest {
  /** TypeScript expression accepted by Aurelia's `@route(...)` decorator. */
  readonly routeConfigurationExpression: string;
}

/** Serialize an Aurelia router `@route(...)` decorator from route-config source models. */
export function routerRouteDecoratorSourceText(
  request: RouterRouteDecoratorSourceRequest,
): string {
  return `@route(${routerRouteConfigurationObjectExpressionSourceText(request)})`;
}

/** Serialize route-config source models as the object expression accepted by `@route(...)`. */
export function routerRouteConfigurationObjectExpressionSourceText(
  request: RouterRouteDecoratorSourceRequest,
): string {
  return `{
${routeDecoratorFields(request).map((field) => `  ${field},`).join('\n')}
}`;
}

/** Serialize an Aurelia router `@route(...)` decorator from a caller-owned expression. */
export function routerRouteDecoratorExpressionSourceText(
  request: RouterRouteDecoratorExpressionSourceRequest,
): string {
  return `@route(${request.routeConfigurationExpression.trim()})`;
}

function routeDecoratorFields(
  request: RouterRouteDecoratorSourceRequest,
): readonly string[] {
  return [
    ...(request.title == null ? [] : [`title: ${singleQuotedTypeScriptStringLiteralText(request.title)}`]),
    `routes: ${routerRouteConfigArraySourceText(request.routes, '    ', '  ')}`,
  ];
}

function routerRouteConfigArraySourceText(
  routes: readonly RouterRouteConfigSource[],
  routeIndent: string,
  closingIndent: string,
): string {
  if (routes.length === 0) {
    return '[]';
  }
  return `[
${routes.map((route) => routerRouteConfigObjectLiteralSourceText(route, routeIndent)).join(',\n')},
${closingIndent}]`;
}

function routerRouteConfigObjectLiteralSourceText(
  route: RouterRouteConfigSource,
  indent: string,
): string {
  const fields = routerRouteConfigFields(route, indent);
  return `${indent}{
${fields.map((field) => `${indent}  ${field},`).join('\n')}
${indent}}`;
}

function routerRouteConfigFields(
  route: RouterRouteConfigSource,
  indent: string,
): readonly string[] {
  const childIndent = `${indent}    `;
  return [
    ...(route.id == null ? [] : [`id: ${singleQuotedTypeScriptStringLiteralText(route.id)}`]),
    `path: ${singleQuotedTypeScriptStringLiteralText(route.path)}`,
    ...(route.redirectTo == null ? [] : [`redirectTo: ${singleQuotedTypeScriptStringLiteralText(route.redirectTo)}`]),
    ...(route.componentIdentifier == null ? [] : [`component: ${route.componentIdentifier}`]),
    ...(route.title == null ? [] : [`title: ${singleQuotedTypeScriptStringLiteralText(route.title)}`]),
    ...(route.viewport == null ? [] : [`viewport: ${singleQuotedTypeScriptStringLiteralText(route.viewport)}`]),
    ...(route.routes == null || route.routes.length === 0
      ? []
      : [`routes: ${routerRouteConfigArraySourceText(route.routes, childIndent, `${indent}  `)}`]),
  ];
}
