import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const fixtureRoot = 'packages/semantic-runtime/fixtures/pressure/binding-data-flow-issue-rollups';

const runtime = await createSemanticRuntime({
  workspaceRoot,
  storeKey: 'binding-data-flow-summary-contract',
  projects: [{
    rootDir: fixtureRoot,
    projectKey: 'binding-data-flow-issue-rollups',
  }],
});

const app = await runtime.openApp({
  projectKey: 'binding-data-flow-issue-rollups',
  analysisDepth: 'binding-observation',
});

const summary = app.bindingDataFlowSummary({ size: 20 }).value;
const issueOnlyAnswer = app.bindingDataFlowSummary({ size: 0 });
const issueOnlySummary = issueOnlyAnswer.value;
const issueRows = summary.issueRows;
const targetEmptyArray = issueRows.find((row) => row.issueKind === 'target-empty-array-inferred');
const sourceUnresolved = issueRows.find((row) => row.issueKind === 'source-type-unresolved');
const sourceNullish = issueRows.find((row) => row.issueKind === 'source-nullish-to-required-target');
const targetNullish = issueRows.find((row) => row.issueKind === 'target-nullish-to-required-source');
const failures = [];

if (issueOnlySummary.rows.length !== 0) {
  failures.push('Expected page size 0 to return no summary rows.');
}
if (issueOnlySummary.issueRows.length !== issueRows.length) {
  failures.push('Expected page size 0 to preserve issue summary rows.');
}

if (targetEmptyArray == null) {
  failures.push('Expected a target-empty-array-inferred issue summary row.');
} else {
  assertIncludes(targetEmptyArray.targetProperties, 'rows', 'target-empty-array-inferred targetProperties should include rows.');
  assertIncludes(targetEmptyArray.targetProperties, 'filters', 'target-empty-array-inferred targetProperties should include filters.');
  assertIncludes(targetEmptyArray.targetValueTypes, 'never[]', 'target-empty-array-inferred should preserve the inferred never[] target type.');
  assertAtLeast(targetEmptyArray.targetPropertyCount, targetEmptyArray.targetProperties.length, 'target-empty-array-inferred should expose targetPropertyCount.');
  assertAtLeast(targetEmptyArray.definitionCount, targetEmptyArray.definitionNames.length, 'target-empty-array-inferred should expose definitionCount.');
}

if (sourceUnresolved == null) {
  failures.push('Expected a source-type-unresolved issue summary row.');
} else {
  assertIncludes(sourceUnresolved.targetProperties, 'active', 'source-type-unresolved targetProperties should include active class toggle.');
  assertIncludes(sourceUnresolved.sourceTypeOpenKinds, 'missing-member', 'source-type-unresolved should preserve the missing-member open kind.');
  assertAtLeast(sourceUnresolved.sourceNameCount, sourceUnresolved.sampleSourceNames.length, 'source-type-unresolved should expose sourceNameCount.');
}

if (sourceNullish == null) {
  failures.push('Expected a source-nullish-to-required-target issue summary row.');
} else {
  assertIncludes(sourceNullish.targetProperties, 'title', 'source-nullish-to-required-target targetProperties should include title.');
  assertIncludes(sourceNullish.sourceToTargetTypeMismatchKinds, 'source-nullish-to-required-target', 'source-nullish-to-required-target should preserve mismatch kind.');
}

if (targetNullish == null) {
  failures.push('Expected a target-nullish-to-required-source issue summary row.');
} else {
  assertIncludes(targetNullish.targetProperties, 'files', 'target-nullish-to-required-source targetProperties should include files.');
  assertIncludes(targetNullish.targetToSourceTypeMismatchKinds, 'target-nullish-to-required-source', 'target-nullish-to-required-source should preserve mismatch kind.');
}

if (!summary.rows.some((row) =>
  row.valueChannelKind === 'class-toggle'
  && row.sourceTypeOpenKinds.includes('missing-member')
)) {
  failures.push('Expected the class-toggle summary row to preserve sourceTypeOpenKinds.');
}

if (!summary.rows.some((row) =>
  row.targetProperty === 'title'
  && row.sourceToTargetTypeMismatchKinds.includes('source-nullish-to-required-target')
)) {
  failures.push('Expected the title summary row to preserve sourceToTargetTypeMismatchKinds.');
}

if (!summary.rows.some((row) =>
  row.targetProperty === 'files'
  && row.targetToSourceTypeMismatchKinds.includes('target-nullish-to-required-source')
)) {
  failures.push('Expected the files summary row to preserve targetToSourceTypeMismatchKinds.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    issueRows,
    rows: summary.rows,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      totalRows: summary.totalRows,
      summaryRows: summary.summaryRows,
      issueRows: issueRows.map((row) => ({
        issueKind: row.issueKind,
        count: row.count,
        targetProperties: row.targetProperties,
        targetPropertyCount: row.targetPropertyCount,
        sourceTypeOpenKinds: row.sourceTypeOpenKinds,
        sourceToTargetTypeMismatchKinds: row.sourceToTargetTypeMismatchKinds,
        targetToSourceTypeMismatchKinds: row.targetToSourceTypeMismatchKinds,
        targetValueTypes: row.targetValueTypes,
        definitionCount: row.definitionCount,
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
