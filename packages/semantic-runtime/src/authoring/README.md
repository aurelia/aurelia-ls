# Authoring

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

This folder owns semantic authoring: turning an AI/user intent into a typed plan, applying source edits elsewhere, then
reopening the app and verifying that the intended Aurelia facts materialized.

Authoring is not a one-shot scaffold generator. It should be a closed loop:

```text
intent -> capability negotiation -> authoring plan -> code edits -> app analysis -> verification or repair
```

The AI may decide product taste and prose, but this package should supply Aurelia-correct structure, known capabilities,
semantic preconditions, expected effects, and verification pressure.

The operation ontology is modeled in `ontology.ts` and explained in [ONTOLOGY.md](./ONTOLOGY.md). The flexible scope map
lives in [CAPABILITY_CHECKLIST.md](./CAPABILITY_CHECKLIST.md). Repair handoff vocabulary lives in `repair.ts`. Concrete
operation classes should point into the ontology instead of creating parallel names or generator-local categories.
`expected-effect.ts` owns the verifier-facing expected-effect algebra; `plan.ts` owns intent/precondition/step/plan
composition and should not grow a second verification model.
Named recipes currently live in `recipe.ts`; concrete builders are split by recipe so they can carry their own topology
model, preferences, ordered operations, and expected effects without turning the recipe catalog into a generator.
Current concrete recipe builders cover minimal app, state-backed form, validated state-backed form, service-backed form,
and routed state-backed form loops. All current recipe builders expose source-plan contracts plus a project-tooling
subcontract for package manifest, TypeScript config, and local asset module declarations. Build-tool/browser runner
selection is still not modeled and remains visible as package-tooling product-open policy.
Recipes also declare direct base recipes and a transitive specificity rank. This keeps superset recipes honest: a
validated, service-backed, or routed form can satisfy the state-backed form shape without losing the fact that the
more-specific recipe is the better candidate when its discriminator effects are present.
`recipe.ts` also exposes `expectedSemanticEffectsForPlan(...)` and recipe expected-effect coverage by building the plan
from stable seed inputs and compressing duplicate semantic targets across step-local and final verification effects.
Use that API and
the API's `AuthoringCatalog` / `AuthoringOrientation` rows before reading individual builders. `AuthoringCatalog`
answers "what vocabulary and recipe contracts exist?" without app facts. `AuthoringOrientation` answers "what does this
opened app already satisfy?" by evaluating the same contracts against app observations. Catalog taste-axis rows group
their common values by value layer so a future caller can distinguish policy-bearing values from observed-shape and
derived-reading values without manually joining ontology tables. Profile rows use the same preference shape as recipe
plans, so decorator, convention, and registration policies point back into the taste ontology instead of becoming prose-only
choices. Capability and operation catalog rows expose product-level open reasons before app-specific evidence is read;
that keeps source-edit/package-tooling gaps visible as global product work instead of rediscovering them only through
fixture orientation. Catalog recipe rows also expose the source-plan contract without source text: policy fields,
complete-text state, file roles, languages, edit kinds, text authorities, and project-tooling rows for package
dependencies, scripts, config file kinds, and build-tool policy. Catalog recipe rows preserve effect kind, scope,
cardinality, filter fields and values, capability/taste targets, role, ontology summaries, and the recipe intent
preferences from the seed plan; orientation recipe rows add the current opened-app observation for each effect. Both
rows carry `semanticTargetKey` so pressure scripts and
callers can group equivalent expected targets without recomputing recipe-local keys. Recipe-local deduplication uses
`expectedSemanticEffectContractKey(...)` instead of `semanticTargetKey`, so reporting compression cannot accidentally
hide a stricter cardinality, filter, capability, or taste contract. App pressure prints both all-recipe effect outcomes
and an applicable-recipe lane that ignores `not-applicable` recipes; use the applicable lane for generated fixture
health, and the all-recipe lane for cross-recipe comparison. `baseline` effects are shared
app-health expectations; `signature` effects are the recipe-identifying shape; `discriminator` effects are required
recipe-identifying shape that must be present before generic matching signatures make an opened app a candidate for
that recipe. Use the explicit `atLeast(...)`, `exactly(...)`, and role-specific cardinality constructors instead of
passing cardinality through the broad `fact(...)` argument list when a count is semantically important.
Project tooling has its own expected-effect family (`project-tooling`). Generated recipes now verify package manifest,
TypeScript config, and local asset module declaration source roles after reopen instead of treating those files as
invisible write-side artifacts.
`AuthoringOrientation` reports package tooling as `partial` when no project-tooling source roles are visible and
`observable` when package manifest, tooling config, or declaration rows are admitted; build-tool and package-manager
execution still remain product-open policy.
Generated recipe expected effects also assert the observed `build-tool-profile:typecheck-only-tooling` taste separately
from the recipe preference for `host-selected-build-tool`, so "we emitted only typecheck/module tooling" is visible
without claiming a runnable build profile.
Style assets now have a fact-level expected effect (`style-resource`) in addition to the orientation taste axis
(`style-resource-ownership`), so recipes can separately verify that stylesheet/style ownership materialized and that the
current app reading implies a particular style ownership taste. The operation/capability ontology keeps
`style-asset-authoring` separate from the broader `design-system` capability: recipes can create component stylesheets
without pretending that product-wide tokens, layout policy, accessibility policy, or component-library integration are
solved.
Route expected effects keep the broad route topology count for unfiltered `route` facts, and can also filter reopened
route rows by fields such as `originKind` and `valueKind`. Use those filters when a recipe needs to prove an intended
route authoring lane, such as `@route` object configs, instead of accepting any route topology as equivalent.
Build-tool selection is represented as taste/policy through `build-tool-profile`. Generated recipes currently prefer
`host-selected-build-tool` and expose typecheck-only project tooling; orientation may observe existing bundler config
files, but build-tool choice remains host/product policy until it has a real authoring contract.
The state-backed, service-backed, and routed state-backed form recipes now generate a root component stylesheet through
`create-style-asset` and a form-level class-token binding driven by `canSubmit`; their final verification expects
`style-resource` facts, `component-stylesheet` taste, `class-token-binding` taste, and native `value` target-access,
value-channel, and data-flow facts through structured `targetKind=node` plus `targetProperty=value` expected-effect
filters.
Shared form/style expected-effect constructors live in `form-expected-effects.ts` so recipe builders reuse one semantic
contract for component stylesheet ownership, class-token style binding, native value channels, and select model taste
instead of restating those rows locally.
Authoring orientation reads binding value-channel `targetKind` to separate native element `value` observers from custom
element/component `value`/`model`/`checked` APIs. Null target channels remain open/unknown rather than being promoted to
native DOM observer taste; custom-control form taste should stay grounded in runtime binding target semantics rather
than target-name heuristics.
`AuthoringOrientation` coverage and available-surface rows expose binding target accesses, direct target operations,
binding value channels, binding behavior applications, and binding data flows as separate surfaces. Keep those lanes
distinct when widening authoring verification: observer/accessor lookup, direct renderer/binding writes, transported
value shape, behavior application, and TypeChecker source/target flow answer different questions.
Coverage and surfaces also both advertise resource visibility and runtime controllers, so callers do not have to know
whether compiler-world visibility or hydration facts are filed under coverage-only rows.
The validated state-backed form recipe deliberately stays separate from the plain form recipe. It adds
`ValidationHtmlConfiguration`, `IValidationRules`/`IValidationController` usage, and `& validate` bindings, then expects
fact-level `binding-behavior-application` rows for `validate` plus `validation-controller-usage` as a discriminator
taste so validation ownership remains an explicit authoring choice. The recipe can also emit a static validation
trigger such as `& validate:'blur'`; verification matches that through the `BindingBehaviorApplications`
`staticArgumentValues` row field rather than inspecting source text.
The current observation uses the same shared expected-effect primitive as closed-loop verification, so a recipe can
report whether its ambition is already satisfied, partially missing, unsupported, or not applicable before a generator
or repair planner picks the next move. Filtered binding target/value/data-flow expectations require row-level facts;
count-only verification snapshots remain valid only for unfiltered effects. Use `expectedSemanticEffectsForPlan(plan)`
rather than only the final verification step when checking a concrete plan: step-local effects often carry the signature
or discriminator facts that make a recipe meaningful.
Use `readAuthoringVerificationSnapshot(app)` when verifying a reopened app from the public API. It collects the summary,
topology, orientation, open seams, binding-behavior applications, target accesses, direct target operations, value
channels, and data-flow rows with pagination, so recipe and repair smokes do not each decide which row families matter
for filtered expected effects. Use `target-operation` effects for renderer or binding writes that deliberately bypass
the observer locator, such as captured static attributes, class/style renderers, or direct attribute/property updates.
If one of those row-backed projections is unsupported for the opened app's analysis depth, the helper fails early
instead of turning missing analysis into zero observed facts.
`source-plan.ts` is the first explicit edit boundary: recipes may attach file-level source edits with text authority,
conflict policy, formatting policy, and package-tooling policy instead of hiding those choices in operation prose.
Recipe source templates fail closed when a placeholder has no value or a supplied value is unused; template/source-plan
drift should surface while building the plan rather than after a generated fixture is reopened.
`package-tooling.ts` is the first structured project-tooling boundary: generated recipes can carry recipe-owned
`package.json`, `tsconfig.json`, and declaration-file text without claiming that build-tool profile selection is solved.
The minimal, state-backed, validated state-backed, service-backed, and routed state-backed form recipes now use those
lanes to generate temporary apps from their own source and tooling plans before reopen verification.
The durable fixture materializer derives from `AuthoringRecipeDescriptors` and writes every recipe source plan under
`fixtures/authoring/generated-*`, replacing each generated folder first so stale files do not survive recipe changes.
Adding a concrete recipe no longer requires a second hand-maintained fixture list.
Repair plans live in `repair-plan.ts`; they turn observed repair clusters into operations and semantic closure effects
without claiming code-action/source-edit policy is solved.

