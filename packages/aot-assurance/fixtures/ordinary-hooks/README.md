# Ordinary authoring-hook assurance

This fixture is grounded in Aurelia's semi-real-life tabs example in
`aurelia/packages/__tests__/src/3-runtime-html/process-content.spec.ts`.
It deliberately retains `querySelectorAll('tab')`, `querySelector(':scope > tab')`,
`append(...tab.childNodes)` and variadic insertion of generated projection templates.

The selector result is a static list while original tabs are moved and removed. Generated header events and classes
use receiver scope; projected content keeps its authored bindings and event scope. Generated `if` views control panels.
Nine browser checkpoints exercise tab changes, authored events, collection edits, new hosts, keyed reordering,
host removal and hide/update/restore, followed by full teardown.

Both lanes must match independent expectations. Strict AOT must emit exactly `ordinary-hooks-app` and `ordinary-tabs`,
with no fallback. This is ordinary DOM support over the compiler forest, not an assertion of complete CSS/native DOM
support; unsupported selectors and native effects retain the shared typed boundary.
