import type {
  CancellationTokenSource,
  Disposable,
  ExtensionContext,
  LogOutputChannel,
  TextDocument,
} from "vscode";
import type { AureliaLanguageClient } from "./client-core.js";
import type { ClientLogger } from "./log.js";
import type { VscodeApi } from "./vscode-api.js";
import { createClientContext, type ClientContext } from "./core/context.js";
import { ErrorReporter } from "./core/errors.js";
import type { ClientFeature } from "./core/feature.js";
import { LspFacade } from "./core/lsp-facade.js";
import { sourceOwnershipTemplateOwned, type SourceOwnershipSnapshot } from "./types.js";
import { sameDocumentUri } from "./core/uri-identity.js";
import {
  isTemplateLanguageId,
  OwnedTemplateLanguageController,
} from "./template-language.js";

export interface ClientAppServices {
  readonly vscode: VscodeApi;
  /** Non-owning logger view over outputChannel. */
  readonly logger: ClientLogger;
  /** Root output resource owned by ClientApp. */
  readonly outputChannel: LogOutputChannel;
  readonly languageClient: AureliaLanguageClient;
  readonly features: readonly ClientFeature[];
}

interface WorkspaceAnalysisVersion {
  readonly sequence: number;
  readonly fingerprint: string;
}

/** Owns the single extension-lifetime composition of client contributions. */
export class ClientApp {
  readonly #extension: ExtensionContext;
  readonly #services: ClientAppServices;
  #ctx: ClientContext | null = null;
  #lsp: LspFacade | null = null;
  #templateLanguage: OwnedTemplateLanguageController | null = null;
  #subscriptions: readonly Disposable[] = [];
  #featureActivations: readonly Disposable[] = [];
  #contextTransition: Promise<void> = Promise.resolve();
  #contextCommit: Promise<void> = Promise.resolve();
  #contextCancellation: CancellationTokenSource | null = null;
  #contextRequest = 0;
  #analysisSequence = 0;
  readonly #analysisVersions = new Map<string, WorkspaceAnalysisVersion>();
  #activationStarted = false;
  #deactivation: Promise<void> | null = null;

  constructor(extension: ExtensionContext, services: ClientAppServices) {
    this.#extension = extension;
    this.#services = services;
  }

  get ctx(): ClientContext | null {
    return this.#ctx;
  }

