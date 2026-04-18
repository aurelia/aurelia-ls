# Protocol Derivation Pass 01

This note records the first explicit derivation pass over the repo-owned
protocol packets.

Scope:

- [`resolve-direct-export-custom-element.yaml`](../fixtures/protocol-derivation/scenarios/resolve-direct-export-custom-element.yaml)
- [`evaluate-exported-custom-element-activation-gap.yaml`](../fixtures/protocol-derivation/scenarios/evaluate-exported-custom-element-activation-gap.yaml)
- [`evaluate-exported-custom-element-after-registration-removal.yaml`](../fixtures/protocol-derivation/scenarios/evaluate-exported-custom-element-after-registration-removal.yaml)

Sources spent:

- [`src/protocol-read-kernel.ts`](../src/protocol-read-kernel.ts)
- [`protocol-read-algebra.md`](./protocol-read-algebra.md)
- [`protocol-derivation-workbook.md`](./protocol-derivation-workbook.md)
- the matching fixture and scenario packets under
  [`../fixtures/protocol-derivation/`](../fixtures/protocol-derivation/README.md)
- current Aurelia grounding under
  [`aurelia/export-semantic-surface-ledger.yaml`](./aurelia/export-semantic-surface-ledger.yaml),
  [`aurelia/current-world-construction.md`](./aurelia/current-world-construction.md),
  and
  [`aurelia/declaration-world-and-resource-families.md`](./aurelia/declaration-world-and-resource-families.md)

Confidence note:

- High confidence: outcome choice, basis split, identity versus anchor split,
  and the consulted-world distinction between declaration-world and
  current-world.
- Medium confidence: the exact open leaf names used for `subject.kind`,
  `semantic_world.kind`, issue wording, and some provenance leaf labels.

## Scenario 1 - Resolve Direct Exported Custom Element

### Given

- Fixture packet:
  [`01-direct-export-custom-element/fixture.yaml`](../fixtures/protocol-derivation/fixtures/01-direct-export-custom-element/fixture.yaml)
- Fixture state: `base`
- Source files in play:
  [`src/index.ts`](../fixtures/protocol-derivation/fixtures/01-direct-export-custom-element/src/index.ts),
  [`src/info-box.ts`](../fixtures/protocol-derivation/fixtures/01-direct-export-custom-element/src/info-box.ts),
  [`src/app-root.ts`](../fixtures/protocol-derivation/fixtures/01-direct-export-custom-element/src/app-root.ts)
- Known subjects in play: `info-box-export`, `info-box-class`

### Query Statement

- Human question: What does the `InfoBox` export point to?
- Semantic burden: close one export-addressable identity without yet claiming
  current-world activity
- Auto-detected semantic layers: `typescript`, `aurelia`

### Request

- Selector: `locator` over subject `{ family: entity, kind: export-surface }`
  with locator `src/index.ts#InfoBox`
- Operation: `resolve`
- Aspect: none
- Requested world: declaration-world
- Requested posture: implicit live authority posture; complete if honest
- Spend constraint: none explicit

### Authority Path

- Minimum substrate:
  - TypeScript export closure from `src/index.ts` to `src/info-box.ts`
  - class declaration recovery for `InfoBox`
  - Aurelia `customElement(...)` carrier recognition on `InfoBox`
- Consulted world / lookup regime:
  - semantic world: declaration-world
  - lookup regime: direct-export
- Preserved:
  - `InfoBox` is exported from `src/index.ts`
  - `InfoBox` is declared in `src/info-box.ts`
  - the declaration carries Aurelia custom-element metadata
  - `AppRoot` dependency and template usage are visible but not required for
    this burden
- Claim:
  - the export closes on the `InfoBox` class declaration
  - the resolved declaration is an Aurelia custom-element owner surface with
    name `info-box`
- Spendable:
  - same as claim for a consumer that only asked what the export points to
- Resolution:
  - status: `single`
  - selected candidate: entity/custom-element owner surface rooted at
    `src/info-box.ts`
