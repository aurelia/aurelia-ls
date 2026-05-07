import { AttributeParserMachine, AttributeParserService } from './attribute-syntax.js';
import { BindingCommandResolverService } from './binding-command-execution.js';
import {
  TemplateCompilerService,
  TemplateCompilerWorld,
  TemplateCompilerWorldKind,
  TemplateAttributeMapperService,
  TemplateExpressionParserService,
  TemplateRenderingService,
  TemplateResourceResolverService,
  TemplateResourceScope,
} from './compiler-world.js';
import {
  type TemplateCompilerServiceReference,
  TemplateResourceVisibilityKind,
  TemplateVisibleResource,
} from './compiler-world-reference.js';
import type {
  BuiltInAttributePatternEmission,
  BuiltInBindingCommandEmission,
} from './built-in-syntax-catalog-materializer.js';
import type { BuiltInRuntimeRendererEmission } from './runtime-renderer-catalog-materializer.js';
import type { AppRoot } from '../configuration/app-root.js';
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
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type ProductKindKey,
} from '../kernel/vocabulary.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import { TemplateProductDetails } from './product-details.js';

export class TemplateCompilerWorldConstructionRequest {
  constructor(
    /** Store-local key for the compiler world being materialized. */
    readonly localKey: string,
    /** World lane being constructed. */
    readonly worldKind: TemplateCompilerWorldKind,
    /** Container whose DI/resource state feeds this compiler world. */
    readonly container: Container,
    /** AppRoot that owns this compiler world, if known. */
    readonly appRoot: AppRoot | null,
    /** Non-syntax resources already selected as visible to this compiler world. */
    readonly resources: readonly TemplateVisibleResource[],
    /** Attribute-pattern executables selected as visible to this compiler world. */
    readonly attributePatterns: readonly BuiltInAttributePatternEmission[],
    /** Binding-command executables selected as visible to this compiler world. */
    readonly bindingCommands: readonly BuiltInBindingCommandEmission[],
    /** Runtime renderers selected as visible to Rendering in this compiler world. */
    readonly runtimeRenderers: readonly BuiltInRuntimeRendererEmission[],
    /** How the selected syntax executables became visible to this compiler world. */
    readonly syntaxVisibilityKind: TemplateResourceVisibilityKind,
    /** Address of the app/root/component boundary that owns this world. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

export class TemplateCompilerWorldEmission {
  constructor(
    readonly container: Container,
    readonly world: TemplateCompilerWorld,
    readonly resourceScope: TemplateResourceScope,
    readonly templateCompiler: TemplateCompilerService,
    readonly resourceResolver: TemplateResourceResolverService,
    readonly expressionParser: TemplateExpressionParserService,
    readonly attributeMapper: TemplateAttributeMapperService,
    readonly rendering: TemplateRenderingService,
    readonly attributeParser: AttributeParserService,
    readonly attributeParserMachine: AttributeParserMachine,
    readonly bindingCommandResolver: BindingCommandResolverService,
    readonly attributePatterns: readonly BuiltInAttributePatternEmission[],
    readonly bindingCommands: readonly BuiltInBindingCommandEmission[],
    readonly runtimeRenderers: readonly BuiltInRuntimeRendererEmission[],
    readonly syntaxResources: readonly TemplateVisibleResource[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
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
    readonly resourceResolver: TemplateResourceResolverService,
    readonly expressionParser: TemplateExpressionParserService,
    readonly attributeMapper: TemplateAttributeMapperService,
    readonly rendering: TemplateRenderingService,
    readonly attributeParser: AttributeParserService,
    readonly attributeParserMachine: AttributeParserMachine,
    readonly bindingCommandResolver: BindingCommandResolverService,
    readonly syntaxResources: readonly TemplateVisibleResource[],
    readonly serviceReferences: readonly TemplateCompilerServiceReference[],
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
      this.syntaxResources,
      records,
    );
  }
}

/** Materializes the compiler-facing world once visibility has already been selected. */
export class TemplateCompilerWorldMaterializer {
  constructor(
    /** Hot analysis store that receives compiler-world records. */
    readonly store: KernelStore,
  ) {}

  construct(input: TemplateCompilerWorldConstructionRequest): TemplateCompilerWorldEmission {
    const emission = this.recordsForWorld(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `template-compiler-world:${input.localKey}`));
    }
    this.registerProductDetails(emission);
    return emission;
  }

