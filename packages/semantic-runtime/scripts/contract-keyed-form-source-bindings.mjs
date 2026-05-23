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
  sourceAssignmentTargetSourcePath: 'src/state/form-state.ts',
  sourceToTargetAssignable: true,
  targetToSourceAssignable: true,
});
expectDataFlow('Array-index select should preserve keyed source display and string-domain writeback.', {
  sourceName: 'state.itemNames[0]',
  sourceKind: 'keyed',
  valueChannelKind: 'select-single-option-value',
  targetValueType: "'i-0' | 'i-1' | 'i-2'",
  sourceAssignmentTargetSourcePath: 'src/state/form-state.ts',
  sourceToTargetAssignable: true,
  targetToSourceAssignable: true,
});
expectDataFlow('Record-keyed checkbox should bind through the repeat local key expression.', {
  sourceName: 'state.selectedByTagId[tag.id]',
  sourceKind: 'keyed',
  valueChannelKind: 'checked-boolean',
  targetValueType: 'boolean',
  sourceAssignmentTargetSourcePath: 'src/state/form-state.ts',
  sourceToTargetAssignable: true,
  targetToSourceAssignable: true,
});
expectDataFlow('Value converter fromView should make string input writeback assignable to a numeric source.', {
  sourceName: 'state.quantity',
  sourceKind: 'member',
  sourceType: 'string',
  sourceAssignmentTargetType: 'number',
  sourceAssignmentTargetSourcePath: 'src/state/form-state.ts',
  valueChannelKind: 'raw-property',
  targetValueType: 'string',
  sourceToTargetAssignable: true,
  targetToSourceAssignable: true,
  sourceAssignmentKind: 'runtime-assignable',
});
expectDataFlow('withContext value converter fromView should insert caller context before overload selection.', {
  sourceName: 'state.contextualQuantity',
  sourceKind: 'member',
  sourceType: 'string',
  sourceAssignmentTargetType: 'number',
  sourceAssignmentTargetSourcePath: 'src/state/form-state.ts',
  valueChannelKind: 'raw-property',
  targetValueType: 'string',
  sourceToTargetAssignable: true,
  targetToSourceAssignable: true,
  sourceAssignmentKind: 'runtime-assignable',
});
expectDataFlow('Missing converter fromView should fall back to the raw observer value and expose strictness pressure.', {
  sourceName: 'state.fallbackQuantity',
  sourceKind: 'member',
  sourceType: 'string',
  sourceAssignmentTargetType: 'number',
  sourceAssignmentTargetSourcePath: 'src/state/form-state.ts',
  valueChannelKind: 'raw-property',
  targetValueType: 'string',
  sourceToTargetAssignable: true,
  targetToSourceAssignable: false,
  sourceAssignmentKind: 'runtime-assignable-with-typescript-strictness',
});
expectDataFlow('fromView binding behavior should turn a default value binding into target-to-source data flow.', {
  sourceName: 'state.modeFromViewText',
  sourceKind: 'member',
  direction: 'target-to-source',
  sourceType: 'string',
  sourceAssignmentTargetType: 'string',
  sourceAssignmentTargetSourcePath: 'src/state/form-state.ts',
  valueChannelKind: 'raw-property',
  targetValueType: 'string',
  sourceToTargetAssignable: null,
  targetToSourceAssignable: true,
  sourceAssignmentKind: 'runtime-assignable',
});
expectDataFlow('twoWay binding behavior should upgrade a to-view binding into two-way data flow.', {
  sourceName: 'state.modeTwoWayText',
  sourceKind: 'member',
  direction: 'two-way',
  sourceType: 'string',
  sourceAssignmentTargetType: 'string',
  sourceAssignmentTargetSourcePath: 'src/state/form-state.ts',
  valueChannelKind: 'raw-property',
  targetValueType: 'string',
  sourceToTargetAssignable: true,
  targetToSourceAssignable: true,
  sourceAssignmentKind: 'runtime-assignable',
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
  valueConverterWritebackFlows: dataFlows
    .filter((row) =>
      row.sourceName === 'state.quantity'
      || row.sourceName === 'state.contextualQuantity'
      || row.sourceName === 'state.fallbackQuantity'
      || row.sourceName === 'state.modeFromViewText'
      || row.sourceName === 'state.modeTwoWayText'
    )
    .map((row) => ({
      sourceName: row.sourceName,
      direction: row.direction,
      sourceType: row.sourceType,
      sourceAssignmentTargetType: row.sourceAssignmentTargetType,
      targetValueType: row.targetValueType,
      sourceToTargetAssignable: row.sourceToTargetAssignable,
      targetToSourceAssignable: row.targetToSourceAssignable,
      sourceAssignmentKind: row.sourceAssignmentKind,
      sourceAssignmentReason: row.sourceAssignmentReason,
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
    if (field === 'sourceAssignmentTargetSourcePath') {
      if (row.sourceAssignmentTargetSource?.path !== value) {
        failures.push(`${message}: expected ${field}=${JSON.stringify(value)}, observed ${JSON.stringify(row.sourceAssignmentTargetSource?.path ?? null)}.`);
      }
      continue;
    }
    if (row[field] !== value) {
      failures.push(`${message}: expected ${field}=${JSON.stringify(value)}, observed ${JSON.stringify(row[field])}.`);
    }
  }
}
