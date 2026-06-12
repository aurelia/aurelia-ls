/** Stable, compact fingerprint for source-shaped text carried by Atlas rows. */
export function stableTextFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** Fingerprint source text after removing formatting-only whitespace differences. */
export function normalizedSourceFingerprint(value: string): string {
  return stableTextFingerprint(value.replace(/\s+/g, " ").trim());
}
