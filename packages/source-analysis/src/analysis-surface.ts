import type { AnalysisViews } from './analysis-views.js';
import type {
  ExecutionPosture,
  InquiryCarrierProvenanceEntry,
  WorldFrame,
  WorldTargeting,
} from './inquiry-model.js';
import {
  composeWorldFrame,
  executionPostureFromFrame,
  worldTargetingFromFrame,
} from './inquiry-model.js';

export const ANALYSIS_SURFACE_KINDS = [
  'deps',
  'typerefs',
  'exports',
] as const;

export type AnalysisSurfaceKind =
  typeof ANALYSIS_SURFACE_KINDS[number];

export interface HostedWorldFrameOptions {
  readonly targeting?: WorldTargeting;
  readonly posture?: ExecutionPosture;
}

export function createHostedWorldFrame(
  options: HostedWorldFrameOptions = {},
): WorldFrame {
  const targeting = options.targeting ?? {};
  const posture = options.posture ?? {};
  return composeWorldFrame(targeting, {
    regimeAnchor: posture.regimeAnchor ?? 'hosted',
    partiality: posture.partiality ?? 'complete',
    freshness: posture.freshness ?? 'live',
  });
}

export function defaultWorldFrameForAnalysis(
  analysis: AnalysisViews,
  worldFrame: WorldFrame | undefined,
): WorldFrame {
  const targeting = worldTargetingFromFrame(worldFrame);
  const posture = executionPostureFromFrame(worldFrame);
  return createHostedWorldFrame({
    targeting: {
      repoPath: targeting.repoPath ?? analysis.root,
      target: targeting.target ?? 'current',
      ...(targeting.profilePath ? { profilePath: targeting.profilePath } : {}),
    },
    posture: {
      regimeAnchor: posture.regimeAnchor,
      partiality: posture.partiality,
      freshness: posture.freshness ?? (analysis.source === 'hosted-analysis' ? 'live' : 'snapshot'),
    },
  });
}

export function createAnalysisProvenanceEntry(
  kind: AnalysisSurfaceKind,
  generatedAt: string,
  sourceCommit: string,
  freshness: ExecutionPosture['freshness'],
): InquiryCarrierProvenanceEntry {
  if (freshness === 'live') {
    return {
      kind: 'host',
      label: `${kind} analysis view`,
      ref: generatedAt,
      detail: `source_commit=${sourceCommit}`,
    };
  }

  return {
    kind: 'snapshot',
    label: `${kind} snapshot`,
    ref: generatedAt,
    detail: `source_commit=${sourceCommit}`,
  };
}

export function describeAnalysisSurface(
  freshness: ExecutionPosture['freshness'] | undefined,
): string {
  return freshness === 'live' ? 'current analysis' : 'current materialized analysis';
}

export function describeAnalysisSurfaceEvidence(
  freshness: ExecutionPosture['freshness'] | undefined,
  kinds: readonly AnalysisSurfaceKind[],
): string {
  const joined = kinds.join(', ');
  return freshness === 'live'
    ? `${joined} analysis views`
    : `materialized ${joined} analysis views`;
}
