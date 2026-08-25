import { DefaultEvaluationModuleResolutionPolicy } from '../evaluation/module-host.js';
import {
  StaticProjectEvaluationComputationPreparation,
  StaticProjectEvaluationComputationProfile,
  StaticProjectEvaluationOptions,
} from '../evaluation/project-evaluation.js';
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

export const enum AureliaProjectEvaluationProfileKind {
  /** App-source evaluation with Aurelia configuration, registration, DI, and framework intrinsics. */
  App = 'aurelia-app',
}

export const aureliaAppProjectEvaluationProfile = new StaticProjectEvaluationComputationProfile(
  AureliaProjectEvaluationProfileKind.App,
  '1',
  'Aurelia app-source static evaluation with configuration and DI intrinsics.',
  () => new StaticProjectEvaluationComputationPreparation(aureliaProjectEvaluationOptions(), null),
);
