import type { ProductHandle } from '../kernel/handles.js';
import {
  type AuthoredAttributeDropDerivationDraft,
  type AuthoredNodeDropDerivationDraft,
  type AuthoredAttributeDraftReference,
  type AuthoredNodeDraftReference,
  type BrowserAttributeOccurrenceDraftReference,
  type BrowserNodeOccurrenceDraftReference,
  type CorrespondenceUnresolvedPartitionDraft,
  type FactoryDiscardDerivationDraft,
  encodeAuthoredTemplatePath,
  encodeBrowserTemplatePath,
} from './browser-template-correspondence.js';
import type { BrowserTemplateDraftPathSegment } from './browser-template-draft.js';
import type { BrowserEffectiveTemplateEmission } from './browser-effective-template-materializer.js';
import {
  HtmlText,
  type HtmlAttribute,
  type HtmlIrNode,
} from './html-ir.js';
import type {
  HtmlParseAttributeDraftBinding,
  HtmlParseNodeDraftBinding,
  ParsedHtmlAttributeDraft,
} from './html-parse-materializer.js';
import {
  TemplateCompilerAuthoredOriginIndex,
  TemplateCompilerAuthoredOriginRouteKind,
  type TemplateCompilerAuthoredOriginRoute,
  type TemplateCompilerBrowserOriginRoute,
  TemplateCompilerBrowserOriginRouteKind,
} from './template-compiler-authored-origin-index.js';
import {
  TemplateCompilerNormalizedSite,
  type TemplateCompilerNormalizedSiteIndex,
  type TemplateCompilerNormalizedTextSite,
} from './template-compiler-normalized-site-index.js';
import {
  bindTemplateCompilerRootSiteInvocation,
  type TemplateCompilerSiteInvocationBinding,
  TemplateCompilerSiteInvocationBindingState,
} from './template-compiler-site-invocation.js';
import {
  BrowserEffectiveTemplateElement,
  BrowserEffectiveTemplateFragment,
  type BrowserEffectiveTemplateNode,
  type TemplateStructuralNodeReference,
} from './template-structure.js';
import {
  TemplateStructureDerivationAuthority,
  type TemplateStructureDerivation,
} from './template-structure-derivation.js';

export type TemplateCompilerPreWalkRemainderBundle =
  | TemplateCompilerNormalizedSite
  | TemplateCompilerNormalizedTextSite;

export const enum TemplateCompilerPreWalkRemainderKind {
  TemplateElementFactoryDiscarded = 'template-element-factory-discarded',
  HtmlTreeBuilderDropped = 'html-tree-builder-dropped',
  NonSingularBrowserOrigin = 'non-singular-browser-origin',
  CorrespondenceOpen = 'correspondence-open',
}

export const enum TemplateCompilerPreWalkBrowserOriginState {
  Singular = 'singular',
  NonSingular = 'non-singular',
  Absent = 'absent',
  CorrespondenceOpen = 'correspondence-open',
  Unknown = 'unknown',
}

type TemplateCompilerTypedAuthoredDrop =
  | AuthoredNodeDropDerivationDraft
  | AuthoredAttributeDropDerivationDraft;

/** Typed TemplateElementFactory discard paired with its exact materialized 1-to-0 hyperedge. */
export class TemplateCompilerPreWalkFactoryDiscard {
  constructor(
    readonly draft: FactoryDiscardDerivationDraft,
    readonly derivation: TemplateStructureDerivation,
  ) {}
}

