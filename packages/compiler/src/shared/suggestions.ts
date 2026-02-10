/**
 * String similarity utilities for "Did you mean?" suggestions.
 *
 * Used for providing helpful error messages when users mistype:
 * - Binding commands (e.g., "bnd" → "bind")
 * - Custom element names
 * - Custom attribute names
 * - Bindable property names
 * - Template controller names
 */

/**
 * Compute the Levenshtein edit distance between two strings.
 *
 * The Levenshtein distance is the minimum number of single-character edits
 * (insertions, deletions, substitutions) required to transform one string
 * into another.
 *
 * Time complexity: O(m×n) where m,n are string lengths
 * Space complexity: O(min(m,n)) using two-row optimization
 *
 * @example
 * levenshteinDistance("bind", "bnd")   // 1 (delete 'i')
 * levenshteinDistance("click", "clck") // 1 (delete 'i')
 * levenshteinDistance("cat", "dog")    // 3 (all different)
 */
export function levenshteinDistance(a: string, b: string): number {
  // Ensure a is the shorter string for space optimization
  if (a.length > b.length) [a, b] = [b, a];

  const m = a.length;
  const n = b.length;

  // Early termination cases
  if (m === 0) return n;
  if (n === 0) return m;

  // Use two rows instead of full matrix (space optimization)
  let prevRow = new Array<number>(m + 1);
  let currRow = new Array<number>(m + 1);

  // Initialize first row
  for (let j = 0; j <= m; j++) {
    prevRow[j] = j;
  }

  // Fill in the rest
  for (let i = 1; i <= n; i++) {
    currRow[0] = i;

    for (let j = 1; j <= m; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j]! + 1,        // deletion
        currRow[j - 1]! + 1,    // insertion
        prevRow[j - 1]! + cost  // substitution
      );
    }

    // Swap rows
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[m]!;
}

/**
 * Options for finding similar strings.
 */
export interface FindSimilarOptions {
  /**
   * Maximum edit distance to consider a match.
   * Default: 2 (catches most typos)
   */
  maxDistance?: number;

  /**
   * Whether comparison should be case-sensitive.
   * Default: false (case-insensitive)
   */
  caseSensitive?: boolean;

  /**
   * Maximum number of suggestions to return.
   * Default: 1 (just the best match)
   */
  limit?: number;
}

/**
 * Find strings similar to the input from a list of candidates.
 *
 * Returns candidates sorted by edit distance (closest first), filtered
 * to those within the maximum distance threshold.
 *
 * @param needle - The string to find matches for
 * @param haystack - List of candidate strings to search
 * @param options - Configuration options
 * @returns Array of similar strings, sorted by distance (closest first)
 *
 * @example
 * findSimilar("bnd", ["bind", "one-time", "to-view"])
 * // ["bind"]
 *
 * findSimilar("trigerr", ["trigger", "capture", "delegate"])
 * // ["trigger"]
 *
 * findSimilar("xyz", ["bind", "trigger"], { maxDistance: 1 })
 * // [] (nothing close enough)
 */
export function findSimilar(
  needle: string,
  haystack: readonly string[],
  options: FindSimilarOptions = {}
): string[] {
  const {
    maxDistance = 2,
    caseSensitive = false,
    limit = 1,
  } = options;

  const normalizedNeedle = caseSensitive ? needle : needle.toLowerCase();

  // Calculate distances for all candidates
  const matches: Array<{ value: string; distance: number }> = [];

  for (const candidate of haystack) {
    const normalizedCandidate = caseSensitive ? candidate : candidate.toLowerCase();
    const distance = levenshteinDistance(normalizedNeedle, normalizedCandidate);

    if (distance <= maxDistance) {
      matches.push({ value: candidate, distance });
    }
  }

  // Sort by distance (closest first), then alphabetically for ties
  matches.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    return a.value.localeCompare(b.value);
  });

  // Return just the values, limited to requested count
  return matches.slice(0, limit).map(m => m.value);
}

/**
 * Find the single best match for a string.
 *
 * Convenience wrapper around findSimilar that returns a single string or null.
 *
 * @param needle - The string to find a match for
 * @param haystack - List of candidate strings to search
 * @param options - Configuration options (limit is ignored, always 1)
 * @returns The best match, or null if nothing is close enough
 *
 * @example
 * findBestMatch("bnd", ["bind", "one-time"])    // "bind"
 * findBestMatch("xyz", ["bind", "one-time"])    // null
 */
export function findBestMatch(
  needle: string,
  haystack: readonly string[],
  options: Omit<FindSimilarOptions, "limit"> = {}
): string | null {
  const matches = findSimilar(needle, haystack, { ...options, limit: 1 });
  return matches[0] ?? null;
}

/**
 * Format a "Did you mean?" suggestion for an error message.
 *
 * @param unknown - The unknown value that was entered
 * @param candidates - List of valid candidates to search
 * @param options - Configuration options
 * @returns Formatted suggestion string, or empty string if no match
 *
 * @example
 * formatSuggestion("bnd", ["bind", "one-time"])
 * // " Did you mean 'bind'?"
 *
 * formatSuggestion("xyz", ["bind", "one-time"])
 * // ""
 */
export function formatSuggestion(
  unknown: string,
  candidates: readonly string[],
  options: Omit<FindSimilarOptions, "limit"> = {}
): string {
  const match = findBestMatch(unknown, candidates, options);
  return match ? ` Did you mean '${match}'?` : "";
}
