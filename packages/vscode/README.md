# Aurelia 2

Language intelligence for Aurelia 2 templates, powered by the shared Aurelia semantic runtime.

The extension analyzes your Aurelia project to understand what your components are, what they accept, where they came from, and how templates connect to TypeScript. It handles decorators, conventions, `static $au`, `.define()` calls, third-party packages, and Aurelia binding syntax.

When it cannot prove a fact, it preserves that uncertainty in semantic evidence instead of fabricating a confident
answer. Broad or non-actionable uncertainty stays out of Problems and hover. Hover translates only typed uncertainty
that materially affects its exact selected answer; broader resource state remains available in Aurelia Resources.

## Features

### Hover — understand your templates

Hover over a supported Aurelia-authored token for one bounded answer at its exact authored range. Template members and
locals show the selected type, with a local role when semantic evidence proves it; bare `$this` shows the current
binding-context type. Resource tokens show authored identity and Aurelia kind, with an alias relationship or
implementation only when source-backed evidence proves it. Bindable attributes and declarations show the public type
and declaration-default mode. Exact static route-id or route-path tokens show the selected route context. A card may then
include at most one presented cursor diagnostic or one typed uncertainty that affects that answer. Resource tags do not
enumerate a component's bindables, and hover omits origin and provenance by default.

### Diagnostics — catch real problems

Real-time, source-linked diagnostics for unknown elements, unknown attributes, expression errors, and binding
mismatches. Errors are definite correctness or configuration failures; warnings are high-confidence risks that Aurelia
may still tolerate at runtime; Information is reserved for exact, actionable incomplete-analysis loci. Broad weak-owner
or admission uncertainty and operational failures do not become standalone Problems.

VS Code's native TypeScript/JavaScript provider owns ordinary Program diagnostics; Aurelia does not republish those
rows. When Aurelia's semantic diagnosis and generated template checker evidence describe the same authored problem,
the semantic diagnosis owns the squiggle and the checker fact appears as related information. The extension does not
expose severity overrides, inline suppression, or a blanket strict mode in the 0.5 release line; those controls would
need a separate, evidence-backed policy.

### Quick fixes — apply only current plans

Edit-backed diagnostics offer conservative quick fixes for source operations the semantic runtime can prove, such as
declaring a missing view-model member or registering an available framework capability. A diagnostic without a proved
edit plan does not advertise a generic repair. Edits are re-planned when selected; if the source changed, VS Code reports
the exact refusal reason and applies nothing.

### Completions — discover what's available

Context-aware suggestions that reflect your actual project. Element tags, bindable attributes, binding commands,
expression members, value converters, and binding behaviors are filtered by what is registered and visible in scope.
Completions carry exact authored replacement ranges and safely compose `.bind` for bindables and `.for` for the
framework `repeat` controller without duplicating an existing command.

### Go to Definition — navigate across boundaries

Jump from template usage to source definition. This works for custom elements, attributes, template controllers,
bindables, expression identifiers, local scope variables, and source-resolvable router `load` paths and route ids. It
crosses the HTML/TypeScript boundary.

### Find References

Find verified usages of source-backed template members and Aurelia resources across your project. When the runtime has
concrete candidate sites it could not verify, or a verified source row cannot be mapped into an editor location, the
request returns the verified subset and reports the omitted count instead of presenting the subset as complete.

### Rename — refactor safely

Rename source-backed template members, bindables and attribute aliases, custom elements, custom attributes, template
controllers, value converters, and binding behaviors when semantic-runtime can prove editable declarations and
verified references. Renames initiated from TypeScript, TSX, JavaScript, or JSX members are extended atomically into
admitted templates. Unverified same-name candidates are left unchanged and reported.

### Semantic Tokens — see the meaning

The server emits semantic classifications for Aurelia elements, attributes, bindables, controllers, commands,
converters, behaviors, metadata elements, events, listener modifiers, and interpolation delimiters. The extension
declares native fallback token types, while the active VS Code theme determines their final appearance.

### Native structure and editing

Document and workspace symbols, document highlights, selection ranges, paired-tag linked editing, and folding ranges
stay in VS Code's native UI and use the same source-backed semantic answers as navigation.

### Resource Discovery

Browse exact runtime resources in the **Aurelia Resources** view in VS Code's built-in Explorer, grouped by kind. The view
covers custom elements, custom attributes, template controllers, value converters, and binding behaviors; compiler-syntax
features such as binding commands and attribute patterns remain outside the runtime-resource inventory. Aliases, bindables,
declaration forms, origin, and exact source navigation stay attached to their owning definition. Multi-root workspaces show
workspace and project ownership where it helps search or disambiguate identical names. Incomplete declaration metadata,
uncertain template availability, updating state, and project-specific failure states remain explicit. A rejected refresh
retains the last coherent tree as out of date. Resource rows provide exact declaration, implementation, and side-by-side
navigation when those targets are proved. Failed or out-of-date project rows offer **Retry Resource Discovery** and
**Open Aurelia Output**; unsupported project rows offer Output without implying that retry can change support.

