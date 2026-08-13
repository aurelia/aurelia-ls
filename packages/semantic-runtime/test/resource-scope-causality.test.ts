import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/index.js';
import {
  TemplateResourceScopeExclusionReason,
  TemplateResourceScopeLane,
} from '../src/template/compiler-world.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template resource-scope causality', () => {
  test('retains DI duplicate, alias, and partial-registration losses without changing effective winners', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: pressureFixture('resource-registration-duplicates'),
      storeKey: 'resource-scope-causality-duplicates',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const scope = app.emission.appWorld.compilerWorlds[0]?.resourceScope;

    expect(scope).toBeDefined();
    for (const compilerWorld of app.emission.appWorld.compilerWorlds) {
      const fullRows = compilerWorld.resourceScope.exclusions.map((exclusion) => JSON.stringify(exclusion));
      expect(new Set(fullRows).size).toBe(fullRows.length);
    }
    const duplicateCard = scope?.exclusions.find((exclusion) =>
      exclusion.reason === TemplateResourceScopeExclusionReason.LookupKeyConflict
      && exclusion.lookupKeys.includes('au:resource:custom-element:duplicate-card')
      && exclusion.winner.resourceProductHandle !== exclusion.loser.resourceProductHandle
    );
    expect(duplicateCard).toEqual(expect.objectContaining({
      winnerLane: TemplateResourceScopeLane.Local,
      loserLane: TemplateResourceScopeLane.Local,
      winner: expect.objectContaining({ name: 'duplicate-card' }),
      loser: expect.objectContaining({ name: 'duplicate-card' }),
    }));
    expect(duplicateCard?.winnerKeySourceAddressHandle).not.toBeNull();
    expect(duplicateCard?.loserKeySourceAddressHandle).not.toBeNull();

    const partialAliasLoss = scope?.exclusions.find((exclusion) =>
      exclusion.lookupKeys.includes('au:resource:custom-element:alias-primary')
      && exclusion.loser.name === 'alias-after-primary'
    );
    expect(partialAliasLoss).toEqual(expect.objectContaining({
      reason: TemplateResourceScopeExclusionReason.LookupKeyConflict,
      winner: expect.objectContaining({ name: 'alias-primary' }),
    }));
    expect(scope?.resources.some((resource) => resource.name === 'alias-after-primary')).toBe(true);

    const aliasBeforePrimary = scope?.exclusions.find((exclusion) =>
      exclusion.lookupKeys.includes('au:resource:custom-element:primary-after-alias')
      && exclusion.loser.name === 'primary-after-alias'
    );
    expect(aliasBeforePrimary?.winner.name).toBe('alias-before-primary');
    expect(scope?.resources.some((resource) => resource.name === 'primary-after-alias')).toBe(false);

    const diLoss = app.emission.appWorld.diWorld.resourceSlotExclusions.find((exclusion) =>
      exclusion.resourceKey === 'au:resource:custom-element:duplicate-card'
      && exclusion.winner.resourceProductHandle === duplicateCard?.winner.resourceProductHandle
      && exclusion.excludedResourceProductHandle === duplicateCard?.loser.resourceProductHandle
    );
    expect(diLoss).toBeDefined();
    expect(diLoss?.excludedRegistrationSourceAddressHandle).not.toBeNull();
    expect(diLoss?.excludedKeySourceAddressHandle).not.toBeNull();
  });

  test('retains a derived local shadow with its inherited winner lane and parent scope', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: pressureFixture('resource-registration-component-scopes'),
      storeKey: 'resource-scope-causality-component-scopes',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const rootScope = app.emission.appWorld.compilerWorlds[0]?.resourceScope;
    const ownerA = app.emission.postTemplate.templates.resources.find((resource) =>
      resource.compilation.definition.name === 'owner-a'
    )?.compilation.compilerWorld.resourceScope;
    const ownerB = app.emission.postTemplate.templates.resources.find((resource) =>
      resource.compilation.definition.name === 'owner-b'
    )?.compilation.compilerWorld.resourceScope;
    const globalCard = app.emission.postTemplate.templates.resources.find((resource) =>
      resource.compilation.definition.productHandle
        === rootScope?.resources.find((candidate) => candidate.name === 'scope-card')?.definitionProductHandle
    )?.compilation.compilerWorld.resourceScope;

    expect(rootScope).toBeDefined();
    expect(ownerA?.parent?.productHandle).toBe(rootScope?.productHandle);
    expect(ownerB?.parent?.productHandle).toBe(rootScope?.productHandle);
    expect(globalCard?.parent).toBeNull();
    expect(globalCard?.productHandle).toBe(rootScope?.productHandle);

    const rootCard = rootScope?.resources.find((resource) => resource.name === 'scope-card');
    const ownerACard = ownerA?.resources.find((resource) => resource.name === 'scope-card');
    const ownerBCard = ownerB?.resources.find((resource) => resource.name === 'scope-card');
    expect(ownerACard?.resourceProductHandle).not.toBe(rootCard?.resourceProductHandle);
    expect(ownerBCard?.resourceProductHandle).toBe(rootCard?.resourceProductHandle);

    expect(ownerA?.exclusions).toContainEqual(expect.objectContaining({
      reason: TemplateResourceScopeExclusionReason.LookupKeyConflict,
      winnerLane: TemplateResourceScopeLane.Local,
      loserLane: TemplateResourceScopeLane.Inherited,
      lookupKeys: ['au:resource:custom-element:scope-card'],
      winner: expect.objectContaining({ resourceProductHandle: ownerACard?.resourceProductHandle }),
      loser: expect.objectContaining({ resourceProductHandle: rootCard?.resourceProductHandle }),
    }));
    expect(ownerB?.exclusions.some((exclusion) =>
      exclusion.reason === TemplateResourceScopeExclusionReason.LookupKeyConflict
      && exclusion.lookupKeys.includes('au:resource:custom-element:scope-card')
    )).toBe(false);
  });
});

function pressureFixture(name: string): string {
  return path.join(packageRoot, 'fixtures', 'pressure', name);
}
