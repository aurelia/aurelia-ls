import ts from 'typescript';
import type { ProductHandle } from '../kernel/handles.js';
import { StaticInvocationEvidenceExpressionReader } from '../evaluation/expression-reader.js';
import {
  type EvaluationValue,
} from '../evaluation/values.js';
import type { DiRegistryExecutionResult } from '../di/registry-execution.js';
import {
  RegistryRegistrationAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import { EvaluatedRegistrationCarrier } from '../registration/registration-observation.js';
import {
  evaluatedRegistryValueSourceNode,
  hasEvaluationRegisterFunction,
} from '../registration/evaluated-registration-value.js';
import type { ConfigurationKernelEmission } from './configuration-kernel-emitter.js';
import {
  ConfigurationSequenceKind,
  type ConfigurationStep,
} from './configuration-sequence.js';

/** One path-proven execution of a source-owned registry-body step. */
export class RegistryBodyStepExecution {
  constructor(
    readonly step: ConfigurationStep,
    private readonly runtimeCarriersByAdmissionProduct: ReadonlyMap<ProductHandle, EvaluatedRegistrationCarrier>,
  ) {}

  runtimeCarrierForAdmission(admission: RegistrationAdmissionProduct): EvaluatedRegistrationCarrier | null {
    return this.runtimeCarriersByAdmissionProduct.get(admission.productHandle) ?? null;
  }
}

/** Candidate-local result of executing one exact registry value. */
export class RegistryAdmissionBodyExecution {
  constructor(
    readonly steps: readonly RegistryBodyStepExecution[],
    /** Every reached container.register call mapped back to its source-owned admission inventory. */
    readonly matched: boolean,
    readonly execution: DiRegistryExecutionResult | null = null,
  ) {}

  /** The registry body is closed only when execution completed normally without hidden evaluator pressure. */
  get closed(): boolean {
    return this.matched
      && this.execution != null
      && this.execution.abruptCompletion == null
      && this.execution.auditOpenSeams.length === 0;
  }
}

/** Source-owned registry inventory joined to exact candidate-local execution evidence. */
export class RegistryBodyStepIndex {
  constructor(
    private readonly configuration: ConfigurationKernelEmission,
    private readonly registryStepsByOwnerNode: ReadonlyMap<ts.Node, readonly ConfigurationStep[]>,
    private readonly admissionsByProduct: ReadonlyMap<ProductHandle, RegistrationAdmissionProduct>,
  ) {}

  matchAdmission(
    admission: RegistrationAdmissionProduct,
    runtimeValue: EvaluationValue | null,
    execution: DiRegistryExecutionResult | null,
  ): RegistryAdmissionBodyExecution {
    if (!(admission instanceof RegistryRegistrationAdmission)) {
      return new RegistryAdmissionBodyExecution([], false);
    }
    const ownerNode = runtimeValue == null
      ? null
      : registryRuntimeValueSourceNode(runtimeValue);
    const ownedValueNode = ownerNode
      ?? this.configuration.evaluationBindings.runtimeValueSourceNodeForProduct(admission.productHandle);
    if (ownedValueNode == null) {
      return new RegistryAdmissionBodyExecution([], false);
    }
    return this.matchRuntimeValueAtNode(execution, ownedValueNode);
  }

  matchRuntimeValue(
    runtimeValue: EvaluationValue,
    execution: DiRegistryExecutionResult | null,
  ): RegistryAdmissionBodyExecution {
    const ownedValueNode = registryRuntimeValueSourceNode(runtimeValue);
    return ownedValueNode == null
      ? new RegistryAdmissionBodyExecution([], false)
      : this.matchRuntimeValueAtNode(execution, ownedValueNode);
  }

  private matchRuntimeValueAtNode(
    execution: DiRegistryExecutionResult | null,
    ownedValueNode: ts.Node,
  ): RegistryAdmissionBodyExecution {
    const inventory = this.registryStepsByOwnerNode.get(ownedValueNode) ?? null;
    if (inventory == null) {
      return new RegistryAdmissionBodyExecution([], false);
    }
    if (execution == null) {
      return new RegistryAdmissionBodyExecution([], false);
    }
    const matched = matchReachedRegisterCalls(
      this.configuration,
      inventory,
      execution.handledInvocations.filter((invocation) => invocation.propertyKey === 'register'),
    );
    return new RegistryAdmissionBodyExecution(
      matched.steps.map(({ step, invocation }) => new RegistryBodyStepExecution(
        step,
        runtimeCarriersForStepAdmissions(
          this.configuration,
          this.admissionsByProduct,
          step,
          invocation,
        ),
      )),
      matched.complete,
      execution,
    );
  }
}

export function buildRegistryBodyStepIndex(
  configuration: ConfigurationKernelEmission,
): RegistryBodyStepIndex {
  return new RegistryBodyStepIndex(
    configuration,
    registryStepsByOwnerNode(configuration),
    new Map(configuration.registrationAdmissions.map((admission) => [admission.productHandle, admission])),
  );
}

function registryRuntimeValueSourceNode(
  value: EvaluationValue,
): ts.Node | null {
  return hasEvaluationRegisterFunction(value)
    ? evaluatedRegistryValueSourceNode(value)
    : null;
}

function matchReachedRegisterCalls(
  configuration: ConfigurationKernelEmission,
  inventory: readonly ConfigurationStep[],
  calls: readonly import('../evaluation/invocation.js').StaticInvocationOccurrence<ts.CallExpression>[],
): { readonly steps: readonly ReachedRegistryBodyStep[]; readonly complete: boolean } {
  const inventoryBySource = new Map<ts.Node, ConfigurationStep[]>();
  for (const step of inventory) {
    const sourceNode = configuration.evaluationBindings.sourceNodeForProduct(step.productHandle);
    if (sourceNode == null) {
      continue;
    }
    const existing = inventoryBySource.get(sourceNode);
    if (existing == null) {
      inventoryBySource.set(sourceNode, [step]);
    } else {
      existing.push(step);
    }
  }

  const steps: ReachedRegistryBodyStep[] = [];
  let complete = true;
  for (const event of calls) {
    const candidates = inventoryBySource.get(event.node) ?? null;
    if (candidates == null || candidates.length !== 1) {
      complete = false;
      continue;
    }
    steps.push({ step: candidates[0]!, invocation: event });
  }
  return { steps, complete };
}

interface ReachedRegistryBodyStep {
  readonly step: ConfigurationStep;
  readonly invocation: import('../evaluation/invocation.js').StaticInvocationOccurrence<ts.CallExpression>;
}

function runtimeCarriersForStepAdmissions(
  configuration: ConfigurationKernelEmission,
  admissionsByProduct: ReadonlyMap<ProductHandle, RegistrationAdmissionProduct>,
  step: ConfigurationStep,
  invocation: import('../evaluation/invocation.js').StaticInvocationOccurrence<ts.CallExpression>,
): ReadonlyMap<ProductHandle, EvaluatedRegistrationCarrier> {
  const reader = new StaticInvocationEvidenceExpressionReader(invocation.moduleKey, [invocation]);
  const result = new Map<ProductHandle, EvaluatedRegistrationCarrier>();
  for (const productHandle of step.registrationAdmissionProductHandles) {
    const admission = admissionsByProduct.get(productHandle) ?? null;
    const sourceNode = admission == null
      ? null
      : configuration.evaluationBindings.sourceNodeForProduct(admission.productHandle);
    if (sourceNode == null || !ts.isExpression(sourceNode)) {
      continue;
    }
    const value = reader.evaluateExpression(sourceNode).value;
    if (value != null) {
      result.set(productHandle, new EvaluatedRegistrationCarrier(sourceNode, value));
    }
  }
  return result;
}

function registryStepsByOwnerNode(
  configuration: ConfigurationKernelEmission,
): ReadonlyMap<ts.Node, readonly ConfigurationStep[]> {
  const stepsBySequence = stepsBySequenceProduct(configuration.steps);
  const result = new Map<ts.Node, ConfigurationStep[]>();
  for (const sequence of configuration.sequences) {
    if (sequence.sequenceKind !== ConfigurationSequenceKind.Registry) {
      continue;
    }
    const ownerNode = configuration.evaluationBindings.sourceNodeForProduct(sequence.productHandle);
    if (ownerNode == null) {
      continue;
    }
    const steps = stepsBySequence.get(sequence.productHandle) ?? [];
    const retained = result.get(ownerNode);
    if (retained == null) {
      result.set(ownerNode, [...steps]);
    } else {
      retained.push(...steps);
    }
  }
  return result;
}

function stepsBySequenceProduct(
  steps: readonly ConfigurationStep[],
): ReadonlyMap<ProductHandle, readonly ConfigurationStep[]> {
  const result = new Map<ProductHandle, ConfigurationStep[]>();
  for (const step of steps) {
    const sequenceProductHandle = step.sequence?.productHandle ?? null;
    if (sequenceProductHandle == null) {
      continue;
    }
    let sequenceSteps = result.get(sequenceProductHandle);
    if (sequenceSteps == null) {
      sequenceSteps = [];
      result.set(sequenceProductHandle, sequenceSteps);
    }
    sequenceSteps.push(step);
  }
  return result;
}
