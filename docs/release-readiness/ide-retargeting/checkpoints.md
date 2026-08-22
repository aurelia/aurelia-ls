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

## Checkpoint Receipts

### CP0 — Audit Authority

- Status: `complete`
- Baseline commit: `00e81ae472d7d43b9beee55922e2e3ad28a4762e`
- Authority: the introducing commit for this tracker and Atlas memory pointer
- Known red evidence: R-002, R-003, R-006
- Next checkpoint: CP1
- Admitted streams: WS01 and transverse WS06

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
