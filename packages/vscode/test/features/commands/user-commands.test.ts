import { describe, expect, test, vi } from "vitest";
import { UserCommandsFeature } from "../../../out/features/commands/user-commands.js";
import { AureliaCommand } from "../../../out/product-contract.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createTestServices } from "../../helpers/test-helpers.js";
import { createVscodeApi, stubExtensionContext } from "../../helpers/vscode-stub.js";

interface HarnessOptions {
  diagnosticsResult?: unknown;
  resourcesResult?: unknown;
  scopeResourcesResult?: unknown;
  relatedResult?: unknown;
  quickPickIndex?: number;
}

function createHarness(options: HarnessOptions = {}) {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const quickPicks: Array<{ readonly items: readonly unknown[]; readonly options: unknown }> = [];
  const showQuickPick = vi.fn(async (items: readonly unknown[], pickerOptions: unknown) => {
    quickPicks.push({ items, options: pickerOptions });
    return options.quickPickIndex == null ? undefined : items[options.quickPickIndex];
  });
  Object.assign(stubVscode.window, { showQuickPick });
  const vscode = stubVscode as unknown as VscodeApi;
  const { errors, logger } = createTestServices(vscode);
  const getDiagnostics = vi.fn(async () => options.diagnosticsResult ?? null);
  const getResources = vi.fn(async () => options.resourcesResult ?? null);
  const getScopeResources = vi.fn(async () => options.scopeResourcesResult ?? null);
  const getRelatedFile = vi.fn(async () => options.relatedResult ?? null);
  const ctx = {
    extension: stubExtensionContext(stubVscode),
    vscode,
    logger,
    errors,
    lsp: { getDiagnostics, getResources, getScopeResources, getRelatedFile },
  };

  UserCommandsFeature.activate(ctx as never, (contribution) => contribution);

  const uri = stubVscode.Uri.parse("file:///component.html");
  stubVscode.window.activeTextEditor = {
    document: { uri, version: 7 },
    selection: { active: { line: 3, character: 8 } },
  };

  return {
    recorded,
    quickPicks,
    showQuickPick,
    getDiagnostics,
    getResources,
    getScopeResources,
    getRelatedFile,
  };
}

const completeAnswer = {
  schemaVersion: "0.2",
  result: "answered",
  selection: "not-applicable",
  coverage: "complete",
  summary: "complete",
  page: null,
};

const completeEvidence = {
  definitions: completeAnswer,
  visibility: completeAnswer,
  compilations: completeAnswer,
};

function resource(name: string, uri: string) {
  return {
    id: `definition:${name}`,
    name,
    kind: "custom-element",
    aliases: [{ name: `${name}-alias`, source: null }],
    bindables: [{ name: "value", attribute: "value", primary: true }],
    definition: {
      projectKey: "app",
      key: `au:resource:custom-element:${name}`,
      targetName: "ProductCard",
      defaultProperty: "value",
      declarationModes: ["decorator"],
      source: null,
      nameSource: null,
      targetSource: null,
      targetDeclarationSource: null,
      handles: null,
    },
    visibility: [{
      compilerWorld: "app-root src/main.ts@0..10",
      resourceKind: "custom-element",
      name,
      aliases: [`${name}-alias`],
      visibilityKind: "app-root",
      source: null,
      uri,
    }],
    source: null,
    uri,
    package: null,
    origin: "project",
  };
}

