import type { CancellationToken, Disposable } from "vscode";
import {
  emitExtensionHostObservation,
  nextExtensionHostObservationId,
  type ExtensionHostObservationValue,
} from "./extension-host-observation.js";

const EXTENSION_HOST_OBSERVATION_ENV = "AURELIA_LS_EXTENSION_HOST_OBSERVATION";
const RESOURCE_DISCOVERY_ACCEPTANCE_ENV = "AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE";
const EXPECTED_VSCODE_VERSION_ENV = "AURELIA_LS_EXTENSION_HOST_EXPECTED_VERSION";

export const RESOURCE_DISCOVERY_HOST_CONTROL_EVENT = "aurelia-ls:resource-discovery-host-control";
export const RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA = "aurelia-resource-discovery-host-control/1";

export type ResourceDiscoveryHostOperation = "inventory" | "availability";
export type ResourceDiscoveryHostStage = "before-dispatch" | "after-response";
export type ResourceDiscoveryHostEffect =
  | "barrier"
  | "project-error-once"
  | "all-error-once"
  | "newest-error-once";

export interface ResourceDiscoveryHostRequest {
  readonly operation: ResourceDiscoveryHostOperation;
  readonly workspaceKeys: readonly string[];
  readonly includeTypeSurfaces?: boolean;
  readonly projectKey?: string;
}

export interface ResourceDiscoveryHostFault {
  readonly controlId: string;
  readonly effect: Exclude<ResourceDiscoveryHostEffect, "barrier">;
  readonly workspaceKey: string;
  readonly projectKey?: string;
  readonly stableCode: string;
}

export interface ResourceDiscoveryHostControlOptions {
  readonly admittedWorkspaceKeys: () => readonly string[];
  readonly currentStable?: boolean;
  readonly installProcessListener?: boolean;
}

interface ResourceDiscoveryHostMatcher {
  readonly workspaceKey: string;
  readonly includeTypeSurfaces?: boolean;
  readonly projectKey?: string;
}

interface ArmedControl {
  readonly controlId: string;
  readonly operation: ResourceDiscoveryHostOperation;
  readonly stage: ResourceDiscoveryHostStage;
  readonly match: ResourceDiscoveryHostMatcher;
  readonly effect: ResourceDiscoveryHostEffect;
  readonly stableCode?: string;
  readonly armOrdinal: number;
}

interface PendingBarrier {
  readonly control: ArmedControl;
  readonly requestOrdinal: number;
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
  cancellationSubscription?: Disposable;
}

interface ResourceDiscoveryHostArmPayload {
  readonly schemaVersion: typeof RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA;
  readonly action: "arm";
  readonly controlId: string;
  readonly operation: ResourceDiscoveryHostOperation;
  readonly stage: ResourceDiscoveryHostStage;
  readonly match: ResourceDiscoveryHostMatcher;
  readonly effect: ResourceDiscoveryHostEffect;
  readonly stableCode?: string;
}

interface ResourceDiscoveryHostReleasePayload {
  readonly schemaVersion: typeof RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA;
  readonly action: "release";
  readonly controlId: string;
}

interface ResourceDiscoveryHostResetPayload {
  readonly schemaVersion: typeof RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA;
  readonly action: "reset";
  readonly controlId?: string;
}

type ResourceDiscoveryHostPayload =
  | ResourceDiscoveryHostArmPayload
  | ResourceDiscoveryHostReleasePayload
  | ResourceDiscoveryHostResetPayload;

const CONTROL_ID_LIMIT = 128;
const WORKSPACE_KEY_LIMIT = 2_048;
const PROJECT_KEY_LIMIT = 256;
const STABLE_CODE_LIMIT = 128;
const DEFAULT_STABLE_CODE = "AURELIA_RD_HOST_INJECTED_FAILURE";

export class ResourceDiscoveryHostCancellationError extends Error {
  readonly code = -32800;

  constructor(message = "Resource discovery host-controlled request was cancelled.") {
    super(message);
    this.name = "Canceled";
  }
}

class ResourceDiscoveryHostControlLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResourceDiscoveryHostControlLifecycleError";
  }
}

/**
 * Creates no listener or mutable controller state unless both explicit host
 * acceptance gates are enabled.
 */
export function createResourceDiscoveryHostControl(
  options: Omit<ResourceDiscoveryHostControlOptions, "currentStable" | "installProcessListener">,
): ResourceDiscoveryHostControl | undefined {
  if (!resourceDiscoveryHostAcceptanceEnabled()) return undefined;
  return new ResourceDiscoveryHostControl({
    ...options,
    currentStable: process.env[EXPECTED_VSCODE_VERSION_ENV] === "stable",
    installProcessListener: true,
  });
}

export function resourceDiscoveryHostAcceptanceEnabled(): boolean {
  return process.env[EXTENSION_HOST_OBSERVATION_ENV] === "1"
    && process.env[RESOURCE_DISCOVERY_ACCEPTANCE_ENV] === "1";
}

/** Emit C2-only detached facts without broadening the generic observation gate. */
export function emitResourceDiscoveryHostObservation(
  event: Readonly<{
    source: string;
    observationId: string;
    phase: string;
    [key: string]: ExtensionHostObservationValue;
  }>,
): void {
  if (!resourceDiscoveryHostAcceptanceEnabled()) return;
  emitExtensionHostObservation(event);
}

export function nextResourceDiscoveryHostObservationId(prefix: string): string | undefined {
  return resourceDiscoveryHostAcceptanceEnabled()
    ? nextExtensionHostObservationId(prefix)
    : undefined;
}

export class ResourceDiscoveryHostControl implements Disposable {
  readonly #admittedWorkspaceKeys: () => readonly string[];
  readonly #currentStable: boolean;
  readonly #armed = new Map<string, ArmedControl>();
  readonly #pending = new Map<string, PendingBarrier>();
  readonly #admittedProjects = new Map<string, Set<string>>();
  readonly #seenReadyWorkspaces = new Set<string>();
  readonly #processListener?: (payload: unknown) => void;
  #requestOrdinal = 0;
  #armOrdinal = 0;
  #disposed = false;

