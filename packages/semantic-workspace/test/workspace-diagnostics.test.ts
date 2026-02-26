import path from "node:path";
import { canonicalPath } from "@aurelia-ls/compiler";
import type { DiagnosticSurface } from "@aurelia-ls/compiler";
import { beforeAll, describe, expect, it } from "vitest";
import type { SemanticWorkspaceEngine } from "../out/engine.js";
import type { WorkspaceDiagnostic, WorkspaceDiagnostics } from "../out/types.js";
import { createWorkspaceHarness } from "./harness/index.js";
import { asFixtureId, getFixture, resolveFixtureRoot } from "./fixtures/index.js";

const DEFINITION_CONVERGENCE_CODE = "aurelia/project/definition-convergence";

type NormalizationIssue = {
  kind?: unknown;
  code?: unknown;
  field?: unknown;
};

function insertBefore(text: string, marker: string, insert: string): string {
  const index = text.indexOf(marker);
  if (index < 0) {
    throw new Error(`Marker not found: ${marker}`);
  }
  return text.slice(0, index) + insert + text.slice(index);
}

function findOffset(text: string, needle: string): number {
  const index = text.indexOf(needle);
  if (index < 0) {
    throw new Error(`Needle not found: ${needle}`);
  }
  return index;
}

function spanCoversOffset(span: { start: number; end: number }, offset: number): boolean {
  if (span.end <= span.start) return span.start === offset;
  return offset >= span.start && offset < span.end;
}

function findDiagnostic(
  diags: readonly WorkspaceDiagnostic[],
  code: string,
  offset: number,
): WorkspaceDiagnostic | undefined {
  return diags.find((diag) => diag.code === code && diag.span && spanCoversOffset(diag.span, offset));
}

function expectNoDuplicateDiagnostics(
  diags: readonly WorkspaceDiagnostic[],
): void {
  const seen = new Set<string>();
  for (const diag of diags) {
    if (!diag.span) continue;
    const key = `${diag.code}:${diag.span.start}:${diag.span.end}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate diagnostic entry: ${key}`);
    }
    seen.add(key);
  }
}

function diagnosticsForSurface(
  routed: WorkspaceDiagnostics,
  surface: DiagnosticSurface = "lsp",
): readonly WorkspaceDiagnostic[] {
  return routed.bySurface.get(surface) ?? [];
}

function collectAllDiagnostics(routed: WorkspaceDiagnostics): readonly WorkspaceDiagnostic[] {
  const combined: WorkspaceDiagnostic[] = [];
  for (const entries of routed.bySurface.values()) {
    combined.push(...entries);
  }
  combined.push(...routed.suppressed);
  return combined;
}

function definitionConvergenceSeverityConflicts(
  workspace: SemanticWorkspaceEngine,
  uri: string,
): readonly NormalizationIssue[] {
  const issues = workspace.debugDiagnosticsPipeline(uri).normalization.issues;
  return issues.filter((issue): issue is NormalizationIssue => {
    const entry = issue as NormalizationIssue;
    return entry.kind === "conflicting-default"
      && entry.code === DEFINITION_CONVERGENCE_CODE
      && entry.field === "severity";
  });
}

function expectNoNormalizationIssues(workspace: SemanticWorkspaceEngine, uri: string): void {
  const conflicts = definitionConvergenceSeverityConflicts(workspace, uri);
  if (conflicts.length > 0) {
    throw new Error(`Definition-convergence severity conflicts detected:\n${JSON.stringify(conflicts, null, 2)}`);
  }
  const issues = workspace.debugDiagnosticsPipeline(uri).normalization.issues;
  if (issues.length > 0) {
    throw new Error(`Normalization issues detected:\n${JSON.stringify(issues, null, 2)}`);
  }
}

describe("workspace diagnostics (rename-cascade-basic)", () => {
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

  it("maps unknown bindable diagnostics", () => {
    const mutated = insertBefore(
      appText,
      "heading.bind=\"heading\"",
      "    middle-name.bind=\"middleName\"\n",
    );
    harness.updateTemplate(appUri, mutated, 2);

    const routed = harness.workspace.query(appUri).diagnostics();
    const diags = diagnosticsForSurface(routed);
    const offset = findOffset(mutated, "middle-name.bind");
    const match = diags.find((diag) =>
      diag.code === "aurelia/unknown-bindable"
      && diag.span
      && spanCoversOffset(diag.span, offset)
    );

    expect(match).toBeDefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
    if (match?.data && typeof match.data === "object") {
      const aurCode = (match.data as { aurCode?: string }).aurCode;
      expect(aurCode).toBe("AUR0707");
    }
  });
});

