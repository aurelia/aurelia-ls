# Aurelia Language Server

Ahead-of-time template compilation for Aurelia 2, powering both IDE tooling and server-side rendering.

## What This Does

This project provides an **AOT (ahead-of-time) compiler** for Aurelia 2 templates that serves two purposes:

1. **IDE Support** — Powers the [Aurelia 2 VS Code extension](https://marketplace.visualstudio.com/items?itemName=AureliaEffect.aurelia-2) with diagnostics, completions, hover, go-to-definition, and type checking inside `.html` templates.

2. **SSR & Hydration** — Compiles templates at build time for server-side rendering, with manifest-based hydration that reconnects the client without re-rendering.

## VS Code Extension

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AureliaEffect.aurelia-2):

```
ext install AureliaEffect.aurelia-2
```

Features:
- **Diagnostics** — Type errors in bindings, unknown elements and attributes
- **Completions** — Custom elements, bindable properties, expressions
- **Hover** — Type information for expressions
- **Go to Definition** — Navigate from template to component class
- **Find References** — Locate usages across templates

## Quick Demo

```bash
# Clone and install
git clone --recurse-submodules https://github.com/aurelia/aurelia-ls.git
cd aurelia-ls

# Build the Aurelia framework (submodule)
# Note: The submodule is a temporary setup during development while we work
# towards full bi-directional compatibility with Aurelia. This allows faster
# iteration on changes that span both repositories.
cd aurelia
npm ci
npm run build
cd ..

# Build aurelia-ls
pnpm install
pnpm run build

# Run the SSR demo
cd examples/todo-app
pnpm install
pnpm start
# Open http://localhost:5173
```

The demo shows server-rendered HTML with client hydration. View source to see the pre-rendered content.

## Packages

| Package | Purpose |
|---------|---------|
| `@aurelia-ls/compiler` | Project-semantics + template analysis (`10-lower` → `20-link` → `30-bind` → `40-typecheck`) and AOT/overlay synthesis |
| `@aurelia-ls/semantic-workspace` | Incremental semantic graph and query APIs used by IDE features |
| `@aurelia-ls/language-server` | Language Server Protocol host and IDE integration |
| `@aurelia-ls/transform` | Injects compiled artifacts into source files |
| `@aurelia-ls/vite-plugin` | Vite integration for dev server and builds |
| `@aurelia-ls/ssr` | Server-side rendering core |
| `@aurelia-ls/ssg` | Static site generation |
| `@aurelia-ls/integration-harness` | End-to-end fixture harness for cross-package scenarios |
| `aurelia-2` | VS Code extension ([marketplace](https://marketplace.visualstudio.com/items?itemName=AureliaEffect.aurelia-2)) |

## Documentation

- [Getting Started](./docs/getting-started.md) — Setup, installation, running demos
- [Architecture](./docs/architecture.md) — How the compiler pipeline works

## Status

| Component | Status |
|-----------|--------|
| AOT Compiler | Functional |
| SSR/Hydration | Working in demos |
| Vite Plugin | Dev mode working |
| VS Code Extension | Published |

This is pre-release software under active development. See [CHANGELOG](./CHANGELOG.md) for updates.

## License

MIT
