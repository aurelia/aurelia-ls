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
Current concrete recipe builders cover minimal app, state-backed form, localized state-backed form, validated
state-backed form, service-backed form, routed state-backed form, state-store todo, catalog storefront, and composed
dashboard loops. All current recipe builders expose
source-plan contracts plus a project-tooling subcontract for package manifest, TypeScript config, and local asset module
declarations.
Build-tool/browser runner selection is still not modeled and remains visible as package-tooling product-open policy.
Recipes also declare direct base recipes and a transitive specificity rank. This keeps superset recipes honest: a
validated, service-backed, or routed form can satisfy the state-backed form shape without losing the fact that the
more-specific recipe is the better candidate when its discriminator effects are present.
The service-backed form recipe now means service-backed state rather than a template-facing service facade: components
resolve DI state, templates may bind directly into ordinary state classes, and view-model getters/setters are reserved
for real adaptation rather than one-hop member forwarding. The state class owns service/repository calls for loading and
submission side effects. Its discriminator effects therefore prove state-to-service calls plus template-to-state binding
handoff, not component bindability through a service object.
The generated service-backed form resolves DI state in the component, but the nullable request lookup is now expressed
in the template with `<let request.bind="state.readRequest(requestId)"></let>` followed by `if.bind` narrowing. The
template then binds directly to `request.customerName`, `request.email`, `request.urgent`, `request.contactPreference`,
and the select values. That direct object-backed path is intentional: it proves ordinary domain-object binding, the
runtime `LetBinding` scope handoff, and capture/spread field-shell handoff without `with.bind`, `$parent`, one-hop
view-model forwarding getters, or per-field component setters.
The plain, localized, and validated state-backed form recipes use the same template-local request lookup. The scalar
`requestId` remains the component interface, while `<let>` owns the id-to-domain-object adaptation for the template.
Domain getters such as `ServiceRequest.canSubmit` remain real derived state; generated view-model getters whose main
purpose is shortening `state.member` or `state.readRequest(id)` paths should not reappear. Validated variants register
validation rules on the `ServiceRequest` class, because Aurelia's validation accessor parser accepts property chains,
not arbitrary state lookup calls. That keeps validation metadata attached to the same domain model that the rendered
controls edit without restoring a component-level forwarding getter. The final verification filters binding data-flow and observed-dependency
rows for the exact `request.urgent`, `request.contactPreference`, `request.primaryTopic`, and `request.topics` channels,
so checkbox, radio, single-select, and multiple-select semantics are protected as direct domain-object binding facts.
The localized state-backed form recipe keeps the recommendable DI-owned state/form shape and adds `@aurelia/i18n`
plugin registration with static `I18nConfiguration` resources, `t` attributes, and `t-params.bind` values. Its
discriminator effects prove plugin admission plus `i18n-translation-key` and `i18n-translation-binding` rows, so
localization can be verified through semantic facts instead of source-text snapshots. The generated submit button uses
Aurelia's multi-target i18n key-expression syntax (`[title]form.submit;form.submit`) so the recipe also proves
normalized translation target properties and target kinds.
The catalog storefront recipe is the first generated app-building recipe beyond forms. It uses DI-owned composed state,
a catalog service for background loading, scalar ID handoff between non-leaf components, and getter projections over
state lookups so recommendable templates do not depend on nullable object reads while still exercising list/detail
composition, service interaction bindings, state composition verification, promise pending/then/catch branch
controllers, switch/case/default-case availability states, and class/style interpolation plus per-token `.class` and
per-property `.style` bindings backed by row-level target access, value-channel, data-flow, and style-binding taste
verification. It also verifies `binding-observed-dependency` rows for direct state-member reads, so direct DI state
template binding is protected as an observation feature rather than justified by prose alone.
The composed dashboard recipe is the first generated app-building recipe that verifies dynamic component composition.
It uses DI-owned widget state, repeated dashboard cards, a TypeChecker-visible union of widget component classes, and
`<au-compose component.bind model.bind>` handoff. Its discriminator effect is `runtime-composition`, backed by
`RuntimeCompositions` rows that report component resolution kind, model resolution kind, resolved component count,
compiled template count, candidate resource-analysis coverage, and aggregate composed child-controller handoff for
closed static/value branches. The same row now records `activate(model)` handoff kinds, parameter/model assignability,
static/defaulted `scopeBehavior` and `flushMode`, template-only composition presence, host `tag`, and
`composition`/`composing` from-view handoff presence. The recipe therefore proves both a repeated dynamic widget
composition and a scoped template-only summary composition without inferring either from markup alone. Recursive child
composition rendering, template-only runtime template compilation, and lifecycle run/deactivate state remain
controller/composition frontiers instead of source-plan shortcuts.
The state-store todo recipe is the first generated `@aurelia/state` recipe. It uses
`StateDefaultConfiguration.init(...).withStore(...)`, a default todo store, a named filters store, `.state` /
`.dispatch` command syntax, and default plus named `& state` binding behaviors. Its expected effects prove plugin
admission, default/named `state-store` rows, `aurelia-state-store` ownership taste, and state binding-behavior
applications. The semantic-runtime state substrate also projects initial-state argument types so `& state` and `.state`
expressions evaluate against store-backed binding scopes, while `.dispatch` emits state-store action source operations
and payload value channels. The generated template intentionally keeps simple heading/body reads as interpolation holes
with `& state`: runtime-html binds each interpolation part through `InterpolationPartBinding`, so binding-behavior
bind-time scope handoffs are an interpolation-part feature as well as a bind-command feature. The generated input
dispatch expression verifies that `$event.target.value` refines through the authored native input element.
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
Composed state has its own expected-effect family (`state-composition`) backed by `api.AppTopology.stateCompositions`.
Use it when a recipe needs to prove that a DI state class owns typed child state instances, rather than inferring app
shape only from folder names or arbitrary object literals.
Runtime component composition has its own expected-effect family (`runtime-composition`) backed by
`api.RuntimeCompositions`. Use it when a recipe needs to prove that an `AuCompose` host resolved dynamic component
candidates, compiled their templates, exposed candidate resource-analysis coverage, materialized aggregate composed
child-controller handoff for closed branches, closed activation model handoff where a component or object view-model
exposes `activate(model)`, or when it needs to prove template-only composition context inputs such as `scopeBehavior`,
`tag`, `flushMode`, `composition`, and `composing`. Rows also expose direct/promise/absent/open input fulfillment for
component, template, and model inputs, so recipes can prove framework-supported promise-valued composition inputs
without inferring composition from markup alone.
Runtime controller facts are row-backed when a recipe supplies filters. Shared helpers in
`template-controller-expected-effects.ts` verify built-in template-controller handoff rows such as
`creationKind=template-controller`, `templateControllerFlowKind=iteration`, `childViewCardinality=many`, and matching
synthetic-view hydration. Promise helpers also verify `pending`/`then`/`catch` branch rows with
`templateControllerLinkKind=promise-branch-to-promise`, so generated markup can assert the controller relationship and
not just the presence of promise-shaped rows. Switch helpers similarly assert `case`/`default-case` linkage through
`templateControllerLinkKind=switch-case-to-switch`. Use these helpers when generated markup depends on built-in
template-controller semantics rather than treating `runtime-controller` as an aggregate count.
I18n translation catalogs have their own expected-effect family (`i18n-translation-key`) backed by
`api.I18nTranslationKeys`. Use it when a recipe needs to prove that static plugin resources materialized as translation
keys. Rendered i18n translation usages have a separate expected-effect family (`i18n-translation-binding`) backed by
`api.I18nTranslationBindings`. Use it when a recipe needs to prove that `t`/`t.bind` and `t-params.bind` materialized as
target-element binding groups with closed lifecycle issue counts and framework-shaped target semantics such as
`targetProperties=title` or `targetKinds=text-content`. Keep both distinct from i18n template diagnostics: translation-key
rows describe catalog availability, translation-binding rows describe successful rendered lifecycles, and
`AUR4000`/`AUR4001`/`AUR4002` diagnostics describe `TranslationBinding` lifecycle failures after rendering.
Template diagnostics have their own expected-effect family (`template-diagnostic`) backed by
`api.TemplateDiagnostics`. Use it for route-scoped repair or LSP-style witnesses such as weak owner typing; keep it
separate from ordinary completion pressure so a missing owner type becomes diagnostic/repair evidence instead of fake
candidate synthesis.
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
Class and style presentation bindings now have reusable expected-effect helpers in `form-expected-effects.ts`.
Generated recipes can verify class attribute accessors, whole-class token value channels, per-class toggle channels,
whole-style-rule channels, per-property style channels, and plain-attribute interpolation data flow without falling
back to source-text assertions.
Route expected effects keep the broad route topology count for unfiltered `route` facts, and can also filter reopened
route rows by fields such as `originKind`, `valueKind`, and `routeProductKind`. `routeProductKind` comes from the
shared route query registry used by API dispatch and route-effect facts. It distinguishes route configs, RouteContexts,
au-viewport products, ViewportAgents, router instruction trees, recognizer products, RouteTrees/RouteNodes, and
ComponentAgent handoffs. Use those filters when a recipe needs to prove an intended router/viewport authoring lane
instead of accepting any route topology as equivalent. Shared router expected-effect constructors live in
`route-expected-effects.ts`.
Open seam expectations have a separate `open-seam` row-backed effect for pressure fixtures that intentionally preserve
runtime boundaries, while `open-seam-closure` remains the absence check used by generated recipes. Use this split when a
fixture should prove both that a static router lane closes and that a dynamic runtime-intent boundary stays explicit.
The routed state-backed form recipe now uses a parameterized route (`form/:requestId`), a sibling static navigation
target (`form/request-1+summary?mode=edit&tag=primary&tag=priority#details`), named route viewports (`main` and
`sidebar`), and `IRouteContext.getRouteParameters({ includeQueryParams: true })` inside the routed view-model so the
generated form receives its scalar ID and query metadata from the route rather than from a local selection widget. Its
router effects assert the request parameter on route-pattern, route-endpoint, and recognized-route rows, assert static
query/fragment propagation on viewport-instruction-tree rows, and assert sibling viewport routing plus include-query
route-node aggregates on route-config, router-viewport, route-node, and component-agent rows. This proves static
parameter-name/value, query-value, and viewport-target propagation through the modeled recognizer/route-tree lane.
Append/by-route static aggregation is API-visible as analysis evidence; dynamic query merging and live navigation state
remain router substrate work.
Build-tool selection is represented as taste/policy through `build-tool-profile`. Generated recipes currently prefer
`host-selected-build-tool` and expose typecheck-only project tooling; orientation may observe existing bundler config
files, but build-tool choice remains host/product policy until it has a real authoring contract.
The state-backed, service-backed, and routed state-backed form recipes now generate a root component stylesheet through
`create-style-asset`, a form-level class-token binding driven by `canSubmit`, and a capture-based `field-shell` custom
element that forwards authored `value` / validation attributes through `...$attrs` into a native input; their final
verification expects `style-resource` facts, `component-stylesheet` taste, `class-token-binding` taste, native `value`
target-access, value-channel, and data-flow facts through structured `targetKind=node` plus `targetProperty=value`
expected-effect filters, a `target-operation` fact for captured `type="email"` spread into the inner native input,
captured `valueSiteKind=captured-value` two-way value data-flow, and checked/radio target-access, value-channel, and
data-flow facts through `targetProperty=checked`. State-backed variants additionally assert `request.*` source names and
select/checked value-channel kinds so the recipe cannot accidentally drift back toward view-model field facades.
Primitive form/style expected-effect constructors live in `form-expected-effects.ts`, while
`form-recipe-expected-effects.ts` composes those primitives with project-tooling, component-role, external-template, and
runtime-controller expectations for recommendable generated form apps. Recipe builders should reuse the recipe-level
composition when they mean the same standard form semantics, then add only their state, service, validation, or router
discriminator effects locally.
The standard form recipes now include a nullable single-select beside the multi-select array control, mirroring the
Aurelia docs pattern of `option model.bind="null"` for "choose later" placeholders. State-backed variants also include
one object-valued assignee select with `matcher.bind="state.sameSupportAgent"` because the docs present object model
values and app-authored matchers as a legitimate form pattern. Verification asserts both the primitive `null` model
domain and the `usesCustomMatcher` value-channel row, while keeping matcher-heavy matrices in pressure fixtures rather
than treating object comparison as the universal form recommendation.
`form-recipe-plan-steps.ts` carries the shared recommendable form-app plan steps for project files, entrypoint, root
component, component stylesheet, external templates, form component creation, template binding, and verification. Use
those helpers for the repeated standard form scaffolding shape, then keep recipe-specific state, service, validation,
or router steps visible in the concrete builder.
Authoring orientation reads binding value-channel `targetKind` to separate native element `value` observers from custom
element/component `value`/`model`/`checked` APIs. Null target channels remain open/unknown rather than being promoted to
native DOM observer taste; custom-control form taste should stay grounded in runtime binding target semantics rather
than target-name heuristics. Checked/select `matcher.bind` is also visible as `custom-matcher-comparison` form taste
and can be verified by filtering `binding-value-channel` expected effects with `usesCustomMatcher=true`; this records
the framework handoff to app-supplied equality without executing matcher bodies.
`AuthoringOrientation` coverage and available-surface rows expose binding target accesses, direct target operations,
binding value channels, binding behavior applications, and binding data flows as separate surfaces. Keep those lanes
distinct when widening authoring verification: observer/accessor lookup, direct renderer/binding writes, transported
value shape, behavior application, and TypeChecker source/target flow answer different questions.
They also expose binding observed dependencies, computed observation definitions, and computed observer sources
separately. Binding observed dependencies prove that an authored template expression would be observed by Aurelia's
template connectable circuit;
computed definitions prove source-backed `@computed` declarations, while computed observer sources prove ordinary
getter descriptor or getter-owned observer execution. Do not add `@computed` to generated code merely to make a
getter observable; plain accessors enter the observer-locator/computed-observer lane.
The `template-model-access` taste axis is the durable policy vocabulary for this: generated recipes may prefer direct
DI state/domain bindings, template-local lookup/narrowing, and meaningful view-model adapters, while treating one-hop
view-model forwarding accessors as pressure rather than boilerplate to recreate. Orientation reports direct injected
state/domain template binding only through `AppTopology.serviceInteractionBindings`, where the binding root is proven to
be an injected state/domain member, and reports framework-grounded `source-backed-getter-observation` only when binding
observed-dependency rows show a template read of an ordinary accessor descriptor that has a source-backed
ComputedObserver path. It reports `one-hop-forwarding-accessor-pressure` only from a conservative source shape: a
component accessor whose whole body returns a property chain rooted at an injected state/domain member. Template-local
domain reads such as `request.*` should still be proved through binding observed-dependency and data-flow expected
effects rather than path-name guesses.
Coverage and surfaces also both advertise resource visibility and runtime controllers, so callers do not have to know
whether compiler-world visibility or hydration facts are filed under coverage-only rows.
The validated state-backed form recipe deliberately stays separate from the plain form recipe. It adds
`ValidationHtmlConfiguration`, `IValidationRules`/`IValidationController` usage, `& validate` bindings, and
`validation-errors.from-view` presentation regions, then expects fact-level `binding-behavior-application` rows for
`validate`, controller-view-model `errors` target access/value-channel/data-flow rows for `validation-errors`, and
`validation-controller-usage` as a discriminator taste so validation ownership remains an explicit authoring choice.
The default validated recipe emits `& validate:'blur'` so generated fixtures prove static binding-behavior arguments;
hosts can still pass `validationTrigger: null` when they want plain `& validate`. Verification matches the trigger
through the `BindingBehaviorApplications` `staticArgumentValues` row field rather than inspecting source text.
The current observation uses the same shared expected-effect primitive as closed-loop verification, so a recipe can
report whether its ambition is already satisfied, partially missing, unsupported, or not applicable before a generator
or repair planner picks the next move. Fit-state evaluation checks failed discriminators/signatures before classifying
unsupported row-backed effects, so a recipe that plainly does not apply does not become a false-positive unsupported
candidate. Filtered runtime-controller, binding target/value/data-flow, and similar expectations require row-level
facts; count-only verification snapshots remain valid only for unfiltered effects. Use
`expectedSemanticEffectsForPlan(plan)` rather than only the final verification step when checking a concrete plan:
step-local effects often carry the signature or discriminator facts that make a recipe meaningful.
Use `readAuthoringVerificationSnapshot(app)` when verifying a reopened app from the public API. It collects the summary,
topology, orientation, open seams, runtime controller rows, runtime compositions, i18n translation keys,
i18n translation bindings, route-effect fact rows,
template diagnostics, binding-behavior applications, target accesses, direct target operations, value channels, observed dependencies,
computed observation definitions, computed observer sources, computed observer observed dependencies, and data-flow rows with
pagination, so recipe and repair smokes do not each decide which row families matter for filtered expected effects. Use
`target-operation` effects for renderer or
binding writes that deliberately bypass the observer locator, such as captured static attributes, class/style renderers,
or direct attribute/property updates. If one of those row-backed projections is unsupported for the opened app's
analysis depth, the helper fails early instead of turning missing analysis into zero observed facts.
Closed-loop authoring smokes therefore open generated apps with `analysisDepth: 'binding-observation'`: the verification
snapshot intentionally spans binding-behavior, target-operation, value-channel, and data-flow rows, even when one recipe
only asserts a subset of those facts.
`source-plan.ts` is the first explicit edit boundary: recipes may attach file-level source edits with text authority,
conflict policy, formatting policy, and package-tooling policy instead of hiding those choices in operation prose.
Recipe source templates fail closed when a placeholder has no value or a supplied value is unused; template/source-plan
drift should surface while building the plan rather than after a generated fixture is reopened.
Recipe source-plan builders should expose named file-artifact producer functions once they are larger than a minimal
shell. Those functions are intentionally concrete handles for one generated artifact, not a generic generator DSL.
`package-tooling.ts` is the first structured project-tooling boundary: generated recipes can carry recipe-owned
`package.json`, `tsconfig.json`, and declaration-file text without claiming that build-tool profile selection is solved.
The minimal, state-backed, localized state-backed, validated state-backed, service-backed, routed state-backed form,
catalog storefront, and composed dashboard recipes now use those lanes to generate temporary apps from their own source
and tooling plans before reopen verification.
The durable fixture materializer derives from `AuthoringRecipeDescriptors` and writes every recipe source plan under
`fixtures/authoring/generated-*`, replacing each generated folder first so stale files do not survive recipe changes.
Adding a concrete recipe no longer requires a second hand-maintained fixture list.
The generated fixture TypeScript canary lives at `scripts/typecheck-authoring-fixtures.mjs` and is exposed as
`check:authoring-fixtures`. It builds temporary tsconfig overlays for the durable `generated-*` folders and resolves
`@aurelia/*` imports through the in-repo framework declaration output, so recipe source-plan typing can be checked
without turning every authoring loop into a standalone package install. Treat failures there as generated source-plan or
public-declaration pressure before changing semantic verification effects.
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
