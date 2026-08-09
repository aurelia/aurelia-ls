/**
 * Semantic tokens handler.
 *
 * Semantic-runtime is the source of truth for token classification;
 * this adapter only maps runtime token rows into the LSP format.
 */
import {
  LSPErrorCodes,
  ResponseError,
  type SemanticTokens,
  type SemanticTokensParams,
  type SemanticTokensLegend,
} from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  SEMANTIC_TEMPLATE_SEMANTIC_TOKEN_MODIFIERS,
  SEMANTIC_TEMPLATE_SEMANTIC_TOKEN_TYPES,
  semanticExactSourceReference,
  type SemanticRuntimeAnswer,
  type SemanticTemplateSemanticTokensResult,
  type SemanticTemplateSemanticTokenRow,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import {
  semanticSourceOffsetRangeForDocument,
  semanticSourceReferenceMatchesDocument,
} from "../mapping/source-locations.js";
import type { SemanticRuntimeLspOperation } from "../runtime/semantic-runtime-session.js";
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
  operation: SemanticRuntimeLspOperation,
): Promise<SemanticTokens | null> {
  const doc = operation.documents.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  const response = await operation.templateSemanticTokens(
    doc,
  );
  assertCompleteSemanticTokensAnswer(response);
  const tokens = response.value.rows;
  if (tokens.length === 0) return null;

  const encoded = encodeTokens(tokens, doc, ctx.documentUris);
  return encoded.length ? { data: encoded } : null;
}

export function encodeTokens(
  tokens: readonly SemanticTemplateSemanticTokenRow[],
  document: Pick<TextDocument, "uri" | "getText" | "positionAt">,
  documentUris: ServerContext["documentUris"],
): number[] {
  const raw: RawToken[] = [];
  for (const [rowIndex, token] of tokens.entries()) {
    const typeIndex = TYPE_INDEX.get(token.tokenType);
    if (typeIndex === undefined) {
      throw semanticTokensRequestFailure(
        `row ${rowIndex} uses unknown token type ${JSON.stringify(token.tokenType)}.`,
      );
    }
    const modifiers = encodeModifiers(token.tokenModifiers, rowIndex);
    const exactSource = semanticExactSourceReference(token.source);
    if (exactSource == null) {
      throw semanticTokensRequestFailure(`row ${rowIndex} has no exact authored source range.`);
    }
    if (!semanticSourceReferenceMatchesDocument(exactSource, documentUris, document.uri)) {
      throw semanticTokensRequestFailure(`row ${rowIndex} does not target the requesting document.`);
    }
    const source = semanticSourceOffsetRangeForDocument(exactSource, document);
    if (source == null) {
      throw semanticTokensRequestFailure(
        `row ${rowIndex} has no exact source range valid for the current document.`,
      );
    }
    const length = source.end - source.start;
    if (length <= 0) {
      throw semanticTokensRequestFailure(
        `row ${rowIndex} has a non-positive source range ${source.start}..${source.end}.`,
      );
    }
    const start = document.positionAt(source.start);
    const end = document.positionAt(source.end);
    if (start.line !== end.line) {
      throw semanticTokensRequestFailure(
        `row ${rowIndex} spans multiple lines (${start.line}..${end.line}).`,
      );
    }
    raw.push({
      line: start.line,
      char: start.character,
      length,
      type: typeIndex,
      modifiers,
    });
  }

  raw.sort((a, b) => a.line - b.line || a.char - b.char);

  for (let index = 1; index < raw.length; index += 1) {
    const previous = raw[index - 1]!;
    const current = raw[index]!;
    if (previous.line === current.line && current.char < previous.char + previous.length) {
      throw semanticTokensRequestFailure(
        `ranges overlap on line ${current.line}: `
        + `${previous.char}..${previous.char + previous.length} and ${current.char}..${current.char + current.length}.`,
      );
    }
  }

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

function encodeModifiers(modifiers: readonly string[], rowIndex: number): number {
  if (modifiers.length === 0) return 0;
  let value = 0;
  for (const mod of modifiers) {
    const idx = MOD_INDEX.get(mod);
    if (idx === undefined) {
      throw semanticTokensRequestFailure(
        `row ${rowIndex} uses unknown token modifier ${JSON.stringify(mod)}.`,
      );
    }
    value |= 1 << idx;
  }
  return value;
}

function assertCompleteSemanticTokensAnswer(
  answer: SemanticRuntimeAnswer<SemanticTemplateSemanticTokensResult>,
): void {
  if (
    answer.result !== SemanticRuntimeAnswerResult.Answered
    || answer.selection !== SemanticRuntimeAnswerSelection.NotApplicable
    || answer.coverage !== SemanticRuntimeAnswerCoverage.Complete
  ) {
    throw semanticTokensRequestFailure(
      `semantic runtime returned result=${answer.result}; selection=${answer.selection}; coverage=${answer.coverage}.`,
    );
  }
}

function semanticTokensRequestFailure(detail: string): ResponseError<unknown> {
  return new ResponseError(
    LSPErrorCodes.RequestFailed,
    `Aurelia semantic token mapping was blocked: ${detail}`,
  );
}
