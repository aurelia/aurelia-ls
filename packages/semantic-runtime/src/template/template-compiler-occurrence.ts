import type { ClaimEndpointHandle } from '../kernel/claim.js';
import type {
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  HtmlCommentSemanticKind,
  HtmlIrNodeKind,
  type HtmlNamespaceKind,
} from './html-ir.js';
import type { BrowserEffectiveTemplateEmission } from './browser-effective-template-materializer.js';
import type {
  BrowserEffectiveTemplateAttribute,
  BrowserEffectiveTemplateNode,
  TemplateStructuralAttributeReference,
  TemplateStructuralNodeReference,
  TemplateStructuralTreeReference,
} from './template-structure.js';
import {
  TemplateCompilerAuthoredOriginIndex,
  type TemplateCompilerExactAuthoredOrigin,
} from './template-compiler-authored-origin-index.js';

export { TemplateCompilerExactAuthoredOrigin } from './template-compiler-authored-origin-index.js';

/** Edge that currently owns one mutable compiler occurrence. */
export const enum TemplateCompilerOccurrenceEdgeKind {
  Root = 'root',
  Child = 'child',
  TemplateContent = 'template-content',
  /** Occurrence remains in the historical inventory but is absent from every live structural edge. */
  Detached = 'detached',
}

/** Semantic role of one compiler-created occurrence; this is generation metadata, not an exclusive origin. */
export const enum TemplateCompilerGeneratedOccurrenceRole {
  TemplateCarrier = 'template-carrier',
  TemplateContent = 'template-content',
  CompilerMarker = 'compiler-marker',
  RenderLocationStart = 'render-location-start',
  RenderLocationEnd = 'render-location-end',
  BindingPlaceholder = 'binding-placeholder',
  StaticTextSegment = 'static-text-segment',
  Clone = 'clone',
}

/** Path-independent cause of one compiler-created output occurrence. */
export class TemplateCompilerOccurrenceGeneration {
  readonly #sessionAuthority: object;

  constructor(
    sessionAuthority: object,
    /** Compiler context in which generation executed; later structural movement does not rewrite this authority. */
    readonly contextKey: string,
    /** Stable local producer identity; a wider execution batch may produce several independently caused outputs. */
    readonly operationKey: string,
    readonly role: TemplateCompilerGeneratedOccurrenceRole,
    readonly causeHandles: readonly ClaimEndpointHandle[],
    readonly outputOrdinal: number,
    /** Ordered execution operation whose mutation batch authorized this output. */
    readonly batchOperationKey: string = operationKey,
  ) {
    this.#sessionAuthority = sessionAuthority;
    if (contextKey.length === 0 || operationKey.length === 0 || batchOperationKey.length === 0) {
      throw new Error('Compiler occurrence generation requires non-empty context and operation keys.');
    }
    if (causeHandles.length === 0) {
      throw new Error(`Compiler occurrence generation '${operationKey}' requires at least one semantic cause.`);
    }
    if (!Number.isSafeInteger(outputOrdinal) || outputOrdinal < 0) {
      throw new Error(`Compiler occurrence generation '${operationKey}' has invalid output ordinal ${outputOrdinal}.`);
    }
  }

  isOwnedBy(sessionAuthority: object): boolean {
    return this.#sessionAuthority === sessionAuthority;
  }
}

/** Immutable browser-input placement retained before compiler execution mutates the occurrence forest. */
export class TemplateCompilerSeededNodePlacement {
  constructor(
    readonly node: TemplateCompilerNodeOccurrence,
    readonly parent: TemplateCompilerParentOccurrence | null,
    readonly edgeKind: Exclude<TemplateCompilerOccurrenceEdgeKind, TemplateCompilerOccurrenceEdgeKind.Detached>,
    readonly ordinal: number,
    readonly preorderOrdinal: number,
  ) {}
}

/** Immutable browser-input attribute ownership retained before compiler execution mutates the occurrence forest. */
export class TemplateCompilerSeededAttributePlacement {
  constructor(
    readonly attribute: TemplateCompilerAttributeOccurrence,
    readonly owner: TemplateCompilerElementOccurrence,
    readonly ordinal: number,
  ) {}
}

export type TemplateCompilerParentOccurrence =
  | TemplateCompilerFragmentOccurrence
  | TemplateCompilerElementOccurrence;

interface TemplateCompilerNodeOwnership {
  parent: TemplateCompilerParentOccurrence | null;
  edgeKind: TemplateCompilerOccurrenceEdgeKind;
}

const nodeOwnership = new WeakMap<TemplateCompilerNodeOccurrence, TemplateCompilerNodeOwnership>();
const nodeChildren = new WeakMap<TemplateCompilerNodeOccurrence, TemplateCompilerNodeOccurrence[]>();
const rootCollections = new WeakMap<TemplateCompilerNodeOccurrence, readonly TemplateCompilerNodeOccurrence[]>();
const elementAttributes = new WeakMap<TemplateCompilerElementOccurrence, TemplateCompilerAttributeOccurrence[]>();
const elementTemplateContent = new WeakMap<TemplateCompilerElementOccurrence, TemplateCompilerFragmentOccurrence | null>();
const attributeOwners = new WeakMap<TemplateCompilerAttributeOccurrence, TemplateCompilerElementOccurrence | null>();
const attributeValues = new WeakMap<TemplateCompilerAttributeOccurrence, string>();
const attributeScalarWriteRevisions = new WeakMap<TemplateCompilerAttributeOccurrence, number>();

/**
 * Product-free mutable node occurrence used only inside one compiler execution.
 *
 * `occurrenceKey` never depends on the current parent or ordinal. `inputReference` is nullable because compiler or
 * extension execution may later create structure with no browser-effective predecessor, and several occurrences may
 * share one input origin after cloning.
 */
export abstract class TemplateCompilerNodeOccurrence {
  abstract readonly nodeKind: HtmlIrNodeKind;

  constructor(
    readonly occurrenceKey: string,
    readonly inputIdentityKey: IdentityHandle | null,
    readonly inputReference: TemplateStructuralNodeReference | null,
    parent: TemplateCompilerParentOccurrence | null,
    parentEdgeKind: TemplateCompilerOccurrenceEdgeKind,
    /** Independent generation axis; clones and text-split outputs may retain both this and an input origin. */
    readonly generation: TemplateCompilerOccurrenceGeneration | null = null,
  ) {
    nodeOwnership.set(this, { parent, edgeKind: parentEdgeKind });
    nodeChildren.set(this, []);
  }

  get parent(): TemplateCompilerParentOccurrence | null {
    return nodeOwnershipFor(this).parent;
  }

  get parentEdgeKind(): TemplateCompilerOccurrenceEdgeKind {
    return nodeOwnershipFor(this).edgeKind;
  }

  readChildren(): readonly TemplateCompilerNodeOccurrence[] {
    return mutableChildren(this);
  }

  /** Current ordinal in the owning edge; an edge kind is always required to interpret it as a path segment. */
  readParentOrdinal(): number | null {
    switch (this.parentEdgeKind) {
      case TemplateCompilerOccurrenceEdgeKind.Detached:
        if (this.parent !== null) {
          throw new Error(`Detached compiler occurrence '${this.occurrenceKey}' retains a parent.`);
        }
        return null;
      case TemplateCompilerOccurrenceEdgeKind.Root: {
        if (this.parent !== null) {
          throw new Error(`Compiler occurrence '${this.occurrenceKey}' has a root edge and a parent.`);
        }
        const roots = rootCollections.get(this);
        const rootOrdinal = roots?.indexOf(this) ?? -1;
        if (rootOrdinal < 0) {
          throw new Error(`Compiler occurrence '${this.occurrenceKey}' is absent from its forest root edge.`);
        }
        return rootOrdinal;
      }
      case TemplateCompilerOccurrenceEdgeKind.Child: {
        if (this.parent === null) {
          throw new Error(`Compiler occurrence '${this.occurrenceKey}' has a child edge without a parent.`);
        }
        const ordinal = mutableChildren(this.parent).indexOf(this);
        if (ordinal < 0) {
          throw new Error(`Compiler occurrence '${this.occurrenceKey}' is absent from its parent child edge.`);
        }
        return ordinal;
      }
      case TemplateCompilerOccurrenceEdgeKind.TemplateContent:
        if (
          !(this instanceof TemplateCompilerFragmentOccurrence)
          || !(this.parent instanceof TemplateCompilerElementOccurrence)
          || readTemplateContent(this.parent) !== this
        ) {
          throw new Error(`Compiler occurrence '${this.occurrenceKey}' is not owned by its template-content edge.`);
        }
        return 0;
    }
  }
}

