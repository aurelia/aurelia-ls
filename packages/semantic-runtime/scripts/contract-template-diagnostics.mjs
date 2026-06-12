import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FixtureVerificationRequest,
  createSemanticRuntime,
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
  readFixtureVerificationSnapshot,
  SemanticAppQueryKind,
  verifyFixtureEffects,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const weakOwnerFixtureRoot = path.join(packageRoot, 'fixtures/pressure/weak-owner-repair-planning');
const mixedFormFixtureRoot = path.join(packageRoot, 'fixtures/pressure/mixed-form-surfaces');
const selectModelPrimitiveFixtureRoot = path.join(packageRoot, 'fixtures/pressure/select-model-primitives');
const syntheticWritebackFixtureRoot = path.join(packageRoot, 'fixtures/pressure/synthetic-writeback-local');
const templateOverlayTypeErrorFixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-overlay-type-errors');
const guidanceTruthCanariesFixtureRoot = path.join(packageRoot, 'fixtures/pressure/guidance-truth-canaries');
const viewFactoryProviderFixtureRoot = path.join(packageRoot, 'fixtures/pressure/runtime-html-view-factory-provider-errors');
const unregisteredShorthandFixtureRoot = path.join(packageRoot, 'fixtures/pressure/unregistered-shorthand-syntax');
const unregisteredPluginSyntaxFixtureRoot = path.join(packageRoot, 'fixtures/pressure/unregistered-plugin-syntax');
const unregisteredPluginResourcesFixtureRoot = path.join(packageRoot, 'fixtures/pressure/unregistered-plugin-resources');
const registeredPluginCapabilitiesFixtureRoot = path.join(packageRoot, 'fixtures/pressure/registered-plugin-capabilities');

