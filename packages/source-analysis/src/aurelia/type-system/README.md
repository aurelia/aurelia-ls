# Type System Substrate

See [../README.md](../README.md) for the folder-wide rebuild map and MCP co-evolution rule.

The type-system substrate projects TypeScript checker facts and synthetic expression/template shapes into product-owned
handles and hot details. It exists beside static evaluation, not below it: evaluation answers what
source/module/configuration values can be interpreted, while this layer answers what static shape is visible at a
source, value, expression, or template-local slot.

## Responsibilities

- Preserve current TypeChecker type/member surfaces for template and expression inquiry.
- Build one TypeScript Program/checker epoch over the same parsed source files used by static evaluation.
- Materialize type-shape and type-member product envelopes with identities, claims, provenance, and typed details.
- Allow hot product details to retain `ts.TypeChecker`, `ts.Type`, `ts.Symbol`, and declaration carriers when that
  avoids lossy re-resolution.
- Keep type references cheap enough for scope slots, resource definitions, and future parser frontiers to point at.
- Preserve resource target instance types so custom-element and controller scopes can project userland view-model
  members through the TypeChecker.
- Make member completion after expression frontiers consume checker-projected members rather than guessing from names.
- Resolve completed Aurelia expression AST targets against binding-scope and TypeChecker products when a caller needs
  the owner type for member completion or navigation.
- Synthesize type-shape products for expression/runtime constructs that produce real member surfaces without retaining
  checker-owned objects, such as object literals, array literals, and template locals.
- Preserve call and construct result references on type-shape products so synthetic expression shapes can participate in
  the same call-return path as TypeChecker-backed function and constructor types.
- Represent expression-level control-flow results as synthetic union shapes with only common safe member surfaces rather
  than turning every different-branch expression into an answer-layer policy decision.
- Project repeat-local types through runtime repeat semantics, including synthetic tuple-shaped entries for
  `Map<K, V>` / `ReadonlyMap<K, V>` so `[key, value] of map` can flow into the same binding-pattern machinery as
  arrays and object destructuring.
- Spend compiler resource scope when expression semantics need resource lookup. Value-converter projection resolves
  the visible `ValueConverterDefinition`, projects the converter instance type, and reads the `toView` return surface
  without collapsing that lookup into static evaluation.

## Non-Responsibilities

- Replacing static evaluation, DI world construction, or template lowering.
- Treating checker-owned objects as durable snapshot truth.
- Ranking, filtering, or formatting completions for a particular transport or UI.
- Inferring runtime values that the checker cannot prove.

## Design Pressure

TypeScript APIs are allowed in this product when they are fundamental to the product. The reason raw checker objects
stay out of durable kernel records is technical, not aesthetic: `ts.Type`, `ts.Symbol`, `ts.Node`, and
`ts.TypeChecker` are tied to a Program/language-service epoch, carry object identity, and cannot be serialized into a
long-lived app map without an invalidation authority. They belong in hot product details and projector carriers.

Durable kernel records should carry product handles, identity handles, checker keys, source addresses, claims, and
provenance. If a checker fact needs to survive across snapshots or drive rename/refactor behavior, promote the
specific fact into an explicit product field, identity field, claim predicate, or source address instead of hiding it
inside the carrier.

This layer is also the named split between evaluation-backed world construction and checker-backed authoring help.
DI/configuration/resource materializers should prefer evaluation when they are deciding what the app constructed. Template
expression tooling should prefer TypeChecker projection when it needs the static member/property surface of userland
view-model types. Future SSR/SSG or richer abstract interpretation can connect the two through explicit products and
claims rather than collapsing the distinction.

For template work, the split begins after compiled-template/render-row assembly. The compiler side can still be modeled
as evaluation-shaped construction because it consumes closed resource metadata, DI/compiler-world products, HTML IR, and
lowered instruction rows. Controller activation, nested template-controller view creation, repeated view instances, and
member completion are different: they depend on runtime values and lifecycle state that should be represented through
speculative checker-backed projections, not by pretending the language server hydrated real views.

`expression-type-evaluator.ts` is the runtime-shaped evaluator across that split. It spends parser AST truth,
runtime-shaped binding-scope truth, hot checker carriers, and synthetic expression projections to produce a type-shape
handle that inquiry can consume. It is a high-trust emulator of runtime expression evaluation, not an `auLink` mirror:
runtime `astEvaluate` is not a clean class-like target, and the product needs a type-system result rather than a
runtime value. Keep the emulator isomorphic to Aurelia expression evaluation and `Scope` lookup where those semantics
determine which member surface is visible, while leaving unsupported expression families explicit as open results.

## Watchpoints

- `CheckerTypeReference` is intentionally a reference, not a recursive type graph. Recursive projection should be
  introduced only when an inquiry or materializer needs it.
- Type-shape identities are session-stable because checker objects are epoch-bound even when their source
  declarations are source-stable.
- Member value types are currently stored as references without automatically materializing nested type-shape
  products. If member navigation or deep completion needs those products, add a projector continuation instead of
  stuffing more raw detail into completion answers.
- The expression type evaluator is deliberately member-surface-oriented, not runtime-value-oriented. Value converters
  can close over the checker-visible `toView` return type because the compiler resource scope supplies a runtime
  definition. Argument-sensitive overload choice, `fromView`, custom expression plugins, and richer collection
  prototype semantics should stay explicit until the binding direction or plugin-specific substrate supplies the
  missing facts.
- Synthetic union shapes are intentionally conservative: they preserve only members and secondary type references common
  to every branch. If a future inquiry needs branch-aware completions, add an explicit answer continuation instead of
  weakening the union product into a bag of possible names.
- Repeat rest patterns remain intentionally conservative. A destructured local gets a type when the runtime-shaped
  path to that local is known; rest locals stay open until the product has a precise array/object rest taxonomy.
