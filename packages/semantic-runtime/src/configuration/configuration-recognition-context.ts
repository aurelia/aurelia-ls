import ts from 'typescript';
import { EvaluatedDiKeyDeclarationSource } from '../di/di-key-identity-emitter.js';
import { StaticModuleEvaluationExpressionReader } from '../evaluation/expression-reader.js';
import { readReferenceName } from '../evaluation/ts-syntax.js';
import {
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';
import type { StaticModuleEvaluationResult } from '../evaluation/evaluator.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  RegistrationKeyObservation,
  RegistrationKeyObservationKind,
} from '../registration/registration-observation.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { normalizeConfigurationSourceFileName } from './source-file-names.js';

/** Inputs shared by configuration recognizers for one evaluated source module. */
export class ConfigurationRecognitionContext {
  /** Generic TypeScript expression reader for this module evaluation. */
  readonly expressionReader: StaticModuleEvaluationExpressionReader;

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
    /** Shared TypeChecker epoch for source-level shape checks that evaluation cannot close. */
    readonly typeSystem: TypeSystemProject | null = null,
    /** Source-file addresses for other project modules reachable through the evaluator. */
    private readonly sourceFileAddressHandlesByFileName: ReadonlyMap<string, AddressHandle> = new Map([
      [normalizeConfigurationSourceFileName(sourceFile.fileName), sourceFileAddressHandle],
    ]),
  ) {
    this.expressionReader = new StaticModuleEvaluationExpressionReader(evaluation);
  }

  sourceFileAddressHandleForNode(node: ts.Node): AddressHandle | null {
    return this.sourceFileAddressHandlesByFileName.get(
      normalizeConfigurationSourceFileName(node.getSourceFile().fileName),
    ) ?? null;
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
    const constructable = value?.kind === EvaluationValueKind.Class || value?.kind === EvaluationValueKind.Function
      ? new EvaluatedDiKeyDeclarationSource(
          value.declaration,
          value.environment.moduleKey,
          this.sourceFileAddressHandleForNode(value.declaration),
        )
      : null;
    const declarationName = constructable == null
      ? null
      : ts.getNameOfDeclaration(constructable.declaration)?.getText(constructable.declaration.getSourceFile()) ?? null;
    return new RegistrationKeyObservation(
      declarationName ?? readReferenceName(expression),
      expression,
      constructable == null ? RegistrationKeyObservationKind.Expression : RegistrationKeyObservationKind.Constructable,
      constructable,
      value,
      this.sourceFileAddressHandleForNode(expression),
    );
  }
}
