import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import {
  createSemanticRuntime,
  readSemanticAppQueryCatalog,
  SemanticAppQueryKind,
} from '../out/index.js';
import {
  authoredMarkerSpan,
  authoredSourceSpanForSpec,
} from './semantic-conformance-source-locus.mjs';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultMatrixPath = path.join(packageRoot, 'semantic-conformance/matrix.json');
const defaultKnownGapsPath = path.join(packageRoot, 'semantic-conformance/known-gaps.json');
const KNOWN_VALUE_FLAGS = new Set([
  'matrix',
  'known-gaps',
  'aurelia-domain',
  'domain',
  'subdomain',
  'capability',
  'intent',
  'assertion-kind',
  'fixture',
  'id',
]);
const KNOWN_BOOLEAN_FLAGS = new Set([
  'strict',
]);

const DOMAIN_AXES = new Set([
  'data-flow',
  'diagnostics',
  'edit-plan',
  'expression-semantics',
  'observation',
  'open-honesty',
  'overlays',
  'plugin-capabilities',
  'provenance',
  'query-contract',
  'query-locus',
  'resources',
  'runtime-lifecycle',
  'source-precision',
  'template-syntax',
  'type-system',
]);

const AURELIA_DOMAINS = new Set([
  'bindable-contracts',
  'observation-data-flow',
  'plugin-capability-admission',
  'resource-registration',
  'router-composition',
  'runtime-composition',
  'runtime-api-boundary',
  'template-binding-syntax',
  'template-controller-scope',
  'template-expression-typing',
]);

const COVERAGE_INTENTS = new Set([
  'boundary-contract',
  'domain-contract',
  'regression-contract',
]);

const ASSERTION_KINDS = new Set([
  'candidate-honesty',
  'diagnostic-provenance-agreement',
  'edit-plan-old-text',
  'line-character-cursor-parity',
  'query-catalog-expectations',
  'query-expectations',
  'source-precision-agreement',
]);

const args = parseArgs(process.argv.slice(2));
const matrixPath = path.resolve(args.value('matrix') ?? args.positionals[0] ?? defaultMatrixPath);
const knownGapsPath = path.resolve(args.value('known-gaps') ?? defaultKnownGapsPath);
const strictConformance = args.has('strict');
const assertionFilters = {
  aureliaDomain: [...args.values('aurelia-domain'), ...args.values('subdomain')],
  domainAxis: args.values('domain'),
  capability: args.values('capability'),
  coverageIntent: args.values('intent'),
  assertionKind: args.values('assertion-kind'),
  fixture: args.values('fixture'),
  id: args.values('id'),
};
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const knownGaps = JSON.parse(fs.readFileSync(knownGapsPath, 'utf8'));
const runtimeCache = new Map();
const queryAnswerCache = new Map();
const sourceTextCache = new Map();
const assertions = expandMatrixAssertions(matrix);
const selectedAssertions = assertions.filter((assertion) => assertionMatchesFilters(assertion, assertionFilters));

validateMatrix(matrix, assertions);
validateKnownGaps(knownGaps, assertions);
validateFilters(assertionFilters, assertions);

if (selectedAssertions.length === 0) {
  throw new Error(`No semantic conformance assertions matched filters: ${filterSummary(assertionFilters)}`);
}

const results = [];
const knownGapByAssertionId = new Map(knownGaps.knownGaps.map((gap) => [gap.assertionId, gap]));
for (const assertion of selectedAssertions) {
  results.push(await runAssertion(assertion));
}

const summary = summarizeResults(results);
printSummary(summary, results, assertionFilters);

if (summary.failures > 0 || summary.resolvedGaps > 0 || (strictConformance && summary.knownGaps > 0)) {
  process.exitCode = 1;
}

function parseArgs(rawArgs) {
  const options = new Map();
  const positionals = [];
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const inlineEquals = arg.indexOf('=');
    const rawName = inlineEquals >= 0 ? arg.slice(2, inlineEquals) : arg.slice(2);
    const name = rawName.trim();
    if (inlineEquals >= 0) {
      addOption(options, name, arg.slice(inlineEquals + 1));
      continue;
    }
    if (KNOWN_VALUE_FLAGS.has(name)) {
      const value = rawArgs[index + 1];
      if (value == null || value.startsWith('--')) {
        throw new Error(`Expected a value after --${name}.`);
      }
      addOption(options, name, value);
      index += 1;
      continue;
    }
    if (KNOWN_BOOLEAN_FLAGS.has(name)) {
      addOption(options, name, true);
      continue;
    }
    throw new Error(`Unknown semantic conformance option --${name}.`);
  }
  return {
    positionals,
    has(name) {
      return options.has(name);
    },
    value(name) {
      const values = options.get(name) ?? [];
      return values.find((value) => value !== true) ?? null;
    },
    values(name) {
      return (options.get(name) ?? []).filter((value) => value !== true);
    },
  };
}

function addOption(options, name, value) {
  const values = options.get(name) ?? [];
  values.push(value);
  options.set(name, values);
}

