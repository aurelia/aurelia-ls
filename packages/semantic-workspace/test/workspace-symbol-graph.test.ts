import { beforeAll, describe, expect, it } from "vitest";
import { createWorkspaceHarness } from "./harness/index.js";
import { asFixtureId } from "./fixtures/index.js";

function computeLineStarts(text: string): number[] {
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

function positionAt(text: string, offset: number): { line: number; character: number } {
  const clamped = Math.max(0, Math.min(offset, text.length));
  const starts = computeLineStarts(text);
  let line = 0;
  while (line + 1 < starts.length && (starts[line + 1] ?? Number.POSITIVE_INFINITY) <= clamped) {
    line += 1;
  }
  const lineStart = starts[line] ?? 0;
  return { line, character: clamped - lineStart };
}

function findPosition(text: string, needle: string, delta = 0): { line: number; character: number } {
  const index = text.indexOf(needle);
  if (index < 0) {
    throw new Error(`Marker not found: ${needle}`);
  }
  return positionAt(text, index + delta);
}

function findOffsets(text: string, pattern: RegExp): number[] {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  const offsets: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    offsets.push(match.index);
  }
  return offsets;
}

function spanCoversOffset(span: { start: number; end: number }, offset: number): boolean {
  if (span.end <= span.start) return span.start === offset;
  return offset >= span.start && offset < span.end;
}

function spanText(
  harness: Awaited<ReturnType<typeof createWorkspaceHarness>>,
  loc: { uri: string; span: { start: number; end: number } },
): string {
  const text = harness.readText(loc.uri);
  if (!text) {
    throw new Error(`Missing text for ${String(loc.uri)}`);
  }
  const start = Math.max(0, Math.min(loc.span.start, text.length));
  const end = Math.max(start, Math.min(loc.span.end, text.length));
  if (end > start) return text.slice(start, end);
  const lineStart = Math.max(0, text.lastIndexOf("\n", start - 1) + 1);
  const lineEnd = text.indexOf("\n", start);
  return text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
}

function expectDefinition(
  harness: Awaited<ReturnType<typeof createWorkspaceHarness>>,
  defs: readonly { uri: string; span: { start: number; end: number }; symbolId?: string }[],
  opts: { uriEndsWith: string; textIncludes: string },
): { uri: string; span: { start: number; end: number }; symbolId?: string } {
  const hit = defs.find((loc) => {
    if (!String(loc.uri).endsWith(opts.uriEndsWith)) return false;
    return spanText(harness, loc).includes(opts.textIncludes);
  });
  expect(hit, `Definition not found for ${opts.uriEndsWith} containing ${opts.textIncludes}`).toBeDefined();
  return hit!;
}

function expectReferencesAtOffsets(
  refs: readonly { uri: string; span: { start: number; end: number } }[],
  uri: string,
  offsets: readonly number[],
): void {
  for (const offset of offsets) {
    const hit = refs.find((loc) => String(loc.uri) === String(uri) && spanCoversOffset(loc.span, offset));
    expect(hit, `Reference not found at offset ${offset}`).toBeDefined();
  }
}

function expectSortedByLocation(
  refs: readonly { uri: string; span: { start: number; end: number }; symbolId?: string }[],
): void {
  const sorted = [...refs].sort((a, b) => {
    const uriDelta = String(a.uri).localeCompare(String(b.uri));
    if (uriDelta !== 0) return uriDelta;
    const startDelta = a.span.start - b.span.start;
    if (startDelta !== 0) return startDelta;
    const endDelta = a.span.end - b.span.end;
    if (endDelta !== 0) return endDelta;
    return String(a.symbolId ?? "").localeCompare(String(b.symbolId ?? ""));
  });
  expect(refs).toEqual(sorted);
}

describe("workspace symbol graph (workspace-contract)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;
  let summaryUri: string;
  let summaryText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    summaryUri = harness.openTemplate("src/views/summary-panel.html");

    const app = harness.readText(appUri);
    const summary = harness.readText(summaryUri);
    if (!app || !summary) {
      throw new Error("Expected template text for workspace-contract fixtures");
    }
    appText = app;
    summaryText = summary;
  });

  it("links local scope definitions and references by symbol id", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "${total}", 2));
    const def = expectDefinition(harness, defs, {
      uriEndsWith: "/src/my-app.html",
      textIncludes: "total.bind",
    });
    expect(typeof def.symbolId).toBe("string");

    const refs = query.references(findPosition(appText, "${total}", 2));
    const refsForId = refs.filter((loc) => loc.symbolId === def.symbolId);
    const offsets = findOffsets(appText, /\btotal\b/);
    expectReferencesAtOffsets(refsForId, appUri, offsets);
    expectSortedByLocation(refsForId);
  });

  it("links value converter references across templates", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "titlecase", 1));
    const def = expectDefinition(harness, defs, {
      uriEndsWith: "/src/value-converters/titlecase.ts",
      textIncludes: "TitleCaseValueConverter",
    });
    expect(typeof def.symbolId).toBe("string");

    const refs = query.references(findPosition(appText, "titlecase", 1));
    const refsForId = refs.filter((loc) => loc.symbolId === def.symbolId);
    const appOffsets = findOffsets(appText, /\btitlecase\b/);
    const summaryOffsets = findOffsets(summaryText, /\btitlecase\b/);
    expectReferencesAtOffsets(refsForId, appUri, appOffsets);
    expectReferencesAtOffsets(refsForId, summaryUri, summaryOffsets);
    expectSortedByLocation(refsForId);
  });
});
