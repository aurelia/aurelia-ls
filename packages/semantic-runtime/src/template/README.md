# Template Substrate

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

This folder models the template-compiler-facing world as it is re-layered onto kernel, resource, DI, parser, and
lowering products.

The goal is not to implement the compiler here. The goal is to make the products that later materializers must create
explicit enough that resource recognition, configuration, DI world construction, HTML parsing, attribute
classification, expression parsing, and instruction lowering converge on the same contracts.

## Layers

- `compiler-world.ts` models the container-scoped compiler world: visible resources, syntax resources, and compiler
  services. It is the handoff from DI world construction into template compilation. The service set mirrors the
  runtime root compilation context: template compiler, resource resolver, attribute parser, binding-command resolver,
  expression parser, and attribute mapper.
- `compiler-world-materializer.ts` materializes a compiler world after earlier passes have selected the visible container,
  resource headers, and syntax executables. It constructs the scope and compiler service products, but it does not
  rediscover source configuration. The app-world composition currently supplies non-syntax resources from
  DI-produced container resource slots, and supplies attribute-pattern plus binding-command executables from the
  configured framework syntax-catalog admissions for the owning app-root sequence.
- `parse-context.ts` carries inquiry pressure that genuinely changes parser/lowering behavior: strict parsing,
  recovery, frontier/cursor preservation, and consumer lane.
- `compilation-unit.ts` models the compiler front door: authored template source, the selected compiler world,
  inquiry parse context, and the runtime-shaped `CompilationContext` frame that HTML parsing, attribute
  classification, expression parsing, and lowering should consume. Inline string/template-literal sources may carry a
  decoded-markup-to-authored-source offset map; compiler materializers consume decoded markup, while cursor inquiries
  and source addresses must still point back to the authored TypeScript text.
- `compilation-unit-materializer.ts` materializes that front-door boundary once a template source and compiler world are
  known. It intentionally does not parse HTML yet; it establishes the product boundary where later template materializers
  attach.
- `template-compilation-project-pass.ts` is the current project-level template entrypoint. It consumes app-world
  compiler worlds and compiler-visible custom element definitions, then runs compilation-unit materialization, HTML
  parsing, attribute syntax parsing, attribute classification, compiler-owned value-site selection, binding-command
  lowering, compiled-template handoff materialization, and the runtime-analysis phase.
- `html-ir.ts` models authored HTML before Aurelia syntax interpretation. It preserves source addresses and recovery
  observations without performing resource lookup.
- `html-parse-materializer.ts` is the HTML materialization boundary. It spends a template compilation unit into authored
  HTML document/node/attribute products, records ownership claims, and keeps recovery local to the malformed syntax.
  It intentionally stops before Aurelia attribute-pattern parsing, resource lookup, or expression parsing.
- `attribute-syntax.ts` models runtime `AttrSyntax`, attribute-pattern executables, `IAttributeParser`, and the
  `SyntaxInterpreter` parser machine that compiles registered patterns before interpreting attribute names. Built-in
  pattern handler execution returns hydrated `AttrSyntax`-shaped results first; products and provenance are allocated
  by the attribute-syntax materializer that owns the HTML attribute site. Secondary multi-binding segments also become
  explicit `AttrSyntax` products when their authored value is split by lowering; they are not ordinary HTML attributes,
  but they still use the same parser machine.
- `attribute-syntax-materializer.ts` spends HTML attribute products through the compiler world's `IAttributeParser`
  service. It preserves the runtime split between the `SyntaxInterpreter` match and the handler method execution, then
  emits `AttrSyntax` products plus resource-reference claims to the winning attribute-pattern executable.
- `attribute-classification-materializer.ts` spends `AttrSyntax` products through the compiler world's resource resolver
  and binding-command resolver. It stops before instruction lowering, preserving the selected resource, bindable,
  command, capture, spread, and compiler-control lane as separate facts.
- `value-site.ts` and `value-site-materializer.ts` model the compiler-owned handoff from authored template
  values into expression parser publications. They preserve value-site provenance above the parser and deliberately
  transfer ownership away from the parser for binding-command values and secondary grammars that need command/compiler
  preprocessing first. Direct spread values are parser-owned here as `SpreadValue` sites so `...$bindables="source"`
  and shorthand `...source` lower through expression products instead of becoming static attributes.
