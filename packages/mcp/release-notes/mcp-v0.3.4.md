# Aurelia MCP 0.3.4

- The default `app-diagnostics` query and its summary include template binding errors. A saved edit or repair is reflected on the next query in the same session.
- File diagnostics give consistent results when requested directly, after a project query, or in a batch. One-off queries for another project preserve the retained project. An invalid page cursor leaves the first page usable.
- Resource and navigation answers respect component-local dependencies, HTML imports and the package that owns a declaration. Application queries retain the component and host when the bootstrap options come from a named constant.
- Template analysis handles HTML character references, escaped inline expressions, explicit form ownership and nested controller scopes. The package continues to use the project's TypeScript with a project-local installation.

## Install after publication

```sh
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.3.4/aurelia-ls-mcp-0.3.4.tgz
```

See the [provider setup guides](https://github.com/aurelia/aurelia-ls/blob/mcp-v0.3.4/packages/mcp/docs/providers/README.md) and the [MCP 0.3 protocol reference](https://github.com/aurelia/aurelia-ls/blob/mcp-v0.3.4/packages/mcp/docs/reference-v0.3.0.md).
