import type {
  ResourceInventoryItem,
  ResourceInventoryKind,
  ResourceProject,
  ResourceSourceTarget,
  TemplateResourceAvailabilityItem,
  TemplateResourceScopeCandidate,
} from "@aurelia-ls/language-server/protocol";
import type { AureliaWorkspaceIdentity } from "../../types.js";

export interface ResourceKindPresentation {
  readonly plural: string;
  readonly singular: string;
  readonly order: number;
  /** Native Codicon used only for this resource-kind group in the Resource Explorer. */
  readonly groupIcon: ResourceKindGroupIconId;
}

export type ResourceKindGroupIconId =
  | "tag"
  | "symbol-structure"
  | "symbol-property"
  | "arrow-swap"
  | "tools";

/**
 * Stable tree-role grammar for the Resource Explorer.
 *
 * These icons describe what a non-category row does in the tree. Resource-kind
 * group icons belong to `ResourceKindPresentation` so each category has one
 * distinct, theme-aware visual identity. Neither policy uses color to imply
 * health.
 */
export const RESOURCE_EXPLORER_ROLE_ICONS = {
  project: "project",
  resource: "code",
  alias: "link",
  bindable: "plug",
} as const;

export type ResourceTreeRowState = "out-of-date" | "discovery-incomplete";

export interface ResourcePresentationContext {
  readonly project?: ResourceProject;
  readonly workspace?: AureliaWorkspaceIdentity;
  readonly requireOwnerScent?: boolean;
  readonly ownerScent?: string;
  readonly states?: readonly ResourceTreeRowState[];
}

export interface ResourceCollisionScentCandidate<T> {
  /** The authored token whose duplicate rows need a visible distinction. */
  readonly token: string;
  /** Closed, author-facing resource role, such as "element" or "alias for element card". */
  readonly roleLabel: string;
  /** Short project/root context prepared by the caller. */
  readonly projectLabel: string;
  /** Best exact authored source for this row, when one exists. */
  readonly source: ResourceSourceTarget;
  /** Stable internal ordering only; it is never emitted. */
  readonly stableKey: string;
  readonly value: T;
}

export interface ResourceProjectRootScentCandidate<T> {
  readonly rootUri: string;
  /** Stable internal ordering only; it is never emitted. */
  readonly stableKey: string;
  readonly value: T;
}

export interface TemplateScopeQuickPickPresentation {
  readonly template: TemplateResourceScopeCandidate;
  readonly label: string;
  readonly description: string;
  readonly detail: string;
}

const RESOURCE_KIND_PRESENTATION = {
  "custom-element": { plural: "Elements", singular: "element", order: 0, groupIcon: "tag" },
  "template-controller": {
    plural: "Template Controllers",
    singular: "template controller",
    order: 1,
    groupIcon: "symbol-structure",
  },
  "custom-attribute": { plural: "Attributes", singular: "attribute", order: 2, groupIcon: "symbol-property" },
  "value-converter": { plural: "Value Converters", singular: "value converter", order: 3, groupIcon: "arrow-swap" },
  "binding-behavior": { plural: "Binding Behaviors", singular: "binding behavior", order: 4, groupIcon: "tools" },
} as const satisfies Record<ResourceInventoryKind, ResourceKindPresentation>;

export const RESOURCE_KIND_ORDER = (Object.keys(RESOURCE_KIND_PRESENTATION) as ResourceInventoryKind[])
  .sort((left, right) => RESOURCE_KIND_PRESENTATION[left].order - RESOURCE_KIND_PRESENTATION[right].order);

export function resourceKindPresentation(kind: ResourceInventoryKind): ResourceKindPresentation {
  return RESOURCE_KIND_PRESENTATION[kind];
}

