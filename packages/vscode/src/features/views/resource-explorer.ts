import type {
  AnalysisLimitationsProjectResult,
  ResourceInventoryItem,
  ResourceInventoryProjectResult,
  ResourceSourceLocation,
} from "@aurelia-ls/language-server/protocol";
import { LSPErrorCodes } from "vscode-languageserver-protocol";
import type {
  CancellationToken,
  CancellationTokenSource,
  Disposable,
  Event,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  TreeView,
} from "vscode";
import { createHash } from "node:crypto";
import {
  isRequestCancelledError,
  type LspFacade,
} from "../../core/lsp-facade.js";
import type { ClientLogger } from "../../log.js";
import { AureliaCommand, AureliaContext } from "../../product-contract.js";
import type {
  AnalysisLimitationsSnapshot,
  AureliaWorkspaceIdentity,
  ResourceInventorySnapshot,
  ResourceInventoryWorkspaceSnapshot,
  ResourceNavigationRequest,
  ResourceAvailabilityExplanationSubjectRequest,
} from "../../types.js";
import type { AnalysisLimitationReviewEntry } from "../analysis-limitations/review.js";
import type { VscodeApi } from "../../vscode-api.js";
import type { ResourceExplorerProviderSupportState } from "../../support-report.js";
import {
  emitResourceDiscoveryHostObservation,
  nextResourceDiscoveryHostObservationId,
  resourceDiscoveryHostAcceptanceEnabled,
} from "../../resource-discovery-host-control.js";
import {
  RESOURCE_EXPLORER_ROLE_ICONS,
  RESOURCE_KIND_ORDER,
  preferredResourceSource,
  resourceAccessibilityLabel,
  resourceBindableModeIcon,
  resourceBindableModeLabel,
  resourceCollisionScentMap,
  resourceDescription,
  resourceKindPresentation,
  resourceMetadataStateLabel,
  resourceOriginLabel,
  resourceProjectRootScent,
  resourceOriginIcon,
  resourceTooltip,
  resourceTreeRowStateLabel,
  sourceLabel,
  type ResourceCollisionScentCandidate,
  type ResourceBindableModeIconId,
  type ResourceKindGroupIconId,
  type ResourceOriginIconId,
  type ResourceTreeRowState,
} from "../resource-discovery/presentation.js";

type TreeNodeKind = "project" | "kind" | "resource" | "alias" | "bindable" | "info";
type ResourceExplorerRoleIconId =
  typeof RESOURCE_EXPLORER_ROLE_ICONS[keyof typeof RESOURCE_EXPLORER_ROLE_ICONS];
type ResourceExplorerIconId =
  | ResourceExplorerRoleIconId
  | ResourceKindGroupIconId
  | ResourceOriginIconId
  | ResourceBindableModeIconId
  | StatusIconId;
type StatusIconId = "info" | "warning" | "error";
type StatusIconColorId =
  | "problemsInfoIcon.foreground"
  | "problemsWarningIcon.foreground"
  | "problemsErrorIcon.foreground";

class ResourceExplorerRefreshCancelledError extends Error {
  readonly code = LSPErrorCodes.RequestCancelled;

  constructor() {
    super("Resource Explorer refresh was superseded.");
    this.name = "Canceled";
  }
}

async function untilResourceExplorerCancellation<T>(
  operation: Promise<T>,
  token: CancellationToken,
): Promise<T> {
  if (token.isCancellationRequested) {
    throw new ResourceExplorerRefreshCancelledError();
  }
  let subscription: Disposable | undefined;
  const cancellation = new Promise<never>((_resolve, reject) => {
    subscription = token.onCancellationRequested(() => {
      reject(new ResourceExplorerRefreshCancelledError());
    });
  });
  try {
    return await Promise.race([operation, cancellation]);
  } finally {
    subscription?.dispose();
  }
}

type ResourceExplorerPhase = { readonly kind: "empty" | "loading" | "current" | "failed" };
type ResourceExplorerObservedRowState =
  | ResourceTreeRowState
  | "metadata-incomplete"
  | "non-navigable";

