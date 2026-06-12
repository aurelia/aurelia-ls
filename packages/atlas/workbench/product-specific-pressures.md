# Product Pressures For Semantic Runtime

This note is a compact reference for deriving ontology from the obligations of the semantic runtime product, rather than
from a standalone framework relationship catalog. In this note, "product" means the user-facing Aurelia semantic
substrate exposed by `packages/semantic-runtime/`.

Aurelia framework names, classes, helpers, resources, and lifecycle boundaries give the product a tested shape to
mirror. The ontology earns its keep where the product must attach meaning that the framework itself
does not carry directly: evidence, provenance, invalidation, generated checking artifacts, reachability, edit safety, and AI
navigation affordances.

## Core Rule

Do not begin with "what relationships exist in Aurelia?"

Begin with:

```text
What product obligation must be discharged, and what framework-grounded facts does that obligation need?
```

Only promote a concept into ontology when multiple obligations need the same stable primitive.

## Product Pressures

### Provenance And Evidence

The product must explain why it believes a fact. This supports navigation, rename/refactor safety, diagnostics,
human review, AI trust calibration, and source expansion.

Required shapes:

- source ranges and declaration identities
- generated artifact provenance
- framework-source versus app-source authority
- evidence roles and confidence/open-seam boundaries
- continuation handles back to exact source

Atlas `product.architecture` now exposes `field-provenance` rows for source-level `FieldProvenance` construction sites.
Use that lane when deciding whether a fact needs field-level provenance or whether product/source provenance is the more
honest shape. In particular, authored TS/HTML/configuration facts may need field spans, while framework-fixed catalog
facts should not gain false edit precision just because every product field can technically receive a provenance handle.

### Cache And Invalidation

The product must know which semantic facts become stale when source changes.

Required shapes:

- file/module dependency keys
- generated artifact dependency sets
- app-world and DI-world cache keys
- resource catalog and compiler-world invalidation
- TypeChecker epoch or project-snapshot identity
- resource subscriptions/list-changed style notifications for AI clients

### Usage And Reachability

The product must answer "what is used where?" at framework level, not only TypeScript reference level. This matters
for AOT, stripping unused resources, optimizing generated output, and explaining architectural impact.

Required shapes:

- app root reachability
- configuration and plugin admission reachability
- DI provider/resource visibility reachability
- route/resource/template reachability
- route-context, route-tree, route-recognizer, and routed-component lifecycle reachability
- parser-grade router reachability: route config rows should feed route-recognizer path grammar, segment/state,
  endpoint, candidate, and recognized-route products before navigation behavior is claimed
- instruction-to-renderer and renderer-to-binding reachability
- typechecker-handoff reachability for expression/member surfaces

### Generated Checking And Projection

The product must generate or emulate artifacts that do not exist directly in user source, then map them back to
source. Generated checking code, virtual app-world products, and TypeChecker-backed projections should preserve exact
source correspondence so diagnostics, navigation, and edits remain explainable.

Required shapes:

- template value sites
- generated checking contexts
- source-to-generated and generated-to-source maps
- binding scope and local variable products
- strictness/open-seam policy
- TypeChecker carrier lifetime

### Framework Emulation Boundaries

The product must decide which framework behavior is fully emulated and which is virtualized or handed off.

Required shapes:

- ECMAScript evaluation/module environment records
- DI container world and resolver/resource slots
- JIT compiler world
- deterministic instruction products
- hydration/controller/binding products
- router topology products: `RouterOptions`, `RouteConfig`, `RouteableComponent`, `RouteConfigContext`, runtime
  `RouteContext`, recognizer ownership/inheritance, recognizer endpoint/state graph, `au-viewport`, `ViewportAgent`,
  route-tree, and viewport-instruction handoff, with static routeable compilation distinguished from runtime activation.
  Option-aware topology should preserve app-root seeding, lazy versus eager recognizer ownership, parent-prefixed
  recognizer paths, the RouteConfigContext-vs-RouteContext split, static `load`/internal `href`
  RouteExpression parsing into `TypedNavigationInstruction` / `ViewportInstruction` / `ViewportInstructionTree`
  products, forward route-recognizer `State.nextStates` graph shape, static `RecognizedRoute` handoff products for
  closed instruction paths, the framework's initial synthetic root RouteTree, and context-relative transition RouteTree /
  RouteNode products for recognized route targets, including closed static redirect targets. Runtime route contexts
  should follow the framework's `(ViewportAgent | null, RouteConfigContext)` cache shape, not collapse back to a
  one-context-per-config projection, and unresolved nested `ViewportRequest` chains should remain open unless a
  first-class partial-tree product is introduced. None of these products should claim guard lifecycles or viewport
  activation have run.
