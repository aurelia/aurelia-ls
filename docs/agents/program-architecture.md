# Program Architecture – TemplateProgram Facade (Normative)

This document is **normative for agents**.

It describes the target architecture for moving from ad-hoc `compileTemplate*`
usage to a program layer built around:

- `TemplateProgram`
- `SourceStore`
- `ProvenanceIndex`

It is repo-agnostic and prescriptive. If current code disagrees with this
document, treat that code as **legacy or transitional**.

We use RFC-style language:

- MUST / MUST NOT: hard requirements for the target architecture.
- SHOULD / SHOULD NOT: strong recommendations.
- MAY: optional.

---

## 1. Problem and Goal

Historically, hosts (LSP, CLI, build tools, tests) call `compileTemplate*`
directly:

- Each host re-drives the pipeline independently.
- Provenance / mapping is rebuilt locally.
- Caching strategies diverge.
- TS / overlay / SSR behavior is inconsistent and hard to evolve.

This makes it hard to add new products (linting, docs, SSR) or to refactor the
pipeline without breaking callers.

### Goal

Introduce a long-lived `TemplateProgram` that:

- Owns document knowledge, pipeline caching, and provenance.
- Provides a single facade for all products:
  - diagnostics
  - overlay artifacts
  - SSR artifacts
  - semantic queries
  - mapping / provenance queries
- Gives hosts a simple, stable API and hides pipeline details.

### Core Invariants

Agents MUST preserve these invariants in the target design:

- **Pure phases**
  Compiler phases (lower, resolve, bind, typecheck, plan, emit) are pure
  functions of `(source, options)` and MUST NOT mutate inputs.

- **Stable options per program**
  A `TemplateProgram` instance is created with a fixed options environment
  (semantics, resource graph, parsers, VM reflection, cache knobs, etc.).
  If those options change, hosts MUST construct a new program.

- **Immutable snapshots**
  `SourceStore` exposes immutable `DocumentSnapshot`s. A snapshot’s `text` and
  `version` never change after creation.

- **No new ad-hoc top-level entrypoints**
  New high-level behavior MUST be exposed via `TemplateProgram` or services that
  wrap it. New calls to `compileTemplate*` from hosts are not allowed.

Legacy hosts MAY still call `compileTemplate*` while migration is in progress,
but that usage SHOULD be treated as temporary and targeted for removal.

---

## 2. Architectural Roles and Ownership

At a high level:

- Program layer owns knowledge and caches.
- Stores and indices own data.
- Services own questions.
- Hosts and adapters own I/O.

### 2.1 TemplateProgram

`TemplateProgram` is the central orchestration object for a project or workspace.

Responsibilities:

- Track known documents by `DocumentUri`.
- Pull text from `SourceStore`.
- Drive the pipeline and cache stage outputs per document.
- Ingest provenance into `ProvenanceIndex`.
- Expose product and query APIs, for example:

  ```ts
  getDiagnostics(uri): TemplateDiagnostics
  getOverlay(uri): OverlayArtifact | CompileOverlayResult
  getSsr(uri): SsrArtifact | CompileSsrResult
  getQuery(uri): TemplateQueryFacade
  getMapping(uri): TemplateMappingArtifact | null
````

Constraints:

* MUST NOT know about LSP protocol details, CLI flags or file watching.
* MUST NOT own the TS language service or overlay filesystem.
* MUST NOT read the filesystem directly (it works only with URIs and snapshots).

### 2.2 SourceStore

`SourceStore` is the only abstraction that owns document text from the program’s
point of view.

Interface:

```ts
interface SourceStore {
  get(uri: DocumentUri): DocumentSnapshot | null;
  set(uri: DocumentUri, text: string, version?: number): DocumentSnapshot;
  delete(uri: DocumentUri): void;
  all(): Iterable<DocumentSnapshot>;
}

