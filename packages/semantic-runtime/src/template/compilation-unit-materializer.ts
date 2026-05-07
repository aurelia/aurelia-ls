import {
  TemplateAddress,
} from '../kernel/address.js';
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
import type { TemplateSourceOffsetMap } from '../resources/custom-element-definition.js';
import {
  CompilerIdentity,
  TemplateIdentity,
  TemplatePhase,
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
import {
  TemplateCompilerWorldKind,
} from './compiler-world.js';
import type { TemplateCompilerServiceReference } from './compiler-world-reference.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import {
  TemplateCompilationContext,
  type TemplateCompilationContextField,
  TemplateCompilationContextKind,
  TemplateCompilationContextReference,
  TemplateCompilationUnit,
  TemplateCompilationUnitKind,
  TemplateSource,
  TemplateSourceKind,
  TemplateSourceOwnerReference,
} from './compilation-unit.js';
import {
  TemplateFrontierKind,
  TemplateParseConsumer,
  TemplateParseContext,
  TemplateParseFrontier,
  TemplateRecoveryPolicy,
} from './parse-context.js';
import { TemplateProductDetails } from './product-details.js';

export class TemplateCompilationUnitConstructionRequest {
  constructor(
    /** Store-local key for the compilation unit being materialized. */
    readonly localKey: string,
    /** Compiler-front-door lane. */
    readonly unitKind: TemplateCompilationUnitKind,
    /** Compiler world and runtime-shaped services selected for this unit. */
    readonly compilerWorld: TemplateCompilerWorldEmission,
    /** Resource or configuration owner that supplied the source. */
    readonly owner: TemplateSourceOwnerReference | null,
    /** Authored source lane. */
    readonly sourceKind: TemplateSourceKind,
    /** Markup text when already closed by resource convergence or source admission. */
    readonly markup: string | null,
    /** Source address for the template carrier. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Offset map from decoded markup boundaries to authored source boundaries. */
    readonly sourceMap: TemplateSourceOffsetMap | null = null,
    /** Consumer lane that requested this compilation unit. */
    readonly consumer: TemplateParseConsumer = TemplateParseConsumer.Compilation,
    /** Recovery behavior requested for this unit. */
    readonly recoveryPolicy: TemplateRecoveryPolicy = TemplateRecoveryPolicy.Strict,
    /** Active parser/lowering frontier. */
    readonly frontier: TemplateParseFrontier = new TemplateParseFrontier(
      TemplateFrontierKind.None,
      null,
      null,
    ),
    /** Local custom-element names already known for the root context. */
    readonly localElementNames: readonly string[] = [],
    /** Local dependency identities already known for the root context. */
    readonly dependencyIdentityHandles: readonly IdentityHandle[] = [],
  ) {}
}

export class TemplateCompilationUnitEmission {
  constructor(
    readonly templateSource: TemplateSource,
    readonly parseContext: TemplateParseContext,
    readonly rootContext: TemplateCompilationContext,
    readonly compilationUnit: TemplateCompilationUnit,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class TemplateCompilationSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

class TemplateCompilationClaims {
  constructor(
    readonly sourceClaims: readonly SemanticClaim[],
    readonly unitClaims: readonly SemanticClaim[],
    readonly contextClaims: readonly SemanticClaim[],
  ) {}

  get allClaims(): readonly SemanticClaim[] {
    return [
      ...this.sourceClaims,
      ...this.unitClaims,
      ...this.contextClaims,
    ];
  }
}

class TemplateCompilationUnitHandleSet {
  constructor(
    readonly templateAddressHandle: AddressHandle,
    readonly templateIdentityHandle: IdentityHandle,
    readonly templateProductHandle: ProductHandle,
    readonly parseContextIdentityHandle: IdentityHandle,
    readonly parseContextProductHandle: ProductHandle,
    readonly unitIdentityHandle: IdentityHandle,
    readonly unitProductHandle: ProductHandle,
    readonly contextIdentityHandle: IdentityHandle,
    readonly contextProductHandle: ProductHandle,
  ) {}

  get materializedProductHandles(): readonly ProductHandle[] {
    return [
      this.templateProductHandle,
      this.parseContextProductHandle,
      this.unitProductHandle,
      this.contextProductHandle,
    ];
  }
}

class TemplateCompilationUnitProducts {
  constructor(
    readonly templateSource: TemplateSource,
    readonly parseContext: TemplateParseContext,
    readonly rootContext: TemplateCompilationContext,
    readonly compilationUnit: TemplateCompilationUnit,
  ) {}

  toEmission(records: readonly KernelStoreRecord[]): TemplateCompilationUnitEmission {
    return new TemplateCompilationUnitEmission(
      this.templateSource,
      this.parseContext,
      this.rootContext,
      this.compilationUnit,
      records,
    );
  }
}

/** Materializes the compiler-front-door products that parser and lowering materializers consume. */
export class TemplateCompilationUnitMaterializer {
  constructor(
    /** Hot analysis store that receives compilation-front-door records. */
    readonly store: KernelStore,
  ) {}

  construct(input: TemplateCompilationUnitConstructionRequest): TemplateCompilationUnitEmission {
    const emission = this.recordsForUnit(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `template-compilation-unit:${input.localKey}`));
    }
    this.registerProductDetails(emission);
    return emission;
  }

