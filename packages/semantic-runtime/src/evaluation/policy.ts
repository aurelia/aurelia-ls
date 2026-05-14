import type ts from 'typescript';
import type { ModuleEnvironmentRecord } from './environment.js';

export const enum StaticEvaluationExpressionStatementDisposition {
  Evaluate = 'evaluate',
  ExternallyOwned = 'externally-owned',
}

export interface StaticEvaluationExpressionStatementPolicyInput {
  readonly expression: ts.Expression;
  readonly environment: ModuleEnvironmentRecord;
  readonly moduleKey: string;
}

export type StaticEvaluationExpressionStatementPolicy = (
  input: StaticEvaluationExpressionStatementPolicyInput,
) => StaticEvaluationExpressionStatementDisposition | null;

export interface StaticEvaluationGuardrails {
  /** Maximum recursive expression interpretation depth before an expression becomes an open seam. */
  readonly maxExpressionDepth: number;
  /** Maximum statement executions in one source-file evaluation before the module body is stopped. */
  readonly maxStatements: number;
  /** Maximum concrete loop iterations before a loop is represented as an open dynamic shape. */
  readonly maxLoopIterations: number;
  /** Maximum callback executions a collection intrinsic may spend before returning an imprecise value. */
  readonly maxIntrinsicCallbackEvaluations: number;
}

export const DefaultStaticEvaluationGuardrails: StaticEvaluationGuardrails = {
  maxExpressionDepth: 80,
  maxStatements: 5000,
  maxLoopIterations: 200,
  maxIntrinsicCallbackEvaluations: 500,
};

export class StaticEvaluationPolicy {
  constructor(
    readonly expressionStatementPolicies: readonly StaticEvaluationExpressionStatementPolicy[] = [],
    readonly guardrails: StaticEvaluationGuardrails = DefaultStaticEvaluationGuardrails,
  ) {}

  dispositionForExpressionStatement(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
  ): StaticEvaluationExpressionStatementDisposition {
    const input: StaticEvaluationExpressionStatementPolicyInput = { expression, environment, moduleKey };
    for (const policy of this.expressionStatementPolicies) {
      const disposition = policy(input);
      if (disposition != null) {
        return disposition;
      }
    }
    return StaticEvaluationExpressionStatementDisposition.Evaluate;
  }
}

export const DefaultStaticEvaluationPolicy = new StaticEvaluationPolicy();