- template-controller virtualization seams
- TypeChecker-backed reactivity and expression surfaces

### Evaluator Provenance And Boundaries

External-app pressure should push evaluator substrate down to ECMAScript/module semantics before product recognizers add
special cases. Open seams need exact node-owned source provenance, even when the evaluated body belongs to an imported
module while the consumer source is elsewhere. Host environment, external-module, and async-execution values should flow
as explicit boundary carriers until a materializer can decide whether the boundary is acceptable, queryable policy, or a
product seam.

Treat these as evaluator responsibilities rather than app-specific fixtures:

- optional-chain nullish short-circuiting
- function/body block declaration instantiation for authored CommonJS/UMD helper shapes
- Promise-shaped async call boundaries and continuations
- local asset/module source admission with exact source spans

If an external pressure row points at a broad carrier or a caller source file instead of the exact expression that caused
the fact, assume provenance substrate is incomplete until framework/source comparison proves otherwise.

## AI And MCP Pressures

Large-scale codebase management for LLMs adds obligations that classic IDE/compiler tooling does not fully cover.
Atlas is the current mapping and inquiry surface for this repo; MCP language in this document is packaging grammar and
integration pressure, not a reason to revive au-mcp-style source mapping as an authority.

### Context Economics

Answers must be multi-resolution: summary first, rows next, evidence/source only on demand. The product should
make it cheap for an agent to decide whether to drill down.

Large-app semantic-runtime pressure shows the same principle inside app-world construction. Router/resource/controller
topology can close without paying the full binding observation typechecking lane; binding value-channel/data-flow
analysis is needed for template typechecking, assignment policy, observer value domains, and autocomplete-grade facts.
Treat this as inquiry algebra, not just performance tuning: callers can now choose a `SemanticAppAnalysisDepth` that
opens runtime/router topology without the binding observation lane, then request full binding analysis when that is the
product question. The next split is lower in the stack: Atlas should help identify when app-world questions truly need
TypeChecker construction, resource recognition, static evaluation, template compilation, route topology, or binding
observation so semantic-runtime can answer with the minimum honest substrate.

Not every slow phase is an inquiry-algebra boundary. Resource-recognition profiling once pointed at kernel emission, but
the real cost was a repeated checker provenance lookup: every projected member declaration scanned all store addresses
to find its admitted source file. The durable Atlas lesson is to make phase profiles drill down far enough to separate
ordinary product-feature cost from missing low-level indexes or caches. When the bottleneck is a repeated primitive,
strengthen the substrate first; when the bottleneck remains tied to a product question after that, expose it through the
inquiry algebra.

