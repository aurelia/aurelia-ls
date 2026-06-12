import type {
  FrameworkCorpusAppPatternHint,
  FrameworkCorpusFixtureSeedRow,
} from "./framework-corpus-analysis.js";

/**
 * Return corpus app-pattern lanes that can ground a requested app-pattern filter.
 *
 * Direct app-pattern hints describe one source snippet. Composite filters often
 * need multiple public snippets: one for the feature surface and one for the
 * routing/plugin boundary. Keep this list explicit so filtering stays
 * structural instead of falling back to broad text search.
 */
export function frameworkCorpusSeedAppPatternKeysForFilter(
  appPatternKey: string,
): readonly FrameworkCorpusAppPatternHint[] {
  switch (appPatternKey) {
    case "convention-resource-surface":
      return ["convention-resource-surface", "minimal-app-surface"];
    case "router-shell-surface":
      return ["router-shell-surface", "minimal-app-surface", "router-form-state-surface"];
    case "form-i18n-validation-surface":
      return ["form-i18n-validation-surface", "form-i18n-surface", "form-validation-surface"];
    case "router-form-service-state-surface":
      return ["router-form-service-state-surface", "form-service-state-surface", "router-form-state-surface"];
    case "router-form-i18n-validation-surface":
      return ["router-form-i18n-validation-surface", "form-i18n-validation-surface", "router-form-state-surface"];
    case "router-commerce-solution-space":
      return ["router-commerce-solution-space", "commerce-solution-space", "router-shell-surface", "router-form-state-surface"];
    case "router-table-collection-operations":
      return ["router-table-collection-operations", "table-collection-operations", "router-shell-surface", "router-form-state-surface"];
    default:
      return [appPatternKey as FrameworkCorpusAppPatternHint];
  }
}

export function frameworkCorpusFixtureSeedMatchesAppPatternFilter(
  row: FrameworkCorpusFixtureSeedRow,
  appPatternKey: string | undefined,
): boolean {
  if (appPatternKey === undefined) {
    return true;
  }
  const seedAppPatternKeys = frameworkCorpusSeedAppPatternKeysForFilter(appPatternKey);
  return row.appPatternHints.some((appPatternHint) => seedAppPatternKeys.includes(appPatternHint));
}

export function frameworkCorpusFixtureSeedAppPatternFilterScore(
  row: FrameworkCorpusFixtureSeedRow,
  appPatternKey: string | undefined,
): number {
  if (appPatternKey === undefined) {
    return 0;
  }
  if (row.appPatternHints.includes(appPatternKey as FrameworkCorpusAppPatternHint)) {
    return 2;
  }
  return frameworkCorpusFixtureSeedMatchesAppPatternFilter(row, appPatternKey) ? 1 : 0;
}
