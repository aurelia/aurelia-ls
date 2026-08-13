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
const fixtureRuntimes = new Map();

const catalogRow = semanticAppQueryCatalogRow(SemanticAppQueryKind.AttributeInterpretationExplanation);
check(catalogRow.group === 'template', `Expected template group, observed ${catalogRow.group}.`);
check(catalogRow.resultRole === 'cursor-locus', `Expected cursor-locus result, observed ${catalogRow.resultRole}.`);
check(catalogRow.requiresCursor, 'Expected attribute interpretation explanation to require a cursor.');
check(!catalogRow.supportsPaging && !catalogRow.supportsDetail, 'Expected V1 attribute explanation to reject paging and detail.');
check(catalogRow.minimumAnalysisDepth === 'runtime-topology', `Expected runtime-topology depth, observed ${catalogRow.minimumAnalysisDepth}.`);
check(catalogRow.materializationPolicy === 'projection-only', `Expected projection-only query, observed ${catalogRow.materializationPolicy}.`);

const exactCursor = cursor(exactPath, tokenOffset(exactText, 'click.trigger="save()"', 'click.trigger', true));
const shaped = semanticAppQueryCatalogShape({
  kind: SemanticAppQueryKind.AttributeInterpretationExplanation,
  cursor: exactCursor,
  resourceIdentityKey: 'must-not-be-consumed',
});
check(shaped.cursor?.offset === exactCursor.offset, 'Expected catalog shape to retain the exact cursor.');
check(shaped.resourceIdentityKey == null, 'Expected V1 catalog shape to drop unrelated resource identity choreography.');
check(
  unsupportedSemanticAppQuerySelectorFields({
    kind: SemanticAppQueryKind.AttributeInterpretationExplanation,
    cursor: exactCursor,
    resourceIdentityKey: 'must-not-be-consumed',
  }).includes('resourceIdentityKey'),
  'Expected V1 attribute explanation to reject a resource identity selector.',
);
check(
  unsupportedSemanticAppQuerySelectorFields({
    kind: SemanticAppQueryKind.AttributeInterpretationExplanation,
    cursor: exactCursor,
    detail: 'handles',
  }).includes('detail'),
  'Expected V1 attribute explanation to reject handle detail.',
);
check(
  semanticAppQueryKey({ kind: SemanticAppQueryKind.AttributeInterpretationExplanation, cursor: exactCursor })
    !== semanticAppQueryKey({
      kind: SemanticAppQueryKind.AttributeInterpretationExplanation,
      cursor: { ...exactCursor, offset: exactCursor.offset + 1 },
    }),
  'Expected exact cursor position to participate in query identity.',
);

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'attribute-interpretation-explanation',
});

