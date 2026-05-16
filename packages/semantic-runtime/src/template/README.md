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
  configured framework syntax-catalog admissions for the owning app-root sequence. Duplicate attribute-pattern
  registrations publish template-compiler `attribute_pattern_duplicate` (`AUR0089`), and duplicate binding-command
  keys publish warning-severity `binding_command_existed` (`AUR0157`) before the duplicate executable can become
  spendable compiler-world state.
- `parse-context.ts` carries inquiry pressure that genuinely changes parser/lowering behavior: strict parsing,
  recovery, frontier/cursor preservation, and consumer lane.
- `compilation-unit.ts` models the compiler front door: authored template source, the selected compiler world,
  inquiry parse context, and the runtime-shaped `CompilationContext` frame that HTML parsing, attribute
  classification, expression parsing, and lowering should consume. Inline string/template-literal sources may carry a
  decoded-markup-to-authored-source offset map; compiler materializers consume decoded markup, while cursor inquiries
  and source addresses must still point back to the authored TypeScript text.
- `compilation-unit-materializer.ts` materializes that front-door boundary once a template source and compiler world are
  known. It intentionally does not parse HTML yet; it establishes the product boundary where later template materializers
  attach. Claim publication stays in `TemplateCompilationClaimMaterializer` so product construction does not also own
  every `uses-*` relationship.
- `template-compilation-project-pass.ts` is the current project-level template entrypoint. It consumes app-world
  compiler worlds and compiler-visible custom element definitions, then runs compilation-unit materialization, HTML
  parsing, attribute syntax parsing, attribute classification, compiler-owned value-site selection, binding-command
  lowering, compiled-template handoff materialization, and the runtime-analysis phase.
  The pass owns the shared `CheckerExpressionTypeWorld` for all resource runtime-analysis frames in that project
  compilation, while each resource profile reports expression-cache deltas from a local marker. Keep future
  runtime/checker lifetime work at this project-pass boundary instead of rebuilding an expression world per resource.
  App component compiler-world materialization and standalone authoring compiler-world materialization are separate
  profile phases (`component-compiler-world` and `authoring-compiler-world`) so broad app-root cost and LSP/resource
  library fallback cost remain distinguishable.
  The standalone authoring compiler world used for resource-library templates must receive the same current
  TypeChecker epoch as app-root compiler worlds when it materializes built-in resources. Built-in template-controller
  and custom-attribute definitions then project framework target classes such as `If` and `Repeat` through the app's
  program instead of degrading to controller view-model targets with no type.
  Runtime controller diagnostics that scan view-model class bodies should ask the type-system declaration-source bridge
  for the checker declaration's already-admitted source-file address. They should not borrow the resource target span,
  because imported/factory-backed targets can point at a different authored site than the class body being scanned.
- `html-ir.ts` models authored HTML before Aurelia syntax interpretation. It preserves source addresses and recovery
  observations without performing resource lookup.
- `html-parse-materializer.ts` is the HTML materialization boundary. It spends a template compilation unit into authored
  HTML document/node/attribute products, records ownership claims, and keeps recovery local to the malformed syntax.
  It intentionally stops before Aurelia attribute-pattern parsing, resource lookup, or expression parsing. HTML space
  character checks are named as HTML grammar, not shared with the ECMAScript expression scanner's whitespace law.
  The front-door materializer owns parse pass framing, source records, document products, and store commits; its tree
  materializer owns recursive node/attribute/recovery publication and decoded-markup-to-authored-source address mapping.
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
  command, capture, spread, and compiler-control lane as separate facts. Framework-thrown classification failures
  publish `TemplateCompilerIssue` products instead of flowing into later lowering phases.
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
- `compiler-issue.ts` and `compiler-issue-publication.ts` own template-compiler failure products. Compiler-world
  service registration, attribute classification, binding-command lowering, compiled-template assembly, and spread
  compilation attach exact framework `ErrorNames` authority there when a modeled Aurelia throw or warning is known;
  diagnostics consume those products instead of re-inferring errors from source text or message wording.
