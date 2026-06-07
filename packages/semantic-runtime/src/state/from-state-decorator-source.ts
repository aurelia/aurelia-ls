import { singleQuotedTypeScriptStringLiteralText } from '../source-plan/source-template.js';

/** Source request for an authored @aurelia/state `@fromState(...)` decorator. */
export interface FromStateDecoratorSourceRequest {
  /** Optional named store; omit or pass null for the default store. */
  readonly storeName?: string | null;
  /** Authored TypeScript selector callback, such as `state => state.items`. */
  readonly selectorExpression: string;
}

/** Serialize the framework-shaped `@fromState(...)` decorator call. */
export function fromStateDecoratorSourceText(
  request: FromStateDecoratorSourceRequest,
): string {
  return request.storeName == null
    ? `@fromState(${request.selectorExpression})`
    : `@fromState(${singleQuotedTypeScriptStringLiteralText(request.storeName)}, ${request.selectorExpression})`;
}
