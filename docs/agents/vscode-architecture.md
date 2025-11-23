# VS Code / LSP Architecture (Normative)

> This document is a **goal architecture** for agents.
> It describes how the VS Code extension (client + server) SHOULD be structured
> around the domain `TemplateProgram` + TS services to support a rich UX.

It is **prescriptive**, not a postmortem. Agents SHOULD treat it as normative
when refactoring the client/server or adding new features.

---

## 1. Scope & Goals

This doc covers:

- The **VS Code extension** (client package).
- The **Language Server** (server package).
- Their integration with the **domain layer** (`TemplateProgram`, resource graph,
  provenance, overlay/SSR products, etc.).

High-level goals:

- One **coherent pipeline** from user edits -> diagnostics / nav / refactors,
  shared by:
  - LSP features (hover, completions, defs/refs, rename, code actions).
  - Overlay / typechecking views.
  - SSR previews.
- **Project-wide semantics**:
  - Discover Aurelia resources (custom elements/attributes, converters, etc.)
    from the **TS project**, not hardcoded lists.
- A **clean layering**:
  - Client: VS Code UI, commands, status, previews.
  - Server: LSP protocol + project services (TemplateWorkspace + TS index).
  - Domain: compiler, `TemplateProgram`, provenance, products.

---

## 2. Topology Overview

Normative components:

- **Client** (`packages/client`):
  - `AureliaLanguageClient` - starts/stops the LSP server.
  - Commands (overlay, mapping, template info, SSR preview, dump state).
  - `StatusService` - status bar integration.
  - `VirtualDocProvider` - overlay virtual documents.

- **Server** (`packages/server`):
  - LSP shell (`main.ts`) - JSON-RPC, document lifecycle, feature wiring.
  - **TemplateWorkspace** (conceptual):
    - Wraps a domain `TemplateProgram` + `TemplateLanguageService` +
      `TemplateBuildService` (only entrypoint; no `compileTemplate*` fallbacks).
    - Adapts LSP `TextDocuments` to domain `SourceStore`.
  - **TsService** - TS language service (project, checker, completions, defs).
  - **OverlayFs** - virtual FS for overlays (TS sees them as files).
  - **AureliaProjectIndex** - TS-backed project crawler:
    - Builds `ResourceGraph` + `Semantics` from the TS program.
    - Provides a **resource fingerprint** for program recreation.

- **Domain** (`packages/domain`):
  - `TemplateProgram` (+ `SourceStore`, `ProvenanceIndex`).
  - `TemplateLanguageService`, `TemplateBuildService`.
  - Compiler pipeline & products (overlay, SSR, mapping, query).

The server is the **only** layer that knows about TS, VS Code LSP, and
TemplateProgram at the same time. The client only speaks LSP.

---

## 3. Server Architecture

### 3.1 LSP Shell (`main.ts`)

Responsibilities:

- Create the LSP `connection` and `TextDocuments` manager.
- Instantiate:
  - `PathUtils`
  - `OverlayFs`
  - `TsService`
  - `TemplateWorkspace` (see below)
  - `AureliaProjectIndex`
- Wire **LSP lifecycle**:
  - `onInitialize` -> configure workspace root, call `AureliaProjectIndex.refresh`.
  - `onDidOpen` / `onDidChangeContent` / `onDidClose` -> forward to
    `TemplateWorkspace` (`open` / `change` / `close`).
- Implement **LSP feature handlers** (diagnostics, hover, completions, defs,
  refs, rename, code actions) by delegating to:
  - `TemplateLanguageService` (for template semantics).
  - `TsService` + provenance (for view-model symbols).

**LSP shell MUST NOT**:

- Call `compileTemplate*` directly.
- Reimplement mapping/provenance logic (use TemplateProgram + language/build services).
- Reach into TS or domain internals beyond the facades.

---

### 3.2 TemplateWorkspace (Server-side facade)

TemplateWorkspace is a **server-local** abstraction (not exported by domain).
It sits on top of a single `TemplateProgram` instance and provides:

- Document lifecycle wired to LSP:

  ```ts
  open(uri: string, text: string, version: number): void;
  change(uri: string, text: string, version: number): void;
  close(uri: string): void;
```

* Accessors for domain services:

  ```ts
  getProgram(): TemplateProgram;
  getLanguageService(): TemplateLanguageService;
  getBuildService(): TemplateBuildService;
  ```

