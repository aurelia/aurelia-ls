import type { AnalysisViews } from './analysis-views.js';
import type { FocusedAnalyzabilityContext } from './analyzability-posture.js';
import {
  inspectAnalyzabilityPostureFromAnalysisViews,
  inspectFocusedAnalyzabilityContext,
} from './analyzability-posture.js';
import type { FocusedStructuralPathContext } from './focused-structural-path.js';
import { inspectFocusedStructuralPath } from './focused-structural-path.js';
import { trimTrailingFocusPunctuation } from './focus-normalization.js';
import {
  describeMissingStructuralSourceFileCatalog,
  type StructuralSourceFileCatalogSource,
  resolveStructuralSourceFileQuery,
} from './structural-source-file-surface.js';

export interface FocusedFileQueryInspection {
  readonly normalizedQuery: string;
  readonly requestedRegimeContext: FocusedAnalyzabilityContext;
  readonly catalogSource: StructuralSourceFileCatalogSource | null;
  readonly catalogIssue: string | null;
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
  const matches = resolveStructuralSourceFileQuery(analysis, normalizedQuery) ?? [];
  const matchedFilePath = matches.length === 1 ? matches[0]! : null;
  const structuralPathContext = inspectStructuralPathContext(
    analysis,
    matchedFilePath ?? normalizedQuery,
  );

  if (!matchedFilePath) {
    return {
      normalizedQuery,
      requestedRegimeContext,
      catalogSource: analysis.structuralRuntime
        ? 'structural-runtime'
        : analysis.sourceFileScan
          ? 'source-file-scan'
          : null,
      catalogIssue: analysis.structuralRuntime || analysis.sourceFileScan
        ? null
        : describeMissingStructuralSourceFileCatalog(),
      matches,
      matchedFilePath: null,
      matchedRegimeContext: null,
      structuralPathContext,
    };
  }

  return {
    normalizedQuery,
    requestedRegimeContext,
    catalogSource: analysis.structuralRuntime
      ? 'structural-runtime'
      : analysis.sourceFileScan
        ? 'source-file-scan'
        : null,
    catalogIssue: null,
    matches,
    matchedFilePath,
    matchedRegimeContext: inspectFocusedAnalyzabilityContext(posture, {
      focusLabel: matchedFilePath,
      pathPrefixes: [matchedFilePath],
      queryHints: [normalizedQuery, matchedFilePath],
    }),
    structuralPathContext,
  };
}

function inspectStructuralPathContext(
  analysis: AnalysisViews,
  filePath: string,
): FocusedStructuralPathContext | null {
  return looksLikeRepoRelativeSourceFilePath(filePath)
    ? inspectFocusedStructuralPath(analysis, filePath)
    : null;
}

function looksLikeRepoRelativeSourceFilePath(
  filePath: string,
): boolean {
  return filePath.includes('/')
    || /\.(d\.)?[cm]?tsx?$/i.test(filePath);
}
