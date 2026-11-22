# Aurelia 2

Language intelligence for Aurelia 2 templates using the shared Aurelia semantic runtime.

The extension models component contracts and template-to-TypeScript connections.
It recognizes decorators, conventions, `static $au`, `.define()` calls, package
resources visible to analysis, and Aurelia binding syntax.

Unproven facts stay explicit in semantic evidence. Problems excludes broad or
non-actionable uncertainty. Hover includes typed uncertainty only when it affects
the selected answer; broader resource state appears in **Aurelia Resources**.

## Features

### Hover

Hover selects one supported Aurelia token at its exact authored range. Template
members and locals show the selected type and any proved local role. Bare
`$this` shows the current binding context; each authored `$parent` hop shows the
corresponding ancestor context.

Member cards may include source documentation, visibility, and deprecation.
Exact calls may show the selected overload or instantiated generic signature.
Resource cards show authored identity and Aurelia kind, adding an alias
relationship or implementation when source evidence proves it. Bindable
declarations show their public type and declared default mode. Bindable usages
show the current effective mode and its authority. Static route IDs and paths
show their selected route context.

A card includes at most one presented cursor diagnostic or typed uncertainty
that affects its answer. Broad origin and provenance stay in **Aurelia
Resources**, and resource-tag hover does not enumerate bindables.

### Diagnostics

Source-linked diagnostics cover unknown elements and attributes, expression
errors, and binding mismatches. Errors identify definite correctness or
configuration failures. Warnings identify high-confidence risks that Aurelia may
still tolerate at runtime. Information is reserved for exact, actionable
incomplete-analysis loci. Broad ownership/admission uncertainty and operational
failures stay out of standalone Problems.

VS Code's native TypeScript/JavaScript provider owns ordinary Program
diagnostics; Aurelia does not republish those rows. When Aurelia's semantic
diagnosis and generated template checker evidence describe the same authored
problem, the semantic diagnosis owns the squiggle and the checker fact appears
as related information. The 0.5 release line has no severity overrides, inline
suppression, or blanket strict mode.

VS Code's built-in HTML service validates embedded style and script text without
interpreting Aurelia interpolation. Templates use native `html` mode with those
validators by default. Setting
`aurelia.templateDiagnostics.suppressNative=true` for a workspace folder moves
exactly proved templates into **Aurelia HTML** mode. This removes interpolation
false positives such as `style="width: ${value}%"` together with legitimate
embedded CSS/JavaScript findings. Enable it when that tradeoff fits the project,
and replace the disabled validation with project lint or build checks.

Exactly owned templates keep bounded Aurelia recovery Problems for supported
malformed tags, attributes, comments, declarations, and foreign-content CDATA
in either language mode. This coverage is a defined recovery set, not a general
HTML validator.

Aurelia HTML retains HTML language-service participation and completions. As a
separate language mode, it can change file icons, `[html]`-scoped settings,
snippets, formatter selection, and related editor behavior. Unowned HTML stays
native, and global `html.validate.*` settings are unchanged.
When suppression is enabled, cold ownership proof is asynchronous, so native diagnostics can appear briefly before the
mode settles. Withdrawing ownership or disabling suppression restores native `html` mode and validation.

### Quick fixes

Edit-backed diagnostics offer quick fixes for proved source operations, such as
declaring a missing view-model member or registering an available framework
capability. Only diagnostics with a proved plan offer a repair. Selecting a fix
re-plans it against current source; an invalidated plan returns its exact refusal
reason and applies nothing.

### Explanations

Explanations are available when semantic-runtime identifies one exact current
subject:

- On an eligible framework-capability Problem, open Quick Fix and choose **Explain this Aurelia diagnostic**.
- On an eligible binding with material uncertainty, open Quick Fix and choose **Explain this Aurelia binding**. This
  action can be available even when the binding does not produce a Problem.
- Put the cursor in a non-plain, top-level authored HTML attribute name and open Quick Fix to choose
  **Explain how Aurelia uses this attribute**. Attribute values and secondary inline multi-binding parts do not offer the
  action, and the extension does not claim that a missing compiler effect means an attribute was ignored.