* Diagnostics entrypoint:

  ```ts
  getDiagnostics(uri: string): CompilerDiagnostic[];
  ```

Construction:

* Takes **immutable options**:

  * `resourceGraph`, `semantics`
  * `vmReflectionFactory` (from server heuristics)
  * `cacheOptions`, `fingerprints`, etc.

* Internally:

  * Owns a `SourceStore` adapter that wraps `TextDocuments`.
  * Owns a `ProvenanceIndex` for mappings, SSR, etc.
  * Owns a `TemplateProgram` wired to that `SourceStore` and `ProvenanceIndex`.
  * Owns `TemplateLanguageService` + `TemplateBuildService` created from the program.

**Workspace invariants**:

* Options are **stable** for its lifetime. When they change, a **new**
  TemplateWorkspace MUST be created.
* `TemplateWorkspace` is the **only** way the LSP shell talks to TemplateProgram
  (no legacy CompilerService shim).

---

### 3.3 TsService & OverlayFs

Existing services are re-interpreted as:

* **TsService** - project / TS LS host:

  * Provides `getService(): ts.LanguageService`.
  * Exposes `getProjectVersion()` for configuration drift.
  * Exposes `compilerOptions()` and config loading logic.

* **OverlayFs** - a virtual FS backing TS LS:

  * `upsert(fileAbs, text)` stores overlay text + increments a version.
  * `snapshot(fileAbs)` returns overlay snapshots.
  * `fileExists` / `readFile` check overlays first, then disk.
  * `listScriptRoots()` returns TS root file names (including overlays).

Normative contract:

* `OverlayFs` MUST NOT generate overlays itself. It only serves what
  `TemplateBuildService.getOverlay` gives it (or SSR via `getSsr`).
* TsService MUST treat overlays as first-class files and allow module resolution
  across them.

---

### 3.4 TS Project Index & Resource Discovery

The missing piece you pointed out lives here.

Introduce **`AureliaProjectIndex`** with responsibilities:

* **Inputs**:

  * Access to `TsService` (Program + TypeChecker).
  * Workspace root / tsconfig paths.
  * Aurelia detection rules (decorators, conventions).

* **Outputs**:

  * A domain `ResourceGraph`.
  * A `Semantics` instance configured from that graph.
  * A **resource fingerprint** (string) summarizing:

    * tsconfig path / compiler options.
    * TS root file list (or module graph hash).
    * Discovered resource descriptors.

* **API** (goal shape):

  ```ts
  interface AureliaProjectIndex {
    refresh(): Promise<void>; // recompute graph + semantics
    currentResourceGraph(): ResourceGraph;
    currentSemantics(): Semantics;
    currentFingerprint(): string;
  }
  ```

Implementation sketch:

* `refresh()`:

  * Gets `program = tsService.getService().getProgram()`.
  * Uses `program` + `checker` to:

    * Discover classes with Aurelia decorators/config.
    * Build resource descriptors (tag name, file, bindables, etc.).
  * Feeds descriptors into a domain helper that constructs `ResourceGraph` +
    `Semantics`.
  * Computes a fingerprint over config + descriptors.

* LSP shell uses the fingerprint to decide when to create a **new**
  `TemplateWorkspace` (and thus a new TemplateProgram).

**Important**:

* `TemplateProgram` does not crawl the workspace or talk to TS.
* All Aurelia resource knowledge in the program comes from the
  `ResourceGraph` / `Semantics` snapshot that `AureliaProjectIndex` provides.

---

### 3.5 Overlay & SSR Integration

The server exposes **custom requests** (what exists today, but refactored):

* `aurelia/getOverlay`:

  * Calls `TemplateBuildService.getOverlay(uri)`.
  * Returns `{ overlayPath, text, mapping }`.

* `aurelia/getSsr`:

  * Calls `TemplateBuildService.getSsr(uri)`.
  * Returns `{ htmlPath, htmlText, manifestPath, manifestText }`.

Diagnostics & navigation:

* `TemplateLanguageService` gives **template diagnostics** and semantic query:

  * `getDiagnostics(uri)` -> compiler diagnostics.
  * `getHover`, `getCompletions`, `getDefinition`, etc. (template-phase).

* `TsService` + provenance + mapping provide **view-model** diagnostics and nav:

  * Map HTML position -> overlay span (via `ProvenanceIndex` / mapping).
  * Ask TS LS for symbol info.
  * Map TS result back to template via provenance.

