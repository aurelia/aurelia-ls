import type { AnalysisViews } from './analysis-views.js';
import type { FocusedAnalyzabilityContext } from './analyzability-posture.js';
import {
  inspectAnalyzabilityPostureFromAnalysisViews,
  inspectFocusedAnalyzabilityContext,
} from './analyzability-posture.js';
import type { FocusedStructuralPathContext } from './focused-structural-path.js';
import { inspectFocusedStructuralPath } from './focused-structural-path.js';
import { trimTrailingFocusPunctuation } from './focus-normalization.js';

export interface FocusedFileQueryInspection {
  readonly normalizedQuery: string;
  readonly requestedRegimeContext: FocusedAnalyzabilityContext;
  readonly matches: readonly string[];
  readonly matchedFilePath: string | null;
  readonly matchedRegimeContext: FocusedAnalyzabilityContext | null;
  readonly structuralPathContext: FocusedStructuralPathContext | null;
}

export function inspectFocusedFileQuery(
  analysis: AnalysisViews,
  fileQuery: string,
): FocusedFileQueryInspection {
  const normalizedQuery = trimTrailingFocusPunctuation(fileQuery);
  const posture = inspectAnalyzabilityPostureFromAnalysisViews(analysis);
  const requestedRegimeContext = inspectFocusedAnalyzabilityContext(posture, {
    focusLabel: normalizedQuery,
    pathPrefixes: [normalizedQuery],
    queryHints: [normalizedQuery],
  });
  const matches = resolveAnalysisFiles(analysis, normalizedQuery);
  const matchedFilePath = matches.length === 1 ? matches[0]! : null;

  if (!matchedFilePath) {
    return {
      normalizedQuery,
      requestedRegimeContext,
      matches,
      matchedFilePath: null,
      matchedRegimeContext: null,
      structuralPathContext: null,
    };
  }

  return {
    normalizedQuery,
    requestedRegimeContext,
    matches,
    matchedFilePath,
    matchedRegimeContext: inspectFocusedAnalyzabilityContext(posture, {
      focusLabel: matchedFilePath,
      pathPrefixes: [matchedFilePath],
      queryHints: [normalizedQuery, matchedFilePath],
    }),
    structuralPathContext: inspectFocusedStructuralPath(analysis, matchedFilePath),
  };
}

export function resolveAnalysisFiles(
  analysis: AnalysisViews,
  query: string,
): readonly string[] {
  // TODO: File focus still reconstructs visibility from snapshot-shaped deps,
  // typerefs, and exports carriers plus uncovered-file blind spots. Promote
  // this onto the shared structural source-file catalog/source-file scan so
  // edge-free files and non-admitted files stop depending on projection-local
  // heuristics just to be discoverable by inquiry surfaces.
  const normalized = trimTrailingFocusPunctuation(query).replace(/\\/g, '/');
  const allFiles = new Set<string>();

  for (const edge of analysis.deps.edges) {
    allFiles.add(edge.source);
    allFiles.add(edge.target);
  }
  for (const filePath of analysis.deps.uncovered_files) {
    allFiles.add(filePath);
  }
  for (const declaration of analysis.typeRefs.declarations) {
    allFiles.add(declaration.file);
  }
  for (const record of analysis.exports.exports) {
    if (record.declaration_file) {
      allFiles.add(record.declaration_file);
    }
    allFiles.add(record.analysis_entrypoint);
    for (const step of record.chain) {
      allFiles.add(step.file);
    }
  }

  if (allFiles.has(normalized)) {
    return [normalized];
  }

  const suffixMatches = [...allFiles].filter((filePath) => filePath.endsWith(normalized));
  if (suffixMatches.length > 0) {
    return suffixMatches.sort();
  }

  return [...allFiles].filter((filePath) =>
    filePath.toLowerCase().includes(normalized.toLowerCase()),
  ).sort();
}
