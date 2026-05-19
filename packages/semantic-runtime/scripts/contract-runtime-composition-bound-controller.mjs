import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSemanticRuntime } from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/au-compose-dynamic-composition');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'runtime-composition-bound-controller-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const compositions = app.ask({
  kind: 'runtime-compositions',
  page: { size: 100 },
}).value.rows;

const widgetHostRows = compositions.filter((row) =>
  row.source?.label?.includes('widget-host.html') === true
);
const openRows = compositions.filter((row) => row.openReason != null);
const failures = [
  widgetHostRows.length === 2
    ? null
    : `Expected 2 widget-host runtime composition rows; observed ${widgetHostRows.length}.`,
  widgetHostRows.some((row) => row.renderingContextKind === 'recursive-resource-instance')
    ? null
    : 'Expected a recursive-resource-instance widget-host row from the parent render pass.',
  widgetHostRows.some((row) => row.renderingContextKind === 'definition-resource')
    ? null
    : 'Expected a definition-resource widget-host row from the resource analysis pass.',
  openRows.length === 0
    ? null
    : `Expected no open runtime composition rows; observed ${openRows.length}.`,
  ...widgetHostRows.map((row) =>
    row.componentResolutionKind === 'static-value'
    && row.modelResolutionKind === 'static-value'
    && row.resolvedComponentClassNames.includes('InventoryWidget')
      ? null
      : `Widget-host row did not close to InventoryWidget via bound-controller value flow: ${JSON.stringify({
        renderingDefinitionName: row.renderingDefinitionName,
        componentResolutionKind: row.componentResolutionKind,
        modelResolutionKind: row.modelResolutionKind,
        resolvedComponentClassNames: row.resolvedComponentClassNames,
        openReason: row.openReason,
      })}`
  ),
].filter(Boolean);

const summary = {
  fixture: 'au-compose-dynamic-composition',
  widgetHostRows: widgetHostRows.map((row) => ({
    renderingDefinitionName: row.renderingDefinitionName,
    renderingContextKind: row.renderingContextKind,
    componentResolutionKind: row.componentResolutionKind,
    modelResolutionKind: row.modelResolutionKind,
    resolvedComponentNames: row.resolvedComponentNames,
    resolvedComponentClassNames: row.resolvedComponentClassNames,
    openReason: row.openReason,
  })),
  openRows: openRows.map((row) => ({
    renderingDefinitionName: row.renderingDefinitionName,
    source: row.source?.label ?? null,
    openReason: row.openReason,
  })),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}
