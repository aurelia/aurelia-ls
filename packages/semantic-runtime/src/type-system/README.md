# Type System Substrate

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

The type-system substrate projects TypeScript checker facts and synthetic expression/template shapes into product-owned
handles and hot details. It exists beside static evaluation, not below it: evaluation answers what
source/module/configuration values can be interpreted, while this layer answers what static shape is visible at a
source, value, expression, or template-local slot.

## Responsibilities

- Preserve current TypeChecker type/member surfaces for template and expression inquiry.
- Build one TypeScript Program/checker epoch over the same parsed source files used by static evaluation.
- Read ordinary TypeScript project diagnostics from that same Program/tsconfig epoch, including config read/parse/option
  diagnostics, so API/MCP repair surfaces do not shell out to `tsc` or construct a second checker path.
- Keep ordinary project diagnostics distinct from LanguageService suggestion/code-action diagnostics. The current public
  surface is intentionally `tsc --noEmit`-shaped correctness pressure; quick fixes, suggestion diagnostics, and
  organize-import style actions belong in a future LSP/code-action layer.
- Preserve locus cost: project-wide diagnostic inquiries can spend and cache all project Program diagnostics, but a
  source-file inquiry should read only that Program source or owning config file instead of paying for every app file.
- Remap evaluator/source-discovery AST nodes to their Program-owned counterparts before calling TypeScript checker APIs.
- Use `TypeSystemProject.readProgramTypeAtLocation(...)`, `readProgramTypeFromTypeNode(...)`,
  `readProgramSymbolAtLocation(...)`, `readProgramAliasedSymbolAtLocation(...)`, or
  `readProgramTypeOfSymbolAtLocation(...)` when a caller needs TypeChecker facts for a node that may have come from
  evaluation, source discovery, or semantic materialization rather than the Program AST.
- Keep the checker epoch app-local: use the booted project root's `tsconfig.json` when present, otherwise fall back to
  Aurelia-app-shaped defaults instead of inheriting the semantic-runtime package's own build config.
- Materialize type-shape product envelopes with identities, claims, provenance, and typed details.
- Keep checker type members as hot details owned by a type-shape/member-surface projection unless a future product
  needs durable member graph semantics.
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
- Keep call-argument and callback-parameter context related but distinct. A positional callback parameter receives the
  value at one runtime argument position, while a callback rest parameter receives the array or tuple of remaining
  values; both policies belong in `CheckerExpressionCallProjector`.
- Represent expression-level control-flow results as synthetic union shapes with only common safe member surfaces rather
  than turning every different-branch expression into an answer-layer policy decision.
- Project repeat-local types through runtime repeat semantics, including synthetic tuple-shaped entries for
  `Map<K, V>` / `ReadonlyMap<K, V>` so `[key, value] of map` can flow into the same binding-pattern machinery as
  arrays and object destructuring.
- Resolve authored DOM host element types through `dom-node-type.ts`, which owns the TypeChecker tag-name-map lookup for
  HTML, SVG, and MathML plus broad element fallbacks. Observer lookup, ref targets, event-scope member refinements, and
  future DOM-aware inquiries should reuse that substrate instead of growing parallel tag heuristics.
- Keep repeatability aligned with Aurelia's default `RepeatableHandlerResolver`, not generic TypeScript iterability.
  Arrays, sets, maps, numbers, and nullish are built-in repeat sources; strings and arbitrary array-like objects are not
  accepted here unless a future DI/configuration model proves that an app registered an `IRepeatableHandler`.
- Project repeat-local types through TypeChecker-visible nullable iterable unions and finite keyed access, such as
  `Item[] | null` and `Record<'primary' | 'secondary', Item[]>[lane]`, without moving that logic into template-specific
  heuristics.
- Let repeat binding-pattern projection report framework-runtime compatibility pressure while it projects locals.
  `CheckerBindingPatternLocalProjection` carries both local slot types and destructuring-source issues so scope
  construction can publish exact `AUR0112` diagnostics without duplicating TypeChecker member/index access in the API.
- Keep repeat/iterator expression semantics in `CheckerExpressionIterableProjector`. The evaluator should dispatch
  `ForOfStatement` and public repeat-local queries into that projector instead of owning RepeatableHandlerResolver
  compatibility, map-entry tuple synthesis, and binding-pattern local projection inline.
- Keep projected type-shape access reusable. Ordinary expression member reads, cursor member-owner projection, repeat
  binding-pattern destructuring, and observation source-write classification should share the same member/index/reference
  resolver instead of each growing a local TypeChecker access path.
- Route checker index-signature reads through `checkerStringIndexValueType(...)` and `checkerNumberIndexValueType(...)`.
  `checker-related-types.ts` owns the union-aware `getIndexTypeOfType(...)` call so router, observation, binding, and
  template consumers do not reopen feature-local index-access helpers.
- Use `checkerTypeHasAnyName(...)` when a feature needs a generic exported/interface-style checker type-name match.
  Feature materializers should not grow local apparent-type/name/display candidate lists unless they are modeling a
  domain-specific runtime rule such as proxy-observation wrapping.
- Preserve the key kind for projected indexed access. A type can be indexable by number without supporting arbitrary
  dot-member fallback; string-index signature semantics, numeric keyed access, and finite literal-key access must stay
  separate so diagnostics do not invent synthetic members for primitive or array-like owners.
- Spend compiler resource scope when expression semantics need resource lookup. Value-converter projection resolves
  the visible `ValueConverterDefinition`, projects the converter instance type, and reads the `toView` return surface
  without collapsing that lookup into static evaluation.
- Preserve TypeScript literal precision for Aurelia primitive literal AST nodes. `checker-primitive-types.ts` owns the
  split between broad runtime primitive result lanes such as interpolation/arithmetic and literal expression lanes such
  as `'open'`, `42`, and `true`; `contract:expression-primitive-literals` keeps expression evaluation and
  template-controller match typing on the same helper.

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
Checker keys are epoch keys for the projected static shape, not just declaration identities. Declared generic and
library-backed types must include their display/instantiation in the key; `ReadonlyArray<unknown>` and
`ReadonlyArray<string>` share a declaration but are different static surfaces for template analysis.
Type-reference sameness must not treat missing product handles or missing checker keys as equality. A missing handle is
open identity evidence, not proof that two projected references are the same type; same-reference checks should require
matching product handles, matching checker keys, or a deliberately synthetic/primitive display match.
The projector keeps an epoch-local checker-key/source index for convergence, but it must verify that the indexed
product detail still exists before reuse. Query-local projections can now be reclaimed by `QueryClaimGraph` through the
kernel mark/dispose boundary, so a stale index entry should be evicted and reprojected rather than returning a dead
product handle. `contract:type-projection-lifetime` locks this down by projecting a checker type after a store marker,
disposing the marker, and proving the sidecar index prunes before the same local key can reproject a fresh detail.

