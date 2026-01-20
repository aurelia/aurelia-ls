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

function spanText(
  harness: Awaited<ReturnType<typeof createWorkspaceHarness>>,
  loc: { uri: string; span: { start: number; end: number } },
): string {
  const text = harness.readText(loc.uri);
  if (!text) {
    throw new Error(`Missing text for ${String(loc.uri)}`);
  }
  const start = Math.max(0, Math.min(loc.span.start, text.length));
  const end = Math.max(start, Math.min(loc.span.end, text.length));
  if (end > start) return text.slice(start, end);
  const lineStart = Math.max(0, text.lastIndexOf("\n", start - 1) + 1);
  const lineEnd = text.indexOf("\n", start);
  return text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
}

function expectDefinition(
  harness: Awaited<ReturnType<typeof createWorkspaceHarness>>,
  defs: readonly { uri: string; span: { start: number; end: number }; symbolId?: string }[],
  opts: { uriEndsWith: string; textIncludes: string },
): { uri: string; span: { start: number; end: number }; symbolId?: string } {
  const hit = defs.find((loc) => {
    if (!String(loc.uri).endsWith(opts.uriEndsWith)) return false;
    return spanText(harness, loc).includes(opts.textIncludes);
  });
  expect(hit, `Definition not found for ${opts.uriEndsWith} containing ${opts.textIncludes}`).toBeDefined();
  return hit!;
}

