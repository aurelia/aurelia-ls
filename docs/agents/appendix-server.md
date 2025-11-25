# Server Appendix (`packages/server`)

`packages/server` is the LSP host for Aurelia templates. It wires the domain compiler/program layer to editors via LSP, hosts the TypeScript language service, manages overlays, discovers Aurelia resources, and mirrors open documents into the compiler's `SourceStore`.

---

## 1. Role

`packages/server` is responsible for:

- Creating and managing the LSP connection and `TextDocuments`.
- Hosting the TypeScript language service with overlay-aware file system (`TsService`, `OverlayFs`).
- Discovering Aurelia resources (decorators, future conventions/DI) and building `Semantics` + `ResourceGraph` snapshots (`AureliaProjectIndex`).
- Maintaining a `TemplateWorkspace` that wraps the domain program and services for the current project configuration.
- Serving LSP features (completion, hover, definitions, references, rename, code actions) and custom RPCs (`aurelia/getOverlay`, `aurelia/getMapping`, `aurelia/queryAtPosition`, `aurelia/getSsr`, `aurelia/dumpState`).

It is the only place that should know about both:

- LSP / client protocols, and
- TypeScript LS hosting and Node/FS details.

---

## 2. Responsibilities vs non-responsibilities

### 2.1 Responsible for

**LSP hosting**

- `src/main.ts`:
  - Connection setup, `TextDocuments`, logging.
  - Initialize/shutdown lifecycle, capability advertisement.
  - Document open/change/close handling.

**TypeScript integration**

- `TsService`:
  - tsconfig loading, compiler options normalization, root files, project fingerprint.
  - Overlay-aware `ts.LanguageService` host (project version bump, LS recreation).
- `OverlayFs`:
  - Virtual files (prelude + overlays), base roots, script root enumeration.
- `TsServicesAdapter`:
  - Adapts TS LS to the domain's `TypeScriptServices` contract (diagnostics, quick info, defs/refs, completions, rename, code fixes).

**Project index (Aurelia resources)**

- `AureliaProjectIndex`:
  - Consumes a TS project via `TsService`.
  - Runs discovery (`decorator-discovery.ts`, with future `convention-discovery.ts` and `di-registry-discovery.ts`).
  - Produces `Semantics` + `ResourceGraph` snapshots plus a fingerprint for workspace configuration.

**Template workspace**

- `TemplateWorkspace`:
  - Wraps `DefaultTemplateProgram`, `TemplateLanguageService`, `TemplateBuildService` from `packages/domain`.
  - Shares a `SourceStore` + `ProvenanceIndex`.
  - Maintains an options fingerprint based on TS config and Semantics/ResourceGraph; reconfigures when these change while preserving document snapshots.
- `TemplateDocumentStore`:
  - Syncs LSP `TextDocument`s or disk reads into the program's `SourceStore`.
- `VmReflectionService`:
  - Infers companion VM type for templates (named class export or default export) and provides synthetic type prefixes for overlay/typecheck.

**LSP features and custom RPCs**

- Standard LSP features:
  - Completion, hover, definitions/references, rename, code actions.
  - All implemented by delegating to `TemplateLanguageService` and mapping back to template ranges/URIs.
- Custom RPCs:
  - `aurelia/getOverlay`, `aurelia/getMapping`, `aurelia/queryAtPosition`, `aurelia/getSsr`, `aurelia/dumpState`.

### 2.2 Not responsible for

- Template syntax, IR, binding/typechecking rules, overlay/SSR emit internals -> `packages/domain`.
- VS Code UI, commands, virtual document providers -> `packages/client`.
- Generic editor APIs outside LSP.
- Any logic that depends on framework-agnostic template semantics being aware of specific user projects; those semantics live in `packages/domain` and are parameterized by `Semantics`/`ResourceGraph`.

---

## 3. Internal structure

Treat `packages/server` as two sub-layers.

### 3.1 Environment layer (TS + FS)

Modules:

- `TsService`
- `OverlayFs`
- `PathUtils`
- `TsServicesAdapter`

Responsibilities:

- Host the TypeScript LS with overlay support.
- Load tsconfig/jsconfig and maintain a TS config fingerprint.
- Provide `fileExists`, `readFile`, `getScriptFileNames`, `getScriptSnapshot`, `resolveModuleNames`, etc.
- Normalize/canonicalize paths (case sensitivity, URI <-> path).

