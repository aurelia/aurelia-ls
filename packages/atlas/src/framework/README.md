# Framework Discovery Workbench

This folder is the Aurelia-specific framework discovery workbench for Atlas.

The goal is not to hand-write an Aurelia model from memory. The goal is to let Atlas pay a heavy boot/indexing cost,
then use exact inquiry continuations to uncover the Aurelia framework until queries become cheap enough that the model
can refine itself.

## Direction

Atlas should converge toward a framework index that can answer questions like:

- What happens after `Aurelia.app(...)` and `start()`?
- Which container, registration, resolver, and lookup paths form the DI world?
- Which configuration and plugin registrations change the available runtime world?
- Which compiler paths produce instructions, resources, bindings, and recursive compilation work?
- Which rendering and hydration paths create controllers, views, scopes, and child compilation work?
- Which activation, bind, attach, detach, unbind, and dispose paths are involved?
- Which observer, subscriber, signal, effect, and binding paths set up reactivity?
- Which exact framework facts should pressure a semantic-runtime auLink mirror?

Those questions should become cheap continuations, not ad hoc source reads.

## Convergence Loop

1. Start with seed anchors that are useful, known framework handles.
2. Use `ts.source`, `ts.structure`, `ts.type`, and `bridge.aulink` to inspect exact source and type evidence.
3. Add evaluator readers only when TypeScript evidence stops short of runtime/world-construction meaning.
4. Record unresolved dynamic behavior as open seams instead of filling gaps with naming guesses.
5. Promote discovered routes into boot-time indexes when they become stable and repeatedly useful.
6. Let the improved index expose higher-quality continuations, then repeat.

The shape is intentionally iterative: better anchors make better route reads possible; better route reads reveal better
anchors; better anchors make future product modeling cheaper.

## Artifacts

- [discovery-seeds.ts](discovery-seeds.ts) contains the typed discovery seed contract: semantic domains, framework flows, generic navigation relations,
  provisional seed anchors, and open discovery questions.
- [discovery-index.ts](discovery-index.ts) joins the discovery seeds to the daemon-prewarmed source declaration index so
  framework anchors resolve to exact source candidates at boot. It also derives source-bound flow seed rows and
  first-page call-hierarchy edges for those seeds, expands those edges into exact call-site argument rows, and exposes
  grouped call targets through the discovery lens.
- [json-cache.ts](json-cache.ts) owns the JSON cache used to hydrate expensive derived framework atoms after daemon
  restart. [JSON-CACHE.md](JSON-CACHE.md) records the storage contract, invalidation keys, entity-family inclusion
  policy, trade-offs, and falsifiers.
- [relationships.ts](relationships.ts) defines the shared relationship atom axes: family, relation, mechanism, phase,
  evidence basis, closure, source endpoints, and optional TypeChecker-backed call evidence. Lenses should derive
  corridors from these atoms instead of inventing projection-local graph shapes.
- [di-index.ts](di-index.ts) is the first relationship atom producer. It starts inside the Aurelia kernel DI mechanics,
  discovers exported framework `createInterface` keys across admitted packages, records default provider/alias targets
  when builder callbacks expose them, records TypeChecker-qualified `Registration.*` provider/alias targets across
  admitted packages, and records kernel registration, lookup, resolver, slot, factory, and construction atoms with
  source-backed evidence.
- [../inquiry/runtime/framework-lenses.ts](../inquiry/runtime/framework-lenses.ts) exposes the seeds as the
  `framework.discovery` inquiry lens, including package export surfaces for admitted Aurelia framework packages, and
  the first `framework.rendering` lens for instruction, binding, and observer-adjacent rendering rows.
- [../inquiry/runtime/framework-di-lenses.ts](../inquiry/runtime/framework-di-lenses.ts) exposes the `framework.di`
  lens over the DI relationship atom index.
- [../inquiry/runtime/framework-materialization-lenses.ts](../inquiry/runtime/framework-materialization-lenses.ts)
  exposes first-pass DI provider materialization routes derived from DI relationship atoms, including exact container
  dependency calls observed inside callback providers, dependency policy classes, and graph relationships from keys to
  providers and dependency keys.
- Future files in this folder should own Aurelia-specific semantic indexes over the hot source project, such as DI,
  app/world formation, compiler, rendering, lifecycle, resource, plugin, and reactivity indexes.
- The generic ECMAScript evaluator remains in [../evaluation](../evaluation/README.md). Aurelia-specific meaning belongs
  here, above that evaluator and above the TypeScript source substrate.

## Rules

- Do not make route rows fuzzy. Every indexed row should have source, TypeChecker, evaluator, or explicit human basis.
- Prefer exact source selectors and auLink target continuations over direct source reading.
- Treat seed anchors as starting handles, not authoritative taxonomy.
- Keep relationship axes separate. A relation is not a mechanism, a phase is not a relation, and evidence basis is not
  confidence. If a projection wants to merge those dimensions, derive that view from atoms.
- Keep old compensation layers small. Product vocabulary and kernel substrate contracts should shrink when framework
  semantics can carry the relationship more honestly.
- Make expensive discovery explicit at daemon boot when it makes query-time reads cheap and repeatable.

## Axes

The scaffold keeps three related ideas separate:

- semantic domains: application, DI, configuration, resource, compiler, instruction, rendering, lifecycle, binding,
  scope, reactivity, routing, platform, bridge, and error policy
- framework flows: startup, world formation, registration, lookup, plugin configuration, resource definition/lookup,
  compilation, instruction emission/consumption, hydration, rendering, activation, lifecycle propagation, binding,
  scope propagation, reactivity setup, and mirror pressure
- navigation relations: generic inquiry hops such as source-for, type-facts-for, references-of, call-hierarchy-of,
  mirror-target-of, framework-flow-of, and seam-for

The names will change as Atlas learns the framework. The important part is that generic source/type inspection remains
separate from Aurelia behavior. A framework route row should be able to say "this is DI registration evidence" without
pretending that "inspect source" is itself a DI flow.

## First Heavy Index Target

The first durable boot-time framework index should probably start from the already indexed TypeScript and auLink facts:

1. Source-only top-level framework declarations by package and symbol. The first pass is now represented by
   `discovery-index.ts`.
2. Source-bound framework flow seed rows derived from each resolved seed anchor.
3. Calls and constructors reachable from `runtime-html:Aurelia`, `aurelia:Aurelia`, `kernel:Container`,
   `template-compiler:TemplateCompiler`, `runtime-html:Controller`, and `runtime-html:AppRoot`.
4. Exact call-site argument rows expanded from grouped call-hierarchy spans, so DI/configuration/resource admissions can
   be grounded in actual argument values before any semantic classification is added.
5. Grouped call targets by flow, direction, package, and callee name, so interesting targets can be discovered before
   they are classified as DI, compiler, rendering, lifecycle, or reactivity facts.
6. auLink target rows joined to framework declarations.
7. Static evaluator facts for known pure registration/configuration helpers.
8. Open seams for dynamic calls, runtime DOM state, user component code, and branch-dependent lifecycle paths.

That is enough to begin turning framework discovery from source inspection into indexed continuations.
