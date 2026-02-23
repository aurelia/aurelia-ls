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

function hasLabel(items: readonly { label: string }[], label: string): boolean {
  return items.some((item) => item.label === label);
}

function completionConfidenceRank(confidence: "exact" | "high" | "partial" | "low" | undefined): number {
  switch (confidence) {
    case "exact":
      return 0;
    case "high":
      return 1;
    case "partial":
      return 2;
    case "low":
      return 3;
    default:
      return 1;
  }
}

function completionOriginRank(origin: "source" | "config" | "builtin" | "unknown" | undefined): number {
  switch (origin) {
    case "source":
      return 0;
    case "config":
      return 1;
    case "builtin":
      return 2;
    case "unknown":
      return 3;
    default:
      return 2;
  }
}

function compareCompletionOrder(
  a: { label: string; sortText?: string; confidence?: "exact" | "high" | "partial" | "low"; origin?: "source" | "config" | "builtin" | "unknown" },
  b: { label: string; sortText?: string; confidence?: "exact" | "high" | "partial" | "low"; origin?: "source" | "config" | "builtin" | "unknown" },
): number {
  const confidenceDelta = completionConfidenceRank(a.confidence) - completionConfidenceRank(b.confidence);
  if (confidenceDelta !== 0) return confidenceDelta;
  const originDelta = completionOriginRank(a.origin) - completionOriginRank(b.origin);
  if (originDelta !== 0) return originDelta;
  const aKey = a.sortText ?? a.label;
  const bKey = b.sortText ?? b.label;
  const keyDelta = aKey.localeCompare(bKey);
  if (keyDelta !== 0) return keyDelta;
  return a.label.localeCompare(b.label);
}

function expectOrderedCompletions(
  items: readonly {
    label: string;
    sortText?: string;
    confidence?: "exact" | "high" | "partial" | "low";
    origin?: "source" | "config" | "builtin" | "unknown";
  }[],
): void {
  for (let i = 1; i < items.length; i += 1) {
    const prev = items[i - 1];
    const next = items[i];
    expect(
      compareCompletionOrder(prev, next) <= 0,
      `Expected ordered completions, got "${prev?.label}" before "${next?.label}"`,
    ).toBe(true);
  }
}

function expectUniqueLabels(items: readonly { label: string }[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.label)) {
      throw new Error(`Duplicate completion label: ${item.label}`);
    }
    seen.add(item.label);
  }
}

