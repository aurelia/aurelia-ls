import type { ClaimEndpointHandle } from '../kernel/claim.js';
import type { ProductHandle } from '../kernel/handles.js';
import {
  HtmlCommentSemanticKind,
  HtmlElement,
  HtmlNamespaceKind,
  HtmlText,
  type HtmlNodeReference,
} from './html-ir.js';
import {
  TemplateCompilerProjectionContextStructuralAuthority,
  TemplateCompilerTargetContextRole,
  TemplateCompilerTargetRowPosture,
  TemplateCompilerTemplateControllerContextStructuralAuthority,
  type TemplateCompilerTargetContextPlan,
  type TemplateCompilerTargetPlan,
  type TemplateCompilerTargetRowPlan,
} from './compiler-target-plan.js';
import { TemplateRenderTargetKind } from './compiled-template.js';
import {
  HydrateElementInstruction,
  type HydrateElementProjectionContributor,
  HydrateElementProjectionContributorDisposition,
  HydrateTemplateControllerInstruction,
  TextBindingInstruction,
} from './instruction-ir.js';
import {
  TemplateCompilerCommentOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerFragmentOccurrence,
  TemplateCompilerGeneratedOccurrenceRole,
  TemplateCompilerOccurrenceEdgeKind,
  type TemplateCompilerOccurrenceGeneration,
  TemplateCompilerTextOccurrence,
} from './template-compiler-occurrence.js';
import type {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerNodeOccurrence,
  TemplateCompilerOccurrenceForest,
  TemplateCompilerParentOccurrence,
} from './template-compiler-occurrence.js';
import type {
  TemplateStructuralAttributeReference,
  TemplateStructuralNodeReference,
} from './template-structure.js';
import { TemplateCompilerForestMutationAuthority } from './template-compiler-mutation-authority.js';

const structuralExecutionForests = new WeakSet<TemplateCompilerOccurrenceForest>();

interface TemplateCompilerProjectionContributorInput {
  readonly host: TemplateCompilerElementOccurrence;
  readonly contributor: TemplateCompilerNodeOccurrence;
  readonly contributorProductHandle: ProductHandle;
}

/** One exact structural root assigned to an existing compiler target context. */
export class TemplateCompilerContextStructure {
  constructor(
    readonly context: TemplateCompilerTargetContextPlan,
    readonly compilerCarrier: TemplateCompilerElementOccurrence,
    readonly compilerContent: TemplateCompilerFragmentOccurrence,
  ) {}
}

/** Explicit context-local 1→0 disposition for one browser-effective input node. */
export class TemplateCompilerConsumedNodeDisposition {
  constructor(
    readonly context: TemplateCompilerTargetContextPlan,
    readonly node: TemplateCompilerNodeOccurrence,
    readonly inputReference: TemplateStructuralNodeReference,
    readonly authoredProductHandle: ProductHandle | null,
    /** Authored compiler-reachable slot filled by this removal; null for browser-only inputs. */
    readonly membershipOrdinal: number | null,
    /** Exact live structural edge at the consumption event. */
    readonly owner: TemplateCompilerFragmentOccurrence | TemplateCompilerElementOccurrence,
    readonly ownerEdgeKind: TemplateCompilerOccurrenceEdgeKind.Child,
    readonly ownerOrdinal: number,
    readonly eventOrdinal: number,
    readonly causeHandles: readonly ClaimEndpointHandle[],
  ) {}
}

/** Explicit context-local 1→0 disposition for one browser-effective input attribute. */
export class TemplateCompilerConsumedAttributeDisposition {
  constructor(
    readonly context: TemplateCompilerTargetContextPlan,
    readonly attribute: TemplateCompilerAttributeOccurrence,
    readonly inputReference: TemplateStructuralAttributeReference,
    readonly authoredProductHandle: ProductHandle | null,
    /** Exact live owner and ordinal at the consumption event, before later structural movement. */
    readonly owner: TemplateCompilerElementOccurrence,
    readonly ownerOrdinal: number,
    readonly eventOrdinal: number,
    readonly causeHandles: readonly ClaimEndpointHandle[],
  ) {}
}

/** One caused transfer of a retained browser-input node onto a target context's structural edge. */
export class TemplateCompilerInputNodeTransfer {
  constructor(
    readonly context: TemplateCompilerTargetContextPlan,
    readonly node: TemplateCompilerNodeOccurrence,
    readonly inputReference: TemplateStructuralNodeReference,
    readonly authoredProductHandle: ProductHandle | null,
    /** Direct authored context entrant whose seeded subtree admitted this node transfer. */
    readonly structuralEntrantProductHandle: ProductHandle,
    readonly sourceParent: TemplateCompilerParentOccurrence | null,
    readonly sourceEdgeKind: TemplateCompilerOccurrenceEdgeKind,
    readonly sourceOrdinal: number | null,
    readonly destinationParent: TemplateCompilerParentOccurrence | null,
    readonly destinationEdgeKind: Exclude<
      TemplateCompilerOccurrenceEdgeKind,
      TemplateCompilerOccurrenceEdgeKind.Detached | TemplateCompilerOccurrenceEdgeKind.TemplateContent
    >,
    readonly destinationOrdinal: number,
    readonly eventOrdinal: number,
    readonly causeHandles: readonly ClaimEndpointHandle[],
  ) {}
}

/** One caused 1→N replacement of a seeded text occurrence by compiler-generated text outputs. */
export class TemplateCompilerInputTextExpansion {
  constructor(
    readonly context: TemplateCompilerTargetContextPlan,
    readonly input: TemplateCompilerTextOccurrence,
    readonly inputReference: TemplateStructuralNodeReference,
    readonly sourceParent: TemplateCompilerParentOccurrence,
    readonly sourceOrdinal: number,
    readonly outputs: readonly TemplateCompilerTextOccurrence[],
    readonly eventOrdinal: number,
    readonly causeHandles: readonly ClaimEndpointHandle[],
  ) {}
}

export const enum TemplateCompilerTargetGeometryKind {
  Marker = 'marker',
  RenderLocation = 'render-location',
}

/** Exact `[marker, retained element/text target]` realization of one complete row. */
export class TemplateCompilerMarkerTargetGeometry {
  readonly geometryKind = TemplateCompilerTargetGeometryKind.Marker;

  constructor(
    readonly row: TemplateCompilerTargetRowPlan,
    readonly context: TemplateCompilerTargetContextPlan,
    readonly marker: TemplateCompilerCommentOccurrence,
    readonly target: TemplateCompilerElementOccurrence | TemplateCompilerTextOccurrence,
  ) {}

  get logicalTarget(): TemplateCompilerElementOccurrence | TemplateCompilerTextOccurrence {
    return this.target;
  }
}

/** Exact `[marker, au-start, au-end]` replacement realization; `au-end` is the runtime logical target. */
export class TemplateCompilerRenderLocationTargetGeometry {
  readonly geometryKind = TemplateCompilerTargetGeometryKind.RenderLocation;

  constructor(
    readonly row: TemplateCompilerTargetRowPlan,
    readonly context: TemplateCompilerTargetContextPlan,
    readonly marker: TemplateCompilerCommentOccurrence,
    readonly start: TemplateCompilerCommentOccurrence,
    readonly end: TemplateCompilerCommentOccurrence,
    /** Exact parent/slot where this geometry replaced or represented its logical source. */
    readonly realizedParent: TemplateCompilerFragmentOccurrence | TemplateCompilerElementOccurrence,
    readonly realizedOrdinal: number,
    /** Original element retained after replacement, or null for an outer controller template born as marker-only. */
    readonly replacedNode: TemplateCompilerElementOccurrence | null,
  ) {}

  get logicalTarget(): TemplateCompilerCommentOccurrence {
    return this.end;
  }
}

export type TemplateCompilerTargetGeometry =
  | TemplateCompilerMarkerTargetGeometry
  | TemplateCompilerRenderLocationTargetGeometry;

/**
 * Product-free join between mutable compiler structure and an admitted family of context-local target plans.
 *
 * The session does not interpret attributes, create instructions, allocate durable target products, freeze structural
 * products, or publish kernel records. It owns exact context roots, caused retained-input operations,
 * compiler-created occurrence authority, and physical marker geometry paired with rows that another compiler owner
 * already decided to emit.
 */
export class TemplateCompilerStructuralExecutionSession {
  static create(
    forest: TemplateCompilerOccurrenceForest,
    targetPlan: TemplateCompilerTargetPlan,
  ): TemplateCompilerStructuralExecutionSession {
    if (structuralExecutionForests.has(forest)) {
      throw new Error('Compiler occurrence forest already belongs to a structural execution session.');
    }
    return TemplateCompilerStructuralExecutionSession.createWithAuthority(
      forest,
      targetPlan,
      TemplateCompilerForestMutationAuthority.createForNormalizedReplay(forest),
    );
  }

  /** Forest-first execution creates the authority before target planning; structural replay borrows it here. */
  static createBorrowing(
    forest: TemplateCompilerOccurrenceForest,
    targetPlan: TemplateCompilerTargetPlan,
    mutationAuthority: TemplateCompilerForestMutationAuthority,
  ): TemplateCompilerStructuralExecutionSession {
    if (structuralExecutionForests.has(forest)) {
      throw new Error('Compiler occurrence forest already belongs to a structural execution session.');
    }
    if (mutationAuthority.forest !== forest) {
      throw new Error('Compiler structural execution cannot borrow another forest mutation authority.');
    }
    return TemplateCompilerStructuralExecutionSession.createWithAuthority(
      forest,
      targetPlan,
      mutationAuthority,
    );
  }

  private static createWithAuthority(
    forest: TemplateCompilerOccurrenceForest,
    targetPlan: TemplateCompilerTargetPlan,
    mutationAuthority: TemplateCompilerForestMutationAuthority,
  ): TemplateCompilerStructuralExecutionSession {
    const session = new TemplateCompilerStructuralExecutionSession(forest, mutationAuthority);
    session.admitTargetPlanFamily(targetPlan);
    session.bindContextStructure(
      targetPlan.root,
      forest.compilerCarrier,
      forest.compilerContent,
    );
    structuralExecutionForests.add(forest);
    return session;
  }

  private readonly targetPlans: TemplateCompilerTargetPlan[] = [];
  private readonly targetPlansByLocalKey = new Map<string, TemplateCompilerTargetPlan>();
  private readonly contexts: TemplateCompilerTargetContextPlan[] = [];
  private readonly contextsByLocalKey = new Map<string, TemplateCompilerTargetContextPlan>();
  private readonly contextsByCompiledTemplateProduct = new Map<ProductHandle, TemplateCompilerTargetContextPlan>();
  private readonly contextsByCompilerReachableNodeProduct = new Map<ProductHandle, TemplateCompilerTargetContextPlan>();
  private readonly admittedContextsByTargetPlan = new Map<
    TemplateCompilerTargetPlan,
    readonly TemplateCompilerTargetContextPlan[]
  >();
  private readonly structuresByContextKey = new Map<string, TemplateCompilerContextStructure>();
  private readonly contextKeysByCarrierOccurrence = new Map<string, string>();
  private readonly geometriesByRow = new Map<TemplateCompilerTargetRowPlan, TemplateCompilerTargetGeometry>();
  private readonly geometriesByMarker = new Map<TemplateCompilerCommentOccurrence, TemplateCompilerTargetGeometry>();
  private readonly geometriesByStart = new Map<TemplateCompilerCommentOccurrence, TemplateCompilerRenderLocationTargetGeometry>();
  private readonly geometriesByEnd = new Map<TemplateCompilerCommentOccurrence, TemplateCompilerRenderLocationTargetGeometry>();
  private readonly sourceTargetRowsByOccurrence = new Map<TemplateCompilerNodeOccurrence, TemplateCompilerTargetRowPlan>();
  private readonly latestRenderReplacementByOccurrence = new Map<
    TemplateCompilerElementOccurrence,
    TemplateCompilerRenderLocationTargetGeometry
  >();
  private readonly consumedNodes = new Map<TemplateCompilerNodeOccurrence, TemplateCompilerConsumedNodeDisposition>();
  private readonly consumedNodesByContextKey = new Map<string, TemplateCompilerConsumedNodeDisposition[]>();
  private readonly consumedAttributes = new Map<
    TemplateCompilerAttributeOccurrence,
    TemplateCompilerConsumedAttributeDisposition
  >();
  private readonly consumedAttributesByContextKey = new Map<
    string,
    TemplateCompilerConsumedAttributeDisposition[]
  >();
  private readonly inputNodeTransfers: TemplateCompilerInputNodeTransfer[] = [];
  private readonly inputNodeTransfersByNode = new Map<
    TemplateCompilerNodeOccurrence,
    TemplateCompilerInputNodeTransfer[]
  >();
  private readonly inputNodeTransfersByContextKey = new Map<string, TemplateCompilerInputNodeTransfer[]>();
  private readonly inputNodeTransfersByContextAndNode = new Map<
    string,
    Map<TemplateCompilerNodeOccurrence, TemplateCompilerInputNodeTransfer>
  >();
  private readonly inputTextExpansions = new Map<TemplateCompilerTextOccurrence, TemplateCompilerInputTextExpansion>();
  private readonly inputTextExpansionsByOutput = new Map<
    TemplateCompilerTextOccurrence,
    TemplateCompilerInputTextExpansion
  >();
  private readonly expectedFinalInputNodeEdges = new Map<TemplateCompilerNodeOccurrence, {
    readonly parent: TemplateCompilerParentOccurrence | null;
    readonly edgeKind: TemplateCompilerOccurrenceEdgeKind;
  }>();
  private readonly seededNodesByExactAuthoredProduct = new Map<ProductHandle, TemplateCompilerNodeOccurrence[]>();
  private readonly seededAttributesByExactAuthoredProduct = new Map<
    ProductHandle,
    TemplateCompilerAttributeOccurrence[]
  >();
  private readonly seededAttributesByOwner = new Map<
    TemplateCompilerElementOccurrence,
    TemplateCompilerAttributeOccurrence[]
  >();
  private readonly projectionInputsByContributor = new Map<
    HydrateElementProjectionContributor,
    TemplateCompilerProjectionContributorInput | null
  >();
  private readonly projectionAuthorityByContributor = new Map<
    HydrateElementProjectionContributor,
    TemplateCompilerProjectionContextStructuralAuthority
  >();
  private readonly structuralEntrantsByContextKey = new Map<
    string,
    Map<TemplateCompilerNodeOccurrence, ProductHandle>
  >();
  private readonly renderReplacementsByOccurrence = new Map<
    TemplateCompilerElementOccurrence,
    TemplateCompilerRenderLocationTargetGeometry[]
  >();
  private readonly seededChildNodesByParent = new Map<TemplateCompilerParentOccurrence, TemplateCompilerNodeOccurrence[]>();
  private nextInputEventOrdinal = 0;

