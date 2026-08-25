import fs from 'node:fs';
import os from 'node:os';
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
const pressureRoot = path.join(packageRoot, 'fixtures/pressure');
const failures = [];

const catalogRow = semanticAppQueryCatalogRow(SemanticAppQueryKind.ResourceAvailabilityExplanation);
check(catalogRow.group === 'resources', `Expected resources group, observed ${catalogRow.group}.`);
check(catalogRow.resultRole === 'cursor-locus', `Expected cursor-locus result, observed ${catalogRow.resultRole}.`);
check(catalogRow.requiresCursor, 'Expected resource availability explanation to require a cursor.');
check(!catalogRow.supportsPaging && !catalogRow.supportsDetail, 'Expected V1 explanation to reject paging and detail.');
check(!catalogRow.supportsTypeSurfaces, 'Expected V1 explanation not to project TypeChecker resource surfaces.');
check(catalogRow.materializationPolicy === 'projection-only', `Expected projection-only materialization, observed ${catalogRow.materializationPolicy}.`);

const selectorCursor = cursor('src/app.html', 4);
const shaped = semanticAppQueryCatalogShape({
  kind: SemanticAppQueryKind.ResourceAvailabilityExplanation,
  cursor: selectorCursor,
  resourceIdentityKey: 'resource:v1:exact',
  templateResourceScopeIdentityKey: 'scope:v1:exact',
});
check(shaped.cursor?.offset === 4, 'Expected catalog shaping to retain the exact cursor.');
check(shaped.resourceIdentityKey === 'resource:v1:exact', 'Expected catalog shaping to retain the exact resource identity.');
check(shaped.templateResourceScopeIdentityKey === 'scope:v1:exact', 'Expected catalog shaping to retain the exact scope identity.');
check(
  unsupportedSemanticAppQuerySelectorFields({
    kind: SemanticAppQueryKind.ResourceAvailabilityExplanation,
    cursor: selectorCursor,
  }).includes('resourceIdentityKey(required)'),
  'Expected preflight to require an exact resource identity.',
);
check(
  unsupportedSemanticAppQuerySelectorFields({
    kind: SemanticAppQueryKind.ResourceInventory,
    resourceIdentityKey: 'resource:v1:must-not-be-consumed',
  }).includes('resourceIdentityKey'),
  'Expected other query kinds to reject the explanation-only resource selector.',
);
check(
  semanticAppQueryKey({
    kind: SemanticAppQueryKind.ResourceAvailabilityExplanation,
    cursor: selectorCursor,
    resourceIdentityKey: 'resource:v1:first',
    templateResourceScopeIdentityKey: 'scope:v1:first',
  }) !== semanticAppQueryKey({
    kind: SemanticAppQueryKind.ResourceAvailabilityExplanation,
    cursor: selectorCursor,
    resourceIdentityKey: 'resource:v1:second',
    templateResourceScopeIdentityKey: 'scope:v1:first',
  }),
  'Expected exact resource identity to participate in managed-query identity.',
);
check(
  semanticAppQueryKey({
    kind: SemanticAppQueryKind.ResourceAvailabilityExplanation,
    cursor: selectorCursor,
    resourceIdentityKey: 'resource:v1:first',
    templateResourceScopeIdentityKey: 'scope:v1:first',
  }) !== semanticAppQueryKey({
    kind: SemanticAppQueryKind.ResourceAvailabilityExplanation,
    cursor: selectorCursor,
    resourceIdentityKey: 'resource:v1:first',
    templateResourceScopeIdentityKey: 'scope:v1:second',
  }),
  'Expected exact template scope identity to participate in managed-query identity.',
);

