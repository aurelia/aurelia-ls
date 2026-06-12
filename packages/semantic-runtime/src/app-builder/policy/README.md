# App-Builder Policy

This folder owns app-builder recommendation and status policy projections.

## Recommendation Policy

`recommendation-policy.ts` is the reviewable recommendation surface. It ranks
recommendation postures, joins local defaulting-candidate policy, derives
applicability from the ontology input graph, records evidence lanes, and
summarizes the current policy terrain for `catalog-integrity`.
`recommendation-policy-detail.ts` is the public read-only detail projection over
that same terrain; callers can filter by target, posture, applicability,
evidence, implementation state, explicit-input state, defaulting-candidate state,
or executable contextual policy-satisfaction candidates.
It returns summary/counts by default. Full rows are opt-in with
`includeRows: true`, which keeps MCP and IDE callers from paying for a bulky
policy table until a compact count points at something worth inspecting.

`recommendationStatus` is not a context graph. It only says the row's current
posture before caller/project policy overrides. To understand whether a row can
be used, inspect `applicability`: most rows inherit input-dependency
applicability from the existing ontology relation graph, and targeted rows add
more specific conditions such as domain-field kind, finite choice value sets,
numeric constraints, collection projection, source placement, visual input, or
deferred substrate.

`evidence` is the grounding surface for recommendation policy. Semantic-runtime
ontology admission, source-lowering registry support, operator interview
decisions, framework corpus, web-platform semantics, public research,
source-plan substrate, deterministic existing-app analysis, framework
capability, control-manifest contracts, legacy source-backed authority, and TBD
evidence are separate lanes. The current projection should keep legacy
source-backed evidence at zero; if it returns, sharpen the row into a concrete
evidence lane or leave it review-visible as a deliberate unresolved source-backed
canary.

`defaultingCandidate` is intentionally not a blank-slate default. It means an
ontology target is a candidate when an already selected policy axis, ontology
family, or target context needs a policy-backed fallback. Blank-slate/new-app defaults need a separate
decision/defaulting layer that expands into explicit supplied inputs and policy
choices.

`defaulting-candidate-policy.ts` owns the local defaulting-candidate table and
scope/rationale rows. Keep it separate from recommendation posture so future
profile/defaulting work does not turn recommendation policy into hidden starter
selection.
Selectable `target-catalog` rows should expose the compact result of this policy:
`defaultingCandidate`, the optional `defaultingCandidatePolicy` scope/rationale,
and whether contextual executable source lowering needs policy satisfaction.
Keep the full applicability/evidence table in `recommendation-policy-detail.ts`;
the target catalog is a menu, not a replacement for the review projection.

## Decision Bundles

`decision-bundle.ts` owns the current request-local defaulting carrier. A
decision bundle is not a named profile: it groups explicit caller, operator
default, or framework-default decisions for one inquiry, then expands those
decisions into ordinary `suppliedInputs` before readiness, preflight, and source
lowering run.

Use decision bundles when a caller has intentionally selected defaults or policy
choices but the target surface still needs the normal input-readiness path. The
readiness/preflight answers keep both counts: explicit supplied inputs before
expansion, and effective supplied inputs after bundle expansion. Named
blank-slate profiles remain deferred until repeated decision bundles prove a
stable profile shape.

Decision-bundle expansion rows are detail output. Compact/default answers should
report counts and readiness consequences without dumping every expanded marker;
callers can opt into expansion rows when they need to explain or debug how a
bundle became supplied inputs.

Decision-bundle decisions may be target-global or target-scoped. Expansion
preserves any `targetRefs` onto the produced supplied input, and readiness,
preflight, invocation, composition, and direct SourcePlan lowerers must filter
effective supplied inputs through the shared target-scoped helpers before
spending them. This keeps a policy/source choice for one co-present ontology
target from accidentally satisfying a neighboring target.

## Policy Satisfaction

`policy-satisfaction.ts` owns the first-ring gate for contextual executable
source-lowering targets. A contextual row with source-lowering support is not
allowed to report `canRequestSourceLowering=true` merely because a broad/default
preflight target set and ordinary payload fields reached it.

For source-producing target preflight, exact target selection is the normal
satisfaction source. Generated control-use review can also report narrower
satisfaction sources when the caller explicitly selected a nested control
pattern inside a composition input, or when supplied domain field shape
deterministically selected that contextual native control. Those narrower
sources explain generated control-use policy coverage; they are not named
blank-slate profiles, saved project policy, or business-domain inference.
Future policy or profile work should extend this shared gate rather than adding
another local definition of "contextual executable target."

Source-lowering preflight keeps policy-satisfaction issues row-local, but its
top-level summary also reports policy-gate required/missing/satisfied counts.
That lets broad/default MCP answers stay skim-safe without pretending row-local
contextual gates are malformed request issues.
The target catalog reports only whether the gate is required. Satisfaction state
belongs to preflight or generated control-use review, where the inquiry has a
specific source-producing target or nested control selection to evaluate.

## Status Projection

`status-projection.ts` derives public status from row declarations plus live
registries. Source-lowering implementation is projected from
`source-lowering-surface.ts`, so executable support does not have to be
hand-synchronized across every ontology row file.

## Ground Rules

- Keep recommendation and default-candidate choices operator-reviewable.
- Keep applicability and evidence separate; do not hide context in
  `contextual` or proof in `source-backed`.
- Do not infer user taste, app domain, or existing-app business intent here.
- Do not store blank-slate defaults on ontology rows.
- Keep public recommendation-policy answers compact by default; expose rows only
  when the caller asks for detail.
- Prefer small deterministic rule functions over hidden heuristic scoring.
- Keep policy satisfaction separate from input readiness: missing target
  selection is not missing domain payload, and exact target selection is not a
  blank-slate default.
