# Resume Protocol

Use this whenever work resumes after compaction, context loss, or a new session.

## Required Read Order

1. [README.md](C:/projects/aurelia-ls2/packages/source-analysis/README.md)
2. [working-map.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/working-map.md)
3. [authority-first-campaign.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/authority-first-campaign.md)
4. [current-handoff.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/current-handoff.md)
5. [decision-log.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/decision-log.md)
6. [current-state.json](C:/projects/aurelia-ls2/packages/source-analysis/docs/current-state.json)
7. Run `pnpm preflight`
8. Re-read [roadmap.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/roadmap.md)
   only after the current handoff and state are loaded

## Execution Rules

- Continue only the first step whose status is `in_progress`.
- If there is no `in_progress` step, stop and decide the next step explicitly
  in `current-state.json` before doing more architecture work.
- If there is more than one `in_progress` step, treat that as continuity drift
  and fix `current-state.json` first.
- Do not silently relitigate operator decisions already captured in
  `decision-log.md`.
- Before ending a session, update `current-handoff.md` and `current-state.json`.

## What The Preflight Must Tell You

- whether the continuity files exist
- whether `current-state.json` is valid
- what the current in-progress step is
- what the current objective and next slice are
- whether the worktree is clean or dirty

## Stop Conditions

Stop and realign before continuing if:

- the current slice requires changing a decision already recorded in
  `decision-log.md`
- the next move would introduce a new projection-shaped surface instead of a
  shared authority primitive
- the worktree contains conflicting unrelated edits in the same files

