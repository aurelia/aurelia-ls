# App-Builder Ontology

This folder owns the read-only app-builder ontology for app-builder. It is the breadth
map before more source generation: input contracts, input facets, effect contracts,
policy axes, affordances, application patterns, collection concepts, control
patterns, styling mechanisms, visual policies, and status.

The important boundary is that these rows do not lower source. A row can be
modeled and visible before source lowering exists, source-lowerable through a
registry-backed projection, recommendable, contextual, deferred, or
analysis-only. Row status does not own blank-slate defaults. Local defaulting
candidates live in `../policy/defaulting-candidate-policy.ts`, while new-app/profile
defaults remain a later defaulting layer. Source-producing lowerers should spend
these rows and report which inputs, policies, and effects they used.

Use `appBuilderOntologyCatalog()` for the public `ontology-catalog` query. Use
`appBuilderTargetCatalog()` for the public `target-catalog` query when a caller
needs selectable ontology row refs with honest status and compact readiness
counts. Exact `targetRefs` are the lossless selector for already-known rows and
preserve caller row order. Compact `targetSelectors` accept row kind plus id for
AI-facing follow-up calls and are normalized through `target-selector.ts` before
graph operations; optional selector domains are consistency checks, not a second
row identity. Domain, row-kind, recommendation, source-lowering,
reason-authority, and surface filters are menu filters. Omitted target selection uses
actionable-first presentation order so source-lowerable ontology targets are visible
before broad input/policy/detail terrain; this ordering is not ontology
precedence. Public no-argument target-catalog answers return a 25-row first page
by default; exact selections, filters, and explicit page requests use the shared
public paging behavior. `includeInputReadiness` adds current input/readiness
coverage rows for selected targets without changing the target status:
source-lowering availability is not the same thing as app-builder source-lowering
support. Target catalog rows also expose associated `effectContractIds` through
`effect-target.ts`, which derives effect contracts from declared affordance and
application-pattern graph rows rather than projection-local heuristics. Use
`appBuilderSourceLoweringPreflight()` for the public
`source-lowering-preflight` query when a caller needs to know whether selected
targets have app-builder source-lowering support, only source-lowering availability, or
no source path, and whether supplied inputs/payloads pass the source gate.
Target catalog, preflight, and SourcePlan answers expose
`sourceLoweringRequestFieldSummary` by default and expose full surface-scoped
`sourceLoweringRequestFields` only when `includeSourceLoweringRequestFields` is
true. The public barrel is `source-lowering-request-field.ts`; contracts,
requirements, request-tree usage extraction, and registry coverage are split
into sibling files so each lane has one owner. These rows are the per-call
request fields such as `fieldName`, `bindingExpression`,
`valueDomainExpression`, `buttonText`, `messageKind`, `collectionExpression`,
`itemLocalName`, `sortHandlerExpressions`, `promiseExpression`, `fieldNames`,
`rootDir`, `templatePath`, and nested invocation/composition/app-shell/DI-state
envelopes that live outside durable input facets. They are not new input
contracts and should not be satisfied by hidden defaults. The summary is the
compact menu/preflight/SourcePlan rollup over the same request-field contract
rows; target-catalog and preflight keep only counts in compact mode and include
surface-scoped request property names only with request-field detail. The
summary is not a separate source of truth or a successful-answer missing-field
state.
Preflight is read-only: it must not lower source, rank choices, or promote
gallery or fixture evidence into `sourceLoweringImplemented`. Preflight rows preserve the
same associated effect ids so callers can drill into `effect-contract-detail`
before generation. When a caller omits target refs, preflight includes both
implemented source lowerers and source-lowering availability rows so modeled
rows cannot hide newer executable source-lowering surfaces. Use
`source-lowering-surface.ts` as the registry for exact ontology targets that expose
callable source-lowering surfaces. The status matrix still says whether a row is
source-lowering implemented, but the registry is the surface lookup for
invocation/composition/SourcePlan preview routing, and the app-builder
query-surface contract keeps those two facts aligned. Preflight may keep the
general input gate ready while blocking `canRequestSourceLowering` with
target-specific requirement issues; `native-range-input` uses that lane to
require explicit field-local `minimum`, `maximum`, and `step` facts before
invocation can produce a slider. One-target native controls
expose `TargetInvocation` for fragments and `SourcePlanPreview` for the wrapper
surface. The AppShell application-pattern row exposes `SourcePlanPreview` only:
it lowers a minimal non-routed root shell directly to SourcePlan after explicit
source root, app naming, source file layout, and convention-policy input. Use
`appBuilderSourceLoweringInvocation()` for the public
`source-lowering-invocation` query when a caller has selected one exact source-lowering
target and wants generated source fragments. This is the first source-lowering-implemented
bridge from ontology rows to part source callbacks: scalar native control
patterns spend explicit `domain-fields` payloads, disclose field-selection and
binding-expression provenance, and return delegated part-source fragments.
Native choice controls additionally spend field-local options, a selected
`domain-value-sets` row, or an explicit `valueDomainExpression`, and report
  value-domain provenance so callers can see whether source came from field
  options, a reusable value set, or explicit request input. Native buttons spend
  `domain-actions`, accessibility label input, and explicit/defaulted native
  `buttonType`, then delegate event syntax through the event-listener part
  lowerer. Form messages spend `accessibility-help-error`
  payloads or explicit message text/kind and report message-selection provenance.
  Field groups compose a label, one derived or explicitly selected native inner
  control, and associated help/error/status message fragments; they report
  inner-control, label-text, field-control-id, and `aria-describedby`
  provenance.
  Direct delegated control fragments preserve their low-level part invocation
  origin. Composed source-lowering fragments such as native buttons, form messages, and
  field-group wrappers carry a app-builder source-lowering origin naming the exact
  ontology target, so future SourcePlan contributions remain traceable without
  pretending the wrapper came from the inner part lowerer.
  Invocation-local fields such as `buttonText`, `labelText`, `messageKind`,
  `messageText`, and `messageId` are normalized into explicit caller accessibility facets before
  preflight, so the source gate and the lowering path share the same input model.
  `VisualClassHooks` is the first visual-style facet with executable source-lowering
  payload schema: callers can supply class tokens and `data-*` attributes for
  form, field-group, label, field-control, field-message, and button targets.
  Source lowerers carry those hooks into generated fragments but do not invent
  CSS, Tailwind classes, design tokens, or fallback visual taste when no visual
  input is supplied.
  Invocation answers expose `sourceLoweringTargetRefs` and associated
  `effectContractIds`, matching the source-lowering bridge into ontology detail
  queries without making a fragment invocation a host write.
  Invocation answers also expose generated `controlUseInventoryRows`. This is
  the first concrete `ControlUseInventory` witness product: it records
  generated-source references, inline-native realization, control pattern /
  leaf-control identity, selected field/action facts, binding or event
  expressions, button/message/accessibility facts, and fragment kinds. Existing
  authored-source inventory, concrete file-span attachment, wrapper/external
  manifests, and extraction decisions remain future terrain.
  Use `appBuilderSourceLoweringComposition()` for the public
  `source-lowering-composition` query when a selected ontology target owns several
  member fragments. It currently lowers collection list/table projections,
  collection card projections, Loading / Empty / Error State promise regions,
  and the Native Submit Form application pattern. Collection Card uses the same
  collection display-field input as Collection List and emits a semantic
  `section`/repeated `article` card shape without inventing data sources,
  query mechanics, or visual style. Collection Table can lower action columns
  from explicit `CollectionTableColumns.actionName` plus matching
  `DomainActions`; TypeScript-safe action names default to
  `actionName(itemLocalName)`, while custom or unsafe handlers require
  `actionHandlerExpressions`. These row actions are native button/event-listener
  projections, not service/state/router action realization.
  `CollectionTableColumns.sortable` and `filterable` remain modeled query
  metadata. Sortable field columns lower only when the caller supplies exactly
  one matching `sortHandlerExpressions` row, and the generated header button
  delegates click syntax to the event-listener part lowerer. Filterable columns
  lower when the caller supplies matching `filterBindingExpressions`; local
  view-model collection state can emit the corresponding filter member and
  derived filtered-collection getter when `CollectionQueryFeatures` selects
  local filtering. Loading / Empty / Error State
  composes the promise,
  pending, fulfilled, rejected, and conditional structural-part lowerers into
  one direct-branch promise region from explicit status request fields; it does
  not require a domain model and does not guess async data or empty semantics.
  Native Submit Form composes explicit `field-group` member invocations, a
  form-level `submit.trigger` part invocation, and a native submit button into
  one top-level form fragment. It requires explicit field order, selected
  action, and submit button text, and it rejects unknown composition kinds
  instead of deriving a target default after malformed input. Treat this as a
  composition-owned control-use boundary too: composition answers aggregate
  member invocation control-use rows and add direct rows for controls such as
  sortable table header buttons and native submit buttons when those controls
  are not themselves nested source-lowering invocations. This remains a
  fragment composition surface: SourcePlan stays the file/write boundary, while
  returned fragments and contributing fragments preserve source-lowering and part origins.
  Composition answers expose the top-level and member ontology target refs
  plus associated `effectContractIds`, so continuations can route to both
  family-specific ontology detail and effect-contract witness detail. Use
  `appBuilderSourceLoweringSourcePlan()` for the public
  `source-lowering-source-plan` query when explicit source placement is ready.
  It wraps one source-lowering invocation or composition into an HTML template SourcePlan,
  requires caller-supplied `rootDir` and `templatePath`, preserves contribution
  origins internally, reports per-file contribution counts by default, exposes
  full contribution ledgers only when `includeSourcePlanContributions` is true,
  carries generated control-use inventory to the SourcePlan preview
  boundary as a count by default and detail rows when requested, emits compact
  `sourcePlanWitnessRows` for SourcePlan policy, file, contribution, dependency,
  script, and tooling-file witnesses when requested, exposes
  `expectedEffectCount` and `expectedEffectKinds` by default for direct full-app
  SourcePlan targets, keeps full `expectedEffects` rows behind
  `includeExpectedEffectRows`, and reports missing placement as typed issues
  instead of guessing filenames.
  Invocation and composition answers carry continuations to
  this wrapper so callers do not have to infer the nested request envelope. The
  same query also accepts direct SourcePlan targets such as
  `sourceLoweringAppShell`, `sourceLoweringRouterBackedListDetail`, and
  `sourceLoweringDiStateClass`, and `sourceLoweringLocalViewModelState`; those paths do not use `templatePath`.
  AppShell emits the minimal entrypoint and companion root custom-element files,
  RouterBackedListDetail spends caller domain, routing, state, source naming,
  route-path, route-parameter, and optional seed inputs to emit a complete routed
  list/detail SourcePlan, and DiStateClass spends caller domain, source root,
  source target path, and optional seed records to emit one explicit state-model
  TypeScript file. LocalViewModelState spends caller domain fields, source root,
  source target path, local-state policy, and `SourceNaming.baseName` to emit one
  component view-model file with local field state only; command/action behavior
  remains a separate ontology target. The
  expected-effect rows come from `semantic-effect-witness.ts`, which reuses the
  fixture-verification vocabulary instead of minting a second app-builder
  verification language. The source-lowering gallery plans consume those same
  helper rows through `AppBuilderSourceLoweringGalleryPlan.expectedEffects`, so
  pressure fixture manifests do not need a private verification mapping.
  Effect contracts and manifest rows remain witness vocabulary, so they should
  not flip `sourceLoweringImplemented` merely because generated lowerer answers
  now publish concrete SourcePlan or control-use witness rows.
  Keep rich controls, wrappers, standalone/full native submit workflow semantics,
  state-dispatch actions, validation/i18n/state-plugin form generation, and
  edit-buffer behavior out of `sourceLoweringImplemented` until their required
  manifest/accessibility/action/policy inputs are represented as app-builder inputs
  rather than inferred source context. Native Submit Form is narrower: it may
  spend ordinary actionless `submit.trigger` form source because Aurelia app-root
  prevents native navigation for actionless forms by default, with
  `allowActionlessForm` as the app-global framework override. Use
