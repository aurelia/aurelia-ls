import { describe, expect, test } from 'vitest';

import { mergeResourceInventoryLocalityEvidence } from '../src/api/resource-discovery.js';

type LocalityEvidence = Parameters<typeof mergeResourceInventoryLocalityEvidence>[0];

const unknown: LocalityEvidence = { kind: 'unknown' };
const nonLocal: LocalityEvidence = { kind: 'non-local' };
const local = (ownerHandle: string): LocalityEvidence => ({
  kind: 'local',
  ownerHandle,
} as LocalityEvidence);

describe('resource inventory locality convergence', () => {
  test.each([
    ['unknown + unknown', unknown, unknown, unknown],
    ['unknown + non-local', unknown, nonLocal, nonLocal],
    ['non-local + unknown', nonLocal, unknown, nonLocal],
    ['unknown + local', unknown, local('owner:a'), local('owner:a')],
    ['local + unknown', local('owner:a'), unknown, local('owner:a')],
    ['non-local + non-local', nonLocal, nonLocal, nonLocal],
    ['same local owner', local('owner:a'), local('owner:a'), local('owner:a')],
  ] as const)('%s converges without changing ownership', (_label, current, incoming, expected) => {
    expect(mergeResourceInventoryLocalityEvidence(current, incoming)).toEqual(expected);
  });

  test.each([
    ['non-local then local', nonLocal, local('owner:a')],
    ['local then non-local', local('owner:a'), nonLocal],
    ['two local owners', local('owner:a'), local('owner:b')],
    ['two local owners reversed', local('owner:b'), local('owner:a')],
  ] as const)('%s fails instead of selecting one evidence lane', (_label, current, incoming) => {
    expect(() => mergeResourceInventoryLocalityEvidence(current, incoming, 'custom-element:chip'))
      .toThrow(/custom-element:chip.*conflicting locality evidence/u);
  });
});