/** Nominal no-occurrence evidence explaining why one authored GraphExact bundle cannot be spent by the live walk. */
export class TemplateCompilerPreWalkRemainderReceipt {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly bundle: TemplateCompilerPreWalkRemainderBundle,
    readonly remainderKind: TemplateCompilerPreWalkRemainderKind,
    readonly authoredRoute: TemplateCompilerAuthoredOriginRoute | null,
    readonly factoryDiscards: readonly TemplateCompilerPreWalkFactoryDiscard[],
    readonly typedDrop: TemplateCompilerTypedAuthoredDrop | null,
    readonly retainedPredecessorProductHandle: ProductHandle | null,
    readonly unresolvedPartitions: readonly CorrespondenceUnresolvedPartitionDraft[],
  ) {
    this.#authority = authority;
  }

  get reasonKind(): string {
    return this.remainderKind;
  }

  get summary(): string {
    switch (this.remainderKind) {
      case TemplateCompilerPreWalkRemainderKind.TemplateElementFactoryDiscarded:
        return 'TemplateElementFactory discarded the exact browser structure derived from this authored site before compiler traversal.';
      case TemplateCompilerPreWalkRemainderKind.HtmlTreeBuilderDropped:
        return this.typedDrop != null && 'retainedPredecessor' in this.typedDrop
          ? 'The HTML tree builder dropped this duplicate authored attribute in favor of its retained predecessor.'
          : 'The HTML tree builder dropped this authored site before browser-effective compiler traversal.';
      case TemplateCompilerPreWalkRemainderKind.NonSingularBrowserOrigin:
        return 'This authored site participates in a non-singular browser reconstruction and cannot be assigned to one occurrence.';
      case TemplateCompilerPreWalkRemainderKind.CorrespondenceOpen:
        return 'Authored/browser correspondence did not close one singular live occurrence for this authored site.';
    }
    throw new Error(`Unsupported pre-walk remainder kind '${String(this.remainderKind)}'.`);
  }

  isOwnedBy(authority: object): boolean {
    return this.#authority === authority;
  }
}

const preWalkRemainderConstructionAuthority = {};

/** Exact pre-walk remainder index for one current root invocation binding. */
export class TemplateCompilerPreWalkRemainderAuthority {
  static capture(binding: TemplateCompilerSiteInvocationBinding): TemplateCompilerPreWalkRemainderAuthority {
    if (!binding.isModuleConstructed()) {
      throw new Error('Pre-walk remainder capture requires one module-constructed site invocation binding.');
    }
    const current = bindTemplateCompilerRootSiteInvocation({
      execution: binding.execution,
      bootstrapClosure: binding.bootstrapClosure,
      browserEmission: binding.browserEmission,
      graphExact: binding.graphExact,
      currentFrontDoor: binding.currentFrontDoor,
      currentFamily: binding.currentFamily,
    });
    if (current.state !== TemplateCompilerSiteInvocationBindingState.Exact) {
      throw new Error('Pre-walk remainder capture requires a still-current exact root invocation binding.');
    }
    const authority = new TemplateCompilerPreWalkRemainderAuthority(
      preWalkRemainderConstructionAuthority,
      binding,
    );
    authority.captureReceipts();
    return authority;
  }

  readonly #receiptAuthority = {};
  readonly #receiptsByBundle = new Map<
    TemplateCompilerPreWalkRemainderBundle,
    TemplateCompilerPreWalkRemainderReceipt
  >();
  readonly #orderedReceipts: TemplateCompilerPreWalkRemainderReceipt[] = [];
  private originIndex: TemplateCompilerAuthoredOriginIndex | null = null;
  private correspondenceIndex: PreWalkCorrespondenceDispositionIndex | null = null;

  private constructor(
    constructionAuthority: object,
    readonly binding: TemplateCompilerSiteInvocationBinding,
  ) {
    if (constructionAuthority !== preWalkRemainderConstructionAuthority) {
      throw new Error('Pre-walk remainder authority was not captured by this module.');
    }
  }

  get index(): TemplateCompilerNormalizedSiteIndex {
    return this.binding.index;
  }

  get correspondenceKey(): string {
    return this.binding.browserEmission.correspondence.correspondenceKey;
  }

  receiptFor(
    bundle: TemplateCompilerPreWalkRemainderBundle,
  ): TemplateCompilerPreWalkRemainderReceipt | null {
    return this.#receiptsByBundle.get(bundle) ?? null;
  }

  readAll(): readonly TemplateCompilerPreWalkRemainderReceipt[] {
    return this.#orderedReceipts;
  }

