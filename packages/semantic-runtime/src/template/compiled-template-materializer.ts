import { SemanticClaim, claimsForProduct } from '../kernel/claim.js';
import {
  OpenSeam,
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
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import { camelCaseAttributeName } from './attribute-mapper.js';
import type {
  AttributeClassificationEmission,
} from './attribute-classification-materializer.js';
import {
  AttributeClassification,
  AttributeClassificationKind,
  type AttributeSyntax,
} from './attribute-syntax.js';
import type { AttributeSyntaxParseEmission } from './attribute-syntax-materializer.js';
import {
  CompiledTemplate,
  CompiledTemplateState,
  TemplateRenderTarget,
  TemplateRenderTargetKind,
  type CompiledTemplateField,
  type TemplateRenderTargetField,
} from './compiled-template.js';
import type { TemplateCompilationUnit } from './compilation-unit.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import {
  HtmlAttribute,
  HtmlElement,
  HtmlText,
  type HtmlIrNode,
} from './html-ir.js';
import type { HtmlParseEmission } from './html-parse-materializer.js';
import {
  HydrateAttributeInstruction,
  HydrateElementInstruction,
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
  type TemplateInstructionField,
  type TemplateInstruction,
} from './instruction-ir.js';
import { instructionKindKeyFor } from './instruction-vocabulary.js';
import type { BindingCommandLoweringEmission } from './binding-command-lowering-materializer.js';
import type { TemplateValueSiteEmission } from './value-site-materializer.js';
import {
  TemplateExpressionParse,
  TemplateValueSite,
  TemplateValueSiteKind,
} from './value-site.js';
import { TemplateProductDetails } from './product-details.js';

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
}

export class CompiledTemplateEmission {
  constructor(
    readonly compiledTemplate: CompiledTemplate,
    readonly instructions: readonly TemplateInstruction[],
    readonly instructionSequences: readonly TemplateInstructionSequence[],
    readonly renderTargets: readonly TemplateRenderTarget[],
    readonly openSeams: readonly OpenSeam[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
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
}

class TargetDraft {
  constructor(
    readonly local: string,
    readonly targetKind: TemplateRenderTargetKind,
    readonly node: HtmlElement | HtmlText,
    readonly instructions: readonly TemplateInstruction[],
  ) {}
}

class NestedSequenceDraft {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly ownerProductHandle: ProductHandle,
    readonly ownerIdentityHandle: IdentityHandle,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly instructions: readonly TemplateInstruction[],
  ) {}
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
    readonly renderTargets: readonly TemplateRenderTarget[],
    readonly surrogateSequence: TemplateInstructionSequence | null,
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
  ) {}
}

class CompiledTemplateAssembly {
  constructor(
    readonly targetDrafts: readonly TargetDraft[],
    readonly surrogateInstructions: readonly TemplateInstruction[],
    readonly nestedSequenceDrafts: readonly NestedSequenceDraft[],
    readonly instructions: readonly TemplateInstruction[],
    readonly createdInstructions: readonly TemplateInstruction[],
    readonly records: readonly KernelStoreRecord[],
    readonly openSeams: readonly OpenSeam[],
  ) {}
}

class OwnerElement {
  constructor(
    readonly element: HtmlElement,
    readonly attributes: readonly HtmlAttribute[],
  ) {}
}

type CompiledTemplateRowEmitter = (
  local: string,
  node: HtmlElement | HtmlText,
  rowInstructions: readonly TemplateInstruction[],
  targetKind?: TemplateRenderTargetKind,
) => void;

class ElementInstructionParts {
  constructor(
    readonly attributeInstructions: readonly TemplateInstruction[],
    readonly plainInstructions: readonly TemplateInstruction[],
    readonly templateControllerInstructions: readonly HydrateTemplateControllerInstruction[],
    readonly bindableInstructions: readonly TemplateInstruction[],
    readonly capturedSyntaxProductHandles: readonly ProductHandle[],
    readonly hasProcessContentHook: boolean,
    readonly hasOpenProcessContentHook: boolean,
  ) {}
}

class CompiledTemplateAssemblyIndexes {
  readonly nodesByProduct: ReadonlyMap<ProductHandle, HtmlIrNode>;
  readonly attributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>;
  readonly syntaxByProduct: ReadonlyMap<ProductHandle, AttributeSyntax>;
  readonly classificationsByOwner: ReadonlyMap<ProductHandle, readonly AttributeClassification[]>;
  readonly commandInstructions: ReadonlyMap<ProductHandle, readonly TemplateInstruction[]>;
  readonly parseBySite: ReadonlyMap<ProductHandle, TemplateExpressionParse>;
  readonly valueSiteByClassification: ReadonlyMap<ProductHandle, TemplateValueSite>;
  readonly textValueSiteByNode: ReadonlyMap<ProductHandle, TemplateValueSite>;
  readonly ownersByElement: ReadonlyMap<ProductHandle, OwnerElement>;

