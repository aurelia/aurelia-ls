import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';
import {
  CheckerExpressionTypeEvaluationContext,
} from '../out/type-system/expression-type-context.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
} from '../out/type-system/expression-type-evaluation.js';
import {
  TypeSystemProjectBuilder,
} from '../out/type-system/project.js';
import {
  TypeSystemOverlaySourceBuilder,
} from '../out/type-system/overlay.js';
import {
  TemplateTypeSystemOverlayBuilder,
} from '../out/template/template-type-system-overlay.js';
import {
  TemplateTypeSystemOverlayExpressionProjector,
} from '../out/template/template-type-system-overlay-expression.js';
import {
  templateTypeSystemOverlayExpressionSupportMatrix,
} from '../out/template/template-type-system-overlay-expression-support.js';
import {
  templateTypeSystemOverlayPreludeHelpers,
} from '../out/template/template-type-system-overlay-prelude.js';
import {
  AccessScopeExpression,
  CallScopeExpression,
  Identifier,
  ValueConverterExpression,
} from '../out/expression/ast.js';
import {
  SourceFileRef,
  SourceSpan,
} from '../out/expression/source-span.js';
import {
  readTypeSystemProjectDiagnostics,
  readTypeSystemOverlayDiagnostics,
} from '../out/type-system/diagnostics.js';
import {
  bindingExpressionAstForParse,
} from '../out/template/expression-parse-projection.js';
import {
  bindingScopesForTemplateExpressionParse,
  templateExpressionParsesForResource,
} from '../out/template/template-expression-selection.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/typescript-project-diagnostics');
const templateFixtureRoot = path.join(packageRoot, 'fixtures/pressure/implicit-binding-expression-inference');
const repeatFixtureRoot = path.join(packageRoot, 'fixtures/pressure/repeat-keyed-iterables');
const letFixtureRoot = path.join(packageRoot, 'fixtures/authoring/generated-state-backed-form');
const eventFixtureRoot = path.join(packageRoot, 'fixtures/pressure/listener-method-reference');
const runtimeAssignmentFixtureRoot = path.join(packageRoot, 'fixtures/pressure/synthetic-writeback-local');
const runtimeAssignmentConverterFixtureRoot = path.join(packageRoot, 'fixtures/pressure/synthetic-writeback-converter-local');
const scopeAliasFixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-overlay-scope-aliases');
const valueConverterFixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-overlay-value-converter');
const boundControllerFixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-overlay-bound-controller');
const templateTypeErrorFixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-overlay-type-errors');
const stateSourceFixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-overlay-state-binding-scope');
const stateConditionBoundaryFixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-controller-state-condition-boundary');
const expectedOverlayExpressionKinds = [
  'Identifier',
  'BindingBehavior',
  'ValueConverter',
  'Assign',
  'Conditional',
  'AccessGlobal',
  'AccessThis',
  'AccessBoundary',
  'AccessScope',
  'AccessMember',
  'AccessKeyed',
  'Paren',
  'New',
  'CallScope',
  'CallMember',
  'CallFunction',
  'CallGlobal',
  'Binary',
  'Unary',
  'PrimitiveLiteral',
  'ArrayLiteral',
  'ObjectLiteral',
  'Template',
  'TaggedTemplate',
  'BindingIdentifier',
  'ForOfStatement',
  'Interpolation',
  'BindingPatternDefault',
  'BindingPatternHole',
  'ArrayBindingPattern',
  'ObjectBindingPattern',
  'DestructuringAssignment',
  'ArrowFunction',
  'Custom',
];
const expectedPreludeHelpers = [
  {
    key: 'repeat',
    owner: 'repeat-template-controller',
    emittedNames: ['__au_repeat_is_any', '__au_repeat_item', '__au_repeat'],
  },
  {
    key: 'value-converter',
    owner: 'runtime-value-converter',
    emittedNames: [
      '__au_missing_value_converter',
      '__au_value_converter_caller_context',
      '__au_value_converter_caller_context_value',
      '__au_value_converter_to_view',
    ],
  },
  {
    key: 'event',
    owner: 'listener-binding',
    emittedNames: ['__au_event'],
  },
  {
    key: 'switch-case',
    owner: 'switch-template-controller',
    emittedNames: ['__au_switch_case'],
  },
];
const overlayFileName = path.join(fixtureRoot, '.semantic-runtime', 'overlays', 'contract-proof.ts');
const overlaySource = new TypeSystemOverlaySourceBuilder({
  kind: 'semantic-checker-surface',
  fileName: overlayFileName,
  originKey: 'contract:type-system-overlay',
})
  .append('export const ')
  .appendSegment('overlayContractValue', {
    role: 'contract-proof',
    label: 'overlay contract export',
  })
  .append(": 'overlay-contract' = 'overlay-contract';\n")
  .build();
const overlaySymbolStart = overlaySource.text.indexOf('overlayContractValue');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'type-system-overlay-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'runtime-topology',
});
const overlayTypeSystem = new TypeSystemProjectBuilder().build(
  app.project,
  app.emission.evaluation,
  {
    overlaySources: [overlaySource],
  },
);

const overlaySourceFile = overlayTypeSystem.readProgramSourceFileByPath(overlayFileName);
const moduleSymbol = overlaySourceFile == null
  ? null
  : overlayTypeSystem.checker.getSymbolAtLocation(overlaySourceFile) ?? null;
const overlayExport = moduleSymbol == null
  ? null
  : overlayTypeSystem.checker.getExportsOfModule(moduleSymbol).find((symbol) => symbol.getName() === 'overlayContractValue') ?? null;
const overlayDeclaration = overlayExport?.valueDeclaration ?? overlayExport?.declarations?.[0] ?? overlaySourceFile;
const overlayExportType = overlayExport == null
  ? null
  : overlayTypeSystem.checker.typeToString(
    overlayTypeSystem.checker.getTypeOfSymbolAtLocation(overlayExport, overlayDeclaration),
  );
const overlayMetadata = overlayTypeSystem.readOverlaySourceByPath(overlayFileName);
const overlayProgramMetadata = overlaySourceFile == null
  ? null
  : overlayTypeSystem.readOverlaySourceForProgramSourceFile(overlaySourceFile);
const overlayHasParentPointers = overlaySourceFile?.statements[0]?.parent === overlaySourceFile;
const overlaySegment = overlayTypeSystem.readOverlaySourceSegmentAt(overlayFileName, overlaySymbolStart);
const overlaySegmentEndBoundary = overlayTypeSystem.readOverlaySourceSegmentAt(
  overlayFileName,
  overlaySymbolStart + 'overlayContractValue'.length,
);
const projectDiagnostics = readTypeSystemProjectDiagnostics(overlayTypeSystem);
const overlayDiagnostics = projectDiagnostics.filter((diagnostic) =>
  diagnostic.source?.fileName.replace(/\\/g, '/') === overlayFileName.replace(/\\/g, '/')
);
const clonedProgramRemap = readClonedProgramNodeRemap(overlayTypeSystem);
const templateOverlay = await readTemplateOverlayProbe();
const repeatOverlay = await readRepeatScopeOverlayProbe();
const generatedTemplateOverlay = await readGeneratedTemplateScopeOverlayProbe();
const generatedLetOverlay = await readGeneratedLetScopeOverlayProbe();
const generatedEventOverlay = await readGeneratedEventScopeOverlayProbe();
const generatedRuntimeAssignmentOverlay = await readGeneratedRuntimeAssignmentOverlayProbe();
const generatedRuntimeAssignmentConverterOverlay = await readGeneratedRuntimeAssignmentConverterOverlayProbe();
const generatedScopeAliasOverlay = await readGeneratedScopeAliasOverlayProbe();
const generatedValueConverterOverlay = await readGeneratedValueConverterOverlayProbe();
const generatedValueConverterEvaluator = await readGeneratedValueConverterEvaluatorProbe();
const generatedBoundControllerOverlay = await readGeneratedBoundControllerOverlayProbe();
const generatedStateSourceOverlay = await readGeneratedStateSourceOverlayProbe();
const generatedStateConditionBoundaryOverlay = await readGeneratedStateConditionBoundaryOverlayProbe();
const publicTemplateOverlayDiagnostics = await readPublicTemplateOverlayDiagnosticProbe();
const publicTemplateOverlayCursorDiagnostics = await readPublicTemplateOverlayCursorDiagnosticProbe();
const overlayExpressionSupportKinds = new Set(templateTypeSystemOverlayExpressionSupportMatrix.map((row) => row.expressionKind));
const overlayExpressionSupportByKind = new Map(templateTypeSystemOverlayExpressionSupportMatrix.map((row) => [row.expressionKind, row]));
const preludeHelpersByKey = new Map(templateTypeSystemOverlayPreludeHelpers.map((helper) => [helper.key, helper]));
const generatedChildSpliceOverlay = readGeneratedChildSpliceOverlayProbe();

