import {
  AttributeParserMachine,
  AttributeParserService,
  type AttributePatternExecutable,
  type CompiledAttributePattern,
} from './attribute-syntax.js';
import {
  BindingCommandResolverService,
  type BindingCommandExecutable,
} from './binding-command-execution.js';
import {
  type TemplateCompilerIssue,
  TemplateCompilerIssueKind,
  TemplateCompilerIssuePhase,
  TemplateCompilerIssueRelatedInformation,
  type TemplateCompilerIssueSeverity,
} from './compiler-issue.js';
import {
  TemplateCompilerIssuePublisher,
} from './compiler-issue-publication.js';
import {
  ObserverLocatorConfiguration,
} from '../observation/observer-locator.js';
import { AttributeMapperConfiguration } from './attribute-mapper.js';
import { RuntimeKeyMappingConfiguration } from './runtime-event-modifier.js';
import {
  TemplateCompilerService,
  TemplateCompilerWorld,
  type TemplateCompilerWorldKind,
  TemplateAttributeMapperService,
  TemplateExpressionParserService,
  TemplateRenderingService,
  TemplateResourceResolverService,
  TemplateResourceScope,
  type TemplateResourceScopeBlockedLookup,
  type TemplateResourceScopeExclusion,
  type TemplateResourceScopeLookup,
  type TemplateResourceScopeReference,
} from './compiler-world.js';
import {
  sameTemplateVisibleResourceSet,
  type TemplateCompilerServiceReference,
  type TemplateResourceVisibilityKind,
  TemplateVisibleResource,
} from './compiler-world-reference.js';
import type {
  CompilerAttributePatternResource,
  CompilerBindingCommandResource,
} from './syntax-resource-materializer.js';
import type { BuiltInRuntimeRendererEmission } from './runtime-renderer-catalog-materializer.js';
import {
  TemplateCompilerFrameworkErrorCode,
} from './framework-error-code.js';
import type { AppRootReference } from '../configuration/app-root.js';
import type { Container } from '../di/container.js';
import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  CompilerIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import type { ProductDetailSlot } from '../kernel/product-details.js';
import {
  KernelPublicationPlan,
  publishProductDetail,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import {
  KernelStoreBatch,
  type KernelStoreReadView,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type ProductKindKey,
} from '../kernel/vocabulary.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { AttributePatternDefinitionEntry } from '../resources/attribute-pattern-definition.js';
import { TemplateProductDetails } from './product-details.js';
import { mergeVisibleResourceScopeResolution } from './resource-scope-builder.js';
import type { StaticCallableExecutionBindings } from '../evaluation/function-execution.js';
import {
  sameTemplateCompilerHookSetCandidate,
  TemplateCompilerHookCallableAuthority,
  TemplateCompilerHookCallableAuthorityKind,
  TemplateCompilerHookEntry,
  TemplateCompilerHookKind,
  TemplateCompilerHookLane,
  TemplateCompilerHookOpenReason,
  TemplateCompilerHookProviderAuthority,
  TemplateCompilerHookProviderResolutionKind,
  TemplateCompilerHookSet,
  type TemplateCompilerHookSetCandidate,
  unmodeledTemplateCompilerHooks,
} from './compiler-hook-world.js';
import { OpenSeam, OpenSeamReasonKind } from '../kernel/open-seam.js';
import {
  CssClassMappingAuthority,
  CssClassMappingAuthorityCandidate,
  CssClassMappingOpenReason,
  sameCssClassMappingAuthorityCandidate,
} from './css-class-mapping.js';

export class TemplateCompilerWorldConstructionRequest {
  constructor(
    /** Store-local key for the compiler world being materialized. */
    readonly localKey: string,
    /** World lane being constructed. */
    readonly worldKind: TemplateCompilerWorldKind,
    /** Container whose DI/resource state feeds this compiler world. */
    readonly container: Container,
    /** AppRoot that owns this compiler world, if known. */
    readonly appRoot: AppRootReference | null,
    /** Compiler-context resource membership; exact runtime availability is carried separately by resourceLookups. */
    readonly resources: readonly TemplateVisibleResource[],
    /** Attribute-pattern executables selected as visible to this compiler world. */
    readonly attributePatterns: readonly CompilerAttributePatternResource[],
    /** Binding-command executables selected as visible to this compiler world. */
    readonly bindingCommands: readonly CompilerBindingCommandResource[],
    /** Runtime renderers selected as visible to Rendering in this compiler world. */
    readonly runtimeRenderers: readonly BuiltInRuntimeRendererEmission[],
    /** How the selected syntax executables became visible to this compiler world. */
    readonly syntaxVisibilityKind: TemplateResourceVisibilityKind,
    /** Address of the app/root/component boundary that owns this world. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Current app-analysis callable authority used by executable compiler policy slots. */
    readonly callableBindings: StaticCallableExecutionBindings,
    /** App-authored AttrMapper service state visible to this compiler world. */
    readonly attributeMapperConfiguration: AttributeMapperConfiguration = AttributeMapperConfiguration.empty,
    /** App-authored ObserverLocator and NodeObserverLocator state visible to runtime binding analysis. */
    readonly observerLocatorConfiguration: ObserverLocatorConfiguration = ObserverLocatorConfiguration.empty,
    /** App-effective IKeyMapping state visible to listener runtime analysis and authoring. */
    readonly runtimeKeyMappingConfiguration: RuntimeKeyMappingConfiguration =
      RuntimeKeyMappingConfiguration.frameworkDefault,
    /** Losing resource contenders retained by the scope-selection pass. */
    readonly resourceExclusions: readonly TemplateResourceScopeExclusion[] = [],
    /** Parent resource scope when this world is derived. */
    readonly parentResourceScope: TemplateResourceScopeReference | null = null,
    /** Exact runtime lookup-key ownership selected for this world. */
    readonly resourceLookups: readonly TemplateResourceScopeLookup[] = [],
    /** Occupied runtime resource keys with no statically usable target. */
    readonly blockedResourceLookups: readonly TemplateResourceScopeBlockedLookup[] = [],
    /** Ordered hook membership/callable candidate for this exact compiler invocation world. */
    readonly compilerHooks: TemplateCompilerHookSetCandidate = unmodeledTemplateCompilerHooks,
    /** Component-local `ICssClassMapping` candidate shared by generated hooks and runtime class consumers. */
    readonly cssClassMapping: CssClassMappingAuthorityCandidate = CssClassMappingAuthorityCandidate.exactNone,
  ) {}
}

/** Inputs for a component compiler world that inherits semantic services from an admitted parent world. */
export class TemplateCompilerWorldDerivationRequest {
  constructor(
    readonly localKey: string,
    readonly worldKind: TemplateCompilerWorldKind,
    readonly parent: TemplateCompilerWorldEmission,
    readonly preferredResources: readonly TemplateVisibleResource[],
    readonly syntaxVisibilityKind: TemplateResourceVisibilityKind,
    readonly sourceAddressHandle: AddressHandle | null,
    /** Additional compiler-context members retained without becoming lookup-key contenders. Parent members persist. */
    readonly retainedContextResources: readonly TemplateVisibleResource[] | null = null,
    /** Replacement leaf/root hook projection; null inherits the parent hook set exactly. */
    readonly compilerHooks: TemplateCompilerHookSetCandidate | null = null,
    /** Replacement leaf-locus CSS mapping; null inherits the exact current locus. */
    readonly cssClassMapping: CssClassMappingAuthorityCandidate | null = null,
  ) {}
}

export class TemplateCompilerWorldEmission {
  constructor(
    readonly container: Container,
    readonly world: TemplateCompilerWorld,
    readonly resourceScope: TemplateResourceScope,
    readonly templateCompiler: TemplateCompilerService,
    readonly compilerHooks: TemplateCompilerHookSet,
    readonly cssClassMapping: CssClassMappingAuthority,
    readonly resourceResolver: TemplateResourceResolverService,
    readonly expressionParser: TemplateExpressionParserService,
    readonly attributeMapper: TemplateAttributeMapperService,
    readonly rendering: TemplateRenderingService,
    readonly attributeParser: AttributeParserService,
    readonly attributeParserMachine: AttributeParserMachine,
    readonly bindingCommandResolver: BindingCommandResolverService,
    readonly attributePatterns: readonly CompilerAttributePatternResource[],
    readonly bindingCommands: readonly CompilerBindingCommandResource[],
    readonly runtimeRenderers: readonly BuiltInRuntimeRendererEmission[],
    readonly callableBindings: StaticCallableExecutionBindings,
    readonly issues: readonly TemplateCompilerIssue[],
    readonly syntaxResources: readonly TemplateVisibleResource[],
    readonly records: readonly KernelStoreRecord[],
  ) {}

  /** Preserve immutable compiler products while attaching the current generation's live DI container frame. */
  forContainerGeneration(
    container: Container,
    callableBindings: StaticCallableExecutionBindings,
  ): TemplateCompilerWorldEmission {
    return container === this.container && callableBindings === this.callableBindings
      ? this
      : new TemplateCompilerWorldEmission(
          container,
          this.world,
          this.resourceScope,
          this.templateCompiler,
          this.compilerHooks,
          this.cssClassMapping,
          this.resourceResolver,
          this.expressionParser,
          this.attributeMapper,
          this.rendering,
          this.attributeParser,
          this.attributeParserMachine,
          this.bindingCommandResolver,
          this.attributePatterns,
          this.bindingCommands,
          this.runtimeRenderers,
          callableBindings,
          this.issues,
          this.syntaxResources,
          this.records,
        );
  }
}

class CompilerWorldSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
    readonly addressHandle: AddressHandle | null,
  ) {}
}

