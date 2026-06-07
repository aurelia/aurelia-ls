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

const answer = await runtime.answerAppQuery({
  kind: SemanticAppQueryKind.ControlUseInventory,
  analysisDepth: SemanticAppAnalysisDepth.BindingObservation,
  detail: SemanticRuntimeDetail.Handles,
  page: { size: 100 },
});

assert.equal(answer.outcome, SemanticRuntimeAnswerOutcome.Hit);

const rows = answer.value.rows;
assert.ok(rows.length >= 10, 'Expected source-lowering gallery fixture to expose generated value controls and button actions.');

for (const expected of [
  AppBuilderControlId.TextInput,
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