const duplicates = await openFixture('resource-registration-duplicates');
const duplicateCursor = fixtureCursor(duplicates, 'src/resource-registration-duplicates-app.html', '<duplicate-card');
const duplicateRows = resourcesNamed(duplicates, 'duplicate-card').sort(byImplementationStart);
check(duplicateRows.length === 2, `Expected two duplicate-card identities, observed ${duplicateRows.length}.`);
const duplicateWinner = await explain(duplicates, duplicateCursor, duplicateRows[0]?.identityKey);
const duplicateLoser = await explain(duplicates, duplicateCursor, duplicateRows[1]?.identityKey);
checkExact(duplicateWinner, 'available', 'complete', 'first duplicate winner');
checkExact(duplicateLoser, 'shadowed', 'complete', 'second duplicate loser');
check(
  duplicateLoser.value.explanation?.evidence.effectiveResource?.identityKey === duplicateRows[0]?.identityKey,
  'Expected shadow evidence to retain the exact winning resource identity.',
);
check(
  duplicateLoser.value.explanation?.conclusion.title.includes('duplicate-card') === true
  && duplicateLoser.value.explanation?.conclusion.explanation.includes('duplicate-card') === true,
  'Expected the visible shadow conclusion to name the exact winner.',
);
check(
  exactSource(duplicateLoser.value.explanation?.evidence.exclusion?.winnerSource)
  && exactSource(duplicateLoser.value.explanation?.evidence.exclusion?.contenderSource),
  'Expected shadow evidence to retain exact winner and loser sources.',
);
check(
  duplicateLoser.value.explanation?.evidence.exclusion?.lookupKeys
    .includes(duplicateRows[1]?.registrationKey) === true,
  'Expected shadow evidence to name the exact losing canonical key.',
);
checkExplanationEnvelope(duplicateWinner, 'duplicate winner');
checkExplanationEnvelope(duplicateLoser, 'duplicate loser');

const selectedDuplicate = await explain(
  duplicates,
  duplicateCursor,
  duplicateRows[1]?.identityKey,
  duplicateWinner.value.explanation?.subject.template.scopeIdentityKey,
);
checkExact(selectedDuplicate, 'shadowed', 'complete', 'explicitly selected duplicate scope');
const staleScope = await explain(duplicates, duplicateCursor, duplicateRows[0]?.identityKey, 'template-resource-scope:v1:stale');
check(staleScope.selection === 'absent' && staleScope.value.explanation === null, 'Expected stale exact scope selection to be absent.');
const nameFallback = await explain(duplicates, duplicateCursor, 'duplicate-card');
check(nameFallback.selection === 'absent', 'Expected a resource name not to fall back to top-level identity lookup.');

const aliasAfterPrimary = requireResource(duplicates, 'alias-after-primary', 'custom-element');
const aliasAfterAnswer = await explain(duplicates, duplicateCursor, aliasAfterPrimary.identityKey);
checkExact(aliasAfterAnswer, 'available', 'complete', 'alias metadata collision with unaffected canonical name');
check(
  aliasAfterPrimary.aliases.some((alias) => alias.name === 'alias-primary'),
  'Expected fixture alias metadata to retain the colliding alias used by the hostile assertion.',
);
const aliasIdentity = aliasAfterPrimary.aliases.find((alias) => alias.name === 'alias-primary')?.identityKey;
const aliasIdentityAnswer = await explain(duplicates, duplicateCursor, aliasIdentity);
check(aliasIdentityAnswer.selection === 'absent', 'Expected an alias child identity not to be accepted as a top-level canonical subject.');
const primaryAfterAlias = await explain(
  duplicates,
  duplicateCursor,
  requireResource(duplicates, 'primary-after-alias', 'custom-element').identityKey,
);
checkExact(primaryAfterAlias, 'shadowed', 'complete', 'canonical name registered after a conflicting alias');

const canonicalLoser = requireResource(duplicates, 'canonical-loser', 'custom-element');
const canonicalAvailability = await templateAvailability(duplicates, duplicateCursor);
check(
  !canonicalAvailability.value.rows.some((row) => row.resource.identityKey === canonicalLoser.identityKey),
  'Expected a custom-element primary collision to skip every declared alias.',
);
const canonicalExplanation = await explain(duplicates, duplicateCursor, canonicalLoser.identityKey);
checkExact(canonicalExplanation, 'shadowed', 'complete', 'canonical loser whose aliases were skipped');
check(
  canonicalExplanation.value.explanation?.evidence.effectiveResource?.name === 'canonical-winner'
  && canonicalExplanation.value.explanation?.evidence.exclusion?.lookupKeys
    .includes(canonicalLoser.registrationKey) === true,
  'Expected the skipped-alias contender to retain its exact canonical-key exclusion.',
);

