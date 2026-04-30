import type { KernelStore } from '../kernel/store.js';
import { NamedResourceRecognizer } from './named-resource-recognizer.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import {
  ResourceDefinitionConverger,
  type ResourceDefinitionConvergenceEmission,
} from './resource-definition-converger.js';
import {
  ResourceRecognitionKernelEmitter,
  type ResourceRecognitionKernelEmission,
} from './resource-recognition-kernel-emitter.js';
import type { ResourceRecognitionObservation } from './resource-observation.js';
import { SyntaxResourceRecognizer } from './syntax-resource-recognizer.js';

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
  private readonly namedResources = new NamedResourceRecognizer();
  private readonly syntaxResources = new SyntaxResourceRecognizer();

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
    const convergence = new ResourceDefinitionConverger(store).converge(context, observations, emission);
    return new ResourceRecognitionResult(observations, emission, convergence);
  }
}
