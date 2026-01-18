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

function insertBefore(text: string, marker: string, insert: string): string {
  const index = text.indexOf(marker);
  if (index < 0) {
    throw new Error(`Marker not found: ${marker}`);
  }
  return text.slice(0, index) + insert + text.slice(index);
}

describe("workspace style profile (refactors)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;
  let elementUri: string;
  let elementText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("rename-cascade-basic"),
      openTemplates: "none",
      workspace: {
        styleProfile: {
          naming: { element: "kebab" },
        },
      },
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

  it("formats renamed element names using style profile", () => {
    const position = findPosition(appText, "<my-element", 1);
    const result = harness.workspace.refactor().rename({
      uri: appUri,
      position,
      newName: "MyWidget",
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
});

describe("workspace style profile (rename style)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;
  let elementUri: string;
  let elementText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("rename-cascade-basic"),
      openTemplates: "none",
      workspace: {
        refactorOverrides: {
          renameStyle: "property",
        },
      },
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

  it("formats bindable attribute renames using property style", () => {
    const position = findPosition(appText, "heading.bind", 1);
    const result = harness.workspace.refactor().rename({
      uri: appUri,
      position,
      newName: "main-title",
    });

    if ("error" in result) {
      throw new Error(`Rename failed: ${result.error.message}`);
    }

    const edits = result.edit.edits;
    const attrOffsets = findOffsets(appText, /heading\.bind/g);
    expectRenameEditsAtOffsets(edits, appUri, attrOffsets, "mainTitle");

    const defMarker = 'attribute: "heading"';
    const defOffset = elementText.indexOf(defMarker);
    if (defOffset < 0) {
      throw new Error("Expected bindable attribute override in my-element.ts");
    }
    expectRenameEditsAtOffsets(edits, elementUri, [defOffset + 'attribute: "'.length], "mainTitle");
  });
});

describe("workspace style profile (code actions)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("rename-cascade-basic"),
      openTemplates: "none",
      workspace: {
        styleProfile: {
          formatting: { quoteStyle: "single" },
        },
      },
    });
    appUri = harness.openTemplate("src/app.html");
    const text = harness.readText(appUri);
    if (!text) {
      throw new Error("Expected template text for rename-cascade-basic app.html");
    }
    appText = text;
  });

  it("uses style profile quoting when adding bindables", () => {
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
      expect(edit.newText.includes("<bindable name='middleName'")).toBe(true);
      expect(edit.newText.includes("attribute='middle-name'")).toBe(true);
    }
  });
});