const instructionBacked = await explain(runtime, exactPath, exactCursor.offset);
checkExact(instructionBacked, 'instruction-backed', 'complete', 'listener');
const instructionExplanation = instructionBacked.value.explanation;
check(instructionExplanation?.subject.rawName === 'click.trigger', 'Expected the authored raw attribute name.');
check(
  instructionExplanation?.subject.nameSource.start === exactText.indexOf('click.trigger')
  && instructionExplanation?.subject.nameSource.end === exactText.indexOf('click.trigger') + 'click.trigger'.length,
  'Expected subject.nameSource to be the exact authored top-level attribute-name span.',
);
check(
  instructionExplanation?.subject.source.start <= instructionExplanation?.subject.nameSource.start
  && instructionExplanation?.subject.source.end >= instructionExplanation?.subject.nameSource.end,
  'Expected subject.source to retain the whole authored attribute carrier.',
);
const nameStart = instructionExplanation?.subject.nameSource.start;
const nameEnd = instructionExplanation?.subject.nameSource.end;
if (nameStart != null && nameEnd != null) {
  const atNameStart = await explain(runtime, exactPath, nameStart);
  const atNameEnd = await explain(runtime, exactPath, nameEnd);
  const pastNameEnd = await explain(runtime, exactPath, nameEnd + 1);
  check(
    atNameStart.selection === 'exact'
    && atNameStart.value.explanation?.subject.subjectKey === instructionExplanation.subject.subjectKey,
    'Expected the inclusive nameSource.start boundary to select the same exact attribute.',
  );
  check(
    atNameEnd.selection === 'exact'
    && atNameEnd.value.explanation?.subject.subjectKey === instructionExplanation.subject.subjectKey,
    'Expected the repository-wide inclusive nameSource.end boundary to select the same exact attribute.',
  );
  check(
    pastNameEnd.selection === 'absent' && pastNameEnd.value.explanation === null,
    'Expected the first offset past nameSource.end to select no attribute-name explanation.',
  );
}
check(
  instructionExplanation?.evidence.syntax.target === 'click'
  && instructionExplanation?.evidence.syntax.command === 'trigger'
  && instructionExplanation?.evidence.classification?.classificationKind === 'binding-command',
  'Expected exact syntax and classification carriers to be projected without reparsing.',
);
check(
  instructionExplanation?.evidence.effects.some((effect) =>
    effect.kind === 'listen'
    && effect.instructionKind === 'listener-binding'
    && /listens for click/.test(effect.summary)
  ) === true,
  'Expected a typed listener instruction to project to an author-facing listen effect.',
);
check(
  instructionExplanation?.evidence.lowerings.every((lowering) =>
    lowering.effectIndexes.every((index) => index >= 0 && index < instructionExplanation.evidence.effects.length)
  ) === true,
  'Expected lowering effect indexes to address only returned effect rows.',
);
check(
  instructionExplanation?.uncertainty.state === 'closed'
  && instructionExplanation.currentness.authority === 'answer-analysis-basis'
  && instructionBacked.analysisBasis != null,
  'Expected closed uncertainty with answer-envelope currentness authority.',
);
check((instructionExplanation?.nextSteps.length ?? 99) <= 3, 'Expected no more than three engine-authored next steps.');
check(
  instructionExplanation?.nextSteps[0]?.kind === 'inspect-source'
  && instructionExplanation.nextSteps[0].label === 'Inspect the selected trigger binding-command declaration.'
  && instructionExplanation.nextSteps[0].source?.kind === 'external-address',
  'Expected the most specific selected command source to precede requery guidance.',
);
check(
  instructionBacked.continuations?.some((row) => row.targetQueryKind === SemanticAppQueryKind.TemplateCursorInfo) === true
  && instructionBacked.continuations?.some((row) => row.targetQueryKind === SemanticAppQueryKind.TemplateCompilations) === true,
  'Expected typed continuations to cursor context and compiled template rows.',
);

const propertyBinding = await explain(
  runtime,
  exactPath,
  tokenOffset(exactText, 'value.to-view="name"', 'value.to-view', true),
);
checkExact(propertyBinding, 'instruction-backed', 'complete', 'property binding');
check(
  propertyBinding.value.explanation?.evidence.syntax.target === 'value'
  && propertyBinding.value.explanation?.evidence.syntax.command === 'to-view'
  && propertyBinding.value.explanation?.evidence.effects.some((effect) =>
    effect.kind === 'bind-property' && effect.instructionKind === 'property-binding'
  ) === true,
  'Expected value.to-view syntax to retain its parsed target/command and property-binding effect.',
);

const plain = await explain(
  runtime,
  exactPath,
  tokenOffset(exactText, 'href="#"', 'href', true),
);
checkExact(plain, 'plain-attribute', 'complete', 'plain HTML');
check(
  plain.value.explanation?.evidence.classification?.classificationKind === 'plain'
  && plain.value.explanation?.evidence.effects.length === 0,
  'Expected an ordinary HTML attribute to remain a queryable exact answer without invented runtime effects.',
);

const valueCursor = await explain(
  runtime,
  exactPath,
  tokenOffset(exactText, 'click.trigger="save()"', 'save()', true),
);
check(
  valueCursor.selection === 'absent'
  && valueCursor.value.explanation === null
  && valueCursor.value.contenders.length === 0,
  'Expected a cursor in the authored value to select no attribute-name explanation.',
);

const ambiguous = await explain(
  runtime,
  sharedPath,
  tokenOffset(sharedText, 'value.bind="sharedName"', 'value.bind', true),
);
check(
  ambiguous.selection === 'ambiguous'
  && ambiguous.value.explanation === null
  && ambiguous.value.contenders.length === 2
  && new Set(ambiguous.value.contenders.map((contender) => contender.subject.subjectKey)).size === 2
  && ambiguous.value.contenders.every((contender) => contender.subject.nameSource.path === sharedPath),
  'Expected opposing compiler scopes to remain typed ambiguity with distinct public-safe subject reproof keys.',
);

const errorFixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-compiler-errors');
const errorPath = 'src/template-compiler-errors-app.html';
const errorText = fs.readFileSync(path.join(errorFixtureRoot, errorPath), 'utf8');
const errorRuntime = await createSemanticRuntime({
  workspaceRoot: errorFixtureRoot,
  storeKey: 'attribute-interpretation-explanation:errors',
});
const invalid = await explain(
  errorRuntime,
  errorPath,
  tokenOffset(errorText, 'template-probe="value.bind: enabled; missing.bind: enabled"', 'template-probe', true),
);
checkExact(invalid, 'invalid', 'complete', 'invalid inline multi-binding carrier');
check(
  invalid.value.explanation?.evidence.issues.some((issue) => issue.issueKind === 'binding-to-non-bindable') === true,
  'Expected a closed exact compiler issue to explain the invalid top-level attribute carrier.',
);
const secondarySegment = await explain(
  errorRuntime,
  errorPath,
  tokenOffset(errorText, 'template-probe="value.bind: enabled; missing.bind: enabled"', 'missing.bind', true),
);
check(
  secondarySegment.selection === 'absent' && secondarySegment.value.explanation === null,
  'Expected a secondary inline multi-binding AttrSyntax name to stay outside the V1 top-level cursor boundary.',
);

const hostileSpecifications = [
  {
    fixture: 'template-controller-built-ins',
    filePath: 'src/template-controller-built-ins-app.html',
    carrier: 'repeat.for=',
    token: 'repeat.for',
    conclusion: 'instruction-backed',
    coverage: 'complete',
    classification: 'template-controller',
    effectKinds: ['iterate', 'control-view'],
    definitionName: 'template-controller-built-ins-app',
    label: 'repeat controlled view',
  },
  {
    fixture: 'template-spread-capture-semantics',
    filePath: 'src/template-spread-capture-semantics-app.html',
    carrier: 'data-note="clean-captured-note"',
    token: 'data-note',
    conclusion: 'captured',
    coverage: 'complete',
    classification: 'captured',
    effectKinds: [],
    definitionName: 'template-spread-capture-semantics-app',
    label: 'captured plain attribute',
  },
  {
    fixture: 'resource-registration-lab',
    filePath: 'src/resource-lab-app.html',
    carrier: 'as-element="decorator-card"',
    token: 'as-element',
    conclusion: 'compiler-control',
    coverage: 'complete',
    classification: 'compiler-control',
    effectKinds: [],
    definitionName: 'resource-lab-app',
    label: 'as-element compiler control',
  },
  {
    fixture: 'resource-registration-lab',
    filePath: 'src/resource-lab-app.html',
    carrier: 'static-flag.bind="isActive"',
    token: 'static-flag.bind',
    conclusion: 'instruction-backed',
    coverage: 'complete',
    classification: 'custom-attribute',
    effectKinds: ['hydrate-attribute'],
    definitionName: 'resource-lab-app',
    label: 'static custom attribute',
  },
  {
    fixture: 'registered-plugin-capabilities',
    filePath: 'src/registered-plugin-capabilities-app.html',
    carrier: 't.bind="titleKey"',
    token: 't.bind',
    conclusion: 'instruction-backed',
    coverage: 'complete',
    classification: 'binding-command',
    effectKinds: ['translate'],
    definitionName: 'registered-plugin-capabilities-app',
    label: 'i18n plugin instruction',
  },
  {
    fixture: 'resource-registration-effective-definitions',
    filePath: 'src/effective-definitions-app.html',
    carrier: 'value.shared="message"',
    token: 'value.shared',
    conclusion: 'open',
    coverage: 'open',
    classification: 'binding-command',
    effectKinds: [],
    definitionName: 'effective-definitions-app',
    label: 'opaque custom binding command',
  },
  {
    fixture: 'template-local-template-semantics',
    filePath: 'src/template-local-template-semantics-app.html',
    carrier: 'note.bind="toViewValue"',
    token: 'note.bind',
    conclusion: 'instruction-backed',
    coverage: 'complete',
    classification: 'bindable',
    effectKinds: ['bind-property'],
    definitionName: 'mode-panel',
    label: 'recursive local-template bindable',
  },
];
const hostileAnswers = [];
for (const specification of hostileSpecifications) {
  const fixtureAnswer = await explainFixture(specification);
  hostileAnswers.push(fixtureAnswer);
  checkExact(fixtureAnswer, specification.conclusion, specification.coverage, specification.label);
  const explanation = fixtureAnswer.value.explanation;
  check(
    explanation?.subject.definitionName === specification.definitionName,
    `Expected ${specification.label} to select ${specification.definitionName}, observed ${explanation?.subject.definitionName ?? '<none>'}.`,
  );
  check(
    explanation?.evidence.classification?.classificationKind === specification.classification,
    `Expected ${specification.label} classification ${specification.classification}, observed ${explanation?.evidence.classification?.classificationKind ?? '<none>'}.`,
  );
  for (const effectKind of specification.effectKinds) {
    check(
      explanation?.evidence.effects.some((effect) => effect.kind === effectKind) === true,
      `Expected ${specification.label} to retain ${effectKind} effect evidence.`,
    );
  }
}

