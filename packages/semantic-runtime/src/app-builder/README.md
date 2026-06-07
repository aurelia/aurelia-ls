# App Builder

`app-builder` is the AI-first app construction substrate for semantic-runtime. It
does not try to mirror every Aurelia capability as generated-code advice.
Semantic-runtime and Atlas should understand the whole framework terrain;
app-builder should expose a smaller, robust, explicit set of ontology rows,
input contracts, source-lowering callbacks, and pressure fixtures that help AI
callers produce compact maintainable Aurelia source.

## Current Shape

```text
caller intent
  -> app-builder ontology/detail/readiness queries
  -> explicit domain, source, policy, style, accessibility, and routing inputs
  -> source-lowering invocation/composition/SourcePlan surface
  -> semantic-runtime reopen, expected effects, diagnostics, and control-use rows
  -> compact MCP/IDE guidance
```

The deleted starter/golden lane is intentionally not the authority anymore. Do
not reintroduce starter menus, starter intents, domain presets, seed profiles,
composition catalogs, starter builders, source-startable evidence bridges, or
`fixtures/app-builder/goldens` unless the operator explicitly asks to rebuild
that direction from the ontology.

## Ownership

- `ontology/` owns the read-only app-building terrain: target catalog,
  relation graph, input contracts, readiness, detail projections, effect
  contracts, policy/style/control/collection/application-pattern rows, source
  lowering surfaces, preflight, and SourcePlan preview answers.
- `part-*.ts` catalogs own reusable framework-grounded source parts. They should
  reference semantic-runtime resource and syntax catalogs instead of
  re-declaring built-in Aurelia names, aliases, package dependencies, or binding
  command identity.
- `source-lowering-*.ts`, `*-source.ts`, and `source-plan-*.ts` own executable
  source-lowering helpers and pressure galleries. They may spend ontology rows
  only through explicit request payloads and must preserve contribution origins
  for later API, diagnostics, MCP, and IDE explanations.
- `domain-*.ts` and `seed-data.ts` own caller/domain input shapes and optional
  sample records. Sample domains and sample records are defaults or pressure
  inputs; they are not reusable app-building patterns. Current source lowerers
  spend concrete `SeedRecordSet` payloads only; seed density/purpose selectors
  stay deferred until a public preset/defaulting layer is reviewed. Boolean
  fields stay ordinary domain fields unless an explicit future display/action
  policy supplies labels, status semantics, or class hooks.
- `policy/` owns recommendation/status projections for app-builder itself. It
  separates registry-backed implementation status, local defaulting
  candidates, and recommendation ranking from request-local decision bundles,
  deferred blank-slate profiles, and public app policy axes such as routing or
  state ownership.
- `../source-plan` owns neutral file/source/tooling envelopes. Keep
  app-builder policy out of SourcePlan primitives; app-builder should publish
  origins and typed contributions through the neutral ledger.
- `../fixture-verification` owns effect verification. App-builder should use
  semantic-runtime contracts and pressure fixtures instead of owning a separate
  bespoke verification runner.
- `fixtures/app-builder` owns tracked generated app-code contracts. These
  fixtures preserve exact public app-builder requests, generated source,
  compact public responses, semantic manifests, and persisted verification
  snapshots; app-builder lowerers should not grow their own verifier.

## Public API

`api/app-builder.ts` is the public facade. The current callable surfaces are:

- `catalog`
- `ontology-catalog`
- `target-catalog`
- `input-readiness`
- `input-contract-detail`
- `affordance-detail`
- `application-pattern-detail`
- `collection-concept-detail`
- `control-manifest-detail`
- `control-pattern-detail`
- `effect-contract-detail`
- `policy-detail`
- `recommendation-policy`
- `style-detail`
- `source-lowering-preflight`
- `source-lowering-invocation`
- `source-lowering-composition`
- `source-lowering-source-plan`
- `part-menu`
- `part-source-lowering-preview`
- `part-source-invocation`
- `catalog-integrity`

The MCP package should remain a thin shell over this facade. Do not add
MCP-local app-building policy or direct imports of app-builder catalog files.

## Part Menu

