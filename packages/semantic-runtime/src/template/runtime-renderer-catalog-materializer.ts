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
import { catalogGroupLocalKey } from '../kernel/local-key.js';
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
import { TemplateProductDetails } from './product-details.js';
import {
  BuiltInRuntimeRendererCatalog,
  ConfiguredBuiltInRuntimeRendererCatalogSelection,
  I18nTranslationRenderers,
  RuntimeHtmlDefaultRenderers,
  RuntimeRendererGroup,
  RuntimeRendererPackage,
  StateDefaultRenderers,
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

class ConfiguredRuntimeRendererSelectionHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

class BuiltInRuntimeRendererCatalogHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

class BuiltInRuntimeRendererHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
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
    const local = runtimeRendererCatalogLocal(input);
    const source = this.recordsForSource(
      `${local}:source`,
      input.packageId,
      input.group,
      `Framework runtime renderer catalog ${input.packageId}/${input.group}.`,
    );
    records.push(...source.records);

    const handles = this.handlesForCatalog(local);
    const rendererEmissions = this.rendererEmissionsForCatalog(input, local, handles, source);
    for (const emission of rendererEmissions) {
      records.push(...emission.records);
    }

    const rendererProductHandles = productHandlesForRendererEmissions(rendererEmissions);
    const catalogClaims = this.catalogClaimsForRenderers(local, handles.productHandle, rendererProductHandles, source.provenanceHandle);
    records.push(...catalogClaims);

    const materializedRenderers = rendererEmissions.map((emission) => emission.product.renderer);
    const catalog = catalogForInput(input, handles, materializedRenderers, source);
    records.push(
      ...this.recordsForCatalogProduct(local, input, handles, source, rendererProductHandles, catalogClaims),
    );

    return {
      records,
      catalog,
      renderers: rendererEmissions.map((emission) => emission.product),
    };
  }

  private handlesForCatalog(local: string): BuiltInRuntimeRendererCatalogHandles {
    return new BuiltInRuntimeRendererCatalogHandles(
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }

  private rendererEmissionsForCatalog(
    input: BuiltInRuntimeRendererCatalogInput,
    local: string,
    handles: BuiltInRuntimeRendererCatalogHandles,
    source: BuiltInRuntimeRendererSourceSet,
  ): readonly {
    readonly records: readonly KernelStoreRecord[];
    readonly product: BuiltInRuntimeRendererEmission;
  }[] {
    return input.renderers.map((renderer, index) =>
      this.recordsForRenderer(
        renderer,
        `${local}:renderer:${index}`,
        handles.productHandle,
        handles.identityHandle,
        source,
      )
    );
  }

  private catalogClaimsForRenderers(
    local: string,
    catalogProductHandle: ProductHandle,
    rendererProductHandles: readonly ProductHandle[],
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    return rendererProductHandles.map((productHandle, index) => new SemanticClaim(
      this.store.handles.claim(`${local}:contains-runtime-renderer:${index}`),
      catalogProductHandle,
      KernelVocabulary.Compiler.ContainsRuntimeRenderer.key,
      productHandle,
      provenanceHandle,
    ));
  }

  private recordsForCatalogProduct(
    local: string,
    input: BuiltInRuntimeRendererCatalogInput,
    handles: BuiltInRuntimeRendererCatalogHandles,
    source: BuiltInRuntimeRendererSourceSet,
    rendererProductHandles: readonly ProductHandle[],
    catalogClaims: readonly SemanticClaim[],
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        handles.identityHandle,
        KernelVocabulary.Compiler.BuiltInRuntimeRendererCatalog.key,
        null,
        source.addressHandle,
        `${input.packageId}:${input.group}`,
      ),
      new MaterializedProduct(
        handles.productHandle,
        KernelVocabulary.Compiler.BuiltInRuntimeRendererCatalog.key,
        handles.identityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(local),
        handles.identityHandle,
        [handles.productHandle, ...rendererProductHandles],
        catalogClaims.map((claim) => claim.handle),
      ),
    ];
  }

  private recordsForRenderer(
    renderer: RuntimeRenderer,
    local: string,
    catalogProductHandle: ProductHandle,
    catalogIdentityHandle: IdentityHandle,
    source: BuiltInRuntimeRendererSourceSet,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly product: BuiltInRuntimeRendererEmission;
  } {
    const handles = this.handlesForRenderer(local);
    const materializedRenderer = this.runtimeRendererProduct(renderer, handles, source);
    return {
      records: this.recordsForRendererProduct(local, catalogIdentityHandle, source, handles, materializedRenderer),
      product: new BuiltInRuntimeRendererEmission(catalogProductHandle, materializedRenderer),
    };
  }

  private handlesForRenderer(local: string): BuiltInRuntimeRendererHandles {
    return new BuiltInRuntimeRendererHandles(
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }

  private runtimeRendererProduct(
    renderer: RuntimeRenderer,
    handles: BuiltInRuntimeRendererHandles,
    source: BuiltInRuntimeRendererSourceSet,
  ): RuntimeRenderer {
    return materializeRuntimeRenderer(
      renderer,
      handles.productHandle,
      handles.identityHandle,
      source.addressHandle,
      [],
    );
  }

  private recordsForRendererProduct(
    local: string,
    catalogIdentityHandle: IdentityHandle,
    source: BuiltInRuntimeRendererSourceSet,
    handles: BuiltInRuntimeRendererHandles,
    materializedRenderer: RuntimeRenderer,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        handles.identityHandle,
        KernelVocabulary.Compiler.RuntimeRenderer.key,
        catalogIdentityHandle,
        source.addressHandle,
        materializedRenderer.rendererKind,
      ),
      new MaterializedProduct(
        handles.productHandle,
        KernelVocabulary.Compiler.RuntimeRenderer.key,
        handles.identityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
    ];
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
        [evidenceHandle],
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
    const selectionRequests = readConfiguredRuntimeRendererCatalogRequests(configuration);
    const catalogEmission = this.catalogEmissionForRequests(selectionRequests);
    const selectionEmission = this.selectionEmissionForRequests(selectionRequests, catalogEmission);
    this.commitSelectionRecords(selectionEmission.records);
    this.registerSelectionDetails(selectionEmission.selections);

    return new ConfiguredBuiltInRuntimeRendererCatalogEmission(
      catalogEmission,
      selectionEmission.selections,
      selectionEmission.records,
    );
  }

  private catalogEmissionForRequests(
    selectionRequests: readonly ConfiguredRuntimeRendererCatalogRequest[],
  ): BuiltInRuntimeRendererCatalogEmission {
    const catalogInputs = uniqueByKey(
      selectionRequests.flatMap((request) => request.catalogInputs),
      runtimeRendererCatalogInputKey,
    );
    return this.catalogMaterializer.materialize(catalogInputs);
  }

  private selectionEmissionForRequests(
    selectionRequests: readonly ConfiguredRuntimeRendererCatalogRequest[],
    catalogEmission: BuiltInRuntimeRendererCatalogEmission,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly selections: readonly ConfiguredBuiltInRuntimeRendererCatalogSelection[];
  } {
    const catalogsByKey = new Map(catalogEmission.catalogs.map((catalog) => [catalogGroupLocalKey(catalog), catalog]));
    const records: KernelStoreRecord[] = [];
    const selections: ConfiguredBuiltInRuntimeRendererCatalogSelection[] = [];
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
    request: ConfiguredRuntimeRendererCatalogRequest,
    catalogsByKey: ReadonlyMap<string, BuiltInRuntimeRendererCatalog>,
  ): readonly BuiltInRuntimeRendererCatalog[] {
    return request.catalogInputs
      .map((catalogInput) => catalogsByKey.get(runtimeRendererCatalogInputKey(catalogInput)) ?? null)
      .filter((catalog): catalog is BuiltInRuntimeRendererCatalog => catalog != null);
  }

  private commitSelectionRecords(records: readonly KernelStoreRecord[]): void {
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'configured-built-in-runtime-renderer-catalogs'));
    }
  }

  private registerSelectionDetails(selections: readonly ConfiguredBuiltInRuntimeRendererCatalogSelection[]): void {
    for (const selection of selections) {
      this.store.productDetails.addIfAbsent(
        TemplateProductDetails.ConfiguredBuiltInRuntimeRendererCatalogSelection,
        selection.productHandle,
        selection,
      );
    }
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
      runtimeRendererCatalogSummaryForFrameworkKind(frameworkKind),
    );
    const handles = this.configuredSelectionHandles(local);
    const claims = this.claimsForConfiguredSelection(local, handles.productHandle, catalogs, source);
    const selection = this.createConfiguredSelection(admission, frameworkKind, catalogs, handles, source);
    return new ConfiguredRuntimeRendererSelectionEmission(
      this.recordsForConfiguredSelectionProduct(local, admission, frameworkKind, source, handles, claims),
      selection,
    );
  }

  private configuredSelectionHandles(local: string): ConfiguredRuntimeRendererSelectionHandles {
    return new ConfiguredRuntimeRendererSelectionHandles(
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }

  private claimsForConfiguredSelection(
    local: string,
    selectionProductHandle: ProductHandle,
    catalogs: readonly BuiltInRuntimeRendererCatalog[],
    source: ConfiguredRuntimeRendererSourceSet,
  ): readonly SemanticClaim[] {
    return catalogs.map((catalog, index) => new SemanticClaim(
      this.store.handles.claim(`${local}:admits-runtime-renderer-catalog:${index}`),
      selectionProductHandle,
      KernelVocabulary.Compiler.AdmitsRuntimeRendererCatalog.key,
      catalog.productHandle,
      source.provenanceHandle,
    ));
  }

  private createConfiguredSelection(
    admission: RegistrationAdmissionProduct,
    frameworkKind: FrameworkRegistrationKind,
    catalogs: readonly BuiltInRuntimeRendererCatalog[],
    handles: ConfiguredRuntimeRendererSelectionHandles,
    source: ConfiguredRuntimeRendererSourceSet,
  ): ConfiguredBuiltInRuntimeRendererCatalogSelection {
    return new ConfiguredBuiltInRuntimeRendererCatalogSelection(
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
    source: ConfiguredRuntimeRendererSourceSet,
    handles: ConfiguredRuntimeRendererSelectionHandles,
    claims: readonly SemanticClaim[],
  ): readonly KernelStoreRecord[] {
    return [
      ...source.records,
      new CompilerIdentity(
        handles.identityHandle,
        KernelVocabulary.Compiler.ConfiguredRuntimeRendererCatalogSelection.key,
        admission.identityHandle,
        admission.sourceAddressHandle,
        frameworkKind,
      ),
      ...claims,
      new MaterializedProduct(
        handles.productHandle,
        KernelVocabulary.Compiler.ConfiguredRuntimeRendererCatalogSelection.key,
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
          [evidenceHandle],
        ),
      ],
      provenanceHandle,
    );
  }
}

