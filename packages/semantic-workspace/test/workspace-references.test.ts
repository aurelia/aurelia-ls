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

function compareReferenceOrder(
  a: { uri: string; span: { start: number; end: number }; symbolId?: string; exprId?: string; nodeId?: string },
  b: { uri: string; span: { start: number; end: number }; symbolId?: string; exprId?: string; nodeId?: string },
  currentUri: string,
): number {
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
}

function expectOrderedReferences(
  refs: readonly { uri: string; span: { start: number; end: number }; symbolId?: string; exprId?: string; nodeId?: string }[],
  currentUri: string,
): void {
  for (let i = 1; i < refs.length; i += 1) {
    const prev = refs[i - 1];
    const next = refs[i];
    expect(
      compareReferenceOrder(prev, next, currentUri) <= 0,
      `Expected ordered references, got ${String(prev?.uri)} before ${String(next?.uri)}`,
    ).toBe(true);
  }
}

function expectNoDuplicateReferenceSpans(
  refs: readonly { uri: string; span: { start: number; end: number } }[],
): void {
  const seen = new Set<string>();
  for (const ref of refs) {
    const key = `${String(ref.uri)}:${ref.span.start}:${ref.span.end}`;
    expect(seen.has(key), `Duplicate reference span: ${key}`).toBe(false);
    seen.add(key);
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
  let inlineComponentUri: string;
  let inlineComponentText: string;
  let inlineTemplateUri: string;
  let inlineTemplateText: string;

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

    const inlineEntry = harness.inlineTemplates.find((entry) =>
      entry.componentPath.endsWith("inline-note.ts"),
    );
    if (!inlineEntry) {
      throw new Error("Expected inline template entry for inline-note.ts");
    }
    inlineTemplateUri = inlineEntry.uri;
    inlineTemplateText = inlineEntry.content ?? "";
    inlineComponentUri = harness.toDocumentUri(inlineEntry.componentPath);
    const inlineComponent = harness.readText(inlineComponentUri);
    if (!inlineComponent || !inlineTemplateText) {
      throw new Error("Expected inline template content for inline-note");
    }
    inlineComponentText = inlineComponent;
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

  it("orders and dedupes cross-file references", () => {
    const query = harness.workspace.query(tableUri);
    const refs = query.references(findPosition(tableText, "item.rating", "item.".length));
    expectOrderedReferences(refs, tableUri);
    expectNoDuplicateReferenceSpans(refs);

    const hasCurrent = refs.some((loc) => String(loc.uri) === String(tableUri));
    if (hasCurrent) {
      let seenOther = false;
      for (const loc of refs) {
        const isCurrent = String(loc.uri) === String(tableUri);
        if (!isCurrent) {
          seenOther = true;
        } else {
          expect(seenOther).toBe(false);
        }
      }
    }
  });

  it("finds template references when starting from TypeScript symbols", () => {
    const query = harness.workspace.query(viewModelUri);
    const refs = query.references(findPosition(viewModelText, "viewMode:", 1));
    const offsets = findOffsets(appText, /\bviewMode\b/g);
    expectReferencesAtOffsets(refs, appUri, offsets);
    expectOrderedReferences(refs, viewModelUri);
    expectNoDuplicateReferenceSpans(refs);
  });

  it("finds template call references when starting from TypeScript symbols", () => {
    const query = harness.workspace.query(viewModelUri);
    const resetRefs = query.references(findPosition(viewModelText, "resetFilters()", 1));
    const resetOffsets = findOffsets(appText, /\bresetFilters\b/g);
    expectReferencesAtOffsets(resetRefs, appUri, resetOffsets);
    expectOrderedReferences(resetRefs, viewModelUri);
    expectNoDuplicateReferenceSpans(resetRefs);

    const selectRefs = query.references(findPosition(viewModelText, "selectDevice(", 1));
    const selectOffsets = findOffsets(appText, /\bselectDevice\b/g);
    expectReferencesAtOffsets(selectRefs, appUri, selectOffsets);
    expectOrderedReferences(selectRefs, viewModelUri);
    expectNoDuplicateReferenceSpans(selectRefs);
  });

  it("finds inline template references when starting from TypeScript symbols", () => {
    const query = harness.workspace.query(inlineComponentUri);
    const refs = query.references(
      findPosition(inlineComponentText, "@bindable message", "@bindable ".length + 1),
    );
    const offsets = findOffsets(inlineTemplateText, /\bmessage\b/g);
    expectReferencesAtOffsets(refs, inlineTemplateUri, offsets);
    expectOrderedReferences(refs, inlineComponentUri);
    expectNoDuplicateReferenceSpans(refs);
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
    expectOrderedReferences(refs, appUri);
    expectNoDuplicateReferenceSpans(refs);
    const refSymbolIds = new Set(
      refs.map((loc) => loc.symbolId).filter((id): id is string => !!id)
    );
    expect(refSymbolIds).toEqual(new Set([autSort!.symbolId as string]));
  });

  it("uses simple import aliases for custom attributes", () => {
    const tooltipIndex = appText.indexOf("tooltip=\"Refresh\"");
    if (tooltipIndex < 0) {
      throw new Error("Expected tooltip attribute in template-import-alias-conflicts");
    }
    const tooltipOffset = tooltipIndex + 1;
    const query = harness.workspace.query(appUri);
    const defs = query.definition(positionAt(appText, tooltipOffset));
    const autSort = defs.find((loc) =>
      String(loc.uri).endsWith("/src/attributes/aut-sort.ts")
    );
    expect(autSort?.symbolId).toBeDefined();

    const refs = query.references(positionAt(appText, tooltipOffset));
    expectReferencesAtOffsets(refs, appUri, [tooltipOffset]);
    expectOrderedReferences(refs, appUri);
    expectNoDuplicateReferenceSpans(refs);
    const refSymbolIds = new Set(
      refs.map((loc) => loc.symbolId).filter((id): id is string => !!id)
    );
    expect(refSymbolIds).toEqual(new Set([autSort!.symbolId as string]));
  });
});

describe("workspace references (third-party resources)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("template-imports-aurelia2-table"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    const app = harness.readText(appUri);
    if (!app) {
      throw new Error("Expected template text for template-imports-aurelia2-table");
    }
    appText = app;
  });

  it("finds references for third-party elements and attributes", () => {
    const query = harness.workspace.query(appUri);

    const elementOffset = appText.indexOf("aut-pagination");
    if (elementOffset < 0) {
      throw new Error("Expected aut-pagination element in template-imports-aurelia2-table");
    }
    const elementRefs = query.references(positionAt(appText, elementOffset + 1));
    expectReferencesAtOffsets(elementRefs, appUri, [elementOffset]);
    const elementSymbolIds = new Set(
      elementRefs.map((loc) => loc.symbolId).filter((id): id is string => !!id),
    );
    expect(elementSymbolIds.size).toBe(1);

    const attributeOffset = appText.indexOf("aurelia-table");
    if (attributeOffset < 0) {
      throw new Error("Expected aurelia-table attribute in template-imports-aurelia2-table");
    }
    const attributeRefs = query.references(positionAt(appText, attributeOffset + 1));
    expectReferencesAtOffsets(attributeRefs, appUri, [attributeOffset]);
    const attributeSymbolIds = new Set(
      attributeRefs.map((loc) => loc.symbolId).filter((id): id is string => !!id),
    );
    expect(attributeSymbolIds.size).toBe(1);
  });
});
