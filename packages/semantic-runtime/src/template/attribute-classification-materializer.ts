import { SemanticClaim, claimsForProduct } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
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
  bindProductDetailEnvelope,
  requireProductDetailEnvelope,
} from '../kernel/product-details.js';
import {
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
  type AttributeSyntax,
} from './attribute-syntax.js';
import type { AttributeSyntaxParseEmission } from './attribute-syntax-materializer.js';
import {
  TemplateCompilerIssue,
  TemplateCompilerIssueKind,
  TemplateCompilerIssuePhase,
} from './compiler-issue.js';
import {
  TemplateCompilerIssuePublisher,
  type TemplateCompilerIssuePublication,
} from './compiler-issue-publication.js';
import type {
  TemplateResolvedResource,
} from './compiler-world.js';
import type {
  TemplateBindableReference,
  TemplateVisibleResource,
} from './compiler-world-reference.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type { TemplateCompilationUnit } from './compilation-unit.js';
import { TemplateCompilerFrameworkErrorCode } from './framework-error-code.js';
import {
  HtmlAttribute,
  HtmlElementAttributeOwner,
  HtmlIrNodeKind,
  htmlElementAttributeOwnersByAttributeProduct,
  htmlElementLookupName,
  HtmlNodeReference,
} from './html-ir.js';
import type { HtmlParseEmission } from './html-parse-materializer.js';
import { TemplateProductDetails } from './product-details.js';
import { isTemplateSpecialAttributeName } from './special-attribute-source.js';

export interface AttributeClassificationRequest {
  /** Store-local key for this classification pass. */
  readonly localKey: string;
  /** Compiler unit that owns the HTML and AttrSyntax products. */
  readonly compilationUnit: TemplateCompilationUnit;
  /** Parsed HTML products whose attributes are being classified. */
  readonly html: HtmlParseEmission;
  /** Runtime AttrSyntax products produced from the HTML attributes. */
  readonly attributeSyntax: AttributeSyntaxParseEmission;
  /** Compiler world that supplies resource resolver and binding-command resolver services. */
  readonly compilerWorld: TemplateCompilerWorldEmission;
}

