import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const fixtureRoot = 'packages/semantic-runtime/fixtures/pressure/one-hop-forwarding-accessor';

const runtime = await createSemanticRuntime({
  workspaceRoot,
  storeKey: 'one-hop-forwarding-accessor-contract',
  projects: [{
    rootDir: fixtureRoot,
    projectKey: 'one-hop-forwarding-accessor',
  }],
});

const app = await runtime.openApp({
  projectKey: 'one-hop-forwarding-accessor',
  analysisDepth: 'binding-observation',
});

const computedObserverSources = app.ask({
  kind: 'computed-observer-sources',
  page: { size: 100 },
}).value.rows;
const bindingObservedDependencies = app.ask({
  kind: 'binding-observed-dependencies',
  page: { size: 100 },
}).value.rows;
const bindingDataFlows = app.ask({
  kind: 'binding-data-flows',
  page: { size: 100 },
}).value.rows;

const failures = [];
const observedTemplateGetterReads = bindingObservedDependencies.filter((row) =>
  row.definitionName === 'one-hop-forwarding-accessor-app'
  && row.dependencyKind === 'template-expression-read'
  && row.observedMemberKind === 'accessor'
);
const directStateTemplateReads = bindingObservedDependencies.filter((row) =>
  row.definitionName === 'one-hop-forwarding-accessor-app'
  && row.sourceName === 'state.selectedName'
  && row.observedMemberKind === 'property'
);
const directStateDataFlows = bindingDataFlows.filter((row) =>
  row.definitionName === 'one-hop-forwarding-accessor-app'
  && row.sourceName === 'state.selectedName'
  && row.sourceType === 'string'
  && row.targetProperty === 'textContent'
);
const forwardingComputedSources = computedObserverSources.filter((row) =>
  row.className === 'OneHopForwardingAccessorApp'
  && row.dependencyMode === 'proxy-auto-track'
  && row.observerKind === 'computed-observer'
  && row.triggerKind === 'accessor-descriptor'
);

if (observedTemplateGetterReads.length !== 2) {
  failures.push(`Expected exactly two template getter reads, received ${observedTemplateGetterReads.length}.`);
}

if (directStateTemplateReads.length !== 1 || directStateDataFlows.length !== 1) {
  failures.push(`Expected one direct state template read and data-flow row, received ${directStateTemplateReads.length}/${directStateDataFlows.length}.`);
}

if (forwardingComputedSources.length !== 4) {
  failures.push(`Expected four getter observer source rows, received ${forwardingComputedSources.length}.`);
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    fixtureRoot,
    failures,
    observedTemplateGetterReads: observedTemplateGetterReads.map(summaryObservedDependency),
    directStateTemplateReads: directStateTemplateReads.map(summaryObservedDependency),
    directStateDataFlows: directStateDataFlows.map(summaryDataFlow),
    forwardingComputedSources: forwardingComputedSources.map(summaryComputedSource),
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    fixtureRoot,
    observedTemplateGetterReads: observedTemplateGetterReads.map(summaryObservedDependency),
    directStateTemplateReads: directStateTemplateReads.map(summaryObservedDependency),
    directStateDataFlows: directStateDataFlows.map(summaryDataFlow),
    forwardingComputedSources: forwardingComputedSources.map(summaryComputedSource),
  }, null, 2));
}

function summaryObservedDependency(row) {
  return {
    sourceName: row.sourceName,
    sourceRootName: row.sourceRootName,
    observedMemberKind: row.observedMemberKind,
    observedMemberSourceState: row.observedMemberSourceState,
  };
}

function summaryDataFlow(row) {
  return {
    sourceName: row.sourceName,
    sourceType: row.sourceType,
    targetProperty: row.targetProperty,
    targetValueType: row.targetValueType,
  };
}

function summaryComputedSource(row) {
  return {
    className: row.className,
    memberName: row.memberName,
    triggerKind: row.triggerKind,
    dependencyMode: row.dependencyMode,
    observedDependencies: row.observedDependencies,
  };
}
