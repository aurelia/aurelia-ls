import { describe, expect, test, vi } from "vitest";
import { UserCommandsFeature } from "../../../out/features/commands/user-commands.js";
import { AureliaCommand } from "../../../out/product-contract.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createTestServices } from "../../helpers/test-helpers.js";
import { createVscodeApi, stubExtensionContext } from "../../helpers/vscode-stub.js";

const owner = { key: "workspace:shop", name: "shop", uri: "file:///repo" };
const project = {
  projectKey: "shop-app",
  rootUri: "file:///repo",
  sourceFiles: 10,
  shapeKind: "aurelia-app",
  analysisKind: "full",
};
const answer = {
  schemaVersion: "0.2",
  result: "answered",
  selection: "not-applicable",
  coverage: "complete",
  summary: "complete",
  page: null,
};

function available(uri: string, role = "public-name", line = 3) {
  return {
    state: "available",
    location: {
      uri,
      range: { start: { line, character: 2 }, end: { line, character: 14 } },
      role,
      label: "src/product-card.ts@42..54",
    },
  };
}

function absent() {
  return { state: "absent" } as const;
}

function resource(
  name = "product-card",
  uri: string | null = "file:///repo/src/product-card.ts",
  navigationLine = 3,
) {
  const navigation = uri == null
    ? { state: "unavailable" as const, reason: "external-catalog" as const }
    : available(uri, "public-name", navigationLine);
  return {
    identityKey: `resource:${name}:v1`,
    projectKey: project.projectKey,
    kind: "custom-element",
    name,
    registrationKey: `au:resource:custom-element:${name}`,
    aliases: [{
      identityKey: `resource:${name}:alias:store-card`,
      registrationKey: null,
      name: "store-card",
      source: uri == null ? absent() : available(uri, "alias"),
      navigation: uri == null ? navigation : available(uri, "alias"),
    }],
    bindables: [{
      identityKey: `resource:${name}:bindable:labelText`,
      name: "labelText",
      attribute: "display-label",
      mode: "default",
      nullable: null,
      valueType: "string",
      primary: false,
      sources: { name: uri == null ? absent() : available(uri, "bindable-name"), attribute: absent(), property: absent(), declaration: absent() },
      navigation: uri == null ? navigation : available(uri, "bindable-name"),
    }],
    declarationModes: ["decorator"],
    metadataState: "full-definition",
    origin: { kind: "project", projectKey: project.projectKey, packageName: null, moduleKey: "src/product-card.ts", catalogGroup: null },
    locality: { kind: "project", ownerIdentityKey: null, ownerName: null, ownerSource: absent() },
    sources: {
      publicName: uri == null ? absent() : available(uri),
      declaration: uri == null ? absent() : available(uri, "declaration"),
      implementation: uri == null ? absent() : available(uri, "implementation"),
    },
    navigation,
  };
}

function inventory(resources = [resource()], coverage = "complete", fingerprint = "semantic-runtime:one") {
  return {
    workspaces: [{
      ...owner,
      status: "ready",
      response: {
        fingerprint,
        projects: [{
          status: "ready",
          project,
          answer: { ...answer, coverage },
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
        }],
      },
    }],
  };
}

function exactAvailability() {
  return {
    ...owner,
    fingerprint: "semantic-runtime:one",
    workspace: owner,
    projectSelection: {
      status: "exact",
      project,
      answer: { ...answer, selection: "exact" },
      selectedTemplate: {
        templateIdentityKey: "template:my-app:v1",
        scopeIdentityKey: "scope:my-app:v1",
        definitionName: "my-app",
        compilationLane: "app-runtime",
        source: available("file:///repo/src/my-app.html", "template"),
      },
      templateCandidates: [],
      resources: [{
        resource: resource(),
        state: "available",
        visibilityKind: "app-root",
        availabilitySource: available("file:///repo/src/main.ts", "availability"),
      }],
      completeness: {
        fullDefinitions: 1,
        headerOnly: 0,
        visibilityOnly: 0,
        localTemplates: 0,
        excludedCompilerSyntax: 0,
        unnamedDefinitions: 0,
        unresolvedModules: 0,
        openVisibility: 0,
      },
    },
  };
}

function createHarness(input: {
  readonly inventory?: unknown;
  readonly availability?: (...args: unknown[]) => unknown;
  readonly related?: unknown;
  readonly relatedPickIndex?: number;
} = {}) {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  Object.assign(stubVscode.window, {
    showQuickPick: async (items: readonly unknown[]) => input.relatedPickIndex == null
      ? undefined
      : items[input.relatedPickIndex],
  });
  const vscode = stubVscode as unknown as VscodeApi;
  const { errors, logger } = createTestServices(vscode);
  const getResourceInventory = vi.fn(async (_options?: unknown, _token?: unknown) =>
    input.inventory ?? inventory()
  );
  const getTemplateResourceAvailability = vi.fn(async (...args: unknown[]) =>
    input.availability?.(...args) ?? exactAvailability()
  );
  const getRelatedFiles = vi.fn(async () => input.related ?? []);
  const ctx = {
    extension: stubExtensionContext(stubVscode),
    vscode,
    logger,
    errors,
    lsp: { getResourceInventory, getTemplateResourceAvailability, getRelatedFiles },
  };
  UserCommandsFeature.activate(ctx as never, (contribution) => contribution);

  const uri = stubVscode.Uri.parse("file:///repo/src/my-app.html");
  stubVscode.window.activeTextEditor = {
    document: { uri, version: 7 },
    selection: { active: { line: 8, character: 5 } },
  };
  return { recorded, getResourceInventory, getTemplateResourceAvailability, getRelatedFiles };
}