interface TreeNode {
  readonly nodeKind: TreeNodeKind;
  readonly id: string;
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly description?: string;
  readonly tooltip?: string;
  readonly iconId?: ResourceExplorerIconId;
  readonly iconColorId?: StatusIconColorId;
  readonly collapsible: boolean;
  readonly defaultExpanded?: boolean;
  readonly children?: readonly TreeNode[];
  readonly navigation?: ResourceNavigationRequest;
  readonly implementationNavigation?: ResourceNavigationRequest;
  readonly availabilityExplanation?: ResourceAvailabilityExplanationSubjectRequest;
  readonly retryWorkspaceKey?: string;
  readonly contextValue: string;
  /** Exact build-time state facts used only by the gated host observation. */
  readonly observationStates: readonly ResourceExplorerObservedRowState[];
  readonly observationAnswerResult?: string | null;
  readonly observationAnswerCoverage?: string | null;
  readonly observationAnswerRowCount?: number | null;
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

type ReadyAnalysisLimitationsProject = Extract<AnalysisLimitationsProjectResult, { status: "ready" }>;
type AnalysisLimitationPublicationKind =
  | "current-none"
  | "current-limited"
  | "stale-limited"
  | "unavailable";

interface AnalysisLimitationPublication {
  readonly workspaceKey: string;
  readonly workspaceUri: string;
  readonly projectKey: string;
  readonly fingerprint: string | null;
  readonly kind: AnalysisLimitationPublicationKind;
  readonly result: ReadyAnalysisLimitationsProject | null;
}

export type ResourceExplorerProgressRunner = <T>(task: () => Promise<T>) => PromiseLike<T>;
export type ResourceExplorerNavigationAction = "declaration" | "implementation" | "beside";

function buildTree(
  response: ResourceInventorySnapshot,
  staleWorkspaceKeys: ReadonlySet<string>,
  analysisLimitations: readonly AnalysisLimitationPublication[],
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
  const limitedProjects = new Map<string, "current-limited" | "stale-limited">();
  for (const entry of analysisLimitations) {
    if (entry.kind !== "current-limited" && entry.kind !== "stale-limited") continue;
    limitedProjects.set(
      projectAnalysisIdentity(entry.workspaceKey, entry.projectKey),
      entry.kind,
    );
  }
  if (units.length === 1) {
    return buildProjectUnit(
      units[0]!,
      rowStatesForUnit(units[0]!, staleWorkspaceKeys),
      labels.get(units[0]!)!,
      collisionScents,
    );
  }
  return units.map((unit) => projectRootNode(
    unit,
    labels.get(unit)!,
    rootContexts.get(unit)!,
    staleWorkspaceKeys,
    collisionScents,
    limitedProjects.get(projectAnalysisIdentity(
      unit.workspace.key,
      unit.result?.project.projectKey ?? "",
    )) ?? null,
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
  collisionScents: ReadonlyMap<object, string>,
  analysisLimitation: "current-limited" | "stale-limited" | null,
): TreeNode {
  const result = unit.result;
  const states = rowStatesForUnit(unit, staleWorkspaceKeys);
  const children = buildProjectUnit(unit, states, label, collisionScents);
  const answered = result?.status === "ready" && result.answer.result === "answered";
  const resourceCount = answered ? result.resources.length : 0;
  const failed = unit.workspace.status === "error"
    || result?.status === "error"
    || (result?.status === "ready" && result.answer.result === "failed");
  const baseDescription = unit.workspace.status === "ready" && result?.status === "ready"
    && result.answer.result !== "answered"
    ? statefulDescription(projectAnswerIssueDescription(result.answer.result), states)
    : failed
    ? statefulDescription("resources could not be loaded", states)
    : result == null
      ? statefulDescription("no Aurelia project", states)
      : projectCountDescription(resourceCount, projectResultIncomplete(result), states);
  const description = analysisLimitation === "current-limited"
    ? `${baseDescription} · analysis limited`
    : analysisLimitation === "stale-limited"
      ? `${baseDescription} · analysis may be limited · previous review`
      : baseDescription;
  const issueKind = projectIssueKind(unit, staleWorkspaceKeys);
  const iconColorId = projectStatusColorId(unit, staleWorkspaceKeys);
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
    iconId: RESOURCE_EXPLORER_ROLE_ICONS.project,
    ...(iconColorId == null ? {} : { iconColorId }),
    collapsible: true,
    defaultExpanded: true,
    children,
    ...(issueKind === "recoverable" ? { retryWorkspaceKey: unit.workspace.key } : {}),
    contextValue: issueKind === "recoverable"
      ? "resourceProjectIssue"
      : issueKind === "unsupported"
        ? "resourceProjectUnsupported"
        : "resourceProject",
    observationStates: states,
    ...(resourceDiscoveryHostAcceptanceEnabled() ? projectAnswerObservation(unit) : {}),
  };
}

function buildProjectUnit(
  unit: ProjectUnit,
  states: readonly ResourceTreeRowState[],
  projectScent: string,
  collisionScents: ReadonlyMap<object, string>,
): readonly TreeNode[] {
  const nodes = buildProjectUnitCore(unit, states, projectScent, collisionScents);
  return resourceDiscoveryHostAcceptanceEnabled()
    ? withProjectAnswerObservation(nodes, unit)
    : nodes;
}

function buildProjectUnitCore(
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
      iconId: presentation.groupIcon,
      collapsible: true,
      children: rows.map((resource) => resourceNode(input, resource)),
      contextValue: "resourceKind",
      observationStates: input.states,
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
      iconId: RESOURCE_EXPLORER_ROLE_ICONS.alias,
      collapsible: false,
      ...(navigable ? { navigation: navigationRequest(input, resource, "alias", alias.identityKey) } : {}),
      contextValue: navigable ? "resourceAlias" : "resourceAliasUnavailable",
      observationStates: observationStates(input.states, resource.metadataState, navigable),
    });
  }
  for (const bindable of resource.bindables) {
    const source = sourceLabel(bindable.sources.name)
      ?? sourceLabel(bindable.sources.attribute)
      ?? sourceLabel(bindable.sources.property)
      ?? sourceLabel(bindable.sources.declaration);
    const navigable = bindable.navigation.state === "available";
    const modeLabel = resourceBindableModeLabel(bindable.mode);
    const details = [
      `mode ${modeLabel}`,
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
        `${modeLabel} binding mode`,
        bindable.valueType == null ? "type unavailable" : `type ${bindable.valueType}`,
        bindable.primary ? "primary bindable" : null,
        source == null ? "source location unavailable" : `source ${source}`,
        ...input.states.map(resourceTreeRowStateLabel),
      ].filter((value): value is string => value != null).join(". ") + ".",
      tooltip: [
        `Bindable ${publicName} on ${resource.name}`,
        `Binding mode: ${modeLabel}`,
        bindable.primary ? "Primary bindable" : null,
        source == null ? "Source location unavailable" : `Source: ${source}`,
      ].filter((line): line is string => line != null).join("\n"),
      iconId: resourceBindableModeIcon(bindable.mode),
      collapsible: false,
      ...(navigable ? { navigation: navigationRequest(input, resource, "bindable", bindable.identityKey) } : {}),
      contextValue: navigable ? "resourceBindable" : "resourceBindableUnavailable",
      observationStates: observationStates(input.states, resource.metadataState, navigable),
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
    iconId: resourceOriginIcon(resource),
    collapsible: children.length > 0,
    children,
    availabilityExplanation: {
      workspaceKey: input.workspace.key,
      projectKey: input.result.project.projectKey,
      resourceIdentityKey: resource.identityKey,
    },
    ...(navigable ? { navigation } : {}),
    ...(implementationNavigation == null ? {} : { implementationNavigation }),
    contextValue: !navigable
      ? "resourceUnavailable"
      : implementationNavigation == null
        ? "resource"
        : "resourceWithImplementation",
    observationStates: observationStates(input.states, resource.metadataState, navigable),
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
): readonly ResourceTreeRowState[] {
  const states: ResourceTreeRowState[] = [];
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

function projectStatusColorId(
  unit: ProjectUnit,
  staleWorkspaceKeys: ReadonlySet<string>,
): StatusIconColorId | null {
  if (
    unit.workspace.status === "error"
    || unit.result?.status === "error"
    || (unit.result?.status === "ready" && unit.result.answer.result === "failed")
  ) {
    return "problemsErrorIcon.foreground";
  }
  if (
    staleWorkspaceKeys.has(unit.workspace.key)
    || (unit.result?.status === "ready" && (
      unit.result.answer.result === "invalid"
      || projectResultIncomplete(unit.result)
    ))
  ) {
    return "problemsWarningIcon.foreground";
  }
  if (unit.result?.status === "ready" && unit.result.answer.result === "unsupported") {
    return "problemsInfoIcon.foreground";
  }
  return null;
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
  iconId: StatusIconId,
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
    iconColorId: statusIconColorId(iconId),
    collapsible: false,
    contextValue: "resourceInfo",
    observationStates: states,
  };
}

