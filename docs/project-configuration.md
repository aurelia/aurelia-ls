# Aurelia Project Configuration

`aurelia.project.json` is the optional, durable project-semantics file shared by Aurelia tooling. Put it at the exact
root of the project it describes. In a workspace with nested projects, each project root may have its own file.

The current contract is **version 1**. It includes authored-source boundaries
and finding presentation policy. There is no supported V2.

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
Finding keys use namespaced rule IDs; their handling is described below.

The VS Code extension recognizes the exact filename and provides bundled editing
assistance without a `$schema` field. There is no stable public schema URL to
add today.

## Authored-source exclusions

Each `excludedRoots` entry names one directory boundary relative to the project root. An accepted entry:

- is a non-empty string without leading or trailing whitespace;
- is relative, not absolute, URI/scheme-qualified, or drive-qualified;
- names a strict descendant of the project root;
- uses ordinary path segments, without empty, `.` or `..` segments;
- is a directory root, not a glob or negated pattern;
- contains no control characters; and
- does not name an existing file.

Both `/` and `\` separators are accepted and normalized for the host. The
directory may name future generated output, so it can be configured before a
generator runs. Equivalent or nested redundant boundaries are normalized into
the effective exclusion set.

Exclusions change authored-source membership. Normal module resolution may
still read excluded files as dependency evidence. Bundling, generated output,
and TypeScript module resolution stay with their existing owners.

## Finding presentation

The `findings` object controls how admitted semantic findings are projected to consumers. Presentation policy leaves the
underlying analysis evidence, source admission, and resource-analysis coverage unchanged.

The current known rule is:

| Rule ID | Default | Meaning |
| --- | --- | --- |
| `aurelia.analysis.dynamic-registration-spread` | `information` | Analysis reached a registration spread whose contents could not be proved statically. |

Every known rule accepts `off`, `information`, `warning`, or `error`:

- `off` suppresses eligible projected findings; it does not promise a visible review row;
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

Failures remain local to a section where possible. A valid `authoredSources`
section still applies when `findings` is invalid, and a valid known finding rule
still applies when `authoredSources` is malformed. An invalid section container
rejects that section. For `authoredSources`, unknown or duplicate fields and a
non-array `excludedRoots` value also reject the section. Valid entries in a
structurally valid list or map survive invalid siblings. Unknown or duplicate
root fields reject the file's semantic contents.

The accepted version is `1` whenever the version field is unique and supported,
even if an unrelated root error rejects the file. Otherwise it is unknown.

The MCP `aurelia_project_configurations` tool exposes existing files only. Its
default view reports the accepted version, application state, applied
exclusions, and diagnostic count. Each effective finding policy says whether it
came from the project or a default. Use `view=diagnostics` for exact messages
and source spans. A project without a configuration still uses defaults
internally, but has no inventory row.

## Project semantics and VS Code settings

Keep durable, cross-consumer project meaning in `aurelia.project.json`. Keep editor lifecycle and presentation choices
in VS Code settings:

| Surface | Owns |
| --- | --- |
| `aurelia.project.json` | Authored-source membership and semantic finding presentation shared by semantic-runtime, the language server, and MCP. |
| `aurelia.activationMode` | Whether the VS Code extension automatically admits, forcibly enables, or excludes a workspace folder. |
| `aurelia.inlayHints.bindingMode` | VS Code presentation for binding-mode inlay hints. |
| `aurelia.templateDiagnostics.suppressNative` | Opt-in suppression of VS Code's embedded CSS and JavaScript diagnostics for proved Aurelia templates. |

Extension activation, snippets, UI preferences, and logging stay in VS Code
settings. Shared `authoredSources` and `findings` policy stays in
`aurelia.project.json`.

Native template-diagnostic suppression is disabled by default. Enabling it moves
only exactly owned Aurelia templates into `aurelia-html`. This removes embedded
CSS/JavaScript diagnostics and can change normal HTML editor behavior such as
icons, scoped settings, snippets, or formatter selection. Unowned HTML stays in
native `html` mode.

Aurelia's bounded recovery Problems remain available in either mode, but they
are not a general HTML validator. Enable suppression only when interpolation
noise outweighs the lost CSS/JavaScript coverage, and replace that coverage with
project lint or build checks.

The VS Code extension associates the exact filename with a separate, bundled
editor-assistance schema. VS Code's JSONC service can report syntax and
duplicate-key problems. Project meaning comes from semantic-runtime's canonical
schema and parser, which own format acceptance, semantic diagnostics,
filesystem checks, and the effective configuration applied across consumers.

## Current boundary and future versions

Version 1 covers source boundaries and finding presentation. Other framework,
build, and editor concerns stay with their existing owners.

New known finding rule IDs may extend V1 through the namespaced `findings` map;
older tooling warns about and ignores well-formed unknown IDs. Because V1
rejects unknown root fields, new root structure or section grammar requires a
new format version.

Future AOT or convention settings belong here only when IDE, MCP, and build
consumers can share one contract and lifecycle. Incompatible changes require an
explicit new version and migration boundary.
