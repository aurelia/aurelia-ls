import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { ComputationChildTransitionKind } from '../src/kernel/computation-lifecycle.js';
import { IncrementalConformanceHarness } from './support/incremental-conformance.js';

describe('incremental production conformance', () => {
  test('matches cold semantic truth while retaining unaffected template families', async () => {
    const fixtureRoot = pressureFixtureRoot('resource-registration-local-templates');
    const templateFileName = path.join(fixtureRoot, 'src/secondary-host.html');
    const originalTemplate = readFileSync(templateFileName, 'utf8');
    const changedTemplate = originalTemplate.replace(
      '<strong>secondary ${secondaryLabel}</strong>',
      '<strong>secondary value ${secondaryLabel}</strong>',
    );
    expect(changedTemplate).not.toBe(originalTemplate);

    const harness = await IncrementalConformanceHarness.open({
      fixtureRoot,
      scenarioKey: 'resource-template-family-retention',
    });

    const noOp = await harness.advance('event-only generation', () => {});
    expect(noOp.equivalent).toBe(true);
    const noOpFamilies = noOp.trace.children.filter((child) => child.locusKind === 'template-compilation');
    expect(noOpFamilies.map((child) => child.subject).sort()).toEqual([
      'global-helper',
      'local-chip',
      'local-templates-app',
      'secondary-host',
    ]);
    expect(noOpFamilies.every((child) => child.transition === ComputationChildTransitionKind.Carried)).toBe(true);
    expect(noOp.trace.children).toEqual(expect.arrayContaining([
      expect.objectContaining({
        locusKind: 'aurelia-app-analysis-phase',
        transition: ComputationChildTransitionKind.Executed,
      }),
    ]));
    expect(noOp.trace.children.some((child) => child.locusKind === 'app-root-compiler-world')).toBe(false);

    const changed = await harness.advance('one template family source edit', (overlay) => {
      overlay.write(templateFileName, changedTemplate);
    });
    expect(changed.equivalent).toBe(true);
    const changedFamilies = changed.trace.children.filter((child) => child.locusKind === 'template-compilation');
    // The app root resolves <secondary-host>; compiler reads conservatively include witness state until sensitivity splits.
    expect(familyTransitions(changedFamilies)).toEqual({
      'global-helper': ComputationChildTransitionKind.Carried,
      'local-chip': ComputationChildTransitionKind.Carried,
      'local-templates-app': ComputationChildTransitionKind.Executed,
      'secondary-host': ComputationChildTransitionKind.Executed,
    });
    const preTemplate = changed.trace.children.find((child) =>
      child.locusKind === 'aurelia-app-analysis-phase'
      && child.summary.includes('pre-template'));
    expect(preTemplate).toBeDefined();
    if (preTemplate == null) {
      throw new Error('Expected the pre-template activation trace.');
    }
    expect(changedFamilies.every((child) =>
      child.dependencyChildIds.length === 1
      && child.dependencyChildIds[0] === preTemplate.childId)).toBe(true);

    const settled = await harness.advance('event-only generation after edit', () => {});
    expect(settled.equivalent).toBe(true);
    const settledFamilies = settled.trace.children.filter((child) => child.locusKind === 'template-compilation');
    expect(familyTransitions(settledFamilies)).toEqual({
      'global-helper': ComputationChildTransitionKind.Carried,
      'local-chip': ComputationChildTransitionKind.Carried,
      'local-templates-app': ComputationChildTransitionKind.Carried,
      'secondary-host': ComputationChildTransitionKind.Carried,
    });
  }, 180_000);
});

function familyTransitions(
  families: readonly { readonly subject: string | null; readonly transition: ComputationChildTransitionKind }[],
): Readonly<Record<string, ComputationChildTransitionKind>> {
  return Object.fromEntries(families.map((family) => {
    if (family.subject == null) {
      throw new Error('Expected every template-family trace to identify its authored owner.');
    }
    return [family.subject, family.transition];
  }));
}

function pressureFixtureRoot(name: string): string {
  return fileURLToPath(new URL(`../fixtures/pressure/${name}/`, import.meta.url));
}