  private registerProductDetails(emission: TemplateCompilationUnitEmission): void {
    this.store.productDetails.add(TemplateProductDetails.Source, emission.templateSource.productHandle, emission.templateSource);
    this.store.productDetails.add(TemplateProductDetails.ParseContext, emission.parseContext.productHandle, emission.parseContext);
    this.store.productDetails.add(TemplateProductDetails.CompilationContext, emission.rootContext.productHandle, emission.rootContext);
    this.store.productDetails.add(TemplateProductDetails.CompilationUnit, emission.compilationUnit.productHandle, emission.compilationUnit);
  }

  private recordsForUnit(input: TemplateCompilationUnitConstructionRequest): TemplateCompilationUnitEmission {
    const records: KernelStoreRecord[] = [];
    const local = input.localKey;
    const source = this.recordsForSource(local, input.sourceAddressHandle);
    records.push(...source.records);

    const handles = this.handlesForUnit(local);
    const products = this.productsForUnit(input, handles, source);
    const claims = this.recordsForClaims(
      local,
      input,
      products.templateSource,
      products.parseContext,
      products.rootContext,
      products.compilationUnit,
      source.provenanceHandle,
    );
    records.push(...claims.allClaims);
    records.push(
      ...this.identityRecordsForUnit(input, handles, source),
      ...this.materializedProductRecordsForUnit(handles, source),
      this.materializationRecordForUnit(local, handles, claims),
    );

    return products.toEmission(records);
  }

  private handlesForUnit(local: string): TemplateCompilationUnitHandleSet {
    return new TemplateCompilationUnitHandleSet(
      this.store.handles.address(`template-source:${local}`),
      this.store.handles.identity(`template-source:${local}`),
      this.store.handles.product(`template-source:${local}`),
      this.store.handles.identity(`template-parse-context:${local}`),
      this.store.handles.product(`template-parse-context:${local}`),
      this.store.handles.identity(`template-compilation-unit:${local}`),
      this.store.handles.product(`template-compilation-unit:${local}`),
      this.store.handles.identity(`template-compilation-context:${local}:root`),
      this.store.handles.product(`template-compilation-context:${local}:root`),
    );
  }

  private productsForUnit(
    input: TemplateCompilationUnitConstructionRequest,
    handles: TemplateCompilationUnitHandleSet,
    source: TemplateCompilationSourceSet,
  ): TemplateCompilationUnitProducts {
    const templateSource = this.templateSourceForUnit(input, handles, source);
    const parseContext = this.parseContextForUnit(input, handles, source);
    const rootContext = this.rootContextForUnit(
      input,
      handles,
      source,
      parseContext,
    );
    const compilationUnit = this.compilationUnitForProducts(
      input,
      handles,
      source,
      templateSource,
      parseContext,
      rootContext,
    );
    return new TemplateCompilationUnitProducts(
      templateSource,
      parseContext,
      rootContext,
      compilationUnit,
    );
  }

