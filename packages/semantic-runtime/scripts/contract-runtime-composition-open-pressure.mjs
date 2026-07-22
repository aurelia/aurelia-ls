import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SemanticAppQueryKind,
  createSemanticRuntime,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/au-compose-open-pressure');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'runtime-composition-open-pressure-contract',
});
const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
const compositions = app.ask({
  kind: SemanticAppQueryKind.RuntimeCompositions,
  detail: 'handles',
  page: { size: 100 },
}).value.rows.filter((row) => row.renderingDefinitionName === 'au-compose-open-pressure-app');
const openSeams = app.ask({
  kind: SemanticAppQueryKind.OpenSeams,
  detail: 'handles',
  page: { size: 200 },
}).value.rows.filter((row) => row.seamKindKey === 'template.open-runtime-composition');
const materializations = runtime.workspace.store.readMaterializations();
const openSeamsByHandle = new Map(openSeams.flatMap((row) =>
  row.handles == null ? [] : [[row.handles.handle, row]]
));

const closedComponentRows = compositions.filter((row) =>
  sourceText(row.source).includes('component.bind="closedComponent"')
);
const pressuredComponentRows = compositions.filter((row) =>
  sourceText(row.source).includes('component.bind="pressuredComponent"')
);
const partialComponentRows = compositions.filter((row) =>
  sourceText(row.source).includes('component.bind="partialComponent"')
);
const failures = [];

if (closedComponentRows.length === 0) {
  failures.push('Expected a runtime-composition row for the closed component plus five independently open inputs.');
}
if (pressuredComponentRows.length === 0) {
  failures.push('Expected a runtime-composition row for the open-with-value component candidate.');
}
if (partialComponentRows.length === 0) {
  failures.push('Expected a runtime-composition row for the partially covered TypeChecker candidate set.');
}

for (const row of closedComponentRows) {
  const contextSeams = productOpenSeams(row.handles?.compositionContextProductHandle ?? null);
  const controllerSeams = productOpenSeams(row.handles?.compositionControllerProductHandle ?? null);
  const inputNames = contextSeams.flatMap(inputNameForSeam);
  const expectedInputs = ['template', 'model', 'scopeBehavior', 'tag', 'flushMode'];
  if (!expectedInputs.every((name) => inputNames.includes(name)) || contextSeams.length !== expectedInputs.length) {
    failures.push(`Expected the composition context to retain exactly five independently open non-component inputs, observed ${JSON.stringify(inputNames)}.`);
  }
  if (!contextSeams.every((seam) => sourceText(seam.source).includes('.bind='))) {
    failures.push('Expected every non-component input seam to use its exact authored binding attribute as primary source.');
  }
  if (!contextSeams.every((seam) => seam.reasonSources.some((source) =>
    source.source?.path?.endsWith('au-compose-open-pressure-app.ts') === true
  ))) {
    failures.push('Expected every non-component input seam to retain its evaluator-origin TypeScript reason source.');
  }
  if (controllerSeams.length < contextSeams.length) {
    failures.push('Expected the aggregate CompositionController to retain every open CompositionContext input seam.');
  }
  if (row.composedChildControllerCount !== 1 || row.composedChildContainerCount !== 1) {
    failures.push(`Expected non-component pressure not to suppress the closed custom-element child, observed controllers=${row.composedChildControllerCount}, containers=${row.composedChildContainerCount}.`);
  }
  if (row.componentInputFulfillmentKind !== 'direct') {
    failures.push(`Expected the closed component input to remain directly fulfilled, observed ${row.componentInputFulfillmentKind}.`);
  }
  if (row.templateInputFulfillmentKind !== 'open' || row.modelInputFulfillmentKind !== 'open') {
    failures.push(`Expected open template/model inputs to stay explicitly open despite retained types or values, observed template=${row.templateInputFulfillmentKind}, model=${row.modelInputFulfillmentKind}.`);
  }
}

