import type { VscodeApi } from "../vscode-api.js";
import type { ClientLogger } from "../log.js";
import { SimpleEmitter, type Listener } from "./events.js";
import type { DisposableLike } from "./disposables.js";

export interface PresentationConfig {
  features: {
    commands: boolean;
    statusBar: boolean;
    views: boolean;
    diagnostics: boolean;
    inlayHints: boolean;
  };
  experimental: {
    ai: boolean;
  };
}

const DEFAULT_CONFIG: PresentationConfig = {
  features: {
    commands: true,
    statusBar: true,
    views: true,
    diagnostics: false,
    inlayHints: true,
  },
  experimental: {
    ai: false,
  },
};

type WorkspaceConfiguration = {
  get: <T>(key: string, defaultValue: T) => T;
};

function readConfig(vscode: VscodeApi): PresentationConfig {
  const workspace = vscode.workspace as unknown as { getConfiguration?: (section: string) => WorkspaceConfiguration };
  const cfg = workspace.getConfiguration ? workspace.getConfiguration("aurelia") : null;
  if (!cfg) return DEFAULT_CONFIG;

  return {
    features: {
      commands: cfg.get("features.commands", DEFAULT_CONFIG.features.commands),
      statusBar: cfg.get("features.statusBar", DEFAULT_CONFIG.features.statusBar),
      views: cfg.get("features.views", DEFAULT_CONFIG.features.views),
      diagnostics: cfg.get("features.diagnostics", DEFAULT_CONFIG.features.diagnostics),
      inlayHints: cfg.get("features.inlayHints", DEFAULT_CONFIG.features.inlayHints),
    },
    experimental: {
      ai: cfg.get("experimental.ai", DEFAULT_CONFIG.experimental.ai),
    },
  };
}

export class ConfigService {
  #vscode: VscodeApi;
  #logger?: ClientLogger;
  #current: PresentationConfig;
  #emitter = new SimpleEmitter<PresentationConfig>();

  constructor(vscode: VscodeApi, logger?: ClientLogger) {
    this.#vscode = vscode;
    this.#logger = logger;
    this.#current = readConfig(vscode);
    this.#watch();
  }

  get current(): PresentationConfig {
    return this.#current;
  }

  refresh(): PresentationConfig {
    this.#current = readConfig(this.#vscode);
    this.#emitter.emit(this.#current);
    return this.#current;
  }

  onDidChange(listener: Listener<PresentationConfig>): DisposableLike {
    return this.#emitter.on(listener);
  }

  #watch(): void {
    const workspace = this.#vscode.workspace as unknown as {
      onDidChangeConfiguration?: (listener: () => void) => DisposableLike;
    };
    if (!workspace.onDidChangeConfiguration) return;
    workspace.onDidChangeConfiguration(() => {
      this.refresh();
      this.#logger?.debug("config.refreshed");
    });
  }
}
