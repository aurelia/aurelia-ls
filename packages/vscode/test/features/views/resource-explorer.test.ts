import { describe, expect, test, vi } from "vitest";
import { ResourceExplorerProvider } from "../../../out/features/views/resource-explorer.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createVscodeApi } from "../../helpers/vscode-stub.js";

interface Node {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly children?: readonly Node[];
}

const completeAnswer = {
  result: "answered",
  selection: "not-applicable",
  coverage: "complete",
  summary: "complete",
};

const completeEvidence = {
  definitions: completeAnswer,
  visibility: completeAnswer,
  compilations: completeAnswer,
};

function workspace(key = "file:///repo") {
  return {
    key,
    name: key.split("/").at(-1) ?? "repo",
    uri: key,
    status: "ready",
    resourceCount: 0,
    templateCount: 1,
    inlineTemplateCount: 0,
    evidence: completeEvidence,
  };
}

function resource(input: {
  id: string;
  name: string;
  workspace?: ReturnType<typeof workspace>;
  origin?: string;
  file?: string | null;
  package?: string | null;
  targetName?: string | null;
  aliases?: string[];
  bindables?: Array<{ name: string; attribute?: string; valueType?: string | null; primary?: boolean }>;
  visibility?: Array<{ visibilityKind: string; compilerWorld: string; file?: string | null }>;
  kind?: string;
}) {
  const owner = input.workspace ?? workspace();
  return {
    id: input.id,
    name: input.name,
    kind: input.kind ?? "custom-element",
    aliases: (input.aliases ?? []).map((name) => ({ name, source: null })),
    bindables: (input.bindables ?? []).map((bindable) => ({
      name: bindable.name,
      attribute: bindable.attribute ?? bindable.name,
      callback: `${bindable.name}Changed`,
      mode: "default",
      setterKind: "property",
      setterTargetName: null,
      nullable: null,
      valueType: bindable.valueType ?? null,
      valueTypeShapeKind: null,
      effectiveValueTypeShapeKind: null,
      valueTypeHasCallSignature: null,
      valueTypeHasMembers: null,
      valueTypeIsWeak: null,
      source: null,
      nameSource: null,
      attributeSource: null,
      propertySource: null,
      callbackSource: null,
      callbackTargetSource: null,
      modeSource: null,
      setSource: null,
      setterTargetSource: null,
      typeSource: null,
      nullableSource: null,
      primary: bindable.primary ?? false,
    })),
    definition: input.targetName === undefined ? null : {
      projectKey: "app",
      key: `au:resource:custom-element:${input.name}`,
      targetName: input.targetName,
      defaultProperty: null,
      declarationModes: ["decorator"],
      source: null,
      nameSource: null,
      targetSource: null,
      targetDeclarationSource: null,
    },
    visibility: (input.visibility ?? []).map((row) => ({
      compilerWorld: row.compilerWorld,
      resourceKind: input.kind ?? "custom-element",
      name: input.name,
      aliases: input.aliases ?? [],
      visibilityKind: row.visibilityKind,
      source: null,
      file: row.file ?? null,
    })),
    source: null,
    file: input.file ?? null,
    package: input.package ?? null,
    origin: input.origin ?? "project",
    workspace: owner,
  };
}

function response(
  resources: readonly ReturnType<typeof resource>[],
  workspaces = [workspace()],
  fingerprint = "semantic-runtime:test",
) {
  return {
    fingerprint,
    resources,
    workspaces,
    templateCount: workspaces.reduce((sum, row) => sum + (row.status === "ready" ? row.templateCount : 0), 0),
    inlineTemplateCount: 0,
  };
}

function createHarness(getResources: () => Promise<unknown>) {
  const { vscode: baseVscode } = createVscodeApi();
  class ThemeIcon {
    constructor(public readonly id: string) {}
  }
  const vscode = {
    ...baseVscode,
    ThemeIcon,
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
  } as unknown as VscodeApi;
  const logger = { debug: vi.fn(), warn: vi.fn() };
  const provider = new ResourceExplorerProvider(
    vscode,
    { getResources: vi.fn(getResources) } as never,
    logger as never,
  );
  return { logger, provider, vscode };
}

async function roots(provider: ResourceExplorerProvider): Promise<Node[]> {
  return await Promise.resolve(provider.getChildren()) as Node[];
}