`part-menu` is a compact discovery surface over reusable app-builder source
parts. It is intentionally tier-gated: broad/default calls return the preferred
generated-source subset, while advanced or intent-scoped parts require exact
part/package/resource-package intent or explicit `authoringTiers` input.
Shape-only filters such as `partKinds`, application sites, slot kinds, or slot
value languages should not silently widen that recommendation gate. If such a
query only matches filtered-out non-preferred parts, the answer should keep the
zero-row menu plus `authoringTierFilteredOut*` counts and continue back to a
widened `part-menu` query. Do not continue directly to
`part-source-lowering-preview` until the menu has returned concrete parts for
the caller to inspect.

## Detail Navigation

Ontology detail queries are selector-sensitive. Unscoped detail calls return
compact base rows and counts; selected row ids or explicit include flags recover
the richer joins. Public continuations should therefore preserve base row ids
from compact detail answers and point to selected detail queries instead of
leaving compact rows as terminal pages. This lets broad MCP calls stay small
while still giving an AI a typed path to exact manifests, policies, controls,
effects, style rows, and input payload detail.
`input-contract-detail` also reports source-lowering consumer counts for input
facets. Those rows mean "this executable target consumes this facet payload",
not "this input facet is itself source-lowerable"; exact callable targets remain
registered in `ontology/source-lowering-surface.ts`.

## Source Lowering

Callable source-lowering surfaces are registered in
`ontology/source-lowering-surface.ts`. That registry is the maintenance handle
for which exact ontology targets can be spent by invocation, composition, or
SourcePlan preview surfaces. The app-builder query-surface contract verifies
that the registry and public `sourceLoweringImplemented` status rows stay
synchronized.

`source-lowering-preflight` is the read-only gate between selected ontology
targets, supplied inputs, request fields, and executable source-producing
surfaces. It should report whether source lowering is implemented, which inputs
are missing or invalid, which request fields are still required, and which
effect contracts a caller may inspect before producing source.
`canRequestSourceLowering` is an eligibility bit after durable input,
policy-satisfaction, and target-specific source facts are ready; it does not
mean every per-call request field such as `promiseExpression`, `rootDir`, or
`sourceLoweringComposition` has already been supplied. The compact preflight
answer therefore also reports required request-field target and field counts,
and each row carries a per-surface request-field summary.
It also reports policy satisfaction for contextual executable targets: exact
target selection satisfies the current first-ring gate, while broad/default
target sets keep contextual rows from reporting `canRequestSourceLowering=true`.
When broad/default preflight exposes contextual policy gates, public
continuations should point to `recommendation-policy` detail for those exact
target rows so callers can inspect applicability and evidence before deciding.

`catalog-integrity` is the registry/status audit surface. Hard registry or
status contradictions are integrity issues, while provisional/TBD status rows
remain review-visible without failing the integrity probe. When the probe
returns status-audit rows, public continuations should open exact
`target-catalog` rows, `recommendation-policy` rows, and family-specific detail
queries such as `input-contract-detail` or `style-detail` for the same targets.
That keeps review-needed terrain recoverable by an AI without turning the
integrity probe into a policy selector.

`source-lowering-invocation` lowers a single selected target into source
fragments. `source-lowering-composition` lowers a selected composition target
into multiple fragments. `AppSection` accepts ordered `childContent` rows when a
section needs to interleave child compositions with direct child invocations; the
older `childCompositions` field remains a composition-only convenience path.
`source-lowering-source-plan` wraps selected targets into complete `SourcePlan`
previews after explicit source placement is supplied.
Wrapper continuations from invocation or composition to SourcePlan are
fragment-backed: missing-target, missing-field, missing-action, or otherwise
zero-fragment answers should report their issues without advertising an empty
SourcePlan preview.
SourcePlan answers keep counts visible by default and put generated control-use
inventory rows, SourcePlan witness rows, selected lowerer result details, and
decision-bundle expansion rows behind explicit detail flags.
None of these queries writes files.

## Recommendation Policy

`policy/recommendation-policy.ts` is the operator-reviewable home for
recommendation ranking and local defaulting-candidate policy. It deliberately
does not choose blank-slate defaults, infer business-domain taste, or evaluate
existing apps. Candidate rows are menu/defaulting hints for an already selected
policy axis, ontology family, or target context; request-local decision bundles expand explicit policy/default choices
into ordinary supplied inputs, while named blank-slate/new-app profiles remain
deferred. `policy/status-projection.ts` derives public source-lowering status
from the executable source-lowering registry so generated-source availability
does not have to be hand-synchronized in every ontology row file.

