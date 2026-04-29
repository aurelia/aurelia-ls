import type { KernelStore } from '../kernel/store.js';
import { NamedResourceRecognitionProducer } from './named-resource-recognition-producer.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import {
  ResourceDefinitionConvergenceProducer,
  type ResourceDefinitionConvergenceEmission,
} from './resource-definition-convergence-producer.js';
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
    /** Full definition convergence result for headers whose metadata could be materialized. */
    readonly convergence: ResourceDefinitionConvergenceEmission,
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
    const convergence = new ResourceDefinitionConvergenceProducer(store).converge(context, observations, emission);
    return new ResourceRecognitionResult(observations, emission, convergence);
  }
}
