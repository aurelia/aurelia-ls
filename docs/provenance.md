Looking at this code in context, I don’t think you’re missing *lots* of pieces – you’re missing **one really central abstraction** and everything else is you (and Codex) compensating for that.

Right now you’ve got all the right primitives:

* **Stable identities**: ExprId / NodeId / FrameId / SourceFileId / UriString.
* **Span math**: TextSpan / SourceSpan + normalize/cover/offset/intersect.
* **IR & scopes**: DOM + instruction IR, expr table, scope graph (frames, expr→frame).
* **Overlay/SSR mappings**: TemplateMappingArtifact, SsrMappingArtifact.
* **Program-level projection**: InMemoryProvenanceIndex + TemplateLanguageService.

But there’s no *single*, obviously-owned concept of:

> “A document + spans + semantic IDs + cross-document edges.”

So mapping/provenance logic ends up being spread across:

* `compiler/model/source.ts` (file + spans),
* `compiler/expr-utils.ts` (expr span index + member segments),
* `compiler/mapping.ts` (HTML↔overlay mapping),
* `program/provenance.ts` (edges + projection),
* `program/services.ts` (extra mapping heuristics),
* plus a bit of ad-hoc stuff inside query/tests.

That’s what makes it feel “messy” and why Codex keeps re-inventing little bits instead of snapping into a clear core.

---

## 1. What you already have (and is actually quite good)

### 1.1 Identity & text coordinates

* `identity.ts` gives you branded IDs for everything that matters (ExprId, NodeId, FrameId, SourceFileId, NormalizedPath, UriString) and deterministic hashes for ExprId.
* `span.ts` gives pure span math, independent of files.
* `source.ts` then ties spans to files (`SourceFile` / `SourceFileId`) and normalizes/attaches file ids.

This lines up *really well* with the “Representation & identity” and “Text & position” sections in the language-tooling cheatsheet: stable IDs, line/offset separation, and file IDs are all there.

### 1.2 Semantic IDs & IR

* IR carries:

  * `DOMNode.loc?: SourceSpan | null` – template-level spans.
  * `ExprRef.loc?: SourceSpan | null` – authored expression spans.
  * Expression AST with `span: SourceSpan` (relative within the expression, file-less).
* Scope graph (`symbols.ts`) uses `FrameId` and `FrameOrigin & Provenance` (domain-level provenance for scoping/typecheck).

This gives you a clear semantic layer to hang mapping on: ExprId + NodeId + FrameId, which is very much in line with “stable symbol keys” in the cheatsheet.

### 1.3 Mapping & provenance

* **Domain side**:

  * `expr-utils.collectExprSpans` : ExprId → HTML SourceSpan.
  * `expr-utils.collectExprMemberSegments` : ExprId → [memberPath, member-span-in-HTML].
  * `mapping.buildTemplateMapping`:

    * Uses overlay emit mapping (ExprId → overlay TextSpan + overlay member segments),
    * Joins it with HTML spans/member segments,
    * Produces `TemplateMappingArtifact` entries: `(exprId, htmlSpan, overlaySpan, frameId, [member segments])`.
  * Query uses this mapping for `exprAt(offset)`.

* **Program side**:

  * `provenance.addOverlayMapping(templateUri, overlayUri, mapping)`:

    * Normalizes all spans to have file ids,
    * Expands each mapping entry into:

      * `overlayExpr` edge (overlay span ↔ template expr span),
      * `overlayMember` edges (overlay member span ↔ template member span).
  * `provenance.addSsrMapping` does the same for SSR (HTML/manifest ↔ template nodeId).
  * `InMemoryProvenanceIndex` then supports:

    * `lookupGenerated(uri, offset)` (overlay → template),
    * `lookupSource(uri, offset)` (template → overlay),
    * `projectGeneratedSpan` / `projectGeneratedOffset` (bi-directional span projection).

* `TemplateLanguageService` uses:

  * `TemplateQueryFacade` (+ mapping) for purely template features (hover over expressions/nodes, template completions).
  * `ProvenanceIndex` for all overlay/TypeScript remapping (TS diags, defs/refs, quick info, rename, code actions).

Conceptually this is already very “source map + provenance index”, exactly the pattern in the cheatsheet’s “Source maps & virtual documents” and “provenance across transformations” sections.

