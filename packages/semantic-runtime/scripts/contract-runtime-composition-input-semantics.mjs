import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SemanticAppQueryKind,
  createSemanticRuntime,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const dynamicFixtureRoot = path.join(packageRoot, 'fixtures/pressure/au-compose-dynamic-composition');
const pressureFixtureRoot = path.join(packageRoot, 'fixtures/pressure/au-compose-open-pressure');

const dynamicRows = await compositionRows(dynamicFixtureRoot, 'runtime-composition-input-semantics:dynamic');
const pressureRows = await compositionRows(pressureFixtureRoot, 'runtime-composition-input-semantics:pressure');
const failures = [];

const asyncComponent = rowWithSource(dynamicRows, 'component.bind="getAsyncComponent()"');
expectRow(asyncComponent, 'fulfilled component thenable', (row) =>
  row.componentInputConsumptionKind === 'await-thenable'
  && row.componentInputValueStateKind === 'fulfilled'
  && row.componentInputSettlementKind === 'fulfilled'
  && row.componentInputType === 'typeof ChartWidget'
  && row.componentResolutionKind === 'static-value'
  && row.resolvedComponentNames.includes('chart-widget')
  && row.composedChildControllerCount === 1
);

const asyncTemplate = rowWithSource(dynamicRows, 'template.bind="getAsyncTemplate()"');
expectRow(asyncTemplate, 'fulfilled template thenable', (row) =>
  row.templateInputConsumptionKind === 'await-thenable'
  && row.templateInputValueStateKind === 'fulfilled'
  && row.templateInputSettlementKind === 'fulfilled'
  && row.templateInputType === 'string'
  && row.resolvedTemplate === '<p>Selected widget summary</p>'
  && row.componentResolutionKind === 'template-only'
);

const openTemplate = rowWithSource(dynamicRows, 'template.bind="getOpenTemplate()"');
expectRow(openTemplate, 'open template thenable settlement', (row) =>
  row.templateInputConsumptionKind === 'await-thenable'
  && row.templateInputValueStateKind === 'open'
  && row.templateInputSettlementKind === 'open'
  && row.templateInputType === 'string'
  && row.resolvedTemplate == null
  && row.componentResolutionKind === 'template-only'
  && row.reasonKinds.includes('async-execution-value')
  && row.openReason != null
);

const rejectedComponent = rowWithSource(dynamicRows, 'component.bind="rejectedComponent"');
expectRow(rejectedComponent, 'rejected component thenable', (row) =>
  row.componentInputConsumptionKind === 'await-thenable'
  && row.componentInputValueStateKind === 'rejected'
  && row.componentInputSettlementKind === 'rejected'
  && row.componentResolutionKind === 'rejected'
  && row.composedChildControllerCount === 0
  && row.openReason == null
);

const rejectedTemplate = rowWithSource(dynamicRows, 'template.bind="rejectedTemplate"');
expectRow(rejectedTemplate, 'rejected template thenable', (row) =>
  row.templateInputConsumptionKind === 'await-thenable'
  && row.templateInputValueStateKind === 'rejected'
  && row.templateInputSettlementKind === 'rejected'
  && row.templateInputType === 'string'
  && row.resolvedTemplate == null
  && row.componentResolutionKind === 'template-only'
);

const directPromiseModel = rowWithSource(dynamicRows, 'model.bind="promisedModel"');
expectRow(directPromiseModel, 'direct Promise-valued model', (row) =>
  row.modelInputConsumptionKind === 'direct'
  && row.modelInputValueStateKind === 'fulfilled'
  && row.activationHandoffKinds.includes('model-unassignable')
);

const directPromiseOptions = rowWithSource(dynamicRows, 'scope-behavior.bind="promisedScopeBehavior"');
expectRow(directPromiseOptions, 'direct Promise-valued options', (row) =>
  row.scopeBehaviorInputConsumptionKind === 'direct'
  && row.scopeBehaviorInputValueStateKind === 'fulfilled'
  && row.tagInputConsumptionKind === 'direct'
  && row.tagInputValueStateKind === 'fulfilled'
  && row.flushModeInputConsumptionKind === 'direct'
  && row.flushModeInputValueStateKind === 'fulfilled'
  && row.scopeBehavior == null
  && row.tag == null
  && row.flushMode == null
);

const nonCallableActivation = rowWithSource(dynamicRows, 'component.bind="nonCallableActivationComponent"');
expectRow(nonCallableActivation, 'closed non-callable activate contract', (row) =>
  row.componentResolutionKind === 'object-view-model'
  && row.activationHandoffs.length === 1
  && row.activationHandoffs[0]?.methodKind === 'non-callable'
  && row.activationHandoffs[0]?.handoffKind === 'activate-non-callable'
  && row.activationHandoffs[0]?.openReason == null
  && row.activationOpenReasonCount === 0
);

