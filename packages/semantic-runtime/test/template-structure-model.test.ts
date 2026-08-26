import { describe, expect, test } from 'vitest';

import { KernelClaimEndpointKind } from '../src/kernel/vocabulary/core.js';
import { KernelHandleFactory, type KernelRecordHandle } from '../src/kernel/handles.js';
import { TemplatePhase } from '../src/kernel/identity.js';
import { MaterializedProduct } from '../src/kernel/materialization.js';
import {
  OpenSeamBoundaryKind,
  OpenSeamReasonKind,
  openSeamBoundaryKindForReason,
} from '../src/kernel/open-seam.js';
import {
  KernelProductDetailReference,
  KernelRecordReference,
  type KernelDetailReferenceClosure,
} from '../src/kernel/detail-references.js';
import { bindProductDetailEnvelope } from '../src/kernel/product-details.js';
import { KernelPublicationDecisionKind } from '../src/kernel/publication-comparison.js';
import { FieldProvenance } from '../src/kernel/provenance.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';
import {
  BrowserTemplateAttributeLocationJoinKind,
  BrowserTemplateDraftAuthority,
  BrowserTemplateDraftLocationKind,
  BrowserTemplateSourceLocation,
} from '../src/template/browser-template-draft.js';
import {
  BrowserTemplateCarrierKind,
  BrowserTemplateCarrierSelectionReason,
} from '../src/template/browser-template-selection.js';
import {
  TemplateSourceKind,
  TemplateSourceReference,
} from '../src/template/compilation-unit.js';
import { TemplateDetailDescriptors } from '../src/template/detail-descriptors.js';
import {
  HtmlIrNodeKind,
  HtmlNamespaceKind,
} from '../src/template/html-ir.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import {
  BrowserEffectiveTemplateAttribute,
  BrowserEffectiveTemplateElement,
  BrowserEffectiveTemplateTree,
  TemplateStructuralAttributeReference,
  TemplateStructuralNodeReference,
  TemplateStructuralTreeReference,
} from '../src/template/template-structure.js';
import {
  TemplateStructureDerivation,
  TemplateStructureDerivationAuthority,
  TemplateStructureDerivationTerm,
  TemplateStructureReference,
} from '../src/template/template-structure-derivation.js';