export class TemplateCompilerFragmentOccurrence extends TemplateCompilerNodeOccurrence {
  readonly nodeKind = HtmlIrNodeKind.Fragment;
}

export class TemplateCompilerElementOccurrence extends TemplateCompilerNodeOccurrence {
  readonly nodeKind = HtmlIrNodeKind.Element;

  constructor(
    occurrenceKey: string,
    inputIdentityKey: IdentityHandle | null,
    inputReference: TemplateStructuralNodeReference | null,
    parent: TemplateCompilerParentOccurrence | null,
    parentEdgeKind: TemplateCompilerOccurrenceEdgeKind,
    readonly tagName: string,
    readonly namespace: HtmlNamespaceKind,
    readonly namespaceUri: string,
    generation: TemplateCompilerOccurrenceGeneration | null = null,
  ) {
    super(occurrenceKey, inputIdentityKey, inputReference, parent, parentEdgeKind, generation);
    elementAttributes.set(this, []);
    elementTemplateContent.set(this, null);
  }

  readAttributes(): readonly TemplateCompilerAttributeOccurrence[] {
    return mutableAttributes(this);
  }

  get templateContent(): TemplateCompilerFragmentOccurrence | null {
    return readTemplateContent(this);
  }
}

export class TemplateCompilerTextOccurrence extends TemplateCompilerNodeOccurrence {
  readonly nodeKind = HtmlIrNodeKind.Text;

  constructor(
    occurrenceKey: string,
    inputIdentityKey: IdentityHandle | null,
    inputReference: TemplateStructuralNodeReference | null,
    parent: TemplateCompilerParentOccurrence | null,
    parentEdgeKind: TemplateCompilerOccurrenceEdgeKind,
    readonly text: string,
    generation: TemplateCompilerOccurrenceGeneration | null = null,
  ) {
    super(occurrenceKey, inputIdentityKey, inputReference, parent, parentEdgeKind, generation);
  }
}

export class TemplateCompilerCommentOccurrence extends TemplateCompilerNodeOccurrence {
  readonly nodeKind = HtmlIrNodeKind.Comment;

  constructor(
    occurrenceKey: string,
    inputIdentityKey: IdentityHandle | null,
    inputReference: TemplateStructuralNodeReference | null,
    parent: TemplateCompilerParentOccurrence | null,
    parentEdgeKind: TemplateCompilerOccurrenceEdgeKind,
    readonly text: string,
    readonly semanticKind: HtmlCommentSemanticKind,
    generation: TemplateCompilerOccurrenceGeneration | null = null,
  ) {
    super(occurrenceKey, inputIdentityKey, inputReference, parent, parentEdgeKind, generation);
  }
}

export class TemplateCompilerDoctypeOccurrence extends TemplateCompilerNodeOccurrence {
  readonly nodeKind = HtmlIrNodeKind.Doctype;

  constructor(
    occurrenceKey: string,
    inputIdentityKey: IdentityHandle | null,
    inputReference: TemplateStructuralNodeReference | null,
    parent: TemplateCompilerParentOccurrence | null,
    parentEdgeKind: TemplateCompilerOccurrenceEdgeKind,
    readonly name: string,
    readonly publicId: string,
    readonly systemId: string,
    generation: TemplateCompilerOccurrenceGeneration | null = null,
  ) {
    super(occurrenceKey, inputIdentityKey, inputReference, parent, parentEdgeKind, generation);
  }
}

/** Mutable effective attribute occurrence; a null owner means compiler-detached but historically retained. */
export class TemplateCompilerAttributeOccurrence {
  readonly initialValue: string;

  constructor(
    readonly occurrenceKey: string,
    readonly inputIdentityKey: IdentityHandle | null,
    readonly inputReference: TemplateStructuralAttributeReference | null,
    owner: TemplateCompilerElementOccurrence | null,
    readonly name: string,
    value: string,
    readonly namespaceUri: string | null,
    readonly prefix: string | null,
    /** Independent generation axis; cloned attributes may retain both this and an input origin. */
    readonly generation: TemplateCompilerOccurrenceGeneration | null = null,
  ) {
    attributeOwners.set(this, owner);
    attributeValues.set(this, value);
    attributeScalarWriteRevisions.set(this, 0);
    this.initialValue = value;
  }

  get owner(): TemplateCompilerElementOccurrence | null {
    return attributeOwnerFor(this);
  }

  get value(): string {
    return attributeValueFor(this);
  }

  /** Count of committed or direct forest scalar writes since this occurrence was created. */
  get scalarWriteRevision(): number {
    return attributeScalarWriteRevisionFor(this);
  }

  /** Current ordinal in the owner's live attribute collection, or null while detached. */
  readOwnerOrdinal(): number | null {
    const owner = this.owner;
    if (owner === null) return null;
    const ordinal = mutableAttributes(owner).indexOf(this);
    if (ordinal < 0) {
      throw new Error(`Compiler attribute occurrence '${this.occurrenceKey}' is absent from its owner.`);
    }
    return ordinal;
  }
}

interface TemplateCompilerOccurrenceSeed {
  readonly inputTree: TemplateStructuralTreeReference;
  readonly roots: TemplateCompilerNodeOccurrence[];
  readonly compilerCarrier: TemplateCompilerElementOccurrence;
  readonly compilerContent: TemplateCompilerFragmentOccurrence;
  readonly nodes: TemplateCompilerNodeOccurrence[];
  readonly attributes: TemplateCompilerAttributeOccurrence[];
  readonly nodesByOccurrenceKey: Map<string, TemplateCompilerNodeOccurrence>;
  readonly attributesByOccurrenceKey: Map<string, TemplateCompilerAttributeOccurrence>;
  readonly nodesByInputProduct: Map<ProductHandle, TemplateCompilerNodeOccurrence[]>;
  readonly attributesByInputProduct: Map<ProductHandle, TemplateCompilerAttributeOccurrence[]>;
  readonly nodesByInputIdentity: Map<IdentityHandle, TemplateCompilerNodeOccurrence[]>;
  readonly attributesByInputIdentity: Map<IdentityHandle, TemplateCompilerAttributeOccurrence[]>;
  readonly exactNodeOriginsByInputProduct: Map<ProductHandle, TemplateCompilerExactAuthoredOrigin>;
  readonly exactAttributeOriginsByInputProduct: Map<ProductHandle, TemplateCompilerExactAuthoredOrigin>;
}

/** Fresh mutable carrier forest for one browser-effective compiler occurrence. */
export class TemplateCompilerOccurrenceForest {
  static fromBrowserEffective(input: BrowserEffectiveTemplateEmission): TemplateCompilerOccurrenceForest {
    const builder = new TemplateCompilerOccurrenceForestBuilder(input);
    const seed = builder.build();
    const forest = new TemplateCompilerOccurrenceForest(seed);
    forest.assertCoherentTopology();
    builder.validateIsolation(forest);
    return forest;
  }

  readonly inputTree: TemplateStructuralTreeReference;
  readonly compilerCarrier: TemplateCompilerElementOccurrence;
  readonly compilerContent: TemplateCompilerFragmentOccurrence;

  private readonly rootOccurrences: TemplateCompilerNodeOccurrence[];
  private readonly nodes: TemplateCompilerNodeOccurrence[];
  private readonly attributes: TemplateCompilerAttributeOccurrence[];
  private readonly nodesByOccurrenceKey: Map<string, TemplateCompilerNodeOccurrence>;
  private readonly attributesByOccurrenceKey: Map<string, TemplateCompilerAttributeOccurrence>;
  private readonly nodesByInputProduct: Map<ProductHandle, TemplateCompilerNodeOccurrence[]>;
  private readonly attributesByInputProduct: Map<ProductHandle, TemplateCompilerAttributeOccurrence[]>;
  private readonly nodesByInputIdentity: Map<IdentityHandle, TemplateCompilerNodeOccurrence[]>;
  private readonly attributesByInputIdentity: Map<IdentityHandle, TemplateCompilerAttributeOccurrence[]>;
  private readonly exactNodeOriginsByInputProduct: ReadonlyMap<ProductHandle, TemplateCompilerExactAuthoredOrigin>;
  private readonly exactAttributeOriginsByInputProduct: ReadonlyMap<ProductHandle, TemplateCompilerExactAuthoredOrigin>;
  private readonly seededNodePlacements = new Map<
    TemplateCompilerNodeOccurrence,
    TemplateCompilerSeededNodePlacement
  >();
  private readonly seededAttributePlacements = new Map<
    TemplateCompilerAttributeOccurrence,
    TemplateCompilerSeededAttributePlacement
  >();
  private readonly occurrencesByGeneration = new Map<
    TemplateCompilerOccurrenceGeneration,
    TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence
  >();
  private _mutationRevision = 0;

