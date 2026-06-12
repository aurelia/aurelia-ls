# Cursor MCP Setup

Install the preview tarball inside the Aurelia app:

```bash
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.1.0-preview.1/aurelia-ls-mcp-0.1.0-preview.1.tgz
```

Create `.cursor/mcp.json` in the Aurelia app:

```json
{
  "mcpServers": {
    "au-mcp": {
      "type": "stdio",
      "command": "node",
      "args": [
        "--max-old-space-size=8192",
        "${workspaceFolder}/node_modules/@aurelia-ls/mcp/au-mcp.js"
      ]
    }
  }
}
```

Cursor also supports a global `~/.cursor/mcp.json`, but project-local config is
the recommended path for diagnostics that should agree with the app's own
TypeScript install.

Restart Cursor or reload the MCP server after changing the config. Check MCP
logs from the Output panel if the server does not appear. Then verify with
`aurelia_app_overview` or `typescript-diagnostic-summary`; prefer TypeScript
`relation=same-package`.

Reference: [Cursor MCP documentation](https://cursor.com/docs/mcp.md).