  private registerProductDetails(emission: TemplateCompilerWorldEmission): void {
    this.store.productDetails.add(TemplateProductDetails.World, emission.world.productHandle, emission.world);
    this.store.productDetails.add(TemplateProductDetails.ResourceScope, emission.resourceScope.productHandle, emission.resourceScope);
    this.registerCompilerServiceProductDetails(emission);
    this.registerAttributeParserProductDetails(emission);
  }

  private registerCompilerServiceProductDetails(emission: TemplateCompilerWorldEmission): void {
    this.store.productDetails.add(
      TemplateProductDetails.TemplateCompilerService,
      emission.templateCompiler.productHandle,
      emission.templateCompiler,
    );
    this.store.productDetails.add(
      TemplateProductDetails.ResourceResolverService,
      emission.resourceResolver.productHandle,
      emission.resourceResolver,
    );
    this.store.productDetails.add(
      TemplateProductDetails.ExpressionParserService,
      emission.expressionParser.productHandle,
      emission.expressionParser,
    );
    this.store.productDetails.add(
      TemplateProductDetails.AttributeMapperService,
      emission.attributeMapper.productHandle,
      emission.attributeMapper,
    );
    this.store.productDetails.add(
      TemplateProductDetails.RenderingService,
      emission.rendering.productHandle,
      emission.rendering,
    );
  }

  private registerAttributeParserProductDetails(emission: TemplateCompilerWorldEmission): void {
    this.store.productDetails.add(
      TemplateProductDetails.AttributeParserService,
      emission.attributeParser.productHandle,
      emission.attributeParser,
    );
    this.store.productDetails.add(
      TemplateProductDetails.AttributeParserMachine,
      emission.attributeParserMachine.productHandle,
      emission.attributeParserMachine,
    );
    this.store.productDetails.add(
      TemplateProductDetails.BindingCommandResolver,
      emission.bindingCommandResolver.productHandle,
      emission.bindingCommandResolver,
    );
  }