Constraints:

- No Aurelia-specific semantics (no bindables/resources/scopes).
- No direct LSP types or protocol wiring.

### 3.2 Projection layer (Aurelia + LSP)

Modules:

- `TemplateWorkspace`
- `TemplateDocumentStore`
- `VmReflectionService`
- `AureliaProjectIndex` (+ discovery/scoping)
- LSP handlers in `src/main.ts` for features and custom RPCs.

Responsibilities:

- Discover Aurelia resources from the TS project and build `Semantics` + `ResourceGraph` snapshots (and their fingerprints).
- Configure `TemplateWorkspace` with:
  - TS options fingerprint,
  - Semantics/ResourceGraph fingerprint,
  - Shared `SourceStore` and `ProvenanceIndex`.
- Mirror open/change/close events into the program.
- Compile overlays/SSR for templates and keep them synced into TS via `OverlayFs`.
- Delegate template-aware features to `TemplateLanguageService` and map ranges to LSP coordinates.

Constraints:

- Uses domain public APIs only (`DefaultTemplateProgram`, `TemplateLanguageService`, contracts).
- Does not reference VS Code APIs directly (only LSP types).

---

## 4. Core flows

These flows are the contracts that must stay stable.

### 4.1 Initialization

On `initialize` in `src/main.ts`:

1. Create `PathUtils`, `OverlayFs`, `TsService`, `TsServicesAdapter`, `VmReflectionService`, `AureliaProjectIndex`.
2. Load tsconfig/jsconfig, normalize compiler options, compute TS config fingerprint.
3. Create or update prelude `.d.ts` overlay in `OverlayFs`.
4. Use `AureliaProjectIndex` to build initial `Semantics` + `ResourceGraph` and their fingerprint.
5. Construct `TemplateWorkspace` with:
   - TS config fingerprint,
   - Semantics/ResourceGraph fingerprint,
   - Shared `SourceStore` + `ProvenanceIndex`.
6. Advertise LSP capabilities and custom Aurelia RPCs.

### 4.2 Document open/change

On `textDocument/didOpen` or `didChange`:

1. **Project/semantics sync**
   - Re-run `AureliaProjectIndex` if TS config or project files have changed.
   - If TS config or Semantics/ResourceGraph fingerprint changed:
     - Reconfigure `TemplateWorkspace` with updated fingerprints while preserving `SourceStore` contents.

2. **Document mirror**
   - Use `TemplateDocumentStore` to upsert the document snapshot into the program's `SourceStore` (URI, content, version).

3. **Compile overlay**
   - Ask `TemplateWorkspace`/program to compile the overlay for this template.
   - Upsert the overlay text into `OverlayFs` and notify `TsService` (project version bump / LS refresh if needed).

4. **Diagnostics**
   - Collect template diagnostics from domain (link/bind/typecheck stages).
   - Collect TS diagnostics for the overlay via `TsServicesAdapter`.
   - Publish diagnostics to the client (normal LSP diagnostics).

5. **Notify**
   - Send `aurelia/overlayReady` with counts/meta for status/commands.

### 4.3 LSP features

For completion/hover/definitions/references/rename/code actions:

1. Ensure overlay for the target template is compiled and injected into TS (`TemplateWorkspace` + `TsService`).
2. Call `TemplateLanguageService` through `TemplateWorkspace`:
   - Map template offset -> overlay span -> TS locations using provenance.
   - Invoke TS LS via `TsServicesAdapter`.
   - Project results back to template offsets and URIs through provenance/mapping.
3. Shape results into LSP protocol types and return.

Do not call `ts.LanguageService` directly for template-aware features; always go through `TemplateLanguageService`.

### 4.4 Custom RPCs

RPCs like `aurelia/getOverlay`, `aurelia/getMapping`, `aurelia/queryAtPosition`, `aurelia/getSsr`, `aurelia/dumpState` should:

- Use `TemplateWorkspace` / domain program to:
  - Retrieve overlay text,
  - Retrieve mapping artifacts (`TemplateMappingArtifact`, `SsrMappingArtifact`),
  - Run template queries,
  - Dump internal state as needed.