`appBuilderInputReadiness()` for the public `input-readiness` query
when a caller has selected ontology rows and needs full input dependency detail:
which inputs are satisfied, missing, deferred, or rejected. Readiness dependency
rows include input facets by default so an AI can ask for concrete missing facts;
`includeInputFacets: false` is the compact lane. Keep new ids enum-backed and
commented so Atlas can track usage and future maintainers can recover intent
without reading the interview scratchpads first.

Readiness, preflight, detail, invocation, composition, and SourcePlan preview
requests may carry `decisionBundles` beside explicit `suppliedInputs`.
Decision bundles are request-local groups of caller/operator/framework decisions,
not named profiles. They expand into normal supplied-input markers before graph
readiness and source-lowering gates run. Public answers report
`explicitSuppliedInputCount`, `decisionBundleCount`, and
`decisionBundleDecisionCount`; `suppliedInputCount` is the effective total after
bundle expansion. Expansion rows are opt-in detail output through
`includeDecisionBundleExpansionRows` on readiness, preflight, and SourcePlan
preview requests.
Decision-bundle decisions and supplied-input markers may also carry `targetRefs`
when the caller's choice is scoped to one selected ontology row. Target-global
markers still satisfy every target, but target-scoped markers only satisfy the
matching row. Input readiness, source-lowering preflight, one-target invocation,
composition, and direct SourcePlan preview all spend the same target-scoped
filtering helpers, so policy satisfaction stays explicit instead of leaking
between co-present controls, compositions, or SourcePlan targets.

