# DI Interface Key Lens Charter

Use this note when shaping the current Aurelia interface-key lens.

## Lens

- Name: DI interface key lens
- Status: active thin slice
- Related code:
  - `src/aurelia/di-interface-*.ts`
  - `src/aurelia/api-detection*.ts`

## Burden

- Given an exported Aurelia-facing value, recover whether it closes on an
  interface-symbol key created through `createInterface(...)`, including any
  default resolver strategy attached within the bounded export/value ceiling.

## Subject

Current subjects:

- exported interface-symbol key values
- interface-symbol aliases
- default registrations baked into interface construction

Current ingress:

- package entrypoint export lens only

Explicitly out of scope:

- consumer-side DI lookup
- full current-world or container-topology consequence
- whole-program call-outcome recovery

## Canonical Record

Current canonical carrier:

- `InterfaceRecord`

The record should answer only these irreducible burdens:

- exported owner identity
- interface-symbol key identity
- alias path needed to recover that key
- default registration basis when the key carries one

Projection-only fields include:

- package-level counts
- review summaries
- human-oriented source snippets

## Evaluator Ceiling

Current bounded spend:

- exported value closure
- bounded alias chasing
- `DI.createInterface(...)` detection
- helper-alias detection such as `tcCreateInterface`
- first returned builder registration recovery

## Load-Bearing Coverage

This lens is not representative unless it covers at least:

- direct `createInterface(...)`
- namespace/member and helper aliases
- interface-symbol export aliases
- default resolver strategies including callback/cached callback variants

## Cost Rules

- Reuse one Aurelia lens context per collection pass.
- Prefer source grounding over declaration artifacts when both exist.
- Do not widen from exported values into general statement-graph recovery.

## Golden Shape

- one focused `golden.json`
- keep the golden key-oriented, not source-snippet-oriented
- projection rows may repeat owner/package context when that improves review

## Exit Condition

This lens is ready to compose into the next one when:

- interface-symbol recovery is stable under alias variation
- default resolver strategy recovery is stable enough to feed producer-side DI
  transition work
- later lenses can spend interface-key rows instead of re-deriving them from
  raw AST reads