  owns(receipt: TemplateCompilerPreWalkRemainderReceipt): boolean {
    return receipt.isOwnedBy(this.#receiptAuthority)
      && this.#receiptsByBundle.get(receipt.bundle) === receipt;
  }

  originStateForBrowserProduct(productHandle: ProductHandle): TemplateCompilerPreWalkBrowserOriginState {
    if (this.correspondenceIndex?.isBrowserProductOpen(productHandle) === true) {
      return TemplateCompilerPreWalkBrowserOriginState.CorrespondenceOpen;
    }
    const route = this.originIndex?.routeForBrowserProduct(productHandle) ?? null;
    switch (route?.routeKind) {
      case TemplateCompilerBrowserOriginRouteKind.Singular:
        return TemplateCompilerPreWalkBrowserOriginState.Singular;
      case TemplateCompilerBrowserOriginRouteKind.NonSingular:
        return TemplateCompilerPreWalkBrowserOriginState.NonSingular;
      case TemplateCompilerBrowserOriginRouteKind.Absent:
        return TemplateCompilerPreWalkBrowserOriginState.Absent;
      case undefined:
        return TemplateCompilerPreWalkBrowserOriginState.Unknown;
    }
  }

  originRouteForBrowserProduct(productHandle: ProductHandle): TemplateCompilerBrowserOriginRoute | null {
    return this.originIndex?.routeForBrowserProduct(productHandle) ?? null;
  }

  private captureReceipts(): void {
    const input = new PreWalkRemainderInputIndex(this.binding);
    const origins = this.originIndex = new TemplateCompilerAuthoredOriginIndex(
      this.binding.browserEmission.derivations,
    );
    const structure = new PreWalkCompilerInputDispositionIndex(this.binding.browserEmission, input);
    const correspondence = this.correspondenceIndex = new PreWalkCorrespondenceDispositionIndex(
      this.binding,
      input,
      origins,
    );

    for (const bundle of [...this.index.attributeSites, ...this.index.textSites]) {
      const authoredProductHandle = bundleProductHandle(bundle);
      const route = origins.routeForAuthoredProduct(authoredProductHandle);
      const partitions = correspondence.partitionsForAuthoredProduct(authoredProductHandle);
      const typedDrop = correspondence.dropForAuthoredProduct(authoredProductHandle);
      let kind: TemplateCompilerPreWalkRemainderKind | null = null;
      let factoryDiscards: readonly TemplateCompilerPreWalkFactoryDiscard[] = [];

      if (route?.routeKind === TemplateCompilerAuthoredOriginRouteKind.Dropped) {
        if (typedDrop == null) {
          throw new Error(`Dropped authored site '${authoredProductHandle}' has no typed correspondence disposition.`);
        }
        kind = TemplateCompilerPreWalkRemainderKind.HtmlTreeBuilderDropped;
      } else if (route?.routeKind === TemplateCompilerAuthoredOriginRouteKind.NonSingular) {
        kind = TemplateCompilerPreWalkRemainderKind.NonSingularBrowserOrigin;
      } else if (route?.routeKind === TemplateCompilerAuthoredOriginRouteKind.Singular) {
        const output = route.exactOrigin!.browserOutput.productHandle;
        factoryDiscards = structure.factoryDiscardsFor(output);
        if (factoryDiscards.length > 0) {
          kind = TemplateCompilerPreWalkRemainderKind.TemplateElementFactoryDiscarded;
        } else if (!structure.isCompilerReachable(output)) {
          kind = TemplateCompilerPreWalkRemainderKind.CorrespondenceOpen;
        } else if (
          correspondence.hasUnresolvedAuthoredJoin
          || partitions.some(isBlockingBundlePartition)
        ) {
          kind = TemplateCompilerPreWalkRemainderKind.CorrespondenceOpen;
        }
      } else if (
        partitions.length > 0
        || correspondence.hasUnresolvedAuthoredJoin
        || !input.hasExactAuthoredBinding(authoredProductHandle)
      ) {
        kind = TemplateCompilerPreWalkRemainderKind.CorrespondenceOpen;
      } else {
        throw new Error(`Authored site '${authoredProductHandle}' has no structural route or typed open partition.`);
      }

      if (kind == null) continue;
      const retainedPredecessorProductHandle = typedDrop != null && 'retainedPredecessor' in typedDrop
        ? input.authoredAttribute(typedDrop.retainedPredecessor)?.productHandle ?? null
        : null;
      this.addReceipt(new TemplateCompilerPreWalkRemainderReceipt(
        this.#receiptAuthority,
        bundle,
        kind,
        route,
        factoryDiscards,
        typedDrop,
        retainedPredecessorProductHandle,
        partitions,
      ));
    }
  }

  private addReceipt(receipt: TemplateCompilerPreWalkRemainderReceipt): void {
    if (this.#receiptsByBundle.has(receipt.bundle)) {
      throw new Error(`Authored site '${bundleProductHandle(receipt.bundle)}' has more than one pre-walk remainder receipt.`);
    }
    this.#receiptsByBundle.set(receipt.bundle, receipt);
    this.#orderedReceipts.push(receipt);
  }
}

class PreWalkRemainderInputIndex {
  private readonly authoredNodeBindingsByPath = new Map<string, HtmlParseNodeDraftBinding>();
  private readonly authoredAttributeBindingsByDraft = new Map<ParsedHtmlAttributeDraft, HtmlParseAttributeDraftBinding>();
  private readonly authoredProductHandles = new Set<ProductHandle>();
  private readonly browserNodesByPath = new Map<string, BrowserEffectiveTemplateNode>();
  private readonly browserNodesByProduct = new Map<ProductHandle, BrowserEffectiveTemplateNode>();
  private readonly browserAttributesByProduct = new Map<
    ProductHandle,
    BrowserEffectiveTemplateEmission['attributes'][number]
  >();