export class AttributeClassificationEmission {
  constructor(
    readonly classifications: readonly AttributeClassification[],
    readonly issues: readonly TemplateCompilerIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class AttributeClassificationSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class ClassificationDecision {
  constructor(
    readonly classificationKind: AttributeClassificationKind,
    readonly resourceKind: ResourceDefinitionKind | null,
    readonly resource: TemplateVisibleResource | null,
    readonly bindingCommand: AttributeClassification['bindingCommand'],
    readonly bindable: TemplateBindableReference | null,
    readonly issue: TemplateCompilerIssueDraft | null = null,
  ) {}
}

class TemplateCompilerIssueDraft {
  constructor(
    readonly issueKind: TemplateCompilerIssueKind,
    readonly message: string,
    readonly frameworkErrorCode: string | null,
  ) {}
}

class AttributeClassificationPublication {
  constructor(
    readonly classification: AttributeClassification,
    readonly issue: TemplateCompilerIssuePublication | null,
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
  ) {}
}

/** Classifies runtime AttrSyntax against the compiler world's resource and command resolvers. */
export class AttributeClassificationMaterializer {
  private readonly issuePublisher: TemplateCompilerIssuePublisher;

  constructor(
    /** Hot analysis store that receives attribute classification records. */
    readonly store: KernelStore,
  ) {
    this.issuePublisher = new TemplateCompilerIssuePublisher(store);
  }

  classify(input: AttributeClassificationRequest): AttributeClassificationEmission {
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
    for (const issue of emission.issues) {
      this.store.productDetails.add(TemplateProductDetails.CompilerIssue, issue.productHandle, issue);
    }
    return emission;
  }

  private recordsForClassification(input: AttributeClassificationRequest): AttributeClassificationEmission {
    const source = this.recordsForSource(input);
    const records: KernelStoreRecord[] = [...source.records];
    const classifications: AttributeClassification[] = [];
    const issues: TemplateCompilerIssue[] = [];
    const claims: SemanticClaim[] = [];
    const attributesByProduct = new Map(input.html.attributes.map((attribute) => [attribute.productHandle, attribute]));
    const ownersByAttributeProduct = htmlElementAttributeOwnersByAttributeProduct(input.html.nodes, input.html.attributes);

    input.attributeSyntax.syntaxes.forEach((syntax, index) => {
      const publication = this.publishAttributeClassification(
        `attribute-classification:${input.localKey}:${index}`,
        source,
        input.compilerWorld,
        syntax,
        attributeForSyntax(syntax, attributesByProduct),
        ownerForSyntax(syntax, ownersByAttributeProduct),
      );
      classifications.push(publication.classification);
      if (publication.issue != null) {
        issues.push(publication.issue.issue);
        records.push(...publication.issue.records);
      }
      records.push(...publication.records);
      claims.push(...publication.claims);
    });

    records.push(
      ...claims,
      new MaterializationRecord(
        this.store.handles.materialization(`attribute-classification:${input.localKey}`),
        input.compilationUnit.identityHandle,
        [
          ...classifications.map((classification) => classification.productHandle),
          ...issues.map((issue) => issue.productHandle),
        ],
        claims.map((claim) => claim.handle),
      ),
    );

    return new AttributeClassificationEmission(classifications, issues, records);
  }

  private publishAttributeClassification(
    local: string,
    source: AttributeClassificationSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    syntax: AttributeSyntax,
    attribute: HtmlAttribute | null,
    owner: HtmlElementAttributeOwner | null,
  ): AttributeClassificationPublication {
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const decision = attribute == null || owner == null
      ? openDecision()
      : classifySyntax(syntax, attribute, owner, compilerWorld);
    const classification = this.createAttributeClassification(
      productHandle,
      identityHandle,
      source,
      syntax,
      owner,
      decision,
    );
    const issue = decision.issue == null
      ? null
      : this.issuePublisher.publish(
        `${local}:issue`,
        classification.identityHandle,
        source.provenanceHandle,
        TemplateCompilerIssuePhase.AttributeClassification,
        decision.issue.issueKind,
        decision.issue.message,
        decision.issue.frameworkErrorCode,
        classification.sourceAddressHandle,
      );
    const claims = this.claimsForAttributeClassification(local, source, syntax, classification, decision);
    return new AttributeClassificationPublication(
      classification,
      issue,
      this.recordsForAttributeClassificationProduct(source, syntax, classification),
      claims,
    );
  }

  private createAttributeClassification(
    productHandle: ProductHandle,
    identityHandle: IdentityHandle,
    source: AttributeClassificationSourceSet,
    syntax: AttributeSyntax,
    owner: HtmlElementAttributeOwner | null,
    decision: ClassificationDecision,
  ): AttributeClassification {
    return bindProductDetailEnvelope(new AttributeClassification(
      syntax.productHandle,
      owner?.reference ?? new HtmlNodeReference(HtmlIrNodeKind.Element, null, null, syntax.attribute.addressHandle),
      decision.classificationKind,
      decision.resourceKind,
      decision.resource,
      decision.bindingCommand,
      decision.bindable,
      [],
      [],
    ), new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.AttributeClassification.key,
      identityHandle,
      syntax.sourceAddressHandle,
      source.provenanceHandle,
    ));
  }

  private claimsForAttributeClassification(
    local: string,
    source: AttributeClassificationSourceSet,
    syntax: AttributeSyntax,
    classification: AttributeClassification,
    decision: ClassificationDecision,
  ): readonly SemanticClaim[] {
    const referencedProductHandle = referencedProductHandleForDecision(decision);
    return [
      new SemanticClaim(
        this.store.handles.claim(`${local}:classifies-attribute-syntax`),
        syntax.productHandle,
        KernelVocabulary.Template.ClassifiesAttributeSyntax.key,
        classification.productHandle,
        source.provenanceHandle,
      ),
      ...(referencedProductHandle == null
        ? []
        : [
          new SemanticClaim(
            this.store.handles.claim(`${local}:references-resource`),
            classification.productHandle,
            KernelVocabulary.Template.ReferencesResource.key,
            referencedProductHandle,
            source.provenanceHandle,
          ),
        ]),
    ];
  }

  private recordsForAttributeClassificationProduct(
    source: AttributeClassificationSourceSet,
    syntax: AttributeSyntax,
    classification: AttributeClassification,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        classification.identityHandle,
        KernelVocabulary.Template.AttributeClassification.key,
        syntax.identityHandle,
        classification.sourceAddressHandle,
        syntax.rawName,
      ),
      requireProductDetailEnvelope(classification, 'template.attribute-classification'),
    ];
  }

  private recordsForSource(input: AttributeClassificationRequest): AttributeClassificationSourceSet {
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

function attributeForSyntax(
  syntax: AttributeSyntax,
  attributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>,
): HtmlAttribute | null {
  return syntax.attribute.productHandle == null
    ? null
    : attributesByProduct.get(syntax.attribute.productHandle) ?? null;
}

function ownerForSyntax(
  syntax: AttributeSyntax,
  ownersByAttributeProduct: ReadonlyMap<ProductHandle, HtmlElementAttributeOwner>,
): HtmlElementAttributeOwner | null {
  return syntax.attribute.productHandle == null
    ? null
    : ownersByAttributeProduct.get(syntax.attribute.productHandle) ?? null;
}

function referencedProductHandleForDecision(
  decision: ClassificationDecision,
): ProductHandle | null {
  return decision.resource?.definitionProductHandle
    ?? decision.resource?.resourceProductHandle
    ?? decision.bindingCommand?.productHandle
    ?? null;
}

function classifySyntax(
  syntax: AttributeSyntax,
  attribute: HtmlAttribute,
  owner: HtmlElementAttributeOwner,
  world: TemplateCompilerWorldEmission,
): ClassificationDecision {
  const rawName = attribute.rawName.toLowerCase();
  const target = syntax.target.toLowerCase();

  if (isTemplateSpecialAttributeName(rawName)) {
    return new ClassificationDecision(AttributeClassificationKind.CompilerControl, null, null, null, null);
  }

  const commandName = syntax.command?.toLowerCase() ?? null;
  const bindingCommand = commandName == null
    ? null
    : world.bindingCommandResolver.get(commandName)?.toReference() ?? null;
  const elementResolution = world.resourceResolver.el(htmlElementLookupName(owner.element, owner));
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
      : invalidDecision(
        TemplateCompilerIssueKind.ReservedSpreadSyntax,
        `Spreading syntax "...xxx" is reserved. Encountered "${syntax.target}".`,
        TemplateCompilerFrameworkErrorCode.CompilerNoReservedSpreadSyntax,
      );
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
    return invalidDecision(
      TemplateCompilerIssueKind.ReservedBindableSyntax,
      `Usage of $bindables is only allowed on custom elements. Encountered "${syntax.rawName}".`,
      TemplateCompilerFrameworkErrorCode.CompilerNoReservedBindableSyntax,
    );
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

function invalidDecision(
  issueKind: TemplateCompilerIssueKind,
  message: string,
  frameworkErrorCode: string | null,
  bindingCommand: AttributeClassification['bindingCommand'] = null,
): ClassificationDecision {
  return new ClassificationDecision(
    AttributeClassificationKind.Open,
    null,
    null,
    bindingCommand,
    null,
    new TemplateCompilerIssueDraft(issueKind, message, frameworkErrorCode),
  );
}
