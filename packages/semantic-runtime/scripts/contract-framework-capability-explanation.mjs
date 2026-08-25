import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FRAMEWORK_REGISTRATION_CAPABILITIES,
  SemanticAppQueryKind,
  createSemanticRuntime,
  frameworkRegistrationCapabilityFromString,
  semanticAppQueryCatalogRow,
  semanticAppQueryCatalogShape,
  unsupportedSemanticAppQuerySelectorFields,
} from '../out/index.js';
import { semanticAppQueryKey } from '../out/api/app-query-identity.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const pressureRoot = path.join(packageRoot, 'fixtures/pressure');
const failures = [];

const catalogRow = semanticAppQueryCatalogRow(SemanticAppQueryKind.FrameworkCapabilityExplanation);
check(catalogRow.group === 'framework', `Expected framework group, observed ${catalogRow.group}.`);
check(catalogRow.resultRole === 'cursor-locus', `Expected cursor-locus result, observed ${catalogRow.resultRole}.`);
check(catalogRow.requiresCursor, 'Expected framework capability explanation to require a cursor.');
check(!catalogRow.supportsPaging && !catalogRow.supportsDetail, 'Expected V1 explanation to reject paging and detail selectors.');
check(catalogRow.materializationPolicy === 'projection-only', `Expected projection-only materialization, observed ${catalogRow.materializationPolicy}.`);
check(FRAMEWORK_REGISTRATION_CAPABILITIES.includes('i18n.translation-syntax'), 'Expected exported framework capability vocabulary to include i18n translation syntax.');
check(frameworkRegistrationCapabilityFromString('i18n.translation-syntax') === 'i18n.translation-syntax', 'Expected known capability parser success.');
check(frameworkRegistrationCapabilityFromString('not.a.framework-capability') === null, 'Expected unknown capability parser refusal.');

const shaped = semanticAppQueryCatalogShape({
  kind: SemanticAppQueryKind.FrameworkCapabilityExplanation,
  cursor: cursor('src/app.html', 12),
  frameworkCapability: 'i18n.translation-syntax',
});
check(shaped.frameworkCapability === 'i18n.translation-syntax', 'Expected catalog shape to retain the exact capability selector.');
check(
  semanticAppQueryKey(shaped) !== semanticAppQueryKey({ ...shaped, frameworkCapability: 'state.binding-syntax' }),
  'Expected framework capability selector to participate in query identity.',
);
check(
  unsupportedSemanticAppQuerySelectorFields({
    kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
    frameworkCapability: 'i18n.translation-syntax',
  }).includes('frameworkCapability'),
  'Expected other query families to reject the explanation-only selector.',
);
check(
  unsupportedSemanticAppQuerySelectorFields({
    kind: SemanticAppQueryKind.FrameworkCapabilityExplanation,
    cursor: cursor('src/app.html', 12),
    frameworkCapability: 'not.a.framework-capability',
  }).includes('frameworkCapability'),
  'Expected the app-query preflight to reject values outside the closed capability vocabulary.',
);

const noPackage = await readFixture('framework-capability-explanation-no-package');
const invalidSelectorAnswer = await noPackage.runtime.answerAppQuery({
  kind: SemanticAppQueryKind.FrameworkCapabilityExplanation,
  cursor: cursor('src/capability-explanation-app.html', 20),
  frameworkCapability: 'not.a.framework-capability',
  appRetention: 'retain-app',
});
check(
  invalidSelectorAnswer.result === 'unsupported'
  && invalidSelectorAnswer.selection === 'not-applicable'
  && invalidSelectorAnswer.coverage === 'not-applicable',
  'Expected invalid closed-vocabulary selector to fail before semantic selection.',
);
const noPackageDemand = await demandMatching(noPackage, (row) =>
  row.requiredCapability === 'ui-virtualization.default-resources'
  && row.admissionState === 'not-admitted'
);
check(noPackageDemand?.availabilityState === 'no-local-evidence', 'Expected no-package fixture to retain no-local-evidence.');
const noPackageAnswer = await explainDemand(noPackage, noPackageDemand);
checkExactConclusion(noPackageAnswer, 'not-admitted', 'complete', 'no-package');
check(noPackageAnswer.value.explanation?.evidence.package.evidence.length === 0, 'Expected no-package explanation to retain zero package evidence rows.');
check(
  noPackageAnswer.value.explanation?.conclusion.action.includes('no automatic install or registration edit') === true,
  'Expected no-package explanation to refuse speculative install/registration edits.',
);
check(
  noPackageAnswer.value.explanation?.nextSteps.every((step) => step.label !== 'Open the retained package or import evidence.') === true,
  'Expected no-package explanation not to offer nonexistent package evidence.',
);

