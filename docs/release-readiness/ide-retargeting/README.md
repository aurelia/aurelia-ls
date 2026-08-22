# IDE Retargeting Release Confidence

This folder is the sole current tracking authority for taking `ide-retargeting` from the 2026-08-22 release-risk audit
to an evidence-backed release candidate. It is not a changelog and does not claim that a release has shipped.

Six workstreams are appropriate. Fewer would mix semantic identity, editor mutations, diagnostics, runtime lifecycle,
host composition, and release admission even though they have different failure modes and gates. More would fragment the
shared identity and currentness context. A seventh stream is created only under the expansion rule below.

## Recovery Protocol

After compaction, handoff, or a fresh session:

```powershell
pnpm --filter @aurelia-ls/atlas orient
pnpm --filter @aurelia-ls/atlas memory:next -- --recordId=decision:ide-release-confidence-workstreams --rows=8
git status --short --branch
git log --oneline --decorate -12
```

Then read:

1. **Current Authority** and **Workstream Rollup** below.
2. [`findings.md`](findings.md), especially open release-blockers and newly discovered rows.
3. The active packet under [`workstreams/`](workstreams/).
4. The latest rows in [`checkpoints.md`](checkpoints.md).

Do not repeat the broad audit unless the branch base or declared product envelope materially changes.

## Current Authority

| Field | Value |
|---|---|
| Audit baseline | `00e81ae472d7d43b9beee55922e2e3ad28a4762e` |
| Branch/base | `ide-retargeting`, 252 commits ahead of `main` at audit time |
| Current checkpoint | CP1 — Semantic foundation |
| Active workstreams | WS06 assurance is active; WS01 is ready to start |
| Release authority | `not-accepted` |
| Release posture | Known red contract, source-identity ambiguity, and exact rename journey remain open |
| Last tracker review | 2026-08-22 |

Update this table whenever the checkpoint, active stream set, candidate SHA, or release authority changes. Do not create
a competing status summary in another document.

## Controlled Status Axes

- Workstream: `queued | ready | active | blocked | verification | complete | deferred`
- Finding: `open | fixed | accepted-bounded | deferred | rejected | superseded`
- Evidence: `unrun | pass | fail | stale | inconclusive`
- Release authority: `not-accepted | candidate-ready | candidate-accepted | publication-approved`

`fixed` is not the same as verified. A finding becomes closed for release only after its regression witness and the owning
checkpoint gate pass on a commit that remains valid.

## Workstream Rollup

| Id | Workstream | Status | Depends on | Packet | Primary checkpoint |
|---|---|---|---|---|---|
| WS01 | Semantic identity, provenance, and compiler-world invariants | ready | CP0 | [packet](workstreams/WS01-semantic-foundations.md) | CP1 |
| WS02 | Rename and edit-transaction correctness | queued | WS01; WS04 support | [packet](workstreams/WS02-rename-edit-transactions.md) | CP2 |
| WS03 | Diagnostics, recovery, and Problems policy | queued | WS01; WS04 support | [packet](workstreams/WS03-diagnostics-recovery.md) | CP3 |
| WS04 | Incremental lifecycle, cancellation, performance, and retention | queued | WS01 | [packet](workstreams/WS04-lifecycle-performance.md) | CP3–CP4 |
| WS05 | Provider composition, multi-root, platform, and compatibility | queued | WS02–WS04 stable | [packet](workstreams/WS05-host-provider-integration.md) | CP4 |
| WS06 | Assurance admission, documentation, and exact release evidence | active | transverse; closes last | [packet](workstreams/WS06-assurance-release.md) | CP1–CP5 |

WS02 and WS03 may proceed in parallel after WS01 closes the shared source-identity canaries. WS04 supplies lifecycle
proofs to both, then completes its full soak at CP4. WS06 starts now and continues throughout.

## Checkpoint Plan