  private templateSourceForUnit(
    input: TemplateCompilationUnitConstructionRequest,
    handles: TemplateCompilationUnitHandleSet,
    source: TemplateCompilationSourceSet,
  ): TemplateSource {
    return new TemplateSource(
      handles.templateProductHandle,
      handles.templateIdentityHandle,
      input.sourceKind,
      TemplatePhase.Authored,
      input.owner,
      input.markup,
      input.sourceMap,
      handles.templateAddressHandle,
      source.sourceAddressHandle,
      compactFieldProvenance([
        new FieldProvenance('sourceKind', source.provenanceHandle),
        new FieldProvenance('phase', source.provenanceHandle),
        input.owner == null ? null : new FieldProvenance('owner', source.provenanceHandle),
        input.markup == null ? null : new FieldProvenance('markup', source.provenanceHandle),
        input.sourceMap == null ? null : new FieldProvenance('sourceMap', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private parseContextForUnit(
    input: TemplateCompilationUnitConstructionRequest,
    handles: TemplateCompilationUnitHandleSet,
    source: TemplateCompilationSourceSet,
  ): TemplateParseContext {
    return new TemplateParseContext(
      handles.parseContextProductHandle,
      input.consumer,
      input.recoveryPolicy,
      input.frontier,
      source.sourceAddressHandle,
      compactFieldProvenance([
        new FieldProvenance('consumer', source.provenanceHandle),
        new FieldProvenance('recoveryPolicy', source.provenanceHandle),
        new FieldProvenance('frontier', source.provenanceHandle),
        input.frontier.locus == null ? null : new FieldProvenance('locus', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private rootContextForUnit(
    input: TemplateCompilationUnitConstructionRequest,
    handles: TemplateCompilationUnitHandleSet,
    source: TemplateCompilationSourceSet,
    parseContext: TemplateParseContext,
  ): TemplateCompilationContext {
    const rootContextReference = this.rootContextReferenceForUnit(handles, source);
    return new TemplateCompilationContext(
      handles.contextProductHandle,
      handles.contextIdentityHandle,
      TemplateCompilationContextKind.Root,
      handles.unitProductHandle,
      input.compilerWorld.world.toReference(),
      null,
      rootContextReference,
      input.compilerWorld.resourceScope.toReference(),
      input.compilerWorld.world.services,
      parseContext.toReference(),
      input.localElementNames,
      input.dependencyIdentityHandles,
      source.sourceAddressHandle,
      this.rootContextFieldProvenance(input, source),
    );
  }

  private rootContextReferenceForUnit(
    handles: TemplateCompilationUnitHandleSet,
    source: TemplateCompilationSourceSet,
  ): TemplateCompilationContextReference {
    return new TemplateCompilationContextReference(
      handles.contextProductHandle,
      handles.contextIdentityHandle,
      TemplateCompilationContextKind.Root,
      source.sourceAddressHandle,
    );
  }

  private rootContextFieldProvenance(
    input: TemplateCompilationUnitConstructionRequest,
    source: TemplateCompilationSourceSet,
  ): readonly FieldProvenance<TemplateCompilationContextField>[] {
    return compactFieldProvenance([
      new FieldProvenance('contextKind', source.provenanceHandle),
      new FieldProvenance('compilationUnit', source.provenanceHandle),
      new FieldProvenance('compilerWorld', source.provenanceHandle),
      new FieldProvenance('root', source.provenanceHandle),
      new FieldProvenance('resourceScope', source.provenanceHandle),
      new FieldProvenance('services', source.provenanceHandle),
      new FieldProvenance('parseContext', source.provenanceHandle),
      input.localElementNames.length === 0 ? null : new FieldProvenance('localElements', source.provenanceHandle),
      input.dependencyIdentityHandles.length === 0 ? null : new FieldProvenance('dependencies', source.provenanceHandle),
      new FieldProvenance('source', source.provenanceHandle),
    ]);
  }

  private compilationUnitForProducts(
    input: TemplateCompilationUnitConstructionRequest,
    handles: TemplateCompilationUnitHandleSet,
    source: TemplateCompilationSourceSet,
    templateSource: TemplateSource,
    parseContext: TemplateParseContext,
    rootContext: TemplateCompilationContext,
  ): TemplateCompilationUnit {
    return new TemplateCompilationUnit(
      handles.unitProductHandle,
      handles.unitIdentityHandle,
      input.unitKind,
      templateSource.toReference(),
      input.compilerWorld.world.toReference(),
      parseContext.toReference(),
      rootContext.toReference(),
      source.sourceAddressHandle,
      compactFieldProvenance([
        new FieldProvenance('unitKind', source.provenanceHandle),
        new FieldProvenance('templateSource', source.provenanceHandle),
        new FieldProvenance('compilerWorld', source.provenanceHandle),
        new FieldProvenance('parseContext', source.provenanceHandle),
        new FieldProvenance('rootContext', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private identityRecordsForUnit(
    input: TemplateCompilationUnitConstructionRequest,
    handles: TemplateCompilationUnitHandleSet,
    source: TemplateCompilationSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      this.templateAddressForUnit(input, handles, source),
      this.templateIdentityForUnit(input, handles),
      this.parseContextIdentityForUnit(input, handles, source),
      this.compilationUnitIdentityForUnit(input, handles, source),
      this.rootContextIdentityForUnit(handles, source),
    ];
  }

  private templateAddressForUnit(
    input: TemplateCompilationUnitConstructionRequest,
    handles: TemplateCompilationUnitHandleSet,
    source: TemplateCompilationSourceSet,
  ): TemplateAddress {
    return new TemplateAddress(
      handles.templateAddressHandle,
      `template:${input.localKey}`,
      input.owner?.identityHandle ?? null,
      source.sourceAddressHandle,
    );
  }

  private templateIdentityForUnit(
    input: TemplateCompilationUnitConstructionRequest,
    handles: TemplateCompilationUnitHandleSet,
  ): TemplateIdentity {
    return new TemplateIdentity(
      handles.templateIdentityHandle,
      input.owner?.identityHandle ?? null,
      TemplatePhase.Authored,
      handles.templateAddressHandle,
    );
  }

  private parseContextIdentityForUnit(
    input: TemplateCompilationUnitConstructionRequest,
    handles: TemplateCompilationUnitHandleSet,
    source: TemplateCompilationSourceSet,
  ): CompilerIdentity {
    return new CompilerIdentity(
      handles.parseContextIdentityHandle,
      KernelVocabulary.Template.ParseContext.key,
      handles.templateIdentityHandle,
      source.sourceAddressHandle,
      input.consumer,
    );
  }

  private compilationUnitIdentityForUnit(
    input: TemplateCompilationUnitConstructionRequest,
    handles: TemplateCompilationUnitHandleSet,
    source: TemplateCompilationSourceSet,
  ): CompilerIdentity {
    return new CompilerIdentity(
      handles.unitIdentityHandle,
      KernelVocabulary.Compiler.CompilationUnit.key,
      handles.templateIdentityHandle,
      source.sourceAddressHandle,
      input.unitKind,
    );
  }

  private rootContextIdentityForUnit(
    handles: TemplateCompilationUnitHandleSet,
    source: TemplateCompilationSourceSet,
  ): CompilerIdentity {
    return new CompilerIdentity(
      handles.contextIdentityHandle,
      KernelVocabulary.Compiler.CompilationContext.key,
      handles.unitIdentityHandle,
      source.sourceAddressHandle,
      TemplateCompilationContextKind.Root,
    );
  }

  private materializedProductRecordsForUnit(
    handles: TemplateCompilationUnitHandleSet,
    source: TemplateCompilationSourceSet,
  ): readonly MaterializedProduct[] {
    const products: readonly (readonly [ProductHandle, ProductKindKey, IdentityHandle])[] = [
      [handles.templateProductHandle, KernelVocabulary.Template.Source.key, handles.templateIdentityHandle],
      [handles.parseContextProductHandle, KernelVocabulary.Template.ParseContext.key, handles.parseContextIdentityHandle],
      [handles.unitProductHandle, KernelVocabulary.Compiler.CompilationUnit.key, handles.unitIdentityHandle],
      [handles.contextProductHandle, KernelVocabulary.Compiler.CompilationContext.key, handles.contextIdentityHandle],
    ];
    return products.map(([productHandle, productKindKey, identityHandle]) =>
      new MaterializedProduct(
        productHandle,
        productKindKey,
        identityHandle,
        source.sourceAddressHandle,
        source.provenanceHandle,
      )
    );
  }

  private materializationRecordForUnit(
    local: string,
    handles: TemplateCompilationUnitHandleSet,
    claims: TemplateCompilationClaims,
  ): MaterializationRecord {
    return new MaterializationRecord(
      this.store.handles.materialization(`template-compilation-unit:${local}`),
      handles.unitIdentityHandle,
      handles.materializedProductHandles,
      claims.allClaims.map((claim) => claim.handle),
    );
  }

  private recordsForSource(local: string, addressHandle: AddressHandle | null): TemplateCompilationSourceSet {
    const evidenceHandle = this.store.handles.evidence(`template-compilation-unit:${local}`);
    const provenanceHandle = this.store.handles.provenance(`template-compilation-unit:${local}`);
    const records: KernelStoreRecord[] = [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.TransformInput, EvidenceRole.Scope],
        'Template compilation unit constructed from a template source, compiler world, and parse context.',
        addressHandle,
      ),
      new ProvenanceRecord(
        provenanceHandle,
        [evidenceHandle],
      ),
    ];
    return new TemplateCompilationSourceSet(records, provenanceHandle, addressHandle);
  }

  private recordsForClaims(
    local: string,
    input: TemplateCompilationUnitConstructionRequest,
    templateSource: TemplateSource,
    parseContext: TemplateParseContext,
    rootContext: TemplateCompilationContext,
    compilationUnit: TemplateCompilationUnit,
    provenanceHandle: ProvenanceHandle,
  ): TemplateCompilationClaims {
    return new TemplateCompilationClaims(
      this.sourceClaimsForUnit(local, input, templateSource, provenanceHandle),
      this.compilationUnitClaimsForUnit(local, input, templateSource, parseContext, rootContext, compilationUnit, provenanceHandle),
      this.rootContextClaimsForUnit(local, input, parseContext, rootContext, provenanceHandle),
    );
  }

  private sourceClaimsForUnit(
    local: string,
    input: TemplateCompilationUnitConstructionRequest,
    templateSource: TemplateSource,
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    return input.owner?.productHandle == null
      ? []
      : [
        new SemanticClaim(
          this.store.handles.claim(`template-source:${local}:source-for-resource`),
          templateSource.productHandle,
          KernelVocabulary.Template.SourceForResource.key,
          input.owner.productHandle,
          provenanceHandle,
        ),
      ];
  }

  private compilationUnitClaimsForUnit(
    local: string,
    input: TemplateCompilationUnitConstructionRequest,
    templateSource: TemplateSource,
    parseContext: TemplateParseContext,
    rootContext: TemplateCompilationContext,
    compilationUnit: TemplateCompilationUnit,
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    return [
      this.compilationUnitCompilesTemplateClaim(local, compilationUnit, templateSource, provenanceHandle),
      this.compilationUnitUsesWorldClaim(local, compilationUnit, input, provenanceHandle),
      this.compilationUnitUsesParseContextClaim(local, compilationUnit, parseContext, provenanceHandle),
      this.compilationUnitUsesRootContextClaim(local, compilationUnit, rootContext, provenanceHandle),
    ];
  }

  private compilationUnitCompilesTemplateClaim(
    local: string,
    compilationUnit: TemplateCompilationUnit,
    templateSource: TemplateSource,
    provenanceHandle: ProvenanceHandle,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`template-compilation-unit:${local}:compiles-template`),
      compilationUnit.productHandle,
      KernelVocabulary.Compiler.CompilesTemplate.key,
      templateSource.productHandle,
      provenanceHandle,
    );
  }

  private compilationUnitUsesWorldClaim(
    local: string,
    compilationUnit: TemplateCompilationUnit,
    input: TemplateCompilationUnitConstructionRequest,
    provenanceHandle: ProvenanceHandle,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`template-compilation-unit:${local}:uses-world`),
      compilationUnit.productHandle,
      KernelVocabulary.Compiler.UsesWorld.key,
      input.compilerWorld.world.productHandle,
      provenanceHandle,
    );
  }

  private compilationUnitUsesParseContextClaim(
    local: string,
    compilationUnit: TemplateCompilationUnit,
    parseContext: TemplateParseContext,
    provenanceHandle: ProvenanceHandle,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`template-compilation-unit:${local}:uses-parse-context`),
      compilationUnit.productHandle,
      KernelVocabulary.Compiler.UsesParseContext.key,
      parseContext.productHandle,
      provenanceHandle,
    );
  }

  private compilationUnitUsesRootContextClaim(
    local: string,
    compilationUnit: TemplateCompilationUnit,
    rootContext: TemplateCompilationContext,
    provenanceHandle: ProvenanceHandle,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`template-compilation-unit:${local}:uses-root-context`),
      compilationUnit.productHandle,
      KernelVocabulary.Compiler.UsesCompilationContext.key,
      rootContext.productHandle,
      provenanceHandle,
    );
  }

  private rootContextClaimsForUnit(
    local: string,
    input: TemplateCompilationUnitConstructionRequest,
    parseContext: TemplateParseContext,
    rootContext: TemplateCompilationContext,
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    const contextClaims: SemanticClaim[] = [
      new SemanticClaim(
        this.store.handles.claim(`template-compilation-context:${local}:uses-world`),
        rootContext.productHandle,
        KernelVocabulary.Compiler.UsesWorld.key,
        input.compilerWorld.world.productHandle,
        provenanceHandle,
      ),
      new SemanticClaim(
        this.store.handles.claim(`template-compilation-context:${local}:uses-parse-context`),
        rootContext.productHandle,
        KernelVocabulary.Compiler.UsesParseContext.key,
        parseContext.productHandle,
        provenanceHandle,
      ),
      new SemanticClaim(
        this.store.handles.claim(`template-compilation-context:${local}:uses-resource-scope`),
        rootContext.productHandle,
        KernelVocabulary.Compiler.ContextUsesResourceScope.key,
        input.compilerWorld.resourceScope.productHandle,
        provenanceHandle,
      ),
    ];
    contextClaims.push(...serviceClaims(local, rootContext.productHandle, rootContext.services, provenanceHandle, this.store));
    return contextClaims;
  }
}

function serviceClaims(
  local: string,
  contextProductHandle: ProductHandle,
  services: readonly TemplateCompilerServiceReference[],
  provenanceHandle: ProvenanceHandle,
  store: KernelStore,
): readonly SemanticClaim[] {
  const claims: SemanticClaim[] = [];
  services.forEach((service, index) => {
    if (service.productHandle == null) {
      return;
    }
    claims.push(new SemanticClaim(
      store.handles.claim(`template-compilation-context:${local}:uses-service:${index}`),
      contextProductHandle,
      KernelVocabulary.Compiler.ContextUsesService.key,
      service.productHandle,
      provenanceHandle,
    ));
  });
  return claims;
}

export function compilationUnitKindForWorldKind(worldKind: TemplateCompilerWorldKind): TemplateCompilationUnitKind {
  switch (worldKind) {
    case TemplateCompilerWorldKind.AppRoot:
      return TemplateCompilationUnitKind.AppRoot;
    case TemplateCompilerWorldKind.Component:
      return TemplateCompilationUnitKind.CustomElement;
    case TemplateCompilerWorldKind.SyntheticView:
      return TemplateCompilationUnitKind.SyntheticView;
    case TemplateCompilerWorldKind.Unknown:
      return TemplateCompilationUnitKind.Unknown;
  }
}