const pluginIsolation = await readFixture('plugin-capability-app-root-isolation');
const packageDemand = await demandMatching(pluginIsolation, (row) =>
  row.source?.path === 'src/unadmitted-plugin-app.html'
  && row.requiredCapability === 'i18n.translation-syntax'
  && row.admissionState === 'not-admitted'
);
const packageAnswer = await explainDemand(pluginIsolation, packageDemand);
checkExactConclusion(packageAnswer, 'not-admitted', 'complete', 'package-evidence');
check((packageAnswer.value.explanation?.evidence.package.evidence.length ?? 0) > 0, 'Expected retained package/import evidence for the admitted workspace package.');
check(
  packageAnswer.value.explanation?.nextSteps.some((step) => step.kind === 'inspect-source' && step.source != null) === true,
  'Expected package-backed explanation to expose an exact source-backed next step.',
);

const configured = await readFixture('i18n-custom-translation-alias');
const configuredDemand = await demandMatching(configured, (row) =>
  row.admissionState === 'configured-out'
  && row.requiredCapability === 'i18n.translation-syntax'
);
const configuredAnswer = await explainDemand(configured, configuredDemand);
checkExactConclusion(configuredAnswer, 'configured-out', 'complete', 'configured-out');
check(configuredAnswer.value.explanation?.evidence.configuration.state === 'excluded', 'Expected configured-out explanation to classify closed exclusion evidence.');
check((configuredAnswer.value.explanation?.evidence.configuration.sources.length ?? 0) > 0, 'Expected configured-out explanation to retain exact option sources.');
check(configuredAnswer.value.explanation?.conclusion.action.includes('no automatic edit') === true, 'Expected configured-out explanation to refuse speculative configuration edits.');

const openConfiguration = await readFixture('plugin-capability-open-configuration');
const openDemand = await demandMatching(openConfiguration, (row) =>
  row.admissionState === 'admission-unknown'
  && row.requiredCapability === 'i18n.translation-syntax'
);
const openAnswer = await explainDemand(openConfiguration, openDemand);
checkExactConclusion(openAnswer, 'admission-unknown', 'open', 'open-admission');
check(openAnswer.value.explanation?.evidence.configuration.state === 'open', 'Expected typed open configuration blocker to stay on the configuration evidence plane.');
check((openAnswer.value.explanation?.evidence.blockers.length ?? 0) > 0, 'Expected admission-unknown explanation to retain blocker rows.');
check(
  openAnswer.value.explanation?.evidence.blockers.every((row) =>
    row.seamKindKey.length > 0
    && row.reasonKinds.length > 0
    && row.boundaryKinds.length > 0
    && row.sources.length > 0
  ) === true,
  'Expected blockers to retain typed seam, reason, boundary, and source evidence.',
);
check(openAnswer.continuations?.some((row) => row.targetQueryKind === SemanticAppQueryKind.OpenSeamSites) === true, 'Expected open explanation to continue to open seam sites.');