  constructor(readonly input: CompiledTemplateMaterializationRequest) {
    this.nodesByProduct = new Map(input.html.nodes.map((node) => [node.productHandle, node]));
    this.attributesByProduct = new Map(input.html.attributes.map((attribute) => [attribute.productHandle, attribute]));
    this.syntaxByProduct = new Map(input.attributeSyntax.syntaxes.map((syntax) => [syntax.productHandle, syntax]));
    this.classificationsByOwner = classificationsByOwnerProduct(input.attributeClassification.classifications);
    this.commandInstructions = commandInstructionsByClassification(input);
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
  readonly targetDrafts: TargetDraft[] = [];
  readonly surrogateInstructions: TemplateInstruction[] = [];
  readonly nestedSequenceDrafts: NestedSequenceDraft[] = [];
  readonly templateControllerChildSequences = new Map<ProductHandle, {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
  }>();

  private instructionIndex = 0;
  private rowIndex = 0;

  constructor(
    readonly store: KernelStore,
    readonly input: CompiledTemplateMaterializationRequest,
    readonly source: CompiledTemplateSourceSet,
  ) {}

  readonly addOpenSeam = (
    local: string,
    summary: string,
    addressHandle: AddressHandle | null,
    seamKindKey: OpenSeamKindKey = KernelVocabulary.Instruction.OpenInstruction.key,
  ): void => {
    const seam = new OpenSeam(
      this.store.handles.openSeam(`compiled-template:${this.input.localKey}:assembly:${local}`),
      seamKindKey,
      summary,
      addressHandle,
      this.source.evidenceHandle,
    );
    this.openSeams.push(seam);
    this.records.push(seam);
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

  readonly fieldProvenance = <TField extends string>(
    fields: readonly (TField | null)[],
  ): readonly FieldProvenance<TField>[] =>
    compactFieldProvenance(fields.map((field) =>
      field == null ? null : new FieldProvenance(field, this.source.provenanceHandle)
    ));

  readonly emitRootRow = (
    local: string,
    node: HtmlElement | HtmlText,
    rowInstructions: readonly TemplateInstruction[],
    targetKind = TemplateRenderTargetKind.MarkerTarget,
  ): void => {
    if (rowInstructions.length === 0) {
      return;
    }
    this.targetDrafts.push(new TargetDraft(
      `${this.rowIndex++}:${local}`,
      targetKind,
      node,
      rowInstructions,
    ));
  };

  readonly emitNestedRow = (
    nestedInstructions: TemplateInstruction[],
  ) => (
    _local: string,
    _node: HtmlElement | HtmlText,
    rowInstructions: readonly TemplateInstruction[],
    _targetKind = TemplateRenderTargetKind.MarkerTarget,
  ): void => {
    nestedInstructions.push(...rowInstructions);
  };

  readonly addNestedSequenceDraft = (
    ownerInstruction: HydrateTemplateControllerInstruction,
    sequenceInstructions: readonly TemplateInstruction[],
  ): void => {
    const sequence = this.templateControllerChildSequences.get(ownerInstruction.productHandle);
    if (sequence == null) {
      return;
    }
    this.nestedSequenceDrafts.push(new NestedSequenceDraft(
      sequence.productHandle,
      sequence.identityHandle,
      ownerInstruction.productHandle,
      ownerInstruction.identityHandle,
      ownerInstruction.sourceAddressHandle,
      sequenceInstructions,
    ));
  };

  toAssembly(): CompiledTemplateAssembly {
    return new CompiledTemplateAssembly(
      this.targetDrafts,
      this.surrogateInstructions,
      this.nestedSequenceDrafts,
      this.instructions,
      this.createdInstructions,
      this.records,
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
    const target = syntax.target.toLowerCase();
    const addressHandle = attribute.valueAddressHandle ?? attribute.sourceAddressHandle;
    if (target === '...$attrs') {
      return this.assemblyState.createInstruction(
        `spread-transfered-binding:${attribute.productHandle}`,
        TemplateInstructionKind.SpreadTransferedBinding,
        classification.identityHandle,
        addressHandle,
        (productHandle, identityHandle) => new SpreadTransferedBindingInstruction(
          productHandle,
          identityHandle,
          node.toReference(),
          attribute.toReference(),
          addressHandle,
          this.assemblyState.fieldProvenance<TemplateInstructionField>(['node', 'attribute', 'source']),
        ),
      );
    }
    if (!target.startsWith('...')) {
      return null;
    }
    const site = this.indexes.valueSiteByClassification.get(classification.productHandle) ?? null;
    const parse = site == null ? null : this.indexes.parseBySite.get(site.productHandle) ?? null;
    return this.assemblyState.createInstruction(
      `spread-value-binding:${attribute.productHandle}`,
      TemplateInstructionKind.SpreadValueBinding,
      classification.identityHandle,
      addressHandle,
      (productHandle, identityHandle) => new SpreadValueBindingInstruction(
        productHandle,
        identityHandle,
        node.toReference(),
        attribute.toReference(),
        '$bindables',
        target === '...$bindables' ? syntax.rawValue : syntax.target.slice(3),
        parse?.productHandle ?? null,
        addressHandle,
        this.assemblyState.fieldProvenance<TemplateInstructionField>(['node', 'attribute', 'target', 'value', 'expression', 'source']),
      ),
    );
  };

  readonly valueInstructionForClassification = (
    classification: AttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
    node: HtmlElement,
    lane: 'bindable' | 'custom-attribute' | 'template-controller' | 'plain',
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
    const bindable = classification.bindable;
    const customAttributeDefinition = classification.resource?.definition instanceof CustomAttributeDefinition
      ? classification.resource.definition
      : null;
    const target = lane === 'plain'
      ? this.input.compilerWorld.attributeMapper.map(node, syntax.target) ?? camelCaseAttributeName(syntax.target)
      : bindable?.definition.name ?? customAttributeDefinition?.defaultProperty ?? syntax.target;
    const addressHandle = attribute.valueAddressHandle ?? attribute.sourceAddressHandle;
    if (parse == null || parse.resultKind === ExpressionParseResultKind.InterpolationAbsent) {
      if (lane === 'plain') {
        if (!generateStaticAttrInstructions) {
          return null;
        }
        switch (attribute.rawName.toLowerCase()) {
          case 'class':
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
                this.assemblyState.fieldProvenance<TemplateInstructionField>(['node', 'attribute', 'value', 'source']),
              ),
            );
          case 'style':
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
                this.assemblyState.fieldProvenance<TemplateInstructionField>(['node', 'attribute', 'value', 'source']),
              ),
            );
          default:
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
                this.assemblyState.fieldProvenance<TemplateInstructionField>(['node', 'attribute', 'target', 'value', 'source']),
              ),
            );
        }
      }
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
          this.assemblyState.fieldProvenance<TemplateInstructionField>(['node', 'attribute', 'target', 'value', 'source']),
        ),
      );
    }
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
        this.assemblyState.fieldProvenance<TemplateInstructionField>(['node', 'attribute', 'target', 'expression', 'source']),
      ),
    );
  };

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
        resolvedInstructionResourceProductHandle(this.input, classification),
        props.map((instruction) => instruction.productHandle),
        classification.sourceAddressHandle,
        this.assemblyState.fieldProvenance<TemplateInstructionField>(['node', 'attribute', 'resource', 'instructions', 'source']),
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
        const childSequenceProductHandle = this.assemblyState.store.handles.product(`${instructionLocal}:child-sequence`);
        const childSequenceIdentityHandle = this.assemblyState.store.handles.identity(`${instructionLocal}:child-sequence`);
        this.assemblyState.templateControllerChildSequences.set(productHandle, {
          productHandle: childSequenceProductHandle,
          identityHandle: childSequenceIdentityHandle,
        });
        return new HydrateTemplateControllerInstruction(
          productHandle,
          identityHandle,
          node.toReference(),
          attribute?.toReference() ?? syntax?.attribute ?? { productHandle: null, addressHandle: classification.sourceAddressHandle, rawName: null },
          syntax?.target ?? classification.resource?.name ?? '(unknown)',
          resolvedInstructionResourceProductHandle(this.input, classification),
          childSequenceProductHandle,
          props.map((instruction) => instruction.productHandle),
          classification.sourceAddressHandle,
          this.assemblyState.fieldProvenance<TemplateInstructionField>(['node', 'attribute', 'resource', 'children', 'instructions', 'source']),
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
    const rootNodes = this.input.html.document.rootNodes
      .map((root) => root.productHandle == null ? null : this.indexes.nodesByProduct.get(root.productHandle) ?? null)
      .filter((node): node is HtmlElement | HtmlText => node instanceof HtmlElement || node instanceof HtmlText);
    const rootElements = rootNodes.filter((node): node is HtmlElement => node instanceof HtmlElement);
    const rootTemplate = rootNodes.every((node) => node instanceof HtmlElement || node.text.trim().length === 0)
      && rootElements.length === 1
      && rootElements[0]?.tagName.toLowerCase() === 'template'
      ? rootElements[0]
      : null;

    if (rootTemplate != null) {
      this.assemblyState.surrogateInstructions.push(...this.surrogateInstructionsForTemplateElement(rootTemplate));
      for (const child of rootTemplate.children) {
        this.visitNode(child);
      }
      return;
    }

    for (const root of this.input.html.document.rootNodes) {
      this.visitNode(root);
    }
  }

  readonly visitNode = (
    nodeRef: { readonly productHandle: ProductHandle | null },
    emitRow = this.assemblyState.emitRootRow,
  ): void => {
    const node = nodeRef.productHandle == null
      ? null
      : this.indexes.nodesByProduct.get(nodeRef.productHandle) ?? null;
    if (node instanceof HtmlText) {
      this.visitTextNode(node, emitRow);
      return;
    }

    if (!(node instanceof HtmlElement)) {
      return;
    }

    if (this.visitLetElement(node, emitRow)) {
      return;
    }

    this.visitElementNode(node, emitRow);
  };

  private visitTextNode(
    node: HtmlText,
    emitRow: CompiledTemplateRowEmitter,
  ): void {
    const site = this.indexes.textValueSiteByNode.get(node.productHandle) ?? null;
    const parse = site == null ? null : this.indexes.parseBySite.get(site.productHandle) ?? null;
    if (parse == null || parse.resultKind === ExpressionParseResultKind.InterpolationAbsent) {
      return;
    }
    emitRow(
      `text:${node.productHandle}`,
      node,
      [
        this.assemblyState.createInstruction(
          `text-binding:${node.productHandle}`,
          TemplateInstructionKind.TextBinding,
          node.identityHandle,
          node.sourceAddressHandle,
          (productHandle, identityHandle) => new TextBindingInstruction(
            productHandle,
            identityHandle,
            node.toReference(),
            parse.productHandle,
            node.sourceAddressHandle,
            this.assemblyState.fieldProvenance<TemplateInstructionField>(['node', 'expression', 'source']),
          ),
        ),
      ],
    );
  }

  private visitLetElement(
    node: HtmlElement,
    emitRow: CompiledTemplateRowEmitter,
  ): boolean {
    if (node.tagName.toLowerCase() !== 'let') {
      return false;
    }
    const letInstructions = this.letBindingInstructionsForElement(node);
    if (letInstructions.length > 0) {
      emitRow(
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
              hasAttribute(this.indexes.ownersByElement.get(node.productHandle) ?? null, 'to-binding-context'),
              node.sourceAddressHandle,
              this.assemblyState.fieldProvenance<TemplateInstructionField>(['node', 'instructions', 'toBindingContext', 'source']),
            ),
          ),
        ],
      );
    }
    return true;
  }

  private visitElementNode(
    node: HtmlElement,
    emitRow: CompiledTemplateRowEmitter,
  ): void {
    const owner = this.indexes.ownersByElement.get(node.productHandle) ?? null;
    const classifications = this.indexes.classificationsByOwner.get(node.productHandle) ?? [];
    const elementResolution = this.input.compilerWorld.resourceResolver.el(elementLookupName(node, owner));
    const elementDefinition = elementResolution?.definition instanceof CustomElementDefinition
      ? elementResolution.definition
      : null;
    const elementInstructions: TemplateInstruction[] = [];
    const parts = this.collectElementInstructionParts(node, classifications, elementDefinition);

    if (elementDefinition != null) {
      elementInstructions.push(this.assemblyState.createInstruction(
        `hydrate-element:${node.productHandle}`,
        TemplateInstructionKind.HydrateElement,
        elementDefinition.identityHandle ?? node.identityHandle,
        node.sourceAddressHandle,
        (productHandle, identityHandle) => new HydrateElementInstruction(
          productHandle,
          identityHandle,
          node.toReference(),
          elementDefinition.name,
          this.input.compilerWorld.templateCompiler.resolveResources ? elementDefinition.productHandle : null,
          null,
          parts.bindableInstructions.map((instruction) => instruction.productHandle),
          parts.capturedSyntaxProductHandles,
          elementDefinition.containerless || hasAttribute(owner, 'containerless'),
          node.sourceAddressHandle,
          this.assemblyState.fieldProvenance<TemplateInstructionField>([
            'node',
            'definition',
            'instructions',
            parts.capturedSyntaxProductHandles.length === 0 ? null : 'captures',
            'source',
          ]),
        ),
      ));
    }

    const directRow = [
      ...elementInstructions,
      ...parts.attributeInstructions,
      ...parts.plainInstructions,
    ];
    const shouldCompileChildren = elementDefinition == null
      || (!elementDefinition.containerless && !hasAttribute(owner, 'containerless') && !parts.hasOpenProcessContentHook);

    if (parts.templateControllerInstructions.length > 0) {
      const innermostInstructions: TemplateInstruction[] = [...directRow];
      if (!shouldCompileChildren && !parts.hasProcessContentHook && node.children.length > 0) {
        this.assemblyState.addOpenSeam(
          `containerless-children:${node.productHandle}`,
          `Custom element '${elementDefinition?.name ?? node.tagName}' is containerless; child content/projection compilation is held open until projection ownership is modeled.`,
          node.sourceAddressHandle,
          KernelVocabulary.Compiler.OpenContentProjection.key,
        );
      }
      if (shouldCompileChildren) {
        const nestedRow = this.assemblyState.emitNestedRow(innermostInstructions);
        for (const child of node.children) {
          this.visitNode(child, nestedRow);
        }
      }
      let childInstructions: readonly TemplateInstruction[] = innermostInstructions;
      for (let index = parts.templateControllerInstructions.length - 1; index >= 0; --index) {
        const instruction = parts.templateControllerInstructions[index]!;
        this.assemblyState.addNestedSequenceDraft(instruction, childInstructions);
        childInstructions = [instruction];
      }
      emitRow(`template-controller:${node.productHandle}`, node, [parts.templateControllerInstructions[0]!], TemplateRenderTargetKind.RenderLocation);
      return;
    }

    emitRow(`element:${node.productHandle}`, node, directRow);

    if (!shouldCompileChildren && !parts.hasProcessContentHook && node.children.length > 0) {
      this.assemblyState.addOpenSeam(
        `containerless-children:${node.productHandle}`,
        `Custom element '${elementDefinition?.name ?? node.tagName}' is containerless; child content/projection compilation is held open until projection ownership is modeled.`,
        node.sourceAddressHandle,
        KernelVocabulary.Compiler.OpenContentProjection.key,
      );
      return;
    }

    for (const child of node.children) {
      this.visitNode(child, emitRow);
    }
  }

  private collectElementInstructionParts(
    node: HtmlElement,
    classifications: readonly AttributeClassification[],
    elementDefinition: CustomElementDefinition | null,
  ): ElementInstructionParts {
    const attributeInstructions: TemplateInstruction[] = [];
    const plainInstructions: TemplateInstruction[] = [];
    const templateControllerInstructions: HydrateTemplateControllerInstruction[] = [];
    const bindableInstructions: TemplateInstruction[] = [];
    const capturedSyntaxProductHandles: ProductHandle[] = [];
    const hasProcessContentHook = elementDefinition?.processContent != null;
    const hasOpenProcessContentHook = hasProcessContentHook && !this.isKnownTransparentProcessContent(node, elementDefinition);

    if (hasOpenProcessContentHook) {
      this.assemblyState.addOpenSeam(
        `process-content:${node.productHandle}`,
        `Custom element '${elementDefinition.name}' has a processContent hook; child DOM compilation is held open because the hook may mutate, remove, or decline compilation of the authored content.`,
        node.sourceAddressHandle,
        KernelVocabulary.Compiler.OpenProcessContentHook.key,
      );
    }

    for (const classification of classifications) {
      const syntax = this.indexes.syntaxByProduct.get(classification.syntaxProductHandle) ?? null;
      const attribute = syntax?.attribute.productHandle == null
        ? null
        : this.indexes.attributesByProduct.get(syntax.attribute.productHandle) ?? null;
      const commandBuilt = this.indexes.commandInstructions.get(classification.productHandle) ?? [];
      if (commandBuilt.length > 0) {
        commandBuilt.forEach((instruction) => this.assemblyState.addExistingInstruction(instruction));
      }

      switch (classification.classificationKind) {
        case AttributeClassificationKind.Bindable:
          bindableInstructions.push(...commandBuilt);
          if (commandBuilt.length === 0) {
            const instruction = this.instructionFactory.valueInstructionForClassification(
              classification,
              syntax,
              attribute,
              node,
              'bindable',
            );
            if (instruction != null) {
              bindableInstructions.push(instruction);
            }
          }
          break;
        case AttributeClassificationKind.Spread: {
          const spreadTarget = syntax?.target.toLowerCase() ?? '';
          const targetInstructions = spreadTarget === '...$attrs'
            ? plainInstructions
            : bindableInstructions;
          targetInstructions.push(...commandBuilt);
          if (commandBuilt.length === 0) {
            const instruction = this.instructionFactory.spreadInstructionForClassification(classification, syntax, attribute, node);
            if (instruction != null) {
              targetInstructions.push(instruction);
            }
          }
          break;
        }
        case AttributeClassificationKind.CustomAttribute: {
          const props = commandBuilt.length > 0
            ? commandBuilt
            : nullableInstruction(this.instructionFactory.valueInstructionForClassification(classification, syntax, attribute, node, 'custom-attribute'));
          attributeInstructions.push(this.instructionFactory.createHydrateAttributeInstruction(classification, syntax, attribute, node, props));
          break;
        }
        case AttributeClassificationKind.TemplateController: {
          const props = commandBuilt.length > 0
            ? commandBuilt
            : nullableInstruction(this.instructionFactory.valueInstructionForClassification(classification, syntax, attribute, node, 'template-controller'));
          templateControllerInstructions.push(this.instructionFactory.createTemplateControllerInstruction(classification, syntax, attribute, node, props));
          break;
        }
        case AttributeClassificationKind.Plain:
          if (commandBuilt.length > 0) {
            plainInstructions.push(...commandBuilt);
          } else {
            const instruction = this.instructionFactory.valueInstructionForClassification(classification, syntax, attribute, node, 'plain');
            if (instruction != null) {
              plainInstructions.push(instruction);
            }
          }
          break;
        case AttributeClassificationKind.BindingCommand:
        case AttributeClassificationKind.Ref:
          plainInstructions.push(...commandBuilt);
          break;
        case AttributeClassificationKind.Captured:
          if (syntax != null) {
            capturedSyntaxProductHandles.push(syntax.productHandle);
          }
          break;
        case AttributeClassificationKind.CompilerControl:
        case AttributeClassificationKind.Open:
          break;
      }
    }

    return new ElementInstructionParts(
      attributeInstructions,
      plainInstructions,
      templateControllerInstructions,
      bindableInstructions,
      capturedSyntaxProductHandles,
      hasProcessContentHook,
      hasOpenProcessContentHook,
    );
  }

  private isKnownTransparentProcessContent(
    node: HtmlElement,
    elementDefinition: CustomElementDefinition | null,
  ): boolean {
    if (elementDefinition?.name !== 'au-slot') {
      return false;
    }
    return !this.hasDescendantAttribute(node, 'au-slot');
  }

  private hasDescendantAttribute(node: HtmlElement, attributeName: string): boolean {
    for (const childReference of node.children) {
      const child = childReference.productHandle == null
        ? null
        : this.indexes.nodesByProduct.get(childReference.productHandle) ?? null;
      if (!(child instanceof HtmlElement)) {
        continue;
      }
      if (this.elementHasAttribute(child, attributeName) || this.hasDescendantAttribute(child, attributeName)) {
        return true;
      }
    }
    return false;
  }

  private elementHasAttribute(node: HtmlElement, attributeName: string): boolean {
    return node.attributes.some((reference) => {
      const attribute = reference.productHandle == null
        ? null
        : this.indexes.attributesByProduct.get(reference.productHandle) ?? null;
      return attribute?.rawName === attributeName;
    });
  }

  private letBindingInstructionsForElement(node: HtmlElement): readonly LetBindingInstruction[] {
    const owner = this.indexes.ownersByElement.get(node.productHandle) ?? null;
    if (owner == null) {
      return [];
    }
    const result: LetBindingInstruction[] = [];
    for (const attribute of owner.attributes) {
      if (attribute.rawName === 'to-binding-context') {
        continue;
      }
      const syntax = this.input.attributeSyntax.syntaxes.find((candidate) =>
        candidate.attribute.productHandle === attribute.productHandle
      ) ?? null;
      if (syntax == null) {
        continue;
      }
      const classification = this.input.attributeClassification.classifications.find((candidate) =>
        candidate.syntaxProductHandle === syntax.productHandle
      ) ?? null;
      const site = classification == null ? null : this.indexes.valueSiteByClassification.get(classification.productHandle) ?? null;
      const commandInstruction = classification == null
        ? null
        : this.indexes.commandInstructions.get(classification.productHandle)?.[0] ?? null;
      const expressionHandle = commandInstruction instanceof PropertyBindingInstruction
        ? commandInstruction.expressionProductHandle
        : site == null ? null : this.indexes.parseBySite.get(site.productHandle)?.productHandle ?? null;
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
          camelCaseAttributeName(syntax.target),
          expressionHandle,
          attribute.valueAddressHandle ?? attribute.sourceAddressHandle,
          this.assemblyState.fieldProvenance<TemplateInstructionField>(['node', 'attribute', 'target', 'expression', 'source']),
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
        this.assemblyState.addOpenSeam(
          `surrogate-invalid-attribute:${classification.productHandle}`,
          `Root template surrogate attribute '${syntax.target}' is invalid in Aurelia and is not lowered into host instructions.`,
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
          this.assemblyState.addOpenSeam(
            `surrogate-template-controller:${classification.productHandle}`,
            'Template controller attributes on a root template surrogate are recognized as invalid by Aurelia and are not modeled as renderable host instructions.',
            classification.sourceAddressHandle,
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
    readonly store: KernelStore,
  ) {}

  materialize(input: CompiledTemplateMaterializationRequest): CompiledTemplateEmission {
    const emission = this.recordsForCompiledTemplate(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `compiled-template:${input.localKey}`));
    }
    this.registerProductDetails(emission);
    return emission;
  }

  private registerProductDetails(emission: CompiledTemplateEmission): void {
    this.store.productDetails.add(
      TemplateProductDetails.CompiledTemplate,
      emission.compiledTemplate.productHandle,
      emission.compiledTemplate,
    );
    for (const sequence of emission.instructionSequences) {
      this.store.productDetails.add(TemplateProductDetails.InstructionSequence, sequence.productHandle, sequence);
    }
    for (const target of emission.renderTargets) {
      this.store.productDetails.add(TemplateProductDetails.RenderTarget, target.productHandle, target);
    }
    for (const instruction of emission.instructions) {
      this.store.productDetails.addIfAbsent(TemplateProductDetails.Instruction, instruction.productHandle, instruction);
    }
  }

  private recordsForCompiledTemplate(input: CompiledTemplateMaterializationRequest): CompiledTemplateEmission {
    const source = this.recordsForSource(input);
    const handles = this.compiledTemplateHandles(input);
    const assembly = this.assembleInstructions(input, source);
    const sequencePublications = this.publishCompiledTemplateSequences(
      input,
      handles,
      assembly,
      source,
    );
    const claims = [
      this.compileClaimForTemplate(input, handles, source),
      ...sequencePublications.claims,
    ];
    const openSeams = assembly.openSeams;
    const state = compiledTemplateStateFor(openSeams, assembly.targetDrafts);
    const compiledTemplate = this.createCompiledTemplate(
      input,
      handles,
      state,
      sequencePublications,
      source,
    );
    const records: KernelStoreRecord[] = [...source.records];
    records.push(...assembly.records);
    records.push(...sequencePublications.records);
    records.push(...this.recordsForCompiledTemplatePublication(
      input,
      handles,
      compiledTemplate,
      sequencePublications,
      assembly.createdInstructions,
      claims,
      openSeams,
      source,
    ));

    return new CompiledTemplateEmission(
      compiledTemplate,
      assembly.instructions,
      sequencePublications.instructionSequences,
      sequencePublications.renderTargets,
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
    const renderTargets: TemplateRenderTarget[] = [];
    const instructionSequences: TemplateInstructionSequence[] = [];
    let surrogateSequence: TemplateInstructionSequence | null = null;

    assembly.targetDrafts.forEach((draft, index) => {
      const publication = this.publishRenderTargetDraft(
        handles.local,
        handles.productHandle,
        handles.identityHandle,
        draft,
        index,
        source,
      );
      claims.push(...publication.claims);
      records.push(...publication.records);
      instructionSequences.push(publication.sequence);
      renderTargets.push(publication.target);
    });

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

    assembly.nestedSequenceDrafts.forEach((draft, index) => {
      const publication = this.publishNestedSequenceDraft(
        handles.local,
        draft,
        index,
        source,
      );
      claims.push(...publication.claims);
      records.push(...publication.records);
      instructionSequences.push(publication.sequence);
    });

    return new CompiledTemplateSequencePublications(
      instructionSequences,
      renderTargets,
      surrogateSequence,
      records,
      claims,
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

  private createCompiledTemplate(
    input: CompiledTemplateMaterializationRequest,
    handles: CompiledTemplateHandles,
    state: CompiledTemplateState,
    sequences: CompiledTemplateSequencePublications,
    source: CompiledTemplateSourceSet,
  ): CompiledTemplate {
    return new CompiledTemplate(
      handles.productHandle,
      handles.identityHandle,
      input.html.document.productHandle,
      state,
      sequences.renderTargets,
      sequences.surrogateSequence,
      input.compilationUnit.sourceAddressHandle,
      compactFieldProvenance<CompiledTemplateField>([
        new FieldProvenance('htmlDocument', source.provenanceHandle),
        new FieldProvenance('state', source.provenanceHandle),
        sequences.renderTargets.length === 0 ? null : new FieldProvenance('targets', source.provenanceHandle),
        sequences.surrogateSequence == null ? null : new FieldProvenance('surrogates', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private recordsForCompiledTemplatePublication(
    input: CompiledTemplateMaterializationRequest,
    handles: CompiledTemplateHandles,
    compiledTemplate: CompiledTemplate,
    sequences: CompiledTemplateSequencePublications,
    createdInstructions: readonly TemplateInstruction[],
    claims: readonly SemanticClaim[],
    openSeams: readonly OpenSeam[],
    source: CompiledTemplateSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      this.compiledTemplateIdentity(input, handles, compiledTemplate),
      this.compiledTemplateProduct(handles, compiledTemplate, source),
      ...this.createdInstructionProducts(createdInstructions, source),
      ...claims,
      this.compiledTemplateMaterialization(handles, sequences, createdInstructions, claims, openSeams),
    ];
  }

  private compiledTemplateIdentity(
    input: CompiledTemplateMaterializationRequest,
    handles: CompiledTemplateHandles,
    compiledTemplate: CompiledTemplate,
  ): CompilerIdentity {
    return new CompilerIdentity(
      handles.identityHandle,
      KernelVocabulary.Template.CompiledTemplate.key,
      input.compilationUnit.identityHandle,
      compiledTemplate.sourceAddressHandle,
      compiledTemplate.state,
    );
  }

  private compiledTemplateProduct(
    handles: CompiledTemplateHandles,
    compiledTemplate: CompiledTemplate,
    source: CompiledTemplateSourceSet,
  ): MaterializedProduct {
    return new MaterializedProduct(
      handles.productHandle,
      KernelVocabulary.Template.CompiledTemplate.key,
      handles.identityHandle,
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
    sequences: CompiledTemplateSequencePublications,
    createdInstructions: readonly TemplateInstruction[],
    claims: readonly SemanticClaim[],
    openSeams: readonly OpenSeam[],
  ): MaterializationRecord {
    return new MaterializationRecord(
      this.store.handles.materialization(handles.local),
      handles.identityHandle,
      compiledTemplatePublicationProductHandles(handles, sequences, createdInstructions),
      claims.map((claim) => claim.handle),
      openSeams.map((seam) => seam.handle),
    );
  }

  private publishRenderTargetDraft(
    compiledLocal: string,
    compiledProductHandle: ProductHandle,
    compiledIdentityHandle: IdentityHandle,
    draft: TargetDraft,
    index: number,
    source: CompiledTemplateSourceSet,
  ): RenderTargetPublication {
    const handles = this.renderTargetPublicationHandles(compiledLocal, draft, index);
    const sequence = this.instructionSequenceForRenderTarget(handles, draft);
    const target = this.renderTargetForDraft(handles, draft, source);
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
        draft,
        source,
      ),
    );
  }

  private renderTargetPublicationHandles(
    compiledLocal: string,
    draft: TargetDraft,
    index: number,
  ): RenderTargetPublicationHandles {
    const targetLocal = `${compiledLocal}:target:${index}:${draft.local}`;
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
    draft: TargetDraft,
  ): TemplateInstructionSequence {
    return new TemplateInstructionSequence(
      handles.sequenceProductHandle,
      handles.sequenceIdentityHandle,
      handles.targetProductHandle,
      instructionReferencesFor(draft.instructions),
      draft.node.sourceAddressHandle,
    );
  }

  private renderTargetForDraft(
    handles: RenderTargetPublicationHandles,
    draft: TargetDraft,
    source: CompiledTemplateSourceSet,
  ): TemplateRenderTarget {
    return new TemplateRenderTarget(
      handles.targetProductHandle,
      handles.targetIdentityHandle,
      draft.targetKind,
      draft.node.toReference(),
      handles.sequenceProductHandle,
      draft.node.sourceAddressHandle,
      compactFieldProvenance<TemplateRenderTargetField>([
        new FieldProvenance('targetKind', source.provenanceHandle),
        new FieldProvenance('htmlNode', source.provenanceHandle),
        new FieldProvenance('instructionSequence', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private claimsForRenderTargetPublication(
    compiledProductHandle: ProductHandle,
    handles: RenderTargetPublicationHandles,
    target: TemplateRenderTarget,
    sequence: TemplateInstructionSequence,
    draft: TargetDraft,
    source: CompiledTemplateSourceSet,
  ): readonly SemanticClaim[] {
    return [
      this.compiledTemplateContainsRenderTargetClaim(compiledProductHandle, handles, target, source),
      this.renderTargetForHtmlNodeClaim(handles, target, draft, source),
      this.renderTargetUsesInstructionSequenceClaim(handles, target, sequence, source),
      ...sequenceContainsInstructionClaims(this.store, handles.sequenceLocal, sequence.productHandle, draft.instructions, source.provenanceHandle),
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
    draft: TargetDraft,
    source: CompiledTemplateSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${handles.targetLocal}:target-for-html-node`),
      target.productHandle,
      KernelVocabulary.Template.RenderTargetForHtmlNode.key,
      draft.node.productHandle,
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

  private publishNestedSequenceDraft(
    compiledLocal: string,
    draft: NestedSequenceDraft,
    index: number,
    source: CompiledTemplateSourceSet,
  ): InstructionSequencePublication {
    const sequenceLocal = `${compiledLocal}:nested-sequence:${index}`;
    const sequence = this.nestedSequenceFor(draft);
    return new InstructionSequencePublication(
      sequence,
      this.recordsForNestedSequence(index, draft, sequence, source),
      this.claimsForNestedSequence(sequenceLocal, draft, sequence, source),
    );
  }

  private nestedSequenceFor(draft: NestedSequenceDraft): TemplateInstructionSequence {
    return new TemplateInstructionSequence(
      draft.productHandle,
      draft.identityHandle,
      draft.ownerProductHandle,
      instructionReferencesFor(draft.instructions),
      draft.sourceAddressHandle,
    );
  }

  private claimsForNestedSequence(
    sequenceLocal: string,
    draft: NestedSequenceDraft,
    sequence: TemplateInstructionSequence,
    source: CompiledTemplateSourceSet,
  ): readonly SemanticClaim[] {
    return [
      new SemanticClaim(
        this.store.handles.claim(`${sequenceLocal}:instruction-owns-child-sequence`),
        draft.ownerProductHandle,
        KernelVocabulary.Instruction.InstructionOwnsChildSequence.key,
        sequence.productHandle,
        source.provenanceHandle,
      ),
      ...sequenceContainsInstructionClaims(
        this.store,
        sequenceLocal,
        sequence.productHandle,
        draft.instructions,
        source.provenanceHandle,
      ),
    ];
  }

  private recordsForNestedSequence(
    index: number,
    draft: NestedSequenceDraft,
    sequence: TemplateInstructionSequence,
    source: CompiledTemplateSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        sequence.identityHandle,
        KernelVocabulary.Instruction.Sequence.key,
        draft.ownerIdentityHandle,
        sequence.sourceAddressHandle,
        `nested:${index}`,
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
  ): CompiledTemplateAssembly {
    const assemblyState = new CompiledTemplateAssemblyState(this.store, input, source);
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
): ReadonlyMap<ProductHandle, OwnerElement> {
  const attributesByProduct = new Map(html.attributes.map((attribute) => [attribute.productHandle, attribute]));
  const result = new Map<ProductHandle, OwnerElement>();
  for (const node of html.nodes) {
    if (!(node instanceof HtmlElement)) {
      continue;
    }
    result.set(node.productHandle, new OwnerElement(
      node,
      node.attributes
        .map((attribute) => attribute.productHandle == null
          ? null
          : attributesByProduct.get(attribute.productHandle) ?? null
        )
        .filter((attribute): attribute is HtmlAttribute => attribute != null),
    ));
  }
  return result;
}

function elementLookupName(
  node: HtmlElement,
  owner: OwnerElement | null,
): string {
  const asElement = owner?.attributes.find((attribute) => attribute.rawName.toLowerCase() === 'as-element') ?? null;
  return asElement == null || asElement.rawValue === ''
    ? node.tagName.toLowerCase()
    : asElement.rawValue.toLowerCase();
}

function hasAttribute(
  owner: OwnerElement | null,
  name: string,
): boolean {
  return owner?.attributes.some((attribute) => attribute.rawName.toLowerCase() === name) ?? false;
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

function resolvedInstructionResourceProductHandle(
  input: CompiledTemplateMaterializationRequest,
  classification: AttributeClassification,
): ProductHandle | null {
  return input.compilerWorld.templateCompiler.resolveResources
    ? classification.resource?.definitionProductHandle ?? classification.resource?.resourceProductHandle ?? null
    : null;
}

function compiledTemplateStateFor(
  openSeams: readonly OpenSeam[],
  targetDrafts: readonly TargetDraft[],
): CompiledTemplateState {
  if (openSeams.length === 0) {
    return CompiledTemplateState.Complete;
  }
  return targetDrafts.length === 0
    ? CompiledTemplateState.Open
    : CompiledTemplateState.Partial;
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
  store: KernelStore,
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
  handles: CompiledTemplateHandles,
  sequences: CompiledTemplateSequencePublications,
  createdInstructions: readonly TemplateInstruction[],
): readonly ProductHandle[] {
  return [
    handles.productHandle,
    ...sequences.renderTargets.map((target) => target.productHandle),
    ...sequences.instructionSequences.map((sequence) => sequence.productHandle),
    ...createdInstructions.map((instruction) => instruction.productHandle),
  ];
}