const componentScopes = await openFixture('resource-registration-component-scopes');
const componentRows = resourcesNamed(componentScopes, 'scope-card').sort(byImplementationStart);
const globalScopeCard = componentRows[0];
const localScopeCard = componentRows[1];
const ownerACursor = fixtureCursor(componentScopes, 'src/owner-a.html', '<scope-card');
const ownerBCursor = fixtureCursor(componentScopes, 'src/owner-b.html', '<scope-card');
const localInOwner = await explain(componentScopes, ownerACursor, localScopeCard?.identityKey);
const globalInOwner = await explain(componentScopes, ownerACursor, globalScopeCard?.identityKey);
const localInSibling = await explain(componentScopes, ownerBCursor, localScopeCard?.identityKey);
checkExact(localInOwner, 'available', 'open', 'component-local winner');
checkExact(globalInOwner, 'shadowed', 'open', 'inherited component resource');
checkExact(localInSibling, 'admission-unknown', 'open', 'component-local resource in sibling scope');
check(
  globalInOwner.value.explanation?.evidence.effectiveResource?.identityKey === localScopeCard?.identityKey
  && globalInOwner.value.explanation?.evidence.exclusion?.contenderLane === 'parent',
  'Expected component-local shadow evidence to preserve the local winner and inherited loser lane.',
);
for (const answer of [localInOwner, globalInOwner, localInSibling]) {
  check(
    answer.value.explanation?.uncertainty.reasons.includes('component-scope-lineage-open') === true,
    'Expected component resource explanation to retain the open child-container lineage boundary.',
  );
}

const localTemplates = await openFixture('resource-registration-local-templates');
const primaryLocal = requireLocalResource(localTemplates, 'local-chip', 'local-templates-app');
const secondaryLocal = requireLocalResource(localTemplates, 'local-chip', 'secondary-host');
const primaryCursor = fixtureCursor(localTemplates, 'src/local-templates-app.html', '<local-chip');
const secondaryCursor = fixtureCursor(localTemplates, 'src/secondary-host.html', '<local-chip');
checkExact(await explain(localTemplates, primaryCursor, primaryLocal.identityKey), 'available', 'complete', 'primary local template resource');
checkExact(await explain(localTemplates, primaryCursor, secondaryLocal.identityKey), 'not-admitted', 'complete', 'foreign local template resource');
checkExact(await explain(localTemplates, secondaryCursor, secondaryLocal.identityKey), 'available', 'open', 'secondary local template resource');

const plugins = await openFixture('plugin-capability-app-root-isolation');
const translationConverter = requireResource(plugins, 't', 'value-converter');
const admittedCursor = fixtureCursor(plugins, 'src/admitted-plugin-app.html', '<template>');
const unadmittedCursor = fixtureCursor(plugins, 'src/unadmitted-plugin-app.html', '<template>');
const sharedCursor = fixtureCursor(plugins, 'src/shared-plugin-app.html', '<template>');
checkExact(await explain(plugins, admittedCursor, translationConverter.identityKey), 'available', 'complete', 'plugin-admitted scope');
checkExact(await explain(plugins, unadmittedCursor, translationConverter.identityKey), 'not-admitted', 'complete', 'plugin-isolated scope');
const ambiguousPlugin = await explain(plugins, sharedCursor, translationConverter.identityKey);
check(ambiguousPlugin.selection === 'ambiguous', `Expected shared plugin template ambiguity, observed ${ambiguousPlugin.selection}.`);
check(ambiguousPlugin.value.explanation === null, 'Expected ambiguous plugin scope not to select an explanation.');
check(ambiguousPlugin.value.contenders.length === 2, `Expected two plugin contenders, observed ${ambiguousPlugin.value.contenders.length}.`);
check(
  new Set(ambiguousPlugin.value.contenders.map((row) => row.subject.template.scopeIdentityKey)).size === 2,
  'Expected ambiguous plugin contenders to preserve distinct exact scope identities.',
);
const pluginOutcomes = [];
for (const contender of ambiguousPlugin.value.contenders) {
  const selected = await explain(
    plugins,
    sharedCursor,
    translationConverter.identityKey,
    contender.subject.template.scopeIdentityKey,
  );
  pluginOutcomes.push(selected.value.explanation?.conclusion.kind);
}
check(
  new Set(pluginOutcomes).size === 2
  && pluginOutcomes.includes('available')
  && pluginOutcomes.includes('not-admitted'),
  `Expected app-root scope selection to distinguish plugin admission, observed ${JSON.stringify(pluginOutcomes)}.`,
);