This layer is also the named split between evaluation-backed world construction and checker-backed authoring help.
DI/configuration/resource materializers should prefer evaluation when they are deciding what the app constructed. Template
expression tooling should prefer TypeChecker projection when it needs the static member/property surface of userland
view-model types. Future SSR/SSG or richer abstract interpretation can connect the two through explicit products and
claims rather than collapsing the distinction.

Fixture and ad hoc app roots are allowed to start without package-manager scaffolding. The default checker options
therefore use bundler-style module resolution, a small `*.html` module declaration, and an optional local Aurelia
checkout type-path map when this repository's `aurelia/packages/*/dist/types` tree is present. Roots without a
`tsconfig.json` also get an explicit modern web library profile (`es2024`, `dom`, and `dom.iterable`) so TypeScript
does not silently load the full `Latest` library universe just because semantic-runtime wants current syntax parsing.
Real app `tsconfig.json` files remain authoritative: when a project supplies config but omits `lib`, semantic-runtime
lets TypeScript choose the normal library set for that config instead of injecting the fallback fixture profile.
The same authority applies to decorator mode. The local Aurelia declarations currently use standard decorator shapes,
so a fixture tsconfig that opts into legacy `experimentalDecorators` can legitimately produce TS1238/TS1240 rows. Fix
the fixture config or keep it as explicit pressure; do not make ordinary diagnostics disappear in semantic-runtime.
Out-of-tree temporary fixtures still need the analysis workspace as a discovery root. A generated project under the
host temp directory may not contain the local Aurelia checkout or workspace package paths, but its TypeChecker epoch
must still resolve those declarations relative to the semantic-runtime workspace that opened it. `TypeSystemProject`
therefore builds compiler options with both `project.rootDir` and `project.workspaceRootDir`; otherwise DI state and
framework imports degrade to `any`, which can look like a scope/observer bug even when template semantics are correct.

