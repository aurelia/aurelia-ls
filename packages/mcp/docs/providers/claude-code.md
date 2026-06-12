# Claude Code MCP Setup

Install the preview tarball inside the Aurelia app:

```bash
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.1.0-preview.1/aurelia-ls-mcp-0.1.0-preview.1.tgz
```

For a team-shared project configuration, create `.mcp.json` in the Aurelia app:

```json
{
  "mcpServers": {
    "au-mcp": {
      "type": "stdio",
      "command": "node",
      "args": [
        "--max-old-space-size=8192",
        "${CLAUDE_PROJECT_DIR:-.}/node_modules/@aurelia-ls/mcp/au-mcp.js"
      ],
      "timeout": 120000
    }
  }
}
```

Claude Code sets `CLAUDE_PROJECT_DIR` for local stdio MCP servers. The default
fallback keeps the config usable when the project directory variable is absent.

For a private local setup, run this from the Aurelia app root:

```bash
claude mcp add --transport stdio au-mcp -- node --max-old-space-size=8192 ./node_modules/@aurelia-ls/mcp/au-mcp.js
```

Use `/mcp` inside Claude Code, or `claude mcp list`, to check that the server is
connected. Then verify with `aurelia_app_overview` or
`typescript-diagnostic-summary`; prefer TypeScript `relation=same-package`.

If startup is slow on a large workspace, start Claude Code with a larger MCP
startup timeout:

```bash
MCP_TIMEOUT=30000 claude
```

Reference: [Claude Code MCP documentation](https://docs.anthropic.com/en/docs/claude-code/mcp).
