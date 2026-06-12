import type {
  FrameworkCorpusFixtureSeedRow,
} from "./framework-corpus-analysis.js";

export interface FrameworkCorpusClassificationFilter {
  readonly classificationKind?: string;
  readonly classificationKey?: string;
}

export function normalizeFrameworkCorpusClassificationFilter(
  filter: FrameworkCorpusClassificationFilter,
): FrameworkCorpusClassificationFilter {
  const key = filter.classificationKey;
  if (key === undefined) {
    return filter;
  }
  const separator = key.indexOf(":");
  if (separator < 1 || separator === key.length - 1) {
    return filter;
  }
  const kindFromKey = key.slice(0, separator);
  const keyFromKey = key.slice(separator + 1);
  if (filter.classificationKind !== undefined && filter.classificationKind !== kindFromKey) {
    return filter;
  }
  return {
    classificationKind: filter.classificationKind ?? kindFromKey,
    classificationKey: keyFromKey,
  };
}

export function frameworkCorpusFixtureSeedHasClassificationKey(
  row: FrameworkCorpusFixtureSeedRow,
  key: string,
): boolean {
  return row.classificationReasons.some((reason) => reason.key === key);
}

export function frameworkCorpusFixtureSeedMatchesClassification(
  row: FrameworkCorpusFixtureSeedRow,
  filter: FrameworkCorpusClassificationFilter,
): boolean {
  if (filter.classificationKind === undefined && filter.classificationKey === undefined) {
    return true;
  }
  return row.classificationReasons.some((reason) =>
    (filter.classificationKind === undefined || reason.kind === filter.classificationKind) &&
    (filter.classificationKey === undefined || reason.key === filter.classificationKey)
  );
}
