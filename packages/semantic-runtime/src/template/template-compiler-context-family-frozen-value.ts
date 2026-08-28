import type { ProvenanceHandle } from '../kernel/handles.js';
import { MaterializedProduct } from '../kernel/materialization.js';
import { bindProductDetailEnvelope } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  CompiledTemplate,
  CompiledTemplateContext,
  CompiledTemplateContextRole,
  CompiledTemplateState,
  TemplateRenderTarget,
} from './compiled-template.js';
import { TemplateCompilerTargetContextRole } from './compiler-target-plan.js';
import type {
  TemplateCompilerContextFamilyFreezeContextPreparation,
  TemplateCompilerContextFamilyFreezeNodeReservation,
  TemplateCompilerContextFamilyFreezePreparation,
  TemplateCompilerContextFamilyFreezeTargetRowReservation,
} from './template-compiler-context-family-freeze.js';
import {
  TemplateCompilerAttributeDetachmentMutation,
  TemplateCompilerNodeDetachmentMutation,
} from './template-compiler-execution.js';
import {
  type TemplateCompilerAttributeOccurrence,
  TemplateCompilerCommentOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerFragmentOccurrence,
  type TemplateCompilerNodeOccurrence,
  TemplateCompilerTextOccurrence,
  TemplateCompilerGeneratedOccurrenceRole,
} from './template-compiler-occurrence.js';
import {
  type TemplateCompilerLiveAllocationSnapshot,
  type TemplateCompilerLiveProductReservation,
} from './template-compiler-live-allocation.js';
import {
  instructionReferencesFor,
  type TemplateInstruction,
  TemplateInstructionSequence,
} from './instruction-ir.js';
import {
  CompilerTransformedTemplateAttribute,
  CompilerTransformedTemplateComment,
  CompilerTransformedTemplateElement,
  CompilerTransformedTemplateFragment,
  type CompilerTransformedTemplateNode,
  CompilerTransformedTemplateText,
  CompilerTransformedTemplateTree,
  CompilerTransformedTextKind,
  TemplateStructuralAttributeReference,
  TemplateStructuralNodeReference,
  TemplateStructuralTreeKind,
  TemplateStructuralTreeReference,
} from './template-structure.js';
import {
  TemplateStructureDerivation,
  TemplateStructureDerivationAuthority,
  TemplateStructureDerivationTerm,
  TemplateStructureReference,
} from './template-structure-derivation.js';

const frozenContextFamilyAuthority = {};
const frozenValues = new WeakMap<
  TemplateCompilerContextFamilyFreezePreparation,
  TemplateCompilerContextFamilyFrozenValue
>();

export const enum TemplateCompilerContextFamilyFrozenValueState {
  Exact = 'exact',
  Pending = 'pending',
  Ineligible = 'ineligible',
}

export const enum TemplateCompilerContextFamilyFrozenValueReasonKind {
  ForeignPreparation = 'foreign-preparation',
  StalePreparation = 'stale-preparation',
  EffectiveCaptureMaterializationPending = 'effective-capture-materialization-pending',
  NativeSlotMaterializationPending = 'native-slot-materialization-pending',
}

export class TemplateCompilerContextFamilyFrozenValueReason {
  constructor(
    readonly reasonKind: TemplateCompilerContextFamilyFrozenValueReasonKind,
    readonly summary: string,
    readonly stableKeys: readonly string[] = [],
  ) {}
}

export class TemplateCompilerContextFamilyFrozenRow {
  constructor(
    readonly preparation: TemplateCompilerContextFamilyFreezeTargetRowReservation,
    readonly target: TemplateRenderTarget,
    readonly sequence: TemplateInstructionSequence,
  ) {
    if (
      target.productHandle !== preparation.targetReservation.productHandle
      || target.identityHandle !== preparation.targetReservation.identityHandle
      || sequence.productHandle !== preparation.sequenceReservation.productHandle
      || sequence.identityHandle !== preparation.sequenceReservation.identityHandle
      || target.instructionSequenceProductHandle !== sequence.productHandle
      || sequence.ownerProductHandle !== target.productHandle
    ) {
      throw new Error(`Frozen row '${preparation.row.localKey}' lost target or sequence reservation authority.`);
    }
  }
}

