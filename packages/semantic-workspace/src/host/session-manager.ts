import path from "node:path";
import { canonicalDocumentUri, stableHash, type DocumentUri, type Logger } from "@aurelia-ls/compiler";
import { createSemanticWorkspace, type SemanticWorkspaceEngine } from "../engine.js";
import type {
  SemanticAuthorityPolicyProfile,
  SessionOpenArgs,
  SessionStatusEntry,
} from "./types.js";

const SILENT_LOGGER: Logger = {
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

export interface HostWorkspaceFactoryOptions {
  readonly logger: Logger;
  readonly workspaceRoot: string;
  readonly tsconfigPath?: string | null;
  readonly configFileName?: string;
}

export type HostWorkspaceFactory = (
  options: HostWorkspaceFactoryOptions,
) => SemanticWorkspaceEngine;

export interface HostOpenDocumentState {
  readonly uri: DocumentUri;
  readonly version: number | null;
  readonly textHash: string;
}

export interface HostSessionState {
  readonly id: string;
  readonly profile: SemanticAuthorityPolicyProfile;
  readonly workspaceRoot: string;
  readonly tsconfigPath: string | null;
  readonly configFileName: string | null;
  readonly workspaceKey: string;
  readonly workspaceCacheHit: boolean;
  readonly workspace: SemanticWorkspaceEngine;
  readonly documents: Map<DocumentUri, HostOpenDocumentState>;
  nextCommandSequence: number;
}

export interface HostSessionManagerOptions {
  readonly logger?: Logger;
  readonly defaultWorkspaceRoot?: string;
  readonly workspaceFactory?: HostWorkspaceFactory;
  readonly maxIdleWorkspaces?: number;
}

export class HostSessionManager {
  readonly #logger: Logger;
  readonly #workspaceFactory: HostWorkspaceFactory;
  readonly #defaultWorkspaceRoot: string | null;
  readonly #maxIdleWorkspaces: number;
  readonly #sessions = new Map<string, HostSessionState>();
  readonly #idleWorkspaces = new Map<string, SemanticWorkspaceEngine>();
  readonly #idleWorkspaceOrder: string[] = [];
  #sessionSequence = 0;

  constructor(options: HostSessionManagerOptions = {}) {
    this.#logger = options.logger ?? SILENT_LOGGER;
    this.#workspaceFactory = options.workspaceFactory ?? defaultWorkspaceFactory;
    this.#defaultWorkspaceRoot = options.defaultWorkspaceRoot
      ? path.resolve(options.defaultWorkspaceRoot)
      : null;
    this.#maxIdleWorkspaces = normalizeMaxIdleWorkspaces(options.maxIdleWorkspaces);
  }

  open(args: SessionOpenArgs): HostSessionState {
    const sessionId = args.sessionId ?? this.#nextSessionId();
    if (this.#sessions.has(sessionId)) {
      throw new Error(`Session already exists: ${sessionId}`);
    }

    const resolvedRoot = args.workspaceRoot ?? this.#defaultWorkspaceRoot;
    if (!resolvedRoot) {
      throw new Error(
        "session.open requires workspaceRoot (or a defaultWorkspaceRoot on the session manager). " +
        "CWD fallback was removed because it silently analyzes the wrong project.",
      );
    }
    const workspaceRoot = path.resolve(resolvedRoot);
    const tsconfigPath = args.tsconfigPath ?? null;
    const configFileName = args.configFileName ?? null;
    const workspaceKey = stableHash({
      workspaceRoot,
      tsconfigPath: resolveTsconfigPath(workspaceRoot, tsconfigPath),
      configFileName,
    });
    const workspaceFactoryOptions: HostWorkspaceFactoryOptions = {
      logger: this.#logger,
      workspaceRoot,
      tsconfigPath,
      ...(configFileName ? { configFileName } : {}),
    };

    let workspaceCacheHit = false;
    let workspace = this.#acquireWorkspace(workspaceKey);
    if (workspace) {
      workspaceCacheHit = true;
      try {
        // Reused workspaces stay incrementally warm; callers can still request
        // an explicit session.refresh when they need a full external resync.
        workspace.refresh({ force: false });
      } catch (error) {
        this.#logger.warn(
          `[host.session] failed to refresh cached workspace; rebuilding (${String(error)})`,
        );
        disposeWorkspace(workspace, this.#logger);
        workspace = this.#workspaceFactory(workspaceFactoryOptions);
        workspaceCacheHit = false;
      }
    } else {
      workspace = this.#workspaceFactory(workspaceFactoryOptions);
    }

    const profile = args.policy?.profile ?? "tooling";
    const session: HostSessionState = {
      id: sessionId,
      profile,
      workspaceRoot,
      tsconfigPath,
      configFileName,
      workspaceKey,
      workspaceCacheHit,
      workspace,
      documents: new Map(),
      nextCommandSequence: 1,
    };

    this.#sessions.set(sessionId, session);
    return session;
  }

  get(sessionId: string): HostSessionState | undefined {
    return this.#sessions.get(sessionId);
  }

  require(sessionId: string): HostSessionState {
    const session = this.#sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return session;
  }

  close(sessionId: string): boolean {
    const session = this.#sessions.get(sessionId);
    if (!session) {
      return false;
    }

    for (const { uri } of session.documents.values()) {
      try {
        session.workspace.close(uri);
      } catch (error) {
        this.#logger.warn(
          `[host.session] failed to close document during session teardown (${uri}): ${String(error)}`,
        );
      }
    }
    session.documents.clear();
    this.#sessions.delete(sessionId);
    this.#releaseWorkspace(session.workspaceKey, session.workspace);
    return true;
  }

  nextCommandId(sessionId: string): string {
    const session = this.require(sessionId);
    const commandSequence = session.nextCommandSequence;
    session.nextCommandSequence += 1;
    return `${session.id}:cmd-${String(commandSequence).padStart(5, "0")}`;
  }

  profileOf(sessionId: string): SemanticAuthorityPolicyProfile | null {
    const session = this.#sessions.get(sessionId);
    return session ? session.profile : null;
  }

  workspaceFingerprint(session: HostSessionState): string | null {
    try {
      return session.workspace.snapshot().meta.fingerprint;
    } catch {
      return null;
    }
  }

  summaries(sessionId?: string): SessionStatusEntry[] {
    const sessions = sessionId
      ? [this.#sessions.get(sessionId)].filter((entry): entry is HostSessionState => !!entry)
      : Array.from(this.#sessions.values());
    return sessions.map((session) => ({
      sessionId: session.id,
      profile: session.profile,
      workspaceRoot: session.workspaceRoot,
      tsconfigPath: session.tsconfigPath,
      configFileName: session.configFileName,
      workspaceFingerprint: this.workspaceFingerprint(session),
      openDocumentCount: session.documents.size,
    }));
  }

  upsertDocument(
    sessionId: string,
    uri: DocumentUri | string,
    text: string,
    version?: number | null,
  ): HostOpenDocumentState {
    const session = this.require(sessionId);
    const canonicalUri = canonicalDocumentUri(uri).uri;
    const previous = session.documents.get(canonicalUri);
    const next: HostOpenDocumentState = {
      uri: canonicalUri,
      version: version ?? previous?.version ?? null,
      textHash: stableHash(text),
    };
    session.documents.set(canonicalUri, next);
    return next;
  }

  removeDocument(sessionId: string, uri: DocumentUri | string): boolean {
    const session = this.require(sessionId);
    const canonicalUri = canonicalDocumentUri(uri).uri;
    return session.documents.delete(canonicalUri);
  }

  #nextSessionId(): string {
    this.#sessionSequence += 1;
    return `session-${String(this.#sessionSequence).padStart(4, "0")}`;
  }

  #acquireWorkspace(
    workspaceKey: string,
  ): SemanticWorkspaceEngine | null {
    const cached = this.#idleWorkspaces.get(workspaceKey);
    if (cached) {
      this.#idleWorkspaces.delete(workspaceKey);
      this.#removeIdleWorkspaceOrderKey(workspaceKey);
      return cached;
    }
    return null;
  }

  #releaseWorkspace(
    workspaceKey: string,
    workspace: SemanticWorkspaceEngine,
  ): void {
    if (this.#maxIdleWorkspaces <= 0) {
      disposeWorkspace(workspace, this.#logger);
      return;
    }

    const existing = this.#idleWorkspaces.get(workspaceKey);
    if (existing) {
      this.#idleWorkspaces.delete(workspaceKey);
      this.#removeIdleWorkspaceOrderKey(workspaceKey);
      disposeWorkspace(existing, this.#logger);
    }
    this.#idleWorkspaces.set(workspaceKey, workspace);
    this.#idleWorkspaceOrder.push(workspaceKey);
    this.#trimIdleWorkspaces();
  }

  #trimIdleWorkspaces(): void {
    while (this.#idleWorkspaces.size > this.#maxIdleWorkspaces) {
      const evictedKey = this.#idleWorkspaceOrder.shift();
      if (!evictedKey) {
        break;
      }
      const evicted = this.#idleWorkspaces.get(evictedKey);
      if (!evicted) {
        continue;
      }
      this.#idleWorkspaces.delete(evictedKey);
      disposeWorkspace(evicted, this.#logger);
    }
  }

  #removeIdleWorkspaceOrderKey(workspaceKey: string): void {
    let index = this.#idleWorkspaceOrder.indexOf(workspaceKey);
    while (index !== -1) {
      this.#idleWorkspaceOrder.splice(index, 1);
      index = this.#idleWorkspaceOrder.indexOf(workspaceKey);
    }
  }
}

function defaultWorkspaceFactory(
  options: HostWorkspaceFactoryOptions,
): SemanticWorkspaceEngine {
  return createSemanticWorkspace({
    logger: options.logger,
    workspaceRoot: options.workspaceRoot,
    tsconfigPath: options.tsconfigPath ?? null,
    configFileName: options.configFileName,
  });
}

function normalizeMaxIdleWorkspaces(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }
  return Math.max(0, Math.floor(value));
}

function resolveTsconfigPath(
  workspaceRoot: string,
  tsconfigPath: string | null,
): string | null {
  if (!tsconfigPath) {
    return null;
  }
  return path.isAbsolute(tsconfigPath)
    ? path.resolve(tsconfigPath)
    : path.resolve(workspaceRoot, tsconfigPath);
}

function disposeWorkspace(
  workspace: SemanticWorkspaceEngine,
  logger: Logger,
): void {
  const candidate = workspace as SemanticWorkspaceEngine & { dispose?: () => void };
  if (typeof candidate.dispose !== "function") {
    return;
  }
  try {
    candidate.dispose();
  } catch (error) {
    logger.warn(`[host.session] workspace dispose failed (${String(error)})`);
  }
}