Use `appBuilderInputContractDetail()` for the public `input-contract-detail`
query when a caller needs payload/schema detail for those missing input facets.
This keeps `suppliedInputs` as a readiness layer without hiding payload shape: a
supplied marker can still say "domain model is present", but it can also name
specific facet ids and carry facet payloads. Readiness validates those payloads
against input-contract detail schemas when the facet is modeled, and leaves
TBD/deferred/not-caller-payload facets visible instead of guessing. Existing-app
facts are explicitly `not-caller-payload`; they must come from semantic-runtime
app analysis rather than caller-authored JSON. Existing-app fact facet detail
reports query supplier counts by default and, for selected/detail calls,
`existingAppFactQueryRows` that point to concrete app-world query families such
as `resource-definitions`, `resource-visibility`, `control-use-inventory`,
router queries, and plugin-specific product/diagnostic queries. These rows are
fact-gathering hints for the caller/AI, not permission for app-builder to infer
business intent or lower source into an external control library.
Input contracts and input facets are not executable source-lowering targets, so
their `sourceLoweringImplemented` status remains false even when source lowerers
consume their payloads. Facet detail exposes `sourceLoweringConsumerCount` and,
for selected/detail calls, `sourceLoweringConsumerRows` from
`input-source-lowering-consumers.ts`. Treat those rows as payload-consumer
evidence: `DomainActions` can feed native buttons, native submit forms, and
domain-command methods without making `DomainActions` itself an invocable
source-lowering target.
Facet detail can also expose `sourceLoweringValueSupportRows` from
`input-facet-value-support.ts`. These rows describe support for enum-like values
inside a facet, such as action kinds, action scopes, and relationship kinds.
Use them when a facet has a consumer but not every value means the same thing:
current `DomainActions` support includes native event binding, caller-owned
TypeScript methods, and narrow derived local create/complete methods, while
`DomainRelationships` supports narrow `reference-one` consumers in router-backed
list/detail source plans and local view-model collection state source plans plus
local-only `reference-many` collection lookups through choice-set identity
arrays, `owns-one` owned child objects, `owns-many` owned child arrays, and
identityless `nested-value-object` source on local parent entities.
Unfiltered `input-contract-detail` stays compact: it reports contract/facet
rows, payload schema states, and schema counts, but omits payload schema bodies
unless the caller selects/filters contracts or facets, filters schema states, or
explicitly sets `includePayloadSchemas: true`. This lets broad MCP/menu calls
see what input terrain exists without paying for every modeled payload shape.
The same compact/detail split applies to existing-app fact query suppliers:
unfiltered answers keep counts, while selected/detail answers include query
rows.
Source-placement facets spend existing source-plan substrate where available:
source naming exposes app/source name seeds and `SourcePatternParameterValue`
rows for coordinated source rewrites, while source project tooling exposes the
`SourcePlanProjectTooling` package/build/tooling shape instead of treating
package manifests, tsconfig, scripts, or declaration files as ordinary app
source.
Seed-data facets use the same detail lane for caller-supplied records:
`SeedRecordSet` is modeled as an array of dynamic records keyed by the selected
domain descriptor, with values matching the public seed-record primitive or
primitive-array union. This payload shape is not the domain validator; selected
domain identity and field schemas still decide which record keys and values are
valid.
Seed density/purpose remains a visible deferred facet. Current source lowerers
do not consume `public-small`, `demo`, or similar selectors because no public
seed-preset/defaulting layer is approved yet; callers must supply concrete
`SeedRecordSet` payloads when generated source should contain sample records.
Visual-style facets intentionally remain split by maturity: `VisualClassHooks`
has a modeled caller payload because app-builder source lowerers can spend class/data
hooks on concrete generated elements; visual tokens, CSS fragments, and external
design-system references remain TBD until the design-tooling policy and
manifest/storybook-like projections are grounded.

