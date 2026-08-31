import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';
import {
  OpenSeamBoundaryKind,
  OpenSeamReasonKind,
  openSeamBoundaryKindForReason,
} from '../out/kernel/open-seam.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/observer-setup-selection');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'open-seam-causality-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
  applicationEntrypointPolicy: 'aggregate-independent-graphs',
});

const rawRows = readAllRows(app, {
  kind: SemanticAppQueryKind.OpenSeams,
  detail: 'handles',
});
const observerSetupRows = rawRows.filter((row) =>
  row.seamKindKey === 'binding.open-observer-setup'
);
const evidenceOnlyRow = rawRows.find((row) => row.pressureKind === 'evidence-only');
assert.ok(evidenceOnlyRow, 'The fixture should retain inspectable evidence that pressured no materialization.');
assert.equal(observerSetupRows.length, 2, 'Expected one root observer-setup seam per open controller setup.');
assert.equal(
  new Set(observerSetupRows.map((row) => row.siteKey)).size,
  1,
  'Repeated controller instances should retain one stable authored bindable site.',
);
for (const row of observerSetupRows) {
  assert.deepEqual(row.reasonKinds, [OpenSeamReasonKind.BindingObserverSelectionOpen]);
  assert.deepEqual(row.boundaryKinds, [OpenSeamBoundaryKind.FrameworkSemanticBoundary]);
  assert.equal(row.pressureKind, 'product-pressure');
  assert.equal(row.affectedMaterializationCount, row.impacts.length);
  assert.equal(
    row.affectedProductCount,
    new Set(row.impacts.flatMap((impact) => impact.products.map((product) => product.productKey))).size,
  );
  assert.ok(sourceText(row.source).includes('functionDependency'));
  assert.ok(row.reasonSources.every((reason) => sourceText(reason.source).includes('functionDependency')));
  assert.ok(row.impacts.every((impact) => impact.handles?.materializationHandle != null));
}

const affectedImpactKey = observerSetupRows[0].impacts[0].impactKey;
assert.equal(
  aotMaterializationDecision(evidenceOnlyRow, affectedImpactKey, false),
  'proceed',
  'Evidence-only seams never block an AOT transformation.',
);
assert.equal(
  aotMaterializationDecision(observerSetupRows[0], 'unrelated-materialization', false),
  'proceed',
  'Product pressure is local to the cited materialization rather than a global seam severity.',
);
assert.equal(
  aotMaterializationDecision(observerSetupRows[0], affectedImpactKey, true),
  'runtime-fallback',
  'An affected transformation should retain semantics through its declared runtime fallback.',
);
assert.equal(
  aotMaterializationDecision(observerSetupRows[0], affectedImpactKey, false),
  'blocked',
  'An affected transformation blocks only when its product contract requires proof and has no honest fallback.',
);

const impactKindSets = observerSetupRows
  .map((row) => row.impacts.flatMap((impact) => impact.products.map((product) => product.productKindKey)).sort())
  .sort((left, right) => right.length - left.length);
assert.deepEqual(
  impactKindSets,
  [
    [
      'binding.data-flow',
      'binding.target-access',
      'binding.value-channel',
      'configuration.controller',
    ],
    ['configuration.controller'],
  ],
  'The setup root seam should propagate through controller, target access, value channel, and data flow without cloning.',
);

const clonedBindingSeams = rawRows.filter((row) =>
  row.seamKindKey === 'binding.open-target-access'
  || row.seamKindKey === 'binding.open-value-channel'
  || row.seamKindKey === 'binding.open-data-flow'
);
assert.deepEqual(
  clonedBindingSeams,
  [],
  'Downstream binding products must cite the observer-setup seam rather than republishing its prose.',
);

const sites = readAllRows(app, {
  kind: SemanticAppQueryKind.OpenSeamSites,
  openSeamKindKey: 'binding.open-observer-setup',
});
assert.equal(sites.length, 1, 'The two controller-instance seams should converge on one authored site.');
assert.deepEqual(sites[0].seamKindKeys, ['binding.open-observer-setup']);
assert.equal(sites[0].rawRowCount, 2);
assert.equal(sites[0].variantCount, 1);
assert.equal(sites[0].affectedMaterializationCount, 5);
assert.equal(sites[0].affectedProductCount, 5);

