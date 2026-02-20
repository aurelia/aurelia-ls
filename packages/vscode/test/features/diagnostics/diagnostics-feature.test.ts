import { describe, test, expect, vi } from "vitest";
import type { ClientContext } from "../../../out/core/context.js";
import { DiagnosticsFeature } from "../../../out/features/diagnostics/diagnostics-feature.js";
import { createTestConfig } from "../../helpers/test-helpers.js";

function createContext(options: {
  diagnosticsEnabled: boolean;
  diagnosticsContract: boolean;
}): ClientContext {
  const config = createTestConfig({
    features: {
      diagnostics: options.diagnosticsEnabled,
    },
  });

  return {
    config: {
      current: config,
    },
    capabilities: {
      current: {
        contracts: {
          diagnostics: options.diagnosticsContract ? { version: "diagnostics/1" } : false,
        },
      },
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
  test("isEnabled follows diagnostics feature toggle", () => {
    expect(DiagnosticsFeature.isEnabled?.(createContext({ diagnosticsEnabled: true, diagnosticsContract: true }))).toBe(true);
    expect(DiagnosticsFeature.isEnabled?.(createContext({ diagnosticsEnabled: false, diagnosticsContract: true }))).toBe(false);
  });

  test("isAvailable requires diagnostics contract", () => {
    expect(DiagnosticsFeature.isAvailable?.(createContext({ diagnosticsEnabled: true, diagnosticsContract: true }))).toBe(true);
    expect(DiagnosticsFeature.isAvailable?.(createContext({ diagnosticsEnabled: true, diagnosticsContract: false }))).toBe(false);
  });

  test("activation toggles diagnostics middleware bridge on and off", () => {
    const ctx = createContext({ diagnosticsEnabled: true, diagnosticsContract: true });
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