Family detail queries are selector-sensitive for token economy. When a caller
supplies explicit ids or row-family filters, detail queries default to rich
joins and let `include*` flags turn individual joins off. When the caller leaves
the detail query unscoped, the default answer is a compact base-row/readiness
map and every expensive join is opt-in through the matching `include*` flag.
Use `ontology-catalog` or `target-catalog` to find candidate refs, then call the
family detail query for selected rows; do not make unscoped detail calls dump
the whole ontology graph by default.

Use `appBuilderAffordanceDetail()` for the public `affordance-detail` query when
a caller has selected one or more app-building moves and needs the factual join:
input readiness, input contract detail, promised effects, associated application
patterns, and declared follow-up affordances. This query reports declared graph
structure; it must not rank or invent next moves.

Use `appBuilderApplicationPatternDetail()` for the public
`application-pattern-detail` query when a caller has selected one or more
application design patterns and needs the lower concept families they
coordinate: collection concepts, control patterns, control/component manifests,
styling mechanisms, visual policies, input readiness, input contract detail, and
associated affordances. Keep this as pattern-specific detail rather than a
generic row-detail dumping ground; application patterns are the design-mechanic
layer between app-building moves and lower app-builder concepts.
Application pattern rows also carry explicit state, navigation, data,
interaction, and Aurelia-realization shape axes. Those axes are map dimensions
for menus and future lowerers; they are not recommendation policy by
themselves and do not claim that every coordinated shape is currently
source-lowerable.
Application pattern rows also carry broad `semanticEffectKinds`, and
`application-pattern-detail` can join those ids to fixture-verification
`semanticEffectDescriptors`. These connect the app-builder ontology to
semantic-runtime product families such as routes, runtime controllers, binding
data-flow, value channels, state stores, i18n bindings, and open-seam closure.
Treat them as verification terrain for future expected-effect rows, not as
exact counts, source-lowering support, or recommendation policy.
Application patterns may also declare companion application patterns. Companion
edges are graph navigation aids for commonly coordinated design mechanics, such
as collection presentation with loading/empty/error state; they are not hidden
defaults and do not make one pattern inherit another pattern's source-lowering
or effect promises.

