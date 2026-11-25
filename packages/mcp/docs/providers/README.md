# MCP Provider Setup

Install the MCP release tarball inside the Aurelia app before configuring any MCP
client. The server requires Node `>=22.13 <25` and the TypeScript peer
`>=5.9 <7`.

```bash
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.3.4/aurelia-ls-mcp-0.3.4.tgz
```

When npm installs the executable under the app's own `node_modules`, launch it with:

```bash
node --max-old-space-size=8192 ./node_modules/@aurelia-ls/mcp/au-mcp.js
```

For a workspace-hoisted install, run `node -p "require.resolve('@aurelia-ls/mcp/au-mcp.js')"`
from the app and use the resulting absolute executable path in the provider configuration.

Provider guides:

- [Codex](./codex.md)
- [Claude Code](./claude-code.md)
- [Claude Desktop](./claude-desktop.md)
- [Cursor](./cursor.md)
- [VS Code](./vscode.md)

After configuring the server, add the compact project-rule guidance from
[Aurelia AI Authoring Guidance](../ai-authoring.md) to the agent or workspace
rule file for your MCP client. It teaches when to use Patterns, bundled docs,
and `support.followUp` semantic-runtime verification.

After setup, restart the MCP client and run `aurelia_app_overview` or
`aurelia_app_query` with `queryKind=typescript-diagnostic-summary`. A good
project-local install reports a TypeScript relation of `same-package`.

Global or user-profile installs are convenient, but they can resolve a different
TypeScript package than the Aurelia app. Use project-local install for
diagnostics that should agree with project-local `tsc`.
