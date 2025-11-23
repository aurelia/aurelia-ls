# VS Code Implementation Plan (Rolling)

This checklist tracks progress against the goal architecture in
`docs/agents/vscode-architecture.md`. Start any session by skimming that doc
plus the current checkpoints here.

## Initial crawl pointers (always do these; not tracked as tasks)
- Read `docs/agents/vscode-architecture.md` for the normative target.
- Open `packages/server/src/main.ts`, `packages/server/src/services/*`, and
  `packages/domain/src/compiler/program/*` to refresh current wiring.

## Implementation checklist
- [x] Harden TS host and Overlay FS
  - [x] Load tsconfig and discover root files; expose `getProjectVersion`, `compilerOptions`, and `getService`.
  - [x] Ensure overlays are first-class (module resolution, script roots, versioned snapshots).
  - [x] Add unit tests: `packages/server/test/unit/overlay-fs.test.mjs`, `ts-service-host.test.mjs`.
  - [x] Wire tsconfig reloads/project-version bumps into LSP lifecycle (config change/reload path).

- [ ] Introduce `AureliaProjectIndex`
  - Read `docs/template-lowering-and-binding.md` plus `packages/domain/src/compiler/language/registry.ts` and `packages/domain/src/compiler/language/resource-graph.ts` to align resource shapes/fingerprints.
  - [x] Discover Aurelia resources from TS Program + checker; build descriptors.
  - [x] Produce `ResourceGraph`, `Semantics`, and a resource/config fingerprint.
  - [x] Expose `refresh/currentResourceGraph/currentSemantics/currentFingerprint`.
  - [x] Add discovery unit tests with small TS fixtures.
  - [x] Implement decorator/convention-based crawler (custom elements/attributes, bindables, aliases) and thread into fingerprint.
  - [x] Map discovered resources into scoped `ResourceGraph` overlays when applicable.

- [ ] Align `TemplateWorkspace` to goal facade
  - [x] Provide explicit `open/change/close` wired to LSP `TextDocuments`.
  - [x] Own `SourceStore` + `ProvenanceIndex`; construct `TemplateProgram`/language/build services from index outputs.
  - [x] Recreate workspace on fingerprint drift while preserving live snapshots.
  - [x] Unit-test lifecycle/caching (`template-workspace.basic.test.mjs`).

- [x] Rewire LSP shell (`packages/server/src/main.ts`)
  - [x] Instantiate `PathUtils`, `OverlayFs`, `TsService`, `AureliaProjectIndex`, `TemplateWorkspace` from index data.
  - [x] On initialize: load tsconfig, refresh index, ensure prelude.
  - [x] On doc events: call workspace `open/change/close`; rebuild workspace on fingerprint change.

- [ ] Diagnostics and feature routing
  - [ ] Template diagnostics via `TemplateLanguageService`; overlay build via `TemplateBuildService`.
  - [ ] TS diagnostics via `TsService`, mapped back with provenance/mapping; send unified LSP diagnostics.
  - [x] Hover/completions/defs/refs/rename/code actions: route through TemplateLanguageService + provenance-backed TS calls (no ad-hoc mapping in `main.ts`).

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
