import { sourceSpanContains, type SourceSpanAddress } from '../kernel/address.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
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
  store: KernelStore,
  configuration: ConfigurationKernelEmission,
): RegistryBodyStepIndex {
  const registrySequences = registrySequenceSpans(store, configuration);
  if (registrySequences.length === 0) {
    return new RegistryBodyStepIndex();
  }

  const stepsByAdmission = new Map<ProductHandle, readonly ConfigurationStep[]>();
  const interpretedAdmissions = new Set<ProductHandle>();
  for (const admission of configuration.registrationAdmissions) {
    if (!(admission instanceof RegistryRegistrationAdmission)) {
      continue;
    }
    const valueSpan = readSourceSpan(store, admission.registryValue?.addressHandle ?? admission.sourceAddressHandle);
    if (valueSpan == null) {
      continue;
    }
    const steps = registrySequences
      .filter((sequence) => sourceSpanContains(valueSpan, sequence.span))
      .flatMap((sequence) => sequence.steps);
    if (registrySequences.some((sequence) => sourceSpanContains(valueSpan, sequence.span))) {
      interpretedAdmissions.add(admission.productHandle);
      stepsByAdmission.set(admission.productHandle, steps);
    }
  }
  return new RegistryBodyStepIndex(stepsByAdmission, interpretedAdmissions);
}

function registrySequenceSpans(
  store: KernelStore,
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
    const span = readSourceSpan(store, sequence.sourceAddressHandle);
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
  store: KernelStore,
  handle: SourceSpanAddress['handle'] | null | undefined,
): SourceSpanAddress | null {
  if (handle == null) {
    return null;
  }
  const address = store.readAddress(handle);
  return address?.kind === 'source-span-address' ? address : null;
}