const admitted = await readFixture('template-controller-built-ins');
const admittedDemand = await demandMatching(admitted, (row) =>
  row.siteKind !== 'source-service-api'
  && row.admissionState === 'admitted'
);
const admittedAnswer = await explainDemand(admitted, admittedDemand);
checkExactConclusion(admittedAnswer, 'available', 'complete', 'admitted-control');
check(admittedAnswer.value.explanation?.uncertainty.state === 'closed', 'Expected admitted control uncertainty to be closed.');
check(admittedAnswer.value.explanation?.nextSteps.length <= 3, 'Expected engine-authored next steps to remain capped at three.');
check(admittedAnswer.analysisBasis != null, 'Expected routed explanation to retain the answer-envelope analysis basis.');
check(
  admittedAnswer.continuations?.some((row) =>
    row.targetQueryKind === SemanticAppQueryKind.FrameworkCapabilityDemands
    && row.targetQuery?.sourceFile?.filePath === admittedAnswer.value.explanation?.subject.source.path
  ) === true,
  'Expected exact explanation to continue to demand facts in the selected authored source file.',
);
check(
  admittedAnswer.value.explanation?.currentness.authority === 'answer-analysis-basis'
  && !('revision' in (admittedAnswer.value.explanation?.currentness ?? {})),
  'Expected value currentness to point to, not duplicate, the answer-envelope authority.',
);

const sharedDemand = await demandMatching(pluginIsolation, (row) =>
  row.source?.path === 'src/shared-plugin-app.html'
  && row.requiredCapability === 'i18n.translation-syntax'
);
const ambiguousAnswer = await explainDemand(pluginIsolation, sharedDemand);
check(ambiguousAnswer.selection === 'ambiguous', `Expected shared-template ambiguity, observed ${ambiguousAnswer.selection}.`);
check(ambiguousAnswer.value.explanation === null, 'Expected ambiguous selection not to publish a chosen explanation.');
check(
  new Set(ambiguousAnswer.value.contenders.map((row) => row.conclusionKind)).has('available')
  && new Set(ambiguousAnswer.value.contenders.map((row) => row.conclusionKind)).has('not-admitted'),
  'Expected shared template contenders to conserve opposing app-world conclusions.',
);

const absentAnswer = await pluginIsolation.runtime.answerAppQuery({
  kind: SemanticAppQueryKind.FrameworkCapabilityExplanation,
  cursor: cursor('src/unadmitted-plugin-app.html', 0),
  frameworkCapability: 'i18n.translation-syntax',
  appRetention: 'retain-app',
});
check(absentAnswer.selection === 'absent' && absentAnswer.value.explanation === null, 'Expected a cursor outside demand spans to fail closed as absent.');
check(
  absentAnswer.continuations?.length === 1
  && absentAnswer.continuations[0]?.targetQueryKind === SemanticAppQueryKind.FrameworkCapabilityDemands
  && absentAnswer.continuations[0]?.targetQuery?.sourceFile?.filePath === 'src/unadmitted-plugin-app.html',
  'Expected absent explanation to offer only a truthful cursor-file demand audit.',
);

const sourceService = await readFixture('source-service-api-demand');
const sourceServiceDemand = await demandMatching(sourceService, (row) => row.siteKind === 'source-service-api');
const sourceServiceAnswer = await explainDemand(sourceService, sourceServiceDemand);
check(sourceServiceAnswer.selection === 'absent', 'Expected V1 explanation to exclude source-service API demand semantics.');

await checkDiagnosticContinuations(pluginIsolation, 'framework-capability-not-registered');
await checkDiagnosticContinuations(configured, 'framework-capability-configured-out');
const summaryAnswer = await configured.runtime.answerAppQuery({
  kind: SemanticAppQueryKind.AppDiagnosticSummary,
  page: { size: 500 },
  appRetention: 'retain-app',
});
check(
  !summaryAnswer.continuations?.some((row) => row.targetQueryKind === SemanticAppQueryKind.FrameworkCapabilityExplanation),
  'Expected summary clusters not to fabricate exact explanation cursors.',
);