class CompilerWorldClaims {
  constructor(
    readonly worldClaims: readonly SemanticClaim[],
    readonly scopeClaims: readonly SemanticClaim[],
    readonly serviceClaims: readonly SemanticClaim[],
  ) {}

  get allClaims(): readonly SemanticClaim[] {
    return [...this.worldClaims, ...this.scopeClaims, ...this.serviceClaims];
  }
}

class CompilerWorldIssueSet {
  private readonly publisher: TemplateCompilerIssuePublisher;
  readonly issues: TemplateCompilerIssue[] = [];
  readonly records: KernelStoreRecord[] = [];

  constructor(
    store: KernelStoreReadView,
    private readonly localKey: string,
    private readonly provenanceHandle: ProvenanceHandle,
  ) {
    this.publisher = new TemplateCompilerIssuePublisher(store);
  }

  publish(
    local: string,
    ownerIdentityHandle: IdentityHandle,
    phase: TemplateCompilerIssuePhase,
    issueKind: TemplateCompilerIssueKind,
    message: string,
    frameworkErrorCode: string,
    sourceAddressHandle: AddressHandle | null,
    severity: TemplateCompilerIssueSeverity = 'error',
    relatedInformation: readonly TemplateCompilerIssueRelatedInformation[] = [],
  ): void {
    const publication = this.publisher.publish(
      `compiler-world:${this.localKey}:issue:${local}`,
      ownerIdentityHandle,
      this.provenanceHandle,
      phase,
      issueKind,
      message,
      frameworkErrorCode,
      sourceAddressHandle,
      severity,
      relatedInformation,
    );
    this.issues.push(publication.issue);
    this.records.push(...publication.records);
  }
}

class CompilerWorldHandleSet {
  constructor(
    readonly worldProductHandle: ProductHandle,
    readonly worldIdentityHandle: IdentityHandle,
    readonly scopeProductHandle: ProductHandle,
    readonly scopeIdentityHandle: IdentityHandle,
    readonly machineProductHandle: ProductHandle,
    readonly machineIdentityHandle: IdentityHandle,
    readonly attributeParserProductHandle: ProductHandle,
    readonly attributeParserIdentityHandle: IdentityHandle,
    readonly bindingResolverProductHandle: ProductHandle,
    readonly bindingResolverIdentityHandle: IdentityHandle,
    readonly templateCompilerProductHandle: ProductHandle,
    readonly templateCompilerIdentityHandle: IdentityHandle,
    readonly compilerHooksProductHandle: ProductHandle,
    readonly compilerHooksIdentityHandle: IdentityHandle,
    readonly cssClassMappingProductHandle: ProductHandle,
    readonly cssClassMappingIdentityHandle: IdentityHandle,
    readonly resourceResolverProductHandle: ProductHandle,
    readonly resourceResolverIdentityHandle: IdentityHandle,
    readonly expressionParserProductHandle: ProductHandle,
    readonly expressionParserIdentityHandle: IdentityHandle,
    readonly attributeMapperProductHandle: ProductHandle,
    readonly attributeMapperIdentityHandle: IdentityHandle,
    readonly renderingProductHandle: ProductHandle,
    readonly renderingIdentityHandle: IdentityHandle,
  ) {}

  get materializedProductHandles(): readonly ProductHandle[] {
    return [
      this.worldProductHandle,
      this.scopeProductHandle,
      this.machineProductHandle,
      this.attributeParserProductHandle,
      this.bindingResolverProductHandle,
      this.templateCompilerProductHandle,
      this.compilerHooksProductHandle,
      this.cssClassMappingProductHandle,
      this.resourceResolverProductHandle,
      this.expressionParserProductHandle,
      this.attributeMapperProductHandle,
      this.renderingProductHandle,
    ];
  }
}

class CompilerWorldProducts {
  constructor(
    readonly world: TemplateCompilerWorld,
    readonly resourceScope: TemplateResourceScope,
    readonly templateCompiler: TemplateCompilerService,
    readonly compilerHooks: TemplateCompilerHookSet,
    readonly cssClassMapping: CssClassMappingAuthority,
    readonly resourceResolver: TemplateResourceResolverService,
    readonly expressionParser: TemplateExpressionParserService,
    readonly attributeMapper: TemplateAttributeMapperService,
    readonly rendering: TemplateRenderingService,
    readonly attributeParser: AttributeParserService,
    readonly attributeParserMachine: AttributeParserMachine,
    readonly bindingCommandResolver: BindingCommandResolverService,
    readonly syntaxResources: readonly TemplateVisibleResource[],
    readonly serviceReferences: readonly TemplateCompilerServiceReference[],
    readonly hookRecords: readonly KernelStoreRecord[],
    readonly cssClassMappingRecords: readonly KernelStoreRecord[],
    readonly issues: readonly TemplateCompilerIssue[],
    readonly issueRecords: readonly KernelStoreRecord[],
  ) {}