const validation = await openFixture('validation-html-configured-resources');
const validationErrors = requireResource(validation, 'validation-errors', 'custom-attribute');
const coreOnlyCursor = fixtureCursor(validation, 'src/validation-core-only-app.html', '<template>');
const configuredOut = await explain(validation, coreOnlyCursor, validationErrors.identityKey);
checkExact(configuredOut, 'configured-out', 'open', 'closed configuration under a registration-hiding seam');
check(
  configuredOut.value.explanation?.evidence.configuration.state === 'excluded'
  && configuredOut.value.explanation.evidence.configuration.sources.every(exactSource)
  && configuredOut.value.explanation.evidence.configuration.sources.length > 0,
  'Expected configured-out conclusion to reuse exact closed option membership and source evidence.',
);
check(
  configuredOut.value.explanation?.uncertainty.state === 'open'
  && configuredOut.value.explanation.uncertainty.reasons.includes('registration-admission-open')
  && configuredOut.value.explanation.evidence.blockers.length > 0,
  'Expected a relevant registration-hiding seam to prevent closed configured-out availability.',
);
check(
  configuredOut.continuations?.some((row) => row.targetQueryKind === SemanticAppQueryKind.OpenSeamSites) === true,
  'Expected open availability explanation to continue to authored open-seam sites.',
);

const openRegistration = await openFixture('di-registration-open-reasons');
const openCursor = fixtureCursor(openRegistration, 'src/app.html', '<template>');
const openCandidate = requireResource(openRegistration, 'open-candidate', 'custom-element');
const absentUnderOpenRegistration = await explain(openRegistration, openCursor, openCandidate.identityKey);
checkExact(absentUnderOpenRegistration, 'admission-unknown', 'open', 'unregistered candidate under dynamic registration');
const modeledPositiveUnderOpenRegistration = await explain(
  openRegistration,
  openCursor,
  requireResource(openRegistration, 'if', 'template-controller').identityKey,
);
checkExact(modeledPositiveUnderOpenRegistration, 'available', 'open', 'modeled winner under dynamic registration');
for (const [label, answer] of [
  ['modeled absence', absentUnderOpenRegistration],
  ['modeled positive', modeledPositiveUnderOpenRegistration],
]) {
  check(
    answer.value.explanation?.uncertainty.state === 'open'
    && answer.value.explanation.uncertainty.reasons.includes('registration-admission-open')
    && answer.value.explanation.evidence.blockers.some((blocker) => blocker.seamKindKey === 'registration.open-strategy'),
    `Expected ${label} to retain the same registration-order blocker without false closure.`,
  );
  const blockerSummaries = [...new Set(
    (answer.value.explanation?.evidence.blockers ?? []).map((blocker) => blocker.summary.trim()).filter(Boolean),
  )];
  check(
    blockerSummaries.length === 0
      || answer.value.explanation?.uncertainty.explanation.includes(`First blocker: ${blockerSummaries[0]}`) === true,
    `Expected ${label} uncertainty prose to surface its first concrete blocker summary.`,
  );
  check(
    blockerSummaries.length < 2
      || answer.value.explanation?.uncertainty.explanation.includes(`${blockerSummaries.length - 1} more`) === true,
    `Expected ${label} uncertainty prose to count the remaining distinct blockers.`,
  );
}

const truncated = await truncatedContract();
checkExact(truncated, 'admission-unknown', 'truncated', 'source-discovery-truncated negative');
check(
  truncated.value.explanation?.uncertainty.state === 'truncated'
  && truncated.value.explanation.uncertainty.reasons.includes('source-discovery-truncated')
  && truncated.value.explanation.conclusion.kind !== 'not-admitted',
  'Expected source discovery truncation never to publish a closed negative.',
);

