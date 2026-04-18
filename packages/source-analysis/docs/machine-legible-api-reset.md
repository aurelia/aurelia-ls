# Machine-Legible API Reset

This note records the current corrective direction for `packages/source-analysis`.

It exists because the package drifted away from the intended machine-facing
inquiry law and over-compressed that law into a conversational or
natural-language command shell.

That drift is now considered architectural error, not merely unfinished polish.

## The misunderstanding

The intended surface was never:

- a natural-language conversation layer
- a capability-help shell
- a question-planning assistant
- a noun/verb/alias-ranking interface

The intended surface was:

- a machine-legible semantic API
- over one truth core
- with durable answer algebra
- first-class miss-path honesty
- governing-anchor jump
- and continuation basis

Natural-language or heuristic routing was tolerated as scaffolding.
It is no longer acceptable as the center of gravity of the package.

## Non-negotiable direction

We are not done until the current natural-language and heuristic API surface is
gone from the primary package contract and replaced by the right primitives.

For this package, "done" does **not** mean:

- the current `ask.question` path works better
- the ranking gets smarter
- the aliases get broader
- the `describe` / `plan` / `repair` shell becomes more helpful
- the conversational family taxonomy becomes more internally coherent

For this package, "done" means:

- natural-language ingress is removed from the primary API
- noun/verb/alias and confusion ranking are removed from the primary API
- hand-authored conversational inquiry families are removed as the primary
  entry surface
- typed primitive operations become the first-class machine contract

## What must be removed

The following are now considered transitional scaffolding to eliminate rather
than refine:

- `describe.capabilities`
- `describe.inquiries`
- `plan.question`
- `ask.question`
- `repair.command`
- capability and inquiry ingress catalogs as the main way to reach semantic
  work
- noun, verb, alias, and confusion matching as a routing mechanism
- natural-language "which command should I use?" as a core package burden

If some future system wants natural-language adapters, they should live
*outside* this package's semantic authority core and consume the primitive API
rather than define it.

## What must replace it

The replacement surface should be primitive-first and machine-legible.

The exact final operation set still needs design work, but it should be shaped
around durable semantic primitives such as:

- typed focus or selector inputs
- declaration and symbol search
- reference and witness search
- export, member, and face identity resolution
- declaration-world and current-world construction
- registration and constructor evidence inspection
- compile-time DI carrier inspection
- analyzability, completeness, frontier, and retreat exposure
- governing-anchor and continuation fields carried as structured result slots

The answer algebra remains valuable.
The current conversational shell does not.

## Related Reset

The same corrective logic now applies to the historical
`deps` / `typerefs` / `exports` query layer.

Those commands may remain useful, but the snapshot-first loader and giant
query-local truth ownership are now considered retirement targets rather than
architecture to preserve.

See [deps-typerefs-exports-retirement.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/deps-typerefs-exports-retirement.md).

## Design law

The durable contract is:

- answer algebra
- first-class result kinds
- miss-path honesty
- governing-anchor jump
- continuation basis

It is not:

- a command list
- a renderer shape
- a help catalog
- a prose question router

## Exit criteria

This reset is complete only when all of the following are true:

1. The primary host or public API no longer requires natural-language question
   strings to reach semantic work.
2. Semantic capabilities are reachable through typed primitives rather than
   capability or inquiry family ranking.
3. The package no longer depends on noun/verb/alias/confusion matching to pick
   semantic operations.
4. Result kinds, closure basis, provenance, governing anchors, and
   continuation basis remain available as structured machine outputs.
5. Any remaining NL adapter is clearly outside the semantic authority core and
   is not needed for correct steering of the package itself.

## Immediate practical consequence

When choosing the next architectural move, prefer:

- removing conversational ingress paths
- exposing one more semantic primitive
- narrowing one more typed selector family
- replacing one more ranked family choice with direct structured access

Do not prefer:

- improving the wording of the current shell
- adding more aliases
- teaching the planner more examples
- adding more family labels
- keeping the current API because it feels familiar
