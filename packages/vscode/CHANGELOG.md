# Changelog

## 0.5.0

The extension and language server now use the shared Aurelia semantic runtime. Editor answers preserve exact authored
source and disclose partial, refused, or failed results instead of filling semantic gaps with guesses.

### Language intelligence

- Reworked hover to preserve the exact authored range and show resource origin, bindable type and nullability, binding mode, contextual variables, and typed bare `$this`.
- Made completions carry exact replacement edits, including safe `.bind` composition for bindables and `.for` for the framework `repeat` controller, without duplicating an existing command or inferring framework behavior from spelling alone.
- Added exact Go to Definition targets from static router `load` paths and route ids to their owning route-configuration declarations.
- Made Find References report unverified or unmappable candidates instead of presenting a verified subset as complete.
- Made template rename cover source-backed members, bindables and aliases, custom elements, custom attributes, template controllers, value converters, and binding behaviors when their declarations and references are editable and verified.
- Extended TypeScript, TSX, JavaScript, and JSX member renames atomically into admitted templates, while leaving unverified same-name candidates unchanged and reporting them.
- Made Quick Fixes re-plan against the current document and reject stale, overlapping, or otherwise unsafe workspace edits.
- Preserved framework and template-checker TypeScript codes through VS Code Problems while leaving ordinary Program diagnostics to VS Code's native TypeScript/JavaScript provider, and hardened native symbols, highlights, selection ranges, paired-tag linked editing, folding ranges, inlay hints, and semantic-token source ranges.
- Semantic-token responses now require complete, source-backed, non-overlapping single-line classifications, and the extension declares native fallback types for its Aurelia token vocabulary.

### Workspace and resource discovery

- Added resource-scoped `auto`, `on`, and `off` activation for multi-root workspaces. Automatic activation requires semantic-runtime project-shape confirmation, and an excluded parent subtree cannot be re-enabled by a nested folder.
- Added exact JSONC parsing for `aurelia.project.json`, with parser diagnostics owned by VS Code and admitted semantic
  configuration diagnostics owned by semantic-runtime; the canonical full schema remains packaged but unassociated.
- Rebuilt **Aurelia Resources** in VS Code's built-in Explorer over exact project inventory, aliases, bindables, origin, ambiguity, and partial or failed analysis state.
- Replaced **Find Resource** and **Show Available Resources** with **Go to Resource...** and **Go to Resource Available to Active Template...**, using exact workspace inventory and active-template compiler scope.
- Scoped settled Resource Explorer refreshes to the workspace whose analysis changed while retaining full refreshes for topology, session, and explicit user-refresh events.
- Made an isolated Worker-backed language server the default transport for active roots, with IPC retained for debugging and explicit fallback.

### Compatibility and product changes

- Requires VS Code 1.91 or newer and a filesystem-backed workspace. Virtual workspaces are unsupported; remote development is not yet a declared release promise.
- Moved the resource view from a dedicated Activity Bar container into VS Code's built-in Explorer.
- Removed approximate CodeLens, global snippets, default keybindings, Diagnostics Report and suppressed-diagnostics commands, Inspect at Cursor, status and inline-confidence presentation, public debug and observability surfaces, dead feature toggles, and the experimental AI setting.
- **Open Related File** remains available without a bundled keyboard shortcut.

## 0.4.4

### Fixes

