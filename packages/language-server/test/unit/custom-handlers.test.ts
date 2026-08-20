import path from "node:path";
import { pathToFileURL } from "node:url";
import { test, expect, describe, vi } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  handleRenameFromTs,
  handleSourceOwnership,
  handleWorkspaceStatus,
} from "../../src/handlers/custom.js";
import {
  createContextTestOperation,
  createTestOperation,
  testAnalysisGeneration,
} from "./test-request-guard.js";
import { testWorkspaceDocumentUris } from "./test-document-uris.js";

const defaultWorkspaceRoot = "/test/workspace";
const defaultDocumentUris = testWorkspaceDocumentUris(defaultWorkspaceRoot);
const defaultTemplateUri = defaultDocumentUris.uriForWorkspaceRelativePath("test.html")!;

function createMockLogger() {
  return {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };
}

function snapshot(
  uri: string,
  text: string,
  version: number | null = null,
  languageId = uri.endsWith(".ts") ? "typescript" : "html",
) {
  return {
    uri,
    languageId,
    version,
    text,
  };
}

function createMockContext(overrides: Record<string, unknown> = {}) {
  const logger = createMockLogger();
  const workspaceRoot = typeof overrides["workspaceRoot"] === "string"
    ? overrides["workspaceRoot"]
    : defaultWorkspaceRoot;
  return {
    logger,
    ensureProgramDocument: vi.fn(() => ({ offsetAt: vi.fn(() => 0) })),
    lookupText: vi.fn(() => null),
    lookupDocumentSnapshot: vi.fn(() => null),
    workspaceRoot,
    documentUris: testWorkspaceDocumentUris(workspaceRoot),
    documents: {
      all: vi.fn(() => []),
    },
    semanticRuntime: {
      authoredSourceOwnership: vi.fn(() => Promise.resolve({
        schemaVersion: "0.2",
        result: "answered",
        selection: "exact",
        coverage: "complete",
        summary: "one exact owner",
        value: {
          sourceFilePath: path.join(workspaceRoot, "src/app.ts"),
          templateOwned: true,
          owners: [{
            projectKey: "app",
            projectRootDir: workspaceRoot,
            projectPath: "src/app.ts",
            role: "app-source",
          }],
        },
        page: null,
      })),
      nativeProjectConfigurations: vi.fn(() => Promise.resolve({
        schemaVersion: "0.2",
        result: "answered",
        selection: "not-applicable",
        coverage: "complete",
        summary: "one exact native configuration",
        value: {
          displayText: "one exact native configuration",
          rows: [{
            projectKey: "app",
            projectRootDir: "/test/workspace",
            filePath: "/test/workspace/aurelia.project.json",
            appliedExcludedSourceRootDirs: ["/test/workspace/golden"],
            diagnosticCount: 0,
          }],
        },
        page: null,
      })),
      appDiagnostics: vi.fn(() =>
        Promise.resolve({
          schemaVersion: "0.2",
          result: "answered",
          selection: "not-applicable",
          coverage: "complete",
          summary: "mock",
          value: {
            displayText: "mock",
            typeScript: null,
            rows: [],
            presentation: {
              rawRowCount: 0,
              primaryCount: 0,
              contextualCount: 0,
              withheldCount: 0,
              complete: true,
              groups: [],
              withheld: [],
            },
          },
          page: null,
        }),
      ),
      templateRenameFromTypeScript: vi.fn(() =>
        Promise.resolve({
          schemaVersion: "0.2",
          result: "answered",
          selection: "not-applicable",
          coverage: "complete",
          summary: "mock",
          value: {
            displayText: "mock",
            status: "available",
            reason: null,
            selectedMemberName: "title",
            placeholder: "title",
            targetSource: null,
            activeSource: null,
            edits: [],
            candidateRows: [],
            templateReferenceCount: 0,
            typeScriptReferenceCount: 0,
          },
          page: null,
        }),
      ),
      workspaceSummary: vi.fn(() => Promise.resolve({
        schemaVersion: "0.2",
        result: "answered",
        selection: "not-applicable",
        coverage: "complete",
        summary: "workspace summary",
        value: {
          workspaceRoot: "/test/workspace",
          workspaceKey: "workspace",
          displayText: "one app",
          nativeProjectConfigurationCount: 1,
          nativeProjectConfigurationDiagnosticCount: 0,
          projectShapeCounts: [{ shapeKind: "aurelia-app", count: 1 }],
          projectAnalysisCounts: [{ analysisKind: "app-world", count: 1 }],
          defaultAppProjectKey: "app",
          appCandidates: [],
          projects: [],
        },
        page: null,
      })),
    },
    ...overrides,
  };
}

