# Template Substrate

This folder models the template-compiler-facing world as it is re-layered onto kernel, resource, DI, parser, and
lowering products.

The goal is not to implement the compiler here. The goal is to make the products that later producers must create
explicit enough that resource recognition, configuration, DI world construction, HTML parsing, attribute
classification, expression parsing, and instruction lowering converge on the same contracts.

## Layers

- `compiler-world.ts` models the container-scoped compiler world: visible resources, syntax resources, and compiler
  services. It is the handoff from DI world construction into template compilation. The service set mirrors the
  runtime root compilation context: template compiler, resource resolver, attribute parser, binding-command resolver,
  expression parser, and attribute mapper.
- `compiler-world-producer.ts` materializes a compiler world after earlier passes have selected the visible container,
  resource headers, and syntax executables. It constructs the scope and compiler service products, but it does not
  rediscover source configuration. The app-world composition currently supplies non-syntax resources from
  DI-produced container resource slots, and supplies attribute-pattern plus binding-command executables from the
  configured framework syntax-catalog admissions for the owning app-root sequence.
- `parse-context.ts` carries inquiry pressure that genuinely changes parser/lowering behavior: strict parsing,
  recovery, frontier/cursor preservation, and consumer lane.
- `compilation-unit.ts` models the compiler front door: authored template source, the selected compiler world,
  inquiry parse context, and the runtime-shaped `CompilationContext` frame that HTML parsing, attribute
  classification, expression parsing, and lowering should consume.
- `compilation-unit-producer.ts` materializes that front-door slice once a template source and compiler world are
  known. It intentionally does not parse HTML yet; it establishes the product boundary where later template producers
  attach.
- `template-compilation-project-pass.ts` is the current project-level template entrypoint. It consumes app-world
  compiler worlds and compiler-visible custom element definitions, then runs compilation-unit materialization, HTML
  parsing, attribute syntax parsing, attribute classification, compiler-owned value-site selection, and binding-command
  lowering. It stops before element/controller lowering, multi-binding lowering, and final instruction assembly.
- `html-ir.ts` models authored HTML before Aurelia syntax interpretation. It preserves source addresses and recovery
  observations without performing resource lookup.
- `html-parser-producer.ts` is the first HTML producer slice. It spends a template compilation unit into authored
  HTML document/node/attribute products, records ownership claims, and keeps recovery local to the malformed syntax.
  It intentionally stops before Aurelia attribute-pattern parsing, resource lookup, or expression parsing.
- `attribute-syntax.ts` models runtime `AttrSyntax`, attribute-pattern executables, `IAttributeParser`, and the
  `SyntaxInterpreter` parser machine that compiles registered patterns before interpreting attribute names. Built-in
  pattern handler execution returns hydrated `AttrSyntax`-shaped results first; products and provenance are allocated
  by the attribute-syntax producer that owns the HTML attribute site.
- `attribute-syntax-producer.ts` spends HTML attribute products through the compiler world's `IAttributeParser`
  service. It preserves the runtime split between the `SyntaxInterpreter` match and the handler method execution, then
  emits `AttrSyntax` products plus resource-reference claims to the winning attribute-pattern executable.
- `attribute-classification-producer.ts` spends `AttrSyntax` products through the compiler world's resource resolver
  and binding-command resolver. It stops before instruction lowering, preserving the selected resource, bindable,
  command, capture, spread, and compiler-control lane as separate facts.
- `value-site.ts` and `value-site-producer.ts` model the compiler-owned handoff from authored template
  values into expression parser publications. They preserve value-site provenance above the parser and deliberately
  transfer ownership away from the parser for binding-command values and secondary grammars that need command/compiler
  preprocessing first.
- `binding-command-execution.ts` models runtime binding-command executables, resolver state, command build inputs, and
  lowering results. Custom command bodies can stay opaque while still preserving the exact command/input boundary.
- `binding-command-lowering-producer.ts` spends command-bearing attribute classifications through runtime-shaped
  binding-command executables. Built-in commands can emit instruction products and command-owned expression parses;
  custom or unresolved command bodies become explicit open seams rather than parser-owned special cases.
- `built-in-syntax.ts` records framework-provided attribute-pattern and binding-command handlers as concrete
  runtime-shaped model classes with `auLink` anchors.
