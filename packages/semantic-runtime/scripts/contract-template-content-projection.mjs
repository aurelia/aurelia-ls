import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';
import {
  HydrateElementInstruction,
  HydrateTemplateControllerInstruction,
  TemplateInstructionKind,
} from '../out/template/instruction-ir.js';
import { auSlotElementSourceText } from '../out/template/au-slot-source.js';
import { KernelVocabulary } from '../out/kernel/vocabulary.js';
import {
  resourceLocalAuthoredTemplateExpressionParses,
} from '../out/template/runtime-resource-ownership.js';
import {
  resourceLocalEffectiveTemplateExpressionParses,
} from '../out/template/template-expression-selection.js';
import {
  TemplateTypeSystemOverlayBuilder,
} from '../out/template/template-type-system-overlay.js';
import { TemplateProductDetails } from '../out/template/product-details.js';
import { HtmlElement } from '../out/template/html-ir.js';
import { TemplateCompilerIssueKind } from '../out/template/compiler-issue.js';
import { sourceSpanAddressForAddress } from '../out/kernel/source-address.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/content-projection-topology');
const appTemplatePath = path.join(fixtureRoot, 'src/content-projection-topology-app.html');
const receiverTemplatePath = path.join(fixtureRoot, 'src/projection-receiver.html');
const appTemplateText = fs.readFileSync(appTemplatePath, 'utf8');
const receiverTemplateText = fs.readFileSync(receiverTemplatePath, 'utf8');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'template-content-projection-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});
const store = runtime.workspace.store;
const resources = app.emission.templates.resources;
const resource = (name) => {
  const result = resources.find((candidate) => candidate.compilation.definition.name === name);
  assert.ok(result, `Expected runtime template resource "${name}".`);
  return result;
};
const hydrateElements = (candidate) =>
  candidate.compilation.compiledTemplate.instructions.filter(
    (instruction) => instruction instanceof HydrateElementInstruction,
  );
const instructionSequence = (candidate, productHandle) => {
  const sequence = candidate.compilation.compiledTemplate.instructionSequences.find(
    (value) => value.productHandle === productHandle,
  );
  assert.ok(sequence, `Expected instruction sequence ${productHandle}.`);
  return sequence;
};
const queryRows = (kind, detail = 'compact') => {
  const rows = [];
  let cursor;
  do {
    const answer = app.ask({
      kind,
      detail,
      page: {
        size: 33,
        ...(cursor == null ? {} : { cursor }),
      },
    });
    rows.push(...answer.value.rows);
    cursor = answer.page?.nextCursor ?? null;
  } while (cursor != null);
  return rows;
};
const cursorForText = (filePath, text, offset) => {
  const before = text.slice(0, offset);
  const lines = before.split(/\r?\n/u);
  return {
    filePath,
    line: lines.length - 1,
    character: lines[lines.length - 1].length,
    offset,
  };
};
const cursorAtOffset = (offset) =>
  cursorForText('src/content-projection-topology-app.html', appTemplateText, offset);

const appResource = resource('content-projection-topology-app');
const receiverResource = resource('projection-receiver');
const relayResource = resource('projection-relay');
const shadowResource = resource('shadow-slot-receiver');
const slotReachabilityResource = resource('slot-reachability-receiver');
const declaringResourceKeys = [
  'au:resource:value-converter:projectionLabel',
  'au:resource:custom-element:scoped-compose-widget',
  'au:resource:custom-element:opaque-content-shell',
];
const receivingResourceKeys = [
  'au:resource:value-converter:fallbackLabel',
  'au:resource:binding-behavior:fallbackAudit',
  'au:resource:custom-element:scoped-compose-widget',
];

for (const candidate of resources) {
  assert.equal(
    candidate.compilation.compiledTemplate.compiledTemplate.needsCompile,
    candidate === appResource ? null : false,
    candidate === appResource
      ? 'Expected the app compilation to retain open needsCompile state from its user processContent boundary.'
      : `Expected compiled output "${candidate.compilation.definition.name}" to be marked needsCompile=false.`,
  );
}
assert.equal(
  receiverResource.compilation.compiledTemplate.compiledTemplate.hasSlots,
  false,
  'Expected an ordinary au-slot receiver not to claim native Shadow DOM slots.',
);
assert.equal(
  shadowResource.compilation.compiledTemplate.compiledTemplate.hasSlots,
  true,
  'Expected effective native <slot> usage under a shadow root to set compiled hasSlots.',
);
assert.deepEqual(
  shadowResource.compilation.compiledTemplate.compiledTemplate.nativeSlotOutlets.map((outlet) => ({
    nameKind: outlet.nameKind,
    name: outlet.name,
    hasNameSource: outlet.nameSourceAddressHandle != null,
  })),
  [
    { nameKind: 'static', name: 'named', hasNameSource: true },
    { nameKind: 'default', name: '', hasNameSource: false },
    { nameKind: 'dynamic', name: null, hasNameSource: true },
  ],
  'Expected static, default, and bound native slot names to remain distinct without inventing a dynamic name.',
);
assert.deepEqual(
  slotReachabilityResource.compilation.compiledTemplate.compiledTemplate.nativeSlotOutlets.map(
    (outlet) => outlet.name,
  ),
  ['conditional'],
  'Expected compiler reachability to exclude a native slot inside an inert plain template while retaining a template-controller child.',
);
assert.equal(
  auSlotElementSourceText({ name: '' }),
  '<au-slot name=""></au-slot>',
  'Expected structured AuSlot source to preserve an explicit empty outlet name.',
);