  constructor(options: ResourceDiscoveryHostControlOptions) {
    this.#admittedWorkspaceKeys = options.admittedWorkspaceKeys;
    this.#currentStable = options.currentStable === true;
    if (options.installProcessListener === true) {
      this.#processListener = (payload: unknown) => this.dispatch(payload);
      process.on(RESOURCE_DISCOVERY_HOST_CONTROL_EVENT, this.#processListener);
    }
  }

  get liveControlCount(): number {
    return this.#armed.size + this.#pending.size;
  }

  dispatch(payload: unknown): void {
    if (this.#disposed) {
      this.#rejectObservation(controlIdFromUnknown(payload), "controller-disposed");
      return;
    }
    let parsed: ReturnType<typeof parseControlPayload>;
    try {
      parsed = parseControlPayload(payload);
    } catch {
      this.#rejectObservation("host-control", "payload-read-failed");
      return;
    }
    if (!parsed.ok) {
      this.#rejectObservation(parsed.controlId, parsed.reason);
      return;
    }
    switch (parsed.payload.action) {
      case "arm":
        this.#arm(parsed.payload);
        return;
      case "release":
        this.#release(parsed.payload.controlId);
        return;
      case "reset":
        this.#reset(parsed.payload.controlId);
        return;
    }
  }

  noteInventory(
    workspaces: readonly {
      readonly key: string;
      readonly status: "ready" | "error";
      readonly response?: {
        readonly projects: readonly {
          readonly status: "ready" | "error";
          readonly project: { readonly projectKey: string };
        }[];
      };
    }[],
  ): void {
    for (const workspace of workspaces) {
      if (workspace.status !== "ready" || workspace.response == null) continue;
      this.#seenReadyWorkspaces.add(workspace.key);
      const projects = this.#admittedProjects.get(workspace.key) ?? new Set<string>();
      for (const project of workspace.response.projects) projects.add(project.project.projectKey);
      this.#admittedProjects.set(workspace.key, projects);
    }
  }

  noteAvailability(
    workspaceKey: string,
    selection: {
      readonly status: string;
      readonly project?: { readonly projectKey: string };
      readonly candidates?: readonly { readonly projectKey: string }[];
    },
  ): void {
    const projects = this.#admittedProjects.get(workspaceKey) ?? new Set<string>();
    if (selection.status === "exact" && selection.project != null) {
      projects.add(selection.project.projectKey);
    }
    if (selection.status === "ambiguous") {
      for (const candidate of selection.candidates ?? []) projects.add(candidate.projectKey);
    }
    if (projects.size > 0) this.#admittedProjects.set(workspaceKey, projects);
  }

  async beforeDispatch(request: ResourceDiscoveryHostRequest, token?: CancellationToken): Promise<number> {
    const requestOrdinal = ++this.#requestOrdinal;
    await this.#applyStage("before-dispatch", request, requestOrdinal, null, undefined, token);
    return requestOrdinal;
  }

  async afterResponse<T>(
    request: ResourceDiscoveryHostRequest,
    requestOrdinal: number,
    responseFingerprint: string | null,
    value: T,
    applyFault: (value: T, fault: ResourceDiscoveryHostFault) => { readonly applied: boolean; readonly value: T },
    token?: CancellationToken,
  ): Promise<T> {
    return this.#applyStage(
      "after-response",
      request,
      requestOrdinal,
      responseFingerprint,
      { value, applyFault },
      token,
    );
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#processListener != null) {
      process.removeListener(RESOURCE_DISCOVERY_HOST_CONTROL_EVENT, this.#processListener);
    }
    const count = this.liveControlCount;
    for (const pending of this.#pending.values()) {
      pending.cancellationSubscription?.dispose();
      pending.reject(new ResourceDiscoveryHostControlLifecycleError("Resource discovery host control was disposed."));
    }
    this.#pending.clear();
    this.#armed.clear();
    this.#observe("host-control", "disposed", { controlCount: count });
  }

