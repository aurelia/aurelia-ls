import {
  FrameworkDiResolverStrategy,
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipClosure,
  type FrameworkRelationshipEndpoint,
  FrameworkRelationshipRelation,
} from "./relationships.js";

/** First-pass route class for a DI key provider materialization seed. */
export const enum FrameworkMaterializationRouteKind {
  /** Existing runtime value is registered for the key. */
  InstanceValue = "instance-value",
  /** Constructable provider is visible for singleton/transient resolution. */
  ConstructableProvider = "constructable-provider",
  /** Callback provider is visible but needs evaluator/effect tracing to close. */
  CallbackProvider = "callback-provider",
  /** Key resolves through another key. */
  AliasDelegation = "alias-delegation",
  /** Provider target is visible but not classified more narrowly yet. */
  Provider = "provider",
}

/** Minimal provider seed evidence needed to classify a DI materialization route. */
export interface FrameworkMaterializationProviderSeed {
  /** Provider or alias relation observed in the DI substrate. */
  readonly relation: FrameworkRelationshipRelation;
  /** Kernel resolver strategy when the provider source exposes one. */
  readonly strategy?: FrameworkDiResolverStrategy;
  /** Closure of the provider atom before materialization interpretation. */
  readonly closure: FrameworkRelationshipClosure;
}

/** Provider identity lane used when a provider expression is not a useful node name. */
export const enum FrameworkMaterializationProviderIdentityKind {
  /** Provider is a named source symbol, resource, key, or registry export. */
  Named = "named",
  /** Provider is a callback function expression owned by a DI key route. */
  Callback = "callback",
  /** Provider is another expression whose source remains the exact evidence. */
  Expression = "expression",
}

/** Source-backed identity for a DI materialization provider. */
export class FrameworkMaterializationProviderIdentity {
  constructor(
    /** Stable identity id for graph nodes. */
    readonly id: string,
    /** Identity lane. */
    readonly kind: FrameworkMaterializationProviderIdentityKind,
    /** Short graph/display name. */
    readonly name: string,
    /** Raw endpoint name preserved from source/checker evidence. */
    readonly rawName: string,
  ) {}

  /** Build a provider identity for one materialization route. */
  static forRoute(
    key: string,
    routeKind: FrameworkMaterializationRouteKind,
    provider: FrameworkRelationshipEndpoint,
    expressionLabel?: string,
  ): FrameworkMaterializationProviderIdentity {
    if (isCallbackProvider(routeKind, provider, expressionLabel)) {
      return new FrameworkMaterializationProviderIdentity(
        providerIdentityId("callback", key, provider),
        FrameworkMaterializationProviderIdentityKind.Callback,
        `${key} callback provider`,
        provider.name,
      );
    }
    if (isNamedProvider(provider)) {
      return new FrameworkMaterializationProviderIdentity(
        `framework-materialization-provider:named:${provider.packageId ?? "repo"}:${provider.name}`,
        FrameworkMaterializationProviderIdentityKind.Named,
        provider.name,
        provider.name,
      );
    }
    if (provider.kind === FrameworkRelationshipEndpointKind.Expression) {
      const label = expressionLabel ?? expressionProviderLabel(provider);
      return new FrameworkMaterializationProviderIdentity(
        providerIdentityId("expression", key, provider),
        FrameworkMaterializationProviderIdentityKind.Expression,
        `${key} ${label} provider`,
        provider.name,
      );
    }
    return new FrameworkMaterializationProviderIdentity(
      `framework-materialization-provider:named:${provider.packageId ?? "repo"}:${provider.name}`,
      FrameworkMaterializationProviderIdentityKind.Named,
      provider.name,
      provider.name,
    );
  }
}

type RouteSummary = (
  key: string,
  provider: string,
  strategy: FrameworkDiResolverStrategy | undefined,
) => string;

type InstantiationSummary = (
  key: string,
  provider: string,
  constructionSiteCount: number,
) => string;

/**
 * Framework-owned interpretation for turning DI provider evidence into a
 * materialization route shape.
 */
