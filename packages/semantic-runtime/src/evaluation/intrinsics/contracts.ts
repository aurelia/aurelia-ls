import ts from 'typescript';
import type { OpenSeamReasonKind } from '../../kernel/open-seam.js';
import type { ModuleEnvironmentRecord } from '../environment.js';
import type { StaticEvaluationGuardrails } from '../policy.js';
import type { EvaluationExpressionAbruptCompletion } from '../completion.js';
import {
  EvaluationOpenSeamKind,
  type EvaluationOpenSeam,
} from '../seams.js';
import type {
  EvaluationClassValue,
  EvaluationFunctionValue,
  EvaluationUnknownValue,
  EvaluationValue,
} from '../values.js';

export interface StaticIntrinsicEvaluationHost {
  readonly guardrails: StaticEvaluationGuardrails;

  /** Propagate modeled abrupt control flow through expression-shaped host APIs. */
  raise(completion: EvaluationExpressionAbruptCompletion): never;

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

  evaluateClassInstantiation(
    callee: EvaluationClassValue,
    expression: ts.Node,
    argumentValues: readonly EvaluationValue[],
    moduleKey: string,
    depth: number,
  ): EvaluationValue;

  open(
    seamKind: EvaluationOpenSeamKind,
    summary: string,
    node: ts.Node,
    moduleKey: string,
    reasonKinds: readonly OpenSeamReasonKind[],
  ): void;

  unknown(
    reason: string,
    node: ts.Node,
    moduleKey: string,
    seamKind: EvaluationOpenSeamKind,
  ): EvaluationUnknownValue;

  checkpoint(): StaticIntrinsicEvaluationCheckpoint;

  restore(checkpoint: StaticIntrinsicEvaluationCheckpoint): void;

  openSeamsSince(checkpoint: StaticIntrinsicEvaluationCheckpoint): readonly EvaluationOpenSeam[];

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
  readonly auditOpenSeamCount: number;
  readonly openSeamCount: number;
  readonly executedCallCount: number;
  readonly statementCount: number;
}