## Boundary

- `application` models the framework-normal app topology that authoring wants to create or modify; see
  [../application/README.md](../application/README.md).
- `authoring` models capability negotiation, semantic operations, plan steps, and verification expectations.
- `api` opens apps and returns compact semantic answers after edits have been applied; see
  [../api/README.md](../api/README.md).
- Source edit application, formatting, package-manager execution, build-tool selection, and user-facing taste
  negotiation sit outside this folder until their durable semantic contracts are clear. Source edit and project-tooling
  plans can still declare concrete recipe-owned text plus the policies a host must honor before applying it.

## Principles

- Prefer idiomatic Aurelia source shapes over analyzer-friendly shortcuts.
- Treat taste as policy, not semantic substrate.
- Treat unsupported app shapes as explicit capabilities with open summaries, not as silent fallback generators.
- Verify effects through semantic facts and open seams, not brittle file snapshots.
- Keep recommendable authoring output and analyzer stress pressure in separate fixture lanes.
- Add authoring operations only when the analysis side has, or is about to get, the substrate needed to prove them.
- Treat repair rows as semantic handoffs from diagnostics/open seams to later operations, not as concrete source edits.
- For open-seam repairs, separate the runtime boundary kind from the runtime intent needed to close it. For example, a
  dynamic router `href` can ask for href-ownership intent without pretending a source edit is already safe.
- When an open seam has source provenance, preserve it as a `runtime-boundary` action target. This keeps large repair
  clusters navigable without claiming that the product already knows the right source edit.
- Treat large requests such as auth setup as recipes composed from smaller semantic operations.
- Keep open scope in [CAPABILITY_CHECKLIST.md](./CAPABILITY_CHECKLIST.md), not in incidental prose scattered across
  folder READMEs.

## Success Shape

The success signal is not that files are generated. The success signal is that an authored app reopens through the API
and produces closed-enough configuration, DI, resource, compiler-world, template, and TypeChecker-backed facts with any
remaining gaps named as actionable open seams.
