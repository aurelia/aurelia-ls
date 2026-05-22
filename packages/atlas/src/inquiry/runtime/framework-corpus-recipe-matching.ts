import type {
  FrameworkCorpusFixtureRecipeHint,
  FrameworkCorpusFixtureSeedRow,
} from "./framework-corpus-analysis.js";

/**
 * Return the corpus seed recipe lanes that can ground a requested authoring recipe.
 *
 * Direct recipe hints describe one source snippet. Composite recipes often need multiple
 * public snippets: one for the feature surface and one for the routing/plugin boundary.
 * Keep this list explicit so recipe filtering stays structural instead of falling back
 * to broad text search.
 */
export function frameworkCorpusSeedRecipeKeysForFilter(
  recipeKey: string,
): readonly FrameworkCorpusFixtureRecipeHint[] {
  switch (recipeKey) {
    case "convention-minimal-app":
      return ["convention-minimal-app", "minimal-app"];
    case "routed-app-shell":
      return ["routed-app-shell", "minimal-app", "routed-state-backed-form"];
    case "localized-validated-state-backed-form":
      return ["localized-validated-state-backed-form", "localized-state-backed-form", "validated-state-backed-form"];
    case "routed-service-backed-form":
      return ["routed-service-backed-form", "service-backed-form", "routed-state-backed-form"];
    case "routed-localized-validated-state-backed-form":
      return ["routed-localized-validated-state-backed-form", "localized-validated-state-backed-form", "routed-state-backed-form"];
    case "routed-catalog-storefront":
      return ["routed-catalog-storefront", "catalog-storefront", "routed-app-shell", "routed-state-backed-form"];
    case "routed-searchable-data-table":
      return ["routed-searchable-data-table", "searchable-data-table", "routed-app-shell", "routed-state-backed-form"];
    default:
      return [recipeKey as FrameworkCorpusFixtureRecipeHint];
  }
}

export function frameworkCorpusFixtureSeedMatchesRecipeFilter(
  row: FrameworkCorpusFixtureSeedRow,
  recipeKey: string | undefined,
): boolean {
  if (recipeKey === undefined) {
    return true;
  }
  const seedRecipeKeys = frameworkCorpusSeedRecipeKeysForFilter(recipeKey);
  return row.recipeHints.some((recipeHint) => seedRecipeKeys.includes(recipeHint));
}

export function frameworkCorpusFixtureSeedRecipeFilterScore(
  row: FrameworkCorpusFixtureSeedRow,
  recipeKey: string | undefined,
): number {
  if (recipeKey === undefined) {
    return 0;
  }
  if (row.recipeHints.includes(recipeKey as FrameworkCorpusFixtureRecipeHint)) {
    return 2;
  }
  return frameworkCorpusFixtureSeedMatchesRecipeFilter(row, recipeKey) ? 1 : 0;
}
