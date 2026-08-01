import type { PresentationConfig } from "../../out/core/config.js";
import { ErrorReporter } from "../../out/core/errors.js";
import { ClientLogger } from "../../out/log.js";
import type { VscodeApi } from "../../out/vscode-api.js";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown>
    ? DeepPartial<T[K]>
    : T[K];
};

export function createTestConfig(overrides: DeepPartial<PresentationConfig> = {}): PresentationConfig {
  const base: PresentationConfig = {
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

  return {
    ...base,
    ...overrides,
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

export function createTestServices(vscode: VscodeApi, overrides: DeepPartial<PresentationConfig> = {}) {
  const config = createTestConfig(overrides);
  const logger = new ClientLogger("test", vscode);
  const errors = new ErrorReporter(logger, vscode);
  return { errors, logger, config };
}