`recommendation-policy` is the public read-only query for this terrain. It
returns recommendation posture, applicability lanes, evidence lanes, compact
summary counts, and executable contextual rows that would need policy/defaulting
review before app-builder should trust them as generated output.
Source-lowering preflight spends the same shared policy-satisfaction predicate,
so this candidate row family is not a separate review-only definition.
The recommendation-policy query does not select policy and does not lower
source. The default response is compact
summary/counts; callers set `includeRows: true` when they need the row table.
Rows such as `visual-input-missing` are fallback/reporting posture, not visual
payload spenders: they should have no `VisualStyleInput` readiness dependency.
Rows that actually spend class hooks, CSS fragments, tokens, or design-system
references keep the visual input dependency and surface it through readiness and
payload detail.
Recommendation-policy overrides should not duplicate broad input dependencies
already emitted by the ontology relation graph. Use overrides for extra context
such as scalar domain field kind, choice value sets, numeric constraints, or
related ontology selections; let relation-backed readiness own spendable input
contracts and facets.

`ontology/row-descriptor.ts` preserves both `declaredStatus` and projected
`status`. Use `declaredStatus` when auditing row-local drift; use projected
`status` for public catalogs and AI-facing menus.

## Pressure Fixtures

Tracked generated app-code contracts live under:

```text
packages/semantic-runtime/fixtures/app-builder
```

