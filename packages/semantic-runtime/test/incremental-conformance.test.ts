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
    const resourceFileName = path.join(fixtureRoot, 'src/secondary-host.ts');
    const originalTemplate = readFileSync(templateFileName, 'utf8');
    const originalResource = readFileSync(resourceFileName, 'utf8');
    const changedTemplate = originalTemplate.replace(
      '<strong>secondary ${secondaryLabel}</strong>',
      '<strong>secondary value ${secondaryLabel}</strong>',
    );
    const containerlessResource = originalResource.replace(
      "@customElement({ name: 'secondary-host', template, dependencies: [/*dependency*/ ] })",
      "@customElement({ name: 'secondary-host', template, containerless: true, dependencies: [/*dependency*/ ] })",
    );
    const dependencyResource = containerlessResource.replace(
      'dependencies: [/*dependency*/ ]',
      'dependencies: [GlobalLocalChip]',
    );
    expect(changedTemplate).not.toBe(originalTemplate);
    expect(containerlessResource).not.toBe(originalResource);
    expect(dependencyResource).not.toBe(containerlessResource);
    expect(dependencyResource).toHaveLength(containerlessResource.length);

    const harness = await IncrementalConformanceHarness.open({
      fixtureRoot,
      scenarioKey: 'resource-template-family-retention',
    });

    const noOp = await harness.advance('event-only generation', () => {});
    expect(noOp.equivalent).toBe(true);
    const noOpFamilies = noOp.trace.children.filter((child) => child.locusKind === 'template-compilation');
    expect(noOpFamilies.map((child) => child.currentSubject).sort()).toEqual([
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
    expect(familyTransitions(changedFamilies)).toEqual({
      'global-helper': [ComputationChildTransitionKind.Carried],
      'local-chip': [ComputationChildTransitionKind.Carried],
      'local-templates-app': [ComputationChildTransitionKind.Carried],
      'secondary-host': [ComputationChildTransitionKind.Executed],
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

    const semanticChange = await harness.advance('consumed element-definition facet edit', (overlay) => {
      overlay.write(resourceFileName, containerlessResource);
    });
    expect(semanticChange.equivalent).toBe(true);
    const semanticChangeFamilies = semanticChange.trace.children.filter(
      (child) => child.locusKind === 'template-compilation',
    );
    expect(familyTransitions(semanticChangeFamilies)).toEqual({
      'global-helper': [ComputationChildTransitionKind.Carried],
      'local-chip': [ComputationChildTransitionKind.Carried],
      'local-templates-app': [ComputationChildTransitionKind.Executed],
      // Resource carriers still use span-derived identity, so this metadata edit retires and remints the owner.
      'secondary-host': [
        ComputationChildTransitionKind.Executed,
        ComputationChildTransitionKind.Withdrawn,
      ],
    });

    const dependencyChange = await harness.advance('runtime dependency edit with stable compiler semantics', (overlay) => {
      overlay.write(resourceFileName, dependencyResource);
    });
    expect(dependencyChange.equivalent).toBe(true);
    const dependencyChangeFamilies = dependencyChange.trace.children.filter(
      (child) => child.locusKind === 'template-compilation',
    );
    expect(familyTransitions(dependencyChangeFamilies)).toEqual({
      'global-helper': [ComputationChildTransitionKind.Carried],
      'local-chip': [ComputationChildTransitionKind.Carried],
      'local-templates-app': [ComputationChildTransitionKind.Carried],
      'secondary-host': [ComputationChildTransitionKind.Carried],
    });
    expect(dependencyChange.trace.runtimeAnalysisSubjects.indexOf('SecondaryHost'))
      .toBeLessThan(dependencyChange.trace.runtimeAnalysisSubjects.indexOf('GlobalLocalChip'));

    const settled = await harness.advance('event-only generation after edit', () => {});
    expect(settled.equivalent).toBe(true);
    const settledFamilies = settled.trace.children.filter((child) => child.locusKind === 'template-compilation');
    expect(familyTransitions(settledFamilies)).toEqual({
      'global-helper': [ComputationChildTransitionKind.Carried],
      'local-chip': [ComputationChildTransitionKind.Carried],
      'local-templates-app': [ComputationChildTransitionKind.Carried],
      'secondary-host': [ComputationChildTransitionKind.Carried],
    });
  }, 180_000);
});

function familyTransitions(
  families: readonly {
    readonly previousSubject: string | null;
    readonly currentSubject: string | null;
    readonly transition: ComputationChildTransitionKind;
  }[],
): Readonly<Record<string, readonly ComputationChildTransitionKind[]>> {
  const transitions = new Map<string, ComputationChildTransitionKind[]>();
  for (const family of families) {
    const subject = family.currentSubject ?? family.previousSubject;
    if (subject == null) {
      throw new Error('Expected every template-family trace to identify its authored owner.');
    }
    transitions.set(subject, [...(transitions.get(subject) ?? []), family.transition]);
  }
  return Object.fromEntries([...transitions].map(([subject, kinds]) => [
    subject,
    [...kinds].sort((left, right) => left.localeCompare(right)),
  ]));
}

function pressureFixtureRoot(name: string): string {
  return fileURLToPath(new URL(`../fixtures/pressure/${name}/`, import.meta.url));
}
