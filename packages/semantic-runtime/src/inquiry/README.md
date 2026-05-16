# Inquiry Substrate

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

Inquiry is the answer algebra above the kernel. It turns selectors and loci into answers without creating a second
semantic store or making transport, presentation, or consumer policy own the core model.

Core inquiry pressure comes from editor, Atlas, tooling, and agent use: a caller often starts from a workspace, project,
file, cursor, range, or known kernel handle and needs a truthful answer plus a navigable follow-up move.

## Responsibilities

- Represent query loci such as workspace, project, source file, source cursor, source range, and kernel record.
- Preserve outcomes such as hit, miss, ambiguous, open, partial, unsupported, and reroute.
- Carry answer basis, projection lanes, expansions, evidence handles, provenance handles, claim handles, open seams,
  page state, and continuations.
- Resolve host selectors into the narrowest currently known inquiry locus.
- Share answer-assembly helpers such as source-file-address narrowing and ordered de-duplication through the inquiry
  helper modules so answer surfaces do not grow private copies of the same selector vocabulary.
- Expand materialized products through typed product-detail slots when a consumer asks for detail rather than handles.
- Answer template/expression completion from already-materialized parser, scope, resource, and definition details.
- Keep confidence, ranking, actionability, and UI/AI policy above the kernel.

## Non-Responsibilities

- Producing kernel facts.
- Interpreting TypeScript, Aurelia configuration, resources, DI, or templates.
- Hiding uncertainty behind empty result arrays.
- Treating projection shape as semantic authority.
- Treating inquiry relations as durable app graph edges before a real materializer has earned a kernel claim predicate.

## Design Pressure

Inquiry is where answer shape is separated from produced facts. Kernel records can preserve that a materializer was
partial or blocked; an inquiry answer can expose the seams, continuations, source context, and graph handles needed by later
presentation or policy layers without changing what the kernel facts mean.

Compiler and editor pressure comes from integrating HTML parsing, attribute classification, expression parsing, and
instruction lowering. Those flows need to serve batch-like compiler questions and live IDE questions from the same
semantic substrate. Cursor and range loci, recovery frontiers, candidate sets, explanation paths, and pagination should
be modeled here or in answer envelopes, not smuggled into kernel claims or compiler products.

Projection lanes are intentionally consumer-neutral. A transport or presentation adapter can map LSP, Atlas, tooling, a visual
workbench, diagnostics, AOT, or agent-facing APIs onto compact, detail, explanation, source-context, or graph
projections outside the intent taxonomy. Those are projections over the same substrate, not separate meanings of the
substrate.

Inquiry does not carry a parallel intent ontology. Query shape, locus, projection, basis, and continuation kind should
be enough for callers to understand what an answer attempted. If a relation starts carrying real app meaning across
materializers, promote it into kernel vocabulary and signed claim predicates rather than only naming it in answer
metadata.

This layer should not encode ranking, actionability, UI copy, transport defaults, or consumer personas. Materializers
should preserve what they observed, what they could derive, and which seams remained open. Inquiry answers expose
enough typed shape for later policy layers to decide how much to show, how to rank it, which continuation is useful
next, and whether a caller can act on it.