export class TemplateCompilerContextFamilyFrozenContext {
  readonly nodeByOccurrence: ReadonlyMap<TemplateCompilerNodeOccurrence, CompilerTransformedTemplateNode>;
  readonly attributeByOccurrence: ReadonlyMap<
    TemplateCompilerAttributeOccurrence,
    CompilerTransformedTemplateAttribute
  >;

  constructor(
    readonly preparation: TemplateCompilerContextFamilyFreezeContextPreparation,
    readonly tree: CompilerTransformedTemplateTree,
    readonly nodes: readonly CompilerTransformedTemplateNode[],
    readonly attributes: readonly CompilerTransformedTemplateAttribute[],
    readonly rows: readonly TemplateCompilerContextFamilyFrozenRow[],
    readonly compiledTemplate: CompiledTemplate,
  ) {
    this.nodeByOccurrence = new Map(preparation.nodes.map((node, ordinal) => [node.occurrence, nodes[ordinal]!] as const));
    this.attributeByOccurrence = new Map(
      preparation.attributes.map((attribute, ordinal) => [attribute.occurrence, attributes[ordinal]!] as const),
    );
    if (
      nodes.length !== preparation.nodes.length
      || attributes.length !== preparation.attributes.length
      || rows.length !== preparation.rows.length
      || nodes.some((node, ordinal) =>
        node.productHandle !== preparation.nodes[ordinal]?.reservation.productHandle
        || node.identityHandle !== preparation.nodes[ordinal]?.reservation.identityHandle
      )
      || attributes.some((attribute, ordinal) =>
        attribute.productHandle !== preparation.attributes[ordinal]?.reservation.productHandle
        || attribute.identityHandle !== preparation.attributes[ordinal]?.reservation.identityHandle
      )
      || rows.some((row, ordinal) => row.preparation !== preparation.rows[ordinal])
      || tree.productHandle !== preparation.treeReservation.productHandle
      || compiledTemplate.productHandle !== preparation.context.compiledTemplate.productHandle
      || compiledTemplate.transformedTree?.productHandle !== tree.productHandle
      || compiledTemplate.targets.length !== rows.length
      || compiledTemplate.targets.some((target, ordinal) => target !== rows[ordinal]?.target)
      || this.nodeByOccurrence.size !== nodes.length
      || this.attributeByOccurrence.size !== attributes.length
    ) {
      throw new Error(`Frozen context '${preparation.context.localKey}' lost tree, row, or compiled-template coverage.`);
    }
  }
}

/** Consumer-neutral in-process final compiler value over existing semantic-runtime products. */
export class TemplateCompilerContextFamilyFrozenValue {
  readonly #authority: object;
  readonly contextByTarget: ReadonlyMap<
    TemplateCompilerContextFamilyFreezeContextPreparation['context'],
    TemplateCompilerContextFamilyFrozenContext
  >;

  constructor(
    authority: object,
    readonly preparation: TemplateCompilerContextFamilyFreezePreparation,
    readonly provenanceHandle: ProvenanceHandle,
    readonly contexts: readonly TemplateCompilerContextFamilyFrozenContext[],
    readonly derivations: readonly TemplateStructureDerivation[],
    readonly committedAllocation: TemplateCompilerLiveAllocationSnapshot,
  ) {
    this.contextByTarget = new Map(contexts.map((context) => [context.preparation.context, context] as const));
    if (
      authority !== frozenContextFamilyAuthority
      || contexts.length !== preparation.contexts.length
      || contexts.some((context, ordinal) => context.preparation !== preparation.contexts[ordinal])
      || this.contextByTarget.size !== contexts.length
      || derivations.length !== preparation.derivations.length
      || derivations.some((derivation, ordinal) =>
        derivation.productHandle !== preparation.derivations[ordinal]?.reservation.productHandle
        || derivation.operationOrdinal !== preparation.derivations[ordinal]?.operation.executionOrdinal
      )
      || committedAllocation.prepared !== preparation.preparedAllocation
    ) {
      throw new Error('Frozen context family lost preparation, context, derivation, or allocation ownership.');
    }
    this.#authority = authority;
  }