async function runAssertion(assertion) {
  const failures = [];
  const notes = [];
  try {
    switch (assertion.assertionKind) {
      case 'source-precision-agreement':
        await assertSourcePrecisionAgreement(assertion, failures, notes);
        break;
      case 'line-character-cursor-parity':
        await assertLineCharacterCursorParity(assertion, failures, notes);
        break;
      case 'candidate-honesty':
        await assertCandidateHonesty(assertion, failures, notes);
        break;
      case 'diagnostic-provenance-agreement':
        await assertDiagnosticProvenanceAgreement(assertion, failures, notes);
        break;
      case 'edit-plan-old-text':
        await assertEditPlanOldText(assertion, failures, notes);
        break;
      case 'query-expectations':
        await assertQueryExpectations(assertion, failures, notes);
        break;
      case 'query-catalog-expectations':
        assertQueryCatalogExpectations(assertion, failures, notes);
        break;
      default:
        failures.push(`Unsupported assertionKind '${assertion.assertionKind}'.`);
        break;
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
  }
  const rawOutcome = failures.length === 0 ? 'passed' : 'failed';
  const knownGap = knownGapByAssertionId.get(assertion.id) ?? null;
  const conformanceOutcome = conformanceOutcomeFor(rawOutcome, knownGap);
  return {
    id: assertion.id,
    aureliaDomain: assertion.aureliaDomain,
    capability: assertion.capability,
    domainAxis: assertion.domainAxis,
    coverageIntent: assertion.coverageIntent,
    fixture: assertion.fixture ?? null,
    requirement: assertion.requirement ?? null,
    assertionKind: assertion.assertionKind,
    queryKinds: queryKindsForAssertion(assertion),
    failureBucket: knownGap?.failureBucket ?? null,
    knownGap,
    rawOutcome,
    conformanceOutcome,
    failures,
    notes,
  };
}

function queryKindsForAssertion(assertion) {
  if (assertion.assertionKind === 'query-expectations') {
    return [...new Set((assertion.expectations ?? [])
      .map((expectation) => expectation.query?.kind)
      .filter((kind) => typeof kind === 'string' && kind.length > 0))];
  }
  switch (assertion.assertionKind) {
    case 'source-precision-agreement':
      return [
        SemanticAppQueryKind.TemplateCursorInfo,
        SemanticAppQueryKind.TemplateReferences,
        SemanticAppQueryKind.TemplateRename,
        SemanticAppQueryKind.TemplateSemanticTokens,
      ];
    case 'line-character-cursor-parity':
      return [SemanticAppQueryKind.TemplateReferences, SemanticAppQueryKind.TemplateRename];
    case 'candidate-honesty':
      return [SemanticAppQueryKind.TemplateReferences];
    case 'diagnostic-provenance-agreement':
      return [SemanticAppQueryKind.TemplateDiagnostics, SemanticAppQueryKind.AppDiagnostics];
    case 'edit-plan-old-text':
      return [SemanticAppQueryKind.TemplateCodeActions];
    default:
      return [];
  }
}

async function assertSourcePrecisionAgreement(assertion, failures, notes) {
  const context = contextForAssertion(assertion);
  const expectedSpan = tokenSpanForCursor(context);
  validateCatalog(SemanticAppQueryKind.TemplateCursorInfo, { requiresCursor: true }, failures);
  validateCatalog(SemanticAppQueryKind.TemplateReferences, { requiresCursor: true, supportsPaging: true }, failures);
  validateCatalog(SemanticAppQueryKind.TemplateRename, { requiresCursor: true }, failures);
  validateCatalog(SemanticAppQueryKind.TemplateSemanticTokens, { supportsSourceFile: true, supportsPaging: true }, failures);

  const runtime = await runtimeForAssertion(assertion);
  const cursor = cursorForSpan(context.sourceFilePath, context.sourceText, expectedSpan);
  const cursorInfo = await runtime.answerAppQuery(cursorQuery(SemanticAppQueryKind.TemplateCursorInfo, context.sourceFilePath, cursor));
  expectAnswer(cursorInfo, [ 'hit', 'partial' ], 'template-cursor-info', failures);
  expectEqual(cursorInfo.value?.selectedMember?.name, assertion.expected.memberName, 'cursor-info selected member', failures);

  const references = await runtime.answerAppQuery({
    ...cursorQuery(SemanticAppQueryKind.TemplateReferences, context.sourceFilePath, cursor),
    includeDeclaration: true,
    detail: 'handles',
    page: { size: 50 },
  });
  expectAnswer(references, [ 'hit', 'partial' ], 'template-references', failures);
  const referenceRow = findRowWithSource(references.value?.rows ?? [], 'referenceKind', assertion.expected.referenceKind, context.fixtureRoot, expectedSpan);
  expect(referenceRow != null, `References should include ${assertion.expected.referenceKind} at ${spanLabel(expectedSpan)}.`, failures);

  const rename = await runtime.answerAppQuery({
    ...cursorQuery(SemanticAppQueryKind.TemplateRename, context.sourceFilePath, cursor),
    newName: assertion.expected.renameNewName,
  });
  expectAnswer(rename, [ 'hit', 'partial' ], 'template-rename', failures);
  expectEqual(rename.value?.status, 'available', 'rename status', failures);
  expectSource(rename.value?.activeSource, context.fixtureRoot, expectedSpan, 'rename activeSource', failures);
  const renameEdit = findRowWithSource(rename.value?.edits ?? [], 'editKind', assertion.expected.renameEditKind, context.fixtureRoot, expectedSpan);
  expect(renameEdit != null, `Rename should include ${assertion.expected.renameEditKind} edit at ${spanLabel(expectedSpan)}.`, failures);
  if (renameEdit != null) {
    expectEqual(renameEdit.oldText, expectedSpan.text, 'rename oldText', failures);
    expectEqual(context.sourceText.slice(expectedSpan.start, expectedSpan.end), renameEdit.oldText, 'rename oldText source validation', failures);
  }

  const semanticTokens = await runtime.answerAppQuery(sourceFileQuery(SemanticAppQueryKind.TemplateSemanticTokens, context.sourceFilePath, { page: { size: 1000 } }));
  expectAnswer(semanticTokens, [ 'hit', 'partial' ], 'template-semantic-tokens', failures);
  const tokenRow = (semanticTokens.value?.rows ?? []).find((row) =>
    row.tokenType === assertion.expected.semanticTokenType
    && sourceMatches(row.source, context.fixtureRoot, expectedSpan)
  ) ?? null;
  expect(tokenRow != null, `Semantic tokens should include ${assertion.expected.semanticTokenType} at ${spanLabel(expectedSpan)}.`, failures);

  notes.push(`token ${context.relativeSourceFile}@${expectedSpan.start}..${expectedSpan.end}`);
}

async function assertLineCharacterCursorParity(assertion, failures, notes) {
  const context = contextForAssertion(assertion);
  const expectedSpan = tokenSpanForCursor(context);
  const runtime = await runtimeForAssertion(assertion);
  const offsetCursor = cursorForSpan(context.sourceFilePath, context.sourceText, expectedSpan);
  const lineCharacterCursor = { ...offsetCursor };
  delete lineCharacterCursor.offset;

  const references = await runtime.answerAppQuery({
    ...cursorQuery(SemanticAppQueryKind.TemplateReferences, context.sourceFilePath, lineCharacterCursor),
    includeDeclaration: true,
    page: { size: 50 },
  });
  expectAnswer(references, [ 'hit', 'partial' ], 'line/character template-references', failures);
  expect(
    findRowWithSource(references.value?.rows ?? [], 'referenceKind', assertion.expected.referenceKind, context.fixtureRoot, expectedSpan) != null,
    `Line/character references should resolve ${assertion.expected.referenceKind} at ${spanLabel(expectedSpan)}.`,
    failures,
  );

  const rename = await runtime.answerAppQuery({
    ...cursorQuery(SemanticAppQueryKind.TemplateRename, context.sourceFilePath, lineCharacterCursor),
    newName: assertion.expected.renameNewName,
  });
  expectAnswer(rename, [ 'hit', 'partial' ], 'line/character template-rename', failures);
  expectEqual(rename.value?.status, 'available', 'line/character rename status', failures);
  expectSource(rename.value?.activeSource, context.fixtureRoot, expectedSpan, 'line/character rename activeSource', failures);
  expect(
    findRowWithSource(rename.value?.edits ?? [], 'editKind', assertion.expected.renameEditKind, context.fixtureRoot, expectedSpan) != null,
    `Line/character rename should include ${assertion.expected.renameEditKind} edit at ${spanLabel(expectedSpan)}.`,
    failures,
  );
  notes.push('same locus without cursor.offset');
}

async function assertCandidateHonesty(assertion, failures, notes) {
  const context = contextForAssertion(assertion);
  const expectedSpan = tokenSpanForCursor(context);
  const runtime = await runtimeForAssertion(assertion);
  const answer = await runtime.answerAppQuery({
    ...cursorQuery(SemanticAppQueryKind.TemplateReferences, context.sourceFilePath, cursorForSpan(context.sourceFilePath, context.sourceText, expectedSpan)),
    includeDeclaration: true,
    detail: 'handles',
    page: { size: 50 },
  });
  expectAnswer(answer, [ 'hit', 'partial' ], 'template-references candidate honesty', failures);
  expectEqual(answer.closure, assertion.expected.closure, 'reference answer closure', failures);
  expectEqual(answer.value?.selectedMemberName, assertion.expected.memberName, 'selected member name', failures);
  expectEqual(answer.value?.rows?.length, assertion.expected.rows, 'proven reference row count', failures);
  expect(
    (answer.value?.candidateRows?.length ?? 0) >= assertion.expected.candidateRowsAtLeast,
    `Expected at least ${assertion.expected.candidateRowsAtLeast} candidate row(s), got ${answer.value?.candidateRows?.length ?? 0}.`,
    failures,
  );
  const row = answer.value?.rows?.[0] ?? null;
  expectEqual(row?.referenceKind, assertion.expected.referenceKind, 'proven reference kind', failures);
  expectSource(row?.source, context.fixtureRoot, expectedSpan, 'proven reference source', failures);
  expect(
    !(answer.value?.candidateRows ?? []).some((candidate) => sourceMatches(candidate.source, context.fixtureRoot, expectedSpan)),
    'Cursor occurrence should not also appear in candidateRows.',
    failures,
  );
  notes.push(`${answer.value?.candidateRows?.length ?? 0} candidate row(s) preserved`);
}

async function assertDiagnosticProvenanceAgreement(assertion, failures, notes) {
  const context = contextForAssertion(assertion);
  const expectedSpan = tokenSpanForCursor(context);
  const subjectSpan = spanForMarker(
    context.sourceText,
    assertion.expected.subjectMarker,
    context.relativeSourceFile,
    assertion.expected.subjectMarkerOccurrence,
  );
  const runtime = await runtimeForAssertion(assertion);
  const templateDiagnostics = await runtime.answerAppQuery({
    ...sourceFileQuery(SemanticAppQueryKind.TemplateDiagnostics, context.sourceFilePath, { detail: 'full', page: { size: 50 } }),
  });
  const appDiagnostics = await runtime.answerAppQuery({
    ...sourceFileQuery(SemanticAppQueryKind.AppDiagnostics, context.sourceFilePath, { detail: 'full', page: { size: 50 } }),
  });
  expectAnswer(templateDiagnostics, [ 'hit', 'partial' ], 'template-diagnostics', failures);
  expectAnswer(appDiagnostics, [ 'hit', 'partial' ], 'app-diagnostics', failures);

  const templateRow = diagnosticRow(templateDiagnostics.value?.rows ?? [], assertion.expected);
  const appRow = diagnosticRowAtSource(appDiagnostics.value?.rows ?? [], assertion.expected, context.fixtureRoot, expectedSpan);
  expect(templateRow != null, `TemplateDiagnostics should include ${assertion.expected.diagnosticKind}/${assertion.expected.selectedMemberName}.`, failures);
  expect(appRow != null, `AppDiagnostics should include ${assertion.expected.diagnosticKind} at ${spanLabel(expectedSpan)}.`, failures);
  if (templateRow != null) {
    expectSource(templateRow.source, context.fixtureRoot, expectedSpan, 'template diagnostic source', failures);
    expectSource(templateRow.subject?.source, context.fixtureRoot, subjectSpan, 'template diagnostic subject source', failures);
    expectEqual(templateRow.subject?.subjectName, assertion.expected.selectedMemberName, 'template diagnostic subject name', failures);
    expectEqual(templateRow.suggestion?.actionKind, assertion.expected.suggestionActionKind, 'template diagnostic suggestion action', failures);
  }
  if (appRow != null) {
    expectEqual(appRow.diagnosticDomain, assertion.expected.appDiagnosticDomain, 'app diagnostic domain', failures);
    expectEqual(appRow.subject?.subjectName, assertion.expected.selectedMemberName, 'app diagnostic subject name', failures);
    expectSource(appRow.source, context.fixtureRoot, expectedSpan, 'app diagnostic source', failures);
    expectSource(appRow.subject?.source, context.fixtureRoot, subjectSpan, 'app diagnostic subject source', failures);
    expectEqual(appRow.suggestion?.actionKind, assertion.expected.suggestionActionKind, 'app diagnostic suggestion action', failures);
  }
  notes.push(`subject ${context.relativeSourceFile}@${subjectSpan.start}..${subjectSpan.end}`);
}

async function assertEditPlanOldText(assertion, failures, notes) {
  const context = contextForAssertion(assertion);
  const expectedSpan = tokenSpanForCursor(context);
  const runtime = await runtimeForAssertion(assertion);
  validateCatalog(SemanticAppQueryKind.TemplateCodeActions, { requiresCursor: true, supportsDiagnosticProjection: true }, failures);
  const answer = await runtime.answerAppQuery({
    ...cursorQuery(SemanticAppQueryKind.TemplateCodeActions, context.sourceFilePath, cursorForSpan(context.sourceFilePath, context.sourceText, expectedSpan)),
  });
  expectAnswer(answer, [ 'hit', 'partial' ], 'template-code-actions', failures);
  const action = (answer.value?.rows ?? []).find((candidate) => candidate.title === assertion.expected.title) ?? null;
  expect(action != null, `Expected code action '${assertion.expected.title}'.`, failures);
  const edit = action?.edits?.find((candidate) => candidate.editKind === assertion.expected.editKind) ?? null;
  expect(edit != null, `Expected ${assertion.expected.editKind} edit row.`, failures);
  if (edit != null) {
    expect(Object.hasOwn(edit, 'oldText'), 'Edit row should carry oldText, including empty string insertions.', failures);
    expectEqual(edit.oldText, assertion.expected.oldText, 'code-action oldText', failures);
    expectEqual(edit.newText, assertion.expected.newText, 'code-action newText', failures);
    expectEqual(relativeSourcePath(edit.source, context.fixtureRoot), assertion.expected.editSourceFile, 'code-action edit source file', failures);
    expectOldTextMatchesSource(edit, context.fixtureRoot, failures);
  }
  notes.push(action == null ? 'no action' : `${action.edits.length} edit row(s)`);
}

async function assertQueryExpectations(assertion, failures, notes) {
  const context = contextForAssertion(assertion);
  const expectations = assertion.expectations ?? [];
  expect(Array.isArray(expectations) && expectations.length > 0, 'query-expectations assertions must include at least one expectation.', failures);
  for (const expectation of expectations) {
    const query = buildQueryForExpectation(assertion, expectation, context);
    if (expectation.catalog != null) {
      validateCatalog(query.kind, expectation.catalog, failures);
    }
    const runtime = await runtimeForAssertion(assertion);
    const answer = await answerForExpectation(context, runtime, query, expectation);
    const label = expectation.name ?? query.kind;
    expectAnswer(answer, expectation.outcomes ?? ['hit', 'partial'], label, failures);
    if (expectation.closure != null) {
      expectEqual(answer.closure, expectation.closure, `${label} closure`, failures);
    }
    for (const [pathExpression, expectedValue] of Object.entries(expectation.equals ?? {})) {
      expectEqual(valueAtPath(answer, pathExpression), expectedValue, `${label} ${pathExpression}`, failures);
    }
    for (const rowExpectation of expectation.rows ?? []) {
      assertRowsExpectation(answer, rowExpectation, context, label, failures, notes);
    }
  }
}

function assertQueryCatalogExpectations(assertion, failures, notes) {
  const catalog = assertion.catalog ?? null;
  expect(catalog != null, 'query-catalog-expectations assertions must include catalog expectations.', failures);
  if (catalog == null) {
    return;
  }
  const queryKind = semanticQueryKind(catalog.kind ?? assertion.queryKind);
  const row = catalogRowFor(queryKind);
  expect(row != null, `${queryKind} should be present in the public app-query catalog.`, failures);
  if (row == null) {
    return;
  }
  for (const [pathExpression, expectedValue] of Object.entries(catalog.fields ?? {})) {
    expectEqual(valueAtPath(row, pathExpression), expectedValue, `${queryKind} catalog ${pathExpression}`, failures);
  }
  notes.push(`${queryKind} catalog`);
}

async function answerForExpectation(context, runtime, query, expectation) {
  const fetchAllPages = expectation.query?.fetchAllPages === true;
  const cacheKey = JSON.stringify({
    fixtureRoot: context.fixtureRoot,
    query,
    fetchAllPages,
  });
  const cached = queryAnswerCache.get(cacheKey);
  if (cached != null) {
    return cached;
  }
  let answer = await runtime.answerAppQuery(query);
  if (fetchAllPages && Array.isArray(answer.value?.rows)) {
    const rows = [...answer.value.rows];
    let cursor = answer.page?.nextCursor ?? null;
    let lastAnswer = answer;
    while (cursor != null) {
      lastAnswer = await runtime.answerAppQuery({
        ...query,
        page: {
          ...(query.page ?? {}),
          cursor,
        },
      });
      rows.push(...(lastAnswer.value?.rows ?? []));
      cursor = lastAnswer.page?.nextCursor ?? null;
    }
    answer = {
      ...lastAnswer,
      value: {
        ...lastAnswer.value,
        rows,
      },
      page: {
        ...(lastAnswer.page ?? {}),
        cursor: query.page?.cursor ?? null,
        nextCursor: null,
        returnedRows: rows.length,
        totalRows: lastAnswer.page?.totalRows ?? rows.length,
      },
    };
  }
  queryAnswerCache.set(cacheKey, answer);
  return answer;
}

function buildQueryForExpectation(assertion, expectation, context) {
  const queryKind = semanticQueryKind(expectation.query?.kind ?? expectation.kind);
  const querySourceFile = expectation.query?.sourceFile;
  const sourceFile = querySourceFile === false ? assertion.sourceFile : querySourceFile ?? assertion.sourceFile;
  const sourceFilePath = absoluteFixturePath(context.fixtureRoot, sourceFile);
  const query = {
    kind: queryKind,
    sourceFilePath,
    analysisDepth: expectation.query?.analysisDepth ?? 'binding-observation',
    diagnosticProjection: expectation.query?.diagnosticProjection ?? 'type-projection',
    includeAuthoringTemplates: expectation.query?.includeAuthoringTemplates ?? true,
    appRetention: expectation.query?.appRetention ?? 'retain-app',
    ...(expectation.query?.options ?? {}),
  };
  const catalogRow = catalogRowFor(queryKind);
  if (catalogRow?.supportsSourceFile === true && querySourceFile !== false) {
    query.sourceFile = { filePath: sourceFilePath };
  }
  const cursorSpec = expectation.query?.cursor === false
    ? null
    : expectation.query?.cursor ?? assertion.cursor ?? null;
  if (cursorSpec != null) {
    query.cursor = cursorForSpec(context.fixtureRoot, sourceFile, cursorSpec);
  }
  return query;
}

function catalogRowFor(kind) {
  return readSemanticAppQueryCatalog({ queryKind: kind }).value?.rows?.[0] ?? null;
}

function semanticQueryKind(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Query expectation must include a query kind.');
  }
  const known = Object.values(SemanticAppQueryKind);
  if (!known.includes(value)) {
    throw new Error(`Unknown semantic app query kind '${value}'.`);
  }
  return value;
}

