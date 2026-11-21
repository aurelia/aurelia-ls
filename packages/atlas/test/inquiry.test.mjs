import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { PagedRowFamily } from '../dist/inquiry/paged-row-family.js';
import { createInMemoryApi } from '../dist/inquiry/runtime/api.js';
import { createDefaultInquiryWorld } from '../dist/inquiry/runtime/world.js';
import { readAllPagedRows } from '../dist/scripts/script-output.js';
import { createSourceProject } from '../dist/source/index.js';

test('paged row evidence stays attached to its subject and can be suppressed', () => {
  const family = new PagedRowFamily({
    id: 'test',
    rowLabel: 'test rows',
    evidenceForRow: (value, index) => [0, 1].map(n => ({ id: value + n, data: index })),
    continuationsForPage: () => [],
  });
  function read(limit) {
    return family.answer({
      inquiry: { lens: 'atlas.self', locus: { kind: 'repo' }, budget: { evidencePerSubject: limit } },
      basis: [], rows: ['a', 'b', 'c'], offset: 1, limit: 2, value: page => page.rows,
      openSeams: (page, evidence, byRow) => page.rows.map((value, i) => ({
        kind: 'unknown', summary: value, evidence: byRow[i][0],
      })),
    });
  }
  const page = read(1);
  assert.deepEqual(page.evidence.map(row => [row.id, row.data]), [['b0', 1], ['c0', 2]]);
  assert.deepEqual(page.openSeams.map(row => row.evidence.id), ['b0', 'c0']);
  const quiet = read(0);
  assert.deepEqual(quiet.value, page.value);
  assert.deepEqual(quiet.evidence, []);
  assert.deepEqual(quiet.openSeams.map(row => [row.summary, row.evidence]), [['b', undefined], ['c', undefined]]);
});

test('a whole-set pressure report rejects a truncated or looping row source', async () => {
  const collect = page => readAllPagedRows({
    ask: async () => ({ outcome: 'hit', value: [1], page, continuations: [] }),
  }, { label: 'pressure', lens: 'atlas.self', projection: 'functions', rowsFromValue: rows => rows });
  await assert.rejects(collect({ returned: 1, total: 2 }), /exhausted after 1 of 2/);
  await assert.rejects(collect({ returned: 1, nextCursor: 'same' }), /did not advance/);
  assert.deepEqual(await collect({ returned: 1, total: 1 }), [1]);
});

test('self-analysis counts the declared methods and functions used across a barrel', async t => {
  const root = mkdtempSync(path.join(tmpdir(), 'atlas-self-functions-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const pkg = 'packages/atlas';
  const write = (file, text) => writeFileSync(path.join(root, pkg, file), text);
  mkdirSync(path.join(root, pkg, 'src'), { recursive: true });
  write('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ESNext', module: 'NodeNext' }, include: ['src'] }));
  write('package.json', '{"name":"@aurelia-ls/atlas","type":"module"}');
  write('src/owner.ts', [
    'export const enum Alpha { Left = "shared" }',
    'export const enum Beta { Right = "shared" }',
    'function leaf(x: number) { return x + 1; }',
    'export function relay(x: number): number;',
    'export function relay(x: number) { return leaf(x); }',
    'export class Owner { forward(x: number) { return leaf(x); } }',
  ].join('\n'));
  write('src/public.ts', 'export * from "./owner.js";');
  write('src/caller.ts', [
    'import { Owner, relay as via } from "./public.js";',
    'export const callback = via;',
    'export function real(o: Owner) { const f = o.forward; return o.forward(via(2)); }',
    'export function other(via: (x: number) => number) { return via(3); }',
  ].join('\n'));
  const project = createSourceProject({ repoRoot: root, packages: [
    { id: 'atlas', packageName: '@aurelia-ls/atlas', rootPath: pkg, tsconfigPath: pkg + '/tsconfig.json' },
  ] });
  try {
    const api = createInMemoryApi({ sourceProject: project });
    const ask = (projection, extra = {}) => api.ask({ lens: 'atlas.self', projection, ...extra });
    const selected = await ask('function-wrappers', { locus: { kind: 'package', relativePath: pkg } });
    for (const name of ['relay', 'Owner.forward']) {
      const row = selected.value.functionWrapperRows.find(wrapper => wrapper.name === name);
      assert.deepEqual([row.incomingCallCount, row.incomingValueReferenceCount], [1, 1]);
    }
    assert.equal((await ask('functions', { filters: { functionName: 'relay' } })).page.total, 1);
    const member = memberName => ask('enum-value-spaces', { filters: { value: 'shared', enumName: 'Alpha', memberName } });
    assert.equal((await member('Left')).page.total, 1);
    assert.equal((await member('Right')).page.total, 0);
    assert.equal((await ask('functions', { locus: { kind: 'source-range' } })).outcome, 'reroute');
    assert.equal((await ask('functions', { locus: { kind: 'package', packageName: 'absent' } })).outcome, 'no-claim');
    const mismatched = await ask('functions', {
      locus: { kind: 'package', packageName: '@aurelia-ls/atlas' }, filters: { packageId: 'other' },
    });
    assert.equal(mismatched.outcome, 'reroute');
    const suppressed = await ask('function-shapes', { filters: { includeFunctionBodyAnalysis: false } });
    assert.equal(suppressed.outcome, 'no-claim');
    assert.equal(suppressed.continuations[0].inquiry.filters.includeFunctionBodyAnalysis, true);
    const narrow = createDefaultInquiryWorld();
    const mapOnly = createInMemoryApi({ sourceProject: project, world: {
      ...narrow, lenses: narrow.lenses.filter(spec => spec.id === 'repo.map'),
    } });
    assert.deepEqual(mapOnly.implementedLensIds, ['repo.map']);
    assert.deepEqual((await mapOnly.map()).continuations, []);
  } finally {
    project.dispose();
  }
});