  get root(): TemplateCompilerContextFamilyFrozenContext {
    return this.contexts[0]!;
  }

  get rootDefinition() {
    return binding(this.preparation).definition;
  }

  get compilerWorld() {
    return binding(this.preparation).compilerWorld;
  }

  get browserInput() {
    return browserEmission(this.preparation);
  }

  get compiledTemplates(): readonly CompiledTemplate[] {
    return this.contexts.map((context) => context.compiledTemplate);
  }

  get instructions(): readonly TemplateInstruction[] {
    const allocation = this.preparation.execution.attachment.target.allocation;
    return [...new Set([
      ...this.preparation.contexts.flatMap((context) =>
        context.context.readRows().flatMap((row) => row.instructions)
      ),
      ...allocation.hydrateTemplateControllers.flatMap((edge) => edge.draft.props),
      ...allocation.hydrateElements.flatMap((head) => head.draft.bindableInstructions),
    ])];
  }

  isModuleConstructed(): boolean {
    return this.#authority === frozenContextFamilyAuthority;
  }

  isCurrent(): boolean {
    const publication = browserEmission(this.preparation).publication;
    const compilerReads = this.preparation.execution.attachment.target.allocation.rows.receipt.compilerReads;
    return this.isModuleConstructed()
      && this.committedAllocation.isCurrent()
      && publication.isCurrent()
      && compilerReads.every((read) => read.validate().isCurrent);
  }
}

export class TemplateCompilerContextFamilyFrozenValueResult {
  constructor(
    readonly state: TemplateCompilerContextFamilyFrozenValueState,
    readonly value: TemplateCompilerContextFamilyFrozenValue | null,
    readonly reasons: readonly TemplateCompilerContextFamilyFrozenValueReason[],
  ) {
    const unavailable = state === TemplateCompilerContextFamilyFrozenValueState.Pending
      || state === TemplateCompilerContextFamilyFrozenValueState.Ineligible;
    if (
      (state === TemplateCompilerContextFamilyFrozenValueState.Exact)
        !== (value != null && reasons.length === 0)
      || unavailable !== (value == null && reasons.length > 0)
    ) {
      throw new Error('Context-family frozen-value result lost exact, pending, or ineligible ownership.');
    }
  }
}

