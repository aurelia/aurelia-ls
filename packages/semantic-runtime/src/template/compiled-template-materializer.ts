import { SemanticClaim } from '../kernel/claim.js';
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
  type InstructionKindKey,
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
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
  SetPropertyInstruction,
  TemplateInstructionReference,
  TemplateInstructionSequence,
  TemplateInstructionKind,
  TextBindingInstruction,
  type TemplateInstructionField,
  type TemplateInstruction,
} from './instruction-ir.js';
import type { BindingCommandLoweringEmission } from './binding-command-lowering-materializer.js';
import type { TemplateValueSiteEmission } from './value-site-materializer.js';
import {
  TemplateExpressionParse,
  TemplateValueSite,
  TemplateValueSiteKind,
} from './value-site.js';
import { TemplateProductDetails } from './product-details.js';

export class CompiledTemplateMaterializationInput {
  constructor(
    /** Store-local key for this compiled-template pass. */
    readonly localKey: string,
    /** Compiler unit that owns the authored HTML and compiler context. */
    readonly compilationUnit: TemplateCompilationUnit,
    /** Authored HTML parse result before compiler DOM transformation. */
    readonly html: HtmlParseEmission,
    /** Runtime AttrSyntax products produced from authored attributes. */
    readonly attributeSyntax: AttributeSyntaxParseEmission,
    /** Attribute classifications that selected resource/bindable/command lanes. */
    readonly attributeClassification: AttributeClassificationEmission,
    /** Value sites that reveal text interpolation and other non-command compiler work still needing rows. */
    readonly valueSites: TemplateValueSiteEmission,
    /** Binding-command lowering products that already emitted concrete instruction models. */
    readonly bindingCommandLowering: BindingCommandLoweringEmission,
    /** Compiler world that supplies runtime-shaped resource and command lookup services. */
    readonly compilerWorld: TemplateCompilerWorldEmission,
  ) {}
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

class CompiledTemplateAssembly {
  constructor(
    readonly targetDrafts: readonly TargetDraft[],
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

/** Assembles compiler rows and render targets at the handoff before runtime Rendering can run. */
export class CompiledTemplateMaterializer {
  constructor(
    /** Hot analysis store that receives compiled-template products. */
    readonly store: KernelStore,
  ) {}

  materialize(input: CompiledTemplateMaterializationInput): CompiledTemplateEmission {
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

  private recordsForCompiledTemplate(input: CompiledTemplateMaterializationInput): CompiledTemplateEmission {
    const source = this.recordsForSource(input);
    const records: KernelStoreRecord[] = [...source.records];
    const claims: SemanticClaim[] = [];
    const openSeams: OpenSeam[] = [];
    const compiledLocal = `compiled-template:${input.localKey}`;
    const compiledProductHandle = this.store.handles.product(compiledLocal);
    const compiledIdentityHandle = this.store.handles.identity(compiledLocal);
    const assembly = this.assembleInstructions(input, source);
    const drafts = assembly.targetDrafts;
    const renderTargets: TemplateRenderTarget[] = [];
    const instructionSequences: TemplateInstructionSequence[] = [];
    records.push(...assembly.records);
    openSeams.push(...assembly.openSeams);

    const compileClaim = new SemanticClaim(
      this.store.handles.claim(`${compiledLocal}:compiles-to-compiled-template`),
      input.html.document.productHandle,
      KernelVocabulary.Template.CompilesToCompiledTemplate.key,
      compiledProductHandle,
      source.provenanceHandle,
    );
    claims.push(compileClaim);

    drafts.forEach((draft, index) => {
      const targetLocal = `${compiledLocal}:target:${index}:${draft.local}`;
      const sequenceLocal = `${targetLocal}:instructions`;
      const targetProductHandle = this.store.handles.product(targetLocal);
      const targetIdentityHandle = this.store.handles.identity(targetLocal);
      const sequenceProductHandle = this.store.handles.product(sequenceLocal);
      const sequenceIdentityHandle = this.store.handles.identity(sequenceLocal);
      const instructionReferences = draft.instructions.map((instruction) =>
        new TemplateInstructionReference(
          instruction.instructionKind,
          instruction.productHandle,
          instruction.identityHandle,
          instruction.sourceAddressHandle,
        )
      );
      const sequence = new TemplateInstructionSequence(
        sequenceProductHandle,
        sequenceIdentityHandle,
        targetProductHandle,
        instructionReferences,
        draft.node.sourceAddressHandle,
      );
      const target = new TemplateRenderTarget(
        targetProductHandle,
        targetIdentityHandle,
        draft.targetKind,
        draft.node.toReference(),
        sequenceProductHandle,
        draft.node.sourceAddressHandle,
        compactFieldProvenance<TemplateRenderTargetField>([
          new FieldProvenance('targetKind', source.provenanceHandle),
          new FieldProvenance('htmlNode', source.provenanceHandle),
          new FieldProvenance('instructionSequence', source.provenanceHandle),
          new FieldProvenance('source', source.provenanceHandle),
        ]),
      );
      const targetClaim = new SemanticClaim(
        this.store.handles.claim(`${targetLocal}:compiled-template-contains-target`),
        compiledProductHandle,
        KernelVocabulary.Template.ContainsRenderTarget.key,
        targetProductHandle,
        source.provenanceHandle,
      );
      const nodeClaim = new SemanticClaim(
        this.store.handles.claim(`${targetLocal}:target-for-html-node`),
        targetProductHandle,
        KernelVocabulary.Template.RenderTargetForHtmlNode.key,
        draft.node.productHandle,
        source.provenanceHandle,
      );
      const sequenceClaim = new SemanticClaim(
        this.store.handles.claim(`${targetLocal}:target-uses-instruction-sequence`),
        targetProductHandle,
        KernelVocabulary.Template.RenderTargetUsesInstructionSequence.key,
        sequenceProductHandle,
        source.provenanceHandle,
      );
      const instructionClaims = draft.instructions.map((instruction, instructionIndex) =>
        new SemanticClaim(
          this.store.handles.claim(`${sequenceLocal}:contains-instruction:${instructionIndex}`),
          sequenceProductHandle,
          KernelVocabulary.Instruction.SequenceContainsInstruction.key,
          instruction.productHandle,
          source.provenanceHandle,
        )
      );
      claims.push(targetClaim, nodeClaim, sequenceClaim, ...instructionClaims);
      instructionSequences.push(sequence);
      renderTargets.push(target);
      records.push(
        new CompilerIdentity(
          targetIdentityHandle,
          KernelVocabulary.Template.RenderTarget.key,
          compiledIdentityHandle,
          target.sourceAddressHandle,
          target.targetKind,
        ),
        new MaterializedProduct(
          targetProductHandle,
          KernelVocabulary.Template.RenderTarget.key,
          targetIdentityHandle,
          target.sourceAddressHandle,
          source.provenanceHandle,
        ),
        new CompilerIdentity(
          sequenceIdentityHandle,
          KernelVocabulary.Instruction.Sequence.key,
          targetIdentityHandle,
          sequence.sourceAddressHandle,
          `${target.targetKind}:${index}`,
        ),
        new MaterializedProduct(
          sequenceProductHandle,
          KernelVocabulary.Instruction.Sequence.key,
          sequenceIdentityHandle,
          sequence.sourceAddressHandle,
          source.provenanceHandle,
        ),
      );
    });

    assembly.nestedSequenceDrafts.forEach((draft, index) => {
      const sequenceLocal = `${compiledLocal}:nested-sequence:${index}`;
      const instructionReferences = draft.instructions.map((instruction) =>
        new TemplateInstructionReference(
          instruction.instructionKind,
          instruction.productHandle,
          instruction.identityHandle,
          instruction.sourceAddressHandle,
        )
      );
      const sequence = new TemplateInstructionSequence(
        draft.productHandle,
        draft.identityHandle,
        draft.ownerProductHandle,
        instructionReferences,
        draft.sourceAddressHandle,
      );
      const ownerClaim = new SemanticClaim(
        this.store.handles.claim(`${sequenceLocal}:instruction-owns-child-sequence`),
        draft.ownerProductHandle,
        KernelVocabulary.Instruction.InstructionOwnsChildSequence.key,
        sequence.productHandle,
        source.provenanceHandle,
      );
      const instructionClaims = draft.instructions.map((instruction, instructionIndex) =>
        new SemanticClaim(
          this.store.handles.claim(`${sequenceLocal}:contains-instruction:${instructionIndex}`),
          sequence.productHandle,
          KernelVocabulary.Instruction.SequenceContainsInstruction.key,
          instruction.productHandle,
          source.provenanceHandle,
        )
      );
      claims.push(ownerClaim, ...instructionClaims);
      instructionSequences.push(sequence);
      records.push(
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
      );
    });

    const state = openSeams.length === 0
      ? CompiledTemplateState.Complete
      : drafts.length === 0
        ? CompiledTemplateState.Open
        : CompiledTemplateState.Partial;
    const compiledTemplate = new CompiledTemplate(
      compiledProductHandle,
      compiledIdentityHandle,
      input.html.document.productHandle,
      state,
      renderTargets,
      null,
      input.compilationUnit.sourceAddressHandle,
      compactFieldProvenance<CompiledTemplateField>([
        new FieldProvenance('htmlDocument', source.provenanceHandle),
        new FieldProvenance('state', source.provenanceHandle),
        renderTargets.length === 0 ? null : new FieldProvenance('targets', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    records.push(
      new CompilerIdentity(
        compiledIdentityHandle,
        KernelVocabulary.Template.CompiledTemplate.key,
        input.compilationUnit.identityHandle,
        input.compilationUnit.sourceAddressHandle,
        state,
      ),
      new MaterializedProduct(
        compiledProductHandle,
        KernelVocabulary.Template.CompiledTemplate.key,
        compiledIdentityHandle,
        input.compilationUnit.sourceAddressHandle,
        source.provenanceHandle,
      ),
      ...assembly.createdInstructions.map((instruction) => new MaterializedProduct(
        instruction.productHandle,
        KernelVocabulary.Instruction.Instruction.key,
        instruction.identityHandle,
        instruction.sourceAddressHandle,
        source.provenanceHandle,
      )),
      ...claims,
      new MaterializationRecord(
        this.store.handles.materialization(compiledLocal),
        compiledIdentityHandle,
        [
          compiledProductHandle,
          ...renderTargets.map((target) => target.productHandle),
          ...instructionSequences.map((sequence) => sequence.productHandle),
          ...assembly.createdInstructions.map((instruction) => instruction.productHandle),
        ],
        claims.map((claim) => claim.handle),
        openSeams.map((seam) => seam.handle),
      ),
    );

    return new CompiledTemplateEmission(
      compiledTemplate,
      assembly.instructions,
      instructionSequences,
      renderTargets,
      openSeams,
      records,
    );
  }

  private assembleInstructions(
    input: CompiledTemplateMaterializationInput,
    source: CompiledTemplateSourceSet,
  ): CompiledTemplateAssembly {
    const records: KernelStoreRecord[] = [];
    const openSeams: OpenSeam[] = [];
    const instructions: TemplateInstruction[] = [];
    const createdInstructions: TemplateInstruction[] = [];
    const targetDrafts: TargetDraft[] = [];
    const nestedSequenceDrafts: NestedSequenceDraft[] = [];
    const nodesByProduct = new Map(input.html.nodes.map((node) => [node.productHandle, node]));
    const attributesByProduct = new Map(input.html.attributes.map((attribute) => [attribute.productHandle, attribute]));
    const syntaxByProduct = new Map(input.attributeSyntax.syntaxes.map((syntax) => [syntax.productHandle, syntax]));
    const classificationsByOwner = classificationsByOwnerProduct(input.attributeClassification.classifications);
    const commandInstructions = commandInstructionsByClassification(input);
    const parseBySite = expressionParsesBySite(input);
    const valueSiteByClassification = valueSitesByClassification(input);
    const textValueSiteByNode = textValueSitesByNode(input.valueSites.sites);
    const ownersByElement = ownerElementsByProduct(input.html);
    const templateControllerChildSequences = new Map<ProductHandle, {
      readonly productHandle: ProductHandle;
      readonly identityHandle: IdentityHandle;
    }>();
    let instructionIndex = 0;
    let rowIndex = 0;

    const addOpenSeam = (
      local: string,
      summary: string,
      addressHandle: AddressHandle | null,
      seamKindKey: OpenSeamKindKey = KernelVocabulary.Instruction.OpenInstruction.key,
    ): void => {
      const seam = new OpenSeam(
        this.store.handles.openSeam(`compiled-template:${input.localKey}:assembly:${local}`),
        seamKindKey,
        summary,
        addressHandle,
        source.evidenceHandle,
      );
      openSeams.push(seam);
      records.push(seam);
    };

    const createInstruction = <TInstruction extends TemplateInstruction>(
      local: string,
      kind: TemplateInstructionKind,
      ownerIdentityHandle: IdentityHandle,
      addressHandle: AddressHandle | null,
      factory: (productHandle: ProductHandle, identityHandle: IdentityHandle, instructionLocal: string) => TInstruction,
    ): TInstruction => {
      const instructionLocal = `compiled-template:${input.localKey}:instruction:${instructionIndex++}:${local}`;
      const productHandle = this.store.handles.product(instructionLocal);
      const identityHandle = this.store.handles.identity(instructionLocal);
      const instruction = factory(productHandle, identityHandle, instructionLocal);
      instructions.push(instruction);
      createdInstructions.push(instruction);
      records.push(
        new InstructionIdentity(
          identityHandle,
          ownerIdentityHandle,
          instructionKindKeyFor(kind),
        ),
      );
      return instruction;
    };

    const addExistingInstruction = (instruction: TemplateInstruction): TemplateInstruction => {
      instructions.push(instruction);
      return instruction;
    };

    const fieldProvenance = <TField extends string>(
      fields: readonly (TField | null)[],
    ): readonly FieldProvenance<TField>[] =>
      compactFieldProvenance(fields.map((field) =>
        field == null ? null : new FieldProvenance(field, source.provenanceHandle)
      ));

    const emitRootRow = (
      local: string,
      node: HtmlElement | HtmlText,
      rowInstructions: readonly TemplateInstruction[],
      targetKind = TemplateRenderTargetKind.MarkerTarget,
    ): void => {
      if (rowInstructions.length === 0) {
        return;
      }
      targetDrafts.push(new TargetDraft(
        `${rowIndex++}:${local}`,
        targetKind,
        node,
        rowInstructions,
      ));
    };

    const emitNestedRow = (
      nestedInstructions: TemplateInstruction[],
    ) => (
      _local: string,
      _node: HtmlElement | HtmlText,
      rowInstructions: readonly TemplateInstruction[],
      _targetKind = TemplateRenderTargetKind.MarkerTarget,
    ): void => {
      nestedInstructions.push(...rowInstructions);
    };

    const addNestedSequenceDraft = (
      ownerInstruction: HydrateTemplateControllerInstruction,
      sequenceInstructions: readonly TemplateInstruction[],
    ): void => {
      const sequence = templateControllerChildSequences.get(ownerInstruction.productHandle);
      if (sequence == null) {
        return;
      }
      nestedSequenceDrafts.push(new NestedSequenceDraft(
        sequence.productHandle,
        sequence.identityHandle,
        ownerInstruction.productHandle,
        ownerInstruction.identityHandle,
        ownerInstruction.sourceAddressHandle,
        sequenceInstructions,
      ));
    };

    const visitNode = (
      nodeRef: { readonly productHandle: ProductHandle | null },
      emitRow = emitRootRow,
    ): void => {
      const node = nodeRef.productHandle == null
        ? null
        : nodesByProduct.get(nodeRef.productHandle) ?? null;
      if (node instanceof HtmlText) {
        const site = textValueSiteByNode.get(node.productHandle) ?? null;
        const parse = site == null ? null : parseBySite.get(site.productHandle) ?? null;
        if (parse != null && parse.resultKind !== ExpressionParseResultKind.InterpolationAbsent) {
          emitRow(
            `text:${node.productHandle}`,
            node,
            [
              createInstruction(
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
                  fieldProvenance<TemplateInstructionField>(['node', 'expression', 'source']),
                ),
              ),
            ],
          );
        }
        return;
      }

      if (!(node instanceof HtmlElement)) {
        return;
      }

      if (node.tagName.toLowerCase() === 'let') {
        const letInstructions = letBindingInstructionsForElement(node);
        if (letInstructions.length > 0) {
          emitRow(
            `let:${node.productHandle}`,
            node,
            [
              createInstruction(
                `hydrate-let:${node.productHandle}`,
                TemplateInstructionKind.HydrateLetElement,
                node.identityHandle,
                node.sourceAddressHandle,
                (productHandle, identityHandle) => new HydrateLetElementInstruction(
                  productHandle,
                  identityHandle,
                  node.toReference(),
                  letInstructions.map((instruction) => instruction.productHandle),
                  hasAttribute(ownersByElement.get(node.productHandle) ?? null, 'to-binding-context'),
                  node.sourceAddressHandle,
                  fieldProvenance<TemplateInstructionField>(['node', 'instructions', 'toBindingContext', 'source']),
                ),
              ),
            ],
          );
        }
        return;
      }

      const owner = ownersByElement.get(node.productHandle) ?? null;
      const classifications = classificationsByOwner.get(node.productHandle) ?? [];
      const elementResolution = input.compilerWorld.resourceResolver.el(elementLookupName(node, owner));
      const elementDefinition = elementResolution?.definition instanceof CustomElementDefinition
        ? elementResolution.definition
        : null;
      const elementInstructions: TemplateInstruction[] = [];
      const attributeInstructions: TemplateInstruction[] = [];
      const plainInstructions: TemplateInstruction[] = [];
      const templateControllerInstructions: HydrateTemplateControllerInstruction[] = [];
      const bindableInstructions: TemplateInstruction[] = [];
      const capturedSyntaxProductHandles: ProductHandle[] = [];
      const hasProcessContentHook = elementDefinition?.processContent != null;

      if (hasProcessContentHook) {
        addOpenSeam(
          `process-content:${node.productHandle}`,
          `Custom element '${elementDefinition.name}' has a processContent hook; child DOM compilation is held open because the hook may mutate, remove, or decline compilation of the authored content.`,
          node.sourceAddressHandle,
          KernelVocabulary.Compiler.OpenProcessContentHook.key,
        );
      }

      for (const classification of classifications) {
        const syntax = syntaxByProduct.get(classification.syntaxProductHandle) ?? null;
        const attribute = syntax?.attribute.productHandle == null
          ? null
          : attributesByProduct.get(syntax.attribute.productHandle) ?? null;
        const commandBuilt = commandInstructions.get(classification.productHandle) ?? [];
        if (commandBuilt.length > 0) {
          commandBuilt.forEach((instruction) => addExistingInstruction(instruction));
        }

        switch (classification.classificationKind) {
          case AttributeClassificationKind.Bindable:
          case AttributeClassificationKind.Spread:
            bindableInstructions.push(...commandBuilt);
            if (commandBuilt.length === 0) {
              const instruction = valueInstructionForClassification(
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
          case AttributeClassificationKind.CustomAttribute: {
            const props = commandBuilt.length > 0
              ? commandBuilt
              : nullableInstruction(valueInstructionForClassification(classification, syntax, attribute, node, 'custom-attribute'));
            attributeInstructions.push(createHydrateAttributeInstruction(classification, syntax, attribute, node, props));
            break;
          }
          case AttributeClassificationKind.TemplateController: {
            const props = commandBuilt.length > 0
              ? commandBuilt
              : nullableInstruction(valueInstructionForClassification(classification, syntax, attribute, node, 'template-controller'));
            templateControllerInstructions.push(createTemplateControllerInstruction(classification, syntax, attribute, node, props));
            break;
          }
          case AttributeClassificationKind.Plain:
            if (commandBuilt.length > 0) {
              plainInstructions.push(...commandBuilt);
            } else {
              const instruction = valueInstructionForClassification(classification, syntax, attribute, node, 'plain');
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

      if (elementDefinition != null) {
        elementInstructions.push(createInstruction(
          `hydrate-element:${node.productHandle}`,
          TemplateInstructionKind.HydrateElement,
          elementDefinition.identityHandle ?? node.identityHandle,
          node.sourceAddressHandle,
          (productHandle, identityHandle) => new HydrateElementInstruction(
            productHandle,
            identityHandle,
            node.toReference(),
            elementDefinition.name,
            elementDefinition.productHandle,
            null,
            bindableInstructions.map((instruction) => instruction.productHandle),
            capturedSyntaxProductHandles,
            elementDefinition.containerless || hasAttribute(owner, 'containerless'),
            node.sourceAddressHandle,
            fieldProvenance<TemplateInstructionField>([
              'node',
              'definition',
              'instructions',
              capturedSyntaxProductHandles.length === 0 ? null : 'captures',
              'source',
            ]),
          ),
        ));
      }

      const directRow = [
        ...elementInstructions,
        ...attributeInstructions,
        ...plainInstructions,
      ];
      const shouldCompileChildren = elementDefinition == null
        || (!elementDefinition.containerless && !hasAttribute(owner, 'containerless') && !hasProcessContentHook);

      if (templateControllerInstructions.length > 0) {
        const innermostInstructions: TemplateInstruction[] = [...directRow];
        if (!shouldCompileChildren && !hasProcessContentHook && node.children.length > 0) {
          addOpenSeam(
            `containerless-children:${node.productHandle}`,
            `Custom element '${elementDefinition?.name ?? node.tagName}' is containerless; child content/projection compilation is held open until projection ownership is modeled.`,
            node.sourceAddressHandle,
            KernelVocabulary.Compiler.OpenContentProjection.key,
          );
        }
        if (shouldCompileChildren) {
          const nestedRow = emitNestedRow(innermostInstructions);
          for (const child of node.children) {
            visitNode(child, nestedRow);
          }
        }
        let childInstructions: readonly TemplateInstruction[] = innermostInstructions;
        for (let index = templateControllerInstructions.length - 1; index >= 0; --index) {
          const instruction = templateControllerInstructions[index]!;
          addNestedSequenceDraft(instruction, childInstructions);
          childInstructions = [instruction];
        }
        emitRow(`template-controller:${node.productHandle}`, node, [templateControllerInstructions[0]!], TemplateRenderTargetKind.RenderLocation);
        return;
      }

      emitRow(`element:${node.productHandle}`, node, directRow);

      if (!shouldCompileChildren && !hasProcessContentHook && node.children.length > 0) {
        addOpenSeam(
          `containerless-children:${node.productHandle}`,
          `Custom element '${elementDefinition?.name ?? node.tagName}' is containerless; child content/projection compilation is held open until projection ownership is modeled.`,
          node.sourceAddressHandle,
          KernelVocabulary.Compiler.OpenContentProjection.key,
        );
        return;
      }

      for (const child of node.children) {
        visitNode(child, emitRow);
      }
    };

    const letBindingInstructionsForElement = (node: HtmlElement): readonly LetBindingInstruction[] => {
      const owner = ownersByElement.get(node.productHandle) ?? null;
      if (owner == null) {
        return [];
      }
      const result: LetBindingInstruction[] = [];
      for (const attribute of owner.attributes) {
        if (attribute.rawName === 'to-binding-context') {
          continue;
        }
        const syntax = input.attributeSyntax.syntaxes.find((candidate) =>
          candidate.attribute.productHandle === attribute.productHandle
        ) ?? null;
        if (syntax == null) {
          continue;
        }
        const classification = input.attributeClassification.classifications.find((candidate) =>
          candidate.syntaxProductHandle === syntax.productHandle
        ) ?? null;
        const site = classification == null ? null : valueSiteByClassification.get(classification.productHandle) ?? null;
        const commandInstruction = classification == null
          ? null
          : commandInstructions.get(classification.productHandle)?.[0] ?? null;
        const expressionHandle = commandInstruction instanceof PropertyBindingInstruction
          ? commandInstruction.expressionProductHandle
          : site == null ? null : parseBySite.get(site.productHandle)?.productHandle ?? null;
        result.push(createInstruction(
          `let-binding:${attribute.productHandle}`,
          TemplateInstructionKind.LetBinding,
          syntax.identityHandle,
          attribute.valueAddressHandle ?? attribute.sourceAddressHandle,
          (productHandle, identityHandle) => new LetBindingInstruction(
            productHandle,
            identityHandle,
            node.toReference(),
            attribute.toReference(),
            camelCase(syntax.target),
            expressionHandle,
            attribute.valueAddressHandle ?? attribute.sourceAddressHandle,
            fieldProvenance<TemplateInstructionField>(['node', 'attribute', 'target', 'expression', 'source']),
          ),
        ));
      }
      return result;
    };

    const valueInstructionForClassification = (
      classification: AttributeClassification,
      syntax: AttributeSyntax | null,
      attribute: HtmlAttribute | null,
      node: HtmlElement,
      lane: 'bindable' | 'custom-attribute' | 'template-controller' | 'plain',
    ): TemplateInstruction | null => {
      if (syntax == null || attribute == null) {
        return null;
      }
      const site = valueSiteByClassification.get(classification.productHandle) ?? null;
      if (site?.siteKind === TemplateValueSiteKind.MultiBindingValue) {
        return null;
      }
      const parse = site == null ? null : parseBySite.get(site.productHandle) ?? null;
      const bindable = classification.bindable;
      const customAttributeDefinition = classification.resource?.definition instanceof CustomAttributeDefinition
        ? classification.resource.definition
        : null;
      const target = lane === 'plain'
        ? mapAttribute(node, syntax.target) ?? camelCase(syntax.target)
        : bindable?.definition.name ?? customAttributeDefinition?.defaultProperty ?? syntax.target;
      const addressHandle = attribute.valueAddressHandle ?? attribute.sourceAddressHandle;
      if (parse == null || parse.resultKind === ExpressionParseResultKind.InterpolationAbsent) {
        if (lane === 'plain') {
          return null;
        }
        return createInstruction(
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
            fieldProvenance<TemplateInstructionField>(['node', 'attribute', 'target', 'value', 'source']),
          ),
        );
      }
      return createInstruction(
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
          fieldProvenance<TemplateInstructionField>(['node', 'attribute', 'target', 'expression', 'source']),
        ),
      );
    };

    const createHydrateAttributeInstruction = (
      classification: AttributeClassification,
      syntax: AttributeSyntax | null,
      attribute: HtmlAttribute | null,
      node: HtmlElement,
      props: readonly TemplateInstruction[],
    ): HydrateAttributeInstruction =>
      createInstruction(
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
          classification.resource?.definitionProductHandle ?? classification.resource?.resourceProductHandle ?? null,
          props.map((instruction) => instruction.productHandle),
          classification.sourceAddressHandle,
          fieldProvenance<TemplateInstructionField>(['node', 'attribute', 'resource', 'instructions', 'source']),
        ),
      );

    const createTemplateControllerInstruction = (
      classification: AttributeClassification,
      syntax: AttributeSyntax | null,
      attribute: HtmlAttribute | null,
      node: HtmlElement,
      props: readonly TemplateInstruction[],
    ): HydrateTemplateControllerInstruction =>
      createInstruction(
        `hydrate-template-controller:${classification.productHandle}`,
        TemplateInstructionKind.HydrateTemplateController,
        classification.identityHandle,
        classification.sourceAddressHandle,
        (productHandle, identityHandle, instructionLocal) => {
          const childSequenceProductHandle = this.store.handles.product(`${instructionLocal}:child-sequence`);
          const childSequenceIdentityHandle = this.store.handles.identity(`${instructionLocal}:child-sequence`);
          templateControllerChildSequences.set(productHandle, {
            productHandle: childSequenceProductHandle,
            identityHandle: childSequenceIdentityHandle,
          });
          return new HydrateTemplateControllerInstruction(
            productHandle,
            identityHandle,
            node.toReference(),
            attribute?.toReference() ?? syntax?.attribute ?? { productHandle: null, addressHandle: classification.sourceAddressHandle, rawName: null },
            syntax?.target ?? classification.resource?.name ?? '(unknown)',
            classification.resource?.definitionProductHandle ?? classification.resource?.resourceProductHandle ?? null,
            childSequenceProductHandle,
            props.map((instruction) => instruction.productHandle),
            classification.sourceAddressHandle,
            fieldProvenance<TemplateInstructionField>(['node', 'attribute', 'resource', 'children', 'instructions', 'source']),
          );
        },
      );

    for (const root of input.html.document.rootNodes) {
      visitNode(root);
    }

    return new CompiledTemplateAssembly(
      targetDrafts,
      nestedSequenceDrafts,
      instructions,
      createdInstructions,
      records,
      openSeams,
    );
  }

  private recordsForSource(input: CompiledTemplateMaterializationInput): CompiledTemplateSourceSet {
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
  input: CompiledTemplateMaterializationInput,
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
  input: CompiledTemplateMaterializationInput,
): ReadonlyMap<ProductHandle, TemplateExpressionParse> {
  return new Map([
    ...input.valueSites.parses,
    ...input.bindingCommandLowering.expressionParses,
  ].map((parse) => [parse.site.productHandle, parse]));
}

function valueSitesByClassification(
  input: CompiledTemplateMaterializationInput,
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

function nullableInstruction(
  instruction: TemplateInstruction | null,
): readonly TemplateInstruction[] {
  return instruction == null ? [] : [instruction];
}

function camelCase(value: string): string {
  return value.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

function mapAttribute(
  element: HtmlElement,
  attr: string,
): string | null {
  const tagName = element.tagName.toUpperCase();
  const lowerAttr = attr.toLowerCase();
  const tagMapping = tagName === 'LABEL' && lowerAttr === 'for'
    ? 'htmlFor'
    : tagName === 'IMG' && lowerAttr === 'usemap'
      ? 'useMap'
      : tagName === 'INPUT'
        ? inputAttributeMapping(lowerAttr)
        : (tagName === 'TEXTAREA' && lowerAttr === 'maxlength')
          ? 'maxLength'
          : (tagName === 'TD' || tagName === 'TH')
            ? tableCellAttributeMapping(lowerAttr)
            : null;
  return tagMapping
    ?? globalAttributeMapping(lowerAttr)
    ?? (lowerAttr.startsWith('data-') ? attr : null);
}

function inputAttributeMapping(attr: string): string | null {
  switch (attr) {
    case 'maxlength':
      return 'maxLength';
    case 'minlength':
      return 'minLength';
    case 'formaction':
      return 'formAction';
    case 'formenctype':
      return 'formEncType';
    case 'formmethod':
      return 'formMethod';
    case 'formnovalidate':
      return 'formNoValidate';
    case 'formtarget':
      return 'formTarget';
    case 'inputmode':
      return 'inputMode';
    default:
      return null;
  }
}

function tableCellAttributeMapping(attr: string): string | null {
  switch (attr) {
    case 'rowspan':
      return 'rowSpan';
    case 'colspan':
      return 'colSpan';
    default:
      return null;
  }
}

function globalAttributeMapping(attr: string): string | null {
  switch (attr) {
    case 'accesskey':
      return 'accessKey';
    case 'contenteditable':
      return 'contentEditable';
    case 'tabindex':
      return 'tabIndex';
    case 'textcontent':
      return 'textContent';
    case 'innerhtml':
      return 'innerHTML';
    case 'scrolltop':
      return 'scrollTop';
    case 'scrollleft':
      return 'scrollLeft';
    case 'readonly':
      return 'readOnly';
    default:
      return null;
  }
}

function instructionKindKeyFor(
  kind: TemplateInstructionKind,
): InstructionKindKey {
  switch (kind) {
    case TemplateInstructionKind.HydrateElement:
      return KernelVocabulary.Instruction.HydrateElement.key;
    case TemplateInstructionKind.HydrateAttribute:
      return KernelVocabulary.Instruction.HydrateAttribute.key;
    case TemplateInstructionKind.HydrateTemplateController:
      return KernelVocabulary.Instruction.HydrateTemplateController.key;
    case TemplateInstructionKind.PropertyBinding:
      return KernelVocabulary.Instruction.PropertyBinding.key;
    case TemplateInstructionKind.Interpolation:
      return KernelVocabulary.Instruction.Interpolation.key;
    case TemplateInstructionKind.ListenerBinding:
      return KernelVocabulary.Instruction.ListenerBinding.key;
    case TemplateInstructionKind.IteratorBinding:
      return KernelVocabulary.Instruction.IteratorBinding.key;
    case TemplateInstructionKind.RefBinding:
      return KernelVocabulary.Instruction.RefBinding.key;
    case TemplateInstructionKind.LetBinding:
      return KernelVocabulary.Instruction.LetBinding.key;
    case TemplateInstructionKind.TextBinding:
      return KernelVocabulary.Instruction.TextBinding.key;
    case TemplateInstructionKind.AttributeBinding:
      return KernelVocabulary.Instruction.AttributeBinding.key;
    case TemplateInstructionKind.MultiAttr:
      return KernelVocabulary.Instruction.MultiAttr.key;
    case TemplateInstructionKind.SetProperty:
      return KernelVocabulary.Instruction.SetProperty.key;
    case TemplateInstructionKind.SetAttribute:
      return KernelVocabulary.Instruction.SetAttribute.key;
    case TemplateInstructionKind.SetClassAttribute:
      return KernelVocabulary.Instruction.SetClassAttribute.key;
    case TemplateInstructionKind.SetStyleAttribute:
      return KernelVocabulary.Instruction.SetStyleAttribute.key;
    case TemplateInstructionKind.StylePropertyBinding:
      return KernelVocabulary.Instruction.StylePropertyBinding.key;
    case TemplateInstructionKind.HydrateLetElement:
      return KernelVocabulary.Instruction.HydrateLetElement.key;
    case TemplateInstructionKind.SpreadTransferedBinding:
      return KernelVocabulary.Instruction.SpreadTransferedBinding.key;
    case TemplateInstructionKind.SpreadElementPropBinding:
      return KernelVocabulary.Instruction.SpreadElementPropBinding.key;
    case TemplateInstructionKind.SpreadValueBinding:
      return KernelVocabulary.Instruction.SpreadValueBinding.key;
    case TemplateInstructionKind.TranslationBinding:
      return KernelVocabulary.Instruction.TranslationBinding.key;
    case TemplateInstructionKind.TranslationBindBinding:
      return KernelVocabulary.Instruction.TranslationBindBinding.key;
    case TemplateInstructionKind.TranslationParametersBinding:
      return KernelVocabulary.Instruction.TranslationParametersBinding.key;
    case TemplateInstructionKind.StateBinding:
      return KernelVocabulary.Instruction.StateBinding.key;
    case TemplateInstructionKind.DispatchBinding:
      return KernelVocabulary.Instruction.DispatchBinding.key;
    case TemplateInstructionKind.Open:
      throw new Error('Open instruction kind is a seam kind and cannot be materialized as an instruction product.');
  }
}

function claimsForProduct(
  claims: readonly SemanticClaim[],
  product: ProductHandle,
): readonly SemanticClaim[] {
  return claims.filter((claim) =>
    claim.subjectHandle === product
    || claim.objectHandle === product
  );
}