  async #applyStage<T>(
    stage: ResourceDiscoveryHostStage,
    request: ResourceDiscoveryHostRequest,
    requestOrdinal: number,
    responseFingerprint: string | null,
    response: {
      readonly value: T;
      readonly applyFault: (
        value: T,
        fault: ResourceDiscoveryHostFault,
      ) => { readonly applied: boolean; readonly value: T };
    } | undefined,
    token?: CancellationToken,
  ): Promise<T> {
    let value = response?.value as T;
    const controls = [...this.#armed.values()]
      .filter((control) => control.stage === stage && controlMatches(control, request))
      .sort((left, right) => left.armOrdinal - right.armOrdinal);
    for (const control of controls) {
      this.#armed.delete(control.controlId);
      if (control.effect === "barrier") {
        await this.#block(control, request, requestOrdinal, responseFingerprint, token);
        continue;
      }
      if (response == null) {
        this.#rejectObservation(control.controlId, "fault-before-response");
        throw new ResourceDiscoveryHostControlLifecycleError("A host fault was matched before a real response existed.");
      }
      const fault: ResourceDiscoveryHostFault = {
        controlId: control.controlId,
        effect: control.effect,
        workspaceKey: control.match.workspaceKey,
        ...(control.match.projectKey == null ? {} : { projectKey: control.match.projectKey }),
        stableCode: control.stableCode ?? DEFAULT_STABLE_CODE,
      };
      const applied = response.applyFault(value, fault);
      if (!applied.applied) {
        this.#rejectObservation(control.controlId, "fault-target-unavailable");
        throw new ResourceDiscoveryHostControlLifecycleError(
          `Resource discovery host fault ${control.controlId} did not match a genuine response row.`,
        );
      }
      value = applied.value;
      this.#observe(control.controlId, "fault-applied", {
        effect: control.effect,
        requestOrdinal,
        stableCode: fault.stableCode,
        workspaceKey: control.match.workspaceKey,
        projectKey: control.match.projectKey,
      });
    }
    return value;
  }

  #block(
    control: ArmedControl,
    request: ResourceDiscoveryHostRequest,
    requestOrdinal: number,
    responseFingerprint: string | null,
    token?: CancellationToken,
  ): Promise<void> {
    if (token?.isCancellationRequested === true) {
      this.#observe(control.controlId, "cancelled", { requestOrdinal });
      return Promise.reject(new ResourceDiscoveryHostCancellationError());
    }
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (action: "resolve" | "reject", error?: Error): void => {
        if (settled) return;
        settled = true;
        const pending = this.#pending.get(control.controlId);
        pending?.cancellationSubscription?.dispose();
        this.#pending.delete(control.controlId);
        if (action === "resolve") resolve();
        else reject(error ?? new ResourceDiscoveryHostControlLifecycleError("Host barrier ended unexpectedly."));
      };
      const pending: PendingBarrier = {
        control,
        requestOrdinal,
        resolve: () => finish("resolve"),
        reject: (error) => finish("reject", error),
      };
      this.#pending.set(control.controlId, pending);
      pending.cancellationSubscription = token?.onCancellationRequested(() => {
        this.#observe(control.controlId, "cancelled", { requestOrdinal });
        finish("reject", new ResourceDiscoveryHostCancellationError());
      });
      if (settled) pending.cancellationSubscription?.dispose();
      this.#observe(control.controlId, "blocked", {
        operation: request.operation,
        stage: control.stage,
        requestOrdinal,
        workspaceKey: control.match.workspaceKey,
        includeTypeSurfaces: request.includeTypeSurfaces,
        projectKey: request.projectKey,
        responseFingerprint,
      });
    });
  }

  #arm(payload: ResourceDiscoveryHostArmPayload): void {
    if (this.#armed.has(payload.controlId) || this.#pending.has(payload.controlId)) {
      this.#rejectObservation(payload.controlId, "duplicate-control-id");
      return;
    }
    if (!this.#admittedWorkspaceKeys().includes(payload.match.workspaceKey)) {
      this.#rejectObservation(payload.controlId, "workspace-not-admitted");
      return;
    }
    if (
      payload.match.projectKey != null
      && !this.#admittedProjects.get(payload.match.workspaceKey)?.has(payload.match.projectKey)
    ) {
      this.#rejectObservation(payload.controlId, "project-not-admitted");
      return;
    }
    if (payload.effect === "all-error-once" && !this.#currentStable) {
      this.#rejectObservation(payload.controlId, "effect-not-admitted-in-lane");
      return;
    }
    if (
      payload.effect === "newest-error-once"
      && !this.#seenReadyWorkspaces.has(payload.match.workspaceKey)
    ) {
      this.#rejectObservation(payload.controlId, "newest-error-requires-prior-ready-response");
      return;
    }
    const control: ArmedControl = { ...payload, armOrdinal: ++this.#armOrdinal };
    this.#armed.set(control.controlId, control);
    this.#observe(control.controlId, "armed", {
      operation: control.operation,
      stage: control.stage,
      effect: control.effect,
      workspaceKey: control.match.workspaceKey,
      includeTypeSurfaces: control.match.includeTypeSurfaces,
      projectKey: control.match.projectKey,
      stableCode: control.stableCode,
    });
  }

  #release(controlId: string): void {
    const pending = this.#pending.get(controlId);
    if (pending == null) {
      this.#rejectObservation(controlId, "barrier-not-blocked");
      return;
    }
    this.#observe(controlId, "released", { requestOrdinal: pending.requestOrdinal });
    pending.resolve();
  }

  #reset(controlId?: string): void {
    const ids = controlId == null
      ? [...new Set([...this.#armed.keys(), ...this.#pending.keys()])]
      : [controlId];
    for (const id of ids) {
      this.#armed.delete(id);
      const pending = this.#pending.get(id);
      if (pending != null) {
        pending.reject(new ResourceDiscoveryHostControlLifecycleError(`Host control ${id} was reset.`));
      }
      this.#observe(id, "reset", { pending: pending != null });
    }
    if (controlId == null && ids.length === 0) {
      this.#observe("host-control", "reset", { pending: false });
    }
  }

  #rejectObservation(controlId: string, reason: string): void {
    this.#observe(controlId, "rejected", { reason });
  }

  #observe(
    controlId: string,
    phase: string,
    details: Readonly<Record<string, ExtensionHostObservationValue>> = {},
  ): void {
    emitResourceDiscoveryHostObservation({
      source: "resource-discovery-host-control",
      observationId: controlId.length === 0 ? "host-control" : controlId,
      phase,
      ...details,
    });
  }
}

