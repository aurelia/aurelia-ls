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
  and shorthand `...source` lower through expression products instead of becoming static attributes. Static text and
  plain platform attributes do not publish durable value-site products; cursor inquiries can still classify those
  source ranges from HTML/syntax products, and should create query-local claims if they ever need a value-site-shaped
  answer envelope.
- `expression-parse-projection.ts` owns the template/runtime projection from parser publications to expression ASTs.
  Keep this distinct from the parser's publication algebra: authoring-strict companion/frontier results can remain
  visible on parse products while runtime-shaped consumers ask whether Aurelia itself would accept a binding expression
  lane. A final interpolation hole whose body is complete but whose `}` is missing is one such case: parser state remains
  companion/frontier, while binding data-flow can still spend the runtime-accepted interpolation expression.
- `binding-command-execution.ts` models runtime binding-command executables, resolver state, command build inputs, and
  lowering results. Custom command bodies can stay opaque while still preserving the exact command/input boundary.
  `BindingCommandBuildInput` mirrors the framework's `ICommandBuildInfo` shape and should stay limited to the command's
  node/attribute plus optional bindable/definition context; surrounding value-site or expression relations should remain
  claim-backed topology unless the framework command boundary itself would own them.
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
  Controller containers now also spend local resource dependencies during root and child controller creation, mirroring
  `AppRoot` child-container creation and `Controller.$el` / `$attr` dependency registration before nested renderers
  perform resource lookup.
  Runtime watchers are controller-owned binding products with their own lane:
  `runtime-watcher.ts` mirrors `ComputedWatcher` and `ExpressionWatcher`,
  `runtime-watcher-factory.ts` materializes them from `definition.watches` during controller creation, and
  `runtime-watcher-publication.ts` records the controller ownership and binding identity. This mirrors Aurelia's
  `createWatchers(...)` phase, where watchers are added to the controller before ordinary renderer-created bindings,
  while keeping watcher source metadata distinct from property/listener/ref binding instructions.
  `SpreadBinding` is the deliberate exception to direct controller admission: it can own dynamically compiled inner
  bindings created by `TemplateCompiler.compileSpread(...)`, and those ownership edges are recorded as
  binding-to-binding claims so the later `Controller.bind` emulation still walks them.
- `runtime-composition.ts`, `runtime-composition-materializer.ts`, and `runtime-composition-activation.ts` own the first runtime-shaped `AuCompose`
  composition lane after controller bind and binding data-flow facts exist. Static invalid `AuCompose` inputs remain
  controller-issue pressure because lowered `SetPropertyInstruction`s can prove those failures during controller
  creation. Dynamic composition is different: the materializer evaluates `component` and `model` bindings against the
  current scope when possible, then falls back to TypeChecker-visible constructable candidates so unions such as
  `typeof ChartWidget | typeof InventoryWidget` become explicit `CompositionContext` / `CompositionController`
  products rather than a closed-looking but invisible runtime branch. The API exposes those rows through
  `RuntimeCompositions`, and `app-api-pressure` reports candidate counts, compiled-template counts, candidate
  resource-analysis coverage, candidate resource-controller count buckets, activation handoff kinds, context input
  presence and fulfillment buckets, and open composition rows so dynamic composition cannot disappear behind ordinary
  controller totals. Component/template/model fulfillment distinguishes absent inputs from direct static fulfillment,
  promise-unwrapped fulfillment, and genuinely open inputs.
  Rows also distinguish `definition-resource` analysis from `recursive-resource-instance` analysis. Definition-local
  rows are allowed to preserve public bindable unknowns, while recursive rows can close when a parent controller supplies
  concrete child values.
  The same context now reads static `SetPropertyInstruction` inputs for `model`, `scopeBehavior`, `tag`, and `flushMode`
  alongside dynamic property bindings. This is deliberate: literal AuCompose bindables are part of the hydrate
  instruction, while `component.bind`, `model.bind`, `composition.bind`, and `composing.bind` enter through
  controller-bind target accesses. Keep those two input lanes joined here rather than pretending every AuCompose input
  is a runtime binding.
  Closed static/value custom-element composition branches also materialize an aggregate child `Controller` handoff under
  the `AuCompose` host controller. TypeChecker-only candidate unions remain candidate rows rather than fake child
  controllers. This gives recursive composition a real controller/container boundary to extend later while keeping
  candidate resource-analysis coverage distinct from actual composed-child hydration.
  A statically evaluated object, instance, boundary object, or non-resource constructable component is classified as
  `object-view-model` instead of remaining open: Aurelia accepts those as ordinary dynamic component instances even
  when no custom-element definition is involved. For constructable object view-models, activation lookup checks the
  instance type because the framework invokes the constructor before calling `comp.activate?.(model)`.
  Each resolved component branch and object-view-model branch now records the `comp.activate?.(model)` /
  `update(model)` handoff shape. The activation module owns this TypeChecker-backed lifecycle check separately from
  component resolution: absent or parameterless activation is closed as such, and `activate(model)` branches compare the
  model binding source type with the first activation parameter type through the shared checker assignability helper.
  Candidate resource-analysis coverage means the resolved component resources have their own
  project-level template/runtime analyses available; it is not the same as recursive composed-child rendering. Full
  recursive child composition rendering, template-only runtime template compilation, and lifecycle run/deactivate state
  errors remain deeper controller/lifecycle frontiers.
