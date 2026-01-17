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

describe("workspace definition (workspace-contract)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;
  let summaryUri: string;
  let summaryText: string;
  let tableUri: string;
  let tableText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    summaryUri = harness.openTemplate("src/views/summary-panel.html");
    tableUri = harness.openTemplate("src/views/table-panel.html");

    const app = harness.readText(appUri);
    const summary = harness.readText(summaryUri);
    const table = harness.readText(tableUri);
    if (!app || !summary || !table) {
      throw new Error("Expected template text for workspace-contract fixtures");
    }
    appText = app;
    summaryText = summary;
    tableText = table;
  });

  it("resolves custom element definitions with symbol ids", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "<summary-panel", 1));
    const hit = expectDefinition(harness, defs, {
      uriEndsWith: "/src/views/summary-panel.ts",
      textIncludes: "SummaryPanel",
    });
    expect(typeof hit.symbolId).toBe("string");
  });

  it("resolves <import> definition targets", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "./views/summary-panel", 2));
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/views/summary-panel.ts",
      textIncludes: "SummaryPanel",
    });
  });

  it("resolves inline custom elements", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "<inline-note", 1));
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/components/inline-note.ts",
      textIncludes: "InlineNote",
    });
  });

  it("resolves custom attribute definitions", () => {
    const appQuery = harness.workspace.query(appUri);
    const copyDefs = appQuery.definition(findPosition(appText, "copy-to-clipboard.bind", 1));
    expectDefinition(harness, copyDefs, {
      uriEndsWith: "/src/resources.ts",
      textIncludes: "CopyToClipboard",
    });

    const summaryQuery = harness.workspace.query(summaryUri);
    const tooltipDefs = summaryQuery.definition(findPosition(summaryText, "tooltip", 1));
    expectDefinition(harness, tooltipDefs, {
      uriEndsWith: "/src/attributes/tooltip.ts",
      textIncludes: "Tooltip",
    });

    const tableQuery = harness.workspace.query(tableUri);
    const tableDefs = tableQuery.definition(findPosition(tableText, "aurelia-table", 1));
    expectDefinition(harness, tableDefs, {
      uriEndsWith: "/src/attributes/aurelia-table.ts",
      textIncludes: "AureliaTable",
    });
  });

  it("resolves bindable definitions", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "updated-at.bind", 1));
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/views/summary-panel.ts",
      textIncludes: "updatedAt",
    });
  });

  it("resolves template controller definitions", () => {
    const query = harness.workspace.query(summaryUri);
    const defs = query.definition(findPosition(summaryText, "if-not.bind", 1));
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/attributes/if-not.ts",
      textIncludes: "IfNot",
    });
  });

  it("resolves value converters and binding behaviors", () => {
    const summaryQuery = harness.workspace.query(summaryUri);
    const titleDefs = summaryQuery.definition(findPosition(summaryText, "titlecase", 1));
    expectDefinition(harness, titleDefs, {
      uriEndsWith: "/src/value-converters/titlecase.ts",
      textIncludes: "TitleCaseValueConverter",
    });

    const shortenDefs = summaryQuery.definition(findPosition(summaryText, "shorten", 1));
    expectDefinition(harness, shortenDefs, {
      uriEndsWith: "/src/resources.ts",
      textIncludes: "ShortenValueConverter",
    });

    const appQuery = harness.workspace.query(appUri);
    const debounceDefs = appQuery.definition(findPosition(appText, "debounce", 1));
    expectDefinition(harness, debounceDefs, {
      uriEndsWith: "/src/binding-behaviors/debounce.ts",
      textIncludes: "DebounceBindingBehavior",
    });
  });

  it("resolves expression definitions via TypeScript", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "filters.search", 1));
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/my-app.ts",
      textIncludes: "filters",
    });
  });

  it("resolves <let> variable definitions", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "${total}", 2);
    const defs = query.definition(pos);
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/my-app.html",
      textIncludes: "total.bind",
    });
  });

  it("resolves repeat.for iterator definitions", () => {
    const tableQuery = harness.workspace.query(tableUri);
    const defs = tableQuery.definition(findPosition(tableText, "choose(item)", "choose(".length));
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/views/table-panel.html",
      textIncludes: "item of displayItems",
    });
  });
});
