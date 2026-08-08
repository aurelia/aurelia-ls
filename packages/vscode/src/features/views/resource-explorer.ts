import type {
  ResourceInventoryProjectResult,
  ResourceProject,
} from "@aurelia-ls/language-server/protocol";
import type {
  Disposable,
  Event,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  TreeView,
} from "vscode";
import type { LspFacade } from "../../core/lsp-facade.js";
import type { ClientLogger } from "../../log.js";
import { AureliaCommand } from "../../product-contract.js";
import type {
  AureliaWorkspaceIdentity,
  ResourceInventorySnapshot,
  ResourceInventoryWorkspaceSnapshot,
  ResourceInventoryItem,
  ResourceNavigationRequest,
} from "../../types.js";
import type { VscodeApi } from "../../vscode-api.js";
import {
  RESOURCE_KIND_ORDER,
  resourceDescription,
  resourceKindPresentation,
  resourceTooltip,
} from "../resource-discovery/presentation.js";

type TreeNodeKind = "project" | "kind" | "resource" | "alias" | "bindable" | "info";

interface TreeNode {
  readonly nodeKind: TreeNodeKind;
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly tooltip?: string;
  readonly iconId?: string;
  readonly collapsible: boolean;
  readonly defaultExpanded?: boolean;
  readonly children?: readonly TreeNode[];
  readonly navigation?: ResourceNavigationRequest;
  readonly contextValue?: string;
}

interface ReadyProjectInput {
  readonly workspace: AureliaWorkspaceIdentity;
  readonly fingerprint: string;
  readonly result: Extract<ResourceInventoryProjectResult, { status: "ready" }>;
}

interface ProjectUnit {
  readonly workspace: ResourceInventoryWorkspaceSnapshot;
  readonly fingerprint: string | null;
  readonly result: ResourceInventoryProjectResult | null;
}

function buildTree(response: ResourceInventorySnapshot): readonly TreeNode[] {
  const units = projectUnits(response);
  if (units.length === 0) {
    return [infoNode("no-projects", "No Aurelia projects discovered", "info")];
  }
  if (units.length === 1) {
    return buildProjectUnit(units[0]!, false);
  }
  return units.map((unit) => projectRootNode(unit));
}

function projectUnits(response: ResourceInventorySnapshot): readonly ProjectUnit[] {
  const units: ProjectUnit[] = [];
  for (const workspace of response.workspaces) {
    if (workspace.status === "error") {
      units.push({ workspace, fingerprint: null, result: null });
      continue;
    }
    if (workspace.response.projects.length === 0) {
      units.push({ workspace, fingerprint: workspace.response.fingerprint, result: null });
      continue;
    }
    for (const result of workspace.response.projects) {
      units.push({ workspace, fingerprint: workspace.response.fingerprint, result });
    }
  }
  return units;
}

function projectRootNode(unit: ProjectUnit): TreeNode {
  const result = unit.result;
  const project = result?.project;
  const label = project == null
    ? unit.workspace.name
    : unit.workspace.name === project.projectKey
      ? project.projectKey
      : `${unit.workspace.name} · ${project.projectKey}`;
  const children = buildProjectUnit(unit, true);
  const resourceCount = result?.status === "ready" ? result.resources.length : 0;
  const description = unit.workspace.status === "error" || result?.status === "error"
    ? "analysis failed"
    : result == null
      ? "no Aurelia project"
      : `${resourceCount} resource${resourceCount === 1 ? "" : "s"}${projectResultIncomplete(result) ? " · incomplete" : ""}`;
  return {
    nodeKind: "project",
    id: projectPrefix(unit),
    label,
    description,
    tooltip: project?.rootUri ?? (unit.workspace.status === "error" ? unit.workspace.error : unit.workspace.uri),
    iconId: unit.workspace.status === "error" || result?.status === "error" ? "error" : "root-folder",
    collapsible: true,
    defaultExpanded: true,
    children,
    contextValue: result?.status === "error" ? "resourceProjectError" : "resourceProject",
  };
}

function buildProjectUnit(unit: ProjectUnit, nested: boolean): readonly TreeNode[] {
  if (unit.workspace.status === "error") {
    return [infoNode(
      `${projectPrefix(unit)}:error`,
      "Couldn't load Aurelia resources",
      "error",
      unit.workspace.error,
    )];
  }
  if (unit.result == null) {
    return [infoNode(
      `${projectPrefix(unit)}:empty-project`,
      "No Aurelia project discovered",
      "info",
      unit.workspace.uri,
    )];
  }
  if (unit.result.status === "error") {
    return [infoNode(
      `${projectPrefix(unit)}:error`,
      "Couldn't load Aurelia resources for this project",
      "error",
      unit.result.message,
    )];
  }
  const input: ReadyProjectInput = {
    workspace: unit.workspace,
    fingerprint: unit.fingerprint!,
    result: unit.result,
  };
  const children = buildKindGroups(input);
  if (children.length > 0) return children;
  return [infoNode(
    `${projectPrefix(unit)}:empty`,
    projectResultIncomplete(unit.result) ? "No reliable resource rows discovered" : "No supported resources discovered",
    projectResultIncomplete(unit.result) ? "warning" : "info",
    nested ? undefined : unit.result.answer.summary,
  )];
}