  toEmission(
    input: TemplateCompilerWorldConstructionRequest,
    records: readonly KernelStoreRecord[],
  ): TemplateCompilerWorldEmission {
    return new TemplateCompilerWorldEmission(
      input.container,
      this.world,
      this.resourceScope,
      this.templateCompiler,
      this.compilerHooks,
      this.cssClassMapping,
      this.resourceResolver,
      this.expressionParser,
      this.attributeMapper,
      this.rendering,
      this.attributeParser,
      this.attributeParserMachine,
      this.bindingCommandResolver,
      input.attributePatterns,
      input.bindingCommands,
      input.runtimeRenderers,
      input.callableBindings,
      this.issues,
      this.syntaxResources,
      [...records, ...this.issueRecords],
    );
  }
}

class CompilerWorldAttributeParserProducts {
  constructor(
    readonly machine: AttributeParserMachine,
    readonly service: AttributeParserService,
  ) {}
}

class CompilerWorldHookProducts {
  constructor(
    readonly hookSet: TemplateCompilerHookSet,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class CompilerWorldCssClassMappingProducts {
  constructor(
    readonly authority: CssClassMappingAuthority,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Materializes the compiler-facing world once visibility has already been selected. */
export class TemplateCompilerWorldMaterializer {
  constructor(
    /** Required immediate or staged publication boundary for compiler-world products. */
    readonly store: KernelPublicationContext,
  ) {}

  construct(input: TemplateCompilerWorldConstructionRequest): TemplateCompilerWorldEmission {
    return this.publish(input.localKey, this.project(input));
  }

  /** Construct a derived world while registering the exact parent products whose values it inherits. */
  constructDerived(input: TemplateCompilerWorldDerivationRequest): TemplateCompilerWorldEmission {
    const construction = this.constructionRequestForDerivation(input);
    if (construction == null) {
      return input.parent;
    }
    this.observeDerivationInputs(input.parent);
    return this.construct(construction);
  }

  /** Build the same immutable world without publishing it, for validation against a current parent authority. */
  project(input: TemplateCompilerWorldConstructionRequest): TemplateCompilerWorldEmission {
    return this.recordsForWorld(input);
  }

  /** Project the current derived-world candidate without registering reads or publishing products. */
  projectDerived(input: TemplateCompilerWorldDerivationRequest): TemplateCompilerWorldEmission {
    const construction = this.constructionRequestForDerivation(input);
    return construction == null ? input.parent : this.project(construction);
  }

  /** Publish an already-projected compiler world under the caller's current computation child. */
  publish(
    localKey: string,
    emission: TemplateCompilerWorldEmission,
  ): TemplateCompilerWorldEmission {
    this.store.publish(this.publicationFor(localKey, emission));
    return emission;
  }

  private constructionRequestForDerivation(
    input: TemplateCompilerWorldDerivationRequest,
  ): TemplateCompilerWorldConstructionRequest | null {
    const parent = input.parent;
    const compilerHooks = input.compilerHooks ?? parent.compilerHooks.toCandidate();
    const cssClassMapping = input.cssClassMapping ?? parent.cssClassMapping.toCandidate();
    const resolution = mergeVisibleResourceScopeResolution(
      input.preferredResources,
      parent.resourceScope.resources,
      parent.resourceScope.exclusions,
      parent.resourceScope.lookups,
      parent.resourceScope.blockedLookups,
      input.retainedContextResources,
    );
    const hasNewExclusions = resolution.exclusions.length !== parent.resourceScope.exclusions.length
      || resolution.exclusions.some((exclusion, index) =>
        exclusion !== parent.resourceScope.exclusions[index]
      );
    const hasNewLookups = resolution.lookups.length !== parent.resourceScope.lookups.length
      || resolution.lookups.some((lookup, index) => lookup !== parent.resourceScope.lookups[index]);
    const hasNewBlockedLookups = resolution.blockedLookups.length !== parent.resourceScope.blockedLookups.length
      || resolution.blockedLookups.some((lookup, index) => lookup !== parent.resourceScope.blockedLookups[index]);
    if (
      sameTemplateVisibleResourceSet(resolution.resources, parent.resourceScope.resources)
      && !hasNewExclusions
      && !hasNewLookups
      && !hasNewBlockedLookups
      && sameTemplateCompilerHookSetCandidate(compilerHooks, parent.compilerHooks.toCandidate())
      && sameCssClassMappingAuthorityCandidate(cssClassMapping, parent.cssClassMapping.toCandidate())
    ) {
      return null;
    }
    return new TemplateCompilerWorldConstructionRequest(
      input.localKey,
      input.worldKind,
      parent.container,
      parent.world.appRoot,
      resolution.resources,
      parent.attributePatterns,
      parent.bindingCommands,
      parent.runtimeRenderers,
      input.syntaxVisibilityKind,
      input.sourceAddressHandle,
      parent.callableBindings,
      parent.attributeMapper.configuration,
      parent.world.observerLocatorConfiguration,
      parent.world.runtimeKeyMappingConfiguration,
      resolution.exclusions,
      parent.resourceScope.toReference(),
      resolution.lookups,
      resolution.blockedLookups,
      compilerHooks,
      cssClassMapping,
    );
  }

  private observeDerivationInputs(parent: TemplateCompilerWorldEmission): void {
    this.requireDerivationInput(TemplateProductDetails.World, parent.world.productHandle);
    this.requireDerivationInput(TemplateProductDetails.CompilerHookSet, parent.compilerHooks.productHandle);
    this.requireDerivationInput(TemplateProductDetails.CssClassMapping, parent.cssClassMapping.productHandle);
    this.requireDerivationInput(TemplateProductDetails.ResourceScope, parent.resourceScope.productHandle);
    this.requireDerivationInput(TemplateProductDetails.AttributeParserService, parent.attributeParser.productHandle);
    this.requireDerivationInput(TemplateProductDetails.AttributeParserMachine, parent.attributeParserMachine.productHandle);
    this.requireDerivationInput(TemplateProductDetails.BindingCommandResolver, parent.bindingCommandResolver.productHandle);
    this.requireDerivationInput(TemplateProductDetails.AttributeMapperService, parent.attributeMapper.productHandle);
    this.requireDerivationInput(TemplateProductDetails.RenderingService, parent.rendering.productHandle);
  }

  private requireDerivationInput<TDetail>(
    slot: ProductDetailSlot<TDetail>,
    productHandle: ProductHandle,
  ): void {
    if (this.store.readProductDetail(slot, productHandle) == null) {
      throw new Error(`Derived compiler world input ${slot.detailKind} is unavailable for ${productHandle}.`);
    }
  }

  private publicationFor(
    localKey: string,
    emission: TemplateCompilerWorldEmission,
  ): KernelPublicationPlan {
    return new KernelPublicationPlan(
      new KernelStoreBatch(emission.records, `template-compiler-world:${localKey}`),
      [
        publishProductDetail(TemplateProductDetails.World, emission.world.productHandle, emission.world),
        publishProductDetail(
          TemplateProductDetails.ResourceScope,
          emission.resourceScope.productHandle,
          emission.resourceScope,
        ),
        publishProductDetail(
          TemplateProductDetails.TemplateCompilerService,
          emission.templateCompiler.productHandle,
          emission.templateCompiler,
        ),
        publishProductDetail(
          TemplateProductDetails.CompilerHookSet,
          emission.compilerHooks.productHandle,
          emission.compilerHooks,
        ),
        publishProductDetail(
          TemplateProductDetails.CssClassMapping,
          emission.cssClassMapping.productHandle,
          emission.cssClassMapping,
        ),
        publishProductDetail(
          TemplateProductDetails.ResourceResolverService,
          emission.resourceResolver.productHandle,
          emission.resourceResolver,
        ),
        publishProductDetail(
          TemplateProductDetails.ExpressionParserService,
          emission.expressionParser.productHandle,
          emission.expressionParser,
        ),
        publishProductDetail(
          TemplateProductDetails.AttributeMapperService,
          emission.attributeMapper.productHandle,
          emission.attributeMapper,
        ),
        publishProductDetail(
          TemplateProductDetails.RenderingService,
          emission.rendering.productHandle,
          emission.rendering,
        ),
        publishProductDetail(
          TemplateProductDetails.AttributeParserService,
          emission.attributeParser.productHandle,
          emission.attributeParser,
        ),
        publishProductDetail(
          TemplateProductDetails.AttributeParserMachine,
          emission.attributeParserMachine.productHandle,
          emission.attributeParserMachine,
        ),
        publishProductDetail(
          TemplateProductDetails.BindingCommandResolver,
          emission.bindingCommandResolver.productHandle,
          emission.bindingCommandResolver,
        ),
        ...emission.issues.map((issue) =>
          publishProductDetail(TemplateProductDetails.CompilerIssue, issue.productHandle, issue)
        ),
      ],
    );
  }

  private recordsForWorld(input: TemplateCompilerWorldConstructionRequest): TemplateCompilerWorldEmission {
    const records: KernelStoreRecord[] = [];
    const local = input.localKey;
    const source = this.recordsForSource(local, input.sourceAddressHandle ?? input.container.sourceAddressHandle);
    records.push(...source.records);

    const handles = this.handlesForWorld(local);
    const products = this.productsForWorld(input, handles, source);
    records.push(...products.hookRecords, ...products.cssClassMappingRecords);

    const claims = this.recordsForClaims(
      local,
      products.world,
      products.resourceScope,
      products.serviceReferences,
      input.resources,
      products.syntaxResources,
      products.attributeParser,
      products.attributeParserMachine,
      products.rendering,
      source.provenanceHandle,
    );
    records.push(...claims.allClaims);
    records.push(
      ...this.identityRecordsForWorld(input, handles, source),
      ...this.materializedProductRecordsForWorld(handles, source),
      this.materializationRecordForWorld(
        local,
        handles,
        claims,
        products.compilerHooks,
        products.cssClassMapping,
      ),
    );

    return products.toEmission(input, records);
  }

  private handlesForWorld(local: string): CompilerWorldHandleSet {
    return new CompilerWorldHandleSet(
      this.store.handles.product(`template-world:${local}`),
      this.store.handles.identity(`template-world:${local}`),
      this.store.handles.product(`template-resource-scope:${local}`),
      this.store.handles.identity(`template-resource-scope:${local}`),
      this.store.handles.product(`attribute-parser-machine:${local}`),
      this.store.handles.identity(`attribute-parser-machine:${local}`),
      this.store.handles.product(`attribute-parser:${local}`),
      this.store.handles.identity(`attribute-parser:${local}`),
      this.store.handles.product(`binding-command-resolver:${local}`),
      this.store.handles.identity(`binding-command-resolver:${local}`),
      this.store.handles.product(`template-compiler-service:${local}`),
      this.store.handles.identity(`template-compiler-service:${local}`),
      this.store.handles.product(`compiler-hook-set:${local}`),
      this.store.handles.identity(`compiler-hook-set:${local}`),
      this.store.handles.product(`css-class-mapping:${local}`),
      this.store.handles.identity(`css-class-mapping:${local}`),
      this.store.handles.product(`resource-resolver-service:${local}`),
      this.store.handles.identity(`resource-resolver-service:${local}`),
      this.store.handles.product(`expression-parser-service:${local}`),
      this.store.handles.identity(`expression-parser-service:${local}`),
      this.store.handles.product(`attribute-mapper-service:${local}`),
      this.store.handles.identity(`attribute-mapper-service:${local}`),
      this.store.handles.product(`rendering-service:${local}`),
      this.store.handles.identity(`rendering-service:${local}`),
    );
  }

  private productsForWorld(
    input: TemplateCompilerWorldConstructionRequest,
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
  ): CompilerWorldProducts {
    const syntaxResources = syntaxResourcesForInput(input);
    const resourceScope = this.resourceScopeForWorld(input, handles, source, syntaxResources);
    const issues = new CompilerWorldIssueSet(this.store, input.localKey, source.provenanceHandle);
    const attributeParserProducts = this.attributeParserProductsForWorld(
      input,
      handles,
      source,
      issues,
    );
    const attributeParser = attributeParserProducts.service;
    const attributeParserMachine = attributeParserProducts.machine;
    const bindingCommandResolver = this.bindingCommandResolverForWorld(input, handles, source, issues);
    const templateCompiler = this.templateCompilerServiceForWorld(input, handles, source);
    const cssClassMappingProducts = this.cssClassMappingForWorld(input, handles, source);
    const cssClassMapping = cssClassMappingProducts.authority;
    const compilerHookProducts = this.compilerHookSetForWorld(
      input,
      handles,
      source,
      cssClassMapping,
    );
    const compilerHooks = compilerHookProducts.hookSet;
    const resourceResolver = this.resourceResolverForWorld(input, handles, source);
    const expressionParser = this.expressionParserForWorld(input, handles, source);
    const attributeMapper = this.attributeMapperForWorld(input, handles, source);
    const rendering = this.renderingServiceForWorld(input, handles, source);
    const services = [
      templateCompiler.toReference(),
      compilerHooks.toReference(),
      cssClassMapping.toReference(),
      resourceResolver.toReference(),
      attributeParser.toReference(),
      bindingCommandResolver.toReference(),
      expressionParser.toReference(),
      attributeMapper.toReference(),
      rendering.toReference(),
    ];
    const world = this.compilerWorldForProducts(
      input,
      handles,
      source,
      resourceScope,
      services,
    );

    return new CompilerWorldProducts(
      world,
      resourceScope,
      templateCompiler,
      compilerHooks,
      cssClassMapping,
      resourceResolver,
      expressionParser,
      attributeMapper,
      rendering,
      attributeParser,
      attributeParserMachine,
      bindingCommandResolver,
      syntaxResources,
      services,
      compilerHookProducts.records,
      cssClassMappingProducts.records,
      issues.issues,
      issues.records,
    );
  }

  private resourceScopeForWorld(
    input: TemplateCompilerWorldConstructionRequest,
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
    syntaxResources: readonly TemplateVisibleResource[],
  ): TemplateResourceScope {
    return new TemplateResourceScope(
      handles.scopeProductHandle,
      handles.scopeIdentityHandle,
      input.container.toReference(),
      input.resources,
      syntaxResources,
      source.addressHandle,
      [],
      input.resourceExclusions,
      input.parentResourceScope,
      input.resourceLookups,
      input.blockedResourceLookups,
    );
  }

  private attributeParserProductsForWorld(
    input: TemplateCompilerWorldConstructionRequest,
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
    issues: CompilerWorldIssueSet,
  ): CompilerWorldAttributeParserProducts {
    const registeredPatterns = new Map<string, RegisteredAttributePattern>();
    const patternExecutables: AttributePatternExecutable[] = [];
    const compiledPatterns: CompiledAttributePattern[] = [];
    input.attributePatterns.forEach((pattern, index) => {
      const duplicate = firstDuplicateAttributePattern(pattern, registeredPatterns);
      if (duplicate != null) {
        const occupiedSourceAddressHandle = registeredAttributePatternSource(duplicate.occupied);
        issues.publish(
          `attribute-pattern-duplicate:${index}`,
          handles.attributeParserIdentityHandle,
          TemplateCompilerIssuePhase.CompilerWorld,
          TemplateCompilerIssueKind.AttributePatternDuplicate,
          `AttributeParser.registerPattern cannot register duplicate attribute pattern "${duplicate.incoming.pattern}".`,
          TemplateCompilerFrameworkErrorCode.AttributePatternDuplicate,
          pattern.registrationSourceAddressHandle
            ?? duplicate.incoming.addressHandle
            ?? pattern.executable.sourceAddressHandle,
          'error',
          occupiedSourceAddressHandle == null
            ? []
            : [new TemplateCompilerIssueRelatedInformation(
              `Attribute pattern "${duplicate.incoming.pattern}" was first registered here.`,
              occupiedSourceAddressHandle,
            )],
        );
        return;
      }
      for (const entry of pattern.executable.patterns) {
        registeredPatterns.set(entry.pattern, new RegisteredAttributePattern(
          entry,
          pattern.registrationSourceAddressHandle,
          pattern.executable.sourceAddressHandle,
        ));
      }
      if (!patternExecutables.some((candidate) => candidate.productHandle === pattern.executable.productHandle)) {
        patternExecutables.push(pattern.executable);
      }
      compiledPatterns.push(...pattern.compiledPatterns);
    });
    const machine = new AttributeParserMachine(
      handles.machineProductHandle,
      handles.machineIdentityHandle,
      compiledPatterns,
      source.addressHandle,
      [],
    );
    return new CompilerWorldAttributeParserProducts(
      machine,
      new AttributeParserService(
        handles.attributeParserProductHandle,
        handles.attributeParserIdentityHandle,
        patternExecutables,
        machine,
        source.addressHandle,
        [],
      ),
    );
  }

  private bindingCommandResolverForWorld(
    input: TemplateCompilerWorldConstructionRequest,
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
    issues: CompilerWorldIssueSet,
  ): BindingCommandResolverService {
    const commands = bindingCommandsWithRegistrationIssues(
      input.bindingCommands,
      handles.bindingResolverIdentityHandle,
      issues,
    );
    return new BindingCommandResolverService(
      handles.bindingResolverProductHandle,
      handles.bindingResolverIdentityHandle,
      commands,
      source.addressHandle,
      [],
    );
  }

  private templateCompilerServiceForWorld(
    input: TemplateCompilerWorldConstructionRequest,
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
  ): TemplateCompilerService {
    return new TemplateCompilerService(
      handles.templateCompilerProductHandle,
      handles.templateCompilerIdentityHandle,
      input.container.toReference(),
      source.addressHandle,
      [],
    );
  }

  private cssClassMappingForWorld(
    input: TemplateCompilerWorldConstructionRequest,
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
  ): CompilerWorldCssClassMappingProducts {
    const records: KernelStoreRecord[] = [];
    const openReasons = input.cssClassMapping.openReasons.map((reason, index) => {
      if (reason.openSeamHandles.length > 0) return reason;
      const open = this.cssClassMappingOpenSeam(
        input.localKey,
        index,
        reason.summary,
        reason.sourceAddressHandle ?? source.addressHandle,
      );
      records.push(...open.records);
      return new CssClassMappingOpenReason(
        reason.reasonKind,
        reason.summary,
        reason.sourceOrdinal,
        reason.mappingArgumentOrdinal,
        reason.sourceModuleKey,
        reason.sourceAddressHandle,
        [open.handle],
      );
    });
    return new CompilerWorldCssClassMappingProducts(
      new CssClassMappingAuthority(
        handles.cssClassMappingProductHandle,
        handles.cssClassMappingIdentityHandle,
        input.cssClassMapping.properties,
        input.cssClassMapping.defaultPropertyState,
        openReasons,
        source.addressHandle,
      ),
      records,
    );
  }

  private compilerHookSetForWorld(
    input: TemplateCompilerWorldConstructionRequest,
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
    cssClassMapping: CssClassMappingAuthority,
  ): CompilerWorldHookProducts {
    const records: KernelStoreRecord[] = [];
    const entries = input.compilerHooks.entries.map((entry, index) => {
      let provider = entry.provider;
      if (
        provider.resolutionKind === TemplateCompilerHookProviderResolutionKind.Open
        && provider.openSeamHandles.length === 0
      ) {
        const open = this.compilerHookOpenSeam(
          input.localKey,
          `entry:${index}:provider`,
          provider.reason ?? 'Compiler-hook provider-array resolution remains open.',
          entry.cause.sourceAddressHandle ?? source.addressHandle,
          OpenSeamReasonKind.CompilerHookExecutionOpen,
        );
        records.push(...open.records);
        provider = new TemplateCompilerHookProviderAuthority(
          provider.resolutionKind,
          provider.reason,
          [open.handle],
        );
      }
      let callable = entry.callable;
      if (
        callable.authorityKind === TemplateCompilerHookCallableAuthorityKind.Open
        && callable.openSeamHandles.length === 0
      ) {
        const open = this.compilerHookOpenSeam(
          input.localKey,
          `entry:${index}:callable`,
          callable.reason ?? 'Compiler-hook callable execution remains open.',
          callable.sourceAddressHandle ?? entry.cause.sourceAddressHandle ?? source.addressHandle,
          OpenSeamReasonKind.CompilerHookExecutionOpen,
        );
        records.push(...open.records);
        callable = new TemplateCompilerHookCallableAuthority(
          callable.authorityKind,
          callable.identityHandle,
          callable.sourceAddressHandle,
          callable.callableSlotKey,
          callable.reason,
          [open.handle],
        );
      }
      const cssClassMappingReference = entry.hookKind === TemplateCompilerHookKind.CssModules
        && entry.lane === TemplateCompilerHookLane.Leaf
        ? cssClassMapping.toReference()
        : entry.cssClassMapping;
      if (
        provider === entry.provider
        && callable === entry.callable
        && cssClassMappingReference === entry.cssClassMapping
      ) return entry;
      return new TemplateCompilerHookEntry(
        entry.lane,
        entry.laneOrdinal,
        entry.sourceOrdinal,
        entry.hookKind,
        entry.cause,
        provider,
        callable,
        cssClassMappingReference,
      );
    });
    const openReasons = input.compilerHooks.openReasons.map((reason, index) => {
      if (reason.openSeamHandles.length > 0) return reason;
      const open = this.compilerHookOpenSeam(
        input.localKey,
        `membership:${index}`,
        reason.summary,
        reason.sourceAddressHandle ?? source.addressHandle,
        OpenSeamReasonKind.CompilerHookMembershipOpen,
      );
      records.push(...open.records);
      return new TemplateCompilerHookOpenReason(
        reason.reasonKind,
        reason.lane,
        reason.summary,
        reason.sourceAddressHandle,
        [open.handle],
      );
    });
    return new CompilerWorldHookProducts(
      new TemplateCompilerHookSet(
        handles.compilerHooksProductHandle,
        handles.compilerHooksIdentityHandle,
        input.compilerHooks.membershipState,
        entries,
        openReasons,
        source.addressHandle,
      ),
      records,
    );
  }

  private cssClassMappingOpenSeam(
    worldLocalKey: string,
    index: number,
    summary: string,
    addressHandle: AddressHandle | null,
  ): { readonly records: readonly KernelStoreRecord[]; readonly handle: OpenSeamHandle } {
    const key = `css-class-mapping:${worldLocalKey}:open:${index}`;
    const evidenceHandle = this.store.handles.evidence(key);
    const handle = this.store.handles.openSeam(key);
    return {
      handle,
      records: [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.Scope, EvidenceRole.Diagnostic],
          summary,
          addressHandle,
        ),
        new OpenSeam(
          handle,
          KernelVocabulary.Compiler.OpenCssClassMapping.key,
          summary,
          addressHandle,
          evidenceHandle,
          [OpenSeamReasonKind.CompilerCssClassMappingOpen],
        ),
      ],
    };
  }

  private compilerHookOpenSeam(
    worldLocalKey: string,
    local: string,
    summary: string,
    addressHandle: AddressHandle | null,
    reasonKind: OpenSeamReasonKind,
  ): { readonly records: readonly KernelStoreRecord[]; readonly handle: OpenSeamHandle } {
    const key = `compiler-hook-set:${worldLocalKey}:${local}`;
    const evidenceHandle = this.store.handles.evidence(key);
    const handle = this.store.handles.openSeam(key);
    return {
      handle,
      records: [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.Scope, EvidenceRole.Diagnostic],
          summary,
          addressHandle,
        ),
        new OpenSeam(
          handle,
          KernelVocabulary.Compiler.OpenCompilerHooks.key,
          summary,
          addressHandle,
          evidenceHandle,
          [reasonKind],
        ),
      ],
    };
  }

