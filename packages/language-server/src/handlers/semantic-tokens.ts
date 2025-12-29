/**
 * Semantic tokens handler for Aurelia templates.
 *
 * Provides rich, context-aware syntax highlighting via LSP semantic tokens.
 * This handler walks the compiled template and emits tokens for:
 * - Custom element tags (distinguished from HTML tags)
 * - Binding commands (bind, trigger, for, etc.) [TODO]
 * - Expression variables/properties [TODO]
 *
 * See vscode-roadmap.md Phase 6 for the full vision.
 */
import type {
  SemanticTokens,
  SemanticTokensParams,
  SemanticTokensLegend,
} from "vscode-languageserver/node.js";
import { canonicalDocumentUri } from "@aurelia-ls/compiler";
import type { ServerContext } from "../context.js";
import type { LinkedRow, NodeSem } from "@aurelia-ls/compiler";
import type { DOMNode, ElementNode, SourceSpan } from "@aurelia-ls/compiler";

/* ===========================
 * Token Legend
 * =========================== */

/**
 * Token types - each maps to a VS Code theme color.
 * Order matters: index in array = token type ID.
 */
export const TOKEN_TYPES = [
  "namespace",   // 0: Custom element tag names
  "type",        // 1: Component class references
  "class",       // 2: Class names
  "parameter",   // 3: Binding commands (bind, trigger, for)
  "variable",    // 4: Template variables
  "property",    // 5: Property access, bindables
  "function",    // 6: Method calls in expressions
  "keyword",     // 7: Template controllers (if, repeat, else)
] as const;

/**
 * Token modifiers - can be combined via bitmask.
 * Order matters: index in array = bit position.
 */
export const TOKEN_MODIFIERS = [
  "declaration",     // 0: Being defined (item in repeat.for)
  "readonly",        // 1: One-way binding
  "modification",    // 2: Two-way binding
  "deprecated",      // 3: Deprecated API
  "defaultLibrary",  // 4: Aurelia built-in ($index, $event)
] as const;

export const SEMANTIC_TOKENS_LEGEND: SemanticTokensLegend = {
  tokenTypes: [...TOKEN_TYPES],
  tokenModifiers: [...TOKEN_MODIFIERS],
};

/* ===========================
 * Token Type Helpers
 * =========================== */

const TokenType = {
  namespace: 0,
  type: 1,
  class: 2,
  parameter: 3,
  variable: 4,
  property: 5,
  function: 6,
  keyword: 7,
} as const;

const TokenModifier = {
  declaration: 1 << 0,
  readonly: 1 << 1,
  modification: 1 << 2,
  deprecated: 1 << 3,
  defaultLibrary: 1 << 4,
} as const;

/* ===========================
 * Token Collection
 * =========================== */

export interface RawToken {
  line: number;      // 0-based line
  char: number;      // 0-based character
  length: number;
  type: number;
  modifiers: number;
}

/**
 * Encodes tokens into LSP's delta format.
 * Each token is 5 integers: [deltaLine, deltaChar, length, tokenType, tokenModifiers]
 */
export function encodeTokens(tokens: RawToken[]): number[] {
  // Sort by position (line, then character)
  tokens.sort((a, b) => a.line - b.line || a.char - b.char);

  const data: number[] = [];
  let prevLine = 0;
  let prevChar = 0;

  for (const token of tokens) {
    const deltaLine = token.line - prevLine;
    const deltaChar = deltaLine === 0 ? token.char - prevChar : token.char;

    data.push(deltaLine, deltaChar, token.length, token.type, token.modifiers);

    prevLine = token.line;
    prevChar = token.char;
  }

  return data;
}

/* ===========================
 * DOM Walking
 * =========================== */

/**
 * Builds a map from NodeId to DOMNode for quick lookup.
 */
export function buildNodeMap(root: DOMNode): Map<string, DOMNode> {
  const map = new Map<string, DOMNode>();

  function walk(node: DOMNode): void {
    map.set(node.id, node);
    if ("children" in node) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(root);
  return map;
}

/**
 * Converts a source offset to line/character using the document text.
 */
export function offsetToLineChar(text: string, offset: number): { line: number; char: number } {
  let line = 0;
  let char = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      char = 0;
    } else {
      char++;
    }
  }
  return { line, char };
}