  constructor(private readonly binding: TemplateCompilerSiteInvocationBinding) {
    for (const nodeBinding of binding.compilation.html.nodeDraftBindings) {
      this.authoredNodeBindingsByPath.set(encodeAuthoredTemplatePath(nodeBinding.draft.path), nodeBinding);
      this.authoredProductHandles.add(nodeBinding.node.productHandle);
    }
    for (const attributeBinding of binding.compilation.html.attributeDraftBindings) {
      this.authoredAttributeBindingsByDraft.set(attributeBinding.draft, attributeBinding);
      this.authoredProductHandles.add(attributeBinding.attribute.productHandle);
    }
    for (const node of binding.browserEmission.nodes) this.browserNodesByProduct.set(node.productHandle, node);
    for (const attribute of binding.browserEmission.attributes) {
      this.browserAttributesByProduct.set(attribute.productHandle, attribute);
    }
    this.indexBrowserNode(binding.browserEmission.tree.inputFragment, []);
  }

  hasExactAuthoredBinding(productHandle: ProductHandle): boolean {
    return this.authoredProductHandles.has(productHandle);
  }

  authoredNode(reference: AuthoredNodeDraftReference | null): HtmlIrNode | null {
    if (reference == null) return null;
    const binding = this.authoredNodeBindingsByPath.get(encodeAuthoredTemplatePath(reference.path)) ?? null;
    if (
      binding == null
      || binding.draft.nodeKind !== reference.nodeKind
      || binding.draft.start !== reference.start
      || binding.draft.end !== reference.end
      || binding.draft.tagName !== reference.tagName
    ) return null;
    return binding.node;
  }

  authoredAttribute(reference: AuthoredAttributeDraftReference | null): HtmlAttribute | null {
    if (reference == null) return null;
    const owner = this.authoredNodeBindingsByPath.get(encodeAuthoredTemplatePath(reference.owner.path)) ?? null;
    const draft = owner?.draft.attributes[reference.ordinal] ?? null;
    if (
      draft == null
      || draft.start !== reference.start
      || draft.end !== reference.end
      || draft.rawName !== reference.rawName
    ) return null;
    return this.authoredAttributeBindingsByDraft.get(draft)?.attribute ?? null;
  }

  browserNode(reference: BrowserNodeOccurrenceDraftReference): BrowserEffectiveTemplateNode | null {
    const node = this.browserNodesByPath.get(encodeBrowserTemplatePath(reference.path)) ?? null;
    if (node == null || String(node.nodeKind) !== String(reference.nodeKind)) return null;
    if (node instanceof BrowserEffectiveTemplateElement && node.tagName !== reference.tagName) return null;
    return node;
  }