  private resourceResolverForWorld(
    input: TemplateCompilerWorldConstructionRequest,
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
  ): TemplateResourceResolverService {
    return new TemplateResourceResolverService(
      handles.resourceResolverProductHandle,
      handles.resourceResolverIdentityHandle,
      input.container.toReference(),
      input.resources,
      input.resourceLookups,
      input.blockedResourceLookups,
      source.addressHandle,
      [],
    );
  }

  private expressionParserForWorld(
    input: TemplateCompilerWorldConstructionRequest,
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
  ): TemplateExpressionParserService {
    return new TemplateExpressionParserService(
      handles.expressionParserProductHandle,
      handles.expressionParserIdentityHandle,
      input.container.toReference(),
      source.addressHandle,
      [],
    );
  }

  private attributeMapperForWorld(
    input: TemplateCompilerWorldConstructionRequest,
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
  ): TemplateAttributeMapperService {
    return new TemplateAttributeMapperService(
      handles.attributeMapperProductHandle,
      handles.attributeMapperIdentityHandle,
      input.container.toReference(),
      source.addressHandle,
      input.attributeMapperConfiguration,
      [],
    );
  }

  private renderingServiceForWorld(
    input: TemplateCompilerWorldConstructionRequest,
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
  ): TemplateRenderingService {
    return new TemplateRenderingService(
      handles.renderingProductHandle,
      handles.renderingIdentityHandle,
      input.container.toReference(),
      input.runtimeRenderers.map((renderer) => renderer.renderer),
      source.addressHandle,
      [],
    );
  }

