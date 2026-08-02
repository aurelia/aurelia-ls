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
- Tests import compiled output (`packages/vscode/out`) to match runtime shape.
- Custom protocol calls go through the typed `ctx.lsp` facade. Long-lived
  presenters own their own latest-wins sequencing rather than a generic query
  cache.
- Every feature activation returns all registrations and presenters it owns so
  session retirement can dispose them as one unit.
- Avoid real filesystem/network; use stubs.
- Activation test runs under `@vscode/test-electron` (set `VSCODE_RUNNER=1`).
- Extension-host reliability tests launch real VS Code against a disposable
  multi-root workspace containing `fixtures/hello-world` and an unowned plain
  TypeScript project: run `pnpm test:vscode:extension-host`.
  Keep this suite focused on client-boundary behavior that Vitest stubs cannot
  observe, such as multi-file edit application,
  lazy code-action resolution, undo/redo grouping, dirty state, diagnostics
  after rollback, native-provider pass-through, exact live resource transport,
  quiet configuration defaults, command/view activation, and workspace-root
  retirement. Set `AURELIA_LS_EXTENSION_HOST_GREP` to a Mocha grep pattern when
  iterating on one host journey.
- Extension-host E2E is the low-volume third layer of the IDE campaign. The
  semantic conformance matrix owns high-volume query truth and lane-harness
  owns medium-volume LSP projection, so do not reproduce either corpus here.
  Add a host journey when the expected result depends on VS Code state or API
  spending rather than on a single semantic answer.
