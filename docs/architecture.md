# Architecture

This document describes the current architecture of the Aurelia language server and AOT compiler platform.

## System Overview

The monorepo is organized around one core principle: shared compiler semantics power both IDE tooling and runtime/build outputs.

At the center is `@aurelia-ls/compiler`, which now includes both:

1. Project-semantics discovery (resources, routes, registration, scoping)
2. Template analysis + synthesis (IDE overlay and AOT artifacts)

High-level flow:

```text
TypeScript Project + HTML Templates
               |
               v
      @aurelia-ls/compiler
   +--------------------------+
   | project-semantics        |
   | template analysis        |
   | overlay/aot synthesis    |
   +--------------------------+
      |                |
      v                v
semantic-workspace    transform/ssr/ssg/vite-plugin
      |
      v
language-server + vscode
```

## Package Responsibilities

| Package | Responsibility |
|---------|----------------|
| `@aurelia-ls/compiler` | Core semantic authority. Discovers project semantics and compiles templates through staged analysis and synthesis. |
| `@aurelia-ls/semantic-workspace` | Incremental semantic graph and query layer used by IDE-facing features. |
| `@aurelia-ls/language-server` | LSP host, diagnostics/completions/hover/definitions/references. |
| `@aurelia-ls/transform` | Injects generated AOT artifacts into TypeScript source. |
| `@aurelia-ls/vite-plugin` | Build/dev integration, wires compiler + SSR/SSG in Vite workflows. |
| `@aurelia-ls/ssr` | Server rendering runtime and hydration integration. |
| `@aurelia-ls/ssg` | Route-driven static generation on top of compiler semantics + SSR. |
| `@aurelia-ls/integration-harness` | Cross-package integration test harness and scenario runner. |
| `aurelia-2` | VS Code extension packaging and editor integration surface. |

## Compiler Architecture

### Dual Pipelines in `@aurelia-ls/compiler`

`@aurelia-ls/compiler` runs two cooperating pipelines:

1. Project-semantics pipeline (project-level resource understanding)
2. Template pipeline (single-template semantic compilation)

### Project-Semantics Pipeline

Purpose: discover resource and route semantics from TypeScript programs.

Conceptual layers:

```text
extract -> infer -> register -> scope
```

Key outputs include:

- Resource graph and scoped registrations
- Template information and conventions mapping
- Route tree and route metadata
- Diagnostics/provenance suitable for tooling and build integration

### Template Analysis Pipeline

Purpose: compile template text into linked semantics, scoped bindings, typechecked expressions, and synthesis-ready modules.

```text
10-lower -> 20-link -> 30-bind -> 40-typecheck
                    \
                     -> 50-usage
```

- `10-lower`: Parse template and lower to IR with source/provenance.
- `20-link`: Link nodes/attributes/expressions to project semantics.
- `30-bind`: Build lexical scope frames and expression binding contexts.
- `40-typecheck`: Validate expressions against TS types.
- `50-usage`: Feature usage analysis derived from linked semantics.

### Synthesis Outputs

After analysis, synthesis splits into two output forms:

- Overlay synthesis: virtual typings for IDE tooling (not written to disk).
- AOT synthesis: runtime-ready template artifacts for transform/SSR/SSG.

## IDE Architecture

IDE requests flow through shared semantics, not a separate adapter model.

```text
Editor request
  -> language-server
  -> semantic-workspace (incremental model)
  -> compiler analysis/synthesis data
  -> LSP response (diagnostic/completion/hover/etc.)
```

This keeps feature behavior aligned with compiler/runtime semantics.

## Build and Runtime Architecture

Vite/runtime flows reuse the same compiler semantics:

```text
source
  -> vite-plugin
  -> compiler (project-semantics + template pipeline)
  -> transform (inject AOT)
  -> ssr/ssg as needed
  -> output
```

This avoids divergence between build-time, runtime, and IDE semantics.

## Key Invariants

- Provenance-first: use `SourceSpan` and provenance APIs, not ad-hoc offsets.
- Deterministic staged analysis: stages are pure and cache-friendly.
- Configuration-driven syntax: controllers/commands/patterns come from config/semantics.
- Unification over adapters: shared compiler primitives are preferred across packages.
- Strict typing: preserve branded types and avoid `any` in semantic boundaries.

## Current Directory Map

```text
packages/
  compiler/
  semantic-workspace/
  language-server/
  transform/
  vite-plugin/
  ssr/
  ssg/
  integration-harness/
  vscode/
```

## Related Docs

- [Getting Started](./getting-started.md)
- Root docs: `AGENTS.md` and `.codex/README.md`
