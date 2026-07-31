import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
} from '../out/index.js';
import { KernelOpenSeamKinds } from '../out/kernel/vocabulary/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/recursive-custom-element-surfaces');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'recursive-rendering-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const controllers = app.ask({
  kind: 'runtime-controllers',
  page: { size: 200 },
}).value.rows;
const dataFlows = app.ask({
  kind: 'binding-data-flows',
  page: { size: 200 },
}).value.rows;
const observedDependencies = app.ask({
  kind: 'binding-observed-dependencies',
  page: { size: 200 },
}).value.rows;
const openSeams = app.ask({
  kind: 'open-seams',
  page: { size: 100 },
}).value.rows;
const recursiveRenderingSeamKinds = new Set([
  ...vocabularyKeys(KernelOpenSeamKinds.Resource),
  ...vocabularyKeys(KernelOpenSeamKinds.Compiler),
  ...vocabularyKeys(KernelOpenSeamKinds.Instruction),
  ...vocabularyKeys(KernelOpenSeamKinds.Binding),
  ...vocabularyKeys(KernelOpenSeamKinds.TypeSystem),
]);
const recursiveRenderingOpenSeams = openSeams.filter((row) =>
  recursiveRenderingSeamKinds.has(row.seamKindKey)
  || (
    row.seamKindKey.startsWith('di.')
    && !isStandardConfigurationDiCoverageSeam(row)
  )
);

const treeNodeBoundaryRows = controllers.filter((row) =>
  row.definitionName === 'tree-node'
  && row.creationKind === 'custom-element'
  && row.childViewRenderingState === 'recursive-boundary'
);
const syntheticAggregateRows = controllers.filter((row) =>
  row.creationKind === 'synthetic-view'
  && row.childViewRenderingState === 'expanded-aggregate'
);
const childIdFlows = dataFlows.filter((row) =>
  row.definitionName === 'tree-node'
  && row.sourceName === 'childId'
  && row.targetProperty === 'nodeId'
);
const rootIdFlows = dataFlows.filter((row) =>
  row.definitionName === 'recursive-custom-element-app'
  && row.sourceName === 'rootId'
  && row.targetProperty === 'nodeId'
);
const childIdDependencies = observedDependencies.filter((row) =>
  row.definitionName === 'tree-node'
  && row.occurrence.sourceName === 'childId'
);

const failures = [
  treeNodeBoundaryRows.length > 0
    ? null
    : 'Expected recursive tree-node child controllers to close as recursive-boundary rows.',
  treeNodeBoundaryRows.some((row) =>
    row.assemblySteps.some((step) => step.stepKind === 'recursive-hydration-boundary')
  )
    ? null
    : 'Expected recursive-boundary rows to carry a recursive-hydration-boundary lifecycle step.',
  treeNodeBoundaryRows.every((row) => row.parentControllerName != null)
    ? null
    : 'Expected recursive boundary controllers to retain the active parent controller context.',
  syntheticAggregateRows.length > 0
    ? null
    : 'Expected template-controller child views to materialize aggregate synthetic-view rows.',
  rootIdFlows.some((row) =>
    row.sourceType === '"root"'
    && row.targetPropertyType === 'string'
    && row.sourceToTargetAssignable === true
  )
    ? null
    : 'Expected root app bindable flow rootId -> tree-node.nodeId to retain TypeChecker source and target types.',
  childIdFlows.some((row) =>
    row.sourceType === 'string'
    && row.targetPropertyType === 'string'
    && row.sourceToTargetAssignable === true
  )
    ? null
    : 'Expected recursive child bindable flow childId -> tree-node.nodeId to close through the active synthetic-view scope.',
  childIdDependencies.some((row) =>
    row.occurrence.observedMemberKind === 'accessor'
    && row.occurrence.observedMemberSourceState === 'source'
  )
    ? null
    : 'Expected childId getter reads to preserve accessor observed-dependency source provenance.',
  recursiveRenderingOpenSeams.length === 0
    ? null
    : `Expected recursive rendering semantics to close without relevant open seams; observed ${recursiveRenderingOpenSeams.length}.`,
].filter(Boolean);

const summary = {
  fixture: 'recursive-custom-element-surfaces',
  recursiveBoundaryRows: treeNodeBoundaryRows.map((row) => ({
    renderingDefinitionName: row.renderingDefinitionName,
    controllerName: row.controllerName,
    parentControllerName: row.parentControllerName,
    childViewRenderingState: row.childViewRenderingState,
    assemblyStepKinds: row.assemblySteps.map((step) => step.stepKind),
    source: row.source?.label ?? null,
  })),
  syntheticAggregateRows: syntheticAggregateRows.map((row) => ({
    renderingDefinitionName: row.renderingDefinitionName,
    controllerName: row.controllerName,
    parentControllerName: row.parentControllerName,
    source: row.source?.label ?? null,
  })),
  childIdFlows: childIdFlows.map((row) => ({
    sourceName: row.sourceName,
    targetProperty: row.targetProperty,
    sourceType: row.sourceType,
    targetPropertyType: row.targetPropertyType,
    sourceToTargetAssignable: row.sourceToTargetAssignable,
    source: row.source?.label ?? null,
  })),
  childIdDependencies: childIdDependencies.map((row) => ({
    sourceName: row.occurrence.sourceName,
    observedMemberKind: row.occurrence.observedMemberKind,
    observedMemberSourceState: row.occurrence.observedMemberSourceState,
    observedMemberSource: row.occurrence.observedMemberSource?.label ?? null,
    source: row.occurrence.source?.label ?? null,
  })),
  openSeams: openSeams.map((row) => ({
    seamKindKey: row.seamKindKey,
    boundaryKinds: row.boundaryKinds,
    pressureKind: row.pressureKind,
    summary: row.summary,
    source: row.source?.label ?? null,
  })),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function isStandardConfigurationDiCoverageSeam(row) {
  return row.seamKindKey === 'di.open-registry-body'
    && row.summary.startsWith('StandardConfiguration catalogs and compiler-world services are modeled');
}

function vocabularyKeys(namespace) {
  return Object.values(namespace).map((entry) => entry.key);
}