function controlMatches(control: ArmedControl, request: ResourceDiscoveryHostRequest): boolean {
  if (control.operation !== request.operation) return false;
  if (!request.workspaceKeys.includes(control.match.workspaceKey)) return false;
  if (
    control.match.includeTypeSurfaces != null
    && control.match.includeTypeSurfaces !== request.includeTypeSurfaces
  ) return false;
  return control.operation === "inventory"
    || control.match.projectKey == null
    || control.match.projectKey === request.projectKey;
}

function parseControlPayload(
  rawInput: unknown,
): { readonly ok: true; readonly payload: ResourceDiscoveryHostPayload }
  | { readonly ok: false; readonly controlId: string; readonly reason: string } {
  const inputSnapshot = snapshotPlainRecord(rawInput);
  if (inputSnapshot.kind === "not-plain") {
    return { ok: false, controlId: "host-control", reason: "payload-not-plain-object" };
  }
  if (inputSnapshot.kind === "read-failed") {
    return { ok: false, controlId: "host-control", reason: "payload-read-failed" };
  }
  const input = inputSnapshot.value;
  const controlId = controlIdFromSnapshot(input);
  if (inputSnapshot.hasSymbolKeys) {
    return { ok: false, controlId, reason: "payload-fields-invalid" };
  }
  if (!hasOwnKeys(input, ["schemaVersion", "action"])) {
    return { ok: false, controlId, reason: "payload-required-fields-missing" };
  }
  if (input.schemaVersion !== RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA) {
    return { ok: false, controlId, reason: "schema-version-unsupported" };
  }
  if (input.action === "arm") return parseArmPayload(input, controlId);
  if (input.action === "release") {
    if (!hasExactKeys(input, ["schemaVersion", "action", "controlId"])) {
      return { ok: false, controlId, reason: "release-fields-invalid" };
    }
    if (!validBoundedString(input.controlId, CONTROL_ID_LIMIT)) {
      return { ok: false, controlId, reason: "control-id-invalid" };
    }
    return {
      ok: true,
      payload: {
        schemaVersion: RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA,
        action: "release",
        controlId: input.controlId,
      },
    };
  }
  if (input.action === "reset") {
    if (!hasOnlyKeys(input, ["schemaVersion", "action", "controlId"])) {
      return { ok: false, controlId, reason: "reset-fields-invalid" };
    }
    const hasResetControlId = Object.hasOwn(input, "controlId");
    const resetControlId = hasResetControlId ? input.controlId : undefined;
    if (hasResetControlId && !validBoundedString(resetControlId, CONTROL_ID_LIMIT)) {
      return { ok: false, controlId, reason: "control-id-invalid" };
    }
    return {
      ok: true,
      payload: {
        schemaVersion: RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA,
        action: "reset",
        controlId: typeof resetControlId === "string" ? resetControlId : undefined,
      },
    };
  }
  return { ok: false, controlId, reason: "action-unsupported" };
}

