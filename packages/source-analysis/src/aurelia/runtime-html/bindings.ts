import type {
  ForOfStatement,
  Interpolation,
  IsBindingBehavior,
  IsExpression,
} from '../expression/index.js';
import type { BindingMode } from '../template-compiler/index.js';
import { auLink } from '../au-link.js';

export const RUNTIME_BINDING_KINDS = [
  'attribute',
  'content',
  'interpolation',
  'let',
  'listener',
  'property',
  'ref',
  'spread',
  'spread-value',
] as const;

export type RuntimeBindingKind = typeof RUNTIME_BINDING_KINDS[number];

export type RuntimePropertyExpression = IsBindingBehavior | ForOfStatement;
export type RuntimeContentExpression = IsExpression;

export class RuntimeListenerBindingOptions {
  constructor(
    readonly prevent: boolean,
    readonly capture: boolean = false,
    readonly onError: 'dispatch-au-event-error' | 'custom' | null = 'dispatch-au-event-error',
  ) {}
}

@auLink('runtime-html:AttributeBinding')
export class AttributeBinding {
  readonly kind = 'attribute' as const;
  readonly boundFn = false as const;

  constructor(
    readonly ast: RuntimePropertyExpression,
    readonly target: object | null,
    readonly targetAttribute: string,
    readonly targetProperty: string,
    readonly mode: BindingMode,
    readonly strict: boolean,
  ) {}
}

@auLink('runtime-html:ContentBinding')
export class ContentBinding {
  readonly kind = 'content' as const;
  readonly boundFn = false as const;

  constructor(
    readonly ast: RuntimeContentExpression,
    readonly target: object | null,
    readonly strict: boolean,
  ) {}
}

@auLink('runtime-html:InterpolationBinding')
export class InterpolationBinding {
  readonly kind = 'interpolation' as const;
  readonly boundFn = false as const;

  constructor(
    readonly ast: Interpolation,
    readonly target: object | null,
    readonly targetProperty: string,
    readonly mode: BindingMode,
    readonly strict: boolean,
    readonly partCount: number | null = null,
  ) {}
}

@auLink('runtime-html:LetBinding')
export class LetBinding {
  readonly kind = 'let' as const;
  readonly boundFn = false as const;

  constructor(
    readonly ast: RuntimeContentExpression,
    readonly targetProperty: string,
    readonly toBindingContext: boolean,
    readonly strict: boolean,
  ) {}
}

@auLink('runtime-html:ListenerBinding')
export class ListenerBinding {
  readonly kind = 'listener' as const;
  readonly boundFn = true as const;

  constructor(
    readonly ast: IsBindingBehavior,
    readonly target: object | null,
    readonly targetEvent: string,
    readonly options: RuntimeListenerBindingOptions = new RuntimeListenerBindingOptions(false),
    readonly modifier: string | null = null,
    readonly strict: boolean = false,
  ) {}
}

@auLink('runtime-html:PropertyBinding')
export class PropertyBinding {
  readonly kind = 'property' as const;
  readonly boundFn = false as const;

  constructor(
    readonly ast: RuntimePropertyExpression,
    readonly target: object | null,
    readonly targetProperty: string,
    readonly mode: BindingMode,
    readonly strict: boolean,
  ) {}
}

@auLink('runtime-html:RefBinding')
export class RefBinding {
  readonly kind = 'ref' as const;
  readonly boundFn = false as const;

  constructor(
    readonly ast: IsBindingBehavior,
    readonly target: object | null,
    readonly strict: boolean,
  ) {}
}

@auLink('runtime-html:SpreadBinding')
export class SpreadBinding {
  readonly kind = 'spread' as const;
  readonly controllerSurrogate = true as const;

  constructor(
    readonly hydrationContext: object | null,
    readonly innerBindings: readonly RuntimeBinding[] = [],
  ) {}
}

export class SpreadValueBinding {
  readonly kind = 'spread-value' as const;
  readonly boundFn = false as const;

  constructor(
    readonly target: object | null,
    readonly targetKeys: readonly string[],
    readonly ast: IsBindingBehavior,
    readonly strict: boolean,
  ) {}
}

export type RuntimeBinding =
  | AttributeBinding
  | ContentBinding
  | InterpolationBinding
  | LetBinding
  | ListenerBinding
  | PropertyBinding
  | RefBinding
  | SpreadBinding
  | SpreadValueBinding;
