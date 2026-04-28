import type { KernelStore } from '../kernel/store.js';
import {
  RegistrationKernelEmission,
  RegistrationKernelEmitter,
  type RegistrationEmissionContext,
} from './registration-kernel-emitter.js';
import type { RegistrationAdmissionObservation } from './registration-observation.js';
import { RegistrationFactoryRecognitionProducer } from './registration-recognition-producer.js';

/** Result of registration recognition over one source module. */
export class RegistrationRecognitionResult {
  constructor(
    /** Source observations recognized before kernel emission. */
    readonly observations: readonly RegistrationAdmissionObservation[],
    /** Kernel emission result carrying typed products and committed records. */
    readonly emission: RegistrationKernelEmission,
  ) {}
}

/** Horizontal registration-recognition pass over one evaluated source module. */
export class RegistrationRecognitionPass {
  private readonly registrationFactories = new RegistrationFactoryRecognitionProducer();

  recognize(context: RegistrationEmissionContext): readonly RegistrationAdmissionObservation[] {
    return this.registrationFactories.recognize(context);
  }

  recognizeAndEmit(
    store: KernelStore,
    context: RegistrationEmissionContext,
  ): RegistrationRecognitionResult {
    const observations = this.recognize(context);
    const emission = new RegistrationKernelEmitter(store).emit(context, observations);
    return new RegistrationRecognitionResult(observations, emission);
  }
}
