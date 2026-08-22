# Checkpoint and Evidence Ledger

Checkpoint receipts bind claims to exact commits and validity areas. Raw logs, screenshots, profiles, and visual receipts
may live under ignored `.temp/release-readiness/<checkpoint>/<sha>/`, but this file must retain their paths, hashes when
material, and reproduction commands. An ignored artifact cannot be the sole evidence.

## Baseline Evidence

| Receipt | Date | Commit / tree | Validity area | Status | Evidence | Result |
|---|---|---|---|---|---|---|
| R-001 | 2026-08-22 | `00e81ae47` clean | branch topology | pass | `git rev-list --left-right --count main...HEAD`; diff audit | 0 behind, 252 ahead; 2,203 changed files. |
| R-002 | 2026-08-22 | `00e81ae47` clean | semantic-runtime tests | fail | `node scripts/run-vitest.mjs packages/semantic-runtime/test` | 79 files; 881 passed, 1 deterministic failure. |
| R-003 | 2026-08-22 | `00e81ae47` clean | cohort planner | fail | isolated `template-compilation-cohort-planner.test.ts` | Same line-93 failure; not order-dependent. |
| R-004 | 2026-08-22 | `00e81ae47` clean | rename host shard | pass | Worker `rename-reliability` on VS Code 1.134 and 1.91 | 9/9 passed in each host; exact `state`/closed/F2 gap remains. |
| R-005 | 2026-08-22 | `00e81ae47` clean | diagnostics focused audit | pass | Focused LSP/semantic suites, stress tests, and eight diagnostic lanes | Green; residual risk is host lifecycle, native policy, recovery, and real-app pressure. |
| R-006 | 2026-08-22 | `00e81ae47` clean | storefront rename lane | fail | Lane detection mode | Snapshot expected refusal code `0`, received LSP `-32803`; gate drift confirmed. |
| R-007 | 2026-08-22 | `00e81ae47` clean | changed compiler tests | pass | Four changed compiler test files | 219/219 passed. |
| R-008 | 2026-08-22 | `489cc2bed`, `e507dabc8` | WS01 semantic implementation | pass | Focused owner/lookup, source collision, provenance, router detail, viewport lineage, structural-reference tests | F-FND-001 through F-FND-008 fixed with deterministic canaries. |
| R-009 | 2026-08-22 | `e507dabc8` package tree | semantic-runtime tests | pass | `node scripts/run-vitest.mjs packages/semantic-runtime/test` after final semantic change | 84 files; 900/900 passed. |
| R-010 | 2026-08-22 | `e507dabc8` package tree | semantic conformance | pass | `node packages/semantic-runtime/scripts/contract-semantic-conformance.mjs` | 684/684 active assertions passed; zero known gaps. |
| R-011 | 2026-08-22 | `e507dabc8` package tree | affected semantic contracts | pass | Template references/TS rename, observer locator/setup/customization, router dynamic/active-link, TypeSystem overlays, source carriers | All affected contracts passed; template references 33 rows and TS-origin rename 9 edits. |
| R-012 | 2026-08-22 | `e507dabc8` package tree | IDE types and LSP source boundary | pass | `pnpm run build:ide:types`; source/session/completion/native-presentation shards | Build passed; LSP 55/55 unit/source rows and 14/14 integration rows passed. |
| R-013 | 2026-08-22 | `e507dabc8` package tree | product-architecture pressure | pass | `pnpm --filter @aurelia-ls/atlas pressure:product-architecture` | Pressure completed; field-provenance construction sites reduced to 33; known DI static false positives remain F-AUT-005. |

## Checkpoint Receipts

### CP0 — Audit Authority

- Status: `complete`
- Baseline commit: `00e81ae472d7d43b9beee55922e2e3ad28a4762e`
- Authority: the introducing commit for this tracker and Atlas memory pointer
- Known red evidence: R-002, R-003, R-006
- Next checkpoint: CP1
- Admitted streams: WS01 and transverse WS06

### CP1 — Semantic Foundation

- Status: `verification`
- Candidate implementation commits: `489cc2bed986fca0b47c457ae9ec88fea3e176cc`,
  `e507dabc8aea46fe5f3339f158ec60384fe202b3`
- Worktree during final semantic evidence: semantic/IDE package tree matched `e507dabc8`; tracker-only documentation was dirty
- Workstreams/findings: WS01 complete; F-FND-001 through F-FND-008 fixed
- Validity paths: `packages/semantic-runtime/**`, `packages/language-server/src/runtime/semantic-runtime-session.ts`
- Supersedes: R-002 and R-003; R-006 remains an open WS02/WS06 gate-drift receipt
- Automated commands and exact counts:
  - `pnpm run build:ide:types` — pass
  - `node scripts/run-vitest.mjs packages/semantic-runtime/test` — 84 files / 900 tests passed
  - `node packages/semantic-runtime/scripts/contract-semantic-conformance.mjs` — 684/684 passed, zero known gaps
  - affected template/observation/router/overlay/source contracts — pass
  - LSP source/session shard — 55/55 passed
  - LSP completion/native-presentation shard — 14/14 passed
  - `pnpm --filter @aurelia-ls/atlas pressure:product-architecture` — pass
- Host journeys and versions: none at CP1; real-host rename/undo and diagnostics lifecycle remain WS02/WS03
- Retained artifacts: command/count evidence is durable in R-008 through R-013; no ignored artifact is required
- Open findings and disposition:
  - F-AUT-001 — open; full semantic-suite CI/publication admission required before CP1 closes
  - F-AUT-002 — open; conformance/lane aggregate gating and drift update required before CP1 closes
  - F-AUT-005 — open medium; Atlas callback-expression false-positive classification belongs to WS06
- Decision changes: owner compiler-context membership is independent from runtime lookup; public admitted source carriers are
  workspace-relative, unadmitted external carriers are exact absolute/workspace identities, ambiguous aliases fail closed,
  and field provenance is singular with aggregate multi-cause witnesses
- Next checkpoint and admitted workstreams: CP1 remains in verification under WS06; WS02, WS03, and WS04 are ready

## Receipt Template

### CPX — Name

- Status: `verification`
- Candidate commit: `<full SHA>`
- Worktree: `clean | dirty`
- Workstreams/findings: `WS00; F-XXX-000`
- Validity paths: `<paths or declared architectural area>`
- Supersedes: `<receipt ids>`
- Automated commands and exact counts:
  - `<command>` — `<result>`
- Host journeys and versions:
  - `<journey>` — `<version/platform/result>`
- Retained artifacts:
  - `<path>` — `<SHA-256 or receipt identity>`
- Open findings and disposition:
  - `<finding>` — `<disposition/revisit>`
- Decision changes:
  - `<decision id or none>`
- Next checkpoint and admitted workstreams: `<checkpoint/streams>`

Evidence becomes `stale` when later changes touch its declared validity area. Mark it explicitly; do not silently rely on
an older green count.
