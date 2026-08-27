import { SemanticClaim } from '../kernel/claim.js';
import { SourceSpanRole } from '../kernel/address.js';
import {
  OpenSeam,
  OpenSeamReasonKind,
} from '../kernel/open-seam.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  CompilerIdentity,
  InstructionIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStoreReadView,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelDetailAdmission,
  type KernelPublicationContext,
  KernelPublicationPlan,
  publishProductDetails,
} from '../kernel/publication.js';
import {
  KernelVocabulary,
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import { localKeyPart } from '../kernel/local-key.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import { camelCaseAttributeName, normalizeLetBindingTarget } from './attribute-mapper.js';
import {
  AU_SLOT_PROCESS_CONTENT_TARGET_NAME,
  AU_SLOT_RESOURCE_NAME,
  AU_SLOT_TARGET_NAME,
  AuSlotStaticAttributeName,
} from './au-slot-source.js';
import type {
  AttributeClassificationEmission,
} from './attribute-classification-materializer.js';
import {
  AttributeClassificationKind,
  type AttributeClassification,
  type AttributeSyntax,
} from './attribute-syntax.js';
import type { AttributeSyntaxParseEmission } from './attribute-syntax-materializer.js';
import {
  CompiledNativeSlotNameKind,
  CompiledNativeSlotOutlet,
  CompiledTemplate,
  CompiledTemplateContext,
  CompiledTemplateContextRole,
  CompiledTemplateReference,
  CompiledTemplateState,
  TemplateRenderTarget,
  TemplateRenderTargetKind,
} from './compiled-template.js';
import {
  TemplateCompilerTargetContextRole,
  TemplateCompilerTargetContextState,
  TemplateCompilerTargetPlan,
  TemplateCompilerTargetRowPosture,
  type TemplateCompilerTargetContextPlan,
  type TemplateCompilerTargetRowPlan,
} from './compiler-target-plan.js';
import type { TemplateCompilationUnit } from './compilation-unit.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type { TemplateCompilerReadView } from './compiler-read-view.js';
import {
  HtmlElement,
  HtmlNamespaceKind,
  HtmlText,
  hasHtmlAttribute,
  htmlElementAttributeOwnersByElementProduct,
  htmlElementLookupName,
  type HtmlAttribute,
  type HtmlElementAttributeOwner,
  type HtmlIrNode,
  type HtmlNodeReference,
} from './html-ir.js';
import type { HtmlParseEmission } from './html-parse-materializer.js';
import {
  AuSlotProcessContentInstructionData,
  HydrateAttributeInstruction,
  HydrateElementInstruction,
  HydrateElementProjectionContributor,
  HydrateElementProjectionContributorDisposition,
  HydrateElementProjectionDefinition,
  HydrateLetElementInstruction,
  HydrateTemplateControllerInstruction,
  InterpolationInstruction,
  LetBindingInstruction,
  PropertyBindingInstruction,
  SetAttributeInstruction,
  SetClassAttributeInstruction,
  SetPropertyInstruction,
  SetStyleAttributeInstruction,
  SpreadTransferedBindingInstruction,
  SpreadValueBindingInstruction,
  TemplateInstructionReference,
  TemplateInstructionSequence,
  TemplateInstructionKind,
  TextBindingInstruction,
  type TemplateInstruction,
} from './instruction-ir.js';
import { instructionKindKeyFor } from './instruction-vocabulary.js';
import { orderCompilerInstructionsForElement } from './compiler-instruction-order.js';
import { TemplateSpecialAttributeName } from './special-attribute-source.js';
import { runtimeAttributeName, runtimeElementResourceName } from './runtime-dom-name.js';
import { compilerRootTemplateElement } from './compiler-root-template.js';
import {
  BindingCommandLoweringState,
  type BindingCommandLowering,
} from './binding-command-execution.js';
import type { BindingCommandLoweringEmission } from './binding-command-lowering-materializer.js';
import type { TemplateValueSiteEmission } from './value-site-materializer.js';
import {
  TemplateCompilerIssueKind,
  TemplateCompilerIssuePhase,
  type TemplateCompilerIssue,
} from './compiler-issue.js';
import { TemplateCompilerIssuePublisher } from './compiler-issue-publication.js';
import { TemplateCompilerFrameworkErrorCode } from './framework-error-code.js';
import {
  TemplateValueSiteKind,
  type TemplateExpressionParse,
  type TemplateValueSite,
} from './value-site.js';
import { TemplateProductDetails } from './product-details.js';
import { sourceAddressForRuntimeExpressionSpan } from './runtime-expression-source-address.js';

export interface CompiledTemplateMaterializationRequest {
  /** Store-local key for this compiled-template pass. */
  readonly localKey: string;
  /** Compiler unit that owns the authored HTML and compiler context. */
  readonly compilationUnit: TemplateCompilationUnit;
  /** Authored HTML parse result before compiler DOM transformation. */
  readonly html: HtmlParseEmission;
  /** Runtime AttrSyntax products produced from authored attributes. */
  readonly attributeSyntax: AttributeSyntaxParseEmission;
  /** Attribute classifications that selected resource/bindable/command lanes. */
  readonly attributeClassification: AttributeClassificationEmission;
  /** Value sites that reveal text interpolation and other non-command compiler work still needing rows. */
  readonly valueSites: TemplateValueSiteEmission;
  /** Binding-command lowering products that already emitted concrete instruction models. */
  readonly bindingCommandLowering: BindingCommandLoweringEmission;
  /** Compiler world that supplies runtime-shaped resource and command lookup services. */
  readonly compilerWorld: TemplateCompilerWorldEmission;
  /** Required run-scoped compiler lookup surface. */
  readonly compilerReads: TemplateCompilerReadView;
  /** Resource definition that owns this compilation occurrence. */
  readonly definition: CustomElementDefinition;
}

export class CompiledTemplateEmission {
  private readonly compiledTemplatesByProduct: ReadonlyMap<ProductHandle, CompiledTemplate>;

  constructor(
    /** Root resource compiled template retained for existing resource-level consumers. */
    readonly compiledTemplate: CompiledTemplate,
    /** Root plus every compiler-owned template-controller/projection generated definition. */
    readonly compiledTemplates: readonly CompiledTemplate[],
    /** All instructions used by the family, including products borrowed from command lowering. */
    readonly instructions: readonly TemplateInstruction[],
    /** Instructions minted and owned by compiled-template assembly itself. */
    readonly createdInstructions: readonly TemplateInstruction[],
    readonly instructionSequences: readonly TemplateInstructionSequence[],
    /** Run-local construction authority for definition ownership, target rows, and local closure state. */
    readonly targetPlan: TemplateCompilerTargetPlan,
    readonly issues: readonly TemplateCompilerIssue[],
    readonly openSeams: readonly OpenSeam[],
    readonly records: readonly KernelStoreRecord[],
  ) {
    this.compiledTemplatesByProduct = new Map(compiledTemplates.map((template) => [template.productHandle, template]));
  }

  readCompiledTemplate(productHandle: ProductHandle | null): CompiledTemplate | null {
    return productHandle == null ? null : this.compiledTemplatesByProduct.get(productHandle) ?? null;
  }

  readAllRenderTargets(): readonly TemplateRenderTarget[] {
    return this.compiledTemplates.flatMap((template) => template.targets);
  }
}

class CompiledTemplateSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class CompiledTemplateHandles {
  constructor(
    readonly local: string,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}

  toReference(): CompiledTemplateReference {
    return new CompiledTemplateReference(this.productHandle, this.identityHandle);
  }
}

class RenderTargetPublication {
  constructor(
    readonly target: TemplateRenderTarget,
    readonly sequence: TemplateInstructionSequence,
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
  ) {}
}

class RenderTargetPublicationHandles {
  constructor(
    readonly targetLocal: string,
    readonly sequenceLocal: string,
    readonly targetProductHandle: ProductHandle,
    readonly targetIdentityHandle: IdentityHandle,
    readonly sequenceProductHandle: ProductHandle,
    readonly sequenceIdentityHandle: IdentityHandle,
  ) {}
}

class SurrogateSequencePublicationHandles {
  constructor(
    readonly sequenceLocal: string,
    readonly sequenceProductHandle: ProductHandle,
    readonly sequenceIdentityHandle: IdentityHandle,
  ) {}
}

class InstructionSequencePublication {
  constructor(
    readonly sequence: TemplateInstructionSequence,
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
  ) {}
}

class CompiledTemplateSequencePublications {
  constructor(
    readonly instructionSequences: readonly TemplateInstructionSequence[],
    readonly renderTargetsByCompiledTemplate: ReadonlyMap<ProductHandle, readonly TemplateRenderTarget[]>,
    readonly surrogateSequence: TemplateInstructionSequence | null,
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
  ) {}

  renderTargetsFor(compiledTemplateProductHandle: ProductHandle): readonly TemplateRenderTarget[] {
    return this.renderTargetsByCompiledTemplate.get(compiledTemplateProductHandle) ?? [];
  }

  readAllRenderTargets(): readonly TemplateRenderTarget[] {
    return [...this.renderTargetsByCompiledTemplate.values()].flat();
  }
}

class CompiledTemplateAssembly {
  constructor(
    readonly targetPlan: TemplateCompilerTargetPlan,
    readonly surrogateInstructions: readonly TemplateInstruction[],
    readonly instructions: readonly TemplateInstruction[],
    readonly createdInstructions: readonly TemplateInstruction[],
    readonly nativeSlotOutlets: readonly CompiledNativeSlotOutlet[],
    readonly records: readonly KernelStoreRecord[],
    readonly issues: readonly TemplateCompilerIssue[],
    readonly openSeams: readonly OpenSeam[],
  ) {}
}

type ValueInstructionLane =
  | 'bindable'
  | 'custom-attribute'
  | 'template-controller'
  | 'plain';

interface ElementInstructionParts {
  readonly attributeInstructions: readonly TemplateInstruction[];
  readonly plainInstructions: readonly TemplateInstruction[];
  readonly templateControllerInstructions: readonly HydrateTemplateControllerInstruction[];
  readonly bindableInstructions: readonly TemplateInstruction[];
  readonly capturedSyntaxProductHandles: readonly ProductHandle[];
  readonly openDirectInstructionSeamHandles: readonly OpenSeamHandle[];
  readonly openTemplateControllerSeamHandles: readonly OpenSeamHandle[];
  readonly openStructuralSeamHandles: readonly OpenSeamHandle[];
  readonly hasProcessContentHook: boolean;
  readonly hasOpenProcessContentHook: boolean;
}

interface ElementInstructionPartBuckets {
  readonly attributeInstructions: TemplateInstruction[];
  readonly plainInstructions: TemplateInstruction[];
  readonly templateControllerInstructions: HydrateTemplateControllerInstruction[];
  readonly bindableInstructions: TemplateInstruction[];
  readonly capturedSyntaxProductHandles: ProductHandle[];
  readonly openDirectInstructionSeamHandles: OpenSeamHandle[];
  readonly openTemplateControllerSeamHandles: OpenSeamHandle[];
  readonly openStructuralSeamHandles: OpenSeamHandle[];
  readonly hasProcessContentHook: boolean;
  readonly hasOpenProcessContentHook: boolean;
}

class ElementProjectionChildGroup {
  constructor(
    readonly slotName: string,
    readonly extractedChildren: readonly HtmlNodeReferenceLike[],
    readonly sequenceChildren: readonly HtmlNodeReferenceLike[],
    readonly contributors: readonly HydrateElementProjectionContributor[],
    readonly discardedContributors: readonly HydrateElementProjectionContributor[],
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

interface HtmlNodeReferenceLike {
  readonly productHandle: ProductHandle | null;
}

class CompiledTemplateAssemblyIndexes {
  readonly nodesByProduct: ReadonlyMap<ProductHandle, HtmlIrNode>;
  readonly attributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>;
  readonly syntaxByProduct: ReadonlyMap<ProductHandle, AttributeSyntax>;
  readonly classificationsByOwner: ReadonlyMap<ProductHandle, readonly AttributeClassification[]>;
  readonly commandInstructions: ReadonlyMap<ProductHandle, readonly TemplateInstruction[]>;
  readonly commandLowerings: ReadonlyMap<ProductHandle, readonly BindingCommandLowering[]>;
  readonly parseBySite: ReadonlyMap<ProductHandle, TemplateExpressionParse>;
  readonly valueSiteByClassification: ReadonlyMap<ProductHandle, TemplateValueSite>;
  readonly textValueSiteByNode: ReadonlyMap<ProductHandle, TemplateValueSite>;
  readonly ownersByElement: ReadonlyMap<ProductHandle, HtmlElementAttributeOwner>;

  constructor(readonly input: CompiledTemplateMaterializationRequest) {
    this.nodesByProduct = new Map(input.html.nodes.map((node) => [node.productHandle, node]));
    this.attributesByProduct = new Map(input.html.attributes.map((attribute) => [attribute.productHandle, attribute]));
    this.syntaxByProduct = new Map(input.attributeSyntax.syntaxes.map((syntax) => [syntax.productHandle, syntax]));
    this.classificationsByOwner = classificationsByOwnerProduct(input.attributeClassification.classifications);
    this.commandInstructions = commandInstructionsByClassification(input);
    this.commandLowerings = commandLoweringsByClassification(input);
    this.parseBySite = expressionParsesBySite(input);
    this.valueSiteByClassification = valueSitesByClassification(input);
    this.textValueSiteByNode = textValueSitesByNode(input.valueSites.sites);
    this.ownersByElement = ownerElementsByProduct(input.html);
  }
}

class CompiledTemplateAssemblyState {
  readonly records: KernelStoreRecord[] = [];
  readonly openSeams: OpenSeam[] = [];
  readonly instructions: TemplateInstruction[] = [];
  readonly createdInstructions: TemplateInstruction[] = [];
  readonly nativeSlotOutlets: CompiledNativeSlotOutlet[] = [];
  readonly issues: TemplateCompilerIssue[] = [];
  readonly targetPlan: TemplateCompilerTargetPlan;
  readonly surrogateInstructions: TemplateInstruction[] = [];

  private instructionIndex = 0;
  private readonly issuePublisher: TemplateCompilerIssuePublisher;

  constructor(
    readonly store: KernelStoreReadView,
    readonly input: CompiledTemplateMaterializationRequest,
    readonly source: CompiledTemplateSourceSet,
    rootCompiledTemplate: CompiledTemplateReference,
  ) {
    this.targetPlan = new TemplateCompilerTargetPlan(
      `compiled-template:${input.localKey}:targets`,
      input.compilationUnit.rootContext,
      rootCompiledTemplate,
    );
    this.issuePublisher = new TemplateCompilerIssuePublisher(store);
    this.issues.push(...input.bindingCommandLowering.issues);
    this.openSeams.push(...input.bindingCommandLowering.openSeams);
  }

  readonly addOpenSeam = (
    local: string,
    summary: string,
    addressHandle: AddressHandle | null,
    seamKindKey: OpenSeamKindKey = KernelVocabulary.Instruction.OpenInstruction.key,
    reasonKinds: readonly OpenSeamReasonKind[] = [OpenSeamReasonKind.FeatureNotYetModeled],
  ): OpenSeam => {
    const seam = new OpenSeam(
      this.store.handles.openSeam(`compiled-template:${this.input.localKey}:assembly:${local}`),
      seamKindKey,
      summary,
      addressHandle,
      this.source.evidenceHandle,
      reasonKinds,
    );
    this.openSeams.push(seam);
    this.records.push(seam);
    return seam;
  };

  readonly addCompilerIssue = (
    local: string,
    ownerIdentityHandle: IdentityHandle,
    issueKind: TemplateCompilerIssueKind,
    message: string,
    frameworkErrorCode: string | null,
    addressHandle: AddressHandle | null,
  ): void => {
    const publication = this.issuePublisher.publish(
      `compiled-template:${this.input.localKey}:assembly:${local}`,
      ownerIdentityHandle,
      this.source.provenanceHandle,
      TemplateCompilerIssuePhase.CompiledTemplate,
      issueKind,
      message,
      frameworkErrorCode,
      addressHandle,
    );
    this.issues.push(publication.issue);
    this.records.push(...publication.records);
  };

  readonly createInstruction = <TInstruction extends TemplateInstruction>(
    local: string,
    kind: TemplateInstructionKind,
    ownerIdentityHandle: IdentityHandle,
    addressHandle: AddressHandle | null,
    factory: (productHandle: ProductHandle, identityHandle: IdentityHandle, instructionLocal: string) => TInstruction,
  ): TInstruction => {
    const instructionLocal = `compiled-template:${this.input.localKey}:instruction:${this.instructionIndex++}:${local}`;
    const productHandle = this.store.handles.product(instructionLocal);
    const identityHandle = this.store.handles.identity(instructionLocal);
    const instruction = factory(productHandle, identityHandle, instructionLocal);
    this.instructions.push(instruction);
    this.createdInstructions.push(instruction);
    this.records.push(
      new InstructionIdentity(
        identityHandle,
        ownerIdentityHandle,
        instructionKindKeyFor(kind),
      ),
    );
    return instruction;
  };

  readonly addExistingInstruction = (instruction: TemplateInstruction): TemplateInstruction => {
    this.instructions.push(instruction);
    return instruction;
  };

  readonly recordCompilerReachableNode = (
    node: HtmlElement | HtmlText,
    contextPlan: TemplateCompilerTargetContextPlan,
  ): void => {
    contextPlan.recordCompilerReachableNode(node.productHandle);
  };

  toAssembly(): CompiledTemplateAssembly {
    this.targetPlan.seal();
    return new CompiledTemplateAssembly(
      this.targetPlan,
      this.surrogateInstructions,
      this.instructions,
      this.createdInstructions,
      this.nativeSlotOutlets,
      this.records,
      this.issues,
      this.openSeams,
    );
  }
}

class CompiledTemplateInstructionFactory {
  constructor(
    readonly input: CompiledTemplateMaterializationRequest,
    readonly assemblyState: CompiledTemplateAssemblyState,
    readonly indexes: CompiledTemplateAssemblyIndexes,
  ) {}

  readonly spreadInstructionForClassification = (
    classification: AttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
    node: HtmlElement,
  ): TemplateInstruction | null => {
    if (syntax == null || attribute == null) {
      return null;
    }
    const target = syntax.target;
    const defaultAddressHandle = attribute.valueAddressHandle ?? attribute.sourceAddressHandle;
    if (target === '...$attrs') {
      return this.assemblyState.createInstruction(
        `spread-transfered-binding:${attribute.productHandle}`,
        TemplateInstructionKind.SpreadTransferedBinding,
        classification.identityHandle,
        defaultAddressHandle,
        (productHandle, identityHandle) => new SpreadTransferedBindingInstruction(
          productHandle,
          identityHandle,
          node.toReference(),
          attribute.toReference(),
          defaultAddressHandle,
          [],
        ),
      );
    }
    if (!target.startsWith('...')) {
      return null;
    }
    const site = this.indexes.valueSiteByClassification.get(classification.productHandle) ?? null;
    const parse = site == null ? null : this.indexes.parseBySite.get(site.productHandle) ?? null;
    const expressionAddressHandle = site?.sourceAddressHandle ?? defaultAddressHandle;
    return this.assemblyState.createInstruction(
      `spread-value-binding:${attribute.productHandle}`,
      TemplateInstructionKind.SpreadValueBinding,
      classification.identityHandle,
      expressionAddressHandle,
      (productHandle, identityHandle) => new SpreadValueBindingInstruction(
        productHandle,
        identityHandle,
        node.toReference(),
        attribute.toReference(),
        '$bindables',
        target === '...$bindables' ? syntax.rawValue : syntax.target.slice(3),
        parse?.productHandle ?? null,
        syntax.targetSourceAddressHandle,
        expressionAddressHandle,
        [],
      ),
    );
  };

  readonly valueInstructionForClassification = (
    classification: AttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
    node: HtmlElement,
    lane: ValueInstructionLane,
    generateStaticAttrInstructions = false,
  ): TemplateInstruction | null => {
    if (syntax == null || attribute == null) {
      return null;
    }
    const site = this.indexes.valueSiteByClassification.get(classification.productHandle) ?? null;
    if (site?.siteKind === TemplateValueSiteKind.MultiBindingValue) {
      return null;
    }
    const parse = site == null ? null : this.indexes.parseBySite.get(site.productHandle) ?? null;
    const target = this.valueInstructionTarget(classification, syntax, node, lane);
    const addressHandle = attribute.valueAddressHandle ?? attribute.sourceAddressHandle;
    if (parse == null || parse.resultKind === ExpressionParseResultKind.InterpolationAbsent) {
      return this.staticValueInstructionForClassification(
        classification,
        syntax,
        attribute,
        node,
        lane,
        target,
        addressHandle,
        generateStaticAttrInstructions,
      );
    }
    return this.interpolationInstructionForClassification(
      classification,
      attribute,
      node,
      target,
      parse,
      addressHandle,
    );
  };

  private valueInstructionTarget(
    classification: AttributeClassification,
    syntax: AttributeSyntax,
    node: HtmlElement,
    lane: ValueInstructionLane,
  ): string {
    if (lane === 'plain') {
      return this.input.compilerReads.mapAttribute(node, syntax.target) ?? camelCaseAttributeName(syntax.target);
    }
    const currentDefinition = this.input.compilerReads.currentDefinition(classification.resource);
    const customAttributeDefinition = currentDefinition instanceof CustomAttributeDefinition
      ? currentDefinition
      : null;
    return classification.bindable?.definition.name ?? customAttributeDefinition?.defaultProperty ?? syntax.target;
  }

  private staticValueInstructionForClassification(
    classification: AttributeClassification,
    syntax: AttributeSyntax,
    attribute: HtmlAttribute,
    node: HtmlElement,
    lane: ValueInstructionLane,
    target: string,
    addressHandle: AddressHandle | null,
    generateStaticAttrInstructions: boolean,
  ): TemplateInstruction | null {
    if (lane === 'plain') {
      return generateStaticAttrInstructions
        ? this.staticPlainAttributeInstruction(classification, syntax, attribute, node, addressHandle)
        : null;
    }
    return this.setPropertyInstructionForClassification(classification, syntax, attribute, node, target, addressHandle);
  }

  private staticPlainAttributeInstruction(
    classification: AttributeClassification,
    syntax: AttributeSyntax,
    attribute: HtmlAttribute,
    node: HtmlElement,
    addressHandle: AddressHandle | null,
  ): TemplateInstruction {
    switch (syntax.runtimeRawName) {
      case 'class':
        return this.setClassAttributeInstruction(classification, syntax, attribute, node, addressHandle);
      case 'style':
        return this.setStyleAttributeInstruction(classification, syntax, attribute, node, addressHandle);
      default:
        return this.setAttributeInstruction(classification, syntax, attribute, node, addressHandle);
    }
  }

  private setClassAttributeInstruction(
    classification: AttributeClassification,
    syntax: AttributeSyntax,
    attribute: HtmlAttribute,
    node: HtmlElement,
    addressHandle: AddressHandle | null,
  ): SetClassAttributeInstruction {
    return this.assemblyState.createInstruction(
      `set-class-attribute:${attribute.productHandle}`,
      TemplateInstructionKind.SetClassAttribute,
      classification.identityHandle,
      addressHandle,
      (productHandle, identityHandle) => new SetClassAttributeInstruction(
        productHandle,
        identityHandle,
        node.toReference(),
        attribute.toReference(),
        syntax.rawValue,
        addressHandle,
        [],
      ),
    );
  }

  private setStyleAttributeInstruction(
    classification: AttributeClassification,
    syntax: AttributeSyntax,
    attribute: HtmlAttribute,
    node: HtmlElement,
    addressHandle: AddressHandle | null,
  ): SetStyleAttributeInstruction {
    return this.assemblyState.createInstruction(
      `set-style-attribute:${attribute.productHandle}`,
      TemplateInstructionKind.SetStyleAttribute,
      classification.identityHandle,
      addressHandle,
      (productHandle, identityHandle) => new SetStyleAttributeInstruction(
        productHandle,
        identityHandle,
        node.toReference(),
        attribute.toReference(),
        syntax.rawValue,
        addressHandle,
        [],
      ),
    );
  }

  private setAttributeInstruction(
    classification: AttributeClassification,
    syntax: AttributeSyntax,
    attribute: HtmlAttribute,
    node: HtmlElement,
    addressHandle: AddressHandle | null,
  ): SetAttributeInstruction {
    return this.assemblyState.createInstruction(
      `set-attribute:${attribute.productHandle}`,
      TemplateInstructionKind.SetAttribute,
      classification.identityHandle,
      addressHandle,
      (productHandle, identityHandle) => new SetAttributeInstruction(
        productHandle,
        identityHandle,
        node.toReference(),
        attribute.toReference(),
        attribute.rawName,
        syntax.rawValue,
        addressHandle,
        [],
      ),
    );
  }

  private setPropertyInstructionForClassification(
    classification: AttributeClassification,
    syntax: AttributeSyntax,
    attribute: HtmlAttribute,
    node: HtmlElement,
    target: string,
    addressHandle: AddressHandle | null,
  ): SetPropertyInstruction {
    return this.assemblyState.createInstruction(
      `set-property:${attribute.productHandle}`,
      TemplateInstructionKind.SetProperty,
      classification.identityHandle,
      addressHandle,
      (productHandle, identityHandle) => new SetPropertyInstruction(
        productHandle,
        identityHandle,
        node.toReference(),
        attribute.toReference(),
        target,
        syntax.rawValue,
        addressHandle,
        [],
      ),
    );
  }

  private interpolationInstructionForClassification(
    classification: AttributeClassification,
    attribute: HtmlAttribute,
    node: HtmlElement,
    target: string,
    parse: TemplateExpressionParse,
    addressHandle: AddressHandle | null,
  ): InterpolationInstruction {
    return this.assemblyState.createInstruction(
      `interpolation:${attribute.productHandle}`,
      TemplateInstructionKind.Interpolation,
      classification.identityHandle,
      addressHandle,
      (productHandle, identityHandle) => new InterpolationInstruction(
        productHandle,
        identityHandle,
        node.toReference(),
        attribute.toReference(),
        target,
        [parse.productHandle],
        addressHandle,
        [],
      ),
    );
  }

  readonly createHydrateAttributeInstruction = (
    classification: AttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
    node: HtmlElement,
    props: readonly TemplateInstruction[],
  ): HydrateAttributeInstruction =>
    this.assemblyState.createInstruction(
      `hydrate-attribute:${classification.productHandle}`,
      TemplateInstructionKind.HydrateAttribute,
      classification.identityHandle,
      classification.sourceAddressHandle,
      (productHandle, identityHandle) => new HydrateAttributeInstruction(
        productHandle,
        identityHandle,
        node.toReference(),
        attribute?.toReference() ?? syntax?.attribute ?? { productHandle: null, addressHandle: classification.sourceAddressHandle, rawName: null },
        syntax?.target ?? classification.resource?.name ?? '(unknown)',
        this.input.compilerReads.resolveResources()
          ? classification.resource?.toReference() ?? null
          : null,
        props.map((instruction) => instruction.productHandle),
        classification.sourceAddressHandle,
        [],
      ),
    );

  readonly createTemplateControllerInstruction = (
    classification: AttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
    node: HtmlElement,
    props: readonly TemplateInstruction[],
  ): HydrateTemplateControllerInstruction =>
    this.assemblyState.createInstruction(
      `hydrate-template-controller:${classification.productHandle}`,
      TemplateInstructionKind.HydrateTemplateController,
      classification.identityHandle,
      classification.sourceAddressHandle,
      (productHandle, identityHandle, instructionLocal) => {
        const childCompiledTemplateLocal = `${instructionLocal}:child-compiled-template`;
        const childCompiledTemplate = new CompiledTemplateReference(
          this.assemblyState.store.handles.product(childCompiledTemplateLocal),
          this.assemblyState.store.handles.identity(childCompiledTemplateLocal),
        );
        return new HydrateTemplateControllerInstruction(
          productHandle,
          identityHandle,
          node.toReference(),
          attribute?.toReference() ?? syntax?.attribute ?? { productHandle: null, addressHandle: classification.sourceAddressHandle, rawName: null },
          syntax?.target ?? classification.resource?.name ?? '(unknown)',
          this.input.compilerReads.resolveResources()
            ? classification.resource?.toReference() ?? null
            : null,
          childCompiledTemplate,
          props.map((instruction) => instruction.productHandle),
          classification.sourceAddressHandle,
          [],
        );
      },
    );
}

class CompiledTemplateInstructionTraversal {
  constructor(
    readonly input: CompiledTemplateMaterializationRequest,
    readonly assemblyState: CompiledTemplateAssemblyState,
    readonly instructionFactory: CompiledTemplateInstructionFactory,
    readonly indexes: CompiledTemplateAssemblyIndexes,
  ) {}

  run(): void {
    const rootTemplate = compilerRootTemplateElement(this.input.html);
    const contentRoots = rootTemplate?.children ?? this.input.html.document.rootNodes;
    if (rootTemplate != null) {
      this.assemblyState.recordCompilerReachableNode(rootTemplate, this.assemblyState.targetPlan.root);
      this.recordRootLocalTemplateIssue(rootTemplate);
    }
    this.recordLocalTemplateIssues(contentRoots);

    if (rootTemplate != null) {
      this.assemblyState.surrogateInstructions.push(...this.surrogateInstructionsForTemplateElement(rootTemplate));
      for (const child of rootTemplate.children) {
        this.visitNode(child, this.assemblyState.targetPlan.root);
      }
      return;
    }

    for (const root of this.input.html.document.rootNodes) {
      this.visitNode(root, this.assemblyState.targetPlan.root);
    }
  }

  readonly visitNode = (
    nodeRef: { readonly productHandle: ProductHandle | null },
    contextPlan: TemplateCompilerTargetContextPlan,
  ): void => {
    const node = nodeRef.productHandle == null
      ? null
      : this.indexes.nodesByProduct.get(nodeRef.productHandle) ?? null;
    if (node instanceof HtmlText) {
      this.assemblyState.recordCompilerReachableNode(node, contextPlan);
      this.visitTextNode(node, contextPlan);
      return;
    }

    if (!(node instanceof HtmlElement)) {
      return;
    }

    if (this.visitLetElement(node, contextPlan)) {
      return;
    }

    this.visitElementNode(node, contextPlan);
  };

  private visitTextNode(
    node: HtmlText,
    contextPlan: TemplateCompilerTargetContextPlan,
  ): void {
    const site = this.indexes.textValueSiteByNode.get(node.productHandle) ?? null;
    const parse = site == null ? null : this.indexes.parseBySite.get(site.productHandle) ?? null;
    if (parse == null || parse.resultKind === ExpressionParseResultKind.InterpolationAbsent) {
      return;
    }
    if (parse.result.kind !== ExpressionParseResultKind.InterpolationSuccess) {
      const seam = this.assemblyState.addOpenSeam(
        `text-target-row:${node.productHandle}`,
        'Text interpolation target rows remain open because the expression parse did not close.',
        node.sourceAddressHandle,
        KernelVocabulary.Compiler.OpenTextExpansion.key,
        [OpenSeamReasonKind.TemplateTextExpansionOpen],
      );
      const instruction = this.assemblyState.createInstruction(
        `text-binding:${node.productHandle}:open`,
        TemplateInstructionKind.TextBinding,
        node.identityHandle,
        node.sourceAddressHandle,
        (productHandle, identityHandle) => new TextBindingInstruction(
          productHandle,
          identityHandle,
          node.toReference(),
          parse.productHandle,
          null,
          node.sourceAddressHandle,
          [],
        ),
      );
      contextPlan.appendRow(
        `text:${node.productHandle}:open`,
        node,
        [instruction],
        TemplateRenderTargetKind.MarkerTarget,
        TemplateCompilerTargetRowPosture.Open,
        1,
        [seam.handle],
      );
      return;
    }
    parse.result.ast.expressions.forEach((expression, expressionChainIndex) => {
      const expressionSource = sourceAddressForRuntimeExpressionSpan(
        this.assemblyState.store,
        `compiled-template:${this.input.localKey}:text:${node.productHandle}:expression:${expressionChainIndex}`,
        parse.sourceAddressHandle,
        expression.span,
        SourceSpanRole.Range,
      );
      this.assemblyState.records.push(...expressionSource.records);
      const instruction = this.assemblyState.createInstruction(
        `text-binding:${node.productHandle}:expression:${expressionChainIndex}`,
        TemplateInstructionKind.TextBinding,
        node.identityHandle,
        expressionSource.handle,
        (productHandle, identityHandle) => new TextBindingInstruction(
          productHandle,
          identityHandle,
          node.toReference(),
          parse.productHandle,
          expressionChainIndex,
          expressionSource.handle,
          [],
        ),
      );
      contextPlan.appendRow(
        `text:${node.productHandle}:expression:${expressionChainIndex}`,
        node,
        [instruction],
        TemplateRenderTargetKind.MarkerTarget,
        TemplateCompilerTargetRowPosture.Complete,
        1,
        [],
        expressionSource.handle,
      );
    });
  }

  private visitLetElement(
    node: HtmlElement,
    contextPlan: TemplateCompilerTargetContextPlan,
  ): boolean {
    if (runtimeElementResourceName(node.tagName, node.namespace) !== 'let') {
      return false;
    }
    this.assemblyState.recordCompilerReachableNode(node, contextPlan);
    const letInstructions = this.letBindingInstructionsForElement(node);
    contextPlan.appendRow(
      `let:${node.productHandle}`,
      node,
      [
        this.assemblyState.createInstruction(
          `hydrate-let:${node.productHandle}`,
          TemplateInstructionKind.HydrateLetElement,
          node.identityHandle,
          node.sourceAddressHandle,
          (productHandle, identityHandle) => new HydrateLetElementInstruction(
            productHandle,
            identityHandle,
            node.toReference(),
            letInstructions.map((instruction) => instruction.productHandle),
            hasHtmlAttribute(this.indexes.ownersByElement.get(node.productHandle) ?? null, 'to-binding-context'),
            node.sourceAddressHandle,
            [],
          ),
        ),
      ],
    );
    return true;
  }

  private visitElementNode(
    node: HtmlElement,
    contextPlan: TemplateCompilerTargetContextPlan,
  ): void {
    const owner = this.indexes.ownersByElement.get(node.productHandle) ?? null;
    const classifications = this.indexes.classificationsByOwner.get(node.productHandle) ?? [];
    const lookupName = htmlElementLookupName(node, owner);
    const elementResolution = this.input.compilerReads.element(lookupName);
    const elementDefinition = elementResolution?.definition instanceof CustomElementDefinition
      ? elementResolution.definition
      : null;
    const elementInstructions: TemplateInstruction[] = [];
    let elementInstruction: HydrateElementInstruction | null = null;
    this.recordAuSlotProjectionIssue(node, lookupName, elementDefinition);
    const parts = this.collectElementInstructionParts(node, classifications, elementDefinition);
    const directOpenSeamHandles = [...new Set([
      ...parts.openDirectInstructionSeamHandles,
      ...parts.openStructuralSeamHandles,
    ])];
    const elementEffectSeamHandles = [...new Set([
      ...directOpenSeamHandles,
      ...parts.openTemplateControllerSeamHandles,
    ])];
    const usageContainerless = hasHtmlAttribute(owner, TemplateSpecialAttributeName.Containerless);
    const effectiveContainerless = elementDefinition != null
      && (elementDefinition.containerless === true || usageContainerless);
    if (elementEffectSeamHandles.length > 0) {
      contextPlan.recordFrontier(
        `element-effects:${node.productHandle}`,
        'Executable compiler effects at this element leave subsequent target order conditional.',
        node.sourceAddressHandle,
        elementEffectSeamHandles,
      );
    }
    this.recordNativeSlotOutlet(node, lookupName, parts);
    const processContentRemovedChildNodes = this.knownProcessContentRemovedChildren(node, elementDefinition);
    const processContentRemovedChildren = processContentRemovedChildNodes.flatMap((child) =>
      child.productHandle == null ? [] : [child.productHandle]
    );
    const projectionGroups = this.elementProjectionChildGroups(node, elementDefinition, parts);
    const compiledProjectionGroups = projectionGroups.filter((group) => group.sequenceChildren.length > 0);
    const extractedProjectionChildren = new Set(
      [
        ...processContentRemovedChildren,
        ...projectionGroups.flatMap((group) =>
          group.extractedChildren.map((child) => child.productHandle).filter((handle): handle is ProductHandle => handle != null)
        ),
      ],
    );

    if (elementDefinition != null) {
      elementInstruction = this.assemblyState.createInstruction(
        `hydrate-element:${node.productHandle}`,
        TemplateInstructionKind.HydrateElement,
        elementDefinition.identityHandle ?? node.identityHandle,
        node.sourceAddressHandle,
        (productHandle, identityHandle, instructionLocal) => new HydrateElementInstruction(
          productHandle,
          identityHandle,
          node.toReference(),
          elementDefinition.name,
          lookupName,
          this.input.compilerReads.resolveResources()
            ? elementResolution?.resource?.toReference() ?? null
            : null,
          compiledProjectionGroups.map((group) => {
            const local = `${instructionLocal}:projection:${localKeyPart(group.slotName)}`;
            const projection = {
              slotName: group.slotName,
              compiledTemplate: new CompiledTemplateReference(
                this.assemblyState.store.handles.product(`${local}:compiled-template`),
                this.assemblyState.store.handles.identity(`${local}:compiled-template`),
              ),
              sourceAddressHandle: group.sourceAddressHandle,
            };
            return new HydrateElementProjectionDefinition(
              projection.slotName,
              projection.compiledTemplate,
              group.contributors,
              projection.sourceAddressHandle,
            );
          }),
          projectionGroups.flatMap((group) => group.discardedContributors),
          this.auSlotProcessContentData(node, elementDefinition, processContentRemovedChildNodes),
          parts.bindableInstructions.map((instruction) => instruction.productHandle),
          parts.capturedSyntaxProductHandles,
          usageContainerless,
          node.sourceAddressHandle,
          [],
        ),
      );
      elementInstructions.push(elementInstruction);
    }

    const directRow = [
      ...elementInstructions,
      ...parts.attributeInstructions,
      ...orderCompilerInstructionsForElement(node, owner, parts.plainInstructions),
    ];
    const directRowPosture = directOpenSeamHandles.length > 0
      ? TemplateCompilerTargetRowPosture.Open
      : TemplateCompilerTargetRowPosture.Complete;
    const templateControllerRowPosture = parts.openTemplateControllerSeamHandles.length > 0
      ? TemplateCompilerTargetRowPosture.Open
      : TemplateCompilerTargetRowPosture.Complete;
    const shouldCompileChildren = elementDefinition == null
      || (!effectiveContainerless && !parts.hasOpenProcessContentHook);

    if (parts.templateControllerInstructions.length > 0) {
      const controllerContexts: TemplateCompilerTargetContextPlan[] = [];
      let childContext = contextPlan;
      for (const instruction of parts.templateControllerInstructions) {
        childContext = this.assemblyState.targetPlan.createTemplateControllerContext(childContext, instruction);
        controllerContexts.push(childContext);
      }
      const innermostContext = controllerContexts.at(-1)!;
      this.assemblyState.recordCompilerReachableNode(node, innermostContext);
      if (elementEffectSeamHandles.length > 0) {
        innermostContext.recordFrontier(
          `element-effects:${node.productHandle}`,
          'Executable compiler effects at the template-controller leaf leave its target rows conditional.',
          node.sourceAddressHandle,
          elementEffectSeamHandles,
        );
      }
      if (elementInstruction != null) {
        this.addProjectionContexts(elementInstruction, compiledProjectionGroups, innermostContext);
      }
      if (directRow.length > 0 || parts.openDirectInstructionSeamHandles.length > 0) {
        innermostContext.appendRow(
          `element:${node.productHandle}`,
          node,
          directRow,
          effectiveContainerless
            ? TemplateRenderTargetKind.RenderLocation
            : TemplateRenderTargetKind.MarkerTarget,
          directRowPosture,
          1,
          directOpenSeamHandles,
        );
      }
      if (!shouldCompileChildren && !parts.hasProcessContentHook && this.hasUnprojectedChildren(node, extractedProjectionChildren)) {
        const seam = this.assemblyState.addOpenSeam(
          `containerless-children:${node.productHandle}`,
          `Custom element '${elementDefinition?.name ?? node.tagName}' is containerless, but residual child content has no compiler-owned projection definition.`,
          node.sourceAddressHandle,
          KernelVocabulary.Compiler.OpenContentProjection.key,
        );
        innermostContext.recordFrontier(
          `containerless-children:${node.productHandle}`,
          seam.summary,
          node.sourceAddressHandle,
          [seam.handle],
        );
      }
      if (shouldCompileChildren) {
        for (const child of node.children) {
          if (this.isExtractedProjectionChild(child, extractedProjectionChildren)) {
            continue;
          }
          this.visitNode(child, innermostContext);
        }
      }
      for (let index = 0; index < parts.templateControllerInstructions.length - 1; index++) {
        controllerContexts[index]!.appendRow(
          `template-controller:${node.productHandle}:child:${index}`,
          node,
          [parts.templateControllerInstructions[index + 1]!],
          TemplateRenderTargetKind.RenderLocation,
          templateControllerRowPosture,
          1,
          parts.openTemplateControllerSeamHandles,
        );
      }
      contextPlan.appendRow(
        `template-controller:${node.productHandle}`,
        node,
        [parts.templateControllerInstructions[0]!],
        TemplateRenderTargetKind.RenderLocation,
        templateControllerRowPosture,
        1,
        parts.openTemplateControllerSeamHandles,
      );
      return;
    }

    this.assemblyState.recordCompilerReachableNode(node, contextPlan);

    if (elementInstruction != null) {
      this.addProjectionContexts(elementInstruction, compiledProjectionGroups, contextPlan);
    }
    if (directRow.length > 0 || parts.openDirectInstructionSeamHandles.length > 0) {
      contextPlan.appendRow(
        `element:${node.productHandle}`,
        node,
        directRow,
        effectiveContainerless
          ? TemplateRenderTargetKind.RenderLocation
          : TemplateRenderTargetKind.MarkerTarget,
        directRowPosture,
        1,
        directOpenSeamHandles,
      );
    }

    if (
      runtimeElementResourceName(node.tagName, node.namespace) === 'template'
      && lookupName === 'template'
      && elementDefinition == null
      && parts.templateControllerInstructions.length === 0
    ) {
      return;
    }

    if (!shouldCompileChildren) {
      if (!parts.hasProcessContentHook && this.hasUnprojectedChildren(node, extractedProjectionChildren)) {
        const seam = this.assemblyState.addOpenSeam(
          `containerless-children:${node.productHandle}`,
          `Custom element '${elementDefinition?.name ?? node.tagName}' is containerless, but residual child content has no compiler-owned projection definition.`,
          node.sourceAddressHandle,
          KernelVocabulary.Compiler.OpenContentProjection.key,
        );
        contextPlan.recordFrontier(
          `containerless-children:${node.productHandle}`,
          seam.summary,
          node.sourceAddressHandle,
          [seam.handle],
        );
      }
      return;
    }

    for (const child of node.children) {
      if (this.isExtractedProjectionChild(child, extractedProjectionChildren)) {
        continue;
      }
      this.visitNode(child, contextPlan);
    }
  }

  private elementProjectionChildGroups(
    node: HtmlElement,
    elementDefinition: CustomElementDefinition | null,
    parts: ElementInstructionParts,
  ): readonly ElementProjectionChildGroup[] {
    if (elementDefinition == null || parts.hasOpenProcessContentHook) {
      return [];
    }
    const isShadowDom = elementDefinition.shadowOptions != null;
    const groups = new Map<string, {
      extractedChildren: HtmlNodeReferenceLike[];
      sequenceChildren: HtmlNodeReferenceLike[];
      contributors: HydrateElementProjectionContributor[];
      discardedContributors: HydrateElementProjectionContributor[];
      sourceAddressHandle: AddressHandle | null;
    }>();
    for (const childReference of node.children) {
      const child = this.nodeForReference(childReference);
      const auSlotAttribute = child instanceof HtmlElement ? this.attributeForElement(child, 'au-slot') : null;
      if (auSlotAttribute != null && this.isRuntimeHtmlAuSlotDefinition(elementDefinition)) {
        continue;
      }
      const shouldExtract = auSlotAttribute != null || !isShadowDom;
      if (!shouldExtract) {
        continue;
      }
      const slotName = auSlotAttribute?.rawValue || 'default';
      const group = groups.get(slotName) ?? {
        extractedChildren: [],
        sequenceChildren: [],
        contributors: [],
        discardedContributors: [],
        sourceAddressHandle: child?.sourceAddressHandle ?? auSlotAttribute?.sourceAddressHandle ?? node.sourceAddressHandle,
      };
      group.extractedChildren.push(childReference);
      const isDiscardedWhitespace = child instanceof HtmlText && child.text.trim() === '';
      const contributor = new HydrateElementProjectionContributor(
        childReference,
        slotName,
        auSlotAttribute?.toReference() ?? null,
        auSlotAttribute?.valueAddressHandle ?? null,
        isDiscardedWhitespace
          ? HydrateElementProjectionContributorDisposition.DiscardedWhitespace
          : child instanceof HtmlElement && this.isUnwrappedProjectionTemplate(child)
            ? HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent
            : HydrateElementProjectionContributorDisposition.RetainedNode,
      );
      if (isDiscardedWhitespace) {
        group.discardedContributors.push(contributor);
      } else {
        group.contributors.push(contributor);
        group.sequenceChildren.push(childReference);
      }
      groups.set(slotName, group);
    }
    return [...groups.entries()].map(([slotName, group]) => new ElementProjectionChildGroup(
      slotName,
      group.extractedChildren,
      group.sequenceChildren,
      group.contributors,
      group.discardedContributors,
      group.sourceAddressHandle,
    ));
  }

  private addProjectionContexts(
    instruction: HydrateElementInstruction,
    projectionGroups: readonly ElementProjectionChildGroup[],
    parentContext: TemplateCompilerTargetContextPlan,
  ): void {
    for (const projection of instruction.projections) {
      const group = projectionGroups.find((candidate) => candidate.slotName === projection.slotName) ?? null;
      if (group == null) {
        continue;
      }
      const projectionContext = this.assemblyState.targetPlan.createProjectionContext(
        parentContext,
        instruction,
        projection,
      );
      for (const child of group.sequenceChildren) {
        const childNode = this.nodeForReference(child);
        if (childNode instanceof HtmlElement && this.isUnwrappedProjectionTemplate(childNode)) {
          for (const grandchild of childNode.children) {
            this.visitNode(grandchild, projectionContext);
          }
        } else {
          this.visitNode(child, projectionContext);
        }
      }
    }
  }

  private auSlotProcessContentData(
    node: HtmlElement,
    elementDefinition: CustomElementDefinition,
    removedChildNodes: readonly HtmlNodeReference[],
  ): AuSlotProcessContentInstructionData | null {
    if (!this.isRuntimeHtmlAuSlotDefinition(elementDefinition)) {
      return null;
    }
    const nameAttribute = this.attributeForElement(node, AuSlotStaticAttributeName.Name);
    return new AuSlotProcessContentInstructionData(
      nameAttribute?.rawValue ?? 'default',
      nameAttribute?.valueAddressHandle ?? null,
      [...removedChildNodes],
    );
  }

  private isUnwrappedProjectionTemplate(node: HtmlElement): boolean {
    if (
      node.namespace !== HtmlNamespaceKind.Html
      || runtimeElementResourceName(node.tagName, node.namespace) !== 'template'
    ) {
      return false;
    }
    const owner = this.indexes.ownersByElement.get(node.productHandle) ?? null;
    return owner?.attributes.every((attribute) =>
      runtimeAttributeName(attribute.rawName, node.namespace) === 'au-slot'
    ) ?? true;
  }

  private knownProcessContentRemovedChildren(
    node: HtmlElement,
    elementDefinition: CustomElementDefinition | null,
  ): readonly HtmlNodeReference[] {
    if (!this.isRuntimeHtmlAuSlotDefinition(elementDefinition)) {
      return [];
    }
    return node.children.flatMap((childReference) => {
      const child = this.nodeForReference(childReference);
      return child instanceof HtmlElement
        && this.attributeForElement(child, 'au-slot') != null
        ? [childReference]
        : [];
    });
  }

  private hasUnprojectedChildren(
    node: HtmlElement,
    extractedProjectionChildren: ReadonlySet<ProductHandle>,
  ): boolean {
    return node.children.some((child) => !this.isExtractedProjectionChild(child, extractedProjectionChildren));
  }

  private isExtractedProjectionChild(
    child: HtmlNodeReferenceLike,
    extractedProjectionChildren: ReadonlySet<ProductHandle>,
  ): boolean {
    return child.productHandle != null && extractedProjectionChildren.has(child.productHandle);
  }

  private nodeForReference(reference: HtmlNodeReferenceLike): HtmlIrNode | null {
    return reference.productHandle == null
      ? null
      : this.indexes.nodesByProduct.get(reference.productHandle) ?? null;
  }

  private collectElementInstructionParts(
    node: HtmlElement,
    classifications: readonly AttributeClassification[],
    elementDefinition: CustomElementDefinition | null,
  ): ElementInstructionParts {
    const parts = this.elementInstructionPartBuckets(node, elementDefinition);
    this.recordProcessContentOpenSeam(node, elementDefinition, parts);
    for (const classification of classifications) {
      this.collectAttributeClassificationInstructionPart(node, classification, parts);
    }
    return parts;
  }

  private recordNativeSlotOutlet(
    node: HtmlElement,
    lookupName: string,
    parts: ElementInstructionParts,
  ): void {
    if (lookupName !== 'slot') {
      return;
    }
    const rootDefinition = this.rootCustomElementDefinition();
    if (rootDefinition?.shadowOptions != null) {
      const nameAttribute = this.attributeForElement(node, 'name');
      const owner = this.indexes.ownersByElement.get(node.productHandle) ?? null;
      const nameSyntax = this.input.attributeSyntax.syntaxes.find((syntax) =>
        syntax.target === 'name'
        && owner?.attributes.some((attribute) => attribute.productHandle === syntax.attribute.productHandle)
      ) ?? null;
      const dynamicNameInstruction = [
        ...parts.attributeInstructions,
        ...parts.plainInstructions,
        ...parts.bindableInstructions,
      ].find((instruction): instruction is PropertyBindingInstruction | InterpolationInstruction =>
        instruction instanceof PropertyBindingInstruction
          ? instruction.targetProperty === 'name'
          : instruction instanceof InterpolationInstruction && instruction.target === 'name'
      ) ?? null;
      const hasDynamicName = dynamicNameInstruction != null
        || (nameSyntax != null && nameSyntax.runtimeRawName !== 'name');
      const dynamicNameAttributeHandle = dynamicNameInstruction?.attribute?.productHandle ?? null;
      const dynamicNameAttribute = dynamicNameAttributeHandle == null
        ? null
        : this.indexes.attributesByProduct.get(dynamicNameAttributeHandle) ?? null;
      this.assemblyState.nativeSlotOutlets.push(new CompiledNativeSlotOutlet(
        node.toReference(),
        hasDynamicName
          ? CompiledNativeSlotNameKind.Dynamic
          : nameAttribute == null
            ? CompiledNativeSlotNameKind.Default
            : CompiledNativeSlotNameKind.Static,
        hasDynamicName ? null : nameAttribute?.rawValue ?? '',
        hasDynamicName
          ? dynamicNameAttribute?.valueAddressHandle ?? dynamicNameInstruction?.sourceAddressHandle ?? nameSyntax?.sourceAddressHandle ?? null
          : nameAttribute?.valueAddressHandle ?? null,
      ));
      return;
    }
    this.assemblyState.addCompilerIssue(
      `slot-without-shadowdom:${node.productHandle}`,
      node.identityHandle,
      TemplateCompilerIssueKind.SlotWithoutShadowDom,
      `Template compilation error: detected a usage of "<slot>" element without specifying shadow DOM options in element: ${rootDefinition?.name ?? '(unknown)'}`,
      TemplateCompilerFrameworkErrorCode.CompilerSlotWithoutShadowDom,
      node.sourceAddressHandle,
    );
  }

  private recordAuSlotProjectionIssue(
    node: HtmlElement,
    lookupName: string,
    elementDefinition: CustomElementDefinition | null,
  ): void {
    if (elementDefinition != null) {
      return;
    }
    for (const projected of this.directAuSlotAttributes(node)) {
      this.assemblyState.addCompilerIssue(
        `au-slot-on-non-element:${projected.productHandle}`,
        projected.identityHandle,
        TemplateCompilerIssueKind.ProjectionOnNonCustomElement,
        `Template compilation error: detected projection with [au-slot="${projected.rawValue}"] attempted on a non custom element ${lookupName}.`,
        TemplateCompilerFrameworkErrorCode.CompilerAuSlotOnNonElement,
        projected.sourceAddressHandle,
      );
    }
  }

  private directAuSlotAttributes(node: HtmlElement): readonly HtmlAttribute[] {
    const attributes: HtmlAttribute[] = [];
    for (const childReference of node.children) {
      const child = childReference.productHandle == null
        ? null
        : this.indexes.nodesByProduct.get(childReference.productHandle) ?? null;
      if (!(child instanceof HtmlElement)) {
        continue;
      }
      const owner = this.indexes.ownersByElement.get(child.productHandle) ?? null;
      const auSlotAttribute = owner?.attributes.find((attribute) =>
        runtimeAttributeName(attribute.rawName, child.namespace) === 'au-slot'
      ) ?? null;
      if (auSlotAttribute != null) {
        attributes.push(auSlotAttribute);
      }
    }
    return attributes;
  }

  private rootCustomElementDefinition(): CustomElementDefinition | null {
    const visible = this.input.compilerReads.templateOwnerResource(
      this.input.definition,
    );
    const definition = this.input.compilerReads.currentDefinition(visible);
    return definition instanceof CustomElementDefinition
      ? definition
      : null;
  }

  private recordRootLocalTemplateIssue(rootTemplate: HtmlElement): void {
    const attribute = this.attributeForElement(rootTemplate, 'as-custom-element');
    if (attribute == null) {
      return;
    }
    const rootName = this.rootCustomElementDefinition()?.name ?? '(unknown)';
    this.assemblyState.addCompilerIssue(
      `root-is-local:${attribute.productHandle}`,
      attribute.identityHandle,
      TemplateCompilerIssueKind.RootTemplateCannotBeLocal,
      `Template compilation error in element "${rootName}": the root <template> cannot be a local element template.`,
      TemplateCompilerFrameworkErrorCode.CompilerRootIsLocal,
      attribute.sourceAddressHandle,
    );
  }

  private recordLocalTemplateIssues(rootReferences: readonly { readonly productHandle: ProductHandle | null }[]): void {
    const rootName = this.rootCustomElementDefinition()?.name ?? '(unknown)';
    const localTemplates = this.localTemplateElements(rootReferences);
    if (localTemplates.length === 0) {
      return;
    }
    if (localTemplates.length === this.directElementCount(rootReferences)) {
      this.assemblyState.addCompilerIssue(
        `only-local-templates:${this.input.compilationUnit.productHandle}`,
        this.input.compilationUnit.identityHandle,
        TemplateCompilerIssueKind.OnlyLocalTemplates,
        `Template compilation error: the custom element "${rootName}" does not have any content other than local template(s).`,
        TemplateCompilerFrameworkErrorCode.CompilerTemplateOnlyLocalTemplate,
        this.input.compilationUnit.sourceAddressHandle,
      );
    }
    const names = new Set<string>();
    for (const template of localTemplates) {
      if (!this.isDirectRootElement(template, rootReferences)) {
        this.assemblyState.addCompilerIssue(
          `local-template-not-under-root:${template.productHandle}`,
          template.identityHandle,
          TemplateCompilerIssueKind.LocalTemplateNotUnderRoot,
          `Template compilation error: local element template needs to be defined directly under root of element "${rootName}".`,
          TemplateCompilerFrameworkErrorCode.CompilerLocalElementNotUnderRoot,
          template.sourceAddressHandle,
        );
      }
      const nameAttribute = this.attributeForElement(template, 'as-custom-element');
      const localName = nameAttribute?.rawValue ?? '';
      if (localName === '') {
        this.assemblyState.addCompilerIssue(
          `local-template-name-empty:${nameAttribute?.productHandle ?? template.productHandle}`,
          nameAttribute?.identityHandle ?? template.identityHandle,
          TemplateCompilerIssueKind.LocalTemplateNameEmpty,
          `Template compilation error: the value of "as-custom-element" attribute cannot be empty for local element in element "${rootName}".`,
          TemplateCompilerFrameworkErrorCode.CompilerLocalNameEmpty,
          nameAttribute?.sourceAddressHandle ?? template.sourceAddressHandle,
        );
        continue;
      }
      if (names.has(localName)) {
        this.assemblyState.addCompilerIssue(
          `local-template-name-duplicate:${nameAttribute?.productHandle ?? template.productHandle}`,
          nameAttribute?.identityHandle ?? template.identityHandle,
          TemplateCompilerIssueKind.LocalTemplateNameDuplicate,
          `Template compilation error: duplicate definition of the local template named "${localName}" in element ${rootName}.`,
          TemplateCompilerFrameworkErrorCode.CompilerDuplicateLocalName,
          nameAttribute?.valueAddressHandle ?? nameAttribute?.sourceAddressHandle ?? template.sourceAddressHandle,
        );
      } else {
        names.add(localName);
      }
      this.recordLocalBindableIssues(template, localName);
    }
  }

  private recordLocalBindableIssues(template: HtmlElement, localName: string): void {
    const bindables = this.bindableElements(template.children);
    const properties = new Set<string>();
    const attributes = new Set<string>();
    for (const bindable of bindables) {
      if (!this.isDirectRootElement(bindable, template.children)) {
        this.assemblyState.addCompilerIssue(
          `local-bindable-not-under-root:${bindable.productHandle}`,
          bindable.identityHandle,
          TemplateCompilerIssueKind.LocalTemplateBindableNotUnderRoot,
          `Template compilation error: bindable properties of local element "${localName}" template needs to be defined directly under <template>.`,
          TemplateCompilerFrameworkErrorCode.CompilerLocalElementBindableNotUnderRoot,
          bindable.sourceAddressHandle,
        );
      }
      const propertyAttribute = this.attributeForElement(bindable, 'name');
      const property = propertyAttribute?.rawValue ?? null;
      if (property == null) {
        this.assemblyState.addCompilerIssue(
          `local-bindable-name-missing:${bindable.productHandle}`,
          bindable.identityHandle,
          TemplateCompilerIssueKind.LocalTemplateBindableNameMissing,
          `Template compilation error: the attribute 'property' is missing in <bindable> in local element "${localName}".`,
          TemplateCompilerFrameworkErrorCode.CompilerLocalElementBindableNameMissing,
          bindable.sourceAddressHandle,
        );
        continue;
      }
      const attributeField = this.attributeForElement(bindable, 'attribute');
      const attribute = attributeField?.rawValue ?? null;
      const duplicateAttribute = attribute != null && attributes.has(attribute);
      const duplicateProperty = properties.has(property);
      if (duplicateAttribute || duplicateProperty) {
        this.assemblyState.addCompilerIssue(
          `local-bindable-duplicate:${bindable.productHandle}`,
          bindable.identityHandle,
          TemplateCompilerIssueKind.LocalTemplateBindableDuplicate,
          `Template compilation error: Bindable property and attribute needs to be unique; found property: ${property}, attribute: ${attribute ?? '(none)'}.`,
          TemplateCompilerFrameworkErrorCode.CompilerLocalElementBindableDuplicate,
          duplicateAttribute
            ? attributeField?.valueAddressHandle ?? attributeField?.sourceAddressHandle ?? bindable.sourceAddressHandle
            : propertyAttribute?.valueAddressHandle ?? propertyAttribute?.sourceAddressHandle ?? bindable.sourceAddressHandle,
        );
      } else {
        if (attribute != null) {
          attributes.add(attribute);
        }
        properties.add(property);
      }
    }
  }

  private localTemplateElements(rootReferences: readonly { readonly productHandle: ProductHandle | null }[]): readonly HtmlElement[] {
    return this.descendantElements(rootReferences).filter((element) =>
      element.tagName.toLowerCase() === 'template'
      && this.attributeForElement(element, 'as-custom-element') != null
    );
  }

  private bindableElements(rootReferences: readonly { readonly productHandle: ProductHandle | null }[]): readonly HtmlElement[] {
    return this.descendantElements(rootReferences).filter((element) => element.tagName.toLowerCase() === 'bindable');
  }

  private descendantElements(rootReferences: readonly { readonly productHandle: ProductHandle | null }[]): readonly HtmlElement[] {
    const result: HtmlElement[] = [];
    const visit = (references: readonly { readonly productHandle: ProductHandle | null }[]): void => {
      for (const reference of references) {
        const node = reference.productHandle == null
          ? null
          : this.indexes.nodesByProduct.get(reference.productHandle) ?? null;
        if (!(node instanceof HtmlElement)) {
          continue;
        }
        result.push(node);
        visit(node.children);
      }
    };
    visit(rootReferences);
    return result;
  }

  private directElementCount(rootReferences: readonly { readonly productHandle: ProductHandle | null }[]): number {
    return rootReferences.filter((reference) => {
      const node = reference.productHandle == null
        ? null
        : this.indexes.nodesByProduct.get(reference.productHandle) ?? null;
      return node instanceof HtmlElement;
    }).length;
  }

  private isDirectRootElement(
    element: HtmlElement,
    rootReferences: readonly { readonly productHandle: ProductHandle | null }[],
  ): boolean {
    return rootReferences.some((reference) => reference.productHandle === element.productHandle);
  }

  private attributeForElement(element: HtmlElement, attributeName: string): HtmlAttribute | null {
    const owner = this.indexes.ownersByElement.get(element.productHandle) ?? null;
    return owner?.attributes.find((attribute) =>
      runtimeAttributeName(attribute.rawName, element.namespace) === attributeName
    ) ?? null;
  }

  private elementInstructionPartBuckets(
    node: HtmlElement,
    elementDefinition: CustomElementDefinition | null,
  ): ElementInstructionPartBuckets {
    const hasProcessContentHook = elementDefinition?.processContent != null;
    return {
      attributeInstructions: [],
      plainInstructions: [],
      templateControllerInstructions: [],
      bindableInstructions: [],
      capturedSyntaxProductHandles: [],
      openDirectInstructionSeamHandles: [],
      openTemplateControllerSeamHandles: [],
      openStructuralSeamHandles: [],
      hasProcessContentHook,
      hasOpenProcessContentHook: hasProcessContentHook && !this.isKnownProcessContent(elementDefinition),
    };
  }

  private recordProcessContentOpenSeam(
    node: HtmlElement,
    elementDefinition: CustomElementDefinition | null,
    parts: ElementInstructionPartBuckets,
  ): void {
    if (!parts.hasOpenProcessContentHook || elementDefinition == null) {
      return;
    }
    const seam = this.assemblyState.addOpenSeam(
      `process-content:${node.productHandle}`,
      `Custom element '${elementDefinition.name}' has a processContent hook; child DOM compilation is held open because the hook may mutate, remove, or decline compilation of the authored content.`,
      node.sourceAddressHandle,
      KernelVocabulary.Compiler.OpenProcessContentHook.key,
    );
    parts.openStructuralSeamHandles.push(seam.handle);
  }

  private collectAttributeClassificationInstructionPart(
    node: HtmlElement,
    classification: AttributeClassification,
    parts: ElementInstructionPartBuckets,
  ): void {
    const syntax = this.indexes.syntaxByProduct.get(classification.syntaxProductHandle) ?? null;
    const attribute = syntax?.attribute.productHandle == null
      ? null
      : this.indexes.attributesByProduct.get(syntax.attribute.productHandle) ?? null;
    const commandBuilt = this.indexes.commandInstructions.get(classification.productHandle) ?? [];
    this.recordOpenCommandInstruction(classification, parts);
    commandBuilt.forEach((instruction) => this.assemblyState.addExistingInstruction(instruction));

    switch (classification.classificationKind) {
      case AttributeClassificationKind.Bindable:
        this.collectBindableInstructionPart(node, classification, syntax, attribute, commandBuilt, parts);
        break;
      case AttributeClassificationKind.Spread:
        this.collectSpreadInstructionPart(node, classification, syntax, attribute, commandBuilt, parts);
        break;
      case AttributeClassificationKind.CustomAttribute:
        this.collectCustomAttributeInstructionPart(node, classification, syntax, attribute, commandBuilt, parts);
        break;
      case AttributeClassificationKind.TemplateController:
        this.collectTemplateControllerInstructionPart(node, classification, syntax, attribute, commandBuilt, parts);
        break;
      case AttributeClassificationKind.Plain:
        this.collectPlainInstructionPart(node, classification, syntax, attribute, commandBuilt, parts);
        break;
      case AttributeClassificationKind.BindingCommand:
      case AttributeClassificationKind.Ref:
        parts.plainInstructions.push(...commandBuilt);
        break;
      case AttributeClassificationKind.Captured:
        if (syntax != null) {
          parts.capturedSyntaxProductHandles.push(syntax.productHandle);
        }
        break;
      case AttributeClassificationKind.CompilerControl:
        break;
      case AttributeClassificationKind.Open:
        parts.openStructuralSeamHandles.push(this.assemblyState.addOpenSeam(
          `open-attribute-classification:${classification.productHandle}`,
          classification.openReason
            ?? 'Attribute classification remained open and may change compiler target or instruction ownership.',
          classification.sourceAddressHandle,
        ).handle);
        break;
    }
  }

  private recordOpenCommandInstruction(
    classification: AttributeClassification,
    parts: ElementInstructionPartBuckets,
  ): void {
    const lowerings = this.indexes.commandLowerings.get(classification.productHandle) ?? [];
    if (!lowerings.some((lowering) => lowering.state === BindingCommandLoweringState.Open)) return;
    const sourceHandles = new Set(lowerings.flatMap((lowering) =>
      lowering.sourceAddressHandle == null ? [] : [lowering.sourceAddressHandle]
    ));
    let seamHandles = this.input.bindingCommandLowering.openSeams
      .filter((seam) =>
        seam.reasonKinds.includes(OpenSeamReasonKind.BindingCommandExecutableBodyOpen)
        && (
          (seam.addressHandle != null && sourceHandles.has(seam.addressHandle))
          || (
            classification.sourceAddressHandle != null
            && seam.addressHandle === classification.sourceAddressHandle
          )
        )
      )
      .map((seam) => seam.handle);
    if (seamHandles.length === 0) {
      seamHandles = [this.assemblyState.addOpenSeam(
        `open-command-row:${classification.productHandle}`,
        'Binding-command target existence is known, but its executable instruction body remains open.',
        classification.sourceAddressHandle,
        KernelVocabulary.Compiler.OpenExecutableBody.key,
        [OpenSeamReasonKind.BindingCommandExecutableBodyOpen],
      ).handle];
    }
    const target = classification.classificationKind === AttributeClassificationKind.TemplateController
      ? parts.openTemplateControllerSeamHandles
      : parts.openDirectInstructionSeamHandles;
    target.push(...seamHandles.filter((handle) => !target.includes(handle)));
  }

  private collectBindableInstructionPart(
    node: HtmlElement,
    classification: AttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
    commandBuilt: readonly TemplateInstruction[],
    parts: ElementInstructionPartBuckets,
  ): void {
    parts.bindableInstructions.push(...commandBuilt);
    if (commandBuilt.length > 0) {
      return;
    }
    const instruction = this.instructionFactory.valueInstructionForClassification(classification, syntax, attribute, node, 'bindable');
    if (instruction != null) {
      parts.bindableInstructions.push(instruction);
    }
  }

  private collectSpreadInstructionPart(
    node: HtmlElement,
    classification: AttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
    commandBuilt: readonly TemplateInstruction[],
    parts: ElementInstructionPartBuckets,
  ): void {
    const spreadTarget = syntax?.target ?? '';
    const targetInstructions = spreadTarget === '...$attrs'
      ? parts.plainInstructions
      : parts.bindableInstructions;
    targetInstructions.push(...commandBuilt);
    if (commandBuilt.length > 0) {
      return;
    }
    const instruction = this.instructionFactory.spreadInstructionForClassification(classification, syntax, attribute, node);
    if (instruction != null) {
      targetInstructions.push(instruction);
    }
  }

  private collectCustomAttributeInstructionPart(
    node: HtmlElement,
    classification: AttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
    commandBuilt: readonly TemplateInstruction[],
    parts: ElementInstructionPartBuckets,
  ): void {
    const props = commandBuilt.length > 0
      ? commandBuilt
      : nullableInstruction(this.instructionFactory.valueInstructionForClassification(classification, syntax, attribute, node, 'custom-attribute'));
    parts.attributeInstructions.push(this.instructionFactory.createHydrateAttributeInstruction(classification, syntax, attribute, node, props));
  }

  private collectTemplateControllerInstructionPart(
    node: HtmlElement,
    classification: AttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
    commandBuilt: readonly TemplateInstruction[],
    parts: ElementInstructionPartBuckets,
  ): void {
    const props = commandBuilt.length > 0
      ? commandBuilt
      : nullableInstruction(this.instructionFactory.valueInstructionForClassification(classification, syntax, attribute, node, 'template-controller'));
    parts.templateControllerInstructions.push(this.instructionFactory.createTemplateControllerInstruction(classification, syntax, attribute, node, props));
  }

  private collectPlainInstructionPart(
    node: HtmlElement,
    classification: AttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
    commandBuilt: readonly TemplateInstruction[],
    parts: ElementInstructionPartBuckets,
  ): void {
    if (commandBuilt.length > 0) {
      parts.plainInstructions.push(...commandBuilt);
      return;
    }
    const instruction = this.instructionFactory.valueInstructionForClassification(classification, syntax, attribute, node, 'plain');
    if (instruction != null) {
      parts.plainInstructions.push(instruction);
    }
  }

  private isKnownProcessContent(
    elementDefinition: CustomElementDefinition | null,
  ): boolean {
    return this.isRuntimeHtmlAuSlotDefinition(elementDefinition);
  }

  private isRuntimeHtmlAuSlotDefinition(
    elementDefinition: CustomElementDefinition | null,
  ): elementDefinition is CustomElementDefinition {
    return elementDefinition?.name === AU_SLOT_RESOURCE_NAME
      && elementDefinition.target.localName === AU_SLOT_TARGET_NAME
      && elementDefinition.processContent?.localName === AU_SLOT_PROCESS_CONTENT_TARGET_NAME;
  }

  private letBindingInstructionsForElement(node: HtmlElement): readonly LetBindingInstruction[] {
    const owner = this.indexes.ownersByElement.get(node.productHandle) ?? null;
    if (owner == null) {
      return [];
    }
    const result: LetBindingInstruction[] = [];
    for (const attribute of owner.attributes) {
      const syntax = this.input.attributeSyntax.syntaxes.find((candidate) =>
        candidate.attribute.productHandle === attribute.productHandle
      ) ?? null;
      if (syntax == null) {
        continue;
      }
      if (syntax.runtimeRawName === 'to-binding-context') {
        continue;
      }
      const classification = this.input.attributeClassification.classifications.find((candidate) =>
        candidate.syntaxProductHandle === syntax.productHandle
      ) ?? null;
      if (classification?.bindingCommand != null && syntax.command !== 'bind') {
        this.assemblyState.addCompilerIssue(
          `let-command:${attribute.productHandle}`,
          syntax.identityHandle,
          TemplateCompilerIssueKind.InvalidLetCommand,
          `Template compilation error: Invalid command ".${syntax.command ?? ''}" for <let>. Use .bind or remove the command`,
          TemplateCompilerFrameworkErrorCode.CompilerInvalidLetCommand,
          syntax.commandSourceAddressHandle ?? syntax.sourceAddressHandle,
        );
        continue;
      }
      const site = classification == null ? null : this.indexes.valueSiteByClassification.get(classification.productHandle) ?? null;
      const commandInstruction = classification == null
        ? null
        : this.indexes.commandInstructions.get(classification.productHandle)?.[0] ?? null;
      const expressionHandle = commandInstruction instanceof PropertyBindingInstruction
        ? commandInstruction.expressionProductHandle
        : site == null ? null : this.indexes.parseBySite.get(site.productHandle)?.productHandle ?? null;
      const literalValue = classification?.bindingCommand == null && site == null
        ? syntax.rawValue
        : null;
      const targetSourceAddressHandle = syntax.targetSourceAddressHandle;
      result.push(this.assemblyState.createInstruction(
        `let-binding:${attribute.productHandle}`,
        TemplateInstructionKind.LetBinding,
        syntax.identityHandle,
        attribute.valueAddressHandle ?? attribute.sourceAddressHandle,
        (productHandle, identityHandle) => new LetBindingInstruction(
          productHandle,
          identityHandle,
          node.toReference(),
          attribute.toReference(),
          normalizeLetBindingTarget(syntax.target),
          expressionHandle,
          literalValue,
          attribute.valueAddressHandle ?? attribute.sourceAddressHandle,
          targetSourceAddressHandle,
          [],
        ),
      ));
    }
    return result;
  }

  private surrogateInstructionsForTemplateElement(node: HtmlElement): readonly TemplateInstruction[] {
    const classifications = this.indexes.classificationsByOwner.get(node.productHandle) ?? [];
    const result: TemplateInstruction[] = [];
    for (const classification of classifications) {
      const syntax = this.indexes.syntaxByProduct.get(classification.syntaxProductHandle) ?? null;
      const attribute = syntax?.attribute.productHandle == null
        ? null
        : this.indexes.attributesByProduct.get(syntax.attribute.productHandle) ?? null;
      const commandBuilt = this.indexes.commandInstructions.get(classification.productHandle) ?? [];
      if (commandBuilt.length > 0) {
        commandBuilt.forEach((instruction) => this.assemblyState.addExistingInstruction(instruction));
      }
      if (syntax != null && isInvalidSurrogateAttributeTarget(syntax.target)) {
        this.assemblyState.addCompilerIssue(
          `surrogate-invalid-attribute:${classification.productHandle}`,
          syntax.identityHandle,
          TemplateCompilerIssueKind.InvalidSurrogateAttribute,
          `Template compilation error: attribute "${syntax.target}" is invalid on element surrogate.`,
          TemplateCompilerFrameworkErrorCode.CompilerInvalidSurrogateAttribute,
          classification.sourceAddressHandle,
        );
        continue;
      }
      switch (classification.classificationKind) {
        case AttributeClassificationKind.CustomAttribute: {
          const props = commandBuilt.length > 0
            ? commandBuilt
            : nullableInstruction(this.instructionFactory.valueInstructionForClassification(
              classification,
              syntax,
              attribute,
              node,
              'custom-attribute',
            ));
          result.push(this.instructionFactory.createHydrateAttributeInstruction(classification, syntax, attribute, node, props));
          break;
        }
        case AttributeClassificationKind.Plain: {
          if (commandBuilt.length > 0) {
            result.push(...commandBuilt);
          } else {
            const instruction = this.instructionFactory.valueInstructionForClassification(
              classification,
              syntax,
              attribute,
              node,
              'plain',
              true,
            );
            if (instruction != null) {
              result.push(instruction);
            }
          }
          break;
        }
        case AttributeClassificationKind.BindingCommand:
        case AttributeClassificationKind.Ref:
          result.push(...commandBuilt);
          break;
        case AttributeClassificationKind.TemplateController:
          this.assemblyState.addCompilerIssue(
            `surrogate-template-controller:${classification.productHandle}`,
            classification.identityHandle,
            TemplateCompilerIssueKind.TemplateControllerOnSurrogate,
            `Template compilation error: template controller "${syntax?.target ?? classification.resource?.name ?? '(unknown)'}" is invalid on element surrogate.`,
            TemplateCompilerFrameworkErrorCode.CompilerNoTemplateControllerOnSurrogate,
            syntax?.targetSourceAddressHandle ?? classification.sourceAddressHandle,
          );
          break;
        case AttributeClassificationKind.Bindable:
        case AttributeClassificationKind.Spread:
        case AttributeClassificationKind.Captured:
        case AttributeClassificationKind.CompilerControl:
        case AttributeClassificationKind.Open:
          this.assemblyState.addOpenSeam(
            `surrogate-attribute:${classification.productHandle}`,
            `Root template surrogate attribute classification '${classification.classificationKind}' is not lowered into host instructions yet.`,
            classification.sourceAddressHandle,
          );
          break;
      }
    }
    return result;
  }
}

/** Assembles compiler rows and render targets at the handoff before runtime Rendering can run. */
export class CompiledTemplateMaterializer {
  constructor(
    /** Hot analysis store that receives compiled-template products. */
    readonly store: KernelPublicationContext,
  ) {}

  materialize(input: CompiledTemplateMaterializationRequest): CompiledTemplateEmission {
    const emission = this.recordsForCompiledTemplate(input);
    const createdInstructionHandles = new Set(emission.createdInstructions.map((instruction) => instruction.productHandle));
    const borrowedInstructions = emission.instructions.filter((instruction) =>
      !createdInstructionHandles.has(instruction.productHandle)
    );
    this.store.publish(new KernelPublicationPlan(
      new KernelStoreBatch(emission.records, `compiled-template:${input.localKey}`),
      [
        ...publishProductDetails(
          TemplateProductDetails.CompiledTemplate,
          emission.compiledTemplates,
          KernelDetailAdmission.Required,
        ),
        ...publishProductDetails(TemplateProductDetails.InstructionSequence, emission.instructionSequences),
        ...publishProductDetails(TemplateProductDetails.RenderTarget, emission.readAllRenderTargets()),
        ...publishProductDetails(
          TemplateProductDetails.Instruction,
          emission.createdInstructions,
          KernelDetailAdmission.Required,
        ),
        ...publishProductDetails(
          TemplateProductDetails.Instruction,
          borrowedInstructions,
          KernelDetailAdmission.IfAbsent,
        ),
        ...publishProductDetails(
          TemplateProductDetails.CompilerIssue,
          emission.issues,
          KernelDetailAdmission.IfAbsent,
        ),
      ],
    ));
    return emission;
  }

  private recordsForCompiledTemplate(input: CompiledTemplateMaterializationRequest): CompiledTemplateEmission {
    const source = this.recordsForSource(input);
    const handles = this.compiledTemplateHandles(input);
    const assembly = this.assembleInstructions(input, source, handles);
    const sequencePublications = this.publishCompiledTemplateSequences(
      input,
      handles,
      assembly,
      source,
    );
    const openSeams = assembly.openSeams;
    const compiledTemplates = this.createCompiledTemplates(
      input,
      handles,
      assembly,
      sequencePublications,
    );
    const compiledTemplate = compiledTemplates.find((template) =>
      template.productHandle === handles.productHandle
    );
    if (compiledTemplate == null) {
      throw new Error(`Compiled-template family '${input.localKey}' did not publish its root definition.`);
    }
    const claims = [
      this.compileClaimForTemplate(input, handles, source),
      ...this.childCompiledTemplateClaims(handles, assembly.targetPlan, source),
      ...sequencePublications.claims,
    ];
    const records: KernelStoreRecord[] = [...source.records];
    records.push(...assembly.records);
    records.push(...sequencePublications.records);
    records.push(...this.recordsForCompiledTemplatePublication(
      input,
      handles,
      compiledTemplates,
      assembly.targetPlan,
      sequencePublications,
      assembly.createdInstructions,
      assembly.issues,
      claims,
      openSeams,
      source,
    ));

    return new CompiledTemplateEmission(
      compiledTemplate,
      compiledTemplates,
      assembly.instructions,
      assembly.createdInstructions,
      sequencePublications.instructionSequences,
      assembly.targetPlan,
      assembly.issues,
      openSeams,
      records,
    );
  }

  private compiledTemplateHandles(
    input: CompiledTemplateMaterializationRequest,
  ): CompiledTemplateHandles {
    const local = `compiled-template:${input.localKey}`;
    return new CompiledTemplateHandles(
      local,
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }

  private publishCompiledTemplateSequences(
    input: CompiledTemplateMaterializationRequest,
    handles: CompiledTemplateHandles,
    assembly: CompiledTemplateAssembly,
    source: CompiledTemplateSourceSet,
  ): CompiledTemplateSequencePublications {
    const records: KernelStoreRecord[] = [];
    const claims: SemanticClaim[] = [];
    const renderTargetsByCompiledTemplate = new Map<ProductHandle, TemplateRenderTarget[]>();
    const instructionSequences: TemplateInstructionSequence[] = [];
    let surrogateSequence: TemplateInstructionSequence | null = null;

    for (const context of assembly.targetPlan.readContexts()) {
      const contextHandles = this.compiledTemplateHandlesForContext(handles, context);
      const renderTargets: TemplateRenderTarget[] = [];
      context.readRows().forEach((row, index) => {
        const publication = this.publishRenderTargetRow(
          contextHandles.local,
          contextHandles.productHandle,
          contextHandles.identityHandle,
          row,
          index,
          source,
        );
        claims.push(...publication.claims);
        records.push(...publication.records);
        instructionSequences.push(publication.sequence);
        renderTargets.push(publication.target);
      });
      renderTargetsByCompiledTemplate.set(contextHandles.productHandle, renderTargets);
    }

    if (assembly.surrogateInstructions.length > 0) {
      const publication = this.publishSurrogateSequence(
        handles.local,
        handles.productHandle,
        handles.identityHandle,
        assembly.surrogateInstructions,
        input.compilationUnit.sourceAddressHandle,
        source,
      );
      surrogateSequence = publication.sequence;
      claims.push(...publication.claims);
      records.push(...publication.records);
      instructionSequences.push(surrogateSequence);
    }

    return new CompiledTemplateSequencePublications(
      instructionSequences,
      renderTargetsByCompiledTemplate,
      surrogateSequence,
      records,
      claims,
    );
  }

  private compiledTemplateHandlesForContext(
    rootHandles: CompiledTemplateHandles,
    context: TemplateCompilerTargetContextPlan,
  ): CompiledTemplateHandles {
    return context.compiledTemplate.productHandle === rootHandles.productHandle
      ? rootHandles
      : new CompiledTemplateHandles(
          `${rootHandles.local}:generated:${context.role}:${context.owner.productHandle}:${context.slotName ?? 'default'}`,
          context.compiledTemplate.productHandle,
          context.compiledTemplate.identityHandle,
        );
  }

  private compileClaimForTemplate(
    input: CompiledTemplateMaterializationRequest,
    handles: CompiledTemplateHandles,
    source: CompiledTemplateSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${handles.local}:compiles-to-compiled-template`),
      input.html.document.productHandle,
      KernelVocabulary.Template.CompilesToCompiledTemplate.key,
      handles.productHandle,
      source.provenanceHandle,
    );
  }

  private childCompiledTemplateClaims(
    rootHandles: CompiledTemplateHandles,
    targetPlan: TemplateCompilerTargetPlan,
    source: CompiledTemplateSourceSet,
  ): readonly SemanticClaim[] {
    return targetPlan.readContexts().flatMap((context) => {
      if (context.ownerContext == null) return [];
      const parentCompiledTemplateProductHandle = context.ownerContext.compiledTemplate.productHandle;
      const childCompiledTemplateProductHandle = context.compiledTemplate.productHandle;
      const local = `${this.compiledTemplateHandlesForContext(rootHandles, context).local}:ownership`;
      return [
        new SemanticClaim(
          this.store.handles.claim(`${local}:parent-contains-child`),
          parentCompiledTemplateProductHandle,
          KernelVocabulary.Template.ContainsChildCompiledTemplate.key,
          childCompiledTemplateProductHandle,
          source.provenanceHandle,
        ),
        new SemanticClaim(
          this.store.handles.claim(`${local}:instruction-owns-child`),
          context.owner.productHandle,
          KernelVocabulary.Instruction.InstructionOwnsChildCompiledTemplate.key,
          childCompiledTemplateProductHandle,
          source.provenanceHandle,
        ),
      ];
    });
  }

  private createCompiledTemplates(
    input: CompiledTemplateMaterializationRequest,
    rootHandles: CompiledTemplateHandles,
    assembly: CompiledTemplateAssembly,
    sequences: CompiledTemplateSequencePublications,
  ): readonly CompiledTemplate[] {
    const rootState = compiledTemplateStateFor(
      assembly.issues,
      assembly.openSeams,
      assembly.targetPlan.root.readRows(),
    );
    return assembly.targetPlan.readContexts().map((context) => {
      const handles = this.compiledTemplateHandlesForContext(rootHandles, context);
      const state = context === assembly.targetPlan.root
        ? rootState
        : compiledTemplateStateForContext(assembly.issues, context);
      return new CompiledTemplate(
        handles.productHandle,
        handles.identityHandle,
        compiledTemplateContextForTargetContext(context),
        input.html.document.productHandle,
        state,
        context.readCompilerReachableNodeProductHandles(),
        context === assembly.targetPlan.root ? assembly.nativeSlotOutlets : [],
        state === CompiledTemplateState.Complete ? false : null,
        sequences.renderTargetsFor(handles.productHandle),
        context === assembly.targetPlan.root ? sequences.surrogateSequence : null,
        context.sourceAddressHandle ?? input.compilationUnit.sourceAddressHandle,
        [],
      );
    });
  }

  private recordsForCompiledTemplatePublication(
    input: CompiledTemplateMaterializationRequest,
    handles: CompiledTemplateHandles,
    compiledTemplates: readonly CompiledTemplate[],
    targetPlan: TemplateCompilerTargetPlan,
    sequences: CompiledTemplateSequencePublications,
    createdInstructions: readonly TemplateInstruction[],
    issues: readonly TemplateCompilerIssue[],
    claims: readonly SemanticClaim[],
    openSeams: readonly OpenSeam[],
    source: CompiledTemplateSourceSet,
  ): readonly KernelStoreRecord[] {
    const targetContextsByCompiledTemplate = new Map(targetPlan.readContexts().map((context) => [
      context.compiledTemplate.productHandle,
      context,
    ]));
    return [
      ...compiledTemplates.flatMap((compiledTemplate) => [
        this.compiledTemplateIdentity(input, targetContextsByCompiledTemplate, compiledTemplate),
        this.compiledTemplateProduct(compiledTemplate, source),
      ]),
      ...this.createdInstructionProducts(createdInstructions, source),
      ...claims,
      this.compiledTemplateMaterialization(
        handles,
        compiledTemplates,
        sequences,
        createdInstructions,
        issues,
        claims,
        openSeams,
      ),
    ];
  }

  private compiledTemplateIdentity(
    input: CompiledTemplateMaterializationRequest,
    targetContextsByCompiledTemplate: ReadonlyMap<ProductHandle, TemplateCompilerTargetContextPlan>,
    compiledTemplate: CompiledTemplate,
  ): CompilerIdentity {
    const targetContext = targetContextsByCompiledTemplate.get(compiledTemplate.productHandle);
    if (targetContext == null) {
      throw new Error(`Compiled template '${compiledTemplate.productHandle}' has no target-plan context.`);
    }
    const parentIdentityHandle = targetContext.ownerContext == null
      ? input.compilationUnit.identityHandle
      : targetContext.owner.identityHandle;
    return new CompilerIdentity(
      compiledTemplate.identityHandle,
      KernelVocabulary.Template.CompiledTemplate.key,
      parentIdentityHandle,
      compiledTemplate.sourceAddressHandle,
      `${compiledTemplate.context.role}:${compiledTemplate.state}`,
    );
  }

  private compiledTemplateProduct(
    compiledTemplate: CompiledTemplate,
    source: CompiledTemplateSourceSet,
  ): MaterializedProduct {
    return new MaterializedProduct(
      compiledTemplate.productHandle,
      KernelVocabulary.Template.CompiledTemplate.key,
      compiledTemplate.identityHandle,
      compiledTemplate.sourceAddressHandle,
      source.provenanceHandle,
    );
  }

  private createdInstructionProducts(
    createdInstructions: readonly TemplateInstruction[],
    source: CompiledTemplateSourceSet,
  ): readonly MaterializedProduct[] {
    return createdInstructions.map((instruction) => new MaterializedProduct(
      instruction.productHandle,
      KernelVocabulary.Instruction.Instruction.key,
      instruction.identityHandle,
      instruction.sourceAddressHandle,
      source.provenanceHandle,
    ));
  }

  private compiledTemplateMaterialization(
    handles: CompiledTemplateHandles,
    compiledTemplates: readonly CompiledTemplate[],
    sequences: CompiledTemplateSequencePublications,
    createdInstructions: readonly TemplateInstruction[],
    issues: readonly TemplateCompilerIssue[],
    claims: readonly SemanticClaim[],
    openSeams: readonly OpenSeam[],
  ): MaterializationRecord {
    return new MaterializationRecord(
      this.store.handles.materialization(handles.local),
      handles.identityHandle,
      compiledTemplatePublicationProductHandles(
        compiledTemplates,
        sequences,
        createdInstructions,
        issues,
      ),
      claims.map((claim) => claim.handle),
      openSeams.map((seam) => seam.handle),
    );
  }

  private publishRenderTargetRow(
    compiledLocal: string,
    compiledProductHandle: ProductHandle,
    compiledIdentityHandle: IdentityHandle,
    row: TemplateCompilerTargetRowPlan,
    index: number,
    source: CompiledTemplateSourceSet,
  ): RenderTargetPublication {
    const handles = this.renderTargetPublicationHandles(compiledLocal, row, index);
    const sequence = this.instructionSequenceForRenderTarget(handles, row);
    const target = this.renderTargetForRow(handles, row);
    return new RenderTargetPublication(
      target,
      sequence,
      this.recordsForRenderTargetPublication(
        compiledIdentityHandle,
        handles,
        target,
        sequence,
        index,
        source,
      ),
      this.claimsForRenderTargetPublication(
        compiledProductHandle,
        handles,
        target,
        sequence,
        row,
        source,
      ),
    );
  }

  private renderTargetPublicationHandles(
    compiledLocal: string,
    row: TemplateCompilerTargetRowPlan,
    index: number,
  ): RenderTargetPublicationHandles {
    const targetLocal = `${compiledLocal}:target:${index}:${row.publicationLocalKey}`;
    const sequenceLocal = `${targetLocal}:instructions`;
    return new RenderTargetPublicationHandles(
      targetLocal,
      sequenceLocal,
      this.store.handles.product(targetLocal),
      this.store.handles.identity(targetLocal),
      this.store.handles.product(sequenceLocal),
      this.store.handles.identity(sequenceLocal),
    );
  }

  private instructionSequenceForRenderTarget(
    handles: RenderTargetPublicationHandles,
    row: TemplateCompilerTargetRowPlan,
  ): TemplateInstructionSequence {
    return new TemplateInstructionSequence(
      handles.sequenceProductHandle,
      handles.sequenceIdentityHandle,
      handles.targetProductHandle,
      instructionReferencesFor(row.instructions),
      row.sourceAddressHandle,
    );
  }

  private renderTargetForRow(
    handles: RenderTargetPublicationHandles,
    row: TemplateCompilerTargetRowPlan,
  ): TemplateRenderTarget {
    return new TemplateRenderTarget(
      handles.targetProductHandle,
      handles.targetIdentityHandle,
      row.targetKind,
      row.node.toReference(),
      handles.sequenceProductHandle,
      row.sourceAddressHandle,
      [],
    );
  }

  private claimsForRenderTargetPublication(
    compiledProductHandle: ProductHandle,
    handles: RenderTargetPublicationHandles,
    target: TemplateRenderTarget,
    sequence: TemplateInstructionSequence,
    row: TemplateCompilerTargetRowPlan,
    source: CompiledTemplateSourceSet,
  ): readonly SemanticClaim[] {
    return [
      this.compiledTemplateContainsRenderTargetClaim(compiledProductHandle, handles, target, source),
      this.renderTargetForHtmlNodeClaim(handles, target, row, source),
      this.renderTargetUsesInstructionSequenceClaim(handles, target, sequence, source),
      ...sequenceContainsInstructionClaims(this.store, handles.sequenceLocal, sequence.productHandle, row.instructions, source.provenanceHandle),
    ];
  }

  private compiledTemplateContainsRenderTargetClaim(
    compiledProductHandle: ProductHandle,
    handles: RenderTargetPublicationHandles,
    target: TemplateRenderTarget,
    source: CompiledTemplateSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${handles.targetLocal}:compiled-template-contains-target`),
      compiledProductHandle,
      KernelVocabulary.Template.ContainsRenderTarget.key,
      target.productHandle,
      source.provenanceHandle,
    );
  }

  private renderTargetForHtmlNodeClaim(
    handles: RenderTargetPublicationHandles,
    target: TemplateRenderTarget,
    row: TemplateCompilerTargetRowPlan,
    source: CompiledTemplateSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${handles.targetLocal}:target-for-html-node`),
      target.productHandle,
      KernelVocabulary.Template.RenderTargetForHtmlNode.key,
      row.node.productHandle,
      source.provenanceHandle,
    );
  }

  private renderTargetUsesInstructionSequenceClaim(
    handles: RenderTargetPublicationHandles,
    target: TemplateRenderTarget,
    sequence: TemplateInstructionSequence,
    source: CompiledTemplateSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${handles.targetLocal}:target-uses-instruction-sequence`),
      target.productHandle,
      KernelVocabulary.Template.RenderTargetUsesInstructionSequence.key,
      sequence.productHandle,
      source.provenanceHandle,
    );
  }

  private recordsForRenderTargetPublication(
    compiledIdentityHandle: IdentityHandle,
    handles: RenderTargetPublicationHandles,
    target: TemplateRenderTarget,
    sequence: TemplateInstructionSequence,
    index: number,
    source: CompiledTemplateSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        target.identityHandle,
        KernelVocabulary.Template.RenderTarget.key,
        compiledIdentityHandle,
        target.sourceAddressHandle,
        target.targetKind,
      ),
      new MaterializedProduct(
        target.productHandle,
        KernelVocabulary.Template.RenderTarget.key,
        target.identityHandle,
        target.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new CompilerIdentity(
        sequence.identityHandle,
        KernelVocabulary.Instruction.Sequence.key,
        target.identityHandle,
        sequence.sourceAddressHandle,
        `${target.targetKind}:${index}`,
      ),
      new MaterializedProduct(
        sequence.productHandle,
        KernelVocabulary.Instruction.Sequence.key,
        handles.sequenceIdentityHandle,
        sequence.sourceAddressHandle,
        source.provenanceHandle,
      ),
    ];
  }

  private publishSurrogateSequence(
    compiledLocal: string,
    compiledProductHandle: ProductHandle,
    compiledIdentityHandle: IdentityHandle,
    instructions: readonly TemplateInstruction[],
    fallbackSourceAddressHandle: AddressHandle | null,
    source: CompiledTemplateSourceSet,
  ): InstructionSequencePublication {
    const handles = this.surrogateSequenceHandles(compiledLocal);
    const sequence = this.surrogateSequenceFor(compiledProductHandle, instructions, fallbackSourceAddressHandle, handles);
    return new InstructionSequencePublication(
      sequence,
      this.recordsForSurrogateSequence(compiledIdentityHandle, sequence, source),
      this.claimsForSurrogateSequence(compiledProductHandle, sequence, instructions, handles.sequenceLocal, source),
    );
  }

  private surrogateSequenceHandles(compiledLocal: string): SurrogateSequencePublicationHandles {
    const sequenceLocal = `${compiledLocal}:surrogate-sequence`;
    return new SurrogateSequencePublicationHandles(
      sequenceLocal,
      this.store.handles.product(sequenceLocal),
      this.store.handles.identity(sequenceLocal),
    );
  }

  private surrogateSequenceFor(
    compiledProductHandle: ProductHandle,
    instructions: readonly TemplateInstruction[],
    fallbackSourceAddressHandle: AddressHandle | null,
    handles: SurrogateSequencePublicationHandles,
  ): TemplateInstructionSequence {
    return new TemplateInstructionSequence(
      handles.sequenceProductHandle,
      handles.sequenceIdentityHandle,
      compiledProductHandle,
      instructionReferencesFor(instructions),
      instructions[0]?.sourceAddressHandle ?? fallbackSourceAddressHandle,
    );
  }

  private claimsForSurrogateSequence(
    compiledProductHandle: ProductHandle,
    sequence: TemplateInstructionSequence,
    instructions: readonly TemplateInstruction[],
    sequenceLocal: string,
    source: CompiledTemplateSourceSet,
  ): readonly SemanticClaim[] {
    return [
      new SemanticClaim(
        this.store.handles.claim(`${sequenceLocal}:compiled-template-uses-surrogate-instruction-sequence`),
        compiledProductHandle,
        KernelVocabulary.Template.CompiledTemplateUsesSurrogateInstructionSequence.key,
        sequence.productHandle,
        source.provenanceHandle,
      ),
      ...sequenceContainsInstructionClaims(
        this.store,
        sequenceLocal,
        sequence.productHandle,
        instructions,
        source.provenanceHandle,
      ),
    ];
  }

  private recordsForSurrogateSequence(
    compiledIdentityHandle: IdentityHandle,
    sequence: TemplateInstructionSequence,
    source: CompiledTemplateSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        sequence.identityHandle,
        KernelVocabulary.Instruction.Sequence.key,
        compiledIdentityHandle,
        sequence.sourceAddressHandle,
        'surrogate',
      ),
      new MaterializedProduct(
        sequence.productHandle,
        KernelVocabulary.Instruction.Sequence.key,
        sequence.identityHandle,
        sequence.sourceAddressHandle,
        source.provenanceHandle,
      ),
    ];
  }

  private assembleInstructions(
    input: CompiledTemplateMaterializationRequest,
    source: CompiledTemplateSourceSet,
    rootHandles: CompiledTemplateHandles,
  ): CompiledTemplateAssembly {
    const assemblyState = new CompiledTemplateAssemblyState(
      this.store,
      input,
      source,
      rootHandles.toReference(),
    );
    const indexes = new CompiledTemplateAssemblyIndexes(input);
    const instructionFactory = new CompiledTemplateInstructionFactory(
      input,
      assemblyState,
      indexes,
    );
    new CompiledTemplateInstructionTraversal(
      input,
      assemblyState,
      instructionFactory,
      indexes,
    ).run();
    return assemblyState.toAssembly();
  }

  private recordsForSource(input: CompiledTemplateMaterializationRequest): CompiledTemplateSourceSet {
    const evidenceHandle = this.store.handles.evidence(`compiled-template:${input.localKey}`);
    const provenanceHandle = this.store.handles.provenance(`compiled-template:${input.localKey}`);
    return new CompiledTemplateSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.Scope],
          'Compiled-template assembly consumed authored HTML, value sites, and lowered binding-command instructions.',
          input.compilationUnit.sourceAddressHandle,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          [evidenceHandle],
        ),
      ],
      evidenceHandle,
      provenanceHandle,
    );
  }

}

