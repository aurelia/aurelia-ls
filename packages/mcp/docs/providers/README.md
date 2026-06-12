# MCP Provider Setup

Install the preview tarball inside the Aurelia app before configuring any MCP
client:

```bash
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.1.0-preview.1/aurelia-ls-mcp-0.1.0-preview.1.tgz
```

The recommended launch command is always the app-local package:

```bash
node --max-old-space-size=8192 ./node_modules/@aurelia-ls/mcp/au-mcp.js
```

Provider guides:

- [Codex](./codex.md)
- [Claude Code](./claude-code.md)
- [Claude Desktop](./claude-desktop.md)
- [Cursor](./cursor.md)
- [VS Code](./vscode.md)

After setup, restart the MCP client and run `aurelia_app_overview` or
`aurelia_app_query` with `queryKind=typescript-diagnostic-summary`. A good
project-local install reports a TypeScript relation of `same-package`.

Global or user-profile installs are convenient, but they can resolve a different
TypeScript package than the Aurelia app. Use project-local install for
diagnostics that should agree with project-local `tsc`.