So the *pieces* are good. The problem is how many places participate.

---

## 2. Where it currently feels ad‑hoc / redundant

### 2.1 Document identity split across layers

You effectively have the same underlying string branded in three ways:

* `NormalizedPath` – canonical path.
* `SourceFileId` – same normalized path, branded for compiler.
* `DocumentUri` – same normalized path, branded for program.

And then two different “document handles”:

* `SourceFile` in the compiler (paths + id + hashKey).
* `CanonicalDocumentUri` in the program (uri + path + file).

They *do* line up, but the fact that the bridging logic is scattered (a bit in `source.ts`, a bit in `paths.ts`, a bit in `provenance.normalizeTemplateMapping`, etc.) makes it easy for Codex to nervously introduce new conversions instead of using a single obvious one.

### 2.2 Two separate “Origin” concepts with the same name

* Domain `compiler/model/origin.ts` – `Origin / Provenance` for diagnostics, with `kind`, `trace`, `derivedFrom`, etc.
* Program `program/primitives.ts` – a completely different `Origin { uri, span }`, used only as a tiny program-layer provenance marker.

They’re unrelated, but share the same name and live in adjacent layers. That’s a recipe for confusion (especially for an LLM).

### 2.3 Mapping vs provenance vs span indexes

You have *three* overlapping representations of “expression ↔ text ↔ overlay”:

1. **Expr span index**
   Map: ExprId → template SourceSpan (plus member segments from AST). (`ExprSpanIndex` + `collectExprMemberSegments`).

2. **TemplateMappingArtifact**
   List of entries: `(exprId, htmlSpan, overlaySpan, frameId, segments)`.

3. **Provenance edges**

   * `overlayExpr` edge per entry.
   * `overlayMember` edge per segment.

Then:

* `TemplateQueryFacade.exprAt` manually walks `TemplateMappingArtifact.entries` to find the narrowest segment at an HTML offset.
* `TemplateLanguageService.lookupOverlayHit` goes through `ProvenanceIndex.lookupSource` and then uses *both* provenance hit **and** a direct call to `program.getMapping(templateUri)` to find an overlay member span in some cases (via `overlayMemberSpan`).

So the logic is:

* sometimes we treat `TemplateMappingArtifact` as canonical,
* sometimes we treat `ProvenanceIndex` as canonical,
* sometimes we recombine both on the fly.

That’s the biggest “smell”: you clearly *want* one central mapping/provenance graph with query helpers, but the code got there incrementally.

### 2.4 “Overlay offset” heuristics sprinkled in services

In `TemplateLanguageService` you see little patches like:

```ts
private overlayOffsetForHit(hit, templateOffset, templateUri) {
  if (hit.edge.kind === "overlayMember") { /* pick center of member segment */ }
  if (hit.exprId) { /* find first member segment in mapping and pick center */ }
  return projectOverlayOffset(hit, templateOffset);
}
```

…and separate functions to:

* map overlay spans back to template (`mapOverlaySpanToTemplate`),
* compute overlay spans from TS locations/edits (`overlaySpanForEdit`, `overlaySpanForLocation`),
* expand overlay edits to template edits via provenance.

All of this *works*, but it’s quite a lot of ad-hoc projection logic living in `services.ts` instead of “the mapping/provenance layer”.

This is exactly the kind of thing Codex will happily duplicate (*“oh, we need to go from A to B again; let me re‑invent a projection helper…”*).

---

## 3. The “missing piece”: a single, owned *Document + Span + Edge* model

If I squint at everything through the lens of the language-tooling cheatsheet, you want something like:

> **A canonical “document coordinate” + a graph of edges between spans.**

You already *have* that in raw form:

* `CanonicalDocumentUri` = `{ uri: DocumentUri; path: NormalizedPath; file: SourceFileId; }`
* `SourceSpan` = `{ start; end; file?: SourceFileId }`.
* `ProvenanceEdge` = `{ kind; from: { uri, span, exprId?, nodeId? }; to: { ... } }`.

What’s missing is:

1. Treating `CanonicalDocumentUri` (or a tiny variant) as the **only** bridge between compiler and program layers for document identity.
2. Treating `ProvenanceIndex` as the **canonical source map** implementation, and putting the projection helpers (span/offset lookups, member-path-aware selection) *there*, not scattered across `mapping.ts` and `services.ts`.
3. Having a very small set of **query primitives** over that graph, so both `TemplateQueryFacade` and `TemplateLanguageService` call the same thing instead of each re‑implementing span lookups.