const repeat = hostileAnswers[0];
check(
  repeat?.value.explanation?.evidence.effects.some((effect) => effect.instructionKind === 'iterator-binding') === true
  && repeat.value.explanation.evidence.effects.some((effect) => effect.instructionKind === 'hydrate-template-controller') === true,
  'Expected repeat.for to retain both iterator work and nested-view control.',
);
const captured = hostileAnswers[1];
check(
  captured?.value.explanation?.conclusion.kind === 'captured'
  && /captures data-note/.test(captured.value.explanation.conclusion.title),
  'Expected capture-handle evidence to produce author-facing capture prose.',
);
const compilerControl = hostileAnswers[2];
check(
  compilerControl?.value.explanation?.evidence.effects.length === 0
  && /compiler control/.test(compilerControl.value.explanation.conclusion.title),
  'Expected as-element to close as compiler control without inventing a runtime instruction.',
);
const staticAttribute = hostileAnswers[3];
check(
  staticAttribute?.value.explanation?.evidence.classification?.resourceName === 'static-flag'
  && staticAttribute.value.explanation.evidence.effects.some((effect) => effect.instructionKind === 'hydrate-attribute'),
  'Expected the static custom attribute to retain its selected resource and hydration instruction.',
);
const plugin = hostileAnswers[4];
check(
  plugin?.value.explanation?.evidence.effects.some((effect) => effect.instructionKind === 'translation-bind-binding') === true,
  'Expected the registered i18n command to retain its extension instruction kind.',
);
const opaqueCommand = hostileAnswers[5];
check(
  opaqueCommand?.value.explanation?.uncertainty.state === 'open'
  && opaqueCommand.value.explanation.uncertainty.reasons.includes('binding-command-lowering-open')
  && opaqueCommand.value.explanation.evidence.lowerings.some((lowering) =>
    lowering.commandName === 'shared'
    && lowering.state === 'open'
    && /executable body/.test(lowering.message ?? '')
  )
  && opaqueCommand.value.explanation.evidence.blockers.some((blocker) => blocker.kind === 'open-lowering'),
  'Expected an opaque custom command to retain typed open lowering evidence and blocker prose.',
);
const localTemplate = hostileAnswers[6];
check(
  localTemplate?.value.explanation?.subject.definitionName === 'mode-panel'
  && localTemplate.value.explanation.nextSteps[0]?.kind === 'inspect-source'
  && localTemplate.value.explanation.nextSteps[0].label === 'Inspect the selected note bindable declaration.',
  'Expected recursive local-template selection and its exact selected bindable source to remain first-class.',
);

const removedCommand = await explain(
  errorRuntime,
  errorPath,
  tokenOffset(errorText, 'click.delegate="enabled = !enabled"', 'click.delegate', true),
);
checkExact(removedCommand, 'invalid', 'open', 'removed v1 delegate command');
check(
  removedCommand.value.explanation?.evidence.issues.some((issue) => issue.issueKind === 'unknown-binding-command') === true
  && removedCommand.value.explanation.evidence.classification?.classificationKind === 'open'
  && removedCommand.value.explanation.uncertainty.reasons.includes('attribute-classification-open'),
  'Expected removed v1 delegate syntax to retain its exact closed compiler issue and open recovery classification.',
);