- `built-in-syntax-producer.ts` materializes framework-owned syntax catalogs into kernel-backed catalog, executable,
  and compiled-pattern products. It does not decide which catalogs are visible to a component compiler world; that
  belongs to configuration, DI scope, and compiler-world production. The configured syntax-catalog producer in the
  same file consumes explicit `FrameworkRegistrationKind` values from configuration/registration and records which
  built-in catalogs a known framework configuration or registration group made available. I18n translation syntax is
  configuration-sensitive: closed `translationAttributeAliases` option contributions produce a catalog variant with
  the corresponding attribute patterns and binding-command aliases.
- The current syntax-execution middle ground is deliberate: built-in framework and built-in plugin attribute patterns
  and binding commands are modeled as concrete executable classes. Userland custom elements, custom attributes, value
  converters, binding behaviors, and template controllers are product priorities; userland attribute-pattern and
  binding-command bodies are not dynamically executed yet. If they become visible later, they should surface as
  explicit custom or opaque seams until a dedicated extension producer exists.
- built-in resource headers from `resources/built-in-resources.ts` become ordinary visible resources after DI has
  spent them into container resource slots. Compiler-world visibility should preserve the header/resource slot for
  lookup while preferring a converged full definition when one exists, because bindable maps and compiler-consumable
  metadata live on definitions rather than headers.
- Attribute patterns and binding commands are modeled as one configured syntax surface for compiler-world purposes.
  Runtime stores them differently for efficient attribute parsing and command lookup, but tooling should not let that
  implementation split make syntax visibility fundamentally container-specific unless a custom extension producer
  proves otherwise.
- This is a semantic behavior exception, not a general ontology exception. Most runtime/compiler semantics should stay
  close to runtime shape; the product may split them into more granular records for provenance and inquiry, but should
  avoid inventing a coarser model that hides runtime-visible behavior.
- `instruction-ir.ts` models lowered rendering instructions as products that can carry provenance, addresses, and links
  back to syntax, resource definitions, binding commands, and expression AST products.

## Boundaries

Template products are consumers of earlier horizontal slices:

- boot and inquiry decide source admission and active loci
- evaluation closes static source shapes when it can and emits open seams when it cannot
- resources provide converged resource metadata
- configuration and registration order determine what is admitted to containers
- DI world construction determines compiler-visible resource and service scope

Template products should not rediscover those facts by scanning source directly. They should consume their products,
claims, and open seams once producers exist.

## Watchpoints

Instruction kinds and binding kinds are intentionally close to Aurelia runtime shapes, but they are not final AOT
bytecode. Refactor them when runtime compiler semantics force sharper splits.

Attribute classification is a pressure point between resource lookup, bindable selection, binding-command execution,
and instruction lowering. Keep those facts separate until real producers prove a smaller contract is safe.

The attribute parser is a machine, not just a bag of patterns. Producers should preserve the registered handler,
compiled pattern, score, and interpretation-cache boundaries because autocomplete and diagnostics need to know whether
an attribute failed matching, matched a pattern, or reached an opaque handler.

Expression parser integration is intentionally by product handle here. The current expression parser predates the
kernel and should stay on a short leash: value-site ownership, binding-command preprocessing, multi-binding splitting,
and lowering belong above it unless runtime expression-parser semantics prove otherwise. Parser results are currently
rich in-process objects on value-site and command-lowering emissions; durable expansion of those parse products should
be typed explicitly later rather than pushed into generic kernel payloads.

Runtime `DefaultBindingSyntax` also registers `EventModifierRegistration`. That registration is not an attribute
pattern or binding command, so it is intentionally not part of the built-in syntax catalog yet. Model it as a separate
renderer/listener modifier surface when instruction lowering or renderer-world production needs it.

HTML parsing, attribute classification, expression parsing, and instruction lowering are the next large inquiry
pressure point. Those producers cannot be designed as pure batch compilation only: parser recovery, cursor/range loci,
candidate discovery, diagnostics, hovers, and MCP explanations will need answer envelopes and continuations. Keep
compiler products current-world and provenance-rich, but do not back-port autocomplete ranking, rename safety,
diagnostic severity, or agent usefulness into compiler-world records.

Template compilation should now enter through a compilation unit. Avoid letting later template producers rediscover
the owner resource, compiler world, parse context, or runtime service set from source. If a producer needs different
context, add it to the unit/context model or create a nested child context instead of threading unrelated parameters
through parser APIs.