function assertRowsExpectation(answer, rowExpectation, context, label, failures, notes) {
  const rows = valuesAtPath(answer, rowExpectation.rowPath ?? 'value.rows');
  const matched = rows.filter((row) => rowMatchesExpectation(row, rowExpectation, context));
  if (rowExpectation.count != null) {
    expectEqual(matched.length, rowExpectation.count, `${label} ${rowExpectation.rowPath ?? 'value.rows'} match count`, failures);
  }
  if (rowExpectation.atLeast != null) {
    expect(
      matched.length >= rowExpectation.atLeast,
      `${label} expected at least ${rowExpectation.atLeast} matching row(s), got ${matched.length}.`,
      failures,
    );
  }
  if (rowExpectation.absent === true) {
    expectEqual(matched.length, 0, `${label} absent row count`, failures);
  }
  if (rowExpectation.count == null && rowExpectation.atLeast == null && rowExpectation.absent !== true) {
    expect(matched.length > 0, `${label} expected a matching row for ${rowExpectationLabel(rowExpectation, context)}.`, failures);
  }
  if (rowExpectation.oldTextMatchesSource === true) {
    for (const row of matched) {
      expectOldTextMatchesSource(row, context.fixtureRoot, failures);
    }
  }
  if (rowExpectation.note === true && matched.length > 0) {
    notes.push(`${label}: ${matched.length} row(s) matched ${rowExpectationLabel(rowExpectation, context)}`);
  }
}

