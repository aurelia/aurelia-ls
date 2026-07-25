import ts from 'typescript';
import type { StaticExpressionEvaluationReader } from '../evaluation/expression-reader.js';
import type { EvaluationValue } from '../evaluation/values.js';
import type { StaticModuleEvaluationResult } from '../evaluation/module-evaluation-result.js';
import type { StaticProjectEvaluationSourceIndex } from '../evaluation/project-source-index.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { RegistrationKeyObservation } from '../registration/registration-observation.js';
import { registrationKeyObservationForEvaluatedValue } from '../registration/evaluated-registration-factory.js';
import type { TypeSystemProject } from '../type-system/project.js';

/** Inputs shared by configuration recognizers for one evaluated source module. */
export class ConfigurationRecognitionContext {
  constructor(
    /** Parsed source file being inspected. */
    readonly sourceFile: ts.SourceFile,
    /** Module key used by the static evaluator and kernel local handles. */
    readonly moduleKey: string,
    /** Project frame whose app-world emission owns this recognition pass. */
    readonly projectKey: string,
    /** Source-file address admitted by boot or host setup. */
    readonly sourceFileAddressHandle: AddressHandle,
    /** Static evaluator result for the same source file. */
    readonly evaluation: StaticModuleEvaluationResult,
    /** Exact evaluator evidence lane authorized for this recognition pass. */
    readonly expressionReader: StaticExpressionEvaluationReader,
    /** Shared TypeChecker epoch for source-level shape checks that evaluation cannot close. */
    readonly typeSystem: TypeSystemProject | null = null,
    /** Shared index of project-evaluation sources reachable by evaluator values and declarations. */
    readonly sourceIndex: StaticProjectEvaluationSourceIndex,
  ) {}

  withExpressionReader(expressionReader: StaticExpressionEvaluationReader): ConfigurationRecognitionContext {
    return new ConfigurationRecognitionContext(
      this.sourceFile,
      this.moduleKey,
      this.projectKey,
      this.sourceFileAddressHandle,
      this.evaluation,
      expressionReader,
      this.typeSystem,
      this.sourceIndex,
    );
  }

  sourceFileAddressHandleForNode(node: ts.Node): AddressHandle | null {
    return this.sourceIndex.addressHandleForNode(node);
  }

  /** Observe a DI key once through the evaluator so every configuration carrier spends the same value evidence. */
  registrationKeyObservation(expression: ts.Expression): RegistrationKeyObservation {
    const value = this.expressionReader.evaluateExpression(expression).value;
    return this.registrationKeyObservationForValue(expression, value);
  }

  /** Observe a key from an already-linked evaluator value without re-reading it through the carrier module. */
  registrationKeyObservationForValue(
    expression: ts.Expression,
    value: EvaluationValue | null,
  ): RegistrationKeyObservation {
    return registrationKeyObservationForEvaluatedValue(
      expression,
      value,
      (node) => this.sourceFileAddressHandleForNode(node),
    );
  }
}