/** Closed, author-facing copy for semantic project topology. */
export function resourceProjectShapeLabel(shapeKind: ResourceProject["shapeKind"]): string {
  switch (shapeKind) {
    case "aurelia-app":
      return "Aurelia application";
    case "aurelia-resource-library":
      return "Aurelia resource library";
    case "aurelia-package":
      return "Aurelia package";
    case "non-aurelia":
      return "Project without an Aurelia entry point";
  }
}

/** Minimal URI-scheme-safe project-root scent for visible chooser copy. */
export function resourceProjectRootScent(
  rootUri: string,
  peerRootUris: readonly string[] = [],
): string {
  const target = uriScent(rootUri);
  const peers = peerRootUris.map(uriScent);
  const maximumDepth = Math.max(1, Math.min(2, target.path.length));
  for (let depth = 1; depth <= maximumDepth; depth += 1) {
    const suffix = target.path.slice(-depth).join("/") || target.authority || "project root";
    const authorityScent = target.authority == null ? suffix : `${target.authority} · ${suffix}`;
    if (peers.every((peer) => peer.rootUri === rootUri || (
      peer.path.slice(-depth).join("/") !== suffix
      && (target.authority == null || `${peer.authority ?? ""} · ${peer.path.slice(-depth).join("/")}` !== authorityScent)
    ))) {
      return suffix;
    }
    if (target.authority != null && peers.every((peer) =>
      peer.rootUri === rootUri
      || `${peer.authority ?? ""} · ${peer.path.slice(-depth).join("/")}` !== authorityScent)) {
      return authorityScent;
    }
  }
  const fallback = target.path.slice(-2).join("/") || target.authority || "project root";
  return target.authority == null ? fallback : `${target.authority} · ${fallback}`;
}

export function resourceProjectRootScentMap<T>(
  candidates: readonly ResourceProjectRootScentCandidate<T>[],
): ReadonlyMap<T, string> {
  const roots = candidates.map((candidate) => candidate.rootUri);
  const base = new Map(candidates.map((candidate) => [
    candidate,
    resourceProjectRootScent(candidate.rootUri, roots),
  ]));
  const result = new Map<T, string>();
  for (const candidate of candidates) {
    const scent = base.get(candidate)!;
    const peers = candidates.filter((peer) => base.get(peer) === scent);
    if (peers.length === 1) {
      result.set(candidate.value, scent);
      continue;
    }
    const ordered = [...peers].sort((left, right) =>
      left.rootUri.localeCompare(right.rootUri) || left.stableKey.localeCompare(right.stableKey)
    );
    result.set(candidate.value, `${scent} · project ${ordered.indexOf(candidate) + 1} of ${ordered.length}`);
  }
  return result;
}

/**
 * Produces one short, public, input-order-independent scent for every duplicate
 * authored token. Internal identities are used only as a final stable sort key;
 * they are never exposed in the returned copy.
 */
export function resourceCollisionScentMap<T>(
  candidates: readonly ResourceCollisionScentCandidate<T>[],
): ReadonlyMap<T, string> {
  const result = new Map<T, string>();
  const groups = new Map<string, ResourceCollisionScentCandidate<T>[]>();
  for (const candidate of candidates) {
    const group = groups.get(candidate.token);
    if (group == null) groups.set(candidate.token, [candidate]);
    else group.push(candidate);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const renderers: Array<(candidate: ResourceCollisionScentCandidate<T>) => string> = [
      (candidate) => candidate.roleLabel,
      (candidate) => `${candidate.roleLabel} · ${candidate.projectLabel}`,
    ];
    for (let depth = 1; depth <= 3; depth += 1) {
      renderers.push(
        (candidate) => `${candidate.roleLabel} · ${sourcePathScent(candidate.source, depth, false)}`,
        (candidate) => `${candidate.roleLabel} · ${candidate.projectLabel} · ${sourcePathScent(candidate.source, depth, false)}`,
      );
    }
    for (let depth = 1; depth <= 2; depth += 1) {
      renderers.push(
        (candidate) => `${candidate.roleLabel} · ${sourcePathScent(candidate.source, depth, true)}`,
        (candidate) => `${candidate.roleLabel} · ${candidate.projectLabel} · ${sourcePathScent(candidate.source, depth, true)}`,
      );
    }
    renderers.push(
      (candidate) => `${candidate.roleLabel} · ${candidate.projectLabel} · ${sourceRangeScent(candidate.source)}`,
    );
    const renderer = renderers.find((render) => new Set(group.map(render)).size === group.length);
    if (renderer != null) {
      for (const candidate of group) result.set(candidate.value, renderer(candidate));
      continue;
    }
    const ordered = [...group].sort((left, right) =>
      collisionStableFacts(left).localeCompare(collisionStableFacts(right))
      || left.stableKey.localeCompare(right.stableKey)
    );
    for (const [index, candidate] of ordered.entries()) {
      result.set(
        candidate.value,
        `${candidate.roleLabel} · ${candidate.projectLabel} · entry ${index + 1} of ${ordered.length}`,
      );
    }
  }
  return result;
}

