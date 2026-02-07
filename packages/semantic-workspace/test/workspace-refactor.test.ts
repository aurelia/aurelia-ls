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

function expectRenameEditsAtOffsets(
  edits: readonly { uri: string; span: { start: number; end: number }; newText: string }[],
  uri: string,
  offsets: readonly number[],
  newName: string,
): void {
  for (const offset of offsets) {
    const hit = edits.find((edit) => String(edit.uri) === String(uri) && spanCoversOffset(edit.span, offset));
    expect(hit, `Rename edit not found at offset ${offset} in ${String(uri)}`).toBeDefined();
    if (hit) {
      expect(hit.newText.includes(newName)).toBe(true);
    }
  }
}

describe("workspace refactor (workspace-contract)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let tableUri: string;
  let tableText: string;
  let detailUri: string;
  let detailText: string;
  let modelsUri: string;
  let modelsText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    tableUri = harness.openTemplate("src/views/table-panel.html");
    detailUri = harness.toDocumentUri("src/components/device-detail.html");
    modelsUri = harness.toDocumentUri("src/models.ts");

    const table = harness.readText(tableUri);
    const detail = harness.readText(detailUri);
    const models = harness.readText(modelsUri);
    if (!table || !detail || !models) {
      throw new Error("Expected template text for workspace-contract fixtures");
    }
    tableText = table;
    detailText = detail;
    modelsText = models;
  });

  it("renames property references across templates", () => {
    const position = findPosition(tableText, "item.rating", "item.".length);
    const result = harness.workspace.refactor().rename({
      uri: tableUri,
      position,
      newName: "score",
    });

    if ("error" in result) {
      throw new Error(`Rename failed: ${result.error.message}`);
    }

    const edits = result.edit.edits;
    const tableOffsets = findOffsets(tableText, /item\.rating/g).map((offset) => offset + "item.".length);
    expectRenameEditsAtOffsets(edits, tableUri, tableOffsets, "score");

    const detailOffsets = findOffsets(detailText, /device\.rating/g).map((offset) => offset + "device.".length);
    expectRenameEditsAtOffsets(edits, detailUri, detailOffsets, "score");

    const modelsOffset = modelsText.indexOf("rating: number");
    if (modelsOffset < 0) {
      throw new Error("Expected rating property in models.ts");
    }
    expectRenameEditsAtOffsets(edits, modelsUri, [modelsOffset], "score");
  });
});

describe("workspace refactor (rename-cascade-basic)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;
  let elementUri: string;
  let elementText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("rename-cascade-basic"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/app.html");
    elementUri = harness.toDocumentUri("src/my-element.ts");

    const app = harness.readText(appUri);
    const element = harness.readText(elementUri);
    if (!app || !element) {
      throw new Error("Expected template text for rename-cascade-basic fixtures");
    }
    appText = app;
    elementText = element;
  });

  it("renames custom element tags and definition names", () => {
    const position = findPosition(appText, "<my-element", 1);
    const result = harness.workspace.refactor().rename({
      uri: appUri,
      position,
      newName: "my-widget",
    });

    if ("error" in result) {
      throw new Error(`Rename failed: ${result.error.message}`);
    }

    const edits = result.edit.edits;
    const openOffsets = findOffsets(appText, /<my-element/g).map((offset) => offset + 1);
    const closeOffsets = findOffsets(appText, /<\/my-element>/g).map((offset) => offset + 2);
    expectRenameEditsAtOffsets(edits, appUri, [...openOffsets, ...closeOffsets], "my-widget");

    const defMarker = 'name: "my-element"';
    const defOffset = elementText.indexOf(defMarker);
    if (defOffset < 0) {
      throw new Error("Expected custom element name in my-element.ts");
    }
    expectRenameEditsAtOffsets(edits, elementUri, [defOffset + 'name: "'.length], "my-widget");
  });

  it("renames bindable attribute usages and definitions", () => {
    const position = findPosition(appText, "heading.bind", 1);
    const result = harness.workspace.refactor().rename({
      uri: appUri,
      position,
      newName: "subtitle",
    });

    if ("error" in result) {
      throw new Error(`Rename failed: ${result.error.message}`);
    }

    const edits = result.edit.edits;
    const attrOffsets = findOffsets(appText, /heading\.bind/g);
    expectRenameEditsAtOffsets(edits, appUri, attrOffsets, "subtitle");

    const defOffset = elementText.indexOf("heading");
    if (defOffset < 0) {
      throw new Error("Expected bindable attribute override in my-element.ts");
    }
    expectRenameEditsAtOffsets(edits, elementUri, [defOffset], "subtitle");
  });
});

