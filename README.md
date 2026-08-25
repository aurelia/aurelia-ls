# Aurelia Language Tooling

Aurelia 2 language intelligence is available through a VS Code extension and a
local MCP server. Both use the shared **Aurelia semantic runtime** and work from
the same project model.

## VS Code Extension

Install [Aurelia 2](https://marketplace.visualstudio.com/items?itemName=AureliaEffect.aurelia-2)
from the Marketplace:

```text
ext install AureliaEffect.aurelia-2
```

The extension provides:

- Template completions and enriched hover.
- Definitions, references, highlights, and safety-checked rename.
- Aurelia findings and Quick Fixes that re-check the current document.
- Semantic coloring and source-backed document structure, with optional
  binding-mode hints.
- Resource inventory and availability, with origin, alias, and bindable context.
- Contextual explanations for supported diagnostics, binding uncertainty,
  attribute interpretation, resource availability, and configured limitations.

See the [extension README](packages/vscode/README.md) for the full reference and
troubleshooting. Version-specific changes and the complete 0.4-to-0.5 migration
are in the [extension changelog](packages/vscode/CHANGELOG.md).

## MCP Release

`@aurelia-ls/mcp` exposes a source-grounded Aurelia app model to AI coding
clients. It includes diagnostics, resource and route analysis, curated Aurelia
Patterns, and bundled Aurelia docs. The MCP server makes no project-file writes;
cache management changes only in-memory analysis state.

The latest hosted tarball is MCP 0.3.0. Its
[package README](packages/mcp/README.md) links the versioned protocol reference.

To keep MCP diagnostics aligned with the project's TypeScript, install the
hosted release inside the Aurelia app:

```bash
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.3.0/aurelia-ls-mcp-0.3.0.tgz
```

Then configure the MCP client to run:

```bash
node --max-old-space-size=8192 ./node_modules/@aurelia-ls/mcp/au-mcp.js
```

See the [provider setup guides](packages/mcp/docs/providers/README.md) and the
published [MCP 0.3.0 release notes](packages/mcp/release-notes/mcp-v0.3.0.md).

## Shared Semantic Runtime

`@aurelia-ls/semantic-runtime` is the internal model shared by the language
server and MCP. It models the project and produces semantic answers with the
evidence needed to judge their scope and freshness.

Responsibilities around the shared model are divided as follows:

- The language server keeps documents synchronized and maps semantic answers to
  LSP.
- The VS Code extension manages workspace activation, processes, and native
  editor presentation.
- MCP adapts the model for AI clients and adds Aurelia Patterns plus bundled
  Aurelia docs.

Analysis is bounded to static, source-resolvable behavior. Dynamic boundaries
stay visible in answer coverage and explanations; runtime execution is outside
the model.

## Repository Map

| Package | Role | Status |
|---|---|---|
| `aurelia-2` | VS Code extension | Current product |
| `@aurelia-ls/mcp` | Local MCP server | Current product; GitHub tarball distribution |
| `@aurelia-ls/semantic-runtime` | Shared semantic authority | Current internal substrate |
| `@aurelia-ls/language-server` | LSP lifecycle and protocol adapter | Current internal VS Code path |
| `@aurelia-ls/patterns` | Curated Patterns and Aurelia docs snapshot support | Current internal MCP content |
| `@aurelia-ls/atlas` | Repository/framework navigation and architecture memory | Internal maintainer tooling |
| `@aurelia-ls/lane-harness` | Cross-surface language-server acceptance | Internal assurance tooling |
| `@aurelia-ls/integration-harness` | Compiler/build integration fixtures | Internal assurance tooling |
| `@aurelia-ls/compiler` | Earlier template compiler pipeline | Retained legacy/internal package |
| `@aurelia-ls/semantic-workspace` | Earlier semantic workspace engine | Retained legacy/internal package |
| `@aurelia-ls/transform`, `@aurelia-ls/vite-plugin` | Build-time/AOT packages | Retained outside the current VS Code/MCP release lines |
| `@aurelia-ls/ssr`, `@aurelia-ls/ssg` | Rendering packages | Retained outside the current VS Code/MCP release lines |

## Build From Source

Requires Node >=22.13 <25 and pnpm 11.5.2. The repository links Aurelia framework
packages from the `aurelia/` submodule.

```bash
git clone --recurse-submodules https://github.com/aurelia/aurelia-ls.git
cd aurelia-ls
pnpm install
pnpm bootstrap:aurelia
pnpm build
```

`pnpm bootstrap:aurelia` installs the linked framework workspace's dependency
closure without running lifecycle scripts. See [Getting Started](docs/getting-started.md)
for focused product setup, tests, and extension debugging.

## Documentation

- [Getting Started](docs/getting-started.md)
- [Project Configuration V1](docs/project-configuration.md)
- [VS Code extension reference](packages/vscode/README.md)
- [MCP package and protocol reference](packages/mcp/README.md)
- [Architecture](docs/architecture.md)
- [Cross-consumer changelog](CHANGELOG.md)

## Status

VS Code 0.5.0 and MCP 0.3.0 are under active release preparation. Published
product links above identify the currently hosted artifacts.

## License

MIT
