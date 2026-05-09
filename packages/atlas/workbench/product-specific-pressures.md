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
source-role counts, likely-entrypoint filename signals, manifest dependency counts for `aurelia` / `@aurelia/*`, and
source-level Aurelia facade signals from parsed imports, default imports, namespace imports, constructor calls,
`.register(...)`, `.app(...)`, and `.enhance(...)`. Atlas should keep improving the corresponding workspace/package projections so
future agents can pick scope from architecture evidence instead of discovering the cost only after
TypeChecker/static-evaluation work has already run. Shape-filtered app pressure via `SEMANTIC_RUNTIME_PROJECT_SHAPES`
is the current manual lane for validating that distinction. The nested TypeSystem profile shows whether the remaining
cost is TS program creation, checker creation, project-option discovery, or source indexing.
Semantic-runtime app pressure should default to generalized detail for proprietary roots. Source-assignment strictness
and open-seam reason buckets are durable pressure; raw row wording is local debugging material unless it has been
manually abstracted.

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

Public-plugin pressure exposed resource factories as a distinct app-building shape: a module can export constants whose
values are classes returned from a local factory, with the resource decorator inside the factory body and the name
supplied by the factory call. The semantic-runtime proof should come from the evaluator and resource substrate, not a
plugin-specific rule: interpret the local factory, preserve boundary values for external package inputs, publish local
class declarations inside the call environment, and let resource recognition read evaluated class bindings with their
captured environment. Atlas plugin/workspace architecture can still count syntax carriers, but semantic-runtime is the
authority for whether factory-produced resource definitions actually materialize.

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
