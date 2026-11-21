import { defaultTreeAdapter, parseFragment } from 'parse5';
import { stripTemplateSourceRanges } from './template-source-text.js';
import type { TemplateSourceOffsetMap } from './custom-element-definition.js';

export class HtmlTemplateMetadataImport {
  constructor(
    readonly specifier: string,
    readonly aliases: ReadonlyMap<string, string>,
    readonly sourceStart: number,
    readonly sourceEnd: number,
  ) {}
}

export class HtmlTemplateMetadata {
  constructor(
    readonly markup: string,
    readonly sourceMap: TemplateSourceOffsetMap | null,
    readonly imports: readonly HtmlTemplateMetadataImport[],
    readonly hasSlot: boolean,
  ) {}
}

export function readHtmlTemplateMetadata(rawMarkup: string): HtmlTemplateMetadata {
  if (!/<(?:import|require|slot)(?=[\t\n\f\r />])/i.test(rawMarkup)) {
    return new HtmlTemplateMetadata(rawMarkup, null, [], false);
  }
  const root = parseFragment(rawMarkup, { sourceCodeLocationInfo: true });
  const pending = [...root.childNodes].reverse();
  const removedRanges: Array<readonly [number, number]> = [];
  const imports: HtmlTemplateMetadataImport[] = [];
  let hasSlot = false;
  while (pending.length > 0) {
    const node = pending.pop()!;
    if (!defaultTreeAdapter.isElementNode(node)) continue;
    if (node.tagName === 'template' && node.attrs.some(attribute => attribute.name === 'as-custom-element')) continue;
    if (node.tagName === 'slot') hasSlot = true;
    if (node.tagName === 'import' || node.tagName === 'require') {
      const location = node.sourceCodeLocation;
      if (location?.startTag != null) {
        const { startOffset, endOffset } = location.startTag;
        removedRanges.push([startOffset, endOffset]);
        if (location.endTag != null) removedRanges.push([location.endTag.startOffset, location.endTag.endOffset]);
        const from = node.attrs.find(attribute => attribute.name === 'from')?.value;
        if (from) {
          const aliases = new Map<string, string>();
          for (const { name, value } of node.attrs) {
            if (name === 'as') aliases.set('__MAIN__', value);
            else if (name.endsWith('.as')) aliases.set(name.slice(0, -3), value);
          }
          imports.push(new HtmlTemplateMetadataImport(from, aliases, startOffset, endOffset));
        }
      }
    }
    const children = 'content' in node ? node.content.childNodes : node.childNodes;
    for (let i = children.length - 1; i >= 0; i--) pending.push(children[i]!);
  }
  const stripped = stripTemplateSourceRanges(rawMarkup, removedRanges);
  return new HtmlTemplateMetadata(stripped.markup, stripped.sourceMap, imports, hasSlot);
}