Use **Aurelia: Go to Resource...** to search navigable resources from the exact inventory across active Aurelia workspaces. Use
**Aurelia: Go to Resource Available to Active Template...** for the exact compiler scope at the current template cursor. The
contextual command asks you to choose when project or template ownership is genuinely ambiguous; it never derives scope from
which Explorer item happens to have focus. Quick Picks keep aliases, bindables, kinds, workspace and project ownership, source
location, and incomplete metadata searchable. A navigation retry repeats the current template-availability proof before opening
anything, so a stale selection cannot be paired with a newer project snapshot.

### Binding Mode Hints

Optional inline hints show the resolved binding mode so you can see whether `.bind` resolves to two-way or to-view for a
given target. They are disabled by default and can be enabled per workspace folder with
`aurelia.inlayHints.bindingMode`.

## What Aurelia constructs are supported

- Custom elements (decorator, convention, `static $au`, and `.define()` forms)
- Custom attributes
- Template controllers (`if`, `else`, `repeat`, `switch`/`case`/`default-case`, `promise`/`pending`/`then`/`catch`, `with`, `portal`, and custom template controllers)
- Framework template elements (`<au-compose>`, `<au-slot>`, and router `<au-viewport>`)
- Value converters
- Binding behaviors
- All standard binding commands (`.bind`, `.to-view`, `.from-view`, `.two-way`, `.one-time`, `.trigger`, `.capture`, `.attr`, `.class`, `.style`, `.ref`)
- Template expressions (property access, member chains, optional chaining, pipes, behaviors)
- Static router instructions and route-parameter object keys when route topology is source-resolvable
- Third-party package resources

## How it handles uncertainty

Most framework tooling either achieves complete knowledge by restricting what you can write, or provides incomplete knowledge without telling you.

This extension takes a different approach: it analyzes what it can analyze, and when it reaches a limit (a dynamic
registration pattern or a complex third-party package), it keeps the uncertainty explicit in the semantic evidence.
Problems stays focused on source-linked, actionable findings. Hover stays on the exact selected identity and directly
owned Aurelia context, plus at most one presented cursor diagnostic or typed uncertainty. Aurelia Resources remains the
place for broader resource inventory and origin context.

The goal is that you can trust what the extension tells you.

## Requirements

- VS Code 1.91 or newer
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
The exact `aurelia.project.json` filename uses VS Code's built-in JSONC language mode. A syntax-only dialect schema
allows the same comments and trailing commas as the runtime parser without defining any project properties. VS Code
therefore owns malformed JSONC and duplicate-key parser diagnostics, while semantic-runtime remains the sole authority
for schema, project meaning, filesystem checks, and exclusions. The language server publishes those semantic
configuration diagnostics only from an admitted session; the canonical full schema is shipped but is not statically
associated with files.

Set `aurelia.activationMode` per workspace folder when automatic admission is not appropriate:

- `auto` uses candidate evidence followed by semantic project-shape confirmation;
- `on` keeps tooling active for dynamic, incomplete, or unusual project layouts;
- `off` excludes that folder and its complete subtree from Aurelia tooling.

An `off` subtree cannot be re-enabled by a nested `on` folder. An admitted outer project may still read code under an
excluded subtree when ordinary imports make it a dependency, but the extension will not directly own its documents,
publish its diagnostics, or include it as authored project source. Disjoint multi-root folders receive independent
language-server sessions. Enabled nested workspace folders are supplied as project-root hints to the same shared
semantic-runtime discovery; the extension does not reinterpret them as projects. Semantic-runtime owns admitted nested projects inside each root, while untitled and
out-of-workspace documents remain unclaimed. The declared `0.5.0` support envelope covers filesystem-backed local
workspaces. Virtual workspaces are unsupported, and remote development is not yet a release-tested promise.

## Settings

| Setting | Default | Scope | Purpose |
|---------|---------|-------|---------|
| `aurelia.activationMode` | `auto` | Workspace folder | Use project-shape-confirmed automatic activation, explicit `on`, or hard subtree exclusion with `off` |
| `aurelia.inlayHints.bindingMode` | `false` | Workspace folder | Show the resolved mode of implicit `.bind` bindings |

## Getting Started

1. Install this extension
2. Open an Aurelia 2 project
3. The language server activates after semantic-runtime confirms the workspace project shape
4. Check **Aurelia LS (Client)** for activation and session status; each active root also has an **Aurelia Language Server (`<workspace-folder-name>`)** channel

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

1. Check **Aurelia LS (Client)** and the active root's **Aurelia Language Server (`<workspace-folder-name>`)** channel for errors
2. Check that relevant source files are included by the project's TypeScript or JavaScript configuration, when one is present
3. Confirm automatic activation has Aurelia dependency, source, or native-configuration evidence; use `aurelia.activationMode: on` for unusual layouts
4. Try reloading the VS Code window

The extension normally runs one language-server Worker per admitted workspace root. To diagnose a Worker-specific
startup or lifecycle problem, launch VS Code with `AURELIA_LS_FORCE_IPC_TRANSPORT=1`; Extension Development Host
debugging selects IPC automatically.

## Feedback

- Report issues: [aurelia/aurelia-ls](https://github.com/aurelia/aurelia-ls/issues)
- Source code: [github.com/aurelia/aurelia-ls](https://github.com/aurelia/aurelia-ls)
