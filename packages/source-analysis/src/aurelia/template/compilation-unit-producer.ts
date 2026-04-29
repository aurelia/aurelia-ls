import {
  AddressStability,
  TemplateAddress,
} from '../kernel/address.js';
import { SemanticClaim } from '../kernel/claim.js';
import { DerivationPhase } from '../kernel/derivation.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  ClaimHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  CompilerIdentity,
  CompilerIdentityKind,
  IdentityStability,
  TemplateIdentity,
  TemplatePhase,
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
import {
  TemplateCompilerWorldKind,
  type TemplateCompilerServiceReference,
} from './compiler-world.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-producer.js';
import {
  TemplateCompilationContext,
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

export class TemplateCompilationUnitConstructionInput {
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

class TemplateCompilationClaimSet {
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

/** Materializes the compiler-front-door products that parser and lowering producers consume. */
export class TemplateCompilationUnitProducer {
  constructor(
    /** Hot analysis store that receives compilation-front-door records. */
    readonly store: KernelStore,
  ) {}

  construct(input: TemplateCompilationUnitConstructionInput): TemplateCompilationUnitEmission {
    const emission = this.recordsForUnit(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `template-compilation-unit:${input.localKey}`));
    }
    return emission;
  }

  private recordsForUnit(input: TemplateCompilationUnitConstructionInput): TemplateCompilationUnitEmission {
    const records: KernelStoreRecord[] = [];
    const local = input.localKey;
    const source = this.recordsForSource(local, input.sourceAddressHandle);
    records.push(...source.records);

    const templateAddressHandle = this.store.handles.address(`template-source:${local}`);
    const templateIdentityHandle = this.store.handles.identity(`template-source:${local}`);
    const templateProductHandle = this.store.handles.product(`template-source:${local}`);
    const parseContextIdentityHandle = this.store.handles.identity(`template-parse-context:${local}`);
    const parseContextProductHandle = this.store.handles.product(`template-parse-context:${local}`);
    const unitIdentityHandle = this.store.handles.identity(`template-compilation-unit:${local}`);
    const unitProductHandle = this.store.handles.product(`template-compilation-unit:${local}`);
    const contextIdentityHandle = this.store.handles.identity(`template-compilation-context:${local}:root`);
    const contextProductHandle = this.store.handles.product(`template-compilation-context:${local}:root`);

    const templateSource = new TemplateSource(
      templateProductHandle,
      templateIdentityHandle,
      input.sourceKind,
      TemplatePhase.Authored,
      input.owner,
      input.markup,
      templateAddressHandle,
      source.sourceAddressHandle,
      compactFieldProvenance([
        new FieldProvenance('sourceKind', source.provenanceHandle),
        new FieldProvenance('phase', source.provenanceHandle),
        input.owner == null ? null : new FieldProvenance('owner', source.provenanceHandle),
        input.markup == null ? null : new FieldProvenance('markup', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    const parseContext = new TemplateParseContext(
      parseContextProductHandle,
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
    const rootContextReference = new TemplateCompilationContextReference(
      contextProductHandle,
      contextIdentityHandle,
      TemplateCompilationContextKind.Root,
      source.sourceAddressHandle,
    );
    const rootContext = new TemplateCompilationContext(
      contextProductHandle,
      contextIdentityHandle,
      TemplateCompilationContextKind.Root,
      unitProductHandle,
      input.compilerWorld.world.toReference(),
      null,
      rootContextReference,
      input.compilerWorld.resourceScope.toReference(),
      input.compilerWorld.world.services,
      parseContext.toReference(),
      input.localElementNames,
      input.dependencyIdentityHandles,
      source.sourceAddressHandle,
      compactFieldProvenance([
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
      ]),
    );
    const compilationUnit = new TemplateCompilationUnit(
      unitProductHandle,
      unitIdentityHandle,
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

    const claims = this.recordsForClaims(local, input, templateSource, parseContext, rootContext, compilationUnit, source.provenanceHandle);
    records.push(...claims.allClaims);
    records.push(
      new TemplateAddress(
        templateAddressHandle,
        addressStabilityForTemplate(input),
        `template:${local}`,
        input.owner?.identityHandle ?? null,
        source.sourceAddressHandle,
      ),
      new TemplateIdentity(
        templateIdentityHandle,
        identityStabilityForTemplate(input),
        input.owner?.identityHandle ?? null,
        TemplatePhase.Authored,
        templateAddressHandle,
      ),
      new CompilerIdentity(
        parseContextIdentityHandle,
        IdentityStability.SourceStable,
        CompilerIdentityKind.TemplateParseContext,
        templateIdentityHandle,
        source.sourceAddressHandle,
        input.consumer,
      ),
      new CompilerIdentity(
        unitIdentityHandle,
        identityStabilityForTemplate(input),
        CompilerIdentityKind.TemplateCompilationUnit,
        templateIdentityHandle,
        source.sourceAddressHandle,
        input.unitKind,
      ),
      new CompilerIdentity(
        contextIdentityHandle,
        identityStabilityForTemplate(input),
        CompilerIdentityKind.TemplateCompilationContext,
        unitIdentityHandle,
        source.sourceAddressHandle,
        TemplateCompilationContextKind.Root,
      ),
      product(
        templateProductHandle,
        KernelVocabulary.Template.Source.key,
        templateIdentityHandle,
        source,
        claims.sourceClaims.map((claim) => claim.handle),
      ),
      product(parseContextProductHandle, KernelVocabulary.Template.ParseContext.key, parseContextIdentityHandle, source),
      product(
        unitProductHandle,
        KernelVocabulary.Compiler.CompilationUnit.key,
        unitIdentityHandle,
        source,
        claims.unitClaims.map((claim) => claim.handle),
      ),
      product(
        contextProductHandle,
        KernelVocabulary.Compiler.CompilationContext.key,
        contextIdentityHandle,
        source,
        claims.contextClaims.map((claim) => claim.handle),
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`template-compilation-unit:${local}`),
        DerivationPhase.Materialization,
        unitIdentityHandle,
        MaterializationState.Complete,
        [
          templateProductHandle,
          parseContextProductHandle,
          unitProductHandle,
          contextProductHandle,
        ],
        claims.allClaims.map((claim) => claim.handle),
      ),
    );

    return new TemplateCompilationUnitEmission(
      templateSource,
      parseContext,
      rootContext,
      compilationUnit,
      records,
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
        ProvenanceMode.Derived,
        [evidenceHandle],
        [],
        'Template compilation unit construction.',
      ),
    ];
    return new TemplateCompilationSourceSet(records, provenanceHandle, addressHandle);
  }

  private recordsForClaims(
    local: string,
    input: TemplateCompilationUnitConstructionInput,
    templateSource: TemplateSource,
    parseContext: TemplateParseContext,
    rootContext: TemplateCompilationContext,
    compilationUnit: TemplateCompilationUnit,
    provenanceHandle: ProvenanceHandle,
  ): TemplateCompilationClaimSet {
    const sourceClaims: SemanticClaim[] = [];
    if (input.owner?.productHandle != null) {
      sourceClaims.push(new SemanticClaim(
        this.store.handles.claim(`template-source:${local}:source-for-resource`),
        templateSource.productHandle,
        KernelVocabulary.Template.SourceForResource.key,
        input.owner.productHandle,
        provenanceHandle,
      ));
    }

    const unitClaims: SemanticClaim[] = [
      new SemanticClaim(
        this.store.handles.claim(`template-compilation-unit:${local}:compiles-template`),
        compilationUnit.productHandle,
        KernelVocabulary.Compiler.CompilesTemplate.key,
        templateSource.productHandle,
        provenanceHandle,
      ),
      new SemanticClaim(
        this.store.handles.claim(`template-compilation-unit:${local}:uses-world`),
        compilationUnit.productHandle,
        KernelVocabulary.Compiler.UsesWorld.key,
        input.compilerWorld.world.productHandle,
        provenanceHandle,
      ),
      new SemanticClaim(
        this.store.handles.claim(`template-compilation-unit:${local}:uses-parse-context`),
        compilationUnit.productHandle,
        KernelVocabulary.Compiler.UsesParseContext.key,
        parseContext.productHandle,
        provenanceHandle,
      ),
      new SemanticClaim(
        this.store.handles.claim(`template-compilation-unit:${local}:uses-root-context`),
        compilationUnit.productHandle,
        KernelVocabulary.Compiler.UsesCompilationContext.key,
        rootContext.productHandle,
        provenanceHandle,
      ),
    ];

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
    serviceClaims(local, rootContext.productHandle, rootContext.services, provenanceHandle, this.store).forEach((claim) => {
      contextClaims.push(claim);
    });

    return new TemplateCompilationClaimSet(sourceClaims, unitClaims, contextClaims);
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

function addressStabilityForTemplate(input: TemplateCompilationUnitConstructionInput): AddressStability {
  if (input.sourceAddressHandle != null) {
    return AddressStability.SourceStable;
  }
  if (input.owner?.identityHandle != null) {
    return AddressStability.SemanticStable;
  }
  return AddressStability.Session;
}

function identityStabilityForTemplate(input: TemplateCompilationUnitConstructionInput): IdentityStability {
  if (input.sourceAddressHandle != null) {
    return IdentityStability.SourceStable;
  }
  if (input.owner?.identityHandle != null) {
    return IdentityStability.SemanticStable;
  }
  return IdentityStability.Session;
}

function product(
  handle: ProductHandle,
  productKind: ProductKindKey,
  identityHandle: IdentityHandle,
  source: TemplateCompilationSourceSet,
  claimHandles: readonly ClaimHandle[] = [],
): MaterializedProduct {
  return new MaterializedProduct(
    handle,
    productKind,
    identityHandle,
    source.sourceAddressHandle,
    source.provenanceHandle,
    claimHandles,
  );
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
