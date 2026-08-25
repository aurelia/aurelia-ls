import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from "../src/index.js";

const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

describe("authoring template cache admission", () => {
  test("does not reuse a project-only app for a later source-locus diagnostic query", async () => {
    const fixtureRoot = path.join(packageRoot, "fixtures/pressure/template-compiler-errors");
    const sourceFilePath = path.join(fixtureRoot, "src/local-bindable-probe.html");
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: "authoring-template-cache-admission",
    });

    await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.AppDiagnostics,
      analysisDepth: "binding-observation",
      includeAuthoringTemplates: false,
      appRetention: "retain-app",
    });
    const answer = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.AppDiagnostics,
      sourceFilePath,
      sourceFile: { filePath: sourceFilePath },
      analysisDepth: "binding-observation",
      includeAuthoringTemplates: true,
      appRetention: "retain-app",
      diagnosticProjection: "type-projection",
      page: { size: 100 },
    });

    expect(answer.value.rows).not.toHaveLength(0);
    expect(answer.value.rows.every((row) => row.diagnosticDomain === "template")).toBe(true);
    expect(answer.value.rows.every((row) => row.diagnosticKind === "template-compiler-error")).toBe(true);
    expect(answer.value.rows.every((row) => row.source?.path?.endsWith("local-bindable-probe.html") === true)).toBe(true);
  });
});
