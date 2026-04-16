import { resolveAnalysisProfile, type AnalysisProfile } from './analysis-profile.js';
import {
  collectCrossPartitionTypeRefSummaries,
  collectPartitionBindingPressure,
  collectPartitionBindingSeams,
  collectPartitionTypeRefPressure,
  type CrossPartitionTypeRefSummary,
  type PartitionBindingSeamSummary,
  type PartitionCouplingPressure,
} from './partition-coupling.js';
import type { DepsOutput } from './deps/schema.js';
import type { TypeRefsOutput } from './typerefs/schema.js';

export type CrossSubsystemTypeRefSummary = CrossPartitionTypeRefSummary;
export type BindingSeamSummary = PartitionBindingSeamSummary;
export type SubsystemCouplingPressure<TSeam> = PartitionCouplingPressure<TSeam>;

function subsystemProfile(
  repoPath: string,
  profile?: AnalysisProfile,
): AnalysisProfile {
  return profile ?? resolveAnalysisProfile({ repoPath });
}

export function collectCrossSubsystemTypeRefSummaries(
  typeRefs: TypeRefsOutput,
  scopePrefix?: string,
  profile?: AnalysisProfile,
): readonly CrossSubsystemTypeRefSummary[] {
  return collectCrossPartitionTypeRefSummaries(
    typeRefs,
    'source-area',
    scopePrefix,
    subsystemProfile(typeRefs.root, profile),
  );
}

export function collectBindingSeams(
  deps: DepsOutput,
  scopePrefix?: string,
  profile?: AnalysisProfile,
): readonly BindingSeamSummary[] {
  return collectPartitionBindingSeams(
    deps,
    'source-area',
    scopePrefix,
    subsystemProfile(deps.root, profile),
  );
}

export function collectSubsystemTypeRefPressure(
  typeRefs: TypeRefsOutput,
  scopePrefix?: string,
  profile?: AnalysisProfile,
): readonly SubsystemCouplingPressure<CrossSubsystemTypeRefSummary>[] {
  return collectPartitionTypeRefPressure(
    typeRefs,
    'source-area',
    scopePrefix,
    subsystemProfile(typeRefs.root, profile),
  );
}

export function collectSubsystemBindingPressure(
  deps: DepsOutput,
  scopePrefix?: string,
  profile?: AnalysisProfile,
): readonly SubsystemCouplingPressure<BindingSeamSummary>[] {
  return collectPartitionBindingPressure(
    deps,
    'source-area',
    scopePrefix,
    subsystemProfile(deps.root, profile),
  );
}
