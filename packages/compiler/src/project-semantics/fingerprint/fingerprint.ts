import { createHash } from "node:crypto";
import type ts from "typescript";

export function normalizeCompilerOptions(options: ts.CompilerOptions): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(options).sort()) {
    const value = (options as Record<string, unknown>)[key];
    if (value === undefined) continue;
    normalized[key] = value;
  }
  return normalized;
}

export function hashObject(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function stableStringify(value: unknown): string {
  if (value === null) return "null";
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (type === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    const serialized = entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",");
    return `{${serialized}}`;
  }
  return JSON.stringify(null);
}
