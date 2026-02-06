import { beforeAll, describe, expect, it } from "vitest";
import { createWorkspaceHarness } from "./harness/index.js";
import { asFixtureId } from "./fixtures/index.js";

function insertBefore(text: string, marker: string, insert: string): string {
  const index = text.indexOf(marker);
  if (index < 0) {
    throw new Error(`Marker not found: ${marker}`);
  }
  return text.slice(0, index) + insert + text.slice(index);
}

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
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    // Signature line: fenced code block with kind and name
    expect(contents).toMatch(/```ts\s*\n\(custom element\) summary-panel/);
    // Metadata: source location and bindable list
    expect(contents).toContain("Bindables");
    expect(contents).toContain("`stats`");
    // Span covers the element tag name
    expect(hover?.location?.span).toBeDefined();
    const tagStart = appText.indexOf("<summary-panel");
    expect(hover!.location!.span!.start).toBe(tagStart);
    // Stable node id
    expect(typeof hover?.location?.nodeId).toBe("string");
    expect(hover!.location!.nodeId!.length).toBeGreaterThan(0);

    const again = query.hover(pos);
    expect(again?.location?.nodeId).toBe(hover?.location?.nodeId);
  });

  it("hovers bindable attributes on custom elements", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "stats.bind", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    // Signature line: fenced block with kind and attribute name
    expect(contents).toMatch(/```ts\s*\n\(bindable\) stats/);
    // Metadata: component association
    expect(contents).toContain("component");
    // Span covers the attribute region
    expect(hover?.location?.span).toBeDefined();
    const attrStart = appText.indexOf("stats.bind");
    expect(hover!.location!.span!.start).toBeLessThanOrEqual(attrStart);
  });

  it("hovers custom attributes", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "copy-to-clipboard.bind", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    // Signature: (custom attribute) copy-to-clipboard
    expect(contents).toContain("(custom attribute)");
    expect(contents).toContain("copy-to-clipboard");
    // Metadata: bindable list with rich formatting
    expect(contents).toContain("Bindables");
    expect(contents).toContain("`value`");

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
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    // Signature line: kind and command name in fenced block
    expect(contents).toMatch(/```ts\s*\n\(binding command\) trigger/);
    // Span covers the command portion of the attribute
    expect(hover?.location?.span).toBeDefined();
  });

  it("hovers template controllers", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "if.bind", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    // Signature line: kind and controller name in fenced block
    expect(contents).toMatch(/```ts\s*\n\(template controller\) if/);
    // Metadata: bindable list from controller config
    expect(contents).toContain("Bindables");
    expect(contents).toContain("`value`");
    // Span covers the attribute
    expect(hover?.location?.span).toBeDefined();
  });

  it("hovers value converters", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "titlecase", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    // Signature line: kind and converter name in fenced block
    expect(contents).toMatch(/```ts\s*\n\(value converter\) titlecase/);
    // Span covers the converter name
    expect(hover?.location?.span).toBeDefined();
    const vcStart = appText.indexOf("titlecase");
    expect(hover!.location!.span!.start).toBeLessThanOrEqual(vcStart);
    expect(hover!.location!.span!.end).toBeGreaterThanOrEqual(vcStart + "titlecase".length);
  });

  it("hovers binding behaviors", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "debounce", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    // Signature line: kind and behavior name in fenced block
    expect(contents).toMatch(/```ts\s*\n\(binding behavior\) debounce/);
    // Span covers the behavior name
    expect(hover?.location?.span).toBeDefined();
  });

  it("hovers expressions with stable expr ids", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "activeDevice.name", "activeDevice.".length + 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    // Signature line: kind and full member expression in fenced block
    expect(contents).toMatch(/```ts\s*\n\(expression\) activeDevice\.name/);
    // Must NOT show generic fallback or duplicate type info
    expect(contents).not.toMatch(/\(expression\) expression/);
    expect(contents).not.toMatch(/\(expression\) activeDevice\.name:/);
    // Span narrows to the member access being hovered (.name), not the full expression.
    // The span includes the dot for contiguous coverage with the parent expression.
    expect(hover?.location?.span).toBeDefined();
    const exprStart = appText.indexOf("activeDevice.name");
    const memberStart = exprStart + "activeDevice".length; // starts at the dot
    expect(hover!.location!.span!.start).toBeGreaterThanOrEqual(memberStart);
    expect(hover!.location!.span!.end).toBeLessThanOrEqual(memberStart + ".name".length);
    // Stable expr id
    expect(typeof hover?.location?.exprId).toBe("string");
    expect(hover!.location!.exprId!.length).toBeGreaterThan(0);

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

  it("returns null for unknown dashed elements", async () => {
    const localHarness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    const localUri = localHarness.openTemplate("src/my-app.html");
    const localText = localHarness.readText(localUri);
    if (!localText) {
      throw new Error("Expected template text for workspace-contract my-app.html");
    }
    const mutated = insertBefore(
      localText,
      "<summary-panel",
      "  <unknown-widget></unknown-widget>\n",
    );
    localHarness.updateTemplate(localUri, mutated, 2);
    const query = localHarness.workspace.query(localUri);
    const pos = findPosition(mutated, "<unknown-widget", 1);
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

  it("renders fenced code blocks for signatures", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "<summary-panel", 1);
    const hover = query.hover(pos);
    const contents = hover?.contents ?? "";
    // Must use fenced code block for the signature
    expect(contents).toContain("```ts");
    expect(contents).toContain("```");
    // Must use --- separator between signature and metadata
    expect(contents).toContain("---");
  });

  it("renders expression labels without duplicating TS types", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "activeDevice.name", "activeDevice.".length + 1);
    const hover = query.hover(pos);
    const contents = hover?.contents ?? "";
    // Expression card shows label only — type comes from base TS hover via merge
    expect(contents).toMatch(/\(expression\) activeDevice\.name/);
    // Must NOT contain a colon after the label (no type in expression card)
    expect(contents).not.toMatch(/\(expression\) activeDevice\.name:/);
  });

  it("hovers repeat.for with iteration declaration and contextual locals", () => {
    const query = harness.workspace.query(appUri);
    // Fixture has: repeat.for="kind of deviceTypes"
    const pos = findPosition(appText, "repeat.for", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    // Signature line: kind and controller name in fenced block
    expect(contents).toMatch(/```ts\s*\n\(template controller\) repeat/);
    // Iteration declaration shown in metadata
    expect(contents).toContain("kind of deviceTypes");
    // Contextual locals from controller config
    expect(contents).toContain("`$index`");
    expect(contents).toContain("`$first`");
    expect(contents).toContain("`$last`");
    // Span covers the attribute
    expect(hover?.location?.span).toBeDefined();
  });

  it("hovers translation bindings with key, namespace, and target", () => {
    const query = harness.workspace.query(appUri);
    // Fixture has: t="[placeholder]filters.searchDevices"
    const pos = findPosition(appText, 't="[placeholder]filters.searchDevices"', 't="'.length + 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    // Signature line: kind and full key in fenced block
    expect(contents).toMatch(/```ts\s*\n\(translation\)/);
    expect(contents).toContain("filters.searchDevices");
    // Structured metadata: namespace, key, and bracket target
    expect(contents).toContain("`filters`");
    expect(contents).toContain("`searchDevices`");
    expect(contents).toContain("`placeholder`");
    // Span covers the translation attribute
    expect(hover?.location?.span).toBeDefined();
  });
});

