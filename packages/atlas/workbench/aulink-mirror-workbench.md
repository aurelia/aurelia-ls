# auLink Mirror Workbench

## Aim

Build an Atlas-native mirror model that uses `auLink` as a maintained bridge from semantic-runtime declarations to Aurelia framework semantics. The model should help future agents see where semantic-runtime already mirrors the framework, where framework semantics imply product obligations, and where semantic-runtime has asymmetric implementation depth that should change the next development move.

## Constraints

- Keep `auLink` as an exact bridge: catalog overloads, decorator placements, and framework declarations are evidence, not labels to fuzzy-rank.
- Prefer framework-backed relationships over semantic-runtime name heuristics.
- Treat missing or asymmetric product structure as signal. Do not paper it over with compatibility aliases.
- Keep report surfaces budgeted by default; detailed rows should require an explicit projection, filter, or page.
- Avoid hard-coded semantic-runtime class catalogs. Stable kernel primitives are acceptable when they carry real product meaning.

## Durable Read

- `bridge.aulink` is exact but shallow: it answers catalog, placement, target, and gap questions.
- `framework.composition` can already gather broad framework relationships, but its answer-level claim shape is intentionally loose and string-heavy.
- The old au-mcp mirror graph proved a useful algebra: `auLink` spotlight + framework target + framework semantic role evidence. Its weak point was carrying MCP-era projection and pressure surfaces as their own authority.
- Atlas now has richer framework substrates than au-mcp had: DI world, materialization, compiler flow, hydration, rendering consequences, lifecycle, observation, resource convergence, and emulation obligations.

## Live Metric Hygiene

Do not freeze live bridge counts in this workbench. Catalog size, placement count, ambiguity count, and gap count are outputs of the current checkout, not design facts.

When a count matters, keep three things instead:

- the live projection that reproduces it (`summary`, `anchors`, `targets`, `gaps`, `mirror`, `role-evidence`, `obligations`, or the usage projections);
- the question the count was meant to answer;
- the interpretation rule that should survive when the count changes.

The durable bridge-health rule is: once catalog and placement gaps are low, the pressure moves from coverage to role evidence, obligations, target ambiguity, usage asymmetry, and whether the product mirror exposes a framework-shaped responsibility boundary.

## Capability Target

The next durable primitive should let an agent ask:

- For a semantic-runtime auLink placement, which framework roles does its target play?
- Which exact framework rows make those roles visible?
- Which product-side placement is the current mirror, and where is its source?
- Which framework emulation obligations hang off that target?
- Which gaps are bridge gaps, framework-semantic gaps, product-depth gaps, or signs that a different shared substrate should answer the question?

## Standing Notes

- Bridge coverage should be checked through live `summary`, `anchors`, `targets`, and `gaps` reads. The workbench should only carry the architectural consequence: coverage alone is not the pressure surface once the exact bridge is mostly closed.
- Framework target ambiguity should be checked through live `targets` rows. Mirror joins must not assume one candidate unless exact source or package evidence closes it.
- `framework.composition` default rows can flood with detailed claims. A useful mirror view needs compact role summaries first and continuation-backed detail second.
- General source-containment matching is too broad for role evidence. `TemplateCompiler` falsely absorbed lifecycle rows because call sites inside its methods belonged to downstream resources, not to the compiler as an actor. Role evidence now joins through exact relationship endpoints or endpoint owners; source containment is only used for emulation-obligation attachment.
- Broad `mirror`, `role-evidence`, and `obligations` requests should be rollup-first. Rows appear when a caller supplies a filter, page, or row budget, and overview continuations carry a small budget so following them does not accidentally dump the whole mirror.
- A public `surprises` projection was removed. The categories were too easy to read as ontology authority. Mirror asymmetry is still useful, but it should fall out from exact role evidence, obligations, target ambiguity, and the shared framework API usage/shape substrate instead of living as a bridge-specific taxonomy.
- `usage-comparison` compares both ends of each `auLink` id: Aurelia-side framework API usage from `framework.api`, falling back to exact framework target-declaration usage for internal symbols, and semantic-runtime usage of the decorated product target. This should stay count/set based rather than becoming a new gap-kind taxonomy; the judgment belongs to the caller reading exact rows and continuations.
- Product-area and declaration-kind rollups remain useful as compact context for mirror rows. They are interpretive aids, not product catalogs.
