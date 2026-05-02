import type {
  FrameworkCatalogMatchRow,
  FrameworkObserverMatchRow,
} from "./framework-entities.js";

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

export function uniqueObserverMatches(
  matches: readonly FrameworkObserverMatchRow[],
): readonly FrameworkObserverMatchRow[] {
  const seen = new Set<string>();
  const unique: FrameworkObserverMatchRow[] = [];
  for (const match of matches) {
    const key = `${match.basis}:${match.text}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(match);
    }
  }
  return unique;
}

export function uniqueEnumValues<TValue extends string>(
  values: readonly TValue[],
): readonly TValue[] {
  return [...new Set(values)];
}

export function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

export function normalizeIdentifierText(text: string): string {
  return text.replace(/[^$\w]+/gu, "").toLowerCase();
}
