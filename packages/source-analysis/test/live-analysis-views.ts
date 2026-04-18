import {
  createAnalysisViews,
  type AnalysisViews,
} from '../src/analysis-views.js';
import { loadCurrentSnapshots } from '../src/current-snapshots.js';
import {
  generateDepsAnalysisFromRuntime,
} from '../src/deps/analyze.js';
import {
  generateExportsAnalysisFromRuntime,
} from '../src/exports/analyze.js';
import { createRepoSession } from '../src/repo-session.js';
import {
  buildStructuralClaimGraph,
} from '../src/structural-claim-graph.js';
import {
  scanParsedTsconfigSourceFiles,
} from '../src/tsconfig-source-files.js';
import {
  generateTypeRefsAnalysisFromRuntime,
} from '../src/typerefs/analyze.js';

let cachedAnalysis: AnalysisViews | null = null;
let cachedFingerprint: string | null = null;

export function loadCurrentLiveAnalysisViews(): AnalysisViews {
  const snapshots = loadCurrentSnapshots();
  const fingerprint = [
    snapshots.deps.root,
    snapshots.deps.generated_at,
    snapshots.typeRefs.generated_at,
    snapshots.exports.generated_at,
    snapshots.deps.source_commit,
    snapshots.typeRefs.source_commit,
    snapshots.exports.source_commit,
  ].join('\0');
  if (cachedAnalysis && cachedFingerprint === fingerprint) {
    return cachedAnalysis;
  }
  const session = createRepoSession({
    repoPath: snapshots.deps.root,
    target: snapshots.deps.profile.target,
    ...(snapshots.deps.profile.profilePath
      ? { profilePath: snapshots.deps.profile.profilePath }
      : {}),
  });
  const sourceFileScan = scanParsedTsconfigSourceFiles(session);
  const structuralRuntime = buildStructuralClaimGraph(session, { sourceFileScan });
  const deps = generateDepsAnalysisFromRuntime(
    session,
    structuralRuntime,
    sourceFileScan,
  ).output;
  const typeRefs = generateTypeRefsAnalysisFromRuntime(
    session,
    structuralRuntime,
    sourceFileScan,
  ).output;
  const exports = generateExportsAnalysisFromRuntime(
    session,
    structuralRuntime,
  ).output;

  cachedAnalysis = createAnalysisViews({
    source: 'hosted-analysis',
    deps,
    typeRefs,
    exports,
    repoSession: session,
    structuralRuntime,
    sourceFileScan,
    repoSourceFiles: session.listRepoSourceFiles(),
    ...(snapshots.support ? { support: snapshots.support } : {}),
  });
  cachedFingerprint = fingerprint;
  return cachedAnalysis;
}

export function resetCurrentLiveAnalysisViewsCache(): void {
  cachedAnalysis = null;
  cachedFingerprint = null;
}