function statusIconColorId(iconId: StatusIconId): StatusIconColorId {
  switch (iconId) {
    case "error":
      return "problemsErrorIcon.foreground";
    case "warning":
      return "problemsWarningIcon.foreground";
    case "info":
      return "problemsInfoIcon.foreground";
  }
}

function issueInfoNode(
  id: string,
  label: string,
  accessibilityLabel: string,
  iconId: StatusIconId,
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
  iconId: StatusIconId,
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
  readonly #observationId = nextResourceDiscoveryHostObservationId("resource-explorer");
  readonly #changeEmitter: { readonly event: Event<void>; fire(): void; dispose(): void };
  #tree: readonly TreeNode[] = [];
  #response: ResourceInventorySnapshot | null = null;
  #view: Pick<TreeView<TreeNode>, "message" | "description"> | null = null;
  #phase: ResourceExplorerPhase = { kind: "empty" };
  readonly #staleWorkspaceKeys = new Set<string>();
  #updatingAll = false;
  readonly #updatingWorkspaceKeys = new Set<string>();
  #refreshGeneration = 0;
  #publicationWorkspaceKey: string | null = null;
  #publicationFingerprint: string | null = null;
  #issueContext: boolean | null = null;
  #analysisReviewContext: boolean | null = null;
  #analysisLimitations: readonly AnalysisLimitationPublication[] = [];
  #activeRefreshCancellation: CancellationTokenSource | null = null;

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
    this.#activeRefreshCancellation?.cancel();
    this.#tree = [];
    this.#response = null;
    this.#analysisLimitations = [];
    this.#staleWorkspaceKeys.clear();
    this.#updatingAll = false;
    this.#updatingWorkspaceKeys.clear();
    this.#view = null;
    this.#setIssueContext(false);
    this.#setAnalysisReviewContext(false);
    this.#changeEmitter.dispose();
  }

  getTreeItem(element: TreeNode): TreeItem {
    const item: TreeItem = { label: element.label, id: element.id };
    if (element.description != null) item.description = element.description;
    if (element.tooltip != null) item.tooltip = element.tooltip;
    if (element.iconId != null) {
      item.iconPath = new this.#vscode.ThemeIcon(
        element.iconId,
        element.iconColorId == null ? undefined : new this.#vscode.ThemeColor(element.iconColorId),
      );
    }
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

  /** Re-resolves an actual current top-level row without trusting command arguments as semantic facts. */
  availabilityExplanationFor(element: unknown): ResourceAvailabilityExplanationSubjectRequest | null {
    const node = currentNodeReference(this.#tree, element);
    return node?.nodeKind === "resource" ? node.availabilityExplanation ?? null : null;
  }

  retryWorkspaceFor(element: unknown): string | null {
    return currentNode(this.#tree, element)?.retryWorkspaceKey ?? null;
  }

  /** Current, exact-generation rows suitable for explicit source navigation. */
  analysisLimitationsForReview(): readonly AnalysisLimitationReviewEntry[] {
    return this.#analysisLimitations.flatMap((publication) =>
      publication.kind === "current-limited" && publication.fingerprint != null && publication.result != null
        ? publication.result.rows.map((row) => ({
            workspaceKey: publication.workspaceKey,
            projectKey: publication.projectKey,
            fingerprint: publication.fingerprint!,
            row,
          }))
        : []
    );
  }

  /** Exact provider-owned state for the source-free user-created support report. */
  supportState(): ResourceExplorerProviderSupportState {
    const counts = resourceResponseCounts(this.#response);
    return Object.freeze({
      phase: this.#phase.kind,
      refreshGeneration: this.#refreshGeneration,
      treeRootCount: this.#tree.length,
      hasInventory: this.#response != null,
      updatingAll: this.#updatingAll,
      updatingWorkspaceCount: this.#updatingWorkspaceKeys.size,
      staleWorkspaceCount: this.#staleWorkspaceKeys.size,
      hasIssues: this.#issueContext === true,
      hasAnalysisReview: this.#analysisReviewContext === true,
      counts: Object.freeze({ ...counts }),
    });
  }

  async refresh(): Promise<void> {
    return this.#refresh(null);
  }

  async refreshWorkspace(workspaceKey: string): Promise<void> {
    return this.#refresh(workspaceKey);
  }

  /**
   * Records pending semantic currentness without mutating the retained tree.
   * The view-title progress indicator carries transient activity; rows publish
   * only when an exact replacement settles or a persistent failure is known.
   */
  markUpdating(workspaceKey: string | null): void {
    this.#markUpdating(workspaceKey);
  }

  /**
   * Synchronously retires an in-flight request after a newer semantic change.
   * The serial view drain owns the trailing request; this method only prevents
   * the predecessor from publishing. The retained tree stays visually stable
   * until the drain obtains one coherent successor.
   */
  supersedeRefresh(workspaceKey: string | null): void {
    this.#refreshGeneration += 1;
    this.#activeRefreshCancellation?.cancel();
    this.markUpdating(workspaceKey);
  }

  async #refresh(requestedWorkspaceKey: string | null): Promise<void> {
    const generation = ++this.#refreshGeneration;
    this.#activeRefreshCancellation?.cancel();
    const cancellation = new this.#vscode.CancellationTokenSource();
    this.#activeRefreshCancellation = cancellation;
    const hasPrevious = this.#response != null;
    const hadTree = this.#tree.length > 0;
    const workspaceKey = hasPrevious ? requestedWorkspaceKey : null;
    this.#publicationWorkspaceKey = workspaceKey;
    this.#publicationFingerprint = null;
    if (hasPrevious) {
      this.#phase = { kind: "current" };
      this.markUpdating(workspaceKey);
    } else {
      this.#phase = { kind: "loading" };
      this.#tree = [];
      this.#rebuildTree();
      if (hadTree) {
        this.#observeTreePublication("loading");
        this.#changeEmitter.fire();
      }
      this.#publishViewState();
    }
    try {
      this.#logger.debug("resourceExplorer.refresh.start");
      let requested = await this.#requestSnapshots(workspaceKey, cancellation.token);
      if (generation !== this.#refreshGeneration) {
        this.#observe("discarded", {
          generation,
          currentGeneration: this.#refreshGeneration,
          reason: "superseded",
          workspaceIdentity: observedIdentity("workspace", workspaceKey),
          fingerprint: responseFingerprintForWorkspace(requested.inventory, workspaceKey),
        });
        return;
      }
      let admission = admitResourceInventorySnapshot(this.#response, workspaceKey, requested.inventory);
      let limitationAdmission = reconcileAnalysisLimitations(
        admission.snapshot,
        requested.limitations,
        this.#analysisLimitations,
        workspaceKey,
      );
      // A semantic generation can settle between the two independent requests.
      // Retry the pair once; never spin while the workspace keeps changing.
      if (limitationAdmission.retrySuggested) {
        requested = await this.#requestSnapshots(workspaceKey, cancellation.token);
        if (generation !== this.#refreshGeneration) return;
        admission = admitResourceInventorySnapshot(this.#response, workspaceKey, requested.inventory);
        limitationAdmission = reconcileAnalysisLimitations(
          admission.snapshot,
          requested.limitations,
          this.#analysisLimitations,
          workspaceKey,
        );
      }
      this.#response = admission.snapshot;
      this.#analysisLimitations = limitationAdmission.publications;
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
      this.#publicationFingerprint = responseFingerprintForWorkspace(requested.inventory, workspaceKey);
      this.#rebuildTree();
      this.#observeTreePublication("current");
      this.#changeEmitter.fire();
      this.#publishViewState();
      this.#logger.debug("resourceExplorer.refresh.complete", resourceResponseCounts(this.#response));
    } catch (error) {
      const cancelled = cancellation.token.isCancellationRequested
        || isRequestCancelledError(error);
      if (generation !== this.#refreshGeneration) {
        if (cancelled) {
          this.#observe("discarded", {
            generation,
            currentGeneration: this.#refreshGeneration,
            reason: "superseded",
            workspaceIdentity: observedIdentity("workspace", workspaceKey),
            fingerprint: null,
          });
        }
        return;
      }
      if (cancelled) {
        this.#phase = hasPrevious ? { kind: "current" } : { kind: "empty" };
        this.#clearUpdating(workspaceKey);
        this.#observe("discarded", {
          generation,
          currentGeneration: this.#refreshGeneration,
          reason: "cancelled",
          workspaceIdentity: observedIdentity("workspace", workspaceKey),
          fingerprint: null,
        });
        this.#publishViewState();
        return;
      }
      this.#logger.warn("resourceExplorer.refresh.failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      this.#phase = hasPrevious ? { kind: "current" } : { kind: "failed" };
      this.#analysisLimitations = markAnalysisLimitationsStale(
        this.#analysisLimitations,
        workspaceKey,
      );
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
      this.#observeTreePublication(hasPrevious ? "out-of-date" : "failed");
      this.#changeEmitter.fire();
      this.#publishViewState();
    } finally {
      if (this.#activeRefreshCancellation === cancellation) {
        this.#activeRefreshCancellation = null;
      }
      cancellation.dispose();
    }
  }

  async #requestSnapshots(workspaceKey: string | null, token: CancellationToken): Promise<{
    readonly inventory: ResourceInventorySnapshot | null;
    readonly limitations: AnalysisLimitationsSnapshot | null;
  }> {
    return this.#runWithProgress(async () => {
      const options = workspaceKey == null ? {} : { workspaceKey };
      const [inventory, limitations] = await untilResourceExplorerCancellation(Promise.allSettled([
        // The tree needs authored bindable metadata, not checker-projected value types. Type surfaces are a deliberate
        // deep query: projecting every bindable can briefly double a large app's live heap and must not run merely
        // because the Resource Explorer is visible.
        this.#lsp.getResourceInventory({ ...options, includeTypeSurfaces: false }, token),
        this.#lsp.getAnalysisLimitations(options, token),
      ]), token);
      if (inventory.status === "rejected") throw inventory.reason;
      if (limitations.status === "rejected") {
        if (isRequestCancelledError(limitations.reason)) throw limitations.reason;
        this.#logger.warn("resourceExplorer.analysisLimitations.failed", {
          message: limitations.reason instanceof Error
            ? limitations.reason.message
            : String(limitations.reason),
        });
      }
      return {
        inventory: inventory.value,
        limitations: limitations.status === "fulfilled" ? limitations.value : null,
      };
    });
  }

  #rebuildTree(): void {
    if (this.#response != null) {
      this.#tree = buildTree(
        this.#response,
        this.#staleWorkspaceKeys,
        this.#analysisLimitations,
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
    this.#setAnalysisReviewContext(hasCurrentAnalysisLimitationRows(this.#analysisLimitations));
    this.#observe("view-state", {
      generation: this.#refreshGeneration,
      state: this.#phase.kind,
      message: this.#view?.message ?? null,
      description: this.#view?.description ?? null,
      hasIssues: this.#issueContext === true,
      updatingAll: this.#updatingAll,
      updatingWorkspaceCount: this.#updatingWorkspaceKeys.size,
      staleWorkspaceCount: this.#staleWorkspaceKeys.size,
      hasAnalysisReview: this.#analysisReviewContext === true,
    });
  }

  #viewMessage(counts: ReturnType<typeof resourceResponseCounts>): string | undefined {
    return withSingleProjectAnalysisMessage(
      this.#resourceViewMessage(counts),
      this.#response,
      this.#analysisLimitations,
    );
  }

  #resourceViewMessage(counts: ReturnType<typeof resourceResponseCounts>): string | undefined {
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

  #setAnalysisReviewContext(value: boolean): void {
    if (this.#analysisReviewContext === value) return;
    this.#analysisReviewContext = value;
    void this.#vscode.commands.executeCommand(
      "setContext",
      AureliaContext.ResourceExplorerHasAnalysisReview,
      value,
    ).then(undefined, (error) => {
      this.#logger.warn("resourceExplorer.analysisReviewContext.failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }

  #observeTreePublication(publicationKind: string): void {
    if (this.#observationId == null) return;
    this.#observe("publish-start", {
      generation: this.#refreshGeneration,
      publicationKind,
      workspaceIdentity: observedIdentity("workspace", this.#publicationWorkspaceKey),
      fingerprint: this.#publicationFingerprint,
      rootCount: this.#tree.length,
    });
    let ordinal = 0;
    const visit = (nodes: readonly TreeNode[], parentId: string | null): void => {
      for (const node of nodes) {
        const nodeId = observedIdentity("tree-node", node.id)!;
        this.#observe("publish-node", {
          generation: this.#refreshGeneration,
          publicationKind,
          ordinal: ordinal++,
          parentId,
          nodeId,
          nodeKind: node.nodeKind,
          label: node.label,
          description: node.description ?? null,
          accessibilityLabel: node.accessibilityLabel,
          contextValue: node.contextValue,
          command: node.navigation == null ? null : AureliaCommand.OpenResource,
          navigationWorkspaceIdentity: observedIdentity("workspace", node.navigation?.workspaceKey ?? null),
          navigationProjectKey: node.navigation?.projectKey ?? null,
          navigationFingerprint: node.navigation?.fingerprint ?? null,
          navigationResourceIdentity: node.navigation?.resourceIdentityKey ?? null,
          navigationChildIdentity: node.navigation?.childIdentityKey ?? null,
          navigationRole: node.navigation?.role ?? null,
          navigationPlacement: node.navigation == null ? null : node.navigation.placement ?? "preview",
          implementationAvailable: node.implementationNavigation != null,
          implementationWorkspaceIdentity: observedIdentity(
            "workspace",
            node.implementationNavigation?.workspaceKey ?? null,
          ),
          implementationProjectKey: node.implementationNavigation?.projectKey ?? null,
          implementationFingerprint: node.implementationNavigation?.fingerprint ?? null,
          implementationResourceIdentity: node.implementationNavigation?.resourceIdentityKey ?? null,
          implementationRole: node.implementationNavigation?.role ?? null,
          implementationPlacement: node.implementationNavigation == null
            ? null
            : node.implementationNavigation.placement ?? "preview",
          collapsible: node.collapsible,
          defaultExpanded: node.defaultExpanded === true,
          rowStates: node.observationStates.join("|"),
          answerResult: node.observationAnswerResult ?? null,
          answerCoverage: node.observationAnswerCoverage ?? null,
          answerRowCount: node.observationAnswerRowCount ?? null,
        });
        visit(node.children ?? [], nodeId);
      }
    };
    visit(this.#tree, null);
    this.#observe("publish-complete", {
      generation: this.#refreshGeneration,
      publicationKind,
      nodeCount: ordinal,
      rootCount: this.#tree.length,
      workspaceIdentity: observedIdentity("workspace", this.#publicationWorkspaceKey),
      fingerprint: this.#publicationFingerprint,
    });
  }

  #observe(
    phase: string,
    detail: Readonly<Record<string, string | number | boolean | null | undefined>>,
  ): void {
    if (this.#observationId == null) return;
    emitResourceDiscoveryHostObservation({
      source: "resource-explorer",
      observationId: this.#observationId,
      phase,
      ...detail,
    });
  }
}