export class FrameworkMaterializationRouteDescriptor {
  private static readonly instanceValue =
    new FrameworkMaterializationRouteDescriptor(
      FrameworkMaterializationRouteKind.InstanceValue,
      false,
      false,
      true,
      (key, provider) =>
        `${key} materializes as existing instance/value ${provider}.`,
      (key) =>
        `${key} is an existing registered value; no framework construction site is required.`,
    );

  private static readonly constructableProvider =
    new FrameworkMaterializationRouteDescriptor(
      FrameworkMaterializationRouteKind.ConstructableProvider,
      false,
      true,
      true,
      (key, provider, strategy) =>
        `${key} materializes through ${
          strategy ?? "unknown"
        } constructable ${provider}.`,
      (key, provider, constructionSiteCount) =>
        `${key} is instantiated as ${provider} through Aurelia factory construction at ${constructionSiteCount} framework site(s).`,
    );

  private static readonly callbackProvider =
    new FrameworkMaterializationRouteDescriptor(
      FrameworkMaterializationRouteKind.CallbackProvider,
      true,
      false,
      true,
      (key, provider) =>
        `${key} materializes through ${provider}; callback effects still need evaluator tracing.`,
      (key, provider) =>
        `${key} is produced by ${provider}; callback return closure remains evaluator work.`,
    );

  private static readonly aliasDelegation =
    new FrameworkMaterializationRouteDescriptor(
      FrameworkMaterializationRouteKind.AliasDelegation,
      false,
      false,
      false,
      (key, provider) => `${key} resolves by aliasing ${provider}.`,
      (key, provider) =>
        `${key} delegates instantiation to alias target ${provider}.`,
    );

  private static readonly provider = new FrameworkMaterializationRouteDescriptor(
    FrameworkMaterializationRouteKind.Provider,
    false,
    false,
    true,
    (key, provider) => `${key} materializes through provider ${provider}.`,
    (key, provider) =>
      `${key} has provider ${provider}, but its instantiation class is not closed yet.`,
  );

  private constructor(
    /** Materialization route shape carried by route rows. */
    readonly routeKind: FrameworkMaterializationRouteKind,
    /** Whether the provider expression should be traced for callback effects. */
    readonly tracesCallbackDependencies: boolean,
    /** Whether kernel factory/constructor sites can close this route. */
    readonly usesFrameworkConstructionSites: boolean,
    /** Whether the route asserts a direct provider runtime-existence edge. */
    readonly emitsInstantiationRelationship: boolean,
    private readonly routeSummary: RouteSummary,
    private readonly instantiationSummary: InstantiationSummary,
  ) {}

  /** Classify one DI provider atom into its materialization route shape. */
  static forProviderSeed(
    seed: FrameworkMaterializationProviderSeed,
  ): FrameworkMaterializationRouteDescriptor {
    if (seed.relation === FrameworkRelationshipRelation.AliasesKey) {
      return FrameworkMaterializationRouteDescriptor.aliasDelegation;
    }
    switch (seed.strategy) {
      case FrameworkDiResolverStrategy.Instance:
        return FrameworkMaterializationRouteDescriptor.instanceValue;
      case FrameworkDiResolverStrategy.Singleton:
      case FrameworkDiResolverStrategy.Transient:
        return FrameworkMaterializationRouteDescriptor.constructableProvider;
      case FrameworkDiResolverStrategy.Callback:
      case FrameworkDiResolverStrategy.CachedCallback:
        return FrameworkMaterializationRouteDescriptor.callbackProvider;
      default:
        return FrameworkMaterializationRouteDescriptor.provider;
    }
  }

