/** Aurelia component view-model lifecycle hook names discovered by runtime-html Controller. */
export enum ComponentLifecycleHookName {
  /** Compile-time definition hook for custom elements. */
  Define = 'define',
  /** Pre-node-creation custom-element hydration hook. */
  Hydrating = 'hydrating',
  /** Post-node-creation custom-element hydration hook. */
  Hydrated = 'hydrated',
  /** Post-render custom-element/custom-attribute creation hook. */
  Created = 'created',
  /** Activation hook invoked before bindings are bound. */
  Binding = 'binding',
  /** Activation hook invoked after bindings are bound. */
  Bound = 'bound',
  /** Activation hook invoked before nodes attach. */
  Attaching = 'attaching',
  /** Activation hook invoked after nodes attach. */
  Attached = 'attached',
  /** Deactivation hook invoked before nodes detach. */
  Detaching = 'detaching',
  /** Deactivation hook invoked as bindings are removed. */
  Unbinding = 'unbinding',
  /** Disposal hook invoked when the controller is disposed. */
  Dispose = 'dispose',
  /** Traversal hook for components that own additional controllers. */
  Accept = 'accept',
}

/** Stable value list for component lifecycle hook source requests. */
export const COMPONENT_LIFECYCLE_HOOK_NAMES = [
  ComponentLifecycleHookName.Define,
  ComponentLifecycleHookName.Hydrating,
  ComponentLifecycleHookName.Hydrated,
  ComponentLifecycleHookName.Created,
  ComponentLifecycleHookName.Binding,
  ComponentLifecycleHookName.Bound,
  ComponentLifecycleHookName.Attaching,
  ComponentLifecycleHookName.Attached,
  ComponentLifecycleHookName.Detaching,
  ComponentLifecycleHookName.Unbinding,
  ComponentLifecycleHookName.Dispose,
  ComponentLifecycleHookName.Accept,
] as const;

/** Source request for one component lifecycle method member. */
export interface ComponentLifecycleHookMethodSourceRequest {
  readonly hookName: ComponentLifecycleHookName;
  readonly bodyStatements?: string | null;
  readonly asyncKeyword?: boolean;
  readonly returnType?: string | null;
}

/** Serialize an Aurelia component lifecycle hook method as a TypeScript class member. */
export function componentLifecycleHookMethodSourceText(
  request: ComponentLifecycleHookMethodSourceRequest,
): string {
  const asyncPrefix = request.asyncKeyword === true ? 'async ' : '';
  const returnType = request.returnType?.trim();
  const body = lifecycleHookMethodBodySourceText(request.bodyStatements);
  const methodBody = body.length === 0 ? '' : `\n${body}\n`;
  return returnType == null || returnType.length === 0
    ? `${asyncPrefix}${request.hookName}() {${methodBody}}`
    : `${asyncPrefix}${request.hookName}(): ${returnType} {${methodBody}}`;
}

function lifecycleHookMethodBodySourceText(
  bodyStatements: string | null | undefined,
): string {
  const body = bodyStatements?.trim();
  if (body == null || body.length === 0) {
    return '';
  }
  return body
    .split(/\r?\n/)
    .map((line) => line.length === 0 ? '' : `  ${line}`)
    .join('\n');
}
