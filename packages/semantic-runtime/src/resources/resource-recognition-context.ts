import type ts from 'typescript';
import { StaticEvaluationExpressionReader } from '../evaluation/expression-reader.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { StaticModuleEvaluationResult } from '../evaluation/evaluator.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type { SourceFileAdmission } from '../boot/frames.js';

/** Inputs shared by resource recognizers for one evaluated source module. */
export class ResourceRecognitionContext {
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
    /** Current TypeChecker epoch for the project, when the caller needs runtime target types. */
    readonly typeSystem: TypeSystemProject | null = null,
    /** Project root used when a semantic read needs to join back to admitted non-TS assets. */
    readonly projectRootDir: string | null = null,
    /** Boot-admitted source files for this project, including HTML/CSS assets not parsed by TS evaluation. */
    readonly sourceFiles: readonly SourceFileAdmission[] = [],
  ) {
    this.expressionReader = new StaticEvaluationExpressionReader(evaluation.environment, moduleKey);
  }
}
