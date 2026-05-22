import type { OpenSeamReasonKind } from '../kernel/open-seam.js';
import type { CheckerExpressionTypeEvaluator } from '../type-system/expression-type-evaluator.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import type { RuntimeControllerBindEmission } from '../template/runtime-controller-bind-materializer.js';
import type { RuntimeExpressionBinding } from './runtime-binding-expression.js';
import type { RuntimeInstructionScopeLookup } from './runtime-binding-expression.js';
import type {
  RuntimeBindingValueChannelAuthority,
  RuntimeBindingValueChannelKind,
  RuntimeBindingValueChannelCouplingKind,
  RuntimeBindingPrimitiveValue,
} from './runtime-binding-observation.js';

export type RuntimeValueChannelBinding = RuntimeExpressionBinding;

export type RuntimeBindingValueChannelDraft = {
  readonly channelKind: RuntimeBindingValueChannelKind;
  readonly authority: RuntimeBindingValueChannelAuthority;
  readonly runtimeValueType: CheckerTypeReference | null;
  readonly valueDomain: readonly string[];
  readonly primitiveValueDomain?: readonly RuntimeBindingPrimitiveValue[];
  readonly isCollection: boolean | null;
  readonly usesCustomMatcher?: boolean;
  readonly observerCouplings?: readonly RuntimeBindingValueChannelCouplingKind[];
  readonly openReason: string | null;
  readonly openReasonKinds?: readonly OpenSeamReasonKind[];
};

export interface BindingValueChannelDraftContext {
  readonly input: {
    readonly runtimeBindings: RuntimeRenderingEmission;
    readonly controllerBind: RuntimeControllerBindEmission;
  };
  readonly instructionScopes: RuntimeInstructionScopeLookup;
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
  readonly primitiveValueDomain: readonly RuntimeBindingPrimitiveValue[];
};
