# Claude Desktop MCP Setup

Install the preview tarball inside the Aurelia app:

```bash
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.1.0-preview.1/aurelia-ls-mcp-0.1.0-preview.1.tgz
```

Open Claude Desktop settings, go to Developer settings, and edit
`claude_desktop_config.json`.

Config locations:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Use absolute paths so Claude Desktop does not depend on a shell working
directory:

```json
{
  "mcpServers": {
    "au-mcp": {
      "command": "node",
      "args": [
        "--max-old-space-size=8192",
        "C:/absolute/path/to/your/aurelia-app/node_modules/@aurelia-ls/mcp/au-mcp.js"
      ],
      "cwd": "C:/absolute/path/to/your/aurelia-app"
    }
  }
}
```

Fully quit and restart Claude Desktop after editing the config. Then ask Claude
to use `aurelia_app_overview` on the Aurelia app and confirm that the TypeScript
relation is `same-package`.

Reference: [MCP local server setup for Claude Desktop](https://modelcontextprotocol.io/docs/develop/connect-local-servers).
