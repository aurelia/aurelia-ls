import type ts from 'typescript';

import type { Container } from '../di/container.js';
import type { EvaluationValue } from '../evaluation/values.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { RegistrationAdmissionProduct } from '../registration/registration-admission.js';
import { frameworkRegistrationKindForRegistrationEvidence } from '../registration/evaluated-registration-classifier.js';
import type { EvaluatedRegistrationCarrier } from '../registration/registration-observation.js';
import type { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import type { Aurelia } from './aurelia.js';
import type {
  AureliaContainerEvaluation,
  AureliaFacadeEvaluation,
} from './aurelia-evaluation-runtime.js';

/** Project-run links from source/evaluator identities to emitted configuration products. */
export class ConfigurationEvaluationBindings {
  constructor(
    /** Evaluator container identities joined to their exact emitted container products. */
    readonly containersByEvaluation: ReadonlyMap<AureliaContainerEvaluation, Container>,
    /** Evaluator facade identities joined to their exact emitted Aurelia products. */
    readonly aureliasByEvaluation: ReadonlyMap<AureliaFacadeEvaluation, Aurelia>,
    /** Exact evaluator carriers retained for registration admissions before DI spending. */
    readonly registrationCarriersByAdmissionProduct: ReadonlyMap<ProductHandle, EvaluatedRegistrationCarrier>,
    /** Runtime configuration values mutated by each option contribution. */
    readonly configurationValuesByOptionContributionProduct: ReadonlyMap<ProductHandle, EvaluationValue>,
    /** Authored syntax node that emitted each configuration product. */
    readonly sourceNodesByProduct: ReadonlyMap<ProductHandle, ts.Node>,
    /** Source node that owns each product's reusable runtime value. */
    readonly runtimeValueSourceNodesByProduct: ReadonlyMap<ProductHandle, ts.Node>,
  ) {}

  registrationCarrierForAdmission(admissionProductHandle: ProductHandle): EvaluatedRegistrationCarrier | null {
    return this.registrationCarriersByAdmissionProduct.get(admissionProductHandle) ?? null;
  }

  /**
   * Classify a pre-spending admission from its strongest retained source/evaluator evidence.
   *
   * Concrete DI consumers must use `frameworkRegistrationKindForOperation(...)` instead.
   */
  frameworkRegistrationKindForAdmissionEvidence(
    admission: RegistrationAdmissionProduct,
  ): FrameworkRegistrationKind | null {
    return frameworkRegistrationKindForRegistrationEvidence(
      admission,
      this.registrationCarrierForAdmission(admission.productHandle),
    );
  }

  configurationValueForOptionContribution(
    contributionProductHandle: ProductHandle,
  ): EvaluationValue | null {
    return this.configurationValuesByOptionContributionProduct.get(contributionProductHandle) ?? null;
  }

  sourceNodeForProduct(productHandle: ProductHandle): ts.Node | null {
    return this.sourceNodesByProduct.get(productHandle) ?? null;
  }

  runtimeValueSourceNodeForProduct(productHandle: ProductHandle): ts.Node | null {
    return this.runtimeValueSourceNodesByProduct.get(productHandle) ?? null;
  }
}

/** Position inside one project-wide evaluator-to-product binding frame. */
export class ConfigurationEvaluationBindingMark {
  constructor(
    readonly containerCount: number,
    readonly aureliaCount: number,
    readonly registrationValueCount: number,
    readonly configurationValueCount: number,
    readonly sourceNodeCount: number,
    readonly runtimeValueSourceNodeCount: number,
  ) {}
}

/** Mutable project-run bridge from static-evaluation identity to emitted runtime products. */
export class ConfigurationEvaluationBindingFrame {
  private readonly containersByEvaluation = new Map<AureliaContainerEvaluation, Container>();
  private readonly aureliasByEvaluation = new Map<AureliaFacadeEvaluation, Aurelia>();
  private readonly registrationCarriersByAdmissionProduct = new Map<ProductHandle, EvaluatedRegistrationCarrier>();
  private readonly configurationValuesByOptionContributionProduct = new Map<ProductHandle, EvaluationValue>();
  private readonly sourceNodesByProduct = new Map<ProductHandle, ts.Node>();
  private readonly runtimeValueSourceNodesByProduct = new Map<ProductHandle, ts.Node>();
  private readonly containerEntries: [AureliaContainerEvaluation, Container][] = [];
  private readonly aureliaEntries: [AureliaFacadeEvaluation, Aurelia][] = [];
  private readonly registrationValueEntries: [ProductHandle, EvaluatedRegistrationCarrier][] = [];
  private readonly configurationValueEntries: [ProductHandle, EvaluationValue][] = [];
  private readonly sourceNodeEntries: [ProductHandle, ts.Node][] = [];
  private readonly runtimeValueSourceNodeEntries: [ProductHandle, ts.Node][] = [];

  mark(): ConfigurationEvaluationBindingMark {
    return new ConfigurationEvaluationBindingMark(
      this.containerEntries.length,
      this.aureliaEntries.length,
      this.registrationValueEntries.length,
      this.configurationValueEntries.length,
      this.sourceNodeEntries.length,
      this.runtimeValueSourceNodeEntries.length,
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

  bindRegistrationCarrier(admissionProductHandle: ProductHandle, value: EvaluatedRegistrationCarrier): void {
    if (this.registrationCarriersByAdmissionProduct.has(admissionProductHandle)) {
      return;
    }
    this.registrationCarriersByAdmissionProduct.set(admissionProductHandle, value);
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

  bindProductSource(productHandle: ProductHandle, node: ts.Node): void {
    this.bindSourceNode(this.sourceNodesByProduct, this.sourceNodeEntries, productHandle, node);
  }

  bindProductRuntimeValueSource(productHandle: ProductHandle, node: ts.Node): void {
    this.bindSourceNode(
      this.runtimeValueSourceNodesByProduct,
      this.runtimeValueSourceNodeEntries,
      productHandle,
      node,
    );
  }

  readSince(mark: ConfigurationEvaluationBindingMark): ConfigurationEvaluationBindings {
    return new ConfigurationEvaluationBindings(
      new Map(this.containerEntries.slice(mark.containerCount)),
      new Map(this.aureliaEntries.slice(mark.aureliaCount)),
      new Map(this.registrationValueEntries.slice(mark.registrationValueCount)),
      new Map(this.configurationValueEntries.slice(mark.configurationValueCount)),
      new Map(this.sourceNodeEntries.slice(mark.sourceNodeCount)),
      new Map(this.runtimeValueSourceNodeEntries.slice(mark.runtimeValueSourceNodeCount)),
    );
  }

  readAll(): ConfigurationEvaluationBindings {
    return new ConfigurationEvaluationBindings(
      new Map(this.containersByEvaluation),
      new Map(this.aureliasByEvaluation),
      new Map(this.registrationCarriersByAdmissionProduct),
      new Map(this.configurationValuesByOptionContributionProduct),
      new Map(this.sourceNodesByProduct),
      new Map(this.runtimeValueSourceNodesByProduct),
    );
  }

  private bindSourceNode(
    index: Map<ProductHandle, ts.Node>,
    entries: [ProductHandle, ts.Node][],
    productHandle: ProductHandle,
    node: ts.Node,
  ): void {
    const existing = index.get(productHandle) ?? null;
    if (existing === node) {
      return;
    }
    if (existing != null) {
      throw new Error('One configuration product cannot retain two source-node identities.');
    }
    index.set(productHandle, node);
    entries.push([productHandle, node]);
  }
}

export function mergeConfigurationEvaluationBindings(
  bindings: readonly ConfigurationEvaluationBindings[],
): ConfigurationEvaluationBindings {
  return new ConfigurationEvaluationBindings(
    new Map(bindings.flatMap((binding) => [...binding.containersByEvaluation])),
    new Map(bindings.flatMap((binding) => [...binding.aureliasByEvaluation])),
    new Map(bindings.flatMap((binding) => [...binding.registrationCarriersByAdmissionProduct])),
    new Map(bindings.flatMap((binding) => [...binding.configurationValuesByOptionContributionProduct])),
    new Map(bindings.flatMap((binding) => [...binding.sourceNodesByProduct])),
    new Map(bindings.flatMap((binding) => [...binding.runtimeValueSourceNodesByProduct])),
  );
}