- `expression-parse-projection.ts` owns the template/runtime projection from parser publications to expression ASTs.
  Keep this distinct from the parser's publication algebra: authoring-strict companion/frontier results can remain
  visible on parse products while runtime-shaped consumers ask whether Aurelia itself would accept a binding expression
  lane. A final interpolation hole whose body is complete but whose `}` is missing is one such case: parser state remains
  companion/frontier, while binding data-flow can still spend the runtime-accepted interpolation expression.
- `binding-command-execution.ts` models runtime binding-command executables, resolver state, command build inputs, and
  lowering results. Custom command bodies can stay opaque while still preserving the exact command/input boundary.
- `binding-command-lowering-materializer.ts` spends command-bearing attribute classifications and custom-attribute
  inline multi-binding values through runtime-shaped binding-command executables, secondary `AttrSyntax` parsing, and
  bindable lookup. Built-in commands and closed multi-binding segments emit instruction products plus expression parses;
  custom command bodies, unresolved commands, and invalid segment targets become explicit open seams rather than
  parser-owned special cases.
- `multi-binding-segments.ts` owns the source-offset-preserving parser for inline custom-attribute multi-binding
  segments. Keep raw segment splitting there so command lowering can focus on product publication and executable
  handoff.
- `compiled-template.ts` and `compiled-template-materializer.ts` model the compiler/runtime handoff that the runtime
  stores as transformed template DOM, target rows, surrogate rows, and `ICompiledElementComponentDefinition`
  instructions. This is the point where authored HTML plus lowered instructions become render targets and instruction
  sequences. The materializer now assembles runtime-shaped rows for text interpolation, let elements, custom elements,
  custom attributes, template controllers, surrogate host attribute instructions, static/property-set instructions, and
  command-produced bindings, while keeping compiler DOM work that still needs sharper modeling visible through open
  seams. It also lowers direct spread syntax to `SpreadTransferedBindingInstruction` or
  `SpreadValueBindingInstruction` at this boundary, matching Aurelia compiler behavior instead of routing spread through
  static set-property fallback. `...$attrs` stays on the transferred plain-instruction lane; spread values such as
  `...$bindables` stay on the spread-value bindable lane.
  Custom-element `processContent` hooks are treated as owning the child-DOM transform: the assembler can still emit the
  element's direct hydration row, but it does not compile the authored children through as ordinary content unless that
  hook execution is modeled.
- `runtime-rendering-materializer.ts` owns the runtime `Rendering` dispatch loop over compiled render targets and
  instruction sequences. `runtime-renderer.ts` contains the concrete runtime renderer emulators: controller renderers
  create child controller frames and binding renderers return runtime binding instances that are attached to the
  invoking controller, matching `Controller.addBinding` / `Controller.addChild` rather than a loose instruction
  post-pass. Static renderers now emit renderer-owned target-operation products for property set, attribute set,
  class-list add, and cssText append; surrogate rows render against the host target lane before ordinary target rows,
  matching Aurelia's `definition.surrogates` pass. `SpreadBinding` is the deliberate exception to direct controller
  admission: it can own dynamically compiled inner bindings created by `TemplateCompiler.compileSpread(...)`, and those
  ownership edges are recorded as binding-to-binding claims so the later `Controller.bind` emulation still walks them.
- `runtime-spread-compile-host.ts` contains the runtime-shaped
  `TemplateCompiler.compileSpread(...)` host used by rendering. Keep captured-attribute command lowering, dynamic
  instruction allocation, dynamic value-site/expression publication, and `SpreadElementPropBindingInstruction`
  wrapping there instead of growing the rendering materializer into a second compiler. Dynamic spread-created
  instructions publish
  `instruction.dynamic-instruction-originates-from-captured-attribute-syntax` claims so scope construction can
  reconnect them to the parent `HydrateElementInstruction` that captured the attribute without a renderer-local
  provenance side channel.
