import { describe, expect, test, vi } from "vitest";
import { UserCommandsFeature } from "../../../out/features/commands/user-commands.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createTestServices } from "../../helpers/test-helpers.js";
import { createVscodeApi, stubExtensionContext } from "../../helpers/vscode-stub.js";

function createHarness(options: { inspectResult?: unknown; diagnosticsResult?: unknown } = {}) {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const { errors, logger, config } = createTestServices(vscode);
  const inspectEntity = vi.fn(async () => options.inspectResult ?? null);
  const getDiagnostics = vi.fn(async () => options.diagnosticsResult ?? null);
  const ctx = {
    extension: stubExtensionContext(stubVscode),
    vscode,
    logger,
    errors,
    config: { current: config },
    lsp: {
      getDiagnostics,
      inspectEntity,
    },
  };

  UserCommandsFeature.activate(ctx as never);

  const uri = stubVscode.Uri.parse("file:///component.html");
  const position = { line: 3, character: 8 };
  stubVscode.window.activeTextEditor = {
    document: { uri, version: 7 },
    selection: { active: position },
  };

  return { recorded, inspectEntity, getDiagnostics, position };
}

describe("UserCommandsFeature", () => {
  test("diagnosticsReport opens semantic-runtime diagnostics in a markdown editor", async () => {
    const { recorded, getDiagnostics } = createHarness({
      diagnosticsResult: {
        uri: "file:///component.html",
        answer: {
          schemaVersion: "0.2",
          result: "answered",
          selection: "not-applicable",
          coverage: "complete",
          summary: "One diagnostic.",
          page: null,
        },
        diagnostics: {
          bySurface: {
            lsp: [
              {
                code: "missing-expression-member",
                message: "Property title does not exist",
                severity: "error",
                category: "expression",
                actionability: "guided",
              },
            ],
          },
          raw: [
            {
              code: "missing-expression-member",
              message: "Property title does not exist",
              severity: "error",
              status: "primary",
            },
          ],
        },
      },
    });

    await recorded.commandHandlers.get("aurelia.diagnosticsReport")?.();

    expect(getDiagnostics).toHaveBeenCalledWith("file:///component.html");
    expect(recorded.infoMessages).toEqual([]);
    const opened = recorded.openedDocuments.at(-1);
    expect(opened?.languageId).toBe("markdown");
    expect(opened?.text).toContain("# Aurelia Diagnostics Report");
    expect(opened?.text).toContain("## Active (1 error)");
    expect(opened?.text).toContain("**missing-expression-member**");
    expect(opened?.text).toContain("coverage=complete");
    expect(opened?.text).toContain("## Raw Evidence (1)");
    const shown = recorded.shownDocuments.at(-1) as { opts?: { viewColumn?: number } } | undefined;
    expect(shown?.opts?.viewColumn).toBe(2);
  });

  test("diagnosticsReport retains raw evidence when the LSP presentation is empty", async () => {
    const { recorded } = createHarness({
      diagnosticsResult: {
        uri: "file:///component.html",
        answer: {
          schemaVersion: "0.2",
          result: "answered",
          selection: "not-applicable",
          coverage: "open",
          summary: "No presented diagnostic; one contextual row remains.",
          page: null,
        },
        diagnostics: {
          bySurface: { lsp: [] },
          raw: [{
            code: "analysis-context",
            message: "A contextual diagnostic row remains inspectable.",
            severity: "information",
            status: "contextual",
          }],
        },
      },
    });

    await recorded.commandHandlers.get("aurelia.diagnosticsReport")?.();

    const report = recorded.openedDocuments.at(-1)?.text;
    expect(report).toContain("No diagnostics were presented, but analysis coverage is not complete.");
    expect(report).toContain("## Raw Evidence (1)");
    expect(report).toContain("**analysis-context** [contextual]");
  });

  test("inspectAtCursor opens semantic-runtime details in a markdown editor", async () => {
    const { recorded, inspectEntity, position } = createHarness({
      inspectResult: {
        uri: "file:///component.html",
        entityKind: "member",
        expressionLabel: "title",
        confidence: {
          resource: "source-backed",
          type: "projected",
          scope: "source-backed",
          expression: "parsed",
          composite: "hit",
        },
        detail: {
          kind: "member",
          name: "title",
          symbolKind: "property",
          symbolType: "string",
          ownerType: "App",
        },
      },
    });

    await recorded.commandHandlers.get("aurelia.inspectAtCursor")?.();

    expect(inspectEntity).toHaveBeenCalledWith(
      "file:///component.html",
      position,
    );
    expect(recorded.infoMessages).toEqual([]);
    const opened = recorded.openedDocuments.at(-1);
    expect(opened?.languageId).toBe("markdown");
    expect(opened?.text).toContain("# Aurelia Inspect");
    expect(opened?.text).toContain("**Entity:** `member`");
    expect(opened?.text).toContain("| Overall | hit |");
    expect(opened?.text).toContain("- **symbolType:** string");
    const shown = recorded.shownDocuments.at(-1) as { opts?: { viewColumn?: number } } | undefined;
    expect(shown?.opts?.viewColumn).toBe(2);
  });

  test("inspectAtCursor reports when no runtime fact is available", async () => {
    const { recorded } = createHarness();

    await recorded.commandHandlers.get("aurelia.inspectAtCursor")?.();

    expect(recorded.infoMessages).toEqual(["No Aurelia semantic fact at this position"]);
    expect(recorded.openedDocuments).toHaveLength(0);
  });
});
