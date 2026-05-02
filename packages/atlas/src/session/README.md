# session

`session` runs the inquiry API in a durable local daemon.

The daemon is not an external transport. It is a loopback workbench for hot state: TypeScript programs, checker state, TypeChecker-driven product snapshots, and framework evaluator caches can live here while scripts or Codex-facing tools ask the same inquiry API over a small line-delimited JSON protocol.

## Responsibilities

- [api.ts](api.ts) exposes the default session-backed API; every request auto-starts or reuses the daemon.
- [protocol.ts](protocol.ts) defines the daemon manifest and request/response contracts.
- [client.ts](client.ts) owns idempotent startup, probing, restart-on-build-hash-change, and shutdown.
- [daemon.ts](daemon.ts) hosts the in-memory inquiry API in an external process.
- [hash.ts](hash.ts) computes the compiled build-output hash used for restart decisions.
- [manifest.ts](manifest.ts) reads and writes the filesystem lease.
- [paths.ts](paths.ts) keeps runtime files under the repo ignored `.temp` area.

## Lifecycle

`createApi()` is the normal entrypoint. Each method calls `ensureInquirySession()` before forwarding the request, so callers do not need a separate startup step.

`createApi().orient()` is the intended first call for repo work. It returns status, the surface map, the `atlas.self`
maintenance answer, initial continuations, and a derived usage guide that names callable lenses, projections, request
lanes, open seams, first moves, source package roots, terrain ownership, and curated capability moves without requiring
the caller to inspect Atlas source. Richer API teaching stays behind follow-up inquiries such as `ts.type:guide`,
`framework.discovery:recipes`, and `atlas.self:recipes`, so the orientation answer can stay compact while still making
the TypeScript/IDE, framework cross-lens, and Atlas self-maintenance surfaces discoverable.

`ensureInquirySession()` computes the current build hash, probes the manifest, reuses a compatible daemon, asks an
incompatible daemon to shut down, or starts a new detached process from `dist/session/daemon.js`. The daemon prewarms
the auLink bridge index, framework discovery index, core framework entity catalogs, DI atoms, and materialization
routes before publishing its manifest. Those warm paths hydrate from the package-scoped JSON cache described in
[../framework/JSON-CACHE.md](../framework/JSON-CACHE.md) when its invalidation keys still match the live TypeScript
source basis. Entity catalog cache invalidation is scoped by catalog id, so most analyzer refactors should not force a
full entity-cache refill. Broader entity atom families and bundle admissions are warmed after manifest publication;
bundle admissions fill package-by-package so a cold evaluator pass does not make first startup unbounded. Cold startup
is singleflighted with an in-process pending promise plus an atomic
`.temp/atlas/session/startup.lock.json` lease so parallel callers wait for the first warmup instead of spawning
duplicate heavyweight daemons. Stale startup locks are removed when their owner process exits or when the startup
timeout expires.

The daemon writes a heartbeat into `.temp/atlas/session/session.json`, exits after an idle TTL, and exits if another daemon takes over the manifest. The transport binds to `127.0.0.1`; no auth token is used because the session is local-only and intended as a developer workbench.