Mixed monorepos need a cheap project-shape lane before app-world opening. A stress run may intentionally open every
discovered package, but product flows need to decide whether they are asking for app entrypoints, resource libraries,
Aurelia packages without app facade evidence, or all-project pressure. Semantic-runtime summary rows now expose
source-role counts, import/receiver-grounded Aurelia app entrypoint signals, manifest dependency counts for `aurelia` /
`@aurelia/*`, dependency origin (`project-manifest` versus `workspace-manifest`), project-shape reason counts, and
source-level Aurelia facade signals from parsed imports, default imports, namespace imports, constructor calls,
`.register(...)`, `.app(...)`, and `.enhance(...)`. Workspace-manifest context is intentionally admission-level: a child
package included by an ancestor `workspaces` manifest can become a resource-library authoring candidate when it has
HTML/CSS source roles, but it still needs activation source evidence before becoming an app-world. Atlas should keep
improving the corresponding workspace/package projections so future agents can pick scope from architecture evidence
instead of discovering the cost only after TypeChecker/static-evaluation work has already run. Shape-filtered app
pressure via `SEMANTIC_RUNTIME_PROJECT_SHAPES` is the current manual lane for validating that distinction. The nested
TypeSystem profile shows whether the remaining cost is TS program creation, checker creation, project-option discovery,
or source indexing.
Atlas workspace architecture now mirrors this admission story more closely: manifest rows distinguish local
`aurelia-framework-dependency` from `workspace-aurelia-framework-dependency`, and the file inventory supplies a bounded
fallback source scan for package frames whose tsconfig admits no app source because of inherited `files` settings. That
fallback must exclude nested package roots, otherwise parent workspace packages incorrectly inherit child app entrypoints
and route surfaces.
Semantic-runtime app pressure should default to generalized detail for external clean-room roots. Source-assignment strictness
is now carried as typed `sourceAssignmentReasonKinds` on binding data-flow rows; open-seam reason buckets are durable
pressure. Raw row wording is local debugging material unless it has been manually abstracted.
LSP-like template pressure adds a second scope axis: hydrated app templates versus standalone authoring templates.
External monorepo sampling showed many recognized custom-element templates outside app-root compiler worlds. Those
templates must be analyzable for editor/MCP/AOT-style questions, but they should not inflate app topology or route
activation facts. Semantic-runtime now exposes an opt-in authoring-template lane with source-file selection through
`sourceFilePath` / `authoringTemplateSourceFiles`; the per-project template cap remains a pressure fallback, not the
preferred product shape. Source-file-selected authoring opens let callers pay for the template files they are asking
about instead of compiling a whole resource library. The runtime facade now exposes direct `templateCompletions(...)`
and `templateCursorInfo(...)` cursor-locus queries that first reuse any opened app-world whose compiled template
already owns the cursor source, then fall back to a cursor-source-selected authoring open. Future hover, definition,
diagnostics, and explanation entrypoints should reuse that cursor-locus boot protocol instead of making callers stitch
`openApp(...)`, resource lookup, and cursor answer construction together. Repeated LSP queries in the same runtime must
reuse existing app context when possible and otherwise keep the fallback authoring scope explicit through cursor source
selection, explicit source lists, or `authoringTemplateLimit`.
Cursor pressure should separate expected-empty static platform values from real semantic gaps. The current
semantic-runtime pressure script prints completion pressure classes, public API answer mismatches, template-resource
miss reasons, and value-domain gaps so raw `miss` counts do not hide that distinction. Finite checker-backed bindable
domains can already produce literal `attribute-value` candidates, and the public API completion wrapper is checked
against the lower-level inquiry answer on sampled cursors. Resource re-selection for source cursors must match authored
HTML spans, not only broad template-source carriers. Open-ended checker-backed scalar bindables should read as
expected-empty completion sites rather than missing semantic domains. Inline multi-binding custom-attribute values can
close at the resource-definition layer by offering bindable segment names. Router `load` and `href` primary values now
close from modeled `RouteConfig` product details threaded through the completion query, producing `router-route`
candidates without source rescanning; `href` stays open-ended because the framework can leave external URLs external.
Static i18n `t` values now close from modeled translation-key products admitted from static `I18nConfiguration`
resources, keeping translation-key completion as configuration/i18n substrate rather than a template-source scan. JSON
resource imports use the evaluator asset-module source map so key products can preserve authored JSON property spans.
Segment values that resolve to a custom-attribute bindable now report bindable-domain pressure, so
untyped plugin keys stay separate from whole-resource grammar gaps. Remaining static-value pressure is mostly
custom template-controller and genuinely resource-owned custom-attribute grammars that need framework/plugin-shaped
domain models rather than ad hoc string suggestions. Built-in template-controller primary values are owned by
`template-controller-semantics.ts`: open framework values such as `case="..."` are expected-empty completion sites,
while secondary bindables and custom/plugin template-controller grammars should keep surfacing as pressure until their
domain is modeled. Listener-member pressure should stay grounded in Aurelia runtime binding semantics: listener
expressions get a transient `$event` override-context slot, and listener-returned callback functions receive that event
as their first argument. Completion/hover/diagnostic APIs should read those facts from the expression-scope and
TypeChecker substrate instead of carrying listener-specific answer shims. Function-valued bindable expressions should
likewise flow target-side callable types into the expression evaluator as contextual types. If the app or plugin only
publishes `unknown`, `any`, or index-signature-only surfaces, keep that as typing pressure rather than inventing member
candidates.
Semantic-runtime cursor pressure should preserve that split mechanically: public answers may still report
`expression-member-owner-type:*` missing inputs so LSP callers can explain weak owner surfaces, while aggregate pressure
should bucket candidate-less expression-member sites as `weak-type:*`. Rows only become product gaps again when a
concrete typed member was dropped by scope construction, expression evaluation, or TypeChecker projection.
Cursor-shaped authoring APIs should share the same selection substrate. `TemplateCompletions` and `TemplateCursorInfo`
both reselect resources by authored HTML spans and both compare against the lower-level cursor adapter in pressure runs;
future hover, definition, diagnostics, and explanation APIs should build on that cursor-info footing before adding their
own source scans. Cursor-info now exposes a selected bindable row when classification or an active value site resolves
one, which keeps bindable definition/hover pressure on the compiler-world resource substrate instead of a later
attribute-name rescan. Pressure runs should also track source-bearing target coverage for template, HTML node/attribute,
value site, selected definition, selected bindable, and member-owner type rows; that is the LSP pressure signal for
whether hover and definition can be built from existing cursor-info facts. Derived hover targets, navigation targets,
diagnostic signals, and compact LSP envelopes should remain aggregate and source-neutral; they are pressure counters for
feature footing, not a second LSP implementation path.
Diagnostic wording needs a policy split. Aurelia framework errors are grounded in framework source (`ErrorNames`,
`Events`, `createMappedError`, `getMessage`, raw `Error` throws); semantic-runtime authoring diagnostics can also be
useful LSP guidance, but they should not be described as framework errors unless `framework.errors` or direct framework
source supports that claim. If semantic-runtime intentionally understands a web/ECMAScript/Aurelia edge better than the
framework currently does, record that separately as a possible framework improvement instead of silently upgrading the
product warning into framework truth.

