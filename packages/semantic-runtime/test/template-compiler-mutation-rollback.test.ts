import { describe, expect, test } from 'vitest';

import { HtmlCommentSemanticKind, HtmlNamespaceKind } from '../src/template/html-ir.js';
import { TemplateCompilerForestMutationAuthority } from '../src/template/template-compiler-mutation-authority.js';
import {
  TemplateCompilerCommentOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerGeneratedOccurrenceRole,
  TemplateCompilerOccurrenceEdgeKind,
  TemplateCompilerOccurrenceForest,
  TemplateCompilerTextOccurrence,
} from '../src/template/template-compiler-occurrence.js';
import { BrowserEffectiveTemplateFixture } from './browser-effective-template-fixture.js';

const Child = TemplateCompilerOccurrenceEdgeKind.Child;
const Root = TemplateCompilerOccurrenceEdgeKind.Root;
const TemplateContent = TemplateCompilerOccurrenceEdgeKind.TemplateContent;

describe('compiler mutation rollback', () => {
  test('restores every owning edge and scalar in place without rewinding the forest epoch', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-rollback-edges');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browser.materialize(
        'root', '<div a="a" b="b"><i></i><b></b>text<!--comment--><template><span></span></template></div><aside c="c"></aside>',
      ).emission);
      const div = element(forest, 'div');
      const aside = element(forest, 'aside');
      const template = element(forest, 'template', forest.compilerCarrier);
      const templateContent = template.templateContent!;
      const italic = element(forest, 'i');
      const bold = element(forest, 'b');
      const text = forest.readNodes().find((node) => node instanceof TemplateCompilerTextOccurrence)!;
      const comment = forest.readNodes().find((node) => node instanceof TemplateCompilerCommentOccurrence)!;
      const attribute = div.readAttributes()[0]!;
      forest.rewriteAttributeValue(attribute, 'previously committed');
      forest.rewriteCharacterData(text, 'previous text');
      const before = forestState(forest);
      const roots = forest.readRoots();
      const children = div.readChildren();
      const attributes = div.readAttributes();
      const scope = forest.beginMutationScope();

      forest.rewriteAttributeValue(attribute, 'attempt one');
      forest.rewriteAttributeValue(attribute, 'attempt two');
      forest.moveAttribute(attribute, aside, 1);
      forest.reorderAttribute(attribute, 0);
      forest.detachAttribute(attribute);
      forest.rewriteCharacterData(text, 'new text');
      forest.rewriteCharacterData(text, 'newer text');
      forest.rewriteCharacterData(comment, 'au');
      forest.reorderNode(bold, 0);
      forest.detachDirectChild(div, 0, bold);
      forest.moveNode(italic, aside, Child, 0);
      forest.detachNode(templateContent);
      forest.insertDetachedNode(templateContent, aside, TemplateContent, 0);
      forest.detachNode(forest.compilerCarrier);
      forest.insertDetachedNode(forest.compilerCarrier, null, Root, 0);
      forest.assertCoherentTopology();
      const attemptedRevision = forest.mutationRevision;
      forest.finishMutationScope(scope, false);

      expect(forestState(forest)).toEqual(before);
      expect(forest.mutationRevision).toBeGreaterThan(attemptedRevision);
      expect(forest.readRoots()).toBe(roots);
      expect(div.readChildren()).toBe(children);
      expect(div.readAttributes()).toBe(attributes);
      expect(template.templateContent).toBe(templateContent);
      expect(attribute.scalarWriteRevision).toBe(1);
      expect(text.scalarWriteRevision).toBe(1);
      expect(comment.scalarWriteRevision).toBe(0);
      expect(comment.semanticKind).toBe(HtmlCommentSemanticKind.Plain);
      forest.assertCoherentTopology();
    } finally {
      browser.dispose();
    }
  });

  test('discards generated inventories and all origin indexes, then permits the abandoned generation tuples again', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-rollback-generation');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browser.materialize(
        'root', '<div title="seed">text<!--comment--></div>',
      ).emission);
      const owner = {};
      const authority = TemplateCompilerForestMutationAuthority.createForExecution(forest, owner);
      const causes = [browser.run.handles.product('compiler-rollback-generation:cause')];
      const div = element(forest, 'div');
      const text = forest.readNodes().find((node) => node instanceof TemplateCompilerTextOccurrence)!;
      const comment = forest.readNodes().find((node) => node instanceof TemplateCompilerCommentOccurrence)!;
      const attribute = div.readAttributes()[0]!;
      const baseline = forestState(forest);
      const nodeInventory = forest.readNodes();
      const attributeInventory = forest.readAttributes();
      const textOrigins = forest.nodesForInputProduct(text.inputReference!.productHandle);
      const attributeOrigins = forest.attributesForInputIdentity(attribute.inputIdentityKey!);
      const batch = authority.beginExecutionBatch(owner, 'root', 'hook', causes, {});
      let ordinal = 0;
      const generation = () => authority.reserveExecutionGeneration(
        owner, batch, TemplateCompilerGeneratedOccurrenceRole.Clone, ordinal++,
      );
      const generatedElement = forest.createGeneratedElement(
        generation(), 'template', HtmlNamespaceKind.Html, 'http://www.w3.org/1999/xhtml', div.inputReference,
      );
      const generatedFragment = forest.createGeneratedFragment(generation(), forest.compilerContent.inputReference);
      const generatedText = forest.createGeneratedText(generation(), 'copy', text.inputReference);
      const generatedComment = forest.createGeneratedComment(
        generation(), 'copy', HtmlCommentSemanticKind.Plain, comment.inputReference,
      );
      const generatedAttribute = forest.createGeneratedAttribute(
        generation(), 'title', 'copy', null, null, attribute.inputReference,
      );
      const originlessText = forest.createGeneratedText(generation(), 'new');
      const originlessAttribute = forest.createGeneratedAttribute(generation(), 'data-new', 'new', null, null);
      forest.insertDetachedNode(generatedElement, div, Child, 0);
      forest.insertDetachedNode(generatedFragment, generatedElement, TemplateContent, 0);
      forest.insertDetachedNode(generatedText, generatedFragment, Child, 0);
      forest.insertDetachedNode(generatedComment, generatedFragment, Child, 1);
      forest.insertDetachedNode(originlessText, generatedFragment, Child, 2);
      forest.insertDetachedAttribute(generatedAttribute, generatedElement, 0);
      forest.insertDetachedAttribute(originlessAttribute, generatedElement, 1);
      forest.moveNode(text, generatedFragment, Child, 3);
      forest.rewriteCharacterData(generatedText, 'changed copy');
      forest.rewriteAttributeValue(generatedAttribute, 'changed copy');
      const abandonedGenerations = authority.readPendingGenerations(batch);
      expect(textOrigins).toHaveLength(2);
      expect(attributeOrigins).toHaveLength(2);
      authority.finishExecutionBatch(owner, batch, false, {});

      expect(forestState(forest)).toEqual(baseline);
      expect(forest.readNodes()).toBe(nodeInventory);
      expect(forest.readAttributes()).toBe(attributeInventory);
      expect(forest.nodesForInputProduct(text.inputReference!.productHandle)).toBe(textOrigins);
      expect(forest.attributesForInputIdentity(attribute.inputIdentityKey!)).toBe(attributeOrigins);
      expect(textOrigins).toHaveLength(1);
      expect(attributeOrigins).toHaveLength(1);
      for (const node of [generatedElement, generatedFragment, generatedText, generatedComment, originlessText]) {
        expect(forest.nodeForOccurrenceKey(node.occurrenceKey)).toBeNull();
        if (node.inputReference != null) {
          expect(forest.nodesForInputProduct(node.inputReference.productHandle)).not.toContain(node);
          expect(forest.nodesForInputIdentity(node.inputReference.identityHandle)).not.toContain(node);
        }
        expect(() => forest.insertDetachedNode(node, div, Child, 0)).toThrow(/belongs to another forest/);
      }
      for (const attr of [generatedAttribute, originlessAttribute]) {
        expect(forest.attributeForOccurrenceKey(attr.occurrenceKey)).toBeNull();
        if (attr.inputReference != null) {
          expect(forest.attributesForInputProduct(attr.inputReference.productHandle)).not.toContain(attr);
          expect(forest.attributesForInputIdentity(attr.inputReference.identityHandle)).not.toContain(attr);
        }
        expect(() => forest.insertDetachedAttribute(attr, div, 0)).toThrow(/belongs to another forest/);
      }
      for (const value of abandonedGenerations) {
        expect(authority.completedBatchForGeneration(value)).toBeNull();
        expect(() => authority.assertRegisteredGeneration(value)).toThrow(/no completed mutation authority/);
      }
      authority.assertGeneratedInventory();
      forest.assertCoherentTopology();

      const retry = authority.beginExecutionBatch(owner, 'root', 'hook', causes, {});
      const retryGeneration = authority.reserveExecutionGeneration(
        owner, retry, TemplateCompilerGeneratedOccurrenceRole.Clone, 0,
      );
      const retryElement = forest.createGeneratedElement(
        retryGeneration, 'template', HtmlNamespaceKind.Html, 'http://www.w3.org/1999/xhtml', div.inputReference,
      );
      expect(retryElement.occurrenceKey).toBe(generatedElement.occurrenceKey);
      expect(retryElement).not.toBe(generatedElement);
      authority.finishExecutionBatch(owner, retry, true, {});
      authority.assertGeneratedInventory();
      expect(forest.nodeForOccurrenceKey(retryElement.occurrenceKey)).toBe(retryElement);
      expect(() => forest.detachNode(generatedElement)).toThrow(/belongs to another forest/);
    } finally {
      browser.dispose();
    }
  });

  test('commits writes durably and an ensuing abort restores the committed baseline', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-rollback-commit');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browser.materialize(
        'root', '<div a="before">before<!--before--><i></i></div>',
      ).emission);
      const owner = {};
      const authority = TemplateCompilerForestMutationAuthority.createForExecution(forest, owner);
      const causes = [browser.run.handles.product('compiler-rollback-commit:cause')];
      const div = element(forest, 'div');
      const attribute = div.readAttributes()[0]!;
      const text = forest.readNodes().find((node) => node instanceof TemplateCompilerTextOccurrence)!;
      const comment = forest.readNodes().find((node) => node instanceof TemplateCompilerCommentOccurrence)!;
      const batch = authority.beginExecutionBatch(owner, 'root', 'commit', causes, {});
      forest.rewriteAttributeValue(attribute, 'committed');
      forest.rewriteCharacterData(text, 'committed');
      forest.rewriteCharacterData(comment, 'au');
      forest.detachNode(element(forest, 'i'));
      authority.finishExecutionBatch(owner, batch, true, {});
      const committed = forestState(forest);
      expect(comment.text).toBe('au');
      expect(comment.semanticKind).toBe(HtmlCommentSemanticKind.Plain);
      expect(text.initialText).toBe('before');
      expect(attribute.initialValue).toBe('before');
      const discarded = authority.beginExecutionBatch(owner, 'root', 'abort', causes, {});
      forest.rewriteAttributeValue(attribute, 'discarded');
      forest.rewriteCharacterData(text, 'discarded');
      forest.rewriteCharacterData(comment, 'discarded');
      authority.finishExecutionBatch(owner, discarded, false, {});
      expect(forestState(forest)).toEqual(committed);
      forest.assertCoherentTopology();
    } finally {
      browser.dispose();
    }
  });

  test('failed atomic moves do not leave duplicate inverses or consume earlier journal entries', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-rollback-failed-move');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browser.materialize(
        'root', '<div a="before"><i></i><b></b></div>',
      ).emission);
      const div = element(forest, 'div');
      const italic = element(forest, 'i');
      const attribute = div.readAttributes()[0]!;
      const before = forestState(forest);
      const scope = forest.beginMutationScope();
      forest.rewriteAttributeValue(attribute, 'temporary');
      expect(() => forest.moveNode(div, italic, Child, 0)).toThrow(/cannot contain its new parent/);
      expect(() => forest.moveAttribute(attribute, italic, 10)).toThrow(/ordinal/);
      expect(() => forest.moveNode(italic, div, Child, 10)).toThrow(/ordinal/);
      forest.finishMutationScope(scope, false);
      expect(forestState(forest)).toEqual(before);
      forest.assertCoherentTopology();
    } finally {
      browser.dispose();
    }
  });

  test('keeps empty aborts current and rejects overlapping, foreign, and completed scopes', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-rollback-scope');
    try {
      const emission = browser.materialize('root', '<div></div>').emission;
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(emission);
      const other = TemplateCompilerOccurrenceForest.fromBrowserEffective(emission);
      const scope = forest.beginMutationScope();
      const foreign = other.beginMutationScope();
      const revision = forest.mutationRevision;
      expect(() => forest.beginMutationScope()).toThrow(/already has a pending mutation scope/);
      expect(() => forest.finishMutationScope(foreign, false)).toThrow(/not pending in this forest/);
      forest.finishMutationScope(scope, false);
      expect(forest.mutationRevision).toBe(revision);
      expect(() => forest.finishMutationScope(scope, true)).toThrow(/not pending in this forest/);
      other.finishMutationScope(foreign, true);
    } finally {
      browser.dispose();
    }
  });

  test('leaves completed normalized replay generations outside a later execution rollback', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-rollback-replay');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browser.materialize('root', '<div></div>').emission);
      const authority = TemplateCompilerForestMutationAuthority.createForNormalizedReplay(forest);
      const causes = [browser.run.handles.product('compiler-rollback-replay:cause')];
      const generation = authority.createStructuralGeneration(
        'root', 'replay', TemplateCompilerGeneratedOccurrenceRole.StaticTextSegment, causes, 0,
      );
      const text = forest.createGeneratedText(generation, 'retained replay');
      forest.insertDetachedNode(text, forest.compilerContent, Child, 1);
      const before = forestState(forest);
      const owner = {};
      authority.claimExecutionOwner(owner);
      const batch = authority.beginExecutionBatch(owner, 'root', 'hook', causes, {});
      forest.rewriteCharacterData(text, 'aborted');
      forest.detachNode(text);
      authority.finishExecutionBatch(owner, batch, false, {});
      expect(forestState(forest)).toEqual(before);
      expect(authority.completedBatchForGeneration(generation)).not.toBeNull();
      authority.assertGeneratedInventory();
      forest.assertCoherentTopology();
    } finally {
      browser.dispose();
    }
  });
});

