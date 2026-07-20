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
    const mappings = app.emission.appWorld.frameworkServiceCustomizations.attributeMapper.mappings;
    const factorySites = new Set(registrations.map((registration) =>
      `${registration.evaluation?.sourceNode.pos}:${registration.evaluation?.sourceNode.end}`
    ));
    const callbackPressure = app.ask({
      kind: SemanticAppQueryKind.OpenSeamSites,
      openSeamKindKey: 'configuration.open-configuration-option',
      page: { size: 100 },
    }).value.rows;

    expect(registrations).toHaveLength(2);
    expect(factorySites.size).toBe(1);
    expect(registrations[0]?.evaluation?.callback?.value)
      .not.toBe(registrations[1]?.evaluation?.callback?.value);
    expect(mappings.map((mapping) => [mapping.attributeName, mapping.propertyName])).toEqual([
      ['first-execution', 'firstExecution'],
      ['second-execution', 'secondExecution'],
    ]);
    expect(mappings.some((mapping) => mapping.attributeName === 'never-executed')).toBe(false);
    expect(callbackPressure.some((row) =>
      row.sampleSummary.includes('If statement depended on a boundary condition')
    )).toBe(true);
  }, 30_000);
});

function fixturePath(name: string): string {
  return path.resolve(fileURLToPath(new URL(`../fixtures/pressure/${name}`, import.meta.url)));
}
