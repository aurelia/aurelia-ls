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
import {
  BindableBindingMode,
  BindableDefinition,
  BindableSetterDefinition,
  BindableSetterKind,
} from './bindable-definition.js';
import {
  BindingBehaviorDefinition,
  type BindingBehaviorDefinitionField,
} from './binding-behavior-definition.js';
import {
  CustomAttributeContainerStrategy,
  CustomAttributeDefinition,
  type CustomAttributeDefinitionField,
} from './custom-attribute-definition.js';
import {
  CustomElementCaptureDefinition,
  CustomElementCaptureKind,
  CustomElementDefinition,
  type CustomElementDefinitionField,
  CustomElementTemplateDefinition,
  CustomElementTemplateKind,
} from './custom-element-definition.js';
import type { FullResourceDefinition } from './resource-definition.js';
import {
  ResourceDefinitionKind,
  runtimeResourceKeyForKind,
  toAureliaResourceIdentityKind,
} from './resource-kind.js';
import {
  ResourceAliasDefinition,
  ResourceTargetReference,
} from './resource-reference.js';
import {
  ValueConverterDefinition,
  type ValueConverterDefinitionField,
} from './value-converter-definition.js';
import { ResourceProductDetails } from './product-details.js';

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

/** Materializes framework-owned resource headers and static full definitions before compiler-world visibility is decided. */
export class BuiltInResourceCatalogMaterializer {
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
          ...resourceEmissions.flatMap((emission) =>
            emission.definition?.productHandle == null ? [] : [emission.definition.productHandle]
          ),
        ],
        catalogClaims.map((claim) => claim.handle),
      ),
    );

    return {
      records,
      catalog,
      resources: resourceEmissions.map((emission) =>
        new BuiltInResourceEmission(catalogProductHandle, emission.resource, emission.definition)
      ),
    };
  }

  private recordsForResource(
    resource: BuiltInResource,
    local: string,
    source: BuiltInResourceSourceSet,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly resource: BuiltInResource;
    readonly definition: FullResourceDefinition | null;
  } {
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const definitionProductHandle = this.store.handles.product(`${local}:definition`);
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
    const definition = materializeBuiltInResourceDefinition(
      materializedResource,
      definitionProductHandle,
      identityHandle,
      source,
    );
    const convergenceClaim = definition == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`${local}:converges-to-definition`),
        productHandle,
        KernelVocabulary.Resource.ConvergesToDefinition.key,
        definitionProductHandle,
        source.provenanceHandle,
      );
    const allClaimHandles = convergenceClaim == null
      ? claimHandles
      : [...claimHandles, convergenceClaim.handle];
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
        ...(convergenceClaim == null ? [] : [convergenceClaim]),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Resource.DefinitionHeader.key,
          identityHandle,
          source.addressHandle,
          source.provenanceHandle,
          allClaimHandles,
        ),
        ...(definition == null ? [] : [
          new MaterializedProduct(
            definitionProductHandle,
            KernelVocabulary.Resource.Definition.key,
            identityHandle,
            source.addressHandle,
            source.provenanceHandle,
            convergenceClaim == null ? [] : [convergenceClaim.handle],
          ),
        ]),
        new MaterializationRecord(
          this.store.handles.materialization(local),
          DerivationPhase.Materialization,
          identityHandle,
          MaterializationState.Complete,
          definition == null ? [productHandle] : [productHandle, definitionProductHandle],
          allClaimHandles,
        ),
      ],
      resource: materializedResource,
      definition,
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
export class ConfiguredBuiltInResourceCatalogMaterializer {
  private readonly catalogMaterializer: BuiltInResourceCatalogMaterializer;

  constructor(
    /** Hot analysis store that receives configured resource-catalog selection records. */
    readonly store: KernelStore,
  ) {
    this.catalogMaterializer = new BuiltInResourceCatalogMaterializer(store);
  }