for (const row of pressuredComponentRows) {
  const contextSeams = productOpenSeams(row.handles?.compositionContextProductHandle ?? null);
  const componentSeams = contextSeams.filter((seam) => inputNameForSeam(seam).includes('component'));
  if (componentSeams.length !== 1) {
    failures.push(`Expected exactly one component-input seam for the open-with-value candidate, observed ${componentSeams.length}.`);
  }
  if (row.componentResolutionKind !== 'static-value' || !row.resolvedComponentNames.includes('pressure-widget')) {
    failures.push(`Expected the pressured component to retain PressureWidget as a useful static candidate, observed kind=${row.componentResolutionKind}, candidates=${JSON.stringify(row.resolvedComponentNames)}.`);
  }
  if (row.componentInputFulfillmentKind !== 'open') {
    failures.push(`Expected the open-with-value component input to remain epistemically open, observed ${row.componentInputFulfillmentKind}.`);
  }
  if (row.composedChildControllerCount !== 0 || row.composedChildContainerCount !== 0) {
    failures.push(`Expected component pressure to block concrete child materialization, observed controllers=${row.composedChildControllerCount}, containers=${row.composedChildContainerCount}.`);
  }
  if (!componentSeams.some((seam) => seam.reasonSources.some((source) =>
    source.source?.path?.endsWith('au-compose-open-pressure-app.ts') === true
    && sourceText(source.source).includes('...runtimeCompositionDefaults')
  ))) {
    failures.push('Expected component pressure to retain the exact later spread that can replace the candidate value.');
  }
  const componentSeamHandles = componentSeams.flatMap((seam) => seam.handles == null ? [] : [seam.handles.handle]);
  if (!materializations.some((materialization) =>
    materialization.productHandles.length === 0
    && componentSeamHandles.some((handle) => materialization.openSeamHandles.includes(handle))
  )) {
    failures.push('Expected the refused composed-child attempt to retain the component seam on a zero-product materialization.');
  }
}

for (const row of partialComponentRows) {
  const contextSeams = productOpenSeams(row.handles?.compositionContextProductHandle ?? null);
  const componentSeams = contextSeams.filter((seam) => inputNameForSeam(seam).includes('component'));
  if (
    row.componentResolutionKind !== 'type-candidate'
    || row.componentCandidateCoverageKind !== 'partial'
    || !row.resolvedComponentNames.includes('pressure-widget')
    || row.openReason == null
  ) {
    failures.push(`Expected the same-named cross-module non-resource constituent to remain a partial candidate set: ${JSON.stringify({
      componentResolutionKind: row.componentResolutionKind,
      componentCandidateCoverageKind: row.componentCandidateCoverageKind,
      resolvedComponentNames: row.resolvedComponentNames,
      openReason: row.openReason,
    })}.`);
  }
  if (componentSeams.length !== 1) {
    failures.push(`Expected partial candidate coverage to retain exactly one component-input seam, observed ${componentSeams.length}.`);
  }
  if (row.composedChildControllerCount !== 0 || row.composedChildContainerCount !== 0) {
    failures.push(`Expected partial candidate coverage not to materialize a concrete child, observed controllers=${row.composedChildControllerCount}, containers=${row.composedChildContainerCount}.`);
  }
}

function productOpenSeams(productHandle) {
  if (productHandle == null) {
    return [];
  }
  return materializations
    .filter((materialization) => materialization.productHandles.includes(productHandle))
    .flatMap((materialization) => materialization.openSeamHandles)
    .flatMap((handle) => openSeamsByHandle.get(handle) ?? []);
}

function inputNameForSeam(seam) {
  const match = /^AuCompose '([^']+)' input remained open/.exec(seam.summary);
  return match == null ? [] : [match[1]];
}

function sourceText(source) {
  if (source?.path == null || source.start == null || source.end == null) {
    return '';
  }
  const sourcePath = path.isAbsolute(source.path)
    ? source.path
    : path.resolve(fixtureRoot, source.path);
  if (!fs.existsSync(sourcePath)) {
    return '';
  }
  return fs.readFileSync(sourcePath, 'utf8').slice(source.start, source.end);
}

const summary = {
  fixture: 'au-compose-open-pressure',
  compositionRows: compositions.map((row) => ({
    source: sourceText(row.source),
    componentResolutionKind: row.componentResolutionKind,
    componentInputFulfillmentKind: row.componentInputFulfillmentKind,
    templateInputFulfillmentKind: row.templateInputFulfillmentKind,
    modelInputFulfillmentKind: row.modelInputFulfillmentKind,
    resolvedComponentNames: row.resolvedComponentNames,
    componentCandidateCoverageKind: row.componentCandidateCoverageKind,
    composedChildControllerCount: row.composedChildControllerCount,
    composedChildContainerCount: row.composedChildContainerCount,
    contextOpenInputs: productOpenSeams(row.handles?.compositionContextProductHandle ?? null).flatMap(inputNameForSeam),
  })),
  openSeams: openSeams.map((row) => ({
    summary: row.summary,
    source: sourceText(row.source),
    reasonKinds: row.reasonKinds,
    reasonSources: row.reasonSources.map((source) => ({
      reasonKind: source.reasonKind,
      source: sourceText(source.source),
      path: source.source?.path ?? null,
    })),
  })),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}
