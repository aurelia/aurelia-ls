import type {
  ResourceInventoryItem,
  ResourceInventoryProjectResult,
  ResourceSourceLocation,
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
import { AureliaCommand, AureliaContext } from "../../product-contract.js";
import type {
  AureliaWorkspaceIdentity,
  ResourceInventorySnapshot,
  ResourceInventoryWorkspaceSnapshot,
  ResourceNavigationRequest,
} from "../../types.js";
import type { VscodeApi } from "../../vscode-api.js";
import {
  RESOURCE_KIND_ORDER,
  preferredResourceSource,
  resourceAccessibilityLabel,
  resourceCollisionScentMap,
  resourceDescription,
  resourceKindPresentation,
  resourceMetadataStateLabel,
  resourceOriginLabel,
  resourceProjectRootScent,
  resourceTooltip,
  resourceTreeRowStateLabel,
  sourceLabel,
  type ResourceCollisionScentCandidate,
  type ResourceTreeRowState,
} from "../resource-discovery/presentation.js";

type TreeNodeKind = "project" | "kind" | "resource" | "alias" | "bindable" | "info";
type ResourceExplorerPhase = { readonly kind: "empty" | "loading" | "current" | "failed" };

interface TreeNode {
  readonly nodeKind: TreeNodeKind;
  readonly id: string;
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly description?: string;
  readonly tooltip?: string;
  readonly iconId?: string;
  readonly collapsible: boolean;
  readonly defaultExpanded?: boolean;
  readonly children?: readonly TreeNode[];
  readonly navigation?: ResourceNavigationRequest;
  readonly implementationNavigation?: ResourceNavigationRequest;
  readonly retryWorkspaceKey?: string;
  readonly contextValue: string;
}

interface ReadyProjectInput {
  readonly workspace: AureliaWorkspaceIdentity;
  readonly fingerprint: string;
  readonly result: Extract<ResourceInventoryProjectResult, { status: "ready" }>;
  readonly states: readonly ResourceTreeRowState[];
  readonly projectScent: string;
  readonly collisionScents: ReadonlyMap<object, string>;
}

interface ProjectUnit {
  readonly workspace: ResourceInventoryWorkspaceSnapshot;
  readonly fingerprint: string | null;
  readonly result: ResourceInventoryProjectResult | null;
}

export type ResourceExplorerProgressRunner = <T>(task: () => Promise<T>) => PromiseLike<T>;
export type ResourceExplorerNavigationAction = "declaration" | "implementation" | "beside";

function buildTree(
  response: ResourceInventorySnapshot,
  staleWorkspaceKeys: ReadonlySet<string>,
  updatingAll: boolean,
  updatingWorkspaceKeys: ReadonlySet<string>,
): readonly TreeNode[] {
  const units = projectUnits(response);
  if (units.length === 0) {
    return [infoNode(
      "no-projects",
      "No Aurelia projects were discovered",
      "No admitted Aurelia project is currently available for resource discovery.",
      "info",
    )];
  }
  const labels = projectRootLabels(units);
  const rootContexts = projectRootContexts(units);
  const collisionScents = resourceCollisionScents(units, labels);
  if (units.length === 1) {
    return buildProjectUnit(
      units[0]!,
      rowStatesForUnit(units[0]!, staleWorkspaceKeys, updatingAll, updatingWorkspaceKeys),
      labels.get(units[0]!)!,
      collisionScents,
    );
  }
  return units.map((unit) => projectRootNode(
    unit,
    labels.get(unit)!,
    rootContexts.get(unit)!,
    staleWorkspaceKeys,
    updatingAll,
    updatingWorkspaceKeys,
    collisionScents,
  ));
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

function projectRootNode(
  unit: ProjectUnit,
  label: string,
  rootContext: string,
  staleWorkspaceKeys: ReadonlySet<string>,
  updatingAll: boolean,
  updatingWorkspaceKeys: ReadonlySet<string>,
  collisionScents: ReadonlyMap<object, string>,
): TreeNode {
  const result = unit.result;
  const states = rowStatesForUnit(unit, staleWorkspaceKeys, updatingAll, updatingWorkspaceKeys);
  const children = buildProjectUnit(unit, states, label, collisionScents);
  const answered = result?.status === "ready" && result.answer.result === "answered";
  const resourceCount = answered ? result.resources.length : 0;
  const failed = unit.workspace.status === "error"
    || result?.status === "error"
    || (result?.status === "ready" && result.answer.result === "failed");
  const description = unit.workspace.status === "ready" && result?.status === "ready"
    && result.answer.result !== "answered"
    ? statefulDescription(projectAnswerIssueDescription(result.answer.result), states)
    : failed
    ? statefulDescription("resources could not be loaded", states)
    : result == null
      ? statefulDescription("no Aurelia project", states)
      : projectCountDescription(resourceCount, projectResultIncomplete(result), states);
  const issueKind = projectIssueKind(unit, staleWorkspaceKeys);
  const accessibilityLabel = [
    `Aurelia project ${label}`,
    description,
    `root ${rootContext}`,
  ].join(". ") + ".";
  return {
    nodeKind: "project",
    id: projectPrefix(unit),
    label,
    description,
    accessibilityLabel,
    tooltip: failed
      ? `Aurelia project ${label}\nResources could not be loaded. Retry or open Aurelia Output for details.`
      : `Aurelia project ${label}\nRoot: ${rootContext}`,
    iconId: failed ? "error" : answered ? "root-folder" : "warning",
    collapsible: true,
    defaultExpanded: true,
    children,
    ...(issueKind === "recoverable" ? { retryWorkspaceKey: unit.workspace.key } : {}),
    contextValue: issueKind === "recoverable"
      ? "resourceProjectIssue"
      : issueKind === "unsupported"
        ? "resourceProjectUnsupported"
        : "resourceProject",
  };
}

function buildProjectUnit(
  unit: ProjectUnit,
  states: readonly ResourceTreeRowState[],
  projectScent: string,
  collisionScents: ReadonlyMap<object, string>,
): readonly TreeNode[] {
  if (unit.workspace.status === "error") {
    return [issueInfoNode(
      `${projectPrefix(unit)}:error`,
      "No current Aurelia resource inventory was returned",
      "The Aurelia language server did not return a current resource inventory for this workspace. Retry or open Aurelia Output for details.",
      "error",
      unit.workspace.key,
      states,
    )];
  }
  if (unit.result == null) {
    const args = [
      `${projectPrefix(unit)}:empty-project`,
      "No Aurelia project was discovered",
      "No admitted Aurelia project is currently available in this workspace.",
      "info",
    ] as const;
    return [states.includes("out-of-date")
      ? issueInfoNode(...args, unit.workspace.key, states)
      : infoNode(...args, states)];
  }
  if (unit.result.status === "error") {
    return [issueInfoNode(
      `${projectPrefix(unit)}:error`,
      `Aurelia project analysis did not complete for ${unit.result.project.projectKey}`,
      `Project analysis did not complete for ${unit.result.project.projectKey}. Retry or open Aurelia Output for details.`,
      "error",
      unit.workspace.key,
      states,
    )];
  }
  if (unit.result.answer.result !== "answered") {
    const copy = projectAnswerIssueCopy(unit.result.answer.result, unit.result.project.projectKey);
    const args = [
      `${projectPrefix(unit)}:${unit.result.answer.result}`,
      copy.label,
      copy.accessibilityLabel,
      unit.result.answer.result === "failed" ? "error" : "warning",
    ] as const;
    return [unit.result.answer.result === "unsupported"
      ? outputInfoNode(...args, states)
      : issueInfoNode(...args, unit.workspace.key, states)];
  }
  const input: ReadyProjectInput = {
    workspace: unit.workspace,
    fingerprint: unit.fingerprint!,
    result: unit.result,
    states,
    projectScent,
    collisionScents,
  };
  const children = buildKindGroups(input);
  if (children.length > 0) return children;
  const incomplete = projectResultIncomplete(unit.result);
  const label = incomplete
    ? `No reliable Aurelia resource rows were discovered in ${unit.result.project.projectKey}`
    : `No supported Aurelia resources were discovered in ${unit.result.project.projectKey}`;
  const help = incomplete
    ? "Discovery is incomplete. Refresh or open Aurelia Output for details."
    : "Supported kinds are elements, template controllers, attributes, value converters, and binding behaviors.";
  const args = [
    `${projectPrefix(unit)}:empty`,
    label,
    `${label}. ${help}`,
    incomplete ? "warning" : "info",
  ] as const;
  return [incomplete || states.includes("out-of-date")
    ? issueInfoNode(...args, unit.workspace.key, states)
    : infoNode(...args, states)];
}

function buildKindGroups(input: ReadyProjectInput): readonly TreeNode[] {
  const nodes: TreeNode[] = [];
  for (const kind of RESOURCE_KIND_ORDER) {
    const rows = input.result.resources
      .filter((resource) => resource.kind === kind)
      .sort((left, right) => left.name.localeCompare(right.name) || left.identityKey.localeCompare(right.identityKey));
    if (rows.length === 0) continue;
    const presentation = resourceKindPresentation(kind);
    const stateText = stateDescription(input.states);
    nodes.push({
      nodeKind: "kind",
      id: `${projectPrefix(input)}:kind:${kind}`,
      label: `${presentation.plural} (${rows.length})`,
      ...(stateText.length === 0 ? {} : { description: stateText }),
      accessibilityLabel: `${presentation.plural} group. ${formatResourceCount(rows.length)}.${stateSentence(input.states)}`,
      iconId: presentation.icon,
      collapsible: true,
      children: rows.map((resource) => resourceNode(input, resource)),
      contextValue: "resourceKind",
    });
  }
  return nodes;
}

function resourceNode(
  input: ReadyProjectInput,
  resource: ResourceInventoryItem,
): TreeNode {
  const navigation = navigationRequest(input, resource, "resource");
  const implementationNavigation = distinctImplementation(resource)
    ? navigationRequest(input, resource, "implementation")
    : undefined;
  const children: TreeNode[] = [];
  const kind = resourceKindPresentation(resource.kind);
  const owner = `${input.workspace.name} · ${input.result.project.projectKey}`;
  const resourceCollisionScent = input.collisionScents.get(resource);
  const canonicalCollision = resourceCollisionScent != null;
  const stateText = stateDescription(input.states);
  const metadataState = resource.metadataState === "full-definition"
    ? null
    : resourceMetadataStateLabel(resource.metadataState);
  for (const alias of resource.aliases) {
    const source = sourceLabel(alias.source);
    const navigable = alias.navigation.state === "available";
    const aliasCollisionScent = input.collisionScents.get(alias) ?? null;
    const description = [
      "alias",
      aliasCollisionScent,
      metadataState,
      navigable ? null : "source location unavailable",
      stateText || null,
    ]
      .filter((part): part is string => part != null && part.length > 0)
      .join(" · ");
    children.push({
      nodeKind: "alias",
      id: `${projectPrefix(input)}:${alias.identityKey}`,
      label: alias.name,
      description,
      accessibilityLabel: [
        `Alias ${alias.name} for ${kind.singular} ${resource.name}`,
        `origin ${resourceOriginLabel(resource)}`,
        `project ${owner}`,
        aliasCollisionScent == null ? null : `distinguished by ${aliasCollisionScent}`,
        metadataState,
        source == null ? "source location unavailable" : `source ${source}`,
        ...input.states.map(resourceTreeRowStateLabel),
      ].filter((value): value is string => value != null).join(". ") + ".",
      tooltip: source == null
        ? `Alias ${alias.name} for ${resource.name}\nSource location unavailable`
        : `Alias ${alias.name} for ${resource.name}\nSource: ${source}`,
      iconId: "symbol-string",
      collapsible: false,
      ...(navigable ? { navigation: navigationRequest(input, resource, "alias", alias.identityKey) } : {}),
      contextValue: navigable ? "resourceAlias" : "resourceAliasUnavailable",
    });
  }
  for (const bindable of resource.bindables) {
    const source = sourceLabel(bindable.sources.name)
      ?? sourceLabel(bindable.sources.attribute)
      ?? sourceLabel(bindable.sources.property)
      ?? sourceLabel(bindable.sources.declaration);
    const navigable = bindable.navigation.state === "available";
    const details = [
      bindable.valueType == null ? null : `type ${bindable.valueType}`,
      bindable.primary ? "primary" : null,
      metadataState,
      navigable ? null : "source location unavailable",
      stateText || null,
    ].filter((value): value is string => value != null);
    const publicName = bindable.attribute === bindable.name
      ? bindable.name
      : `${bindable.name} (${bindable.attribute})`;
    children.push({
      nodeKind: "bindable",
      id: `${projectPrefix(input)}:${bindable.identityKey}`,
      label: publicName,
      description: details.join(" · "),
      accessibilityLabel: [
        `Bindable ${publicName} on ${kind.singular} ${resource.name}`,
        `origin ${resourceOriginLabel(resource)}`,
        `project ${owner}`,
        metadataState,
        bindable.valueType == null ? "type unavailable" : `type ${bindable.valueType}`,
        bindable.primary ? "primary bindable" : null,
        source == null ? "source location unavailable" : `source ${source}`,
        ...input.states.map(resourceTreeRowStateLabel),
      ].filter((value): value is string => value != null).join(". ") + ".",
      tooltip: source == null
        ? `Bindable ${publicName} on ${resource.name}\nSource location unavailable`
        : `Bindable ${publicName} on ${resource.name}\nSource: ${source}`,
      iconId: "symbol-field",
      collapsible: false,
      ...(navigable ? { navigation: navigationRequest(input, resource, "bindable", bindable.identityKey) } : {}),
      contextValue: navigable ? "resourceBindable" : "resourceBindableUnavailable",
    });
  }
  const navigable = resource.navigation.state === "available";
  return {
    nodeKind: "resource",
    id: `${projectPrefix(input)}:${resource.identityKey}`,
    label: resource.name,
    description: resourceDescription(resource, {
      project: input.result.project,
      workspace: input.workspace,
      requireOwnerScent: canonicalCollision,
      ownerScent: resourceCollisionScent,
      states: input.states,
    }),
    accessibilityLabel: resourceAccessibilityLabel(
      resource,
      input.result.project,
      input.workspace,
      input.states,
      resourceCollisionScent,
    ),
    tooltip: resourceTooltip(resource, input.result.project, input.workspace, input.states),
    iconId: kind.icon,
    collapsible: children.length > 0,
    children,
    ...(navigable ? { navigation } : {}),
    ...(implementationNavigation == null ? {} : { implementationNavigation }),
    contextValue: !navigable
      ? "resourceUnavailable"
      : implementationNavigation == null
        ? "resource"
        : "resourceWithImplementation",
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

function distinctImplementation(resource: ResourceInventoryItem): boolean {
  if (resource.navigation.state !== "available" || resource.sources.implementation.state !== "available") return false;
  return !sameLocation(resource.navigation.location, resource.sources.implementation.location);
}

function sameLocation(left: ResourceSourceLocation, right: ResourceSourceLocation): boolean {
  return left.uri === right.uri
    && left.range.start.line === right.range.start.line
    && left.range.start.character === right.range.start.character
    && left.range.end.line === right.range.end.line
    && left.range.end.character === right.range.end.character;
}

function projectPrefix(input: ProjectUnit | ReadyProjectInput): string {
  if ("result" in input && input.result != null) {
    return `workspace:${input.workspace.key}:project:${input.result.project.projectKey}`;
  }
  return `workspace:${input.workspace.key}`;
}

function projectResultIncomplete(result: Extract<ResourceInventoryProjectResult, { status: "ready" }>): boolean {
  return result.answer.result === "answered" && result.answer.coverage !== "complete";
}

function projectAnswerIssueDescription(
  result: Exclude<Extract<ResourceInventoryProjectResult, { status: "ready" }>["answer"]["result"], "answered">,
): string {
  switch (result) {
    case "failed":
      return "resources could not be loaded";
    case "invalid":
      return "resource information is out of date";
    case "unsupported":
      return "resource discovery is not supported";
  }
}

function projectAnswerIssueCopy(
  result: Exclude<Extract<ResourceInventoryProjectResult, { status: "ready" }>["answer"]["result"], "answered">,
  projectKey: string,
): { readonly label: string; readonly accessibilityLabel: string } {
  switch (result) {
    case "failed":
      return {
        label: `Aurelia project analysis did not complete for ${projectKey}`,
        accessibilityLabel: `Aurelia project analysis did not complete for ${projectKey}. Refresh to retry or open Aurelia Output for details.`,
      };
    case "invalid":
      return {
        label: `Aurelia resource information is out of date for ${projectKey}`,
        accessibilityLabel: `Aurelia resource information is out of date for ${projectKey}. Refresh to retry.`,
      };
    case "unsupported":
      return {
        label: `Resource discovery is not supported for ${projectKey}`,
        accessibilityLabel: `Resource discovery is not supported for ${projectKey}. Open Aurelia Output for details.`,
      };
  }
}

function rowStatesForUnit(
  unit: ProjectUnit,
  staleWorkspaceKeys: ReadonlySet<string>,
  updatingAll: boolean,
  updatingWorkspaceKeys: ReadonlySet<string>,
): readonly ResourceTreeRowState[] {
  const states: ResourceTreeRowState[] = [];
  if (updatingAll || updatingWorkspaceKeys.has(unit.workspace.key)) states.push("updating");
  if (staleWorkspaceKeys.has(unit.workspace.key)) states.push("out-of-date");
  if (unit.result?.status === "ready" && projectResultIncomplete(unit.result)) states.push("discovery-incomplete");
  return states;
}

function projectHasIssue(unit: ProjectUnit, staleWorkspaceKeys: ReadonlySet<string>): boolean {
  return unit.workspace.status === "error"
    || unit.result?.status === "error"
    || (unit.result?.status === "ready" && unit.result.answer.result !== "answered")
    || (unit.result?.status === "ready" && projectResultIncomplete(unit.result))
    || staleWorkspaceKeys.has(unit.workspace.key);
}

function projectIssueKind(
  unit: ProjectUnit,
  staleWorkspaceKeys: ReadonlySet<string>,
): "recoverable" | "unsupported" | null {
  if (staleWorkspaceKeys.has(unit.workspace.key)) return "recoverable";
  if (unit.result?.status === "ready" && unit.result.answer.result === "unsupported") return "unsupported";
  return projectHasIssue(unit, staleWorkspaceKeys) ? "recoverable" : null;
}

function projectCountDescription(
  count: number,
  incomplete: boolean,
  states: readonly ResourceTreeRowState[],
): string {
  const parts = [incomplete ? formatKnownResourceCount(count) : formatResourceCount(count)];
  for (const state of states) {
    if (state === "discovery-incomplete") continue;
    parts.push(resourceTreeRowStateLabel(state));
  }
  if (incomplete) parts.push("incomplete");
  return parts.join(" · ");
}

function formatResourceCount(count: number): string {
  return `${count} resource${count === 1 ? "" : "s"}`;
}

function formatKnownResourceCount(count: number): string {
  return `${count} known resource${count === 1 ? "" : "s"}`;
}

function stateDescription(states: readonly ResourceTreeRowState[]): string {
  return states.map(resourceTreeRowStateLabel).join(" · ");
}

function statefulDescription(base: string, states: readonly ResourceTreeRowState[]): string {
  const state = stateDescription(states);
  return state.length === 0 ? base : `${base} · ${state}`;
}

function stateSentence(states: readonly ResourceTreeRowState[]): string {
  return states.length === 0 ? "" : ` ${states.map(resourceTreeRowStateLabel).join(". ")}.`;
}

function infoNode(
  id: string,
  label: string,
  accessibilityLabel: string,
  iconId: string,
  states: readonly ResourceTreeRowState[] = [],
): TreeNode {
  const stateText = stateDescription(states);
  const accessibleState = states.map(resourceTreeRowStateLabel);
  const completeAccessibilityLabel = [
    accessibilityLabel.replace(/\.$/u, ""),
    ...accessibleState,
  ].join(". ") + ".";
  return {
    nodeKind: "info",
    id,
    label,
    accessibilityLabel: completeAccessibilityLabel,
    ...(stateText.length === 0 ? {} : { description: stateText }),
    tooltip: completeAccessibilityLabel,
    iconId,
    collapsible: false,
    contextValue: "resourceInfo",
  };
}

function issueInfoNode(
  id: string,
  label: string,
  accessibilityLabel: string,
  iconId: string,
  workspaceKey: string,
  states: readonly ResourceTreeRowState[] = [],
): TreeNode {
  return {
    ...infoNode(id, label, accessibilityLabel, iconId, states),
    retryWorkspaceKey: workspaceKey,
    contextValue: "resourceProjectIssue",
  };
}

function outputInfoNode(
  id: string,
  label: string,
  accessibilityLabel: string,
  iconId: string,
  states: readonly ResourceTreeRowState[] = [],
): TreeNode {
  return {
    ...infoNode(id, label, accessibilityLabel, iconId, states),
    contextValue: "resourceProjectUnsupported",
  };
}

function projectRootLabels(units: readonly ProjectUnit[]): ReadonlyMap<ProjectUnit, string> {
  const baseLabels = new Map(units.map((unit) => [unit, baseProjectLabel(unit)]));
  const labels = new Map<ProjectUnit, string>();
  for (const unit of units) {
    const base = baseLabels.get(unit)!;
    const peers = units.filter((candidate) => baseLabels.get(candidate) === base);
    labels.set(unit, peers.length === 1 ? base : `${base} · ${uniqueRootScent(unit, peers)}`);
  }
  return labels;
}

function projectRootContexts(units: readonly ProjectUnit[]): ReadonlyMap<ProjectUnit, string> {
  const roots = units.map(projectRootUri);
  return new Map(units.map((unit) => [unit, resourceProjectRootScent(projectRootUri(unit), roots)]));
}

function resourceCollisionScents(
  units: readonly ProjectUnit[],
  labels: ReadonlyMap<ProjectUnit, string>,
): ReadonlyMap<object, string> {
  const candidates: ResourceCollisionScentCandidate<object>[] = [];
  for (const unit of units) {
    if (unit.result?.status !== "ready" || unit.result.answer.result !== "answered") continue;
    for (const resource of unit.result.resources) {
      const kind = resourceKindPresentation(resource.kind).singular;
      candidates.push({
        token: resource.name,
        roleLabel: kind,
        projectLabel: labels.get(unit)!,
        source: preferredResourceSource(resource),
        stableKey: `${projectPrefix(unit)}:${resource.identityKey}`,
        value: resource,
      });
      for (const alias of resource.aliases) {
        candidates.push({
          token: alias.name,
          roleLabel: `alias for ${kind} ${resource.name}`,
          projectLabel: labels.get(unit)!,
          source: alias.source,
          stableKey: `${projectPrefix(unit)}:${resource.identityKey}:${alias.identityKey}`,
          value: alias,
        });
      }
    }
  }
  return resourceCollisionScentMap(candidates);
}

function baseProjectLabel(unit: ProjectUnit): string {
  const projectKey = unit.result?.project.projectKey;
  if (projectKey == null) return unit.workspace.name;
  return unit.workspace.name === projectKey ? projectKey : `${unit.workspace.name} · ${projectKey}`;
}

function uniqueRootScent(unit: ProjectUnit, peers: readonly ProjectUnit[]): string {
  const roots = peers.map(projectRootUri);
  const scent = resourceProjectRootScent(projectRootUri(unit), roots);
  const matching = peers.filter((peer) => resourceProjectRootScent(projectRootUri(peer), roots) === scent);
  if (matching.length === 1) return scent;
  const ordered = [...matching].sort((left, right) => unitStableKey(left).localeCompare(unitStableKey(right)));
  return `${scent} · project ${ordered.indexOf(unit) + 1} of ${ordered.length}`;
}

function projectRootUri(unit: ProjectUnit): string {
  return unit.result?.project.rootUri ?? unit.workspace.uri;
}

function unitStableKey(unit: ProjectUnit): string {
  const resourceKeys = unit.result?.status === "ready" && unit.result.answer.result === "answered"
    ? unit.result.resources.map((resource) => resource.identityKey).sort().join("\u0000")
    : "";
  return [
    projectRootUri(unit),
    unit.workspace.key,
    unit.result?.project.projectKey ?? "",
    unit.fingerprint ?? "",
    resourceKeys,
  ].join("\u0000");
}

export class ResourceExplorerProvider implements TreeDataProvider<TreeNode>, Disposable {
  readonly #vscode: VscodeApi;
  readonly #lsp: LspFacade;
  readonly #logger: ClientLogger;
  readonly #runWithProgress: ResourceExplorerProgressRunner;
  readonly #changeEmitter: { readonly event: Event<void>; fire(): void; dispose(): void };
  #tree: readonly TreeNode[] = [];
  #response: ResourceInventorySnapshot | null = null;
  #view: Pick<TreeView<TreeNode>, "message" | "description"> | null = null;
  #phase: ResourceExplorerPhase = { kind: "empty" };
  readonly #staleWorkspaceKeys = new Set<string>();
  #updatingAll = false;
  readonly #updatingWorkspaceKeys = new Set<string>();
  #refreshGeneration = 0;
  #issueContext: boolean | null = null;

  constructor(
    vscode: VscodeApi,
    lsp: LspFacade,
    logger: ClientLogger,
    runWithProgress: ResourceExplorerProgressRunner = (task) => task(),
  ) {
    this.#vscode = vscode;
    this.#lsp = lsp;
    this.#logger = logger;
    this.#runWithProgress = runWithProgress;
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
    this.#staleWorkspaceKeys.clear();
    this.#updatingAll = false;
    this.#updatingWorkspaceKeys.clear();
    this.#view = null;
    this.#setIssueContext(false);
    this.#changeEmitter.dispose();
  }

  getTreeItem(element: TreeNode): TreeItem {
    const item: TreeItem = { label: element.label, id: element.id };
    if (element.description != null) item.description = element.description;
    if (element.tooltip != null) item.tooltip = element.tooltip;
    if (element.iconId != null) item.iconPath = new this.#vscode.ThemeIcon(element.iconId);
    item.accessibilityInformation = { label: element.accessibilityLabel, role: "treeitem" };
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

  navigationFor(element: unknown, action: ResourceExplorerNavigationAction): ResourceNavigationRequest | null {
    const node = currentNode(this.#tree, element);
    if (node == null) return null;
    if (action === "implementation") return node.implementationNavigation ?? null;
    if (node.navigation == null) return null;
    return action === "beside" ? { ...node.navigation, placement: "beside" } : node.navigation;
  }

  retryWorkspaceFor(element: unknown): string | null {
    return currentNode(this.#tree, element)?.retryWorkspaceKey ?? null;
  }

  async refresh(): Promise<void> {
    return this.#refresh(null);
  }

  async refreshWorkspace(workspaceKey: string): Promise<void> {
    return this.#refresh(workspaceKey);
  }

  /**
   * Publishes retained rows as updating as soon as semantic state becomes dirty.
   * A full-snapshot marker dominates individual workspace markers until the
   * corresponding latest full request settles.
   */
  markUpdating(workspaceKey: string | null): void {
    const changed = this.#markUpdating(workspaceKey);
    if (!changed || this.#response == null) return;
    this.#rebuildTree();
    this.#changeEmitter.fire();
    this.#publishViewState();
  }

  /**
   * Synchronously retires an in-flight request after a newer semantic change.
   * The serial view drain owns the trailing request; this method only prevents
   * the predecessor from publishing and keeps retained rows visibly updating.
   */
  supersedeRefresh(workspaceKey: string | null): void {
    this.#refreshGeneration += 1;
    this.markUpdating(workspaceKey);
  }

  async #refresh(requestedWorkspaceKey: string | null): Promise<void> {
    const generation = ++this.#refreshGeneration;
    const hasPrevious = this.#response != null;
    const hadTree = this.#tree.length > 0;
    const workspaceKey = hasPrevious ? requestedWorkspaceKey : null;
    if (hasPrevious) {
      this.#phase = { kind: "current" };
      this.markUpdating(workspaceKey);
    } else {
      this.#phase = { kind: "loading" };
      this.#tree = [];
      this.#rebuildTree();
      if (hadTree) this.#changeEmitter.fire();
      this.#publishViewState();
    }
    try {
      this.#logger.debug("resourceExplorer.refresh.start");
      const response = await this.#runWithProgress(() => this.#lsp.getResourceInventory({
        ...(workspaceKey == null ? {} : { workspaceKey }),
        includeTypeSurfaces: true,
      }));
      if (generation !== this.#refreshGeneration) return;
      const admission = admitResourceInventorySnapshot(this.#response, workspaceKey, response);
      this.#response = admission.snapshot;
      this.#clearUpdating(workspaceKey);
      if (workspaceKey == null) {
        this.#staleWorkspaceKeys.clear();
        for (const retainedKey of admission.retainedTransportErrorKeys) {
          this.#staleWorkspaceKeys.add(retainedKey);
        }
      } else if (admission.retainedTransportErrorKeys.has(workspaceKey)) {
        this.#staleWorkspaceKeys.add(workspaceKey);
      } else {
        this.#staleWorkspaceKeys.delete(workspaceKey);
      }
      this.#phase = { kind: "current" };
      this.#rebuildTree();
      this.#changeEmitter.fire();
      this.#publishViewState();
      this.#logger.debug("resourceExplorer.refresh.complete", resourceResponseCounts(this.#response));
    } catch (error) {
      if (generation !== this.#refreshGeneration) return;
      this.#logger.warn("resourceExplorer.refresh.failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      this.#phase = hasPrevious ? { kind: "current" } : { kind: "failed" };
      this.#clearUpdating(workspaceKey);
      if (!hasPrevious) {
        this.#tree = [infoNode(
          "error",
          "No current Aurelia resource inventory was returned",
          "The Aurelia language server did not return a current resource inventory. Refresh to retry or open Aurelia Output for details.",
          "error",
        )];
      } else {
        if (workspaceKey == null) {
          for (const workspace of this.#response?.workspaces ?? []) {
            this.#staleWorkspaceKeys.add(workspace.key);
          }
        } else {
          this.#staleWorkspaceKeys.add(workspaceKey);
        }
        this.#rebuildTree();
      }
      this.#changeEmitter.fire();
      this.#publishViewState();
    }
  }

  #rebuildTree(): void {
    if (this.#response != null) {
      this.#tree = buildTree(
        this.#response,
        this.#staleWorkspaceKeys,
        this.#updatingAll,
        this.#updatingWorkspaceKeys,
      );
    } else if (this.#phase.kind === "current") {
      this.#tree = [infoNode(
        "no-session",
        "No active Aurelia resource inventory is available",
        "No active Aurelia resource inventory is available for this view.",
        "info",
      )];
    }
  }

  #publishViewState(): void {
    const counts = resourceResponseCounts(this.#response);
    if (this.#view != null) {
      this.#view.description = counts.projects === 0
        ? undefined
        : counts.failures > 0 || counts.incomplete > 0 || this.#staleWorkspaceKeys.size > 0
          ? formatKnownResourceCount(counts.resources)
          : formatResourceCount(counts.resources);
      this.#view.message = this.#viewMessage(counts);
    }
    this.#setIssueContext(
      this.#phase.kind === "failed"
      || this.#staleWorkspaceKeys.size > 0
      || counts.failures > 0
      || counts.incomplete > 0,
    );
  }

  #viewMessage(counts: ReturnType<typeof resourceResponseCounts>): string | undefined {
    if (this.#updatingAll || (this.#updatingWorkspaceKeys.size > 0 && counts.boundaries <= 1)) {
      return "Updating — showing previous results";
    }
    switch (this.#phase.kind) {
      case "empty":
      case "current":
        if (this.#staleWorkspaceKeys.size > 0 && counts.boundaries <= 1) {
          return "Out of date — refresh failed. Refresh to retry; see Aurelia Output for details.";
        }
        {
          const answerIssue = singleProjectAnswerIssue(this.#response);
          if (answerIssue != null) {
            switch (answerIssue.result) {
              case "failed":
                return `Resources could not be loaded for ${answerIssue.projectKey}. Refresh to retry; see Aurelia Output for details.`;
              case "invalid":
                return `Aurelia resource information is out of date for ${answerIssue.projectKey}. Refresh to retry.`;
              case "unsupported":
                return `Resource discovery is not supported for ${answerIssue.projectKey}. See Aurelia Output for details.`;
            }
          }
        }
        if (counts.boundaries <= 1 && counts.failures > 0 && counts.resources === 0) {
          return "Resources could not be loaded. Refresh to retry; see Aurelia Output for details.";
        }
        if (counts.boundaries === 1 && (counts.failures > 0 || counts.incomplete > 0)) {
          const project = singleProjectKey(this.#response);
          return project == null
            ? `Showing ${formatKnownResourceCount(counts.resources)}; discovery is incomplete.`
            : `Showing ${formatKnownResourceCount(counts.resources)}; discovery is incomplete in ${project}.`;
        }
        return undefined;
      case "loading":
        return "Discovering Aurelia resources...";
      case "failed":
        return "Resource discovery failed. Refresh to retry; see Aurelia Output for details.";
    }
  }

  #markUpdating(workspaceKey: string | null): boolean {
    if (workspaceKey == null) {
      if (this.#updatingAll) return false;
      this.#updatingAll = true;
      this.#updatingWorkspaceKeys.clear();
      return true;
    }
    if (this.#updatingAll || this.#updatingWorkspaceKeys.has(workspaceKey)) return false;
    this.#updatingWorkspaceKeys.add(workspaceKey);
    return true;
  }

  #clearUpdating(workspaceKey: string | null): void {
    if (workspaceKey == null) {
      this.#updatingAll = false;
      this.#updatingWorkspaceKeys.clear();
      return;
    }
    if (!this.#updatingAll) this.#updatingWorkspaceKeys.delete(workspaceKey);
  }

  #setIssueContext(value: boolean): void {
    if (this.#issueContext === value) return;
    this.#issueContext = value;
    void this.#vscode.commands.executeCommand(
      "setContext",
      AureliaContext.ResourceExplorerHasIssues,
      value,
    ).then(undefined, (error) => {
      this.#logger.warn("resourceExplorer.context.failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }
}

function currentNode(tree: readonly TreeNode[], candidate: unknown): TreeNode | null {
  if (candidate == null || typeof candidate !== "object" || !("id" in candidate)) return null;
  const id = (candidate as { readonly id?: unknown }).id;
  if (typeof id !== "string") return null;
  for (const node of tree) {
    if (node.id === id) return node;
    const nested = currentNode(node.children ?? [], candidate);
    if (nested != null) return nested;
  }
  return null;
}

function admitResourceInventorySnapshot(
  current: ResourceInventorySnapshot | null,
  workspaceKey: string | null,
  incoming: ResourceInventorySnapshot | null,
): {
  readonly snapshot: ResourceInventorySnapshot | null;
  readonly retainedTransportErrorKeys: ReadonlySet<string>;
} {
  const retainedTransportErrorKeys = new Set<string>();
  const currentByKey = new Map((current?.workspaces ?? []).map((workspace) => [workspace.key, workspace]));
  const admit = (candidate: ResourceInventoryWorkspaceSnapshot): ResourceInventoryWorkspaceSnapshot => {
    const previous = currentByKey.get(candidate.key);
    if (candidate.status === "error" && previous?.status === "ready") {
      retainedTransportErrorKeys.add(candidate.key);
      return previous;
    }
    return candidate;
  };
  if (workspaceKey == null) {
    if (incoming == null) return { snapshot: null, retainedTransportErrorKeys };
    const workspaces = incoming.workspaces.map(admit);
    return {
      snapshot: workspaces.length === 0 ? null : { workspaces },
      retainedTransportErrorKeys,
    };
  }
  const replacement = incoming?.workspaces.find((workspace) => workspace.key === workspaceKey);
  const workspaces = [...(current?.workspaces ?? [])];
  const index = workspaces.findIndex((workspace) => workspace.key === workspaceKey);
  if (replacement == null) {
    if (index >= 0) workspaces.splice(index, 1);
  } else {
    const admitted = admit(replacement);
    if (index >= 0) workspaces[index] = admitted;
    else workspaces.push(admitted);
  }
  workspaces.sort((left, right) => left.uri.localeCompare(right.uri) || left.key.localeCompare(right.key));
  return {
    snapshot: workspaces.length === 0 ? null : { workspaces },
    retainedTransportErrorKeys,
  };
}

function resourceResponseCounts(response: ResourceInventorySnapshot | null): {
  readonly boundaries: number;
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
      } else if (project.answer.result !== "answered") {
        failures += 1;
      } else {
        resources += project.resources.length;
        if (projectResultIncomplete(project)) incomplete += 1;
      }
    }
  }
  const boundaries = response == null ? 0 : projectUnits(response).length;
  return { boundaries, projects, resources, failures, incomplete };
}

function singleProjectKey(response: ResourceInventorySnapshot | null): string | null {
  if (response == null) return null;
  const units = projectUnits(response);
  return units.length === 1 ? units[0]?.result?.project.projectKey ?? null : null;
}

function singleProjectAnswerIssue(response: ResourceInventorySnapshot | null): {
  readonly projectKey: string;
  readonly result: "failed" | "invalid" | "unsupported";
} | null {
  if (response == null) return null;
  const units = projectUnits(response);
  if (units.length !== 1) return null;
  const project = units[0]?.result;
  if (project == null) return null;
  if (project.status !== "ready" || project.answer.result === "answered") return null;
  return { projectKey: project.project.projectKey, result: project.answer.result };
}
