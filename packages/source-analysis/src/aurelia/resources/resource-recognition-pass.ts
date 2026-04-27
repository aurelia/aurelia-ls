import type { KernelStore } from '../kernel/store.js';
import { NamedResourceRecognitionProducer } from './named-resource-recognition-producer.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import { ResourceRecognitionKernelEmitter } from './resource-recognition-kernel-emitter.js';
import type { ResourceRecognitionObservation } from './resource-observation.js';
import { SyntaxResourceRecognitionProducer } from './syntax-resource-recognition-producer.js';

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
  ): readonly ResourceRecognitionObservation[] {
    const observations = this.recognize(context);
    new ResourceRecognitionKernelEmitter(store).emit(context, observations);
    return observations;
  }
}
