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

- [x] Align `TemplateWorkspace` to goal facade
  - [x] Provide explicit `open/change/close` wired to LSP `TextDocuments`.
  - [x] Own `SourceStore` + `ProvenanceIndex`; construct `TemplateProgram`/language/build services from index outputs.
  - [x] Recreate workspace on fingerprint drift while preserving live snapshots.
  - [x] Unit-test lifecycle/caching (`template-workspace.basic.test.mjs`).

- [x] Rewire LSP shell (`packages/server/src/main.ts`)
  - [x] Instantiate `PathUtils`, `OverlayFs`, `TsService`, `AureliaProjectIndex`, `TemplateWorkspace` from index data.
  - [x] On initialize: load tsconfig, refresh index, ensure prelude.
  - [x] On doc events: call workspace `open/change/close`; rebuild workspace on fingerprint change.

- [x] Diagnostics and feature routing
  - [x] Template diagnostics via `TemplateLanguageService`; overlay build via `TemplateBuildService`.
  - [x] TS diagnostics via `TsService`, mapped back with provenance/mapping; send unified LSP diagnostics.
  - [x] Hover/completions/defs/refs/rename/code actions: route through TemplateLanguageService + provenance-backed TS calls (no ad-hoc mapping in `main.ts`).
  - [x] Wire VM typing/reflection so template-to-VM definitions consistently land in the component (qualified root VM type, provenance).
  - [x] Ensure overlay member mapping drives defs/refs/rename: always emit member segments for property/interpolation lambdas in plan/emit, ingest into provenance (`overlayMember` edges), and have LS offsets prefer those segments over raw spans so template rename edits are produced alongside VM edits.
  - [x] Diagnostic UX: alias VM/overlay types to friendly names and scrub mapped TS messages to avoid noisy `typeof import(...)` unions.

- [x] Overlay/SSR custom requests
  - [x] `aurelia/getOverlay` and `aurelia/getSsr` call `TemplateBuildService`; update `OverlayFs` only from build outputs.
  - [x] Return overlay/SSR artifacts (paths, text, mapping, calls) per spec; respect current workspace fingerprint/index.

- [x] Client alignment (`packages/client`)
  - [x] Keep client LSP-only: `AureliaLanguageClient`, `VirtualDocProvider`, commands, status notifications.
  - [x] Ensure commands map to updated server requests/notifications.
  - [x] Add smoke tests: `activation-smoke.test.mjs`, `commands-overlay.test.mjs`.

- [x] Integration tests (server)
  - [x] Add in-process LSP tests for diagnostics, hover/defs/refs, overlay/SSR requests, and resource discovery using fixtures under `packages/server/test/integration`.

- [x] Migration and clean-up
  - [x] Remove legacy `CompilerService` shims once new wiring is live.
  - [x] Keep types strong (no `any`), avoid touching generated `packages/**/out`.