- Return stable, documented payload shapes that `packages/client` can depend on.

---

## 5. Change patterns

### 5.1 Project discovery and scoping

For new resource discovery (for example, conventions, DI registries):

1. Extend discovery modules under `project-index/discovery`:
   - For example, implement `convention-discovery.ts`, `di-registry-discovery.ts`.
2. Merge results into `DiscoveryResult` and feed them into scoping (`scope-planner.ts`).
3. Update fingerprints so that changes in discovery inputs trigger a new Semantics/ResourceGraph fingerprint.
4. Confirm `TemplateWorkspace` respects the new fingerprint and reconfigures correctly.

Keep resource semantics encoded in domain (`Semantics`, `ResourceGraph`); the index only discovers/feeds data into that model.

### 5.2 New LSP features

For a new template-aware LSP feature or change to an existing one:

1. Add or extend queries/services in `packages/domain` if semantics or mapping behaviour needs to change (for example, new data exposed in `TemplateQueryFacade` or `TemplateLanguageService`).
2. In `packages/server`:
   - Wire a new LSP handler in `src/main.ts` if it is a new method, or adjust existing handlers.
   - Call into `TemplateWorkspace` / `TemplateLanguageService` for data.
   - Map to LSP types; avoid introducing Aurelia semantics directly in the handler.

### 5.3 New or changed custom RPCs

When adding or modifying custom RPCs:

1. Locate the LSP handler in `src/main.ts` and associated service code.
2. Implement logic using:
   - `TemplateWorkspace`,
   - Program APIs,
   - Domain contracts (`TemplateMappingArtifact`, `SsrMappingArtifact`, queries).
3. Keep payload shapes stable and documented for `packages/client`.

### 5.4 TS/overlay plumbing changes

If changing how TS sees overlays:

1. Keep all TS LS host logic inside `TsService`, `OverlayFs`, and `TsServicesAdapter`.
2. Ensure overlay file naming/path conventions stay consistent with domain (`compiler/path-conventions.ts` + program path derivation).
3. Update config and overlay fingerprints to trigger correct LS/Workspace reconfiguration.

---

## 6. Testing

Prefer a mix of unit and integration tests.

**Unit tests**

- `TsService`:
  - tsconfig handling, overlay insertion, project version changes, module resolution.
- `OverlayFs`:
  - Virtual file behaviour, script roots, fallback to disk.
- `AureliaProjectIndex`:
  - Decorator discovery, scoping behaviour, fingerprints.

**Workspace tests**

- `TemplateWorkspace` + `TemplateDocumentStore`:
  - Simulate open/change/close and assert:
    - Overlays compiled,
    - Overlays injected into `TsService`,
    - Diagnostics produced from domain + TS.

**LSP integration tests**

- Start the server, open a small Aurelia project, and assert:
  - Completions, hover, defs/refs, rename behave as expected.
  - Custom RPCs return expected shapes for overlay/mapping/SSR.

Tests here should not depend on VS Code APIs; those live in `packages/client`.

---

## 7. Checklist for server changes

Before considering changes in `packages/server` done:

1. **Layering**
   - [ ] No imports from `vscode` or client-only APIs.
   - [ ] All TypeScript LS usage goes through `TsService`/`TsServicesAdapter`.
   - [ ] No Aurelia semantics duplicated in handlers; they come from domain (`Semantics`, `ResourceGraph`, queries).

2. **Incremental model**
   - [ ] TS config changes update fingerprints and reconfigure `TemplateWorkspace` correctly.
   - [ ] Semantics/ResourceGraph changes update fingerprints and trigger reconfiguration.
   - [ ] No new long-lived global state outside intended services and caches.

3. **Overlay/SSR sync**
   - [ ] Document open/change still follows the pipeline:
     - index -> workspace update -> overlay compile -> overlay inject -> diagnostics -> `overlayReady`.
   - [ ] LSP feature handlers ensure overlays are materialized before calling TS.

4. **Contracts & tests**
   - [ ] Custom RPC payload shapes remain compatible or deliberately versioned.
   - [ ] Relevant unit/integration tests updated and passing.

If any item cannot be satisfied, adjust the design or explicitly document the limitation as a TODO for review.
