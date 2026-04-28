import type ts from 'typescript';
import { StaticEvaluationExpressionReader } from '../evaluation/expression-reader.js';
import type { StaticModuleEvaluationResult } from '../evaluation/evaluator.js';
import type { AddressHandle } from '../kernel/handles.js';

/** Inputs shared by configuration recognition producers for one evaluated source module. */
export class ConfigurationRecognitionContext {
  /** Generic TypeScript expression reader for this module evaluation. */
  readonly expressionReader: StaticEvaluationExpressionReader;

  constructor(
    /** Parsed source file being inspected. */
    readonly sourceFile: ts.SourceFile,
    /** Module key used by the static evaluator and kernel local handles. */
    readonly moduleKey: string,
    /** Source-file address admitted by boot or host setup. */
    readonly sourceFileAddressHandle: AddressHandle,
    /** Static evaluator result for the same source file. */
    readonly evaluation: StaticModuleEvaluationResult,
  ) {
    this.expressionReader = new StaticEvaluationExpressionReader(evaluation.environment, moduleKey);
  }
}