`template-completion.ts` is the concrete completion answer surface. It deliberately assumes cursor-to-template-site
classification already happened: the query supplies a site kind and optional product handles for binding scope,
resource scope, selected resource definition, expression parse, active value site, and optionally a checker-projected
member owner type. The answer spends those typed details and reports missing inputs rather than re-scanning templates
or inventing candidates. Member completion after `foo.` can derive the member-owner type from the parser's closed owner
subtree or, when the cursor is inside a larger expression, from an offset-aware evaluator walk that preserves lexical
arrow scopes. Listener expressions get their `$event` slot from the runtime binding scope, so `$event.detail` and
listener callback parameters are TypeChecker projections over Aurelia's listener semantics rather than answer-local
string handling. Expression-member queries also carry the active value-site product, so bindable target types can
contextualize arrow parameters when the target surface exposes a callable type. That is an answer-local type
projection over the same shared type-shape access path used by repeat destructuring, not runtime execution and not
completion ranking. Static
attribute-value completion stays honest about ownership: plain static platform values publish
`plain-attribute-value` sites and may remain empty misses, platform attributes that actually enter interpolation publish
`plain-attribute-interpolation` sites whose expression holes use the normal expression completion path, finite checker-backed bindable domains can offer literal `attribute-value`
candidates, open-ended checker-backed scalar bindables are expected-empty completion sites, inline multi-binding
custom-attribute values can offer bindable segment-name candidates from the resource definition, and router `load`
and `href` primary values can offer `router-route` candidates from the app's modeled `RouteConfig` products while
remaining open-ended because framework `href` can also represent external URLs. Static i18n `t` values can offer
`i18n-translation-key` candidates from `I18nTranslationKey` products materialized out of closed
`I18nConfiguration.initOptions.resources` data. Custom-attribute
segment values that resolve to a bindable report bindable-domain pressure rather than blaming the whole custom
attribute. Built-in template-controller primary values use `template-controller-semantics.ts` to distinguish open
framework domains such as `case="..."` from secondary bindables such as `fall-through`; open primary values are
expected-empty completion sites rather than missing finite domains. Remaining custom-attribute primary-value and
custom template-controller grammars still report bucketed value-domain gaps until their domain has a real candidate
lane.

`templateCompletionQueryForCursor` is the cursor adapter over the horizontal compiler/runtime path. It consumes a
materialized `TemplateResourceRuntimeAnalysisEmission`, picks the smallest HTML/value/scope products around the cursor,
classifies the site, returns the same product-handle `TemplateCompletionQuery` used by the answer, and carries the
selected bindable, selected expression-member name, and expression frontier for cursor-inspection APIs that should not
pay completion candidate collection cost. Closed member tokens and member frontiers deliberately share the same owner
type derivation path: completions need the owner surface, while hover/definition can resolve the exact authored member
token from that same owner type without rescanning template source. Empty
start-tag attribute positions, such as `<my-element |>` before an authored attribute product exists, are still
classified from the materialized element and template-source span rather than by rescanning project source. That keeps
cursor-sensitive editor/tooling entry points above the compiler products without creating a second completion path.

Interpolation completion adds one extra answer-local projection over the same value-site product: when a text value
contains multiple incomplete `${...}` holes, the cursor adapter reparses that product with an active offset so the
parser publishes the hole under the cursor. The compiler's batch interpolation product remains unchanged; inquiry only
selects the active frontier needed for the current answer. The value-site product itself does not make the whole text
or attribute value an expression-completion site: cursor classification only enters expression inquiry when the cursor
is inside an interpolation hole, command-owned expression, or expression/member frontier span. Plain text and plain
attribute values remain non-expression sites even though the compiler may have materialized interpolation parse
products for the surrounding authored value. Completed value-converter and binding-behavior names are also classified
by their authored name spans, not only by parser frontiers, so existing tail names can use the same resource-candidate
lanes as incomplete `|` and `&` continuations.
An interpolation frontier that only expects the final interpolation-hole close is not a completion blocker: Aurelia's
runtime parser can consume that final EOF-style hole, so expression-scope completion should still read binding scope
while cursor-info can expose the strict authoring diagnostic signal.

