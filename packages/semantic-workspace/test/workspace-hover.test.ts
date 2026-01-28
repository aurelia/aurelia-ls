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

describe("workspace hover (workspace-contract)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    const text = harness.readText(appUri);
    if (!text) {
      throw new Error("Expected template text for workspace-contract my-app.html");
    }
    appText = text;
  });

  it("hovers custom elements with stable node ids", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "<summary-panel", 1);
    const hover = query.hover(pos);
    expect(hover?.contents ?? "").toContain("Custom Element");
    expect(hover?.contents ?? "").toContain("summary-panel");
    // Enriched: source file and bindable list
    expect(hover?.contents ?? "").toContain("Defined in");
    expect(hover?.contents ?? "").toContain("Bindables");
    expect(hover?.contents ?? "").toContain("stats");
    expect(typeof hover?.location?.nodeId).toBe("string");

    const again = query.hover(pos);
    expect(again?.location?.nodeId).toBe(hover?.location?.nodeId);
  });

  it("hovers bindable attributes on custom elements", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "stats.bind", 1);
    const hover = query.hover(pos);
    const contents = hover?.contents ?? "";
    expect(contents).toContain("Bindable");
    expect(contents).toContain("stats");
    expect(contents).toContain("component");
  });

  it("hovers custom attributes", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "copy-to-clipboard.bind", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    expect(contents).toContain("Custom Attribute");
    expect(contents).toContain("copy-to-clipboard");
    // Enriched: bindable list
    expect(contents).toContain("Bindables");
    expect(contents).toContain("value");

    // Span must cover the attribute, not the entire host element
    const attrStart = appText.indexOf("copy-to-clipboard.bind");
    const elementStart = appText.lastIndexOf("<button", attrStart);
    expect(hover?.location?.span).toBeDefined();
    expect(hover!.location!.span!.start).toBeGreaterThanOrEqual(attrStart);
    expect(hover!.location!.span!.start).not.toBe(elementStart);

    // No raw debug strings like "node: element" in user-facing hover
    expect(contents).not.toMatch(/^node:/m);
  });

  it("hovers binding commands", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "click.trigger", "click.".length + 1);
    const hover = query.hover(pos);
    expect(hover?.contents ?? "").toContain("Binding Command");
    expect(hover?.contents ?? "").toContain("trigger");
  });

  it("hovers template controllers", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "if.bind", 1);
    const hover = query.hover(pos);
    const contents = hover?.contents ?? "";
    expect(contents).toContain("Template Controller");
    expect(contents).toContain("if");
    // Enriched: bindable list from controller config
    expect(contents).toContain("Bindables");
    expect(contents).toContain("value");
  });

  it("hovers value converters", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "titlecase", 1);
    const hover = query.hover(pos);
    expect(hover?.contents ?? "").toContain("Value Converter");
    expect(hover?.contents ?? "").toContain("titlecase");
  });

  it("hovers binding behaviors", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "debounce", 1);
    const hover = query.hover(pos);
    expect(hover?.contents ?? "").toContain("Binding Behavior");
    expect(hover?.contents ?? "").toContain("debounce");
  });

  it("hovers expressions with stable expr ids", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "activeDevice.name", "activeDevice.".length + 1);
    const hover = query.hover(pos);
    expect(hover?.contents ?? "").toContain("Expression");
    expect(hover?.contents ?? "").toContain("activeDevice.name");
    expect(typeof hover?.location?.exprId).toBe("string");

    const again = query.hover(pos);
    expect(again?.location?.exprId).toBe(hover?.location?.exprId);
  });

  it("returns null for native HTML elements", () => {
    const query = harness.workspace.query(appUri);
    // Hover the opening <div in '<div class="toolbar">'
    const pos = findPosition(appText, '<div class="toolbar">', 1);
    const hover = query.hover(pos);
    // Native elements should not produce Aurelia hover content
    expect(hover).toBeNull();
  });

  it("returns null for static attributes on native elements", () => {
    const query = harness.workspace.query(appUri);
    // Hover the static 'type' in '<input type="text" ...>'
    const pos = findPosition(appText, 'type="text"', 1);
    const hover = query.hover(pos);
    expect(hover).toBeNull();
  });

  it("returns null for whitespace between elements", () => {
    const query = harness.workspace.query(appUri);
    // Position in the whitespace/text node between </let> and <header>
    const letEnd = appText.indexOf("</let>") + "</let>".length;
    const headerStart = appText.indexOf("<header");
    const midpoint = Math.floor((letEnd + headerStart) / 2);
    const pos = positionAt(appText, midpoint);
    const hover = query.hover(pos);
    expect(hover).toBeNull();
  });

  it("hovers import meta elements", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "<import", 1);
    const hover = query.hover(pos);
    expect(hover?.contents ?? "").toContain("<import>");
    expect(hover?.contents ?? "").toContain("Import Aurelia resources");
  });
});

describe("workspace hover (meta elements)", () => {
  it("hovers bindable meta elements", async () => {
    const metaHarness = await createWorkspaceHarness({
      fixtureId: asFixtureId("rename-cascade-basic"),
      openTemplates: "none",
    });
    const uri = metaHarness.openTemplate("src/my-element.html");
    const text = metaHarness.readText(uri);
    if (!text) {
      throw new Error("Expected template text for rename-cascade-basic my-element.html");
    }

    const hover = metaHarness.workspace.query(uri).hover(findPosition(text, "<bindable", 1));
    expect(hover?.contents ?? "").toContain("<bindable>");
    expect(hover?.contents ?? "").toContain("Declare a bindable property");
  });
});
