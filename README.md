# Aurelia Language Server

Ahead-of-time template compilation for Aurelia 2, powering both IDE tooling and server-side rendering.

## What This Does

This project provides an **AOT (ahead-of-time) compiler** for Aurelia 2 templates that serves two purposes:

1. **IDE Support** — Powers the Aurelia VS Code extension (coming soon) with completions, diagnostics, go-to-definition, and type checking inside `.html` templates.

2. **SSR & Hydration** — Compiles templates at build time for server-side rendering, with manifest-based hydration that reconnects the client without re-rendering.

## Quick Demo

```bash
# Clone and install
git clone https://github.com/aurelia/aurelia-ls.git
cd aurelia-ls
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
| `@aurelia-ls/compiler` | Template analysis and AOT code generation |
| `@aurelia-ls/resolution` | Resource discovery from TypeScript sources |
| `@aurelia-ls/transform` | Injects compiled artifacts into source files |
| `@aurelia-ls/build` | SSR runtime and Vite plugin |
| `@aurelia-ls/server` | Language Server Protocol implementation |
| `@aurelia-ls/client` | VS Code extension |

## Documentation

- [Getting Started](./docs/getting-started.md) — Setup, installation, running demos
- [Architecture](./docs/architecture.md) — How the compiler pipeline works

## Status

The AOT compiler and SSR system are functional. The VS Code extension provides basic IDE features. This is pre-release software under active development.

> **Note**: Documentation will be expanded after the initial release is published.

## License

MIT