  browserAttribute(reference: BrowserAttributeOccurrenceDraftReference): ProductHandle | null {
    const owner = this.browserNode(reference.owner);
    if (!(owner instanceof BrowserEffectiveTemplateElement)) return null;
    const attributeReference = owner.attributes[reference.ordinal] ?? null;
    const attribute = attributeReference == null
      ? null
      : this.browserAttributesByProduct.get(attributeReference.productHandle) ?? null;
    if (attribute == null || attribute.name !== reference.name || attribute.prefix !== reference.prefix) return null;
    return attribute.productHandle;
  }

  browserNodeForProduct(productHandle: ProductHandle): BrowserEffectiveTemplateNode | null {
    return this.browserNodesByProduct.get(productHandle) ?? null;
  }

  private indexBrowserNode(reference: TemplateStructuralNodeReference, path: readonly BrowserTemplateDraftPathSegment[]): void {
    const node = this.browserNodesByProduct.get(reference.productHandle) ?? null;
    if (node == null) throw new Error(`Browser structural node '${reference.productHandle}' is absent from its emission.`);
    const key = encodeBrowserTemplatePath(path);
    if (this.browserNodesByPath.has(key)) throw new Error(`Browser structural path '${key}' is not unique.`);
    this.browserNodesByPath.set(key, node);
    if (node instanceof BrowserEffectiveTemplateFragment) {
      node.children.forEach((child, ordinal) => this.indexBrowserNode(child, [...path, ordinal]));
    } else if (node instanceof BrowserEffectiveTemplateElement) {
      node.children.forEach((child, ordinal) => this.indexBrowserNode(child, [...path, ordinal]));
      if (node.templateContent != null) this.indexBrowserNode(node.templateContent, [...path, 'template-content']);
    }
  }
}

class PreWalkCompilerInputDispositionIndex {
  private readonly compilerReachable = new Set<ProductHandle>();
  private readonly factoryDiscardsByStructuralProduct = new Map<
    ProductHandle,
    TemplateCompilerPreWalkFactoryDiscard[]
  >();
  private readonly discardedStructuralProducts = new Set<ProductHandle>();

  constructor(
    emission: BrowserEffectiveTemplateEmission,
    input: PreWalkRemainderInputIndex,
  ) {
    this.collectSubtree(emission.tree.compilerCarrier, input, this.compilerReachable, null);
    const factoryDropsByInput = new Map<ProductHandle, TemplateStructureDerivation[]>();
    for (const derivation of emission.derivations) {
      if (
        derivation.authority === TemplateStructureDerivationAuthority.TemplateElementFactory
        && derivation.inputs.length === 1
        && derivation.outputs.length === 0
      ) appendMap(factoryDropsByInput, derivation.inputs[0]!.structure.productHandle, derivation);
    }
    const correspondenceDrops = new Map(emission.correspondence.factoryDiscards.map((discard) => {
      const node = input.browserNode(discard.browser);
      if (node == null) throw new Error('Factory discard draft has no exact materialized browser node.');
      return [node.productHandle, discard] as const;
    }));
    for (const root of emission.tree.discardedInputNodes) {
      const derivations = factoryDropsByInput.get(root.productHandle) ?? [];
      if (derivations.length !== 1 || !correspondenceDrops.has(root.productHandle)) {
        throw new Error(`Factory-discarded root '${root.productHandle}' has no exact typed 1-to-0 derivation.`);
      }
      this.collectSubtree(
        root,
        input,
        null,
        new TemplateCompilerPreWalkFactoryDiscard(
          correspondenceDrops.get(root.productHandle)!,
          derivations[0]!,
        ),
      );
    }
    if (correspondenceDrops.size !== emission.tree.discardedInputNodes.length) {
      throw new Error('Typed factory discard inventory does not match the browser tree discard roots.');
    }
  }

  isCompilerReachable(productHandle: ProductHandle): boolean {
    return this.compilerReachable.has(productHandle);
  }

  factoryDiscardsFor(productHandle: ProductHandle): readonly TemplateCompilerPreWalkFactoryDiscard[] {
    return this.factoryDiscardsByStructuralProduct.get(productHandle) ?? [];
  }

