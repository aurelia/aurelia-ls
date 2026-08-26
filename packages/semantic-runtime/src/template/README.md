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
  expression parser, and attribute mapper. The world detail also owns the app-visible `NodeObserverLocator`
  configuration consumed by runtime binding analysis and the app-effective `IKeyMapping` state consumed by listener
  authoring; do not carry that state beside the world in a second emission field.
- `compiler-world-materializer.ts` materializes a compiler world after earlier passes have selected the visible container,
  resource headers, and syntax executables. It constructs the scope and compiler service products, but it does not
  rediscover source configuration. Published compiler worlds are immutable semantic inputs; lookup memoization and
  attribute-pattern registration do not mutate them during template compilation. The app-world composition currently supplies non-syntax resources from
  DI-produced container resource slots, and supplies attribute-pattern plus binding-command executables from the
  configured framework syntax-catalog admissions for the owning app-root sequence. Duplicate attribute-pattern
  registrations publish template-compiler `attribute_pattern_duplicate` (`AUR0089`), and duplicate binding-command
  keys publish warning-severity `binding_command_existed` (`AUR0157`) before the duplicate executable can become
  spendable compiler-world state. Derived component worlds use one request shape for both construction and projection.
  Construction registers exact reads of the parent products whose values it inherits; side-effect-free projection is
  reserved for live-authority validation and does not pretend to publish or consume those products.
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
- `template-compilation-cohort.ts` and `template-compilation-cohort-planner.ts` own the complete pre-compilation plan.
  `App` and `Authoring` are the compiler-cohort kinds; app visibility, route components and fallbacks, declared resource
  dependencies, and authoring policy are retained admission origins rather than competing cohort identities. The
  planner partitions routeables by their owning app root, computes dependency closure before compilation, and gives
  every owner a deterministic retained parent world containing that owner plus its own declared dependencies. Owner
  membership supplies direct compiler metadata/currentness but owns no runtime lookup key unless the same definition is
  independently registered; declared dependencies participate in exact `TemplateResourceScopeLookup` precedence. Stable
  project/app-root/owner keys and exact resource-scope comparison prevent queue order, array position, aliases, or
  source-witness changes from silently selecting a different world. The resulting project plan is immutable candidate
  data consumed directly by the production app computation; cohort currentness and replacement belong to that
  computation graph rather than to a second callback-based authority. Component worlds, the standalone authoring
  container/world, and its built-in syntax/resource/renderer catalogs all spend the caller's publication context, so a
  staged project replan cannot leak support records before the transaction commits.
- `template-compilation-project-pass.ts` is the current project-level template entrypoint. It consumes app-world
  compiler worlds and resource/router authority once, obtains the complete cohort plan, and uses that plan for eager
  compilation-unit materialization, HTML parsing, attribute syntax parsing, attribute classification, compiler-owned
  value-site selection, binding-command lowering, compiled-template handoff materialization, and runtime analysis.
  The production app computation enters one logical child per stable authored owner and compiles every app/authoring
  cohort plus recursive local template under that family. Exact authored-source input reads and compiler reads join the
  same child manifest as its compiler-front-door outputs. Compiler-scope closure reads exact materialization membership
  for each participating container/resource owner; unrelated owners no longer create an open whole-kernel dependency, while
  candidate local definitions become ordinary producer-to-consumer child edges. The production activation layer is a
  deterministic star: pre-template executes first, each independent owner family then either carries its exact prior
  closure or compiles afresh in plan order, one project-wide template-runtime child analyzes the complete front door,
  and post-template fan-in consumes that whole result. A separate generic scheduler would add no ordering information
  to this topology. App-root compiler worlds remain pre-template outputs: they do not
  yet have an independently reusable dependency closure, and lexically nesting a child around their construction would
  create a flat sibling rather than hierarchy. Compiler resource reads revise over the facts consumed by each operation:
  lookup/capture/lowering metadata, bindables, and owner facts are distinct projections rather than one hash of the full
  definition. Scope and closure remain currentness witnesses, while an equal operation result permits exact family carry
  after those witnesses rebase. Fresh and carried observations in one compiler scope share a scope/closure snapshot at
  the kernel projection revision; staged or committed publication movement invalidates that snapshot before the next
  validation. This preserves per-operation result reads without re-enumerating the same owner closure for every lookup.
  Runtime/checker analysis remains project-owned because its evaluator session, SCC schedule,
  expression world, and bound-controller values cross family boundaries; the explicit template-runtime child records
  that boundary honestly instead of assigning unsupported family ownership. It re-observes the compiler-world authority
  reads and consumes the exact resource definition, compiled-template
  envelope, render targets, instruction sequences, instructions, compiler world, resource scope, Rendering,
  TemplateCompiler, resource resolver, expression parser, AttrMapper, binding-command resolver, and authored attribute
  syntax products plus typed details. The exact current resource-definition read is also the carrier supplied to
  runtime analysis: a carried compiler front door must not validate a replacement detail and then keep using its prior
  definition object. This includes local-template definitions and instruction details produced by the same family child;
  stable envelope handles do not imply that referenced semantic details are unchanged. The post-template child consumes
  the runtime child as one complete in-memory result, so it cannot carry observation/router state across an executed
  runtime generation whose individual kernel outputs happened to retain. Rendering and
  runtime `compileSpread` execute the compiler service set, so those inputs are not implied by carrying a world
  reference. A projected compiler-world authority may yield a distinct immutable world object under the same product
  handle, so the live authority read and catalog detail dependency are both retained rather than collapsed by object
  identity. The shared TemplateCompiler front-door state classifier excludes no-template and already-compiled owners
  before child scopes are entered; authoring admission consumes that same classifier rather than duplicating its
  predicate.
  The pass owns the shared `CheckerExpressionTypeWorld` for all resource runtime-analysis frames in that project
  compilation, while each resource profile reports expression-cache deltas from a local marker. Keep future
  runtime/checker lifetime work at this project-pass boundary instead of rebuilding an expression world per resource.
  Production runs enter through `AureliaAppWorldProjectComputationService`: configuration, DI, resources, compiler and
  runtime products, checker projections, exact compiler/kernel/source reads, and omitted-output withdrawal form one app
  publication. A
  prepared emission remains run-bound and invisible; commit installs one generation-guarded, store-backed expression
  world shared by every retained resource. Replacement or disposal revokes retained checker reads and lazy projections
  together with the kernel closure. Resource convergence records the complete authored-file revision that produced each inline
  or external template, and preparation requires the current authored-source input to match that producer revision
  before it can certify the candidate. Commit then revalidates the same immutable input values, closing both pre-prepare and
  prepare-to-commit source races.
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
- `compiler-read-view.ts` is the required run-scoped read boundary for an incremental template front door. It delegates
  resource, bindable, command, pattern, parser, AttrMapper, and TemplateCompiler operations to the admitted immutable
  compiler world while registering the exact positive or negative keys that were read. The compiler-world authority is
  re-read at commit, and each observation keeps scope, closure/support, and result revisions distinct. Candidate-aware
  definition and materialization reads come through the computation's domain projection so the compiler observation owns
  one dependency instead of also registering lower-level exact reads whose sensitivity it supersedes. This view is not a
  second resource catalog. Ordinary eager compilation uses the same operations with a fixed world authority.
- `configuration/app-analysis-computation.ts` is the production authority around the complete app project pass. One project
  locus owns one current generation regardless of analysis depth or authoring policy; those are replacement inputs, not
  parallel owners of stable handles. `AureliaAppWorldProjectEmission` pins the exact generation used by its downstream
  observation, state, capability, and router products. Replacement or disposal makes that whole app emission stale and
  public queries fail closed until `SemanticRuntime` rebuilds a coherent app epoch; template products never hot-swap
  underneath old fan-in products. A previously obtained `SemanticAppTemplateQueries` object rechecks the same authority
  at every public operation, so retaining the query capability cannot bypass generation revocation.
- `compiled-template-comparison.ts` compares compiled-template structure separately from source/provenance witnesses.
  `compiler-world-comparison.ts` owns the corresponding slot comparisons for compiler worlds, resource scopes, compiler
  services, parser machines, binding commands, attribute patterns, renderers, and compiler issues. Resource scopes and
  resolver services compare reference-shaped visibility rows; the resource-definition detail slot remains the sole rich
  definition authority and consumers hydrate it through their current read view. Stable record handles are resolved
  against old and proposed views, so semantic changes replace while witness-only movement refreshes the candidate. Do not recreate aggregate
  compiler-world equality in a materializer or scheduler.
- `TemplateCompilerWorldEmission` is a generation-local execution frame because it carries the live DI `Container`.
  Its published world and service objects are immutable semantic candidates: an equal candidate may be distinct from the
  canonical detail retained by the store. The outer emission is therefore rebased to the current container generation,
  while slot decisions own semantic reuse. Object identity is neither currentness nor semantic equality.
- `html-ir.ts` models authored HTML before Aurelia syntax interpretation. It preserves source addresses and recovery
  observations without performing resource lookup.
- `browser-template-draft.ts`, `browser-template-parser.ts`, and `browser-template-selection.ts` provide the first product-free, run-local
  browser-effective template boundary. The parse5 adapter is pinned to an explicit HTML-template fragment context with
  scripting disabled, retains effective structure plus raw UTF-16 source locations, and leaves implied or unresolved
  location associations explicit. Carrier selection separately reproduces the framework's current string-input wrapper
  rule, including discarded immediate-sibling effects. The parse5 AST never enters semantic products, and the helper is available only through the explicit
  `@aurelia-ls/semantic-runtime/browser-template` subpath so ordinary IDE/MCP imports do not load the parser. This is a
  characterized candidate input boundary, not yet a durable kernel product or the production compiler traversal.