- `runtime-spread-binding-creator.ts` contains the semantic counterpart to `SpreadBinding.create(...)`: it walks the
  modeled hydration-context controller chain, resolves captured `AttrSyntax` products, and hands them to
  `TemplateCompiler.compileSpread(...)`. `runtime-spread-compile-host.ts` contains the runtime-shaped compiler host
  that performs captured-attribute command lowering, dynamic instruction allocation, dynamic value-site/expression
  publication, and `SpreadElementPropBindingInstruction` wrapping. Keep those responsibilities here instead of
  growing the rendering materializer into a second compiler. Dynamic spread-created instructions publish
  `instruction.dynamic-instruction-originates-from-captured-attribute-syntax`,
  `instruction.dynamic-instruction-uses-captured-attribute-context-instruction`, and
  `instruction.dynamic-instruction-uses-captured-attribute-context-controller` claims so scope construction can
  reconnect them to the exact hydration instruction and runtime controller that captured the attribute without relying
  on syntax-only provenance. This matters when the same wrapper definition is rendered under different template
  controllers or parent scopes. `...$attrs` transfer walks the modeled runtime controller parent chain, matching
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
  `RepeatableHandlerResolver` categories. Static repeated-view values use the shared representative-value substrate:
  exact per-instance views are not materialized, but common object fields and string-pattern prefixes can survive as a
  conservative child-scope value. If a consumer needs correlated alternatives across fields from the same repeated item,
  model that as a bounded value-flow frontier rather than teaching the consumer to special-case `repeat.for`.
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
  static string `component` / `view-model` names probe the parent hydration-context controller container, including
  controller-local dependency resource slots, and map missing custom elements to `AUR0806`. Runtime composition
  re-entry/deactivation errors remain unclaimed until lifecycle phases are
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
  Interpolation bindings are handled as runtime-html handles them: each interpolation hole behaves like an
  `InterpolationPartBinding` expression for bind-time behavior and value-converter publication, rather than treating the
  outer interpolation string as an inert wrapper. Behavior application and issue products source to the exact behavior
  name span when the carrier comes from an admitted source file, not just the whole binding carrier span.
  Binding-mode behaviors (`oneTime`, `toView`, `fromView`, and `twoWay`) are modeled as resource-visible framework
  bind-time effects, not parser aliases. Their effective mode is shared through `runtime-binding-mode-behavior.ts` so
  controller bind target access, value-converter phases, bound-controller values, template-controller source assignment,
  and observation data-flow all see the same post-`astBind` mode without letting unresolved behavior syntax silently
  mutate binding direction.