  private collectSubtree(
    reference: TemplateStructuralNodeReference,
    input: PreWalkRemainderInputIndex,
    reachable: Set<ProductHandle> | null,
    factoryDiscard: TemplateCompilerPreWalkFactoryDiscard | null,
  ): void {
    const node = input.browserNodeForProduct(reference.productHandle);
    if (node == null) throw new Error(`Compiler input subtree lost browser node '${reference.productHandle}'.`);
    if (reachable != null) {
      if (this.factoryDiscardsByStructuralProduct.has(node.productHandle)) {
        throw new Error(`Browser structure '${node.productHandle}' is both compiler-reachable and factory-discarded.`);
      }
      if (reachable.has(node.productHandle)) return;
      reachable.add(node.productHandle);
    } else if (factoryDiscard != null) {
      if (this.compilerReachable.has(node.productHandle)) {
        throw new Error(`Browser structure '${node.productHandle}' is both compiler-reachable and factory-discarded.`);
      }
      if (this.discardedStructuralProducts.has(node.productHandle)) {
        throw new Error(`Browser structure '${node.productHandle}' belongs to overlapping factory-discard subtrees.`);
      }
      this.discardedStructuralProducts.add(node.productHandle);
      appendDistinctMap(this.factoryDiscardsByStructuralProduct, node.productHandle, factoryDiscard);
    }
    if (node instanceof BrowserEffectiveTemplateElement) {
      for (const attribute of node.attributes) {
        if (reachable != null) reachable.add(attribute.productHandle);
        else if (factoryDiscard != null) {
          if (this.compilerReachable.has(attribute.productHandle)) {
            throw new Error(`Browser attribute '${attribute.productHandle}' is both compiler-reachable and factory-discarded.`);
          }
          if (this.discardedStructuralProducts.has(attribute.productHandle)) {
            throw new Error(`Browser attribute '${attribute.productHandle}' belongs to overlapping factory-discard subtrees.`);
          }
          this.discardedStructuralProducts.add(attribute.productHandle);
          appendDistinctMap(this.factoryDiscardsByStructuralProduct, attribute.productHandle, factoryDiscard);
        }
      }
    }
    if (node instanceof BrowserEffectiveTemplateFragment || node instanceof BrowserEffectiveTemplateElement) {
      for (const child of node.children) this.collectSubtree(child, input, reachable, factoryDiscard);
    }
    if (node instanceof BrowserEffectiveTemplateElement && node.templateContent != null) {
      this.collectSubtree(node.templateContent, input, reachable, factoryDiscard);
    }
  }
}

class PreWalkCorrespondenceDispositionIndex {
  private readonly partitionsByAuthoredProduct = new Map<ProductHandle, CorrespondenceUnresolvedPartitionDraft[]>();
  private readonly dropsByAuthoredProduct = new Map<ProductHandle, TemplateCompilerTypedAuthoredDrop>();
  private readonly openBrowserProducts = new Set<ProductHandle>();
  private unresolvedAuthoredJoin = false;

