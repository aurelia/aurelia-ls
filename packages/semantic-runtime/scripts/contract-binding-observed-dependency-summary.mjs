import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const fixtureRoot = 'packages/semantic-runtime/fixtures/pressure/app-pattern-searchable-data-table';

const runtime = await createSemanticRuntime({
  workspaceRoot,
  storeKey: 'binding-observed-dependency-summary-contract',
  projects: [{
    rootDir: fixtureRoot,
    projectKey: 'app-pattern-searchable-data-table',
  }],
});

const app = await runtime.openApp({
  projectKey: 'app-pattern-searchable-data-table',
  analysisDepth: 'binding-observation',
});

const summary = app.bindingObservedDependencySummary({ size: 20 }).value;
const stateOnlyAnswer = app.bindingObservedDependencySummary({ size: 0 });
const stateOnlySummary = stateOnlyAnswer.value;
const rawRows = collectPagedRows((page) => app.bindingObservedDependencies(page));
const failures = [];

const sourceState = summary.memberSourceStateRows.find((row) => row.observedMemberSourceState === 'source');
const stateExpressionRead = summary.rows.find((row) =>
  row.dependencyKind === 'template-expression-read'
  && row.sourceRootNames.includes('state')
  && row.observedMemberSourceState === 'source'
  && row.observedMemberKind === 'property'
);
const stateAccessorRead = summary.rows.find((row) =>
  row.dependencyKind === 'template-expression-read'
  && row.sourceRootNames.includes('state')
  && row.observedMemberSourceState === 'source'
  && row.observedMemberKind === 'accessor'
);
const repeatLocalRead = summary.rows.find((row) =>
  row.dependencyKind === 'template-expression-read'
  && row.sourceRootNames.some((name) => name === 'user' || name === 'column')
  && row.observedMemberSourceState === 'source'
);

if (summary.totalRows !== rawRows.length) {
  failures.push(`Expected summary totalRows (${summary.totalRows}) to match raw row count (${rawRows.length}).`);
}
if (summary.summaryRows < 1) {
  failures.push('Expected at least one observed-dependency summary row.');
}
if (stateOnlySummary.rows.length !== 0) {
  failures.push('Expected page size 0 to return no grouped summary rows.');
}
if (stateOnlySummary.memberSourceStateRows.length !== summary.memberSourceStateRows.length) {
  failures.push('Expected page size 0 to preserve member source-state rollups.');
}
if (sourceState == null) {
  failures.push('Expected a source-backed observed member source-state rollup.');
} else {
  assertIncludes(sourceState.dependencyKinds, 'template-expression-read', 'Source rollup should include template-expression-read.');
  assertIncludes(sourceState.bindingKinds, 'property', 'Source rollup should include property bindings.');
  assertIncludes(sourceState.bindingKinds, 'listener', 'Source rollup should include listener bindings.');
  assertIncludes(sourceState.sourceRootNames, 'state', 'Source rollup should include direct state root reads.');
  assertAtLeast(sourceState.sourceRootNameCount, sourceState.sourceRootNames.length, 'Source rollup should expose sourceRootNameCount.');
  assertAtLeast(sourceState.definitionCount, sourceState.definitionNames.length, 'Source rollup should expose definitionCount.');
  assertAtLeast(sourceState.sourceBackedCount, 1, 'Source rollup should count source-backed rows.');
}
if (stateExpressionRead == null) {
  failures.push('Expected a compact summary row for direct state template-expression reads.');
} else {
  assertIncludes(stateExpressionRead.memberNames, 'filters', 'State expression-read row should sample direct state property paths.');
  assertIncludes(stateExpressionRead.memberNames, 'searchQuery', 'State expression-read row should sample nested state property reads.');
  assertAtLeast(stateExpressionRead.memberNameCount, stateExpressionRead.memberNames.length, 'State expression-read row should expose memberNameCount.');
  assertAtLeast(stateExpressionRead.sourceNameCount, stateExpressionRead.sampleSourceNames.length, 'State expression-read row should expose sourceNameCount.');
  assertAtLeast(stateExpressionRead.sourceBackedCount, 1, 'State expression-read row should count source-backed rows.');
}
if (stateAccessorRead == null) {
  failures.push('Expected a compact summary row for direct state accessor reads.');
} else {
  assertIncludes(stateAccessorRead.memberNames, 'hasActiveFilters', 'State accessor row should sample getter reads.');
  assertAtLeast(stateAccessorRead.sourceBackedCount, 1, 'State accessor row should count source-backed rows.');
}
if (repeatLocalRead == null) {
  failures.push('Expected a compact summary row for repeat-local source-backed reads.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    memberSourceStateRows: summary.memberSourceStateRows,
    rows: summary.rows,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      totalRows: summary.totalRows,
      summaryRows: summary.summaryRows,
      memberSourceStateRows: summary.memberSourceStateRows.map((row) => ({
        observedMemberSourceState: row.observedMemberSourceState,
        count: row.count,
        sourceRootNames: row.sourceRootNames,
        sourceRootNameCount: row.sourceRootNameCount,
        dependencyKinds: row.dependencyKinds,
        bindingKinds: row.bindingKinds,
        sourceBackedCount: row.sourceBackedCount,
      })),
    },
  }, null, 2));
}

function assertIncludes(values, expected, message) {
  if (!values.includes(expected)) {
    failures.push(message);
  }
}

function assertAtLeast(actual, expected, message) {
  if (actual < expected) {
    failures.push(message);
  }
}

function collectPagedRows(readPage) {
  const rows = [];
  let cursor = null;
  do {
    const answer = readPage({ size: 200, cursor });
    rows.push(...answer.value.rows);
    cursor = answer.page?.nextCursor ?? null;
  } while (cursor != null);
  return rows;
}
