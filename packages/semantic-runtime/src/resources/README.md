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
module. Recognition should not grow its own import resolver. When static evaluation links additional local source
modules or assets, the project-level pass threads those linked admissions back into resource recognition so imported
HTML templates can keep precise template-file provenance instead of falling back to the component TypeScript span.
`ResourceRecognitionContextIndex` keeps source-local contexts for those graph-linked modules. Cross-module source nodes,
especially inherited bindable metadata, must be interpreted through the context that owns the node's source file so
imported decorator arguments and exact source spans use the right evaluator environment.
Generic expression and value reads belong in `evaluation`; resource field readers should only interpret Aurelia
definition fields such as `type`, `name`, `aliases`, `pattern`, and `symbols`.

Some resource carriers are produced by evaluated factory calls rather than direct module-level class syntax. For
example, a package can export several constants whose initializers call a factory that declares and returns a decorated
class with a resource name supplied by a function parameter. Resource recognition has an evaluated-class-binding lane
for those cases: the source-level class pass does not claim nested factory-local classes as standalone resources, while
the evaluated binding pass reads the returned class value with its captured evaluator environment and uses the exported
binding as the public target. This keeps factory resources visible without inventing plugin-specific recognition rules.

The output is deliberately before scope admission, DI/configuration reachability, inherited metadata merging, and
template/compiler lowering. Recognition observations pair a source carrier with a definition header. Headers are
carrier-level summaries: kind, target, public name, aliases, or syntax patterns. A header does not mean the resource
is available in a container, visible to a template, merged with inherited metadata, or lowered into rendering
instructions. Decorators, static `$au`, and imperative `.define(...)` calls keep separate carrier observations, but
they share the same named-definition field reader for `name`, `aliases`, header creation, and carrier-owned open seams.
Do not reintroduce carrier-local name/alias parsing unless a framework carrier genuinely diverges from the shared
runtime definition shape.

Definition models sit beyond headers. Recognition observations are the AST-bearing layer; definition models use
kernel handles, scalar fields, entry-level source handles, and field provenance rather than retaining TypeScript
nodes. `BindableDefinition` and `WatchDefinition` mirror runtime metadata records. Definition contribution records
capture typed field contributions from headers, definition objects, static properties, annotations, metadata, syntax
factories, and conventions.
Convergence preserves the carrier mechanism in those contributions: decorator carriers become annotation
contributions, static `$au` carriers become type-static-property contributions, define/object carriers become
definition-object contributions, `AttributePattern.create(...)` carriers become create-call contributions, and current
convention carriers stay convention contributions. Do not collapse these back into generic headers; authoring
orientation and resource queries need the distinction.
`CustomElementDefinition`, `CustomAttributeDefinition`, `ValueConverterDefinition`, `BindingBehaviorDefinition`,
`BindingCommandDefinition`, and `AttributePatternDefinition` are fully formed metadata definitions before DI admission
or template compilation. Template controllers currently converge through the custom-attribute shape with
`isTemplateController: true`, while retaining a distinct resource identity and query projection. Convergence is the
operation that turns headers and source metadata into full definitions; it is recorded through
materialization/provenance rather than being baked into the product name.

Framework-owned built-ins enter the resource layer as resource headers. `built-in-resources.ts` records the runtime-html,
i18n, state, router, and validation-html default resource catalogs as concrete, runtime-linked model classes so compiler worlds can see
built-in template controllers, custom attributes/elements, value converters, and binding behaviors without pretending
they came from user source. The built-in catalog materializer also emits full definition products for built-ins whose
runtime metadata is static enough to model directly. That convergence pressure comes from template compilation:
headers remain admission/lookup facts, while full definitions carry bindables and compiler-consumable metadata.
`built-in-resource-catalog-materializer.ts` owns catalog grouping, catalog products, source records, configured catalog
selections, and the per-resource publication handoff. Its per-resource publisher owns individual header/full-definition
products, declaration/alias/convergence claims, and resource materialization records.
`built-in-resource-definition-materializer.ts` owns framework full-definition construction, including built-in bindable
metadata and resource-definition constructors. Keep those boundaries intact so catalog admission does not absorb
per-resource claim publication or the whole framework metadata model again.
When a current TypeScript program is available, built-in full definitions also project their framework target class
through the app's checker by resolving the owning Aurelia package export. This keeps controller, observer, and
data-flow rows tied to the same type universe as user source. Explicit internal source fallbacks should stay rare and
documented; the current examples are runtime-html `Show` and `AuSlot`, which are registered in framework resource
catalogs but are not reliably exported as value targets from the package entrypoint used by the current checker epoch.
Validation-html catalog admission currently models the default `validate` binding behavior, `validation-errors` custom
attribute, and `validation-container` custom element. Configuration options that disable subscriber resources or replace
the container template are a later customization frontier; default catalog admission should stay visibly grounded in
`ValidationHtmlConfiguration` rather than a local app heuristic.

