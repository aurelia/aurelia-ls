import { describe, expect, test, vi } from 'vitest';

import type { ProductHandle } from '../src/kernel/handles.js';
import { BrowserTemplateCarrierKind } from '../src/template/browser-template-selection.js';
import { HtmlCommentSemanticKind, HtmlIrNodeKind } from '../src/template/html-ir.js';
import {
  TemplateCompilerCommentOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerFragmentOccurrence,
  TemplateCompilerOccurrenceEdgeKind,
  TemplateCompilerOccurrenceForest,
  TemplateCompilerTextOccurrence,
} from '../src/template/template-compiler-occurrence.js';
import type {
  BrowserEffectiveTemplateAttribute,
  BrowserEffectiveTemplateNode,
  TemplateStructuralNodeReference,
} from '../src/template/template-structure.js';
import {
  browserEffectiveTemplateCases,
  BrowserEffectiveTemplateFixture,
} from './browser-effective-template-fixture.js';

describe('template compiler occurrence forest', () => {
  test('seeds the exact compiler-carrier graph across browser recovery and carrier selection cases', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-occurrence-batch');

    try {
      for (const [key, markup] of browserEffectiveTemplateCases) {
        const { emission } = fixture.materialize(key, markup);
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(emission);
        const reachable = readReachableInput(emission.nodes, emission.attributes, emission.tree.compilerCarrier);

        expect(forest.readRoots(), key).toEqual([forest.compilerCarrier]);
        expect(forest.compilerCarrier.parent, key).toBeNull();
        expect(forest.compilerCarrier.parentEdgeKind, key).toBe(TemplateCompilerOccurrenceEdgeKind.Root);
        expect(forest.compilerCarrier.templateContent, key).toBe(forest.compilerContent);
        expect(forest.readNodes().map((node) => node.inputReference.productHandle), key)
          .toEqual(reachable.nodeProducts);
        expect(forest.readAttributes().map((attribute) => attribute.inputReference.productHandle), key)
          .toEqual(reachable.attributeProducts);

        for (const node of forest.readNodes()) {
          expect(forest.ownerDocumentFor(node), key).toBe(
            node === forest.compilerCarrier && emission.tree.carrierKind === BrowserTemplateCarrierKind.SynthesizedWrapper
              ? 'platform'
              : 'template-contents',
          );
          expect(forest.nodeForOccurrenceKey(node.occurrenceKey), key).toBe(node);
          expect(forest.nodesForInputProduct(node.inputReference!.productHandle), key).toEqual([node]);
          expect(forest.nodesForInputIdentity(node.inputIdentityKey!), key).toEqual([node]);
          expect(node.readParentOrdinal(), key).toBeGreaterThanOrEqual(0);
        }
        for (const attribute of forest.readAttributes()) {
          expect(forest.attributeForOccurrenceKey(attribute.occurrenceKey), key).toBe(attribute);
          expect(forest.attributesForInputProduct(attribute.inputReference!.productHandle), key).toEqual([attribute]);
          expect(forest.attributesForInputIdentity(attribute.inputIdentityKey!), key).toEqual([attribute]);
          const owner = attribute.owner;
          const ordinal = attribute.readOwnerOrdinal();
          expect(owner, key).not.toBeNull();
          expect(ordinal, key).not.toBeNull();
          expect(owner?.readAttributes()[ordinal!], key).toBe(attribute);
        }

        const discarded = new Set(emission.tree.discardedInputNodes.map((node) => node.productHandle));
        expect(forest.readNodes().some((node) => discarded.has(node.inputReference.productHandle)), key).toBe(false);
      }
    } finally {
      fixture.dispose();
    }
  });

  test('preserves explicit template content, plain authored comments, and independent mutable sessions', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-occurrence-isolation');

    try {
      const nested = fixture.materialize(
        'nested',
        '<template><template><span title="x">before<!--au-->after</span></template></template>',
      ).emission;
      const first = TemplateCompilerOccurrenceForest.fromBrowserEffective(nested);
      const second = TemplateCompilerOccurrenceForest.fromBrowserEffective(nested);
      const elements = first.readNodes().filter((node) => node instanceof TemplateCompilerElementOccurrence);
      const fragments = first.readNodes().filter((node) => node instanceof TemplateCompilerFragmentOccurrence);
      const comments = first.readNodes().filter((node) => node instanceof TemplateCompilerCommentOccurrence);
      const firstText = first.readNodes().find((node): node is TemplateCompilerTextOccurrence =>
        node instanceof TemplateCompilerTextOccurrence && node.text === 'before'
      );
      const secondText = second.nodesForInputProduct(firstText?.inputReference?.productHandle as ProductHandle)[0];
      const firstTitle = first.readAttributes().find((attribute) => attribute.name === 'title');
      const secondTitle = firstTitle?.inputReference == null
        ? null
        : second.attributesForInputProduct(firstTitle.inputReference.productHandle)[0] ?? null;

      expect(elements.filter((element) => element.tagName === 'template')).toHaveLength(2);
      expect(elements.filter((element) => element.tagName === 'template').every((element) =>
        element.readChildren().length === 0
        && element.templateContent instanceof TemplateCompilerFragmentOccurrence
      )).toBe(true);
      expect(fragments.every((fragment) =>
        fragment.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.TemplateContent
        || fragment.parent instanceof TemplateCompilerElementOccurrence
      )).toBe(true);
      expect(comments).toEqual([
        expect.objectContaining({ text: 'au', semanticKind: HtmlCommentSemanticKind.Plain }),
      ]);
      if (firstText == null || !(secondText instanceof TemplateCompilerTextOccurrence)) {
        throw new Error('Expected the same input text in two compiler occurrence sessions.');
      }
      const firstTextParent = firstText.parent;
      const firstTextOrdinal = firstText.readParentOrdinal();
      if (firstTextParent == null || firstTextOrdinal == null) throw new Error('Expected an owned compiler text occurrence.');
      first.detachNode(firstText);
      expect(secondText.text).toBe('before');
      expect(nested.nodes.find((node) => node.productHandle === firstText.inputReference!.productHandle))
        .toEqual(expect.objectContaining({ nodeKind: HtmlIrNodeKind.Text, text: 'before' }));
      expect(firstText.parentEdgeKind).toBe(TemplateCompilerOccurrenceEdgeKind.Detached);
      expect(firstText).not.toBe(secondText);
      if (firstTitle == null || secondTitle == null) throw new Error('Expected isolated title attributes.');
      first.rewriteAttributeValue(firstTitle, 'changed');
      expect(firstTitle.initialValue).toBe('x');
      expect(firstTitle.value).toBe('changed');
      expect(secondTitle.value).toBe('x');
      first.insertDetachedNode(
        firstText,
        firstTextParent,
        TemplateCompilerOccurrenceEdgeKind.Child,
        firstTextOrdinal,
      );
      first.assertCoherentTopology();
    } finally {
      fixture.dispose();
    }
  });

  test('moves and detaches through forest-owned edges while retaining historical origin lookup', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-occurrence-mutations');

    try {
      const emission = fixture.materialize(
        'moves',
        '<section><div id="left" data-x="1"><i></i><b></b></div><div id="right"><u></u></div></section>',
      ).emission;
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(emission);
      const other = TemplateCompilerOccurrenceForest.fromBrowserEffective(emission);
      const divs = forest.readNodes().filter((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence && node.tagName === 'div'
      );
      const left = divs[0];
      const right = divs[1];
      if (left == null || right == null) throw new Error('Expected two compiler div occurrences.');
      const bold = left.readChildren().find((node) =>
        node instanceof TemplateCompilerElementOccurrence && node.tagName === 'b'
      );
      const dataX = left.readAttributes().find((attribute) => attribute.name === 'data-x');
      if (bold == null || dataX == null) throw new Error('Expected movable child and attribute occurrences.');
      const boldKey = bold.occurrenceKey;
      const boldOrigin = bold.inputReference?.productHandle;
      const attributeOrigin = dataX.inputReference?.productHandle;

      forest.moveNode(bold, right, TemplateCompilerOccurrenceEdgeKind.Child, right.readChildren().length);
      expect(bold.occurrenceKey).toBe(boldKey);
      expect(bold.parent).toBe(right);
      expect(bold.readParentOrdinal()).toBe(1);
      expect(left.readChildren().some((node) => node === bold)).toBe(false);
      expect(right.readChildren()[1]).toBe(bold);
      expect(forest.nodesForInputProduct(boldOrigin!)).toEqual([bold]);
      forest.detachNode(bold);
      expect(bold.parent).toBeNull();
      expect(bold.parentEdgeKind).toBe(TemplateCompilerOccurrenceEdgeKind.Detached);
      expect(bold.readParentOrdinal()).toBeNull();
      expect(forest.nodesForInputProduct(boldOrigin!)).toEqual([bold]);
      forest.insertDetachedNode(bold, right, TemplateCompilerOccurrenceEdgeKind.Child, 1);
      expect(right.readChildren()[1]).toBe(bold);

      forest.detachAttribute(dataX);
      expect(dataX.owner).toBeNull();
      expect(dataX.readOwnerOrdinal()).toBeNull();
      expect(forest.attributesForInputProduct(attributeOrigin!)).toEqual([dataX]);
      forest.insertDetachedAttribute(dataX, right, right.readAttributes().length);
      expect(dataX.owner).toBe(right);
      expect(right.readAttributes().at(-1)).toBe(dataX);
      expect(() => forest.moveAttribute(dataX, left, 99)).toThrow(/expected 0/);
      expect(dataX.owner).toBe(right);
      expect(right.readAttributes().at(-1)).toBe(dataX);

      expect(() => forest.moveNode(
        other.compilerContent,
        left,
        TemplateCompilerOccurrenceEdgeKind.Child,
        0,
      )).toThrow(/belongs to another forest/);
      forest.assertCoherentTopology();
      other.assertCoherentTopology();
    } finally {
      fixture.dispose();
    }
  });

  test('detaches caller-proven direct child slots without ordinal rediscovery', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-occurrence-direct-child');
    const readParentOrdinal = vi.spyOn(TemplateCompilerElementOccurrence.prototype, 'readParentOrdinal');
    try {
      const markup = `<div>${Array.from({ length: 256 }, (_, ordinal) => `<i data-n="${ordinal}"></i>`).join('')}</div>`;
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(
        fixture.materialize('wide', markup).emission,
      );
      const parent = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence && node.tagName === 'div'
      );
      if (parent == null) throw new Error('Expected wide direct-child parent.');
      const children = [...parent.readChildren()];
      const startRevision = forest.mutationRevision;
      readParentOrdinal.mockClear();

      expect(() => forest.detachDirectChild(parent, 1, children[0]!)).toThrow(/not live/);
      for (let ordinal = children.length - 1; ordinal >= 0; ordinal--) {
        forest.detachDirectChild(parent, ordinal, children[ordinal]!);
      }

      expect(parent.readChildren()).toEqual([]);
      expect(forest.mutationRevision).toBe(startRevision + children.length);
      expect(children.every((child) =>
        child.parent == null && child.parentEdgeKind === TemplateCompilerOccurrenceEdgeKind.Detached
      )).toBe(true);
      expect(readParentOrdinal).not.toHaveBeenCalled();
      forest.assertCoherentTopology();
    } finally {
      readParentOrdinal.mockRestore();
      fixture.dispose();
    }
  });

  test('adopts projected subtrees but keeps retained template contents inert and detached documents stable', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-occurrence-documents');
    try {
      const emission = fixture.materialize(
        'documents',
        '<section><article au-slot="named"><span>projected</span><template if.bind="keep"><b>retained</b></template></article><aside></aside></section>',
      ).emission;
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(emission);
      const other = TemplateCompilerOccurrenceForest.fromBrowserEffective(emission);
      const element = (name: string) => forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence && node.tagName === name && node !== forest.compilerCarrier
      )!;
      const article = element('article');
      const span = element('span');
      const template = element('template');
      const aside = element('aside');
      const content = template.templateContent!;
      const bold = element('b');
      const projectedText = span.readChildren()[0]!;
      const retainedText = bold.readChildren()[0]!;
      const originalParent = article.parent;
      const originalOrdinal = article.readParentOrdinal();
      const revision = forest.mutationRevision;

      const changes = forest.adoptNodeDocument(article, 'platform');
      expect(changes).toEqual([article, span, projectedText, template].map((node) => ({
        node, previousDocument: 'template-contents', nextDocument: 'platform',
      })));
      expect(forest.mutationRevision).toBe(revision + changes.length);
      expect(article.parent).toBe(originalParent);
      expect(article.readParentOrdinal()).toBe(originalOrdinal);
      expect(forest.ownerDocumentFor(content)).toBe('template-contents');
      expect(forest.ownerDocumentFor(bold)).toBe('template-contents');

      forest.detachNode(article);
      expect(forest.ownerDocumentFor(article)).toBe('platform');
      expect(forest.ownerDocumentFor(projectedText)).toBe('platform');
      const beforeInsert = forest.mutationRevision;
      forest.insertDetachedNode(article, aside, TemplateCompilerOccurrenceEdgeKind.Child, 0);
      expect(forest.mutationRevision).toBe(beforeInsert + 1);
      expect(forest.ownerDocumentFor(article)).toBe('template-contents');
      expect(forest.ownerDocumentFor(projectedText)).toBe('template-contents');

      // CompilationContext.h explicitly adopts generated content. Same-document host adoption does not undo it.
      forest.adoptNodeDocument(content, 'platform');
      const beforeNoop = forest.mutationRevision;
      expect(forest.adoptNodeDocument(article, 'template-contents')).toEqual([]);
      expect(forest.mutationRevision).toBe(beforeNoop);
      expect(forest.ownerDocumentFor(content)).toBe('platform');
      expect(forest.ownerDocumentFor(retainedText)).toBe('platform');

      // A genuinely cross-document host adoption does run HTML template adopting steps after ordinary descendants.
      expect(forest.adoptNodeDocument(article, 'platform')).toEqual([
        ...[article, span, projectedText, template].map((node) => ({
          node, previousDocument: 'template-contents', nextDocument: 'platform',
        })),
        ...[content, bold, retainedText].map((node) => ({
          node, previousDocument: 'platform', nextDocument: 'template-contents',
        })),
      ]);
      expect(() => forest.ownerDocumentFor(other.compilerContent)).toThrow(/belongs to another forest/);
      expect(() => forest.adoptNodeDocument(other.compilerContent, 'platform')).toThrow(/belongs to another forest/);
      forest.assertCoherentTopology();
    } finally {
      fixture.dispose();
    }
  });
});

