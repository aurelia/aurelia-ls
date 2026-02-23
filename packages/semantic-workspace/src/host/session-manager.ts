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
  readonly workspace: SemanticWorkspaceEngine;
  readonly documents: Map<DocumentUri, HostOpenDocumentState>;
  nextCommandSequence: number;
}

export interface HostSessionManagerOptions {
  readonly logger?: Logger;
  readonly defaultWorkspaceRoot?: string;
  readonly workspaceFactory?: HostWorkspaceFactory;
}

export class HostSessionManager {
  readonly #logger: Logger;
  readonly #workspaceFactory: HostWorkspaceFactory;
  readonly #defaultWorkspaceRoot: string | null;
  readonly #sessions = new Map<string, HostSessionState>();
  #sessionSequence = 0;

  constructor(options: HostSessionManagerOptions = {}) {
    this.#logger = options.logger ?? SILENT_LOGGER;
    this.#workspaceFactory = options.workspaceFactory ?? defaultWorkspaceFactory;
    this.#defaultWorkspaceRoot = options.defaultWorkspaceRoot
      ? path.resolve(options.defaultWorkspaceRoot)
      : null;
  }

  open(args: SessionOpenArgs): HostSessionState {
    const sessionId = args.sessionId ?? this.#nextSessionId();
    if (this.#sessions.has(sessionId)) {
      throw new Error(`Session already exists: ${sessionId}`);
    }

    const workspaceRoot = path.resolve(
      args.workspaceRoot ?? this.#defaultWorkspaceRoot ?? process.cwd(),
    );
    const workspace = this.#workspaceFactory({
      logger: this.#logger,
      workspaceRoot,
      tsconfigPath: args.tsconfigPath ?? null,
      configFileName: args.configFileName,
    });
    const profile = args.policy?.profile ?? "tooling";
    const session: HostSessionState = {
      id: sessionId,
      profile,
      workspaceRoot,
      tsconfigPath: args.tsconfigPath ?? null,
      configFileName: args.configFileName ?? null,
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
    return this.#sessions.delete(sessionId);
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
