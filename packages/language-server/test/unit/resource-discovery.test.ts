import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, test, vi } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  handleResourceInventory,
  handleTemplateResourceAvailability,
} from "../../src/handlers/custom.js";
import { testAnalysisGeneration, testRequestGuard } from "./test-request-guard.js";
import { testWorkspaceDocumentUris } from "./test-document-uris.js";

const workspaceRoot = path.resolve("resource-discovery-workspace");
const componentPath = path.join(workspaceRoot, "src", "my-app.html");
const componentUri = pathToFileURL(componentPath).toString();
const sourceText = "class ProductCard {}";

describe("resource discovery protocol boundary", () => {
  test("queries every explicit app project and preserves partial project failure", async () => {
    const first = project("first", workspaceRoot);
    const second = project("second", path.join(workspaceRoot, "nested"));
    const resourceInventory = vi.fn(async (projectKey: string) => {
      if (projectKey === second.projectKey) throw new Error("second project failed");
      return answer(inventoryValue(resourceRow()));
    });
    const ctx = context({
      workspaceSummary: vi.fn(async () => answer({ appCandidates: [first, second] })),
      resourceInventory,
    });

    const result = await handleResourceInventory(ctx as never, testRequestGuard);

    expect(resourceInventory.mock.calls.map(([projectKey]) => projectKey)).toEqual(["first", "second"]);
    expect(result.fingerprint).toBe(testAnalysisGeneration.fingerprint);
    expect(result.projects).toHaveLength(2);
    expect(result.projects[0]).toMatchObject({
      status: "ready",
      project: { projectKey: "first" },
      resources: [{ identityKey: "resource:product-card:v1" }],
    });
    if (result.projects[0]?.status !== "ready") throw new Error("Expected ready project.");
    expect(result.projects[0].resources[0]?.navigation).toMatchObject({
      state: "available",
      location: {
        role: "public-name",
        range: { start: { line: 0, character: 6 }, end: { line: 0, character: 17 } },
      },
    });
    expect(result.projects[1]).toMatchObject({
      status: "error",
      project: { projectKey: "second" },
      message: "second project failed",
    });
  });

  test("returns project candidates instead of selecting the first overlapping owner", async () => {
    const owners = [project("first", workspaceRoot), project("second", path.join(workspaceRoot, "nested"))];
    const templateResourceAvailability = vi.fn();
    const ctx = context({
      workspaceSummary: vi.fn(async () => answer({ appCandidates: owners })),
      projectsOwningDocument: vi.fn(async () => owners),
      templateResourceAvailability,
    });

    const result = await handleTemplateResourceAvailability(
      ctx as never,
      { uri: componentUri, position: { line: 0, character: 2 } },
      testRequestGuard,
    );

    expect(result.projectSelection).toMatchObject({
      status: "ambiguous",
      candidates: [{ projectKey: "first" }, { projectKey: "second" }],
    });
    expect(templateResourceAvailability).not.toHaveBeenCalled();
  });

  test("passes explicit project and template scope selection without unioning candidates", async () => {
    const owner = project("first", workspaceRoot);
    const row = resourceRow();
    const templateResourceAvailability = vi.fn(async () => answer({
      displayText: "my-app: 1 resource",
      projectKey: owner.projectKey,
      projectRoot: owner.rootDir,
      selectedTemplate: {
        templateIdentityKey: "template:my-app:v1",
        scopeIdentityKey: "scope:my-app:v1",
        definitionName: "my-app",
        compilationLane: "app-runtime",
        source: source("src/my-app.html", 0, 8),
      },
      candidates: [],
      rows: [{
        resource: row,
        state: "available",
        visibilityKind: "app-root",
        availabilitySource: source("src/main.ts", 0, 4),
      }],
      completeness: completeness(),
    }, "exact"));
    const ctx = context({
      workspaceSummary: vi.fn(async () => answer({ appCandidates: [owner] })),
      projectsOwningDocument: vi.fn(async () => [owner]),
      templateResourceAvailability,
    });

    const result = await handleTemplateResourceAvailability(
      ctx as never,
      {
        uri: componentUri,
        position: { line: 0, character: 2 },
        projectKey: owner.projectKey,
        templateResourceScopeIdentityKey: "scope:my-app:v1",
      },
      testRequestGuard,
    );

    expect(templateResourceAvailability).toHaveBeenCalledWith(
      owner.projectKey,
      expect.objectContaining({ uri: componentUri }),
      { line: 0, character: 2 },
      "scope:my-app:v1",
      testRequestGuard,
    );
    expect(result.projectSelection).toMatchObject({
      status: "exact",
      answer: { selection: "exact" },
      selectedTemplate: { scopeIdentityKey: "scope:my-app:v1" },
      resources: [{ resource: { identityKey: row.identityKey } }],
    });
  });
});

function context(semanticRuntime: Record<string, unknown>) {
  const documentUris = testWorkspaceDocumentUris(workspaceRoot);
  return {
    documentUris,
    lookupText: () => sourceText,
    ensureProgramDocument: (uri: string) => uri === componentUri
      ? TextDocument.create(uri, "html", 1, "<product-card></product-card>")
      : null,
    semanticRuntime: {
      preflight: vi.fn(async () => testAnalysisGeneration),
      ...semanticRuntime,
    },
  };
}

function project(projectKey: string, rootDir: string) {
  return {
    projectKey,
    rootDir,
    sourceFiles: 3,
    shapeKind: "aurelia-app",
    analysisKind: "full",
  };
}

function source(file: string, start = 6, end = 17) {
  return {
    kind: "source-span-address",
    label: `${file}@${start}..${end}`,
    path: file,
    start,
    end,
    role: "name",
  };
}

function resourceRow() {
  const publicName = source("src/product-card.ts");
  return {
    identityKey: "resource:product-card:v1",
    projectKey: "first",
    resourceKind: "custom-element",
    name: "product-card",
    registrationKey: "au:resource:custom-element:product-card",
    aliases: [],
    bindables: [],
    declarationModes: ["decorator"],
    metadataState: "full-definition",
    origin: {
      kind: "project",
      projectKey: "first",
      packageName: null,
      moduleKey: "src/product-card.ts",
      catalogGroup: null,
    },
    locality: {
      kind: "project",
      ownerIdentityKey: null,
      ownerName: null,
      ownerSource: null,
    },
    sources: {
      publicName,
      declaration: source("src/product-card.ts", 0, sourceText.length),
      implementation: publicName,
      navigation: publicName,
      navigationRole: "public-name",
      navigationUnavailableReason: null,
    },
  };
}

function inventoryValue(row: ReturnType<typeof resourceRow>) {
  return {
    displayText: "1 resource",
    projectKey: "first",
    projectRoot: workspaceRoot,
    rows: [row],
    completeness: completeness(),
  };
}

function completeness() {
  return {
    fullDefinitions: 1,
    headerOnly: 0,
    visibilityOnly: 0,
    localTemplates: 0,
    excludedCompilerSyntax: 0,
    unnamedDefinitions: 0,
    unresolvedModules: 0,
    openVisibility: 0,
  };
}

function answer<T>(value: T, selection = "not-applicable") {
  return {
    schemaVersion: "0.2",
    result: "answered",
    selection,
    coverage: "complete",
    summary: "complete",
    value,
    page: null,
  };
}