/** Construct the complete in-process family and atomically expose its prepared handles. */
export function materializeTemplateCompilerContextFamilyFrozenValue(
  preparation: TemplateCompilerContextFamilyFreezePreparation,
): TemplateCompilerContextFamilyFrozenValueResult {
  if (!preparation.isModuleConstructed()) {
    return unavailable(
      TemplateCompilerContextFamilyFrozenValueState.Ineligible,
      TemplateCompilerContextFamilyFrozenValueReasonKind.ForeignPreparation,
      'Context-family frozen value requires one module-constructed freeze preparation.',
    );
  }
  const existing = frozenValues.get(preparation) ?? null;
  if (existing != null) {
    return existing.isCurrent()
      ? new TemplateCompilerContextFamilyFrozenValueResult(
          TemplateCompilerContextFamilyFrozenValueState.Exact,
          existing,
          [],
        )
      : unavailable(
          TemplateCompilerContextFamilyFrozenValueState.Ineligible,
          TemplateCompilerContextFamilyFrozenValueReasonKind.StalePreparation,
          'Frozen context family is no longer current.',
        );
  }
  if (!preparation.isCurrent()) {
    return unavailable(
      TemplateCompilerContextFamilyFrozenValueState.Ineligible,
      TemplateCompilerContextFamilyFrozenValueReasonKind.StalePreparation,
      'Context-family freeze preparation is stale before value construction.',
    );
  }
  const pendingReasons: TemplateCompilerContextFamilyFrozenValueReason[] = [];
  if (preparation.effectiveCaptureReservations.length > 0) {
    pendingReasons.push(new TemplateCompilerContextFamilyFrozenValueReason(
      TemplateCompilerContextFamilyFrozenValueReasonKind.EffectiveCaptureMaterializationPending,
      'Effective captured syntax must materialize before the compiled definition family can freeze.',
      preparation.effectiveCaptureReservations.map((reservation) => reservation.local),
    ));
  }
  if (preparation.rootState.nativeSlots.length > 0) {
    pendingReasons.push(new TemplateCompilerContextFamilyFrozenValueReason(
      TemplateCompilerContextFamilyFrozenValueReasonKind.NativeSlotMaterializationPending,
      'Native slot outlet name/value products must materialize before the root compiled definition can freeze.',
      preparation.rootState.nativeSlots.map((slot) => slot.element.occurrenceKey),
    ));
  }
  if (pendingReasons.length > 0) {
    return new TemplateCompilerContextFamilyFrozenValueResult(
      TemplateCompilerContextFamilyFrozenValueState.Pending,
      null,
      pendingReasons,
    );
  }

  const publication = browserEmission(preparation).publication;
  const provenanceHandle = publication.handles.provenance(
    `${preparation.preparedAllocation.ledger.rootSiteKey}:provenance`,
  );
  const contexts = preparation.contexts.map((context) => materializeContext(context, preparation, provenanceHandle));
  const nodeOutputs = new Map<TemplateCompilerNodeOccurrence, CompilerTransformedTemplateNode>();
  const attributeOutputs = new Map<TemplateCompilerAttributeOccurrence, CompilerTransformedTemplateAttribute>();
  for (const context of contexts) {
    for (const [occurrence, output] of context.nodeByOccurrence) nodeOutputs.set(occurrence, output);
    for (const [occurrence, output] of context.attributeByOccurrence) attributeOutputs.set(occurrence, output);
  }
  const derivations = materializeDerivations(
    preparation,
    nodeOutputs,
    attributeOutputs,
    structuralOutputRanks(contexts),
    provenanceHandle,
  );
  if (!preparation.isCurrent()) {
    return unavailable(
      TemplateCompilerContextFamilyFrozenValueState.Ineligible,
      TemplateCompilerContextFamilyFrozenValueReasonKind.StalePreparation,
      'Context-family freeze preparation changed during value construction.',
    );
  }
  const committedAllocation = preparation.preparedAllocation.ledger.commitPrepared(preparation.preparedAllocation);
  const value = new TemplateCompilerContextFamilyFrozenValue(
    frozenContextFamilyAuthority,
    preparation,
    provenanceHandle,
    contexts,
    derivations,
    committedAllocation,
  );
  frozenValues.set(preparation, value);
  return new TemplateCompilerContextFamilyFrozenValueResult(
    TemplateCompilerContextFamilyFrozenValueState.Exact,
    value,
    [],
  );
}