  private constructor(seed: TemplateCompilerOccurrenceSeed) {
    this.inputTree = seed.inputTree;
    this.rootOccurrences = seed.roots;
    this.compilerCarrier = seed.compilerCarrier;
    this.compilerContent = seed.compilerContent;
    this.nodes = seed.nodes;
    this.attributes = seed.attributes;
    this.nodesByOccurrenceKey = seed.nodesByOccurrenceKey;
    this.attributesByOccurrenceKey = seed.attributesByOccurrenceKey;
    this.nodesByInputProduct = seed.nodesByInputProduct;
    this.attributesByInputProduct = seed.attributesByInputProduct;
    this.nodesByInputIdentity = seed.nodesByInputIdentity;
    this.attributesByInputIdentity = seed.attributesByInputIdentity;
    this.exactNodeOriginsByInputProduct = seed.exactNodeOriginsByInputProduct;
    this.exactAttributeOriginsByInputProduct = seed.exactAttributeOriginsByInputProduct;
    for (const root of this.rootOccurrences) rootCollections.set(root, this.rootOccurrences);
    const seededNodeOrdinals = new Map<TemplateCompilerNodeOccurrence, number>();
    const seededAttributeOrdinals = new Map<TemplateCompilerAttributeOccurrence, number>();
    this.rootOccurrences.forEach((root, ordinal) => seededNodeOrdinals.set(root, ordinal));
    for (const owner of this.nodes) {
      owner.readChildren().forEach((child, ordinal) => seededNodeOrdinals.set(child, ordinal));
      if (owner instanceof TemplateCompilerElementOccurrence) {
        owner.readAttributes().forEach((attribute, ordinal) => seededAttributeOrdinals.set(attribute, ordinal));
        if (owner.templateContent != null) seededNodeOrdinals.set(owner.templateContent, 0);
      }
    }
    this.nodes.forEach((node, preorderOrdinal) => {
      const ordinal = seededNodeOrdinals.get(node) ?? null;
      if (node.inputReference == null || node.generation != null || ordinal == null) {
        throw new Error(`Seeded compiler occurrence '${node.occurrenceKey}' has no exact browser-input placement.`);
      }
      this.seededNodePlacements.set(node, new TemplateCompilerSeededNodePlacement(
        node,
        node.parent,
        node.parentEdgeKind as Exclude<TemplateCompilerOccurrenceEdgeKind, TemplateCompilerOccurrenceEdgeKind.Detached>,
        ordinal,
        preorderOrdinal,
      ));
    });
    for (const attribute of this.attributes) {
      const owner = attribute.owner;
      const ordinal = seededAttributeOrdinals.get(attribute) ?? null;
      if (attribute.inputReference == null || attribute.generation != null || owner == null || ordinal == null) {
        throw new Error(`Seeded compiler attribute '${attribute.occurrenceKey}' has no exact browser-input placement.`);
      }
      this.seededAttributePlacements.set(attribute, new TemplateCompilerSeededAttributePlacement(
        attribute,
        owner,
        ordinal,
      ));
    }
  }

  readRoots(): readonly TemplateCompilerNodeOccurrence[] {
    return this.rootOccurrences;
  }

  /** Complete occurrence inventory, including compiler-detached occurrences retained for lineage. */
  readNodes(): readonly TemplateCompilerNodeOccurrence[] {
    return this.nodes;
  }

  /** Complete attribute inventory, including compiler-detached attributes retained for lineage. */
  readAttributes(): readonly TemplateCompilerAttributeOccurrence[] {
    return this.attributes;
  }

  /** O(1) conservative epoch for inventory, topology, ownership, ordering, and scalar forest mutation. */
  get mutationRevision(): number {
    return this._mutationRevision;
  }

  nodeForOccurrenceKey(occurrenceKey: string): TemplateCompilerNodeOccurrence | null {
    return this.nodesByOccurrenceKey.get(occurrenceKey) ?? null;
  }

  attributeForOccurrenceKey(occurrenceKey: string): TemplateCompilerAttributeOccurrence | null {
    return this.attributesByOccurrenceKey.get(occurrenceKey) ?? null;
  }

  nodesForInputProduct(productHandle: ProductHandle): readonly TemplateCompilerNodeOccurrence[] {
    return this.nodesByInputProduct.get(productHandle) ?? [];
  }

  attributesForInputProduct(productHandle: ProductHandle): readonly TemplateCompilerAttributeOccurrence[] {
    return this.attributesByInputProduct.get(productHandle) ?? [];
  }

  nodesForInputIdentity(identityHandle: IdentityHandle): readonly TemplateCompilerNodeOccurrence[] {
    return this.nodesByInputIdentity.get(identityHandle) ?? [];
  }

  attributesForInputIdentity(identityHandle: IdentityHandle): readonly TemplateCompilerAttributeOccurrence[] {
    return this.attributesByInputIdentity.get(identityHandle) ?? [];
  }

  exactAuthoredNodeOrigin(
    occurrence: TemplateCompilerNodeOccurrence,
  ): TemplateCompilerExactAuthoredOrigin | null {
    this.requireNode(occurrence);
    return occurrence.inputReference == null
      ? null
      : this.exactNodeOriginsByInputProduct.get(occurrence.inputReference.productHandle) ?? null;
  }

  exactAuthoredAttributeOrigin(
    occurrence: TemplateCompilerAttributeOccurrence,
  ): TemplateCompilerExactAuthoredOrigin | null {
    this.requireAttribute(occurrence);
    return occurrence.inputReference == null
      ? null
      : this.exactAttributeOriginsByInputProduct.get(occurrence.inputReference.productHandle) ?? null;
  }

  seededNodePlacement(
    occurrence: TemplateCompilerNodeOccurrence,
  ): TemplateCompilerSeededNodePlacement | null {
    this.requireNode(occurrence);
    return this.seededNodePlacements.get(occurrence) ?? null;
  }

  seededAttributePlacement(
    occurrence: TemplateCompilerAttributeOccurrence,
  ): TemplateCompilerSeededAttributePlacement | null {
    this.requireAttribute(occurrence);
    return this.seededAttributePlacements.get(occurrence) ?? null;
  }

  /** Create one detached fragment output under compiler authority. */
  createGeneratedFragment(
    generation: TemplateCompilerOccurrenceGeneration,
    inputReference: TemplateStructuralNodeReference | null = null,
  ): TemplateCompilerFragmentOccurrence {
    const canonicalInput = this.canonicalGeneratedNodeInput(inputReference, HtmlIrNodeKind.Fragment);
    return this.recordGeneratedNode(new TemplateCompilerFragmentOccurrence(
      generatedNodeOccurrenceKey(HtmlIrNodeKind.Fragment, generation),
      canonicalInput?.identityHandle ?? null,
      canonicalInput,
      null,
      TemplateCompilerOccurrenceEdgeKind.Detached,
      generation,
    ));
  }

  /** Create one detached element output under compiler authority. */
  createGeneratedElement(
    generation: TemplateCompilerOccurrenceGeneration,
    tagName: string,
    namespace: HtmlNamespaceKind,
    namespaceUri: string,
    inputReference: TemplateStructuralNodeReference | null = null,
  ): TemplateCompilerElementOccurrence {
    const canonicalInput = this.canonicalGeneratedNodeInput(inputReference, HtmlIrNodeKind.Element);
    return this.recordGeneratedNode(new TemplateCompilerElementOccurrence(
      generatedNodeOccurrenceKey(HtmlIrNodeKind.Element, generation),
      canonicalInput?.identityHandle ?? null,
      canonicalInput,
      null,
      TemplateCompilerOccurrenceEdgeKind.Detached,
      tagName,
      namespace,
      namespaceUri,
      generation,
    ));
  }

