import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { SemanticAppQueryKind } from '../src/api/contracts.js';
import { createSemanticRuntime } from '../src/api/runtime.js';

describe('AppTask registration execution', () => {
  test('spends only executed registries and preserves each callback capture at a shared factory site', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixturePath('app-task-execution-order'),
      storeKey: 'contract:app-task-execution-order',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const registrations = app.emission.appWorld.diWorld.registeredAppTasks.filter((registration) =>
      registration.evaluation != null
    );
    const mappingsByWorld = app.emission.appWorld.compilerWorlds.map((world) =>
      world.attributeMapper.configuration.mappings
    );
    const factorySites = new Set(registrations.map((registration) =>
      `${registration.evaluation?.sourceNode.pos}:${registration.evaluation?.sourceNode.end}`
    ));
    const callbackPressure = app.ask({
      kind: SemanticAppQueryKind.OpenSeamSites,
      openSeamKindKey: 'configuration.open-configuration-option',
      page: { size: 100 },
    }).value.rows;

    expect(registrations).toHaveLength(3);
    expect(factorySites.size).toBe(1);
    expect(registrations[0]?.evaluation?.callback?.value)
      .not.toBe(registrations[1]?.evaluation?.callback?.value);
    expect(mappingsByWorld.map((mappings) =>
      mappings.map((mapping) => [mapping.attributeName, mapping.propertyName])
    )).toEqual(expect.arrayContaining([
      [
        ['first-execution', 'firstExecution'],
        ['second-execution', 'secondExecution'],
      ],
      [
        ['isolated-execution', 'isolatedExecution'],
      ],
    ]));
    expect(mappingsByWorld.flat().map((mapping) => [mapping.attributeName, mapping.propertyName])).toEqual([
      ['first-execution', 'firstExecution'],
      ['second-execution', 'secondExecution'],
      ['isolated-execution', 'isolatedExecution'],
    ]);
    expect(mappingsByWorld.flat().some((mapping) => mapping.attributeName === 'never-executed')).toBe(false);
    expect(callbackPressure.some((row) =>
      row.sampleSummary.includes('If statement depended on a boundary condition')
    )).toBe(true);
  }, 30_000);

  test('retains known IKeyMapping entries while preserving unknown computed membership', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixturePath('template-ref-listener-semantics'),
      storeKey: 'contract:app-task-key-mapping',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const compilerWorld = app.emission.appWorld.compilerWorlds[0]?.world;
    expect(compilerWorld).toBeDefined();

    const keyMapping = compilerWorld?.runtimeKeyMappingConfiguration;
    const upperK = keyMapping?.keys.find((entry) => entry.modifier === 'upper_k');
    expect(upperK).toEqual(expect.objectContaining({
      modifier: 'upper_k',
      runtimeName: 'K',
    }));
    expect(upperK?.sourceAddressHandle).not.toBeNull();
    expect(upperK?.provenanceHandle).not.toBeNull();
    const source = upperK?.sourceAddressHandle == null
      ? null
      : runtime.workspace.store.readAddress(upperK.sourceAddressHandle);
    expect(source).toEqual(expect.objectContaining({
      kind: 'source-span-address',
      role: 'name',
    }));
    expect(source?.kind === 'source-span-address'
      ? fs.readFileSync(
          path.join(fixturePath('template-ref-listener-semantics'), 'src/main.ts'),
          'utf8',
        ).slice(source.start, source.end)
      : null).toBe('upper_k');
    expect(keyMapping?.keyDomainClosed).toBe(false);
    expect(keyMapping?.keys.some((entry) => entry.modifier === 'escape')).toBe(true);
  }, 30_000);
});

function fixturePath(name: string): string {
  return path.resolve(fileURLToPath(new URL(`../fixtures/pressure/${name}`, import.meta.url)));
}
