# Aurelia Source Analysis

This folder is the clean-room Aurelia 2 semantic substrate for the language server, public MCP/API surfaces, IDE
features, and future compiler/AOT work. Treat the Aurelia runtime as the semantic ore, not the older compiler code in
this repository. The current work is intentionally architecture-first and horizontal: build durable substrate layers,
then wire producers once the model has enough shape to avoid shims.

The early product surface is MCP/AI plus IDE support. The first valuable experiences are deep template autocomplete,
go-to-definition from markup, reliable rename substrate, app maps, resource visibility, configuration tracing, and DI
explanations. Correctness and explanation quality matter before latency while the architecture is still settling.

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