function rowMatchesExpectation(row, rowExpectation, context) {
  if (row == null) {
    return false;
  }
  for (const [pathExpression, expectedValue] of Object.entries(rowExpectation.fields ?? {})) {
    if (!isDeepStrictEqual(valueAtPath(row, pathExpression), expectedValue)) {
      return false;
    }
  }
  if (rowExpectation.source != null) {
    const sourceField = rowExpectation.sourceField ?? 'source';
    const source = valueAtPath(row, sourceField);
    const span = spanForSpec(context.fixtureRoot, rowExpectation.source.sourceFile ?? context.relativeSourceFile, rowExpectation.source);
    if (!sourceMatches(source, context.fixtureRoot, span)) {
      return false;
    }
  }
  if (rowExpectation.sourceText != null) {
    const sourceField = rowExpectation.sourceField ?? 'source';
    const source = valueAtPath(row, sourceField);
    if (source == null || source.path == null || source.start == null || source.end == null) {
      return false;
    }
    const sourcePath = path.isAbsolute(source.path) ? source.path : path.join(context.fixtureRoot, source.path);
    if (sourceTextFor(sourcePath).slice(source.start, source.end) !== rowExpectation.sourceText) {
      return false;
    }
  }
  return true;
}

function rowExpectationLabel(rowExpectation, context) {
  const fields = Object.entries(rowExpectation.fields ?? {})
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(', ');
  if (rowExpectation.source == null) {
    return fields || '<any row>';
  }
  const span = spanForSpec(context.fixtureRoot, rowExpectation.source.sourceFile ?? context.relativeSourceFile, rowExpectation.source);
  return [fields, spanLabel(span)].filter(Boolean).join(' at ');
}