describe("workspace definition (workspace-contract)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;
  let summaryUri: string;
  let summaryText: string;
  let tableUri: string;
  let tableText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    summaryUri = harness.openTemplate("src/views/summary-panel.html");
    tableUri = harness.openTemplate("src/views/table-panel.html");

    const app = harness.readText(appUri);
    const summary = harness.readText(summaryUri);
    const table = harness.readText(tableUri);
    if (!app || !summary || !table) {
      throw new Error("Expected template text for workspace-contract fixtures");
    }
    appText = app;
    summaryText = summary;
    tableText = table;
  });

  it("resolves custom element definitions with symbol ids", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "<summary-panel", 1));
    const hit = expectDefinition(harness, defs, {
      uriEndsWith: "/src/views/summary-panel.ts",
      textIncludes: "SummaryPanel",
    });
    expect(typeof hit.symbolId).toBe("string");
  });

  it("does not invent definitions for native elements or attributes", () => {
    const query = harness.workspace.query(appUri);
    const elementDefs = query.definition(findPosition(appText, "<section class=\"app-shell\"", 1));
    expect(elementDefs).toHaveLength(0);

    const attrDefs = query.definition(findPosition(appText, "class=\"app-shell\"", 1));
    expect(attrDefs).toHaveLength(0);
  });

  it("resolves <import> definition targets", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "./views/summary-panel", 2));
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/views/summary-panel.ts",
      textIncludes: "SummaryPanel",
    });
  });

  it("maps <import> tag vs attribute value positions", () => {
    const query = harness.workspace.query(appUri);
    const tagDefs = query.definition(findPosition(appText, "<import from", 1));
    expect(tagDefs).toHaveLength(0);

    const attrDefs = query.definition(findPosition(appText, "from=\"./views/summary-panel\"", 1));
    expect(attrDefs).toHaveLength(0);

    const valueDefs = query.definition(findPosition(appText, "./views/summary-panel", 2));
    expectDefinition(harness, valueDefs, {
      uriEndsWith: "/src/views/summary-panel.ts",
      textIncludes: "SummaryPanel",
    });
  });

  it("resolves inline custom elements", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "<inline-note", 1));
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/components/inline-note.ts",
      textIncludes: "InlineNote",
    });
  });

  it("resolves custom attribute definitions", () => {
    const appQuery = harness.workspace.query(appUri);
    const copyDefs = appQuery.definition(findPosition(appText, "copy-to-clipboard.bind", 1));
    expectDefinition(harness, copyDefs, {
      uriEndsWith: "/src/resources.ts",
      textIncludes: "CopyToClipboard",
    });

    const summaryQuery = harness.workspace.query(summaryUri);
    const tooltipDefs = summaryQuery.definition(findPosition(summaryText, "tooltip", 1));
    expectDefinition(harness, tooltipDefs, {
      uriEndsWith: "/src/attributes/tooltip.ts",
      textIncludes: "Tooltip",
    });

    const tableQuery = harness.workspace.query(tableUri);
    const tableDefs = tableQuery.definition(findPosition(tableText, "aurelia-table", 1));
    expectDefinition(harness, tableDefs, {
      uriEndsWith: "/src/attributes/aurelia-table.ts",
      textIncludes: "AureliaTable",
    });
  });

  it("dedupes definition locations for custom attributes", () => {
    const appQuery = harness.workspace.query(appUri);
    const defs = appQuery.definition(findPosition(appText, "copy-to-clipboard.bind", 1));
    const matches = defs.filter((loc) =>
      String(loc.uri).endsWith("/src/resources.ts")
      && spanText(harness, loc).includes("CopyToClipboard")
    );
    expect(matches).toHaveLength(1);
  });

  it("normalizes definition URIs", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "<summary-panel", 1));
    for (const loc of defs) {
      expect(String(loc.uri).includes("\\")).toBe(false);
    }
  });

  it("resolves bindable definitions", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "updated-at.bind", 1));
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/views/summary-panel.ts",
      textIncludes: "updatedAt",
    });
  });

  it("maps attribute, command, and expression segments distinctly", () => {
    const query = harness.workspace.query(appUri);
    const attrDefs = query.definition(findPosition(appText, "copy-to-clipboard.bind", 1));
    expectDefinition(harness, attrDefs, {
      uriEndsWith: "/src/resources.ts",
      textIncludes: "CopyToClipboard",
    });

    const commandPos = findPosition(appText, "copy-to-clipboard.bind", "copy-to-clipboard.".length + 1);
    const commandDefs = query.definition(commandPos);
    expect(commandDefs).toHaveLength(0);

    const exprDefs = query.definition(findPosition(appText, "noteMessage", 1));
    expectDefinition(harness, exprDefs, {
      uriEndsWith: "/src/my-app.ts",
      textIncludes: "noteMessage",
    });
  });

  it("maps template controller target vs command segments", () => {
    const query = harness.workspace.query(summaryUri);
    const targetDefs = query.definition(findPosition(summaryText, "if-not.bind", 1));
    expectDefinition(harness, targetDefs, {
      uriEndsWith: "/src/attributes/if-not.ts",
      textIncludes: "IfNot",
    });

    const commandPos = findPosition(summaryText, "if-not.bind", "if-not.".length + 1);
    const commandDefs = query.definition(commandPos);
    expect(commandDefs).toHaveLength(0);
  });

  it("resolves template controller definitions", () => {
    const query = harness.workspace.query(summaryUri);
    const defs = query.definition(findPosition(summaryText, "if-not.bind", 1));
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/attributes/if-not.ts",
      textIncludes: "IfNot",
    });
  });

  it("resolves value converters and binding behaviors", () => {
    const summaryQuery = harness.workspace.query(summaryUri);
    const titleDefs = summaryQuery.definition(findPosition(summaryText, "titlecase", 1));
    expectDefinition(harness, titleDefs, {
      uriEndsWith: "/src/value-converters/titlecase.ts",
      textIncludes: "TitleCaseValueConverter",
    });

    const shortenDefs = summaryQuery.definition(findPosition(summaryText, "shorten", 1));
    expectDefinition(harness, shortenDefs, {
      uriEndsWith: "/src/resources.ts",
      textIncludes: "ShortenValueConverter",
    });

    const appQuery = harness.workspace.query(appUri);
    const debounceDefs = appQuery.definition(findPosition(appText, "debounce", 1));
    expectDefinition(harness, debounceDefs, {
      uriEndsWith: "/src/binding-behaviors/debounce.ts",
      textIncludes: "DebounceBindingBehavior",
    });
  });

  it("resolves expression definitions via TypeScript", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "filters.search", 1));
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/my-app.ts",
      textIncludes: "filters",
    });
  });

  it("resolves <let> variable definitions", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "${total}", 2);
    const defs = query.definition(pos);
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/my-app.html",
      textIncludes: "total.bind",
    });
  });

  it("orders local definitions before base definitions when locals shadow VM members", () => {
    const marker = "  <let total.bind=\"filteredItems.length\"></let>";
    if (!appText.includes(marker)) {
      throw new Error("Expected <let total.bind> marker not found");
    }
    const injected = appText.replace(
      marker,
      `${marker}\n  <let filters.bind=\"filters\"></let>\n  <p>\${filters}</p>`,
    );
    harness.updateTemplate(appUri, injected, 2);
    try {
      const query = harness.workspace.query(appUri);
      const defs = query.definition(findPosition(injected, "${filters}", 2));
      const localIndex = defs.findIndex((loc) => {
        if (!String(loc.uri).endsWith("/src/my-app.html")) return false;
        const start = Math.max(0, Math.min(loc.span.start, injected.length));
        const end = Math.max(start, Math.min(loc.span.end, injected.length));
        return injected.slice(start, end).includes("filters");
      });
      expect(localIndex).toBe(0);
      const baseIndex = defs.findIndex((loc) =>
        String(loc.uri).endsWith("/src/my-app.ts")
        || String(loc.uri).includes(".__au.ttc.overlay")
      );
      if (baseIndex >= 0) {
        expect(baseIndex).toBeGreaterThan(localIndex);
      }
    } finally {
      harness.updateTemplate(appUri, appText, 2);
    }
  });

  it("resolves repeat.for iterator definitions", () => {
    const tableQuery = harness.workspace.query(tableUri);
    const defs = tableQuery.definition(findPosition(tableText, "choose(item)", "choose(".length));
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/views/table-panel.html",
      textIncludes: "item of displayItems",
    });
  });
});