Concretely:

### 3.1 Canonical document handle

Define once (conceptually; you already have most of it):

```ts
interface DocumentHandle {
  uri: DocumentUri;
  path: NormalizedPath;
  file: SourceFileId;
}
```

* Compiler side:

  * `SourceFile.id` *is* `file`.
  * Its `normalizedPath` is `path`.
* Program side:

  * `canonicalDocumentUri` *already returns* `{ uri, path, file }`.

Then:

* All cross-layer APIs that accept a “file” should accept a `DocumentHandle` or a `SourceFileId` **plus** `DocumentUri`, not raw strings.
* `resolveSourceSpan`, `fallbackSpan`, etc. always go through this handle; there’s exactly one place that normalizes and brands.

This gives Codex a single, obvious thing to use whenever it needs a file identity.

### 3.2 ProvenanceIndex as “source map tree”

Right now, the mental story is:

* 60-emit-overlay → `OverlayEmitMappingEntry[]` (overlay-only spans).
* `buildTemplateMapping` → `TemplateMappingArtifact` (overlay+HTML).
* `InMemoryProvenanceIndex.addOverlayMapping` → `ProvenanceEdge[]` (edges overlay↔HTML).

I’d lean into that and *promote* `ProvenanceIndex` as the **single owned implementation of source-mapping** between documents:

* `TemplateMappingArtifact` stays as a **serialized product** for external hosts (client commands, debugging, scripts), but internal lookups should go via `ProvenanceIndex`.
* The “member path” logic already shows up as `overlayMember` edges with `tag = path`; that’s the right place for member-segment specificity to live.

Concretely, you can move logic from `query.ts` and `services.ts` into `ProvenanceIndex` as helpers:

```ts
// on ProvenanceIndex, or a tiny helper module that wraps it:
exprAtTemplateOffset(templateUri, offset): { exprId, span, frameId?, memberPath? } | null;
memberSegmentAtTemplateOffset(templateUri, offset): { exprId, memberPath, span } | null;
overlaySpanForExpr(templateUri, exprId): SourceSpan | null;
```

Under the hood, these would:

* Use existing edges (`lookupSource` / `findBySource`) with:

  * `edge.kind === "overlayMember"` for fine-grained segments,
  * `edge.kind === "overlayExpr"` as fallback.
* Leverage `edgePriority` + `memberSpecificity` (which you already wrote) to pick the best match.

Then:

* `TemplateQueryFacade.exprAt` could be implemented on top of **ProvenanceIndex** instead of manually scanning `TemplateMappingArtifact.entries`.
* `TemplateLanguageService.overlayMemberSpan` and `overlayOffsetForHit` can be deleted or simplified to use a single `overlaySpanForExpr` helper that, again, goes through `ProvenanceIndex`.

This centralizes all the “which span wins?” rules into one place and matches the “source map tree / projection” pattern from the cheatsheet.

### 3.3 Keep TemplateMappingArtifact as a *view*, not a second source of truth

TemplateMappingArtifact is still useful:

* It’s compact and easy to serialize.
* It’s exactly what `aurelia.showOverlayMapping` in the client wants to display.
* It’s convenient for manual debugging.

But internally:

* Treat it as the **input** to `addOverlayMapping`, nothing more.
* `TemplateProgram` can still expose `getMapping` for tooling, but other domain/program code should prefer `ProvenanceIndex` queries when they need to answer “what expression/member is at offset X?”.

That removes the current cycle where:

* mapping is used to build provenance,
* services then query both provenance *and* mapping.

---

## 4. Smaller cleanups that will reduce friction a lot

These are “little” things but they matter for letting Codex behave:

### 4.1 Rename the program-level Origin

In `program/primitives.ts`:

```ts
export interface Origin {
  readonly uri: DocumentUri;
  readonly span: SourceSpan;
}
```

This is not the same as `compiler/model/origin.ts`’s Origin. I’d rename it to something like:

```ts
export interface DocumentOrigin {
  uri: DocumentUri;
  span: SourceSpan;
}
```

