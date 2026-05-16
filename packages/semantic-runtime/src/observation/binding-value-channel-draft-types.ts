import type { BindingScope } from '../configuration/scope.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { OpenSeamReasonKind } from '../kernel/open-seam.js';
import type { CheckerExpressionTypeEvaluator } from '../type-system/expression-type-evaluator.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import type { RuntimeExpressionBinding } from './runtime-binding-expression.js';
import type {
  RuntimeBindingValueChannelAuthority,
  RuntimeBindingValueChannelKind,
} from './runtime-binding-observation.js';

export type RuntimeValueChannelBinding = RuntimeExpressionBinding;

export type RuntimeBindingValueChannelDraft = {
  readonly channelKind: RuntimeBindingValueChannelKind;
  readonly authority: RuntimeBindingValueChannelAuthority;
  readonly runtimeValueType: CheckerTypeReference | null;
  readonly valueDomain: readonly string[];
  readonly isCollection: boolean | null;
  readonly usesCustomMatcher?: boolean;
  readonly openReason: string | null;
  readonly openReasonKinds?: readonly OpenSeamReasonKind[];
};

export interface BindingValueChannelDraftContext {
  readonly input: {
    readonly runtimeBindings: RuntimeRenderingEmission;
  };
  readonly instructionScopes: ReadonlyMap<ProductHandle, BindingScope>;
  readonly evaluator: CheckerExpressionTypeEvaluator;
}

export type BindingSourceTypeReader = () => CheckerTypeReference | null;

export type CheckedSourceShape = {
  readonly kind: 'boolean' | 'collection' | 'map' | 'other' | 'open';
  readonly elementType?: CheckerTypeReference | null;
  readonly mapValueType?: CheckerTypeReference | null;
};

export type SelectMultipleMode =
  | {
    readonly kind: 'single' | 'multiple';
  }
  | {
    readonly kind: 'dynamic';
  }
  | {
    readonly kind: 'open';
    readonly openReason: string;
    readonly openReasonKinds: readonly OpenSeamReasonKind[];
  };

export type BindingValueExpression = {
  readonly valueType: CheckerTypeReference | null;
  readonly valueDomain: readonly string[];
};
