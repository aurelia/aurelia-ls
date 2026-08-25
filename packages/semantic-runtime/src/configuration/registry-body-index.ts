import ts from 'typescript';
import type { ProductHandle } from '../kernel/handles.js';
import { StaticInvocationEvidenceExpressionReader } from '../evaluation/expression-reader.js';
import {
  type EvaluationValue,
} from '../evaluation/values.js';
import type { DiRegistryExecutionResult } from '../di/registry-execution.js';
import type {
  StaticInvocationFrame,
  StaticInvocationIdentity,
  StaticInvocationOccurrence,
} from '../evaluation/invocation.js';
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

/** Live, candidate-local matcher used while one registry body is executing. */
export class RegistryBodyExecutionSession {
  private readonly invocationIdentities: StaticInvocationIdentity[] = [];
  private readonly inventoryBySource: ReadonlyMap<ts.Node, readonly ConfigurationStep[]>;
  private complete = true;

  constructor(
    private readonly configuration: ConfigurationKernelEmission,
    inventory: readonly ConfigurationStep[],
    private readonly admissionsByProduct: ReadonlyMap<ProductHandle, RegistrationAdmissionProduct>,
  ) {
    this.inventoryBySource = registryStepInventoryBySource(configuration, inventory);
  }

  record(
    invocation: StaticInvocationFrame<ts.CallExpression> | StaticInvocationOccurrence<ts.CallExpression>,
  ): RegistryBodyStepExecution | null {
    this.invocationIdentities.push(invocation.identity);
    return this.executionFor(invocation);
  }

  finish(execution: DiRegistryExecutionResult | null): RegistryAdmissionBodyExecution {
    const retainedRegisterInvocations = execution?.handledInvocations.filter((invocation) =>
      invocation.propertyKey === 'register'
    ) ?? [];
    const invocationSequenceMatches = retainedRegisterInvocations.length === this.invocationIdentities.length
      && retainedRegisterInvocations.every((invocation, index) =>
        invocation.identity === this.invocationIdentities[index]
      );
    const steps = retainedRegisterInvocations.flatMap((invocation) => {
      const step = this.executionFor(invocation);
      return step == null ? [] : [step];
    });
    return new RegistryAdmissionBodyExecution(
      steps,
      execution != null && this.complete && invocationSequenceMatches,
      execution,
    );
  }

  private executionFor(
    invocation: StaticInvocationFrame<ts.CallExpression> | StaticInvocationOccurrence<ts.CallExpression>,
  ): RegistryBodyStepExecution | null {
    const candidates = this.inventoryBySource.get(invocation.node) ?? null;
    if (candidates == null || candidates.length !== 1) {
      this.complete = false;
      return null;
    }
    const step = candidates[0]!;
    const execution = new RegistryBodyStepExecution(
      step,
      runtimeCarriersForStepAdmissions(
        this.configuration,
        this.admissionsByProduct,
        step,
        invocation,
      ),
    );
    return execution;
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
    return this.matchExecution(this.openAdmissionExecution(admission, runtimeValue), execution);
  }

  matchRuntimeValue(
    runtimeValue: EvaluationValue,
    execution: DiRegistryExecutionResult | null,
  ): RegistryAdmissionBodyExecution {
    return this.matchExecution(this.openRuntimeValueExecution(runtimeValue), execution);
  }

  openAdmissionExecution(
    admission: RegistrationAdmissionProduct,
    runtimeValue: EvaluationValue | null,
  ): RegistryBodyExecutionSession | null {
    const runtimeOwner = runtimeValue == null
      ? null
      : registryRuntimeValueSourceNode(runtimeValue);
    if (runtimeOwner != null) {
      return this.openExecutionAtNode(runtimeOwner);
    }
    if (!(admission instanceof RegistryRegistrationAdmission)) {
      return null;
    }
    const sourceOwner = this.configuration.evaluationBindings
      .runtimeValueSourceNodeForProduct(admission.productHandle);
    return sourceOwner == null ? null : this.openExecutionAtNode(sourceOwner);
  }

  openRuntimeValueExecution(runtimeValue: EvaluationValue): RegistryBodyExecutionSession | null {
    const owner = registryRuntimeValueSourceNode(runtimeValue);
    return owner == null ? null : this.openExecutionAtNode(owner);
  }

  private openExecutionAtNode(ownerNode: ts.Node): RegistryBodyExecutionSession | null {
    const inventory = this.registryStepsByOwnerNode.get(ownerNode) ?? null;
    return inventory == null
      ? null
      : new RegistryBodyExecutionSession(
          this.configuration,
          inventory,
          this.admissionsByProduct,
        );
  }

  private matchExecution(
    session: RegistryBodyExecutionSession | null,
    execution: DiRegistryExecutionResult | null,
  ): RegistryAdmissionBodyExecution {
    if (session == null || execution == null) {
      return new RegistryAdmissionBodyExecution([], false);
    }
    for (const invocation of execution.handledInvocations) {
      if (invocation.propertyKey === 'register') {
        session.record(invocation);
      }
    }
    return session.finish(execution);
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

function registryStepInventoryBySource(
  configuration: ConfigurationKernelEmission,
  inventory: readonly ConfigurationStep[],
): ReadonlyMap<ts.Node, readonly ConfigurationStep[]> {
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
  return inventoryBySource;
}

function runtimeCarriersForStepAdmissions(
  configuration: ConfigurationKernelEmission,
  admissionsByProduct: ReadonlyMap<ProductHandle, RegistrationAdmissionProduct>,
  step: ConfigurationStep,
  invocation: StaticInvocationFrame<ts.CallExpression> | StaticInvocationOccurrence<ts.CallExpression>,
): ReadonlyMap<ProductHandle, EvaluatedRegistrationCarrier> {
  const reader = 'evaluationKind' in invocation
    ? new StaticInvocationEvidenceExpressionReader(invocation.moduleKey, [invocation])
    : StaticInvocationEvidenceExpressionReader.forPreparedFrame(invocation.moduleKey, invocation);
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
