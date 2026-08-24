# Changelog

## 0.5.0

Version 0.5 continues the extension and language-server migration to the shared
Aurelia semantic runtime. Its source-backed project model now supplies editor
features, resource discovery, diagnostics, and currentness across workspace
roots.

### Highlights

- Cross-file rename is one authenticated workspace transaction and one native VS Code undo unit.
- **Aurelia Resources** now presents project inventory and selected-template availability with navigation and recovery.
- Hover adds exact context for `$parent`, members, bindables, and calls.
  Completions now carry exact edits.
- Contextual explanations and `aurelia.project.json` V1 expose more of the semantic model when requested.
- Each admitted workspace root uses an isolated Worker-backed language server with restart and multi-root isolation.

### Language intelligence

- Hover selects exact authored loci. Cards cover member, local, and `$this`
  types; authored `$parent` hops; member documentation and deprecation; resource
  identity; bindable modes; selected call signatures; and static route IDs and
  paths.
- Completions carry exact replacement edits and safely compose `.bind` for bindables and `.for` for framework `repeat`.
- Definitions, references, and highlights use source-backed identity across templates, TypeScript related symbols, linked
  declarations, and source-resolvable route ids/`load` paths. Find References reports omitted candidate counts when its
  returned rows are not complete.
- Route-parameter object-key completions use endpoint declarations from source-resolvable route topology.
- Supported resource/member rename extends between TypeScript and templates when the complete edit set is current and
  editable. An unverified candidate or stale target refuses the whole operation.
- Semantic coloring and document-structure features share the same source
  evidence. This includes symbols, ranges, linked editing, folding, highlights,
  and optional binding-mode hints. Resource lookup preserves authored casing and
  SVG/HTML `foreignObject` ownership.

### Diagnostics and safe fixes

- Pull diagnostics preserve semantic/checker context while VS Code's native provider continues to own ordinary
  TypeScript/JavaScript Program diagnostics.
- Edit-backed Quick Fixes re-plan against current source and refuse stale, overlapping, ambiguous, or excluded targets.
  Aurelia recovery Problems cover a bounded set of malformed tags, attributes, comments, declarations, foreign-content
  CDATA, and excessive element nesting.
- Templates use native `html` mode by default. Resource-scoped `aurelia.templateDiagnostics.suppressNative` can move
  proved templates to **Aurelia HTML** mode to remove interpolation false positives. It also suppresses legitimate
  embedded CSS/JavaScript findings and can change icons, `[html]` settings, snippets, formatters, and related behavior.

### Resources, explanations, and configuration

- **Aurelia Resources** lives in Explorer and covers the five runtime resource
  kinds. It separates project inventory from active-template availability and
  reports answer coverage and project state. Resource identity retains aliases,
  bindables, declaration form, ownership, provenance, and source targets.
- Icons carry one information axis at each level: resource kind, resource provenance/locality, alias relationship, or
  declared bindable mode. Text, tooltips, and accessibility labels carry the same information.
- Resource rows provide declaration, implementation, and side navigation. Failed/out-of-date projects provide Retry and
  Output; unsupported projects provide Output.
- **Go to Resource...** searches navigable inventory across active roots. **Go to Resource Available to Active
  Template...** searches the active template's selected compiler scope and prompts when project/scope identity is
  ambiguous.
- Contextual actions include **Explain this Aurelia diagnostic** and **Explain this Aurelia binding**.
  Attribute and resource actions are **Explain how Aurelia uses this attribute** and **Explain Availability in Active Template**.
  They re-check the current document and subject. These source-context actions do not appear in the Command Palette.
- **Review Analysis Limitations** exposes the configured dynamic-registration-spread finding when eligible.
  `aurelia.project.json` V1 can set it to `off`, `information`, `warning`, or `error`. The policy changes presentation;
  `off` suppresses eligible projection and may leave no review row.
- V1 also owns `authoredSources.excludedRoots`. Semantic-runtime owns format acceptance, application state, filesystem
  checks, semantic diagnostics, and effective policy. VS Code provides JSONC feedback plus a bundled offline assistance
  schema; the canonical semantic schema is packaged separately.

### Workspace activation and reliability

- Resource-scoped `aurelia.activationMode` supports `auto`, `on`, and hard-subtree `off`. Automatic mode starts
  provisionally from dependency/source/configuration evidence and then requires semantic project-shape confirmation. An
  excluded parent subtree cannot be re-enabled below.
- Disjoint workspace roots receive independent language-server sessions, resource state, diagnostics, and refreshes.
  Session replacement and Worker restart refresh ownership and current answers. IPC is available for Extension
  Development Host debugging and `AURELIA_LS_FORCE_IPC_TRANSPORT=1` diagnosis.

### Compatibility, changed surface, and removals

- Requires VS Code 1.91 or newer and a filesystem-backed local workspace. Virtual workspaces are unsupported. Remote
  development has no release-test coverage.
- Modeled Repeat, virtualization, routing, and validation behavior is aligned with the Aurelia framework baseline used
  for this release.
- The resource view moved from its dedicated Activity Bar container into Explorer and is now named **Aurelia Resources**.
- `aurelia.findResource` and `aurelia.showAvailableResources` were replaced by `aurelia.goToResource` and
  `aurelia.goToAvailableResource`. The old `Ctrl/Cmd+Alt+A` and `Ctrl/Cmd+Alt+I` bindings were removed. **Open Related
  File** moved from `Alt+O` to the scoped `Alt+R`, which is the only bundled default keybinding.
- Removed approximate CodeLens, ordinary-HTML global snippets, Diagnostics Report and suppressed-diagnostics commands,
  Inspect at Cursor, overlay/mapping/state viewers, status and inline-confidence presentation, public debug/observability
  commands, dead feature toggles, and the experimental AI setting.
- Removed the `aurelia.features.*`, `aurelia.observability.*`, and `aurelia.experimental.ai` settings. The supported 0.5
  settings are `aurelia.activationMode`, `aurelia.inlayHints.bindingMode`, and
  `aurelia.templateDiagnostics.suppressNative`, all scoped per workspace folder.

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
