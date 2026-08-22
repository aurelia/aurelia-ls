import path from 'node:path';

import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import {
  TypeSystemCompilerHostSourceFileCache,
} from '../src/type-system/compiler-host-source-file-cache.js';
import { canonicalTypeSystemPath } from '../src/type-system/source-file-path.js';

const projectRoot = path.resolve('virtual-source-file-cache-project');

describe('type-system compiler-host SourceFile cache', () => {
  test('keeps only the current revision for one path and parse-option identity', () => {
    const cache = new TypeSystemCompilerHostSourceFileCache({
      entries: 8,
      sourceTextCharacters: 1_024,
    });
    const fileName = dependencyPath('revisioned', 'index.d.ts');
    const firstText = 'export interface Marker { first: true; }\n';
    const secondText = 'export interface Marker { second: true; }\n';

    const first = readDependency(cache, fileName, 'revision-1', firstText);
    const firstAgain = readDependency(cache, fileName, 'revision-1', firstText);
    const second = readDependency(cache, fileName, 'revision-2', secondText);
    const beforeClear = cache.overview(4);

    expect(firstAgain).toBe(first);
    expect(second).not.toBe(first);
    expect(first.text).toBe(firstText);
    expect(second.text).toBe(secondText);
    expect(beforeClear).toMatchObject({
      entries: 1,
      distinctCanonicalPaths: 1,
      duplicateCanonicalPathEntries: 0,
      sourceTextCharacters: secondText.length,
      hits: 1,
      misses: 2,
      writes: 2,
      supersededRevisionEvictions: 1,
      supersededRevisionEvictedSourceTextCharacters: firstText.length,
      capacityEvictions: 0,
      capacityEvictedSourceTextCharacters: 0,
      clearOperations: 0,
      clearedEntries: 0,
    });
    expect(beforeClear.parseOptions).toHaveLength(1);
    expect(beforeClear.parseOptions[0]!.key).not.toContain('revision');
    expect(beforeClear.largestEntries[0]!.parseOptionKey).not.toContain('\0');

    const cleared = cache.clear('all');
    const afterClear = cache.overview();

    expect(cleared).toMatchObject({
      entries: 1,
      sourceTextCharacters: secondText.length,
      remainingEntries: 0,
    });
    expect(afterClear).toMatchObject({
      entries: 0,
      sourceTextCharacters: 0,
      supersededRevisionEvictions: 1,
      supersededRevisionEvictedSourceTextCharacters: firstText.length,
      capacityEvictions: 0,
      clearOperations: 1,
      clearedEntries: 1,
      clearedSourceTextCharacters: secondText.length,
      lastClearPolicy: 'all',
    });
  });

  test('uses least-recently-used eviction for both process capacity limits', () => {
    const cache = new TypeSystemCompilerHostSourceFileCache({
      entries: 2,
      sourceTextCharacters: 12,
    });
    const firstPath = dependencyPath('capacity-a', 'index.ts');
    const secondPath = dependencyPath('capacity-b', 'index.ts');
    const thirdPath = dependencyPath('capacity-c', 'index.ts');
    const oversizedPath = dependencyPath('oversized', 'index.ts');

    const first = readDependency(cache, firstPath, 'a', 'aaaaa');
    readDependency(cache, secondPath, 'b', 'bbbbb');
    expect(readDependency(cache, firstPath, 'a', 'aaaaa')).toBe(first);
    readDependency(cache, thirdPath, 'c', 'ccccc');

    const entryBounded = cache.overview(4);
    expect(entryBounded).toMatchObject({
      entries: 2,
      entryLimit: 2,
      sourceTextCharacterLimit: 12,
      sourceTextCharacters: 10,
      capacityEvictions: 1,
      capacityEvictedSourceTextCharacters: 5,
    });
    const retainedPaths = entryBounded.largestEntries.map((entry) => entry.canonicalPath);
    expect(retainedPaths).toEqual(
      expect.arrayContaining([canonicalTypeSystemPath(firstPath), canonicalTypeSystemPath(thirdPath)]),
    );
    expect(retainedPaths).not.toContain(canonicalTypeSystemPath(secondPath));

    const oversized = readDependency(cache, oversizedPath, 'oversized', 'x'.repeat(13));
    const characterBounded = cache.overview();

    // The current compiler-host call still receives the carrier; it simply is not retained for a later Program.
    expect(oversized.text).toHaveLength(13);
    expect(characterBounded).toMatchObject({
      entries: 0,
      sourceTextCharacters: 0,
      capacityEvictions: 4,
      capacityEvictedSourceTextCharacters: 28,
      supersededRevisionEvictions: 0,
    });
  });
});

function readDependency(
  cache: TypeSystemCompilerHostSourceFileCache,
  fileName: string,
  sourceRevision: string,
  text: string,
): ts.SourceFile {
  const sourceFile = cache.readOrCreate(
    fileName,
    ts.ScriptTarget.ES2022,
    {},
    projectRoot,
    false,
    sourceRevision,
    () => ts.createSourceFile(fileName, text, ts.ScriptTarget.ES2022, true),
  );
  expect(sourceFile).not.toBeUndefined();
  return sourceFile!;
}

function dependencyPath(packageName: string, fileName: string): string {
  return path.join(projectRoot, 'node_modules', packageName, fileName);
}