Atlas workspace pressure now uses the same shape vocabulary for admitted package topology: `aurelia-app`,
`aurelia-resource-library`, `aurelia-package`, and `non-aurelia`. Keep package admission role as the origin axis
(`aurelia-framework`, `public-plugin`, `external`, etc.) and do not reintroduce framework/plugin pseudo-shapes.
`workspace.architecture` exposes the filter as `aureliaShape`; app-shaped sub-rollups are a scope-selection signal, not
a claim that resource libraries or general Aurelia packages are unimportant. External-root runs also show that Atlas
still needs a cheaper pre-TypeScript admission/boot inventory if future product flows need to decide app-like scope
before opening many package frames in the shared TypeScript Program.

Router href materialization should not guess across host-environment boundaries. Framework `HrefCustomAttribute`
classifies external links from explicit `external` / `data-external` attributes or a concrete string value that parses as
an external URL. If a binding-source value reduces to `process.env`, browser globals, or another host boundary, the
semantic-runtime route-instruction seam is honest until a caller supplies an explicit host-environment value policy.
Router-resource context ownership should be container-shaped, not only route-config-definition-shaped. Framework `load`
and `href` resolve `IContextRouter` / `IRouteContext` through the custom-attribute controller's container chain, and the
root route context also registers a root-context router for app-root descendants. Semantic-runtime should therefore use
modeled controller/container ancestry as the primary route-context source and treat component-definition matching as a
fallback for cases where the container chain has not been modeled deeply enough.

Public-plugin pressure exposed resource factories as a distinct app-building shape: a module can export constants whose
values are classes returned from a local factory, with the resource decorator inside the factory body and the name
supplied by the factory call. The semantic-runtime proof should come from the evaluator and resource substrate, not a
plugin-specific rule: interpret the local factory, preserve boundary values for external package inputs, publish local
class declarations inside the call environment, and let resource recognition read evaluated class bindings with their
captured environment. Atlas plugin/workspace architecture can still count syntax carriers, but semantic-runtime is the
authority for whether factory-produced resource definitions actually materialize.

