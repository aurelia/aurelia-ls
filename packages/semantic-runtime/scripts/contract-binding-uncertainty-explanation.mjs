import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SemanticAppQueryKind,
  createSemanticRuntime,
  semanticAppQueryCatalogRow,
  semanticAppQueryCatalogShape,
  unsupportedSemanticAppQuerySelectorFields,
} from '../out/index.js';
import { semanticAppQueryKey } from '../out/api/app-query-identity.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/binding-uncertainty-explanation');
const exactPath = 'src/exact-app.html';
const sharedPath = 'src/shared-app.html';
const exactText = fs.readFileSync(path.join(fixtureRoot, exactPath), 'utf8');
const sharedText = fs.readFileSync(path.join(fixtureRoot, sharedPath), 'utf8');
const failures = [];

const catalogRow = semanticAppQueryCatalogRow(SemanticAppQueryKind.BindingUncertaintyExplanation);
check(catalogRow.group === 'binding', `Expected binding group, observed ${catalogRow.group}.`);
check(catalogRow.resultRole === 'cursor-locus', `Expected cursor-locus result, observed ${catalogRow.resultRole}.`);
check(catalogRow.requiresCursor, 'Expected binding explanation to require a cursor.');
check(!catalogRow.supportsPaging && !catalogRow.supportsDetail, 'Expected V1 binding explanation to reject paging and detail.');
check(catalogRow.minimumAnalysisDepth === 'binding-observation', `Expected binding-observation depth, observed ${catalogRow.minimumAnalysisDepth}.`);
check(catalogRow.materializationPolicy === 'projection-only', `Expected projection-only query, observed ${catalogRow.materializationPolicy}.`);

const exactCursor = cursor(exactPath, offset(exactText, 'value.to-view="name"', 'name'));
const shaped = semanticAppQueryCatalogShape({
  kind: SemanticAppQueryKind.BindingUncertaintyExplanation,
  cursor: exactCursor,
  templateResourceScopeIdentityKey: 'must-not-be-consumed',
});
check(shaped.cursor?.offset === exactCursor.offset, 'Expected catalog shape to retain the cursor.');
check(shaped.templateResourceScopeIdentityKey == null, 'Expected V1 catalog shape to drop template scope choreography.');
check(
  unsupportedSemanticAppQuerySelectorFields({
    kind: SemanticAppQueryKind.BindingUncertaintyExplanation,
    cursor: exactCursor,
    templateResourceScopeIdentityKey: 'must-not-be-consumed',
  }).includes('templateResourceScopeIdentityKey'),
  'Expected V1 binding explanation to reject a template scope selector.',
);
check(
  unsupportedSemanticAppQuerySelectorFields({
    kind: SemanticAppQueryKind.BindingUncertaintyExplanation,
    cursor: exactCursor,
    detail: 'handles',
  }).includes('detail'),
  'Expected V1 binding explanation to reject handle detail.',
);
check(
  semanticAppQueryKey({ kind: SemanticAppQueryKind.BindingUncertaintyExplanation, cursor: exactCursor })
    !== semanticAppQueryKey({
      kind: SemanticAppQueryKind.BindingUncertaintyExplanation,
      cursor: { ...exactCursor, offset: exactCursor.offset + 1 },
    }),
  'Expected exact cursor position to participate in query identity.',
);

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'binding-uncertainty-explanation',
});

const invalidSelectorAnswer = await runtime.answerAppQuery({
  kind: SemanticAppQueryKind.BindingUncertaintyExplanation,
  cursor: exactCursor,
  templateResourceScopeIdentityKey: 'must-not-be-consumed',
  appRetention: 'retain-app',
});
check(
  invalidSelectorAnswer.result === 'unsupported'
  && invalidSelectorAnswer.selection === 'not-applicable'
  && invalidSelectorAnswer.coverage === 'not-applicable',
  'Expected unsupported scope selector to fail before semantic selection.',
);