  private constructor(
    readonly forest: TemplateCompilerOccurrenceForest,
    readonly mutationAuthority: TemplateCompilerForestMutationAuthority,
  ) {
    for (const node of forest.readNodes()) {
      const authoredProductHandle = forest.exactAuthoredNodeOrigin(node)?.authored.productHandle ?? null;
      if (forest.seededNodePlacement(node) != null && authoredProductHandle != null) {
        appendMap(this.seededNodesByExactAuthoredProduct, authoredProductHandle, node);
      }
      const placement = forest.seededNodePlacement(node);
      if (placement?.parent != null && placement.edgeKind === TemplateCompilerOccurrenceEdgeKind.Child) {
        appendMap(this.seededChildNodesByParent, placement.parent, node);
      }
    }
    for (const attribute of forest.readAttributes()) {
      const authoredProductHandle = forest.exactAuthoredAttributeOrigin(attribute)?.authored.productHandle ?? null;
      if (forest.seededAttributePlacement(attribute) != null && authoredProductHandle != null) {
        appendMap(this.seededAttributesByExactAuthoredProduct, authoredProductHandle, attribute);
      }
      const owner = forest.seededAttributePlacement(attribute)?.owner ?? null;
      if (owner != null) appendMap(this.seededAttributesByOwner, owner, attribute);
    }
  }

  /** Read admitted compilation units in family admission order. */
  readTargetPlans(): readonly TemplateCompilerTargetPlan[] {
    return this.targetPlans;
  }

  /** Read every admitted target context in plan admission and plan-local context order. */
  readContexts(): readonly TemplateCompilerTargetContextPlan[] {
    return this.contexts;
  }

  /** Resolve one admitted context without scanning the target-plan family. */
  contextForLocalKey(localKey: string): TemplateCompilerTargetContextPlan | null {
    return this.contextsByLocalKey.get(localKey) ?? null;
  }

  /** Resolve the exact live or explicitly consumed structural context of one forest occurrence. */
  contextForOccurrence(
    occurrence: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
  ): TemplateCompilerTargetContextPlan | null {
    const node = this.forest.nodeForOccurrenceKey(occurrence.occurrenceKey);
    if (node === occurrence) return this.contextForNodeOccurrence(node);
    const attribute = this.forest.attributeForOccurrenceKey(occurrence.occurrenceKey);
    if (attribute !== occurrence) {
      throw new Error(`Compiler occurrence '${occurrence.occurrenceKey}' belongs to another forest.`);
    }
    const consumed = this.consumedAttributes.get(attribute) ?? null;
    if (consumed != null) {
      if (attribute.owner != null) {
        throw new Error(`Consumed compiler attribute '${attribute.occurrenceKey}' still has a live owner.`);
      }
      return consumed.context;
    }
    return attribute.owner == null ? null : this.contextForNodeOccurrence(attribute.owner);
  }

  /**
   * Admit one sealed target-plan context namespace into this family.
   *
   * Structural rooting remains separate: generated roots can be created only after admission, while a later typed
   * extraction operation can bind an existing carrier without weakening generation or input-transfer authority.
   */
  admitTargetPlan(targetPlan: TemplateCompilerTargetPlan): void {
    if (!targetPlan.isSealed) {
      throw new Error(`Additional compiler target plan '${targetPlan.localKey}' must be sealed before family admission.`);
    }
    this.admitTargetPlanFamily(targetPlan);
  }

  private admitTargetPlanFamily(targetPlan: TemplateCompilerTargetPlan): void {
    if (this.admittedContextsByTargetPlan.has(targetPlan)) {
      throw new Error(`Compiler target plan '${targetPlan.localKey}' is already admitted to this structural family.`);
    }
    if (this.targetPlansByLocalKey.has(targetPlan.localKey)) {
      throw new Error(`Compiler target plan key '${targetPlan.localKey}' is not unique in the structural family.`);
    }
    targetPlan.assertCoherent();
    const contexts = [...targetPlan.readContexts()];
    const localContextKeys = new Set<string>();
    const localCompiledTemplateProducts = new Set<ProductHandle>();
    const localReachableNodeProducts = new Set<ProductHandle>();
    const localProjectionContributors = new Set<HydrateElementProjectionContributor>();
    for (const context of contexts) {
      if (
        targetPlan.contextForLocalKey(context.localKey) !== context
        || localContextKeys.has(context.localKey)
        || this.contextsByLocalKey.has(context.localKey)
      ) {
        throw new Error(`Compiler target context key '${context.localKey}' is not unique in the structural family.`);
      }
      const compiledTemplateProduct = context.compiledTemplate.productHandle;
      if (
        localCompiledTemplateProducts.has(compiledTemplateProduct)
        || this.contextsByCompiledTemplateProduct.has(compiledTemplateProduct)
      ) {
        throw new Error(
          `Compiled-template product '${compiledTemplateProduct}' is not unique in the structural family.`,
        );
      }
      localContextKeys.add(context.localKey);
      localCompiledTemplateProducts.add(compiledTemplateProduct);
      for (const productHandle of context.readCompilerReachableNodeProductHandles()) {
        if (
          localReachableNodeProducts.has(productHandle)
          || this.contextsByCompilerReachableNodeProduct.has(productHandle)
        ) {
          throw new Error(
            `Compiler-reachable node '${productHandle}' is not unique in the structural family.`,
          );
        }
        localReachableNodeProducts.add(productHandle);
      }
      const authority = context.structuralAuthority;
      if (authority instanceof TemplateCompilerProjectionContextStructuralAuthority) {
        for (const contributor of authority.projection.contributors) {
          if (
            localProjectionContributors.has(contributor)
            || this.projectionAuthorityByContributor.has(contributor)
          ) {
            throw new Error('Projection contributor object is not unique in the structural family.');
          }
          localProjectionContributors.add(contributor);
        }
      }
    }

    this.targetPlans.push(targetPlan);
    this.targetPlansByLocalKey.set(targetPlan.localKey, targetPlan);
    this.admittedContextsByTargetPlan.set(targetPlan, contexts);
    for (const context of contexts) {
      this.contexts.push(context);
      this.contextsByLocalKey.set(context.localKey, context);
      this.contextsByCompiledTemplateProduct.set(context.compiledTemplate.productHandle, context);
      for (const productHandle of context.readCompilerReachableNodeProductHandles()) {
        this.contextsByCompilerReachableNodeProduct.set(productHandle, context);
      }
    }
    this.indexStructuralEntrants(contexts);
  }

  readContextStructure(
    context: TemplateCompilerTargetContextPlan,
  ): TemplateCompilerContextStructure | null {
    this.requireContext(context);
    return this.structuresByContextKey.get(context.localKey) ?? null;
  }

  readTargetGeometry(row: TemplateCompilerTargetRowPlan): TemplateCompilerTargetGeometry | null {
    return this.geometriesByRow.get(row) ?? null;
  }

  readTargetGeometries(
    context: TemplateCompilerTargetContextPlan,
  ): readonly TemplateCompilerTargetGeometry[] {
    this.requireContext(context);
    return context.readRows().flatMap((row) => {
      const geometry = this.geometriesByRow.get(row);
      return geometry == null ? [] : [geometry];
    });
  }

  /** Read durable freezer input in target-context order, then compiler consumption-event order. */
  readConsumedNodeDispositions(
    context?: TemplateCompilerTargetContextPlan,
  ): readonly TemplateCompilerConsumedNodeDisposition[] {
    if (context != null) this.requireContext(context);
    const contexts = context == null ? this.readContexts() : [context];
    return contexts.flatMap((candidate) =>
      [...this.consumedNodesByContextKey.get(candidate.localKey) ?? []].sort(compareConsumedNodes)
    );
  }

  /** Read durable freezer input in target-context order, then compiler consumption-event order. */
  readConsumedAttributeDispositions(
    context?: TemplateCompilerTargetContextPlan,
  ): readonly TemplateCompilerConsumedAttributeDisposition[] {
    if (context != null) this.requireContext(context);
    const contexts = context == null ? this.readContexts() : [context];
    return contexts.flatMap((candidate) =>
      [...this.consumedAttributesByContextKey.get(candidate.localKey) ?? []].sort(compareConsumedAttributes)
    );
  }

  /** Read caused retained-input transfers in compiler execution order. */
  readInputNodeTransfers(
    context?: TemplateCompilerTargetContextPlan,
  ): readonly TemplateCompilerInputNodeTransfer[] {
    if (context != null) this.requireContext(context);
    return context == null
      ? this.inputNodeTransfers
      : this.inputNodeTransfersByContextKey.get(context.localKey) ?? [];
  }

  /** Read caused text expansions in compiler execution order. */
  readInputTextExpansions(): readonly TemplateCompilerInputTextExpansion[] {
    return [...this.inputTextExpansions.values()].sort(compareInputEvents);
  }

  /** Create path-independent generation authority for a node/attribute factory call owned by this session. */
  createGeneration(
    context: TemplateCompilerTargetContextPlan,
    operationKey: string,
    role: TemplateCompilerGeneratedOccurrenceRole,
    causeHandles: readonly ClaimEndpointHandle[],
    outputOrdinal: number,
  ): TemplateCompilerOccurrenceGeneration {
    this.requireContext(context);
    return this.mutationAuthority.createStructuralGeneration(
      context.localKey,
      operationKey,
      role,
      causeHandles,
      outputOrdinal,
    );
  }

  /** Create and assign a generated `<template>` carrier plus content fragment to one child target context. */
  createGeneratedContextStructure(
    context: TemplateCompilerTargetContextPlan,
    causeHandles: readonly ClaimEndpointHandle[] = [context.owner.productHandle],
  ): TemplateCompilerContextStructure {
    this.requireContext(context);
    if (!causeHandles.includes(context.owner.productHandle)) {
      throw new Error(`Compiler target context '${context.localKey}' generated its carrier without the owner cause.`);
    }
    const sourceInput = this.templateControllerSourceInput(context);
    if (
      this.isSourceBearingTemplateControllerContext(context)
      && sourceInput instanceof TemplateCompilerElementOccurrence
      && this.isReusableInputTemplateCarrier(sourceInput)
    ) {
      throw new Error(`Compiler target context '${context.localKey}' must adopt its authored template carrier.`);
    }
    if (this.structuresByContextKey.has(context.localKey)) {
      throw new Error(`Compiler target context '${context.localKey}' already has structural ownership.`);
    }
    const operationKey = `${context.localKey}:generated-carrier`;
    const carrier = this.forest.createGeneratedElement(
      this.createGeneration(
        context,
        operationKey,
        TemplateCompilerGeneratedOccurrenceRole.TemplateCarrier,
        causeHandles,
        0,
      ),
      'template',
      HtmlNamespaceKind.Html,
      'http://www.w3.org/1999/xhtml',
    );
    const content = this.forest.createGeneratedFragment(this.createGeneration(
      context,
      operationKey,
      TemplateCompilerGeneratedOccurrenceRole.TemplateContent,
      causeHandles,
      0,
    ));
    this.forest.insertDetachedNode(
      carrier,
      null,
      TemplateCompilerOccurrenceEdgeKind.Root,
      this.forest.readRoots().length,
    );
    this.forest.insertDetachedNode(
      content,
      carrier,
      TemplateCompilerOccurrenceEdgeKind.TemplateContent,
      0,
    );
    return this.bindContextStructure(context, carrier, content);
  }

  /** Bind a context to an existing template occurrence after compiler-owned extraction/movement made it a root. */
  bindContextStructure(
    context: TemplateCompilerTargetContextPlan,
    compilerCarrier: TemplateCompilerElementOccurrence,
    compilerContent: TemplateCompilerFragmentOccurrence,
  ): TemplateCompilerContextStructure {
    this.requireContext(context);
    if (this.structuresByContextKey.has(context.localKey)) {
      throw new Error(`Compiler target context '${context.localKey}' already has structural ownership.`);
    }
    this.requireForestNode(compilerCarrier);
    this.requireForestNode(compilerContent);
    if (
      compilerCarrier.parent !== null
      || compilerCarrier.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Root
      || !this.forest.readRoots().includes(compilerCarrier)
    ) {
      throw new Error(`Compiler context carrier '${compilerCarrier.occurrenceKey}' is not a live forest root.`);
    }
    if (
      compilerCarrier.tagName.toLowerCase() !== 'template'
      || compilerCarrier.namespace !== HtmlNamespaceKind.Html
      || compilerCarrier.namespaceUri !== 'http://www.w3.org/1999/xhtml'
      || compilerCarrier.readChildren().length !== 0
      || compilerCarrier.templateContent !== compilerContent
      || compilerContent.parent !== compilerCarrier
      || compilerContent.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.TemplateContent
    ) {
      throw new Error(`Compiler context '${context.localKey}' does not own an exact template-content carrier.`);
    }
    const carrierGeneration = compilerCarrier.generation;
    const contentGeneration = compilerContent.generation;
    if (carrierGeneration == null || contentGeneration == null) {
      if (carrierGeneration !== null || contentGeneration !== null) {
        throw new Error(`Compiler context '${context.localKey}' has a partially generated carrier pair.`);
      }
    } else if (
      carrierGeneration.role !== TemplateCompilerGeneratedOccurrenceRole.TemplateCarrier
      || contentGeneration.role !== TemplateCompilerGeneratedOccurrenceRole.TemplateContent
      || carrierGeneration.contextKey !== context.localKey
      || contentGeneration.contextKey !== context.localKey
      || carrierGeneration.operationKey !== contentGeneration.operationKey
      || !sameOccurrences(carrierGeneration.causeHandles, contentGeneration.causeHandles)
      || !carrierGeneration.causeHandles.includes(context.owner.productHandle)
      || carrierGeneration.outputOrdinal !== 0
      || contentGeneration.outputOrdinal !== 0
    ) {
      throw new Error(`Compiler context '${context.localKey}' cannot adopt an incoherent generated carrier pair.`);
    }
    const priorContextKey = this.contextKeysByCarrierOccurrence.get(compilerCarrier.occurrenceKey);
    if (priorContextKey != null) {
      throw new Error(
        `Compiler carrier '${compilerCarrier.occurrenceKey}' belongs to both '${priorContextKey}' and '${context.localKey}'.`,
      );
    }
    const structure = new TemplateCompilerContextStructure(context, compilerCarrier, compilerContent);
    this.structuresByContextKey.set(context.localKey, structure);
    this.contextKeysByCarrierOccurrence.set(compilerCarrier.occurrenceKey, context.localKey);
    return structure;
  }

