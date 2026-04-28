import { AttributeParserMachine, AttributeParserService } from './attribute-syntax.js';
import { BindingCommandResolverService } from './binding-command-execution.js';
import {
  TemplateCompilerService,
  type TemplateCompilerServiceReference,
  TemplateCompilerWorld,
  TemplateCompilerWorldKind,
  TemplateAttributeMapperService,
  TemplateExpressionParserService,
  TemplateResourceResolverService,
  TemplateResourceScope,
  TemplateResourceVisibilityKind,
  TemplateVisibleResource,
} from './compiler-world.js';
import type {
  BuiltInAttributePatternEmission,
  BuiltInBindingCommandEmission,
} from './built-in-syntax-producer.js';
import type { AppRoot } from '../configuration/app-root.js';
import type { Container } from '../di/container.js';
import { SemanticClaim } from '../kernel/claim.js';
import { DerivationPhase } from '../kernel/derivation.js';
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
  CompilerIdentityKind,
  IdentityStability,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializationState,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceMode,
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
    readonly attributeParser: AttributeParserService,
    readonly attributeParserMachine: AttributeParserMachine,
    readonly bindingCommandResolver: BindingCommandResolverService,
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

class CompilerWorldClaimSet {
  constructor(
    readonly worldClaims: readonly SemanticClaim[],
    readonly scopeClaims: readonly SemanticClaim[],
  ) {}

  get allClaims(): readonly SemanticClaim[] {
    return [...this.worldClaims, ...this.scopeClaims];
  }
}

/** Materializes the compiler-facing world once visibility has already been selected. */
export class TemplateCompilerWorldProducer {
  constructor(
    /** Hot analysis store that receives compiler-world records. */
    readonly store: KernelStore,
  ) {}

  construct(input: TemplateCompilerWorldConstructionInput): TemplateCompilerWorldEmission {
    const emission = this.recordsForWorld(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `template-compiler-world:${input.localKey}`));
    }
    return emission;
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

    const compiledPatterns = input.attributePatterns.flatMap((pattern) => pattern.compiledPatterns);
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
      compiledPatterns,
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
      input.attributePatterns.map((pattern) => pattern.executable),
      attributeParserMachine,
      source.addressHandle,
      compactFieldProvenance([
        new FieldProvenance('patterns', source.provenanceHandle),
        new FieldProvenance('machine', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
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
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    const resourceResolver = new TemplateResourceResolverService(
      resourceResolverProductHandle,
      resourceResolverIdentityHandle,
      input.container.toReference(),
      source.addressHandle,
      compactFieldProvenance([
        new FieldProvenance('serviceKind', source.provenanceHandle),
        new FieldProvenance('container', source.provenanceHandle),
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
    const services = [
      templateCompiler.toReference(),
      resourceResolver.toReference(),
      attributeParser.toReference(),
      bindingCommandResolver.toReference(),
      expressionParser.toReference(),
      attributeMapper.toReference(),
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
      source.provenanceHandle,
    );
    records.push(...claims.allClaims);
    records.push(
      identity(worldIdentityHandle, CompilerIdentityKind.TemplateCompilerWorld, input.container.identityHandle, source),
      identity(scopeIdentityHandle, CompilerIdentityKind.TemplateResourceScope, worldIdentityHandle, source),
      identity(machineIdentityHandle, CompilerIdentityKind.AttributeParserMachine, worldIdentityHandle, source),
      identity(attributeParserIdentityHandle, CompilerIdentityKind.TemplateCompilerService, worldIdentityHandle, source, 'IAttributeParser'),
      identity(bindingResolverIdentityHandle, CompilerIdentityKind.TemplateCompilerService, worldIdentityHandle, source, 'IBindingCommandResolver'),
      identity(templateCompilerIdentityHandle, CompilerIdentityKind.TemplateCompilerService, worldIdentityHandle, source, 'TemplateCompiler'),
      identity(resourceResolverIdentityHandle, CompilerIdentityKind.TemplateCompilerService, worldIdentityHandle, source, 'IResourceResolver'),
      identity(expressionParserIdentityHandle, CompilerIdentityKind.TemplateCompilerService, worldIdentityHandle, source, 'IExpressionParser'),
      identity(attributeMapperIdentityHandle, CompilerIdentityKind.TemplateCompilerService, worldIdentityHandle, source, 'IAttrMapper'),
      product(worldProductHandle, KernelVocabulary.Compiler.World.key, worldIdentityHandle, source, claims.worldClaims.map((claim) => claim.handle)),
      product(scopeProductHandle, KernelVocabulary.Compiler.ResourceScope.key, scopeIdentityHandle, source, claims.scopeClaims.map((claim) => claim.handle)),
      product(machineProductHandle, KernelVocabulary.Compiler.AttributeParserMachine.key, machineIdentityHandle, source),
      product(attributeParserProductHandle, KernelVocabulary.Compiler.AttributeParser.key, attributeParserIdentityHandle, source),
      product(bindingResolverProductHandle, KernelVocabulary.Compiler.BindingCommandResolver.key, bindingResolverIdentityHandle, source),
      product(templateCompilerProductHandle, KernelVocabulary.Compiler.Service.key, templateCompilerIdentityHandle, source),
      product(resourceResolverProductHandle, KernelVocabulary.Compiler.Service.key, resourceResolverIdentityHandle, source),
      product(expressionParserProductHandle, KernelVocabulary.Compiler.Service.key, expressionParserIdentityHandle, source),
      product(attributeMapperProductHandle, KernelVocabulary.Compiler.Service.key, attributeMapperIdentityHandle, source),
      new MaterializationRecord(
        this.store.handles.materialization(`template-world:${local}`),
        DerivationPhase.Materialization,
        worldIdentityHandle,
        MaterializationState.Complete,
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
      attributeParser,
      attributeParserMachine,
      bindingCommandResolver,
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
        ProvenanceMode.Derived,
        [evidenceHandle],
        [],
        'Template compiler world construction.',
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
    provenanceHandle: ProvenanceHandle,
  ): CompilerWorldClaimSet {
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
        return;
      }
      scopeClaims.push(new SemanticClaim(
        this.store.handles.claim(`template-resource-scope:${local}:provides-resource:${index}`),
        scope.productHandle,
        KernelVocabulary.Compiler.ProvidesResource.key,
        resource.resourceProductHandle,
        provenanceHandle,
      ));
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
    return new CompilerWorldClaimSet(worldClaims, scopeClaims);
  }
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
    visibilityKind,
    emission.executable.sourceAddressHandle,
  );
}

function identity(
  handle: IdentityHandle,
  compilerKind: CompilerIdentityKind,
  ownerHandle: IdentityHandle | null,
  source: CompilerWorldSourceSet,
  localName: string | null = null,
): CompilerIdentity {
  return new CompilerIdentity(
    handle,
    IdentityStability.SourceStable,
    compilerKind,
    ownerHandle,
    source.addressHandle,
    localName,
  );
}

function product(
  handle: ProductHandle,
  productKind: ProductKindKey,
  identityHandle: IdentityHandle,
  source: CompilerWorldSourceSet,
  claimHandles: readonly SemanticClaim['handle'][] = [],
): MaterializedProduct {
  return new MaterializedProduct(
    handle,
    productKind,
    identityHandle,
    source.addressHandle,
    source.provenanceHandle,
    claimHandles,
  );
}
