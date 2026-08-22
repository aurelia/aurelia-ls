# WS05 — Provider Composition, Multi-Root, Platform, and Compatibility

Status: `queued`

## Governing invariant

Individually correct semantic and native providers compose into one correct editor experience across supported workspaces,
hosts, operating systems, and framework/toolchain versions.

## Entry criteria

- WS02 and WS03 behavior is stable.
- WS04 lifecycle substrate is in verification.
- The supported VS Code, platform, Aurelia, TypeScript, filesystem, and workspace envelope is explicit.

## Initial threat matrix

- TypeScript-origin references/symbols combined with native TypeScript providers.
- Provider capability/handler/selector parity in owned and unowned documents.
- Duplicate, stolen, or missing answers across HTML, Aurelia HTML, TS/JS variants, JSON, and CSS.
- Multi-root overlap/exclusion and one root churning while another remains stable.
- Windows/macOS/Linux casing, symlink, watcher, and Worker differences.
- VS Code 1.91 minimum versus current stable.
- Aurelia RC2/current compatibility and language-server package boundary.

## Work

1. Assert one canonical reference location set from TypeScript declaration and use, including template contributions.
2. Audit declared capabilities against registered handlers and document selectors.
3. Run real Worker lifecycle/product-support smoke on Windows, macOS, and Linux.
4. Exercise multi-root, watcher ordering, symlink, case, and out-of-workspace pass-through.
5. Decide framework/version compatibility fixtures and whether language-server is bundle-internal.

## Exit criteria

- F-HOST-001 and F-HOST-002 have verified or explicitly bounded dispositions.
- Provider composition produces no duplicate, stolen, or missing answers in supported documents.
- Real host smoke is green on declared platforms and VS Code version lanes.
- Framework, TypeScript, package, and remote/virtual-workspace boundaries are stated consistently.
