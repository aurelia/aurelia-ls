# Template Substrate

This folder models the template-compiler-facing world before parser and lowering producers exist.

The goal is not to implement the compiler here. The goal is to make the products that later producers must create
explicit enough that resource recognition, configuration, DI world construction, HTML parsing, attribute
classification, expression parsing, and instruction lowering converge on the same contracts.

## Layers

- `compiler-world.ts` models the container-scoped compiler world: visible resources, syntax resources, and compiler
  services. It is the handoff from DI world construction into template compilation.
- `parse-context.ts` carries inquiry pressure that genuinely changes parser/lowering behavior: strict parsing,
  recovery, frontier/cursor preservation, and consumer lane.
- `html-ir.ts` models authored HTML before Aurelia syntax interpretation. It preserves source addresses and recovery
  observations without performing resource lookup.
- `attribute-syntax.ts` models runtime `AttrSyntax`, attribute-pattern executables, `IAttributeParser`, and the
  `SyntaxInterpreter` parser machine that compiles registered patterns before interpreting attribute names.
- `binding-command-execution.ts` models runtime binding-command executables, resolver state, command build inputs, and
  lowering results. Custom command bodies can stay opaque while still preserving the exact command/input boundary.
- `built-in-syntax.ts` records framework-provided attribute-pattern and binding-command handlers as concrete product
  model classes. These models let configuration and DI world producers admit known syntax resources without executing
  userland extension code.
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
kernel and will need to be re-layered onto this substrate before instruction lowering should depend on it directly.
