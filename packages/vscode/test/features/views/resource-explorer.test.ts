import { describe, expect, test, vi } from "vitest";
import { ResourceExplorerProvider } from "../../../out/features/views/resource-explorer.js";
import { AureliaCommand } from "../../../out/product-contract.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createVscodeApi } from "../../helpers/vscode-stub.js";

interface Node {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly children?: readonly Node[];
}

const completeAnswer = {
  schemaVersion: "0.2",
  result: "answered",
  selection: "not-applicable",
  coverage: "complete",
  summary: "complete",
  page: null,
};

function workspace(key = "file:///repo") {
  return { key, name: key.split("/").at(-1) ?? "repo", uri: key };
}

function project(projectKey = "app") {
  return {
    projectKey,
    rootUri: `file:///repo/${projectKey}`,
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
  aliases?: string[];
  bindables?: Array<{ name: string; attribute?: string; valueType?: string | null }>;
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
      mode: "default",
      nullable: null,
      valueType: bindable.valueType ?? null,
      primary: false,
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
    metadataState: "full-definition",
    origin: {
      kind: input.origin ?? "project",
      projectKey: input.origin === "project" || input.origin == null ? "app" : null,
      packageName: input.packageName ?? null,
      moduleKey: input.uri == null ? null : "src/product-card.ts",
      catalogGroup: input.origin === "framework" ? "default-resources" : null,
    },
    locality: { kind: "project", ownerIdentityKey: null, ownerName: null, ownerSource: absent() },
    sources: {
      publicName: input.uri == null ? absent() : available(input.uri),
      declaration: input.uri == null ? absent() : available(input.uri, "declaration", "declaration"),
      implementation: input.uri == null ? absent() : available(input.uri, "implementation", "implementation"),
    },
    navigation,
  };
}

function readyProject(resources: readonly ReturnType<typeof resource>[], projectKey = "app", coverage = "complete") {
  return {
    status: "ready",
    project: project(projectKey),
    answer: { ...completeAnswer, coverage },
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

function createHarness(getResourceInventory: () => Promise<unknown>) {
  const { vscode: stubVscode } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const logger = { debug: vi.fn(), warn: vi.fn() };
  const provider = new ResourceExplorerProvider(
    vscode,
    { getResourceInventory: vi.fn(getResourceInventory) } as never,
    logger as never,
  );
  const view: { message?: string; description?: string } = {};
  provider.attachView(view as never);
  return { logger, provider, view, vscode };
}

async function roots(provider: ResourceExplorerProvider): Promise<Node[]> {
  return await Promise.resolve(provider.getChildren()) as Node[];
}

describe("ResourceExplorerProvider", () => {
  test("builds the settled kind-first tree with exact alias and bindable actions", async () => {
    const card = resource({
      identityKey: "resource:product-card:v1",
      name: "product-card",
      uri: "file:///repo/src/product-card.ts",
      aliases: ["store-card"],
      bindables: [{ name: "labelText", attribute: "display-label", valueType: "string" }],
    });
    const attribute = resource({
      identityKey: "resource:focus:v1",
      name: "focus",
      kind: "custom-attribute",
      uri: "file:///repo/src/focus.ts",
    });
    const harness = createHarness(async () => response([readyProject([card, attribute]) ]));

    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    expect(tree.map((node) => node.label)).toEqual(["Elements (1)", "Attributes (1)"]);
    const cardNode = tree[0]!.children![0]!;
    expect(cardNode.description).toContain("project");
    expect(cardNode.children?.map((node) => node.label)).toEqual(["store-card", "labelText (display-label)"]);
    expect(harness.provider.getTreeItem(cardNode as never).command).toEqual(expect.objectContaining({
      command: AureliaCommand.OpenResource,
    }));
    expect(harness.provider.getTreeItem(cardNode.children![0] as never).command?.arguments?.[0]).toMatchObject({
      role: "alias",
      childIdentityKey: "resource:product-card:v1:alias:store-card",
    });
    expect(harness.view.description).toBe("2 resources");
    expect(harness.view.message).toBeUndefined();
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
    expect(harness.provider.getTreeItem(node as never).command).toBeUndefined();
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
      ["shop · admin-app", "analysis failed"],
    ]);
    expect(harness.view.message).toBe("Showing 1 known resources — incomplete");
  });

  test("publishes only the latest refresh and retains the current snapshot while updating", async () => {
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
    expect(harness.view.message).toBe("Showing 0 known resources — incomplete");
    expect((await roots(harness.provider))[0]?.label).toBe("No reliable resource rows discovered");
  });

  test("retains the last coherent tree when a refresh fails", async () => {
    const current = resource({
      identityKey: "resource:current",
      name: "current-card",
      uri: "file:///repo/current.ts",
    });
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(response([readyProject([current])]))
      .mockRejectedValueOnce(new Error("server unavailable"));
    const harness = createHarness(getResourceInventory);

    await harness.provider.refresh();
    await harness.provider.refresh();

    expect(JSON.stringify(await roots(harness.provider))).toContain("current-card");
    expect(harness.view.message).toBe("Out of date — refresh failed. Retry when analysis has settled.");
    expect(harness.logger.warn).toHaveBeenCalledWith(
      "resourceExplorer.refresh.failed",
      { message: "server unavailable" },
    );
  });
});
