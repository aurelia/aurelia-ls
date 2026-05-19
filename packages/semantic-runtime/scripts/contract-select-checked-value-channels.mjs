import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSemanticRuntime } from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

const fixtures = new Map();
for (const fixtureName of [
  'select-model-primitives',
  'checked-select-custom-matcher',
  'select-multiple-binding-order',
  'select-single-array-value',
]) {
  fixtures.set(fixtureName, await readFixtureRows(fixtureName));
}

const failures = [];

expectValueChannel(
  'select-model-primitives',
  'Boolean/null select should preserve primitive option domains.',
  {
    channelKind: 'select-single-option-value',
    sourceName: 'likesTacos',
    primitiveValueDomainDisplays: ['null', 'true', 'false'],
    sourceToTargetAssignable: true,
    targetToSourceAssignable: true,
  },
);
expectValueChannel(
  'select-model-primitives',
  'Numeric option value.bind should flow through DOM string values rather than preserving number identity.',
  {
    channelKind: 'select-single-option-value',
    sourceName: 'selectedValueBoundProductId',
    valueDomain: ['1', '2'],
    primitiveValueDomainDisplays: ['null', '"1"', '"2"'],
    sourceToTargetAssignable: true,
    targetToSourceAssignable: false,
    sourceAssignmentReasonKinds: ['target-to-source-type-mismatch'],
  },
);
expectValueChannel(
  'select-model-primitives',
  'Repeated option value.bind should keep DOM stringification even when the expression type is numeric.',
  {
    channelKind: 'select-single-option-value',
    sourceName: 'selectedRepeatedValueProductId',
    targetValueType: 'string | null',
    primitiveValueDomainDisplays: ['null'],
    sourceToTargetAssignable: true,
    targetToSourceAssignable: false,
    sourceAssignmentReasonKinds: ['target-to-source-type-mismatch'],
  },
);
expectValueChannel(
  'select-model-primitives',
  'Nullable radio values should preserve primitive model domains.',
  {
    channelKind: 'checked-radio-value',
    sourceName: 'nullableChoice',
    primitiveValueDomainDisplays: ['null'],
    sourceToTargetAssignable: true,
    targetToSourceAssignable: true,
  },
);
expectValueChannel(
  'select-model-primitives',
  'Numeric radio value.bind should flow through DOM string values rather than preserving number identity.',
  {
    channelKind: 'checked-radio-value',
    sourceName: 'numericRadioChoice',
    valueDomain: ['1'],
    primitiveValueDomainDisplays: ['"1"'],
    sourceToTargetAssignable: true,
    targetToSourceAssignable: false,
    sourceAssignmentReasonKinds: ['target-to-source-type-mismatch'],
  },
);
expectValueChannel(
  'checked-select-custom-matcher',
  'Object radio with matcher should accept nullable source-to-target sync and write object values back.',
  {
    channelKind: 'checked-radio-value',
    sourceName: 'selectedItem',
    usesCustomMatcher: true,
    sourceToTargetAssignable: true,
    targetToSourceAssignable: true,
  },
);
expectValueChannel(
  'checked-select-custom-matcher',
  'Object select with matcher should accept nullable source-to-target sync and write object values back.',
  {
    channelKind: 'select-single-option-value',
    sourceName: 'selectedOption',
    usesCustomMatcher: true,
    sourceToTargetAssignable: true,
    targetToSourceAssignable: true,
  },
);
expectValueChannel(
  'checked-select-custom-matcher',
  'Checked array membership should stay distinct from boolean checkbox flow.',
  {
    channelKind: 'checked-collection-membership',
    sourceName: 'selectedItems',
    usesCustomMatcher: true,
    isCollection: true,
    sourceToTargetAssignable: true,
    targetToSourceAssignable: true,
  },
);
expectValueChannel(
  'checked-select-custom-matcher',
  'Checked Set membership should stay distinct from boolean checkbox flow.',
  {
    channelKind: 'checked-collection-membership',
    sourceName: 'selectedItemSet',
    usesCustomMatcher: true,
    isCollection: true,
    sourceToTargetAssignable: true,
    targetToSourceAssignable: true,
  },
);
expectValueChannel(
  'checked-select-custom-matcher',
  'Checked Map keyed booleans should carry key membership plus boolean map-value assignability.',
  {
    channelKind: 'checked-map-keyed-boolean',
    sourceName: 'selectedItemMap',
    usesCustomMatcher: true,
    isCollection: true,
    sourceToTargetAssignable: true,
    targetToSourceAssignable: true,
  },
);
expectValueChannel(
  'checked-select-custom-matcher',
  'Readonly checked Set membership should read to the target while rejecting source mutation.',
  {
    channelKind: 'checked-collection-membership',
    sourceName: 'readonlyItemSet',
    usesCustomMatcher: true,
    isCollection: true,
    sourceToTargetAssignable: true,
    targetToSourceAssignable: false,
  },
);
expectValueChannel(
  'checked-select-custom-matcher',
  'Readonly checked Map keyed booleans should read to the target while rejecting source mutation.',
  {
    channelKind: 'checked-map-keyed-boolean',
    sourceName: 'readonlyItemMap',
    usesCustomMatcher: true,
    isCollection: true,
    sourceToTargetAssignable: true,
    targetToSourceAssignable: false,
  },
);
expectValueChannel(
  'checked-select-custom-matcher',
  'Readonly multiple select arrays should read selections while rejecting source mutation.',
  {
    channelKind: 'select-multiple-option-values',
    sourceName: 'readonlySelectedItems',
    usesCustomMatcher: true,
    isCollection: true,
    sourceToTargetAssignable: true,
    targetToSourceAssignable: false,
  },
);
expectValueChannel(
  'select-multiple-binding-order',
  'Static multiple selects should close as collection channels regardless of sibling binding order.',
  {
    channelKind: 'select-multiple-option-values',
    sourceName: 'selectedFirst',
    isCollection: true,
    valueDomain: ['alpha', 'beta'],
    sourceToTargetAssignable: true,
    targetToSourceAssignable: true,
  },
);
expectValueChannel(
  'select-multiple-binding-order',
  'Dynamic multiple.bind selects should remain their own scalar-or-array channel.',
  {
    channelKind: 'select-dynamic-option-value',
    sourceName: 'selectedDynamic',
    isCollection: null,
    valueDomain: ['alpha', 'beta'],
    sourceToTargetAssignable: true,
    targetToSourceAssignable: true,
  },
);
expectValueChannel(
  'select-single-array-value',
  'Single select array source should keep the exact AUR0654 data-flow diagnostic.',
  {
    channelKind: 'select-single-option-value',
    sourceName: 'selectedTags',
    sourceToTargetAssignable: false,
    targetToSourceAssignable: false,
    frameworkErrorCode: 'AUR0654',
  },
);