- `template-runtime-analysis.ts` owns the post-compiled-template runtime/checker phase: runtime Rendering dispatch,
  template scope construction, `Controller.bind` emulation, observer value-channel projection, and binding data-flow
  materialization. Runtime analysis runs after the project has compiled every template front door, and receives
  `TemplateRuntimeAnalysisProjectContext` so controller products can be linked to already-known compiled templates.
  Custom-element controllers publish `configuration.controller-uses-compiled-template` claims; template-controller
  controllers publish `configuration.controller-uses-instruction-sequence` claims for their nested child sequence. Those
  controllers also materialize an `IViewFactory` product with a generated embedded custom-element definition, matching
  the `ViewFactory.def` shape produced by `Rendering.getViewFactory(...)`. The factory links to both that definition and
  the child instruction sequence, creates an aggregate `SyntheticViewController` product, and runs a child
  `Rendering.render(...)` pass for the embedded instruction sequence, mirroring `TemplateControllerRenderer ->
  Rendering.getViewFactory(...) -> factory.create(...) -> Controller.$view(...) -> _hydrateSynthetic()`. This is
  intentionally aggregate/cardinality-aware rather than per-runtime-instance: the controller row records `many`,
  `optional`, or `single` through template-controller semantics. The synthetic render pass groups embedded instructions
  by authored target node before dispatch so nested renderer and spread-compile logic can still see the target node.
  Recursive rendering work should extend this phase instead of pulling runtime instance concerns back into the
  compiler-front-door pass.
- `template-controller-scope-materializer.ts` owns the TypeChecker-backed control-flow handoff for built-in template
  controllers. It now publishes link-hook claims for branch controllers whose framework `link(...)` method attaches
  them to another template controller: `else` links to the previous `if`, promise result controllers link to the parent
  `promise`, and switch cases/defaults link to `switch` when present. Keep these branch relationships in the controller
  graph rather than baking them into expression evaluation.
- `runtime-controller.ts` is the mutable render-time controller frame used while renderer emulation runs. It freezes
  into auLink-backed controller products from `configuration/controller.ts` after scope projection has attached modeled
  `Scope` references; the frame itself is not the durable product. The frame keeps an exact local lifecycle timeline
  for the framework-shaped operations semantic-runtime currently emulates: creation, child-container setup, child and
  binding admission, view-factory/synthetic-view handoff, render dispatch, Scope attachment, and bind. Public controller
  rows compress consecutive repeated steps so broad app reads stay useful, but the underlying frame remains exact enough
  for future phase-specific projections.
- `runtime-rendering-materializer.ts` records renderer-created controller products, binding products, scope effects,
  binding render contexts, durable handle allocation, provenance, materialization, and renderer/controller/binding
  claims. Binding and scope-effect details are attached immediately; controller details are attached by scope
  materialization so their `scope` fields do not freeze before the modeled runtime scope exists.
  `runtime-binding.ts` holds the framework-shaped binding, target-access, value-channel, data-flow, and scope-effect
  model classes. Observation-owned value-channel and data-flow detail slots live in
  `observation/product-details.ts`.
- `runtime-controller-bind-materializer.ts` owns the explicit `Controller.bind` materialization layer. It asks
  `RuntimeControllerFrame.bind(...)` to walk controller-owned bindings, then records the target-side contributions
  requested by framework-shaped binding classes. `PropertyBinding` and `InterpolationBinding` publish
  `ObserverLocator` / `NodeObserverLocator` target-access products; `AttributeBinding.updateTarget(...)` publishes
  direct target-operation products for `.class`, `.style`, and ordinary attribute writes, while
  `ContentBinding.updateTarget(...)` publishes text-content target operations for text interpolation and
  `ListenerBinding.bind(...)` publishes event-listener subscription operations. `RefBinding.updateSource(...)` publishes
  source-operation products for resolved ref targets instead of masquerading as a DOM target update; `element.ref`
  resolves through TypeChecker-backed HTML tag maps, while component/custom-attribute/controller refs resolve through
  the renderer-created controller tree. Target-access rows record whether
  bind-time asks for an accessor or observer, whether the target is a native node or controller view-model, and the
  selected built-in access strategy for common form controls and presentation targets such as input value, checkbox
  checked, select value, textarea value, class/style accessors, and ordinary element properties. The access strategy is
  selected by `observation/observer-locator.ts`, which combines framework node observer configuration with TypeChecker
  target/property facts. Controller view-model targeting comes from renderer dispatch and child-controller creation, not
  from tag-name heuristics. Object-side observation follows Aurelia's framework fallbacks: accessor lookups select the
  runtime `PropertyAccessor`, while observer lookups select `ComputedObserver` for readonly getter-like members or
  `SetterObserver` for ordinary and dynamically-created keys. The checker still contributes property existence,
  writability, and type facts for downstream policy and data-flow products.
