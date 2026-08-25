import { describe, expect, test } from 'vitest';

import {
  clearSemanticRuntimeProcessTypeSystemCache,
  semanticRuntimeProcessTypeSystemCacheOverview,
} from '../src/index.js';

describe('semantic-runtime process TypeScript cache control', () => {
  test('observes and clears the process-owned cache without opening a workspace runtime', () => {
    const before = semanticRuntimeProcessTypeSystemCacheOverview({
      includeTypeSystemDependencyEntries: true,
      rowLimit: 2,
    });

    const cleared = clearSemanticRuntimeProcessTypeSystemCache({
      typeSystemDependencyCacheClearPolicy: 'all',
    });
    const after = semanticRuntimeProcessTypeSystemCacheOverview({
      includeTypeSystemDependencyEntries: true,
      rowLimit: 2,
    });

    expect(before.entryLimit).toBeGreaterThan(0);
    expect(before.sourceTextCharacterLimit).toBeGreaterThan(0);
    expect(before.entries).toBeLessThanOrEqual(before.entryLimit);
    expect(before.sourceTextCharacters).toBeLessThanOrEqual(before.sourceTextCharacterLimit);
    expect(cleared.typeSystemDependencyCacheClearPolicy).toBe('all');
    expect(cleared.clearedTypeSystemDependencySourceFiles).toBe(before.entries);
    expect(cleared.clearedTypeSystemDependencySourceTextCharacters).toBe(before.sourceTextCharacters);
    expect(cleared.remainingTypeSystemDependencySourceFiles).toBe(0);
    expect(after.entries).toBe(0);
    expect(after.sourceTextCharacters).toBe(0);
    expect(after.clearOperations).toBe(before.clearOperations + 1);
    expect(after.lastClearPolicy).toBe('all');
    expect(after.supersededRevisionEvictions).toBe(before.supersededRevisionEvictions);
    expect(after.supersededRevisionEvictedSourceTextCharacters)
      .toBe(before.supersededRevisionEvictedSourceTextCharacters);
    expect(after.capacityEvictions).toBe(before.capacityEvictions);
    expect(after.capacityEvictedSourceTextCharacters).toBe(before.capacityEvictedSourceTextCharacters);

    const preserved = clearSemanticRuntimeProcessTypeSystemCache({
      typeSystemDependencyCacheClearPolicy: 'preserve',
    });
    const afterPreserve = semanticRuntimeProcessTypeSystemCacheOverview();
    expect(preserved.clearedTypeSystemDependencySourceFiles).toBe(0);
    expect(preserved.remainingTypeSystemDependencySourceFiles).toBe(0);
    expect(afterPreserve.clearOperations).toBe(after.clearOperations);
  });
});