function classificationsByOwnerProduct(
  classifications: readonly AttributeClassification[],
): ReadonlyMap<ProductHandle, readonly AttributeClassification[]> {
  const result = new Map<ProductHandle, AttributeClassification[]>();
  for (const classification of classifications) {
    const owner = classification.ownerNode.productHandle;
    if (owner == null) {
      continue;
    }
    let bucket = result.get(owner);
    if (bucket === undefined) {
      bucket = [];
      result.set(owner, bucket);
    }
    bucket.push(classification);
  }
  return result;
}

function commandInstructionsByClassification(
  input: CompiledTemplateMaterializationRequest,
): ReadonlyMap<ProductHandle, readonly TemplateInstruction[]> {
  const buildInputByProduct = new Map(input.bindingCommandLowering.buildInputs.map((buildInput) => [buildInput.productHandle, buildInput]));
  const instructionByProduct = new Map(input.bindingCommandLowering.instructions.map((instruction) => [instruction.productHandle, instruction]));
  const classificationBySyntax = new Map(input.attributeClassification.classifications.map((classification) => [classification.syntaxProductHandle, classification]));
  const siteByProduct = new Map([
    ...input.valueSites.sites,
    ...input.bindingCommandLowering.valueSites,
  ].map((site) => [site.productHandle, site]));
  const result = new Map<ProductHandle, TemplateInstruction[]>();
  for (const lowering of input.bindingCommandLowering.lowerings) {
    const buildInput = buildInputByProduct.get(lowering.inputProductHandle) ?? null;
    if (buildInput?.syntaxProductHandle == null) {
      continue;
    }
    const classification = classificationBySyntax.get(buildInput.syntaxProductHandle) ?? null;
    if (classification == null) {
      continue;
    }
    const instructions = lowering.instructionProductHandles
      .map((handle) => instructionByProduct.get(handle) ?? null)
      .filter((instruction): instruction is TemplateInstruction => instruction != null);
    if (instructions.length === 0) {
      continue;
    }
    let bucket = result.get(classification.productHandle);
    if (bucket === undefined) {
      bucket = [];
      result.set(classification.productHandle, bucket);
    }
    bucket.push(...instructions);
  }
  for (const lowering of input.bindingCommandLowering.multiBindingLowerings) {
    const site = siteByProduct.get(lowering.site.productHandle) ?? null;
    const classificationProductHandle = site?.classification?.productHandle ?? null;
    if (classificationProductHandle == null) {
      continue;
    }
    const instructions = lowering.instructionProductHandles
      .map((handle) => instructionByProduct.get(handle) ?? null)
      .filter((instruction): instruction is TemplateInstruction => instruction != null);
    if (instructions.length === 0) {
      continue;
    }
    let bucket = result.get(classificationProductHandle);
    if (bucket === undefined) {
      bucket = [];
      result.set(classificationProductHandle, bucket);
    }
    bucket.push(...instructions);
  }
  return result;
}

