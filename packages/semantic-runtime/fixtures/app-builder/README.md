# App Builder Generated App Fixtures

This tracked fixture lane is reserved for generated app-code contracts produced
from the current app-builder ontology, policy, and source-lowering surfaces.

Each future fixture should preserve:

- the exact app-builder or MCP request inputs that produced the source;
- request-local decision bundles for grouped caller/default choices, rather
  than hiding those choices as fixture-only metadata;
- the generated source files an end user or AI would inspect;
- a JSON manifest describing the fixture contract;
- expected semantic effects and reopen/verification query expectations.

`app-builder-request.json` stores the reviewable public request with
`rootDir: "."`, interpreted relative to the fixture root by the materializer.
`app-builder-response.json` stores the compact public answer surface and
SourcePlan witnesses without duplicating generated file text. It should keep
decision-bundle counts by default and include expansion rows when the fixture is
meant to make input/defaulting provenance reviewable.
Persisted snapshots normalize the fixture root to `.` so generated responses,
manifests, and verification artifacts stay machine-independent.
`generated-fixture-index.json` is the root review map produced by the
materializer. It lists each generated fixture, exact request/response/manifest
paths, generated source files, source-lowering targets, effect kinds,
decision-bundle counts, decision-bundle input contract/facet rollups, and
request-field surfaces without duplicating full source text.
`generated-fixture-index.md` is the generated human-review companion for the
same JSON authority. Use its compact table for counts and its per-fixture detail
sections for links into the exact request, response, manifest, verification, and
generated source files; do not treat the Markdown as a second machine contract.
`reviewArtifactByteCountSummary` and each row's `reviewArtifactByteCounts`
separate persisted request/response/manifest snapshot size from generated
source/tooling text size, so review can spot heavy fixture artifacts without
mistaking them for bloated generated app code. Start with `fixtureSummaryRows`
for a compact per-fixture scan; summary rows include the
request/response/manifest paths, generated source/tooling paths, and review
artifact byte counts so review can jump directly to the concrete files before
drilling into the full rows.
Summary rows also show the recommendation statuses for generated targets and
any contextual executable policy-satisfaction candidate target refs.
Full fixture rows include compact recommendation-policy rows for each generated
target, including applicability/evidence kind ids, so generated output can be
reviewed against the policy surface without making the materializer select
hidden defaults. Full rows also include `generatedControlUsePolicyRows`, and
summary rows include generated-control-use recommendation statuses plus
policy-satisfaction candidate target refs. This keeps leaf controls that appear
through generated `ControlUse` inventory visible in the same recommendation
policy review lane as explicit source-lowering target refs. Policy rows produced
from explicit SourcePlan target refs may report `policySatisfaction.state` as
`satisfied`; generated-control-use-only rows do not pretend that a caller
explicitly selected that target and can therefore report
`missing-explicit-selection`. The index also records
compact source-lowering request-field usage rows with request paths, enum-backed
field ids, and value shapes, so nested component-pair composition/class-member
inputs are visible without opening every full request file. Those usage rows are
extracted through the shared source-lowering request-field registry helper, not
materializer-local request-tree maps. Its
`sourceLoweringTargetRegistryCoverageRows` compare generated fixture output to
the executable target registry: `source-lowering-target-ref` means a fixture's
public SourcePlan answer names that target, while `generated-control-use` means
the generated control-use rows exercise that target or leaf control. Its
`sourceLoweringRequestFieldRegistryCoverageRows` compare generated requests to
the request-field registry, including target-owned fields and
SourcePlan-selection-owned fields such as component-pair envelopes. Treat this
as a review lens for unused optional/conditional fields and unregistered used
fields, not as a failing completeness contract for every request-field enum
member. `sourceLoweringRequestFieldReviewSummary` and
`sourceLoweringRequestFieldReviewRows` carry the current review disposition for
generated-app unused request fields so coverage counts do not turn into
mechanical fixture work when a field is already pressure-covered or waiting on
a deeper app/domain model. `policySatisfactionCandidateCoverageSummary` and
`policySatisfactionCandidateCoverageRows` show whether every currently
executable contextual policy-satisfaction candidate is exercised by either an
explicit source-lowering target ref or generated control-use inventory.
`domainModelCoverageSummary`, `domainModelKindCoverageSummary`, and
`domainModelCoverageRows` project the exact domain inputs stored in fixture
requests into entity names, identity kinds, field kinds, relationship kinds,
action kinds, action scopes, value sets, and seed-record counts. Use those rows
to spot domain concentration or missing model shapes before adding another
generated fixture; the domain review is evidence from caller-supplied request
payloads, not an app-builder defaulting mechanism. Missing domain action or
relationship kinds are review signals for future app-design/source-lowering
work, not fixture failures by themselves.
Focused source-lowering pressure fixtures publish the same request-field
coverage vocabulary in
`../pressure/app-builder-source-lowering-fixture-index.json`; use the two
indexes together when deciding whether an unused generated-app request field
needs an end-user-shaped fixture or is already covered by pressure.

