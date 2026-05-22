import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSemanticRuntime } from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/keyed-form-source-bindings');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'keyed-form-source-bindings-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const dataFlows = app.ask({
  kind: 'binding-data-flows',
  page: { size: 100 },
}).value.rows;
const valueChannels = app.ask({
  kind: 'binding-value-channels',
  page: { size: 100 },
}).value.rows;

const failures = [];

expectDataFlow('Array-index checkbox should be a keyed boolean source that can receive checked writeback.', {
  sourceName: 'state.flags[0]',
  sourceKind: 'keyed',
  valueChannelKind: 'checked-boolean',
  targetValueType: 'boolean',
  sourceToTargetAssignable: true,
  targetToSourceAssignable: true,
});
expectDataFlow('Array-index select should preserve keyed source display and string-domain writeback.', {
  sourceName: 'state.itemNames[0]',
  sourceKind: 'keyed',
  valueChannelKind: 'select-single-option-value',
  targetValueType: "'i-0' | 'i-1' | 'i-2'",
  sourceToTargetAssignable: true,
  targetToSourceAssignable: true,
});
expectDataFlow('Record-keyed checkbox should bind through the repeat local key expression.', {
  sourceName: 'state.selectedByTagId[tag.id]',
  sourceKind: 'keyed',
  valueChannelKind: 'checked-boolean',
  targetValueType: 'boolean',
  sourceToTargetAssignable: true,
  targetToSourceAssignable: true,
});

const keyedValueChannelRows = valueChannels.filter((row) =>
  row.definitionName === 'keyed-form-source-bindings-app'
  && (
    row.channelKind === 'checked-boolean'
    || row.channelKind === 'select-single-option-value'
  )
);
if (keyedValueChannelRows.length !== 3) {
  failures.push(`Expected 3 keyed form value-channel rows; observed ${keyedValueChannelRows.length}.`);
}

const summary = {
  fixture: 'keyed-form-source-bindings',
  keyedDataFlows: dataFlows
    .filter((row) => row.sourceName?.includes('[') === true)
    .map((row) => ({
      sourceName: row.sourceName,
      sourceKind: row.sourceKind,
      sourceType: row.sourceType,
      targetValueType: row.targetValueType,
      valueChannelKind: row.valueChannelKind,
      sourceToTargetAssignable: row.sourceToTargetAssignable,
      targetToSourceAssignable: row.targetToSourceAssignable,
      sourceAssignmentKind: row.sourceAssignmentKind,
      sourceAssignmentReason: row.sourceAssignmentReason,
      openReason: row.openReason,
    })),
  keyedValueChannelRows: keyedValueChannelRows.map((row) => ({
    channelKind: row.channelKind,
    targetProperty: row.targetProperty,
    runtimeValueType: row.runtimeValueType,
    valueDomain: row.valueDomain,
  })),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function expectDataFlow(message, expected) {
  const row = dataFlows.find((candidate) =>
    candidate.definitionName === 'keyed-form-source-bindings-app'
    && candidate.sourceName === expected.sourceName
    && candidate.valueChannelKind === expected.valueChannelKind
  );
  if (row == null) {
    failures.push(`${message}: missing data-flow row for ${expected.sourceName} / ${expected.valueChannelKind}.`);
    return;
  }
  for (const [field, value] of Object.entries(expected)) {
    if (row[field] !== value) {
      failures.push(`${message}: expected ${field}=${JSON.stringify(value)}, observed ${JSON.stringify(row[field])}.`);
    }
  }
}