- `runtime-value-converter.ts` and `runtime-value-converter-materializer.ts` own value-converter invocation pressure
  that belongs to a rendered binding expression rather than to resource lookup. Application products now distinguish
  `to-view` and `from-view` phases when binding mode proves target-to-source writeback; data-flow owns the exact
  `fromView` return-type projection and assignment strictness, while this materializer owns phase publication and
  converter-owned framework issues. The first modeled issue path is
  `SanitizeValueConverter.toView`: when the compiler resource scope resolves the built-in `sanitize` converter and the
  active container tree has no modeled `ISanitizer` resolver, semantic-runtime spends runtime-html
  `method_not_implemented` (`AUR0099`) for the default throwing sanitizer. A modeled app `ISanitizer` registration
  suppresses that issue. Converter application and issue products source to the exact converter name span when possible,
  including converter uses inside interpolation holes.
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
  Recursive child custom-element rendering is guarded by controller ancestry over custom-element definition handles,
  not by fresh controller product handles, so self-recursive or mutually recursive component templates stay finite while
  still exposing the first aggregate child-view surface. When the guard is reached, the child controller records a
  `recursive-hydration-boundary` lifecycle step and API rows report `childViewRenderingState=recursive-boundary` rather
  than publishing an open seam; this is an intentional finite aggregate boundary, not a hidden proof of per-instance
  recursive activation. Recursive rendering work should extend this phase instead of pulling runtime instance concerns
  back into the compiler-front-door pass. Compiled instruction products are definition-level identities, while runtime
  controller frames are instance-level identities: recursive rendering can create several controllers from the same
  instruction product under different parents, so scope construction and branch-link publication must use the active
  parent controller context instead of a global instruction-to-controller lookup.