- `browser-template-correspondence.ts` conservatively relates one authored draft to the exact browser draft and parser
  authorities before carrier selection. It uses opening-token/range anchors for exact occurrences, reconstruction
  cohorts for one-to-many recovery, named implied/drop/factory derivations, and explicit unresolved partitions for
  composite, partial, normalized-subspan, or profile-divergent cases. Stable occurrence keys combine template identity
  with unambiguous authored or browser paths; a separate currentness receipt includes source revision, markup digest,
  authored recovery policy, parser authority, and planner schemas. The helper is product-free and exported only through
  the explicit browser-template subpath; the materializer spends it into structural and derivation products.
- `template-structure.ts` and `template-structure-derivation.ts` define the durable, parse5-independent structural
  vocabulary behind that boundary: parallel immutable browser-effective and compiler-transformed tree/node/attribute
  records plus ordered many-input/many-output derivations. Cardinality carries merge, reconstruction, drop, and
  implied/generated facts; there is no exclusive origin enum or second provenance graph. The detail slots own
  semantic-versus-witness comparison, and unresolved authored/effective partitioning uses the typed
  structure-correspondence seam.
- `browser-effective-template-materializer.ts` spends the opt-in authored draft bindings, browser draft, carrier
  selection, and correspondence plan into one atomic kernel publication. It materializes every structural occurrence,
  an explicit generated or selected compiler carrier, ordered tree-builder/factory derivation hyperedges, and typed
  seams for every unresolved partition. Parser envelopes remain witness data; authored addresses enter only through
  retained authored HTML product bindings. This is not yet wired into the production compiler front door.
- `template-compiler-occurrence.ts` imports only the browser-effective compiler-carrier graph into a fresh mutable
  execution forest. Stable occurrence keys are independent of live paths; private edge collections and forest-owned
  move/detach operations preserve coherent root, child, template-content, and attribute ownership while the complete
  historical inventory remains available for later structural derivations. Input-origin indexes are one-to-many;
  forest-owned generated factories admit pure generated outputs as well as clones/text splits that independently retain
  an input origin. Every generated occurrence carries its generation context, semantic operation key, ordered nonempty
  causes, output role, and ordinal. Scalar text/comment/attribute values remain read-only until their mutation can
  travel through the ordered compiler-effect owner rather than bypassing provenance.
- `template-compiler-structural-execution.ts` is the product-free join between that forest and the existing
  `TemplateCompilerTargetPlan`. It assigns one exact template carrier/content root per target context and realizes
  complete rows as either marker/target adjacency or marker/start/end render locations, including marker-only outer
  template-controller definitions. Rows can spend only singular 1→1 HTML-tree-builder origins, logical target
  occurrences are unique, inert nested template content is excluded, and geometry stops at the first open row/frontier.
  Compiler-marker preorder and ordered live/explicitly-consumed authored membership must match each context plan;
  authored marker-shaped comments remain plain and static zero-row child contexts still require their own carrier.
  Immutable seeded parent/owner placement plus typed input operations prevent preorder-preserving reparenting and clone
  laundering. Contexts retain their exact instruction/projection authority: ordinary projection contributors transfer
  intact, insignificant host whitespace is consumed without allocating a definition member, and bare template wrappers
  are consumed while only their direct content children transfer. Exact `[au-slot]` attribute references and known
  `AuSlot.processContent` removed-child references preserve their source-edge dispositions. Text expansion is an
  explicit source-anchored 1→N operation, and output bands retain browser-input order across replacements. Generated
  authority is session-branded and role-checked, including exact generated carrier pairs. This is
  execution mechanics only: it does not freeze transformed products, allocate durable targets, publish kernel records,
  or switch the production compiler traversal.
- `template-source-coordinate.ts` is the shared decoded-template range boundary used by authored HTML materialization and
  future exact structural correspondence. It validates offset-map shape and maps only a caller-proved contiguous range;
  parse5 token envelopes must never be passed through it merely because they are non-null.
- `runtime-dom-name.ts` projects authored tag and attribute spelling into the browser DOM names consumed by framework
  services and TypeScript DOM maps. HTML names normalize to their DOM casing; SVG element/attribute adjustments come
  from the browser-owned HTML foreign-content table, independently of Aurelia's SVGAnalyzer capability vocabulary.
  AttrMapper and DOM type lookup must share this projection with NodeObserverLocator rather than growing separate case
  heuristics.
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
  but they still use the same parser machine. `attribute-syntax-source.ts` publishes the raw-name, target, command, and
  pattern-part addresses for both strata from the syntax's authored name carrier. Every interpreted pattern part keeps
  its relative occurrence before semantic transforms such as deprecated `view-model.ref` to `component.ref`, so
  listener modifiers and authored ref targets retain exact loci without rescanning the attribute name downstream.
  `TemplateResourceCompilationEmission.authoredAttributeSyntaxes` is the explicit all-authored
  projection for references, tokens, capability demand, and other syntax-wide consumers. Classification, precedence,
  and HTML-attribute ownership remain top-level-only. `parseBuiltInAttributeSyntax(...)`
  is the product-free helper for checking generated/source-lowering attributes
  against the built-in pattern inventory; configured compiler-world visibility
  still belongs to compiler-world materialization and the attribute-syntax
  materializer.
- `builtInBindingCommandExpressionType(...)` is the product-free companion for
  generated or previewed command values. It mirrors the built-in command build
  bodies: property commands parse with `IsProperty`, listener and state-binding
  command values parse with `IsFunction`, `for` parses with `IsIterator`, and
  static translation text has no expression parse. Use it for source-lowering
  integrity checks instead of rebuilding command-specific parser policy in
  individual source producers.
  `@aurelia/state` follows the framework renderer split: `.state` uses the
  function/listener entry family because the renderer later parses the source as
  `IsFunction`, while `.dispatch` is a state command whose renderer parses the
  action source as `IsProperty`.
- `builtInBindingCommandAttributeText(...)` is the product-free source
  companion for generated binding-command attributes. Use it when a source
  producer needs `target.command="value"` text so authored-name serialization
  stays next to the built-in attribute-pattern parser it must round-trip
  through.
- `special-attribute-source.ts` owns compiler-special template attribute names,
  lookup helpers, and source serialization for attributes consumed before
  ordinary binding/resource lowering. `as-element` changes custom-element
  definition lookup, while usage-site `containerless` changes hydrate
  instruction assembly.
- `component-lifecycle-source.ts` owns product-free TypeScript source
  serialization for component view-model lifecycle hook methods discovered by
  runtime-html `Controller` and `LifecycleHooks`. App-builder can spend this
  helper for class-member fragments, but runtime lifecycle effects still belong
  to controller/hydration products rather than source generation alone.
- `authored-template-source.ts` owns product-free authored-template text
  primitives: double-quoted attribute escaping, plain text-content escaping,
  static attribute serialization, structured attribute source, structured
  element source, mixed text/element child nodes, child indentation, and
  structured element attribute append.
  Source producers should use this before inventing local `name="value"`,
  start/end tag, child-node, or visible-text serializers.
- `binding-expression-source.ts` owns product-free authored binding-expression
  syntax fragments used by source producers: text interpolation holes, iterator
  headers, binding-behavior modifiers, and value-converter modifiers. Keep those
  source forms here so app-builder and future edit/generation surfaces do not
  grow parallel expression-string formatters.
- `template-controller-source.ts` owns product-free source serialization for
  built-in template-controller attributes such as `if.bind`, `repeat.for`,
  promise branch aliases, `with.bind`, and `portal` multi-binding values. Keep
  those forms next to `template-controller-semantics.ts` so source generation,
  overlay pressure, and controller-scope materialization spend one controller
  vocabulary.
- `au-compose-source.ts` and `au-slot-source.ts` own product-free source
  serialization for runtime-html composition/projection resources. They share
  framework resource names and bindable names with runtime composition,
  controller creation, and built-in resource definition materialization.
- `portal-source.ts` owns the portal template-controller source form and static
  insert-position vocabulary. Runtime controller validation and app-builder
  lowering should spend that vocabulary instead of maintaining separate accepted
  literal lists.
- `attribute-syntax-materializer.ts` spends HTML attribute products through the compiler world's `IAttributeParser`
  service. It preserves the runtime split between the `SyntaxInterpreter` match and the handler method execution, then
  emits `AttrSyntax` products plus resource-reference claims to the winning attribute-pattern executable.
- `attribute-classification-materializer.ts` spends `AttrSyntax` products through the compiler world's resource resolver
  and binding-command resolver. It stops before instruction lowering, preserving the selected resource, bindable,
  command, capture, spread, and compiler-control lane as separate facts. Framework-thrown classification failures
  publish `TemplateCompilerIssue` products instead of flowing into later lowering phases. Custom-element capture
  predicates execute here, before ignore-command, bindable, and template-controller exclusions, matching Aurelia's
  per-attribute compiler order. Closed false rejects capture; closed true continues through the ordinary exclusions;
  missing/open/stateful callable execution publishes an open classification instead of silently treating the component
  as `capture: true`. Execution is registered through `TemplateCompilerReadView`: the resource definition supplies a
  stable slot, the current compiler-world sidecar supplies the closure, and incremental reuse compares the observed
  truthiness rather than evaluator object identity.
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
  target access can still map to `minLength`. The returned lowering emission retains the exact open seams collected by
  this pass; compiled-template assembly consumes those seams and issues so a custom command body cannot disappear below
  a falsely complete compiled-template state.