Type-system profiles should keep time, item volume, and source-text mass visible. App-level pressure can make TypeScript Program
construction look like undifferentiated semantic-runtime cost, but the useful question is often whether the epoch is
spending on admitted app files, semantic-runtime overlay sources, framework/plugin declaration files, or a downstream inquiry depth
that did not need checker facts at all. Keep phase item counts on the `TypeSystemProject` boundary and propagate them
through pressure scripts before adding caches or narrowing source admission. The profile also carries a compact
compiler-options summary (`target`, `moduleResolution`, configured library count, path mapping counts, and related
booleans) so a large Program can be explained as an intentional app config, a fallback fixture profile, or a path-map
discovery effect before changing source admission.
The profile also distinguishes Program root files from the final Program source-file set. A large root count outside the
project root is not automatically waste: source-linked workspace packages and source-shipped plugins may contain real
Aurelia resources that resource/configuration/template passes must understand. Treat root narrowing as an admission
policy change, not a generic performance cleanup. If most external roots are only type support, design a typed root
admission policy; if they produce resource/configuration semantics, keep them as app-world inputs and optimize the
downstream projections instead.
Root/source Program stats include overlapping source-text buckets beside counts: evaluated, overlay, project,
node_modules, declaration, default-library, and external files can intentionally overlap because the question is both
"what kind of files are present?" and "which bucket explains retained AST/text mass?". Use these rows before assuming a
large Program count is the heap problem. A fixture can have a tiny project root and still retain most Program text in
default libraries or framework declarations, which points at dependency-cache policy rather than app source admission.
The profile also carries non-overlapping Program source-file group rows for the same epoch. Those rows group each
Program file under exactly one owner, such as the project, a semantic-runtime overlay source, TypeScript default
libraries, a node_modules package name, external declarations, or external source. Use the overlapping buckets for
semantic role attribution and the group rows for "which package/source class is carrying the text" attribution before
changing root admission, dependency-cache policy, or inquiry depth.
`TypeSystemProject` roots the TypeScript Program from the union of parsed tsconfig root filenames, evaluated
project-local TS/JS sources, local declaration admissions when no tsconfig was present, and semantic-runtime overlay
sources. These are checker roots for app semantic analysis, not the same thing as ordinary TypeScript diagnostic
eligibility. Source-discovered Aurelia resources can be valid semantic inputs even when the app's tsconfig does not
root them directly, and checker-facing observation/resource passes still need Program-owned nodes for those files.
Ordinary TypeScript diagnostics keep a separate tsconfig-shaped source set: when parsed root filenames exist,
diagnostic reads only iterate those root files; without a parsed tsconfig, diagnostic reads fall back to project-local
Program sources. Local ambient module declarations are checker roots in that fallback mode so app-local declaration
files can satisfy imports without being static-evaluation entrypoints. External static-evaluation dependencies still
enter the source-file indexes and the compiler host can serve their parsed SourceFiles when the Program reaches them
through imports, but external dependency modules are dependencies rather than semantic root files.
`TypeSystemProject.readProgramSourceFileRole(...)` is the shared diagnostic/repair role classifier for Program-owned
sources. It uses boot-admitted source roles for authored project/config files, then falls back to checker-owned Program
source buckets: generated overlays, TypeScript/default-library declarations, external declarations, and non-declaration
external source. Public TypeScript diagnostic rows should call this boundary instead of reimplementing file-name role
heuristics in API code.
`overlay.ts` owns Program-owned virtual TypeScript sources for semantic-runtime framework/app representations. The
first overlay is the `*.html` module declaration; richer overlays should use the same lane for template/controller,
route, i18n, or bindable surfaces when checker participation is valuable. Overlay sources are hidden from ordinary
project diagnostics; use `readTypeSystemOverlayDiagnostics(...)` only when a caller explicitly wants checker diagnostics
from synthetic sources mapped through overlay segments to authored Aurelia spans. `TypeSystemProjectBuilder.build(..., { overlaySources })` appends additional overlays to
the default set through the same Program/compiler-host path, so later semantic passes can create an augmented checker
epoch without inventing local TypeChecker setup. Overlay sources may also declare generated-span segments; use those
segments as the diagnostic/hover/completion bridge back to authored Aurelia source instead of pointing public
answers at `.semantic-runtime/overlays/*` files. Use `TypeSystemOverlaySourceBuilder` for generated overlays whose
segments need exact generated offsets; segment end offsets are exclusive, matching TypeScript/source-span convention.
Segments should also retain the semantic product handle that produced the generated text when one exists. Authored spans
locate the user's code; product handles let later agreement/conflict checks join checker evidence back to
semantic-runtime facts without relying only on file/span coincidence. Hand-counted offsets are a provenance smell once
the surface grows past a tiny declaration.
`contract:type-system-overlays` includes the current Aurelia proof lane: a generated template overlay imports a real
fixture view-model type, aliases root binding-context slots, replays authored template expressions inside nested
`repeat.for` blocks, `let` declarations, built-in `if`/`else` condition blocks, listener `$event` declarations with
scope-projected `currentTarget`/`target` refinements when available, and
repeat override locals such as `$index`, plus `with.bind`, promise result, state binding scope, importable
value-converter `toView(...)`, missing-converter placeholder, and runtime-assignment slots that mirror `BindingScope`
ancestry, and asks the checker for repeat-local, let-local, narrowed or non-narrowing branch, listener,
value-scope parent, value-converter, promise, state, and mapped diagnostic expression types. The same contract proves that overlay checker
diagnostics remain hidden from ordinary project diagnostics while
the explicit overlay-diagnostic lane maps copied generated segments back to exact authored template spans when
generated and source lengths match. Broad segment mapping remains the fallback for generated text that does not copy a
source span one-for-one.
The template overlay path now has a selector/expression/plan/emitter split: `template-expression-selection.ts` owns the
shared expression/value-site and expression-parse to runtime-scope lookup used by cursor inquiries, diagnostics, and
overlays; `template-type-system-overlay-expression.ts` owns copied authored expression projection and named
unsupported-Aurelia-expression pressure; semantic product mapping lives in the template overlay builder; and
`template-type-system-overlay-plan.ts` owns the typed overlay layers plus generated text emission. Keep those
boundaries intact so future route/plugin/i18n constructs can add semantic facts before they become TypeScript text.
The contract also includes the synthetic writeback multi-binding canary. That fixture proves inline
custom-attribute segment expressions are parsed against their segment value span, assignable from-view/two-way source
locals are visible while their own binding expression is checked, runtime-assignment locals reuse an already-visible
same-type alias when one exists, and the generated overlay copies `rows`, `$displayData`, `$activeRow`,
`$activeRow.label`, and `row.label` instead of the full authored multi-binding attribute value. A writeback slot
without such a semantic alias now projects the target
bindable member through an importable indexed-access type such as
`SyntheticTableCustomAttribute["activeRow"]`, avoiding lossy display-string type serialization while still preserving
private domain model names through the exported controller surface.
The `template-overlay-scope-aliases` fixture keeps two alias classes separate: repeat override locals are represented
as generated scope-layer declarations so `$index` typechecks as `number`, and binding-behavior value expressions are
unwrapped according to runtime `astEvaluate` while bind-time behavior products retain behavior semantics. `$this` and
single-hop `$parent` are also represented from `BindingScope` replay. Both identifier and destructured repeats synthesize
the runtime binding context object from replayed binding-context slots, matching framework `BindingContext(local, item)`
and destructuring `astAssign(...)` behavior; `$this.item.label`, `$this.key`, and `$this.entry.label` therefore
typecheck without inventing TypeScript-only lookup rules. Nested repeat `$parent` aliases carry the parent chain so
`$parent.item.label` and `$parent.$parent.title` remain source-backed observed dependencies and overlay expressions.
`with.bind` scopes are also represented as binding-context-changing scope layers: current value members such as `label`
come from the value scope, while listener-event expressions inside the value scope can still call the parent view-model
through `$parent.selectById(id)` without confusing the value object with the parent component.
Boundary `this` access is represented by wrapping the generated overlay in a function whose `this` parameter is the
resource view-model type, matching the custom-element boundary for the resource template. The fixture also keeps a
non-narrowing `if.bind`/`else` pair as a branch-creator canary: even when the checker has no slot refinement to publish,
scope construction records the original condition plus polarity so the overlay can replay truthy and falsy branch
guards. Non-replayed binding-pattern
current-context aliases remain explicit pressure until the alias layer can represent them without obscuring Aurelia's
runtime lookup rules.
The `template-overlay-value-converter` fixture proves the first generated Aurelia-expression call surface: when resource
recognition supplies an importable value-converter target, the overlay emits a typed `useConverter`-shaped helper rather
than reinterpreting converter syntax locally. The helper calls the converter's `toView(value, ...args)` surface when it
exists, inserts the framework caller-context slot when the converter has literal `withContext = true`, preserves the
input value when the converter type has no `toView`, and still lets TypeScript report argument diagnostics such as
TS2345 on authored converter arguments when the method exists. The same projection is accepted by overlay scope layers,
so converter calls can participate in `if.bind` conditions and `repeat.for` iterable setup instead of being limited to
standalone expression probes. Built-in converters whose resource metadata lacks an importable module path can derive
their target type from checker carrier declarations. Missing converters use an unknown converter placeholder so
TypeScript can still check the wrapped source expression and converter arguments while semantic diagnostics own the
missing converter.
Full app-pressure now reports zero template overlay skips across the in-repo pressure corpus; treat future skip
reappearance as a signal to inspect the semantic owner first, not as a reason to add generated TypeScript fallbacks.
Do not broaden this lane into a second `from-view`/`two-way` writeback authority. Source assignment is owned by binding
data-flow because it has the binding direction, observer value channel, source write capability, target-to-source
assignability, and framework `astAssign` policy. When a public diagnostic needs a precise user span, it should derive
the assignment target through the shared runtime assignment-target AST helper while keeping the data-flow product as the
semantic fact.
`$this`, `$parent`, and boundary `this` expression source tokens are binding-context alias pressure, not ordinary
TypeScript name-resolution failures. The overlay currently emits a typed resource-template function, binds root
`$this` from that function `this`, and adds repeat-scope `$parent`/`$this` aliases from replayed binding-context slots.
Nested repeat parent aliases carry a typed parent chain, so `$parent.$parent` can stay authored source text when the
chain is available. Keep non-replayed binding-pattern current aliases as explicit skips until they can be derived from
BindingScope ancestry without inventing TypeScript-only lookup rules.
Template overlay diagnostics are now public only through the type-projection template diagnostic lane. That public
projection is intentionally policy-filtered: the overlay source is generated TypeScript, so syntax/name-resolution and
implicit-any diagnostics are substrate pressure unless the overlay can prove they came from an authored expression
relationship. Public rows currently admit semantic TypeScript codes such as missing member, nullish access,
type/argument mismatch, and readonly assignment, and carry `missingInput: "typescript:TS####"` plus a structured
`inspect-owner-type` action target over the authored expression span. Missing-member overlay rows are suppressed when
the semantic template diagnostic lane already owns the same authored span, so TypeScript becomes checker evidence
rather than a duplicate issue. The public fixture currently keeps argument mismatch, arity mismatch, and nullish access
rows as TypeScript-native overlay evidence, and the value-converter fixture adds converter argument mismatch over the
same policy. Keep this policy narrow until ancestor aliases and event target/currentTarget refinements have first-class
overlay semantics.
Template cursor-info participates in that same public projection when a caller opts into
`diagnosticProjection: "type-projection"`. Cursor-info does not run a separate hover checker; it filters mapped overlay
diagnostic rows to the active authored cursor span and reuses the same duplicate-suppression and TypeScript-code
admission policy as template diagnostics. This keeps cursor-time explanations aligned with file/app diagnostics while
still allowing cheaper `available-products` cursor reads when TypeChecker overlay diagnostics are not needed.
Checker-facing code should not assume every AST node that reaches semantic-runtime is owned by the TypeScript Program.
Static evaluation, source discovery, and resource convergence can carry parsed nodes with the same file/span but a
different AST identity from the Program epoch. Prefer `TypeSystemProject.readProgramSourceFileByPath(...)` or
`readProgramSourceFileByModuleKey(...)` when scanning source for checker-backed materialization. Use
`TypeSystemProject.readProgramNode(...)`, `readProgramTypeAtLocation(...)`, `readProgramSymbolAtLocation(...)`,
`readProgramTypeFromTypeNode(...)`, `readProgramAliasedSymbolAtLocation(...)`,
`readProgramTypeOfSymbolAtLocation(...)`, or higher-level helpers such as `readRuntimeTargetType(...)` before asking the
checker about a node that originated outside the Program SourceFile.
Returning unknown/open is better than asking the checker about an alien node and crashing the public API. Do not
manufacture empty SourceFiles as fallback checker locations; a checker location must be a Program-owned source, a
checker-owned declaration, or a missing overlay/source admission signal.
Source addresses may carry host-facing workspace-relative paths, while project admissions carry project-relative paths.
`TypeSystemProject.readProgramSourceFileByPath(...)` accepts absolute, project-relative, and workspace-relative paths so
a materializer can start from a `SourceSpanAddress` without rebuilding path heuristics beside the checker epoch.
Evaluator-owned AST access is deliberately named `readEvaluatedSourceFileByPath(...)` / `readEvaluatedSourceFileByModuleKey(...)`
so call sites do not accidentally use an evaluation SourceFile with the checker.
Checker-observed source-file addresses keep their file-role metadata in public `SemanticSourceReference.sourceFileRole`
and owner key in `sourceWorkspaceKey`. Dependency implementation files admitted through `node_modules` classify as
`external-source`, even when the package is source-backed, so unified diagnostics and repair planning do not route
dependency/plugin template overlay errors as editable app source.
`readProgramNode(...)` has small per-epoch counters for request count, cache hits, same-source hits, span remaps, and
misses. Span remaps use a lazy per-Program-source span index, so the correctness guard should not silently become a
repeated DFS hotspot as overlays and source-discovery nodes multiply. Keep those counters in routed app telemetry so
large apps can still reveal unexpected remap volume.
`checker-type-assignability.ts` owns the small shared question "is this projected checker reference assignable to that
one?". Binding data-flow and runtime composition both use it because the CPU/memory trade-off and checker-epoch
fallback policy should not be reimplemented at every feature boundary. It only answers when the retained carriers share
one checker epoch, with an exact display-match fallback for already-equivalent projections; richer runtime/domain
assignability belongs in the caller's value-channel or lifecycle semantics.