for (const answer of [noPackageAnswer, packageAnswer, configuredAnswer, openAnswer, admittedAnswer, ambiguousAnswer, absentAnswer]) {
  check(answer.value.explanation?.nextSteps.length == null || answer.value.explanation.nextSteps.length <= 3, 'Expected every exact answer to cap next steps at three.');
  check(typeof JSON.stringify(answer) === 'string', 'Expected explanation answer to remain generic JSON-serializable for MCP app-query transport.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      catalog: catalogRow.queryKind,
      noPackage: noPackageAnswer.value.explanation?.conclusion.kind,
      packageEvidence: packageAnswer.value.explanation?.evidence.package.evidence.length,
      configuredOut: configuredAnswer.value.explanation?.evidence.configuration.state,
      openBlockers: openAnswer.value.explanation?.evidence.blockers.length,
      admitted: admittedAnswer.value.explanation?.conclusion.kind,
      ambiguousContenders: ambiguousAnswer.value.contenders.length,
    },
  }, null, 2));
}

async function readFixture(name) {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(pressureRoot, name),
    storeKey: `framework-capability-explanation:${name}`,
  });
  return { runtime };
}

async function demandMatching(fixture, predicate) {
  const answer = await fixture.runtime.answerAppQuery({
    kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
    page: { size: 500 },
    appRetention: 'retain-app',
  });
  const row = answer.value.rows.find(predicate) ?? null;
  check(row != null, `Expected matching demand in project ${answer.value.rows[0]?.projectKey ?? '<empty>'}.`);
  check(row?.source?.path != null && row.source.start != null, 'Expected matching demand to retain an exact source span.');
  return row;
}

async function explainDemand(fixture, demand) {
  if (demand?.source?.path == null || demand.source.start == null) {
    return missingDemandAnswer();
  }
  return fixture.runtime.answerAppQuery({
    kind: SemanticAppQueryKind.FrameworkCapabilityExplanation,
    cursor: cursor(demand.source.path, demand.source.start),
    frameworkCapability: demand.requiredCapability,
    appRetention: 'retain-app',
  });
}

async function checkDiagnosticContinuations(fixture, diagnosticKind) {
  const answer = await fixture.runtime.answerAppQuery({
    kind: SemanticAppQueryKind.AppDiagnostics,
    page: { size: 500 },
    diagnosticProjection: 'available-products',
    appRetention: 'retain-app',
  });
  check(answer.value.rows.some((row) => row.diagnosticKind === diagnosticKind), `Expected ${diagnosticKind} diagnostic row.`);
  const continuation = answer.continuations?.find((row) =>
    row.targetQueryKind === SemanticAppQueryKind.FrameworkCapabilityExplanation
  ) ?? null;
  check(continuation?.targetQuery?.cursor?.offset != null, `Expected exact ${diagnosticKind} explanation continuation cursor.`);
  check(continuation?.targetQuery?.frameworkCapability != null, `Expected exact ${diagnosticKind} capability selector.`);
  check(
    continuation?.evidence?.sourceFacts.some((fact) => fact.source?.start != null && fact.source.end != null) === true,
    `Expected exact ${diagnosticKind} continuation source evidence.`,
  );
}

function checkExactConclusion(answer, conclusionKind, coverage, label) {
  check(answer.selection === 'exact', `Expected exact ${label} selection, observed ${answer.selection}.`);
  check(answer.coverage === coverage, `Expected ${coverage} ${label} coverage, observed ${answer.coverage}.`);
  check(answer.value.explanation?.conclusion.kind === conclusionKind, `Expected ${conclusionKind} ${label} conclusion, observed ${answer.value.explanation?.conclusion.kind ?? '<none>'}.`);
  check(answer.value.contenders.length === 1, `Expected one ${label} contender, observed ${answer.value.contenders.length}.`);
}

function cursor(filePath, offset) {
  return { filePath, line: 0, character: 0, offset };
}

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function missingDemandAnswer() {
  return {
    selection: 'absent',
    coverage: 'not-applicable',
    value: { explanation: null, contenders: [] },
  };
}
