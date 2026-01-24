import { beforeAll, describe, expect, it } from "vitest";
import { createWorkspaceHarness } from "./harness/index.js";
import { asFixtureId } from "./fixtures/index.js";
import type { DiagnosticSurface } from "@aurelia-ls/compiler";
import type { SemanticWorkspaceEngine } from "../src/engine.js";
import type { WorkspaceDiagnostic, WorkspaceDiagnostics } from "../src/types.js";

function insertBefore(text: string, marker: string, insert: string): string {
  const index = text.indexOf(marker);
  if (index < 0) {
    throw new Error(`Marker not found: ${marker}`);
  }
  return text.slice(0, index) + insert + text.slice(index);
}

function diagnosticsForSurface(
  routed: WorkspaceDiagnostics,
  surface: DiagnosticSurface = "lsp",
): readonly WorkspaceDiagnostic[] {
  return routed.bySurface.get(surface) ?? [];
}

function expectNoNormalizationIssues(workspace: SemanticWorkspaceEngine, uri: string): void {
  const issues = workspace.debugDiagnosticsPipeline(uri).normalization.issues;
  if (issues.length > 0) {
    throw new Error(`Normalization issues detected:\n${JSON.stringify(issues, null, 2)}`);
  }
}

describe("workspace-editing-loop (workspace-contract)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
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

  it("surfaces diagnostics when unknown resources are introduced", async () => {
    const local = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    const uri = local.openTemplate("src/my-app.html");
    const text = local.readText(uri);
    if (!text) {
      throw new Error("Expected template text for workspace-contract my-app.html");
    }
    const mutated = insertBefore(text, "<summary-panel", "  <unknown-widget></unknown-widget>\n  ");
    local.updateTemplate(uri, mutated, 2);
    const diags = diagnosticsForSurface(local.workspace.query(uri).diagnostics());
    expect(diags.length).toBeGreaterThan(0);
    expectNoNormalizationIssues(local.workspace, uri);
  });

  it.todo("resolves definitions for element tags once TypeScript services are wired");
  it.todo("finds references across templates and view-model symbols");
});
