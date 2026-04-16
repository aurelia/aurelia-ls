export function matchPhrases(
  question: string | undefined,
  phrases: readonly string[],
): readonly string[] {
  const normalizedQuestion = normalizePhrase(question);
  if (!normalizedQuestion) {
    return [];
  }

  return phrases
    .map((phrase) => phrase.trim())
    .filter((phrase, index, values) => phrase.length > 0 && values.indexOf(phrase) === index)
    .filter((phrase) => normalizedQuestion.includes(normalizePhrase(phrase)));
}

export function matchTokens(
  question: string | undefined,
  candidates: readonly string[],
): readonly string[] {
  const tokens = new Set(tokenize(question));
  return candidates.filter((candidate) => tokens.has(normalizeToken(candidate)));
}

export function tokenize(value: string | undefined): readonly string[] {
  const normalized = normalizePhrase(value);
  if (!normalized) {
    return [];
  }
  return normalized
    .split(/\s+/)
    .map((token) => normalizeToken(token))
    .filter((token) => token.length > 0);
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

export function intersect(
  left: readonly string[],
  right: readonly string[],
): readonly string[] {
  const rightSet = new Set(right);
  return left.filter((value, index, values) => rightSet.has(value) && values.indexOf(value) === index);
}
