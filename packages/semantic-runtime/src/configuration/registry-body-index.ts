import ts from 'typescript';
import {
  SourceSpanAddress,
  sourceSpansEqual,
  type SourceFileAddress,
  type SourceSpanLocus,
} from '../kernel/address.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { KernelStoreReadView } from '../kernel/store.js';
import { StaticEvaluationSessionFork } from '../evaluation/evaluation-session.js';
import { StaticInvocationEvidenceExpressionReader } from '../evaluation/expression-reader.js';
import type {
  EvaluatedProjectSource,
  StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import { readStaticOwnProperty } from '../evaluation/property-access.js';
import { EvaluationOpenSeamKind } from '../evaluation/seams.js';
import {
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationValueKind,
  type EvaluationFunctionValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import { normalizeModuleKey } from '../evaluation/module-graph.js';
import { executeDiRegistryFunction } from '../di/registry-execution.js';
import {
  RegistryRegistrationAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import type { ConfigurationKernelEmission } from './configuration-kernel-emitter.js';
import {
  ConfigurationSequenceKind,
  type ConfigurationSequence,
  type ConfigurationStep,
} from './configuration-sequence.js';

/** One path-proven execution of a source-owned registry-body step. */
export class RegistryBodyStepExecution {
  constructor(
    readonly step: ConfigurationStep,
    private readonly runtimeValuesByAdmissionProduct: ReadonlyMap<ProductHandle, EvaluationValue>,
  ) {}

  runtimeValueForAdmission(admission: RegistrationAdmissionProduct): EvaluationValue | null {
    return this.runtimeValuesByAdmissionProduct.get(admission.productHandle) ?? null;
  }
}

/** Candidate-local result of executing one exact registry value. */
export class RegistryAdmissionBodyExecution {
  constructor(
    readonly steps: readonly RegistryBodyStepExecution[],
    readonly interpreted: boolean,
  ) {}
}

/** Source-owned registry inventory joined to exact candidate-local execution evidence. */
export class RegistryBodyStepIndex {
  constructor(
    private readonly records: KernelStoreReadView | null = null,
    private readonly configuration: ConfigurationKernelEmission | null = null,
    private readonly evaluation: StaticProjectEvaluationResult | null = null,
    private readonly registrySequences: readonly RegistrySequenceSpan[] = [],
    private readonly admissionsByProduct: ReadonlyMap<ProductHandle, RegistrationAdmissionProduct> = new Map(),
  ) {}

  executeAdmission(
    admission: RegistrationAdmissionProduct,
    runtimeValue: EvaluationValue | null,
  ): RegistryAdmissionBodyExecution {
    if (
      !(admission instanceof RegistryRegistrationAdmission)
      || this.records == null
      || this.configuration == null
      || this.evaluation == null
    ) {
      return new RegistryAdmissionBodyExecution([], false);
    }
    const valueSpan = runtimeValue == null
      ? null
      : registryRuntimeValueSpan(runtimeValue, this.evaluation);
    const ownedValueSpan = valueSpan ?? readSourceSpan(
      this.records,
      admission.registryValue?.addressHandle ?? admission.sourceAddressHandle,
    );
    if (ownedValueSpan == null) {
      return new RegistryAdmissionBodyExecution([], false);
    }
    const ownedSequences = this.registrySequences.filter((sequence) => sourceSpansEqual(ownedValueSpan, sequence.span));
    if (ownedSequences.length === 0) {
      return new RegistryAdmissionBodyExecution([], false);
    }
    const originalValue = runtimeValue
      ?? this.configuration.evaluationBindings.registrationValueForAdmission(admission.productHandle);
    const execution = executeRegistryAdmission(originalValue, this.evaluation);
    if (execution == null) {
      return new RegistryAdmissionBodyExecution([], false);
    }
    const matched = matchReachedRegisterCalls(
      this.records,
      this.evaluation,
      ownedSequences.flatMap((sequence) => sequence.steps),
      execution.registerCalls,
    );
    return new RegistryAdmissionBodyExecution(
      matched.steps.map(({ step, invocation }) => new RegistryBodyStepExecution(
        step,
        runtimeValuesForStepAdmissions(
          this.records!,
          this.evaluation!,
          this.admissionsByProduct,
          step,
          invocation,
        ),
      )),
      execution.closed && matched.complete,
    );
  }
}

export function buildRegistryBodyStepIndex(
  records: KernelStoreReadView,
  configuration: ConfigurationKernelEmission,
  evaluation: StaticProjectEvaluationResult,
): RegistryBodyStepIndex {
  const registrySequences = registrySequenceSpans(records, configuration);
  return new RegistryBodyStepIndex(
    records,
    configuration,
    evaluation,
    registrySequences,
    new Map(configuration.registrationAdmissions.map((admission) => [admission.productHandle, admission])),
  );
}

interface RegistryAdmissionExecution {
  readonly registerCalls: readonly import('../evaluation/invocation.js').StaticInvocationOccurrence<ts.CallExpression>[];
  readonly closed: boolean;
}

function executeRegistryAdmission(
  originalValue: EvaluationValue | null,
  evaluation: StaticProjectEvaluationResult,
): RegistryAdmissionExecution | null {
  const originalRegister = registryRegisterFunction(originalValue);
  if (originalValue == null || originalRegister == null) {
    return null;
  }
  const source = evaluatedSourceForFunction(evaluation, originalRegister);
  if (source == null) {
    return null;
  }
  const session = new StaticEvaluationSessionFork(source.evaluation.runtimeHost);
  const sourceEvaluation = session.forkModuleEvaluation(source.evaluation);
  const registryValue = session.forkValue(originalValue);
  const registerFunction = registryRegisterFunction(registryValue);
  if (registerFunction == null) {
    return null;
  }
  const containerValue = new EvaluationObjectValue(new Map(), false, registerFunction.declaration);
  const execution = executeDiRegistryFunction(
    registerFunction,
    registryValue,
    containerValue,
    registerFunction.declaration,
    sourceEvaluation.policy,
    sourceEvaluation.runtimeHost,
    (frame, host) => frame.propertyKey === 'register'
      ? containerValue
      : host.unknown(
          `Registry execution reached unsupported container.${frame.propertyKey ?? '<computed>'}(...).`,
          frame.node,
          frame.moduleKey,
          EvaluationOpenSeamKind.DynamicCall,
        ),
  );
  return {
    registerCalls: execution.handledInvocations.filter((invocation) => invocation.propertyKey === 'register'),
    closed: execution.openSeams.length === 0,
  };
}

function registryRegisterFunction(value: EvaluationValue | null): EvaluationFunctionValue | null {
  if (
    value?.kind !== EvaluationValueKind.Object
    && value?.kind !== EvaluationValueKind.Class
    && value?.kind !== EvaluationValueKind.Function
    && value?.kind !== EvaluationValueKind.Instance
  ) {
    return null;
  }
  const property = readStaticOwnProperty(value, 'register');
  return property?.state === EvaluationObjectPropertyState.Closed
    && property.value.kind === EvaluationValueKind.Function
    ? property.value
    : null;
}

function evaluatedSourceForFunction(
  evaluation: StaticProjectEvaluationResult,
  registerFunction: EvaluationFunctionValue,
): EvaluatedProjectSource | null {
  const normalizedModule = normalizeModuleKey(registerFunction.environment.moduleKey);
  const normalizedSource = normalizeModuleKey(registerFunction.declaration.getSourceFile().fileName);
  return evaluation.readEvaluatedSources().find((source) =>
    normalizeModuleKey(source.moduleKey) === normalizedModule
    || normalizeModuleKey(source.sourceFile.fileName) === normalizedSource
  ) ?? null;
}

function registryRuntimeValueSpan(
  value: EvaluationValue,
  evaluation: StaticProjectEvaluationResult,
): SourceSpanLocus | null {
  const node = value.kind === EvaluationValueKind.Instance
    ? value.classValue.declaration
    : value.kind === EvaluationValueKind.Object
      || value.kind === EvaluationValueKind.Class
      || value.kind === EvaluationValueKind.Function
      ? value.node
      : null;
  if (node == null) {
    return null;
  }
  const sourceFile = node.getSourceFile();
  const fileHandle = evaluatedSourceFileHandles(evaluation).get(normalizeModuleKey(sourceFile.fileName)) ?? null;
  return fileHandle == null
    ? null
    : { fileHandle, start: node.getStart(sourceFile), end: node.end };
}

function matchReachedRegisterCalls(
  records: KernelStoreReadView,
  evaluation: StaticProjectEvaluationResult,
  inventory: readonly ConfigurationStep[],
  calls: readonly import('../evaluation/invocation.js').StaticInvocationOccurrence<ts.CallExpression>[],
): { readonly steps: readonly ReachedRegistryBodyStep[]; readonly complete: boolean } {
  const sourceFileHandles = evaluatedSourceFileHandles(evaluation);
  const inventoryBySource = new Map<string, ConfigurationStep[]>();
  for (const step of inventory) {
    const key = sourceAddressKey(records, step.sourceAddressHandle);
    if (key == null) {
      continue;
    }
    const existing = inventoryBySource.get(key);
    if (existing == null) {
      inventoryBySource.set(key, [step]);
    } else {
      existing.push(step);
    }
  }

  const steps: ReachedRegistryBodyStep[] = [];
  let complete = true;
  for (const event of calls) {
    const key = sourceNodeKey(event.node, sourceFileHandles);
    const candidates = key == null ? null : inventoryBySource.get(key) ?? null;
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

function runtimeValuesForStepAdmissions(
  records: KernelStoreReadView,
  evaluation: StaticProjectEvaluationResult,
  admissionsByProduct: ReadonlyMap<ProductHandle, RegistrationAdmissionProduct>,
  step: ConfigurationStep,
  invocation: import('../evaluation/invocation.js').StaticInvocationOccurrence<ts.CallExpression>,
): ReadonlyMap<ProductHandle, EvaluationValue> {
  const sourceFileHandles = evaluatedSourceFileHandles(evaluation);
  const reader = new StaticInvocationEvidenceExpressionReader(invocation.moduleKey, [invocation]);
  const valuesBySource = new Map<string, EvaluationValue>();
  const visit = (node: ts.Node): void => {
    if (ts.isExpression(node)) {
      const key = sourceNodeKey(node, sourceFileHandles);
      const value = reader.evaluateExpression(node).value;
      if (key != null && value != null) {
        valuesBySource.set(key, value);
      }
    }
    ts.forEachChild(node, visit);
  };
  invocation.node.arguments.forEach(visit);

  const result = new Map<ProductHandle, EvaluationValue>();
  for (const productHandle of step.registrationAdmissionProductHandles) {
    const admission = admissionsByProduct.get(productHandle) ?? null;
    const key = admission == null ? null : sourceAddressKey(records, admission.sourceAddressHandle);
    const value = key == null ? null : valuesBySource.get(key) ?? null;
    if (value != null) {
      result.set(productHandle, value);
    }
  }
  return result;
}

function evaluatedSourceFileHandles(
  evaluation: StaticProjectEvaluationResult,
): ReadonlyMap<string, SourceFileAddress['handle']> {
  const result = new Map<string, SourceFileAddress['handle']>();
  for (const source of evaluation.readEvaluatedSources()) {
    const handle = source.admission.addressHandle;
    result.set(normalizeModuleKey(source.moduleKey), handle);
    result.set(normalizeModuleKey(source.sourceFile.fileName), handle);
    result.set(normalizeModuleKey(source.admission.path), handle);
  }
  return result;
}

function sourceNodeKey(
  node: ts.Node,
  sourceFileHandles: ReadonlyMap<string, SourceFileAddress['handle']>,
): string | null {
  const sourceFile = node.getSourceFile();
  const fileHandle = sourceFileHandles.get(normalizeModuleKey(sourceFile.fileName)) ?? null;
  return fileHandle == null ? null : `${fileHandle}:${node.getStart(sourceFile)}:${node.end}`;
}

function sourceAddressKey(
  records: KernelStoreReadView,
  handle: SourceSpanAddress['handle'] | null,
): string | null {
  const span = handle == null ? null : readSourceSpan(records, handle);
  return span == null ? null : `${span.fileHandle}:${span.start}:${span.end}`;
}

interface RegistrySequenceSpan {
  readonly sequence: ConfigurationSequence;
  readonly span: SourceSpanAddress;
  readonly steps: readonly ConfigurationStep[];
}

function registrySequenceSpans(
  records: KernelStoreReadView,
  configuration: ConfigurationKernelEmission,
): readonly RegistrySequenceSpan[] {
  const stepsBySequence = stepsBySequenceProduct(configuration.steps);
  const result: {
    readonly sequence: ConfigurationSequence;
    readonly span: SourceSpanAddress;
    readonly steps: readonly ConfigurationStep[];
  }[] = [];
  for (const sequence of configuration.sequences) {
    if (sequence.sequenceKind !== ConfigurationSequenceKind.Registry) {
      continue;
    }
    const span = readSourceSpan(records, sequence.sourceAddressHandle);
    if (span == null) {
      continue;
    }
    const steps = stepsBySequence.get(sequence.productHandle) ?? [];
    result.push({ sequence, span, steps });
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

function readSourceSpan(
  records: KernelStoreReadView,
  handle: SourceSpanAddress['handle'] | null | undefined,
): SourceSpanAddress | null {
  if (handle == null) {
    return null;
  }
  const address = records.read(handle);
  return address instanceof SourceSpanAddress ? address : null;
}