describe("workspace hover formatting (workspace-contract table-panel)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let tableUri: string;
  let tableText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    tableUri = harness.openTemplate("src/views/table-panel.html");
    const text = harness.readText(tableUri);
    if (!text) {
      throw new Error("Expected template text for workspace-contract table-panel.html");
    }
    tableText = text;
  });

  it("shows attribute names (kebab-case) in bindable list, not property names", () => {
    const query = harness.workspace.query(tableUri);
    // aurelia-table has displayData with attribute: "display-data"
    const pos = findPosition(tableText, "aurelia-table=", 1);
    const hover = query.hover(pos);
    const contents = hover?.contents ?? "";
    expect(contents).toContain("(custom attribute)");
    expect(contents).toContain("aurelia-table");
    // Bindable list must show attribute name "display-data", not property name "displayData"
    expect(contents).toContain("`display-data`");
    expect(contents).not.toContain("`displayData`");
  });

  it("shows binding mode in kebab-case (two-way) not camelCase (twoWay)", () => {
    const query = harness.workspace.query(tableUri);
    const pos = findPosition(tableText, "aurelia-table=", 1);
    const hover = query.hover(pos);
    const contents = hover?.contents ?? "";
    // Mode must display as "two-way", not "twoWay"
    expect(contents).toContain("two-way");
    expect(contents).not.toContain("twoWay");
  });

  it("shows attribute name in individual bindable card signature", () => {
    const query = harness.workspace.query(tableUri);
    // Hover on "display-data.bind" should show attribute name in bindable card
    const pos = findPosition(tableText, "display-data.bind", 1);
    const hover = query.hover(pos);
    const contents = hover?.contents ?? "";
    expect(contents).toContain("(bindable) display-data");
    expect(contents).not.toContain("(bindable) displayData");
  });

  it("hovers first expression in multi-binding with correct label and tight span", () => {
    const query = harness.workspace.query(tableUri);
    // Hover on "items" in "data.bind: items; display-data.bind: displayItems; ..."
    const itemsPos = findPosition(tableText, "data.bind: items;", "data.bind: ".length + 1);
    const hover = query.hover(itemsPos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    // Signature line: exact expression label in fenced block, not generic fallback
    expect(contents).toMatch(/```ts\s*\n\(expression\) items/);
    expect(contents).not.toMatch(/\(expression\) expression/);
    // Span must be tight to the expression value, not the entire attribute
    expect(hover?.location?.span).toBeDefined();
    const attrValueStart = tableText.indexOf('"data.bind: items;') + 1;
    const itemsStart = attrValueStart + "data.bind: ".length;
    expect(hover!.location!.span!.start).toBeGreaterThanOrEqual(itemsStart);
    expect(hover!.location!.span!.end).toBeLessThanOrEqual(itemsStart + "items".length);
    // Expr id must be present
    expect(typeof hover?.location?.exprId).toBe("string");
  });

  it("hovers second expression in multi-binding with correct label and tight span", () => {
    const query = harness.workspace.query(tableUri);
    // Hover on "displayItems" in "display-data.bind: displayItems;"
    const pos = findPosition(tableText, "display-data.bind: displayItems;", "display-data.bind: ".length + 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    // Signature line: exact expression label in fenced block, not generic fallback
    expect(contents).toMatch(/```ts\s*\n\(expression\) displayItems/);
    expect(contents).not.toMatch(/\(expression\) expression/);
    // Span must be tight to the expression value, not the entire attribute
    expect(hover?.location?.span).toBeDefined();
    const displayItemsStart = tableText.indexOf("display-data.bind: displayItems;") + "display-data.bind: ".length;
    expect(hover!.location!.span!.start).toBeGreaterThanOrEqual(displayItemsStart);
    expect(hover!.location!.span!.end).toBeLessThanOrEqual(displayItemsStart + "displayItems".length);
    // Expr id must be present
    expect(typeof hover?.location?.exprId).toBe("string");
  });

  it("shows source file path for local resources (not node_modules)", () => {
    const query = harness.workspace.query(tableUri);
    const pos = findPosition(tableText, "aurelia-table=", 1);
    const hover = query.hover(pos);
    const contents = hover?.contents ?? "";
    // Local resource should show file path, not a package name
    expect(contents).toContain("aurelia-table.ts");
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
