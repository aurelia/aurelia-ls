import { TemplateSourceOffsetMap } from './custom-element-definition.js';

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

class HtmlMetadataTag {
  constructor(
    readonly tagName: string,
    readonly start: number,
    readonly end: number,
    readonly isEndTag: boolean,
    readonly attributes: readonly HtmlMetadataAttribute[],
  ) {}
}

class HtmlMetadataAttribute {
  constructor(
    readonly name: string,
    readonly value: string,
    readonly start: number,
    readonly end: number,
  ) {}
}

export function readHtmlTemplateMetadata(rawMarkup: string): HtmlTemplateMetadata {
  const tags = scanHtmlMetadataTags(rawMarkup);
  const removedRanges: Array<readonly [number, number]> = [];
  const imports: HtmlTemplateMetadataImport[] = [];
  let hasSlot = false;

  for (const tag of tags) {
    if (tag.tagName === 'slot' && !tag.isEndTag) {
      hasSlot = true;
      continue;
    }
    if (tag.tagName !== 'import' && tag.tagName !== 'require') {
      continue;
    }
    removedRanges.push([tag.start, tag.end]);
    if (tag.isEndTag) {
      continue;
    }
    const specifier = htmlMetadataAttributeValue(tag, 'from');
    if (specifier != null && specifier.length > 0) {
      imports.push(new HtmlTemplateMetadataImport(
        specifier,
        importAliases(tag),
        tag.start,
        tag.end,
      ));
    }
  }

  const stripped = stripRanges(rawMarkup, removedRanges);
  return new HtmlTemplateMetadata(
    stripped.markup,
    stripped.sourceMap,
    imports,
    hasSlot,
  );
}

function scanHtmlMetadataTags(markup: string): readonly HtmlMetadataTag[] {
  const tags: HtmlMetadataTag[] = [];
  let index = 0;
  while (index < markup.length) {
    const start = markup.indexOf('<', index);
    if (start < 0) {
      break;
    }
    if (markup.startsWith('<!--', start)) {
      index = skipUntil(markup, start + 4, '-->');
      continue;
    }
    if (markup.startsWith('<!', start) || markup.startsWith('<?', start)) {
      index = scanTagEnd(markup, start + 2);
      continue;
    }

    const tag = readTag(markup, start);
    if (tag == null) {
      index = start + 1;
      continue;
    }
    tags.push(tag);
    index = tag.end;
  }
  return tags;
}

function readTag(markup: string, start: number): HtmlMetadataTag | null {
  let cursor = start + 1;
  cursor = skipSpaces(markup, cursor);
  const isEndTag = markup[cursor] === '/';
  if (isEndTag) {
    cursor = skipSpaces(markup, cursor + 1);
  }

  const nameStart = cursor;
  cursor = readNameEnd(markup, cursor);
  if (cursor === nameStart) {
    return null;
  }

  const tagName = markup.slice(nameStart, cursor).toLowerCase();
  const end = scanTagEnd(markup, cursor);
  const attributes = isEndTag ? [] : readAttributes(markup, cursor, end);
  return new HtmlMetadataTag(tagName, start, end, isEndTag, attributes);
}

function readAttributes(markup: string, start: number, end: number): readonly HtmlMetadataAttribute[] {
  const attributes: HtmlMetadataAttribute[] = [];
  let cursor = start;
  while (cursor < end) {
    cursor = skipSpaces(markup, cursor);
    if (cursor >= end || markup[cursor] === '/' || markup[cursor] === '>') {
      break;
    }

    const attributeStart = cursor;
    const nameStart = cursor;
    cursor = readNameEnd(markup, cursor);
    if (cursor === nameStart) {
      cursor++;
      continue;
    }
    const name = markup.slice(nameStart, cursor).toLowerCase();
    cursor = skipSpaces(markup, cursor);
    let value = '';
    if (markup[cursor] === '=') {
      cursor = skipSpaces(markup, cursor + 1);
      const quote = markup[cursor] ?? '';
      if (quote === '"' || quote === "'") {
        const valueStart = cursor + 1;
        const valueEnd = markup.indexOf(quote, valueStart);
        const closedEnd = valueEnd < 0 || valueEnd > end ? end : valueEnd;
        value = markup.slice(valueStart, closedEnd);
        cursor = closedEnd + (closedEnd < end ? 1 : 0);
      } else {
        const valueStart = cursor;
        while (cursor < end && !isSpace(markup[cursor] ?? '') && markup[cursor] !== '>' && markup[cursor] !== '/') {
          cursor++;
        }
        value = markup.slice(valueStart, cursor);
      }
    }
    attributes.push(new HtmlMetadataAttribute(name, value, attributeStart, cursor));
  }
  return attributes;
}