External table-like plugin pressure exposed a broader Aurelia rule: target-to-source bindable assignments can introduce
runtime-only scope names before later expressions read them. Model that as template scope timing plus binding data-flow
strictness, not as plugin-local template locals. The write expression remains checked against the pre-assignment scope;
later sibling/descendant expressions can see a runtime-only slot, and diagnostics can still distinguish that slot from
a declared TypeChecker member.

### Stable Handles Across Compression

LLM conversations compress and resume. Claims, generated artifacts, source spans, app-world snapshots, dependency
slices, and open seams need stable handles that survive context loss.

### Agent-Navigable Continuations

Continuations should encode meaningful next moves, not generic follow-ups: inspect source, expand dependency radius,
trace invalidation, follow DI materialization, jump from template binding to TypeChecker context, or inspect open seam.

### Trust And Edit Safety

AI codegen needs a fact-level policy surface: source truth, framework-emulated truth, generated projection, cached
truth, heuristic, stale, or open. This determines whether an agent should edit, suggest, verify, or ask.

### MCP Packaging

MCP gives a useful packaging grammar:

- resources: stable readable semantic slices
- tools: schema-typed query/action entrypoints
- prompts: curated workflows
- roots: workspace boundaries
- subscriptions/listChanged: invalidation notification surface
- structuredContent/outputSchema: token-efficient machine-readable answers
- resource links: tool answers that point to expandable context

This suggests the product should expose high-value semantic slices as resources, not only tools.

## Protocol And Tooling Shape

The product should assume that editor and AI integrations consume the same underlying facts through different
surfaces. Fast TypeChecker-backed projection, structured protocol-friendly answers, generated source maps, resource-like
semantic slices, explicit subscriptions, and schema-shaped tool results are architectural pressures, not afterthoughts.

## Obligation Sketch

Use this as a scratch design aid when a real product obligation is already under discussion, not as an audit grid to
fill for its own sake. The goal is to notice repeated primitives while reasoning deeply about one pressure thread; skip
columns that are not alive in the current problem.

| product obligation | user/agent task | framework facts needed | product meaning | authority | cache key | invalidation trigger | MCP surface | open seams |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| navigation/rename | go to source, rename safely | symbol/source/resource/binding facts | provenance and edit safety | source/checker/generated | source snapshot + generated artifact id | file or template change | resource + tool | ambiguous symbol |
| AOT reachability | strip unused work | app/config/DI/resource/route/template facts | reachable semantic graph | evaluator + compiler world | app world + route/template graph | config/resource/template change | resource | dynamic registration |
| template type context | autocomplete/check expression | parser/scope/resource/binding facts | generated checking context | compiler + TypeChecker | template value site + checker epoch | template or TS type change | tool + resource link | unresolved scope |
| DI emulation | resolve construction/materialization | container registration/get/getAll/invoke/find facts | abstract container world | evaluator | module env + registry state | module/config change | resource | dynamic callback |
| AI architecture map | understand app slice | cross-domain facts | multi-resolution context pack | mixed | semantic slice id | any dependency in slice | resource | budgeted expansion |

The ontology should emerge from repeated concrete sketches. If a column keeps needing the same concept, that concept is
a candidate primitive. If a relationship has no product consequence, keep it as framework evidence rather than
promoting it.

## Mirror Direction

Prefer using `auLink` as the product-to-framework bridge before adding a new product-owned vocabulary or substrate
taxonomy. Atlas already has framework lenses for DI, resources, compiler flow, rendering, hydration, lifecycle, and
observation; a deep `auLink` mirror should let agents ask how semantic-runtime classes line up with those framework
semantics and where they intentionally diverge.

The target shape is not a surface list of anchors. It is a mirror graph:

- product class/module/source symbol
- framework declaration or semantic actor
- framework lens rows reachable from that actor
- product obligations that depend on the mirrored framework behavior
- divergence or virtualization notes where semantic-runtime cannot or should not behave exactly like the framework

If that mirror answers the architectural question, do not recreate the same meaning as product vocabulary. Vocabulary
and claim predicates should remain only where the product must emit durable facts with provenance, invalidation, or
protocol meaning of its own.
