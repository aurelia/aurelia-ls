import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSemanticRuntime } from '../out/index.js';
import { readEvaluationPrimitive } from '../out/evaluation/values.js';
import { RuntimeBindingSourceValueEvaluator } from '../out/observation/binding-source-value-evaluator.js';
import { RuntimeBindingSourceValueEvaluationContext } from '../out/observation/binding-source-value-evaluation-context.js';
import { runtimeBoundControllerValueTableForTemplateResources } from '../out/observation/runtime-bound-controller-value.js';
import { bindingExpressionAstForProduct } from '../out/template/expression-parse-product.js';
import { instructionScopeLookup } from '../out/observation/runtime-binding-expression.js';
import { bindingContextSlotTargetTypeShape } from '../out/configuration/binding-scope-slot-projector.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/au-compose-dynamic-composition');
const writerLifecycleFixtureRoot = path.join(
  packageRoot,
  'fixtures/pressure/runtime-bound-controller-writer-lifecycle',
);

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'runtime-composition-bound-controller-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const compositions = app.ask({
  kind: 'runtime-compositions',
  page: { size: 100 },
}).value.rows;

const widgetHostRows = compositions.filter((row) =>
  row.source?.label?.includes('widget-host.html') === true
);
const overloadedChartRows = compositions.filter((row) =>
  row.resolvedComponentClassNames?.includes('ChartWidget') === true
);
const openRows = compositions.filter((row) => row.openReason != null);
const typeCandidateRows = compositions.filter((row) => row.componentResolutionKind === 'type-candidate');
const writerLifecycle = await readWriterLifecycleProbe();
const failures = [
  widgetHostRows.length === 2
    ? null
    : `Expected 2 widget-host runtime composition rows; observed ${widgetHostRows.length}.`,
  widgetHostRows.some((row) => row.renderingContextKind === 'recursive-resource-instance')
    ? null
    : 'Expected a recursive-resource-instance widget-host row from the parent render pass.',
  widgetHostRows.some((row) => row.renderingContextKind === 'definition-resource')
    ? null
    : 'Expected a definition-resource widget-host row from the resource analysis pass.',
  typeCandidateRows.length === 1
    && typeCandidateRows[0].componentCandidateCoverageKind === 'complete'
    && typeCandidateRows[0].componentInputConsumptionKind === 'await-thenable'
    && typeCandidateRows[0].componentInputValueStateKind === 'open'
    && typeCandidateRows[0].resolvedComponentClassNames.includes('ChartWidget')
    && typeCandidateRows[0].resolvedComponentClassNames.includes('InventoryWidget')
    && typeCandidateRows[0].composedChildControllerCount === 0
    && typeCandidateRows[0].openReason == null
    ? null
    : `Expected the repeat-local composition to retain complete type candidates without claiming a concrete child controller or an analysis seam: ${JSON.stringify(typeCandidateRows[0] ?? null)}.`,
  ...widgetHostRows.map((row) =>
    row.componentResolutionKind === 'static-value'
    && row.modelResolutionKind === 'static-value'
    && row.resolvedComponentClassNames.includes('InventoryWidget')
      ? null
      : `Widget-host row did not close to InventoryWidget via bound-controller value flow: ${JSON.stringify({
        renderingDefinitionName: row.renderingDefinitionName,
        componentResolutionKind: row.componentResolutionKind,
        modelResolutionKind: row.modelResolutionKind,
        resolvedComponentClassNames: row.resolvedComponentClassNames,
        openReason: row.openReason,
      })}`
  ),
  ...compositions.filter((row) => row.composedChildControllerCount > 0).map((row) =>
    row.composedChildContainerCount === row.composedChildControllerCount
    && row.composedChildContextResolverSlotCount > 0
      ? null
      : `Closed composed-child controller handoff lost its DI container or contextual providers: ${JSON.stringify({
        source: row.source?.label ?? null,
        composedChildControllerCount: row.composedChildControllerCount,
        composedChildContainerCount: row.composedChildContainerCount,
        composedChildContextResolverSlotCount: row.composedChildContextResolverSlotCount,
      })}`
  ),
  overloadedChartRows.length > 0
    ? null
    : 'Expected at least one ChartWidget composition row to prove overloaded activate(model) signature selection.',
  ...overloadedChartRows.map((row) =>
    row.activationHandoffKinds.includes('model-assignable')
    && row.activationParameterTypes.some((type) =>
      type.includes('DashboardWidgetModel') && type.includes('notTheDashboardModel')
    )
      ? null
      : `ChartWidget row did not project overloaded activate(model) parameter candidates as an assignable union: ${JSON.stringify({
        source: row.source?.label ?? null,
        activationHandoffKinds: row.activationHandoffKinds,
        activationParameterTypes: row.activationParameterTypes,
        modelAssignableToActivationParameterCount: row.modelAssignableToActivationParameterCount,
      })}`
  ),
  writerLifecycle.controllerFound
    ? null
    : 'Expected the bound-writer-panel runtime controller to be materialized.',
  writerLifecycle.valueWriterCount === 2
    ? null
    : `Expected both parent bindings for the child value property to survive indexing; observed ${writerLifecycle.valueWriterCount}.`,
  writerLifecycle.unambiguousValueRead == null
    ? null
    : `Expected the steady-state value read to remain ambiguous with two live writers; observed ${JSON.stringify(writerLifecycle.unambiguousValueRead)}.`,
  writerLifecycle.initialValueRead === 'secondValue'
    ? null
    : `Expected render-order initial settlement to select the last value writer; observed ${writerLifecycle.initialValueRead ?? 'missing'}.`,
  writerLifecycle.interpolatedValue === 'before-first-middle-second-after'
    ? null
    : `Expected the complete attribute interpolation to feed the child property; observed ${JSON.stringify(writerLifecycle.interpolatedValue)}.`,
  writerLifecycle.convertedValue === 'parent:first'
    ? null
    : `Expected the bound value converter to resolve through the parent binding's exact resource plan; observed ${JSON.stringify(writerLifecycle.convertedValue)}.`,
  writerLifecycle.blockedWriterCount === 0
    ? null
    : `Expected a binding blocked by expression-resource bind failure to publish no child-property writer; observed ${writerLifecycle.blockedWriterCount}.`,
  writerLifecycle.fromViewWriterCount === 0
    ? null
    : `Expected a from-view-only binding to publish no parent-to-child property writer; observed ${writerLifecycle.fromViewWriterCount}.`,
  writerLifecycle.oneTimeThenLiveSteadyRead === 'secondValue'
    ? null
    : `Expected the later connectable writer to be the sole steady candidate after an earlier one-time write; observed ${writerLifecycle.oneTimeThenLiveSteadyRead ?? 'missing'}.`,
  writerLifecycle.liveThenOneTimeSteadyRead == null
    ? null
    : `Expected a final one-time write after a live writer to remain temporally ambiguous; observed ${writerLifecycle.liveThenOneTimeSteadyRead}.`,
  writerLifecycle.oneTimeOnlySteadyRead === 'secondValue'
    ? null
    : `Expected the final one-time writer to remain the stable value when no writer can publish again; observed ${writerLifecycle.oneTimeOnlySteadyRead ?? 'missing'}.`,
  JSON.stringify(writerLifecycle.oneTimeThenLiveSourceKinds) === JSON.stringify(['untracked-read', 'connectable-read'])
    ? null
    : `Expected one-time/live source lifecycles to remain ordered and distinct; observed ${JSON.stringify(writerLifecycle.oneTimeThenLiveSourceKinds)}.`,
  JSON.stringify(writerLifecycle.liveThenOneTimeSourceKinds) === JSON.stringify(['connectable-read', 'untracked-read'])
    ? null
    : `Expected live/one-time source lifecycles to remain ordered and distinct; observed ${JSON.stringify(writerLifecycle.liveThenOneTimeSourceKinds)}.`,
  writerLifecycle.siblingValueRead == null
    ? null
    : `Expected an exact sibling controller with no value binding not to borrow another instance's writer; observed ${writerLifecycle.siblingValueRead}.`,
  writerLifecycle.spreadValueWriterCount === 1
    ? null
    : `Expected one admitted $bindables spread writer; observed ${writerLifecycle.spreadValueWriterCount}.`,
  writerLifecycle.spreadMissingWriterCount === 1
    ? null
    : `Expected the structurally open $bindables source member to remain a potential writer; observed ${writerLifecycle.spreadMissingWriterCount}.`,
  writerLifecycle.spreadFallbackWriterCount === 2
    ? null
    : `Expected explicit and guarded spread writers to remain indexed until presence-aware selection; observed ${writerLifecycle.spreadFallbackWriterCount}.`,
  writerLifecycle.spreadValue === 'spread-value'
    ? null
    : `Expected the admitted $bindables writer to evaluate the exact outer-object member; observed ${JSON.stringify(writerLifecycle.spreadValue)}.`,
  writerLifecycle.spreadMissingRenderedValue === 'child-default'
    ? null
    : `Expected an initially absent spread source member to retain the child default as candidate evidence; observed ${JSON.stringify(writerLifecycle.spreadMissingRenderedValue)}.`,
  writerLifecycle.spreadMissingRenderedClosure === 'open'
    ? null
    : `Expected a connectable absent spread member to remain open because a later update can create it; observed ${writerLifecycle.spreadMissingRenderedClosure ?? 'missing'}.`,
  writerLifecycle.spreadFallbackRenderedValue === 'child-fallback'
    ? null
    : `Expected definition-wide spread fallback to retain the child declaration default because sibling use sites omit the property; observed ${JSON.stringify(writerLifecycle.spreadFallbackRenderedValue)}.`,
  writerLifecycle.spreadFallbackRenderedClosure === 'open'
    ? null
    : `Expected an absent connectable spread writer to remain a future steady-state candidate; observed ${writerLifecycle.spreadFallbackRenderedClosure ?? 'missing'}.`,
  writerLifecycle.spreadFallbackInitialValue === 'first'
    && writerLifecycle.spreadFallbackInitialSource === 'firstValue'
    ? null
    : `Expected initial settlement to skip the absent spread writer and select the explicit firstValue writer; observed value=${JSON.stringify(writerLifecycle.spreadFallbackInitialValue)}, source=${writerLifecycle.spreadFallbackInitialSource ?? 'missing'}.`,
  writerLifecycle.markerRenderedValue === ''
    && writerLifecycle.markerRenderedClosure === 'open'
    ? null
    : `Expected definition-wide marker evaluation to retain the declaration default with open closure because sibling use sites omit the writer; observed value=${JSON.stringify(writerLifecycle.markerRenderedValue)}, closure=${writerLifecycle.markerRenderedClosure ?? 'missing'}.`,
  writerLifecycle.markerSlotType === 'string | number'
    ? null
    : `Expected definition-wide marker typing to retain the child declaration alternative because sibling use sites omit the writer; observed ${writerLifecycle.markerSlotType ?? 'missing'}.`,
  writerLifecycle.spreadValueSlotType === 'string'
    ? null
    : `Expected an admitted spread property to project its member type instead of the outer object; observed ${writerLifecycle.spreadValueSlotType ?? 'missing'}.`,
  writerLifecycle.spreadMissingSlotType === 'string'
    ? null
    : `Expected an unproven spread property to retain the child bindable declaration type; observed ${writerLifecycle.spreadMissingSlotType ?? 'missing'}.`,
  writerLifecycle.spreadFallbackSlotType === 'string'
    ? null
    : `Expected explicit/spread fallback writers to retain the child bindable's string type; observed ${writerLifecycle.spreadFallbackSlotType ?? 'missing'}.`,
].filter(Boolean);

