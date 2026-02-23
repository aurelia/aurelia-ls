import { beforeAll, describe, expect, it } from "vitest";
import { createWorkspaceHarness } from "./harness/index.js";
import { asFixtureId } from "./fixtures/index.js";
import type { SemanticWorkspaceEngine } from "../src/engine.js";

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

// ── R7: Hover channel switch — definition authority and confidence ─────────

describe("R7: hover provenance from definition authority (workspace-contract)", () => {
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

  // Pattern T: Hover on a resource from the definition authority shows provenance origin
  it("shows provenance origin for custom elements (Pattern T)", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "<summary-panel", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    // Provenance indicator from Sourced<T>.origin
    expect(contents).toContain("Discovered via source analysis");
    // Existing content preserved: signature, bindables, file path
    expect(contents).toMatch(/```ts\s*\n\(custom element\) summary-panel/);
    expect(contents).toContain("Bindables");
    // Card structure preserved: fenced code block + separator + metadata
    expect(contents).toContain("```ts");
    expect(contents).toContain("---");
  });

  // Pattern T variant: provenance for custom attributes (programmatic define)
  it("shows provenance origin for custom attributes (Pattern T)", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "copy-to-clipboard.bind", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    // Custom attributes defined via CustomAttribute.define() should have provenance
    expect(contents).toContain("(custom attribute)");
    expect(contents).toContain("copy-to-clipboard");
    // Programmatic define is 'source' origin — assert specifically, not alternation
    expect(contents).toContain("Discovered via source analysis");
  });

  // Pattern V: Hover on a non-gapped resource does not set confidence
  it("does not set confidence for non-gapped resources (Pattern V)", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "<summary-panel", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    // The workspace-contract fixture has fully-resolved resources — no gaps
    expect(hover?.confidence).toBeUndefined();
    // Provenance is still present
    expect(hover?.contents ?? "").toContain("Discovered via source analysis");
  });

  // Pattern W: Hover on native HTML elements remains null
  it("returns null for native HTML elements (Pattern W)", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, '<div class="toolbar">', 1);
    const hover = query.hover(pos);
    // Native elements produce no hover — unchanged by R7
    expect(hover).toBeNull();
  });

  // Pattern X: Hover augmentation preserves existing content structure
  it("preserves existing content structure with provenance added (Pattern X)", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "<summary-panel", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";

    // All existing content elements must be present
    expect(contents).toMatch(/```ts\s*\n\(custom element\) summary-panel/);
    expect(contents).toContain("Bindables");
    expect(contents).toContain("`stats`");
    expect(contents).toContain("Show overlay");

    // Provenance line is present and does not duplicate file path
    expect(contents).toContain("Discovered via source analysis");
    // Only one occurrence of provenance — no duplication
    const provenanceCount = (contents.match(/Discovered via source analysis/g) ?? []).length;
    expect(provenanceCount).toBe(1);

    // Span and node id still work
    expect(hover?.location?.span).toBeDefined();
    expect(hover?.location?.nodeId).toBeDefined();
  });

  // Pattern X variant: value converter hover preserves structure
  it("shows provenance for value converters (Pattern X)", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "titlecase", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    expect(contents).toMatch(/```ts\s*\n\(value converter\) titlecase/);
    // VC defined via @valueConverter("titlecase") — source origin
    expect(contents).toContain("Discovered via source analysis");
    expect(hover?.confidence).toBeUndefined();
  });

  // Pattern X variant: binding behavior hover preserves structure
  it("shows provenance for binding behaviors (Pattern X)", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "debounce", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    expect(contents).toMatch(/```ts\s*\n\(binding behavior\) debounce/);
    // BB defined via @bindingBehavior("debounce") — source origin
    expect(contents).toContain("Discovered via source analysis");
    expect(hover?.confidence).toBeUndefined();
  });

  // Verify degradation field is structurally accessible (R6 prerequisite for R7)
  it("compilation degradation is accessible and clean for non-gapped fixture", () => {
    const engine = harness.workspace as SemanticWorkspaceEngine;
    const compilation = engine.getCompilation(appUri);
    expect(compilation).not.toBeNull();
    expect(compilation!.degradation).toBeDefined();
    expect(compilation!.degradation.hasGaps).toBe(false);
    expect(compilation!.degradation.gapQualifiedCount).toBe(0);
    expect(compilation!.degradation.affectedResources).toEqual([]);
  });

  // ── Seam-crossing property test ──────────────────────────────────────────
  // The adversarial testing landscape says: "zero tests that Sourced<T>
  // wrappings survive any pipeline stage transition." This test reads
  // Sourced<T>.origin from the definition authority, then verifies the
  // corresponding provenance text appears in hover — proving the origin
  // survived the definition-authority → engine → hover content seam.
  it("Sourced<T>.origin from definition authority survives to hover content", () => {
    const engine = harness.workspace as SemanticWorkspaceEngine;
    const authority = engine.projectIndex.currentModel().discovery.definition.authority;

    // Find summary-panel in the definition authority
    const summaryDef = authority.find(
      (def) => def.kind === "custom-element" && def.name.origin === "source" && def.name.value === "summary-panel",
    );
    expect(summaryDef).toBeDefined();
    expect(summaryDef!.name.origin).toBe("source");

    // Now hover and verify the origin survived to the hover content
    const query = harness.workspace.query(appUri);
    const hover = query.hover(findPosition(appText, "<summary-panel", 1));
    expect(hover).not.toBeNull();
    // "source" origin → "Discovered via source analysis" — exact correspondence
    expect(hover?.contents ?? "").toContain("Discovered via source analysis");
    // The other origins must NOT appear — tests the mapping, not just presence
    expect(hover?.contents ?? "").not.toContain("Declared in configuration");
    expect(hover?.contents ?? "").not.toContain("Built-in Aurelia resource");
  });

  // ── Template controller provenance ────────────────────────────────────────
  // Framework TCs (if, repeat, switch) are discovered through source analysis
  // of the Aurelia packages (they carry @templateController decorators).
  // They appear in the definition authority and get provenance augmentation.
  it("framework template controllers get provenance from definition authority", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, 'if.bind="activeDevice"', 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    expect(contents).toContain("(template controller) if");
    // Framework TCs are discovered via source analysis of @aurelia packages
    expect(contents).toContain("Discovered via source analysis");
    expect(hover?.confidence).toBeUndefined();
  });

  // ── Expression hover is unaugmented (fallback path) ──────────────────────
  // Interpolation expressions (${total}) produce hover with type info from
  // the TypeScript language service. #identifyHoveredResource returns null
  // because expressions aren't resource elements/attributes/VCs/BBs. The
  // engine returns the base result unaugmented — no provenance, no confidence.
  it("expression hover is unaugmented — no provenance or confidence (fallback path)", () => {
    const query = harness.workspace.query(appUri);
    // Hover on the 'total' variable in ${total}
    const pos = findPosition(appText, "${total}", 3);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    // Expression hover shows label/type — no resource provenance
    expect(contents).not.toContain("Discovered via source analysis");
    expect(contents).not.toContain("Declared in configuration");
    expect(contents).not.toContain("Built-in Aurelia resource");
    expect(hover?.confidence).toBeUndefined();
  });

  // ── Meta-hover bypass ────────────────────────────────────────────────────
  // <import> is handled by #metaHover, which returns before #augmentHover
  // is called. Verify no provenance or confidence leaks into meta hover.
  it("meta-hover elements (<import>) bypass augmentation — no provenance or confidence", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, '<import from="./views/summary-panel">', 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    // Meta-hover content structure
    expect(contents).toContain("<import>");
    // No provenance — meta hover is not augmented
    expect(contents).not.toContain("Discovered via source analysis");
    expect(contents).not.toContain("Declared in configuration");
    expect(contents).not.toContain("Built-in Aurelia resource");
    // No confidence — meta hover bypasses degradation check
    expect(hover?.confidence).toBeUndefined();
  });

  // ── Binding command hover stability ──────────────────────────────────────
  // Binding commands (bind, trigger, call) produce hover through the kernel.
  // #identifyHoveredResource returns null for binding commands (they aren't
  // in any definition index map). Verify R7 doesn't break binding command hover.
  it("binding command hover is unaugmented by R7 — no provenance or confidence", () => {
    const query = harness.workspace.query(appUri);
    // Hover on the '.trigger' part of click.trigger
    const pos = findPosition(appText, "click.trigger", 6);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    expect(contents).toContain("(binding command) trigger");
    // No provenance — binding commands have no definition authority entry
    expect(contents).not.toContain("Discovered via source analysis");
    expect(contents).not.toContain("Declared in configuration");
    expect(contents).not.toContain("Built-in Aurelia resource");
    expect(hover?.confidence).toBeUndefined();
  });

  // ── Convention-based resource provenance ──────────────────────────────────
  // convention-widget has no decorator, no static $au — pure convention.
  // It should still appear in definition authority with origin: 'source'
  // and receive provenance augmentation.
  it("convention-based resources get provenance from definition authority", () => {
    const engine = harness.workspace as SemanticWorkspaceEngine;
    const authority = engine.projectIndex.currentModel().discovery.definition.authority;

    // Verify convention-widget is in definition authority
    const conventionDef = authority.find(
      (def) => def.kind === "custom-element" && def.name.value === "convention-widget",
    );
    expect(conventionDef).toBeDefined();
    // Convention discovery is still source analysis
    expect(conventionDef!.name.origin).toBe("source");

    // Hover shows provenance
    const query = harness.workspace.query(appUri);
    const hover = query.hover(findPosition(appText, "<convention-widget", 1));
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";
    expect(contents).toContain("(custom element) convention-widget");
    expect(contents).toContain("Discovered via source analysis");
    expect(hover?.confidence).toBeUndefined();
  });

  // ── Provenance uniqueness across resource kinds ──────────────────────────
  // Different resource kinds all get provenance from definition authority,
  // verifying the channel switch covers the full resource vocabulary.
  it("all five resource kinds exercise provenance when in definition authority", () => {
    const query = harness.workspace.query(appUri);

    // Custom element
    const elHover = query.hover(findPosition(appText, "<summary-panel", 1));
    expect(elHover?.contents ?? "").toContain("Discovered via source analysis");

    // Custom attribute
    const attrHover = query.hover(findPosition(appText, "copy-to-clipboard.bind", 1));
    expect(attrHover?.contents ?? "").toContain("Discovered via source analysis");

    // Value converter
    const vcHover = query.hover(findPosition(appText, "titlecase", 1));
    expect(vcHover?.contents ?? "").toContain("Discovered via source analysis");

    // Binding behavior
    const bbHover = query.hover(findPosition(appText, "debounce", 1));
    expect(bbHover?.contents ?? "").toContain("Discovered via source analysis");

    // Template controller (locally defined if-not is in the fixture)
    // Builtin TCs are NOT in definition authority, but local TCs should be.
    // The workspace-contract fixture has if-not in src/attributes/if-not.ts
    // but it's used in summary-panel.html, not my-app.html. So we verify
    // by checking the definition authority has entries for controllers.
    const engine = harness.workspace as SemanticWorkspaceEngine;
    const authority = engine.projectIndex.currentModel().discovery.definition.authority;
    const localControllers = authority.filter((d) => d.kind === "template-controller");
    // At minimum if-not should be there as a locally-defined TC
    expect(localControllers.length).toBeGreaterThan(0);
    expect(localControllers.every((c) => c.name.origin === "source")).toBe(true);
  });
});

// Pattern U: Hover on a gap-affected resource populates WorkspaceHover.confidence
describe("R7: hover confidence from degradation (gap injection)", () => {
  it("sets confidence to 'partial' for gap-affected resources (Pattern U)", async () => {
    const gapHarness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    const engine = gapHarness.workspace as SemanticWorkspaceEngine;

    // Inject third-party gaps targeting summary-panel via applyThirdPartyOverlay.
    // This simulates discovering a third-party package with incomplete analysis
    // for the 'summary-panel' custom element.
    engine.projectIndex.applyThirdPartyOverlay({
      resources: {},
      gaps: [
        {
          what: "bindables for summary-panel",
          why: { kind: "dynamic-value" as any, expression: "test" },
          suggestion: "Add explicit bindable declarations",
          resource: { kind: "custom-element", name: "summary-panel" },
        },
      ],
    });
    // Propagate the overlay to the kernel without wiping it.
    // engine.refresh() would call projectIndex.refresh() which recomputes
    // from scratch and destroys the overlay. setResourceScope(null) triggers
    // kernel.reconfigure() with the current (gap-containing) snapshot.
    engine.setResourceScope(null);

    const uri = gapHarness.openTemplate("src/my-app.html");
    const originalText = gapHarness.readText(uri);
    if (!originalText) {
      throw new Error("Expected template text");
    }

    // Insert an unknown binding on the gap-annotated element.
    // Gaps produce confidence:"partial" diagnostics only when the link stage
    // encounters an UNRESOLVED binding on an element with catalog gaps.
    // The fixture's summary-panel has all bindables fully resolved, so we
    // add one that doesn't exist to trigger the gap qualification path.
    const text = originalText.replace(
      `on-refresh.call="refreshStats()">`,
      `on-refresh.call="refreshStats()" gap-probe.bind="x">`,
    );
    engine.update(uri, text);

    // Verify degradation now reports gaps
    const compilation = engine.getCompilation(uri);
    expect(compilation).not.toBeNull();
    expect(compilation!.degradation.hasGaps).toBe(true);
    expect(compilation!.degradation.affectedResources.some(
      (r) => r.name === "summary-panel",
    )).toBe(true);

    // Hover on the gap-affected resource
    const query = gapHarness.workspace.query(uri);
    const pos = findPosition(text, "<summary-panel", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();

    // R12: confidence derived from per-resource catalog gaps
    expect(hover?.confidence).toBe("partial");
    // R12: confidenceReason names the gap kind — verifiable, not just present
    expect(hover?.confidenceReason).toContain("dynamic-value");

    // Content still renders normally — provenance and card structure preserved
    expect(hover?.contents ?? "").toContain("(custom element) summary-panel");
    expect(hover?.contents ?? "").toContain("Bindables");
  });

  it("does not set confidence for non-affected resources in gapped workspace (Pattern U negative)", async () => {
    const gapHarness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    const engine = gapHarness.workspace as SemanticWorkspaceEngine;

    // Inject gaps for summary-panel only — other resources should not be affected
    engine.projectIndex.applyThirdPartyOverlay({
      resources: {},
      gaps: [
        {
          what: "bindables for summary-panel",
          why: { kind: "dynamic-value" as any, expression: "test" },
          suggestion: "Add explicit bindable declarations",
          resource: { kind: "custom-element", name: "summary-panel" },
        },
      ],
    });
    engine.setResourceScope(null);

    const uri = gapHarness.openTemplate("src/my-app.html");
    const originalText = gapHarness.readText(uri);
    if (!originalText) {
      throw new Error("Expected template text");
    }

    // Add an unresolved binding on summary-panel to trigger gap qualification
    const text = originalText.replace(
      `on-refresh.call="refreshStats()">`,
      `on-refresh.call="refreshStats()" gap-probe.bind="x">`,
    );
    engine.update(uri, text);

    // Verify the workspace IS gapped (guards against false-positive from broken injection)
    const compilation = engine.getCompilation(uri);
    expect(compilation).not.toBeNull();
    expect(compilation!.degradation.hasGaps).toBe(true);

    // Hover on convention-widget — NOT gap-affected
    const query = gapHarness.workspace.query(uri);
    const pos = findPosition(text, "<convention-widget", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    // Non-affected resource should NOT have confidence set
    expect(hover?.confidence).toBeUndefined();
    expect(hover?.confidenceReason).toBeUndefined();
  });

  it("confidence derives from catalog gaps, not template degradation (R12 boundary)", async () => {
    const gapHarness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    const engine = gapHarness.workspace as SemanticWorkspaceEngine;

    // Inject catalog gaps for summary-panel but do NOT add an unresolved binding.
    // Under R7 (degradation-based): no unresolved binding → no gap-qualified
    // diagnostics → affectedResources empty → confidence undefined.
    // Under R12 (catalog-gap-based): catalog gaps exist → confidence "partial".
    engine.projectIndex.applyThirdPartyOverlay({
      resources: {},
      gaps: [
        {
          what: "bindables for summary-panel",
          why: { kind: "dynamic-value" as any, expression: "test" },
          suggestion: "Add explicit bindable declarations",
          resource: { kind: "custom-element", name: "summary-panel" },
        },
      ],
    });
    engine.setResourceScope(null);

    const uri = gapHarness.openTemplate("src/my-app.html");
    const text = gapHarness.readText(uri);
    if (!text) throw new Error("Expected template text");
    // No template modification — all bindings resolve. Degradation has no
    // affected resources because no binding encounters a gap-annotated element
    // with an unresolved attribute.

    const query = gapHarness.workspace.query(uri);
    const pos = findPosition(text, "<summary-panel", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();

    // R12: confidence derived from catalog gaps — present even without degradation
    expect(hover?.confidence).toBe("partial");
    expect(hover?.confidenceReason).toContain("dynamic-value");
  });

  it("per-resource confidence differentiates within the same workspace (Pattern AC/AE)", async () => {
    const gapHarness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    const engine = gapHarness.workspace as SemanticWorkspaceEngine;

    // Inject gaps for summary-panel only
    engine.projectIndex.applyThirdPartyOverlay({
      resources: {},
      gaps: [
        {
          what: "bindables for summary-panel",
          why: { kind: "dynamic-value" as any, expression: "test" },
          suggestion: "Add explicit bindable declarations",
          resource: { kind: "custom-element", name: "summary-panel" },
        },
      ],
    });
    engine.setResourceScope(null);

    const uri = gapHarness.openTemplate("src/my-app.html");
    const originalText = gapHarness.readText(uri);
    if (!originalText) {
      throw new Error("Expected template text");
    }
    const text = originalText.replace(
      `on-refresh.call="refreshStats()">`,
      `on-refresh.call="refreshStats()" gap-probe.bind="x">`,
    );
    engine.update(uri, text);

    const query = gapHarness.workspace.query(uri);

    // Gapped resource: summary-panel has reduced confidence
    const gappedPos = findPosition(text, "<summary-panel", 1);
    const gappedHover = query.hover(gappedPos);
    expect(gappedHover?.confidence).toBe("partial");

    // Clean resource: convention-widget has no gaps — confidence absent (high)
    const cleanPos = findPosition(text, "<convention-widget", 1);
    const cleanHover = query.hover(cleanPos);
    expect(cleanHover?.confidence).toBeUndefined();

    // Two resources, same catalog, different per-resource confidence
    expect(gappedHover?.confidence).not.toBe(cleanHover?.confidence);
  });
});

// R-LS4: Confidence indicator embedded in hover markdown contents
describe("R-LS4: confidence indicator in hover contents", () => {
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
    if (!text) throw new Error("Expected template text");
    appText = text;
  });

  // Pattern AF + AI + AJ: reduced confidence embeds indicator in contents
  // with level, reason, and correct ordering relative to provenance and overlay
  it("embeds confidence indicator with level and reason for gap-affected resources (Pattern AF/AI/AJ)", async () => {
    const gapHarness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    const engine = gapHarness.workspace as SemanticWorkspaceEngine;

    engine.projectIndex.applyThirdPartyOverlay({
      resources: {},
      gaps: [
        {
          what: "bindables for summary-panel",
          why: { kind: "dynamic-value" as any, expression: "test" },
          suggestion: "Add explicit bindable declarations",
          resource: { kind: "custom-element", name: "summary-panel" },
        },
      ],
    });
    engine.setResourceScope(null);

    const uri = gapHarness.openTemplate("src/my-app.html");
    const originalText = gapHarness.readText(uri);
    if (!originalText) throw new Error("Expected template text");
    const text = originalText.replace(
      `on-refresh.call="refreshStats()">`,
      `on-refresh.call="refreshStats()" gap-probe.bind="x">`,
    );
    engine.update(uri, text);

    const query = gapHarness.workspace.query(uri);
    const pos = findPosition(text, "<summary-panel", 1);
    const hover = query.hover(pos);
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";

    // AF: confidence indicator appears in the rendered contents
    expect(contents).toContain("**Confidence:**");
    expect(contents).toContain("partial");

    // AJ: reason from R12 derivation included — gap kind, not just level
    expect(contents).toContain("dynamic-value");

    // AI: provenance → confidence → overlay ordering
    const provenanceIdx = contents.indexOf("Discovered via source analysis");
    const confidenceIdx = contents.indexOf("**Confidence:**");
    const overlayIdx = contents.indexOf("Show overlay");
    expect(provenanceIdx).toBeGreaterThanOrEqual(0);
    expect(confidenceIdx).toBeGreaterThan(provenanceIdx);
    expect(overlayIdx).toBeGreaterThan(confidenceIdx);

    // Property 6: structured fields preserved alongside rendered indicator
    expect(hover?.confidence).toBe("partial");
    expect(hover?.confidenceReason).toContain("dynamic-value");
  });

  // Pattern AG: high/exact confidence → no confidence indicator in contents
  it("does not embed confidence indicator for non-gapped resources (Pattern AG)", () => {
    const query = harness.workspace.query(appUri);
    const hover = query.hover(findPosition(appText, "<summary-panel", 1));
    expect(hover).not.toBeNull();
    const contents = hover?.contents ?? "";

    // No confidence indicator — silence means full confidence
    expect(contents).not.toContain("**Confidence:**");
    // Structured field absent (R12 semantics)
    expect(hover?.confidence).toBeUndefined();
  });

  // Pattern AH: non-resource hovers have no confidence indicator
  it("non-resource hovers have no confidence indicator (Pattern AH)", () => {
    const query = harness.workspace.query(appUri);

    // Expression hover (interpolation — bypasses #augmentHover)
    const exprHover = query.hover(findPosition(appText, "${total}", 3));
    expect(exprHover).not.toBeNull();
    expect(exprHover?.contents ?? "").not.toContain("**Confidence:**");

    // Meta-element hover (<import> — handled by #metaHover, not #augmentHover)
    const metaHover = query.hover(findPosition(appText, '<import from="./views/summary-panel">', 1));
    expect(metaHover).not.toBeNull();
    expect(metaHover?.contents ?? "").not.toContain("**Confidence:**");

    // Binding command hover (bypasses #augmentHover)
    const cmdHover = query.hover(findPosition(appText, "click.trigger", 6));
    expect(cmdHover).not.toBeNull();
    expect(cmdHover?.contents ?? "").not.toContain("**Confidence:**");
  });
});
