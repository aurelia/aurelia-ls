# Aurelia MCP 0.2.0

Second public tarball release for the Aurelia MCP server, adding Aurelia
Patterns, bundled docs grounding, and removed Aurelia 1 binding-command
diagnostics on top of the semantic-runtime query surface.

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
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.2.0/aurelia-ls-mcp-0.2.0.tgz
```

Then configure your MCP client to run:

```sh
node ./node_modules/@aurelia-ls/mcp/au-mcp.js
```

Quick trial:

```sh
npx -y https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.2.0/aurelia-ls-mcp-0.2.0.tgz
```

## Requirements

- Node >=22.13 <25
- TypeScript >=5.9 <7
- For best diagnostic fidelity, install the MCP package inside the project
  being analyzed.

## What Is Included

This release focuses on semantic-runtime analysis:

- workspace and Aurelia app discovery
- TypeScript and Aurelia diagnostics
- template diagnostics, cursor info, and completions
- removed Aurelia 1 `.delegate` / `.call` binding-command diagnostics (`AUR0713`)
- router and route-surface inspection
- binding/resource/open-seam query surfaces
- typed query catalogs and continuation hints
- curated Aurelia Patterns menu/example tools for authoring starting points
- bundled Aurelia docs search/fetch with no runtime web requests
- prompts/resources to help MCP clients orient themselves

## Aurelia Patterns And Docs

This release includes a compact Aurelia Patterns surface:

- `aurelia_pattern_menu`
- `aurelia_pattern_example`

When authoring new Aurelia code, use the menu to choose a curated pattern and
fetch the example by stable `patternId`. The returned source is meant to be
adapted by the user, editor, or AI client. Pattern examples include assumptions,
handoff notes, stable docs refs where available, and compact `support.followUp`
hints for semantic-runtime checks to run after adaptation.
The guarded catalog currently includes 49 patterns. Release sentinels include
`template.dom-ref`, `resource.custom-attribute`, `router.active-navigation`,
`service.fetch-interceptor`, `router.relative-context-navigation`, and
`component.dynamic-composition`, `service.fetch-cache-policy`,
`collection.pagination`, `collection.server-query`, `collection.virtual-repeat`,
`collection.batch-selection`, `form.file-upload`, `form.validation-submit`,
`form.server-validation-errors`, `router.auth-session-guard`,
`localization.i18n-locale-service`, `dialog.confirm-edit`,
`resource.template-controller`, and `template.portal-overlay`.

The release also includes bundled docs tools:

- `aurelia_docs_search`
- `aurelia_docs_fetch`

Docs answers come from the packaged Aurelia docs snapshot, so MCP clients do
not need runtime web requests for framework grounding.

For persistent AI rules, see
[`docs/ai-authoring.md`](../docs/ai-authoring.md). It contains a compact
copyable instruction block for project rule files and names the recommended
Patterns/docs/`support.followUp` workflow, semantic-runtime diagnostics,
DI-owned shared state and router transactions.

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
