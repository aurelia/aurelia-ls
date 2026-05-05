import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
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
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { CustomElementCaptureKind } from '../resources/custom-element-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  AttributeClassification,
  AttributeClassificationKind,
  type AttributeClassificationField,
  type AttributeSyntax,
} from './attribute-syntax.js';
import type { AttributeSyntaxParseEmission } from './attribute-syntax-materializer.js';
import type {
  TemplateBindableReference,
  TemplateResolvedResource,
  TemplateVisibleResource,
} from './compiler-world.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type { TemplateCompilationUnit } from './compilation-unit.js';
import {
  HtmlAttribute,
  HtmlElement,
  HtmlIrNodeKind,
  HtmlNodeReference,
} from './html-ir.js';
import type { HtmlParseEmission } from './html-parse-materializer.js';
import { TemplateProductDetails } from './product-details.js';

export class AttributeClassificationInput {
  constructor(
    /** Store-local key for this classification pass. */
    readonly localKey: string,
    /** Compiler unit that owns the HTML and AttrSyntax products. */
    readonly compilationUnit: TemplateCompilationUnit,
    /** Parsed HTML products whose attributes are being classified. */
    readonly html: HtmlParseEmission,
    /** Runtime AttrSyntax products produced from the HTML attributes. */
    readonly attributeSyntax: AttributeSyntaxParseEmission,
    /** Compiler world that supplies resource resolver and binding-command resolver services. */
    readonly compilerWorld: TemplateCompilerWorldEmission,
  ) {}
}

export class AttributeClassificationEmission {
  constructor(
    readonly classifications: readonly AttributeClassification[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class AttributeClassificationSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class OwnerElement {
  constructor(
    readonly element: HtmlElement,
    readonly reference: HtmlNodeReference,
    readonly attributes: readonly HtmlAttribute[],
  ) {}
}

class ClassificationDecision {
  constructor(
    readonly classificationKind: AttributeClassificationKind,
    readonly resourceKind: ResourceDefinitionKind | null,
    readonly resource: TemplateVisibleResource | null,
    readonly bindingCommand: AttributeClassification['bindingCommand'],
    readonly bindable: TemplateBindableReference | null,
  ) {}
}

/** Classifies runtime AttrSyntax against the compiler world's resource and command resolvers. */
export class AttributeClassificationMaterializer {
  constructor(
    /** Hot analysis store that receives attribute classification records. */
    readonly store: KernelStore,
  ) {}

  classify(input: AttributeClassificationInput): AttributeClassificationEmission {
    const emission = this.recordsForClassification(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `attribute-classification:${input.localKey}`));
    }
    for (const classification of emission.classifications) {
      this.store.productDetails.add(
        TemplateProductDetails.AttributeClassification,
        classification.productHandle,
        classification,
      );
    }
    return emission;
  }

  private recordsForClassification(input: AttributeClassificationInput): AttributeClassificationEmission {
    const source = this.recordsForSource(input);
    const records: KernelStoreRecord[] = [...source.records];
    const classifications: AttributeClassification[] = [];
    const claims: SemanticClaim[] = [];
    const attributesByProduct = new Map(input.html.attributes.map((attribute) => [attribute.productHandle, attribute]));
    const ownersByAttributeProduct = ownerElementsByAttributeProduct(input.html);

    input.attributeSyntax.syntaxes.forEach((syntax, index) => {
      const attribute = syntax.attribute.productHandle == null
        ? null
        : attributesByProduct.get(syntax.attribute.productHandle) ?? null;
      const owner = syntax.attribute.productHandle == null
        ? null
        : ownersByAttributeProduct.get(syntax.attribute.productHandle) ?? null;
      const local = `attribute-classification:${input.localKey}:${index}`;
      const productHandle = this.store.handles.product(local);
      const identityHandle = this.store.handles.identity(local);
      const decision = attribute == null || owner == null
        ? openDecision()
        : classifySyntax(syntax, attribute, owner, input.compilerWorld);
      const classification = new AttributeClassification(
        productHandle,
        identityHandle,
        syntax.productHandle,
        owner?.reference ?? new HtmlNodeReference(HtmlIrNodeKind.Element, null, null, syntax.attribute.addressHandle),
        decision.classificationKind,
        decision.resourceKind,
        decision.resource,
        decision.bindingCommand,
        decision.bindable,
        [],
        syntax.sourceAddressHandle,
        compactFieldProvenance<AttributeClassificationField>([
          new FieldProvenance('syntax', source.provenanceHandle),
          new FieldProvenance('classificationKind', source.provenanceHandle),
          decision.resource == null ? null : new FieldProvenance('resource', source.provenanceHandle),
          decision.bindingCommand == null ? null : new FieldProvenance('bindingCommand', source.provenanceHandle),
          decision.bindable == null ? null : new FieldProvenance('bindable', source.provenanceHandle),
          new FieldProvenance('instructions', source.provenanceHandle),
          new FieldProvenance('source', source.provenanceHandle),
        ]),
      );
      const classificationClaim = new SemanticClaim(
        this.store.handles.claim(`${local}:classifies-attribute-syntax`),
        syntax.productHandle,
        KernelVocabulary.Template.ClassifiesAttributeSyntax.key,
        productHandle,
        source.provenanceHandle,
      );
      claims.push(classificationClaim);
      const referencedProductHandle = decision.resource?.definitionProductHandle
        ?? decision.resource?.resourceProductHandle
        ?? decision.bindingCommand?.productHandle
        ?? null;
      if (referencedProductHandle != null) {
        claims.push(new SemanticClaim(
          this.store.handles.claim(`${local}:references-resource`),
          productHandle,
          KernelVocabulary.Template.ReferencesResource.key,
          referencedProductHandle,
          source.provenanceHandle,
        ));
      }
      classifications.push(classification);
      records.push(
        new CompilerIdentity(
          identityHandle,
          KernelVocabulary.Template.AttributeClassification.key,
          syntax.identityHandle,
          syntax.sourceAddressHandle,
          syntax.rawName,
        ),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.AttributeClassification.key,
          identityHandle,
          syntax.sourceAddressHandle,
          source.provenanceHandle,
        ),
      );
    });

    records.push(
      ...claims,
      new MaterializationRecord(
        this.store.handles.materialization(`attribute-classification:${input.localKey}`),
        input.compilationUnit.identityHandle,
        classifications.map((classification) => classification.productHandle),
        claims.map((claim) => claim.handle),
      ),
    );

    return new AttributeClassificationEmission(classifications, records);
  }