describe("handleSourceOwnership", () => {
  test("does not classify an app-source document as a template document", async () => {
    const ctx = createMockContext();
    const uri = ctx.documentUris.uriForWorkspaceRelativePath("src/app.ts")!;

    const response = await handleSourceOwnership(ctx as never, { uri }, createContextTestOperation(ctx));

    expect(response).toEqual({
      fingerprint: testAnalysisGeneration.fingerprint,
      sourceUri: ctx.documentUris.resolve(uri).uri,
      answer: expect.objectContaining({
        result: "answered",
        selection: "exact",
        coverage: "complete",
      }),
      templateOwned: false,
      owners: [{
        projectKey: "app",
        rootUri: ctx.documentUris.uriForHostPath(defaultWorkspaceRoot),
        projectPath: "src/app.ts",
        role: "app-source",
      }],
    });
    expect(response).not.toHaveProperty("sourceFilePath");
  });

  test.each([
    ["src/component.html", true],
    ["src/unrelated.html", false],
  ] as const)("derives exact ownership for %s from the bounded converged template set", async (projectPath, expected) => {
    const ctx = createMockContext();
    const uri = ctx.documentUris.uriForWorkspaceRelativePath(projectPath)!;
    const operation = createTestOperation({
      authoredSourceOwnership: vi.fn(async () => ({
        schemaVersion: "0.2",
        result: "answered",
        selection: "exact",
        coverage: "complete",
        summary: "one exact owner",
        value: {
          sourceFilePath: path.join(defaultWorkspaceRoot, projectPath),
          templateOwned: true,
          owners: [{
            projectKey: "app",
            projectRootDir: defaultWorkspaceRoot,
            projectPath,
            role: "template",
          }],
        },
        page: null,
      })),
      templateDocumentOwnership: vi.fn(async () => ({
        schemaVersion: "0.2",
        result: "answered",
        selection: "not-applicable",
        coverage: "complete",
        summary: "one template document",
        value: {
          projectKey: "app",
          rootDir: defaultWorkspaceRoot,
          sources: [{
            kind: "source-file",
            label: "component template",
            path: "src/component.html",
          }],
        },
        page: null,
      })),
      appTopology: vi.fn(() => {
        throw new Error("Source ownership must not materialize application topology.");
      }),
    });

    const response = await handleSourceOwnership(ctx as never, { uri }, operation);

    expect(response.templateOwned).toBe(expected);
    expect(operation.templateDocumentOwnership).toHaveBeenCalledWith("app");
    expect(operation.appTopology).not.toHaveBeenCalled();
  });

  test("checks every exact overlapping project owner without projecting topology", async () => {
    const ctx = createMockContext();
    const projectPath = "src/component.html";
    const uri = ctx.documentUris.uriForWorkspaceRelativePath(projectPath)!;
    const sourceFilePath = path.join(defaultWorkspaceRoot, projectPath);
    const templateDocumentOwnership = vi.fn(async (projectKey: string) => ({
      schemaVersion: "0.2" as const,
      result: "answered" as const,
      selection: "not-applicable" as const,
      coverage: "complete" as const,
      summary: `${projectKey} template documents`,
      value: {
        projectKey,
        rootDir: defaultWorkspaceRoot,
        sources: projectKey === "second"
          ? [{ kind: "source-file", label: "component template", path: projectPath }]
          : [{ kind: "source-file", label: "other template", path: "src/other.html" }],
      },
      page: null,
    }));
    const operation = createTestOperation({
      authoredSourceOwnership: vi.fn(async () => ({
        schemaVersion: "0.2",
        result: "answered",
        selection: "exact",
        coverage: "complete",
        summary: "two exact owners",
        value: {
          sourceFilePath,
          templateOwned: true,
          owners: ["first", "first", "second"].map((projectKey) => ({
            projectKey,
            projectRootDir: defaultWorkspaceRoot,
            projectPath,
            role: "template",
          })),
        },
        page: null,
      })),
      templateDocumentOwnership,
      appTopology: vi.fn(() => {
        throw new Error("Source ownership must not materialize application topology.");
      }),
    });

    const response = await handleSourceOwnership(ctx as never, { uri }, operation);

    expect(response.templateOwned).toBe(true);
    expect(templateDocumentOwnership.mock.calls).toEqual([["first"], ["second"]]);
    expect(operation.appTopology).not.toHaveBeenCalled();
  });
});