- `binding-command-lowering-materializer.ts` spends command-bearing attribute classifications and custom-attribute
  inline multi-binding values through runtime-shaped binding-command executables, secondary `AttrSyntax` parsing, and
  bindable lookup. Built-in commands and closed multi-binding segments emit instruction products plus expression parses;
  custom command bodies, unresolved commands, and invalid segment targets become explicit open seams rather than
  parser-owned special cases. Inline multi-binding is one secondary grammar for both custom attributes and template
  controllers; the value site is `MultiBindingValue`, while its `AttributeClassification` carries which resource owns
  the bindables. Empty `.bind`, `.two-way`, and `.from-view` command values infer the source expression from the
  authored target name before DOM target-property mapping; for example `minlength.bind` reads `minlength` while the
  target access can still map to `minLength`.
- `binding-command-lowering-publication.ts` owns the product envelopes for that lowering phase: source/provenance/open
  seams, ordinary command build/lowering products, multi-binding segment/syntax/lowering products, instruction identity
  publication, and the claims that connect command lowerings to produced instructions and expression parses. Keep
  lowering decisions in the materializer and product/claim ceremony in this publication module.
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
  Framework-thrown assembly failures, such as commands other than `.bind` on `<let>`, publish `TemplateCompilerIssue`
  products and mark the compiled template invalid.
  Custom-element `processContent` hooks are treated as owning the child-DOM transform: the assembler can still emit the
  element's direct hydration row, but it does not compile the authored children through as ordinary content unless that
  hook execution is modeled.
- `runtime-rendering-materializer.ts` owns the runtime `Rendering` dispatch loop over compiled render targets and
  instruction sequences. `runtime-view-factory-materializer.ts` owns the `Rendering.getViewFactory(...)` product lane
  for template controllers: generated embedded custom-element definitions, `IViewFactory` products, synthetic-view
  aggregate products, and the claims that connect them to child instruction sequences.
  `runtime-controller-creation-materializer.ts` owns root, renderer-created child, and synthetic-view controller frame
  creation, including child-container materialization and controller hydration lifecycle steps.
  `runtime-controller-publication.ts` owns durable controller products, controller materialization records, and
  controller-to-template/instruction/binding claims after renderer emulation and scope materialization have produced
  stable mutable controller frames. `runtime-renderer.ts` contains the concrete runtime renderer emulators: controller
  renderers request child controller frames and binding renderers return runtime binding instances that are attached to
  the invoking controller, matching `Controller.addBinding` / `Controller.addChild` rather than a loose instruction
  post-pass. Static renderers now emit renderer-owned target-operation products for property set, attribute set,
  class-list add, and cssText append; surrogate rows render against the host target lane before ordinary target rows,
  matching Aurelia's `definition.surrogates` pass. Runtime rendering now uses the project compiled-template context to
  expand child custom-element controllers into aggregate child-view render passes; this keeps recursive controller
  hydration tied to actual `Controller.addChild` products rather than cloning a definition-level render in isolation.
  `SpreadBinding` is the deliberate exception to direct controller admission: it can own dynamically compiled inner
  bindings created by `TemplateCompiler.compileSpread(...)`, and those ownership edges are recorded as
  binding-to-binding claims so the later `Controller.bind` emulation still walks them.
- `runtime-spread-binding-creator.ts` contains the semantic counterpart to `SpreadBinding.create(...)`: it walks the
  modeled hydration-context controller chain, resolves captured `AttrSyntax` products, and hands them to
  `TemplateCompiler.compileSpread(...)`. `runtime-spread-compile-host.ts` contains the runtime-shaped compiler host
  that performs captured-attribute command lowering, dynamic instruction allocation, dynamic value-site/expression
  publication, and `SpreadElementPropBindingInstruction` wrapping. Keep those responsibilities here instead of
  growing the rendering materializer into a second compiler. Dynamic spread-created instructions publish
  `instruction.dynamic-instruction-originates-from-captured-attribute-syntax` claims so scope construction can
  reconnect them to the parent `HydrateElementInstruction` that captured the attribute without a renderer-local
  provenance side channel. `...$attrs` transfer walks the modeled runtime controller parent chain, matching
  `SpreadBinding.create`'s hydration-context ancestor lookup; do not reintroduce definition-wide capture fallbacks that
  merge unrelated uses of the same component definition. Dynamic spread compilation also publishes a template-compiler
  `no_spread_template_controller` (`AUR9998`) compiler issue when it reaches the `SpreadBinding.addChild` branch that
  rejects template-controller children, while the binding lifecycle lane preserves the sibling runtime-html issue.
