# Aurelia Project Configuration

`aurelia.project.json` is the optional, durable project-semantics file shared by Aurelia tooling. Put it at the exact
root of the project it describes. In a workspace with nested projects, each project root may have its own file.

The current contract is a clean-slate **version 1**. Version 1 includes both authored-source boundaries and finding
presentation policy; there is no earlier authored-source-only V1 to preserve and no supported V2.

## Minimal and complete examples

The smallest configuration is:

```jsonc
{
  "version": 1
}
```

A configuration using every current semantic section is:

```jsonc
{
  // Comments and trailing commas are allowed.
  "version": 1,
  "authoredSources": {
    "excludedRoots": [
      "generated",
      "coverage",
    ],
  },
  "findings": {
    "aurelia.analysis.dynamic-registration-spread": "warning",
  },
}
```

The file uses JSONC: standard JSON values plus comments and trailing commas. JavaScript and TypeScript syntax such as
unquoted property names, hexadecimal numbers, single-quoted strings, or expressions is not accepted.

## Fields and defaults

| Field | Required | Default | Meaning |
| --- | --- | --- | --- |
| `version` | Yes | None | The persisted format version. It must be the unique numeric literal `1`. |
| `authoredSources` | No | No native exclusions | Controls which descendant directories count as authored project source. |
| `authoredSources.excludedRoots` | No | `[]` | Project-relative descendant directory roots excluded from authored-source membership. |
| `findings` | No | Every known rule uses its deterministic default | Maps stable semantic finding rule IDs to presentation dispositions. |
| `$schema` | No | Omitted | Optional string metadata. It does not select the format version or change runtime semantics. |

Unknown or duplicate root fields are errors. The `authoredSources` object also rejects unknown or duplicate fields.
Finding keys are rule IDs rather than a fixed set of ordinary property names; their handling is described below.

There is no stable public schema URL to put in `$schema` today. The VS Code extension recognizes the exact filename and
uses its bundled assistance without that field, so do not guess or copy a schema URL into the file.

## Authored-source exclusions

Each `excludedRoots` entry names one directory boundary relative to the project root. An accepted entry:

- is a non-empty string without leading or trailing whitespace;
- is relative, not absolute, URI/scheme-qualified, or drive-qualified;
- names a strict descendant of the project root;
- uses ordinary path segments, without empty, `.` or `..` segments;
- is a directory root, not a glob or negated pattern;
- contains no control characters; and
- does not name an existing file.