const healthy = await explain(exactPath, offset(exactText, 'value.to-view="name"', 'name'));
checkExact(healthy, 'flow-proved', 'complete', 'healthy');
check(healthy.value.explanation?.uncertainty.state === 'closed', 'Expected healthy binding uncertainty to close.');
check(healthy.value.explanation?.evidence.lanes.length === 1, 'Expected one healthy binding lane.');
check(healthy.value.explanation?.subject.bindingKind === 'property', 'Expected V1 subject to be a property binding.');
check(healthy.value.explanation?.subject.source.path === exactPath, 'Expected exact authored binding source.');
check(healthy.value.explanation?.subject.subjectKey.length > 0, 'Expected structural subject reproof key.');
check(healthy.analysisBasis != null, 'Expected currentness exclusively through answer analysisBasis.');
check(
  healthy.value.explanation?.currentness.authority === 'answer-analysis-basis'
  && !('revision' in (healthy.value.explanation?.currentness ?? {})),
  'Expected value currentness to explain, not duplicate, answer-envelope authority.',
);
check((healthy.value.explanation?.nextSteps.length ?? 99) <= 3, 'Expected no more than three next steps.');
check(
  healthy.continuations?.some((row) => row.targetQueryKind === SemanticAppQueryKind.TemplateCursorInfo) === true
  && healthy.continuations?.some((row) => row.targetQueryKind === SemanticAppQueryKind.BindingDataFlows) === true,
  'Expected exact binding explanation continuations to cursor context and conserved data-flow rows.',
);
const healthyCarrier = await explain(exactPath, offset(exactText, 'value.to-view="name"', 'value.to-view'));
check(
  healthyCarrier.selection === 'exact'
  && healthyCarrier.value.explanation?.subject.subjectKey === healthy.value.explanation?.subject.subjectKey,
  'Expected expression and binding-carrier cursors to reselect the same property binding subject.',
);

const readonlyWrite = await explain(exactPath, offset(exactText, 'value.two-way="readonlyName"', 'readonlyName'));
checkExact(readonlyWrite, 'flow-proved', 'complete', 'runtime-unassignable');
check(
  readonlyWrite.value.explanation?.evidence.lanes.some((lane) =>
    lane.sourceWritable === false
    && lane.sourceAssignmentKind === 'runtime-assignable-with-typescript-strictness'
  ) === true,
  'Expected readonly binding evidence to retain the closed TypeScript strictness mismatch.',
);
check(
  /not writable|TypeScript strictness mismatch/.test(readonlyWrite.value.explanation?.conclusion.explanation ?? '')
  && readonlyWrite.value.explanation?.conclusion.action.includes('proved a type or writeback incompatibility') === true,
  'Expected engine prose/action to name the closed TypeScript strictness mismatch.',
);

const nullishMismatch = await explain(exactPath, offset(exactText, 'title.bind="maybeTitle"', 'maybeTitle'));
checkExact(nullishMismatch, 'flow-proved', 'complete', 'closed-mismatch');
check(
  nullishMismatch.value.explanation?.evidence.lanes.some((lane) =>
    lane.sourceToTargetAssignable === false
    || lane.sourceToTargetTypeMismatchKinds.length > 0
  ) === true,
  'Expected mismatch fixture to retain a proved negative assignability fact.',
);
check(
  /not assignable|proved mismatch/.test(nullishMismatch.value.explanation?.conclusion.explanation ?? '')
  && nullishMismatch.value.explanation?.conclusion.action.includes('proved a type or writeback incompatibility') === true,
  'Expected closed mismatch prose/action not to sound healthy.',
);

