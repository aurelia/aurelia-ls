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
| R-014 | 2026-08-22 | `d38a3a0e0` clean package tree | WS02 rename/edit implementation | pass | Candidate refusal, semantic transaction snapshots, session-transition ownership, client validation, host/UI canaries | F-REN-001 through F-REN-003 fixed; F-REN-004 and F-REN-005 bounded explicitly. |
| R-015 | 2026-08-22 | `d38a3a0e0` clean package tree | semantic and conformance regression | pass | Full semantic suite and semantic conformance after final WS02 change | 85 files / 904 tests; 684/684 active assertions; zero known gaps. |
| R-016 | 2026-08-22 | `d38a3a0e0` clean package tree | LSP, VS Code, and rename lanes | pass | LSP unit/integration shards; full VS Code tests; all rename lane snapshots in detection mode | LSP 516 passed / 1 intentional skip; VS Code 604/604; 47/47 rename probes matched reviewed snapshots. |
| R-017 | 2026-08-22 | `d38a3a0e0` clean package tree | real F2 and host mutation | pass | Full Worker rename-reliability shards on VS Code current and minimum | 11/11 on 1.134.0 and 11/11 on exact 1.91.0; closed/open literal-F2 receipts retained below. |

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

### CP2 — Mutating IDE Correctness

- Status: `verification`
- Candidate implementation commit: `d38a3a0e0b34dd2c9f79b97ecb6b0fff30dec1d1`
- Worktree during final code evidence: package tree clean at `d38a3a0e0`; tracker-only documentation was dirty
- Workstreams/findings: WS02 complete; F-REN-001 through F-REN-003 fixed; F-REN-004 and F-REN-005 accepted-bounded
- Validity paths: semantic rename contracts/API, language-server rename/edit mapping and protocol, VS Code client/session/edit
  validation, lane-harness rename probes/snapshots, and extension-host rename-reliability runner
- Automated commands and exact counts:
  - `pnpm run build:ide:types`; VS Code source/test typechecks; scoped changed-source lint — pass
  - `node scripts/run-vitest.mjs packages/semantic-runtime/test` — 85 files / 904 tests passed
  - `node packages/semantic-runtime/scripts/contract-semantic-conformance.mjs` — 684/684 passed, zero known gaps
  - template rename / TS-origin rename / references contracts — 22 edits / 9 edits / 33 rows, all pass
  - LSP unit suite — 467/467 passed
  - LSP integration files run in stable-sized shards — 49 passed / 1 intentional skip
  - VS Code suite — 604/604 passed
  - 12 rename lane fixtures in detection mode — 47/47 probes matched reviewed snapshots and verdicts
  - current/minimum full rename-reliability shards — 11/11 on each lane
- Host journeys and versions:
  - literal keyboard F2 through the native rename widget on VS Code 1.134.0 and exact 1.91.0
  - `state -> state2`, exactly 11 sites, `my-app.ts` closed and open, one undo/save/redo, whole-workspace census
  - provider plus explicit `workspace.applyEdit` remains a distinct no-refactoring-auto-save control path
- Retained artifacts:
  - `.temp/vscode-extension-host/current-stable/worker/rename-reliability/state-rename-real-f2-closed.json` — SHA-256 `0be03c0c5935d17045059adcdc0fcfa77e631f2291b01d503e81a8f4fdfd2b4b`
  - `.temp/vscode-extension-host/current-stable/worker/rename-reliability/state-rename-real-f2-open.json` — SHA-256 `5aeec35205bf6fdce29e9a85fe0903d4c3cdc6208e561a61e7feaa69e3b79355`
  - `.temp/vscode-extension-host/minimum/worker/rename-reliability/state-rename-real-f2-closed.json` — SHA-256 `d233024c71420f611f3933a03a63ce26b975029809041dacd2a66b2aed6c36f6`
  - `.temp/vscode-extension-host/minimum/worker/rename-reliability/state-rename-real-f2-open.json` — SHA-256 `f2ffb784d50ceed2892180333acb61fda1c7fdbaf9b7d204e3de564d4a83a408`
- Bounded platform semantics:
  - bundled VS Code validates edit target version, SHA-256 content, URI identity, and canonical real path immediately
    before returning the edit; VS Code exposes no closed-file compare-and-swap for the remaining tiny apply window
  - one `WorkspaceEdit` is the strongest host application unit; filesystem failure is not guaranteed rollback-atomic
  - generic LSP clients ignore the optional Aurelia transaction metadata and do not receive strict closed-file enforcement
  - native F2 follows `files.refactoring.autoSave`; one undo restores effective content, then one save persists that undo
- Next checkpoint and admitted workstreams: formal CP2 closure remains sequenced behind CP1/WS06; WS03 and WS04 are ready

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
