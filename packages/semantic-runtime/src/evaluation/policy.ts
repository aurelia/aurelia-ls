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

export class StaticEvaluationPolicy {
  constructor(
    readonly expressionStatementPolicies: readonly StaticEvaluationExpressionStatementPolicy[] = [],
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
