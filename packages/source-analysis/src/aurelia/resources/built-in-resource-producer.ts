import {
  AddressStability,
  ExternalAddress,
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
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  AureliaResourceIdentity,
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
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import {
  frameworkRegistrationKindForAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import {
  BuiltInResourceCatalog,
  type BuiltInResourceCatalogField,
  type BuiltInResourceCatalogInput,
  ConfiguredBuiltInResourceCatalogSelection,
  type ConfiguredBuiltInResourceCatalogSelectionField,
  I18nBuiltInResourceCatalogs,
  RuntimeHtmlBuiltInResourceCatalogs,
  StateBuiltInResourceCatalogs,
  type BuiltInResource,
  type BuiltInResourceField,
  type BuiltInResourceGroup,
  type BuiltInResourcePackage,
} from './built-in-resources.js';
import { toAureliaResourceIdentityKind } from './resource-kind.js';

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

/** Materializes framework-owned resource definition headers before compiler-world visibility is decided. */
export class BuiltInResourceCatalogProducer {
  constructor(
    /** Hot analysis store that receives built-in resource records. */
    readonly store: KernelStore,
  ) {}

  materialize(catalogInputs: readonly BuiltInResourceCatalogInput[]): BuiltInResourceCatalogEmission {
    const records: KernelStoreRecord[] = [];
    const catalogs: BuiltInResourceCatalog[] = [];
    const resources: BuiltInResourceEmission[] = [];

    for (const input of catalogInputs) {
      const emission = this.recordsForCatalog(input);
      if (this.store.readProduct(emission.catalog.productHandle) == null) {
        records.push(...emission.records);
      }
      catalogs.push(emission.catalog);
      resources.push(...emission.resources);
    }

    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'built-in-resource-catalogs'));
    }

    return new BuiltInResourceCatalogEmission(catalogs, resources, records);
  }

  private recordsForCatalog(input: BuiltInResourceCatalogInput): {
    readonly records: readonly KernelStoreRecord[];
    readonly catalog: BuiltInResourceCatalog;
    readonly resources: readonly BuiltInResourceEmission[];
  } {
    const records: KernelStoreRecord[] = [];
    const local = `built-in-resource:${input.packageId}:${input.group}`;
    const source = this.recordsForSource(
      `${local}:source`,
      input.packageId,
      input.group,
      `Framework built-in resource catalog ${input.packageId}/${input.group}.`,
    );
    records.push(...source.records);

    const catalogProductHandle = this.store.handles.product(local);
    const catalogIdentityHandle = this.store.handles.identity(local);
    const resourceEmissions = input.resources.map((resource, index) =>
      this.recordsForResource(
        resource,
        `${local}:resource:${resource.resourceKind}:${resource.name}:${index}`,
        catalogProductHandle,
        catalogIdentityHandle,
        source,
      )
    );
    for (const emission of resourceEmissions) {
      records.push(...emission.records);
    }

    const catalogClaims = resourceEmissions.map((emission, index) => new SemanticClaim(
      this.store.handles.claim(`${local}:contains-resource:${index}`),
      catalogProductHandle,
      KernelVocabulary.Resource.ContainsDefinitionHeader.key,
      emission.resource.productHandle!,
      source.provenanceHandle,
    ));
    records.push(...catalogClaims);

    const materializedResources = resourceEmissions.map((emission) => emission.resource);
    const catalog = new BuiltInResourceCatalog(
      catalogProductHandle,
      catalogIdentityHandle,
      input.packageId,
      input.group,
      materializedResources,
      source.addressHandle,
      compactFieldProvenance<BuiltInResourceCatalogField>([
        new FieldProvenance('packageId', source.provenanceHandle),
        new FieldProvenance('group', source.provenanceHandle),
        materializedResources.length === 0 ? null : new FieldProvenance('resources', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    records.push(
      new CompilerIdentity(
        catalogIdentityHandle,
        IdentityStability.CrossProjectStable,
        CompilerIdentityKind.BuiltInResourceCatalog,
        null,
        source.addressHandle,
        `${input.packageId}:${input.group}`,
      ),
      new MaterializedProduct(
        catalogProductHandle,
        KernelVocabulary.Resource.BuiltInCatalog.key,
        catalogIdentityHandle,
        source.addressHandle,
        source.provenanceHandle,
        catalogClaims.map((claim) => claim.handle),
      ),
      new MaterializationRecord(
        this.store.handles.materialization(local),
        DerivationPhase.Materialization,
        catalogIdentityHandle,
        MaterializationState.Complete,
        [
          catalogProductHandle,
          ...materializedResources.map((resource) => resource.productHandle!),
        ],
        catalogClaims.map((claim) => claim.handle),
      ),
    );

    return {
      records,
      catalog,
      resources: resourceEmissions.map((emission) =>
        new BuiltInResourceEmission(catalogProductHandle, emission.resource)
      ),
    };
  }

  private recordsForResource(
    resource: BuiltInResource,
    local: string,
    catalogProductHandle: ProductHandle,
    catalogIdentityHandle: IdentityHandle,
    source: BuiltInResourceSourceSet,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly resource: BuiltInResource;
  } {
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const fieldProvenance = compactFieldProvenance<BuiltInResourceField>([
      new FieldProvenance('targetName', source.provenanceHandle),
      new FieldProvenance('resourceKind', source.provenanceHandle),
      new FieldProvenance('name', source.provenanceHandle),
      resource.aliases.length === 0 ? null : new FieldProvenance('aliases', source.provenanceHandle),
      new FieldProvenance('packageId', source.provenanceHandle),
      new FieldProvenance('group', source.provenanceHandle),
      new FieldProvenance('source', source.provenanceHandle),
    ]);
    const materializedResource = materializeResource(resource, productHandle, identityHandle, source.addressHandle, fieldProvenance);
    const declareClaim = new SemanticClaim(
      this.store.handles.claim(`${local}:declares`),
      productHandle,
      KernelVocabulary.Resource.Declares.key,
      identityHandle,
      source.provenanceHandle,
    );
    const aliasClaims = materializedResource.aliases.map((alias, index) => {
      const aliasIdentityHandle = this.store.handles.identity(`${local}:alias:${alias}`);
      return {
        identity: new AureliaResourceIdentity(
          aliasIdentityHandle,
          IdentityStability.SemanticStable,
          toAureliaResourceIdentityKind(materializedResource.resourceKind),
          alias,
          null,
        ),
        claim: new SemanticClaim(
          this.store.handles.claim(`${local}:alias:${index}`),
          aliasIdentityHandle,
          KernelVocabulary.Resource.AliasOf.key,
          identityHandle,
          source.provenanceHandle,
        ),
      };
    });
    const claimHandles = [
      declareClaim.handle,
      ...aliasClaims.map((alias) => alias.claim.handle),
    ];
    return {
      records: [
        new AureliaResourceIdentity(
          identityHandle,
          IdentityStability.CrossProjectStable,
          toAureliaResourceIdentityKind(materializedResource.resourceKind),
          materializedResource.name,
          null,
        ),
        declareClaim,
        ...aliasClaims.flatMap((alias) => [alias.identity, alias.claim]),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Resource.DefinitionHeader.key,
          identityHandle,
          source.addressHandle,
          source.provenanceHandle,
          claimHandles,
        ),
        new MaterializationRecord(
          this.store.handles.materialization(local),
          DerivationPhase.Materialization,
          identityHandle,
          MaterializationState.Complete,
          [productHandle],
          claimHandles,
        ),
      ],
      resource: materializedResource,
    };
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
        AddressStability.ExternalStable,
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
        ProvenanceMode.Direct,
        [evidenceHandle],
        [],
        summary,
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
export class ConfiguredBuiltInResourceCatalogProducer {
  private readonly catalogProducer: BuiltInResourceCatalogProducer;

  constructor(
    /** Hot analysis store that receives configured resource-catalog selection records. */
    readonly store: KernelStore,
  ) {
    this.catalogProducer = new BuiltInResourceCatalogProducer(store);
  }

  materialize(configuration: ConfigurationKernelEmission): ConfiguredBuiltInResourceCatalogEmission {
    const selectionInputs = readConfiguredResourceCatalogInputs(configuration);
    const catalogInputs = uniqueCatalogInputs(selectionInputs.flatMap((input) => input.catalogInputs));
    const catalogEmission = this.catalogProducer.materialize(catalogInputs);
    const catalogsByKey = new Map(catalogEmission.catalogs.map((catalog) => [catalogKey(catalog), catalog]));

    const records: KernelStoreRecord[] = [];
    const selections: ConfiguredBuiltInResourceCatalogSelection[] = [];
    for (const input of selectionInputs) {
      const catalogs = input.catalogInputs
        .map((catalogInput) => catalogsByKey.get(catalogInputKey(catalogInput)) ?? null)
        .filter((catalog): catalog is BuiltInResourceCatalog => catalog != null);
      if (catalogs.length === 0) {
        continue;
      }
      const emission = this.recordsForSelection(input.admission, input.frameworkKind, catalogs);
      if (this.store.readProduct(emission.selection.productHandle) == null) {
        records.push(...emission.records);
      }
      selections.push(emission.selection);
    }

    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'configured-built-in-resource-catalogs'));
    }

    return new ConfiguredBuiltInResourceCatalogEmission(catalogEmission, selections, records);
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
      summaryForFrameworkKind(frameworkKind),
    );
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const claims = catalogs.map((catalog, index) => new SemanticClaim(
      this.store.handles.claim(`${local}:admits-resource-catalog:${index}`),
      productHandle,
      KernelVocabulary.Compiler.AdmitsResourceCatalog.key,
      catalog.productHandle,
      source.provenanceHandle,
    ));
    const selection = new ConfiguredBuiltInResourceCatalogSelection(
      productHandle,
      identityHandle,
      admission.productHandle,
      frameworkKind,
      catalogs.map((catalog) => catalog.productHandle),
      admission.sourceAddressHandle,
      compactFieldProvenance<ConfiguredBuiltInResourceCatalogSelectionField>([
        new FieldProvenance('registrationAdmission', source.provenanceHandle),
        new FieldProvenance('frameworkKind', source.provenanceHandle),
        new FieldProvenance('catalogs', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    return new ConfiguredResourceSelectionEmission(
      [
        ...source.records,
        new CompilerIdentity(
          identityHandle,
          IdentityStability.SourceStable,
          CompilerIdentityKind.ConfiguredResourceCatalogSelection,
          admission.identityHandle,
          admission.sourceAddressHandle,
          frameworkKind,
        ),
        ...claims,
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Compiler.ConfiguredResourceCatalogSelection.key,
          identityHandle,
          admission.sourceAddressHandle,
          source.provenanceHandle,
          claims.map((claim) => claim.handle),
        ),
        new MaterializationRecord(
          this.store.handles.materialization(local),
          DerivationPhase.Materialization,
          identityHandle,
          MaterializationState.Complete,
          [productHandle],
          claims.map((claim) => claim.handle),
        ),
      ],
      selection,
    );
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
          ProvenanceMode.Derived,
          [evidenceHandle],
          [],
          summary,
        ),
      ],
      provenanceHandle,
    );
  }
}