`compiler-host-source-file-cache.ts` owns a process-local compiler-host source-file cache for dependency/lib files:
`node_modules` sources and declaration files outside the opened project root are cacheable, while evaluated app source
files and project-local overlay stubs stay current-epoch reads. Evaluator asset modules such as HTML/CSS-generated
default exports stay in the evaluation graph and do not become TypeScript Program roots; the checker epoch indexes
TS/JS-shaped roots plus overlay sources. This intentionally trades some session memory for much lower repeated
`ts.createProgram` cost across app epochs, especially when the local Aurelia framework checkout supplies many external
`.d.ts` files. `pressure:app-api` and `profile:app-telemetry` report host source-cache hits, misses, writes, bypasses,
hit/write source-text traffic, cacheable-read lanes, bypass lanes, and Program source-file composition next to
`type-system:program` timing; inspect those numbers before changing source admission, adding a second checker host
path, or widening cacheability to authored source. The traffic counters are the CPU/memory trade-off unit: write text
shows dependency/library text admitted into the warm cache during a cold Program, while hit text shows how much cached
text a later Program reused. Cache keys use canonical file paths plus the TypeScript parse options that affect
SourceFile shape, so duplicate canonical-path entries are visible as intentional parse-option duplication rather than
hidden map growth.
`runtime.analysisCacheOverview()` exposes the same process-local cache entry count and lifetime counters, plus
source-text density counts split by dependency, declaration, default-library, and external-declaration class. Counts
and text-character mass are both reported because a small number of declaration or default-library files can dominate
retained text/AST pressure. Use those counts to decide whether memory pressure is really coming from reusable
TypeScript dependency/library source files or from app-world products, query-local projections, or kernel detail
payloads. The dependency-cache density snapshot is cached inside the compiler-host cache and invalidated on cache
writes/clear, so repeated `analysisCacheOverview()` calls do not rescan the same retained SourceFiles.
The overview also reports parse-option buckets. Duplicate canonical-path entries can be legitimate when different
projects parse the same dependency/library file with different target/module/JSDoc source-file options; inspect those
buckets before collapsing cache keys or changing fallback compiler options. The duplicate parse-option set rows group
canonical paths that appear under more than one parse-option key, without printing the paths themselves. Use that row to
distinguish a small number of systematic option-family splits from scattered accidental cache-key drift.
The overview also names the dominant retained source-text bucket and a suggested clear policy. This is advisory, not an
automatic eviction decision: callers still choose whether CPU warmth or memory reclamation matters more for their
session.
`analysisCacheOverview({ includeTypeSystemDependencyEntries: true, rowLimit })` can also report the largest retained
dependency SourceFile entries by bucket, canonical path, and source-text size. Keep that detail opt-in: bucket density is
the ordinary cache-policy surface, while entry rows are for explaining a specific memory frontier or validating that a
cache split is aimed at the right files.
The same overview reports lifetime clear operations, cleared entry counts, cleared source-text characters, cleared
default-library/external-declaration bucket mass, and last clear policy, so cache-churn evidence remains visible after
the terminal output from a reclaim call is gone.
`runtime.clearAnalysisCache({ typeSystemDependencyCacheClearPolicy: 'all' })` can drop the retained dependency/lib
source files when a long-lived process needs memory back. Narrower policies can clear only default libraries,
node_modules files, or external declarations when overview density shows one bucket dominating. That clear operation
intentionally does not make authored project source files cacheable and does not reset lifetime counters; it only
removes reusable dependency source-file objects so the next Program open pays the corresponding cold-read cost again.
Routed public answers can apply the same clear policy at the query boundary. If the active inquiry profile is
recompute-friendly and the routed answer disposes its app epoch, the default routed policy clears all dependency/lib
SourceFiles because the caller is choosing low retained memory over warm Program construction. Bounded-retention
diagnostic profiles clear default libraries by default: this sheds the largest common TypeScript bucket while keeping
external declarations warm for follow-up diagnostics. Pass `typeSystemDependencyCacheClearPolicy: 'preserve'` when an
MCP/LSP adapter is running as a warm session rather than a one-off answer. Treat `preserve` as an explicit
CPU-for-memory choice: on larger dependency-heavy apps, retained dependency/lib SourceFiles can dominate live heap after
the app-world kernel and query-local products have already been reclaimed. Use repeat-run telemetry in one process
before choosing that policy. A useful preserve decision should show second-run compiler-host hits and lower
Program/checker timing; if profile-default clearing still misses every dependency file on the second run, that is
expected one-off recomputation rather than a broken cache.
`source-file-path.ts` owns shared TypeSystem path normalization, canonical cache keys, default-library detection, and
project-root containment checks. Keep dependency-cache and Program-composition classification on those helpers instead
of growing parallel path predicates in `project.ts` and `compiler-host-source-file-cache.ts`.

