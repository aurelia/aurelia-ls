# Framework Substrates

This folder owns Aurelia-specific framework facts over the shared Atlas source and evaluator substrates.

The boundary is: TypeScript source/checker facts come from [../source](../source/README.md), generic ECMAScript
evaluation comes from [../evaluation](../evaluation/README.md), and Aurelia meaning lives here. Runtime lenses spend
these substrates into inquiry answers; they should not recreate framework taxonomy locally.

## Responsibilities

- Resolve framework package imports to Aurelia `src/` modules, not generated declaration files.
- Keep seed handles and catalog entrypoints for framework packages, exports, resources, DI keys, and high-salience actors.
- Build relationship atoms for DI, admission, materialization, lifecycle, rendering, observation, and compiler routes.
- Spend evaluated configuration and registry values into world-formation, DI, resource, renderer, AppTask, and catalog
  facts without treating admission as container execution.
- Preserve resource definition, resource instance lifetime, variable-carried DI keys, and TypeChecker handoff boundaries
  as named framework facts instead of flattening them into local projection strings.
- Provide compact, source-backed rows that runtime lenses can turn into continuations, not hand-maintained diagrams.

## Core Files

- [module-boot.ts](module-boot.ts) resolves and evaluates linked Aurelia framework modules from source.
- [discovery-seeds.ts](discovery-seeds.ts) and [discovery-index.ts](discovery-index.ts) provide orientation seeds,
  anchor resolution, package export rows, and first-hop flow rows. Seeds are starting handles, not ontology.
- [relationships.ts](relationships.ts) defines shared relationship axes: family, relation, mechanism, phase, evidence
  basis, closure, endpoint kind, and source endpoints.
- [di-index.ts](di-index.ts) discovers DI keys, registration/provider/alias targets, lookup/materialization mechanics,
  resolver slots, and source-backed DI relationship atoms.
- [di-world.ts](di-world.ts) spends booted configuration and registry values into an abstract container world, including
  resolver/resource slots, provider dependency reads, and variable-carried key reads.
- [materialization.ts](materialization.ts) names DI provider route/runtime-existence interpretation and provider
  identity. Resource runtime policy stays in [resources.ts](resources.ts).
- [admission.ts](admission.ts) and [admission-world.ts](admission-world.ts) own configuration/bundle admission axes,
  materialization joins, world-formation rows, and admission-only boundary interpretation.
- [resources.ts](resources.ts) owns framework resource definition kinds, resource instantiation kinds, and resource
  runtime lifetime policy.
- [syntax.ts](syntax.ts) owns syntax producer/product axes shared by compiler, rendering, resources, and materialization.
- [lifecycle.ts](lifecycle.ts) owns lifecycle participant, controller-call, AppTask execution, and hook-dispatch axes.
- [api-usage.ts](api-usage.ts) builds the Aurelia API usage index over the shared TypeScript semantic surface.

## Runtime Lenses

The public inquiry lenses live under [../inquiry/runtime](../inquiry/runtime/README.md). They should treat framework
files as substrates:

- `framework.discovery` exposes seed/package/resource/bundle/entity catalogs.
- `framework.api` exposes API subjects, implementation shapes, member slots, usage sites, and usage owner groups.
- `framework.di` exposes DI keys, facts, registrations, providers, lookups, materializations, graph, world, slots,
  dependencies, DAG, and evidence.
- `framework.admission` exposes bundle/configuration admission, materialization/world-formation joins, and graph flow
  corridors such as the JIT compiler slice.
- `framework.resources` converges resource evidence lanes without claiming final template/container visibility.
- `framework.compiler` owns instruction production and TemplateCompiler compile-flow/attribute-classification views.
- `framework.rendering` owns instruction dispatch, hydration flow, render consequences, controller creation, binding
  products/admissions/effects, and observation-adjacent setup.
- `framework.lifecycle` owns controller, binding, resource, AppTask, and hook lifecycle rows.
- `framework.observation` owns observer/reactivity entity rows, binding lookup/setup, observer-locator internals, and
  observation relationships.
- `framework.composition` composes high-salience actors and relationship rows into signed claims and semantic-runtime
  emulation obligations.

## Rules

- Prefer exact source, checker, evaluator, or explicit human basis over name ranking.
- Keep relation, mechanism, phase, endpoint kind, evidence basis, closure, and runtime policy separate.
- Keep configuration admission separate from DI resolver ownership and runtime materialization.
- Keep resource catalog lookup (`find`) separate from construction/materialization (`get`, `getAll`, `invoke`,
  `resolve`).
- Keep source-backed variable carriers such as `def.Type` or `handlerInfo.type` visible without promoting their local
  variable names into DI keys.
- Add shared axes in this folder when more than one framework lens needs them; keep lens-only formatting and answer
  shaping in runtime modules.
- Profile before adding cache or warmup machinery. Prefer source-epoch memos and stable indexed atoms over persisted
  projection caches.

## Workbench

[WORKBENCH.md](WORKBENCH.md) is the live framework ledger. Keep only active directional context, durable design
decisions, and evidence-backed loose ends there. When adding a workbench item, include the code file, API projection, or
report that should be inspected before future agents treat the note as current truth.
