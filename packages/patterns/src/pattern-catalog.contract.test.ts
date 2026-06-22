import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {
  aureliaPatternExamples,
  getAureliaPatternExample,
  listAureliaPatternMenuItems,
  searchAureliaPatternMenuItems
} from './pattern-catalog.js';
import {
  aureliaPatternAdmissionRecords,
  aureliaPatternEvidenceProfiles,
  getPatternAdmissionRecord,
  getPatternEvidenceProfile
} from './curation/index.js';

const patternIdPattern = /^[a-z]+(?:\.[a-z0-9-]+)+$/;

const expectedPatternKeys = [
  'adaptation',
  'guidance',
  'patternId',
  'source',
  'support',
  'title'
];

const expectedGuidanceKeys = ['summary', 'whenNotToUse', 'whenToUse'];
const expectedAdaptationKeys = ['assumptions', 'handoffNotes'];
const expectedSupportKeys = new Set(['followUp', 'refs']);
const maxGuidanceSummaryLength = 180;
const maxGuidanceBulletLength = 170;
const maxAssumptionLength = 170;
const maxHandoffSummaryLength = 110;
const maxHandoffActionLength = 160;
const maxFollowUpReasonLength = 160;
const allowedFollowUpTools = new Set([
  'aurelia_app_query',
  'aurelia_diagnostic_overview',
  'aurelia_router_overview',
  'aurelia_template_diagnostics'
]);
const allowedFollowUpQueryKinds = new Set([
  'binding-data-flow-summary',
  'binding-observed-dependency-summary',
  'binding-value-channel-summary',
  'typescript-diagnostic-summary'
]);
const oldAppBuilderTerms = [
  'app-builder',
  'SourcePlan',
  'source-lowering',
  'targetCatalog',
  'inputReadiness',
  'policyDetail',
  'recommendationPolicy'
];
const publicRecommendationDriftTerms = [
  'router-direct',
  'EventAggregator',
  'callback bindable',
  'callback bindables',
  'callback or two-way bindables'
];
const metadataDriftTerms = [
  'domain model',
  'policy axes',
  'target catalog',
  'input-readiness',
  'source-lowering preflight',
  'verification stamp',
  'verified stamp',
  'fixer wrapper'
];
const handoffContinuationTerms = [
  'semantic-runtime',
  'diagnostic',
  'diagnostics',
  'aurelia_app_query',
  'aurelia_diagnostic_overview',
  'aurelia_router_overview',
  'aurelia_template_diagnostics',
  'support.followup',
  'querykind',
  'verification'
];
const patternSearchStopWords = new Set([
  'a',
  'an',
  'and',
  'for',
  'from',
  'in',
  'of',
  'on',
  'the',
  'to',
  'with',
]);

test('public pattern menu is compact and backed by examples', () => {
  const menu = listAureliaPatternMenuItems();

  assert.equal(menu.length, aureliaPatternExamples.length);
  assert.deepEqual(
    menu.map((item) => item.patternId),
    aureliaPatternExamples.map((pattern) => pattern.patternId)
  );

  for (const item of menu) {
    assert.deepEqual(Object.keys(item).sort(), ['patternId', 'summary', 'title']);
    assert.match(item.patternId, patternIdPattern);
    assert.equal(getAureliaPatternExample(item.patternId)?.title, item.title);
  }
});

