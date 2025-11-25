# Provenance Appendix

This appendix documents how mapping/projection is owned and consumed across the repo. It complements `AGENTS.md` and the domain appendix. It is **normative** for anything that maps between templates and generated artifacts (overlay TS / SSR HTML+manifest).

---

## 1. Ownership

- `ProvenanceIndex` is the **only** source‑map layer between generated artifacts and templates:
  - Overlay TS ↔ template HTML.
  - SSR HTML/manifest ↔ template HTML.
- `TemplateMappingArtifact` / `SsrMappingArtifact` are **products**:
  - Produced in `packages/domain` during overlay/SSR planning/emission.
  - Ingested into provenance.
  - Exposed for debugging/CLI/UI (e.g. `aurelia.showOverlayMapping`), but **internal cross‑document lookups go through provenance**, not by scanning these artifacts.
- Document identity crosses layers via:
  - `CanonicalDocumentUri` (`uri`, `path`, `file`) in `program/paths.ts`.
  - `SourceFileId` / `NormalizedPath` in `compiler/model/identity.ts`.
  - **Do not** introduce ad‑hoc URI/path normalization; always go through these helpers.

---

## 2. Provenance model

Provenance is expressed as **edges** between `(uri, span)` pairs with optional ids:

- Edge kinds:
  - `overlayExpr` – whole expression in overlay TS ↔ whole expression in template.
  - `overlayMember` – member path segment in overlay TS ↔ corresponding segment in template.
  - `ssrNode` – SSR HTML/manifest node ↔ template DOM node (by `NodeId`).
- Each edge has:
  - `from`: generated side (overlay TS, SSR HTML, SSR manifest).
  - `to`: template side (HTML).
  - Optional `exprId` and/or `nodeId`.
  - Optional `tag` for `overlayMember` (member path string).

**Invariants:**

- All spans on edges are **normalized** and carry a `file` (`SourceFileId`), set during ingestion.
- URIs on edges are **canonicalized** (`canonicalDocumentUri`) so callers never have to guess about casing or separators.
- “Source” vs “generated” is **semantic**:
  - “Source/template” = authored HTML template.
  - “Generated” = overlay TS file or SSR HTML/manifest derived from that template.

---

## 3. Provenance API (expected surface)

### 3.1 High‑level lookup

Offset‑based queries that pick the “best” edge for a point:

- From generated -> template:
  - `lookupGenerated(uri, offset): OverlayProvenanceHit | null`
- From template -> generated:
  - `lookupSource(uri, offset): TemplateProvenanceHit | null`

These are what **TemplateLanguageService** and the server should normally call.

### 3.2 Projection helpers

Span‑based projection when callers already have a span:

- Generated -> template:
  - `projectGeneratedOffset(uri, offset): TemplateProvenanceHit | null`
  - `projectGeneratedSpan(uri, span): TemplateProvenanceHit | null`
- Template -> generated:
  - Add mirrored helpers as needed (e.g. `projectTemplateOffset`, `projectTemplateSpan`) **inside provenance** rather than re‑implementing span math in services. Until then, higher‑level helpers (like `mapOverlaySpanToTemplate`) should be thin wrappers that delegate to provenance.
- `projectGeneratedOffsetToDocumentSpan` / `projectGeneratedSpanToDocumentSpan` return template‑side `DocumentSpan` directly; use them instead of re‑assembling hits in services.

### 3.3 Edge selection rules

Edge selection & projection logic lives **inside provenance**:

- Selection priority:
  1. Prefer `overlayMember` over `overlayExpr`.
  2. Among same-kind edges, prefer:
     - Larger overlap with the query span/offset.
     - Then narrower edge span (more specific).
     - For members, deeper/more specific `tag` (longer path).
- Projection math:
  - For strict containment, map the whole generated span to the whole template span.
  - For partial overlap, use **proportional slicing** within the edge and clamp to the target span.
  - For SSR, projection is straight node mapping: `nodeId` + template span; no proportional slicing.

Callers must **not** re-implement these rules.

Notes on normalization and tie-breaks:

- Overlay/SSR mappings are normalized **once** during provenance ingestion; spans get a `file` (`SourceFileId`) there. Do not re-normalize spans in services or callers.
- When selecting a projection anchor, `overlayExpr` vs `overlayMember` prefers `overlayExpr` if the generated span exactly matches the authored expression span; this equality is span-only (ignores file) to tolerate already-resolved spans. Partial slices still flow through `overlayMember` edges.

---

## 4. Consumer rules

### 4.1 Domain/compiler layer

- `TemplateMappingArtifact` / `SsrMappingArtifact` are built in `packages/domain`:
  - Overlay mapping: `compiler/mapping.ts` + overlay emit results.
  - SSR mapping: `compiler/products/ssr.ts` + SSR emit results.
