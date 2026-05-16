import ts from 'typescript';
import type { ModuleEnvironmentRecord } from '../environment.js';
import type { StaticEvaluationGuardrails } from '../policy.js';
import { EvaluationOpenSeamKind } from '../seams.js';
import type {
  EvaluationFunctionValue,
  EvaluationUnknownValue,
  EvaluationValue,
} from '../values.js';

export interface StaticIntrinsicEvaluationHost {
  readonly guardrails: StaticEvaluationGuardrails;

  evaluateExpression(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue;

  evaluateFunctionWithArguments(
    callee: EvaluationFunctionValue,
    call: ts.CallExpression,
    argumentValues: readonly EvaluationValue[],
    moduleKey: string,
    depth: number,
  ): EvaluationValue;

  open(
    seamKind: EvaluationOpenSeamKind,
    summary: string,
    node: ts.Node,
    moduleKey: string,
  ): void;

  unknown(
    reason: string,
    node: ts.Node,
    moduleKey: string,
    seamKind: EvaluationOpenSeamKind,
  ): EvaluationUnknownValue;

  checkpoint(): StaticIntrinsicEvaluationCheckpoint;

  restore(checkpoint: StaticIntrinsicEvaluationCheckpoint): void;

  resolveCommonJsRequire(
    moduleKey: string,
    moduleSpecifier: string,
    node: ts.CallExpression,
  ): EvaluationValue | null;

  resolveDynamicImport(
    moduleKey: string,
    moduleSpecifier: string,
    node: ts.CallExpression,
  ): EvaluationValue | null;

  evaluateCallExpression(
    call: ts.CallExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
    host: StaticIntrinsicEvaluationHost,
  ): EvaluationValue | null;
}

export interface StaticIntrinsicEvaluationCheckpoint {
  readonly openSeamCount: number;
  readonly statementCount: number;
}