  /** Recover the descriptor for an already-classified route row. */
  static forRouteKind(
    routeKind: FrameworkMaterializationRouteKind,
  ): FrameworkMaterializationRouteDescriptor {
    switch (routeKind) {
      case FrameworkMaterializationRouteKind.InstanceValue:
        return FrameworkMaterializationRouteDescriptor.instanceValue;
      case FrameworkMaterializationRouteKind.ConstructableProvider:
        return FrameworkMaterializationRouteDescriptor.constructableProvider;
      case FrameworkMaterializationRouteKind.CallbackProvider:
        return FrameworkMaterializationRouteDescriptor.callbackProvider;
      case FrameworkMaterializationRouteKind.AliasDelegation:
        return FrameworkMaterializationRouteDescriptor.aliasDelegation;
      case FrameworkMaterializationRouteKind.Provider:
        return FrameworkMaterializationRouteDescriptor.provider;
    }
  }

  /** Closure to report on the route row itself. */
  routeClosure(
    seedClosure: FrameworkRelationshipClosure,
  ): FrameworkRelationshipClosure {
    return this.tracesCallbackDependencies
      ? FrameworkRelationshipClosure.Partial
      : seedClosure;
  }

  /** Closure to report after joining framework construction-site evidence. */
  instantiationClosure(
    seedClosure: FrameworkRelationshipClosure,
    constructionSiteCount: number,
  ): FrameworkRelationshipClosure {
    if (
      this.usesFrameworkConstructionSites &&
      constructionSiteCount === 0
    ) {
      return FrameworkRelationshipClosure.Partial;
    }
    if (this.tracesCallbackDependencies) {
      return FrameworkRelationshipClosure.Partial;
    }
    return seedClosure;
  }

  /** Human-facing summary for a provider route row. */
  summarizeRoute(
    key: string,
    provider: string,
    strategy: FrameworkDiResolverStrategy | undefined,
  ): string {
    return this.routeSummary(key, provider, strategy);
  }

  /** Human-facing summary for an instantiation row. */
  summarizeInstantiation(
    key: string,
    provider: string,
    constructionSiteCount: number,
  ): string {
    return this.instantiationSummary(key, provider, constructionSiteCount);
  }
}

function isCallbackProvider(
  routeKind: FrameworkMaterializationRouteKind,
  provider: FrameworkRelationshipEndpoint,
  expressionLabel: string | undefined,
): boolean {
  return (
    routeKind === FrameworkMaterializationRouteKind.CallbackProvider &&
    provider.kind === FrameworkRelationshipEndpointKind.Expression &&
    (expressionLabel === "function" ||
      provider.expression?.syntaxKindName === "ArrowFunction" ||
      provider.expression?.syntaxKindName === "FunctionExpression")
  );
}

function isNamedProvider(provider: FrameworkRelationshipEndpoint): boolean {
  if (provider.kind !== FrameworkRelationshipEndpointKind.Expression) {
    return true;
  }
  return (
    provider.expression?.symbolName !== null &&
    provider.expression?.symbolName !== undefined
  ) || provider.expression?.syntaxKindName === "Identifier" ||
    provider.expression?.syntaxKindName === "PropertyAccessExpression";
}

function providerIdentityId(
  kind: string,
  name: string,
  provider: FrameworkRelationshipEndpoint,
): string {
  return `framework-materialization-provider:${kind}:${name}:${sourceIdentity(provider)}`;
}

function sourceIdentity(provider: FrameworkRelationshipEndpoint): string {
  const source = provider.source;
  if (source === undefined) {
    return provider.name;
  }
  return `${normalizedSourcePath(source.filePath)}:${source.start.line}:${source.start.character}:${source.end.line}:${source.end.character}`;
}

function expressionProviderLabel(provider: FrameworkRelationshipEndpoint): string {
  switch (provider.expression?.syntaxKindName) {
    case "ClassExpression":
      return "class";
    case "ObjectLiteralExpression":
      return "value";
    case "ArrowFunction":
    case "FunctionExpression":
      return "function";
    default:
      return "expression";
  }
}

function normalizedSourcePath(filePath: string): string {
  const normalized = filePath.replace(/\\/gu, "/");
  for (const marker of ["/aurelia/", "/packages/", "/examples/"]) {
    const index = normalized.indexOf(marker);
    if (index >= 0) {
      return normalized.slice(index + 1);
    }
  }
  return normalized;
}