function commandLoweringsByClassification(
  input: CompiledTemplateMaterializationRequest,
): ReadonlyMap<ProductHandle, readonly BindingCommandLowering[]> {
  const buildInputByProduct = new Map(input.bindingCommandLowering.buildInputs.map((buildInput) =>
    [buildInput.productHandle, buildInput]
  ));
  const classificationBySyntax = new Map(input.attributeClassification.classifications.map((classification) =>
    [classification.syntaxProductHandle, classification]
  ));
  const result = new Map<ProductHandle, BindingCommandLowering[]>();
  for (const lowering of input.bindingCommandLowering.lowerings) {
    const buildInput = buildInputByProduct.get(lowering.inputProductHandle) ?? null;
    const classification = buildInput?.syntaxProductHandle == null
      ? null
      : classificationBySyntax.get(buildInput.syntaxProductHandle) ?? null;
    if (classification == null) continue;
    const bucket = result.get(classification.productHandle) ?? [];
    bucket.push(lowering);
    result.set(classification.productHandle, bucket);
  }
  return result;
}

function expressionParsesBySite(
  input: CompiledTemplateMaterializationRequest,
): ReadonlyMap<ProductHandle, TemplateExpressionParse> {
  return new Map([
    ...input.valueSites.parses,
    ...input.bindingCommandLowering.expressionParses,
  ].map((parse) => [parse.site.productHandle, parse]));
}