- `template-controller-scope-materializer.ts` owns the TypeChecker-backed control-flow handoff for built-in template
  controllers. `template-controller-flow-scope-materializer.ts` applies the built-in controller-flow dispatcher and
  publishes link-hook claims for branch controllers whose framework `link(...)` method attaches them to another
  template controller: `else` links to the previous `if`, promise result controllers link to the parent `promise`, and
  switch cases/defaults link to `switch` when present. Keep these branch relationships in the controller graph rather
  than baking them into expression evaluation. `template-scope-type-projector.ts` owns the TypeChecker support used by
  this phase: listener `$event` types, repeat override locals, iterator local types, repeat source compatibility,
  let-binding value types, promise result slot types, template-controller primary value evaluation, and the non-nullish
  object context used by `with.bind`. Keep those reusable projection rules there instead of duplicating them in cursor,
  diagnostic, or data-flow answer code.
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
  `HTMLElementTagNameMap`/`SVGElementTagNameMap`/`MathMLElementTagNameMap` hit or from the broad
  `HTMLElement`/`SVGElement`/`MathMLElement` fallback, because
  fallback rows are honest host-node or web-component pressure rather than custom-element guesses. Controller view-model
  targeting comes from renderer dispatch and child-controller creation, not from tag-name heuristics. Property,
  interpolation, and spread-value bindings all use the same renderer-owned target
  handoff when the compiled target is a child controller, matching Aurelia's `getTarget(target)` renderer behavior
  instead of treating interpolation as a node-only write. Object-side observation follows Aurelia's framework fallbacks:
  accessor lookups select the runtime `PropertyAccessor`, while observer lookups select `ComputedObserver` for getter
  descriptors, setter-only configurable accessor descriptors, and function-key observer requests, or `SetterObserver`
  for ordinary and dynamically-created data keys.
  The checker still contributes property existence, writability, and type facts for downstream policy and data-flow
  products; TypeScript `readonly` is not itself an ObserverLocator computed-observer signal.
  App-authored `NodeObserverLocator.useConfig(...)` service state is consumed only on observer lookup paths, matching the
  framework split between `getAccessor(...)` and `getObserver(...)`: a host-node `.bind` can remain an element property
  accessor, while `.two-way` / `.from-view` reaches the configured node observer unless an accessor override owns that
  property.
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
  `with.bind` non-nullish object binding-context rule, branch-local `if.bind`/`else` narrowing, switch/case branch
  scope creators, promise result locals, and let-binding target-context rule so expression inquiry can use the same
  scope substrate as runtime-shaped compilation.
  Listener and state-dispatch event scopes keep `$event` as the DOM event type, then attach member-type refinements for
  `$event.currentTarget` and native form-control `$event.target` through the authored host element. This preserves normal
  event members while letting form payload expressions such as `$event.target.value` close through the same DOM
  tag-name-map substrate as observer lookup.
  It also models target-to-source bindable assignments that create runtime-only binding-context names for the binding
  expression itself and for later template expressions. A two-way/from-view bindable can write a previously undeclared
  scope name; the source expression that names the slot should be analyzed with that runtime-assignment slot already
  visible, and later sibling/descendant expressions should see the same name after the instruction that wrote it. The
  slot stays runtime-only for assignment policy, but can retain the bindable's TypeChecker member as a type carrier so
  repeat locals and member completions degrade to the actual target type instead of to a missing-slot-type seam. When
  the bindable itself is untyped, the remaining authoring pressure is honest `any`/weak-type pressure from the plugin or
  app surface, not a lost scope handoff.
  Dynamic instructions compiled from closed `...$attrs` captures reuse the hydration context that captured the
  attribute; nested `...$attrs` transfer moves to that context controller's parent. This lets wrapper components forward
  expressions such as `value.bind="email"` into an inner input while typechecking `email` against the parent view model.
  If no parent hydration context is modeled, the transfer is an explicit open runtime boundary instead of a
  definition-level capture fallback. Child custom-element instructions create a child view-model scope for bindable
  and target-flow analysis, and scope construction also walks the child resource's compiled-template instructions under
  that child scope when runtime rendering created an aggregate child controller view. Recursive component definitions
  are guarded by controller definition ancestry so static analysis stays finite while still preserving usage-local
  wrapper/capture semantics. Repeated runtime instances still use aggregate compiled-template products rather than
  per-instance template products.
  Aggregate child renderings are controller-topology evidence, not public binding-row ownership by themselves. API
  projections that expose binding, target-access, value-channel, data-flow, and observed-dependency facts should prefer
  the authored source span's owning template, because captured wrapper expressions can render inside the child template
  while remaining source-owned by the parent usage template.
  Listener binding instructions receive a derived expression scope with the runtime
  `$event` override-context slot typed from DOM event maps for the event name. This models `ListenerBinding.callSource`
  rather than a completion special case, and it gives listener-returned functions the same first-argument event type
  when arrow callbacks such as `(e) => e.stopPropagation()` are evaluated by the TypeChecker substrate.
- `template-controller-semantics.ts` records built-in template-controller child-scope, child-view cardinality,
  primary-value domain kind, and control-flow roles as product-side semantic profiles. These semantics classes carry
  direct `auLink` anchors to the runtime-html template-controller classes because they are the product-side behavior
  counterpart used by scope, controller, inquiry, and API projections. The value-domain kind is intentionally separate
  from bindable type projection: framework primary values such as `case.value` are open-ended, while secondary
  bindables such as `case.fallThrough` still need their own finite/static or checker-backed domain. Static `case`
  values can enter through compiler-lowered `SetPropertyInstruction`s while bound values enter through expression
  sources. Static instruction values are runtime strings, so checker overlays must quote them as TypeScript string
  literals instead of copying the raw attribute value as an expression. Consumers should read both static and bound
  values through the template-controller value-source helper rather than assuming all controller values are property
  bindings. Static `fall-through` follows runtime-html's `case` multi-attribute syntax
  (`case="value:list; fall-through:true"`) rather than a sibling attribute on the controlled element. Runtime-html
  built-in coverage is guarded by
  `contract:template-controller-built-ins`, which exercises `if`, `else`, `repeat`, `with`, `portal`, `promise`,
  `pending`, `then`, `catch`, `switch`, `case`, and `default-case` through controller rows and generated overlay type
  inference. The same contract also compares `template-controller-semantics.ts` with
  `RuntimeHtmlBuiltInResourceCatalogs.DefaultResources` and the framework-source-derived runtime-html target/name set,
  so resource and semantics mirrors drift together instead of letting a fixture pass hide catalog skew. Atlas
  `framework.resources -- --projection=convergence --resourceKind=template-controller` is the broader framework check:
  it currently sees the twelve runtime-html controllers plus `ui-virtualization:VirtualRepeat`. The runtime-html
  contract stays exact, while the full framework semantics catalog also covers `virtual-repeat` through the
  `@aurelia/ui-virtualization` resource-admission path. Deeper virtualization service, DOM renderer, scroller, and
  collection-strategy behavior remains separate plugin pressure.
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

