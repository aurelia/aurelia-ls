# Aurelia 2

Language intelligence for Aurelia 2 templates, powered by the shared Aurelia semantic runtime.

The extension analyzes your Aurelia project to understand what your components are, what they accept, where they came from, and how templates connect to TypeScript. It handles decorators, conventions, `static $au`, `.define()` calls, third-party packages, and the full binding syntax.

When it cannot prove a fact, it keeps that uncertainty visible through diagnostics, inline markers, and inspection details instead of fabricating a confident answer.

## Features

### Hover — understand your templates

Hover over any Aurelia construct to see what it is, what it accepts, and where it came from. Custom elements show their bindable interface with types and binding modes. Expressions show resolved types. Template controllers show their contextual variables ($index, $first, $even, etc.).

### Diagnostics — catch real problems

Real-time, source-linked diagnostics for unknown elements, unknown attributes, expression errors, and binding mismatches. Diagnostics are backed by the same semantic facts used by MCP and other runtime consumers.

### Quick fixes — apply only current plans

Edit-backed diagnostics offer conservative quick fixes for source operations the semantic runtime can prove, such as declaring a missing view-model member or registering an available framework capability. Edits are re-planned when selected and refused if an open target document changed before application.

### Completions — discover what's available

Context-aware suggestions that reflect your actual project. Element tags, bindable attributes, binding commands, expression members, value converters, binding behaviors — all filtered by what's registered and visible in scope.

### Go to Definition — navigate across boundaries

Jump from template usage to source definition. Works for custom elements, attributes, template controllers, bindables, expression identifiers, and local scope variables. Crosses the HTML/TypeScript boundary.

### Find References

Find verified usages of source-backed template members and Aurelia resources across your project. When the runtime has
concrete candidate sites it could not verify, or a verified source row cannot be mapped into an editor location, the
request returns the verified subset and reports the omitted count instead of presenting the subset as complete.

### Rename — refactor safely

Rename source-backed template expression members across TypeScript and HTML. The extension only applies edits when semantic-runtime can prove the affected template references.

### Semantic Tokens — see the meaning

Templates are colored by semantic meaning: custom elements look different from HTML elements, bindable attributes look different from plain attributes, resolved expressions look different from unresolved ones.

### Resource Explorer

Browse all Aurelia resources in your project from the sidebar — custom elements, attributes, template controllers, value converters, binding behaviors — organized by project, package, framework provenance, and scope.
In multi-root workspaces, each active workspace folder has its own root so same-named resources retain their owner.

### Binding Mode Hints

Inline hints show the resolved binding mode so you can see whether `.bind` resolves to two-way or to-view for a given target.

### Inspect and Reports

Inspect at Cursor opens the semantic-runtime fact at the current template position in a markdown editor. Diagnostics
Report opens a source-linked summary of current diagnostics without forcing focus to an output panel. The report retains
the semantic answer state, presentation groups, raw rows, continuations, and source evidence rather than reconstructing
confidence from the diagnostics that happen to fit the standard LSP surface.

## What Aurelia constructs are supported

- Custom elements (decorator, convention, `static $au`, and `.define()` forms)
- Custom attributes
- Template controllers (`if`, `else`, `repeat`, `switch`/`case`, `promise`/`pending`/`then`/`catch`, `with`, `portal`, `au-slot`, `au-compose`, and custom TCs)
- Value converters
- Binding behaviors
- All standard binding commands (`.bind`, `.to-view`, `.from-view`, `.two-way`, `.one-time`, `.trigger`, `.capture`, `.attr`, `.class`, `.style`, `.ref`)
- Template expressions (property access, member chains, optional chaining, pipes, behaviors)
- Third-party package resources

## How it handles uncertainty

Most framework tooling either achieves complete knowledge by restricting what you can write, or provides incomplete knowledge without telling you.

This extension takes a different approach: it analyzes what it can analyze, and when it reaches a limit (a dynamic registration pattern, a complex third-party package), it keeps the uncertainty visible. Diagnostics, inline markers, hover, Inspect at Cursor, and the Resource Explorer all prefer source-linked facts and provenance over guessed results.

The goal is that you can trust what the extension tells you.

## Requirements

- Aurelia 2 project with `aurelia` or `@aurelia/*` in dependencies
- TypeScript 5.0+

## Workspace Activation

By default, the extension uses dependency manifests or an already-open Aurelia entry source only as a cheap candidate
signal. The language server then asks semantic-runtime for the workspace's project shape and keeps the session only when
that workspace contains an Aurelia app, resource-library authoring project, or Aurelia package-inspection project.
Unrelated HTML and TypeScript workspaces remain inactive.

Set `aurelia.activationMode` per workspace folder when automatic admission is not appropriate:

- `auto` uses candidate evidence followed by semantic project-shape confirmation;
- `on` keeps tooling active for dynamic, incomplete, or unusual project layouts;
- `off` prevents tooling from starting for that folder.

Disjoint multi-root folders receive independent language-server sessions. Semantic-runtime owns nested projects inside
each root, while untitled and out-of-workspace documents remain unclaimed. Remote folders are supported when the
extension host can access their filesystem; virtual workspaces are not currently supported.

## Getting Started

1. Install this extension
2. Open an Aurelia 2 project
3. The language server activates after semantic-runtime confirms the workspace project shape
4. Check the "Aurelia Language Server" output channel for status

## Commands

| Command | Keybinding | Description |
|---------|------------|-------------|
| Aurelia: Find Resource | `Ctrl+Alt+A` (`Cmd+Alt+A`) | Search project resources by name |
| Aurelia: Inspect at Cursor | `Ctrl+Alt+I` (`Cmd+Alt+I`) | Show full semantic analysis at cursor |
| Aurelia: Open Related File | `Alt+O` | Toggle between component class and template |
| Aurelia: Show Available Resources | | List all resources visible in current scope |
| Aurelia: Diagnostics Report | | Open a semantic-runtime diagnostics summary for the current template |
| Aurelia: Refresh | | Refresh the Resource Explorer |

`Aurelia Debug: Dump Server State` is available when `aurelia.features.debugCommands` is enabled. Observability commands are available from the command palette for troubleshooting.

## Troubleshooting

If features aren't working:

1. Check the "Aurelia Language Server" output channel for errors
2. Ensure your project has a `tsconfig.json`
3. Verify `aurelia` is in your `package.json` dependencies
4. Try reloading the VS Code window

## Feedback

- Report issues: [aurelia/aurelia-ls](https://github.com/aurelia/aurelia-ls/issues)
- Source code: [github.com/aurelia/aurelia-ls](https://github.com/aurelia/aurelia-ls)