- `observation/binding-value-channel-materializer.ts` turns target-access and target-operation products into
  value-channel products before source/target flow is checked. This keeps special form-control semantics, such as static
  `SelectValueObserver` option domains, static multi-select array element domains, plain checkbox boolean flow, radio
  element values, checkbox collection membership values, class token channels, class toggle channels, style rule
  channels, and style property channels, out of API glue and renderer dispatch. It consumes compiler-lowered sibling
  `model.bind`, `value.bind`, and `multiple.bind` property bindings for element values and select mode, and consumes
  lowered `AttributeBinding`/`InterpolationBinding` products for `.class`, `.style`, `class="${...}"`, and
  `style="${...}"` sites so compiler behavior remains visible as products. It also consumes `RefBinding` source
  operations as `ref-target` channels, keeping source assignment separate from target mutation. `SpreadValueBinding`
  emits one value channel per statically known target bindable, reflecting the runtime's per-bindable inner
  `PropertyBinding` creation without creating a second renderer-owned instruction layer.
- After scope projection, `observation/binding-data-flow-materializer.ts` materializes a separate source/target flow
  product for each runtime property binding, attribute binding, interpolation, ref binding, and spread value binding with
  target access, target operation, source operation, or explicit open value channel. It spends the instruction's modeled
  `Scope`, the expression parser publication, runtime-side facts, and value-channel facts to record direction, source
  type, raw target property type, runtime target value type, source writability, TypeChecker assignability, and open flow
  pressure without expanding runtime rendering. For spread value bindings, the flow projects each target bindable key
  through the spread expression's source type, for example `bindings.productId` into a `product-id`/`productId`
  bindable.
- `template-controller-scope-materializer.ts` spends the controller tree plus runtime binding scope effects into
  runtime-shaped `Scope`, binding-context, and override-context products. Controller and `Scope` model classes own the
  construction shapes; the materializer only preserves template-order effects and commits records.
  It preserves the CE boundary-scope rule, repeat local binding-context rule, repeat override contextual names,
  `with.bind` object binding-context rule, branch-local `if.bind`/`else` narrowing, promise result locals, and
  let-binding target-context rule so expression inquiry can use the same scope substrate as runtime-shaped compilation.
  It also models target-to-source bindable assignments that create runtime-only binding-context names for later
  template expressions. A two-way/from-view bindable can write a previously undeclared scope name; later
  sibling/descendant expressions should see that name after the instruction that wrote it. The slot stays runtime-only
  for assignment policy, but can retain the bindable's TypeChecker member as a type carrier so repeat locals and
  member completions degrade to the actual target type instead of to a missing-slot-type seam. When the bindable itself
  is untyped, the remaining authoring pressure is honest `any`/weak-type pressure from the plugin or app surface, not
  a lost scope handoff.
  Dynamic instructions compiled from closed `...$attrs` captures first try to reuse the parent usage scope that captured
  the attribute; this lets wrapper components forward expressions such as `value.bind="email"` into an inner input
  while typechecking `email` against the parent view model. They still receive a root-scope fallback when no capture
  scope can be found. Definition-level spread fallback groups captures by parent `HydrateElementInstruction` usage, so
  wrapper components under built-in template controllers can keep the child-view scope that the controller semantics
  produced. Repeated runtime instances still need instance-specific controller/template products beyond the current
  definition-level aggregate rows. Listener binding instructions receive a derived expression scope with the runtime
  `$event` override-context slot typed from DOM event maps for the event name. This models `ListenerBinding.callSource`
  rather than a completion special case, and it gives listener-returned functions the same first-argument event type
  when arrow callbacks such as `(e) => e.stopPropagation()` are evaluated by the TypeChecker substrate.
