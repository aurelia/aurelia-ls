Requires Node >=22.13 <25.

# GitHub Tarball Release

MCP releases are distributed as GitHub Release tarballs until npm
publishing is available. The tarball contains bundled `au-mcp.js`, a generated
`package.json`, and an offline Aurelia docs corpus snapshot under `docs/`; the
workspace package stays private and keeps its workspace dependencies on
semantic-runtime and patterns.

## Build The Tarball

```powershell
pnpm --filter @aurelia-ls/mcp release:pack
```

The command builds the patterns, semantic-runtime, and MCP projects, bundles
`packages/mcp/out/server.js`, leaves public dependencies external, copies
`aurelia/docs/user-docs` into
`packages/mcp/.release/package/docs/aurelia-user-docs`, writes
`docs/aurelia-user-docs.manifest.json`, and creates a tarball under
`packages/mcp/.release`.

Set `AURELIA_DOCS_USER_DOCS_ROOT` to package a different checked-out docs root,
or `AURELIA_DOCS_SOURCE_REVISION` to override the revision recorded in the
manifest. Packaging fails if the docs root is missing.

Run the packaged install smoke before uploading the artifact:

```powershell
pnpm --filter @aurelia-ls/mcp contract:release
pnpm --filter @aurelia-ls/mcp release:pack
pnpm --filter @aurelia-ls/mcp probe:release-tarball
pnpm --filter @aurelia-ls/mcp probe:project-local-install
```

The release contract checks release documentation, adversarial MCP transport
behavior, continuation pass-through, and every curated pattern example through
semantic-runtime app diagnostics.

The main CI workflow runs the same MCP release contract, packages the tarball,
probes the packaged tarball, probes the project-local install path, and uploads
the generated `.tgz` as the `aurelia-ls-mcp-release` workflow artifact. CI does
not create the GitHub Release; the tag and release upload remain an explicit
maintainer step.

The release probe installs the tarball into a temporary project, verifies the
bundled docs manifest, lists the pattern/docs tools and resources, fetches a
pattern example with `support.followUp` semantic-runtime hints, and calls
`aurelia_docs_search` plus `aurelia_docs_fetch` against the installed package.
It also checks the current guarded catalog size of 49 patterns and catalog
sentinels such as `template.dom-ref`, `resource.custom-attribute`,
`router.active-navigation`, `service.fetch-interceptor`,
`router.relative-context-navigation`, `component.dynamic-composition`,
`service.fetch-cache-policy`, `collection.pagination`,
`collection.server-query`, `collection.virtual-repeat`,
`collection.batch-selection`, `form.file-upload`, `form.validation-submit`,
`form.server-validation-errors`, `router.auth-session-guard`,
`localization.i18n-locale-service`, `dialog.confirm-edit`,
`resource.template-controller`, and `template.portal-overlay`
through natural menu searches and example fetches.

The project-local install probe verifies the recommended app-local install path
and checks that TypeScript resolves from the same package context as the app.

## Promote Published Documentation

Source documentation can target the next MCP protocol while install guidance
continues to identify the last hosted tarball. Before creating the 0.3.2 tag:

1. Set `publishedReleaseVersion` to `0.3.2` in
   `scripts/contract-release-docs.mjs`.
2. Promote the MCP release/status/install links in the root README,
   `docs/getting-started.md`, the package README, and every provider guide from
   0.3.1 to 0.3.2, and remove the package README's source-versus-published
   transition wording.
3. Run `pnpm --filter @aurelia-ls/mcp contract:release` again.

Do not create the tag while any current install surface still identifies
0.3.0 as the published release. Historical release notes and the current
protocol reference are excluded from that promotion.

## GitHub Release Flow

```powershell
git tag mcp-v0.3.2
git push origin mcp-v0.3.2
gh release create mcp-v0.3.2 packages/mcp/.release/aurelia-ls-mcp-0.3.2.tgz --title "Aurelia MCP 0.3.2" --notes-file packages/mcp/release-notes/mcp-v0.3.2.md
```

Do not add npm publish steps to this flow yet.

## Recommended Project-Local Install

For diagnostic-authoritative use, install the tarball as a dev
dependency in the Aurelia app being analyzed:

```powershell
npm i -D https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.3.2/aurelia-ls-mcp-0.3.2.tgz
```

Then configure the MCP server from that project:

```json
{
  "mcpServers": {
    "aurelia": {
      "command": "node",
      "args": ["./node_modules/@aurelia-ls/mcp/au-mcp.js"]
    }
  }
}
```

If the MCP client does not launch servers with the project as its working
directory, use the absolute path to `node_modules/@aurelia-ls/mcp/au-mcp.js`
instead. This local install path is preferred because `au-mcp` statically
imports TypeScript, and Node resolves that import from the package install
context. Installing inside the app makes the analyzer TypeScript package line up
with the app's own TypeScript package when the peer dependency is satisfied.

Provider-specific config snippets live in
[docs/providers](./docs/providers/README.md).

Persistent AI authoring rules live in
[docs/ai-authoring.md](./docs/ai-authoring.md). Release verification should
confirm this file remains linked from README/release notes and continues to
teach the Patterns/docs/`support.followUp` workflow, semantic-runtime
diagnostics, DI-owned shared state, router transactions, app-builder exclusion,
and router-direct exclusion.

When asking an AI to set this up, the useful instruction is:

```text
Install the Aurelia MCP release tarball as a dev dependency in this project, then configure the MCP server for my MCP client using the provider guide in packages/mcp/docs/providers. After setup, call aurelia_app_query with queryKind=typescript-diagnostic-summary and confirm the TypeScript relation is same-package.
```

Run the local-install smoke before treating this path as release-ready:

```powershell
pnpm --filter @aurelia-ls/mcp probe:project-local-install
```

## Quick Trial Install

Use the release asset URL directly in an MCP client config:

```json
{
  "mcpServers": {
    "aurelia": {
      "command": "npx",
      "args": ["-y", "https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.3.2/aurelia-ls-mcp-0.3.2.tgz"]
    }
  }
}
```

Direct URL `npx` is convenient for smoke testing, but it installs the server in
a temporary package-manager context. TypeScript diagnostics may therefore
reflect that temporary install context unless the MCP-reported TypeScript
environment says `relation=same-package`. Prefer the project-local install path
for serious diagnostics, app repair, or release acceptance.

Do not recommend global installs for ordinary users. A global install
can be useful for maintainers, but it is easy to mistake global TypeScript
resolution for project-local `tsc` behavior.

Each release uses a new tag and asset URL. Update configs to the new URL
after each release so npx caches cannot serve a stale build.

## Post-Upload Smoke

After uploading the release asset, run a real hosted-URL smoke before sharing
the docs:

```powershell
npx -y https://github.com/aurelia/aurelia-ls/releases/download/mcp-v0.3.2/aurelia-ls-mcp-0.3.2.tgz
```

For a full check, point an MCP client at the same URL and run
`aurelia_workspace_overview` on a small Aurelia project.