  private recordsForSource(input: AttributeClassificationInput): AttributeClassificationSourceSet {
    const evidenceHandle = this.store.handles.evidence(`attribute-classification:${input.localKey}`);
    const provenanceHandle = this.store.handles.provenance(`attribute-classification:${input.localKey}`);
    return new AttributeClassificationSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.Scope],
          'Attribute classifier consumed AttrSyntax, authored HTML, resource resolver, and binding-command resolver products.',
          input.compilationUnit.sourceAddressHandle,
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

function ownerElementsByAttributeProduct(html: HtmlParseEmission): ReadonlyMap<ProductHandle, OwnerElement> {
  const owners = new Map<ProductHandle, OwnerElement>();
  for (const node of html.nodes) {
    if (!(node instanceof HtmlElement)) {
      continue;
    }
    const attributes = node.attributes
      .map((reference) => reference.productHandle == null
        ? null
        : html.attributes.find((attribute) => attribute.productHandle === reference.productHandle) ?? null
      )
      .filter((attribute): attribute is HtmlAttribute => attribute != null);
    const owner = new OwnerElement(node, node.toReference(), attributes);
    for (const attribute of node.attributes) {
      if (attribute.productHandle != null) {
        owners.set(attribute.productHandle, owner);
      }
    }
  }
  return owners;
}

function classifySyntax(
  syntax: AttributeSyntax,
  attribute: HtmlAttribute,
  owner: OwnerElement,
  world: TemplateCompilerWorldEmission,
): ClassificationDecision {
  const rawName = attribute.rawName.toLowerCase();
  const target = syntax.target.toLowerCase();

  if (rawName === 'as-element' || rawName === 'containerless') {
    return new ClassificationDecision(AttributeClassificationKind.CompilerControl, null, null, null, null);
  }

  const commandName = syntax.command?.toLowerCase() ?? null;
  const bindingCommand = commandName == null
    ? null
    : world.bindingCommandResolver.get(commandName)?.toReference() ?? null;
  const elementResolution = world.resourceResolver.el(elementLookupName(owner));
  const elementDefinition = elementResolution?.definition?.type === ResourceDefinitionKind.CustomElement
    ? elementResolution.definition
    : null;

  const captureDecision = elementDefinition == null || elementResolution == null
    ? null
    : classifyCapture(syntax, elementDefinition.capture.kind, elementResolution, bindingCommand != null, world);
  if (captureDecision != null) {
    return captureDecision;
  }

  if (target === '...$attrs') {
    return new ClassificationDecision(AttributeClassificationKind.Spread, null, null, bindingCommand, null);
  }

  if (bindingCommand != null && commandIgnoresAttribute(bindingCommand, world)) {
    return new ClassificationDecision(AttributeClassificationKind.BindingCommand, null, null, bindingCommand, null);
  }

  if (target.startsWith('...')) {
    return elementDefinition != null && target.slice(3) !== '$element'
      ? new ClassificationDecision(AttributeClassificationKind.Spread, ResourceDefinitionKind.CustomElement, elementResolution?.resource ?? null, bindingCommand, null)
      : openDecision(bindingCommand);
  }

  if (elementDefinition != null) {
    const bindable = world.resourceResolver.bindables(elementDefinition).attr(target);
    if (bindable != null) {
      return new ClassificationDecision(
        AttributeClassificationKind.Bindable,
        ResourceDefinitionKind.CustomElement,
        elementResolution?.resource ?? null,
        bindingCommand,
        bindable,
      );
    }
    if (target === '$bindables') {
      return bindingCommand == null
        ? openDecision()
        : new ClassificationDecision(AttributeClassificationKind.Spread, ResourceDefinitionKind.CustomElement, elementResolution?.resource ?? null, bindingCommand, null);
    }
  } else if (target === '$bindables') {
    return openDecision(bindingCommand);
  }

  const attributeResolution = world.resourceResolver.attr(target);
  if (attributeResolution?.resource != null) {
    const classificationKind = attributeResolution.resource.resourceKind === ResourceDefinitionKind.TemplateController
      ? AttributeClassificationKind.TemplateController
      : AttributeClassificationKind.CustomAttribute;
    const bindable = attributeResolution.definition?.type === ResourceDefinitionKind.CustomAttribute
      ? world.resourceResolver.bindables(attributeResolution.definition).primary
      : null;
    return new ClassificationDecision(
      classificationKind,
      attributeResolution.resource.resourceKind,
      attributeResolution.resource,
      bindingCommand,
      bindable,
    );
  }

  return bindingCommand == null
    ? new ClassificationDecision(AttributeClassificationKind.Plain, null, null, null, null)
    : new ClassificationDecision(AttributeClassificationKind.BindingCommand, null, null, bindingCommand, null);
}

function classifyCapture(
  syntax: AttributeSyntax,
  captureKind: CustomElementCaptureKind,
  elementResolution: TemplateResolvedResource,
  hasBindingCommand: boolean,
  world: TemplateCompilerWorldEmission,
): ClassificationDecision | null {
  if (captureKind === CustomElementCaptureKind.None) {
    return null;
  }
  const target = syntax.target.toLowerCase();
  if (hasBindingCommand && commandIgnoresAttributeName(syntax.command?.toLowerCase() ?? null, world)) {
    return new ClassificationDecision(
      AttributeClassificationKind.Captured,
      ResourceDefinitionKind.CustomElement,
      elementResolution.resource,
      null,
      null,
    );
  }
  const canCapture = target !== 'au-slot'
    && target !== 'slot'
    && (target.indexOf('...') === -1 || target === '...$attrs');
  if (!canCapture) {
    return null;
  }
  const elementDefinition = elementResolution.definition?.type === ResourceDefinitionKind.CustomElement
    ? elementResolution.definition
    : null;
  if (elementDefinition == null) {
    return null;
  }
  const bindable = world.resourceResolver.bindables(elementDefinition).attr(target);
  const templateController = world.resourceResolver.attr(target);
  if (bindable != null || templateController?.resource?.resourceKind === ResourceDefinitionKind.TemplateController) {
    return null;
  }
  if (captureKind === CustomElementCaptureKind.Predicate) {
    return openDecision();
  }
  return new ClassificationDecision(
    AttributeClassificationKind.Captured,
    ResourceDefinitionKind.CustomElement,
    elementResolution.resource,
    null,
    null,
  );
}

function elementLookupName(
  owner: OwnerElement,
): string {
  const asElement = owner.attributes.find((attribute) => attribute.rawName.toLowerCase() === 'as-element');
  return asElement == null || asElement.rawValue === ''
    ? owner.element.tagName.toLowerCase()
    : asElement.rawValue.toLowerCase();
}

function commandIgnoresAttribute(
  command: NonNullable<AttributeClassification['bindingCommand']>,
  world: TemplateCompilerWorldEmission,
): boolean {
  return commandIgnoresAttributeName(command.name, world);
}

function commandIgnoresAttributeName(
  commandName: string | null,
  world: TemplateCompilerWorldEmission,
): boolean {
  return commandName == null
    ? false
    : world.bindingCommandResolver.get(commandName)?.ignoreAttr === true;
}

function openDecision(
  bindingCommand: AttributeClassification['bindingCommand'] = null,
): ClassificationDecision {
  return new ClassificationDecision(AttributeClassificationKind.Open, null, null, bindingCommand, null);
}

function claimsForProduct(
  claims: readonly SemanticClaim[],
  productHandle: ProductHandle,
): readonly SemanticClaim[] {
  return claims.filter((claim) =>
    claim.subjectHandle === productHandle
    || claim.objectHandle === productHandle
  );
}
