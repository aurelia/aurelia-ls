import type { Sourced } from "./types.js";

type SourceEnvelope = {
  origin: "source";
  state?: "known" | "unknown";
  node?: unknown;
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSourceEnvelope(value: unknown): value is SourceEnvelope {
  return isObjectRecord(value) && value.origin === "source";
}

export function unwrapSourced<T>(value: Sourced<T> | undefined): T | undefined {
  if (!value) return undefined;
  if (value.origin === "source" && value.state === "unknown") return undefined;
  return value.value;
}

export function stripSourcedNode<T>(value: Sourced<T> | undefined): boolean {
  if (!value || value.origin !== "source") return false;
  if (!("node" in value)) return false;
  delete (value as { node?: unknown }).node;
  return true;
}

/**
 * Snapshot sanitization should only strip TS nodes from source-origin envelopes.
 * Other objects may legitimately have a `node` key and must remain untouched.
 */
export function sanitizeSourcedSnapshotValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeSourcedSnapshotValue(entry));
  }
  if (!isObjectRecord(value)) {
    return value;
  }
  const sourceEnvelope = isSourceEnvelope(value);
  const record = value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    if (sourceEnvelope && key === "node") continue;
    out[key] = sanitizeSourcedSnapshotValue(record[key]);
  }
  return out;
}
