import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSemanticRuntime } from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

const setupFixture = await openFixture('observer-setup-selection');
const setupControllers = readAllRows(setupFixture.app, {
  kind: 'runtime-controllers',
});
const setupAccesses = readAllRows(setupFixture.app, {
  kind: 'binding-target-accesses',
  detail: 'handles',
});
const setupChannels = readAllRows(setupFixture.app, {
  kind: 'binding-value-channels',
});
const setupFlows = readAllRows(setupFixture.app, {
  kind: 'binding-data-flows',
});
const setupDiagnostics = readAllRows(setupFixture.app, {
  kind: 'app-diagnostics',
});
const setupComputedSources = readAllRows(setupFixture.app, {
  kind: 'computed-observer-sources',
});

assertController(
  setupControllers,
  'observer-setup-app',
  'observer-setup-app',
  'root-custom-element',
  'not-applicable',
  'reached',
);
assertController(
  setupControllers,
  'open-computed-app',
  'open-computed-app',
  'root-custom-element',
  'not-applicable',
  'open',
);
assertController(
  setupControllers,
  'function-computed-observer-target',
  'function-computed-observer-target',
  'root-custom-element',
  'open',
  'open',
);
assertController(
  setupControllers,
  'fatal-observer-target',
  'fatal-observer-target',
  'root-custom-element',
  'failed',
  'blocked-by-outer-failure',
);
assertController(
  setupControllers,
  'fatal-callback-observer-target',
  'fatal-callback-observer-target',
  'root-custom-element',
  'failed',
  'blocked-by-outer-failure',
);

const plainAccesses = setupAccesses.filter((row) =>
  row.targetType === 'PlainObserverTarget'
  && row.targetProperty === 'value'
);
assert.equal(plainAccesses.length, 3, 'Expected all three plain bindable access modes.');
assertRows(plainAccesses, {
  strategy: 'setter-observer',
  fallbackStrategy: null,
  observerCacheDisposition: 'cached',
  supportsCallback: true,
  supportsCoercer: true,
  controllerObserverSetupOutcome: 'installed',
  bindReachability: 'reached',
});

const getterAccesses = setupAccesses.filter((row) =>
  row.targetType === 'GetterObserverTarget'
  && row.targetProperty === 'value'
);
assert.equal(getterAccesses.length, 2, 'Expected accessor and observer lanes for the getter bindable.');
assertRows(getterAccesses, {
  strategy: 'computed-observer',
  observerCacheDisposition: 'cached',
  supportsCallback: true,
  supportsCoercer: true,
  controllerObserverSetupOutcome: 'installed',
  bindReachability: 'reached',
});
assertSingleIdentity(getterAccesses, 'getter bindable observer source');
assert.ok(
  sourceText(setupFixture.root, getterAccesses[0].observerSource).includes('get value'),
  'Expected the getter observer source to retain the authored getter declaration.',
);

const observableAccess = requireAccess(setupAccesses, 'ObservableObserverTarget', 'value');
assertRow(observableAccess, {
  strategy: 'observable-setter-notifier',
  fallbackStrategy: null,
  observerCacheDisposition: 'cached',
  supportsCallback: false,
  supportsCoercer: false,
  controllerObserverSetupOutcome: 'installed',
  bindReachability: 'reached',
});
assertRow(requireAccess(setupAccesses, 'ClassObservableObserverTarget', 'value'), {
  strategy: 'observable-setter-notifier',
  observerCacheDisposition: 'cached',
  controllerObserverSetupOutcome: 'installed',
  bindReachability: 'reached',
});
assertRow(requireAccess(setupAccesses, 'DeclaredCallbackObserverTarget', 'value'), {
  strategy: 'observable-setter-notifier',
  controllerObserverSetupOutcome: 'installed',
  bindReachability: 'reached',
});
assertRow(requireAccess(setupAccesses, 'NullPropertyChangedObserverTarget', 'value'), {
  strategy: 'observable-setter-notifier',
  controllerObserverSetupOutcome: 'installed',
  bindReachability: 'reached',
});

