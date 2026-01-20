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

describe("workspace references (workspace-contract)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;
  let tableUri: string;
  let tableText: string;
  let detailUri: string;
  let detailText: string;
  let modelsUri: string;
  let modelsText: string;
  let viewModelUri: string;
  let viewModelText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    tableUri = harness.openTemplate("src/views/table-panel.html");
    detailUri = harness.toDocumentUri("src/components/device-detail.html");
    modelsUri = harness.toDocumentUri("src/models.ts");
    viewModelUri = harness.toDocumentUri("src/my-app.ts");

    const app = harness.readText(appUri);
    const table = harness.readText(tableUri);
    const detail = harness.readText(detailUri);
    const models = harness.readText(modelsUri);
    const viewModel = harness.readText(viewModelUri);
    if (!app || !table || !detail || !models || !viewModel) {
      throw new Error("Expected template text for workspace-contract fixtures");
    }
    appText = app;
    tableText = table;
    detailText = detail;
    modelsText = models;
    viewModelText = viewModel;
  });

  it("finds <let> references", () => {
    const query = harness.workspace.query(appUri);
    const refs = query.references(findPosition(appText, "${total}", 2));
    const offsets = findOffsets(appText, /\btotal\b/);
    expect(refs.length).toBe(offsets.length);
    expectReferencesAtOffsets(refs, appUri, offsets);
  });

  it("finds repeat iterator references", () => {
    const query = harness.workspace.query(tableUri);
    const refs = query.references(findPosition(tableText, "choose(item)", "choose(".length));
    const offsets = findOffsets(tableText, /\bitem\b/);
    expect(refs.length).toBe(offsets.length);
    expectReferencesAtOffsets(refs, tableUri, offsets);
  });

  it("finds cross-file references via TypeScript", () => {
    const query = harness.workspace.query(tableUri);
    const refs = query.references(findPosition(tableText, "item.rating", "item.".length));
    const detailOffsets = findOffsets(detailText, /device\.rating/g).map((offset) => offset + "device.".length);
    expectReferencesAtOffsets(refs, detailUri, detailOffsets);
    const modelsOffset = modelsText.indexOf("rating: number");
    if (modelsOffset < 0) {
      throw new Error("Expected rating property in models.ts");
    }
    expectReferencesAtOffsets(refs, modelsUri, [modelsOffset]);
  });

  it("finds template references when starting from TypeScript symbols", () => {
    const query = harness.workspace.query(viewModelUri);
    const refs = query.references(findPosition(viewModelText, "viewMode:", 1));
    const offsets = findOffsets(appText, /\bviewMode\b/g);
    expectReferencesAtOffsets(refs, appUri, offsets);
  });
});

describe("workspace references (import alias conflicts)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("template-import-alias-conflicts"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    const app = harness.readText(appUri);
    if (!app) {
      throw new Error("Expected template text for template-import-alias-conflicts");
    }
    appText = app;
  });

  it("uses named import alias references for custom attributes", () => {
    const badgeIndex = appText.indexOf("badge=\"Primary\"");
    if (badgeIndex < 0) {
      throw new Error("Expected badge attribute in template-import-alias-conflicts");
    }
    const badgeOffset = badgeIndex + 1;
    const query = harness.workspace.query(appUri);
    const defs = query.definition(positionAt(appText, badgeOffset));
    const autSort = defs.find((loc) =>
      String(loc.uri).endsWith("/src/attributes/aut-sort.ts")
    );
    expect(autSort?.symbolId).toBeDefined();

    const refs = query.references(positionAt(appText, badgeOffset));
    expectReferencesAtOffsets(refs, appUri, [badgeOffset]);
    const refSymbolIds = new Set(
      refs.map((loc) => loc.symbolId).filter((id): id is string => !!id)
    );
    expect(refSymbolIds).toEqual(new Set([autSort!.symbolId as string]));
  });
});