const contracts = [
  await verifyFixture(
    weakOwnerFixtureRoot,
    'template-diagnostics-contract:weak-owner',
    [
      ExpectedSemanticEffect.exactly(
        'Weak repeat-local owner typing should surface as two template diagnostic rows.',
        'template-diagnostic',
        'template',
        2,
        null,
        [
          effectFilter('diagnosticKind', 'weak-expression-member-owner'),
          effectFilter('missingInput', 'expression-member-owner-type:missing-slot-type'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Missing repeat-local slot type diagnostics should propose declaring the scope slot type.',
        'template-diagnostic',
        'template',
        2,
        null,
        [
          effectFilter('suggestion.suggestionKind', 'declare-scope-slot-type'),
          effectFilter('suggestion.actionKind', 'declare-scope-slot'),
          effectFilter('suggestion.actionTarget.targetKind', 'scope-slot'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Any-typed member owners should target the authored type annotation when that source is known.',
        'template-diagnostic',
        'template',
        2,
        null,
        [
          effectFilter('diagnosticKind', 'weak-expression-member-owner'),
          effectFilter('missingInput', 'expression-member-owner-type:any'),
          effectFilter('selectedMemberName', 'label'),
          effectFilter('suggestion.suggestionKind', 'replace-any-owner'),
          effectFilter('suggestion.actionKind', 'replace-owner-type'),
          effectFilter('suggestion.actionTarget.targetKind', 'owner-type'),
          effectFilter('suggestion.actionTarget.source.path', 'src/weak-owner-repair-app.ts'),
          effectFilter('suggestion.actionTarget.source.role', 'type'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Any-typed repeat locals should preserve the iterable owner source as the repair target.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'weak-expression-member-owner'),
          effectFilter('missingInput', 'expression-member-owner-type:any'),
          effectFilter('selectedMemberName', 'name'),
          effectFilter('suggestion.suggestionKind', 'replace-any-owner'),
          effectFilter('suggestion.actionKind', 'replace-owner-type'),
          effectFilter('suggestion.actionTarget.targetKind', 'owner-type'),
          effectFilter('suggestion.actionTarget.source.path', 'src/weak-owner-repair-app.ts'),
          effectFilter('suggestion.actionTarget.source.role', 'type'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.atLeast(
        'Binding observed dependencies for any-typed member reads should preserve the owner source route.',
        'binding-observed-dependency',
        'template',
        1,
        null,
        [
          effectFilter('sourceName', 'untypedRow.label'),
          effectFilter('observedMemberKind', 'property'),
          effectFilter('observedMemberSource.path', 'src/weak-owner-repair-app.ts'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Index-signature-only owners should target the TypeScript owner surface instead of the template expression.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'weak-expression-member-owner'),
          effectFilter('missingInput', 'expression-member-owner-type:index-signature-only'),
          effectFilter('selectedMemberName', 'status'),
          effectFilter('suggestion.suggestionKind', 'declare-explicit-member'),
          effectFilter('suggestion.actionKind', 'declare-member'),
          effectFilter('suggestion.actionTarget.targetKind', 'owner-type'),
          effectFilter('suggestion.actionTarget.source.path', 'src/weak-owner-repair-app.ts'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.absent(
        'Weak missing-slot diagnostics should not masquerade as a missing concrete label member.',
        'template-diagnostic',
        'template',
        null,
        [
          effectFilter('diagnosticKind', 'missing-expression-member'),
          effectFilter('selectedMemberName', 'label'),
        ],
      ),
      ExpectedSemanticEffect.absent(
        'Weak missing-slot diagnostics should not masquerade as a missing concrete status member.',
        'template-diagnostic',
        'template',
        null,
        [
          effectFilter('diagnosticKind', 'missing-expression-member'),
          effectFilter('selectedMemberName', 'status'),
        ],
      ),
      ExpectedSemanticEffect.exactly(
        'A typed non-weak owner with a missing member should suggest inspecting the owner expression instead of replacing a weak owner type.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'missing-expression-member'),
          effectFilter('selectedMemberName', 'missing'),
          effectFilter('suggestion.suggestionKind', 'inspect-owner-type'),
          effectFilter('suggestion.actionKind', 'inspect-owner-type'),
        ],
        'signature',
      ),
    ],
  ),
  await verifyFixture(
    mixedFormFixtureRoot,
    'template-diagnostics-contract:mixed-form',
    [
      ExpectedSemanticEffect.exactly(
        'Target-to-source type mismatches should surface as assignment strictness diagnostics.',
        'template-diagnostic',
        'template',
        2,
        null,
        [
          effectFilter('diagnosticKind', 'binding-source-assignment-strictness'),
          effectFilter('missingInput', 'binding-source-assignment:target-to-source-type-mismatch'),
          effectFilter('suggestion.actionKind', 'change-member-type'),
          effectFilter('suggestion.actionTarget.targetKind', 'owner-type'),
          effectFilter('suggestion.actionTarget.source.path', 'src/components/ticket-editor.ts'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Index-signature owners backed by external utility declarations should target the app owner expression source.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'weak-expression-member-owner'),
          effectFilter('missingInput', 'expression-member-owner-type:index-signature-only'),
          effectFilter('selectedMemberName', 'source'),
          effectFilter('suggestion.suggestionKind', 'declare-explicit-member'),
          effectFilter('suggestion.actionTarget.targetKind', 'owner-type'),
          effectFilter('suggestion.actionTarget.source.path', 'src/app.ts'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.atLeast(
        'Binding data-flow rows should preserve the declaration source for assignment repair targets.',
        'binding-data-flow',
        'template',
        2,
        null,
        [
          effectFilter('sourceAssignmentReasonKinds', 'target-to-source-type-mismatch'),
          effectFilter('sourceAssignmentTargetSource.path', 'src/components/ticket-editor.ts'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'The fulfillment setter diagnostic should target the authored fulfillmentMethod accessor.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'binding-source-assignment-strictness'),
          effectFilter('selectedMemberName', 'fulfillmentMethod'),
          effectFilter('suggestion.actionTarget.source.path', 'src/components/ticket-editor.ts'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'The fulfillment setter diagnostic source should narrow to the authored expression target, not the whole binding attribute.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'binding-source-assignment-strictness'),
          effectFilter('selectedMemberName', 'fulfillmentMethod'),
          effectFilter('source.path', 'src/components/ticket-editor.html'),
          effectFilter('source.start', 587),
          effectFilter('source.end', 604),
          effectFilter('source.role', 'binding-source-assignment'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'The number input diagnostic should target the authored priority accessor.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'binding-source-assignment-strictness'),
          effectFilter('selectedMemberName', 'priority'),
          effectFilter('suggestion.actionTarget.source.path', 'src/components/ticket-editor.ts'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'The number input diagnostic source should narrow to the authored expression target, not the whole binding attribute.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'binding-source-assignment-strictness'),
          effectFilter('selectedMemberName', 'priority'),
          effectFilter('source.path', 'src/components/ticket-editor.html'),
          effectFilter('source.start', 1843),
          effectFilter('source.end', 1851),
          effectFilter('source.role', 'binding-source-assignment'),
        ],
        'signature',
      ),
    ],
  ),
  await verifyFixture(
    selectModelPrimitiveFixtureRoot,
    'template-diagnostics-contract:select-model-primitives',
    [
      ExpectedSemanticEffect.exactly(
        'Single-select primitive assignment strictness should explain option model/value domain alignment.',
        'template-diagnostic',
        'template',
        2,
        null,
        [
          effectFilter('diagnosticKind', 'binding-source-assignment-strictness'),
          effectFilter('missingInput', 'binding-source-assignment:target-to-source-type-mismatch'),
          effectFilter('suggestion.suggestionKind', 'align-assignment-type'),
          effectFilter('suggestion.summary', 'Align the source member type with the single-select option domain; use model.bind for non-string domain values or type the source for the string/null value channel emitted by option value attributes.'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Radio primitive assignment strictness should explain model.bind versus value attributes.',
        'template-diagnostic',
        'template',
        2,
        null,
        [
          effectFilter('diagnosticKind', 'binding-source-assignment-strictness'),
          effectFilter('missingInput', 'binding-source-assignment:target-to-source-type-mismatch'),
          effectFilter('suggestion.suggestionKind', 'align-assignment-type'),
          effectFilter('suggestion.summary', 'Align the source member type with the radio model/value domain; use model.bind for non-string radio values or type the source for the string value channel emitted by value attributes.'),
        ],
        'signature',
      ),
    ],
  ),
  await verifyFixture(
    syntheticWritebackFixtureRoot,
    'template-diagnostics-contract:synthetic-writeback-local',
    [
      ExpectedSemanticEffect.absent(
        'Typed synthetic writeback locals should not surface missing slot-type diagnostics after the assigning binding.',
        'template-diagnostic',
        'template',
        null,
        [
          effectFilter('missingInput', 'expression-member-owner-type:missing-slot-type'),
        ],
      ),
      ExpectedSemanticEffect.atLeast(
        'Synthetic writeback repeat locals should retain the bindable member type for nested member reads.',
        'binding-data-flow',
        'template',
        1,
        null,
        [
          effectFilter('sourceName', 'row.label'),
          effectFilter('sourceType', 'string'),
        ],
        'signature',
      ),
    ],
  ),
  await verifyFixture(
    templateOverlayTypeErrorFixtureRoot,
    'template-diagnostics-contract:template-overlay-type-errors',
    [
      ExpectedSemanticEffect.exactly(
        'Nullish template overlay TypeScript diagnostics should propose guarding or narrowing the expression.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'template-expression-typescript-diagnostic'),
          effectFilter('missingInput', 'typescript:TS18047'),
          effectFilter('suggestion.suggestionKind', 'guard-nullish-expression'),
          effectFilter('suggestion.actionKind', 'rewrite-expression'),
          effectFilter('suggestion.actionTarget.targetKind', 'expression'),
          effectFilter('source.role', 'typescript-overlay:semantic'),
          effectFilter('source.sourceFileRole', 'template'),
        ],
        'signature',
      ),
    ],
  ),
  await verifyFixture(
    guidanceTruthCanariesFixtureRoot,
    'template-diagnostics-contract:guidance-truth-canaries',
    [
      ExpectedSemanticEffect.exactly(
        'Unknown typed-template roots should surface as missing binding-scope diagnostics at the authored identifier.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'missing-expression-member'),
          effectFilter('missingInput', 'expression-member:selected-member-missing'),
          effectFilter('selectedMemberName', 'titel'),
          effectFilter('source.path', 'src/guidance-truth-canary-app.html'),
          effectFilter('source.start', 6),
          effectFilter('source.end', 11),
          effectFilter('suggestion.suggestionKind', 'declare-explicit-member'),
          effectFilter('suggestion.actionKind', 'declare-member'),
          effectFilter('suggestion.actionTarget.targetKind', 'expression'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Host globals absent from Aurelia expression globals should surface as unsupported expression-global diagnostics.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'unsupported-expression-global'),
          effectFilter('missingInput', 'expression-global:not-admitted'),
          effectFilter('selectedMemberName', 'console'),
          effectFilter('source.path', 'src/guidance-truth-canary-app.html'),
          effectFilter('source.start', 41),
          effectFilter('source.end', 48),
          effectFilter('suggestion.suggestionKind', 'fix-expression-syntax'),
          effectFilter('suggestion.actionKind', 'rewrite-expression'),
          effectFilter('suggestion.actionTarget.targetKind', 'expression'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.absent(
        'Runtime listener event slots should not be treated as missing binding-scope roots.',
        'template-diagnostic',
        'template',
        null,
        [
          effectFilter('diagnosticKind', 'missing-expression-member'),
          effectFilter('selectedMemberName', '$event'),
        ],
      ),
      ExpectedSemanticEffect.exactly(
        '$-prefixed writeback roots should not become synthetic locals without runtime-assignment scope evidence.',
        'binding-data-flow',
        'template',
        1,
        null,
        [
          effectFilter('sourceName', '$ghostLocal'),
          effectFilter('sourceAssignmentKind', 'runtime-assignable-with-typescript-strictness'),
          effectFilter('sourceAssignmentReasonKinds', 'owner-member-not-projected'),
          effectFilter('sourceAssignmentTargetType', 'GuidanceTruthCanaryApp'),
          effectFilter('sourceAssignmentTargetSource', null),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.absent(
        '$-prefixed writeback roots without runtime-assignment scope evidence should not be marked runtime-assignable.',
        'binding-data-flow',
        'template',
        null,
        [
          effectFilter('sourceName', '$ghostLocal'),
          effectFilter('sourceAssignmentKind', 'runtime-assignable'),
        ],
      ),
    ],
  ),
  await verifyFixture(
    viewFactoryProviderFixtureRoot,
    'template-diagnostics-contract:view-factory-provider',
    [
      ExpectedSemanticEffect.exactly(
        'Only activation-time IViewFactory resolution on ordinary resources should claim AUR0755.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'runtime-controller-framework-error'),
          effectFilter('frameworkErrorCode', 'AUR0755'),
          effectFilter('missingInput', 'runtime-controller:AUR0755'),
        ],
        'signature',
      ),
    ],
  ),
  await verifyFixture(
    unregisteredShorthandFixtureRoot,
    'template-diagnostics-contract:unregistered-shorthand',
    [
      ExpectedSemanticEffect.exactly(
        'Unregistered shorthand attributes should surface capability-registration diagnostics.',
        'template-diagnostic',
        'template',
        2,
        null,
        [
          effectFilter('diagnosticKind', 'framework-capability-not-registered'),
          effectFilter('missingInput', 'runtime-html.short-hand-binding-syntax'),
          effectFilter('suggestion.suggestionKind', 'register-framework-capability'),
          effectFilter('suggestion.actionKind', 'register-framework-capability'),
          effectFilter('suggestion.actionTarget.targetKind', 'framework-capability'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.absent(
        'Unregistered shorthand should remain inert and not produce event-handler value channels.',
        'binding-value-channel',
        'template',
        null,
        [
          effectFilter('channelKind', 'event-handler-invocation'),
        ],
      ),
      ExpectedSemanticEffect.absent(
        'Unregistered shorthand should remain inert and not produce raw-property value channels.',
        'binding-value-channel',
        'template',
        null,
        [
          effectFilter('channelKind', 'raw-property'),
        ],
      ),
    ],
  ),
  await verifyFixture(
    unregisteredPluginSyntaxFixtureRoot,
    'template-diagnostics-contract:unregistered-plugin-syntax',
    [
      ExpectedSemanticEffect.exactly(
        'Unregistered i18n syntax attributes should surface capability-registration diagnostics.',
        'template-diagnostic',
        'template',
        2,
        null,
        [
          effectFilter('diagnosticKind', 'framework-capability-not-registered'),
          effectFilter('missingInput', 'i18n.translation-syntax'),
          effectFilter('suggestion.suggestionKind', 'register-framework-capability'),
          effectFilter('suggestion.actionTarget.targetKind', 'framework-capability'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Unregistered state syntax attributes should surface capability-registration diagnostics.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'framework-capability-not-registered'),
          effectFilter('missingInput', 'state.binding-syntax'),
          effectFilter('suggestion.suggestionKind', 'register-framework-capability'),
          effectFilter('suggestion.actionTarget.targetKind', 'framework-capability'),
        ],
        'signature',
      ),
    ],
  ),
  await verifyFixture(
    unregisteredPluginResourcesFixtureRoot,
    'template-diagnostics-contract:unregistered-plugin-resources',
    [
      ExpectedSemanticEffect.exactly(
        'Unregistered router resource elements and attributes should surface capability-registration diagnostics.',
        'template-diagnostic',
        'template',
        2,
        null,
        [
          effectFilter('diagnosticKind', 'framework-capability-not-registered'),
          effectFilter('missingInput', 'router.default-resources'),
          effectFilter('suggestion.suggestionKind', 'register-framework-capability'),
          effectFilter('suggestion.actionTarget.targetKind', 'framework-capability'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Unregistered validation-html resources should surface capability-registration diagnostics.',
        'template-diagnostic',
        'template',
        3,
        null,
        [
          effectFilter('diagnosticKind', 'framework-capability-not-registered'),
          effectFilter('missingInput', 'validation-html.default-resources'),
          effectFilter('suggestion.suggestionKind', 'register-framework-capability'),
          effectFilter('suggestion.actionTarget.targetKind', 'framework-capability'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Unregistered i18n expression resources should surface capability-registration diagnostics.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'framework-capability-not-registered'),
          effectFilter('missingInput', 'i18n.default-resources'),
          effectFilter('suggestion.suggestionKind', 'register-framework-capability'),
          effectFilter('suggestion.actionTarget.targetKind', 'framework-capability'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Unregistered state expression resources should surface capability-registration diagnostics.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'framework-capability-not-registered'),
          effectFilter('missingInput', 'state.default-resources'),
          effectFilter('suggestion.suggestionKind', 'register-framework-capability'),
          effectFilter('suggestion.actionTarget.targetKind', 'framework-capability'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Unregistered UI virtualization resources should surface capability-registration diagnostics.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'framework-capability-not-registered'),
          effectFilter('missingInput', 'ui-virtualization.default-resources'),
          effectFilter('suggestion.suggestionKind', 'register-framework-capability'),
          effectFilter('suggestion.actionTarget.targetKind', 'framework-capability'),
        ],
        'signature',
      ),
    ],
  ),
  await verifyFixture(
    registeredPluginCapabilitiesFixtureRoot,
    'template-diagnostics-contract:registered-plugin-capabilities',
    [
      ExpectedSemanticEffect.absent(
        'Registered plugin syntax and resources should not surface capability-registration diagnostics.',
        'template-diagnostic',
        'template',
        null,
        [
          effectFilter('diagnosticKind', 'framework-capability-not-registered'),
        ],
      ),
    ],
  ),
];
const mixedFormCursorProbe = await readMixedFormAssignmentCursorProbe();

const failures = contracts.flatMap((contract) => contract.verification.effectResults
  .filter((result) => result.outcome !== 'satisfied')
  .map((result) => `${contract.fixture}: ${result.summary}`));
if (mixedFormCursorProbe.assignmentDiagnostics !== 1) {
  failures.push(`Expected mixed-form fulfillmentMethod cursor to surface exactly one binding assignment diagnostic, observed ${mixedFormCursorProbe.assignmentDiagnostics}.`);
}
if (mixedFormCursorProbe.overlayAssignmentDiagnostics !== 0) {
  failures.push(`Expected mixed-form fulfillmentMethod cursor to suppress assignment-shaped overlay diagnostics when data-flow owns the span, observed ${mixedFormCursorProbe.overlayAssignmentDiagnostics}.`);
}

const summary = {
  contracts: contracts.map((contract) => ({
    fixture: contract.fixture,
    expectedEffects: contract.expectedEffects,
    verification: contract.verification.effectResults.map((result) => ({
      effectKind: result.expectedEffect.effectKind,
      outcome: result.outcome,
      summary: result.summary,
    })),
  })),
  mixedFormCursorProbe,
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function effectFilter(field, value) {
  return new ExpectedSemanticEffectFilter(field, value);
}

async function verifyFixture(fixtureRoot, storeKey, expectedEffects) {
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    storeKey,
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  const snapshot = readFixtureVerificationSnapshot(app);
  const verification = verifyFixtureEffects(
    new FixtureVerificationRequest(null, expectedEffects),
    snapshot,
  );
  return {
    fixture: path.basename(fixtureRoot),
    expectedEffects: expectedEffects.length,
    verification,
  };
}

async function readMixedFormAssignmentCursorProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: mixedFormFixtureRoot,
    storeKey: 'template-diagnostics-contract:mixed-form-cursor',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  const htmlPath = path.join(mixedFormFixtureRoot, 'src/components/ticket-editor.html');
  const htmlText = fs.readFileSync(htmlPath, 'utf8');
  const diagnostics = readCursorDiagnosticsForNeedle(app, htmlPath, htmlText, 'fulfillmentMethod');
  return {
    cursor: 'fulfillmentMethod',
    diagnostics: diagnostics.length,
    assignmentDiagnostics: diagnostics.filter((diagnostic) =>
      diagnostic.diagnosticKind === 'binding-source-assignment-strictness'
    ).length,
    overlayAssignmentDiagnostics: diagnostics.filter((diagnostic) =>
      diagnostic.diagnosticKind === 'template-expression-typescript-diagnostic'
      && (
        diagnostic.missingInputs.includes('typescript:TS2322')
        || diagnostic.missingInputs.includes('typescript:TS2588')
      )
    ).length,
  };
}

function readCursorDiagnosticsForNeedle(app, htmlPath, htmlText, needle) {
  const start = htmlText.indexOf(needle);
  if (start < 0) {
    return [];
  }
  const offset = start + Math.floor(needle.length / 2);
  const position = positionForOffset(htmlText, offset);
  return app.ask({
    kind: SemanticAppQueryKind.TemplateCursorInfo,
    diagnosticProjection: 'type-projection',
    cursor: {
      filePath: htmlPath,
      line: position.line,
      character: position.character,
      offset,
    },
  }).value.diagnostics;
}

function positionForOffset(text, offset) {
  const before = text.slice(0, offset);
  const line = before.split(/\r?\n/u).length - 1;
  const lineStart = Math.max(before.lastIndexOf('\n'), before.lastIndexOf('\r')) + 1;
  return {
    line,
    character: offset - lineStart,
  };
}
