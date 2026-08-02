/** Resource inventory projected from exact semantic-runtime definition and compiler-world identities. */
import type { Event, ProviderResult, TreeDataProvider, TreeItem } from "vscode";
import type { LspFacade } from "../../core/lsp-facade.js";
import type { DisposableLike } from "../../core/disposables.js";
import type { ClientLogger } from "../../log.js";
import type {
  ResourceExplorerItem,
  ResourceExplorerResponse,
  ResourceExplorerWorkspace,
} from "../../types.js";
import type { VscodeApi } from "../../vscode-api.js";

type ExplorerGroup = "project" | "package" | "framework" | "external";

const GROUP_LABELS: Record<ExplorerGroup, string> = {
  project: "Project",
  package: "Packages",
  framework: "Framework",
  external: "External / unresolved",
};

const GROUP_ICONS: Record<ExplorerGroup, string> = {
  project: "home",
  package: "package",
  framework: "library",
  external: "question",
};

const GROUP_ORDER: readonly ExplorerGroup[] = ["project", "package", "framework", "external"];

const KIND_LABELS: Readonly<Record<string, string>> = {
  "custom-element": "Elements",
  "custom-attribute": "Attributes",
  "template-controller": "Template Controllers",
  "value-converter": "Value Converters",
  "binding-behavior": "Binding Behaviors",
  "binding-command": "Binding Commands",
  "attribute-pattern": "Attribute Patterns",
};

const KIND_ICONS: Readonly<Record<string, string>> = {
  "custom-element": "symbol-class",
  "custom-attribute": "symbol-property",
  "template-controller": "symbol-struct",
  "value-converter": "symbol-function",
  "binding-behavior": "symbol-event",
  "binding-command": "symbol-method",
  "attribute-pattern": "symbol-key",
};

const KIND_ORDER = [
  "custom-element",
  "template-controller",
  "custom-attribute",
  "value-converter",
  "binding-behavior",
  "binding-command",
  "attribute-pattern",
] as const;

type TreeNodeKind =
  | "workspace-group"
  | "origin-group"
  | "kind-group"
  | "resource"
  | "alias"
  | "bindable"
  | "visibility"
  | "info";

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
  readonly resourceUri?: string;
  readonly contextValue?: string;
}

interface WorkspaceTreeInput {
  readonly resources: readonly ResourceExplorerItem[];
  readonly templateCount: number;
  readonly evidence?: Extract<ResourceExplorerWorkspace, { status: "ready" }>["evidence"];
}

function buildTree(response: ResourceExplorerResponse): readonly TreeNode[] {
  if (response.workspaces.length === 0) {
    return [infoNode("no-workspaces", "No active Aurelia workspace", "info")];
  }
  if (response.workspaces.length === 1) {
    const workspace = response.workspaces[0]!;
    return workspace.status === "error"
      ? [workspaceErrorNode(workspace, "")]
      : buildWorkspaceTree({
          resources: response.resources,
          templateCount: workspace.templateCount,
          evidence: workspace.evidence,
        }, `workspace:${workspace.key}`);
  }
  return response.workspaces.map((workspace): TreeNode => {
    const prefix = `workspace:${workspace.key}`;
    const resources = response.resources.filter((resource) => resource.workspace.key === workspace.key);
    return {
      nodeKind: "workspace-group",
      id: prefix,
      label: workspace.name,
      description: workspace.status === "ready"
        ? `${resources.length} resource${resources.length === 1 ? "" : "s"}`
        : "analysis failed",
      tooltip: workspace.status === "ready" ? workspace.uri : workspace.error,
      iconId: workspace.status === "ready" ? "root-folder" : "error",
      collapsible: true,
      defaultExpanded: true,
      children: workspace.status === "ready"
        ? buildWorkspaceTree({
            resources,
            templateCount: workspace.templateCount,
            evidence: workspace.evidence,
          }, prefix)
        : [workspaceErrorNode(workspace, prefix)],
      contextValue: "workspaceGroup",
    };
  });
}

