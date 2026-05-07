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
- template-controller virtualization seams
- TypeChecker-backed reactivity and expression surfaces

## AI And MCP Pressures

Large-scale codebase management for LLMs adds obligations that classic IDE/compiler tooling does not fully cover.
Atlas is the current mapping and inquiry surface for this repo; MCP language in this document is packaging grammar and
integration pressure, not a reason to revive au-mcp-style source mapping as an authority.

### Context Economics

Answers must be multi-resolution: summary first, rows next, evidence/source only on demand. The product should
make it cheap for an agent to decide whether to drill down.

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

## Obligation Matrix Template

Use this to derive candidate ontology primitives:

| product obligation | user/agent task | framework facts needed | product meaning | authority | cache key | invalidation trigger | MCP surface | open seams |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| navigation/rename | go to source, rename safely | symbol/source/resource/binding facts | provenance and edit safety | source/checker/generated | source snapshot + generated artifact id | file or template change | resource + tool | ambiguous symbol |
| AOT reachability | strip unused work | app/config/DI/resource/route/template facts | reachable semantic graph | evaluator + compiler world | app world + route/template graph | config/resource/template change | resource | dynamic registration |
| template type context | autocomplete/check expression | parser/scope/resource/binding facts | generated checking context | compiler + TypeChecker | template value site + checker epoch | template or TS type change | tool + resource link | unresolved scope |
| DI emulation | resolve construction/materialization | container registration/get/getAll/invoke/find facts | abstract container world | evaluator | module env + registry state | module/config change | resource | dynamic callback |
| AI architecture map | understand app slice | cross-domain facts | multi-resolution context pack | mixed | semantic slice id | any dependency in slice | resource | budgeted expansion |

The ontology should emerge from filling this table repeatedly. If a column keeps needing the same concept, that concept
is a candidate primitive. If a relationship has no product consequence, keep it as framework evidence rather
than promoting it.

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
