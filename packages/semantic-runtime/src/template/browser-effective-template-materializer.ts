import { createHash } from 'node:crypto';

import {
  TemplateAddress,
  TemplateNodeAddress,
} from '../kernel/address.js';
import {
  SemanticClaim,
  type ClaimEndpointHandle,
} from '../kernel/claim.js';
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
  TemplateNodeIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  OpenSeam,
  OpenSeamReasonKind,
  type OpenSeamReasonSource,
} from '../kernel/open-seam.js';
import {
  bindProductDetailEnvelope,
  requireProductDetailEnvelope,
} from '../kernel/product-details.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import {
  KernelPublicationPlan,
  publishProductDetail,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import {
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type ClaimPredicateKey,
} from '../kernel/vocabulary.js';
import {
  BrowserTemplateDraftLocationKind,
  BrowserTemplateDraftNodeKind,
  type BrowserTemplateAttributeDraft,
  type BrowserTemplateDraftResult,
  type BrowserTemplateFragmentDraft,
  type BrowserTemplateNodeDraft,
} from './browser-template-draft.js';
import {
  authoredNodeOccurrenceKey,
  browserNodeOccurrenceKey,
  encodeBrowserTemplatePath,
  planBrowserTemplateCorrespondence,
  type AuthoredAttributeDraftReference,
  type AuthoredNodeDraftReference,
  type BrowserAttributeOccurrenceDraftReference,
  type BrowserNodeOccurrenceDraftReference,
  type BrowserTemplateCorrespondenceDraft,
  type CorrespondenceUnresolvedPartitionDraft,
} from './browser-template-correspondence.js';
import type { BrowserTemplateCarrierSelectionDraft } from './browser-template-selection.js';
import type { TemplateSource } from './compilation-unit.js';
import type {
  HtmlParseEmission,
  ParsedHtmlAttributeDraft,
} from './html-parse-materializer.js';
import {
  type HtmlAttribute,
  HtmlElement,
  type HtmlIrNode,
  HtmlIrNodeKind,
  HtmlNamespaceKind,
} from './html-ir.js';
import { TemplateProductDetails } from './product-details.js';
import {
  BrowserEffectiveTemplateAttribute,
  BrowserEffectiveTemplateComment,
  BrowserEffectiveTemplateDoctype,
  BrowserEffectiveTemplateElement,
  BrowserEffectiveTemplateFragment,
  type BrowserEffectiveTemplateNode,
  BrowserEffectiveTemplateText,
  BrowserEffectiveTemplateTree,
  TemplateStructuralNodeReference,
  TemplateStructuralTreeReference,
} from './template-structure.js';
import {
  TemplateStructureDerivation,
  TemplateStructureDerivationAuthority,
  TemplateStructureDerivationTerm,
  TemplateStructureReference,
} from './template-structure-derivation.js';

const BrowserTreePathRoot = 0;
const BrowserTreePathChild = 0;
const BrowserTreePathTemplateContent = 1;
const BrowserTreePathGeneratedCarrier = 1;

export interface BrowserEffectiveTemplateMaterializationRequest {
  readonly localKey: string;
  readonly sourceRevision: string;
  readonly templateSource: TemplateSource;
  readonly authoredHtml: HtmlParseEmission;
  readonly browser: BrowserTemplateDraftResult;
  readonly carrierSelection: BrowserTemplateCarrierSelectionDraft;
}

interface ValidatedBrowserEffectiveTemplateMaterializationRequest
  extends BrowserEffectiveTemplateMaterializationRequest {
  readonly correspondence: BrowserTemplateCorrespondenceDraft;
}

const browserEffectiveTemplateEmissionAuthority = {};