describe("handleWorkspaceStatus", () => {
  test("returns the semantic-runtime summary envelope without reclassifying project shape", async () => {
    const ctx = createMockContext();
    const operation = createContextTestOperation(ctx);

    const configUri = defaultDocumentUris.uriForHostPath("/test/workspace/aurelia.project.json");
    const response = await handleWorkspaceStatus(ctx as never, {
      nativeProjectConfigurationUris: [configUri],
    }, operation);

    expect(ctx.semanticRuntime.workspaceSummary).toHaveBeenCalledWith();
    expect(ctx.semanticRuntime.nativeProjectConfigurations).toHaveBeenCalledWith([configUri]);
    expect(response?.fingerprint).toBe(testAnalysisGeneration.fingerprint);
    expect(response?.projectAnalysisCounts).toEqual([{ analysisKind: "app-world", count: 1 }]);
    expect(response?.nativeProjectConfigurations.rows).toEqual([{
      projectKey: "app",
      projectRootUri: defaultDocumentUris.uriForHostPath("/test/workspace"),
      sourceUri: defaultDocumentUris.uriForHostPath("/test/workspace/aurelia.project.json"),
      appliedExcludedSourceRootUris: [defaultDocumentUris.uriForHostPath("/test/workspace/golden")],
      diagnosticCount: 0,
    }]);
    expect(response?.answer.coverage).toBe("complete");
    expect(response).not.toHaveProperty("value");
  });
});

