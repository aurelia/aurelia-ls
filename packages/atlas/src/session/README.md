# session

`session` runs the inquiry API in a durable local daemon.

The daemon is not an external transport. It is a loopback workbench for hot state: future TypeScript programs, checker state, product substrate snapshots, and framework evaluator caches can live here while scripts or Codex-facing tools ask the same inquiry API over a small line-delimited JSON protocol.

## Responsibilities

- [api.ts](api.ts) exposes the default session-backed API; every request auto-starts or reuses the daemon.
- [protocol.ts](protocol.ts) defines the daemon manifest and request/response contracts.
- [client.ts](client.ts) owns idempotent startup, probing, restart-on-build-hash-change, and shutdown.
- [daemon.ts](daemon.ts) hosts the in-memory inquiry API in an external process.
- [hash.ts](hash.ts) computes the compiled build-output hash used for restart decisions.
- [manifest.ts](manifest.ts) reads and writes the filesystem lease.
- [paths.ts](paths.ts) keeps runtime files under the repo ignored `.temp` area.

## Lifecycle

`createAtlasApi()` is the normal entrypoint. Each method calls `ensureInquirySession()` before forwarding the request, so callers do not need a separate startup step.

`createAtlasApi().orient()` is the intended first call for repo work. It returns status, the surface map, the `atlas.self` maintenance answer, and initial continuations while using the same daemon lifecycle as ordinary inquiries.

`ensureInquirySession()` computes the current build hash, probes the manifest, reuses a compatible daemon, asks an incompatible daemon to shut down, or starts a new detached process from `dist/session/daemon.js`.

The daemon writes a heartbeat into `.temp/atlas/session/session.json`, exits after an idle TTL, and exits if another daemon takes over the manifest. The transport binds to `127.0.0.1`; no auth token is used because the session is local-only and intended as a developer workbench.
