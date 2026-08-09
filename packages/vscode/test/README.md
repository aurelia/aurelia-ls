# VS Code Tests

Goal: keep the VS Code client tests aligned with concrete product owners:
workspace sessions, the typed LSP facade, feature-owned contributions, and
native VS Code presentation primitives.

Structure:
- `core/`: workspace/session ownership, protocol routing, lifecycle, and logging units
- `features/`: feature modules and command flows
- `integration/`: activation smoke (VS Code runner) + bundled server smoke
- `extension-host/`: opt-in VS Code Extension Development Host reliability tests
- `helpers/`: VS Code API stubs and test utilities

Guidelines:
- Tests import compiled output (`packages/vscode/out`) to match runtime shape;
  use the root `test:vscode` scripts, which build that output first.
- Custom protocol calls go through the typed `ctx.lsp` facade. Long-lived
  presenters own their own latest-wins sequencing rather than a generic query
  cache.
- Product contributions register once for the extension lifetime. Session
  changes update their request-time ownership and visible state; they do not
  dispose and recreate commands, providers, or views.
- Avoid real filesystem/network; use stubs.
- Activation test runs under `@vscode/test-electron` (set `VSCODE_RUNNER=1`).
- Extension-host reliability tests launch real VS Code against a disposable
  multi-root workspace containing `fixtures/hello-world` and an unowned plain
  TypeScript project. Run `pnpm test:vscode:extension-host` (or its explicit
  `:worker` alias) for the shipping-default Worker lane and
  `pnpm test:vscode:extension-host:ipc` for the forced-IPC control lane.
  Keep this suite focused on client-boundary behavior that Vitest stubs cannot
  observe, such as multi-file edit application,
  lazy code-action resolution, undo/redo grouping, dirty state, diagnostics
  after rollback, native-provider pass-through, live resource/definition projection,
  quiet configuration defaults, command/view activation, and workspace-root
  retirement. Set `AURELIA_LS_EXTENSION_HOST_GREP` to a Mocha grep pattern when
  iterating on one host journey.
- Extension-host E2E is the low-volume third layer of the IDE campaign. The
  semantic conformance matrix owns high-volume query truth and lane-harness
  owns medium-volume LSP projection, so do not reproduce either corpus here.
  Add a host journey when the expected result depends on VS Code state or API
  spending rather than on a single semantic answer.
