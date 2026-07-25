import type { Container } from '../di/container.js';
import type { EvaluationValue } from '../evaluation/values.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { Aurelia } from './aurelia.js';
import type {
  AureliaContainerEvaluation,
  AureliaFacadeEvaluation,
} from './aurelia-evaluation-runtime.js';

/** Project-run links from evaluator identities to emitted configuration products. */
export class ConfigurationEvaluationBindings {
  constructor(
    readonly containersByEvaluation: ReadonlyMap<AureliaContainerEvaluation, Container>,
    readonly aureliasByEvaluation: ReadonlyMap<AureliaFacadeEvaluation, Aurelia>,
    readonly registrationValuesByAdmissionProduct: ReadonlyMap<ProductHandle, EvaluationValue>,
    readonly configurationValuesByOptionContributionProduct: ReadonlyMap<ProductHandle, EvaluationValue>,
  ) {}

  registrationValueForAdmission(admissionProductHandle: ProductHandle): EvaluationValue | null {
    return this.registrationValuesByAdmissionProduct.get(admissionProductHandle) ?? null;
  }

  configurationValueForOptionContribution(
    contributionProductHandle: ProductHandle,
  ): EvaluationValue | null {
    return this.configurationValuesByOptionContributionProduct.get(contributionProductHandle) ?? null;
  }
}

/** Position inside one project-wide evaluator-to-product binding frame. */
export class ConfigurationEvaluationBindingMark {
  constructor(
    readonly containerCount: number,
    readonly aureliaCount: number,
    readonly registrationValueCount: number,
    readonly configurationValueCount: number,
  ) {}
}

/** Mutable project-run bridge from static-evaluation identity to emitted runtime products. */
export class ConfigurationEvaluationBindingFrame {
  private readonly containersByEvaluation = new Map<AureliaContainerEvaluation, Container>();
  private readonly aureliasByEvaluation = new Map<AureliaFacadeEvaluation, Aurelia>();
  private readonly registrationValuesByAdmissionProduct = new Map<ProductHandle, EvaluationValue>();
  private readonly configurationValuesByOptionContributionProduct = new Map<ProductHandle, EvaluationValue>();
  private readonly containerEntries: [AureliaContainerEvaluation, Container][] = [];
  private readonly aureliaEntries: [AureliaFacadeEvaluation, Aurelia][] = [];
  private readonly registrationValueEntries: [ProductHandle, EvaluationValue][] = [];
  private readonly configurationValueEntries: [ProductHandle, EvaluationValue][] = [];

  mark(): ConfigurationEvaluationBindingMark {
    return new ConfigurationEvaluationBindingMark(
      this.containerEntries.length,
      this.aureliaEntries.length,
      this.registrationValueEntries.length,
      this.configurationValueEntries.length,
    );
  }

  containerForEvaluation(evaluation: AureliaContainerEvaluation): Container | null {
    return this.containersByEvaluation.get(evaluation) ?? null;
  }

  bindContainer(evaluation: AureliaContainerEvaluation, container: Container): void {
    const existing = this.containersByEvaluation.get(evaluation) ?? null;
    if (existing === container) {
      return;
    }
    if (existing != null) {
      throw new Error('One evaluator container identity cannot materialize as two runtime containers.');
    }
    this.containersByEvaluation.set(evaluation, container);
    this.containerEntries.push([evaluation, container]);
  }

  aureliaForEvaluation(evaluation: AureliaFacadeEvaluation): Aurelia | null {
    return this.aureliasByEvaluation.get(evaluation) ?? null;
  }

  bindAurelia(evaluation: AureliaFacadeEvaluation, aurelia: Aurelia): void {
    const existing = this.aureliasByEvaluation.get(evaluation) ?? null;
    if (existing === aurelia) {
      return;
    }
    if (existing != null) {
      throw new Error('One evaluator facade identity cannot materialize as two Aurelia products.');
    }
    this.aureliasByEvaluation.set(evaluation, aurelia);
    this.aureliaEntries.push([evaluation, aurelia]);
  }

  bindRegistrationValue(admissionProductHandle: ProductHandle, value: EvaluationValue): void {
    if (this.registrationValuesByAdmissionProduct.has(admissionProductHandle)) {
      return;
    }
    this.registrationValuesByAdmissionProduct.set(admissionProductHandle, value);
    this.registrationValueEntries.push([admissionProductHandle, value]);
  }

  bindOptionContributionConfigurationValue(
    contributionProductHandle: ProductHandle,
    value: EvaluationValue,
  ): void {
    if (this.configurationValuesByOptionContributionProduct.has(contributionProductHandle)) {
      return;
    }
    this.configurationValuesByOptionContributionProduct.set(contributionProductHandle, value);
    this.configurationValueEntries.push([contributionProductHandle, value]);
  }

  readSince(mark: ConfigurationEvaluationBindingMark): ConfigurationEvaluationBindings {
    return new ConfigurationEvaluationBindings(
      new Map(this.containerEntries.slice(mark.containerCount)),
      new Map(this.aureliaEntries.slice(mark.aureliaCount)),
      new Map(this.registrationValueEntries.slice(mark.registrationValueCount)),
      new Map(this.configurationValueEntries.slice(mark.configurationValueCount)),
    );
  }

  readAll(): ConfigurationEvaluationBindings {
    return new ConfigurationEvaluationBindings(
      new Map(this.containersByEvaluation),
      new Map(this.aureliasByEvaluation),
      new Map(this.registrationValuesByAdmissionProduct),
      new Map(this.configurationValuesByOptionContributionProduct),
    );
  }
}

export function mergeConfigurationEvaluationBindings(
  bindings: readonly ConfigurationEvaluationBindings[],
): ConfigurationEvaluationBindings {
  return new ConfigurationEvaluationBindings(
    new Map(bindings.flatMap((binding) => [...binding.containersByEvaluation])),
    new Map(bindings.flatMap((binding) => [...binding.aureliasByEvaluation])),
    new Map(bindings.flatMap((binding) => [...binding.registrationValuesByAdmissionProduct])),
    new Map(bindings.flatMap((binding) => [...binding.configurationValuesByOptionContributionProduct])),
  );
}
