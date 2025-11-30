# Provenance Appendix

Documents mapping/projection between templates and generated artifacts. Normative for anything that maps between templates and overlay/runtime artifacts.

---

## 1. Ownership

- `ProvenanceIndex` is the **only** source-map layer between generated artifacts and templates.
- `TemplateMappingArtifact` / `RuntimeMappingArtifact` are **products**:
  - Produced in `packages/domain` during synthesis.
  - Ingested into provenance.
  - Internal cross-document lookups go through provenance, not by scanning artifacts directly.
- Document identity uses:
  - `CanonicalDocumentUri` in `program/paths.ts`.
  - `SourceFileId` / `NormalizedPath` in `compiler/model/identity.ts`.
  - Always use these helpers; no ad-hoc normalization.

---

## 2. Provenance Model

Provenance is **edges** between `(uri, span)` pairs:

- Edge kinds:
  - `overlayExpr` - expression in overlay ↔ expression in template
  - `overlayMember` - member path segment in overlay ↔ segment in template
  - `runtimeExpr` - expression in runtime artifact ↔ expression in template
  - `runtimeNode` - runtime artifact node ↔ template DOM node

- Each edge has:
  - `from`: generated side (overlay, runtime code, manifest)
  - `to`: template side (HTML)
  - Optional `exprId` and/or `nodeId`
  - Optional `tag` for member edges (path string)

**Invariants:**

- All spans normalized with `SourceFileId` during ingestion.
- URIs canonicalized via `canonicalDocumentUri`.
- "Source" = authored HTML template; "Generated" = derived artifacts.

---

## 3. Provenance API

### Lookup

- `lookupGenerated(uri, offset)` - from generated → template
- `lookupSource(uri, offset)` - from template → generated

These are what services should call.

### Projection

- `projectGeneratedOffset(uri, offset)` / `projectGeneratedSpan(uri, span)`
- `projectGeneratedOffsetToDocumentSpan` / `projectGeneratedSpanToDocumentSpan`

### Edge Selection Rules

Selection priority (inside provenance, not callers):
1. Prefer member edges over expr edges
2. Larger overlap with query span
3. Narrower edge span (more specific)
4. For members, deeper path (longer tag)

Projection math:
- Strict containment: map whole span to whole span
- Partial overlap: proportional slicing, clamped to target
- Runtime nodes: direct node mapping, no slicing

Callers must not reimplement these rules.

---

## 4. Consumer Rules

### Domain Layer

- Produces mapping artifacts during synthesis
- Does not know about `ProvenanceIndex`
- Emits artifacts; program layer ingests them

### Program Layer

- `DefaultTemplateProgram` ingests mappings:
  - `provenance.addOverlayMapping(templateUri, overlayUri, mapping)`
  - `provenance.addRuntimeMapping(templateUri, artifactUri, mapping)`
- `TemplateLanguageService` uses provenance for all cross-document projection

### Server/Client Layers

- Server talks to services, not provenance directly
- No direct artifact scanning except debug commands

---

## 5. Identity

- URIs: normalize via `canonicalDocumentUri`
- Paths: normalize via `normalizePathForId`, brand as `NormalizedPath`/`SourceFileId`
- Spans: normalized once during provenance ingestion
- Cross-layer identity: `(uri, path, file)` triple from `canonicalDocumentUri`

---

## 6. Testing

- Offset/span projection in both directions
- Edge selection priority and tie-breakers
- Partial span queries (start, middle, end of edge)
- No hard-coded overlay offsets in tests; describe behavior in template positions
