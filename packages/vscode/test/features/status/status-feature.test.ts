import { describe, expect, test } from "vitest";
import { StatusFeature } from "../../../out/features/status/status-feature.js";

describe("StatusFeature", () => {
  test("is controlled only by the status bar setting", () => {
    expect(StatusFeature.isEnabled?.({ config: { current: { features: { statusBar: true } } } } as never)).toBe(true);
    expect(StatusFeature.isEnabled?.({ config: { current: { features: { statusBar: false } } } } as never)).toBe(false);
  });
});
