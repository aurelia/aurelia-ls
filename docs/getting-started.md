# Getting Started

## Using the VS Code Extension

Install the Aurelia 2 extension from the Marketplace:

```text
ext install AureliaEffect.aurelia-2
```

Open a filesystem-backed Aurelia 2 project. In the default `auto` activation
mode, dependency manifests, an exact `aurelia.project.json`, or an already-open
Aurelia entry source provide candidate evidence. Semantic-runtime confirms the
project shape before the extension retains the language-server session.

Use these quick checks after activation:

- Hover a custom-element tag to see its resource identity and Aurelia kind.
- Ctrl+click a supported tag, attribute, member, or route token to navigate to
  source.
- Type `<` inside a template to request element completions.
- Open **Aurelia Resources** in Explorer to browse the admitted workspace roots'
  resource inventory.
- Run **Aurelia: Go to Resource...** to search admitted resource rows.

If discovery fails, use **Open Aurelia Output** from the view or affected
project row. The client channel is **Aurelia LS (Client)**; each active root has
an **Aurelia Language Server (`<workspace-folder-name>`)** channel.

Set `aurelia.activationMode` per workspace folder for unusual layouts:

- `auto` uses candidate evidence followed by semantic project confirmation;
- `on` explicitly keeps tooling active;
- `off` excludes the folder and its complete subtree from Aurelia tooling.

VS Code 0.5.2 supports VS Code 1.91+ and filesystem-backed local workspaces.
Virtual workspaces are unsupported; remote development is outside the
release-tested host envelope.

### Optional project configuration

Add `aurelia.project.json` at an exact project root when the project needs a
durable authored-source exclusion or semantic finding presentation shared by
the editor and MCP:

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

The file is optional. See [Project Configuration](./project-configuration.md)
for the complete V1 reference.

### Optional native-diagnostic suppression

Aurelia templates stay in VS Code's native `html` mode by default, including
embedded CSS and JavaScript diagnostics. If those validators report false
Problems for valid interpolation, set
`aurelia.templateDiagnostics.suppressNative` to `true` for the affected
workspace folder.

Only exactly owned templates move into **Aurelia HTML** mode. This suppresses
embedded CSS/JavaScript diagnostics, including legitimate findings, and may
change native HTML editor behavior. Keep the default unless interpolation noise
outweighs that loss, and preserve the disabled checks in project lint or build
tooling.

## Using the MCP Release

`@aurelia-ls/mcp` is a local MCP server for source-grounded Aurelia analysis,
curated Patterns, and bundled Aurelia docs. The MCP server makes no project-file
writes; cache management changes only in-memory analysis state.

The latest hosted release is 0.3.1. See the
[MCP package README](../packages/mcp/README.md) for the versioned protocol reference.

To align MCP diagnostics with the project's TypeScript, install the hosted MCP
release tarball inside the project being analyzed:

```bash
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.3.1/aurelia-ls-mcp-0.3.1.tgz
```

Configure the MCP client to launch the app-local package:

```bash
node --max-old-space-size=8192 ./node_modules/@aurelia-ls/mcp/au-mcp.js
```

Provider-specific examples are in the
[MCP provider setup guides](../packages/mcp/docs/providers/README.md).

After restarting the client, call `aurelia_app_query` with
`queryKind=typescript-diagnostic-summary`. Project-local installation should
report `relation=same-package`. The response tells you when the analyzer uses a
different TypeScript package or cannot find the workspace installation.

## Building From Source

Requirements:

- Node >=22.13 <25
- pnpm 11.5.2
- Git submodules

```bash
git clone --recurse-submodules https://github.com/aurelia/aurelia-ls.git
cd aurelia-ls
pnpm install
pnpm bootstrap:aurelia
pnpm build
```

Workspace overrides link Aurelia framework packages from the `aurelia/`
submodule. `pnpm bootstrap:aurelia` installs that linked workspace's dependency
closure without running lifecycle scripts.

## Running Tests

Run the root build and workspace Vitest suite:

```bash
pnpm test
```

The current IDE release gates are separated by responsibility:

```bash
# Semantic-runtime, conformance, and cross-surface assurance
pnpm test:ide:assurance

# Language-server and VS Code suites
pnpm test:language-server
pnpm test:vscode

# Support and packaging contracts
pnpm test:ide:support
```

`pnpm test:ide` builds the IDE packages and runs the language-server and VS Code
suites. `test:ide:assurance` covers semantic-runtime, conformance, and lanes.
The `test:sem-*` commands cover the retained semantic-workspace package.

Real Extension Host acceptance is available through:

```bash
pnpm test:vscode:extension-host:release
```

The command runs current stable and VS Code 1.91 sequentially for local use.
CI runs the two lanes in parallel. The release workflow additionally installs
the single packaged VSIX into isolated current/minimum hosts and publishes that
same artifact after both lanes pass.

## Developing the Extension Locally

1. Open the repository in VS Code.
2. Press F5 or choose **Run → Start Debugging**.
3. Select **Run Extension (with Hello World workspace)**.

The pre-launch task builds and bundles the extension, then opens
`fixtures/hello-world` in a new Extension Development Host. Change the launch
arguments in `.vscode/launch.json` to use another project.

## Next Steps

- Read the [VS Code extension reference](../packages/vscode/README.md).
- Read the [MCP package and protocol reference](../packages/mcp/README.md).
- Review [Project Configuration V1](./project-configuration.md) before adding
  `aurelia.project.json`.
- Read the [Architecture](./architecture.md) overview for contributor-facing
  ownership and data flow.