function projectAnswerObservation(unit: ProjectUnit): {
  readonly observationAnswerResult: string | null;
  readonly observationAnswerCoverage: string | null;
  readonly observationAnswerRowCount: number | null;
} {
  if (unit.result?.status !== "ready") {
    return {
      observationAnswerResult: null,
      observationAnswerCoverage: null,
      observationAnswerRowCount: null,
    };
  }
  return {
    observationAnswerResult: unit.result.answer.result,
    observationAnswerCoverage: unit.result.answer.coverage,
    observationAnswerRowCount: unit.result.resources.length,
  };
}

function withProjectAnswerObservation(
  nodes: readonly TreeNode[],
  unit: ProjectUnit,
): readonly TreeNode[] {
  const observation = projectAnswerObservation(unit);
  return nodes.map((node) => ({
    ...node,
    ...observation,
    ...(node.children == null
      ? {}
      : { children: withProjectAnswerObservation(node.children, unit) }),
  }));
}

function currentNode(tree: readonly TreeNode[], candidate: unknown): TreeNode | null {
  if (candidate == null || typeof candidate !== "object" || !("id" in candidate)) return null;
  const id = (candidate as { readonly id?: unknown }).id;
  if (typeof id !== "string") return null;
  return currentNodeById(tree, id, resourceDiscoveryHostAcceptanceEnabled());
}