test('public pattern search accepts caller-shaped authoring phrases', () => {
  const cases = [
    ['server pagination', 'collection.server-query'],
    ['server filter sort', 'collection.server-query'],
    ['server query state', 'collection.server-query'],
    ['simple form submit', 'form.native-submit'],
    ['native form validation', 'form.native-submit'],
    ['validation', 'form.validation-submit'],
    ['form validation', 'form.validation-submit'],
    ['cross field validation', 'form.validation-submit'],
    ['server validation', 'form.server-validation-errors'],
    ['api field errors', 'form.server-validation-errors'],
    ['select radio checkbox', 'form.choice-controls'],
    ['shared state between sibling components', 'service.injected-state'],
    ['component communication', 'service.injected-state'],
    ['child emits event', 'component.custom-event'],
    ['child to parent', 'component.custom-event'],
    ['emit event to parent', 'component.custom-event'],
    ['pass data to child component', 'component.bindable-basic'],
    ['slots layout', 'component.slotted-layout'],
    ['active link', 'router.active-navigation'],
    ['dirty form leave page', 'router.can-unload-dirty-form'],
    ['auth guard', 'router.auth-session-guard'],
    ['protected route', 'router.auth-session-guard'],
    ['fetch data from api', 'service.fetch-client'],
    ['http interceptor', 'service.fetch-interceptor'],
    ['cancel stale request', 'service.fetch-cancellation'],
    ['cache fetch response', 'service.fetch-cache-policy'],
    ['virtual repeat', 'collection.virtual-repeat'],
    ['virtualization', 'collection.virtual-repeat'],
    ['toast overlay', 'template.portal-overlay'],
    ['portal notification overlay', 'template.portal-overlay'],
    ['modal dialog', 'dialog.confirm-edit'],
    ['confirm delete dialog', 'dialog.confirm-edit'],
    ['debounce input', 'template.debounced-input'],
    ['throttle click', 'template.throttled-event'],
    ['promise loading error', 'template.promise-secondary'],
    ['dom ref', 'template.dom-ref'],
    ['focus input', 'template.focus-control'],
    ['i18n', 'localization.i18n-locale-service'],
    ['internationalization', 'localization.i18n-locale-service'],
    ['locale switcher', 'localization.i18n-locale-service'],
    ['route params', 'router.route-parameters'],
    ['route parameters', 'router.route-parameters'],
    ['getRouteParameters', 'router.route-parameters'],
  ] as const;

  for (const [query, expectedPatternId] of cases) {
    const matches = searchAureliaPatternMenuItems(query);
    assert.ok(
      matches.some((item) => item.patternId === expectedPatternId),
      `Pattern search for "${query}" should include ${expectedPatternId}; got ${matches.map((item) => item.patternId).join(', ')}`
    );
    assert.deepEqual(
      Object.keys(matches[0] ?? {}).sort(),
      ['patternId', 'summary', 'title'],
      `Pattern search rows should stay compact for "${query}"`
    );
  }

  const childToParent = searchAureliaPatternMenuItems('child to parent');
  assert.equal(childToParent[0]?.patternId, 'component.custom-event');
  assert.ok(childToParent.length <= 5, 'child-to-parent search should stay focused');
  assert.equal(searchAureliaPatternMenuItems('to').length, 0, 'stopword-only searches should not return noisy pattern rows');

  for (const query of [
    'EventAggregator',
    'callback bindable',
    'router-direct',
    'state store',
  ]) {
    assert.equal(
      searchAureliaPatternMenuItems(query).length,
      0,
      `Pattern search for non-default or excluded "${query}" should not produce a public recommendation`
    );
  }
});

test('public pattern search ranks exact ids and titles first', () => {
  for (const pattern of aureliaPatternExamples) {
    for (const query of [
      pattern.patternId,
      pattern.title,
      patternTitleTailQuery(pattern.title),
    ]) {
      const matches = searchAureliaPatternMenuItems(query);
      assert.equal(
        matches[0]?.patternId,
        pattern.patternId,
        `Pattern search for "${query}" should rank ${pattern.patternId} first; got ${matches.map((item) => item.patternId).join(', ')}`
      );
    }
  }
});

