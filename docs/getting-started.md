# Getting Started

This guide covers setting up the project and running the demos.

## Prerequisites

- Node.js 20+
- npm (or pnpm)

## Installation

```bash
git clone https://github.com/aurelia/aurelia-ls.git
cd aurelia-ls
npm install
npm run build
```

The build compiles all packages using TypeScript project references.

## Running the Demos

### Todo App (SSR + Hydration)

A simple todo application demonstrating server-side rendering with client hydration:

```bash
cd examples/todo-app
npm install
npm start
```

Open http://localhost:5173. The page is server-rendered—view source to see the pre-rendered HTML. The client hydrates without re-rendering, preserving the server output.

### Router App (SSR with Routing)

Demonstrates SSR with the Aurelia router:

```bash
cd examples/router-app
npm install
npm start
```

Navigate between routes. Each page is server-rendered with the correct content.

### AOT Build (Standalone Compilation)

Shows the raw AOT compilation output without a dev server:

```bash
cd examples/aot-build
node demo.mjs
```

This prints the before/after of source transformation, showing how decorators become static `$au` definitions.

## Running Tests

```bash
# All tests
npm test

# Specific package
npm run test:compiler
npm run test:resolution
npm run test:ssr
```

## VS Code Extension

The extension is published on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AureliaEffect.aurelia-2). To install:

```
ext install AureliaEffect.aurelia-2
```

### Developing the Extension Locally

To test local changes to the extension:

1. Open the project in VS Code
2. Run `npm run build` to compile the packages
3. Press F5 (or use Run → Start Debugging)
4. Select "Run Extension (with Hello World workspace)"
5. A new VS Code window opens with the extension loaded
6. Edit `.html` templates to see completions and diagnostics

The launch configuration opens the `fixtures/hello-world` test project by default. To test with a different project, modify the args in `.vscode/launch.json`.

To debug the language server itself, use the "Attach to Server" configuration after launching the extension.

## Next Steps

- Read the [Architecture](./architecture.md) overview
- Explore the example apps in `examples/`
- Check package READMEs for API details
