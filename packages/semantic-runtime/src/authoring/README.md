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
Current concrete recipe builders cover minimal app, convention minimal app, state-backed form, localized state-backed
form, validated state-backed form, localized validated state-backed form, service-backed form, routed state-backed form,
routed validated state-backed form, routed service-backed form, routed localized validated state-backed form, multi-step
state-backed form, state-store list, catalog storefront, routed catalog storefront, and composed dashboard loops. All current recipe builders expose
source-plan contracts plus a project-tooling subcontract for package manifest, TypeScript config, and local asset module
declarations.
Source plans also carry an explicit `AuthoringSourcePattern`. This row is the boundary between reusable recipe
architecture and a concrete default instantiation. `domain-neutral` plans, such as minimal and routed shells, can be
read as framework/app-shell source shapes. `caller-applied` plans already reflect caller source parameters and can be
direct app starts when their `usePolicy` is `apply-as-source-start`. `reference-instantiation` plans, such as the rich
forms, catalog, table, dashboard, and state-store scenarios, deliberately include complete sample domains so generated
fixtures can reopen and verify semantic effects; MCP and authoring callers must adapt their class names, fields, sample
data, copy, and presentation before emitting caller-specific app code. The pattern also carries `role`, `dataPolicy`,
and `codeEconomyPolicy` so public clients can tell recommendable app starts from scenario references and analyzer
pressure. `starter-sample-data` marks small generated seed records that follow caller source parameters and exist to
make a starter runnable; `synthetic-reference-data` marks transfer/verification sample data. `usePolicy` is the derived
client action over those fields: `apply-as-source-start` can be used as a direct scaffold, `adapt-before-emitting` is
transfer material that must be caller-domain adapted, `merge-selectively` is companion pattern material, and
`analysis-pressure-only` is not public app source. A
`scenario-reference` with `synthetic-reference-data` and `reference-complete` source is transfer/verification material,
not a claim that its nouns, records, or verbosity are the recipe ontology. `stylePolicy` is separate from source
completeness: reference CSS can help a fixture exercise class/style bindings without making that CSS a design-system
recommendation. Reference-instantiation source files use `semantic-runtime-reference-instantiation` text authority so
structured API clients can see this without parsing the pattern prose. `AuthoringSourcePattern.parameters` exposes the
main adaptation slots inside that boundary:
domain entities, field schemas, collections, scalar selection IDs, route identities, feature copy, sample data, and
presentation defaults. Parameter rows also declare an application policy. `source-text-input` means a recipe-plan request can accept
that slot through `sourceParameterValues` and apply it to the generated source; `advisory-only` means the slot is a
structured adaptation marker for MCP/host source editing, not yet semantic-runtime-owned rewriting. Parameter rows also
publish a `valueShape` such as `domain-title`, `source-member-name`, `route-parameter-name`, `route-path`,
`route-title`, `route-section-list`, `workflow-step-list`, `workflow-section-field-schema-list`,
`field-schema-list`, `option-schema-list`,
`domain-collection-summary`, `sample-data-summary`, or `presentation-summary`. This keeps MCP clients from
reverse-engineering input syntax from sample source text; a
`field-schema-list` is an explicit reviewable adaptation list, while a `source-member-name` is meant to be reflected
as an identifier-bearing source value when the slot is source-applicable. Searchable table
recipes can now apply `table-entity` and `table-collection` to source model identity, file/class/service/state names,
and routed list/detail source where applicable. They can also apply a narrow `table-filter-fields` schema to row fields,
filter state, sortable columns, service records, table cells, and routed detail rows. When generated table fields carry
single-select filters, `table-options` can source-apply option union types, filter option lists, labels, and sample
values through an `option-schema-list`. Unparameterized table plans remain the rich reference fixture, while
caller-domain table plans use a starter feature profile: DI-owned state, service-backed loading, search text, optional
source-owned facet filters, keyed rows, and direct domain reads without automatically adding selection sets, checked
collection bindings, sorting, pagination, presentation slots, or reference CSS. Those starter rows are `caller-applied`
+ `recommendable-recipe` + `starter-sample-data` + `production-terse`; rich table plans remain scenario references when
the reference fixture lane or future explicit controls ask for the heavier table behavior.
Standard
request-form recipes can also apply `request-fields` to a narrow generated field schema: text, email, secret,
textarea, date, number, boolean checkbox/toggle, checked-collection checkbox groups, and single-select controls are
reflected in the domain class, state/service sample construction, template bindings, validation fields where applicable,
expected effects, and source-pattern modules. When those generated fields carry select or checked-collection option
domains, `request-options` can be a source-text input using an `option-schema-list` such as
`roles: admin, editor; permissions: read, write`; semantic-runtime then rewrites the generated option union types,
state-owned option lists, and sample values. Source-parameterized request forms are `caller-applied` starter plans with
`starter-sample-data`, `structural-baseline` styles, semantic-runtime recipe text authority, and no presentation
adaptation slot; plain, service-backed, and routed request-form variants share that starter/reference split. They also
omit `request-options` when the caller's field schema has no option-bearing controls. Starter request-form metadata
labels sample data as starter data rather than reference records; draft-form starters advertise a one-draft sample-data
summary, and generated starter templates use neutral count labels such as `Submissions: ${state.submittedCount}` rather
than fixture-style plural-marker copy.
Unparameterized request forms keep the rich reference scenario for broad value-channel and field-shell pressure. This
keeps the API honest while the deeper pattern-module layer is still being designed.
`AuthoringSourcePattern.adaptationGroups` clusters
parameters that must be considered together. For example, route identity slots can be source-applicable as a group while
table domain-schema groups are mixed: core entity/collection identity and supported field schema can be source-applied,
but starter sample data still moves through host-owned adaptation. Compact catalog groups now mirror the table
starter boundary for simple caller-domain catalogs: `catalog-entity`, `catalog-collection`, and the minimal generated
`catalog-fields` schema produce a `caller-applied` direct start with DI state, service-backed loading, search text,
getter-observed collection projection, inline list-card markup, starter sample records, no reference CSS, no selection
state, and no separate card component. Rich catalog fields and routed catalog plans remain scenario references:
`catalog-fields` can source-apply item constructor fields, sample records, option union types, and routed detail rows,
but selection/action model, broader copy, and presentation remain grouped adaptation work. Standard request-form groups are mixed as well: `request-entity` and
`request-selection-id` can source-apply the core request/domain class, scalar ID, state/service method names,
component bindable name, template-local object handoff, and the supported `request-fields` source schema. Supported
request option-domain labels/values source-apply when the generated field schema has option-bearing controls; sample
data, copy, and validation-message copy remain grouped adaptation work. Presentation is grouped only for reference
forms; caller-applied request-form starters use structural baseline CSS and omit the presentation slot. Multi-step
forms, dynamic dashboards, and state-store examples also expose
grouped adaptation slots so callers see which source-plan defaults are coherent sample scenarios rather than
independent recipe knobs. Multi-step forms can source-apply `wizard-steps` as a `workflow-step-list` and
`wizard-section-fields` as a `workflow-section-field-schema-list`; step labels generate ids/progress/conditional
wrappers, while named section field schemas generate the corresponding domain fields, raw controls, validation rows, and
select/checked option domains through the same standard form-control taxonomy used by request forms. Recipe-plan application
rows also distinguish `applied-to-source-plan` from `not-applied-to-source-plan`; an applied source-text input must be
reflected by both the pattern parameter value and generated source/tooling text using the parameter's `valueShape`
forms. A source-applicable parameter whose built plan did not expose the requested value becomes recipe-mapping pressure
instead of a silent false positive.
Guidance and recipe-plan display text also names host-adapted slots explicitly, so unresolved catalog action models,
broader copy, validation-message copy, and presentation cannot hide
behind a complete reference source tree.
`AuthoringSourcePattern.modules` is the reusable architecture layer in that split. Modules name capabilities such as
app shell, router admission, route parameter selection, route-link navigation, DI state, service loading/submission,
text/checked/select/matcher value channels, capture-based field shells, search/filter/sort/pagination/selection controls,
list rendering, template-controller flow, class/style channels, plugin integration, dynamic composition, and state-store
semantics. A module says why a source plan is useful; it is not a claim that the sample domain nouns or reference
presentation should be copied.
Build-tool/browser runner selection is still not modeled and remains visible as package-tooling product-open policy.
Recipe-owned app source uses the public `aurelia` quick-start facade for core application imports (`Aurelia`,
`customElement`, `bindable`, `resolve`, and adjacent core APIs). Plugin packages such as `@aurelia/router`,
`@aurelia/validation`, `@aurelia/validation-html`, `@aurelia/i18n`, and `@aurelia/state` remain explicit when a recipe
uses them. This keeps generated code aligned with the public scaffold and docs while still letting semantic-runtime
model the lower-level `StandardConfiguration` defaults through the framework facade.
The convention minimal app recipe is the first code-economy app-shell variant: it uses the same public `aurelia`
entrypoint, but lets the root component and sibling `.html` file be admitted by the current Aurelia convention rules
instead of importing `customElement`. Use that recipe only when the class name, source filename, and template filename
are provably compatible through `resource-convention.ts`; decorators and explicit dependencies remain the clearer shape
when a component needs non-conventional metadata.
Recipes also declare direct base recipes and a transitive specificity rank. This keeps superset recipes honest: a
validated, service-backed, or routed form can satisfy the state-backed form shape without losing the fact that the
more-specific recipe is the better candidate when its discriminator effects are present.
The service-backed form recipe now means service-backed state rather than a template-facing service facade: components
resolve DI state, templates may bind directly into ordinary state classes, and view-model getters/setters are reserved
for real adaptation rather than one-hop member forwarding. The state class owns service/repository calls for loading and
submission side effects. Its discriminator effects therefore prove state-to-service calls plus template-to-state binding
handoff, not component bindability through a service object. Plain submit listeners now call the state method directly
from the template when no validation or presentation adaptation is needed; validated variants keep a component `submit()`
method because invoking the validation controller is a real view-model responsibility.
The generated service-backed form resolves DI state in the component, but the nullable request lookup is expressed in
the template with a domain-adaptable `<let>` read such as `<let request.bind="state.readRequest(requestId)"></let>` or
`<let supportTicket.bind="state.readSupportTicket(supportTicketId)"></let>` followed by `if.bind` narrowing. The
template then binds directly to object members such as `request.customerName` / `supportTicket.customerName`,
`request.urgent` / `supportTicket.urgent`, and the select values. That direct object-backed path is intentional: it
proves ordinary domain-object binding, the runtime `LetBinding` scope handoff, and capture/spread field-shell handoff
without `with.bind`, `$parent`, one-hop view-model forwarding getters, or per-field component setters.
The plain, localized, and validated state-backed form recipes use the same template-local request lookup. The scalar
`requestId` default remains the component interface, and `sourceParameterValues` can adapt that to caller IDs such as
`supportTicketId`; `<let>` owns the id-to-domain-object adaptation for the template. Domain getters such as
`ServiceRequest.canSubmit` or `SupportTicket.canSubmit` remain real derived state; generated view-model getters whose
main purpose is shortening `state.member` or `state.readRequest(id)` paths should not reappear. Validated variants
register validation rules on the domain class, because Aurelia's validation accessor parser accepts property chains,
not arbitrary state lookup calls. That keeps validation metadata attached to the same domain model that the rendered
controls edit without restoring a component-level forwarding getter. The final verification filters `LetBinding`
scope-slot data-flow from the domain-specific state read into the template-local object, then binding data-flow and
observed-dependency rows for the default `request.*` or caller-adapted object channels, so checkbox, radio,
single-select, and multiple-select semantics are protected as direct
domain-object binding facts. The value-channel expectations also pin observer-coupling facts such as select
option-list mutation observation, checked element value observation, and select array observation, so generated forms
do not drift back into manual synchronization code.
The localized state-backed form recipe keeps the recommendable DI-owned state/form shape and adds `@aurelia/i18n`
plugin registration with static `I18nConfiguration` resources, `t` attributes, and `t-params.bind` values. Its
discriminator effects prove plugin admission plus `i18n-translation-key` and `i18n-translation-binding` rows, so
localization can be verified through semantic facts instead of source-text snapshots. The generated submit button uses
Aurelia's multi-target i18n key-expression syntax (`[title]form.submit;form.submit`) so the recipe also proves
normalized translation target properties and target kinds.
The catalog storefront recipe is the first generated app-building recipe beyond forms. It uses DI-owned composed state,
a catalog service for background loading, local typed object handoff between the product list and card, and getter projections over
state/domain objects so recommendable templates avoid redundant lookup code while still exercising list/detail
composition, service interaction bindings, state composition verification, promise pending/then/catch branch
controllers, switch/case/default-case availability states, and class/style interpolation plus per-token `.class` and
per-property `.style` bindings backed by row-level target access, value-channel, data-flow, and style-binding taste
verification. It also verifies `binding-observed-dependency` rows for direct state-member reads, so direct DI state
template binding is protected as an observation feature rather than justified by prose alone.
The route/detail boundary still uses scalar identity when navigation owns selection, but the list/card boundary is now
the object-side recipe canary: a local typed component can receive a `Product | null` bindable, and the child template
can bind directly to `product.*` when the boundary is intentionally close to the domain object. Authoring orientation
therefore reads app-topology type surfaces when classifying component interfaces, including the effective non-nullable
shape of nullable object bindables. The `component-object-boundary` pressure fixture remains as the smaller focused
contract for that semantic shape.
The routed catalog storefront recipe composes the catalog lane with the common router lane instead of asking callers to
mentally merge two recipe families. It keeps the same DI-owned state/service/catalog-card shape, adds
`RouterConfiguration`, decorator child routes for `products` and `products/:productId`, a root `au-viewport`, a static
root detail navigation target with query and fragment, data-driven product-card links that intentionally use a
root-relative route instruction from the routed list/card context, and a detail route that reads
`IRouteContext.getRouteParameters`. Its expected effects prove route config, route pattern/endpoint parameter names,
recognized static and data-driven route parameter values,
query/fragment propagation, route-node aggregation, viewport and component-agent rows, route-parameter-selected-state
taste, and the original catalog binding/observation/service-interaction facts with zero open seams.
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
controller/composition frontiers instead of source-plan shortcuts. The generated widget components intentionally bind
their templates through the activated `model` object instead of adding one-hop `items`/`points` forwarding getters:
`if.bind="model"` establishes the nullable handoff, `repeat.for` reads `model.items` / `model.points` directly, and
`peakLabel` stays as the real derived accessor. Expected effects prove those direct model data-flow rows and the
source-backed getter-observation taste so the recipe remains a clean-code witness, not only a composition witness.
The state-store list recipe is the first generated `@aurelia/state` recipe. It uses
`StateDefaultConfiguration.init(...).withStore(...)`, a default task-list store, a named filters store, `.state` /
`.dispatch` command syntax, and default plus named `& state` binding behaviors. Its expected effects prove plugin
admission, default/named `state-store` rows, `aurelia-state-store` ownership taste, and state binding-behavior
applications. App-building guidance treats this as an explicit plugin-state choice, not a generic replacement for
DI-owned state/domain classes, so selected `state-store-list` guidance routes through the state-store decision instead
of the ordinary DI-owned state-boundary recommendation. `store-item` and `store-collection` are source-applicable
parameters for caller-named store item/collection identity, so explicit plugin-store prompts can become `ProjectTaskState`,
`projectTasks`, and `addProjectTask` without copying the default Todo nouns; action modeling, sample records, and
presentation remain host-adapted slots because the reducer shape is still a task-list reference. The semantic-runtime state substrate also projects
initial-state argument types so `& state` and `.state`
expressions evaluate against store-backed binding scopes, while `.dispatch` emits state-store action source operations
and payload value channels. The generated template intentionally keeps simple heading/body reads as interpolation holes
with `& state`: runtime-html binds each interpolation part through `InterpolationPartBinding`, so binding-behavior
bind-time scope handoffs are an interpolation-part feature as well as a bind-command feature. Its contracts also verify
observed dependencies for store-scope reads such as `title`, `label`, collection rows, and `$event.target.value`, plus readable
binary expression display for predicates such as `draft === ""`. The generated input dispatch expression verifies that
`$event.target.value` refines through the authored native input element and keeps the dispatch action `type` literal in
the value-channel payload type.
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
complete-text state, file roles such as `state-model`, `domain-model`, and `service`, languages, edit kinds, text
authorities, and project-tooling rows for package
dependencies, scripts, config file kinds, and build-tool policy. Catalog recipe rows preserve effect kind, scope,
cardinality, filter fields and values, capability/taste targets, role, ontology summaries, and the recipe intent
preferences from the seed plan; orientation recipe rows add the current opened-app observation for each effect. Both
rows carry `semanticTargetKey` so pressure scripts and
callers can group equivalent expected targets without recomputing recipe-local keys. Recipe-local deduplication uses
`expectedSemanticEffectContractKey(...)` instead of `semanticTargetKey`, so reporting compression cannot accidentally
hide a stricter cardinality, filter, capability, or taste contract. App pressure prints an intent-recipe lane keyed from
generated fixture names, an applicable-recipe lane for partial/satisfied candidates, and an all-recipe lane for
cross-recipe comparison; use the intent lane for generated fixture health. `baseline` effects are shared
app-health expectations; `signature` effects are the recipe-identifying shape; `discriminator` effects are required
recipe-identifying shape that must be present before generic matching signatures make an opened app a candidate for
that recipe. Use the explicit `atLeast(...)`, `exactly(...)`, and role-specific cardinality constructors instead of
passing cardinality through the broad `fact(...)` argument list when a count is semantically important.
`AuthoringGuidance` is the compact public bridge over the catalog for MCP-like clients. It should
answer "what should another AI build, and why?" without moving policy into a transport adapter. It returns app-building
principles, focused decision rows, recipe rows, code-shape summaries, stable taste-value keys, expected-effect counts,
and follow-up public semantic-runtime surfaces. Decision rows are the compact code-economy layer for choices such as
state versus service ownership, direct state/domain template reads versus view-model adaptation, ID versus object
component handoff, plain getter observation versus `@computed` metadata, form value-channel ownership, and
route-selected state. The default compact detail does not inline recipe membership arrays, recipe preference rows,
operation-kind arrays, expected-effect kind arrays, source-role arrays, or rebuild full recipe plans; callers opt into
`detail: "recipes"` or `authoringRecipePlan(...)` when they need that extra precision.
Keep it grounded in the same recipe contracts and taste ontology; if guidance needs a fact that only Atlas or a scratch
note knows, promote the fact into semantic-runtime first instead of exposing internal navigation records.
`localized-validated-state-backed-form` is the first combined plugin form recipe. It keeps the same DI-owned state and
template-local request boundary as the plain form recipes, then layers static i18n resources, rendered `t`/`t-params`
bindings, validation-html registration, source-authored validation rules, `& validate:'blur'` bindings, and
`validation-errors` presentation over the same model. Use it as the common plugin-backed form canary for MCP guidance;
do not collapse localized-only or validated-only recipes into it when a caller needs only one plugin lane.
`routed-localized-validated-state-backed-form` is the first route-owned plugin form recipe. It combines the routed form
layout, route-param selected state, static navigation/query/fragment verification, i18n translation keys/bindings, and
validation-html ownership over the same state-backed request model. Use it when MCP guidance needs to show how common
framework subsystems compose without turning the view-model into a forwarding facade.
`routed-validated-state-backed-form` is the narrower routed validation lane. It keeps router ownership, route-param
selection, validation-html setup, source-authored validation rules, validate bindings, validation-errors handoff, and
direct template-local request member bindings without also pulling in i18n or service loading. Use it when a feature
goal asks for routed/edit/create validation and no localization or API-loading boundary is present.
`multi-step-state-backed-form` is the first wizard/progress form recipe. It keeps the wizard state and profile domain
object in a DI-owned state class, uses repeat/if template controllers for step rendering, binds directly to
`state.profile.*` fields without generated forwarding getters, and verifies validation-html, native value/checked/select
channels, checked collection membership, class-token and class-toggle channels, style interpolation, state-composition,
service-interaction bindings, and plain getter `ComputedObserver` rows. Use it when MCP guidance needs a larger form
flow that demonstrates Aurelia's low-boilerplate observation and presentation binding model before reaching for router
or service complexity. `wizard-entity`, `wizard-steps`, `wizard-section-fields`, and option-bearing `wizard-options`
are source-applicable. `wizard-steps` owns the step shell; `wizard-section-fields` owns caller-specific fields for
billing, shipping, payment, preferences, review, or other named steps when the prompt supplies a named section schema.
Generated recipes that resolve the same state class from more than one component rely on Aurelia's ordinary DI shape:
unregistered constructable classes use the default singleton resolver at the root after lookup walks through child
containers, so `resolve(AppState)` remains shared app state without explicit singleton decoration.
`routed-app-shell` is the generic route-shell recipe. It proves RouterConfiguration, decorator route config, static
navigation links, named `au-viewport` layout, route pattern/endpoint/recognizer products, query/fragment propagation,
route-node aggregation, and routeable component handoff without borrowing form, catalog, or table domain models. Use it
as the companion pattern when a feature goal needs routing plus another non-routed recipe, and reserve the richer routed
recipes for features whose domain surface is actually list/detail or route-selected form state.
`catalog-storefront` and `routed-catalog-storefront` are the first larger app-building recipes beyond forms. Compact
non-routed catalog source is the public code-economy canary: it resolves DI state, loads through a service boundary,
renders a direct searchable list, binds templates to `state.*` and template-local item members, and proves getter
observation without a CSS file, selection model, promise-status header, or card component. Rich and routed catalog
source remains the broader semantic pressure lane: selection projections, status promises, route-param identity,
local object card/detail handoff, native search/select/checked filter channels, price/availability switch flow,
disabled actions, and card class/style getters live on state/domain classes and templates bind to those members
directly. Keep both lanes free of product-card/detail forwarding accessors. The source plan is field-profile
sensitive: search filtering is the baseline, while price labels, stock controls, badge select filters, and reference
presentation appear only when the caller/default field schema asks for the heavier catalog behavior.
`searchable-data-table` is the first generated data-grid recipe for clean app-building guidance. Its compact
caller-domain starter uses DI-owned table/list state, service-backed loading, direct `state.*` and domain-object
template reads, a native search value channel with `& debounce`, optional select/boolean facet filters from caller field
schema, keyed repeats, and plain getter observation for the filtered collection. Richer table source adds checked
selection channels, sorting, pagination, selection, class/style bindings, and page projections only when the reference
fixture lane or future explicit controls need them. Use it as the
compact MCP canary for low-boilerplate searchable list surfaces before reaching for custom table abstractions or manual
DOM event wiring.
The generated selection state deliberately uses a `Set<number>` because Aurelia's framework `CheckedObserver` supports
Array, Set, and Map collection mutation, and the template compiler reorders `checked` after `model`/`value`/`matcher`
bindings so checkbox observers see the element model identity.
Its orientation also keeps built-in template-controller value channels separate from custom form-control binding taste:
`if`/`repeat` controller-view-model `value` channels should prove template composition, not `custom-control-binding`.
`routed-searchable-data-table` composes that table lane with common list/detail router authoring. The list route owns
the searchable table surface, row links use `load.bind` with data-driven route parameters, and the detail route owns
route-context parameter/query adaptation while sharing the same DI-owned table state and service-backed loading. Use it
when MCP app-building guidance needs a management-feature shape that combines search/filter/sort/pagination, route
identity, and detail rendering without adding forwarding getters or duplicating list state in the route component.
For class-only active navigation, prefer `RouterConfiguration.customize({ activeClass })` over extra view-model
booleans; `load`'s `active.bind` remains the richer from-view state handoff when route-active state is actually part
of the app model.
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
Template-controller value-channel helpers verify the binding value transported through those controllers separately
from the framework property type. Use them when a recipe needs to prove that an `if.bind` carries the authored
truthiness expression type, a `switch.bind` carries the switched scalar/enum, or `promise.bind`/`then` handoff preserves
the promise input and awaited fulfilled value even though the target controller property itself is intentionally broad.
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
The routed service-backed form recipe combines that common route/viewport lane with the service-backed state boundary:
the routed component loads state in `binding()`, route parameters still select the scalar request ID, the state class
owns async service/repository calls, and the form template keeps the same template-local request lookup plus direct
domain-object bindings. Use it when MCP guidance needs to show route-owned selected state and background service work
without moving service calls or forwarding getters into the template-facing view-model.
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
values and app-authored matchers as a legitimate form pattern. This is now standard generated form pressure for plain,
service-backed, routed, and plugin-composed forms, not a one-off in the non-routed source plan. Verification asserts
both the primitive `null` model domain and the `usesCustomMatcher` value-channel row, while keeping matcher-heavy
matrices in pressure fixtures rather than treating object comparison as the universal form recommendation.
`recipe-plan-steps.ts` carries shared recommendable app plan-step constructors for project files, entrypoint, root
component, component stylesheet, external templates, routes, plugins, plain domain models, state models, services,
component creation, template binding, and verification. Use those helpers for stable operation-to-step boundaries, then keep recipe-specific expected
effects and route/form discriminator choices visible in the concrete builder.
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
ComputedObserver path. It reports `one-hop-forwarding-accessor-pressure` only from a conservative template-read source
shape: a component accessor whose whole body returns a property chain rooted at an injected state/domain member. Unused
accessors are outside this template model-access reading. Template-local domain reads such as `request.*` should still
be proved through binding observed-dependency and data-flow expected effects rather than path-name guesses.
The sibling `component-interface` axis intentionally separates scalar-ID inputs from object-shaped inputs. A nullable
object bindable such as `Product | null` should still classify by its effective `Product` shape, while the guidance
layer decides whether that object handoff or a scalar ID is the lower-boilerplate scalable boundary for the feature.
Coverage and surfaces also both advertise resource visibility and runtime controllers, so callers do not have to know
whether compiler-world visibility or hydration facts are filed under coverage-only rows.
The validated state-backed form recipe deliberately stays separate from the plain form recipe. It adds
`ValidationHtmlConfiguration`, `IValidationRules`/`IValidationController` usage, `& validate` bindings, and
`validation-errors.from-view` presentation regions, then binds field presentation classes directly from the
validation error arrays. The closed-loop effects expect fact-level `binding-behavior-application` rows for `validate`,
controller-view-model `errors` target access/value-channel/data-flow rows for `validation-errors`, class data-flow rows
for the error-array driven presentation, and `validation-controller-usage` as a discriminator taste so validation
ownership remains an explicit authoring choice.
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
The minimal, state-backed, localized state-backed, validated state-backed, localized validated state-backed,
service-backed, routed state-backed, routed service-backed, routed localized validated state-backed form, catalog
storefront, routed catalog storefront, searchable data table, and composed dashboard recipes now use those lanes to
generate temporary apps from their own source and tooling plans before reopen verification.
The durable fixture materializer derives from `AuthoringRecipeDescriptors` and writes every recipe source plan under
`fixtures/authoring/generated-*`, replacing each generated folder first so stale files do not survive recipe changes.
Adding a concrete recipe no longer requires a second hand-maintained fixture list. The materializer also writes explicit
compact caller-parameterized canaries for catalog and searchable table starts; app-pressure labels those as
`catalog-storefront:compact` and `searchable-data-table:compact` and rebuilds the same concrete generated fixture plans
before verifying their expected effects, rather than pretending static base-recipe intent rows can prove
source-parameterized plans.
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
- Keep open-seam repair kind, runtime boundary kind, and runtime intent kind derived from the same reason vocabulary.
  Select observer source-shape pressure, missing binding resources, and checker/type-open binding sources should route as
  runtime-boundary/intent pressure rather than as generic semantic-runtime substrate gaps once their reason kind is known.
- When an open seam has source provenance, preserve it as a `runtime-boundary` action target. This keeps large repair
  clusters navigable without claiming that the product already knows the right source edit.
- Treat large requests such as auth setup as recipes composed from smaller semantic operations.
- Keep open scope in [CAPABILITY_CHECKLIST.md](./CAPABILITY_CHECKLIST.md), not in incidental prose scattered across
  folder READMEs.

## Success Shape

The success signal is not that files are generated. The success signal is that an authored app reopens through the API
and produces closed-enough configuration, DI, resource, compiler-world, template, and TypeChecker-backed facts with any
remaining gaps named as actionable open seams.
