import { describe, expect, test, vi } from "vitest";
import { UserCommandsFeature } from "../../../out/features/commands/user-commands.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createTestObservability } from "../../helpers/test-helpers.js";
import { createVscodeApi, stubExtensionContext } from "../../helpers/vscode-stub.js";

function createHarness(options: { inspectResult?: unknown; diagnosticsResult?: unknown } = {}) {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const { observability } = createTestObservability(vscode);
  const inspectEntity = vi.fn(async () => options.inspectResult ?? null);
  const getDiagnostics = vi.fn(async () => options.diagnosticsResult ?? null);
  const ctx = {
    extension: stubExtensionContext(stubVscode),
    vscode,
    observability,
    queries: {
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
        fingerprint: "semantic-runtime:hit",
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
          suppressed: [],
        },
      },
    });

    await recorded.commandHandlers.get("aurelia.diagnosticsReport")?.();

    expect(getDiagnostics).toHaveBeenCalledWith("file:///component.html", expect.objectContaining({ timeoutMs: 1500 }));
    expect(recorded.infoMessages).toEqual([]);
    const opened = recorded.openedDocuments.at(-1);
    expect(opened?.languageId).toBe("markdown");
    expect(opened?.text).toContain("# Aurelia Diagnostics Report");
    expect(opened?.text).toContain("## Active (1 error)");
    expect(opened?.text).toContain("**missing-expression-member**");
    const shown = recorded.shownDocuments.at(-1) as { opts?: { viewColumn?: number } } | undefined;
    expect(shown?.opts?.viewColumn).toBe(2);
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
      expect.objectContaining({ timeoutMs: 1500 }),
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