const controllers = readAllRows(app, {
  kind: SemanticAppQueryKind.RuntimeControllers,
});
const openControllers = requireControllers(controllers, 'function-computed-observer-target', 2);
for (const openController of openControllers) {
  assert.equal(openController.assemblyProgress, 'bound');
  assert.equal(openController.realizedReadiness, null);
  assert.equal(openController.bindReachability, 'open');
  const openSetupSteps = openController.assemblySteps.filter((step) =>
    step.stepKind === 'setup-bindable-observer'
  );
  assert.equal(openSetupSteps.length, 1);
  assert.ok(!('count' in openSetupSteps[0]), 'Assembly projection must preserve each setup decision instead of compressing rows.');
  assert.ok(sourceText(openSetupSteps[0].source).includes('functionDependency'));
}

const [reachedController] = requireControllers(controllers, 'observer-setup-app', 1);
assert.equal(reachedController.assemblyProgress, 'bound');
assert.equal(reachedController.realizedReadiness, 'bound');
assert.equal(reachedController.bindReachability, 'reached');

const failedControllers = requireControllers(controllers, 'fatal-observer-target', 2);
for (const failedController of failedControllers) {
  assert.equal(failedController.assemblyProgress, 'bound');
  assert.equal(failedController.realizedReadiness, null);
  assert.equal(failedController.bindReachability, 'blocked-by-outer-failure');
}

const nativeTargetApp = await openFixtureApp('template-native-target-precedence');
const nativeTargetRows = readAllRows(nativeTargetApp, {
  kind: SemanticAppQueryKind.OpenSeams,
  detail: 'handles',
});
const [openTargetAccess] = requireSeams(
  nativeTargetRows,
  'binding.open-target-access',
  1,
);
assert.deepEqual(
  openTargetAccess.impacts.flatMap((impact) =>
    impact.products.map((product) => product.productKindKey)
  ).sort(),
  [
    'binding.data-flow',
    'binding.target-access',
    'binding.value-channel',
  ],
  'An open target-access cause should propagate through the value channel and data flow without cloning.',
);
assert.deepEqual(
  openTargetAccess.reasonKinds,
  [OpenSeamReasonKind.BindingObserverSelectionOpen],
);

const [localValueChannel] = requireSeams(
  nativeTargetRows,
  'binding.open-value-channel',
  1,
);
assert.deepEqual(
  localValueChannel.impacts.flatMap((impact) =>
    impact.products.map((product) => product.productKindKey)
  ).sort(),
  [
    'binding.data-flow',
    'binding.value-channel',
  ],
  'A locally open value channel should own one cause shared with its downstream data flow.',
);
assert.deepEqual(
  localValueChannel.reasonKinds,
  [OpenSeamReasonKind.BindingValueChannelSemanticsOpen],
);
assert.notEqual(
  localValueChannel.siteKey,
  openTargetAccess.siteKey,
  'Distinct authored target/value-channel causes must not collapse into one site.',
);

const customCompilerApp = await openFixtureApp('di-custom-template-compiler');
const customCompilerRows = readAllRows(customCompilerApp, {
  kind: SemanticAppQueryKind.OpenSeams,
  detail: 'handles',
});
const [missingRenderer] = requireSeams(
  customCompilerRows,
  'instruction.open-instruction',
  1,
);
assert.deepEqual(
  missingRenderer.reasonKinds,
  [OpenSeamReasonKind.RuntimeRenderingRendererUnavailable],
);
assert.equal(missingRenderer.pressureKind, 'product-pressure');
assert.equal(missingRenderer.affectedMaterializationCount, 1);
assert.equal(missingRenderer.affectedProductCount, 0);
assert.deepEqual(
  missingRenderer.impacts.map((impact) => impact.outcome),
  ['open-without-product'],
  'A failed rendering attempt must remain distinguishable from evidence that pressured no materialization.',
);
assert.equal(
  aotMaterializationDecision(missingRenderer, missingRenderer.impacts[0].impactKey, true),
  'runtime-fallback',
  'A failed materialization attempt remains fallback-eligible even when it produced no semantic product.',
);

