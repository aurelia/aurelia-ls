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

function insertBefore(text: string, marker: string, insert: string): string {
  const index = text.indexOf(marker);
  if (index < 0) {
    throw new Error(`Marker not found: ${marker}`);
  }
  return text.slice(0, index) + insert + text.slice(index);
}

describe("workspace-editing-loop (workspace-contract)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({ fixtureId: asFixtureId("workspace-contract") });
    appUri = harness.openTemplate("src/my-app.html");
    const text = harness.readText(appUri);
    if (!text) {
      throw new Error("Expected template text for workspace-contract my-app.html");
    }
    appText = text;
  });

  it("discovers external and inline templates", () => {
    const externalPaths = harness.externalTemplates.map((entry) => entry.path);
    expect(externalPaths.some((path) => path.endsWith("/my-app.html"))).toBe(true);
    expect(externalPaths.some((path) => path.endsWith("/summary-panel.html"))).toBe(true);
    expect(externalPaths.some((path) => path.endsWith("/table-panel.html"))).toBe(true);

    const hasInlineNote = harness.inlineTemplates.some((entry) => entry.componentPath.endsWith("/inline-note.ts"));
    const hasPulseDot = harness.inlineTemplates.some((entry) => entry.componentPath.endsWith("/pulse-dot.ts"));
    expect(hasInlineNote, "inline-note should be discovered as an inline template").toBe(true);
    expect(hasPulseDot, "pulse-dot should be discovered as an inline template").toBe(true);
  });

  it("keeps snapshot fingerprints stable for identical inputs", () => {
    const first = harness.workspace.snapshot().meta.fingerprint;
    const second = harness.workspace.snapshot().meta.fingerprint;
    expect(second).toBe(first);
  });

  it("resolves hover for custom elements in templates", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "<summary-panel", 1);
    const hover = query.hover(pos);
    expect(hover?.contents.length ?? 0).toBeGreaterThan(0);
  });

  it("offers bindable completions on custom element tags", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "<summary-panel", 1);
    const completions = query.completions(pos);
    const labels = new Set(completions.map((item) => item.label));
    const hasUpdated = labels.has("updated-at") || labels.has("updatedAt");
    expect(labels.has("stats")).toBe(true);
    expect(hasUpdated).toBe(true);
  });

  it("surfaces diagnostics when unknown resources are introduced", async () => {
    const local = await createWorkspaceHarness({ fixtureId: asFixtureId("workspace-contract") });
    const uri = local.openTemplate("src/my-app.html");
    const text = local.readText(uri);
    if (!text) {
      throw new Error("Expected template text for workspace-contract my-app.html");
    }
    const mutated = insertBefore(text, "<summary-panel", "  <unknown-widget></unknown-widget>\n  ");
    local.updateTemplate(uri, mutated, 2);
    const diags = local.workspace.query(uri).diagnostics();
    expect(diags.length).toBeGreaterThan(0);
  });

  it.todo("resolves definitions for element tags once TypeScript services are wired");
  it.todo("finds references across templates and view-model symbols");
});