function expandMatrixAssertions(value) {
  const directAssertions = value.assertions ?? [];
  const setAssertions = (value.assertionSets ?? []).flatMap((set) => {
    const { cases, ...setDefaults } = set;
    if (!Array.isArray(cases)) {
      throw new Error(`Semantic conformance assertion set '${set.id ?? '<unknown>'}' must include a cases array.`);
    }
    return cases.map((assertionCase) => {
      const caseId = assertionCase.id;
      if (typeof caseId !== 'string' || caseId.length === 0) {
        throw new Error(`Every case in assertion set '${set.id ?? '<unknown>'}' must have an id.`);
      }
      return deepMerge(setDefaults, {
        ...assertionCase,
        id: `${set.id}/${caseId}`,
        requirement: assertionCase.requirement ?? setDefaults.requirement,
      });
    });
  });
  return [...directAssertions, ...setAssertions];
}

function validateMatrix(value, expandedAssertions) {
  if (value?.schemaVersion !== 'semantic-conformance-matrix.v1') {
    throw new Error(`Unsupported semantic conformance matrix schemaVersion '${value?.schemaVersion}'.`);
  }
  if (!Array.isArray(value.assertions) && !Array.isArray(value.assertionSets)) {
    throw new Error('Semantic conformance matrix must contain assertions or assertionSets.');
  }
  const ids = new Set();
  const sourceLocusErrors = [];
  for (const assertion of expandedAssertions) {
    if (typeof assertion.id !== 'string' || assertion.id.length === 0) {
      throw new Error('Every semantic conformance assertion must have an id.');
    }
    if (ids.has(assertion.id)) {
      throw new Error(`Duplicate semantic conformance assertion id '${assertion.id}'.`);
    }
    ids.add(assertion.id);
    if (typeof assertion.requirement !== 'string' || assertion.requirement.length === 0) {
      throw new Error(`Semantic conformance assertion '${assertion.id}' must state a stable requirement.`);
    }
    if (typeof assertion.capability !== 'string' || assertion.capability.length === 0) {
      throw new Error(`Semantic conformance assertion '${assertion.id}' must name a capability.`);
    }
    if (!AURELIA_DOMAINS.has(assertion.aureliaDomain)) {
      throw new Error(`Semantic conformance assertion '${assertion.id}' has unsupported aureliaDomain '${assertion.aureliaDomain}'.`);
    }
    if (!DOMAIN_AXES.has(assertion.domainAxis)) {
      throw new Error(`Semantic conformance assertion '${assertion.id}' has unsupported domainAxis '${assertion.domainAxis}'.`);
    }
    if (!COVERAGE_INTENTS.has(assertion.coverageIntent)) {
      throw new Error(`Semantic conformance assertion '${assertion.id}' has unsupported coverageIntent '${assertion.coverageIntent}'.`);
    }
    if (!ASSERTION_KINDS.has(assertion.assertionKind)) {
      throw new Error(`Semantic conformance assertion '${assertion.id}' has unsupported assertionKind '${assertion.assertionKind}'.`);
    }
    if (assertion.assertionKind !== 'query-catalog-expectations') {
      if (typeof assertion.fixture !== 'string' || assertion.fixture.length === 0) {
        throw new Error(`Semantic conformance assertion '${assertion.id}' must name a fixture.`);
      }
      if (typeof assertion.sourceFile !== 'string' || assertion.sourceFile.length === 0) {
        throw new Error(`Semantic conformance assertion '${assertion.id}' must name a sourceFile.`);
      }
      sourceLocusErrors.push(...validateAssertionSourceLoci(assertion));
    }
  }
  if (sourceLocusErrors.length > 0) {
    throw new Error(
      `Semantic conformance source-locus preflight found ${sourceLocusErrors.length} invalid locator(s):\n`
      + sourceLocusErrors.map((error) => `- ${error}`).join('\n'),
    );
  }
}

