import { BindingScope } from '../configuration/scope.js';
import type { Container } from '../di/container.js';
import type { AddressHandle, ProductHandle, ProvenanceHandle } from '../kernel/handles.js';
import { readFieldProvenance } from '../kernel/provenance.js';
import type { KernelSourceFileReadView } from '../kernel/store.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import { readTemplateExpressionParse } from '../template/expression-parse-product.js';
import {
  TemplateBindingMode,
} from '../template/instruction-ir.js';
import {
  InterpolationBinding,
  PropertyBinding,
  RuntimeBindingTargetKind,
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
import { RuntimeBindingExpressionScopeProjector } from './runtime-binding-expression-scope.js';

export interface RuntimeBoundControllerPropertyValue {
  readonly controllerProductHandle: ProductHandle;
  readonly controllerDefinitionProductHandle: ProductHandle | null;
  readonly propertyName: string;
  readonly bindingProductHandle: ProductHandle;
  readonly expressionProductHandle: ProductHandle | null;
  /** Authored source address for the parent binding expression that feeds this child controller property. */
  readonly sourceAddressHandle: AddressHandle | null;
  /** Field provenance for the parent binding expression, when the runtime binding retained it. */
  readonly sourceProvenanceHandle: ProvenanceHandle | null;
  readonly sourceScope: BindingScope | null;
  /** Source-resource projector for binding-behavior scope changes such as `& state`. */
  readonly sourceBindingExpressionScopes: RuntimeBindingExpressionScopeProjector;
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
  static readonly empty = new RuntimeBoundControllerValueTable([], []);

  private readonly byController = new Map<ProductHandle, Map<string, RuntimeBoundControllerPropertyValue>>();
  private readonly byDefinition = new Map<ProductHandle, Map<string, RuntimeBoundControllerPropertyValue[]>>();
  private readonly definitionByController = new Map<ProductHandle, ProductHandle>();
  private readonly definitions: RuntimeControllerDefinitionReference[] = [];

  constructor(
    readonly values: readonly RuntimeBoundControllerPropertyValue[],
    controllerDefinitions: readonly RuntimeControllerDefinitionReference[],
  ) {
    for (const controller of controllerDefinitions) {
      this.definitions.push(controller);
      if (controller.controllerProductHandle != null && controller.definitionProductHandle != null) {
        this.definitionByController.set(controller.controllerProductHandle, controller.definitionProductHandle);
      }
    }
    for (const value of values) {
      let byProperty = this.byController.get(value.controllerProductHandle);
      if (byProperty === undefined) {
        byProperty = new Map();
        this.byController.set(value.controllerProductHandle, byProperty);
      }
      if (!byProperty.has(value.propertyName)) {
        byProperty.set(value.propertyName, value);
      }
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

  read(
    controllerProductHandle: ProductHandle | null,
    propertyName: string,
    contextType: CheckerTypeReference | null = null,
  ): RuntimeBoundControllerPropertyValue | null {
    return (controllerProductHandle == null
      ? null
      : this.byController.get(controllerProductHandle)?.get(propertyName)
        ?? this.readDefinitionValue(controllerProductHandle, propertyName))
      ?? this.readContextTypeDefinitionValue(contextType, propertyName);
  }

  /** Read only a binding rendered against this exact controller instance. */
  readExactControllerProperty(
    controllerProductHandle: ProductHandle,
    propertyName: string,
  ): RuntimeBoundControllerPropertyValue | null {
    return this.byController.get(controllerProductHandle)?.get(propertyName) ?? null;
  }

  /** Read every binding rendered against this exact controller instance. */
  readExactControllerValues(
    controllerProductHandle: ProductHandle | null,
  ): readonly RuntimeBoundControllerPropertyValue[] {
    if (controllerProductHandle == null) {
      return [];
    }
    return [...(this.byController.get(controllerProductHandle)?.values() ?? [])];
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

  readAll(
    controllerProductHandle: ProductHandle | null,
    contextType: CheckerTypeReference | null = null,
  ): readonly RuntimeBoundControllerPropertyValue[] {
    const byProperty = new Map<string, RuntimeBoundControllerPropertyValue>();
    for (const value of this.readExactControllerValues(controllerProductHandle)) {
      byProperty.set(value.propertyName, value);
    }
    for (const value of this.readDefinitionValues(controllerProductHandle)) {
      if (!byProperty.has(value.propertyName)) {
        byProperty.set(value.propertyName, value);
      }
    }
    for (const value of this.readContextTypeDefinitionValues(contextType)) {
      if (!byProperty.has(value.propertyName)) {
        byProperty.set(value.propertyName, value);
      }
    }
    return [...byProperty.values()];
  }

  private readDefinitionValue(
    controllerProductHandle: ProductHandle,
    propertyName: string,
  ): RuntimeBoundControllerPropertyValue | null {
    const definitionProductHandle = this.definitionByController.get(controllerProductHandle) ?? null;
    if (definitionProductHandle == null) {
      return null;
    }
    const values = this.byDefinition.get(definitionProductHandle)?.get(propertyName) ?? [];
    return values.length === 1 ? values[0]! : null;
  }

  private readDefinitionValues(
    controllerProductHandle: ProductHandle | null,
  ): readonly RuntimeBoundControllerPropertyValue[] {
    if (controllerProductHandle == null) {
      return [];
    }
    const definitionProductHandle = this.definitionByController.get(controllerProductHandle) ?? null;
    return definitionProductHandle == null
      ? []
      : this.readUnambiguousDefinitionValues(definitionProductHandle);
  }

  private readContextTypeDefinitionValue(
    contextType: CheckerTypeReference | null,
    propertyName: string,
  ): RuntimeBoundControllerPropertyValue | null {
    const values = this.definitionHandlesForContextType(contextType)
      .flatMap((definitionProductHandle) =>
        this.byDefinition.get(definitionProductHandle)?.get(propertyName) ?? []
      );
    return values.length === 1 ? values[0]! : null;
  }

  private readContextTypeDefinitionValues(
    contextType: CheckerTypeReference | null,
  ): readonly RuntimeBoundControllerPropertyValue[] {
    return this.definitionHandlesForContextType(contextType)
      .flatMap((definitionProductHandle) => this.readUnambiguousDefinitionValues(definitionProductHandle));
  }

  private readUnambiguousDefinitionValues(
    definitionProductHandle: ProductHandle,
  ): readonly RuntimeBoundControllerPropertyValue[] {
    const byProperty = this.byDefinition.get(definitionProductHandle);
    if (byProperty == null) {
      return [];
    }
    return [...byProperty.values()].flatMap((values) =>
      values.length === 1 ? [values[0]!] : []
    );
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
  kernel: KernelSourceFileReadView,
  resources: readonly RuntimeBindingSourceValueTemplateResource[],
): RuntimeBoundControllerValueTable {
  return new RuntimeBoundControllerValueTable(
    resources.flatMap((resource) =>
      boundControllerValuesForRuntimeAnalysis(
        kernel,
        resource.runtimeAnalysis,
      )
    ),
    resources.flatMap((resource) => controllerDefinitionsForRuntimeAnalysis(resource)),
  );
}

export function extendRuntimeBoundControllerValueTable(
  kernel: KernelSourceFileReadView,
  base: RuntimeBoundControllerValueTable,
  rootDefinition: RuntimeControllerDefinitionReference,
  runtimeAnalysis: RuntimeBindingSourceValueRuntimeAnalysis,
): RuntimeBoundControllerValueTable {
  return new RuntimeBoundControllerValueTable(
    [
      ...base.values,
      ...boundControllerValuesForRuntimeAnalysis(kernel, runtimeAnalysis),
    ],
    [
      ...base.readControllerDefinitions(),
      rootDefinition,
      ...controllerDefinitionsForRuntimeRendering(runtimeAnalysis.runtimeRendering),
    ],
  );
}

function boundControllerValuesForRuntimeAnalysis(
  kernel: KernelSourceFileReadView,
  analysis: RuntimeBindingSourceValueRuntimeAnalysis,
): readonly RuntimeBoundControllerPropertyValue[] {
  const bindingsByProductHandle = new Map<ProductHandle, RuntimeBinding>(analysis.runtimeRendering.bindings
    .map((binding) => [binding.productHandle, binding]));
  const controllersByProductHandle = new Map(analysis.runtimeRendering.controllers
    .map((controller) => [controller.productHandle, controller]));
  const scopes = instructionScopeLookup(analysis.scopes.instructionScopes);
  const sourceBindingExpressionScopes = new RuntimeBindingExpressionScopeProjector(
    kernel,
    analysis.expressionWorld,
    analysis.expressionResourcePlan,
  );
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
    const expressionProductHandle = sourceExpressionProductHandleForBoundControllerBinding(
      binding,
      analysis.expressionResourcePlan,
    );
    if (binding == null || expressionProductHandle === undefined || !isRuntimeExpressionBinding(binding)) {
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
  binding: RuntimeBinding | null,
  expressionResourcePlan: RuntimeExpressionResourcePlan,
): ProductHandle | null | undefined {
  if (binding instanceof PropertyBinding) {
    return propertyBindingCarriesSourceToTarget(binding, expressionResourcePlan)
      ? binding.expressionProductHandle
      : undefined;
  }
  if (binding instanceof InterpolationBinding) {
    return binding.expressionProductHandles[0] ?? null;
  }
  return undefined;
}

function propertyBindingCarriesSourceToTarget(
  binding: PropertyBinding,
  expressionResourcePlan: RuntimeExpressionResourcePlan,
): boolean {
  switch (expressionResourcePlan.effectivePropertyBindingMode(binding)) {
    case TemplateBindingMode.OneTime:
    case TemplateBindingMode.ToView:
    case TemplateBindingMode.TwoWay:
      return true;
    case TemplateBindingMode.FromView:
    case TemplateBindingMode.Default:
    case TemplateBindingMode.Open:
      return false;
  }
}
