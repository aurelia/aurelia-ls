import ts from 'typescript';
import { SourceSpanAddress, type SourceFileAddress } from '../kernel/address.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { KernelStoreReadView } from '../kernel/store.js';
import { StaticEvaluationSessionFork } from '../evaluation/evaluation-session.js';
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

/** Source-owned index from a registry admission to the `register(container)` body steps it can safely spend. */
export class RegistryBodyStepIndex {
  constructor(
    private readonly stepsByAdmissionProduct = new Map<ProductHandle, readonly ConfigurationStep[]>(),
    private readonly interpretedAdmissionProducts = new Set<ProductHandle>(),
  ) {}

  stepsForAdmission(admission: RegistrationAdmissionProduct): readonly ConfigurationStep[] {
    return this.stepsByAdmissionProduct.get(admission.productHandle) ?? [];
  }

  bodyInterpretedForAdmission(admission: RegistrationAdmissionProduct): boolean {
    return this.interpretedAdmissionProducts.has(admission.productHandle);
  }

  admissionProductHandlesForAdmission(admission: RegistrationAdmissionProduct): readonly ProductHandle[] {
    return this.stepsForAdmission(admission).flatMap((step) => step.registrationAdmissionProductHandles);
  }
}

export function buildRegistryBodyStepIndex(
  records: KernelStoreReadView,
  configuration: ConfigurationKernelEmission,
  evaluation: StaticProjectEvaluationResult,
): RegistryBodyStepIndex {
  const registrySequences = registrySequenceSpans(records, configuration);
  if (registrySequences.length === 0) {
    return new RegistryBodyStepIndex();
  }

  const stepsByAdmission = new Map<ProductHandle, readonly ConfigurationStep[]>();
  const interpretedAdmissions = new Set<ProductHandle>();
  for (const admission of configuration.registrationAdmissions) {
    if (!(admission instanceof RegistryRegistrationAdmission)) {
      continue;
    }
    const valueSpan = readSourceSpan(records, admission.registryValue?.addressHandle ?? admission.sourceAddressHandle);
    if (valueSpan == null) {
      continue;
    }
    const ownedSequences = registrySequences.filter((sequence) => sourceSpansEqual(valueSpan, sequence.span));
    if (ownedSequences.length === 0) {
      continue;
    }
    const execution = executeRegistryAdmission(
      configuration.evaluationBindings.registrationValueForAdmission(admission.productHandle),
      admission,
      evaluation,
    );
    if (execution == null) {
      continue;
    }
    const matched = matchReachedRegisterCalls(
      records,
      evaluation,
      ownedSequences.flatMap((sequence) => sequence.steps),
      execution.registerCalls,
    );
    stepsByAdmission.set(admission.productHandle, matched.steps);
    if (execution.closed && matched.complete) {
      interpretedAdmissions.add(admission.productHandle);
    }
  }
  return new RegistryBodyStepIndex(stepsByAdmission, interpretedAdmissions);
}

interface RegistryAdmissionExecution {
  readonly registerCalls: readonly import('../evaluation/invocation.js').StaticInvocationOccurrence<ts.CallExpression>[];
  readonly closed: boolean;
}

function executeRegistryAdmission(
  originalValue: EvaluationValue | null,
  admission: RegistryRegistrationAdmission,
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

function matchReachedRegisterCalls(
  records: KernelStoreReadView,
  evaluation: StaticProjectEvaluationResult,
  inventory: readonly ConfigurationStep[],
  calls: readonly import('../evaluation/invocation.js').StaticInvocationOccurrence<ts.CallExpression>[],
): { readonly steps: readonly ConfigurationStep[]; readonly complete: boolean } {
  const sourceFileHandles = evaluatedSourceFileHandles(evaluation);
  const remainingBySource = new Map<string, number>();
  for (const event of calls) {
    const key = sourceNodeKey(event.node, sourceFileHandles);
    if (key != null) {
      remainingBySource.set(key, (remainingBySource.get(key) ?? 0) + 1);
    }
  }
  const steps: ConfigurationStep[] = [];
  for (const step of inventory) {
    const key = sourceAddressKey(records, step.sourceAddressHandle);
    const remaining = key == null ? 0 : remainingBySource.get(key) ?? 0;
    if (key == null || remaining === 0) {
      continue;
    }
    steps.push(step);
    if (remaining === 1) {
      remainingBySource.delete(key);
    } else {
      remainingBySource.set(key, remaining - 1);
    }
  }
  return { steps, complete: remainingBySource.size === 0 };
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

function sourceSpansEqual(left: SourceSpanAddress, right: SourceSpanAddress): boolean {
  return left.fileHandle === right.fileHandle
    && left.start === right.start
    && left.end === right.end;
}

function registrySequenceSpans(
  records: KernelStoreReadView,
  configuration: ConfigurationKernelEmission,
): readonly {
  readonly sequence: ConfigurationSequence;
  readonly span: SourceSpanAddress;
  readonly steps: readonly ConfigurationStep[];
}[] {
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
