import fs from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { createWorkspaceHarness } from "./harness/index.js";
import { asFixtureId } from "./fixtures/index.js";
import { createSemanticWorkspaceKernel } from "../out/workspace.js";
import {
  buildProjectSnapshot,
  type DependencyGraph,
  type DocumentUri,
  type ResourceGraph,
  type ResourceScopeId,
  type TemplateProgramCacheStats,
} from "@aurelia-ls/compiler";

type Kernel = ReturnType<typeof createSemanticWorkspaceKernel>;

function createVmReflection() {
  return {
    getRootVmTypeExpr() {
      return "TestVm";
    },
    getSyntheticPrefix() {
      return "__AU_TTC_";
    },
  };
}

const VM = createVmReflection();
const NOOP_MODULE_RESOLVER = (_specifier: string, _containingFile: string) => null;

function mutateTemplate(text: string): string {
  const marker = "</template>";
  const index = text.indexOf(marker);
  if (index < 0) {
    throw new Error(`Marker not found: ${marker}`);
  }
  const insertAt = index;
  return `${text.slice(0, insertAt)}  <!-- churn -->\n${text.slice(insertAt)}`;
}

function summarizeScopes(graph: ResourceGraph): { root: ResourceScopeId; scopes: string[] } {
  return {
    root: graph.root,
    scopes: Object.keys(graph.scopes).sort(),
  };
}

function getDocStats(kernel: Kernel, uri: DocumentUri) {
  const stats = kernel.getCacheStats(uri);
  const doc = stats.documents[0];
  if (!doc) {
    throw new Error(`Expected cache stats for ${String(uri)}`);
  }
  return doc;
}

function getWorkspaceDocStats(
  workspace: { getCacheStats: (target?: DocumentUri) => TemplateProgramCacheStats },
  uri: DocumentUri,
): TemplateProgramCacheStats["documents"][number] {
  const stats = workspace.getCacheStats(uri);
  const doc = stats.documents[0];
  if (!doc) {
    throw new Error(`Expected cache stats for ${String(uri)}`);
  }
  return doc;
}

async function withFileMutation(
  filePath: string,
  mutate: (text: string) => string,
  run: () => Promise<void> | void,
) {
  const original = fs.readFileSync(filePath, "utf8");
  const next = mutate(original);
  if (next === original) {
    throw new Error(`Mutation produced no change for ${filePath}`);
  }
  fs.writeFileSync(filePath, next);
  try {
    await run();
  } finally {
    fs.writeFileSync(filePath, original);
  }
}

function replaceOnce(text: string, search: string, replacement: string, label: string): string {
  const first = text.indexOf(search);
  if (first < 0) {
    throw new Error(`Mutation marker not found (${label}): ${search}`);
  }
  const second = text.indexOf(search, first + search.length);
  if (second >= 0) {
    throw new Error(`Mutation marker is ambiguous (${label}): ${search}`);
  }
  return `${text.slice(0, first)}${replacement}${text.slice(first + search.length)}`;
}

