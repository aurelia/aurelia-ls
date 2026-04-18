# Decision Log

Append-only. Add new entries at the bottom so future sessions can read the
decision trail in order.

## 2026-04-18 - Authority-first campaign established

- Continuity for long-running work must live in repo files, not in chat memory.
- `deps`, `typerefs`, and `exports` are legacy projections and compatibility
  contracts, not the durable semantic axes of the package.
- New semantic capability work should land in shared authority, semantic, or
  evaluator layers first, then materialize outward only when a stable
  projection is genuinely needed.
- Natural-language ingress and ranking remain edge adapters only. They should
  not absorb semantic ambiguity that belongs in typed locators, candidate sets,
  narrowing axes, or authority adjudication.
- Future autonomous sessions should continue only the first `in_progress` step
  in `current-state.json` unless the operator explicitly redirects the work.

## 2026-04-18 - Initial authority contracts and navigation seam

- The first shared authority contracts now live under `src/authority/`.
- `query.navigate` should enter through a named authority adapter from the host
  side instead of receiving raw `AnalysisViews` directly.
- The current authority adapter is explicitly transitional and is allowed to
  read the legacy projection bundle, but it should shrink over time rather than
  become a second hidden architecture center.
- The next slice should deepen the navigation vertical slice before moving on to
  `route-witness` or `audit`.

## 2026-04-18 - Navigation now spends authority-backed evaluator seams

- `query.navigate` now spends authority-backed seams for focused analyzability,
  file localization, symbol localization, and structural owning-package
  resolution.
- Those new authority methods should remain thin delegations into shared
  evaluator modules such as `analyzability-posture`, `focused-file-query`,
  `structural-declaration-surface`, and `structural-source-file-surface`; do
  not clone their logic into multiple query surfaces.
- The next migration target is `route-witness`, followed by `audit`, using the
  same evaluator-backed seams rather than new legacy-projection joins.

## 2026-04-18 - Route-witness and audit now enter through the shared authority seam

- `route-witness` file/type localization and regime classification now spend
  the same authority-backed seam as navigation.
- `audit` package adjudication and regime classification now spend that same
  authority seam before finding collection begins.
- The next pressure point is no longer entry-path ambiguity. It is the deeper
  route/reachability and package-surface construction that still happens
  directly against `AnalysisViews`.

## 2026-04-18 - Workspace authority now owns package surface and reachability setup

- The shared authority seam now owns structural package-surface lookup,
  package-reachability construction, and route-witness retrieval.
- `route-witness` and `audit` should spend those shared package surfaces rather
  than constructing them locally.
- Snapshot provenance/freshness packaging has started to converge through
  `analysis-metadata-support.ts`, but navigation still needs the same cleanup.
- The authority file was renamed from `navigation-authority.ts` to
  `workspace-authority.ts` because it now serves multiple query families.
