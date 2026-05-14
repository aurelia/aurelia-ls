# Type System Substrate

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

The type-system substrate projects TypeScript checker facts and synthetic expression/template shapes into product-owned
handles and hot details. It exists beside static evaluation, not below it: evaluation answers what
source/module/configuration values can be interpreted, while this layer answers what static shape is visible at a
source, value, expression, or template-local slot.

## Responsibilities

- Preserve current TypeChecker type/member surfaces for template and expression inquiry.
- Build one TypeScript Program/checker epoch over the same parsed source files used by static evaluation.
- Keep the checker epoch app-local: use the booted project root's `tsconfig.json` when present, otherwise fall back to
  Aurelia-app-shaped defaults instead of inheriting the semantic-runtime package's own build config.
- Materialize type-shape and type-member product envelopes with identities, claims, provenance, and typed details.
- Materialize declaration source spans for checker-backed members, including Program files that were not boot-admitted
  as app sources, so hover/definition targets can point at TypeScript declaration truth instead of only the owning type.
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
- Project call and construct signatures through a named call projector so overload arity, argument assignability, and
  value-converter `toView(value, ...args)` semantics are not buried in the evaluator switch.
- Represent expression-level control-flow results as synthetic union shapes with only common safe member surfaces rather
  than turning every different-branch expression into an answer-layer policy decision.
- Project repeat-local types through runtime repeat semantics, including synthetic tuple-shaped entries for
  `Map<K, V>` / `ReadonlyMap<K, V>` so `[key, value] of map` can flow into the same binding-pattern machinery as
  arrays and object destructuring.
- Keep repeatability aligned with Aurelia's default `RepeatableHandlerResolver`, not generic TypeScript iterability.
  Arrays, sets, maps, numbers, and nullish are built-in repeat sources; strings and arbitrary array-like objects are not
  accepted here unless a future DI/configuration model proves that an app registered an `IRepeatableHandler`.
- Project repeat-local types through TypeChecker-visible nullable iterable unions and finite keyed access, such as
  `Item[] | null` and `Record<'primary' | 'secondary', Item[]>[lane]`, without moving that logic into template-specific
  heuristics.
- Let repeat binding-pattern projection report framework-runtime compatibility pressure while it projects locals.
  `CheckerBindingPatternLocalProjection` carries both local slot types and destructuring-source issues so scope
  construction can publish exact `AUR0112` diagnostics without duplicating TypeChecker member/index access in the API.
- Keep projected type-shape access reusable. Ordinary expression member reads, cursor member-owner projection, and
  repeat binding-pattern destructuring should share the same member/index/reference resolver instead of each growing a
  local TypeChecker access path.
- Preserve the key kind for projected indexed access. A type can be indexable by number without supporting arbitrary
  dot-member fallback; string-index signature semantics, numeric keyed access, and finite literal-key access must stay
  separate so diagnostics do not invent synthetic members for primitive or array-like owners.
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

Fixture and ad hoc app roots are allowed to start without package-manager scaffolding. The default checker options
therefore use bundler-style module resolution, a small `*.html` module declaration, and an optional local Aurelia
checkout type-path map when this repository's `aurelia/packages/*/dist/types` tree is present. Real app `tsconfig.json`
files remain authoritative and can override those defaults.

For template work, the split begins after compiled-template/render-row assembly. The compiler side can still be modeled
as evaluation-shaped construction because it consumes closed resource metadata, DI/compiler-world products, HTML IR, and
lowered instruction rows. Controller activation, nested template-controller view creation, repeated view instances, and
member completion are different: they depend on runtime values and lifecycle state that should be represented through
speculative checker-backed projections, not by pretending the language server hydrated real views.