test('public pattern examples keep the compact contract shape', () => {
  const ids = new Set<string>();

  for (const pattern of aureliaPatternExamples) {
    assert.match(pattern.patternId, patternIdPattern);
    assert.equal(ids.has(pattern.patternId), false, `duplicate pattern id: ${pattern.patternId}`);
    ids.add(pattern.patternId);

    assert.deepEqual(Object.keys(pattern).sort(), expectedPatternKeys);
    assert.deepEqual(Object.keys(pattern.guidance).sort(), expectedGuidanceKeys);
    assert.deepEqual(Object.keys(pattern.adaptation).sort(), expectedAdaptationKeys);
    assert.ok(
      Object.keys(pattern.support).every((key) => expectedSupportKeys.has(key)),
      `${pattern.patternId} support leaked an unsupported key`
    );

    assert.ok(pattern.title.length > 0);
    assert.ok(pattern.guidance.summary.length > 0);
    assert.ok(
      pattern.guidance.summary.length <= maxGuidanceSummaryLength,
      `${pattern.patternId} guidance summary is too long for a public menu-adjacent payload`
    );
    assert.ok(pattern.guidance.whenToUse.length > 0);
    assert.ok(pattern.guidance.whenNotToUse.length > 0);
    assert.ok(pattern.guidance.whenToUse.length <= 4);
    assert.ok(pattern.guidance.whenNotToUse.length <= 4);
    for (const item of [...pattern.guidance.whenToUse, ...pattern.guidance.whenNotToUse]) {
      assert.ok(
        item.length <= maxGuidanceBulletLength,
        `${pattern.patternId} guidance bullet is too long for quick caller selection: ${item}`
      );
    }

    assert.ok(pattern.source.files.length > 0);
    for (const file of pattern.source.files) {
      assert.deepEqual(Object.keys(file).sort(), ['contents', 'language', 'path']);
      assert.ok(file.path.length > 0);
      assert.ok(isSafePatternFilePath(file.path), `${pattern.patternId} has unsafe source file path ${file.path}`);
      assert.ok(file.language.length > 0);
      assert.ok(file.contents.trim().length > 0);
    }

    assert.ok(pattern.adaptation.assumptions.length > 0);
    assert.ok(pattern.adaptation.assumptions.length <= 3);
    for (const assumption of pattern.adaptation.assumptions) {
      assert.deepEqual(Object.keys(assumption).sort(), ['summary']);
      assert.ok(assumption.summary.length > 0);
      assert.ok(
        assumption.summary.length <= maxAssumptionLength,
        `${pattern.patternId} assumption is too long for review: ${assumption.summary}`
      );
    }

    assert.ok(pattern.adaptation.handoffNotes.length > 0);
    assert.ok(pattern.adaptation.handoffNotes.length <= 3);
    for (const handoffNote of pattern.adaptation.handoffNotes) {
      assert.deepEqual(Object.keys(handoffNote).sort(), ['action', 'summary']);
      assert.ok(handoffNote.summary.length > 0);
      assert.ok(handoffNote.action.length > 0);
      assert.ok(
        handoffNote.summary.length <= maxHandoffSummaryLength,
        `${pattern.patternId} handoff summary is too long for review: ${handoffNote.summary}`
      );
      assert.ok(
        handoffNote.action.length <= maxHandoffActionLength,
        `${pattern.patternId} handoff action is too long for review: ${handoffNote.action}`
      );
    }

    assert.ok(pattern.support.followUp !== undefined);
    assert.ok(pattern.support.followUp.length > 0);
    assert.ok(pattern.support.followUp.length <= 3);
    for (const followUp of pattern.support.followUp) {
      assert.deepEqual(
        Object.keys(followUp).sort(),
        followUp.queryKind === undefined ? ['reason', 'tool'] : ['queryKind', 'reason', 'tool']
      );
      assert.ok(allowedFollowUpTools.has(followUp.tool), `${pattern.patternId} has unsupported follow-up tool ${followUp.tool}`);
      assert.ok(followUp.reason.length > 0);
      assert.ok(
        followUp.reason.length <= maxFollowUpReasonLength,
        `${pattern.patternId} follow-up reason is too long for quick continuation selection: ${followUp.reason}`
      );
      if (followUp.queryKind !== undefined) {
        assert.equal(followUp.tool, 'aurelia_app_query');
        assert.ok(
          allowedFollowUpQueryKinds.has(followUp.queryKind),
          `${pattern.patternId} has unsupported follow-up queryKind ${followUp.queryKind}`
        );
      }
    }

    if (pattern.support.refs !== undefined) {
      for (const ref of pattern.support.refs) {
        assert.deepEqual(Object.keys(ref).sort(), ['title', 'url']);
        assert.ok(ref.title.length > 0);
        assert.match(ref.url, /^https:\/\/docs\.aurelia\.io\//);
      }
    }
  }
});

test('public pattern follow-ups stay semantic-runtime hints', () => {
  const followUps = aureliaPatternExamples.flatMap((pattern) => pattern.support.followUp ?? []);
  const tools = new Set(followUps.map((followUp) => followUp.tool));
  const queryKinds = new Set(
    followUps
      .map((followUp) => followUp.queryKind)
      .filter((queryKind): queryKind is string => queryKind !== undefined)
  );

  assert.ok(tools.has('aurelia_diagnostic_overview'));
  assert.ok(tools.has('aurelia_template_diagnostics'));
  assert.ok(tools.has('aurelia_router_overview'));
  assert.ok(tools.has('aurelia_app_query'));
  assert.ok(queryKinds.has('binding-data-flow-summary'));
  assert.ok(queryKinds.has('binding-value-channel-summary'));
  assert.ok(queryKinds.has('binding-observed-dependency-summary'));
  assert.ok(queryKinds.has('typescript-diagnostic-summary'));
});

test('assumptions and handoff notes stay compact, specific, and internally coherent', () => {
  for (const pattern of aureliaPatternExamples) {
    const assumptions = pattern.adaptation.assumptions.map((assumption) => assumption.summary);
    const handoffSummaries = pattern.adaptation.handoffNotes.map((handoffNote) => handoffNote.summary);
    const handoffActions = pattern.adaptation.handoffNotes.map((handoffNote) => handoffNote.action);
    const serialized = JSON.stringify(pattern.adaptation);

    assert.equal(assumptions.length, 3, `${pattern.patternId} should carry exactly three assumptions`);
    assert.equal(handoffSummaries.length, 3, `${pattern.patternId} should carry exactly three handoff notes`);
    assertNoDuplicateText(assumptions, `${pattern.patternId} assumptions`);
    assertNoDuplicateText(handoffSummaries, `${pattern.patternId} handoff summaries`);

    for (const assumption of assumptions) {
      assert.ok(assumption.length >= 16, `${pattern.patternId} has an underspecified assumption: ${assumption}`);
      assert.match(assumption, /\.$/, `${pattern.patternId} assumption should read as a reviewable sentence: ${assumption}`);
    }

    for (let index = 0; index < pattern.adaptation.handoffNotes.length; index += 1) {
      const handoffNote = pattern.adaptation.handoffNotes[index]!;
      assert.match(
        handoffNote.summary,
        /\.$/,
        `${pattern.patternId} handoff summary should read as a reviewable sentence: ${handoffNote.summary}`
      );
      assert.ok(
        handoffNote.action.length > handoffNote.summary.length,
        `${pattern.patternId} handoff action ${index + 1} should add actionable detail`
      );
      assert.notEqual(
        normalizeReviewText(handoffNote.action),
        normalizeReviewText(handoffNote.summary),
        `${pattern.patternId} handoff action ${index + 1} repeats its summary`
      );
    }

    for (const term of metadataDriftTerms) {
      assert.equal(
        serialized.includes(term),
        false,
        `${pattern.patternId} adaptation metadata leaked old planning term ${term}`
      );
    }

    const lowerSerialized = serialized.toLowerCase();
    for (const term of handoffContinuationTerms) {
      assert.equal(
        lowerSerialized.includes(term),
        false,
        `${pattern.patternId} adaptation metadata leaked continuation/verification term ${term}; use support.followUp instead`
      );
    }
  }
});

test('public docs refs point at each pattern evidence profile', () => {
  for (const pattern of aureliaPatternExamples) {
    const profile = getPatternEvidenceProfile(pattern.patternId);
    assert.ok(profile !== undefined, `${pattern.patternId} is missing an evidence profile`);
    const evidencePaths = new Set(profile.documents.map((document) => document.relativePath));

    for (const ref of pattern.support.refs ?? []) {
      const candidatePaths = officialDocsUrlToCandidateDocumentPaths(ref.url);
      assert.ok(
        candidatePaths.some((candidatePath) => evidencePaths.has(candidatePath)),
        `${pattern.patternId} ref ${ref.url} does not point at its evidence profile`
      );
    }
  }
});

test('public examples do not expose old app-builder algebra', () => {
  for (const pattern of aureliaPatternExamples) {
    const serialized = JSON.stringify(pattern);

    for (const term of oldAppBuilderTerms) {
      assert.equal(
        serialized.includes(term),
        false,
        `${pattern.patternId} leaked old public app-builder term ${term}`
      );
    }
  }
});

function officialDocsUrlToCandidateDocumentPaths(url: string): readonly string[] {
  const parsed = new URL(url);
  assert.equal(parsed.origin, 'https://docs.aurelia.io');
  const pathName = decodeURIComponent(parsed.pathname).replace(/^\/+|\/+$/g, '');
  if (pathName.length === 0) {
    return ['README.md'];
  }
  return [`${pathName}.md`, `${pathName}/README.md`];
}

function assertNoDuplicateText(values: readonly string[], label: string): void {
  const normalized = values.map(normalizeReviewText);
  assert.equal(
    new Set(normalized).size,
    normalized.length,
    `${label} should not contain duplicate rows`
  );
}

function normalizeReviewText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

test('public examples preserve the current component-communication canon', () => {
  for (const pattern of aureliaPatternExamples) {
    const serialized = JSON.stringify(pattern);

    for (const term of publicRecommendationDriftTerms) {
      assert.equal(
        serialized.includes(term),
        false,
        `${pattern.patternId} leaked public recommendation drift term ${term}`
      );
    }
  }

  const outputPattern = getAureliaPatternExample('component.custom-event');
  assert.ok(outputPattern !== undefined);

  const outputGuidance = JSON.stringify(outputPattern);
  assert.match(outputGuidance, /injected state\/service|injected service|DI service/);
  assert.match(outputGuidance, /shared feature/);
});

test('advanced resource examples model lifecycle cleanup explicitly', () => {
  const templateController = getAureliaPatternExample('resource.template-controller');
  assert.ok(templateController !== undefined);

  const source = templateController.source.files.map((file) => file.contents).join('\n');
  assert.match(source, /deactivate\(/);
  assert.match(source, /\.dispose\(\)/);
});

test('admission records and evidence profiles cover the public catalog exactly', () => {
  const patternIds = aureliaPatternExamples.map((pattern) => pattern.patternId);
  const admissionIds = aureliaPatternAdmissionRecords.map((record) => record.patternId);
  const profileIds = aureliaPatternEvidenceProfiles.map((profile) => profile.admission.patternId);

  assert.deepEqual(admissionIds, patternIds);
  assert.deepEqual(profileIds, patternIds);

  for (const patternId of patternIds) {
    assert.equal(getPatternAdmissionRecord(patternId)?.patternId, patternId);
    assert.equal(getPatternEvidenceProfile(patternId)?.admission.patternId, patternId);
  }
});

function isSafePatternFilePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.length > 0 &&
    !normalized.includes('\0') &&
    !normalized.includes(':') &&
    !path.posix.isAbsolute(normalized) &&
    !path.win32.isAbsolute(filePath) &&
    !normalized.split('/').includes('..');
}

function patternTitleTailQuery(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 1 && !patternSearchStopWords.has(word))
    .slice(0, 3)
    .join(' ');
}