const receiverUses = hydrateElements(appResource).filter(
  (instruction) => instruction.elementName === 'projection-receiver',
);
assert.equal(receiverUses.length, 4, 'Expected projected, default-only, and repeated empty projection-receiver uses.');
const multiSlotUse = receiverUses.find((instruction) => instruction.projectionInstructionSequences.length === 5);
assert.ok(multiSlotUse, 'Expected the multi-slot projection-receiver use.');
assert.deepEqual(
  multiSlotUse.projectionInstructionSequences.map((projection) => projection.slotName).sort(),
  ['actions', 'ambiguous', 'default', 'heading', 'unused'],
  'Expected repeated, default, ambiguous-host, and unmatched provider content to converge into five framework slot groups.',
);

const headingProjection = multiSlotUse.projectionInstructionSequences.find(
  (projection) => projection.slotName === 'heading',
);
assert.ok(headingProjection);
assert.equal(
  headingProjection.contributors.length,
  2,
  'Expected both authored heading children to remain available behind the aggregated projection definition.',
);
assert.ok(
  headingProjection.contributors.every((contributor) => contributor.slotNameSourceAddressHandle != null),
  'Expected each explicit repeated provider name to retain its exact source address.',
);
assert.equal(
  instructionSequence(appResource, headingProjection.instructionSequenceProductHandle)
    .instructions.filter((instruction) => instruction.instructionKind === TemplateInstructionKind.TextBinding)
    .length,
  2,
  'Expected repeated heading children to aggregate into one projection definition with both bindings.',
);

const actionProjection = multiSlotUse.projectionInstructionSequences.find(
  (projection) => projection.slotName === 'actions',
);
assert.ok(actionProjection);
const actionSequence = instructionSequence(appResource, actionProjection.instructionSequenceProductHandle);
assert.equal(
  actionSequence.instructions.filter(
    (instruction) => instruction.instructionKind === TemplateInstructionKind.HydrateTemplateController,
  ).length,
  1,
  'Expected <template au-slot repeat.for> to retain its template-controller wrapper.',
);
const repeatInstruction = appResource.compilation.compiledTemplate.instructions.find(
  (instruction) =>
    instruction instanceof HydrateTemplateControllerInstruction
    && actionSequence.instructions.some((reference) => reference.productHandle === instruction.productHandle),
);
assert.equal(repeatInstruction?.controllerName, 'repeat');

const defaultProjection = multiSlotUse.projectionInstructionSequences.find(
  (projection) => projection.slotName === 'default',
);
assert.ok(defaultProjection);
assert.ok(
  defaultProjection.contributors.some((contributor) => contributor.slotNameSourceAddressHandle != null),
  'Expected the explicit empty provider attribute to remain distinguishable from inferred default content.',
);
assert.ok(
  instructionSequence(appResource, defaultProjection.instructionSequenceProductHandle)
    .instructions.some((instruction) => instruction.instructionKind === TemplateInstructionKind.TextBinding),
  'Expected plain <template au-slot> content to be unwrapped into the projection sequence.',
);

const receiverOutlets = hydrateElements(receiverResource).filter(
  (instruction) => instruction.elementName === 'au-slot',
);
assert.deepEqual(
  receiverOutlets.map((instruction) => instruction.auSlotProcessContent?.name).sort(),
  ['', 'actions', 'ambiguous', 'ambiguous', 'default', 'heading', 'heading'],
  'Expected AuSlot.processContent slot-name data, including repeated outlets and the distinct empty-string name.',
);
assert.equal(
  receiverOutlets.find((instruction) => instruction.auSlotProcessContent?.name === 'default')
    ?.auSlotProcessContent?.nameSourceAddressHandle,
  null,
  'Expected the framework-inferred default outlet name not to masquerade as authored source.',
);
assert.notEqual(
  receiverOutlets.find((instruction) => instruction.auSlotProcessContent?.name === '')
    ?.auSlotProcessContent?.nameSourceAddressHandle,
  null,
  'Expected an explicitly empty outlet name to retain its exact authored value address.',
);
const asElementOutlet = receiverOutlets.find(
  (instruction) => instruction.auSlotProcessContent?.name === 'actions',
);
assert.equal(
  asElementOutlet?.resourceLookupName,
  'au-slot',
  'Expected as-element="au-slot" to lower through the canonical AuSlot resource.',
);
for (const slotName of ['heading', 'default', 'actions']) {
  const outlet = receiverOutlets.find((instruction) => instruction.auSlotProcessContent?.name === slotName);
  assert.ok(outlet, `Expected "${slotName}" outlet.`);
  assert.deepEqual(
    outlet.projectionInstructionSequences.map((projection) => projection.slotName),
    ['default'],
    `Expected "${slotName}" outlet fallback content to compile as the framework default fallback projection.`,
  );
}
assert.equal(
  receiverOutlets.find((instruction) => instruction.auSlotProcessContent?.name === '')
    ?.projectionInstructionSequences.length,
  0,
  'Expected the empty-name outlet to retain no fallback definition.',
);

const relayReceiverUse = hydrateElements(relayResource).find(
  (instruction) => instruction.elementName === 'projection-receiver',
);
assert.ok(relayReceiverUse);
const relayHeadingProjection = relayReceiverUse.projectionInstructionSequences.find(
  (projection) => projection.slotName === 'heading',
);
assert.ok(relayHeadingProjection, 'Expected nested re-projection into the receiver heading slot.');
const relayHeadingSequence = instructionSequence(
  relayResource,
  relayHeadingProjection.instructionSequenceProductHandle,
);
const forwardedOutlet = hydrateElements(relayResource).find(
  (instruction) =>
    instruction.auSlotProcessContent?.name === 'forwarded'
    && relayHeadingSequence.instructions.some((reference) => reference.productHandle === instruction.productHandle),
);
assert.ok(forwardedOutlet, 'Expected the nested AuSlot outlet to remain inside the projected instruction sequence.');

const shadowUse = hydrateElements(appResource).find(
  (instruction) => instruction.elementName === 'shadow-slot-receiver',
);
assert.deepEqual(
  shadowUse?.projectionInstructionSequences.map((projection) => projection.slotName),
  ['named'],
  'Expected a shadow host to project only explicitly named au-slot children; ordinary light DOM remains light DOM.',
);