/**
 * Produces stable, public chooser copy for template scopes, including an exact
 * range or ordinal distinction when their authored names and owners collide.
 */
export function templateScopeQuickPickPresentations(
  candidates: readonly TemplateResourceScopeCandidate[],
  projectContext: string,
): readonly TemplateScopeQuickPickPresentation[] {
  const scents = resourceCollisionScentMap(candidates.map((template) => ({
    token: template.definitionName,
    roleLabel: templateScopeRoleLabel(template),
    projectLabel: projectContext,
    source: template.source,
    stableKey: template.scopeIdentityKey,
    value: template,
  })));
  return [...candidates]
    .sort((left, right) =>
      left.definitionName.localeCompare(right.definitionName)
      || left.scopeIdentityKey.localeCompare(right.scopeIdentityKey)
    )
    .map((template) => {
      const role = templateScopeRoleLabel(template);
      const scent = scents.get(template);
      return {
        template,
        label: template.definitionName,
        description: [role, scent == null ? null : `distinguished by ${scent}`]
          .filter((value): value is string => value != null)
          .join(" · "),
        detail: `${projectContext} · ${resourceSourceLocationScent(template.source)}`,
      };
    });
}

function templateScopeRoleLabel(template: TemplateResourceScopeCandidate): string {
  return template.compilationLane === "authoring" ? "authoring template" : "application template";
}

/** Closed, author-facing copy for the semantic visibility reason. */
export function resourceAvailabilityReasonLabel(
  visibilityKind: TemplateResourceAvailabilityItem["visibilityKind"],
): string {
  switch (visibilityKind) {
    case "local":
      return "local";
    case "inherited":
      return "inherited";
    case "configured":
      return "configured";
    case "app-root":
      return "application root";
    case "routeable":
      return "routeable";
    case "open":
      return "availability uncertain";
  }
}

export function resourceTreeRowStateLabel(state: ResourceTreeRowState): string {
  switch (state) {
    case "out-of-date":
      return "out of date";
    case "discovery-incomplete":
      return "discovery incomplete";
  }
}

export function resourceMetadataStateLabel(
  metadataState: ResourceInventoryItem["metadataState"],
): string {
  switch (metadataState) {
    case "full-definition":
      return "details complete";
    case "header-only":
      return "details incomplete";
    case "visibility-only":
      return "declaration not resolved";
  }
}

