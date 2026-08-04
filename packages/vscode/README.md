# Aurelia 2

Language intelligence for Aurelia 2 templates, powered by the shared Aurelia semantic runtime.

The extension analyzes your Aurelia project to understand what your components are, what they accept, where they came from, and how templates connect to TypeScript. It handles decorators, conventions, `static $au`, `.define()` calls, third-party packages, and the full binding syntax.

When it cannot prove a fact, it preserves that uncertainty in diagnostics, hover details, and resource evidence instead of fabricating a confident answer.

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

### Resource Discovery

Browse exact runtime resources in the **Aurelia Resources** view in VS Code's built-in Explorer, grouped by kind. The view
covers custom elements, custom attributes, template controllers, value converters, and binding behaviors; compiler-syntax
features such as binding commands and attribute patterns remain outside the runtime-resource inventory. Aliases, bindables,
declaration forms, origin, and exact source navigation stay attached to their owning definition. Multi-root workspaces show
workspace and project ownership only when it is needed to disambiguate identical names, and failed or partial analysis remains
visible without replacing the last coherent tree.

Use **Aurelia: Go to Resource...** to search the complete inventory across active Aurelia workspaces. Use
**Aurelia: Go to Resource Available to Active Template...** for the exact compiler scope at the current template cursor. The
contextual command asks you to choose when project or template ownership is genuinely ambiguous; it never derives scope from
which Explorer item happens to have focus.

### Binding Mode Hints

Optional inline hints show the resolved binding mode so you can see whether `.bind` resolves to two-way or to-view for a
given target. They are disabled by default and can be enabled per workspace folder with
`aurelia.inlayHints.bindingMode`.

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

This extension takes a different approach: it analyzes what it can analyze, and when it reaches a limit (a dynamic
registration pattern or a complex third-party package), it keeps the uncertainty visible. Diagnostics, hover, and the
Aurelia Resources view all prefer source-linked facts and provenance over guessed results.

The goal is that you can trust what the extension tells you.

## Requirements

- An Aurelia 2 project identifiable from framework dependencies, source evidence, explicit activation, or native
  `aurelia.project.json` configuration
- A workspace filesystem accessible to the VS Code extension host

## Workspace Activation

By default, the extension uses dependency manifests, an already-open Aurelia entry source, or exact
`aurelia.project.json` presence only as cheap candidate evidence. Parsing that native configuration, reporting its
validity, and applying its authored-source exclusions remain semantic-runtime responsibilities. The language server
then asks semantic-runtime for the workspace's project shape; it keeps shape-confirmed Aurelia app,
resource-library-authoring, and package-inspection sessions, and may also retain a config-only session when
semantic-runtime confirms the exact native configuration. Unrelated HTML and TypeScript workspaces remain inactive.

Set `aurelia.activationMode` per workspace folder when automatic admission is not appropriate:

- `auto` uses candidate evidence followed by semantic project-shape confirmation;
- `on` keeps tooling active for dynamic, incomplete, or unusual project layouts;
- `off` excludes that folder and its complete subtree from Aurelia tooling.

An `off` subtree cannot be re-enabled by a nested `on` folder. An admitted outer project may still read code under an
excluded subtree when ordinary imports make it a dependency, but the extension will not directly own its documents,
publish its diagnostics, or include it as authored project source. Disjoint multi-root folders receive independent
language-server sessions. Enabled nested workspace folders are supplied as project-root hints to the same shared
semantic-runtime discovery; the extension does not reinterpret them as projects. Semantic-runtime owns admitted nested projects inside each root, while untitled and
out-of-workspace documents remain unclaimed. Remote folders are supported when the extension host can access their
filesystem; virtual workspaces are not currently supported.

## Getting Started

1. Install this extension
2. Open an Aurelia 2 project
3. The language server activates after semantic-runtime confirms the workspace project shape
4. Check the "Aurelia Language Server" output channel for status

## Commands

The extension does not claim global keyboard shortcuts. Assign shortcuts through VS Code's Keyboard Shortcuts editor if
these commands are part of your workflow.

| Command | Description |
|---------|-------------|
| Aurelia: Go to Resource... | Search exact runtime resources across active Aurelia workspace folders |
| Aurelia: Open Related File | Open a component class or file-backed template, prompting when topology proves multiple counterparts |
| Aurelia: Go to Resource Available to Active Template... | Search exact runtime resources in the active template cursor's compiler scope |
| Aurelia: Refresh | Refresh the Aurelia Resources view |

## Troubleshooting

If features aren't working:

1. Check the "Aurelia Language Server" output channel for errors
2. Ensure your project has a `tsconfig.json`
3. Verify `aurelia` is in your `package.json` dependencies
4. Try reloading the VS Code window

## Feedback

- Report issues: [aurelia/aurelia-ls](https://github.com/aurelia/aurelia-ls/issues)
- Source code: [github.com/aurelia/aurelia-ls](https://github.com/aurelia/aurelia-ls)
