# Finding Register

This is the append-preserving intake and disposition queue for the IDE retargeting release-confidence effort. New rows
must name a workstream, priority, status, release effect, evidence, and next proof.

## Active Findings

| Id | Stream | Priority | Status | Release effect | Finding | Initial evidence / next proof |
|---|---|---|---|---|---|---|
| F-FND-001 | WS01 | release-blocker | fixed | CP1 | Cohort-planner semantic contract was red because owner compiler-context membership had been conflated with runtime lookup eligibility. | `489cc2bed`: owner membership is retained without lookup contention; shadow-DOM/same-name cohort canaries and the full 900-test suite pass. |
| F-FND-002 | WS01 | release-blocker | fixed | CP1 | Bidirectional suffix matching could choose a longer nested path over an exact requested path. | `e507dabc8`: exact absolute/workspace/project identities, domain-aware internal resolution, ambiguity refusal, project-coherent batches, linked/case canaries; suffixes are candidate-only. |
| F-FND-003 | WS01 | high | fixed | CP1 | Same-handle field provenance risked false field-specific precision on generated or derived products. | No IDE action policy reads field provenance; `e507dabc8` additionally makes it a singular partial function and fails closed on duplicate fields. |
| F-FND-004 | WS01 | high | fixed | CP1 | Runtime target-access provenance flattened observer, adapter, setup, and override causes; overrides retained stale losing-selection provenance and structural closure omitted observer products. | `e507dabc8`: typed causal lanes, replacement semantics, aggregate witnesses, direct observer/adapter closure; focused tests and three observation contracts pass. |
| F-FND-005 | WS01 | high | fixed | CP1 | RouterOptions was an emission-side rich object with no product-detail slot; its fold discarded winning contribution identity and assigned one owner provenance to relations and every configured field. | `e507dabc8`: exact winning field states/provenance, rooted product detail, aggregate product evidence, structural/public convergence; router contracts and conformance pass. |
| F-FND-006 | WS01 | high | fixed | CP1 | Repeated FieldProvenance rows had no valid singular read semantics; registration parameters discarded every witness after index zero and state/target-access could emit duplicate fields. | `e507dabc8`: one field/one handle invariant and deterministic zero/one/many aggregation cover registry parameters, state handlers, and target access. |
| F-FND-007 | WS01 | medium | fixed | CP1 | Equivalent product-detail, resource-target, and resource name-source reference derivations lived in several package-local helpers. | `e507dabc8`: kernel/resource owners now provide the shared derivations; structural/reference/rename equality canaries pass. |
| F-FND-008 | WS01 | medium | fixed | CP1 | Router viewport topology looked for generated instruction field provenance even though exact authored HTML attribute/value lineage existed elsewhere. | `e507dabc8`: instruction-to-attribute lineage, exact/carrier/unavailable states, atomic Viewport detail, and direct structural closure; viewport tests and 11 topology assertions pass. |
| F-REN-001 | WS02 | release-blocker | open | CP2 | Exact interactive `state -> state2` one-undo journey is absent despite the reported residue. | Semantic probe yields 11 exact edits; add real F2 closed/open host journey and disk scan. |
| F-REN-002 | WS02 | high | open | CP2 | Owned TS rename can fall through natively while its Aurelia session is temporarily unpublished. | `ts-rename-feature.ts:35`; force reconciliation window in host test. |
| F-REN-003 | WS02 | high | open | CP2 | Candidate-bearing rename can leave related supported authored sites unchanged with count-only notice. | Preserve candidate locations; close semantic identity rather than accepting partial migration. |
| F-REN-004 | WS02 | high | open | CP2 | Closed targets and path aliases lack the same version protection as open buffers. | Mutate a closed target between provider response and apply; prove coherent replan/refusal without partial edits. |
| F-DIA-001 | WS03 | release-decision | open | CP3 | Valid Aurelia interpolation produces native CSS Problems by default; suppression trades away legitimate native findings. | Run both modes in host; record explicit product decision and onboarding. |
| F-DIA-002 | WS03 | high | open | CP3 | No real-host proof clears planted Problems from old URIs across rename/delete/config/session retirement. | Add file/folder/config/workspace lifecycle matrix. |
| F-DIA-003 | WS03 | high | open | CP3 | HTML recovery facts are not generally surfaced as Aurelia Problems when native diagnostics are suppressed. | Dirty malformed editing matrix in both modes. |
| F-DIA-004 | WS03 | medium | open | CP3 | Synthetic admission tests do not establish framework/plugin false-positive rate in real applications. | Run bounded external-app corpus and classify rows. |
| F-LIF-001 | WS04 | high | open | CP4 | Authoritative latency cohort and sustained memory/currentness soak have not run at branch tip. | Run preregistered 20/5 host cohort plus retention soak. |
| F-HOST-001 | WS05 | medium | open | CP4 | TS-origin references may duplicate native TypeScript locations; real host proves only template-origin composition. | Assert exact unique location set from TS declaration and use. |
| F-HOST-002 | WS05 | medium | open | CP4 | Real Extension Host acceptance is Windows-only despite filesystem, watcher, and Worker platform differences. | Current-stable macOS/Linux Worker lifecycle and product-support smoke. |
| F-AUT-001 | WS06 | release-blocker | open | CP1 | CI/publication omit most semantic tests; the omission already hid F-FND-001. | Admit all semantic test files and keep publication parity. |
| F-AUT-002 | WS06 | release-blocker | open | CP1 | Semantic conformance and the 321-probe lane harness are not gated; rename snapshots are stale. | Add aggregate detection runner and review error-code drift. |
| F-AUT-005 | WS06 | medium | open | CP1 | Atlas field-provenance pressure groups callback-parameter expressions as one static handle and reports clean DI remaps as fan-out. | Distinguish dynamic callback expressions from invariant handles after WS01 establishes the runtime invariant. |
| F-AUT-003 | WS06 | release-blocker | open | CP5 | Packaged 0.5.0 changelog contradicts V1 config, opt-in native suppression, Alt+R, and current icons. | Reconcile after behavior decisions settle. |
| F-AUT-004 | WS06 | release-blocker | open | CP5 | No exact audit-tip/final-tip VSIX has completed the package/verify/install chain. | Run only after CP1–CP4 close on final clean HEAD. |

## Intake Template

Add rows using a workstream-qualified id such as `F-REN-005`.

| Id | Stream | Priority | Status | Release effect | Finding | Initial evidence / next proof |
|---|---|---|---|---|---|---|
| F-XXX-000 | WS00 | high | open | CP0 | Concise falsifiable statement. | Reproduction, source anchor, and smallest next proof. |

## Disposition Rules

- `fixed`: implementation landed, but checkpoint proof may still be outstanding.
- `accepted-bounded`: behavior is intentional inside a precisely declared support boundary and has a regression test.
- `deferred`: outside the current envelope with impact, rationale, and revisit checkpoint recorded.
- `rejected`: investigation disproved the finding; retain the evidence.
- `superseded`: replaced by a more exact finding id or decision; link the replacement.

Never delete a material row merely because it was fixed. Preserve the causal chain and update its disposition/evidence.