/* ===========================
 * Token Extraction
 * =========================== */

/**
 * Extracts semantic tokens from a compiled template.
 *
 * Currently supports:
 * - Custom element tags (namespace token type)
 *
 * TODO:
 * - Binding commands
 * - Expression variables/properties/methods
 * - Template controller keywords
 */
export function extractTokens(
  text: string,
  rows: LinkedRow[],
  nodeMap: Map<string, DOMNode>
): RawToken[] {
  const tokens: RawToken[] = [];

  for (const row of rows) {
    const node = nodeMap.get(row.target);
    if (!node) continue;

    // Only process element nodes
    if (row.node.kind !== "element") continue;
    const nodeSem = row.node as NodeSem & { kind: "element" };

    // Check if it's a custom element
    if (nodeSem.custom) {
      const element = node as ElementNode;
      const loc = element.loc;
      if (!loc) continue;

      // Tag name starts after '<', so offset is loc.start + 1
      const tagStart = loc.start + 1;
      const tagLength = element.tag.length;

      const { line, char } = offsetToLineChar(text, tagStart);

      tokens.push({
        line,
        char,
        length: tagLength,
        type: TokenType.namespace,
        modifiers: 0,
      });

      // Also highlight closing tag if not self-closed
      if (!element.selfClosed) {
        // Find closing tag position: </tagname>
        // The closing tag is at the end of the element's content
        // We need to find it by searching backwards from loc.end
        const closeTagPattern = `</${element.tag}>`;
        const closeTagStart = text.lastIndexOf(closeTagPattern, loc.end);
        if (closeTagStart !== -1) {
          // Tag name starts after '</'
          const closeTagNameStart = closeTagStart + 2;
          const closePos = offsetToLineChar(text, closeTagNameStart);
          tokens.push({
            line: closePos.line,
            char: closePos.char,
            length: tagLength,
            type: TokenType.namespace,
            modifiers: 0,
          });
        }
      }
    }
  }

  return tokens;
}

/* ===========================
 * Handler
 * =========================== */

function formatError(e: unknown): string {
  if (e instanceof Error) return e.stack ?? e.message;
  return String(e);
}

export function handleSemanticTokensFull(
  ctx: ServerContext,
  params: SemanticTokensParams
): SemanticTokens | null {
  try {
    ctx.logger.log(`[semanticTokens] request for ${params.textDocument.uri}`);

    const doc = ctx.ensureProgramDocument(params.textDocument.uri);
    if (!doc) {
      ctx.logger.log(`[semanticTokens] no document found`);
      return null;
    }

    const canonical = canonicalDocumentUri(doc.uri);
    const compilation = ctx.workspace.program.getCompilation(canonical.uri);

    if (!compilation?.linked?.templates?.length) {
      ctx.logger.log(`[semanticTokens] no linked templates found`);
      return null;
    }

    const text = doc.getText();
    const template = compilation.linked.templates[0];
    if (!template) return null;

    ctx.logger.log(`[semanticTokens] found ${template.rows.length} rows`);

    // Log row details for debugging
    for (const row of template.rows) {
      if (row.node.kind === "element") {
        const nodeSem = row.node as NodeSem & { kind: "element" };
        ctx.logger.log(`[semanticTokens] element: ${nodeSem.tag}, custom=${!!nodeSem.custom}, native=${!!nodeSem.native}`);
      }
    }

    const nodeMap = buildNodeMap(template.dom);
    const tokens = extractTokens(text, template.rows, nodeMap);

    ctx.logger.log(`[semanticTokens] extracted ${tokens.length} tokens`);

    if (tokens.length === 0) {
      return null;
    }

    const encoded = encodeTokens(tokens);
    ctx.logger.log(`[semanticTokens] returning ${encoded.length / 5} tokens`);

    return {
      data: encoded,
    };
  } catch (e) {
    ctx.logger.error(`[semanticTokens] failed for ${params.textDocument.uri}: ${formatError(e)}`);
    return null;
  }
}