function materializeContext(
  context: TemplateCompilerContextFamilyFreezeContextPreparation,
  family: TemplateCompilerContextFamilyFreezePreparation,
  provenanceHandle: ProvenanceHandle,
): TemplateCompilerContextFamilyFrozenContext {
  const treeReference = new TemplateStructuralTreeReference(
    context.treeReservation.productHandle,
    context.treeReservation.identityHandle,
    context.treeReservation.addressHandle,
    TemplateStructuralTreeKind.CompilerTransformed,
  );
  const nodeReferences = new Map(context.nodes.map((node) => [
    node.occurrence,
    new TemplateStructuralNodeReference(
      treeReference.productHandle,
      node.occurrence.nodeKind,
      node.reservation.productHandle,
      node.reservation.identityHandle,
      node.reservation.addressHandle,
    ),
  ] as const));
  const attributeReferences = new Map(context.attributes.map((attribute) => [
    attribute.occurrence,
    new TemplateStructuralAttributeReference(
      treeReference.productHandle,
      attribute.reservation.productHandle,
      attribute.reservation.identityHandle,
      attribute.browserInputAddressHandle,
      attribute.occurrence.name,
    ),
  ] as const));
  const attributes = context.attributes.map((attribute) => bindReservation(
    new CompilerTransformedTemplateAttribute(
      treeReference,
      nodeReferences.get(attribute.owner.occurrence)!,
      attribute.occurrence.name,
      attribute.occurrence.value,
      attribute.occurrence.namespaceUri,
      attribute.occurrence.prefix,
      [],
    ),
    attribute.reservation,
    KernelVocabulary.Template.StructuralAttribute.key,
    provenanceHandle,
    attribute.browserInputAddressHandle,
  ));
  const nodes = context.nodes.map((node) => materializeNode(
    node,
    treeReference,
    nodeReferences,
    attributeReferences,
    provenanceHandle,
  ));
  const tree = bindReservation(
    new CompilerTransformedTemplateTree(
      binding(family).source.toReference(),
      browserEmission(family).tree.toReference(),
      nodeReferences.get(context.structure.compilerCarrier)!,
      nodeReferences.get(context.structure.compilerContent)!,
      [],
    ),
    context.treeReservation,
    KernelVocabulary.Template.StructuralTree.key,
    provenanceHandle,
    context.treeReservation.addressHandle,
  );
  const rows = context.rows.map((row) => materializeRow(row, provenanceHandle));
  const compiledTemplate = bindCompiledTemplate(
    context,
    tree,
    rows,
    family,
    provenanceHandle,
  );
  return new TemplateCompilerContextFamilyFrozenContext(
    context,
    tree,
    nodes,
    attributes,
    rows,
    compiledTemplate,
  );
}

function materializeNode(
  node: TemplateCompilerContextFamilyFreezeNodeReservation,
  tree: TemplateStructuralTreeReference,
  nodeReferences: ReadonlyMap<TemplateCompilerNodeOccurrence, TemplateStructuralNodeReference>,
  attributeReferences: ReadonlyMap<TemplateCompilerAttributeOccurrence, TemplateStructuralAttributeReference>,
  provenanceHandle: ProvenanceHandle,
): CompilerTransformedTemplateNode {
  const occurrence = node.occurrence;
  const childReferences = occurrence instanceof TemplateCompilerElementOccurrence
    || occurrence instanceof TemplateCompilerFragmentOccurrence
    ? occurrence.readChildren().map((child) => nodeReferences.get(child)!)
    : [];
  let product: CompilerTransformedTemplateNode;
  if (occurrence instanceof TemplateCompilerFragmentOccurrence) {
    product = new CompilerTransformedTemplateFragment(tree, childReferences, []);
  } else if (occurrence instanceof TemplateCompilerElementOccurrence) {
    product = new CompilerTransformedTemplateElement(
      tree,
      occurrence.tagName,
      occurrence.namespace,
      occurrence.namespaceUri,
      occurrence.readAttributes().map((attribute) => attributeReferences.get(attribute)!),
      childReferences,
      occurrence.templateContent == null ? null : nodeReferences.get(occurrence.templateContent)!,
      [],
    );
  } else if (occurrence instanceof TemplateCompilerTextOccurrence) {
    product = new CompilerTransformedTemplateText(
      tree,
      occurrence.text,
      occurrence.generation?.role === TemplateCompilerGeneratedOccurrenceRole.BindingPlaceholder
        ? CompilerTransformedTextKind.BindingPlaceholder
        : CompilerTransformedTextKind.Ordinary,
      [],
    );
  } else if (occurrence instanceof TemplateCompilerCommentOccurrence) {
    product = new CompilerTransformedTemplateComment(
      tree,
      occurrence.text,
      occurrence.semanticKind,
      [],
    );
  } else {
    throw new Error(`Unsupported transformed occurrence '${occurrence.occurrenceKey}'.`);
  }
  return bindReservation(
    product,
    node.reservation,
    KernelVocabulary.Template.StructuralNode.key,
    provenanceHandle,
    node.reservation.addressHandle,
  );
}