  async activate(): Promise<void> {
    if (this.#activationStarted) {
      throw new Error("Aurelia client application activation may run only once.");
    }
    this.#activationStarted = true;

    const { vscode, logger, languageClient, features } = this.#services;
    const errors = new ErrorReporter(logger, vscode);
    try {
      await setClientContextKeys(vscode, false, false, false, null);
      await languageClient.start(this.#extension);

      const lsp = new LspFacade(languageClient, logger);
      this.#lsp = lsp;
      const ctx = createClientContext({
        extension: this.#extension,
        vscode,
        logger,
        errors,
        languageClient,
        lsp,
      });
      this.#ctx = ctx;

      const templateLanguage = new OwnedTemplateLanguageController(ctx);
      this.#templateLanguage = templateLanguage;
      templateLanguage.start();

      this.#featureActivations = await activateFeatures(ctx, features);
      this.#subscriptions = this.#registerStateListeners(ctx);
      await this.#queueContextTransition(ctx);
    } catch (error) {
      this.#deactivation ??= this.#deactivate(error);
      await this.#deactivation;
      throw error;
    }
  }

  deactivate(): Promise<void> {
    return this.#deactivation ??= this.#deactivate(null);
  }

  #registerStateListeners(ctx: ClientContext): readonly Disposable[] {
    const synchronizeContext = () => {
      void this.#queueContextTransition(ctx);
    };
    const synchronizeActiveDocumentContext = (document: TextDocument) => {
      const activeDocument = ctx.vscode.window.activeTextEditor?.document;
      if (activeDocument == null || !sameDocumentUri(ctx.vscode, activeDocument.uri, document.uri)) return;
      synchronizeContext();
    };
    const subscriptions: Disposable[] = [];
    try {
      subscriptions.push(ctx.languageClient.onDidChangeSessions(synchronizeContext));
      subscriptions.push(ctx.vscode.window.onDidChangeActiveTextEditor(synchronizeContext));
      // VS Code closes and reopens a document when its language mode changes.
      // Re-prove the durable template context for that active document.
      subscriptions.push(ctx.vscode.workspace.onDidOpenTextDocument(synchronizeActiveDocumentContext));
      subscriptions.push(ctx.vscode.workspace.onDidCloseTextDocument(synchronizeActiveDocumentContext));
      subscriptions.push(ctx.lsp.onAnalysisChanged((payload) => {
        this.#analysisVersions.set(payload.workspace.key, {
          sequence: ++this.#analysisSequence,
          fingerprint: payload.fingerprint,
        });
        if (payload.changeKind === "topology") {
          const document = ctx.vscode.window.activeTextEditor?.document;
          const session = document == null ? undefined : ctx.languageClient.sessionForUri(document.uri);
          if (session?.workspace.key === payload.workspace.key) {
            void this.#queueContextTransition(ctx);
          }
        }
      }));
      subscriptions.push(ctx.vscode.workspace.onDidChangeConfiguration((event) => {
        if (!event.affectsConfiguration("aurelia.activationMode")) return;
        void ctx.errors.capture("configuration.activationMode", async () => {
          await ctx.languageClient.reconcile({ reconfirmExisting: true });
          await this.#queueContextTransition(ctx);
        }, { notify: false });
      }));
      return subscriptions;
    } catch (error) {
      disposeOwned(ctx.logger, "partially registered client subscriptions", subscriptions.reverse());
      throw error;
    }
  }

  #queueContextTransition(ctx: ClientContext): Promise<void> {
    const request = ++this.#contextRequest;
    this.#cancelContextRequest();
    const cancellation = new ctx.vscode.CancellationTokenSource();
    this.#contextCancellation = cancellation;
    const transition = this.#resolveContextTransition(ctx, request, cancellation);
    const settled = transition.catch((error) => {
      ctx.logger.warn(`[client] context transition failed: ${errorMessage(error)}`);
    }).finally(() => {
      if (this.#contextCancellation === cancellation) {
        this.#contextCancellation = null;
      }
      cancellation.dispose();
    });
    this.#contextTransition = Promise.all([this.#contextTransition, settled]).then(() => undefined);
    return transition;
  }

  async #resolveContextTransition(
    ctx: ClientContext,
    request: number,
    cancellation: CancellationTokenSource,
  ): Promise<void> {
    const active = ctx.languageClient.hasSessions;
    const document = ctx.vscode.window.activeTextEditor?.document;
    const uri = document?.uri.toString() ?? null;
    const languageId = document?.languageId ?? null;
    const session = document == null ? undefined : ctx.languageClient.sessionForUri(document.uri);
    const workspaceKey = session?.workspace.key ?? null;
    const analysisVersion = workspaceKey == null
      ? null
      : this.#analysisVersions.get(workspaceKey) ?? null;
    let ownership: SourceOwnershipSnapshot | null = null;
    if (uri != null && session != null) {
      // Never carry a positive answer from a previous editor or topology while
      // the exact server-owned answer for this document is still in flight.
      await this.#queueContextCommit(ctx, request, uri, languageId, session.client, active, false, false);
      if (!this.#contextRequestIsCurrent(ctx, request, uri, languageId, session.client)) return;
      try {
        ownership = await ctx.lsp.getSourceOwnership(uri, cancellation.token);
      } catch (error) {
        if (!cancellation.token.isCancellationRequested) {
          ctx.logger.warn(`[client] source ownership unavailable for ${uri}: ${errorMessage(error)}`);
        }
      }
    }

    if (!this.#contextRequestIsCurrent(ctx, request, uri, languageId, session?.client)) return;
    const latestAnalysis = workspaceKey == null
      ? null
      : this.#analysisVersions.get(workspaceKey) ?? null;
    if (
      ownership != null
      && latestAnalysis != null
      && latestAnalysis.sequence !== analysisVersion?.sequence
      && latestAnalysis.fingerprint !== ownership.fingerprint
    ) {
      void this.#queueContextTransition(ctx);
      return;
    }

    const documentOwned = ownership != null
      && uri != null
      && workspaceKey != null
      && ownership.workspace.key === workspaceKey
      && sameDocumentUri(ctx.vscode, ownership.sourceUri, uri)
      && ownership.owners.length > 0;
    const templateOwned = documentOwned
      && ownership != null
      && sourceOwnershipTemplateOwned(ownership);
    await this.#queueContextCommit(
      ctx,
      request,
      uri,
      languageId,
      session?.client,
      active,
      documentOwned,
      templateOwned,
    );
  }

  #queueContextCommit(
    ctx: ClientContext,
    request: number,
    uri: string | null,
    languageId: string | null,
    sessionClient: unknown,
    active: boolean,
    documentOwned: boolean,
    templateOwned: boolean,
  ): Promise<void> {
    const commit = this.#contextCommit.then(async () => {
      if (!this.#contextRequestIsCurrent(ctx, request, uri, languageId, sessionClient)) return;
      await setClientContextKeys(ctx.vscode, active, documentOwned, templateOwned, languageId);
    });
    this.#contextCommit = commit.catch((error) => {
      ctx.logger.warn(`[client] context commit failed: ${errorMessage(error)}`);
    });
    return commit;
  }

  #contextRequestIsCurrent(
    ctx: ClientContext,
    request: number,
    uri: string | null,
    languageId: string | null,
    sessionClient: unknown,
  ): boolean {
    if (request !== this.#contextRequest || this.#ctx !== ctx) return false;
    const document = ctx.vscode.window.activeTextEditor?.document;
    const currentUri = document?.uri.toString() ?? null;
    if (currentUri !== uri) return false;
    if ((document?.languageId ?? null) !== languageId) return false;
    const currentSession = document == null ? undefined : ctx.languageClient.sessionForUri(document.uri);
    return currentSession?.client === sessionClient;
  }

  #cancelContextRequest(): void {
    const cancellation = this.#contextCancellation;
    this.#contextCancellation = null;
    if (cancellation == null) return;
    cancellation.cancel();
    cancellation.dispose();
  }

  async #deactivate(activationError: unknown): Promise<void> {
    const { vscode, logger, languageClient } = this.#services;
    this.#ctx = null;
    this.#contextRequest += 1;
    this.#cancelContextRequest();

    disposeOwned(logger, "client subscriptions", [...this.#subscriptions].reverse());
    this.#subscriptions = [];
    await Promise.all([
      this.#contextTransition.catch(() => {}),
      this.#contextCommit.catch(() => {}),
    ]);
    this.#analysisVersions.clear();
    const templateLanguage = this.#templateLanguage;
    this.#templateLanguage = null;
    if (templateLanguage != null) {
      try {
        await templateLanguage.disposeAsync();
      } catch (error) {
        logger.error("[client] template language restoration failed", undefined, error);
      }
    }
    disposeOwned(logger, "feature contributions", [...this.#featureActivations].reverse());
    this.#featureActivations = [];
    disposeOwned(logger, "LSP facade", this.#lsp == null ? [] : [this.#lsp]);
    this.#lsp = null;

    try {
      await languageClient.stop();
    } catch (error) {
      logger.error("[client] language client shutdown failed", undefined, error);
    }
    try {
      await setClientContextKeys(vscode, false, false, false, null);
    } catch (error) {
      logger.error("[client] context reset failed", undefined, error);
    }
    if (activationError != null) {
      logger.error("[client] activation rolled back", undefined, activationError);
    }
    this.#services.outputChannel.dispose();
  }
}

async function activateFeatures(
  ctx: ClientContext,
  features: readonly ClientFeature[],
): Promise<readonly Disposable[]> {
  const activations: Disposable[] = [];
  try {
    for (const feature of features) {
      ctx.logger.info(`[features] activating: ${feature.id}`);
      await feature.activate(ctx, (contribution) => {
        activations.push(contribution);
        return contribution;
      });
    }
    return activations;
  } catch (error) {
    disposeOwned(ctx.logger, "partially activated features", [...activations].reverse());
    throw error;
  }
}

function disposeOwned(logger: ClientLogger, owner: string, disposables: readonly Disposable[]): void {
  for (const disposable of disposables) {
    try {
      disposable.dispose();
    } catch (error) {
      logger.error(`[client] ${owner} disposal failed`, undefined, error);
    }
  }
}

function setClientContextKeys(
  vscode: VscodeApi,
  active: boolean,
  documentOwned: boolean,
  templateOwned: boolean,
  activeDocumentLanguageId: string | null,
): Promise<unknown[]> {
  const activeTemplateOwned = templateOwned && isTemplateLanguageId(activeDocumentLanguageId);
  return Promise.all([
    vscode.commands.executeCommand("setContext", "aurelia.active", active),
    vscode.commands.executeCommand("setContext", "aurelia.documentOwned", documentOwned),
    vscode.commands.executeCommand("setContext", "aurelia.activeTemplateOwned", activeTemplateOwned),
  ]);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
