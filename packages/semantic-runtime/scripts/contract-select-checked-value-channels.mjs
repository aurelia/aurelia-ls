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
    observerCouplings: ['select-option-value-domain', 'select-option-list-mutation-observer'],
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
    observerCouplings: ['select-option-value-domain', 'select-option-list-mutation-observer'],
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
    observerCouplings: ['select-option-value-domain', 'select-option-list-mutation-observer'],
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
    observerCouplings: ['checked-element-value-domain', 'checked-element-value-observer', 'checked-radio-value-sync'],
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
    observerCouplings: ['checked-element-value-domain', 'checked-element-value-observer', 'checked-radio-value-sync'],
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
    observerCouplings: ['checked-element-value-domain', 'checked-element-value-observer', 'checked-radio-value-sync', 'custom-matcher-comparison'],
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
    observerCouplings: ['select-option-value-domain', 'select-option-list-mutation-observer', 'custom-matcher-comparison'],
    sourceToTargetAssignable: true,
    targetToSourceAssignable: true,
  },
);
expectValueChannel(
  'checked-select-custom-matcher',
  'Boolean checkbox flow should ignore an authored matcher because CheckedObserver only compares model/value in radio and collection modes.',
  {
    channelKind: 'checked-boolean',
    sourceName: 'booleanAcknowledged',
    usesCustomMatcher: false,
    observerCouplings: ['checked-boolean-sync'],
    sourceToTargetAssignable: true,
    targetToSourceAssignable: true,
  },
);
expectMatcherFunctionChannels(
  'checked-select-custom-matcher',
  'Authored matcher.bind should materialize as a framework matcher function slot, not as an unknown raw property.',
  {
    sourceName: 'matchItems',
    expectedCount: 12,
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
    observerCouplings: ['checked-element-value-domain', 'checked-element-value-observer', 'checked-collection-observer', 'checked-collection-membership-mutation', 'custom-matcher-comparison'],
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
    observerCouplings: ['checked-element-value-domain', 'checked-element-value-observer', 'checked-collection-observer', 'checked-collection-membership-mutation', 'custom-matcher-comparison'],
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
    observerCouplings: ['checked-element-value-domain', 'checked-element-value-observer', 'checked-collection-observer', 'checked-map-keyed-boolean-mutation', 'custom-matcher-comparison'],
    sourceToTargetAssignable: true,
    targetToSourceAssignable: true,
  },
);
expectValueChannel(
  'checked-select-custom-matcher',
  'Checked checkbox source typed as collection or boolean should stay dynamic and require both branches to be valid.',
  {
    channelKind: 'checked-dynamic-model-value',
    sourceName: 'selectedItemsOrBoolean',
    usesCustomMatcher: true,
    isCollection: null,
    observerCouplings: ['checked-boolean-sync', 'checked-dynamic-source-shape', 'checked-collection-membership-mutation', 'custom-matcher-comparison'],
    sourceToTargetAssignable: true,
    targetToSourceAssignable: true,
  },
);
expectValueChannel(
  'checked-select-custom-matcher',
  'Checked checkbox source typed as collection or null should reject the boolean write branch.',
  {
    channelKind: 'checked-dynamic-model-value',
    sourceName: 'nullableSelectedItems',
    usesCustomMatcher: true,
    isCollection: null,
    observerCouplings: ['checked-boolean-sync', 'checked-dynamic-source-shape', 'checked-collection-membership-mutation', 'custom-matcher-comparison'],
    sourceToTargetAssignable: true,
    targetToSourceAssignable: false,
    sourceAssignmentReasonKinds: ['target-to-source-type-mismatch'],
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
    observerCouplings: ['checked-collection-observer', 'checked-collection-membership-mutation'],
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
    observerCouplings: ['checked-collection-observer', 'checked-map-keyed-boolean-mutation'],
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
    observerCouplings: ['select-option-value-domain', 'select-option-list-mutation-observer', 'select-array-observer', 'select-array-mutation', 'custom-matcher-comparison'],
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
    observerCouplings: ['select-option-value-domain', 'select-option-list-mutation-observer', 'select-array-observer', 'select-array-mutation'],
    sourceToTargetAssignable: true,
    targetToSourceAssignable: true,
  },
);
expectValueChannel(
  'select-multiple-binding-order',
  'Nullable static multiple select sources should expose the runtime array-or-noop branch instead of pretending every source state mutates.',
  {
    channelKind: 'select-multiple-option-values',
    sourceName: 'selectedNullable',
    isCollection: true,
    valueDomain: ['eta', 'theta'],
    observerCouplings: ['select-option-value-domain', 'select-option-list-mutation-observer', 'select-array-observer', 'select-array-mutation', 'select-dynamic-array-source-shape'],
    sourceToTargetAssignable: true,
    targetToSourceAssignable: null,
  },
);
expectTemplateDiagnostic(
  'select-multiple-binding-order',
  'Nullable static multiple select sources should surface a framework-runtime branch warning with a source-type repair target.',
  {
    diagnosticKind: 'binding-source-runtime-branch-open',
    missingInput: 'binding-value-channel:select-multiple-source-open',
    selectedMemberName: 'selectedNullable',
    suggestionKind: 'align-assignment-type',
    actionKind: 'change-member-type',
    actionTargetKind: 'owner-type',
    actionTargetMemberName: 'selectedNullable',
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
    observerCouplings: ['select-option-value-domain', 'select-option-list-mutation-observer', 'select-dynamic-multiple-mode'],
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
    observerCouplings: ['select-option-value-domain', 'select-option-list-mutation-observer'],
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
    templateDiagnostics: rows.templateDiagnostics.length,
    relevantDataFlows: rows.dataFlows
      .filter((row) => row.valueChannelKind?.includes('select') || row.valueChannelKind?.includes('checked'))
      .map((row) => ({
        sourceName: row.sourceName,
        valueChannelKind: row.valueChannelKind,
        sourceToTargetAssignable: row.sourceToTargetAssignable,
        targetToSourceAssignable: row.targetToSourceAssignable,
        frameworkErrorCode: row.frameworkErrorCode,
        observerCouplings: valueChannelForDataFlow(rows.valueChannels, row)?.observerCouplings ?? [],
      })),
    relevantTemplateDiagnostics: rows.templateDiagnostics
      .filter((row) => row.missingInput?.includes('select') || row.selectedMemberName?.includes('selected'))
      .map((row) => ({
        diagnosticKind: row.diagnosticKind,
        missingInput: row.missingInput,
        selectedMemberName: row.selectedMemberName,
        suggestionKind: row.suggestion?.suggestionKind ?? null,
        actionTargetKind: row.suggestion?.actionTarget?.targetKind ?? null,
      })),
  })),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function valueChannelForDataFlow(valueChannels, dataFlow) {
  return valueChannels.find((candidate) =>
    candidate.channelKind === dataFlow.valueChannelKind
    && candidate.source?.label === dataFlow.source?.label
  ) ?? null;
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
    dataFlowSummary: app.ask({
      kind: 'binding-data-flow-summary',
      page: { size: 0 },
    }).value,
    valueChannels: app.ask({
      kind: 'binding-value-channels',
      page: { size: 1000 },
    }).value.rows,
    dataFlows: app.ask({
      kind: 'binding-data-flows',
      page: { size: 1000 },
    }).value.rows,
    templateDiagnostics: app.ask({
      kind: 'template-diagnostics',
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

function expectTemplateDiagnostic(fixtureName, summary, expected) {
  const rows = fixtures.get(fixtureName);
  const row = rows.templateDiagnostics.find((candidate) =>
    candidate.diagnosticKind === expected.diagnosticKind
    && candidate.missingInput === expected.missingInput
    && candidate.selectedMemberName === expected.selectedMemberName
  );
  if (row == null) {
    failures.push(`${summary}: missing template diagnostic ${expected.diagnosticKind} for ${expected.selectedMemberName}.`);
    return;
  }
  if (row.suggestion?.suggestionKind !== expected.suggestionKind) {
    failures.push(`${summary}: expected suggestion ${expected.suggestionKind}, received ${row.suggestion?.suggestionKind ?? 'none'}.`);
  }
  if (row.suggestion?.actionKind !== expected.actionKind) {
    failures.push(`${summary}: expected action ${expected.actionKind}, received ${row.suggestion?.actionKind ?? 'none'}.`);
  }
  if (row.suggestion?.actionTarget?.targetKind !== expected.actionTargetKind) {
    failures.push(`${summary}: expected action target kind ${expected.actionTargetKind}, received ${row.suggestion?.actionTarget?.targetKind ?? 'none'}.`);
  }
  if (row.suggestion?.actionTarget?.memberName !== expected.actionTargetMemberName) {
    failures.push(`${summary}: expected action target member ${expected.actionTargetMemberName}, received ${row.suggestion?.actionTarget?.memberName ?? 'none'}.`);
  }
}

function expectMatcherFunctionChannels(fixtureName, summary, expected) {
  const rows = fixtures.get(fixtureName);
  const matcherRows = rows.dataFlows.filter((candidate) =>
    candidate.targetProperty === 'matcher'
    && (expected.sourceName === undefined || candidate.sourceName === expected.sourceName)
  );
  if (matcherRows.length === 0) {
    failures.push(`${summary}: missing matcher.bind data-flow rows for ${expected.sourceName ?? 'any source'}.`);
    return;
  }
  if (expected.expectedCount !== undefined && matcherRows.length !== expected.expectedCount) {
    failures.push(`${summary}: expected ${expected.expectedCount} matcher.bind rows, got ${matcherRows.length}.`);
  }
  for (const row of matcherRows) {
    if (row.valueChannelKind !== 'custom-matcher-function') {
      failures.push(`${summary}: expected matcher.bind channel kind custom-matcher-function, got ${row.valueChannelKind}.`);
    }
    if (row.targetValueType !== '(left: unknown, right: unknown) => boolean') {
      failures.push(`${summary}: expected matcher.bind target function type, got ${row.targetValueType}.`);
    }
    if (row.sourceToTargetAssignable !== true) {
      failures.push(`${summary}: expected matcher.bind source-to-target assignable, got ${row.sourceToTargetAssignable}.`);
    }
  }

  const matcherIssues = rows.dataFlowSummary.issueRows.filter((issue) =>
    issue.issueKind === 'source-to-target-unknown'
    && issue.targetProperties.includes('matcher')
  );
  if (matcherIssues.length > 0) {
    failures.push(`${summary}: matcher.bind still appears in source-to-target-unknown issue rows.`);
  }
}
