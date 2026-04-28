# Resource Recognition

See [../README.md](../README.md) for the folder-wide rebuild map and MCP co-evolution rule.

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
template/compiler lowering. Recognition observations pair a source carrier with a definition header. Headers are
carrier-level summaries: kind, target, public name, aliases, or syntax patterns. A header does not mean the resource
is available in a container, visible to a template, merged with inherited metadata, or lowered into rendering
instructions.

Definition models sit beyond headers. Recognition observations are the AST-bearing layer; definition models use
kernel handles, scalar fields, entry-level source handles, and field provenance rather than retaining TypeScript
nodes. `BindableDefinition` and `WatchDefinition` mirror runtime metadata records. Definition contribution records
capture typed field contributions from headers, definition objects, static properties, annotations, metadata, syntax
factories, and conventions.
`CustomElementDefinition`, `CustomAttributeDefinition`, `ValueConverterDefinition`, `BindingBehaviorDefinition`,
`BindingCommandDefinition`, and `AttributePatternDefinition` are reserved for fully formed metadata definitions before
DI admission or template compilation. Template controllers currently converge through the custom-attribute shape with
`isTemplateController: true`, while retaining a distinct resource identity and query projection. Convergence is the
operation that turns contributions into full definitions; it should be recorded through materialization/provenance
rather than being baked into the product name.

Recognizer classes stay kernel-free. The kernel boundary is the emitter: each observation records direct evidence
and provenance, each closed definition header becomes a `resource.definition-header` product, and each observation gets
a materialization record that points at produced products, declaration claims, and open seams. That keeps recognition
cheap to evolve while still giving inquiry a durable graph.

Open seams are part of the product here. A carrier with an open kind, name, alias, pattern, or target should still
produce kernel pressure rather than disappearing or pretending to be complete.

Watchpoints:

- Binding commands are name-addressable syntax resources and still fit ordinary resource identities. Attribute
  patterns are parser-pattern resources and use a dedicated identity that keeps both `pattern` and `symbols`.
  `AttributePatternDefinitionEntry` mirrors the framework pattern record, while `AttributePatternDefinition` models
  the registered target plus its pattern entries.
- `auLink` belongs on definition models rather than stateless producer classes or recognition headers.
- Contribution envelopes are provisional. They intentionally keep convergence policy out of recognition, but should
  be tightened once real convergence producers reveal whether fields want per-origin variants, per-field patches, or
  another shape.
- Resource vocabulary uses explicit kernel slots for claim predicates, seam kinds, and product kinds. Keep new
  entries small and source-grounded; if a name starts representing answer policy, ranking, or consumer usefulness, it
  belongs in inquiry rather than resource vocabulary.
- Resource open seams carry product-owned `KernelVocabulary.Resource.*` seam keys directly. Do not add a second local
  open-kind enum unless a future producer needs a genuinely different, non-durable taxonomy.
- Product-level provenance is in place and definition models now expose field-level provenance slots. Convergence
  producers must populate those slots when a field's source matters for rename, refactor, explanation, or ambiguity
  handling instead of flattening everything to the carrier observation.
