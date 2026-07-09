# VS Code Tests

Goal: keep the VS Code client test suite aligned with the presentation
architecture (FeatureGraph, QueryClient, ServiceRegistry).

Structure:
- `core/`: infrastructure units (feature graph, query client, services, logger)
- `features/`: feature modules and command flows
- `integration/`: activation smoke (VS Code runner) + bundled server smoke
- `extension-host/`: opt-in VS Code Extension Development Host reliability tests
- `helpers/`: VS Code API stubs and test utilities

Guidelines:
- Tests import compiled output (`packages/vscode/out`) to match runtime shape.
- Features should call `ctx.queries`, not raw `ctx.lsp`.
- Avoid real filesystem/network; use stubs.
- Activation test runs under `@vscode/test-electron` (set `VSCODE_RUNNER=1`).
- Extension-host reliability tests launch real VS Code against a disposable
  copy of `fixtures/hello-world`: run `pnpm test:vscode:extension-host`.
  Keep this suite focused on client-boundary behavior that Vitest stubs cannot
  observe, such as multi-file edit application,
  undo/redo grouping, dirty state, and diagnostics after rollback.
