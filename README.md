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
git clone https://github.com/aurelia/aurelia-ls.git
cd aurelia-ls
npm install
npm run build

# Run the SSR demo
cd examples/todo-app
npm install
npm start
# Open http://localhost:5173
```

The demo shows server-rendered HTML with client hydration. View source to see the pre-rendered content.

## Packages

| Package | Purpose |
|---------|---------|
| `@aurelia-ls/compiler` | Template analysis and AOT code generation |
| `@aurelia-ls/resolution` | Resource discovery from TypeScript sources |
| `@aurelia-ls/transform` | Injects compiled artifacts into source files |
| `@aurelia-ls/build` | SSR runtime and Vite plugin |
| `@aurelia-ls/language-server` | Language Server Protocol implementation |
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
