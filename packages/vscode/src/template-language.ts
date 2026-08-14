import type {
  CancellationTokenSource,
  Disposable,
  TextDocument,
} from "vscode";
import type { ClientContext } from "./core/context.js";
import { documentUriIdentityKey, sameDocumentUri } from "./core/uri-identity.js";
import { sourceOwnershipTemplateOwned, type SourceOwnershipSnapshot } from "./types.js";

export const HTML_LANGUAGE_ID = "html";
export const AURELIA_HTML_LANGUAGE_ID = "aurelia-html";

export function isTemplateLanguageId(languageId: string | null | undefined): boolean {
  return languageId === HTML_LANGUAGE_ID || languageId === AURELIA_HTML_LANGUAGE_ID;
}

interface LanguageRequest {
  readonly generation: number;
  readonly document: TextDocument;
  readonly uri: string;
  readonly languageId: string;
  readonly sessionClient: unknown;
  readonly cancellation: CancellationTokenSource;
}

/**
 * Owns the reversible language-mode projection for every open HTML template.
 * Semantic source ownership is the sole admission authority; the controller
 * never infers template status from filenames, paths, or client-side roles.
 */
export class OwnedTemplateLanguageController implements Disposable {
  readonly #ctx: ClientContext;
  readonly #subscriptions: Disposable[] = [];
  readonly #generationByDocument = new Map<string, number>();
  readonly #cancellationByDocument = new Map<string, CancellationTokenSource>();
  readonly #pending = new Set<Promise<void>>();
  readonly #controllerOwnedDocuments = new Set<string>();
  readonly #modeChanges = new Set<string>();
  readonly #modeChangeTailByDocument = new Map<string, Promise<void>>();
  readonly #modeChangeOwnerByDocument = new Map<string, symbol>();
  #generation = 0;
  #disposed = false;
  #disposePromise: Promise<void> | null = null;

