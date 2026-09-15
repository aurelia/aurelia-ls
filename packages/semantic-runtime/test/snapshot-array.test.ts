import { spawnSync } from 'node:child_process';

import { describe, expect, test } from 'vitest';

import { createSnapshotArray } from '../src/evaluation/snapshot-array.js';

describe('snapshot array carrier', () => {
  test('allocates no values until read and materializes each index once', () => {
    const reads: number[] = [];
    let changes = 0;
    const rows = Object.freeze([1, 2, 3]);
    const array = createSnapshotArray(rows, (value) => {
      reads.push(value);
      return { value };
    }, () => { changes += 1; });

    expect(Array.isArray(array)).toBe(true);
    expect(array instanceof Array).toBe(true);
    expect(array.length).toBe(3);
    expect(0 in array).toBe(true);
    expect(2 in array).toBe(true);
    expect(3 in array).toBe(false);
    expect(Reflect.ownKeys(array)).toEqual(['0', '1', '2', 'length']);
    expect([...array.keys()]).toEqual([0, 1, 2]);
    expect(reads).toEqual([]);
    const value = array[1];
    expect(value).toEqual({ value: 2 });
    expect(array[1]).toBe(value);
    expect(reads).toEqual([2]);
    expect(changes).toBe(0);
  });

  test('virtual length stays native-compatible after a partial read and a non-writable length definition', () => {
    const array = createSnapshotArray([1, 2, 3], (value) => value, () => {});
    const expected = [1, 2, 3];
    expect(Object.getOwnPropertyDescriptor(array, 'length')).toEqual(Object.getOwnPropertyDescriptor(expected, 'length'));
    expect(array[0]).toBe(1);
    expect(array.length).toBe(3);
    expect(Object.getOwnPropertyDescriptor(array, 'length')).toEqual(Object.getOwnPropertyDescriptor(expected, 'length'));
    Object.defineProperty(array, 'length', { writable: false });
    Object.defineProperty(expected, 'length', { writable: false });
    expect(Object.getOwnPropertyDescriptors(array)).toEqual(Object.getOwnPropertyDescriptors(expected));
    expect(Reflect.set(array, '3', 4)).toBe(false);
    expect([...array]).toEqual(expected);
  });

  test('unread carriers do not allocate storage proportional to the shared source length', () => {
    const moduleUrl = new URL('../src/evaluation/snapshot-array.ts', import.meta.url).href;
    const result = spawnSync(process.execPath, [
      '--max-old-space-size=64', '--expose-gc', '--experimental-strip-types', '--input-type=module', '--eval',
      `
        import { createSnapshotArray } from ${JSON.stringify(moduleUrl)};
        const rows = Object.freeze(Array.from({ length: 100_000 }, (_, index) => index));
        let materializations = 0;
        globalThis.gc();
        const before = process.memoryUsage().heapUsed;
        const arrays = Array.from({ length: 100 }, () => createSnapshotArray(rows, (row) => {
          materializations += 1;
          return row;
        }, () => {}));
        globalThis.gc();
        const heapGrowth = process.memoryUsage().heapUsed - before;
        process.stdout.write(JSON.stringify({
          heapGrowth,
          materializations,
          lengths: arrays.reduce((sum, array) => sum + array.length, 0),
          descriptors: arrays.reduce((sum, array) => sum + Object.getOwnPropertyDescriptor(array, 'length').value, 0),
        }));
      `,
    ], { encoding: 'utf8', timeout: 10_000 });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout) as {
      heapGrowth: number;
      materializations: number;
      lengths: number;
      descriptors: number;
    };
    expect(report.materializations).toBe(0);
    expect(report.lengths).toBe(10_000_000);
    expect(report.descriptors).toBe(10_000_000);
    expect(report.heapGrowth).toBeLessThan(4 * 1024 * 1024);
  });

  test('read methods and descriptors agree with native dense arrays', () => {
    const array = createSnapshotArray([3, 1, 2], (value) => value * 2, () => {
      throw new Error('Reads must not change the snapshot.');
    });
    const expected = [6, 2, 4];
    expect(array.map((value) => value + 1)).toEqual(expected.map((value) => value + 1));
    expect(array.slice(1)).toEqual(expected.slice(1));
    expect([...array]).toEqual(expected);
    expect([...array.entries()]).toEqual([...expected.entries()]);
    expect(JSON.stringify(array)).toBe(JSON.stringify(expected));
    expect(Object.keys(array)).toEqual(Object.keys(expected));
    expect(Object.getOwnPropertyDescriptors(array)).toEqual(Object.getOwnPropertyDescriptors(expected));
    const visited: number[] = [];
    array.forEach((value, index, receiver) => {
      expect(receiver).toBe(array);
      visited.push(value + index);
    });
    expect(visited).toEqual([6, 3, 6]);
  });

  test('undefined rows are present and cached, with native index spelling', () => {
    let reads = 0;
    const array = createSnapshotArray([undefined], (value) => {
      reads += 1;
      return value;
    }, () => {});
    expect(array[0]).toBeUndefined();
    expect(array[0]).toBeUndefined();
    expect(Object.hasOwn(array, '0')).toBe(true);
    expect(Reflect.has(array, '-0')).toBe(false);
    expect(Reflect.has(array, '00')).toBe(false);
    expect(Reflect.has(array, '0.0')).toBe(false);
    expect(Reflect.has(array, '4294967295')).toBe(false);
    expect(reads).toBe(1);
  });

  test('materializes before writes and announces changes before they are visible', () => {
    const before: number[][] = [];
    const source = Object.freeze([1, 2, 3]);
    const array = createSnapshotArray(source, (value) => value, () => { before.push([...array]); });
    array[1] = 9;
    expect(before.length).toBeGreaterThan(0);
    expect(before.every((values) => values.join() === '1,2,3')).toBe(true);
    expect([...array]).toEqual([1, 9, 3]);
    expect(source).toEqual([1, 2, 3]);
  });

  test.each([
    ['index assignment', (array: number[]) => { array[1] = 8; }],
    ['sparse assignment', (array: number[]) => { array[6] = 8; }],
    ['length truncation', (array: number[]) => { array.length = 1; }],
    ['length extension', (array: number[]) => { array.length = 6; }],
    ['push', (array: number[]) => array.push(9)],
    ['pop', (array: number[]) => array.pop()],
    ['splice', (array: number[]) => array.splice(1, 1, 8, 9)],
    ['shift', (array: number[]) => array.shift()],
    ['unshift', (array: number[]) => array.unshift(8, 9)],
    ['sort', (array: number[]) => array.sort()],
    ['reverse', (array: number[]) => array.reverse()],
    ['fill', (array: number[]) => array.fill(8, 1)],
    ['copyWithin', (array: number[]) => array.copyWithin(0, 1)],
    ['delete', (array: number[]) => Reflect.deleteProperty(array, '1')],
    ['defineProperty', (array: number[]) => Object.defineProperty(array, '1', { value: 8, writable: false })],
    ['non-index property', (array: number[]) => Reflect.set(array, '01', 8)],
    ['symbol property', (array: number[]) => Reflect.set(array, Symbol.for('snapshot-array'), 8)],
  ])('%s preserves native contents, holes and property descriptors', (_name, mutate) => {
    const source = Object.freeze([3, 1, 2]);
    let changes = 0;
    const array = createSnapshotArray(source, (value) => value, () => { changes += 1; });
    const expected = [...source];
    mutate(array);
    mutate(expected);
    expect(Object.getOwnPropertyDescriptors(array)).toEqual(Object.getOwnPropertyDescriptors(expected));
    expect([...array]).toEqual([...expected]);
    expect(array.map((value) => value)).toEqual(expected.map((value) => value));
    expect(JSON.stringify(array)).toBe(JSON.stringify(expected));
    expect(changes).toBeGreaterThan(0);
    expect(source).toEqual([3, 1, 2]);
  });

  test.each([
    ['freeze', Object.freeze],
    ['seal', Object.seal],
    ['preventExtensions', Object.preventExtensions],
  ])('%s materializes virtual keys before constraining the native target', (_name, constrain) => {
    const array = createSnapshotArray([1, 2, 3], (value) => value, () => {});
    const expected = [1, 2, 3];
    constrain(array);
    constrain(expected);
    expect(Object.getOwnPropertyDescriptors(array)).toEqual(Object.getOwnPropertyDescriptors(expected));
    expect(Object.isExtensible(array)).toBe(Object.isExtensible(expected));
    expect(Object.isSealed(array)).toBe(Object.isSealed(expected));
    expect(Object.isFrozen(array)).toBe(Object.isFrozen(expected));
    expect(Reflect.set(array, '0', 8)).toBe(Reflect.set(expected, '0', 8));
    expect(Reflect.set(array, '4', 9)).toBe(Reflect.set(expected, '4', 9));
    expect([...array]).toEqual([...expected]);
  });

  test('isolated element views preserve identity without leaking to source rows or another carrier', () => {
    const source = Object.freeze([Object.freeze({ value: 1 }), Object.freeze({ value: 2 })]);
    const create = () => createSnapshotArray(source, (row) => ({ ...row }), () => {});
    const first = create();
    const second = create();
    const element = first[0]!;
    element.value = 9;
    first.push({ value: 3 });
    expect(first[0]).toBe(element);
    expect(first).toEqual([{ value: 9 }, { value: 2 }, { value: 3 }]);
    expect(second).toEqual([{ value: 1 }, { value: 2 }]);
    expect(source).toEqual([{ value: 1 }, { value: 2 }]);
  });

  test('custom accessors retain the proxy receiver after promotion', () => {
    const array = createSnapshotArray([1], (value) => value, () => {});
    let receiver: unknown;
    Object.defineProperty(array, 'item', {
      set(this: unknown, _value: number) { receiver = this; },
    });
    Reflect.set(array, 'item', 2);
    expect(receiver).toBe(array);
  });
});
