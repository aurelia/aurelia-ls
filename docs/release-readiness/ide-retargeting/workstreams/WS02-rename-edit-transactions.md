# WS02 — Rename and Edit-Transaction Correctness

Status: `complete`

Start baseline: `6a62c6d2a` on a clean worktree.

Completion commit: `d38a3a0e0b34dd2c9f79b97ecb6b0fff30dec1d1`.

F-REN-001 through F-REN-003 are fixed. F-REN-004 and F-REN-005 have explicit platform-bounded dispositions.

## Governing invariant

One rename/edit intent produces one complete, current, authored, validated workspace transaction and one coherent undo
unit across every supported semantic surface.

Rename is an engineering-to-correctness objective. Broad disabling, TypeScript-only retreat, or blanket candidate refusal
is not the solution. Genuine unprovable boundaries may refuse, but supported authored cases should become complete.

## Entry criteria

- WS01 source-identity canaries are green.
- The exact `state -> state2` semantic plan and expected 11 sites are recorded.
- Host current/minimum versions and clean fixture reset are available.

## Initial threat matrix

- Interactive F2 versus programmatic provider execution.
- Origin/dependent editors; open, dirty, saved, and closed targets.
- One undo, one redo, dirty state, disk bytes, and whole-workspace residue.
- Session admission/replacement and native TypeScript fallback.
- Stale closed-file mutation between plan and apply.
- URI aliases, casing, symlinks, duplicate and overlapping edits.
- Members, locals, bindables, explicit aliases, callbacks, all resource kinds, and same-spelling isolation.
- Candidate completeness, collisions, JS/JSX, cancellation, and large-project latency.
- Edit-backed Quick Fixes under the same currentness/undo contract.

## Work

1. Add the real-F2 `state -> state2` sentinel with `my-app.ts` closed and open on current and minimum VS Code.
2. Capture buffer and filesystem hashes before, after rename, after exactly one undo, and after redo.
3. Explain any behavioral difference from `executeDocumentRenameProvider` plus explicit `workspace.applyEdit`.
4. Distinguish truly unowned scripts from temporarily unpublished owned sessions; never silently fall through during
   reconciliation.
5. Preserve candidate locations and close supported semantic identity instead of accepting count-only partial migration.
6. Expand host rollback coverage across aliases, resource kinds, callbacks, path aliases, and closed-target races.
7. Preserve unresolved candidate URI/range/reason data and refuse the complete plan before any edit.
8. Carry version, content-revision, and physical-identity snapshots through rename and resolved Quick Fix edits.

## Exit criteria

- F-REN-001 through F-REN-005 have verified or explicitly bounded dispositions.
- The exact reported journey passes through real host UI on VS Code 1.91 and current stable.
- Supported surfaces produce one complete version-aware edit and one coherent undo/redo unit with zero effective
  residue; when native refactoring auto-save is enabled, one save of the restored buffers persists that undo.
- Session reconciliation cannot produce a partial native rename for an owned project.
- Supported candidate-bearing cases are resolved or source-located and reviewable; count-only partial migration is not
  the terminal design.
- Semantic, LSP, lane, integration, and host mutation gates are green after the final WS02 change.

## Completion evidence

- Literal keyboard F2 through VS Code's native rename widget changes exactly 11 `state` sites with `my-app.ts` closed
  and open. One undo restores all effective sites, saving the restored buffers clears disk residue, and redo restores the
  rename on current stable 1.134.0 and exact minimum 1.91.0.
- Programmatic `executeDocumentRenameProvider` plus `workspace.applyEdit` is explicitly distinguished from native F2:
  it does not invoke VS Code's refactoring auto-save policy.
- TypeScript-origin rename cannot fall through while an established semantic owner is transitioning.
- Candidate-bearing member/bindable/TypeScript-origin renames refuse atomically with exact candidate locations and
  semantic reasons. Closed collisions, aliases, locals, callbacks, and supported resource kinds remain identity-partitioned.
- Rename and resolved Quick Fix mappings carry URI, version, SHA-256 content revision, and canonical real path. The
  bundled client validates every target after conversion and immediately before return; stale/aliased plans refuse wholly.
- `pnpm run build:ide:types`, VS Code source/test typechecks, and scoped lint passed.
- Semantic runtime passed 85 files / 904 tests; semantic conformance passed 684/684 with zero known gaps.
- LSP passed 467 unit and 49 integration tests with one intentional skip when run in stable-sized shards.
- VS Code passed 604/604 tests; all 47 reviewed rename-lane probes matched their snapshots.
- Full rename-reliability shards passed 11/11 on both current and minimum VS Code.

## Platform boundary

VS Code offers no closed-file compare-and-swap primitive and does not guarantee filesystem rollback if applying one
`WorkspaceEdit` fails mid-write. The bundled client performs the strongest available pre-return validation. Generic LSP
clients safely ignore the Aurelia transaction metadata and therefore do not inherit strict closed-file enforcement.

Native F2 respects VS Code's `files.refactoring.autoSave` setting. With its default `true`, undo restores the original
content in dirty buffers over the auto-saved rename; save those restored buffers once to persist the undo. This requires
one undo action, not repeated undo operations.

## Next action

WS03 diagnostic policy/lifecycle and WS04 performance/retention work are unblocked. Formal CP2 closure remains sequenced
behind CP1's WS06 automation admission.
