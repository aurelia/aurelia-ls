/**
 * Semantic tokens handler.
 *
 * The Semantic Workspace is the source of truth for token classification;
 * this adapter only maps workspace tokens into the LSP format.
 */
import type {
  SemanticTokens,
  SemanticTokensParams,
  SemanticTokensLegend,
} from "vscode-languageserver/node.js";
import { canonicalDocumentUri } from "@aurelia-ls/compiler";
import type { ServerContext } from "../context.js";
import {
  WORKSPACE_TOKEN_MODIFIER_GAP_AWARE,
  WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE,
  type WorkspaceToken,
} from "@aurelia-ls/semantic-workspace";

export const TOKEN_TYPES = [
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

export const TOKEN_MODIFIERS = [
  "declaration",
  "definition",
  "defaultLibrary",
  "deprecated",
  "readonly",
  WORKSPACE_TOKEN_MODIFIER_GAP_AWARE,
  WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE,
] as const;

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

export function handleSemanticTokensFull(
  ctx: ServerContext,
  params: SemanticTokensParams,
): SemanticTokens | null {
  return ctx.trace.span("lsp.semanticTokens", () => {
    try {
      ctx.trace.setAttribute("lsp.semanticTokens.uri", params.textDocument.uri);

      const doc = ctx.ensureProgramDocument(params.textDocument.uri);
      if (!doc) return null;

      const canonical = canonicalDocumentUri(doc.uri);
      const text = ctx.workspace.lookupText(canonical.uri) ?? doc.getText();
      const tokens = ctx.workspace.query(canonical.uri).semanticTokens();
      if (!tokens.length) return null;

      const encoded = encodeTokens(tokens, text);
      return encoded.length ? { data: encoded } : null;
    } catch (e) {
      const message = e instanceof Error ? e.stack ?? e.message : String(e);
      ctx.logger.error(`[semanticTokens] failed for ${params.textDocument.uri}: ${message}`);
      return null;
    }
  });
}

function encodeTokens(tokens: readonly WorkspaceToken[], text: string): number[] {
  const raw: RawToken[] = [];
  for (const token of tokens) {
    const typeIndex = TYPE_INDEX.get(token.type);
    if (typeIndex === undefined) continue;
    const length = token.span.end - token.span.start;
    if (length <= 0) continue;
    const start = positionAtOffset(text, token.span.start);
    const modifiers = encodeModifiers(token.modifiers);
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