function readReachableInput(
  nodes: readonly BrowserEffectiveTemplateNode[],
  attributes: readonly BrowserEffectiveTemplateAttribute[],
  carrier: TemplateStructuralNodeReference,
): { readonly nodeProducts: readonly ProductHandle[]; readonly attributeProducts: readonly ProductHandle[] } {
  const nodeByProduct = new Map(nodes.map((node) => [node.productHandle, node]));
  const attributeByProduct = new Map(attributes.map((attribute) => [attribute.productHandle, attribute]));
  const nodeProducts: ProductHandle[] = [];
  const attributeProducts: ProductHandle[] = [];

  const visit = (reference: TemplateStructuralNodeReference): void => {
    const node = nodeByProduct.get(reference.productHandle);
    if (node == null) throw new Error(`Missing browser-effective node ${reference.productHandle}.`);
    nodeProducts.push(node.productHandle);
    switch (node.nodeKind) {
      case HtmlIrNodeKind.Fragment:
        node.children.forEach(visit);
        return;
      case HtmlIrNodeKind.Element:
        for (const attributeReference of node.attributes) {
          const attribute = attributeByProduct.get(attributeReference.productHandle);
          if (attribute == null) throw new Error(`Missing browser-effective attribute ${attributeReference.productHandle}.`);
          attributeProducts.push(attribute.productHandle);
        }
        node.children.forEach(visit);
        if (node.templateContent != null) visit(node.templateContent);
        return;
      case HtmlIrNodeKind.Text:
      case HtmlIrNodeKind.Comment:
      case HtmlIrNodeKind.Doctype:
        return;
    }
  };

  visit(carrier);
  return { nodeProducts, attributeProducts };
}