  /** Extract one authored `<template>` occurrence as the exact carrier for a child compiler context. */
  adoptInputContextStructure(
    context: TemplateCompilerTargetContextPlan,
    compilerCarrier: TemplateCompilerElementOccurrence,
    compilerContent: TemplateCompilerFragmentOccurrence,
    causeHandles: readonly ClaimEndpointHandle[],
  ): TemplateCompilerContextStructure {
    this.requireContext(context);
    const authority = context.structuralAuthority;
    const replacement = this.latestRenderReplacementByOccurrence.get(compilerCarrier) ?? null;
    const outermostContext = this.sourceChainOutermostTemplateControllerContext(context);
    const outermostAuthority = outermostContext?.structuralAuthority ?? null;
    if (
      this.structuresByContextKey.has(context.localKey)
      || this.contextKeysByCarrierOccurrence.has(compilerCarrier.occurrenceKey)
      || !(authority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority)
      || !this.isSourceBearingTemplateControllerContext(context)
      || !(outermostAuthority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority)
      || replacement == null
      || !replacement.row.instructions.includes(outermostAuthority.instruction)
      || compilerCarrier.tagName.toLowerCase() !== 'template'
      || compilerCarrier.namespace !== HtmlNamespaceKind.Html
      || compilerCarrier.namespaceUri !== 'http://www.w3.org/1999/xhtml'
      || compilerCarrier.readChildren().length !== 0
      || compilerCarrier.templateContent !== compilerContent
      || compilerContent.parent !== compilerCarrier
      || compilerContent.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.TemplateContent
      || compilerCarrier.parent !== null
      || compilerCarrier.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Detached
    ) {
      throw new Error(`Compiler target context '${context.localKey}' cannot adopt an inexact input carrier.`);
    }
    this.transferInputNode(
      compilerCarrier,
      context,
      null,
      TemplateCompilerOccurrenceEdgeKind.Root,
      this.forest.readRoots().length,
      causeHandles,
    );
    return this.bindContextStructure(context, compilerCarrier, compilerContent);
  }

  /** Transfer a retained browser-input occurrence into one context without changing occurrence identity. */
  moveNodeIntoContext(
    node: TemplateCompilerNodeOccurrence,
    context: TemplateCompilerTargetContextPlan,
    ordinal: number,
    causeHandles: readonly ClaimEndpointHandle[],
  ): void {
    const structure = this.requireContextStructure(context);
    this.transferInputNode(
      node,
      context,
      structure.compilerContent,
      TemplateCompilerOccurrenceEdgeKind.Child,
      ordinal,
      causeHandles,
    );
  }

  /** Atomically replace one retained text input with its generated static/placeholder sequence. */
  expandTextInput(
    input: TemplateCompilerTextOccurrence,
    context: TemplateCompilerTargetContextPlan,
    outputs: readonly TemplateCompilerTextOccurrence[],
    causeHandles: readonly ClaimEndpointHandle[],
  ): TemplateCompilerInputTextExpansion {
    const structure = this.requireContextStructure(context);
    this.requireForestNode(input);
    this.requireNodeInContext(input, structure);
    const priorExpectedEdge = this.expectedFinalInputNodeEdges.get(input) ?? null;
    if (
      input.inputReference == null
      || input.generation != null
      || this.forest.seededNodePlacement(input) == null
      || this.inputTextExpansions.has(input)
      || this.consumedNodes.has(input)
      || (priorExpectedEdge != null
        && (priorExpectedEdge.parent !== input.parent || priorExpectedEdge.edgeKind !== input.parentEdgeKind))
    ) {
      throw new Error(`Compiler text input '${input.occurrenceKey}' cannot be expanded more than once.`);
    }
    if (outputs.length === 0 || new Set(outputs).size !== outputs.length || causeHandles.length === 0) {
      throw new Error(`Compiler text input '${input.occurrenceKey}' requires generated outputs and semantic causes.`);
    }
    const parent = input.parent;
    const ordinal = input.readParentOrdinal();
    if (
      parent == null
      || ordinal == null
      || input.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
    ) {
      throw new Error(`Compiler text input '${input.occurrenceKey}' has no ordinary expansion edge.`);
    }
    for (const output of outputs) {
      this.requireForestNode(output);
      const role = output.generation?.role;
      if (
        output.parent !== null
        || output.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Detached
        || output.inputReference !== input.inputReference
        || output.generation?.contextKey !== context.localKey
        || output.generation.causeHandles.some((cause) => !causeHandles.includes(cause))
        || (role !== TemplateCompilerGeneratedOccurrenceRole.StaticTextSegment
          && role !== TemplateCompilerGeneratedOccurrenceRole.BindingPlaceholder)
      ) {
        throw new Error(`Compiler text output '${output.occurrenceKey}' is not an exact expansion output.`);
      }
    }
    this.requireCurrentInputEdgeAuthority(input);
    this.assertSeededSourceOrder(input);
    this.forest.detachNode(input);
    outputs.forEach((output, outputOrdinal) => this.forest.insertDetachedNode(
      output,
      parent,
      TemplateCompilerOccurrenceEdgeKind.Child,
      ordinal + outputOrdinal,
    ));
    const expansion = new TemplateCompilerInputTextExpansion(
      context,
      input,
      input.inputReference,
      parent,
      ordinal,
      [...outputs],
      this.nextInputEventOrdinal++,
      [...causeHandles],
    );
    this.inputTextExpansions.set(input, expansion);
    for (const output of outputs) this.inputTextExpansionsByOutput.set(output, expansion);
    this.expectedFinalInputNodeEdges.set(input, {
      parent: null,
      edgeKind: TemplateCompilerOccurrenceEdgeKind.Detached,
    });
    return expansion;
  }

  /** Consume one browser-effective input node as a context-local 1→0 output with explicit semantic causes. */
  consumeNodeForContext(
    node: TemplateCompilerNodeOccurrence,
    context: TemplateCompilerTargetContextPlan,
    causeHandles: readonly ClaimEndpointHandle[],
  ): TemplateCompilerConsumedNodeDisposition {
    const structure = this.requireContextStructure(context);
    this.requireForestNode(node);
    if (
      !contextContains(structure.compilerContent, node)
      && !this.isSourceConsumedContextEntrant(node, context)
      && !this.isDiscardedProjectionInputForContext(node, context)
    ) {
      throw new Error(
        `Consumed compiler occurrence '${node.occurrenceKey}' is outside target context '${context.localKey}' without source-edge authority.`,
      );
    }
    if (causeHandles.length === 0) {
      throw new Error(`Consumed compiler occurrence '${node.occurrenceKey}' requires a semantic cause.`);
    }
    const requiredSourceCause = this.requiredSourceConsumptionCause(node, context);
    if (requiredSourceCause != null && !causeHandles.includes(requiredSourceCause)) {
      throw new Error(`Consumed compiler occurrence '${node.occurrenceKey}' omits its owning instruction cause.`);
    }
    if (node.inputReference == null || node.generation != null) {
      throw new Error(`Consumed compiler occurrence '${node.occurrenceKey}' is not a seeded browser input.`);
    }
    if (this.consumedNodes.has(node) || this.sourceTargetRowsByOccurrence.has(node)) {
      throw new Error(`Compiler occurrence '${node.occurrenceKey}' already has a final structural disposition.`);
    }
    const owner = node.parent;
    const ownerOrdinal = node.readParentOrdinal();
    if (
      owner == null
      || ownerOrdinal == null
      || node.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
    ) {
      throw new Error(`Consumed compiler occurrence '${node.occurrenceKey}' has no ordinary live owner event.`);
    }
    const authoredProductHandle = this.forest.exactAuthoredNodeOrigin(node)?.authored.productHandle ?? null;
    const membershipOrdinal = authoredProductHandle == null
      ? null
      : context.compilerReachableNodeOrdinal(authoredProductHandle);
    this.requireCurrentInputEdgeAuthority(node);
    this.assertSeededSourceOrder(node);
    this.forest.detachNode(node);
    if (node instanceof TemplateCompilerElementOccurrence) {
      this.latestRenderReplacementByOccurrence.delete(node);
    }
    const disposition = new TemplateCompilerConsumedNodeDisposition(
      context,
      node,
      node.inputReference,
      authoredProductHandle,
      membershipOrdinal,
      owner,
      TemplateCompilerOccurrenceEdgeKind.Child,
      ownerOrdinal,
      this.nextInputEventOrdinal++,
      [...causeHandles],
    );
    this.consumedNodes.set(node, disposition);
    appendMap(this.consumedNodesByContextKey, context.localKey, disposition);
    this.expectedFinalInputNodeEdges.set(node, {
      parent: null,
      edgeKind: TemplateCompilerOccurrenceEdgeKind.Detached,
    });
    return disposition;
  }

  /** Consume one live browser-effective input attribute and retain its exact consumption event. */
  consumeAttributeForContext(
    attribute: TemplateCompilerAttributeOccurrence,
    context: TemplateCompilerTargetContextPlan,
    causeHandles: readonly ClaimEndpointHandle[],
  ): TemplateCompilerConsumedAttributeDisposition {
    const structure = this.requireContextStructure(context);
    if (this.forest.attributeForOccurrenceKey(attribute.occurrenceKey) !== attribute) {
      throw new Error(`Compiler attribute '${attribute.occurrenceKey}' belongs to another forest.`);
    }
    if (causeHandles.length === 0) {
      throw new Error(`Consumed compiler attribute '${attribute.occurrenceKey}' requires a semantic cause.`);
    }
    const requiredCause = this.requiredAttributeConsumptionCause(attribute, context);
    if (requiredCause != null && !causeHandles.includes(requiredCause)) {
      throw new Error(`Consumed compiler attribute '${attribute.occurrenceKey}' omits its owning instruction cause.`);
    }
    if (attribute.inputReference == null || attribute.generation != null) {
      throw new Error(`Consumed compiler attribute '${attribute.occurrenceKey}' is not a seeded browser input.`);
    }
    if (this.consumedAttributes.has(attribute)) {
      throw new Error(`Compiler attribute '${attribute.occurrenceKey}' already has a final structural disposition.`);
    }
    const owner = attribute.owner;
    const ownerOrdinal = attribute.readOwnerOrdinal();
    if (owner == null || ownerOrdinal == null) {
      throw new Error(`Consumed compiler attribute '${attribute.occurrenceKey}' has no live owner event.`);
    }
    if (this.forest.seededAttributePlacement(attribute)?.owner !== owner) {
      throw new Error(`Consumed compiler attribute '${attribute.occurrenceKey}' changed its seeded input owner.`);
    }
    this.assertSeededAttributeOrder(attribute, owner);
    this.requireNodeInContext(owner, structure);
    this.forest.detachAttribute(attribute);
    const disposition = new TemplateCompilerConsumedAttributeDisposition(
      context,
      attribute,
      attribute.inputReference,
      this.forest.exactAuthoredAttributeOrigin(attribute)?.authored.productHandle ?? null,
      owner,
      ownerOrdinal,
      this.nextInputEventOrdinal++,
      [...causeHandles],
    );
    this.consumedAttributes.set(attribute, disposition);
    appendMap(this.consumedAttributesByContextKey, context.localKey, disposition);
    return disposition;
  }

  /** Insert one compiler marker immediately before an existing element/text target and pair it with one complete row. */
  realizeMarkerTarget(
    row: TemplateCompilerTargetRowPlan,
    target: TemplateCompilerElementOccurrence | TemplateCompilerTextOccurrence,
    additionalCauseHandles: readonly ClaimEndpointHandle[] = [],
  ): TemplateCompilerMarkerTargetGeometry {
    const context = this.requireCompleteUnrealizedRow(row);
    if (row.targetKind !== TemplateRenderTargetKind.MarkerTarget) {
      throw new Error(`Compiler target row '${row.localKey}' is not an ordinary marker target.`);
    }
    const structure = this.requireContextStructure(context);
    this.requireForestNode(target);
    this.requireNodeInContext(target, structure);
    this.requireMarkerTargetShape(row, target, context);
    this.requireExactRowOrigin(row, target);
    const parent = target.parent;
    const ordinal = target.readParentOrdinal();
    if (
      parent == null
      || ordinal == null
      || target.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
    ) {
      throw new Error(`Marker target '${target.occurrenceKey}' is not on an ordinary child edge.`);
    }
    this.claimSourceTarget(row, target);
    const marker = this.forest.createGeneratedComment(
      this.createGeneration(
        context,
        row.localKey,
        TemplateCompilerGeneratedOccurrenceRole.CompilerMarker,
        rowCauseHandles(row, additionalCauseHandles),
        0,
      ),
      'au',
      HtmlCommentSemanticKind.CompilerMarker,
    );
    this.forest.insertDetachedNode(
      marker,
      parent,
      TemplateCompilerOccurrenceEdgeKind.Child,
      ordinal,
    );
    const geometry = new TemplateCompilerMarkerTargetGeometry(row, context, marker, target);
    this.geometriesByRow.set(row, geometry);
    this.geometriesByMarker.set(marker, geometry);
    return geometry;
  }

  /** Replace one element with exact marker/start/end adjacency and pair `au-end` with one complete row. */
  realizeRenderLocationTarget(
    row: TemplateCompilerTargetRowPlan,
    replacedNode: TemplateCompilerElementOccurrence,
    additionalCauseHandles: readonly ClaimEndpointHandle[] = [],
  ): TemplateCompilerRenderLocationTargetGeometry {
    const context = this.requireCompleteUnrealizedRow(row);
    if (row.targetKind !== TemplateRenderTargetKind.RenderLocation) {
      throw new Error(`Compiler target row '${row.localKey}' is not a render-location target.`);
    }
    const structure = this.requireContextStructure(context);
    this.requireForestNode(replacedNode);
    this.requireNodeInContext(replacedNode, structure);
    if (replacedNode.generation != null) {
      throw new Error(`Render-location row '${row.localKey}' requires a retained browser input element.`);
    }
    this.requireCurrentInputEdgeAuthority(replacedNode);
    this.assertSeededSourceOrder(replacedNode);
    this.requireExactRowOrigin(row, replacedNode);
    const parent = replacedNode.parent;
    const ordinal = replacedNode.readParentOrdinal();
    if (
      parent == null
      || ordinal == null
      || replacedNode.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
    ) {
      throw new Error(`Render-location input '${replacedNode.occurrenceKey}' is not on an ordinary child edge.`);
    }
    const geometry = this.insertRenderLocationGeometry(
      row,
      context,
      parent,
      ordinal,
      replacedNode,
      additionalCauseHandles,
    );
    this.forest.detachNode(replacedNode);
    this.latestRenderReplacementByOccurrence.set(replacedNode, geometry);
    appendMap(this.renderReplacementsByOccurrence, replacedNode, geometry);
    if (replacedNode.generation == null && replacedNode.inputReference != null) {
      this.expectedFinalInputNodeEdges.set(replacedNode, {
        parent: null,
        edgeKind: TemplateCompilerOccurrenceEdgeKind.Detached,
      });
    }
    return geometry;
  }

  /** Append marker/start/end to a generated context that has no replaced input node, as outer TC definitions do. */
  appendRenderLocationTarget(
    row: TemplateCompilerTargetRowPlan,
    additionalCauseHandles: readonly ClaimEndpointHandle[] = [],
  ): TemplateCompilerRenderLocationTargetGeometry {
    const context = this.requireCompleteUnrealizedRow(row);
    if (row.targetKind !== TemplateRenderTargetKind.RenderLocation) {
      throw new Error(`Compiler target row '${row.localKey}' is not a render-location target.`);
    }
    const structure = this.requireContextStructure(context);
    this.requireAppendOnlyOuterTemplateController(context, row, structure);
    return this.insertRenderLocationGeometry(
      row,
      context,
      structure.compilerContent,
      0,
      null,
      additionalCauseHandles,
    );
  }

