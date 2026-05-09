/** Parse CLI flags in --key value form. */
export function parseFlagValueArgs(
  /** Raw argv tail. */
  argv: readonly string[],
  /** Error message prefix used when the argv shape is invalid. */
  invalidArgumentPrefix: string,
  /** Optional usage hint appended to invalid-shape errors. */
  usageHint?: string,
): ReadonlyMap<string, string> {
  const parsed = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === undefined || !key.startsWith("--") || value === undefined) {
      const usage = usageHint === undefined ? "" : ` ${usageHint}`;
      throw new Error(
        `${invalidArgumentPrefix} near '${key ?? ""}'.${usage}`,
      );
    }
    parsed.set(key.slice(2), value);
  }
  return parsed;
}