function buildKindGroups(input: ReadyProjectInput): readonly TreeNode[] {
  const nodes: TreeNode[] = [];
  for (const kind of RESOURCE_KIND_ORDER) {
    const rows = input.result.resources
      .filter((resource) => resource.kind === kind)
      .sort((left, right) => left.name.localeCompare(right.name) || left.identityKey.localeCompare(right.identityKey));
    if (rows.length === 0) continue;
    const presentation = resourceKindPresentation(kind);
    nodes.push({
      nodeKind: "kind",
      id: `${projectPrefix(input)}:kind:${kind}`,
      label: `${presentation.plural} (${rows.length})`,
      iconId: presentation.icon,
      collapsible: true,
      defaultExpanded: kind === "custom-element",
      children: rows.map((resource) => resourceNode(input, resource)),
      contextValue: "resourceKind",
    });
  }
  return nodes;
}

function resourceNode(input: ReadyProjectInput, resource: ResourceInventoryItem): TreeNode {
  const navigation = navigationRequest(input, resource, "resource");
  const children: TreeNode[] = [];
  for (const alias of resource.aliases) {
    children.push({
      nodeKind: "alias",
      id: `${projectPrefix(input)}:${alias.identityKey}`,
      label: alias.name,
      description: alias.navigation.state === "available" ? "alias" : "alias · source unavailable",
      tooltip: alias.source.state === "available" ? alias.source.location.label : "Alias source location unavailable",
      iconId: "symbol-string",
      collapsible: false,
      navigation: alias.navigation.state === "available"
        ? navigationRequest(input, resource, "alias", alias.identityKey)
        : undefined,
      contextValue: alias.navigation.state === "available" ? "resourceAlias" : "resourceAliasUnavailable",
    });
  }
  for (const bindable of resource.bindables) {
    const details = [bindable.valueType == null ? null : `: ${bindable.valueType}`, bindable.primary ? "primary" : null]
      .filter((value): value is string => value != null);
    children.push({
      nodeKind: "bindable",
      id: `${projectPrefix(input)}:${bindable.identityKey}`,
      label: bindable.attribute === bindable.name ? bindable.name : `${bindable.name} (${bindable.attribute})`,
      description: `${details.join(" · ")}${bindable.navigation.state === "unavailable" ? `${details.length ? " · " : ""}source unavailable` : ""}`,
      tooltip: bindable.sources.name.state === "available"
        ? bindable.sources.name.location.label
        : "Bindable source location unavailable",
      iconId: "symbol-field",
      collapsible: false,
      navigation: bindable.navigation.state === "available"
        ? navigationRequest(input, resource, "bindable", bindable.identityKey)
        : undefined,
      contextValue: bindable.navigation.state === "available" ? "resourceBindable" : "resourceBindableUnavailable",
    });
  }
  return {
    nodeKind: "resource",
    id: `${projectPrefix(input)}:${resource.identityKey}`,
    label: resource.name,
    description: resourceDescription(resource),
    tooltip: resourceTooltip(resource, input.result.project, input.workspace),
    iconId: resourceKindPresentation(resource.kind).icon,
    collapsible: children.length > 0,
    children,
    navigation: resource.navigation.state === "available" ? navigation : undefined,
    contextValue: resource.navigation.state === "available" ? "resource" : "resourceUnavailable",
  };
}

function navigationRequest(
  input: ReadyProjectInput,
  resource: ResourceInventoryItem,
  role: ResourceNavigationRequest["role"],
  childIdentityKey?: string,
): ResourceNavigationRequest {
  return {
    workspaceKey: input.workspace.key,
    fingerprint: input.fingerprint,
    projectKey: input.result.project.projectKey,
    resourceIdentityKey: resource.identityKey,
    role,
    ...(childIdentityKey == null ? {} : { childIdentityKey }),
  };
}

function projectPrefix(input: ProjectUnit | ReadyProjectInput): string {
  if ("result" in input && input.result != null) {
    return `workspace:${input.workspace.key}:project:${input.result.project.projectKey}`;
  }
  return `workspace:${input.workspace.key}`;
}

function projectResultIncomplete(result: Extract<ResourceInventoryProjectResult, { status: "ready" }>): boolean {
  return result.answer.result !== "answered" || result.answer.coverage !== "complete";
}

function infoNode(id: string, label: string, iconId: string, tooltip?: string): TreeNode {
  return { nodeKind: "info", id, label, iconId, tooltip, collapsible: false, contextValue: "resourceInfo" };
}

