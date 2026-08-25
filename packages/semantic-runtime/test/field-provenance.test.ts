import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { kernelFieldProvenanceReferences } from '../src/kernel/detail-references.js';
import type {
  EvidenceHandle,
  ProvenanceHandle,
} from '../src/kernel/handles.js';
import {
  KernelPublicationDecisionKind,
  sameKernelFieldProvenance,
} from '../src/kernel/publication-comparison.js';
import {
  aggregateFieldProvenance,
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
  readFieldProvenance,
} from '../src/kernel/provenance.js';
import { ParameterizedRegistryAdmission } from '../src/registration/registration-admission.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('singular field provenance', () => {
  test('normalizes zero, one, and many contributors with deterministic aggregate evidence', () => {
    const first = 'provenance:first' as ProvenanceHandle;
    const second = 'provenance:second' as ProvenanceHandle;
    const aggregateHandle = 'provenance:aggregate' as ProvenanceHandle;
    const firstEvidence = 'evidence:first' as EvidenceHandle;
    const secondEvidence = 'evidence:second' as EvidenceHandle;
    const sharedEvidence = 'evidence:shared' as EvidenceHandle;
    const provenance = new Map<ProvenanceHandle, ProvenanceRecord>([
      [first, new ProvenanceRecord(first, [sharedEvidence, firstEvidence])],
      [second, new ProvenanceRecord(second, [secondEvidence, sharedEvidence])],
    ]);
    const read = (handle: ProvenanceHandle): ProvenanceRecord | null => provenance.get(handle) ?? null;

    const zero = aggregateFieldProvenance('value', [], aggregateHandle, read);
    const one = aggregateFieldProvenance('value', [first, first], aggregateHandle, read);
    const many = aggregateFieldProvenance('value', [second, first, second], aggregateHandle, read);
    const reversed = aggregateFieldProvenance('value', [first, second], aggregateHandle, read);

    expect(zero).toEqual({ fieldProvenance: null, records: [] });
    expect(one.fieldProvenance?.provenanceHandle).toBe(first);
    expect(one.records).toEqual([]);
    expect(many.fieldProvenance?.provenanceHandle).toBe(aggregateHandle);
    expect(many.records).toEqual([
      new ProvenanceRecord(aggregateHandle, [firstEvidence, secondEvidence, sharedEvidence]),
    ]);
    expect(reversed.records).toEqual(many.records);
  });

  test('rejects duplicate fields at construction, lookup, comparison, and structural projection boundaries', () => {
    const first = new FieldProvenance('value', 'provenance:first' as ProvenanceHandle);
    const second = new FieldProvenance('value', 'provenance:second' as ProvenanceHandle);
    const duplicates = [first, second];

    expect(() => compactFieldProvenance(duplicates)).toThrow(/exactly one entry/u);
    expect(() => readFieldProvenance(duplicates, 'value')).toThrow(/exactly one entry/u);
    expect(() => kernelFieldProvenanceReferences(duplicates)).toThrow(/exactly one entry/u);
    expect(() => sameKernelFieldProvenance(duplicates, [first], {
      compareRecordHandles: () => KernelPublicationDecisionKind.Retain,
    })).toThrow(/exactly one entry/u);
  });

  test('compares singular field witnesses independently of entry order', () => {
    const first = new FieldProvenance('first', 'provenance:first' as ProvenanceHandle);
    const second = new FieldProvenance('second', 'provenance:second' as ProvenanceHandle);

    expect(sameKernelFieldProvenance([first, second], [second, first], {
      compareRecordHandles: () => KernelPublicationDecisionKind.Retain,
    })).toBe(true);
  });

  test('aggregates registration parameters and state action handlers into one field witness', async () => {
    const workspaceRoot = provenanceWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `test:field-provenance:${path.basename(workspaceRoot)}`,
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const kernel = runtime.workspace.store;
    const registrations = app.emission.configuration.readConfiguration().registrationAdmissions
      .filter((admission): admission is ParameterizedRegistryAdmission =>
        admission instanceof ParameterizedRegistryAdmission
      );
    const registrationsByKey = new Map(registrations.map((admission) => [
      admission.registryLookupKey?.localName ?? null,
      admission,
    ]));

    expect([...registrationsByKey.keys()].sort()).toEqual(['.many', '.one', '.zero']);
    assertContributorField(kernel, registrationsByKey.get('.zero')!.fieldProvenance, 'registryParameters', 0);
    assertContributorField(kernel, registrationsByKey.get('.one')!.fieldProvenance, 'registryParameters', 1);
    assertContributorField(kernel, registrationsByKey.get('.many')!.fieldProvenance, 'registryParameters', 3);

    const storesByName = new Map(app.emission.state.readStores().map((store) => [store.name, store]));
    expect([...storesByName.keys()].sort()).toEqual(['default', 'many', 'one']);
    expect(storesByName.get('default')?.actionHandlerCount).toBe(0);
    expect(storesByName.get('one')?.actionHandlerCount).toBe(1);
    expect(storesByName.get('many')?.actionHandlerCount).toBe(3);
    assertContributorField(kernel, storesByName.get('default')!.fieldProvenance, 'actionHandlers', 0);
    assertContributorField(kernel, storesByName.get('one')!.fieldProvenance, 'actionHandlers', 1);
    assertContributorField(kernel, storesByName.get('many')!.fieldProvenance, 'actionHandlers', 3);

    for (const provenance of [
      ...registrations.map((admission) => admission.fieldProvenance),
      ...[...storesByName.values()].map((store) => store.fieldProvenance),
    ]) {
      expect(new Set(provenance.map((entry) => entry.field)).size).toBe(provenance.length);
    }
  }, 30_000);
});