Recognizer classes stay kernel-free. The kernel boundary is the emitter: each observation records direct evidence
and provenance, each closed definition header becomes a `resource.definition-header` product, and each observation gets
a materialization record that points at produced products, declaration claims, and open seams. That keeps recognition
cheap to evolve while still giving inquiry a durable graph.
`resource-recognition-kernel-emitter.ts` owns observation framing, source records, header products, materialization
records, product-detail registration, and the batch commit. `resource-recognition-publication.ts` owns target/source
identity handoff, TypeChecker-backed target type projection, resource identities, aliases, attribute-pattern identities,
and recognition open-seam publication. Keep those support records out of carrier recognition and convergence so headers
remain the narrow bridge between AST observations and full definition models.

Emitter results return typed definition-header handles for downstream materializers. The converger consumes
those handles plus the AST-bearing observations and emits `resource.definition` products with field provenance and
`resource.converges-to-definition` claims. The convergence path closes runtime defaults, resource keys,
aliases, simple static bindables, inherited bindable metadata, template-controller flags, capture/template shape, and
thin resource definitions. Bindable convergence mirrors the framework's `Bindable.getAll(Type)` rule: decorator
metadata walks the class prototype chain from base to derived, while `Type.bindables` behaves like a static property
lookup and therefore uses the nearest static `bindables` member in the constructor chain. Other resource fields should
not inherit unless the framework source shows the same exception. Inherited bindable decorators and inherited static
`bindables` entries must use the source-local recognition context for the class or member that declared them, not the
subclass context currently being converged. Bindable definitions preserve the source address for the metadata entry or
member declaration that produced them, because template attribute completion, go-to-definition, and later rename support
need that narrower origin instead of only the owning resource definition. Member `@bindable(...)` still contributes the
property as bindable when its optional config object stays open; checker-visible `set` properties become open setter
metadata, and the unresolved config fields remain visible as seams instead of erasing the bindable. Dependency
convergence first trusts evaluator-closed class/function values, then uses the TypeChecker as a fallback for identifier
dependencies that are checker-visible constructable/callable values. Watch convergence now closes class/method
`@watch(...)` decorators, static `watches`, and definition-object `watches` when their expression, callback, and flush
metadata reduce to static runtime metadata. Runtime watcher/controller execution is still observation/lifecycle work;
definition convergence should only model the metadata Aurelia stores on resource definitions.

Known resource-metadata failures are products too. `ResourceIssue` rows are for cases where the framework source shows
an exact error path and static convergence or registration spending can prove it. Resource convergence currently owns malformed bindable
decorator metadata (`AUR0227`, `AUR0228`, `AUR0229`), malformed `@processContent(...)` hooks (`AUR0766`),
invalid `@children(...)` query selectors (`AUR9989`), non-field `@slotted(...)` usage (`AUR9990`),
`@watch(null, ...)` (`AUR0772`), invalid class-level watch callbacks (`AUR0773`), method-decorator misuse
(`AUR0774`), and controller watcher callback lookup failure (`AUR0506`). The sibling
`children_decorator_invalid_usage` code is dormant in current framework source and remains unclaimed. It also claims the definition-side cause of
`controller_no_shadow_on_containerless` (`AUR0501`) when a custom element is statically both containerless and
shadow/slot-backed; the framework throws during controller hydration, but the author-owned cause is the resource
definition. Keep these as resource issue products with exact framework-code authority rather than open seams or
API-local diagnostics. DI registration spending also publishes resource issues for runtime-html duplicate resource
definition registration warnings: custom elements (`AUR0153`), custom attributes (`AUR0154`), value converters
(`AUR0155`), and binding behaviors (`AUR0156`). Those are resource-registration warnings, not kernel
`resource_already_exists` (`AUR0007`) DI issues; the kernel path is reserved for static `$au` resource registration and
resolver publication conflicts. Direct runtime-html resource API calls are a third resource issue lane:
`CustomElementDefinition.create(...)` with only a string name maps to `element_only_name` (`AUR0761`), and
project-local `getDefinition(...)` calls on classes with no matching recognized resource definition map to
`element_def_not_found` (`AUR0760`), `attribute_def_not_found` (`AUR0759`), `value_converter_def_not_found`
(`AUR0152`), or `binding_behavior_def_not_found` (`AUR0151`). By contrast, metadata that is visible but not safely
materialized yet remains an open seam, including dependencies, pre-lowered instructions, surrogates, and watcher values
whose expression/callback/flush shape does not close statically.

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