  /** Create one detached text output; an input reference preserves 1→N text or clone lineage. */
  createGeneratedText(
    generation: TemplateCompilerOccurrenceGeneration,
    text: string,
    inputReference: TemplateStructuralNodeReference | null = null,
  ): TemplateCompilerTextOccurrence {
    const canonicalInput = this.canonicalGeneratedNodeInput(inputReference, HtmlIrNodeKind.Text);
    return this.recordGeneratedNode(new TemplateCompilerTextOccurrence(
      generatedNodeOccurrenceKey(HtmlIrNodeKind.Text, generation),
      canonicalInput?.identityHandle ?? null,
      canonicalInput,
      null,
      TemplateCompilerOccurrenceEdgeKind.Detached,
      text,
      generation,
    ));
  }

  /** Create one detached comment output; semantic kind, never text spelling, determines compiler-marker meaning. */
  createGeneratedComment(
    generation: TemplateCompilerOccurrenceGeneration,
    text: string,
    semanticKind: HtmlCommentSemanticKind,
    inputReference: TemplateStructuralNodeReference | null = null,
  ): TemplateCompilerCommentOccurrence {
    const canonicalInput = this.canonicalGeneratedNodeInput(inputReference, HtmlIrNodeKind.Comment);
    return this.recordGeneratedNode(new TemplateCompilerCommentOccurrence(
      generatedNodeOccurrenceKey(HtmlIrNodeKind.Comment, generation),
      canonicalInput?.identityHandle ?? null,
      canonicalInput,
      null,
      TemplateCompilerOccurrenceEdgeKind.Detached,
      text,
      semanticKind,
      generation,
    ));
  }

  /** Create one detached attribute output; an input reference preserves clone/rewrite lineage. */
  createGeneratedAttribute(
    generation: TemplateCompilerOccurrenceGeneration,
    name: string,
    value: string,
    namespaceUri: string | null,
    prefix: string | null,
    inputReference: TemplateStructuralAttributeReference | null = null,
  ): TemplateCompilerAttributeOccurrence {
    const canonicalInput = this.canonicalGeneratedAttributeInput(inputReference);
    const attribute = new TemplateCompilerAttributeOccurrence(
      generatedAttributeOccurrenceKey(generation),
      canonicalInput?.identityHandle ?? null,
      canonicalInput,
      null,
      name,
      value,
      namespaceUri,
      prefix,
      generation,
    );
    this.claimGeneration(generation, attribute);
    if (this.attributesByOccurrenceKey.has(attribute.occurrenceKey)) {
      throw new Error(`Compiler attribute occurrence key '${attribute.occurrenceKey}' is not unique.`);
    }
    this.attributes.push(attribute);
    this.attributesByOccurrenceKey.set(attribute.occurrenceKey, attribute);
    if (canonicalInput != null) {
      appendMap(this.attributesByInputProduct, canonicalInput.productHandle, attribute);
      appendMap(this.attributesByInputIdentity, canonicalInput.identityHandle, attribute);
    }
    this._mutationRevision += 1;
    return attribute;
  }

  /** Remove one live node edge while retaining the occurrence and its descendants in the historical inventory. */
  detachNode(node: TemplateCompilerNodeOccurrence): void {
    this.requireNode(node);
    const ownership = nodeOwnershipFor(node);
    switch (ownership.edgeKind) {
      case TemplateCompilerOccurrenceEdgeKind.Detached:
        throw new Error(`Compiler occurrence '${node.occurrenceKey}' is already detached.`);
      case TemplateCompilerOccurrenceEdgeKind.Root:
        removeExact(this.rootOccurrences, node, `compiler root '${node.occurrenceKey}'`);
        rootCollections.delete(node);
        break;
      case TemplateCompilerOccurrenceEdgeKind.Child:
        if (ownership.parent === null) {
          throw new Error(`Compiler child occurrence '${node.occurrenceKey}' has no parent.`);
        }
        removeExact(mutableChildren(ownership.parent), node, `compiler child '${node.occurrenceKey}'`);
        break;
      case TemplateCompilerOccurrenceEdgeKind.TemplateContent:
        if (
          !(node instanceof TemplateCompilerFragmentOccurrence)
          || !(ownership.parent instanceof TemplateCompilerElementOccurrence)
          || readTemplateContent(ownership.parent) !== node
        ) {
          throw new Error(`Compiler template-content occurrence '${node.occurrenceKey}' has incoherent ownership.`);
        }
        elementTemplateContent.set(ownership.parent, null);
        break;
    }
    setNodeOwnership(node, null, TemplateCompilerOccurrenceEdgeKind.Detached);
    this._mutationRevision += 1;
  }

  /** Detach one caller-proven ordinary child slot without rediscovering its ordinal. */
  detachDirectChild(
    parent: TemplateCompilerParentOccurrence,
    ordinal: number,
    node: TemplateCompilerNodeOccurrence,
  ): void {
    this.requireParent(parent);
    this.requireNode(node);
    const children = mutableChildren(parent);
    if (
      !Number.isSafeInteger(ordinal)
      || ordinal < 0
      || node.parent !== parent
      || node.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
      || children[ordinal] !== node
    ) {
      throw new Error(
        `Compiler direct child '${node.occurrenceKey}' is not live at parent '${parent.occurrenceKey}' ordinal ${ordinal}.`,
      );
    }
    children.splice(ordinal, 1);
    setNodeOwnership(node, null, TemplateCompilerOccurrenceEdgeKind.Detached);
    this._mutationRevision += 1;
  }

  /** Admit one detached occurrence onto an exact live structural edge. */
  insertDetachedNode(
    node: TemplateCompilerNodeOccurrence,
    parent: TemplateCompilerParentOccurrence | null,
    edgeKind: Exclude<TemplateCompilerOccurrenceEdgeKind, TemplateCompilerOccurrenceEdgeKind.Detached>,
    ordinal: number,
  ): void {
    this.requireNode(node);
    if (node.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Detached || node.parent !== null) {
      throw new Error(`Compiler occurrence '${node.occurrenceKey}' must be detached before insertion.`);
    }
    this.validateNodeInsertion(node, parent, edgeKind, ordinal);
    this.insertNodeUnchecked(node, parent, edgeKind, ordinal);
    this._mutationRevision += 1;
  }

  /** Atomically move a live or detached occurrence to another edge without changing occurrence identity. */
  moveNode(
    node: TemplateCompilerNodeOccurrence,
    parent: TemplateCompilerParentOccurrence | null,
    edgeKind: Exclude<TemplateCompilerOccurrenceEdgeKind, TemplateCompilerOccurrenceEdgeKind.Detached>,
    ordinal: number,
  ): void {
    this.requireNode(node);
    if (parent != null) this.requireParent(parent);
    const previousParent = node.parent;
    const previousEdgeKind = node.parentEdgeKind;
    const previousOrdinal = node.readParentOrdinal();
    if (previousEdgeKind === TemplateCompilerOccurrenceEdgeKind.Detached) {
      this.insertDetachedNode(node, parent, edgeKind, ordinal);
      return;
    }
    this.detachNode(node);
    try {
      this.insertDetachedNode(node, parent, edgeKind, ordinal);
    } catch (error) {
      this.insertNodeUnchecked(
        node,
        previousParent,
        previousEdgeKind,
        previousOrdinal!,
      );
      throw error;
    }
  }

  /** Reorder one root or ordinary child inside its current collection. */
  reorderNode(node: TemplateCompilerNodeOccurrence, ordinal: number): void {
    this.requireNode(node);
    if (
      node.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Root
      && node.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
    ) {
      throw new Error(`Compiler occurrence '${node.occurrenceKey}' is not on an ordered root/child edge.`);
    }
    this.moveNode(node, node.parent, node.parentEdgeKind, ordinal);
  }

  /** Remove one live attribute while retaining its occurrence for a later 1→0 derivation. */
  detachAttribute(attribute: TemplateCompilerAttributeOccurrence): void {
    this.requireAttribute(attribute);
    const owner = attribute.owner;
    if (owner === null) {
      throw new Error(`Compiler attribute occurrence '${attribute.occurrenceKey}' is already detached.`);
    }
    removeExact(mutableAttributes(owner), attribute, `compiler attribute '${attribute.occurrenceKey}'`);
    attributeOwners.set(attribute, null);
    this._mutationRevision += 1;
  }

  /** Admit one detached attribute at an exact live owner ordinal. */
  insertDetachedAttribute(
    attribute: TemplateCompilerAttributeOccurrence,
    owner: TemplateCompilerElementOccurrence,
    ordinal: number,
  ): void {
    this.requireAttribute(attribute);
    this.requireElement(owner);
    if (attribute.owner !== null) {
      throw new Error(`Compiler attribute occurrence '${attribute.occurrenceKey}' must be detached before insertion.`);
    }
    assertInsertionOrdinal(ordinal, mutableAttributes(owner).length, `attribute '${attribute.occurrenceKey}'`);
    mutableAttributes(owner).splice(ordinal, 0, attribute);
    attributeOwners.set(attribute, owner);
    this._mutationRevision += 1;
  }