- `binding-command-lowering-publication.ts` owns the product envelopes for that lowering phase: source/provenance/open
  seams, ordinary command build/lowering products, multi-binding segment/syntax/lowering products, instruction identity
  publication, and the claims that connect command lowerings to produced instructions and expression parses. A segment
  preserves separate full-syntax, raw-name, parsed-target, parsed-command, and value addresses; the secondary
  `AttributeSyntax` owns the first four and `MultiBindingSegment.sourceAddressHandle` owns the value. Keep lowering
  decisions in the materializer and product/claim ceremony in this publication module.
- `multi-binding-segments.ts` owns the source-offset-preserving parser and source
  value serializer for inline custom-attribute multi-binding segments. Keep raw
  segment splitting and authored segment formatting there so command lowering
  and source producers share one grammar boundary.
- `compiler-target-plan.ts` is the sole run-local owner of compiler context and row boundaries. The root plan feeds the
  existing `TemplateRenderTarget` publication directly; template-controller and projection child contexts retain exact
  known row boundaries, projected/logical target ordinals, target kinds, authored target lineage, and instruction
  grouping. Row posture and context frontiers keep executable command/process effects from turning later projected
  ordinals into false exactness. Open command bodies still allocate their known target row with an empty exact row
  sequence. A closed text interpolation keeps one parser-owned aggregate expression product while each hole owns an
  independent complete target row, `TextBindingInstruction`, exact expression-range source, and stable chain index.
  An incomplete text parse retains one explicitly open compatibility row/instruction with a null aggregate chain
  selector so MCP and IDE keep the instruction-to-scope handoff without making that row AOT-emittable. A typed
  `compiler.open-text-expansion` seam owns that uncertainty. The root `TemplateCompilationContext` remains the durable
  compiler-environment carrier; sealed template-controller/projection target contexts are run-local construction
  authority and each publishes one child `CompiledTemplate`. Generated target ordinals restart inside that definition,
  and static zero-row children retain their context-local reachable structure. TC/projection instructions reference the
  child compiled definition directly and provide the one-way ownership edge. The plan is acyclic, sealed at assembly,
  and generation-local; transformed marker/target occurrences join it only after compiler execution owns their creation.
- `compiled-template.ts` and `compiled-template-materializer.ts` model the normalized compiler/runtime handoff behind
  the runtime's transformed template DOM, target rows, surrogate rows, and `ICompiledElementComponentDefinition`
  instructions. Root and generated child products retain context-local authored-node lineage, exact render targets, and
  row sequences. They still do not materialize the browser-parsed, compiler-mutated DOM blueprint; zero-row reachable
  nodes conserve static content but are not a substitute for that transformed tree. The missing blueprint belongs to the latent transformed
  template phase, not to the authored `HtmlParseEmission`. The materializer assembles runtime-shaped rows for text
  interpolation, let elements (including an empty `<let>` hydration row), custom elements,
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
- `compiler-instruction-order.ts` owns the framework's observer-sensitive native row order: model/value/matcher precede
  checked for checkbox/radio inputs, and multiple precedes value for multi-selects. Keep that semantic order beside
  compiled instruction assembly instead of reconstructing it in renderer or value-channel consumers.
  `native-form-control-semantics.ts` owns the shared input/select target roles and initialization dependencies consumed
  by both compiled ordering and checked/select value-channel analysis. Root
  containerless custom-element rows are render-location targets at this boundary. The instruction's `containerless`
  field retains only the authored usage flag; definition-level containerless participates in effective target geometry
  separately, matching the JIT/runtime wire. Exact transformed marker geometry remains part of transformed-template
  work, but nested row ownership is compiler-owned and no longer reconstructed at runtime.
- `runtime-rendering-materializer.ts` owns the runtime `Rendering` dispatch loop over compiled render targets and
  instruction sequences. `runtime-view-factory-materializer.ts` owns the `Rendering.getViewFactory(...)` product lane
  for template controllers: `IViewFactory` products over compiler-owned child `CompiledTemplate` definitions,
  synthetic-view aggregate products, and the claims that connect them without manufacturing resource definitions.
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
  `runtime-watcher-publication.ts` records the controller ownership and binding identity. Watcher-owned observed
  dependencies use observation's shared runtime observed-dependency publication helper so watcher and binding rows keep
  the same `ObservedDependency` product shape while preserving different owner/claim predicates. This mirrors Aurelia's
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
  presence and settlement buckets, and open composition rows so dynamic composition cannot disappear behind ordinary
  controller totals. Only `component` and `template` use Aurelia's await-thenable input contract. `model`,
  `scopeBehavior`, `tag`, and `flushMode` retain their direct values, including Promise values; every input separately
  records absent/closed/fulfilled/rejected/open state.
  Candidate discovery and candidate completeness are separate. An exact named-class type or finite union of those types
  can form a complete basis when every member maps to a custom-element definition. Broader construct signatures may
  still reveal useful resources through their return types, but remain partial because TypeScript's structural
  contract does not prove a finite runtime candidate set.
  Rows also distinguish `definition-resource` analysis from `recursive-resource-instance` analysis. Definition-local
  rows are allowed to preserve public bindable unknowns, while recursive rows can close when a parent controller supplies
  concrete child values. That distinction comes from the instruction's exact owner definition, not controller-parent
  topology; template controllers can introduce nested controllers without changing the authored rendering origin.
  The same context now reads static `SetPropertyInstruction` inputs for `model`, `scopeBehavior`, `tag`, and `flushMode`
  alongside dynamic property bindings. This is deliberate: literal AuCompose bindables are part of the hydrate
  instruction, while `component.bind`, `model.bind`, `composition.bind`, and `composing.bind` enter through
  controller-bind target accesses. Keep those two input lanes joined here rather than pretending every AuCompose input
  is a runtime binding.
  Closed static/value custom-element composition branches materialize a composition-owned child controller and child
  container, but do not admit that controller through renderer `Controller.addChild`: framework `AuCompose` owns the
  reference and activation parent independently. TypeChecker-only candidate unions remain candidate rows rather than
  fake selected children. Candidate resource-analysis coverage remains distinct from actual composed-child
  materialization.
  A statically evaluated object, instance, boundary object, or non-resource constructable component is classified as
  `object-view-model` instead of remaining open: Aurelia accepts those as ordinary dynamic component instances even
  when no custom-element definition is involved. For constructable object view-models, activation lookup checks the
  instance type because the framework invokes the constructor before calling `comp.activate?.(model)`.
  Each resolved component branch and object-view-model branch now records the `comp.activate?.(model)` /
  `update(model)` handoff shape. The activation module owns this TypeChecker-backed lifecycle check separately from
  component resolution: absent or parameterless activation is closed as such, provably non-callable `activate` members
  are invalid, weak callability remains open, and callable `activate(model)` branches compare the model binding source
  type with the compatible first-parameter candidates through shared checker signature and assignability helpers.
  Candidate resource-analysis coverage means the resolved component resources have their own project-level
  template/runtime analyses available; it is not a claim that one runtime candidate was selected. Lifecycle
  run/deactivate execution, Promise scheduling, stale replacement, and DOM mutation remain outside semantic-runtime.
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
  merge unrelated uses of the same component definition. One captured-attribute group is a publication transaction:
  dynamic instructions, value sites, expression parses, and their provenance claims become visible together only after
  every captured syntax compiles. A refused group may publish its compiler issue, but must not leak a valid prefix whose
  missing context would later be mistaken for an independently authored binding. Dynamic spread compilation also
  publishes a template-compiler
  `no_spread_template_controller` (`AUR9998`) compiler issue when it reaches the `SpreadBinding.addChild` branch that
  rejects template-controller children, while the binding lifecycle lane preserves the sibling runtime-html issue.
  The in-memory dynamic-instruction context also retains the exact requestor definition whose compiler world lowered
  the instruction. Nested transfer can render an instruction under a descendant controller while compiling and binding
  it against an ancestor hydration context; binding render contexts spend the requestor definition plus context
  controller to recover the exact compiler resource scope, source-scope controller, and runtime DI container.
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
- `runtime-binding-scope-issue.ts` owns framework-runtime diagnostics discovered while constructing a modeled binding
  `Scope`. Each issue preserves the actual owning product kind: repeat issues point back to their scope effect, while
  template-controller value-scope issues point back to the lowered controller instruction rather than inventing a
  scope-effect owner.
  Repeat destructuring now publishes `RuntimeBindingScopeIssue` products for `AUR0112` when the checker-backed
  binding-pattern projector can prove or warn that an object-pattern item is nullish, or that an array-rest
  destructuring source is not an actual Array. Non-nullish primitive object-pattern items remain valid under RC2
  semantics. Repeat source compatibility publishes the same issue product shape for
  runtime-html `repeat_non_iterable` (`AUR0777`) when a repeat source is outside the framework's built-in
  `RepeatableHandlerResolver` categories. The iterator effect is also the retained causal authority for later
  diagnostics: its runtime binding identifies assignment evidence for the same operation, while
  `BindingScope.scopeCreators` connects each introduced repeat-local slot back to the effect so checker and weak-owner
  rows can be classified as derived analysis consequences. A later creator that introduces or assigns the same slot
  stops that relation, preserving shadowing authority. Public diagnostic projection spends this graph directly; it
  does not reconstruct ownership from coincident spans. Static repeated-view values use the shared representative-value substrate:
  exact per-instance views are not materialized, but common object fields and string-pattern prefixes can survive as a
  conservative child-scope value. If a consumer needs correlated alternatives across fields from the same repeated item,
  model that as a bounded value-flow frontier rather than teaching the consumer to special-case `repeat.for`.
  Built-in `with` uses the same issue lane for a distinct framework hazard: runtime-html substitutes an empty binding
  context for `undefined`, but passes `null` to `Scope.fromParent`, after which ordinary `Scope.getContext` lookup throws
  while evaluating `name in bindingContext`. Scope typing may still project the non-null value lane for useful child
  analysis, but it must retain and diagnose reachable `null` at the exact authored value address.
  RC2 core `repeat` admits a deliberately shallow `ObjectBindingPattern` projection: property source keys map to
  identifier or alias locals, while rest, defaults, nested targets, duplicate locals, and reserved names are rejected
  by the iterator parser. `virtual-repeat` retains a different runtime boundary because its controller reads one
  `BindingIdentifier`. Object and array patterns therefore publish a virtual-repeat-scope-effect-owned
  `UnsupportedRepeatDeclaration` issue at the exact declaration span, and scope construction does not project their
  destructured locals.
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
- `runtime-expression-resource-plan.ts` owns one outer-to-inner `astBind(...)` plan over binding behaviors and value
  converters before scope construction or `Controller.bind` selects target access. It joins resource visibility,
  behavior-specific bind checks, node-observer configuration, chain reachability, effective binding mode,
  behavior-supplied target observers, and behavior-projected converters once. Authored and effective runtime chain depth
  remain separate because reached i18n behaviors insert converter wrappers during bind. The behavior and converter
  materializers subsequently publish phase applications, lifecycle effects, and issues from that plan; neither rescans
  the authored AST or reconstructs reachability. The modeled built-ins are now
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
  Authored applications are retained even when resource lookup fails: the application carries `resource: null` and
  owns `ast_behavior_not_found` (`AUR0101`) at bind time. The bind-state application set also mirrors runtime-html's
  outer-to-inner `astBind(...)` traversal so a repeated behavior name publishes `ast_behavior_duplicated` (`AUR0102`)
  on the second bind attempt before behavior-specific effects run.
  Attribute `InterpolationBinding` and compiler-lowered text do not share one runtime cardinality. Attribute
  interpolation retains one aggregate binding whose holes behave like `InterpolationPartBinding` expressions for
  bind-time behavior and value-converter publication. Its parts bind in source order, so a resource-bind failure keeps
  the failing part's earlier wrappers visible, blocks inner wrappers as `blocked-by-outer-failure`, and blocks every
  later part as `blocked-by-bind-failure`. Text compilation instead emits one `ContentBinding` per hole. Each text
  binding plans only its selected aggregate chain; resource, access, value-channel, and data-flow consumers retain that
  original chain index rather than replaying every sibling hole. Aurelia can still abort the controller-wide sequential
  binding loop when an earlier binding throws. That cross-binding activation order is not closed yet and must not be
  approximated by a text-only failure coordinator. `RuntimeOperationReachability` is the sole vocabulary
  for both bind and later phase reachability; do not reintroduce a narrower bind-only enum. Behavior application and
  issue products source to the exact behavior name span when the carrier comes from an admitted source file, not just
  the whole binding carrier span.
  Binding-mode behaviors (`oneTime`, `toView`, `fromView`, and `twoWay`) are modeled as reached, resource-visible
  framework bind-time effects, not parser aliases. Scope assignment, controller target access, value-converter phases,
  bound-controller values, observation data-flow, and inlay hints all spend the same expression-resource plan. A missing
  or failing outer behavior therefore blocks every inner mode/converter effect instead of allowing a downstream AST scan to mutate
  direction anyway. `runtime-binding-mode-behavior.ts` now retains only the shared mode-name and direction vocabulary.
  Property-binding renderer selection participates in the same target-observer handoff: a class accessor applies only
  when the rendered target is the native Node, reached binding behaviors may replace that strategy, and ordinary
  observer-locator selection runs only when neither earlier authority supplied one. Keep this ordering in controller
  bind; publication and value-channel consumers must not reconstruct it from instruction spelling.
