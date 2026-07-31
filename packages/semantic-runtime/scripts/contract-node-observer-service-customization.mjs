import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/node-observer-config-errors');
const pressureFixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-native-target-precedence');

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

const pressureRuntime = await createSemanticRuntime({
  workspaceRoot: pressureFixtureRoot,
  storeKey: 'node-observer-service-customization-pressure-contract',
});
const pressureApp = await pressureRuntime.openApp({
  analysisDepth: 'binding-observation',
});
const pressureTargetAccessRows = pressureApp.ask({
  kind: SemanticAppQueryKind.BindingTargetAccesses,
  page: { size: 1000 },
}).value.rows;
const pressureDataFlowRows = pressureApp.ask({
  kind: SemanticAppQueryKind.BindingDataFlows,
  page: { size: 1000 },
}).value.rows;
const pressureSites = pressureApp.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  openSeamKindKey: 'configuration.open-configuration-option',
  page: { size: 1000 },
}).value.rows;
const openDirectionObserver = pressureTargetAccessRows.find((row) =>
  row.targetType === 'HTMLDivElement'
  && row.targetProperty === 'dir'
);
const closedSpellcheckObserver = pressureTargetAccessRows.find((row) =>
  row.targetType === 'HTMLDivElement'
  && row.targetProperty === 'spellcheck'
);
const runtimeFieldPressure = pressureSites.find((row) =>
  row.reasonKinds.includes('host-environment-value')
  && row.sourceRange?.start?.line === 93
);
const obsoleteTwoWayPressure = pressureSites.find((row) =>
  row.sampleSummary.includes('useTwoWay predicate could not be reduced')
);
const guardedLiveDataFlow = pressureDataFlowRows.find((row) =>
  row.sourceName === 'guardedLivePosition'
);
const guardedColdDataFlow = pressureDataFlowRows.find((row) =>
  row.sourceName === 'guardedColdPosition'
);
const closedAfterSpreadPressure = pressureSites.find((row) =>
  row.source?.path?.endsWith('src/main.ts') === true
  && row.sourceRange?.start?.line === 91
);

const failures = [];
if (customNodeValueObserver == null) {
  failures.push('Expected app-authored MY-ELEMENT value config to close an HTMLElement value binding through ValueAttributeObserver.');
} else if (customNodeValueObserver.nodeObserverConfig?.eventNames.length !== 1 || customNodeValueObserver.nodeObserverConfig.eventNames[0] !== 'change') {
  failures.push(`Expected custom MY-ELEMENT value config to preserve ['change'] events, got [${customNodeValueObserver.nodeObserverConfig?.eventNames.join(', ') ?? ''}].`);
}
if (inputValueObserver == null) {
  failures.push('Expected built-in input value config to remain available after duplicate app config attempts.');
}
if (customNodeValueObservers.length !== 2) {
  failures.push(`Expected two custom HTMLElement value configs, including the AppTask.creating(IContainer, ...) container.get(NodeObserverLocator) path, got ${customNodeValueObservers.length}.`);
}
for (const observer of customNodeValueObservers) {
  if (observer.nodeObserverConfig?.eventNames.length !== 1 || observer.nodeObserverConfig.eventNames[0] !== 'change') {
    failures.push(`Expected each custom HTMLElement value config to preserve ['change'] events, got [${observer.nodeObserverConfig?.eventNames.join(', ') ?? ''}].`);
  }
}
if (duplicateMappingIssues.length !== 3) {
  failures.push(`Expected three duplicate NodeObserverLocator mapping issues, got ${duplicateMappingIssues.length}.`);
}
if (
  openDirectionObserver?.strategy !== 'unknown'
  || openDirectionObserver.nodeObserverConfig?.fieldStates.type !== 'open'
  || openDirectionObserver.nodeObserverConfig?.eventNames[0] !== 'direction-change'
) {
  failures.push(`Expected a spread after known node-observer fields to retain known values with open field state, got ${JSON.stringify(openDirectionObserver)}.`);
}
if (
  closedSpellcheckObserver?.strategy !== 'value-attribute-observer'
  || closedSpellcheckObserver.nodeObserverConfig?.fieldStates.type !== 'closed'
  || closedSpellcheckObserver.nodeObserverConfig?.eventNames[0] !== 'spellcheck-change'
) {
  failures.push(`Expected explicit node-observer fields after an unknown spread to close the consumed config, got ${JSON.stringify(closedSpellcheckObserver)}.`);
}
if (runtimeFieldPressure == null) {
  failures.push(`Expected open node-observer fields to retain their host-environment evaluator cause, got ${JSON.stringify(pressureSites)}.`);
}
if (guardedLiveDataFlow?.direction !== 'two-way') {
  failures.push(`Expected the authored live attribute to satisfy the app two-way predicate, got ${JSON.stringify(guardedLiveDataFlow)}.`);
}
if (guardedColdDataFlow?.direction !== 'source-to-target') {
  failures.push(`Expected the cold element to fail the app two-way predicate, got ${JSON.stringify(guardedColdDataFlow)}.`);
}
if (obsoleteTwoWayPressure != null) {
  failures.push(`Expected the modeled tag/property/hasAttribute predicate to close without its legacy open seam, got ${JSON.stringify(obsoleteTwoWayPressure)}.`);
}
if (closedAfterSpreadPressure != null) {
  failures.push(`Expected irrelevant unknown fields before explicit observer fields to be discharged by projection, got ${JSON.stringify(closedAfterSpreadPressure)}.`);
}

const summary = {
  fixture: 'node-observer-config-errors',
  customNodeValueObserver,
  customNodeValueObserverCount: customNodeValueObservers.length,
  inputValueObserver,
  duplicateMappingIssueCount: duplicateMappingIssues.length,
  duplicateMappingMessages: duplicateMappingIssues.map((row) => row.message),
  openDirectionObserver,
  closedSpellcheckObserver,
  runtimeFieldPressure,
  guardedLiveDataFlow,
  guardedColdDataFlow,
  obsoleteTwoWayPressure,
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}
