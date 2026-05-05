import { AttributeParserMachine, AttributeParserService } from './attribute-syntax.js';
import { BindingCommandResolverService } from './binding-command-execution.js';
import {
  TemplateCompilerService,
  type TemplateCompilerServiceReference,
  TemplateCompilerWorld,
  TemplateCompilerWorldKind,
  TemplateAttributeMapperService,
  TemplateExpressionParserService,
  TemplateRenderingService,
  TemplateResourceResolverService,
  TemplateResourceScope,
  TemplateResourceVisibilityKind,
  TemplateVisibleResource,
} from './compiler-world.js';
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

export class TemplateCompilerWorldConstructionInput {
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

/** Materializes the compiler-facing world once visibility has already been selected. */
export class TemplateCompilerWorldMaterializer {
  constructor(
    /** Hot analysis store that receives compiler-world records. */
    readonly store: KernelStore,
  ) {}

  construct(input: TemplateCompilerWorldConstructionInput): TemplateCompilerWorldEmission {
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

  private recordsForWorld(input: TemplateCompilerWorldConstructionInput): TemplateCompilerWorldEmission {
    const records: KernelStoreRecord[] = [];
    const local = input.localKey;
    const source = this.recordsForSource(local, input.sourceAddressHandle ?? input.container.sourceAddressHandle);
    records.push(...source.records);

    const worldProductHandle = this.store.handles.product(`template-world:${local}`);
    const worldIdentityHandle = this.store.handles.identity(`template-world:${local}`);
    const scopeProductHandle = this.store.handles.product(`template-resource-scope:${local}`);
    const scopeIdentityHandle = this.store.handles.identity(`template-resource-scope:${local}`);
    const machineProductHandle = this.store.handles.product(`attribute-parser-machine:${local}`);
    const machineIdentityHandle = this.store.handles.identity(`attribute-parser-machine:${local}`);
    const attributeParserProductHandle = this.store.handles.product(`attribute-parser:${local}`);
    const attributeParserIdentityHandle = this.store.handles.identity(`attribute-parser:${local}`);
    const bindingResolverProductHandle = this.store.handles.product(`binding-command-resolver:${local}`);
    const bindingResolverIdentityHandle = this.store.handles.identity(`binding-command-resolver:${local}`);
    const templateCompilerProductHandle = this.store.handles.product(`template-compiler-service:${local}`);
    const templateCompilerIdentityHandle = this.store.handles.identity(`template-compiler-service:${local}`);
    const resourceResolverProductHandle = this.store.handles.product(`resource-resolver-service:${local}`);
    const resourceResolverIdentityHandle = this.store.handles.identity(`resource-resolver-service:${local}`);
    const expressionParserProductHandle = this.store.handles.product(`expression-parser-service:${local}`);
    const expressionParserIdentityHandle = this.store.handles.identity(`expression-parser-service:${local}`);
    const attributeMapperProductHandle = this.store.handles.product(`attribute-mapper-service:${local}`);
    const attributeMapperIdentityHandle = this.store.handles.identity(`attribute-mapper-service:${local}`);
    const renderingProductHandle = this.store.handles.product(`rendering-service:${local}`);
    const renderingIdentityHandle = this.store.handles.identity(`rendering-service:${local}`);

    const syntaxResources = [
      ...input.attributePatterns.map((pattern) => visibleAttributePattern(pattern, input.syntaxVisibilityKind)),
      ...input.bindingCommands.map((command) => visibleBindingCommand(command, input.syntaxVisibilityKind)),
    ];

    const resourceScope = new TemplateResourceScope(
      scopeProductHandle,
      scopeIdentityHandle,
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
    const attributeParserMachine = new AttributeParserMachine(
      machineProductHandle,
      machineIdentityHandle,
      [],
      [],
      source.addressHandle,
      compactFieldProvenance([
        new FieldProvenance('compiledPatterns', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    const attributeParser = new AttributeParserService(
      attributeParserProductHandle,
      attributeParserIdentityHandle,
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
    const bindingCommandResolver = new BindingCommandResolverService(
      bindingResolverProductHandle,
      bindingResolverIdentityHandle,
      input.bindingCommands.map((command) => command.executable),
      source.addressHandle,
      compactFieldProvenance([
        new FieldProvenance('commands', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    const templateCompiler = new TemplateCompilerService(
      templateCompilerProductHandle,
      templateCompilerIdentityHandle,
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
    const resourceResolver = new TemplateResourceResolverService(
      resourceResolverProductHandle,
      resourceResolverIdentityHandle,
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
    const expressionParser = new TemplateExpressionParserService(
      expressionParserProductHandle,
      expressionParserIdentityHandle,
      input.container.toReference(),
      source.addressHandle,
      compactFieldProvenance([
        new FieldProvenance('serviceKind', source.provenanceHandle),
        new FieldProvenance('container', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    const attributeMapper = new TemplateAttributeMapperService(
      attributeMapperProductHandle,
      attributeMapperIdentityHandle,
      input.container.toReference(),
      source.addressHandle,
      compactFieldProvenance([
        new FieldProvenance('serviceKind', source.provenanceHandle),
        new FieldProvenance('container', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    const rendering = new TemplateRenderingService(
      renderingProductHandle,
      renderingIdentityHandle,
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
    const services = [
      templateCompiler.toReference(),
      resourceResolver.toReference(),
      attributeParser.toReference(),
      bindingCommandResolver.toReference(),
      expressionParser.toReference(),
      attributeMapper.toReference(),
      rendering.toReference(),
    ];
    const world = new TemplateCompilerWorld(
      worldProductHandle,
      worldIdentityHandle,
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

    const claims = this.recordsForClaims(
      local,
      world,
      resourceScope,
      services,
      input.resources,
      syntaxResources,
      attributeParser,
      attributeParserMachine,
      rendering,
      source.provenanceHandle,
    );
    records.push(...claims.allClaims);
    records.push(
      identity(worldIdentityHandle, KernelVocabulary.Compiler.World.key, input.container.identityHandle, source),
      identity(scopeIdentityHandle, KernelVocabulary.Compiler.ResourceScope.key, worldIdentityHandle, source),
      identity(machineIdentityHandle, KernelVocabulary.Compiler.AttributeParserMachine.key, worldIdentityHandle, source),
      identity(attributeParserIdentityHandle, KernelVocabulary.Compiler.Service.key, worldIdentityHandle, source, 'IAttributeParser'),
      identity(bindingResolverIdentityHandle, KernelVocabulary.Compiler.Service.key, worldIdentityHandle, source, 'IBindingCommandResolver'),
      identity(templateCompilerIdentityHandle, KernelVocabulary.Compiler.Service.key, worldIdentityHandle, source, 'TemplateCompiler'),
      identity(resourceResolverIdentityHandle, KernelVocabulary.Compiler.Service.key, worldIdentityHandle, source, 'IResourceResolver'),
      identity(expressionParserIdentityHandle, KernelVocabulary.Compiler.Service.key, worldIdentityHandle, source, 'IExpressionParser'),
      identity(attributeMapperIdentityHandle, KernelVocabulary.Compiler.Service.key, worldIdentityHandle, source, 'IAttrMapper'),
      identity(renderingIdentityHandle, KernelVocabulary.Compiler.Service.key, worldIdentityHandle, source, 'Rendering'),
      new MaterializedProduct(
        worldProductHandle,
        KernelVocabulary.Compiler.World.key,
        worldIdentityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializedProduct(
        scopeProductHandle,
        KernelVocabulary.Compiler.ResourceScope.key,
        scopeIdentityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializedProduct(
        machineProductHandle,
        KernelVocabulary.Compiler.AttributeParserMachine.key,
        machineIdentityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializedProduct(
        attributeParserProductHandle,
        KernelVocabulary.Compiler.AttributeParser.key,
        attributeParserIdentityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializedProduct(
        bindingResolverProductHandle,
        KernelVocabulary.Compiler.BindingCommandResolver.key,
        bindingResolverIdentityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializedProduct(
        templateCompilerProductHandle,
        KernelVocabulary.Compiler.Service.key,
        templateCompilerIdentityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializedProduct(
        resourceResolverProductHandle,
        KernelVocabulary.Compiler.Service.key,
        resourceResolverIdentityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializedProduct(
        expressionParserProductHandle,
        KernelVocabulary.Compiler.Service.key,
        expressionParserIdentityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializedProduct(
        attributeMapperProductHandle,
        KernelVocabulary.Compiler.Service.key,
        attributeMapperIdentityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializedProduct(
        renderingProductHandle,
        KernelVocabulary.Compiler.Service.key,
        renderingIdentityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`template-world:${local}`),
        worldIdentityHandle,
        [
          worldProductHandle,
          scopeProductHandle,
          machineProductHandle,
          attributeParserProductHandle,
          bindingResolverProductHandle,
          templateCompilerProductHandle,
          resourceResolverProductHandle,
          expressionParserProductHandle,
          attributeMapperProductHandle,
          renderingProductHandle,
        ],
        claims.allClaims.map((claim) => claim.handle),
      ),
    );

    return new TemplateCompilerWorldEmission(
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
      input.attributePatterns,
      input.bindingCommands,
      input.runtimeRenderers,
      syntaxResources,
      records,
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
    const worldClaims: SemanticClaim[] = [
      new SemanticClaim(
        this.store.handles.claim(`template-world:${local}:uses-resource-scope`),
        world.productHandle,
        KernelVocabulary.Compiler.UsesResourceScope.key,
        scope.productHandle,
        provenanceHandle,
      ),
    ];
    const scopeClaims: SemanticClaim[] = [];
    services.forEach((service, index) => {
      if (service.productHandle == null) {
        return;
      }
      worldClaims.push(new SemanticClaim(
        this.store.handles.claim(`template-world:${local}:uses-service:${index}`),
        world.productHandle,
        KernelVocabulary.Compiler.UsesService.key,
        service.productHandle,
        provenanceHandle,
      ));
    });
    resources.forEach((resource, index) => {
      if (resource.resourceProductHandle == null) {
        if (resource.definitionProductHandle == null) {
          return;
        }
      }
      const productHandles = [
        resource.resourceProductHandle,
        resource.definitionProductHandle,
      ].filter((productHandle, productIndex): productHandle is ProductHandle =>
        productHandle != null && (productIndex === 0 || productHandle !== resource.resourceProductHandle)
      );
      for (const [productIndex, productHandle] of productHandles.entries()) {
        scopeClaims.push(new SemanticClaim(
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
      scopeClaims.push(new SemanticClaim(
        this.store.handles.claim(`template-resource-scope:${local}:provides-syntax-resource:${index}`),
        scope.productHandle,
        KernelVocabulary.Compiler.ProvidesSyntaxResource.key,
        resource.resourceProductHandle,
        provenanceHandle,
      ));
    });
    const serviceClaims: SemanticClaim[] = [
      new SemanticClaim(
        this.store.handles.claim(`attribute-parser:${local}:uses-machine`),
        attributeParser.productHandle,
        KernelVocabulary.Compiler.UsesAttributeParserMachine.key,
        attributeParserMachine.productHandle,
        provenanceHandle,
      ),
    ];
    attributeParserMachine.compiledPatternProductHandles.forEach((productHandle, index) => {
      serviceClaims.push(new SemanticClaim(
        this.store.handles.claim(`attribute-parser-machine:${local}:uses-compiled-pattern:${index}`),
        attributeParserMachine.productHandle,
        KernelVocabulary.Compiler.UsesCompiledAttributePattern.key,
        productHandle,
        provenanceHandle,
      ));
    });
    rendering.renderers.forEach((renderer, index) => {
      if (renderer.productHandle == null) {
        return;
      }
      serviceClaims.push(new SemanticClaim(
        this.store.handles.claim(`rendering:${local}:uses-runtime-renderer:${index}`),
        rendering.productHandle,
        KernelVocabulary.Compiler.RenderingServiceUsesRenderer.key,
        renderer.productHandle,
        provenanceHandle,
      ));
    });
    return new CompilerWorldClaims(worldClaims, scopeClaims, serviceClaims);
  }
}

function claimsForProduct(
  claims: readonly SemanticClaim[],
  productHandle: ProductHandle,
): readonly SemanticClaim[] {
  return claims.filter((claim) =>
    claim.subjectHandle === productHandle
    || claim.objectHandle === productHandle
  );
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