Use `appBuilderCollectionConceptDetail()` for the public
`collection-concept-detail` query when a caller has selected one or more
collection source/query/projection/table concepts and needs the existing
ontology joins around them: input readiness, input contract detail,
coordinating application patterns, control pattern rows, control/component
manifest rows, styling mechanisms, visual policies, and associated affordances.
Keep it read-only and factual; it should not choose list versus table, invent
columns, or lower source for the caller.
Collection feature descriptors explain caller-selectable
`CollectionQueryFeatures` payload values such as local sorting, filtering,
pagination, selection, batch actions, and service-backed query. They map those
input values to collection concepts and identity pressures without becoming
target-catalog rows themselves.
Collection identity is feature-driven: simple local repeats may use Aurelia's
runtime object identity, while explicit keyed repeat, row selection, batch
actions, edit buffers, cross-page state, or route boundaries can require a
scalar, composite, or caller-supplied stable key.
Collection query feature input uses caller-selectable
`AppBuilderCollectionFeatureId` values. Keep those separate from
`AppBuilderCollectionFeatureRung`, which is internal gradual-ascent ordering and
not a payload vocabulary.

`detail-joins.ts` owns the shared read-only join from application patterns to
collection concepts, control patterns, control-realization policies,
control/component manifests, styling mechanisms, visual policies, leaf control
descriptors, and associated affordances. Detail queries should spend this helper
before adding projection-local graph walks; otherwise selected-target detail
answers will drift in what "coordinated through an application pattern" means.

