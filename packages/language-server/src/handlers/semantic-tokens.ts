/**
 * Semantic tokens handler.
 *
 * Semantic-runtime is the source of truth for token classification;
 * this adapter only maps runtime token rows into the LSP format.
 */
import type {
  SemanticTokens,
  SemanticTokensParams,
  SemanticTokensLegend,
} from "vscode-languageserver/node";
import {
  SEMANTIC_TEMPLATE_SEMANTIC_TOKEN_MODIFIERS,
  SEMANTIC_TEMPLATE_SEMANTIC_TOKEN_TYPES,
  semanticExactSourceReference,
  type SemanticTemplateSemanticTokenRow,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import {
  logIfSemanticRuntimeRequestAborted,
} from "./request-guard.js";
import type { SemanticRuntimeLspRequestGuard } from "../runtime/semantic-runtime-session.js";
import { isTemplateDocument } from "../utils/document-kind.js";

export const WORKSPACE_TOKEN_MODIFIER_GAP_AWARE = "aureliaGapAware" as const;
export const WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE = "aureliaGapConservative" as const;

export const TOKEN_TYPES = SEMANTIC_TEMPLATE_SEMANTIC_TOKEN_TYPES;
export const TOKEN_MODIFIERS = SEMANTIC_TEMPLATE_SEMANTIC_TOKEN_MODIFIERS;

export const SEMANTIC_TOKENS_LEGEND: SemanticTokensLegend = {
  tokenTypes: [...TOKEN_TYPES],
  tokenModifiers: [...TOKEN_MODIFIERS],
};

const TYPE_INDEX = new Map<string, number>(TOKEN_TYPES.map((t, i) => [t, i]));
const MOD_INDEX = new Map<string, number>(TOKEN_MODIFIERS.map((m, i) => [m, i]));

interface RawToken {
  line: number;
  char: number;
  length: number;
  type: number;
  modifiers: number;
}

export async function handleSemanticTokensFull(
  ctx: ServerContext,
  params: SemanticTokensParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<SemanticTokens | null> {
  return ctx.trace.spanAsync("lsp.semanticTokens", async () => {
    try {
      ctx.trace.setAttribute("lsp.semanticTokens.uri", params.textDocument.uri);

      const doc = ctx.ensureProgramDocument(params.textDocument.uri);
      if (!doc) return null;
      if (!isTemplateDocument(doc)) return null;

      const response = await ctx.semanticRuntime.templateSemanticTokens(
        doc,
        guard,
      );
      const tokens = response.value.rows;
      if (tokens.length === 0) return null;

      const encoded = encodeTokens(tokens, doc.getText());
      return encoded.length ? { data: encoded } : null;
    } catch (e) {
      if (logIfSemanticRuntimeRequestAborted(ctx, "semanticTokens", e, params.textDocument.uri)) {
        return null;
      }
      const message = e instanceof Error ? e.stack ?? e.message : String(e);
      ctx.logger.error(`[semanticTokens] failed for ${params.textDocument.uri}: ${message}`);
      return null;
    }
  });
}

export function encodeTokens(tokens: readonly SemanticTemplateSemanticTokenRow[], text: string): number[] {
  const raw: RawToken[] = [];
  for (const token of tokens) {
    const typeIndex = TYPE_INDEX.get(token.tokenType);
    if (typeIndex === undefined) continue;
    const source = semanticExactSourceReference(token.source);
    if (source?.start == null || source.end == null) continue;
    const length = source.end - source.start;
    if (length <= 0) continue;
    const start = positionAtOffset(text, source.start);
    const modifiers = encodeModifiers(token.tokenModifiers);
    raw.push({
      line: start.line,
      char: start.character,
      length,
      type: typeIndex,
      modifiers,
    });
  }

  raw.sort((a, b) => a.line - b.line || a.char - b.char);

  const data: number[] = [];
  let prevLine = 0;
  let prevChar = 0;
  for (const token of raw) {
    const deltaLine = token.line - prevLine;
    const deltaChar = deltaLine === 0 ? token.char - prevChar : token.char;
    data.push(deltaLine, deltaChar, token.length, token.type, token.modifiers);
    prevLine = token.line;
    prevChar = token.char;
  }

  return data;
}

function encodeModifiers(modifiers?: readonly string[]): number {
  if (!modifiers?.length) return 0;
  let value = 0;
  for (const mod of modifiers) {
    const idx = MOD_INDEX.get(mod);
    if (idx === undefined) continue;
    value |= 1 << idx;
  }
  return value;
}

function positionAtOffset(text: string, offset: number): { line: number; character: number } {
  const length = text.length;
  const clamped = Math.max(0, Math.min(offset, length));
  const lineStarts = computeLineStarts(text);
  let line = 0;
  while (line + 1 < lineStarts.length && (lineStarts[line + 1] ?? Number.POSITIVE_INFINITY) <= clamped) {
    line += 1;
  }
  const lineStart = lineStarts[line] ?? 0;
  return { line, character: clamped - lineStart };
}

function computeLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    if (ch === 13 /* CR */ || ch === 10 /* LF */) {
      if (ch === 13 /* CR */ && text.charCodeAt(i + 1) === 10 /* LF */) i += 1;
      starts.push(i + 1);
    }
  }
  return starts;
}