const openActivation = rowWithSource(dynamicRows, 'component.bind="openActivationComponent"');
expectRow(openActivation, 'weak Function-typed activate contract', (row) =>
  row.componentResolutionKind === 'object-view-model'
  && row.activationHandoffs.length === 1
  && row.activationHandoffs[0]?.methodKind === 'open'
  && row.activationHandoffs[0]?.handoffKind === 'open'
  && row.activationHandoffs[0]?.openReason != null
  && row.activationOpenReasonCount === 1
);

const awaitedTypeCandidate = rowWithSource(pressureRows, 'component.bind="awaitedPressureWidget"');
expectRow(awaitedTypeCandidate, 'open awaited TypeChecker candidate', (row) =>
  row.componentInputConsumptionKind === 'await-thenable'
  && row.componentInputValueStateKind === 'open'
  && row.componentResolutionKind === 'type-candidate'
  && row.componentCandidateCoverageKind === 'complete'
  && row.resolvedComponentNames.includes('pressure-widget')
  && row.composedChildControllerCount === 0
);

const broadTypeCandidate = rowWithSource(pressureRows, 'component.bind="broadPressureWidget"');
expectRow(broadTypeCandidate, 'non-exhaustive construct-signature candidate', (row) =>
  row.componentInputConsumptionKind === 'await-thenable'
  && row.componentInputValueStateKind === 'open'
  && row.componentResolutionKind === 'type-candidate'
  && row.componentCandidateCoverageKind === 'partial'
  && row.resolvedComponentNames.includes('pressure-widget')
  && row.composedChildControllerCount === 0
  && row.openReason != null
);

function expectRow(row, label, predicate) {
  if (row == null) {
    failures.push(`Expected a runtime-composition row for ${label}.`);
    return;
  }
  if (!predicate(row)) {
    failures.push(`Runtime-composition row for ${label} did not preserve framework consumption and value state: ${JSON.stringify(summaryRow(row))}.`);
  }
}

async function compositionRows(fixtureRoot, storeKey) {
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    storeKey,
  });
  const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
  return app.ask({
    kind: SemanticAppQueryKind.RuntimeCompositions,
    page: { size: 200 },
  }).value.rows.map((row) => ({
    ...row,
    authoredSource: sourceText(fixtureRoot, row.source),
  }));
}

function rowWithSource(rows, sourceFragment) {
  return rows.find((row) => row.authoredSource.includes(sourceFragment)) ?? null;
}

function sourceText(fixtureRoot, source) {
  if (source?.path == null || source.start == null || source.end == null) {
    return '';
  }
  const sourcePath = path.isAbsolute(source.path)
    ? source.path
    : path.resolve(fixtureRoot, source.path);
  return fs.readFileSync(sourcePath, 'utf8').slice(source.start, source.end);
}

function summaryRow(row) {
  return {
    source: row.authoredSource,
    templateInputConsumptionKind: row.templateInputConsumptionKind,
    templateInputValueStateKind: row.templateInputValueStateKind,
    templateInputSettlementKind: row.templateInputSettlementKind,
    templateInputType: row.templateInputType,
    resolvedTemplate: row.resolvedTemplate,
    componentInputConsumptionKind: row.componentInputConsumptionKind,
    componentInputValueStateKind: row.componentInputValueStateKind,
    componentInputSettlementKind: row.componentInputSettlementKind,
    componentInputType: row.componentInputType,
    modelInputConsumptionKind: row.modelInputConsumptionKind,
    modelInputValueStateKind: row.modelInputValueStateKind,
    scopeBehaviorInputConsumptionKind: row.scopeBehaviorInputConsumptionKind,
    scopeBehaviorInputValueStateKind: row.scopeBehaviorInputValueStateKind,
    tagInputConsumptionKind: row.tagInputConsumptionKind,
    tagInputValueStateKind: row.tagInputValueStateKind,
    flushModeInputConsumptionKind: row.flushModeInputConsumptionKind,
    flushModeInputValueStateKind: row.flushModeInputValueStateKind,
    componentResolutionKind: row.componentResolutionKind,
    componentCandidateCoverageKind: row.componentCandidateCoverageKind,
    resolvedComponentNames: row.resolvedComponentNames,
    scopeBehavior: row.scopeBehavior,
    tag: row.tag,
    flushMode: row.flushMode,
    composedChildControllerCount: row.composedChildControllerCount,
    activationHandoffKinds: row.activationHandoffKinds,
    activationHandoffs: row.activationHandoffs,
    activationOpenReasonCount: row.activationOpenReasonCount,
    openReason: row.openReason,
  };
}

const summary = {
  dynamic: dynamicRows.filter((row) =>
    row.authoredSource.includes('getAsync')
    || row.authoredSource.includes('getOpenTemplate')
    || row.authoredSource.includes('rejectedComponent')
    || row.authoredSource.includes('rejectedTemplate')
    || row.authoredSource.includes('promised')
  ).map(summaryRow),
  activationContracts: [nonCallableActivation, openActivation]
    .filter((row) => row != null)
    .map(summaryRow),
  awaitedTypeCandidate: awaitedTypeCandidate == null ? null : summaryRow(awaitedTypeCandidate),
  broadTypeCandidate: broadTypeCandidate == null ? null : summaryRow(broadTypeCandidate),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}