const summary = {
  fixture: 'au-compose-dynamic-composition',
  widgetHostRows: widgetHostRows.map((row) => ({
    renderingDefinitionName: row.renderingDefinitionName,
    renderingContextKind: row.renderingContextKind,
    componentResolutionKind: row.componentResolutionKind,
    modelResolutionKind: row.modelResolutionKind,
    resolvedComponentNames: row.resolvedComponentNames,
    resolvedComponentClassNames: row.resolvedComponentClassNames,
    composedChildContainerCount: row.composedChildContainerCount,
    composedChildContextResolverSlotCount: row.composedChildContextResolverSlotCount,
    openReason: row.openReason,
  })),
  overloadedChartRows: overloadedChartRows.map((row) => ({
    source: row.source?.label ?? null,
    activationHandoffKinds: row.activationHandoffKinds,
    activationParameterTypes: row.activationParameterTypes,
    modelAssignableToActivationParameterCount: row.modelAssignableToActivationParameterCount,
  })),
  openRows: openRows.map((row) => ({
    renderingDefinitionName: row.renderingDefinitionName,
    source: row.source?.label ?? null,
    openReason: row.openReason,
  })),
  typeCandidateRows: typeCandidateRows.map((row) => ({
    renderingDefinitionName: row.renderingDefinitionName,
    source: row.source?.label ?? null,
    componentCandidateCoverageKind: row.componentCandidateCoverageKind,
    componentInputConsumptionKind: row.componentInputConsumptionKind,
    componentInputValueStateKind: row.componentInputValueStateKind,
    resolvedComponentClassNames: row.resolvedComponentClassNames,
    openReason: row.openReason,
  })),
  writerLifecycle,
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

async function readWriterLifecycleProbe() {
  const writerRuntime = await createSemanticRuntime({
    workspaceRoot: writerLifecycleFixtureRoot,
    storeKey: 'runtime-bound-controller-writer-lifecycle-contract',
  });
  const writerApp = await writerRuntime.openApp({
    analysisDepth: 'binding-observation',
  });
  const parentResource = writerApp.emission.templates.resources.find((resource) =>
    resource.compilation.definition.name === 'runtime-bound-controller-writer-lifecycle-app'
  ) ?? null;
  const childResource = writerApp.emission.templates.resources.find((resource) =>
    resource.compilation.definition.name === 'bound-writer-panel'
  ) ?? null;
  const childController = parentResource?.runtimeAnalysis.runtimeRendering.controllers.find((controller) =>
    controller.name === 'bound-writer-panel'
  ) ?? null;
  const table = runtimeBoundControllerValueTableForTemplateResources(
    writerApp.emission.templates.resources,
  );
  const values = table.readExactControllerValues(childController?.productHandle ?? null);
  const valueWriters = values.filter((value) => value.propertyName === 'value');
  const evaluator = RuntimeBindingSourceValueEvaluator.create(
    writerRuntime.workspace.store,
    writerApp.emission.templates.expressionWorld.projector,
    writerApp.emission.evaluation.forkSession(),
    table,
  );
  const steadyValue = childController == null
    ? null
    : evaluator.evaluateSteadyBoundControllerPropertyValue(childController.productHandle, 'value');
  const initialValue = childController == null
    ? null
    : evaluator.evaluateInitialBoundControllerPropertyValue(childController.productHandle, 'value');
  const interpolated = values.find((value) => value.propertyName === 'interpolated') ?? null;
  const converted = values.find((value) => value.propertyName === 'converted') ?? null;
  const oneTimeThenLive = values.filter((value) => value.propertyName === 'oneTimeThenLive');
  const liveThenOneTime = values.filter((value) => value.propertyName === 'liveThenOneTime');
  const marker = table.values.find((value) => value.propertyName === 'marker') ?? null;
  const spreadValue = table.values.find((value) => value.propertyName === 'spreadValue') ?? null;
  const spreadControllerValues = table.readExactControllerValues(spreadValue?.controllerProductHandle ?? null);
  const spreadFallbackInitial = spreadValue == null
    ? null
    : evaluator.evaluateInitialBoundControllerPropertyValue(
        spreadValue.controllerProductHandle,
        'spreadFallback',
      );
  const spreadMissingRendered = evaluatedTemplateMemberResult(
    childResource,
    'spreadMissing',
    evaluator,
  );
  const spreadFallbackRendered = evaluatedTemplateMemberResult(
    childResource,
    'spreadFallback',
    evaluator,
  );
  const markerRendered = evaluatedTemplateMemberResult(
    childResource,
    'marker',
    evaluator,
  );
  return {
    controllerFound: childController != null,
    valueWriterCount: valueWriters.length,
    unambiguousValueRead: sourceNameForBoundValue(
      steadyValue?.source ?? null,
      writerApp.emission.templates.expressionWorld.projector.publication,
    ),
    initialValueRead: sourceNameForBoundValue(
      initialValue?.source ?? null,
      writerApp.emission.templates.expressionWorld.projector.publication,
    ),
    interpolatedValue: evaluatedPrimitive(interpolated, evaluator),
    convertedValue: evaluatedPrimitive(converted, evaluator),
    blockedWriterCount: values.filter((value) => value.propertyName === 'blocked').length,
    fromViewWriterCount: values.filter((value) => value.propertyName === 'fromView').length,
    oneTimeThenLiveSteadyRead: sourceNameForBoundValue(
      childController == null
        ? null
        : evaluator.evaluateSteadyBoundControllerPropertyValue(
            childController.productHandle,
            'oneTimeThenLive',
          )?.source ?? null,
      writerApp.emission.templates.expressionWorld.projector.publication,
    ),
    liveThenOneTimeSteadyRead: sourceNameForBoundValue(
      childController == null
        ? null
        : evaluator.evaluateSteadyBoundControllerPropertyValue(
            childController.productHandle,
            'liveThenOneTime',
          )?.source ?? null,
      writerApp.emission.templates.expressionWorld.projector.publication,
    ),
    oneTimeOnlySteadyRead: sourceNameForBoundValue(
      childController == null
        ? null
        : evaluator.evaluateSteadyBoundControllerPropertyValue(
            childController.productHandle,
            'oneTimeOnly',
          )?.source ?? null,
      writerApp.emission.templates.expressionWorld.projector.publication,
    ),
    oneTimeThenLiveSourceKinds: oneTimeThenLive.map((value) => value.sourceEvaluationKind),
    liveThenOneTimeSourceKinds: liveThenOneTime.map((value) => value.sourceEvaluationKind),
    siblingValueRead: sourceNameForBoundValue(
      marker == null
        ? null
        : evaluator.evaluateSteadyBoundControllerPropertyValue(
            marker.controllerProductHandle,
            'value',
          )?.source ?? null,
      writerApp.emission.templates.expressionWorld.projector.publication,
    ),
    spreadValueWriterCount: spreadControllerValues.filter((value) => value.propertyName === 'spreadValue').length,
    spreadMissingWriterCount: spreadControllerValues.filter((value) => value.propertyName === 'spreadMissing').length,
    spreadFallbackWriterCount: spreadControllerValues.filter((value) => value.propertyName === 'spreadFallback').length,
    spreadValue: evaluatedPrimitive(spreadValue, evaluator),
    spreadMissingRenderedValue: evaluatedPrimitiveValue(spreadMissingRendered),
    spreadMissingRenderedClosure: spreadMissingRendered?.closure ?? null,
    spreadMissingRenderedValueKind: spreadMissingRendered?.value?.kind ?? null,
    spreadMissingRenderedOpenReason: spreadMissingRendered?.openReason ?? null,
    spreadFallbackRenderedValue: evaluatedPrimitiveValue(spreadFallbackRendered),
    spreadFallbackRenderedClosure: spreadFallbackRendered?.closure ?? null,
    spreadFallbackRenderedValueKind: spreadFallbackRendered?.value?.kind ?? null,
    spreadFallbackRenderedOpenReason: spreadFallbackRendered?.openReason ?? null,
    spreadFallbackInitialValue: evaluatedPrimitiveValue(spreadFallbackInitial?.evaluation ?? null),
    spreadFallbackInitialSource: sourceNameForBoundValue(
      spreadFallbackInitial?.source ?? null,
      writerApp.emission.templates.expressionWorld.projector.publication,
    ),
    markerRenderedValue: evaluatedPrimitiveValue(markerRendered),
    markerRenderedClosure: markerRendered?.closure ?? null,
    markerSlotType: bindingContextSlotType(childResource, 'marker'),
    spreadValueSlotType: bindingContextSlotType(childResource, 'spreadValue'),
    spreadMissingSlotType: bindingContextSlotType(childResource, 'spreadMissing'),
    spreadFallbackSlotType: bindingContextSlotType(childResource, 'spreadFallback'),
  };
}

function sourceNameForBoundValue(value, publication) {
  const expression = bindingExpressionAstForProduct(publication, value?.expressionProductHandle ?? null);
  if (expression == null) {
    return null;
  }
  let current = expression;
  while (current.$kind === 'BindingBehavior' || current.$kind === 'ValueConverter') {
    current = current.expression;
  }
  return current.$kind === 'AccessScope' ? current.name.name : current.$kind;
}

function evaluatedPrimitive(value, evaluator) {
  if (value == null) {
    return null;
  }
  const evaluation = evaluator.evaluateBoundControllerPropertyValue(value);
  return evaluation.value == null ? null : readEvaluationPrimitive(evaluation.value);
}

function evaluatedTemplateMemberResult(resource, memberName, evaluator) {
  if (resource == null) {
    return null;
  }
  const scopes = instructionScopeLookup(resource.runtimeAnalysis.scopes.instructionScopes);
  for (const binding of resource.runtimeAnalysis.runtimeRendering.bindings) {
    for (const productHandle of resource.runtimeAnalysis.runtimeRendering.readExpressionProductsForBinding(binding.productHandle)) {
      const expression = bindingExpressionAstForProduct(
        resource.runtimeAnalysis.expressionWorld.projector.publication,
        productHandle,
      );
      const memberExpression = expression?.$kind === 'Interpolation'
        ? expression.expressions.find((part) =>
            part.$kind === 'AccessScope' && part.name.name === memberName
          ) ?? null
        : null;
      if (memberExpression == null) {
        continue;
      }
      const scope = scopes.scopeForBinding(resource.runtimeAnalysis.runtimeRendering, binding);
      if (scope == null) {
        return null;
      }
      const evaluation = evaluator.evaluate(RuntimeBindingSourceValueEvaluationContext.knownScope(
        memberExpression,
        scope,
        resource.runtimeAnalysis.runtimeRendering.rootController.containerFrame,
        resource.compilation.compilerWorld.resourceScope,
        resource.runtimeAnalysis.runtimeRendering.rootController.strict,
      ));
      return evaluation;
    }
  }
  return null;
}

function evaluatedPrimitiveValue(evaluation) {
  return evaluation?.value == null ? null : readEvaluationPrimitive(evaluation.value);
}

function bindingContextSlotType(resource, memberName) {
  const slot = resource?.runtimeAnalysis.scopes.rootScope.bindingContext.slots
    .find((candidate) => candidate.name === memberName) ?? null;
  if (resource == null || slot == null) {
    return null;
  }
  return bindingContextSlotTargetTypeShape(
    resource.runtimeAnalysis.expressionWorld.projector,
    slot,
    `contract:bound-controller-slot:${memberName}`,
  )?.display ?? slot.targetType?.display ?? null;
}
