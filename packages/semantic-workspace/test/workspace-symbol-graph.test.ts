import { beforeAll, describe, expect, it } from "vitest";
import { spanContainsOffset, type DOMNode, type SourceSpan } from "@aurelia-ls/compiler";
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tagNameOffsets(text: string, tag: string): number[] {
  const escaped = escapeRegExp(tag);
  const open = findOffsets(text, new RegExp(`<${escaped}\\b`, "g")).map((offset) => offset + 1);
  const close = findOffsets(text, new RegExp(`</${escaped}\\b`, "g")).map((offset) => offset + 2);
  return [...open, ...close];
}

function findElementTagSpans(
  templates: readonly { dom: DOMNode }[],
  tag: string,
): SourceSpan[] {
  const spans: SourceSpan[] = [];
  const walk = (node: DOMNode | null | undefined) => {
    if (!node) return;
    if (node.kind === "element" && node.tag === tag) {
      if (node.tagLoc) spans.push(node.tagLoc);
      if (node.closeTagLoc) spans.push(node.closeTagLoc);
    }
    if (node.kind === "element" || node.kind === "template") {
      for (const child of node.children ?? []) {
        walk(child);
      }
    }
  };
  for (const template of templates) {
    walk(template.dom);
  }
  return spans;
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
  opts: { uriEndsWith: string; textIncludes: string | readonly string[] },
): { uri: string; span: { start: number; end: number }; symbolId?: string } {
  const hit = defs.find((loc) => {
    if (!String(loc.uri).endsWith(opts.uriEndsWith)) return false;
    const snippet = spanText(harness, loc);
    if (Array.isArray(opts.textIncludes)) {
      return opts.textIncludes.some((text) => snippet.includes(text));
    }
    return snippet.includes(opts.textIncludes);
  });
  expect(hit, `Definition not found for ${opts.uriEndsWith} containing ${opts.textIncludes}`).toBeDefined();
  return hit!;
}

function expectReferencesAtOffsets(
  refs: readonly { uri: string; span: { start: number; end: number } }[],
  uri: string,
  offsets: readonly number[],
): void {
  expect(offsets.length).toBeGreaterThan(0);
  for (const offset of offsets) {
    const hit = refs.find((loc) => String(loc.uri) === String(uri) && spanCoversOffset(loc.span, offset));
    expect(hit, `Reference not found at offset ${offset}`).toBeDefined();
  }
}

function expectSortedByContract(
  refs: readonly { uri: string; span: { start: number; end: number }; symbolId?: string; exprId?: string; nodeId?: string }[],
  currentUri: string,
): void {
  const sorted = [...refs].sort((a, b) => {
    const aCurrent = String(a.uri) === String(currentUri) ? 0 : 1;
    const bCurrent = String(b.uri) === String(currentUri) ? 0 : 1;
    if (aCurrent !== bCurrent) return aCurrent - bCurrent;
    const uriDelta = String(a.uri).localeCompare(String(b.uri));
    if (uriDelta !== 0) return uriDelta;
    const startDelta = a.span.start - b.span.start;
    if (startDelta !== 0) return startDelta;
    const endDelta = a.span.end - b.span.end;
    if (endDelta !== 0) return endDelta;
    const symbolDelta = String(a.symbolId ?? "").localeCompare(String(b.symbolId ?? ""));
    if (symbolDelta !== 0) return symbolDelta;
    const exprDelta = String(a.exprId ?? "").localeCompare(String(b.exprId ?? ""));
    if (exprDelta !== 0) return exprDelta;
    return String(a.nodeId ?? "").localeCompare(String(b.nodeId ?? ""));
  });
  expect(refs).toEqual(sorted);
}

