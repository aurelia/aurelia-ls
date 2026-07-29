import { BindingScope } from '../configuration/scope.js';
import type { Container } from '../di/container.js';
import type {
  AddressHandle,
  HotDetailHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { readFieldProvenance } from '../kernel/provenance.js';
import { RuntimeOperationReachability } from '../runtime-expression/runtime-operation.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import { readTemplateExpressionParse } from '../template/expression-parse-product.js';
import {
  InterpolationBinding,
  PropertyBinding,
  RuntimeBindingTargetKind,
  SpreadValueBinding,
  type RuntimeBinding,
} from '../template/runtime-binding.js';
import type { RuntimeControllerBindEmission } from '../template/runtime-controller-bind-materializer.js';
import type { RuntimeExpressionResourcePlan } from '../template/runtime-expression-resource-plan.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import type { TemplateScopeConstructionEmission } from '../template/template-controller-scope-materializer.js';
import {
  instructionScopeLookup,
  isRuntimeExpressionBinding,
} from './runtime-binding-expression.js';
import {
  sameCheckerTypeReference,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  CheckerExpressionTypeBindingBehaviorEvaluation,
} from '../type-system/expression-type-context.js';
import type { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import {
  bindingBehaviorEvaluationForRuntimeBindingSource,
} from './runtime-binding-source-expression-context.js';
import { runtimeBindingSourceLifecycle } from './runtime-binding-source-lifecycle.js';
import { RuntimeBindingSourceEvaluationKind } from './runtime-binding-observation.js';
import type { RuntimeBindingExpressionScopeProjectionReader } from './runtime-binding-expression-scope.js';
import type { RuntimeBindingValueChannelEmission } from './binding-value-channel-materializer.js';

export interface RuntimeBoundControllerPropertyValue {
  readonly controllerProductHandle: ProductHandle;
  readonly controllerDefinitionProductHandle: ProductHandle | null;
  readonly propertyName: string;
  readonly bindingProductHandle: ProductHandle;
  readonly expressionProductHandle: ProductHandle | null;
  /** Interpolation-hole index, or null when this row carries the complete aggregate interpolation value. */
  readonly sourceExpressionChainIndex: number | null;
  /** Runtime source lifecycle that determines whether this writer can continue after initial settlement. */
  readonly sourceEvaluationKind: RuntimeBindingSourceEvaluationKind;
  /** Source-object member selected by a `$bindables` spread row; null for direct binding values. */
  readonly sourceValueProperty: string | null;
  /** Existing value-channel projection of the admitted spread member type; null for direct or structurally open rows. */
  readonly admittedSourceValueType: CheckerTypeReference | null;
  /** Exact TypeChecker member admitted by the spread guard, when every runtime lane agrees. */
  readonly admittedSourceMemberHandle: HotDetailHandle | null;
  /** Exact parent binding resource plan used by nested source-value evaluation. */
  readonly sourceExpressionResourcePlan: RuntimeExpressionResourcePlan;
  /** Authored source address for the parent binding expression that feeds this child controller property. */
  readonly sourceAddressHandle: AddressHandle | null;
  /** Field provenance for the parent binding expression, when the runtime binding retained it. */
  readonly sourceProvenanceHandle: ProvenanceHandle | null;
  readonly sourceScope: BindingScope | null;
  /** Source-resource projector for binding-behavior scope changes such as `& state`. */
  readonly sourceBindingExpressionScopes: RuntimeBindingExpressionScopeProjectionReader;
  /** Compiler resource scope visible to the parent binding source expression. */
  readonly sourceResourceScope: TemplateResourceScope;
  /** Compiler-world container visible to parent binding-source `resolve(...)` calls. */
  readonly sourceDefaultContainer: Container;
  /** Rendering-controller strict mode that the parent binding uses for source evaluation. */
  readonly sourceStrictBinding: boolean | null;
  /** Binding-behavior lifecycle that already shaped the parent source scope handoff. */
  readonly sourceBindingBehavior: CheckerExpressionTypeBindingBehaviorEvaluation;
}

export interface RuntimeControllerDefinitionReference {
  readonly controllerProductHandle: ProductHandle | null;
  readonly definitionProductHandle: ProductHandle | null;
  readonly definitionTargetType: CheckerTypeReference | null;
}

export interface RuntimeBindingSourceValueRuntimeAnalysis {
  readonly runtimeRendering: RuntimeRenderingEmission;
  readonly expressionResourcePlan: RuntimeExpressionResourcePlan;
  readonly controllerBind: RuntimeControllerBindEmission;
  readonly bindingValueChannel: RuntimeBindingValueChannelEmission;
  readonly scopes: TemplateScopeConstructionEmission;
  readonly expressionWorld: CheckerExpressionTypeWorld;
}

export interface RuntimeBindingSourceValueTemplateResource {
  readonly compilation: {
    readonly definition: {
      readonly productHandle: ProductHandle | null;
      readonly target: {
        readonly targetType: CheckerTypeReference | null;
      };
    };
  };
  readonly runtimeAnalysis: RuntimeBindingSourceValueRuntimeAnalysis;
}

/**
 * Values delivered to child controller view-model properties by parent-owned runtime bindings.
 *
 * Aurelia's `CustomElementRenderer` renders bindable property instructions against the child controller target while
 * the binding itself belongs to the rendering parent controller. This table keeps that handoff available to static
 * binding-source value evaluation without making router/resources rediscover renderer semantics.
 */
export class RuntimeBoundControllerValueTable {
  static readonly empty = new RuntimeBoundControllerValueTable([], [], []);

  private readonly byController = new Map<ProductHandle, Map<string, RuntimeBoundControllerPropertyValue[]>>();
  private readonly byDefinition = new Map<ProductHandle, Map<string, RuntimeBoundControllerPropertyValue[]>>();
  private readonly controllerHandlesByDefinition = new Map<ProductHandle, Set<ProductHandle>>();
  private readonly definitionContextControllers: ReadonlySet<ProductHandle>;
  private readonly definitionByContextController = new Map<ProductHandle, ProductHandle>();
  private readonly definitions: RuntimeControllerDefinitionReference[] = [];

  constructor(
    readonly values: readonly RuntimeBoundControllerPropertyValue[],
    controllerDefinitions: readonly RuntimeControllerDefinitionReference[],
    definitionContextControllerProductHandles: readonly ProductHandle[],
  ) {
    this.definitionContextControllers = new Set(definitionContextControllerProductHandles);
    for (const controller of controllerDefinitions) {
      this.definitions.push(controller);
      if (
        controller.controllerProductHandle != null
        && controller.definitionProductHandle != null
        && this.definitionContextControllers.has(controller.controllerProductHandle)
      ) {
        this.definitionByContextController.set(
          controller.controllerProductHandle,
          controller.definitionProductHandle,
        );
      }
      if (
        controller.controllerProductHandle != null
        && controller.definitionProductHandle != null
        && !this.definitionContextControllers.has(controller.controllerProductHandle)
      ) {
        const controllers = this.controllerHandlesByDefinition.get(controller.definitionProductHandle) ?? new Set();
        controllers.add(controller.controllerProductHandle);
        this.controllerHandlesByDefinition.set(controller.definitionProductHandle, controllers);
      }
    }
    for (const value of values) {
      let byProperty = this.byController.get(value.controllerProductHandle);
      if (byProperty === undefined) {
        byProperty = new Map();
        this.byController.set(value.controllerProductHandle, byProperty);
      }
      const propertyValues = byProperty.get(value.propertyName) ?? [];
      propertyValues.push(value);
      byProperty.set(value.propertyName, propertyValues);
      if (value.controllerDefinitionProductHandle == null) {
        continue;
      }
      let definitionProperties = this.byDefinition.get(value.controllerDefinitionProductHandle);
      if (definitionProperties === undefined) {
        definitionProperties = new Map();
        this.byDefinition.set(value.controllerDefinitionProductHandle, definitionProperties);
      }
      const definitionValues = definitionProperties.get(value.propertyName) ?? [];
      definitionProperties.set(value.propertyName, [...definitionValues, value]);
    }
  }

  /** Read every possible writer for one property, preserving exact-controller or explicit definition context. */
  readPropertyValues(
    controllerProductHandle: ProductHandle | null,
    propertyName: string,
    contextType: CheckerTypeReference | null = null,
  ): readonly RuntimeBoundControllerPropertyValue[] {
    if (
      controllerProductHandle != null
      && !this.definitionContextControllers.has(controllerProductHandle)
    ) {
      return this.readExactControllerPropertyValues(controllerProductHandle, propertyName);
    }
    return this.definitionHandlesForContext(controllerProductHandle, contextType)
      .flatMap((definitionProductHandle) =>
        this.byDefinition.get(definitionProductHandle)?.get(propertyName) ?? []
      );
  }

  /** Read every binding rendered against one exact controller property in render admission order. */
  readExactControllerPropertyValues(
    controllerProductHandle: ProductHandle,
    propertyName: string,
  ): readonly RuntimeBoundControllerPropertyValue[] {
    return this.byController.get(controllerProductHandle)?.get(propertyName) ?? [];
  }

  /** Read every binding rendered against this exact controller instance in render admission order. */
  readExactControllerValues(
    controllerProductHandle: ProductHandle | null,
  ): readonly RuntimeBoundControllerPropertyValue[] {
    if (controllerProductHandle == null) {
      return [];
    }
    return [...(this.byController.get(controllerProductHandle)?.values() ?? [])].flat();
  }

  /** Read all observed bindings for a definition, retaining distinct runtime use sites. */
  readAllDefinitionValues(
    definitionProductHandle: ProductHandle | null,
  ): readonly RuntimeBoundControllerPropertyValue[] {
    if (definitionProductHandle == null) {
      return [];
    }
    return [...(this.byDefinition.get(definitionProductHandle)?.values() ?? [])].flat();
  }

  readControllerDefinitions(): readonly RuntimeControllerDefinitionReference[] {
    return [...this.definitions];
  }

  readDefinitionContextControllerProductHandles(): readonly ProductHandle[] {
    return [...this.definitionContextControllers];
  }

  /** Add the root controller currently being analyzed as an explicit definition-wide projection context. */
  withDefinitionContextController(
    controller: RuntimeControllerDefinitionReference,
  ): RuntimeBoundControllerValueTable {
    if (controller.controllerProductHandle == null) {
      return this;
    }
    return new RuntimeBoundControllerValueTable(
      this.values,
      [...this.definitions, controller],
      [...this.definitionContextControllers, controller.controllerProductHandle],
    );
  }

  isDefinitionContextController(controllerProductHandle: ProductHandle | null): boolean {
    return controllerProductHandle != null
      && this.definitionContextControllers.has(controllerProductHandle);
  }

  /** Whether at least one concrete use of this definition has no admitted writer for the property. */
  definitionContextHasUnboundUseSite(
    controllerProductHandle: ProductHandle | null,
    contextType: CheckerTypeReference | null,
    propertyName: string,
  ): boolean {
    if (!this.isDefinitionContextController(controllerProductHandle)) {
      return false;
    }
    const definitionHandles = new Set(this.definitionHandlesForContext(controllerProductHandle, contextType));
    const useSiteControllers = new Set(
      [...definitionHandles].flatMap((definitionHandle) =>
        [...(this.controllerHandlesByDefinition.get(definitionHandle) ?? [])]
      ),
    );
    return useSiteControllers.size === 0
      || [...useSiteControllers].some((handle) =>
        (this.byController.get(handle)?.get(propertyName)?.length ?? 0) === 0
      );
  }

  readAll(
    controllerProductHandle: ProductHandle | null,
    contextType: CheckerTypeReference | null = null,
  ): readonly RuntimeBoundControllerPropertyValue[] {
    return controllerProductHandle != null
      && !this.definitionContextControllers.has(controllerProductHandle)
      ? this.readExactControllerValues(controllerProductHandle)
      : this.definitionHandlesForContext(controllerProductHandle, contextType)
          .flatMap((definitionProductHandle) => this.readAllDefinitionValues(definitionProductHandle));
  }

  private definitionHandlesForContext(
    controllerProductHandle: ProductHandle | null,
    contextType: CheckerTypeReference | null,
  ): readonly ProductHandle[] {
    const retainedDefinition = controllerProductHandle == null
      ? null
      : this.definitionByContextController.get(controllerProductHandle) ?? null;
    return retainedDefinition == null
      ? this.definitionHandlesForContextType(contextType)
      : [retainedDefinition];
  }

  private definitionHandlesForContextType(
    contextType: CheckerTypeReference | null,
  ): readonly ProductHandle[] {
    if (contextType == null) {
      return [];
    }
    const handles = new Set<ProductHandle>();
    for (const definition of this.definitions) {
      if (
        definition.definitionProductHandle != null
        && definition.definitionTargetType != null
        && sameCheckerTypeReference(definition.definitionTargetType, contextType)
      ) {
        handles.add(definition.definitionProductHandle);
      }
    }
    return [...handles];
  }
}

export function runtimeBoundControllerValueTableForTemplateResources(
  resources: readonly RuntimeBindingSourceValueTemplateResource[],
): RuntimeBoundControllerValueTable {
  return new RuntimeBoundControllerValueTable(
    resources.flatMap((resource) =>
      boundControllerValuesForRuntimeAnalysis(resource.runtimeAnalysis)
    ),
    resources.flatMap((resource) => controllerDefinitionsForRuntimeAnalysis(resource)),
    resources.map((resource) => resource.runtimeAnalysis.runtimeRendering.rootController.productHandle),
  );
}

export function extendRuntimeBoundControllerValueTable(
  base: RuntimeBoundControllerValueTable,
  rootDefinition: RuntimeControllerDefinitionReference,
  runtimeAnalysis: RuntimeBindingSourceValueRuntimeAnalysis,
): RuntimeBoundControllerValueTable {
  return new RuntimeBoundControllerValueTable(
    [
      ...base.values,
      ...boundControllerValuesForRuntimeAnalysis(runtimeAnalysis),
    ],
    [
      ...base.readControllerDefinitions(),
      rootDefinition,
      ...controllerDefinitionsForRuntimeRendering(runtimeAnalysis.runtimeRendering),
    ],
    [
      ...base.readDefinitionContextControllerProductHandles(),
      runtimeAnalysis.runtimeRendering.rootController.productHandle,
    ],
  );
}

function boundControllerValuesForRuntimeAnalysis(
  analysis: RuntimeBindingSourceValueRuntimeAnalysis,
): readonly RuntimeBoundControllerPropertyValue[] {
  const bindingsByProductHandle = new Map<ProductHandle, RuntimeBinding>(analysis.runtimeRendering.bindings
    .map((binding) => [binding.productHandle, binding]));
  const controllersByProductHandle = new Map(analysis.runtimeRendering.controllers
    .map((controller) => [controller.productHandle, controller]));
  const valueChannelsByTargetAccessProductHandle = new Map(analysis.bindingValueChannel.valueChannels.flatMap((channel) =>
    channel.targetAccess?.productHandle == null
      ? []
      : [[channel.targetAccess.productHandle, channel] as const]
  ));
  const scopes = instructionScopeLookup(analysis.scopes.instructionScopes);
  const sourceBindingExpressionScopes = analysis.scopes.bindingExpressionScopes;
  const values: RuntimeBoundControllerPropertyValue[] = [];
  for (const targetAccess of analysis.controllerBind.targetAccesses) {
    if (
      targetAccess.targetKind !== RuntimeBindingTargetKind.ControllerViewModel
      || targetAccess.targetControllerProductHandle == null
      || targetAccess.binding.productHandle == null
    ) {
      continue;
    }
    const binding = bindingsByProductHandle.get(targetAccess.binding.productHandle) ?? null;
    if (binding == null || !isRuntimeExpressionBinding(binding)) {
      continue;
    }
    const lifecycle = runtimeBindingSourceLifecycle(binding, analysis.expressionResourcePlan);
    const expressionProductHandle = sourceExpressionProductHandleForBoundControllerBinding(binding, lifecycle);
    const valueChannel = targetAccess.productHandle == null
      ? null
      : valueChannelsByTargetAccessProductHandle.get(targetAccess.productHandle) ?? null;
    if (
      expressionProductHandle === undefined
      || lifecycle.evaluationReachability !== RuntimeOperationReachability.Reached
      || (
        binding instanceof SpreadValueBinding
        && valueChannel == null
      )
    ) {
      continue;
    }
    const renderContext = analysis.runtimeRendering.requireRenderContextForBinding(binding.productHandle);
    const targetController = controllersByProductHandle.get(targetAccess.targetControllerProductHandle) ?? null;
    values.push({
      controllerProductHandle: targetAccess.targetControllerProductHandle,
      controllerDefinitionProductHandle: targetController?.definitionProductHandle ?? null,
      propertyName: targetAccess.targetProperty,
      bindingProductHandle: binding.productHandle,
      expressionProductHandle,
      sourceExpressionChainIndex: binding instanceof InterpolationBinding ? null : 0,
      sourceEvaluationKind: lifecycle.evaluationKind,
      sourceValueProperty: binding instanceof SpreadValueBinding ? targetAccess.targetProperty : null,
      admittedSourceValueType: binding instanceof SpreadValueBinding
        ? valueChannel?.admittedSourceValueType ?? null
        : null,
      admittedSourceMemberHandle: binding instanceof SpreadValueBinding
        ? valueChannel?.admittedSourceMemberHandle ?? null
        : null,
      sourceExpressionResourcePlan: analysis.expressionResourcePlan,
      sourceAddressHandle: readTemplateExpressionParse(
        analysis.expressionWorld.projector.publication,
        expressionProductHandle,
      )?.sourceAddressHandle ?? null,
      sourceProvenanceHandle: readFieldProvenance(binding.fieldProvenance, 'expression')
        ?? readFieldProvenance(binding.fieldProvenance, 'source'),
      sourceScope: scopes.scopeForBinding(analysis.runtimeRendering, binding),
      sourceBindingExpressionScopes,
      sourceResourceScope: renderContext.resourceScope,
      sourceDefaultContainer: renderContext.requireActiveContainer(),
      sourceStrictBinding: renderContext.renderingController.strict,
      sourceBindingBehavior: bindingBehaviorEvaluationForRuntimeBindingSource(binding),
    });
  }
  return values;
}

function controllerDefinitionsForRuntimeAnalysis(
  resource: RuntimeBindingSourceValueTemplateResource,
): readonly RuntimeControllerDefinitionReference[] {
  const definition = resource.compilation.definition;
  return [
    {
      controllerProductHandle: null,
      definitionProductHandle: definition.productHandle,
      definitionTargetType: definition.target.targetType,
    },
    ...controllerDefinitionsForRuntimeRendering(resource.runtimeAnalysis.runtimeRendering),
  ];
}

function controllerDefinitionsForRuntimeRendering(
  runtimeRendering: RuntimeRenderingEmission,
): readonly RuntimeControllerDefinitionReference[] {
  return runtimeRendering.controllers.map((controller) => ({
    controllerProductHandle: controller.productHandle,
    definitionProductHandle: controller.definitionProductHandle,
    definitionTargetType: controller.viewModel?.targetType ?? null,
  }));
}

function sourceExpressionProductHandleForBoundControllerBinding(
  binding: RuntimeBinding,
  lifecycle: ReturnType<typeof runtimeBindingSourceLifecycle>,
): ProductHandle | null | undefined {
  if (!(
    binding instanceof PropertyBinding
    || binding instanceof InterpolationBinding
    || binding instanceof SpreadValueBinding
  )) {
    return undefined;
  }
  switch (lifecycle.evaluationKind) {
    case RuntimeBindingSourceEvaluationKind.ConnectableRead:
    case RuntimeBindingSourceEvaluationKind.UntrackedRead:
      return binding instanceof PropertyBinding
        ? binding.expressionProductHandle
        : binding instanceof InterpolationBinding
          ? binding.expressionProductHandles[0] ?? null
          : binding.expressionProductHandle;
    case RuntimeBindingSourceEvaluationKind.AssignmentOnly:
    case RuntimeBindingSourceEvaluationKind.NotEvaluated:
    case RuntimeBindingSourceEvaluationKind.Open:
      return undefined;
  }
}
