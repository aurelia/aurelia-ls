import type { ProjectBootFrame } from '../boot/frames.js';
import { DefaultEvaluationModuleResolutionPolicy } from '../evaluation/module-host.js';
import {
  StaticProjectEvaluationOptions,
  StaticProjectEvaluationPass,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import type { KernelStore } from '../kernel/store.js';
import {
  aureliaExternalEvaluationValueResolver,
  aureliaStaticEvaluationRuntimeHost,
} from './aurelia-evaluation-runtime.js';
import { aureliaConfigurationEvaluationPolicy } from './evaluation-policy.js';

export function aureliaProjectEvaluationOptions(): StaticProjectEvaluationOptions {
  return new StaticProjectEvaluationOptions(
    aureliaConfigurationEvaluationPolicy,
    aureliaStaticEvaluationRuntimeHost,
    aureliaExternalEvaluationValueResolver,
    {
      ...DefaultEvaluationModuleResolutionPolicy,
      admitSourceShippedPackageEntrypoints: true,
    },
  );
}

export function evaluateAureliaProject(
  project: ProjectBootFrame,
): StaticProjectEvaluationResult {
  return new StaticProjectEvaluationPass().evaluate(
    project,
    aureliaProjectEvaluationOptions(),
  );
}

export function evaluateAndEmitAureliaProject(
  store: KernelStore,
  project: ProjectBootFrame,
): StaticProjectEvaluationResult {
  return new StaticProjectEvaluationPass().evaluateAndEmit(
    store,
    project,
    aureliaProjectEvaluationOptions(),
  );
}
