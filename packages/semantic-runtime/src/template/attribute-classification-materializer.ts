import { SemanticClaim, claimsForProduct } from '../kernel/claim.js';
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
  CustomElementCaptureKind,
  type CustomElementCaptureDefinition,
} from '../resources/custom-element-definition.js';
import { StaticCallableTruthinessKind } from '../evaluation/function-execution.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  AttributeClassification,
  AttributeClassificationKind,
  AttributeSyntaxKind,
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
import type { TemplateCompilerReadView } from './compiler-read-view.js';
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

class ClassificationDecision {
  constructor(
    readonly classificationKind: AttributeClassificationKind,
    readonly resourceKind: ResourceDefinitionKind | null,
    readonly resource: TemplateVisibleResource | null,
    readonly bindingCommand: AttributeClassification['bindingCommand'],
    readonly bindable: TemplateBindableReference | null,
    readonly issue: TemplateCompilerIssueDraft | null = null,
    readonly openReason: string | null = null,
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
      ? openDecision()
      : classifySyntax(syntax, owner, compilerReads);
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
  decision: ClassificationDecision,
): ProductHandle | null {
  return decision.resource?.definitionProductHandle
    ?? decision.resource?.resourceProductHandle
    ?? decision.bindingCommand?.productHandle
    ?? null;
}

function classifySyntax(
  syntax: AttributeSyntax,
  owner: HtmlElementAttributeOwner,
  reads: TemplateCompilerReadView,
): ClassificationDecision {
  const rawName = syntax.runtimeRawName;
  const target = syntax.target;

  if (isTemplateSpecialAttributeName(rawName)) {
    return new ClassificationDecision(AttributeClassificationKind.CompilerControl, null, null, null, null);
  }
  if (syntax.syntaxKind === AttributeSyntaxKind.Open) {
    return openDecision();
  }

  const commandName = syntax.command;
  const bindingCommand = commandName == null
    ? null
    : reads.bindingCommand(commandName)?.toReference() ?? null;
  if (commandName != null && bindingCommand == null && isRemovedV1BindingCommand(commandName)) {
    return invalidDecision(
      TemplateCompilerIssueKind.UnknownBindingCommand,
      unknownBindingCommandMessage(commandName),
      TemplateCompilerFrameworkErrorCode.CompilerUnknownBindingCommand,
    );
  }
  const elementResolution = reads.element(htmlElementLookupName(owner.element, owner));
  const elementDefinition = elementResolution?.definition?.type === ResourceDefinitionKind.CustomElement
    ? elementResolution.definition
    : null;

  const captureDecision = elementDefinition == null || elementResolution == null
    ? null
    : classifyCapture(syntax, elementDefinition.capture, elementResolution, bindingCommand != null, reads);
  if (captureDecision != null) {
    return captureDecision;
  }

  if (target === '...$attrs') {
    return new ClassificationDecision(AttributeClassificationKind.Spread, null, null, bindingCommand, null);
  }

  if (bindingCommand != null && commandIgnoresAttribute(bindingCommand, reads)) {
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
    const bindable = reads.bindables(elementDefinition).attr(target);
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

  const attributeResolution = reads.attribute(target);
  if (attributeResolution?.resource != null) {
    const classificationKind = attributeResolution.resource.resourceKind === ResourceDefinitionKind.TemplateController
      ? AttributeClassificationKind.TemplateController
      : AttributeClassificationKind.CustomAttribute;
    const bindable = attributeResolution.definition?.type === ResourceDefinitionKind.CustomAttribute
      ? reads.bindables(attributeResolution.definition).primary
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
  capture: CustomElementCaptureDefinition,
  elementResolution: TemplateResolvedResource,
  hasBindingCommand: boolean,
  reads: TemplateCompilerReadView,
): ClassificationDecision | null {
  if (capture.kind === CustomElementCaptureKind.None) {
    return null;
  }
  const elementDefinition = elementResolution.definition?.type === ResourceDefinitionKind.CustomElement
    ? elementResolution.definition
    : null;
  if (elementDefinition == null) {
    return null;
  }
  if (capture.kind === CustomElementCaptureKind.Predicate) {
    const result = reads.capturePredicate(elementDefinition, syntax.target);
    if (result.kind === StaticCallableTruthinessKind.False) {
      return null;
    }
    if (result.kind === StaticCallableTruthinessKind.Open) {
      return openDecision(
        null,
        `Custom-element capture predicate remained open. ${result.reason ?? ''}`.trim(),
      );
    }
  }
  const target = syntax.target;
  if (hasBindingCommand && commandIgnoresAttributeName(syntax.command, reads)) {
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
  const bindable = reads.bindables(elementDefinition).attr(target);
  const templateController = reads.attribute(target);
  if (bindable != null || templateController?.resource?.resourceKind === ResourceDefinitionKind.TemplateController) {
    return null;
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
  reads: TemplateCompilerReadView,
): boolean {
  return commandIgnoresAttributeName(command.name, reads);
}

function commandIgnoresAttributeName(
  commandName: string | null,
  reads: TemplateCompilerReadView,
): boolean {
  return commandName == null
    ? false
    : reads.bindingCommand(commandName)?.ignoreAttr === true;
}

function openDecision(
  bindingCommand: AttributeClassification['bindingCommand'] = null,
  openReason: string | null = null,
): ClassificationDecision {
  return new ClassificationDecision(
    AttributeClassificationKind.Open,
    null,
    null,
    bindingCommand,
    null,
    null,
    openReason,
  );
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

function isRemovedV1BindingCommand(commandName: string): boolean {
  return commandName === 'delegate' || commandName === 'call';
}

function unknownBindingCommandMessage(commandName: string): string {
  const help = removedV1BindingCommandHelp(commandName);
  return `Template compilation error: unknown binding command: "${commandName}".${help}`;
}

function removedV1BindingCommandHelp(commandName: string): string {
  switch (commandName) {
    case 'delegate':
      return ' The ".delegate" binding command has been removed in v2.'
        + ' Binding command ".trigger" should be used instead.'
        + ' If you are migrating v1 application, install compat package'
        + ' to add back the ".delegate" binding command for ease of migration.';
    case 'call':
      return ' The ".call" binding command has been removed in v2.'
        + ' If you want to pass a callback that preserves the context of the function call,'
        + ' you can use lambda instead. Refer to lambda expression doc for more details.';
    default:
      return '';
  }
}
