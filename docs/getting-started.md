# Getting Started

## Using the VS Code Extension

The fastest way to use this project is through the VS Code extension:

```
ext install AureliaEffect.aurelia-2
```

Open any Aurelia 2 project (one with `aurelia` or `@aurelia/*` in its
dependencies and a `tsconfig.json`) and the language server starts
automatically. You should see the Aurelia status bar item appear with
resource and template counts once analysis completes.

Try these to verify it's working:

- **Hover** a custom element tag to see its bindable interface
- **Ctrl+click** a tag name to jump to the component class
- **Type `<`** inside a template to see element completions
- Open the **Resource Explorer** in the sidebar to browse your project's resources
- Press **Ctrl+Alt+A** to search resources by name

Check the "Aurelia Language Server" output channel if anything isn't working.

## Prerequisites (for building from source)

- Node.js 20+
- pnpm

## Building from Source

```bash
git clone --recurse-submodules https://github.com/aurelia/aurelia-ls.git
cd aurelia-ls

# Build the Aurelia framework (submodule)
cd aurelia
npm ci
npm run build
cd ..

# Build aurelia-ls
pnpm install
pnpm run build
```

The project uses the Aurelia framework as a git submodule. The
`pnpm.overrides` in `package.json` link directly to packages inside
`aurelia/`, so the submodule must be built first.

> **Note:** The submodule setup is temporary while we work towards full
> bi-directional compatibility with Aurelia.

## Running Tests

```bash
# Everything
pnpm test

# IDE features (language server + semantic workspace)
pnpm test:ide

# Feature matrix (cross-feature × cross-resource-kind)
pnpm test:sem-matrix

# Compiler stages
pnpm test:compiler
pnpm test:20-link
pnpm test:30-bind
pnpm test:40-typecheck

# SSR
pnpm test:ssr
```

## Developing the Extension Locally

1. Open the project in VS Code
2. Run `pnpm run build`
3. Press F5 (or Run → Start Debugging)
4. Select "Run Extension (with Hello World workspace)"
5. A new VS Code window opens with the extension loaded

The launch configuration opens the `fixtures/hello-world` test project
by default. Modify the args in `.vscode/launch.json` to test with a
different project.

To debug the language server, use the "Attach to Server" configuration
after launching the extension.

## Example Apps

The `examples/` directory has demo apps for the build-time features:

- **todo-app** — SSR with client hydration (`pnpm start`, then view
  source to see pre-rendered HTML)
- **router-app** — SSR with Aurelia router
- **aot-build** — raw AOT compilation output (`node demo.mjs`)

## Next Steps

- Read the [Architecture](./architecture.md) overview
- Check the [VS Code extension README](../packages/vscode/README.md)
  for the full feature list
- Explore the example apps in `examples/`