  private compilerWorldForProducts(
    input: TemplateCompilerWorldConstructionRequest,
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
    resourceScope: TemplateResourceScope,
    services: readonly TemplateCompilerServiceReference[],
  ): TemplateCompilerWorld {
    return new TemplateCompilerWorld(
      handles.worldProductHandle,
      handles.worldIdentityHandle,
      input.worldKind,
      input.appRoot,
      input.container.toReference(),
      resourceScope.productHandle,
      input.observerLocatorConfiguration,
      input.runtimeKeyMappingConfiguration,
      services,
      source.addressHandle,
      [],
    );
  }

  private identityRecordsForWorld(
    input: TemplateCompilerWorldConstructionRequest,
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
  ): readonly CompilerIdentity[] {
    return [
      identity(handles.worldIdentityHandle, KernelVocabulary.Compiler.World.key, input.container.identityHandle, source),
      identity(handles.scopeIdentityHandle, KernelVocabulary.Compiler.ResourceScope.key, handles.worldIdentityHandle, source),
      identity(handles.machineIdentityHandle, KernelVocabulary.Compiler.AttributeParserMachine.key, handles.worldIdentityHandle, source),
      identity(handles.attributeParserIdentityHandle, KernelVocabulary.Compiler.Service.key, handles.worldIdentityHandle, source, 'IAttributeParser'),
      identity(handles.bindingResolverIdentityHandle, KernelVocabulary.Compiler.Service.key, handles.worldIdentityHandle, source, 'IBindingCommandResolver'),
      identity(handles.templateCompilerIdentityHandle, KernelVocabulary.Compiler.Service.key, handles.worldIdentityHandle, source, 'TemplateCompiler'),
      identity(handles.compilerHooksIdentityHandle, KernelVocabulary.Compiler.Service.key, handles.worldIdentityHandle, source, 'ITemplateCompilerHooks'),
      identity(handles.cssClassMappingIdentityHandle, KernelVocabulary.Compiler.Service.key, handles.worldIdentityHandle, source, 'ICssClassMapping'),
      identity(handles.resourceResolverIdentityHandle, KernelVocabulary.Compiler.Service.key, handles.worldIdentityHandle, source, 'IResourceResolver'),
      identity(handles.expressionParserIdentityHandle, KernelVocabulary.Compiler.Service.key, handles.worldIdentityHandle, source, 'IExpressionParser'),
      identity(handles.attributeMapperIdentityHandle, KernelVocabulary.Compiler.Service.key, handles.worldIdentityHandle, source, 'IAttrMapper'),
      identity(handles.renderingIdentityHandle, KernelVocabulary.Compiler.Service.key, handles.worldIdentityHandle, source, 'Rendering'),
    ];
  }