interface DocumentSnapshot {
  uri: DocumentUri;
  version: number; // monotonic per-document counter
  text: string;
}
```

Semantics:

* `version` is a monotonic numeric counter per document. It MAY correspond to
  host versions but does not have to.
* `get(uri)` MUST return `null` when the document is unknown; it MUST NOT throw.
* The program treats snapshots as opaque. It does not care whether edits were
  incremental or full; it only sees final text + version.

Caching:

* Stage-level cache keys SHOULD be based on content hash + option fingerprints
  (see section 5).
* Program-level caches MAY use `(uri, version)` as a guard, as long as stage
  caches remain safe.

Transitional rule:

* In early migrations, using `(uri, version)` alone for program-local caches is
  acceptable if:

  * caches are in-memory only, and
  * programs are recreated when options change.
* Persistent caches MUST use content hashes and fingerprints (see 5.1).

Hosts that currently use their own document store (for example, LSP
`TextDocuments`) SHOULD adapt that store to the `SourceStore` interface rather
than bypassing it.

### 2.3 ProvenanceIndex

`ProvenanceIndex` is the central cross-artifact mapping index.

It connects:

* Template IR: `ExprId`, `NodeId` and authored `SourceSpan`s.
* Overlay artifacts: TS overlay ranges and member segments.
* SSR artifacts: HTML and manifest nodes.
* External tools: TS diagnostics and positions.

#### Edge Model (Target)

Provenance is expressed as edges between two ends:

```ts
type ProvenanceKind =
  | "overlayExpr"   // overlay TS span <-> template expression span
  | "overlayMember" // overlay TS member path <-> template member span
  | "ssrNode"       // SSR span <-> template node span
  | "custom";       // reserved for tooling/plugins

interface ProvenanceEdgeEnd {
  uri: DocumentUri;
  span: SourceSpan;  // UTF-16 offsets, [start, end)
  exprId?: ExprId;
  nodeId?: NodeId;
}

