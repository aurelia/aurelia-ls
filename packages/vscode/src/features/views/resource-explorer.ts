/**
 * Resource Explorer TreeView — persistent ambient revelation surface.
 *
 * Shows all discovered Aurelia resources with kind, confidence, gap count,
 * and bindables. Organized by kind (Elements, Attributes, Controllers,
 * Value Converters, Binding Behaviors). Click to navigate to source.
 *
 * Derived from: capability map (Visualize × IDE), experience thesis
 * (Discovery + Revelation reward types), feature principle #4 (gaps are
 * information), market thesis C6 (real-time feedback).
 */
import type { TreeDataProvider, TreeItem, ProviderResult, Event } from "vscode";
import type { VscodeApi } from "../../vscode-api.js";
import type { LspFacade } from "../../core/lsp-facade.js";
import type { ClientLogger } from "../../log.js";
import type { ResourceExplorerItem, ResourceExplorerResponse } from "../../types.js";
import { SimpleEmitter } from "../../core/events.js";

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

type TreeNodeKind = "root" | "kind-group" | "resource" | "bindable" | "info";

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
  const byKind = new Map<string, ResourceExplorerItem[]>();
  for (const resource of response.resources) {
    const group = byKind.get(resource.kind);
    if (group) {
      group.push(resource);
    } else {
      byKind.set(resource.kind, [resource]);
    }
  }

  const groups: TreeNode[] = [];
  for (const kind of KIND_ORDER) {
    const items = byKind.get(kind);
    if (!items || items.length === 0) continue;

    const children = items.map((item) => buildResourceNode(item));
    const label = KIND_LABELS[kind] ?? kind;
    groups.push({
      nodeKind: "kind-group",
      id: `kind:${kind}`,
      label: `${label} (${items.length})`,
      iconId: KIND_ICONS[kind] ?? "symbol-misc",
      collapsible: true,
      children,
      contextValue: "kindGroup",
    });
  }

  // Summary info at the bottom
  const totalResources = response.resources.length;
  const totalGaps = response.resources.reduce((sum, r) => sum + r.gapCount, 0);
  const totalBindables = response.resources.reduce((sum, r) => sum + r.bindableCount, 0);

  const summaryParts = [`${totalResources} resources`, `${totalBindables} bindables`];
  if (response.templateCount > 0) summaryParts.push(`${response.templateCount} templates`);
  if (totalGaps > 0) summaryParts.push(`${totalGaps} gaps`);

  groups.push({
    nodeKind: "info",
    id: "summary",
    label: summaryParts.join(" | "),
    iconId: "info",
    collapsible: false,
    contextValue: "summary",
  });

  return groups;
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

  // Source file info
  if (item.file) {
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
  if (item.bindableCount > 0) descParts.push(`${item.bindableCount} bindable${item.bindableCount === 1 ? "" : "s"}`);
  if (item.gapCount > 0) descParts.push(`${item.gapCount} gap${item.gapCount === 1 ? "" : "s"}`);
  if (item.package) descParts.push(item.package);

  return {
    nodeKind: "resource",
    id: `${item.kind}:${item.name}`,
    label: item.name,
    description: descParts.join(" | "),
    tooltip: buildResourceTooltip(item),
    iconId: KIND_ICONS[item.kind] ?? "symbol-misc",
    collapsible: children.length > 0,
    children,
    resourceFile: item.file,
    contextValue: "resource",
  };
}

function buildResourceTooltip(item: ResourceExplorerItem): string {
  const lines = [`${item.kind}: ${item.name}`];
  if (item.className) lines.push(`Class: ${item.className}`);
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
  #emitter: SimpleEmitter<void>;
  #changeEmitter: { fire: () => void; event: Event<void> };

  constructor(vscode: VscodeApi, lsp: LspFacade, logger: ClientLogger) {
    this.#vscode = vscode;
    this.#lsp = lsp;
    this.#logger = logger;
    this.#emitter = new SimpleEmitter<void>();

    // Create VS Code EventEmitter for tree refresh
    const eventEmitter = new vscode.EventEmitter<void>();
    this.#changeEmitter = { fire: () => eventEmitter.fire(), event: eventEmitter.event };
  }

  get onDidChangeTreeData(): Event<void> {
    return this.#changeEmitter.event;
  }

  getTreeItem(element: TreeNode): TreeItem {
    const item: TreeItem = { label: element.label };

    if (element.description) {
      item.description = element.description;
    }

    if (element.tooltip) {
      item.tooltip = element.tooltip;
    }

    if (element.iconId) {
      item.iconPath = new this.#vscode.ThemeIcon(element.iconId);
    }

    item.collapsibleState = element.collapsible
      ? this.#vscode.TreeItemCollapsibleState.Collapsed
      : this.#vscode.TreeItemCollapsibleState.None;

    // Click on resource → navigate to source file
    if (element.resourceFile && element.contextValue === "resource") {
      item.command = {
        title: "Open Resource",
        command: "vscode.open",
        arguments: [this.#vscode.Uri.file(element.resourceFile)],
      };
    }

    if (element.resourceFile && element.contextValue === "fileLink") {
      item.command = {
        title: "Open File",
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
