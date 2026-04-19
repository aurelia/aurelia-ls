# DI And Registration Lens Charter

Use this note when shaping the current Aurelia DI-interface and
registration-effect lenses.

## Lens

- Name: DI interfaces and registration effects
- Status: active thin slice
- Related code:
  - `src/aurelia/di-interface-*.ts`
  - `src/aurelia/registration-effect-*.ts`
  - `src/aurelia/api-detection*.ts`

## Burdens

- Given an exported Aurelia-facing value, recover whether it closes on a DI
  interface surface created through `createInterface(...)`.
- Given an exported Aurelia-facing surface, recover the registration effect or
  registration emitter it contributes within a bounded static ceiling.

## Subject

Current subjects:

- exported DI interface values
- exported registration emitters
- exported registration effects

Current ingress:

- package entrypoint export lens only

Explicitly out of scope:

- whole-program eager call-outcome recovery
- full runtime DI graph simulation
- current-world activity
- generalized continuation law for these lenses

## Canonical Records

Current canonical carriers:

- `InterfaceRecord`
- `RegistrationEffectRecord`

These records should stay:

- plain data
- nested where that preserves real distinctions
- free of mechanically redundant projection fields

Projection-only views include:

- golden counts
- review summaries
- lens-specific grouping rows

## Evaluator Ceiling

Current bounded spend:

- exported value closure
- bounded alias chasing
- known API detection
- local registration-shape parsing
- returned registry-constructor recognition for selected patterns

Current known API families:

- `DI.createInterface`
- `Registration.*`
- `createImplementationRegister`
- `AppTask.*`

## Load-Bearing Coverage

This slice is not representative unless it covers at least:

- direct `createInterface(...)`
- helper aliases such as `tcCreateInterface`
- interface-symbol aliases
- default interface builder registrations
- `Registration.*` calls in `register(...)` bodies
- `createImplementationRegister(...)`
- exported registry constructors that return:
  - object literals with `register(...)`
  - `AppTask.*(...)`

Examples:

- `RouterConfiguration.customize`
- `StyleConfiguration.shadowDOM`

## Cost Rules

- Reuse one Aurelia lens context per collection pass.
- Do not reopen the live kernel when a sibling lens can share the same
  session/outputs/packages.
- Prefer source grounding over `dist/types` when both exist in the repo.

## Golden Shape

The DI-interface lens uses one focused `golden.json`, not one file per package,
because the review burden is lens-local rather than package-local.

If a future Aurelia lens is similarly focused, prefer one reviewable suite file
over a per-package shard layout unless coverage volume genuinely demands
splitting.

## Exit Condition

This slice is ready to compose into the next one when:

- DI interface detection is stable under alias variation
- registration emitters and direct effects cover the current load-bearing
  exported surfaces
- the next lens can spend these records instead of re-deriving the same truth
  from raw AST reads
