import {
  AddressStability,
  ExternalAddress,
  SourceSpanAddress,
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
import { ConfigurationOptionValueKind } from '../configuration/configuration-option.js';
import {
  frameworkRegistrationKindForAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import { ResourceTargetReference } from '../resources/resource-reference.js';
import {
  AttributePatternExecutable,
  AttributePatternExecutionKind,
  CompiledAttributePattern,
  compileAttributePatternDefinition,
  type AttributePatternExecutableField,
} from './attribute-syntax.js';
import {
  BindingCommandExecutable,
  BindingCommandExecutionKind,
  type BindingCommandExecutableField,
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
  type ConfiguredBuiltInSyntaxCatalogSelectionField,
  type BuiltInAttributePattern,
  type BuiltInAttributePatternField,
  type BuiltInBindingCommand,
  type BuiltInBindingCommandField,
  type BuiltInSyntaxCatalogField,
  type BuiltInSyntaxGroup,
} from './built-in-syntax.js';

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

/** Materializes framework-owned syntax catalogs before compiler-world visibility is decided. */
export class BuiltInSyntaxCatalogProducer {
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

    return new BuiltInSyntaxCatalogEmission(
      catalogs,
      attributePatterns,
      bindingCommands,
      compiledPatterns,
      records,
    );
  }

  private recordsForCatalog(input: BuiltInSyntaxCatalogInput): {
    readonly records: readonly KernelStoreRecord[];
    readonly catalog: BuiltInSyntaxCatalog;
    readonly attributePatterns: readonly BuiltInAttributePatternEmission[];
    readonly bindingCommands: readonly BuiltInBindingCommandEmission[];
  } {
    const records: KernelStoreRecord[] = [];
    const local = `built-in-syntax:${input.packageId}:${input.group}${input.variantKey == null ? '' : `:${input.variantKey}`}`;
    const source = this.recordsForSource(
      `${local}:source`,
      input.packageId,
      input.group,
      `Framework built-in syntax catalog ${input.packageId}/${input.group}.`,
    );
    records.push(...source.records);

    const catalogProductHandle = this.store.handles.product(local);
    const catalogIdentityHandle = this.store.handles.identity(local);
    const attributePatternEmissions = input.attributePatterns.map((pattern, index) =>
      this.recordsForAttributePattern(
        pattern,
        `${local}:attribute-pattern:${index}`,
        catalogProductHandle,
        catalogIdentityHandle,
        source,
      )
    );
    const bindingCommandEmissions = input.bindingCommands.map((command, index) =>
      this.recordsForBindingCommand(
        command,
        `${local}:binding-command:${index}`,
        catalogProductHandle,
        catalogIdentityHandle,
        source,
      )
    );
    for (const emission of attributePatternEmissions) {
      records.push(...emission.records);
    }
    for (const emission of bindingCommandEmissions) {
      records.push(...emission.records);
    }

    const executableProductHandles = [
      ...attributePatternEmissions.map((emission) => emission.executable.productHandle),
      ...bindingCommandEmissions.map((emission) => emission.executable.productHandle),
    ];
    const catalogClaims = executableProductHandles.map((productHandle, index) => new SemanticClaim(
      this.store.handles.claim(`${local}:contains-syntax-resource:${index}`),
      catalogProductHandle,
      KernelVocabulary.Compiler.ContainsSyntaxResource.key,
      productHandle,
      source.provenanceHandle,
    ));
    records.push(...catalogClaims);

    const materializedAttributePatterns = attributePatternEmissions.map((emission) => emission.product.handler);
    const materializedBindingCommands = bindingCommandEmissions.map((emission) => emission.product.handler);
    const catalog = new BuiltInSyntaxCatalog(
      catalogProductHandle,
      catalogIdentityHandle,
      input.packageId,
      input.variantKey ?? null,
      input.group,
      materializedAttributePatterns,
      materializedBindingCommands,
      source.addressHandle,
      compactFieldProvenance<BuiltInSyntaxCatalogField>([
        new FieldProvenance('package', source.provenanceHandle),
        input.variantKey == null ? null : new FieldProvenance('variant', source.provenanceHandle),
        new FieldProvenance('group', source.provenanceHandle),
        materializedAttributePatterns.length === 0 ? null : new FieldProvenance('attributePatterns', source.provenanceHandle),
        materializedBindingCommands.length === 0 ? null : new FieldProvenance('bindingCommands', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    records.push(
      new CompilerIdentity(
        catalogIdentityHandle,
        IdentityStability.CrossProjectStable,
        CompilerIdentityKind.BuiltInSyntaxCatalog,
        null,
        source.addressHandle,
        input.variantKey == null
          ? `${input.packageId}:${input.group}`
          : `${input.packageId}:${input.group}:${input.variantKey}`,
      ),
      new MaterializedProduct(
        catalogProductHandle,
        KernelVocabulary.Compiler.BuiltInSyntaxCatalog.key,
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
          ...executableProductHandles,
          ...attributePatternEmissions.flatMap((emission) =>
            emission.compiledPatterns.map((pattern) => pattern.productHandle)
          ),
        ],
        catalogClaims.map((claim) => claim.handle),
      ),
    );

    return {
      records,
      catalog,
      attributePatterns: attributePatternEmissions.map((emission) => emission.product),
      bindingCommands: bindingCommandEmissions.map((emission) => emission.product),
    };
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
    const productHandle = this.store.handles.product(`${local}:executable`);
    const identityHandle = this.store.handles.identity(`${local}:executable`);
    const fieldProvenance = compactFieldProvenance<BuiltInAttributePatternField>([
      new FieldProvenance('targetName', source.provenanceHandle),
      new FieldProvenance('patterns', source.provenanceHandle),
      new FieldProvenance('package', source.provenanceHandle),
      new FieldProvenance('group', source.provenanceHandle),
    ]);
    const materializedHandler = materializeAttributePatternHandler(
      handler,
      productHandle,
      identityHandle,
      source.addressHandle,
      fieldProvenance,
    );
    const executable = new AttributePatternExecutable(
      productHandle,
      identityHandle,
      null,
      new ResourceTargetReference(null, source.addressHandle, materializedHandler.targetName),
      materializedHandler.patterns,
      AttributePatternExecutionKind.BuiltIn,
      source.addressHandle,
      compactFieldProvenance<AttributePatternExecutableField>([
        new FieldProvenance('target', source.provenanceHandle),
        new FieldProvenance('patterns', source.provenanceHandle),
        new FieldProvenance('executionKind', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    const compiledPatternEmissions = handler.patterns.map((definition, index) =>
      this.recordsForCompiledPattern(definition, `${local}:compiled-pattern:${index}`, identityHandle, productHandle, source)
    );
    const records: KernelStoreRecord[] = [
      new CompilerIdentity(
        identityHandle,
        IdentityStability.CrossProjectStable,
        CompilerIdentityKind.AttributePatternExecutable,
        catalogIdentityHandle,
        source.addressHandle,
        materializedHandler.targetName,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Compiler.AttributePatternExecutable.key,
        identityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      ...compiledPatternEmissions.flatMap((emission) => emission.records),
    ];
    const compiledPatterns = compiledPatternEmissions.map((emission) => emission.product);
    return {
      records,
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

  private recordsForCompiledPattern(
    definition: BuiltInAttributePattern['patterns'][number],
    local: string,
    ownerIdentityHandle: IdentityHandle,
    executableProductHandle: ProductHandle,
    source: BuiltInSyntaxSourceSet,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly product: CompiledAttributePattern;
  } {
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const compiled = compileAttributePatternDefinition(definition);
    const product = new CompiledAttributePattern(
      productHandle,
      identityHandle,
      definition,
      compiled.tokens,
      compiled.score,
      compiled.symbols,
      executableProductHandle,
      definition.addressHandle ?? source.addressHandle,
    );
    return {
      records: [
        new CompilerIdentity(
          identityHandle,
          IdentityStability.CrossProjectStable,
          CompilerIdentityKind.CompiledAttributePattern,
          ownerIdentityHandle,
          product.sourceAddressHandle,
          definition.pattern,
        ),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Compiler.CompiledAttributePattern.key,
          identityHandle,
          product.sourceAddressHandle,
          source.provenanceHandle,
        ),
      ],
      product,
    };
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
    const productHandle = this.store.handles.product(`${local}:executable`);
    const identityHandle = this.store.handles.identity(`${local}:executable`);
    const fieldProvenance = compactFieldProvenance<BuiltInBindingCommandField>([
      new FieldProvenance('targetName', source.provenanceHandle),
      new FieldProvenance('name', source.provenanceHandle),
      handler.aliases.length === 0 ? null : new FieldProvenance('aliases', source.provenanceHandle),
      new FieldProvenance('key', source.provenanceHandle),
      new FieldProvenance('ignoreAttr', source.provenanceHandle),
      new FieldProvenance('produces', source.provenanceHandle),
      handler.producedInstructionTypeNames.length === 0 ? null : new FieldProvenance('producedInstructionTypeNames', source.provenanceHandle),
      new FieldProvenance('package', source.provenanceHandle),
      new FieldProvenance('group', source.provenanceHandle),
    ]);
    const materializedHandler = materializeBindingCommandHandler(
      handler,
      productHandle,
      identityHandle,
      source.addressHandle,
      fieldProvenance,
    );
    const executable = new BindingCommandExecutable(
      productHandle,
      identityHandle,
      null,
      new ResourceTargetReference(null, source.addressHandle, materializedHandler.targetName),
      materializedHandler.name,
      materializedHandler.aliases,
      materializedHandler.key,
      materializedHandler.ignoreAttr,
      BindingCommandExecutionKind.BuiltIn,
      source.addressHandle,
      compactFieldProvenance<BindingCommandExecutableField>([
        new FieldProvenance('target', source.provenanceHandle),
        new FieldProvenance('name', source.provenanceHandle),
        materializedHandler.aliases.length === 0 ? null : new FieldProvenance('aliases', source.provenanceHandle),
        new FieldProvenance('key', source.provenanceHandle),
        new FieldProvenance('ignoreAttr', source.provenanceHandle),
        new FieldProvenance('executionKind', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    const records: KernelStoreRecord[] = [
      new CompilerIdentity(
        identityHandle,
        IdentityStability.CrossProjectStable,
        CompilerIdentityKind.BindingCommandExecutable,
        catalogIdentityHandle,
        source.addressHandle,
        materializedHandler.name,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Compiler.BindingCommandExecutable.key,
        identityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
    ];
    return {
      records,
      product: new BuiltInBindingCommandEmission(
        catalogProductHandle,
        materializedHandler,
        executable,
      ),
      executable,
    };
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
    return new BuiltInSyntaxSourceSet(records, addressHandle, provenanceHandle);
  }
}

/**
 * Selects framework-owned syntax catalogs admitted by known framework registrations.
 *
 * This is not final template-scope visibility. It only says that recognized framework registration effects made these
 * built-in syntax catalogs available to later attribute-parser and binding-command resolver input.
 */
export class ConfiguredBuiltInSyntaxCatalogProducer {
  private readonly catalogProducer: BuiltInSyntaxCatalogProducer;

  constructor(
    /** Hot analysis store that receives configured syntax-catalog selection records. */
    readonly store: KernelStore,
  ) {
    this.catalogProducer = new BuiltInSyntaxCatalogProducer(store);
  }

  materialize(configuration: ConfigurationKernelEmission): ConfiguredBuiltInSyntaxCatalogEmission {
    const selectionInputs = readConfiguredSyntaxCatalogInputs(configuration, this.store);
    const catalogInputs = uniqueCatalogInputs(selectionInputs.flatMap((input) => input.catalogInputs));
    const catalogEmission = this.catalogProducer.materialize(catalogInputs);
    const catalogsByKey = new Map(catalogEmission.catalogs.map((catalog) => [catalogKey(catalog), catalog]));

    const records: KernelStoreRecord[] = [];
    const selections: ConfiguredBuiltInSyntaxCatalogSelection[] = [];
    for (const input of selectionInputs) {
      const catalogs = input.catalogInputs
        .map((catalogInput) => catalogsByKey.get(catalogInputKey(catalogInput)) ?? null)
        .filter((catalog): catalog is BuiltInSyntaxCatalog => catalog != null);
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
      this.store.commit(new KernelStoreBatch(records, 'configured-built-in-syntax-catalogs'));
    }

    return new ConfiguredBuiltInSyntaxCatalogEmission(catalogEmission, selections, records);
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
      summaryForFrameworkKind(frameworkKind),
    );
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const claims = catalogs.map((catalog, index) => new SemanticClaim(
      this.store.handles.claim(`${local}:admits-syntax-catalog:${index}`),
      productHandle,
      KernelVocabulary.Compiler.AdmitsSyntaxCatalog.key,
      catalog.productHandle,
      source.provenanceHandle,
    ));
    const selection = new ConfiguredBuiltInSyntaxCatalogSelection(
      productHandle,
      identityHandle,
      admission.productHandle,
      frameworkKind,
      catalogs.map((catalog) => catalog.productHandle),
      admission.sourceAddressHandle,
      compactFieldProvenance<ConfiguredBuiltInSyntaxCatalogSelectionField>([
        new FieldProvenance('registrationAdmission', source.provenanceHandle),
        new FieldProvenance('frameworkKind', source.provenanceHandle),
        new FieldProvenance('catalogs', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    return new ConfiguredSyntaxSelectionEmission(
      [
        ...source.records,
        new CompilerIdentity(
          identityHandle,
          IdentityStability.SourceStable,
          CompilerIdentityKind.ConfiguredSyntaxCatalogSelection,
          admission.identityHandle,
          admission.sourceAddressHandle,
          frameworkKind,
        ),
        ...claims,
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Compiler.ConfiguredSyntaxCatalogSelection.key,
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

class ConfiguredSyntaxCatalogInput {
  constructor(
    readonly admission: RegistrationAdmissionProduct,
    readonly frameworkKind: FrameworkRegistrationKind,
    readonly catalogInputs: readonly BuiltInSyntaxCatalogInput[],
  ) {}
}

function readConfiguredSyntaxCatalogInputs(
  configuration: ConfigurationKernelEmission,
  store: KernelStore,
): readonly ConfiguredSyntaxCatalogInput[] {
  const inputs: ConfiguredSyntaxCatalogInput[] = [];
  for (const admission of configuration.registrationAdmissions) {
    const frameworkKind = frameworkRegistrationKindForAdmission(admission);
    if (frameworkKind == null) {
      continue;
    }
    const catalogInputs = catalogInputsForAdmission(frameworkKind, admission, configuration, store);
    if (catalogInputs.length === 0) {
      continue;
    }
    inputs.push(new ConfiguredSyntaxCatalogInput(admission, frameworkKind, catalogInputs));
  }
  return inputs;
}

function catalogInputsForAdmission(
  frameworkKind: FrameworkRegistrationKind,
  admission: RegistrationAdmissionProduct,
  configuration: ConfigurationKernelEmission,
  store: KernelStore,
): readonly BuiltInSyntaxCatalogInput[] {
  switch (frameworkKind) {
    case FrameworkRegistrationKind.StandardConfiguration:
      return [
        RuntimeHtmlBuiltInSyntaxCatalogs.DefaultBindingSyntax,
        RuntimeHtmlBuiltInSyntaxCatalogs.DefaultBindingLanguage,
        RuntimeHtmlBuiltInSyntaxCatalogs.PromiseTemplateControllerSyntax,
      ];
    case FrameworkRegistrationKind.I18nConfiguration:
      return [i18nTranslationSyntaxCatalogInput(readI18nTranslationAttributeAliases(admission, configuration, store))];
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return [ExtensionBuiltInSyntaxCatalogs.StateSyntax];
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
      return [RuntimeHtmlBuiltInSyntaxCatalogs.DefaultBindingSyntax];
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
      return [RuntimeHtmlBuiltInSyntaxCatalogs.ShortHandBindingSyntax];
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
      return [RuntimeHtmlBuiltInSyntaxCatalogs.DefaultBindingLanguage];
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return [RuntimeHtmlBuiltInSyntaxCatalogs.PromiseTemplateControllerSyntax];
    case FrameworkRegistrationKind.AppTask:
      return [];
  }
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
    if (sourceSpanContains(store, admission.sourceAddressHandle, contribution.sourceAddressHandle)) {
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

function sourceSpanContains(
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
    && container.fileHandle === candidate.fileHandle
    && container.start <= candidate.start
    && candidate.end <= container.end;
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

function uniqueCatalogInputs(
  inputs: readonly BuiltInSyntaxCatalogInput[],
): readonly BuiltInSyntaxCatalogInput[] {
  const seen = new Set<string>();
  const result: BuiltInSyntaxCatalogInput[] = [];
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

function catalogInputKey(input: BuiltInSyntaxCatalogInput): string {
  return `${input.packageId}:${input.group}:${input.variantKey ?? 'default'}`;
}

function catalogKey(catalog: BuiltInSyntaxCatalog): string {
  return `${catalog.packageId}:${catalog.group}:${catalog.variantKey ?? 'default'}`;
}

function summaryForFrameworkKind(frameworkKind: FrameworkRegistrationKind): string {
  switch (frameworkKind) {
    case FrameworkRegistrationKind.StandardConfiguration:
      return 'RuntimeHtml StandardConfiguration admitted framework template syntax catalogs.';
    case FrameworkRegistrationKind.I18nConfiguration:
      return 'I18nConfiguration admitted translation template syntax catalogs.';
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return 'StateDefaultConfiguration admitted state template syntax catalogs.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
      return 'RuntimeHtml DefaultBindingSyntax spread admitted framework attribute-pattern syntax.';
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
      return 'RuntimeHtml ShortHandBindingSyntax spread admitted shorthand attribute-pattern syntax.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
      return 'RuntimeHtml DefaultBindingLanguage spread admitted framework binding-command syntax.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return 'RuntimeHtml DefaultResources spread admitted promise template-controller syntax; remaining resource effects stay outside this catalog.';
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
