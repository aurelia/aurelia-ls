# Runtime Expression Access Uses

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

This folder owns the semantic fact that one runtime operation uses one expression access occurrence. It is the common
authority between expression syntax, Aurelia lifecycle, TypeChecker target closure, observation effects, public
inquiries, IDE features, and future AOT work.

## Unit Of Meaning

A `RuntimeExpressionAccessUse` is:

- one binding, runtime watcher, source effect, or computed observer owner;
- one exact operation slot, such as a binding source, interpolation part, watcher getter, or explicit computed
  dependency;
- one authored or framework-generated access occurrence inside that operation;
- the runtime phase, tracking mode, realization, reachability, control-flow qualifiers, and execution multiplicity for
  that occurrence;
- the finest target closure that the binding scope and TypeChecker can prove; and
- exact access and member-token source addresses when those loci exist.

An access use is not a live observer, subscription, data-flow edge, diagnostic, or TypeScript reference. Those products
derive from the access fact and retain its handle as lineage. Do not make access identity depend on whichever downstream
consumer happened to discover it first.

## Independent Axes

Keep these facts separate:

- `ownerKind` and `operationKind` identify who spends the access and in which operation slot.
- `origin` distinguishes authored occurrences from closed framework transformations.
- `accessForm` and `role` describe syntax and use without implying observation.
- `phase`, `tracking`, `realization`, and `reachability` describe runtime execution.
- `executionQualifiers` and min/max executions preserve conditional, callback, loop, optional, and open-invocation
  boundaries.
- `targetResolution` and `targetLinks` preserve exact declarations, finite target sets, governing index signatures,
  proven misses, and open targets without flattening those states into names.
- `coverage` describes semantic completeness, independently from query paging.

Do not collapse these axes into one operation or dependency enum. A source can be reachable but untracked, generated but
directly realized, or authored with an open invocation boundary.

## Source And Target Honesty

Access source and token source are different addresses. The whole access span belongs in `sourceAddressHandle`; a member
or key token belongs in `nameSourceAddressHandle`. An absent token span stays absent instead of borrowing the owner
carrier. Generated operations may have no authored name locus while still retaining an exact generated source operation
and declaration target.

Target links retain the scope or TypeChecker authority product plus declaration/member handles. Display names are API
projections, not join keys. TypeScript collectors must remap parsed nodes into the admitted Program before asking the
checker for symbols or types; stale-node fallback is not an honest target closure.

Source-authored property expressions outside a materialized template scope model framework `Scope.create(obj)` through
`uncommittedScopeCreate(...)` and spend `CheckerExpressionTypeEvaluator.resolveAccessTarget(...)`. Runtime watchers,
source effects, and computed dependency strings therefore share the same scope lookup, keyed access, overload, generic
inference, and call-return authority as template expressions. A path such as `address.city` still closes `address` and
`city` as separate authored occurrences with separate declaration targets. Do not collapse a path back into one
string-key target or rebuild a smaller root/member/call evaluator in an owner-specific collector.

Template scope depth has three non-interchangeable facts:

- `scopeLookupAncestor` is the explicit ancestor argument Aurelia passes to `Scope` lookup after parser lowering;
- `authoredScopeAncestor` is the authored `$parent` count, with zero for explicit `$this`; and
- `callbackScopeDepth` is lexical arrow-callback nesting at the occurrence.

Do not assume the first is the sum of the other two. An unqualified outer name inside a callback keeps lookup ancestor
zero because Aurelia lookup falls through callback scopes by name, while explicit `$this` must escape the callback and
therefore carries the lowered depth. The access collector retains callback depth from traversal context instead of
trying to reconstruct it from the lowered AST field.

Arrow-parameter identity also belongs to the parser, not to a second lexical-symbol graph. The collector retains the
exact `BindingIdentifier` declaration span and publishes it as the callback root target; same-name nested callbacks
therefore stay distinct. Temporary callback/narrowing `BindingScope` contexts can supply evaluation state, but they are
not durable kernel products. Public target authority routes to a committed context with the same semantic identity, or
to the expression parse product for the callback declaration. References, rename, diagnostics, and cursor selection
spend those target links rather than rebuilding a local-name set.

Resource ownership follows the runtime operation owner before source locality. A trackable method-body access is authored
in TypeScript but is still used by, and belongs to, the exact template binding operation that invoked the method.
Resource-local aggregation must therefore route binding-owned access uses through the owning binding; filtering them by
the access source file drops legitimate cross-language occurrences from the public access query.

## Collection And Generated Operations

Collection observation belongs to the authored call occurrence that performs the collection operation. For
`items.filter(...).map(...)`, the `map` access is still the operation authority even though its observed receiver is a
temporary result with no declaration of its own. Keep operation ownership separate from effect-specific receiver
projection.

Repeat key and contextual expressions are auxiliary `AstEvaluateOnly` operations. They run in the repeated-item scope
but do not enter the iterator binding's `astBind(...)` lifecycle and do not create connectable observed dependencies.
Their access uses therefore retain the source scope needed by cursor, reference, rename, and type consumers. Those
consumers must select the operation at the authored token and spend that scope rather than requiring an observation row
that cannot honestly exist.

`...$bindables` has two levels:

- the outer binding reads and observes the authored object expression; and
- each runtime-generated inner binding reads one admitted source member.

Publish the inner read as `SpreadMemberSource`, retain its exact or governing TypeChecker target, and qualify it with the
runtime object/member guard. Do not manufacture that read by borrowing the outer expression occurrence.

## Observation Derivation

Observation products are effects derived from access uses:

- a connectable, reached binding access can publish a binding-observed dependency;
- watcher, runtime-effect, and computed-observer execution publish owner-specific dependencies;
- explicit trackable dependencies and method-body handoffs retain their own operation slots; and
- untracked, blocked, or open access uses remain queryable without pretending that a concrete subscription exists.

Conserve occurrence-level rows through this boundary. Aurelia may coalesce repeated reads onto one observer subscription
inside a connectable execution, but that runtime optimization does not erase authored access loci. Subscription
coalescing belongs in a later summary or execution-plan projection, never in access-use collection or public dependency
rows.

## Publication And Consumers

- `template-access-use-collector.ts` extracts occurrence and control-flow facts from Aurelia expression ASTs.
- `typescript-access-use-collector.ts` extracts source-operation occurrences from checker-backed TypeScript bodies.
- `runtime-expression-access-publication.ts` publishes source, identity, target, provenance, and claims.
- `source-access-use-publication.ts` publishes source-effect, computed, watcher, and method-body access uses.
- `../observation/runtime-expression-access-use-materializer.ts` pairs template occurrences with binding lifecycle and
  derives observation effects.
- `../api/runtime-expression-projections.ts` is the shared public projection used by the dedicated access-use query and
  nested observation lineage.

Consumers should join through product handles or target links. Do not rescan source text, rebuild local expression
walkers, infer operation semantics from dependency names, or normalize repeated occurrences before publication.
Syntax-only consumers may still read the parse tree for authored token spelling, but semantic decisions such as
callback-local classification and target ownership must come from the access-use product.

Publication batches may create access uses and their observation effects together. Pairing therefore carries the
access use's already-known source address through the transient dependency draft; it must not reread a not-yet-committed
detail from the publication context. The persistent dependency product keeps only the access-use product handle because
that durable edge owns the source and target relationship after commit.