const failures = [];
const generatedOverlayAnyHoleRows = [
  ['repeat template', generatedTemplateOverlay],
  ['let scope', generatedLetOverlay],
  ['listener event', generatedEventOverlay],
  ['runtime assignment', generatedRuntimeAssignmentOverlay],
  ['runtime assignment converter', generatedRuntimeAssignmentConverterOverlay],
  ['scope alias', generatedScopeAliasOverlay],
  ['value converter', generatedValueConverterOverlay],
  ['bound controller', generatedBoundControllerOverlay],
  ['state source', generatedStateSourceOverlay],
  ['state condition boundary', generatedStateConditionBoundaryOverlay],
];
for (const [label, probe] of generatedOverlayAnyHoleRows) {
  if (probe.generatedAnyHole === true) {
    failures.push(`Expected generated ${label} overlay to preserve weak/unknown facts without emitting undefined as any.`);
  }
}
for (const expected of expectedPreludeHelpers) {
  const helper = preludeHelpersByKey.get(expected.key);
  if (helper == null) {
    failures.push(`Expected overlay prelude helper ${expected.key}.`);
    continue;
  }
  if (helper.owner !== expected.owner) {
    failures.push(`Expected overlay prelude helper ${expected.key} to be owned by ${expected.owner}, observed ${helper.owner}.`);
  }
  if (helper.lines.length === 0) {
    failures.push(`Expected overlay prelude helper ${expected.key} to emit at least one declaration line.`);
  }
  for (const emittedName of expected.emittedNames) {
    if (!helper.emittedNames.includes(emittedName)) {
      failures.push(`Expected overlay prelude helper ${expected.key} to declare emitted name ${emittedName}.`);
    }
    if (!helper.lines.some((line) => line.includes(emittedName))) {
      failures.push(`Expected overlay prelude helper ${expected.key} declaration text to include ${emittedName}.`);
    }
  }
}
for (const helper of templateTypeSystemOverlayPreludeHelpers) {
  if (!expectedPreludeHelpers.some((expected) => expected.key === helper.key)) {
    failures.push(`Unexpected overlay prelude helper ${helper.key}; add it to the contract with an owner before using it.`);
  }
  if (helper.emittedNames.length === 0) {
    failures.push(`Expected overlay prelude helper ${helper.key} to name its emitted declarations.`);
  }
}
for (const expressionKind of expectedOverlayExpressionKinds) {
  if (!overlayExpressionSupportKinds.has(expressionKind)) {
    failures.push(`Expected overlay expression support matrix to include ${expressionKind}.`);
  }
}
for (const row of templateTypeSystemOverlayExpressionSupportMatrix) {
  if (!expectedOverlayExpressionKinds.includes(row.expressionKind)) {
    failures.push(`Unexpected overlay expression support matrix row for ${row.expressionKind}.`);
  }
}
if (overlayExpressionSupportByKind.get('ValueConverter')?.owner !== 'runtime-value-converter-materializer') {
  failures.push('Expected value-converter overlay support to be owned by runtime-value-converter-materializer.');
}
if (overlayExpressionSupportByKind.get('BindingBehavior')?.supportKind !== 'transparent-runtime-wrapper') {
  failures.push('Expected binding-behavior overlay support to be a transparent runtime wrapper.');
}
if (overlayExpressionSupportByKind.get('Custom')?.owner !== 'translation-binding') {
  failures.push('Expected CustomExpression overlay support to point at the translation-binding owner.');
}
if (overlayExpressionSupportByKind.get('ForOfStatement')?.owner !== 'repeat-template-controller') {
  failures.push('Expected ForOfStatement overlay support to point at the repeat template-controller owner.');
}
if (overlaySourceFile == null) {
  failures.push('Expected additional overlay source to be a Program-owned source file.');
}
if (overlayExport == null) {
  failures.push('Expected checker to expose the overlay source export symbol.');
}
if (overlayExportType !== '"overlay-contract"') {
  failures.push(`Expected overlay export type to be the literal contract type, observed ${overlayExportType ?? 'missing'}.`);
}
if (overlayTypeSystem.profile.programRootFiles.overlaySources < 2) {
  failures.push('Expected the augmented TypeSystemProject to include default and additional overlay roots.');
}
if (overlayMetadata?.originKey !== 'contract:type-system-overlay' || overlayProgramMetadata !== overlayMetadata) {
  failures.push('Expected overlay metadata lookup to converge by path and Program SourceFile.');
}
if (!overlayHasParentPointers) {
  failures.push('Expected Program-owned overlays to have parent pointers for checker and source mapping operations.');
}
if (overlaySegment?.role !== 'contract-proof' || overlaySegment.label !== 'overlay contract export') {
  failures.push('Expected overlay generated-span metadata for the checker-visible export.');
}
if (overlaySegmentEndBoundary != null) {
  failures.push('Expected overlay generated-span end offsets to be exclusive.');
}
if (overlayDiagnostics.length > 0) {
  failures.push('Expected hidden overlay sources to stay out of ordinary TypeScript project diagnostics.');
}
if (!clonedProgramRemap.remapped) {
  failures.push('Expected TypeSystemProject.readProgramNode(...) to remap a same-file cloned AST node into the Program source file.');
}
if (clonedProgramRemap.remapStats.spanHits < 1) {
  failures.push('Expected cloned AST remap to register a span hit.');
}
if (templateOverlay.exportType !== 'string') {
  failures.push(`Expected template overlay probe to type value.bind as string, observed ${templateOverlay.exportType ?? 'missing'}.`);
}
if (templateOverlay.templateSourceAddressHandle == null || templateOverlay.templateSourceStart == null) {
  failures.push('Expected template overlay probe to resolve an authored template source address and span.');
}
if (templateOverlay.segment?.role !== 'semantic-surface' || templateOverlay.segment.sourceAddressHandle !== templateOverlay.templateSourceAddressHandle) {
  failures.push('Expected template overlay generated segment to point back to the authored template source address.');
}
if (templateOverlay.diagnostics.length > 0) {
  failures.push('Expected template overlay probe to stay hidden from ordinary TypeScript diagnostics.');
}
if (!templateOverlay.overlayDiagnostics.some((diagnostic) =>
  diagnostic.diagnostic.code === 2339 && diagnostic.authoredSource?.sourceAddressHandle === templateOverlay.templateSourceAddressHandle
)) {
  failures.push('Expected explicit overlay diagnostics to map checker errors back to the authored template source segment.');
}
if (repeatOverlay.crumbPathType !== 'string' || repeatOverlay.alertTitleType !== 'string' || repeatOverlay.actionLabelType !== 'string') {
  failures.push(`Expected repeat-scope overlay to preserve nested local member types, observed crumbPath=${repeatOverlay.crumbPathType ?? 'missing'}, alertTitle=${repeatOverlay.alertTitleType ?? 'missing'}, actionLabel=${repeatOverlay.actionLabelType ?? 'missing'}.`);
}
if (!repeatOverlay.segmentsMapped) {
  failures.push('Expected repeat-scope overlay segments to map nested local reads back to authored template spans.');
}
if (repeatOverlay.diagnostics.length > 0) {
  failures.push('Expected repeat-scope overlay probe to stay hidden from ordinary TypeScript diagnostics.');
}
if (generatedTemplateOverlay.expressionProbeCount < 10 || generatedTemplateOverlay.skippedExpressionCount !== 0) {
  failures.push(`Expected generated template overlay to cover repeat fixture expressions without skips, observed probes=${generatedTemplateOverlay.expressionProbeCount}, skipped=${generatedTemplateOverlay.skippedExpressionCount}.`);
}
if (
  generatedTemplateOverlay.expressionTypes.get('crumb.path') !== 'string'
  || generatedTemplateOverlay.expressionTypes.get('alert.title') !== 'string'
  || generatedTemplateOverlay.expressionTypes.get('action.label') !== 'string'
) {
  failures.push('Expected generated template overlay to infer nested repeat expression types from semantic-runtime BindingScope ancestry.');
}
if (generatedTemplateOverlay.overlayDiagnosticCount !== 0) {
  failures.push('Expected generated template overlay to have no explicit overlay diagnostics for the valid repeat fixture.');
}
if (!generatedTemplateOverlay.preciseDiagnosticMapped) {
  failures.push('Expected copied template overlay diagnostic spans to map back to the exact authored member range.');
}
if (generatedLetOverlay.expressionTypes.get('state.readRequest(requestId)') !== 'ServiceRequest | null') {
  failures.push(`Expected generated let-scope overlay to infer the let source expression as ServiceRequest | null, observed ${generatedLetOverlay.expressionTypes.get('state.readRequest(requestId)') ?? 'missing'}.`);
}
if (generatedLetOverlay.variableTypes.get('request') !== 'ServiceRequest | null') {
  failures.push(`Expected generated let-scope overlay to replay the request local with its TypeChecker type, observed ${generatedLetOverlay.variableTypes.get('request') ?? 'missing'}.`);
}
if (generatedLetOverlay.expressionTypes.get('request.urgent') !== 'boolean') {
  failures.push(`Expected generated conditional template-controller overlay to narrow the request let local before child expressions, observed request.urgent=${generatedLetOverlay.expressionTypes.get('request.urgent') ?? 'missing'}.`);
}
if (generatedLetOverlay.overlayDiagnosticCount !== 0) {
  failures.push('Expected generated let-scope overlay to have no explicit overlay diagnostics for the represented let surface.');
}
if (generatedLetOverlay.skippedExpressionCount !== 0) {
  failures.push(`Expected generated let/branch/listener overlay to cover the state-backed form represented surface without skips, observed ${generatedLetOverlay.skippedReasons.join(', ') || 'none'}.`);
}
if (generatedEventOverlay.expressionTypes.get('state.submitWithEvent($event)') !== 'boolean') {
  failures.push(`Expected generated listener-event overlay to type an explicit $event listener call as boolean, observed ${generatedEventOverlay.expressionTypes.get('state.submitWithEvent($event)') ?? 'missing'}.`);
}
if (generatedEventOverlay.expressionTypes.get('state.submitWithButton($event.currentTarget)') !== 'boolean') {
  failures.push(`Expected generated listener-event overlay to type a currentTarget-refined listener call as boolean, observed ${generatedEventOverlay.expressionTypes.get('state.submitWithButton($event.currentTarget)') ?? 'missing'}.`);
}
if (generatedEventOverlay.generatedGlobalEventMemberTypeExpression !== true) {
  failures.push('Expected generated listener-event overlay to spell DOM event member refinements through a stable global type expression.');
}
if (generatedEventOverlay.overlayDiagnosticCount !== 0 || generatedEventOverlay.skippedExpressionCount !== 0) {
  failures.push(`Expected generated listener-event overlay to have no diagnostics or skips, observed diagnostics=${generatedEventOverlay.overlayDiagnosticCount}, skips=${generatedEventOverlay.skippedExpressionCount}.`);
}
if (
  generatedRuntimeAssignmentOverlay.expressionProbeCount !== 5
  || generatedRuntimeAssignmentOverlay.skippedExpressionCount !== 0
) {
  failures.push(`Expected generated runtime-assignment overlay to cover the synthetic writeback fixture without skips, observed probes=${generatedRuntimeAssignmentOverlay.expressionProbeCount}, skipped=${generatedRuntimeAssignmentOverlay.skippedExpressionCount}.`);
}
if (!sameSet(generatedRuntimeAssignmentOverlay.copiedExpressions, ['rows', '$displayData', '$activeRow', '$activeRow.label', 'row.label'])) {
  failures.push(`Expected generated runtime-assignment overlay to copy exact inline segment expressions, observed ${generatedRuntimeAssignmentOverlay.copiedExpressions.join(', ') || 'none'}.`);
}
if (generatedRuntimeAssignmentOverlay.expressionTypes.get('rows') !== 'readonly SyntheticRow[]') {
  failures.push(`Expected runtime-assignment overlay to preserve the typed data source expression, observed rows=${generatedRuntimeAssignmentOverlay.expressionTypes.get('rows') ?? 'missing'}.`);
}
if (generatedRuntimeAssignmentOverlay.variableTypes.get('$displayData') !== 'readonly SyntheticRow[]') {
  failures.push(`Expected runtime-assignment overlay to preserve same-scope typed writeback locals without display-string annotations, observed $displayData=${generatedRuntimeAssignmentOverlay.variableTypes.get('$displayData') ?? 'missing'}.`);
}
if (generatedRuntimeAssignmentOverlay.variableTypes.get('$activeRow') !== 'SyntheticRow') {
  failures.push(`Expected runtime-assignment overlay to preserve target-member typed writeback locals without display-string annotations, observed $activeRow=${generatedRuntimeAssignmentOverlay.variableTypes.get('$activeRow') ?? 'missing'}.`);
}
if (generatedRuntimeAssignmentOverlay.expressionTypes.get('$activeRow.label') !== 'string') {
  failures.push(`Expected runtime-assignment overlay to let independent writeback locals flow into child content, observed $activeRow.label=${generatedRuntimeAssignmentOverlay.expressionTypes.get('$activeRow.label') ?? 'missing'}.`);
}
if (generatedRuntimeAssignmentOverlay.variableTypes.get('row') !== 'SyntheticRow') {
  failures.push(`Expected runtime-assignment overlay repeat locals to flow from the typed writeback slot, observed row=${generatedRuntimeAssignmentOverlay.variableTypes.get('row') ?? 'missing'}.`);
}
if (!generatedRuntimeAssignmentOverlay.generatedTypeIndexedAccess) {
  failures.push('Expected runtime-assignment overlay to type independent writeback locals through an importable target-member indexed access.');
}
if (generatedRuntimeAssignmentOverlay.overlayDiagnosticCount !== 0) {
  failures.push(`Expected generated runtime-assignment overlay to have no explicit overlay diagnostics for dynamic writeback locals, observed ${generatedRuntimeAssignmentOverlay.overlayDiagnosticCount}.`);
}
for (const local of ['$displayData', '$activeRow']) {
  const row = generatedRuntimeAssignmentOverlay.runtimeAssignmentDataFlows.find((candidate) =>
    candidate.sourceName === local
    && candidate.direction === 'two-way'
  );
  if (row == null) {
    failures.push(`Expected runtime-assignment data flow for ${local} to stay visible beside the overlay slot.`);
    continue;
  }
  if (row.sourceAssignmentKind !== 'runtime-assignable' || row.targetToSourceAssignable !== true) {
    failures.push(`Expected runtime-assignment data flow for ${local} to remain assignable, observed kind=${row.sourceAssignmentKind}, targetToSource=${row.targetToSourceAssignable}.`);
  }
  if (row.sourceAssignmentTargetSourcePath !== 'src/synthetic-writeback-local-app.html') {
    failures.push(`Expected runtime-assignment data flow for ${local} to route assignment target source to the template writeback local, observed ${row.sourceAssignmentTargetSourcePath ?? 'missing'}.`);
  }
}
if (generatedRuntimeAssignmentConverterOverlay.expressionTypes.get('$selectedId.toUpperCase()') !== 'string') {
  failures.push(`Expected converter-backed runtime-assignment overlay to type the synthetic local as the converter fromView result, observed $selectedId.toUpperCase()=${generatedRuntimeAssignmentConverterOverlay.expressionTypes.get('$selectedId.toUpperCase()') ?? 'missing'}.`);
}
if (generatedRuntimeAssignmentConverterOverlay.variableTypes.get('$selectedId') !== 'string') {
  failures.push(`Expected converter-backed runtime-assignment local to be declared as string, observed ${generatedRuntimeAssignmentConverterOverlay.variableTypes.get('$selectedId') ?? 'missing'}.`);
}
if (!generatedRuntimeAssignmentConverterOverlay.generatedPrimitiveTypeExpression) {
  failures.push('Expected converter-backed runtime-assignment overlay to emit a primitive source-local type expression instead of degrading to any.');
}
if (generatedRuntimeAssignmentConverterOverlay.generatedTargetMemberIndexedAccess) {
  failures.push('Expected converter-backed runtime-assignment overlay not to use the target bindable member type after fromView changes the source-local type.');
}
const converterWritebackRow = generatedRuntimeAssignmentConverterOverlay.runtimeAssignmentDataFlows.find((row) =>
  row.sourceName === '$selectedId'
  && row.direction === 'two-way'
);
if (converterWritebackRow == null) {
  failures.push('Expected converter-backed runtime-assignment data flow to publish the $selectedId writeback row.');
} else {
  if (converterWritebackRow.sourceAssignmentKind !== 'runtime-assignable' || converterWritebackRow.targetToSourceAssignable !== true) {
    failures.push(`Expected converter-backed runtime-assignment data flow to remain assignable, observed kind=${converterWritebackRow.sourceAssignmentKind}, targetToSource=${converterWritebackRow.targetToSourceAssignable}.`);
  }
  if (converterWritebackRow.sourceAssignmentTargetType !== 'string') {
    failures.push(`Expected converter-backed runtime-assignment data flow to assign the converter fromView result string, observed ${converterWritebackRow.sourceAssignmentTargetType ?? 'missing'}.`);
  }
  if (converterWritebackRow.sourceAssignmentTargetSourcePath !== 'src/synthetic-writeback-converter-local-app.html') {
    failures.push(`Expected converter-backed runtime-assignment data flow to route assignment target source to the template writeback local, observed ${converterWritebackRow.sourceAssignmentTargetSourcePath ?? 'missing'}.`);
  }
}
if (generatedScopeAliasOverlay.expressionProbeCount !== 21 || generatedScopeAliasOverlay.skippedExpressionCount !== 0) {
  failures.push(`Expected generated scope-alias overlay to cover current and parent scope aliases without skips, observed probes=${generatedScopeAliasOverlay.expressionProbeCount}, skipped=${generatedScopeAliasOverlay.skippedExpressionCount}.`);
}
if (generatedScopeAliasOverlay.expressionTypes.get('title.length > 0') !== 'boolean') {
  failures.push(`Expected generated scope-alias overlay to replay non-narrowing if conditions, observed title.length > 0=${generatedScopeAliasOverlay.expressionTypes.get('title.length > 0') ?? 'missing'}.`);
}
if (generatedScopeAliasOverlay.expressionTypes.get('title.toUpperCase()') !== 'string') {
  failures.push(`Expected generated scope-alias overlay to replay fallback if branch expressions, observed title.toUpperCase()=${generatedScopeAliasOverlay.expressionTypes.get('title.toUpperCase()') ?? 'missing'}.`);
}
if (generatedScopeAliasOverlay.expressionTypes.get('title.toLowerCase()') !== 'string') {
  failures.push(`Expected generated scope-alias overlay to replay fallback else branch expressions through the previous if condition, observed title.toLowerCase()=${generatedScopeAliasOverlay.expressionTypes.get('title.toLowerCase()') ?? 'missing'}.`);
}
if (generatedScopeAliasOverlay.expressionTypes.get('$parent.selectById(id)') !== 'boolean') {
  failures.push(`Expected generated scope-alias overlay to preserve value-scope listener parent calls as boolean, observed $parent.selectById(id)=${generatedScopeAliasOverlay.expressionTypes.get('$parent.selectById(id)') ?? 'missing'}.`);
}
if (generatedScopeAliasOverlay.expressionTypes.get('label') !== 'string') {
  failures.push(`Expected generated scope-alias overlay to preserve value-scope current binding-context member types, observed label=${generatedScopeAliasOverlay.expressionTypes.get('label') ?? 'missing'}.`);
}
if (!isStringLikeOverlayType(generatedScopeAliasOverlay.expressionTypes.get('$this.title'))) {
  failures.push(`Expected generated scope-alias overlay to type current binding-context aliases as string, observed $this.title=${generatedScopeAliasOverlay.expressionTypes.get('$this.title') ?? 'missing'}.`);
}
if (generatedScopeAliasOverlay.expressionTypes.get('$this.titleLength()') !== 'number') {
  failures.push(`Expected generated scope-alias overlay to type current binding-context alias calls as number, observed $this.titleLength()=${generatedScopeAliasOverlay.expressionTypes.get('$this.titleLength()') ?? 'missing'}.`);
}
if (!isStringLikeOverlayType(generatedScopeAliasOverlay.expressionTypes.get('$parent.title'))) {
  failures.push(`Expected generated scope-alias overlay to type parent binding-context aliases as string, observed $parent.title=${generatedScopeAliasOverlay.expressionTypes.get('$parent.title') ?? 'missing'}.`);
}
if (generatedScopeAliasOverlay.expressionTypes.get('$parent.titleLength()') !== 'number') {
  failures.push(`Expected generated scope-alias overlay to type parent binding-context alias calls as number, observed $parent.titleLength()=${generatedScopeAliasOverlay.expressionTypes.get('$parent.titleLength()') ?? 'missing'}.`);
}
if (generatedScopeAliasOverlay.expressionTypes.get('$index') !== 'number') {
  failures.push(`Expected generated scope-alias overlay to declare repeat override local $index as number, observed ${generatedScopeAliasOverlay.expressionTypes.get('$index') ?? 'missing'}.`);
}
if (generatedScopeAliasOverlay.expressionTypes.get('title') !== 'string') {
  failures.push(`Expected generated scope-alias overlay to unwrap binding-behavior value expressions as title:string, observed ${generatedScopeAliasOverlay.expressionTypes.get('title') ?? 'missing'}.`);
}
if (generatedScopeAliasOverlay.expressionTypes.get('item.label') !== 'string') {
  failures.push(`Expected generated scope-alias overlay to preserve repeat item member type, observed item.label=${generatedScopeAliasOverlay.expressionTypes.get('item.label') ?? 'missing'}.`);
}
if (generatedScopeAliasOverlay.expressionTypes.get('$this.item.label') !== 'string') {
  failures.push(`Expected generated scope-alias overlay to represent identifier-repeat $this as the BindingContext object, observed $this.item.label=${generatedScopeAliasOverlay.expressionTypes.get('$this.item.label') ?? 'missing'}.`);
}
if (generatedScopeAliasOverlay.expressionTypes.get('$this.key') !== 'string') {
  failures.push(`Expected generated scope-alias overlay to type destructured repeat current binding-context keys as string, observed $this.key=${generatedScopeAliasOverlay.expressionTypes.get('$this.key') ?? 'missing'}.`);
}
if (generatedScopeAliasOverlay.expressionTypes.get('$this.entry.label') !== 'string') {
  failures.push(`Expected generated scope-alias overlay to type destructured repeat current binding-context entries as AliasItem, observed $this.entry.label=${generatedScopeAliasOverlay.expressionTypes.get('$this.entry.label') ?? 'missing'}.`);
}
if (generatedScopeAliasOverlay.expressionTypes.get('child.label') !== 'string') {
  failures.push(`Expected generated scope-alias overlay to preserve nested repeat item member type, observed child.label=${generatedScopeAliasOverlay.expressionTypes.get('child.label') ?? 'missing'}.`);
}
if (generatedScopeAliasOverlay.expressionTypes.get('$parent.item.label') !== 'string') {
  failures.push(`Expected generated scope-alias overlay to preserve immediate parent binding-context type in nested repeats, observed $parent.item.label=${generatedScopeAliasOverlay.expressionTypes.get('$parent.item.label') ?? 'missing'}.`);
}
if (generatedScopeAliasOverlay.expressionTypes.get('$parent.item.labelLength()') !== 'number') {
  failures.push(`Expected generated scope-alias overlay to preserve immediate parent binding-context member call types in nested repeats, observed $parent.item.labelLength()=${generatedScopeAliasOverlay.expressionTypes.get('$parent.item.labelLength()') ?? 'missing'}.`);
}
if (!isStringLikeOverlayType(generatedScopeAliasOverlay.expressionTypes.get('$parent.$parent.title'))) {
  failures.push(`Expected generated scope-alias overlay to preserve grandparent binding-context type in nested repeats, observed $parent.$parent.title=${generatedScopeAliasOverlay.expressionTypes.get('$parent.$parent.title') ?? 'missing'}.`);
}
if (!isStringLikeOverlayType(generatedScopeAliasOverlay.expressionTypes.get('this.title'))) {
  failures.push(`Expected generated scope-alias overlay to preserve boundary this access through the resource view-model type, observed this.title=${generatedScopeAliasOverlay.expressionTypes.get('this.title') ?? 'missing'}.`);
}
if (generatedScopeAliasOverlay.overlayDiagnosticCount !== 0) {
  failures.push(`Expected generated scope-alias overlay to avoid name-resolution diagnostics for represented repeat override locals, observed ${generatedScopeAliasOverlay.overlayDiagnosticCount}.`);
}
if (generatedScopeAliasOverlay.nonSourceObservedDependencyCount !== 0) {
  failures.push(`Expected generated scope-alias fixture observed dependencies to stay source-backed after repeat BindingContext aliasing, observed non-source rows=${generatedScopeAliasOverlay.nonSourceObservedDependencyCount}.`);
}
if (generatedValueConverterOverlay.expressionProbeCount !== 10 || generatedValueConverterOverlay.skippedExpressionCount !== 0) {
  failures.push(`Expected generated value-converter overlay to cover interpolation, condition, and repeat expressions without skips, observed probes=${generatedValueConverterOverlay.expressionProbeCount}, skipped=${generatedValueConverterOverlay.skippedExpressionCount}.`);
}
for (const [expression, type] of generatedValueConverterOverlay.expressionTypes) {
  if (expression.includes('dynamicContextualWord')) {
    if (!isStringNumberUnionOverlayType(type)) {
      failures.push(`Expected dynamic value-converter overlay call to infer both strict-true runtime branches, observed ${type ?? 'missing'} for ${expression}.`);
    }
    continue;
  }
  if (type !== 'string') {
    failures.push(`Expected generated value-converter overlay call to infer the converter toView return as string, observed ${type ?? 'missing'} for ${expression}.`);
  }
}
if (!generatedValueConverterOverlay.hasDynamicWithContextBranch) {
  failures.push('Expected generated value-converter overlay to model dynamic withContext through both strict-true runtime branches.');
}
if (generatedValueConverterEvaluator.kind !== 'type' || !isStringNumberUnionOverlayType(generatedValueConverterEvaluator.display)) {
  failures.push(`Expected direct TypeChecker expression evaluator to infer the dynamic value-converter return as string | number, observed kind=${generatedValueConverterEvaluator.kind}, display=${generatedValueConverterEvaluator.display ?? 'missing'}, openKind=${generatedValueConverterEvaluator.openKind ?? 'none'}.`);
}
if (generatedChildSpliceOverlay.text !== 'formatWordCount(__au_vc_wordCount.toView(message, minimumCount))') {
  failures.push(`Expected generated child overlay expressions to splice into parent TypeScript-shaped source, observed ${generatedChildSpliceOverlay.text}.`);
}
if (!generatedChildSpliceOverlay.hasParentPrefixSegment || !generatedChildSpliceOverlay.hasChildGeneratedCall) {
  failures.push('Expected generated child splice overlay to preserve parent source segments and child generated call parts.');
}
if (generatedValueConverterOverlay.variableTypes.get('word') !== 'string') {
  failures.push(`Expected generated value-converter overlay repeat source to infer repeated word locals as string, observed ${generatedValueConverterOverlay.variableTypes.get('word') ?? 'missing'}.`);
}
if (!generatedValueConverterOverlay.hasArgumentMismatch || !generatedValueConverterOverlay.argumentMismatchMappedToMinimumText) {
  failures.push('Expected generated value-converter overlay to surface the invalid converter argument as a TS2345 row mapped to the authored argument span.');
}
if (!generatedValueConverterOverlay.argumentMismatchHasSemanticProductHandle) {
  failures.push('Expected generated value-converter overlay diagnostics to retain the semantic product handle that produced the generated source segment.');
}
if (generatedBoundControllerOverlay.expressionProbeCount !== 3 || generatedBoundControllerOverlay.skippedExpressionCount !== 0) {
  failures.push(`Expected generated bound-controller overlay to cover child callback expressions without skips, observed probes=${generatedBoundControllerOverlay.expressionProbeCount}, skipped=${generatedBoundControllerOverlay.skippedExpressionCount}.`);
}
if (generatedBoundControllerOverlay.variableTypes.get('onAction') !== '(action: OverlayAction) => boolean') {
  failures.push(`Expected child root alias to use the parent-bound callback type, observed ${generatedBoundControllerOverlay.variableTypes.get('onAction') ?? 'missing'}.`);
}
if (generatedBoundControllerOverlay.expressionTypes.get('onAction(action)') !== 'boolean') {
  failures.push(`Expected child callback calls to type-check with the parent-bound argument type, observed ${generatedBoundControllerOverlay.expressionTypes.get('onAction(action)') ?? 'missing'}.`);
}
if (generatedBoundControllerOverlay.overlayDiagnosticCodes.includes(2554)) {
  failures.push('Expected parent-bound callback flow to avoid false TS2554 arity diagnostics in the child template overlay.');
}
if (generatedBoundControllerOverlay.overlayDiagnosticCount !== 0) {
  failures.push(`Expected generated bound-controller overlay to have no explicit overlay diagnostics for the represented callback binding, observed ${generatedBoundControllerOverlay.overlayDiagnosticCount}.`);
}
if (generatedStateSourceOverlay.expressionProbeCount !== 6 || generatedStateSourceOverlay.skippedExpressionCount !== 0) {
  failures.push(`Expected generated state-source overlay to cover state binding sources without skips, observed probes=${generatedStateSourceOverlay.expressionProbeCount}, skipped=${generatedStateSourceOverlay.skippedExpressionCount}.`);
}
if (generatedStateSourceOverlay.overlayDiagnosticCount !== 0) {
  failures.push(`Expected generated state-source overlay to have no explicit overlay diagnostics, observed ${generatedStateSourceOverlay.overlayDiagnosticCount}.`);
}
if (generatedStateSourceOverlay.selectedExpressionTypes.stateTitle !== 'string') {
  failures.push(`Expected state-source overlay to infer default-store title as string, observed ${generatedStateSourceOverlay.selectedExpressionTypes.stateTitle ?? 'missing'}.`);
}
if (generatedStateSourceOverlay.selectedExpressionTypes.namedStoreLabel !== 'string') {
  failures.push(`Expected state-source overlay to infer named-store label as string, observed ${generatedStateSourceOverlay.selectedExpressionTypes.namedStoreLabel ?? 'missing'}.`);
}
if (generatedStateSourceOverlay.selectedExpressionTypes.stateCondition !== 'boolean') {
  failures.push(`Expected state-source overlay to infer state-backed condition as boolean, observed ${generatedStateSourceOverlay.selectedExpressionTypes.stateCondition ?? 'missing'}.`);
}
if (generatedStateSourceOverlay.variableTypes.get('task') !== 'TaskItem') {
  failures.push(`Expected state-source repeat overlay to infer task local as TaskItem, observed ${generatedStateSourceOverlay.variableTypes.get('task') ?? 'missing'}.`);
}
if (generatedStateSourceOverlay.bindingScopeTypes.repeatedTask !== 'TaskItem') {
  failures.push(`Expected state-source repeat BindingScope slot to infer task local as TaskItem, observed ${generatedStateSourceOverlay.bindingScopeTypes.repeatedTask ?? 'missing'}.`);
}
if (generatedStateSourceOverlay.bindingScopeTypes.boundTasks !== 'readonly TaskItem[]') {
  failures.push(`Expected state-source child bindable BindingScope slot to infer tasks as readonly TaskItem[], observed ${generatedStateSourceOverlay.bindingScopeTypes.boundTasks ?? 'missing'}.`);
}
if (generatedStateSourceOverlay.expressionTypes.get('task.title') !== 'string') {
  failures.push(`Expected state-source repeat overlay to infer task.title as string, observed ${generatedStateSourceOverlay.expressionTypes.get('task.title') ?? 'missing'}.`);
}
if (!isStringLikeOverlayType(generatedStateSourceOverlay.expressionTypes.get('$parent.title'))) {
  failures.push(`Expected state-source repeat overlay to keep repeat child $parent on the view-model, observed ${generatedStateSourceOverlay.expressionTypes.get('$parent.title') ?? 'missing'}.`);
}
if (generatedStateConditionBoundaryOverlay.skippedExpressionCount !== 0) {
  failures.push(`Expected state-condition boundary overlay to cover source-scope expressions without skips, observed ${generatedStateConditionBoundaryOverlay.skippedExpressionCount}.`);
}
if (!generatedStateConditionBoundaryOverlay.hasOrdinaryChildStateBoundaryDiagnostic) {
  failures.push('Expected ordinary child bindings under a state-backed if.bind condition to stay outside the state-store source scope.');
}
if (generatedStateConditionBoundaryOverlay.stateBoundChildType !== 'string') {
  failures.push(`Expected child binding that also uses & state to infer selectedTask.title as string, observed ${generatedStateConditionBoundaryOverlay.stateBoundChildType ?? 'missing'}.`);
}
if (publicTemplateOverlayDiagnostics.overlayRows !== 4) {
  failures.push(`Expected public template diagnostics to surface only the non-duplicated TypeScript overlay row, observed ${publicTemplateOverlayDiagnostics.overlayRows}.`);
}
if (
  !publicTemplateOverlayDiagnostics.hasArgumentMismatch
  || !publicTemplateOverlayDiagnostics.hasArityMismatch
  || !publicTemplateOverlayDiagnostics.hasNullishAccess
  || !publicTemplateOverlayDiagnostics.hasUnknownRepeatLocal
) {
  failures.push('Expected public template overlay diagnostics to keep TypeScript-native argument, arity, nullish, and unknown-repeat rows that semantic missing-member diagnostics do not already own.');
}
if (publicTemplateOverlayDiagnostics.hasRepeatMissingLabel || publicTemplateOverlayDiagnostics.hasNarrowedMissingStatus) {
  failures.push('Expected public template overlay diagnostics to suppress missing-member rows already owned by semantic template diagnostics on the same authored span.');
}
if (
  !publicTemplateOverlayCursorDiagnostics.hasArgumentMismatch
  || !publicTemplateOverlayCursorDiagnostics.hasArityMismatch
  || !publicTemplateOverlayCursorDiagnostics.hasNullishAccess
  || !publicTemplateOverlayCursorDiagnostics.hasUnknownRepeatLocal
) {
  failures.push('Expected template cursor-info to surface TypeScript overlay argument, arity, nullish, and unknown-repeat diagnostics at the active authored expression span.');
}
if (
  !publicTemplateOverlayCursorDiagnostics.hasUnknownRepeatMemberNoMembers
  || publicTemplateOverlayCursorDiagnostics.hasUnknownRepeatMemberMissingSlotType
) {
  failures.push('Expected unknown repeat member cursor diagnostics to preserve an explicit unknown owner type instead of degrading to a missing-slot-type seam.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    overlayRootFiles: overlayTypeSystem.profile.programRootFiles,
    overlayRootFileGroups: overlayTypeSystem.profile.programRootFileGroups,
    overlayExportType,
    overlayMetadata,
    overlayHasParentPointers,
    overlaySegment,
    overlaySegmentEndBoundary,
    overlayDiagnostics,
    clonedProgramRemap,
    templateOverlay,
    repeatOverlay,
    generatedTemplateOverlay: {
      ...generatedTemplateOverlay,
      expressionTypes: [...generatedTemplateOverlay.expressionTypes.entries()],
    },
    generatedLetOverlay: {
      ...generatedLetOverlay,
      expressionTypes: [...generatedLetOverlay.expressionTypes.entries()],
      variableTypes: [...generatedLetOverlay.variableTypes.entries()],
    },
    generatedEventOverlay: {
      ...generatedEventOverlay,
      expressionTypes: [...generatedEventOverlay.expressionTypes.entries()],
    },
    generatedRuntimeAssignmentOverlay: {
      ...generatedRuntimeAssignmentOverlay,
      expressionTypes: [...generatedRuntimeAssignmentOverlay.expressionTypes.entries()],
      variableTypes: [...generatedRuntimeAssignmentOverlay.variableTypes.entries()],
    },
    generatedRuntimeAssignmentConverterOverlay: {
      ...generatedRuntimeAssignmentConverterOverlay,
      expressionTypes: [...generatedRuntimeAssignmentConverterOverlay.expressionTypes.entries()],
      variableTypes: [...generatedRuntimeAssignmentConverterOverlay.variableTypes.entries()],
    },
    generatedScopeAliasOverlay: {
      ...generatedScopeAliasOverlay,
      expressionTypes: [...generatedScopeAliasOverlay.expressionTypes.entries()],
    },
    generatedValueConverterOverlay,
    generatedChildSpliceOverlay,
    templateTypeSystemOverlayPreludeHelpers,
    overlayExpressionSupportMatrix: templateTypeSystemOverlayExpressionSupportMatrix,
    generatedBoundControllerOverlay: {
      ...generatedBoundControllerOverlay,
      expressionTypes: [...generatedBoundControllerOverlay.expressionTypes.entries()],
      variableTypes: [...generatedBoundControllerOverlay.variableTypes.entries()],
    },
    generatedStateSourceOverlay: {
      ...generatedStateSourceOverlay,
      expressionTypes: [...generatedStateSourceOverlay.expressionTypes.entries()],
      variableTypes: [...generatedStateSourceOverlay.variableTypes.entries()],
    },
    generatedStateConditionBoundaryOverlay: {
      ...generatedStateConditionBoundaryOverlay,
      expressionTypes: [...generatedStateConditionBoundaryOverlay.expressionTypes.entries()],
    },
    publicTemplateOverlayDiagnostics,
    publicTemplateOverlayCursorDiagnostics,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      overlayRootSources: overlayTypeSystem.profile.programRootFiles.overlaySources,
      overlayRootGroups: overlayTypeSystem.profile.programRootFileGroups
        .filter((row) => row.groupKind === 'overlay-source')
        .map((row) => ({
          groupKey: row.groupKey,
          sourceFiles: row.sourceFiles,
        })),
      generatedOverlayAnyHolePolicy: generatedOverlayAnyHoleRows.map(([label, probe]) => ({
        label,
        generatedAnyHole: probe.generatedAnyHole === true,
      })),
      overlayExportType,
      overlayHasParentPointers,
      overlaySegmentRole: overlaySegment?.role ?? null,
      overlaySegmentEndExclusive: overlaySegmentEndBoundary == null,
      templateTypeSystemOverlayPreludeHelpers: templateTypeSystemOverlayPreludeHelpers.map((helper) => ({
        key: helper.key,
        owner: helper.owner,
        emittedNames: helper.emittedNames,
        declarationLines: helper.lines.length,
      })),
      clonedAstRemapped: clonedProgramRemap.remapped,
      clonedAstSpanHits: clonedProgramRemap.remapStats.spanHits,
      templateOverlayExportType: templateOverlay.exportType,
      templateOverlaySegmentRole: templateOverlay.segment?.role ?? null,
      templateOverlayDiagnosticCodes: templateOverlay.overlayDiagnostics.map((diagnostic) => diagnostic.diagnostic.code),
      repeatOverlayTypes: {
        crumbPath: repeatOverlay.crumbPathType,
        alertTitle: repeatOverlay.alertTitleType,
        actionLabel: repeatOverlay.actionLabelType,
      },
      generatedTemplateOverlay: {
        expressionProbeCount: generatedTemplateOverlay.expressionProbeCount,
        skippedExpressionCount: generatedTemplateOverlay.skippedExpressionCount,
        selectedExpressionTypes: {
          crumbPath: generatedTemplateOverlay.expressionTypes.get('crumb.path'),
          alertTitle: generatedTemplateOverlay.expressionTypes.get('alert.title'),
          actionLabel: generatedTemplateOverlay.expressionTypes.get('action.label'),
        },
        preciseDiagnosticMapped: generatedTemplateOverlay.preciseDiagnosticMapped,
      },
      generatedLetOverlay: {
        expressionProbeCount: generatedLetOverlay.expressionProbeCount,
        skippedExpressionCount: generatedLetOverlay.skippedExpressionCount,
        selectedExpressionTypes: {
          letSource: generatedLetOverlay.expressionTypes.get('state.readRequest(requestId)'),
          letGuard: generatedLetOverlay.expressionTypes.get('request != null'),
          narrowedUrgent: generatedLetOverlay.expressionTypes.get('request.urgent'),
        },
        selectedVariableTypes: {
          request: generatedLetOverlay.variableTypes.get('request'),
        },
        skippedExpressionCount: generatedLetOverlay.skippedExpressionCount,
      },
      generatedEventOverlay: {
        expressionProbeCount: generatedEventOverlay.expressionProbeCount,
        skippedExpressionCount: generatedEventOverlay.skippedExpressionCount,
        generatedGlobalEventMemberTypeExpression: generatedEventOverlay.generatedGlobalEventMemberTypeExpression,
        selectedExpressionTypes: {
          explicitEventCall: generatedEventOverlay.expressionTypes.get('state.submitWithEvent($event)'),
          refinedCurrentTargetCall: generatedEventOverlay.expressionTypes.get('state.submitWithButton($event.currentTarget)'),
        },
      },
      generatedRuntimeAssignmentOverlay: {
        expressionProbeCount: generatedRuntimeAssignmentOverlay.expressionProbeCount,
        skippedExpressionCount: generatedRuntimeAssignmentOverlay.skippedExpressionCount,
        copiedExpressions: generatedRuntimeAssignmentOverlay.copiedExpressions,
        selectedExpressionTypes: {
          rows: generatedRuntimeAssignmentOverlay.expressionTypes.get('rows'),
          writebackLocal: generatedRuntimeAssignmentOverlay.expressionTypes.get('$displayData'),
          independentWritebackLocal: generatedRuntimeAssignmentOverlay.expressionTypes.get('$activeRow'),
          independentWritebackLabel: generatedRuntimeAssignmentOverlay.expressionTypes.get('$activeRow.label'),
          rowLabel: generatedRuntimeAssignmentOverlay.expressionTypes.get('row.label'),
        },
        selectedVariableTypes: {
          writebackLocal: generatedRuntimeAssignmentOverlay.variableTypes.get('$displayData'),
          independentWritebackLocal: generatedRuntimeAssignmentOverlay.variableTypes.get('$activeRow'),
          row: generatedRuntimeAssignmentOverlay.variableTypes.get('row'),
        },
        generatedTypeIndexedAccess: generatedRuntimeAssignmentOverlay.generatedTypeIndexedAccess,
        runtimeAssignmentDataFlows: generatedRuntimeAssignmentOverlay.runtimeAssignmentDataFlows,
      },
      generatedRuntimeAssignmentConverterOverlay: {
        expressionProbeCount: generatedRuntimeAssignmentConverterOverlay.expressionProbeCount,
        skippedExpressionCount: generatedRuntimeAssignmentConverterOverlay.skippedExpressionCount,
        copiedExpressions: generatedRuntimeAssignmentConverterOverlay.copiedExpressions,
        selectedExpressionTypes: {
          selectedId: generatedRuntimeAssignmentConverterOverlay.expressionTypes.get('$selectedId'),
          selectedIdCall: generatedRuntimeAssignmentConverterOverlay.expressionTypes.get('$selectedId.toUpperCase()'),
        },
        selectedVariableTypes: {
          selectedId: generatedRuntimeAssignmentConverterOverlay.variableTypes.get('$selectedId'),
        },
        generatedPrimitiveTypeExpression: generatedRuntimeAssignmentConverterOverlay.generatedPrimitiveTypeExpression,
        generatedTargetMemberIndexedAccess: generatedRuntimeAssignmentConverterOverlay.generatedTargetMemberIndexedAccess,
        runtimeAssignmentDataFlows: generatedRuntimeAssignmentConverterOverlay.runtimeAssignmentDataFlows,
      },
      generatedScopeAliasOverlay: {
        expressionProbeCount: generatedScopeAliasOverlay.expressionProbeCount,
        skippedExpressionCount: generatedScopeAliasOverlay.skippedExpressionCount,
        selectedExpressionTypes: {
          currentBindingContext: generatedScopeAliasOverlay.expressionTypes.get('$this.title'),
          currentBindingContextCall: generatedScopeAliasOverlay.expressionTypes.get('$this.titleLength()'),
          valueScopeListenerParentCall: generatedScopeAliasOverlay.expressionTypes.get('$parent.selectById(id)'),
          valueScopeMember: generatedScopeAliasOverlay.expressionTypes.get('label'),
          bindingBehaviorInner: generatedScopeAliasOverlay.expressionTypes.get('title'),
          repeatIndex: generatedScopeAliasOverlay.expressionTypes.get('$index'),
          itemLabel: generatedScopeAliasOverlay.expressionTypes.get('item.label'),
          currentRepeatBindingContextItemLabel: generatedScopeAliasOverlay.expressionTypes.get('$this.item.label'),
          parentBindingContext: generatedScopeAliasOverlay.expressionTypes.get('$parent.title'),
          parentBindingContextCall: generatedScopeAliasOverlay.expressionTypes.get('$parent.titleLength()'),
          destructuredCurrentKey: generatedScopeAliasOverlay.expressionTypes.get('$this.key'),
          destructuredCurrentEntryLabel: generatedScopeAliasOverlay.expressionTypes.get('$this.entry.label'),
          nestedChildLabel: generatedScopeAliasOverlay.expressionTypes.get('child.label'),
          nestedParentItemLabel: generatedScopeAliasOverlay.expressionTypes.get('$parent.item.label'),
          nestedParentCall: generatedScopeAliasOverlay.expressionTypes.get('$parent.item.labelLength()'),
          nestedGrandparentTitle: generatedScopeAliasOverlay.expressionTypes.get('$parent.$parent.title'),
          boundaryThisTitle: generatedScopeAliasOverlay.expressionTypes.get('this.title'),
        },
        nonSourceObservedDependencyCount: generatedScopeAliasOverlay.nonSourceObservedDependencyCount,
        skippedSummaries: generatedScopeAliasOverlay.skippedSummaries,
      },
      generatedValueConverterOverlay: {
        expressionProbeCount: generatedValueConverterOverlay.expressionProbeCount,
        skippedExpressionCount: generatedValueConverterOverlay.skippedExpressionCount,
        generatedCallTypes: generatedValueConverterOverlay.generatedCallTypes,
        hasDynamicWithContextBranch: generatedValueConverterOverlay.hasDynamicWithContextBranch,
        dynamicEvaluatorType: generatedValueConverterEvaluator.display,
        selectedVariableTypes: {
          word: generatedValueConverterOverlay.variableTypes.get('word') ?? null,
        },
        diagnosticCodes: generatedValueConverterOverlay.diagnosticCodes,
        argumentMismatchMappedToMinimumText: generatedValueConverterOverlay.argumentMismatchMappedToMinimumText,
        argumentMismatchHasSemanticProductHandle: generatedValueConverterOverlay.argumentMismatchHasSemanticProductHandle,
      },
      generatedChildSpliceOverlay,
      overlayExpressionSupportMatrix: {
        rows: templateTypeSystemOverlayExpressionSupportMatrix.length,
        resourceLowered: templateTypeSystemOverlayExpressionSupportMatrix
          .filter((row) => row.supportKind === 'resource-lowered-call')
          .map((row) => row.expressionKind),
        ownerHandled: templateTypeSystemOverlayExpressionSupportMatrix
          .filter((row) => row.supportKind.endsWith('owner-handled'))
          .map((row) => row.expressionKind),
        generatedChildCapable: templateTypeSystemOverlayExpressionSupportMatrix
          .filter((row) => row.canContainGeneratedChildren)
          .map((row) => row.expressionKind),
      },
      generatedBoundControllerOverlay: {
        expressionProbeCount: generatedBoundControllerOverlay.expressionProbeCount,
        skippedExpressionCount: generatedBoundControllerOverlay.skippedExpressionCount,
        selectedExpressionTypes: {
          callbackCall: generatedBoundControllerOverlay.expressionTypes.get('onAction(action)'),
        },
        selectedVariableTypes: {
          onAction: generatedBoundControllerOverlay.variableTypes.get('onAction') ?? null,
        },
        overlayDiagnosticCodes: generatedBoundControllerOverlay.overlayDiagnosticCodes,
      },
      generatedStateSourceOverlay: {
        expressionProbeCount: generatedStateSourceOverlay.expressionProbeCount,
        skippedExpressionCount: generatedStateSourceOverlay.skippedExpressionCount,
        selectedExpressionTypes: generatedStateSourceOverlay.selectedExpressionTypes,
        selectedVariableTypes: {
          task: generatedStateSourceOverlay.variableTypes.get('task') ?? null,
        },
        bindingScopeTypes: generatedStateSourceOverlay.bindingScopeTypes,
      },
      generatedStateConditionBoundaryOverlay: {
        expressionProbeCount: generatedStateConditionBoundaryOverlay.expressionProbeCount,
        skippedExpressionCount: generatedStateConditionBoundaryOverlay.skippedExpressionCount,
        diagnosticCodes: generatedStateConditionBoundaryOverlay.diagnosticCodes,
        hasOrdinaryChildStateBoundaryDiagnostic: generatedStateConditionBoundaryOverlay.hasOrdinaryChildStateBoundaryDiagnostic,
        stateBoundChildType: generatedStateConditionBoundaryOverlay.stateBoundChildType,
      },
      publicTemplateOverlayDiagnostics,
      publicTemplateOverlayCursorDiagnostics,
      projectDiagnosticRows: projectDiagnostics.length,
    },
  }, null, 2));
}

