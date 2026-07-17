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
} from '../kernel/handles.js';
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
import { HtmlIrNodeKind } from './html-ir.js';
import { TemplateRecoveryPolicy } from './parse-context.js';

export class LocalTemplateDefinitionMaterialization {
  constructor(
    readonly ownerTemplate: CustomElementTemplateDefinition | null,
    readonly definitions: readonly CustomElementDefinition[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
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

  constructor(
    readonly store: KernelPublicationContext,
  ) {}

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
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
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
    );
    const bindables = syntax.bindables.map((bindable) =>
      this.bindableForSyntax(local, bindable, coordinates, records)
    );
    const target = new ResourceTargetReference(null, sourceAddressHandle, null, null);
    const key = runtimeResourceKeyForKind(ResourceDefinitionKind.CustomElement, name)!;
    const capture = new CustomElementCaptureDefinition(CustomElementCaptureKind.None);
    const contribution = new CustomElementDefinitionContribution(
      NamedResourceDefinitionContributionKind.LocalTemplate,
      target,
      name,
      [],
      key,
      capture,
      template,
      [],
      [],
      null,
      true,
      [],
      bindables.map((bindable) => bindable.contribution),
      false,
      null,
      containsCompilerVisibleElement(syntax.node.children, 'slot'),
      false,
      [],
      null,
      null,
      [],
    );
    const definition = new CustomElementDefinition(
      productHandle,
      identityHandle,
      sourceAddressHandle,
      target,
      name,
      [],
      key,
      capture,
      template,
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
      nameSourceAddressHandle,
    );
    records.push(...this.recordsForDefinition(local, definition, nameSourceAddressHandle));
    return definition;
  }

  private bindableForSyntax(
    ownerLocal: string,
    bindable: ParsedHtmlNodeDraft,
    coordinates: LocalTemplateSourceCoordinates,
    records: KernelStoreRecord[],
  ): LocalBindablePublication {
    const nameAttribute = attributeForDraft(bindable, 'name')!;
    const local = `${ownerLocal}:bindable:${nameAttribute.rawValue}`;
    const attributeAttribute = attributeForDraft(bindable, 'attribute');
    const modeAttribute = attributeForDraft(bindable, 'mode');
    const name = nameAttribute.rawValue;
    const attribute = attributeAttribute?.rawValue ?? bindableAttributeNameForProperty(name);
    const mode = localBindableMode(modeAttribute?.rawValue ?? null);
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
    const setter = new BindableSetterDefinition(BindableSetterKind.Default);
    return new LocalBindablePublication(
      new BindableDefinition(
        attribute,
        `${name}Changed`,
        mode,
        name,
        setter,
        sourceAddressHandle,
        [],
        nameSourceAddressHandle,
        attributeSourceAddressHandle,
        null,
        modeSourceAddressHandle,
      ),
      new BindableDefinitionContribution(
        BindableContributionKind.LocalTemplate,
        name,
        attributeAttribute?.rawValue ?? null,
        null,
        mode,
        name,
        setter,
        sourceAddressHandle,
        [],
        nameSourceAddressHandle,
        attributeSourceAddressHandle,
        null,
        modeSourceAddressHandle,
      ),
    );
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
      if (node.tagName?.toLowerCase() !== 'template') {
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
  return compilerVisibleElements(roots, (node) => node.tagName?.toLowerCase() === tagName).length > 0;
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
  return node.attributes.find((attribute) => attribute.rawName.toLowerCase() === name) ?? null;
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
