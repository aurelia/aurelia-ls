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
  bindProductDetailEnvelope,
  requireProductDetailEnvelope,
} from '../kernel/product-details.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  type KernelPublicationContext,
  KernelPublicationPlan,
  publishProductDetails,
} from '../kernel/publication.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  AttributeClassification,
  AttributeClassificationKind,
  type AttributeSyntax,
} from './attribute-syntax.js';
import type { AttributeSyntaxParseEmission } from './attribute-syntax-materializer.js';
import {
  AttributeClassificationDecision,
  type AttributeClassificationDecisionOwner,
  decideAttributeClassification,
} from './attribute-classification-decision.js';
import {
  type TemplateCompilerIssue,
  TemplateCompilerIssueKind,
  TemplateCompilerIssuePhase,
} from './compiler-issue.js';
import {
  TemplateCompilerIssuePublisher,
  type TemplateCompilerIssuePublication,
} from './compiler-issue-publication.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type { TemplateCompilerReadView } from './compiler-read-view.js';
import type { TemplateCompilationUnit } from './compilation-unit.js';
import {
  type HtmlAttribute,
  type HtmlElementAttributeOwner,
  HtmlIrNodeKind,
  htmlElementAttributeOwnersByAttributeProduct,
  htmlElementLookupName,
  HtmlNodeReference,
} from './html-ir.js';
import type { HtmlParseEmission } from './html-parse-materializer.js';
import { TemplateProductDetails } from './product-details.js';

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
  /** Required run-scoped compiler lookup surface. */
  readonly compilerReads: TemplateCompilerReadView;
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
    readonly store: KernelPublicationContext,
  ) {
    this.issuePublisher = new TemplateCompilerIssuePublisher(store);
  }

  classify(input: AttributeClassificationRequest): AttributeClassificationEmission {
    const emission = this.recordsForClassification(input);
    this.store.publish(new KernelPublicationPlan(
      new KernelStoreBatch(emission.records, `attribute-classification:${input.localKey}`),
      [
        ...publishProductDetails(TemplateProductDetails.AttributeClassification, emission.classifications),
        ...publishProductDetails(TemplateProductDetails.CompilerIssue, emission.issues),
      ],
    ));
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
        input.compilerReads,
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
    compilerReads: TemplateCompilerReadView,
    syntax: AttributeSyntax,
    attribute: HtmlAttribute | null,
    owner: HtmlElementAttributeOwner | null,
  ): AttributeClassificationPublication {
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const decision = attribute == null || owner == null
      ? new AttributeClassificationDecision(AttributeClassificationKind.Open, null, null, null, null)
      : decideAttributeClassification(syntax, new AuthoredAttributeClassificationOwner(owner), compilerReads);
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
        attributeClassificationIssueSource(syntax, classification, decision.issue.issueKind),
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
    decision: AttributeClassificationDecision,
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
      decision.openReason,
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
    decision: AttributeClassificationDecision,
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

function attributeClassificationIssueSource(
  syntax: AttributeSyntax,
  classification: AttributeClassification,
  issueKind: TemplateCompilerIssueKind,
): AddressHandle | null {
  switch (issueKind) {
    case TemplateCompilerIssueKind.UnknownBindingCommand:
      return syntax.commandSourceAddressHandle ?? classification.sourceAddressHandle;
    case TemplateCompilerIssueKind.ReservedSpreadSyntax:
    case TemplateCompilerIssueKind.ReservedBindableSyntax:
      return syntax.targetSourceAddressHandle ?? classification.sourceAddressHandle;
    default:
      return classification.sourceAddressHandle;
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
  decision: AttributeClassificationDecision,
): ProductHandle | null {
  return decision.resource?.definitionProductHandle
    ?? decision.resource?.resourceProductHandle
    ?? decision.bindingCommand?.productHandle
    ?? null;
}

class AuthoredAttributeClassificationOwner implements AttributeClassificationDecisionOwner {
  readonly lookupName: string;

  constructor(readonly owner: HtmlElementAttributeOwner) {
    this.lookupName = htmlElementLookupName(owner.element, owner);
  }

  get tagName(): string {
    return this.owner.tagName;
  }

  get namespace(): HtmlElementAttributeOwner['namespace'] {
    return this.owner.namespace;
  }

  get attributes(): HtmlElementAttributeOwner['attributes'] {
    return this.owner.attributes;
  }
}
