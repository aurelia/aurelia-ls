import type { KernelStore } from '../kernel/store.js';
import {
  ConfigurationKernelEmission,
  ConfigurationKernelEmitter,
} from './configuration-kernel-emitter.js';
import type { ConfigurationSequenceObservation } from './configuration-observation.js';
import type { ConfigurationRecognitionContext } from './configuration-recognition-context.js';
import { ConfigurationRecognitionProducer } from './configuration-recognition-producer.js';

/** Result of configuration recognition over one source module. */
export class ConfigurationRecognitionResult {
  constructor(
    /** Source observations recognized before kernel emission. */
    readonly observations: readonly ConfigurationSequenceObservation[],
    /** Kernel emission result carrying typed products and committed records. */
    readonly emission: ConfigurationKernelEmission,
  ) {}
}

/** Horizontal configuration-recognition pass over one evaluated source module. */
export class ConfigurationRecognitionPass {
  private readonly configuration = new ConfigurationRecognitionProducer();

  recognize(context: ConfigurationRecognitionContext): readonly ConfigurationSequenceObservation[] {
    return this.configuration.recognize(context);
  }

  recognizeAndEmit(
    store: KernelStore,
    context: ConfigurationRecognitionContext,
  ): ConfigurationRecognitionResult {
    const observations = this.recognize(context);
    const emission = new ConfigurationKernelEmitter(store).emit(context, observations);
    return new ConfigurationRecognitionResult(observations, emission);
  }
}
