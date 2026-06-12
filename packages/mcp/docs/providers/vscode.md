# VS Code MCP Setup

Install the preview tarball inside the Aurelia app:

```bash
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.1.0-preview.1/aurelia-ls-mcp-0.1.0-preview.1.tgz
```

Create `.vscode/mcp.json` in the Aurelia app:

```json
{
  "servers": {
    "au-mcp": {
      "type": "stdio",
      "command": "node",
      "args": [
        "--max-old-space-size=8192",
        "./node_modules/@aurelia-ls/mcp/au-mcp.js"
      ],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

VS Code also supports user-profile MCP configuration, but workspace config keeps
the server tied to the app-local install. Confirm the trust prompt when VS Code
starts the server.

Use the command palette entries `MCP: List Servers` and `MCP: Show Output` to
check the server state and logs. Then verify with `aurelia_app_overview` or
`typescript-diagnostic-summary`; prefer TypeScript `relation=same-package`.

References:

- [Add and manage MCP servers in VS Code](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
- [VS Code MCP configuration reference](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