describe("handleRenameFromTs", () => {
  const renameWorkspaceRoot = path.resolve("test-workspace");
  const renameTypeScriptUri = pathToFileURL(path.join(renameWorkspaceRoot, "src/app.ts")).toString();

  test("maps one validated TypeScript and Aurelia rename plan", async () => {
    const tsDocument = TextDocument.create(
      renameTypeScriptUri,
      "typescript",
      1,
      "class App { title = ''; }",
    );
    const templateText = "<p>${title}</p>";
    const ctx = createMockContext({
      workspaceRoot: renameWorkspaceRoot,
      ensureProgramDocument: vi.fn(() => tsDocument),
      lookupText: vi.fn(() => templateText),
      lookupDocumentSnapshot: vi.fn((uri: string) =>
        uri.endsWith("/src/app.html")
          ? snapshot(uri, templateText, 4, "html")
          : null,
      ),
    });
    ctx.semanticRuntime.templateRenameFromTypeScript.mockResolvedValue({
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      summary: "mock",
      value: {
        displayText: "mock",
        status: "available",
        reason: null,
        selectedMemberName: "title",
        placeholder: "title",
        targetSource: {
          kind: "source-span-address",
          label: "src/app.ts@12..17",
          path: "src/app.ts",
          start: 12,
          end: 17,
        },
        activeSource: {
          kind: "source-span-address",
          label: "src/app.ts@12..17",
          path: "src/app.ts",
          start: 12,
          end: 17,
        },
        edits: [
          {
            editKind: "typescript-reference",
            source: {
              kind: "source-span-address",
              label: "src/app.ts@12..17",
              path: "src/app.ts",
              start: 12,
              end: 17,
            },
            oldText: "title",
            newText: "heading",
          },
          {
            editKind: "template-usage",
            source: {
              kind: "source-span-address",
              label: "src/app.html@5..10",
              path: "src/app.html",
              start: 5,
              end: 10,
            },
            oldText: "title",
            newText: "heading",
          },
        ],
        candidateRows: [],
        templateReferenceCount: 1,
        typeScriptReferenceCount: 1,
      },
      page: null,
    });

    const result = await handleRenameFromTs(
      ctx as never,
      {
        uri: tsDocument.uri,
        position: { line: 0, character: 12 },
        newName: "heading",
      },
      createContextTestOperation(ctx),
    );

    expect(
      ctx.semanticRuntime.templateRenameFromTypeScript,
    ).toHaveBeenCalledWith(
      tsDocument.uri,
      { line: 0, character: 12 },
      "heading",
    );
    expect(result).toMatchObject({
      status: "success",
      templateReferenceCount: 1,
      typeScriptReferenceCount: 1,
      candidateCount: 0,
    });
    if (result.status !== "success") {
      throw new Error("Expected successful rename propagation.");
    }
    const changes = result.workspaceEdit.documentChanges ?? [];
    expect(changes).toHaveLength(2);
    expect(changes[0]).toMatchObject({
      textDocument: {
        uri: expect.stringContaining("src/app.ts"),
        version: 1,
      },
    });
    expect(changes[1]).toMatchObject({
      textDocument: {
        uri: expect.stringContaining("src/app.html"),
        version: 4,
      },
    });
    expect("edits" in changes[1]! ? changes[1].edits : []).toEqual([
      {
        range: {
          start: { line: 0, character: 5 },
          end: { line: 0, character: 10 },
        },
        newText: "heading",
      },
    ]);
  });

  test("maps semantic-runtime preparation for a cross-domain symbol", async () => {
    const tsDocument = TextDocument.create(
      renameTypeScriptUri,
      "typescript",
      1,
      "class App { title = ''; }",
    );
    const ctx = createMockContext({
      workspaceRoot: renameWorkspaceRoot,
      ensureProgramDocument: vi.fn(() => tsDocument),
    });
    ctx.semanticRuntime.templateRenameFromTypeScript.mockResolvedValue({
      schemaVersion: "0.2",
      result: "answered",
      selection: "exact",
      coverage: "complete",
      summary: "available",
      value: {
        displayText: "available",
        status: "available",
        reason: null,
        selectedMemberName: "title",
        placeholder: "title",
        targetSource: null,
        activeSource: {
          kind: "source-span-address",
          label: "src/app.ts@12..17",
          path: "src/app.ts",
          start: 12,
          end: 17,
        },
        edits: [],
        candidateRows: [],
        templateReferenceCount: 1,
        typeScriptReferenceCount: 0,
      },
      page: null,
    });

    const result = await handleRenameFromTs(
      ctx as never,
      { uri: tsDocument.uri, position: { line: 0, character: 13 } },
      createContextTestOperation(ctx),
    );

    expect(result).toEqual({
      status: "available",
      range: {
        start: { line: 0, character: 12 },
        end: { line: 0, character: 17 },
      },
      placeholder: "title",
      message: "available",
      templateReferenceCount: 1,
      typeScriptReferenceCount: 0,
      candidateCount: 0,
    });
    expect(ctx.semanticRuntime.templateRenameFromTypeScript).toHaveBeenCalledWith(
      tsDocument.uri,
      { line: 0, character: 13 },
      null,
    );
  });

  test("returns not-applicable when a TypeScript symbol has no Aurelia references", async () => {
    const tsDocument = TextDocument.create(
      renameTypeScriptUri,
      "typescript",
      1,
      "class App { title = ''; }",
    );
    const ctx = createMockContext({
      workspaceRoot: renameWorkspaceRoot,
      ensureProgramDocument: vi.fn(() => tsDocument),
    });
    ctx.semanticRuntime.templateRenameFromTypeScript.mockResolvedValue({
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      summary: "not applicable",
      value: {
        displayText: "No proven Aurelia references.",
        status: "not-available",
        reason: "no-aurelia-references",
        selectedMemberName: "title",
        placeholder: "title",
        targetSource: null,
        activeSource: null,
        edits: [],
        candidateRows: [],
        templateReferenceCount: 0,
        typeScriptReferenceCount: 0,
      },
      page: null,
    });

    const result = await handleRenameFromTs(
      ctx as never,
      {
        uri: tsDocument.uri,
        position: { line: 0, character: 12 },
        newName: "heading",
      },
      createContextTestOperation(ctx),
    );

    expect(result).toMatchObject({
      status: "not-applicable",
      reason: "no-aurelia-references",
      templateReferenceCount: 0,
      typeScriptReferenceCount: 0,
      candidateCount: 0,
    });
  });

  test("returns blocked when any cross-domain edit fails old-text validation", async () => {
    const tsDocument = TextDocument.create(
      renameTypeScriptUri,
      "typescript",
      1,
      "class App { title = ''; }",
    );
    const ctx = createMockContext({
      workspaceRoot: renameWorkspaceRoot,
      ensureProgramDocument: vi.fn(() => tsDocument),
      lookupText: vi.fn(() => "<p>${stale}</p>"),
      lookupDocumentSnapshot: vi.fn((uri: string) =>
        uri.endsWith("/src/app.html")
          ? snapshot(uri, "<p>${stale}</p>", 4, "html")
          : null,
      ),
    });
    ctx.semanticRuntime.templateRenameFromTypeScript.mockResolvedValue({
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      summary: "mock",
      value: {
        displayText: "mock",
        status: "available",
        reason: null,
        selectedMemberName: "title",
        placeholder: "title",
        targetSource: null,
        activeSource: null,
        edits: [
          {
            editKind: "template-usage",
            source: {
              kind: "source-span-address",
              label: "src/app.html@5..10",
              path: "src/app.html",
              start: 5,
              end: 10,
            },
            oldText: "title",
            newText: "heading",
          },
        ],
        candidateRows: [],
        templateReferenceCount: 1,
        typeScriptReferenceCount: 0,
      },
      page: null,
    });

    const result = await handleRenameFromTs(
      ctx as never,
      {
        uri: tsDocument.uri,
        position: { line: 0, character: 12 },
        newName: "heading",
      },
      createContextTestOperation(ctx),
    );

    expect(result).toMatchObject({
      status: "blocked",
      reason: "mapping-failed",
      templateReferenceCount: 1,
      typeScriptReferenceCount: 0,
      candidateCount: 0,
    });
    expect(result.status === "blocked" ? result.failures?.[0] : "").toContain(
      'expected "title"',
    );
  });
});
