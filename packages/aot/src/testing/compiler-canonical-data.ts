import type { CompilerCaseData } from "./compiler-case.js";

/** Validate the JSON-like case boundary without invoking getters or accepting opaque object identities. */
export function assertCompilerCaseData(value: unknown, path: string): asserts value is CompilerCaseData {
  assertData(value, path, new Set());
}

/** Stable JSON text for validated descriptor and receipt fingerprints. */
export function canonicalCompilerJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value, "$", new Set()));
}

function assertData(value: unknown, path: string, ancestors: Set<object>): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new Error(`Compiler case data ${path} contains a non-canonical number.`);
    }
    return;
  }
  if (typeof value !== "object") {
    throw new Error(`Compiler case data ${path} contains non-canonical ${typeof value}.`);
  }
  if (ancestors.has(value)) {
    throw new Error(`Compiler case data ${path} contains a cycle.`);
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const keys = Reflect.ownKeys(value);
      if (keys.some((key) => typeof key !== "string")) {
        throw new Error(`Compiler case data ${path} contains a symbol array key.`);
      }
      const names = (keys as string[]).filter((name) => name !== "length");
      if (names.length !== value.length) {
        throw new Error(`Compiler case data ${path} contains a sparse or extended array.`);
      }
      for (let index = 0; index < value.length; ++index) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (descriptor == null || !("value" in descriptor)) {
          throw new Error(`Compiler case data ${path}[${index}] is not a plain data value.`);
        }
        assertData(descriptor.value, `${path}[${index}]`, ancestors);
      }
      return;
    }
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`Compiler case data ${path} must be a plain object.`);
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        throw new Error(`Compiler case data ${path} contains a symbol key.`);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!("value" in descriptor)) {
        throw new Error(`Compiler case data ${path}.${key} must not use an accessor.`);
      }
      if (!descriptor.enumerable) {
        throw new Error(`Compiler case data ${path}.${key} must be enumerable.`);
      }
      assertData(descriptor.value, `${path}.${key}`, ancestors);
    }
  } finally {
    ancestors.delete(value);
  }
}

function canonicalValue(value: unknown, path: string, ancestors: Set<object>): unknown {
  assertData(value, path, ancestors);
  if (Array.isArray(value)) {
    return value.map((child, index) => canonicalValue(child, `${path}[${index}]`, ancestors));
  }
  if (value != null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => {
          const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
          return [key, canonicalValue(descriptor.value, `${path}.${key}`, ancestors)];
        }),
    );
  }
  return value;
}