or even fold it into the existing `DocumentSpan` in `services.ts` and drop the extra type entirely.

That removes one overloaded “Origin” and makes it clearer that **domain Origin** is for diagnostics/AST provenance, while **program provenance** is about cross-document mapping edges.

### 4.2 Strict boundaries for “who owns spans”

Right now, span utilities are spread:

* `span.ts` – pure math.
* `source.ts` – span + file.
* `expr-utils.ts` – HTML spans derived from IR.
* `mapping.ts` – normalizes mapping entry spans.
* `program/provenance.ts` – normalizes again when ingesting mapping.

I’d make the contract explicit:

1. **Compiler** guarantees:

   * Every `TemplateMappingEntry.htmlSpan` has a `file` set (template SourceFileId).
   * Every `TemplateMappingEntry.overlaySpan` is *file-less* and relative to the overlay document.
2. **ProvenanceIndex.addOverlayMapping** is the *only* place where overlay spans gain a `file` and are converted into `SourceSpan`.
3. All `resolveSourceSpan(...)` calls that deal with cross-document mappings live in **one** module (ideally `program/provenance.ts`), not in random services.

This is mostly documentation + a small amount of shuffling, but it gives Codex a clear rule: when you are working with cross-document spans, go via the provenance layer, not ad-hoc.

### 4.3 Collapse overlay-offset helpers

You currently have:

* `projectOverlayOffset(hit, templateOffset)` (pure function in `services.ts`).
* `overlayOffsetFromHit(hit, templateOffset)` (adds overlayMember special case).
* `overlayOffsetForHit(...)` (a method that mixes both, and also consults mapping directly).

After promoting provenance helpers as in 3.2, you can get away with essentially one:

```ts
// Given a template offset and a provenance hit, get the best overlay offset.
function overlayOffsetFromHit(hit: TemplateProvenanceHit, templateOffset: number): number
```

with the semantics you already encode:

* prefer member edges,
* otherwise project proportionally over the overlayExpr span.

And put that function next to `projectOverlaySpanToTemplateSpan` / `edgePriority` in `program/provenance.ts`, not in services.

---

## 5. How this helps your workflow with Codex

If we zoom back out to the Codex cheatsheet for a second: Codex-Max behaves best when there are **clear, stable “owner” modules** and **explicit rules** for how to use them.

For this area, after the refactor above, the story you can tell Codex (and later encode in AGENTS.md) is:

1. **Identity & text basics live in:**

   * `compiler/model/identity.ts` – all branded IDs.
   * `compiler/model/span.ts` – pure span operations.
   * `compiler/model/source.ts` – attach spans to files.

2. **Semantic IDs live in:**

   * `compiler/model/ir.ts` – ExprId + NodeId on IR.
   * `compiler/model/symbols.ts` – FrameId + scope graph.

3. **Mapping & provenance are owned by:**

   * `compiler/mapping.ts` – builds `TemplateMappingArtifact` + SSR mapping (domain-level product).
   * `program/provenance.ts` – ingests mapping and is the *only* way to project between template/overlay/SSR.

   Anything doing “span projection” must call into this layer.

4. **LSP / TS integration lives in:**

   * `program/services.ts` – but it only:

     * asks `TemplateProgram` for overlay/SSR builds,
     * asks `TemplateQueryFacade` for template-only info,
     * asks `ProvenanceIndex` for all cross-document mapping,
     * asks `TypeScriptServices` for TS facts.

That is exactly the sort of “architecture skeleton” Codex can respect once you encode it in AGENTS.md / package appendices.

---

### If you want a next concrete step

If you’d like, in a follow-up we can:

* Draft a tiny design doc for this “Document + Span + Edge” model (something like `docs/program/provenance.md`).
* Sketch the minimal code moves:

  * A couple of new helper methods on `ProvenanceIndex`,
  * Deleting some duplication from `services.ts`,
  * Tightening the contract of `buildTemplateMapping` and `addOverlayMapping`.
* Then encode the rules in AGENTS.md so Codex stops growing extra mapping utilities in random places.

But at a conceptual level: **the missing piece is not a new data structure so much as “treat provenance as the single source map layer, and give it first-class query helpers”**. Once you do that and standardize document identity around `CanonicalDocumentUri` / `SourceFileId`, the rest of the complexity starts to fall away instead of accreting.