  /** Atomically move or reorder an attribute without changing occurrence identity. */
  moveAttribute(
    attribute: TemplateCompilerAttributeOccurrence,
    owner: TemplateCompilerElementOccurrence,
    ordinal: number,
  ): void {
    this.requireAttribute(attribute);
    this.requireElement(owner);
    const previousOwner = attribute.owner;
    const previousOrdinal = attribute.readOwnerOrdinal();
    if (previousOwner === null) {
      this.insertDetachedAttribute(attribute, owner, ordinal);
      return;
    }
    this.detachAttribute(attribute);
    try {
      this.insertDetachedAttribute(attribute, owner, ordinal);
    } catch (error) {
      mutableAttributes(previousOwner).splice(previousOrdinal!, 0, attribute);
      attributeOwners.set(attribute, previousOwner);
      throw error;
    }
  }

  reorderAttribute(attribute: TemplateCompilerAttributeOccurrence, ordinal: number): void {
    const owner = attribute.owner;
    if (owner === null) {
      throw new Error(`Detached compiler attribute '${attribute.occurrenceKey}' cannot be reordered.`);
    }
    this.moveAttribute(attribute, owner, ordinal);
  }

  /** Apply one already-authorized scalar rewrite without changing DOM attribute occurrence identity. */
  rewriteAttributeValue(attribute: TemplateCompilerAttributeOccurrence, value: string): void {
    this.requireAttribute(attribute);
    attributeValues.set(attribute, value);
    attributeScalarWriteRevisions.set(attribute, attribute.scalarWriteRevision + 1);
    this._mutationRevision += 1;
  }

  /** Validate complete live and detached topology before transformed-tree freezing. */
  assertCoherentTopology(): void {
    const nodeMembership = new Map<TemplateCompilerNodeOccurrence, {
      readonly parent: TemplateCompilerParentOccurrence | null;
      readonly edgeKind: TemplateCompilerOccurrenceEdgeKind;
    }>();
    const attributeMembership = new Map<TemplateCompilerAttributeOccurrence, TemplateCompilerElementOccurrence>();
    for (const root of this.rootOccurrences) {
      addNodeMembership(nodeMembership, root, null, TemplateCompilerOccurrenceEdgeKind.Root);
    }
    for (const candidate of this.nodes) {
      this.requireNode(candidate);
      if (candidate instanceof TemplateCompilerElementOccurrence) {
        for (const attribute of mutableAttributes(candidate)) {
          this.requireAttribute(attribute);
          const previous = attributeMembership.get(attribute);
          if (previous != null) {
            throw new Error(`Compiler attribute '${attribute.occurrenceKey}' has more than one owner edge.`);
          }
          attributeMembership.set(attribute, candidate);
        }
        const content = readTemplateContent(candidate);
        if (content != null) {
          addNodeMembership(nodeMembership, content, candidate, TemplateCompilerOccurrenceEdgeKind.TemplateContent);
        }
      }
      if (isParentOccurrence(candidate)) {
        for (const child of mutableChildren(candidate)) {
          addNodeMembership(nodeMembership, child, candidate, TemplateCompilerOccurrenceEdgeKind.Child);
        }
      }
    }

    for (const candidate of this.nodes) {
      const ownership = nodeOwnershipFor(candidate);
      const membership = nodeMembership.get(candidate) ?? null;
      if (ownership.edgeKind === TemplateCompilerOccurrenceEdgeKind.Detached) {
        if (ownership.parent !== null || membership != null) {
          throw new Error(`Detached compiler occurrence '${candidate.occurrenceKey}' remains structurally owned.`);
        }
      } else if (
        membership == null
        || membership.parent !== ownership.parent
        || membership.edgeKind !== ownership.edgeKind
      ) {
        throw new Error(`Compiler occurrence '${candidate.occurrenceKey}' has incoherent structural ownership.`);
      }
      this.assertGeneration(candidate.occurrenceKey, candidate.inputReference, candidate.generation);
      this.assertNodeOriginIndex(candidate);
    }
    for (const attribute of this.attributes) {
      this.requireAttribute(attribute);
      const membership = attributeMembership.get(attribute) ?? null;
      if (membership !== attribute.owner) {
        throw new Error(`Compiler attribute '${attribute.occurrenceKey}' has incoherent owner membership.`);
      }
      this.assertGeneration(attribute.occurrenceKey, attribute.inputReference, attribute.generation);
      this.assertAttributeOriginIndex(attribute);
    }

    const visited = new Set<TemplateCompilerNodeOccurrence>();
    const active = new Set<TemplateCompilerNodeOccurrence>();
    for (const root of this.rootOccurrences) this.visitTopology(root, visited, active);
    for (const detached of this.nodes) {
      if (detached.parentEdgeKind === TemplateCompilerOccurrenceEdgeKind.Detached) {
        this.visitTopology(detached, visited, active);
      }
    }
    if (visited.size !== this.nodes.length) {
      throw new Error('Compiler occurrence inventory contains a parent cycle or an ownerless non-detached component.');
    }
    if (!this.rootOccurrences.includes(this.compilerCarrier)) {
      throw new Error('Compiler carrier is no longer a live forest root.');
    }
    if (
      this.compilerCarrier.templateContent !== this.compilerContent
      || this.compilerContent.parent !== this.compilerCarrier
      || this.compilerContent.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.TemplateContent
    ) {
      throw new Error('Compiler content is no longer the carrier template-content fragment.');
    }
  }

  private validateNodeInsertion(
    node: TemplateCompilerNodeOccurrence,
    parent: TemplateCompilerParentOccurrence | null,
    edgeKind: Exclude<TemplateCompilerOccurrenceEdgeKind, TemplateCompilerOccurrenceEdgeKind.Detached>,
    ordinal: number,
  ): void {
    if (parent != null) this.requireParent(parent);
    switch (edgeKind) {
      case TemplateCompilerOccurrenceEdgeKind.Root:
        if (parent !== null) throw new Error('Compiler root insertion cannot specify a parent.');
        assertInsertionOrdinal(ordinal, this.rootOccurrences.length, `root '${node.occurrenceKey}'`);
        return;
      case TemplateCompilerOccurrenceEdgeKind.Child:
        if (parent === null) throw new Error('Compiler child insertion requires a parent.');
        if (nodeContains(node, parent)) {
          throw new Error(`Compiler occurrence '${node.occurrenceKey}' cannot contain its new parent.`);
        }
        assertInsertionOrdinal(ordinal, mutableChildren(parent).length, `child '${node.occurrenceKey}'`);
        return;
      case TemplateCompilerOccurrenceEdgeKind.TemplateContent:
        if (!(node instanceof TemplateCompilerFragmentOccurrence)) {
          throw new Error('Only a fragment occurrence can occupy a template-content edge.');
        }
        if (!(parent instanceof TemplateCompilerElementOccurrence)) {
          throw new Error('Template-content insertion requires an element parent.');
        }
        if (readTemplateContent(parent) != null) {
          throw new Error(`Template element '${parent.occurrenceKey}' already owns template content.`);
        }
        if (ordinal !== 0) throw new Error('Template-content insertion ordinal must be zero.');
        if (nodeContains(node, parent)) {
          throw new Error(`Compiler occurrence '${node.occurrenceKey}' cannot contain its new template owner.`);
        }
        return;
    }
  }

  private insertNodeUnchecked(
    node: TemplateCompilerNodeOccurrence,
    parent: TemplateCompilerParentOccurrence | null,
    edgeKind: Exclude<TemplateCompilerOccurrenceEdgeKind, TemplateCompilerOccurrenceEdgeKind.Detached>,
    ordinal: number,
  ): void {
    switch (edgeKind) {
      case TemplateCompilerOccurrenceEdgeKind.Root:
        this.rootOccurrences.splice(ordinal, 0, node);
        rootCollections.set(node, this.rootOccurrences);
        break;
      case TemplateCompilerOccurrenceEdgeKind.Child:
        mutableChildren(parent!).splice(ordinal, 0, node);
        break;
      case TemplateCompilerOccurrenceEdgeKind.TemplateContent:
        elementTemplateContent.set(parent as TemplateCompilerElementOccurrence, node as TemplateCompilerFragmentOccurrence);
        break;
    }
    setNodeOwnership(node, parent, edgeKind);
  }