`semantic-fixture.json` may include generated control-use rows when the request
promises concrete controls. Verification is performed outside app-builder by
opening the generated source with semantic-runtime and comparing those rows to
the public `control-use-inventory` app query. `semantic-verification.json` is a
materialized review snapshot of that check. Generated app-builder fixtures also
verify request idempotency by rerunning the stored `app-builder-request.json`
against the fixture root and comparing the resulting SourcePlan source/tooling
text to the tracked files. The same idempotency lane compares generated
manifest contract rows, including expected effects, effect contracts, ontology
target refs, control-use rows, and `sourcePlanWitnessRows`, to the stored
request output. A generated-source-quality check catches duplicate static
template attributes and trailing whitespace in generated source files, so
composed visual/accessibility hooks cannot silently produce invalid HTML and
label rendering cannot hide formatting whitespace in semantic text. These are
fixture tooling outputs, not source-lowering response fields.

The current component-pair app-shell canaries deliberately split scalar
view-model state from caller-supplied local collection state. Use
`component-pair-task-draft-app-shell` when checking native submit-form source
with scalar local fields, `component-pair-task-draft-object` when checking
rooted draft-object bindings through `bindingRootExpression`, and
`component-pair-task-draft-field-variety` when checking all first-ring native
field controls. The draft-object canary proves a typed local receiver object
and rooted value channels without claiming full edit-buffer, dirty-state,
undo/redo, validation, or service-save behavior. The field-variety fixture
spends
`fieldControlSelections` for textarea, range, radio-group, and checkbox-list
so those alternative controls are explicit request input rather than hidden
value-kind defaults. It also spends field-scoped `ControlAccessibility`
payloads so help/error/status messages attach to the intended generated field
groups, including grouped radio/checkbox-list fieldsets. The public contract
also rejects stale `ControlAccessibility` and `VisualClassHooks` field scopes at
Native Submit Form composition time instead of silently dropping those inputs.
The same fixture spends target-scoped `VisualClassHooks` for the form, field
groups, labels, controls, messages, and submit button. Its request explicitly
targets both `NativeSubmitForm` and the delegated `FieldGroup` control pattern,
while generated field groups now also carry nested `FormMessage` target refs
when help/error/status messages are emitted. Static form-message paragraphs are
currently covered as generated source-lowering targets, not as authored
`control-use-inventory` rows; authored control-use inventory is still shaped
around runtime-bound native controls and submit actions.
Generated Native Submit Form sources intentionally use ordinary actionless
`<form submit.trigger="...">` markup. Aurelia's app-root layer prevents native
navigation for actionless form submits by default; listener bindings themselves
do not globally own that prevention behavior, and generated fixtures should not
add `$event.preventDefault()` to mask the distinction.
Use `di-state-task-state` when checking direct DI state-class SourcePlan
generation: it emits a standalone TypeScript state model from caller-supplied
domain fields, seed records, and explicit source placement without adding
app-shell or router wiring. It is a source-only fixture, so
`check:fixture-typecheck` verifies its TypeScript through a transient config
rather than requiring generated package tooling.
Use
`component-pair-task-list-local-collection` and
`component-pair-task-card-local-collection` when checking list/card collection
source over explicit local collection state and `CollectionDisplayFields`
payloads. Use `component-pair-task-table-local-collection` when checking table
source over explicit local collection state and `CollectionTableColumns`
payloads. Use `component-pair-task-table-local-sort`
when checking the first local collection query rung: sortable table metadata
plus caller-supplied sort handler/method source, without app-builder inventing
method names. Use `component-pair-task-table-local-filter` when checking the
first local filtering/search rung: filterable table metadata, explicit
`filterBindingExpressions`, generated local query state, a native search input,
and a derived filtered collection getter. Use
`component-pair-task-table-local-pagination` when checking the local pagination
rung: explicit `CollectionQueryFeatures.pageSize`, generated local page state,
derived paged-collection getter, table-foot pagination controls, and native
previous/next button control-use rows. Use
`component-pair-task-table-row-selection` when checking the local scalar row
selection rung: explicit `CollectionIdentityPolicy`, generated selected-id
state, caller-supplied checked/toggle/label expressions, and semantic reopen
control-use rows that connect the checkbox value channel to its direct change
handler. Use `component-pair-task-table-batch-actions` when checking the first
local batch-action rung: explicit row selection, scalar identity policy, and
caller-supplied `batchActionControls` render a table-owned batch toolbar without
claiming select-all, cross-page, service-backed, or richer business-workflow
semantics. Use `component-pair-task-table-row-action` when checking entity-scoped
table action columns: the table button passes row-local context into the narrow
derived boolean-row command path without adding test-shaped parameters or
arbitrary method body text. Use
`component-pair-task-table-visual-hooks` when checking caller-supplied
`VisualClassHooks`: the request scopes the visual-style decision to the
collection-table target, carries class tokens and `data-*` attributes, the
generated HTML spends them, and no generated CSS or visual fallback is
introduced. Use `component-pair-task-table-loading-empty-error` when checking
promise-backed loading/empty/error regions with an explicit nested fulfilled
non-empty collection-table composition.
Use `component-pair-task-schedule-section` when checking the first local
owned-one relationship rung: a primary task collection owns one required
schedule object per task, the generated parent entity carries a typed child
object, seed records initialize nested child instances, and the table renders a
relationship-backed label column without pretending owned child edit/lifecycle
semantics are modeled.
Use `component-pair-task-checkpoints-section` when checking the first local
owned-many relationship rung: a primary task collection owns nested checkpoint
records, the generated parent entity carries a typed child array, seed records
initialize nested child instances, and the table renders a relationship-backed
label column without pretending owned child edit/lifecycle semantics are
modeled.
Use `component-pair-task-effort-section` when checking the first local nested
value-object relationship rung: a primary task collection embeds an identityless
effort value on each task, the generated parent entity carries a typed value
object, seed records initialize nested value instances, and the table renders a
relationship-backed label column without pretending value-object editing or
lifecycle semantics are modeled.
Use `component-pair-task-section-service-create` when checking the first
service-backed write rung: the request supplies an explicit service collection
`createMethods` descriptor, the generated service owns numeric identity
assignment and collection mutation, the generated view-model calls that method
through structured service-call fields, and the table is refreshed by replacing
the mutable promise member. It is still an in-memory service boundary canary,
not remote fetch, retries, validation, optimistic UI, full CRUD, or lifecycle
state modeling.
Use `component-pair-task-table-service-complete` when checking the first
service-backed row-update rung: the request supplies an explicit service
collection `updateMethods` descriptor, the generated service keeps a readonly
public record interface over private mutable backing records, and the generated
view-model passes row-local table context into a structured service-call command
that refreshes the promise-backed table. It is still a narrow row mutation
canary, not edit-buffer, dirty-state, validation, optimistic UI, full CRUD,
remote fetch, or lifecycle state modeling.
Use `component-pair-task-section-service-create-and-complete` when checking the
first combined service section rung: one generated in-memory service collection
spends explicit `createMethods` and `updateMethods`, a native submit form creates
records, the promise-backed table renders row-local actions, and both commands
refresh the same mutable async collection member while spending explicit action
feedback status rows. It is still an in-memory composition canary, not full CRUD,
edit-buffer, optimistic UI, validation/toast policy, remote fetch, or lifecycle
state modeling.
Use `component-pair-task-section-service-filter-create-complete` when checking
ordered mixed app-section content and the first combined service query/write
section rung: one generated in-memory service collection spends explicit
`filterMethods`, `createMethods`, and `updateMethods`; the section interleaves a
native submit form, section-owned all/open/completed query controls, action
feedback statuses, and a promise-backed table with row-local completion. It
also emits an explicit query-state member and reload method so create and
complete commands refresh through the active query state. This proves the first
query-control-preserving service write rung, not remote fetch, retries,
caching, broad sort/pagination query UI, optimistic UI, validation/toast
policy, edit buffers, or lifecycle state modeling.
Use `component-pair-task-section-service-search` when checking the first
service-backed text query rung: the request supplies an explicit
`text-contains` service filter predicate, a query-state member bound through a
field-group text input, search/clear command buttons, action feedback statuses,
and a promise-backed table. This proves in-memory service text search and
reload-only query commands; it does not claim remote fetch, server-side query
contracts, sorting/pagination/totals, caching, retries, validation/toast policy,
edit buffers, or lifecycle state modeling.
Use `component-pair-task-section-service-search-create-complete` when checking
the next combined service query/write rung: the same text query state and
`text-contains` filter predicate are combined with native create and row
completion commands, and both service writes refresh through the active search
reload method instead of resetting the table to the unfiltered service result.
This proves query preservation across simple service writes; it does not claim
remote fetch, server-side query contracts, validation/toast policy, optimistic
UI, full CRUD, edit buffers, or lifecycle state modeling.

Collection and detail display fixtures intentionally spend field value kind:
boolean fields render as disabled native checkboxes with `checked.to-view`
rather than raw `true`/`false` interpolation.
Collection list/card/table fixtures and routed browse/detail list routes with
explicit empty-state text and condition render the collection surface as the
sibling `else` branch, so empty collections do not show an empty message and the
collection chrome at the same time.

Use `minimal-app-shell-convention` and `minimal-app-shell-decorator` as the
smallest convention-policy/resource-carrier comparison. The decorator fixture
selects explicit resource declarations and emits `@customElement` metadata with
a template import; it is a policy canary, not a signal to multiply every
generated fixture across carrier variants.

Routed browse/detail fixtures intentionally spend identity value kind in lookup
source. Numeric identities compare the string-valued route param to
`String(item.id)`, while string identities compare the member directly without
generic `String(...)` projection.

Focused source-lowering and analyzer pressure that is not intended to look like
end-user generated app output belongs under `../pressure/app-builder-*`.
