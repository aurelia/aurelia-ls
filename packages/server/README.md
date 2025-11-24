# packages/server

LSP host for Aurelia templates. Wires the domain compiler/program layer to VS Code/Language Server clients, manages TypeScript overlays, discovers project resources, and mirrors open documents into the compiler’s SourceStore.

## LSP entrypoint (`src/main.ts`)
- Creates the LSP connection, TextDocuments manager, and a lightweight logger.
- Boots core services: `PathUtils`, `OverlayFs`, `TsService` (TypeScript LS + tsconfig loading), `TsServicesAdapter` (domain TypeScriptServices bridge), `VmReflectionService` (companion VM type probe), `AureliaProjectIndex` (resource discovery/scoping), and `TemplateWorkspace` (compiler/program facade).
- On initialize: configure TypeScript host (tsconfig), ensure prelude d.ts overlay, build project index/semantics, create workspace.
- On open/change: sync project index + workspace, mirror document into TemplateProgram, materialize overlay (compile + upsert into TS host), run diagnostics, and notify the client (`aurelia/overlayReady` with meta).
- Provides custom RPCs: `aurelia/getOverlay`, `aurelia/getMapping`, `aurelia/queryAtPosition`, `aurelia/getSsr`, `aurelia/dumpState`.
- LSP features (completion/hover/defs/refs/rename/code actions) delegate to `TemplateLanguageService`, mapping template spans to LSP ranges and projecting edits back to workspace URIs.
- Watches tsconfig/jsconfig changes to reload TS configuration and re-fingerprint the workspace.

## Template workspace orchestration
- `TemplateWorkspace` wraps `DefaultTemplateProgram` plus `DefaultTemplateLanguageService`/`DefaultTemplateBuildService`, sharing a SourceStore and ProvenanceIndex. Maintains an options fingerprint; reconfigures when semantics/TypeScript fingerprints change while preserving document snapshots.
- `TemplateDocumentStore` keeps the program’s SourceStore in sync with LSP `TextDocument`s or disk reads; exposes open/change/close/upsert helpers.
- `VmReflectionService` tracks the active template and infers the companion VM instance type (favoring named class export, else default export) for overlay/typecheck typing; exposes synthetic prefix/display name.
- `TemplateLanguageService` calls flow through the `TsServicesAdapter` for TS features and through provenance/mapping for template offsets.

## TypeScript integration
- `TsService` owns a `ts.LanguageService` with overlay-aware host:
  - Loads tsconfig (or defaults), normalizes compiler options, tracks root files, and fingerprints config.
  - Holds `OverlayFs` for virtual files (prelude + generated overlays); overlays bump projectVersion and trigger LS recreation.
  - Provides snapshots, fileExists/readFile hooks, module resolution, and helpers like `tsSpanToRange`.
- `TsServicesAdapter` adapts the TypeScript LS to the domain’s `TypeScriptServices` contract: diagnostics, quick info, defs/refs, completions, rename, and code fixes, mapping TS spans to `TextRange`.
- `OverlayFs` stores virtual files and base roots; enumerates script roots for the TS host and falls back to disk for reads.
- `PathUtils` normalizes/canonicalizes paths with case-sensitivity awareness (mirrors `ts.sys.useCaseSensitiveFileNames`).

## Project index (resource discovery and scoping)
- `AureliaProjectIndex` consumes a TypeScript project (via `TsService`) and produces a Semantics + ResourceGraph snapshot plus a fingerprint used to reconfigure the workspace/program.
- Discovery pipeline (`project-index/discovery`):
  - `decorator-discovery.ts`: scans class declarations for Aurelia decorators (`@customElement`, `@customAttribute`, `@valueConverter`, `@bindingBehavior`, `@bindable`, `@containerless`, `@templateController`), merging decorator metadata with bindable members, canonicalizing names/aliases, and registering resources into `ResourceCollections` + descriptor list.
  - `convention-discovery.ts` and `di-registry-discovery.ts`: placeholders for future convention/DI-based discovery; currently return empty results.
  - Results are merged into a unified `DiscoveryResult` (resources + descriptors + registrations).
- Scoping (`project-index/scoping/scope-planner.ts`): merges discovered resources into base semantics, overlays scoped resources into/onto a ResourceGraph (clone or build from semantics), and sets default scope. Also diffs base vs discovered resources to overlay into the target scope. Outputs updated Semantics, ResourceGraph, and fingerprints used by the workspace.
- Fingerprinting (`project-index/fingerprint/fingerprint.ts`): stable stringification/hashing helpers for compiler options and discovery payloads.

## Auxiliary services
- `services/spans.ts`: utilities to map domain spans/diagnostics to LSP ranges.
- `services/types.ts`: logger interface used across services.

## Data/flow highlights
- Document open/change -> TemplateWorkspace upserts snapshot -> overlay compiled via TemplateProgram -> overlay text injected into `TsService` overlay FS -> diagnostics collected (template + TS) -> overlay ready notification.
- Project config or index changes -> re-fingerprint -> TemplateWorkspace reconfigures with new Semantics/ResourceGraph and TypeScript host, preserving SourceStore contents.
- TS-facing operations always ensure overlays are materialized/synced before querying (completions/hover/defs/refs/rename/code actions).
