# runtime

`runtime` executes inquiry contracts against an in-memory world.

This is not a compatibility layer for old readers and not the default caller surface. It is the package-local implementation workbench used by the durable session daemon.

## Responsibilities

- [world.ts](world.ts) owns the static in-memory contract world.
- [engine.ts](engine.ts) validates and answers inquiries against that world.
- [api.ts](api.ts) exposes the in-memory inquiry API used inside the daemon.
- [lenses.ts](lenses.ts) contains implemented in-memory lenses over static contracts.
- [ts-lenses.ts](ts-lenses.ts) adapts the hot TypeScript source substrate and LanguageService into `ts.source`,
  `ts.structure`, and `ts.type` answers, including IDE primitives and read-only TypeScript edit plans.
- [bridge-lenses.ts](bridge-lenses.ts) adapts product bridge substrates such as `bridge.aulink` into exact inquiry
  answers. `bridge.aulink` now uses the daemon-prewarmed bridge index so exact product-to-framework target reads are
  cheap after startup.
- [framework-lenses.ts](framework-lenses.ts) exposes framework discovery seeds and the first framework rendering graph
  as first-class inquiry lenses so the long-running workbench can be navigated through Atlas itself. It reads the
  prewarmed framework discovery index for exact seed-anchor source candidates, source-bound flow seeds, precomputed
  framework flow call edges, exact call-site argument rows, grouped call targets, public observer-system, AppTask,
  router, expression, rendering structure entities, and rendering/binding rows. The first entity catalogs use the
  framework JSON cache as derived atom storage, while paging, filtering, evidence, and continuations remain projection
  work over the live runtime.

The first runtime lenses answer only contract-world questions. Thick TypeScript, product, and framework substrates plug
into this layer by satisfying the same inquiry and answer contracts. Runtime continuations may now carry route claims
from the inquiry navigation grammar so repeated local moves can be promoted into boot-time indexes instead of staying
hidden in lens implementation code.
