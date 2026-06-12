# Aurelia Language Server

Language intelligence for Aurelia 2: IDE features, semantic-runtime analysis, and a read-only MCP preview for AI coding tools.

## MCP Preview

The first `@aurelia-ls/mcp` preview is distributed as a GitHub Release tarball. It is a local, read-only MCP server that
lets AI coding tools inspect Aurelia workspaces, query TypeScript/Aurelia/template diagnostics, follow router and
open-seam surfaces, and use typed continuation hints.

For trustworthy TypeScript diagnostics, install it inside the project being analyzed:

```bash
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.1.0-preview.1/aurelia-ls-mcp-0.1.0-preview.1.tgz
```

Then configure your MCP client to run:

```bash
node ./node_modules/@aurelia-ls/mcp/au-mcp.js
```

For a quick trial:

```bash
npx -y https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.1.0-preview.1/aurelia-ls-mcp-0.1.0-preview.1.tgz
```

Direct URL `npx` is convenient for smoke testing, but project-local install is preferred for serious diagnostics because
the analyzer can resolve the same TypeScript package as the workspace. See the [MCP README](packages/mcp/README.md) and
[MCP release notes](packages/mcp/release-notes/mcp-v0.1.0-preview.1.md) for details.

## VS Code Extension

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AureliaEffect.aurelia-2):

```
ext install AureliaEffect.aurelia-2
```

The extension analyzes your Aurelia project and provides:

- **Hover** — component interfaces, binding modes, types, contextual variables, provenance
- **Diagnostics** — unknown elements, missing bindables, binding mismatches — with confidence-based severity so you don't get false positives on valid code
- **Completions** — elements, attributes, binding commands, expressions, value converters, binding behaviors — scoped to what's actually registered
- **Go to Definition** — jump from template to source for any Aurelia construct
- **Find References** — locate all usages of a component or bindable across templates
- **Rename** — cross-file rename with safety checks (won't apply partial changes)
- **Semantic Tokens** — coloring that distinguishes custom elements from HTML, bindables from plain attributes
- **Resource Explorer** — browse all resources in your project from the sidebar

See the [extension README](packages/vscode/README.md) for the full feature list and screenshots.

## How It Works

The project is built around a **semantic workspace** that analyzes your Aurelia project — scanning source files, third-party packages, builtins, and configuration — and builds a unified model of every resource, its bindables, its registration scope, and where each piece of knowledge came from.

The language server and the AOT compiler both consume this model. IDE features get their answers from the same analysis that drives compilation, which means hover, diagnostics, and completions all agree with each other and with the build output.

When the analysis hits a limit — a dynamic registration pattern, a third-party package the analyzer can't fully trace — it records what it couldn't determine and why. Diagnostics demote to warnings, hover cards show confidence indicators, completions flag gaps. The goal is that you can trust what the tooling tells you.

## Packages

| Package | What it does |
|---------|-------------|
| `@aurelia-ls/mcp` | Read-only MCP server for semantic-runtime workspace/app queries |
| `@aurelia-ls/semantic-runtime` | Aurelia semantic substrate used by the MCP preview |
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
pnpm run build
```

The repo links Aurelia framework packages from the `aurelia/` submodule through
`pnpm-workspace.yaml` overrides, so the submodule must be initialized. The MCP
and semantic-runtime preview paths do not require building the Aurelia submodule
itself.

## Documentation

- [Getting Started](./docs/getting-started.md) — setup and installation
- [Architecture](./docs/architecture.md) — how the compiler pipeline works

## Status

This is pre-release software under active development. See [CHANGELOG](./CHANGELOG.md) for updates.

## License

MIT