describe("workspace diagnostics (workspace-contract)", () => {
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

  it("maps unknown controller diagnostics", () => {
    const mutated = insertBefore(
      appText,
      "<template if.bind=\"activeDevice\">",
      "  <template if-not.bind=\"activeDevice\"></template>\n",
    );
    harness.updateTemplate(appUri, mutated, 2);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const offset = findOffset(mutated, "if-not.bind");
    const match = findDiagnostic(diags, "aurelia/unknown-controller", offset);

    expect(match).toBeDefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
    if (match?.data && typeof match.data === "object") {
      const data = match.data as { aurCode?: string; resourceKind?: string };
      const aurCode = data.aurCode;
      expect(aurCode).toBe("AUR0754");
      expect(data.resourceKind).toBe("template-controller");
    }
  });

  it("orders diagnostics by span position", () => {
    const mutated = insertBefore(
      appText,
      "stats.bind=\"stats\"",
      "    missing-first.bind=\"stats\"\n    missing-second.bind=\"stats\"\n",
    );
    harness.updateTemplate(appUri, mutated, 2);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const unknowns = diags.filter((diag) => diag.code === "aurelia/unknown-bindable" && diag.span);
    expect(unknowns.length).toBeGreaterThanOrEqual(2);
    expectNoNormalizationIssues(harness.workspace, appUri);
    const spans = unknowns.map((diag) => diag.span!);
    for (let i = 1; i < spans.length; i += 1) {
      const prev = spans[i - 1];
      const next = spans[i];
      expect(prev.start <= next.start).toBe(true);
    }
  });

  it("dedupes diagnostics with identical spans", () => {
    const mutated = insertBefore(
      appText,
      "stats.bind=\"stats\"",
      "    missing-first.bind=\"stats\"\n    missing-second.bind=\"stats\"\n",
    );
    harness.updateTemplate(appUri, mutated, 3);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const unknowns = diags.filter((diag) => diag.code === "aurelia/unknown-bindable");
    expectNoDuplicateDiagnostics(unknowns);
    expectNoNormalizationIssues(harness.workspace, appUri);
  });

  it("maps unknown binding command diagnostics", () => {
    const mutated = insertBefore(
      appText,
      "<summary-panel",
      "  <div foo.unknowncommand=\"bar\"></div>\n\n",
    );
    harness.updateTemplate(appUri, mutated, 4);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const offset = findOffset(mutated, "unknowncommand") + 1;
    const match = findDiagnostic(diags, "aurelia/unknown-command", offset);

    expect(match).toBeDefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
    if (match?.data && typeof match.data === "object") {
      const data = match.data as { aurCode?: string; command?: string };
      expect(data.aurCode).toBe("AUR0713");
      expect(data.command).toBe("unknowncommand");
    }
  });

  it("maps invalid binding patterns from repeat headers", () => {
    const mutated = insertBefore(
      appText,
      "<summary-panel",
      "  <ul repeat.for=\"item items\"></ul>\n\n",
    );
    harness.updateTemplate(appUri, mutated, 5);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const offset = findOffset(mutated, "item items") + "item ".length;
    const match = findDiagnostic(diags, "aurelia/invalid-binding-pattern", offset);
    expect(match).toBeDefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
  });

  it("marks expression parse errors as recovery diagnostics", () => {
    const mutated = insertBefore(
      appText,
      "<summary-panel",
      "  <div title.bind=\"foo(\"></div>\n\n",
    );
    harness.updateTemplate(appUri, mutated, 6);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const offset = findOffset(mutated, "foo(") + 1;
    const match = findDiagnostic(diags, "aurelia/expr-parse-error", offset);
    expect(match).toBeDefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
    if (match?.data && typeof match.data === "object") {
      const recovery = (match.data as { recovery?: boolean }).recovery;
      expect(recovery).toBe(true);
    }
  });

  it("maps duplicate binding behavior diagnostics", () => {
    const snippet = "title.bind=\"name & debounce & debounce\"";
    const mutated = insertBefore(
      appText,
      "<summary-panel",
      `  <div ${snippet}></div>\n\n`,
    );
    harness.updateTemplate(appUri, mutated, 7);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const start = findOffset(mutated, snippet);
    const first = start + "title.bind=\"name & ".length;
    const second = start + "title.bind=\"name & debounce & ".length;
    const match = diags.find((diag) => {
      if (diag.code !== "aurelia/invalid-binding-pattern" || !diag.span) return false;
      const aurCode = diag.data && typeof diag.data === "object"
        ? (diag.data as { aurCode?: string }).aurCode
        : undefined;
      if (aurCode !== "AUR0102") return false;
      return spanCoversOffset(diag.span, first) || spanCoversOffset(diag.span, second);
    });
    expect(match).toBeDefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
  });

  it("maps conflicting rate-limit behavior diagnostics", () => {
    const mutated = insertBefore(
      appText,
      "<summary-panel",
      "  <div title.bind=\"name & debounce & throttle\"></div>\n\n",
    );
    harness.updateTemplate(appUri, mutated, 8);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const start = findOffset(mutated, "title.bind=\"name & debounce & throttle\"");
    const debounce = start + "title.bind=\"name & ".length;
    const throttle = start + "title.bind=\"name & debounce & ".length;
    const match = diags.find((diag) => {
      if (diag.code !== "aurelia/invalid-binding-pattern" || !diag.span) return false;
      const aurCode = diag.data && typeof diag.data === "object"
        ? (diag.data as { aurCode?: string }).aurCode
        : undefined;
      if (aurCode !== "AUR9996") return false;
      return spanCoversOffset(diag.span, debounce) || spanCoversOffset(diag.span, throttle);
    });
    expect(match).toBeDefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
  });

  it("maps $host assignment diagnostics", () => {
    const mutated = insertBefore(
      appText,
      "<summary-panel",
      "  <div title.bind=\"$host = 1\"></div>\n\n",
    );
    harness.updateTemplate(appUri, mutated, 9);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const offset = findOffset(mutated, "$host") + 1;
    const match = findDiagnostic(diags, "aurelia/invalid-binding-pattern", offset);
    expect(match).toBeDefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
    if (match?.data && typeof match.data === "object") {
      const aurCode = (match.data as { aurCode?: string }).aurCode;
      expect(aurCode).toBe("AUR0106");
    }
  });

  it("reports unresolved import diagnostics from template meta", () => {
    const mutated = insertBefore(
      appText,
      "<summary-panel",
      "  <import from=\"./__missing__.html\"></import>\n\n",
    );
    harness.updateTemplate(appUri, mutated, 10);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const offset = findOffset(mutated, "__missing__") + 1;
    const match = findDiagnostic(diags, "aurelia/unresolved-import", offset);
    expect(match).toBeDefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
  });

  it("reports alias conflicts in template meta", () => {
    const aliasName = "alias-dupe";
    const mutated = insertBefore(
      appText,
      "<summary-panel",
      `  <alias name=\"${aliasName}\"></alias>\n  <alias name=\"${aliasName}\"></alias>\n\n`,
    );
    harness.updateTemplate(appUri, mutated, 11);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const offset = mutated.lastIndexOf(aliasName) + 1;
    const match = findDiagnostic(diags, "aurelia/alias-conflict", offset);
    expect(match).toBeDefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
  });

  it("reports bindable declaration conflicts in template meta", () => {
    const bindableName = "bindable-dupe";
    const mutated = insertBefore(
      appText,
      "<summary-panel",
      `  <bindable name=\"${bindableName}\"></bindable>\n  <bindable name=\"${bindableName}\"></bindable>\n\n`,
    );
    harness.updateTemplate(appUri, mutated, 12);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const offset = mutated.lastIndexOf(bindableName) + 1;
    const match = findDiagnostic(diags, "aurelia/bindable-decl-conflict", offset);
    expect(match).toBeDefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
  });

  it("maps unknown element diagnostics", () => {
    const mutated = insertBefore(
      appText,
      "<summary-panel",
      "  <missing-element></missing-element>\n\n",
    );
    harness.updateTemplate(appUri, mutated, 13);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const offset = findOffset(mutated, "missing-element") + 1;
    const match = findDiagnostic(diags, "aurelia/unknown-element", offset);
    expect(match).toBeDefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
    if (match?.data && typeof match.data === "object") {
      const data = match.data as { resourceKind?: string; name?: string };
      expect(data.resourceKind).toBe("custom-element");
      expect(data.name).toBe("missing-element");
    }
  });

  it("maps unknown attribute diagnostics", () => {
    const mutated = insertBefore(
      appText,
      "<summary-panel",
      "  <div missing-attr=\"${title}\"></div>\n\n",
    );
    harness.updateTemplate(appUri, mutated, 14);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const match = diags.find((diag) => diag.code === "aurelia/unknown-attribute");
    expect(match).toBeDefined();
    expect(match?.span).toBeDefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
    if (match?.data && typeof match.data === "object") {
      const data = match.data as { resourceKind?: string; name?: string };
      expect(data.resourceKind).toBe("custom-attribute");
      expect(data.name).toBe("missing-attr");
    }
  });

  it("maps unknown value converter diagnostics", () => {
    const mutated = insertBefore(
      appText,
      "<summary-panel",
      "  <div title.bind=\"title | missing\"></div>\n\n",
    );
    harness.updateTemplate(appUri, mutated, 15);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const offset = findOffset(mutated, "missing") + 1;
    const match = findDiagnostic(diags, "aurelia/unknown-converter", offset);
    expect(match).toBeDefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
    if (match?.data && typeof match.data === "object") {
      const data = match.data as { aurCode?: string; resourceKind?: string; name?: string };
      expect(data.aurCode).toBe("AUR0103");
      expect(data.resourceKind).toBe("value-converter");
      expect(data.name).toBe("missing");
    }
  });

  it("maps unknown binding behavior diagnostics", () => {
    const mutated = insertBefore(
      appText,
      "<summary-panel",
      "  <div title.bind=\"title & missing\"></div>\n\n",
    );
    harness.updateTemplate(appUri, mutated, 16);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const offset = findOffset(mutated, "missing") + 1;
    const match = findDiagnostic(diags, "aurelia/unknown-behavior", offset);
    expect(match).toBeDefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
    if (match?.data && typeof match.data === "object") {
      const data = match.data as { aurCode?: string; resourceKind?: string; name?: string };
      expect(data.aurCode).toBe("AUR0101");
      expect(data.resourceKind).toBe("binding-behavior");
      expect(data.name).toBe("missing");
    }
  });

  it("maps type mismatch diagnostics", () => {
    // Bind a string expression to if.bind. In the new architecture,
    // if.bind accepts truthy values (string → boolean via truthy coercion),
    // so this should NOT produce a type mismatch.
    const mutated = insertBefore(
      appText,
      "<summary-panel",
      "  <div if.bind=\"filters.search\"></div>\n\n",
    );
    harness.updateTemplate(appUri, mutated, 17);

    const diags = diagnosticsForSurface(harness.workspace.query(appUri).diagnostics());
    const offset = findOffset(mutated, "filters.search") + 1;
    const match = findDiagnostic(diags, "aurelia/expr-type-mismatch", offset);
    // Truthy coercion: string → boolean is accepted for if.bind
    expect(match).toBeUndefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
  });
});