const automatic = requireAccess(setupAccesses, 'ComputedObserverTarget', 'automatic');
const disabled = requireAccess(setupAccesses, 'ComputedObserverTarget', 'disabled');
const explicit = requireAccess(setupAccesses, 'ComputedObserverTarget', 'explicit');
const stacked = requireAccess(setupAccesses, 'ComputedObserverTarget', 'stacked');
assertRow(automatic, {
  strategy: 'computed-observer',
  observerCacheDisposition: 'cached',
  controllerObserverSetupOutcome: 'installed',
  bindReachability: 'reached',
});
assertRow(disabled, {
  strategy: 'controlled-computed-observer',
  observerCacheDisposition: 'cached',
  controllerObserverSetupOutcome: 'installed',
  bindReachability: 'reached',
});
assertRow(explicit, {
  strategy: 'controlled-computed-observer',
  observerCacheDisposition: 'cached',
  controllerObserverSetupOutcome: 'installed',
  bindReachability: 'reached',
});
assertRow(stacked, {
  strategy: 'controlled-computed-observer',
  observerCacheDisposition: 'cached',
  controllerObserverSetupOutcome: 'installed',
  bindReachability: 'reached',
});
assertDistinctObserverSources([automatic, disabled, explicit, stacked]);
assert.ok(sourceText(setupFixture.root, automatic.observerSource).includes('get automatic'));
assert.ok(sourceText(setupFixture.root, disabled.observerSource).includes('get disabled'));
assert.ok(sourceText(setupFixture.root, explicit.observerSource).includes('get explicit'));
assert.ok(sourceText(setupFixture.root, stacked.observerSource).includes('get stacked'));
const stackedSource = setupComputedSources.filter((row) =>
  row.className === 'ComputedObserverTarget' && row.memberName === 'stacked'
);
assert.equal(stackedSource.length, 1, 'Expected one source observer for the stacked getter.');
assert.deepEqual(
  stackedSource[0].dependencyKeys,
  ['top'],
  'Stage-3 decorator application makes the topmost @computed metadata authoritative.',
);

const functionDependency = requireAccess(
  setupAccesses,
  'FunctionComputedObserverTarget',
  'functionDependency',
);
assertRow(functionDependency, {
  strategy: 'unknown',
  fallbackStrategy: 'controlled-computed-observer',
  observerCacheDisposition: 'open',
  supportsCallback: null,
  supportsCoercer: null,
  controllerObserverSetupOutcome: 'open',
  bindReachability: 'open',
  authority: 'open',
});
assert.match(functionDependency.openReason, /dependency functions/);
assert.ok(sourceText(setupFixture.root, functionDependency.observerSource).includes('get functionDependency'));

const fatalLength = requireAccess(setupAccesses, 'FatalObserverTarget', 'length');
assertRow(fatalLength, {
  strategy: 'collection-length-observer',
  observerCacheDisposition: 'cached',
  supportsCoercer: false,
  controllerObserverSetupOutcome: 'rejected-coercer',
  bindReachability: 'blocked-by-outer-failure',
});
assertRow(requireAccess(setupAccesses, 'FatalObserverTarget', 'after'), {
  strategy: 'property-accessor',
  observerCacheDisposition: 'not-applicable',
  controllerObserverSetupOutcome: 'not-reached',
  bindReachability: 'blocked-by-outer-failure',
});

const syntheticControllers = setupControllers.filter((row) =>
  row.renderingDefinitionName === 'synthetic-isolation-app'
);
assert.ok(
  syntheticControllers.some((row) =>
    row.creationKind === 'root-custom-element'
    && row.bindReachability === 'reached'
  ),
  'Expected the outer custom-element activation to stay reached.',
);
assert.ok(
  syntheticControllers.some((row) =>
    row.creationKind === 'synthetic-view'
    && row.bindReachability === 'blocked-by-outer-failure'
  ),
  'Expected the lazy synthetic-view activation to own its child setup failure.',
);
assert.ok(
  syntheticControllers.some((row) =>
    row.controllerName === 'fatal-observer-target'
    && row.observerSetupState === 'failed'
    && row.bindReachability === 'blocked-by-outer-failure'
  ),
  'Expected the fatal child controller to remain available as counterfactual evidence.',
);

const outerInput = requireAccessBySourceText(
  setupFixture.root,
  setupAccesses,
  'HTMLInputElement',
  'outerMessage',
);
const innerInput = requireAccessBySourceText(
  setupFixture.root,
  setupAccesses,
  'HTMLInputElement',
  'innerMessage',
);
assertRow(outerInput, {
  targetType: 'HTMLInputElement',
  targetProperty: 'value',
  bindReachability: 'reached',
});
assertRow(innerInput, {
  targetType: 'HTMLInputElement',
  targetProperty: 'value',
  bindReachability: 'blocked-by-outer-failure',
});
assertReachabilityBySource(setupFixture.root, setupChannels, 'outerMessage', 'reached', 'bindReachability');
assertReachabilityBySource(
  setupFixture.root,
  setupChannels,
  'innerMessage',
  'blocked-by-outer-failure',
  'bindReachability',
);
assertReachabilityBySource(
  setupFixture.root,
  setupFlows,
  'outerMessage',
  'reached',
  'sourceEvaluationReachability',
);
assertReachabilityBySource(
  setupFixture.root,
  setupFlows,
  'innerMessage',
  'blocked-by-outer-failure',
  'sourceEvaluationReachability',
);