| Id | Status | Required outcome |
|---|---|---|
| CP0 — Audit authority | complete | Scope, baseline, workstreams, known reds, recovery path, and evidence are durable and queryable. |
| CP1 — Semantic foundation | active | WS01 exits; full semantic tests and conformance are green; identity fails closed on ambiguity; affected lane baselines are current. |
| CP2 — Mutating IDE correctness | queued | WS02 exits; supported rename/edit surfaces are complete and atomic through the real host, including exact undo/redo and session churn. |
| CP3 — Diagnostic settlement | queued | WS03 exits and feature-critical WS04 slices are green; Problems settle through malformed edits and file/config/session transitions. |
| CP4 — Integrated resilience | queued | WS04 and WS05 exit; provider composition, multi-root/platform behavior, cancellation, latency, and retention meet the support envelope. |
| CP5 — Exact release candidate | queued | WS06 exits; every admitted gate is green from one clean SHA, docs match behavior, and that SHA's exact VSIX is verified and installed once. |

Intermediate checkpoints are progress evidence, not release proof. A later commit touching a receipt's declared validity
area changes that evidence to `stale` until rerun. CP5 reruns every final gate against one exact clean HEAD.

## Concurrency

Run at most two implementation workstreams concurrently, plus WS06 evidence/gating work. Shared semantic-runtime changes
make broader concurrency counterproductive. WS01 owns foundation changes and must not race feature-local alternative path
or provenance logic.

## Drive-By Intake and Expansion

Every material discovery receives a stable row in [`findings.md`](findings.md) before it is fixed or deferred.

1. **Absorb** it into the active stream if it violates the same invariant or shares the root cause. It joins that
   stream's exit criteria.
2. **Route** it to another existing stream if it has a different owner or gate. Record the dependency without derailing
   current work unless it blocks correctness.
3. **Promote** it to a seventh stream only at checkpoint review, and only when it has all three:
   - a distinct architectural or product owner;
   - a distinct verification gate;
   - release-blocking scope that cannot be represented honestly by WS01–WS06.
4. **Defer** it only with impact, evidence, rationale, and a named revisit checkpoint. "Unrelated" alone is not a
   disposition.
5. Do not silently repair a drive-by and lose the regression witness. Add the smallest deterministic proof before or
   with the fix.

Expansion is generous during a stream's reconnaissance phase. Once its invariant and threat matrix are written, new work
must either falsify that contract or enter the finding register for explicit routing.

## Workstream Cycle

Each stream follows:

```text
reconnaissance -> invariant/contract -> repair -> adversarial proof -> gate admission -> checkpoint review
```

At stream start:

- bind the packet to exact HEAD and clean/dirty state;
- revalidate entry evidence;
- turn relevant findings to `active` in the packet notes without changing their finding disposition;
- enumerate affected paths so later evidence invalidation is mechanical.

At checkpoint review:

- run the complete exit gate after the last relevant change;
- audit every drive-by disposition;
- update the rollup, finding register, decision log, and checkpoint receipt together;
- close from a clean worktree and one named commit;
- identify the next admitted streams.

## Durable Product Decisions

1. Rename remains a correctness objective. Do not disable broad rename support, reduce it to TypeScript-only behavior, or
   use blanket refusal as the substitute for completing supported semantic identity and transaction handling.
2. Genuine unsupported or unprovable boundaries may refuse honestly. Candidate-bearing supported surfaces are
   completeness work: retain their locations and improve resolution rather than accepting count-only partial migration
   as the terminal UX.
3. Source identity and authored provenance are foundations shared by every IDE lane, not feature-local fixes.
4. Existing tests count as release evidence only when current and admitted into CI, publication, or an explicitly named
   manual release gate.
5. Exact installed artifact evidence is valid only for the same clean commit that passed the final gates.

## Next Actions

1. Start WS01 by reproducing F-FND-001 and grounding the intended owner-resource invariant before changing the planner or
   test.
2. Specify exact, relative, ambiguous, linked, and case-aware source identity outcomes for F-FND-002; enumerate every
   authority-bearing consumer before editing the shared matcher.
3. Build the cross-lane collision fixture and make the complete semantic suite green.
4. In parallel, let WS06 design aggregate semantic/conformance/lane gates without changing expected behavior.