`template-type-system-overlay.ts` is the first checker-overlay consumer for template scope. It consumes compiled
template/runtime products and emits a virtual TypeScript source that replays authored expression text in the current
`BindingScope` ancestry rather than inventing TypeScript from projected display strings. The current supported lane is
root view-model slot aliases, nested `repeat.for` scope blocks, `let` scope declarations from runtime scope effects,
built-in `if`/`else` condition blocks, including fallback branches where the checker could not narrow but Aurelia
still created a conditional child view, repeat override locals such as `$index`/`$odd`/`$length`, listener-event layers for `$event`
expressions, `with.bind` non-nullish binding-context layers, `portal` pass-through child views, `promise`
pending/result context layers, switch/case branch layers with a named `__au_switch_case(...)` helper, state binding
scope layers,
importable value-converter `toView(...)` call surfaces, and runtime-assignment slots introduced by from-view/two-way
bindable flows. Runtime-assignment slots may reuse an already-visible in-scope alias when the
materialized slot and alias carry the same checker reference; otherwise they use an importable target-member
indexed-access type when the target bindable member is known. The overlay
must not stringify projected display types as a shortcut. Unsupported owner kinds, non-importable view-models, and
non-TypeScript-representable expression surfaces must stay explicit skips until the relevant runtime
or parser semantics are modeled. `template-type-system-overlay-expression.ts` owns the copied-expression projection:
it decides whether an Aurelia expression has a TypeScript-compatible authored source surface, and keeps value
converters without an importable resource target, binding-behavior bind semantics, custom expressions, and
statement-shaped bindings as named pressure instead of letting the checker report generated-source noise. Boundary
`this` is TypeScript-compatible because the generated overlay is wrapped in a typed resource-template function.
Importable value converters are projected as checker calls to the real converter instance
type, with the converter name and each argument mapped back to authored template spans and the semantic expression
product that generated the checker segment. Built-in converters can derive that importable target from the checker
carrier declaration when resource identity metadata does not expose a module path. Missing converters deliberately use
an unknown converter placeholder so the inner expression and arguments stay checker-visible while semantic diagnostics
own the missing-resource issue. The same generated expression parts feed repeat iterable, let, condition, `with`,
promise, and state-binding layers, so Aurelia-specific expression projection is not duplicated between standalone
probes and controller/scope setup. `template-type-system-overlay-plan.ts`
owns the intermediate overlay layer and emitter shape; keep construct planning from semantic products separate from
generated TypeScript text emission as the supported Aurelia surface widens. Keep this builder downstream of scope materialization: if a future overlay needs a new local,
route parameter, `$event`, or plugin scope fact, add that fact to the owning semantic materializer first instead of
teaching the overlay builder to rediscover it from raw template text. `template-expression-selection.ts` owns shared
template expression/value-site selection plus expression-parse to runtime-scope lookup; cursor inquiries, diagnostics,
and overlays should reuse that selector so they agree on the semantic product locus before TypeScript projection
starts. `BindingScope.scopeCreators` is the hot-object mirror for framework-semantic products that
create or narrow a scope: runtime scope effects, listener events, state binding scopes, runtime assignments, and
template-controller branch/value facts. Use it for consumers that need to replay scope causes in order, rather than
searching by source address or trying to recover them from rendered instructions. Same-level synthetic scopes preserve
creator facts from their base scope so overlay consumers can replay the let/repeat/runtime-assignment setup visible
through copied scope slots before adding a branch condition. When `if.bind` or adjacent `else` cannot produce a
narrowed TypeChecker scope, scope construction still records a `TemplateControllerCondition` creator with the original
condition instruction and truthy/falsy polarity so overlay/inquiry consumers can replay the branch guard instead of
losing it as an anonymous branch. `switch`/`case` overlay replay uses the authored switch expression in the generated
guard so TypeScript narrows the same expression seen by case-body calls. Static `case="value"` sources, bound
`case.bind` sources, scalar case values, and array-valued cases share the same value-source path and
`__au_switch_case(...)` helper. Case branches replay blocking previous case values and static fall-through chains so
a fall-through successor can narrow to the union of the matched starter cases plus its own case. `default-case`
excludes readable direct case values. Dynamic/unknown fall-through or unreadable previous case values degrade that
branch to a plain overlay block instead of inventing a predicate. The durable `BindingScope` branch path uses the same
case-value and fall-through helpers through `TemplateControllerFlowScopeMaterializer` and
`CheckerExpressionScopeNarrower`, so cursor inquiries, template diagnostics, and overlays share direct `AccessScope`
and direct `AccessMember` equality-domain refinements instead of carrying separate switch policies. The `$event`
overlay helper uses DOM event maps for the
base event object and consumes `TemplateScopeTypeProjector` member refinements for `currentTarget`/`target` when the
materialized `$event` slot exposes simple checker-visible target types. Keep further event precision in that
scope-projection handoff rather than adding local HTML tag switches. `$this`, `$parent`, and boundary `this` source
tokens now copy into TypeScript only when generated aliases can be derived from `BindingScope` replay or the
resource-template function boundary: root `$this` points at the function `this`, repeat scopes declare `$parent` plus a
current `$this` object synthesized from replayed binding-context slots
such as `{ item }` or `{ key, entry }`, and nested repeat parent aliases carry a typed `$parent` chain so
`$parent.$parent.*` follows Aurelia ancestor lookup without rewriting authored text. Non-replayed binding-pattern
context shapes remain explicit skips rather than hidden generated-TypeScript name-resolution diagnostics. `with.bind`
captures the outer `$this`, evaluates the source expression once, casts the generated binding context through
`NonNullable<typeof source>`, and then projects ordinary local declarations such as `label` from the materialized
binding-context slots; listener-event scopes nested under that value scope retain the generated `$parent` alias so
`$parent` targets the outer component rather than the value object. Promise `then`/`catch` target expressions are
promise-result scope declarations, not standalone expression probes. Promise `then` locals use the awaited parent
promise type, promise `catch` locals use `unknown`, and state binding scopes use the modeled state context member
expressions from `StateBindingScope` rather than searching by raw local names.
`app-api-pressure.mjs` prints non-extractive overlay skip summary buckets so larger app-shaped probes can distinguish
remaining ancestor-alias pressure from value-converter, binding-behavior, or custom-expression pressure without
promoting source details.
Binding behaviors are value-transparent for overlay expression checking: framework `astEvaluate` returns the wrapped
expression, while bind-time behavior effects and diagnostics are owned by `runtime-binding-behavior-materializer.ts`.
`template-type-system-overlay-prelude.ts` contains only emitted helper declarations, each with an owner and emitted-name
inventory. Promise result locals, `$this`/`$parent` aliases, and temporary scope locals are generated layer facts rather
than prelude helpers, so do not add empty prelude rows for constructs that emit no reusable declaration.
`template-type-system-overlay-expression-support.ts` is the compact ownership matrix for every semantic-runtime
expression AST kind. Read that table before adding another `UnsupportedSyntax` branch: ordinary TypeScript-shaped
expressions can copy authored source, scope-root expressions depend on BindingScope alias replay, value converters
lower through modeled value-converter call surfaces, binding behaviors unwrap to their inner expression, `repeat.for`,
interpolation, and binding patterns are owner-handled, `CustomExpression` currently belongs to i18n translation binding,
and destructuring assignment remains a statement-emission frontier. When a TypeScript-shaped parent contains a modeled
generated child expression, the projector now splices the child parts into the authored parent source while preserving
source segments for diagnostics. This is a substrate capability, not an authoring grammar claim: framework value
converters are chain expressions, so app fixtures should not invent arbitrary `foo(value | converter)` template syntax.
Named helper declarations still belong in `template-type-system-overlay-prelude.ts`; add helpers there rather than
embedding ad hoc declarations in expression projection.
The copied-expression projector may therefore unwrap the behavior node for value typing, but should not inline
behavior-specific bind semantics into generated TypeScript. Value converters are intentionally different because
`astEvaluate` delegates to `useConverter(...)` and the converter can change the value; the overlay represents them only
when resource recognition supplies an importable converter target. The generated helper mirrors framework
`useConverter(...)`: checker-visible `toView(value, ...args)` methods provide the result and argument policy,
literal `withContext = true` inserts the caller-context parameter before authored converter arguments, and converter
types without `toView` preserve the input value instead of producing a TypeScript-only missing-member error.

