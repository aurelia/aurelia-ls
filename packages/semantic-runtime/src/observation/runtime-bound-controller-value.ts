import { BindingScope } from '../configuration/scope.js';
import type { ProductHandle } from '../kernel/handles.js';
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
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import type { TemplateScopeConstructionEmission } from '../template/template-controller-scope-materializer.js';
import { instructionScopeLookup } from './runtime-binding-expression.js';
import {
  sameCheckerTypeReference,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';

export interface RuntimeBoundControllerPropertyValue {
  readonly controllerProductHandle: ProductHandle;
  readonly controllerDefinitionProductHandle: ProductHandle | null;
  readonly propertyName: string;
  readonly bindingProductHandle: ProductHandle;
  readonly expressionProductHandle: ProductHandle | null;
  readonly sourceScope: BindingScope | null;
}

export interface RuntimeControllerDefinitionReference {
  readonly controllerProductHandle: ProductHandle | null;
  readonly definitionProductHandle: ProductHandle | null;
  readonly definitionTargetType: CheckerTypeReference | null;
}

export interface RuntimeBindingSourceValueRuntimeAnalysis {
  readonly runtimeRendering: RuntimeRenderingEmission;
  readonly controllerBind: RuntimeControllerBindEmission;
  readonly scopes: TemplateScopeConstructionEmission;
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

  private readExactControllerValues(
    controllerProductHandle: ProductHandle | null,
  ): readonly RuntimeBoundControllerPropertyValue[] {
    if (controllerProductHandle == null) {
      return [];
    }
    return [...(this.byController.get(controllerProductHandle)?.values() ?? [])];
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
  resources: readonly RuntimeBindingSourceValueTemplateResource[],
): RuntimeBoundControllerValueTable {
  return new RuntimeBoundControllerValueTable(
    resources.flatMap((resource) => boundControllerValuesForRuntimeAnalysis(resource.runtimeAnalysis)),
    resources.flatMap((resource) => controllerDefinitionsForRuntimeAnalysis(resource)),
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
  );
}

function boundControllerValuesForRuntimeAnalysis(
  analysis: RuntimeBindingSourceValueRuntimeAnalysis,
): readonly RuntimeBoundControllerPropertyValue[] {
  const bindingsByProductHandle = new Map<ProductHandle, RuntimeBinding>(analysis.runtimeRendering.bindings
    .map((binding) => [binding.productHandle, binding]));
  const controllersByProductHandle = new Map(analysis.runtimeRendering.controllers
    .map((controller) => [controller.productHandle, controller]));
  const scopes = instructionScopeLookup(analysis.scopes.instructionScopes);
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
    const expressionProductHandle = sourceExpressionProductHandleForBoundControllerBinding(binding);
    if (binding == null || expressionProductHandle === undefined) {
      continue;
    }
    const targetController = controllersByProductHandle.get(targetAccess.targetControllerProductHandle) ?? null;
    values.push({
      controllerProductHandle: targetAccess.targetControllerProductHandle,
      controllerDefinitionProductHandle: targetController?.definitionProductHandle ?? null,
      propertyName: targetAccess.targetProperty,
      bindingProductHandle: binding.productHandle,
      expressionProductHandle,
      sourceScope: scopes.scopeForBinding(analysis.runtimeRendering, binding),
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
): ProductHandle | null | undefined {
  if (binding instanceof PropertyBinding) {
    return propertyBindingCarriesSourceToTarget(binding)
      ? binding.expressionProductHandle
      : undefined;
  }
  if (binding instanceof InterpolationBinding) {
    return binding.expressionProductHandles[0] ?? null;
  }
  return undefined;
}

function propertyBindingCarriesSourceToTarget(binding: PropertyBinding): boolean {
  switch (binding.bindingMode) {
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