function stripRanges(
  markup: string,
  ranges: readonly (readonly [number, number])[],
): { readonly markup: string; readonly sourceMap: TemplateSourceOffsetMap | null } {
  if (ranges.length === 0) {
    return { markup, sourceMap: null };
  }

  const normalized = normalizeRanges(ranges, markup.length);
  const pieces: string[] = [];
  const offsets: number[] = [];
  let cursor = 0;
  for (const [start, end] of normalized) {
    appendKeptRange(markup, cursor, start, pieces, offsets);
    cursor = end;
  }
  appendKeptRange(markup, cursor, markup.length, pieces, offsets);
  offsets.push(markup.length);

  const stripped = pieces.join('');
  return {
    markup: stripped,
    sourceMap: new TemplateSourceOffsetMap(stripped.length, offsets),
  };
}

function appendKeptRange(
  markup: string,
  start: number,
  end: number,
  pieces: string[],
  offsets: number[],
): void {
  if (end <= start) {
    return;
  }
  pieces.push(markup.slice(start, end));
  for (let index = start; index < end; index++) {
    offsets.push(index);
  }
}

function normalizeRanges(
  ranges: readonly (readonly [number, number])[],
  textLength: number,
): readonly (readonly [number, number])[] {
  const sorted = ranges
    .map(([start, end]) => [Math.max(0, start), Math.min(textLength, end)] as const)
    .filter(([start, end]) => end > start)
    .sort(([leftStart, leftEnd], [rightStart, rightEnd]) =>
      leftStart - rightStart || leftEnd - rightEnd
    );
  const result: Array<readonly [number, number]> = [];
  for (const [start, end] of sorted) {
    const previous = result[result.length - 1] ?? null;
    if (previous == null || start > previous[1]) {
      result.push([start, end]);
      continue;
    }
    result[result.length - 1] = [previous[0], Math.max(previous[1], end)];
  }
  return result;
}

function importAliases(tag: HtmlMetadataTag): ReadonlyMap<string, string> {
  const aliases = new Map<string, string>();
  for (const attribute of tag.attributes) {
    if (attribute.name === 'as' && attribute.value.length > 0) {
      aliases.set('__MAIN__', attribute.value);
      continue;
    }
    if (attribute.name.endsWith('.as') && attribute.value.length > 0) {
      aliases.set(attribute.name.slice(0, -3), attribute.value);
    }
  }
  return aliases;
}

function htmlMetadataAttributeValue(tag: HtmlMetadataTag, name: string): string | null {
  return tag.attributes.find((attribute) => attribute.name === name)?.value ?? null;
}

function scanTagEnd(markup: string, start: number): number {
  let quote: string | null = null;
  for (let index = start; index < markup.length; index++) {
    const char = markup[index] ?? '';
    if (quote != null) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '>') {
      return index + 1;
    }
  }
  return markup.length;
}

function readNameEnd(markup: string, start: number): number {
  let cursor = start;
  while (cursor < markup.length && isHtmlMetadataNameCharacter(markup[cursor] ?? '')) {
    cursor++;
  }
  return cursor;
}

function skipUntil(markup: string, start: number, token: string): number {
  const end = markup.indexOf(token, start);
  return end < 0 ? markup.length : end + token.length;
}

function skipSpaces(markup: string, start: number): number {
  let cursor = start;
  while (cursor < markup.length && isSpace(markup[cursor] ?? '')) {
    cursor++;
  }
  return cursor;
}

function isHtmlMetadataNameCharacter(value: string): boolean {
  return value !== ''
    && !isSpace(value)
    && value !== '/'
    && value !== '>'
    && value !== '=';
}

function isSpace(value: string): boolean {
  return value === ' ' || value === '\t' || value === '\r' || value === '\n' || value === '\f';
}
