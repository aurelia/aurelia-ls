import { describe, expect, test, vi } from "vitest";
import { createHash } from "node:crypto";
import type { AnalysisLimitationItem } from "@aurelia-ls/language-server/protocol";
import {
  EXTENSION_HOST_OBSERVATION_EVENT,
  type ExtensionHostObservation,
} from "../../../out/extension-host-observation.js";
import { ResourceExplorerProvider } from "../../../out/features/views/resource-explorer.js";
import { AureliaCommand } from "../../../out/product-contract.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createVscodeApi } from "../../helpers/vscode-stub.js";

const dynamicRegistrationSpreadRuleId: `${AnalysisLimitationItem["ruleId"]}` =
  "aurelia.analysis.dynamic-registration-spread";
const openCoverage: `${AnalysisLimitationItem["currentCoverage"]}` = "open";

interface Node {
  readonly id: string;
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly description?: string;
  readonly tooltip?: string;
  readonly contextValue?: string;
  readonly children?: readonly Node[];
}

interface IconPresentation {
  readonly id: string;
  readonly color?: { readonly id: string };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => { resolve = accept; });
  return { promise, resolve };
}

const completeAnswer = {
  schemaVersion: "0.2",
  result: "answered",
  selection: "not-applicable",
  coverage: "complete",
  summary: "complete",
  page: null,
};

function workspace(key = "file:///repo", name = key.split("/").at(-1) ?? "repo") {
  return { key, name, uri: key };
}

function project(projectKey = "app", rootUri = `file:///repo/${projectKey}`) {
  return {
    projectKey,
    rootUri,
    sourceFiles: 5,
    shapeKind: "aurelia-app",
    analysisKind: "full",
  };
}

function available(uri: string, label = "src/product-card.ts@6..18", role = "public-name") {
  return {
    state: "available",
    location: {
      uri,
      range: { start: { line: 0, character: 6 }, end: { line: 0, character: 18 } },
      role,
      label,
    },
  };
}

function absent() {
  return { state: "absent" } as const;
}

function resource(input: {
  identityKey: string;
  name: string;
  kind?: string;
  uri?: string | null;
  origin?: string;
  packageName?: string | null;
  catalogOwnerKind?: "core-framework" | "official-plugin" | null;
  locality?: "project" | "local-template";
  localityOwnerName?: string | null;
  aliases?: string[];
  bindables?: Array<{
    name: string;
    attribute?: string;
    valueType?: string | null;
    mode?: string;
    primary?: boolean;
  }>;
  metadataState?: "full-definition" | "header-only" | "visibility-only";
  implementationLine?: number;
}) {
  const navigation = input.uri == null
    ? { state: "unavailable" as const, reason: "external-catalog" as const }
    : available(input.uri);
  return {
    identityKey: input.identityKey,
    projectKey: "app",
    kind: input.kind ?? "custom-element",
    name: input.name,
    registrationKey: `au:resource:${input.kind ?? "custom-element"}:${input.name}`,
    aliases: (input.aliases ?? []).map((name) => ({
      identityKey: `${input.identityKey}:alias:${name}`,
      registrationKey: null,
      name,
      source: input.uri == null ? absent() : available(input.uri, `alias ${name}`, "alias"),
      navigation: input.uri == null ? navigation : available(input.uri, `alias ${name}`, "alias"),
    })),
    bindables: (input.bindables ?? []).map((bindable) => ({
      identityKey: `${input.identityKey}:bindable:${bindable.name}`,
      name: bindable.name,
      attribute: bindable.attribute ?? bindable.name,
      mode: bindable.mode ?? "default",
      nullable: null,
      valueType: bindable.valueType ?? null,
      primary: bindable.primary ?? false,
      sources: {
        name: input.uri == null ? absent() : available(input.uri, `bindable ${bindable.name}`, "bindable-name"),
        attribute: absent(),
        property: absent(),
        declaration: absent(),
      },
      navigation: input.uri == null
        ? { state: "unavailable" as const, reason: "no-authored-source" as const }
        : available(input.uri, `bindable ${bindable.name}`, "bindable-name"),
    })),
    declarationModes: ["decorator"],
    metadataState: input.metadataState ?? "full-definition",
    origin: {
      kind: input.origin ?? "project",
      projectKey: input.origin === "project" || input.origin == null ? "app" : null,
      packageName: input.packageName ?? null,
      moduleKey: input.uri == null ? null : "src/product-card.ts",
      catalogGroup: input.origin === "framework" ? "default-resources" : null,
      catalogOwnerKind: Object.hasOwn(input, "catalogOwnerKind")
        ? input.catalogOwnerKind ?? null
        : input.origin === "framework"
          ? "core-framework"
          : null,
    },
    locality: {
      kind: input.locality ?? "project",
      ownerIdentityKey: input.locality === "local-template" ? "resource:local-owner" : null,
      ownerName: input.locality === "local-template" ? input.localityOwnerName ?? "local-owner" : null,
      ownerSource: absent(),
    },
    sources: {
      publicName: input.uri == null ? absent() : available(input.uri),
      declaration: input.uri == null ? absent() : available(input.uri, "declaration", "declaration"),
      implementation: input.uri == null
        ? absent()
        : input.implementationLine == null
          ? available(input.uri, "implementation", "implementation")
          : {
              state: "available" as const,
              location: {
                ...available(input.uri, "implementation", "implementation").location,
                range: {
                  start: { line: input.implementationLine, character: 0 },
                  end: { line: input.implementationLine, character: 12 },
                },
              },
            },
    },
    navigation,
  };
}

function readyProject(
  resources: readonly ReturnType<typeof resource>[],
  projectKey = "app",
  coverage = "complete",
  answerResult: "answered" | "failed" | "invalid" | "unsupported" = "answered",
  rootUri?: string,
) {
  return {
    status: "ready",
    project: project(projectKey, rootUri),
    answer: { ...completeAnswer, result: answerResult, coverage, summary: "INTERNAL answer summary" },
    typeSurfacesIncluded: true,
    resources,
    completeness: {
      fullDefinitions: resources.length,
      headerOnly: 0,
      visibilityOnly: 0,
      localTemplates: 0,
      excludedCompilerSyntax: 0,
      unnamedDefinitions: 0,
      unresolvedModules: 0,
      openVisibility: coverage === "complete" ? 0 : 1,
    },
  };
}

function response(projects: readonly unknown[], owner = workspace(), fingerprint = "semantic-runtime:test") {
  return { workspaces: [{ ...owner, status: "ready", response: { fingerprint, projects } }] };
}

function combinedResponse(...responses: readonly ReturnType<typeof response>[]) {
  return { workspaces: responses.flatMap((entry) => entry.workspaces) };
}

function limitationRow(input: {
  readonly findingKey?: string;
  readonly sourceUri?: string;
  readonly configurationSource?: boolean;
} = {}): AnalysisLimitationItem {
  const source = {
    state: "available" as const,
    location: {
      uri: input.sourceUri ?? "file:///repo/src/main.ts",
      range: { start: { line: 3, character: 8 }, end: { line: 3, character: 17 } },
    },
  };
  return {
    findingKey: input.findingKey ?? "finding:dynamic-registration",
    ruleId: dynamicRegistrationSpreadRuleId as AnalysisLimitationItem["ruleId"],
    authority: "semantic-runtime-rule",
    title: "Dynamic registration spread limits resource analysis",
    explanation: "A runtime-dependent spread prevents Aurelia tooling from proving every registration.",
    action: "Register static entries, or configure this rule when the dynamic spread is intentional.",
    reason: {
      summary: "The registration spread remains dynamic.",
      seamKindKeys: [],
      boundaryKinds: [],
      reasonKinds: [],
    },
    source,
    currentCoverage: openCoverage as AnalysisLimitationItem["currentCoverage"],
    evidence: { openSeamSiteKey: "site:one", seamKeys: ["seam:one"], materializations: [], products: [] },
    effectivePolicy: {
      ruleId: dynamicRegistrationSpreadRuleId as AnalysisLimitationItem["ruleId"],
      disposition: "information",
      authority: input.configurationSource ? "project-configuration" : "default",
      source: input.configurationSource
        ? {
            state: "available" as const,
            location: {
              uri: "file:///repo/aurelia.project.json",
              range: { start: { line: 6, character: 4 }, end: { line: 6, character: 58 } },
            },
          }
        : absent(),
    },
  };
}

function limitationsResponse(
  projects: readonly {
    readonly projectKey: string;
    readonly rows: readonly AnalysisLimitationItem[];
    readonly candidateCount?: number;
    readonly suppressedCandidateCount?: number;
    readonly coverage?: "complete" | "open";
    readonly page?: unknown;
  }[],
  owner = workspace(),
  fingerprint = "semantic-runtime:test",
) {
  return {
    workspaces: [{
      ...owner,
      status: "ready" as const,
      response: {
        fingerprint,
        projects: projects.map(({
          candidateCount,
          coverage,
          page,
          projectKey,
          rows,
          suppressedCandidateCount,
        }) => ({
          status: "ready" as const,
          projectKey,
          answer: {
            ...completeAnswer,
            coverage: coverage ?? "complete",
            page: page ?? null,
          },
          policyFile: { uri: `${owner.uri}/aurelia.project.json`, exists: false },
          effectivePolicies: [],
          candidateCount: candidateCount ?? rows.length,
          suppressedCandidateCount: suppressedCandidateCount ?? 0,
          rows,
        })),
      },
    }],
  };
}

function createHarness(
  getResourceInventory: (_options?: unknown) => Promise<unknown>,
  getAnalysisLimitations: (_options?: unknown) => Promise<unknown> = async () => null,
) {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const logger = { debug: vi.fn(), warn: vi.fn() };
  const inventory = vi.fn(getResourceInventory);
  const limitations = vi.fn(getAnalysisLimitations);
  const runWithProgress = vi.fn(async (task: () => Promise<unknown>) => await task());
  const provider = new ResourceExplorerProvider(
    vscode,
    {
      getResourceInventory: inventory,
      getAnalysisLimitations: limitations,
    } as never,
    logger as never,
    runWithProgress as never,
  );
  const view: { message?: string; description?: string } = {};
  provider.attachView(view as never);
  return {
    getAnalysisLimitations: limitations,
    getResourceInventory: inventory,
    logger,
    provider,
    recorded,
    runWithProgress,
    view,
    vscode,
  };
}

async function roots(provider: ResourceExplorerProvider): Promise<Node[]> {
  return await Promise.resolve(provider.getChildren()) as Node[];
}

function findNode(nodes: readonly Node[], label: string): Node | undefined {
  for (const node of nodes) {
    if (node.label === label) return node;
    const nested = findNode(node.children ?? [], label);
    if (nested != null) return nested;
  }
  return undefined;
}