export class BrowserEffectiveTemplateEmission {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly correspondence: BrowserTemplateCorrespondenceDraft,
    readonly tree: BrowserEffectiveTemplateTree,
    readonly nodes: readonly BrowserEffectiveTemplateNode[],
    readonly attributes: readonly BrowserEffectiveTemplateAttribute[],
    readonly derivations: readonly TemplateStructureDerivation[],
    readonly openSeams: readonly OpenSeam[],
    readonly records: readonly KernelStoreRecord[],
    /** Generation-bound candidate that owns this tree and all later run-local compiler allocations. */
    readonly publication: KernelPublicationContext,
  ) {
    if (authority !== browserEffectiveTemplateEmissionAuthority) {
      throw new Error('Browser-effective template emissions are module-constructed capabilities.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === browserEffectiveTemplateEmissionAuthority;
  }

  withCorrespondence(correspondence: BrowserTemplateCorrespondenceDraft): BrowserEffectiveTemplateEmission {
    return new BrowserEffectiveTemplateEmission(
      browserEffectiveTemplateEmissionAuthority,
      correspondence,
      this.tree,
      this.nodes,
      this.attributes,
      this.derivations,
      this.openSeams,
      this.records,
      this.publication,
    );
  }

  withOpenSeams(openSeams: readonly OpenSeam[]): BrowserEffectiveTemplateEmission {
    return new BrowserEffectiveTemplateEmission(
      browserEffectiveTemplateEmissionAuthority,
      this.correspondence,
      this.tree,
      this.nodes,
      this.attributes,
      this.derivations,
      openSeams,
      this.records,
      this.publication,
    );
  }
}

class BrowserEffectiveTemplateSourceSet {
  constructor(
    readonly evidenceHandle: ReturnType<KernelPublicationContext['handles']['evidence']>,
    readonly provenanceHandle: ProvenanceHandle,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

interface StructuralNodeFrame {
  readonly occurrenceKey: string;
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
  readonly addressHandle: AddressHandle;
  readonly reference: TemplateStructuralNodeReference;
}

interface StructuralAttributeFrame {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
  readonly addressHandle: AddressHandle | null;
}

class AuthoredProductIndex {
  readonly nodesByOccurrence = new Map<string, HtmlIrNode>();
  readonly attributesByOccurrence = new Map<string, HtmlAttribute>();

  constructor(
    readonly occurrenceIdentityKey: string,
    html: HtmlParseEmission,
  ) {
    const attributesByDraft = new Map(html.attributeDraftBindings.map((binding) => [binding.draft, binding.attribute]));
    for (const binding of html.nodeDraftBindings) {
      const nodeKey = authoredNodeOccurrenceKey(occurrenceIdentityKey, binding.draft);
      this.nodesByOccurrence.set(nodeKey, binding.node);
      binding.draft.attributes.forEach((attribute, ordinal) => {
        const product = attributesByDraft.get(attribute) ?? null;
        if (product != null) {
          this.attributesByOccurrence.set(authoredAttributeOccurrenceKey(nodeKey, attribute, ordinal), product);
        }
      });
    }
  }

  node(reference: AuthoredNodeDraftReference): HtmlIrNode | null {
    return this.nodesByOccurrence.get(reference.occurrenceKey) ?? null;
  }

  attribute(reference: AuthoredAttributeDraftReference): HtmlAttribute | null {
    return this.attributesByOccurrence.get(reference.occurrenceKey) ?? null;
  }
}

class BrowserEffectiveTemplateState {
  readonly records: KernelStoreRecord[] = [];
  readonly claims: SemanticClaim[] = [];
  readonly nodes: BrowserEffectiveTemplateNode[] = [];
  readonly attributes: BrowserEffectiveTemplateAttribute[] = [];
  readonly derivations: TemplateStructureDerivation[] = [];
  readonly openSeams: OpenSeam[] = [];
  readonly nodeByBrowserOccurrence = new Map<string, BrowserEffectiveTemplateNode>();
  readonly attributeByBrowserOccurrence = new Map<string, BrowserEffectiveTemplateAttribute>();
  readonly fragmentByPath = new Map<string, BrowserEffectiveTemplateFragment>();
  readonly nodeDerivationByBrowser: ReadonlyMap<string, BrowserTemplateCorrespondenceDraft['nodeDerivations'][number]>;
  readonly attributeDerivationByBrowser: ReadonlyMap<string, BrowserTemplateCorrespondenceDraft['attributeDerivations'][number]>;
  private readonly claimSignatureCounts = new Map<string, number>();

  constructor(
    readonly store: KernelPublicationContext,
    readonly input: ValidatedBrowserEffectiveTemplateMaterializationRequest,
    readonly source: BrowserEffectiveTemplateSourceSet,
    readonly treeProductHandle: ProductHandle,
    readonly treeIdentityHandle: IdentityHandle,
    readonly treeAddressHandle: AddressHandle,
    readonly treeReference: TemplateStructuralTreeReference,
    readonly authored: AuthoredProductIndex,
  ) {
    this.nodeDerivationByBrowser = new Map(input.correspondence.nodeDerivations.map((row) => [row.browser.occurrenceKey, row]));
    this.attributeDerivationByBrowser = new Map(input.correspondence.attributeDerivations.map((row) => [row.browser.occurrenceKey, row]));
  }

  addClaim(subject: ClaimEndpointHandle, predicateKey: ClaimPredicateKey, object: ClaimEndpointHandle): void {
    const signature = JSON.stringify([subject, predicateKey, object]);
    const occurrence = this.claimSignatureCounts.get(signature) ?? 0;
    this.claimSignatureCounts.set(signature, occurrence + 1);
    const digest = createHash('sha256').update(signature).digest('hex').slice(0, 24);
    const local = `${this.input.localKey}:claim:${digest}:${occurrence}`;
    this.claims.push(new SemanticClaim(
      this.store.handles.claim(local),
      subject,
      predicateKey,
      object,
      this.source.provenanceHandle,
    ));
  }

  addDerivation(
    category: string,
    authority: TemplateStructureDerivationAuthority,
    inputs: readonly TemplateStructureDerivationTerm[],
    outputs: readonly TemplateStructureDerivationTerm[],
    causes: readonly ClaimEndpointHandle[],
  ): TemplateStructureDerivation {
    const signature = JSON.stringify([
      authority,
      category,
      inputs.map((term) => [term.structure.productKindKey, term.structure.productHandle]),
      outputs.map((term) => [term.structure.productKindKey, term.structure.productHandle]),
      causes,
    ]);
    const digest = createHash('sha256').update(signature).digest('hex').slice(0, 24);
    const local = `browser-effective:${this.input.localKey}:derivation:${category}:${digest}`;
    const sourceAddressHandle = inputs.length === 1
      ? inputs[0]?.segmentAddressHandle ?? inputs[0]?.structure.addressHandle ?? null
      : null;
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const derivation = bindProductDetailEnvelope(new TemplateStructureDerivation(
      authority,
      inputs,
      outputs,
      causes,
      [],
    ), new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.StructureDerivation.key,
      identityHandle,
      sourceAddressHandle,
      this.source.provenanceHandle,
    ));
    this.derivations.push(derivation);
    this.records.push(
      new CompilerIdentity(
        identityHandle,
        KernelVocabulary.Template.StructureDerivation.key,
        this.treeIdentityHandle,
        sourceAddressHandle,
        authority,
      ),
      requireProductDetailEnvelope(derivation, 'template.structure-derivation'),
    );
    for (const input of inputs) {
      this.addClaim(
        derivation.productHandle,
        KernelVocabulary.Template.StructureDerivationConsumes.key,
        input.structure.productHandle,
      );
    }
    for (const output of outputs) {
      this.addClaim(
        derivation.productHandle,
        KernelVocabulary.Template.StructureDerivationProduces.key,
        output.structure.productHandle,
      );
    }
    for (const cause of causes) {
      this.addClaim(
        derivation.productHandle,
        KernelVocabulary.Template.StructureDerivationCausedBy.key,
        cause,
      );
    }
    return derivation;
  }
}

/** Materializes the immutable browser tree and authored/browser/factory structural derivations. */
export class BrowserEffectiveTemplateMaterializer {
  constructor(readonly store: KernelPublicationContext) {}

  materialize(input: BrowserEffectiveTemplateMaterializationRequest): BrowserEffectiveTemplateEmission {
    const correspondence = this.correspondenceForInput(input);
    const emission = this.recordsForMaterialization({ ...input, correspondence });
    this.store.publish(new KernelPublicationPlan(
      new KernelStoreBatch(emission.records, `browser-effective-template:${input.localKey}`),
      [
        publishProductDetail(TemplateProductDetails.StructuralTree, emission.tree.productHandle, emission.tree),
        ...publishProductDetails(TemplateProductDetails.StructuralNode, emission.nodes),
        ...publishProductDetails(TemplateProductDetails.StructuralAttribute, emission.attributes),
        ...publishProductDetails(TemplateProductDetails.StructureDerivation, emission.derivations),
      ],
    ));
    return emission;
  }

  private correspondenceForInput(
    input: BrowserEffectiveTemplateMaterializationRequest,
  ): BrowserTemplateCorrespondenceDraft {
    if (
      input.authoredHtml.draft == null
      || input.templateSource.markup == null
      || input.authoredHtml.draft.markup !== input.templateSource.markup
      || input.browser.markup !== input.templateSource.markup
    ) {
      throw new Error('Browser-effective materialization requires one retained authored draft and exact markup input.');
    }
    if (
      input.authoredHtml.nodeDraftBindings.length !== input.authoredHtml.nodes.length
      || input.authoredHtml.attributeDraftBindings.length !== input.authoredHtml.attributes.length
    ) {
      throw new Error('Browser-effective materialization requires complete authored draft/product bindings.');
    }
    const correspondence = planBrowserTemplateCorrespondence({
      templateIdentity: input.templateSource.identityHandle,
      sourceRevision: input.sourceRevision,
      markup: input.templateSource.markup,
      authored: input.authoredHtml.draft,
      browser: input.browser,
      carrierSelection: input.carrierSelection,
    });
    if (correspondence.compilerCarrier == null) {
      throw new Error('Browser-effective materialization requires an explicit compiler carrier derivation.');
    }
    return correspondence;
  }

  private recordsForMaterialization(
    input: ValidatedBrowserEffectiveTemplateMaterializationRequest,
  ): BrowserEffectiveTemplateEmission {
    const source = this.recordsForSource(input);
    const treeLocal = `browser-effective:${input.localKey}:tree`;
    const treeProductHandle = this.store.handles.product(treeLocal);
    const treeIdentityHandle = this.store.handles.identity(treeLocal);
    const treeAddressHandle = this.store.handles.address(treeLocal);
    const treeReference = new TemplateStructuralTreeReference(
      treeProductHandle,
      treeIdentityHandle,
      treeAddressHandle,
    );
    const state = new BrowserEffectiveTemplateState(
      this.store,
      input,
      source,
      treeProductHandle,
      treeIdentityHandle,
      treeAddressHandle,
      treeReference,
      new AuthoredProductIndex(input.correspondence.occurrenceIdentityKey, input.authoredHtml),
    );
    state.records.push(...source.records, new TemplateAddress(
      treeAddressHandle,
      `browser-effective:${input.localKey}`,
      input.templateSource.owner?.identityHandle ?? null,
      input.templateSource.sourceAddressHandle,
    ));

    const inputFragment = this.materializeFragment(state, input.browser.fragment, [BrowserTreePathRoot]);
    const carrierCorrespondence = input.correspondence.compilerCarrier;
    if (carrierCorrespondence == null) {
      throw new Error('Browser-effective materialization lost its validated compiler carrier.');
    }
    let generatedCarrier: BrowserEffectiveTemplateElement | null = null;
    if (carrierCorrespondence.derivation === '0-to-1-synthesized-wrapper') {
      generatedCarrier = this.materializeGeneratedCarrier(
        state,
        carrierCorrespondence.compilerCarrier.occurrenceKey,
        inputFragment,
      );
    }

    const compilerCarrier = generatedCarrier?.toReference()
      ?? this.requiredBrowserNodeReference(
        state,
        carrierCorrespondence.compilerCarrier.occurrenceKey,
        'compiler carrier',
      );
    const authoredCarrier = input.carrierSelection.authoredCarrier == null
      ? null
      : this.requiredBrowserNodeByPath(state, input.carrierSelection.authoredCarrier.path, 'authored carrier').toReference();
    const compilerContent = this.requiredFragmentByPath(
      state,
      input.carrierSelection.content.path,
      'compiler content',
    ).toReference();
    const discardedInputNodes = input.carrierSelection.discardedInputNodes.map((node) =>
      this.requiredBrowserNodeByPath(state, node.path, 'factory-discarded node').toReference()
    );

    const tree = bindProductDetailEnvelope(new BrowserEffectiveTemplateTree(
      input.templateSource.toReference(),
      input.browser.authority,
      inputFragment.toReference(),
      input.carrierSelection.carrierKind,
      input.carrierSelection.reason,
      compilerCarrier,
      authoredCarrier,
      compilerContent,
      discardedInputNodes,
      [],
    ), new MaterializedProduct(
      treeProductHandle,
      KernelVocabulary.Template.StructuralTree.key,
      treeIdentityHandle,
      treeAddressHandle,
      source.provenanceHandle,
    ));
    state.records.push(
      new CompilerIdentity(
        treeIdentityHandle,
        KernelVocabulary.Template.StructuralTree.key,
        input.templateSource.identityHandle,
        treeAddressHandle,
        input.browser.authority.parserVersion,
      ),
      requireProductDetailEnvelope(tree, 'template.structural-tree'),
    );

    state.addClaim(
      input.templateSource.productHandle,
      KernelVocabulary.Template.ParsesToStructuralTree.key,
      tree.productHandle,
    );
    state.addClaim(tree.productHandle, KernelVocabulary.Template.ContainsStructuralNode.key, inputFragment.productHandle);
    if (generatedCarrier != null) {
      state.addClaim(tree.productHandle, KernelVocabulary.Template.ContainsStructuralNode.key, generatedCarrier.productHandle);
    }
    state.addClaim(tree.productHandle, KernelVocabulary.Template.SelectsCompilerContent.key, compilerContent.productHandle);

    this.materializeCorrespondenceDerivations(state);
    this.materializeCorrespondenceSeams(state);
    state.records.push(
      ...state.claims,
      new MaterializationRecord(
        this.store.handles.materialization(`browser-effective:${input.localKey}`),
        tree.identityHandle,
        [
          tree.productHandle,
          ...state.nodes.map((node) => node.productHandle),
          ...state.attributes.map((attribute) => attribute.productHandle),
          ...state.derivations.map((derivation) => derivation.productHandle),
        ],
        state.claims.map((claim) => claim.handle),
        state.openSeams.map((seam) => seam.handle),
      ),
    );
    return new BrowserEffectiveTemplateEmission(
      browserEffectiveTemplateEmissionAuthority,
      input.correspondence,
      tree,
      state.nodes,
      state.attributes,
      state.derivations,
      state.openSeams,
      state.records,
      this.store,
    );
  }

  private recordsForSource(input: ValidatedBrowserEffectiveTemplateMaterializationRequest): BrowserEffectiveTemplateSourceSet {
    const evidenceHandle = this.store.handles.evidence(`browser-effective:${input.localKey}:source`);
    const provenanceHandle = this.store.handles.provenance(`browser-effective:${input.localKey}:source`);
    return new BrowserEffectiveTemplateSourceSet(evidenceHandle, provenanceHandle, [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
        `Browser-effective template structure produced by ${input.browser.authority.parser} ${input.browser.authority.parserVersion}.`,
        input.templateSource.sourceAddressHandle,
        input.templateSource.identityHandle,
      ),
      new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
    ]);
  }

  private materializeFragment(
    state: BrowserEffectiveTemplateState,
    draft: BrowserTemplateFragmentDraft,
    numericPath: readonly number[],
  ): BrowserEffectiveTemplateFragment {
    const occurrenceKey = browserFragmentOccurrenceKey(state.input.correspondence.occurrenceIdentityKey, draft.path);
    const frame = this.structuralNodeFrame(state, occurrenceKey, HtmlIrNodeKind.Fragment, numericPath, null);
    const children = draft.children.map((child, index) =>
      this.materializeBrowserNode(state, child, [...numericPath, BrowserTreePathChild, index]).toReference()
    );
    const fragment = this.recordNode(state, frame, new BrowserEffectiveTemplateFragment(
      state.treeReference,
      children,
      [],
    ));
    state.fragmentByPath.set(encodeBrowserTemplatePath(draft.path), fragment);
    for (const child of children) {
      state.addClaim(fragment.productHandle, KernelVocabulary.Template.ContainsStructuralNode.key, child.productHandle);
    }
    return fragment;
  }

  private materializeBrowserNode(
    state: BrowserEffectiveTemplateState,
    draft: BrowserTemplateNodeDraft,
    numericPath: readonly number[],
  ): BrowserEffectiveTemplateNode {
    const occurrenceKey = browserNodeOccurrenceKey(state.input.correspondence.occurrenceIdentityKey, draft);
    const sourceAddressHandle = this.browserNodeSourceAddress(state, occurrenceKey);
    const nodeKind = structuralNodeKind(draft.nodeKind);
    const frame = this.structuralNodeFrame(state, occurrenceKey, nodeKind, numericPath, sourceAddressHandle);
    let node: BrowserEffectiveTemplateNode;
    switch (draft.nodeKind) {
      case BrowserTemplateDraftNodeKind.Element: {
        const owner = frame.reference;
        const attributes = draft.attributes.map((attribute, index) =>
          this.materializeAttribute(state, occurrenceKey, owner, attribute, index).toReference()
        );
        const children = draft.children.map((child, index) =>
          this.materializeBrowserNode(state, child, [...numericPath, BrowserTreePathChild, index]).toReference()
        );
        const templateContent = draft.templateContent == null
          ? null
          : this.materializeFragment(
              state,
              draft.templateContent,
              [...numericPath, BrowserTreePathTemplateContent],
            ).toReference();
        node = this.recordNode(state, frame, new BrowserEffectiveTemplateElement(
          state.treeReference,
          draft.tagName,
          draft.namespace,
          draft.namespaceUri,
          attributes,
          children,
          templateContent,
          draft.locationKind,
          draft.sourceLocation,
          draft.startTagSourceLocation,
          draft.endTagSourceLocation,
          [],
        ));
        for (const attribute of attributes) {
          state.addClaim(node.productHandle, KernelVocabulary.Template.ContainsStructuralAttribute.key, attribute.productHandle);
        }
        for (const child of children) {
          state.addClaim(node.productHandle, KernelVocabulary.Template.ContainsStructuralNode.key, child.productHandle);
        }
        if (templateContent != null) {
          state.addClaim(node.productHandle, KernelVocabulary.Template.HasStructuralTemplateContent.key, templateContent.productHandle);
        }
        break;
      }
      case BrowserTemplateDraftNodeKind.Text:
        node = this.recordNode(state, frame, new BrowserEffectiveTemplateText(
          state.treeReference,
          draft.text,
          draft.locationKind,
          draft.sourceLocation,
          [],
        ));
        break;
      case BrowserTemplateDraftNodeKind.Comment:
        node = this.recordNode(state, frame, new BrowserEffectiveTemplateComment(
          state.treeReference,
          draft.text,
          draft.locationKind,
          draft.sourceLocation,
          [],
        ));
        break;
      case BrowserTemplateDraftNodeKind.Doctype:
        node = this.recordNode(state, frame, new BrowserEffectiveTemplateDoctype(
          state.treeReference,
          draft.name,
          draft.publicId,
          draft.systemId,
          draft.locationKind,
          draft.sourceLocation,
          [],
        ));
        break;
    }
    state.nodeByBrowserOccurrence.set(occurrenceKey, node);
    return node;
  }

  private materializeGeneratedCarrier(
    state: BrowserEffectiveTemplateState,
    occurrenceKey: string,
    compilerContent: BrowserEffectiveTemplateFragment,
  ): BrowserEffectiveTemplateElement {
    const frame = this.structuralNodeFrame(
      state,
      occurrenceKey,
      HtmlIrNodeKind.Element,
      [BrowserTreePathGeneratedCarrier],
      null,
    );
    const carrier = this.recordNode(state, frame, new BrowserEffectiveTemplateElement(
      state.treeReference,
      'template',
      HtmlNamespaceKind.Html,
      'http://www.w3.org/1999/xhtml',
      [],
      [],
      compilerContent.toReference(),
      BrowserTemplateDraftLocationKind.ParserUnlocated,
      null,
      null,
      null,
      [],
    ));
    state.nodeByBrowserOccurrence.set(occurrenceKey, carrier);
    state.addClaim(
      carrier.productHandle,
      KernelVocabulary.Template.HasStructuralTemplateContent.key,
      compilerContent.productHandle,
    );
    return carrier;
  }

  private structuralNodeFrame(
    state: BrowserEffectiveTemplateState,
    occurrenceKey: string,
    nodeKind: HtmlIrNodeKind,
    numericPath: readonly number[],
    sourceAddressHandle: AddressHandle | null,
  ): StructuralNodeFrame {
    const digest = createHash('sha256').update(occurrenceKey).digest('hex').slice(0, 24);
    const local = `browser-effective:${state.input.localKey}:node:${nodeKind}:${digest}`;
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const addressHandle = this.store.handles.address(local);
    state.records.push(new TemplateNodeAddress(
      addressHandle,
      state.treeAddressHandle,
      numericPath,
      sourceAddressHandle,
    ));
    return {
      occurrenceKey,
      productHandle,
      identityHandle,
      addressHandle,
      reference: new TemplateStructuralNodeReference(
        state.treeProductHandle,
        nodeKind,
        productHandle,
        identityHandle,
        addressHandle,
      ),
    };
  }

  private recordNode<TNode extends BrowserEffectiveTemplateNode>(
    state: BrowserEffectiveTemplateState,
    frame: StructuralNodeFrame,
    node: TNode,
  ): TNode {
    const bound = bindProductDetailEnvelope(node, new MaterializedProduct(
      frame.productHandle,
      KernelVocabulary.Template.StructuralNode.key,
      frame.identityHandle,
      frame.addressHandle,
      state.source.provenanceHandle,
    ));
    state.nodes.push(bound);
    state.records.push(
      new TemplateNodeIdentity(
        frame.identityHandle,
        state.input.templateSource.identityHandle,
        frame.occurrenceKey,
        frame.addressHandle,
      ),
      requireProductDetailEnvelope(bound, 'template.structural-node'),
    );
    return bound;
  }

  private materializeAttribute(
    state: BrowserEffectiveTemplateState,
    ownerOccurrenceKey: string,
    owner: TemplateStructuralNodeReference,
    draft: BrowserTemplateAttributeDraft,
    ordinal: number,
  ): BrowserEffectiveTemplateAttribute {
    const occurrenceKey = `${ownerOccurrenceKey}/attribute/i:${ordinal}`;
    const sourceAddressHandle = this.browserAttributeSourceAddress(state, occurrenceKey);
    const digest = createHash('sha256').update(occurrenceKey).digest('hex').slice(0, 24);
    const local = `browser-effective:${state.input.localKey}:attribute:${digest}`;
    const frame: StructuralAttributeFrame = {
      productHandle: this.store.handles.product(local),
      identityHandle: this.store.handles.identity(local),
      addressHandle: sourceAddressHandle,
    };
    const attribute = bindProductDetailEnvelope(new BrowserEffectiveTemplateAttribute(
      state.treeReference,
      owner,
      draft.name,
      draft.value,
      draft.namespaceUri,
      draft.prefix,
      draft.locationJoinKind,
      draft.parserLocationKey,
      draft.sourceTokenName,
      draft.sourceLocation,
      [],
    ), new MaterializedProduct(
      frame.productHandle,
      KernelVocabulary.Template.StructuralAttribute.key,
      frame.identityHandle,
      frame.addressHandle,
      state.source.provenanceHandle,
    ));
    state.attributes.push(attribute);
    state.attributeByBrowserOccurrence.set(occurrenceKey, attribute);
    state.records.push(
      new CompilerIdentity(
        frame.identityHandle,
        KernelVocabulary.Template.StructuralAttribute.key,
        owner.identityHandle,
        frame.addressHandle,
        draft.name,
      ),
      requireProductDetailEnvelope(attribute, 'template.structural-attribute'),
    );
    return attribute;
  }

  private browserNodeSourceAddress(state: BrowserEffectiveTemplateState, occurrenceKey: string): AddressHandle | null {
    const derivation = state.nodeDerivationByBrowser.get(occurrenceKey) ?? null;
    if (derivation == null) {
      return null;
    }
    const authored = state.authored.node(derivation.authored);
    return derivation.extent === 'identical'
      ? authored?.sourceAddressHandle ?? null
      : authored instanceof HtmlElement
        ? authored.tagNameAddressHandle
        : null;
  }

  private browserAttributeSourceAddress(state: BrowserEffectiveTemplateState, occurrenceKey: string): AddressHandle | null {
    const derivation = state.attributeDerivationByBrowser.get(occurrenceKey) ?? null;
    return derivation == null ? null : state.authored.attribute(derivation.authored)?.sourceAddressHandle ?? null;
  }

  private requiredBrowserNodeByPath(
    state: BrowserEffectiveTemplateState,
    path: readonly (number | 'template-content')[],
    label: string,
  ): BrowserEffectiveTemplateNode {
    const occurrence = browserOccurrenceForPath(
      state.input.correspondence.occurrenceIdentityKey,
      state.input.browser,
      path,
    );
    return this.requiredBrowserNode(state, occurrence, label);
  }

  private requiredBrowserNode(
    state: BrowserEffectiveTemplateState,
    occurrenceKey: string,
    label: string,
  ): BrowserEffectiveTemplateNode {
    const node = state.nodeByBrowserOccurrence.get(occurrenceKey) ?? null;
    if (node == null) throw new Error(`Browser-effective ${label} has no materialized node occurrence.`);
    return node;
  }

  private requiredBrowserNodeReference(
    state: BrowserEffectiveTemplateState,
    occurrenceKey: string,
    label: string,
  ): TemplateStructuralNodeReference {
    return this.requiredBrowserNode(state, occurrenceKey, label).toReference();
  }

  private requiredFragmentByPath(
    state: BrowserEffectiveTemplateState,
    path: readonly (number | 'template-content')[],
    label: string,
  ): BrowserEffectiveTemplateFragment {
    const fragment = state.fragmentByPath.get(encodeBrowserTemplatePath(path)) ?? null;
    if (fragment == null) throw new Error(`Browser-effective ${label} has no materialized fragment occurrence.`);
    return fragment;
  }

  private materializeCorrespondenceDerivations(state: BrowserEffectiveTemplateState): void {
    const correspondence = state.input.correspondence;
    const reconstructedNodeKeys = new Set(correspondence.reconstructionCohorts.map((cohort) => cohort.authored.occurrenceKey));
    for (const cohort of correspondence.reconstructionCohorts) {
      const input = this.authoredNodeTerm(state, cohort.authored, 'opening-token');
      const outputs = cohort.browserOccurrences.map((browser) => this.browserNodeTerm(state, browser));
      state.addDerivation('node-reconstruction', TemplateStructureDerivationAuthority.HtmlTreeBuilder, [input], outputs, []);
    }
    // Placement is the difference between the authored and structural containment graphs. `movedNodes` is retained on
    // the correspondence emission for direct inspection; materializing a second self-edge would duplicate that fact.
    for (const derivation of correspondence.nodeDerivations) {
      if (reconstructedNodeKeys.has(derivation.authored.occurrenceKey)) continue;
      state.addDerivation(
        'node-origin',
        TemplateStructureDerivationAuthority.HtmlTreeBuilder,
        [this.authoredNodeTerm(state, derivation.authored, derivation.association)],
        [this.browserNodeTerm(state, derivation.browser)],
        [],
      );
    }

    const attributesByAuthored = new Map<string, typeof correspondence.attributeDerivations>();
    for (const derivation of correspondence.attributeDerivations) {
      const existing = attributesByAuthored.get(derivation.authored.occurrenceKey) ?? [];
      attributesByAuthored.set(derivation.authored.occurrenceKey, [...existing, derivation]);
    }
    for (const derivations of attributesByAuthored.values()) {
      const first = derivations[0]!;
      state.addDerivation(
        derivations.length > 1 ? 'attribute-reconstruction' : 'attribute-exact',
        TemplateStructureDerivationAuthority.HtmlTreeBuilder,
        [this.authoredAttributeTerm(state, first.authored)],
        derivations.map((derivation) => this.browserAttributeTerm(state, derivation.browser)),
        [],
      );
    }
    for (const implied of correspondence.impliedNodes) {
      state.addDerivation(
        `implied-${implied.reason}`,
        TemplateStructureDerivationAuthority.HtmlTreeBuilder,
        [],
        [this.browserNodeTerm(state, implied.browser)],
        implied.causeCandidates.flatMap((candidate) => {
          const node = state.authored.node(candidate);
          return node == null ? [] : [node.productHandle];
        }),
      );
    }
    for (const dropped of correspondence.droppedAuthoredNodes) {
      state.addDerivation(
        `drop-node-${dropped.reason}`,
        TemplateStructureDerivationAuthority.HtmlTreeBuilder,
        [this.authoredNodeTerm(state, dropped.authored)],
        [],
        [],
      );
    }
    for (const dropped of correspondence.droppedAuthoredAttributes) {
      const predecessor = dropped.retainedPredecessor == null
        ? null
        : state.authored.attribute(dropped.retainedPredecessor);
      state.addDerivation(
        `drop-attribute-${dropped.reason}`,
        TemplateStructureDerivationAuthority.HtmlTreeBuilder,
        [this.authoredAttributeTerm(state, dropped.authored)],
        [],
        predecessor == null ? [] : [predecessor.productHandle],
      );
    }

    const carrier = correspondence.compilerCarrier!;
    if (carrier.derivation === '0-to-1-synthesized-wrapper') {
      const generated = this.requiredBrowserNode(
        state,
        carrier.compilerCarrier.occurrenceKey,
        'generated compiler carrier',
      );
      state.addDerivation(
        'factory-generated-carrier',
        TemplateStructureDerivationAuthority.TemplateElementFactory,
        [],
        [structuralNodeTerm(generated)],
        [state.input.templateSource.productHandle],
      );
    } else {
      const selected = this.browserNodeTerm(state, carrier.compilerCarrier as BrowserNodeOccurrenceDraftReference);
      state.addDerivation(
        'factory-selected-carrier',
        TemplateStructureDerivationAuthority.TemplateElementFactory,
        [selected],
        [selected],
        [],
      );
    }
    for (const discarded of correspondence.factoryDiscards) {
      state.addDerivation(
        `factory-drop-${discarded.reason}`,
        TemplateStructureDerivationAuthority.TemplateElementFactory,
        [this.browserNodeTerm(state, discarded.browser)],
        [],
        [],
      );
    }
  }

  private authoredNodeTerm(
    state: BrowserEffectiveTemplateState,
    reference: AuthoredNodeDraftReference,
    association: 'opening-token' | 'exact-range' = 'exact-range',
  ): TemplateStructureDerivationTerm {
    const node = state.authored.node(reference);
    if (node == null) throw new Error(`Authored node ${reference.occurrenceKey} has no retained product binding.`);
    const segmentAddressHandle = association === 'opening-token' && node instanceof HtmlElement
      ? node.tagNameAddressHandle
      : node.sourceAddressHandle;
    return new TemplateStructureDerivationTerm(structureReference(
      KernelVocabulary.Template.HtmlNode.key,
      node.productHandle,
      node.identityHandle,
      node.sourceAddressHandle,
    ), segmentAddressHandle);
  }

  private authoredAttributeTerm(
    state: BrowserEffectiveTemplateState,
    reference: AuthoredAttributeDraftReference,
  ): TemplateStructureDerivationTerm {
    const attribute = state.authored.attribute(reference);
    if (attribute == null) throw new Error(`Authored attribute ${reference.occurrenceKey} has no retained product binding.`);
    return new TemplateStructureDerivationTerm(structureReference(
      KernelVocabulary.Template.HtmlAttribute.key,
      attribute.productHandle,
      attribute.identityHandle,
      attribute.sourceAddressHandle,
    ), attribute.sourceAddressHandle);
  }

  private browserNodeTerm(
    state: BrowserEffectiveTemplateState,
    reference: BrowserNodeOccurrenceDraftReference,
  ): TemplateStructureDerivationTerm {
    return structuralNodeTerm(this.requiredBrowserNode(state, reference.occurrenceKey, 'derivation output'));
  }

  private browserAttributeTerm(
    state: BrowserEffectiveTemplateState,
    reference: BrowserAttributeOccurrenceDraftReference,
  ): TemplateStructureDerivationTerm {
    const attribute = state.attributeByBrowserOccurrence.get(reference.occurrenceKey) ?? null;
    if (attribute == null) throw new Error(`Browser attribute ${reference.occurrenceKey} has no structural product.`);
    return new TemplateStructureDerivationTerm(structureReference(
      KernelVocabulary.Template.StructuralAttribute.key,
      attribute.productHandle,
      attribute.identityHandle,
      attribute.sourceAddressHandle,
    ));
  }

  private materializeCorrespondenceSeams(state: BrowserEffectiveTemplateState): void {
    state.input.correspondence.unresolvedPartitions.forEach((partition) => {
      const digest = createHash('sha256').update(partition.partitionKey).digest('hex').slice(0, 24);
      const local = `browser-effective:${state.input.localKey}:correspondence-open:${partition.kind}:${digest}`;
      const reasonSources = correspondenceReasonSources(state, partition);
      const addressHandle = reasonSources.find((source) => source.addressHandle != null)?.addressHandle ?? null;
      const seam = new OpenSeam(
        this.store.handles.openSeam(local),
        KernelVocabulary.Template.OpenStructureCorrespondence.key,
        partition.summary,
        addressHandle,
        state.source.evidenceHandle,
        [OpenSeamReasonKind.TemplateStructureCorrespondenceOpen],
        reasonSources,
      );
      state.openSeams.push(seam);
      state.records.push(seam);
    });
  }
}

function authoredAttributeOccurrenceKey(
  nodeOccurrenceKey: string,
  attribute: ParsedHtmlAttributeDraft,
  ordinal: number,
): string {
  return `${nodeOccurrenceKey}/attribute/i:${ordinal}/${attribute.start}:${attribute.end}`;
}

function browserFragmentOccurrenceKey(
  occurrenceIdentityKey: string,
  path: readonly (number | 'template-content')[],
): string {
  return `${occurrenceIdentityKey}/browser-fragment/${encodeBrowserTemplatePath(path)}`;
}

function structuralNodeKind(kind: BrowserTemplateDraftNodeKind): HtmlIrNodeKind {
  switch (kind) {
    case BrowserTemplateDraftNodeKind.Fragment:
      return HtmlIrNodeKind.Fragment;
    case BrowserTemplateDraftNodeKind.Element:
      return HtmlIrNodeKind.Element;
    case BrowserTemplateDraftNodeKind.Text:
      return HtmlIrNodeKind.Text;
    case BrowserTemplateDraftNodeKind.Comment:
      return HtmlIrNodeKind.Comment;
    case BrowserTemplateDraftNodeKind.Doctype:
      return HtmlIrNodeKind.Doctype;
  }
}

function structureReference(
  productKindKey: ConstructorParameters<typeof TemplateStructureReference>[0],
  productHandle: ProductHandle,
  identityHandle: IdentityHandle | null,
  addressHandle: AddressHandle | null,
): TemplateStructureReference {
  return new TemplateStructureReference(productKindKey, productHandle, identityHandle, addressHandle);
}

function structuralNodeTerm(node: BrowserEffectiveTemplateNode): TemplateStructureDerivationTerm {
  return new TemplateStructureDerivationTerm(structureReference(
    KernelVocabulary.Template.StructuralNode.key,
    node.productHandle,
    node.identityHandle,
    node.sourceAddressHandle,
  ));
}

function correspondenceReasonSources(
  state: BrowserEffectiveTemplateState,
  partition: CorrespondenceUnresolvedPartitionDraft,
): readonly OpenSeamReasonSource[] {
  const rows: OpenSeamReasonSource[] = [];
  const append = (summary: string, addressHandle: AddressHandle | null): void => {
    rows.push({
      reasonKind: OpenSeamReasonKind.TemplateStructureCorrespondenceOpen,
      summary,
      addressHandle,
      evidenceHandle: state.source.evidenceHandle,
    });
  };
  for (const node of partition.authoredNodes) append('Authored node candidate.', state.authored.node(node)?.sourceAddressHandle ?? null);
  for (const attribute of partition.authoredAttributes) append('Authored attribute candidate.', state.authored.attribute(attribute)?.sourceAddressHandle ?? null);
  for (const node of partition.browserNodes) append(
    'Browser-effective node candidate.',
    state.nodeByBrowserOccurrence.get(node.occurrenceKey)?.sourceAddressHandle ?? null,
  );
  for (const attribute of partition.browserAttributes) append(
    'Browser-effective attribute candidate.',
    state.attributeByBrowserOccurrence.get(attribute.occurrenceKey)?.sourceAddressHandle ?? null,
  );
  return rows;
}

function browserOccurrenceForPath(
  occurrenceIdentityKey: string,
  browser: BrowserTemplateDraftResult,
  path: readonly (number | 'template-content')[],
): string {
  const target = encodeBrowserTemplatePath(path);
  let found: BrowserTemplateNodeDraft | null = null;
  const visit = (nodes: readonly BrowserTemplateNodeDraft[]): void => {
    for (const node of nodes) {
      if (encodeBrowserTemplatePath(node.path) === target) found = node;
      if (node.nodeKind === BrowserTemplateDraftNodeKind.Element) {
        visit(node.children);
        visit(node.templateContent?.children ?? []);
      }
    }
  };
  visit(browser.fragment.children);
  if (found == null) throw new Error(`Browser path ${target} is not part of the parsed fragment.`);
  return browserNodeOccurrenceKey(occurrenceIdentityKey, found);
}
