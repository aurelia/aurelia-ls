import { describe, expect, test, vi } from "vitest";
import {
  EXTENSION_HOST_OBSERVATION_EVENT,
  type ExtensionHostObservation,
} from "../../../out/extension-host-observation.js";
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

const EXTENSION_HOST_OBSERVATION_ENV = "AURELIA_LS_EXTENSION_HOST_OBSERVATION";
const RESOURCE_DISCOVERY_ACCEPTANCE_ENV = "AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE";
const PRODUCT_CARD_IDENTITY_SET_SHA256 = "12774ad4796e4569fdaf7e6d636db60708028fe3d950b03503d50cedb19a6787";
const EMPTY_RESOURCE_IDENTITY_SET_SHA256 = "327fd628cccfccf19e15da66a13fecc7d024224d58d78510a9677f3f10256d3a";

function available(uri: string, role = "public-name", line = 3, label = "src/product-card.ts@42..54") {
  return {
    state: "available",
    location: {
      uri,
      range: { start: { line, character: 2 }, end: { line, character: 14 } },
      role,
      label,
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
  label = "src/product-card.ts@42..54",
) {
  const navigation = uri == null
    ? { state: "unavailable" as const, reason: "external-catalog" as const }
    : available(uri, "public-name", navigationLine, label);
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
      source: uri == null ? absent() : available(uri, "alias", navigationLine, label),
      navigation: uri == null ? navigation : available(uri, "alias", navigationLine, label),
    }],
    bindables: [{
      identityKey: `resource:${name}:bindable:labelText`,
      name: "labelText",
      attribute: "display-label",
      mode: "default",
      nullable: null,
      valueType: "string",
      primary: false,
      sources: { name: uri == null ? absent() : available(uri, "bindable-name", navigationLine, label), attribute: absent(), property: absent(), declaration: absent() },
      navigation: uri == null ? navigation : available(uri, "bindable-name", navigationLine, label),
    }],
    declarationModes: ["decorator"],
    metadataState: "full-definition",
    origin: {
      kind: "project",
      projectKey: project.projectKey,
      packageName: null,
      moduleKey: "src/product-card.ts",
      catalogGroup: null,
      catalogOwnerKind: null,
    },
    locality: { kind: "project", ownerIdentityKey: null, ownerName: null, ownerSource: absent() },
    sources: {
      publicName: uri == null ? absent() : available(uri, "public-name", navigationLine, label),
      declaration: uri == null ? absent() : available(uri, "declaration", navigationLine, label),
      implementation: uri == null ? absent() : available(uri, "implementation", navigationLine, label),
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
        source: available("file:///repo/src/my-app.html", "template", 3, "src/my-app.html@42..54"),
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

function availabilityWithThrowingObservationMap() {
  const response = exactAvailability();
  response.projectSelection.resources = new Proxy(response.projectSelection.resources, {
    get: (target, property, receiver) => {
      if (property === "map") throw new Error("observation-only identity hashing failed");
      return Reflect.get(target, property, receiver);
    },
  });
  return response;
}

function stagedAvailability(
  _uri: unknown,
  _position: unknown,
  projectKey: unknown,
  scopeIdentityKey: unknown,
) {
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
  const selected = exactAvailability();
  selected.projectSelection.selectedTemplate.scopeIdentityKey = String(scopeIdentityKey);
  return selected;
}

function inventoryWithAnswerResult(result: "failed" | "invalid" | "unsupported") {
  const response = inventory([]);
  const projectResult = response.workspaces[0]!.response.projects[0]!;
  projectResult.answer.result = result;
  projectResult.answer.summary = "private C:\\workspace\\semantic-detail";
  return response;
}

function availabilityWithAnswerResult(result: "failed" | "invalid" | "unsupported") {
  const response = exactAvailability();
  response.projectSelection.answer.result = result;
  response.projectSelection.answer.summary = "private C:\\workspace\\semantic-detail";
  response.projectSelection.resources = [];
  return response;
}

function availabilityWithSelection(selection: "absent" | "not-applicable" | "rerouted") {
  const response = exactAvailability();
  return {
    ...response,
    projectSelection: {
      ...response.projectSelection,
      answer: {
        ...response.projectSelection.answer,
        selection,
        summary: "raw template compiler scope detail",
      },
      selectedTemplate: null,
      resources: [],
    },
  };
}

function collisionResource(
  identityKey: string,
  owningProject: typeof project,
  uri: string,
  label: string,
  kind: "custom-element" | "custom-attribute" = "custom-element",
  originKind: "project" | "package" = "project",
) {
  const base = resource("shared-card", uri, 3, label);
  return {
    ...base,
    identityKey,
    projectKey: owningProject.projectKey,
    kind,
    registrationKey: `au:resource:${kind}:${identityKey}`,
    aliases: base.aliases.map((alias) => ({
      ...alias,
      identityKey: `${identityKey}:alias:shared-alias`,
      name: "shared-alias",
    })),
    origin: originKind === "package"
      ? { ...base.origin, kind: "package", packageName: "@acme/ui", moduleKey: label }
      : { ...base.origin, projectKey: owningProject.projectKey, moduleKey: label },
  };
}

function readyInventoryProject(projectValue: typeof project, resources: readonly ReturnType<typeof collisionResource>[]) {
  return {
    status: "ready",
    project: projectValue,
    answer: { ...answer },
    typeSurfacesIncluded: false,
    resources,
    completeness: {
      fullDefinitions: resources.length,
      headerOnly: 0,
      visibilityOnly: 0,
      localTemplates: 0,
      excludedCompilerSyntax: 0,
      unnamedDefinitions: 0,
      unresolvedModules: 0,
      openVisibility: 0,
    },
  };
}

function collisionFixture() {
  const nestedProject = {
    ...project,
    projectKey: "nested-app",
    rootUri: "file:///repo/nested",
  };
  const projectRow = collisionResource(
    "collision:project",
    project,
    "file:///repo/src/shared-card.ts",
    "src/shared-card.ts@10..21",
  );
  const packageRow = collisionResource(
    "collision:package",
    project,
    "file:///repo/node_modules/@acme/ui/shared-card.ts",
    "node_modules/@acme/ui/shared-card.ts@4..15",
    "custom-element",
    "package",
  );
  const attributeRow = collisionResource(
    "collision:attribute",
    project,
    "file:///repo/src/shared-attribute.ts",
    "src/shared-attribute.ts@8..19",
    "custom-attribute",
  );
  const nestedRow = collisionResource(
    "collision:nested",
    nestedProject,
    "file:///repo/nested/src/shared-card.ts",
    "nested/src/shared-card.ts@12..23",
  );
  const inventoryResponse = {
    workspaces: [{
      ...owner,
      status: "ready",
      response: {
        fingerprint: "semantic-runtime:collisions",
        projects: [
          readyInventoryProject(project, [projectRow, packageRow, attributeRow]),
          readyInventoryProject(nestedProject, [nestedRow]),
        ],
      },
    }],
  };
  const availabilityResponse = exactAvailability();
  availabilityResponse.projectSelection.resources = [projectRow, packageRow, attributeRow].map((candidate) => ({
    resource: candidate,
    state: "available",
    visibilityKind: "configured",
    availabilitySource: available("file:///repo/src/main.ts", "availability"),
  }));
  return { inventoryResponse, availabilityResponse };
}

function createHarness(input: {
  readonly inventory?: unknown;
  readonly availability?: (...args: unknown[]) => unknown;
  readonly related?: unknown;
  readonly relatedPickIndex?: number;
  readonly informationMessageResponses?: Array<string | undefined>;
  readonly errorMessageResponses?: Array<string | undefined>;
} = {}) {
  const { vscode: stubVscode, recorded } = createVscodeApi({
    informationMessageResponses: input.informationMessageResponses,
    errorMessageResponses: input.errorMessageResponses,
  });
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
  const languageSession = { client: {}, incarnation: 1 };
  const ctx = {
    extension: stubExtensionContext(stubVscode),
    vscode,
    logger,
    errors,
    lsp: { getResourceInventory, getTemplateResourceAvailability, getRelatedFiles },
    languageClient: { sessionForUri: () => languageSession },
  };
  UserCommandsFeature.activate(ctx as never, (contribution) => contribution);

  const uri = stubVscode.Uri.parse("file:///repo/src/my-app.html");
  stubVscode.window.activeTextEditor = {
    document: { uri, version: 7 },
    selection: { active: { line: 8, character: 5 } },
  };
  return {
    recorded,
    getResourceInventory,
    getTemplateResourceAvailability,
    getRelatedFiles,
    languageSession,
    vscode: stubVscode,
  };
}

describe("UserCommandsFeature", () => {
  test("gives direct resource navigation user-safe Retry and Output recovery", async () => {
    const harness = createHarness({ errorMessageResponses: ["Retry"] });
    harness.getResourceInventory.mockRejectedValueOnce(new Error("private navigation failure"));

    const outcome = await harness.recorded.commandHandlers.get(AureliaCommand.OpenResource)?.({
      workspaceKey: owner.key,
      fingerprint: "semantic-runtime:one",
      projectKey: project.projectKey,
      resourceIdentityKey: resource().identityKey,
      role: "resource",
    });

    expect(outcome).toEqual({ ok: true, value: true });
    expect(harness.recorded.errorMessageRequests).toEqual([{
      message: "Aurelia couldn't open the selected resource.",
      items: ["Retry", "Open Aurelia Output"],
    }]);
    expect(JSON.stringify(harness.recorded.errorMessageRequests)).not.toContain("private navigation failure");
    expect(harness.recorded.openedDocuments.at(-1)?.uri.toString()).toBe("file:///repo/src/product-card.ts");
  });

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
      { projectSelection: "default-app" },
      { workspaceKey: owner.key, projectKey: "shop-app" },
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

  test("routes a shifted failed project answer through safe picker recovery without opening", async () => {
    const initial = inventory([resource()], "complete", "semantic-runtime:old");
    const failed = inventory([resource()], "complete", "semantic-runtime:new");
    failed.workspaces[0]!.response.projects[0]!.answer.result = "failed";
    failed.workspaces[0]!.response.projects[0]!.answer.summary = "private C:\\workspace\\semantic failure";
    const harness = createHarness({ inventory: initial });
    harness.getResourceInventory.mockResolvedValueOnce(initial).mockResolvedValueOnce(failed);

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
    harness.recorded.quickPicks[0]!.accept(0);
    await command;

    expect(harness.recorded.errorMessageRequests).toEqual([{
      message: "Aurelia couldn't open the selected resource.",
      items: ["Retry", "Open Aurelia Output"],
    }]);
    expect(JSON.stringify(harness.recorded.errorMessageRequests)).not.toContain("private");
    expect(harness.recorded.openedDocuments).toEqual([]);
  });

  test("keeps a partial inventory picker open while opening Aurelia Output", async () => {
    const harness = createHarness({ inventory: inventory([resource()], "open") });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.busy).toBe(false));
    expect(harness.recorded.quickPicks[0]).toMatchObject({
      title: "Go to Aurelia Resource — incomplete",
      buttons: [{ tooltip: "Open Aurelia Output" }],
    });

    harness.recorded.quickPicks[0]!.triggerButton(0);

    expect(harness.recorded.shownOutputChannels).toEqual([{ name: "test", preserveFocus: true }]);
    expect(harness.recorded.quickPicks[0]?.visible).toBe(true);
    harness.recorded.quickPicks[0]!.hide();
    await command;
  });

  test("offers user-safe Retry and Open Output recovery for an inventory failure", async () => {
    const harness = createHarness({ errorMessageResponses: ["Retry"] });
    harness.getResourceInventory.mockRejectedValueOnce(new Error("private C:\\workspace\\failure"));

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToResource)?.();
    await vi.waitFor(() => expect(harness.recorded.errorMessageRequests).toHaveLength(1));
    await vi.waitFor(() => expect(harness.recorded.quickPicks[1]?.items).toHaveLength(1));

    expect(harness.recorded.errorMessageRequests[0]).toEqual({
      message: "Aurelia resource discovery couldn't load the active workspaces.",
      items: ["Retry", "Open Aurelia Output"],
    });
    expect(JSON.stringify(harness.recorded.errorMessageRequests)).not.toContain("command.");
    expect(JSON.stringify(harness.recorded.errorMessageRequests)).not.toContain("workspace\\failure");

    harness.recorded.quickPicks[1]!.hide();
    await command;
    expect(harness.getResourceInventory).toHaveBeenCalledTimes(2);
  });

  test("opens Aurelia Output from total-failure recovery without retrying", async () => {
    const harness = createHarness({ errorMessageResponses: ["Open Aurelia Output"] });
    harness.getResourceInventory.mockRejectedValueOnce(new Error("analysis failed"));

    await harness.recorded.commandHandlers.get(AureliaCommand.GoToResource)?.();

    expect(harness.getResourceInventory).toHaveBeenCalledTimes(1);
    expect(harness.recorded.shownOutputChannels).toEqual([{ name: "test", preserveFocus: true }]);
  });

  test.each(["failed", "invalid"] as const)(
    "treats a semantic %s inventory answer as an actionable total failure",
    async (result) => {
      const failed = inventoryWithAnswerResult(result);
      const harness = createHarness({
        inventory: failed,
        errorMessageResponses: ["Retry"],
      });
      harness.getResourceInventory
        .mockResolvedValueOnce(failed)
        .mockResolvedValueOnce(inventory());

      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToResource)?.();
      await vi.waitFor(() => expect(harness.recorded.errorMessageRequests).toHaveLength(1));
      await vi.waitFor(() => expect(harness.recorded.quickPicks[1]?.items).toHaveLength(1));

      expect(harness.recorded.errorMessageRequests[0]).toEqual({
        message: "Aurelia resource discovery couldn't load the active workspaces.",
        items: ["Retry", "Open Aurelia Output"],
      });
      expect(JSON.stringify(harness.recorded.errorMessageRequests)).not.toContain("semantic-detail");
      expect(harness.recorded.outputLogs.join("\n")).toContain("resourceDiscovery.operation.failed");

      harness.recorded.quickPicks[1]!.hide();
      await command;
    },
  );

  test("retains trustworthy inventory rows when another semantic project fails", async () => {
    const partial = inventory();
    const successful = partial.workspaces[0]!.response.projects[0]!;
    partial.workspaces[0]!.response.projects.push({
      ...successful,
      project: { ...successful.project, projectKey: "broken-app", rootUri: "file:///repo/broken" },
      answer: {
        ...successful.answer,
        result: "failed",
        summary: "private project failure",
      },
      resources: [],
    });
    const harness = createHarness({ inventory: partial });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.busy).toBe(false));

    expect(harness.recorded.quickPicks[0]).toMatchObject({
      title: "Go to Aurelia Resource — incomplete",
      items: [expect.objectContaining({ label: "product-card" })],
      buttons: [{ tooltip: "Open Aurelia Output" }],
    });
    expect(harness.recorded.errorMessageRequests).toEqual([]);
    harness.recorded.quickPicks[0]!.hide();
    await command;
  });

  test("keeps unsupported inventory distinct from a genuine complete empty result", async () => {
    const unsupportedHarness = createHarness({ inventory: inventoryWithAnswerResult("unsupported") });
    const unsupportedCommand = unsupportedHarness.recorded.commandHandlers.get(AureliaCommand.GoToResource)?.();
    await vi.waitFor(() => expect(unsupportedHarness.recorded.quickPicks[0]?.busy).toBe(false));

    expect(unsupportedHarness.recorded.quickPicks[0]).toMatchObject({
      title: "Aurelia resource discovery isn't supported for the active projects",
      placeholder: "No supported Aurelia resource inventory is available for these projects",
      items: [],
      buttons: [{ tooltip: "Open Aurelia Output" }],
    });
    expect(unsupportedHarness.recorded.errorMessageRequests).toEqual([]);
    unsupportedHarness.recorded.quickPicks[0]!.hide();
    await unsupportedCommand;

    const emptyHarness = createHarness({ inventory: inventory([]) });
    const emptyCommand = emptyHarness.recorded.commandHandlers.get(AureliaCommand.GoToResource)?.();
    await vi.waitFor(() => expect(emptyHarness.recorded.quickPicks[0]?.busy).toBe(false));

    expect(emptyHarness.recorded.quickPicks[0]).toMatchObject({
      title: "Go to Aurelia Resource",
      placeholder: "No navigable supported resources were discovered",
      items: [],
      buttons: [],
    });
    emptyHarness.recorded.quickPicks[0]!.hide();
    await emptyCommand;

    const openEmpty = exactAvailability();
    openEmpty.projectSelection.answer.coverage = "open";
    openEmpty.projectSelection.resources = [];
    openEmpty.projectSelection.completeness.openVisibility = 1;
    const openHarness = createHarness({ availability: () => openEmpty });
    const openCommand = openHarness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(openHarness.recorded.quickPicks[0]?.busy).toBe(false));
    expect(openHarness.recorded.quickPicks[0]).toMatchObject({
      title: "Resources available to my-app — shop-app · repo · src/my-app.html · line 4, column 3 — incomplete",
      placeholder: "No navigable supported resource rows are currently known; discovery is incomplete for my-app",
      items: [],
      buttons: [{ tooltip: "Open Aurelia Output" }],
    });
    openHarness.recorded.quickPicks[0]!.hide();
    await openCommand;
  });

  test("makes owner and incomplete metadata searchable in the workspace picker", async () => {
    const headerOnly = {
      ...resource(),
      metadataState: "header-only",
      aliases: [],
      bindables: [],
    };
    const harness = createHarness({ inventory: inventory([headerOnly]) });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));

    const item = visibleQuickPickItems(harness.recorded.quickPicks[0]!)[0];
    expect(item?.detail).toContain("workspace: shop · project: shop-app");
    expect(item?.detail).toContain("details incomplete");
    harness.recorded.quickPicks[0]!.hide();
    await command;
  });

  test("maps every project shape to closed author-facing chooser copy", async () => {
    const shapes = [
      ["aurelia-app", "Aurelia application"],
      ["aurelia-resource-library", "Aurelia resource library"],
      ["aurelia-package", "Aurelia package"],
      ["non-aurelia", "Project without an Aurelia entry point"],
    ] as const;
    const harness = createHarness({
      availability: () => ({
        fingerprint: "semantic-runtime:one",
        workspace: owner,
        projectSelection: {
          status: "ambiguous",
          candidates: shapes.map(([shapeKind], index) => ({
            ...project,
            projectKey: `project-${index}`,
            rootUri: `file:///repo/project-${index}`,
            shapeKind,
          })),
        },
      }),
    });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(4));

    expect(visibleQuickPickItems(harness.recorded.quickPicks[0]!).map((item) => item.description)).toEqual(
      shapes.map(([, label]) => label),
    );
    const visibleCopy = visibleQuickPickItems(harness.recorded.quickPicks[0]!).map((item) => [
      item.label,
      item.description,
      item.detail,
    ]);
    expect(JSON.stringify(visibleCopy)).not.toContain("aurelia-app");
    expect(new Set(visibleCopy.map(([, , detail]) => detail)).size).toBe(4);
    expect(JSON.stringify(visibleCopy)).not.toContain("file:///");
    harness.recorded.quickPicks[0]!.hide();
    await command;
  });

  test("keeps ambiguous remote project roots short and visibly distinct", async () => {
    const roots = [
      "vscode-remote://ssh-one/home/team/storefront",
      "vscode-remote://ssh-two/home/team/storefront",
    ];
    const harness = createHarness({
      availability: () => ({
        fingerprint: "semantic-runtime:one",
        workspace: owner,
        projectSelection: {
          status: "ambiguous",
          candidates: roots.map((rootUri, index) => ({
            ...project,
            projectKey: `storefront-${index + 1}`,
            rootUri,
          })),
        },
      }),
    });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(2));
    const details = visibleQuickPickItems(harness.recorded.quickPicks[0]!).map((item) => item.detail);

    expect(details).toEqual(["ssh-one · storefront", "ssh-two · storefront"]);
    expect(JSON.stringify(details)).not.toContain("vscode-remote://");
    expect(JSON.stringify(details)).not.toContain("/home/team/");
    harness.recorded.quickPicks[0]!.hide();
    await command;
  });

  test("uses stable public ordinals for ambiguous equal projects with the same root suffix", async () => {
    const roots = ["file:///z/a/shop", "file:///x/a/shop"];
    const harness = createHarness({
      availability: () => ({
        fingerprint: "semantic-runtime:one",
        workspace: owner,
        projectSelection: {
          status: "ambiguous",
          candidates: roots.map((rootUri) => ({ ...project, projectKey: "shop-app", rootUri })),
        },
      }),
    });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(2));
    const items = visibleQuickPickItems(harness.recorded.quickPicks[0]!);

    expect(items.map((item) => item.label)).toEqual(["shop-app", "shop-app"]);
    expect(items.map((item) => item.detail)).toEqual([
      "a/shop · project 1 of 2",
      "a/shop · project 2 of 2",
    ]);
    expect(JSON.stringify(items.map(({ label, description, detail }) => ({ label, description, detail }))))
      .not.toMatch(/file:\/\/\/|\/x\/|\/z\//u);
    harness.recorded.quickPicks[0]!.hide();
    await command;
  });

  test("fails closed when project ambiguity has no selectable candidates", async () => {
    const harness = createHarness({
      availability: () => ({
        fingerprint: "semantic-runtime:one",
        workspace: owner,
        projectSelection: { status: "ambiguous", candidates: [] },
      }),
    });

    await harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();

    expect(harness.recorded.errorMessageRequests).toEqual([{
      message: "Aurelia resource discovery couldn't load resources for the active template.",
      items: ["Retry", "Open Aurelia Output"],
    }]);
    expect(JSON.stringify(harness.recorded.errorMessageRequests)).not.toMatch(/ambiguous|summary|semantic-runtime/iu);
    expect(harness.recorded.openedDocuments).toEqual([]);
  });

  test.each(["failed", "invalid"] as const)(
    "treats a semantic %s availability answer as an actionable total failure",
    async (result) => {
      const failed = availabilityWithAnswerResult(result);
      const harness = createHarness({
        availability: vi.fn()
          .mockReturnValueOnce(failed)
          .mockReturnValueOnce(exactAvailability()),
        errorMessageResponses: ["Retry"],
      });

      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
      await vi.waitFor(() => expect(harness.recorded.errorMessageRequests).toHaveLength(1));
      await vi.waitFor(() => expect(harness.recorded.quickPicks[1]?.items).toHaveLength(1));

      expect(harness.recorded.errorMessageRequests[0]).toEqual({
        message: "Aurelia resource discovery couldn't load resources for the active template.",
        items: ["Retry", "Open Aurelia Output"],
      });
      expect(JSON.stringify(harness.recorded.errorMessageRequests)).not.toContain("semantic-detail");
      harness.recorded.quickPicks[1]!.hide();
      await command;
    },
  );

  test("keeps unsupported availability distinct from exact empty availability", async () => {
    const unsupportedHarness = createHarness({
      availability: () => availabilityWithAnswerResult("unsupported"),
    });
    const unsupportedCommand = unsupportedHarness.recorded.commandHandlers.get(
      AureliaCommand.GoToAvailableResource,
    )?.();
    await vi.waitFor(() => expect(unsupportedHarness.recorded.quickPicks[0]?.busy).toBe(false));

    expect(unsupportedHarness.recorded.quickPicks[0]).toMatchObject({
      title: "Resource discovery isn't supported for this template",
      placeholder: "Aurelia can't inspect available resources for this template",
      items: [],
      buttons: [{ tooltip: "Open Aurelia Output" }],
    });
    unsupportedHarness.recorded.quickPicks[0]!.hide();
    await unsupportedCommand;

    const empty = exactAvailability();
    empty.projectSelection.resources = [];
    const emptyHarness = createHarness({ availability: () => empty });
    const emptyCommand = emptyHarness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(emptyHarness.recorded.quickPicks[0]?.busy).toBe(false));

    expect(emptyHarness.recorded.quickPicks[0]).toMatchObject({
      title: "Resources available to my-app — shop-app · repo · src/my-app.html · line 4, column 3",
      placeholder: "No navigable supported resources are available to my-app",
      items: [],
      buttons: [],
    });
    emptyHarness.recorded.quickPicks[0]!.hide();
    await emptyCommand;
  });

  test.each([
    ["absent", "No Aurelia template at the cursor", "Move the cursor into an analyzed Aurelia template and try again"],
    ["not-applicable", "Resource availability doesn't apply at this cursor", "Open an analyzed Aurelia template and try again"],
    ["rerouted", "This template needs a different Aurelia project", "Run the command again from an analyzed template in the intended project"],
  ] as const)("uses closed copy for %s template selection", async (selection, title, placeholder) => {
    const harness = createHarness({ availability: () => availabilityWithSelection(selection) });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.busy).toBe(false));

    expect(harness.recorded.quickPicks[0]).toMatchObject({ title, placeholder, items: [], buttons: [] });
    expect(JSON.stringify(harness.recorded.quickPicks[0])).not.toContain("compiler scope");
    harness.recorded.quickPicks[0]!.hide();
    await command;
  });

  test("mentions Back for rerouting only after a real project choice", async () => {
    const availability = vi.fn((_uri, _position, projectKey) => projectKey == null
      ? {
          fingerprint: "semantic-runtime:one",
          workspace: owner,
          projectSelection: { status: "ambiguous", candidates: [project] },
        }
      : availabilityWithSelection("rerouted"));
    const harness = createHarness({ availability });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
    harness.recorded.quickPicks[0]!.accept(0);
    await vi.waitFor(() => expect(harness.recorded.quickPicks[1]?.busy).toBe(false));

    expect(harness.recorded.quickPicks[1]?.placeholder).toBe(
      "Go Back and choose a current project, or run the command again",
    );
    harness.recorded.quickPicks[1]!.hide();
    await command;
  });

  test("treats an impossible exact template answer as an operational failure", async () => {
    const response = exactAvailability();
    const impossible = {
      ...response,
      projectSelection: {
        ...response.projectSelection,
        selectedTemplate: null,
        resources: [],
      },
    };
    const harness = createHarness({ availability: () => impossible });

    await harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();

    expect(harness.recorded.errorMessageRequests).toEqual([{
      message: "Aurelia resource discovery couldn't load resources for the active template.",
      items: ["Retry", "Open Aurelia Output"],
    }]);
    expect(JSON.stringify(harness.recorded.errorMessageRequests)).not.toContain("without a template");
  });

  test("makes owner and incomplete metadata searchable in the active-template picker", async () => {
    const response = exactAvailability();
    response.projectSelection.resources[0]!.resource.metadataState = "visibility-only";
    response.projectSelection.resources[0]!.resource.aliases = [];
    response.projectSelection.resources[0]!.resource.bindables = [];
    const harness = createHarness({ availability: () => response });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));

    const item = visibleQuickPickItems(harness.recorded.quickPicks[0]!)[0];
    expect(item?.detail).toContain("workspace: shop · project: shop-app");
    expect(item?.detail).toContain("declaration not resolved");
    harness.recorded.quickPicks[0]!.hide();
    await command;
  });

  test("retains and visibly distinguishes canonical, alias, package, project, and kind collisions", async () => {
    const fixture = collisionFixture();
    const inventoryHarness = createHarness({ inventory: fixture.inventoryResponse });

    const inventoryCommand = inventoryHarness.recorded.commandHandlers.get(AureliaCommand.GoToResource)?.();
    await vi.waitFor(() => expect(inventoryHarness.recorded.quickPicks[0]?.items).toHaveLength(4));
    const inventoryItems = visibleQuickPickItems(inventoryHarness.recorded.quickPicks[0]!);
    expect(inventoryItems.every((item) => item.label === "shared-card")).toBe(true);
    expect(inventoryItems.every((item) => item.detail?.includes("aliases: shared-alias") === true)).toBe(true);
    expect(inventoryItems.every((item) => item.detail?.includes("workspace: shop · project:") === true)).toBe(true);
    expect(new Set(inventoryItems.map((item) => `${item.description}|${item.detail}`))).toHaveProperty("size", 4);
    expect(inventoryHarness.recorded.openedDocuments).toEqual([]);

    const packageIndex = inventoryItems.findIndex((item) =>
      item.navigation?.resourceIdentityKey === "collision:package"
    );
    expect(packageIndex).toBeGreaterThanOrEqual(0);
    inventoryHarness.recorded.quickPicks[0]!.accept(packageIndex);
    await inventoryCommand;
    expect(inventoryHarness.recorded.openedDocuments.at(-1)?.uri.toString()).toBe(
      "file:///repo/node_modules/@acme/ui/shared-card.ts",
    );

    const availabilityHarness = createHarness({ availability: () => fixture.availabilityResponse });
    const availabilityCommand = availabilityHarness.recorded.commandHandlers.get(
      AureliaCommand.GoToAvailableResource,
    )?.();
    await vi.waitFor(() => expect(availabilityHarness.recorded.quickPicks[0]?.items).toHaveLength(3));
    const availabilityItems = visibleQuickPickItems(availabilityHarness.recorded.quickPicks[0]!);
    expect(availabilityItems.every((item) => item.label === "shared-card")).toBe(true);
    expect(availabilityItems.every((item) => item.detail?.includes("aliases: shared-alias") === true)).toBe(true);
    expect(new Set(availabilityItems.map((item) => `${item.description}|${item.detail}`))).toHaveProperty("size", 3);
    expect(availabilityHarness.recorded.openedDocuments).toEqual([]);
    availabilityHarness.recorded.quickPicks[0]!.hide();
    await availabilityCommand;
  });

  test("uses peer-minimal source and ownership scent for identical Quick Pick rows", async () => {
    const leftProject = { ...project, projectKey: "app", rootUri: "file:///x/a/shop" };
    const rightProject = { ...project, projectKey: "app", rootUri: "file:///z/a/shop" };
    const left = collisionResource(
      "same-tail:left",
      leftProject,
      "file:///x/a/shop/src/shared.ts",
      "src/shared.ts@10..20",
    );
    const right = collisionResource(
      "same-tail:right",
      rightProject,
      "file:///z/a/shop/src/shared.ts",
      "src/shared.ts@10..20",
    );
    const inventoryResponse = {
      workspaces: [{
        ...owner,
        key: "file:///x/a/shop",
        name: "shop",
        uri: "file:///x/a/shop",
        status: "ready",
        response: {
          fingerprint: "left",
          projects: [readyInventoryProject(leftProject, [left])],
        },
      }, {
        ...owner,
        key: "file:///z/a/shop",
        name: "shop",
        uri: "file:///z/a/shop",
        status: "ready",
        response: {
          fingerprint: "right",
          projects: [readyInventoryProject(rightProject, [right])],
        },
      }],
    };
    const inventoryHarness = createHarness({ inventory: inventoryResponse });
    const inventoryCommand = inventoryHarness.recorded.commandHandlers.get(AureliaCommand.GoToResource)?.();
    await vi.waitFor(() => expect(inventoryHarness.recorded.quickPicks[0]?.items).toHaveLength(2));
    const inventoryItems = visibleQuickPickItems(inventoryHarness.recorded.quickPicks[0]!);

    expect(inventoryItems.map((item) => item.label)).toEqual(["shared-card", "shared-card"]);
    expect(new Set(inventoryItems.map((item) => item.description)).size).toBe(2);
    expect(new Set(inventoryItems.map((item) => item.detail)).size).toBe(2);
    expect(new Set(inventoryItems.map((item) => item.navigation?.resourceIdentityKey)).size).toBe(2);
    expect(JSON.stringify(inventoryItems.map(({ label, description, detail }) => ({ label, description, detail }))))
      .not.toMatch(/file:\/\/\/|same-tail:|\/x\/a\/shop|\/z\/a\/shop/iu);
    inventoryHarness.recorded.quickPicks[0]!.hide();
    await inventoryCommand;

    const availability = exactAvailability();
    const sameProjectLeft = collisionResource(
      "availability-tail:left",
      project,
      "file:///x/a/shared.ts",
      "src/shared.ts@10..20",
    );
    const sameProjectRight = collisionResource(
      "availability-tail:right",
      project,
      "file:///z/a/shared.ts",
      "src/shared.ts@10..20",
    );
    availability.projectSelection.resources = [sameProjectLeft, sameProjectRight].map((candidate) => ({
      resource: candidate,
      state: "available",
      visibilityKind: "configured",
      availabilitySource: available("file:///repo/src/main.ts", "src/main.ts@1..2"),
    }));
    const availabilityHarness = createHarness({ availability: () => availability });
    const availabilityCommand = availabilityHarness.recorded.commandHandlers.get(
      AureliaCommand.GoToAvailableResource,
    )?.();
    await vi.waitFor(() => expect(availabilityHarness.recorded.quickPicks[0]?.items).toHaveLength(2));
    const availabilityItems = visibleQuickPickItems(availabilityHarness.recorded.quickPicks[0]!);

    expect(availabilityItems.map((item) => item.label)).toEqual(["shared-card", "shared-card"]);
    expect(new Set(availabilityItems.map((item) => item.description)).size).toBe(2);
    expect(new Set(availabilityItems.map((item) => item.detail)).size).toBe(2);
    expect(JSON.stringify(availabilityItems.map(({ label, description, detail }) => ({ label, description, detail }))))
      .not.toMatch(/file:\/\/\/|availability-tail:|@10\.\.20/iu);
    availabilityHarness.recorded.quickPicks[0]!.hide();
    await availabilityCommand;
  });

  test("active-template navigation resolves project then template ambiguity without unioning", async () => {
    const availability = vi.fn(stagedAvailability);
    const harness = createHarness({ availability });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(2));
    expect(harness.recorded.quickPicks[0]).toMatchObject({ step: 1, totalSteps: 2 });
    acceptQuickPickLabel(harness.recorded.quickPicks[0]!, "shop-app");
    await vi.waitFor(() => expect(harness.recorded.quickPicks[1]?.items).toHaveLength(2));
    expect(harness.recorded.quickPicks[1]).toMatchObject({ step: 2, totalSteps: 3 });
    acceptQuickPickLabel(harness.recorded.quickPicks[1]!, "my-app");
    await vi.waitFor(() => expect(harness.recorded.quickPicks[2]?.items).toHaveLength(1));
    expect(harness.recorded.quickPicks[2]).toMatchObject({ step: 3, totalSteps: 3 });
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

  test("retains the exact chosen template context in the final resource step", async () => {
    const first = {
      ...exactAvailability(),
      projectSelection: {
        ...exactAvailability().projectSelection,
        answer: { ...exactAvailability().projectSelection.answer, selection: "ambiguous" },
        selectedTemplate: null,
        templateCandidates: [{
          templateIdentityKey: "template:same:first",
          scopeIdentityKey: "scope:same:first",
          definitionName: "same-card",
          compilationLane: "authoring",
          source: available("file:///repo/src/same.html", "template", 1, "src/same.html@1..2"),
        }, {
          templateIdentityKey: "template:same:second",
          scopeIdentityKey: "scope:same:second",
          definitionName: "same-card",
          compilationLane: "authoring",
          source: available("file:///repo/src/same.html", "template", 8, "src/same.html@3..4"),
        }],
        resources: [],
      },
    };
    const selected = exactAvailability();
    selected.projectSelection.selectedTemplate = first.projectSelection.templateCandidates[1] as never;
    const availability = vi.fn((_uri, _position, _projectKey, scopeIdentityKey) =>
      scopeIdentityKey == null ? first : selected);
    const harness = createHarness({ availability });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(2));
    harness.recorded.quickPicks[0]!.accept(1);
    await vi.waitFor(() => expect(harness.recorded.quickPicks[1]?.items).toHaveLength(1));

    expect(harness.recorded.quickPicks[1]?.title).toBe(
      "Resources available to same-card — shop-app · repo · src/same.html · line 9, column 3",
    );
    expect(harness.recorded.quickPicks[1]?.title).not.toMatch(/scope:|template:|file:\/\/\//u);
    harness.recorded.quickPicks[1]!.accept(0);
    await command;
    expect(harness.recorded.openedDocuments).toHaveLength(1);
  });

  test("visibly distinguishes ambiguous templates by exact range then stable public ordinal", async () => {
    const response = exactAvailability();
    response.projectSelection.answer.selection = "ambiguous";
    response.projectSelection.selectedTemplate = null as never;
    response.projectSelection.resources = [];
    response.projectSelection.templateCandidates = [{
      templateIdentityKey: "template:range:first",
      scopeIdentityKey: "scope:range:first",
      definitionName: "range-card",
      compilationLane: "authoring",
      source: available("file:///repo/src/shared.html", "template", 1, "src/shared.html@1..2"),
    }, {
      templateIdentityKey: "template:range:second",
      scopeIdentityKey: "scope:range:second",
      definitionName: "range-card",
      compilationLane: "authoring",
      source: available("file:///repo/src/shared.html", "template", 8, "src/shared.html@1..2"),
    }, {
      templateIdentityKey: "template:duplicate:first",
      scopeIdentityKey: "scope:duplicate:first",
      definitionName: "duplicate-card",
      compilationLane: "app-runtime",
      source: available("file:///repo/src/shared.html", "template", 12, "src/shared.html@1..2"),
    }, {
      templateIdentityKey: "template:duplicate:second",
      scopeIdentityKey: "scope:duplicate:second",
      definitionName: "duplicate-card",
      compilationLane: "app-runtime",
      source: available("file:///repo/src/shared.html", "template", 12, "src/shared.html@1..2"),
    }];
    const harness = createHarness({ availability: () => response });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(4));
    const items = visibleQuickPickItems(harness.recorded.quickPicks[0]!);
    const rangeItems = items.filter((item) => item.label === "range-card");
    const duplicateItems = items.filter((item) => item.label === "duplicate-card");

    expect(new Set(rangeItems.map((item) => `${item.description}|${item.detail}`)).size).toBe(2);
    expect(rangeItems.map((item) => item.detail).join(" ")).toMatch(/line 2, column 3.*line 9, column 3/iu);
    expect(new Set(duplicateItems.map((item) => `${item.description}|${item.detail}`)).size).toBe(2);
    expect(duplicateItems.map((item) => item.description).join(" ")).toMatch(/entry 1 of 2.*entry 2 of 2/iu);
    expect(JSON.stringify(items.map(({ label, description, detail }) => ({ label, description, detail }))))
      .not.toMatch(/scope:|template:|file:\/\/\/|@1\.\.2/iu);
    harness.recorded.quickPicks[0]!.hide();
    await command;
  });

  test("shows bounded project, root, and source context for every ambiguous template candidate", async () => {
    const response = exactAvailability();
    response.projectSelection.answer.selection = "ambiguous";
    response.projectSelection.selectedTemplate = null as never;
    response.projectSelection.resources = [];
    response.projectSelection.templateCandidates = [{
      templateIdentityKey: "template:ordinary",
      scopeIdentityKey: "scope:ordinary",
      definitionName: "ordinary-card",
      compilationLane: "app-runtime",
      source: available("file:///private/repo/src/ordinary.html", "template", 5, "src/ordinary.html@50..70"),
    }, {
      templateIdentityKey: "template:no-source",
      scopeIdentityKey: "scope:no-source",
      definitionName: "generated-card",
      compilationLane: "authoring",
      source: absent(),
    }];
    const harness = createHarness({ availability: () => response });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(2));
    const items = visibleQuickPickItems(harness.recorded.quickPicks[0]!);

    expect(items.find((item) => item.label === "ordinary-card")?.detail).toBe(
      "shop-app · repo · src/ordinary.html · line 6, column 3",
    );
    expect(items.find((item) => item.label === "generated-card")?.detail).toBe(
      "shop-app · repo · source unavailable",
    );
    expect(JSON.stringify(items.map(({ label, description, detail }) => ({ label, description, detail }))))
      .not.toMatch(/file:\/\/\/|template:|scope:|private|@50\.\.70/iu);
    harness.recorded.quickPicks[0]!.hide();
    await command;
  });

  test("returns through resource and template Back steps before cancelling silently", async () => {
    const availability = vi.fn(stagedAvailability);
    const harness = createHarness({ availability });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(2));
    acceptQuickPickLabel(harness.recorded.quickPicks[0]!, "shop-app");
    await vi.waitFor(() => expect(harness.recorded.quickPicks[1]?.items).toHaveLength(2));
    acceptQuickPickLabel(harness.recorded.quickPicks[1]!, "my-app");
    await vi.waitFor(() => expect(harness.recorded.quickPicks[2]?.items).toHaveLength(1));

    harness.recorded.quickPicks[2]!.back();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[3]?.items).toHaveLength(2));
    expect(harness.recorded.quickPicks[3]).toMatchObject({ step: 2, totalSteps: 3 });
    harness.recorded.quickPicks[3]!.back();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[4]?.items).toHaveLength(2));
    expect(harness.recorded.quickPicks[4]).toMatchObject({ step: 1, totalSteps: 2 });
    harness.recorded.quickPicks[4]!.hide();
    await command;

    expect(availability.mock.calls.map((call) => call.slice(2, 4))).toEqual([
      [undefined, undefined],
      ["shop-app", undefined],
      ["shop-app", "scope:first"],
      ["shop-app", undefined],
      [undefined, undefined],
    ]);
    expect(harness.recorded.errorMessages).toEqual([]);
    expect(harness.recorded.openedDocuments).toHaveLength(0);
  });

  test.each(["project", "template", "resource"] as const)(
    "cancels silently from the %s availability phase",
    async (phase) => {
      const harness = createHarness({ availability: vi.fn(stagedAvailability) });

      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(2));
      if (phase !== "project") {
        acceptQuickPickLabel(harness.recorded.quickPicks[0]!, "shop-app");
        await vi.waitFor(() => expect(harness.recorded.quickPicks[1]?.items).toHaveLength(2));
      }
      if (phase === "resource") {
        acceptQuickPickLabel(harness.recorded.quickPicks[1]!, "my-app");
        await vi.waitFor(() => expect(harness.recorded.quickPicks[2]?.items).toHaveLength(1));
      }
      const pickerIndex = phase === "project" ? 0 : phase === "template" ? 1 : 2;
      harness.recorded.quickPicks[pickerIndex]!.hide();
      await command;

      expect(harness.recorded.errorMessageRequests).toEqual([]);
      expect(harness.recorded.openedDocuments).toEqual([]);
    },
  );

  test("separates uncertain availability and publishes author-facing searchable state", async () => {
    const response = exactAvailability();
    response.projectSelection.answer.coverage = "open";
    response.projectSelection.resources = [
      ...response.projectSelection.resources,
      {
        resource: resource("uncertain-card"),
        state: "available",
        visibilityKind: "open",
        availabilitySource: available("file:///repo/src/main.ts", "availability"),
      },
    ];
    const harness = createHarness({ availability: () => response });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(3));

    expect(harness.recorded.quickPicks[0]).toMatchObject({
      title: "Resources available to my-app — shop-app · repo · src/my-app.html · line 4, column 3 — incomplete",
      step: 1,
      totalSteps: 1,
      buttons: [{ tooltip: "Open Aurelia Output" }],
      items: [
        expect.objectContaining({
          label: "product-card",
          description: "available · application root · element · project",
          detail: expect.stringContaining("bindables: labelText/display-label"),
        }),
        { kind: -1, label: "Availability uncertain", selectionKind: "separator" },
        expect.objectContaining({
          label: "uncertain-card",
          description: "availability uncertain · element · project",
        }),
      ],
    });
    const visibleItemCopy = harness.recorded.quickPicks[0]?.items.map((item) => {
      const visible = item as { readonly label?: string; readonly description?: string; readonly detail?: string };
      return [visible.label, visible.description, visible.detail];
    });
    expect(JSON.stringify(visibleItemCopy)).not.toContain("app-root");

    harness.recorded.quickPicks[0]!.triggerButton(0);
    expect(harness.recorded.shownOutputChannels).toEqual([{ name: "test", preserveFocus: true }]);
    expect(harness.recorded.quickPicks[0]?.visible).toBe(true);
    harness.recorded.quickPicks[0]!.hide();
    await command;
  });

  test("revalidates the exact selected scope after a navigation Retry", async () => {
    const initial = exactAvailability();
    const fresh = exactAvailability();
    const removed = exactAvailability();
    removed.projectSelection.resources = [];
    const availability = vi.fn()
      .mockReturnValueOnce(initial)
      .mockReturnValueOnce(fresh)
      .mockReturnValueOnce(removed);
    const harness = createHarness({
      availability,
      errorMessageResponses: ["Retry"],
    });
    harness.getResourceInventory.mockRejectedValueOnce(new Error("transient inventory failure"));

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
    harness.recorded.quickPicks[0]!.accept(0);
    await command;

    expect(availability.mock.calls.map((call) => call.slice(2, 4))).toEqual([
      [undefined, undefined],
      ["shop-app", "scope:my-app:v1"],
      ["shop-app", "scope:my-app:v1"],
    ]);
    expect(harness.recorded.errorMessageRequests).toEqual([{
      message: "Aurelia couldn't open the selected resource.",
      items: ["Retry", "Open Aurelia Output"],
    }]);
    expect(harness.recorded.infoMessages).toContain(
      "That resource is no longer available to the current template scope.",
    );
    expect(harness.recorded.openedDocuments).toEqual([]);
  });

  test("silently re-proves availability after an inventory fingerprint shift and refuses a removed row", async () => {
    const observations = captureExtensionHostObservations();
    try {
      const initial = exactAvailability();
      initial.fingerprint = "semantic-runtime:f1";
      const freshF1 = exactAvailability();
      freshF1.fingerprint = "semantic-runtime:f1";
      const freshF2 = exactAvailability();
      freshF2.fingerprint = "semantic-runtime:f2";
      freshF2.projectSelection.resources = [];
      const availability = vi.fn()
        .mockReturnValueOnce(initial)
        .mockReturnValueOnce(freshF1)
        .mockReturnValueOnce(freshF2);
      const harness = createHarness({ availability });
      harness.getResourceInventory.mockResolvedValue(inventory([resource()], "complete", "semantic-runtime:f2"));

      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
      harness.recorded.quickPicks[0]!.accept(0);
      await command;

      expect(availability).toHaveBeenCalledTimes(3);
      expect(harness.getResourceInventory).toHaveBeenCalledOnce();
      expect(harness.recorded.errorMessageRequests).toEqual([]);
      const message = "That resource is no longer available to the current template scope.";
      expect(harness.recorded.infoMessages).toContain(message);
      const events = commandObservations(observations.events);
      expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({
          phase: "navigation-stale-retry",
          currentFingerprint: "semantic-runtime:f2",
          resourcePresence: "present",
        }),
        expect.objectContaining({
          phase: "refused",
          category: "availability-changed",
          currentFingerprint: "semantic-runtime:f2",
          editorUnchanged: true,
          message,
          resourcePresence: "present",
        }),
      ]));
      expect(events.findIndex((event) => event.phase === "refused")).toBeGreaterThan(
        events.findLastIndex((event) => event.phase === "revalidation"),
      );
      expect(harness.recorded.openedDocuments).toEqual([]);
    } finally {
      observations.dispose();
    }
  });

  test.each([
    ["absent", "complete", "resource-removed", "That resource is no longer available to the current template scope."],
    ["unconfirmed", "open", "unconfirmed", "That resource is no longer available to the current template scope."],
  ] as const)(
    "classifies a fresh complete missing row from neutral inventory evidence: %s",
    async (resourcePresence, inventoryCoverage, category, message) => {
      const observations = captureExtensionHostObservations();
      try {
        const initial = exactAvailability();
        initial.fingerprint = "semantic-runtime:f1";
        const freshF1 = exactAvailability();
        freshF1.fingerprint = "semantic-runtime:f1";
        const freshF2 = exactAvailability();
        freshF2.fingerprint = "semantic-runtime:f2";
        freshF2.projectSelection.resources = [];
        const availability = vi.fn()
          .mockReturnValueOnce(initial)
          .mockReturnValueOnce(freshF1)
          .mockReturnValueOnce(freshF2);
        const harness = createHarness({ availability });
        harness.getResourceInventory.mockResolvedValue(inventory([], inventoryCoverage, "semantic-runtime:f2"));

        const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
        await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
        harness.recorded.quickPicks[0]!.accept(0);
        await command;

        expect(availability).toHaveBeenCalledTimes(3);
        expect(harness.recorded.openedDocuments).toEqual([]);
        expect(harness.recorded.infoMessages).toContain(message);
        expect(commandObservations(observations.events)).toEqual(expect.arrayContaining([
          expect.objectContaining({
            phase: "navigation-stale-retry",
            currentFingerprint: "semantic-runtime:f2",
            resourcePresence,
          }),
          expect.objectContaining({
            phase: "refused",
            category,
            currentFingerprint: "semantic-runtime:f2",
            editorUnchanged: true,
            message,
            resourcePresence,
          }),
        ]));
      } finally {
        observations.dispose();
      }
    },
  );

  test("keeps exact public refusal copy identical with host observations on and off", async () => {
    const runRemoval = async () => {
      const initial = exactAvailability();
      initial.fingerprint = "semantic-runtime:f1";
      const freshF1 = exactAvailability();
      freshF1.fingerprint = "semantic-runtime:f1";
      const freshF2 = exactAvailability();
      freshF2.fingerprint = "semantic-runtime:f2";
      freshF2.projectSelection.resources = [];
      const availability = vi.fn()
        .mockReturnValueOnce(initial)
        .mockReturnValueOnce(freshF1)
        .mockReturnValueOnce(freshF2);
      const harness = createHarness({ availability });
      harness.getResourceInventory.mockResolvedValue(
        inventory([], "complete", "semantic-runtime:f2"),
      );

      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
      harness.recorded.quickPicks[0]!.accept(0);
      await command;
      expect(harness.recorded.openedDocuments).toEqual([]);
      return harness.recorded.infoMessages.at(-1);
    };

    const previousObservation = process.env.AURELIA_LS_EXTENSION_HOST_OBSERVATION;
    const previousAcceptance = process.env.AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE;
    const events: ExtensionHostObservation[] = [];
    const listener = (event: ExtensionHostObservation): void => { events.push(event); };
    delete process.env.AURELIA_LS_EXTENSION_HOST_OBSERVATION;
    delete process.env.AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE;
    process.on(EXTENSION_HOST_OBSERVATION_EVENT, listener);
    let gateOffMessage: string | undefined;
    try {
      gateOffMessage = await runRemoval();
      expect(commandObservations(events)).toEqual([]);
    } finally {
      process.off(EXTENSION_HOST_OBSERVATION_EVENT, listener);
      if (previousObservation == null) delete process.env.AURELIA_LS_EXTENSION_HOST_OBSERVATION;
      else process.env.AURELIA_LS_EXTENSION_HOST_OBSERVATION = previousObservation;
      if (previousAcceptance == null) delete process.env.AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE;
      else process.env.AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE = previousAcceptance;
    }

    const observations = captureExtensionHostObservations();
    try {
      const gateOnMessage = await runRemoval();
      expect(gateOnMessage).toBe(gateOffMessage);
      expect(gateOnMessage).toBe(
        "That resource is no longer available to the current template scope.",
      );
      expect(commandObservations(observations.events)).toContainEqual(expect.objectContaining({
        phase: "refused",
        category: "resource-removed",
        message: gateOnMessage,
      }));
    } finally {
      observations.dispose();
    }
  });

  test("does not consume F2 presence evidence when fresh exact-scope reproof advances to F3", async () => {
    const observations = captureExtensionHostObservations();
    try {
      const initial = exactAvailability();
      initial.fingerprint = "semantic-runtime:f1";
      const freshF1 = exactAvailability();
      freshF1.fingerprint = "semantic-runtime:f1";
      const freshF3 = exactAvailability();
      freshF3.fingerprint = "semantic-runtime:f3";
      freshF3.projectSelection.resources = [];
      const availability = vi.fn()
        .mockReturnValueOnce(initial)
        .mockReturnValueOnce(freshF1)
        .mockReturnValueOnce(freshF3);
      const harness = createHarness({ availability });
      harness.getResourceInventory.mockResolvedValue(
        inventory([resource()], "complete", "semantic-runtime:f2"),
      );

      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
      harness.recorded.quickPicks[0]!.accept(0);
      await command;

      expect(harness.recorded.openedDocuments).toEqual([]);
      expect(commandObservations(observations.events)).toEqual(expect.arrayContaining([
        expect.objectContaining({
          phase: "navigation-stale-retry",
          currentFingerprint: "semantic-runtime:f2",
          resourcePresence: "present",
        }),
        expect.objectContaining({
          phase: "refused",
          category: "unconfirmed",
          currentFingerprint: "semantic-runtime:f3",
          editorUnchanged: true,
          message: "That resource is no longer available to the current template scope.",
          resourcePresence: "unconfirmed",
        }),
      ]));
    } finally {
      observations.dispose();
    }
  });

  test("re-proves and opens a still-available row after a strict snapshot shift", async () => {
    const observations = captureExtensionHostObservations();
    try {
      const initial = exactAvailability();
      initial.fingerprint = "semantic-runtime:f1";
      const freshF1 = exactAvailability();
      freshF1.fingerprint = "semantic-runtime:f1";
      const freshF2 = exactAvailability();
      freshF2.fingerprint = "semantic-runtime:f2";
      const availability = vi.fn()
        .mockReturnValueOnce(initial)
        .mockReturnValueOnce(freshF1)
        .mockReturnValueOnce(freshF2);
      const harness = createHarness({ availability });
      harness.getResourceInventory.mockResolvedValue(inventory([resource()], "complete", "semantic-runtime:f2"));

      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
      harness.recorded.quickPicks[0]!.accept(0);
      await command;

      expect(availability).toHaveBeenCalledTimes(3);
      expect(harness.getResourceInventory).toHaveBeenCalledTimes(2);
      expect(harness.recorded.errorMessageRequests).toEqual([]);
      expect(harness.recorded.openedDocuments.at(-1)?.uri.toString()).toBe(
        "file:///repo/src/product-card.ts",
      );
      expect(commandObservations(observations.events)).toEqual(expect.arrayContaining([
        expect.objectContaining({ phase: "navigation-stale-retry", status: "stale" }),
      ]));
    } finally {
      observations.dispose();
    }
  });

  test("re-enters discovery when fresh availability moves to a different workspace or project", async () => {
    const initial = exactAvailability();
    const moved = exactAvailability();
    moved.workspace = { key: "workspace:other", name: "other", uri: "file:///other" };
    moved.projectSelection.project = { ...moved.projectSelection.project, projectKey: "other-app" };
    const availability = vi.fn()
      .mockReturnValueOnce(initial)
      .mockReturnValueOnce(moved)
      .mockReturnValueOnce(moved);
    const harness = createHarness({ availability });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
    harness.recorded.quickPicks[0]!.accept(0);
    await vi.waitFor(() => expect(harness.recorded.quickPicks[1]?.items).toHaveLength(1));
    expect(harness.recorded.quickPicks[1]?.title).toContain("other-app · repo");
    harness.recorded.quickPicks[1]!.hide();
    await command;

    expect(availability.mock.calls[1]?.slice(2, 4)).toEqual(["shop-app", "scope:my-app:v1"]);
    expect(harness.getResourceInventory).not.toHaveBeenCalled();
    expect(harness.recorded.openedDocuments).toEqual([]);
    expect(harness.recorded.infoMessages).not.toContain(
      "That resource is no longer available to the current template scope.",
    );
  });

  test.each(["failed", "invalid"] as const)(
    "makes a fresh %s availability answer actionable without exposing its summary",
    async (result) => {
      const initial = exactAvailability();
      const failed = availabilityWithAnswerResult(result);
      const availability = vi.fn()
        .mockReturnValueOnce(initial)
        .mockReturnValueOnce(failed);
      const harness = createHarness({ availability });

      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
      harness.recorded.quickPicks[0]!.accept(0);
      await command;

      expect(harness.recorded.errorMessageRequests).toEqual([{
        message: "Aurelia resource discovery couldn't refresh resources for the active template.",
        items: ["Retry", "Open Aurelia Output"],
      }]);
      expect(JSON.stringify(harness.recorded.errorMessageRequests)).not.toMatch(/semantic-detail|private|failed|invalid/iu);
      expect(harness.recorded.openedDocuments).toEqual([]);
    },
  );

  test("keeps fresh unsupported availability distinct and offers Aurelia Output", async () => {
    const observations = captureExtensionHostObservations();
    try {
      const availability = vi.fn()
        .mockReturnValueOnce(exactAvailability())
        .mockReturnValueOnce(availabilityWithAnswerResult("unsupported"));
      const harness = createHarness({
        availability,
        informationMessageResponses: ["Open Aurelia Output"],
      });

      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
      harness.recorded.quickPicks[0]!.accept(0);
      await command;

      expect(harness.recorded.infoMessages).toContain(
        "Resource discovery is not supported for the current template.",
      );
      expect(harness.recorded.infoMessageRequests).toContainEqual({
        message: "Resource discovery is not supported for the current template.",
        items: ["Open Aurelia Output"],
      });
      expect(commandObservations(observations.events)).toEqual(expect.arrayContaining([
        expect.objectContaining({
          phase: "recovery-presented",
          actionCount: 1,
          message: "Resource discovery is not supported for the current template.",
          retryActionLabel: null,
          outputActionLabel: "Open Aurelia Output",
        }),
        expect.objectContaining({ phase: "recovery-choice", choice: "Open Aurelia Output" }),
        expect.objectContaining({ phase: "output-requested", origin: "unsupported" }),
      ]));
      expect(harness.recorded.shownOutputChannels).toEqual([{ name: "test", preserveFocus: true }]);
      expect(harness.recorded.infoMessages).not.toContain("no longer available");
      expect(harness.recorded.openedDocuments).toEqual([]);
    } finally {
      observations.dispose();
    }
  });

  test.each(["absent", "ambiguous", "rerouted"] as const)(
    "re-enters the current chooser for a fresh %s ownership result",
    async (state) => {
      const shifted = state === "absent"
        ? { fingerprint: "semantic-runtime:two", workspace: owner, projectSelection: { status: "absent" as const } }
        : state === "ambiguous"
          ? {
              fingerprint: "semantic-runtime:two",
              workspace: owner,
              projectSelection: { status: "ambiguous" as const, candidates: [project] },
            }
          : availabilityWithSelection("rerouted");
      const availability = vi.fn()
        .mockReturnValueOnce(exactAvailability())
        .mockReturnValueOnce(shifted)
        .mockReturnValueOnce(shifted);
      const harness = createHarness({ availability });

      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
      harness.recorded.quickPicks[0]!.accept(0);
      await vi.waitFor(() => expect(harness.recorded.quickPicks[1]?.busy).toBe(false));
      expect(harness.recorded.infoMessages).not.toContain(
        "That resource is no longer available to the current template scope.",
      );
      harness.recorded.quickPicks[1]!.hide();
      await command;
      expect(harness.recorded.openedDocuments).toEqual([]);
    },
  );

  test("distinguishes a current pathless source from a resource removed from scope", async () => {
    const pathless = exactAvailability();
    pathless.projectSelection.resources[0]!.resource = resource("product-card", null) as never;
    const availability = vi.fn()
      .mockReturnValueOnce(exactAvailability())
      .mockReturnValueOnce(pathless);
    const harness = createHarness({ availability });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
    await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
    harness.recorded.quickPicks[0]!.accept(0);
    await command;

    expect(harness.recorded.infoMessages).toContain(
      "That resource is available to the current template, but its source location is unavailable.",
    );
    expect(harness.recorded.infoMessages).not.toContain("no longer available");
    expect(harness.recorded.openedDocuments).toEqual([]);
  });

  test.each(["availability-state", "visibility-reason", "incomplete-absence"] as const)(
    "re-enters the picker when fresh %s cannot preserve the selected proof",
    async (change) => {
      const fresh = exactAvailability();
      if (change === "availability-state") fresh.projectSelection.resources[0]!.state = "open";
      if (change === "visibility-reason") fresh.projectSelection.resources[0]!.visibilityKind = "open";
      if (change === "incomplete-absence") {
        fresh.projectSelection.answer.coverage = "open";
        fresh.projectSelection.resources = [];
      }
      const availability = vi.fn()
        .mockReturnValueOnce(exactAvailability())
        .mockReturnValueOnce(fresh)
        .mockReturnValueOnce(fresh);
      const harness = createHarness({ availability });

      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
      harness.recorded.quickPicks[0]!.accept(0);
      await vi.waitFor(() => expect(harness.recorded.quickPicks[1]?.busy).toBe(false));
      expect(harness.recorded.quickPicks[1]?.title).toContain("incomplete");
      expect(harness.recorded.infoMessages).not.toContain(
        "That resource is no longer available to the current template scope.",
      );
      harness.recorded.quickPicks[1]!.hide();
      await command;
      expect(harness.recorded.openedDocuments).toEqual([]);
    },
  );

  test("observes deferred availability requests before navigation with one invocation id", async () => {
    const observations = captureExtensionHostObservations();
    try {
      const initial = deferred<ReturnType<typeof exactAvailability>>();
      const fresh = deferred<ReturnType<typeof exactAvailability>>();
      const availability = vi.fn()
        .mockImplementationOnce(() => initial.promise)
        .mockImplementationOnce(() => fresh.promise);
      const harness = createHarness({ availability });

      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
      await vi.waitFor(() => expect(commandObservations(observations.events).map((event) => event.phase)).toEqual([
        "command-start",
        "initial-request-start",
      ]));

      initial.resolve(exactAvailability());
      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
      expect(commandObservations(observations.events).map((event) => event.phase)).toEqual([
        "command-start",
        "initial-request-start",
        "initial-request-response",
      ]);

      harness.recorded.quickPicks[0]!.accept(0);
      await vi.waitFor(() => expect(commandObservations(observations.events).at(-1)?.phase).toBe("fresh-request-start"));
      expect(harness.recorded.openedDocuments).toHaveLength(0);
      expect(commandObservations(observations.events).some((event) => event.phase === "navigation-start")).toBe(false);

      fresh.resolve(exactAvailability());
      await command;

      const events = commandObservations(observations.events);
      expect(events).toEqual([
        expect.objectContaining({ phase: "command-start", documentName: "my-app.html", line: 8, character: 5 }),
        expect.objectContaining({ phase: "initial-request-start" }),
        expect.objectContaining({
          phase: "initial-request-response",
          answerResult: "answered",
          answerCoverage: "complete",
          answerSelection: "exact",
          selectedProjectKey: "shop-app",
          selectedTemplateScopeIdentity: "scope:my-app:v1",
          templateCandidateCount: 0,
          soleTemplateCandidateScopeIdentity: null,
          resourceIdentitySetSha256: PRODUCT_CARD_IDENTITY_SET_SHA256,
          count: 1,
          fingerprint: "semantic-runtime:one",
          status: "ready",
        }),
        expect.objectContaining({
          phase: "availability-selection",
          selectionKind: "resource",
          resourceIdentity: "resource:product-card:v1",
        }),
        expect.objectContaining({ phase: "fresh-request-start" }),
        expect.objectContaining({
          phase: "fresh-request-response",
          answerResult: "answered",
          answerCoverage: "complete",
          answerSelection: "exact",
          selectedProjectKey: "shop-app",
          selectedTemplateScopeIdentity: "scope:my-app:v1",
          templateCandidateCount: 0,
          soleTemplateCandidateScopeIdentity: null,
          resourceIdentitySetSha256: PRODUCT_CARD_IDENTITY_SET_SHA256,
          count: 1,
          fingerprint: "semantic-runtime:one",
          status: "available",
        }),
        expect.objectContaining({
          phase: "revalidation",
          editorUnchanged: true,
          fingerprint: "semantic-runtime:one",
          outcome: "available",
          rowCount: 1,
        }),
        expect.objectContaining({ phase: "navigation-start" }),
        expect.objectContaining({ phase: "navigation-complete", status: "opened" }),
      ]);
      expect(new Set(events.map((event) => event.observationId))).toEqual(new Set([events[0]!.observationId]));
      const navigationEvents = observations.events.filter((event) => event.source === "resource-navigation");
      expect(new Set(navigationEvents.map((event) => event.observationId))).toHaveLength(1);
      expect(navigationEvents[0]?.observationId).toMatch(/^resource-navigation:\d+$/);
      expect(navigationEvents[0]?.observationId).not.toBe(events[0]!.observationId);
      expect(events[0]!.observationId).toMatch(/^go-to-available-resource:\d+$/);
      expect(events.every(Object.isFrozen)).toBe(true);
    } finally {
      observations.dispose();
    }
  });

  test.each([
    ["open", "answered", "open"],
    ["truncated", "answered", "truncated"],
    ["complete", "answered", "complete"],
    ["unsupported", "unsupported", "complete"],
    ["null", null, null],
  ] as const)(
    "observes exact availability answer axes for %s responses",
    async (variant, answerResult, answerCoverage) => {
      const observations = captureExtensionHostObservations();
      try {
        const response = variant === "null"
          ? null
          : variant === "unsupported"
            ? availabilityWithAnswerResult("unsupported")
            : (() => {
              const value = exactAvailability();
              value.projectSelection.answer.coverage = variant;
              return value;
            })();
        const harness = createHarness({ availability: () => response });
        if (variant === "null") {
          harness.getTemplateResourceAvailability.mockResolvedValue(null);
        }

        const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
        await vi.waitFor(() => expect(commandObservations(observations.events).some((event) =>
          event.phase === "initial-request-response"
        )).toBe(true));

        expect(commandObservations(observations.events)).toContainEqual(expect.objectContaining({
          phase: "initial-request-response",
          answerResult,
          answerCoverage,
          answerSelection: variant === "null" ? null : "exact",
          selectedProjectKey: variant === "null" ? null : "shop-app",
          selectedTemplateScopeIdentity: variant === "null" ? null : "scope:my-app:v1",
          templateCandidateCount: variant === "null" ? null : 0,
          soleTemplateCandidateScopeIdentity: null,
          resourceIdentitySetSha256: variant === "null"
            ? null
            : variant === "unsupported"
              ? EMPTY_RESOURCE_IDENTITY_SET_SHA256
              : PRODUCT_CARD_IDENTITY_SET_SHA256,
        }));
        await vi.waitFor(() => expect(harness.recorded.quickPicks).toHaveLength(1));
        harness.recorded.quickPicks[0]!.hide();
        await command;
      } finally {
        observations.dispose();
      }
    },
  );

  test("observes null project decisions and exact sole template-candidate decisions", async () => {
    const observations = captureExtensionHostObservations();
    try {
      const projectAmbiguous = {
        fingerprint: "semantic-runtime:project-ambiguous",
        workspace: owner,
        projectSelection: {
          status: "ambiguous" as const,
          candidates: [project, { ...project, projectKey: "nested-app" }],
        },
      };
      const projectHarness = createHarness({ availability: () => projectAmbiguous });
      const projectCommand = projectHarness.recorded.commandHandlers.get(
        AureliaCommand.GoToAvailableResource,
      )?.();
      await vi.waitFor(() => expect(projectHarness.recorded.quickPicks[0]?.items).toHaveLength(2));
      projectHarness.recorded.quickPicks[0]!.hide();
      await projectCommand;

      const templateAmbiguous = exactAvailability();
      templateAmbiguous.projectSelection.answer.selection = "ambiguous";
      templateAmbiguous.projectSelection.selectedTemplate = null as never;
      templateAmbiguous.projectSelection.resources = [];
      templateAmbiguous.projectSelection.templateCandidates = [{
        templateIdentityKey: "template:sole",
        scopeIdentityKey: "scope:sole",
        definitionName: "sole-card",
        compilationLane: "authoring",
        source: available("file:///repo/src/sole.html", "template"),
      }];
      const templateHarness = createHarness({ availability: () => templateAmbiguous });
      const templateCommand = templateHarness.recorded.commandHandlers.get(
        AureliaCommand.GoToAvailableResource,
      )?.();
      await vi.waitFor(() => expect(templateHarness.recorded.quickPicks[0]?.items).toHaveLength(1));
      templateHarness.recorded.quickPicks[0]!.hide();
      await templateCommand;

      const responses = commandObservations(observations.events).filter((event) =>
        event.phase === "initial-request-response"
      );
      expect(responses).toHaveLength(2);
      expect(responses[0]).toEqual(expect.objectContaining({
        answerResult: null,
        answerCoverage: null,
        answerSelection: null,
        selectedProjectKey: null,
        selectedTemplateScopeIdentity: null,
        templateCandidateCount: null,
        soleTemplateCandidateScopeIdentity: null,
        resourceIdentitySetSha256: null,
      }));
      expect(responses[1]).toEqual(expect.objectContaining({
        answerResult: "answered",
        answerCoverage: "complete",
        answerSelection: "ambiguous",
        selectedProjectKey: "shop-app",
        selectedTemplateScopeIdentity: null,
        templateCandidateCount: 1,
        soleTemplateCandidateScopeIdentity: "scope:sole",
        resourceIdentitySetSha256: EMPTY_RESOURCE_IDENTITY_SET_SHA256,
      }));
    } finally {
      observations.dispose();
    }
  });

  test("hashes the sorted resource identity set with the frozen LF preimage", async () => {
    const observations = captureExtensionHostObservations();
    try {
      const response = exactAvailability();
      response.projectSelection.resources = ["alpha", "Zeta"].map((name) => ({
        resource: resource(name),
        state: "available",
        visibilityKind: "app-root",
        availabilitySource: available("file:///repo/src/main.ts", "availability"),
      }));
      const harness = createHarness({ availability: () => response });
      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(2));
      harness.recorded.quickPicks[0]!.hide();
      await command;

      expect(commandObservations(observations.events)).toContainEqual(expect.objectContaining({
        phase: "initial-request-response",
        resourceIdentitySetSha256: "2b3018ec16ebd6e4aa30b6f33b7853d9c7e25ea5271858d0b2eede57e2d8ff47",
      }));
    } finally {
      observations.dispose();
    }
  });

  test("observes the fresh stale-scope decision before preserving restart behavior", async () => {
    const observations = captureExtensionHostObservations();
    try {
      const shifted = exactAvailability();
      shifted.fingerprint = "semantic-runtime:scope-v2";
      const nextTemplate = {
        ...shifted.projectSelection.selectedTemplate,
        scopeIdentityKey: "scope:my-app:v2",
      };
      shifted.projectSelection.answer.selection = "absent";
      shifted.projectSelection.selectedTemplate = null as never;
      shifted.projectSelection.templateCandidates = [nextTemplate];
      shifted.projectSelection.resources = [];
      const availability = vi.fn()
        .mockReturnValueOnce(exactAvailability())
        .mockReturnValueOnce(shifted)
        .mockReturnValueOnce(shifted);
      const harness = createHarness({ availability });

      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
      harness.recorded.quickPicks[0]!.accept(0);
      await vi.waitFor(() => expect(harness.recorded.quickPicks[1]?.busy).toBe(false));
      expect(harness.recorded.quickPicks[1]).toMatchObject({
        title: "No Aurelia template at the cursor",
        items: [],
      });
      harness.recorded.quickPicks[1]!.hide();
      await command;

      expect(commandObservations(observations.events)).toEqual(expect.arrayContaining([
        expect.objectContaining({
          phase: "fresh-request-response",
          status: "restart",
          answerSelection: "absent",
          selectedProjectKey: "shop-app",
          selectedTemplateScopeIdentity: null,
          templateCandidateCount: 1,
          soleTemplateCandidateScopeIdentity: "scope:my-app:v2",
          resourceIdentitySetSha256: EMPTY_RESOURCE_IDENTITY_SET_SHA256,
        }),
        expect.objectContaining({
          phase: "revalidation",
          outcome: "restart",
          editorUnchanged: true,
          fingerprint: "semantic-runtime:scope-v2",
        }),
      ]));
      expect(harness.recorded.openedDocuments).toEqual([]);
    } finally {
      observations.dispose();
    }
  });

  test("keeps the initial product model when observation preparation throws", async () => {
    const observations = captureExtensionHostObservations();
    try {
      const harness = createHarness({ availability: () => availabilityWithThrowingObservationMap() });
      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();

      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
      expect(commandObservations(observations.events).some((event) =>
        event.phase === "initial-request-response"
      )).toBe(false);
      harness.recorded.quickPicks[0]!.hide();
      await command;

      expect(commandObservations(observations.events).some((event) =>
        event.phase === "initial-request-failed" || event.phase === "recovery-presented"
      )).toBe(false);
      expect(harness.recorded.errorMessageRequests).toEqual([]);
      expect(harness.recorded.openedDocuments).toEqual([]);
    } finally {
      observations.dispose();
    }
  });

  test("keeps fresh navigation when observation preparation and emission throw", async () => {
    const observations = captureExtensionHostObservations();
    const throwOnRevalidation = (event: ExtensionHostObservation): void => {
      if (event.source === "go-to-available-resource" && event.phase === "revalidation") {
        throw new Error("observation listener failed");
      }
    };
    process.on(EXTENSION_HOST_OBSERVATION_EVENT, throwOnRevalidation);
    try {
      const availability = vi.fn()
        .mockReturnValueOnce(exactAvailability())
        .mockReturnValueOnce(availabilityWithThrowingObservationMap());
      const harness = createHarness({ availability });
      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();

      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
      harness.recorded.quickPicks[0]!.accept(0);
      await command;

      const events = commandObservations(observations.events);
      expect(events.some((event) => event.phase === "fresh-request-response")).toBe(false);
      expect(events).toContainEqual(expect.objectContaining({
        phase: "revalidation",
        outcome: "available",
        editorUnchanged: true,
      }));
      expect(events.some((event) =>
        event.phase === "fresh-request-failed" || event.phase === "recovery-presented"
      )).toBe(false);
      expect(harness.recorded.errorMessageRequests).toEqual([]);
      expect(harness.recorded.openedDocuments.at(-1)?.uri.toString()).toBe(
        "file:///repo/src/product-card.ts",
      );
    } finally {
      process.off(EXTENSION_HOST_OBSERVATION_EVENT, throwOnRevalidation);
      observations.dispose();
    }
  });

  test("keeps fresh restart when an observation-only fingerprint getter throws", async () => {
    const observations = captureExtensionHostObservations();
    try {
      const hostile = exactAvailability();
      const nextTemplate = {
        ...hostile.projectSelection.selectedTemplate,
        scopeIdentityKey: "scope:hostile:v2",
      };
      hostile.projectSelection.answer.selection = "absent";
      hostile.projectSelection.selectedTemplate = null as never;
      hostile.projectSelection.templateCandidates = [nextTemplate];
      hostile.projectSelection.resources = [];
      Object.defineProperty(hostile, "fingerprint", {
        configurable: true,
        enumerable: true,
        get: () => { throw new Error("observation-only fingerprint read failed"); },
      });
      const restarted = exactAvailability();
      restarted.projectSelection.answer.selection = "absent";
      restarted.projectSelection.selectedTemplate = null as never;
      restarted.projectSelection.templateCandidates = [nextTemplate];
      restarted.projectSelection.resources = [];
      const availability = vi.fn()
        .mockReturnValueOnce(exactAvailability())
        .mockReturnValueOnce(hostile)
        .mockReturnValueOnce(restarted);
      const harness = createHarness({ availability });

      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
      harness.recorded.quickPicks[0]!.accept(0);
      await vi.waitFor(() => expect(harness.recorded.quickPicks[1]?.busy).toBe(false));
      expect(harness.recorded.quickPicks[1]?.title).toBe("No Aurelia template at the cursor");
      harness.recorded.quickPicks[1]!.hide();
      await command;

      const events = commandObservations(observations.events);
      expect(events.some((event) => event.phase === "fresh-request-response")).toBe(false);
      expect(events.some((event) => event.phase === "revalidation")).toBe(false);
      expect(events.some((event) =>
        event.phase === "fresh-request-failed" || event.phase === "recovery-presented"
      )).toBe(false);
      expect(harness.recorded.errorMessageRequests).toEqual([]);
      expect(harness.recorded.openedDocuments).toEqual([]);
    } finally {
      observations.dispose();
    }
  });

  test("keeps a conclusive refusal when the gated editor proof getter throws", async () => {
    const observations = captureExtensionHostObservations();
    try {
      const removed = exactAvailability();
      removed.projectSelection.resources = [];
      const availability = vi.fn()
        .mockReturnValueOnce(exactAvailability())
        .mockReturnValueOnce(removed);
      const harness = createHarness({ availability });

      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
      Object.defineProperty(harness.vscode.window, "activeTextEditor", {
        configurable: true,
        get: () => { throw new Error("observation-only editor proof failed"); },
      });
      harness.recorded.quickPicks[0]!.accept(0);
      await command;

      expect(harness.recorded.infoMessages).toContain(
        "That resource is no longer available to the current template scope.",
      );
      expect(commandObservations(observations.events).some((event) =>
        event.phase === "fresh-request-failed" || event.phase === "recovery-presented"
      )).toBe(false);
      expect(harness.recorded.errorMessageRequests).toEqual([]);
      expect(harness.recorded.openedDocuments).toEqual([]);
    } finally {
      observations.dispose();
    }
  });

  test("settles and reports a rejected fresh availability request without navigating", async () => {
    const observations = captureExtensionHostObservations();
    try {
      const fresh = deferred<ReturnType<typeof exactAvailability>>();
      const availability = vi.fn()
        .mockReturnValueOnce(exactAvailability())
        .mockImplementationOnce(() => fresh.promise);
      const harness = createHarness({
        availability,
        errorMessageResponses: ["Open Aurelia Output"],
      });

      const command = harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();
      await vi.waitFor(() => expect(harness.recorded.quickPicks[0]?.items).toHaveLength(1));
      harness.recorded.quickPicks[0]!.accept(0);
      await vi.waitFor(() => expect(commandObservations(observations.events).at(-1)?.phase).toBe("fresh-request-start"));

      fresh.reject(new Error("fresh availability failed"));
      await expect(command).resolves.toEqual({ ok: true, value: undefined });

      expect(commandObservations(observations.events).map((event) => ({
        phase: event.phase,
        count: event.count,
        status: event.status,
      }))).toEqual([
        { phase: "command-start", count: undefined, status: undefined },
        { phase: "initial-request-start", count: undefined, status: undefined },
        { phase: "initial-request-response", count: 1, status: "ready" },
        { phase: "availability-selection", count: undefined, status: undefined },
        { phase: "fresh-request-start", count: undefined, status: undefined },
        { phase: "fresh-request-failed", count: undefined, status: "failed" },
        { phase: "recovery-presented", count: undefined, status: undefined },
        { phase: "recovery-choice", count: undefined, status: undefined },
        { phase: "output-requested", count: undefined, status: undefined },
      ]);
      expect(commandObservations(observations.events)).toEqual(expect.arrayContaining([
        expect.objectContaining({
          phase: "recovery-presented",
          actionCount: 2,
          message: "Aurelia resource discovery couldn't refresh resources for the active template.",
          retryActionLabel: "Retry",
          outputActionLabel: "Open Aurelia Output",
        }),
        expect.objectContaining({ phase: "recovery-choice", choice: "Open Aurelia Output" }),
        expect.objectContaining({ phase: "output-requested", origin: "recovery" }),
      ]));
      expect(harness.recorded.openedDocuments).toHaveLength(0);
      expect(harness.recorded.errorMessageRequests).toEqual([{
        message: "Aurelia resource discovery couldn't refresh resources for the active template.",
        items: ["Retry", "Open Aurelia Output"],
      }]);
      expect(harness.recorded.shownOutputChannels).toEqual([{ name: "test", preserveFocus: true }]);
    } finally {
      observations.dispose();
    }
  });

  test("treats protocol cancellation as a silent availability exit", async () => {
    const observations = captureExtensionHostObservations();
    try {
      const cancelled = Object.assign(new Error("cancelled"), { code: -32800 });
      const harness = createHarness({ availability: () => Promise.reject(cancelled) });

      await harness.recorded.commandHandlers.get(AureliaCommand.GoToAvailableResource)?.();

      expect(commandObservations(observations.events).map((event) => event.phase)).toEqual([
        "command-start",
        "initial-request-start",
        "initial-request-failed",
        "cancelled",
      ]);
      expect(commandObservations(observations.events).at(-1)).toEqual(expect.objectContaining({
        phase: "cancelled",
        stage: "request",
      }));
      expect(commandObservations(observations.events).some((event) =>
        event.phase === "recovery-presented" || event.phase === "output-requested"
      )).toBe(false);
      expect(harness.recorded.errorMessages).toEqual([]);
      expect(harness.recorded.errorMessageRequests).toEqual([]);
      expect(harness.recorded.outputLogs).toEqual([]);
      expect(harness.recorded.shownOutputChannels).toEqual([]);
      expect(harness.recorded.openedDocuments).toEqual([]);
    } finally {
      observations.dispose();
    }
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
    expect(harness.getRelatedFiles).toHaveBeenCalledTimes(2);
    expect(harness.recorded.openedDocuments.at(-1)?.uri.toString()).toBe("file:///secondary.html");
  });

  test("refuses a related-file choice that disappears while the picker is open", async () => {
    const primary = {
      uri: "file:///primary.html",
      role: "component-template",
      elementName: "primary-card",
      className: "PrimaryCard",
    };
    const secondary = {
      uri: "file:///secondary.html",
      role: "component-template",
      elementName: "secondary-card",
      className: "SecondaryCard",
    };
    const replacement = {
      uri: "file:///replacement.html",
      role: "component-template",
      elementName: "replacement-card",
      className: "ReplacementCard",
    };
    const harness = createHarness({ related: [primary, secondary], relatedPickIndex: 0 });
    harness.getRelatedFiles
      .mockResolvedValueOnce([primary, secondary])
      .mockResolvedValueOnce([replacement]);

    await harness.recorded.commandHandlers.get(AureliaCommand.OpenRelatedFile)?.();

    expect(harness.getRelatedFiles).toHaveBeenCalledTimes(2);
    expect(harness.recorded.openedDocuments).toEqual([]);
    expect(harness.recorded.infoMessages).toContain(
      "The related Aurelia file changed; run Open Related File again",
    );
  });

  test("does not focus a related target when the invoking editor changes while the document opens", async () => {
    const related = {
      uri: "file:///primary.html",
      role: "component-template",
      elementName: "primary-card",
      className: "PrimaryCard",
    };
    const harness = createHarness({ related: [related] });
    const opened = deferred<void>();
    const releaseOpen = deferred<void>();
    const openTextDocument = harness.vscode.workspace.openTextDocument.bind(harness.vscode.workspace);
    harness.vscode.workspace.openTextDocument = vi.fn(async (uri) => {
      const document = await openTextDocument(uri);
      opened.resolve(undefined);
      await releaseOpen.promise;
      return document;
    });

    const command = harness.recorded.commandHandlers.get(AureliaCommand.OpenRelatedFile)?.();
    await opened.promise;
    harness.vscode.window.activeTextEditor = {
      document: {
        uri: harness.vscode.Uri.parse("file:///repo/src/other.html"),
        version: 1,
      },
    } as never;
    releaseOpen.resolve(undefined);
    await command;

    expect(harness.getRelatedFiles).toHaveBeenCalledTimes(2);
    expect(harness.recorded.shownDocuments).toEqual([]);
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

interface VisibleQuickPickItem {
  readonly label?: string;
  readonly description?: string;
  readonly detail?: string;
  readonly navigation?: { readonly resourceIdentityKey?: string };
}

function visibleQuickPickItems(
  picker: { readonly items: readonly unknown[] },
): readonly VisibleQuickPickItem[] {
  return picker.items as readonly VisibleQuickPickItem[];
}

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (error: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function captureExtensionHostObservations(): {
  readonly events: ExtensionHostObservation[];
  dispose(): void;
} {
  const previous = process.env[EXTENSION_HOST_OBSERVATION_ENV];
  const previousAcceptance = process.env[RESOURCE_DISCOVERY_ACCEPTANCE_ENV];
  const events: ExtensionHostObservation[] = [];
  const listener = (event: ExtensionHostObservation): void => { events.push(event); };
  process.env[EXTENSION_HOST_OBSERVATION_ENV] = "1";
  process.env[RESOURCE_DISCOVERY_ACCEPTANCE_ENV] = "1";
  process.on(EXTENSION_HOST_OBSERVATION_EVENT, listener);
  return {
    events,
    dispose: () => {
      process.off(EXTENSION_HOST_OBSERVATION_EVENT, listener);
      if (previous == null) {
        delete process.env[EXTENSION_HOST_OBSERVATION_ENV];
      } else {
        process.env[EXTENSION_HOST_OBSERVATION_ENV] = previous;
      }
      if (previousAcceptance == null) {
        delete process.env[RESOURCE_DISCOVERY_ACCEPTANCE_ENV];
      } else {
        process.env[RESOURCE_DISCOVERY_ACCEPTANCE_ENV] = previousAcceptance;
      }
    },
  };
}

function commandObservations(
  events: readonly ExtensionHostObservation[],
): ExtensionHostObservation[] {
  return events.filter((event) => event.source === "go-to-available-resource");
}
