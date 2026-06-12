import {
  ExternalAddress,
  SourceSpanAddress,
  sourceSpanContains,
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
import { catalogVariantLocalKey } from '../kernel/local-key.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import { ConfigurationOptionValueKind } from '../configuration/configuration-option.js';
import {
  frameworkRegistrationKindForAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import {
  FrameworkRegistrationCapability,
  frameworkRegistrationCapabilitiesForKind,
} from '../registration/framework-registration-manifest.js';
import { ResourceTargetReference } from '../resources/resource-reference.js';
import {
  AttributePatternExecutable,
  AttributePatternExecutionKind,
  CompiledAttributePattern,
  compileAttributePatternDefinition,
} from './attribute-syntax.js';
import {
  BindingCommandExecutable,
  BindingCommandExecutionKind,
} from './binding-command-execution.js';
import {
  BuiltInSyntaxCatalog,
  BuiltInSyntaxPackage,
  ConfiguredBuiltInSyntaxCatalogSelection,
  ExtensionBuiltInSyntaxCatalogs,
  I18nTranslationAttributePattern,
  I18nTranslationBindAttributePattern,
  RuntimeHtmlBuiltInSyntaxCatalogs,
  TranslationBindBindingCommand,
  TranslationBindingCommand,
  TranslationParametersAttributePattern,
  TranslationParametersBindingCommand,
  type BuiltInAttributePattern,
  type BuiltInAttributePatternField,
  type BuiltInBindingCommand,
  type BuiltInBindingCommandField,
  type BuiltInSyntaxGroup,
} from './built-in-syntax.js';
import { TemplateProductDetails } from './product-details.js';

export interface BuiltInSyntaxCatalogInput {
  readonly packageId: BuiltInSyntaxPackage;
  readonly group: BuiltInSyntaxGroup;
  readonly variantKey?: string | null;
  readonly attributePatterns: readonly BuiltInAttributePattern[];
  readonly bindingCommands: readonly BuiltInBindingCommand[];
}

class BuiltInSyntaxSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly addressHandle: AddressHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class BuiltInSyntaxCatalogHandles {
  constructor(
    readonly local: string,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

export class BuiltInAttributePatternEmission {
  constructor(
    /** Built-in syntax catalog product that owns this executable. */
    readonly catalogProductHandle: ProductHandle,
    readonly handler: BuiltInAttributePattern,
    readonly executable: AttributePatternExecutable,
    readonly compiledPatterns: readonly CompiledAttributePattern[],
  ) {}
}

export class BuiltInBindingCommandEmission {
  constructor(
    /** Built-in syntax catalog product that owns this executable. */
    readonly catalogProductHandle: ProductHandle,
    readonly handler: BuiltInBindingCommand,
    readonly executable: BindingCommandExecutable,
  ) {}
}

export class BuiltInSyntaxCatalogEmission {
  constructor(
    readonly catalogs: readonly BuiltInSyntaxCatalog[],
    readonly attributePatterns: readonly BuiltInAttributePatternEmission[],
    readonly bindingCommands: readonly BuiltInBindingCommandEmission[],
    readonly compiledPatterns: readonly CompiledAttributePattern[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

export class ConfiguredBuiltInSyntaxCatalogEmission {
  constructor(
    readonly catalogEmission: BuiltInSyntaxCatalogEmission,
    readonly selections: readonly ConfiguredBuiltInSyntaxCatalogSelection[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class ConfiguredSyntaxSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class ConfiguredSyntaxSelectionEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly selection: ConfiguredBuiltInSyntaxCatalogSelection,
  ) {}
}

class ConfiguredSyntaxSelectionHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

class BuiltInExecutableHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

class BuiltInCompiledPatternHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

class BuiltInCompiledPatternEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly product: CompiledAttributePattern,
  ) {}
}

class BuiltInSyntaxCatalogPublication {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly catalog: BuiltInSyntaxCatalog,
    readonly attributePatterns: readonly BuiltInAttributePatternEmission[],
    readonly bindingCommands: readonly BuiltInBindingCommandEmission[],
  ) {}
}

/** Materializes framework-owned syntax catalogs before compiler-world visibility is decided. */
export class BuiltInSyntaxCatalogMaterializer {
  constructor(
    /** Hot analysis store that receives built-in syntax records. */
    readonly store: KernelStore,
  ) {}

  materialize(catalogInputs: readonly BuiltInSyntaxCatalogInput[]): BuiltInSyntaxCatalogEmission {
    const records: KernelStoreRecord[] = [];
    const catalogs: BuiltInSyntaxCatalog[] = [];
    const attributePatterns: BuiltInAttributePatternEmission[] = [];
    const bindingCommands: BuiltInBindingCommandEmission[] = [];
    const compiledPatterns: CompiledAttributePattern[] = [];

    for (const input of catalogInputs) {
      const emission = this.recordsForCatalog(input);
      if (this.store.readProduct(emission.catalog.productHandle) == null) {
        records.push(...emission.records);
      }
      catalogs.push(emission.catalog);
      attributePatterns.push(...emission.attributePatterns);
      bindingCommands.push(...emission.bindingCommands);
      compiledPatterns.push(...emission.attributePatterns.flatMap((pattern) => pattern.compiledPatterns));
    }

    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'built-in-syntax-catalogs'));
    }

    const emission = new BuiltInSyntaxCatalogEmission(
      catalogs,
      attributePatterns,
      bindingCommands,
      compiledPatterns,
      records,
    );
    this.registerProductDetails(emission);
    return emission;
  }

  private registerProductDetails(emission: BuiltInSyntaxCatalogEmission): void {
    for (const catalog of emission.catalogs) {
      this.store.productDetails.addIfAbsent(TemplateProductDetails.BuiltInSyntaxCatalog, catalog.productHandle, catalog);
    }
    for (const pattern of emission.attributePatterns) {
      this.store.productDetails.addIfAbsent(
        TemplateProductDetails.AttributePatternExecutable,
        pattern.executable.productHandle,
        pattern.executable,
      );
    }
    for (const command of emission.bindingCommands) {
      this.store.productDetails.addIfAbsent(
        TemplateProductDetails.BindingCommandExecutable,
        command.executable.productHandle,
        command.executable,
      );
    }
    for (const pattern of emission.compiledPatterns) {
      this.store.productDetails.addIfAbsent(TemplateProductDetails.CompiledAttributePattern, pattern.productHandle, pattern);
    }
  }

  private recordsForCatalog(input: BuiltInSyntaxCatalogInput): BuiltInSyntaxCatalogPublication {
    const records: KernelStoreRecord[] = [];
    const local = syntaxCatalogLocal(input);
    const source = this.recordsForSource(
      `${local}:source`,
      input.packageId,
      input.group,
      `Framework built-in syntax catalog ${input.packageId}/${input.group}.`,
    );
    const handles = this.syntaxCatalogHandles(local);
    records.push(...source.records);
    const attributePatternEmissions = input.attributePatterns.map((pattern, index) =>
      this.recordsForAttributePattern(
        pattern,
        `${local}:attribute-pattern:${index}`,
        handles.productHandle,
        handles.identityHandle,
        source,
      )
    );
    const bindingCommandEmissions = input.bindingCommands.map((command, index) =>
      this.recordsForBindingCommand(
        command,
        `${local}:binding-command:${index}`,
        handles.productHandle,
        handles.identityHandle,
        source,
      )
    );
    records.push(...attributePatternEmissions.flatMap((emission) => emission.records));
    records.push(...bindingCommandEmissions.flatMap((emission) => emission.records));

    const executableProductHandles = executableProductHandlesForSyntaxCatalog(
      attributePatternEmissions,
      bindingCommandEmissions,
    );
    const catalogClaims = this.claimsForSyntaxCatalogResources(
      handles,
      executableProductHandles,
      source,
    );
    records.push(...catalogClaims);

    const catalog = this.createSyntaxCatalog(
      input,
      handles,
      attributePatternEmissions,
      bindingCommandEmissions,
      source,
    );
    records.push(...this.recordsForSyntaxCatalog(
      handles,
      catalog,
      executableProductHandles,
      attributePatternEmissions,
      catalogClaims,
      source,
    ));

    return new BuiltInSyntaxCatalogPublication(
      records,
      catalog,
      attributePatternEmissions.map((emission) => emission.product),
      bindingCommandEmissions.map((emission) => emission.product),
    );
  }

  private syntaxCatalogHandles(local: string): BuiltInSyntaxCatalogHandles {
    return new BuiltInSyntaxCatalogHandles(
      local,
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }

  private claimsForSyntaxCatalogResources(
    handles: BuiltInSyntaxCatalogHandles,
    executableProductHandles: readonly ProductHandle[],
    source: BuiltInSyntaxSourceSet,
  ): readonly SemanticClaim[] {
    return executableProductHandles.map((productHandle, index) => new SemanticClaim(
      this.store.handles.claim(`${handles.local}:contains-syntax-resource:${index}`),
      handles.productHandle,
      KernelVocabulary.Compiler.ContainsSyntaxResource.key,
      productHandle,
      source.provenanceHandle,
    ));
  }

  private createSyntaxCatalog(
    input: BuiltInSyntaxCatalogInput,
    handles: BuiltInSyntaxCatalogHandles,
    attributePatterns: readonly {
      readonly product: BuiltInAttributePatternEmission;
    }[],
    bindingCommands: readonly {
      readonly product: BuiltInBindingCommandEmission;
    }[],
    source: BuiltInSyntaxSourceSet,
  ): BuiltInSyntaxCatalog {
    const materializedAttributePatterns = attributePatterns.map((emission) => emission.product.handler);
    const materializedBindingCommands = bindingCommands.map((emission) => emission.product.handler);
    return new BuiltInSyntaxCatalog(
      handles.productHandle,
      handles.identityHandle,
      input.packageId,
      input.variantKey ?? null,
      input.group,
      materializedAttributePatterns,
      materializedBindingCommands,
      source.addressHandle,
      [],
    );
  }

  private recordsForSyntaxCatalog(
    handles: BuiltInSyntaxCatalogHandles,
    catalog: BuiltInSyntaxCatalog,
    executableProductHandles: readonly ProductHandle[],
    attributePatterns: readonly {
      readonly compiledPatterns: readonly CompiledAttributePattern[];
    }[],
    catalogClaims: readonly SemanticClaim[],
    source: BuiltInSyntaxSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        handles.identityHandle,
        KernelVocabulary.Compiler.BuiltInSyntaxCatalog.key,
        null,
        catalog.sourceAddressHandle,
        syntaxCatalogIdentityDiscriminator(catalog),
      ),
      new MaterializedProduct(
        handles.productHandle,
        KernelVocabulary.Compiler.BuiltInSyntaxCatalog.key,
        handles.identityHandle,
        catalog.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(handles.local),
        handles.identityHandle,
        syntaxCatalogMaterializedProductHandles(handles, executableProductHandles, attributePatterns),
        catalogClaims.map((claim) => claim.handle),
      ),
    ];
  }

  private recordsForAttributePattern(
    handler: BuiltInAttributePattern,
    local: string,
    catalogProductHandle: ProductHandle,
    catalogIdentityHandle: IdentityHandle,
    source: BuiltInSyntaxSourceSet,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly product: BuiltInAttributePatternEmission;
    readonly executable: AttributePatternExecutable;
    readonly compiledPatterns: readonly CompiledAttributePattern[];
  } {
    const handles = this.executableHandles(`${local}:executable`);
    const materializedHandler = materializeAttributePatternHandler(
      handler,
      handles.productHandle,
      handles.identityHandle,
      source.addressHandle,
      [],
    );
    const executable = this.attributePatternExecutableFor(
      handles,
      source,
      materializedHandler,
    );
    const compiledPatternEmissions = handler.patterns.map((definition, index) =>
      this.recordsForCompiledPattern(
        definition,
        `${local}:compiled-pattern:${index}`,
        handles.identityHandle,
        handles.productHandle,
        source,
      )
    );
    const compiledPatternClaims = this.claimsForCompiledAttributePatterns(
      local,
      handles.productHandle,
      compiledPatternEmissions.map((emission) => emission.product),
      source,
    );
    const compiledPatterns = compiledPatternEmissions.map((emission) => emission.product);
    return {
      records: [
        ...this.recordsForAttributePatternExecutable(catalogIdentityHandle, executable, source),
        ...compiledPatternClaims,
        ...compiledPatternEmissions.flatMap((emission) => emission.records),
      ],
      product: new BuiltInAttributePatternEmission(
        catalogProductHandle,
        materializedHandler,
        executable,
        compiledPatterns,
      ),
      executable,
      compiledPatterns,
    };
  }

  private executableHandles(
    local: string,
  ): BuiltInExecutableHandles {
    return new BuiltInExecutableHandles(
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }

  private attributePatternExecutableFor(
    handles: BuiltInExecutableHandles,
    source: BuiltInSyntaxSourceSet,
    handler: BuiltInAttributePattern,
  ): AttributePatternExecutable {
    return new AttributePatternExecutable(
      handles.productHandle,
      handles.identityHandle,
      null,
      new ResourceTargetReference(null, source.addressHandle, handler.targetName),
      handler.patterns,
      AttributePatternExecutionKind.BuiltIn,
      source.addressHandle,
      [],
    );
  }

  private claimsForCompiledAttributePatterns(
    local: string,
    executableProductHandle: ProductHandle,
    compiledPatterns: readonly CompiledAttributePattern[],
    source: BuiltInSyntaxSourceSet,
  ): readonly SemanticClaim[] {
    return compiledPatterns.map((pattern, index) => new SemanticClaim(
      this.store.handles.claim(`${local}:compiles-attribute-pattern:${index}`),
      executableProductHandle,
      KernelVocabulary.Compiler.CompilesAttributePattern.key,
      pattern.productHandle,
      source.provenanceHandle,
    ));
  }

  private recordsForAttributePatternExecutable(
    catalogIdentityHandle: IdentityHandle,
    executable: AttributePatternExecutable,
    source: BuiltInSyntaxSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        executable.identityHandle,
        KernelVocabulary.Compiler.AttributePatternExecutable.key,
        catalogIdentityHandle,
        executable.sourceAddressHandle,
        executable.target?.localName ?? null,
      ),
      new MaterializedProduct(
        executable.productHandle,
        KernelVocabulary.Compiler.AttributePatternExecutable.key,
        executable.identityHandle,
        executable.sourceAddressHandle,
        source.provenanceHandle,
      ),
    ];
  }

  private recordsForCompiledPattern(
    definition: BuiltInAttributePattern['patterns'][number],
    local: string,
    ownerIdentityHandle: IdentityHandle,
    executableProductHandle: ProductHandle,
    source: BuiltInSyntaxSourceSet,
  ): BuiltInCompiledPatternEmission {
    const handles = this.compiledPatternHandles(local);
    const compiled = compileAttributePatternDefinition(definition);
    const product = this.compiledPatternProduct(definition, handles, compiled, executableProductHandle, source);
    return new BuiltInCompiledPatternEmission(
      this.recordsForCompiledPatternProduct(definition, product, handles, ownerIdentityHandle, source),
      product,
    );
  }

  private compiledPatternHandles(local: string): BuiltInCompiledPatternHandles {
    return new BuiltInCompiledPatternHandles(
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }

  private compiledPatternProduct(
    definition: BuiltInAttributePattern['patterns'][number],
    handles: BuiltInCompiledPatternHandles,
    compiled: ReturnType<typeof compileAttributePatternDefinition>,
    executableProductHandle: ProductHandle,
    source: BuiltInSyntaxSourceSet,
  ): CompiledAttributePattern {
    return new CompiledAttributePattern(
      handles.productHandle,
      handles.identityHandle,
      definition,
      compiled.tokens,
      compiled.score,
      compiled.symbols,
      executableProductHandle,
      definition.addressHandle ?? source.addressHandle,
    );
  }

  private recordsForCompiledPatternProduct(
    definition: BuiltInAttributePattern['patterns'][number],
    product: CompiledAttributePattern,
    handles: BuiltInCompiledPatternHandles,
    ownerIdentityHandle: IdentityHandle,
    source: BuiltInSyntaxSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        handles.identityHandle,
        KernelVocabulary.Compiler.CompiledAttributePattern.key,
        ownerIdentityHandle,
        product.sourceAddressHandle,
        definition.pattern,
      ),
      new MaterializedProduct(
        handles.productHandle,
        KernelVocabulary.Compiler.CompiledAttributePattern.key,
        handles.identityHandle,
        product.sourceAddressHandle,
        source.provenanceHandle,
      ),
    ];
  }

  private recordsForBindingCommand(
    handler: BuiltInBindingCommand,
    local: string,
    catalogProductHandle: ProductHandle,
    catalogIdentityHandle: IdentityHandle,
    source: BuiltInSyntaxSourceSet,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly product: BuiltInBindingCommandEmission;
    readonly executable: BindingCommandExecutable;
  } {
    const handles = this.executableHandles(`${local}:executable`);
    const materializedHandler = materializeBindingCommandHandler(
      handler,
      handles.productHandle,
      handles.identityHandle,
      source.addressHandle,
      [],
    );
    const executable = this.bindingCommandExecutableFor(
      handles,
      source,
      materializedHandler,
    );
    return {
      records: this.recordsForBindingCommandExecutable(catalogIdentityHandle, executable, source),
      product: new BuiltInBindingCommandEmission(
        catalogProductHandle,
        materializedHandler,
        executable,
      ),
      executable,
    };
  }

  private bindingCommandExecutableFor(
    handles: BuiltInExecutableHandles,
    source: BuiltInSyntaxSourceSet,
    handler: BuiltInBindingCommand,
  ): BindingCommandExecutable {
    return new BindingCommandExecutable(
      handles.productHandle,
      handles.identityHandle,
      null,
      new ResourceTargetReference(null, source.addressHandle, handler.targetName),
      handler.name,
      handler.aliases,
      handler.key,
      handler.ignoreAttr,
      BindingCommandExecutionKind.BuiltIn,
      source.addressHandle,
      [],
    );
  }

  private recordsForBindingCommandExecutable(
    catalogIdentityHandle: IdentityHandle,
    executable: BindingCommandExecutable,
    source: BuiltInSyntaxSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        executable.identityHandle,
        KernelVocabulary.Compiler.BindingCommandExecutable.key,
        catalogIdentityHandle,
        executable.sourceAddressHandle,
        executable.name,
      ),
      new MaterializedProduct(
        executable.productHandle,
        KernelVocabulary.Compiler.BindingCommandExecutable.key,
        executable.identityHandle,
        executable.sourceAddressHandle,
        source.provenanceHandle,
      ),
    ];
  }

  private recordsForSource(
    local: string,
    packageId: BuiltInSyntaxPackage,
    group: BuiltInSyntaxGroup,
    summary: string,
  ): BuiltInSyntaxSourceSet {
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
    return new BuiltInSyntaxSourceSet(records, addressHandle, provenanceHandle);
  }
}

