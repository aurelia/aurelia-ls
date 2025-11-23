# VS Code Implementation Plan (Rolling)

This checklist tracks progress against the goal architecture in
`docs/agents/vscode-architecture.md`. Start any session by skimming that doc
plus the current checkpoints here.

## Initial crawl pointers (always do these; not tracked as tasks)
- Read `docs/agents/vscode-architecture.md` for the normative target.
- Open `packages/server/src/main.ts`, `packages/server/src/services/*`, and
  `packages/domain/src/compiler/facade.ts` to refresh current wiring.

## Implementation checklist
- [ ] Harden TS host and Overlay FS
  - [ ] Load tsconfig and discover root files; expose `getProjectVersion`, `compilerOptions`, and `getService`.
  - [ ] Ensure overlays are first-class (module resolution, script roots, versioned snapshots).
  - [ ] Add unit tests: `packages/server/test/unit/overlay-fs.test.mjs`, `ts-service-host.test.mjs`.

- [ ] Introduce `AureliaProjectIndex`
  - [ ] Discover Aurelia resources from TS Program + checker; build descriptors.
  - [ ] Produce `ResourceGraph`, `Semantics`, and a resource/config fingerprint.
  - [ ] Expose `refresh/currentResourceGraph/currentSemantics/currentFingerprint`.
  - [ ] Add discovery unit tests with small TS fixtures.

- [ ] Align `TemplateWorkspace` to goal facade
  - [ ] Provide explicit `open/change/close` wired to LSP `TextDocuments`.
  - [ ] Own `SourceStore` + `ProvenanceIndex`; construct `TemplateProgram`/language/build services from index outputs.
  - [ ] Recreate workspace on fingerprint drift while preserving live snapshots.
  - [ ] Unit-test lifecycle/caching (`template-workspace.basic.test.mjs`).

- [ ] Rewire LSP shell (`packages/server/src/main.ts`)
  - [ ] Instantiate `PathUtils`, `OverlayFs`, `TsService`, `AureliaProjectIndex`, `TemplateWorkspace` from index data.
  - [ ] On initialize: load tsconfig, refresh index, ensure prelude.
  - [ ] On doc events: call workspace `open/change/close`; rebuild workspace on fingerprint change.

- [ ] Diagnostics and feature routing
  - [ ] Template diagnostics via `TemplateLanguageService`; overlay build via `TemplateBuildService`.
  - [ ] TS diagnostics via `TsService`, mapped back with provenance/mapping; send unified LSP diagnostics.
  - [ ] Hover/completions/defs/refs/rename/code actions: route through TemplateLanguageService + provenance-backed TS calls (no ad-hoc mapping in `main.ts`).

- [ ] Overlay/SSR custom requests
  - [ ] `aurelia/getOverlay` and `aurelia/getSsr` call `TemplateBuildService`; update `OverlayFs` only from build outputs.
  - [ ] Return overlay/SSR artifacts (paths, text, mapping, calls) per spec; respect current workspace fingerprint/index.

- [ ] Client alignment (`packages/client`)
  - [ ] Keep client LSP-only: `AureliaLanguageClient`, `VirtualDocProvider`, commands, status notifications.
  - [ ] Ensure commands map to updated server requests/notifications.
  - [ ] Add smoke tests: `activation-smoke.test.mjs`, `commands-overlay.test.mjs`.

- [ ] Integration tests (server)
  - [ ] Add in-process LSP tests for diagnostics, hover/defs/refs, overlay/SSR requests, and resource discovery using fixtures under `packages/server/test/integration`.

- [ ] Migration and clean-up
  - [ ] Remove legacy `CompilerService` shims once new wiring is live.
  - [ ] Keep types strong (no `any`), avoid touching generated `packages/**/out`.