function element(
  forest: TemplateCompilerOccurrenceForest,
  name: string,
  except: TemplateCompilerElementOccurrence | null = null,
): TemplateCompilerElementOccurrence {
  const value = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
    node instanceof TemplateCompilerElementOccurrence && node.tagName === name && node !== except
  );
  if (value == null) throw new Error(`Expected fixture element '${name}'.`);
  return value;
}

function forestState(forest: TemplateCompilerOccurrenceForest): unknown {
  return {
    roots: forest.readRoots().map((node) => node.occurrenceKey),
    nodes: forest.readNodes().map((node) => ({
      key: node.occurrenceKey,
      parent: node.parent?.occurrenceKey ?? null,
      edge: node.parentEdgeKind,
      ordinal: node.readParentOrdinal(),
      children: node.readChildren().map((child) => child.occurrenceKey),
      content: node instanceof TemplateCompilerElementOccurrence ? node.templateContent?.occurrenceKey ?? null : null,
      attributes: node instanceof TemplateCompilerElementOccurrence ? node.readAttributes().map((attr) => attr.occurrenceKey) : [],
      text: node instanceof TemplateCompilerTextOccurrence || node instanceof TemplateCompilerCommentOccurrence ? node.text : null,
      scalarRevision: node instanceof TemplateCompilerTextOccurrence || node instanceof TemplateCompilerCommentOccurrence
        ? node.scalarWriteRevision : null,
    })),
    attributes: forest.readAttributes().map((attribute) => ({
      key: attribute.occurrenceKey,
      owner: attribute.owner?.occurrenceKey ?? null,
      ordinal: attribute.readOwnerOrdinal(),
      value: attribute.value,
      scalarRevision: attribute.scalarWriteRevision,
    })),
  };
}