const compilationRows = queryRows(SemanticAppQueryKind.TemplateCompilations, 'full');
const compilationRow = (name) => {
  const row = compilationRows.find((candidate) => candidate.definitionName === name);
  assert.ok(row, `Expected public compilation row "${name}".`);
  return row;
};
assert.equal(compilationRow('shadow-slot-receiver').compiledTemplateHasSlots, true);
assert.equal(compilationRow('projection-receiver').compiledTemplateHasSlots, false);
assert.equal(compilationRow('projection-receiver').compiledTemplateNeedsCompile, false);
assert.equal(compilationRow('content-projection-topology-app').contentProjectionSequences, 9);

const runtimeRendering = appResource.runtimeAnalysis.runtimeRendering;
const rootController = runtimeRendering.rootController;
const multiReceiverController = runtimeRendering.readControllerForInstructionUnderParent(
  multiSlotUse.productHandle,
  rootController,
);
assert.ok(multiReceiverController, 'Expected the multi-slot use to create one receiver controller under the app root.');

const rootHydrationContext = rootController.readHydrationContext();
const receiverConstructionContext = multiReceiverController.readConstructionHydrationContext();
const receiverHydrationContext = multiReceiverController.readHydrationContext();
assert.ok(rootHydrationContext);
assert.equal(
  receiverConstructionContext?.productHandle,
  rootHydrationContext.productHandle,
  'Expected receiver construction to resolve the declaring app context before Controller.$el installs its own.',
);
assert.equal(receiverHydrationContext?.controller.productHandle, multiReceiverController.productHandle);
assert.equal(receiverHydrationContext?.instructionProductHandle, multiSlotUse.productHandle);
assert.equal(receiverHydrationContext?.parent?.productHandle, rootHydrationContext.productHandle);

const multiSlotsInfo = multiReceiverController.readAuSlotsInfo();
assert.ok(multiSlotsInfo);
assert.equal(multiSlotsInfo.sourceKind, 'hydrate-element-instruction');
assert.deepEqual(multiSlotsInfo.projectedSlots, ['default', 'heading', 'ambiguous', 'actions', 'unused']);
assert.deepEqual(
  multiSlotsInfo.projections.map((projection) => projection.slotName),
  multiSlotsInfo.projectedSlots,
  'Expected IAuSlotsInfo to retain the exact compiler projection groups behind its public name list.',
);
assert.deepEqual(
  multiSlotsInfo.projections.map((projection) => projection.contributorSourceAddressHandles.length),
  multiSlotUse.projectionInstructionSequences.map((projection) => projection.contributors.length),
  'Expected IAuSlotsInfo projection provenance to retain every grouped contributor.',
);

const emptyReceiverUse = receiverUses.find((instruction) => instruction.projectionInstructionSequences.length === 0);
assert.ok(emptyReceiverUse);
const emptyReceiverController = runtimeRendering.readControllerForInstructionUnderParent(
  emptyReceiverUse.productHandle,
  rootController,
);
assert.equal(emptyReceiverController?.readAuSlotsInfo()?.sourceKind, 'intrinsic-empty');
assert.deepEqual(emptyReceiverController?.readAuSlotsInfo()?.projectedSlots, []);
assert.ok(emptyReceiverController);

const fallbackCaptureInstructions = runtimeRendering.dynamicInstructions.filter((instruction) => {
  const context = runtimeRendering.readDynamicInstructionContext(instruction.productHandle);
  return context?.hydrationContext.instructionProductHandle === emptyReceiverUse.productHandle
    && context.requestorDefinitionProductHandle === receiverResource.compilation.definition.productHandle;
});
assert.equal(
  fallbackCaptureInstructions.length,
  2,
  'Expected both captured attributes from the empty receiver use to compile inside receiver-owned fallback content.',
);
for (const instruction of fallbackCaptureInstructions) {
  const context = runtimeRendering.readDynamicInstructionContext(instruction.productHandle);
  assert.ok(context);
  assert.equal(
    context.hydrationContext.productHandle,
    emptyReceiverController.readHydrationContext()?.productHandle,
  );
  assert.equal(
    context.hydrationContext.controller.productHandle,
    emptyReceiverController.productHandle,
    'Expected spread compilation to follow IHydrationContext ownership rather than synthetic controller ancestry.',
  );
}
const fallbackCaptureBindings = fallbackCaptureInstructions.flatMap((instruction) =>
  runtimeRendering.readBindingsForInstruction(instruction.productHandle)
);
assert.equal(fallbackCaptureBindings.length, 1);
const fallbackCaptureRenderContext = runtimeRendering.requireRenderContextForBinding(
  fallbackCaptureBindings[0].productHandle,
);
assert.equal(fallbackCaptureRenderContext.sourceController.productHandle, emptyReceiverController.productHandle);
assert.equal(fallbackCaptureRenderContext.renderingController.creationKind, 'synthetic-view');
assert.equal(
  fallbackCaptureRenderContext.resourceScope.productHandle,
  receiverResource.compilation.compilerWorld.resourceScope.productHandle,
);

const receiverContainerSlots = runtimeRendering.childContextResolverSlots.filter((slot) =>
  slot.container.productHandle === multiReceiverController.container.productHandle
);
const preparedContextValue = (name) => {
  const slot = receiverContainerSlots.find((candidate) => candidate.resolver?.friendlyName === name);
  assert.ok(slot, `Expected a prepared ${name} contextual provider in the receiver container.`);
  const resolution = slot.resolver.resolve();
  assert.equal(resolution.resolutionKind, 'instance');
  assert.ok(resolution.value, `Expected ${name} to retain its exact prepared runtime value.`);
  return resolution.value;
};
assert.equal(preparedContextValue('IController').productHandle, rootController.productHandle);
assert.equal(preparedContextValue('IInstruction').productHandle, multiSlotUse.productHandle);
assert.equal(preparedContextValue('IAuSlotsInfo').productHandle, multiSlotsInfo.productHandle);
assert.equal(preparedContextValue('IHydrationContext').productHandle, receiverHydrationContext.productHandle);