function readClonedProgramNodeRemap(typeSystem) {
  const source = typeSystem.readProjectProgramSourceFiles()
    .find((sourceFile) => sourceFile.statements.length > 0);
  if (source == null) {
    return {
      remapped: false,
      remapStats: typeSystem.readProgramNodeRemapStats(),
      sourceFileName: null,
    };
  }
  const cloned = ts.createSourceFile(
    source.fileName,
    source.text,
    source.languageVersion,
    true,
    source.scriptKind,
  );
  const clonedNode = firstNamedDeclarationName(cloned) ?? cloned.statements[0] ?? cloned;
  const remapped = typeSystem.readProgramNode(clonedNode);
  return {
    remapped: remapped != null && remapped !== clonedNode && remapped.getSourceFile() === source,
    remapStats: typeSystem.readProgramNodeRemapStats(),
    sourceFileName: source.fileName,
  };
}

function firstNamedDeclarationName(sourceFile) {
  for (const statement of sourceFile.statements) {
    const name = statement.name ?? null;
    if (name != null && ts.isIdentifier(name)) {
      return name;
    }
  }
  return null;
}

async function readTemplateOverlayProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: templateFixtureRoot,
    storeKey: 'type-system-template-overlay-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  const htmlFileName = path.join(templateFixtureRoot, 'src/implicit-binding-expression-inference-app.html');
  const viewModelFileName = path.join(templateFixtureRoot, 'src/implicit-binding-expression-inference-app.ts');
  const templateSourceAddress = runtime.workspace.store.readBestSourceFileAddressForFileName(htmlFileName);
  const htmlText = fs.readFileSync(htmlFileName, 'utf8');
  const sourceStart = htmlText.indexOf('value.bind');
  const overlayFileName = path.join(templateFixtureRoot, '.semantic-runtime', 'overlays', 'template-binding-probe.ts');
  const viewModelSpecifier = moduleSpecifierForOverlay(overlayFileName, viewModelFileName);
  const source = new TypeSystemOverlaySourceBuilder({
    kind: 'semantic-checker-surface',
    fileName: overlayFileName,
    originKey: 'contract:template-binding-overlay',
  })
    .appendLine(`import type { ImplicitBindingExpressionInferenceApp as ViewModel } from '${viewModelSpecifier}';`)
    .appendLine('declare const $vm: ViewModel;')
    .append('export const bindingValue = $vm.')
    .appendSegment('value', {
      role: 'semantic-surface',
      sourceAddressHandle: templateSourceAddress?.handle ?? null,
      sourceStart: sourceStart < 0 ? null : sourceStart,
      sourceEnd: sourceStart < 0 ? null : sourceStart + 'value'.length,
      label: 'value.bind inferred binding source',
    })
    .append(';\n')
    .append('export const missingBindingValue = $vm.')
    .appendSegment('missingValue', {
      role: 'semantic-surface',
      sourceAddressHandle: templateSourceAddress?.handle ?? null,
      sourceStart: sourceStart < 0 ? null : sourceStart,
      sourceEnd: sourceStart < 0 ? null : sourceStart + 'value'.length,
      label: 'value.bind missing-member overlay diagnostic proof',
    })
    .append(';\n')
    .build();
  const typeSystem = new TypeSystemProjectBuilder().build(
    app.project,
    app.emission.evaluation,
    {
      overlaySources: [source],
    },
  );
  const sourceFile = typeSystem.readProgramSourceFileByPath(overlayFileName);
  const moduleSymbol = sourceFile == null
    ? null
    : typeSystem.checker.getSymbolAtLocation(sourceFile) ?? null;
  const exportSymbol = moduleSymbol == null
    ? null
    : typeSystem.checker.getExportsOfModule(moduleSymbol).find((symbol) => symbol.getName() === 'bindingValue') ?? null;
  const declaration = exportSymbol?.valueDeclaration ?? exportSymbol?.declarations?.[0] ?? sourceFile;
  const exportType = exportSymbol == null || declaration == null
    ? null
    : typeSystem.checker.typeToString(typeSystem.checker.getTypeOfSymbolAtLocation(exportSymbol, declaration));
  const segment = typeSystem.readOverlaySourceSegmentAt(overlayFileName, source.text.indexOf('value'));
  const diagnostics = readTypeSystemProjectDiagnostics(typeSystem).filter((diagnostic) =>
    diagnostic.source?.fileName.replace(/\\/g, '/') === overlayFileName.replace(/\\/g, '/')
  );
  const overlayDiagnostics = readTypeSystemOverlayDiagnostics(typeSystem).filter((diagnostic) =>
    diagnostic.overlayFileName.replace(/\\/g, '/') === overlayFileName.replace(/\\/g, '/')
  );
  return {
    exportType,
    segment,
    templateSourceAddressHandle: templateSourceAddress?.handle ?? null,
    templateSourceStart: sourceStart < 0 ? null : sourceStart,
    diagnostics,
    overlayDiagnostics,
  };
}

async function readRepeatScopeOverlayProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: repeatFixtureRoot,
    storeKey: 'type-system-repeat-overlay-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  const htmlFileName = path.join(repeatFixtureRoot, 'src/repeat-keyed-iterables-app.html');
  const viewModelFileName = path.join(repeatFixtureRoot, 'src/repeat-keyed-iterables-app.ts');
  const templateSourceAddress = runtime.workspace.store.readBestSourceFileAddressForFileName(htmlFileName);
  const htmlText = fs.readFileSync(htmlFileName, 'utf8');
  const crumbPathStart = htmlText.indexOf('crumb.path');
  const alertTitleStart = htmlText.indexOf('alert.title');
  const actionLabelStart = htmlText.indexOf('action.label');
  const overlayFileName = path.join(repeatFixtureRoot, '.semantic-runtime', 'overlays', 'repeat-scope-probe.ts');
  const viewModelSpecifier = moduleSpecifierForOverlay(overlayFileName, viewModelFileName);
  const source = new TypeSystemOverlaySourceBuilder({
    kind: 'semantic-checker-surface',
    fileName: overlayFileName,
    originKey: 'contract:repeat-scope-overlay',
  })
    .appendLine(`import type { RepeatKeyedIterablesApp as ViewModel } from '${viewModelSpecifier}';`)
    .appendLine("type Crumb = NonNullable<ViewModel['crumbs']>[number];")
    .appendLine("type Lane = ViewModel['lanes'][number];")
    .appendLine("type Alert = ViewModel['alertsByLane'][Lane][number];")
    .appendLine("type Action = Alert['actions'][number];")
    .appendLine('declare const crumb: Crumb;')
    .appendLine('declare const alert: Alert;')
    .appendLine('declare const action: Action;')
    .append('export const crumbPath = crumb.')
    .appendSegment('path', {
      role: 'semantic-surface',
      sourceAddressHandle: templateSourceAddress?.handle ?? null,
      sourceStart: crumbPathStart < 0 ? null : crumbPathStart + 'crumb.'.length,
      sourceEnd: crumbPathStart < 0 ? null : crumbPathStart + 'crumb.path'.length,
      label: 'repeat crumb path local read',
    })
    .append(';\n')
    .append('export const alertTitle = alert.')
    .appendSegment('title', {
      role: 'semantic-surface',
      sourceAddressHandle: templateSourceAddress?.handle ?? null,
      sourceStart: alertTitleStart < 0 ? null : alertTitleStart + 'alert.'.length,
      sourceEnd: alertTitleStart < 0 ? null : alertTitleStart + 'alert.title'.length,
      label: 'nested repeat alert title local read',
    })
    .append(';\n')
    .append('export const actionLabel = action.')
    .appendSegment('label', {
      role: 'semantic-surface',
      sourceAddressHandle: templateSourceAddress?.handle ?? null,
      sourceStart: actionLabelStart < 0 ? null : actionLabelStart + 'action.'.length,
      sourceEnd: actionLabelStart < 0 ? null : actionLabelStart + 'action.label'.length,
      label: 'nested repeat action label local read',
    })
    .append(';\n')
    .build();
  const typeSystem = new TypeSystemProjectBuilder().build(
    app.project,
    app.emission.evaluation,
    {
      overlaySources: [source],
    },
  );
  const diagnostics = readTypeSystemProjectDiagnostics(typeSystem).filter((diagnostic) =>
    diagnostic.source?.fileName.replace(/\\/g, '/') === overlayFileName.replace(/\\/g, '/')
  );
  return {
    crumbPathType: readOverlayExportType(typeSystem, overlayFileName, 'crumbPath'),
    alertTitleType: readOverlayExportType(typeSystem, overlayFileName, 'alertTitle'),
    actionLabelType: readOverlayExportType(typeSystem, overlayFileName, 'actionLabel'),
    segmentsMapped: ['path', 'title', 'label'].every((text) => {
      const segment = typeSystem.readOverlaySourceSegmentAt(overlayFileName, source.text.indexOf(text));
      return segment?.sourceAddressHandle === templateSourceAddress?.handle;
    }),
    diagnostics,
  };
}

async function readGeneratedTemplateScopeOverlayProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: repeatFixtureRoot,
    storeKey: 'type-system-generated-template-overlay-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  const resource = app.emission.templates.resources[0] ?? null;
  if (resource == null) {
    return {
      expressionProbeCount: 0,
      skippedExpressionCount: 0,
      expressionTypes: new Map(),
      overlayDiagnosticCount: 0,
      preciseDiagnosticMapped: false,
    };
  }
  const emission = new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.typeSystem)
    .build(resource, 'contract-repeat-template-overlay');
  const overlaySource = emission.overlaySource;
  if (overlaySource == null) {
    return {
      expressionProbeCount: 0,
      skippedExpressionCount: emission.skippedExpressions.length,
      expressionTypes: new Map(),
      overlayDiagnosticCount: 0,
      preciseDiagnosticMapped: false,
    };
  }
  const typeSystem = new TypeSystemProjectBuilder().build(
    app.project,
    app.emission.evaluation,
    {
      overlaySources: [overlaySource],
    },
  );
  const diagnostics = readTypeSystemOverlayDiagnostics(typeSystem).filter((diagnostic) =>
    diagnostic.overlayOriginKey === overlaySource.originKey
  );
  const expressionTypes = readOverlayVariableExpressionTypes(typeSystem, overlaySource.fileName);
  const preciseDiagnosticMapped = generatedTemplateOverlayPreciseDiagnosticMapped(
    app,
    overlaySource,
    emission.expressionProbes,
  );
  return {
    expressionProbeCount: emission.expressionProbes.length,
    skippedExpressionCount: emission.skippedExpressions.length,
    expressionTypes,
    overlayDiagnosticCount: diagnostics.length,
    preciseDiagnosticMapped,
    generatedAnyHole: overlayTextHasGeneratedAnyHole(overlaySource),
  };
}

async function readGeneratedLetScopeOverlayProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: letFixtureRoot,
    storeKey: 'type-system-generated-let-overlay-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  let selected = null;
  let emission = null;
  for (const resource of app.emission.templates.resources) {
    const candidate = new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.typeSystem)
      .build(resource, 'contract-let-template-overlay');
    if (candidate.expressionProbes.some((probe) => probe.expressionText === 'state.readRequest(requestId)')) {
      selected = resource;
      emission = candidate;
      break;
    }
  }
  if (selected == null || emission?.overlaySource == null) {
    return {
      expressionProbeCount: 0,
      skippedExpressionCount: emission?.skippedExpressions.length ?? 0,
      skippedReasons: emission?.skippedExpressions.map((skip) => skip.reason) ?? [],
      expressionTypes: new Map(),
      variableTypes: new Map(),
      overlayDiagnosticCount: 0,
    };
  }
  const typeSystem = new TypeSystemProjectBuilder().build(
    app.project,
    app.emission.evaluation,
    {
      overlaySources: [emission.overlaySource],
    },
  );
  const diagnostics = readTypeSystemOverlayDiagnostics(typeSystem).filter((diagnostic) =>
    diagnostic.overlayOriginKey === emission.overlaySource.originKey
  );
  return {
    expressionProbeCount: emission.expressionProbes.length,
    skippedExpressionCount: emission.skippedExpressions.length,
    skippedReasons: emission.skippedExpressions.map((skip) => skip.reason),
    expressionTypes: readOverlayVariableExpressionTypes(typeSystem, emission.overlaySource.fileName),
    variableTypes: readOverlayVariableTypesByName(typeSystem, emission.overlaySource.fileName),
    overlayDiagnosticCount: diagnostics.length,
    generatedAnyHole: overlayTextHasGeneratedAnyHole(emission.overlaySource),
  };
}

async function readGeneratedEventScopeOverlayProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: eventFixtureRoot,
    storeKey: 'type-system-generated-event-overlay-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  const resource = app.emission.templates.resources[0] ?? null;
  if (resource == null) {
    return {
      expressionProbeCount: 0,
      skippedExpressionCount: 0,
      expressionTypes: new Map(),
      overlayDiagnosticCount: 0,
      nonSourceObservedDependencyCount: 0,
    };
  }
  const emission = new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.typeSystem)
    .build(resource, 'contract-event-template-overlay');
  if (emission.overlaySource == null) {
    return {
      expressionProbeCount: 0,
      skippedExpressionCount: emission.skippedExpressions.length,
      expressionTypes: new Map(),
      overlayDiagnosticCount: 0,
    };
  }
  const typeSystem = new TypeSystemProjectBuilder().build(
    app.project,
    app.emission.evaluation,
    {
      overlaySources: [emission.overlaySource],
    },
  );
  const diagnostics = readTypeSystemOverlayDiagnostics(typeSystem).filter((diagnostic) =>
    diagnostic.overlayOriginKey === emission.overlaySource.originKey
  );
  return {
    expressionProbeCount: emission.expressionProbes.length,
    skippedExpressionCount: emission.skippedExpressions.length,
    expressionTypes: readOverlayVariableExpressionTypes(typeSystem, emission.overlaySource.fileName),
    overlayDiagnosticCount: diagnostics.length,
    generatedAnyHole: overlayTextHasGeneratedAnyHole(emission.overlaySource),
    generatedGlobalEventMemberTypeExpression: emission.overlaySource.text.includes('currentTarget: HTMLButtonElement'),
  };
}

async function readGeneratedRuntimeAssignmentOverlayProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: runtimeAssignmentFixtureRoot,
    storeKey: 'type-system-generated-runtime-assignment-overlay-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  let emission = null;
  for (const resource of app.emission.templates.resources) {
    const candidate = new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.typeSystem)
      .build(resource, 'contract-runtime-assignment-template-overlay');
    if (
      candidate.expressionProbes.some((probe) => probe.expressionText === 'rows')
      && candidate.expressionProbes.some((probe) => probe.expressionText === '$displayData')
    ) {
      emission = candidate;
      break;
    }
  }
  if (emission?.overlaySource == null) {
    return {
      expressionProbeCount: emission?.expressionProbes.length ?? 0,
      skippedExpressionCount: emission?.skippedExpressions.length ?? 0,
      copiedExpressions: emission?.expressionProbes.map((probe) => probe.expressionText) ?? [],
      expressionTypes: new Map(),
      variableTypes: new Map(),
      generatedTypeIndexedAccess: false,
      overlayDiagnosticCount: 0,
      runtimeAssignmentDataFlows: [],
    };
  }
  const typeSystem = new TypeSystemProjectBuilder().build(
    app.project,
    app.emission.evaluation,
    {
      overlaySources: [emission.overlaySource],
    },
  );
  const diagnostics = readTypeSystemOverlayDiagnostics(typeSystem).filter((diagnostic) =>
    diagnostic.overlayOriginKey === emission.overlaySource.originKey
  );
  return {
    expressionProbeCount: emission.expressionProbes.length,
    skippedExpressionCount: emission.skippedExpressions.length,
    copiedExpressions: emission.expressionProbes.map((probe) => probe.expressionText),
    expressionTypes: readOverlayVariableExpressionTypes(typeSystem, emission.overlaySource.fileName),
    variableTypes: readOverlayVariableTypesByName(typeSystem, emission.overlaySource.fileName),
    generatedTypeIndexedAccess: emission.overlaySource.text.includes('SyntheticTableCustomAttribute["activeRow"]'),
    overlayDiagnosticCount: diagnostics.length,
    generatedAnyHole: overlayTextHasGeneratedAnyHole(emission.overlaySource),
    runtimeAssignmentDataFlows: app.ask({
      kind: SemanticAppQueryKind.BindingDataFlows,
      page: { size: 100 },
    }).value.rows
      .filter((row) =>
        row.sourceName === '$displayData'
        || row.sourceName === '$activeRow'
      )
      .map((row) => ({
        sourceName: row.sourceName,
        targetProperty: row.targetProperty,
        direction: row.direction,
        sourceAssignmentKind: row.sourceAssignmentKind,
        sourceAssignmentTargetType: row.sourceAssignmentTargetType,
        sourceAssignmentTargetSourcePath: row.sourceAssignmentTargetSource?.path ?? null,
        targetToSourceAssignable: row.targetToSourceAssignable,
      })),
  };
}

async function readGeneratedRuntimeAssignmentConverterOverlayProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: runtimeAssignmentConverterFixtureRoot,
    storeKey: 'type-system-generated-runtime-assignment-converter-overlay-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  let emission = null;
  for (const resource of app.emission.templates.resources) {
    const candidate = new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.typeSystem)
      .build(resource, 'contract-runtime-assignment-converter-template-overlay');
    if (
      candidate.expressionProbes.some((probe) => probe.expressionText.includes('.toView(') && probe.expressionText.includes('$selectedId'))
      && candidate.expressionProbes.some((probe) => probe.expressionText === '$selectedId.toUpperCase()')
    ) {
      emission = candidate;
      break;
    }
  }
  if (emission?.overlaySource == null) {
    return {
      expressionProbeCount: emission?.expressionProbes.length ?? 0,
      skippedExpressionCount: emission?.skippedExpressions.length ?? 0,
      copiedExpressions: emission?.expressionProbes.map((probe) => probe.expressionText) ?? [],
      expressionTypes: new Map(),
      variableTypes: new Map(),
      generatedPrimitiveTypeExpression: false,
      generatedTargetMemberIndexedAccess: false,
      overlayDiagnosticCount: 0,
      runtimeAssignmentDataFlows: [],
    };
  }
  const typeSystem = new TypeSystemProjectBuilder().build(
    app.project,
    app.emission.evaluation,
    {
      overlaySources: [emission.overlaySource],
    },
  );
  const diagnostics = readTypeSystemOverlayDiagnostics(typeSystem).filter((diagnostic) =>
    diagnostic.overlayOriginKey === emission.overlaySource.originKey
  );
  return {
    expressionProbeCount: emission.expressionProbes.length,
    skippedExpressionCount: emission.skippedExpressions.length,
    copiedExpressions: emission.expressionProbes.map((probe) => probe.expressionText),
    expressionTypes: readOverlayVariableExpressionTypes(typeSystem, emission.overlaySource.fileName),
    variableTypes: readOverlayVariableTypesByName(typeSystem, emission.overlaySource.fileName),
    generatedPrimitiveTypeExpression: emission.overlaySource.text.includes('let $selectedId = undefined as unknown as string;'),
    generatedTargetMemberIndexedAccess: emission.overlaySource.text.includes('SyntheticPickerCustomAttribute["selectedRow"]'),
    overlayDiagnosticCount: diagnostics.length,
    generatedAnyHole: overlayTextHasGeneratedAnyHole(emission.overlaySource),
    runtimeAssignmentDataFlows: app.ask({
      kind: SemanticAppQueryKind.BindingDataFlows,
      page: { size: 100 },
    }).value.rows
      .filter((row) => row.sourceName === '$selectedId')
      .map((row) => ({
        sourceName: row.sourceName,
        targetProperty: row.targetProperty,
        direction: row.direction,
        sourceAssignmentKind: row.sourceAssignmentKind,
        sourceAssignmentTargetType: row.sourceAssignmentTargetType,
        sourceAssignmentTargetSourcePath: row.sourceAssignmentTargetSource?.path ?? null,
        targetToSourceAssignable: row.targetToSourceAssignable,
      })),
  };
}

async function readGeneratedScopeAliasOverlayProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: scopeAliasFixtureRoot,
    storeKey: 'type-system-generated-scope-alias-overlay-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  const resource = app.emission.templates.resources[0] ?? null;
  if (resource == null) {
    return {
      expressionProbeCount: 0,
      skippedExpressionCount: 0,
      skippedSummaries: [],
      expressionTypes: new Map(),
      overlayDiagnosticCount: 0,
    };
  }
  const emission = new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.typeSystem)
    .build(resource, 'contract-scope-alias-template-overlay');
  if (emission.overlaySource == null) {
    return {
      expressionProbeCount: emission.expressionProbes.length,
      skippedExpressionCount: emission.skippedExpressions.length,
      skippedSummaries: emission.skippedExpressions.map((skip) => skip.summary),
      expressionTypes: new Map(),
      overlayDiagnosticCount: 0,
      nonSourceObservedDependencyCount: nonSourceObservedDependencyCount(app),
    };
  }
  const typeSystem = new TypeSystemProjectBuilder().build(
    app.project,
    app.emission.evaluation,
    {
      overlaySources: [emission.overlaySource],
    },
  );
  const diagnostics = readTypeSystemOverlayDiagnostics(typeSystem).filter((diagnostic) =>
    diagnostic.overlayOriginKey === emission.overlaySource.originKey
  );
  return {
    expressionProbeCount: emission.expressionProbes.length,
    skippedExpressionCount: emission.skippedExpressions.length,
    skippedSummaries: emission.skippedExpressions.map((skip) => skip.summary),
    expressionTypes: readOverlayVariableExpressionTypes(typeSystem, emission.overlaySource.fileName),
    overlayDiagnosticCount: diagnostics.length,
    nonSourceObservedDependencyCount: nonSourceObservedDependencyCount(app),
    generatedAnyHole: overlayTextHasGeneratedAnyHole(emission.overlaySource),
  };
}

function nonSourceObservedDependencyCount(app) {
  return app.bindingObservedDependencies({ size: 500 }).value.rows
    .filter((row) => row.observedMemberSourceState !== 'source')
    .length;
}

async function readGeneratedValueConverterOverlayProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: valueConverterFixtureRoot,
    storeKey: 'type-system-generated-value-converter-overlay-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  const resource = app.emission.templates.resources[0] ?? null;
  if (resource == null) {
    return {
      expressionProbeCount: 0,
      skippedExpressionCount: 0,
      expressionTypes: new Map(),
      generatedCallTypes: [],
      variableTypes: new Map(),
      diagnosticCodes: [],
      hasDynamicWithContextBranch: false,
      hasArgumentMismatch: false,
      argumentMismatchMappedToMinimumText: false,
      argumentMismatchHasSemanticProductHandle: false,
    };
  }
  const emission = new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.typeSystem)
    .build(resource, 'contract-value-converter-template-overlay');
  if (emission.overlaySource == null) {
    return {
      expressionProbeCount: emission.expressionProbes.length,
      skippedExpressionCount: emission.skippedExpressions.length,
      expressionTypes: new Map(),
      generatedCallTypes: [],
      variableTypes: new Map(),
      diagnosticCodes: [],
      hasDynamicWithContextBranch: false,
      hasArgumentMismatch: false,
      argumentMismatchMappedToMinimumText: false,
      argumentMismatchHasSemanticProductHandle: false,
    };
  }
  const typeSystem = new TypeSystemProjectBuilder().build(
    app.project,
    app.emission.evaluation,
    {
      overlaySources: [emission.overlaySource],
    },
  );
  const diagnostics = readTypeSystemOverlayDiagnostics(typeSystem).filter((diagnostic) =>
    diagnostic.overlayOriginKey === emission.overlaySource.originKey
  );
  const htmlText = fs.readFileSync(
    path.join(valueConverterFixtureRoot, 'src/template-overlay-value-converter-app.html'),
    'utf8',
  );
  const minimumTextStart = htmlText.indexOf('minimumText');
  const argumentMismatch = diagnostics.find((diagnostic) =>
    diagnostic.diagnostic.code === 2345
  ) ?? null;
  const expressionTypes = readOverlayVariableExpressionTypes(typeSystem, emission.overlaySource.fileName);
  return {
    expressionProbeCount: emission.expressionProbes.length,
    skippedExpressionCount: emission.skippedExpressions.length,
    expressionTypes,
    generatedCallTypes: [...expressionTypes.values()],
    variableTypes: readOverlayVariableTypesByName(typeSystem, emission.overlaySource.fileName),
    diagnosticCodes: diagnostics.map((diagnostic) => diagnostic.diagnostic.code),
    hasDynamicWithContextBranch: emission.overlaySource.text.includes('.withContext === true ?'),
    hasArgumentMismatch: argumentMismatch != null,
    argumentMismatchMappedToMinimumText: argumentMismatch?.authoredSource?.sourceStart === minimumTextStart
      && argumentMismatch.authoredSource.sourceEnd === minimumTextStart + 'minimumText'.length,
    argumentMismatchHasSemanticProductHandle: argumentMismatch?.semanticProductHandle != null
      && argumentMismatch.authoredSource?.semanticProductHandle === argumentMismatch.semanticProductHandle,
    generatedAnyHole: overlayTextHasGeneratedAnyHole(emission.overlaySource),
  };
}

async function readGeneratedValueConverterEvaluatorProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: valueConverterFixtureRoot,
    storeKey: 'type-system-value-converter-evaluator-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  const resource = app.emission.templates.resources[0] ?? null;
  if (resource == null) {
    return { kind: 'missing-resource', display: null, openKind: null };
  }
  const parse = templateExpressionParsesForResource(resource)
    .find((candidate) =>
      findValueConverterExpression(bindingExpressionAstForParse(candidate), 'dynamicContextualWord') != null
    ) ?? null;
  if (parse == null) {
    return { kind: 'missing-parse', display: null, openKind: null };
  }
  const expression = findValueConverterExpression(bindingExpressionAstForParse(parse), 'dynamicContextualWord');
  const scope = bindingScopesForTemplateExpressionParse(resource, parse)[0]
    ?? resource.runtimeAnalysis.scopes.rootScope;
  if (expression == null || scope == null) {
    return { kind: 'missing-expression-scope', display: null, openKind: null };
  }
  const result = resource.runtimeAnalysis.expressionWorld
    .evaluator(resource.compilation.compilerWorld.resourceScope)
    .evaluate(CheckerExpressionTypeEvaluationContext.knownScope(
      expression,
      scope,
      'contract-value-converter-expression-evaluator:dynamic-with-context',
      parse.sourceAddressHandle,
    ));
  return result.kind === CheckerExpressionTypeEvaluationResultKind.Type
    ? { kind: result.kind, display: result.typeShape.display, openKind: null }
    : { kind: result.kind, display: result.partialTypeReference?.display ?? null, openKind: result.openKind };
}

function findValueConverterExpression(expression, name) {
  if (expression == null || typeof expression !== 'object') {
    return null;
  }
  if (expression instanceof ValueConverterExpression && expression.name.name === name) {
    return expression;
  }
  for (const value of Object.values(expression)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const match = findValueConverterExpression(item, name);
        if (match != null) {
          return match;
        }
      }
      continue;
    }
    const match = findValueConverterExpression(value, name);
    if (match != null) {
      return match;
    }
  }
  return null;
}

function readGeneratedChildSpliceOverlayProbe() {
  const sourcePath = path.join(valueConverterFixtureRoot, 'src/overlay-expression-splice-source.txt');
  const sourceText = fs.readFileSync(sourcePath, 'utf8').trimEnd();
  const file = new SourceFileRef('contract:overlay-expression-splice-source', sourcePath);
  const fullSpan = new SourceSpan(0, sourceText.length, file);
  const messageStart = sourceText.indexOf('message');
  const wordCountStart = sourceText.indexOf('wordCount');
  const minimumCountStart = sourceText.indexOf('minimumCount');
  const generatedChildEnd = minimumCountStart + 'minimumCount'.length;
  const message = new AccessScopeExpression(
    new SourceSpan(messageStart, messageStart + 'message'.length, file),
    new Identifier(new SourceSpan(messageStart, messageStart + 'message'.length, file), 'message'),
    0,
  );
  const minimumCount = new AccessScopeExpression(
    new SourceSpan(minimumCountStart, generatedChildEnd, file),
    new Identifier(new SourceSpan(minimumCountStart, generatedChildEnd, file), 'minimumCount'),
    0,
  );
  const valueConverter = new ValueConverterExpression(
    new SourceSpan(messageStart, generatedChildEnd, file),
    message,
    new Identifier(new SourceSpan(wordCountStart, wordCountStart + 'wordCount'.length, file), 'wordCount'),
    [minimumCount],
  );
  const call = new CallScopeExpression(
    fullSpan,
    new Identifier(new SourceSpan(0, 'formatWordCount'.length, file), 'formatWordCount'),
    [valueConverter],
    0,
    false,
  );
  const projector = new TemplateTypeSystemOverlayExpressionProjector(valueConverterFixtureRoot);
  const projection = projector.copyableExpression(call, {
    valueConverterCallSurface(expression, semanticProductHandle) {
      return {
        callKind: 'direct-to-view',
        converterText: `__au_vc_${expression.name.name}`,
        converterNameSource: {
          text: expression.name.name,
          semanticProductHandle,
          sourceAddressHandle: file.id,
          sourceStart: expression.name.span.start,
          sourceEnd: expression.name.span.end,
        },
        callerContextKind: 'none',
      };
    },
  }, 'contract:generated-child-splice');
  return {
    kind: projection.kind,
    text: projection.text,
    hasParentPrefixSegment: projection.parts.some((part) =>
      part.kind === 'source' && part.source.text === 'formatWordCount('
    ),
    hasChildGeneratedCall: projection.parts.some((part) =>
      part.kind === 'text' && part.text === '.toView('
    ),
    partLabels: projection.parts.map((part) => part.kind === 'source' ? part.label : 'generated-text'),
  };
}

async function readGeneratedBoundControllerOverlayProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: boundControllerFixtureRoot,
    storeKey: 'type-system-generated-bound-controller-overlay-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  let emission = null;
  for (const resource of app.emission.templates.resources) {
    const candidate = new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.typeSystem)
      .build(resource, 'contract-bound-controller-template-overlay');
    if (candidate.expressionProbes.some((probe) => probe.expressionText === 'onAction(action)')) {
      emission = candidate;
      break;
    }
  }
  if (emission?.overlaySource == null) {
    return {
      expressionProbeCount: emission?.expressionProbes.length ?? 0,
      skippedExpressionCount: emission?.skippedExpressions.length ?? 0,
      expressionTypes: new Map(),
      variableTypes: new Map(),
      overlayDiagnosticCount: 0,
      overlayDiagnosticCodes: [],
    };
  }
  const typeSystem = new TypeSystemProjectBuilder().build(
    app.project,
    app.emission.evaluation,
    {
      overlaySources: [emission.overlaySource],
    },
  );
  const diagnostics = readTypeSystemOverlayDiagnostics(typeSystem).filter((diagnostic) =>
    diagnostic.overlayOriginKey === emission.overlaySource.originKey
  );
  return {
    expressionProbeCount: emission.expressionProbes.length,
    skippedExpressionCount: emission.skippedExpressions.length,
    expressionTypes: readOverlayVariableExpressionTypes(typeSystem, emission.overlaySource.fileName),
    variableTypes: readOverlayVariableTypesByName(typeSystem, emission.overlaySource.fileName),
    overlayDiagnosticCount: diagnostics.length,
    overlayDiagnosticCodes: diagnostics.map((diagnostic) => diagnostic.diagnostic.code),
    generatedAnyHole: overlayTextHasGeneratedAnyHole(emission.overlaySource),
  };
}

async function readGeneratedStateSourceOverlayProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: stateSourceFixtureRoot,
    storeKey: 'type-system-generated-state-source-overlay-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  const resource = app.emission.templates.resources[0] ?? null;
  if (resource == null) {
    return {
      expressionProbeCount: 0,
      skippedExpressionCount: 0,
      expressionTypes: new Map(),
      variableTypes: new Map(),
      selectedExpressionTypes: {},
      bindingScopeTypes: {},
      overlayDiagnosticCount: 0,
    };
  }
  const emission = new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.typeSystem)
    .build(resource, 'contract-state-source-template-overlay');
  if (emission.overlaySource == null) {
    return {
      expressionProbeCount: emission.expressionProbes.length,
      skippedExpressionCount: emission.skippedExpressions.length,
      expressionTypes: new Map(),
      variableTypes: new Map(),
      selectedExpressionTypes: {},
      bindingScopeTypes: {},
      overlayDiagnosticCount: 0,
    };
  }
  const typeSystem = new TypeSystemProjectBuilder().build(
    app.project,
    app.emission.evaluation,
    {
      overlaySources: [emission.overlaySource],
    },
  );
  const diagnostics = readTypeSystemOverlayDiagnostics(typeSystem).filter((diagnostic) =>
    diagnostic.overlayOriginKey === emission.overlaySource.originKey
  );
  const expressionTypes = readOverlayVariableExpressionTypes(typeSystem, emission.overlaySource.fileName);
  return {
    expressionProbeCount: emission.expressionProbes.length,
    skippedExpressionCount: emission.skippedExpressions.length,
    expressionTypes,
    variableTypes: readOverlayVariableTypesByName(typeSystem, emission.overlaySource.fileName),
    selectedExpressionTypes: {
      stateTitle: readExpressionTypeContaining(expressionTypes, 'return title;'),
      namedStoreLabel: readExpressionTypeContaining(expressionTypes, 'return label;'),
      stateCondition: readExpressionTypeContaining(expressionTypes, "return draft === '';"),
    },
    bindingScopeTypes: {
      repeatedTask: readRepeatedBindingScopeSlotType(resource, 'task'),
      boundTasks: readCustomElementBindingScopeSlotType(resource, 'tasks'),
    },
    overlayDiagnosticCount: diagnostics.length,
    generatedAnyHole: overlayTextHasGeneratedAnyHole(emission.overlaySource),
  };
}