describe("workspace symbol graph (workspace-contract)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;
  let summaryUri: string;
  let summaryText: string;
  let tableUri: string;
  let tableText: string;
  let detailUri: string;
  let detailText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    summaryUri = harness.openTemplate("src/views/summary-panel.html");
    tableUri = harness.openTemplate("src/views/table-panel.html");
    detailUri = harness.openTemplate("src/components/device-detail.html");

    const app = harness.readText(appUri);
    const summary = harness.readText(summaryUri);
    const table = harness.readText(tableUri);
    const detail = harness.readText(detailUri);
    if (!app || !summary || !table || !detail) {
      throw new Error("Expected template text for workspace-contract fixtures");
    }
    appText = app;
    summaryText = summary;
    tableText = table;
    detailText = detail;
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
    expectSortedByContract(refsForId, appUri);
  });

  it("keeps symbol ids stable across no-op edits", () => {
    const pos = findPosition(appText, "${total}", 2);
    const query = harness.workspace.query(appUri);
    const defs = query.definition(pos);
    const def = expectDefinition(harness, defs, {
      uriEndsWith: "/src/my-app.html",
      textIncludes: "total.bind",
    });
    expect(typeof def.symbolId).toBe("string");

    harness.updateTemplate(appUri, appText);

    const defsAfter = harness.workspace.query(appUri).definition(pos);
    const defAfter = expectDefinition(harness, defsAfter, {
      uriEndsWith: "/src/my-app.html",
      textIncludes: "total.bind",
    });
    expect(defAfter.symbolId).toBe(def.symbolId);
    expect(defAfter.uri).toBe(def.uri);
    expect(defAfter.span).toEqual(def.span);
  });

  it("keeps tag spans for nested custom elements", () => {
    const compilation = harness.workspace.getCompilation(summaryUri);
    expect(compilation).toBeTruthy();
    const spans = findElementTagSpans(compilation!.ir.templates, "pulse-dot");
    expect(spans.length).toBeGreaterThan(0);
    const offset = summaryText.indexOf("<pulse-dot");
    expect(offset).toBeGreaterThan(0);
    expect(spans.some((span) => spanContainsOffset(span, offset + 1))).toBe(true);
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
    expectSortedByContract(refsForId, appUri);
  });

  it("links custom element references for decorated elements", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "<summary-panel", 1));
    const def = expectDefinition(harness, defs, {
      uriEndsWith: "/src/views/summary-panel.ts",
      textIncludes: "SummaryPanel",
    });
    expect(typeof def.symbolId).toBe("string");

    const refs = query.references(findPosition(appText, "<summary-panel", 1));
    const refsForId = refs.filter((loc) => loc.symbolId === def.symbolId);
    const offsets = tagNameOffsets(appText, "summary-panel");
    expectReferencesAtOffsets(refsForId, appUri, offsets);
    expectSortedByContract(refsForId, appUri);
  });

  it("links static $au custom element references", () => {
    const query = harness.workspace.query(summaryUri);
    const defs = query.definition(findPosition(summaryText, "<pulse-dot", 1));
    const def = expectDefinition(harness, defs, {
      uriEndsWith: "/src/components/pulse-dot.ts",
      textIncludes: ["PulseDot", "pulse-dot"],
    });
    expect(typeof def.symbolId).toBe("string");

    const refs = query.references(findPosition(summaryText, "<pulse-dot", 1));
    const refsForId = refs.filter((loc) => loc.symbolId === def.symbolId);
    const offsets = tagNameOffsets(summaryText, "pulse-dot");
    expectReferencesAtOffsets(refsForId, summaryUri, offsets);
    expectSortedByContract(refsForId, summaryUri);
  });

  it("links nested custom element references across templates", () => {
    const defPosition = findPosition(tableText, "<status-badge", 1);
    const query = harness.workspace.query(tableUri);
    const defs = query.definition(defPosition);
    const def = expectDefinition(harness, defs, {
      uriEndsWith: "/src/components/status-badge.ts",
      textIncludes: "StatusBadge",
    });
    expect(typeof def.symbolId).toBe("string");

    const refs = query.references(findPosition(tableText, "<status-badge", 1));
    const refsForId = refs.filter((loc) => loc.symbolId === def.symbolId);
    const tableOffsets = tagNameOffsets(tableText, "status-badge");
    const detailOffsets = tagNameOffsets(detailText, "status-badge");
    expectReferencesAtOffsets(refsForId, tableUri, tableOffsets);
    expectReferencesAtOffsets(refsForId, detailUri, detailOffsets);
    expectSortedByContract(refsForId, tableUri);
  });

  it("links CustomElement.define references", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "<info-pill", 1));
    const def = expectDefinition(harness, defs, {
      uriEndsWith: "/src/resources.ts",
      textIncludes: ["InfoPill", "info-pill"],
    });
    expect(typeof def.symbolId).toBe("string");

    const refs = query.references(findPosition(appText, "<info-pill", 1));
    const refsForId = refs.filter((loc) => loc.symbolId === def.symbolId);
    const offsets = tagNameOffsets(appText, "info-pill");
    expectReferencesAtOffsets(refsForId, appUri, offsets);
    expectSortedByContract(refsForId, appUri);
  });

  it("links custom attribute references across templates", () => {
    const query = harness.workspace.query(summaryUri);
    const defs = query.definition(findPosition(summaryText, "tooltip", 1));
    const def = expectDefinition(harness, defs, {
      uriEndsWith: "/src/attributes/tooltip.ts",
      textIncludes: "Tooltip",
    });
    expect(typeof def.symbolId).toBe("string");

    const refs = query.references(findPosition(summaryText, "tooltip", 1));
    const refsForId = refs.filter((loc) => loc.symbolId === def.symbolId);
    const summaryOffsets = findOffsets(summaryText, /\btooltip\b/g);
    const tableOffsets = findOffsets(tableText, /\btooltip\b/g);
    const detailOffsets = findOffsets(detailText, /\btooltip\b/g);
    expectReferencesAtOffsets(refsForId, summaryUri, summaryOffsets);
    expectReferencesAtOffsets(refsForId, tableUri, tableOffsets);
    expectReferencesAtOffsets(refsForId, detailUri, detailOffsets);
    expectSortedByContract(refsForId, summaryUri);
  });

  it("links template controller references across templates", () => {
    const query = harness.workspace.query(summaryUri);
    const defs = query.definition(findPosition(summaryText, "if-not.bind", 1));
    const def = expectDefinition(harness, defs, {
      uriEndsWith: "/src/attributes/if-not.ts",
      textIncludes: "IfNot",
    });
    expect(typeof def.symbolId).toBe("string");

    const refs = query.references(findPosition(summaryText, "if-not.bind", 1));
    const refsForId = refs.filter((loc) => loc.symbolId === def.symbolId);
    const summaryOffsets = findOffsets(summaryText, /if-not/g);
    const tableOffsets = findOffsets(tableText, /if-not/g);
    expectReferencesAtOffsets(refsForId, summaryUri, summaryOffsets);
    expectReferencesAtOffsets(refsForId, tableUri, tableOffsets);
    expectSortedByContract(refsForId, summaryUri);
  });

  it("links binding behavior references across templates", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "debounce", 1));
    const def = expectDefinition(harness, defs, {
      uriEndsWith: "/src/binding-behaviors/debounce.ts",
      textIncludes: "DebounceBindingBehavior",
    });
    expect(typeof def.symbolId).toBe("string");

    const refs = query.references(findPosition(appText, "debounce", 1));
    const refsForId = refs.filter((loc) => loc.symbolId === def.symbolId);
    const appOffsets = findOffsets(appText, /debounce/g);
    const tableOffsets = findOffsets(tableText, /debounce/g);
    expectReferencesAtOffsets(refsForId, appUri, appOffsets);
    expectReferencesAtOffsets(refsForId, tableUri, tableOffsets);
    expectSortedByContract(refsForId, appUri);
  });

  it("links bindable references for custom elements", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "updated-at.bind", 1));
    const def = expectDefinition(harness, defs, {
      uriEndsWith: "/src/views/summary-panel.ts",
      textIncludes: "updatedAt",
    });
    expect(typeof def.symbolId).toBe("string");

    const refs = query.references(findPosition(appText, "updated-at.bind", 1));
    const refsForId = refs.filter((loc) => loc.symbolId === def.symbolId);
    const offsets = findOffsets(appText, /updated-at/g);
    expectReferencesAtOffsets(refsForId, appUri, offsets);
    expectSortedByContract(refsForId, appUri);
  });

  it("links bindable references for custom attributes", () => {
    const query = harness.workspace.query(tableUri);
    const defs = query.definition(findPosition(tableText, "tooltip.bind", 1));
    const def = expectDefinition(harness, defs, {
      uriEndsWith: "/src/attributes/tooltip.ts",
      textIncludes: "text",
    });
    expect(typeof def.symbolId).toBe("string");

    const refs = query.references(findPosition(tableText, "tooltip.bind", 1));
    const refsForId = refs.filter((loc) => loc.symbolId === def.symbolId);
    const summaryOffsets = findOffsets(summaryText, /\btooltip\b/g);
    const tableOffsets = findOffsets(tableText, /\btooltip\b/g);
    const detailOffsets = findOffsets(detailText, /\btooltip\b/g);
    expectReferencesAtOffsets(refsForId, summaryUri, summaryOffsets);
    expectReferencesAtOffsets(refsForId, tableUri, tableOffsets);
    expectReferencesAtOffsets(refsForId, detailUri, detailOffsets);
    expectSortedByContract(refsForId, tableUri);
  });

  it("links CustomAttribute.define references across templates", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "copy-to-clipboard.bind", 1));
    const def = expectDefinition(harness, defs, {
      uriEndsWith: "/src/resources.ts",
      textIncludes: "CopyToClipboard",
    });
    expect(typeof def.symbolId).toBe("string");

    const refs = query.references(findPosition(appText, "copy-to-clipboard.bind", 1));
    const refsForId = refs.filter((loc) => loc.symbolId === def.symbolId);
    const appOffsets = findOffsets(appText, /copy-to-clipboard/g);
    const detailOffsets = findOffsets(detailText, /copy-to-clipboard/g);
    expectReferencesAtOffsets(refsForId, appUri, appOffsets);
    expectReferencesAtOffsets(refsForId, detailUri, detailOffsets);
    expectSortedByContract(refsForId, appUri);
  });
});
