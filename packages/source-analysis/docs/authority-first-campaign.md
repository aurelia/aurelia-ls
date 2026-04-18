# Authority-First Campaign

This is the canonical campaign document for long-running autonomous work on
`packages/source-analysis`.

If stale chat memory, a half-finished branch, or local notes disagree with this
file plus [current-handoff.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/current-handoff.md)
and [current-state.json](C:/projects/aurelia-ls2/packages/source-analysis/docs/current-state.json),
the repo files win.

## Product Direction

`source-analysis` is becoming a shared semantic authority for AI-assisted
engineering over TypeScript and, later, Aurelia.

The target layering remains:

1. Structural substrate
2. Semantic analysis kernel
3. Evaluators
4. Derived projections and caches
5. Inquiry surface
6. Semantic adapters

## Fixed Truths

- `deps`, `typerefs`, and `exports` are legacy projections and compatibility
  contracts, not the durable semantic axes of the package.
- New semantic capability work should land in shared authority, substrate,
  semantic, or evaluator layers first.
- Natural-language ingress, ranking, repair, and examples are edge adapters
  only. They must not become the place where semantic ambiguity is resolved.
- No-claim, refusal, blocked, stale, and withdrawn outcomes are first-class
  product behavior.
- Aurelia-aware meaning must land on top of shared primitives, not by
  contaminating the framework-agnostic core.
- Long-running continuity must live in repo files, not in chat memory.

## Anti-Goals

- Do not add new projection-shaped command families just because a question is
  convenient to answer through old `deps` / `typerefs` / `exports` payloads.
- Do not extend noun/verb/alias ranking to solve semantic ambiguity that should
  be handled by typed locators, candidate sets, narrowing axes, or authority
  adjudication.
- Do not add more broad ontology unions when a narrower family would be more
  honest.
- Do not let answer-local assembly become the long-term owner of truth when a
  shared runtime can own it.

## Ordered Phases

1. Continuity scaffolding
   Exit when the repo owns the campaign state, resume protocol, and preflight.

2. Typed authority contracts
   Create venue-neutral contracts such as entity identity, locators, ambiguity
   sets, no-claim outcomes, evaluator evidence, and spend thresholds.

3. Navigation vertical slice
   Move one live query surface, likely `query.navigate`, onto shared authority
   contracts end to end.

4. Route and audit migration
   Move `route-witness` and `audit` off direct legacy projection stitching and
   onto shared authority and evaluator surfaces.

5. Inquiry ontology split
   Separate route families, read modes, provenance families, and execution
   posture so the outer inquiry boundary stops carrying one overloaded label
   space.

6. Semantic kernel deepening
   Strengthen symbol/declaration/export identity, then call, control-flow, and
   data-flow evaluators.

7. Aurelia semantic adapters
   Land framework-aware meaning on top of the strengthened shared substrate.

## Session Rules

- Resume by following [resume-protocol.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/resume-protocol.md)
  exactly.
- Continue only the first `in_progress` step in
  [current-state.json](C:/projects/aurelia-ls2/packages/source-analysis/docs/current-state.json)
  unless the operator explicitly changes direction.
- Update `current-handoff.md` and `current-state.json` before ending a session.
- Append operator decisions and architecture-forcing choices to
  [decision-log.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/decision-log.md).
- Leave the codebase with enough durable breadcrumbs that a future pass can
  continue without reconstructing intent from chat.

## Steering Gates

Operator judgement is still required for:

- freezing public ontology names
- choosing canonical truth when live state and projections disagree
- bounding speculative semantic evaluation
- defining the framework-agnostic versus Aurelia-specific boundary
- deciding compatibility breakage for legacy projection shims
- turning operator taste into explicit steering surfaces