  private materializedProductRecordsForWorld(
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
  ): readonly MaterializedProduct[] {
    const products: readonly (readonly [ProductHandle, ProductKindKey, IdentityHandle])[] = [
      [handles.worldProductHandle, KernelVocabulary.Compiler.World.key, handles.worldIdentityHandle],
      [handles.scopeProductHandle, KernelVocabulary.Compiler.ResourceScope.key, handles.scopeIdentityHandle],
      [handles.machineProductHandle, KernelVocabulary.Compiler.AttributeParserMachine.key, handles.machineIdentityHandle],
      [handles.attributeParserProductHandle, KernelVocabulary.Compiler.AttributeParser.key, handles.attributeParserIdentityHandle],
      [handles.bindingResolverProductHandle, KernelVocabulary.Compiler.BindingCommandResolver.key, handles.bindingResolverIdentityHandle],
      [handles.templateCompilerProductHandle, KernelVocabulary.Compiler.Service.key, handles.templateCompilerIdentityHandle],
      [handles.compilerHooksProductHandle, KernelVocabulary.Compiler.Service.key, handles.compilerHooksIdentityHandle],
      [handles.cssClassMappingProductHandle, KernelVocabulary.Compiler.Service.key, handles.cssClassMappingIdentityHandle],
      [handles.resourceResolverProductHandle, KernelVocabulary.Compiler.Service.key, handles.resourceResolverIdentityHandle],
      [handles.expressionParserProductHandle, KernelVocabulary.Compiler.Service.key, handles.expressionParserIdentityHandle],
      [handles.attributeMapperProductHandle, KernelVocabulary.Compiler.Service.key, handles.attributeMapperIdentityHandle],
      [handles.renderingProductHandle, KernelVocabulary.Compiler.Service.key, handles.renderingIdentityHandle],
    ];
    return products.map(([productHandle, productKindKey, identityHandle]) =>
      new MaterializedProduct(
        productHandle,
        productKindKey,
        identityHandle,
        source.addressHandle,
        source.provenanceHandle,
      )
    );
  }