/**
 * Selects framework-owned syntax catalogs admitted by known framework registrations.
 *
 * This is not final template-scope visibility. It only says that recognized framework registration effects made these
 * built-in syntax catalogs available to later attribute-parser and binding-command resolver input.
 */
export class ConfiguredBuiltInSyntaxCatalogMaterializer {
  private readonly catalogMaterializer: BuiltInSyntaxCatalogMaterializer;

  constructor(
    /** Hot analysis store that receives configured syntax-catalog selection records. */
    readonly store: KernelStore,
  ) {
    this.catalogMaterializer = new BuiltInSyntaxCatalogMaterializer(store);
  }

  materialize(configuration: ConfigurationKernelEmission): ConfiguredBuiltInSyntaxCatalogEmission {
    const selectionRequests = readConfiguredSyntaxCatalogRequests(configuration, this.store);
    const catalogEmission = this.catalogEmissionForRequests(selectionRequests);
    const selectionEmission = this.selectionEmissionForRequests(selectionRequests, catalogEmission);
    this.commitSelectionRecords(selectionEmission.records);
    this.registerSelectionDetails(selectionEmission.selections);

    return new ConfiguredBuiltInSyntaxCatalogEmission(
      catalogEmission,
      selectionEmission.selections,
      selectionEmission.records,
    );
  }