const missingSelector = await duplicates.runtime.answerAppQuery({
  kind: SemanticAppQueryKind.ResourceAvailabilityExplanation,
  cursor: duplicateCursor,
  includeAuthoringTemplates: true,
  appRetention: 'retain-app',
});
check(
  missingSelector.result === 'unsupported'
  && missingSelector.selection === 'not-applicable'
  && missingSelector.coverage === 'not-applicable',
  'Expected missing exact resource identity to fail during selector preflight.',
);
const missingCursor = await duplicates.runtime.answerAppQuery({
  kind: SemanticAppQueryKind.ResourceAvailabilityExplanation,
  resourceIdentityKey: duplicateRows[0]?.identityKey,
  includeAuthoringTemplates: true,
  appRetention: 'retain-app',
});
check(missingCursor.selection === 'absent' && missingCursor.value.explanation === null, 'Expected omitted cursor to select no explanation.');

for (const answer of [
  duplicateWinner,
  duplicateLoser,
  canonicalExplanation,
  localInOwner,
  globalInOwner,
  localInSibling,
  ambiguousPlugin,
  configuredOut,
  absentUnderOpenRegistration,
  modeledPositiveUnderOpenRegistration,
  truncated,
]) {
  check(typeof JSON.stringify(answer) === 'string', 'Expected every explanation answer to remain generic app-query/MCP JSON data.');
  check(answer.value.explanation?.nextSteps.length == null || answer.value.explanation.nextSteps.length <= 3, 'Expected every exact explanation to cap engine-authored next steps at three.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      catalog: catalogRow.queryKind,
      duplicate: [
        duplicateWinner.value.explanation?.conclusion.kind,
        duplicateLoser.value.explanation?.conclusion.kind,
      ],
      canonicalAlias: canonicalExplanation.value.explanation?.conclusion.kind,
      component: [
        localInOwner.value.explanation?.conclusion.kind,
        globalInOwner.value.explanation?.conclusion.kind,
        localInSibling.value.explanation?.conclusion.kind,
      ],
      pluginContenders: ambiguousPlugin.value.contenders.length,
      pluginOutcomes,
      configuredOut: configuredOut.value.explanation?.uncertainty.state,
      modeledPositive: modeledPositiveUnderOpenRegistration.value.explanation?.uncertainty.state,
      truncated: truncated.value.explanation?.uncertainty.state,
    },
  }, null, 2));
}

async function openFixture(fixtureName) {
  const root = path.join(pressureRoot, fixtureName);
  const runtime = await createSemanticRuntime({
    workspaceRoot: root,
    storeKey: `resource-availability-explanation:${fixtureName}`,
  });
  const inventory = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.ResourceInventory,
    page: { size: 1_000 },
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
  return { root, runtime, inventory };
}

