# Program Layer (experimental)

This folder hosts the experimental `TemplateProgram` architecture that is meant to replace ad-hoc `compileTemplate*` usage. It is **not yet integrated** into all callers (LSP/CLI/tests) and is still being fleshed out.

> Normative spec: the source of truth for the target design lives in
> `docs/agents/program-architecture.md`.
> This README only describes the current state of the implementation and known gaps.

## Goals

- One facade (`TemplateProgram`) that owns documents, compilation cache, provenance ingestion, and product helpers (overlay/SSR/query).
- Shared primitives: `DocumentUri` (alias to `UriString`), `DocumentSnapshot`, `SourceStore`, `ProvenanceIndex`.
- Editor/build surfaces speak URI/Position/Range (`TemplateLanguageService` / `TemplateBuildService`); the compiler pipeline stays pure and isolated.
- Keep identity/span brands centralized (`UriString` / `NormalizedPath` / `SourceFileId` plus `SourceSpan`); no new ad-hoc brands.

## What exists

- `primitives.ts`
  Program-layer aliases for URIs, snapshots, and common ids/spans.

- `sources.ts`
  `SourceStore` interface and an in-memory implementation.

- `provenance.ts`
  Edge contracts and a naive in-memory `ProvenanceIndex`. It currently stores overlay mappings and overlay URIs but does not expand segment-level edges or provide full offset-based queries.

- `program.ts`
  Default program with a per-document compilation cache keyed by `(uri, snapshot.version)` under the assumption that options are stable for the lifetime of a program. It feeds overlay mapping into `ProvenanceIndex`.

- `services.ts`
  Language/build facades. Diagnostics and overlay/SSR access are wired; hover/defs/refs/completions/code actions/rename are stubbed.

## Key assumptions

- Options (semantics, resource graph, parsers, overlay base name, fingerprints) are stable for the lifetime of a program; if they change, create a new instance.
- Stage keys follow the current pipeline: `10-lower`, `20-resolve-host`, `30-bind`, `40-typecheck`, `50-plan-overlay`, `60-emit-overlay` plus SSR plan/emit.
- `TemplateMappingArtifact` lacks an overlay path; callers must pass the overlay URI when ingesting mappings into provenance.
- Top-level program caches may use `(uri, version)` as a key as long as version values are content-versioned. Stage-level caches are responsible for content hashing.

## TODOs / gaps

The main deltas compared to `docs/agents/program-architecture.md` are:

- Provenance

  - Expand overlay mapping segments into `ProvenanceEdge` instances.
  - Add offset-aware queries (source <-> overlay <-> TS, SSR <-> template).

- SSR reuse

  - Add SSR provenance ingestion surfaces.
  - Reuse stages 10-40 between overlay and SSR where possible (shared pipeline session or shared persisted caches).

- Span normalization

  - Normalize spans with `SourceFileId` or `DocumentUri` when indexing to avoid file-less spans crossing the program boundary.

- Language features

  - Flesh out `TemplateLanguageService` hover/defs/refs/completions/code actions/rename using `TemplateProgram.getQuery` plus provenance and TS integration.

- Caching and fingerprints

  - Expose and/or accept a program options fingerprint.
  - Align program-level cache invalidation with environment fingerprinting (tsconfig/resource graph/semantics).

## Migration hints

- Route open/change/close events to `SourceStore` and `TemplateProgram.upsertTemplate` / `closeTemplate`. Host code SHOULD stop calling `compileTemplate*` directly.
- Diagnostics should come from `TemplateLanguageService.getDiagnostics(uri)` (and use the `.all` field).
- Overlay/SSR access should go through `TemplateBuildService.getOverlay` / `getSsr`, and mapping through `TemplateProgram.getMapping` or `ProvenanceIndex`.
- For LSP hosts, introduce a `SourceStore` adapter over `TextDocuments`, then gradually move feature entrypoints from direct `compileTemplate*` calls to program-level APIs.
