import type { AnalysisViews } from './analysis-views.js';
import type {
  InquiryProvenanceEntry,
  WorldFrame,
} from './inquiry-model.js';

export const ANALYSIS_SURFACE_KINDS = [
  'deps',
  'typerefs',
  'exports',
] as const;

export type AnalysisSurfaceKind =
  typeof ANALYSIS_SURFACE_KINDS[number];

export interface HostedWorldFrameOptions {
  readonly repoPath?: string;
  readonly target?: string;
  readonly profilePath?: string;
  readonly regimeAnchor?: WorldFrame['regimeAnchor'];
  readonly partiality?: WorldFrame['partiality'];
  readonly freshness?: WorldFrame['freshness'];
}

export function createHostedWorldFrame(
  options: HostedWorldFrameOptions = {},
): WorldFrame {
  return {
    ...(options.repoPath ? { repoPath: options.repoPath } : {}),
    ...(options.target ? { target: options.target } : {}),
    ...(options.profilePath ? { profilePath: options.profilePath } : {}),
    regimeAnchor: options.regimeAnchor ?? 'hosted',
    partiality: options.partiality ?? 'complete',
    freshness: options.freshness ?? 'live',
  };
}

export function defaultWorldFrameForAnalysis(
  analysis: AnalysisViews,
  worldFrame: WorldFrame | undefined,
): WorldFrame {
  return createHostedWorldFrame({
    repoPath: worldFrame?.repoPath ?? analysis.root,
    target: worldFrame?.target ?? 'current',
    ...(worldFrame?.profilePath ? { profilePath: worldFrame.profilePath } : {}),
    regimeAnchor: worldFrame?.regimeAnchor,
    partiality: worldFrame?.partiality,
    freshness: worldFrame?.freshness ?? (analysis.source === 'hosted-analysis' ? 'live' : 'snapshot'),
  });
}

export function createAnalysisProvenanceEntry(
  kind: AnalysisSurfaceKind,
  generatedAt: string,
  sourceCommit: string,
  freshness: WorldFrame['freshness'],
): InquiryProvenanceEntry {
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
  freshness: WorldFrame['freshness'] | undefined,
): string {
  return freshness === 'live' ? 'current analysis' : 'current materialized analysis';
}

export function describeAnalysisSurfaceEvidence(
  freshness: WorldFrame['freshness'] | undefined,
  kinds: readonly AnalysisSurfaceKind[],
): string {
  const joined = kinds.join(', ');
  return freshness === 'live'
    ? `${joined} analysis views`
    : `materialized ${joined} analysis views`;
}