- Outcome: `hit`
- Trust: `grounded`
- Basis:
  - `substrate` from export and declaration closure
  - `claim` from Aurelia resource-definition recognition
- Provenance:
  - carrier: live host authority
  - evidence: substrate plus semantic claim
- Issues: none required for honest closure
- Kernel continuation kinds:
  - `reroute`
  - `switch-world`
- Follow-up query seeds:
  - inspect resource kind and bindable adjuncts
  - trace registration path from export surface into Aurelia world
    construction
  - evaluate current-world activity in `AppRoot`
- Retreat triggers:
  - content change in `src/index.ts` or `src/info-box.ts`
  - configuration or import-shape change that breaks decorator/template
    recognition
- Change notice: none
- Identity emission:
  - emit: expected
  - minimum uniqueness: `project`
  - scheme hint: `ts-export`
  - strength: strong
- Anchor emission:
  - emit: expected
  - scheme hint: `ts-decl-anchor`
  - strength: strong
  - reread hint: optional

### Layer Contribution

- TypeScript alone closes export identity.
- Aurelia adds owner-surface classification and the most useful next reads.
- The extra meaning lands cleanly in claim detail, basis, and continuations.
  It does not require a new top-level kernel concept.

### Kernel Pressure

- The kernel felt natural here.
- This scenario wants `single` resolution even though its main burden is not a
  world-role question. That expectation now belongs in packet shape rather than
  derivation prose.

## Scenario 2 - Evaluate Exported Custom Element Activation Gap

### Given

- Fixture packet:
  [`05-exported-custom-element-activation-gap/fixture.yaml`](../fixtures/protocol-derivation/fixtures/05-exported-custom-element-activation-gap/fixture.yaml)
- Fixture state: `base`
- Source files in play:
  [`src/index.ts`](../fixtures/protocol-derivation/fixtures/05-exported-custom-element-activation-gap/src/index.ts),
  [`src/lazy-panel.ts`](../fixtures/protocol-derivation/fixtures/05-exported-custom-element-activation-gap/src/lazy-panel.ts),
  [`src/app-root.ts`](../fixtures/protocol-derivation/fixtures/05-exported-custom-element-activation-gap/src/app-root.ts)
- Known subjects in play: `lazy-panel-export`, `lazy-panel-class`,
  `iloadstate-export`

### Query Statement

- Human question: Is the `LazyPanel` export actually current-world active?
- Semantic burden: evaluate current-world activity for an export-addressable
  resource-definition surface under an Aurelia local-world construction
- Auto-detected semantic layers: `typescript`, `aurelia`

### Request

- Selector: `locator` over subject `{ family: entity, kind: export-surface }`
  with locator `src/index.ts#LazyPanel`
- Operation: `evaluate`
- Aspect: `current-world-status`
- Requested world: current-world
- Requested posture: implicit live authority posture; complete if honest
- Spend constraint: none explicit

### Authority Path

- Minimum substrate:
  - export identity closure for `LazyPanel`
  - Aurelia custom-element recognition on `LazyPanel`
  - `AppRoot` local dependency contribution through `dependencies: [LazyPanel]`
  - template use of `<lazy-panel>`
  - DI key construction for `ILoadState`
  - absence of any matching `ILoadState` registration path inside the searched
    world
- Consulted world / lookup regime:
  - semantic world: current-world
  - lookup regime: local-dependencies-world
- Preserved:
  - `LazyPanel` export closes to one declaration
  - `LazyPanel` is recognized as a custom-element owner surface
  - `AppRoot` contributes `LazyPanel` into the local Aurelia world
  - `AppRoot` template spends the `lazy-panel` tag
  - `LazyPanel` constructor requires `ILoadState`
- Claim:
  - export identity closes strongly
  - there is a real current-world contribution path for the custom element
  - current-world-active closure does not close honestly because activation
    depends on an unresolved `ILoadState` registration
- Spendable:
  - consumers may safely spend the open-boundary explanation
  - consumers may not spend a positive current-world-active claim
  - consumers may not degrade this to `no-claim`, because there is a real world
    contribution path and the blocker is an unresolved activation dependency