interface ProvenanceEdge {
  kind: ProvenanceKind;
  from: ProvenanceEdgeEnd; // generated side
  to: ProvenanceEdgeEnd;   // authored/template side
  tag?: string;
}
```

#### Ingestion

The program feeds provenance via two primary mechanisms:

* Overlay:

  ```ts
  provenance.addOverlayMapping(templateUri, overlayUri, TemplateMappingArtifact);
  ```

  Target behavior:

  * MUST expand mapping entries into `overlayExpr` edges (expression-level).
  * SHOULD also expand member segments into `overlayMember` edges
    (member-path-level).

* SSR:

  A corresponding API (for example, `addSsrMapping`) MUST eventually connect SSR
  nodes (HTML/manifest) to `NodeId` and template spans using `ssrNode` edges.

Transitional allowance:

* Early implementations MAY store the mapping and URIs only and ignore edges,
  but they MUST keep the `ProvenanceIndex` API stable so consumers can migrate
  without changing call sites.

#### Queries

Minimum required queries:

```ts
findByGenerated(uri, offset): ProvenanceEdge[]
findBySource(uri, offset): ProvenanceEdge[]
```

On top of these, helper functions MAY provide higher-level queries, such as:

* overlay offset -> `{ exprId, memberPath? }`
* template offset -> `{ exprId?, nodeId?, memberPath? }`
* nodeId -> SSR node refs
* SSR offset -> `nodeId`

Normative rule:

* Hosts and services MUST NOT perform their own ad-hoc offset math between
  template, overlay, TS, or SSR.
* All template <-> overlay <-> SSR <-> TS mappings MUST go through:

  * `ProvenanceIndex`, or
  * a small set of canonical mapping helpers in the compiler domain.

### 2.4 Language and Build Services

On top of `TemplateProgram`, we define thin domain services.

Example: `TemplateLanguageService`:

* `getDiagnostics(uri)`
* `getHover(uri, position)`
* `getCompletions(uri, position)`
* `getDefinition(uri, position)`
* `getReferences(uri, position)`
* `renameSymbol(uri, position, newName)`
* `getCodeActions(uri, range)`

Example: `TemplateBuildService`:

* `getOverlay(uri)`
* `getSsr(uri)`
* Optional bulk build APIs.

These services:

* Depend on `TemplateProgram`.
* Use diagnostics, overlay/SSR artifacts, query facade, and provenance.
* Project results into host-specific types (LSP objects, CLI output, etc.).

They MUST NOT:

* Call pipeline stages directly.
* Maintain their own mapping tables or provenance structures.

Existing abstractions in hosts (for example, a `CompilerService`) SHOULD become
thin adapters on top of `TemplateProgram` and these services.

### 2.5 TS Host and Overlay File System

The TS language service and virtual filesystem live on the host side.

Normative contract:

* Overlay content is produced by program/build services, not by the TS host.
* There is a single module that defines overlay and SSR path conventions.
* Host-level paths are normalized via a central path utility so case sensitivity
  is consistent.

Path conventions (target):

* Template to overlay: for example,

  * `basename.__au.ttc.overlay.ts`

* Template to SSR:

  * HTML: `basename.__au.ssr.html`
  * Manifest: `basename.__au.ssr.json`

These conventions MUST be encapsulated in a single shared module. Hosts MUST NOT
hand-roll overlay or SSR filenames.

Materialization:

* Overlay FS asks program/build service for overlay artifacts:

  ```ts
  const artifact = buildService.getOverlay(uri); // path, text, mapping
  ```

* TS host then exposes `artifact.overlayPath` as a normal TS file via its
  `LanguageServiceHost`.

Overlays MAY be:

* Eagerly materialized on each document change, or
* Lazily materialized when TS first requests the overlay file.

Both strategies are acceptable as long as they go through the program facade and
respect the path conventions.

---

## 3. Identity, URIs and Spans

### 3.1 Identity Brands

The program layer MUST align with the shared identity brands:

* `UriString` for document identity.
* `NormalizedPath` for normalized filesystem paths.
* `SourceFileId` for associating spans with files.

Program-layer aliases (typical):

* `DocumentUri = UriString`
* `OverlayPath` and `HtmlPath` backed by `NormalizedPath` or `UriString`.

Normalization rules:

* Use `/` as internal path separator.
* A single module decides case sensitivity (for example, lowercasing paths on
  case-insensitive platforms).
* Adapters convert from host URIs / file paths to `DocumentUri` and back.

Adding a new branded type is allowed only if:

* The domain is distinct, and
* The brand ships with normalization and conversion helpers.

### 3.2 Spans

All spans MUST:

* Use UTF-16 code units.
* Represent ranges as `[start, end)` offsets.
* Use `SourceSpan` (or an alias) as the canonical shape.

Agents MUST NOT invent new span types. If more metadata is required, they SHOULD
extend `SourceSpan` or attach additional fields in a separate structure.

Normalization:

* When indexing spans into provenance or mapping, implementations SHOULD:

  * normalize file identity to `SourceFileId` or `DocumentUri`, and
  * avoid embedding raw, unnormalized paths in span payloads.

---

## 4. Call Flow Targets

This section describes the intended control flow in a mature program-based host.

### 4.1 Open / Change / Close Document

Host -> SourceStore -> TemplateProgram cache

1. Host opens or changes a template:

   ```ts
   sourceStore.set(uri, text, version);
   program.upsertTemplate(uri, text, version);
   ```

   Program invalidates cached artifacts for that document.

2. Host closes a template:

   ```ts
   sourceStore.delete(uri);
   program.closeTemplate(uri);
   ```

   Program drops caches and provenance for that document.

Compilations are performed on first query (lazy), not on open/change itself.

### 4.2 Diagnostics

Host -> LanguageService -> Program -> compiler + TS

1. Host calls:

   ```ts
   languageService.getDiagnostics(uri);
   ```

2. Language service queries program-level diagnostics:

   ```ts
   const templateDiags = program.getDiagnostics(uri);
   ```

   This runs pipeline up to typecheck and returns compiler diagnostics.

3. Language service queries overlay and TS diagnostics:

   ```ts
   const overlay = program.getOverlay(uri);
   const tsDiags = tsService.getDiagnosticsForFile(overlay.overlayPath);
   ```

4. TS diagnostics are mapped back to template spans via provenance:

   * overlay offset -> template span, using `findByGenerated` and/or mapping
     helpers.

5. Language service merges compiler and TS diagnostics and produces host-level
   diagnostics (for example, LSP `Diagnostic` objects).

### 4.3 Hover, Definitions, References, Completions

Host -> LanguageService -> TemplateProgram + TS + Provenance

For any point feature:

1. Convert host position to template offset.

2. Use query facade:

   ```ts
   const query = program.getQuery(uri);
   const expr = query.exprAt(offset);
   const node = query.nodeAt(offset);
   const bindables = node ? query.bindablesFor(node) : null;
   const expectedType = expr ? query.expectedTypeOf(expr) : null;
   ```

3. If view-model or TS symbol info is needed:

   * Use `ProvenanceIndex` or overlay mapping helpers to map template offset to
     overlay offset and TS file.
   * Ask TS LS for quick info, definitions, references, completions.
   * Map returned TS spans back through provenance into template ranges.

The language service coordinates the above; it does not walk IR directly or
perform custom offset math beyond position-to-offset conversions.

### 4.4 SSR

Host -> BuildService -> TemplateProgram

Typical usage:

```ts
const artifact = buildService.getSsr(uri);
```

Program runs:

* Shared stages (lower, resolve, bind, typecheck) reused with overlay.
* SSR plan and emit stages.

Target behavior:

* Overlay and SSR SHOULD share the same pipeline session for a given document
  when both are requested in the same logical run.
* When reuse is not possible, they MUST at least share stage caches keyed by
  content hash + option fingerprints.

Artifacts:

* `htmlText` and `htmlPath`
* `manifestText` and `manifestPath`
* Optional per-template plan or node index

Naming follows the centralized convention:

* `basename.__au.ssr.html`
* `basename.__au.ssr.json`

---

## 5. Caching Strategy

### 5.1 Stage-Level Keys and Fingerprints

Each pipeline stage cache key SHOULD be based on:

* A stable hash of the document content.
* A fingerprint for the options that affect that stage (semantics, resource
  graph, parsers, VM reflection, etc.).
* Stage version identifier.

Examples of fingerprints:

```ts
fingerprints: {
  semantics: "default" | "custom-X";
  exprParser: "default" | "custom-Y";
  vm: "reflect:MyVmFactory@1";
  tsconfig: "hash:abc123";
}
```

Programs MAY additionally use `(uri, version)` as a quick guard for per-document
caches, but MUST NOT rely solely on `version` when caches are persisted between
processes or sessions.

### 5.2 Invalidation Rules

* **On document change**
  Program MUST invalidate all per-document artifacts and stage outputs.

* **On option drift**
  Option drift includes changes to semantics, resource graph, tsconfig, VM
  reflection, or any other option that influences compilation output.

  Hosts MUST:

  * treat `TemplateProgram` options as immutable, and
  * create a new `TemplateProgram` when environment fingerprints change.

  Programs MAY expose an `optionsFingerprint` (opaque string) to make this
  comparison cheap.

  It is acceptable for early integrations to detect drift heuristically (for
  example, "tsconfig changed, recreate program") before a full fingerprinting
  scheme is implemented.

* **On overlay/SSR queries**
  Program SHOULD reuse stage outputs when fingerprints match, and rely on the
  pipeline’s own caching to avoid re-running work.

---

## 6. Migration Playbook

This section describes how agents should move hosts from direct `compileTemplate*`
calls to the program architecture.

### 6.1 Migration Phases

Recommended phases:

1. **Phase 0 – Discovery only**

   * Add `TemplateProgram`, `SourceStore`, `ProvenanceIndex` in the domain
     layer.
   * Keep hosts calling `compileTemplate*` directly.
   * Do not change behavior.

2. **Phase 1 – Program-backed diagnostics and overlays**

   * Introduce a `TemplateProgram` instance per workspace/project.
   * Adapt host document stores to `SourceStore`.
   * Route diagnostics and overlay access through `TemplateProgram` or
     `TemplateLanguageService` / `TemplateBuildService`.
   * Keep SSR as a separate path if needed.

3. **Phase 2 – Option fingerprinting and provenance**

   * Add option fingerprinting and content-hash-based stage keys.
   * Wire `ProvenanceIndex` into overlay mapping and start using it for
     diagnostics and basic navigation.
   * Remove host-side ad-hoc mapping.

4. **Phase 3 – SSR and advanced features**

   * Share overlay and SSR stages and caches.
   * Add SSR provenance.
   * Use provenance and member-path segments for advanced LSP features
     (hover, rename, references, etc.).

Agents MAY merge phases when practical, but SHOULD preserve the general order:
program first, then caching/provenance, then advanced features.

### 6.2 Replace Legacy Entry Points

Search for:

* `compileTemplate(...)`
* `compileTemplateToOverlay(...)`
* `compileTemplateToSSR(...)`
* Direct usage of pipeline stages in host code.

Mark these as legacy.

For each host (LSP server, CLI, build plugin, integration test harness):

1. Construct a `TemplateProgram` per project or workspace.

2. Wire host document lifecycle into `SourceStore` and `TemplateProgram`:

   * On open/change: `sourceStore.set` and `program.upsertTemplate`.
   * On close: `sourceStore.delete` and `program.closeTemplate`.

3. Replace legacy compile calls:

   * Diagnostics: `program.getDiagnostics(uri)`.
   * Overlay: `program.getOverlay(uri)`.
   * Query: `program.getQuery(uri)`.
   * Mapping / provenance: `program.getMapping(uri)` and
     `provenance.findByGenerated / findBySource`.
   * SSR: `program.getSsr(uri)` or via `TemplateBuildService`.

4. Update TS host / overlay FS:

   * Overlay FS MUST obtain overlays from program/build services.
   * No new direct calls to `compileTemplate*` in host layers.

### 6.3 Tests

* Unit tests MAY continue to exercise pure phases (lower, resolve, bind,
  typecheck, plan, emit) directly.
* Integration and end-to-end tests SHOULD exercise:

  * `TemplateProgram` APIs (diagnostics, overlay, SSR).
  * Language service APIs (hover, definitions, references, diagnostics) that
    depend on provenance.

---

## 7. Agent Style Constraints

Agents MUST respect these style constraints when implementing or refactoring
towards this architecture:

* **Strong typing**
  Use precise TypeScript types and brands (for example, `UriString`,
  `NormalizedPath`, `SourceFileId`, `ExprId`, `NodeId`). Avoid `any` unless
  absolutely necessary.

* **Pure phases**
  Do not introduce side effects into compiler stages. All IO and host
  integration lives outside the pipeline.

* **Minimal runtime guards**
  Check invariants at the edges (host input, untyped boundaries), not in every
  internal function.

* **No auto-applied edits**
  Program and language services MAY propose edits (code actions, rename), but
  MUST NOT apply them automatically.

* **No host coupling in the domain layer**
  `TemplateProgram`, `SourceStore` and `ProvenanceIndex` are host-agnostic.
  They MUST NOT import LSP, VS Code, CLI-specific, or TS host types.

When in doubt, agents SHOULD align new features and refactors with this document
and update it rather than introducing new ad-hoc patterns in host code.
