/** JavaScript identifier-name predicate for generated-source locals and importable type names. */
export function isJavaScriptIdentifierName(value: string): boolean {
  return /^[$A-Z_a-z][$\w]*$/u.test(value);
}