async function explain(session, sourceCursor, resourceIdentityKey, templateResourceScopeIdentityKey) {
  return session.runtime.answerAppQuery({
    kind: SemanticAppQueryKind.ResourceAvailabilityExplanation,
    cursor: sourceCursor,
    resourceIdentityKey,
    ...(templateResourceScopeIdentityKey == null ? {} : { templateResourceScopeIdentityKey }),
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
}

async function templateAvailability(session, sourceCursor) {
  return session.runtime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateResourceAvailability,
    cursor: sourceCursor,
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
}

function fixtureCursor(session, relativePath, marker) {
  const text = fs.readFileSync(path.join(session.root, relativePath), 'utf8');
  const markerOffset = text.indexOf(marker);
  if (markerOffset < 0) throw new Error(`Fixture marker '${marker}' was not found in ${relativePath}.`);
  return cursor(path.join(session.root, relativePath), markerOffset);
}

function cursor(filePath, offset) {
  return { filePath, line: 0, character: 0, offset };
}

function resourcesNamed(session, name) {
  return session.inventory.value.rows.filter((row) => row.name === name);
}

function requireResource(session, name, resourceKind) {
  const row = session.inventory.value.rows.find((candidate) =>
    candidate.name === name && candidate.resourceKind === resourceKind
  );
  if (row == null) throw new Error(`Fixture resource '${resourceKind}:${name}' was not found.`);
  return row;
}

function requireLocalResource(session, name, ownerName) {
  const row = session.inventory.value.rows.find((candidate) =>
    candidate.name === name
    && candidate.locality.kind === 'local-template'
    && candidate.locality.ownerName === ownerName
  );
  if (row == null) throw new Error(`Local fixture resource '${ownerName}:${name}' was not found.`);
  return row;
}

function byImplementationStart(left, right) {
  return (left.sources.implementation?.start ?? Number.MAX_SAFE_INTEGER)
    - (right.sources.implementation?.start ?? Number.MAX_SAFE_INTEGER);
}

function exactSource(source) {
  return source?.path != null
    && Number.isSafeInteger(source.start)
    && Number.isSafeInteger(source.end)
    && source.end >= source.start;
}

function checkExact(answer, conclusionKind, coverage, label) {
  check(answer.selection === 'exact', `Expected exact ${label} selection, observed ${answer.selection}.`);
  check(answer.coverage === coverage, `Expected ${coverage} ${label} coverage, observed ${answer.coverage}.`);
  check(
    answer.value.explanation?.conclusion.kind === conclusionKind,
    `Expected ${conclusionKind} ${label} conclusion, observed ${answer.value.explanation?.conclusion.kind ?? '<none>'}.`,
  );
  check(answer.value.contenders.length === 1, `Expected one ${label} contender, observed ${answer.value.contenders.length}.`);
}

function checkExplanationEnvelope(answer, label) {
  check(answer.value.explanation?.subject.lookupKind === 'canonical-name', `Expected ${label} to declare canonical-name lookup.`);
  check((answer.value.explanation?.subject.subjectKey.length ?? 0) > 0, `Expected ${label} structural subject identity.`);
  check(answer.analysisBasis != null, `Expected ${label} currentness through answer analysisBasis.`);
  check(
    answer.value.explanation?.currentness.authority === 'answer-analysis-basis'
    && !('revision' in (answer.value.explanation?.currentness ?? {})),
    `Expected ${label} value currentness not to duplicate revision authority.`,
  );
  check((answer.value.explanation?.nextSteps.length ?? 99) <= 3, `Expected ${label} to expose no more than three next steps.`);
}

async function truncatedContract() {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aurelia-resource-availability-truncated-'));
  const sourceRoot = path.join(workspaceRoot, 'src');
  fs.mkdirSync(sourceRoot, { recursive: true });
  const appText = [
    "import Aurelia, { customElement } from 'aurelia';",
    '',
    "@customElement('guardrail-candidate')",
    'class GuardrailCandidate {}',
    '',
    "@customElement({ name: 'guardrail-app', template: '<template><div>guardrail</div></template>' })",
    'class GuardrailApp {}',
    '',
    'Aurelia.app(GuardrailApp).start();',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(sourceRoot, 'a-app.ts'), appText, 'utf8');
  fs.writeFileSync(path.join(sourceRoot, 'z-over-limit.ts'), [
    "import { customElement } from 'aurelia';",
    "@customElement('over-limit')",
    'export class OverLimit {}',
    '',
  ].join('\n'), 'utf8');
  try {
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'resource-availability-explanation:truncated',
      projects: [{
        rootDir: workspaceRoot,
        projectKey: 'resource-availability-truncated',
        sourceDiscoveryOptions: { extensions: new Set(['.ts']), maxFiles: 1 },
      }],
    });
    const inventory = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.ResourceInventory,
      page: { size: 500 },
      includeAuthoringTemplates: true,
      appRetention: 'retain-app',
    });
    const candidate = inventory.value.rows.find((row) => row.name === 'guardrail-candidate');
    if (candidate == null) throw new Error('Truncated fixture candidate was not admitted before the source guardrail.');
    return await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.ResourceAvailabilityExplanation,
      cursor: cursor(path.join(sourceRoot, 'a-app.ts'), appText.indexOf('guardrail</div>')),
      resourceIdentityKey: candidate.identityKey,
      includeAuthoringTemplates: true,
      appRetention: 'retain-app',
    });
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

function check(condition, message) {
  if (!condition) failures.push(message);
}