  materialize(configuration: ConfigurationKernelEmission): ConfiguredBuiltInResourceCatalogEmission {
    const selectionInputs = readConfiguredResourceCatalogInputs(configuration);
    const catalogInputs = uniqueCatalogInputs(selectionInputs.flatMap((input) => input.catalogInputs));
    const catalogEmission = this.catalogMaterializer.materialize(catalogInputs);
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

    for (const selection of selections) {
      this.store.productDetails.addIfAbsent(
        ResourceProductDetails.ConfiguredBuiltInResourceCatalogSelection,
        selection.productHandle,
        selection,
      );
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

interface BuiltInBindableInput {
  readonly name: string;
  readonly attribute?: string;
  readonly callback?: string;
  readonly mode?: BindableBindingMode;
  readonly setterKind?: BindableSetterKind;
  readonly setterName?: string;
}

function materializeBuiltInResourceDefinition(
  resource: BuiltInResource,
  productHandle: ProductHandle,
  identityHandle: IdentityHandle,
  source: BuiltInResourceSourceSet,
): FullResourceDefinition | null {
  const target = new ResourceTargetReference(null, source.addressHandle, resource.targetName);
  const aliases = resource.aliases.map((alias) =>
    new ResourceAliasDefinition(alias, source.addressHandle, source.provenanceHandle)
  );
  const key = runtimeResourceKeyForKind(resource.resourceKind, resource.name);
  if (key == null) {
    return null;
  }

  switch (resource.resourceKind) {
    case ResourceDefinitionKind.CustomElement:
      return new CustomElementDefinition(
        productHandle,
        identityHandle,
        source.addressHandle,
        target,
        resource.name,
        aliases,
        key,
        new CustomElementCaptureDefinition(resource.targetName === 'AuCompose'
          ? CustomElementCaptureKind.All
          : CustomElementCaptureKind.None),
        new CustomElementTemplateDefinition(CustomElementTemplateKind.None),
        [],
        [],
        null,
        false,
        [],
        builtInElementBindables(resource.targetName, source),
        resource.targetName === 'AuCompose' || resource.targetName === 'AuSlot',
        null,
        false,
        false,
        [],
        null,
        resource.targetName === 'AuSlot'
          ? new ResourceTargetReference(null, source.addressHandle, 'AuSlot.processContent')
          : null,
        [],
        customElementDefinitionProvenance(source),
      );
    case ResourceDefinitionKind.CustomAttribute:
    case ResourceDefinitionKind.TemplateController:
      return new CustomAttributeDefinition(
        productHandle,
        identityHandle,
        source.addressHandle,
        target,
        resource.name,
        aliases,
        key,
        resource.resourceKind === ResourceDefinitionKind.TemplateController,
        builtInAttributeBindables(resource.targetName, source),
        false,
        [],
        [],
        CustomAttributeContainerStrategy.Reuse,
        builtInDefaultProperty(resource.targetName),
        [],
        customAttributeDefinitionProvenance(source),
      );
    case ResourceDefinitionKind.ValueConverter:
      return new ValueConverterDefinition(
        productHandle,
        identityHandle,
        source.addressHandle,
        target,
        resource.name,
        aliases,
        key,
        [],
        thinResourceDefinitionProvenance<ValueConverterDefinitionField>(source),
      );
    case ResourceDefinitionKind.BindingBehavior:
      return new BindingBehaviorDefinition(
        productHandle,
        identityHandle,
        source.addressHandle,
        target,
        resource.name,
        aliases,
        key,
        [],
        thinResourceDefinitionProvenance<BindingBehaviorDefinitionField>(source),
      );
  }
}

function builtInElementBindables(
  targetName: string,
  source: BuiltInResourceSourceSet,
): readonly BindableDefinition[] {
  switch (targetName) {
    case 'AuCompose':
      return bindables(source, [
        { name: 'template' },
        { name: 'component' },
        { name: 'model' },
        { name: 'scopeBehavior', setterKind: BindableSetterKind.Function, setterName: 'AuCompose.scopeBehavior.set' },
        { name: 'composing', mode: BindableBindingMode.FromView },
        { name: 'composition', mode: BindableBindingMode.FromView },
        { name: 'tag' },
        { name: 'flushMode', setterKind: BindableSetterKind.Function, setterName: 'AuCompose.flushMode.set' },
      ]);
    case 'AuSlot':
      return bindables(source, [
        { name: 'expose' },
        { name: 'slotchange' },
      ]);
    default:
      return [];
  }
}

function builtInAttributeBindables(
  targetName: string,
  source: BuiltInResourceSourceSet,
): readonly BindableDefinition[] {
  switch (targetName) {
    case 'If':
      return bindables(source, [
        { name: 'value' },
        { name: 'cache', setterKind: BindableSetterKind.Function, setterName: 'If.cache.set' },
      ]);
    case 'Repeat':
      return bindables(source, [{ name: 'items' }]);
    case 'With':
    case 'Switch':
    case 'PromiseTemplateController':
    case 'Show':
      return bindables(source, [{ name: 'value' }]);
    case 'PendingTemplateController':
      return bindables(source, [{ name: 'value', mode: BindableBindingMode.ToView }]);
    case 'FulfilledTemplateController':
    case 'RejectedTemplateController':
      return bindables(source, [{ name: 'value', mode: BindableBindingMode.FromView }]);
    case 'Case':
    case 'DefaultCase':
      return bindables(source, [
        { name: 'value' },
        {
          name: 'fallThrough',
          mode: BindableBindingMode.OneTime,
          setterKind: BindableSetterKind.Function,
          setterName: `${targetName}.fallThrough.set`,
        },
      ]);
    case 'Portal':
      return bindables(source, [
        { name: 'target' },
        { name: 'position' },
        { name: 'activated' },
        { name: 'activating' },
        { name: 'callbackContext' },
        { name: 'renderContext', callback: 'targetChanged' },
        { name: 'strict' },
        { name: 'deactivated' },
        { name: 'deactivating' },
      ]);
    case 'Focus':
      return bindables(source, [{ name: 'value', mode: BindableBindingMode.TwoWay }]);
    case 'Else':
    default:
      return [];
  }
}

function builtInDefaultProperty(targetName: string): string {
  switch (targetName) {
    case 'Repeat':
      return 'items';
    case 'Portal':
      return 'target';
    default:
      return 'value';
  }
}

function bindables(
  source: BuiltInResourceSourceSet,
  inputs: readonly BuiltInBindableInput[],
): readonly BindableDefinition[] {
  return inputs.map((input) => new BindableDefinition(
    input.attribute ?? toBindableAttribute(input.name),
    input.callback ?? `${input.name}Changed`,
    input.mode ?? BindableBindingMode.ToView,
    input.name,
    new BindableSetterDefinition(
      input.setterKind ?? BindableSetterKind.Default,
      input.setterName == null
        ? null
        : new ResourceTargetReference(null, source.addressHandle, input.setterName),
    ),
    source.addressHandle,
    compactFieldProvenance([
      new FieldProvenance('attribute', source.provenanceHandle),
      new FieldProvenance('callback', source.provenanceHandle),
      new FieldProvenance('mode', source.provenanceHandle),
      new FieldProvenance('name', source.provenanceHandle),
      new FieldProvenance('set', source.provenanceHandle),
      new FieldProvenance('source', source.provenanceHandle),
    ]),
  ));
}

function toBindableAttribute(name: string): string {
  return name.replace(/([A-Z])/g, (_match, char: string) => `-${char.toLowerCase()}`);
}

function customElementDefinitionProvenance(
  source: BuiltInResourceSourceSet,
): readonly FieldProvenance<CustomElementDefinitionField>[] {
  return compactFieldProvenance<CustomElementDefinitionField>([
    new FieldProvenance('target', source.provenanceHandle),
    new FieldProvenance('name', source.provenanceHandle),
    new FieldProvenance('aliases', source.provenanceHandle),
    new FieldProvenance('key', source.provenanceHandle),
    new FieldProvenance('capture', source.provenanceHandle),
    new FieldProvenance('template', source.provenanceHandle),
    new FieldProvenance('instructions', source.provenanceHandle),
    new FieldProvenance('dependencies', source.provenanceHandle),
    new FieldProvenance('injectable', source.provenanceHandle),
    new FieldProvenance('needsCompile', source.provenanceHandle),
    new FieldProvenance('surrogates', source.provenanceHandle),
    new FieldProvenance('bindables', source.provenanceHandle),
    new FieldProvenance('containerless', source.provenanceHandle),
    new FieldProvenance('shadowOptions', source.provenanceHandle),
    new FieldProvenance('hasSlots', source.provenanceHandle),
    new FieldProvenance('enhance', source.provenanceHandle),
    new FieldProvenance('watches', source.provenanceHandle),
    new FieldProvenance('strict', source.provenanceHandle),
    new FieldProvenance('processContent', source.provenanceHandle),
  ]);
}

function customAttributeDefinitionProvenance(
  source: BuiltInResourceSourceSet,
): readonly FieldProvenance<CustomAttributeDefinitionField>[] {
  return compactFieldProvenance<CustomAttributeDefinitionField>([
    new FieldProvenance('target', source.provenanceHandle),
    new FieldProvenance('name', source.provenanceHandle),
    new FieldProvenance('aliases', source.provenanceHandle),
    new FieldProvenance('key', source.provenanceHandle),
    new FieldProvenance('isTemplateController', source.provenanceHandle),
    new FieldProvenance('bindables', source.provenanceHandle),
    new FieldProvenance('noMultiBindings', source.provenanceHandle),
    new FieldProvenance('watches', source.provenanceHandle),
    new FieldProvenance('dependencies', source.provenanceHandle),
    new FieldProvenance('containerStrategy', source.provenanceHandle),
    new FieldProvenance('defaultProperty', source.provenanceHandle),
  ]);
}

function thinResourceDefinitionProvenance<TField extends 'target' | 'name' | 'aliases' | 'key'>(
  source: BuiltInResourceSourceSet,
): readonly FieldProvenance<TField>[] {
  return compactFieldProvenance<TField>([
    new FieldProvenance('target' as TField, source.provenanceHandle),
    new FieldProvenance('name' as TField, source.provenanceHandle),
    new FieldProvenance('aliases' as TField, source.provenanceHandle),
    new FieldProvenance('key' as TField, source.provenanceHandle),
  ]);
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
