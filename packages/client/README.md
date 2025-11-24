# packages/client

VS Code extension host for the Aurelia language server. Bridges VS Code APIs to the server, manages the language client lifecycle, surfaces overlay/SSR artifacts, and exposes developer commands/status.

## Activation flow (`src/extension.ts`)
- Lazily constructs services (injectable for tests): `ClientLogger`, `StatusService`, `VirtualDocProvider`, and the `AureliaLanguageClient` wrapper.
- Starts the language client, registers the virtual document content provider, wires commands, and listens for `aurelia/overlayReady` notifications to update status and log payloads.
- Exposes `deactivate()` to dispose status and stop the client.

## Language client (`src/client-core.ts`)
- Resolves the server module path (env override `AURELIA_LS_SERVER_PATH`, then common build outputs under the extension root). Verifies existence before launching.
- Configures LSP server options (IPC transport with debug inspect), watches tsconfig/jsconfig for synchronization, and starts/stops the `LanguageClient` (document selector: HTML).
- Keeps a single `LanguageClient` instance; logs start/stop events.

## Commands (`src/commands.ts`)
- `aurelia.showOverlay`: fetch overlay via RPC, materialize as virtual doc (scheme `aurelia-overlay`), and open beside the template.
- `aurelia.showOverlayMapping`: fetch mapping artifact; when absent, falls back to overlay call sites; renders a markdown doc summarizing spans.
- `aurelia.showTemplateInfo`: queries at cursor for expr/node/controller/bindables/mapping size and displays a markdown summary.
- `aurelia.showSsrPreview`: fetches SSR HTML/manifest and opens both side by side.
- `aurelia.dumpState`: dumps server state to the client output channel.
- Helpers normalize active editor, extract overlay artifacts, and format spans/call sites.

## UI/diagnostics helpers
- `StatusService` shows a status bar item (idle/overlay ready with counts) and links to `aurelia.showOverlay`.
- `VirtualDocProvider` caches overlay text and serves it via a custom scheme for read-only viewing; exposes an update signal.
- `ClientLogger` wraps an OutputChannel with basic log/warn/error helpers.
- `vscode-api.ts` provides a `getVscodeApi()` indirection and `useVscodeApi` override for tests without the real VS Code runtime.

## Data contracts (`src/types.ts`)
- Lightweight client-side shapes for overlay/SSR responses, mapping entries/spans, overlay call sites, and `OverlayReadyPayload` used by status updates.

## Operational notes
- Overlay/SSR requests and template info route through custom RPCs exposed by the server; commands guard against missing active editors and surface errors via notifications.
- Overlays are displayed using the virtual document provider (no writes to disk), and server path resolution supports development overrides via environment variable.
