import type { FrameworkCatalogMatchRow } from "./framework-entities.js";

export {
  uniqueValues as uniqueEnumValues,
  uniqueValues as uniqueStrings,
} from "../../collections.js";

export function uniqueCatalogMatches(
  matches: readonly FrameworkCatalogMatchRow[],
): readonly FrameworkCatalogMatchRow[] {
  const seen = new Set<string>();
  const unique: FrameworkCatalogMatchRow[] = [];
  for (const match of matches) {
    const key = `${match.basis}:${match.text}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(match);
    }
  }
  return unique;
}

export function normalizeIdentifierText(text: string): string {
  return text.replace(/[^$\w]+/gu, "").toLowerCase();
}