function valueSitesByClassification(
  input: CompiledTemplateMaterializationRequest,
): ReadonlyMap<ProductHandle, TemplateValueSite> {
  const result = new Map<ProductHandle, TemplateValueSite>();
  for (const site of [
    ...input.valueSites.sites,
    ...input.bindingCommandLowering.valueSites,
  ]) {
    if (site.classification?.productHandle != null) {
      result.set(site.classification.productHandle, site);
    }
  }
  return result;
}

function textValueSitesByNode(
  sites: readonly TemplateValueSite[],
): ReadonlyMap<ProductHandle, TemplateValueSite> {
  const result = new Map<ProductHandle, TemplateValueSite>();
  for (const site of sites) {
    if (site.siteKind === TemplateValueSiteKind.TextInterpolation && site.node.productHandle != null) {
      result.set(site.node.productHandle, site);
    }
  }
  return result;
}

function ownerElementsByProduct(
  html: HtmlParseEmission,
): ReadonlyMap<ProductHandle, HtmlElementAttributeOwner> {
  return htmlElementAttributeOwnersByElementProduct(html.nodes, html.attributes);
}

function isInvalidSurrogateAttributeTarget(target: string): boolean {
  switch (target.toLowerCase()) {
    case 'id':
    case 'name':
    case 'au-slot':
    case 'as-element':
      return true;
    default:
      return false;
  }
}

