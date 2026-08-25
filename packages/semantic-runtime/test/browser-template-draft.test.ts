import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  BrowserTemplateAttributeLocationJoinKind,
  BrowserTemplateDraftLocationKind,
  BrowserTemplateDraftNodeKind,
  BrowserTemplateElementDraft,
  type BrowserTemplateNodeDraft,
  BrowserTemplateTextDraft,
  browserTemplateStructure,
} from '../src/template/browser-template-draft.js';
import {
  BROWSER_TEMPLATE_DRAFT_PARSE5_VERSION,
  parseBrowserTemplateFragmentDraft,
} from '../src/template/browser-template-parser.js';
import {
  BrowserTemplateCarrierKind,
  BrowserTemplateCarrierSelectionReason,
  selectBrowserTemplateCompilerCarrier,
} from '../src/template/browser-template-selection.js';
import { HtmlNamespaceKind } from '../src/template/html-ir.js';

const htmlNamespace = 'http://www.w3.org/1999/xhtml';
const svgNamespace = 'http://www.w3.org/2000/svg';
const xlinkNamespace = 'http://www.w3.org/1999/xlink';

describe('browser template draft', () => {
  test('reports the exact installed parser version', () => {
    const require = createRequire(import.meta.url);
    const parse5Entry = require.resolve('parse5');
    const packageJson = JSON.parse(
      readFileSync(resolve(dirname(parse5Entry), '..', 'package.json'), 'utf8'),
    ) as { readonly version?: unknown };

    expect(packageJson.version).toBe(BROWSER_TEMPLATE_DRAFT_PARSE5_VERSION);
  });

  test('characterizes the parse5 template-fragment candidate in one fast batch', () => {
    const ordinaryMarkup = '<div class="card">Hello</div>';
    const ordinary = parseBrowserTemplateFragmentDraft(ordinaryMarkup);
    const ordinaryDiv = rootElement(ordinary.fragment.children, 'div');

    expect(ordinary.authority).toMatchObject({
      schemaVersion: 'semantic-runtime/browser-template-draft/v1',
      parser: 'parse5',
      parserVersion: '8.0.1',
      context: 'html-template-fragment',
      scriptingEnabled: false,
    });
    expect(ordinary.serialized).toBe(ordinaryMarkup);
    expect(ordinary.issues).toEqual([]);
    expect(ordinaryDiv).toMatchObject({
      path: [0],
      namespace: HtmlNamespaceKind.Html,
      namespaceUri: htmlNamespace,
      locationKind: BrowserTemplateDraftLocationKind.ParserLocated,
      sourceLocation: { startOffset: 0, endOffset: ordinaryMarkup.length },
      attributes: [{
        name: 'class',
        value: 'card',
        locationJoinKind: BrowserTemplateAttributeLocationJoinKind.OrdinalExactName,
        parserLocationKey: 'class',
        sourceTokenName: 'class',
      }],
      children: [{
        nodeKind: BrowserTemplateDraftNodeKind.Text,
        path: [0, 0],
        text: 'Hello',
      }],
    });

    const tableMarkup = '<table><tr><td>x</table>';
    const tableResult = parseBrowserTemplateFragmentDraft(tableMarkup);
    const table = rootElement(tableResult.fragment.children, 'table');
    const tbody = childElement(table, 'tbody');
    const row = childElement(tbody, 'tr');

    expect(tableResult.serialized).toBe('<table><tbody><tr><td>x</td></tr></tbody></table>');
    expect(tbody).toMatchObject({
      path: [0, 0],
      locationKind: BrowserTemplateDraftLocationKind.ParserUnlocated,
      sourceLocation: null,
      startTagSourceLocation: null,
      endTagSourceLocation: null,
    });
    expect(row.locationKind).toBe(BrowserTemplateDraftLocationKind.ParserLocated);
    expect(row.sourceLocation).toMatchObject({
      startOffset: tableMarkup.indexOf('<tr>'),
      endOffset: tableMarkup.indexOf('</table>'),
    });

    const paragraphMarkup = '<p>a<div>b</div>c';
    const paragraphResult = parseBrowserTemplateFragmentDraft(paragraphMarkup);
    const paragraph = rootElement(paragraphResult.fragment.children, 'p');

    expect(paragraphResult.serialized).toBe('<p>a</p><div>b</div>c');
    expect(paragraphResult.fragment.children.map(nodeLabel)).toEqual(['p', 'div', '#text:c']);
    expect(paragraph.children.map(nodeLabel)).toEqual(['#text:a']);
    expect(paragraph.endTagSourceLocation).toBeNull();
    expect(paragraph.sourceLocation?.endOffset).toBe(paragraphMarkup.indexOf('<div>'));

    const fosterMarkup = '<table><div foo.bind="x">z</div><tr><td>c</table>';
    const fosterResult = parseBrowserTemplateFragmentDraft(fosterMarkup);
    const fosteredDiv = rootElement(fosterResult.fragment.children, 'div');
    const fosteredTable = rootElement(fosterResult.fragment.children, 'table');

    expect(fosterResult.fragment.children.map(nodeLabel)).toEqual(['div', 'table']);
    expect(fosteredDiv.path).toEqual([0]);
    expect(fosteredDiv.sourceLocation?.startOffset).toBe(fosterMarkup.indexOf('<div'));
    expect(fosteredTable.path).toEqual([1]);
    expect(fosteredTable.sourceLocation?.startOffset).toBe(0);
    expect(childElement(fosteredTable, 'tbody').locationKind)
      .toBe(BrowserTemplateDraftLocationKind.ParserUnlocated);

    const mergedFosterMarkup = 'before<table>inside<tr><td>x</td></tr>after</table>';
    const mergedFoster = parseBrowserTemplateFragmentDraft(mergedFosterMarkup);
    const mergedText = text(mergedFoster.fragment.children[0]!);

    expect(mergedText.text).toBe('beforeinsideafter');
    expect(sourceSlice(mergedFosterMarkup, mergedText.sourceLocation))
      .toBe('before<table>inside<tr><td>x</td></tr>after');
    expect(mergedText.sourceLocation).toMatchObject({ startOffset: 0, endOffset: 43 });

    const nestedTemplate = parseBrowserTemplateFragmentDraft('<template><div>x</div></template>');
    const template = rootElement(nestedTemplate.fragment.children, 'template');

    expect(template.children).toEqual([]);
    expect(template.templateContent).not.toBeNull();
    expect(template.templateContent?.path).toEqual([0, 'template-content']);
    expect(template.templateContent?.children).toHaveLength(1);
    expect(element(template.templateContent!.children[0]!, 'div').path)
      .toEqual([0, 'template-content', 0]);
    expect(browserTemplateStructure(nestedTemplate.fragment)).toEqual([{
      kind: 'element',
      tagName: 'template',
      namespaceUri: htmlNamespace,
      attributes: [],
      children: [],
      content: [{
        kind: 'element',
        tagName: 'div',
        namespaceUri: htmlNamespace,
        attributes: [],
        children: [{ kind: 'text', value: 'x' }],
        content: null,
      }],
    }]);

    const svgMarkup = [
      '<svg viewbox="0 0 1 1" xlink:href="#probe">',
      '<foreignobject><DIV data-probe="x"></DIV></foreignobject>',
      '</svg>',
    ].join('');
    const svgResult = parseBrowserTemplateFragmentDraft(svgMarkup);
    const svg = rootElement(svgResult.fragment.children, 'svg');
    const viewBox = svg.attributes[0]!;
    const xlinkHref = svg.attributes[1]!;
    const foreignObject = childElement(svg, 'foreignObject');
    const foreignDiv = childElement(foreignObject, 'div');

    expect(svg).toMatchObject({ namespace: HtmlNamespaceKind.Svg, namespaceUri: svgNamespace });
    expect(viewBox).toMatchObject({
      name: 'viewBox',
      locationJoinKind: BrowserTemplateAttributeLocationJoinKind.OrdinalAdjustedName,
      parserLocationKey: 'viewbox',
      sourceTokenName: 'viewbox',
    });
    expect(sourceSlice(svgMarkup, viewBox.sourceLocation)).toBe('viewbox="0 0 1 1"');
    expect(xlinkHref).toMatchObject({
      name: 'href',
      prefix: 'xlink',
      namespaceUri: xlinkNamespace,
      locationJoinKind: BrowserTemplateAttributeLocationJoinKind.OrdinalExactName,
      parserLocationKey: 'xlink:href',
      sourceTokenName: 'xlink:href',
    });
    expect(foreignObject).toMatchObject({
      tagName: 'foreignObject',
      namespace: HtmlNamespaceKind.Svg,
      namespaceUri: svgNamespace,
    });
    expect(foreignDiv).toMatchObject({
      tagName: 'div',
      namespace: HtmlNamespaceKind.Html,
      namespaceUri: htmlNamespace,
    });

    const mathResult = parseBrowserTemplateFragmentDraft(
      '<math><mtext><b>x</b></mtext><mi><mglyph></mglyph><i>y</i></mi></math>',
    );
    const math = rootElement(mathResult.fragment.children, 'math');
    const mtext = childElement(math, 'mtext');
    const mi = childElement(math, 'mi');

    expect(math.namespace).toBe(HtmlNamespaceKind.Math);
    expect(childElement(mtext, 'b').namespace).toBe(HtmlNamespaceKind.Html);
    expect(childElement(mi, 'mglyph').namespace).toBe(HtmlNamespaceKind.Math);
    expect(childElement(mi, 'i').namespace).toBe(HtmlNamespaceKind.Html);

    const normalizedMarkup = '<div title="A&amp;B\r\nC">X&amp;Y\r\nZ</div>';
    const normalizedResult = parseBrowserTemplateFragmentDraft(normalizedMarkup);
    const normalizedDiv = rootElement(normalizedResult.fragment.children, 'div');
    const normalizedAttribute = normalizedDiv.attributes[0]!;
    const normalizedText = text(normalizedDiv.children[0]!);

    expect(normalizedAttribute.value).toBe('A&B\nC');
    expect(normalizedText.text).toBe('X&Y\nZ');
    expect(sourceSlice(normalizedMarkup, normalizedAttribute.sourceLocation))
      .toBe('title="A&amp;B\r\nC"');
    expect(sourceSlice(normalizedMarkup, normalizedText.sourceLocation)).toBe('X&amp;Y\r\nZ');
    expect(normalizedResult.serialized).toBe('<div title="A&amp;B\nC">X&amp;Y\nZ</div>');

    const textModes = parseBrowserTemplateFragmentDraft(
      '<style>a<b>&amp;</style><textarea>a<b>&amp;</textarea>',
    );
    const style = rootElement(textModes.fragment.children, 'style');
    const textarea = rootElement(textModes.fragment.children, 'textarea');

    expect(text(style.children[0]!).text).toBe('a<b>&amp;');
    expect(text(textarea.children[0]!).text).toBe('a<b>&');
    expect(textModes.serialized).toBe('<style>a<b>&amp;</style><textarea>a&lt;b&gt;&amp;</textarea>');

    const duplicateMarkup = '<DIV Foo="a" fOO="b"></DIV>';
    const duplicateResult = parseBrowserTemplateFragmentDraft(duplicateMarkup);
    const duplicateDiv = rootElement(duplicateResult.fragment.children, 'div');

    expect(duplicateDiv.attributes).toHaveLength(1);
    expect(duplicateDiv.attributes[0]).toMatchObject({
      name: 'foo',
      value: 'a',
      parserLocationKey: 'foo',
      sourceTokenName: 'Foo',
    });
    expect(sourceSlice(duplicateMarkup, duplicateDiv.attributes[0]!.sourceLocation)).toBe('Foo="a"');
    expect(duplicateResult.serialized).toBe('<div foo="a"></div>');
    expect(duplicateResult.issues).toEqual([expect.objectContaining({
      code: 'duplicate-attribute',
      location: expect.objectContaining({
        startOffset: duplicateMarkup.indexOf('fOO') + 'fOO'.length,
        endOffset: duplicateMarkup.indexOf('fOO') + 'fOO'.length,
      }),
    })]);

    const numericNameMarkup = '<div a="x" 0="y" b="z"></div>';
    const numericName = rootElement(
      parseBrowserTemplateFragmentDraft(numericNameMarkup).fragment.children,
      'div',
    );

    expect(numericName.attributes.map((attribute) => ({
      name: attribute.name,
      sourceTokenName: attribute.sourceTokenName,
      source: sourceSlice(numericNameMarkup, attribute.sourceLocation),
    }))).toEqual([
      { name: 'a', sourceTokenName: 'a', source: 'a="x"' },
      { name: '0', sourceTokenName: '0', source: '0="y"' },
      { name: 'b', sourceTokenName: 'b', source: 'b="z"' },
    ]);

    const nonHtmlSpaceName = rootElement(
      parseBrowserTemplateFragmentDraft('<div a\u00a0b="x"></div>').fragment.children,
      'div',
    ).attributes[0]!;
    expect(nonHtmlSpaceName).toMatchObject({
      name: 'a\u00a0b',
      sourceTokenName: 'a\u00a0b',
      locationJoinKind: BrowserTemplateAttributeLocationJoinKind.OrdinalExactName,
    });

    const malformed = parseBrowserTemplateFragmentDraft('<!DOCTYPE html><!--a--b--><div>\0x</div>');

    expect(malformed.serialized).toBe('<!--a--b--><div>x</div>');
    expect(malformed.fragment.children.map(nodeLabel)).toEqual(['#comment:a--b', 'div']);
    expect(malformed.issues.map((issue) => issue.code)).toEqual(['unexpected-null-character']);

    const noscript = parseBrowserTemplateFragmentDraft('<noscript><b>x</b></noscript>');
    const noscriptElement = rootElement(noscript.fragment.children, 'noscript');

    expect(noscript.authority.scriptingEnabled).toBe(false);
    expect(noscriptElement.children.map(nodeLabel)).toEqual(['b']);
    expect(childElement(noscriptElement, 'b').children.map(nodeLabel)).toEqual(['#text:x']);

    const adoptionMarkup = '<b><i class="x">x</b>y</i>';
    const adoption = parseBrowserTemplateFragmentDraft(adoptionMarkup);
    const bold = rootElement(adoption.fragment.children, 'b');
    const nestedItalic = childElement(bold, 'i');
    const clonedItalic = rootElement(adoption.fragment.children, 'i');

    expect(adoption.fragment.children.map(nodeLabel)).toEqual(['b', 'i']);
    expect(nestedItalic.path).toEqual([0, 0]);
    expect(clonedItalic.path).toEqual([1]);
    expect(nestedItalic.startTagSourceLocation).toEqual(clonedItalic.startTagSourceLocation);
    expect(nestedItalic.attributes[0]!.sourceLocation).toEqual(clonedItalic.attributes[0]!.sourceLocation);
    expect(nestedItalic.sourceLocation?.endOffset).not.toBe(clonedItalic.sourceLocation?.endOffset);
    expect(adoption.serialized).toBe('<b><i class="x">x</i></b><i class="x">y</i>');

    // This is the pinned parse5 candidate, not a claim about current Chromium customizable-select behavior.
    const customizableSelectMarkup = [
      '<select><button><selectedcontent></selectedcontent></button>',
      '<option>One</option></select>',
    ].join('');
    const customizableSelect = parseBrowserTemplateFragmentDraft(customizableSelectMarkup);
    const select = rootElement(customizableSelect.fragment.children, 'select');

    expect({
      parser: customizableSelect.authority.parser,
      parserVersion: customizableSelect.authority.parserVersion,
      serializedCandidate: customizableSelect.serialized,
      structureCandidate: browserTemplateStructure(customizableSelect.fragment),
      issues: customizableSelect.issues,
    }).toEqual({
      parser: 'parse5',
      parserVersion: '8.0.1',
      serializedCandidate: '<select><option>One</option></select>',
      structureCandidate: [{
        kind: 'element',
        tagName: 'select',
        namespaceUri: htmlNamespace,
        attributes: [],
        children: [{
          kind: 'element',
          tagName: 'option',
          namespaceUri: htmlNamespace,
          attributes: [],
          children: [{ kind: 'text', value: 'One' }],
          content: null,
        }],
        content: null,
      }],
      issues: [],
    });
    expect(select.children.map(nodeLabel)).toEqual(['option']);
  });

  test('reproduces Aurelia string-template carrier selection without confusing it with parsing', () => {
    const select = (markup: string) => selectBrowserTemplateCompilerCarrier(
      parseBrowserTemplateFragmentDraft(markup).fragment,
    );

    const authored = select('<template><div>x</div></template>');
    expect(authored).toMatchObject({
      carrierKind: BrowserTemplateCarrierKind.AuthoredTemplate,
      reason: BrowserTemplateCarrierSelectionReason.SelectedTemplate,
      authoredCarrier: { tagName: 'template' },
      discardedInputNodes: [],
    });
    expect(authored.content.children.map(nodeLabel)).toEqual(['div']);

    expect(select('<div>x</div>')).toMatchObject({
      carrierKind: BrowserTemplateCarrierKind.SynthesizedWrapper,
      reason: BrowserTemplateCarrierSelectionReason.FirstElementNotHtmlTemplate,
      authoredCarrier: null,
      discardedInputNodes: [],
    });
    expect(select('plain text')).toMatchObject({
      carrierKind: BrowserTemplateCarrierKind.SynthesizedWrapper,
      reason: BrowserTemplateCarrierSelectionReason.NoElement,
    });
    expect(select('<template></template><template></template>').reason)
      .toBe(BrowserTemplateCarrierSelectionReason.LaterElementSibling);
    expect(select('x<template></template>').reason)
      .toBe(BrowserTemplateCarrierSelectionReason.MeaningfulPreviousTextSibling);
    expect(select('<template></template>x').reason)
      .toBe(BrowserTemplateCarrierSelectionReason.MeaningfulNextTextSibling);

    const commentShield = select('x<!--c--><template><div>y</div></template><!--d-->z');
    expect(commentShield).toMatchObject({
      carrierKind: BrowserTemplateCarrierKind.AuthoredTemplate,
      reason: BrowserTemplateCarrierSelectionReason.SelectedTemplate,
    });
    expect(commentShield.content.children.map(nodeLabel)).toEqual(['div']);
    expect(commentShield.discardedInputNodes.map(nodeLabel))
      .toEqual(['#text:x', '#comment:c', '#comment:d', '#text:z']);

    const ignorableSiblings = select(' \n<!--before--><template></template><!--after-->\t');
    expect(ignorableSiblings.carrierKind).toBe(BrowserTemplateCarrierKind.AuthoredTemplate);
    expect(ignorableSiblings.discardedInputNodes.map(nodeLabel))
      .toEqual(['#text: \n', '#comment:before', '#comment:after', '#text:\t']);
  });
});

