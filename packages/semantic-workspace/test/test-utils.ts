import { expect } from "vitest";

type SourceSpan = { start: number; end: number };
type LocationLike = { uri: string; span: SourceSpan };
type TokenLike = { type: string; modifiers?: string[]; span: SourceSpan };

export function computeLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    if (ch === 13 /* CR */ || ch === 10 /* LF */) {
      if (ch === 13 /* CR */ && text.charCodeAt(i + 1) === 10 /* LF */) i += 1;
      starts.push(i + 1);
    }
  }
  return starts;
}

export function positionAt(text: string, offset: number): { line: number; character: number } {
  const clamped = Math.max(0, Math.min(offset, text.length));
  const starts = computeLineStarts(text);
  let line = 0;
  while (line + 1 < starts.length && (starts[line + 1] ?? Number.POSITIVE_INFINITY) <= clamped) {
    line += 1;
  }
  const lineStart = starts[line] ?? 0;
  return { line, character: clamped - lineStart };
}

export function findOffset(text: string, needle: string, delta = 0): number {
  const index = text.indexOf(needle);
  if (index < 0) throw new Error(`Marker not found: ${needle}`);
  return index + delta;
}

export function findPosition(text: string, needle: string, delta = 0): { line: number; character: number } {
  return positionAt(text, findOffset(text, needle, delta));
}

export function findOffsets(text: string, pattern: RegExp): number[] {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  const offsets: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    offsets.push(match.index);
  }
  return offsets;
}

export function spanCoversOffset(span: SourceSpan, offset: number): boolean {
  if (span.end <= span.start) return span.start === offset;
  return offset >= span.start && offset < span.end;
}

export function spanText(
  readText: (uri: string) => string | null,
  loc: LocationLike,
): string {
  const text = readText(loc.uri);
  if (!text) throw new Error(`Missing text for ${String(loc.uri)}`);
  const start = Math.max(0, Math.min(loc.span.start, text.length));
  const end = Math.max(start, Math.min(loc.span.end, text.length));
  if (end > start) return text.slice(start, end);
  const lineStart = Math.max(0, text.lastIndexOf("\n", start - 1) + 1);
  const lineEnd = text.indexOf("\n", start);
  return text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
}

export function expectDefinition(
  readText: (uri: string) => string | null,
  defs: readonly LocationLike[],
  opts: { uriEndsWith: string; textIncludes: string },
): LocationLike {
  const hit = defs.find((loc) => {
    if (!String(loc.uri).endsWith(opts.uriEndsWith)) return false;
    return spanText(readText, loc).includes(opts.textIncludes);
  });
  expect(hit, `Definition not found for ${opts.uriEndsWith} containing ${opts.textIncludes}`).toBeDefined();
  return hit!;
}

export function expectLocationAtOffset(
  locs: readonly LocationLike[],
  uri: string,
  offset: number,
  message?: string,
): LocationLike {
  const hit = locs.find((loc) => String(loc.uri) === String(uri) && spanCoversOffset(loc.span, offset));
  expect(hit, message ?? `Location not found at offset ${offset}`).toBeDefined();
  return hit!;
}

export function expectReferencesAtOffsets(
  refs: readonly LocationLike[],
  uri: string,
  offsets: readonly number[],
): void {
  for (const offset of offsets) {
    expectLocationAtOffset(refs, uri, offset, `Reference not found at offset ${offset}`);
  }
}

function sliceToken(text: string, token: TokenLike): string {
  return text.slice(token.span.start, token.span.end);
}

function modifiersMatch(actual: string[] | undefined, expected: readonly string[] | undefined): boolean {
  if (!expected || expected.length === 0) return true;
  if (!actual) return false;
  return expected.every((mod) => actual.includes(mod));
}

export function findToken(
  tokens: readonly TokenLike[],
  text: string,
  opts: { type: string; text: string; modifiers?: readonly string[] },
): TokenLike | undefined {
  return tokens.find((token) => {
    if (token.type !== opts.type) return false;
    if (sliceToken(text, token) !== opts.text) return false;
    return modifiersMatch(token.modifiers, opts.modifiers);
  });
}

export function expectToken(
  tokens: readonly TokenLike[],
  text: string,
  opts: { type: string; text: string; modifiers?: readonly string[] },
): TokenLike {
  const hit = findToken(tokens, text, opts);
  expect(hit, `Expected ${opts.type} token for "${opts.text}"`).toBeDefined();
  return hit!;
}

export function hasLabel(items: readonly { label: string }[], label: string): boolean {
  return items.some((item) => item.label === label);
}
