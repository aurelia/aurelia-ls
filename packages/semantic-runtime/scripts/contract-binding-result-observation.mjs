import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createSemanticRuntime } from '../out/index.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/pressure/binding-result-observation/', import.meta.url));
const html = await readFile(new URL('../fixtures/pressure/binding-result-observation/src/binding-result-observation-app.html', import.meta.url), 'utf8');
const runtime = await createSemanticRuntime({ workspaceRoot: fixtureRoot, storeKey: 'binding-result-observation-contract' });
try {
  const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
  const flows = app.bindingDataFlows({ size: 100 }, 'handles').value.rows;
  const accesses = app.runtimeExpressionAccessUses({ size: 200 }, 'handles').value.rows;
  const dependencies = app.bindingObservedDependencies({ size: 200 }, 'handles').value.rows;
  const resultUses = accesses.filter((row) => row.operationKind === 'binding-result-observation');
  const resultDependencies = dependencies.filter((row) => row.occurrence.dependencyKind === 'binding-result-collection-read');
  const usesByHandle = new Map(resultUses.map((row) => [row.handles.accessUseProductHandle, row]));
  const flowByHandle = new Map(flows.map((row) => [row.handles.dataFlowProductHandle, row]));

  for (const use of resultUses) {
    assert.equal(use.origin, 'generated');
    assert.equal(use.authored, false);
    assert.equal(use.accessForm, 'result');
    assert.equal(use.role, 'read');
    assert.equal(use.tracking, 'connectable');
    assert.equal(use.realization, 'conditional');
    assert.equal(use.coverage, 'complete');
    assert.equal(use.minimumExecutions, 'zero');
    assert.equal(use.maximumExecutions, 'one');
    assert.equal(use.nameSource, null);
    assert.equal(use.handles.accessOccurrenceHandle, null);
    assert.equal(use.handles.accessResolutionHandle, null);
    assert.ok(use.handles.expressionProductHandle);
    assert.ok(use.source?.path.endsWith('.html'));
    assert.ok(use.executionQualifiers.some((qualifier) => qualifier.kind === 'runtime-array-result-guard'));
  }
  for (const row of resultDependencies) {
    const use = usesByHandle.get(row.occurrence.handles.accessUseProductHandle);
    assert.ok(use, 'Every result effect retains its exact generated operation.');
    assert.equal(row.handles.bindingProductHandle, use.handles.ownerProductHandle);
    assert.equal(row.realization, 'conditional');
    assert.equal(row.occurrence.memberTokenSource, null);
    assert.equal(row.occurrence.observedMemberSource, null);
    assert.equal(row.occurrence.observedMemberSourceState, 'temporary-value');
    const flow = flowByHandle.get(row.handles.dataFlowProductHandle);
    assert.ok(flow?.handles.accessUseProductHandles.includes(use.handles.accessUseProductHandle));
  }

  for (const id of ['array', 'unknown', 'declared', 'array-literal', 'one-time', 'one-time-literal', 'converted']) {
    const rows = resultDependencies.filter((row) => inElement(row.owner.source, id));
    assert.equal(rows.length, 3, `${id}: one result observation call per bind/source-change/collection-change phase.`);
    assert.deepEqual(rows.map((row) => row.occurrence.accessUse.phase).sort(), ['bind', 'binding-collection-refresh', 'source-evaluation']);
    assert.equal(rows.filter((row) => row.occurrence.accessUse.executionQualifiers.some((qualifier) =>
      qualifier.kind === 'binding-result-changed-guard'
    )).length, 1, `${id}: only ContentBinding's source-change path tests old/new result identity.`);
  }

  const parts = resultDependencies.filter((row) => inElement(row.owner.source, 'parts'));
  assert.equal(parts.length, 6, 'Each attribute interpolation hole owns three result-observation calls.');
  assert.deepEqual([...new Set(parts.map((row) => row.handles.bindingProductHandle))].length, 1);
  assert.deepEqual([...new Set(parts.map((row) => row.occurrence.accessUse.operationIndex))].sort(), [0, 1]);
  assert.ok(parts.every((row) => !row.occurrence.accessUse.executionQualifiers.some((qualifier) =>
    qualifier.kind === 'binding-result-changed-guard'
  )), 'InterpolationPartBinding re-observes an unchanged Array after either notification kind.');

  for (const id of ['literal', 'property']) {
    assert.equal(resultUses.filter((row) => inElement(row.source, id)).length, 0, `${id}: no result Array observation.`);
  }
  assert.equal(resultDependencies.filter((row) => inElement(row.owner.source, 'one-time-literal')).length, 3,
    'A literal under a binding-behavior wrapper is not erased by a syntax-only result assessment.');
  const oneTimeFlow = flows.find((row) => inElement(row.source, 'one-time'));
  assert.equal(oneTimeFlow?.sourceEvaluationKind, 'untracked-read');
  assert.equal(dependencies.filter((row) => inElement(row.owner.source, 'one-time')
    && row.occurrence.dependencyKind !== 'binding-result-collection-read').length, 0,
  'One-time suppresses AST reads, but does not suppress binding-owned Array-result observation.');

  const blockedUses = resultUses.filter((row) => inElement(row.source, 'blocked'));
  assert.equal(blockedUses.length, 3);
  assert.ok(blockedUses.every((row) => row.reachability !== 'reached'));
  assert.equal(resultDependencies.filter((row) => inElement(row.owner.source, 'blocked')).length, 0,
    'Blocked source evaluation does not manufacture a reached collection effect.');
  console.log(JSON.stringify({ ok: true, flows: flows.length, resultUses: resultUses.length, resultDependencies: resultDependencies.length }));
} finally {
  runtime.retireWorkspaceIncarnation();
}

function inElement(source, id) {
  if (source?.path?.endsWith('.html') !== true || source.start == null) return false;
  const start = html.indexOf(`<span id="${id}"`);
  const end = html.indexOf('</span>', start) + '</span>'.length;
  return start >= 0 && source.start >= start && source.start < end;
}