Both `/` and `\` separators are accepted and normalized for the host. The directory does not need to exist yet, which
allows generated-output boundaries to remain stable before a generator runs. Equivalent or nested redundant boundaries
are normalized into the effective exclusion set.

An exclusion changes authored-source membership. It does not create a filesystem read embargo: an admitted source may
still reach a file under that boundary through ordinary module resolution and retain it as dependency evidence. The
setting also does not configure a bundler, delete generated output, or change TypeScript's own module-resolution rules.

## Finding presentation

The `findings` object controls how admitted semantic findings are projected to consumers. It never erases the underlying
analysis evidence and does not change source admission or Resource Explorer completeness.

The current known rule is:

| Rule ID | Default | Meaning |
| --- | --- | --- |
| `aurelia.analysis.dynamic-registration-spread` | `information` | Analysis reached a registration spread whose contents could not be proved statically. |

Every known rule accepts `off`, `information`, `warning`, or `error`:

- `off` suppresses that projected finding and its review row;
- `information`, `warning`, and `error` select its consumer-facing presentation level.

A well-formed namespaced rule ID has at least two lowercase dot-separated segments. Each segment starts with a letter
and then contains lowercase letters or digits, optionally separated by single hyphens. A well-formed ID unknown to the
installed tooling is reported as a warning and ignored. A malformed rule ID, an invalid disposition, or a duplicate
rule declaration is an error for that entry. Valid known sibling rules remain effective.

## Application and failure states

Tooling retains the normalized result and exact diagnostics even when part of a file cannot be applied:

| State | Meaning | Effective result |
| --- | --- | --- |
| `absent` | No exact-root file exists. | No native source exclusions; every finding uses its default. |
| `applied` | The file has a unique supported version and no configuration diagnostics. | Every authored value is accepted. |
| `partial` | The root and version are accepted, but a section or entry has diagnostics. | Valid sibling sections survive. Structurally invalid sections fall back as a unit; supported list or map entries can be retained independently. |
| `rejected` | The file is unreadable, invalid JSONC, not an object, or has a root/version contract error. | No native exclusions or finding overrides are applied; deterministic defaults remain effective. |

For example, a valid `authoredSources` section still applies when `findings` is not an object. A valid known finding rule
still applies when `authoredSources` is malformed. An invalid `authoredSources` container, unknown or duplicate field,
or non-array `excludedRoots` value discards that whole section. Within a structurally valid `excludedRoots` array,
however, valid directory entries survive invalid elements; valid known finding rules likewise survive invalid sibling
entries. Root-level ambiguity is intentionally different: an unknown or duplicate root field rejects the semantic
contents of the file.

The accepted version is `1` when that field is unique and supported, even if an unrelated root error rejects the file.
It is unknown when `version` is missing, duplicated, malformed, or unsupported.

The MCP `aurelia_project_configurations` tool exposes existing files only. Its configuration rows include the accepted
version, `applied` / `partial` / `rejected` state, normalized applied exclusions, complete effective finding policy
including default or project authority, and diagnostic count. Use `view=diagnostics` for exact messages and source
spans. An absent project therefore has defaults internally but no configuration inventory row.

## Project semantics and VS Code settings

Keep durable, cross-consumer project meaning in `aurelia.project.json`. Keep editor lifecycle and presentation choices
in VS Code settings:

| Surface | Owns |
| --- | --- |
| `aurelia.project.json` | Authored-source membership and semantic finding presentation shared by semantic-runtime, the language server, and MCP. |
| `aurelia.activationMode` | Whether the VS Code extension automatically admits, forcibly enables, or excludes a workspace folder. |
| `aurelia.inlayHints.bindingMode` | VS Code presentation for binding-mode inlay hints. |
| `aurelia.templateDiagnostics.suppressNative` | Opt-in suppression of VS Code's built-in HTML, CSS, and JavaScript diagnostics for proved Aurelia templates. |

Extension activation, snippets, UI preferences, and logging do not belong in the project file. Conversely, copying
`authoredSources` or `findings` into `.vscode/settings.json` does not configure the shared semantic runtime.

Native template-diagnostic suppression is disabled by default. Enabling it moves only templates with exact Aurelia
ownership into the extension's `aurelia-html` language mode. This suppresses VS Code's built-in HTML/CSS/JavaScript
diagnostics, including legitimate native findings. HTML language-service participation remains available, but file icons,
`[html]`-scoped settings, snippets, formatter selection, and other native HTML or editor behavior can change. Unowned
HTML remains in native `html` mode.

The VS Code extension associates the exact `aurelia.project.json` filename with bundled, offline annotation assistance
for root fields, sections, known rule IDs, and values. Those suggestions are an editing aid, not a second semantic
validator. VS Code's JSONC service may present editor-local parser feedback for malformed JSONC or duplicate keys;
semantic-runtime remains the sole authority for semantic configuration diagnostics, format acceptance, filesystem
checks, normalized effective values, and application state across consumers.

## Current boundary and future versions

Version 1 is deliberately small. It does not configure resource naming conventions, decorator or `static $au`
interpretation, template compilation, routes, Vite, SSR/SSG, emitted AOT output, build directories, or extension-only
features. Those concerns remain with their current semantic or build owners.

There is no V2 contract today. New known finding rule IDs may extend V1: the namespaced `findings` map is its explicit
forward-compatible lane, and older tooling warns about and ignores a well-formed unknown ID. New root fields or new
grammar inside a fixed section require a new format version because V1 rejects unknown fields rather than silently
guessing their meaning.

Future AOT or convention configuration should enter this file only after IDE, MCP, and build consumers can share the
same meaning, defaults, provenance, and currentness rules. Any incompatible persisted contract must define an explicit
new version and migration boundary rather than assigning new meaning to existing V1 files.