  private insertRenderLocationGeometry(
    row: TemplateCompilerTargetRowPlan,
    context: TemplateCompilerTargetContextPlan,
    parent: TemplateCompilerFragmentOccurrence | TemplateCompilerElementOccurrence,
    ordinal: number,
    replacedNode: TemplateCompilerElementOccurrence | null,
    additionalCauseHandles: readonly ClaimEndpointHandle[],
  ): TemplateCompilerRenderLocationTargetGeometry {
    if (!Number.isSafeInteger(ordinal) || ordinal < 0 || ordinal > parent.readChildren().length) {
      throw new Error(
        `Compiler render-location row '${row.localKey}' has invalid insertion ordinal ${ordinal}.`,
      );
    }
    const causes = rowCauseHandles(row, additionalCauseHandles);
    const marker = this.forest.createGeneratedComment(
      this.createGeneration(
        context,
        row.localKey,
        TemplateCompilerGeneratedOccurrenceRole.CompilerMarker,
        causes,
        0,
      ),
      'au',
      HtmlCommentSemanticKind.CompilerMarker,
    );
    const start = this.forest.createGeneratedComment(
      this.createGeneration(
        context,
        row.localKey,
        TemplateCompilerGeneratedOccurrenceRole.RenderLocationStart,
        causes,
        0,
      ),
      'au-start',
      HtmlCommentSemanticKind.RenderLocationStart,
    );
    const end = this.forest.createGeneratedComment(
      this.createGeneration(
        context,
        row.localKey,
        TemplateCompilerGeneratedOccurrenceRole.RenderLocationEnd,
        causes,
        0,
      ),
      'au-end',
      HtmlCommentSemanticKind.RenderLocationEnd,
    );
    this.forest.insertDetachedNode(marker, parent, TemplateCompilerOccurrenceEdgeKind.Child, ordinal);
    this.forest.insertDetachedNode(start, parent, TemplateCompilerOccurrenceEdgeKind.Child, ordinal + 1);
    this.forest.insertDetachedNode(end, parent, TemplateCompilerOccurrenceEdgeKind.Child, ordinal + 2);
    const geometry = new TemplateCompilerRenderLocationTargetGeometry(
      row,
      context,
      marker,
      start,
      end,
      parent,
      ordinal,
      replacedNode,
    );
    if (
      this.geometriesByMarker.has(marker)
      || this.geometriesByStart.has(start)
      || this.geometriesByEnd.has(end)
    ) {
      throw new Error(`Compiler render-location row '${row.localKey}' reused generated geometry occurrences.`);
    }
    this.geometriesByRow.set(row, geometry);
    this.geometriesByMarker.set(marker, geometry);
    this.geometriesByStart.set(start, geometry);
    this.geometriesByEnd.set(end, geometry);
    return geometry;
  }

  /** Validate forest/context coverage and exact geometry for every currently complete row. */
  assertCoherent(): void {
    for (const targetPlan of this.targetPlans) {
      const admittedContexts = this.admittedContextsByTargetPlan.get(targetPlan) ?? [];
      if (!sameOccurrences(targetPlan.readContexts(), admittedContexts)) {
        throw new Error(`Compiler target plan '${targetPlan.localKey}' changed its context family after admission.`);
      }
      targetPlan.assertCoherent();
    }
    this.forest.assertCoherentTopology();
    this.assertGeneratedInventory();
    const realizedReplacedNodes = new Set<TemplateCompilerNodeOccurrence>(
      [...this.geometriesByRow.values()].flatMap((geometry) =>
        geometry.geometryKind === TemplateCompilerTargetGeometryKind.RenderLocation
          && geometry.replacedNode != null
          ? [geometry.replacedNode]
          : []
      ),
    );
    for (const node of this.forest.readNodes()) {
      if (
        node.generation != null
        && node.parentEdgeKind === TemplateCompilerOccurrenceEdgeKind.Detached
        && !realizedReplacedNodes.has(node)
        && !this.consumedNodes.has(node)
      ) {
        throw new Error(`Generated compiler occurrence '${node.occurrenceKey}' has no live output edge.`);
      }
    }
    for (const attribute of this.forest.readAttributes()) {
      if (attribute.generation != null && attribute.owner == null) {
        throw new Error(`Generated compiler attribute '${attribute.occurrenceKey}' has no live owner edge.`);
      }
    }
    const contexts = this.readContexts();
    if (this.structuresByContextKey.size !== contexts.length) {
      throw new Error('Compiler structural execution does not cover every target context exactly once.');
    }
    this.assertDiscardedProjectionContributors();
    this.assertKnownAuSlotProcessContent();
    const assignedCarriers = new Set<TemplateCompilerElementOccurrence>();
    for (const context of contexts) {
      const structure = this.requireContextStructure(context);
      if (assignedCarriers.has(structure.compilerCarrier)) {
        throw new Error(`Compiler carrier '${structure.compilerCarrier.occurrenceKey}' is assigned more than once.`);
      }
      assignedCarriers.add(structure.compilerCarrier);
      this.assertContextStructure(structure);
      const expectedMarkers: TemplateCompilerCommentOccurrence[] = [];
      const exactPrefixEnd = exactPrefixEndForContext(context);
      for (const row of context.readRows()) {
        const geometry = this.geometriesByRow.get(row) ?? null;
        const belongsToExactPrefix = row.posture === TemplateCompilerTargetRowPosture.Complete
          && row.projectedTargetOrdinal < exactPrefixEnd;
        if (belongsToExactPrefix) {
          if (geometry == null) {
            throw new Error(`Complete compiler target row '${row.localKey}' has no exact structural geometry.`);
          }
          this.assertGeometry(structure, geometry);
          expectedMarkers.push(geometry.marker);
        } else if (geometry != null) {
          throw new Error(`Conditional compiler target row '${row.localKey}' cannot claim exact structural geometry.`);
        }
      }
      const actualMarkers = compilerMarkerPreorder(structure.compilerContent);
      if (!sameOccurrences(actualMarkers, expectedMarkers)) {
        throw new Error(`Compiler target marker preorder diverges from row order in '${context.localKey}'.`);
      }
      this.assertContextAuthoredMembership(structure);
    }
    this.assertSourceBandOrder();
    const roots = this.forest.readRoots();
    if (
      roots.length !== assignedCarriers.size
      || roots.some((root) => !(root instanceof TemplateCompilerElementOccurrence) || !assignedCarriers.has(root))
    ) {
      throw new Error('Compiler forest roots and target-context carriers do not have exact coverage.');
    }
    this.assertInputNodeTransfers();
    this.assertInputTextExpansions();
    this.assertSeededInputTopology();
    this.assertInputDispositions();
    for (const [row, geometry] of this.geometriesByRow) {
      const context = this.contextForLocalKey(row.context.localKey);
      if (context == null || !context.readRows().includes(row) || geometry.context !== context) {
        throw new Error(`Compiler geometry for row '${row.localKey}' belongs to another target plan.`);
      }
    }
  }

  private requireContext(context: TemplateCompilerTargetContextPlan): void {
    if (this.contextForLocalKey(context.localKey) !== context) {
      throw new Error(
        `Compiler target context '${context.localKey}' belongs to another target plan or structural family.`,
      );
    }
  }

  private contextForNodeOccurrence(
    node: TemplateCompilerNodeOccurrence,
  ): TemplateCompilerTargetContextPlan | null {
    const consumed = this.consumedNodes.get(node) ?? null;
    if (consumed != null) {
      if (node.parent != null || node.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Detached) {
        throw new Error(`Consumed compiler occurrence '${node.occurrenceKey}' still has a live structural edge.`);
      }
      return consumed.context;
    }
    const contexts: TemplateCompilerTargetContextPlan[] = [];
    for (const context of this.contexts) {
      const structure = this.structuresByContextKey.get(context.localKey) ?? null;
      if (
        structure != null
        && (node === structure.compilerCarrier || contextContains(structure.compilerContent, node))
      ) {
        contexts.push(context);
      }
    }
    if (contexts.length > 1) {
      throw new Error(`Compiler occurrence '${node.occurrenceKey}' belongs to multiple structural contexts.`);
    }
    return contexts[0] ?? null;
  }

  private transferInputNode(
    node: TemplateCompilerNodeOccurrence,
    context: TemplateCompilerTargetContextPlan,
    destinationParent: TemplateCompilerParentOccurrence | null,
    destinationEdgeKind: Exclude<
      TemplateCompilerOccurrenceEdgeKind,
      TemplateCompilerOccurrenceEdgeKind.Detached | TemplateCompilerOccurrenceEdgeKind.TemplateContent
    >,
    destinationOrdinal: number,
    causeHandles: readonly ClaimEndpointHandle[],
  ): TemplateCompilerInputNodeTransfer {
    this.requireContext(context);
    this.requireForestNode(node);
    if (node.inputReference == null || node.generation != null || this.forest.seededNodePlacement(node) == null) {
      throw new Error(`Compiler transfer '${node.occurrenceKey}' is not a retained browser input.`);
    }
    if (this.consumedNodes.has(node)) {
      throw new Error(`Compiler transfer '${node.occurrenceKey}' follows its final consumption.`);
    }
    if (causeHandles.length === 0) {
      throw new Error(`Compiler transfer '${node.occurrenceKey}' requires a semantic cause.`);
    }
    const transfersByNode = this.inputNodeTransfersByContextAndNode.get(context.localKey)
      ?? new Map<TemplateCompilerNodeOccurrence, TemplateCompilerInputNodeTransfer>();
    if (transfersByNode.has(node)) {
      throw new Error(`Compiler occurrence '${node.occurrenceKey}' already transferred into '${context.localKey}'.`);
    }
    const structuralEntrantProductHandle = this.structuralEntrantForNode(node, context);
    if (structuralEntrantProductHandle == null) {
      throw new Error(
        `Compiler transfer '${node.occurrenceKey}' is not admitted by target context '${context.localKey}'.`,
      );
    }
    const requiredCause = this.requiredContextStructuralCause(context);
    if (requiredCause == null || !causeHandles.includes(requiredCause)) {
      throw new Error(`Compiler transfer '${node.occurrenceKey}' omits its owning instruction cause.`);
    }
    if (
      (destinationEdgeKind === TemplateCompilerOccurrenceEdgeKind.Root && destinationParent !== null)
      || (destinationEdgeKind === TemplateCompilerOccurrenceEdgeKind.Child && destinationParent == null)
    ) {
      throw new Error(`Compiler transfer '${node.occurrenceKey}' has an incoherent destination edge.`);
    }
    const sourceParent = node.parent;
    const sourceEdgeKind = node.parentEdgeKind;
    const sourceOrdinal = node.readParentOrdinal();
    this.requireCurrentInputEdgeAuthority(node);
    this.assertSeededSourceOrder(node);
    this.forest.moveNode(node, destinationParent, destinationEdgeKind, destinationOrdinal);
    const transfer = new TemplateCompilerInputNodeTransfer(
      context,
      node,
      node.inputReference,
      this.forest.exactAuthoredNodeOrigin(node)?.authored.productHandle ?? null,
      structuralEntrantProductHandle,
      sourceParent,
      sourceEdgeKind,
      sourceOrdinal,
      destinationParent,
      destinationEdgeKind,
      destinationOrdinal,
      this.nextInputEventOrdinal++,
      [...causeHandles],
    );
    this.inputNodeTransfers.push(transfer);
    appendMap(this.inputNodeTransfersByNode, node, transfer);
    appendMap(this.inputNodeTransfersByContextKey, context.localKey, transfer);
    transfersByNode.set(node, transfer);
    this.inputNodeTransfersByContextAndNode.set(context.localKey, transfersByNode);
    this.expectedFinalInputNodeEdges.set(node, {
      parent: destinationParent,
      edgeKind: destinationEdgeKind,
    });
    return transfer;
  }

  private structuralEntrantForNode(
    node: TemplateCompilerNodeOccurrence,
    context: TemplateCompilerTargetContextPlan,
  ): ProductHandle | null {
    return this.structuralEntrantsByContextKey.get(context.localKey)?.get(node) ?? null;
  }

  private indexStructuralEntrants(contexts: readonly TemplateCompilerTargetContextPlan[]): void {
    for (const context of contexts) {
      const entrants = new Map<TemplateCompilerNodeOccurrence, ProductHandle>();
      this.structuralEntrantsByContextKey.set(context.localKey, entrants);
      const authority = context.structuralAuthority;
      if (authority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority) {
        if (!this.isSourceBearingTemplateControllerContext(context)) continue;
        const productHandle = authority.instruction.node.productHandle;
        const input = productHandle == null ? null : this.exactSeededNodeForAuthored(productHandle);
        if (input != null && productHandle != null) entrants.set(input, productHandle);
        continue;
      }
      if (!(authority instanceof TemplateCompilerProjectionContextStructuralAuthority)) continue;
      for (const contributor of authority.projection.contributors) {
        this.projectionAuthorityByContributor.set(contributor, authority);
        const input = this.resolveProjectionContributorInput(authority, contributor);
        this.projectionInputsByContributor.set(contributor, input);
        if (input == null) continue;
        switch (contributor.disposition) {
          case HydrateElementProjectionContributorDisposition.RetainedNode:
            entrants.set(input.contributor, input.contributorProductHandle);
            break;
          case HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent: {
            const content = input.contributor instanceof TemplateCompilerElementOccurrence
              ? input.contributor.templateContent
              : null;
            for (const child of content == null ? [] : this.seededChildNodesByParent.get(content) ?? []) {
              entrants.set(child, input.contributorProductHandle);
            }
            break;
          }
          case HydrateElementProjectionContributorDisposition.DiscardedWhitespace:
            break;
        }
      }
    }
  }

  private requiredContextStructuralCause(context: TemplateCompilerTargetContextPlan): ProductHandle | null {
    const authority = context.structuralAuthority;
    return authority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority
      || authority instanceof TemplateCompilerProjectionContextStructuralAuthority
      ? authority.instruction.productHandle
      : null;
  }

  private isSourceConsumedContextEntrant(
    node: TemplateCompilerNodeOccurrence,
    context: TemplateCompilerTargetContextPlan,
  ): boolean {
    const authority = context.structuralAuthority;
    if (!(authority instanceof TemplateCompilerProjectionContextStructuralAuthority)) return false;
    return authority.projection.contributors.some((contributor) =>
      contributor.disposition === HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent
      && this.projectionContributorInput(authority, contributor)?.contributor === node
    );
  }

  private isDiscardedProjectionInputForContext(
    node: TemplateCompilerNodeOccurrence,
    context: TemplateCompilerTargetContextPlan,
  ): boolean {
    return context.readRows().some((row) => row.instructions.some((instruction) =>
      instruction instanceof HydrateElementInstruction
      && instruction.discardedProjectionContributors.some((contributor) =>
        this.projectionHostChild(instruction, contributor)?.contributor === node
      )
    ));
  }