function assertContributorField<TField extends string>(
  store: { readProvenance(handle: ProvenanceHandle): ProvenanceRecord | null },
  provenance: readonly FieldProvenance<TField>[],
  field: TField,
  expectedEvidence: number,
): void {
  const matching = provenance.filter((entry) => entry.field === field);
  expect(matching).toHaveLength(expectedEvidence === 0 ? 0 : 1);
  if (matching.length === 0) {
    return;
  }
  const record = store.readProvenance(matching[0]!.provenanceHandle);
  expect(record).not.toBeNull();
  expect(record?.evidenceHandles).toHaveLength(expectedEvidence);
  expect(record?.evidenceHandles).toEqual([...(record?.evidenceHandles ?? [])].sort());
  expect(new Set(record?.evidenceHandles).size).toBe(expectedEvidence);
}

function provenanceWorkspace(): string {
  const workspaceRoot = mkdtempSync(path.join(packageRoot, '.field-provenance-'));
  temporaryRoots.push(workspaceRoot);
  const sourceRoot = path.join(workspaceRoot, 'src');
  mkdirSync(sourceRoot, { recursive: true });
  writeFileSync(path.join(workspaceRoot, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      target: 'ES2022',
    },
    include: ['src/**/*.ts'],
  }), 'utf8');
  writeFileSync(path.join(sourceRoot, 'main.ts'), [
    "import { Registration } from '@aurelia/kernel';",
    "import { Aurelia, customElement, StandardConfiguration } from '@aurelia/runtime-html';",
    "import { StateDefaultConfiguration } from '@aurelia/state';",
    '',
    "const zero = Registration.defer('.zero');",
    "const one = Registration.defer('.one', { marker: 'one' });",
    "const many = Registration.defer('.many', { marker: 'first' }, { marker: 'second' }, { marker: 'third' });",
    '',
    'type State = { count: number };',
    'const first = (state: State): State => state;',
    'const second = (state: State): State => state;',
    'const third = (state: State): State => state;',
    'const options = { devToolsOptions: { disable: true } };',
    'const stores = StateDefaultConfiguration',
    '  .init({ count: 0 }, options)',
    "  .withStore('one', { count: 1 }, options, first)",
    "  .withStore('many', { count: 2 }, options, first, second, third);",
    '',
    "@customElement({ name: 'field-provenance-app', template: '<template>ready</template>' })",
    'class FieldProvenanceApp {}',
    '',
    'new Aurelia()',
    '  .register(StandardConfiguration, zero, one, many, stores)',
    '  .app({ host: document.body, component: FieldProvenanceApp })',
    '  .start();',
    '',
  ].join('\n'), 'utf8');
  return workspaceRoot;
}