- `runtime-value-converter.ts` and `runtime-value-converter-materializer.ts` own the rendered value-converter
  application lifecycle from bind-time resource lookup through invocation. Unresolved authored uses retain an
  application with `resource: null` and publish `ast_converter_not_found` (`AUR0103`) in the `bind` phase instead of
  disappearing before diagnostics. Applications publish `bind` and reachable `unbind` phases in addition to the
  applicable `to-view` and `from-view` phases. Phase reachability comes from the shared plan, so an outer bind failure
  blocks conversion and teardown without deleting the structural application. Resolved application products distinguish
  `to-view` and `from-view` phases when binding mode proves target-to-source writeback; data-flow owns the exact
  `fromView` return-type projection and assignment strictness, while this materializer owns phase publication and
  converter-owned framework issues. The first modeled issue path is
  `SanitizeValueConverter.toView`: when the compiler resource scope resolves the built-in `sanitize` converter and the
  active container tree has no modeled `ISanitizer` resolver, semantic-runtime spends runtime-html
  `method_not_implemented` (`AUR0099`) for the default throwing sanitizer. A modeled app `ISanitizer` registration
  suppresses that issue. Converter application and issue products source to the exact converter name span when possible,
  including converter uses inside interpolation holes.
  Source-value consumers are downstream of the same compiler resource scope: repeat locals, let values, router
  instructions, and composition requests pass that scope into `RuntimeBindingSourceValueEvaluationContext` so static
  converter `toView(...)` closure is shared with binding flow instead of reimplemented locally.
  They also spend the plan's post-bind source-evaluation reachability. A failed or unreachable outer
  binding-behavior/value-converter bind leaves authored expressions, TypeChecker facts, applications, and data-flow
  pressure inspectable, but it blocks source-value execution and connectable observed-dependency publication. Static
  router or composition evaluation must not resurrect an inner converter behind a failed outer resource.
  Repeat locals and let values use `projectRuntimeBindingSourceValueContextInScope(...)` when they already own the
  template-controller source scope, including the no-runtime-binding fallback, so binding-behavior `bind(...)` handoff,
  rendering strict mode, and resource scope stay aligned with data-flow and router/composition source-value consumers.
  Converter signal lifecycle is not definition metadata. Built-in resources carry exact auLink-backed signal constants;
  app-owned converter instances read `signals` through the same `RuntimeBindingSourceValueEvaluator` used for static
  `toView(...)` reduction. Closed arrays retain per-element source addresses, partial arrays keep known members plus open
  pressure, and an absent property on a closed evaluator instance stays absent rather than becoming an unknown field.
  Signal add/remove effects live only on reached bind/unbind applications; conversion phases do not duplicate them.
