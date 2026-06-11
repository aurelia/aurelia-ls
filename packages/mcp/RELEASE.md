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

## Trial Install

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

Run the client inside the Aurelia project being analyzed. Package managers walk
up from bare directories, so launching from an unrelated folder can make the
temporary install resolve dependencies in the wrong place.

## Project-Local Install

For faster startup and a stable local copy, install the same asset in the
project and call the installed bin:

```powershell
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.1.0-preview.1/aurelia-ls-mcp-0.1.0-preview.1.tgz
```

```json
{
  "mcpServers": {
    "aurelia": {
      "command": "npx",
      "args": ["au-mcp"]
    }
  }
}
```

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
