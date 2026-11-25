# Aurelia MCP 0.3.4

- App diagnostics and their summary now include template binding errors by default and update after saved edits.
- Fixed inconsistent results when requesting file diagnostics individually or in a batch. Querying a second project now preserves the first project's session.
- Template queries now follow re-exported HTML imports and respect TypeScript project references.

## Install after publication

```sh
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.3.4/aurelia-ls-mcp-0.3.4.tgz
```

See the [provider setup guides](https://github.com/aurelia/aurelia-ls/blob/mcp-v0.3.4/packages/mcp/docs/providers/README.md) and the [MCP 0.3 protocol reference](https://github.com/aurelia/aurelia-ls/blob/mcp-v0.3.4/packages/mcp/docs/reference-v0.3.0.md).