export function resourceDescription(
  resource: ResourceInventoryItem,
  context: ResourcePresentationContext = {},
): string {
  const parts = [resourceOriginLabel(resource)];
  if (context.requireOwnerScent === true && context.project != null) {
    parts.push(context.ownerScent ?? (context.workspace == null
      ? context.project.projectKey
      : `${context.workspace.name} · ${context.project.projectKey}`));
  }
  const sourceTarget = preferredResourceSource(resource);
  const source = sourceLabel(sourceTarget);
  if (source != null) parts.push(source);
  if (context.requireOwnerScent === true && sourceTarget.state === "available") {
    const uriScent = sourceUriScent(sourceTarget.location.uri);
    if (uriScent != null && source?.includes(uriScent) !== true) parts.push(uriScent);
  }
  if (resource.metadataState !== "full-definition") {
    parts.push(resourceMetadataStateLabel(resource.metadataState));
  }
  if (resource.navigation.state === "unavailable") parts.push("source location unavailable");
  for (const state of context.states ?? []) parts.push(resourceTreeRowStateLabel(state));
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
  states: readonly ResourceTreeRowState[] = [],
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
  lines.push(`Metadata: ${resourceMetadataStateLabel(resource.metadataState)}`);
  const source = sourceLabel(resource.sources.publicName)
    ?? sourceLabel(resource.sources.implementation)
    ?? sourceLabel(resource.sources.declaration);
  if (source != null) lines.push(`Source: ${source}`);
  if (resource.navigation.state === "unavailable") {
    lines.push("Navigation: source location unavailable");
  }
  for (const state of states) lines.push(`State: ${resourceTreeRowStateLabel(state)}`);
  return lines.join("\n");
}

export function resourceAccessibilityLabel(
  resource: ResourceInventoryItem,
  project: ResourceProject,
  workspace: AureliaWorkspaceIdentity,
  states: readonly ResourceTreeRowState[] = [],
  collisionScent?: string,
): string {
  const kind = resourceKindPresentation(resource.kind);
  const facts = [
    `${kind.singular} ${resource.name}`,
    `origin ${resourceOriginLabel(resource)}`,
    `project ${project.projectKey}`,
  ];
  if (workspace.name !== project.projectKey) facts.push(`workspace ${workspace.name}`);
  if (collisionScent != null) facts.push(`distinguished by ${collisionScent}`);
  if (resource.aliases.length > 0) facts.push(`aliases ${resource.aliases.map((alias) => alias.name).join(", ")}`);
  if (resource.bindables.length > 0) {
    facts.push(`bindables ${resource.bindables.map((bindable) =>
      bindable.attribute === bindable.name ? bindable.name : `${bindable.name}, public attribute ${bindable.attribute}`
    ).join(", ")}`);
  }
  facts.push(resourceMetadataStateLabel(resource.metadataState));
  const source = sourceLabel(resource.sources.publicName)
    ?? sourceLabel(resource.sources.implementation)
    ?? sourceLabel(resource.sources.declaration);
  facts.push(source == null ? "source location unavailable" : `source ${source}`);
  if (resource.navigation.state === "unavailable") facts.push("navigation unavailable");
  for (const state of states) facts.push(resourceTreeRowStateLabel(state));
  return `${facts.join(". ")}.`;
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
  if (includeOwner) parts.push(`workspace: ${workspace.name} · project: ${project.projectKey}`);
  const source = sourceLabel(resource.sources.publicName)
    ?? sourceLabel(resource.sources.implementation)
    ?? sourceLabel(resource.sources.declaration);
  if (source != null) parts.push(source);
  if (resource.metadataState !== "full-definition") {
    parts.push(resourceMetadataStateLabel(resource.metadataState));
  }
  return parts.join(" · ");
}

export function sourceLabel(source: ResourceSourceTarget): string | null {
  return source.state === "available" ? authorFacingSourceLabel(source.location.label) : null;
}

export function resourceSourceLocationScent(source: ResourceSourceTarget): string {
  if (source.state !== "available") return "source unavailable";
  const start = source.location.range.start;
  return `${authorFacingSourceLabel(source.location.label)} · line ${start.line + 1}, column ${start.character + 1}`;
}

