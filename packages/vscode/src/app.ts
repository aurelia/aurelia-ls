import type { ExtensionContext } from "vscode";
import { AureliaLanguageClient } from "./client-core.js";
import { ClientLogger } from "./log.js";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";
import { createClientContext, type ClientContext } from "./core/context.js";
import { FeatureGraph } from "./core/feature-graph.js";
import { LspFacade } from "./core/lsp-facade.js";
import { CapabilityStore } from "./core/capabilities.js";
import { ConfigService } from "./core/config.js";
import { ObservabilityService } from "./core/observability.js";
import { PresentationStore } from "./core/presentation-store.js";
import { QueryClient } from "./core/query-client.js";
import { ServiceRegistry } from "./core/service-registry.js";
import { VirtualDocRegistry } from "./core/virtual-docs-registry.js";
import { DefaultFeatures } from "./features/index.js";
import type { FeatureModule } from "./core/feature-graph.js";

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

    const rawClient = await languageClient.start(this.#context, { serverEnv: observability.serverEnv });
    const lsp = new LspFacade(rawClient, observability);

    const capabilities = new CapabilityStore();
    const presentation = new PresentationStore();
    const queries = new QueryClient(lsp, observability);
    const virtualDocs = new VirtualDocRegistry(vscode);
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
      rawClient,
      config,
      capabilities,
      presentation,
      queries,
      virtualDocs,
      features,
      services,
    });

    this.#ctx = ctx;
    ctx.disposables.add(services);

    const featureModules = this.#options.features ?? DefaultFeatures;
    features.register(...featureModules);

    const caps = await lsp.getCapabilities();
    if (caps) capabilities.set(caps);

    ctx.disposables.add(config.onDidChange(async (next) => {
      const serverEnvChanged = observability.update(next);
      if (serverEnvChanged) {
        await ctx.errors.capture("lsp.restart", async () => {
          logger.info("restarting language client for updated observability config");
          const restarted = await languageClient.restart(this.#context, { serverEnv: observability.serverEnv });
          lsp.setClient(restarted);
          ctx.rawClient = restarted;
          const refreshedCaps = await lsp.getCapabilities();
          if (refreshedCaps) capabilities.set(refreshedCaps);
        }, { notify: false });
      }
      await features.reconcile(ctx);
    }));
    ctx.disposables.add(capabilities.onDidChange(() => void features.reconcile(ctx)));

    await features.activateAll(ctx);

    // Set context so views with "when": "aurelia.active" appear
    void vscode.commands.executeCommand("setContext", "aurelia.active", true);

    return ctx;
  }

  async deactivate(): Promise<void> {
    const ctx = this.#ctx;
    if (ctx) {
      ctx.features.deactivateAll(ctx);
      ctx.disposables.dispose();
    }
    try {
      await this.#ctx?.languageClient.stop();
    } catch {
      /* ignore */
    }
    this.#ctx = null;
  }
}

