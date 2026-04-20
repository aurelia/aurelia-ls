# Registration Transition Lens Charter

Use this note when shaping the current Aurelia registration-transition lens.

## Lens

- Name: registration transition lens
- Status: active thin slice
- Related code:
  - `src/aurelia/registration-effect-*.ts`
  - `src/aurelia/api-detection*.ts`

## Burden

- Given an exported Aurelia-facing surface, recover the normalized
  compile-time registration transitions it contributes within the bounded
  export/body/selected-constructor ceiling.

## Subject

Current subjects:

- exported registration transitions
- exported registry emitters
- exported aggregate registration intake surfaces

Current ingress:

- package entrypoint export lens only

Explicitly out of scope:

- whole-program eager call-outcome recovery
- full runtime DI graph simulation
- consumer-side lookup and absence adjudication
- current-world activity
- continuation law for DI/registration questions

## Canonical Record

Current canonical carrier:

- `RegistrationEffectRecord`

Near-term burden-bearing fields should answer:

- transition class
- key family
- resolver strategy
- callback memoization posture
- residual open kind
- owner and site identity

The current record still carries provisional evidence hooks such as discovery
locality, API detection, raw registration payloads, and emitter/batch details.
Those should keep shrinking toward witness/projection surfaces as producer and
consumer DI composition lands.

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

This lens is not representative unless it covers at least:

- default interface registrations
- direct `Registration.*` calls in `register(...)` bodies
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
- Prefer source grounding over declaration artifacts when both exist in the
  repo.
- Keep aggregate intake and opaque callback bodies explicit instead of trying
  to flatten them into fake closed transitions.

## Atlas Alignment

This lens is a thin producer-side cut over the broader compile-time DI burden
described in:

- [compile-time-di-container-state.md](./compile-time-di-container-state.md)
- Atlas underlay:
  - `compile-time-di-container-state-carrier-contract.md`
  - `kernel-di-and-resource-admission-ledger.md`
  - `registration-world-constructors-ledger.md`

The current thin lens should preserve at least these Atlas-shaped axes:

- key family
- base resolver strategy
- higher-order transition class
- honest residual openness

## Golden Shape

- one focused `golden.json`
- prefer semantic transition rows over raw source-expression payloads
- summary counts should privilege transition class, key family, resolver
  strategy, and residual openness over detector vocabulary

## Exit Condition

This lens is ready to compose into the next one when:

- transition rows cover the current load-bearing exported surfaces
- later DI-consumer work can spend transition rows instead of re-reading raw
  `register(...)` bodies
- provisional discovery/proof fields are no longer carrying the burden that
  should live in semantic consequence fields
