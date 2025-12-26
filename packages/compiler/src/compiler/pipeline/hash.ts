import { createHash } from "node:crypto";

/**
 * Deterministic, stable JSON-like serialization for hashing.
 * - Sorts object keys.
 * - Treats `undefined` / functions as nullish literals to keep hashing total.
 * - Not resilient to cycles (inputs are expected to be DAG-friendly).
 */
export function stableSerialize(value: unknown): string {
  return serialize(value);
}

export function stableHash(value: unknown): string {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function serialize(value: unknown): string {
  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "number":
      return Number.isFinite(value) ? String(value) : `"${String(value)}"`;
    case "boolean":
      return value ? "true" : "false";
    case "undefined":
      return "null";
    case "function":
      return '"<fn>"';
    case "object":
      if (value === null) return "null";
      if (value instanceof Map) return serializeMap(value as Map<unknown, unknown>);
      if (value instanceof Set) return serializeSet(value as Set<unknown>);
      if (Array.isArray(value)) return serializeArray(value);
      return serializeObject(value as Record<string, unknown>);
    default:
      return JSON.stringify(String(value));
  }
}

function serializeArray(arr: unknown[]): string {
  const parts: string[] = [];
  for (let i = 0; i < arr.length; i++) {
    parts.push(serialize(arr[i]));
  }
  return `[${parts.join(",")}]`;
}

function serializeMap(map: Map<unknown, unknown>): string {
  const entries = Array.from(map.entries()).sort(([a], [b]) => {
    const aKey = serialize(a);
    const bKey = serialize(b);
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  });
  const parts = entries.map(([k, v]) => `[${serialize(k)},${serialize(v)}]`);
  return `{"__map__":[${parts.join(",")}]}`;
}

function serializeSet(set: Set<unknown>): string {
  const sorted = Array.from(set.values())
    .map((v) => serialize(v))
    .sort();
  return `{"__set__":[${sorted.join(",")}]}`;
}

function serializeObject(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const k of keys) {
    parts.push(`${JSON.stringify(k)}:${serialize(obj[k])}`);
  }
  return `{${parts.join(",")}}`;
}
