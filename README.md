# Aurelia Language Server

Language intelligence for Aurelia 2: IDE features, semantic-runtime analysis, and a read-only MCP release for AI coding tools.

## MCP Release

The `@aurelia-ls/mcp` package is distributed as a GitHub Release tarball until npm publishing is available. It is a
local, read-only MCP server that lets AI coding tools inspect Aurelia workspaces, query TypeScript/Aurelia/template
diagnostics, follow router and open-seam surfaces, fetch curated Aurelia Patterns examples, use bundled Aurelia docs
without runtime web requests, and use typed continuation hints.

For trustworthy TypeScript diagnostics, install it inside the project being analyzed:

```bash
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.2.0/aurelia-ls-mcp-0.2.0.tgz
```

Then configure your MCP client to run:

```bash
node --max-old-space-size=8192 ./node_modules/@aurelia-ls/mcp/au-mcp.js
```

Provider-specific config examples are in the
[MCP provider setup guides](packages/mcp/docs/providers/README.md).

For a quick trial:

```bash
npx -y https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.2.0/aurelia-ls-mcp-0.2.0.tgz
```

Direct URL `npx` is convenient for smoke testing, but project-local install is preferred for serious diagnostics because
the analyzer can resolve the same TypeScript package as the workspace. After restarting the MCP client, verify that the
TypeScript relation is `same-package`. See the [MCP README](packages/mcp/README.md) and
[MCP release notes](packages/mcp/release-notes/mcp-v0.2.0.md) for details.

## VS Code Extension

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AureliaEffect.aurelia-2):

```
ext install AureliaEffect.aurelia-2
```

The extension analyzes your Aurelia project and provides:

- **Hover** — exact member and local types, resource and alias identity, bindable types and declaration-default modes, selected static route ids or paths, and one concise cursor diagnostic or typed uncertainty
- **Diagnostics** — source-linked unknown elements and attributes, expression errors, and binding mismatches, with broad
  or non-actionable uncertainty kept out of Problems
- **Completions** — elements, attributes, binding commands, expressions, value converters, binding behaviors — scoped to what's actually registered
- **Go to Definition** — navigate from supported resource, bindable, expression, local, and static route tokens to exact
  source-backed definitions
- **Find References** — return verified resource and member usages and report candidates that could not be verified or
  mapped
- **Rename** — cross-file rename with safety checks (won't apply partial changes)
- **Semantic Tokens** — coloring that distinguishes custom elements from HTML, bindables from plain attributes
- **Aurelia Resources** — browse exact runtime resources in your project from VS Code's Explorer
- **Contextual explanations** — use native Quick Fixes or Resource Explorer actions to explain eligible diagnostics,
  uncertain bindings, authored attribute names, resource availability, and policy-controlled analysis limitations

By default, Aurelia templates remain in VS Code's native `html` mode, retaining built-in HTML/CSS/JavaScript validation,
the default file icon, and ordinary language-scoped settings. Those validators can report false Problems for valid
interpolation such as `style="width: ${value}%"`. Set `aurelia.templateDiagnostics.suppressNative` to `true` for a
workspace folder to move only semantically proved Aurelia templates into **Aurelia HTML** mode and suppress those native
diagnostics, including legitimate native findings. HTML language-service participation and completions remain available,
but this is not full native-mode parity: file icons, `[html]`-scoped settings, snippets, formatter selection, and other
native HTML or editor behavior can change. When suppression is enabled, exact ownership is asynchronous on a cold first
open, so a native diagnostic can appear briefly before admission settles.

See the [extension README](packages/vscode/README.md) for the full feature list and exact invocation points.

## How It Works

The VS Code extension's language server opens each admitted project through the shared **Aurelia semantic runtime**. That
engine owns project discovery, resource inventory and scope, template/compiler projections, diagnostics, explanations,
coverage, and source evidence. The language server owns synchronized documents and protocol projection; the extension
owns VS Code lifecycle and native presentation.

When analysis reaches a dynamic or otherwise unresolved boundary, the semantic model records the missing evidence instead of filling the gap. Problems shows only source-linked, actionable findings. Hover keeps any proved identity or type and adds one author-facing uncertainty status only when a typed carrier proves that the gap materially affects that exact selected answer; broad or unmapped pressure stays out of the default UI.

## Packages

| Package | What it does |
|---------|-------------|
| `@aurelia-ls/mcp` | Read-only MCP server for semantic-runtime workspace/app queries |
| `@aurelia-ls/semantic-runtime` | Aurelia semantic substrate used by the language server and MCP release |
| `@aurelia-ls/atlas` | Internal repo/framework navigation and maintenance lenses |
| `@aurelia-ls/compiler` | Template compiler and project analysis pipeline |
| `@aurelia-ls/semantic-workspace` | Semantic model, incremental invalidation, and feature query surface |
| `@aurelia-ls/language-server` | LSP adapter — translates workspace queries into LSP responses |
| `@aurelia-ls/transform` | Build-time AOT transform (injects compiled templates into source) |
| `@aurelia-ls/vite-plugin` | Vite integration for dev server and production builds |
| `@aurelia-ls/ssr` | Server-side rendering |
| `@aurelia-ls/ssg` | Static site generation |
| `@aurelia-ls/integration-harness` | End-to-end test harness |
| `aurelia-2` | [VS Code extension](https://marketplace.visualstudio.com/items?itemName=AureliaEffect.aurelia-2) |

## Building from Source

```bash
git clone --recurse-submodules https://github.com/aurelia/aurelia-ls.git
cd aurelia-ls

# Build aurelia-ls
pnpm install
pnpm bootstrap:aurelia
pnpm run build
```

The repo links Aurelia framework packages from the `aurelia/` submodule through
`pnpm-workspace.yaml` overrides, so the submodule must be initialized. The root
`pnpm install` creates the direct package links; `pnpm bootstrap:aurelia`
installs the linked Aurelia workspace's dependency closure without running its
lifecycle scripts. The MCP and semantic-runtime paths can then resolve exact
linked package sources when declarations are absent, so they do not require
building the Aurelia submodule itself.

## Documentation

- [Getting Started](./docs/getting-started.md) — setup and installation
- [Project Configuration](./docs/project-configuration.md) — the clean-slate `aurelia.project.json` V1 contract
- [Architecture](./docs/architecture.md) — how the compiler pipeline works

## Status

This is pre-release software under active development. See [CHANGELOG](./CHANGELOG.md) for updates.

## License

MIT