async function readGeneratedStateConditionBoundaryOverlayProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: stateConditionBoundaryFixtureRoot,
    storeKey: 'type-system-generated-state-condition-boundary-overlay-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  const resource = app.emission.templates.resources[0] ?? null;
  if (resource == null) {
    return {
      expressionProbeCount: 0,
      skippedExpressionCount: 0,
      expressionTypes: new Map(),
      diagnosticCodes: [],
      hasOrdinaryChildStateBoundaryDiagnostic: false,
      stateBoundChildType: null,
    };
  }
  const emission = new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.typeSystem)
    .build(resource, 'contract-state-condition-boundary-template-overlay');
  if (emission.overlaySource == null) {
    return {
      expressionProbeCount: emission.expressionProbes.length,
      skippedExpressionCount: emission.skippedExpressions.length,
      expressionTypes: new Map(),
      diagnosticCodes: [],
      hasOrdinaryChildStateBoundaryDiagnostic: false,
      stateBoundChildType: null,
    };
  }
  const typeSystem = new TypeSystemProjectBuilder().build(
    app.project,
    app.emission.evaluation,
    {
      overlaySources: [emission.overlaySource],
    },
  );
  const diagnostics = readTypeSystemOverlayDiagnostics(typeSystem).filter((diagnostic) =>
    diagnostic.overlayOriginKey === emission.overlaySource.originKey
  );
  const expressionTypes = readOverlayVariableExpressionTypes(typeSystem, emission.overlaySource.fileName);
  return {
    expressionProbeCount: emission.expressionProbes.length,
    skippedExpressionCount: emission.skippedExpressions.length,
    expressionTypes,
    diagnosticCodes: diagnostics.map((diagnostic) => diagnostic.diagnostic.code),
    hasOrdinaryChildStateBoundaryDiagnostic: diagnostics.some((diagnostic) =>
      diagnostic.diagnostic.code === 2304 || diagnostic.diagnostic.code === 2339
    ),
    stateBoundChildType: readExpressionTypeContaining(expressionTypes, 'return selectedTask.title;'),
    generatedAnyHole: overlayTextHasGeneratedAnyHole(emission.overlaySource),
  };
}

function readRepeatedBindingScopeSlotType(resource, slotName) {
  const scope = resource.runtimeAnalysis.scopes.readScopes().find((candidate) =>
    candidate.ownerKind === 'repeated-item'
    && (candidate.bindingContext?.slots ?? []).some((slot) => slot.name === slotName)
  ) ?? null;
  const slot = (scope?.bindingContext?.slots ?? []).find((candidate) => candidate.name === slotName) ?? null;
  return slot?.targetType?.display ?? null;
}

function readCustomElementBindingScopeSlotType(resource, slotName) {
  const scope = resource.runtimeAnalysis.scopes.readScopes().find((candidate) =>
    candidate.ownerKind === 'custom-element-controller'
    && candidate.parent != null
    && (candidate.bindingContext?.slots ?? []).some((slot) => slot.name === slotName)
  ) ?? null;
  const slot = (scope?.bindingContext?.slots ?? []).find((candidate) => candidate.name === slotName) ?? null;
  return slot?.targetType?.display ?? null;
}

async function readPublicTemplateOverlayDiagnosticProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: templateTypeErrorFixtureRoot,
    storeKey: 'public-template-overlay-diagnostics-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  const diagnostics = app.ask({
    kind: SemanticAppQueryKind.TemplateDiagnostics,
    diagnosticProjection: 'type-projection',
    page: { size: 50 },
  }).value.rows;
  const overlayRows = diagnostics.filter((row) =>
    row.diagnosticKind === 'template-expression-typescript-diagnostic'
    && row.diagnosticAuthority === 'typescript'
  );
  return {
    overlayRows: overlayRows.length,
    hasRepeatMissingLabel: overlayRows.some((row) =>
      row.source?.path.endsWith('template-overlay-type-errors-app.html') === true
      && row.source.start != null
      && row.source.end != null
      && row.source.end > row.source.start
      && row.summary.includes('missingLabel')
    ),
    hasNarrowedMissingStatus: overlayRows.some((row) =>
      row.source?.path.endsWith('template-overlay-type-errors-app.html') === true
      && row.source.start != null
      && row.source.end != null
      && row.source.end > row.source.start
      && row.summary.includes('missingStatus')
    ),
    hasArgumentMismatch: overlayRows.some((row) =>
      row.source?.path.endsWith('template-overlay-type-errors-app.html') === true
      && row.source.start != null
      && row.source.end != null
      && row.source.end > row.source.start
      && row.summary.includes('TS2345')
    ),
    hasArityMismatch: overlayRows.some((row) =>
      row.source?.path.endsWith('template-overlay-type-errors-app.html') === true
      && row.source.start != null
      && row.source.end != null
      && row.source.end > row.source.start
      && row.summary.includes('TS2554')
    ),
    hasNullishAccess: overlayRows.some((row) =>
      row.source?.path.endsWith('template-overlay-type-errors-app.html') === true
      && row.source.start != null
      && row.source.end != null
      && row.source.end > row.source.start
      && (row.summary.includes('TS18047') || row.summary.includes('TS2532'))
    ),
    hasUnknownRepeatLocal: overlayRows.some((row) =>
      row.source?.path.endsWith('template-overlay-type-errors-app.html') === true
      && row.source.start != null
      && row.source.end != null
      && row.source.end > row.source.start
      && row.summary.includes('TS18046')
      && row.summary.includes('unknownItem')
    ),
  };
}

async function readPublicTemplateOverlayCursorDiagnosticProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: templateTypeErrorFixtureRoot,
    storeKey: 'public-template-overlay-cursor-diagnostics-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  const htmlPath = path.join(templateTypeErrorFixtureRoot, 'src/template-overlay-type-errors-app.html');
  const htmlText = fs.readFileSync(htmlPath, 'utf8');
  const argumentMismatch = readCursorInfoDiagnosticsForNeedle(app, htmlPath, htmlText, 'not-an-item');
  const arityMismatch = readCursorInfoDiagnosticsForOffset(
    app,
    htmlPath,
    htmlText,
    htmlText.indexOf('selectedItem, selectedItem') + 'selectedItem, '.length + 1,
  );
  const nullishAccess = readCursorInfoDiagnosticsForNeedle(app, htmlPath, htmlText, 'maybeItem.label');
  const unknownRepeatLocal = readCursorInfoDiagnosticsForNeedle(app, htmlPath, htmlText, 'unknownItem.label');
  const unknownRepeatMember = readCursorInfoDiagnosticsForOffset(
    app,
    htmlPath,
    htmlText,
    htmlText.indexOf('unknownItem.label') + 'unknownItem.'.length + 1,
  );
  return {
    argumentMismatchCodes: cursorDiagnosticMissingInputs(argumentMismatch),
    arityMismatchCodes: cursorDiagnosticMissingInputs(arityMismatch),
    nullishAccessCodes: cursorDiagnosticMissingInputs(nullishAccess),
    unknownRepeatMemberCodes: cursorDiagnosticMissingInputs(unknownRepeatMember),
    hasArgumentMismatch: argumentMismatch.some((diagnostic) => diagnostic.summary.includes('TS2345')),
    hasArityMismatch: arityMismatch.some((diagnostic) => diagnostic.summary.includes('TS2554')),
    hasNullishAccess: nullishAccess.some((diagnostic) =>
      diagnostic.summary.includes('TS18047') || diagnostic.summary.includes('TS2532')
    ),
    hasUnknownRepeatLocal: unknownRepeatLocal.some((diagnostic) =>
      diagnostic.summary.includes('TS18046') && diagnostic.summary.includes('unknownItem')
    ),
    hasUnknownRepeatMemberNoMembers: unknownRepeatMember.some((diagnostic) =>
      diagnostic.diagnosticKind === 'weak-expression-member-owner'
      && diagnostic.missingInputs.includes('expression-member-owner-type:no-members')
    ),
    hasUnknownRepeatMemberMissingSlotType: unknownRepeatMember.some((diagnostic) =>
      diagnostic.missingInputs.includes('expression-member-owner-type:missing-slot-type')
    ),
  };
}

function readCursorInfoDiagnosticsForNeedle(
  app,
  htmlPath,
  htmlText,
  needle,
) {
  const start = htmlText.indexOf(needle);
  return readCursorInfoDiagnosticsForOffset(
    app,
    htmlPath,
    htmlText,
    start < 0 ? -1 : start + Math.floor(needle.length / 2),
  );
}

function readCursorInfoDiagnosticsForOffset(
  app,
  htmlPath,
  htmlText,
  offset,
) {
  if (offset < 0) {
    return [];
  }
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

function cursorDiagnosticMissingInputs(diagnostics) {
  return diagnostics.flatMap((diagnostic) => diagnostic.missingInputs);
}

function positionForOffset(
  text,
  offset,
) {
  const before = text.slice(0, offset);
  const line = before.split(/\r?\n/u).length - 1;
  const lineStart = Math.max(before.lastIndexOf('\n'), before.lastIndexOf('\r')) + 1;
  return {
    line,
    character: offset - lineStart,
  };
}

function sameSet(
  actual,
  expected,
) {
  return actual.length === expected.length
    && expected.every((value) => actual.includes(value));
}

function isStringLikeOverlayType(type) {
  return type === 'string' || /^".*"$/u.test(type ?? '');
}

function isStringNumberUnionOverlayType(type) {
  return type === 'string | number' || type === 'number | string';
}

function overlayTextHasGeneratedAnyHole(overlaySource) {
  return overlaySource?.text.includes('undefined as any') === true;
}

function readOverlayVariableExpressionTypes(
  typeSystem,
  overlayFileName,
) {
  const sourceFile = typeSystem.readProgramSourceFileByPath(overlayFileName);
  const rows = new Map();
  if (sourceFile == null) {
    return rows;
  }
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text.startsWith('__au_expr_')
      && node.initializer != null
    ) {
      rows.set(
        node.initializer.getText(sourceFile),
        typeSystem.checker.typeToString(typeSystem.checker.getTypeAtLocation(node.name)),
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return rows;
}

function readExpressionTypeContaining(expressionTypes, text) {
  for (const [expression, type] of expressionTypes) {
    if (expression.includes(text)) {
      return type;
    }
  }
  return null;
}

function readOverlayVariableTypesByName(
  typeSystem,
  overlayFileName,
) {
  const sourceFile = typeSystem.readProgramSourceFileByPath(overlayFileName);
  const rows = new Map();
  if (sourceFile == null) {
    return rows;
  }
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      rows.set(
        node.name.text,
        typeSystem.checker.typeToString(typeSystem.checker.getTypeAtLocation(node.name)),
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return rows;
}

function generatedTemplateOverlayPreciseDiagnosticMapped(
  app,
  overlaySource,
  expressionProbes,
) {
  const probe = expressionProbes.find((candidate) => candidate.expressionText === 'crumb.path') ?? null;
  if (probe == null || probe.sourceStart == null || probe.sourceEnd == null) {
    return false;
  }
  const badText = overlaySource.text.replace('crumb.path', 'crumb.miss');
  const badOverlaySource = {
    kind: overlaySource.kind,
    fileName: overlaySource.fileName.replace(/\.ts$/u, '.bad.ts'),
    text: badText,
    scriptKind: overlaySource.scriptKind,
    diagnosticPolicy: overlaySource.diagnosticPolicy,
    originKey: `${overlaySource.originKey}:bad-member`,
    segments: overlaySource.segments,
  };
  const typeSystem = new TypeSystemProjectBuilder().build(
    app.project,
    app.emission.evaluation,
    {
      overlaySources: [badOverlaySource],
    },
  );
  const diagnostic = readTypeSystemOverlayDiagnostics(typeSystem).find((candidate) =>
    candidate.overlayOriginKey === badOverlaySource.originKey
    && candidate.diagnostic.code === 2339
    && candidate.authoredSource?.sourceAddressHandle === probe.sourceAddressHandle
  ) ?? null;
  const expectedStart = probe.sourceStart + 'crumb.'.length;
  const expectedEnd = probe.sourceEnd;
  return diagnostic?.authoredSource?.sourceStart === expectedStart
    && diagnostic.authoredSource.sourceEnd === expectedEnd;
}

function readOverlayExportType(
  typeSystem,
  overlayFileName,
  exportName,
) {
  const sourceFile = typeSystem.readProgramSourceFileByPath(overlayFileName);
  const moduleSymbol = sourceFile == null
    ? null
    : typeSystem.checker.getSymbolAtLocation(sourceFile) ?? null;
  const exportSymbol = moduleSymbol == null
    ? null
    : typeSystem.checker.getExportsOfModule(moduleSymbol).find((symbol) => symbol.getName() === exportName) ?? null;
  const declaration = exportSymbol?.valueDeclaration ?? exportSymbol?.declarations?.[0] ?? sourceFile;
  return exportSymbol == null || declaration == null
    ? null
    : typeSystem.checker.typeToString(typeSystem.checker.getTypeOfSymbolAtLocation(exportSymbol, declaration));
}

function moduleSpecifierForOverlay(
  overlayFileName,
  targetFileName,
) {
  const relative = path.relative(path.dirname(overlayFileName), targetFileName)
    .replace(/\\/g, '/')
    .replace(/\.[cm]?[tj]sx?$/, '');
  return relative.startsWith('.') ? relative : `./${relative}`;
}
