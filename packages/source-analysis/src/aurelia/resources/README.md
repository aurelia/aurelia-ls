# Resource Recognition

This folder is the first fresh Aurelia-semantic producer layer over boot, kernel, inquiry, and static evaluation.

It recognizes source carriers that the Aurelia runtime turns into resources:

- decorators such as `@customElement(...)`
- static `$au` definitions on classes
- imperative `.define(...)` calls on resource definition kinds
- `AttributePattern.create(...)` syntax-resource carriers

The source-level pass expects an evaluated module environment. The project-level pass starts from boot admissions,
builds the local ECMAScript module graph, evaluates linked imports/exports through `evaluation`, and then runs the
same recognition producers over each admitted TS/JS module. Recognition should not grow its own import resolver.
Generic expression and value reads belong in `evaluation`; resource field readers should only interpret Aurelia
definition fields such as `type`, `name`, `aliases`, `pattern`, and `symbols`.

The output is deliberately before scope admission, DI/configuration reachability, inherited metadata merging, and
template/compiler lowering. Recognition observations pair a source carrier with a recognized definition payload.
Those definition payloads are the local model surface linked to Aurelia runtime definition concepts; producers are
only orchestration. A recognized definition does not mean the resource is available in a container, visible to a
template, merged with inherited metadata, or lowered into rendering instructions.

Recognizer classes stay kernel-free. The kernel boundary is the emitter: each observation records direct evidence
and provenance, each closed definition becomes a `resource.recognized-definition` product, and each observation gets
a materialization record that points at produced products, declaration claims, and open seams. That keeps recognition
cheap to evolve while still giving inquiry a durable graph.

Open seams are part of the product here. A carrier with an open kind, name, alias, pattern, or target should still
produce kernel pressure rather than disappearing or pretending to be complete.

Watchpoints:

- Binding commands are name-addressable syntax resources and still fit ordinary resource identities. Attribute
  patterns are parser-pattern resources and use a dedicated identity that keeps both `pattern` and `symbols`.
- `auLink` belongs on recognized definition models rather than stateless producer classes. If a producer needs a
  link later, it should describe a different relationship than runtime-definition modeling.
- Resource vocabulary currently carries both claim predicates and seam kinds. Keep new entries small until real
  producers make a split unavoidable.
- Product-level provenance is in place. Field-level provenance for individual definition properties is still a
  pressure point; add it when a producer needs to distinguish, for example, a target witness from a name or alias
  witness instead of flattening everything to the carrier observation.