const multiViews = runtimeRendering.contentProjectionViews.filter((view) =>
  view.providerInstruction?.productHandle === multiSlotUse.productHandle
);
assert.equal(multiViews.length, 7, 'Expected six selected outlet realizations plus the distinct empty-name outlet.');
assert.equal(
  multiViews.some((view) => view.slotName === 'unused'),
  false,
  'Expected unmatched provider content to remain in IAuSlotsInfo without inventing a receiving outlet.',
);
const selectedMultiViews = multiViews.filter((view) => view.selectionKind === 'projected');
assert.deepEqual(
  selectedMultiViews.map((view) => view.slotName).sort(),
  ['actions', 'ambiguous', 'ambiguous', 'default', 'heading', 'heading'],
);
for (const view of selectedMultiViews) {
  assert.equal(view.closureKind, 'complete');
  assert.equal(view.declaringController?.productHandle, rootController.productHandle);
  assert.equal(view.receivingController?.productHandle, multiReceiverController.productHandle);
  assert.equal(view.factoryHydrationContext?.productHandle, rootHydrationContext.productHandle);
  assert.equal(
    view.syntheticController?.readHydrationContext()?.productHandle,
    rootHydrationContext.productHandle,
  );
  assert.deepEqual(
    view.factoryContainer?.readResourceSlots().map((slot) => slot.resourceKey),
    declaringResourceKeys,
    'Expected selected content to import the declaring template resource scope exactly.',
  );
}

const repeatedHeadingViews = selectedMultiViews.filter((view) => view.slotName === 'heading');
assert.equal(repeatedHeadingViews.length, 2);
assert.equal(
  repeatedHeadingViews[0].instructionSequence?.productHandle,
  repeatedHeadingViews[1].instructionSequence?.productHandle,
);
assert.equal(
  repeatedHeadingViews[0].viewFactory?.definitionProductHandle,
  repeatedHeadingViews[1].viewFactory?.definitionProductHandle,
);
assert.notEqual(
  repeatedHeadingViews[0].viewFactory?.productHandle,
  repeatedHeadingViews[1].viewFactory?.productHandle,
);
assert.notEqual(
  repeatedHeadingViews[0].syntheticController?.productHandle,
  repeatedHeadingViews[1].syntheticController?.productHandle,
);
assert.notEqual(
  repeatedHeadingViews[0].factoryContainer?.productHandle,
  repeatedHeadingViews[1].factoryContainer?.productHandle,
);

const emptyUseViews = runtimeRendering.contentProjectionViews.filter((view) =>
  view.providerInstruction?.productHandle === emptyReceiverUse.productHandle
);
for (const view of emptyUseViews.filter((candidate) => candidate.selectionKind === 'fallback')) {
  assert.equal(view.declaringController?.productHandle, emptyReceiverController.productHandle);
  assert.equal(view.receivingController?.productHandle, emptyReceiverController.productHandle);
  assert.equal(
    view.factoryHydrationContext?.productHandle,
    emptyReceiverController.readHydrationContext()?.productHandle,
  );
  assert.deepEqual(
    view.factoryContainer?.readResourceSlots().map((slot) => slot.resourceKey),
    receivingResourceKeys,
    'Expected fallback content to inherit receiver-owned resources without importing declaring-template resources.',
  );
}
for (const view of emptyUseViews.filter((candidate) => candidate.selectionKind === 'empty')) {
  assert.equal(view.viewFactory, null);
  assert.equal(view.syntheticController, null);
  assert.equal(view.factoryContainer, null);
}

const relayUse = hydrateElements(appResource).find((instruction) =>
  instruction.elementName === 'projection-relay'
);
assert.ok(relayUse);
const forwardedViews = runtimeRendering.contentProjectionViews.filter((view) =>
  view.providerInstruction?.productHandle === relayUse.productHandle
    && view.slotName === 'forwarded'
    && view.selectionKind === 'projected'
);
assert.equal(forwardedViews.length, 2, 'Expected both repeated receiver outlets to close nested re-projection.');
for (const view of forwardedViews) {
  assert.equal(view.factoryHydrationContext?.productHandle, rootHydrationContext.productHandle);
  assert.deepEqual(
    view.factoryContainer?.readResourceSlots().map((slot) => slot.resourceKey),
    declaringResourceKeys,
  );
}
assert.ok(
  runtimeRendering.scopeEffects.some((effect) => effect.effectKind === 'iterator'),
  'Expected repeat.for inside projected content to retain its iterator scope effect.',
);