Checker declaration source is the one intentional source-address bridge that may start from a filename. Materializers
that scan boot-admitted app sources should carry the admitted source-file address handle through their site records
instead. `declaration-source.ts` first reuses an admitted source-file address for checker declarations and only then
materializes a `type-system-program` source-file address for ambient/framework/dependency declarations that the
TypeScript Program can see but the boot frame did not admit as app source.
When a checker-carrier consumer scans declaration bodies for app diagnostics, use
`admittedSourceFileAddressHandleForCheckerNode(...)`; it returns only already-admitted source files and leaves
checker-only files out of app-authored diagnostic publication.

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
Offset-based member-owner projection must follow the same wrapper forms as `astEvaluate`: `BindingBehavior` and
`ValueConverter` are not member owners, but their wrapped expression can contain the member access that an LSP hover,
binding observed-dependency row, or repair target needs. Value-converter arguments are source-read expressions because
`astEvaluate(...)` evaluates them with the current connectable; binding-behavior arguments are bind-time inputs and
should not become observed source dependencies merely because they contain member reads. If one expression path unwraps
these forms for data-flow while another path does not, source/member routes become accidentally asymmetric even though
the runtime expression is valid. Interpolation holes are separate runtime expression parts: type and observation
consumers that need per-hole binding-behavior handoffs should project each part instead of relying on the outer
`Interpolation` AST as one scope.
`evaluateWithScope(...)` also accepts a small runtime context for framework choices that affect evaluation. The modeled
mode bits mirror Aurelia's `astEvaluate` call shape: `connectable` controls the source-to-target dependency-collection
guard, while `strict` controls whether nullish member/keyed/call reads become runtime errors or ordinary `undefined`
results. Unknown strictness stays open so diagnostics do not claim a framework error without a proven runtime evaluator
mode. `++`, `--`, and compound assignment become an explicit open kind when a binding connectable is collecting
dependencies because Aurelia throws `ast_increment_infinite_loop`; listener/event-style evaluations that pass no
connectable can still project a numeric result.
Its companion files are part of the same substrate: `expression-type-evaluation.ts` owns result/open/cache vocabulary,
`expression-type-world.ts` owns cache/evaluator lifetime, `expression-type-support.ts` owns shared checker-carrier,
global, primitive, project/open/resolve/union primitives for evaluator-side projectors, `expression-type-synthesis.ts`
owns synthetic expression/template type-shape construction, `expression-call-projector.ts` owns TypeChecker
call/construct signature selection and return projection, `expression-argument-context-projector.ts` owns the bridge
from Aurelia callable AST forms to contextual argument types, and
`checker-type-shape-access.ts` owns reusable member, apparent-member, keyed, finite-keyed, index-signature, and
member-write access over projected type-shape products. `checker-type-union.ts` owns the narrow bridge to TypeScript's
checker-backed union factory when all alternatives come from the same hot checker epoch. Observation maps those
lower-level access results into Aurelia `astAssign` policy instead of reopening checker member lookup beside expression
evaluation.
`expression-access-projector.ts` sits one layer above that lower type-shape access substrate: it owns Aurelia
AccessMember/AccessKeyed/CallMember callee semantics, including owner/key evaluation, optional and non-strict nullish
reads, finite keyed access, and index-signature fallback. Keep runtime expression access policy there instead of
re-growing member/keyed access inside the evaluator, completion, or diagnostics.
`expression-scope-projector.ts` owns runtime `Scope` lookup projection for `$this`, `$parent`/ancestor access,
`AccessBoundary`, `AccessScope`, `$host`, slot lookup, and globals. Keep lookup-kind/open-subject policy there instead
of splitting binding-scope name resolution across evaluator, completion, or diagnostics.
Expression results intentionally carry a value-source address in addition to their reusable type-shape handle. This is
especially important for source-independent shapes such as `any`: the type product should still converge without a
source address, while a cursor diagnostic for `untypedRow.label` can target the `untypedRow: any` type annotation or
member declaration when that value route is known.
When an expression result crosses back into a `CheckerTypeReference`, preserve the value route with
`checkerTypeReferenceWithSource(...)` instead of taking the bare `typeShape.toReference()`. Repeat locals and binding
patterns are a good canary: an `any[]` repeat source should still let weak-owner diagnostics target the iterable owner
or repeat slot type annotation that introduced the local, even though the reused `any` type product remains
source-independent.
`expression-iterable-projector.ts` owns repeat/iterator expression semantics above the same type-shape access substrate:
it evaluates the repeat source, applies Aurelia's built-in repeat source categories, synthesizes `Map`/`ReadonlyMap`
entry tuples, and hands item types to binding-pattern local projection. Use its combined iterator projection when a
caller needs source type, element type, local projection, and repeatability diagnostics from one repeat effect; do not
re-enter the evaluator separately for each piece of repeat scope construction. Keep repeat-local scope work and
diagnostics hooked through this projector instead of adding template-controller-specific repeat type paths.
`expression-resource-projector.ts` owns expression-level resource semantics for value converters and binding behaviors:
compiler resource-scope lookup, converter target hydration, value-converter method projection, and duplicate behavior
checks. `toView` and `fromView` both route through the same checker call projector; if the converter target does not
expose the requested method, the framework `useConverter(...)` fallback leaves the value unchanged. Keep those
resource-expression policies there instead of threading resource lookups through the evaluator switch or
completion-specific helpers.
`expression-member-owner-projector.ts` owns cursor-offset member-owner projection and delegates
value evaluation plus arrow-function scope creation back to the evaluator, so completion and diagnostic code do not
grow separate offset walkers. `expression-branch-scope.ts` owns expression-local truthy/falsy branch Scope projection,
while `speculative-binding-scope.ts` owns the uncommitted same-level Scope overlay used by that projection.
`expression-contextual-type-projector.ts` owns contextual target descent into arrow scopes, array literal elements, and
object literal properties. Both ordinary expression evaluation and cursor/member-owner descent spend that projector, so
callback parameter typing, object-option typing, and nested literal context do not drift into answer-local helpers.