function buildWorkspaceTree(input: WorkspaceTreeInput, idPrefix: string): readonly TreeNode[] {
  const byGroup = new Map<ExplorerGroup, Map<string, ResourceExplorerItem[]>>();
  for (const resource of input.resources) {
    const group = explorerGroup(resource);
    const groupMap = byGroup.get(group) ?? new Map<string, ResourceExplorerItem[]>();
    const kindRows = groupMap.get(resource.kind) ?? [];
    kindRows.push(resource);
    groupMap.set(resource.kind, kindRows);
    byGroup.set(group, groupMap);
  }

  const tree: TreeNode[] = [];
  for (const origin of GROUP_ORDER) {
    const originMap = byGroup.get(origin);
    if (originMap == null || originMap.size === 0) continue;
    const kindGroups: TreeNode[] = [];
    let originCount = 0;
    for (const kind of KIND_ORDER) {
      const resources = originMap.get(kind);
      if (resources == null || resources.length === 0) continue;
      originCount += resources.length;
      const kindLabel = KIND_LABELS[kind] ?? kind;
      kindGroups.push({
        nodeKind: "kind-group",
        id: prefixedId(idPrefix, `${origin}:kind:${kind}`),
        label: `${kindLabel} (${resources.length})`,
        iconId: KIND_ICONS[kind],
        collapsible: true,
        children: resources.map((resource) => buildResourceNode(resource, idPrefix)),
        contextValue: "kindGroup",
      });
    }
    const singleKindGroup = kindGroups.length === 1 ? kindGroups[0] : undefined;
    tree.push({
      nodeKind: "origin-group",
      id: prefixedId(idPrefix, `origin:${origin}`),
      label: singleKindGroup == null
        ? `${GROUP_LABELS[origin]} (${originCount})`
        : `${GROUP_LABELS[origin]} - ${singleKindGroup.label}`,
      iconId: GROUP_ICONS[origin],
      collapsible: true,
      defaultExpanded: origin === "project" || origin === "package",
      children: singleKindGroup?.children ?? kindGroups,
      contextValue: "originGroup",
    });
  }

  if (input.resources.length === 0) {
    tree.push(infoNode(
      prefixedId(idPrefix, "empty"),
      "No resources discovered",
      "info",
      "The current semantic app contains no recognized resource definitions or compiler-visible resources.",
    ));
  }
  const evidenceConcern = resourceEvidenceConcern(input.evidence);
  if (evidenceConcern != null) {
    tree.push(infoNode(
      prefixedId(idPrefix, "coverage"),
      "Resource inventory may be incomplete",
      "warning",
      evidenceConcern,
    ));
  }
  tree.push(infoNode(
    prefixedId(idPrefix, "summary"),
    resourceSummary(input.resources, input.templateCount),
    "info",
  ));
  return tree;
}

function buildResourceNode(item: ResourceExplorerItem, idPrefix: string): TreeNode {
  const children: TreeNode[] = [];
  item.aliases.forEach((alias, index) => {
    children.push({
      nodeKind: "alias",
      id: prefixedId(idPrefix, `${item.id}:alias:${index}:${alias.name}`),
      label: alias.name,
      description: "alias",
      tooltip: alias.source?.label,
      iconId: "symbol-string",
      collapsible: false,
      resourceUri: item.uri ?? undefined,
      contextValue: "resourceAlias",
    });
  });
  item.bindables.forEach((bindable, index) => {
    const description: string[] = [];
    if (bindable.valueType != null) description.push(`: ${bindable.valueType}`);
    if (bindable.primary) description.push("primary");
    if (bindable.mode !== "default") description.push(bindable.mode);
    children.push({
      nodeKind: "bindable",
      id: prefixedId(idPrefix, `${item.id}:bindable:${index}:${bindable.name}`),
      label: bindable.attribute === bindable.name
        ? bindable.name
        : `${bindable.name} (${bindable.attribute})`,
      description: description.join(" | "),
      tooltip: bindable.source?.label,
      iconId: "symbol-field",
      collapsible: false,
      resourceUri: item.uri ?? undefined,
      contextValue: "bindable",
    });
  });
  item.visibility.forEach((visibility, index) => {
    children.push({
      nodeKind: "visibility",
      id: prefixedId(idPrefix, `${item.id}:visibility:${index}`),
      label: visibility.visibilityKind,
      description: visibility.compilerWorld,
      tooltip: visibility.source?.label,
      iconId: visibility.visibilityKind === "open" ? "warning" : "eye",
      collapsible: false,
      resourceUri: visibility.uri ?? undefined,
      contextValue: "resourceVisibility",
    });
  });
  if (item.uri != null && item.origin === "project") {
    children.push({
      nodeKind: "info",
      id: prefixedId(idPrefix, `${item.id}:file`),
      label: shortSourcePath(item.source?.path ?? item.uri),
      iconId: "file-code",
      collapsible: false,
      resourceUri: item.uri,
      contextValue: "fileLink",
    });
  }

  const description: string[] = [];
  const definition = item.definition;
  const targetName = definition?.targetName;
  if (targetName != null && targetName !== item.name) description.push(targetName);
  if (definition != null && definition.declarationModes.length > 0) {
    description.push(definition.declarationModes.join(", "));
  }
  description.push(resourceVisibilitySummary(item));
  if (item.bindables.length > 0) {
    description.push(`${item.bindables.length} bindable${item.bindables.length === 1 ? "" : "s"}`);
  }
  if (item.package != null) description.push(item.package);

  return {
    nodeKind: "resource",
    id: prefixedId(idPrefix, item.id),
    label: item.name,
    description: description.join(" | "),
    tooltip: buildResourceTooltip(item),
    iconId: resourceIcon(item),
    collapsible: children.length > 0,
    children,
    resourceUri: item.uri ?? undefined,
    contextValue: "resource",
  };
}

function explorerGroup(item: ResourceExplorerItem): ExplorerGroup {
  return item.origin === "unknown" ? "external" : item.origin;
}

