import type {
  ResourceInventoryItem,
  ResourceInventoryKind,
  ResourceProject,
  ResourceSourceTarget,
} from "@aurelia-ls/language-server/protocol";
import type { AureliaWorkspaceIdentity } from "../../types.js";

export interface ResourceKindPresentation {
  readonly plural: string;
  readonly singular: string;
  readonly icon: string;
  readonly order: number;
}

const RESOURCE_KIND_PRESENTATION = {
  "custom-element": { plural: "Elements", singular: "element", icon: "symbol-class", order: 0 },
  "template-controller": { plural: "Template Controllers", singular: "template controller", icon: "symbol-struct", order: 1 },
  "custom-attribute": { plural: "Attributes", singular: "attribute", icon: "symbol-property", order: 2 },
  "value-converter": { plural: "Value Converters", singular: "value converter", icon: "symbol-function", order: 3 },
  "binding-behavior": { plural: "Binding Behaviors", singular: "binding behavior", icon: "symbol-event", order: 4 },
} as const satisfies Record<ResourceInventoryKind, ResourceKindPresentation>;

export const RESOURCE_KIND_ORDER = (Object.keys(RESOURCE_KIND_PRESENTATION) as ResourceInventoryKind[])
  .sort((left, right) => RESOURCE_KIND_PRESENTATION[left].order - RESOURCE_KIND_PRESENTATION[right].order);

export function resourceKindPresentation(kind: ResourceInventoryKind): ResourceKindPresentation {
  return RESOURCE_KIND_PRESENTATION[kind];
}

export function resourceDescription(resource: ResourceInventoryItem): string {
  const parts = [resourceOriginLabel(resource)];
  const source = sourceLabel(resource.sources.publicName)
    ?? sourceLabel(resource.sources.implementation)
    ?? sourceLabel(resource.sources.declaration);
  if (source != null) parts.push(source);
  if (resource.navigation.state === "unavailable") parts.push("source location unavailable");
  return parts.join(" · ");
}

export function resourceOriginLabel(resource: ResourceInventoryItem): string {
  if (resource.locality.kind === "local-template") {
    return `local to ${resource.locality.ownerName ?? "template"}`;
  }
  switch (resource.origin.kind) {
    case "project":
      return "project";
    case "package":
      return resource.origin.packageName ?? "package";
    case "framework":
      return resource.origin.packageName == null
        ? "Aurelia framework"
        : `Aurelia framework · ${resource.origin.packageName}`;
    case "external":
      return "external";
    case "unknown":
      return "origin unknown";
  }
}

export function resourceTooltip(
  resource: ResourceInventoryItem,
  project: ResourceProject,
  workspace: AureliaWorkspaceIdentity,
): string {
  const kind = resourceKindPresentation(resource.kind);
  const lines = [
    `${kind.singular}: ${resource.name}`,
    `Origin: ${resourceOriginLabel(resource)}`,
    `Project: ${project.projectKey}`,
  ];
  if (workspace.name !== project.projectKey) lines.push(`Workspace: ${workspace.name}`);
  if (resource.aliases.length > 0) lines.push(`Aliases: ${resource.aliases.map((alias) => alias.name).join(", ")}`);
  if (resource.bindables.length > 0) {
    lines.push(`Bindables: ${resource.bindables.map((bindable) =>
      bindable.attribute === bindable.name ? bindable.name : `${bindable.name} (${bindable.attribute})`
    ).join(", ")}`);
  }
  lines.push(`Metadata: ${resource.metadataState}`);
  const source = sourceLabel(resource.sources.publicName)
    ?? sourceLabel(resource.sources.implementation)
    ?? sourceLabel(resource.sources.declaration);
  if (source != null) lines.push(`Source: ${source}`);
  if (resource.navigation.state === "unavailable") {
    lines.push(`Navigation: unavailable (${resource.navigation.reason})`);
  }
  return lines.join("\n");
}

export function resourceQuickPickDetail(
  resource: ResourceInventoryItem,
  project: ResourceProject,
  workspace: AureliaWorkspaceIdentity,
  includeOwner: boolean,
): string {
  const parts: string[] = [];
  if (resource.aliases.length > 0) {
    parts.push(`aliases: ${resource.aliases.map((alias) => alias.name).join(", ")}`);
  }
  if (resource.bindables.length > 0) {
    parts.push(`bindables: ${resource.bindables.map((bindable) =>
      bindable.attribute === bindable.name ? bindable.name : `${bindable.name}/${bindable.attribute}`
    ).join(", ")}`);
  }
  if (includeOwner) parts.push(`${workspace.name} · ${project.projectKey}`);
  const source = sourceLabel(resource.sources.publicName)
    ?? sourceLabel(resource.sources.implementation)
    ?? sourceLabel(resource.sources.declaration);
  if (source != null) parts.push(source);
  return parts.join(" · ");
}

export function sourceLabel(source: ResourceSourceTarget): string | null {
  return source.state === "available" ? source.location.label : null;
}
