# WS02 — Rename and Edit-Transaction Correctness

Status: `queued`

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

## Exit criteria

- F-REN-001 through F-REN-004 have verified or explicitly bounded dispositions.
- The exact reported journey passes through real host UI on VS Code 1.91 and current stable.
- Supported surfaces produce one complete version-aware edit and one coherent undo/redo unit with zero residue.
- Session reconciliation cannot produce a partial native rename for an owned project.
- Supported candidate-bearing cases are resolved or source-located and reviewable; count-only partial migration is not
  the terminal design.
- Semantic, LSP, lane, integration, and host mutation gates are green after the final WS02 change.
