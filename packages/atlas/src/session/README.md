# session

`session` runs the inquiry API in a durable local daemon.

The daemon is not an external transport. It is a loopback workbench for hot state: TypeScript programs, checker state, TypeChecker-driven product snapshots, and memoized framework evaluator state can live here while scripts or Codex-facing tools ask the same inquiry API over a small line-delimited JSON protocol.

## Responsibilities

- [api.ts](api.ts) exposes the default session-backed API; every request auto-starts or reuses the daemon.
- [protocol.ts](protocol.ts) defines the daemon manifest and request/response contracts.
- [client.ts](client.ts) owns idempotent startup, probing, restart-on-build-hash-change, and shutdown.
- [daemon.ts](daemon.ts) hosts the in-memory inquiry API in an external process.
- [hash.ts](hash.ts) computes the session compatibility hash used for restart decisions: Atlas build output plus the
  admitted TypeScript source-project epoch that the daemon keeps hot.
- [manifest.ts](manifest.ts) reads and writes the filesystem lease.
- [paths.ts](paths.ts) keeps runtime files under the repo ignored `.temp` area.

## Lifecycle

`createApi()` is the normal entrypoint. Each method calls `ensureInquirySession()` before forwarding the request, so callers do not need a separate startup step.

`createApi().orient()` is the intended first call for repo work. It returns status, the surface map, the `atlas.self`
maintenance answer, initial continuations, and a derived usage guide that names callable lenses, projections, request
lanes, package scripts, compact follow-up docs, open seams, first moves, source package roots, terrain ownership, and
curated capability moves without requiring the caller to inspect Atlas source. Richer API teaching stays behind follow-up inquiries such as
`ts.type:guide`, `framework.discovery:recipes`, and `atlas.self:recipes`, so the orientation answer can stay compact
while still making the TypeScript/IDE, framework cross-lens, and Atlas self-maintenance surfaces discoverable.

`product.vocabulary` is the first product-specific substrate lens. Ask it through `createApi().ask(...)` to read
semantic-runtime vocabulary definition rows, exact source usages, claim predicate signatures, and product-kind adjacency
expanded from those signatures while the vocabulary and kernel records are still co-evolving in a dirty worktree.

`atlas.self` is the Atlas maintenance lens. Use `classes` and `functions` before opening Atlas source when a refactor
needs source-pressure triage; class rows support `minLineCount`, `minMethodCount`, `minPropertyCount`, and `orderBy`
values such as `lineCount`, `methodCount`, and `propertyCount`, while function rows support `minLineCount` and
direct-call pressure filters such as `minCallCount`, `minUniqueCallTargetCount`, `orderBy: "lineCount"`,
`orderBy: "callCount"`, and `orderBy: "uniqueCallTargetCount"`. Use
`pnpm --filter @aurelia-ls/atlas pressure:self` when you want class, function, and high multi-axis pressure rows in one
terminal view. The script prints source line anchors when rows carry exact spans, so pressure triage can usually jump
directly into the relevant declaration.

`product.architecture` is the source-architecture counterpart for semantic-runtime work. Ask it for `summary`,
`areas`, `modules`, `dependencies`, `area-dependencies`, `cycles`, `declarations`, `classes`, `functions`,
`call-sites`, `call-dependencies`, `symbol-references`, `symbol-dependencies`, or `profile` when a product refactor
needs compact visibility into source-area coupling, import cycles, large modules, exported surfaces, implementation
bodies, exact import rows, checker-backed call flow, checker-backed runtime/type/value references, or cold build phase
costs before opening files. The `profile` projection accepts `includeCallSites` and `includeSymbols` so future
profiling can separate the structure lane from checker call-site and checker symbol-reference work. Use
`pathPrefix` when you want the same projections scoped to one semantic-runtime subtree or exact file without losing the
projection's ordering and paging behavior; source-file/source-range/package loci now apply that scoping automatically
for `product.architecture`. For pressure reads, prefer narrow numeric filters such as `minLineCount`,
`minCallSiteCount`, `minCrossAreaCallSiteCount`, `minFunctionSurfaceCount`, `minLargeFunctionCount`,
`minMethodCount`, or `minPropertyCount` over an invented score; those keep Atlas useful as a steering tool without
turning architecture work into pressure-matrix theatre. Use
`pnpm --filter @aurelia-ls/atlas pressure:product-architecture` for the bundled structure and function pressure view.
Class and function pressure rows print source line anchors when the architecture lane has exact spans. Use
`pnpm --filter @aurelia-ls/atlas profile:product-architecture` before adding daemon warmup or durable
projection caches; the profile script prints structure, core, symbol, and full lane phase timings with row counts.

`bridge.aulink` is the product-to-framework mirror. Its `mirror` projection can now be filtered with
`hasRoleEvidence` and `hasEmulationObligations` and ordered by `roleEvidence`, `emulationObligation`, or
`mirrorPressure`, which makes it a first stop for finding product anchors whose framework shape is present but whose
semantic role or emulation obligation is still weakly grounded.

`createApi().frameworkEmulationSymbolsReport()` is the named report endpoint for the StandardConfiguration/framework
emulation eyeball golden. It runs inside the same daemon-held source project as normal inquiries and returns
deterministic Markdown plus compact stats. The package script
`pnpm --filter @aurelia-ls/atlas report:framework-emulation` writes that Markdown to
`packages/atlas/workbench/emulation-symbols.md` so maintainers can re-run it and inspect the diff.

`ensureInquirySession()` computes the current session compatibility hash, probes the manifest, reuses a compatible
daemon, asks an incompatible daemon to shut down, or starts a new detached process from `dist/session/daemon.js`. The
hash intentionally changes when admitted TypeScript roots in Atlas, semantic-runtime, or the Aurelia framework checkout
change, because the daemon owns a fixed source epoch for its lifetime. Startup constructs the hot source project and
leaves framework projection answers on demand; do not add daemon projection warmup unless profiling shows a repeated
foreground query cannot be made cheap at its owning substrate. Cold startup is singleflighted with an in-process
pending promise plus an atomic
`.temp/atlas/session/startup.lock.json` lease so parallel callers wait for the first startup instead of spawning
duplicate heavyweight daemons. Stale startup locks are removed when their owner process exits or when the startup
timeout expires.

The daemon writes a heartbeat into `.temp/atlas/session/session.json`, exits after an idle TTL, and exits if another daemon takes over the manifest. The transport binds to `127.0.0.1`; no auth token is used because the session is local-only and intended as a developer workbench.