function nullableInstruction(
  instruction: TemplateInstruction | null,
): readonly TemplateInstruction[] {
  return instruction == null ? [] : [instruction];
}

function compiledTemplateStateFor(
  issues: readonly TemplateCompilerIssue[],
  openSeams: readonly OpenSeam[],
  targetRows: readonly TemplateCompilerTargetRowPlan[],
): CompiledTemplateState {
  if (issues.length > 0) {
    return CompiledTemplateState.Invalid;
  }
  if (openSeams.length === 0) {
    return CompiledTemplateState.Complete;
  }
  return targetRows.length === 0
    ? CompiledTemplateState.Open
    : CompiledTemplateState.Partial;
}

function compiledTemplateStateForContext(
  issues: readonly TemplateCompilerIssue[],
  context: TemplateCompilerTargetContextPlan,
): CompiledTemplateState {
  if (issues.length > 0) return CompiledTemplateState.Invalid;
  if (context.state === TemplateCompilerTargetContextState.Complete) {
    return CompiledTemplateState.Complete;
  }
  return context.readRows().length === 0
    ? CompiledTemplateState.Open
    : CompiledTemplateState.Partial;
}

function compiledTemplateContextForTargetContext(
  context: TemplateCompilerTargetContextPlan,
): CompiledTemplateContext {
  return new CompiledTemplateContext(
    compiledTemplateContextRole(context.role),
  );
}

