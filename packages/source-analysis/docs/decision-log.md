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