class ConfiguredRuntimeRendererCatalogRequest {
  constructor(
    readonly admission: RegistrationAdmissionProduct,
    readonly frameworkKind: FrameworkRegistrationKind,
    readonly catalogInputs: readonly BuiltInRuntimeRendererCatalogInput[],
  ) {}
}

function readConfiguredRuntimeRendererCatalogRequests(
  configuration: ConfigurationKernelEmission,
): readonly ConfiguredRuntimeRendererCatalogRequest[] {
  const requests: ConfiguredRuntimeRendererCatalogRequest[] = [];
  for (const admission of configuration.registrationAdmissions) {
    const frameworkKind = frameworkRegistrationKindForAdmission(admission);
    if (frameworkKind == null) {
      continue;
    }
    const catalogInputs = runtimeRendererCatalogInputsForAdmission(frameworkKind);
    if (catalogInputs.length === 0) {
      continue;
    }
    requests.push(new ConfiguredRuntimeRendererCatalogRequest(admission, frameworkKind, catalogInputs));
  }
  return requests;
}

function runtimeRendererCatalogInputsForAdmission(
  frameworkKind: FrameworkRegistrationKind,
): readonly BuiltInRuntimeRendererCatalogInput[] {
  const inputs: BuiltInRuntimeRendererCatalogInput[] = [];
  for (const capability of frameworkRegistrationCapabilitiesForKind(frameworkKind)) {
    switch (capability) {
      case FrameworkRegistrationCapability.RuntimeHtmlDefaultRenderers:
        inputs.push(RuntimeRendererCatalogs.RuntimeHtmlDefaultRenderers);
        break;
      case FrameworkRegistrationCapability.I18nTranslationRenderers:
        inputs.push(RuntimeRendererCatalogs.I18nTranslationRenderers);
        break;
      case FrameworkRegistrationCapability.StateRuntimeRenderers:
        inputs.push(RuntimeRendererCatalogs.StateDefaultRenderers);
        break;
      case FrameworkRegistrationCapability.RuntimeHtmlCompilerServices:
      case FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingSyntax:
      case FrameworkRegistrationCapability.RuntimeHtmlShortHandBindingSyntax:
      case FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingLanguage:
      case FrameworkRegistrationCapability.RuntimeHtmlDefaultResources:
      case FrameworkRegistrationCapability.I18nDefaultResources:
      case FrameworkRegistrationCapability.I18nTranslationSyntax:
      case FrameworkRegistrationCapability.I18nServiceResolvers:
      case FrameworkRegistrationCapability.I18nLifecycleTasks:
      case FrameworkRegistrationCapability.ValidationServiceResolvers:
      case FrameworkRegistrationCapability.ValidationHtmlDefaultResources:
      case FrameworkRegistrationCapability.ValidationHtmlServiceResolvers:
      case FrameworkRegistrationCapability.RouterDefaultComponents:
      case FrameworkRegistrationCapability.RouterDefaultResources:
      case FrameworkRegistrationCapability.RouterConfigurationResolvers:
      case FrameworkRegistrationCapability.RouterLifecycleTasks:
      case FrameworkRegistrationCapability.StateDefaultResources:
      case FrameworkRegistrationCapability.StateBindingSyntax:
      case FrameworkRegistrationCapability.StateStoreResolvers:
      case FrameworkRegistrationCapability.StateStoreTasks:
      case FrameworkRegistrationCapability.AppTask:
        break;
    }
  }
  return inputs;
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

function runtimeRendererCatalogInputKey(input: BuiltInRuntimeRendererCatalogInput): string {
  return catalogGroupLocalKey(input);
}

function runtimeRendererCatalogLocal(input: BuiltInRuntimeRendererCatalogInput): string {
  return `built-in-runtime-renderers:${catalogGroupLocalKey(input)}`;
}

function runtimeRendererCatalogSummaryForFrameworkKind(frameworkKind: FrameworkRegistrationKind): string {
  switch (frameworkKind) {
    case FrameworkRegistrationKind.StandardConfiguration:
      return 'RuntimeHtml StandardConfiguration admitted default runtime renderers.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultComponents:
      return 'RuntimeHtml DefaultComponents admitted compiler services but no runtime renderers.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultRenderers:
      return 'RuntimeHtml DefaultRenderers spread admitted default runtime renderers.';
    case FrameworkRegistrationKind.I18nConfiguration:
      return 'I18nConfiguration admitted translation runtime renderers.';
    case FrameworkRegistrationKind.ValidationConfiguration:
      return 'ValidationConfiguration admitted validation services but no runtime renderers.';
    case FrameworkRegistrationKind.ValidationHtmlConfiguration:
      return 'ValidationHtmlConfiguration admitted validation resources and services but no runtime renderers.';
    case FrameworkRegistrationKind.RouterConfiguration:
      return 'RouterConfiguration admitted no runtime renderers in the current catalog.';
    case FrameworkRegistrationKind.RouterDefaultComponents:
      return 'Router DefaultComponents admitted router services but no runtime renderers.';
    case FrameworkRegistrationKind.RouterDefaultResources:
      return 'Router DefaultResources admitted resources but no runtime renderers.';
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return 'StateDefaultConfiguration admitted state runtime renderers.';
    case FrameworkRegistrationKind.DialogConfiguration:
      return 'DialogConfiguration admitted dialog services but no runtime renderers.';
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

function catalogForInput(
  input: BuiltInRuntimeRendererCatalogInput,
  handles: BuiltInRuntimeRendererCatalogHandles,
  materializedRenderers: readonly RuntimeRenderer[],
  source: BuiltInRuntimeRendererSourceSet,
): BuiltInRuntimeRendererCatalog {
  return new BuiltInRuntimeRendererCatalog(
    handles.productHandle,
    handles.identityHandle,
    input.packageId,
    input.group,
    materializedRenderers,
    source.addressHandle,
    [],
  );
}

function productHandlesForRendererEmissions(
  emissions: readonly { readonly product: BuiltInRuntimeRendererEmission }[],
): readonly ProductHandle[] {
  return emissions.map((emission) => emission.product.renderer.productHandle!);
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