  private materializationRecordForWorld(
    local: string,
    handles: CompilerWorldHandleSet,
    claims: CompilerWorldClaims,
    compilerHooks: TemplateCompilerHookSet,
    cssClassMapping: CssClassMappingAuthority,
  ): MaterializationRecord {
    return new MaterializationRecord(
      this.store.handles.materialization(`template-world:${local}`),
      handles.worldIdentityHandle,
      handles.materializedProductHandles,
      claims.allClaims.map((claim) => claim.handle),
      [...new Set([
        ...compilerHooks.entries.flatMap((entry) => entry.provider.openSeamHandles),
        ...compilerHooks.entries.flatMap((entry) => entry.callable.openSeamHandles),
        ...compilerHooks.openReasons.flatMap((reason) => reason.openSeamHandles),
        ...cssClassMapping.openReasons.flatMap((reason) => reason.openSeamHandles),
      ])],
    );
  }

  private recordsForSource(local: string, addressHandle: AddressHandle | null): CompilerWorldSourceSet {
    const evidenceHandle = this.store.handles.evidence(`template-world:${local}`);
    const provenanceHandle = this.store.handles.provenance(`template-world:${local}`);
    const records: KernelStoreRecord[] = [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.Scope, EvidenceRole.TransformInput],
        'Template compiler world constructed from selected DI/resource/syntax visibility.',
        addressHandle,
      ),
      new ProvenanceRecord(
        provenanceHandle,
        [evidenceHandle],
      ),
    ];
    return new CompilerWorldSourceSet(records, provenanceHandle, addressHandle);
  }

  private recordsForClaims(
    local: string,
    world: TemplateCompilerWorld,
    scope: TemplateResourceScope,
    services: readonly TemplateCompilerServiceReference[],
    resources: readonly TemplateVisibleResource[],
    syntaxResources: readonly TemplateVisibleResource[],
    attributeParser: AttributeParserService,
    attributeParserMachine: AttributeParserMachine,
    rendering: TemplateRenderingService,
    provenanceHandle: ProvenanceHandle,
  ): CompilerWorldClaims {
    return new CompilerWorldClaims(
      this.worldClaimsForCompilerWorld(local, world, scope, services, provenanceHandle),
      this.scopeClaimsForCompilerWorld(local, scope, resources, syntaxResources, provenanceHandle),
      this.serviceClaimsForCompilerWorld(local, attributeParser, attributeParserMachine, rendering, provenanceHandle),
    );
  }

  private worldClaimsForCompilerWorld(
    local: string,
    world: TemplateCompilerWorld,
    scope: TemplateResourceScope,
    services: readonly TemplateCompilerServiceReference[],
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    const claims: SemanticClaim[] = [
      new SemanticClaim(
        this.store.handles.claim(`template-world:${local}:uses-resource-scope`),
        world.productHandle,
        KernelVocabulary.Compiler.UsesResourceScope.key,
        scope.productHandle,
        provenanceHandle,
      ),
    ];
    services.forEach((service, index) => {
      if (service.productHandle == null) {
        return;
      }
      claims.push(new SemanticClaim(
        this.store.handles.claim(`template-world:${local}:uses-service:${index}`),
        world.productHandle,
        KernelVocabulary.Compiler.UsesService.key,
        service.productHandle,
        provenanceHandle,
      ));
    });
    return claims;
  }

  private scopeClaimsForCompilerWorld(
    local: string,
    scope: TemplateResourceScope,
    resources: readonly TemplateVisibleResource[],
    syntaxResources: readonly TemplateVisibleResource[],
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    const claims: SemanticClaim[] = [];
    resources.forEach((resource, index) => {
      for (const [productIndex, productHandle] of productHandlesForVisibleResource(resource).entries()) {
        claims.push(new SemanticClaim(
          this.store.handles.claim(`template-resource-scope:${local}:provides-resource:${index}:${productIndex}`),
          scope.productHandle,
          KernelVocabulary.Compiler.ProvidesResource.key,
          productHandle,
          provenanceHandle,
        ));
      }
    });
    syntaxResources.forEach((resource, index) => {
      if (resource.resourceProductHandle == null) {
        return;
      }
      claims.push(new SemanticClaim(
        this.store.handles.claim(`template-resource-scope:${local}:provides-syntax-resource:${index}`),
        scope.productHandle,
        KernelVocabulary.Compiler.ProvidesSyntaxResource.key,
        resource.resourceProductHandle,
        provenanceHandle,
      ));
    });
    return claims;
  }

  private serviceClaimsForCompilerWorld(
    local: string,
    attributeParser: AttributeParserService,
    attributeParserMachine: AttributeParserMachine,
    rendering: TemplateRenderingService,
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    return [
      this.attributeParserUsesMachineClaim(local, attributeParser, attributeParserMachine, provenanceHandle),
      ...this.attributeParserMachinePatternClaims(local, attributeParserMachine, provenanceHandle),
      ...this.renderingRendererClaims(local, rendering, provenanceHandle),
    ];
  }

  private attributeParserUsesMachineClaim(
    local: string,
    attributeParser: AttributeParserService,
    attributeParserMachine: AttributeParserMachine,
    provenanceHandle: ProvenanceHandle,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`attribute-parser:${local}:uses-machine`),
      attributeParser.productHandle,
      KernelVocabulary.Compiler.UsesAttributeParserMachine.key,
      attributeParserMachine.productHandle,
      provenanceHandle,
    );
  }

  private attributeParserMachinePatternClaims(
    local: string,
    attributeParserMachine: AttributeParserMachine,
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    return attributeParserMachine.compiledPatternProductHandles.map((productHandle, index) => new SemanticClaim(
      this.store.handles.claim(`attribute-parser-machine:${local}:uses-compiled-pattern:${index}`),
      attributeParserMachine.productHandle,
      KernelVocabulary.Compiler.UsesCompiledAttributePattern.key,
      productHandle,
      provenanceHandle,
    ));
  }

  private renderingRendererClaims(
    local: string,
    rendering: TemplateRenderingService,
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    return rendering.renderers.flatMap((renderer, index) => renderer.productHandle == null
      ? []
      : [new SemanticClaim(
        this.store.handles.claim(`rendering:${local}:uses-runtime-renderer:${index}`),
        rendering.productHandle,
        KernelVocabulary.Compiler.RenderingServiceUsesRenderer.key,
        renderer.productHandle,
        provenanceHandle,
      )]);
  }
}

