export function splitWhitespace(value: string): readonly string[] {
  return value.match(/\S+/g) ?? [];
}
