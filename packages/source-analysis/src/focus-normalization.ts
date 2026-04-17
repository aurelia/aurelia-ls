export function trimTrailingFocusPunctuation(
  value: string,
): string {
  let trimmed = value.trim();
  while (trimmed.length > 0 && isTrailingFocusPunctuation(trimmed.at(-1)!)) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
}

export function sanitizePathLikeFocusValue(
  value: string,
): string {
  return trimTrailingFocusPunctuation(value).replace(/\\/g, '/');
}

function isTrailingFocusPunctuation(
  value: string,
): boolean {
  return value === '.'
    || value === ','
    || value === '!'
    || value === '?'
    || value === ';'
    || value === ':'
    || value === ')'
    || value === ']'
    || value === '}'
    || value === '"'
    || value === '\''
    || value === '`';
}