- These artifacts are used **internally** to:
  - Build `TemplateQueryFacade` (template‑only queries: nodeAt, bindablesFor, exprAt, etc.).
  - Construct `TemplateMappingArtifact`/`SsrMappingArtifact` as products for program/provenance ingestion.
- Domain code must **not** know about `ProvenanceIndex`; it just emits mapping artifacts and products.

### 4.2 Program layer

- `DefaultTemplateProgram` is responsible for provenance ingestion:
  - Overlay: after overlay product is built, call `provenance.addOverlayMapping(templateUri, overlayUri, mapping)`.
  - SSR: after SSR product is built, call `provenance.addSsrMapping(templateUri, htmlUri, manifestUri, mapping)`.
- `TemplateLanguageService`:
  - Uses `TemplateQueryFacade` **only** for template‑local info (node/bindables/expected types).
  - Uses `ProvenanceIndex` for **all cross‑document projection**:
    - TS diagnostics, hover, definitions, references, rename, completions, code actions.
  - Does not scan `TemplateMappingArtifact` directly for span math (expr/member spans, overlay offsets, etc.).
  - Helpers like `mapOverlaySpanToTemplate`, `mapOverlayOffsetToTemplate`, `overlayOffsetForHit`, `overlayMemberSpan`, `overlaySpanForEdit` are **thin wrappers** and should gradually shrink to:
    - “Convert TS structures into `SourceSpan`.”
    - “Call provenance.”
    - “Convert `SourceSpan` back into LSP `TextRange`.”

### 4.3 Server/client layers

- The LSP server (`packages/server`) talks to:
  - `TemplateLanguageService` / `TemplateBuildService`.
  - Domain/compiler only via those services and the program/workspace.
- The VS Code client (`packages/client`) never bypasses provenance or domain:
  - Overlay/SSR/mapping views are obtained via server RPCs, which in turn use program services.
- No server/client code should read `TemplateMappingArtifact` or `SsrMappingArtifact` directly except:
  - Dev/inspect commands explicitly designed as debug views (e.g. “Show overlay mapping”), which still treat these as **read‑only products**.

---

## 5. Identity and normalization

- **URIs & paths**
  - Always normalize through `normalizeDocumentUri` / `canonicalDocumentUri` in the program layer.
  - In the compiler layer, normalize file-like strings through `normalizePathForId` and brand them as `NormalizedPath` / `SourceFileId`.
- **Spans**
  - Spans crossing document boundaries are normalized and given a `file` **once**, during provenance ingestion (`addOverlayMapping`, `addSsrMapping`).
  - `resolveSourceSpan` and `normalizeSpan` are still used locally inside the compiler/program, but **cross‑document span resolution must go through provenance** instead of being hand‑rolled in services.
- **Canonical document handle**
  - “The thing you carry around between layers” is `(uri: DocumentUri, path: NormalizedPath, file: SourceFileId)` from `canonicalDocumentUri`. All cross‑layer identity and caching should be based on this triple.

---

## 6. Terminology guardrails

- **Compiler provenance vs. program provenance**
  - `compiler/model/origin.ts` defines `Origin` / `Provenance` for compiler diagnostics and stage-level provenance (e.g. where a type error came from).
  - `program/provenance.ts` defines cross-document provenance between artifacts (overlay/SSR) and templates.
  - These are related but distinct concepts; do **not** reuse one in place of the other.
- **Program-level origins**
  - The old `Origin` helper in `program/primitives.ts` was removed; prefer `DocumentSpan` plus `CanonicalDocumentUri` (`uri`, `path`, `file`) when a location needs to cross program/server boundaries.
- **“expr/member at offset”**
  - If you need “which expression/member is under this offset?” and it involves overlay TS or SSR, you **must** go through provenance (`lookupSource` / `lookupGenerated` / `project*`).
  - Template‑only queries (expr at offset in HTML, without jumping to overlay or SSR) can go through `TemplateQueryFacade` directly.

---

## 7. Testing

- **Provenance unit tests**
  - Offset/span projection in both directions:
    - Generated → template (`overlayExpr`, `overlayMember`, `ssrNode`).
    - Template → generated (round‑trip behavior where applicable).
  - Edge selection:
    - Prefer member edges over expr edges.
    - Overlap + span length + member path specificity tie‑breakers.
  - Partial spans:
    - Queries that hit the start, middle, and end of an edge.
- **Language‑service tests**
  - Hover/diagnostics/defs/refs/rename/completions should assert behavior via provenance‑backed mappings:
    - No hard‑coded assumptions about overlay filenames or offsets.
    - No bespoke span math in tests; they should describe behavior in terms of **template positions**.
- **Integration smoke**
  - End‑to‑end tests (LSP server + client harness) should:
    - Open a template.
    - Trigger overlay/SSR builds.
    - Assert that TS diagnostics and quick info land on the correct HTML spans, using provenance as the mapping layer.