## Watchpoints

- `CheckerTypeReference` is intentionally a reference, not a recursive type graph. Recursive projection should be
  introduced only when an inquiry or materializer needs it.
- Type-shape identities are session-stable because checker objects are epoch-bound even when their source
  declarations are source-stable.
- Type-shape projection converges within one store by origin, checker key, and the source lane that genuinely belongs
  to the projected shape. Declaration-backed TypeChecker and evaluated-value declared surfaces converge without a
  projection source address because their semantic type identity is the checker surface plus declaration lane; the
  authored expression, binding, diagnostic, or cursor row must carry the user-facing source site that caused the
  projection. Synthetic expression/template shapes keep their projection source because their identity is produced by
  that runtime-shaped expression site.
- Source-less scalar TypeChecker surfaces such as `string`, `number`, `boolean`, `unknown`, `any`, and `never` are the
  simplest case of that rule. Their type-shape products converge with a null projection source because they have no
  meaningful declaration/source navigation of their own; the caller-owned row must carry the user-facing source
  location.
- A projected type shape keeps two source lanes separate: `sourceAddressHandle` is the expression/template/product site
  that is part of the projected shape's identity when the shape is synthetic or site-owned, while
  `declarationSourceAddressHandle` is the best TypeScript declaration span for navigation and owner-type repair
  planning. Do not overwrite either lane just to make a cursor answer look navigable; if the user-facing locus is an
  expression site, keep it on the expression/binding/diagnostic product that asked for the type.
- API repair/action rows may still reject a declaration source as an edit target when the declaration belongs to
  default-library or dependency code. In those cases the type provenance remains useful for navigation, but the
  actionable source is the app expression/member that introduced the projected owner.
- Member value routes add a narrower source lane on top of declaration source: an explicit property/parameter type
  annotation, function/method return type, or setter parameter type can be recorded with `SourceSpanRole.Type` and
  carried on the `CheckerTypeReference` for that value. Weak-owner repair planning should prefer that role when it
  exists, then fall back to declaration/name navigation only when the value-producing type span is absent.
- `CheckerTypeProjectionOrigin` should describe the type surface, not merely the caller. Template scope, observation,
  branch narrowing, and async helpers can ask for checker-returned primitive, event, narrowed, or awaited types; those
  remain `TypeChecker` projections. Use `SyntheticTemplateType` only for shapes the template/runtime substrate actually
  creates, such as unknown fallbacks, literal domains, tuple/map-entry products, or synthetic nullish unions.
- Checker-owned union and intersection keys should be structural over source-independent constituents. A union such as
  `TicketDraft | null` has no declaration of its own, but it can still converge without a projection source because its
  constituents carry declaration or primitive identity. Do not apply that rule to anonymous authored object/function
  shapes whose member declaration spans are the expression site itself.
- Checker declaration source is allowed to admit a Program-only source-file address on demand. This is not a source
  discovery fallback for app semantics; it is a navigation/provenance handoff for TypeScript declaration files reached
  through the active Program, including lib and external package declaration members.
- Member value types are currently stored as references without automatically materializing nested type-shape
  products. If member navigation or deep completion needs those products, add a projector continuation instead of
  stuffing more raw detail into completion answers.
- Runtime scope slots may still need a concrete target type when a binding expression walks through composed state,
  for example a parent binding `state.handleAction` that supplies a child bindable callback. The configuration layer's
  `bindingContextSlotTargetTypeShape(...)` is the shared continuation for that case: it spends the slot's retained
  checker member carrier and `CheckerTypeProjector.ensureProjection(...)`, keeping the member surface lazy while giving
  scope construction, overlays, and future cursor inquiries one grounded way to continue through the slot.
- Checker type members do not have standalone durable kernel identities by default. Their hot `productHandle` is an
  in-process follow-up key; value-type projections and scope slots should use the member declaration identity when one
  exists, otherwise the owning type-shape identity. Do not invent a `TypeSystemIdentity` only to parent a member value.
- Checker-backed members derive their navigable source span from the `TypeScriptDeclarationIdentity` record. Keep a
  direct `sourceAddressHandle` on `CheckerTypeMember` only for synthetic or non-declaration-backed members.
- `CheckerTypeProjectionRequest.memberProjection` is the explicit eager/lazy member-surface policy. Resource target
  types use lazy projection so app construction can publish the target type and checker carrier without enumerating
  every member up front; expression/member access can still resolve the exact member through `CheckerTypeShapeAccess`,
  and cursor/completion-shaped inquiries should request or materialize the richer member surface when enumeration is
  the product they actually need. Runtime binding-scope construction is also a legitimate enumeration consumer:
  `BindingScopeSlotProjector` may spend `readOrProjectCheckerTypeMembers(...)` so view-model fields such as route
  class references are visible to Aurelia expression lookup.
