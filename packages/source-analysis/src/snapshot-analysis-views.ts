import type { AnalysisViews } from './analysis-views.js';
import { createAnalysisViews } from './analysis-views.js';
import { loadCurrentSnapshots } from './current-snapshots.js';
import type { LoadedCurrentSnapshotSet } from './snapshot-contract.js';

export function loadCurrentAnalysisViews(
  target?: string,
  waitMs = 0,
): AnalysisViews {
  return createAnalysisViewsFromSnapshots(loadCurrentSnapshots(target, waitMs));
}

export function createAnalysisViewsFromSnapshots(
  snapshots: LoadedCurrentSnapshotSet,
): AnalysisViews {
  return createAnalysisViews({
    source: 'snapshot-contract',
    deps: snapshots.deps,
    typeRefs: snapshots.typeRefs,
    exports: snapshots.exports,
    ...(snapshots.support ? { support: snapshots.support } : {}),
  });
}

export function coerceAnalysisViews(
  views: AnalysisViews | LoadedCurrentSnapshotSet,
): AnalysisViews {
  return isAnalysisViews(views)
    ? views
    : createAnalysisViewsFromSnapshots(views);
}

function isAnalysisViews(
  value: AnalysisViews | LoadedCurrentSnapshotSet,
): value is AnalysisViews {
  return 'source' in value && 'root' in value;
}
