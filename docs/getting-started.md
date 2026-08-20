# Getting Started

## Using the VS Code Extension

The fastest way to use this project is through the VS Code extension:

```
ext install AureliaEffect.aurelia-2
```

Open a filesystem-backed Aurelia 2 project. Dependency manifests, exact
`aurelia.project.json` presence, or an already-open Aurelia entry source provide
candidate evidence for a provisional language-server session. Semantic-runtime
then confirms the workspace's project shape; the extension retains the session
only for an admitted Aurelia project and otherwise retires it. Once analysis
completes, the **Aurelia Resources** view in VS Code's Explorer shows the
resources admitted for the active workspace.

Try these to verify it's working:

- **Hover** a custom element tag to see its exact resource identity and Aurelia kind
- **Ctrl+click** a tag name to jump to the component class
- **Type `<`** inside a template to see element completions
- Open **Aurelia Resources** in VS Code's Explorer to browse your project's resources
- Run **Aurelia: Go to Resource...** from the Command Palette to search resources by name

If discovery fails, use **Open Aurelia Output** from the view or the affected
project row. The client channel is named **Aurelia LS (Client)**, and each
active workspace folder has its own **Aurelia Language Server (...)** channel.

### Optional project configuration

Add `aurelia.project.json` at an exact project root only when the project needs a durable authored-source exclusion or
semantic finding presentation policy shared by the editor and MCP. The current clean-slate format is V1:

```jsonc
{
  "version": 1,
  "authoredSources": {
    "excludedRoots": ["generated"]
  },
  "findings": {
    "aurelia.analysis.dynamic-registration-spread": "warning"
  }
}
```

The file is optional; defaults apply when it is absent. See [Project Configuration](./project-configuration.md) for
JSONC rules, defaults, path validation, section-local failures, VS Code editing/diagnostic assistance, and MCP
inspection.

### Optional native-diagnostic suppression

Aurelia templates stay in VS Code's native `html` mode by default, including its built-in HTML, CSS, and JavaScript
diagnostics. If those validators report false positives for valid Aurelia interpolation, enable the resource-scoped
`aurelia.templateDiagnostics.suppressNative` setting for that workspace folder. Templates proved to belong to Aurelia
then use `aurelia-html` mode and suppress the built-in diagnostics; unowned HTML is unchanged. Because language mode can
influence file icons, `[html]`-scoped settings, snippets, formatter selection, and other native HTML or editor behavior,
this behavior is opt-in. It also suppresses legitimate native findings, although HTML language-service participation
and completions remain available.

## Using the MCP Release

The `@aurelia-ls/mcp` release is a local, read-only MCP server for AI coding
tools. It can inspect Aurelia workspaces, query TypeScript/Aurelia/template
diagnostics, read router and open-seam surfaces, and return typed continuation
hints.

For trustworthy TypeScript diagnostics, install the release tarball inside the
project being analyzed:

```bash
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.2.0/aurelia-ls-mcp-0.2.0.tgz
```

Then configure your MCP client to run:

```bash
node --max-old-space-size=8192 ./node_modules/@aurelia-ls/mcp/au-mcp.js
```

Provider-specific config examples are in the
[MCP provider setup guides](../packages/mcp/docs/providers/README.md).

For a quick smoke test, direct URL `npx` also works:

```bash
npx -y https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.2.0/aurelia-ls-mcp-0.2.0.tgz
```

Project-local install is preferred for serious diagnostics because the analyzer
can resolve the same TypeScript package as the workspace. Check
`aurelia_app_overview` or `typescript-diagnostic-summary` after restarting the
MCP client and prefer `relation=same-package`. Global or user-profile installs
are convenient, but may report `different-version` when they resolve a different
TypeScript package than the project.

## Prerequisites (for building from source)

- Node.js 22.13+
- pnpm 11.5+

## Building from Source

```bash
git clone --recurse-submodules https://github.com/aurelia/aurelia-ls.git
cd aurelia-ls

# Build aurelia-ls
pnpm install
pnpm bootstrap:aurelia
pnpm run build
```

The project uses the Aurelia framework as a git submodule. The
`overrides` in `pnpm-workspace.yaml` link directly to packages inside
`aurelia/`, so the submodule must be initialized. `pnpm bootstrap:aurelia`
installs that linked workspace's dependency closure without running lifecycle
scripts. The MCP and semantic-runtime release paths do not require building the
Aurelia submodule itself.

> **Note:** The submodule setup is temporary while we work towards full
> bi-directional compatibility with Aurelia.

## Running Tests

```bash
# Everything
pnpm test

# IDE features (semantic runtime + language server + VS Code)
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

## Example Apps

The `examples/` directory has demo apps for the build-time features:

- **todo-app** — SSR with client hydration (`pnpm start`, then view
  source to see pre-rendered HTML)
- **router-app** — SSR with Aurelia router
- **aot-build** — raw AOT compilation output (`node demo.mjs`)

## Next Steps

- Read the [Architecture](./architecture.md) overview
- Read the [Project Configuration](./project-configuration.md) contract before adding `aurelia.project.json`
- Check the [VS Code extension README](../packages/vscode/README.md)
  for the full feature list
- Explore the example apps in `examples/`
