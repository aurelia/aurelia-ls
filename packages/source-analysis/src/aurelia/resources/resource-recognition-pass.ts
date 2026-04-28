import type { KernelStore } from '../kernel/store.js';
import { NamedResourceRecognitionProducer } from './named-resource-recognition-producer.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import {
  ResourceRecognitionKernelEmitter,
  type ResourceRecognitionKernelEmission,
} from './resource-recognition-kernel-emitter.js';
import type { ResourceRecognitionObservation } from './resource-observation.js';
import { SyntaxResourceRecognitionProducer } from './syntax-resource-recognition-producer.js';

/** Result of resource recognition over one evaluated source module. */
export class ResourceRecognitionResult {
  constructor(
    /** Source observations recognized before kernel emission. */
    readonly observations: readonly ResourceRecognitionObservation[],
    /** Kernel emission result carrying typed definition-header handles. */
    readonly emission: ResourceRecognitionKernelEmission,
  ) {}
}

/** Horizontal resource-recognition pass over one evaluated source module. */
export class ResourceRecognitionPass {
  private readonly namedResources = new NamedResourceRecognitionProducer();
  private readonly syntaxResources = new SyntaxResourceRecognitionProducer();

  recognize(context: ResourceRecognitionContext): readonly ResourceRecognitionObservation[] {
    return [
      ...this.namedResources.recognize(context),
      ...this.syntaxResources.recognize(context),
    ];
  }

  recognizeAndEmit(
    store: KernelStore,
    context: ResourceRecognitionContext,
  ): ResourceRecognitionResult {
    const observations = this.recognize(context);
    const emission = new ResourceRecognitionKernelEmitter(store).emit(context, observations);
    return new ResourceRecognitionResult(observations, emission);
  }
}
