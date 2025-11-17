import type { IExpressionParser } from "./expression-api.js";
import { LspExpressionParser } from "./lsp-expression-parser.js";

/**
 * Construct / reuse the LSP expression parser.
 *
 * We keep this behind a small factory so the server can share a single
 * instance safely across compilations. The parser itself is re‑entrant:
 * each call to `parse` allocates a fresh CoreParser with its own Scanner.
 */
let singleton: IExpressionParser | null = null;

export function getExpressionParser(): IExpressionParser {
  if (singleton == null) {
    singleton = new LspExpressionParser();
  }
  return singleton;
}