`expression-type-world.ts` is the pass-local owner for expression TypeChecker work: it carries the shared
`CheckerTypeProjector`, expression evaluation cache, and resource-scope-specific evaluator instances used by runtime
analysis and inquiry. `expression-type-evaluator.ts` is the runtime-shaped evaluator across the template/runtime split.
It spends parser AST truth, runtime-shaped binding-scope truth, hot checker carriers, and synthetic expression
projections to produce a type-shape handle that inquiry can consume. It is a high-trust emulator of runtime expression
evaluation and is linked to Aurelia's `astEvaluate` even though the product returns a type-system result rather than a
runtime value. Keep the emulator isomorphic to Aurelia expression evaluation and `Scope` lookup where those semantics
determine which member surface is visible, while leaving unsupported expression families explicit as open results.
`evaluateWithScope(...)` also accepts a small runtime context for framework choices that affect evaluation. The modeled
mode bits mirror Aurelia's `astEvaluate` call shape: `connectable` controls the source-to-target dependency-collection
guard, while `strict` controls whether nullish member/keyed/call reads become runtime errors or ordinary `undefined`
results. Unknown strictness stays open so diagnostics do not claim a framework error without a proven runtime evaluator
mode. `++`, `--`, and compound assignment become an explicit open kind when a binding connectable is collecting
dependencies because Aurelia throws `ast_increment_infinite_loop`; listener/event-style evaluations that pass no
connectable can still project a numeric result.
Its companion files are part of the same substrate: `expression-type-evaluation.ts` owns result/open/cache vocabulary,
`expression-type-world.ts` owns cache/evaluator lifetime, `expression-type-synthesis.ts` owns synthetic
expression/template type-shape construction, `expression-call-projector.ts` owns TypeChecker call/construct signature
selection and return projection, and
`checker-type-shape-access.ts` owns reusable member, keyed, finite-keyed, and index-signature access over projected
type-shape products. `expression-member-owner-projector.ts` owns cursor-offset member-owner projection and delegates
value evaluation plus arrow-function scope creation back to the evaluator, so completion and diagnostic code do not
grow separate offset walkers. `expression-branch-scope.ts` owns expression-local truthy/falsy branch Scope projection,
while `speculative-binding-scope.ts` owns the uncommitted same-level Scope overlay used by that projection.

## Watchpoints

- `CheckerTypeReference` is intentionally a reference, not a recursive type graph. Recursive projection should be
  introduced only when an inquiry or materializer needs it.
- Type-shape identities are session-stable because checker objects are epoch-bound even when their source
  declarations are source-stable.
- Checker declaration source is allowed to admit a Program-only source-file address on demand. This is not a source
  discovery fallback for app semantics; it is a navigation/provenance handoff for TypeScript declaration files reached
  through the active Program, including lib and external package declaration members.
- Member value types are currently stored as references without automatically materializing nested type-shape
  products. If member navigation or deep completion needs those products, add a projector continuation instead of
  stuffing more raw detail into completion answers.
- The expression type evaluator is deliberately member-surface-oriented, not runtime-value-oriented. Value converters
  can close over the checker-visible `toView` return type because the compiler resource scope supplies a runtime
  definition; the call projector treats the converter's input expression as the first `toView` argument and then spends
  converter arguments for overload selection. Call/construct projection is intentionally lazy: a single
  arity-compatible signature does not cause argument evaluation just to re-prove the same return type, while overloaded
  surfaces can spend argument assignability to narrow the return lane. Generic inference from synthetic arguments,
  `fromView`, custom expression plugins, and richer collection prototype semantics should stay explicit until binding
  direction or plugin-specific substrate supplies the missing facts. When a converter declares `unknown[]` or another
  broad return surface, repeat locals derived from that converter should surface as weak-type pressure; do not infer
  element preservation unless a TypeChecker-visible signature or explicit converter model says so.
- Value-converter and binding-behavior resource lookup belongs in expression evaluation because Aurelia's runtime
  binding-utils path resolves those resources while evaluating the AST wrapper. Missing converter/behavior resources
  and duplicate authored binding-behavior names should preserve distinct open kinds so diagnostics can map them to the
  runtime-html `AUR0103`, `AUR0101`, and `AUR0102` codes with resource-registration or rewrite guidance.
- Member-owner evaluation can be offset-aware. Cursor completion asks the evaluator for the member owner at the source
  offset inside the full expression so lexical arrow-function scopes are preserved. In listener binding scopes, the
  first non-rest arrow parameter inherits the typed `$event` override-context slot, matching Aurelia's runtime behavior
  where a listener expression result that is a function is invoked with the event argument.
- Optional/nullish reads are evaluator semantics, not only diagnostic policy. Optional member/keyed access and optional
  calls over a definitely nullish owner/callee project `undefined`; non-strict `astEvaluate` mode does the same for
  non-optional nullish member/keyed/call reads. Strict mode keeps the corresponding open kind so data-flow diagnostics
  can spend `AUR0114`, `AUR0115`, or the strict nullish call-target lane without over-reporting non-strict bindings.