export class ResourceExplorerProvider implements TreeDataProvider<TreeNode>, Disposable {
  readonly #vscode: VscodeApi;
  readonly #lsp: LspFacade;
  readonly #logger: ClientLogger;
  readonly #changeEmitter: { readonly event: Event<void>; fire(): void; dispose(): void };
  #tree: readonly TreeNode[] = [];
  #response: ResourceInventorySnapshot | null = null;
  #view: Pick<TreeView<TreeNode>, "message" | "description"> | null = null;
  #refreshGeneration = 0;

  constructor(vscode: VscodeApi, lsp: LspFacade, logger: ClientLogger) {
    this.#vscode = vscode;
    this.#lsp = lsp;
    this.#logger = logger;
    this.#changeEmitter = new vscode.EventEmitter<void>();
  }

  get onDidChangeTreeData(): Event<void> {
    return this.#changeEmitter.event;
  }

  attachView(view: Pick<TreeView<TreeNode>, "message" | "description">): void {
    this.#view = view;
    this.#publishViewState();
  }

  dispose(): void {
    this.#refreshGeneration += 1;
    this.#tree = [];
    this.#response = null;
    this.#view = null;
    this.#changeEmitter.dispose();
  }

  getTreeItem(element: TreeNode): TreeItem {
    const item: TreeItem = { label: element.label, id: element.id };
    if (element.description != null) item.description = element.description;
    if (element.tooltip != null) item.tooltip = element.tooltip;
    if (element.iconId != null) item.iconPath = new this.#vscode.ThemeIcon(element.iconId);
    item.collapsibleState = element.collapsible
      ? (element.defaultExpanded === true
        ? this.#vscode.TreeItemCollapsibleState.Expanded
        : this.#vscode.TreeItemCollapsibleState.Collapsed)
      : this.#vscode.TreeItemCollapsibleState.None;
    if (element.navigation != null) {
      item.command = {
        title: "Open Declaration",
        command: AureliaCommand.OpenResource,
        arguments: [element.navigation],
      };
    }
    item.contextValue = element.contextValue;
    return item;
  }

  getChildren(element?: TreeNode): ProviderResult<TreeNode[]> {
    return [...(element == null ? this.#tree : element.children ?? [])];
  }

  async refresh(): Promise<void> {
    const generation = ++this.#refreshGeneration;
    const hasPrevious = this.#response != null;
    this.#setMessage(hasPrevious
      ? "Updating — showing previous results"
      : "Discovering Aurelia resources...");
    try {
      this.#logger.debug("resourceExplorer.refresh.start");
      const response = await this.#lsp.getResourceInventory({ includeTypeSurfaces: true });
      if (generation !== this.#refreshGeneration) return;
      this.#response = response;
      this.#tree = response == null
        ? [infoNode("no-session", "No active Aurelia workspace", "info")]
        : buildTree(response);
      this.#changeEmitter.fire();
      this.#publishViewState();
      this.#logger.debug("resourceExplorer.refresh.complete", resourceResponseCounts(response));
    } catch (error) {
      if (generation !== this.#refreshGeneration) return;
      this.#logger.warn("resourceExplorer.refresh.failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      if (hasPrevious) {
        this.#setMessage("Out of date — refresh failed. Retry when analysis has settled.");
      } else {
        this.#tree = [infoNode("error", "Couldn't load Aurelia resources", "error", String(error))];
        this.#changeEmitter.fire();
        this.#setMessage("Resource discovery failed. Refresh to retry.");
      }
    }
  }

  #publishViewState(): void {
    const counts = resourceResponseCounts(this.#response);
    if (this.#view != null) {
      this.#view.description = counts.projects === 0 ? undefined : `${counts.resources} resources`;
    }
    if (this.#response == null) {
      this.#setMessage(undefined);
    } else if (counts.failures > 0 || counts.incomplete > 0) {
      this.#setMessage(`Showing ${counts.resources} known resources — incomplete`);
    } else {
      this.#setMessage(undefined);
    }
  }

  #setMessage(message: string | undefined): void {
    if (this.#view != null) this.#view.message = message;
  }
}

function resourceResponseCounts(response: ResourceInventorySnapshot | null): {
  readonly projects: number;
  readonly resources: number;
  readonly failures: number;
  readonly incomplete: number;
} {
  let projects = 0;
  let resources = 0;
  let failures = 0;
  let incomplete = 0;
  for (const workspace of response?.workspaces ?? []) {
    if (workspace.status === "error") {
      failures += 1;
      continue;
    }
    for (const project of workspace.response.projects) {
      projects += 1;
      if (project.status === "error") {
        failures += 1;
      } else {
        resources += project.resources.length;
        if (projectResultIncomplete(project)) incomplete += 1;
      }
    }
  }
  return { projects, resources, failures, incomplete };
}