function validateAssertionSourceLoci(assertion) {
  const fixtureRoot = path.join(packageRoot, assertion.fixture);
  const defaultSourceFile = assertion.sourceFile;
  const errors = [];
  const validate = (locus, operation) => {
    try {
      operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Semantic conformance assertion '${assertion.id}' ${locus}: ${message}`);
    }
  };
  if (assertion.cursor != null) {
    validate('cursor', () => {
      cursorForSpec(fixtureRoot, defaultSourceFile, assertion.cursor);
    });
  }
  if (assertion.expected?.subjectMarker != null) {
    validate('expected.subjectMarker', () => {
      const sourceText = sourceTextFor(absoluteFixturePath(fixtureRoot, defaultSourceFile));
      authoredMarkerSpan(
        defaultSourceFile,
        sourceText,
        assertion.expected.subjectMarker,
        assertion.expected.subjectMarkerOccurrence,
      );
    });
  }
  for (const [expectationIndex, expectation] of (assertion.expectations ?? []).entries()) {
    const querySourceFile = expectation.query?.sourceFile ?? defaultSourceFile;
    if (expectation.query?.cursor != null && expectation.query.cursor !== false) {
      validate(`expectations[${expectationIndex}].query.cursor`, () => {
        cursorForSpec(fixtureRoot, querySourceFile, expectation.query.cursor);
      });
    }
    for (const [rowIndex, rowExpectation] of (expectation.rows ?? []).entries()) {
      if (rowExpectation.source != null) {
        validate(`expectations[${expectationIndex}].rows[${rowIndex}].source`, () => {
          spanForSpec(
            fixtureRoot,
            rowExpectation.source.sourceFile ?? defaultSourceFile,
            rowExpectation.source,
          );
        });
      }
    }
  }
  return errors;
}

function validateKnownGaps(value, expandedAssertions) {
  if (value?.schemaVersion !== 'semantic-conformance-known-gaps.v1') {
    throw new Error(`Unsupported semantic conformance known-gaps schemaVersion '${value?.schemaVersion}'.`);
  }
  if (!Array.isArray(value.knownGaps)) {
    throw new Error('Semantic conformance known-gaps file must contain a knownGaps array.');
  }
  const assertionIds = new Set(expandedAssertions.map((assertion) => assertion.id));
  const seen = new Set();
  for (const gap of value.knownGaps) {
    if (!assertionIds.has(gap.assertionId)) {
      throw new Error(`Known gap '${gap.assertionId}' does not match a conformance assertion id.`);
    }
    if (seen.has(gap.assertionId)) {
      throw new Error(`Duplicate known gap for assertion '${gap.assertionId}'.`);
    }
    seen.add(gap.assertionId);
    if (gap.status !== 'known-gap') {
      throw new Error(`Known gap '${gap.assertionId}' has unsupported status '${gap.status}'.`);
    }
    if (typeof gap.failureBucket !== 'string' || gap.failureBucket.length === 0) {
      throw new Error(`Known gap '${gap.assertionId}' must name a failureBucket.`);
    }
    if (typeof gap.rationale !== 'string' || gap.rationale.length === 0) {
      throw new Error(`Known gap '${gap.assertionId}' must include a rationale.`);
    }
  }
}

function validateFilters(filters, assertions) {
  for (const [key, requestedValues] of Object.entries(filters)) {
    if (requestedValues.length === 0 || key === 'id') {
      continue;
    }
    const availableValues = new Set(assertions.map((assertion) => assertion[key]).filter((value) => value != null));
    for (const requestedValue of requestedValues) {
      if (!availableValues.has(requestedValue)) {
        throw new Error(`Unknown semantic conformance filter ${key}='${requestedValue}'. Available: ${[...availableValues].sort().join(', ')}`);
      }
    }
  }
}

function assertionMatchesFilters(assertion, filters) {
  return Object.entries(filters).every(([key, requestedValues]) => {
    if (requestedValues.length === 0) {
      return true;
    }
    if (key === 'id') {
      return requestedValues.some((requestedValue) => assertion.id.includes(requestedValue));
    }
    return requestedValues.includes(assertion[key]);
  });
}

function hasFilters(filters) {
  return Object.values(filters).some((values) => values.length > 0);
}

function filterSummary(filters) {
  const entries = Object.entries(filters)
    .filter(([, values]) => values.length > 0)
    .map(([key, values]) => `${key}=${values.join('|')}`);
  return entries.length > 0 ? entries.join(', ') : '<none>';
}

function deepMerge(left, right) {
  if (!isPlainObject(left) || !isPlainObject(right)) {
    return right;
  }
  const merged = { ...left };
  for (const [key, value] of Object.entries(right)) {
    merged[key] = key in merged ? deepMerge(merged[key], value) : value;
  }
  return merged;
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function contextForAssertion(assertion) {
  const fixtureRoot = path.join(packageRoot, assertion.fixture);
  const sourceFilePath = path.join(fixtureRoot, assertion.sourceFile);
  const sourceText = sourceTextFor(sourceFilePath);
  return {
    fixtureRoot,
    sourceFilePath,
    sourceText,
    relativeSourceFile: assertion.sourceFile,
    cursor: assertion.cursor,
  };
}

async function runtimeForAssertion(assertion) {
  const fixtureRoot = path.join(packageRoot, assertion.fixture);
  const key = path.resolve(fixtureRoot);
  let runtime = runtimeCache.get(key);
  if (runtime == null) {
    runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: `semantic-conformance:${path.basename(fixtureRoot)}`,
    });
    runtimeCache.set(key, runtime);
  }
  return runtime;
}

function sourceTextFor(filePath) {
  const key = path.resolve(filePath);
  let text = sourceTextCache.get(key);
  if (text == null) {
    text = fs.readFileSync(key, 'utf8');
    sourceTextCache.set(key, text);
  }
  return text;
}

function tokenSpanForCursor(context) {
  return spanForSpec(context.fixtureRoot, context.relativeSourceFile, context.cursor);
}

function cursorForSpec(fixtureRoot, defaultSourceFile, spec) {
  const sourceFile = spec.sourceFile ?? defaultSourceFile;
  const sourceFilePath = absoluteFixturePath(fixtureRoot, sourceFile);
  const sourceText = sourceTextFor(sourceFilePath);
  const span = spanForSpec(fixtureRoot, defaultSourceFile, spec);
  return cursorForSpan(sourceFilePath, sourceText, span);
}

function spanForSpec(fixtureRoot, defaultSourceFile, spec) {
  const sourceFile = spec.sourceFile ?? defaultSourceFile;
  const sourceFilePath = absoluteFixturePath(fixtureRoot, sourceFile);
  const sourceText = sourceTextFor(sourceFilePath);
  return authoredSourceSpanForSpec(sourceFile, sourceText, spec);
}

function absoluteFixturePath(fixtureRoot, sourceFile) {
  return path.isAbsolute(sourceFile) ? sourceFile : path.join(fixtureRoot, sourceFile);
}

function spanForMarker(text, marker, sourcePath = null, occurrence = null) {
  return authoredMarkerSpan(sourcePath ?? '<source>', text, marker, occurrence);
}

function cursorForSpan(filePath, text, span) {
  const offset = span.start + Math.floor((span.end - span.start) / 2);
  return cursorAtOffset(filePath, text, offset);
}

function cursorAtOffset(filePath, text, offset) {
  const before = text.slice(0, offset);
  const lines = before.split(/\r?\n/u);
  return {
    filePath,
    line: lines.length - 1,
    character: lines.at(-1).length,
    offset,
  };
}

function cursorQuery(kind, sourceFilePath, cursor, extra = {}) {
  return {
    kind,
    sourceFilePath,
    cursor,
    analysisDepth: 'binding-observation',
    diagnosticProjection: 'type-projection',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
    ...extra,
  };
}

function sourceFileQuery(kind, sourceFilePath, extra = {}) {
  return {
    kind,
    sourceFilePath,
    sourceFile: { filePath: sourceFilePath },
    analysisDepth: 'binding-observation',
    diagnosticProjection: 'type-projection',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
    ...extra,
  };
}

function validateCatalog(kind, expected, failures) {
  const answer = readSemanticAppQueryCatalog({ queryKind: kind });
  const row = answer.value?.rows?.[0] ?? null;
  expect(row != null, `${kind} should be present in the public app-query catalog.`, failures);
  if (row == null) {
    return;
  }
  for (const [key, value] of Object.entries(expected)) {
    expectEqual(row[key], value, `${kind} catalog ${key}`, failures);
  }
}

function expectAnswer(answer, allowedOutcomes, label, failures) {
  expect(allowedOutcomes.includes(answer.outcome), `${label} outcome should be ${allowedOutcomes.join('/')} but was ${answer.outcome}: ${answer.summary}`, failures);
}

function diagnosticRow(rows, expected) {
  return rows.find((row) =>
    row.diagnosticKind === expected.diagnosticKind
    && row.selectedMemberName === expected.selectedMemberName
  ) ?? null;
}

function diagnosticRowAtSource(rows, expected, fixtureRoot, span) {
  return rows.find((row) =>
    row.diagnosticKind === expected.diagnosticKind
    && sourceMatches(row.source, fixtureRoot, span)
  ) ?? null;
}

function findRowWithSource(rows, discriminatorKey, discriminatorValue, fixtureRoot, span) {
  return rows.find((row) =>
    row?.[discriminatorKey] === discriminatorValue
    && sourceMatches(row.source, fixtureRoot, span)
  ) ?? null;
}

function expectSource(source, fixtureRoot, span, label, failures) {
  expect(sourceMatches(source, fixtureRoot, span), `${label} should be ${spanLabel(span)} but was ${sourceLabel(source, fixtureRoot)}.`, failures);
}

function sourceMatches(source, fixtureRoot, span) {
  if (source == null || source.start !== span.start || source.end !== span.end) {
    return false;
  }
  if (span.path == null) {
    return true;
  }
  return relativeSourcePath(source, fixtureRoot) === span.path;
}

function relativeSourcePath(source, fixtureRoot) {
  if (source?.path == null) {
    return null;
  }
  const sourcePath = path.isAbsolute(source.path)
    ? source.path
    : path.join(fixtureRoot, source.path);
  return path.relative(fixtureRoot, sourcePath).replace(/\\/g, '/');
}

function expectOldTextMatchesSource(edit, fixtureRoot, failures) {
  if (edit.source?.path == null || edit.source.start == null || edit.source.end == null || edit.oldText == null) {
    return;
  }
  const sourcePath = path.isAbsolute(edit.source.path) ? edit.source.path : path.join(fixtureRoot, edit.source.path);
  const actual = sourceTextFor(sourcePath).slice(edit.source.start, edit.source.end);
  expectEqual(actual, edit.oldText, `oldText validation for ${relativeSourcePath(edit.source, fixtureRoot)}@${edit.source.start}..${edit.source.end}`, failures);
}

function expectEqual(actual, expected, label, failures) {
  expect(isDeepStrictEqual(actual, expected), `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`, failures);
}

function valueAtPath(value, pathExpression) {
  if (pathExpression == null || pathExpression === '') {
    return value;
  }
  let current = value;
  for (const segment of pathExpression.split('.')) {
    if (current == null) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function valuesAtPath(value, pathExpression) {
  let values = [value];
  for (const rawSegment of pathExpression.split('.')) {
    const flatten = rawSegment.endsWith('[]');
    const segment = flatten ? rawSegment.slice(0, -2) : rawSegment;
    values = values.flatMap((candidate) => {
      const next = candidate?.[segment];
      if (next == null) {
        return [];
      }
      if (flatten) {
        return Array.isArray(next) ? next : [];
      }
      return [next];
    });
  }
  return values.flatMap((candidate) => Array.isArray(candidate) ? candidate : [candidate]);
}

function expect(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function conformanceOutcomeFor(rawOutcome, knownGap) {
  if (knownGap == null) {
    return rawOutcome === 'passed' ? 'passed' : 'failed';
  }
  return rawOutcome === 'passed' ? 'resolved-gap' : 'known-gap';
}

function summarizeResults(results) {
  return {
    total: results.length,
    passed: results.filter((result) => result.conformanceOutcome === 'passed').length,
    knownGaps: results.filter((result) => result.conformanceOutcome === 'known-gap').length,
    failures: results.filter((result) => result.conformanceOutcome === 'failed').length,
    resolvedGaps: results.filter((result) => result.conformanceOutcome === 'resolved-gap').length,
  };
}

function printSummary(summary, results, filters) {
  console.log(`Semantic conformance: ${summary.passed}/${summary.total - summary.knownGaps - summary.resolvedGaps} active assertion(s) passed, ${summary.knownGaps} known gap(s).`);
  if (hasFilters(filters)) {
    console.log(`Filters: ${filterSummary(filters)}`);
  }
  console.log(`Aurelia domains: ${formatCounts(countBy(results, (result) => result.aureliaDomain))}`);
  console.log(`Domains: ${formatCounts(countBy(results, (result) => result.domainAxis))}`);
  console.log(`Coverage intents: ${formatCounts(countBy(results, (result) => result.coverageIntent))}`);
  console.log(`Capabilities: ${formatCounts(countBy(results, (result) => result.capability))}`);
  console.log(`Behavior query kinds: ${formatCounts(countManyBy(results, (result) => result.queryKinds))}`);
  for (const [aureliaDomain, domainResults] of groupBy(results, (result) => result.aureliaDomain)) {
    const queryKinds = countManyBy(domainResults, (result) => result.queryKinds);
    console.log(`Behavior query kinds (${aureliaDomain}): ${queryKinds.size === 0 ? '<none>' : formatCounts(queryKinds)}`);
  }
  for (const result of results) {
    const marker = result.conformanceOutcome === 'passed'
      ? 'PASS'
      : result.conformanceOutcome === 'known-gap'
        ? 'KNOWN-GAP'
        : result.conformanceOutcome === 'resolved-gap'
          ? 'RESOLVED-GAP'
        : result.conformanceOutcome === 'failed'
          ? 'FAIL'
          : 'INFO';
    console.log(`- ${marker} ${result.id} [${result.aureliaDomain}; ${result.domainAxis}; ${result.capability}; ${result.coverageIntent}; ${result.assertionKind}; ${result.failureBucket ?? 'no-gap'}]`);
    if (result.requirement != null) {
      console.log(`  requires: ${result.requirement}`);
    }
    if (result.knownGap != null) {
      console.log(`  gap: ${result.knownGap.rationale}`);
    }
    for (const note of result.notes) {
      console.log(`  note: ${note}`);
    }
    if (result.failures.length > 0) {
      const prefix = result.conformanceOutcome === 'known-gap' ? 'known' : 'failure';
      for (const failure of result.failures) {
        console.log(`  ${prefix}: ${failure}`);
      }
    }
  }
  if (summary.failures > 0 || summary.resolvedGaps > 0) {
    console.error(`Semantic conformance needs attention: ${summary.failures} failure(s), ${summary.resolvedGaps} resolved known gap(s).`);
  } else if (strictConformance && summary.knownGaps > 0) {
    console.error(`Semantic conformance strict mode blocks ${summary.knownGaps} known gap(s).`);
  }
}

function countBy(values, readKey) {
  const counts = new Map();
  for (const value of values) {
    const key = readKey(value) ?? '<none>';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function countManyBy(values, readKeys) {
  const counts = new Map();
  for (const value of values) {
    for (const key of new Set(readKeys(value) ?? [])) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

function groupBy(values, readKey) {
  const groups = new Map();
  for (const value of values) {
    const key = readKey(value) ?? '<none>';
    const group = groups.get(key) ?? [];
    group.push(value);
    groups.set(key, group);
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function formatCounts(counts) {
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}=${count}`)
    .join(', ');
}

function spanLabel(span) {
  return `${span.path ?? '<source>'}@${span.start}..${span.end}`;
}

function sourceLabel(source, fixtureRoot) {
  if (source == null) {
    return '<null>';
  }
  return `${relativeSourcePath(source, fixtureRoot) ?? source.path ?? '<no-path>'}@${source.start ?? '?'}..${source.end ?? '?'}`;
}
