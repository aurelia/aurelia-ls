import type { ClaimNodeBase } from "./types.js";

const NON_GREEN_FIELDS = new Set([
  "decisionLevelProvenance",
  "retentionTier",
  "revisionToken",
  "validityState",
  "valueLevelProvenance",
]);

export function compareGreenValueFields(
  previous: ClaimNodeBase,
  current: ClaimNodeBase,
): boolean {
  return deepEqual(stripNonGreenFields(previous), stripNonGreenFields(current));
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (typeof left !== typeof right) {
    return false;
  }

  if (left == null || right == null) {
    return false;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    for (let index = 0; index < left.length; index += 1) {
      if (!deepEqual(left[index], right[index])) {
        return false;
      }
    }

    return true;
  }

  if (typeof left === "object" && typeof right === "object") {
    const leftEntries = Object.entries(left as Record<string, unknown>);
    const rightEntries = Object.entries(right as Record<string, unknown>);
    if (leftEntries.length !== rightEntries.length) {
      return false;
    }

    for (const [key, value] of leftEntries) {
      if (!deepEqual(value, (right as Record<string, unknown>)[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}

function stripNonGreenFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripNonGreenFields);
  }

  if (value != null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (NON_GREEN_FIELDS.has(key)) {
        continue;
      }

      result[key] = stripNonGreenFields(entry);
    }

    return result;
  }

  return value;
}
