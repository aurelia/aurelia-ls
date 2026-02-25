/**
 * Resource Explorer TreeView — persistent ambient revelation surface.
 *
 * Shows all discovered Aurelia resources organized by origin (Project,
 * Packages, Framework) then by kind (Elements, Attributes, etc.).
 *
 * Origin-awareness matters because scope and trust are different:
 * - Project resources: your code, full confidence, navigate to source
 * - Package resources: third-party, may have gaps, package name shown
 * - Framework resources: built-in, always available, behavioral docs
 *
 * This maps to the two-level resource visibility from L1 scope-resolution:
 * global (root container) vs local (per-CE container). Local resources
 * show which CE owns them.
 *
 * Derived from: capability map (Visualize × IDE), experience thesis
 * (Discovery + Revelation), feature principle #4 (gaps are information),
 * L1 scope-resolution (two-level lookup), F2 declaration forms (origin).
 */
import type { TreeDataProvider, TreeItem, ProviderResult, Event } from "vscode";
import type { VscodeApi } from "../../vscode-api.js";
import type { LspFacade } from "../../core/lsp-facade.js";
import type { ClientLogger } from "../../log.js";
import type { ResourceExplorerItem, ResourceExplorerResponse, ResourceOrigin } from "../../types.js";
import { SimpleEmitter } from "../../core/events.js";

const ORIGIN_LABELS: Record<ResourceOrigin, string> = {
  project: "Project",
  package: "Packages",
  framework: "Framework",
};

const ORIGIN_ICONS: Record<ResourceOrigin, string> = {
  project: "home",
  package: "package",
  framework: "library",
};

const ORIGIN_ORDER: ResourceOrigin[] = ["project", "package", "framework"];

const KIND_LABELS: Record<string, string> = {
  "custom-element": "Elements",
  "custom-attribute": "Attributes",
  "template-controller": "Controllers",
  "value-converter": "Value Converters",
  "binding-behavior": "Binding Behaviors",
};

const KIND_ICONS: Record<string, string> = {
  "custom-element": "symbol-class",
  "custom-attribute": "symbol-property",
  "template-controller": "symbol-struct",
  "value-converter": "symbol-function",
  "binding-behavior": "symbol-event",
};

const KIND_ORDER = [
  "custom-element",
  "template-controller",
  "custom-attribute",
  "value-converter",
  "binding-behavior",
];

type TreeNodeKind = "origin-group" | "kind-group" | "resource" | "bindable" | "info";

interface TreeNode {
  readonly nodeKind: TreeNodeKind;
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly tooltip?: string;
  readonly iconId?: string;
  readonly collapsible: boolean;
  readonly children?: TreeNode[];
  readonly resourceFile?: string;
  readonly contextValue?: string;
}