const summary = {
  fixtures: [...fixtures.entries()].map(([fixture, rows]) => ({
    fixture,
    valueChannels: rows.valueChannels.length,
    dataFlows: rows.dataFlows.length,
    relevantDataFlows: rows.dataFlows
      .filter((row) => row.valueChannelKind?.includes('select') || row.valueChannelKind?.includes('checked'))
      .map((row) => ({
        sourceName: row.sourceName,
        valueChannelKind: row.valueChannelKind,
        sourceToTargetAssignable: row.sourceToTargetAssignable,
        targetToSourceAssignable: row.targetToSourceAssignable,
        frameworkErrorCode: row.frameworkErrorCode,
      })),
  })),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

async function readFixtureRows(fixtureName) {
  const fixtureRoot = path.join(packageRoot, 'fixtures/pressure', fixtureName);
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    storeKey: `${fixtureName}-value-channel-contract`,
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  return {
    valueChannels: app.ask({
      kind: 'binding-value-channels',
      page: { size: 1000 },
    }).value.rows,
    dataFlows: app.ask({
      kind: 'binding-data-flows',
      page: { size: 1000 },
    }).value.rows,
  };
}

function expectValueChannel(fixtureName, summary, expected) {
  const rows = fixtures.get(fixtureName);
  const row = rows.dataFlows.find((candidate) =>
    candidate.valueChannelKind === expected.channelKind
    && candidate.sourceName === expected.sourceName
    && (expected.frameworkErrorCode === undefined || candidate.frameworkErrorCode === expected.frameworkErrorCode)
  );
  if (row == null) {
    failures.push(`${summary}: missing data-flow row for ${expected.sourceName} / ${expected.channelKind}.`);
    return;
  }
  const valueChannel = rows.valueChannels.find((candidate) =>
    candidate.channelKind === expected.channelKind
    && candidate.source?.label === row.source?.label
  ) ?? null;
  for (const [field, value] of Object.entries(expected)) {
    if (field === 'channelKind' || field === 'sourceName') {
      continue;
    }
    const actualValue = Object.hasOwn(row, field)
      ? row[field]
      : valueChannel?.[field];
    if (Array.isArray(value)) {
      const actual = actualValue ?? [];
      const missing = value.filter((item) => !actual.includes(item));
      if (missing.length > 0) {
        failures.push(`${summary}: expected ${field} to include [${missing.join(', ')}], got [${actual.join(', ')}].`);
      }
      continue;
    }
    if (actualValue !== value) {
      failures.push(`${summary}: expected ${field}=${String(value)}, got ${String(actualValue)}.`);
    }
  }
}
