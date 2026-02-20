import { stableHash } from "@aurelia-ls/compiler";
import type { CapabilitiesResponse } from "../../types.js";

export const INLINE_TOKEN_MODIFIER_GAP_AWARE = "aureliaGapAware" as const;
export const INLINE_TOKEN_MODIFIER_GAP_CONSERVATIVE = "aureliaGapConservative" as const;

export const INLINE_TOKEN_TYPES = [
  "aureliaElement",
  "aureliaAttribute",
  "aureliaBindable",
  "aureliaController",
  "aureliaCommand",
  "aureliaConverter",
  "aureliaBehavior",
  "aureliaMetaElement",
  "aureliaMetaAttribute",
  "aureliaExpression",
  "variable",
  "property",
  "function",
  "keyword",
  "string",
] as const;

export const INLINE_TOKEN_MODIFIERS = [
  "declaration",
  "definition",
  "defaultLibrary",
  "deprecated",
  "readonly",
  INLINE_TOKEN_MODIFIER_GAP_AWARE,
  INLINE_TOKEN_MODIFIER_GAP_CONSERVATIVE,
] as const;

export const INLINE_EXPECTED_LEGEND_HASH = stableHash({
  tokenTypes: INLINE_TOKEN_TYPES,
  tokenModifiers: INLINE_TOKEN_MODIFIERS,
});

const GAP_AWARE_INDEX = INLINE_TOKEN_MODIFIERS.indexOf(INLINE_TOKEN_MODIFIER_GAP_AWARE);
const GAP_CONSERVATIVE_INDEX = INLINE_TOKEN_MODIFIERS.indexOf(INLINE_TOKEN_MODIFIER_GAP_CONSERVATIVE);

export const INLINE_GAP_AWARE_MASK = GAP_AWARE_INDEX >= 0 ? 1 << GAP_AWARE_INDEX : 0;
export const INLINE_GAP_CONSERVATIVE_MASK = GAP_CONSERVATIVE_INDEX >= 0 ? 1 << GAP_CONSERVATIVE_INDEX : 0;

export interface DecodedSemanticToken {
  readonly line: number;
  readonly character: number;
  readonly length: number;
  readonly typeIndex: number;
  readonly modifiersMask: number;
}

export interface InlineGapMarker {
  readonly line: number;
  readonly character: number;
  readonly length: number;
  readonly level: "partial" | "low";
}

export function hasCompatibleSemanticTokensLegend(capabilities: CapabilitiesResponse | null | undefined): boolean {
  const legendHash = capabilities?.contracts?.semanticTokens?.legendHash;
  if (typeof legendHash !== "string" || legendHash.length === 0) return false;
  return legendHash === INLINE_EXPECTED_LEGEND_HASH;
}

export function decodeSemanticTokenData(data: readonly number[]): DecodedSemanticToken[] {
  const decoded: DecodedSemanticToken[] = [];
  let prevLine = 0;
  let prevCharacter = 0;
  for (let i = 0; i + 4 < data.length; i += 5) {
    const deltaLine = data[i] ?? 0;
    const deltaCharacter = data[i + 1] ?? 0;
    const length = data[i + 2] ?? 0;
    const typeIndex = data[i + 3] ?? 0;
    const modifiersMask = data[i + 4] ?? 0;
    const line = prevLine + deltaLine;
    const character = deltaLine === 0 ? prevCharacter + deltaCharacter : deltaCharacter;
    decoded.push({ line, character, length, typeIndex, modifiersMask });
    prevLine = line;
    prevCharacter = character;
  }
  return decoded;
}

export function collectInlineGapMarkers(data: readonly number[]): InlineGapMarker[] {
  const markers: InlineGapMarker[] = [];
  for (const token of decodeSemanticTokenData(data)) {
    if (token.length <= 0) continue;
    if ((token.modifiersMask & INLINE_GAP_CONSERVATIVE_MASK) !== 0) {
      markers.push({
        line: token.line,
        character: token.character,
        length: token.length,
        level: "low",
      });
      continue;
    }
    if ((token.modifiersMask & INLINE_GAP_AWARE_MASK) !== 0) {
      markers.push({
        line: token.line,
        character: token.character,
        length: token.length,
        level: "partial",
      });
    }
  }
  return markers;
}
