# Provenance Refactor Milestones

A checklist to consolidate mapping/projection under `ProvenanceIndex`, standardize document identity, and remove ad‑hoc span math in services.

---

## Milestone 1: Provenance API

Goal: establish a **complete, documented surface** for cross‑document mapping.

- [x] Ensure `ProvenanceIndex` exposes:
  - [x] `lookupGenerated(uri, offset): OverlayProvenanceHit | null`
  - [x] `lookupSource(uri, offset): TemplateProvenanceHit | null`
  - [x] `projectGeneratedOffset(uri, offset): TemplateProvenanceHit | null`
  - [x] `projectGeneratedSpan(uri, span): TemplateProvenanceHit | null`
- [ ] If/when needed, add mirrored helpers for template → generated projection (e.g. `projectTemplateOffset/Span`) **inside provenance**.
- [x] Centralize edge selection and projection math:
  - [x] Prefer `overlayMember` over `overlayExpr`.
  - [x] Tie-break by overlap, then narrower span, then deeper member path.
  - [x] Implement proportional slicing for partial spans on overlay edges.
  - [x] Treat SSR `ssrNode` edges as direct node mappings (no slicing).
- [x] Unit tests for:
  - [x] overlayExpr edges.
  - [x] overlayMember edges (member paths, deeper specificity).
  - [x] ssrNode edges (HTML and manifest).
  - [x] Partial span projection (start/middle/end of an edge).

---

## Milestone 2: Document Identity

Goal: have **one canonical story** for “what document is this?” across compiler, program, and server.

- [ ] Standardize on `CanonicalDocumentUri` + `SourceFileId`:
  - [ ] All program/server code that crosses document boundaries uses `canonicalDocumentUri` to get `(uri, path, file)`.
  - [ ] Compiler code continues to use `normalizePathForId` / `SourceFileId` for internal identities.
- [ ] Ensure span/file normalization for overlay/SSR ingestion lives in provenance only:
  - [x] `addOverlayMapping` normalizes all `TemplateMappingArtifact.entries` spans to carry `file`.
  - [x] `addSsrMapping` normalizes all `SsrMappingArtifact.entries` spans to carry `file`.
  - [ ] No other layer re-normalizes mapping spans for cross-document work.
- [ ] Rename program-level `Origin`:
  - [x] Remove the unused `Origin` helper from `program/primitives.ts` to avoid collisions with compiler `Origin`.
  - [ ] Update program/server call sites to use `DocumentSpan` terminology (or add `DocumentOrigin` if we reintroduce one intentionally).
  - [x] Keep compiler `Origin`/`Provenance` unchanged and conceptually separate.

---

## Milestone 3: Consumers Migration

Goal: make **TemplateLanguageService** and friends thin adapters over provenance, not source‑map engines.

- [ ] Refactor `TemplateLanguageService` to use provenance for all cross‑document features:
  - [x] TS diagnostics (map overlay spans back to template).
  - [ ] Hover (overlay → template, and optionally template → overlay when jumping to TS).
  - [ ] Definitions & references (TS locations → template locations).
  - [ ] Rename (TS edits → template edits).
  - [ ] Completions (overlay replacement spans → template ranges).
  - [ ] Code actions (TS edits → template edits).
- [ ] Remove direct `TemplateMappingArtifact` scans in services:
  - [ ] Replace remaining ad-hoc helpers (e.g. `overlaySpanForEdit`, `overlaySpanForLocation`; legacy helpers like `projectOverlayOffset` are already removed) with provenance calls.
  - [ ] After migration, `TemplateLanguageService` should only “see” mappings indirectly through the provenance API and the query facade.
- [ ] Keep the remaining helpers **very small**:
  - [ ] `mapOverlaySpanToTemplate` and similar functions become trivial wrappers that:
    - Take TS spans/ranges.
    - Convert to `SourceSpan` with a file.
    - Delegate to provenance.
    - Convert back to LSP `TextRange`.

---

## Milestone 4: Query & Mapping Ownership

Goal: clarify who owns what between compiler, program, and server.

- [ ] Codify that:
  - [ ] `TemplateMappingArtifact` and `SsrMappingArtifact` are **products** of the compiler and the overlay/SSR planning pipeline.
  - [ ] `TemplateQueryFacade` is the **template‑only query surface** (nodeAt, bindablesFor, exprAt, expectedTypeOf).
  - [ ] `ProvenanceIndex` is the **only cross‑document mapping surface** (overlay/SSR ↔ template).
- [ ] For any new “expr/member at offset” or “jump between artifacts” feature:
  - [ ] First ask: “Is this template‑local?” → use `TemplateQueryFacade`.
  - [ ] Otherwise → add a provenance helper or use an existing one; **do not** re‑scan mapping artifacts.
- [ ] Keep direct access to `TemplateMappingArtifact` / `SsrMappingArtifact` limited to:
  - [ ] Compiler internals (mapping/query/build).
  - [ ] Program ingestion (provenance).
  - [ ] Debug / inspect commands that present the raw mapping as a dev tool.

---

## Milestone 5: Docs & Guardrails

Goal: ensure future work reuses this architecture instead of re‑inventing mapping logic.

- [ ] Update `AGENTS.md` to:
  - [ ] Call out provenance as the canonical mapping layer between overlay/SSR and templates.
  - [ ] Tell agents to treat mapping artifacts as products, not as lookup tables.
- [ ] Keep this appendix (`appendix-provenance.md`) up to date:
  - [ ] Document any new provenance API additions.
  - [ ] Document any new edge kinds or artifact types (e.g. future source‑component outputs).
- [ ] Document the canonical document handle:
  - [ ] `(uri: DocumentUri, path: NormalizedPath, file: SourceFileId)` is the thing to pass between layers.
  - [ ] No ad‑hoc normalization or homegrown URI classes.

---

## Milestone 6: Verification

Goal: prove the new architecture in tests and clear out legacy paths.

- [ ] Domain/unit tests:
  - [ ] Provenance projection tests for overlay and SSR mappings.
  - [ ] Template query tests remain green (no regression from moving mapping math to provenance).
- [ ] Program/language‑service tests:
  - [ ] Existing diagnostics/hover/defs/refs/rename/completions tests still pass but now rely on provenance internals.
  - [ ] Add focused tests for tricky cases:
    - Multiple member paths in a single expression.
    - Overlapping edges.
    - Partial selections and multi‑segment mappings.
- [ ] Server/client integration:
  - [ ] LSP integration tests confirm that:
    - TS diagnostics/quick info from overlays map back to the correct HTML positions.
    - Definitions/references/rename & code actions survive the refactor.
- [ ] Repo hygiene:
  - [ ] Spot‑check for remaining ad‑hoc span math in program/server/client code.
  - [ ] Replace or delete any helpers that duplicate provenance logic.