const open = await explain(exactPath, offset(exactText, 'value.bind="selectedNullable"', 'selectedNullable'));
checkExact(open, 'flow-partially-proved', 'open', 'open-select-writeback');
check(open.value.explanation?.uncertainty.state === 'open', 'Expected nullable multi-select uncertainty to remain open.');
check(
  open.value.explanation?.uncertainty.reasons.includes('target-to-source-assignability-open') === true,
  'Expected required nullable target-to-source assignability to remain explicitly open.',
);
check((open.value.explanation?.evidence.blockers.length ?? 0) > 0, 'Expected open binding to retain causal blocker seams.');
check(
  open.value.explanation?.evidence.blockers.every((blocker) =>
    blocker.reasonKinds.length > 0
    && blocker.boundaryKinds.length > 0
    && blocker.laneIndexes.length > 0
  ) === true,
  'Expected typed blockers to retain reasons, boundaries, and constrained lane indexes.',
);
check(
  open.continuations?.some((row) =>
    row.targetQueryKind === SemanticAppQueryKind.OpenSeamSites
    && row.targetQuery?.sourceFile?.filePath === exactPath
  ) === true,
  'Expected open explanation to continue to source-file open semantic sites.',
);

const ambiguous = await explain(sharedPath, offset(sharedText, 'value.bind="sharedName"', 'sharedName'));
check(ambiguous.selection === 'ambiguous', `Expected shared-template ambiguity, observed ${ambiguous.selection}.`);
check(ambiguous.value.explanation === null, 'Expected ambiguous selection not to publish a chosen explanation.');
check(ambiguous.value.contenders.length === 2, `Expected two app-world contenders, observed ${ambiguous.value.contenders.length}.`);
check(new Set(ambiguous.value.contenders.map((row) => row.subject.subjectKey)).size === 2, 'Expected structural contender identities to distinguish app worlds.');

const absent = await explain(exactPath, 0);
check(absent.selection === 'absent' && absent.value.explanation === null, 'Expected cursor outside binding spans to fail closed as absent.');
check(
  absent.continuations?.some((row) => row.targetQueryKind === SemanticAppQueryKind.TemplateCursorInfo) === true
  && absent.continuations?.some((row) => row.targetQueryKind === SemanticAppQueryKind.BindingDataFlows) === true
  && !absent.continuations?.some((row) => row.targetQueryKind === SemanticAppQueryKind.OpenSeamSites),
  'Expected absent continuation behavior to remain truthful and non-source-claiming.',
);
const missingCursor = await runtime.answerAppQuery({
  kind: SemanticAppQueryKind.BindingUncertaintyExplanation,
  appRetention: 'retain-app',
});
check(
  missingCursor.selection === 'absent' && missingCursor.value.explanation === null,
  'Expected an omitted required cursor to fail closed as absent.',
);

const listener = await explain(exactPath, offset(exactText, 'click.trigger="save()"', 'save'));
check(listener.selection === 'absent', 'Expected V1 explanation to exclude non-PropertyBinding listener semantics.');

const appDiagnostics = await runtime.answerAppQuery({
  kind: SemanticAppQueryKind.AppDiagnostics,
  page: { size: 500 },
  diagnosticProjection: 'type-projection',
  appRetention: 'retain-app',
});
check(
  appDiagnostics.value.rows.some((row) => row.diagnosticKind === 'binding-source-runtime-branch-open'),
  'Expected nullable multi-select branch diagnostic evidence in the focused fixture.',
);
check(
  appDiagnostics.continuations?.some((row) =>
    row.targetQueryKind === SemanticAppQueryKind.BindingUncertaintyExplanation
    && row.targetQuery?.cursor?.offset != null
  ) === true,
  'Expected detailed app diagnostics to expose an exact binding explanation continuation.',
);

const templateDiagnostics = await runtime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateDiagnostics,
  sourceFile: { filePath: exactPath },
  page: { size: 500 },
  diagnosticProjection: 'type-projection',
  appRetention: 'retain-app',
});
check(
  templateDiagnostics.value.rows.some((row) => row.diagnosticKind === 'binding-source-runtime-branch-open')
  && templateDiagnostics.continuations?.some((row) =>
    row.targetQueryKind === SemanticAppQueryKind.BindingUncertaintyExplanation
    && row.targetQuery?.cursor?.offset != null
  ) === true,
  'Expected detailed template diagnostics to expose an exact binding explanation continuation.',
);

