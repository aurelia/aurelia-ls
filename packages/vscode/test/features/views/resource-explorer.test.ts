import { describe, expect, test, vi } from "vitest";
import { ResourceExplorerProvider } from "../../../out/features/views/resource-explorer.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createVscodeApi } from "../../helpers/vscode-stub.js";

describe("ResourceExplorerProvider", () => {
  test("groups runtime source resources by project and package provenance", async () => {
    const { vscode: baseVscode } = createVscodeApi();
    class ThemeIcon {
      constructor(public readonly id: string) {}
    }
    const vscode = {
      ...baseVscode,
      ThemeIcon,
      TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    } as unknown as VscodeApi;
    const queries = {
      getResources: vi.fn(async () => ({
        fingerprint: "semantic-runtime:test",
        templateCount: 1,
        inlineTemplateCount: 0,
        resources: [
          {
            name: "app-root",
            kind: "custom-element",
            className: "AppRoot",
            file: "C:/repo/src/app-root.ts",
            bindableCount: 1,
            bindables: [{ name: "value", attribute: "value", mode: "twoWay" }],
            origin: "source",
            scope: "global",
            declarationForm: "decorator",
          },
          {
            name: "plugin-card",
            kind: "custom-element",
            className: "PluginCard",
            file: "C:/repo/node_modules/@scope/plugin/plugin-card.js",
            package: "@scope/plugin",
            bindableCount: 0,
            bindables: [],
            origin: "source",
            scope: "global",
            declarationForm: "decorator",
          },
        ],
      })),
    };
    const logger = { debug: vi.fn(), warn: vi.fn() };
    const provider = new ResourceExplorerProvider(vscode, queries as never, logger as never);

    await provider.refresh();

    const roots = await Promise.resolve(provider.getChildren()) as unknown[];
    const labels = roots.map((node) => String((node as { label: string }).label));
    expect(labels).toContain("Project — Elements (1)");
    expect(labels).toContain("Packages — Elements (1)");
    expect(labels.at(-1)).toBe("2 resources | 1 project | 1 package | 1 templates");
    expect(labels.join(" ")).not.toContain("gap");
  });

  test("keeps same-named resources distinct beneath their owning workspace roots", async () => {
    const { vscode: baseVscode } = createVscodeApi();
    class ThemeIcon {
      constructor(public readonly id: string) {}
    }
    const vscode = {
      ...baseVscode,
      ThemeIcon,
      TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    } as unknown as VscodeApi;
    const workspaces = [
      { key: "file:///repo/a", name: "a", uri: "file:///repo/a", resourceCount: 1, templateCount: 2, inlineTemplateCount: 0 },
      { key: "file:///repo/b", name: "b", uri: "file:///repo/b", resourceCount: 1, templateCount: 3, inlineTemplateCount: 1 },
    ];
    const queries = {
      getResources: vi.fn(async () => ({
        fingerprint: "multi-root",
        templateCount: 5,
        inlineTemplateCount: 1,
        workspaces,
        resources: workspaces.map((workspace) => ({
          name: "shared-card",
          kind: "custom-element",
          bindableCount: 0,
          bindables: [],
          origin: "source",
          scope: "global",
          workspace,
        })),
      })),
    };
    const provider = new ResourceExplorerProvider(
      vscode,
      queries as never,
      { debug: vi.fn(), warn: vi.fn() } as never,
    );

    await provider.refresh();

    const roots = await Promise.resolve(provider.getChildren()) as Array<{ id: string; label: string }>;
    expect(roots.map((root) => root.label)).toEqual(["a", "b"]);
    expect(new Set(roots.map((root) => root.id)).size).toBe(2);
    const firstChildren = await Promise.resolve(provider.getChildren(roots[0] as never)) as Array<{ id: string }>;
    const secondChildren = await Promise.resolve(provider.getChildren(roots[1] as never)) as Array<{ id: string }>;
    expect(firstChildren[0]?.id).not.toBe(secondChildren[0]?.id);
  });
});
