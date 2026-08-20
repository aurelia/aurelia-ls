import { describe, expect, test } from 'vitest';
import {
  parseHtmlDocumentDraft,
  type ParsedHtmlNodeDraft,
} from '../src/template/html-parse-materializer.js';
import {
  HtmlIrNodeKind,
  HtmlNamespaceKind,
  HtmlRecoveryKind,
} from '../src/template/html-ir.js';
import { TemplateRecoveryPolicy } from '../src/template/parse-context.js';
import {
  runtimeAttributeName,
  runtimeNodeName,
} from '../src/template/runtime-dom-name.js';

describe('HTML foreign-content materialization', () => {
  test('re-enters HTML from SVG integration points and preserves nested foreign namespaces', () => {
    const document = parse([
      '<svg>',
      '<g><math></math></g>',
      '<foreignObject><section><svg><feDropShadow /></svg><math><mi>x</mi></math></section></foreignObject>',
      '<desc><span></span></desc>',
      '<title><em></em></title>',
      '</svg>',
    ].join(''));

    const svg = rootElement(document.rootNodes, 'svg');
    expect(svg.namespace).toBe(HtmlNamespaceKind.Svg);
    expect(childElement(svg, 'g').namespace).toBe(HtmlNamespaceKind.Svg);
    expect(childElement(childElement(svg, 'g'), 'math').namespace).toBe(HtmlNamespaceKind.Svg);

    const foreignObject = childElement(svg, 'foreignObject');
    const section = childElement(foreignObject, 'section');
    expect(foreignObject.namespace).toBe(HtmlNamespaceKind.Svg);
    expect(section.namespace).toBe(HtmlNamespaceKind.Html);

    const nestedSvg = childElement(section, 'svg');
    expect(nestedSvg.namespace).toBe(HtmlNamespaceKind.Svg);
    expect(childElement(nestedSvg, 'feDropShadow').namespace).toBe(HtmlNamespaceKind.Svg);
    expect(childElement(section, 'math').namespace).toBe(HtmlNamespaceKind.Math);
    expect(childElement(childElement(section, 'math'), 'mi').namespace).toBe(HtmlNamespaceKind.Math);

    expect(childElement(childElement(svg, 'desc'), 'span').namespace).toBe(HtmlNamespaceKind.Html);
    expect(childElement(childElement(svg, 'title'), 'em').namespace).toBe(HtmlNamespaceKind.Html);
  });

  test('models only the browser-defined MathML integration points', () => {
    const document = parse([
      '<math>',
      '<mrow><svg></svg></mrow>',
      '<mi><span></span><mglyph /><malignmark /></mi>',
      '<mo><b></b></mo><mn><i></i></mn><ms><u></u></ms><mtext><small></small></mtext>',
      '<annotation-xml><svg><path /></svg><ordinary /></annotation-xml>',
      '<annotation-xml encoding="TEXT&#x2f;HTML"><div><svg /></div></annotation-xml>',
      '<annotation-xml encoding="APPLICATION&#47;XHTML&plus;XML"><section></section></annotation-xml>',
      '</math>',
    ].join(''));

    const math = rootElement(document.rootNodes, 'math');
    expect(math.namespace).toBe(HtmlNamespaceKind.Math);
    expect(childElement(childElement(math, 'mrow'), 'svg').namespace).toBe(HtmlNamespaceKind.Math);

    const mi = childElement(math, 'mi');
    expect(childElement(mi, 'span').namespace).toBe(HtmlNamespaceKind.Html);
    expect(childElement(mi, 'mglyph').namespace).toBe(HtmlNamespaceKind.Math);
    expect(childElement(mi, 'malignmark').namespace).toBe(HtmlNamespaceKind.Math);
    for (const [integrationPoint, htmlChild] of [
      ['mo', 'b'],
      ['mn', 'i'],
      ['ms', 'u'],
      ['mtext', 'small'],
    ] as const) {
      expect(childElement(childElement(math, integrationPoint), htmlChild).namespace).toBe(HtmlNamespaceKind.Html);
    }

    const annotations = elementChildren(math).filter((node) => node.tagName === 'annotation-xml');
    expect(annotations).toHaveLength(3);
    expect(childElement(annotations[0]!, 'svg').namespace).toBe(HtmlNamespaceKind.Svg);
    expect(childElement(annotations[0]!, 'ordinary').namespace).toBe(HtmlNamespaceKind.Math);
    expect(childElement(annotations[1]!, 'div').namespace).toBe(HtmlNamespaceKind.Html);
    expect(childElement(childElement(annotations[1]!, 'div'), 'svg').namespace).toBe(HtmlNamespaceKind.Svg);
    expect(childElement(annotations[2]!, 'section').namespace).toBe(HtmlNamespaceKind.Html);
  });

  test('uses HTML tokenizer duplicate-name and foreign-name adjustment rules', () => {
    const document = parse('<svg viewBox="0 0 1 1" VIEWBOX="0 0 2 2"><FEDROPSHADOW /></svg>');
    const svg = rootElement(document.rootNodes, 'svg');
    const duplicate = svg.attributes[1];

    expect(duplicate?.recoveries).toEqual([
      expect.objectContaining({ recoveryKind: HtmlRecoveryKind.DuplicateAttribute }),
    ]);
    expect(runtimeNodeName('FEDROPSHADOW', HtmlNamespaceKind.Svg)).toBe('feDropShadow');
    expect(runtimeNodeName('FOREIGNOBJECT', HtmlNamespaceKind.Svg)).toBe('foreignObject');
    expect(runtimeAttributeName('VIEWBOX', HtmlNamespaceKind.Svg)).toBe('viewBox');
    expect(runtimeAttributeName('definitionurl', HtmlNamespaceKind.Math)).toBe('definitionURL');
    expect(runtimeNodeName('constructor', HtmlNamespaceKind.Svg)).toBe('constructor');
    expect(runtimeNodeName('__proto__', HtmlNamespaceKind.Svg)).toBe('__proto__');
    expect(runtimeAttributeName('constructor', HtmlNamespaceKind.Svg)).toBe('constructor');
    expect(runtimeAttributeName('__proto__', HtmlNamespaceKind.Svg)).toBe('__proto__');
    expect(runtimeNodeName('custom-K', HtmlNamespaceKind.Html)).toBe('CUSTOM-K');
  });

  test('normalizes shorthand spread operands as HTML attribute names while explicit spread values retain authored case', () => {
    const document = parse(
      '<spread-card ...spreadState ...$bindables="spreadState"></spread-card>',
    );
    const card = rootElement(document.rootNodes, 'spread-card');
    const shorthand = card.attributes.find((attribute) => attribute.rawName === '...spreadState');
    const explicit = card.attributes.find((attribute) => attribute.rawName === '...$bindables');

    expect(runtimeAttributeName(shorthand?.rawName ?? '', card.namespace)).toBe('...spreadstate');
    expect(runtimeAttributeName(explicit?.rawName ?? '', card.namespace)).toBe('...$bindables');
    expect(explicit?.rawValue).toBe('spreadState');
  });

  test('does not apply HTML void-element rules inside foreign content', () => {
    const document = parse('<svg><source><circle></circle></source></svg>');
    const svg = rootElement(document.rootNodes, 'svg');
    const source = childElement(svg, 'source');

    expect(source.namespace).toBe(HtmlNamespaceKind.Svg);
    expect(childElement(source, 'circle').namespace).toBe(HtmlNamespaceKind.Svg);
  });

  test('materializes foreign-content CDATA as source-aligned text', () => {
    const markup = '<svg><![CDATA[${value}]]><circle /></svg>';
    const document = parse(markup);
    const svg = rootElement(document.rootNodes, 'svg');
    const text = svg.children.find((node) => node.nodeKind === HtmlIrNodeKind.Text);

    expect(text).toMatchObject({
      namespace: HtmlNamespaceKind.Svg,
      text: '${value}',
      start: markup.indexOf('${value}'),
      end: markup.indexOf('${value}') + '${value}'.length,
      recoveries: [],
    });
    expect(svg.children.some((node) => node.nodeKind === HtmlIrNodeKind.Doctype)).toBe(false);
  });

  test('ASCII case folding does not merge non-ASCII authored names', () => {
    const document = parse('<div k="one" K="two"></div>');
    const div = rootElement(document.rootNodes, 'div');

    expect(div.attributes).toHaveLength(2);
    expect(div.attributes.flatMap((attribute) => attribute.recoveries)).toEqual([]);
  });
});

function parse(markup: string) {
  return parseHtmlDocumentDraft(markup, TemplateRecoveryPolicy.Strict);
}

function rootElement(nodes: readonly ParsedHtmlNodeDraft[], tagName: string): ParsedHtmlNodeDraft {
  const matches = nodes.filter((node) => node.nodeKind === HtmlIrNodeKind.Element && node.tagName === tagName);
  expect(matches).toHaveLength(1);
  return matches[0]!;
}

function childElement(parent: ParsedHtmlNodeDraft, tagName: string): ParsedHtmlNodeDraft {
  const matches = elementChildren(parent).filter((node) => node.tagName === tagName);
  expect(matches).toHaveLength(1);
  return matches[0]!;
}

function elementChildren(parent: ParsedHtmlNodeDraft): readonly ParsedHtmlNodeDraft[] {
  return parent.children.filter((node) => node.nodeKind === HtmlIrNodeKind.Element);
}
