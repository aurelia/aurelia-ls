import type { ExtensionContext } from "vscode";
import { AureliaLanguageClient } from "./client-core.js";
import { ClientLogger } from "./log.js";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";
import { ConfigService } from "./core/config.js";
import { createClientContext, type ClientContext } from "./core/context.js";
import { ErrorReporter } from "./core/errors.js";
import type { ClientFeature } from "./core/feature.js";
import { LspFacade } from "./core/lsp-facade.js";
import { DisposableStore, type DisposableLike } from "./core/disposables.js";
import { DefaultFeatures } from "./features/index.js";

export interface ClientAppOptions {
  vscode?: VscodeApi;
  logger?: ClientLogger;
  languageClient?: AureliaLanguageClient;
  features?: readonly ClientFeature[];
}

export class ClientApp {
  #context: ExtensionContext;
  #options: ClientAppOptions;
  #ctx: ClientContext | null = null;
  #clientStateTransition: Promise<void> = Promise.resolve();
  #documentContextTransition: Promise<void> = Promise.resolve();
  #documentContextRequest = 0;
  #featureActivations: DisposableLike | null = null;

  constructor(context: ExtensionContext, options: ClientAppOptions = {}) {
    this.#context = context;
    this.#options = options;
  }

  get ctx(): ClientContext | null {
    return this.#ctx;
  }

  async activate(): Promise<ClientContext> {
    const vscode = this.#options.vscode ?? getVscodeApi();
    const logger = this.#options.logger ?? new ClientLogger("Aurelia LS (Client)", vscode);
    const config = new ConfigService(vscode, logger);
    const errors = new ErrorReporter(logger, vscode);
    const languageClient = this.#options.languageClient ?? new AureliaLanguageClient(logger, vscode);

    await Promise.all([
      vscode.commands.executeCommand("setContext", "aurelia.active", false),
      vscode.commands.executeCommand("setContext", "aurelia.documentOwned", false),
    ]);
    await languageClient.start(this.#context);
    const lsp = new LspFacade(languageClient, logger);

    const ctx = createClientContext({
      extension: this.#context,
      vscode,
      logger,
      errors,
      languageClient,
      lsp,
      config,
    });

    this.#ctx = ctx;
    ctx.disposables.add(lsp);
    ctx.disposables.add(logger);

    const synchronizeClientState = () => this.#queueClientStateTransition(ctx);
    const synchronizeDocumentContext = () => this.#queueDocumentContextTransition(ctx);
    ctx.disposables.add(languageClient.onDidChangeSessions(() => {
      void synchronizeClientState();
      void synchronizeDocumentContext();
    }));
    ctx.disposables.add(vscode.window.onDidChangeActiveTextEditor(() => {
      void synchronizeDocumentContext();
    }));
    ctx.disposables.add(config.onDidChange(async () => {
      await languageClient.reconcile({ reconfirmExisting: true });
      await synchronizeClientState();
      await synchronizeDocumentContext();
    }));
    await synchronizeClientState();
    await synchronizeDocumentContext();
    return ctx;
  }

  async deactivate(): Promise<void> {
    const ctx = this.#ctx;
    if (ctx) {
      await this.#clientStateTransition.catch(() => {});
      await this.#documentContextTransition.catch(() => {});
      this.#disposeFeatures();
    }
    try {
      await ctx?.languageClient.stop();
    } catch {
      /* ignore */
    }
    ctx?.disposables.dispose();
    if (ctx) {
      await Promise.all([
        ctx.vscode.commands.executeCommand("setContext", "aurelia.active", false),
        ctx.vscode.commands.executeCommand("setContext", "aurelia.documentOwned", false),
      ]);
    }
    this.#ctx = null;
  }

  #queueClientStateTransition(ctx: ClientContext): Promise<void> {
    const generation = ctx.languageClient.sessionGeneration;
    const transition = this.#clientStateTransition.then(async () => {
      if (generation !== ctx.languageClient.sessionGeneration) return;
      const active = ctx.languageClient.hasSessions;
      await ctx.vscode.commands.executeCommand("setContext", "aurelia.active", active);
      if (generation !== ctx.languageClient.sessionGeneration) return;
      this.#disposeFeatures();
      if (!active) {
        return;
      }
      const activations = await activateFeatures(ctx, this.#options.features ?? DefaultFeatures);
      if (generation !== ctx.languageClient.sessionGeneration) {
        activations.dispose();
        return;
      }
      this.#featureActivations = activations;
    });
    this.#clientStateTransition = transition.catch((error) => {
      ctx.logger.warn(`[client] session-state transition failed: ${error instanceof Error ? error.message : String(error)}`);
    });
    return transition;
  }

  #queueDocumentContextTransition(ctx: ClientContext): Promise<void> {
    const request = ++this.#documentContextRequest;
    const transition = this.#documentContextTransition.then(async () => {
      if (request !== this.#documentContextRequest) return;
      const document = ctx.vscode.window.activeTextEditor?.document;
      const owned = document != null && ctx.languageClient.sessionForUri(document.uri) != null;
      await ctx.vscode.commands.executeCommand("setContext", "aurelia.documentOwned", owned);
    });
    this.#documentContextTransition = transition.catch((error) => {
      ctx.logger.warn(`[client] document-context transition failed: ${error instanceof Error ? error.message : String(error)}`);
    });
    return transition;
  }

  #disposeFeatures(): void {
    this.#featureActivations?.dispose();
    this.#featureActivations = null;
  }
}

async function activateFeatures(
  ctx: ClientContext,
  features: readonly ClientFeature[],
): Promise<DisposableLike> {
  const activations = new DisposableStore();
  for (const feature of features) {
    try {
      if (feature.isEnabled?.(ctx) === false) continue;
      ctx.logger.info(`[features] activating: ${feature.id}`);
      const activation = await feature.activate(ctx);
      if (isDisposableList(activation)) {
        for (const disposable of activation) activations.add(disposable);
      } else if (activation != null) {
        activations.add(activation as DisposableLike);
      }
    } catch (error) {
      ctx.errors.report(error, `feature.activate.${feature.id}`, {
        context: { feature: feature.id },
      });
    }
  }
  return activations;
}

function isDisposableList(
  value: void | DisposableLike | readonly DisposableLike[],
): value is readonly DisposableLike[] {
  return Array.isArray(value);
}