function buildTree(response: ResourceExplorerResponse): TreeNode[] {
  // Group by origin, then by kind within each origin
  const byOrigin = new Map<ResourceOrigin, Map<string, ResourceExplorerItem[]>>();

  for (const resource of response.resources) {
    let originMap = byOrigin.get(resource.origin);
    if (!originMap) {
      originMap = new Map();
      byOrigin.set(resource.origin, originMap);
    }
    const kindGroup = originMap.get(resource.kind);
    if (kindGroup) {
      kindGroup.push(resource);
    } else {
      originMap.set(resource.kind, [resource]);
    }
  }

  const tree: TreeNode[] = [];

  for (const origin of ORIGIN_ORDER) {
    const originMap = byOrigin.get(origin);
    if (!originMap || originMap.size === 0) continue;

    const originCount = Array.from(originMap.values()).reduce((sum, items) => sum + items.length, 0);
    const kindGroups: TreeNode[] = [];

    for (const kind of KIND_ORDER) {
      const items = originMap.get(kind);
      if (!items || items.length === 0) continue;

      const resourceNodes = items.map((item) => buildResourceNode(item));
      kindGroups.push({
        nodeKind: "kind-group",
        id: `${origin}:kind:${kind}`,
        label: `${KIND_LABELS[kind] ?? kind} (${items.length})`,
        iconId: KIND_ICONS[kind] ?? "symbol-misc",
        collapsible: true,
        children: resourceNodes,
        contextValue: "kindGroup",
      });
    }

    // If only one kind group in this origin, flatten it
    if (kindGroups.length === 1 && kindGroups[0]) {
      tree.push({
        nodeKind: "origin-group",
        id: `origin:${origin}`,
        label: `${ORIGIN_LABELS[origin]} — ${kindGroups[0].label}`,
        iconId: ORIGIN_ICONS[origin],
        collapsible: true,
        children: kindGroups[0].children,
        contextValue: "originGroup",
      });
    } else {
      tree.push({
        nodeKind: "origin-group",
        id: `origin:${origin}`,
        label: `${ORIGIN_LABELS[origin]} (${originCount})`,
        iconId: ORIGIN_ICONS[origin],
        collapsible: true,
        children: kindGroups,
        contextValue: "originGroup",
      });
    }
  }

  // Summary
  const totalResources = response.resources.length;
  const projectCount = response.resources.filter((r) => r.origin === "project").length;
  const packageCount = response.resources.filter((r) => r.origin === "package").length;
  const frameworkCount = response.resources.filter((r) => r.origin === "framework").length;
  const totalGaps = response.resources.reduce((sum, r) => sum + r.gapCount, 0);
  const localCount = response.resources.filter((r) => r.scope === "local").length;

  const summaryParts = [`${totalResources} resources`];
  if (projectCount > 0) summaryParts.push(`${projectCount} project`);
  if (packageCount > 0) summaryParts.push(`${packageCount} package`);
  if (frameworkCount > 0) summaryParts.push(`${frameworkCount} framework`);
  if (localCount > 0) summaryParts.push(`${localCount} local`);
  if (response.templateCount > 0) summaryParts.push(`${response.templateCount} templates`);
  if (totalGaps > 0) summaryParts.push(`${totalGaps} gaps`);

  tree.push({
    nodeKind: "info",
    id: "summary",
    label: summaryParts.join(" | "),
    iconId: "info",
    collapsible: false,
    contextValue: "summary",
  });

  return tree;
}

function buildResourceNode(item: ResourceExplorerItem): TreeNode {
  const children: TreeNode[] = [];

  // Bindables as children
  for (const b of item.bindables) {
    const parts: string[] = [];
    if (b.type) parts.push(`: ${b.type}`);
    if (b.primary) parts.push("(primary)");
    if (b.mode && b.mode !== "default") {
      parts.push(`[${b.mode}]`);
    }

    children.push({
      nodeKind: "bindable",
      id: `${item.kind}:${item.name}:bindable:${b.name}`,
      label: b.name,
      description: parts.join(" "),
      iconId: "symbol-field",
      collapsible: false,
      resourceFile: item.file,
      contextValue: "bindable",
    });
  }

  // Source file info (project resources)
  if (item.file && item.origin === "project") {
    const shortFile = item.file.replace(/^.*[\\/]packages[\\/]/, "").replace(/^.*[\\/]src[\\/]/, "src/");
    children.push({
      nodeKind: "info",
      id: `${item.kind}:${item.name}:file`,
      label: shortFile,
      iconId: "file-code",
      collapsible: false,
      resourceFile: item.file,
      contextValue: "fileLink",
    });
  }

  // Gap indicator
  if (item.gapCount > 0) {
    children.push({
      nodeKind: "info",
      id: `${item.kind}:${item.name}:gaps`,
      label: `${item.gapCount} gap${item.gapCount === 1 ? "" : "s"}`,
      iconId: "warning",
      collapsible: false,
      contextValue: "gapInfo",
    });
  }

  // Description line
  const descParts: string[] = [];
  if (item.className && item.className !== item.name) descParts.push(item.className);
  if (item.scope === "local") {
    descParts.push(item.scopeOwner ? `local to ${item.scopeOwner}` : "local");
  }
  if (item.bindableCount > 0) descParts.push(`${item.bindableCount} bindable${item.bindableCount === 1 ? "" : "s"}`);
  if (item.gapCount > 0) descParts.push(`${item.gapCount} gap${item.gapCount === 1 ? "" : "s"}`);
  if (item.package && item.origin === "package") descParts.push(item.package);

  return {
    nodeKind: "resource",
    id: `${item.kind}:${item.name}`,
    label: item.name,
    description: descParts.join(" | "),
    tooltip: buildResourceTooltip(item),
    iconId: item.scope === "local" ? "lock" : (KIND_ICONS[item.kind] ?? "symbol-misc"),
    collapsible: children.length > 0,
    children,
    resourceFile: item.file,
    contextValue: "resource",
  };
}