  constructor(
    binding: TemplateCompilerSiteInvocationBinding,
    input: PreWalkRemainderInputIndex,
    origins: TemplateCompilerAuthoredOriginIndex,
  ) {
    const correspondence = binding.browserEmission.correspondence;
    for (const drop of correspondence.droppedAuthoredNodes) {
      const node = input.authoredNode(drop.authored);
      if (node == null || this.dropsByAuthoredProduct.has(node.productHandle)) {
        throw new Error('Authored node drop has no unique exact GraphExact product.');
      }
      this.dropsByAuthoredProduct.set(node.productHandle, drop);
      this.validateTypedDrop(node.productHandle, drop, input, origins);
    }
    for (const drop of correspondence.droppedAuthoredAttributes) {
      const attribute = input.authoredAttribute(drop.authored);
      if (attribute == null || this.dropsByAuthoredProduct.has(attribute.productHandle)) {
        throw new Error('Authored attribute drop has no unique exact GraphExact product.');
      }
      this.dropsByAuthoredProduct.set(attribute.productHandle, drop);
      this.validateTypedDrop(attribute.productHandle, drop, input, origins);
    }
    for (const partition of correspondence.unresolvedPartitions) {
      for (const authored of partition.authoredNodes) {
        const node = input.authoredNode(authored);
        if (node == null) {
          this.unresolvedAuthoredJoin = true;
          continue;
        }
        if (node instanceof HtmlText && binding.index.siteForText(node.productHandle) != null) {
          appendDistinctMap(this.partitionsByAuthoredProduct, node.productHandle, partition);
        }
      }
      for (const authored of partition.authoredAttributes) {
        const attribute = input.authoredAttribute(authored);
        if (attribute == null) {
          this.unresolvedAuthoredJoin = true;
          continue;
        }
        if (attribute != null && binding.index.siteForAttribute(attribute.productHandle) != null) {
          appendDistinctMap(this.partitionsByAuthoredProduct, attribute.productHandle, partition);
        }
      }
      const blocksOrigin = isBlockingBundlePartition(partition);
      for (const browser of partition.browserNodes) {
        const node = input.browserNode(browser);
        if (node == null) {
          throw new Error(`Unresolved partition '${partition.partitionKey}' lost a browser node product.`);
        }
        if (blocksOrigin) this.openBrowserProducts.add(node.productHandle);
      }
      for (const browser of partition.browserAttributes) {
        const productHandle = input.browserAttribute(browser);
        if (productHandle == null) {
          throw new Error(`Unresolved partition '${partition.partitionKey}' lost a browser attribute product.`);
        }
        if (blocksOrigin) this.openBrowserProducts.add(productHandle);
      }
    }
  }

  partitionsForAuthoredProduct(productHandle: ProductHandle): readonly CorrespondenceUnresolvedPartitionDraft[] {
    return this.partitionsByAuthoredProduct.get(productHandle) ?? [];
  }

  dropForAuthoredProduct(productHandle: ProductHandle): TemplateCompilerTypedAuthoredDrop | null {
    return this.dropsByAuthoredProduct.get(productHandle) ?? null;
  }

  isBrowserProductOpen(productHandle: ProductHandle): boolean {
    return this.openBrowserProducts.has(productHandle);
  }

  get hasUnresolvedAuthoredJoin(): boolean {
    return this.unresolvedAuthoredJoin;
  }

  private validateTypedDrop(
    productHandle: ProductHandle,
    drop: TemplateCompilerTypedAuthoredDrop,
    input: PreWalkRemainderInputIndex,
    origins: TemplateCompilerAuthoredOriginIndex,
  ): void {
    const route = origins.routeForAuthoredProduct(productHandle);
    if (route?.routeKind !== TemplateCompilerAuthoredOriginRouteKind.Dropped) {
      throw new Error(`Typed authored drop '${productHandle}' has no exact HtmlTreeBuilder 1-to-0 route.`);
    }
    if ('retainedPredecessor' in drop && drop.retainedPredecessor != null) {
      const predecessor = input.authoredAttribute(drop.retainedPredecessor);
      if (
        predecessor == null
        || !route.derivations[0]?.causeHandles.includes(predecessor.productHandle)
      ) {
        throw new Error(`Duplicate authored attribute '${productHandle}' lost its exact retained predecessor cause.`);
      }
    }
  }
}

function bundleProductHandle(bundle: TemplateCompilerPreWalkRemainderBundle): ProductHandle {
  return bundle instanceof TemplateCompilerNormalizedSite
    ? bundle.attributeProductHandle
    : bundle.textProductHandle;
}

function isBlockingBundlePartition(partition: CorrespondenceUnresolvedPartitionDraft): boolean {
  return partition.kind !== 'normalized-node-value'
    && partition.kind !== 'normalized-attribute-value';
}

function appendMap<TKey, TValue>(map: Map<TKey, TValue[]>, key: TKey, value: TValue): void {
  const existing = map.get(key);
  if (existing == null) map.set(key, [value]);
  else existing.push(value);
}

function appendDistinctMap<TKey, TValue>(map: Map<TKey, TValue[]>, key: TKey, value: TValue): void {
  const existing = map.get(key);
  if (existing == null) map.set(key, [value]);
  else if (!existing.includes(value)) existing.push(value);
}