describe("workspace completions (workspace-contract)", () => {
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

  it("completes custom element tags", () => {
    const query = harness.workspace.query(appUri);
    const completions = query.completions(findPosition(appText, "<summary-panel", 1));
    expect(hasLabel(completions, "summary-panel")).toBe(true);
    expect(hasLabel(completions, "table-panel")).toBe(true);
    expect(completions.find((item) => item.label === "summary-panel")?.kind).toBe("custom-element");
    expect(completions.find((item) => item.label === "div")?.kind).toBe("html-element");
  });

  it("orders completions by relevance then label", () => {
    const query = harness.workspace.query(appUri);
    const completions = query.completions(findPosition(appText, "<summary-panel", 1));
    expectOrderedCompletions(completions);
  });

  it("dedupes completion labels", () => {
    const query = harness.workspace.query(appUri);
    const completions = query.completions(findPosition(appText, "<summary-panel", 1));
    expectUniqueLabels(completions);
  });

  it("completes custom element bindables", () => {
    const query = harness.workspace.query(appUri);
    const completions = query.completions(findPosition(appText, "stats.bind", 0));
    expect(hasLabel(completions, "stats")).toBe(true);
    expect(hasLabel(completions, "updated-at")).toBe(true);
    expect(completions.find((item) => item.label === "stats")?.kind).toBe("bindable-property");
  });

  it("completes native attributes", () => {
    const query = harness.workspace.query(appUri);
    const completions = query.completions(findPosition(appText, "type=\"text\"", 0));
    expect(hasLabel(completions, "type")).toBe(true);
    expect(hasLabel(completions, "value")).toBe(true);
    expect(completions.find((item) => item.label === "type")?.kind).toBe("html-attribute");
  });

  it("completes binding commands", () => {
    const query = harness.workspace.query(appUri);
    const completions = query.completions(findPosition(appText, "value.bind", "value.".length));
    expect(hasLabel(completions, "bind")).toBe(true);
    expect(completions.find((item) => item.label === "bind")?.kind).toBe("binding-command");
  });

  it("completes value converters", () => {
    const query = harness.workspace.query(appUri);
    const completions = query.completions(findPosition(appText, "| titlecase", 2));
    expect(hasLabel(completions, "titlecase")).toBe(true);
    expect(completions.find((item) => item.label === "titlecase")?.kind).toBe("value-converter");
  });

  it("includes structured trust metadata for converter completions", () => {
    const withProbe = `${appText}\n<div>\${activeDevice.name | s}</div>`;
    harness.updateTemplate(appUri, withProbe);
    try {
      const query = harness.workspace.query(appUri);
      const titlecaseCompletions = query.completions(findPosition(withProbe, "| titlecase", 2));
      const sanitizeCompletions = query.completions(findPosition(withProbe, "| s}", 2));
      const titlecase = titlecaseCompletions.find((item) => item.label === "titlecase");
      const sanitize = sanitizeCompletions.find((item) => item.label === "sanitize");
      expect(titlecase?.origin).toBe("source");
      expect(titlecase?.confidence).toBe("high");
      expect(sanitize?.origin).toBeDefined();
      expect(sanitize?.confidence).toBeDefined();
    } finally {
      harness.updateTemplate(appUri, appText);
    }
  });

  it("completes binding behaviors", () => {
    const query = harness.workspace.query(appUri);
    const completions = query.completions(findPosition(appText, "& debounce", 2));
    expect(hasLabel(completions, "debounce")).toBe(true);
    expect(completions.find((item) => item.label === "debounce")?.kind).toBe("binding-behavior");
  });

  it("completes bindable literal values", () => {
    const withTone = appText.replace(
      "<inline-note message.bind=\"noteMessage\"></inline-note>",
      "<inline-note message.bind=\"noteMessage\" tone=\"\"></inline-note>",
    );
    harness.updateTemplate(appUri, withTone);
    try {
      const query = harness.workspace.query(appUri);
      const completions = query.completions(findPosition(withTone, "tone=\"\"", "tone=\"".length));
      expect(hasLabel(completions, "info")).toBe(true);
      expect(hasLabel(completions, "warn")).toBe(true);
      expect(hasLabel(completions, "success")).toBe(true);
    } finally {
      harness.updateTemplate(appUri, appText);
    }
  });

  it("completes <import from> module specifiers", () => {
    const withImportPrefix = appText.replace(
      "<import from=\"./views/summary-panel\"></import>",
      "<import from=\"./views/\"></import>",
    );
    harness.updateTemplate(appUri, withImportPrefix);
    try {
      const query = harness.workspace.query(appUri);
      const completions = query.completions(findPosition(withImportPrefix, "from=\"./views/\"", "from=\"./views/".length));
      expect(hasLabel(completions, "./views/summary-panel")).toBe(true);
      expect(hasLabel(completions, "./views/table-panel")).toBe(true);
    } finally {
      harness.updateTemplate(appUri, appText);
    }
  });
});

describe("workspace completions (third-party resources)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("template-imports-aurelia2-table"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    const text = harness.readText(appUri);
    if (!text) {
      throw new Error("Expected template text for template-imports-aurelia2-table my-app.html");
    }
    appText = text;
  });

  it("completes third-party element tags in template", () => {
    const query = harness.workspace.query(appUri);
    const completions = query.completions(findPosition(appText, "<aut-pagination", 1));
    expect(hasLabel(completions, "aut-pagination")).toBe(true);
  });

  it("completes third-party custom attributes in template", () => {
    const query = harness.workspace.query(appUri);
    const completions = query.completions(findPosition(appText, "aurelia-table", 1));
    expect(hasLabel(completions, "aurelia-table")).toBe(true);
  });

  it("completes third-party bindables by prefix", () => {
    const query = harness.workspace.query(appUri);
    const completions = query.completions(findPosition(appText, "current-page.bind", 1));
    expect(hasLabel(completions, "current-page")).toBe(true);
    expectOrderedCompletions(completions);
    expectUniqueLabels(completions);

    const pageSize = query.completions(findPosition(appText, "page-size.bind", 1));
    expect(hasLabel(pageSize, "page-size")).toBe(true);

    const totalItems = query.completions(findPosition(appText, "total-items.bind", 1));
    expect(hasLabel(totalItems, "total-items")).toBe(true);
  });
});

describe("workspace completions (import alias conflicts)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("template-import-alias-conflicts"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    const text = harness.readText(appUri);
    if (!text) {
      throw new Error("Expected template text for template-import-alias-conflicts");
    }
    appText = text;
  });

  it("dedupes alias completions for attribute positions", () => {
    const query = harness.workspace.query(appUri);
    const completions = query.completions(
      findPosition(appText, "<button tooltip", "<button ".length),
    );
    expect(hasLabel(completions, "tooltip")).toBe(true);
    expect(hasLabel(completions, "badge")).toBe(true);
    expectOrderedCompletions(completions);
    expectUniqueLabels(completions);
  });
});