`pnpm --filter @aurelia-ls/semantic-runtime pressure:cursor-loci` is the current batch pressure view for this layer. It
samples bounded template cursor loci, answers completion through the same cursor adapter, compares that substrate answer
with the public `SemanticApp.ask({ kind: TemplateCompletions })` path, compares cursor site/value-site classification
with `SemanticApp.ask({ kind: TemplateCursorInfo })`, and prints aggregate site kinds, outcomes, completion pressure
classes, value-site kinds, candidate lanes, public-API mismatches, cursor-info source coverage, hover/navigation
targets, diagnostic signals, LSP envelopes, value-domain gaps, and bucketed missing-input reasons without paths, source
text, or candidate names. Use it for LSP-shaped pressure before assuming a gap belongs to parsing, scope construction,
resource lookup, API wrapping, or domain-specific value completion. `SEMANTIC_RUNTIME_CURSOR_PRESSURE_ROOTS` accepts a
path-delimited list of absolute or workspace-relative roots, so a single fixture or transient external checkout can be
sampled without changing the script. The known `fixtures/authoring` and `fixtures/pressure` collection roots expand to
their child fixture projects; use `SEMANTIC_RUNTIME_CURSOR_PRESSURE_OUTPUT=aggregate` for broad collection pressure and
`SEMANTIC_RUNTIME_CURSOR_PRESSURE_INPUT_LIMIT` for a cheap first canary. Diagnostic probes are scoped back to the
compiled resource's own source spans before comparing direct substrate answers with the public API, so same-file
multi-template diagnostics do not create false template-resource mismatches. `SEMANTIC_RUNTIME_CURSOR_PRESSURE_PROJECT_SHAPES`
can scope that sampling to app-shaped, resource-library, Aurelia-package, or non-Aurelia project frames; if omitted,
the cursor script uses `SEMANTIC_RUNTIME_PROJECT_SHAPES` when present and otherwise samples all booted projects. Both
env vars accept exact runtime shape tokens: `aurelia-app`, `aurelia-resource-library`, `aurelia-package`, and
`non-aurelia`. The
public API comparison passes the sampled app's project key on purpose, so candidate mismatches point at cursor/API
wrapping drift rather than at the direct runtime facade choosing a different cached app-world that also owns the source.
The
command opts into the authoring-template lane by selecting admitted template
source files per project, with the older per-project template cap only as a fallback when no template source file can be
selected. Hydrated app/runtime templates remain the default app-topology surface; standalone resource-library templates
are compiled only when an authoring/LSP inquiry asks for those files. This keeps app facts honest and prevents broad
monorepo sampling from turning "all possible component templates" into an accidental app-world hydration claim.
Cursor pressure deliberately separates missing semantic-runtime substrate from weak application typings. Completion
answers still carry `expression-member-owner-type:any`, `index-signature-only`, and `no-members` as missing inputs so
hover/completion callers can explain why member candidates are absent, but the pressure script classifies those rows as
`weak-type:*` when the expression-member site has no candidates. Treat that as typing or value-shape pressure in the app
or plugin surface unless a lower-level projection lost a concrete TypeChecker member.
The public cursor-info API now turns those weak owner surfaces into diagnostic rows with coarse suggestion kinds. This
keeps completion honest while giving future diagnostics/code actions enough structure to recommend stronger owner types
or explicit properties. The diagnostic row carries the owner type projection origin and an action-target envelope, so
pressure can distinguish TypeChecker/app-typing weakness from synthetic template-semantics weakness while also seeing
whether a future code action should target an owner type, a scope slot, or the authored expression. Missing owner-type
rows such as `missing-slot-type` should remain diagnostic pressure: they say the template scope did not provide enough
TypeChecker footing for the owner expression, not that completion should invent members.
Cursor-info also reports `missing-expression-member` when the selected member token is absent on a known owner type.
This is distinct from weak-owner completion pressure: the owner was found, but the authored member does not belong to
that projected surface. String index signatures can still produce synthetic selected members, but number-only indexed
access cannot. That distinction keeps primitive and array-like owners from looking like broad records during hover,
diagnostics, and future code-action planning.
Diagnostics are not cursor-only. Cursor loci remain the highest-pressure way to force template/resource/value-site
selection to be exact, but file/app loci now aggregate the same cursor-info diagnostic substrate through
`SemanticAppQueryKind.TemplateDiagnostics`. Use that batch answer when the product question is editor diagnostics, CI,
or agent review over a whole template file; use cursor pressure when the question is whether a specific source offset
selects the right semantic site.
Cursor-info also carries template compiler diagnostics at the active cursor offset. Some malformed or recovery-heavy
source positions are not completion sites and may still classify as `unknown`, but they should surface the exact
framework-code diagnostic and syntax-rewrite suggestion instead of becoming a silent completion miss.
For app/file diagnostics, source text should be loaded from the admitted source-file address using workspace-root
semantics. The selected app project may be nested below the workspace, while compiled template resources can also come
from source-shipped package dependencies; resolving every address relative to the app project silently hides those
member-token diagnostics.
Resource-library pressure should use the same authoring-template lane for file/app loci that cursor pressure uses for
cursor loci. Selecting admitted template source files keeps diagnostics and value-channel seams visible for standalone
components without reclassifying a library package as an app runtime entrypoint.
