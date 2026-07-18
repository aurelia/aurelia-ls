import type { Container } from '../di/container.js';
import type { EvaluationValue } from '../evaluation/values.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { AureliaContainerEvaluation } from './aurelia-evaluation-runtime.js';

/** Candidate-local links from evaluator identities to emitted configuration products. */
export class ConfigurationEvaluationBindings {
  constructor(
    readonly containersByEvaluation: ReadonlyMap<AureliaContainerEvaluation, Container>,
    readonly receiverEvaluationsByStep: ReadonlyMap<ProductHandle, AureliaContainerEvaluation>,
    readonly registrationValuesByAdmissionProduct: ReadonlyMap<ProductHandle, EvaluationValue>,
  ) {}

  containerForStep(stepProductHandle: ProductHandle): Container | null {
    const evaluation = this.receiverEvaluationsByStep.get(stepProductHandle) ?? null;
    return evaluation == null
      ? null
      : this.containersByEvaluation.get(evaluation) ?? null;
  }

  registrationValueForAdmission(admissionProductHandle: ProductHandle): EvaluationValue | null {
    return this.registrationValuesByAdmissionProduct.get(admissionProductHandle) ?? null;
  }
}

export function mergeConfigurationEvaluationBindings(
  bindings: readonly ConfigurationEvaluationBindings[],
): ConfigurationEvaluationBindings {
  return new ConfigurationEvaluationBindings(
    new Map(bindings.flatMap((binding) => [...binding.containersByEvaluation])),
    new Map(bindings.flatMap((binding) => [...binding.receiverEvaluationsByStep])),
    new Map(bindings.flatMap((binding) => [...binding.registrationValuesByAdmissionProduct])),
  );
}
