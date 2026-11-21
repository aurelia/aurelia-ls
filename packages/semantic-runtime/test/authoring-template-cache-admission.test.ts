import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  type SemanticResourceDefinitionsResult,
} from "../src/index.js";

const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

describe("authoring template cache admission", () => {
  test("one-off single and batch queries preserve another project's app and returned handle", async () => {
    const workspaceRoot = path.join(packageRoot, "fixtures/pressure");
    const projects = ["aliased-bindable-surfaces", "runtime-scope-api-errors"].map(projectKey => ({
      projectKey, rootDir: path.join(workspaceRoot, projectKey),
    }));
    const runtime = await createSemanticRuntime({ workspaceRoot, projects });
    const retained = await runtime.openApp({ projectKey: projects[0]!.projectKey });
    const definitions = retained.ask({ kind: SemanticAppQueryKind.ResourceDefinitions, detail: "handles" });
    const handle = (definitions.value as SemanticResourceDefinitionsResult).rows[0]!.handles!.definitionProductHandle!;
    expect(runtime.workspace.store.readProduct(handle)).toBeTruthy();
    const request = { projectKey: projects[1]!.projectKey, inquiryProfile: "mcp-orientation" as const };
    for (const run of [
      () => runtime.answerAppQuery({ ...request, kind: SemanticAppQueryKind.Summary }),
      () => runtime.answerAppQueries({ ...request, queries: [{ kind: SemanticAppQueryKind.Summary }] }),
    ]) {
      expect((await run()).result).toBe("answered");
      expect(retained.summary().result).toBe("answered");
      expect(runtime.workspace.store.readProduct(handle)).toBeTruthy();
      expect(runtime.sessionAnalysisCacheOverview().value.cachedAppCount).toBe(1);
    }
    runtime.sessionAnalysisCacheClear();
    expect(retained.isCurrent()).toBe(false);
    expect(runtime.workspace.store.readProduct(handle)).toBeFalsy();
  });

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