function materializeRow(
  row: TemplateCompilerContextFamilyFreezeTargetRowReservation,
  provenanceHandle: ProvenanceHandle,
): TemplateCompilerContextFamilyFrozenRow {
  const sequence = bindReservation(
    new TemplateInstructionSequence(
      row.sequenceReservation.productHandle,
      row.sequenceReservation.identityHandle,
      row.targetReservation.productHandle,
      instructionReferencesFor(row.row.instructions),
      row.row.sourceAddressHandle,
    ),
    row.sequenceReservation,
    KernelVocabulary.Instruction.Sequence.key,
    provenanceHandle,
    row.row.sourceAddressHandle,
  );
  const target = bindReservation(
    new TemplateRenderTarget(
      row.targetReservation.productHandle,
      row.targetReservation.identityHandle,
      row.row.targetKind,
      row.row.node?.toReference() ?? null,
      sequence.productHandle,
      row.row.sourceAddressHandle,
      [],
    ),
    row.targetReservation,
    KernelVocabulary.Template.RenderTarget.key,
    provenanceHandle,
    row.row.sourceAddressHandle,
  );
  return new TemplateCompilerContextFamilyFrozenRow(row, target, sequence);
}

function bindCompiledTemplate(
  context: TemplateCompilerContextFamilyFreezeContextPreparation,
  tree: CompilerTransformedTemplateTree,
  rows: readonly TemplateCompilerContextFamilyFrozenRow[],
  family: TemplateCompilerContextFamilyFreezePreparation,
  provenanceHandle: ProvenanceHandle,
): CompiledTemplate {
  const reservation = family.execution.attachment.target.contextMappings.find((mapping) =>
    mapping.targetContext === context.context
  )?.definition.reservation ?? null;
  if (reservation == null) {
    throw new Error(`Context '${context.context.localKey}' lost compiled-template reservation.`);
  }
  const compilation = binding(family).compilation;
  const detail = new CompiledTemplate(
    reservation.productHandle,
    reservation.identityHandle,
    new CompiledTemplateContext(compiledContextRole(context.context.role)),
    compilation.html.document.productHandle,
    tree.toReference(),
    CompiledTemplateState.Complete,
    context.context.readCompilerReachableNodeProductHandles(),
    [],
    false,
    rows.map((row) => row.target),
    null,
    context.context.sourceAddressHandle ?? binding(family).source.sourceAddressHandle,
    [],
  );
  return bindProductDetailEnvelope(detail, new MaterializedProduct(
    reservation.productHandle,
    KernelVocabulary.Template.CompiledTemplate.key,
    reservation.identityHandle,
    detail.sourceAddressHandle,
    provenanceHandle,
  ));
}