Parent-to-child bindable values are also scope facts before they are overlay facts. `RuntimeBoundControllerValueTable`
records property bindings that render against child controller view-models while evaluating in the parent scope.
Scope construction projects unambiguous table entries into the child custom-element root `BindingContext`, and the
overlay aliases those slots with importable member types when possible. This is what lets a child template type-check a
parent-bound callback bindable against the parent's function type instead of the child class's placeholder initializer.
Do not suppress TS2554/TS2345 in the overlay when this handoff is missing; fix the controller/scope value flow first.
The project pass schedules runtime analysis over compiled resources by rendered-child dependency SCCs. Acyclic parents
analyze before rendered children so child root overlays can spend completed parent-bound values; mutually recursive
resources analyze as one finite group against predecessor facts only, which keeps recursive rendering deterministic
instead of depending on app resource registration order.

Inline custom-attribute multi-binding is a source-provenance and value-flow canary for the overlay path. Secondary segment addresses
are created during binding-command lowering, so value-site publication must receive the freshly materialized
`SourceSpanAddress` parse context directly instead of looking it up from the store before commit. Commanded segment
execution must likewise use the segment value address as the expression source address. If a generated overlay starts
copying the full attribute value instead of the segment expression, fix the lowering/value-site handoff first; do not
repair it in the overlay builder.

Public template diagnostics consume this overlay only under the `type-projection` diagnostic policy. The public row is a
TypeScript-authority template diagnostic mapped through overlay segments back to the authored expression span, with a
structured action target. Nullish overlay rows point at guarding or narrowing the expression; other admitted checker
rows currently use inspection until a more precise semantic repair policy owns the code. Do not expose every checker
diagnostic from the generated file: syntax errors,
missing synthetic names, and implicit-any fallout are usually overlay/substrate pressure, not user-authored template
truth. If the semantic template diagnostic lane already owns a missing-member diagnostic for the same authored span,
the overlay suppresses the equivalent TS2339/TS2551 row; TypeScript-native rows such as argument mismatch remain public
checker evidence. The admitted code policy currently proves argument mismatch, arity mismatch, and nullish access in
the public fixture, plus value-converter argument mismatch in the value-converter fixture. Keep it narrow until ancestor
scope aliases and event target/currentTarget refinements have first-class overlay semantics.
