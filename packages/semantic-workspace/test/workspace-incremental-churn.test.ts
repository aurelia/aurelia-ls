import fs from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { createWorkspaceHarness } from "./harness/index.js";
import { asFixtureId } from "./fixtures/index.js";
import { createSemanticWorkspaceKernel } from "../src/workspace.js";
import type { DocumentUri, ResourceGraph, ResourceScopeId, TemplateProgramCacheStats } from "@aurelia-ls/compiler";

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
    rootScope = harness.resolution.resourceGraph.root;
  });

  function createKernel(scopeId: ResourceScopeId | null): Kernel {
    // Keep a fixed resource scope so cache assertions are not affected by template scope switching.
    return createSemanticWorkspaceKernel({
      program: {
        vm: VM,
        isJs: false,
        semantics: harness.resolution.semantics,
        catalog: harness.resolution.catalog,
        syntax: harness.resolution.syntax,
        resourceGraph: harness.resolution.resourceGraph,
        moduleResolver: NOOP_MODULE_RESOLVER,
        ...(scopeId !== null ? { resourceScope: scopeId } : {}),
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
    const updated = kernel.reconfigure({
      program: {
        vm: VM,
        isJs: false,
        semantics: harness.resolution.semantics,
        catalog: harness.resolution.catalog,
        syntax: harness.resolution.syntax,
        resourceGraph: harness.resolution.resourceGraph,
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
        return text.replace("template,", "template,\\n  bindables: { level: {} },");
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
        return text.replace("@bindable value = \"\";", "@bindable value = \"\";\\n  @bindable tone = \"\";");
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
        return text.replace('valueConverter("titlecase")', 'valueConverter("titlecase-v2")');
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
});
