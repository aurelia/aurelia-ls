import type { Disposable, ExtensionContext, LogOutputChannel } from "vscode";
import type { AureliaLanguageClient } from "./client-core.js";
import type { ClientLogger } from "./log.js";
import type { VscodeApi } from "./vscode-api.js";
import { createClientContext, type ClientContext } from "./core/context.js";
import { ErrorReporter } from "./core/errors.js";
import type { ClientFeature } from "./core/feature.js";
import { LspFacade } from "./core/lsp-facade.js";

export interface ClientAppServices {
  readonly vscode: VscodeApi;
  /** Non-owning logger view over outputChannel. */
  readonly logger: ClientLogger;
  /** Root output resource owned by ClientApp. */
  readonly outputChannel: LogOutputChannel;
  readonly languageClient: AureliaLanguageClient;
  readonly features: readonly ClientFeature[];
}

/** Owns the single extension-lifetime composition of client contributions. */
export class ClientApp {
  readonly #extension: ExtensionContext;
  readonly #services: ClientAppServices;
  #ctx: ClientContext | null = null;
  #lsp: LspFacade | null = null;
  #subscriptions: readonly Disposable[] = [];
  #featureActivations: readonly Disposable[] = [];
  #contextTransition: Promise<void> = Promise.resolve();
  #contextRequest = 0;
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
      await setClientContextKeys(vscode, false, false);
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
    const subscriptions: Disposable[] = [];
    try {
      subscriptions.push(ctx.languageClient.onDidChangeSessions(synchronizeContext));
      subscriptions.push(ctx.vscode.window.onDidChangeActiveTextEditor(synchronizeContext));
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
    const transition = this.#contextTransition.then(async () => {
      if (request !== this.#contextRequest || this.#ctx !== ctx) return;
      const active = ctx.languageClient.hasSessions;
      const document = ctx.vscode.window.activeTextEditor?.document;
      const documentOwned = document != null && ctx.languageClient.sessionForUri(document.uri) != null;
      await setClientContextKeys(ctx.vscode, active, documentOwned);
    });
    this.#contextTransition = transition.catch((error) => {
      ctx.logger.warn(`[client] context transition failed: ${errorMessage(error)}`);
    });
    return transition;
  }

  async #deactivate(activationError: unknown): Promise<void> {
    const { vscode, logger, languageClient } = this.#services;
    this.#ctx = null;
    this.#contextRequest += 1;
    await this.#contextTransition.catch(() => {});

    disposeOwned(logger, "client subscriptions", [...this.#subscriptions].reverse());
    this.#subscriptions = [];
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
      await setClientContextKeys(vscode, false, false);
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

function setClientContextKeys(vscode: VscodeApi, active: boolean, documentOwned: boolean): Promise<unknown[]> {
  return Promise.all([
    vscode.commands.executeCommand("setContext", "aurelia.active", active),
    vscode.commands.executeCommand("setContext", "aurelia.documentOwned", documentOwned),
  ]);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
