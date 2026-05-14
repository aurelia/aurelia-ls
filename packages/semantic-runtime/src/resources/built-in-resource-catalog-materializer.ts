import {
  ExternalAddress,
} from '../kernel/address.js';
import { uniqueByKey } from '../collections.js';
import { SemanticClaim } from '../kernel/claim.js';
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
  AureliaResourceIdentity,
  CompilerIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { catalogGroupLocalKey, localKeyPart } from '../kernel/local-key.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import {
  frameworkRegistrationKindForAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import {
  FrameworkRegistrationCapability,
  frameworkRegistrationCapabilitiesForKind,
} from '../registration/framework-registration-manifest.js';
import {
  BuiltInResourceCatalog,
  type BuiltInResourceCatalogInput,
  ConfiguredBuiltInResourceCatalogSelection,
  I18nBuiltInResourceCatalogs,
  RuntimeHtmlBuiltInResourceCatalogs,
  RouterBuiltInResourceCatalogs,
  StateBuiltInResourceCatalogs,
  ValidationHtmlBuiltInResourceCatalogs,
  type BuiltInResource,
  type BuiltInResourceField,
  type BuiltInResourceGroup,
  type BuiltInResourcePackage,
} from './built-in-resources.js';
import type { FullResourceDefinition } from './resource-definition.js';
import { materializeBuiltInResourceDefinition } from './built-in-resource-definition-materializer.js';
import { BuiltInResourceTargetTypeProjector } from './built-in-resource-target-type.js';
import {
  toAureliaResourceIdentityKind,
} from './resource-kind.js';
import { ResourceProductDetails } from './product-details.js';
import type { TypeSystemProject } from '../type-system/project.js';

class BuiltInResourceSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly addressHandle: AddressHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

export class BuiltInResourceEmission {
  constructor(
    /** Built-in resource catalog product that owns this resource header. */
    readonly catalogProductHandle: ProductHandle,
    /** Materialized built-in resource header. */
    readonly resource: BuiltInResource,
    /** Framework-owned full definition for compiler/resource consumers, when modeled. */
    readonly definition: FullResourceDefinition | null,
  ) {}
}

