# Codex MCP Setup

Install the preview tarball inside the Aurelia app:

```bash
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.1.0-preview.1/aurelia-ls-mcp-0.1.0-preview.1.tgz
```

Add a project-local server entry to Codex `config.toml`. This can live in
`.codex/config.toml` for a trusted project, or in your user-level Codex config
if you prefer to keep the server private.

```toml
[mcp_servers.au-mcp]
command = "node"
args = ["--max-old-space-size=8192", "./node_modules/@aurelia-ls/mcp/au-mcp.js"]
cwd = "C:/absolute/path/to/your/aurelia-app"
startup_timeout_sec = 30
tool_timeout_sec = 120
enabled = true
```

Restart Codex after changing MCP config. In Codex CLI, `/mcp` shows configured
servers and their connection state.

Verify with `aurelia_app_overview` or `aurelia_app_query` using
`queryKind=typescript-diagnostic-summary`. A good project-local install reports
TypeScript `relation=same-package`.

Some Codex tool-search surfaces can lag behind the directly registered MCP
tools. If a search-style lookup does not show the Aurelia tools after setup,
restart Codex and try calling an Aurelia MCP tool directly.

Reference: [Codex MCP documentation](https://developers.openai.com/codex/mcp).