assert.deepEqual(
  [
    openSeamBoundaryKindForReason(OpenSeamReasonKind.StaticEvaluationIdentifierNotInEnvironment),
    openSeamBoundaryKindForReason(OpenSeamReasonKind.StaticEvaluationDynamicCall),
    openSeamBoundaryKindForReason(OpenSeamReasonKind.StaticEvaluationGuardrailLimit),
    openSeamBoundaryKindForReason(OpenSeamReasonKind.StaticEvaluationUnsupportedExpression),
    openSeamBoundaryKindForReason(OpenSeamReasonKind.BindingSourceUnsupportedExpression),
    openSeamBoundaryKindForReason(OpenSeamReasonKind.BindingSourceSlotNoStaticValue),
    openSeamBoundaryKindForReason(OpenSeamReasonKind.BindingSourceTypeOpen),
    openSeamBoundaryKindForReason(OpenSeamReasonKind.BindingObserverSelectionOpen),
  ],
  [
    OpenSeamBoundaryKind.StaticEnvironmentGap,
    OpenSeamBoundaryKind.RuntimeExecutionBoundary,
    OpenSeamBoundaryKind.AnalysisGuardrail,
    OpenSeamBoundaryKind.UnsupportedSubstrate,
    OpenSeamBoundaryKind.UnsupportedSubstrate,
    OpenSeamBoundaryKind.CauseUnresolved,
    OpenSeamBoundaryKind.TypeCheckerProjectionBoundary,
    OpenSeamBoundaryKind.FrameworkSemanticBoundary,
  ],
  'Public boundary families must derive from typed causal reasons.',
);

console.log(JSON.stringify({
  ok: true,
  observerSetupRootSeams: observerSetupRows.length,
  authoredSites: sites.length,
  propagatedMaterializations: sites[0].affectedMaterializationCount,
  propagatedProducts: sites[0].affectedProductCount,
  localValueChannelProducts: localValueChannel.affectedProductCount,
  failedRenderingAttempts: missingRenderer.affectedMaterializationCount,
}, null, 2));

async function openFixtureApp(fixtureName) {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(packageRoot, 'fixtures/pressure', fixtureName),
    storeKey: `open-seam-causality-contract:${fixtureName}`,
  });
  return runtime.openApp({
    analysisDepth: 'binding-observation',
  });
}

function aotMaterializationDecision(row, materializationKey, runtimeFallbackAvailable) {
  const affected = row.impacts.some((impact) => impact.impactKey === materializationKey);
  if (!affected) {
    return 'proceed';
  }
  return runtimeFallbackAvailable ? 'runtime-fallback' : 'blocked';
}

function readAllRows(appRuntime, query) {
  const rows = [];
  let cursor = null;
  do {
    const answer = appRuntime.ask({
      ...query,
      page: { size: 200, cursor },
    });
    rows.push(...answer.value.rows);
    cursor = answer.page?.nextCursor ?? null;
  } while (cursor != null);
  return rows;
}

function requireControllers(rows, controllerName, expectedCount) {
  const matches = rows.filter((row) => row.controllerName === controllerName);
  assert.equal(matches.length, expectedCount, `Expected exactly ${expectedCount} controllers named ${controllerName}.`);
  return matches;
}

function requireSeams(rows, seamKindKey, expectedCount) {
  const matches = rows.filter((row) => row.seamKindKey === seamKindKey);
  assert.equal(matches.length, expectedCount, `Expected exactly ${expectedCount} '${seamKindKey}' seams.`);
  return matches;
}

function sourceText(source) {
  if (source?.path == null || source.start == null || source.end == null) {
    return '';
  }
  const sourcePath = path.isAbsolute(source.path)
    ? source.path
    : path.resolve(fixtureRoot, source.path);
  return fs.readFileSync(sourcePath, 'utf8').slice(source.start, source.end);
}