  private catalogEmissionForRequests(
    selectionRequests: readonly ConfiguredSyntaxCatalogRequest[],
  ): BuiltInSyntaxCatalogEmission {
    const catalogInputs = uniqueByKey(
      selectionRequests.flatMap((request) => request.catalogInputs),
      syntaxCatalogInputKey,
    );
    return this.catalogMaterializer.materialize(catalogInputs);
  }

  private selectionEmissionForRequests(
    selectionRequests: readonly ConfiguredSyntaxCatalogRequest[],
    catalogEmission: BuiltInSyntaxCatalogEmission,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly selections: readonly ConfiguredBuiltInSyntaxCatalogSelection[];
  } {
    const catalogsByKey = new Map(catalogEmission.catalogs.map((catalog) => [catalogVariantLocalKey(catalog), catalog]));
    const records: KernelStoreRecord[] = [];
    const selections: ConfiguredBuiltInSyntaxCatalogSelection[] = [];
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
    request: ConfiguredSyntaxCatalogRequest,
    catalogsByKey: ReadonlyMap<string, BuiltInSyntaxCatalog>,
  ): readonly BuiltInSyntaxCatalog[] {
    return request.catalogInputs
      .map((catalogInput) => catalogsByKey.get(syntaxCatalogInputKey(catalogInput)) ?? null)
      .filter((catalog): catalog is BuiltInSyntaxCatalog => catalog != null);
  }