---

## 4. Client Architecture

### 4.1 Language Client & Activation

Client responsibilities:

* Start/stop the LSP process using `AureliaLanguageClient`:

  * Resolve server module (respecting `AURELIA_LS_SERVER_PATH` override).
  * Use IPC transport (run/debug modes).
  * Document selector: `**/*.html`.

* Register:

  * `VirtualDocProvider` (overlay scheme).
  * Commands.
  * Notification handlers (e.g. `aurelia/overlayReady`).

Client MUST NOT:

* Implement its own analysis or mapping.
* Talk to TS directly.

### 4.2 Commands & UI Surfaces

Commands (current + future):

* `aurelia.showOverlay` - shows overlay TS as virtual document.
* `aurelia.showOverlayMapping` - renders mapping artifacts as markdown.
* `aurelia.showTemplateInfo` - template query debug view.
* `aurelia.showSsrPreview` - open SSR HTML + manifest.
* `aurelia.dumpState` - debug; logs LS state.

Plus potential future surfaces:

* CodeLens (e.g. "Go to component", "SSR preview").
* Inline hints (bindable types, `$index` etc.).

All of these MUST use LSP requests/notifications, not internal server APIs.

### 4.3 Status Bar & Diagnostics UX

* `StatusService` shows coarse pipeline status:

  * Idle.
  * "overlay (calls X, diags Y)".
  * In future: errors / degraded mode.

Status MUST react to server notifications (e.g. `overlayReady`), not poll.

---

## 5. End-to-End Flows (Target)

### 5.1 Open / Change / Close

**Client**:

* VS Code fires didOpen/didChange/didClose -> LSP.

**Server**:

* LSP shell:

  * Updates `TextDocuments`.
  * Calls `TemplateWorkspace.open/change/close`.

* TemplateWorkspace:

  * Forwards to `SourceStore.set/delete` (inside TemplateProgram).
  * Drops cached compilation for that URI.
  * Next request lazily triggers compilation via TemplateProgram.

---

### 5.2 Diagnostics

**Server**:

* On open/change:

  * `TemplateWorkspace.getDiagnostics(uri)`:

    * TemplateProgram runs compiler pipeline.
    * Domain returns compiler diagnostics.

  * Build overlay via `TemplateBuildService.getOverlay(uri)`.

  * TsService builds TS diagnostics for the overlay.

  * Map TS diagnostics back to template via provenance/mapping.

  * Merge and send LSP diagnostics.

---

### 5.3 Hover / Completions / Defs / Refs / Rename

**Core pattern**:

1. Map `{ uri, position }` to `offset` via `TextDocument`.

2. Use `TemplateLanguageService`:

   * `getHover`, `getCompletions`, etc. for template-only context.
   * When view-model info is needed, ask TemplateProgram's provenance layer for
     overlay/TS location.

3. For view-model:

   * Use `ProvenanceIndex` to get overlay span(s).
   * Use `TsService` to call LS APIs.
   * Map TS results back to template via provenance.

LSP shell MUST use these services; it MUST NOT:

* Reimplement mapping in terms of raw `TemplateMappingArtifact`.
* Bypass TemplateProgram for template semantics.

---

## 6. Testing Plan (Server + Client)

This section tells agents **what to test** and **where to put it**.

Tests MUST follow repo conventions in `docs/agents/appendix-testing.md`.

### 6.1 Layout

Target structure:

* `packages/server/test/unit/...`
* `packages/server/test/integration/...`
* `packages/client/test/...` (optional, lighter-weight)

Use `.mjs` tests with the same harness style as `packages/domain/test`.

### 6.2 Server Unit Tests

**Goal**: small, fast tests for individual services.

Suggested files:

* `packages/server/test/unit/path-utils.test.mjs`

  * `PathUtils.normalize/canonical` behavior (case-sensitive vs insensitive).

* `packages/server/test/unit/overlay-fs.test.mjs`

  * `upsert`, `snapshot`, `fileExists`, `readFile` precedence over disk.
  * Version increments.

* `packages/server/test/unit/ts-service-host.test.mjs`

  * `getScriptFileNames`, `getScriptSnapshot`, `fileExists` for overlay vs disk.
  * Module resolution behavior with overlays.