function resourceVisibilitySummary(item: ResourceExplorerItem): string {
  if (item.visibility.length === 0) return "not visible in current app";
  const worlds = new Set(item.visibility.map((row) => row.compilerWorld)).size;
  const unresolved = item.visibility.some((row) => row.visibilityKind === "open");
  const onlyLocal = item.visibility.every((row) =>
    row.visibilityKind === "local" || row.visibilityKind === "routeable"
  );
  const base = onlyLocal
    ? `local in ${worlds} compiler world${worlds === 1 ? "" : "s"}`
    : `visible in ${worlds} compiler world${worlds === 1 ? "" : "s"}`;
  return unresolved ? `${base}; some visibility unresolved` : base;
}

function resourceIcon(item: ResourceExplorerItem): string {
  if (item.visibility.some((row) => row.visibilityKind === "open")) return "warning";
  if (item.visibility.length === 0) return "circle-slash";
  if (item.visibility.every((row) => row.visibilityKind === "local" || row.visibilityKind === "routeable")) {
    return "lock";
  }
  return KIND_ICONS[item.kind] ?? "symbol-misc";
}

function buildResourceTooltip(item: ResourceExplorerItem): string {
  const lines = [`${item.kind}: ${item.name}`, `Origin: ${item.origin}`];
  const definition = item.definition;
  if (definition?.targetName != null) lines.push(`Class: ${definition.targetName}`);
  if (item.aliases.length > 0) lines.push(`Aliases: ${item.aliases.map((alias) => alias.name).join(", ")}`);
  if (definition?.key != null) lines.push(`Registration key: ${definition.key}`);
  if (definition != null && definition.declarationModes.length > 0) {
    lines.push(`Declaration: ${definition.declarationModes.join(", ")}`);
  }
  lines.push(`Visibility: ${resourceVisibilitySummary(item)}`);
  for (const visibility of item.visibility) {
    lines.push(`  ${visibility.visibilityKind}: ${visibility.compilerWorld}`);
  }
  if (item.source != null) lines.push(`Source: ${item.source.label}`);
  if (item.uri != null) lines.push(`URI: ${item.uri}`);
  if (item.package != null) lines.push(`Package: ${item.package}`);
  return lines.join("\n");
}

function resourceSummary(resources: readonly ResourceExplorerItem[], templateCount: number): string {
  const parts = [`${resources.length} resources`];
  for (const group of GROUP_ORDER) {
    const count = resources.filter((resource) => explorerGroup(resource) === group).length;
    if (count > 0) parts.push(`${count} ${group}`);
  }
  if (templateCount > 0) parts.push(`${templateCount} templates`);
  return parts.join(" | ");
}

function resourceEvidenceConcern(input: WorkspaceTreeInput["evidence"]): string | null {
  if (input == null) return null;
  const concerns = Object.entries(input)
    .filter(([, answer]) => answer.result !== "answered" || answer.coverage !== "complete")
    .map(([name, answer]) => `${name}: ${answer.summary}`);
  return concerns.length === 0 ? null : concerns.join("\n");
}

function workspaceErrorNode(
  workspace: Extract<ResourceExplorerWorkspace, { status: "error" }>,
  idPrefix: string,
): TreeNode {
  return infoNode(
    prefixedId(idPrefix, "error"),
    "Resource analysis failed",
    "error",
    `${workspace.name}: ${workspace.error}`,
  );
}

function infoNode(id: string, label: string, iconId: string, tooltip?: string): TreeNode {
  return { nodeKind: "info", id, label, iconId, tooltip, collapsible: false, contextValue: "summary" };
}

function shortSourcePath(file: string): string {
  return file.replace(/^.*[\\/]packages[\\/]/, "").replace(/^.*[\\/]src[\\/]/, "src/");
}

function prefixedId(prefix: string, id: string): string {
  return prefix === "" ? id : `${prefix}:${id}`;
}

export class ResourceExplorerProvider implements TreeDataProvider<TreeNode>, DisposableLike {
  readonly #vscode: VscodeApi;
  readonly #lsp: LspFacade;
  readonly #logger: ClientLogger;
  readonly #changeEmitter: { readonly event: Event<void>; fire(): void; dispose(): void };
  #tree: readonly TreeNode[] = [];
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

  dispose(): void {
    this.#refreshGeneration += 1;
    this.#tree = [];
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
    if (element.resourceUri != null) {
      item.command = {
        title: "Open",
        command: "vscode.open",
        arguments: [this.#vscode.Uri.parse(element.resourceUri)],
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
    try {
      this.#logger.debug("resourceExplorer.refresh.start");
      const response = await this.#lsp.getResources();
      if (generation !== this.#refreshGeneration) return;
      this.#tree = response == null
        ? [infoNode("no-data", "No active Aurelia workspace", "info")]
        : buildTree(response);
      this.#changeEmitter.fire();
      this.#logger.debug("resourceExplorer.refresh.complete", {
        resources: response?.resources.length ?? 0,
        failedWorkspaces: response?.workspaces.filter((workspace) => workspace.status === "error").length ?? 0,
      });
    } catch (error) {
      if (generation !== this.#refreshGeneration) return;
      this.#logger.warn("resourceExplorer.refresh.failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      this.#tree = [infoNode("error", "Failed to load resource inventory", "error", String(error))];
      this.#changeEmitter.fire();
    }
  }
}
