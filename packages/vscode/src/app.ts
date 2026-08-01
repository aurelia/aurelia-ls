import type { ExtensionContext } from "vscode";
import { AureliaLanguageClient } from "./client-core.js";
import { ClientLogger } from "./log.js";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";
import { CapabilityStore } from "./core/capabilities.js";
import { ConfigService } from "./core/config.js";
import { createClientContext, type ClientContext } from "./core/context.js";
import { FeatureGraph, type FeatureModule } from "./core/feature-graph.js";
import { LspFacade } from "./core/lsp-facade.js";
import { ObservabilityService } from "./core/observability.js";
import { PresentationStore } from "./core/presentation-store.js";
import { QueryClient } from "./core/query-client.js";
import { ServiceRegistry } from "./core/service-registry.js";
import { DefaultFeatures } from "./features/index.js";

export interface ClientAppOptions {
  vscode?: VscodeApi;
  logger?: ClientLogger;
  languageClient?: AureliaLanguageClient;
  features?: FeatureModule[];
}

export class ClientApp {
  #context: ExtensionContext;
  #options: ClientAppOptions;
  #ctx: ClientContext | null = null;
  #clientStateTransition: Promise<void> = Promise.resolve();

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
    const observability = new ObservabilityService(vscode, logger, config.current);
    const languageClient = this.#options.languageClient ?? new AureliaLanguageClient(logger, vscode);

    await vscode.commands.executeCommand("setContext", "aurelia.active", false);
    await languageClient.start(this.#context, { serverEnv: observability.serverEnv });
    const lsp = new LspFacade(languageClient, observability);

    const capabilities = new CapabilityStore();
    const presentation = new PresentationStore();
    const queries = new QueryClient(lsp, observability);
    const features = new FeatureGraph();
    const services = new ServiceRegistry();

    const ctx = createClientContext({
      extension: this.#context,
      vscode,
      logger,
      observability,
      debug: observability.debug,
      trace: observability.trace,
      errors: observability.errors,
      languageClient,
      lsp,
      config,
      capabilities,
      presentation,
      queries,
      features,
      services,
    });

    this.#ctx = ctx;
    ctx.disposables.add(services);
    ctx.disposables.add(lsp);

    const featureModules = this.#options.features ?? DefaultFeatures;
    features.register(...featureModules);

    const synchronizeClientState = () => this.#queueClientStateTransition(ctx);
    ctx.disposables.add(languageClient.onDidChangeSessions(() => {
      void synchronizeClientState();
    }));
    ctx.disposables.add(config.onDidChange(async (next) => {
      const serverEnvChanged = observability.update(next);
      if (serverEnvChanged) {
        await ctx.errors.capture("lsp.restart", async () => {
          logger.info("restarting Aurelia workspace clients for updated observability config");
          await languageClient.restart(this.#context, { serverEnv: observability.serverEnv });
        }, { notify: false });
      }
      await languageClient.reconcile({ reconfirmExisting: true });
      await synchronizeClientState();
    }));
    ctx.disposables.add(capabilities.onDidChange(() => {
      if (languageClient.hasSessions) {
        void features.reconcile(ctx);
      }
    }));

    await synchronizeClientState();
    return ctx;
  }

  async deactivate(): Promise<void> {
    const ctx = this.#ctx;
    if (ctx) {
      await this.#clientStateTransition.catch(() => {});
      ctx.features.deactivateAll(ctx);
      ctx.disposables.dispose();
    }
    try {
      await ctx?.languageClient.stop();
    } catch {
      /* ignore */
    }
    if (ctx) {
      await ctx.vscode.commands.executeCommand("setContext", "aurelia.active", false);
    }
    this.#ctx = null;
  }

  #queueClientStateTransition(ctx: ClientContext): Promise<void> {
    const transition = this.#clientStateTransition.then(async () => {
      const active = ctx.languageClient.hasSessions;
      ctx.queries.clear();
      await ctx.vscode.commands.executeCommand("setContext", "aurelia.active", active);
      if (!active) {
        ctx.features.deactivateAll(ctx);
        ctx.capabilities.clear();
        return;
      }
      const caps = await ctx.lsp.getCapabilities();
      if (caps != null) {
        ctx.capabilities.set(caps);
      }
      await ctx.features.activateAll(ctx);
    });
    this.#clientStateTransition = transition.catch((error) => {
      ctx.logger.warn(`[client] session-state transition failed: ${error instanceof Error ? error.message : String(error)}`);
    });
    return transition;
  }
}
