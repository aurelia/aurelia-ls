import type { Container } from '../di/container.js';
import type { EvaluationValue } from '../evaluation/values.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { Aurelia } from './aurelia.js';
import type { AureliaAppFrame } from './aurelia-app-frame-materializer.js';
import type {
  AureliaContainerEvaluation,
  AureliaFacadeEvaluation,
} from './aurelia-evaluation-runtime.js';

/** Project-run links from evaluator identities to emitted configuration products. */
export class ConfigurationEvaluationBindings {
  constructor(
    readonly containersByEvaluation: ReadonlyMap<AureliaContainerEvaluation, Container>,
    readonly aureliasByEvaluation: ReadonlyMap<AureliaFacadeEvaluation, Aurelia>,
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

/** Position inside one project-wide evaluator-to-product binding frame. */
export class ConfigurationEvaluationBindingMark {
  constructor(
    readonly containerCount: number,
    readonly aureliaCount: number,
    readonly receiverCount: number,
    readonly registrationValueCount: number,
  ) {}
}

/** Mutable project-run bridge from static-evaluation identity to emitted runtime products. */
export class ConfigurationEvaluationBindingFrame {
  private readonly containersByEvaluation = new Map<AureliaContainerEvaluation, Container>();
  private readonly appFramesByEvaluation = new Map<AureliaFacadeEvaluation, AureliaAppFrame>();
  private readonly receiverEvaluationsByStep = new Map<ProductHandle, AureliaContainerEvaluation>();
  private readonly registrationValuesByAdmissionProduct = new Map<ProductHandle, EvaluationValue>();
  private readonly containerEntries: [AureliaContainerEvaluation, Container][] = [];
  private readonly aureliaEntries: [AureliaFacadeEvaluation, Aurelia][] = [];
  private readonly receiverEntries: [ProductHandle, AureliaContainerEvaluation][] = [];
  private readonly registrationValueEntries: [ProductHandle, EvaluationValue][] = [];

  mark(): ConfigurationEvaluationBindingMark {
    return new ConfigurationEvaluationBindingMark(
      this.containerEntries.length,
      this.aureliaEntries.length,
      this.receiverEntries.length,
      this.registrationValueEntries.length,
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

  appFrameForEvaluation(evaluation: AureliaFacadeEvaluation): AureliaAppFrame | null {
    return this.appFramesByEvaluation.get(evaluation) ?? null;
  }

  bindAppFrame(evaluation: AureliaFacadeEvaluation, frame: AureliaAppFrame): void {
    const existing = this.appFramesByEvaluation.get(evaluation) ?? null;
    if (existing === frame) {
      return;
    }
    if (existing != null) {
      throw new Error('One evaluator facade identity cannot materialize as two Aurelia products.');
    }
    this.appFramesByEvaluation.set(evaluation, frame);
    this.aureliaEntries.push([evaluation, frame.aurelia]);
  }

  bindReceiver(stepProductHandle: ProductHandle, evaluation: AureliaContainerEvaluation): void {
    if (this.receiverEvaluationsByStep.has(stepProductHandle)) {
      return;
    }
    this.receiverEvaluationsByStep.set(stepProductHandle, evaluation);
    this.receiverEntries.push([stepProductHandle, evaluation]);
  }

  bindRegistrationValue(admissionProductHandle: ProductHandle, value: EvaluationValue): void {
    if (this.registrationValuesByAdmissionProduct.has(admissionProductHandle)) {
      return;
    }
    this.registrationValuesByAdmissionProduct.set(admissionProductHandle, value);
    this.registrationValueEntries.push([admissionProductHandle, value]);
  }

  readSince(mark: ConfigurationEvaluationBindingMark): ConfigurationEvaluationBindings {
    return new ConfigurationEvaluationBindings(
      new Map(this.containerEntries.slice(mark.containerCount)),
      new Map(this.aureliaEntries.slice(mark.aureliaCount)),
      new Map(this.receiverEntries.slice(mark.receiverCount)),
      new Map(this.registrationValueEntries.slice(mark.registrationValueCount)),
    );
  }

  readAll(): ConfigurationEvaluationBindings {
    return new ConfigurationEvaluationBindings(
      new Map(this.containersByEvaluation),
      new Map(this.aureliaEntries),
      new Map(this.receiverEvaluationsByStep),
      new Map(this.registrationValuesByAdmissionProduct),
    );
  }
}

export function mergeConfigurationEvaluationBindings(
  bindings: readonly ConfigurationEvaluationBindings[],
): ConfigurationEvaluationBindings {
  return new ConfigurationEvaluationBindings(
    new Map(bindings.flatMap((binding) => [...binding.containersByEvaluation])),
    new Map(bindings.flatMap((binding) => [...binding.aureliasByEvaluation])),
    new Map(bindings.flatMap((binding) => [...binding.receiverEvaluationsByStep])),
    new Map(bindings.flatMap((binding) => [...binding.registrationValuesByAdmissionProduct])),
  );
}