describe('template structural model', () => {
  test('registers distinct structural products and directional claim signatures', () => {
    expect(TemplateDetailDescriptors.StructuralTree.productKindKey)
      .toBe(KernelVocabulary.Template.StructuralTree.key);
    expect(TemplateDetailDescriptors.StructuralNode.productKindKey)
      .toBe(KernelVocabulary.Template.StructuralNode.key);
    expect(TemplateDetailDescriptors.StructuralAttribute.productKindKey)
      .toBe(KernelVocabulary.Template.StructuralAttribute.key);
    expect(TemplateDetailDescriptors.StructureDerivation.productKindKey)
      .toBe(KernelVocabulary.Template.StructureDerivation.key);
    expect(KernelVocabulary.Template.OpenStructureCorrespondence.key)
      .toBe('template.open-structure-correspondence');
    expect(openSeamBoundaryKindForReason(OpenSeamReasonKind.TemplateStructureCorrespondenceOpen))
      .toBe(OpenSeamBoundaryKind.FrameworkSemanticBoundary);

    expect(KernelVocabulary.Template.ParsesToStructuralTree.claimSignature?.subject.productKinds)
      .toEqual([KernelVocabulary.Template.Source.key]);
    expect(KernelVocabulary.Template.ParsesToStructuralTree.claimSignature?.object.productKinds)
      .toEqual([KernelVocabulary.Template.StructuralTree.key]);
    expect(KernelVocabulary.Template.ContainsStructuralNode.claimSignature?.subject.productKinds)
      .toEqual([
        KernelVocabulary.Template.StructuralTree.key,
        KernelVocabulary.Template.StructuralNode.key,
      ]);
    expect(KernelVocabulary.Template.HasStructuralTemplateContent.claimSignature?.object.productKinds)
      .toEqual([KernelVocabulary.Template.StructuralNode.key]);
    expect(KernelVocabulary.Template.StructureDerivationConsumes.claimSignature?.object.productKinds)
      .toContain(KernelVocabulary.Template.HtmlNode.key);
    expect(KernelVocabulary.Template.StructureDerivationProduces.claimSignature?.object.productKinds)
      .toEqual([
        KernelVocabulary.Template.StructuralTree.key,
        KernelVocabulary.Template.StructuralNode.key,
        KernelVocabulary.Template.StructuralAttribute.key,
      ]);
    expect(KernelVocabulary.Template.StructureDerivationCausedBy.claimSignature?.object.endpointKinds)
      .toEqual([
        KernelClaimEndpointKind.Address,
        KernelClaimEndpointKind.Identity,
        KernelClaimEndpointKind.Product,
      ]);
  });

  test('projects tree, node, attribute, template-content, and provenance references exactly', () => {
    const handles = new KernelHandleFactory('template-structural-products');
    const tree = new TemplateStructuralTreeReference(
      handles.product('tree'),
      handles.identity('tree'),
      handles.address('template'),
    );
    const input = nodeReference(handles, tree, 'input', HtmlIrNodeKind.Fragment);
    const carrier = nodeReference(handles, tree, 'carrier', HtmlIrNodeKind.Element);
    const content = nodeReference(handles, tree, 'content', HtmlIrNodeKind.Fragment);
    const discarded = nodeReference(handles, tree, 'discarded', HtmlIrNodeKind.Comment);
    const child = nodeReference(handles, tree, 'child', HtmlIrNodeKind.Text);
    const attribute = new TemplateStructuralAttributeReference(
      tree.productHandle,
      handles.product('attribute'),
      handles.identity('attribute'),
      handles.address('attribute'),
      'viewBox',
    );
    const source = new TemplateSourceReference(
      handles.product('source'),
      handles.identity('source'),
      TemplateSourceKind.Markup,
      TemplatePhase.Authored,
      handles.address('template-source'),
      handles.address('source-span'),
    );
    const treeProvenance = handles.provenance('tree-field');
    const treeDetail = new BrowserEffectiveTemplateTree(
      source,
      new BrowserTemplateDraftAuthority('parse5', '8.0.1', 'html-template-fragment', false),
      input,
      BrowserTemplateCarrierKind.AuthoredTemplate,
      BrowserTemplateCarrierSelectionReason.SelectedTemplate,
      carrier,
      carrier,
      content,
      [discarded],
      [new FieldProvenance('compilerContent', treeProvenance)],
    );
    const treeReferences = TemplateProductDetails.StructuralTree.referencesFor(treeDetail);

    expectProductDetails(treeReferences, [
      [TemplateDetailDescriptors.Source.detailKind, source.productHandle],
      [TemplateDetailDescriptors.StructuralNode.detailKind, input.productHandle],
      [TemplateDetailDescriptors.StructuralNode.detailKind, carrier.productHandle],
      [TemplateDetailDescriptors.StructuralNode.detailKind, content.productHandle],
      [TemplateDetailDescriptors.StructuralNode.detailKind, discarded.productHandle],
    ]);
    expectRecord(treeReferences, source.templateAddressHandle);
    expectRecord(treeReferences, treeProvenance);

    const generatedWrapper = nodeReference(handles, tree, 'generated-wrapper', HtmlIrNodeKind.Element);
    const wrappedTree = new BrowserEffectiveTemplateTree(
      source,
      treeDetail.parserAuthority,
      input,
      BrowserTemplateCarrierKind.SynthesizedWrapper,
      BrowserTemplateCarrierSelectionReason.FirstElementNotHtmlTemplate,
      generatedWrapper,
      null,
      input,
      [],
    );
    expectProductDetails(TemplateProductDetails.StructuralTree.referencesFor(wrappedTree), [
      [TemplateDetailDescriptors.Source.detailKind, source.productHandle],
      [TemplateDetailDescriptors.StructuralNode.detailKind, input.productHandle],
      [TemplateDetailDescriptors.StructuralNode.detailKind, generatedWrapper.productHandle],
    ]);

    const nodeProvenance = handles.provenance('node-field');
    const location = new BrowserTemplateSourceLocation(1, 1, 0, 1, 6, 5);
    const element = new BrowserEffectiveTemplateElement(
      tree,
      'svg',
      HtmlNamespaceKind.Svg,
      'http://www.w3.org/2000/svg',
      [attribute],
      [child],
      content,
      BrowserTemplateDraftLocationKind.ParserLocated,
      location,
      location,
      null,
      [new FieldProvenance('children', nodeProvenance)],
    );
    const nodeReferences = TemplateProductDetails.StructuralNode.referencesFor(element);
    expectProductDetails(nodeReferences, [
      [TemplateDetailDescriptors.StructuralTree.detailKind, tree.productHandle],
      [TemplateDetailDescriptors.StructuralAttribute.detailKind, attribute.productHandle],
      [TemplateDetailDescriptors.StructuralNode.detailKind, child.productHandle],
      [TemplateDetailDescriptors.StructuralNode.detailKind, content.productHandle],
    ]);
    expectRecord(nodeReferences, nodeProvenance);

    const attributeProvenance = handles.provenance('attribute-field');
    const attributeDetail = new BrowserEffectiveTemplateAttribute(
      tree,
      carrier,
      'viewBox',
      '0 0 1 1',
      null,
      null,
      BrowserTemplateAttributeLocationJoinKind.OrdinalAdjustedName,
      'viewbox',
      'viewbox',
      location,
      [new FieldProvenance('name', attributeProvenance)],
    );
    const attributeReferences = TemplateProductDetails.StructuralAttribute.referencesFor(attributeDetail);
    expectProductDetails(attributeReferences, [
      [TemplateDetailDescriptors.StructuralTree.detailKind, tree.productHandle],
      [TemplateDetailDescriptors.StructuralNode.detailKind, carrier.productHandle],
    ]);
    expectRecord(attributeReferences, attributeProvenance);
    expect('appendChild' in element).toBe(false);
    expect('removeAttribute' in attributeDetail).toBe(false);
  });

  test('keeps ordered hyperedge terms while projecting authored, structural, segment, and cause references', () => {
    const handles = new KernelHandleFactory('template-structure-derivation');
    const first = new TemplateStructureReference(
      KernelVocabulary.Template.HtmlNode.key,
      handles.product('authored-first'),
      handles.identity('authored-first'),
      handles.address('authored-first'),
    );
    const second = new TemplateStructureReference(
      KernelVocabulary.Template.HtmlNode.key,
      handles.product('authored-second'),
      handles.identity('authored-second'),
      handles.address('authored-second'),
    );
    const output = new TemplateStructureReference(
      KernelVocabulary.Template.StructuralNode.key,
      handles.product('effective-text'),
      handles.identity('effective-text'),
      handles.address('effective-text'),
    );
    const firstSegment = handles.address('first-segment');
    const secondSegment = handles.address('second-segment');
    const instructionCause = handles.product('instruction-cause');
    const identityCause = handles.identity('effect-cause');
    const provenance = handles.provenance('derivation-field');
    const derivation = new TemplateStructureDerivation(
      TemplateStructureDerivationAuthority.HtmlTreeBuilder,
      [
        new TemplateStructureDerivationTerm(first, firstSegment),
        new TemplateStructureDerivationTerm(second, secondSegment),
      ],
      [new TemplateStructureDerivationTerm(output)],
      [instructionCause, identityCause],
      [new FieldProvenance('inputs', provenance)],
    );

    expect(derivation.inputs.map((term) => term.structure.productHandle)).toEqual([
      first.productHandle,
      second.productHandle,
    ]);
    const references = TemplateProductDetails.StructureDerivation.referencesFor(derivation);
    expectProductDetails(references, [
      [TemplateDetailDescriptors.HtmlNode.detailKind, first.productHandle],
      [TemplateDetailDescriptors.HtmlNode.detailKind, second.productHandle],
      [TemplateDetailDescriptors.StructuralNode.detailKind, output.productHandle],
    ]);
    for (const handle of [firstSegment, secondSegment, instructionCause, identityCause, provenance]) {
      expectRecord(references, handle);
    }

    const invalid = new TemplateStructureDerivation(
      TemplateStructureDerivationAuthority.TemplateCompiler,
      [new TemplateStructureDerivationTerm(new TemplateStructureReference(
        KernelVocabulary.Configuration.AppRoot.key,
        handles.product('not-structure'),
        null,
        null,
      ))],
      [],
      [],
    );
    expect(() => TemplateProductDetails.StructureDerivation.referencesFor(invalid))
      .toThrow('references non-structural product kind');
  });

  test('compares structural semantics separately from parser and source witnesses', () => {
    const handles = new KernelHandleFactory('template-structure-comparison');
    const context = { compareRecordHandles: () => KernelPublicationDecisionKind.Retain } as const;
    const treeReference = new TemplateStructuralTreeReference(
      handles.product('tree'),
      handles.identity('tree'),
      handles.address('tree-address'),
    );
    const input = nodeReference(handles, treeReference, 'input', HtmlIrNodeKind.Fragment);
    const content = nodeReference(handles, treeReference, 'content', HtmlIrNodeKind.Fragment);
    const carrier = nodeReference(handles, treeReference, 'carrier', HtmlIrNodeKind.Element);
    const source = new TemplateSourceReference(
      handles.product('source'),
      handles.identity('source'),
      TemplateSourceKind.Markup,
      TemplatePhase.Authored,
      handles.address('template-source'),
      handles.address('source-address'),
    );
    const tree = (
      parserVersion: string,
      addressKey: string,
    ) => bindDetail(
      new BrowserEffectiveTemplateTree(
        source,
        new BrowserTemplateDraftAuthority('parse5', parserVersion, 'html-template-fragment', false),
        input,
        BrowserTemplateCarrierKind.AuthoredTemplate,
        BrowserTemplateCarrierSelectionReason.SelectedTemplate,
        carrier,
        carrier,
        content,
        [],
      ),
      handles,
      'tree',
      KernelVocabulary.Template.StructuralTree.key,
      addressKey,
    );
    expect(TemplateProductDetails.StructuralTree.compare(tree('8.0.1', 'tree-a'), tree('8.0.1', 'tree-a'), context))
      .toBe(KernelPublicationDecisionKind.Retain);
    expect(TemplateProductDetails.StructuralTree.compare(tree('8.0.1', 'tree-a'), tree('8.0.1', 'tree-b'), context))
      .toBe(KernelPublicationDecisionKind.RefreshWitness);
    expect(TemplateProductDetails.StructuralTree.compare(tree('8.0.1', 'tree-a'), tree('8.1.0', 'tree-a'), context))
      .toBe(KernelPublicationDecisionKind.Replace);

    const located = (endOffset: number) => new BrowserTemplateSourceLocation(1, 1, 0, 1, endOffset + 1, endOffset);
    const node = (
      tagName: string,
      location: BrowserTemplateSourceLocation,
    ) => bindDetail(
      new BrowserEffectiveTemplateElement(
        treeReference,
        tagName,
        HtmlNamespaceKind.Html,
        'http://www.w3.org/1999/xhtml',
        [],
        [],
        null,
        BrowserTemplateDraftLocationKind.ParserLocated,
        location,
        location,
        null,
      ),
      handles,
      'node',
      KernelVocabulary.Template.StructuralNode.key,
      'node-address',
    );
    expect(TemplateProductDetails.StructuralNode.compare(node('div', located(5)), node('div', located(5)), context))
      .toBe(KernelPublicationDecisionKind.Retain);
    expect(TemplateProductDetails.StructuralNode.compare(node('div', located(5)), node('div', located(6)), context))
      .toBe(KernelPublicationDecisionKind.RefreshWitness);
    expect(TemplateProductDetails.StructuralNode.compare(node('div', located(5)), node('span', located(5)), context))
      .toBe(KernelPublicationDecisionKind.Replace);

    const attribute = (
      value: string,
      locationKey: string,
    ) => bindDetail(
      new BrowserEffectiveTemplateAttribute(
        treeReference,
        carrier,
        'title',
        value,
        null,
        null,
        BrowserTemplateAttributeLocationJoinKind.OrdinalExactName,
        locationKey,
        'title',
        located(5),
      ),
      handles,
      'attribute-detail',
      KernelVocabulary.Template.StructuralAttribute.key,
      'attribute-address',
    );
    expect(TemplateProductDetails.StructuralAttribute.compare(attribute('x', 'title'), attribute('x', 'title'), context))
      .toBe(KernelPublicationDecisionKind.Retain);
    expect(TemplateProductDetails.StructuralAttribute.compare(attribute('x', 'title'), attribute('x', 'TITLE'), context))
      .toBe(KernelPublicationDecisionKind.RefreshWitness);
    expect(TemplateProductDetails.StructuralAttribute.compare(attribute('x', 'title'), attribute('y', 'title'), context))
      .toBe(KernelPublicationDecisionKind.Replace);

    const authored = new TemplateStructureReference(
      KernelVocabulary.Template.HtmlNode.key,
      handles.product('authored'),
      handles.identity('authored'),
      handles.address('authored'),
    );
    const effective = new TemplateStructureReference(
      KernelVocabulary.Template.StructuralNode.key,
      handles.product('effective'),
      handles.identity('effective'),
      handles.address('effective'),
    );
    const derivation = (
      authority: TemplateStructureDerivationAuthority,
      segmentKey: string,
      cause: KernelRecordHandle,
    ) => bindDetail(
      new TemplateStructureDerivation(
        authority,
        [new TemplateStructureDerivationTerm(authored, handles.address(segmentKey))],
        [new TemplateStructureDerivationTerm(effective)],
        [cause],
      ),
      handles,
      'derivation',
      KernelVocabulary.Template.StructureDerivation.key,
      'derivation-address',
    );
    const cause = handles.product('cause');
    expect(TemplateProductDetails.StructureDerivation.compare(
      derivation(TemplateStructureDerivationAuthority.HtmlTreeBuilder, 'segment-a', cause),
      derivation(TemplateStructureDerivationAuthority.HtmlTreeBuilder, 'segment-a', cause),
      context,
    )).toBe(KernelPublicationDecisionKind.Retain);
    expect(TemplateProductDetails.StructureDerivation.compare(
      derivation(TemplateStructureDerivationAuthority.HtmlTreeBuilder, 'segment-a', cause),
      derivation(TemplateStructureDerivationAuthority.HtmlTreeBuilder, 'segment-b', cause),
      context,
    )).toBe(KernelPublicationDecisionKind.RefreshWitness);
    expect(TemplateProductDetails.StructureDerivation.compare(
      derivation(TemplateStructureDerivationAuthority.HtmlTreeBuilder, 'segment-a', cause),
      derivation(TemplateStructureDerivationAuthority.TemplateCompiler, 'segment-a', cause),
      context,
    )).toBe(KernelPublicationDecisionKind.Replace);
    expect(TemplateProductDetails.StructureDerivation.compare(
      derivation(TemplateStructureDerivationAuthority.HtmlTreeBuilder, 'segment-a', cause),
      derivation(TemplateStructureDerivationAuthority.HtmlTreeBuilder, 'segment-a', handles.product('other-cause')),
      context,
    )).toBe(KernelPublicationDecisionKind.Replace);
  });
});

