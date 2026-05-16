import type { FrameworkCorpusFixtureSeedRow } from "./framework-corpus-analysis.js";
import { queryRelevanceScore } from "./lens-filter-utils.js";

/** Score how strongly a text query points at one framework corpus fixture seed. */
export function frameworkCorpusFixtureSeedQueryScore(
  row: FrameworkCorpusFixtureSeedRow,
  query: string | undefined,
): number {
  return queryRelevanceScore(query, [
    { weight: 90, values: [row.filePath, row.sourceId, row.id] },
    { weight: 70, values: [row.preview, row.summary] },
    { weight: 50, values: row.concepts },
    {
      weight: 40,
      values: row.classificationReasons.flatMap((reason) => [
        reason.kind,
        reason.key,
        `${reason.kind}:${reason.key}`,
        reason.summary,
      ]),
    },
    {
      weight: 35,
      values: row.expectedEffects.flatMap((effect) => [
        effect.effectKind,
        effect.contractSummary ?? "",
        effect.contractDeclared ? "declared expected-effect" : "undeclared expected-effect",
        ...effect.filters.flatMap((filter) => [
          filter.field,
          String(filter.value ?? ""),
          `${filter.field}=${String(filter.value ?? "")}`,
        ]),
      ]),
    },
    { weight: 25, values: row.effectHints },
    { weight: 10, values: [row.group, row.sourceKind, row.seedUse, row.snippetKind, row.language ?? ""] },
  ]);
}
