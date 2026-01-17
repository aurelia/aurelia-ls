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

function replaceOnce(text: string, search: string, replacement: string): string {
  const index = text.indexOf(search);
  if (index < 0) {
    throw new Error(`Search text not found: ${search}`);
  }
  return text.slice(0, index) + replacement + text.slice(index + search.length);
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

describe("workspace code actions (rename-cascade-basic)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("rename-cascade-basic"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/app.html");
    const text = harness.readText(appUri);
    if (!text) {
      throw new Error("Expected template text for rename-cascade-basic app.html");
    }
    appText = text;
  });

  it("adds bindable metadata to target component", () => {
    const mutated = insertBefore(
      appText,
      "heading.bind=\"heading\"",
      "    middle-name.bind=\"middleName\"\n",
    );
    harness.updateTemplate(appUri, mutated, 2);

    const position = findPosition(mutated, "middle-name.bind", 1);
    const actions = harness.workspace.refactor().codeActions({ uri: appUri, position });
    const action = actions.find((entry) => entry.id === "aurelia/add-bindable:my-element:middleName");

    expect(action).toBeDefined();
    const targetUri = harness.toDocumentUri("src/my-element.html");
    const edit = action?.edit?.edits.find((entry) => String(entry.uri) === String(targetUri));
    expect(edit).toBeDefined();
    if (edit) {
      expect(edit.newText.includes("<bindable name=\"middleName\"")).toBe(true);
      expect(edit.newText.includes("attribute=\"middle-name\"")).toBe(true);
    }
  });
});

describe("workspace code actions (workspace-contract)", () => {
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

  it("adds import for missing template controller", () => {
    const mutated = insertBefore(
      appText,
      "<template if.bind=\"activeDevice\">",
      "  <template if-not.bind=\"activeDevice\"></template>\n",
    );
    harness.updateTemplate(appUri, mutated, 2);

    const position = findPosition(mutated, "if-not.bind", 1);
    const actions = harness.workspace.refactor().codeActions({ uri: appUri, position });
    const action = actions.find((entry) => entry.id === "aurelia/add-import:controller:if-not");

    expect(action).toBeDefined();
    const edit = action?.edit?.edits.find((entry) => String(entry.uri) === String(appUri));
    expect(edit).toBeDefined();
    if (edit) {
      expect(edit.newText.includes('<import from="./attributes/if-not"></import>')).toBe(true);
    }
  });

  it("adds import for missing value converter", () => {
    const mutated = replaceOnce(
      appText,
      "titlecase",
      "slugify",
    );
    harness.updateTemplate(appUri, mutated, 5);

    const position = findPosition(mutated, "slugify", 1);
    const actions = harness.workspace.refactor().codeActions({ uri: appUri, position });
    const action = actions.find((entry) => entry.id === "aurelia/add-import:value-converter:slugify");

    expect(action).toBeDefined();
    const edit = action?.edit?.edits.find((entry) => String(entry.uri) === String(appUri));
    expect(edit).toBeDefined();
    if (edit) {
      expect(edit.newText.includes('<import from="./value-converters/slugify"></import>')).toBe(true);
    }
  });

  it("adds import for missing binding behavior", () => {
    const mutated = replaceOnce(
      appText,
      "filters.search & debounce: 200",
      "filters.search & flash: 200",
    );
    harness.updateTemplate(appUri, mutated, 6);

    const position = findPosition(mutated, "flash", 1);
    const actions = harness.workspace.refactor().codeActions({ uri: appUri, position });
    const action = actions.find((entry) => entry.id === "aurelia/add-import:binding-behavior:flash");

    expect(action).toBeDefined();
    const edit = action?.edit?.edits.find((entry) => String(entry.uri) === String(appUri));
    expect(edit).toBeDefined();
    if (edit) {
      expect(edit.newText.includes('<import from="./binding-behaviors/flash"></import>')).toBe(true);
    }
  });

  it("adds import for missing custom element", () => {
    const mutated = insertBefore(
      appText,
      "<div class=\"quick-actions\">",
      "  <status-badge status.bind=\"activeDevice.status\"></status-badge>\n",
    );
    harness.updateTemplate(appUri, mutated, 7);

    const position = findPosition(mutated, "status-badge", 1);
    const actions = harness.workspace.refactor().codeActions({ uri: appUri, position });
    const action = actions.find((entry) => entry.id === "aurelia/add-import:element:status-badge");

    expect(action).toBeDefined();
    const edit = action?.edit?.edits.find((entry) => String(entry.uri) === String(appUri));
    expect(edit).toBeDefined();
    if (edit) {
      expect(edit.newText.includes('<import from="./components/status-badge"></import>')).toBe(true);
    }
  });

  it("adds import for missing custom attribute", () => {
    const mutated = replaceOnce(
      appText,
      "copy-to-clipboard.bind=\"noteMessage\">",
      "copy-to-clipboard.bind=\"noteMessage\" tooltip.bind=\"noteMessage\">",
    );
    harness.updateTemplate(appUri, mutated, 8);

    const position = findPosition(mutated, "tooltip.bind", 1);
    const actions = harness.workspace.refactor().codeActions({ uri: appUri, position });
    const action = actions.find((entry) => entry.id === "aurelia/add-import:attribute:tooltip");

    expect(action).toBeDefined();
    const edit = action?.edit?.edits.find((entry) => String(entry.uri) === String(appUri));
    expect(edit).toBeDefined();
    if (edit) {
      expect(edit.newText.includes('<import from="./attributes/tooltip"></import>')).toBe(true);
    }
  });
});