- Resolution:
  - status: `single`
  - selected candidate: entity/custom-element owner surface rooted at
    `src/lazy-panel.ts`
- Outcome: `open`
- Trust: `frontier`
- Basis:
  - `substrate` from export closure, dependency contribution, and template use
  - `claim` from Aurelia resource and DI semantics
  - `boundary` from the missing `ILoadState` registration path
- Provenance:
  - carrier: live host authority
  - evidence: substrate, claim, and evaluator-derived boundary reasoning
- Issues:
  - activation remains open because the `ILoadState` dependency has no closed
    registration path in the searched world
- Kernel continuation kinds:
  - `strengthen-evidence`
  - `reroute`
- Follow-up query seeds:
  - trace the activation dependency and the missing registration path
  - inspect the exported `ILoadState` DI key surface
  - trace registration-path evidence rather than asking the same
    current-world question again
- Retreat triggers:
  - content change in `src/lazy-panel.ts` or `src/app-root.ts`
  - dependency or registration change that introduces an `ILoadState`
    registration
  - broader world-construction change that widens the searched world honestly
- Change notice: none
- Identity emission:
  - emit: expected
  - minimum uniqueness: `project`
  - scheme hint: `ts-export`
  - strength: strong
- Anchor emission:
  - emit: expected
  - scheme hint: `ts-decl-anchor`
  - strength: strong
  - reread hint: optional

### Layer Contribution

- TypeScript closes export identity and exposes the constructor dependency.
- Aurelia current-world construction adds the decisive distinction:
  this is not a plain export-resolution question and not a closed `no-claim`.
- The extra meaning lands in consulted world, basis, provenance, and
  continuations.

### Kernel Pressure

- The kernel still felt natural.
- This scenario reinforces that `resolution` and `outcome` must remain
  independent: the selector resolves to one candidate while the result remains
  `open`.

## Scenario 3 - Evaluate Exported Custom Element After Registration Removal

### Given

- Fixture packet:
  [`06-exported-custom-element-registration-removal/fixture.yaml`](../fixtures/protocol-derivation/fixtures/06-exported-custom-element-registration-removal/fixture.yaml)
- Fixture state: `after:remove-status-badge-from-app-root`
- Baseline relation: `base`
- Source files in play:
  [`src/index.ts`](../fixtures/protocol-derivation/fixtures/06-exported-custom-element-registration-removal/src/index.ts),
  [`src/status-badge.ts`](../fixtures/protocol-derivation/fixtures/06-exported-custom-element-registration-removal/src/status-badge.ts),
  [`src/app-root.ts`](../fixtures/protocol-derivation/fixtures/06-exported-custom-element-registration-removal/src/app-root.ts)
- Known subjects in play: `status-badge-export`, `status-badge-class`

### Query Statement

- Human question: Is the `StatusBadge` export still current-world active after
  root registration is removed?
- Semantic burden: evaluate whether a previously grounded current-world claim
  must retreat under a mutation-backed state change
- Auto-detected semantic layers: `typescript`, `aurelia`

### Request

- Selector: `locator` over subject `{ family: entity, kind: export-surface }`
  with locator `src/index.ts#StatusBadge`
- Operation: `evaluate`
- Aspect: `current-world-status`
- Requested world: current-world
- Requested posture: implicit live authority posture; freshness-sensitive
  because the scenario is relational
- Spend constraint: none explicit

### Authority Path

- Minimum substrate:
  - base-state current-world claim for `StatusBadge` from `AppRoot`
    dependencies plus template use
  - after-state export identity closure for `StatusBadge`
  - after-state template use of `<status-badge>`
  - mutation evidence showing that `StatusBadge` was removed from
    `AppRoot.dependencies`
- Consulted world / lookup regime:
  - semantic world: current-world
  - lookup regime: local-dependencies-after-removal
- Preserved:
  - `StatusBadge` still resolves to the same declaration
  - `StatusBadge` is still a recognized custom-element owner surface
  - the template still spends the `status-badge` tag
  - the baseline state previously contributed `StatusBadge` through
    `AppRoot.dependencies`
