# compiler/parsing

Holds the pure, in-process parsing helpers that turn authored Aurelia template text into IR-friendly structures.

- `attribute-parser.ts` — `AttributeParser` + built-in patterns (`AttrSyntax`, `DEFAULT_SYNTAX`).
- `expression-*.ts` — expression parser contract + scanner + LSP-friendly parser (`IExpressionParser`, `getExpressionParser`, `LspExpressionParser` utilities).

Keep parsing concerns here. Language semantics/registry live in `compiler/language/`, and data shapes/IR stay in `compiler/model/`.