const rootConverterEntries = appResource.runtimeAnalysis.expressionResourcePlan.converterEntries;
const assertBindingResourceEnvironment = (entry, expectedName) => {
  assert.equal(
    entry.resource?.name,
    expectedName,
    `Expected recursively rendered '${expectedName}' to resolve through its binding-owned compiler scope.`,
  );
  const renderContext = runtimeRendering.requireRenderContextForBinding(entry.binding.productHandle);
  assert.ok(
    renderContext.resourceScope.resources.some((candidate) => candidate.name === expectedName),
    `Expected '${expectedName}' in the exact compiler scope retained by its render context.`,
  );
  assert.ok(
    renderContext.requireActiveContainer().readResourceSlots().some(
      (slot) => slot.resourceKey === `au:resource:value-converter:${expectedName}`,
    ),
    `Expected '${expectedName}' in the exact runtime container retained by its render context.`,
  );
};
const recursiveFallbackConverterEntries = rootConverterEntries.filter(
  (entry) => entry.expression.name.name === 'fallbackLabel',
);
assert.ok(
  recursiveFallbackConverterEntries.length > 0,
  'Expected app-root recursive rendering to include receiver-owned fallback converter bindings.',
);
recursiveFallbackConverterEntries.forEach((entry) =>
  assertBindingResourceEnvironment(entry, 'fallbackLabel')
);
const projectedProviderConverterEntries = rootConverterEntries.filter(
  (entry) => entry.expression.name.name === 'projectionLabel',
);
assert.ok(
  projectedProviderConverterEntries.length > 0,
  'Expected app-root recursive rendering to include declaring-owner projected converter bindings.',
);
projectedProviderConverterEntries.forEach((entry) =>
  assertBindingResourceEnvironment(entry, 'projectionLabel')
);
const fallbackBehaviorEntries = appResource.runtimeAnalysis.expressionResourcePlan.behaviorEntries.filter(
  (entry) => entry.occurrence.expression.name.name === 'fallbackAudit',
);
const fallbackBehaviorEntriesByExpression = new Map();
for (const entry of fallbackBehaviorEntries) {
  const expression = entry.occurrence.expression;
  const entries = fallbackBehaviorEntriesByExpression.get(expression) ?? [];
  entries.push(entry);
  fallbackBehaviorEntriesByExpression.set(expression, entries);
}
const reusedFallbackBehaviorEntries = [...fallbackBehaviorEntriesByExpression.values()].find(
  (entries) => entries.length > 1,
);
assert.ok(
  reusedFallbackBehaviorEntries,
  'Expected one authored receiver fallback behavior to produce multiple rendered binding applications.',
);
for (const entry of reusedFallbackBehaviorEntries) {
  assert.equal(
    appResource.runtimeAnalysis.expressionResourcePlan.readBindingBehaviorEntry(
      entry.occurrence.expression,
      entry.binding.productHandle,
    ),
    entry,
    'Expected bind-time source projection to select the behavior plan for the exact rendered binding.',
  );
}

const compositionRows = queryRows(SemanticAppQueryKind.RuntimeCompositions, 'handles');
const declaringComposition = compositionRows.find((row) =>
  row.renderingDefinitionName === 'content-projection-topology-app'
    && row.resolvedComponentClassNames.includes('DeclaringComposeWidget')
);
assert.ok(declaringComposition);
assert.deepEqual(declaringComposition.resolvedComponentNames, ['scoped-compose-widget']);
const recursiveFallbackComposition = compositionRows.find((row) =>
  row.renderingDefinitionName === 'content-projection-topology-app'
    && row.resolvedComponentClassNames.includes('ReceivingComposeWidget')
);
assert.ok(recursiveFallbackComposition);
assert.deepEqual(recursiveFallbackComposition.resolvedComponentNames, ['scoped-compose-widget']);
assert.notEqual(
  declaringComposition.handles.instructionProductHandle,
  recursiveFallbackComposition.handles.instructionProductHandle,
);
assert.ok(
  compositionRows.some((row) =>
    row.renderingDefinitionName === 'projection-receiver'
      && row.resolvedComponentClassNames.includes('ReceivingComposeWidget')
  ),
  'Expected receiver-owned fallback composition to retain the receiving registration in definition analysis too.',
);

const projectionRows = queryRows(SemanticAppQueryKind.TemplateContentProjections, 'handles');
assert.equal(projectionRows.length, 74);
assert.deepEqual(
  Object.fromEntries(
    ['provider-sequence', 'au-slot-view', 'native-slot-outlet'].map((surfaceKind) => [
      surfaceKind,
      projectionRows.filter((row) => row.surfaceKind === surfaceKind).length,
    ]),
  ),
  {
    'provider-sequence': 15,
    'au-slot-view': 55,
    'native-slot-outlet': 4,
  },
);
const multiViewRows = projectionRows.filter((row) =>
  row.surfaceKind === 'au-slot-view'
    && row.handles.providerInstructionProductHandle === multiSlotUse.productHandle
);
assert.equal(multiViewRows.length, 7);
assert.ok(multiViewRows.every((row) => row.auSlotsInfoSourceKind === 'hydrate-element-instruction'));
assert.ok(multiViewRows.every((row) => row.providerProjectedSlotNames.includes('unused')));
assert.ok(
  projectionRows.some((row) =>
    row.surfaceKind === 'au-slot-view' && row.auSlotsInfoSourceKind == null
  ),
  'Expected root-only receiver analysis to preserve absence instead of collapsing it into intrinsic empty slots info.',
);

const controllerRows = queryRows(SemanticAppQueryKind.RuntimeControllers, 'handles');
const multiReceiverRow = controllerRows.find((row) =>
  row.renderingDefinitionName === 'content-projection-topology-app'
    && row.handles?.instructionProductHandle === multiSlotUse.productHandle
);
assert.ok(multiReceiverRow);
assert.equal(
  multiReceiverRow.handles.constructionHydrationContextProductHandle,
  rootHydrationContext.productHandle,
);
assert.equal(
  multiReceiverRow.handles.hydrationContextProductHandle,
  receiverHydrationContext.productHandle,
);
assert.equal(multiReceiverRow.handles.auSlotsInfoProductHandle, multiSlotsInfo.productHandle);
for (const row of multiViewRows.filter((candidate) => candidate.selectionKind === 'projected')) {
  assert.equal(
    row.handles.factoryHydrationContextProductHandle,
    rootHydrationContext.productHandle,
  );
}

