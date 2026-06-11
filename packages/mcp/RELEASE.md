Requires Node >=22.13 <25.

# Preview Release

The current MCP preview is distributed as a GitHub Release tarball until npm
publishing is available. The tarball contains only `au-mcp.js` and a generated
`package.json`; the workspace package stays private and keeps its workspace
dependency on semantic-runtime.

## Build The Tarball

```powershell
pnpm --filter @aurelia-ls/mcp release:pack
```

The command builds semantic-runtime and the MCP package, bundles
`packages/mcp/out/server.js` with semantic-runtime inlined, leaves public
dependencies external, writes `packages/mcp/.release/package`, and creates a
tarball under `packages/mcp/.release`.

Run the packaged install smoke before uploading the artifact:

```powershell
pnpm --filter @aurelia-ls/mcp probe:release-tarball
```

## GitHub Release Flow

```powershell
git tag mcp-v0.1.0-preview.1
git push origin mcp-v0.1.0-preview.1
gh release create mcp-v0.1.0-preview.1 packages/mcp/.release/aurelia-ls-mcp-0.1.0-preview.1.tgz --title "Aurelia MCP 0.1.0 preview 1" --notes "Preview MCP tarball for Aurelia semantic-runtime."
```

Do not add npm publish steps to this flow yet.

## Recommended Project-Local Install

For diagnostic-authoritative preview use, install the tarball as a dev
dependency in the Aurelia app being analyzed:

```powershell
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.1.0-preview.1/aurelia-ls-mcp-0.1.0-preview.1.tgz
```

Then configure the MCP server from that project:

```json
{
  "mcpServers": {
    "aurelia": {
      "command": "node",
      "args": ["./node_modules/@aurelia-ls/mcp/au-mcp.js"]
    }
  }
}
```

If the MCP client does not launch servers with the project as its working
directory, use the absolute path to `node_modules/@aurelia-ls/mcp/au-mcp.js`
instead. This local install path is preferred because `au-mcp` statically
imports TypeScript, and Node resolves that import from the package install
context. Installing inside the app makes the analyzer TypeScript package line up
with the app's own TypeScript package when the peer dependency is satisfied.

When asking an AI to set this up, the useful instruction is:

```text
Install the Aurelia MCP preview tarball as a dev dependency in this project, then configure the MCP server to run node ./node_modules/@aurelia-ls/mcp/au-mcp.js from the project root. After setup, call aurelia_app_query with queryKind=typescript-diagnostic-summary and confirm the TypeScript relation is same-package.
```

Run the local-install smoke before treating this path as release-ready:

```powershell
pnpm --filter @aurelia-ls/mcp probe:project-local-install
```

## Quick Trial Install

Use the release asset URL directly in an MCP client config:

```json
{
  "mcpServers": {
    "aurelia": {
      "command": "npx",
      "args": ["-y", "https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.1.0-preview.1/aurelia-ls-mcp-0.1.0-preview.1.tgz"]
    }
  }
}
```

Direct URL `npx` is convenient for smoke testing, but it installs the server in
a temporary package-manager context. TypeScript diagnostics may therefore
reflect that temporary install context unless the MCP-reported TypeScript
environment says `relation=same-package`. Prefer the project-local install path
for serious diagnostics, app repair, or release acceptance.

Do not recommend global installs for ordinary preview users. A global install
can be useful for maintainers, but it is easy to mistake global TypeScript
resolution for project-local `tsc` behavior.

Each preview release uses a new tag and asset URL. Update configs to the new URL
after each release so npx caches cannot serve a stale build.

## Post-Upload Smoke

After uploading the release asset, run a real hosted-URL smoke before sharing
the docs:

```powershell
npx -y https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.1.0-preview.1/aurelia-ls-mcp-0.1.0-preview.1.tgz
```

For a full check, point an MCP client at the same URL and run
`aurelia_workspace_overview` on a small Aurelia project.