assert.equal(
  setupDiagnostics.filter((row) => row.frameworkErrorCode === 'AUR0507').length,
  1,
  'Expected one deduplicated controller coercer rejection.',
);
assert.equal(
  setupDiagnostics.filter((row) => row.frameworkErrorCode === 'AUR0508').length,
  1,
  'Expected one deduplicated controller callback rejection.',
);
assert.equal(
  setupDiagnostics.filter((row) => row.diagnosticDomain === 'typescript').length,
  0,
  'Observer setup fixture should have no incidental TypeScript diagnostics.',
);

const adapterFixture = await openFixture('object-observation-adapters');
const adapterControllers = readAllRows(adapterFixture.app, {
  kind: 'runtime-controllers',
});
const adapterAccesses = readAllRows(adapterFixture.app, {
  kind: 'binding-target-accesses',
  detail: 'handles',
});
const adapterFlows = readAllRows(adapterFixture.app, {
  kind: 'binding-data-flows',
});
const adapterDiagnostics = readAllRows(adapterFixture.app, {
  kind: 'app-diagnostics',
});

const adapted = requireAccess(adapterAccesses, 'AdapterObserverTarget', 'value');
assertRow(adapted, {
  strategy: 'unknown',
  fallbackStrategy: 'computed-observer',
  observerCacheDisposition: 'open',
  supportsCallback: null,
  supportsCoercer: null,
  controllerObserverSetupOutcome: 'open',
  bindReachability: 'open',
  authority: 'open',
});
assert.deepEqual(
  adapted.objectObservationAdapters.map((adapter) => ({
    order: adapter.order,
    name: adapter.adapterName,
    appTaskSlot: adapter.appTaskSlot,
    source: sourceText(adapterFixture.root, adapter.source),
  })),
  [
    { order: 0, name: 'firstAdapter', appTaskSlot: 'creating', source: 'firstAdapter' },
    { order: 1, name: 'secondAdapter', appTaskSlot: 'creating', source: 'secondAdapter' },
    { order: 2, name: 'hydratingAdapter', appTaskSlot: 'hydrating', source: 'hydratingAdapter' },
  ],
  'Expected only adapters active before child-controller setup, in AppTask execution order.',
);
assert.ok(
  sourceText(adapterFixture.root, adapted.observerSource).includes('get value'),
  'Expected open adapter selection to preserve the concrete computed-observer fallback source.',
);

const isolated = requireAccess(adapterAccesses, 'IsolatedObserverTarget', 'value');
assertRow(isolated, {
  strategy: 'computed-observer',
  fallbackStrategy: null,
  observerCacheDisposition: 'cached',
  controllerObserverSetupOutcome: 'installed',
  bindReachability: 'reached',
});
assert.deepEqual(isolated.objectObservationAdapters, []);
assertController(
  adapterControllers,
  'adapter-app',
  'adapter-app',
  'root-custom-element',
  'not-applicable',
  'open',
);
assertController(
  adapterControllers,
  'isolated-app',
  'isolated-app',
  'root-custom-element',
  'not-applicable',
  'reached',
);
assertBindingFlow(
  adapterFixture.root,
  adapterFlows,
  'adapter-app',
  'value',
  'message',
  'open',
);
assertBindingFlow(
  adapterFixture.root,
  adapterFlows,
  'isolated-app',
  'value',
  'message',
  'reached',
);
assert.equal(adapterDiagnostics.length, 0, 'Adapter fixture should remain diagnostically clean.');

console.log(JSON.stringify({
  ok: true,
  fixtures: {
    observerSetupSelection: {
      controllers: setupControllers.length,
      targetAccesses: setupAccesses.length,
      valueChannels: setupChannels.length,
      dataFlows: setupFlows.length,
      diagnostics: setupDiagnostics.map((row) => row.frameworkErrorCode ?? row.diagnosticKind),
    },
    objectObservationAdapters: {
      controllers: adapterControllers.length,
      targetAccesses: adapterAccesses.length,
      dataFlows: adapterFlows.length,
      adapterOrder: adapted.objectObservationAdapters.map((adapter) => adapter.adapterName),
    },
  },
}, null, 2));

