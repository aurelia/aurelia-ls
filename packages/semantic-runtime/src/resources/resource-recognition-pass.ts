import { performance } from 'node:perf_hooks';

import { AuthoredSourceTextCache } from '../kernel/authored-source-text.js';
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
  type ResourceRecognitionEmissionPhaseTiming,
} from './resource-recognition-kernel-emitter.js';
import type { ResourceRecognitionObservation } from './resource-observation.js';
import { SyntaxResourceRecognizer } from './syntax-resource-recognizer.js';

export type ResourceRecognitionPhaseName =
  | 'named-recognition'
  | 'syntax-recognition'
  | 'kernel-emission'
  | 'definition-convergence'
  | ResourceRecognitionEmissionPhaseTiming['name'];

export interface ResourceRecognitionPhaseTiming {
  readonly name: ResourceRecognitionPhaseName;
  readonly milliseconds: number;
}

export interface ResourceRecognitionProfile {
  readonly totalMilliseconds: number;
  readonly phases: readonly ResourceRecognitionPhaseTiming[];
}

/** Result of resource recognition over one evaluated source module. */
export class ResourceRecognitionResult {
  constructor(
    /** Source observations recognized before kernel emission. */
    readonly observations: readonly ResourceRecognitionObservation[],
    /** Kernel emission result carrying typed definition-header handles. */
    readonly emission: ResourceRecognitionKernelEmission,
    /** Full definition convergence result for headers whose metadata could be materialized. */
    readonly convergence: ResourceDefinitionConvergenceEmission,
    /** Phase timings for this source-level recognition pass. */
    readonly profile: ResourceRecognitionProfile,
  ) {}
}

/** Horizontal resource-recognition pass over one evaluated source module. */
export class ResourceRecognitionPass {
  private readonly namedResources = new NamedResourceRecognizer();
  private readonly syntaxResources = new SyntaxResourceRecognizer();
  private readonly sourceTextCache = new AuthoredSourceTextCache('');

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
    const started = performance.now();
    const phases: ResourceRecognitionPhaseTiming[] = [];
    const namedObservations = measureResourceRecognitionPhase(phases, 'named-recognition', () =>
      this.namedResources.recognize(context)
    );
    const syntaxObservations = measureResourceRecognitionPhase(phases, 'syntax-recognition', () =>
      this.syntaxResources.recognize(context)
    );
    const observations = [
      ...namedObservations,
      ...syntaxObservations,
    ];
    const emission = measureResourceRecognitionPhase(phases, 'kernel-emission', () =>
      new ResourceRecognitionKernelEmitter(store).emit(context, observations)
    );
    phases.push(...emission.profile.phases);
    const convergence = measureResourceRecognitionPhase(phases, 'definition-convergence', () =>
      new ResourceDefinitionConverger(store, this.sourceTextCache).converge(context, observations, emission)
    );
    return new ResourceRecognitionResult(
      observations,
      emission,
      convergence,
      {
        totalMilliseconds: performance.now() - started,
        phases,
      },
    );
  }
}

function measureResourceRecognitionPhase<TValue>(
  phases: ResourceRecognitionPhaseTiming[],
  name: ResourceRecognitionPhaseName,
  read: () => TValue,
): TValue {
  const started = performance.now();
  const value = read();
  phases.push({
    name,
    milliseconds: performance.now() - started,
  });
  return value;
}