for (const resourceSlot of selectedMultiViews.flatMap((view) =>
  view.factoryContainer.readResourceSlots()
)) {
  const claims = store.readClaimsForSubject(resourceSlot.productHandle)
    .map((handle) => store.readClaim(handle))
    .filter((claim) => claim != null);
  assert.ok(
    claims.some((claim) => claim.predicateKey === KernelVocabulary.Di.ResourceSlotImportedFrom.key),
    'Expected every imported projection resource slot to name its exact producer slot.',
  );
  assert.ok(
    store.readClaimsForObject(resourceSlot.productHandle)
      .map((handle) => store.readClaim(handle))
      .some((claim) => claim?.predicateKey === KernelVocabulary.Di.ProducesProduct.key),
    'Expected every imported projection resource slot to remain owned by its factory container.',
  );
}

const nativeOutletRows = projectionRows.filter((row) => row.surfaceKind === 'native-slot-outlet');
assert.deepEqual(
  nativeOutletRows.map((row) => ({
    owner: row.renderingDefinitionName,
    nameKind: row.nameKind,
    name: row.slotName,
    hasNameSource: row.handles.nameSourceAddressHandle != null,
  })),
  [
    { owner: 'shadow-slot-receiver', nameKind: 'static', name: 'named', hasNameSource: true },
    { owner: 'shadow-slot-receiver', nameKind: 'default', name: '', hasNameSource: false },
    { owner: 'shadow-slot-receiver', nameKind: 'dynamic', name: null, hasNameSource: true },
    { owner: 'slot-reachability-receiver', nameKind: 'static', name: 'conditional', hasNameSource: true },
  ],
);

const opaqueCarrierStart = appTemplateText.indexOf('<opaque-content-shell>');
const opaqueCarrierEnd = appTemplateText.indexOf('</opaque-content-shell>', opaqueCarrierStart)
  + '</opaque-content-shell>'.length;
const opaqueReceiverStart = appTemplateText.indexOf('<projection-receiver expose-heading.bind', opaqueCarrierStart);
const opaqueReceiverEnd = appTemplateText.indexOf('</projection-receiver>', opaqueReceiverStart)
  + '</projection-receiver>'.length;
const opaqueExpressionStart = appTemplateText.indexOf('${message | projectionLabel}', opaqueReceiverStart);
const opaqueAttributeStart = appTemplateText.indexOf('expose-heading.bind', opaqueReceiverStart);
assert.ok(
  opaqueCarrierStart >= 0
    && opaqueCarrierEnd > opaqueCarrierStart
    && opaqueReceiverStart >= opaqueCarrierStart
    && opaqueReceiverEnd <= opaqueCarrierEnd
    && opaqueExpressionStart >= opaqueReceiverStart
    && opaqueAttributeStart >= opaqueReceiverStart,
  'Expected the processContent forcing loci in the app template.',
);
const elementAtOffset = (offset, tagName) =>
  appResource.compilation.html.nodes
    .filter((node) => {
      if (!(node instanceof HtmlElement) || node.tagName !== tagName) {
        return false;
      }
      const span = sourceSpanAddressForAddress(store, node.sourceAddressHandle);
      return span != null && span.start <= offset && offset < span.end;
    })
    .sort((left, right) => {
      const leftSpan = sourceSpanAddressForAddress(store, left.sourceAddressHandle);
      const rightSpan = sourceSpanAddressForAddress(store, right.sourceAddressHandle);
      return (leftSpan.end - leftSpan.start) - (rightSpan.end - rightSpan.start);
    })[0] ?? null;
const opaqueCarrier = elementAtOffset(opaqueCarrierStart + 1, 'opaque-content-shell');
const opaqueReceiver = elementAtOffset(opaqueReceiverStart + 1, 'projection-receiver');
assert.ok(opaqueCarrier);
assert.ok(opaqueReceiver);
const compilerReachableNodes = new Set(
  appResource.compilation.compiledTemplate.compiledTemplate.compilerReachableNodeProductHandles,
);
assert.equal(
  compilerReachableNodes.has(opaqueCarrier.productHandle),
  true,
  'Expected compiler traversal to retain the processContent host itself.',
);
assert.equal(
  compilerReachableNodes.has(opaqueReceiver.productHandle),
  false,
  'Expected compiler traversal to exclude the authored child subtree hidden by processContent.',
);
assert.ok(
  appResource.compilation.authoredAttributeSyntaxes.some((syntax) => syntax.rawName === 'click.delegate'),
  'Expected authored syntax products to retain an opaque removed-v1 binding command.',
);
assert.ok(
  appResource.compilation.attributeClassification.issues.some(
    (issue) => issue.issueKind === TemplateCompilerIssueKind.UnknownBindingCommand,
  ),
  'Expected pre-traversal classification to retain the authored compiler issue before reachability projection.',
);

const authoredParses = resourceLocalAuthoredTemplateExpressionParses(store, appResource);
const effectiveParses = resourceLocalEffectiveTemplateExpressionParses(store, appResource);
const opaqueAuthoredParses = authoredParses.filter((parse) =>
  store.productDetails.read(TemplateProductDetails.ValueSite, parse.site.productHandle)
    ?.rawValue.includes('notCompiledByOpenProcessContent')
);
assert.equal(
  opaqueAuthoredParses.length,
  1,
  'Expected authored syntax products to retain the expression inside an open processContent subtree.',
);
assert.equal(
  effectiveParses.some((parse) => parse.productHandle === opaqueAuthoredParses[0].productHandle),
  false,
  'Expected compiler-effective expression selection to exclude the open processContent subtree.',
);