  private commitSelectionRecords(records: readonly KernelStoreRecord[]): void {
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'configured-built-in-syntax-catalogs'));
    }
  }

  private registerSelectionDetails(selections: readonly ConfiguredBuiltInSyntaxCatalogSelection[]): void {
    for (const selection of selections) {
      this.store.productDetails.addIfAbsent(
        TemplateProductDetails.ConfiguredBuiltInSyntaxCatalogSelection,
        selection.productHandle,
        selection,
      );
    }
  }

  private recordsForSelection(
    admission: RegistrationAdmissionProduct,
    frameworkKind: FrameworkRegistrationKind,
    catalogs: readonly BuiltInSyntaxCatalog[],
  ): ConfiguredSyntaxSelectionEmission {
    const local = `configured-syntax-catalog:${admission.productHandle}`;
    const source = this.recordsForConfiguredSource(
      local,
      admission.sourceAddressHandle,
      syntaxCatalogSummaryForFrameworkKind(frameworkKind),
    );
    const handles = this.configuredSelectionHandles(local);
    const claims = this.claimsForConfiguredSelection(local, handles.productHandle, catalogs, source);
    const selection = this.createConfiguredSelection(admission, frameworkKind, catalogs, handles, source);
    return new ConfiguredSyntaxSelectionEmission(
      this.recordsForConfiguredSelectionProduct(local, admission, frameworkKind, source, handles, claims),
      selection,
    );
  }

  private configuredSelectionHandles(local: string): ConfiguredSyntaxSelectionHandles {
    return new ConfiguredSyntaxSelectionHandles(
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }

  private claimsForConfiguredSelection(
    local: string,
    selectionProductHandle: ProductHandle,
    catalogs: readonly BuiltInSyntaxCatalog[],
    source: ConfiguredSyntaxSourceSet,
  ): readonly SemanticClaim[] {
    return catalogs.map((catalog, index) => new SemanticClaim(
      this.store.handles.claim(`${local}:admits-syntax-catalog:${index}`),
      selectionProductHandle,
      KernelVocabulary.Compiler.AdmitsSyntaxCatalog.key,
      catalog.productHandle,
      source.provenanceHandle,
    ));
  }

  private createConfiguredSelection(
    admission: RegistrationAdmissionProduct,
    frameworkKind: FrameworkRegistrationKind,
    catalogs: readonly BuiltInSyntaxCatalog[],
    handles: ConfiguredSyntaxSelectionHandles,
    source: ConfiguredSyntaxSourceSet,
  ): ConfiguredBuiltInSyntaxCatalogSelection {
    return new ConfiguredBuiltInSyntaxCatalogSelection(
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
    source: ConfiguredSyntaxSourceSet,
    handles: ConfiguredSyntaxSelectionHandles,
    claims: readonly SemanticClaim[],
  ): readonly KernelStoreRecord[] {
    return [
      ...source.records,
      new CompilerIdentity(
        handles.identityHandle,
        KernelVocabulary.Compiler.ConfiguredSyntaxCatalogSelection.key,
        admission.identityHandle,
        admission.sourceAddressHandle,
        frameworkKind,
      ),
      ...claims,
      new MaterializedProduct(
        handles.productHandle,
        KernelVocabulary.Compiler.ConfiguredSyntaxCatalogSelection.key,
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
  ): ConfiguredSyntaxSourceSet {
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    return new ConfiguredSyntaxSourceSet(
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

class ConfiguredSyntaxCatalogRequest {
  constructor(
    readonly admission: RegistrationAdmissionProduct,
    readonly frameworkKind: FrameworkRegistrationKind,
    readonly catalogInputs: readonly BuiltInSyntaxCatalogInput[],
  ) {}
}

function readConfiguredSyntaxCatalogRequests(
  configuration: ConfigurationKernelEmission,
  store: KernelStore,
): readonly ConfiguredSyntaxCatalogRequest[] {
  const requests: ConfiguredSyntaxCatalogRequest[] = [];
  for (const admission of configuration.registrationAdmissions) {
    const frameworkKind = frameworkRegistrationKindForAdmission(admission);
    if (frameworkKind == null) {
      continue;
    }
    const catalogInputs = syntaxCatalogInputsForAdmission(frameworkKind, admission, configuration, store);
    if (catalogInputs.length === 0) {
      continue;
    }
    requests.push(new ConfiguredSyntaxCatalogRequest(admission, frameworkKind, catalogInputs));
  }
  return requests;
}

function syntaxCatalogInputsForAdmission(
  frameworkKind: FrameworkRegistrationKind,
  admission: RegistrationAdmissionProduct,
  configuration: ConfigurationKernelEmission,
  store: KernelStore,
): readonly BuiltInSyntaxCatalogInput[] {
  const inputs: BuiltInSyntaxCatalogInput[] = [];
  for (const capability of frameworkRegistrationCapabilitiesForKind(frameworkKind)) {
    switch (capability) {
      case FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingSyntax:
        inputs.push(RuntimeHtmlBuiltInSyntaxCatalogs.DefaultBindingSyntax);
        break;
      case FrameworkRegistrationCapability.RuntimeHtmlShortHandBindingSyntax:
        inputs.push(RuntimeHtmlBuiltInSyntaxCatalogs.ShortHandBindingSyntax);
        break;
      case FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingLanguage:
        inputs.push(RuntimeHtmlBuiltInSyntaxCatalogs.DefaultBindingLanguage);
        break;
      case FrameworkRegistrationCapability.RuntimeHtmlDefaultResources:
        inputs.push(RuntimeHtmlBuiltInSyntaxCatalogs.PromiseTemplateControllerSyntax);
        break;
      case FrameworkRegistrationCapability.I18nTranslationSyntax:
        inputs.push(i18nTranslationSyntaxCatalogInput(readI18nTranslationAttributeAliases(admission, configuration, store)));
        break;
      case FrameworkRegistrationCapability.StateBindingSyntax:
        inputs.push(ExtensionBuiltInSyntaxCatalogs.StateSyntax);
        break;
      case FrameworkRegistrationCapability.RuntimeHtmlCompilerServices:
      case FrameworkRegistrationCapability.RuntimeHtmlDefaultRenderers:
      case FrameworkRegistrationCapability.I18nDefaultResources:
      case FrameworkRegistrationCapability.I18nTranslationRenderers:
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
      case FrameworkRegistrationCapability.StateRuntimeRenderers:
      case FrameworkRegistrationCapability.StateStoreResolvers:
      case FrameworkRegistrationCapability.StateStoreTasks:
      case FrameworkRegistrationCapability.UiVirtualizationDefaultResources:
      case FrameworkRegistrationCapability.UiVirtualizationServiceResolvers:
      case FrameworkRegistrationCapability.AppTask:
        break;
    }
  }
  return inputs;
}

function readI18nTranslationAttributeAliases(
  admission: RegistrationAdmissionProduct,
  configuration: ConfigurationKernelEmission,
  store: KernelStore,
): readonly string[] | null {
  let aliases: readonly string[] | null = null;

  for (const contribution of configuration.optionContributions) {
    if (!isI18nTranslationAliasContribution(contribution)) {
      continue;
    }
    if (sourceSpanHandleContains(store, admission.sourceAddressHandle, contribution.sourceAddressHandle)) {
      aliases = contribution.value.values;
      continue;
    }
    for (const step of configuration.steps) {
      if (
        step.registrationAdmissionProductHandles.includes(admission.productHandle)
        && step.producedProductHandles.includes(contribution.productHandle)
      ) {
        aliases = contribution.value.values;
      }
    }
  }

  return aliases;
}

function isI18nTranslationAliasContribution(
  contribution: ConfigurationKernelEmission['optionContributions'][number],
): contribution is ConfigurationKernelEmission['optionContributions'][number] & {
  readonly value: { readonly valueKind: ConfigurationOptionValueKind.StringArray; readonly values: readonly string[] };
} {
  return contribution.optionPath.length === 1
    && contribution.optionPath[0] === 'translationAttributeAliases'
    && contribution.value.valueKind === ConfigurationOptionValueKind.StringArray;
}

function sourceSpanHandleContains(
  store: KernelStore,
  containerHandle: AddressHandle | null,
  candidateHandle: AddressHandle | null,
): boolean {
  if (containerHandle == null || candidateHandle == null) {
    return false;
  }
  const container = store.readAddress(containerHandle);
  const candidate = store.readAddress(candidateHandle);
  return container instanceof SourceSpanAddress
    && candidate instanceof SourceSpanAddress
    && sourceSpanContains(container, candidate);
}

function i18nTranslationSyntaxCatalogInput(
  configuredAliases: readonly string[] | null,
): BuiltInSyntaxCatalogInput {
  if (configuredAliases == null || aliasesAreDefaultI18nTranslationAliases(configuredAliases)) {
    return ExtensionBuiltInSyntaxCatalogs.I18nTranslationSyntax;
  }

  const aliases = [...configuredAliases];
  const commandAliases = aliases.filter((alias) => alias !== 't');
  const bindCommandAliases = commandAliases.map((alias) => `${alias}.bind`);
  return {
    packageId: BuiltInSyntaxPackage.I18n,
    group: ExtensionBuiltInSyntaxCatalogs.I18nTranslationSyntax.group,
    variantKey: `aliases:${aliases.map(encodeCatalogVariantPart).join(',')}`,
    attributePatterns: [
      new I18nTranslationAttributePattern(null, null, null, [], aliases),
      new I18nTranslationBindAttributePattern(null, null, null, [], aliases),
      new TranslationParametersAttributePattern(),
    ],
    bindingCommands: [
      new TranslationBindingCommand(null, null, null, [], commandAliases),
      new TranslationBindBindingCommand(null, null, null, [], bindCommandAliases),
      new TranslationParametersBindingCommand(),
    ],
  };
}

function aliasesAreDefaultI18nTranslationAliases(aliases: readonly string[]): boolean {
  return aliases.length === 1 && aliases[0] === 't';
}

function encodeCatalogVariantPart(part: string): string {
  return encodeURIComponent(part).replace(/%/g, '~');
}

function syntaxCatalogInputKey(input: BuiltInSyntaxCatalogInput): string {
  return catalogVariantLocalKey(input);
}

function syntaxCatalogLocal(input: BuiltInSyntaxCatalogInput): string {
  return `built-in-syntax:${catalogVariantLocalKey(input)}`;
}

function syntaxCatalogIdentityDiscriminator(catalog: BuiltInSyntaxCatalog): string {
  return catalog.variantKey == null
    ? `${catalog.packageId}:${catalog.group}`
    : `${catalog.packageId}:${catalog.group}:${catalog.variantKey}`;
}

function executableProductHandlesForSyntaxCatalog(
  attributePatterns: readonly {
    readonly executable: AttributePatternExecutable;
  }[],
  bindingCommands: readonly {
    readonly executable: BindingCommandExecutable;
  }[],
): readonly ProductHandle[] {
  return [
    ...attributePatterns.map((emission) => emission.executable.productHandle),
    ...bindingCommands.map((emission) => emission.executable.productHandle),
  ];
}

function syntaxCatalogMaterializedProductHandles(
  handles: BuiltInSyntaxCatalogHandles,
  executableProductHandles: readonly ProductHandle[],
  attributePatterns: readonly {
    readonly compiledPatterns: readonly CompiledAttributePattern[];
  }[],
): readonly ProductHandle[] {
  return [
    handles.productHandle,
    ...executableProductHandles,
    ...attributePatterns.flatMap((emission) =>
      emission.compiledPatterns.map((pattern) => pattern.productHandle)
    ),
  ];
}

function syntaxCatalogSummaryForFrameworkKind(frameworkKind: FrameworkRegistrationKind): string {
  switch (frameworkKind) {
    case FrameworkRegistrationKind.StandardConfiguration:
      return 'RuntimeHtml StandardConfiguration admitted framework template syntax catalogs.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultComponents:
      return 'RuntimeHtml DefaultComponents admitted compiler services but no template syntax catalogs.';
    case FrameworkRegistrationKind.I18nConfiguration:
      return 'I18nConfiguration admitted translation template syntax catalogs.';
    case FrameworkRegistrationKind.ValidationConfiguration:
      return 'ValidationConfiguration admitted validation services but no template syntax catalogs.';
    case FrameworkRegistrationKind.ValidationHtmlConfiguration:
      return 'ValidationHtmlConfiguration admitted validation resources and services but no additional template syntax catalogs.';
    case FrameworkRegistrationKind.RouterConfiguration:
      return 'RouterConfiguration admitted no template syntax catalogs in the current materializer.';
    case FrameworkRegistrationKind.RouterDefaultComponents:
      return 'Router DefaultComponents admitted router services but no template syntax catalogs.';
    case FrameworkRegistrationKind.RouterDefaultResources:
      return 'Router DefaultResources admitted resources but no template syntax catalogs.';
    case FrameworkRegistrationKind.UiVirtualizationDefaultConfiguration:
      return 'DefaultVirtualizationConfiguration admitted virtual-repeat resources but no additional template syntax catalogs.';
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return 'StateDefaultConfiguration admitted state template syntax catalogs.';
    case FrameworkRegistrationKind.DialogConfiguration:
      return 'DialogConfiguration admitted dialog services but no template syntax catalogs.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
      return 'RuntimeHtml DefaultBindingSyntax spread admitted framework attribute-pattern syntax.';
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
      return 'RuntimeHtml ShortHandBindingSyntax spread admitted shorthand attribute-pattern syntax.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
      return 'RuntimeHtml DefaultBindingLanguage spread admitted framework binding-command syntax.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return 'RuntimeHtml DefaultResources spread admitted promise template-controller syntax; remaining resource effects stay outside this catalog.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultRenderers:
      return 'RuntimeHtml DefaultRenderers admitted renderers but no template syntax catalogs.';
    case FrameworkRegistrationKind.AppTask:
      return 'AppTask registry does not admit template syntax catalogs.';
  }
}

type BuiltInAttributePatternConstructor = new (
  productHandle?: ProductHandle | null,
  identityHandle?: IdentityHandle | null,
  sourceAddressHandle?: AddressHandle | null,
  fieldProvenance?: readonly FieldProvenance<BuiltInAttributePatternField>[],
) => BuiltInAttributePattern;

type BuiltInBindingCommandConstructor = new (
  productHandle?: ProductHandle | null,
  identityHandle?: IdentityHandle | null,
  sourceAddressHandle?: AddressHandle | null,
  fieldProvenance?: readonly FieldProvenance<BuiltInBindingCommandField>[],
) => BuiltInBindingCommand;

function materializeAttributePatternHandler(
  handler: BuiltInAttributePattern,
  productHandle: ProductHandle,
  identityHandle: IdentityHandle,
  sourceAddressHandle: AddressHandle,
  fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[],
): BuiltInAttributePattern {
  if (handler instanceof I18nTranslationAttributePattern) {
    return new I18nTranslationAttributePattern(
      productHandle,
      identityHandle,
      sourceAddressHandle,
      fieldProvenance,
      handler.aliases,
    );
  }
  if (handler instanceof I18nTranslationBindAttributePattern) {
    return new I18nTranslationBindAttributePattern(
      productHandle,
      identityHandle,
      sourceAddressHandle,
      fieldProvenance,
      handler.aliases,
    );
  }
  const Constructor = handler.constructor as BuiltInAttributePatternConstructor;
  return new Constructor(productHandle, identityHandle, sourceAddressHandle, fieldProvenance);
}

function materializeBindingCommandHandler(
  handler: BuiltInBindingCommand,
  productHandle: ProductHandle,
  identityHandle: IdentityHandle,
  sourceAddressHandle: AddressHandle,
  fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[],
): BuiltInBindingCommand {
  if (handler instanceof TranslationBindingCommand) {
    return new TranslationBindingCommand(
      productHandle,
      identityHandle,
      sourceAddressHandle,
      fieldProvenance,
      handler.aliases,
    );
  }
  if (handler instanceof TranslationBindBindingCommand) {
    return new TranslationBindBindingCommand(
      productHandle,
      identityHandle,
      sourceAddressHandle,
      fieldProvenance,
      handler.aliases,
    );
  }
  const Constructor = handler.constructor as BuiltInBindingCommandConstructor;
  return new Constructor(productHandle, identityHandle, sourceAddressHandle, fieldProvenance);
}