describe("UserCommandsFeature", () => {
  test("Go to Resource omits pathless rows and re-resolves the exact range before opening", async () => {
    const initial = inventory([resource(), resource("repeat", null)], "complete", "semantic-runtime:old");
    const shifted = inventory([resource("product-card", "file:///repo/src/product-card.ts", 12)], "complete", "semantic-runtime:new");
    const harness = createHarness({ inventory: initial });
    harness.getResourceInventory
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(shifted);

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
    expect(harness.recorded.quickPicks[0]).toMatchObject({
      title: "Go to Aurelia Resource",
      placeholder: "Search by resource, alias, bindable, kind, project, package, or source",
    });
    expect(harness.recorded.quickPicks[0]?.items[0]).toMatchObject({
      label: "product-card",
      description: "element · project",
      detail: expect.stringContaining("store-card"),
    });
    harness.recorded.quickPicks[0]!.accept(0);
    await command;

    expect(harness.getResourceInventory).toHaveBeenCalledTimes(2);
    expect(harness.getResourceInventory.mock.calls.map(([options]) => options)).toEqual([
      {},
      { workspaceKey: owner.key },
    ]);
    expect(harness.recorded.openedDocuments.at(-1)?.uri.toString()).toBe("file:///repo/src/product-card.ts");
    expect(harness.recorded.shownDocuments.at(-1)?.opts).toMatchObject({
      preview: true,
      selection: { start: { line: 12, character: 2 }, end: { line: 12, character: 14 } },
    });
  });

  test("refuses stale navigation when the selected resource disappeared", async () => {
    const initial = inventory([resource()], "complete", "semantic-runtime:old");
    const removed = inventory([], "complete", "semantic-runtime:new");
    const harness = createHarness({ inventory: initial });
    harness.getResourceInventory
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(removed);

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
    harness.recorded.quickPicks[0]!.accept(0);
    await command;

    expect(harness.recorded.shownDocuments).toHaveLength(0);
    expect(harness.recorded.infoMessages).toContain("That Aurelia resource no longer exists in the current analysis.");
  });

  test("active-template navigation resolves project then template ambiguity without unioning", async () => {
    const availability = vi.fn((_uri, _position, projectKey, scopeIdentityKey) => {
      if (projectKey == null) {
        return {
          fingerprint: "semantic-runtime:one",
          workspace: owner,
          projectSelection: {
            status: "ambiguous",
            candidates: [project, { ...project, projectKey: "nested-app", rootUri: "file:///repo/nested" }],
          },
        };
      }
      if (scopeIdentityKey == null) {
        return {
          fingerprint: "semantic-runtime:one",
          workspace: owner,
          projectSelection: {
            status: "exact",
            project,
            answer: { ...answer, selection: "ambiguous" },
            selectedTemplate: null,
            templateCandidates: [
              { templateIdentityKey: "template:my-app", scopeIdentityKey: "scope:first", definitionName: "my-app", compilationLane: "app-runtime", source: absent() },
              { templateIdentityKey: "template:my-app", scopeIdentityKey: "scope:second", definitionName: "local-card", compilationLane: "authoring", source: absent() },
            ],
            resources: [],
            completeness: exactAvailability().projectSelection.completeness,
          },
        };
      }
      return exactAvailability();
    });
    const harness = createHarness({ availability });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(2));
    acceptQuickPickLabel(harness.recorded.quickPicks[0]!, "shop-app");
    await vi.waitFor(() => expect(harness.recorded.quickPicks[1]?.items).toHaveLength(2));
    acceptQuickPickLabel(harness.recorded.quickPicks[1]!, "my-app");
    await vi.waitFor(() => expect(harness.recorded.quickPicks[2]?.items).toHaveLength(1));
    harness.recorded.quickPicks[2]!.accept(0);
    await command;

    expect(availability.mock.calls.map((call) => call.slice(2, 4))).toEqual([
      [undefined, undefined],
      ["shop-app", undefined],
      ["shop-app", "scope:first"],
      ["shop-app", "scope:first"],
    ]);
    expect(harness.recorded.openedDocuments.at(-1)?.uri.toString()).toBe("file:///repo/src/product-card.ts");
  });

  test("openRelatedFile asks the user to resolve genuine topology ambiguity", async () => {
    const harness = createHarness({
      related: [
        { uri: "file:///primary.html", role: "component-template", elementName: "primary-card", className: "PrimaryCard" },
        { uri: "file:///secondary.html", role: "component-template", elementName: "secondary-card", className: "SecondaryCard" },
      ],
      relatedPickIndex: 1,
    });

    await harness.recorded.commandHandlers.get(AureliaCommand.OpenRelatedFile)?.();

    expect(harness.getRelatedFiles).toHaveBeenCalledWith("file:///repo/src/my-app.html");
    expect(harness.recorded.openedDocuments.at(-1)?.uri.toString()).toBe("file:///secondary.html");
  });
});

function acceptQuickPickLabel(
  picker: { readonly items: readonly unknown[]; accept(index: number): void },
  label: string,
): void {
  const index = picker.items.findIndex((item) => (item as { readonly label?: string }).label === label);
  if (index < 0) throw new Error(`Quick Pick item '${label}' was not published.`);
  picker.accept(index);
}