const appOverlay = new TemplateTypeSystemOverlayBuilder(
  store,
  app.emission.project,
  app.emission.typeSystem,
).build(appResource);
assert.equal(
  appOverlay.expressionProbes.some((probe) =>
    probe.authoredExpressionText?.includes('notCompiledByOpenProcessContent')
  ),
  false,
  'Expected TypeScript overlays not to type-check expressions that the compiler never retained.',
);
const capturedFallbackLabelStart = appTemplateText.indexOf('fallbackLabel');
const capturedFallbackAuditStart = appTemplateText.indexOf('fallbackAudit');
const capturedFallbackProbe = appOverlay.expressionProbes.find((probe) =>
  probe.authoredExpressionText === 'message | fallbackLabel & fallbackAudit:heading'
);
assert.ok(capturedFallbackProbe);
assert.match(
  capturedFallbackProbe.overlayExpressionText,
  /__au_resource_\d+_fallbackLabel\.toView\(message\)/u,
  'Expected a captured spread expression overlay to spend its binding-owned receiver resource plan.',
);
assert.equal(
  capturedFallbackProbe.overlayExpressionText.includes('__au_missing_value_converter'),
  false,
  'Expected the app root compiler scope not to mask the converter selected during receiver-owned spread compilation.',
);
assert.match(
  capturedFallbackProbe.overlayExpressionText,
  /__au_binding_behavior_argument<string>\(heading\)/u,
  'Expected captured binding-behavior arguments to spend the receiver-owned compiler resource scope.',
);
for (const [name, resourceKind, start] of [
  ['fallbackLabel', 'value-converter', capturedFallbackLabelStart],
  ['fallbackAudit', 'binding-behavior', capturedFallbackAuditStart],
]) {
  const cursor = cursorAtOffset(start + 1);
  const cursorInfo = app.ask({
    kind: SemanticAppQueryKind.TemplateCursorInfo,
    detail: 'handles',
    cursor,
  });
  assert.equal(
    cursorInfo.value.selectedDefinition?.name,
    name,
    `Expected captured ${resourceKind} cursor dispatch to spend the runtime-selected receiver resource.`,
  );
  assert.equal(cursorInfo.value.selectedDefinition?.resourceKind, resourceKind);
  const completions = app.ask({
    kind: SemanticAppQueryKind.TemplateCompletions,
    detail: 'handles',
    cursor,
    page: { size: 100 },
  });
  assert.ok(
    completions.value.candidates.some((candidate) =>
      candidate.candidateKind === resourceKind
        && candidate.name === name
    ),
    `Expected captured ${resourceKind} completion to read the binding-owned receiver compiler scope.`,
  );
}

const opaqueMessageCursor = app.ask({
  kind: SemanticAppQueryKind.TemplateCursorInfo,
  detail: 'handles',
  cursor: cursorAtOffset(opaqueExpressionStart + '${'.length + 1),
});
assert.equal(opaqueMessageCursor.value.selectedMemberName, null);
assert.equal(opaqueMessageCursor.value.selectedMember, null);
assert.equal(opaqueMessageCursor.value.memberOwnerType, null);
assert.equal(opaqueMessageCursor.value.selectedDefinition, null);
assert.equal(opaqueMessageCursor.value.selectedBindable, null);

const opaqueTagCursor = app.ask({
  kind: SemanticAppQueryKind.TemplateCursorInfo,
  detail: 'handles',
  cursor: cursorAtOffset(opaqueReceiverStart + '<'.length + 1),
});
assert.equal(
  opaqueTagCursor.value.selectedDefinition,
  null,
  'Expected an element-shaped child hidden by processContent not to resolve as a compiler-effective resource use.',
);
const opaqueAttributeCursor = app.ask({
  kind: SemanticAppQueryKind.TemplateCursorInfo,
  detail: 'handles',
  cursor: cursorAtOffset(opaqueAttributeStart + 1),
});
assert.equal(
  opaqueAttributeCursor.value.selectedDefinition,
  null,
  'Expected an attribute-shaped child hidden by processContent not to resolve through its authored classification.',
);
assert.equal(
  opaqueAttributeCursor.value.selectedBindable,
  null,
  'Expected an opaque authored bindable spelling not to masquerade as a compiler-effective bindable use.',
);

const knownProjectionLabelStart = appTemplateText.indexOf('projectionLabel');
const projectionLabelReferences = app.ask({
  kind: SemanticAppQueryKind.TemplateReferences,
  detail: 'handles',
  includeDeclaration: true,
  cursor: cursorAtOffset(knownProjectionLabelStart + 1),
  page: { size: 100 },
});
assert.equal(
  projectionLabelReferences.value.rows.some((row) =>
    row.source?.path === 'src/content-projection-topology-app.html'
      && row.source.start >= opaqueCarrierStart
      && row.source.end <= opaqueCarrierEnd
  ),
  false,
  'Expected resource references to exclude converter-like syntax that processContent made compiler-opaque.',
);
const receiverFallbackLabelStart = receiverTemplateText.indexOf('fallbackLabel');
const fallbackLabelReferences = app.ask({
  kind: SemanticAppQueryKind.TemplateReferences,
  detail: 'handles',
  includeDeclaration: true,
  cursor: cursorForText(
    'src/projection-receiver.html',
    receiverTemplateText,
    receiverFallbackLabelStart + 1,
  ),
  page: { size: 100 },
});
assert.ok(
  fallbackLabelReferences.value.rows.some((row) =>
    row.source?.path === 'src/content-projection-topology-app.html'
      && row.source.start === capturedFallbackLabelStart
      && row.source.end === capturedFallbackLabelStart + 'fallbackLabel'.length
  ),
  'Expected resource references to spend runtime expression-resource resolution for captured spread syntax.',
);
const receiverFallbackAuditStart = receiverTemplateText.indexOf('fallbackAudit');
const reusedFallbackAuditCursor = app.ask({
  kind: SemanticAppQueryKind.TemplateCursorInfo,
  detail: 'handles',
  cursor: cursorForText(
    'src/projection-receiver.html',
    receiverTemplateText,
    receiverFallbackAuditStart + 1,
  ),
});
assert.equal(reusedFallbackAuditCursor.value.selectedDefinition?.name, 'fallbackAudit');
assert.equal(
  reusedFallbackAuditCursor.value.missingInputs.includes('runtime-binding-source-context'),
  false,
  'Expected equivalent repeated runtime applications to converge without losing their binding-exact source context.',
);
const fallbackAuditReferences = app.ask({
  kind: SemanticAppQueryKind.TemplateReferences,
  detail: 'handles',
  includeDeclaration: true,
  cursor: cursorForText(
    'src/projection-receiver.html',
    receiverTemplateText,
    receiverFallbackAuditStart + 1,
  ),
  page: { size: 100 },
});
assert.ok(
  fallbackAuditReferences.value.rows.some((row) =>
    row.source?.path === 'src/content-projection-topology-app.html'
      && row.source.start === capturedFallbackAuditStart
      && row.source.end === capturedFallbackAuditStart + 'fallbackAudit'.length
  ),
  'Expected binding-behavior references to spend runtime expression-resource resolution for captured spread syntax.',
);

