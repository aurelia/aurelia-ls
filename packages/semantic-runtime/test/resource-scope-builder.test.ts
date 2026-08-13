import { describe, expect, test } from 'vitest';

import type { IdentityHandle, ProductHandle } from '../src/kernel/handles.js';
import { ResourceDefinitionKind } from '../src/resources/resource-kind.js';
import {
  TemplateResourceScopeExclusionReason,
  TemplateResourceScopeLane,
} from '../src/template/compiler-world.js';
import {
  TemplateResourceVisibilityKind,
  TemplateVisibleResource,
} from '../src/template/compiler-world-reference.js';
import {
  mergeVisibleResourceScopeResolution,
  mergeVisibleResourceScopes,
} from '../src/template/resource-scope-builder.js';

describe('template resource-scope merging', () => {
  test('spends preferred child registrations without weakening preferred shadowing', () => {
    const first = visibleResource('first-resource', 'product:first');
    const second = visibleResource('second-resource', 'product:second');

    expect(mergeVisibleResourceScopes([second], [first, second]).map((resource) => resource.name))
      .toEqual(['second-resource', 'first-resource']);

    const shadowingFirst = visibleResource('first-resource', 'product:shadowing-first');
    expect(mergeVisibleResourceScopes([shadowingFirst, second], [first, second]).map((resource) =>
      resource.resourceProductHandle
    )).toEqual(['product:shadowing-first', 'product:second']);
  });

  test('does not turn same-product normalization into a losing contender', () => {
    const inherited = visibleResource('shared-card', 'product:shared');
    const preferred = visibleResource('shared-card', 'product:shared');

    const resolution = mergeVisibleResourceScopeResolution([preferred], [inherited]);

    expect(resolution.resources).toHaveLength(1);
    expect(resolution.resources[0]?.resourceProductHandle).toBe('product:shared');
    expect(resolution.exclusions).toEqual([]);
    expect(resolution.lookups).toEqual([
      expect.objectContaining({
        lookupKey: 'au:resource:custom-element:shared-card',
        lane: TemplateResourceScopeLane.Local,
        winner: preferred,
      }),
    ]);
  });

  test('retains the exact local winner and inherited loser for a shadowed runtime key', () => {
    const inherited = visibleResource('scope-card', 'product:global');
    const preferred = visibleResource('scope-card', 'product:local');

    const resolution = mergeVisibleResourceScopeResolution([preferred], [inherited]);

    expect(resolution.resources.map((resource) => resource.resourceProductHandle))
      .toEqual(['product:local']);
    expect(resolution.exclusions).toEqual([
      expect.objectContaining({
        reason: TemplateResourceScopeExclusionReason.LookupKeyConflict,
        winnerLane: TemplateResourceScopeLane.Local,
        loserLane: TemplateResourceScopeLane.Inherited,
        lookupKeys: ['au:resource:custom-element:scope-card'],
        winner: expect.objectContaining({ resourceProductHandle: 'product:local' }),
        loser: expect.objectContaining({ resourceProductHandle: 'product:global' }),
      }),
    ]);
  });

  test('retains alias-versus-canonical conflict keys without conflating free keys', () => {
    const aliasWinner = visibleResource('alias-owner', 'product:alias-owner', ['shared']);
    const canonicalLoser = visibleResource('shared', 'product:canonical', ['still-free']);

    const resolution = mergeVisibleResourceScopeResolution([aliasWinner], [canonicalLoser]);

    expect(resolution.resources.map((resource) => resource.name)).toEqual(['alias-owner', 'shared']);
    expect(resolution.exclusions).toEqual([
      expect.objectContaining({
        reason: TemplateResourceScopeExclusionReason.LookupKeyConflict,
        lookupKeys: ['au:resource:custom-element:shared'],
        winner: expect.objectContaining({ name: 'alias-owner' }),
        loser: expect.objectContaining({ name: 'shared', aliases: ['still-free'] }),
      }),
    ]);
    expect(resolution.lookups.find((lookup) =>
      lookup.lookupKey === 'au:resource:custom-element:shared'
    )?.winner.name).toBe('alias-owner');
    expect(resolution.lookups.find((lookup) =>
      lookup.lookupKey === 'au:resource:custom-element:still-free'
    )?.winner.name).toBe('shared');
  });

  test('retains poisoned attribute aliases while later resource aliases keep spending', () => {
    const primaryWinner = visibleResource(
      'occupied-attribute',
      'product:attribute-winner',
      [],
      ResourceDefinitionKind.CustomAttribute,
    );
    const poisonedContender = visibleResource(
      'occupied-attribute',
      'product:attribute-loser',
      ['poisoned-alias'],
      ResourceDefinitionKind.CustomAttribute,
    );
    const laterElement = visibleResource(
      'later-element',
      'product:later-element',
      ['poisoned-alias', 'free-later-alias'],
      ResourceDefinitionKind.CustomAttribute,
    );

    const resolution = mergeVisibleResourceScopeResolution(
      [primaryWinner, poisonedContender, laterElement],
      [],
    );

    expect(resolution.blockedLookups).toEqual([
      expect.objectContaining({
        lookupKey: 'au:resource:custom-attribute:poisoned-alias',
        lane: TemplateResourceScopeLane.Local,
      }),
    ]);
    expect(resolution.lookups.find((lookup) =>
      lookup.lookupKey === 'au:resource:custom-attribute:free-later-alias'
    )?.winner.name).toBe('later-element');
  });

  test('groups one hostile contender by each exact winner instead of inventing one cause', () => {
    const first = visibleResource('first', 'product:first', ['occupied-one']);
    const second = visibleResource('second', 'product:second', ['occupied-two']);
    const contender = visibleResource(
      'candidate',
      'product:candidate',
      ['occupied-one', 'free-alias', 'occupied-two'],
    );

    const resolution = mergeVisibleResourceScopeResolution([first, second], [contender]);

    expect(resolution.exclusions.map((exclusion) => ({
      winner: exclusion.winner.name,
      keys: exclusion.lookupKeys,
    }))).toEqual([
      { winner: 'first', keys: ['au:resource:custom-element:occupied-one'] },
      { winner: 'second', keys: ['au:resource:custom-element:occupied-two'] },
    ]);
  });

  test('rebases an inherited shadow chain onto the terminal effective winner', () => {
    const inheritedLoser = visibleResource('chain-card', 'product:loser');
    const intermediateWinner = visibleResource('chain-card', 'product:intermediate');
    const terminalWinner = visibleResource('chain-card', 'product:terminal');
    const parent = mergeVisibleResourceScopeResolution([intermediateWinner], [inheritedLoser]);

    const derived = mergeVisibleResourceScopeResolution(
      [terminalWinner],
      parent.resources,
      parent.exclusions,
    );

    expect(derived.resources.map((resource) => resource.resourceProductHandle))
      .toEqual(['product:terminal']);
    expect(derived.exclusions).toEqual([
      expect.objectContaining({
        winnerLane: TemplateResourceScopeLane.Local,
        loserLane: TemplateResourceScopeLane.Inherited,
        lookupKeys: ['au:resource:custom-element:chain-card'],
        winner: expect.objectContaining({ resourceProductHandle: 'product:terminal' }),
        loser: expect.objectContaining({ resourceProductHandle: 'product:loser' }),
      }),
      expect.objectContaining({
        winnerLane: TemplateResourceScopeLane.Local,
        loserLane: TemplateResourceScopeLane.Inherited,
        lookupKeys: ['au:resource:custom-element:chain-card'],
        winner: expect.objectContaining({ resourceProductHandle: 'product:terminal' }),
        loser: expect.objectContaining({ resourceProductHandle: 'product:intermediate' }),
      }),
    ]);
    expect(derived.exclusions.some((exclusion) =>
      exclusion.winner.resourceProductHandle === intermediateWinner.resourceProductHandle
      && exclusion.loser.resourceProductHandle === inheritedLoser.resourceProductHandle
    )).toBe(false);
  });
});

function visibleResource(
  name: string,
  productHandle: string,
  aliases: readonly string[] = [],
  resourceKind: ResourceDefinitionKind = ResourceDefinitionKind.CustomElement,
): TemplateVisibleResource {
  return new TemplateVisibleResource(
    resourceKind,
    name,
    aliases,
    productHandle as ProductHandle,
    `identity:${productHandle}` as IdentityHandle,
    productHandle as ProductHandle,
    TemplateResourceVisibilityKind.Local,
    null,
  );
}
