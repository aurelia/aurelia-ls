export type DefineValue = string | number | boolean | null | undefined;

export type DefineMap = Readonly<Record<string, DefineValue>>;

export interface SSRDefineOptions {
  /** Mode for the define set (defaults to SSR=true). */
  mode?: "ssr" | "csr";
  /** Override the SSR-related keys to define. */
  keys?: readonly string[];
  /** Include bare global names like "__AU_DEF__". */
  includeBare?: boolean;
  /** Include window-scoped names like "window.__AU_DEF__". */
  includeWindow?: boolean;
  /** Include globalThis-scoped names like "globalThis.__AU_DEF__". */
  includeGlobalThis?: boolean;
}

const DEFAULT_SSR_KEYS = ["__AU_DEF__", "__AU_SSR_SCOPE__"] as const;

export function ssrDefines(options?: SSRDefineOptions): DefineMap {
  const mode = options?.mode ?? "ssr";
  const value = mode === "ssr";
  const keys = options?.keys ?? DEFAULT_SSR_KEYS;
  const includeBare = options?.includeBare ?? true;
  const includeWindow = options?.includeWindow ?? true;
  const includeGlobalThis = options?.includeGlobalThis ?? true;

  const prefixes: string[] = [];
  if (includeWindow) prefixes.push("window");
  if (includeGlobalThis) prefixes.push("globalThis");

  const defines: Record<string, DefineValue> = {};

  for (const key of keys) {
    if (includeBare) {
      defines[key] = value;
    }
    for (const prefix of prefixes) {
      defines[`${prefix}.${key}`] = value;
    }
  }

  return defines;
}

export function csrDefines(options?: Omit<SSRDefineOptions, "mode">): DefineMap {
  return ssrDefines({ ...options, mode: "csr" });
}

export function mergeDefines(...sets: Array<DefineMap | undefined | null>): DefineMap {
  const merged: Record<string, DefineValue> = {};

  for (const set of sets) {
    if (!set) continue;
    for (const [key, value] of Object.entries(set)) {
      merged[key] = value;
    }
  }

  return merged;
}