function parseArmPayload(
  input: Readonly<Record<string, unknown>>,
  controlId: string,
): { readonly ok: true; readonly payload: ResourceDiscoveryHostArmPayload }
  | { readonly ok: false; readonly controlId: string; readonly reason: string } {
  const matchSnapshot = snapshotPlainRecord(input.match);
  if (matchSnapshot.kind === "read-failed") {
    return { ok: false, controlId, reason: "payload-read-failed" };
  }
  if (!hasOnlyKeys(input, [
    "schemaVersion",
    "action",
    "controlId",
    "operation",
    "stage",
    "match",
    "effect",
    "stableCode",
  ])) return { ok: false, controlId, reason: "arm-fields-invalid" };
  if (!hasOwnKeys(input, [
    "schemaVersion",
    "action",
    "controlId",
    "operation",
    "stage",
    "match",
    "effect",
  ])) return { ok: false, controlId, reason: "arm-required-fields-missing" };
  if (!validBoundedString(input.controlId, CONTROL_ID_LIMIT)) {
    return { ok: false, controlId, reason: "control-id-invalid" };
  }
  if (input.operation !== "inventory" && input.operation !== "availability") {
    return { ok: false, controlId, reason: "operation-unsupported" };
  }
  if (input.stage !== "before-dispatch" && input.stage !== "after-response") {
    return { ok: false, controlId, reason: "stage-unsupported" };
  }
  if (!isHostEffect(input.effect)) return { ok: false, controlId, reason: "effect-unsupported" };
  if (matchSnapshot.kind !== "snapshot" || matchSnapshot.hasSymbolKeys || !hasOnlyKeys(matchSnapshot.value, [
    "workspaceKey",
    "includeTypeSurfaces",
    "projectKey",
  ]) || !hasOwnKeys(matchSnapshot.value, ["workspaceKey"])) {
    return { ok: false, controlId, reason: "match-fields-invalid" };
  }
  const match = matchSnapshot.value;
  if (!validBoundedString(match.workspaceKey, WORKSPACE_KEY_LIMIT)) {
    return { ok: false, controlId, reason: "workspace-key-invalid" };
  }
  const includeTypeSurfaces = Object.hasOwn(match, "includeTypeSurfaces")
    ? match.includeTypeSurfaces
    : undefined;
  const projectKey = Object.hasOwn(match, "projectKey")
    ? match.projectKey
    : undefined;
  const stableCode = Object.hasOwn(input, "stableCode") ? input.stableCode : undefined;
  const hasIncludeTypeSurfaces = Object.hasOwn(match, "includeTypeSurfaces");
  const hasProjectKey = Object.hasOwn(match, "projectKey");
  const hasStableCode = Object.hasOwn(input, "stableCode");
  if (hasIncludeTypeSurfaces && typeof includeTypeSurfaces !== "boolean") {
    return { ok: false, controlId, reason: "include-type-surfaces-invalid" };
  }
  if (hasProjectKey && !validBoundedString(projectKey, PROJECT_KEY_LIMIT)) {
    return { ok: false, controlId, reason: "project-key-invalid" };
  }
  if (hasStableCode && !validStableCode(stableCode)) {
    return { ok: false, controlId, reason: "stable-code-invalid" };
  }
  if (input.operation === "availability" && hasIncludeTypeSurfaces) {
    return { ok: false, controlId, reason: "availability-type-surface-match-forbidden" };
  }
  if (
    input.operation === "inventory"
    && input.effect !== "project-error-once"
    && hasProjectKey
  ) return { ok: false, controlId, reason: "inventory-project-match-forbidden" };
  if (input.effect === "barrier") {
    if (hasStableCode) return { ok: false, controlId, reason: "barrier-stable-code-forbidden" };
    if (input.operation === "inventory" && typeof includeTypeSurfaces !== "boolean") {
      return { ok: false, controlId, reason: "inventory-barrier-requires-type-surface-match" };
    }
  } else {
    if (input.stage !== "after-response") return { ok: false, controlId, reason: "fault-requires-response" };
    if (input.operation !== "inventory") return { ok: false, controlId, reason: "availability-fault-unsupported" };
  }
  if (input.effect === "project-error-once" && !hasProjectKey) {
    return { ok: false, controlId, reason: "project-error-requires-project" };
  }
  if (
    (input.effect === "all-error-once" || input.effect === "newest-error-once")
    && hasProjectKey
  ) return { ok: false, controlId, reason: "effect-project-match-forbidden" };
  return {
    ok: true,
    payload: {
      schemaVersion: RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA,
      action: "arm",
      controlId: input.controlId,
      operation: input.operation,
      stage: input.stage,
      match: {
        workspaceKey: match.workspaceKey,
        includeTypeSurfaces: typeof includeTypeSurfaces === "boolean" ? includeTypeSurfaces : undefined,
        projectKey: typeof projectKey === "string" ? projectKey : undefined,
      },
      effect: input.effect,
      stableCode: typeof stableCode === "string" ? stableCode : undefined,
    },
  };
}