function compiledTemplateContextRole(
  role: TemplateCompilerTargetContextRole,
): CompiledTemplateContextRole {
  switch (role) {
    case TemplateCompilerTargetContextRole.Root:
      return CompiledTemplateContextRole.Root;
    case TemplateCompilerTargetContextRole.TemplateController:
      return CompiledTemplateContextRole.TemplateController;
    case TemplateCompilerTargetContextRole.Projection:
      return CompiledTemplateContextRole.Projection;
  }
}

function instructionReferencesFor(
  instructions: readonly TemplateInstruction[],
): readonly TemplateInstructionReference[] {
  return instructions.map((instruction) =>
    new TemplateInstructionReference(
      instruction.instructionKind,
      instruction.productHandle,
      instruction.identityHandle,
      instruction.sourceAddressHandle,
    )
  );
}

function sequenceContainsInstructionClaims(
  store: KernelStoreReadView,
  sequenceLocal: string,
  sequenceProductHandle: ProductHandle,
  instructions: readonly TemplateInstruction[],
  provenanceHandle: ProvenanceHandle,
): readonly SemanticClaim[] {
  return instructions.map((instruction, instructionIndex) =>
    new SemanticClaim(
      store.handles.claim(`${sequenceLocal}:contains-instruction:${instructionIndex}`),
      sequenceProductHandle,
      KernelVocabulary.Instruction.SequenceContainsInstruction.key,
      instruction.productHandle,
      provenanceHandle,
    )
  );
}

function compiledTemplatePublicationProductHandles(
  compiledTemplates: readonly CompiledTemplate[],
  sequences: CompiledTemplateSequencePublications,
  createdInstructions: readonly TemplateInstruction[],
  issues: readonly TemplateCompilerIssue[],
): readonly ProductHandle[] {
  return [
    ...compiledTemplates.map((template) => template.productHandle),
    ...sequences.readAllRenderTargets().map((target) => target.productHandle),
    ...sequences.instructionSequences.map((sequence) => sequence.productHandle),
    ...createdInstructions.map((instruction) => instruction.productHandle),
    ...issues.map((issue) => issue.productHandle),
  ];
}