function rootElement(
  nodes: readonly BrowserTemplateNodeDraft[],
  tagName: string,
): BrowserTemplateElementDraft {
  const matches = nodes.filter((node): node is BrowserTemplateElementDraft =>
    node instanceof BrowserTemplateElementDraft && node.tagName === tagName
  );
  if (matches.length !== 1) {
    throw new Error(`Expected one root <${tagName}>; found ${matches.length}.`);
  }
  return matches[0]!;
}

function childElement(
  parent: BrowserTemplateElementDraft,
  tagName: string,
): BrowserTemplateElementDraft {
  const matches = parent.children.filter((node): node is BrowserTemplateElementDraft =>
    node instanceof BrowserTemplateElementDraft && node.tagName === tagName
  );
  if (matches.length !== 1) {
    throw new Error(`Expected one <${tagName}> child of <${parent.tagName}>; found ${matches.length}.`);
  }
  return matches[0]!;
}

function element(node: BrowserTemplateNodeDraft, tagName: string): BrowserTemplateElementDraft {
  if (!(node instanceof BrowserTemplateElementDraft) || node.tagName !== tagName) {
    throw new Error(`Expected <${tagName}>; found ${nodeLabel(node)}.`);
  }
  return node;
}

function text(node: BrowserTemplateNodeDraft): BrowserTemplateTextDraft {
  if (!(node instanceof BrowserTemplateTextDraft)) {
    throw new Error(`Expected text; found ${nodeLabel(node)}.`);
  }
  return node;
}

function nodeLabel(node: BrowserTemplateNodeDraft): string {
  if (node instanceof BrowserTemplateElementDraft) {
    return node.tagName;
  }
  if (node instanceof BrowserTemplateTextDraft) {
    return `#text:${node.text}`;
  }
  return node.nodeKind === BrowserTemplateDraftNodeKind.Comment
    ? `#comment:${node.text}`
    : `#doctype:${node.name}`;
}

function sourceSlice(
  markup: string,
  location: { readonly startOffset: number; readonly endOffset: number } | null,
): string | null {
  return location == null ? null : markup.slice(location.startOffset, location.endOffset);
}
