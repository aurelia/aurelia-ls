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

- `paths.ts`
  Canonical `DocumentUri` helpers plus overlay/SSR path conventions (normalized to forward slashes + `SourceFileId`).

- `provenance.ts`
  Edge contracts and an in-memory `ProvenanceIndex`. Overlay mappings are canonicalized (URIs + `SourceFileId` on spans), expanded into expression/member edges, and exposed through offset-aware queries plus convenience lookups.

- `program.ts`
  Default program with a per-document compilation cache guarded by snapshot content hash + program `optionsFingerprint` (versions are tracked for bookkeeping). URIs are canonicalized on entry, overlay mapping is fed into `ProvenanceIndex`, and `optionsFingerprint` is exposed for hosts to detect option drift. Cache/provenance invalidation hooks, bulk overlay/SSR builds, and cache stats are available for hosts that want to observe reuse.

- `services.ts`
  Language/build facades. Diagnostics merge compiler and overlay TypeScript diagnostics via provenance and surface host-agnostic spans; overlay/SSR access is wired. Hover, definitions, and references map template offsets through provenance and TS quick info/definitions; completions/code actions/rename remain stubbed.

## Key assumptions

- Options (semantics, resource graph, parsers, overlay base name, fingerprints) are stable for the lifetime of a program; if they change, create a new instance (use `TemplateProgram.optionsFingerprint` to detect drift cheaply).
- Stage keys follow the current pipeline: `10-lower`, `20-resolve-host`, `30-bind`, `40-typecheck`, `50-plan-overlay`, `60-emit-overlay` plus SSR plan/emit.
- `TemplateMappingArtifact` lacks an overlay path; callers must pass the overlay URI when ingesting mappings into provenance.
- Program-level caches rely on normalized `DocumentUri` + snapshot content hash + `optionsFingerprint`. Stage-level caches remain responsible for their own content hashing.

## TODOs / gaps

The main deltas compared to `docs/agents/program-architecture.md` are:

- SSR provenance and reuse

  - SSR mappings (HTML + manifest) are ingested into provenance; continue tightening span coverage as SSR emit evolves.
  - Core stages (10-40) are reused across overlay and SSR via program-level seeds; richer telemetry and single-session reuse are still on the table.

- Language features

  - Flesh out `TemplateLanguageService` hover/defs/refs/completions/code actions/rename using `TemplateProgram.getQuery` plus provenance and TS integration.

## Migration hints

- Route open/change/close events to `SourceStore` and `TemplateProgram.upsertTemplate` / `closeTemplate`. Host code SHOULD stop calling `compileTemplate*` directly.
- Diagnostics should come from `TemplateLanguageService.getDiagnostics(uri)` (and use the `.all` field).
- Overlay/SSR access should go through `TemplateBuildService.getOverlay` / `getSsr`, and mapping through `TemplateProgram.getMapping` or `ProvenanceIndex`.
- For LSP hosts, introduce a `SourceStore` adapter over `TextDocuments`, then gradually move feature entrypoints from direct `compileTemplate*` calls to program-level APIs.
