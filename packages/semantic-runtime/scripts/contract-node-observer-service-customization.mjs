import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSemanticRuntime } from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/node-observer-config-errors');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'node-observer-service-customization-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const targetAccessRows = app.ask({
  kind: 'binding-target-accesses',
  page: { size: 1000 },
}).value.rows;
const configurationIssueRows = app.ask({
  kind: 'configuration-issues',
  page: { size: 1000 },
}).value.rows;

const customNodeValueObservers = targetAccessRows.filter((row) =>
  row.targetKind === 'node'
  && row.targetType === 'HTMLElement'
  && row.targetProperty === 'value'
  && row.strategy === 'value-attribute-observer'
);
const customNodeValueObserver = customNodeValueObservers[0];
const inputValueObserver = targetAccessRows.find((row) =>
  row.targetKind === 'node'
  && row.targetType === 'HTMLInputElement'
  && row.targetProperty === 'value'
  && row.strategy === 'value-attribute-observer'
);
const duplicateMappingIssues = configurationIssueRows.filter((row) =>
  row.frameworkErrorCode === 'AUR0653'
  || row.frameworkErrorCode === 'runtime-html:ErrorNames.node_observer_mapping_existed:AUR0653'
);

const failures = [];
if (customNodeValueObserver == null) {
  failures.push('Expected app-authored MY-ELEMENT value config to close an HTMLElement value binding through ValueAttributeObserver.');
} else if (customNodeValueObserver.eventNames.length !== 1 || customNodeValueObserver.eventNames[0] !== 'change') {
  failures.push(`Expected custom MY-ELEMENT value config to preserve ['change'] events, got [${customNodeValueObserver.eventNames.join(', ')}].`);
}
if (inputValueObserver == null) {
  failures.push('Expected built-in input value config to remain available after duplicate app config attempts.');
}
if (customNodeValueObservers.length !== 2) {
  failures.push(`Expected two custom HTMLElement value configs, including the AppTask.creating(IContainer, ...) container.get(NodeObserverLocator) path, got ${customNodeValueObservers.length}.`);
}
for (const observer of customNodeValueObservers) {
  if (observer.eventNames.length !== 1 || observer.eventNames[0] !== 'change') {
    failures.push(`Expected each custom HTMLElement value config to preserve ['change'] events, got [${observer.eventNames.join(', ')}].`);
  }
}
if (duplicateMappingIssues.length !== 3) {
  failures.push(`Expected three duplicate NodeObserverLocator mapping issues, got ${duplicateMappingIssues.length}.`);
}

const summary = {
  fixture: 'node-observer-config-errors',
  customNodeValueObserver,
  customNodeValueObserverCount: customNodeValueObservers.length,
  inputValueObserver,
  duplicateMappingIssueCount: duplicateMappingIssues.length,
  duplicateMappingMessages: duplicateMappingIssues.map((row) => row.message),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}