* `packages/server/test/unit/template-workspace.basic.test.mjs`

  * Construct a TemplateWorkspace with a fake `TemplateProgram` (test double).
  * Verify `open/change/close` calls into SourceStore.
  * Verify `getDiagnostics` calls Program once per version and caches.

* `packages/server/test/unit/project-index.discovery.test.mjs`

  * Using a fixture TS program (mock or real), ensure AureliaProjectIndex:

    * Finds decorated custom elements/attributes.
    * Builds resource descriptors.
    * Produces stable fingerprints.

These unit tests SHOULD use **small fixtures** under `fixtures/server/*` and
avoid spinning up the LSP server.

---

### 6.3 Server Integration Tests (LSP)

**Goal**: assert full pipelines (LSP -> TemplateProgram -> TS -> LSP).

Suggested harness:

* In-process LSP connection using `vscode-languageserver` (no real VS Code).
* A helper like `createServerHarness(fixtureRoot)` that:

  * Constructs the same services as `main.ts`.
  * Exposes helpers for:

    * `openHtml(uri, text)`
    * `requestDiagnostics(uri)`
    * `requestHover(uri, position)`
    * `requestDefinition(uri, position)`
    * `requestCustom("aurelia/getOverlay", ...)` etc.

Suggested files:

* `packages/server/test/integration/diagnostics-basic.test.mjs`

  * Fixture: simple Aurelia project.
  * Open HTML -> expect:

    * Compiler diagnostics aligned with domain tests.
    * TS diagnostics mapped back via overlay.

* `packages/server/test/integration/hover-and-definitions.test.mjs`

  * Hover on a binding -> shows TS type of the bound property.
  * Go-to definition from template -> lands in the TS view-model.

* `packages/server/test/integration/overlay-request.test.mjs`

  * Request `aurelia/getOverlay`:

    * Overlay path matches naming convention.
    * Text equals domain overlay output.
    * Mapping passes basic round-trip assertions.

* `packages/server/test/integration/ssr-request.test.mjs`

  * Request `aurelia/getSsr`:

    * HTML/manifest match domain SSR fixtures.
    * Basic SSR manifest structure sanity checks.

* `packages/server/test/integration/resource-discovery.test.mjs`

  * Fixture TS project with several custom elements/attributes.
  * Ensure `AureliaProjectIndex` discovers them and that:

    * Template completions include custom tags.
    * Diagnostics/use sites respect the discovered resources.

---

### 6.4 Client Tests / Smoke Checks

Client code is thin; focus on **smoke tests**:

* `packages/client/test/activation-smoke.test.mjs`

  * Mock `AureliaLanguageClient` and ensure `activate`:

    * Creates logger, status, virtual docs.
    * Registers commands and providers.
    * Hooks up `overlayReady` notification.

* `packages/client/test/commands-overlay.test.mjs`

  * Fake language client that returns canned `aurelia/getOverlay` result.
  * Run `aurelia.showOverlay` and assert:

    * A virtual document is opened with expected content (can be via a stub).

If full VS Code extension tests are desired, they can later live under
`packages/client/test/e2e` using the VS Code test runner, but that is
**optional** for the initial architecture push.

---

### 6.5 Alignment with Domain Tests

Server and client tests SHOULD build on existing domain fixtures:

* Reuse `fixtures/overlays/*` and `fixtures/ssr/*` where possible.
* For integration tests:

  * Use the same templates and TS files so that:

    * Domain tests assert pure compiler behavior.
    * Server tests assert end-to-end wiring.

Agents MUST NOT duplicate domain logic in server tests; they SHOULD assert that
the server faithfully exposes domain behavior over LSP.

---

## 7. Implementation & Migration Notes

When refactoring towards this architecture, agents SHOULD:

1. **Introduce TemplateWorkspace** and wire `main.ts` to it,
   but keep existing `CompilerService` as an implementation detail temporarily.
2. Add **AureliaProjectIndex** and make TemplateWorkspace construction depend on
   its `resourceGraph` / `semantics` / fingerprint.
3. Gradually replace:

   * Direct `compileTemplate*` calls with `TemplateProgram`/`TemplateWorkspace`.
   * Ad-hoc mapping helpers in the server with provenance-based queries.
4. Add tests alongside each refactor:

   * Unit tests when introducing new services.
   * Integration tests when replacing end-to-end flows.

This doc is the target model; if a change diverges, the change SHOULD either
update this doc or be rejected.
