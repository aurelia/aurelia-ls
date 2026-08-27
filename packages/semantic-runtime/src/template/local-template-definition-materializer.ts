import {
  SourceSpanAddress,
  SourceSpanRole,
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
} from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  AureliaResourceDeclarationKind,
  AureliaResourceIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import {
  KernelPublicationPlan,
  publishProductDetail,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import {
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { sourceSpanAddressForSite } from '../kernel/source-address.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { bindableAttributeNameForProperty } from '../resources/bindable-attribute.js';
import {
  BindableBindingMode,
  BindableContributionKind,
  BindableDefinition,
  BindableDefinitionContribution,
  BindableSetterDefinition,
  BindableSetterKind,
} from '../resources/bindable-definition.js';
import {
  CustomElementCaptureDefinition,
  CustomElementCaptureKind,
  CustomElementDefinition,
  CustomElementDefinitionContribution,
  CustomElementTemplateDefinition,
  CustomElementTemplateKind,
} from '../resources/custom-element-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import {
  NamedResourceDefinitionContributionKind,
  ResourceDefinitionKind,
  runtimeResourceKeyForKind,
} from '../resources/resource-kind.js';
import { ResourceTargetReference } from '../resources/resource-reference.js';
import {
  blankTemplateSourceRanges,
  sliceTemplateSourceText,
} from '../resources/template-source-text.js';
import {
  type ParsedHtmlAttributeDraft,
  type ParsedHtmlNodeDraft,
  parseHtmlDocumentDraft,
} from './html-parse-materializer.js';
import {
  HtmlAttribute,
  HtmlElement,
  HtmlIrNodeKind,
  HtmlRecoveryKind,
} from './html-ir.js';
import { TemplateRecoveryPolicy } from './parse-context.js';
import { TemplateProductDetails } from './product-details.js';
import { runtimeAttributeName, runtimeElementResourceName } from './runtime-dom-name.js';
import {
  TemplateCompilerOperationCompletionKind,
  TemplateCompilerOperationKind,
  TemplateCompilerOccurrenceOperationTarget,
} from './template-compiler-execution.js';
import type {
  TemplateCompilerExtractedLocalBindable,
  TemplateCompilerExtractedLocalTemplate,
  TemplateCompilerLocalExtractionHandoff,
} from './template-compiler-local-extraction.js';
import {
  TemplateCompilerOccurrenceEdgeKind,
  type TemplateCompilerAttributeOccurrence,
  type TemplateCompilerElementOccurrence,
  type TemplateCompilerOccurrenceForest,
} from './template-compiler-occurrence.js';
import { BrowserEffectiveTemplateAttribute } from './template-structure.js';

export class LocalTemplateDefinitionMaterialization {
  constructor(
    readonly ownerTemplate: CustomElementTemplateDefinition | null,
    readonly definitions: readonly CustomElementDefinition[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Stable, non-publishing definition handles reserved for one cohort-local compiler invocation. */
export class LocalTemplateDefinitionHandleReservation {
  constructor(
    readonly invocationKey: string,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

/** Definition plus its exact detached carrier handoff for later DomNode compilation. */
export class LocalTemplateOccurrenceDefinitionEntry {
  constructor(
    readonly definition: CustomElementDefinition,
    readonly extracted: TemplateCompilerExtractedLocalTemplate,
  ) {}
}

/** Candidate-local successful extraction batch prepared without publishing any resource records. */
export class LocalTemplateOccurrenceDefinitionPreparation {
  constructor(
    /** Owner dependencies plus ordered sibling entries remain the authority for later generated-Type wiring. */
    readonly ownerDefinition: CustomElementDefinition,
    readonly handoff: TemplateCompilerLocalExtractionHandoff,
    readonly entries: readonly LocalTemplateOccurrenceDefinitionEntry[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Atomically published local definitions retaining their run-local carrier handoffs. */
export class LocalTemplateOccurrenceDefinitionMaterialization {
  constructor(
    readonly ownerDefinition: CustomElementDefinition,
    readonly entries: readonly LocalTemplateOccurrenceDefinitionEntry[],
    readonly records: readonly KernelStoreRecord[],
  ) {}

  get definitions(): readonly CustomElementDefinition[] {
    return this.entries.map((entry) => entry.definition);
  }
}

class LocalTemplateSyntax {
  constructor(
    readonly node: ParsedHtmlNodeDraft,
    readonly nameAttribute: ParsedHtmlAttributeDraft,
    readonly bindables: readonly ParsedHtmlNodeDraft[],
  ) {}
}

class LocalBindablePublication {
  constructor(
    readonly definition: BindableDefinition,
    readonly contribution: BindableDefinitionContribution,
  ) {}
}

class LocalTemplateBindableFacts {
  constructor(
    readonly propertyName: string,
    readonly explicitAttributeName: string | null,
    readonly mode: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly nameSourceAddressHandle: AddressHandle | null,
    readonly attributeSourceAddressHandle: AddressHandle | null,
    readonly modeSourceAddressHandle: AddressHandle | null,
  ) {}
}

class LocalTemplateDefinitionFacts {
  constructor(
    readonly local: string,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly name: string,
    readonly template: CustomElementTemplateDefinition,
    readonly bindables: readonly LocalTemplateBindableFacts[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly nameSourceAddressHandle: AddressHandle | null,
    readonly initialHasSlots: boolean,
  ) {}
}

class LocalTemplateSourceCoordinates {
  private readonly sourceSpan: SourceSpanAddress | null;

  constructor(
    private readonly store: KernelPublicationContext,
    private readonly template: CustomElementTemplateDefinition,
  ) {
    const source = template.addressHandle == null ? null : store.read(template.addressHandle);
    this.sourceSpan = source instanceof SourceSpanAddress ? source : null;
  }

  address(
    localKey: string,
    start: number,
    end: number,
    role: SourceSpanRole,
    records: KernelStoreRecord[],
  ): AddressHandle | null {
    if (this.sourceSpan == null) {
      return null;
    }
    const mappedStart = this.offset(start);
    const mappedEnd = this.offset(end);
    if (mappedStart == null || mappedEnd == null || mappedEnd < mappedStart) {
      return null;
    }
    const publication = sourceSpanAddressForSite(this.store, localKey, {
      sourceFileAddressHandle: this.sourceSpan.fileHandle,
      start: mappedStart,
      end: mappedEnd,
    }, role);
    records.push(...publication.records);
    return publication.handle;
  }

  private offset(offset: number): number | null {
    const map = this.template.sourceMap;
    if (map == null) {
      return this.sourceSpan == null ? null : this.sourceSpan.start + offset;
    }
    const mapped = map.decodedToSourceOffsets[offset];
    return typeof mapped === 'number' ? mapped : null;
  }
}

/** Materializes framework compiler-local custom-element definitions before owner template lowering. */
export class LocalTemplateDefinitionMaterializer {
  private readonly materializations = new Map<string, LocalTemplateDefinitionMaterialization>();
  private readonly reservationsByInvocationKey = new Map<string, LocalTemplateDefinitionHandleReservation>();
  private readonly occurrencePreparations = new WeakSet<LocalTemplateOccurrenceDefinitionPreparation>();
  private readonly publishedOccurrencePreparations = new WeakSet<LocalTemplateOccurrenceDefinitionPreparation>();
  private readonly publishedOccurrenceInvocationKeys = new Set<string>();

  constructor(
    readonly store: KernelPublicationContext,
  ) {}

  /** Allocate stable invocation-local handles without publishing a resource or definition detail. */
  reserveOccurrenceDefinition(invocationKey: string): LocalTemplateDefinitionHandleReservation {
    const existing = this.reservationsByInvocationKey.get(invocationKey);
    if (existing != null) return existing;
    const local = `local-template-definition:invocation:${localKeyPart(invocationKey)}`;
    const reservation = new LocalTemplateDefinitionHandleReservation(
      invocationKey,
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
    this.reservationsByInvocationKey.set(invocationKey, reservation);
    return reservation;
  }

  /** Build all DomNode definitions from one nominal full-success extraction receipt without publishing them. */
  prepareOccurrenceHandoff(
    ownerDefinition: CustomElementDefinition,
    forest: TemplateCompilerOccurrenceForest,
    handoff: TemplateCompilerLocalExtractionHandoff,
  ): LocalTemplateOccurrenceDefinitionPreparation {
    this.validateOccurrenceHandoff(forest, handoff);
    const records: KernelStoreRecord[] = [];
    const entries = handoff.entries.map((extracted) => {
      const reservation = extracted.definitionReservation;
      const carrierSourceAddressHandle = this.authoredElementSourceAddress(forest, extracted.carrier);
      const facts = new LocalTemplateDefinitionFacts(
        `local-template-definition:invocation:${localKeyPart(extracted.invocationKey)}`,
        reservation.productHandle,
        reservation.identityHandle,
        extracted.name,
        new CustomElementTemplateDefinition(
          CustomElementTemplateKind.DomNode,
          null,
          carrierSourceAddressHandle,
          null,
          ownerDefinition.template?.authoredSourceRevision ?? null,
        ),
        extracted.bindables.map((bindable) => this.occurrenceBindableFacts(forest, bindable)),
        carrierSourceAddressHandle,
        this.effectiveAttributeValueSourceAddress(forest, extracted.declarationAttribute),
        false,
      );
      return new LocalTemplateOccurrenceDefinitionEntry(
        this.definitionForFacts(facts, records),
        extracted,
      );
    });
    const preparation = new LocalTemplateOccurrenceDefinitionPreparation(ownerDefinition, handoff, entries, records);
    this.occurrencePreparations.add(preparation);
    return preparation;
  }

  /** Publish one complete extraction batch atomically; refused/partial results have no preparation capability. */
  publishOccurrenceHandoff(
    preparation: LocalTemplateOccurrenceDefinitionPreparation,
  ): LocalTemplateOccurrenceDefinitionMaterialization {
    if (!this.occurrencePreparations.has(preparation)) {
      throw new Error('Local-template occurrence preparation belongs to another materializer.');
    }
    if (this.publishedOccurrencePreparations.has(preparation)) {
      throw new Error('Local-template occurrence preparation is already published.');
    }
    const repeatedInvocation = preparation.entries.find((entry) =>
      this.publishedOccurrenceInvocationKeys.has(entry.extracted.invocationKey)
    ) ?? null;
    if (repeatedInvocation != null) {
      throw new Error(`Local-template invocation '${repeatedInvocation.extracted.invocationKey}' is already published.`);
    }
    this.store.publish(new KernelPublicationPlan(
      new KernelStoreBatch(
        preparation.records,
        `local-template-definitions:${preparation.handoff.ownerLane.localKey}`,
      ),
      preparation.entries.map((entry) =>
        publishProductDetail(ResourceProductDetails.Definition, entry.definition.productHandle!, entry.definition)
      ),
    ));
    this.publishedOccurrencePreparations.add(preparation);
    for (const entry of preparation.entries) {
      this.publishedOccurrenceInvocationKeys.add(entry.extracted.invocationKey);
    }
    return new LocalTemplateOccurrenceDefinitionMaterialization(
      preparation.ownerDefinition,
      preparation.entries,
      preparation.records,
    );
  }

  materialize(
    localKey: string,
    ownerDefinition: CustomElementDefinition,
    template: CustomElementTemplateDefinition | null,
  ): LocalTemplateDefinitionMaterialization {
    const materializationKey = ownerDefinition.productHandle
      ?? ownerDefinition.identityHandle
      ?? `${ownerDefinition.sourceAddressHandle ?? localKey}:${ownerDefinition.name}`;
    const existing = this.materializations.get(materializationKey);
    if (existing != null) {
      return existing;
    }
    if (template?.kind !== CustomElementTemplateKind.Markup || template.markup == null) {
      const empty = new LocalTemplateDefinitionMaterialization(template, [], []);
      this.materializations.set(materializationKey, empty);
      return empty;
    }
    const syntaxes = readLocalTemplateSyntaxes(template.markup);
    if (syntaxes.length === 0) {
      const empty = new LocalTemplateDefinitionMaterialization(template, [], []);
      this.materializations.set(materializationKey, empty);
      return empty;
    }

    const records: KernelStoreRecord[] = [];
    const coordinates = new LocalTemplateSourceCoordinates(this.store, template);
    const definitionLocalKey = `owner:${materializationKey}`;
    const definitions = syntaxes.map((syntax) =>
      this.definitionForSyntax(definitionLocalKey, template, syntax, coordinates, records)
    );
    const ownerTemplate = new CustomElementTemplateDefinition(
      template.kind,
      blankTemplateSourceRanges(
        template.markup,
        syntaxes.map((syntax) => [syntax.node.start, syntax.node.end] as const),
      ),
      template.addressHandle,
      template.sourceMap,
      template.authoredSourceRevision,
    );

    this.store.publish(new KernelPublicationPlan(
      new KernelStoreBatch(records, `local-template-definitions:${localKey}`),
      definitions.map((definition) =>
        publishProductDetail(ResourceProductDetails.Definition, definition.productHandle!, definition)
      ),
    ));
    const materialization = new LocalTemplateDefinitionMaterialization(ownerTemplate, definitions, records);
    this.materializations.set(materializationKey, materialization);
    return materialization;
  }

  private definitionForSyntax(
    ownerLocalKey: string,
    ownerTemplate: CustomElementTemplateDefinition,
    syntax: LocalTemplateSyntax,
    coordinates: LocalTemplateSourceCoordinates,
    records: KernelStoreRecord[],
  ): CustomElementDefinition {
    const name = syntax.nameAttribute.rawValue;
    const local = `local-template-definition:${ownerLocalKey}:${name}`;
    const sourceAddressHandle = coordinates.address(
      `${local}:declaration`,
      syntax.node.start,
      syntax.node.end,
      SourceSpanRole.Range,
      records,
    );
    const nameSourceAddressHandle = coordinates.address(
      `${local}:name`,
      syntax.nameAttribute.valueStart ?? syntax.nameAttribute.start,
      syntax.nameAttribute.valueEnd ?? syntax.nameAttribute.end,
      SourceSpanRole.Name,
      records,
    );
    const localSource = sliceTemplateSourceText(
      ownerTemplate.markup!,
      ownerTemplate.sourceMap,
      syntax.node.start,
      syntax.node.end,
    );
    const localMarkup = blankTemplateSourceRanges(localSource.markup, [
      [
        syntax.nameAttribute.start - syntax.node.start,
        syntax.nameAttribute.end - syntax.node.start,
      ],
      ...syntax.bindables.map((bindable) => [
        bindable.start - syntax.node.start,
        bindable.end - syntax.node.start,
      ] as const),
    ]);
    const template = new CustomElementTemplateDefinition(
      CustomElementTemplateKind.Markup,
      localMarkup,
      sourceAddressHandle,
      localSource.sourceMap,
      ownerTemplate.authoredSourceRevision,
    );
    return this.definitionForFacts(new LocalTemplateDefinitionFacts(
      local,
      this.store.handles.product(local),
      this.store.handles.identity(local),
      name,
      template,
      syntax.bindables.map((bindable) => this.bindableFactsForSyntax(local, bindable, coordinates, records)),
      sourceAddressHandle,
      nameSourceAddressHandle,
      containsCompilerVisibleElement(syntax.node.children, 'slot'),
    ), records);
  }

  private definitionForFacts(
    facts: LocalTemplateDefinitionFacts,
    records: KernelStoreRecord[],
  ): CustomElementDefinition {
    const bindables = facts.bindables.map((bindable) => this.bindableForFacts(bindable));
    const target = new ResourceTargetReference(null, facts.sourceAddressHandle, null, null);
    const key = runtimeResourceKeyForKind(ResourceDefinitionKind.CustomElement, facts.name)!;
    const capture = new CustomElementCaptureDefinition(CustomElementCaptureKind.None);
    const contribution = new CustomElementDefinitionContribution(
      NamedResourceDefinitionContributionKind.LocalTemplate,
      target,
      facts.name,
      [],
      key,
      capture,
      facts.template,
      [],
      [],
      null,
      true,
      [],
      bindables.map((bindable) => bindable.contribution),
      false,
      null,
      facts.initialHasSlots,
      false,
      [],
      null,
      null,
      [],
    );
    const definition = new CustomElementDefinition(
      facts.productHandle,
      facts.identityHandle,
      facts.sourceAddressHandle,
      target,
      facts.name,
      [],
      key,
      capture,
      facts.template,
      [],
      [],
      null,
      true,
      [],
      bindables.map((bindable) => bindable.definition),
      false,
      null,
      contribution.hasSlots ?? false,
      false,
      [],
      null,
      null,
      [contribution],
      [],
      facts.nameSourceAddressHandle,
    );
    records.push(...this.recordsForDefinition(facts.local, definition, facts.nameSourceAddressHandle));
    return definition;
  }

  private bindableFactsForSyntax(
    ownerLocal: string,
    bindable: ParsedHtmlNodeDraft,
    coordinates: LocalTemplateSourceCoordinates,
    records: KernelStoreRecord[],
  ): LocalTemplateBindableFacts {
    const nameAttribute = attributeForDraft(bindable, 'name')!;
    const local = `${ownerLocal}:bindable:${nameAttribute.rawValue}`;
    const attributeAttribute = attributeForDraft(bindable, 'attribute');
    const modeAttribute = attributeForDraft(bindable, 'mode');
    const name = nameAttribute.rawValue;
    const sourceAddressHandle = coordinates.address(
      `${local}:declaration`,
      bindable.start,
      bindable.end,
      SourceSpanRole.Range,
      records,
    );
    const nameSourceAddressHandle = coordinates.address(
      `${local}:name`,
      nameAttribute.valueStart ?? nameAttribute.start,
      nameAttribute.valueEnd ?? nameAttribute.end,
      SourceSpanRole.Name,
      records,
    );
    const attributeSourceAddressHandle = attributeAttribute == null
      ? null
      : coordinates.address(
        `${local}:attribute`,
        attributeAttribute.valueStart ?? attributeAttribute.start,
        attributeAttribute.valueEnd ?? attributeAttribute.end,
        SourceSpanRole.Name,
        records,
      );
    const modeSourceAddressHandle = modeAttribute == null
      ? null
      : coordinates.address(
        `${local}:mode`,
        modeAttribute.valueStart ?? modeAttribute.start,
        modeAttribute.valueEnd ?? modeAttribute.end,
        SourceSpanRole.Value,
        records,
      );
    return new LocalTemplateBindableFacts(
      name,
      attributeAttribute?.rawValue ?? null,
      modeAttribute?.rawValue ?? null,
      sourceAddressHandle,
      nameSourceAddressHandle,
      attributeSourceAddressHandle,
      modeSourceAddressHandle,
    );
  }

  private bindableForFacts(facts: LocalTemplateBindableFacts): LocalBindablePublication {
    const attribute = facts.explicitAttributeName ?? bindableAttributeNameForProperty(facts.propertyName);
    const mode = localBindableMode(facts.mode);
    const setter = new BindableSetterDefinition(BindableSetterKind.Default);
    return new LocalBindablePublication(
      new BindableDefinition(
        attribute,
        `${facts.propertyName}Changed`,
        mode,
        facts.propertyName,
        setter,
        facts.sourceAddressHandle,
        [],
        facts.nameSourceAddressHandle,
        facts.attributeSourceAddressHandle,
        null,
        facts.modeSourceAddressHandle,
      ),
      new BindableDefinitionContribution(
        BindableContributionKind.LocalTemplate,
        facts.propertyName,
        facts.explicitAttributeName,
        null,
        mode,
        facts.propertyName,
        setter,
        facts.sourceAddressHandle,
        [],
        facts.nameSourceAddressHandle,
        facts.attributeSourceAddressHandle,
        null,
        facts.modeSourceAddressHandle,
      ),
    );
  }

  private validateOccurrenceHandoff(
    forest: TemplateCompilerOccurrenceForest,
    handoff: TemplateCompilerLocalExtractionHandoff,
  ): void {
    if (!handoff.isFullSuccessReceipt()) {
      throw new Error('Local-template occurrence publication requires a full-success extraction receipt.');
    }
    const invocationKeys = new Set<string>();
    const names = new Set<string>();
    for (const [declarationOrdinal, entry] of handoff.entries.entries()) {
      if (
        entry.declarationOrdinal !== declarationOrdinal
        || invocationKeys.has(entry.invocationKey)
        || names.has(entry.name)
        || entry.definitionReservation !== this.reserveOccurrenceDefinition(entry.invocationKey)
        || entry.definitionReservation.invocationKey !== entry.invocationKey
      ) {
        throw new Error('Local-template extraction handoff has incoherent declaration order, reservation, or identity.');
      }
      invocationKeys.add(entry.invocationKey);
      names.add(entry.name);
      if (
        entry.invocationLane == null
        || entry.invocationLane.localKey !== entry.invocationKey
        || entry.invocationLane.compilerCarrier !== entry.carrier
        || entry.invocationLane.compilerContent !== entry.content
        || forest.nodeForOccurrenceKey(entry.carrier.occurrenceKey) !== entry.carrier
        || forest.nodeForOccurrenceKey(entry.content.occurrenceKey) !== entry.content
        || entry.carrier.parent !== null
        || entry.carrier.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Detached
        || entry.carrier.templateContent !== entry.content
        || entry.declarationAttribute.owner !== null
        || forest.attributeForOccurrenceKey(entry.declarationAttribute.occurrenceKey) !== entry.declarationAttribute
      ) {
        throw new Error(`Local-template extraction '${entry.invocationKey}' lost its detached carrier authority.`);
      }
      this.requireCompleteDetachment(entry.carrierDetachmentOperation, entry.carrier, entry.invocationKey);
      for (const [bindableOrdinal, bindable] of entry.bindables.entries()) {
        if (
          bindable.ordinal !== bindableOrdinal
          || forest.nodeForOccurrenceKey(bindable.element.occurrenceKey) !== bindable.element
          || bindable.element.parent !== null
          || bindable.element.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Detached
        ) {
          throw new Error(`Local-template bindable ${bindableOrdinal} in '${entry.invocationKey}' lost detachment authority.`);
        }
        this.requireCompleteDetachment(
          bindable.detachmentOperation,
          bindable.element,
          `${entry.invocationKey}:bindable:${bindableOrdinal}`,
        );
      }
    }
  }

  private requireCompleteDetachment(
    operation: TemplateCompilerExtractedLocalTemplate['carrierDetachmentOperation'],
    occurrence: TemplateCompilerElementOccurrence,
    label: string,
  ): void {
    if (
      operation.operationKind !== TemplateCompilerOperationKind.LocalTemplateExtraction
      || operation.completion.completionKind !== TemplateCompilerOperationCompletionKind.Complete
      || !(operation.target instanceof TemplateCompilerOccurrenceOperationTarget)
      || operation.target.occurrence !== occurrence
      || !operation.mutationBatch.nodeDetachmentMutations.some((mutation) => mutation.node === occurrence)
    ) {
      throw new Error(`Local-template occurrence '${label}' has no exact completed detachment operation.`);
    }
  }

  private occurrenceBindableFacts(
    forest: TemplateCompilerOccurrenceForest,
    bindable: TemplateCompilerExtractedLocalBindable,
  ): LocalTemplateBindableFacts {
    return new LocalTemplateBindableFacts(
      bindable.propertyName,
      bindable.explicitAttributeName,
      bindable.mode,
      this.authoredElementSourceAddress(forest, bindable.element),
      this.effectiveAttributeValueSourceAddress(forest, bindable.nameAttribute),
      this.effectiveAttributeValueSourceAddress(forest, bindable.attributeAttribute),
      this.effectiveAttributeValueSourceAddress(forest, bindable.modeAttribute),
    );
  }

  private authoredElementSourceAddress(
    forest: TemplateCompilerOccurrenceForest,
    element: TemplateCompilerElementOccurrence,
  ): AddressHandle | null {
    const origin = forest.exactAuthoredNodeOrigin(element);
    const authored = origin == null
      ? null
      : this.store.readProductDetail(TemplateProductDetails.HtmlNode, origin.authored.productHandle);
    return authored instanceof HtmlElement ? authored.sourceAddressHandle : null;
  }

  private effectiveAttributeValueSourceAddress(
    forest: TemplateCompilerOccurrenceForest,
    attribute: TemplateCompilerAttributeOccurrence | null,
  ): AddressHandle | null {
    if (attribute?.inputReference == null) return null;
    const browser = this.store.readProductDetail(
      TemplateProductDetails.StructuralAttribute,
      attribute.inputReference.productHandle,
    );
    if (!(browser instanceof BrowserEffectiveTemplateAttribute) || browser.value !== attribute.value) {
      return null;
    }
    const origin = forest.exactAuthoredAttributeOrigin(attribute);
    const authored = origin == null
      ? null
      : this.store.readProductDetail(TemplateProductDetails.HtmlAttribute, origin.authored.productHandle);
    return authored instanceof HtmlAttribute ? authored.valueAddressHandle : null;
  }

  private recordsForDefinition(
    local: string,
    definition: CustomElementDefinition,
    declarationAddressHandle: AddressHandle | null,
  ): readonly KernelStoreRecord[] {
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    const claim = declarationAddressHandle == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`${local}:declares`),
        declarationAddressHandle,
        KernelVocabulary.Resource.Declares.key,
        definition.identityHandle!,
        provenanceHandle,
      );
    return [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.Declaration, EvidenceRole.TransformInput],
        `Template compiler local custom-element declaration '${definition.name}'.`,
        declarationAddressHandle ?? definition.sourceAddressHandle,
      ),
      new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
      new AureliaResourceIdentity(
        definition.identityHandle!,
        AureliaResourceDeclarationKind.CustomElement,
        definition.name,
        null,
      ),
      new MaterializedProduct(
        definition.productHandle!,
        KernelVocabulary.Resource.Definition.key,
        definition.identityHandle,
        definition.sourceAddressHandle,
        provenanceHandle,
      ),
      ...(claim == null ? [] : [claim]),
      new MaterializationRecord(
        this.store.handles.materialization(local),
        definition.identityHandle!,
        [definition.productHandle!],
        claim == null ? [] : [claim.handle],
      ),
    ];
  }
}

function readLocalTemplateSyntaxes(markup: string): readonly LocalTemplateSyntax[] {
  const document = parseHtmlDocumentDraft(markup, TemplateRecoveryPolicy.Strict);
  if (document.recoveries.some((recovery) =>
    recovery.recoveryKind === HtmlRecoveryKind.NestingLimitExceeded
  )) {
    return [];
  }
  const rootTemplate = effectiveRootTemplate(document.rootNodes);
  if (rootTemplate != null && attributeForDraft(rootTemplate, 'as-custom-element') != null) {
    return [];
  }
  const roots = rootTemplate?.children ?? document.rootNodes;
  const localTemplates = compilerVisibleElements(roots, (node) =>
    node.tagName?.toLowerCase() === 'template'
    && attributeForDraft(node, 'as-custom-element') != null
  );
  if (
    localTemplates.length === 0
    || localTemplates.length === directElementCount(roots)
    || localTemplates.some((template) => !roots.includes(template))
  ) {
    return [];
  }

  const names = new Set<string>();
  const syntaxes: LocalTemplateSyntax[] = [];
  for (const template of localTemplates) {
    const nameAttribute = attributeForDraft(template, 'as-custom-element')!;
    const name = nameAttribute.rawValue;
    if (name.length === 0 || names.has(name)) {
      return [];
    }
    names.add(name);
    const bindables = compilerVisibleElements(template.children, (node) =>
      node.tagName?.toLowerCase() === 'bindable'
    );
    if (bindables.some((bindable) => !template.children.includes(bindable))) {
      return [];
    }
    const properties = new Set<string>();
    const attributes = new Set<string>();
    for (const bindable of bindables) {
      const propertyAttribute = attributeForDraft(bindable, 'name');
      if (propertyAttribute == null) {
        return [];
      }
      const property = propertyAttribute.rawValue;
      const attribute = attributeForDraft(bindable, 'attribute')?.rawValue ?? null;
      if ((attribute != null && attributes.has(attribute)) || properties.has(property)) {
        return [];
      }
      properties.add(property);
      if (attribute != null) {
        attributes.add(attribute);
      }
    }
    syntaxes.push(new LocalTemplateSyntax(template, nameAttribute, bindables));
  }
  return syntaxes;
}

function effectiveRootTemplate(
  roots: readonly ParsedHtmlNodeDraft[],
): ParsedHtmlNodeDraft | null {
  const elements = roots.filter(isHtmlElementDraft);
  return roots.every((node) => isHtmlElementDraft(node) || (node.nodeKind === HtmlIrNodeKind.Text && node.text?.trim().length === 0))
    && elements.length === 1
    && elements[0]?.tagName?.toLowerCase() === 'template'
    ? elements[0]
    : null;
}

function compilerVisibleElements(
  roots: readonly ParsedHtmlNodeDraft[],
  select: (node: ParsedHtmlNodeDraft) => boolean,
): readonly ParsedHtmlNodeDraft[] {
  const result: ParsedHtmlNodeDraft[] = [];
  const visit = (nodes: readonly ParsedHtmlNodeDraft[]): void => {
    for (const node of nodes) {
      if (!isHtmlElementDraft(node)) {
        continue;
      }
      if (select(node)) {
        result.push(node);
      }
      if (node.tagName == null || runtimeElementResourceName(node.tagName, node.namespace) !== 'template') {
        visit(node.children);
      }
    }
  };
  visit(roots);
  return result;
}

function containsCompilerVisibleElement(
  roots: readonly ParsedHtmlNodeDraft[],
  tagName: string,
): boolean {
  return compilerVisibleElements(roots, (node) =>
    node.tagName != null && runtimeElementResourceName(node.tagName, node.namespace) === tagName
  ).length > 0;
}

function directElementCount(roots: readonly ParsedHtmlNodeDraft[]): number {
  return roots.filter(isHtmlElementDraft).length;
}

function isHtmlElementDraft(node: ParsedHtmlNodeDraft): boolean {
  return node.nodeKind === HtmlIrNodeKind.Element;
}

function attributeForDraft(
  node: ParsedHtmlNodeDraft,
  name: string,
): ParsedHtmlAttributeDraft | null {
  return node.attributes.find((attribute) =>
    runtimeAttributeName(attribute.rawName, node.namespace) === name
  ) ?? null;
}

function localBindableMode(mode: string | null): BindableBindingMode {
  switch (mode) {
    case BindableBindingMode.OneTime:
      return BindableBindingMode.OneTime;
    case BindableBindingMode.ToView:
      return BindableBindingMode.ToView;
    case BindableBindingMode.FromView:
      return BindableBindingMode.FromView;
    case BindableBindingMode.TwoWay:
      return BindableBindingMode.TwoWay;
    case BindableBindingMode.Default:
    default:
      return BindableBindingMode.Default;
  }
}
