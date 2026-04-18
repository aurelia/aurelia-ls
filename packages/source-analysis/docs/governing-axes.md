# Governing Axes

Use this note when adding, splitting, or moving a capability.

The architecture stays honest only if every capability is classified on three independent axes.

## Axis Record

Write these down before naming the API or choosing the module boundary.

| Axis | Question | Current slots |
| --- | --- | --- |
| Delivery surface | Where is it exposed or consumed? | IDE/editor, semantic authority host/API, AI/MCP/tool client, CLI/report/audit, build/runtime/package tooling |
| Action law | What is it actually doing? | observe/query, adjudicate/validate, transform/author, emit/materialize, verify/replay/pressure, visualize/reveal |
| Operating regime | Under what constraints must it stay truthful and useful? | partial/complete, incremental/single-shot, reversible/irreversible, low-risk/high-risk, fail/degrade/record/refuse |

Regime anchors:

- IDE
- Report/Audit
- Build/HMR
- AOT

## Separation Rules

Apply these rules after the axis record is written.

1. Same action law, different delivery surface: build a new adapter, not a new core capability.
2. Same delivery surface, different action law: split the capability. Shared venue does not make one semantic job.
3. Same capability, different regime: make the regime explicit in the contract, evaluator, or profile. Do not hide it in heuristics.
4. Natural-language ingress, ranking, repair, and examples live at the edge. Typed authority lives underneath.
5. Public contracts should expose semantic objects and operations before conversational helpers.

## Operational Use

When a change is non-trivial, force it through this shape:

1. Name the semantic capability in venue-neutral language.
2. Record its delivery surface.
3. Record its action law.
4. Record its operating regime.
5. Identify the authority layer that should own the truth.
6. Identify the adapter layer, if any, that helps callers reach it.

If steps 5 and 6 collapse into one thing, stop and recheck the design.

## Smell Tests

These usually mean the architecture is starting to lie:

- The capability is named by venue alone.
- Ambiguity is being handled by more regexes, token matching, or ranking rules instead of typed locators or adjudication.
- One enum or model is carrying venue, semantic job, and regime at the same time.
- A chat answer shape or UI card is becoming the source of truth.
- A projection, snapshot, or export format owns reasoning that should live in shared authority.
- Regime-specific behavior is hiding in cache policy, freshness branching, or prompt logic.

## Questions For Autonomous Work

- Which axis is this change actually moving?
- Is this a new semantic capability, or only a new ingress to an existing one?
- Would this still make sense if the AI-facing layer disappeared?
- Is this rule expressing semantic truth, or only helping a caller reach the right capability?
- If ambiguity is growing, am I missing a typed authority layer instead of another ranking rule?
- Is regime-specific behavior explicit, or hiding in heuristics, caching, or prompt logic?
- Am I freezing a conversational adapter into the public contract when the real asset should be the authority beneath it?

## Quick Examples

- Adding an AI-friendly planner on top of existing navigation is a new delivery surface adapter, not a new semantic capability.
- Adding audit and route explanation at the same surface still means two action laws, so they should not collapse into one broad label.
- Running the same export-resolution authority in IDE and AOT regimes should reuse authority while making regime differences explicit.