- `runtime-binding-issue.ts` owns binding-lifecycle diagnostics that are not binding-behavior or scope-effect
  diagnostics. `SpreadBinding` currently spends runtime-html `no_spread_scope_context_found` (`AUR9999`) when
  captured-attribute transfer cannot find the next hydration context, and `no_spread_template_controller` (`AUR9998`)
  when dynamic spread compilation reaches the `SpreadBinding.addChild` branch that would reject a template-controller
  child. `no_composition_root` (`AUR0770`) remains outside this lane because it belongs to `Aurelia.start(...)` app-root
  lifecycle state rather than spread binding execution. I18n `TranslationBinding` lifecycle failures use the same issue
  product shape, but their materializer lives in `../i18n/translation-binding-issues.ts` because the framework handoff
  is i18n-owned: `t-params.bind` attaches to the target element's translation binding through `useParameter(...)`, and
  dynamic `t.bind` key validation is part of `TranslationBinding.bind`.
- `runtime-renderer-issue.ts` owns framework-runtime diagnostics discovered by a concrete `IRenderer` before a binding or
  controller exists to own the failure. `RefBindingRenderer` uses this lane for `not_supported_view_ref_api`
  (`AUR0750`) because `getRefTarget(...)` rejects `view.ref` before constructing a `RefBinding`, and for
  `ref_not_found` (`AUR0751`) when a custom-element host exists but the named ref target matches neither same-node
  custom attributes nor the element controller name. The same renderer lane claims `node_is_not_a_host` (`AUR0762`) for
  `controller.ref` / `component.ref` on ordinary elements, and `node_is_not_a_host2` (`AUR0763`) for named ref fallback
  on an ordinary element without a matching custom attribute. `SpreadValueRenderer` uses the same lane for
  `spreading_invalid_target`
  (`AUR0820`): the framework compiler can produce a `.spread`
  `SpreadValueBindingInstruction` with target `$element`, and the runtime renderer rejects anything except
  `$bindables`.
- `runtime-binding-scope-issue.ts` owns framework-runtime diagnostics discovered while spending binding scope effects.
  Repeat destructuring now publishes `RuntimeBindingScopeIssue` products for `AUR0112` when the checker-backed
  binding-pattern projector can prove or warn that the item shape is not object-compatible, or that an array-rest
  destructuring source is not an actual Array. Repeat source compatibility publishes the same issue product shape for
  runtime-html `repeat_non_iterable` (`AUR0777`) when a repeat source is outside the framework's built-in
  `RepeatableHandlerResolver` categories.
- `runtime-controller-issue.ts` owns framework-runtime diagnostics discovered while emulating controller construction or
  hydration. Runtime rendering uses it for renderer resource lookup failures when a lowered instruction carries a
  resource name but the rendering container cannot resolve it: missing custom elements (`AUR0752`), custom attributes
  (`AUR0753`), and template controllers (`AUR0754`). Those failures stop child-controller materialization rather than
  creating null-definition controller frames. Runtime rendering also uses it for bindable observer setup failures
  (`AUR0507`, `AUR0508`) when the framework
  `createObservers(...)` path would ask a collection observer for coercion or change-handler hooks it does not expose.
  It also uses the same issue product for the `Repeat` constructor option checks that inspect iterator tail
  `MultiAttrInstruction`s: unsupported `key` commands (`AUR0775`), extraneous repeat option targets (`AUR0776`), and
  unsupported `contextual` commands (`AUR0821`). Static `AuCompose` inputs live here too: invalid literal
  `scope-behavior` (`AUR0805`) and `flush-mode` (`AUR0809`) are detected from lowered `SetPropertyInstruction`s, while
  static string `component` / `view-model` names probe the parent hydration-context container and map missing custom
  elements to `AUR0806`. Runtime composition re-entry/deactivation errors remain unclaimed until lifecycle phases are
  modeled. `else` link-hook failures are also controller-owned: when the previous child controller sibling is not `if`,
  the issue maps to `AUR0810`. `case` and `default-case` link-hook failures use the same lane: missing parent `switch` maps to
  `AUR0815`, and a second `default-case` linked to the same switch maps to `AUR0816`. Promise-result controller
  link-hook failures are the same kind of controller-owned issue: orphan `pending`, `then`, and `catch` controllers map
  to `AUR0813` when their rendering parent is not the synthetic view owned by a parent `promise` controller. Portal
  static activation failures are controller-owned too: invalid literal `position` maps to `AUR0779`, strict empty target
  maps to `AUR0811`, and strict missing target maps to `AUR0812` after the portal attribute's inline multi-binding props
  have lowered to `SetPropertyInstruction`s.
