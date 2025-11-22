**Parser Source/Provenance Upgrade Plan**

This document captures the target architecture for source-aware parsing and the steps to implement it across the Aurelia LS domain compiler. Key files to reference are called out so future work can resume without context loss.

---

### Target Architecture

- **AST span shape**
  - All AST nodes in `packages/domain/src/compiler/model/ir.ts` use `SourceSpan` (with `file?: SourceFileId`) instead of plain `TextSpan`. Option: keep `span: TextSpan` plus `sourceSpan?: SourceSpan` if partial adoption is needed, but the preferred end state is a single `SourceSpan`.
  - `BadExpression` carries `span: SourceSpan` and may also carry `origin?: Origin` for provenance.
- **Parser API**
  - `LspExpressionParser.parse(...)` accepts an optional context `{ baseSpan?: SourceSpan; file?: SourceFileId; baseOffset?: number }`.
  - Spans are authored as `SourceSpan` when context is provided; otherwise they remain `TextSpan`.
  - Export a helper `rebaseExpressionSpans(ast, baseSpan: SourceSpan)` in `packages/domain/src/parsers/lsp-expression-parser.ts` to adjust existing ASTs post-parse.
  - Interpolation and template literal internals honor the same base offsets/file so embedded expressions get correct absolute spans.
- **Provenance**
  - `BadExpression` is constructed with `provenanceFromSpan("parse", sourceSpan)` (if available) or at least a `SourceSpan`.
  - Callers may layer additional provenance, but parser-originated failures include parse provenance by default.
- **Downstream usage**
  - Lower/bind/typecheck treat `span` as `SourceSpan` and no longer need ad-hoc file attachment.
  - Diagnostics rely on `span.file` directly; fallbacks remain for contexts without file data.

---

### Checklist

#### 1) IR model update (`packages/domain/src/compiler/model/ir.ts`)
- [x] Change AST node `span` types from `TextSpan` to `SourceSpan` (or add `sourceSpan?: SourceSpan` if doing a transitional shape).
- [x] Update `BadExpression` to require `SourceSpan`; add optional `origin?: Origin` if desired.
- [x] Update type aliases (`IsPrimary`, `IsAssign`, etc.) to the new span type.
- [x] Ensure `Interpolation`, `ForOfStatement`, template nodes all use the new span shape.

#### 2) Span/provenance utilities (already present)
- [x] Reuse `SourceSpan`, `absoluteSpan`, `ensureSpanFile` from `packages/domain/src/compiler/model/span.ts` and `packages/domain/src/compiler/model/source.ts`.
- [x] Reuse `provenanceFromSpan` from `packages/domain/src/compiler/model/origin.ts` for `BadExpression`.

#### 3) Parser API/context (`packages/domain/src/parsers/lsp-expression-parser.ts`)
- [x] Extend `parse` signatures to accept an optional parse context `{ baseSpan?: SourceSpan; file?: SourceFileId; baseOffset?: number }`.
- [x] Thread context through `CoreParser` so every `spanFromBounds` call can emit a `SourceSpan` when context is present (`absoluteSpan` or `toSourceSpan` with offset).
- [x] When parsing interpolation/template literals, propagate the same base offset/file to inner parses so embedded expressions are correctly rebased.
- [x] Export `rebaseExpressionSpans(ast, baseSpan: SourceSpan)` helper that walks the AST (reuse `offsetNodeSpans`) and converts to `SourceSpan` with file.
- [x] Construct `BadExpression` with `provenanceFromSpan("parse", sourceSpan)` when context is present; otherwise keep the current behavior.

#### 4) Parser callers
- [x] `packages/domain/src/parsers/expression-parser.ts`: if keeping the singleton, adjust factory to accept/forward parse context or clarify default behavior (no file).
- [x] `packages/domain/src/compiler/phases/10-lower/lower-shared.ts`: pass `SourceSpan` (from `spanFromOffsets`) into the parser so AST spans are source-aware at creation; remove any post-parse offset hacks.
- [x] `packages/domain/src/compiler/phases/30-bind/bind.ts`: ensure diagnostics consume `SourceSpan` directly; simplify any file-attachment code.
- [x] `packages/domain/src/compiler/phases/40-typecheck` / emit layers: verify they no longer expect `TextSpan` from expressions or attach files ad-hoc.
- [x] Other parser users (tests, fixtures) updated for the new signature.

#### 5) Diagnostics
- [x] Verify `packages/domain/src/compiler/diagnostics.ts` continues to work with `SourceSpan` (it already does).
- [x] For `BadExpression`, ensure AU1203 (bind) uses the new `SourceSpan` and provenance.

#### 6) Tests and fixtures
- [x] Update parser tests under `packages/domain/test/parsers/*.test.mjs` for any signature/shape changes and expected spans/files.
- [x] Update bind/lower/typecheck tests if they assert span shapes.
- [x] Consider adding a test that parses with a `baseSpan`/`file` and asserts `span.file` is set on nested nodes (including interpolation segments).

#### 7) Helpers and documentation
- [x] Add inline docstrings to `parse` and `rebaseExpressionSpans` describing context usage.
- [x] Update `docs/agents/appendix-domain.md` (and `AGENTS.md` TL;DR if needed) to note that parser spans are now `SourceSpan` and can carry provenance.

#### 8) Public surface
- [x] Re-export `ExpressionParseContext` / `rebaseExpressionSpans` (or document their import path) from the public API if external consumers need source-aware parsing.

---

### Starting Points (files to open)
- `packages/domain/src/compiler/model/ir.ts`
- `packages/domain/src/parsers/lsp-expression-parser.ts`
- `packages/domain/src/compiler/model/span.ts`
- `packages/domain/src/compiler/model/source.ts`
- `packages/domain/src/compiler/model/origin.ts`
- `packages/domain/src/parsers/expression-parser.ts`
- `packages/domain/src/compiler/phases/10-lower/lower-shared.ts`
- `packages/domain/src/compiler/phases/30-bind/bind.ts`
- Tests: `packages/domain/test/parsers/*.test.mjs`, `packages/domain/test/30-bind/bind.test.mjs`

This plan should prevent drift by defining the desired end state and the exact touchpoints for spans/provenance integration.