function isHostEffect(value: unknown): value is ResourceDiscoveryHostEffect {
  return value === "barrier"
    || value === "project-error-once"
    || value === "all-error-once"
    || value === "newest-error-once";
}

function controlIdFromUnknown(value: unknown): string {
  const snapshot = snapshotPlainRecord(value);
  return snapshot.kind === "snapshot" && !snapshot.hasSymbolKeys
    ? controlIdFromSnapshot(snapshot.value)
    : "host-control";
}

type PlainRecordSnapshot =
  | { readonly kind: "not-plain" }
  | { readonly kind: "read-failed" }
  | {
    readonly kind: "snapshot";
    readonly value: Readonly<Record<string, unknown>>;
    readonly hasSymbolKeys: boolean;
  };

/**
 * Detach an untrusted process-event payload before interpreting it. Property
 * descriptors are captured first so every accessor that was initially owned
 * by the record is evaluated exactly once, even when another accessor fails
 * or mutates the caller object while the snapshot is being built.
 */
function snapshotPlainRecord(value: unknown): PlainRecordSnapshot {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return { kind: "not-plain" };
  }

  let entries: readonly {
    readonly key: PropertyKey;
    readonly descriptor: PropertyDescriptor;
  }[];
  try {
    const prototype = Reflect.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return { kind: "not-plain" };
    entries = Reflect.ownKeys(value).map((key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (descriptor == null) throw new TypeError("An owned control field disappeared during snapshot.");
      return { key, descriptor };
    });
  } catch {
    return { kind: "read-failed" };
  }

  const snapshot: Record<string, unknown> = {};
  let hasSymbolKeys = false;
  let readFailed = false;
  for (const entry of entries) {
    let fieldValue: unknown;
    try {
      fieldValue = Object.hasOwn(entry.descriptor, "value")
        ? entry.descriptor.value
        : entry.descriptor.get?.call(value);
    } catch {
      readFailed = true;
      continue;
    }
    if (typeof entry.key === "symbol") {
      hasSymbolKeys = true;
      continue;
    }
    Object.defineProperty(snapshot, entry.key, {
      configurable: false,
      enumerable: true,
      value: fieldValue,
      writable: false,
    });
  }
  if (readFailed) return { kind: "read-failed" };
  return { kind: "snapshot", value: snapshot, hasSymbolKeys };
}

function controlIdFromSnapshot(value: Readonly<Record<string, unknown>>): string {
  return Object.hasOwn(value, "controlId")
    && validBoundedString(value.controlId, CONTROL_ID_LIMIT)
    ? value.controlId
    : "host-control";
}

function hasOnlyKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return hasOnlyKeys(value, keys) && keys.every((key) => Object.hasOwn(value, key));
}

function hasOwnKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return keys.every((key) => Object.hasOwn(value, key));
}

function validBoundedString(value: unknown, limit: number): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= limit
    && !/[\p{Cc}\p{Cf}]/u.test(value);
}

function validStableCode(value: unknown): value is string {
  return validBoundedString(value, STABLE_CODE_LIMIT) && /^[A-Za-z0-9_.:-]+$/u.test(value);
}