Use `appBuilderControlPatternDetail()` for the public `control-pattern-detail`
query when a caller has selected native-first or deferred rich control patterns
and needs the existing ontology joins around them: input readiness, input
contract detail, concrete native leaf-control descriptors, coordinating
application patterns, control-realization policy rows, control/component
manifest rows, styling mechanisms, visual policies, and associated affordances.
Concrete descriptor rows come from `APP_BUILDER_CONTROLS`, which already owns
value channels, transport kinds, slots, and built-in syntax refs. Keep this
query read-only and factual; it should not choose a visual style, component
library, or source realization policy for the caller.
Control-realization policy rows are targetable Control-domain ontology rows for
inline native controls, local wrapper components, external web components, and
existing app controls. They make inline-versus-wrapper choices explicit without
turning wrapper extraction or component-manifest adaptation into source
generation.
Keep control pattern ids split at value-contract granularity: boolean checkbox,
checkbox-list membership, single select, multi select, date input, and range
input are different ontology rows even when they share native elements or
binding-command syntax. Grouping belongs in application-pattern joins, not in a
control pattern row that hides required input differences.
Control pattern rows can narrow broad input contracts to row-local facets:
scalar controls need domain fields, while radio/select/checkbox-list controls
need domain fields plus finite value-set terrain. Field-local options are a
compact shorthand; reusable `domain-value-sets` are distinct named option
domains. Keep those selections on the row and relation/readiness path so
ontology-catalog, target-catalog, readiness, and detail queries tell the same
story about missing input scope.
Native number and range controls can spend field-local
`numericConstraints.minimum`, `numericConstraints.maximum`, and
`numericConstraints.step` through typed part slots. Keep those constraints on
the domain-field payload: range source lowering requires the full bounded range,
whereas plain number controls only emit the attributes that are actually
supplied.

Use `appBuilderControlManifestDetail()` for the public
`control-manifest-detail` query when a caller has selected one or more
control/component manifest rows and needs the existing ontology joins around
those contracts: input readiness, input contract detail, manifest field
descriptors, coordinating application patterns, control pattern rows, concrete
native leaf-control descriptors, control-realization policy rows, styling
mechanisms, visual policies, and associated affordances. Field descriptors come
from `control-manifest-field.ts`; they name the canonical fields a manifest row
would expose or need to prove, but they do not publish external manifests,
component APIs, control-use products, or style hooks by themselves. Keep this as
manifest-contract detail; it should not project external manifest formats,
design component APIs, choose style, or lower source for the caller.

Use `appBuilderEffectContractDetail()` for the public `effect-contract-detail`
query when a caller has selected promised effects such as SourcePlan preview,
semantic-runtime reopen, component manifest publication, control-use inventory,
or existing-app fact reads. It joins each effect contract back to concrete
witness descriptors, manifest rows/field descriptors for component/control
witnesses, plus the affordances that promise it, those affordances' input
readiness, input contract detail, and application patterns. Keep it read-only
and factual; it should not execute verification, claim the effect is satisfied,
or lower source. Effect contract rows name their witness boundary and witness
families, and witness descriptor rows name enum-backed SourcePlan,
expected-effect, public app-query, control/component manifest, or deterministic
existing-app fields that make the promise inspectable. Manifest field descriptors
make component/control witness vocabulary more precise, but they remain map
terrain, not satisfaction proof. Rows with `SemanticRuntimeQueryRow` witnesses
can include `semanticRuntimeQueryRows`, the real public app-query catalog rows
selected by `includeSemanticRuntimeQueryRows`, so callers can inspect the same
semantic-runtime query families after generated source is reopened.
Semantic-runtime reopen effect rows can also include fixture-verification
semantic-effect descriptors so a caller can see the product families and public
query rows behind expected-effect promises.

Source-lowering preflight, invocation, composition, and SourcePlan preview are
the bridge from selected ontology targets to generated source. The old
starter/golden evidence bridge has been removed; do not reintroduce a parallel
starter graph as ontology authority.