  private requiredSourceConsumptionCause(
    node: TemplateCompilerNodeOccurrence,
    context: TemplateCompilerTargetContextPlan,
  ): ProductHandle | null {
    const authority = context.structuralAuthority;
    if (
      authority instanceof TemplateCompilerProjectionContextStructuralAuthority
      && this.isSourceConsumedContextEntrant(node, context)
    ) return authority.instruction.productHandle;
    for (const row of context.readRows()) {
      for (const instruction of row.instructions) {
        if (!(instruction instanceof HydrateElementInstruction)) continue;
        if (instruction.discardedProjectionContributors.some((contributor) =>
          this.projectionHostChild(instruction, contributor)?.contributor === node
        )) return instruction.productHandle;
        if (instruction.auSlotProcessContentRemovedChildNodes.some((child) =>
          this.instructionHostChild(instruction, child)?.child === node
        ) === true) return instruction.productHandle;
      }
    }
    return null;
  }

  private exactSeededNodeForAuthored(authoredProductHandle: ProductHandle): TemplateCompilerNodeOccurrence | null {
    const candidates = this.seededNodesByExactAuthoredProduct.get(authoredProductHandle) ?? [];
    return candidates.length === 1 ? candidates[0]! : null;
  }

  private exactSeededAttributeForAuthored(
    authoredProductHandle: ProductHandle,
  ): TemplateCompilerAttributeOccurrence | null {
    const candidates = this.seededAttributesByExactAuthoredProduct.get(authoredProductHandle) ?? [];
    return candidates.length === 1 ? candidates[0]! : null;
  }

  private isSourceBearingTemplateControllerContext(context: TemplateCompilerTargetContextPlan): boolean {
    const authority = context.structuralAuthority;
    if (!(authority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority)) return false;
    const sourceProductHandle = authority.instruction.node.productHandle;
    return !context.readOwnedContexts().some((child) => {
      const childAuthority = child.structuralAuthority;
      return childAuthority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority
        && childAuthority.instruction.node.productHandle === sourceProductHandle;
    });
  }

  private sourceChainOutermostTemplateControllerContext(
    context: TemplateCompilerTargetContextPlan,
  ): TemplateCompilerTargetContextPlan | null {
    const authority = context.structuralAuthority;
    if (!(authority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority)) return null;
    const sourceProductHandle = authority.instruction.node.productHandle;
    let current = context;
    while (current.ownerContext != null) {
      const owner = this.contextForLocalKey(current.ownerContext.localKey);
      const ownerAuthority = owner?.structuralAuthority ?? null;
      if (
        owner == null
        || !(ownerAuthority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority)
        || ownerAuthority.instruction.node.productHandle !== sourceProductHandle
      ) break;
      current = owner;
    }
    return current;
  }

  private templateControllerSourceInput(
    context: TemplateCompilerTargetContextPlan,
  ): TemplateCompilerNodeOccurrence | null {
    const authority = context.structuralAuthority;
    const productHandle = authority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority
      ? authority.instruction.node.productHandle
      : null;
    return productHandle == null ? null : this.exactSeededNodeForAuthored(productHandle);
  }

  private isReusableInputTemplateCarrier(node: TemplateCompilerElementOccurrence): boolean {
    return node.tagName.toLowerCase() === 'template'
      && node.namespace === HtmlNamespaceKind.Html
      && node.namespaceUri === 'http://www.w3.org/1999/xhtml';
  }

  private projectionContributorInput(
    authority: TemplateCompilerProjectionContextStructuralAuthority,
    contributor: HydrateElementProjectionContributor,
  ): TemplateCompilerProjectionContributorInput | null {
    return this.projectionAuthorityByContributor.get(contributor) === authority
      ? this.projectionInputsByContributor.get(contributor) ?? null
      : null;
  }

  private resolveProjectionContributorInput(
    authority: TemplateCompilerProjectionContextStructuralAuthority,
    contributor: HydrateElementProjectionContributor,
  ): TemplateCompilerProjectionContributorInput | null {
    if (contributor.slotName !== authority.projection.slotName) return null;
    const input = this.projectionHostChild(authority.instruction, contributor);
    if (input == null) return null;
    const contributorNode = input.contributor;
    const slotAttribute = contributor.slotAttribute?.productHandle == null
      ? null
      : this.exactSeededAttributeForAuthored(contributor.slotAttribute.productHandle);
    const seededAuSlotAttributes = (contributorNode instanceof TemplateCompilerElementOccurrence
      ? this.seededAttributesByOwner.get(contributorNode) ?? []
      : [])
      .filter((attribute) => attribute.name.toLowerCase() === 'au-slot');
    if (
      (contributor.slotAttribute == null
        && (contributor.slotNameSourceAddressHandle != null || seededAuSlotAttributes.length !== 0))
      || (contributor.slotAttribute != null
        && (slotAttribute == null
          || seededAuSlotAttributes.length !== 1
          || seededAuSlotAttributes[0] !== slotAttribute
          || this.forest.seededAttributePlacement(slotAttribute)?.owner !== contributorNode
          || slotAttribute.name.toLowerCase() !== 'au-slot'))
    ) return null;
    if (
      contributor.disposition === HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent
      && (!(contributorNode instanceof TemplateCompilerElementOccurrence)
        || contributorNode.tagName.toLowerCase() !== 'template'
        || contributorNode.namespace !== HtmlNamespaceKind.Html
        || contributorNode.namespaceUri !== 'http://www.w3.org/1999/xhtml'
        || contributorNode.templateContent == null
        || !(this.seededAttributesByOwner.get(contributorNode) ?? [])
          .every((attribute) => attribute.name.toLowerCase() === 'au-slot'))
    ) return null;
    return input;
  }

  private projectionHostChild(
    instruction: HydrateElementInstruction,
    contributor: HydrateElementProjectionContributor,
  ): {
    readonly host: TemplateCompilerElementOccurrence;
    readonly contributor: TemplateCompilerNodeOccurrence;
    readonly contributorProductHandle: ProductHandle;
  } | null {
    const input = this.instructionHostChild(instruction, contributor.node);
    if (input == null) return null;
    return {
      host: input.host,
      contributor: input.child,
      contributorProductHandle: input.childProductHandle,
    };
  }

  private instructionHostChild(
    instruction: HydrateElementInstruction,
    childReference: HtmlNodeReference,
  ): {
    readonly host: TemplateCompilerElementOccurrence;
    readonly child: TemplateCompilerNodeOccurrence;
    readonly childProductHandle: ProductHandle;
  } | null {
    const hostProductHandle = instruction.node.productHandle;
    const childProductHandle = childReference.productHandle;
    if (hostProductHandle == null || childProductHandle == null) return null;
    const host = this.exactSeededNodeForAuthored(hostProductHandle);
    const child = this.exactSeededNodeForAuthored(childProductHandle);
    const placement = child == null ? null : this.forest.seededNodePlacement(child);
    if (
      !(host instanceof TemplateCompilerElementOccurrence)
      || child == null
      || placement?.parent !== host
      || placement.edgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
    ) return null;
    return { host, child, childProductHandle };
  }

  private assertSeededSourceOrder(node: TemplateCompilerNodeOccurrence): void {
    const parent = node.parent;
    if (parent == null || node.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child) return;
    const currentOrdinal = node.readParentOrdinal();
    if (currentOrdinal == null) return;
    const children = parent.readChildren();
    const seededPlacement = this.forest.seededNodePlacement(node);
    if (seededPlacement?.parent === parent && seededPlacement.edgeKind === TemplateCompilerOccurrenceEdgeKind.Child) {
      const previous = nearestPrior(children, currentOrdinal, (candidate) => {
        const placement = this.forest.seededNodePlacement(candidate);
        return placement?.parent === parent && placement.edgeKind === TemplateCompilerOccurrenceEdgeKind.Child
          ? placement.ordinal
          : null;
      });
      const next = nearestNext(children, currentOrdinal, (candidate) => {
        const placement = this.forest.seededNodePlacement(candidate);
        return placement?.parent === parent && placement.edgeKind === TemplateCompilerOccurrenceEdgeKind.Child
          ? placement.ordinal
          : null;
      });
      if ((previous != null && previous >= seededPlacement.ordinal) || (next != null && next <= seededPlacement.ordinal)) {
        throw new Error(`Browser input children under '${parent.occurrenceKey}' were reordered before compiler execution.`);
      }
      return;
    }
    const sourceOrdinal = seededPlacement?.preorderOrdinal ?? null;
    const transferredOrdinal = (child: TemplateCompilerNodeOccurrence): number | null => {
      const expected = this.expectedFinalInputNodeEdges.get(child);
      const placement = this.forest.seededNodePlacement(child);
      return expected?.parent === parent
        && expected.edgeKind === TemplateCompilerOccurrenceEdgeKind.Child
        && placement != null
        ? placement.preorderOrdinal
        : null;
    };
    const previous = nearestPrior(children, currentOrdinal, transferredOrdinal);
    const next = nearestNext(children, currentOrdinal, transferredOrdinal);
    if (
      sourceOrdinal == null
      || (previous != null && previous >= sourceOrdinal)
      || (next != null && next <= sourceOrdinal)
    ) {
      throw new Error(`Transferred browser inputs under '${parent.occurrenceKey}' were reordered before compiler execution.`);
    }
  }

  private assertSeededAttributeOrder(
    attribute: TemplateCompilerAttributeOccurrence,
    owner: TemplateCompilerElementOccurrence,
  ): void {
    const placement = this.forest.seededAttributePlacement(attribute);
    const currentOrdinal = attribute.readOwnerOrdinal();
    if (placement == null || currentOrdinal == null) return;
    const attributes = owner.readAttributes();
    const seededOrdinal = (candidate: TemplateCompilerAttributeOccurrence): number | null => {
      const candidatePlacement = this.forest.seededAttributePlacement(candidate);
      return candidatePlacement?.owner === owner ? candidatePlacement.ordinal : null;
    };
    const previous = nearestPrior(attributes, currentOrdinal, seededOrdinal);
    const next = nearestNext(attributes, currentOrdinal, seededOrdinal);
    if ((previous != null && previous >= placement.ordinal) || (next != null && next <= placement.ordinal)) {
      throw new Error(`Browser input attributes on '${owner.occurrenceKey}' were reordered before compiler execution.`);
    }
  }

  private requiredAttributeConsumptionCause(
    attribute: TemplateCompilerAttributeOccurrence,
    context: TemplateCompilerTargetContextPlan,
  ): ProductHandle | null {
    if (attribute.name.toLowerCase() !== 'au-slot' || attribute.owner == null) return null;
    for (const child of context.readOwnedContexts()) {
      const authority = child.structuralAuthority;
      if (!(authority instanceof TemplateCompilerProjectionContextStructuralAuthority)) continue;
      for (const contributor of authority.projection.contributors) {
        const authoredAttributeProductHandle = this.forest.exactAuthoredAttributeOrigin(attribute)?.authored.productHandle
          ?? null;
        if (
          contributor.slotAttribute?.productHandle != null
          && authoredAttributeProductHandle != null
          && contributor.slotAttribute.productHandle === authoredAttributeProductHandle
          && this.projectionContributorInput(authority, contributor)?.contributor === attribute.owner
        ) return authority.instruction.productHandle;
      }
    }
    return null;
  }

  private requireCurrentInputEdgeAuthority(node: TemplateCompilerNodeOccurrence): void {
    const seeded = this.forest.seededNodePlacement(node);
    const expected = this.expectedFinalInputNodeEdges.get(node) ?? null;
    const parent = expected == null ? seeded?.parent ?? null : expected.parent;
    const edgeKind = expected == null ? seeded?.edgeKind ?? null : expected.edgeKind;
    if (node.parent !== parent || node.parentEdgeKind !== edgeKind) {
      throw new Error(`Browser input node '${node.occurrenceKey}' has no authority for its current source edge.`);
    }
  }

  private requireContextStructure(context: TemplateCompilerTargetContextPlan): TemplateCompilerContextStructure {
    this.requireContext(context);
    const structure = this.structuresByContextKey.get(context.localKey);
    if (structure == null) {
      throw new Error(`Compiler target context '${context.localKey}' has no structural ownership.`);
    }
    return structure;
  }

  private requireCompleteUnrealizedRow(
    row: TemplateCompilerTargetRowPlan,
  ): TemplateCompilerTargetContextPlan {
    const context = this.contextForLocalKey(row.context.localKey);
    if (context == null || !context.readRows().includes(row)) {
      throw new Error(`Compiler target row '${row.localKey}' belongs to another target plan.`);
    }
    if (row.posture !== TemplateCompilerTargetRowPosture.Complete) {
      throw new Error(`Compiler target row '${row.localKey}' is open and cannot claim exact geometry.`);
    }
    if (row.projectedTargetOrdinal >= exactPrefixEndForContext(context)) {
      throw new Error(`Compiler target row '${row.localKey}' is after an open ordering frontier.`);
    }
    if (this.geometriesByRow.has(row)) {
      throw new Error(`Compiler target row '${row.localKey}' already has exact geometry.`);
    }
    return context;
  }

  private requireExactRowOrigin(
    row: TemplateCompilerTargetRowPlan,
    occurrence: TemplateCompilerNodeOccurrence,
  ): void {
    const origin = this.forest.exactAuthoredNodeOrigin(occurrence);
    if (origin?.authored.productHandle !== row.node.productHandle) {
      throw new Error(
        `Compiler target row '${row.localKey}' has no exact singular authored origin on '${occurrence.occurrenceKey}'.`,
      );
    }
  }

  private requireMarkerTargetShape(
    row: TemplateCompilerTargetRowPlan,
    target: TemplateCompilerElementOccurrence | TemplateCompilerTextOccurrence,
    context: TemplateCompilerTargetContextPlan,
  ): void {
    if (row.node instanceof HtmlText) {
      const instruction = row.instructions.length === 1 ? row.instructions[0] : null;
      const generation = target.generation;
      if (
        !(target instanceof TemplateCompilerTextOccurrence)
        || target.text !== ' '
        || !(instruction instanceof TextBindingInstruction)
        || generation?.role !== TemplateCompilerGeneratedOccurrenceRole.BindingPlaceholder
        || generation.contextKey !== context.localKey
        || generation.operationKey !== row.localKey
        || generation.outputOrdinal !== 0
        || !generation.causeHandles.includes(instruction.productHandle)
      ) {
        throw new Error(
          `Compiler text row '${row.localKey}' requires its exact generated binding placeholder.`,
        );
      }
      return;
    }
    if (
      row.node instanceof HtmlElement
      && target instanceof TemplateCompilerElementOccurrence
      && target.generation == null
    ) return;
    throw new Error(`Compiler target row '${row.localKey}' changed its authored node/target shape.`);
  }

  private claimSourceTarget(
    row: TemplateCompilerTargetRowPlan,
    occurrence: TemplateCompilerNodeOccurrence,
  ): void {
    const existing = this.sourceTargetRowsByOccurrence.get(occurrence);
    if (existing != null) {
      throw new Error(
        `Compiler target rows '${existing.localKey}' and '${row.localKey}' reuse logical occurrence '${occurrence.occurrenceKey}'.`,
      );
    }
    this.sourceTargetRowsByOccurrence.set(occurrence, row);
  }