describe("workspace definition (position mapping: shorthand)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("binding-shorthand-syntax"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    const app = harness.readText(appUri);
    if (!app) {
      throw new Error("Expected template text for binding-shorthand-syntax fixture");
    }
    appText = app;
  });

  it("treats @ and : command symbols as non-definitions", () => {
    const query = harness.workspace.query(appUri);
    const atDefs = query.definition(findPosition(appText, "@click", 0));
    expect(atDefs).toHaveLength(0);

    const colonDefs = query.definition(findPosition(appText, ":value", 0));
    expect(colonDefs).toHaveLength(0);
  });

  it("maps shorthand command expressions to view-model definitions", () => {
    const query = harness.workspace.query(appUri);
    const clickDefs = query.definition(findPosition(appText, "onClick()", 1));
    expectDefinition(harness, clickDefs, {
      uriEndsWith: "/src/my-app.ts",
      textIncludes: "onClick",
    });

    const messageDefs = query.definition(findPosition(appText, ":value=\"message\"", ":value=\"".length + 1));
    expectDefinition(harness, messageDefs, {
      uriEndsWith: "/src/my-app.ts",
      textIncludes: "message",
    });
  });
});

describe("workspace definition (position mapping: meta elements)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let templateUri: string;
  let templateText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("rename-cascade-basic"),
      openTemplates: "none",
    });
    templateUri = harness.openTemplate("src/my-element.html");
    const template = harness.readText(templateUri);
    if (!template) {
      throw new Error("Expected template text for rename-cascade-basic fixture");
    }
    templateText = template;
  });

  it("does not resolve meta element attribute name/value positions", () => {
    const query = harness.workspace.query(templateUri);
    const nameDefs = query.definition(findPosition(templateText, "name=\"extra\"", 1));
    expect(nameDefs).toHaveLength(0);

    const valueDefs = query.definition(findPosition(templateText, "extra", 1));
    expect(valueDefs).toHaveLength(0);
  });
});

describe("workspace definition (stacked controllers)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let summaryUri: string;
  let summaryText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    summaryUri = harness.openTemplate("src/views/summary-panel.html");
    const summary = harness.readText(summaryUri);
    if (!summary) {
      throw new Error("Expected template text for workspace-contract summary-panel");
    }
    const marker = "    </div>\n\n    <template if-not.bind=\"stats.items.length\">";
    const injection = "    <pulse-dot data-stack=\"true\" if.bind=\"stats.items.length\" repeat.for=\"dot of stats.items\" active.bind=\"dot.delta !== undefined\"></pulse-dot>\n\n";
    if (!summary.includes(marker)) {
      throw new Error("Expected marker not found in summary-panel template");
    }
    summaryText = summary.replace(marker, `    </div>\n\n${injection}    <template if-not.bind=\"stats.items.length\">`);
    harness.updateTemplate(summaryUri, summaryText);
  });

  it("resolves custom element definitions under stacked controllers", () => {
    const query = harness.workspace.query(summaryUri);
    const defs = query.definition(findPosition(summaryText, "<pulse-dot data-stack", 1));
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/components/pulse-dot.ts",
      textIncludes: "PulseDot",
    });
  });
});

describe("workspace definition (import alias conflicts)", () => {
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

  it("prefers template import aliases over global registrations", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "tooltip=\"Refresh\"", 1));
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/attributes/aut-sort.ts",
      textIncludes: "AutSort",
    });
    const hasTooltip = defs.some((loc) =>
      String(loc.uri).endsWith("/src/attributes/tooltip.ts")
    );
    expect(hasTooltip).toBe(false);
  });

  it("prefers named template import aliases over local registrations", () => {
    const query = harness.workspace.query(appUri);
    const defs = query.definition(findPosition(appText, "badge=\"Primary\"", 1));
    expectDefinition(harness, defs, {
      uriEndsWith: "/src/attributes/aut-sort.ts",
      textIncludes: "AutSort",
    });
    const hasBadge = defs.some((loc) =>
      String(loc.uri).endsWith("/src/attributes/badge.ts")
    );
    expect(hasBadge).toBe(false);
  });
});
