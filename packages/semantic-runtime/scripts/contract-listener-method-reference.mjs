import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSemanticRuntime } from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/listener-method-reference');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'listener-method-reference-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const valueChannels = app.ask({
  kind: 'binding-value-channels',
  page: { size: 100 },
}).value.rows;
const dataFlows = app.ask({
  kind: 'binding-data-flows',
  page: { size: 100 },
}).value.rows;
const topology = app.ask({
  kind: 'app-topology',
  includeTypeSurfaces: true,
}).value;

const listenerChannels = valueChannels.filter((row) =>
  row.definitionName === 'listener-method-reference-app'
  && row.targetProperty === 'click'
  && row.channelKind === 'event-handler-invocation'
);
const listenerFlows = dataFlows.filter((row) =>
  row.definitionName === 'listener-method-reference-app'
  && row.targetProperty === 'click'
  && row.valueChannelKind === 'event-handler-invocation'
);
const sourceNames = new Set(listenerFlows.map((row) => row.sourceName));
const serviceInteractions = topology.serviceInteractionBindings.filter((row) =>
  row.definitionName === 'listener-method-reference-app'
  && row.interactionOperationKind === 'call'
  && row.interactionTargetRole === 'state-source'
);

const failures = [
  listenerChannels.length === 4
    ? null
    : `Expected 4 click listener event-handler invocation channels; observed ${listenerChannels.length}.`,
  listenerChannels.every((row) => row.runtimeValueType === 'boolean')
    ? null
    : `Expected every listener runtime value type to unwrap to boolean; observed ${JSON.stringify(listenerChannels.map((row) => ({
      sourceName: row.sourceName,
      sourceType: row.sourceType,
      runtimeValueType: row.runtimeValueType,
    })))}`,
  sourceNames.has('state.submitWithEvent')
    ? null
    : 'Expected a method-reference listener flow for state.submitWithEvent.',
  sourceNames.has('state.makeSubmitHandler()')
    ? null
    : 'Expected a handler-factory listener flow for state.makeSubmitHandler().',
  sourceNames.has('state.submitWithEvent($event)')
    ? null
    : 'Expected an explicit event-call listener flow for state.submitWithEvent($event).',
  sourceNames.has('state.submitWithButton($event.currentTarget)')
    ? null
    : 'Expected a refined current-target listener flow for state.submitWithButton($event.currentTarget).',
  serviceInteractions.some((row) => row.interactionMemberName === 'submitWithEvent')
    ? null
    : 'Expected app topology to expose submitWithEvent as a state call interaction.',
  serviceInteractions.some((row) => row.interactionMemberName === 'makeSubmitHandler')
    ? null
    : 'Expected app topology to expose makeSubmitHandler as a state call interaction.',
  serviceInteractions.some((row) => row.interactionMemberName === 'submitWithButton')
    ? null
    : 'Expected app topology to expose submitWithButton as a state call interaction.',
].filter(Boolean);

const summary = {
  fixture: 'listener-method-reference',
  listenerChannels: listenerChannels.map((row) => ({
    sourceName: row.sourceName,
    sourceType: row.sourceType,
    runtimeValueType: row.runtimeValueType,
    sourceToTargetAssignable: row.sourceToTargetAssignable,
    targetToSourceAssignable: row.targetToSourceAssignable,
  })),
  listenerFlows: listenerFlows.map((row) => ({
    sourceName: row.sourceName,
    sourceType: row.sourceType,
    targetValueType: row.targetValueType,
    valueChannelKind: row.valueChannelKind,
    sourceToTargetAssignable: row.sourceToTargetAssignable,
    targetToSourceAssignable: row.targetToSourceAssignable,
  })),
  serviceInteractions: serviceInteractions.map((row) => ({
    interactionMemberName: row.interactionMemberName,
    interactionSourceName: row.interactionSourceName,
    interactionSourceType: row.interactionSourceType,
  })),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}