const truncatedRuntime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'attribute-interpretation-explanation:truncated',
  projects: [{
    rootDir: fixtureRoot,
    projectKey: 'attribute-interpretation-explanation-truncated',
    sourceDiscoveryOptions: { maxFiles: 2 },
  }],
});
const truncated = await explain(truncatedRuntime, exactPath, exactCursor.offset);
check(
  truncated.selection === 'exact'
  && truncated.coverage === 'truncated'
  && truncated.value.explanation?.uncertainty.state === 'truncated'
  && truncated.value.explanation.uncertainty.reasons.includes('source-discovery-truncated'),
  'Expected real source-discovery guardrail pressure to retain exact selection with typed truncated uncertainty.',
);

for (const result of [
  instructionBacked,
  propertyBinding,
  plain,
  valueCursor,
  ambiguous,
  invalid,
  secondarySegment,
  ...hostileAnswers,
  removedCommand,
  truncated,
]) {
  const serialized = JSON.stringify(result);
  check(typeof serialized === 'string', 'Expected generic app-query/MCP JSON compatibility.');
  check(!/\b(?:omitted|ignored)\b/i.test(serialized), 'Expected no omitted/ignored inference in the public answer.');
  check(result.value.explanation?.nextSteps.length == null || result.value.explanation.nextSteps.length <= 3, 'Expected every exact answer to cap next steps at three.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      catalog: catalogRow.queryKind,
      instructionBacked: instructionExplanation?.evidence.effects.map((effect) => effect.kind),
      plain: plain.value.explanation?.conclusion.kind,
      value: valueCursor.selection,
      ambiguousContenders: ambiguous.value.contenders.length,
      invalidIssues: invalid.value.explanation?.evidence.issues.map((issue) => issue.issueKind),
      secondary: secondarySegment.selection,
      hostile: hostileSpecifications.map((specification, index) => ({
        label: specification.label,
        conclusion: hostileAnswers[index]?.value.explanation?.conclusion.kind,
      })),
      removedCommand: removedCommand.value.explanation?.evidence.issues.map((issue) => issue.issueKind),
      truncated: truncated.value.explanation?.uncertainty.state,
    },
  }, null, 2));
}

async function explain(targetRuntime, filePath, cursorOffset) {
  return targetRuntime.answerAppQuery({
    kind: SemanticAppQueryKind.AttributeInterpretationExplanation,
    cursor: cursor(filePath, cursorOffset),
    appRetention: 'retain-app',
  });
}

async function explainFixture(specification) {
  let fixture = fixtureRuntimes.get(specification.fixture);
  if (fixture == null) {
    const root = path.join(packageRoot, 'fixtures/pressure', specification.fixture);
    fixture = {
      root,
      runtime: await createSemanticRuntime({
        workspaceRoot: root,
        storeKey: `attribute-interpretation-explanation:${specification.fixture}`,
      }),
      texts: new Map(),
    };
    fixtureRuntimes.set(specification.fixture, fixture);
  }
  let text = fixture.texts.get(specification.filePath);
  if (text == null) {
    text = fs.readFileSync(path.join(fixture.root, specification.filePath), 'utf8');
    fixture.texts.set(specification.filePath, text);
  }
  return explain(
    fixture.runtime,
    specification.filePath,
    tokenOffset(text, specification.carrier, specification.token, true),
  );
}

function checkExact(answer, conclusionKind, coverage, label) {
  check(answer.selection === 'exact', `Expected exact ${label} selection, observed ${answer.selection}.`);
  check(answer.coverage === coverage, `Expected ${coverage} ${label} coverage, observed ${answer.coverage}.`);
  check(answer.value.explanation?.conclusion.kind === conclusionKind, `Expected ${conclusionKind} ${label} conclusion, observed ${answer.value.explanation?.conclusion.kind ?? '<none>'}.`);
  check(answer.value.contenders.length === 1, `Expected one ${label} contender, observed ${answer.value.contenders.length}.`);
}

function cursor(filePath, offset) {
  return { filePath, line: 0, character: 0, offset };
}

function tokenOffset(text, carrier, token, midpoint = false) {
  const carrierOffset = text.indexOf(carrier);
  const tokenOffset = carrier.indexOf(token);
  if (carrierOffset < 0 || tokenOffset < 0) {
    throw new Error(`Fixture marker '${carrier}' / '${token}' was not found.`);
  }
  return carrierOffset + tokenOffset + (midpoint ? Math.floor(token.length / 2) : 0);
}

function check(condition, message) {
  if (!condition) failures.push(message);
}