- `runtime-controller-activation-di.ts` owns source-backed DI checks that are specific to renderer-created controller
  activation rather than ambient DI in general. It currently finds instance property/constructor
  `resolve(IViewFactory)` sites on resource view models; ordinary custom elements and custom attributes map those sites
  to `view_factory_provider_not_ready` (`AUR0755`) because runtime-html registers the not-ready provider there, while
  template controllers receive a prepared `IViewFactory`.
- `runtime-binding-behavior.ts` and `runtime-binding-behavior-materializer.ts` own bind-time behavior application over
  already-rendered binding products and `Controller.bind` target facts. The modeled built-ins are now
  `SelfBindingBehavior` (`AUR0801` for non-listener bindings), `SignalBindingBehavior` (`AUR0817` for bindings without
  `handleChange`, `AUR0818` for missing signal names), `UpdateTriggerBindingBehavior` (`AUR0802`, `AUR0803`, and
  `AUR9992`), `AttrBindingBehavior` (`AUR9994` for non-`PropertyBinding` targets), and the shared throttle/debounce
  rate-limit guard (`AUR9996`). Validation-html `ValidateBindingBehavior` is modeled only when the compiler resource
  scope resolves the `validate` resource admitted by `ValidationHtmlConfiguration`; it owns exact AUR4200-AUR4204
  bind-time checks and the parser-owned `ValidationController` property-expression check for AUR4205. The defensive
  AUR4206 path is left unclaimed because parser-owned AST products cannot fall through to an undefined root without
  admitting malformed or foreign framework AST objects. Custom binding behaviors are resolved through the compiler resource scope before bind
  effects are inspected; direct bind-method calls to `PropertyBinding.useTargetSubscriber(...)` can spend
  `binding_already_has_target_subscriber` (`AUR9995`) when another behavior on the same binding already claimed the
  subscriber slot. `update_trigger_behavior_not_supported` (`AUR9993`) remains unclaimed because
  semantic-runtime does not yet model replacing the default `INodeObserverLocator` service; binding-behavior
  definition/registration failures remain resource/DI catalog pressure rather than bind-time behavior issues.
- `runtime-value-converter.ts` and `runtime-value-converter-materializer.ts` own value-converter invocation pressure
  that belongs to a rendered binding expression rather than to resource lookup. The first modeled path is
  `SanitizeValueConverter.toView`: when the compiler resource scope resolves the built-in `sanitize` converter and the
  active container tree has no modeled `ISanitizer` resolver, semantic-runtime spends runtime-html
  `method_not_implemented` (`AUR0099`) for the default throwing sanitizer. A modeled app `ISanitizer` registration
  suppresses that issue.
- `template-runtime-analysis.ts` owns the post-compiled-template runtime/checker phase: runtime Rendering dispatch,
  template scope construction, `Controller.bind` emulation, i18n `TranslationBinding.create/bind` issue
  materialization, binding-behavior/value-converter application,
  observer value-channel projection, and binding data-flow materialization. Runtime analysis runs after the project has
  compiled every template front door, and receives
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
  controllers. `template-controller-flow-scope-materializer.ts` applies the built-in controller-flow dispatcher and
  publishes link-hook claims for branch controllers whose framework `link(...)` method attaches them to another
  template controller: `else` links to the previous `if`, promise result controllers link to the parent `promise`, and
  switch cases/defaults link to `switch` when present. Keep these branch relationships in the controller graph rather
  than baking them into expression evaluation. `template-scope-type-projector.ts` owns the TypeChecker support used by
  this phase: listener `$event` types, repeat override locals, iterator local types, repeat source compatibility,
  let-binding value types, promise result slot types, and template-controller primary value evaluation. Keep those reusable projection rules there
  instead of duplicating them in cursor, diagnostic, or data-flow answer code.