function nodeReference(
  handles: KernelHandleFactory,
  tree: TemplateStructuralTreeReference,
  key: string,
  nodeKind: HtmlIrNodeKind,
): TemplateStructuralNodeReference {
  return new TemplateStructuralNodeReference(
    tree.productHandle,
    nodeKind,
    handles.product(key),
    handles.identity(key),
    handles.address(key),
  );
}

function expectProductDetails(
  references: KernelDetailReferenceClosure,
  expected: readonly (readonly [detailKind: string, productHandle: string])[],
): void {
  const actual = references
    .filter((reference): reference is KernelProductDetailReference =>
      reference instanceof KernelProductDetailReference
    )
    .map((reference) => [reference.detailKind, reference.handle] as const)
    .sort(([leftKind, leftHandle], [rightKind, rightHandle]) =>
      leftKind.localeCompare(rightKind) || leftHandle.localeCompare(rightHandle)
    );
  expect(actual).toEqual([...expected].sort(([leftKind, leftHandle], [rightKind, rightHandle]) =>
    leftKind.localeCompare(rightKind) || leftHandle.localeCompare(rightHandle)
  ));
}

function expectRecord(
  references: KernelDetailReferenceClosure,
  handle: KernelRecordHandle,
): void {
  expect(references.some((reference) =>
    reference instanceof KernelRecordReference && reference.handle === handle
  )).toBe(true);
}

function bindDetail<TDetail extends object>(
  detail: TDetail,
  handles: KernelHandleFactory,
  key: string,
  productKindKey: ConstructorParameters<typeof MaterializedProduct>[1],
  addressKey: string,
): TDetail {
  return bindProductDetailEnvelope(detail, new MaterializedProduct(
    handles.product(key),
    productKindKey,
    handles.identity(key),
    handles.address(addressKey),
    handles.provenance(`${key}-provenance`),
  ));
}