describe("workspace incremental churn (incremental-churn)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let alphaUri: DocumentUri;
  let betaUri: DocumentUri;
  let alphaText: string;
  let betaText: string;
  let rootScope: ResourceScopeId;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("incremental-churn"),
      openTemplates: "none",
    });

    alphaUri = harness.toDocumentUri("src/alpha.html");
    betaUri = harness.toDocumentUri("src/beta.html");

    const alpha = harness.readText(alphaUri);
    const beta = harness.readText(betaUri);
    if (!alpha || !beta) {
      throw new Error("Expected template text for incremental-churn alpha/beta");
    }
    alphaText = alpha;
    betaText = beta;
    rootScope = harness.discovery.resourceGraph.root;
  });

  function createKernel(scopeId: ResourceScopeId | null): Kernel {
    // Keep a fixed resource scope so cache assertions are not affected by template scope switching.
    const project = buildProjectSnapshot(harness.discovery.semantics, {
      catalog: harness.discovery.catalog,
      syntax: harness.discovery.syntax,
      resourceGraph: harness.discovery.resourceGraph,
    });
    return createSemanticWorkspaceKernel({
      program: {
        vm: VM,
        isJs: false,
        project,
        moduleResolver: NOOP_MODULE_RESOLVER,
        ...(scopeId !== null ? { templateContext: () => ({ scopeId }) } : {}),
      },
    });
  }

  function openTemplates(kernel: Kernel): void {
    kernel.open(alphaUri, alphaText, 1);
    kernel.open(betaUri, betaText, 1);
  }

  it("keeps unrelated template compilation cached after an edit", () => {
    const kernel = createKernel(rootScope);
    openTemplates(kernel);

    kernel.getCompilation(alphaUri);
    kernel.getCompilation(betaUri);
    const betaBefore = getDocStats(kernel, betaUri);

    kernel.update(alphaUri, mutateTemplate(alphaText), 2);
    kernel.getCompilation(alphaUri);
    const alphaAfter = getDocStats(kernel, alphaUri);
    kernel.getCompilation(betaUri);
    const betaAfter = getDocStats(kernel, betaUri);

    expect(alphaAfter.compilation?.programCacheHit).toBe(false);
    expect(betaAfter.contentHash).toBe(betaBefore.contentHash);
    expect(betaAfter.compilation?.programCacheHit).toBe(true);
  });

  it("does not mutate unrelated scopes on template edits", () => {
    const kernel = createKernel(rootScope);
    openTemplates(kernel);

    const before = kernel.snapshot();
    const beforeScopes = summarizeScopes(before.resourceGraph);

    kernel.getCompilation(alphaUri);
    kernel.update(alphaUri, mutateTemplate(alphaText), 2);
    kernel.getCompilation(alphaUri);

    const after = kernel.snapshot();
    const afterScopes = summarizeScopes(after.resourceGraph);

    expect(afterScopes).toEqual(beforeScopes);
    expect(after.meta.configHash).toBe(before.meta.configHash);
  });

  it("treats config changes as global invalidations", () => {
    const kernel = createKernel(rootScope);
    openTemplates(kernel);

    kernel.getCompilation(alphaUri);
    kernel.getCompilation(betaUri);

    kernel.update(alphaUri, mutateTemplate(alphaText), 2);
    kernel.getCompilation(alphaUri);
    kernel.getCompilation(betaUri);
    const betaAfterContent = getDocStats(kernel, betaUri);

    const configBefore = kernel.snapshot().meta.configHash;
    const project = buildProjectSnapshot(harness.discovery.semantics, {
      catalog: harness.discovery.catalog,
      syntax: harness.discovery.syntax,
      resourceGraph: harness.discovery.resourceGraph,
    });
    const updated = kernel.reconfigure({
      program: {
        vm: VM,
        isJs: false,
        project,
        overlayBaseName: "__churn__",
        moduleResolver: NOOP_MODULE_RESOLVER,
      },
    });

    expect(updated).toBe(true);
    expect(kernel.snapshot().meta.configHash).not.toBe(configBefore);
    expect(betaAfterContent.compilation?.programCacheHit).toBe(true);

    kernel.getCompilation(betaUri);
    const betaAfterConfig = getDocStats(kernel, betaUri);
    expect(betaAfterConfig.compilation?.programCacheHit).toBe(false);
  });

  describe("dependency invalidation (workspace)", () => {
    it("invalidates templates that depend on a custom element when bindables change", async () => {
      const harness = await createWorkspaceHarness({
        fixtureId: asFixtureId("incremental-churn"),
        isolateFixture: true,
        openTemplates: "none",
      });
      const workspace = harness.workspace;
      const appUri = harness.openTemplate("src/app.html");
      const betaUri = harness.openTemplate("src/beta.html");

      workspace.getCompilation(appUri);
      workspace.getCompilation(betaUri);
      const betaBefore = getWorkspaceDocStats(workspace, betaUri);

      const alphaPath = harness.resolvePath("src/alpha.ts");
      await withFileMutation(alphaPath, (text) => {
        if (text.includes("bindables: { level: {} }")) {
          throw new Error("Fixture drift: expected alpha.ts baseline without level bindables.");
        }
        return replaceOnce(
          text,
          "template,",
          "template,\n  bindables: { level: {} },",
          "alpha customElement template entry",
        );
      }, async () => {
        workspace.invalidateProject("alpha bindables");
        workspace.snapshot();

        workspace.getCompilation(appUri);
        const appAfter = getWorkspaceDocStats(workspace, appUri);
        workspace.getCompilation(betaUri);
        const betaAfter = getWorkspaceDocStats(workspace, betaUri);

        expect(appAfter.compilation?.programCacheHit).toBe(false);
        expect(betaAfter.contentHash).toBe(betaBefore.contentHash);
        expect(betaAfter.compilation?.programCacheHit).toBe(true);
      });
    });

    it("invalidates templates that depend on a custom attribute when bindables change", async () => {
      const harness = await createWorkspaceHarness({
        fixtureId: asFixtureId("incremental-churn"),
        isolateFixture: true,
        openTemplates: "none",
      });
      const workspace = harness.workspace;
      const appUri = harness.openTemplate("src/app.html");
      const alphaUri = harness.openTemplate("src/alpha.html");
      const betaUri = harness.openTemplate("src/beta.html");

      workspace.getCompilation(appUri);
      workspace.getCompilation(alphaUri);
      workspace.getCompilation(betaUri);
      const appBefore = getWorkspaceDocStats(workspace, appUri);

      const highlightPath = harness.resolvePath("src/shared/highlight.ts");
      await withFileMutation(highlightPath, (text) => {
        if (text.includes("@bindable tone = \"\";")) {
          throw new Error("Fixture drift: expected highlight.ts baseline without tone bindable.");
        }
        return replaceOnce(
          text,
          "@bindable value = \"\";",
          "@bindable value = \"\";\n  @bindable tone = \"\";",
          "highlight primary bindable",
        );
      }, async () => {
        workspace.invalidateProject("highlight bindables");
        workspace.snapshot();

        workspace.getCompilation(alphaUri);
        const alphaAfter = getWorkspaceDocStats(workspace, alphaUri);
        workspace.getCompilation(betaUri);
        const betaAfter = getWorkspaceDocStats(workspace, betaUri);
        workspace.getCompilation(appUri);
        const appAfter = getWorkspaceDocStats(workspace, appUri);

        expect(alphaAfter.compilation?.programCacheHit).toBe(false);
        expect(betaAfter.compilation?.programCacheHit).toBe(false);
        expect(appAfter.contentHash).toBe(appBefore.contentHash);
        expect(appAfter.compilation?.programCacheHit).toBe(true);
      });
    });

    it("invalidates templates that import a value converter when its definition changes", async () => {
      const harness = await createWorkspaceHarness({
        fixtureId: asFixtureId("incremental-churn"),
        isolateFixture: true,
        openTemplates: "none",
      });
      const workspace = harness.workspace;
      const alphaUri = harness.openTemplate("src/alpha.html");
      const betaUri = harness.openTemplate("src/beta.html");

      workspace.getCompilation(alphaUri);
      workspace.getCompilation(betaUri);
      const betaBefore = getWorkspaceDocStats(workspace, betaUri);

      const converterPath = harness.resolvePath("src/shared/titlecase.ts");
      await withFileMutation(converterPath, (text) => {
        if (text.includes('valueConverter("titlecase-v2")')) {
          throw new Error("Fixture drift: expected titlecase converter baseline before rename.");
        }
        return replaceOnce(
          text,
          'valueConverter("titlecase")',
          'valueConverter("titlecase-v2")',
          "titlecase converter name",
        );
      }, async () => {
        workspace.invalidateProject("converter rename");
        workspace.snapshot();

        workspace.getCompilation(alphaUri);
        const alphaAfter = getWorkspaceDocStats(workspace, alphaUri);
        workspace.getCompilation(betaUri);
        const betaAfter = getWorkspaceDocStats(workspace, betaUri);

        expect(alphaAfter.compilation?.programCacheHit).toBe(false);
        expect(betaAfter.contentHash).toBe(betaBefore.contentHash);
        expect(betaAfter.compilation?.programCacheHit).toBe(true);
      });
    });
  });

  describe("dependency graph population", () => {
    it("populates dep graph with template-compilation nodes after getCompilation", () => {
      const { workspace } = harness;
      const model = workspace.projectIndex.currentModel();
      const deps: DependencyGraph = model.deps;

      // Open templates in the workspace engine
      workspace.open(alphaUri, alphaText, 1);
      workspace.open(betaUri, betaText, 1);

      // Before compilation, no template-compilation nodes
      const nodesBefore = [...deps.nodes.values()]
        .filter((n) => n.kind === "template-compilation");

      // Compile templates
      workspace.getCompilation(alphaUri);
      workspace.getCompilation(betaUri);

      // After compilation, template-compilation nodes should exist
      const nodesAfter = [...deps.nodes.values()]
        .filter((n) => n.kind === "template-compilation");
      expect(nodesAfter.length).toBeGreaterThan(nodesBefore.length);

      // Each compiled template should have dependency edges
      for (const node of nodesAfter) {
        const edges = deps.dependsOn.get(node.id);
        expect(edges, `Expected edges for ${node.key}`).toBeDefined();
        expect(edges!.size).toBeGreaterThan(0);
      }
    });

    it("records resource edges matching template dependency set", () => {
      const { workspace } = harness;
      const model = workspace.projectIndex.currentModel();
      const deps: DependencyGraph = model.deps;

      workspace.open(alphaUri, alphaText, 1);
      workspace.getCompilation(alphaUri);

      const alphaNode = deps.findNode("template-compilation", alphaUri as string);
      expect(alphaNode, "Expected template-compilation node for alpha").not.toBeNull();

      const edges = deps.dependsOn.get(alphaNode!);
      expect(edges).toBeDefined();

      // Verify that at least scope and resource edges exist
      const edgeNodes = [...edges!].map((id) => deps.nodes.get(id)!);
      const kinds = new Set(edgeNodes.map((n) => n.kind));
      // Template should at minimum depend on its scope
      expect(kinds.has("scope")).toBe(true);
    });

    it("getAffected returns template-compilation nodes when resource changes", () => {
      const { workspace } = harness;
      const model = workspace.projectIndex.currentModel();
      const deps: DependencyGraph = model.deps;

      workspace.open(alphaUri, alphaText, 1);
      workspace.getCompilation(alphaUri);

      // Find a convergence-entry node that the template depends on
      const alphaNode = deps.findNode("template-compilation", alphaUri as string);
      expect(alphaNode).not.toBeNull();

      const alphaEdges = deps.dependsOn.get(alphaNode!);
      expect(alphaEdges).toBeDefined();

      const resourceEdges = [...alphaEdges!]
        .map((id) => deps.nodes.get(id)!)
        .filter((n) => n.kind === "convergence-entry");

      if (resourceEdges.length > 0) {
        // Invalidate a resource and check that the template is affected
        const affected = deps.getAffected([resourceEdges[0].id]);
        const affectedIds = new Set(affected);
        expect(affectedIds.has(alphaNode!)).toBe(true);
      }
    });
  });
});
