import { ObservabilityService } from "../../out/core/observability.js";
import type { PresentationConfig } from "../../out/core/config.js";
import { ClientLogger } from "../../out/log.js";
import type { VscodeApi } from "../../out/vscode-api.js";

export function createTestConfig(overrides: Partial<PresentationConfig> = {}): PresentationConfig {
  const base: PresentationConfig = {
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

  return {
    ...base,
    ...overrides,
    observability: {
      ...base.observability,
      ...(overrides.observability ?? {}),
      logging: {
        ...base.observability.logging,
        ...(overrides.observability?.logging ?? {}),
      },
      debug: {
        ...base.observability.debug,
        ...(overrides.observability?.debug ?? {}),
      },
      trace: {
        ...base.observability.trace,
        ...(overrides.observability?.trace ?? {}),
      },
      errors: {
        ...base.observability.errors,
        ...(overrides.observability?.errors ?? {}),
      },
      statusBar: {
        ...base.observability.statusBar,
        ...(overrides.observability?.statusBar ?? {}),
      },
    },
    features: {
      ...base.features,
      ...(overrides.features ?? {}),
    },
    experimental: {
      ...base.experimental,
      ...(overrides.experimental ?? {}),
    },
  };
}

export function createTestObservability(vscode: VscodeApi, overrides: Partial<PresentationConfig> = {}) {
  const config = createTestConfig(overrides);
  const logger = new ClientLogger("test", vscode);
  const observability = new ObservabilityService(vscode, logger, config);
  return { observability, logger, config };
}