  private recordsForWorld(input: TemplateCompilerWorldConstructionRequest): TemplateCompilerWorldEmission {
    const records: KernelStoreRecord[] = [];
    const local = input.localKey;
    const source = this.recordsForSource(local, input.sourceAddressHandle ?? input.container.sourceAddressHandle);
    records.push(...source.records);

    const handles = this.handlesForWorld(local);
    const products = this.productsForWorld(input, handles, source);

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
      this.materializationRecordForWorld(local, handles, claims),
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
    const attributeParserMachine = this.attributeParserMachineForWorld(handles, source);
    const attributeParser = this.attributeParserForWorld(
      input,
      handles,
      source,
      attributeParserMachine,
    );
    const bindingCommandResolver = this.bindingCommandResolverForWorld(input, handles, source);
    const templateCompiler = this.templateCompilerServiceForWorld(input, handles, source);
    const resourceResolver = this.resourceResolverForWorld(input, handles, source);
    const expressionParser = this.expressionParserForWorld(input, handles, source);
    const attributeMapper = this.attributeMapperForWorld(input, handles, source);
    const rendering = this.renderingServiceForWorld(input, handles, source);
    const services = [
      templateCompiler.toReference(),
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
      resourceResolver,
      expressionParser,
      attributeMapper,
      rendering,
      attributeParser,
      attributeParserMachine,
      bindingCommandResolver,
      syntaxResources,
      services,
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
      compactFieldProvenance([
        new FieldProvenance('container', source.provenanceHandle),
        input.resources.length === 0 ? null : new FieldProvenance('resources', source.provenanceHandle),
        syntaxResources.length === 0 ? null : new FieldProvenance('syntaxResources', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private attributeParserMachineForWorld(
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
  ): AttributeParserMachine {
    return new AttributeParserMachine(
      handles.machineProductHandle,
      handles.machineIdentityHandle,
      [],
      [],
      source.addressHandle,
      compactFieldProvenance([
        new FieldProvenance('compiledPatterns', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private attributeParserForWorld(
    input: TemplateCompilerWorldConstructionRequest,
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
    attributeParserMachine: AttributeParserMachine,
  ): AttributeParserService {
    const attributeParser = new AttributeParserService(
      handles.attributeParserProductHandle,
      handles.attributeParserIdentityHandle,
      [],
      attributeParserMachine,
      source.addressHandle,
      compactFieldProvenance([
        new FieldProvenance('patterns', source.provenanceHandle),
        new FieldProvenance('machine', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    for (const pattern of input.attributePatterns) {
      attributeParser.registerPattern(pattern.executable, pattern.compiledPatterns);
    }
    return attributeParser;
  }

  private bindingCommandResolverForWorld(
    input: TemplateCompilerWorldConstructionRequest,
    handles: CompilerWorldHandleSet,
    source: CompilerWorldSourceSet,
  ): BindingCommandResolverService {
    return new BindingCommandResolverService(
      handles.bindingResolverProductHandle,
      handles.bindingResolverIdentityHandle,
      input.bindingCommands.map((command) => command.executable),
      source.addressHandle,
      compactFieldProvenance([
        new FieldProvenance('commands', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
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
      compactFieldProvenance([
        new FieldProvenance('serviceKind', source.provenanceHandle),
        new FieldProvenance('container', source.provenanceHandle),
        new FieldProvenance('debug', source.provenanceHandle),
        new FieldProvenance('resolveResources', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
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
      source.addressHandle,
      compactFieldProvenance([
        new FieldProvenance('serviceKind', source.provenanceHandle),
        new FieldProvenance('container', source.provenanceHandle),
        input.resources.length === 0 ? null : new FieldProvenance('resources', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
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
      compactFieldProvenance([
        new FieldProvenance('serviceKind', source.provenanceHandle),
        new FieldProvenance('container', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
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
      compactFieldProvenance([
        new FieldProvenance('serviceKind', source.provenanceHandle),
        new FieldProvenance('container', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
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
      compactFieldProvenance([
        new FieldProvenance('serviceKind', source.provenanceHandle),
        new FieldProvenance('container', source.provenanceHandle),
        input.runtimeRenderers.length === 0 ? null : new FieldProvenance('renderers', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
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
      input.appRoot?.toReference() ?? null,
      input.container.toReference(),
      resourceScope.productHandle,
      services,
      source.addressHandle,
      compactFieldProvenance([
        new FieldProvenance('worldKind', source.provenanceHandle),
        input.appRoot == null ? null : new FieldProvenance('appRoot', source.provenanceHandle),
        new FieldProvenance('container', source.provenanceHandle),
        new FieldProvenance('resourceScope', source.provenanceHandle),
        new FieldProvenance('services', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
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
  ): MaterializationRecord {
    return new MaterializationRecord(
      this.store.handles.materialization(`template-world:${local}`),
      handles.worldIdentityHandle,
      handles.materializedProductHandles,
      claims.allClaims.map((claim) => claim.handle),
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

function syntaxResourcesForInput(
  input: TemplateCompilerWorldConstructionRequest,
): readonly TemplateVisibleResource[] {
  return [
    ...input.attributePatterns.map((pattern) =>
      visibleAttributePattern(pattern, input.syntaxVisibilityKind)
    ),
    ...input.bindingCommands.map((command) =>
      visibleBindingCommand(command, input.syntaxVisibilityKind)
    ),
  ];
}

function visibleAttributePattern(
  emission: BuiltInAttributePatternEmission,
  visibilityKind: TemplateResourceVisibilityKind,
): TemplateVisibleResource {
  return new TemplateVisibleResource(
    ResourceDefinitionKind.AttributePattern,
    emission.handler.targetName,
    [],
    emission.executable.productHandle,
    emission.executable.identityHandle,
    null,
    null,
    visibilityKind,
    emission.executable.sourceAddressHandle,
  );
}

function visibleBindingCommand(
  emission: BuiltInBindingCommandEmission,
  visibilityKind: TemplateResourceVisibilityKind,
): TemplateVisibleResource {
  return new TemplateVisibleResource(
    ResourceDefinitionKind.BindingCommand,
    emission.handler.name,
    emission.handler.aliases,
    emission.executable.productHandle,
    emission.executable.identityHandle,
    null,
    null,
    visibilityKind,
    emission.executable.sourceAddressHandle,
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