- `runtime-controller.ts` is the mutable render-time controller frame used while renderer emulation runs. It freezes
  into auLink-backed controller products from `configuration/controller.ts` after scope projection has attached modeled
  `Scope` references; the frame itself is not the durable product. The frame keeps an exact local lifecycle timeline
  for the framework-shaped operations semantic-runtime currently emulates: creation, child-container setup, child and
  binding admission, view-factory/synthetic-view handoff, render dispatch, Scope attachment, and bind. Public controller
  rows compress consecutive repeated steps so broad app reads stay useful, but the underlying frame remains exact enough
  for future phase-specific projections.
- `runtime-rendering-materializer.ts` records binding products, scope effects, binding render contexts, durable handle
  allocation, provenance, materialization, and renderer/controller/binding orchestration claims. Binding and scope-effect
  details are attached immediately; controller details are delegated to `runtime-controller-publication.ts` after scope
  materialization has attached modeled `Scope` references, so their `scope` fields do not freeze too early.
  `runtime-binding.ts` holds the framework-shaped binding, target-access, value-channel, data-flow, and scope-effect
  model classes. Observation-owned value-channel and data-flow detail slots live in
  `observation/product-details.ts`.
- `runtime-controller-bind-materializer.ts` owns the explicit `Controller.bind` materialization layer. It asks
  `RuntimeControllerFrame.bind(...)` to walk controller-owned bindings, resolves the runtime target for each binding,
  then delegates product/source/open-seam publication to `runtime-controller-bind-publication.ts`.
  `PropertyBinding` and `InterpolationBinding` publish `ObserverLocator` / `NodeObserverLocator` target-access
  products; `AttributeBinding.updateTarget(...)` publishes direct target-operation products for `.class`, `.style`,
  and ordinary attribute writes, while `ContentBinding.updateTarget(...)` publishes text-content target operations for
  text interpolation and `ListenerBinding.bind(...)` publishes event-listener subscription operations.
  `RefBinding.updateSource(...)` publishes source-operation products for resolved ref targets instead of masquerading as
  a DOM target update; `element.ref` resolves through TypeChecker-backed HTML tag maps, while
  component/custom-attribute/controller refs resolve through the renderer-created controller tree. Target-access rows
  record whether
  bind-time asks for an accessor or observer, whether the target is a native node or controller view-model, and the
  selected built-in access strategy for common form controls and presentation targets such as input value, checkbox
  checked, select value, textarea value, class/style accessors, and ordinary element properties. The access strategy is
  selected by `observation/observer-locator.ts`, which combines framework node observer configuration with TypeChecker
  target/property facts. Native node target-access rows preserve whether the checker type came from an exact
  `HTMLElementTagNameMap`/`SVGElementTagNameMap` hit or from the broad `HTMLElement`/`SVGElement` fallback, because
  fallback rows are honest host-node or web-component pressure rather than custom-element guesses. Controller view-model
  targeting comes from renderer dispatch and child-controller creation, not from tag-name heuristics. Property,
  interpolation, and spread-value bindings all use the same renderer-owned target
  handoff when the compiled target is a child controller, matching Aurelia's `getTarget(target)` renderer behavior
  instead of treating interpolation as a node-only write. Object-side observation follows Aurelia's framework fallbacks: accessor lookups select the
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
  Dynamic instructions compiled from closed `...$attrs` captures reuse the hydration context that captured the
  attribute; nested `...$attrs` transfer moves to that context controller's parent. This lets wrapper components forward
  expressions such as `value.bind="email"` into an inner input while typechecking `email` against the parent view model.
  If no parent hydration context is modeled, the transfer is an explicit open runtime boundary instead of a
  definition-level capture fallback. Recursive child custom-element views are now scope-walked from the controller that
  rendered them, so parent-captured expressions keep their usage scope through wrapper templates and built-in
  template-controller child views. Repeated runtime instances still use aggregate compiled-template products rather than
  per-instance template products. Listener binding instructions receive a derived expression scope with the runtime
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
child `CompilationContext`, model that at the compiled-template boundary first. Root `<template>` host attributes,
projection ownership checks, `<slot>` shadow-DOM requirements, and local-template shape checks that Aurelia rejects
publish framework-coded compiler issues rather than open seams.

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