const ambiguousProjectionMemberStart = appTemplateText.indexOf(
  '$host.exposedLabel',
  appTemplateText.indexOf('au-slot="ambiguous"'),
) + '$host.'.length;
assert.ok(
  ambiguousProjectionMemberStart >= '$host.'.length,
  'Expected the deliberately ambiguous projected member expression.',
);
const ambiguousProjectionCursor = cursorAtOffset(ambiguousProjectionMemberStart + 1);
const ambiguousProjectionCursorInfo = app.ask({
  kind: SemanticAppQueryKind.TemplateCursorInfo,
  detail: 'handles',
  cursor: ambiguousProjectionCursor,
});
assert.ok(
  ambiguousProjectionCursorInfo.value.missingInputs.includes('runtime-binding-source-context'),
  'Expected distinct AuSlot exposure contexts to keep the shared authored expression open.',
);
assert.equal(ambiguousProjectionCursorInfo.value.selectedMemberName, null);
assert.equal(ambiguousProjectionCursorInfo.value.selectedMember, null);
assert.equal(ambiguousProjectionCursorInfo.value.memberOwnerType, null);
const ambiguousProjectionReferences = app.ask({
  kind: SemanticAppQueryKind.TemplateReferences,
  detail: 'handles',
  includeDeclaration: true,
  cursor: ambiguousProjectionCursor,
  page: { size: 100 },
});
assert.equal(
  ambiguousProjectionReferences.value.rows.length,
  0,
  'References must not substitute an authored or root scope when rendered source contexts diverge.',
);
const ambiguousProjectionRename = app.ask({
  kind: SemanticAppQueryKind.TemplateRename,
  detail: 'handles',
  cursor: ambiguousProjectionCursor,
  newName: 'renamedExposure',
});
assert.equal(ambiguousProjectionRename.result, 'answered');
assert.equal(ambiguousProjectionRename.selection, 'absent');
assert.equal(ambiguousProjectionRename.coverage, 'complete');
assert.equal(
  ambiguousProjectionRename.value.status,
  'not-available',
  'Rename must refuse rather than assemble edits from one arbitrarily selected rendered context.',
);

const semanticTokens = app.ask({
  kind: SemanticAppQueryKind.TemplateSemanticTokens,
  detail: 'handles',
  sourceFile: { filePath: 'src/content-projection-topology-app.html' },
  page: { size: 1_000 },
}).value.rows;
const opaqueSemanticTokens = semanticTokens.filter((row) =>
  row.source?.path === 'src/content-projection-topology-app.html'
    && row.source.start >= opaqueReceiverStart
    && row.source.end <= opaqueReceiverEnd
);
for (const text of ['message', 'projectionLabel', 'notCompiledByOpenProcessContent']) {
  assert.ok(
    opaqueSemanticTokens.some((row) =>
      appTemplateText.slice(row.source.start, row.source.end) === text
    ),
    `Expected authored expression syntax token "${text}" to survive the compiler-effective semantic boundary.`,
  );
}
assert.equal(
  opaqueSemanticTokens.some((row) =>
    row.tokenType === 'aureliaBindable'
      || row.tokenType === 'aureliaCommand'
  ),
  false,
  'Expected semantic tokens not to present an opaque authored attribute as compiler-effective Aurelia syntax.',
);

const diagnostics = queryRows(SemanticAppQueryKind.AppDiagnostics, 'full');
assert.deepEqual(
  diagnostics.map((diagnostic) => diagnostic.diagnosticKind).sort(),
  ['missing-expression-member', 'template-expression-typescript-diagnostic'],
  'Expected only the deliberately invalid projected-owner access to produce diagnostics.',
);
assert.ok(diagnostics.every((diagnostic) =>
  diagnostic.source?.label === 'src/projection-relay.html@88..101'
));

const openSeams = queryRows(SemanticAppQueryKind.OpenSeams, 'full');
const processContentSeams = openSeams.filter((row) =>
  row.seamKindKey === 'compiler.open-process-content-hook'
);
assert.equal(processContentSeams.length, 1);
assert.equal(
  processContentSeams[0].source?.path,
  'src/content-projection-topology-app.html',
);
const projectionSeams = openSeams.filter((row) =>
  row.seamKindKey === 'compiler.open-content-projection'
    || row.seamKindKey === 'di.open-child-container'
    || row.summary.includes('AuSlot')
);
assert.deepEqual(
  projectionSeams,
  [],
  'Expected known compiler, container, and hydration-context projection paths to close without seams.',
);

console.log(JSON.stringify({
  ok: true,
  summary: {
    resources: resources.length,
    receiverUses: receiverUses.length,
    receiverOutlets: receiverOutlets.length,
    publicProjectionRows: projectionRows.length,
    hydrationContexts: runtimeRendering.hydrationContexts.length,
    auSlotsInfos: runtimeRendering.auSlotsInfos.length,
    projectedSequences: compilationRows.reduce(
      (count, row) => count + row.contentProjectionSequences,
      0,
    ),
  },
}, null, 2));
