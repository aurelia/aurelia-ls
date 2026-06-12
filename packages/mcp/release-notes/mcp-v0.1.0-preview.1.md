# Aurelia MCP 0.1.0 Preview 1

First public preview tarball for the Aurelia semantic-runtime MCP server.

This is a local, read-only MCP server for inspecting Aurelia projects. It gives
AI coding tools source-grounded access to workspace/app overview, TypeScript
and Aurelia diagnostics, template diagnostics and completions, router/query
surfaces, open seams, and typed continuation hints.

The server never writes to your project. It reads the workspace, builds a
semantic model, and returns structured answers that an AI client or developer
can act on.

## Install

Recommended project-local install for trustworthy TypeScript diagnostics:

```sh
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.1.0-preview.1/aurelia-ls-mcp-0.1.0-preview.1.tgz
```

Then configure your MCP client to run:

```sh
node ./node_modules/@aurelia-ls/mcp/au-mcp.js
```

Quick trial:

```sh
npx -y https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.1.0-preview.1/aurelia-ls-mcp-0.1.0-preview.1.tgz
```

## Requirements

- Node >=22.13 <25
- TypeScript >=5.9 <7
- For best diagnostic fidelity, install the MCP package inside the project
  being analyzed.

## What Is Included

This preview focuses on semantic-runtime analysis:

- workspace and Aurelia app discovery
- TypeScript and Aurelia diagnostics
- template diagnostics, cursor info, and completions
- router and route-surface inspection
- binding/resource/open-seam query surfaces
- typed query catalogs and continuation hints
- prompts/resources to help MCP clients orient themselves

## Experimental App-Builder Surface

This preview also includes the early app-builder/source-guidance surface.

Treat this part as highly experimental. It can return Aurelia-oriented source
plans, source previews, and lowering guidance in the app-builder query family,
but its query shape, presets, naming, policy model, and public positioning are
expected to change substantially.

It is included for exploration and feedback, not as a stable generation
contract. The MCP server still does not write files; any returned source or
guidance must be applied by the user, editor, or AI client.

## TypeScript Diagnostic Fidelity

Direct URL `npx` is convenient for smoke testing, but project-local install is
preferred for serious diagnostics because the analyzer can resolve the same
TypeScript package as the workspace.

Check `typescript-diagnostic-summary` and prefer `relation=same-package`.

## Local Verification

The release tarball was validated with:

- packaged MCP server smoke test
- project-local install smoke test
- TypeScript same-package diagnostic relation probe