- Checker member write access is also a source-routing substrate, not just a boolean writability helper. When
  `CheckerTypeShapeAccess.memberWriteAccess(...)` falls back to a raw checker/apparent-property symbol, it materializes
  the member's value/declaration source before returning. Binding data-flow spends that source as
  `sourceAssignmentTargetSource`, so `from-view`/`two-way` repair targets can navigate to the authored member even when
  the member surface was lazy before the writeability check. String-index member writes are slightly different: the
  type-system access result proves the index-signature write policy, while observation supplies the evaluated
  owner-expression source route when no concrete member declaration exists.
- The expression type evaluator is deliberately member-surface-oriented, not runtime-value-oriented. Value converters
  can close over checker-visible `toView`/`fromView` return types because the compiler resource scope supplies a
  runtime definition; the call projector treats the converter's input value as the first method argument, inserts a
  synthesized caller-context argument for literal `withContext = true`, and then spends converter arguments for overload
  selection. Missing converter methods are identity conversions, matching runtime-html `evaluatorUseConverter(...)`,
  while missing converter resources remain open. Call/construct projection is intentionally lazy: a single
  arity-compatible signature does not cause argument evaluation just to re-prove the same return type, while overloaded
  surfaces can spend argument assignability to narrow the return lane. Generic inference from synthetic arguments,
  custom expression plugins, and richer collection prototype semantics should stay explicit until binding direction or
  plugin-specific substrate supplies the missing facts. When a converter declares `unknown[]` or another
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
  Keyed access checks the nullish owner before literal-key projection, so `foo?.['bar']` and strict
  `foo['bar']` do not degrade into a missing-member result just because the key closed statically.
- Expression evaluation can accept a contextual target type. Arrow-function parameters first spend listener `$event`
  semantics when present, then fall back through `CheckerExpressionCallProjector` to parameter types from the contextual
  callable target, and only synthesize `unknown` when neither runtime nor target-side facts can type the parameter.
  Keeping this in the call projector makes arrow-parameter context share the same arity, overload, and rest-parameter
  policy as call and construct argument context. Contextual target types also descend
  through array literal elements, object literal property values, and conditional branches before reaching nested
  arrows. This keeps binding data-flow and member-completion inference on the TypeChecker substrate instead of in
  answer-specific callback heuristics.
- Cursor member-owner projection also spends contextual call-argument types before entering an argument expression. The
  argument-context projector owns the AST-call-form handoff, the call projector owns the signature/construct parameter
  query, and the offset walker owns only the lexical descent into the argument. That lexical descent carries array
  element, object property, and conditional branch context just like ordinary expression evaluation, so cursor completion
  and value-flow diagnostics agree about nested callback parameters. This lets callbacks inside `CallScope`,
  `CallMember`, `CallFunction`, `CallGlobal`, `New`, and tagged-template substitution sites inherit TypeChecker-visible
  parameter surfaces without completion-specific callback heuristics. Tagged templates must preserve Aurelia's runtime
  call shape, `func(ast.cooked, ...results)`, when choosing overloads; the evaluator materializes a synthetic
  `TemplateStringsArray`-like first argument before handing the call to the shared signature projector.
- When a runtime-analysis phase needs expression types, enter through `CheckerExpressionTypeWorld` so scope
  construction, value-channel projection, data-flow, and future speculative lifecycle contexts share the same cache and
  evaluator lifetime. Creating a bare `CheckerExpressionTypeEvaluator` should be a deliberate inquiry-local choice, not
  the default way to get expression facts.
- Template project runtime analysis shares one `CheckerExpressionTypeWorld` across the resources in that compilation
  pass, including selected authoring templates. Resource-level timing profiles mark the cache before each resource and
  report deltas, so aggregate pressure can stay honest while the expression world itself has project-pass lifetime.
- Routed app profile summaries aggregate those resource-level expression-cache deltas before app disposal. Use that
  compact `templateExpressionTypeCache` row to decide whether a one-off public answer spent real expression-evaluator
  work before adding a new cache, retaining an app epoch, or reopening the app only for profiling.
- The shared expression cache is scope-sensitive. The evaluator salts each cache key with the modeled `BindingScope`,
  visible `TemplateResourceScope`, expression kind/span or source address, runtime evaluation mode, and contextual type
  before reading the world cache. Caller local keys still name the semantic role and projection handles, but callers do
  not need to manually encode every scope dimension to avoid cross-template or cross-resource cache reuse.
- Expression projection handles must spend the same expression source-span lane as the cache key. `CheckerTypeProjector`
  can legitimately reuse type shapes by local projection key before deeper TypeChecker identity checks, so
  `CheckerExpressionTypeEvaluator` appends the expression kind/span to the projection local key before evaluating a
  node. Do not move source-span uniqueness into individual expression-kind helpers or the cache and projected product
  identities can split again.
- Unsupported expression-call results should preserve their `CheckerExpressionTypeOpenKind` when crossing into
  observation/data-flow. Diagnostics can map the modeled callable subset to runtime `astEvaluate` framework codes, but
  the evaluator should not collapse every open call/construct expression into a generic weak-owner or assignment
  failure.
- Open expression results may carry a narrower open subject when the repairable semantic surface is not the same as
  the expression span. For example, a missing TypeChecker type on a repeat-local scope slot should carry a `scope-slot`
  subject so diagnostics can target the slot while keeping selected member names as evidence. Do not recover that
  target later by parsing diagnostic summaries or selected member strings.
- `CheckerExpressionTypeSupport` is the shared substrate for turning checker types and synthetic type shapes into
  expression evaluations. Add new expression-side projectors to that support object when they need project/open/resolve
  or union semantics; do not create another local result factory just because the runtime AST control flow lives
  outside `CheckerExpressionTypeEvaluator`.
- `CheckerExpressionAccessProjector` owns expression-level member/keyed access policy. If a feature needs to classify
  missing members, index signatures, finite literal-key unions, or nullish member/keyed reads, route it through this
  projector and `CheckerTypeShapeAccess` instead of adding another local checker/member walk.
- `checker-node-helpers.ts` owns low-level TypeChecker node/symbol utilities that are intentionally below projected
  type shapes. Use `checkerPropertySymbol(...)` for the recurring declared-type plus apparent-type property lookup and
  `checkerSymbolValueType(...)` for first-declaration value reads; do not reopen that helper pattern in observation,
  composition, diagnostics, resource convergence, router, or shape-access code unless the framework semantics require a
  narrower lookup. Product-architecture checker-call pressure is the canary for this: direct `getPropertyOfType` calls
  should stay inside the type-system substrate unless a new caller has an explicitly documented narrower lookup.
