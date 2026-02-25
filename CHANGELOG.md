# Changelog

Core packages changelog for `@aurelia-ls/*` (compiler, transform, build, language-server).

For VS Code extension changelog, see [`packages/vscode/CHANGELOG.md`](packages/vscode/CHANGELOG.md).

---

## 0.3.0

*Semantic workspace: independent semantic layer, full IDE feature suite.*

### New package: @aurelia-ls/semantic-workspace

Independent semantic authority that sits between the compiler and its
consumers. The workspace owns the semantic model, orchestrates both
analysis pipelines, handles incremental invalidation, and provides the
feature query surface.

**Feature query path:**
- CursorEntity resolution — unified position → entity mapping for all features
- Per-feature dispatch (hover, definition, completions, diagnostics, references, rename, semantic tokens)
- Confidence cascade — every entity carries its confidence level through to the response
- `FeatureResponse<T>` — typed result that's either a value, a degradation explanation, or not-applicable

**Workspace engine:**
- Orchestrates project and template pipelines
- Incremental invalidation via DependencyGraph
- Resource fingerprinting for detecting meaningful vs. cosmetic changes
- TypeScript overlay management for cross-boundary type flow

**Semantic authority host:**
- Persistent runtime for interactive querying (`pnpm host:start` / `host:query`)
- Replay and verification commands
- Pressure sweep mode for corpus-level testing

### @aurelia-ls/compiler

**Project pipeline restructure:**

The project analysis subsystem (`project-semantics/`) has been
reorganized around a clear pipeline: scan → identify → characterize →
converge → SemanticModel.

- `SemanticModel` as canonical query authority, replacing scattered snapshot accessors
- `SemanticModelQuery` resolves internal `Sourced<T>` provenance wrappers into consumer-facing `Resolved<T>` values, with `Stub<T>` for gapped fields
- Definition convergence kernel — multiple sources (decorators, conventions, config, third-party, builtins) merge per-resource using 5 field-level operators (locked-identity, known-over-unknown, stable-union, patch-object, first-defined)
- `ResourceView` projection boundary (Sourced → Resolved) as the clean seam between analysis and consumption
- Per-resource gap tracking with structured reasons, propagated through the catalog and exposed via `SemanticsLookup`
- Scope completeness propagation — dynamic registration patterns produce scope gaps that affect downstream confidence

**Template pipeline:**

Pipeline stages renamed for clarity: `20-resolve` → `20-link`.

- Link stage resolves elements, attributes, and template controllers against the semantic model with three-way resolution status (resolved / stub / absent)
- Bind stage validates bindings against resource definitions, resolves value converters and binding behaviors in expressions, computes effective binding modes
- Gap-aware diagnostics across all link-stage emission sites — confidence qualifies every diagnostic
- Confidence-based severity demotion — errors demote to warnings when analysis is incomplete

**CursorEntity system:**
- Unified cursor position → semantic entity resolution
- Per-position confidence cascade aggregating confidence from all pipeline layers
- Entity types: element tag, attribute name, bindable, binding command, expression identifier, member access, value converter, binding behavior, template controller contextual variable, let binding, au-slot

**Diagnostics infrastructure:**
- Diagnostic catalog with typed codes and structured data
- Policy engine for configurable diagnostic behavior
- Surface routing (compiler → LSP → VS Code problems panel)
- Capture-aware bindable suppression

**Incremental invalidation:**
- `DependencyGraph` tracks input→output relationships across the full pipeline
- `DepRecorder` wired into every pipeline stage
- File-scoped discovery replaces full-project recomputation

**Other changes:**
- Precise spans on DOM nodes and AST identifiers
- Symbol graph for stable cross-file definition and reference tracking
- Referential index for cross-domain provenance traversal
- Policy modules: query policy, resource precedence, rename, refactor, provenance projection, controller dispatch, symbol ID
- Command and attribute pattern recognition streams with uncertainty gap handling
- Builtin alignment with runtime metadata (repeat, portal, promise)
- Path case normalization for Windows compatibility

### @aurelia-ls/language-server

The language server is now a thin LSP protocol adapter. All semantic
knowledge construction has moved to the semantic workspace.

- Handlers translate LSP requests into workspace queries and workspace results into LSP responses
- Diagnostics taxonomy bridged into VS Code via diagnostic data records
- Gap-aware semantic token modifiers forwarded from workspace
- Workspace change notifications (`onDidChangeSemantics`) for live updates
- Parity adapter for verification against the semantic authority host

### @aurelia-ls/transform

- Pipeline terminology alignment (resolve → link)

---

## 0.2.0

*Compiler hardening: config-driven template controllers and Elm-style error handling.*

### @aurelia-ls/compiler