async function openFixture(name) {
  const root = path.join(packageRoot, 'fixtures', 'pressure', name);
  const runtime = await createSemanticRuntime({
    workspaceRoot: root,
    storeKey: `controller-observer-setup-contract:${name}`,
  });
  const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
  return { app, root };
}

function readAllRows(app, query) {
  const rows = [];
  let cursor = null;
  do {
    const answer = app.ask({
      ...query,
      page: { size: 200, cursor },
    });
    rows.push(...answer.value.rows);
    cursor = answer.page?.nextCursor ?? null;
  } while (cursor != null);
  return rows;
}

function requireAccess(rows, targetType, targetProperty) {
  const matches = rows.filter((candidate) =>
    candidate.targetType === targetType
    && candidate.targetProperty === targetProperty
  );
  assert.equal(
    matches.length,
    1,
    `Expected exactly one target access ${targetType}.${targetProperty}, got ${matches.length}.`,
  );
  return matches[0];
}

function requireAccessBySourceText(fixtureRoot, rows, targetType, text) {
  const matches = rows.filter((candidate) =>
    candidate.targetType === targetType
    && sourceText(fixtureRoot, candidate.source).includes(text)
  );
  assert.equal(
    matches.length,
    1,
    `Expected exactly one ${targetType} target access sourced by '${text}', got ${matches.length}.`,
  );
  return matches[0];
}

function assertController(
  rows,
  renderingDefinitionName,
  controllerName,
  creationKind,
  observerSetupState,
  bindReachability,
) {
  const row = rows.find((candidate) =>
    candidate.renderingDefinitionName === renderingDefinitionName
    && candidate.controllerName === controllerName
    && candidate.creationKind === creationKind
  );
  assert.ok(row, `Expected ${renderingDefinitionName} controller ${controllerName} (${creationKind}).`);
  assertRow(row, { observerSetupState, bindReachability });
}

function assertRows(rows, expected) {
  for (const row of rows) {
    assertRow(row, expected);
  }
}

function assertRow(row, expected) {
  for (const [key, value] of Object.entries(expected)) {
    assert.deepEqual(row[key], value, `Expected ${key}=${JSON.stringify(value)} in ${JSON.stringify(row)}.`);
  }
}

function assertSingleIdentity(rows, label) {
  const identities = new Set(rows.map((row) => row.handles?.observerSourceIdentityHandle ?? null));
  assert.equal(identities.size, 1, `Expected one ${label} identity.`);
  assert.notEqual([...identities][0], null, `Expected an exact ${label} identity handle.`);
}

function assertDistinctObserverSources(rows) {
  const identities = new Set(rows.map((row) => row.handles?.observerSourceIdentityHandle ?? null));
  assert.equal(identities.size, rows.length, 'Expected each computed member to retain its own declaration identity.');
  assert.ok(!identities.has(null), 'Expected exact computed-member declaration identity handles.');
}

function assertReachabilityBySource(fixtureRoot, rows, text, expected, field) {
  const matches = rows.filter((candidate) => sourceText(fixtureRoot, candidate.source).includes(text));
  assert.ok(matches.length > 0, `Expected rows sourced by '${text}'.`);
  for (const row of matches) {
    assert.equal(row[field], expected, `Expected ${field}=${expected} for '${text}'.`);
  }
}

function assertBindingFlow(
  fixtureRoot,
  rows,
  definitionName,
  targetProperty,
  expectedSource,
  expectedReachability,
) {
  const row = rows.find((candidate) =>
    candidate.definitionName === definitionName
    && candidate.targetProperty === targetProperty
  );
  assert.ok(row, `Expected ${definitionName}.${targetProperty} binding data flow.`);
  assert.equal(
    sourceText(fixtureRoot, row.expressionSource),
    expectedSource,
    `Expected ${definitionName}.${targetProperty} to retain its authored binding expression.`,
  );
  assert.equal(
    row.sourceEvaluationReachability,
    expectedReachability,
    `Expected ${definitionName}.${targetProperty} source reachability to be ${expectedReachability}.`,
  );
}

function sourceText(fixtureRoot, source) {
  if (source?.path == null || source.start == null || source.end == null) {
    return '';
  }
  const sourcePath = path.isAbsolute(source.path)
    ? source.path
    : path.resolve(fixtureRoot, source.path);
  return fs.readFileSync(sourcePath, 'utf8').slice(source.start, source.end);
}