- Claim:
  - prior current-world-active closure cannot be sustained after the mutation
  - the export identity remains intact, but the world-role claim must retreat
    because the local dependency contribution was removed
  - this should classify as `withdrawn`, not plain `no-claim`, because the
    scenario is explicitly relational to a prior grounded claim
- Spendable:
  - consumers may safely invalidate prior current-world-active conclusions
  - consumers may safely spend the withdrawal explanation and reread guidance
  - consumers may not spend the old active claim any longer
- Resolution:
  - status: `single`
  - selected candidate: entity/custom-element owner surface rooted at
    `src/status-badge.ts`
- Outcome: `withdrawn`
- Trust: `grounded`
- Basis:
  - `claim` from the prior grounded current-world-active closure
  - `freshness` from the mutation-sensitive comparison between `base` and
    `after`
  - `boundary` from the removed local dependency contribution
- Provenance:
  - carrier: live host authority over the after-state plus baseline relation
  - evidence: prior claim, current structural state, and evaluator-derived
    retreat reasoning
- Issues:
  - current-world activity was withdrawn after `AppRoot` stopped contributing
    `StatusBadge` into the local world
- Kernel continuation kinds:
  - `strengthen-evidence`
  - `reroute`
- Follow-up query seeds:
  - trace the removed registration contribution
  - compare the base and after-state world-role evidence directly
  - inspect the declaration anchor and reread posture for the still-stable
    export surface
- Retreat triggers:
  - further content change in `src/app-root.ts`, `src/index.ts`, or
    `src/status-badge.ts`
  - dependency or world-construction change that reintroduces a valid
    registration path
- Change notice:
  - kind: `subjects`
  - affected refs: at minimum `src/app-root.ts`
  - reread hint: re-evaluate current-world status or trace registration loss
- Identity emission:
  - emit: expected
  - minimum uniqueness: `project`
  - scheme hint: `ts-export`
  - strength: strong
- Anchor emission:
  - emit: expected
  - scheme hint: `ts-decl-anchor`
  - strength: strong
  - reread hint: expected

### Layer Contribution

- TypeScript alone explains why the export still resolves.
- Aurelia current-world construction plus retreat-under-change explains why the
  world-role claim must withdraw while identity remains stable.
- The extra semantics land in relational adjudication, basis, change notice,
  and continuations.

### Kernel Pressure

- The kernel handled this well, but the scenario confirms that `withdrawn`
  requires an explicit baseline relation.
- A single-state packet would not be enough to justify `withdrawn` honestly.

## Convergence Note After Three Scenarios

Most stable so far:

- request, adjudication, and result remain a strong split
- identity closure and outcome classification remain cleanly independent
- Aurelia meaning can stay inside consulted world, basis, provenance, and
  continuations instead of forcing new kernel slots
- identity and anchor remain useful even when the outcome is `open` or
  `withdrawn`

Still provisional:

- exact `subject.kind` leaf names for export-facing and resource-facing
  candidates, though these should now converge through
  [`vocabulary.yaml`](../fixtures/protocol-derivation/vocabulary.yaml)
- exact issue codes and some provenance leaf labels
- whether scenario packets should grow an explicit `posture_expectation`

New low-regret invariants from this pass:

1. `resolve` can close export identity in declaration-world while still
   auto-detecting framework semantics for the resolved surface.
2. `resolution.status = single` does not imply outcome `hit`; identity closure
   and burden closure are different laws.
3. `open` is the honest outcome when a real current-world contribution path
   exists but current-world-active closure is blocked by an unresolved
   activation dependency.
4. `withdrawn` is relational. It requires a prior grounded claim plus a later
   state that reopens that claim.
5. Strong identity and strong anchor can survive even when current-world status
   is `open` or `withdrawn`.

Next pressure worth adding to the packet schema:

- possibly a light `posture_expectation` once `stale` and more explicit
  reread-pressure scenarios enter the corpus