describe("workspace refactor (workspace-contract resources)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let tableUri: string;
  let tableText: string;
  let appUri: string;
  let appText: string;
  let summaryUri: string;
  let summaryText: string;
  let statusUri: string;
  let statusText: string;
  let converterUri: string;
  let converterText: string;
  let behaviorUri: string;
  let behaviorText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    tableUri = harness.openTemplate("src/views/table-panel.html");
    appUri = harness.toDocumentUri("src/my-app.html");
    summaryUri = harness.toDocumentUri("src/views/summary-panel.html");
    statusUri = harness.toDocumentUri("src/components/status-badge.html");
    converterUri = harness.toDocumentUri("src/value-converters/titlecase.ts");
    behaviorUri = harness.toDocumentUri("src/binding-behaviors/debounce.ts");

    const table = harness.readText(tableUri);
    const app = harness.readText(appUri);
    const summary = harness.readText(summaryUri);
    const status = harness.readText(statusUri);
    const converter = harness.readText(converterUri);
    const behavior = harness.readText(behaviorUri);
    if (!table || !app || !summary || !status || !converter || !behavior) {
      throw new Error("Expected template text for workspace-contract fixtures");
    }
    tableText = table;
    appText = app;
    summaryText = summary;
    statusText = status;
    converterText = converter;
    behaviorText = behavior;
  });

  it("renames value converter usage and definition", () => {
    const position = findPosition(tableText, "titlecase", 1);
    const result = harness.workspace.refactor().rename({
      uri: tableUri,
      position,
      newName: "headline",
    });

    if ("error" in result) {
      throw new Error(`Rename failed: ${result.error.message}`);
    }

    const edits = result.edit.edits;
    const tableOffsets = findOffsets(tableText, /\btitlecase\b/g);
    const appOffsets = findOffsets(appText, /\btitlecase\b/g);
    const summaryOffsets = findOffsets(summaryText, /\btitlecase\b/g);
    const statusOffsets = findOffsets(statusText, /\btitlecase\b/g);
    expectRenameEditsAtOffsets(edits, tableUri, tableOffsets, "headline");
    expectRenameEditsAtOffsets(edits, appUri, appOffsets, "headline");
    expectRenameEditsAtOffsets(edits, summaryUri, summaryOffsets, "headline");
    expectRenameEditsAtOffsets(edits, statusUri, statusOffsets, "headline");

    const defOffset = converterText.indexOf("titlecase");
    if (defOffset < 0) {
      throw new Error("Expected value converter name in titlecase.ts");
    }
    expectRenameEditsAtOffsets(edits, converterUri, [defOffset], "headline");
  });

  it("renames binding behavior usage and definition", () => {
    const position = findPosition(tableText, "debounce", 1);
    const result = harness.workspace.refactor().rename({
      uri: tableUri,
      position,
      newName: "rate-limit",
    });

    if ("error" in result) {
      throw new Error(`Rename failed: ${result.error.message}`);
    }

    const edits = result.edit.edits;
    const tableOffsets = findOffsets(tableText, /\bdebounce\b/g);
    const appOffsets = findOffsets(appText, /\bdebounce\b/g);
    expectRenameEditsAtOffsets(edits, tableUri, tableOffsets, "rate-limit");
    expectRenameEditsAtOffsets(edits, appUri, appOffsets, "rate-limit");

    const defOffset = behaviorText.indexOf("debounce");
    if (defOffset < 0) {
      throw new Error("Expected binding behavior name in debounce.ts");
    }
    expectRenameEditsAtOffsets(edits, behaviorUri, [defOffset], "rate-limit");
  });
});
