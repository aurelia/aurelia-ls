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

export function loadCurrentLiveAnalysisViews(): AnalysisViews {
  const snapshots = loadCurrentSnapshots();
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

  return createAnalysisViews({
    source: 'hosted-analysis',
    deps,
    typeRefs,
    exports,
    structuralRuntime,
    sourceFileScan,
    ...(snapshots.support ? { support: snapshots.support } : {}),
  });
}
