import { describe, test, expect } from "vitest";
import {
  INLINE_EXPECTED_LEGEND_HASH,
  INLINE_GAP_AWARE_MASK,
  INLINE_GAP_CONSERVATIVE_MASK,
  collectInlineGapMarkers,
  decodeSemanticTokenData,
  hasCompatibleSemanticTokensLegend,
} from "../../../out/features/inline/gap-indicators.js";

describe("inline gap indicators", () => {
  test("accepts matching semantic token legend hash", () => {
    expect(hasCompatibleSemanticTokensLegend({
      contracts: {
        semanticTokens: {
          version: "semanticTokens/1",
          legendHash: INLINE_EXPECTED_LEGEND_HASH,
        },
      },
    })).toBe(true);

    expect(hasCompatibleSemanticTokensLegend({
      contracts: {
        semanticTokens: {
          version: "semanticTokens/1",
          legendHash: "mismatch",
        },
      },
    })).toBe(false);
  });

  test("decodes LSP semantic token delta payload", () => {
    const decoded = decodeSemanticTokenData([
      0, 3, 6, 3, 0,
      0, 5, 4, 4, 0,
      1, 2, 7, 3, 0,
    ]);

    expect(decoded).toEqual([
      { line: 0, character: 3, length: 6, typeIndex: 3, modifiersMask: 0 },
      { line: 0, character: 8, length: 4, typeIndex: 4, modifiersMask: 0 },
      { line: 1, character: 2, length: 7, typeIndex: 3, modifiersMask: 0 },
    ]);
  });

  test("classifies partial and low gap markers from modifier masks", () => {
    const markers = collectInlineGapMarkers([
      0, 2, 6, 3, INLINE_GAP_AWARE_MASK,
      0, 10, 4, 3, INLINE_GAP_AWARE_MASK | INLINE_GAP_CONSERVATIVE_MASK,
      1, 1, 5, 3, 0,
    ]);

    expect(markers).toEqual([
      { line: 0, character: 2, length: 6, level: "partial" },
      { line: 0, character: 12, length: 4, level: "low" },
    ]);
  });
});
