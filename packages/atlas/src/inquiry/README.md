# Atlas inquiries

An [inquiry](inquiry.ts) names a lens, a locus and a projection. Filters and subjects narrow the question to a file, symbol or domain. The [lens catalog](lens-catalog.ts) defines the supported requests. The [runtime engine](runtime/engine.ts) validates and dispatches them. `createApi().map()` exposes the available surfaces through the full [session](../session/README.md).

Read an [answer](answer.ts) with its basis and evidence. Basis identifies the source of a claim and the scope over which it holds. An open seam records missing evidence. A typed continuation carries an inquiry that expands a row, follows a related declaration, or retrieves another page. [Basis](basis.ts) · [Evidence](evidence.ts) · [Continuations](continuation.ts)

A page can be smaller than the matched set. Check `page.total` and follow the emitted cursor before claiming a complete inventory. In paged row projections, `budget.rows` limits returned rows and `budget.evidencePerSubject` limits witnesses per returned row. Setting the latter to zero suppresses the evidence list. [Paging](paging.ts) · [Budget](budget.ts)

## Source provenance

The `product.architecture` field-provenance projection identifies source sites that construct provenance for product fields, including calls that expand through shared helpers. An authored field's edit target needs its own source span. Several generated fields can legitimately share a product's source. Follow the construction and its consumer to decide which precision a particular action needs. [Projection owner](runtime/product-architecture-kernel-records.ts)