function materializeDerivations(
  family: TemplateCompilerContextFamilyFreezePreparation,
  nodeOutputs: ReadonlyMap<TemplateCompilerNodeOccurrence, CompilerTransformedTemplateNode>,
  attributeOutputs: ReadonlyMap<TemplateCompilerAttributeOccurrence, CompilerTransformedTemplateAttribute>,
  outputRanks: ReadonlyMap<string, number>,
  provenanceHandle: ProvenanceHandle,
): readonly TemplateStructureDerivation[] {
  const forest = family.execution.attachment.execution.forest;
  const generatedNodes = new Map(forest.readNodes().flatMap((node) =>
    node.generation == null ? [] : [[node.generation, node] as const]
  ));
  const generatedAttributes = new Map(forest.readAttributes().flatMap((attribute) =>
    attribute.generation == null ? [] : [[attribute.generation, attribute] as const]
  ));
  const transfers = family.execution.attachment.structuralExecution.readInputNodeTransfers();
  return family.derivations.map((derivation) => {
    const operation = derivation.operation;
    const inputTerms: TemplateStructureDerivationTerm[] = [];
    const outputTerms: TemplateStructureDerivationTerm[] = [];
    for (const mutation of operation.mutationBatch.topologyMutations) {
      if (mutation instanceof TemplateCompilerNodeDetachmentMutation) {
        appendInputNode(inputTerms, mutation.node);
      } else if (mutation instanceof TemplateCompilerAttributeDetachmentMutation) {
        appendInputAttribute(inputTerms, mutation.attribute);
      }
    }
    for (const mutation of operation.mutationBatch.attributeValueMutations) {
      appendInputAttribute(inputTerms, mutation.attribute);
      appendOutputAttribute(outputTerms, mutation.attribute, attributeOutputs);
    }
    for (const generation of operation.mutationBatch.occurrenceGenerationReservations) {
      const node = generatedNodes.get(generation) ?? null;
      const attribute = generatedAttributes.get(generation) ?? null;
      if (node != null) appendOutputNode(outputTerms, node, nodeOutputs);
      else if (attribute != null) appendOutputAttribute(outputTerms, attribute, attributeOutputs);
      else throw new Error(`Operation '${operation.operationKey}' lost generated output occurrence.`);
    }
    for (const transfer of transfers) {
      if (
        transfer.startForestMutationRevision < operation.startForestMutationRevision
        || transfer.endForestMutationRevision > operation.endForestMutationRevision
      ) continue;
      appendInputNode(inputTerms, transfer.node);
      appendOutputNode(outputTerms, transfer.node, nodeOutputs);
    }
    const inputs = uniqueTerms(inputTerms);
    const outputs = [...uniqueTerms(outputTerms)].sort((left, right) => {
      const leftRank = outputRanks.get(structureKey(left.structure));
      const rightRank = outputRanks.get(structureKey(right.structure));
      if (leftRank == null || rightRank == null) {
        throw new Error(`Structural operation '${operation.operationKey}' has an unranked transformed output.`);
      }
      return leftRank - rightRank;
    });
    if (inputs.length === 0 && outputs.length === 0) {
      throw new Error(`Structural operation '${operation.operationKey}' produced an empty durable derivation.`);
    }
    const detail = new TemplateStructureDerivation(
      TemplateStructureDerivationAuthority.TemplateCompiler,
      inputs,
      outputs,
      operation.causeHandles,
      [],
      operation.executionOrdinal,
    );
    return bindProductDetailEnvelope(detail, new MaterializedProduct(
      derivation.reservation.productHandle,
      KernelVocabulary.Template.StructureDerivation.key,
      derivation.reservation.identityHandle,
      operation.sourceAddressHandle,
      provenanceHandle,
    ));
  });
}

function appendInputNode(
  terms: TemplateStructureDerivationTerm[],
  occurrence: TemplateCompilerNodeOccurrence,
): void {
  const input = occurrence.inputReference;
  if (input == null) return;
  terms.push(new TemplateStructureDerivationTerm(new TemplateStructureReference(
    KernelVocabulary.Template.StructuralNode.key,
    input.productHandle,
    input.identityHandle,
    input.addressHandle,
  ), input.addressHandle));
}

function appendInputAttribute(
  terms: TemplateStructureDerivationTerm[],
  occurrence: TemplateCompilerAttributeOccurrence,
): void {
  const input = occurrence.inputReference;
  if (input == null) return;
  terms.push(new TemplateStructureDerivationTerm(new TemplateStructureReference(
    KernelVocabulary.Template.StructuralAttribute.key,
    input.productHandle,
    input.identityHandle,
    input.addressHandle,
  ), input.addressHandle));
}

function appendOutputNode(
  terms: TemplateStructureDerivationTerm[],
  occurrence: TemplateCompilerNodeOccurrence,
  outputs: ReadonlyMap<TemplateCompilerNodeOccurrence, CompilerTransformedTemplateNode>,
): void {
  const output = outputs.get(occurrence) ?? null;
  if (output == null) return;
  terms.push(new TemplateStructureDerivationTerm(new TemplateStructureReference(
    KernelVocabulary.Template.StructuralNode.key,
    output.productHandle,
    output.identityHandle,
    output.sourceAddressHandle,
  )));
}

