import { loadCurrentLiveAnalysisViews } from './live-analysis-views.js';

try {
  loadCurrentLiveAnalysisViews();
} catch {
  // Some source-analysis tests create isolated fixture repos and some local runs
  // intentionally proceed without current snapshots. Prewarm when available, but
  // do not make the entire suite fail before the targeted tests get to speak.
}
