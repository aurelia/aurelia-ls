# Current Handoff

Last updated: 2026-04-18

## Current objective

Define typed locator and shared authority contracts so future work starts
resolving ambiguity by adjudication instead of by better ranking.

## Exact next slice

1. Introduce venue-neutral authority contract types for entity identity,
   locators, ambiguity sets, no-claim outcomes, evaluator evidence, and spend
   thresholds.
2. Keep `deps`, `typerefs`, and `exports` in compatibility posture while the
   new contracts land. Do not add new projection-shaped peers.
3. Thread the first new contract through one live vertical slice, preferably
   `query.navigate`, so the contracts stop being abstract paperwork.

## Recently landed

- Added high-signal `// TODO` markers calling out legacy projection pressure,
  ingress-ranking pressure, and answer-local truth assembly seams.
- Established repo-owned continuity files and a preflight command so future
  sessions resume through the same state instead of relying on chat memory.

## Constraints

- Do not solve semantic ambiguity by adding more alias, noun, verb, or example
  matching to the ingress layer.
- Do not grow `query.deps.*`, `query.typerefs.*`, or `query.exports.*` into a
  larger architectural family. Treat them as legacy compatibility shims.
- Prefer shared authority or evaluator surfaces over direct
  `analysis.deps` / `analysis.typeRefs` / `analysis.exports` stitching.
- Keep no-claim and blocked outcomes explicit rather than weakening everything
  into a fuzzy positive answer.

## Loose threads intentionally left open

- `AnalysisViews` still carries the historical projection triple and remains a
  major continuity seam.
- `claim-lattice.ts` is promising, but it is not yet clearly the persistent
  authority runtime consulted by all live query surfaces.
- `inquiry-model.ts` still overloads routes, read modes, focus kinds,
  provenance kinds, and execution posture.
- `route-witness` and `audit` still describe freshness in terms of the legacy
  projections rather than a named shared route/reachability authority.

## Likely files for the next pass

- `src/inquiry-model.ts`
- `src/analysis-views.ts`
- `src/navigation.ts`
- `src/capability-catalog.ts`
- `src/inquiry-catalog.ts`
- a new shared authority module family, likely under `src/authority/` or a
  similarly neutral shared location

## Verification reminders

- Run `pnpm preflight` before non-trivial work.
- Re-run `pnpm --filter @aurelia-ls/source-analysis test` once the next slice
  changes executable code rather than only docs/comments.

## Resume command

`pnpm --filter @aurelia-ls/source-analysis preflight`

