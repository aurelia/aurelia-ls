import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  answer,
  bindSemanticRuntimePageInput,
  pageProjectedRows,
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
verifyProjectedPaging();
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

function verifyProjectedPaging() {
  const projectedIds = [];
  const projectRow = (row) => {
    projectedIds.push(row.id);
    return row;
  };
  const projectedPage = (
    candidates,
    page,
    pageScope = scope,
    policy = undefined,
  ) => pageProjectedRows(
    candidates,
    bindSemanticRuntimePageInput(page, pageScope, policy),
    projectRow,
    { unboundCursorBasis: () => candidates },
  );

  const directEager = pageRows(rows, { size: 2 });
  projectedIds.length = 0;
  const directLazy = pageProjectedRows(rows, { size: 2 }, projectRow, {
    unboundCursorBasis: () => rows,
  });
  expect(
    directLazy.page.nextCursor === directEager.page.nextCursor,
    'Identity-projected direct pages should preserve the existing opaque cursor fingerprint.',
  );
  expect(projectedIds.join(',') === '0,1', 'An unbounded projected page should materialize only its selected window.');

  projectedIds.length = 0;
  const zero = projectedPage(rows, { size: 0 });
  expect(projectedIds.length === 0, 'A projected size-zero page must not materialize any row.');
  expect(
    zero.page.returnedRows === 0 && zero.page.estimatedRowsJsonBytes === 2 && zero.page.nextCursor != null,
    'A projected size-zero page should preserve empty-array bytes and its same-offset continuation.',
  );

  projectedIds.length = 0;
  const first = projectedPage(rows, { size: 2 });
  expect(projectedIds.join(',') === '0,1', 'Projected paging should materialize exactly the first requested window.');
  projectedIds.length = 0;
  const second = projectedPage(rows, { size: 2, cursor: first.page.nextCursor });
  expect(
    projectedIds.join(',') === '2,3' && second.rows.map((row) => row.id).join(',') === '2,3',
    'Projected paging should resume and materialize only the next cursor window.',
  );

  const rejectedScopes = [
    [{ ...scope, queryKey: 'different-query' }, 'query-mismatch'],
    [{ ...scope, epochKey: 'project-input:demo:revision-b' }, 'stale'],
    [{ ...scope, orderingKey: 'different-order' }, 'ordering-mismatch'],
  ];
  for (const [rejectedScope, problemKind] of rejectedScopes) {
    projectedIds.length = 0;
    const rejected = projectedPage(rows, { size: 2, cursor: first.page.nextCursor }, rejectedScope);
    expect(
      rejected.page.cursorProblem?.kind === problemKind && projectedIds.length === 0,
      `A projected ${problemKind} cursor must be rejected before row materialization.`,
    );
  }

  projectedIds.length = 0;
  const malformed = projectedPage(rows, { size: 2, cursor: 'after:1' });
  expect(
    malformed.page.cursorProblem?.kind === 'malformed'
      && malformed.page.estimatedRowsJsonBytes == null
      && malformed.page.exhausted === false
      && projectedIds.length === 0,
    'A projected malformed cursor must return invalid page metadata without materializing rows.',
  );

  projectedIds.length = 0;
  const outOfRange = projectedPage(rows.slice(0, 1), { size: 2, cursor: first.page.nextCursor });
  expect(
    outOfRange.page.cursorProblem?.kind === 'offset-out-of-range' && projectedIds.length === 0,
    'A projected out-of-range cursor must be rejected before row materialization.',
  );

  projectedIds.length = 0;
  const exactEnd = projectedPage(rows.slice(0, 2), { size: 2, cursor: first.page.nextCursor });
  expect(
    exactEnd.rows.length === 0
      && exactEnd.page.exhausted === true
      && exactEnd.page.estimatedRowsJsonBytes === 2
      && projectedIds.length === 0,
    'A projected cursor exactly at the row-universe end should return a valid exhausted empty page.',
  );

  projectedIds.length = 0;
  const maxSize = projectedPage(rows, { size: 5 }, scope, { maxSize: 2 });
  expect(
    projectedIds.join(',') === '0,1'
      && maxSize.page.requestedSize === 5
      && maxSize.page.size === 2
      && maxSize.page.clamped === true,
    'Projected paging should apply maxSize before materializing its selected window.',
  );

  const byteRows = [{ id: 0 }, { id: 1 }, { id: 2 }];
  projectedIds.length = 0;
  const byteClamped = projectedPage(byteRows, { size: 3 }, scope, { maxRowsJsonBytes: 10 });
  expect(
    byteClamped.rows.map((row) => row.id).join(',') === '0'
      && projectedIds.join(',') === '0,1'
      && byteClamped.page.estimatedRowsJsonBytes === 10
      && byteClamped.page.byteClamped === true,
    'Projected byte paging should materialize one returned row plus exactly one rejected lookahead.',
  );

  projectedIds.length = 0;
  const afterByteClamp = projectedPage(
    byteRows,
    { size: 3, cursor: byteClamped.page.nextCursor },
    scope,
    { maxRowsJsonBytes: 10 },
  );
  expect(
    afterByteClamp.rows.map((row) => row.id).join(',') === '1'
      && projectedIds.join(',') === '1,2',
    'A rejected byte-budget lookahead must remain the first candidate on the next page.',
  );

  projectedIds.length = 0;
  const firstOversized = projectedPage(byteRows, { size: 3 }, scope, { maxRowsJsonBytes: 1 });
  expect(
    firstOversized.rows.map((row) => row.id).join(',') === '0'
      && projectedIds.join(',') === '0'
      && firstOversized.page.estimatedRowsJsonBytes > 1
      && firstOversized.page.byteClamped === true,
    'A first oversized projected row should still be returned so paging makes progress.',
  );

  projectedIds.length = 0;
  const empty = projectedPage([], { size: 2 });
  expect(
    empty.rows.length === 0
      && empty.page.totalRows === 0
      && empty.page.exhausted === true
      && empty.page.estimatedRowsJsonBytes === 2
      && projectedIds.length === 0,
    'An empty projected universe should remain a valid exhausted empty-array page.',
  );
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
