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
  ClaimHandle,
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
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import {
  frameworkRegistrationKindForAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import { TemplateProductDetails } from './product-details.js';
import {
  BuiltInRuntimeRendererCatalog,
  ConfiguredBuiltInRuntimeRendererCatalogSelection,
  I18nTranslationRenderers,
  RuntimeHtmlDefaultRenderers,
  RuntimeRendererGroup,
  RuntimeRendererPackage,
  StateDefaultRenderers,
  type BuiltInRuntimeRendererCatalogField,
  type ConfiguredBuiltInRuntimeRendererCatalogSelectionField,
  type RuntimeRenderer,
  type RuntimeRendererField,
} from './runtime-renderer.js';

export interface BuiltInRuntimeRendererCatalogInput {
  readonly packageId: RuntimeRendererPackage;
  readonly group: RuntimeRendererGroup;
  readonly renderers: readonly RuntimeRenderer[];
}

class BuiltInRuntimeRendererSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly addressHandle: AddressHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

export class BuiltInRuntimeRendererEmission {
  constructor(
    /** Built-in runtime renderer catalog product that owns this renderer. */
    readonly catalogProductHandle: ProductHandle,
    /** Runtime renderer model admitted through configuration. */
    readonly renderer: RuntimeRenderer,
  ) {}
}

export class BuiltInRuntimeRendererCatalogEmission {
  constructor(
    readonly catalogs: readonly BuiltInRuntimeRendererCatalog[],
    readonly renderers: readonly BuiltInRuntimeRendererEmission[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

export class ConfiguredBuiltInRuntimeRendererCatalogEmission {
  constructor(
    readonly catalogEmission: BuiltInRuntimeRendererCatalogEmission,
    readonly selections: readonly ConfiguredBuiltInRuntimeRendererCatalogSelection[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class ConfiguredRuntimeRendererSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class ConfiguredRuntimeRendererSelectionEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly selection: ConfiguredBuiltInRuntimeRendererCatalogSelection,
  ) {}
}

/** Materializes framework-owned runtime renderer catalogs before compiler-world visibility is decided. */
export class BuiltInRuntimeRendererCatalogMaterializer {
  constructor(
    /** Hot analysis store that receives built-in renderer records. */
    readonly store: KernelStore,
  ) {}

  materialize(catalogInputs: readonly BuiltInRuntimeRendererCatalogInput[]): BuiltInRuntimeRendererCatalogEmission {
    const records: KernelStoreRecord[] = [];
    const catalogs: BuiltInRuntimeRendererCatalog[] = [];
    const renderers: BuiltInRuntimeRendererEmission[] = [];

    for (const input of catalogInputs) {
      const emission = this.recordsForCatalog(input);
      if (this.store.readProduct(emission.catalog.productHandle) == null) {
        records.push(...emission.records);
      }
      catalogs.push(emission.catalog);
      renderers.push(...emission.renderers);
    }

    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'built-in-runtime-renderer-catalogs'));
    }

    const emission = new BuiltInRuntimeRendererCatalogEmission(catalogs, renderers, records);
    this.registerProductDetails(emission);
    return emission;
  }

  private registerProductDetails(emission: BuiltInRuntimeRendererCatalogEmission): void {
    for (const catalog of emission.catalogs) {
      this.store.productDetails.addIfAbsent(TemplateProductDetails.BuiltInRuntimeRendererCatalog, catalog.productHandle, catalog);
    }
    for (const renderer of emission.renderers) {
      this.store.productDetails.addIfAbsent(
        TemplateProductDetails.RuntimeRenderer,
        renderer.renderer.productHandle!,
        renderer.renderer,
      );
    }
  }

  private recordsForCatalog(input: BuiltInRuntimeRendererCatalogInput): {
    readonly records: readonly KernelStoreRecord[];
    readonly catalog: BuiltInRuntimeRendererCatalog;
    readonly renderers: readonly BuiltInRuntimeRendererEmission[];
  } {
    const records: KernelStoreRecord[] = [];
    const local = `built-in-runtime-renderers:${input.packageId}:${input.group}`;
    const source = this.recordsForSource(
      `${local}:source`,
      input.packageId,
      input.group,
      `Framework runtime renderer catalog ${input.packageId}/${input.group}.`,
    );
    records.push(...source.records);

    const catalogProductHandle = this.store.handles.product(local);
    const catalogIdentityHandle = this.store.handles.identity(local);
    const rendererEmissions = input.renderers.map((renderer, index) =>
      this.recordsForRenderer(
        renderer,
        `${local}:renderer:${index}`,
        catalogProductHandle,
        catalogIdentityHandle,
        this.store.handles.claim(`${local}:contains-runtime-renderer:${index}`),
        source,
      )
    );
    for (const emission of rendererEmissions) {
      records.push(...emission.records);
    }

    const rendererProductHandles = rendererEmissions.map((emission) => emission.product.renderer.productHandle!);
    const catalogClaims = rendererProductHandles.map((productHandle, index) => new SemanticClaim(
      this.store.handles.claim(`${local}:contains-runtime-renderer:${index}`),
      catalogProductHandle,
      KernelVocabulary.Compiler.ContainsRuntimeRenderer.key,
      productHandle,
      source.provenanceHandle,
    ));
    records.push(...catalogClaims);

    const materializedRenderers = rendererEmissions.map((emission) => emission.product.renderer);
    const catalog = new BuiltInRuntimeRendererCatalog(
      catalogProductHandle,
      catalogIdentityHandle,
      input.packageId,
      input.group,
      materializedRenderers,
      source.addressHandle,
      compactFieldProvenance<BuiltInRuntimeRendererCatalogField>([
        new FieldProvenance('package', source.provenanceHandle),
        new FieldProvenance('group', source.provenanceHandle),
        materializedRenderers.length === 0 ? null : new FieldProvenance('renderers', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    records.push(
      new CompilerIdentity(
        catalogIdentityHandle,
        IdentityStability.CrossProjectStable,
        CompilerIdentityKind.BuiltInRuntimeRendererCatalog,
        null,
        source.addressHandle,
        `${input.packageId}:${input.group}`,
      ),
      new MaterializedProduct(
        catalogProductHandle,
        KernelVocabulary.Compiler.BuiltInRuntimeRendererCatalog.key,
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
        [catalogProductHandle, ...rendererProductHandles],
        catalogClaims.map((claim) => claim.handle),
      ),
    );

    return {
      records,
      catalog,
      renderers: rendererEmissions.map((emission) => emission.product),
    };
  }

  private recordsForRenderer(
    renderer: RuntimeRenderer,
    local: string,
    catalogProductHandle: ProductHandle,
    catalogIdentityHandle: IdentityHandle,
    catalogClaimHandle: ClaimHandle,
    source: BuiltInRuntimeRendererSourceSet,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly product: BuiltInRuntimeRendererEmission;
  } {
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const fieldProvenance = compactFieldProvenance<RuntimeRendererField>([
      new FieldProvenance('rendererKind', source.provenanceHandle),
      new FieldProvenance('targetInstructionKind', source.provenanceHandle),
      renderer.runtimeBindingKind == null ? null : new FieldProvenance('runtimeBindingKind', source.provenanceHandle),
      renderer.semanticBindingKindKey == null ? null : new FieldProvenance('bindingKind', source.provenanceHandle),
      renderer.scopeEffectKinds.length === 0 ? null : new FieldProvenance('scopeEffectKinds', source.provenanceHandle),
      new FieldProvenance('package', source.provenanceHandle),
      new FieldProvenance('group', source.provenanceHandle),
      new FieldProvenance('source', source.provenanceHandle),
    ]);
    const materializedRenderer = materializeRuntimeRenderer(
      renderer,
      productHandle,
      identityHandle,
      source.addressHandle,
      fieldProvenance,
    );
    return {
      records: [
        new CompilerIdentity(
          identityHandle,
          IdentityStability.CrossProjectStable,
          CompilerIdentityKind.RuntimeRenderer,
          catalogIdentityHandle,
          source.addressHandle,
          materializedRenderer.rendererKind,
        ),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Compiler.RuntimeRenderer.key,
          identityHandle,
          source.addressHandle,
          source.provenanceHandle,
          [catalogClaimHandle],
        ),
      ],
      product: new BuiltInRuntimeRendererEmission(catalogProductHandle, materializedRenderer),
    };
  }

  private recordsForSource(
    local: string,
    packageId: RuntimeRendererPackage,
    group: RuntimeRendererGroup,
    summary: string,
  ): BuiltInRuntimeRendererSourceSet {
    const addressHandle = this.store.handles.address(local);
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    const records: KernelStoreRecord[] = [
      new ExternalAddress(
        addressHandle,
        AddressStability.ExternalStable,
        'aurelia-runtime-renderer-catalog',
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
    return new BuiltInRuntimeRendererSourceSet(records, addressHandle, provenanceHandle);
  }
}

/** Selects framework-owned runtime renderers admitted by known framework registrations. */
export class ConfiguredBuiltInRuntimeRendererCatalogMaterializer {
  private readonly catalogMaterializer: BuiltInRuntimeRendererCatalogMaterializer;

  constructor(
    /** Hot analysis store that receives configured renderer-catalog selection records. */
    readonly store: KernelStore,
  ) {
    this.catalogMaterializer = new BuiltInRuntimeRendererCatalogMaterializer(store);
  }

  materialize(configuration: ConfigurationKernelEmission): ConfiguredBuiltInRuntimeRendererCatalogEmission {
    const selectionInputs = readConfiguredRuntimeRendererCatalogInputs(configuration);
    const catalogInputs = uniqueCatalogInputs(selectionInputs.flatMap((input) => input.catalogInputs));
    const catalogEmission = this.catalogMaterializer.materialize(catalogInputs);
    const catalogsByKey = new Map(catalogEmission.catalogs.map((catalog) => [catalogKey(catalog), catalog]));

    const records: KernelStoreRecord[] = [];
    const selections: ConfiguredBuiltInRuntimeRendererCatalogSelection[] = [];
    for (const input of selectionInputs) {
      const catalogs = input.catalogInputs
        .map((catalogInput) => catalogsByKey.get(catalogInputKey(catalogInput)) ?? null)
        .filter((catalog): catalog is BuiltInRuntimeRendererCatalog => catalog != null);
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
      this.store.commit(new KernelStoreBatch(records, 'configured-built-in-runtime-renderer-catalogs'));
    }

    for (const selection of selections) {
      this.store.productDetails.addIfAbsent(
        TemplateProductDetails.ConfiguredBuiltInRuntimeRendererCatalogSelection,
        selection.productHandle,
        selection,
      );
    }

    return new ConfiguredBuiltInRuntimeRendererCatalogEmission(catalogEmission, selections, records);
  }

  private recordsForSelection(
    admission: RegistrationAdmissionProduct,
    frameworkKind: FrameworkRegistrationKind,
    catalogs: readonly BuiltInRuntimeRendererCatalog[],
  ): ConfiguredRuntimeRendererSelectionEmission {
    const local = `configured-runtime-renderer-catalog:${admission.productHandle}`;
    const source = this.recordsForConfiguredSource(
      local,
      admission.sourceAddressHandle,
      summaryForFrameworkKind(frameworkKind),
    );
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const claims = catalogs.map((catalog, index) => new SemanticClaim(
      this.store.handles.claim(`${local}:admits-runtime-renderer-catalog:${index}`),
      productHandle,
      KernelVocabulary.Compiler.AdmitsRuntimeRendererCatalog.key,
      catalog.productHandle,
      source.provenanceHandle,
    ));
    const selection = new ConfiguredBuiltInRuntimeRendererCatalogSelection(
      productHandle,
      identityHandle,
      admission.productHandle,
      frameworkKind,
      catalogs.map((catalog) => catalog.productHandle),
      admission.sourceAddressHandle,
      compactFieldProvenance<ConfiguredBuiltInRuntimeRendererCatalogSelectionField>([
        new FieldProvenance('registrationAdmission', source.provenanceHandle),
        new FieldProvenance('frameworkKind', source.provenanceHandle),
        new FieldProvenance('catalogs', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    return new ConfiguredRuntimeRendererSelectionEmission(
      [
        ...source.records,
        new CompilerIdentity(
          identityHandle,
          IdentityStability.SourceStable,
          CompilerIdentityKind.ConfiguredRuntimeRendererCatalogSelection,
          admission.identityHandle,
          admission.sourceAddressHandle,
          frameworkKind,
        ),
        ...claims,
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Compiler.ConfiguredRuntimeRendererCatalogSelection.key,
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
  ): ConfiguredRuntimeRendererSourceSet {
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    return new ConfiguredRuntimeRendererSourceSet(
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

class ConfiguredRuntimeRendererCatalogInput {
  constructor(
    readonly admission: RegistrationAdmissionProduct,
    readonly frameworkKind: FrameworkRegistrationKind,
    readonly catalogInputs: readonly BuiltInRuntimeRendererCatalogInput[],
  ) {}
}

function readConfiguredRuntimeRendererCatalogInputs(
  configuration: ConfigurationKernelEmission,
): readonly ConfiguredRuntimeRendererCatalogInput[] {
  const inputs: ConfiguredRuntimeRendererCatalogInput[] = [];
  for (const admission of configuration.registrationAdmissions) {
    const frameworkKind = frameworkRegistrationKindForAdmission(admission);
    if (frameworkKind == null) {
      continue;
    }
    const catalogInputs = catalogInputsForAdmission(frameworkKind);
    if (catalogInputs.length === 0) {
      continue;
    }
    inputs.push(new ConfiguredRuntimeRendererCatalogInput(admission, frameworkKind, catalogInputs));
  }
  return inputs;
}

function catalogInputsForAdmission(
  frameworkKind: FrameworkRegistrationKind,
): readonly BuiltInRuntimeRendererCatalogInput[] {
  switch (frameworkKind) {
    case FrameworkRegistrationKind.StandardConfiguration:
      return [RuntimeRendererCatalogs.RuntimeHtmlDefaultRenderers];
    case FrameworkRegistrationKind.I18nConfiguration:
      return [RuntimeRendererCatalogs.I18nTranslationRenderers];
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return [RuntimeRendererCatalogs.StateDefaultRenderers];
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
    case FrameworkRegistrationKind.AppTask:
      return [];
  }
}

export const RuntimeRendererCatalogs = {
  RuntimeHtmlDefaultRenderers: {
    packageId: RuntimeRendererPackage.RuntimeHtml,
    group: RuntimeRendererGroup.RuntimeHtmlDefaultRenderers,
    renderers: RuntimeHtmlDefaultRenderers,
  },
  I18nTranslationRenderers: {
    packageId: RuntimeRendererPackage.I18n,
    group: RuntimeRendererGroup.I18nTranslationRenderers,
    renderers: I18nTranslationRenderers,
  },
  StateDefaultRenderers: {
    packageId: RuntimeRendererPackage.State,
    group: RuntimeRendererGroup.StateDefaultRenderers,
    renderers: StateDefaultRenderers,
  },
} as const;

function uniqueCatalogInputs(
  inputs: readonly BuiltInRuntimeRendererCatalogInput[],
): readonly BuiltInRuntimeRendererCatalogInput[] {
  const seen = new Set<string>();
  const result: BuiltInRuntimeRendererCatalogInput[] = [];
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

function catalogInputKey(input: BuiltInRuntimeRendererCatalogInput): string {
  return `${input.packageId}:${input.group}`;
}

function catalogKey(catalog: BuiltInRuntimeRendererCatalog): string {
  return `${catalog.packageId}:${catalog.group}`;
}

function summaryForFrameworkKind(frameworkKind: FrameworkRegistrationKind): string {
  switch (frameworkKind) {
    case FrameworkRegistrationKind.StandardConfiguration:
      return 'RuntimeHtml StandardConfiguration admitted default runtime renderers.';
    case FrameworkRegistrationKind.I18nConfiguration:
      return 'I18nConfiguration admitted translation runtime renderers.';
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return 'StateDefaultConfiguration admitted state runtime renderers.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
      return 'RuntimeHtml DefaultBindingSyntax spread does not admit runtime renderers.';
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
      return 'RuntimeHtml ShortHandBindingSyntax spread does not admit runtime renderers.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
      return 'RuntimeHtml DefaultBindingLanguage spread does not admit runtime renderers.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return 'RuntimeHtml DefaultResources spread does not admit runtime renderers.';
    case FrameworkRegistrationKind.AppTask:
      return 'AppTask registry does not admit runtime renderer catalogs.';
  }
}

type RuntimeRendererConstructor = new (
  productHandle?: ProductHandle | null,
  identityHandle?: IdentityHandle | null,
  sourceAddressHandle?: AddressHandle | null,
  fieldProvenance?: readonly FieldProvenance<RuntimeRendererField>[],
) => RuntimeRenderer;

function materializeRuntimeRenderer(
  renderer: RuntimeRenderer,
  productHandle: ProductHandle,
  identityHandle: IdentityHandle,
  sourceAddressHandle: AddressHandle,
  fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[],
): RuntimeRenderer {
  const Constructor = renderer.constructor as RuntimeRendererConstructor;
  return new Constructor(productHandle, identityHandle, sourceAddressHandle, fieldProvenance);
}