describe("ResourceExplorerProvider", () => {
  test("projects bounded provider-owned support state without tree labels or identities", async () => {
    const privateUri = "file:///private/game/src/secret-card.ts";
    const harness = createHarness(async () => response([
      readyProject([resource({
        identityKey: "private-resource-identity",
        name: "secret-card",
        uri: privateUri,
      })]),
    ], workspace("file:///private/game", "private-game")));

    expect(harness.provider.supportState()).toMatchObject({
      phase: "empty",
      refreshGeneration: 0,
      treeRootCount: 0,
      hasInventory: false,
      counts: { boundaries: 0, projects: 0, resources: 0 },
    });

    await harness.provider.refresh();

    const state = harness.provider.supportState();
    expect(state).toEqual({
      phase: "current",
      refreshGeneration: 1,
      treeRootCount: 1,
      hasInventory: true,
      updatingAll: false,
      updatingWorkspaceCount: 0,
      staleWorkspaceCount: 0,
      hasIssues: false,
      hasAnalysisReview: false,
      counts: { boundaries: 1, projects: 1, resources: 1, failures: 0, incomplete: 0 },
    });
    expect(JSON.stringify(state)).not.toContain("private");
    expect(JSON.stringify(state)).not.toContain("secret-card");
    expect(JSON.stringify(state)).not.toContain(privateUri);
  });

  test("publishes an exact explanation subject only for a live top-level resource object", async () => {
    const row = resource({
      identityKey: "resource:product-card",
      name: "product-card",
      uri: null,
      origin: "framework",
      packageName: "@aurelia/runtime-html",
      aliases: ["shop-card"],
    });
    const harness = createHarness(async () => response([readyProject([row])]));
    await harness.provider.refresh();
    const current = findNode(await roots(harness.provider), "product-card")!;
    const alias = findNode(await roots(harness.provider), "shop-card")!;

    expect(current.contextValue).toBe("resourceUnavailable");
    expect(harness.provider.availabilityExplanationFor(current)).toEqual({
      workspaceKey: "file:///repo",
      projectKey: "app",
      resourceIdentityKey: "resource:product-card",
    });
    expect(harness.provider.availabilityExplanationFor(alias)).toBeNull();
    expect(harness.provider.availabilityExplanationFor({ ...current })).toBeNull();

    await harness.provider.refresh();
    const replacement = findNode(await roots(harness.provider), "product-card")!;
    expect(harness.provider.availabilityExplanationFor(current)).toBeNull();
    expect(harness.provider.availabilityExplanationFor(replacement)).toEqual({
      workspaceKey: "file:///repo",
      projectKey: "app",
      resourceIdentityKey: "resource:product-card",
    });
  });

  test("joins exact workspace, generation, and project identities before signaling a limitation", async () => {
    const inventory = response([readyProject([])], workspace(), "semantic-runtime:one");
    const limitations = limitationsResponse([
      { projectKey: "app", rows: [limitationRow()] },
    ], workspace(), "semantic-runtime:one");
    const harness = createHarness(async () => inventory, async () => limitations);

    await harness.provider.refresh();

    expect(harness.view.message).toContain("Analysis is limited");
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasAnalysisReview")).toBe(true);
    expect(harness.provider.analysisLimitationsForReview()).toEqual([
      expect.objectContaining({
        workspaceKey: "file:///repo",
        projectKey: "app",
        fingerprint: "semantic-runtime:one",
        row: expect.objectContaining({ findingKey: "finding:dynamic-registration" }),
      }),
    ]);
  });

  test("retains a coherent review without republishing until its successor settles", async () => {
    const nextInventory = deferred<unknown>();
    const nextLimitations = deferred<unknown>();
    const inventory = vi.fn()
      .mockResolvedValueOnce(response([readyProject([])], workspace(), "semantic-runtime:one"))
      .mockImplementationOnce(() => nextInventory.promise);
    const limitations = vi.fn()
      .mockResolvedValueOnce(limitationsResponse([
        { projectKey: "app", rows: [limitationRow()] },
      ], workspace(), "semantic-runtime:one"))
      .mockImplementationOnce(() => nextLimitations.promise);
    const observation = captureResourceDiscoveryObservations("resource-explorer");
    const harness = createHarness(inventory, limitations);
    await harness.provider.refresh();
    observation.events.length = 0;

    const retainedRows = harness.provider.analysisLimitationsForReview();
    const retainedMessage = harness.view.message;
    const retainedTree = await roots(harness.provider);
    const changed = vi.fn();
    const subscription = harness.provider.onDidChangeTreeData(changed);
    const pending = harness.provider.refresh();
    await Promise.resolve();

    expect(harness.provider.analysisLimitationsForReview()).toEqual(retainedRows);
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasAnalysisReview")).toBe(true);
    expect(harness.view.message).toBe(retainedMessage);
    expect(await roots(harness.provider)).toEqual(retainedTree);
    expect(changed).not.toHaveBeenCalled();
    expect(observation.events).toEqual([]);

    nextInventory.resolve(response([readyProject([])], workspace(), "semantic-runtime:two"));
    nextLimitations.resolve(limitationsResponse([
      { projectKey: "app", rows: [] },
    ], workspace(), "semantic-runtime:two"));
    await pending;

    expect(changed).toHaveBeenCalledOnce();
    expect(observation.events.filter((event) => event.phase === "publish-complete")).toHaveLength(1);
    expect(harness.provider.analysisLimitationsForReview()).toEqual([]);
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasAnalysisReview")).toBe(false);
    expect(harness.view.message).toBeUndefined();
    subscription.dispose();
    observation.dispose();
  });

  test("keeps an all-suppressed candidate visible as a limitation without advertising Review", async () => {
    const harness = createHarness(
      async () => response([readyProject([])], workspace(), "semantic-runtime:one"),
      async () => limitationsResponse([{
        projectKey: "app",
        rows: [],
        candidateCount: 1,
        suppressedCandidateCount: 1,
      }], workspace(), "semantic-runtime:one"),
    );

    await harness.provider.refresh();

    expect(harness.view.message).toBe(
      "Analysis is limited. Finding policy hides the current details.",
    );
    expect(harness.view.message).not.toContain("Review Analysis Limitations");
    expect(harness.provider.analysisLimitationsForReview()).toEqual([]);
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasAnalysisReview")).toBe(false);
  });

  test("retains an all-suppressed limitation as stale when its next answer is unavailable", async () => {
    const inventory = vi.fn()
      .mockResolvedValueOnce(response([readyProject([])], workspace(), "semantic-runtime:one"))
      .mockResolvedValueOnce(response([readyProject([])], workspace(), "semantic-runtime:two"));
    const limitations = vi.fn()
      .mockResolvedValueOnce(limitationsResponse([{
        projectKey: "app",
        rows: [],
        candidateCount: 1,
        suppressedCandidateCount: 1,
      }], workspace(), "semantic-runtime:one"))
      .mockResolvedValueOnce({
        workspaces: [{ ...workspace(), status: "error", error: "transport unavailable" }],
      });
    const harness = createHarness(inventory, limitations);
    await harness.provider.refresh();

    await harness.provider.refresh();

    expect(harness.view.message).toContain("Analysis may be limited");
    expect(harness.view.message).toContain("previous review");
    expect(harness.provider.analysisLimitationsForReview()).toEqual([]);
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasAnalysisReview")).toBe(false);
  });

  test("retains a previously coherent limitation as stale and bounds a mismatched join retry", async () => {
    const inventory = vi.fn()
      .mockResolvedValueOnce(response([readyProject([])], workspace(), "semantic-runtime:one"))
      .mockResolvedValue(response([readyProject([])], workspace(), "semantic-runtime:two"));
    const limitations = vi.fn().mockResolvedValue(limitationsResponse([
      { projectKey: "app", rows: [limitationRow()] },
    ], workspace(), "semantic-runtime:one"));
    const harness = createHarness(inventory, limitations);
    await harness.provider.refresh();

    await harness.provider.refresh();

    expect(inventory).toHaveBeenCalledTimes(3);
    expect(limitations).toHaveBeenCalledTimes(3);
    expect(harness.view.message).toContain("showing the previous review");
    expect(harness.provider.analysisLimitationsForReview()).toEqual([]);
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasAnalysisReview")).toBe(false);
  });

  test("preserves returned limitations through transport errors without claiming an unavailable query found none", async () => {
    const inventory = vi.fn()
      .mockResolvedValueOnce(response([readyProject([])], workspace(), "semantic-runtime:one"))
      .mockResolvedValue(response([readyProject([])], workspace(), "semantic-runtime:two"));
    const limitations = vi.fn()
      .mockResolvedValueOnce(limitationsResponse([
        { projectKey: "app", rows: [limitationRow()] },
      ], workspace(), "semantic-runtime:one"))
      .mockResolvedValue({
        workspaces: [{ ...workspace(), status: "error", error: "transport unavailable" }],
      });
    const harness = createHarness(inventory, limitations);
    await harness.provider.refresh();

    await harness.provider.refresh();

    expect(harness.view.message).toContain("showing the previous review");
    expect(harness.provider.analysisLimitationsForReview()).toEqual([]);
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasAnalysisReview")).toBe(false);

    const unavailable = createHarness(
      async () => response([readyProject([])], workspace(), "semantic-runtime:one"),
      async () => ({
        workspaces: [{ ...workspace(), status: "error", error: "transport unavailable" }],
      }),
    );
    await unavailable.provider.refresh();
    expect(unavailable.view.message).toBeUndefined();
    expect(unavailable.recorded.contextValues.get("aurelia.resourceExplorerHasAnalysisReview")).toBe(false);
  });

  test("does not publish rows or a negative claim from an open-coverage limitation answer", async () => {
    const harness = createHarness(
      async () => response([readyProject([])], workspace(), "semantic-runtime:one"),
      async () => limitationsResponse([{
        projectKey: "app",
        rows: [limitationRow()],
        coverage: "open",
      }], workspace(), "semantic-runtime:one"),
    );

    await harness.provider.refresh();

    expect(harness.view.message).toBeUndefined();
    expect(harness.provider.analysisLimitationsForReview()).toEqual([]);
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasAnalysisReview")).toBe(false);
  });

  test("retains a prior limitation as stale when drained row accounting disagrees with candidate counts", async () => {
    const inventory = vi.fn()
      .mockResolvedValueOnce(response([readyProject([])], workspace(), "semantic-runtime:one"))
      .mockResolvedValueOnce(response([readyProject([])], workspace(), "semantic-runtime:two"));
    const limitations = vi.fn()
      .mockResolvedValueOnce(limitationsResponse([{
        projectKey: "app",
        rows: [limitationRow()],
      }], workspace(), "semantic-runtime:one"))
      .mockResolvedValueOnce(limitationsResponse([{
        projectKey: "app",
        rows: [],
        candidateCount: 1,
        suppressedCandidateCount: 0,
      }], workspace(), "semantic-runtime:two"));
    const harness = createHarness(inventory, limitations);
    await harness.provider.refresh();

    await harness.provider.refresh();

    expect(inventory).toHaveBeenCalledTimes(2);
    expect(limitations).toHaveBeenCalledTimes(2);
    expect(harness.view.message).toContain("showing the previous review");
    expect(harness.provider.analysisLimitationsForReview()).toEqual([]);
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasAnalysisReview")).toBe(false);
  });

  test("rejects a nonterminal page envelope even when its visible row count matches", async () => {
    const harness = createHarness(
      async () => response([readyProject([])], workspace(), "semantic-runtime:one"),
      async () => limitationsResponse([{
        projectKey: "app",
        rows: [limitationRow()],
        page: {
          size: 1,
          cursor: null,
          nextCursor: "page:two",
          returnedRows: 1,
          totalRows: 2,
          exhausted: false,
        },
      }], workspace(), "semantic-runtime:one"),
    );

    await harness.provider.refresh();

    expect(harness.view.message).toBeUndefined();
    expect(harness.provider.analysisLimitationsForReview()).toEqual([]);
  });

  test("adds a neutral limitation scent to multi-project roots without adding a tree branch", async () => {
    const harness = createHarness(
      async () => response([
        readyProject([], "shop"),
        readyProject([], "admin"),
      ], workspace(), "semantic-runtime:one"),
      async () => limitationsResponse([
        { projectKey: "shop", rows: [limitationRow()] },
        { projectKey: "admin", rows: [] },
      ], workspace(), "semantic-runtime:one"),
    );

    await harness.provider.refresh();
    const projectRoots = await roots(harness.provider);

    expect(projectRoots).toHaveLength(2);
    expect(projectRoots.find((node) => node.label.includes("shop"))?.description).toContain("analysis limited");
    expect(projectRoots.find((node) => node.label.includes("admin"))?.description).not.toContain("analysis limited");
  });

  test("marks retained multi-project limitations as a previous uncertain review", async () => {
    const inventory = vi.fn()
      .mockResolvedValueOnce(response([
        readyProject([], "shop"),
        readyProject([], "admin"),
      ], workspace(), "semantic-runtime:one"))
      .mockResolvedValueOnce(response([
        readyProject([], "shop"),
        readyProject([], "admin"),
      ], workspace(), "semantic-runtime:two"));
    const limitations = vi.fn()
      .mockResolvedValueOnce(limitationsResponse([
        { projectKey: "shop", rows: [limitationRow()] },
        { projectKey: "admin", rows: [] },
      ], workspace(), "semantic-runtime:one"))
      .mockResolvedValueOnce({
        workspaces: [{ ...workspace(), status: "error", error: "transport unavailable" }],
      });
    const harness = createHarness(inventory, limitations);
    await harness.provider.refresh();

    await harness.provider.refresh();
    const projectRoots = await roots(harness.provider);
    const shop = projectRoots.find((node) => node.label.includes("shop"));

    expect(shop?.description).toContain("analysis may be limited · previous review");
    expect(shop?.description).not.toContain("· analysis limited");
    expect(harness.provider.analysisLimitationsForReview()).toEqual([]);
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasAnalysisReview")).toBe(false);
  });

  test("publishes an honest loading view state before the first inventory settles", async () => {
    const observation = captureResourceDiscoveryObservations("resource-explorer");
    const initial = resource({
      identityKey: "resource:initial:loading",
      name: "initial-card",
      uri: "file:///repo/initial.ts",
    });
    const current = response([readyProject([initial])], workspace(), "initial:current");
    let settle!: (value: unknown) => void;
    const inventory = new Promise<unknown>((resolve) => { settle = resolve; });
    const harness = createHarness(async () => await inventory);
    const pending = harness.provider.refresh();

    try {
      expect(harness.view.message).toBe("Discovering Aurelia resources...");
      expect(observation.events.find((event) =>
        event.phase === "view-state" && event.state === "loading"
      )).toEqual(expect.objectContaining({
        state: "loading",
        message: "Discovering Aurelia resources...",
        description: null,
        updatingAll: false,
        updatingWorkspaceCount: 0,
        staleWorkspaceCount: 0,
      }));
    } finally {
      settle(current);
      await pending;
      observation.dispose();
    }

    expect(harness.view.message).toBeUndefined();
    expect(findNode(await roots(harness.provider), "initial-card")).toBeDefined();
  });

  test("observes coherent publications with exact row state and navigation facts", async () => {
    const observation = captureResourceDiscoveryObservations("resource-explorer");
    try {
      const card = resource({
        identityKey: "resource:observed-card:v1",
        name: "observed-card",
        uri: "file:///repo/src/observed-card.ts",
        aliases: ["observed-alias"],
        bindables: [{ name: "label", valueType: "string" }],
        metadataState: "header-only",
        implementationLine: 12,
      });
      const harness = createHarness(async () => response(
        [readyProject([card])],
        workspace(),
        "semantic-runtime:observed",
      ));

      await harness.provider.refresh();
      const publication = observation.events.filter((event) =>
        event.phase === "publish-start"
        || event.phase === "publish-node"
        || event.phase === "publish-complete"
      );
      expect(publication[0]).toEqual(expect.objectContaining({
        phase: "publish-start",
        publicationKind: "current",
        fingerprint: "semantic-runtime:observed",
        workspaceIdentity: null,
      }));
      const resourceRow = publication.find((event) =>
        event.phase === "publish-node" && event.label === "observed-card"
      );
      expect(resourceRow).toEqual(expect.objectContaining({
        answerResult: "answered",
        answerCoverage: "complete",
        answerRowCount: 1,
        nodeId: expect.stringMatching(/^tree-node:[0-9a-f]{64}$/u),
        parentId: expect.stringMatching(/^tree-node:[0-9a-f]{64}$/u),
        navigationWorkspaceIdentity: expect.stringMatching(/^workspace:[0-9a-f]{64}$/u),
        navigationProjectKey: "app",
        navigationFingerprint: "semantic-runtime:observed",
        navigationResourceIdentity: "resource:observed-card:v1",
        navigationChildIdentity: null,
        navigationRole: "resource",
        navigationPlacement: "preview",
        implementationAvailable: true,
        implementationResourceIdentity: "resource:observed-card:v1",
        implementationRole: "implementation",
        implementationPlacement: "preview",
        rowStates: "metadata-incomplete",
      }));
      const aliasRow = publication.find((event) =>
        event.phase === "publish-node" && event.label === "observed-alias"
      );
      expect(aliasRow).toEqual(expect.objectContaining({
        answerResult: "answered",
        answerCoverage: "complete",
        answerRowCount: 1,
        navigationResourceIdentity: "resource:observed-card:v1",
        navigationChildIdentity: "resource:observed-card:v1:alias:observed-alias",
        navigationRole: "alias",
        implementationAvailable: false,
        rowStates: "metadata-incomplete",
      }));
      const observedNodeToken = String(resourceRow!.nodeId);
      expect(harness.provider.navigationFor({ id: observedNodeToken }, "declaration")).toMatchObject({
        fingerprint: "semantic-runtime:observed",
        projectKey: "app",
        resourceIdentityKey: "resource:observed-card:v1",
        role: "resource",
      });
      expect(observedNodeToken).not.toMatch(/file:\/\/\/|observed-card:v1/iu);
      expect(publication.at(-1)).toEqual(expect.objectContaining({
        phase: "publish-complete",
        fingerprint: "semantic-runtime:observed",
        workspaceIdentity: null,
      }));
      const publicationCount = observation.events.filter((event) =>
        event.phase === "publish-complete"
      ).length;
      harness.provider.markUpdating("file:///repo");
      expect(observation.events.filter((event) => event.phase === "publish-complete"))
        .toHaveLength(publicationCount);
      const replacement = resource({
        identityKey: "resource:replacement:v1",
        name: "replacement-card",
        uri: "file:///repo/src/replacement-card.ts",
      });
      harness.getResourceInventory.mockResolvedValueOnce(response(
        [readyProject([replacement])],
        workspace(),
        "semantic-runtime:replacement",
      ));
      await harness.provider.refresh();
      expect(harness.provider.navigationFor({ id: observedNodeToken }, "declaration")).toBeNull();
      expect(JSON.stringify(observation.events)).not.toMatch(/file:\/\/\/repo/iu);
      expect(publication.every((event) => Object.isFrozen(event))).toBe(true);
      expect(publication.every((event) => Object.values(event).every(isObservationPrimitive))).toBe(true);
    } finally {
      observation.dispose();
    }
  });

  test("observes exact answer coverage and null/non-answered project boundaries", async () => {
    const observation = captureResourceDiscoveryObservations("resource-explorer");
    try {
      const card = resource({
        identityKey: "resource:coverage-card:v1",
        name: "coverage-card",
        uri: "file:///repo/src/coverage-card.ts",
      });
      const projectError = response([{
        status: "error",
        project: project("app"),
        message: "private project detail",
      }]);
      const getResourceInventory = vi.fn()
        .mockResolvedValueOnce(response([readyProject([card], "app", "open")]))
        .mockResolvedValueOnce(response([readyProject([card], "app", "truncated")]))
        .mockResolvedValueOnce(response([readyProject([card], "app", "complete", "failed")]))
        .mockResolvedValueOnce(projectError);
      const harness = createHarness(getResourceInventory);
      const lastPublished = () => [...observation.events].reverse().find((event) =>
        event.phase === "publish-node"
      );

      await harness.provider.refresh();
      expect(lastPublished()).toEqual(expect.objectContaining({
        answerResult: "answered",
        answerCoverage: "open",
        answerRowCount: 1,
      }));

      await harness.provider.refresh();
      expect(lastPublished()).toEqual(expect.objectContaining({
        answerResult: "answered",
        answerCoverage: "truncated",
        answerRowCount: 1,
      }));

      await harness.provider.refresh();
      expect(lastPublished()).toEqual(expect.objectContaining({
        answerResult: "failed",
        answerCoverage: "complete",
        answerRowCount: 1,
      }));

      await harness.provider.refresh();
      expect(lastPublished()).toEqual(expect.objectContaining({
        answerResult: null,
        answerCoverage: null,
        answerRowCount: null,
      }));
    } finally {
      observation.dispose();
    }
  });

  test("keeps aggregate fingerprints null across multiple workspace boundaries", async () => {
    const observation = captureResourceDiscoveryObservations("resource-explorer");
    try {
      const workspaceA = workspace("file:///repo/a");
      const workspaceB = workspace("file:///repo/b");
      const responseA = response([readyProject([])], workspaceA, "fingerprint:a");
      const mixed = {
        workspaces: [
          ...responseA.workspaces,
          { ...workspaceB, status: "error" as const, error: "private workspace B failure" },
        ],
      };
      const getResourceInventory = vi.fn()
        .mockResolvedValueOnce(mixed)
        .mockResolvedValueOnce(responseA);
      const harness = createHarness(getResourceInventory);

      await harness.provider.refresh();
      expect([...observation.events].reverse().find((event) =>
        event.phase === "publish-complete" && event.publicationKind === "current"
      )).toEqual(expect.objectContaining({
        workspaceIdentity: null,
        fingerprint: null,
      }));

      await harness.provider.refreshWorkspace(workspaceA.key);
      expect([...observation.events].reverse().find((event) =>
        event.phase === "publish-complete" && event.publicationKind === "current"
      )).toEqual(expect.objectContaining({
        workspaceIdentity: expect.stringMatching(/^workspace:[0-9a-f]{64}$/u),
        fingerprint: "fingerprint:a",
      }));
    } finally {
      observation.dispose();
    }
  });

  test("keeps observed tree identity proxies disabled outside the dual-gated host lane", async () => {
    const observationEnv = "AURELIA_LS_EXTENSION_HOST_OBSERVATION";
    const acceptanceEnv = "AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE";
    const previousObservation = process.env[observationEnv];
    const previousAcceptance = process.env[acceptanceEnv];
    const events: ExtensionHostObservation[] = [];
    const listener = (event: ExtensionHostObservation): void => { events.push(event); };
    process.env[observationEnv] = "1";
    process.env[acceptanceEnv] = "0";
    process.on(EXTENSION_HOST_OBSERVATION_EVENT, listener);
    try {
      const card = resource({
        identityKey: "resource:raw-only:v1",
        name: "raw-only-card",
        uri: "file:///repo/src/raw-only-card.ts",
      });
      const harness = createHarness(async () => response([readyProject([card])]));
      await harness.provider.refresh();
      const node = findNode(await roots(harness.provider), "raw-only-card")!;
      const observedToken = `tree-node:${createHash("sha256").update(node.id).digest("hex")}`;

      expect(harness.provider.navigationFor({ id: observedToken }, "declaration")).toBeNull();
      expect(harness.provider.navigationFor(node, "declaration")).toMatchObject({
        resourceIdentityKey: "resource:raw-only:v1",
      });
      expect(node).not.toHaveProperty("observationAnswerResult");
      expect(node).not.toHaveProperty("observationAnswerCoverage");
      expect(node).not.toHaveProperty("observationAnswerRowCount");
      expect(events).toEqual([]);
    } finally {
      process.off(EXTENSION_HOST_OBSERVATION_EVENT, listener);
      restoreEnvironment(observationEnv, previousObservation);
      restoreEnvironment(acceptanceEnv, previousAcceptance);
    }
  });

  test("builds the settled kind-first tree with exact alias and bindable actions", async () => {
    const card = resource({
      identityKey: "resource:product-card:v1",
      name: "product-card",
      uri: "file:///repo/src/product-card.ts",
      aliases: ["store-card"],
      bindables: [{ name: "labelText", attribute: "display-label" }],
    });
    const attribute = resource({
      identityKey: "resource:focus:v1",
      name: "focus",
      kind: "custom-attribute",
      uri: "file:///repo/src/focus.ts",
    });
    const inventory = readyProject([card, attribute]);
    const harness = createHarness(async () => response([{
      ...inventory,
      typeSurfacesIncluded: false,
    }]));

    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    expect(tree.map((node) => node.label)).toEqual(["Elements (1)", "Attributes (1)"]);
    const cardNode = tree[0]!.children![0]!;
    expect(cardNode.description).toContain("project");
    expect(cardNode.children?.map((node) => node.label)).toEqual(["store-card", "labelText (display-label)"]);
    expect(cardNode.children?.[1]?.description).toBe("mode default");
    expect(harness.getResourceInventory).toHaveBeenCalledWith(
      { includeTypeSurfaces: false },
      expect.anything(),
    );
    expect(harness.provider.getTreeItem(cardNode as never).command).toEqual(expect.objectContaining({
      command: AureliaCommand.OpenResource,
    }));
    expect(harness.provider.getTreeItem(cardNode.children![0] as never).command?.arguments?.[0]).toMatchObject({
      role: "alias",
      childIdentityKey: "resource:product-card:v1:alias:store-card",
    });
    expect(iconOf(harness.provider, tree[0]!)).toEqual({ id: "tag", color: undefined });
    expect(iconOf(harness.provider, cardNode)).toEqual({ id: "code", color: undefined });
    expect(iconOf(harness.provider, cardNode.children![0]!)).toEqual({ id: "link", color: undefined });
    expect(iconOf(harness.provider, cardNode.children![1]!)).toEqual({ id: "plug", color: undefined });
    expect(iconOf(harness.provider, tree[1]!)).toEqual({ id: "symbol-property", color: undefined });
    expect(iconOf(harness.provider, tree[1]!.children![0]!)).toEqual({ id: "code", color: undefined });
    expect(harness.provider.getTreeItem(tree[0] as never).collapsibleState).toBe(
      harness.vscode.TreeItemCollapsibleState.Collapsed,
    );
    for (const node of [tree[0]!, cardNode, ...cardNode.children!]) {
      expect(harness.provider.getTreeItem(node as never).accessibilityInformation?.label).toBe(node.accessibilityLabel);
    }
    expect(harness.view.description).toBe("2 resources");
    expect(harness.view.message).toBeUndefined();
  });

  test("uses a distinct native icon for every resource-kind group only", async () => {
    const resources = ([
      ["custom-element", "product-card"],
      ["template-controller", "virtual-repeat"],
      ["custom-attribute", "focus"],
      ["value-converter", "currency"],
      ["binding-behavior", "debounce"],
    ] as const).map(([kind, name]) => resource({
      identityKey: `resource:${kind}:${name}`,
      name,
      kind,
      uri: `file:///repo/src/${name}.ts`,
    }));
    const harness = createHarness(async () => response([readyProject(resources)]));

    await harness.provider.refresh();

    const groups = await roots(harness.provider);
    expect(groups.map((group) => iconOf(harness.provider, group))).toEqual([
      { id: "tag", color: undefined },
      { id: "symbol-structure", color: undefined },
      { id: "symbol-property", color: undefined },
      { id: "arrow-swap", color: undefined },
      { id: "tools", color: undefined },
    ]);
    expect(groups.map((group) => iconOf(harness.provider, group.children![0]!)))
      .toEqual(Array.from({ length: 5 }, () => ({ id: "code", color: undefined })));
  });

  test("uses exact locality and catalog ownership for canonical resource icons", async () => {
    const resources = [
      resource({
        identityKey: "resource:project",
        name: "project-card",
        uri: "file:///repo/src/project-card.ts",
      }),
      resource({
        identityKey: "resource:package",
        name: "package-card",
        uri: "file:///repo/node_modules/@acme/ui/package-card.ts",
        origin: "package",
        packageName: "@acme/ui",
      }),
      resource({
        identityKey: "resource:framework",
        name: "framework-card",
        uri: null,
        origin: "framework",
        packageName: "@aurelia/runtime-html",
        catalogOwnerKind: "core-framework",
      }),
      resource({
        identityKey: "resource:plugin",
        name: "plugin-card",
        uri: null,
        origin: "framework",
        packageName: "@aurelia/router",
        catalogOwnerKind: "official-plugin",
      }),
      resource({
        identityKey: "resource:external",
        name: "external-card",
        uri: "file:///external/external-card.ts",
        origin: "external",
      }),
      resource({
        identityKey: "resource:unknown",
        name: "unknown-card",
        uri: null,
        origin: "unknown",
      }),
      resource({
        identityKey: "resource:local",
        name: "local-card",
        uri: "file:///repo/src/host.html",
        locality: "local-template",
        localityOwnerName: "host-card",
      }),
      resource({
        identityKey: "resource:unowned-catalog",
        name: "unowned-catalog-card",
        uri: null,
        origin: "framework",
        packageName: "@aurelia/unknown",
        catalogOwnerKind: null,
      }),
      resource({
        identityKey: "resource:invalid-owner",
        name: "invalid-owner-card",
        uri: "file:///repo/src/invalid-owner-card.ts",
        origin: "project",
        catalogOwnerKind: "core-framework",
      }),
    ];
    const harness = createHarness(async () => response([readyProject(resources)]));

    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    const expectedIcons = [
      ["project-card", "code"],
      ["package-card", "package"],
      ["framework-card", "library"],
      ["plugin-card", "extensions"],
      ["external-card", "link-external"],
      ["unknown-card", "question"],
      ["local-card", "symbol-file"],
      ["unowned-catalog-card", "question"],
      ["invalid-owner-card", "question"],
    ] as const;
    expect(expectedIcons.map(([label]) => [label, iconOf(harness.provider, findNode(tree, label)!)]))
      .toEqual(expectedIcons.map(([label, id]) => [label, { id, color: undefined }]));
    expect(findNode(tree, "framework-card")?.description).toContain("Aurelia framework");
    expect(findNode(tree, "plugin-card")?.description).toContain("official Aurelia plugin");
    expect(findNode(tree, "local-card")?.description).toContain("local to host-card");
    expect(findNode(tree, "unowned-catalog-card")?.description).toContain("Aurelia catalog · owner unknown");
    expect(findNode(tree, "invalid-owner-card")?.description).toContain("origin classification unavailable");
  });

  test("uses declared bindable modes as icons and redundant public text", async () => {
    const card = resource({
      identityKey: "resource:mode-card",
      name: "mode-card",
      uri: "file:///repo/src/mode-card.ts",
      bindables: [
        { name: "defaultValue", mode: "default", valueType: "string" },
        { name: "initialValue", mode: "oneTime", valueType: "string" },
        { name: "inputValue", mode: "toView", valueType: "string" },
        { name: "outputValue", mode: "fromView", valueType: "string" },
        { name: "sharedValue", attribute: "shared-value", mode: "twoWay", valueType: "string", primary: true },
        { name: "openValue", mode: "hostile-mode", valueType: null },
      ],
    });
    const harness = createHarness(async () => response([readyProject([card])]));

    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    const expected = [
      ["defaultValue", "plug", "default"],
      ["initialValue", "clock", "one time"],
      ["inputValue", "arrow-right", "to view"],
      ["outputValue", "arrow-left", "from view"],
      ["sharedValue (shared-value)", "arrow-both", "two way"],
      ["openValue", "question", "unavailable"],
    ] as const;
    for (const [label, icon, mode] of expected) {
      const node = findNode(tree, label)!;
      expect(iconOf(harness.provider, node)).toEqual({ id: icon, color: undefined });
      expect(node.description).toContain(`mode ${mode}`);
      expect(node.tooltip).toContain(`Binding mode: ${mode}`);
      expect(node.accessibilityLabel).toContain(`${mode} binding mode`);
    }
    const primary = findNode(tree, "sharedValue (shared-value)")!;
    expect(primary.description).toContain("primary");
    expect(primary.tooltip).toContain("Primary bindable");
    expect(primary.accessibilityLabel).toContain("primary bindable");
  });

  test("keeps pathless framework catalog resources visible and non-navigable", async () => {
    const repeat = resource({
      identityKey: "framework:repeat:v1",
      name: "repeat",
      kind: "template-controller",
      uri: null,
      origin: "framework",
      packageName: "@aurelia/runtime-html",
    });
    const harness = createHarness(async () => response([readyProject([repeat])]));

    await harness.provider.refresh();

    const node = (await roots(harness.provider))[0]!.children![0]!;
    expect(node.description).toContain("source location unavailable");
    const item = harness.provider.getTreeItem(node as never);
    expect(item.iconPath).toEqual({ id: "library", color: undefined });
    expect(item.command).toBeUndefined();
    expect(item.accessibilityInformation?.label).toContain("source location unavailable");
    expect(harness.provider.navigationFor(node, "declaration")).toBeNull();
    expect(harness.provider.navigationFor(node, "implementation")).toBeNull();
  });

  test("distinguishes declaration metadata from unavailable navigation", async () => {
    const declarationOnly = resource({
      identityKey: "resource:declaration-only",
      name: "declaration-only",
      uri: "file:///repo/src/declaration-only.ts",
    });
    Object.assign(declarationOnly.sources, {
      publicName: absent(),
      implementation: absent(),
      declaration: available(
        "file:///repo/src/declaration-only.ts",
        "src/declaration-only.ts@1..40",
        "declaration",
      ),
    });
    Object.assign(declarationOnly, {
      navigation: { state: "unavailable" as const, reason: "no-authored-source" as const },
    });
    const harness = createHarness(async () => response([readyProject([declarationOnly])]));
    await harness.provider.refresh();

    const node = (await roots(harness.provider))[0]!.children![0]!;
    expect(node.description).toContain("src/declaration-only.ts");
    expect(node.description).toContain("source location unavailable");
    expect(node.accessibilityLabel).toContain("source src/declaration-only.ts");
    expect(node.accessibilityLabel).toContain("navigation unavailable");
    expect(harness.provider.getTreeItem(node as never).command).toBeUndefined();
  });

  test("extends source scent only as needed for same-project canonical and alias collisions", async () => {
    const left = resource({
      identityKey: "resource:shared:left",
      name: "shared-card",
      uri: "file:///x/a/shared.ts",
      aliases: ["common-card"],
    });
    const right = resource({
      identityKey: "resource:shared:right",
      name: "shared-card",
      uri: "file:///z/a/shared.ts",
      aliases: ["common-card"],
    });
    const harness = createHarness(async () => response([readyProject([left, right])]));
    await harness.provider.refresh();

    const rows = (await roots(harness.provider))[0]!.children!;
    expect(rows.map((node) => node.label)).toEqual(["shared-card", "shared-card"]);
    expect(new Set(rows.map((node) => node.id)).size).toBe(2);
    expect(new Set(rows.map((node) => node.description)).size).toBe(2);
    expect(new Set(rows.map((node) => node.accessibilityLabel)).size).toBe(2);
    expect(rows.map((node) => node.description)).toEqual([
      expect.stringContaining("x/a/shared.ts"),
      expect.stringContaining("z/a/shared.ts"),
    ]);
    expect(rows.map((node) => iconOf(harness.provider, node))).toEqual([
      { id: "code", color: undefined },
      { id: "code", color: undefined },
    ]);
    const aliases = rows.flatMap((node) => node.children ?? []).filter((node) => node.label === "common-card");
    expect(aliases).toHaveLength(2);
    expect(new Set(aliases.map((node) => node.id)).size).toBe(2);
    expect(aliases.map((node) => iconOf(harness.provider, node))).toEqual([
      { id: "link", color: undefined },
      { id: "link", color: undefined },
    ]);
    expect(aliases.map((node) => node.description)).toEqual([
      expect.stringContaining("x/a/shared.ts"),
      expect.stringContaining("z/a/shared.ts"),
    ]);
    expect(new Set(aliases.map((node) => node.accessibilityLabel)).size).toBe(2);
    expect([...rows, ...aliases].flatMap((node) => [node.description, node.accessibilityLabel]).join(" "))
      .not.toMatch(/resource:shared|file:\/\/\//iu);
  });

  test("disambiguates canonical names across kinds and colliding aliases within one project", async () => {
    const element = resource({
      identityKey: "resource:shared:element",
      name: "shared",
      uri: "file:///repo/src/shared.ts",
      aliases: ["common"],
    });
    const attribute = resource({
      identityKey: "resource:shared:attribute",
      name: "shared",
      kind: "custom-attribute",
      uri: "file:///repo/src/shared.ts",
      aliases: ["common"],
    });
    const harness = createHarness(async () => response([readyProject([element, attribute])]));
    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    const resources = tree.flatMap((group) => group.children ?? []);
    expect(new Set(resources.map((node) => node.description)).size).toBe(2);
    expect(new Set(resources.map((node) => node.accessibilityLabel)).size).toBe(2);
    expect(resources.map((node) => node.description).join(" ")).toContain("element");
    expect(resources.map((node) => node.description).join(" ")).toContain("attribute");

    const aliases = resources.flatMap((row) => row.children ?? []).filter((row) => row.label === "common");
    expect(aliases).toHaveLength(2);
    expect(new Set(aliases.map((node) => node.description)).size).toBe(2);
    expect(new Set(aliases.map((node) => node.accessibilityLabel)).size).toBe(2);
    expect(aliases.flatMap((node) => [node.description, node.accessibilityLabel]).join(" "))
      .not.toMatch(/resource:|workspace:|productHandle|compiler/iu);
  });

  test("uses project-root scent when canonical and alias collisions have equal relative paths", async () => {
    const workspaceA = workspace("file:///work/a", "storefront");
    const workspaceB = workspace("file:///work/b", "storefront");
    const left = resource({
      identityKey: "resource:cross-root:left",
      name: "shared-card",
      uri: "file:///work/a/src/shared-card.ts",
      aliases: ["common-card"],
    });
    const right = resource({
      identityKey: "resource:cross-root:right",
      name: "shared-card",
      uri: "file:///work/b/src/shared-card.ts",
      aliases: ["common-card"],
    });
    const harness = createHarness(async () => combinedResponse(
      response([readyProject([left], "app", "complete", "answered", "file:///work/a")], workspaceA, "a"),
      response([readyProject([right], "app", "complete", "answered", "file:///work/b")], workspaceB, "b"),
    ));
    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    const resources = tree.flatMap((root) => root.children ?? []).flatMap((group) => group.children ?? []);
    const aliases = resources.flatMap((resourceNode) => resourceNode.children ?? []);
    expect(new Set(resources.map((node) => node.description)).size).toBe(2);
    expect(new Set(resources.map((node) => node.accessibilityLabel)).size).toBe(2);
    expect(new Set(aliases.map((node) => node.description)).size).toBe(2);
    expect(new Set(aliases.map((node) => node.accessibilityLabel)).size).toBe(2);
    expect([...resources, ...aliases]
      .flatMap((node) => [node.description, node.accessibilityLabel])
      .join(" ")).not.toMatch(/resource:cross-root|workspace:file|productHandle/iu);
  });

  test("exposes exact distinct implementation and beside requests without storing coordinates", async () => {
    const card = resource({
      identityKey: "resource:product-card:implementation",
      name: "product-card",
      uri: "file:///repo/src/product-card.ts",
      implementationLine: 9,
      metadataState: "header-only",
    });
    const harness = createHarness(async () => response([readyProject([card])]));
    await harness.provider.refresh();

    const node = (await roots(harness.provider))[0]!.children![0]!;
    expect(node.contextValue).toBe("resourceWithImplementation");
    expect(node.description).toContain("details incomplete");
    expect(node.accessibilityLabel).toContain("details incomplete");
    expect(harness.provider.navigationFor(node, "implementation")).toEqual(expect.objectContaining({
      role: "implementation",
      resourceIdentityKey: card.identityKey,
    }));
    expect(harness.provider.navigationFor(node, "beside")).toEqual(expect.objectContaining({
      role: "resource",
      placement: "beside",
    }));
    expect(JSON.stringify(harness.provider.navigationFor(node, "implementation"))).not.toContain("range");
  });

  test("keeps semantic projects distinct and exposes partial project failure", async () => {
    const owner = workspace("file:///repo/shop");
    const healthy = readyProject([resource({
      identityKey: "resource:shared:a",
      name: "shared-card",
      uri: "file:///repo/shop/a.ts",
    })], "shop-app");
    const failed = { status: "error", project: project("admin-app"), message: "analysis failed" };
    const harness = createHarness(async () => response([healthy, failed], owner));

    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    expect(tree.map((node) => [node.label, node.description])).toEqual([
      ["shop · shop-app", "1 resource"],
      ["shop · admin-app", "resources could not be loaded"],
    ]);
    expect(tree[1]?.contextValue).toBe("resourceProjectIssue");
    expect(tree[1]?.accessibilityLabel).toContain("resources could not be loaded");
    expect(iconOf(harness.provider, tree[0]!)).toEqual({ id: "project", color: undefined });
    expect(iconOf(harness.provider, tree[1]!)).toEqual({
      id: "project",
      color: { id: "problemsErrorIcon.foreground" },
    });
    expect(harness.view.message).toBeUndefined();
  });

  test("keeps one project glyph while status colors distinguish only semantic project states", async () => {
    const healthyWorkspace = workspace("file:///repo/healthy", "healthy");
    const incompleteWorkspace = workspace("file:///repo/incomplete", "incomplete");
    const invalidWorkspace = workspace("file:///repo/invalid", "invalid");
    const unsupportedWorkspace = workspace("file:///repo/unsupported", "unsupported");
    const failedWorkspace = workspace("file:///repo/failed", "failed");
    const healthy = resource({
      identityKey: "resource:healthy",
      name: "healthy-card",
      uri: "file:///repo/healthy/healthy-card.ts",
    });
    const open = resource({
      identityKey: "resource:open",
      name: "open-card",
      uri: "file:///repo/incomplete/open-card.ts",
    });
    const harness = createHarness(async () => combinedResponse(
      response([readyProject([healthy], "healthy-app", "complete", "answered", healthyWorkspace.uri)], healthyWorkspace),
      response([readyProject([open], "open-app", "open", "answered", incompleteWorkspace.uri)], incompleteWorkspace),
      response([readyProject([], "invalid-app", "complete", "invalid", invalidWorkspace.uri)], invalidWorkspace),
      response([readyProject([], "unsupported-app", "not-applicable", "unsupported", unsupportedWorkspace.uri)], unsupportedWorkspace),
      response([readyProject([], "failed-app", "not-applicable", "failed", failedWorkspace.uri)], failedWorkspace),
    ));
    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    expect(tree.map((node) => [node.label, iconOf(harness.provider, node)])).toEqual([
      ["healthy · healthy-app", { id: "project", color: undefined }],
      ["incomplete · open-app", { id: "project", color: { id: "problemsWarningIcon.foreground" } }],
      ["invalid · invalid-app", { id: "project", color: { id: "problemsWarningIcon.foreground" } }],
      ["unsupported · unsupported-app", { id: "project", color: { id: "problemsInfoIcon.foreground" } }],
      ["failed · failed-app", { id: "project", color: { id: "problemsErrorIcon.foreground" } }],
    ]);
    expect(iconOf(harness.provider, findNode(tree, "open-card")!)).toEqual({ id: "code", color: undefined });
    expect(findNode(tree, "open-card")?.description).toContain("discovery incomplete");
  });

  test("replaces one workspace snapshot while preserving another root and its navigation fingerprint", async () => {
    const workspaceA = workspace("file:///repo/a");
    const workspaceB = workspace("file:///repo/b");
    const oldA = resource({
      identityKey: "resource:a:old",
      name: "old-a-card",
      uri: "file:///repo/a/old.ts",
    });
    const currentA = resource({
      identityKey: "resource:a:current",
      name: "current-a-card",
      uri: "file:///repo/a/current.ts",
    });
    const stableB = resource({
      identityKey: "resource:b:stable",
      name: "stable-b-card",
      uri: "file:///repo/b/stable.ts",
    });
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(combinedResponse(
        response([readyProject([oldA])], workspaceA, "a:old"),
        response([readyProject([stableB])], workspaceB, "b:stable"),
      ))
      .mockResolvedValueOnce(response([readyProject([currentA])], workspaceA, "a:current"));
    const harness = createHarness(getResourceInventory);

    await harness.provider.refresh();
    await harness.provider.refreshWorkspace(workspaceA.key);

    const tree = await roots(harness.provider);
    expect(JSON.stringify(tree)).toContain("current-a-card");
    expect(JSON.stringify(tree)).not.toContain("old-a-card");
    expect(JSON.stringify(tree)).toContain("stable-b-card");
    const stableNode = findNode(tree, "stable-b-card");
    expect(stableNode).toBeDefined();
    expect(harness.provider.getTreeItem(stableNode as never).command?.arguments?.[0]).toMatchObject({
      workspaceKey: workspaceB.key,
      fingerprint: "b:stable",
    });
    expect(harness.getResourceInventory).toHaveBeenLastCalledWith(
      {
        workspaceKey: workspaceA.key,
        includeTypeSurfaces: false,
      },
      expect.anything(),
    );
  });

  test("retains scoped transport errors stale, recovers, then retires an absent workspace", async () => {
    const workspaceA = workspace("file:///repo/a");
    const workspaceB = workspace("file:///repo/b");
    const oldA = resource({
      identityKey: "resource:a:old",
      name: "old-a-card",
      uri: "file:///repo/a/old.ts",
    });
    const currentA = resource({
      identityKey: "resource:a:current",
      name: "current-a-card",
      uri: "file:///repo/a/current.ts",
    });
    const stableB = resource({
      identityKey: "resource:b:stable",
      name: "stable-b-card",
      uri: "file:///repo/b/stable.ts",
    });
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(combinedResponse(
        response([readyProject([oldA])], workspaceA, "a:old"),
        response([readyProject([stableB])], workspaceB, "b:stable"),
      ))
      .mockResolvedValueOnce({ workspaces: [{
        ...workspaceA,
        status: "error",
        error: "workspace a failed",
      }] })
      .mockResolvedValueOnce({ workspaces: [{
        ...workspaceA,
        status: "error",
        error: "workspace a still failed",
      }] })
      .mockResolvedValueOnce(response([readyProject([currentA])], workspaceA, "a:current"))
      .mockResolvedValueOnce(null);
    const harness = createHarness(getResourceInventory);

    await harness.provider.refresh();
    await harness.provider.refreshWorkspace(workspaceA.key);
    let tree = await roots(harness.provider);
    expect(JSON.stringify(tree)).toContain("old-a-card");
    expect(findNode(tree, "old-a-card")?.accessibilityLabel).toContain("out of date");
    expect(JSON.stringify(tree)).not.toContain("workspace a failed");
    expect(JSON.stringify(tree)).toContain("stable-b-card");

    await harness.provider.refreshWorkspace(workspaceA.key);
    tree = await roots(harness.provider);
    expect(JSON.stringify(tree)).toContain("old-a-card");
    expect(findNode(tree, "old-a-card")?.description).toContain("out of date");

    await harness.provider.refreshWorkspace(workspaceA.key);
    tree = await roots(harness.provider);
    expect(JSON.stringify(tree)).toContain("current-a-card");
    expect(JSON.stringify(tree)).not.toContain("old-a-card");
    expect(findNode(tree, "current-a-card")?.description).not.toContain("out of date");

    await harness.provider.refreshWorkspace(workspaceA.key);
    tree = await roots(harness.provider);
    expect(JSON.stringify(tree)).not.toContain("current-a-card");
    expect(JSON.stringify(tree)).toContain("stable-b-card");
    expect(harness.view.description).toBe("1 resource");
  });

  test("atomically retains only failed full-refresh workspaces while admitting healthy peers", async () => {
    const workspaceA = workspace("file:///repo/a");
    const workspaceB = workspace("file:///repo/b");
    const oldA = resource({ identityKey: "resource:a:old", name: "old-a-card", uri: "file:///repo/a/old.ts" });
    const oldB = resource({ identityKey: "resource:b:old", name: "old-b-card", uri: "file:///repo/b/old.ts" });
    const currentB = resource({ identityKey: "resource:b:current", name: "current-b-card", uri: "file:///repo/b/current.ts" });
    const baseline = combinedResponse(
      response([readyProject([oldA])], workspaceA, "a:old"),
      response([readyProject([oldB])], workspaceB, "b:old"),
    );
    const mixed = {
      workspaces: [
        { ...workspaceA, status: "error" as const, error: "private workspace A failure" },
        ...response([readyProject([currentB])], workspaceB, "b:current").workspaces,
      ],
    };
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(baseline)
      .mockResolvedValueOnce(mixed)
      .mockResolvedValueOnce(response([readyProject([currentB])], workspaceB, "b:current-2"));
    const harness = createHarness(getResourceInventory);

    await harness.provider.refresh();
    await harness.provider.refresh();
    let tree = await roots(harness.provider);

    expect(JSON.stringify(tree)).toContain("old-a-card");
    expect(findNode(tree, "old-a-card")?.accessibilityLabel).toContain("out of date");
    expect(JSON.stringify(tree)).toContain("current-b-card");
    expect(JSON.stringify(tree)).not.toContain("old-b-card");
    expect(findNode(tree, "current-b-card")?.accessibilityLabel).not.toContain("out of date");
    expect(JSON.stringify(tree)).not.toContain("private workspace A failure");

    await harness.provider.refresh();
    tree = await roots(harness.provider);
    expect(JSON.stringify(tree)).not.toContain("old-a-card");
    expect(JSON.stringify(tree)).toContain("current-b-card");
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasIssues")).toBe(false);
  });

  test("admits initial transport errors but replaces prior rows with returned semantic issue states", async () => {
    const owner = workspace("file:///repo");
    const old = resource({ identityKey: "resource:old", name: "old-card", uri: "file:///repo/old.ts" });
    const projectError = response([], owner, "project-error");
    projectError.workspaces[0]!.response.projects = [{
      status: "error",
      project: project("app", owner.uri),
      message: "private project error",
    }] as never;
    const invalid = response([readyProject([], "app", "not-applicable", "invalid", owner.uri)], owner, "invalid");
    const initialError = { workspaces: [{ ...owner, status: "error" as const, error: "private initial error" }] };
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(initialError)
      .mockResolvedValueOnce(response([readyProject([old])], owner, "baseline"))
      .mockResolvedValueOnce(projectError)
      .mockResolvedValueOnce(invalid);
    const harness = createHarness(getResourceInventory);

    await harness.provider.refresh();
    let tree = await roots(harness.provider);
    expect(JSON.stringify(tree)).toContain("No current Aurelia resource inventory was returned");
    expect(JSON.stringify(tree)).toContain("language server did not return a current resource inventory");
    expect(JSON.stringify(tree)).not.toContain("out of date");

    await harness.provider.refresh();
    expect(JSON.stringify(await roots(harness.provider))).toContain("old-card");
    await harness.provider.refresh();
    tree = await roots(harness.provider);
    expect(JSON.stringify(tree)).not.toContain("old-card");
    expect(JSON.stringify(tree)).toContain("Aurelia project analysis did not complete for app");
    expect(tree[0]?.accessibilityLabel).toContain("Project analysis did not complete for app");
    expect(JSON.stringify(tree)).not.toContain("out of date");

    await harness.provider.refresh();
    tree = await roots(harness.provider);
    expect(JSON.stringify(tree)).toContain("Aurelia resource information is out of date for app");
    expect(JSON.stringify(tree)).not.toContain("old-card");
    expect(JSON.stringify(tree)).not.toContain("private project error");
  });

  test("retains workspace A stale state when workspace B refreshes successfully", async () => {
    const workspaceA = workspace("file:///repo/a");
    const workspaceB = workspace("file:///repo/b");
    const resourceA = resource({ identityKey: "resource:a", name: "a-card", uri: "file:///repo/a/a.ts" });
    const resourceB = resource({ identityKey: "resource:b", name: "b-card", uri: "file:///repo/b/b.ts" });
    const baseline = combinedResponse(
      response([readyProject([resourceA])], workspaceA, "a:base"),
      response([readyProject([resourceB])], workspaceB, "b:base"),
    );
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(baseline)
      .mockRejectedValueOnce(new Error("workspace A refresh failed"))
      .mockResolvedValueOnce(response([readyProject([resourceB])], workspaceB, "b:next"));
    const harness = createHarness(getResourceInventory);
    await harness.provider.refresh();
    await harness.provider.refreshWorkspace(workspaceA.key);

    expect(findNode(await roots(harness.provider), "a-card")?.description).toContain("out of date");
    expect(findNode(await roots(harness.provider), "b-card")?.description).not.toContain("out of date");
    await harness.provider.refreshWorkspace(workspaceB.key);

    const tree = await roots(harness.provider);
    expect(findNode(tree, "a-card")?.description).toContain("out of date");
    expect(findNode(tree, "a-card")?.accessibilityLabel).toContain("out of date");
    expect(findNode(tree, "b-card")?.description).not.toContain("out of date");
    const staleProject = tree.find((node) => findNode([node], "a-card") != null)!;
    expect(iconOf(harness.provider, staleProject)).toEqual({
      id: "project",
      color: { id: "problemsWarningIcon.foreground" },
    });
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasIssues")).toBe(true);
  });

  test("keeps a workspace-level failure on its own root instead of blaming one healthy project", async () => {
    const workspaceA = workspace("file:///repo/a");
    const workspaceB = workspace("file:///repo/b");
    const healthy = resource({ identityKey: "resource:healthy", name: "healthy-card", uri: "file:///repo/a/card.ts" });
    const healthyResponse = response([readyProject([healthy])], workspaceA, "a:current");
    const harness = createHarness(async () => ({
      workspaces: [
        ...healthyResponse.workspaces,
        { ...workspaceB, status: "error" as const, error: "workspace B failed" },
      ],
    }));
    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    expect(tree).toHaveLength(2);
    expect(tree[0]?.description).toBe("1 resource");
    expect(tree[1]?.description).toBe("resources could not be loaded");
    expect(harness.view.message).toBeUndefined();
    expect(harness.view.description).toBe("1 known resource");
  });

  test("escalates a scoped request to a full refresh without a coherent baseline", async () => {
    const workspaceA = workspace("file:///repo/a");
    const workspaceB = workspace("file:///repo/b");
    const harness = createHarness(async () => combinedResponse(
      response([readyProject([])], workspaceA, "a:current"),
      response([readyProject([])], workspaceB, "b:current"),
    ));

    await harness.provider.refreshWorkspace(workspaceA.key);

    expect(harness.getResourceInventory).toHaveBeenCalledWith(
      { includeTypeSurfaces: false },
      expect.anything(),
    );
    expect((await roots(harness.provider)).map((node) => node.label)).toEqual([
      "a · app",
      "b · app",
    ]);
  });

  test("uses collision-safe visible project roots when workspace and project labels match", async () => {
    const workspaceA = workspace("file:///private/tenant-a/apps/repo", "repo");
    const workspaceB = workspace("file:///private/tenant-b/apps/repo", "repo");
    const harness = createHarness(async () => combinedResponse(
      response([readyProject([], "app", "complete", "answered", workspaceA.key)], workspaceA, "a"),
      response([readyProject([], "app", "complete", "answered", workspaceB.key)], workspaceB, "b"),
    ));

    await harness.provider.refresh();
    const tree = await roots(harness.provider);
    expect(tree).toHaveLength(2);
    expect(new Set(tree.map((node) => node.label)).size).toBe(2);
    expect(tree.every((node) => node.label.startsWith("repo · app · "))).toBe(true);
    expect(tree.every((node) => node.label.includes("apps/repo · project"))).toBe(true);
    expect(new Set(tree.map((node) => node.id)).size).toBe(2);
    expect(tree.flatMap((node) => [node.label, node.accessibilityLabel, node.tooltip]).join(" "))
      .not.toMatch(/file:\/\/\/|private\/tenant/iu);
  });

  test("does not publish a late scoped result after a newer full refresh", async () => {
    const workspaceA = workspace("file:///repo/a");
    const workspaceB = workspace("file:///repo/b");
    let resolveLateScoped!: (value: unknown) => void;
    const lateScoped = new Promise<unknown>((resolve) => {
      resolveLateScoped = resolve;
    });
    const fullCurrent = resource({
      identityKey: "resource:b:current",
      name: "full-current-card",
      uri: "file:///repo/b/current.ts",
    });
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(combinedResponse(
        response([readyProject([])], workspaceA, "a:baseline"),
        response([readyProject([])], workspaceB, "b:baseline"),
      ))
      .mockImplementationOnce(() => lateScoped)
      .mockResolvedValueOnce(combinedResponse(
        response([readyProject([])], workspaceA, "a:current"),
        response([readyProject([fullCurrent])], workspaceB, "b:current"),
      ));
    const harness = createHarness(getResourceInventory);
    await harness.provider.refresh();

    const scopedRefresh = harness.provider.refreshWorkspace(workspaceA.key);
    const fullRefresh = harness.provider.refresh();
    await fullRefresh;
    resolveLateScoped(response([readyProject([resource({
      identityKey: "resource:a:late",
      name: "late-scoped-card",
      uri: "file:///repo/a/late.ts",
    })])], workspaceA, "a:late"));
    await scopedRefresh;

    const tree = await roots(harness.provider);
    expect(JSON.stringify(tree)).toContain("full-current-card");
    expect(JSON.stringify(tree)).not.toContain("late-scoped-card");
  });

  test("observes a superseded predecessor as discarded without publishing its fingerprint", async () => {
    const observation = captureResourceDiscoveryObservations("resource-explorer");
    try {
      const owner = workspace("file:///repo/a");
      const predecessor = new Promise<unknown>(() => undefined);
      const getResourceInventory = vi.fn()
        .mockResolvedValueOnce(response([readyProject([])], owner, "baseline"))
        .mockImplementationOnce(() => predecessor);
      const harness = createHarness(getResourceInventory);
      await harness.provider.refresh();
      observation.events.length = 0;

      const pending = harness.provider.refreshWorkspace(owner.key);
      await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(2));
      harness.provider.supersedeRefresh(owner.key);
      await pending;

      expect(observation.events).toEqual(expect.arrayContaining([
        expect.objectContaining({
          phase: "discarded",
          reason: "superseded",
          fingerprint: null,
        }),
      ]));
      const discarded = observation.events.find((event) => event.phase === "discarded")!;
      expect(discarded.currentGeneration).toBeGreaterThan(discarded.generation as number);
      expect(observation.events.some((event) =>
        event.phase === "publish-complete" && event.fingerprint === "retired-predecessor"
      )).toBe(false);
      expect(observation.events.filter((event) => event.phase === "publish-node")).toEqual([]);
    } finally {
      observation.dispose();
    }
  });

  test("publishes only the latest refresh and retains the current snapshot while pending", async () => {
    let resolveFirst!: (value: unknown) => void;
    const firstResult = new Promise((resolve) => { resolveFirst = resolve; });
    const current = resource({
      identityKey: "resource:current",
      name: "current-card",
      uri: "file:///repo/current.ts",
    });
    const getResourceInventory = vi.fn()
      .mockImplementationOnce(() => firstResult)
      .mockResolvedValueOnce(response([readyProject([current])], workspace(), "current"));
    const harness = createHarness(getResourceInventory);

    const firstRefresh = harness.provider.refresh();
    await harness.provider.refresh();
    resolveFirst(response([readyProject([resource({
      identityKey: "resource:retired",
      name: "retired-card",
      uri: "file:///repo/retired.ts",
    })])], workspace(), "retired"));
    await firstRefresh;

    const tree = await roots(harness.provider);
    expect(JSON.stringify(tree)).toContain("current-card");
    expect(JSON.stringify(tree)).not.toContain("retired-card");
  });

  test("labels coverage-open inventory as incomplete", async () => {
    const harness = createHarness(async () => response([readyProject([], "app", "open")]));
    await harness.provider.refresh();
    expect(harness.view.message).toBe("Showing 0 known resources; discovery is incomplete in app.");
    const partial = (await roots(harness.provider))[0]!;
    expect(partial.label).toBe("No reliable Aurelia resource rows were discovered in app");
    expect(partial.contextValue).toBe("resourceProjectIssue");
    expect(harness.provider.retryWorkspaceFor(partial)).toBe("file:///repo");
  });

  test("keeps a complete answered empty result distinct from partial and refusal states", async () => {
    const harness = createHarness(async () => response([readyProject([])]));
    await harness.provider.refresh();

    const empty = (await roots(harness.provider))[0]!;
    expect(empty.label).toBe("No supported Aurelia resources were discovered in app");
    expect(empty.accessibilityLabel).toContain("Supported kinds are elements");
    expect(harness.view.message).toBeUndefined();
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasIssues")).toBe(false);
  });

  test("keeps a sole-project empty row stable until a failed refresh becomes stale", async () => {
    let rejectRefresh!: (error: Error) => void;
    const refreshing = new Promise<unknown>((_resolve, reject) => { rejectRefresh = reject; });
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(response([readyProject([])]))
      .mockImplementationOnce(() => refreshing);
    const harness = createHarness(getResourceInventory);
    await harness.provider.refresh();

    const retained = (await roots(harness.provider))[0]!;
    const pending = harness.provider.refresh();
    await Promise.resolve();
    let info = (await roots(harness.provider))[0]!;
    expect(info).toBe(retained);
    expect(info.description ?? "").not.toContain("updating");
    expect(info.accessibilityLabel).not.toContain("updating");

    rejectRefresh(new Error("refresh failed"));
    await pending;
    info = (await roots(harness.provider))[0]!;
    expect(info.description).toContain("out of date");
    expect(info.accessibilityLabel).toContain("out of date");
    expect(info.contextValue).toBe("resourceProjectIssue");
    expect(harness.provider.retryWorkspaceFor(info)).toBe("file:///repo");
  });

  test("keeps an existing issue row stable until a failed refresh becomes stale", async () => {
    let rejectRefresh!: (error: Error) => void;
    const refreshing = new Promise<unknown>((_resolve, reject) => { rejectRefresh = reject; });
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(response([readyProject([], "app", "not-applicable", "unsupported")]))
      .mockImplementationOnce(() => refreshing);
    const harness = createHarness(getResourceInventory);
    await harness.provider.refresh();

    const retained = (await roots(harness.provider))[0]!;
    const pending = harness.provider.refresh();
    await Promise.resolve();
    expect((await roots(harness.provider))[0]).toBe(retained);
    expect((await roots(harness.provider))[0]?.accessibilityLabel).not.toContain("updating");
    rejectRefresh(new Error("refresh failed"));
    await pending;
    expect((await roots(harness.provider))[0]?.accessibilityLabel).toContain("out of date");
  });

  test.each([
    [
      "failed",
      "Aurelia project analysis did not complete for app",
      "Resources could not be loaded for app. Refresh to retry; see Aurelia Output for details.",
      "resourceProjectIssue",
      "file:///repo",
    ],
    [
      "invalid",
      "Aurelia resource information is out of date for app",
      "Aurelia resource information is out of date for app. Refresh to retry.",
      "resourceProjectIssue",
      "file:///repo",
    ],
    [
      "unsupported",
      "Resource discovery is not supported for app",
      "Resource discovery is not supported for app. See Aurelia Output for details.",
      "resourceProjectUnsupported",
      null,
    ],
  ] as const)("keeps a ready transport with answer result %s distinct", async (
    result,
    label,
    message,
    contextValue,
    retryWorkspaceKey,
  ) => {
    const untrusted = resource({
      identityKey: `resource:${result}:untrusted`,
      name: "must-not-render",
      uri: "file:///repo/untrusted.ts",
    });
    const harness = createHarness(async () => response([
      readyProject([untrusted], "app", "not-applicable", result),
    ]));
    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    expect(tree).toEqual([expect.objectContaining({ label })]);
    expect(JSON.stringify(tree)).not.toContain("must-not-render");
    expect(JSON.stringify(tree)).not.toContain("INTERNAL answer summary");
    expect(tree[0]?.contextValue).toBe(contextValue);
    if (result === "failed") {
      expect(tree[0]?.accessibilityLabel).toContain("project analysis did not complete");
    }
    expect(harness.provider.retryWorkspaceFor(tree[0])).toBe(retryWorkspaceKey);
    expect(harness.view.message).toBe(message);
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasIssues")).toBe(true);
  });

  test("does not republish or reflow retained rows before the replacement settles", async () => {
    let settle!: (value: unknown) => void;
    const replacement = new Promise<unknown>((resolve) => { settle = resolve; });
    const current = resource({
      identityKey: "resource:current:updating",
      name: "current-card",
      uri: "file:///repo/current.ts",
    });
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(response([readyProject([current])], workspace(), "current"))
      .mockImplementationOnce(() => replacement);
    const harness = createHarness(getResourceInventory);
    await harness.provider.refresh();
    const retained = findNode(await roots(harness.provider), "current-card")!;
    const changed = vi.fn();
    const subscription = harness.provider.onDidChangeTreeData(changed);

    const pending = harness.provider.refresh();
    await Promise.resolve();
    const pendingRow = findNode(await roots(harness.provider), "current-card")!;
    expect(pendingRow).toBe(retained);
    expect(pendingRow.description).not.toContain("updating");
    expect(pendingRow.accessibilityLabel).not.toContain("updating");
    expect(harness.view.message).toBeUndefined();
    expect(changed).not.toHaveBeenCalled();

    settle(response([readyProject([current])], workspace(), "next"));
    await pending;
    expect(changed).toHaveBeenCalledOnce();
    subscription.dispose();
  });

  test("keeps every workspace row stable while a scoped replacement is pending", async () => {
    const observation = captureResourceDiscoveryObservations("resource-explorer");
    const workspaceA = workspace("file:///repo/a");
    const workspaceB = workspace("file:///repo/b");
    const currentA = resource({
      identityKey: "resource:a:scoped-updating",
      name: "a-card",
      uri: "file:///repo/a/card.ts",
    });
    const stableB = resource({
      identityKey: "resource:b:scoped-stable",
      name: "b-card",
      uri: "file:///repo/b/card.ts",
    });
    const baseline = combinedResponse(
      response([readyProject([currentA])], workspaceA, "a:baseline"),
      response([readyProject([stableB])], workspaceB, "b:baseline"),
    );
    const recoveredA = response([readyProject([currentA])], workspaceA, "a:recovered");
    let settle!: (value: unknown) => void;
    const replacement = new Promise<unknown>((resolve) => { settle = resolve; });
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(baseline)
      .mockImplementationOnce(() => replacement);
    const harness = createHarness(getResourceInventory);
    await harness.provider.refresh();
    const baselineA = findNode(await roots(harness.provider), "a-card")!;
    const baselineB = findNode(await roots(harness.provider), "b-card")!;
    observation.events.length = 0;

    const pending = harness.provider.refreshWorkspace(workspaceA.key);
    try {
      const tree = await roots(harness.provider);
      const pendingA = findNode(tree, "a-card")!;
      const pendingProject = tree.find((node) => findNode([node], "a-card") != null)!;
      const retainedB = findNode(tree, "b-card")!;
      expect(pendingA).toBe(baselineA);
      expect(pendingA.description).not.toContain("updating");
      expect(pendingA.accessibilityLabel).not.toContain("updating");
      expect(iconOf(harness.provider, pendingProject)).toEqual({ id: "project", color: undefined });
      expect(retainedB).toEqual(expect.objectContaining({
        id: baselineB.id,
        label: baselineB.label,
        description: baselineB.description,
        accessibilityLabel: baselineB.accessibilityLabel,
      }));
      expect(retainedB.description ?? "").not.toContain("updating");
      expect(retainedB.accessibilityLabel).not.toContain("updating");
      expect(harness.view.message).toBeUndefined();
      expect(observation.events).toEqual([]);
    } finally {
      settle(recoveredA);
      await pending;
      observation.dispose();
    }

    const recoveredTree = await roots(harness.provider);
    expect(findNode(recoveredTree, "a-card")?.description ?? "").not.toContain("updating");
    expect(findNode(recoveredTree, "b-card")).toEqual(expect.objectContaining({
      id: baselineB.id,
      description: baselineB.description,
      accessibilityLabel: baselineB.accessibilityLabel,
    }));
    expect(harness.view.message).toBeUndefined();
  });

  test("publishes an honest no-session row after a successful null response", async () => {
    const harness = createHarness(async () => null);
    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    expect(tree).toEqual([expect.objectContaining({
      id: "no-session",
      label: "No active Aurelia resource inventory is available",
    })]);
    expect(harness.provider.getTreeItem(tree[0] as never).accessibilityInformation?.label).toContain(
      "No active Aurelia resource inventory",
    );
  });

  test("keeps an initial operational failure user-safe and recoverable", async () => {
    const getResourceInventory = vi.fn()
      .mockRejectedValueOnce(new Error("C:\\internal\\analysis.ts: raw stack"))
      .mockResolvedValueOnce(null);
    const harness = createHarness(getResourceInventory);
    await harness.provider.refresh();

    const failed = (await roots(harness.provider))[0]!;
    expect(failed.label).toBe("No current Aurelia resource inventory was returned");
    expect(failed.accessibilityLabel).toContain("language server did not return a current resource inventory");
    expect(JSON.stringify(failed)).not.toContain("internal");
    expect(harness.view.message).toBe(
      "Resource discovery failed. Refresh to retry; see Aurelia Output for details.",
    );
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasIssues")).toBe(true);

    await harness.provider.refresh();
    expect((await roots(harness.provider))[0]?.id).toBe("no-session");
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasIssues")).toBe(false);
  });

  test("keeps protocol cancellation transient instead of publishing a failed inventory", async () => {
    const cancellation = Object.assign(new Error("cancelled"), { code: -32800 });
    const current = resource({
      identityKey: "resource:current-after-cancellation",
      name: "current-card",
      uri: "file:///repo/current.ts",
    });
    const getResourceInventory = vi.fn()
      .mockRejectedValueOnce(cancellation)
      .mockResolvedValueOnce(response([readyProject([current])]))
      .mockRejectedValueOnce(cancellation);
    const harness = createHarness(getResourceInventory);

    await harness.provider.refresh();

    expect(await roots(harness.provider)).toEqual([]);
    expect(harness.view.message).toBeUndefined();
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasIssues")).toBe(false);

    await harness.provider.refresh();
    const settledTree = await roots(harness.provider);
    await harness.provider.refresh();

    expect(await roots(harness.provider)).toEqual(settledTree);
    expect(JSON.stringify(settledTree)).toContain("current-card");
    expect(JSON.stringify(settledTree)).not.toContain("out of date");
    expect(harness.view.message).toBeUndefined();
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasIssues")).toBe(false);
    expect(harness.logger.warn).not.toHaveBeenCalledWith(
      "resourceExplorer.refresh.failed",
      expect.anything(),
    );
  });

  test("retains the last coherent tree when a refresh fails", async () => {
    const current = resource({
      identityKey: "resource:current",
      name: "current-card",
      uri: "file:///repo/current.ts",
    });
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(response([readyProject([current])]))
      .mockRejectedValueOnce(new Error("server unavailable"))
      .mockResolvedValueOnce(response([readyProject([current])], workspace(), "recovered"));
    const harness = createHarness(getResourceInventory);

    await harness.provider.refresh();
    await harness.provider.refresh();

    expect(JSON.stringify(await roots(harness.provider))).toContain("current-card");
    const stale = findNode(await roots(harness.provider), "current-card")!;
    expect(stale.description).toContain("out of date");
    expect(stale.accessibilityLabel).toContain("out of date");
    expect(iconOf(harness.provider, stale)).toEqual({ id: "code", color: undefined });
    expect(harness.view.message).toBe(
      "Out of date — refresh failed. Refresh to retry; see Aurelia Output for details.",
    );
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasIssues")).toBe(true);
    expect(harness.logger.warn).toHaveBeenCalledWith(
      "resourceExplorer.refresh.failed",
      { message: "server unavailable" },
    );

    await harness.provider.refresh();
    const recovered = findNode(await roots(harness.provider), "current-card")!;
    expect(recovered.description).not.toContain("out of date");
    expect(harness.view.message).toBeUndefined();
    expect(harness.recorded.contextValues.get("aurelia.resourceExplorerHasIssues")).toBe(false);
  });
});