Use `appBuilderPolicyDetail()` for the public `policy-detail` query when a
caller has selected app-builder policy axes such as convention admission, router
admission, area navigation, state ownership, local state, resource carrier, DOM
encapsulation, styling mechanism, or plugin admission. It exposes the selected
row scope plus input readiness and input-contract detail; it should not evaluate
recommendation policy, pick defaults, or choose a source-lowering path for the
caller.

Use `appBuilderStyleDetail()` for the public `style-detail` query when a caller
has selected styling mechanisms or visual policies and needs the existing
ontology joins around them: input readiness, visual-style input contract detail,
coordinating application patterns, collection/control/manifest rows, and
associated affordances. Keep mechanisms and visual responsibility policies
separate; this query should not generate CSS, choose design taste, or select a
component library for the caller. Direct styling-mechanism rows are selectable
framework/style values: their status can require explicit selection, but their
readiness dependencies should not duplicate the policy-axis or visual-policy
dependencies. Use the `StylingMechanism` policy axis to ask for mechanism
choice, and visual policies to ask for visual payload responsibility.
Project/build-tooling requirements for mechanisms such as CSS Modules belong to
SourcePlan project-tooling readiness or capability evidence, not to the
styling-mechanism value space itself.

Public app-builder answers can carry typed continuations through
`targetAppBuilderQueryKind` and `targetAppBuilderQuery`. Those rows are API-level
drilldowns over the app-builder ontology, input readiness, payload detail, part
source-lowering previews, and catalog integrity. Keep them factual and grouped:
`target-catalog` can lead to family-specific detail queries, and detail/readiness
answers can lead to related contracts, effects, patterns, or targets, but the
continuation layer must not rank choices, infer user intent, or choose source
generation policy.
Blocked `source-lowering-preflight` rows should also stay self-recovering:
target-specific requirement issues route to payload detail for the facets that
would make a retry truthful, such as `DomainFields` for numeric range bounds or
`CollectionTableColumns` plus `CollectionQueryFeatures` for collection-table
query blockers.

`status-audit.ts` owns the compact audit over status-matrix invariants and
review-visible provisional rows. Use it from `catalog-integrity` instead of
adding one-off status scans to contracts or scripts. Rows with hard catalog
drift use the `integrity-issue` disposition and count toward integrity issues;
TBD status rows use `review-needed` so callers can see the work queue without
mistaking it for a failed registry. `reasonAuthority` is also a first-class
coarse filter on `ontology-catalog` and `target-catalog`; callers can use that
axis to inspect operator-confirmed, source/research-grounded, or TBD app-builder
ontology terrain without asking the integrity audit to double as a menu query.
Do not treat `source-backed` as exact provenance; recommendation-policy evidence
lanes own the sharper grounding.

Recommendation ranking and local defaulting-candidate policy live in
`../policy/recommendation-policy.ts`; source-lowering implementation status is
projected through `../policy/status-projection.ts` from the executable registry.
`row-descriptor.ts` keeps the row-local `declaredStatus` beside projected
public `status` so status audits can still catch declaration drift while
catalogs consume the policy-projected view.
`target-catalog` rows expose compact policy handles for menu use:
`defaultingCandidate`, optional `defaultingCandidatePolicy` scope/rationale, and
`policySatisfactionRequired` for contextual executable source-lowering targets.
Do not expand this into a hidden recommendation engine inside target catalog;
use recommendation-policy detail for applicability/evidence rows and preflight
for policy-satisfaction state.