  private requireAppendOnlyOuterTemplateController(
    context: TemplateCompilerTargetContextPlan,
    row: TemplateCompilerTargetRowPlan,
    structure: TemplateCompilerContextStructure,
  ): void {
    const instruction = row.instructions.length === 1 ? row.instructions[0] : null;
    const contextAuthority = context.structuralAuthority;
    const innerContexts = instruction instanceof HydrateTemplateControllerInstruction
      ? context.readOwnedContexts().filter((child) =>
          child.role === TemplateCompilerTargetContextRole.TemplateController
          && child.owner.productHandle === instruction.productHandle
        )
      : [];
    if (
      context.role !== TemplateCompilerTargetContextRole.TemplateController
      || row.ordinal !== 0
      || context.readRows().length !== 1
      || !(instruction instanceof HydrateTemplateControllerInstruction)
      || !(contextAuthority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority)
      || contextAuthority.instruction.node.productHandle !== instruction.node.productHandle
      || innerContexts.length !== 1
      || structure.compilerCarrier.generation == null
      || structure.compilerContent.generation == null
      || structure.compilerContent.readChildren().length !== 0
    ) {
      throw new Error(
        `Compiler target row '${row.localKey}' is not the sole append-only outer template-controller row.`,
      );
    }
  }

  private assertGeneratedInventory(): void {
    this.mutationAuthority.assertGeneratedInventory();
    for (const node of this.forest.readNodes()) {
      const generation = node.generation;
      if (generation == null) continue;
      if (this.contextForLocalKey(generation.contextKey) == null) {
        throw new Error(`Generated compiler occurrence '${node.occurrenceKey}' names an alien target context.`);
      }
      switch (generation.role) {
        case TemplateCompilerGeneratedOccurrenceRole.TemplateCarrier:
          if (
            !(node instanceof TemplateCompilerElementOccurrence)
            || node.inputReference != null
            || this.structuresByContextKey.get(generation.contextKey)?.compilerCarrier !== node
            || node.tagName.toLowerCase() !== 'template'
            || node.namespace !== HtmlNamespaceKind.Html
            || node.namespaceUri !== 'http://www.w3.org/1999/xhtml'
            || node.parent !== null
            || node.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Root
            || node.readChildren().length !== 0
          ) {
            throw new Error(`Generated template carrier '${node.occurrenceKey}' is not the exact assigned context carrier.`);
          }
          break;
        case TemplateCompilerGeneratedOccurrenceRole.TemplateContent:
          if (
            !(node instanceof TemplateCompilerFragmentOccurrence)
            || node.inputReference != null
            || this.structuresByContextKey.get(generation.contextKey)?.compilerContent !== node
            || !(node.parent instanceof TemplateCompilerElementOccurrence)
            || node.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.TemplateContent
          ) {
            throw new Error(`Generated template content '${node.occurrenceKey}' is not the exact assigned context content.`);
          }
          break;
        case TemplateCompilerGeneratedOccurrenceRole.CompilerMarker:
          if (
            !(node instanceof TemplateCompilerCommentOccurrence)
            || node.inputReference != null
            || node.text !== 'au'
            || node.semanticKind !== HtmlCommentSemanticKind.CompilerMarker
            || !this.geometriesByMarker.has(node)
          ) {
            throw new Error(`Generated compiler marker '${node.occurrenceKey}' has no exact target geometry.`);
          }
          break;
        case TemplateCompilerGeneratedOccurrenceRole.RenderLocationStart:
          if (
            !(node instanceof TemplateCompilerCommentOccurrence)
            || node.inputReference != null
            || node.text !== 'au-start'
            || node.semanticKind !== HtmlCommentSemanticKind.RenderLocationStart
            || !this.geometriesByStart.has(node)
          ) {
            throw new Error(`Generated render-location start '${node.occurrenceKey}' has no exact target geometry.`);
          }
          break;
        case TemplateCompilerGeneratedOccurrenceRole.RenderLocationEnd:
          if (
            !(node instanceof TemplateCompilerCommentOccurrence)
            || node.inputReference != null
            || node.text !== 'au-end'
            || node.semanticKind !== HtmlCommentSemanticKind.RenderLocationEnd
            || !this.geometriesByEnd.has(node)
          ) {
            throw new Error(`Generated render-location end '${node.occurrenceKey}' has no exact target geometry.`);
          }
          break;
        case TemplateCompilerGeneratedOccurrenceRole.BindingPlaceholder: {
          const row = this.sourceTargetRowsByOccurrence.get(node) ?? null;
          if (
            !(node instanceof TemplateCompilerTextOccurrence)
            || node.text !== ' '
            || this.forest.exactAuthoredNodeOrigin(node) == null
            || row == null
            || row.context.localKey !== generation.contextKey
            || row.localKey !== generation.operationKey
            || this.geometriesByRow.get(row)?.geometryKind !== TemplateCompilerTargetGeometryKind.Marker
            || (this.geometriesByRow.get(row) as TemplateCompilerMarkerTargetGeometry).target !== node
          ) {
            throw new Error(`Generated binding placeholder '${node.occurrenceKey}' has no unique exact marker target.`);
          }
          break;
        }
        case TemplateCompilerGeneratedOccurrenceRole.StaticTextSegment:
          if (
            !(node instanceof TemplateCompilerTextOccurrence)
            || node.text.length === 0
            || this.forest.exactAuthoredNodeOrigin(node) == null
            || this.inputTextExpansionsByOutput.get(node) == null
          ) {
            throw new Error(`Generated text output '${node.occurrenceKey}' has no exact input expansion.`);
          }
          break;
        case TemplateCompilerGeneratedOccurrenceRole.Clone:
          if (node.inputReference == null || this.forest.exactAuthoredNodeOrigin(node) == null) {
            throw new Error(`Generated clone '${node.occurrenceKey}' has no exact authored input origin.`);
          }
          if (
            node instanceof TemplateCompilerCommentOccurrence
            && node.semanticKind !== HtmlCommentSemanticKind.Plain
          ) {
            throw new Error(`Generated comment clone '${node.occurrenceKey}' changed semantic marker kind.`);
          }
          throw new Error(`Generated clone '${node.occurrenceKey}' has no exact structural clone operation.`);
      }
    }
    for (const attribute of this.forest.readAttributes()) {
      const generation = attribute.generation;
      if (generation == null) continue;
      if (
        this.contextForLocalKey(generation.contextKey) == null
        || generation.role !== TemplateCompilerGeneratedOccurrenceRole.Clone
        || attribute.inputReference == null
        || this.forest.exactAuthoredAttributeOrigin(attribute) == null
      ) {
        throw new Error(`Generated compiler attribute '${attribute.occurrenceKey}' has incoherent session authority.`);
      }
      throw new Error(`Generated compiler attribute '${attribute.occurrenceKey}' has no exact structural clone operation.`);
    }
  }

  private assertInputNodeTransfers(): void {
    if (
      this.inputNodeTransfers.length
      !== [...this.inputNodeTransfersByNode.values()].reduce((count, transfers) => count + transfers.length, 0)
    ) {
      throw new Error('Compiler input-node transfer indexes have divergent cardinality.');
    }
    for (const [node, transfers] of this.inputNodeTransfersByNode) {
      const seededPlacement = this.forest.seededNodePlacement(node);
      if (seededPlacement == null || transfers.length === 0) {
        throw new Error(`Compiler occurrence '${node.occurrenceKey}' has incoherent transfer history.`);
      }
      let priorDestination: TemplateCompilerInputNodeTransfer | null = null;
      for (const transfer of transfers) {
        this.requireContext(transfer.context);
        const structure = this.requireContextStructure(transfer.context);
        const admittedEntrant = this.structuralEntrantForNode(node, transfer.context);
        const sourceIsSeeded = transfer.sourceParent === seededPlacement.parent
          && transfer.sourceEdgeKind === seededPlacement.edgeKind;
        const sourceIsPriorDestination = priorDestination != null
          && transfer.sourceParent === priorDestination.destinationParent
          && transfer.sourceEdgeKind === priorDestination.destinationEdgeKind;
        const sourceIsCompilerReplacement = transfer.sourceParent === null
          && transfer.sourceEdgeKind === TemplateCompilerOccurrenceEdgeKind.Detached
          && node instanceof TemplateCompilerElementOccurrence
          && (this.renderReplacementsByOccurrence.get(node)?.length ?? 0) > 0;
        const destinationIsContextContent = transfer.destinationEdgeKind === TemplateCompilerOccurrenceEdgeKind.Child
          && transfer.destinationParent === structure.compilerContent;
        const destinationIsContextCarrier = transfer.destinationEdgeKind === TemplateCompilerOccurrenceEdgeKind.Root
          && transfer.destinationParent === null
          && structure.compilerCarrier === node;
        if (
          transfer.node !== node
          || transfer.inputReference !== node.inputReference
          || transfer.authoredProductHandle
            !== (this.forest.exactAuthoredNodeOrigin(node)?.authored.productHandle ?? null)
          || admittedEntrant == null
          || transfer.structuralEntrantProductHandle !== admittedEntrant
          || (!sourceIsSeeded && !sourceIsPriorDestination && !sourceIsCompilerReplacement)
          || (transfer.sourceEdgeKind === TemplateCompilerOccurrenceEdgeKind.Detached) !== (transfer.sourceOrdinal == null)
          || (!destinationIsContextContent && !destinationIsContextCarrier)
          || !Number.isSafeInteger(transfer.destinationOrdinal)
          || transfer.destinationOrdinal < 0
          || transfer.causeHandles.length === 0
          || this.inputNodeTransfer(transfer.context, node) !== transfer
        ) {
          throw new Error(`Compiler input-node transfer '${node.occurrenceKey}' has incoherent structural authority.`);
        }
        priorDestination = transfer;
      }
    }
    for (const context of this.readContexts()) {
      if (context.role === TemplateCompilerTargetContextRole.Root) continue;
      this.assertContextEntrantCoverage(context);
    }
  }

  private assertContextEntrantCoverage(context: TemplateCompilerTargetContextPlan): void {
    const transfers = this.inputNodeTransfersByContextKey.get(context.localKey) ?? [];
    const authority = context.structuralAuthority;
    if (authority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority) {
      if (!this.isSourceBearingTemplateControllerContext(context)) {
        if (transfers.length !== 0) {
          throw new Error(`Outer template-controller context '${context.localKey}' cannot retain a source transfer.`);
        }
        return;
      }
      const entrantProductHandle = authority.instruction.node.productHandle;
      const input = entrantProductHandle == null ? null : this.exactSeededNodeForAuthored(entrantProductHandle);
      const transfer = input == null ? null : this.inputNodeTransfer(context, input);
      if (
        input == null
        || transfer?.structuralEntrantProductHandle !== entrantProductHandle
      ) {
        throw new Error(`Compiler target context '${context.localKey}' has no exact template-controller transfer.`);
      }
      return;
    }
    if (!(authority instanceof TemplateCompilerProjectionContextStructuralAuthority)) {
      throw new Error(`Non-root compiler target context '${context.localKey}' has no structural authority.`);
    }
    let previousHostOrdinal = -1;
    for (const contributor of authority.projection.contributors) {
      const input = this.projectionContributorInput(authority, contributor);
      const hostOrdinal = input == null ? null : this.forest.seededNodePlacement(input.contributor)?.ordinal ?? null;
      if (input == null || hostOrdinal == null || hostOrdinal <= previousHostOrdinal) {
        throw new Error(`Projection context '${context.localKey}' has an inexact or reordered browser contributor.`);
      }
      previousHostOrdinal = hostOrdinal;
      switch (contributor.disposition) {
        case HydrateElementProjectionContributorDisposition.RetainedNode: {
          const retainedTransfer = this.inputNodeTransfer(context, input.contributor);
          if (
            retainedTransfer == null
            || retainedTransfer.structuralEntrantProductHandle !== input.contributorProductHandle
          ) {
            throw new Error(
              `Projection context '${context.localKey}' has no exact retained-contributor transfer.`,
            );
          }
          if (contributor.slotAttribute != null) {
            const auSlotAttribute = contributor.slotAttribute.productHandle == null
              ? null
              : this.exactSeededAttributeForAuthored(contributor.slotAttribute.productHandle);
            const ownerContext = context.ownerContext == null
              ? null
              : this.contextForLocalKey(context.ownerContext.localKey);
            const disposition = auSlotAttribute == null
              ? null
              : this.consumedAttributes.get(auSlotAttribute) ?? null;
            if (
              ownerContext == null
              || disposition?.context !== ownerContext
              || !disposition.causeHandles.includes(authority.instruction.productHandle)
              || disposition.eventOrdinal >= retainedTransfer.eventOrdinal
            ) {
              throw new Error(`Projection context '${context.localKey}' retained its explicit au-slot attribute.`);
            }
          }
          break;
        }
        case HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent: {
          const disposition = this.consumedNodes.get(input.contributor) ?? null;
          const content = input.contributor instanceof TemplateCompilerElementOccurrence
            ? input.contributor.templateContent
            : null;
          const directInputs = content == null ? [] : this.seededChildNodesByParent.get(content) ?? [];
          const directTransfers = directInputs.map((node) => this.inputNodeTransfer(context, node));
          if (
            disposition?.context !== context
            || directTransfers.some((transfer) =>
              transfer == null
              || transfer.structuralEntrantProductHandle !== input.contributorProductHandle
              || transfer.eventOrdinal <= disposition.eventOrdinal
            )
          ) {
            throw new Error(`Projection context '${context.localKey}' has an incoherent unwrapped-template extraction.`);
          }
          break;
        }
        case HydrateElementProjectionContributorDisposition.DiscardedWhitespace:
          throw new Error(`Projection context '${context.localKey}' retained a discarded whitespace contributor.`);
      }
    }
  }

  private inputNodeTransfer(
    context: TemplateCompilerTargetContextPlan,
    node: TemplateCompilerNodeOccurrence,
  ): TemplateCompilerInputNodeTransfer | null {
    return this.inputNodeTransfersByContextAndNode.get(context.localKey)?.get(node) ?? null;
  }

  private assertDiscardedProjectionContributors(): void {
    for (const context of this.readContexts()) {
      for (const row of context.readRows()) {
        for (const instruction of row.instructions) {
          if (!(instruction instanceof HydrateElementInstruction)) continue;
          let previousHostOrdinal = -1;
          for (const contributor of instruction.discardedProjectionContributors) {
            const input = this.projectionHostChild(instruction, contributor);
            const placement = input == null ? null : this.forest.seededNodePlacement(input.contributor);
            const disposition = input == null ? null : this.consumedNodes.get(input.contributor) ?? null;
            if (
              contributor.disposition !== HydrateElementProjectionContributorDisposition.DiscardedWhitespace
              || !(input?.contributor instanceof TemplateCompilerTextOccurrence)
              || input.contributor.text.trim() !== ''
              || placement == null
              || placement.ordinal <= previousHostOrdinal
              || disposition?.context !== context
              || disposition.owner !== input.host
              || !disposition.causeHandles.includes(instruction.productHandle)
              || (this.inputNodeTransfersByNode.get(input.contributor)?.length ?? 0) !== 0
            ) {
              throw new Error(
                `Hydrate-element instruction '${instruction.productHandle}' has an incoherent discarded projection input.`,
              );
            }
            previousHostOrdinal = placement.ordinal;
          }
        }
      }
    }
  }