describe("UserCommandsFeature", () => {
  test("diagnosticsReport renders grouped diagnostics, raw evidence, and continuations", async () => {
    const diagnostic = {
      code: "missing-expression-member",
      message: "Property title does not exist",
      severity: "error",
      category: "expression",
      actionability: "guided",
      uri: "file:///component.html",
      span: { start: 8, end: 13 },
      related: [{ message: "Binding context is App", uri: "file:///component.ts", span: { start: 6, end: 9 } }],
      issues: [{ kind: "template-expression-typescript-diagnostic", message: "TS2339", field: "title" }],
      data: { semanticRuntime: { authority: "typescript" } },
    };
    const { recorded, getDiagnostics } = createHarness({
      diagnosticsResult: {
        uri: "file:///component.html",
        answer: {
          ...completeAnswer,
          summary: "One diagnostic.",
          analysisDepth: "type-projection",
          continuations: [{
            kind: "query",
            targetQueryKind: "template-cursor-info",
            rationale: "Inspect the owning expression.",
            cost: "low",
            blockers: ["typescript-program-unavailable"],
          }],
        },
        diagnostics: {
          bySurface: { lsp: [diagnostic] },
          raw: [{ ...diagnostic, status: "primary" }],
          presentation: {
            rawRowCount: 1,
            primaryCount: 1,
            contextualCount: 0,
            complete: true,
            groups: [{
              groupKey: "member:title",
              subject: { subjectKind: "expression-member", subjectName: "title", uri: "file:///component.html", span: { start: 8, end: 13 } },
              primary: { rowId: "row:1", role: "primary", diagnostic },
              related: [],
              rawRowCount: 1,
              primarySeverity: "error",
              maxRawSeverity: "error",
            }],
          },
        },
      },
    });

    await recorded.commandHandlers.get(AureliaCommand.DiagnosticsReport)?.();

    expect(getDiagnostics).toHaveBeenCalledWith("file:///component.html");
    const report = recorded.openedDocuments.at(-1)?.text ?? "";
    expect(report).toContain("# Aurelia Diagnostics Report");
    expect(report).toContain("## Presented Diagnostics (1)");
    expect(report).toContain("### missing-expression-member");
    expect(report).toContain("Subject: expression-member title");
    expect(report).toContain("Evidence: template-expression-typescript-diagnostic (title) - TS2339");
    expect(report).toContain('"authority": "typescript"');
    expect(report).toContain("## Raw Evidence (1)");
    expect(report).toContain("## Follow-up Analysis (1)");
    expect(report).toContain("Blocked: typescript-program-unavailable");
    expect(recorded.shownDocuments.at(-1)?.opts).toEqual(expect.objectContaining({ viewColumn: 2 }));
  });

  test("diagnosticsReport retains raw evidence when presentation is empty", async () => {
    const { recorded } = createHarness({
      diagnosticsResult: {
        uri: "file:///component.html",
        answer: { ...completeAnswer, coverage: "open", summary: "One contextual row remains." },
        diagnostics: {
          bySurface: { lsp: [] },
          raw: [{ code: "analysis-context", message: "Context remains inspectable.", severity: "info", status: "contextual" }],
        },
      },
    });

    await recorded.commandHandlers.get(AureliaCommand.DiagnosticsReport)?.();

    const report = recorded.openedDocuments.at(-1)?.text ?? "";
    expect(report).toContain("No diagnostics were presented, but analysis coverage is not complete.");
    expect(report).toContain("## Raw Evidence (1)");
    expect(report).toContain("### analysis-context [contextual]");
  });

  test("findResource presents exact metadata and opens the selected declaration", async () => {
    const selected = resource("product-card", "file:///C:/repo/src/product-card.ts");
    const { recorded, quickPicks, getResources } = createHarness({
      resourcesResult: {
        fingerprint: "one:ready",
        resources: [{ ...selected, workspace: { key: "one", name: "shop", uri: "file:///repo" } }],
        templateCount: 1,
        inlineTemplateCount: 0,
        workspaces: [{ key: "one", name: "shop", uri: "file:///repo", status: "ready", resourceCount: 1, templateCount: 1, inlineTemplateCount: 0, evidence: completeEvidence }],
      },
      quickPickIndex: 0,
    });

    await recorded.commandHandlers.get(AureliaCommand.FindResource)?.();

    expect(getResources).toHaveBeenCalledOnce();
    expect(quickPicks[0]?.items[0]).toEqual(expect.objectContaining({
      label: "$(home) product-card",
      description: "element",
      detail: "ProductCard · decorator · 1 alias · 1 bindable · 1 compiler world",
      resourceUri: "file:///C:/repo/src/product-card.ts",
    }));
    expect(recorded.openedDocuments.at(-1)?.uri.fsPath).toContain("product-card.ts");
  });

  test("findResource exposes partial workspace failure instead of silently presenting completeness", async () => {
    const selected = resource("product-card", "file:///C:/repo/src/product-card.ts");
    const { recorded } = createHarness({
      resourcesResult: {
        fingerprint: "one:ready|two:error",
        resources: [{ ...selected, workspace: { key: "one", name: "shop", uri: "file:///repo" } }],
        templateCount: 1,
        inlineTemplateCount: 0,
        workspaces: [
          { key: "one", name: "shop", uri: "file:///repo", status: "ready", resourceCount: 1, templateCount: 1, inlineTemplateCount: 0, evidence: completeEvidence },
          { key: "two", name: "admin", uri: "file:///admin", status: "error", error: "analysis failed" },
        ],
      },
    });

    await recorded.commandHandlers.get(AureliaCommand.FindResource)?.();

    expect(recorded.infoMessages).toContain("Resource results exclude admin because analysis failed.");
  });

  test("findResource reports all-workspace failure through the shared error boundary", async () => {
    const { recorded } = createHarness({
      resourcesResult: {
        fingerprint: "one:error",
        resources: [],
        templateCount: 0,
        inlineTemplateCount: 0,
        workspaces: [{ key: "one", name: "shop", uri: "file:///repo", status: "error", error: "analysis failed" }],
      },
    });

    await recorded.commandHandlers.get(AureliaCommand.FindResource)?.();

    expect(recorded.errorMessages).toEqual([
      "command.findResource: Resource analysis failed for shop.",
    ]);
    expect(recorded.infoMessages).toEqual([]);
  });

  test("showAvailableResources spends exact scoped inventory and evidence", async () => {
    const selected = resource("product-card", "C:/repo/src/product-card.ts");
    const { recorded, quickPicks, getScopeResources } = createHarness({
      scopeResourcesResult: {
        compilerWorlds: ["app-root src/main.ts@0..10"],
        scopeLabel: "app-root src/main.ts@0..10",
        resources: [selected],
        evidence: completeEvidence,
      },
      quickPickIndex: 0,
    });

    await recorded.commandHandlers.get(AureliaCommand.ShowAvailableResources)?.();

    expect(getScopeResources).toHaveBeenCalledWith("file:///component.html");
    expect(quickPicks[0]?.options).toEqual(expect.objectContaining({
      title: "Resources in scope: app-root src/main.ts@0..10",
      placeHolder: "1 resources available in this template",
    }));
    expect(quickPicks[0]?.items[0]).toEqual(expect.objectContaining({
      label: "$(home) product-card",
      detail: "ProductCard · decorator · 1 alias · 1 bindable · 1 compiler world",
    }));
    expect(recorded.openedDocuments.at(-1)?.uri.fsPath).toContain("product-card.ts");
  });

  test("openRelatedFile navigates to the server-owned counterpart", async () => {
    const { recorded, getRelatedFile } = createHarness({
      relatedResult: { uri: "file:///component.ts", kind: "component" },
    });

    await recorded.commandHandlers.get(AureliaCommand.OpenRelatedFile)?.();

    expect(getRelatedFile).toHaveBeenCalledWith("file:///component.html");
    expect(recorded.openedDocuments.at(-1)?.uri.toString()).toBe("file:///component.ts");
  });
});