function appendOutputAttribute(
  terms: TemplateStructureDerivationTerm[],
  occurrence: TemplateCompilerAttributeOccurrence,
  outputs: ReadonlyMap<TemplateCompilerAttributeOccurrence, CompilerTransformedTemplateAttribute>,
): void {
  const output = outputs.get(occurrence) ?? null;
  if (output == null) return;
  terms.push(new TemplateStructureDerivationTerm(new TemplateStructureReference(
    KernelVocabulary.Template.StructuralAttribute.key,
    output.productHandle,
    output.identityHandle,
    output.sourceAddressHandle,
  )));
}

function uniqueTerms(terms: readonly TemplateStructureDerivationTerm[]): readonly TemplateStructureDerivationTerm[] {
  const seen = new Set<string>();
  return terms.filter((term) => {
    const key = structureKey(term.structure);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function structuralOutputRanks(
  contexts: readonly TemplateCompilerContextFamilyFrozenContext[],
): ReadonlyMap<string, number> {
  const ranks = new Map<string, number>();
  let rank = 0;
  for (const context of contexts) {
    for (const plannedNode of context.preparation.nodes) {
      const node = context.nodeByOccurrence.get(plannedNode.occurrence)!;
      ranks.set(`${KernelVocabulary.Template.StructuralNode.key}:${node.productHandle}`, rank++);
      for (const plannedAttribute of plannedNode.readAttributes()) {
        const attribute = context.attributeByOccurrence.get(plannedAttribute.occurrence)!;
        ranks.set(`${KernelVocabulary.Template.StructuralAttribute.key}:${attribute.productHandle}`, rank++);
      }
    }
  }
  return ranks;
}

function structureKey(structure: TemplateStructureReference): string {
  return `${structure.productKindKey}:${structure.productHandle}`;
}

function compiledContextRole(role: TemplateCompilerTargetContextRole): CompiledTemplateContextRole {
  switch (role) {
    case TemplateCompilerTargetContextRole.Root:
      return CompiledTemplateContextRole.Root;
    case TemplateCompilerTargetContextRole.TemplateController:
      return CompiledTemplateContextRole.TemplateController;
    case TemplateCompilerTargetContextRole.Projection:
      return CompiledTemplateContextRole.Projection;
  }
}

function bindReservation<TDetail>(
  detail: TDetail,
  reservation: TemplateCompilerLiveProductReservation,
  productKindKey: ConstructorParameters<typeof MaterializedProduct>[1],
  provenanceHandle: ProvenanceHandle,
  addressHandle: ConstructorParameters<typeof MaterializedProduct>[3],
): TDetail {
  return bindProductDetailEnvelope(detail, new MaterializedProduct(
    reservation.productHandle,
    productKindKey,
    reservation.identityHandle,
    addressHandle,
    provenanceHandle,
  ));
}

function binding(preparation: TemplateCompilerContextFamilyFreezePreparation) {
  return preparation.execution.attachment.target.allocation.rows.receipt.traversal.audit.transcript.binding;
}

function browserEmission(preparation: TemplateCompilerContextFamilyFreezePreparation) {
  return binding(preparation).browserEmission;
}

function unavailable(
  state: Exclude<TemplateCompilerContextFamilyFrozenValueState, TemplateCompilerContextFamilyFrozenValueState.Exact>,
  reasonKind: TemplateCompilerContextFamilyFrozenValueReasonKind,
  summary: string,
  stableKeys: readonly string[] = [],
): TemplateCompilerContextFamilyFrozenValueResult {
  return new TemplateCompilerContextFamilyFrozenValueResult(
    state,
    null,
    [new TemplateCompilerContextFamilyFrozenValueReason(reasonKind, summary, stableKeys)],
  );
}