`relation.ts` owns the typed graph between rows. Use relation rows for
machine-readable edges such as "this affordance has this input dependency",
"this affordance promises this effect", or "this application pattern coordinates
this collection/control/style concept"; do not encode those joins only in prose.
`ontology-catalog` defaults to summary/counts only: domain summaries,
`rowCount`, `sourceLoweringImplementedCount`, and `relationCount` stay visible,
while full row-family arrays require `includeRows: true` and relation rows
require `includeRelations: true` or a relation-kind filter. Necessity and
missing/satisfied state belong to input contracts and the input-readiness
projection, not to relation names.
Input-dependency relation rows may carry selected input facets when the
dependency intentionally uses only part of a broad contract; omitted facet
selection means the row depends on the whole contract. This applies to every
input-dependent row family, not just controls: affordances, application
patterns, collection concepts, policy axes, control patterns, control manifests,
and visual policies should narrow broad contracts when a whole contract would
ask the AI/user for unrelated facts. Styling mechanisms are the style option
rows coordinated by application patterns; style choice input belongs to policy
axes, and visual payload input belongs to visual policies, so do not attach the
same readiness dependencies to every mechanism row. Broad intake rows such as blank-slate
intake may intentionally keep whole contracts visible. `visual-input-missing`
has the opposite polarity: it reports the absence of visual input, so it should
not depend on `VisualStyleInput` merely to say that input is absent.
Use the shared selection helpers from `input.ts` so relation, readiness, and
detail projections merge repeated same-contract selections instead of
flattening or erasing facets locally.
Source-lowering-implemented control patterns that delegate to the generic field-control,
button, or message lowerers should expose `VisualStyleInput` narrowed to
`VisualClassHooks`. Those hooks are recommended quality input, not required
domain input and not permission to invent CSS, but the readiness graph must
show them because source lowering can spend them mechanically.
Source-lowering-implemented application-pattern compositions should expose the same visual
facet when their composition lowerer can pass form, field, button, or message
hooks into member fragments, or status-region/pending/empty/error hooks into
promise-state fragments. The composition row owns the caller-facing missing
input, while member control/structural rows explain where the hooks are
mechanically spent.

Input contract rows carry accepted supplied-input sources. Keep that source
policy explicit: semantic-runtime may consume deterministic existing-app facts,
but it should not promote those facts into inferred business/domain intent. The
AI or caller supplies domain intent directly, or selects an explicit public
preset/sample.

Input facet rows make missing contracts actionable without inventing values.
For example, `domain-model` links to facets such as entities, fields,
finite value sets, relationships, actions, and deferred validation rules. These
facet edges are schema/menu terrain for an AI caller, not hidden defaults.
Finite value sets are distinct from field rows because radio/select/checkbox-list
controls need explicit option/value domains before source generation can be
honest; source invocation may spend field-local options as a shorthand, but
separate reusable value sets should stay named and visible.
Domain relationship/action facet detail is now structured input terrain:
relationships can describe references, ownership, and nested value objects, and
actions can describe commands before event/service/state/route realization is
chosen. This is not a claim that current source lowerers can realize every
relationship or action shape.
`source-lowering-context.ts` owns stateful emission context for generated names
that must be unique across composed fragment boundaries. Use it for generated
DOM ids inside one template/SourcePlan boundary; do not silently rewrite
caller-supplied explicit ids, which should be diagnosed separately if they
conflict.
Source placement keeps broad app-building policy separate from concrete preview
placement. `SourceRoot` names the target root or app area, `SourceTargetPath`
names one concrete generated artifact path for single-file SourcePlan previews,
and `SourceFileLayout` remains resource layout policy such as companion template
or inline markup. Do not spend source-file layout as a disguised template path.
SourcePlan preview lowering may receive `SourceRoot` and `SourceTargetPath` as
supplied input facet payloads. HTML-template wrapper previews may also receive
already-resolved `rootDir` / `templatePath` transport fields. These are one
placement model; conflicting values must block with typed issues rather than
creating an implicit precedence rule.
Create/submit forms are now represented as read-only app-builder terrain:
`CreateSubmitForm` coordinates command actions, native submit forms,
domain-backed submit forms, native control binding, local view-model state, and
DI state/domain classes. This is the first-ring form/action map, not an
edit-buffer, validation, i18n, plugin-store, or source-lowering claim.

`row-descriptor.ts` owns the shared ontology row descriptor list. Add a row there
when a new ontology family should be targetable by readiness, target catalogs, or
future source lowerers. Avoid projection-local descriptor lists; they drift and
hide missing row families.

`detail-helpers.ts` owns shared row-selection and id-deduplication helpers for
family detail projections. Use those helpers when joining selected ontology ids
back to row catalogs so `application-pattern-detail`, `collection-concept-detail`,
`control-pattern-detail`, `control-manifest-detail`, `effect-contract-detail`,
and `style-detail` do not regrow local selector forks.
It also owns the selected-detail compactness helpers: explicit selections get
rich joins by default, while unscoped detail queries require explicit `include*`
flags before expanding nested row families or payload schemas.