**Config-driven template controllers:**
- Unified `ControllerConfig` type with 6 orthogonal axes (trigger, scope, cardinality, relationship, placement, injection)
- All TC behavior derives from configuration instead of name-based switch statements
- Custom TCs from `@templateController` receive identical treatment to built-ins
- Pattern-based frame origins for type inference (works for custom TCs automatically)
- Consolidated AOT transform: 10 separate functions → single `transformController`

**Elm-style error handling:**
- `Diagnosed<T>` monad for accumulating diagnostics while producing values
- `StubMarker` for marking degraded values from error recovery
- Stub propagation through resolve, bind, and typecheck phases
- Cascade suppression: stubbed inputs don't generate new diagnostics

**New diagnostics:**
- `AU0101`: Binding behavior not found
- `AU0102`: Duplicate binding behavior
- `AU0103`: Value converter not found
- `AU0106`: Assignment to `$host`
- `AU0704`: Invalid `<let>` command
- `AU0810`: `[else]` without preceding `[if]`
- `AU0813`: `[then]/[catch]/[pending]` without parent `[promise]`
- `AU0815`: `[case]/[default-case]` without parent `[switch]`
- `AU0816`: Multiple `[default-case]` in same switch
- `AU1102`: Unknown custom element
- `AU9996`: Conflicting rate-limiters (throttle + debounce)

**Expression utilities:**
- `tryToInterpIR()` for proper interpolation detection
- Unified expression walkers with `forEachExprChild` pattern
- Switch/case branch metadata in IR (symmetric with promise)

### Test Coverage

~2,000 tests passing across all packages, 124 new tests added:
- 15 Elm-style error propagation tests
- 11 typecheck integration tests at LS layer
- 67 typecheck config tests (presets, coercion rules)
- 31 edge case tests across analysis stages

---

## 0.1.0

*Initial release of the Aurelia language services core packages.*

### @aurelia-ls/compiler

AOT template compiler with 4-stage analysis pipeline:

- **10-lower**: HTML parsing to Template IR via parse5
- **20-resolve**: Semantic resolution (custom elements, attributes, binding targets, events)
- **30-bind**: Scope analysis, local variable tracking, expression binding
- **40-typecheck**: TypeScript integration, type diagnostics

Synthesis targets:
- **AOT emit**: Pre-compiled instructions, template HTML with markers, expression tables
- **Overlay emit**: TypeScript `.d.ts` overlays for LSP integration

Expression parser with full Aurelia syntax support:
- Binding behaviors and value converters
- For-of iteration with destructuring
- Arrow functions, optional chaining, nullish coalescing
- All binary/unary operators

### Resolution (merged into @aurelia-ls/compiler)

Resource discovery and dependency analysis:

- All declaration forms: `@customElement`, `@customAttribute`, `@valueConverter`, `@bindingBehavior`, `@bindingCommand`
- Convention-based detection (class name → element/attribute name)
- Bindables extraction from decorators and conventions
- Dependencies extraction from decorator config
- ResourceGraph for scope-aware resource availability
- TypeScript program integration

### @aurelia-ls/transform

AOT code transformation:

- Decorator removal (`@customElement` → `static $au`)
- Bindables injection into class body
- Dependencies array generation
- Entry point transformation (`main.ts` → AOT configuration)
- Source location preservation

### @aurelia-ls/build

SSR rendering and Vite integration:

- Server-side rendering with manifest recording
- Tree-based `ISSRScope` for template controller state
- Client hydration via manifest replay
- Template controller support: `if`, `else`, `repeat`, `with`, `switch`, `case`, `promise`
- Router SSR with `au-viewport` rendering
- Vite plugin for dev server integration

### @aurelia-ls/language-server

LSP server for IDE integration:

- Type-aware diagnostics for binding expressions
- Unknown element/attribute/event detection
- Hover information with types
- Go-to-definition via overlay projection
- Find references across templates
- Semantic tokens for syntax highlighting
- Debounced document synchronization
- Error boundaries on all handlers

### Diagnostics

Compiler diagnostics implemented:
- `AU1101`: Unknown template controller
- `AU1103`: Unknown event
- `AU1104`: Property target not found
- `AU1106`: Unknown repeat option
- `AU1201`: Invalid repeat destructuring
- `AU1202`: Duplicate local name
- `AU1203`: Invalid expression
- `AU1301`: Type mismatch

### Test Coverage

~1,850 tests passing across all packages:
- Vector-based tests for compiler stages
- Integration tests for resolution pipeline
- SSR rendering and hydration tests
- Language server handler tests

---

## Versioning Policy

Core packages (`@aurelia-ls/compiler`, `@aurelia-ls/transform`, `@aurelia-ls/build`, `@aurelia-ls/language-server`) share a unified version number. They are tightly coupled and changes typically cascade across packages.

The VS Code extension (`aurelia-2`) has an independent version and release cycle. See its [changelog](packages/vscode/CHANGELOG.md) for extension-specific changes.
