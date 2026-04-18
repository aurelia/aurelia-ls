import {
  after as afterAll,
  afterEach,
  before as beforeAll,
  beforeEach,
  describe,
  it,
} from 'node:test';
import { inspect, isDeepStrictEqual } from 'node:util';

export {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
};

export function expect<TActual>(actual: TActual): Matchers<TActual> {
  return createMatchers(actual, false);
}

interface Matchers<TActual> {
  readonly not: Matchers<TActual>;
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toContain(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeNull(): void;
  toBeLessThanOrEqual(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeGreaterThan(expected: number): void;
  toHaveLength(expected: number): void;
  toMatch(expected: RegExp | string): void;
  toMatchObject(expected: unknown): void;
  toBeInstanceOf(expected: abstract new (...args: never[]) => unknown): void;
}

function createMatchers<TActual>(actual: TActual, invert: boolean): Matchers<TActual> {
  const check = (condition: boolean, message: () => string): void => {
    const shouldThrow = invert ? condition : !condition;
    if (shouldThrow) {
      throw new Error(message());
    }
  };

  return {
    get not(): Matchers<TActual> {
      return createMatchers(actual, !invert);
    },
    toBe(expected: unknown): void {
      check(Object.is(actual, expected), () =>
        `Expected ${formatValue(actual)} ${invert ? 'not ' : ''}to be ${formatValue(expected)}.`,
      );
    },
    toEqual(expected: unknown): void {
      check(isDeepStrictEqual(actual, expected), () =>
        `Expected ${formatValue(actual)} ${invert ? 'not ' : ''}to equal ${formatValue(expected)}.`,
      );
    },
    toContain(expected: unknown): void {
      check(containsValue(actual, expected), () =>
        `Expected ${formatValue(actual)} ${invert ? 'not ' : ''}to contain ${formatValue(expected)}.`,
      );
    },
    toBeTruthy(): void {
      check(Boolean(actual), () =>
        `Expected ${formatValue(actual)} ${invert ? 'not ' : ''}to be truthy.`,
      );
    },
    toBeFalsy(): void {
      check(!actual, () =>
        `Expected ${formatValue(actual)} ${invert ? 'not ' : ''}to be falsy.`,
      );
    },
    toBeDefined(): void {
      check(actual !== undefined, () =>
        `Expected ${formatValue(actual)} ${invert ? 'not ' : ''}to be defined.`,
      );
    },
    toBeUndefined(): void {
      check(actual === undefined, () =>
        `Expected ${formatValue(actual)} ${invert ? 'not ' : ''}to be undefined.`,
      );
    },
    toBeNull(): void {
      check(actual === null, () =>
        `Expected ${formatValue(actual)} ${invert ? 'not ' : ''}to be null.`,
      );
    },
    toBeLessThanOrEqual(expected: number): void {
      assertNumber(actual, 'toBeLessThanOrEqual');
      check(actual <= expected, () =>
        `Expected ${formatValue(actual)} ${invert ? 'not ' : ''}to be less than or equal to ${formatValue(expected)}.`,
      );
    },
    toBeGreaterThanOrEqual(expected: number): void {
      assertNumber(actual, 'toBeGreaterThanOrEqual');
      check(actual >= expected, () =>
        `Expected ${formatValue(actual)} ${invert ? 'not ' : ''}to be greater than or equal to ${formatValue(expected)}.`,
      );
    },
    toBeGreaterThan(expected: number): void {
      assertNumber(actual, 'toBeGreaterThan');
      check(actual > expected, () =>
        `Expected ${formatValue(actual)} ${invert ? 'not ' : ''}to be greater than ${formatValue(expected)}.`,
      );
    },
    toHaveLength(expected: number): void {
      const actualLength = lengthOf(actual);
      check(actualLength === expected, () =>
        `Expected ${formatValue(actual)} ${invert ? 'not ' : ''}to have length ${expected}, but got ${actualLength}.`,
      );
    },
    toMatch(expected: RegExp | string): void {
      if (typeof actual !== 'string') {
        throw new Error(`toMatch requires a string actual value, got ${formatValue(actual)}.`);
      }
      const matched = typeof expected === 'string'
        ? actual.includes(expected)
        : expected.test(actual);
      check(matched, () =>
        `Expected ${formatValue(actual)} ${invert ? 'not ' : ''}to match ${formatValue(expected)}.`,
      );
    },
    toMatchObject(expected: unknown): void {
      check(matchesObject(actual, expected), () =>
        `Expected ${formatValue(actual)} ${invert ? 'not ' : ''}to match object ${formatValue(expected)}.`,
      );
    },
    toBeInstanceOf(expected: abstract new (...args: never[]) => unknown): void {
      check(actual instanceof expected, () =>
        `Expected ${formatValue(actual)} ${invert ? 'not ' : ''}to be an instance of ${expected.name || '(anonymous constructor)'}.`,
      );
    },
  };
}

function containsValue(actual: unknown, expected: unknown): boolean {
  if (typeof actual === 'string') {
    return actual.includes(String(expected));
  }
  if (Array.isArray(actual)) {
    return actual.some((item) => isDeepStrictEqual(item, expected));
  }
  if (actual instanceof Set) {
    return actual.has(expected);
  }
  throw new Error(`toContain requires a string, array, or Set actual value, got ${formatValue(actual)}.`);
}

function lengthOf(actual: unknown): number {
  if (
    actual !== null
    && actual !== undefined
    && typeof (actual as { length?: unknown }).length === 'number'
  ) {
    return (actual as { length: number }).length;
  }
  throw new Error(`toHaveLength requires an actual value with a numeric length, got ${formatValue(actual)}.`);
}

function assertNumber(actual: unknown, matcherName: string): asserts actual is number {
  if (typeof actual !== 'number') {
    throw new Error(`${matcherName} requires a numeric actual value, got ${formatValue(actual)}.`);
  }
}

function matchesObject(actual: unknown, expected: unknown): boolean {
  if (expected === null || typeof expected !== 'object') {
    return isDeepStrictEqual(actual, expected);
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length < expected.length) {
      return false;
    }
    return expected.every((expectedItem, index) => matchesObject(actual[index], expectedItem));
  }
  if (actual === null || typeof actual !== 'object') {
    return false;
  }

  for (const [key, expectedValue] of Object.entries(expected)) {
    if (!matchesObject((actual as Record<string, unknown>)[key], expectedValue)) {
      return false;
    }
  }
  return true;
}

function formatValue(value: unknown): string {
  return inspect(value, { depth: 8, breakLength: 120 });
}