function buildResourceTooltip(item: ResourceExplorerItem): string {
  const lines = [`${item.kind}: ${item.name}`];
  if (item.className) lines.push(`Class: ${item.className}`);
  lines.push(`Origin: ${item.origin}`);
  lines.push(`Scope: ${item.scope}${item.scopeOwner ? ` (${item.scopeOwner})` : ""}`);
  if (item.file) lines.push(`File: ${item.file}`);
  if (item.package) lines.push(`Package: ${item.package}`);
  if (item.bindableCount > 0) lines.push(`Bindables: ${item.bindableCount}`);
  if (item.gapCount > 0) lines.push(`Gaps: ${item.gapCount}`);
  return lines.join("\n");
}

export class ResourceExplorerProvider implements TreeDataProvider<TreeNode> {
  #vscode: VscodeApi;
  #lsp: LspFacade;
  #logger: ClientLogger;
  #tree: TreeNode[] = [];
  #changeEmitter: { fire: () => void; event: Event<void> };

  constructor(vscode: VscodeApi, lsp: LspFacade, logger: ClientLogger) {
    this.#vscode = vscode;
    this.#lsp = lsp;
    this.#logger = logger;

    const eventEmitter = new vscode.EventEmitter<void>();
    this.#changeEmitter = { fire: () => eventEmitter.fire(), event: eventEmitter.event };
  }

  get onDidChangeTreeData(): Event<void> {
    return this.#changeEmitter.event;
  }

  getTreeItem(element: TreeNode): TreeItem {
    const item: TreeItem = { label: element.label };

    if (element.description) item.description = element.description;
    if (element.tooltip) item.tooltip = element.tooltip;
    if (element.iconId) item.iconPath = new this.#vscode.ThemeIcon(element.iconId);

    item.collapsibleState = element.collapsible
      ? (element.nodeKind === "origin-group"
        ? this.#vscode.TreeItemCollapsibleState.Expanded
        : this.#vscode.TreeItemCollapsibleState.Collapsed)
      : this.#vscode.TreeItemCollapsibleState.None;

    if (element.resourceFile && (element.contextValue === "resource" || element.contextValue === "fileLink")) {
      item.command = {
        title: "Open",
        command: "vscode.open",
        arguments: [this.#vscode.Uri.file(element.resourceFile)],
      };
    }

    item.contextValue = element.contextValue;
    return item;
  }

  getChildren(element?: TreeNode): ProviderResult<TreeNode[]> {
    if (!element) return this.#tree;
    return element.children ?? [];
  }

  async refresh(): Promise<void> {
    try {
      this.#logger.debug("resourceExplorer.refresh.start");
      const response = await this.#lsp.getResources();
      if (!response) {
        this.#tree = [{
          nodeKind: "info",
          id: "no-data",
          label: "No workspace data available",
          iconId: "info",
          collapsible: false,
        }];
      } else if (response.resources.length === 0) {
        this.#tree = [{
          nodeKind: "info",
          id: "empty",
          label: "No resources discovered yet",
          description: "Open an Aurelia template to trigger analysis",
          iconId: "info",
          collapsible: false,
        }];
      } else {
        this.#tree = buildTree(response);
      }
      this.#changeEmitter.fire();
      this.#logger.debug("resourceExplorer.refresh.complete", {
        resources: response?.resources.length ?? 0,
      });
    } catch (err) {
      this.#logger.warn(`resourceExplorer.refresh.failed: ${err instanceof Error ? err.message : String(err)}`);
      this.#tree = [{
        nodeKind: "info",
        id: "error",
        label: "Failed to load resources",
        iconId: "error",
        collapsible: false,
      }];
      this.#changeEmitter.fire();
    }
  }
}