const summary = await runtime.answerAppQuery({
  kind: SemanticAppQueryKind.AppDiagnosticSummary,
  page: { size: 500 },
  diagnosticProjection: 'type-projection',
  appRetention: 'retain-app',
});
check(
  !summary.continuations?.some((row) => row.targetQueryKind === SemanticAppQueryKind.BindingUncertaintyExplanation),
  'Expected summary clusters not to fabricate exact binding cursors.',
);

const truncatedRuntime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'binding-uncertainty-explanation:truncated',
  projects: [{
    rootDir: fixtureRoot,
    projectKey: 'binding-uncertainty-explanation-truncated',
    sourceDiscoveryOptions: { maxFiles: 2 },
  }],
});
const truncated = await truncatedRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.BindingUncertaintyExplanation,
  cursor: exactCursor,
  appRetention: 'retain-app',
});
check(
  truncated.selection === 'exact'
  && truncated.coverage === 'truncated'
  && truncated.value.explanation?.uncertainty.state === 'truncated'
  && truncated.value.explanation.uncertainty.reasons.includes('source-discovery-truncated'),
  'Expected real source-discovery guardrail pressure to preserve exact selection with typed truncated uncertainty.',
);

for (const answer of [healthy, readonlyWrite, nullishMismatch, open, ambiguous, absent, listener, truncated]) {
  check(typeof JSON.stringify(answer) === 'string', 'Expected generic app-query/MCP JSON compatibility.');
  check(answer.value.explanation?.nextSteps.length == null || answer.value.explanation.nextSteps.length <= 3, 'Expected every exact result to cap next steps at three.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      catalog: catalogRow.queryKind,
      healthy: healthy.value.explanation?.conclusion.kind,
      readonly: readonlyWrite.value.explanation?.evidence.lanes[0]?.sourceAssignmentKind,
      mismatch: nullishMismatch.value.explanation?.evidence.lanes[0]?.sourceToTargetAssignable,
      openReasons: open.value.explanation?.uncertainty.reasons,
      blockers: open.value.explanation?.evidence.blockers.length,
      ambiguousContenders: ambiguous.value.contenders.length,
      truncated: truncated.value.explanation?.uncertainty.state,
    },
  }, null, 2));
}

async function explain(filePath, cursorOffset) {
  return runtime.answerAppQuery({
    kind: SemanticAppQueryKind.BindingUncertaintyExplanation,
    cursor: cursor(filePath, cursorOffset),
    appRetention: 'retain-app',
  });
}

function checkExact(answer, conclusionKind, coverage, label) {
  check(answer.selection === 'exact', `Expected exact ${label} selection, observed ${answer.selection}.`);
  check(answer.coverage === coverage, `Expected ${coverage} ${label} coverage, observed ${answer.coverage}.`);
  check(answer.value.explanation?.conclusion.kind === conclusionKind, `Expected ${conclusionKind} ${label} conclusion, observed ${answer.value.explanation?.conclusion.kind ?? '<none>'}.`);
  check(answer.value.contenders.length === 1, `Expected one ${label} contender, observed ${answer.value.contenders.length}.`);
}

function cursor(filePath, cursorOffset) {
  return { filePath, line: 0, character: 0, offset: cursorOffset };
}

function offset(text, carrier, token) {
  const carrierOffset = text.indexOf(carrier);
  const tokenOffset = carrier.indexOf(token);
  if (carrierOffset < 0 || tokenOffset < 0) {
    throw new Error(`Fixture marker '${carrier}' / '${token}' was not found.`);
  }
  return carrierOffset + tokenOffset;
}

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