- `contract:checker-value-access` is the executable canary for that ownership rule. It allows TypeChecker value-access
  calls inside `type-system/` and the proxy-observation collector's documented local function-body context; any other
  feature-side checker call should first prove that TypeSystemProject, checker helpers, or shape access cannot own it.
- `TypeSystemProject` owns ordinary Program-node remaps before `getTypeAtLocation(...)`. Feature code that receives
  nodes from evaluation, resource convergence, diagnostics, or template materialization should call
  `readProgramTypeAtLocation(...)` instead of reading directly from `typeSystem.checker`; the only expected non-owner
  direct call is the proxy-observation collector's module-local remap, because it walks dependency-function body nodes
  inside a local type context before asking the checker.
- `symbolForExpression(...)` owns the recurring `getSymbolAtLocation` plus alias-resolution idiom. DI wrapper
  recognition, resource API diagnostics, validation source scanning, and configuration recognition should consume that
  helper when they are already holding checker-owned expressions; Program-remap consumers should use
  `TypeSystemProject.readProgramSymbolAtLocation(...)` instead. Direct `getSymbolAtLocation(...)` rows should stay in
  TypeSystemProject, checker-node helpers, or the proxy-observation local type context.
- `CheckerExpressionScopeProjector` owns expression-level `Scope` lookup and context/slot/global projection. If a
  feature needs `$this`, ancestor lookup, `$host`, boundary lookup, scope-slot open subjects, or global reads, route it
  through this projector instead of duplicating runtime name lookup beside the evaluator.
- `CheckerExpressionCallProjector` owns the distinction between runtime argument context and callback parameter binding
  context. Target rest parameters unwrap to their element type for ordinary arguments and positional callback
  parameters, but arrow rest bindings preserve the target rest array or synthesize a tuple-shaped remaining-argument
  product when the target signature is fixed-arity. Optional callable target parameters, such as
  `Array.prototype.sort(compareFn?)`, should spend the non-nullish callable signature when typing arrow parameters; a
  union with `undefined` at the callback value boundary must not force callback locals back to `unknown`.
- Overload narrowing must account for TypeScript callback overloads whose parameter surfaces are identical but return
  contracts differ. `Array.prototype.filter` is the important canary: Aurelia template arrows cannot spell a TypeScript
  type-predicate return, so inline arrows should reject the type-guard overload and choose the ordinary predicate
  overload. Contextual callback typing may still use a common callable parameter surface across those overloads so the
  callback-local `product` in `products.filter(product => product.tags.includes(label))` remains `Product` while the
  call return closes as `Product[]`, not `S[] | Product[]`. Keep this policy in the call projector instead of teaching
  diagnostics or observation to special-case array methods.
- Template completion and file/app diagnostic scans also enter through `CheckerExpressionTypeWorld`. The query object
  stays product-handle-shaped, but cursor-context construction may receive a hot world so repeated diagnostic probes
  share the same projector/evaluator cache instead of rebuilding a local TypeChecker expression stack per member span.
- Binding direction is part of expression meaning. Promise `then`/`catch` value expressions are from-view write
  targets that seed scoped locals; child interpolations read those locals afterward. Future expression inquiry should
  carry that direction instead of evaluating every parse as an ordinary read.
- Synthetic union shapes preserve only members and secondary type references common to every branch. If a future inquiry
  needs branch-aware completions, add an explicit answer continuation instead of weakening the union product into a bag
  of possible names.
- When all union alternatives still carry hot TypeChecker types from the same checker epoch, use
  `checkerBackedUnionTypeForReferences` before falling back to a synthetic union display. This matters for runtime
  value-channel facts such as `option model.bind="null"` plus `option value.bind="product.id"`: the target value is
  really `string | null`, and target-to-source assignability should compare that checker-owned union rather than hide
  behind the bound source type.
- Template-controller branch narrowing is deliberately explicit and local. The current closed branch profile handles
  scope-name truthiness, loose nullish comparisons, simple boolean negation, truthy `&&`, falsy `||`, and adjacent
  `else` negative narrowing. Broader control-flow analysis should continue to land as named semantic profiles rather
  than as accidental evaluator behavior.
- Template-controller branch replay is not the same as branch narrowing. When no narrowed slot can be published, the
  scope still needs a `TemplateControllerCondition` creator carrying the condition instruction and polarity so overlays,
  diagnostics, and future completion surfaces can reconstruct the child-view guard.
- Expression-local branch narrowing reuses that same profile without publishing template-controller Scope products.
  Conditional branches and short-circuit right operands go through `CheckerExpressionBranchScopeProjector`, which spends
  `CheckerExpressionScopeNarrower` and `speculativeBindingScopeOverlay`; do not recreate branch-local lookup inside
  completion or diagnostic answer code. `??` uses an exact nullish branch lane, not generic falsy narrowing.
- Promise template-controller result slots now cross from runtime activation semantics back into TypeChecker-backed
  expression scopes: `then="value"` receives the awaited `promise.bind` value type, while `catch="reason"` receives
  `unknown` because JavaScript promise rejection is not statically typed by `Promise<T>`.
- `with.bind` and state binding scopes are ordinary binding-context replay lanes for overlays. `with.bind` locals come
  from the value scope's binding context, and listener scopes nested under that value scope must inherit the generated
  parent alias so `$parent` still targets the outer Aurelia scope. State locals come from the modeled
  `StateBindingScope` context member expressions. Do not recover those locals from raw template names in answer code.
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
  resolvers inside answer code or expression semantics. Use `memberValueAccess` when the caller needs to distinguish a
  missing member from a checker-visible member whose value type could not be projected; use `memberValueType` only when
  every non-closed access can honestly be treated as absent.
- Related checker references on projected shapes are allowed to be handleless until a consumer needs detail. Access
  helpers must not treat a handleless `indexedValueType` or member reference as a terminal result; they should fall
  through to the retained checker carrier and materialize the reached value shape at the current semantic site.
- Do not collapse indexed-value projection into dot-member semantics. `indexedValueType` carries the value reachable by
  a dynamic key together with `indexedAccessKeyKind`; only string-capable index kinds may synthesize an index-signature
  selected member for cursor-info. Number-only indexability is still useful for keyed access and iteration, but a
  missing dot member on that owner should surface as `missing-expression-member` or another explicit weak-owner
  diagnostic instead of pretending the member exists.