  private requireNode(node: TemplateCompilerNodeOccurrence): void {
    if (this.nodesByOccurrenceKey.get(node.occurrenceKey) !== node) {
      throw new Error(`Compiler node occurrence '${node.occurrenceKey}' belongs to another forest.`);
    }
  }

  private requireParent(parent: TemplateCompilerParentOccurrence): void {
    this.requireNode(parent);
  }

  private requireElement(element: TemplateCompilerElementOccurrence): void {
    this.requireNode(element);
  }

  private requireAttribute(attribute: TemplateCompilerAttributeOccurrence): void {
    if (this.attributesByOccurrenceKey.get(attribute.occurrenceKey) !== attribute) {
      throw new Error(`Compiler attribute occurrence '${attribute.occurrenceKey}' belongs to another forest.`);
    }
  }

  private recordGeneratedNode<TNode extends TemplateCompilerNodeOccurrence>(node: TNode): TNode {
    if (node.generation == null) {
      throw new Error(`Generated compiler occurrence '${node.occurrenceKey}' has no generation authority.`);
    }
    this.claimGeneration(node.generation, node);
    if (this.nodesByOccurrenceKey.has(node.occurrenceKey)) {
      throw new Error(`Compiler node occurrence key '${node.occurrenceKey}' is not unique.`);
    }
    this.nodes.push(node);
    this.nodesByOccurrenceKey.set(node.occurrenceKey, node);
    if (node.inputReference != null) {
      appendMap(this.nodesByInputProduct, node.inputReference.productHandle, node);
      appendMap(this.nodesByInputIdentity, node.inputReference.identityHandle, node);
    }
    this._mutationRevision += 1;
    return node;
  }

  private claimGeneration(
    generation: TemplateCompilerOccurrenceGeneration,
    occurrence: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
  ): void {
    const existing = this.occurrencesByGeneration.get(generation) ?? null;
    if (existing != null) {
      throw new Error(
        `Compiler generation '${generation.operationKey}' is already spent by '${existing.occurrenceKey}'.`,
      );
    }
    this.occurrencesByGeneration.set(generation, occurrence);
  }

  private canonicalGeneratedNodeInput(
    inputReference: TemplateStructuralNodeReference | null,
    expectedKind: HtmlIrNodeKind,
  ): TemplateStructuralNodeReference | null {
    if (inputReference == null) return null;
    if (inputReference.treeProductHandle !== this.inputTree.productHandle || inputReference.nodeKind !== expectedKind) {
      throw new Error(`Generated compiler node input '${inputReference.productHandle}' does not match this forest and node kind.`);
    }
    const inputOccurrences = this.nodesByInputProduct.get(inputReference.productHandle) ?? [];
    const canonical = inputOccurrences.find((candidate) => candidate.generation == null)?.inputReference ?? null;
    if (
      canonical == null
      || canonical.treeProductHandle !== inputReference.treeProductHandle
      || canonical.nodeKind !== inputReference.nodeKind
      || canonical.productHandle !== inputReference.productHandle
      || canonical.identityHandle !== inputReference.identityHandle
      || canonical.addressHandle !== inputReference.addressHandle
    ) {
      throw new Error(`Generated compiler node input '${inputReference.productHandle}' is absent from the seeded origin index.`);
    }
    return canonical;
  }

  private canonicalGeneratedAttributeInput(
    inputReference: TemplateStructuralAttributeReference | null,
  ): TemplateStructuralAttributeReference | null {
    if (inputReference == null) return null;
    if (inputReference.treeProductHandle !== this.inputTree.productHandle) {
      throw new Error(`Generated compiler attribute input '${inputReference.productHandle}' belongs to another tree.`);
    }
    const inputOccurrences = this.attributesByInputProduct.get(inputReference.productHandle) ?? [];
    const canonical = inputOccurrences.find((candidate) => candidate.generation == null)?.inputReference ?? null;
    if (
      canonical == null
      || canonical.treeProductHandle !== inputReference.treeProductHandle
      || canonical.productHandle !== inputReference.productHandle
      || canonical.identityHandle !== inputReference.identityHandle
      || canonical.addressHandle !== inputReference.addressHandle
      || canonical.name !== inputReference.name
    ) {
      throw new Error(`Generated compiler attribute input '${inputReference.productHandle}' is absent from the seeded origin index.`);
    }
    return canonical;
  }

  private assertGeneration(
    occurrenceKey: string,
    inputReference: TemplateStructuralNodeReference | TemplateStructuralAttributeReference | null,
    generation: TemplateCompilerOccurrenceGeneration | null,
  ): void {
    if (inputReference == null && generation == null) {
      throw new Error(`Originless compiler occurrence '${occurrenceKey}' has no generation authority.`);
    }
  }

  private assertNodeOriginIndex(node: TemplateCompilerNodeOccurrence): void {
    if ((node.inputReference == null) !== (node.inputIdentityKey == null)) {
      throw new Error(`Compiler occurrence '${node.occurrenceKey}' has a partial input origin.`);
    }
    if (node.inputReference == null || node.inputIdentityKey == null) return;
    if (node.inputReference.identityHandle !== node.inputIdentityKey) {
      throw new Error(`Compiler occurrence '${node.occurrenceKey}' input identity does not match its reference.`);
    }
    if (!this.nodesForInputProduct(node.inputReference.productHandle).includes(node)) {
      throw new Error(`Compiler occurrence '${node.occurrenceKey}' is absent from its input-product origin index.`);
    }
    if (!this.nodesForInputIdentity(node.inputIdentityKey).includes(node)) {
      throw new Error(`Compiler occurrence '${node.occurrenceKey}' is absent from its input-identity origin index.`);
    }
  }

  private assertAttributeOriginIndex(attribute: TemplateCompilerAttributeOccurrence): void {
    if (!Number.isSafeInteger(attribute.scalarWriteRevision) || attribute.scalarWriteRevision < 0) {
      throw new Error(`Compiler attribute '${attribute.occurrenceKey}' has an invalid scalar-write revision.`);
    }
    if ((attribute.inputReference == null) !== (attribute.inputIdentityKey == null)) {
      throw new Error(`Compiler attribute '${attribute.occurrenceKey}' has a partial input origin.`);
    }
    if (attribute.inputReference == null || attribute.inputIdentityKey == null) return;
    if (attribute.inputReference.identityHandle !== attribute.inputIdentityKey) {
      throw new Error(`Compiler attribute '${attribute.occurrenceKey}' input identity does not match its reference.`);
    }
    if (!this.attributesForInputProduct(attribute.inputReference.productHandle).includes(attribute)) {
      throw new Error(`Compiler attribute '${attribute.occurrenceKey}' is absent from its input-product origin index.`);
    }
    if (!this.attributesForInputIdentity(attribute.inputIdentityKey).includes(attribute)) {
      throw new Error(`Compiler attribute '${attribute.occurrenceKey}' is absent from its input-identity origin index.`);
    }
  }

  private visitTopology(
    node: TemplateCompilerNodeOccurrence,
    visited: Set<TemplateCompilerNodeOccurrence>,
    active: Set<TemplateCompilerNodeOccurrence>,
  ): void {
    if (active.has(node)) throw new Error(`Compiler occurrence '${node.occurrenceKey}' participates in a parent cycle.`);
    if (visited.has(node)) return;
    active.add(node);
    visited.add(node);
    for (const child of node.readChildren()) this.visitTopology(child, visited, active);
    if (node instanceof TemplateCompilerElementOccurrence && node.templateContent != null) {
      this.visitTopology(node.templateContent, visited, active);
    }
    active.delete(node);
  }
}

class TemplateCompilerOccurrenceForestBuilder {
  private readonly inputNodesByProduct = new Map<ProductHandle, BrowserEffectiveTemplateNode>();
  private readonly inputAttributesByProduct = new Map<ProductHandle, BrowserEffectiveTemplateAttribute>();
  private readonly nodes: TemplateCompilerNodeOccurrence[] = [];
  private readonly attributes: TemplateCompilerAttributeOccurrence[] = [];
  private readonly nodesByOccurrenceKey = new Map<string, TemplateCompilerNodeOccurrence>();
  private readonly attributesByOccurrenceKey = new Map<string, TemplateCompilerAttributeOccurrence>();
  private readonly nodesByInputProduct = new Map<ProductHandle, TemplateCompilerNodeOccurrence[]>();
  private readonly attributesByInputProduct = new Map<ProductHandle, TemplateCompilerAttributeOccurrence[]>();
  private readonly nodesByInputIdentity = new Map<IdentityHandle, TemplateCompilerNodeOccurrence[]>();
  private readonly attributesByInputIdentity = new Map<IdentityHandle, TemplateCompilerAttributeOccurrence[]>();
  private readonly exactNodeOriginsByInputProduct = new Map<ProductHandle, TemplateCompilerExactAuthoredOrigin>();
  private readonly exactAttributeOriginsByInputProduct = new Map<ProductHandle, TemplateCompilerExactAuthoredOrigin>();