- With an Aurelia-owned HTML template active, open a supported **Aurelia Resources** row's context menu and choose
  **Explain Availability in Active Template**. If more than one current compiler scope is possible, choose the exact scope
  first.

Explanations use VS Code's native picker and modal UI. They can disclose
incomplete or truncated evidence and re-check the document and semantic answer
before opening source. These source-context actions do not appear in the Command
Palette.

### Analysis limitations

When the **Aurelia Resources** view reports a current analysis limitation eligible for review, choose
**Review Analysis Limitations** from the view title to inspect its exact source and reason. Version 1
`aurelia.project.json` files can control the presentation of the currently admitted rule:

```json
{
  "version": 1,
  "findings": {
    "aurelia.analysis.dynamic-registration-spread": "warning"
  }
}
```

The accepted dispositions are `off`, `information`, `warning`, and `error`. They change consumer presentation only.
`off` can suppress the projected finding and its review row; it does not erase the underlying limitation or change
resource coverage in **Aurelia Resources**. Version 1 also owns `authoredSources.excludedRoots`; see the shared
[Project Configuration](https://github.com/aurelia/aurelia-ls/blob/main/docs/project-configuration.md) contract for
defaults and failure behavior.

### Completions

Suggestions use the resources and members registered and visible in the current
project scope. They cover element tags, bindable attributes, binding commands,
expression members, value converters, and binding behaviors.
Completions carry exact authored replacement ranges and safely compose `.bind` for bindables and `.for` for the
framework `repeat` controller without duplicating an existing command.

### Go to Definition

Navigate from template usage to source definition. This works for custom elements, attributes, template controllers,
bindables, expression identifiers, local scope variables, and source-resolvable router `load` paths and route ids. It
crosses the HTML/TypeScript boundary.

### Find References

Find verified usages of source-backed template members and Aurelia resources
across your project. The result contains verified rows and an omitted count when
candidate sites cannot be verified or mapped into editor locations.

### Rename

Rename covers source-backed template members, bindables and aliases, custom
elements and attributes, template controllers, value converters, and binding
behaviors when declarations are editable and references are verified. Renames
initiated from TypeScript, TSX, JavaScript, or JSX members extend atomically into
admitted templates after the complete current transaction is verified.

An unverified candidate, stale target, excluded target, or physical file
mismatch refuses the whole transaction. Supported VS Code F2 journeys apply a
multi-file rename as one undo unit.

### Semantic Tokens

The server emits semantic classifications for Aurelia elements, attributes, bindables, controllers, commands,
converters, behaviors, metadata elements, events, listener modifiers, and interpolation delimiters. The extension
declares native fallback token types, while the active VS Code theme determines their final appearance.

### Native structure and editing

Document and workspace symbols, document highlights, selection ranges, paired-tag linked editing, and folding ranges
stay in VS Code's native UI and use the same source-backed semantic answers as navigation.

### Resource Discovery

**Aurelia Resources** in Explorer shows the current runtime resource inventory,
grouped by kind. It covers custom elements, custom attributes, template
controllers, value converters, and binding behaviors. Compiler syntax such as
binding commands and attribute patterns has separate ownership.

Each definition keeps its aliases, bindables, declaration form, origin, and
exact source targets. Multi-root results include workspace and project identity
when needed for search or disambiguation. Resource rows offer declaration,
implementation, and side-by-side navigation when those targets are proved.

Declaration metadata, selected-template availability, refresh status, and
project failures are reported separately. A rejected refresh keeps the last
coherent tree and marks it out of date. Failed and out-of-date projects offer
**Retry Resource Discovery** and **Open Aurelia Output**. Unsupported projects
offer Output.

Icons carry one meaning at each tree level:

- Projects show their project role.
- Collections show resource kind.
- Resources show local-template, project, package, core-framework,
  official-plugin, external, or unknown provenance/locality.
- Aliases show their relationship to the canonical resource.
- Bindables show their declared default, one-time, to-view, from-view, two-way,
  or unknown mode.

Text, tooltips, and accessibility labels carry the same information. Status
colors identify failed, incomplete or invalid, unsupported, and out-of-date
projects. Pathless, duplicate, and open resources keep neutral styling.

Opaque third-party registries can leave inventory or selected-template
availability open. In that state, an unobserved resource name is not treated as
definitely absent.

Use **Aurelia: Go to Resource...** to search current navigable inventory across
active workspaces. **Aurelia: Go to Resource Available to Active Template...**
uses the exact compiler scope at the template cursor and prompts when project or
template ownership is ambiguous. Quick Picks search resource details, ownership,
source location, and incomplete metadata. Before opening a retried navigation,
the extension repeats the template-availability proof against the current
project snapshot.

### Binding Mode Hints

Optional inline hints show whether `.bind` resolves to two-way or to-view for a
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

## How uncertainty is represented

Dynamic registration and opaque package code can leave static analysis open.
The extension preserves the exact facts it has proved and records the missing
evidence separately. Problems stays focused on source-linked, actionable
findings. Hover stays with the selected identity and directly owned context,
plus at most one relevant diagnostic or typed uncertainty. **Aurelia Resources**
carries broader inventory, origin, and availability state.

## Requirements

- VS Code 1.91 or newer
- An Aurelia 2 project identifiable from framework dependencies, source evidence, explicit activation, or native
  `aurelia.project.json` configuration
- A workspace filesystem accessible to the VS Code extension host

## Workspace Activation

Automatic activation starts with dependency manifests, an open Aurelia entry
source, or exact `aurelia.project.json` presence. Semantic-runtime then confirms
the project shape. Confirmed sessions can represent an Aurelia app, resource
library authoring, package inspection, or an exact configuration file. Other
HTML and TypeScript workspaces stay inactive.

`aurelia.project.json` opens in VS Code's built-in JSONC mode with bundled,
offline editing assistance. VS Code reports local JSONC syntax and duplicate-key
feedback. Semantic-runtime owns format acceptance, semantic diagnostics,
filesystem checks, normalized exclusions, finding policy, and application state
across consumers. The current V1 contract includes
`authoredSources.excludedRoots` and stable finding IDs with `off`, `information`,
`warning`, or `error` presentation. No public schema URL is currently published,
and semantic configuration diagnostics require an admitted session. See
[Project Configuration](https://github.com/aurelia/aurelia-ls/blob/main/docs/project-configuration.md) for the complete
contract.

Set `aurelia.activationMode` per workspace folder when automatic admission is not appropriate:

- `auto` uses candidate evidence followed by semantic project-shape confirmation;
- `on` keeps tooling active for dynamic, incomplete, or unusual project layouts;
- `off` excludes that folder and its complete subtree from Aurelia tooling.

`off` is a hard subtree boundary and a nested `on` cannot re-enable it. Normal
imports may still read excluded files as dependencies, while authored document
ownership and diagnostics stay outside the subtree.

Disjoint workspace roots receive independent language-server sessions. Enabled
nested folders become project-root hints; semantic-runtime decides the admitted
project boundaries inside each root. Untitled and out-of-workspace documents
stay unclaimed.

Version 0.5 supports filesystem-backed local workspaces. Virtual workspaces are
unsupported, and remote development is outside the release-tested host envelope.

## Settings

| Setting | Default | Scope | Purpose |
|---------|---------|-------|---------|
| `aurelia.activationMode` | `auto` | Workspace folder | Use project-shape-confirmed automatic activation, explicit `on`, or hard subtree exclusion with `off` |
| `aurelia.inlayHints.bindingMode` | `false` | Workspace folder | Show the resolved mode of implicit `.bind` bindings |
| `aurelia.templateDiagnostics.suppressNative` | `false` | Workspace folder | Opt into quieter interpolation at the cost of embedded CSS/JavaScript Problems |

## Getting Started

1. Install this extension
2. Open an Aurelia 2 project
3. Candidate evidence starts a provisional language-server session;
   semantic-runtime then confirms the workspace project shape. The extension
   retains the session after admission.
4. Check **Aurelia LS (Client)** for activation and session status. Each active
   root also has an **Aurelia Language Server (`<workspace-folder-name>`)**
   channel.

## Commands

The extension assigns `Alt+R` to **Open Related File** while a supported Aurelia-owned HTML or script editor has text
focus. This is a configurable VS Code default: use the Keyboard Shortcuts editor to replace or remove it. Other Aurelia
commands remain unbound unless you assign them.

| Command | Shortcut | Description |
|---------|----------|-------------|
| Aurelia: Go to Resource... | — | Search current navigable resource inventory across active Aurelia workspace folders |
| Aurelia: Open Related File | `Alt+R` | Open a component class or file-backed template, prompting when topology proves multiple counterparts |
| Aurelia: Go to Resource Available to Active Template... | — | Search resources reported for the active template cursor's current compiler scope, prompting when scope is ambiguous |
| Aurelia: Refresh | — | Refresh the Aurelia Resources view |
| Aurelia: Create Support Report | — | Open a local JSON report with extension, workspace, request, and Worker information |

## Troubleshooting

If VS Code shows `Request textDocument/diagnostic failed`, or an Aurelia Problem still names text you changed,
keep the affected file active and run **Aurelia: Create Support Report** from the Command Palette **before reloading
the window**. Reloading starts a new session and clears in-memory evidence.

Use the same command if an Aurelia workspace fails to start. The report records the first startup exception
in this window, the stage that failed, the activation evidence and a recognized error code when available.
The active document identifies its nearest configured workspace folder. Use `workspaceId` to correlate
the failure, configured folder and client session **within the same report**.
If that workspace subsequently starts, `nextSuccessfulStart` records when. For example,
`resolve-server-module` with `AURELIA_SERVER_MODULE_UNAVAILABLE` means the extension could not locate its
server entry point. Check the extension installation and reinstall if the bundle is missing.

For a checker mismatch, a live server's `analysisCache.cachedApps` identifies each retained project by a
masked ID. Its `typeScript` field shows the analyzer and workspace versions and their relationship.
This evidence is available after the server has analyzed a project. Private version labels are omitted.
If a framework version is relevant, include the installed version of `aurelia` or `@aurelia/runtime-html`
for the affected project. The report does not inspect workspace dependencies.

The command opens a local JSON document with extension and VS Code versions, session and Worker status,
and recent log excerpts. It keeps the first diagnostic request error since the extension started, including
a short excerpt of its message and any server incident ID. It also records the next successful diagnostic
request for the same file, if one has completed. Workspace and document identities are masked. Error messages
and logs can still contain project names or snippets. Review the document and remove private text before
attaching it to an issue. The command does not upload the report.

For the original error, open **View → Output** and select **Aurelia Language Server (`<workspace-folder-name>`)**
for the affected folder. Look for the request, message, and code around the time of the failure.
**Aurelia LS (Client)** shows extension activation, server starts, and Worker failures. If you report an issue,
include the reviewed report and the action just before the failure, such as opening the folder or editing an
unsaved template. If the report is unavailable, include the relevant Output lines after reviewing them.

After capturing the evidence, check whether Problems updates on your next edit to the same file. If it stays
stale, try **Developer: Reload Window**. If a workspace never activates, check its
[activation settings](#workspace-activation) and whether the project's TypeScript or JavaScript configuration
includes the affected source.

The extension normally runs one language-server Worker per admitted workspace root. To diagnose a Worker-specific
startup or lifecycle problem, launch VS Code with `AURELIA_LS_FORCE_IPC_TRANSPORT=1`; Extension Development Host
debugging selects IPC automatically.

## Feedback

- Report issues: [aurelia/aurelia-ls](https://github.com/aurelia/aurelia-ls/issues)
- Source code: [github.com/aurelia/aurelia-ls](https://github.com/aurelia/aurelia-ls)