function currentNodeReference(tree: readonly TreeNode[], candidate: unknown): TreeNode | null {
  if (candidate == null || typeof candidate !== "object") return null;
  for (const node of tree) {
    if (node === candidate) return node;
    const nested = currentNodeReference(node.children ?? [], candidate);
    if (nested != null) return nested;
  }
  return null;
}

function currentNodeById(
  tree: readonly TreeNode[],
  id: string,
  allowObservedIdentity: boolean,
): TreeNode | null {
  for (const node of tree) {
    if (
      node.id === id
      || (allowObservedIdentity && observedIdentity("tree-node", node.id) === id)
    ) return node;
    const nested = currentNodeById(node.children ?? [], id, allowObservedIdentity);
    if (nested != null) return nested;
  }
  return null;
}

function observedIdentity(prefix: string, value: string | null): string | null {
  if (value == null) return null;
  return `${prefix}:${createHash("sha256").update(value).digest("hex")}`;
}

function responseFingerprintForWorkspace(
  response: ResourceInventorySnapshot | null,
  workspaceKey: string | null,
): string | null {
  if (response == null) return null;
  if (workspaceKey == null) {
    if (response.workspaces.length !== 1) return null;
    const [workspace] = response.workspaces;
    return workspace?.status === "ready" ? workspace.response.fingerprint : null;
  }
  const ready = response.workspaces.flatMap((workspace) =>
    workspace.status === "ready" && workspace.key === workspaceKey
      ? [workspace.response.fingerprint]
      : []
  );
  return ready.length === 1 ? ready[0]! : null;
}

