# Program Architecture Implementation Plan (Rolling)

Working log to drive the implementation of the normative spec in `docs/agents/program-architecture.md`.
Update the checkboxes as work lands; keep this file aligned with the source of truth spec.

## Baseline (current state)
- [x] Program primitives: `DocumentUri`/`DocumentSnapshot` plus `InMemorySourceStore` and `InMemoryProvenanceIndex` in `packages/domain/src/program`.
- [x] `DefaultTemplateProgram` orchestrates diagnostics/overlay/SSR queries with per-document `(uri, version)` caching and ingests overlay mapping into provenance.
- [x] `TemplateLanguageService` / `TemplateBuildService` scaffolds exist; only diagnostics/overlay/SSR are wired.
- [x] No option fingerprint exposure at the program level; cache invalidation assumes stable options per instance.
- [x] Provenance edges are not expanded; `findByGenerated/findBySource` ignore offsets.
- [x] Overlay and SSR do not share pipeline sessions; SSR provenance is not ingested.

## Workstreams and Tasks

### Identity, spans, and path conventions
- [x] Normalize spans when indexing provenance (attach `SourceFileId` or `DocumentUri`, keep UTF-16) and avoid storing raw host paths.
- [x] Centralize overlay/SSR path conventions (one module for overlay/SSR filenames) and make `TemplateProgram`/services depend on it.
- [x] Add helpers/adapters to enforce `DocumentUri` branding at host boundaries (LSP/CLI/TS host).

### Caching and fingerprints
- [x] Surface a program options fingerprint (opaque string/object) and thread option fingerprints into compilation calls.
- [x] Align program-level cache keys with stage fingerprints: guard `(uri, version)` with content hash + option fingerprint where persistence is possible.
- [x] Document option drift handling (when to recreate a program) and expose a cheap comparison hook for hosts.

### Provenance indexing and queries
- [x] Expand overlay mappings into `overlayExpr` edges; include `ExprId` + template spans for expression and interpolation segments.
- [x] Expand member-path segments into `overlayMember` edges for rename/refs/hover completeness.
- [x] Implement offset-aware queries: `findByGenerated`/`findBySource` should return only edges intersecting the offset, with helpers for overlay->template and template->overlay lookups.
- [x] Add SSR ingestion API (e.g., `addSsrMapping`) that emits `ssrNode` edges connecting SSR HTML/manifest spans to template `NodeId`/spans.
- [x] Provide convenience helpers on `ProvenanceIndex` for common lookups (overlay offset -> `{exprId, memberPath?}`, template offset -> `{exprId?, nodeId?}`) to avoid ad-hoc math in services.
- [x] Ensure provenance pruning on `closeTemplate` (drop edges/mappings/URIs for the document).

### Pipeline reuse and product generation
- [x] Share stages 10-40 between overlay and SSR when both are requested (single pipeline session or shared stage cache).
- [x] Keep SSR and overlay artifacts keyed by the same content hash + option fingerprint to avoid redundant recomputation across services.
- [x] Provide a hook to surface which stages were reused vs re-run (useful for host diagnostics/telemetry).

### TemplateProgram surface
- [x] Add explicit invalidation hooks and/or cache statistics for hosts to observe (cache hits, stage reuse, provenance entries).
- [x] Allow bulk build helpers (e.g., `buildAllOverlays`, `buildAllSsr`) that iterate `SourceStore` for workspace-wide operations without bespoke host loops.
- [x] Ensure `upsertTemplate/closeTemplate` update provenance and cache state atomically and are safe under concurrent host calls.

### Language and build services
- [x] Diagnostics: merge compiler + TS overlay diagnostics via provenance; return host-agnostic diagnostics with source/related spans.
- [x] Hover: use `TemplateProgram.getQuery` + provenance + TS quick info to surface expression/node info and member types.
- [x] Definitions/references: map template offsets to overlay/TS spans, ask TS LS, and map results back through provenance.
- [x] Completions: drive from scope graph + VM reflection + TS completions with provenance-backed span mapping.
- [x] Rename: use `overlayMember` edges + TS rename to produce template edits; guard against partial coverage.
- [x] Code actions: add quick fixes for common diagnostics once diagnostics are merged.
- [x] Build service: expose overlay/SSR artifacts with normalized paths and stable naming, ready for TS host consumption.

### Host integration and migration
- [x] Add `SourceStore` adapters for LSP `TextDocuments` and any CLI/build inputs; route open/change/close through `TemplateProgram`.
- [x] Replace remaining `compileTemplate*` usage in hosts with `TemplateProgram` + services; remove all legacy paths.
- [x] Wire TS overlay filesystem to consume overlays via `TemplateBuildService` (no direct pipeline calls) and respect naming conventions.
- [x] Introduce telemetry/logging hooks (optional) for cache hits, provenance density, and overlay/SSR materialization timing.
- [x] Complete migration playbook steps from program-architecture sec. 6.2 (replace legacy entry points):
  - Server now wraps `TemplateProgram` behind a `TemplateWorkspace` adapter that owns the shared `SourceStore`/provenance, keeps LSP documents in sync, and can recreate the program on option fingerprint drift.
  - Diagnostics/overlay/SSR flows run exclusively through program/build/language services (no facade fallbacks), with provenance-backed mapping preserved end-to-end.
  - TS host wiring continues to hydrate overlays from `TemplateBuildService`/`OverlayFs` under the shared naming conventions; legacy cache paths are removed from the LSP surface.
  - Added initial server-side workspace coverage; future smoke tests can build on the new adapter.

### Testing and fixtures
- [x] Establish a dedicated `packages/domain/test/program` suite for program/provenance/service integration (shared helpers for `SourceStore`, overlay/SSR naming, provenance fixtures). Migrate existing `facade` API/golden coverage onto this program-first harness and drop legacy-only variants.
- [x] Unit tests for `InMemorySourceStore`, provenance indexing/queries, and `DefaultTemplateProgram` cache invalidation.
- [x] Golden/fixture coverage for overlay + SSR artifacts (including path conventions and provenance edges).
- [x] Service-level tests for diagnostics mapping, hover/defs/refs/completions/rename, using provenance-backed queries.
- [x] Aggressive cleanup pass: remove/retire legacy host/back-compat scaffolding once program + services cover all entrypoints (no production rollback concerns). Targets: drop `compileTemplate*` host callsites (server `compiler-service.ts`, dump scripts), replace facade mapping helpers with provenance lookups, migrate/deprecate facade API tests in favor of program/service tests, and trim any "legacy coexistence" assertions.
