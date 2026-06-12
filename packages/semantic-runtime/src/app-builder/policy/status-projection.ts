import {
  type AppBuilderOntologyRowRef,
} from '../ontology/relation.js';
import {
  appBuilderSourceLoweringSurfaceKindsForTarget,
} from '../ontology/source-lowering-surface.js';
import type { AppBuilderOntologyStatus } from '../ontology/status.js';

/** Derive public ontology status from row-local declarations plus executable registries. */
export function appBuilderProjectedOntologyStatus(
  targetRef: AppBuilderOntologyRowRef,
  declaredStatus: AppBuilderOntologyStatus,
): AppBuilderOntologyStatus {
  return {
    ...declaredStatus,
    sourceLoweringImplemented: appBuilderSourceLoweringSurfaceKindsForTarget(targetRef).length > 0,
  };
}

