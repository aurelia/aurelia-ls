# Aurelia Source Analysis

This folder is the clean-room Aurelia 2 semantic substrate for the language server, public MCP/API surfaces, IDE
features, and future compiler/AOT work. Treat the Aurelia runtime as the semantic ore, not the older compiler code in
this repository. The current work is intentionally architecture-first and horizontal: build durable substrate layers,
then wire producers once the model has enough shape to avoid shims.

The early product surface is MCP/AI plus IDE support. The first valuable experiences are deep template autocomplete,
go-to-definition from markup, reliable rename substrate, app maps, resource visibility, configuration tracing, and DI
explanations. Correctness and explanation quality matter before latency while the architecture is still settling.

## Runtime Grounding

The Aurelia runtime is the semantic source of truth. Product models may be more granular than runtime classes when
tooling needs separate provenance, identity, inquiry, or explanation boundaries, but they should not be less precise
than the runtime semantics. When the runtime has a compact or performance-oriented representation, first ask whether
that shape is intended semantic behavior or an implementation optimization.

Known semantic behavior exceptions should be called out explicitly. Attribute patterns and binding commands are the
current example: runtime stores them through different mechanisms so attribute parsing can be fast, but the intended
application semantics are a configured, app-global, effectively frozen syntax surface. The product model should not
turn that runtime storage split into different DI visibility semantics.

## Layer Map

- `kernel`: hot normalized record store, handles, vocabulary, identities, addresses, claims, evidence, provenance,
  derivation, materialization, open seams, and MCP-aware substrate mapping aids.
- `boot`: workspace/project/source admission. It records why source files are present, but does not interpret
  Aurelia semantics.
- `inquiry`: selectors, loci, answer envelopes, continuations, and consumer policy boundaries above the kernel.
- `evaluation`: ECMAScript-shaped static module, expression, environment, value, and seam substrate.
- `resources`: Aurelia resource recognition, resource definition models, definition contributions, and resource
  provenance before DI admission or template compilation.
- `configuration`: app/world admission and configuration ordering. This is the bridge from evaluated modules into
  registration.
- `registration`: normalized registration admissions before DI world construction spends them into container state.
- `di`: abstract container world construction, registration spending, resolver/resource/factory slots, and lookup
  substrate.
- `template`: compiler world contracts, authored HTML IR, attribute syntax/classification, binding-command execution,
  and lowered instruction IR.
- `expression`: Aurelia expression parser and parser-owned recovery/candidate algebra.

Template parser and compiler producers should be built on these layers, not by reconnecting old runtime-shaped compiler
models.

## Rewrite Targets

Some former scaffold has deliberately been removed rather than kept as noisy ore:

- old global reference/address/provenance helpers
- old template DOM IR and marker models
- old runtime-shaped app/container/DI models

The expression parser remains because it has a coherent contract and useful parser-owned recovery algebra, but it was
also built before the current kernel/MCP feedback loop. Treat it as provisionally retained: later template/compiler
work may keep it, revise it in place, or rewrite it if the authored-template model exposes better boundaries.

## MCP Co-Evolution

`au-mcp` is a tool for building this tool. It should help agents see the product and the Aurelia framework cheaply,
but product semantics still live here. When the MCP starts needing brittle product-specific tables, prefer this order:

1. Strengthen the product model type so TypeScript/tsserver can see the fact directly.
2. If the fact is a source-inventory or projection aid rather than domain semantics, add the smallest product-owned
   contract in `kernel/substrate-contract.ts`.
3. Let the MCP consume and validate that contract, reporting stale, overlapping, or missing mappings explicitly.

`auLink` is deliberately narrower: it is only the framework-symbol bridge between local model classes and Aurelia
runtime/compiler concepts. Do not put product taxonomy, producer roles, or model-surface classification into
`auLink`; those belong in product models or `substrate-contract.ts` when they are truly MCP/source-analysis mapping
aids.

If the MCP cannot cheaply stitch an important product path, prefer strengthening directional product vocabulary,
claims, or substrate-contract metadata before adding MCP-local inference tables. The product should expose enough
typed structure for tsserver-backed lenses to follow paths such as configuration admission, resource or syntax catalog
selection, DI spending, compiler-world construction, and later template lowering.

## Documentation Ownership

This README owns the folder-level rebuild map, product priorities, rewrite-target list, and MCP co-evolution rule.
Folder READMEs own local boundaries, watchpoints, and current shape. `kernel/README.md` owns kernel record-family
rules. `expression/README.md` owns the parser contract, while `expression/INTEGRATION.md` owns temporary handoff
notes. When text starts repeating across files, prefer linking to the owner and keeping only the local consequence.

## Rebuild Discipline

Prefer small, named records over generic values, payloads, or compatibility shims. Keep uncertainty visible through
open seams, provenance, derivation, and inquiry answers instead of flattening it into resolved-looking facts.

Producers should emit kernel records at durable boundaries. Intermediate evaluator, recognizer, and parser machinery
may keep TypeScript nodes or mutable state while it remains current-run machinery, but kernel records and products
should carry handles, domain fields, and provenance instead.

The project is expected to refactor in cycles. When a layer starts forcing table-heavy MCP logic, duplicated
vocabulary, or hidden information loss, pause and improve the substrate before continuing vertically.

## Current Integration Pressure

The current horizontal slice intentionally brings many moving parts into the repo before the full end-to-end producer
chain is finished: configuration admission, registration spending, DI world construction, compiler-world formation,
resource convergence, built-in syntax catalogs, HTML/value-site parsing, binding-command lowering, instruction IR,
and the retained expression parser now all touch the same kernel contracts.

That breadth is useful, but it also exposes the next design pressure: kernel `MaterializedProduct` records are still
durable envelopes, not the rich domain objects themselves. Producer emissions currently carry the rich in-process
objects that later producers consume. This is acceptable for the current hot in-memory workbench, but it is not yet a
complete durable app-map or inquiry hydration story. Do not solve this by adding generic payloads back to products.
When inquiry needs durable expansion of product details, add a typed product catalog/store layer or named
domain-specific records that preserve provenance and vocabulary shape.

The expression parser is also not a finished producer. It remains a provisional parser subsystem with useful grammar,
AST, and parser-owned recovery algebra, but it predates the kernel and has not yet had the same full semantic
re-integration pass as resources, configuration, DI, and template value-site production. Treat it as callable parser
machinery above source text, not as kernel truth by itself. Template/compiler ownership, binding-command preprocessing,
multi-binding splitting, result hydration, and inquiry answer policy must stay outside `expression` unless runtime
semantics prove otherwise.

These are watchpoints, not blockers. The intended loop remains: keep the model close to Aurelia runtime semantics,
let producers pressure the kernel, use MCP lenses to find split-brain or information loss, and refactor horizontally
when the next consumer reveals a better boundary.