export class BuiltInResourceCatalogEmission {
  constructor(
    readonly catalogs: readonly BuiltInResourceCatalog[],
    readonly resources: readonly BuiltInResourceEmission[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

export class ConfiguredBuiltInResourceCatalogEmission {
  constructor(
    readonly catalogEmission: BuiltInResourceCatalogEmission,
    readonly selections: readonly ConfiguredBuiltInResourceCatalogSelection[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class ConfiguredResourceSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class ConfiguredResourceSelectionEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly selection: ConfiguredBuiltInResourceCatalogSelection,
  ) {}
}

class ConfiguredResourceSelectionHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

class BuiltInResourceCatalogHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

class BuiltInResourceHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly definitionProductHandle: ProductHandle,
  ) {}
}

interface BuiltInResourceAliasEmission {
  readonly identity: AureliaResourceIdentity;
  readonly claim: SemanticClaim;
}

interface BuiltInResourcePublication {
  readonly records: readonly KernelStoreRecord[];
  readonly resource: BuiltInResource;
  readonly definition: FullResourceDefinition | null;
}

class BuiltInResourcePublicationMaterializer {
  constructor(
    readonly store: KernelStore,
  ) {}

  recordsForResource(
    resource: BuiltInResource,
    local: string,
    source: BuiltInResourceSourceSet,
    targetTypes: BuiltInResourceTargetTypeProjector | null,
  ): BuiltInResourcePublication {
    const handles = this.resourceHandles(local);
    const materializedResource = materializeResource(
      resource,
      handles.productHandle,
      handles.identityHandle,
      source.addressHandle,
      [],
    );
    const definition = materializeBuiltInResourceDefinition(
      materializedResource,
      local,
      handles.definitionProductHandle,
      handles.identityHandle,
      source,
      targetTypes,
    );
    return this.resourcePublication(local, handles, materializedResource, definition, source);
  }

  private resourcePublication(
    local: string,
    handles: BuiltInResourceHandles,
    materializedResource: BuiltInResource,
    definition: FullResourceDefinition | null,
    source: BuiltInResourceSourceSet,
  ): BuiltInResourcePublication {
    const declareClaim = this.declareClaimForResource(local, handles, source);
    const aliasEmissions = this.aliasEmissionsForResource(local, handles, materializedResource, source);
    const convergenceClaim = this.convergenceClaimForResource(local, handles, definition, source);
    return {
      records: this.recordsForResourcePublication(
        local,
        handles,
        materializedResource,
        definition,
        declareClaim,
        aliasEmissions,
        convergenceClaim,
        source,
      ),
      resource: materializedResource,
      definition,
    };
  }

  private resourceHandles(local: string): BuiltInResourceHandles {
    return new BuiltInResourceHandles(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      this.store.handles.product(`${local}:definition`),
    );
  }

  private declareClaimForResource(
    local: string,
    handles: BuiltInResourceHandles,
    source: BuiltInResourceSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:declares`),
      handles.productHandle,
      KernelVocabulary.Resource.Declares.key,
      handles.identityHandle,
      source.provenanceHandle,
    );
  }

  private aliasEmissionsForResource(
    local: string,
    handles: BuiltInResourceHandles,
    resource: BuiltInResource,
    source: BuiltInResourceSourceSet,
  ): readonly BuiltInResourceAliasEmission[] {
    return resource.aliases.map((alias, index) => {
      const aliasIdentityHandle = this.store.handles.identity(`${local}:alias:${localKeyPart(alias)}`);
      return {
        identity: new AureliaResourceIdentity(
          aliasIdentityHandle,
          toAureliaResourceIdentityKind(resource.resourceKind),
          alias,
          null,
        ),
        claim: new SemanticClaim(
          this.store.handles.claim(`${local}:alias:${index}`),
          aliasIdentityHandle,
          KernelVocabulary.Resource.AliasOf.key,
          handles.identityHandle,
          source.provenanceHandle,
        ),
      };
    });
  }

  private convergenceClaimForResource(
    local: string,
    handles: BuiltInResourceHandles,
    definition: FullResourceDefinition | null,
    source: BuiltInResourceSourceSet,
  ): SemanticClaim | null {
    return definition == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`${local}:converges-to-definition`),
        handles.productHandle,
        KernelVocabulary.Resource.ConvergesToDefinition.key,
        handles.definitionProductHandle,
        source.provenanceHandle,
      );
  }

  private recordsForResourcePublication(
    local: string,
    handles: BuiltInResourceHandles,
    resource: BuiltInResource,
    definition: FullResourceDefinition | null,
    declareClaim: SemanticClaim,
    aliasEmissions: readonly BuiltInResourceAliasEmission[],
    convergenceClaim: SemanticClaim | null,
    source: BuiltInResourceSourceSet,
  ): readonly KernelStoreRecord[] {
    const claimHandles = resourcePublicationClaimHandles(declareClaim, aliasEmissions, convergenceClaim);
    return [
      this.builtInResourceIdentity(handles, resource),
      declareClaim,
      ...aliasEmissions.flatMap((alias) => [alias.identity, alias.claim]),
      ...(convergenceClaim == null ? [] : [convergenceClaim]),
      this.builtInResourceHeaderProduct(handles, source),
      ...this.builtInResourceDefinitionProduct(handles, definition, source),
      this.builtInResourceMaterialization(local, handles, definition, claimHandles),
    ];
  }

  private builtInResourceIdentity(
    handles: BuiltInResourceHandles,
    resource: BuiltInResource,
  ): AureliaResourceIdentity {
    return new AureliaResourceIdentity(
      handles.identityHandle,
      toAureliaResourceIdentityKind(resource.resourceKind),
      resource.name,
      null,
    );
  }

  private builtInResourceHeaderProduct(
    handles: BuiltInResourceHandles,
    source: BuiltInResourceSourceSet,
  ): MaterializedProduct {
    return new MaterializedProduct(
      handles.productHandle,
      KernelVocabulary.Resource.DefinitionHeader.key,
      handles.identityHandle,
      source.addressHandle,
      source.provenanceHandle,
    );
  }

  private builtInResourceDefinitionProduct(
    handles: BuiltInResourceHandles,
    definition: FullResourceDefinition | null,
    source: BuiltInResourceSourceSet,
  ): readonly MaterializedProduct[] {
    return definition == null ? [] : [
      new MaterializedProduct(
        handles.definitionProductHandle,
        KernelVocabulary.Resource.Definition.key,
        handles.identityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
    ];
  }

  private builtInResourceMaterialization(
    local: string,
    handles: BuiltInResourceHandles,
    definition: FullResourceDefinition | null,
    claimHandles: readonly ClaimHandle[],
  ): MaterializationRecord {
    return new MaterializationRecord(
      this.store.handles.materialization(local),
      handles.identityHandle,
      definition == null
        ? [handles.productHandle]
        : [handles.productHandle, handles.definitionProductHandle],
      claimHandles,
    );
  }
}

/** Materializes framework-owned resource headers and static full definitions before compiler-world visibility is decided. */
export class BuiltInResourceCatalogMaterializer {
  private readonly resourcePublication: BuiltInResourcePublicationMaterializer;

  constructor(
    /** Hot analysis store that receives built-in resource records. */
    readonly store: KernelStore,
  ) {
    this.resourcePublication = new BuiltInResourcePublicationMaterializer(store);
  }

  materialize(
    catalogInputs: readonly BuiltInResourceCatalogInput[],
    typeSystem: TypeSystemProject | null = null,
  ): BuiltInResourceCatalogEmission {
    const records: KernelStoreRecord[] = [];
    const catalogs: BuiltInResourceCatalog[] = [];
    const resources: BuiltInResourceEmission[] = [];
    const targetTypes = typeSystem == null
      ? null
      : new BuiltInResourceTargetTypeProjector(this.store, typeSystem);

    for (const input of catalogInputs) {
      const emission = this.recordsForCatalog(input, targetTypes);
      if (this.store.readProduct(emission.catalog.productHandle) == null) {
        records.push(...emission.records);
      }
      catalogs.push(emission.catalog);
      resources.push(...emission.resources);
    }

    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'built-in-resource-catalogs'));
    }

    const emission = new BuiltInResourceCatalogEmission(catalogs, resources, records);
    this.registerProductDetails(emission);
    return emission;
  }

  private registerProductDetails(emission: BuiltInResourceCatalogEmission): void {
    for (const catalog of emission.catalogs) {
      this.store.productDetails.addIfAbsent(ResourceProductDetails.BuiltInCatalog, catalog.productHandle, catalog);
    }
    for (const resource of emission.resources) {
      if (resource.resource.productHandle != null) {
        this.store.productDetails.addIfAbsent(
          ResourceProductDetails.DefinitionHeader,
          resource.resource.productHandle,
          resource.resource,
        );
      }
      if (resource.definition?.productHandle != null) {
        this.store.productDetails.addIfAbsent(
          ResourceProductDetails.Definition,
          resource.definition.productHandle,
          resource.definition,
        );
      }
    }
  }

  private recordsForCatalog(
    input: BuiltInResourceCatalogInput,
    targetTypes: BuiltInResourceTargetTypeProjector | null,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly catalog: BuiltInResourceCatalog;
    readonly resources: readonly BuiltInResourceEmission[];
  } {
    const local = resourceCatalogLocal(input);
    const source = this.recordsForSource(
      `${local}:source`,
      input.packageId,
      input.group,
      `Framework built-in resource catalog ${input.packageId}/${input.group}.`,
    );
    const handles = this.catalogHandles(local);
    const resourceEmissions = this.resourceEmissionsForCatalog(input, local, source, targetTypes);
    const materializedResources = resourceEmissions.map((emission) => emission.resource);
    const catalog = this.createCatalog(input, handles, source, materializedResources);
    const catalogClaims = this.catalogClaimsForResources(local, handles.productHandle, resourceEmissions, source);
    const records = [
      ...source.records,
      ...resourceEmissions.flatMap((emission) => emission.records),
      ...this.recordsForCatalogProduct(
        local,
        input,
        source,
        handles,
        catalog,
        resourceEmissions,
        catalogClaims,
      ),
    ];

    return {
      records,
      catalog,
      resources: resourceEmissions.map((emission) =>
        new BuiltInResourceEmission(catalog.productHandle, emission.resource, emission.definition)
      ),
    };
  }

  private catalogHandles(local: string): BuiltInResourceCatalogHandles {
    return new BuiltInResourceCatalogHandles(
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }

  private resourceEmissionsForCatalog(
    input: BuiltInResourceCatalogInput,
    local: string,
    source: BuiltInResourceSourceSet,
    targetTypes: BuiltInResourceTargetTypeProjector | null,
  ): readonly BuiltInResourcePublication[] {
    return input.resources.map((resource, index) =>
      this.resourcePublication.recordsForResource(
        resource,
        `${local}:resource:${localKeyPart(resource.resourceKind)}:${localKeyPart(resource.name)}:${index}`,
        source,
        targetTypes,
      )
    );
  }

  private createCatalog(
    input: BuiltInResourceCatalogInput,
    handles: BuiltInResourceCatalogHandles,
    source: BuiltInResourceSourceSet,
    resources: readonly BuiltInResource[],
  ): BuiltInResourceCatalog {
    return new BuiltInResourceCatalog(
      handles.productHandle,
      handles.identityHandle,
      input.packageId,
      input.group,
      resources,
      source.addressHandle,
      [],
    );
  }

  private catalogClaimsForResources(
    local: string,
    catalogProductHandle: ProductHandle,
    resourceEmissions: readonly {
      readonly resource: BuiltInResource;
    }[],
    source: BuiltInResourceSourceSet,
  ): readonly SemanticClaim[] {
    return resourceEmissions.map((emission, index) => new SemanticClaim(
      this.store.handles.claim(`${local}:contains-resource:${index}`),
      catalogProductHandle,
      KernelVocabulary.Resource.ContainsDefinitionHeader.key,
      emission.resource.productHandle!,
      source.provenanceHandle,
    ));
  }

  private recordsForCatalogProduct(
    local: string,
    input: BuiltInResourceCatalogInput,
    source: BuiltInResourceSourceSet,
    handles: BuiltInResourceCatalogHandles,
    catalog: BuiltInResourceCatalog,
    resourceEmissions: readonly {
      readonly resource: BuiltInResource;
      readonly definition: FullResourceDefinition | null;
    }[],
    claims: readonly SemanticClaim[],
  ): readonly KernelStoreRecord[] {
    return [
      ...claims,
      this.catalogIdentity(input, source, handles),
      this.catalogProduct(source, handles),
      this.catalogMaterialization(local, handles, catalog, resourceEmissions, claims),
    ];
  }

  private catalogIdentity(
    input: BuiltInResourceCatalogInput,
    source: BuiltInResourceSourceSet,
    handles: BuiltInResourceCatalogHandles,
  ): CompilerIdentity {
    return new CompilerIdentity(
      handles.identityHandle,
      KernelVocabulary.Resource.BuiltInCatalog.key,
      null,
      source.addressHandle,
      `${input.packageId}:${input.group}`,
    );
  }

  private catalogProduct(
    source: BuiltInResourceSourceSet,
    handles: BuiltInResourceCatalogHandles,
  ): MaterializedProduct {
    return new MaterializedProduct(
      handles.productHandle,
      KernelVocabulary.Resource.BuiltInCatalog.key,
      handles.identityHandle,
      source.addressHandle,
      source.provenanceHandle,
    );
  }

  private catalogMaterialization(
    local: string,
    handles: BuiltInResourceCatalogHandles,
    catalog: BuiltInResourceCatalog,
    resourceEmissions: readonly {
      readonly definition: FullResourceDefinition | null;
    }[],
    claims: readonly SemanticClaim[],
  ): MaterializationRecord {
    return new MaterializationRecord(
      this.store.handles.materialization(local),
      handles.identityHandle,
      this.catalogMaterializedProductHandles(handles, catalog, resourceEmissions),
      claims.map((claim) => claim.handle),
    );
  }

  private catalogMaterializedProductHandles(
    handles: BuiltInResourceCatalogHandles,
    catalog: BuiltInResourceCatalog,
    resourceEmissions: readonly {
      readonly definition: FullResourceDefinition | null;
    }[],
  ): readonly ProductHandle[] {
    return [
      handles.productHandle,
      ...catalog.resources.map((resource) => resource.productHandle!),
      ...resourceEmissions.flatMap((emission) =>
        emission.definition?.productHandle == null ? [] : [emission.definition.productHandle]
      ),
    ];
  }

  private recordsForSource(
    local: string,
    packageId: BuiltInResourcePackage,
    group: BuiltInResourceGroup,
    summary: string,
  ): BuiltInResourceSourceSet {
    const addressHandle = this.store.handles.address(local);
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    const records: KernelStoreRecord[] = [
      new ExternalAddress(
        addressHandle,
        'aurelia-package-catalog',
        `${packageId}:${group}`,
        summary,
      ),
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.External,
        [EvidenceRole.Admission, EvidenceRole.Registration],
        summary,
        addressHandle,
      ),
      new ProvenanceRecord(
        provenanceHandle,
        [evidenceHandle],
      ),
    ];
    return new BuiltInResourceSourceSet(records, addressHandle, provenanceHandle);
  }
}

/**
 * Selects framework-owned resource catalogs admitted by known framework registrations.
 *
 * This is not final template-scope visibility. It says that recognized framework registration effects made these
 * built-in resource headers available to DI resource-slot spending.
 */
export class ConfiguredBuiltInResourceCatalogMaterializer {
  private readonly catalogMaterializer: BuiltInResourceCatalogMaterializer;

  constructor(
    /** Hot analysis store that receives configured resource-catalog selection records. */
    readonly store: KernelStore,
  ) {
    this.catalogMaterializer = new BuiltInResourceCatalogMaterializer(store);
  }

  materialize(
    configuration: ConfigurationKernelEmission,
    typeSystem: TypeSystemProject | null = null,
  ): ConfiguredBuiltInResourceCatalogEmission {
    const selectionRequests = readConfiguredResourceCatalogRequests(configuration);
    const catalogEmission = this.catalogEmissionForRequests(selectionRequests, typeSystem);
    const selectionEmission = this.selectionEmissionForRequests(selectionRequests, catalogEmission);
    this.commitSelectionRecords(selectionEmission.records);
    this.registerSelectionDetails(selectionEmission.selections);

    return new ConfiguredBuiltInResourceCatalogEmission(
      catalogEmission,
      selectionEmission.selections,
      selectionEmission.records,
    );
  }

  private catalogEmissionForRequests(
    selectionRequests: readonly ConfiguredResourceCatalogRequest[],
    typeSystem: TypeSystemProject | null,
  ): BuiltInResourceCatalogEmission {
    const catalogInputs = uniqueByKey(
      selectionRequests.flatMap((request) => request.catalogInputs),
      resourceCatalogInputKey,
    );
    return this.catalogMaterializer.materialize(catalogInputs, typeSystem);
  }

  private selectionEmissionForRequests(
    selectionRequests: readonly ConfiguredResourceCatalogRequest[],
    catalogEmission: BuiltInResourceCatalogEmission,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly selections: readonly ConfiguredBuiltInResourceCatalogSelection[];
  } {
    const catalogsByKey = new Map(catalogEmission.catalogs.map((catalog) => [catalogGroupLocalKey(catalog), catalog]));
    const records: KernelStoreRecord[] = [];
    const selections: ConfiguredBuiltInResourceCatalogSelection[] = [];
    for (const request of selectionRequests) {
      const catalogs = this.catalogsForRequest(request, catalogsByKey);
      if (catalogs.length === 0) {
        continue;
      }
      const emission = this.recordsForSelection(request.admission, request.frameworkKind, catalogs);
      if (this.store.readProduct(emission.selection.productHandle) == null) {
        records.push(...emission.records);
      }
      selections.push(emission.selection);
    }
    return { records, selections };
  }

  private catalogsForRequest(
    request: ConfiguredResourceCatalogRequest,
    catalogsByKey: ReadonlyMap<string, BuiltInResourceCatalog>,
  ): readonly BuiltInResourceCatalog[] {
    return request.catalogInputs
      .map((catalogInput) => catalogsByKey.get(resourceCatalogInputKey(catalogInput)) ?? null)
      .filter((catalog): catalog is BuiltInResourceCatalog => catalog != null);
  }

  private commitSelectionRecords(records: readonly KernelStoreRecord[]): void {
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'configured-built-in-resource-catalogs'));
    }
  }

  private registerSelectionDetails(selections: readonly ConfiguredBuiltInResourceCatalogSelection[]): void {
    for (const selection of selections) {
      this.store.productDetails.addIfAbsent(
        ResourceProductDetails.ConfiguredBuiltInResourceCatalogSelection,
        selection.productHandle,
        selection,
      );
    }
  }

  private recordsForSelection(
    admission: RegistrationAdmissionProduct,
    frameworkKind: FrameworkRegistrationKind,
    catalogs: readonly BuiltInResourceCatalog[],
  ): ConfiguredResourceSelectionEmission {
    const local = `configured-resource-catalog:${admission.productHandle}`;
    const source = this.recordsForConfiguredSource(
      local,
      admission.sourceAddressHandle,
      resourceCatalogSummaryForFrameworkKind(frameworkKind),
    );
    const handles = this.configuredSelectionHandles(local);
    const claims = this.claimsForConfiguredSelection(local, handles.productHandle, catalogs, source);
    const selection = this.createConfiguredSelection(admission, frameworkKind, catalogs, handles, source);
    return new ConfiguredResourceSelectionEmission(
      this.recordsForConfiguredSelectionProduct(local, admission, frameworkKind, source, handles, claims),
      selection,
    );
  }

  private configuredSelectionHandles(local: string): ConfiguredResourceSelectionHandles {
    return new ConfiguredResourceSelectionHandles(
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }

  private claimsForConfiguredSelection(
    local: string,
    selectionProductHandle: ProductHandle,
    catalogs: readonly BuiltInResourceCatalog[],
    source: ConfiguredResourceSourceSet,
  ): readonly SemanticClaim[] {
    return catalogs.map((catalog, index) => new SemanticClaim(
      this.store.handles.claim(`${local}:admits-resource-catalog:${index}`),
      selectionProductHandle,
      KernelVocabulary.Compiler.AdmitsResourceCatalog.key,
      catalog.productHandle,
      source.provenanceHandle,
    ));
  }

  private createConfiguredSelection(
    admission: RegistrationAdmissionProduct,
    frameworkKind: FrameworkRegistrationKind,
    catalogs: readonly BuiltInResourceCatalog[],
    handles: ConfiguredResourceSelectionHandles,
    source: ConfiguredResourceSourceSet,
  ): ConfiguredBuiltInResourceCatalogSelection {
    return new ConfiguredBuiltInResourceCatalogSelection(
      handles.productHandle,
      handles.identityHandle,
      admission.productHandle,
      frameworkKind,
      catalogs.map((catalog) => catalog.productHandle),
      admission.sourceAddressHandle,
    );
  }

  private recordsForConfiguredSelectionProduct(
    local: string,
    admission: RegistrationAdmissionProduct,
    frameworkKind: FrameworkRegistrationKind,
    source: ConfiguredResourceSourceSet,
    handles: ConfiguredResourceSelectionHandles,
    claims: readonly SemanticClaim[],
  ): readonly KernelStoreRecord[] {
    return [
      ...source.records,
      new CompilerIdentity(
        handles.identityHandle,
        KernelVocabulary.Compiler.ConfiguredResourceCatalogSelection.key,
        admission.identityHandle,
        admission.sourceAddressHandle,
        frameworkKind,
      ),
      ...claims,
      new MaterializedProduct(
        handles.productHandle,
        KernelVocabulary.Compiler.ConfiguredResourceCatalogSelection.key,
        handles.identityHandle,
        admission.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(local),
        handles.identityHandle,
        [handles.productHandle],
        claims.map((claim) => claim.handle),
      ),
    ];
  }

  private recordsForConfiguredSource(
    local: string,
    addressHandle: AddressHandle | null,
    summary: string,
  ): ConfiguredResourceSourceSet {
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    return new ConfiguredResourceSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.ConfigurationFlow,
          [EvidenceRole.Admission, EvidenceRole.Registration],
          summary,
          addressHandle,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          [evidenceHandle],
        ),
      ],
      provenanceHandle,
    );
  }
}

class ConfiguredResourceCatalogRequest {
  constructor(
    readonly admission: RegistrationAdmissionProduct,
    readonly frameworkKind: FrameworkRegistrationKind,
    readonly catalogInputs: readonly BuiltInResourceCatalogInput[],
  ) {}
}

function readConfiguredResourceCatalogRequests(
  configuration: ConfigurationKernelEmission,
): readonly ConfiguredResourceCatalogRequest[] {
  const requests: ConfiguredResourceCatalogRequest[] = [];
  for (const admission of configuration.registrationAdmissions) {
    const frameworkKind = frameworkRegistrationKindForAdmission(admission);
    if (frameworkKind == null) {
      continue;
    }
    const catalogInputs = catalogInputsForFrameworkKind(frameworkKind);
    if (catalogInputs.length === 0) {
      continue;
    }
    requests.push(new ConfiguredResourceCatalogRequest(admission, frameworkKind, catalogInputs));
  }
  return requests;
}

function catalogInputsForFrameworkKind(
  frameworkKind: FrameworkRegistrationKind,
): readonly BuiltInResourceCatalogInput[] {
  const inputs: BuiltInResourceCatalogInput[] = [];
  for (const capability of frameworkRegistrationCapabilitiesForKind(frameworkKind)) {
    switch (capability) {
      case FrameworkRegistrationCapability.RuntimeHtmlDefaultResources:
        inputs.push(RuntimeHtmlBuiltInResourceCatalogs.DefaultResources);
        break;
      case FrameworkRegistrationCapability.I18nDefaultResources:
        inputs.push(I18nBuiltInResourceCatalogs.DefaultResources);
        break;
      case FrameworkRegistrationCapability.RouterDefaultResources:
        inputs.push(RouterBuiltInResourceCatalogs.DefaultResources);
        break;
      case FrameworkRegistrationCapability.StateDefaultResources:
        inputs.push(StateBuiltInResourceCatalogs.DefaultResources);
        break;
      case FrameworkRegistrationCapability.ValidationHtmlDefaultResources:
        inputs.push(ValidationHtmlBuiltInResourceCatalogs.DefaultResources);
        break;
      case FrameworkRegistrationCapability.RuntimeHtmlCompilerServices:
      case FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingSyntax:
      case FrameworkRegistrationCapability.RuntimeHtmlShortHandBindingSyntax:
      case FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingLanguage:
      case FrameworkRegistrationCapability.RuntimeHtmlDefaultRenderers:
      case FrameworkRegistrationCapability.I18nTranslationSyntax:
      case FrameworkRegistrationCapability.I18nTranslationRenderers:
      case FrameworkRegistrationCapability.I18nServiceResolvers:
      case FrameworkRegistrationCapability.I18nLifecycleTasks:
      case FrameworkRegistrationCapability.ValidationServiceResolvers:
      case FrameworkRegistrationCapability.ValidationHtmlServiceResolvers:
      case FrameworkRegistrationCapability.RouterDefaultComponents:
      case FrameworkRegistrationCapability.RouterConfigurationResolvers:
      case FrameworkRegistrationCapability.RouterLifecycleTasks:
      case FrameworkRegistrationCapability.StateBindingSyntax:
      case FrameworkRegistrationCapability.StateRuntimeRenderers:
      case FrameworkRegistrationCapability.StateStoreResolvers:
      case FrameworkRegistrationCapability.StateStoreTasks:
      case FrameworkRegistrationCapability.AppTask:
        break;
    }
  }
  return inputs;
}

function resourceCatalogInputKey(input: BuiltInResourceCatalogInput): string {
  return catalogGroupLocalKey(input);
}

function resourceCatalogLocal(input: BuiltInResourceCatalogInput): string {
  return `built-in-resource:${catalogGroupLocalKey(input)}`;
}

function resourcePublicationClaimHandles(
  declareClaim: SemanticClaim,
  aliasEmissions: readonly BuiltInResourceAliasEmission[],
  convergenceClaim: SemanticClaim | null,
): readonly ClaimHandle[] {
  return [
    declareClaim.handle,
    ...aliasEmissions.map((alias) => alias.claim.handle),
    ...(convergenceClaim == null ? [] : [convergenceClaim.handle]),
  ];
}

function resourceCatalogSummaryForFrameworkKind(frameworkKind: FrameworkRegistrationKind): string {
  switch (frameworkKind) {
    case FrameworkRegistrationKind.StandardConfiguration:
      return 'RuntimeHtml StandardConfiguration admitted framework default resource headers.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultComponents:
      return 'RuntimeHtml DefaultComponents admitted compiler services but no resource headers.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return 'RuntimeHtml DefaultResources spread admitted framework default resource headers.';
    case FrameworkRegistrationKind.I18nConfiguration:
      return 'I18nConfiguration admitted i18n value-converter and binding-behavior resource headers.';
    case FrameworkRegistrationKind.ValidationConfiguration:
      return 'ValidationConfiguration admitted validation services but no resource headers.';
    case FrameworkRegistrationKind.ValidationHtmlConfiguration:
      return 'ValidationHtmlConfiguration admitted validation binding-behavior, subscriber custom-attribute, and container custom-element resource headers.';
    case FrameworkRegistrationKind.RouterConfiguration:
      return 'RouterConfiguration admitted router custom-attribute and viewport resource headers.';
    case FrameworkRegistrationKind.RouterDefaultComponents:
      return 'Router DefaultComponents admitted router services but no resource headers.';
    case FrameworkRegistrationKind.RouterDefaultResources:
      return 'Router DefaultResources spread admitted router custom-attribute and viewport resource headers.';
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return 'StateDefaultConfiguration admitted state binding-behavior resource headers.';
    case FrameworkRegistrationKind.DialogConfiguration:
      return 'DialogConfiguration admitted dialog services but no resource headers.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
      return 'RuntimeHtml syntax-only registration group did not admit resource headers.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultRenderers:
      return 'RuntimeHtml DefaultRenderers admitted renderers but no resource headers.';
    case FrameworkRegistrationKind.AppTask:
      return 'AppTask registry does not admit resource catalogs.';
  }
}

type BuiltInResourceConstructor = new (
  productHandle?: ProductHandle | null,
  identityHandle?: IdentityHandle | null,
  sourceAddressHandle?: AddressHandle | null,
  fieldProvenance?: readonly FieldProvenance<BuiltInResourceField>[],
) => BuiltInResource;

function materializeResource(
  resource: BuiltInResource,
  productHandle: ProductHandle,
  identityHandle: IdentityHandle,
  sourceAddressHandle: AddressHandle,
  fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[],
): BuiltInResource {
  const Constructor = resource.constructor as BuiltInResourceConstructor;
  return new Constructor(productHandle, identityHandle, sourceAddressHandle, fieldProvenance);
}
