import type { CancellationTokenSource, Disposable } from "vscode";
import type { AureliaLanguageClientSession } from "./client-core.js";
import type { ClientContext } from "./core/context.js";
import { INITIAL_CONTEXT_READINESS_TIMEOUT_MS, settlesBeforeDeadline } from "./core/context-readiness.js";
import { analysisCanChangeTemplateOwnership } from "./template-language.js";

interface WorkspaceSources {
  readonly session: AureliaLanguageClientSession;
  readonly incarnation: number;
  uris: readonly string[];
  pending?: CancellationTokenSource;
  ready?: Promise<void>;
  resultId?: string;
}

/**
 * VS Code evaluates resource-scoped when clauses in its renderer, before an extension-host editor-change listener
 * can prove the newly focused document. Publish actual pairs by URI; they authorize offering the command only.
 * The command still reads current destinations and refuses an obsolete invocation.
 */
export class RelatedFileContext implements Disposable {
  readonly #sources = new Map<string, WorkspaceSources>();
  readonly #subscriptions: Disposable[];

  constructor(private readonly ctx: ClientContext) {
    this.#subscriptions = [
      ctx.languageClient.onDidChangeSessions(() => this.#reconcile()),
      ctx.lsp.onAnalysisChanged((change) => {
        const entry = this.#sources.get(change.workspace.key);
        if (entry && analysisCanChangeTemplateOwnership(ctx, change)) this.#refresh(entry);
      }),
    ];
    this.#reconcile();
  }

  async waitForActiveWorkspace(): Promise<void> {
    const uri = this.ctx.vscode.window.activeTextEditor?.document.uri;
    const session = uri && this.ctx.languageClient.sessionForUri(uri);
    const ready = session && this.#sources.get(session.workspace.key)?.ready;
    if (ready) await settlesBeforeDeadline(ready, INITIAL_CONTEXT_READINESS_TIMEOUT_MS);
  }

  dispose(): void {
    for (const sub of this.#subscriptions) sub.dispose();
    for (const entry of this.#sources.values()) entry.pending?.cancel();
    this.#sources.clear();
    void this.#publish();
  }

  #reconcile(): void {
    const current = this.ctx.languageClient.sessions;
    let withdrawn = false;
    for (const [key, entry] of this.#sources) {
      if (current.some(session => session.client === entry.session.client && session.incarnation === entry.incarnation)) continue;
      entry.pending?.cancel();
      this.#sources.delete(key);
      withdrawn = true;
    }
    if (withdrawn) void this.#publish();
    for (const session of current) {
      if (this.#sources.has(session.workspace.key)) continue;
      const entry: WorkspaceSources = { session, incarnation: session.incarnation, uris: [] };
      this.#sources.set(session.workspace.key, entry);
      this.#refresh(entry);
    }
  }

  #refresh(entry: WorkspaceSources): void {
    entry.pending?.cancel();
    const cancellation = new this.ctx.vscode.CancellationTokenSource();
    entry.pending = cancellation;
    entry.ready = this.ctx.lsp.getRelatedFileSources(entry.session, cancellation.token, entry.resultId).then(({ uris, resultId }) => {
      if (cancellation.token.isCancellationRequested || this.#sources.get(entry.session.workspace.key) !== entry) return;
      if (uris == null) return;
      entry.uris = uris;
      entry.resultId = resultId;
      return this.#publish();
    }).catch((error: unknown) => {
      if (!cancellation.token.isCancellationRequested) {
        this.ctx.logger.warn("Could not refresh Open Related File command contexts.", undefined, error);
      }
    }).finally(() => {
      if (entry.pending === cancellation) delete entry.pending;
      cancellation.dispose();
    });
  }

  async #publish(): Promise<void> {
    const values: Record<string, boolean> = Object.create(null) as Record<string, boolean>;
    for (const { session, uris } of this.#sources.values()) {
      for (const text of uris) {
        const uri = this.ctx.vscode.Uri.parse(text, true);
        if (this.ctx.languageClient.sessionForUri(uri)?.client === session.client) values[uri.toString()] = true;
      }
    }
    try {
      await this.ctx.vscode.commands.executeCommand("setContext", "aurelia.relatedFileUris", values);
    } catch (error) {
      this.ctx.logger.warn("Could not publish Open Related File command contexts.", undefined, error);
    }
  }
}
