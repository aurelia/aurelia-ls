/**
 * A dense snapshot carrier whose values are copied only when read. `rows` must
 * remain immutable, and `materialize` must return the caller's isolated view of
 * a row. The real Array target preserves native methods and reflection.
 */
export function createSnapshotArray<TSource, TValue>(
  rows: readonly TSource[],
  materialize: (row: TSource) => TValue,
  changed: () => void,
): TValue[] {
  const target: TValue[] = [];
  let pending: readonly TSource[] | null = rows;

  const readIndex = (index: number): void => {
    if (pending !== null && !Object.hasOwn(target, index)) {
      Object.defineProperty(target, index, {
        value: materialize(pending[index]!),
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
  };

  const prepareMutation = (): void => {
    if (pending !== null) {
      for (let index = 0; index < pending.length; index += 1) {
        readIndex(index);
      }
      target.length = pending.length;
      pending = null;
    }
    changed();
  };

  return new Proxy(target, {
    get(array, property, receiver): unknown {
      // Setting a native array's length up front allocates hole storage in V8.
      // Its writable length descriptor permits a virtual value until promotion.
      if (pending !== null && property === 'length') return pending.length;
      const index = snapshotArrayIndex(property);
      if (pending !== null && index !== null && index < pending.length) {
        readIndex(index);
      }
      return Reflect.get(array, property, receiver) as unknown;
    },
    has(array, property) {
      const index = snapshotArrayIndex(property);
      return (pending !== null && index !== null && index < pending.length)
        || Reflect.has(array, property);
    },
    ownKeys(array) {
      if (pending === null) return Reflect.ownKeys(array);
      const keys: string[] = [];
      for (let index = 0; index < pending.length; index += 1) {
        keys.push(String(index));
      }
      keys.push('length');
      return keys;
    },
    getOwnPropertyDescriptor(array, property) {
      if (pending !== null && property === 'length') {
        return {
          value: pending.length,
          writable: true,
          enumerable: false,
          configurable: false,
        };
      }
      const index = snapshotArrayIndex(property);
      if (pending !== null && index !== null && index < pending.length) {
        readIndex(index);
      }
      return Reflect.getOwnPropertyDescriptor(array, property);
    },
    set(array, property, value, receiver) {
      prepareMutation();
      return Reflect.set(array, property, value, receiver);
    },
    defineProperty(array, property, descriptor) {
      prepareMutation();
      return Reflect.defineProperty(array, property, descriptor);
    },
    deleteProperty(array, property) {
      prepareMutation();
      return Reflect.deleteProperty(array, property);
    },
    preventExtensions(array) {
      prepareMutation();
      return Reflect.preventExtensions(array);
    },
    setPrototypeOf(array, prototype) {
      prepareMutation();
      return Reflect.setPrototypeOf(array, prototype);
    },
  });
}

function snapshotArrayIndex(property: PropertyKey): number | null {
  if (typeof property !== 'string') return null;
  const index = Number(property);
  return Number.isInteger(index) && index >= 0 && index < 0xffff_ffff && String(index) === property
    ? index
    : null;
}
