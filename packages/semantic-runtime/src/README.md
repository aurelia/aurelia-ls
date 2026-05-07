# Aurelia Semantic Runtime

This source tree is the Aurelia 2 semantic substrate for the language server, Atlas, IDE features, and future compiler or analysis work. Treat the Aurelia runtime as the semantic source of truth, and treat this package as the product model that makes that truth queryable.

The package is intentionally architecture-first. Build durable substrate layers, then wire recognizers, materializers, and runtime emulators around those layers once the model has enough shape to avoid shims.

## Product Priorities

Highest-value experiences include deep template autocomplete, go-to-definition from markup, reliable rename substrate, app maps, resource visibility, configuration tracing, DI explanations, and AI-assisted app authoring that can verify what it writes.

Correctness and explanation quality matter before latency while the architecture is still settling. False positives are more expensive than explicit open seams.

## Runtime Grounding

Aurelia runtime behavior is the grounding authority. Product models may be more granular than runtime classes when tooling needs separate provenance, identity, inquiry, or explanation boundaries, but they should not be less precise than runtime semantics.

Known semantic behavior exceptions should be called out directly. Attribute patterns and binding commands are the current example: runtime stores them through different mechanisms so attribute parsing can be fast, but the intended application semantics are a configured, app-global, effectively frozen syntax surface.

Keep the runtime-emulation split visible. Module evaluation, configuration admission, registration spending, DI world construction, compiler-world formation, HTML and attribute parsing, instruction lowering, and compiled-template assembly can mostly follow evaluation-shaped Aurelia runtime construction. Activation-dependent answers cross into TypeChecker-backed speculative projection with explicit products, claims, provenance, and open seams.

## Layer Map

- `kernel`: hot normalized record store, handles, vocabulary, identities, addresses, claims, evidence, provenance, materialization, open seams, and auLink anchors.
- `boot`: workspace, project, and source admission before Aurelia semantics are interpreted.
- `application`: framework-normal app topology shared by analysis and authoring.
- `authoring`: intent, capability, operation, plan, and verification contracts for AI-assisted app creation.
- `inquiry`: selectors, loci, answer envelopes, projection lanes, continuations, and consumer policy boundaries above the kernel.
- `evaluation`: ECMAScript-shaped static module, expression, environment, value, and seam substrate.
- `type-system`: TypeChecker projection substrate for synthetic expression and template-local member surfaces.
- `observation`: TypeChecker-backed ObserverLocator lookup, observer/accessor value channels, and source/target data
  flow.
- `resources`: resource recognition, resource definition models, definition contributions, and resource provenance before DI admission or template compilation.
- `configuration`: app/world admission and configuration ordering between evaluated modules and registration.
- `registration`: normalized registration admissions before DI world construction spends them into container state.
- `di`: abstract container world construction, registration spending, resolver/resource/factory slots, and lookup substrate.
- `template`: compiler world contracts, authored HTML IR, attribute syntax/classification, binding-command execution, and lowered instruction IR.
- `expression`: Aurelia expression parser and parser-owned recovery/candidate algebra.
- `router`: router configuration, route config, route context, viewport instruction, and router-owned resource model anchors.
- `api`: in-process app-opening and query facade over the product substrate.

Template parser and compiler materializers should be built on these layers, not by reconnecting older runtime-shaped compiler models.

## Atlas And auLink

Atlas is the live orientation and inspection layer over this package. `auLink` is deliberately narrower: it is only the framework-symbol bridge between local model classes and Aurelia runtime/compiler concepts.

Do not put product taxonomy, pass roles, or model-surface classification into `auLink`; those belong in product models, vocabulary, claims, or Atlas source lenses when they are real obligations rather than bridge metadata.

When Atlas cannot cheaply stitch an important product path, prefer strengthening directional vocabulary, claims, or the underlying semantic records before adding tool-local inference tables. The product should expose enough typed structure for TypeScript-backed lenses to follow paths such as configuration admission, resource or syntax catalog selection, DI spending, compiler-world construction, and template lowering.

## Documentation Ownership

This README owns the folder-level map, product priorities, and Atlas/auLink rule. Folder READMEs own local boundaries, watchpoints, and current shape. [kernel/README.md](./kernel/README.md) owns kernel record-family rules. [application/README.md](./application/README.md) owns app topology. [authoring/README.md](./authoring/README.md) owns the semantic authoring loop, [authoring/ONTOLOGY.md](./authoring/ONTOLOGY.md) owns operation taxonomy orientation, and [authoring/CAPABILITY_CHECKLIST.md](./authoring/CAPABILITY_CHECKLIST.md) owns the flexible authoring scope map. [api/README.md](./api/README.md) owns the operational API boundary. [observation/README.md](./observation/README.md) owns observer-locator, value-channel, and binding data-flow emulation boundaries. [expression/README.md](./expression/README.md) owns the parser contract, while [expression/INTEGRATION.md](./expression/INTEGRATION.md) owns parser/compiler handoff notes. [WORKBENCH.md](./WORKBENCH.md) owns recent context that is useful while this substrate is still settling, and [WORKBENCH-controller-binding-lifecycle.md](./WORKBENCH-controller-binding-lifecycle.md) owns the current controller, binding, target-operation, and recursive hydration pressure note.

When text starts repeating across files, prefer linking to the owner and keeping only the local consequence.

## Rebuild Discipline

Prefer small, named records over generic values, payloads, or compatibility shims. Keep uncertainty visible through open seams, provenance, claims, and inquiry answers instead of flattening it into resolved-looking facts.

Materializers should emit kernel records at durable boundaries. Intermediate evaluator, type-system, recognizer, and parser machinery may keep TypeScript nodes, checker objects, or mutable state while it remains current-run machinery, but kernel records and durable products should carry handles, domain fields, and provenance instead.

The project is expected to refactor in cycles. When a layer starts forcing table-heavy tool logic, duplicated vocabulary, or hidden information loss, pause and improve the substrate before continuing vertically.
