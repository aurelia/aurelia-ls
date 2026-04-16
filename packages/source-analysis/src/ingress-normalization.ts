export interface SourceAnalysisNormalizedText {
  readonly raw?: string;
  readonly normalized: string;
  readonly tokens: readonly string[];
}

export function createSourceAnalysisNormalizedText(
  value: string | undefined,
): SourceAnalysisNormalizedText {
  const normalized = normalizePhrase(value);
  return {
    ...(value !== undefined ? { raw: value } : {}),
    normalized,
    tokens: normalized.length === 0
      ? []
      : normalized
        .split(/\s+/)
        .map((token) => normalizeToken(token))
        .filter((token) => token.length > 0),
  };
}

export function normalizePhrase(value: string | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[`"'“”‘’]/g, ' ')
    .replace(/[^a-z0-9@/._:-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function normalizeToken(value: string): string {
  return value.replace(/^[._:-]+|[._:-]+$/g, '');
}

export function tokenize(value: string | undefined): readonly string[] {
  return createSourceAnalysisNormalizedText(value).tokens;
}

export function phraseMatches(
  source: SourceAnalysisNormalizedText,
  phrases: readonly string[],
): readonly string[] {
  if (source.normalized.length === 0) {
    return [];
  }

  return uniqueTrimmedValues(phrases)
    .filter((phrase) => source.normalized.includes(normalizePhrase(phrase)));
}

export function tokenMatches(
  source: SourceAnalysisNormalizedText,
  candidates: readonly string[],
): readonly string[] {
  const tokens = new Set(source.tokens);
  return uniqueTrimmedValues(candidates)
    .map((candidate) => normalizeToken(candidate))
    .filter((candidate, index, values) => candidate.length > 0 && values.indexOf(candidate) === index)
    .filter((candidate) => tokens.has(candidate));
}

export function intersectTokens(
  left: readonly string[],
  right: readonly string[],
): readonly string[] {
  const rightSet = new Set(right);
  return left.filter((value, index, values) => rightSet.has(value) && values.indexOf(value) === index);
}

function uniqueTrimmedValues(values: readonly string[]): readonly string[] {
  return values
    .map((value) => value.trim())
    .filter((value, index, all) => value.length > 0 && all.indexOf(value) === index);
}
