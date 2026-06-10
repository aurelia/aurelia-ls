import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AppBuilderControlId,
  AppBuilderControlPatternId,
  AppBuilderControlUseActionChannelKind,
  createSemanticRuntime,
  SemanticAppAnalysisDepth,
  SemanticAppQueryKind,
  SemanticControlUseClassificationKind,
  SemanticControlUseInventorySourceKind,
  SemanticRuntimeAnswerOutcome,
  SemanticRuntimeDetail,
} from '../out/index.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.resolve(
  scriptDir,
  '../fixtures/pressure/app-builder-source-lowering-gallery',
);

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  projectDiscovery: 'single-root',
});

const rows = await collectRuntimeAppQueryRows(runtime, {
  kind: SemanticAppQueryKind.ControlUseInventory,
  analysisDepth: SemanticAppAnalysisDepth.BindingObservation,
  detail: SemanticRuntimeDetail.Handles,
}, 100);
assert.ok(rows.length >= 20, 'Expected source-lowering gallery fixture to expose generated value controls and button actions.');

for (const expected of [
  AppBuilderControlId.TextInput,
  AppBuilderControlId.EmailInput,
  AppBuilderControlId.UrlInput,
  AppBuilderControlId.TelInput,
  AppBuilderControlId.PasswordInput,
  AppBuilderControlId.SearchInput,
  AppBuilderControlId.TimeInput,
  AppBuilderControlId.DateTimeLocalInput,
  AppBuilderControlId.MonthInput,
  AppBuilderControlId.WeekInput,
  AppBuilderControlId.DateInput,
  AppBuilderControlId.Checkbox,
  AppBuilderControlId.SingleSelect,
  AppBuilderControlId.MultiSelect,
]) {
  assert.ok(
    rows.some((row) =>
      row.controlId === expected
      && row.classificationKind === SemanticControlUseClassificationKind.NativeValueChannel
      && row.bindingExpression != null
      && row.source?.path === 'src/my-app.html'
      && row.handles?.valueChannelProductHandle != null
    ),
    `Expected authored control-use inventory to include ${expected}.`,
  );
}

assert.ok(
  rows.some((row) =>
    row.controlPatternId === AppBuilderControlPatternId.NativeButton
    && row.classificationKind === SemanticControlUseClassificationKind.NativeButtonAction
    && row.eventName === 'click'
    && row.actionChannelKind === AppBuilderControlUseActionChannelKind.DirectControlEvent
    && row.bindingExpression === 'save()'
  ),
  'Expected authored control-use inventory to include native button listener actions.',
);

assert.ok(
  rows.some((row) =>
    row.controlPatternId === AppBuilderControlPatternId.NativeButton
    && row.classificationKind === SemanticControlUseClassificationKind.NativeButtonAction
    && row.eventName === 'click'
    && row.bindingExpression === 'adjustStock(item, -1)'
    && row.sourceName === 'adjustStock(item, -1)'
  ),
  'Expected action source-name projection to preserve unary negative arguments.',
);

assert.ok(
  rows.some((row) =>
    row.controlPatternId === AppBuilderControlPatternId.NativeButton
    && row.classificationKind === SemanticControlUseClassificationKind.NativeButtonAction
    && row.eventName === 'submit'
    && row.actionChannelKind === AppBuilderControlUseActionChannelKind.ContainingFormSubmit
    && row.buttonText === 'Save item'
    && row.buttonType === 'submit'
    && row.bindingExpression === 'save()'
    && row.source?.path === 'src/my-app.html'
    && row.handles?.valueChannelProductHandle != null
    && row.handles?.htmlNodeProductHandle != null
  ),
  'Expected authored control-use inventory to include static submit buttons backed by the containing form submit listener.',
);

assert.ok(
  rows.some((row) =>
    row.controlPatternId === AppBuilderControlPatternId.NativeLinkNavigation
    && row.classificationKind === SemanticControlUseClassificationKind.NativeLinkNavigation
    && row.sourceKind === SemanticControlUseInventorySourceKind.AuthoredStaticTemplate
    && row.actionChannelKind === AppBuilderControlUseActionChannelKind.RouterLoadNavigation
    && row.routeInstruction === 'route: gallery-item-detail; params.bind: { itemId: items[0].id }'
    && row.linkText === 'Open item'
    && row.bindingKind === null
    && row.valueChannelKind === null
    && row.handles?.valueChannelProductHandle === null
    && row.handles?.htmlNodeProductHandle != null
  ),
  'Expected authored control-use inventory to include static router load link navigation without binding value-channel handles.',
);

assert.ok(
  rows.some((row) =>
    row.controlPatternId === AppBuilderControlPatternId.FormMessage
    && row.classificationKind === SemanticControlUseClassificationKind.NativeFormMessage
    && row.sourceKind === SemanticControlUseInventorySourceKind.AuthoredStaticTemplate
    && row.targetAttribute === 'role'
    && row.bindingKind === null
    && row.valueChannelKind === null
    && row.handles?.valueChannelProductHandle === null
    && row.handles?.htmlNodeProductHandle != null
  ),
  'Expected authored control-use inventory to include static form/status messages without binding value-channel handles.',
);

assert.deepEqual(
  [...new Set(rows.map((row) => row.sourceKind))].sort(),
  [
    SemanticControlUseInventorySourceKind.AuthoredRuntimeBinding,
    SemanticControlUseInventorySourceKind.AuthoredStaticTemplate,
  ].sort(),
  'Expected control-use inventory rows to distinguish authored runtime binding rows from authored static-template route links.',
);

console.log(JSON.stringify({
  ok: true,
  rows: rows.length,
  controls: rows.map((row) => row.controlId ?? row.controlPatternId),
}, null, 2));

async function collectRuntimeAppQueryRows(runtime, request, pageSize) {
  const rows = [];
  let cursor = null;
  do {
    const answer = await runtime.answerAppQuery({
      ...request,
      page: { size: pageSize, cursor },
    });
    assert.notEqual(answer.outcome, SemanticRuntimeAnswerOutcome.Error);
    rows.push(...answer.value.rows);
    cursor = answer.page?.nextCursor ?? null;
  } while (cursor != null);
  return rows;
}