describe("workspace diagnostics (gap reporting)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;

  beforeAll(async () => {
    const fixtureId = asFixtureId("workspace-contract");
    const fixture = getFixture(fixtureId);
    const root = resolveFixtureRoot(fixture);
    if (!root) {
      throw new Error("Expected workspace-contract fixture root.");
    }
    const failOnFiles = [canonicalPath(path.join(root, "src/my-app.ts"))];

    harness = await createWorkspaceHarness({
      fixture,
      openTemplates: "none",
      discovery: {
        partialEvaluation: { failOnFiles },
      },
    });
    appUri = harness.openTemplate("src/my-app.html");
  });

  it("reports gap diagnostics when partial evaluation fails", () => {
    const pipeline = harness.workspace.debugDiagnosticsPipeline(appUri);
    const diags = collectAllDiagnostics(pipeline.aggregated);
    const gaps = diags.filter((diag) => diag.code === "aurelia/gap/partial-eval");
    const gap = gaps.find((diag) => {
      const data = diag.data as { gapKind?: string } | undefined;
      return data?.gapKind === "analysis-failed";
    });
    expect(gap).toBeDefined();
    expectNoNormalizationIssues(harness.workspace, appUri);
    if (gap?.data && typeof gap.data === "object") {
      const gapKind = (gap.data as { gapKind?: string }).gapKind;
      expect(gapKind).toBe("analysis-failed");
    }
  });
});