class ConfiguredResourceCatalogInput {
  constructor(
    readonly admission: RegistrationAdmissionProduct,
    readonly frameworkKind: FrameworkRegistrationKind,
    readonly catalogInputs: readonly BuiltInResourceCatalogInput[],
  ) {}
}

function readConfiguredResourceCatalogInputs(
  configuration: ConfigurationKernelEmission,
): readonly ConfiguredResourceCatalogInput[] {
  const inputs: ConfiguredResourceCatalogInput[] = [];
  for (const admission of configuration.registrationAdmissions) {
    const frameworkKind = frameworkRegistrationKindForAdmission(admission);
    if (frameworkKind == null) {
      continue;
    }
    const catalogInputs = catalogInputsForFrameworkKind(frameworkKind);
    if (catalogInputs.length === 0) {
      continue;
    }
    inputs.push(new ConfiguredResourceCatalogInput(admission, frameworkKind, catalogInputs));
  }
  return inputs;
}

function catalogInputsForFrameworkKind(
  frameworkKind: FrameworkRegistrationKind,
): readonly BuiltInResourceCatalogInput[] {
  switch (frameworkKind) {
    case FrameworkRegistrationKind.StandardConfiguration:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return [RuntimeHtmlBuiltInResourceCatalogs.DefaultResources];
    case FrameworkRegistrationKind.I18nConfiguration:
      return [I18nBuiltInResourceCatalogs.DefaultResources];
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return [StateBuiltInResourceCatalogs.DefaultResources];
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
    case FrameworkRegistrationKind.AppTask:
      return [];
  }
}

function uniqueCatalogInputs(
  inputs: readonly BuiltInResourceCatalogInput[],
): readonly BuiltInResourceCatalogInput[] {
  const seen = new Set<string>();
  const result: BuiltInResourceCatalogInput[] = [];
  for (const input of inputs) {
    const key = catalogInputKey(input);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(input);
  }
  return result;
}

function catalogInputKey(input: BuiltInResourceCatalogInput): string {
  return `${input.packageId}:${input.group}`;
}

function catalogKey(catalog: BuiltInResourceCatalog): string {
  return `${catalog.packageId}:${catalog.group}`;
}

function summaryForFrameworkKind(frameworkKind: FrameworkRegistrationKind): string {
  switch (frameworkKind) {
    case FrameworkRegistrationKind.StandardConfiguration:
      return 'RuntimeHtml StandardConfiguration admitted framework default resource headers.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return 'RuntimeHtml DefaultResources spread admitted framework default resource headers.';
    case FrameworkRegistrationKind.I18nConfiguration:
      return 'I18nConfiguration admitted i18n value-converter and binding-behavior resource headers.';
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return 'StateDefaultConfiguration admitted state binding-behavior resource headers.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
      return 'RuntimeHtml syntax-only registration group did not admit resource headers.';
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