  constructor(private readonly input: BrowserEffectiveTemplateEmission) {
    this.recordExactAuthoredOrigins();
    for (const node of input.nodes) {
      if (this.inputNodesByProduct.has(node.productHandle)) {
        throw new Error(`Browser-effective input repeats structural node product '${node.productHandle}'.`);
      }
      this.inputNodesByProduct.set(node.productHandle, node);
    }
    for (const attribute of input.attributes) {
      if (this.inputAttributesByProduct.has(attribute.productHandle)) {
        throw new Error(`Browser-effective input repeats structural attribute product '${attribute.productHandle}'.`);
      }
      this.inputAttributesByProduct.set(attribute.productHandle, attribute);
    }
  }

  build(): TemplateCompilerOccurrenceSeed {
    const carrier = this.cloneNode(
      this.input.tree.compilerCarrier,
      null,
      TemplateCompilerOccurrenceEdgeKind.Root,
    );
    if (!(carrier instanceof TemplateCompilerElementOccurrence)) {
      throw new Error('Browser-effective compiler carrier must be an element occurrence.');
    }
    const content = this.nodesByInputProduct.get(this.input.tree.compilerContent.productHandle)?.[0] ?? null;
    if (!(content instanceof TemplateCompilerFragmentOccurrence)) {
      throw new Error('Browser-effective compiler content must be one reachable fragment occurrence.');
    }
    if (carrier.templateContent !== content) {
      throw new Error('Browser-effective compiler carrier must own the selected compiler-content fragment exactly once.');
    }
    return {
      inputTree: this.input.tree.toReference(),
      roots: [carrier],
      compilerCarrier: carrier,
      compilerContent: content,
      nodes: this.nodes,
      attributes: this.attributes,
      nodesByOccurrenceKey: this.nodesByOccurrenceKey,
      attributesByOccurrenceKey: this.attributesByOccurrenceKey,
      nodesByInputProduct: this.nodesByInputProduct,
      attributesByInputProduct: this.attributesByInputProduct,
      nodesByInputIdentity: this.nodesByInputIdentity,
      attributesByInputIdentity: this.attributesByInputIdentity,
      exactNodeOriginsByInputProduct: this.exactNodeOriginsByInputProduct,
      exactAttributeOriginsByInputProduct: this.exactAttributeOriginsByInputProduct,
    };
  }

  validateIsolation(forest: TemplateCompilerOccurrenceForest): void {
    if (forest.readRoots().length !== 1 || forest.readRoots()[0] !== forest.compilerCarrier) {
      throw new Error('Seeded compiler occurrence forest must have exactly one compiler-carrier root.');
    }
    for (const occurrence of forest.readNodes()) {
      const inputReference = occurrence.inputReference;
      const input = inputReference == null ? null : this.inputNodesByProduct.get(inputReference.productHandle) ?? null;
      if (input == null || Object.is(input, occurrence)) {
        throw new Error(`Compiler occurrence '${occurrence.occurrenceKey}' does not isolate one input node product.`);
      }
      if ('children' in input && Object.is(input.children, occurrence.readChildren())) {
        throw new Error(`Compiler occurrence '${occurrence.occurrenceKey}' shares its input child collection.`);
      }
    }
    for (const occurrence of forest.readAttributes()) {
      const inputReference = occurrence.inputReference;
      const input = inputReference == null ? null : this.inputAttributesByProduct.get(inputReference.productHandle) ?? null;
      if (input == null || Object.is(input, occurrence)) {
        throw new Error(`Compiler attribute occurrence '${occurrence.occurrenceKey}' does not isolate one input attribute product.`);
      }
    }
  }

  private cloneNode(
    reference: TemplateStructuralNodeReference,
    parent: TemplateCompilerParentOccurrence | null,
    parentEdgeKind: TemplateCompilerOccurrenceEdgeKind,
  ): TemplateCompilerNodeOccurrence {
    if (reference.treeProductHandle !== this.input.tree.productHandle) {
      throw new Error(`Structural node '${reference.productHandle}' belongs to another browser-effective tree.`);
    }
    if ((this.nodesByInputProduct.get(reference.productHandle)?.length ?? 0) > 0) {
      throw new Error(`Structural node '${reference.productHandle}' is reachable through more than one carrier edge.`);
    }
    const input = this.inputNodesByProduct.get(reference.productHandle) ?? null;
    if (input == null) {
      throw new Error(`Structural node '${reference.productHandle}' is absent from the browser-effective emission.`);
    }
    if (input.identityHandle !== reference.identityHandle || input.nodeKind !== reference.nodeKind) {
      throw new Error(`Structural node reference '${reference.productHandle}' does not match its browser-effective detail.`);
    }

    const occurrenceKey = inputNodeOccurrenceKey(reference.identityHandle);
    let occurrence: TemplateCompilerNodeOccurrence;
    switch (input.nodeKind) {
      case HtmlIrNodeKind.Fragment:
        occurrence = new TemplateCompilerFragmentOccurrence(
          occurrenceKey,
          reference.identityHandle,
          reference,
          parent,
          parentEdgeKind,
        );
        break;
      case HtmlIrNodeKind.Element:
        occurrence = new TemplateCompilerElementOccurrence(
          occurrenceKey,
          reference.identityHandle,
          reference,
          parent,
          parentEdgeKind,
          input.tagName,
          input.namespace,
          input.namespaceUri,
        );
        break;
      case HtmlIrNodeKind.Text:
        occurrence = new TemplateCompilerTextOccurrence(
          occurrenceKey,
          reference.identityHandle,
          reference,
          parent,
          parentEdgeKind,
          input.text,
        );
        break;
      case HtmlIrNodeKind.Comment:
        occurrence = new TemplateCompilerCommentOccurrence(
          occurrenceKey,
          reference.identityHandle,
          reference,
          parent,
          parentEdgeKind,
          input.text,
          HtmlCommentSemanticKind.Plain,
        );
        break;
      case HtmlIrNodeKind.Doctype:
        occurrence = new TemplateCompilerDoctypeOccurrence(
          occurrenceKey,
          reference.identityHandle,
          reference,
          parent,
          parentEdgeKind,
          input.name,
          input.publicId,
          input.systemId,
        );
        break;
    }
    this.recordNode(occurrence);

    if (input.nodeKind === HtmlIrNodeKind.Fragment) {
      const fragment = occurrence as TemplateCompilerFragmentOccurrence;
      for (const child of input.children) {
        mutableChildren(fragment).push(this.cloneNode(child, fragment, TemplateCompilerOccurrenceEdgeKind.Child));
      }
    } else if (input.nodeKind === HtmlIrNodeKind.Element) {
      const element = occurrence as TemplateCompilerElementOccurrence;
      for (const attribute of input.attributes) {
        mutableAttributes(element).push(this.cloneAttribute(attribute, element));
      }
      for (const child of input.children) {
        mutableChildren(element).push(this.cloneNode(child, element, TemplateCompilerOccurrenceEdgeKind.Child));
      }
      if (input.templateContent != null) {
        const content = this.cloneNode(input.templateContent, element, TemplateCompilerOccurrenceEdgeKind.TemplateContent);
        if (!(content instanceof TemplateCompilerFragmentOccurrence)) {
          throw new Error(`Template occurrence '${occurrence.occurrenceKey}' has non-fragment template content.`);
        }
        elementTemplateContent.set(element, content);
      }
    }
    return occurrence;
  }

