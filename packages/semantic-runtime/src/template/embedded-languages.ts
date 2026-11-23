import { decodedOffsetAtSource } from '../kernel/decoded-source-offsets.js';
import { parseHtmlDocumentDraft, type ParsedHtmlNodeDraft } from './html-parse-materializer.js';
import { HtmlIrNodeKind } from './html-ir.js';
import { TemplateRecoveryPolicy } from './parse-context.js';
import type { SemanticTemplateSemanticTokenRow } from '../api/contracts.js';

/** A browser-decoded HTML embedded-language input, with positions in the external template. */
export interface EmbeddedLanguageRegion {
  readonly language: 'css' | 'javascript';
  readonly context: 'attribute' | 'element';
  readonly start: number;
  readonly end: number;
  readonly value: string;
  readonly module?: boolean;
  /** Decoded boundary -> authored boundary relative to start, when character references or CRLF changed its length. */
  readonly offsets?: readonly number[];
  /** Ranges in the decoded value from the compiler's authored interpolation tokens. */
  readonly holes: readonly { readonly start: number; readonly end: number }[];
}

export function templateEmbeddedLanguageRegions(
  markup: string,
  tokens: readonly SemanticTemplateSemanticTokenRow[],
): readonly EmbeddedLanguageRegion[] {
  const bounds = new Map<number, number>();
  for (const token of tokens) {
    if (token.tokenType === 'aureliaExpression' && token.source?.start != null && token.source.end != null) {
      bounds.set(token.source.start, token.source.end);
    }
  }
  if (bounds.size === 0) return [];
  const delimiters = [...bounds].sort(([left], [right]) => left - right);
  let cursor = 0;
  const regions: EmbeddedLanguageRegion[] = [];
  function append(
    language: EmbeddedLanguageRegion['language'], context: EmbeddedLanguageRegion['context'],
    start: number, end: number, value: string, offsets?: readonly number[], isModule?: boolean,
  ): void {
    const holes: { start: number; end: number }[] = [];
    let opener: number | null = null;
    while (cursor < delimiters.length && delimiters[cursor]![0] < end) {
      const [from, to] = delimiters[cursor++]!;
      if (from < start || to > end) continue;
      const left = offsets ? decodedOffsetAtSource(offsets, from - start) : from - start;
      const right = offsets ? decodedOffsetAtSource(offsets, to - start) : to - start;
      if (offsets && (offsets[left] !== from - start || offsets[right] !== to - start)) continue;
      const delimiter = value.slice(left, right);
      if (delimiter === '${') opener = left;
      if (delimiter === '}' && opener != null) {
        holes.push({ start: opener, end: right });
        opener = null;
      }
    }
    // Keep the authored incomplete expression under Aurelia's recovery diagnostics.
    if (opener != null) holes.push({ start: opener, end: value.length });
    regions.push({ language, context, start, end, value, offsets, holes, ...(isModule && { module: true }) });
  }
  function visit(node: ParsedHtmlNodeDraft, parentLanguage?: EmbeddedLanguageRegion['language'], scriptModule?: boolean): void {
    if (node.nodeKind === HtmlIrNodeKind.Text && parentLanguage && node.text != null) {
      append(parentLanguage, 'element', node.start, node.end, node.decodedText?.value ?? node.text, node.decodedText?.offsets, scriptModule);
      return;
    }
    if (node.nodeKind !== HtmlIrNodeKind.Element) return;
    for (const attribute of node.attributes) {
      const name = attribute.rawName.toLowerCase();
      const language = name === 'style' ? 'css' : /^on\w+$/u.test(name) ? 'javascript' : null;
      if (language && attribute.valueStart != null && attribute.valueEnd != null) {
        append(language, 'attribute', attribute.valueStart, attribute.valueEnd, attribute.value, attribute.decoded?.offsets);
      }
    }
    const tag = node.tagName?.toLowerCase();
    const type = node.attributes.find(attribute => attribute.rawName.toLowerCase() === 'type')?.value.trim().toLowerCase() ?? '';
    const embedded = tag === 'style' && (type === '' || type === 'text/css') ? 'css'
      : (tag === 'script' && (type === '' || type === 'module' || /^(?:text|application)\/(?:java|ecma)script$/u.test(type))) ? 'javascript'
      : undefined;
    for (const child of node.children) visit(child, embedded, tag === 'script' && type === 'module');
  }
  const draft = parseHtmlDocumentDraft(markup, TemplateRecoveryPolicy.Recover);
  for (const node of draft.rootNodes) visit(node);
  return regions.some(region => region.holes.length > 0) ? regions : [];
}