function observationStates(
  states: readonly ResourceTreeRowState[],
  metadataState: ResourceInventoryItem["metadataState"],
  navigable: boolean,
): readonly ResourceExplorerObservedRowState[] {
  return [
    ...states,
    ...(metadataState === "full-definition" ? [] : ["metadata-incomplete" as const]),
    ...(navigable ? [] : ["non-navigable" as const]),
  ];
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

function reconcileAnalysisLimitations(
  inventory: ResourceInventorySnapshot | null,
  incoming: AnalysisLimitationsSnapshot | null,
  previous: readonly AnalysisLimitationPublication[],
  workspaceKey: string | null,
): {
  readonly publications: readonly AnalysisLimitationPublication[];
  readonly retrySuggested: boolean;
} {
  const publications = workspaceKey == null
    ? []
    : previous.filter((entry) => entry.workspaceKey !== workspaceKey);
  const previousByProject = new Map(previous.map((entry) => [
    projectAnalysisIdentity(entry.workspaceKey, entry.projectKey),
    entry,
  ]));
  let retrySuggested = false;
  for (const workspace of inventory?.workspaces ?? []) {
    if (workspaceKey != null && workspace.key !== workspaceKey) continue;
    if (workspace.status !== "ready") continue;
    const limitationWorkspaces = (incoming?.workspaces ?? []).filter((candidate) =>
      candidate.key === workspace.key && candidate.uri === workspace.uri
    );
    const limitationWorkspace = limitationWorkspaces.length === 1
      ? limitationWorkspaces[0]!
      : null;
    const inventoryProjectKeys = exactProjectKeys(
      workspace.response.projects.map((project) => project.project.projectKey),
    );
    const limitationProjectKeys = limitationWorkspace?.status === "ready"
      ? exactProjectKeys(limitationWorkspace.response.projects.map((project) => project.projectKey))
      : null;
    const exactGeneration = limitationWorkspace?.status === "ready"
      && limitationWorkspace.response.fingerprint === workspace.response.fingerprint;
    const exactProjects = exactGeneration
      && inventoryProjectKeys != null
      && limitationProjectKeys != null
      && sameStrings(inventoryProjectKeys, limitationProjectKeys);
    if (
      limitationWorkspace?.status === "ready"
      && (!exactGeneration || !exactProjects)
    ) {
      retrySuggested = true;
    }

    for (const project of workspace.response.projects) {
      const projectKey = project.project.projectKey;
      const previousPublication = previousByProject.get(
        projectAnalysisIdentity(workspace.key, projectKey),
      );
      const exactLimitationWorkspace = exactProjects && limitationWorkspace?.status === "ready"
        ? limitationWorkspace
        : null;
      const exactResults = exactLimitationWorkspace == null
        ? []
        : exactLimitationWorkspace.response.projects.filter((result) => result.projectKey === projectKey);
      const exactResult = exactResults.length === 1 ? exactResults[0]! : null;
      if (
        exactResult?.status === "ready"
        && authoritativeAnalysisLimitationsResult(exactResult)
      ) {
        publications.push({
          workspaceKey: workspace.key,
          workspaceUri: workspace.uri,
          projectKey,
          fingerprint: exactLimitationWorkspace!.response.fingerprint,
          kind: exactResult.candidateCount > 0 ? "current-limited" : "current-none",
          result: exactResult,
        });
        continue;
      }
      publications.push(staleOrUnavailableAnalysisPublication(
        workspace.key,
        workspace.uri,
        projectKey,
        previousPublication,
      ));
    }
  }
  publications.sort((left, right) =>
    left.workspaceUri.localeCompare(right.workspaceUri)
    || left.projectKey.localeCompare(right.projectKey)
  );
  return { publications, retrySuggested };
}

function authoritativeAnalysisLimitationsResult(
  result: ReadyAnalysisLimitationsProject,
): boolean {
  if (
    result.answer.result !== "answered"
    || result.answer.coverage !== "complete"
    || !fullyDrainedAnalysisLimitationPage(result)
  ) {
    return false;
  }
  if (
    !Number.isSafeInteger(result.candidateCount)
    || result.candidateCount < 0
    || !Number.isSafeInteger(result.suppressedCandidateCount)
    || result.suppressedCandidateCount < 0
    || result.suppressedCandidateCount > result.candidateCount
  ) {
    return false;
  }
  return result.rows.length === result.candidateCount - result.suppressedCandidateCount;
}

function fullyDrainedAnalysisLimitationPage(result: ReadyAnalysisLimitationsProject): boolean {
  const page = result.answer.page;
  if (page == null) return true;
  return page.cursor === null
    && page.nextCursor === null
    && page.exhausted === true
    && page.cursorProblem == null
    && Number.isSafeInteger(page.returnedRows)
    && page.returnedRows === result.rows.length
    && Number.isSafeInteger(page.totalRows)
    && page.totalRows === result.rows.length;
}

function staleOrUnavailableAnalysisPublication(
  workspaceKey: string,
  workspaceUri: string,
  projectKey: string,
  previous: AnalysisLimitationPublication | undefined,
): AnalysisLimitationPublication {
  if (
    previous?.workspaceUri === workspaceUri
    && previous.result != null
    && previous.result.candidateCount > 0
    && (previous.kind === "current-limited" || previous.kind === "stale-limited")
  ) {
    return { ...previous, kind: "stale-limited" };
  }
  return {
    workspaceKey,
    workspaceUri,
    projectKey,
    fingerprint: null,
    kind: "unavailable",
    result: null,
  };
}

function markAnalysisLimitationsStale(
  publications: readonly AnalysisLimitationPublication[],
  workspaceKey: string | null,
): readonly AnalysisLimitationPublication[] {
  return publications.map((publication) => {
    if (workspaceKey != null && publication.workspaceKey !== workspaceKey) return publication;
    if (publication.kind === "current-limited") return { ...publication, kind: "stale-limited" };
    if (publication.kind === "current-none") {
      return { ...publication, fingerprint: null, kind: "unavailable", result: null };
    }
    return publication;
  });
}

function exactProjectKeys(values: readonly string[]): readonly string[] | null {
  const keys = [...values].sort((left, right) => left.localeCompare(right));
  return new Set(keys).size === keys.length ? keys : null;
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function projectAnalysisIdentity(workspaceKey: string, projectKey: string): string {
  return `${workspaceKey}\u0000${projectKey}`;
}

function hasCurrentAnalysisLimitationRows(publications: readonly AnalysisLimitationPublication[]): boolean {
  return publications.some((entry) =>
    entry.result != null
    && entry.result.rows.length > 0
    && entry.kind === "current-limited"
  );
}

function withSingleProjectAnalysisMessage(
  resourceMessage: string | undefined,
  response: ResourceInventorySnapshot | null,
  publications: readonly AnalysisLimitationPublication[],
): string | undefined {
  if (response == null) return resourceMessage;
  const units = projectUnits(response);
  if (units.length !== 1) return resourceMessage;
  const unit = units[0]!;
  const projectKey = unit.result?.project.projectKey;
  if (projectKey == null) return resourceMessage;
  const limitation = publications.find((entry) =>
    entry.workspaceKey === unit.workspace.key && entry.projectKey === projectKey
  );
  const analysisMessage = limitation?.kind === "current-limited"
    ? limitation.result != null && limitation.result.rows.length === 0
      ? "Analysis is limited. Finding policy hides the current details."
      : "Analysis is limited. Review Analysis Limitations for details."
    : limitation?.kind === "stale-limited"
      ? "Analysis may be limited — showing the previous review until refresh succeeds."
      : undefined;
  if (analysisMessage == null) return resourceMessage;
  return resourceMessage == null ? analysisMessage : `${resourceMessage} ${analysisMessage}`;
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
