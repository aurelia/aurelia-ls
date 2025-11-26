import type { IExpressionParser } from "./lsp-expression-parser.js";
import { LspExpressionParser } from "./lsp-expression-parser.js";

/**
 * Construct / reuse the LSP expression parser.
 *
 * We keep this behind a small factory so the server can share a single
 * instance safely across compilations. The parser itself is re-entrant and
 * stateless: each `parse` call allocates a fresh CoreParser with its own
 * Scanner and accepts an optional `ExpressionParseContext` to rebase spans
 * to absolute template offsets (file + base span/offset).
 */
let singleton: IExpressionParser | null = null;

export function getExpressionParser(): IExpressionParser {
  if (singleton == null) {
    singleton = new LspExpressionParser();
  }
  return singleton;
}
