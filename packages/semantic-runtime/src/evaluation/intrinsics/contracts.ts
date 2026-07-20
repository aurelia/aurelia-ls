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
import type { EvaluationValueEvidence } from '../value-pressure.js';

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

  evaluateExpressionEvidence(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValueEvidence;

  evaluateFunctionWithArguments(
    callee: EvaluationFunctionValue,
    call: ts.CallExpression,
    argumentValues: readonly EvaluationValueEvidence[],
    moduleKey: string,
    depth: number,
    thisValue: EvaluationValueEvidence | null,
  ): EvaluationValue;

  evaluateClassInstantiation(
    callee: EvaluationClassValue,
    expression: ts.Node,
    argumentValues: readonly EvaluationValueEvidence[],
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

  consumeOpenSeamsSince(checkpoint: StaticIntrinsicEvaluationCheckpoint): readonly EvaluationOpenSeam[];

  replayOpenSeams(openSeams: readonly EvaluationOpenSeam[]): void;

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
}

export interface StaticIntrinsicEvaluationCheckpoint {
  readonly auditOpenSeamCount: number;
  readonly openSeamCount: number;
  readonly executionEventCount: number;
  readonly nextExecutionOrdinal: number;
  readonly statementCount: number;
}