  private cloneAttribute(
    reference: TemplateStructuralAttributeReference,
    owner: TemplateCompilerElementOccurrence,
  ): TemplateCompilerAttributeOccurrence {
    if (reference.treeProductHandle !== this.input.tree.productHandle) {
      throw new Error(`Structural attribute '${reference.productHandle}' belongs to another browser-effective tree.`);
    }
    if ((this.attributesByInputProduct.get(reference.productHandle)?.length ?? 0) > 0) {
      throw new Error(`Structural attribute '${reference.productHandle}' is reachable through more than one owner.`);
    }
    const input = this.inputAttributesByProduct.get(reference.productHandle) ?? null;
    if (input == null) {
      throw new Error(`Structural attribute '${reference.productHandle}' is absent from the browser-effective emission.`);
    }
    if (
      input.identityHandle !== reference.identityHandle
      || input.owner.productHandle !== owner.inputReference?.productHandle
    ) {
      throw new Error(`Structural attribute reference '${reference.productHandle}' does not match its browser-effective owner.`);
    }
    const occurrence = new TemplateCompilerAttributeOccurrence(
      inputAttributeOccurrenceKey(reference.identityHandle),
      reference.identityHandle,
      reference,
      owner,
      input.name,
      input.value,
      input.namespaceUri,
      input.prefix,
    );
    this.recordAttribute(occurrence);
    return occurrence;
  }

  private recordNode(occurrence: TemplateCompilerNodeOccurrence): void {
    if (this.nodesByOccurrenceKey.has(occurrence.occurrenceKey)) {
      throw new Error(`Compiler node occurrence key '${occurrence.occurrenceKey}' is not unique.`);
    }
    this.nodes.push(occurrence);
    this.nodesByOccurrenceKey.set(occurrence.occurrenceKey, occurrence);
    if (occurrence.inputReference != null) {
      appendMap(this.nodesByInputProduct, occurrence.inputReference.productHandle, occurrence);
    }
    if (occurrence.inputIdentityKey != null) {
      appendMap(this.nodesByInputIdentity, occurrence.inputIdentityKey, occurrence);
    }
  }

  private recordAttribute(occurrence: TemplateCompilerAttributeOccurrence): void {
    if (this.attributesByOccurrenceKey.has(occurrence.occurrenceKey)) {
      throw new Error(`Compiler attribute occurrence key '${occurrence.occurrenceKey}' is not unique.`);
    }
    this.attributes.push(occurrence);
    this.attributesByOccurrenceKey.set(occurrence.occurrenceKey, occurrence);
    if (occurrence.inputReference != null) {
      appendMap(this.attributesByInputProduct, occurrence.inputReference.productHandle, occurrence);
    }
    if (occurrence.inputIdentityKey != null) {
      appendMap(this.attributesByInputIdentity, occurrence.inputIdentityKey, occurrence);
    }
  }

  private recordExactAuthoredOrigins(): void {
    const origins = new TemplateCompilerAuthoredOriginIndex(this.input.derivations);
    for (const node of this.input.nodes) {
      const origin = origins.exactOriginForBrowserProduct(node.productHandle);
      if (origin != null) this.exactNodeOriginsByInputProduct.set(node.productHandle, origin);
    }
    for (const attribute of this.input.attributes) {
      const origin = origins.exactOriginForBrowserProduct(attribute.productHandle);
      if (origin != null) this.exactAttributeOriginsByInputProduct.set(attribute.productHandle, origin);
    }
  }
}

function nodeOwnershipFor(node: TemplateCompilerNodeOccurrence): TemplateCompilerNodeOwnership {
  const ownership = nodeOwnership.get(node);
  if (ownership == null) throw new Error(`Compiler occurrence '${node.occurrenceKey}' has no ownership state.`);
  return ownership;
}

function setNodeOwnership(
  node: TemplateCompilerNodeOccurrence,
  parent: TemplateCompilerParentOccurrence | null,
  edgeKind: TemplateCompilerOccurrenceEdgeKind,
): void {
  const ownership = nodeOwnershipFor(node);
  ownership.parent = parent;
  ownership.edgeKind = edgeKind;
  if (edgeKind !== TemplateCompilerOccurrenceEdgeKind.Root) rootCollections.delete(node);
}

function mutableChildren(node: TemplateCompilerNodeOccurrence): TemplateCompilerNodeOccurrence[] {
  const children = nodeChildren.get(node);
  if (children == null) throw new Error(`Compiler occurrence '${node.occurrenceKey}' has no child collection.`);
  return children;
}

function mutableAttributes(element: TemplateCompilerElementOccurrence): TemplateCompilerAttributeOccurrence[] {
  const attributes = elementAttributes.get(element);
  if (attributes == null) throw new Error(`Compiler element '${element.occurrenceKey}' has no attribute collection.`);
  return attributes;
}

function readTemplateContent(element: TemplateCompilerElementOccurrence): TemplateCompilerFragmentOccurrence | null {
  const content = elementTemplateContent.get(element);
  if (content === undefined) throw new Error(`Compiler element '${element.occurrenceKey}' has no template-content state.`);
  return content;
}

function attributeOwnerFor(attribute: TemplateCompilerAttributeOccurrence): TemplateCompilerElementOccurrence | null {
  const owner = attributeOwners.get(attribute);
  if (owner === undefined) throw new Error(`Compiler attribute '${attribute.occurrenceKey}' has no owner state.`);
  return owner;
}

function attributeValueFor(attribute: TemplateCompilerAttributeOccurrence): string {
  const value = attributeValues.get(attribute);
  if (value == null) throw new Error(`Compiler attribute '${attribute.occurrenceKey}' has no scalar value state.`);
  return value;
}

function attributeScalarWriteRevisionFor(attribute: TemplateCompilerAttributeOccurrence): number {
  const revision = attributeScalarWriteRevisions.get(attribute);
  if (revision == null) {
    throw new Error(`Compiler attribute '${attribute.occurrenceKey}' has no scalar-write revision.`);
  }
  return revision;
}

function isParentOccurrence(node: TemplateCompilerNodeOccurrence): node is TemplateCompilerParentOccurrence {
  return node instanceof TemplateCompilerElementOccurrence || node instanceof TemplateCompilerFragmentOccurrence;
}

function nodeContains(
  candidateAncestor: TemplateCompilerNodeOccurrence,
  candidateDescendant: TemplateCompilerNodeOccurrence,
): boolean {
  let current: TemplateCompilerNodeOccurrence | null = candidateDescendant;
  while (current != null) {
    if (current === candidateAncestor) return true;
    current = current.parent;
  }
  return false;
}

function removeExact<TValue>(values: TValue[], value: TValue, label: string): number {
  const index = values.indexOf(value);
  if (index < 0) throw new Error(`Cannot detach ${label}; its owning collection does not contain it.`);
  values.splice(index, 1);
  return index;
}

function assertInsertionOrdinal(ordinal: number, length: number, label: string): void {
  if (!Number.isSafeInteger(ordinal) || ordinal < 0 || ordinal > length) {
    throw new Error(`Cannot insert compiler ${label} at ordinal ${ordinal}; expected 0..${length}.`);
  }
}

function addNodeMembership(
  memberships: Map<TemplateCompilerNodeOccurrence, {
    readonly parent: TemplateCompilerParentOccurrence | null;
    readonly edgeKind: TemplateCompilerOccurrenceEdgeKind;
  }>,
  node: TemplateCompilerNodeOccurrence,
  parent: TemplateCompilerParentOccurrence | null,
  edgeKind: TemplateCompilerOccurrenceEdgeKind,
): void {
  if (memberships.has(node)) {
    throw new Error(`Compiler occurrence '${node.occurrenceKey}' has more than one structural owner edge.`);
  }
  memberships.set(node, { parent, edgeKind });
}

function appendMap<TKey, TValue>(map: Map<TKey, TValue[]>, key: TKey, value: TValue): void {
  const existing = map.get(key);
  if (existing == null) map.set(key, [value]);
  else existing.push(value);
}

function inputNodeOccurrenceKey(identityHandle: IdentityHandle): string {
  return `input-node:${identityHandle}`;
}

function inputAttributeOccurrenceKey(identityHandle: IdentityHandle): string {
  return `input-attribute:${identityHandle}`;
}

function generatedNodeOccurrenceKey(
  nodeKind: HtmlIrNodeKind,
  generation: TemplateCompilerOccurrenceGeneration,
): string {
  return generatedOccurrenceKey(`node:${nodeKind}`, generation);
}

function generatedAttributeOccurrenceKey(generation: TemplateCompilerOccurrenceGeneration): string {
  return generatedOccurrenceKey('attribute', generation);
}

function generatedOccurrenceKey(
  occurrenceKind: string,
  generation: TemplateCompilerOccurrenceGeneration,
): string {
  return [
    'generated',
    occurrenceKind,
    localKeyPart(generation.contextKey),
    localKeyPart(generation.operationKey),
    generation.role,
    generation.outputOrdinal,
  ].join(':');
}