Refresh them with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime fixtures:app-builder-generated
```

Those fixtures preserve exact public request inputs, compact public response
snapshots, generated source, manifests, expected effects, and semantic-runtime
verification snapshots. They are the review lane for end-user-shaped output,
not an app-builder-local verification subsystem. Generated app-builder fixture
verification reruns each stored request and compares the produced SourcePlan
source/tooling text plus manifest contract rows to the tracked fixture output,
then also checks for duplicate static template attributes so composed
visual/accessibility hooks cannot silently produce invalid HTML.
`generated-fixture-index.json` separates advertised request-field surfaces from
actual source-lowering request-field usage rows. The usage rows list request
paths, enum-backed request field ids, and value shapes, which keeps nested
component-pair inputs such as child compositions, sort handlers, visual hooks,
and caller-owned command methods reviewable without duplicating request values.
`generated-fixture-index.md` is generated from that same JSON index as a
human-review companion: the compact table keeps counts visible, and per-fixture
detail sections link to the exact request, response, manifest, verification, and
generated source files.
Usage extraction is owned by
`appBuilderSourceLoweringRequestFieldUsageRowsFromAppBuilderRequest` in the
source-lowering request-field registry, so fixture tooling spends the same
request-tree vocabulary as target catalog, preflight, and SourcePlan answers
instead of carrying script-local walkers.
The same index also carries `sourceLoweringTargetRegistryCoverageRows`, which
make executable target coverage reviewable across public SourcePlan target refs
and generated control-use rows. The sibling
`sourceLoweringRequestFieldRegistryCoverageRows` keep request-field coverage
reviewable across target-owned fields and SourcePlan-selection-owned fields.
They are meant to surface unused optional/conditional fixture pressure and any
used field without registry ownership; they should not be treated as proof that
every optional request-field variant needs immediate generated fixture coverage.
The compact registry coverage summary partitions unused fields into required,
conditional-only, optional-only, and mixed conditional/optional counts so a
future review can distinguish blockers from refinement knobs without rereading
all detail rows. Generated fixture indexes also include
`sourceLoweringRequestFieldReviewSummary` and
`sourceLoweringRequestFieldReviewRows` for the current generated-app unused
field posture, such as pressure-covered direct fields, rooted draft-object
coverage, and deferred full edit-buffer/object-choice modeling.
Generated fixture indexes also include `domainModelCoverageSummary`,
`domainModelKindCoverageSummary`, and `domainModelCoverageRows`, which project
stored request payloads into entity, identity-kind, field-kind,
relationship-kind, action-kind, action-scope, value-set, and seed-data coverage.
Use those rows to decide whether a future fixture should broaden caller domain
input rather than multiplying another task-shaped app; the rows are review
evidence from exact requests, not a defaulting or preset layer. Missing
relationship kinds or action-scope variants are app-design/source-lowering
frontiers, not automatic fixture failures.
Generated control-use summary lists separate control-pattern ids and leaf
control ids. Use `controlUseInventoryControlPatternIds` for ontology target
coverage and `controlUseInventoryLeafControlIds` only as native-control review
evidence.
Generated control-use policy rows keep contextual satisfaction explicit too:
exact target refs, nested `fieldControlSelections`, and supplied domain field
shapes are distinct evidence sources, while observation alone is not enough to
claim that a contextual control was deliberately selected.
Fixture summary rows keep policy-satisfaction counts visible by default, while
the full fixture rows carry the per-target policy rows and satisfaction source
details.
Field schemas map to leaf controls through `appBuilderDomainFieldControlId`,
and leaf controls map to control patterns through the control ontology helpers.
Fixture tooling and lowerers should spend that shared mapping rather than
recreating value-kind switches locally.

The current component-pair canaries cover scalar local create-form state, native
field-control variety, local collection table projection, explicit local
sorting, entity-row action columns, explicit caller-authored command actions,
first-ring scalar row selection, first-ring local batch action buttons,
caller-supplied structural visual hooks, promise-backed loading/empty/error
regions with nested fulfilled content, and first-ring local relationship
sections.
The direct `di-state-task-state` generated fixture covers standalone DI
state-class SourcePlan output from caller domain fields, seed records, and
explicit TypeScript source placement without claiming app-shell or router
wiring.
The field-variety fixture proves that field schemas can carry explicit
`defaultValue` input and spend all first-ring native field controls without
app-builder inventing a domain preset. It uses explicit
`fieldControlSelections` for textarea, range, radio-group, and checkbox-list,
proves grouped choice source shape through `fieldset`/`legend`, and spends
field-scoped `ControlAccessibility` help/error/status payloads through
`aria-describedby` relationships. Native Submit Form composition also rejects
stale field-scoped accessibility or visual payloads whose `fieldName` is not in
the selected form fields, so caller input does not disappear silently. It spends
caller-supplied `VisualClassHooks` for the form, field groups, labels, controls,
messages, and submit button without app-builder inventing CSS; the request
explicitly scopes that visual-style decision to both `NativeSubmitForm` and the
delegated `FieldGroup` control pattern, while generated field groups propagate
nested `FormMessage` target refs when accessibility messages are emitted. Those
static message fragments are target-ref coverage, not authored
`control-use-inventory` coverage, and static visible `errorText` is pressure for
future validation/display-state policy rather than a settled create-form
recommendation; a static-template message inventory would be a separate analyzer
schema if we need it later. It also proves domain-owned finite option type
aliases for collection-backed submit/create forms, so a plural choice-set field can
still generate a singular option value type without coupling the alias to the
component name. The
sorting fixture is intentionally narrow: collection-table lowering wires a
caller-supplied sort handler through a native header button, while
`DomainCommandAction` emits the caller-supplied method body. The filtering
fixture is the first generated local query-state rung: collection-table lowering
renders a native search input from an explicit `filterBindingExpressions` row,
and local view-model collection state emits the corresponding filter member and
derived filtered-collection getter without inventing server/service query
semantics. The row-action
fixture proves that table action columns can pass row-local context into the
narrow derived single-boolean entity command path without app-builder inventing
test-shaped parameters or arbitrary method body text. The command-actions
fixture proves the broader caller-owned lane: update/delete/archive/assign row
actions and submit/refresh top-level buttons flow through `DomainActions`,
native-button/event-listener lowering, and explicit `DomainCommandAction`
method bodies. Local collection entity source marks caller-declared mutating
entity action input fields writable, but app-builder still does not invent the
business body or service/router integration. The
collection list/card/table fixtures also report boolean display cells as
generated `native-boolean-checkbox` control-use rows with
`selected-collection-field` binding provenance, so the public inventory does not
only see interactive sort/action buttons. The
visual-hook fixture proves that `VisualClassHooks` payloads can carry class
tokens and `data-*` attributes into generated source without app-builder
inventing CSS, visual taste, or a design-system dependency. The async table
fixture proves that loading/empty/error lowering can render an explicit nested
fulfilled non-empty composition without inventing async data source, lifecycle,
or service semantics. The service fixtures prove explicit in-memory service
boundaries in gradual rungs: load, refresh, filter, narrow create/write, and
row update methods. The create rung emits a generated service method from
explicit `createMethods` request input, calls it through structured service-call
fields, and updates the same mutable promise-backed table member. The row-update
rung emits an explicit `updateMethods` service method, keeps the public record
interface readonly while the service owns a private mutable backing record, and
lets a table row action refresh the promise-backed table from the service call
result. The combined service section rungs prove the same generated service can
own explicit filter, create, and row-update methods while a native submit form,
section-owned all/open/completed query controls, action feedback statuses, and
promise-backed table share the same mutable async collection member. The
filter/create/update section also emits explicit query-state and reload source
so service writes refresh through the active query context instead of resetting
to the unfiltered service result. The service search section adds the first
text-query rung: an explicit `text-contains` service filter predicate, a
field-group search input bound to service query state, reload-only search, clear
search, action feedback, and the same promise-backed table projection. The
search/create/complete section combines that text-query state with native create
and row completion service writes so both write commands refresh through the
active search reload method. These rungs do not claim remote fetch, retries,
validation, optimistic UI, broad sort/pagination/totals service-backed query UI,
full CRUD, edit-buffer/dirty-state policy, or lifecycle state.
Collection fixtures also prove that boolean display fields use read-only native
checkboxes, explicit empty states own a sibling `else` collection branch in both
collection compositions and routed list routes, and routed browse/detail lookup
source spends identity value kind without pretending route params are typed.
These fixtures prove source
assembly and semantic reopen with local sorting, filtering, pagination,
first-ring scalar row-selection coverage, and first-ring local batch action
buttons. Relationship fixtures currently cover local `reference-one`,
`reference-many`, `owns-one`, `owns-many`, and `nested-value-object` source:
reference rows generate related collection lookup/label helpers plus
relationship-backed table cells, owned rows generate typed child objects or
arrays on the parent entity, and nested value-object rows generate identityless
typed values on the parent entity plus the same relationship-backed table
display path. They do not claim owned child/value-object editing,
lifecycle/state-machine semantics, select-all, cross-page/service-backed batch
selection, service-backed query, broad state workflow, or visual design engine
coverage.

Focused source-lowering/analyzer pressure fixtures live under:

```text
packages/semantic-runtime/fixtures/pressure/app-builder-*
```

Refresh them with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime fixtures:app-builder-pressure
```

