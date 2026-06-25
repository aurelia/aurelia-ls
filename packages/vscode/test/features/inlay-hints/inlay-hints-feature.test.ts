import { describe, test, expect, vi } from "vitest";
import type { ClientContext } from "../../../out/core/context.js";
import { InlayHintsFeature } from "../../../out/features/inlay-hints/inlay-hints-feature.js";
import { createTestConfig } from "../../helpers/test-helpers.js";

function createContext(options: { inlayHints?: boolean } = {}): ClientContext {
  const config = createTestConfig(
    typeof options.inlayHints === "boolean"
      ? {
          features: {
            inlayHints: options.inlayHints,
          },
        }
      : {},
  );

  return {
    config: {
      current: config,
    },
    languageClient: {
      setInlayHintsEnabled: vi.fn(),
    },
    logger: {
      debug: vi.fn(),
    },
  } as unknown as ClientContext;
}

describe("InlayHintsFeature", () => {
  test("isEnabled defaults on and follows the feature toggle", () => {
    expect(InlayHintsFeature.isEnabled?.(createContext())).toBe(true);
    expect(InlayHintsFeature.isEnabled?.(createContext({ inlayHints: true }))).toBe(true);
    expect(InlayHintsFeature.isEnabled?.(createContext({ inlayHints: false }))).toBe(false);
  });

  test("activation toggles the inlay hint middleware bridge on and off", () => {
    const ctx = createContext({ inlayHints: true });
    const setInlayHintsEnabled = ctx.languageClient.setInlayHintsEnabled as unknown as {
      (...args: unknown[]): unknown;
      mock: unknown;
    };

    const disposable = InlayHintsFeature.activate(ctx) as { dispose: () => void };
    expect(setInlayHintsEnabled).toHaveBeenCalledWith(true);

    disposable.dispose();
    expect(setInlayHintsEnabled).toHaveBeenLastCalledWith(false);
  });
});