  private assertKnownAuSlotProcessContent(): void {
    for (const context of this.readContexts()) {
      for (const row of context.readRows()) {
        for (const instruction of row.instructions) {
          if (!(instruction instanceof HydrateElementInstruction) || instruction.auSlotProcessContent == null) continue;
          const removed = instruction.auSlotProcessContentRemovedChildNodes;
          if (new Set(removed.map((child) => child.productHandle)).size !== removed.length) {
            throw new Error(`AuSlot instruction '${instruction.productHandle}' repeats a removed child input.`);
          }
          let previousHostOrdinal = -1;
          for (const childReference of removed) {
            const input = this.instructionHostChild(instruction, childReference);
            const placement = input == null ? null : this.forest.seededNodePlacement(input.child);
            const disposition = input == null ? null : this.consumedNodes.get(input.child) ?? null;
            const hasAuSlotAttribute = input != null
              && input.child instanceof TemplateCompilerElementOccurrence
              && (this.seededAttributesByOwner.get(input.child) ?? [])
                .some((attribute) => attribute.name.toLowerCase() === 'au-slot');
            if (
              input == null
              || placement == null
              || placement.ordinal <= previousHostOrdinal
              || !hasAuSlotAttribute
              || disposition?.context !== context
              || disposition.owner !== input.host
              || !disposition.causeHandles.includes(instruction.productHandle)
              || (this.inputNodeTransfersByNode.get(input.child)?.length ?? 0) !== 0
            ) {
              throw new Error(`AuSlot instruction '${instruction.productHandle}' has an incoherent removed child input.`);
            }
            previousHostOrdinal = placement.ordinal;
          }
        }
      }
    }
  }

  private assertInputTextExpansions(): void {
    for (const [input, expansion] of this.inputTextExpansions) {
      this.requireContext(expansion.context);
      const structure = this.requireContextStructure(expansion.context);
      const expansionOutputs = new Set<TemplateCompilerNodeOccurrence>(expansion.outputs);
      const actualOutputs = expansion.sourceParent.readChildren().filter((node) => expansionOutputs.has(node));
      const sourceChildren = expansion.sourceParent.readChildren();
      const outputIndexes = expansion.outputs.map((output) => sourceChildren.indexOf(output));
      const seededInput = this.forest.seededNodePlacement(input);
      const retainedSiblingIndexes = sourceChildren.flatMap((node, index) => {
        const placement = this.forest.seededNodePlacement(node);
        return placement != null
          && seededInput != null
          && placement.parent === seededInput.parent
          && placement.edgeKind === seededInput.edgeKind
          ? [{ index, seededOrdinal: placement.ordinal }]
          : [];
      });
      const precedingIndex = Math.max(-1, ...retainedSiblingIndexes
        .filter((entry) => entry.seededOrdinal < (seededInput?.ordinal ?? -1))
        .map((entry) => entry.index));
      const followingIndex = Math.min(Number.POSITIVE_INFINITY, ...retainedSiblingIndexes
        .filter((entry) => entry.seededOrdinal > (seededInput?.ordinal ?? Number.POSITIVE_INFINITY))
        .map((entry) => entry.index));
      const firstOutputIndex = Math.min(...outputIndexes);
      const lastOutputIndex = Math.max(...outputIndexes);
      if (
        expansion.input !== input
        || input.generation != null
        || input.inputReference == null
        || expansion.inputReference !== input.inputReference
        || !contextContains(structure.compilerContent, expansion.sourceParent)
        || expansion.sourceOrdinal < 0
        || expansion.outputs.length === 0
        || seededInput == null
        || !sameOccurrences(actualOutputs, expansion.outputs)
        || expansion.outputs.some((output) => this.inputTextExpansionsByOutput.get(output) !== expansion)
        || outputIndexes.some((index) => index < 0)
        || precedingIndex >= firstOutputIndex
        || followingIndex <= lastOutputIndex
        || expansion.outputs.some((output) =>
          output.parent !== expansion.sourceParent
          || output.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
          || output.inputReference !== input.inputReference
          || output.generation?.contextKey !== expansion.context.localKey
          || (output.generation.role !== TemplateCompilerGeneratedOccurrenceRole.StaticTextSegment
            && output.generation.role !== TemplateCompilerGeneratedOccurrenceRole.BindingPlaceholder)
        )
        || expansion.causeHandles.length === 0
        || input.parent !== null
        || input.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Detached
      ) {
        throw new Error(`Compiler text input '${input.occurrenceKey}' has an incoherent expansion.`);
      }
    }
  }

  private assertSeededInputTopology(): void {
    for (const node of this.forest.readNodes()) {
      const seededPlacement = this.forest.seededNodePlacement(node);
      if (seededPlacement == null) continue;
      const expected = this.expectedFinalInputNodeEdges.get(node) ?? null;
      if (expected != null) {
        if (node.parent !== expected.parent || node.parentEdgeKind !== expected.edgeKind) {
          throw new Error(`Browser input node '${node.occurrenceKey}' diverges from its final caused edge.`);
        }
        continue;
      }
      if (node.parent === seededPlacement.parent && node.parentEdgeKind === seededPlacement.edgeKind) continue;
      if (
        node.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Detached
        || node.parent !== null
        || !(node instanceof TemplateCompilerTextOccurrence && this.inputTextExpansions.has(node))
      ) {
        throw new Error(`Browser input node '${node.occurrenceKey}' changed topology without a compiler operation.`);
      }
    }

    const retainedChildrenBySeededParent = new Map<TemplateCompilerParentOccurrence, {
      readonly node: TemplateCompilerNodeOccurrence;
      readonly seededOrdinal: number;
    }[]>();
    for (const node of this.forest.readNodes()) {
      const placement = this.forest.seededNodePlacement(node);
      if (
        placement?.parent == null
        || placement.edgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
        || node.parent !== placement.parent
        || node.parentEdgeKind !== placement.edgeKind
      ) continue;
      appendMap(retainedChildrenBySeededParent, placement.parent, {
        node,
        seededOrdinal: placement.ordinal,
      });
    }
    for (const [parent, retained] of retainedChildrenBySeededParent) {
      const retainedNodes = new Set(retained.map((entry) => entry.node));
      const actual = parent.readChildren().filter((node) => retainedNodes.has(node));
      const expected = [...retained]
        .sort((left, right) => left.seededOrdinal - right.seededOrdinal)
        .map((entry) => entry.node);
      if (!sameOccurrences(actual, expected)) {
        throw new Error(`Browser input children under '${parent.occurrenceKey}' changed relative order without a compiler operation.`);
      }
    }

    for (const context of this.readContexts()) {
      const structure = this.requireContextStructure(context);
      const transferred = structure.compilerContent.readChildren().filter((node) => {
        const expected = this.expectedFinalInputNodeEdges.get(node);
        return expected?.parent === structure.compilerContent
          && expected.edgeKind === TemplateCompilerOccurrenceEdgeKind.Child;
      });
      const seededOrder = transferred.map((node) => this.forest.seededNodePlacement(node)?.preorderOrdinal ?? -1);
      if (seededOrder.some((ordinal, index) => ordinal < 0 || (index > 0 && ordinal <= seededOrder[index - 1]!))) {
        throw new Error(`Compiler target context '${context.localKey}' changed transferred input order.`);
      }
    }

    for (const attribute of this.forest.readAttributes()) {
      const placement = this.forest.seededAttributePlacement(attribute);
      if (placement == null || attribute.owner == null) continue;
      if (attribute.owner !== placement.owner) {
        throw new Error(`Browser input attribute '${attribute.occurrenceKey}' changed owner without a compiler operation.`);
      }
    }
    for (const owner of this.forest.readNodes()) {
      if (!(owner instanceof TemplateCompilerElementOccurrence)) continue;
      const retained = owner.readAttributes().flatMap((attribute) => {
        const placement = this.forest.seededAttributePlacement(attribute);
        return placement?.owner === owner ? [{ attribute, ordinal: placement.ordinal }] : [];
      });
      const expected = [...retained]
        .sort((left, right) => left.ordinal - right.ordinal)
        .map((entry) => entry.attribute);
      if (!sameOccurrences(retained.map((entry) => entry.attribute), expected)) {
        throw new Error(`Browser input attributes on '${owner.occurrenceKey}' changed relative order.`);
      }
    }
  }

  private assertSourceBandOrder(): void {
    for (const parent of this.forest.readNodes()) {
      if (!(parent instanceof TemplateCompilerFragmentOccurrence || parent instanceof TemplateCompilerElementOccurrence)) {
        continue;
      }
      let previousOrdinal = -1;
      for (const child of parent.readChildren()) {
        const ordinal = this.sourcePreorderOrdinalForOutput(child);
        if (ordinal == null) continue;
        if (ordinal < previousOrdinal) {
          throw new Error(`Compiler outputs under '${parent.occurrenceKey}' crossed their browser-input source order.`);
        }
        previousOrdinal = ordinal;
      }
    }
  }

  private sourcePreorderOrdinalForOutput(node: TemplateCompilerNodeOccurrence): number | null {
    const seeded = this.forest.seededNodePlacement(node);
    if (seeded != null) return seeded.preorderOrdinal;
    if (node instanceof TemplateCompilerTextOccurrence) {
      const expansion = this.inputTextExpansionsByOutput.get(node) ?? null;
      return expansion == null
        ? null
        : this.forest.seededNodePlacement(expansion.input)?.preorderOrdinal ?? null;
    }
    if (!(node instanceof TemplateCompilerCommentOccurrence)) return null;
    const renderGeometry = this.geometriesByStart.get(node)
      ?? this.geometriesByEnd.get(node)
      ?? null;
    if (renderGeometry?.replacedNode != null) {
      return this.forest.seededNodePlacement(renderGeometry.replacedNode)?.preorderOrdinal ?? null;
    }
    const markerGeometry = this.geometriesByMarker.get(node) ?? null;
    if (markerGeometry == null) return null;
    const source = markerGeometry.geometryKind === TemplateCompilerTargetGeometryKind.RenderLocation
      ? markerGeometry.replacedNode
      : markerGeometry.target;
    if (source == null) return null;
    const sourceSeed = this.forest.seededNodePlacement(source);
    if (sourceSeed != null) return sourceSeed.preorderOrdinal;
    return source instanceof TemplateCompilerTextOccurrence
      ? this.forest.seededNodePlacement(this.inputTextExpansionsByOutput.get(source)?.input ?? source)?.preorderOrdinal ?? null
      : null;
  }

  private assertInputEventSequence(): void {
    const ordinals = [
      ...this.inputNodeTransfers.map((event) => event.eventOrdinal),
      ...[...this.inputTextExpansions.values()].map((event) => event.eventOrdinal),
      ...[...this.consumedNodes.values()].map((event) => event.eventOrdinal),
      ...[...this.consumedAttributes.values()].map((event) => event.eventOrdinal),
    ].sort((left, right) => left - right);
    if (
      ordinals.length !== this.nextInputEventOrdinal
      || ordinals.some((ordinal, index) => ordinal !== index)
    ) {
      throw new Error('Compiler input events do not form one exact execution sequence.');
    }
  }

  private assertInputDispositions(): void {
    this.assertInputEventSequence();
    const liveNodes = collectForestLiveNodes(this.forest);
    const replacementCoverage = new Map<TemplateCompilerNodeOccurrence, boolean>();
    const consumptionEventOrdinals = new Set<number>();
    for (const [node, disposition] of this.consumedNodes) {
      this.requireContext(disposition.context);
      const exactOrigin = this.forest.exactAuthoredNodeOrigin(node)?.authored.productHandle ?? null;
      const expectedOrdinal = exactOrigin == null
        ? null
        : disposition.context.compilerReachableNodeOrdinal(exactOrigin);
      const hasInvalidEventOrdinal = !Number.isSafeInteger(disposition.eventOrdinal)
        || disposition.eventOrdinal < 0
        || disposition.eventOrdinal >= this.nextInputEventOrdinal
        || consumptionEventOrdinals.has(disposition.eventOrdinal);
      consumptionEventOrdinals.add(disposition.eventOrdinal);
      if (
        node.generation != null
        || node.inputReference == null
        || disposition.node !== node
        || disposition.inputReference !== node.inputReference
        || disposition.authoredProductHandle !== exactOrigin
        || disposition.membershipOrdinal !== expectedOrdinal
        || this.forest.nodeForOccurrenceKey(disposition.owner.occurrenceKey) !== disposition.owner
        || disposition.ownerEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
        || disposition.ownerOrdinal < 0
        || hasInvalidEventOrdinal
        || disposition.causeHandles.length === 0
        || node.parent !== null
        || node.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Detached
      ) {
        throw new Error(`Consumed compiler occurrence '${node.occurrenceKey}' has incoherent input disposition.`);
      }
    }
    for (const [attribute, disposition] of this.consumedAttributes) {
      this.requireContext(disposition.context);
      const exactOrigin = this.forest.exactAuthoredAttributeOrigin(attribute)?.authored.productHandle ?? null;
      const hasInvalidEventOrdinal = !Number.isSafeInteger(disposition.eventOrdinal)
        || disposition.eventOrdinal < 0
        || disposition.eventOrdinal >= this.nextInputEventOrdinal
        || consumptionEventOrdinals.has(disposition.eventOrdinal);
      consumptionEventOrdinals.add(disposition.eventOrdinal);
      if (
        attribute.generation != null
        || attribute.inputReference == null
        || disposition.attribute !== attribute
        || disposition.inputReference !== attribute.inputReference
        || disposition.authoredProductHandle !== exactOrigin
        || this.forest.nodeForOccurrenceKey(disposition.owner.occurrenceKey) !== disposition.owner
        || disposition.ownerOrdinal < 0
        || hasInvalidEventOrdinal
        || disposition.causeHandles.length === 0
        || attribute.owner !== null
      ) {
        throw new Error(`Consumed compiler attribute '${attribute.occurrenceKey}' has incoherent input disposition.`);
      }
    }

    for (const node of this.forest.readNodes()) {
      const input = node.inputReference;
      if (node.generation != null || input == null || liveNodes.has(node)) continue;
      if (
        !this.consumedNodes.has(node)
        && !(node instanceof TemplateCompilerTextOccurrence && this.inputTextExpansions.has(node))
        && !this.hasNodeReplacementCoverage(node, replacementCoverage)
      ) {
        throw new Error(`Browser input node '${node.occurrenceKey}' has no final compiler disposition.`);
      }
    }
    for (const attribute of this.forest.readAttributes()) {
      const input = attribute.inputReference;
      if (
        attribute.generation != null
        || input == null
        || (attribute.owner != null && liveNodes.has(attribute.owner))
      ) continue;
      const ownerCovered = attribute.owner != null
        && this.hasNodeReplacementCoverage(attribute.owner, replacementCoverage);
      const seededOwnerCovered = this.forest.seededAttributePlacement(attribute)?.owner;
      const originalOwnerCovered = seededOwnerCovered != null
        && this.hasNodeReplacementCoverage(seededOwnerCovered, replacementCoverage);
      if (!this.consumedAttributes.has(attribute) && !ownerCovered && !originalOwnerCovered) {
        throw new Error(`Browser input attribute '${attribute.occurrenceKey}' has no final compiler disposition.`);
      }
    }
  }

