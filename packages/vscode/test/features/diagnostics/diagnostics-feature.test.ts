import { describe, test, expect, vi } from "vitest";
import type { ClientContext } from "../../../out/core/context.js";
import { DiagnosticsFeature } from "../../../out/features/diagnostics/diagnostics-feature.js";
import { createTestConfig } from "../../helpers/test-helpers.js";

function createContext(options: {
  diagnosticsEnabled?: boolean;
}): ClientContext {
  const config = createTestConfig({
    features: {
      diagnostics: options.diagnosticsEnabled ?? false,
    },
  });

  return {
    config: {
      current: config,
    },
    languageClient: {
      setDiagnosticsUxEnabled: vi.fn(),
    },
    logger: {
      debug: vi.fn(),
    },
  } as unknown as ClientContext;
}

describe("DiagnosticsFeature", () => {
  test("isEnabled defaults off to keep diagnostic messages quiet", () => {
    expect(DiagnosticsFeature.isEnabled?.(createContext({}))).toBe(false);
  });

  test("isEnabled follows diagnostics feature toggle", () => {
    expect(DiagnosticsFeature.isEnabled?.(createContext({ diagnosticsEnabled: true }))).toBe(true);
    expect(DiagnosticsFeature.isEnabled?.(createContext({ diagnosticsEnabled: false }))).toBe(false);
  });

  test("activation toggles diagnostics middleware bridge on and off", () => {
    const ctx = createContext({ diagnosticsEnabled: true });
    const setDiagnosticsUxEnabled = ctx.languageClient.setDiagnosticsUxEnabled as unknown as {
      (...args: unknown[]): unknown;
      mock: unknown;
    };

    const disposable = DiagnosticsFeature.activate(ctx) as { dispose: () => void };
    expect(setDiagnosticsUxEnabled).toHaveBeenCalledWith(true);

    disposable.dispose();
    expect(setDiagnosticsUxEnabled).toHaveBeenLastCalledWith(false);
  });
});