function authorFacingSourceLabel(raw: string): string {
  const normalized = raw
    .replace(/\p{Cc}+/gu, " ")
    .trim()
    .replace(/@\d+\.\.\d+$/u, "")
    .trim();
  if (normalized.length === 0) return "source";
  if (/^@[^/\s]+\/[^/\s]+$/u.test(normalized)) return normalized;
  const path = publicLabelPath(normalized);
  if (path == null) return normalized;
  return path.slice(-3).join("/");
}

function publicLabelPath(label: string): readonly string[] | null {
  try {
    const parsed = new URL(label);
    if (label.includes("://")) {
      const path = decodeURIComponent(parsed.pathname)
        .split("/")
        .filter((part) => part.length > 0 && !/^[A-Za-z]:$/u.test(part));
      return path.length > 0 ? path : null;
    }
  } catch {
    // Non-URI labels continue through the bounded path check below.
  }
  const normalized = label.replace(/\\/gu, "/");
  const looksLikePath = normalized.includes("/") && (
    normalized.startsWith("/")
    || normalized.startsWith("./")
    || normalized.startsWith("../")
    || /^[A-Za-z]:\//u.test(normalized)
    || /\.[A-Za-z0-9]+(?::\d+(?::\d+)?)?$/u.test(normalized)
  );
  if (!looksLikePath) return null;
  return normalized.split("/").filter((part) => part.length > 0 && !/^[A-Za-z]:$/u.test(part));
}

export function preferredResourceSource(resource: ResourceInventoryItem): ResourceSourceTarget {
  for (const source of [
    resource.sources.publicName,
    resource.sources.implementation,
    resource.sources.declaration,
  ]) {
    if (source.state === "available") return source;
  }
  return resource.sources.publicName;
}

function sourcePathScent(source: ResourceSourceTarget, depth: number, includeAnchor: boolean): string {
  if (source.state !== "available") return "source unavailable";
  const uri = uriScent(source.location.uri);
  const suffix = uri.path.slice(-depth).join("/") || "source";
  if (!includeAnchor) return suffix;
  const anchor = uri.authority ?? driveScent(uri.path);
  return anchor == null ? suffix : `${anchor} · ${suffix}`;
}

function sourceRangeScent(source: ResourceSourceTarget): string {
  if (source.state !== "available") return "source unavailable";
  const start = source.location.range.start;
  return `${sourcePathScent(source, 2, true)} · line ${start.line + 1}, column ${start.character + 1}`;
}

function collisionStableFacts<T>(candidate: ResourceCollisionScentCandidate<T>): string {
  if (candidate.source.state !== "available") {
    return `${candidate.roleLabel}\u0000${candidate.projectLabel}\u0000source unavailable`;
  }
  const start = candidate.source.location.range.start;
  const end = candidate.source.location.range.end;
  return [
    candidate.roleLabel,
    candidate.projectLabel,
    candidate.source.location.uri,
    start.line,
    start.character,
    end.line,
    end.character,
  ].join("\u0000");
}

function driveScent(path: readonly string[]): string | null {
  const first = path[0];
  return first != null && /^[A-Za-z]:$/u.test(first) ? first.toUpperCase() : null;
}

function sourceUriScent(uri: string): string | null {
  try {
    const parsed = new URL(uri);
    const parts = decodeURIComponent(parsed.pathname).split("/").filter(Boolean);
    return parts.slice(-2).join("/") || parsed.host || null;
  } catch {
    const parts = uri.split(/[\\/]/u).filter(Boolean);
    return parts.slice(-2).join("/") || null;
  }
}

function uriScent(rootUri: string): {
  readonly rootUri: string;
  readonly authority: string | null;
  readonly path: readonly string[];
} {
  try {
    const parsed = new URL(rootUri);
    return {
      rootUri,
      authority: parsed.host || null,
      path: decodeURIComponent(parsed.pathname).split("/").filter(Boolean),
    };
  } catch {
    return {
      rootUri,
      authority: null,
      path: rootUri.split(/[\\/]/u).filter(Boolean),
    };
  }
}
