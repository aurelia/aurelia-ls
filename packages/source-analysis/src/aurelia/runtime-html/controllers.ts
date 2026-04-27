
export const RUNTIME_CONTROLLER_KINDS = [
  'synthetic-view',
  'custom-attribute',
  'dry-custom-element',
  'contextual-custom-element',
  'compiled-custom-element',
  'custom-element',
] as const;

export type RuntimeControllerKind = typeof RUNTIME_CONTROLLER_KINDS[number];

export const RUNTIME_CONTROLLER_STATE_KINDS = [
  'none',
  'activating',
  'activated',
  'deactivating',
  'deactivated',
  'released',
  'disposed',
] as const;

export type RuntimeControllerStateKind =
  typeof RUNTIME_CONTROLLER_STATE_KINDS[number];
export class SyntheticViewController {
  readonly kind = 'synthetic-view' as const;
  readonly vmKind = 'synthetic' as const;
  readonly definition = null;
  readonly viewModel = null;
  readonly hydratable = true as const;
  readonly component = false as const;
  readonly mountable = true as const;

  constructor(
    readonly nodes: object | null = null,
    readonly state: RuntimeControllerStateKind = 'none',
  ) {}
}
export class CustomAttributeController {
  readonly kind = 'custom-attribute' as const;
  readonly vmKind = 'customAttribute' as const;
  readonly hydratable = false as const;
  readonly component = true as const;
  readonly mountable = false as const;
  readonly children = null;
  readonly bindings = null;

  constructor(
    readonly definition: object | null = null,
    readonly viewModel: object | null = null,
    readonly state: RuntimeControllerStateKind = 'none',
  ) {}
}
export class DryCustomElementController {
  readonly kind = 'dry-custom-element' as const;
  readonly vmKind = 'customElement' as const;
  readonly hydratable = true as const;
  readonly component = true as const;
  readonly mountable = true as const;
  readonly hasRenderContext = false as const;
  readonly hasCompiledNodes = false as const;

  constructor(
    readonly definition: object | null = null,
    readonly viewModel: object | null = null,
    readonly host: object | null = null,
    readonly state: RuntimeControllerStateKind = 'none',
  ) {}
}
export class ContextualCustomElementController {
  readonly kind = 'contextual-custom-element' as const;
  readonly vmKind = 'customElement' as const;
  readonly hydratable = true as const;
  readonly component = true as const;
  readonly mountable = true as const;
  readonly hasRenderContext = true as const;
  readonly hasCompiledNodes = false as const;

  constructor(
    readonly definition: object | null = null,
    readonly viewModel: object | null = null,
    readonly host: object | null = null,
    readonly state: RuntimeControllerStateKind = 'none',
  ) {}
}
export class CompiledCustomElementController {
  readonly kind = 'compiled-custom-element' as const;
  readonly vmKind = 'customElement' as const;
  readonly hydratable = true as const;
  readonly component = true as const;
  readonly mountable = true as const;
  readonly hasRenderContext = true as const;
  readonly hasCompiledNodes = true as const;

  constructor(
    readonly definition: object | null = null,
    readonly viewModel: object | null = null,
    readonly host: object | null = null,
    readonly nodes: object | null = null,
    readonly state: RuntimeControllerStateKind = 'none',
  ) {}
}
export class CustomElementController {
  readonly kind = 'custom-element' as const;
  readonly vmKind = 'customElement' as const;
  readonly hydratable = true as const;
  readonly component = true as const;
  readonly mountable = true as const;
  readonly hasRenderContext = true as const;
  readonly hasCompiledNodes = true as const;
  readonly hasLifecycleHooks = true as const;

  constructor(
    readonly definition: object | null = null,
    readonly viewModel: object | null = null,
    readonly host: object | null = null,
    readonly nodes: object | null = null,
    readonly state: RuntimeControllerStateKind = 'none',
  ) {}
}

export type RuntimeController =
  | SyntheticViewController
  | CustomAttributeController
  | DryCustomElementController
  | ContextualCustomElementController
  | CompiledCustomElementController
  | CustomElementController;