describe("ResourceExplorerProvider", () => {
  test("shows exact project/package provenance, aliases, bindables, visibility, and navigation", async () => {
    const owner = workspace();
    const project = resource({
      id: "definition:app-root",
      name: "app-root",
      workspace: owner,
      file: "C:/repo/src/app-root.ts",
      targetName: "AppRoot",
      aliases: ["shell-root"],
      bindables: [{ name: "value", valueType: "string", primary: true }],
      visibility: [{ visibilityKind: "app-root", compilerWorld: "app-root src/main.ts", file: "C:/repo/src/main.ts" }],
    });
    const packageResource = resource({
      id: "definition:plugin-card",
      name: "plugin-card",
      workspace: owner,
      origin: "package",
      file: "C:/repo/node_modules/@scope/plugin/plugin-card.js",
      package: "@scope/plugin",
      targetName: "PluginCard",
    });
    const harness = createHarness(async () => response([project, packageResource], [{ ...owner, resourceCount: 2 }]));

    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    expect(tree.map((node) => node.label)).toEqual([
      "Project - Elements (1)",
      "Packages - Elements (1)",
      "2 resources | 1 project | 1 package | 1 templates",
    ]);
    const projectNode = tree[0]!.children![0]!;
    expect(projectNode.id).toContain("definition:app-root");
    expect(projectNode.children?.map((node) => [node.label, node.description])).toEqual(expect.arrayContaining([
      ["shell-root", "alias"],
      ["value", ": string | primary"],
      ["app-root", "app-root src/main.ts"],
    ]));
    expect(harness.provider.getTreeItem(projectNode as never).command).toEqual(expect.objectContaining({
      command: "vscode.open",
    }));
  });

  test("keeps same-named definitions distinct inside one compiler inventory", async () => {
    const owner = workspace();
    const harness = createHarness(async () => response([
      resource({ id: "definition:first", name: "shared-card", workspace: owner, targetName: "FirstCard" }),
      resource({ id: "definition:second", name: "shared-card", workspace: owner, targetName: "SecondCard" }),
    ], [{ ...owner, resourceCount: 2 }]));

    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    const resources = tree[0]!.children!;
    expect(resources).toHaveLength(2);
    expect(resources.map((node) => node.id)).toEqual([
      expect.stringContaining("definition:first"),
      expect.stringContaining("definition:second"),
    ]);
    expect(resources.map((node) => node.description)).toEqual([
      expect.stringContaining("FirstCard"),
      expect.stringContaining("SecondCard"),
    ]);
  });

  test("expands app-owned resources and keeps the framework catalog collapsed", async () => {
    const owner = workspace();
    const harness = createHarness(async () => response([
      resource({ id: "definition:app-card", name: "app-card", workspace: owner }),
      resource({
        id: "resource:framework-if",
        name: "if",
        workspace: owner,
        kind: "template-controller",
        origin: "framework",
      }),
    ], [{ ...owner, resourceCount: 2 }]));

    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    expect(tree.slice(0, 2).map((node) => node.label)).toEqual([
      "Project - Elements (1)",
      "Framework - Template Controllers (1)",
    ]);
    expect(harness.provider.getTreeItem(tree[0] as never).collapsibleState).toBe(
      harness.vscode.TreeItemCollapsibleState.Expanded,
    );
    expect(harness.provider.getTreeItem(tree[1] as never).collapsibleState).toBe(
      harness.vscode.TreeItemCollapsibleState.Collapsed,
    );
  });

  test("keeps same-named resources beneath exact workspace roots", async () => {
    const first = { ...workspace("file:///repo/a"), resourceCount: 1, templateCount: 2 };
    const second = { ...workspace("file:///repo/b"), resourceCount: 1, templateCount: 3 };
    const harness = createHarness(async () => response([
      resource({ id: "definition:a", name: "shared-card", workspace: first }),
      resource({ id: "definition:b", name: "shared-card", workspace: second }),
    ], [first, second], "multi-root"));

    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    expect(tree.map((node) => node.label)).toEqual(["a", "b"]);
    expect(new Set(tree.map((node) => node.id)).size).toBe(2);
    expect(tree[0]!.children![0]!.id).not.toBe(tree[1]!.children![0]!.id);
  });

  test("shows one failed root without hiding healthy workspace resources", async () => {
    const healthy = { ...workspace("file:///repo/healthy"), resourceCount: 1 };
    const failed = {
      key: "file:///repo/failed",
      name: "failed",
      uri: "file:///repo/failed",
      status: "error",
      error: "semantic runtime unavailable",
    };
    const harness = createHarness(async () => response([
      resource({ id: "definition:healthy", name: "healthy-card", workspace: healthy }),
    ], [healthy, failed] as never));

    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    expect(tree.map((node) => [node.label, node.description])).toEqual([
      ["healthy", "1 resource"],
      ["failed", "analysis failed"],
    ]);
    expect(tree[1]!.children?.[0]?.label).toBe("Resource analysis failed");
  });

  test("surfaces incomplete semantic coverage instead of presenting an authoritative empty inventory", async () => {
    const owner = {
      ...workspace(),
      resourceCount: 0,
      evidence: {
        ...completeEvidence,
        visibility: { ...completeAnswer, coverage: "open", summary: "Container registration is open." },
      },
    };
    const harness = createHarness(async () => response([], [owner]));

    await harness.provider.refresh();

    const tree = await roots(harness.provider);
    expect(tree.map((node) => node.label)).toEqual([
      "No resources discovered",
      "Resource inventory may be incomplete",
      "0 resources | 1 templates",
    ]);
  });

  test("publishes only the latest refresh and removes retired workspace roots", async () => {
    let resolveFirst!: (value: unknown) => void;
    const firstResult = new Promise((resolve) => { resolveFirst = resolve; });
    const secondOwner = { ...workspace("file:///repo/current"), resourceCount: 1 };
    const getResources = vi.fn()
      .mockImplementationOnce(() => firstResult)
      .mockResolvedValueOnce(response([
        resource({ id: "definition:current", name: "current-card", workspace: secondOwner }),
      ], [secondOwner], "current"));
    const harness = createHarness(getResources);

    const firstRefresh = harness.provider.refresh();
    await harness.provider.refresh();
    resolveFirst(response([
      resource({ id: "definition:retired", name: "retired-card" }),
    ], [workspace("file:///repo/retired")], "retired"));
    await firstRefresh;

    const tree = await roots(harness.provider);
    expect(JSON.stringify(tree)).toContain("current-card");
    expect(JSON.stringify(tree)).not.toContain("retired-card");
  });
});