- Fixed false positive for `css` attribute binding ([#21](https://github.com/aurelia/aurelia-ls/issues/21))
- Fixed diagnostic position drift on CRLF line endings
- Fixed false positives for standard HTML attributes and events (`src`, `alt`, `error`, `load`, etc.) ([#23](https://github.com/aurelia/aurelia-ls/issues/23), [#24](https://github.com/aurelia/aurelia-ls/issues/24), [#26](https://github.com/aurelia/aurelia-ls/issues/26))
- Added SVG element attribute support ([#25](https://github.com/aurelia/aurelia-ls/issues/25))

## 0.4.3

### Fixes

- Removed stale overlay link from hover cards

## 0.4.2

### Fixes

- Fixed infinite refresh loop that caused high CPU usage after startup

## 0.4.1

### Fixes

- Fixed language server failing to start in published extension

## 0.4.0

The extension has been rebuilt around a new semantic workspace
architecture. The language server now delegates all analysis to an
independent semantic layer, which means every feature goes through
the same resolution and confidence path.

### Hover

Rich semantic cards for all Aurelia template constructs:

- Custom elements show their bindable interface with types and binding modes
- Template controllers show contextual variables ($index, $first, $even, etc.)
- Expressions show resolved types from TypeScript
- Confidence indicators when the system's knowledge is partial
- Declaration form and source location for provenance

Covers custom elements, custom attributes, template controllers,
bindables, binding commands, value converters, binding behaviors,
expression identifiers, member access chains, let bindings, and
au-slot references.

### Diagnostics

- Unknown element and attribute detection
- Binding target mismatches
- Scope violations
- Confidence-based severity demotion — errors demote to warnings when
  analysis is incomplete, preventing false positives on valid code
- Capture-aware bindable suppression (won't flag a missing bindable
  when the component captures spreads)

### Completions

- Context-aware suggestions for element tags, attribute names, binding
  command suffixes, expression members, and value converter/binding
  behavior names
- Scope-aware filtering — only suggests resources that are registered
  and visible
- Import suggestions for unregistered resources
- Gap markers when the completion list may be incomplete

### Go to Definition

- Jump from template usage to source definition for all resource types
- Works across the HTML/TypeScript boundary
- Local scope variables (let bindings, repeat iterator variables)

### Find References

- Find all usages of a component, attribute, or bindable across templates
- Cross-file reference tracking via TypeScript overlay synchronization

### Rename

- Cross-file rename for custom elements, custom attributes, value
  converters, binding behaviors, and bindable properties
- Confidence-gated safety — denies the rename with a structured
  explanation when it can't guarantee full reference coverage

### Semantic Tokens

- Semantic coloring that distinguishes custom elements from HTML
  elements, bindable attributes from plain attributes, template
  controller attributes, value converters, binding behaviors, binding
  commands, and expression identifiers
- Gap-aware modifiers signal when coverage is partial

### New extension features

- **Resource Explorer** — tree view sidebar showing all Aurelia resources
  with origin (local vs. package) and scope awareness
- **Find Resource** — quick-pick search across all project resources
- **Inspect at Cursor** — reveals the full semantic analysis at the
  current cursor position
- **Binding mode inlay hints** — shows whether `.bind` resolves to
  two-way or to-view
- **CodeLens** — bindable and usage counts on resource classes
- **Open Related File** — toggle between component class and template
  with `Alt+O`
- **Show Available Resources** — scope-aware list of what's usable in
  the current template

### Improvements

- Feature-based extension architecture (per-feature modules)
- Keybindings and context menu integration for Aurelia commands
- Improved status bar with analysis state indicator
- Windows workspace activation fixes
- Workspace change notifications for live updates

## 0.3.1

### Fixes

- Fixed extension crash on startup: TypeScript was not being bundled with the extension, causing "Cannot find module 'typescript'" error

## 0.3.0

### Semantic Tokens

Full syntax highlighting powered by compiler analysis:

- Custom elements highlighted as namespace
- Expressions: variables, property access, method calls, Aurelia built-ins (`$index`, `$parent`, etc.)
- Binding commands: `.bind`, `.trigger`, `.two-way`, shorthand `:` and `@`
- Template controllers: `if.bind`, `repeat.for`, `switch`/`case`
- Value converters and binding behaviors
- Interpolation delimiters

Removes TextMate grammar in favor of semantic tokens for more accurate highlighting.

### Snippets

Added snippets for common Aurelia patterns:
- Template controllers: `au-if`, `au-repeat`, `au-switch`, `au-promise`
- Bindings: `au-bind`, `au-trigger`, `au-two-way`
- Elements: `au-compose`, `au-slot`, `au-viewport`

### Fixes

- Fixed overlay file paths leaking into diagnostics
- Fixed semantic token highlighting for nested content inside template controllers
- Improved language server performance (debouncing, reduced TS service recreation)

## 0.2.0

- Fixed server startup issue
- Fixed URI encoding in document synchronization
- Improved error handling in LSP request handlers
- Reduced unnecessary recompilation with better change detection

## 0.1.0

Initial release with support for:

- Type-aware diagnostics for binding expressions
- Unknown element and attribute detection
- Hover information with types
- Go-to-definition for component properties
- Find references across templates
