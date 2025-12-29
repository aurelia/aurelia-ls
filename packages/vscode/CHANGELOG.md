# Changelog

## 0.3.0

### Semantic Tokens

Full syntax highlighting powered by compiler analysis:

- Custom elements highlighted as namespace
- Expressions: variables, property access, method calls, Aurelia built-ins (`$index`, `$parent`, etc.)
- Binding commands: `.bind`, `.trigger`, `.two-way`, shorthand `:` and `@`
- Template controllers: `if.bind`, `repeat.for`, `switch`/`case`
- Value converters and binding behaviors
- Interpolation delimiters

Removes TextMate grammar in favor of semantic tokens for more accurate highlighting.

### Snippets

Added snippets for common Aurelia patterns:
- Template controllers: `au-if`, `au-repeat`, `au-switch`, `au-promise`
- Bindings: `au-bind`, `au-trigger`, `au-two-way`
- Elements: `au-compose`, `au-slot`, `au-viewport`

### Fixes

- Fixed overlay file paths leaking into diagnostics
- Fixed semantic token highlighting for nested content inside template controllers
- Improved language server performance (debouncing, reduced TS service recreation)

## 0.2.0

- Fixed server startup issue
- Fixed URI encoding in document synchronization
- Improved error handling in LSP request handlers
- Reduced unnecessary recompilation with better change detection

## 0.1.0

Initial release with support for:

- Type-aware diagnostics for binding expressions
- Unknown element and attribute detection
- Hover information with types
- Go-to-definition for component properties
- Find references across templates
