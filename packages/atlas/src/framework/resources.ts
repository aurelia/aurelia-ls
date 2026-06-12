/** Aurelia resource definition kind as observed from framework source carriers. */
export const enum FrameworkResourceDefinitionKind {
  CustomElement = "custom-element",
  CustomAttribute = "custom-attribute",
  TemplateController = "template-controller",
  ValueConverter = "value-converter",
  BindingBehavior = "binding-behavior",
  BindingCommand = "binding-command",
  AttributePattern = "attribute-pattern",
  Renderer = "renderer",
}

/** Resource runtime-existence class shared by resource, admission, and materialization lenses. */
export const enum FrameworkResourceInstantiationKind {
  /** Custom element, custom attribute, or template-controller view-model construction goes through container.invoke. */
  ViewModelContainerInvoke = "view-model-container-invoke",
  /** Custom element construction is possible through dynamic composition. */
  DynamicComposition = "dynamic-composition",
  /** Value converter or binding behavior instances are reached through expression evaluator resource lookup. */
  ExpressionResourceLookup = "expression-resource-lookup",
  /** Binding command instances are reached by the template compiler and produce instruction records. */
  CompilerCommand = "compiler-command",
  /** Attribute pattern handlers are registered with the compiler parser and resolved while parsing attributes. */
  SyntaxPatternHandler = "syntax-pattern-handler",
  /** Runtime renderers are singleton IRenderer providers consumed through getAll(IRenderer). */
  RendererSingleton = "renderer-singleton",
  /** The resource carrier defines metadata/definition but no runtime materialization route is modeled yet. */
  DefinitionOnly = "definition-only",
}

/** Runtime instance lifetime for a framework resource class. */
export type FrameworkResourceInstanceLifetime =
  | "singleton"
  | "per-invocation"
  | "resolver-cached"
  | "definition-only";

/** Source-backed runtime policy for a framework resource carrier or materialization row. */
export class FrameworkResourceRuntimePolicy {
  constructor(
    /** Resource definition kind this policy applies to. */
    readonly resourceKind: FrameworkResourceDefinitionKind | string,
    /** Runtime-existence classes observed for this resource. */
    readonly instantiationKinds: readonly FrameworkResourceInstantiationKind[],
    /** Instance lifetime implied by the observed runtime-existence classes. */
    readonly instanceLifetime: FrameworkResourceInstanceLifetime,
  ) {}

  /** Derive runtime policy from observed materialization/registration evidence. */
  static fromInstantiationKinds(
    resourceKind: FrameworkResourceDefinitionKind | string,
    instantiationKinds: readonly FrameworkResourceInstantiationKind[],
  ): FrameworkResourceRuntimePolicy {
    return new FrameworkResourceRuntimePolicy(
      resourceKind,
      instantiationKinds,
      resourceLifetimeFromInstantiationKinds(resourceKind, instantiationKinds),
    );
  }

  /** Runtime policy implied when a resource carrier itself is admitted to a container. */
  static forRegisteredResourceKind(
    resourceKind: FrameworkResourceDefinitionKind | string,
  ): FrameworkResourceRuntimePolicy {
    return new FrameworkResourceRuntimePolicy(
      resourceKind,
      [],
      registeredResourceLifetime(resourceKind),
    );
  }
}

function registeredResourceLifetime(
  resourceKind: FrameworkResourceDefinitionKind | string,
): FrameworkResourceInstanceLifetime {
  switch (resourceKind) {
    case FrameworkResourceDefinitionKind.CustomElement:
    case FrameworkResourceDefinitionKind.CustomAttribute:
    case FrameworkResourceDefinitionKind.TemplateController:
      return "per-invocation";
    case FrameworkResourceDefinitionKind.BindingBehavior:
    case FrameworkResourceDefinitionKind.BindingCommand:
    case FrameworkResourceDefinitionKind.ValueConverter:
    case FrameworkResourceDefinitionKind.AttributePattern:
      return "resolver-cached";
    case FrameworkResourceDefinitionKind.Renderer:
      return "singleton";
    default:
      return "definition-only";
  }
}

function resourceLifetimeFromInstantiationKinds(
  resourceKind: FrameworkResourceDefinitionKind | string,
  instantiationKinds: readonly FrameworkResourceInstantiationKind[],
): FrameworkResourceInstanceLifetime {
  if (
    instantiationKinds.length === 0 ||
    instantiationKinds.every(
      (kind) => kind === FrameworkResourceInstantiationKind.DefinitionOnly,
    )
  ) {
    return "definition-only";
  }
  if (
    resourceKind === FrameworkResourceDefinitionKind.Renderer ||
    instantiationKinds.includes(FrameworkResourceInstantiationKind.RendererSingleton)
  ) {
    return "singleton";
  }
  if (
    resourceKind === FrameworkResourceDefinitionKind.CustomElement ||
    resourceKind === FrameworkResourceDefinitionKind.CustomAttribute ||
    resourceKind === FrameworkResourceDefinitionKind.TemplateController ||
    instantiationKinds.includes(FrameworkResourceInstantiationKind.ViewModelContainerInvoke) ||
    instantiationKinds.includes(FrameworkResourceInstantiationKind.DynamicComposition)
  ) {
    return "per-invocation";
  }
  if (
    instantiationKinds.includes(FrameworkResourceInstantiationKind.ExpressionResourceLookup) ||
    instantiationKinds.includes(FrameworkResourceInstantiationKind.CompilerCommand) ||
    instantiationKinds.includes(FrameworkResourceInstantiationKind.SyntaxPatternHandler)
  ) {
    return "resolver-cached";
  }
  return "definition-only";
}