  private hasNodeReplacementCoverage(
    node: TemplateCompilerNodeOccurrence,
    cache: Map<TemplateCompilerNodeOccurrence, boolean>,
  ): boolean {
    let current: TemplateCompilerNodeOccurrence | null = node;
    const visited: TemplateCompilerNodeOccurrence[] = [];
    let covered = false;
    while (current != null) {
      const cached = cache.get(current);
      if (cached != null) {
        covered = cached;
        break;
      }
      visited.push(current);
      if (
        this.consumedNodes.has(current)
        || (current instanceof TemplateCompilerElementOccurrence
          && current.parent === null
          && current.parentEdgeKind === TemplateCompilerOccurrenceEdgeKind.Detached
          && this.latestRenderReplacementByOccurrence.has(current))
      ) {
        covered = true;
        break;
      }
      current = current.parent;
    }
    for (const candidate of visited) cache.set(candidate, covered);
    return covered;
  }

  private assertContextAuthoredMembership(structure: TemplateCompilerContextStructure): void {
    const expected = structure.context.readCompilerReachableNodeProductHandles();
    const live = this.contextLiveAuthoredMembership(structure);
    const consumedByOrdinal = new Map<number, TemplateCompilerConsumedNodeDisposition>();
    for (const disposition of this.consumedNodesByContextKey.get(structure.context.localKey) ?? []) {
      if (disposition.context !== structure.context) {
        throw new Error(`Compiler target context '${structure.context.localKey}' has a foreign consumed disposition.`);
      }
      if (
        disposition.node.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Detached
      ) {
        throw new Error(`Compiler target context '${structure.context.localKey}' has incoherent consumed membership.`);
      }
      if (disposition.membershipOrdinal != null) {
        if (consumedByOrdinal.has(disposition.membershipOrdinal)) {
          throw new Error(`Compiler target context '${structure.context.localKey}' has duplicate consumed membership.`);
        }
        consumedByOrdinal.set(disposition.membershipOrdinal, disposition);
      }
    }
    const consumedHandles = new Set(
      [...consumedByOrdinal.values()].flatMap((disposition) =>
        disposition.authoredProductHandle == null ? [] : [disposition.authoredProductHandle]
      ),
    );
    if (live.some((handle) => consumedHandles.has(handle))) {
      throw new Error(`Compiler target context '${structure.context.localKey}' retains and consumes one authored member.`);
    }
    let liveIndex = 0;
    for (let ordinal = 0; ordinal < expected.length; ordinal++) {
      const disposition = consumedByOrdinal.get(ordinal);
      const actual = disposition?.authoredProductHandle ?? live[liveIndex++];
      if (actual !== expected[ordinal]) {
        throw new Error(`Compiler target context '${structure.context.localKey}' has divergent authored membership/order.`);
      }
    }
    if (liveIndex !== live.length || [...consumedByOrdinal.keys()].some((ordinal) => ordinal >= expected.length)) {
      throw new Error(`Compiler target context '${structure.context.localKey}' has excess authored membership.`);
    }
  }

  private contextLiveAuthoredMembership(
    structure: TemplateCompilerContextStructure,
  ): readonly ProductHandle[] {
    const result: ProductHandle[] = [];
    const seen = new Set<ProductHandle>();
    const append = (node: TemplateCompilerNodeOccurrence): void => {
      const handle = this.forest.exactAuthoredNodeOrigin(node)?.authored.productHandle;
      if (handle != null && !seen.has(handle)) {
        seen.add(handle);
        result.push(handle);
      }
    };
    append(structure.compilerCarrier);
    contextPreorder(structure.compilerContent, (node) => {
      if (node instanceof TemplateCompilerElementOccurrence || node instanceof TemplateCompilerTextOccurrence) {
        append(node);
      }
      const geometry = node instanceof TemplateCompilerCommentOccurrence
        ? this.geometriesByMarker.get(node) ?? null
        : null;
      if (
        geometry?.geometryKind === TemplateCompilerTargetGeometryKind.RenderLocation
        && geometry.replacedNode?.parentEdgeKind === TemplateCompilerOccurrenceEdgeKind.Detached
        && this.latestRenderReplacementByOccurrence.get(geometry.replacedNode) === geometry
      ) {
        append(geometry.replacedNode);
      }
    });
    return result;
  }

  private requireForestNode(node: TemplateCompilerNodeOccurrence): void {
    if (this.forest.nodeForOccurrenceKey(node.occurrenceKey) !== node) {
      throw new Error(`Compiler occurrence '${node.occurrenceKey}' belongs to another forest.`);
    }
  }

  private requireNodeInContext(
    node: TemplateCompilerNodeOccurrence,
    structure: TemplateCompilerContextStructure,
  ): void {
    if (!contextContains(structure.compilerContent, node)) {
      throw new Error(
        `Compiler occurrence '${node.occurrenceKey}' is outside target context '${structure.context.localKey}'.`,
      );
    }
  }

  private assertContextStructure(structure: TemplateCompilerContextStructure): void {
    if (
      structure.compilerCarrier.parent !== null
      || structure.compilerCarrier.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Root
      || structure.compilerCarrier.tagName.toLowerCase() !== 'template'
      || structure.compilerCarrier.namespace !== HtmlNamespaceKind.Html
      || structure.compilerCarrier.namespaceUri !== 'http://www.w3.org/1999/xhtml'
      || structure.compilerCarrier.readChildren().length !== 0
      || structure.compilerCarrier.templateContent !== structure.compilerContent
      || structure.compilerContent.parent !== structure.compilerCarrier
      || structure.compilerContent.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.TemplateContent
    ) {
      throw new Error(`Compiler target context '${structure.context.localKey}' has incoherent structural ownership.`);
    }
    const sourceInput = this.templateControllerSourceInput(structure.context);
    const requiresInputCarrier = this.isSourceBearingTemplateControllerContext(structure.context)
      && sourceInput instanceof TemplateCompilerElementOccurrence
      && this.isReusableInputTemplateCarrier(sourceInput);
    if (
      (requiresInputCarrier && (structure.compilerCarrier !== sourceInput || structure.compilerCarrier.generation != null))
      || (!requiresInputCarrier
        && structure.context.role !== TemplateCompilerTargetContextRole.Root
        && structure.compilerCarrier.generation?.role !== TemplateCompilerGeneratedOccurrenceRole.TemplateCarrier)
    ) {
      throw new Error(`Compiler target context '${structure.context.localKey}' selected the wrong carrier kind.`);
    }
  }

  private assertGeometry(
    structure: TemplateCompilerContextStructure,
    geometry: TemplateCompilerTargetGeometry,
  ): void {
    if (geometry.row.context.localKey !== structure.context.localKey) {
      throw new Error(`Compiler target row '${geometry.row.localKey}' names the wrong structural context.`);
    }
    if (
      geometry.marker.semanticKind !== HtmlCommentSemanticKind.CompilerMarker
      || this.geometriesByMarker.get(geometry.marker) !== geometry
      || geometry.marker.generation?.role !== TemplateCompilerGeneratedOccurrenceRole.CompilerMarker
      || geometry.marker.generation.contextKey !== structure.context.localKey
      || geometry.marker.generation.operationKey !== geometry.row.localKey
      || geometry.marker.generation.outputOrdinal !== 0
    ) {
      throw new Error(`Compiler target row '${geometry.row.localKey}' has an incoherent generated marker.`);
    }
    this.requireNodeInContext(geometry.marker, structure);
    switch (geometry.geometryKind) {
      case TemplateCompilerTargetGeometryKind.Marker: {
        if (geometry.row.targetKind !== TemplateRenderTargetKind.MarkerTarget) {
          throw new Error(`Compiler marker geometry '${geometry.row.localKey}' changed target kind.`);
        }
        this.requireMarkerTargetShape(geometry.row, geometry.target, structure.context);
        this.requireNodeInContext(geometry.target, structure);
        if (
          geometry.marker.parent == null
          || geometry.marker.parent !== geometry.target.parent
          || geometry.marker.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
          || geometry.target.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
          || geometry.marker.readParentOrdinal()! + 1 !== geometry.target.readParentOrdinal()
        ) {
          throw new Error(`Compiler marker row '${geometry.row.localKey}' is not adjacent to its logical target.`);
        }
        return;
      }
      case TemplateCompilerTargetGeometryKind.RenderLocation: {
        if (geometry.row.targetKind !== TemplateRenderTargetKind.RenderLocation) {
          throw new Error(`Compiler render-location geometry '${geometry.row.localKey}' changed target kind.`);
        }
        this.requireNodeInContext(geometry.start, structure);
        this.requireNodeInContext(geometry.end, structure);
        const markerOrdinal = geometry.marker.readParentOrdinal();
        if (
          markerOrdinal == null
          || geometry.marker.parent == null
          || geometry.marker.parent !== geometry.realizedParent
          || geometry.marker.parent !== geometry.start.parent
          || geometry.marker.parent !== geometry.end.parent
          || geometry.marker.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
          || geometry.start.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
          || geometry.end.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
          || geometry.start.readParentOrdinal() !== markerOrdinal + 1
          || geometry.end.readParentOrdinal() !== markerOrdinal + 2
          || !Number.isSafeInteger(geometry.realizedOrdinal)
          || geometry.realizedOrdinal < 0
          || geometry.start.semanticKind !== HtmlCommentSemanticKind.RenderLocationStart
          || geometry.end.semanticKind !== HtmlCommentSemanticKind.RenderLocationEnd
          || this.geometriesByStart.get(geometry.start) !== geometry
          || this.geometriesByEnd.get(geometry.end) !== geometry
          || geometry.start.generation?.role !== TemplateCompilerGeneratedOccurrenceRole.RenderLocationStart
          || geometry.end.generation?.role !== TemplateCompilerGeneratedOccurrenceRole.RenderLocationEnd
          || geometry.start.generation.contextKey !== structure.context.localKey
          || geometry.end.generation.contextKey !== structure.context.localKey
          || geometry.start.generation.operationKey !== geometry.row.localKey
          || geometry.end.generation.operationKey !== geometry.row.localKey
          || geometry.start.generation.outputOrdinal !== 0
          || geometry.end.generation.outputOrdinal !== 0
          || (geometry.replacedNode != null && contextContains(structure.compilerContent, geometry.replacedNode))
        ) {
          throw new Error(`Compiler render-location row '${geometry.row.localKey}' has incoherent marker adjacency.`);
        }
        return;
      }
    }
  }
}

function rowCauseHandles(
  row: TemplateCompilerTargetRowPlan,
  additionalCauseHandles: readonly ClaimEndpointHandle[],
): readonly ClaimEndpointHandle[] {
  const causes = [
    ...row.instructions.map((instruction) => instruction.productHandle),
    ...additionalCauseHandles,
  ];
  if (causes.length === 0) {
    throw new Error(`Compiler target row '${row.localKey}' has no semantic cause for generated geometry.`);
  }
  return causes;
}

function contextContains(
  compilerContent: TemplateCompilerFragmentOccurrence,
  descendant: TemplateCompilerNodeOccurrence,
): boolean {
  let current: TemplateCompilerNodeOccurrence | null = descendant;
  while (current != null) {
    if (current === compilerContent) return true;
    if (current.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child) return false;
    current = current.parent;
  }
  return false;
}

function collectForestLiveNodes(
  forest: TemplateCompilerOccurrenceForest,
): ReadonlySet<TemplateCompilerNodeOccurrence> {
  const result = new Set<TemplateCompilerNodeOccurrence>();
  const visit = (node: TemplateCompilerNodeOccurrence): void => {
    if (result.has(node)) return;
    result.add(node);
    for (const child of node.readChildren()) visit(child);
    if (node instanceof TemplateCompilerElementOccurrence && node.templateContent != null) {
      visit(node.templateContent);
    }
  };
  for (const root of forest.readRoots()) visit(root);
  return result;
}

function compilerMarkerPreorder(
  root: TemplateCompilerNodeOccurrence,
): readonly TemplateCompilerCommentOccurrence[] {
  const markers: TemplateCompilerCommentOccurrence[] = [];
  contextPreorder(root, (node) => {
    if (
      node instanceof TemplateCompilerCommentOccurrence
      && node.semanticKind === HtmlCommentSemanticKind.CompilerMarker
    ) {
      markers.push(node);
    }
  });
  return markers;
}

function contextPreorder(
  root: TemplateCompilerNodeOccurrence,
  visit: (node: TemplateCompilerNodeOccurrence) => void,
): void {
  visit(root);
  for (const child of root.readChildren()) contextPreorder(child, visit);
}

function exactPrefixEndForContext(context: TemplateCompilerTargetContextPlan): number {
  return context.exactGeometryPrefixEnd ?? Number.POSITIVE_INFINITY;
}

function sameOccurrences<TValue>(
  left: readonly TValue[],
  right: readonly TValue[],
): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function compareConsumedNodes(
  left: TemplateCompilerConsumedNodeDisposition,
  right: TemplateCompilerConsumedNodeDisposition,
): number {
  return left.eventOrdinal - right.eventOrdinal;
}

function compareConsumedAttributes(
  left: TemplateCompilerConsumedAttributeDisposition,
  right: TemplateCompilerConsumedAttributeDisposition,
): number {
  return left.eventOrdinal - right.eventOrdinal;
}

function compareInputEvents(
  left: { readonly eventOrdinal: number },
  right: { readonly eventOrdinal: number },
): number {
  return left.eventOrdinal - right.eventOrdinal;
}

function nearestPrior<TValue>(
  values: readonly TValue[],
  ordinal: number,
  select: (value: TValue) => number | null,
): number | null {
  for (let index = ordinal - 1; index >= 0; index--) {
    const selected = select(values[index]!);
    if (selected != null) return selected;
  }
  return null;
}

function nearestNext<TValue>(
  values: readonly TValue[],
  ordinal: number,
  select: (value: TValue) => number | null,
): number | null {
  for (let index = ordinal + 1; index < values.length; index++) {
    const selected = select(values[index]!);
    if (selected != null) return selected;
  }
  return null;
}

function appendMap<TKey, TValue>(map: Map<TKey, TValue[]>, key: TKey, value: TValue): void {
  const existing = map.get(key);
  if (existing == null) map.set(key, [value]);
  else existing.push(value);
}
