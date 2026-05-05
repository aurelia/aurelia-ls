# Resource Recognition

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

This folder is an Aurelia-semantic materialization layer over boot, kernel, inquiry, and static evaluation.

It recognizes source carriers that the Aurelia runtime turns into resources:

- decorators such as `@customElement(...)`
- static `$au` definitions on classes
- imperative `.define(...)` calls on resource definition kinds
- `AttributePattern.create(...)` syntax-resource carriers

The source-level pass expects an evaluated module environment. The project-level pass starts from boot admissions and
uses the shared `evaluation` project pass before running the same recognizers over each admitted TS/JS
module. Recognition should not grow its own import resolver.
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
`BindingCommandDefinition`, and `AttributePatternDefinition` are fully formed metadata definitions before DI admission
or template compilation. Template controllers currently converge through the custom-attribute shape with
`isTemplateController: true`, while retaining a distinct resource identity and query projection. Convergence is the
operation that turns headers and source metadata into full definitions; it is recorded through
materialization/provenance rather than being baked into the product name.

Framework-owned built-ins enter the resource layer as resource headers. `built-in-resources.ts` records the runtime-html,
i18n, and state default resource catalogs as concrete, runtime-linked model classes so compiler worlds can see
built-in template controllers, custom attributes/elements, value converters, and binding behaviors without pretending
they came from user source. The built-in catalog materializer now also emits full definition products for built-ins whose
runtime metadata is static enough to model directly. That convergence pressure comes from template compilation:
headers remain admission/lookup facts, while full definitions carry bindables and compiler-consumable metadata.

Recognizer classes stay kernel-free. The kernel boundary is the emitter: each observation records direct evidence
and provenance, each closed definition header becomes a `resource.definition-header` product, and each observation gets
a materialization record that points at produced products, declaration claims, and open seams. That keeps recognition
cheap to evolve while still giving inquiry a durable graph.

Emitter results return typed definition-header handles for downstream materializers. The converger consumes
those handles plus the AST-bearing observations and emits `resource.definition` products with field provenance and
`resource.converges-to-definition` claims. The convergence path closes runtime defaults, resource keys,
aliases, simple static bindables, `@bindable` metadata, template-controller flags, capture/template shape, and thin
resource definitions. Bindable definitions preserve the source address for the metadata entry or
member declaration that produced them, because template attribute completion, go-to-definition, and later rename support
need that narrower origin instead of only the owning resource definition. It records open seams for explicit metadata
that is visible but not safely materialized yet, including dependencies, pre-lowered instructions, surrogates, and
watches.

`product-details.ts` declares the typed detail slots that hydrate resource definition headers, built-in catalogs,
configured catalog selections, and full definitions from product handles. This keeps resource inquiry and tooling
expansion from treating headers, definitions, or framework catalogs as generic payloads while still letting materializers
consume rich current-run metadata.

Open seams are part of the product here. A carrier with an open kind, name, alias, pattern, or target should still
produce kernel pressure rather than disappearing or pretending to be complete.

Watchpoints:

- Binding commands are name-addressable syntax resources and still fit ordinary resource identities. Attribute
  patterns are parser-pattern resources and use a dedicated identity that keeps both `pattern` and `symbols`.
  `AttributePatternDefinitionEntry` mirrors the framework pattern record, while `AttributePatternDefinition` models
  the registered target plus its pattern entries.
- `auLink` belongs on definition models rather than stateless recognizer classes or recognition headers.
- Contribution envelopes are provisional. They intentionally keep convergence policy out of recognition, but should
  be tightened once real convergers reveal whether fields want per-origin variants, per-field patches, or
  another shape.
- Resource vocabulary uses explicit kernel slots for claim predicates, seam kinds, and product kinds. Keep new
  entries small and source-grounded; if a name starts representing answer policy, ranking, or consumer usefulness, it
  belongs in inquiry rather than resource vocabulary.
- Built-in resource catalogs and userland recognition now both have a route to full definitions. Do not let consumers
  infer metadata directly from headers; compiler-world visibility should prefer full definitions when convergence
  produced them and treat header-only rows as visibly incomplete.
- Resource open seams carry product-owned `KernelVocabulary.Resource.*` seam keys directly. Do not add a second local
  open-kind enum unless a future materializer needs a genuinely different, non-durable taxonomy.
- Product-level provenance is in place and definition models now expose field-level provenance slots. Convergence
  materializers must populate those slots when a field's source matters for rename, refactor, explanation, or ambiguity
  handling instead of flattening everything to the carrier observation.