- `template-controller-semantics.ts` records built-in template-controller child-scope, child-view cardinality,
  primary-value domain kind, and control-flow roles as product-side semantic profiles. These semantics classes carry
  direct `auLink` anchors to the runtime-html template-controller classes because they are the product-side behavior
  counterpart used by scope, controller, inquiry, and API projections. The value-domain kind is intentionally separate
  from bindable type projection: framework primary values such as `case.value` are open-ended, while secondary
  bindables such as `case.fallThrough` still need their own finite/static or checker-backed domain.
- `built-in-syntax.ts` records framework-provided attribute-pattern and binding-command handlers as concrete
  runtime-shaped model classes with `auLink` anchors.
- `built-in-syntax-catalog-materializer.ts` materializes framework-owned syntax catalogs into kernel-backed catalog, executable,
  and compiled-pattern products. It does not decide which catalogs are visible to a component compiler world; that
  belongs to configuration, DI scope, and compiler-world materialization. The configured syntax-catalog materializer in the
  same file consumes explicit `FrameworkRegistrationKind` values from configuration/registration and records which
  built-in catalogs a known framework configuration or registration group made available. I18n translation syntax is
  configuration-sensitive: closed `translationAttributeAliases` option contributions produce a catalog variant with
  the corresponding attribute patterns and binding-command aliases. Translation-key catalogs are separate i18n
  products in `../i18n`; syntax visibility says where `t` can appear, while i18n products say which static keys are
  known from configuration resources.
- The current syntax-execution middle ground is deliberate: built-in framework and built-in plugin attribute patterns
  and binding commands are modeled as concrete executable classes. Userland custom elements, custom attributes, value
  converters, binding behaviors, and template controllers are product priorities; userland attribute-pattern and
  binding-command bodies are not dynamically executed yet. If they become visible later, they should surface as
  explicit custom or opaque seams until a dedicated extension materializer exists.
- built-in resource headers from `resources/built-in-resources.ts` become ordinary visible resources after DI has
  spent them into container resource slots. Compiler-world visibility should preserve the header/resource slot for
  lookup while preferring a converged full definition when one exists, because bindable maps and compiler-consumable
  metadata live on definitions rather than headers.
- Attribute patterns and binding commands are modeled as one configured syntax surface for compiler-world purposes.
  Runtime stores them differently for efficient attribute parsing and command lookup, but tooling should not let that
  implementation split make syntax visibility fundamentally container-specific unless a custom extension materializer
  proves otherwise.
- This is a semantic behavior exception, not a general ontology exception. Most runtime/compiler semantics should stay
  close to runtime shape; the product may split them into more granular records for provenance and inquiry, but should
  avoid inventing a coarser model that hides runtime-visible behavior.
- `instruction-ir.ts` models lowered rendering instructions as products that can carry provenance, addresses, and links
  back to syntax, resource definitions, binding commands, and expression AST products.
- Runtime binding products are deliberately separate from instruction products. Instructions are renderer input;
  bindings are runtime objects/controllers' binding list members. Keeping that split visible prevents template scope,
  expression inquiry, and later controller emulation from treating renderer input as if it were already runtime state.
- There is an explicit phase split after compiled-template/render-row assembly. Up to that point, the product can
  follow evaluation-shaped runtime/compiler construction: evaluate modules and configuration, build DI/container state,
  construct compiler worlds, parse/lower templates, and assemble render targets. Past that point, real runtime
  activation depends on values and lifecycle that the language server should not pretend to have. Nested template
  controllers, repeated views, view-model member surfaces, and deep autocomplete should cross into a speculative
  TypeChecker-backed projection lane through explicit products, claims, and open seams rather than by faking full
  hydration.
- `product-details.ts` declares the typed detail slots that hydrate template/compiler product handles into current-run
  rich models. These slots are the typed expansion path from durable product envelopes to inquiry and tooling expansion;
  they should stay tied to product-kind vocabulary and runtime-shaped model classes rather than becoming generic
  payload storage.