- Expression evaluation can accept a contextual target type. Arrow-function parameters first spend listener `$event`
  semantics when present, then fall back to parameter types from the contextual callable target, and only synthesize
  `unknown` when neither runtime nor target-side facts can type the parameter. This keeps binding data-flow and
  member-completion inference on the TypeChecker substrate instead of in answer-specific callback heuristics.
- When a runtime-analysis phase needs expression types, enter through `CheckerExpressionTypeWorld` so scope
  construction, value-channel projection, data-flow, and future speculative lifecycle contexts share the same cache and
  evaluator lifetime. Creating a bare `CheckerExpressionTypeEvaluator` should be a deliberate inquiry-local choice, not
  the default way to get expression facts.
- Unsupported expression-call results should preserve their `CheckerExpressionTypeOpenKind` when crossing into
  observation/data-flow. Diagnostics can map the modeled callable subset to runtime `astEvaluate` framework codes, but
  the evaluator should not collapse every open call/construct expression into a generic weak-owner or assignment
  failure.
- Open expression results may carry a narrower open subject when the repairable semantic surface is not the same as
  the expression span. For example, a missing TypeChecker type on a repeat-local scope slot should carry a `scope-slot`
  subject so diagnostics can target the slot while keeping selected member names as evidence. Do not recover that
  target later by parsing diagnostic summaries or selected member strings.
- Template completion and file/app diagnostic scans also enter through `CheckerExpressionTypeWorld`. The query object
  stays product-handle-shaped, but cursor-context construction may receive a hot world so repeated diagnostic probes
  share the same projector/evaluator cache instead of rebuilding a local TypeChecker expression stack per member span.
- Binding direction is part of expression meaning. Promise `then`/`catch` value expressions are from-view write
  targets that seed scoped locals; child interpolations read those locals afterward. Future expression inquiry should
  carry that direction instead of evaluating every parse as an ordinary read.
- Synthetic union shapes preserve only members and secondary type references common to every branch. If a future inquiry
  needs branch-aware completions, add an explicit answer continuation instead of weakening the union product into a bag
  of possible names.
- Template-controller branch narrowing is deliberately explicit and local. The current closed branch profile handles
  scope-name truthiness, loose nullish comparisons, simple boolean negation, truthy `&&`, falsy `||`, and adjacent
  `else` negative narrowing. Broader control-flow analysis should continue to land as named semantic profiles rather
  than as accidental evaluator behavior.
- Expression-local branch narrowing reuses that same profile without publishing template-controller Scope products.
  Conditional branches and short-circuit right operands go through `CheckerExpressionBranchScopeProjector`, which spends
  `CheckerExpressionScopeNarrower` and `speculativeBindingScopeOverlay`; do not recreate branch-local lookup inside
  completion or diagnostic answer code. `??` uses an exact nullish branch lane, not generic falsy narrowing.
- Promise template-controller result slots now cross from runtime activation semantics back into TypeChecker-backed
  expression scopes: `then="value"` receives the awaited `promise.bind` value type, while `catch="reason"` receives
  `unknown` because JavaScript promise rejection is not statically typed by `Promise<T>`.
- Repeat rest patterns stay open until the product has a precise array/object rest taxonomy. A destructured local gets
  a type when the runtime-shaped path to that local is known.
- Binding-pattern local projection is split from the expression evaluator. The evaluator owns expression execution
  shape; `binding-pattern-locals.ts` owns destructuring local collection and spends `checker-type-shape-access.ts` for
  member/index value-shape resolution.
- Finite keyed access belongs in the expression/type-system bridge. Public plugin and app pressure commonly reaches a
  mapped record through a repeat local before the child repeat reads item members; the checker relation should prove the
  finite key domain and projected value type, while genuinely broad string/number index access remains weak-type
  pressure.
- Keep projected type-shape access in `checker-type-shape-access.ts`. Cursor owner projection, ordinary member reads,
  indexed access, finite keyed access, and binding-pattern destructuring should not regrow separate checker/member
  resolvers inside answer code or expression semantics.
- Do not collapse indexed-value projection into dot-member semantics. `indexedValueType` carries the value reachable by
  a dynamic key together with `indexedAccessKeyKind`; only string-capable index kinds may synthesize an index-signature
  selected member for cursor-info. Number-only indexability is still useful for keyed access and iteration, but a
  missing dot member on that owner should surface as `missing-expression-member` or another explicit weak-owner
  diagnostic instead of pretending the member exists.