Pressure scripts should select these fixtures with the normal
`pressure:<folder>` prefix. Avoid brittle snapshot fixtures; the useful signal is
whether the generated source reopens through semantic-runtime with the expected
effects, diagnostics, generated target coverage, control-use rows, SourcePlan
witness rows, and source contribution origins.
`fixtures/pressure/app-builder-source-lowering-fixture-index.json` is the
focused pressure counterpart to the generated-app fixture index. It records
source-lowering target refs and request-field usage rows for the source-lowering
gallery plans, then compares them to the shared request-field registry. Use it
before adding generated app variants just to exercise optional/conditional
request fields. Read generated-app and focused-pressure request-field coverage
together: generated apps should prove end-user-shaped envelopes and realistic
composition, while focused pressure fixtures may spend low-level override fields
that would be noisy or misleading as standalone generated app examples.

## Ground Rules

- App-builder rows should be explicit about whether they are ontology facts,
  executable source-lowering targets, pressure fixtures, or future/deferred
  terrain.
- Prefer source generation that spends existing semantic-runtime substrates:
  built-in resource catalogs, syntax catalogs, source-plan assembly, framework
  configuration admission, router source helpers, state source helpers,
  observation/type-system facts, and fixture verification.
- Keep sample domains, sample data, presentation copy, and CSS out of reusable
  app-building mechanics unless the row is explicitly a pressure fixture or
  caller-supplied visual/style input.
- When source lowering exposes a semantic-runtime gap, fix the lower substrate
  when it benefits diagnostics, MCP, IDE, AOT, SSR/SSG, or future app-builder
  work. Record deferred gaps in Atlas memory and Work Router.
