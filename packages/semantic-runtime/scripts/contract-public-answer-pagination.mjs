import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  answer,
  bindSemanticRuntimePageInput,
  pageRows,
} from '../out/api/answer-helpers.js';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/api/index.js';

const failures = [];
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rows = Array.from({ length: 5 }, (_, id) => ({ id, label: `row-${id}` }));
const scope = {
  queryKey: 'resources|source:src/app.ts',
  epochKey: 'project-input:demo:revision-a',
  orderingKey: 'resource-definitions',
};

verifyZeroRowRollup();
verifyDeterministicContinuation();
verifyCursorRejection();
verifyTransportPolicy();
verifyUnboundedIdePage();
verifyInvalidPageInput();
await verifyRetainedTransportPolicyIsolation();
await verifyAppGenerationCursorIsolation();

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('contract ok: public answers keep semantic quality independent from deterministic, scoped transport paging.');

function verifyZeroRowRollup() {
  const paged = pageRows(rows, bindSemanticRuntimePageInput({ size: 0 }, scope));
  expect(paged.rows.length === 0, 'A size-zero rollup should not return row payloads.');
  expect(paged.page.nextCursor != null, 'A size-zero rollup over non-empty rows should expose a continuation cursor.');
  expect(paged.page.exhausted === false, 'A size-zero rollup over non-empty rows must not claim exhaustion.');

  const result = answer('answered', 'rollup', { rows: paged.rows }, {
    selection: 'not-applicable',
    coverage: 'complete',
    page: paged.page,
  });
  expect(result.result === 'answered', 'Transport truncation must not change a successful semantic result.');
  expect(result.coverage === 'complete', 'Transport truncation must not change complete semantic coverage.');
}

function verifyDeterministicContinuation() {
  const first = pageRows(rows, bindSemanticRuntimePageInput({ size: 2 }, scope));
  const second = pageRows(rows, bindSemanticRuntimePageInput({
    size: 2,
    cursor: first.page.nextCursor,
  }, scope));
  const third = pageRows(rows, bindSemanticRuntimePageInput({
    size: 2,
    cursor: second.page.nextCursor,
  }, scope));

  expect(first.rows.map((row) => row.id).join(',') === '0,1', 'First page should preserve deterministic row order.');
  expect(second.rows.map((row) => row.id).join(',') === '2,3', 'Second page should resume at the encoded offset.');
  expect(third.rows.map((row) => row.id).join(',') === '4', 'Final page should return the remaining row.');
  expect(third.page.exhausted === true && third.page.nextCursor == null, 'Final page should report exhaustion without another cursor.');
}

function verifyCursorRejection() {
  const first = pageRows(rows, bindSemanticRuntimePageInput({ size: 2 }, scope));
  const queryMismatch = pageRows(rows, bindSemanticRuntimePageInput({
    size: 2,
    cursor: first.page.nextCursor,
  }, {
    ...scope,
    queryKey: 'different-query',
  }));
  const stale = pageRows(rows, bindSemanticRuntimePageInput({
    size: 2,
    cursor: first.page.nextCursor,
  }, {
    ...scope,
    epochKey: 'project-input:demo:revision-b',
  }));
  const malformed = pageRows(rows, bindSemanticRuntimePageInput({
    size: 2,
    cursor: 'after:1',
  }, scope));

  expect(queryMismatch.page.cursorProblem?.kind === 'query-mismatch', 'Cross-query cursors should be rejected explicitly.');
  expect(stale.page.cursorProblem?.kind === 'stale', 'Cross-generation cursors should be rejected explicitly.');
  expect(malformed.page.cursorProblem?.kind === 'malformed', 'Legacy or malformed cursors should be rejected explicitly.');
  const invalidAnswer = answer('answered', 'must be replaced', { rows: [] }, {
    selection: 'not-applicable',
    coverage: 'complete',
    page: stale.page,
  });
  expect(invalidAnswer.result === 'invalid', 'A rejected cursor should make the public request invalid.');
  expect(invalidAnswer.coverage === 'not-applicable', 'A rejected cursor should not claim semantic coverage.');
}

