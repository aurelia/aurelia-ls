# Program Layer (experimental)

This folder hosts the experimental `TemplateProgram` architecture that is meant to replace ad-hoc `compileTemplate*` usage. It is **not yet integrated** into all callers (LSP/CLI/tests) and is still being fleshed out.

## Goals
- One façade (`TemplateProgram`) that owns documents, compilation cache, provenance ingestion, and product helpers (overlay/SSR/query).
- Shared primitives: `DocumentUri` (alias to `UriString`), `DocumentSnapshot`, `SourceStore`, `ProvenanceIndex`.
- Editor/build surfaces speak URI/Position/Range (`TemplateLanguageService`/`TemplateBuildService`); pipeline stays pure and isolated.
- Keep identity/span brands centralized (`UriString`/`NormalizedPath`/`SourceFileId` + `SourceSpan`); no new ad-hoc brands.

## What exists
- `primitives.ts` — URI/snapshot/origin aliases.
- `sources.ts` — `SourceStore` + in-memory impl.
- `provenance.ts` — edge contracts + naive in-memory index; caches overlay mapping + overlay URI but does **not** expand mappings yet.
- `program.ts` — default program with `(uri, version)` cache (assumes options stable per instance), feeds overlay mapping into provenance.
- `services.ts` — language/build facades; only diagnostics/overlay/SSR passthroughs are implemented.

## Key assumptions
- Options (semantics/resource graph/parsers/overlayBaseName/fingerprints) are stable for the lifetime of a program; if they change, make a new instance.
- Stage keys follow current pipeline: `10-lower`, `20-resolve-host`, `30-bind`, `40-typecheck`, `50-plan-overlay`, `60-emit-overlay` (+ SSR plan/emit).
- TemplateMappingArtifact lacks overlay path; callers must pass overlay URI when ingesting mappings into provenance.

## TODOs / gaps
- Expand overlay mapping segments into provenance edges; add offset-aware queries (source <-> generated).
- Add SSR provenance ingestion surface.
- Normalize spans with `SourceFileId` when indexing to avoid file-less spans.
- Flesh out language features (hover/defs/refs/completions/code actions/rename) using `TemplateProgram.getQuery` + provenance.
- Consider cache eviction/overlay-only modes if memory is an issue; add observability hooks that don’t couple to I/O.

## Migration hints
- Route open/change/close to `upsertTemplate`/`closeTemplate`; stop calling `compileTemplate*` directly.
- Diagnostics should come from `TemplateLanguageService.getDiagnostics` (`.all`).
- Overlay/SSR access via `TemplateBuildService.getOverlay`/`getSsr`; mapping via `program.getMapping` or provenance overlay mapping.