  constructor(ctx: ClientContext) {
    this.#ctx = ctx;
    const reconcileAll = () => this.reconcileAll();
    this.#subscriptions.push(ctx.languageClient.onDidChangeSessions(reconcileAll));
    this.#subscriptions.push(ctx.lsp.onAnalysisChanged((payload) => {
      this.#reconcileWorkspace(payload.workspace.key);
    }));
    this.#subscriptions.push(ctx.vscode.workspace.onDidOpenTextDocument((document) => {
      this.#handleOpen(document);
    }));
    this.#subscriptions.push(ctx.vscode.workspace.onDidCloseTextDocument((document) => {
      this.#handleClose(document);
    }));
  }

  start(): void {
    this.reconcileAll();
  }

  reconcileAll(): void {
    if (this.#disposed) return;
    const openKeys = new Set<string>();
    for (const document of this.#ctx.vscode.workspace.textDocuments) {
      const key = documentUriIdentityKey(this.#ctx.vscode, document.uri);
      if (key != null) openKeys.add(key);
      if (isTemplateLanguageId(document.languageId)) {
        this.#schedule(document);
      }
    }
    for (const key of this.#generationByDocument.keys()) {
      if (!openKeys.has(key)) this.#invalidate(key);
    }
  }

  #reconcileWorkspace(workspaceKey: string): void {
    if (this.#disposed) return;
    for (const document of this.#ctx.vscode.workspace.textDocuments) {
      if (!isTemplateLanguageId(document.languageId)) continue;
      const session = this.#ctx.languageClient.sessionForUri(document.uri);
      if (session?.workspace.key === workspaceKey) this.#schedule(document);
    }
  }

  dispose(): void {
    void this.disposeAsync();
  }

  disposeAsync(): Promise<void> {
    return this.#disposePromise ??= this.#runDispose();
  }

  async #runDispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const subscription of this.#subscriptions.splice(0).reverse()) {
      subscription.dispose();
    }
    for (const key of [...this.#generationByDocument.keys()]) this.#invalidate(key);
    const settledPending = await Promise.allSettled([...this.#pending]);
    this.#reportRejected("template language transition", settledPending);
    const restore = this.#ctx.vscode.workspace.textDocuments
      .filter((document) => {
        const key = documentUriIdentityKey(this.#ctx.vscode, document.uri);
        return key != null
          && this.#controllerOwnedDocuments.has(key)
          && document.languageId === AURELIA_HTML_LANGUAGE_ID;
      })
      .map((document) => this.#setLanguage(document, HTML_LANGUAGE_ID));
    const settledRestore = await Promise.allSettled(restore);
    this.#reportRejected("template language restoration", settledRestore);
    this.#controllerOwnedDocuments.clear();
  }

  #handleOpen(document: TextDocument): void {
    const key = documentUriIdentityKey(this.#ctx.vscode, document.uri);
    if (key == null) return;
    if (this.#modeChanges.has(key)) return;
    if (isTemplateLanguageId(document.languageId)) this.#schedule(document);
  }

  #handleClose(document: TextDocument): void {
    const key = documentUriIdentityKey(this.#ctx.vscode, document.uri);
    if (key == null) return;
    // A language change also closes the original document. Defer deciding
    // whether that close was self-induced until the API returns its exact
    // replacement; failed or displaced transitions clean the mark below.
    if (this.#modeChanges.has(key)) return;
    this.#controllerOwnedDocuments.delete(key);
    this.#invalidate(key);
  }

  #schedule(document: TextDocument): void {
    const key = documentUriIdentityKey(this.#ctx.vscode, document.uri);
    if (key == null) return;
    this.#invalidate(key);
    const cancellation = new this.#ctx.vscode.CancellationTokenSource();
    const request: LanguageRequest = {
      generation: ++this.#generation,
      document,
      uri: document.uri.toString(),
      languageId: document.languageId,
      sessionClient: this.#ctx.languageClient.sessionForUri(document.uri)?.client,
      cancellation,
    };
    this.#generationByDocument.set(key, request.generation);
    this.#cancellationByDocument.set(key, cancellation);
    const pending = this.#resolve(key, request)
      .catch(async (error) => {
        if (!cancellation.token.isCancellationRequested && !this.#disposed) {
          try {
            await this.#restoreControllerOwnedAfterOwnershipFailure(key, request);
          } catch (restoreError) {
            this.#ctx.logger.warn(
              `[client] template language ownership failure restoration failed for ${request.uri}: ${errorMessage(restoreError)}`,
            );
          }
          this.#ctx.logger.warn(`[client] template language ownership unavailable for ${request.uri}: ${errorMessage(error)}`);
        }
      })
      .finally(() => {
        this.#pending.delete(pending);
        if (this.#cancellationByDocument.get(key) === cancellation) {
          this.#cancellationByDocument.delete(key);
        }
        cancellation.dispose();
      });
    this.#pending.add(pending);
  }

  async #restoreControllerOwnedAfterOwnershipFailure(key: string, request: LanguageRequest): Promise<void> {
    if (!this.#controllerOwnedDocuments.has(key) || !this.#isCurrent(key, request)) return;
    if (request.document.languageId !== AURELIA_HTML_LANGUAGE_ID) return;
    const attempted = await this.#setLanguage(
      request.document,
      HTML_LANGUAGE_ID,
      () => this.#isCurrent(key, request),
    );
    if (!attempted) return;
    const current = this.#ctx.vscode.workspace.textDocuments.find((document) =>
      sameDocumentUri(this.#ctx.vscode, document.uri, request.document.uri)
    );
    if (!this.#disposed && current != null && !this.#isCurrentMode(key, request, HTML_LANGUAGE_ID)) {
      this.#schedule(current);
    }
  }

  async #resolve(key: string, request: LanguageRequest): Promise<void> {
    let ownership: SourceOwnershipSnapshot | null = null;
    if (request.sessionClient != null) {
      ownership = await this.#ctx.lsp.getSourceOwnership(request.uri, request.cancellation.token);
    }
    if (!this.#isCurrent(key, request)) return;
    const templateOwned = ownership != null
      && sourceOwnershipTemplateOwned(ownership)
      && sameDocumentUri(this.#ctx.vscode, ownership.sourceUri, request.uri)
      && ownership.workspace.key === this.#ctx.languageClient.sessionForUri(request.document.uri)?.workspace.key;
    const languageId = templateOwned ? AURELIA_HTML_LANGUAGE_ID : HTML_LANGUAGE_ID;
    const mayRestore = languageId !== HTML_LANGUAGE_ID || this.#controllerOwnedDocuments.has(key);
    if (mayRestore && request.document.languageId !== languageId) {
      try {
        await this.#setLanguage(
          request.document,
          languageId,
          () => this.#isCurrent(key, request),
        );
      } finally {
        const current = this.#ctx.vscode.workspace.textDocuments.find((document) =>
          sameDocumentUri(this.#ctx.vscode, document.uri, request.document.uri)
        );
        if (!this.#disposed && current != null && !this.#isCurrentMode(key, request, languageId)) {
          this.#schedule(current);
        }
      }
    }
  }

  #isCurrent(key: string, request: LanguageRequest): boolean {
    if (this.#disposed || request.cancellation.token.isCancellationRequested) return false;
    if (this.#generationByDocument.get(key) !== request.generation) return false;
    const current = this.#ctx.vscode.workspace.textDocuments.find((document) =>
      sameDocumentUri(this.#ctx.vscode, document.uri, request.document.uri)
    );
    if (current !== request.document || current.languageId !== request.languageId) return false;
    return this.#ctx.languageClient.sessionForUri(current.uri)?.client === request.sessionClient;
  }

  #isCurrentMode(key: string, request: LanguageRequest, languageId: string): boolean {
    if (this.#disposed || request.cancellation.token.isCancellationRequested) return false;
    if (this.#generationByDocument.get(key) !== request.generation) return false;
    const current = this.#ctx.vscode.workspace.textDocuments.find((document) =>
      sameDocumentUri(this.#ctx.vscode, document.uri, request.document.uri)
    );
    return current != null
      && current.languageId === languageId
      && this.#ctx.languageClient.sessionForUri(current.uri)?.client === request.sessionClient;
  }

  async #setLanguage(
    document: TextDocument,
    languageId: string,
    isCurrent: (() => boolean) | null = null,
  ): Promise<boolean> {
    const key = documentUriIdentityKey(this.#ctx.vscode, document.uri);
    if (key == null || document.languageId === languageId) return false;
    const previous = this.#modeChangeTailByDocument.get(key) ?? Promise.resolve();
    const owner = Symbol(key);
    let attempted = false;
    const transition = previous
      .catch(() => {})
      .then(async () => {
        if (isCurrent != null && !isCurrent()) return;
        attempted = true;
        await this.#setLanguageNow(key, document, languageId);
      })
      .finally(() => {
        if (this.#modeChangeOwnerByDocument.get(key) === owner) {
          this.#modeChangeTailByDocument.delete(key);
          this.#modeChangeOwnerByDocument.delete(key);
        }
      });
    this.#modeChangeTailByDocument.set(key, transition);
    this.#modeChangeOwnerByDocument.set(key, owner);
    await transition;
    return attempted;
  }

  async #setLanguageNow(key: string, document: TextDocument, languageId: string): Promise<void> {
    const currentBeforeChange = this.#ctx.vscode.workspace.textDocuments.find((candidate) =>
      sameDocumentUri(this.#ctx.vscode, candidate.uri, document.uri)
    );
    if (currentBeforeChange !== document || currentBeforeChange.languageId === languageId) return;
    this.#modeChanges.add(key);
    try {
      const replacement = await this.#ctx.vscode.languages.setTextDocumentLanguage(document, languageId);
      const current = this.#ctx.vscode.workspace.textDocuments.find((candidate) =>
        sameDocumentUri(this.#ctx.vscode, candidate.uri, document.uri)
      );
      if (current !== replacement || current.languageId !== languageId) {
        if (current !== document) this.#controllerOwnedDocuments.delete(key);
        return;
      }
      if (languageId === AURELIA_HTML_LANGUAGE_ID) {
        this.#controllerOwnedDocuments.add(key);
      } else {
        this.#controllerOwnedDocuments.delete(key);
      }
    } catch (error) {
      const current = this.#ctx.vscode.workspace.textDocuments.find((candidate) =>
        sameDocumentUri(this.#ctx.vscode, candidate.uri, document.uri)
      );
      if (current !== document) this.#controllerOwnedDocuments.delete(key);
      throw error;
    } finally {
      this.#modeChanges.delete(key);
    }
  }

  #invalidate(key: string): void {
    this.#generationByDocument.delete(key);
    const cancellation = this.#cancellationByDocument.get(key);
    this.#cancellationByDocument.delete(key);
    cancellation?.cancel();
  }

  #reportRejected(label: string, results: readonly PromiseSettledResult<unknown>[]): void {
    for (const result of results) {
      if (result.status === "rejected") {
        this.#ctx.logger.warn(`[client] ${label} failed: ${errorMessage(result.reason)}`);
      }
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
