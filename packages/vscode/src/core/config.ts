import type { VscodeApi } from "../vscode-api.js";
import type { ClientLogger, LogLevel } from "../log.js";
import { SimpleEmitter, type Listener } from "./events.js";
import type { DisposableLike } from "./disposables.js";

export interface PresentationConfig {
  observability: {
    logging: {
      level: LogLevel;
      format: "pretty" | "json";
      timestamps: boolean;
    };
    debug: {
      enabled: boolean;
      channels: string[];
      format: "pretty" | "json";
      timestamps: boolean;
    };
    trace: {
      enabled: boolean;
      minDurationMs: number;
      logEvents: boolean;
      logAttributes: boolean;
    };
    errors: {
      notify: boolean;
      showOutput: boolean;
    };
    statusBar: {
      enabled: boolean;
      alwaysVisible: boolean;
    };
  };
  features: {
    commands: boolean;
    debugCommands: boolean;
    statusBar: boolean;
    views: boolean;
    inline: boolean;
    diagnostics: boolean;
  };
  experimental: {
    ai: boolean;
  };
}

const DEFAULT_CONFIG: PresentationConfig = {
  observability: {
    logging: {
      level: "info",
      format: "pretty",
      timestamps: false,
    },
    debug: {
      enabled: false,
      channels: [],
      format: "pretty",
      timestamps: false,
    },
    trace: {
      enabled: false,
      minDurationMs: 0,
      logEvents: false,
      logAttributes: true,
    },
    errors: {
      notify: true,
      showOutput: true,
    },
    statusBar: {
      enabled: true,
      alwaysVisible: false,
    },
  },
  features: {
    commands: true,
    debugCommands: false,
    statusBar: true,
    views: true,
    inline: true,
    diagnostics: true,
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
    observability: {
      logging: {
        level: cfg.get("observability.logging.level", DEFAULT_CONFIG.observability.logging.level),
        format: cfg.get("observability.logging.format", DEFAULT_CONFIG.observability.logging.format),
        timestamps: cfg.get("observability.logging.timestamps", DEFAULT_CONFIG.observability.logging.timestamps),
      },
      debug: {
        enabled: cfg.get("observability.debug.enabled", DEFAULT_CONFIG.observability.debug.enabled),
        channels: normalizeStringArray(
          cfg.get("observability.debug.channels", DEFAULT_CONFIG.observability.debug.channels),
        ),
        format: cfg.get("observability.debug.format", DEFAULT_CONFIG.observability.debug.format),
        timestamps: cfg.get("observability.debug.timestamps", DEFAULT_CONFIG.observability.debug.timestamps),
      },
      trace: {
        enabled: cfg.get("observability.trace.enabled", DEFAULT_CONFIG.observability.trace.enabled),
        minDurationMs: cfg.get("observability.trace.minDurationMs", DEFAULT_CONFIG.observability.trace.minDurationMs),
        logEvents: cfg.get("observability.trace.logEvents", DEFAULT_CONFIG.observability.trace.logEvents),
        logAttributes: cfg.get("observability.trace.logAttributes", DEFAULT_CONFIG.observability.trace.logAttributes),
      },
      errors: {
        notify: cfg.get("observability.errors.notify", DEFAULT_CONFIG.observability.errors.notify),
        showOutput: cfg.get("observability.errors.showOutput", DEFAULT_CONFIG.observability.errors.showOutput),
      },
      statusBar: {
        enabled: cfg.get("observability.statusBar.enabled", DEFAULT_CONFIG.observability.statusBar.enabled),
        alwaysVisible: cfg.get("observability.statusBar.alwaysVisible", DEFAULT_CONFIG.observability.statusBar.alwaysVisible),
      },
    },
    features: {
      commands: cfg.get("features.commands", DEFAULT_CONFIG.features.commands),
      debugCommands: cfg.get("features.debugCommands", DEFAULT_CONFIG.features.debugCommands),
      statusBar: cfg.get("features.statusBar", DEFAULT_CONFIG.features.statusBar),
      views: cfg.get("features.views", DEFAULT_CONFIG.features.views),
      inline: cfg.get("features.inline", DEFAULT_CONFIG.features.inline),
      diagnostics: cfg.get("features.diagnostics", DEFAULT_CONFIG.features.diagnostics),
    },
    experimental: {
      ai: cfg.get("experimental.ai", DEFAULT_CONFIG.experimental.ai),
    },
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
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