## Boundaries

Template products are consumers of earlier horizontal layers:

- boot and inquiry decide source admission and active loci
- evaluation closes static source shapes when it can and emits open seams when it cannot
- resources provide converged resource metadata
- configuration and registration order determine what is admitted to containers
- DI world construction determines compiler-visible resource and service scope

Template products should not rediscover those facts by scanning source directly. They should consume their products,
claims, and open seams once the owning materializers exist.

## Watchpoints

Instruction kinds and binding kinds are intentionally close to Aurelia runtime shapes, but they are not final AOT
bytecode. Refactor them when runtime compiler semantics force sharper splits.

Attribute classification is a pressure point between resource lookup, bindable selection, binding-command execution,
and instruction lowering. Keep those facts separate until real materializers prove a smaller contract is safe.

The attribute parser is a machine, not just a bag of patterns. Materializers should preserve the registered handler,
compiled pattern, score, and interpretation-cache boundaries because autocomplete and diagnostics need to know whether
an attribute failed matching, matched a pattern, or reached an opaque handler.

Expression parser integration is intentionally by product handle here. The current expression parser predates the
kernel and should stay on a short leash: value-site ownership, binding-command preprocessing, multi-binding splitting,
and lowering belong above it unless runtime expression-parser semantics prove otherwise. Parser results are currently
rich in-process objects on value-site and command-lowering emissions; durable expansion of those parse products should
be typed explicitly later rather than pushed into generic kernel payloads.

Runtime `DefaultBindingSyntax` also registers `EventModifierRegistration`. That registration is not an attribute
pattern or binding command, so it is intentionally not part of the built-in syntax catalog yet. Model it as a separate
renderer/listener modifier surface when instruction lowering or renderer-world materialization needs it.

Renderer-created child controllers now materialize runtime child containers instead of carrying open container
references. This covers the common element/attribute hydration path: a child container product, the built-in
`IContainer` self resolver, and the contextual resolver slots for host node, controller, instruction, render location,
view factory, slots info, and custom-element hydration context. Keep deeper controller activation facts separate:
view-model instance resolvers, definition dependency registration, view-factory-owned containers, synthetic-view
containers, and cross-template per-instance parent container chains should land as explicit products when app pressure
needs them.

Runtime Rendering is downstream of compiled-template products, not raw binding-command lowerings. Do not let renderer
emulation consume unassembled instruction lists as if target rows, transformed DOM markers, surrogate instructions, and
template-controller child templates already existed. If the runtime compiler would have inserted markers or created a
child `CompilationContext`, model that at the compiled-template boundary first. Root `<template>` host attributes are
the current closed surrogate slice; more complex surrogate invalid/edge cases should either lower explicitly or stay
visible as compiler seams.

`processContent`, content projection, and containerless child handling are compiler DOM transforms, not ordinary
instruction gaps. Keep their seam vocabulary in the compiler namespace and do not let these cases fall back to a generic
open instruction unless the instruction shape itself is the thing that failed.

HTML parsing, attribute classification, expression parsing, instruction lowering, and template completion are active
inquiry pressure points. These materializers cannot be designed as pure batch compilation only: parser recovery,
cursor/range loci, candidate discovery, diagnostics, hovers, and tooling explanations need answer envelopes and
continuations. Keep compiler products current-world and provenance-rich, but do not back-port autocomplete ranking,
rename safety, diagnostic severity, or agent usefulness into compiler-world records.

Template completion starts above parser products: `inquiry/template-completion.ts` reads materialized
scope/resource/expression details and returns candidate rows for classified sites. Cursor-to-site adaptation also lives
in inquiry now, but it spends this layer's materialized template emission instead of rescanning source: active HTML
node, attribute name, attribute value, expression frontier, selected definition, and binding scope are all selected
from template/runtime/scope products.

Template compilation should now enter through a compilation unit. Avoid letting later template materializers rediscover
the owner resource, compiler world, parse context, or runtime service set from source. If a materializer needs different
context, add it to the unit/context model or create a nested child context instead of threading unrelated parameters
through parser APIs.
