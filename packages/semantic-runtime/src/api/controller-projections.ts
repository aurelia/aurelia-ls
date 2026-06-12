import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { KernelStore } from '../kernel/store.js';
import {
  KernelVocabulary,
  type ClaimPredicateKey,
  type ProductKindKey,
} from '../kernel/vocabulary.js';
import type {
  ClaimHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  RuntimeControllerCreationKind,
  type RuntimeControllerFrame,
} from '../template/runtime-controller.js';
import type { TemplateInstruction } from '../template/instruction-ir.js';
import { TemplateProductDetails } from '../template/product-details.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import {
  BuiltInTemplateControllerFlowKind,
  type BuiltInTemplateControllerSemantics,
  frameworkTemplateControllerSemanticsForName,
} from '../template/template-controller-semantics.js';
import { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import { describeAddress } from './source-reference.js';
import type {
  SemanticRuntimeControllerHydrationHandoffKind,
  SemanticRuntimeControllerChildViewRenderingState,
  SemanticRuntimeControllerLifecycleStepRow,
  SemanticRuntimeControllerRow,
  SemanticRuntimeWatcherObservedDependencyRow,
  SemanticRuntimeWatcherRow,
  SemanticRuntimeTemplateControllerLinkKind,
} from './contracts.js';

interface ProductClaimLink {
  readonly claimHandle: ClaimHandle;
  readonly productHandle: ProductHandle;
}

interface CompiledTemplateInfo {
  readonly definitionName: string;
  readonly productHandle: ProductHandle;
}

type RuntimeTemplateResourceEmission = AureliaAppWorldProjectEmission['templates']['resources'][number];

interface RuntimeControllerProjectionIndexes {
  readonly compiledTemplateInfoByProduct: ReadonlyMap<ProductHandle, CompiledTemplateInfo>;
  readonly compiledTemplateByController: ReadonlyMap<ProductHandle, ProductClaimLink>;
  readonly instructionSequenceByController: ReadonlyMap<ProductHandle, ProductClaimLink>;
  readonly templateControllerLinkByController: ReadonlyMap<ProductHandle, ProductClaimLink>;
  readonly viewFactoryByController: ReadonlyMap<ProductHandle, ProductClaimLink>;
  readonly syntheticControllerByViewFactory: ReadonlyMap<ProductHandle, ProductClaimLink>;
  readonly viewFactoryBySyntheticController: ReadonlyMap<ProductHandle, ProductClaimLink>;
  readonly definitionByViewFactory: ReadonlyMap<ProductHandle, ProductClaimLink>;
}

interface RuntimeControllerProjectionContext {
  readonly emission: AureliaAppWorldProjectEmission;
  readonly store: KernelStore;
  readonly handles: boolean;
  readonly indexes: RuntimeControllerProjectionIndexes;
}

interface RuntimeControllerProjectionState {
  readonly controllerDefinition: FullResourceDefinition | null;
  readonly instruction: TemplateInstruction | null;
  readonly compiledTemplate: ProductClaimLink | null;
  readonly instructionSequence: ProductClaimLink | null;
  readonly viewFactory: ProductClaimLink | null;
  readonly syntheticView: ProductClaimLink | null;
  readonly viewFactoryDefinition: ProductClaimLink | null;
  readonly viewFactoryDefinitionDetail: FullResourceDefinition | null;
  readonly templateControllerSemantics: BuiltInTemplateControllerSemantics | null;
  readonly templateControllerLink: ProductClaimLink | null;
  readonly linkedTemplateController: RuntimeControllerFrame | null;
  readonly scope: ReturnType<RuntimeControllerFrame['readScopeReference']>;
  readonly handoffKind: SemanticRuntimeControllerHydrationHandoffKind;
  readonly compiledTemplateInfo: CompiledTemplateInfo | null;
}

/** Compact controller graph rows for recursive hydration and controller/scope pressure. */
export function readRuntimeControllerRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticRuntimeControllerRow[] {
  const context = runtimeControllerProjectionContext(emission, store, handles);
  const resourcesByDefinition = runtimeTemplateResourcesByDefinition(emission.templates.resources);
  return sortRuntimeControllerRows([
    ...emission.templates.resources.flatMap((resource) =>
      runtimeControllerRowsForResource(resource, context)
    ),
    ...emission.routeComponentAgents.readControllers().map((controller) =>
      runtimeControllerRow(renderingDefinitionNameForController(controller, resourcesByDefinition), controller, context)
    ),
  ]);
}

/** Controller-owned ComputedWatcher/ExpressionWatcher rows created from resource watch metadata. */
export function readRuntimeWatcherRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticRuntimeWatcherRow[] {
  const context = runtimeControllerProjectionContext(emission, store, handles);
  const resourcesByDefinition = runtimeTemplateResourcesByDefinition(emission.templates.resources);
  return [
    ...emission.templates.resources.flatMap((resource) =>
      [
        ...resource.runtimeAnalysis.runtimeRendering.controllers,
        ...resource.runtimeAnalysis.runtimeComposition.composedControllers,
      ].flatMap((controller) =>
        runtimeWatcherRowsForController(resource.compilation.definition.name, controller, context)
      )
    ),
    ...emission.routeComponentAgents.readControllers().flatMap((controller) =>
      runtimeWatcherRowsForController(renderingDefinitionNameForController(controller, resourcesByDefinition), controller, context)
    ),
  ].sort((left, right) =>
    `${left.renderingDefinitionName}:${left.controllerName}:${left.watchIndex}:${left.watcherKind}`
      .localeCompare(`${right.renderingDefinitionName}:${right.controllerName}:${right.watchIndex}:${right.watcherKind}`)
  );
}

/** Expression dependencies collected by controller-owned watcher execution paths. */
export function readRuntimeWatcherObservedDependencyRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticRuntimeWatcherObservedDependencyRow[] {
  const context = runtimeControllerProjectionContext(emission, store, handles);
  const resourcesByDefinition = runtimeTemplateResourcesByDefinition(emission.templates.resources);
  return [
    ...emission.templates.resources.flatMap((resource) =>
      [
        ...resource.runtimeAnalysis.runtimeRendering.controllers,
        ...resource.runtimeAnalysis.runtimeComposition.composedControllers,
      ].flatMap((controller) =>
        runtimeWatcherObservedDependencyRowsForController(resource.compilation.definition.name, controller, context)
      )
    ),
    ...emission.routeComponentAgents.readControllers().flatMap((controller) =>
      runtimeWatcherObservedDependencyRowsForController(renderingDefinitionNameForController(controller, resourcesByDefinition), controller, context)
    ),
  ].sort((left, right) =>
    `${left.renderingDefinitionName}:${left.controllerName}:${left.watchIndex}:${left.dependencyKind}:${left.memberName ?? ''}`
      .localeCompare(`${right.renderingDefinitionName}:${right.controllerName}:${right.watchIndex}:${right.dependencyKind}:${right.memberName ?? ''}`)
  );
}

function runtimeControllerProjectionContext(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): RuntimeControllerProjectionContext {
  const syntheticControllerByViewFactory = viewFactorySyntheticControllerLinks(store);
  return {
    emission,
    store,
    handles,
    indexes: {
      compiledTemplateInfoByProduct: compiledTemplateInfoByProductHandle(emission),
      compiledTemplateByController: controllerClaimLinks(
        store,
        KernelVocabulary.Configuration.ControllerUsesCompiledTemplate.key,
        KernelVocabulary.Template.CompiledTemplate.key,
      ),
      instructionSequenceByController: controllerClaimLinks(
        store,
        KernelVocabulary.Configuration.ControllerUsesInstructionSequence.key,
        KernelVocabulary.Instruction.Sequence.key,
      ),
      templateControllerLinkByController: controllerClaimLinks(
        store,
        KernelVocabulary.Configuration.ControllerLinksTemplateController.key,
        KernelVocabulary.Configuration.Controller.key,
      ),
      viewFactoryByController: controllerClaimLinks(
        store,
        KernelVocabulary.Configuration.ControllerUsesViewFactory.key,
        KernelVocabulary.Configuration.ViewFactory.key,
      ),
      syntheticControllerByViewFactory,
      viewFactoryBySyntheticController: inverseProductClaimLinks(syntheticControllerByViewFactory),
      definitionByViewFactory: productClaimLinks(
        store,
        KernelVocabulary.Configuration.ViewFactoryUsesDefinition.key,
        KernelVocabulary.Configuration.ViewFactory.key,
        KernelVocabulary.Resource.Definition.key,
      ),
    },
  };
}

function runtimeControllerRowsForResource(
  resource: RuntimeTemplateResourceEmission,
  context: RuntimeControllerProjectionContext,
): readonly SemanticRuntimeControllerRow[] {
  return [
    ...resource.runtimeAnalysis.runtimeRendering.controllers,
    ...resource.runtimeAnalysis.runtimeComposition.composedControllers,
  ].map((controller) =>
    runtimeControllerRow(resource.compilation.definition.name, controller, context)
  );
}

function runtimeControllerRow(
  renderingDefinitionName: string,
  controller: RuntimeControllerFrame,
  context: RuntimeControllerProjectionContext,
): SemanticRuntimeControllerRow {
  const state = runtimeControllerProjectionState(controller, context);
  const controllerProduct = controller.toControllerProduct();
  return {
    renderingDefinitionName,
    controllerName: controller.name,
    controllerPhase: controllerProduct.phase,
    creationKind: controller.creationKind,
    controllerReadiness: controller.readReadinessKind(),
    ...runtimeControllerDefinitionRowFields(state),
    ...runtimeControllerTreeRowFields(controller, state),
    ...runtimeControllerViewFactoryRowFields(state),
    ...runtimeControllerTemplateControllerRowFields(state),
    childViewRenderingState: childViewRenderingState(controller, state.viewFactory, state.syntheticView),
    hydrationHandoffKind: state.handoffKind,
    compiledTemplateDefinitionName: state.compiledTemplateInfo?.definitionName ?? null,
    ...runtimeControllerLifecycleRowFields(controller, context),
    ...runtimeControllerRowHandles(controller, state, context),
  };
}

function runtimeTemplateResourcesByDefinition(
  resources: readonly RuntimeTemplateResourceEmission[],
): ReadonlyMap<ProductHandle, RuntimeTemplateResourceEmission> {
  return new Map(resources.flatMap((resource) =>
    resource.compilation.definition.productHandle == null
      ? []
      : [[resource.compilation.definition.productHandle, resource] as const]
  ));
}

function renderingDefinitionNameForController(
  controller: RuntimeControllerFrame,
  resourcesByDefinition: ReadonlyMap<ProductHandle, RuntimeTemplateResourceEmission>,
): string {
  const resource = controller.definitionProductHandle == null
    ? null
    : resourcesByDefinition.get(controller.definitionProductHandle) ?? null;
  return resource?.compilation.definition.name ?? controller.name ?? 'unknown';
}

function runtimeWatcherRowsForController(
  renderingDefinitionName: string,
  controller: RuntimeControllerFrame,
  context: RuntimeControllerProjectionContext,
): readonly SemanticRuntimeWatcherRow[] {
  const state = runtimeControllerProjectionState(controller, context);
  return controller.readWatchers().map((watcher) => ({
    renderingDefinitionName,
    controllerName: controller.name,
    definitionName: definitionName(state.controllerDefinition),
    definitionClassName: definitionClassName(state.controllerDefinition),
    watcherKind: watcher.watcherKind,
    dependencyEvaluationKind: watcher.dependencyEvaluationKind,
    watchIndex: watcher.watchIndex,
    expressionKind: watcher.expression.kind,
    expressionPropertyKeyKind: watcher.expression.propertyKey?.kind ?? null,
    expressionPropertyKey: watcher.expression.propertyKey?.text ?? null,
    callbackKind: watcher.callback.kind,
    callbackMethodNameKind: watcher.callback.methodName?.kind ?? null,
    callbackMethodName: watcher.callback.methodName?.text ?? null,
    flush: watcher.flush,
    observedDependencies: watcher.observedDependencies.length,
    source: describeAddress(context.store, watcher.sourceAddressHandle),
    ...(context.handles ? {
      handles: {
        watcherProductHandle: watcher.productHandle,
        watcherIdentityHandle: watcher.identityHandle,
        controllerProductHandle: controller.productHandle,
        controllerIdentityHandle: controller.identityHandle,
        definitionProductHandle: watcher.definitionProductHandle,
        sourceAddressHandle: watcher.sourceAddressHandle,
      },
    } : {}),
  }));
}

function runtimeWatcherObservedDependencyRowsForController(
  renderingDefinitionName: string,
  controller: RuntimeControllerFrame,
  context: RuntimeControllerProjectionContext,
): readonly SemanticRuntimeWatcherObservedDependencyRow[] {
  const state = runtimeControllerProjectionState(controller, context);
  return controller.readWatchers().flatMap((watcher) =>
    watcher.observedDependencies.map((dependency) => ({
      renderingDefinitionName,
      controllerName: controller.name,
      definitionName: definitionName(state.controllerDefinition),
      definitionClassName: definitionClassName(state.controllerDefinition),
      watcherKind: watcher.watcherKind,
      watchIndex: watcher.watchIndex,
      dependencyKind: dependency.dependencyKind,
      expressionKind: dependency.expressionKind,
      sourceName: dependency.sourceName,
      sourceRootName: dependency.sourceRootName,
      memberName: dependency.memberName,
      keyExpression: dependency.keyExpression,
      methodName: dependency.methodName,
      observedMemberKind: dependency.observedMemberKind,
      observedMemberSource: describeAddress(context.store, dependency.observedMemberSourceAddressHandle),
      spanStart: dependency.spanStart,
      spanEnd: dependency.spanEnd,
      source: describeAddress(context.store, dependency.sourceAddressHandle),
      ...(context.handles ? {
        handles: {
          watcherProductHandle: watcher.productHandle,
          observedDependencyProductHandle: dependency.productHandle,
          observedDependencyIdentityHandle: dependency.identityHandle,
          observedMemberSourceAddressHandle: dependency.observedMemberSourceAddressHandle,
          sourceAddressHandle: dependency.sourceAddressHandle,
        },
      } : {}),
    }))
  );
}

function runtimeControllerDefinitionRowFields(
  state: RuntimeControllerProjectionState,
): Pick<SemanticRuntimeControllerRow, 'definitionKind' | 'definitionName' | 'definitionClassName' | 'instructionKind'> {
  return {
    definitionKind: state.controllerDefinition?.type ?? null,
    definitionName: definitionName(state.controllerDefinition),
    definitionClassName: definitionClassName(state.controllerDefinition),
    instructionKind: state.instruction?.instructionKind ?? null,
  };
}

function runtimeControllerTreeRowFields(
  controller: RuntimeControllerFrame,
  state: RuntimeControllerProjectionState,
): Pick<SemanticRuntimeControllerRow, 'parentControllerName' | 'childControllers' | 'runtimeBindings' | 'runtimeWatchers' | 'hasScope'> {
  return {
    parentControllerName: controller.parent?.name ?? null,
    childControllers: controller.readChildren().length,
    runtimeBindings: controller.readBindings().length,
    runtimeWatchers: controller.readWatchers().length,
    hasScope: state.scope?.productHandle != null,
  };
}

function runtimeControllerViewFactoryRowFields(
  state: RuntimeControllerProjectionState,
): Pick<SemanticRuntimeControllerRow, 'hasViewFactory' | 'viewFactoryDefinitionName' | 'viewFactoryDefinitionClassName'> {
  return {
    hasViewFactory: state.viewFactory != null,
    viewFactoryDefinitionName: definitionName(state.viewFactoryDefinitionDetail),
    viewFactoryDefinitionClassName: definitionClassName(state.viewFactoryDefinitionDetail),
  };
}

function runtimeControllerTemplateControllerRowFields(
  state: RuntimeControllerProjectionState,
): Pick<SemanticRuntimeControllerRow, 'templateControllerLinkKind' | 'linkedTemplateControllerName' | 'templateControllerFlowKind' | 'childViewCardinality'> {
  return {
    templateControllerLinkKind: state.templateControllerLink == null
      ? null
      : linkKindForSemantics(state.templateControllerSemantics),
    linkedTemplateControllerName: state.linkedTemplateController?.name ?? null,
    templateControllerFlowKind: state.templateControllerSemantics?.flowKind ?? null,
    childViewCardinality: state.templateControllerSemantics?.childViewCardinality ?? null,
  };
}

function runtimeControllerLifecycleRowFields(
  controller: RuntimeControllerFrame,
  context: RuntimeControllerProjectionContext,
): Pick<SemanticRuntimeControllerRow, 'lifecycleSteps' | 'source'> {
  return {
    lifecycleSteps: controllerLifecycleStepRows(controller, context.store, context.handles),
    source: describeAddress(context.store, controller.sourceAddressHandle),
  };
}

function runtimeControllerProjectionState(
  controller: RuntimeControllerFrame,
  context: RuntimeControllerProjectionContext,
): RuntimeControllerProjectionState {
  const instruction = instructionForController(controller, context.store);
  const compiledTemplate = context.indexes.compiledTemplateByController.get(controller.productHandle) ?? null;
  const instructionSequence = context.indexes.instructionSequenceByController.get(controller.productHandle) ?? null;
  const viewFactory = viewFactoryForController(controller, context.indexes);
  const templateControllerSemantics = semanticsForController(controller);
  const templateControllerLink = context.indexes.templateControllerLinkByController.get(controller.productHandle) ?? null;
  const viewFactoryDefinition = definitionLinkForViewFactory(viewFactory, context.indexes);
  return {
    controllerDefinition: definitionForController(context.emission, controller),
    instruction,
    compiledTemplate,
    instructionSequence,
    viewFactory,
    syntheticView: syntheticViewForViewFactory(viewFactory, context.indexes),
    viewFactoryDefinition,
    viewFactoryDefinitionDetail: definitionDetailForLink(viewFactoryDefinition, context.store),
    templateControllerSemantics,
    templateControllerLink,
    linkedTemplateController: linkedTemplateControllerForLink(templateControllerLink, context.emission),
    scope: controller.readScopeReference(),
    handoffKind: hydrationHandoffKind(controller, compiledTemplate, instructionSequence),
    compiledTemplateInfo: infoForCompiledTemplate(compiledTemplate, context.indexes),
  };
}

function instructionForController(
  controller: RuntimeControllerFrame,
  store: KernelStore,
): TemplateInstruction | null {
  return controller.instructionProductHandle == null
    ? null
    : store.productDetails.read(TemplateProductDetails.Instruction, controller.instructionProductHandle);
}

function viewFactoryForController(
  controller: RuntimeControllerFrame,
  indexes: RuntimeControllerProjectionIndexes,
): ProductClaimLink | null {
  return indexes.viewFactoryByController.get(controller.productHandle)
    ?? indexes.viewFactoryBySyntheticController.get(controller.productHandle)
    ?? null;
}

function semanticsForController(
  controller: RuntimeControllerFrame,
): BuiltInTemplateControllerSemantics | null {
  const templateControllerName = templateControllerNameForSemantics(controller);
  return templateControllerName == null
    ? null
    : frameworkTemplateControllerSemanticsForName(templateControllerName);
}

function definitionLinkForViewFactory(
  viewFactory: ProductClaimLink | null,
  indexes: RuntimeControllerProjectionIndexes,
): ProductClaimLink | null {
  return viewFactory == null
    ? null
    : indexes.definitionByViewFactory.get(viewFactory.productHandle) ?? null;
}

function syntheticViewForViewFactory(
  viewFactory: ProductClaimLink | null,
  indexes: RuntimeControllerProjectionIndexes,
): ProductClaimLink | null {
  return viewFactory == null
    ? null
    : indexes.syntheticControllerByViewFactory.get(viewFactory.productHandle) ?? null;
}

function definitionDetailForLink(
  link: ProductClaimLink | null,
  store: KernelStore,
): FullResourceDefinition | null {
  return link == null
    ? null
    : store.productDetails.read(ResourceProductDetails.Definition, link.productHandle);
}

function linkedTemplateControllerForLink(
  link: ProductClaimLink | null,
  emission: AureliaAppWorldProjectEmission,
): RuntimeControllerFrame | null {
  return link == null
    ? null
    : runtimeControllerByProductHandle(emission, link.productHandle);
}

function infoForCompiledTemplate(
  compiledTemplate: ProductClaimLink | null,
  indexes: RuntimeControllerProjectionIndexes,
): CompiledTemplateInfo | null {
  return compiledTemplate == null
    ? null
    : indexes.compiledTemplateInfoByProduct.get(compiledTemplate.productHandle) ?? null;
}

function runtimeControllerRowHandles(
  controller: RuntimeControllerFrame,
  state: RuntimeControllerProjectionState,
  context: RuntimeControllerProjectionContext,
): Pick<SemanticRuntimeControllerRow, 'handles'> {
  return context.handles ? {
    handles: {
      controllerProductHandle: controller.productHandle,
      controllerIdentityHandle: controller.identityHandle,
      parentControllerProductHandle: controller.parent?.productHandle ?? null,
      definitionProductHandle: controller.definitionProductHandle,
      instructionProductHandle: controller.instructionProductHandle,
      instructionIdentityHandle: controller.instructionIdentityHandle,
      bindingScopeProductHandle: state.scope?.productHandle ?? null,
      compiledTemplateProductHandle: state.compiledTemplate?.productHandle ?? null,
      compiledTemplateClaimHandle: state.compiledTemplate?.claimHandle ?? null,
      viewFactoryProductHandle: state.viewFactory?.productHandle ?? null,
      viewFactoryClaimHandle: state.viewFactory?.claimHandle ?? null,
      viewFactoryDefinitionProductHandle: state.viewFactoryDefinition?.productHandle ?? null,
      viewFactoryDefinitionClaimHandle: state.viewFactoryDefinition?.claimHandle ?? null,
      linkedTemplateControllerProductHandle: state.linkedTemplateController?.productHandle ?? null,
      templateControllerLinkClaimHandle: state.templateControllerLink?.claimHandle ?? null,
      instructionSequenceProductHandle: state.instructionSequence?.productHandle ?? null,
      instructionSequenceClaimHandle: state.instructionSequence?.claimHandle ?? null,
      sourceAddressHandle: controller.sourceAddressHandle,
    },
  } : {};
}

function sortRuntimeControllerRows(
  rows: readonly SemanticRuntimeControllerRow[],
): readonly SemanticRuntimeControllerRow[] {
  return [...rows].sort((left, right) =>
    runtimeControllerRowSortKey(left).localeCompare(runtimeControllerRowSortKey(right))
  );
}

function runtimeControllerRowSortKey(row: SemanticRuntimeControllerRow): string {
  return `${row.renderingDefinitionName}:${row.parentControllerName ?? ''}:${row.controllerName ?? ''}:${row.creationKind}`;
}

function controllerLifecycleStepRows(
  controller: RuntimeControllerFrame,
  store: KernelStore,
  handles: boolean,
): readonly SemanticRuntimeControllerLifecycleStepRow[] {
  const steps = controller.readLifecycleSteps();
  const rows: SemanticRuntimeControllerLifecycleStepRow[] = [];
  for (const step of steps) {
    const previous = rows[rows.length - 1] ?? null;
    if (previous != null && previous.stage === step.stage && previous.stepKind === step.stepKind) {
      rows[rows.length - 1] = {
        ...previous,
        count: previous.count + 1,
        summary: `${previous.count + 1} consecutive ${step.stepKind} step(s).`,
      };
      continue;
    }
    rows.push({
      order: step.order,
      count: 1,
      stage: step.stage,
      stepKind: step.stepKind,
      summary: step.summary,
      source: describeAddress(store, step.sourceAddressHandle),
      ...(handles ? {
        handles: {
          relatedProductHandle: step.relatedProductHandle,
          sourceAddressHandle: step.sourceAddressHandle,
        },
      } : {}),
    });
  }
  return rows;
}

function compiledTemplateInfoByProductHandle(
  emission: AureliaAppWorldProjectEmission,
): ReadonlyMap<ProductHandle, CompiledTemplateInfo> {
  return new Map(emission.templates.resources.map((resource) => [
    resource.compilation.compiledTemplate.compiledTemplate.productHandle,
    {
      definitionName: resource.compilation.definition.name,
      productHandle: resource.compilation.compiledTemplate.compiledTemplate.productHandle,
    },
  ]));
}

function runtimeControllerByProductHandle(
  emission: AureliaAppWorldProjectEmission,
  productHandle: ProductHandle,
): RuntimeControllerFrame | null {
  for (const resource of emission.templates.resources) {
    const controller = resource.runtimeAnalysis.runtimeRendering.controllers.find((candidate) =>
      candidate.productHandle === productHandle
    );
    if (controller != null) {
      return controller;
    }
  }
  return null;
}

function controllerClaimLinks(
  store: KernelStore,
  predicateKey: ClaimPredicateKey,
  objectKindKey: ProductKindKey,
): ReadonlyMap<ProductHandle, ProductClaimLink> {
  return productClaimLinks(
    store,
    predicateKey,
    KernelVocabulary.Configuration.Controller.key,
    objectKindKey,
  );
}

function productClaimLinks(
  store: KernelStore,
  predicateKey: ClaimPredicateKey,
  subjectKindKey: ProductKindKey,
  objectKindKey: ProductKindKey,
): ReadonlyMap<ProductHandle, ProductClaimLink> {
  const result = new Map<ProductHandle, ProductClaimLink>();
  for (const claimHandle of store.readClaimsForPredicate(predicateKey)) {
    const claim = store.readClaim(claimHandle);
    if (claim == null) {
      continue;
    }
    const subjectProductHandle = claim.subjectHandle as ProductHandle;
    const targetProductHandle = claim.objectHandle as ProductHandle;
    if (store.readProduct(subjectProductHandle)?.productKindKey !== subjectKindKey
      || store.readProduct(targetProductHandle)?.productKindKey !== objectKindKey) {
      continue;
    }
    result.set(subjectProductHandle, {
      claimHandle,
      productHandle: targetProductHandle,
    });
  }
  return result;
}

function viewFactorySyntheticControllerLinks(
  store: KernelStore,
): ReadonlyMap<ProductHandle, ProductClaimLink> {
  const result = new Map<ProductHandle, ProductClaimLink>();
  for (const claimHandle of store.readClaimsForPredicate(KernelVocabulary.Configuration.ViewFactoryCreatesSyntheticView.key)) {
    const claim = store.readClaim(claimHandle);
    if (claim == null) {
      continue;
    }
    const viewFactoryProductHandle = claim.subjectHandle as ProductHandle;
    const controllerProductHandle = claim.objectHandle as ProductHandle;
    if (store.readProduct(viewFactoryProductHandle)?.productKindKey !== KernelVocabulary.Configuration.ViewFactory.key
      || store.readProduct(controllerProductHandle)?.productKindKey !== KernelVocabulary.Configuration.Controller.key) {
      continue;
    }
    result.set(viewFactoryProductHandle, {
      claimHandle,
      productHandle: controllerProductHandle,
    });
  }
  return result;
}

function inverseProductClaimLinks(
  links: ReadonlyMap<ProductHandle, ProductClaimLink>,
): ReadonlyMap<ProductHandle, ProductClaimLink> {
  const result = new Map<ProductHandle, ProductClaimLink>();
  for (const [subjectProductHandle, link] of links) {
    result.set(link.productHandle, {
      claimHandle: link.claimHandle,
      productHandle: subjectProductHandle,
    });
  }
  return result;
}

function definitionForController(
  emission: AureliaAppWorldProjectEmission,
  controller: RuntimeControllerFrame,
): FullResourceDefinition | null {
  return emission.resourceIndex.lookupByProduct(controller.definitionProductHandle);
}

function definitionName(definition: FullResourceDefinition | null): string | null {
  return definition instanceof CustomElementDefinition || definition instanceof CustomAttributeDefinition
    ? definition.name
    : null;
}

function definitionClassName(definition: FullResourceDefinition | null): string | null {
  return definition instanceof CustomElementDefinition || definition instanceof CustomAttributeDefinition
    ? definition.target.localName
    : null;
}

function templateControllerNameForSemantics(
  controller: RuntimeControllerFrame,
): string | null {
  if (controller.creationKind === RuntimeControllerCreationKind.SyntheticView) {
    return controller.parent?.name ?? null;
  }
  return controller.name;
}

function childViewRenderingState(
  controller: RuntimeControllerFrame,
  viewFactory: ProductClaimLink | null,
  syntheticView: ProductClaimLink | null,
): SemanticRuntimeControllerChildViewRenderingState {
  if (controller.hasRecursiveHydrationBoundary()) {
    return 'recursive-boundary';
  }
  if (controller.creationKind === RuntimeControllerCreationKind.SyntheticView) {
    return 'expanded-aggregate';
  }
  if (controller.creationKind !== RuntimeControllerCreationKind.TemplateController || viewFactory == null) {
    return 'none';
  }
  return syntheticView == null ? 'handoff-only' : 'expanded-aggregate';
}

function linkKindForSemantics(
  semantics: BuiltInTemplateControllerSemantics | null,
): SemanticRuntimeTemplateControllerLinkKind | null {
  switch (semantics?.flowKind) {
    case BuiltInTemplateControllerFlowKind.ConditionalElse:
      return 'else-to-if';
    case BuiltInTemplateControllerFlowKind.PromisePending:
    case BuiltInTemplateControllerFlowKind.PromiseFulfilled:
    case BuiltInTemplateControllerFlowKind.PromiseRejected:
      return 'promise-branch-to-promise';
    case BuiltInTemplateControllerFlowKind.SwitchCase:
    case BuiltInTemplateControllerFlowKind.SwitchDefault:
      return 'switch-case-to-switch';
    default:
      return null;
  }
}

function hydrationHandoffKind(
  controller: RuntimeControllerFrame,
  compiledTemplate: ProductClaimLink | null,
  instructionSequence: ProductClaimLink | null,
): SemanticRuntimeControllerHydrationHandoffKind {
  if (controller.creationKind === RuntimeControllerCreationKind.SyntheticView) {
    return 'synthetic-view';
  }
  if (compiledTemplate != null) {
    return 'compiled-template';
  }
  if (instructionSequence != null) {
    return 'instruction-sequence';
  }
  return 'none';
}