class RegisteredAttributePattern {
  constructor(
    readonly entry: AttributePatternDefinitionEntry,
    readonly registrationSourceAddressHandle: AddressHandle | null,
    readonly executableSourceAddressHandle: AddressHandle | null,
  ) {}
}

class DuplicateAttributePattern {
  constructor(
    readonly incoming: AttributePatternDefinitionEntry,
    readonly occupied: RegisteredAttributePattern,
  ) {}
}

function firstDuplicateAttributePattern(
  resource: CompilerAttributePatternResource,
  registeredPatterns: ReadonlyMap<string, RegisteredAttributePattern>,
): DuplicateAttributePattern | null {
  const localPatterns = new Map<string, RegisteredAttributePattern>();
  for (const entry of resource.executable.patterns) {
    const occupied = registeredPatterns.get(entry.pattern) ?? localPatterns.get(entry.pattern) ?? null;
    if (occupied != null) {
      return new DuplicateAttributePattern(entry, occupied);
    }
    localPatterns.set(entry.pattern, new RegisteredAttributePattern(
      entry,
      resource.registrationSourceAddressHandle,
      resource.executable.sourceAddressHandle,
    ));
  }
  return null;
}

function registeredAttributePatternSource(
  pattern: RegisteredAttributePattern,
): AddressHandle | null {
  return pattern.registrationSourceAddressHandle
    ?? pattern.entry.addressHandle
    ?? pattern.executableSourceAddressHandle;
}

function bindingCommandsWithRegistrationIssues(
  emissions: readonly CompilerBindingCommandResource[],
  ownerIdentityHandle: IdentityHandle,
  issues: CompilerWorldIssueSet,
): readonly BindingCommandExecutable[] {
  const registeredKeys = new Set<string>();
  const commands: BindingCommandExecutable[] = [];
  emissions.forEach((emission, index) => {
    const command = emission.executable;
    if (registeredKeys.has(command.key)) {
      issues.publish(
        `binding-command-existed:${index}`,
        ownerIdentityHandle,
        TemplateCompilerIssuePhase.CompilerWorld,
        TemplateCompilerIssueKind.BindingCommandAlreadyRegistered,
        `BindingCommandDefinition.register found an existing command key for "${command.name}".`,
        TemplateCompilerFrameworkErrorCode.BindingCommandExisted,
        command.sourceAddressHandle,
        'warning',
      );
      return;
    }
    registeredKeys.add(command.key);
    for (const alias of command.aliases) {
      registeredKeys.add(bindingCommandKeyFor(command, alias));
    }
    commands.push(command);
  });
  return commands;
}

function bindingCommandKeyFor(
  command: BindingCommandExecutable,
  name: string,
): string {
  return command.key.endsWith(command.name)
    ? `${command.key.slice(0, command.key.length - command.name.length)}${name}`
    : `au:resource:binding-command:${name}`;
}

function syntaxResourcesForInput(
  input: TemplateCompilerWorldConstructionRequest,
): readonly TemplateVisibleResource[] {
  const definitionProducts = new Set(input.resources.flatMap((resource) =>
    resource.definitionProductHandle == null ? [] : [resource.definitionProductHandle]
  ));
  return [
    ...input.attributePatterns.map((pattern) =>
      visibleAttributePattern(pattern, input.syntaxVisibilityKind)
    ),
    ...input.bindingCommands.flatMap((command) =>
      command.executable.definitionProductHandle != null
        && definitionProducts.has(command.executable.definitionProductHandle)
        ? []
        : [visibleBindingCommand(command, input.syntaxVisibilityKind)]
    ),
  ];
}

function visibleAttributePattern(
  emission: CompilerAttributePatternResource,
  visibilityKind: TemplateResourceVisibilityKind,
): TemplateVisibleResource {
  return new TemplateVisibleResource(
    ResourceDefinitionKind.AttributePattern,
    emission.definition?.target.localName
      ?? emission.executable.target?.localName
      ?? 'attribute-pattern',
    [],
    emission.executable.productHandle,
    emission.executable.identityHandle,
    emission.executable.definitionProductHandle,
    visibilityKind,
    emission.registrationSourceAddressHandle ?? emission.executable.sourceAddressHandle,
  );
}

function visibleBindingCommand(
  emission: CompilerBindingCommandResource,
  visibilityKind: TemplateResourceVisibilityKind,
): TemplateVisibleResource {
  return new TemplateVisibleResource(
    ResourceDefinitionKind.BindingCommand,
    emission.executable.name,
    emission.executable.aliases,
    emission.executable.productHandle,
    emission.executable.identityHandle,
    emission.executable.definitionProductHandle,
    visibilityKind,
    emission.registrationSourceAddressHandle ?? emission.executable.sourceAddressHandle,
  );
}

function productHandlesForVisibleResource(
  resource: TemplateVisibleResource,
): readonly ProductHandle[] {
  return [
    resource.resourceProductHandle,
    resource.definitionProductHandle,
  ].filter((productHandle, productIndex): productHandle is ProductHandle =>
    productHandle != null && (productIndex === 0 || productHandle !== resource.resourceProductHandle)
  );
}

function identity(
  handle: IdentityHandle,
  productKindKey: ProductKindKey,
  ownerHandle: IdentityHandle | null,
  source: CompilerWorldSourceSet,
  localName: string | null = null,
): CompilerIdentity {
  return new CompilerIdentity(
    handle,
    productKindKey,
    ownerHandle,
    source.addressHandle,
    localName,
  );
}