- `template-runtime-analysis.ts` owns the post-compiled-template runtime/checker phase: runtime Rendering dispatch,
  pre-bind behavior planning, template scope construction, `Controller.bind` emulation, i18n `TranslationBinding.create/bind` issue
  materialization, binding-behavior/value-converter application,
  observer value-channel projection, and binding data-flow materialization. Runtime analysis runs after the project has
  compiled every template front door, and receives
  `TemplateRuntimeAnalysisProjectContext` so controller products can be linked to already-known compiled templates.
  That context is also the exact compiler-product admission boundary: every analyzed compilation spends its own
  definition, template, instruction, syntax, and compiler-service products there, while a local scope frame indexes only
  its own instructions. Recursive rendering resolves foreign instructions and resources through the same boundary rather
  than preloading cohort-wide template objects into every frame. This routing is required before runtime groups can gain
  narrower ownership; do not restore cohort-wide frame preloading here.
  Recursive rendering intentionally exposes child bindings in a parent aggregate analysis as well as the child's own
  analysis. `runtime-resource-ownership.ts` is the shared authored-instruction ownership boundary used by public binding
  projections and project-level source-owned producers. It also projects source-local dynamic instructions, expression
  parses, and value sites from recursive aggregate render products. Cursor, diagnostics, semantic-token, completion,
  capability-demand, and overlay consumers must select resource-local rows there rather than treating every recursively
  visible child expression or instruction as a new fact authored by the parent. Instruction-to-scope replay may still
  use aggregate render context through `template-expression-selection.ts`; source ownership and runtime reachability are
  deliberately different questions. Binding-backed rows spend their exact owning compiled instruction. Runtime spread
  compilation retains a normalized claim from each dynamic instruction to its captured `AttrSyntax`, and
  `RuntimeRenderingEmission` indexes that relation for the same ownership path; this keeps projected content, captured
  transfer, and nested same-file local templates from being guessed through source spans or execution controllers.
  Source containment remains only for rows that genuinely have no binding/instruction product.
  Root/custom-element, template-controller, and synthetic-view controllers publish
  `configuration.controller-uses-compiled-template` claims for their exact definitions. Template controllers also
  materialize an `IViewFactory` whose compiled-template handle is the semantic counterpart of runtime `ViewFactory.def`;
  no runtime-created `Resource.Definition` product competes with compiler ownership. The factory creates an aggregate
  `SyntheticViewController` product and runs the child definition's exact target rows, mirroring `TemplateControllerRenderer ->
  Rendering.getViewFactory(...) -> factory.create(...) -> Controller.$view(...) -> _hydrateSynthetic()`. This is
  intentionally aggregate/cardinality-aware rather than per-runtime-instance: the controller row records `many`,
  `optional`, or `single` through template-controller semantics. The synthetic render pass dispatches the child
  compiled template's exact target/row products; nested renderer and spread-compile logic no longer depend on authored-node regrouping.
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
  than baking them into expression evaluation. Flow state retains the concrete controller application as well as the
  definition-level instruction: recursive rendering may apply one instruction under several parents, and promise,
  conditional, and switch siblings must not recover the first controller for that instruction. Template-controller
  value bindings are selected by exact expression product and render-context target controller; the controller is the
  binding target, not the rendering parent and not a binding owner. `template-scope-type-projector.ts` owns the
  TypeChecker support used by this phase: listener `$event` types, repeat override locals, iterator local types, repeat
  source compatibility, let-binding value types, promise result slot types, template-controller primary value
  evaluation, and the non-nullish object context used by `with.bind`. Keep those reusable projection rules there
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
  `RuntimeRenderingEmission` indexes the exact binding-to-expression-product relation emitted by renderers. Consumers
  must spend that relation rather than reconstructing a guessed binding owner from compiler instruction shape.
  It also indexes the normalized dynamic-instruction-to-captured-`AttrSyntax` claim; resource-local projections must
  spend that authored origin rather than rescanning claims or inferring ownership from the receiving render controller.
  Every runtime binding has exactly one `RuntimeBindingRenderContext`; later expression-resource, source-value,
  observation/data-flow, i18n, converter, bound-controller, and template-scope phases must spend its exact source
  controller, compiler resource scope, and active container. Missing context is an internal invariant failure, not a
  reason to reuse the root compiler world. This distinction is required for recursive custom-element views, selected
  provider projection, receiving fallback views, and nested captured-attribute transfer.
  Router resources rendered recursively use the same rule: select the concrete rendered binding whose target controller
  is the active custom-attribute controller, then project its source scope and spend its binding-owned compiler resource
  scope and DI container. Never recover a router source from a globally unique instruction binding or from an ancestor
  container; one authored router instruction may be realized under several controllers.
  `runtime-binding.ts` holds the framework-shaped binding, target-access, value-channel, data-flow, and scope-effect
  model classes. Observation-owned value-channel and data-flow detail slots live in
  `observation/product-details.ts`.
- `runtime-controller-bind-materializer.ts` owns the explicit `Controller.bind` materialization layer. It asks
  `RuntimeControllerFrame.bind(...)` to walk controller-owned bindings, resolves the runtime target for each binding,
  then delegates product/source/open-seam publication to `runtime-controller-bind-publication.ts`.
  Property bindings consume the pre-bind behavior plan before choosing their ordinary accessor/observer: reached
  binding-mode behaviors select the lookup, while `attr` and `updateTrigger` spend their framework
  `useTargetObserver(...)` effects, including exact static update-trigger event names. Runtime-dependent event arguments
  remain an open target-access fact rather than retaining the default native events as if the behavior had not run.
  `PropertyBinding` and `InterpolationBinding` publish `ObserverLocator` / `NodeObserverLocator` target-access
  products; `AttributeBinding.updateTarget(...)` publishes direct target-operation products for `.class`, `.style`,
  and ordinary attribute writes, while `ContentBinding.updateTarget(...)` publishes text-content target operations for
  text interpolation and `ListenerBinding.bind(...)` publishes event-listener subscription operations.
  `RefBinding.updateSource(...)` publishes source-operation products for resolved ref targets instead of masquerading as
  a DOM target update; `element.ref` resolves through TypeChecker-backed HTML tag maps, while
  component/custom-attribute/controller refs resolve through the renderer-created controller tree. Bind-time
  publications preserve request-owned event, modifier, and ref-target addresses rather than replacing them with the
  enclosing binding carrier. Named ref targets also retain the resolved same-node controller relation, which resource
  navigation, references, and rename consume as an ordinary resource usage; `element`, `controller`, `component`, and
  `view` remain ref API targets rather than resource identities. Ref products preserve converter lifecycle as well as
  target identity: bind/cleanup assigns through `fromView`, and unbind's
  equality guard evaluates through `toView`, so a converter-wrapped ref has both conversion phases even though its
  data-flow transport is assignment-only.
  Target-access rows record whether
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
  Controller construction first performs Aurelia's eager observer setup for every bindable. The controller frame owns
  each exact setup lookup, capability decision, source/provenance, outcome, and reachability; controller bind reuses a
  setup observer only when framework caching makes it available. A fatal coercer/callback rejection keeps later
  bindables as explicit `not-reached` evidence and blocks downstream operations, while an open predecessor makes later
  setup conditional instead of publishing an unconditional failure. Synthetic view activation has a directed outer
  prerequisite but does not let a lazy child failure poison already reached outer bindings.
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
  target-access rows enumerate the statically known bindable candidates, but a value channel exists only when the
  spread source type can pass Aurelia's object and `key in source` guards for that target. The channel carries the
  guaranteed, conditional, or open realization, the guarded member value type, and any member declaration shared by
  every admitted lane. Checker object shapes are structural lower bounds, so undeclared keys remain open rather than
  being rejected; directly synthesized object literals can still prove absence. This reflects runtime per-bindable inner
  `PropertyBinding` creation without pretending every candidate is realized or creating a second instruction layer.
  Bind-time target discovery preserves `null` for unresolved target identity and `[]` for a resolved component with no
  bindables; collapsing those states invents an open `$bindables` target where the runtime has a closed empty fan-out.
- After scope projection, `observation/binding-data-flow-materializer.ts` materializes a separate source/target flow
  product for each runtime property binding, attribute binding, interpolation, ref binding, and spread value binding with
  target access, target operation, source operation, or explicit open value channel. It spends the instruction's modeled
  `Scope`, the expression parser publication, runtime-side facts, and value-channel facts to record direction, source
  type, raw target property type, runtime target value type, source writability, TypeChecker assignability, and open flow
  pressure without expanding runtime rendering. For spread value bindings, the flow consumes admitted value channels
  rather than projecting the candidate set again, for example `bindings.productId` into a
  `product-id`/`productId` bindable. Every spread also retains a targetless source-read flow for the outer expression,
  matching the framework's `SpreadValueBinding`; admitted member edges model the generated inner property bindings.
  This preserves both evaluation layers without fabricating a target write or an authored member token.
- `template-controller-scope-materializer.ts` spends the controller tree plus runtime binding scope effects into
  runtime-shaped `Scope`, binding-context, and override-context products. Controller and `Scope` model classes own the
  construction shapes; the materializer only preserves template-order effects and commits records.
  It preserves the CE boundary-scope rule, repeat local binding-context rule, repeat override contextual names,
  `with.bind` non-nullish object binding-context rule, branch-local `if.bind`/`else` narrowing, switch/case branch
  scope creators, promise settlement assignments, and let-binding target-context rule so expression inquiry can use the same
  scope substrate as runtime-shaped compilation.
  Repeat declaration locals are author-writable scope names. Repeat contextuals (`$index`, `$length`, `$odd`, `$even`,
  `$first`, `$middle`, `$last`, and `$previous`) are framework-managed and author-read-only. The runtime represents
  `$index` and `$length` as mutable data properties because `Repeat` updates them, while deriving several other
  contextuals through getters for hot-path efficiency; that descriptor choice is not template-author assignment
  authority and must not leak into source-write policy.
  Built-in template-controller flow semantics are selected from the resolved framework-catalog definition, never from
  the authored attribute name alone; an app-owned controller that shadows `with`, `repeat`, or another built-in name
  keeps its own behavior. For app-owned template controllers, scope construction recognizes only checker- or
  framework-import-grounded synthetic-view activation that passes the existing controller scope or calls
  `Scope.fromParent(this.$controller.scope, this.<defaultProperty>)`. The exact activation-scope expression is retained
  as provenance. Arbitrary lifecycle execution, conflicting activation shapes, and ungrounded view receivers publish a
  `template-controller-scope-open` seam rather than borrowing built-in behavior. The resulting
  `BindingScope.scopeCreators` entry is the durable handoff to overlays and inquiries; those consumers must not rescan
  lifecycle source or reconstruct the scope cause from the template-controller spelling.
  Listener and state-dispatch event scopes keep `$event` as the DOM event type, then attach member-type refinements for
  `$event.currentTarget` and native form-control `$event.target` through the authored host element. This preserves normal
  event members while letting form payload expressions such as `$event.target.value` close through the same DOM
  tag-name-map substrate as observer lookup.
  It also models target-to-source bindable assignments as immutable state transitions on the runtime Scope selected by
  Aurelia `Scope.getContext`. An assignment can update an existing override-context slot, an existing binding-context or
  view-model member, an explicit ancestor, or the nearest boundary binding context for an unresolved name. Descendant
  scopes are rebased onto the updated ancestor state without confusing state predecessors with runtime-parent ancestry.
  The source expression is analyzed with that post-assignment state visible, and later sibling/descendant expressions
  see the same write. Scope slots keep the declaration member (`targetTypeMemberHandle`) separate from the member that
  supplied their current value type (`targetTypeSourceMemberHandle`), while `targetIdentityHandle` owns durable
  declaration identity. A runtime-only slot can therefore use a target
  bindable member as an indexed-access type carrier without claiming that the authored scope name denotes that
  bindable. Existing slots keep their declaration identity and source while their value type is refined. When
  a value converter participates in target-to-source writeback, scope construction spends the same
  `projectRuntimeAssignmentValueConverterWriteback(...)` helper as binding data-flow before typing the synthetic local;
  the target member is kept as an indexed-access type carrier only when that converted source-local type is still the
  bindable member type. That writeback type context is projected through
  `RuntimeBindingSourceExpressionContextProjector` through the concrete rendered runtime binding, so render-context
  strict mode and source-scope-changing binding behaviors such as `& state` affect the converter `fromView(...)`
  arguments and assignment target just as they do for data-flow rows. When the bindable itself is untyped, the
  remaining authoring pressure is honest `any`/weak-type pressure from the plugin or app surface, not a lost scope
  handoff.
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
  `@aurelia/ui-virtualization` resource-admission path. `DefaultVirtualizationConfiguration` also admits the plugin's
  exact `virtual-repeat.for` attribute pattern and `forof` command. That command lowers to the plugin-owned type-`200`
  `IterateBindingInstruction`, implemented as a subtype of the shared semantic iterator abstraction so local scope/type
  facts and static tail options such as `gap` survive without pretending to model the plugin's collection observer, DOM
  renderer, scroller, measurement, or scheduling behavior. Virtual repeat remains a single-identifier iterator; core
  repeat's binding-pattern support does not widen this plugin boundary.
- `built-in-syntax.ts` records framework-provided attribute-pattern and binding-command handlers as concrete
  runtime-shaped model classes with `auLink` anchors.
- `built-in-syntax-catalog-materializer.ts` materializes framework-owned syntax catalogs into kernel-backed catalog, executable,
  definition, and compiled-pattern products. Built-in attribute-pattern and binding-command executables are backed by
  ordinary `Resource.Definition` products even when their declaration locus is an external framework-catalog address.
  This lets cursor and reference inquiry dispatch by the same product identity as app-owned syntax without inventing an
  authored declaration location. It does not decide which catalogs are visible to a component compiler world; that
  belongs to configuration, DI scope, and compiler-world materialization. The configured syntax-catalog materializer in the
  same file consumes explicit `FrameworkRegistrationKind` values from configuration/registration and records which
  built-in catalogs a known framework configuration or registration group made available. I18n translation syntax is
  configuration-sensitive: closed `translationAttributeAliases` option contributions produce a catalog variant with
  the corresponding attribute patterns and binding-command aliases. Translation-key catalogs are separate i18n
  products in `../i18n`; syntax visibility says where `t` can appear, while i18n products say which static keys are
  known from configuration resources.
- The current syntax-execution middle ground is deliberate: framework/plugin catalogs and app-owned registered
  attribute patterns and binding commands converge through the shared `SyntaxResourceExecutableMaterializer`.
  App-owned definitions therefore retain registration identity, exact syntax occurrences, references, and duplicate
  registry/parser authority without a second parser or command table. Their arbitrary handler bodies are not
  dynamically executed: custom pattern handling and command lowering remain explicit open seams until a dedicated
  extension materializer can interpret them honestly. Attribute-pattern duplicate `AUR0089` diagnostics use the
  incoming registration as the primary locus and retain the occupied parser registration as related information.
  Both surfaces are app-global within a compiler world, but their effective-registration carriers differ: attribute
  patterns execute into the singleton attribute parser, while binding commands occupy the container resource-key space
  and are selected through the root world's visible registration before joining the shared executable catalog.
- built-in resource headers from `resources/built-in-resources.ts` become ordinary visible resources after DI has
  spent them into container resource slots. Compiler-world visibility should preserve the header/resource slot for
  lookup while preferring a converged full definition when one exists, because bindable maps and compiler-consumable
  metadata live on definitions rather than headers. `TemplateVisibleResource.resourceProductHandle` therefore retains
  the selected catalog header while `definitionProductHandle` names the full definition. Consumers that need built-in
  identity must read the selected header directly; recovering origin from the definition by scanning convergence claims
  discards the visibility decision, misrepresents app shadowing, and creates an unrevisioned whole-kernel dependency.
  Element, attribute, and template-controller hydration instructions all retain that selected visible-resource
  reference; `definitionProductHandle` on those instructions is only a derived convenience for definition consumers.
- Attribute patterns and binding commands are modeled as one configured syntax surface for compiler-world purposes.
  Runtime stores them differently for efficient attribute parsing and command lookup, but tooling should not let that
  implementation split make syntax visibility fundamentally container-specific unless a custom extension materializer
  proves otherwise. `TemplateResourceScope.resources` and `syntaxResources` retain their distinct construction roles,
  while generic resource lookup spends both lanes; consumers must not reproduce a built-in/app-owned split by searching
  only one lane.
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
compiled pattern, score, and interpretation boundaries because autocomplete and diagnostics need to know whether
an attribute failed matching, matched a pattern, or reached an opaque handler.

Authored framework capability demand is separate from parser success. Optional syntax such as runtime-html
`ShortHandBindingSyntax` may be visible in source (`@click`, `:value`) while the current app-world compiler world has
not admitted the matching framework registration. Plugin-owned syntax, resource tags/attributes, value converters, and
binding behaviors can also be authored while their package is available but their configuration is not registered.
`framework/capability-demand-materializer.ts` owns that cross-cutting fact after template compilation: it records the
authored demand, effective admission state, manifest/import availability evidence, and a registration-capability fix
path while public diagnostics project only unmet demands. Manifest evidence includes dependency, peer, dev, optional,
and nearest workspace manifest scopes; source evidence includes static import/export module specifiers. The producer should read built-in syntax groups, built-in
resource catalog identity, expression AST resource tails, and compiler-world visible-resource lookup; do not teach
`AttributeSyntax` or attribute classification to reinterpret unregistered shorthand as a binding. Runtime semantics
remain inert until the capability is registered.

Expression parser integration is intentionally by product handle here. The current expression parser predates the
kernel and should stay on a short leash: value-site ownership, binding-command preprocessing, multi-binding splitting,
and lowering belong above it unless runtime expression-parser semantics prove otherwise. Parser results are currently
rich in-process objects on value-site and command-lowering emissions; durable expansion of those parse products should
be typed explicitly later rather than pushed into generic kernel payloads.

Runtime `DefaultBindingSyntax` also registers `EventModifierRegistration`. That registration is not an attribute
pattern or binding command, so it is intentionally separate from the built-in syntax catalog. The finite framework
defaults live in `runtime-event-modifier.ts`: universal `prevent`/`stop`, mouse button/meta modifiers for the event
family registered by `ModifiedMouseEventHandler`, and key/meta/character/code modifiers from the default `IKeyMapping`
for the keyboard family. App-root compiler worlds replace that default with known `IKeyMapping` state produced by the
nearest DI-spent AppTask cohort, including exact authored sources and open membership after dynamic writes. This
vocabulary is still not globally closed because arbitrary `IModifiedEventHandlerCreator.getHandler(...)`
implementations expose event applicability without an enumerable modifier API; listener-modifier completion therefore
returns known framework and app candidates as an explicitly partial answer.

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
instruction gaps. Custom-element child content is extracted into `HydrateElementInstruction` projection instruction
sequences before direct child compilation, matching the framework compiler's slot extraction path. Keep remaining seam
vocabulary in the compiler namespace and do not let these cases fall back to a generic open instruction unless the
instruction shape itself is the thing that failed.

HTML parsing, attribute classification, expression parsing, instruction lowering, and template completion are active
inquiry pressure points. These materializers cannot be designed as pure batch compilation only: parser recovery,
cursor/range loci, candidate discovery, diagnostics, hovers, and tooling explanations need answer envelopes and
continuations. Keep compiler products current-world and provenance-rich, but do not back-port autocomplete ranking,
rename safety, diagnostic severity, or agent usefulness into compiler-world records.

Template completion starts above parser products: `inquiry/template-completion.ts` reads materialized
scope/resource/expression details and returns candidate rows for classified sites. Cursor-to-site adaptation also lives
in inquiry now, but it spends this layer's materialized template emission instead of rescanning source: active HTML
node, attribute name, attribute value, expression frontier, selected definition, and binding scope are all selected
from template/runtime/scope products. Expression-scope completion also spends the same runtime binding source-expression
context as overlays and data-flow: if a specific binding expression opts into a source-scope-changing binding behavior,
the cursor scope reflects that binding source while ordinary child scopes remain unchanged.
Authorable subdomains that do not fit the broad HTML site kind travel as a typed completion domain. Ref targets read
the exact `RefBindingInstruction` plus same-node hydration instructions through the shared runtime ref-target authority;
listener events enumerate TypeScript's current DOM event-map products; listener modifiers read the lowered event name
against the framework-default modifier semantics; and local-template mode values read the selected bindable declaration
whose metadata was intentionally removed from ordinary HTML lowering. Do not replace these product handles with
adapter-local string lists or reparse stripped source. Attribute ref targets spend the selected resource's canonical
runtime name rather than an authored alias, matching the definition-key lookup used by runtime controller refs.

Framework hook facts on completion members are role classifications, not global name matches. Component lifecycle
classification requires a callable member on a custom-element controller binding context and uses only names that
runtime-html `Controller` currently discovers and invokes: `hydrating`, `hydrated`, `created`, `binding`, `bound`,
`attaching`, `attached`, `detaching`, `unbinding`, `dispose`, and `accept`. Routed view-model classification additionally
requires either an effective `RouteConfig` targeting the owning custom-element definition or explicit/inherited
framework `IRouteViewModel` heritage. `getRouteConfig` is a router-configuration hook; `canLoad`, `loading`, `loaded`,
`canUnload`, and `unloading` are transition-lifecycle hooks. AppTask phases are registration slots, not view-model
hooks, and removed or legacy spellings such as `define`, `load`, `unload`, `detached`, and `unbound` must not re-enter
completion vocabulary without executable framework evidence. Member-expression completion reads an available ambient
`BindingScope` as classification evidence without offering unrelated scope candidates or making that evidence
mandatory for owner types projected through another lane; dependency admission and candidate projection are
deliberately separate decisions. At member-access sites the owner expression must resolve directly to `$this`,
`$parent`, or boundary `this` for the selected BindingScope; a nested or optional-chained value with the same checker
type as the component is not the component role. Member frontiers are selected from the parser's `MemberName`
continuation class so `$parent.` and optional-chain receivers retain the same owner evidence as ordinary dot access.

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
  parent value scopes plus generic settlement-assignment layers, switch/case branch layers with a named
  `__au_switch_case(...)` helper, state binding
scope layers,
importable value-converter `toView(...)` call surfaces, and runtime-assignment slots introduced by from-view/two-way
  bindable flows. Runtime-assignment layers retain whether the write reached the binding or override context, shadow the
  assigned lexical name, and refine `$this`/`$parent` aliases only for binding-context writes. Slots may reuse an already-visible in-scope alias when the
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
probes and controller/scope setup. Overlay source reads for runtime bindings enter through
`RuntimeBindingSourceExpressionContextProjector`; when a source-scope-changing binding behavior such as `& state` is
present, the overlay wraps only the copied source expression in a generated source-scope block. This mirrors framework
`binding.useScope(...)` without changing child-view ancestry, so a
`repeat.for="item of items & state"` item comes from store state while `$parent` inside the repeated view still points at
the original parent scope. If the projected source scope is unrelated to the ambient overlay scope, keep it as an
explicit unsupported source-scope projection; do not copy the expression through ambient aliases just to make generated
TypeScript compile. Template-controller branch narrowing follows that same boundary: a state-backed condition can
type-check through the state source scope, but it must not publish state-store members into the child view unless that
child binding also opts into the state source scope. Today the only modeled bind-time source-scope-changing behavior is
`& state`, so copied runtime binding sources only need to synthesize `StateBinding` replay tails. If another binding
behavior begins calling `binding.useScope(...)`, add that framework-backed scope creator to the runtime
source-expression projector and shared overlay layer vocabulary before broadening `wrapRuntimeSourceExpression(...)`;
do not add ad hoc owner fallbacks in the overlay builder. `template-type-system-overlay-plan.ts`
owns the intermediate overlay layer and emitter shape; keep construct planning from semantic products separate from
generated TypeScript text emission as the supported Aurelia surface widens. Parent alias capture/replay is an emitter
primitive there because repeat and value-scope blocks must both snapshot the parent binding context before the generated
block changes scope. Keep this builder downstream of scope materialization: if a future overlay needs a new local,
route parameter, `$event`, or plugin scope fact, add that fact to the owning semantic materializer first instead of
teaching the overlay builder to rediscover it from raw template text. `template-expression-selection.ts` owns shared
template expression/value-site selection plus expression-parse to runtime-scope lookup; cursor inquiries, diagnostics,
and overlays should reuse that selector so they agree on the semantic product locus before TypeScript projection
starts. Cursor/member-owner reads that need the source expression at an offset should use
`bindingSourceEnvironmentSelectionForTemplateExpressionParseAtOffset(...)` there rather than rebuilding
`RuntimeBindingSourceExpressionContextProjector` beside completion or diagnostics code. Runtime binding selectors in
that module also filter expression bindings through
`templateScopeCanEvaluateSourceScope(...)`, so a definition-level expression rendered in several controller/scope
applications does not accidentally spend a sibling runtime binding. The shared source-context selector may accept
several candidate runtime bindings only when their projected scope, strictness, lifecycle mode, source address, and
expression span converge; otherwise it stays open instead of letting overlays, cursor diagnostics, or completions pick
the first compatible binding by runtime emission order. Cursor completions should pass the selected
ambient `BindingScope` into that selector when they have it; the selector can then spend the rendered-binding
projection instead of falling back to a raw known-scope checker context for repeated controller applications.
The ambient scope narrows which rendered binding application is relevant; it is not the binding's source-evaluation
scope. Once an application is selected, `RuntimeBindingSourceExpressionContextProjector` derives that source from the
instruction scope and the immutable binding-expression scope table. Passing the ambient child scope into that
projection accepts expressions against locals Aurelia has not created yet. Template-controller condition, iterable,
promise, and value creators likewise evaluate from the predecessor/parent scope that creates the child scope; only the
leaf expression probe runs in the completed child scope.
Arrow callback scopes follow the same authority split. The parser owns callback declarations and authored `$this` /
`$parent` paths; `BindingScope` owns evaluation lookup; runtime expression access uses join both to exact declaration or
context targets. Cursor recovery may use a focused parse that omits an already-completed callback parameter, so
declaration/token selection falls back to the stable materialized parse while frontier state remains cursor-local.
Do not publish speculative callback/narrowing context handles or rebuild callback-local name sets in query consumers.
`template-scope-replay.ts` owns the shared
scope-chain replay, same-level synthetic-scope source replay, and `$this`/`$parent` alias reachability policy
that generated overlays, cursor explanations, diagnostics, and future continuation/edit surfaces should reuse before
adding local scope ancestry logic. It also owns `templateScopeSourceReplayRelation(...)`, which is broader than
ambient evaluation: a generated analysis can synthesize a deeper source-scope wrapper when the source scope is below the
ambient scope, but ordinary expression selection should still require `templateScopeCanEvaluateSourceScope(...)`.
Runtime binding source projections also carry the rendering-controller
`strictBinding` axis into copied overlay expressions. Non-strict read/call positions lower to optional-chain-shaped
TypeScript so overlay diagnostics agree with Aurelia's non-strict nullish `astEvaluate` result instead of reporting
raw TS18047 on copied source text. Assignment targets opt out of that lowering because writeability and assignability
belong to binding data-flow and source assignment policy. This is a compiler-like separation of semantic facts, not an
answer-layer diagnostic suppression. The overlay builder keeps a small alias replay cursor for the generated layer list so
repeat and synthetic-view scopes advance the same `$this`/`$parent` state machine. `BindingScope.scopeCreators` is the hot-object mirror for framework-semantic products that
create or narrow a scope: runtime scope effects, listener events, state binding scopes, runtime assignments, and
template-controller branch/value facts. Use it for consumers that need to replay scope causes in order, rather than
searching by source address or trying to recover them from rendered instructions. Same-level synthetic scopes preserve
creator facts from their base scope so overlay consumers can replay the let/repeat/runtime-assignment setup visible
through copied scope slots before adding a branch condition. `templateScopeCanReplaySourceScope(...)` is deliberately
stricter than a common-parent test: it requires the ambient synthetic scope to have replayed the source creators and
visible slots. Identity/source-backed slot type differences are allowed because branch narrowing refines the same
runtime slot, while anonymous source-less slots must keep the same projected type before replay can treat them as the
same fact. When `if.bind` or adjacent `else` cannot produce a
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
overlay helper spends the shared DOM event-map vocabulary from `dom-node-type.ts` for the base event object and
consumes `TemplateScopeTypeProjector` member refinements for `currentTarget`/`target` when the
materialized `$event` slot exposes simple checker-visible target types. Keep further event precision in that
scope-projection handoff rather than adding local HTML tag switches. Bare `$this`, bare `$parent`, and boundary `this`
source tokens copy into TypeScript only when aliases can be derived from `BindingScope` replay or the resource-template
function boundary. Direct `$this.member` / `$this.method()` syntax lowers to the same ancestor-zero, override-first named
lookup as ordinary `member` / `method()` because the framework parser emits `AccessScope(name, 0)` / `CallScope(name, 0)`;
the preserved syntax origin is source provenance, not a binding-context-only lookup policy. Repeat scopes still declare
`$parent` plus a current `$this` object synthesized from replayed binding-context slots such as `{ item }` or
`{ key, entry }`, and nested repeat parent aliases carry a typed `$parent` chain so `$parent.$parent.*` follows Aurelia
ancestor lookup. Non-replayed binding-pattern
context shapes remain explicit skips rather than hidden generated-TypeScript name-resolution diagnostics. The parser
preserves lowered `AccessScope`/`CallScope` qualifier tokens, exact ancestor depth, and optional access through
`AuthoredScopePath`; overlay projection should spend those facts before copying or lowering source text, especially in
non-strict call-scope lowering. `with.bind`
captures the outer `$this`, evaluates the source expression once, casts the generated binding context through
`NonNullable<typeof source>`, and then projects ordinary local declarations such as `label` from the materialized
binding-context slots; listener-event scopes nested under that value scope retain the generated `$parent` alias so
`$parent` targets the outer component rather than the value object. Promise `then`/`catch` values are from-view
assignment targets, not standalone read probes or Promise-owned declarations. They use the same runtime-assignment
transition as every other target-to-source binding: `then` supplies the awaited parent promise type, `catch` supplies
`unknown`, and ordinary scope lookup decides whether the write refines a let slot, a root member, an explicit ancestor,
or a new boundary-context slot. A valueless `then` uses the binding command's implicit `then` target. State binding scopes
use the modeled state context member expressions from `StateBindingScope` rather than searching by raw local names.
`runtime-expression-source-address.ts` is the bridge between parser-local `SourceSpan` values and kernel source
addresses. Semantic-runtime-created parse contexts put the kernel source-file address handle in `SourceFileRef.id`;
overlay, scope, and bound-controller consumers should use `sourceAddressHandleForRuntimeExpressionSpan(...)` instead
of casting `span.file.id` at each call site.
`app-api-pressure.mjs` prints non-extractive overlay skip summary buckets so larger app-shaped probes can distinguish
remaining ancestor-alias pressure from value-converter, binding-behavior, or custom-expression pressure without
promoting source details. `TemplateTypeSystemOverlaySkippedReason` is an emitted-fact vocabulary, not a planning
wishlist: add a skip reason only when the builder can actually emit it and the owner/substrate gap is understood.
Binding behaviors are value-transparent for overlay expression checking: framework `astEvaluate` returns the wrapped
expression, while bind-time behavior effects and diagnostics are owned by `runtime-binding-behavior-materializer.ts`.
App-owned behavior arguments are nevertheless projected through checker-visible `bind(scope, binding, ...args)`
signatures. Direct checker projection derives the contextual types after the two framework-owned parameters; generated
overlays emit one independent `__au_binding_behavior_argument<T>(arg)` witness per authored argument. This preserves
exact argument source mapping and TypeScript diagnostics without pretending to invoke lifecycle code, requiring
checker-visible values for `Scope`/`IBinding`, or changing the wrapped expression value. Missing behaviors and absent
`bind` methods leave argument expressions checker-visible without inventing a parameter contract.
`template-type-system-overlay-prelude.ts` contains only emitted helper declarations, each with an owner and emitted-name
inventory. Runtime-assignment locals, `$this`/`$parent` aliases, and temporary scope locals are generated layer facts rather
than prelude helpers, so do not add empty prelude rows for constructs that emit no reusable declaration.
`template-type-system-overlay-expression-support.ts` is the compact ownership matrix for every semantic-runtime
expression AST kind. Read that table before adding another `UnsupportedSyntax` branch: ordinary TypeScript-shaped
expressions can copy authored source, scope-root expressions depend on BindingScope alias replay, value converters
lower through modeled value-converter call surfaces, binding behaviors unwrap to their inner expression, interpolation
lowers through framework-equivalent ordered `String(...)` assembly while preserving each authored hole, `repeat.for`
and binding patterns are owner-handled, `CustomExpression` currently belongs to i18n translation binding,
and destructuring assignment remains a statement-emission frontier. When a TypeScript-shaped parent contains a modeled
generated child expression, the projector now splices the child parts into the authored parent source while preserving
source segments for diagnostics. This is a substrate capability, not an authoring grammar claim: framework value
converters are chain expressions, so app fixtures should not invent arbitrary `foo(value | converter)` template syntax.
Named helper declarations still belong in `template-type-system-overlay-prelude.ts`; add helpers there rather than
embedding ad hoc declarations in expression projection.
The copied-expression projector may therefore preserve the behavior's value-transparent result, but should not emulate
behavior-specific side effects in generated TypeScript. Value converters are intentionally different because
`astEvaluate` delegates to `useConverter(...)` and the converter can change the value; the overlay represents them only
when resource recognition supplies an importable converter target. Checker-visible `toView(value, ...args)` methods
emit as direct converter method calls so TypeScript's native overload and argument rules are the diagnostic surface.
Literal `withContext = true` inserts the caller-context value before authored converter arguments; checker-visible
dynamic `withContext` emits both strict-true runtime branches through the shared value-converter call-surface helper
instead of pretending the converter is context-free. The
`__au_value_converter_to_view(...)` helper is only the runtime-identity fallback for missing converters or converter
types without `toView`, preserving the input value and keeping authored converter arguments visible without producing
a TypeScript-only missing-member error. The value-converter overlay fixture keeps the dynamic branch return types
different and checks the direct TypeChecker evaluator beside the generated overlay, so overlay lowering and expression
projection cannot drift on converter arity policy.

Parent-to-child bindable values are also scope facts before they are overlay facts. `RuntimeBoundControllerValueTable`
records property bindings that render against child controller view-models while evaluating in the parent scope.
Scope construction projects unambiguous table entries into the child custom-element root `BindingContext`, and the
overlay aliases those slots with importable member types when possible. This is what lets a child template type-check a
parent-bound callback bindable against the parent's function type instead of the child class's placeholder initializer.
The child bindable declaration remains the slot's identity and source for references, rename, and assignment policy.
When direct value flow retains a parent member's type, only `targetTypeSourceMemberHandle` points at that parent member
as the current type carrier. A value converter is not transparent for this purpose: its `toView` return supplies the
current type even when the printed signature happens to equal the input member. Do not make one member handle serve
both roles or carry provenance through a transforming wrapper; either mistake turns a value-flow fact into a false
declaration/type-source relationship.
The table is the resource-boundary carrier: once a child template is being analyzed, the parent `RuntimeBinding` is not
available through the child's runtime rendering emission, so strict mode and binding-behavior lifecycle must travel on
the table entry rather than being rediscovered downstream. That includes the parent resource's exact
`RuntimeExpressionResourcePlan` and binding-expression scope projector. Binding-owned value-converter evaluation spends
the plan entry selected during parent rendering; only ownerless known-scope evaluation performs an ambient resource
lookup. Definition/type fallback is reserved for synthetic-view and cross-resource child analysis. An exact-controller
steady read requires one live writer, while an initial-settlement read selects the last render-order writer and
all-writer enumeration preserves the ordered set for scope/type projection. This distinction prevents one resource
usage from lending its value to a sibling and avoids misrepresenting multiple active bindings as permanent
last-writer-wins state. Writer admission spends `runtimeBindingSourceLifecycle(...)`: a structural controller target
access whose expression-resource bind failed, or whose effective mode is source-assignment-only, did not deliver a
parent value and is excluded.
When the parent binding source uses a source-scope-changing behavior such as `& state`, child root slot source lookup
must spend `RuntimeBindingExpressionScopeProjector` before chasing `AccessScope`/`AccessMember` identity; otherwise the
slot can have the right evaluated type while losing the store member as its source. The state-source overlay fixture
therefore proves both generated overlay locals and materialized child `BindingScope` slots. Static source-value reads
of those child properties also re-enter the source-value context projection rather than evaluating the stored parent
expression directly, so composition and router-like consumers do not grow a second bound-controller evaluator.
The bound-controller source site now spends the same source-expression lifecycle projection as ordinary rendered
bindings. If a future child-root slot needs another lifecycle axis, add it to that shared projection rather than adding
a bound-controller-only branch in scope construction or overlay emission.
After that lifecycle projection selects the correct parent source scope, child-root source slots are derived through
`bindingContextSlotDraftForExpressionAccess(...)`; that is the shared AccessScope/AccessMember-to-slot path for
bound-controller, overlay, and future cursor/reference consumers.
If the parent-bound value has a structural type such as a function returned by a value converter, the child root alias
must still use the scope-materialized slot type. `generated-type-expression.ts` owns import rewriting for those
structural type nodes; do not fall back to the child bindable initializer type or suppress the resulting arity
diagnostic in the overlay.
Do not suppress TS2554/TS2345 in the overlay when this handoff is missing; fix the controller/scope value flow first.
The project pass schedules runtime analysis over compiled resources by rendered-child dependency SCCs. Acyclic parents
analyze before rendered children so child root overlays can spend completed parent-bound values; mutually recursive
resources analyze as one finite group against predecessor facts only, which keeps recursive rendering deterministic
instead of depending on app resource registration order.
`template-expression-selection.ts` exposes both singular and plural expression-scope helpers. The plural helper is the
overlay/default for definition-level expression parses because recursive rendering can apply one instruction under more
than one runtime Scope. The singular helper returns a scope only when the instruction application is unambiguous; cursor
and diagnostic consumers should then use source-span scope selection instead of depending on incidental application
order. Offset-aware cursor source projections also live here so completions, weak-member diagnostics, and future edit
surfaces agree with overlay source-scope selection before they enter TypeChecker projection.

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
truth. Raw template diagnostics preserve admitted TS2339/TS2551 and TS2322/TS2588 rows even when semantic member or
binding data-flow diagnostics own the same authored relationship. `AppDiagnostics.presentation` keeps the semantic row
primary because it owns Aurelia source-write capability, value-channel semantics, and repair selection, then attaches
the exact overlay agreement as contextual `checker-evidence`. Producer-time deletion is forbidden here: detailed rows
retain the expression/diagnostic product, identity, source address, overlay origin key, generated file, segment label, and phase.
TypeScript-native rows such as argument mismatch remain primary checker evidence. Unknown-owner rows such as TS18046 also remain public when the overlay preserves a weak app type
instead of erasing it to `any`; that is a product-time diagnostic, not framework-runtime emulation. The admitted code
policy currently proves argument mismatch, arity mismatch, nullish access, and unknown repeat locals in the public
fixture, plus value-converter argument mismatch in the value-converter fixture. Keep it narrow until ancestor scope
aliases and event target/currentTarget refinements have first-class overlay semantics.
Cursor diagnostics spend the same admission policy and retain the same raw facts. User-facing de-duplication belongs to
the shared app presentation algebra, not cursor collection order.

Repeat `unknown` sources are preserved below the overlay too. Scope construction projects an explicit `unknown` repeat
local so cursor/member diagnostics can say the owner has no projected members, while reserving
`missing-slot-type` for cases where the template scope truly failed to provide a TypeChecker-backed slot. Keep that
distinction in the TypeChecker iterator projector; generated TypeScript should not be the only surface that knows an
unknown repeat local exists.

Generated overlay scope locals must spend the type facts already materialized on `BindingScope` slots. Repeat override
slots such as `$previous`, runtime-assignment locals, and other context-slot layers should emit a checker-visible type
when scope construction supplied one; otherwise they should degrade to `unknown`, not `any`. The overlay contract
checks the generated overlay text for accidental `undefined as any` holes across the current canaries.
`$previous` is derived directly from the typed `__au_repeat(...)` iterable used by the generated loop. Do not re-spell
its type from a compressed slot display: map/tuple element unions can have no retained checker carrier, and generic
array carriers require instantiated type arguments that a bare declaration name loses.

Repeat locals produced from synthetic array methods also depend on hydrated related type references. A checker-backed
inner array can expose its element only as a compact `iteratedValueType` reference; `CheckerTypeShapeAccess` must hydrate
that reference before `Array.flat` or `flatMap` publishes a synthetic array consumed by `repeat.for`. The
`arrow-callback-source-value` contract proves the `flatProduct` slot and cursor member owner stay typed as
`ArrowCallbackProduct`, leaving `missing-slot-type` for genuinely unresolved sources such as an absent repeat source
member. The same contract also runs public completions after file diagnostics at `flat`, `join`, and `lastIndexOf`
cursor sites; those answers should re-enter the expression/type projector when diagnostics disposed answer-local type
products instead of returning `type-shape-detail` gaps from a stale expression cache entry.