function iconOf(provider: ResourceExplorerProvider, node: Node): IconPresentation | undefined {
  return provider.getTreeItem(node as never).iconPath as IconPresentation | undefined;
}

function captureResourceDiscoveryObservations(source: string): {
  readonly events: ExtensionHostObservation[];
  dispose(): void;
} {
  const observationEnv = "AURELIA_LS_EXTENSION_HOST_OBSERVATION";
  const acceptanceEnv = "AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE";
  const previousObservation = process.env[observationEnv];
  const previousAcceptance = process.env[acceptanceEnv];
  const events: ExtensionHostObservation[] = [];
  const listener = (event: ExtensionHostObservation): void => {
    if (event.source === source) events.push(event);
  };
  process.env[observationEnv] = "1";
  process.env[acceptanceEnv] = "1";
  process.on(EXTENSION_HOST_OBSERVATION_EVENT, listener);
  return {
    events,
    dispose: () => {
      process.off(EXTENSION_HOST_OBSERVATION_EVENT, listener);
      if (previousObservation == null) delete process.env[observationEnv];
      else process.env[observationEnv] = previousObservation;
      if (previousAcceptance == null) delete process.env[acceptanceEnv];
      else process.env[acceptanceEnv] = previousAcceptance;
    },
  };
}

function isObservationPrimitive(value: unknown): boolean {
  return value == null || ["string", "number", "boolean"].includes(typeof value);
}

function restoreEnvironment(key: string, value: string | undefined): void {
  if (value == null) delete process.env[key];
  else process.env[key] = value;
}
