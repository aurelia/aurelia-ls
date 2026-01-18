import { beforeAll, describe, expect, it } from "vitest";
import { createWorkspaceHarness } from "./harness/index.js";
import { asFixtureId } from "./fixtures/index.js";
import { createSemanticWorkspaceKernel } from "../src/workspace.js";
import type { DocumentUri, ResourceGraph, ResourceScopeId } from "@aurelia-ls/compiler";

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

function mutateTemplate(text: string): string {
  const marker = "${message}";
  const index = text.indexOf(marker);
  if (index < 0) {
    throw new Error(`Marker not found: ${marker}`);
  }
  const insertAt = index + marker.length;
  return `${text.slice(0, insertAt)}!${text.slice(insertAt)}`;
}

function summarizeScopes(graph: ResourceGraph): { root: ResourceScopeId; scopes: string[] } {
  return {
    root: graph.root,
    scopes: Object.keys(graph.scopes).sort(),
  };
}

function pickAlternateScope(graph: ResourceGraph, current: ResourceScopeId | null): ResourceScopeId {
  const scopes = Object.keys(graph.scopes) as ResourceScopeId[];
  for (const scope of scopes) {
    if (scope !== current) return scope;
  }
  throw new Error("Expected at least two scopes in incremental-churn fixture.");
}

function getDocStats(kernel: Kernel, uri: DocumentUri) {
  const stats = kernel.getCacheStats(uri);
  const doc = stats.documents[0];
  if (!doc) {
    throw new Error(`Expected cache stats for ${String(uri)}`);
  }
  return doc;
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

    const nextScope = pickAlternateScope(harness.resolution.resourceGraph, rootScope);
    const configBefore = kernel.snapshot().meta.configHash;
    const updated = kernel.reconfigure({
      program: {
        vm: VM,
        isJs: false,
        semantics: harness.resolution.semantics,
        catalog: harness.resolution.catalog,
        syntax: harness.resolution.syntax,
        resourceGraph: harness.resolution.resourceGraph,
        resourceScope: nextScope,
      },
    });

    expect(updated).toBe(true);
    expect(kernel.snapshot().meta.configHash).not.toBe(configBefore);
    expect(betaAfterContent.compilation?.programCacheHit).toBe(true);

    kernel.getCompilation(betaUri);
    const betaAfterConfig = getDocStats(kernel, betaUri);
    expect(betaAfterConfig.compilation?.programCacheHit).toBe(false);
  });

  // Gap: no cross-file dependency tracking yet; these are placeholders for W6.
  describe("dependency invalidation (TODO)", () => {
    it.todo("invalidates template when custom element bindables change");
    it.todo("invalidates template when VM property types change");
    it.todo("invalidates template when imported converter definition changes");
  });
});