function verifyTransportPolicy() {
  const paged = pageRows(rows, bindSemanticRuntimePageInput({ size: 500 }, scope, {
    maxSize: 2,
    maxRowsJsonBytes: 1024,
  }));
  expect(paged.rows.length === 2, 'Transport maxSize should bound selected rows.');
  expect(paged.page.clamped === true && paged.page.maxSize === 2, 'Transport clamping should be visible in page metadata.');
}

function verifyUnboundedIdePage() {
  const manyRows = Array.from({ length: 300 }, (_, id) => ({ id }));
  const paged = pageRows(manyRows, bindSemanticRuntimePageInput({ size: 300 }, scope));
  expect(paged.rows.length === 300, 'Core paging should not impose the MCP 200-row ceiling on IDE callers.');
  expect(paged.page.exhausted === true, 'An unbounded IDE page should exhaust the 300-row result.');
}

function verifyInvalidPageInput() {
  expectThrows(
    () => pageRows(rows, { size: 1.5 }),
    'Fractional page sizes should be rejected at the semantic-runtime boundary.',
  );
  expectThrows(
    () => pageRows(rows, { size: Number.NaN }),
    'NaN page sizes should be rejected at the semantic-runtime boundary.',
  );
  expectThrows(
    () => bindSemanticRuntimePageInput({ size: 1 }, scope, { maxSize: 0 }),
    'Non-positive transport page limits should be rejected at the semantic-runtime boundary.',
  );
}

async function verifyRetainedTransportPolicyIsolation() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(packageRoot, 'fixtures/pressure/app-pattern-state-backed-form'),
    storeKey: 'contract-public-answer-pagination-policy-reuse',
  });
  const request = {
    kind: SemanticAppQueryKind.SourceFiles,
    page: { size: 3 },
    inquiryProfile: 'mcp-orientation',
    appRetention: 'retain-app',
  };
  const boundedFirst = await runtime.answerAppQuery({
    ...request,
    pagePolicy: { maxSize: 1 },
  });
  const unboundedSecond = await runtime.answerAppQuery(request);
  expect(boundedFirst.page?.returnedRows === 1, 'A bounded retained answer should honor its transport page policy.');
  expect(unboundedSecond.page?.returnedRows === 3, 'An unbounded caller must not reuse an earlier bounded retained DTO.');

  const unboundedFirst = await runtime.answerAppQuery({
    ...request,
    page: { size: 4 },
  });
  const boundedSecond = await runtime.answerAppQuery({
    ...request,
    page: { size: 4 },
    pagePolicy: { maxSize: 2 },
  });
  expect(unboundedFirst.page?.returnedRows === 4, 'An unbounded retained answer should preserve the requested page size.');
  expect(boundedSecond.page?.returnedRows === 2, 'A bounded caller must not reuse an earlier unbounded retained DTO.');
}

async function verifyAppGenerationCursorIsolation() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(packageRoot, 'fixtures/pressure/evaluation-open-seam-sites'),
    storeKey: 'contract-public-answer-pagination-app-generation',
  });
  const first = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.OpenSeams,
    analysisDepth: 'runtime-topology',
    page: { size: 1 },
    inquiryProfile: 'exploration',
    appRetention: 'retain-app',
  });
  expect(first.page?.nextCursor != null, 'The app-generation cursor contract needs more than one open-seam row.');
  if (first.page?.nextCursor == null) {
    return;
  }
  const incompatibleGeneration = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.OpenSeams,
    analysisDepth: 'binding-observation',
    page: { size: 1, cursor: first.page.nextCursor },
    inquiryProfile: 'exploration',
    appRetention: 'retain-app',
  });
  expect(
    incompatibleGeneration.result === 'invalid'
      && incompatibleGeneration.page?.cursorProblem?.kind === 'stale',
    'A cursor must not cross app generations built with different analysis plans.',
  );
}

function expectThrows(action, message) {
  try {
    action();
    failures.push(message);
  } catch {
    // Expected contract refusal.
  }
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
