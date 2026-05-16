# Semantic Runtime API

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

This folder owns the in-process API boundary for opening an Aurelia app with the semantic runtime. It is a library
surface, not a daemon, CLI, or snapshot format.

The API should stay close to the typed substrate. It may compose boot, evaluation, configuration, DI, resource,
compiler, rendering, and TypeChecker-backed products, but it should not recreate those layers as private summary tables.
When an answer becomes awkward, prefer improving the underlying product records or adding a narrow query projection over
building compatibility glue here.

Keep `runtime.ts` as the boot/app facade. Public query enums, answer envelopes, row interfaces, and result interfaces
belong in `contracts.ts`; row projection helpers that are already specific to one substrate family should live in
focused modules such as `binding-projections.ts`, so expanding the authoring API does not turn the facade into a second
materializer.
Answer envelope/page mechanics live in `answer-helpers.ts`. Route-family answerers live in `app-route-queries.ts`:
that module owns the public query-method shape for router options, route configs, route contexts, recognizer rows,
viewport instructions/agents, route trees/nodes, and component agents, while `runtime.ts` only delegates the route
family. `route-query-registry.ts` owns the shared route query descriptors: `SemanticAppQueryKind`, stable
`routeProductKind`, row reader, and answer label. `route-effect-facts.ts` is the authoring-facing bridge over those
descriptors so API dispatch, verification, and orientation share one registry of router product rows.
Template-family answerers live in `app-template-queries.ts`: that module owns template-compilation rows plus
template completion, cursor-info, and diagnostic query handoff, while the runtime facade keeps only app opening,
app-level dispatch, and direct cursor-locus convenience methods.

## Shape

Use `createSemanticRuntime(...)` to boot a workspace, then `runtime.openApp(...)` to materialize the current app-world
view for one project. `SemanticApp.ask(...)` accepts a small query envelope for app facts; direct cursor-locus
convenience methods such as `runtime.templateCompletions(...)`, `runtime.templateCursorInfo(...)`, and
`runtime.templateDiagnostics(...)` live on the runtime facade because they may need to select or reopen an app before
answering.
One runtime instance memoizes opened app-worlds by project key; create a fresh runtime for an edit/reopen cycle that
needs new source admission.

Authoring/LSP callers can opt into standalone resource-library templates without changing the default app topology:

```ts
const app = await runtime.openApp({
  sourceFilePath: 'packages/my-package/src/my-element.html',
  includeAuthoringTemplates: true,
});
```

When `projectKey` is omitted, `sourceFilePath` selects the admitted project that owns the file. If
`authoringTemplateSourceFiles` is omitted, the same source file becomes the authoring template selection. Callers that
already know the project can still pass `projectKey` and `authoringTemplateSourceFiles` explicitly.
`TemplateCompilations` returns a `compilationLane` of `app-runtime` or `authoring` so callers can distinguish hydrated
app templates from source-file-selected authoring templates. Use `authoringTemplateLimit` only as an explicit pressure
budget or fallback when no source file is known.

Cursor-locus callers can skip that manual open step by asking the runtime facade directly:

```ts
const cursorInfo = await runtime.templateCursorInfo({
  cursor: { filePath: 'packages/my-package/src/my-element.html', line: 12, character: 18, offset: 340 },
});
```

`templateCursorInfo(...)` and `templateCompletions(...)` first reuse any already opened app-world whose compiled
template owns the cursor source. That preserves app context for templates that entered the compiler world through an
app dependency or plugin package. If no opened app contains the cursor source, the facade selects the owning project,
enables authoring-template compilation by default, and opens an authoring world whose default source selection is the
cursor file. App callers can still pass `projectKey`, `includeAuthoringTemplates: false`, explicit authoring source
options, or `authoringTemplateLimit` when they need different scope or budget behavior.

Rows default to compact source labels and counts. Opaque kernel handles are intentionally opt-in through
`SemanticRuntimeDetail.Handles`; they are useful for exact in-process follow-up navigation but too noisy for initial
answers. Paged app rows use offset cursors for this in-process facade. Earlier semantic-string cursors looked nicer but
quietly assumed every row projection had a unique display key, which is false for repeated controller and binding
shapes; exact follow-up navigation should use handles instead of cursor text. A paged query returns `partial` only
when the returned page has a `nextCursor`; a caller that drains all pages should see a final `hit`, even when the last
page is smaller than the total row count. Cursor-scoped template completion answers may carry an opaque continuation
cursor from the completion inquiry because the candidate set is not a durable row table.

```ts
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  SemanticRuntimeDetail,
} from '@aurelia-ls/semantic-runtime';

const runtime = await createSemanticRuntime({ workspaceRoot: 'path/to/app' });
const authoringCatalog = runtime.authoringCatalog();
const app = await runtime.openApp();

const overview = app.ask({ kind: SemanticAppQueryKind.Summary });
const unresolvedModules = app.ask({ kind: SemanticAppQueryKind.UnresolvedModules });
const topology = app.ask({ kind: SemanticAppQueryKind.AppTopology });
const stateStores = app.ask({ kind: SemanticAppQueryKind.StateStores });
const stateIssues = app.ask({ kind: SemanticAppQueryKind.StateIssues });
const validationIssues = app.ask({ kind: SemanticAppQueryKind.ValidationIssues });
const fetchClientIssues = app.ask({ kind: SemanticAppQueryKind.FetchClientIssues });
const dialogIssues = app.ask({ kind: SemanticAppQueryKind.DialogIssues });
const configurationIssues = app.ask({ kind: SemanticAppQueryKind.ConfigurationIssues });
const evaluationIssues = app.ask({ kind: SemanticAppQueryKind.EvaluationIssues });
const observationIssues = app.ask({ kind: SemanticAppQueryKind.ObservationIssues });
const definitions = app.ask({ kind: SemanticAppQueryKind.ResourceDefinitions });
const resourceIssues = app.ask({ kind: SemanticAppQueryKind.ResourceIssues });
const routerOptions = app.ask({ kind: SemanticAppQueryKind.RouterOptions });
const routes = app.ask({ kind: SemanticAppQueryKind.Routes });
const routeContexts = app.ask({ kind: SemanticAppQueryKind.RouteContexts });
const routePatterns = app.ask({ kind: SemanticAppQueryKind.RoutePatterns });
const routeEndpoints = app.ask({ kind: SemanticAppQueryKind.RouteEndpoints });
const routeRecognizerStates = app.ask({ kind: SemanticAppQueryKind.RouteRecognizerStates });
const routeRecognizerIssues = app.ask({ kind: SemanticAppQueryKind.RouteRecognizerIssues });
const routerIssues = app.ask({ kind: SemanticAppQueryKind.RouterIssues });
const recognizedRoutes = app.ask({ kind: SemanticAppQueryKind.RecognizedRoutes });
const typedNavigationInstructions = app.ask({ kind: SemanticAppQueryKind.TypedNavigationInstructions });
const viewportInstructions = app.ask({ kind: SemanticAppQueryKind.ViewportInstructions });
const viewportInstructionTrees = app.ask({ kind: SemanticAppQueryKind.ViewportInstructionTrees });
const routeTrees = app.ask({ kind: SemanticAppQueryKind.RouteTrees });
const routeNodes = app.ask({ kind: SemanticAppQueryKind.RouteNodes });
const routerViewports = app.ask({ kind: SemanticAppQueryKind.RouterViewports });
const viewportAgents = app.ask({ kind: SemanticAppQueryKind.ViewportAgents });
const componentAgents = app.ask({ kind: SemanticAppQueryKind.ComponentAgents });
const templates = app.ask({
  kind: SemanticAppQueryKind.TemplateCompilations,
  page: { size: 20 },
});
const exactTemplateRows = app.ask({
  kind: SemanticAppQueryKind.TemplateCompilations,
  page: { size: 5 },
  detail: SemanticRuntimeDetail.Handles,
});
const completions = app.ask({
  kind: SemanticAppQueryKind.TemplateCompletions,
  cursor: {
    filePath: 'src/my-element.html',
    line: 12,
    character: 18,
    offset: 340,
  },
  page: { size: 20 },
});
const cursorInfo = app.ask({
  kind: SemanticAppQueryKind.TemplateCursorInfo,
  cursor: {
    filePath: 'src/my-element.html',
    line: 12,
    character: 18,
    offset: 340,
  },
});
const templateDiagnostics = app.ask({
  kind: SemanticAppQueryKind.TemplateDiagnostics,
  sourceFile: { filePath: 'src/my-element.html' },
  page: { size: 50 },
});
const appDiagnostics = app.ask({
  kind: SemanticAppQueryKind.AppDiagnostics,
  sourceFile: { filePath: 'src/my-element.html' },
  page: { size: 50 },
});
const authoringOrientation = app.ask({
  kind: SemanticAppQueryKind.AuthoringOrientation,
});
const controllerRows = app.ask({
  kind: SemanticAppQueryKind.RuntimeControllers,
  detail: SemanticRuntimeDetail.Handles,
});
const targetAccessRows = app.ask({
  kind: SemanticAppQueryKind.BindingTargetAccesses,
});
const targetOperationRows = app.ask({
  kind: SemanticAppQueryKind.TargetOperations,
});
const sourceOperationRows = app.ask({
  kind: SemanticAppQueryKind.BindingSourceOperations,
});
const bindingBehaviorApplications = app.ask({
  kind: SemanticAppQueryKind.BindingBehaviorApplications,
});
const valueChannelRows = app.ask({
  kind: SemanticAppQueryKind.BindingValueChannels,
});
const dataFlowRows = app.ask({
  kind: SemanticAppQueryKind.BindingDataFlows,
});
```

Template diagnostics include framework-code rows from product-owned issue lanes. Runtime controller issues cover
renderer/controller-owned template failures such as missing resources, AuCompose static inputs, switch/case link hooks,
and portal static activation errors. Portal diagnostics come from the template-controller attribute's inline
multi-binding props, matching Aurelia's custom-attribute grammar; sibling HTML attributes such as `position="..."` are
not treated as portal bindables. Runtime binding diagnostics also include i18n `TranslationBinding` lifecycle products:
missing `t`/`t.bind` keys (`AUR4000`), duplicate `t-params.bind` on the same translated element (`AUR4001`), and
dynamic key expressions whose checker type is definitely not string-compatible (`AUR4002`).
App diagnostics also include source-backed fetch-client configuration products. The `FetchClientIssues` query owns
static `HttpClient.configure(...)` and `RetryInterceptor` rows for `AUR5001`, `AUR5002`, `AUR5003`, `AUR5004`,
`AUR5005`, `AUR5007`, and `AUR5008`; host/global fetch availability (`AUR5000`) and live interceptor-chain return
validation (`AUR5006`) stay outside this lane until semantic-runtime admits those runtime products.
`DialogIssues` owns source-backed dialog rows for bare `DialogConfiguration` registration (`AUR0904`), static
`DialogService.open(...)` settings with neither `component` nor `template` (`AUR0903`), and static child resolver keys
with no visible `withChild(...)` registration (`AUR0910`). Dialog lifecycle and renderer failures remain outside the
lane until semantic-runtime admits those runtime products.

`TemplateCompletions` reselects the owning compiled template from the supplied source cursor before delegating to the
inquiry answer. Do not assume the template-source carrier is always the cursor-owning span: external template files,
inline template references, generated template addresses, and HTML node/value products can put exact cursor ownership on
different authored spans. The API selection path therefore matches the source file and offset against the resource's
authored HTML span set and prefers the narrowest matching span. The pressure script compares this public API answer with
the lower-level inquiry answer so wrapper/source-selection drift is visible without printing app source details.
The API also threads the app emission's modeled `RouteConfig` product handles into the completion inquiry. This lets
`load="|"` answer from router facts as `router-route` candidates instead of treating the value as an open string or
re-scanning source for route-like names.
`TemplateCursorInfo` uses the same cursor-to-template selection and value-site classification path, but returns the
semantic site under the cursor rather than completion candidates: site kind, HTML node/attribute, active value site,
selected definition, selected bindable, selected expression member, member-owner type, parser frontier, and template
lane. It is the shared footing for future hover, definition, diagnostic, and explanation APIs. Bindable selection is
source-bearing when the resource definition has authored bindable metadata, so go-to-definition can later target the
bindable declaration instead of stopping at the owning custom element or custom attribute. Expression-member selection
keeps the owner type available for completion and diagnostics, but also resolves the exact authored member token when
the cursor is on a closed member name; hover/definition can then target the member declaration rather than only the
owner type. The owner type row deliberately exposes both the template/expression projection source and the TypeScript
declaration source. Hover/explanation can point at the projection source when answering "why this type here?", while
definition and owner-type repair planning should prefer the declaration source when the checker can name one.
Those member declarations may come from app source, source-shipped packages, or Program-only declaration files. The API
should surface the source reference when the TypeChecker can name the declaration. If the cursor is on a member of an
index-signature-only owner, cursor-info may report that selected member as an index-signature access with the indexed
value type and no source reference; completions should still treat that owner as non-enumerable weak-type pressure rather
than inventing candidate names.
Index-signature selected members are only synthesized for string-capable indexed access. Number-only indexed access,
such as primitive or array-like keyed reads, must not make arbitrary dot members look real. When a member token is
authored on a known owner type but the owner does not project that member, cursor-info reports
`missing-expression-member` with an inspect or declare-member action target instead of hiding the mismatch behind a
completion hit.
Authoring orientation exposes both individual `repairs` and grouped `repairClusters`. Individual rows preserve the
cursor/file evidence needed for later edits; clusters are the first large-data view for apps with many repeated weak
typing diagnostics, grouping by repair kind, diagnostic/open-seam class, suggestion action, target kind, missing input
signature, and concrete repair target source. That last split is intentional: an app with many `any` owners should
produce one source-owner-type-strengthening cluster per actionable owner surface, not one giant bucket that erases where
future edits would land. Clusters also carry action-target rows, site/value-site families, source target coverage,
distinct target member names, and member-level hints with evidence counts plus owner/value type coverage. Value-type
hints also carry their source: `selected-member` when the TypeChecker already projected the
member, `assignment-target` when a binding assignment target supplies the value type, or `binding-target` when a
value-site target type can honestly be inferred. Missing coverage is still useful signal; do not fill it from text
interpolation or a weak/null target observer just to make an autofix look complete. Pressure scripts must summarize
those dimensions without printing app-specific member names or paths, but the API keeps them available for future
code-action planning, such as proposing an interface shape from repeated weak-owner member reads or deciding which
member hints still need value-type inference.
Clusters also publish a planning classification: `planKind`, likely `changeDomain`, and `planReadiness`. These are still
semantic repair intents, not edits. A weak owner cluster can now say "strengthen this app-source owner type" and carry
the observed member/type surface, while a router or evaluator seam can stay in the runtime-policy or substrate lane. The
readiness value keeps source edit policy, missing target source, runtime intent, and substrate work distinct so a future
code-action layer does not mistake a high-count cluster for an immediately safe autofix.
Source-bearing open seams publish a `runtime-boundary` action target when the owning seam has an authored address. That
does not mean the edit is known; it means the future planner has a precise source locus for collecting user/product
intent, such as deciding whether a dynamic router `href` is deliberately external, should become a static navigation
target, or should stay runtime-dependent.
The cursor pressure script derives hover targets, navigation targets, diagnostic signals, and compact LSP envelopes
from this same result so feature pressure stays on the shared cursor-info substrate instead of becoming separate source
scans. It labels index-signature selected members as synthetic so those rows do not look like lost TypeChecker
declaration provenance.
Completion pressure classes prefer cursor-diagnostic-backed labels when the LSP envelope already explains a miss or
partial answer, but the script still prints the underlying `missingInputs` counters separately. That keeps actionable
repair surfaces such as missing scope-slot types visible without making them look like unexplained autocomplete gaps.
It also seeds a bounded `diagnostic-probe` lane from file/app diagnostic source ranges before generic expression
sampling. The reader may inspect more diagnostic rows than it samples and then chooses loci by diagnostic pressure class,
so rare diagnostics such as binding assignment strictness are not hidden behind a dominant weak-owner class. That keeps
cursor-locus pressure aligned with the diagnostic sites discovered by broader file/app loci, especially weak owner
surfaces that a first-N expression walk may miss.
In multi-project pressure runs, the script passes the current `projectKey` into the public cursor APIs before comparing
them with the lower-level inquiry answer. That keeps wrapper-drift pressure separate from legitimate app-context
ambiguity when the same template source is visible through more than one opened app-world.
Cursor-info carries first-pass diagnostic rows from two sources: completion-context weak expression-member owner
surfaces or missing selected members, and binding data-flow assignment diagnostics whose source span contains the
cursor. Binding data-flow can also carry exact framework diagnostics when the observation product has already matched a
runtime error path, such as `SelectValueObserver` single-select array updates (`AUR0654`). These rows are not text edits
yet; they expose a typed diagnostic kind, diagnostic authority, optional framework
error code, selected member, owner/value type displays, owner type projection origin, source, a suggestion kind such as
`declare-explicit-member` or `inspect-owner-type`, and an action target envelope. The action target is the
semantic thing a future code action should operate on: an `owner-type` with source for explicit member or owner-type
repairs, a `scope-slot` source when the write/read pressure has not resolved to a TypeChecker owner, an `expression`
source for runtime-noop assignment rewrites, or a `template-syntax` source for template-compiler syntax failures. This
gives future code actions a typed foothold without making autocomplete invent names from `Record<string, any>` or
`any`. When the owner type cannot be materialized because the template scope
slot itself has no TypeChecker-backed type, the diagnostic uses `expression-member-owner-type:missing-slot-type` with a
`declare-scope-slot-type` suggestion instead of pretending a member lookup happened on a known owner. The suggestion
target comes from the evaluator's open subject, so an expression such as `item.label` can report the member span as the
diagnostic source while grouping repair planning on the `item` scope slot and keeping `label` as member evidence.
Diagnostic rows keep `missingInput` as the primary compact reason and also expose `missingInputs` for the full reason
set. Binding assignment strictness can legitimately carry multiple TypeScript-policy reasons for one authored source
span, so consumers should aggregate `missingInputs` when they need pressure counts or code-action routing.
Runtime-unassignable target-to-source bindings are separate from TypeScript strictness. Aurelia's `astAssign` falls
through without updating unsupported expression targets, so semantic-runtime reports those as
`binding-source-assignment-runtime-noop` with `use-assignable-expression` guidance rather than as framework errors.
The reserved `$host` access scope is the exception on both read and write paths. A missing `$host` runtime context maps
to `ast_$host_not_found` (`AUR0105`) during source evaluation, and framework `astAssign` throws
`ast_no_assign_$host` (`AUR0106`) before ordinary scope lookup during writeback. Binding data-flow therefore reports
both exact runtime AST codes instead of treating `$host` as a synthetic `$` writeback local.
Unsupported callable expression reads are a different lane because Aurelia's runtime evaluator throws exact
`astEvaluate` errors when a call target, tagged-template tag, or named member call is not callable. Binding data-flow
rows now carry `sourceTypeOpenKind` from the TypeChecker expression evaluator, and diagnostics map supported callable
open kinds to exact runtime codes (`AUR0107`, `AUR0110`, `AUR0111`) through `RuntimeAstFrameworkErrorCode`.
Binding data-flow also carries the rendering controller's `strictBinding` state into TypeChecker expression evaluation.
Optional and non-strict nullish member/keyed/call reads project `undefined`; unknown strictness remains open; and strict
definitely-nullish member/keyed owners map to `AUR0114`/`AUR0115` only when that state is explicitly `true`. Strict
nullish call targets spend the matching callable runtime code (`AUR0107` or `AUR0111`) through the same framework
authority lane instead of being reported for non-strict bindings.
The write side uses the same gate: strict member/keyed assignment through a definitely nullish owner maps to
`ast_nullish_assignment` (`AUR0116`) as a binding source-assignment diagnostic, while non-strict or unknown strictness
keeps the row out of framework-error authority.
Source-to-target binding evaluation also asks the TypeChecker evaluator in connectable mode. Increment operators and
compound assignment then surface `ast_increment_infinite_loop` (`AUR0113`), matching Aurelia's guard against mutating a
binding source while dependency collection is active. Event-handler-style evaluations should remain non-connectable and
must not spend that code.
Value-converter and binding-behavior resource lookup diagnostics spend the runtime-html binding-utils authority instead
of the runtime evaluator authority: missing value converters map to `ast_converter_not_found` (`AUR0103`), missing
binding behaviors map to `ast_behavior_not_found` (`AUR0101`), and duplicate authored behavior names map to
`ast_behavior_duplicated` (`AUR0102`) through `RuntimeHtmlAstFrameworkErrorCode`. The repair guidance for those rows
should route to resource registration or expression rewrite, not callable-expression repair.
Repeat destructuring is owned by scope construction instead: `RuntimeBindingScopeIssue` products spend checker-backed
binding-pattern projection and map non-object or non-Array-rest item shapes to `AUR0112`. Keep this partial: the Atlas
runtime `ast*` frontier is broader than these call/destructuring diagnostics, and unmodeled runtime AST failures should
stay unclaimed until the matching expression, assignment, or scope-effect substrate exists.
Repeat source compatibility is also scope-owned, but its authority comes from runtime-html `RepeatableHandlerResolver`
rather than runtime AST: scope construction now maps sources outside the built-in repeat categories to
`repeat_non_iterable` (`AUR0777`) through `RuntimeHtmlControllerFrameworkErrorCode`. The modeled default
categories are arrays, sets, maps, numbers, and nullish. App-registered `IRepeatableHandler`s are future DI/configuration
pressure, so do not broaden this with generic TypeScript iterable or array-like heuristics before that substrate exists.
Repeat option diagnostics are controller-owned. Runtime rendering now publishes `RuntimeControllerIssue` products for
the `Repeat` constructor failures that inspect iterator tail `MultiAttrInstruction`s: invalid `key` commands
(`AUR0775`), extraneous option targets (`AUR0776`), and invalid `contextual` commands (`AUR0821`). Template diagnostics
surface these as `runtime-controller-framework-error` rows with template-syntax repair guidance. Renderer resource
lookup failures use the same issue lane for named-resource instructions that cannot resolve from the rendering
container: custom elements (`AUR0752`), custom attributes (`AUR0753`), and template controllers (`AUR0754`). Controller
bindable observer setup is in the same product lane: when TypeChecker-backed observer selection can prove that the framework
would receive a collection observer without `useCoercer` or `useCallback`, `controller_property_not_coercible`
(`AUR0507`) and `controller_property_no_change_handler` (`AUR0508`) surface through `RuntimeControllerIssue` rather
than resource or API-local diagnostics. Built-in `AuCompose` static input diagnostics also use
`RuntimeControllerIssue`: literal invalid `scope-behavior` values map to `AUR0805`, literal invalid `flush-mode` values
map to `AUR0809`, and static string `component` / `view-model` lookup misses map to `AUR0806` by probing the parent
hydration-context container. Runtime-only run/deactivate failures stay unclaimed until composition lifecycle state is
modeled. Built-in branch link-hook diagnostics use the same lane: orphan `else` maps to `AUR0810`, orphan `case` /
`default-case` controllers map to `AUR0815`, and duplicate `default-case` controllers under one switch map to `AUR0816`. Promise-result link-hook
diagnostics are also controller-owned: orphan `pending`, `then`, and `catch` controllers map to `AUR0813` when they are
not rendered inside the synthetic view created by a parent `promise.resolve`.
Controller activation diagnostics can also be source-backed when the framework failure is caused by a view-model DI
request rather than a template attribute value. Ordinary custom elements and custom attributes that resolve
`IViewFactory` during instance activation map to `AUR0755`; template controllers are exempt because the renderer passes
a prepared view factory provider for their nested view.
Runtime binding diagnostics are owned by `RuntimeBindingIssue` when the failure belongs to a concrete runtime binding
rather than to behavior application or scope-effect spending. `SpreadBinding` uses that lane for captured-attribute
transfer failures: missing hydration context maps to `AUR9999`, and template-controller child admission maps to
`AUR9998`. Template diagnostics surface those as `runtime-binding-framework-error` rows. `AUR0770`
`no_composition_root` is still unclaimed because it belongs to `Aurelia.start(...)` lifecycle/app-root state.
Runtime renderer diagnostics are owned by `RuntimeRendererIssue` when the failure belongs to renderer dispatch before a
binding/controller product exists. `RefBindingRenderer` maps `view.ref` to `AUR0750` because runtime-html rejects that
ref target during `getRefTarget(...)`, maps missing named ref targets to `AUR0751` only after a custom-element host
exists, and maps `AUR0762`/`AUR0763` for the framework `findElementControllerFor(...)` host checks that happen before
controller/component or named custom-element fallback can resolve on ordinary DOM elements. `SpreadValueRenderer` maps
invalid spread targets to `AUR0820` when `.spread` lowering produces a `SpreadValueBindingInstruction` target other than
`$bindables`. Diagnostics surface these as `runtime-renderer-framework-error` rows.
Runtime binding-behavior diagnostics are owned below the API by `RuntimeBindingBehaviorIssue`. Built-in bind-time
behavior issues now map `& self` non-listener usage to `AUR0801`, `& updateTrigger` argument/mode/observer-config
failures to `AUR0802`, `AUR0803`, and `AUR9992`, `& signal` invalid binding/no-signal cases to `AUR0817` and
`AUR0818`, `& attr` on non-property bindings to `AUR9994`, and double throttle/debounce rate limiting to `AUR9996`.
Custom binding-behavior bind methods can contribute direct `PropertyBinding.useTargetSubscriber(...)` effects through
the compiler resource scope; conflicting target-subscriber effects surface as `AUR9995`.
The sibling `AUR9993` service replacement failure is intentionally unclaimed until semantic-runtime models non-default
`INodeObserverLocator` configuration.
`BindingBehaviorApplications` exposes the positive side of that same materializer: each authored `& behavior`
application that survives resource lookup and bind-time modeling reports its behavior name, owning binding kind,
bind-time phase, argument count, statically known scalar/template literal argument values, target kind/property, source
address, and optional product handles. Use this query when authoring needs to verify that a generated template
materialized a behavior such as validation-html `& validate:'blur'`; keep it distinct from diagnostics, which only
surface rejected or conflicting applications.
Runtime value-converter diagnostics are owned below the API by `RuntimeValueConverterIssue`. Built-in `sanitize`
invocation now spends runtime-html `method_not_implemented` (`AUR0099`) only when the converter resource is visible and
the active container tree has no modeled `ISanitizer` resolver; app-provided sanitizer registrations suppress the
diagnostic. Template diagnostics surface that row as `runtime-value-converter-framework-error` with service-registration
repair guidance.
Current weak-owner and strictness diagnostics use `diagnosticAuthority: "semantic-authoring-policy"`;
runtime-noop assignment rows usually use `diagnosticAuthority: "framework-runtime-behavior"` with
`frameworkErrorCode: null`; exact assignment failures such as `$host` assignment can use
`diagnosticAuthority: "framework-error-code"` on the same diagnostic kind.
Rows with `diagnosticAuthority: "framework-error-code"` should only be introduced after checking Aurelia source through
Atlas `framework.errors` and should carry the exact framework code. The expression parser now has a low-level
`ExpressionFrameworkErrorCode` bridge for exact parser counterparts such as `parse_left_hand_side_not_assignable`.
That bridge records the intended framework package/enum/member as well as the AUR label because labels can collide
across framework packages. Template diagnostics should read those codes and messages from parser products, including
companion/frontier publications, not infer them from diagnostic wording later.
Template compiler failures should surface through compiler issue products, not API-local wording checks. Attribute
classification currently publishes exact framework authority for reserved spread syntax
(`compiler_no_reserved_spread_syntax` / `AUR0720`) and reserved `$bindables` syntax outside custom-element declarations
(`compiler_no_reserved_$bindable` / `AUR0721`). Binding-command lowering publishes the same issue-product shape for
custom-attribute inline segments that bind to non-bindables (`compiler_binding_to_non_bindable` / `AUR0707`) and
modeled command build failures such as `ClassBindingCommand` invalid comma-separated class targets
(`compiler_invalid_class_binding_syntax` / `AUR0723`). Compiled-template assembly publishes it for root `<template>`
surrogate attributes rejected by the framework (`compiler_invalid_surrogate_attr` / `AUR0702`), surrogate template
controllers (`compiler_no_tc_on_surrogate` / `AUR0703`), `[au-slot]` projection under a non-custom element
(`compiler_au_slot_on_non_element` / `AUR0706`), `<slot>` without shadow DOM
(`compiler_slot_without_shadowdom` / `AUR0717`), and `<let>` commands the framework rejects
(`compiler_invalid_let_command` / `AUR0704`). It also publishes the framework local-template failures for root
local-element templates (`AUR0701`), only-local-template content (`AUR0708`), local templates outside the root
(`AUR0709`), local bindables outside the local template root (`AUR0710`), missing local bindable names (`AUR0711`),
duplicate local bindable property/attribute pairs (`AUR0712`), empty local-template names (`AUR0715`), and duplicate
local-template names (`AUR0716`). File/cursor diagnostics read those issue products and turn them into
`template-compiler-error` rows with `template-syntax` repair targets.
Non-template framework errors should surface the same way: through product-owned issue records in the substrate that
models the framework behavior. `ResourceIssues` currently exposes resource metadata/controller watcher failures from
bindable decorator convergence (`AUR0227`, `AUR0228`, `AUR0229`), process-content hook convergence (`AUR0766`), watch
convergence (`watch_null_config` / `AUR0772`, `watch_invalid_change_handler` / `AUR0773`,
`watch_non_method_decorator_usage` / `AUR0774`), `@children(...)` invalid query convergence (`AUR9989`),
non-field `@slotted(...)` decorator usage (`AUR9990`), controller watcher lookup (`AUR0506`), and containerless shadow/slot
conflicts (`AUR0501`). Keep those rows owned by resource convergence; the API may project and page them, but should not
manufacture their authority. Resource-registration duplicates from the runtime-html definition registrars are also
`ResourceIssues`: duplicate custom elements (`AUR0153`), custom attributes (`AUR0154`), value converters (`AUR0155`),
and binding behaviors (`AUR0156`). Resource API calls that can be proven invalid from TypeScript source also publish
`ResourceIssues`: `CustomElementDefinition.create(...)` with only a string name (`AUR0761`) and project-local
`getDefinition(...)` misses for custom elements (`AUR0760`), custom attributes (`AUR0759`), value converters
(`AUR0152`), and binding behaviors (`AUR0151`). `DiIssues` exposes container/world-construction failures in the DI lane; the first
modeled case is duplicate source/static `$au` resource-key publication, which follows the Aurelia kernel
`resource_already_exists` / `AUR0007` warn-and-skip path rather than the separate `registerResolver(...)` throw path.
It also exposes ambient `resolve(...)` calls that are definitely evaluated without Aurelia's current container
(`no_active_container_for_resolve` / `AUR0016`) and activation-time `resolve(null)` / `resolve(undefined)` key
validation (`null_undefined_key` / `AUR0014`), while leaving caller-dependent function/member calls as topology facts
rather than exact diagnostics.
`AppDiagnostics` is an aggregation query over configuration, DI, evaluation, observation, template, resource, router,
and route-recognizer diagnostic products. It preserves
`diagnosticDomain` and `relatedQueryKind` so callers can drill back into the owning query instead of treating app
diagnostics as a separate semantic layer. The owning diagnostic rows are collected before the app-level page is applied;
do not page a child query and then aggregate it, or pressure summaries will hide high-volume diagnostic classes.
The policy for turning weak owner and binding assignment pressure into cursor/file diagnostic rows lives in
`template-diagnostic-policy.ts`. Keep that boundary honest: cursor/template readers should locate source and semantic
context, while the policy module owns severity, suggestion kind, action target, and product-policy wording.
`SemanticRuntime.authoringCatalog()` and the equivalent `AuthoringCatalog` app query expose the static authoring
vocabulary and recipe contract projection. They return operation families, taste axes and values, profiles,
capabilities, operation descriptors, and recipe expected-effect contracts before those contracts are mixed with an
opened app. Use this when the question is "what authoring vocabulary exists?" or "what does this recipe expect?", then
use `AuthoringOrientation` when the question is "what does this opened app currently satisfy?". Catalog taste-axis rows
also split their common values by `primitive-policy`, `observed-shape`, and `derived-reading`, so callers can see
whether an axis has policy-bearing values or only source/framework observations without reopening `ontology.ts`.
Capability catalog rows also expose product-level open reasons that are true before app inspection, and operation
catalog rows inherit those reasons from their required capabilities. Use those fields to separate global product gaps
such as package-tooling/source-edit policy from app-specific evidence gaps reported by `AuthoringOrientation`.
Profile rows carry explicit taste preferences for profiles that have a policy-bearing shape, rather than leaving
decorator/convention/registration choices only in prose.
Recipe catalog rows carry the same preference row shape from their seed plans, so callers can compare recipe policy,
profile policy, and opened-app taste observations without reading recipe source. They also expose the recipe source-plan
contract without file text: conflict, formatting, package-tooling policy, file roles, languages, edit kinds, and text
authority. Source-plan rows now carry a project-tooling subrow for package dependencies, scripts, package/config file
kinds, and build-tool policy without exposing file text. Use that shape to decide whether a recipe is genuinely editable
or whether a host/generator policy is still missing; current recipes provide package/typecheck baselines while leaving
build-tool profile selection open. Recipe preference rows also carry `build-tool-profile:host-selected-build-tool`, so
callers can see that open policy without interpreting `buildToolPolicy: not-modeled` as an accidental omission.
Recipe catalog and orientation rows also expose direct base recipes, transitive lineage, and `specificityRank`; use
those fields when several recipes are satisfied, because richer recipes intentionally contain the app-shell and
state-backed shapes they build on.
Generated recipe expected effects also verify the observed `build-tool-profile:typecheck-only-tooling` taste after
reopen, and `AuthoringOrientation` reports `package-tooling` as partial or observable rather than fully open while
package-manager/build execution remains an explicit product-open reason.
`AuthoringOrientation` lifts the same diagnostic/open-seam pressure into `repairs` rows. Those rows are semantic repair
intents, not edits: they classify whether the next move is to declare a member, strengthen an owner type, rewrite a
binding source, resolve a runtime boundary, inspect an open seam, or improve semantic-runtime substrate. Concrete edit
application and formatting policy stay outside this API until the source-edit boundary is designed.
Taste rows in the same orientation answer keep durable vocabulary separate from the opened app reading:
`ontologySummary` explains the stable taste value, while `summary` / `observedSummary` explain the current evidence
that made the value appear. Recipes should check value-level layer, confidence, and evidence before turning taste into
an edit preference. Axis rows report primitive-policy, observed-shape, and derived-reading value counts; `policyState`
is inferred only when at least one primitive-policy value is present, so observed framework/source facts can satisfy a
recipe signature without pretending a user or product policy was declared.
Keep the axis key itself narrow. Template source ownership, template rendering boundaries, form value channels,
validation ownership, form type-surface trust, stylesheet/resource ownership, and dynamic style binding are separate
orientation axes because they come from different semantic substrates and often fail independently. Dynamic style
binding rows are read from observer value-channel semantics, so class tokens, per-class toggles, whole style rules, and
per-property style bindings remain visible as distinct observed shapes.
Validation ownership is read from validation-html `& validate` binding-behavior applications, validation package
configuration admissions, validation service resolve sites, and source-rule validation issue rows. Keep those positive
ownership signals separate from `ValidationIssues`, which remains the source-backed diagnostic lane for invalid
validation rule construction or hydration. The `binding-behavior-applications` query is the fact-level API surface for
the `& validate` part of that reading; the authoring taste row is the interpreted ownership summary.
Recipe rows expose `expectedEffectKinds`, `expectedEffectCount`, and compact `expectedEffects` rows from their concrete
plan builders after compressing duplicate semantic targets across step-local and final verification effects. The same
compression is exported as `expectedSemanticEffectsForPlan(plan)` for concrete fixture and repair verification. The row
form preserves a compact `semanticTargetKey`, effect kind, scope, cardinality, count, filter fields, capability/taste
targets, filter values, role, taste value layer/ontology summary, and summary, then evaluates each effect against the currently
opened app with the same observation primitive used by closed-loop verification. `baseline` effects are general app-health checks; `signature` effects are the facts that make
a recipe recognizable in an existing app; `discriminator` effects are required recipe-identifying facts that keep a
router- or service-specific recipe from looking applicable only because a generic form/app shell matched. Each
expected-effect row reports `currentObservedCount` and `currentOutcome`; each recipe row summarizes all effects,
signature-like effects, and discriminators separately, then derives `currentFitState`. A recipe with no satisfied
signature-like effects, or with an unsatisfied discriminator, is `not-applicable` rather than a failed verification.
When multiple recipe rows are `satisfied`, prefer the highest `specificityRank` before treating the app as a generic
base recipe match.
`project-tooling` expected effects are backed by project source-role rows, so generated recipe checks can verify package
manifests, TypeScript config files, local module declarations, and the typecheck-only tooling taste without comparing
file text.
This lets fixture expansion ask "what does this app already satisfy?" before opening recipe source files or running a
separate verifier pass.
Closed-loop callers should derive expected effects with `expectedSemanticEffectsForPlan(plan)` and build verifier input
with `readAuthoringVerificationSnapshot(app)`. The helper paginates the
row-backed projections used by filtered effects instead of relying on each smoke or host to remember that behavior
applications, target-access rows, value-channel rows, and data-flow rows must travel together with summary, topology,
orientation, and open seams. Unsupported row-backed projections fail at snapshot construction time, so callers do not
mistake a too-shallow analysis depth for absence of the expected semantic facts.
`TemplateDiagnostics` lifts those same weak-owner facts from a cursor answer into a file/app-locus answer. It scans the
opened app's compiled template basis, or the requested `sourceFile` when supplied, through parser-owned member-name
spans and returns exact source ranges for diagnostic rows. Keep this as an aggregation over the same cursor-info
substrate until diagnostics grow their own materializer: cursor remains the sharpest probe, while file/app loci are the
batch surfaces that editors, CI, and agents need.
Batch diagnostic scans read authored template text through the admitted source-file address, whose path is workspace-
relative. Do not resolve those addresses relative to the selected app project: nested app packages and source-shipped
dependency packages can both contribute compiled templates to one app-world.
Host paths are only for reading file contents; API diagnostic source rows should keep the admitted source-address path
so file/app diagnostics, cursor-info, and binding data-flow rows share one provenance identity.
The scan caches source text together with line-start offsets. Keep offset-to-line conversion indexed rather than
prefix-splitting per diagnostic span; file/app loci intentionally walk many expression member spans.
The scan also carries one `CheckerExpressionTypeWorld` through its repeated cursor probes. That keeps TypeChecker
expression projection, resource-scope evaluator selection, and cache lifetime aligned with runtime analysis while
leaving the public completion query as a durable product-handle contract.
Template completion and cursor-info answers preserve `missingInputs` from the inquiry substrate. For expression-member
sites, weak owner shapes such as `any`, index-signature-only records, or owner types with no projected members are still
reported there so callers can explain the absence of candidates. They are not, by themselves, proof of a missing
semantic-runtime rule; pressure scripts classify them as weak-type pressure unless a concrete typed member was lost
between scope construction and the answer.

`AppTopology` is the first app-building projection. It composes already-materialized configuration, resource, compiler,
template, authored router facts, and source CSS imports into app roots, components, route configs, bindables,
component dependencies, external template assets, component/global style asset rows, component-role rows, roleful source
files, class-level service/state/model rows, and source-level DI injection rows for Aurelia `resolve(...)` calls.
Style rows keep plain CSS imports and inline Aurelia `cssModules(...)`/`shadowCSS(...)` registry arguments separate, so
`style-resource-ownership` can distinguish global stylesheets, component stylesheets, CSS modules, and Shadow DOM
styles without reading raw source. Authoring verification can also target those rows directly with the `style-resource`
expected effect when a plan needs a fact-level style asset check. Component roles are derived joins over app roots,
route config/component-agent facts, runtime controller creation, built-in template-controller flow, listener target
operations, native form value flows, and captured-attribute forwarding; they are query evidence for authoring
negotiation, not a separate naming heuristic. Conventional state, service, and model support files are surfaced as source roles
so app-building plans can verify the shape they asked for without treating those files as Aurelia resources. Only
class-bearing support files become `services` rows; a folder named `state` is not by itself a DI-owned state class.
`injections` rows preserve the consuming source/class, exact resolve-call span, key declaration when it belongs to the
opened project, and authored import identity when the key comes from a framework/plugin package such as
`@aurelia/state` or `@aurelia/i18n`. They also expose execution context and active-container expectation so module/static
`resolve(...)` can be diagnosed separately from instance activation and caller-dependent lookups; nullish key-argument
facts are preserved so the DI lane can distinguish `AUR0014` from `AUR0016`. `stateCompositions` rows are narrower: they report public state-class properties
whose TypeChecker value is a project-local class instance, such as a root state object owning smaller composed state
objects. Plugin-backed state, such as `@aurelia/state`/`IStore`, should appear as a separate authoring taste signal
rather than being folded into custom state-class topology. Keep the projection verification-oriented: if a future
authoring plan cannot be checked by this projection or another narrow semantic answer, improve the substrate before
adding source-generation convenience.

`StateStores` is the first plugin-state query. It projects `StateDefaultConfiguration.init(...)` and `.withStore(...)`
builder calls into store-configuration rows before the framework's creating `AppTask` constructs a runtime `Store`,
registers it with `IStoreRegistry`, and aliases the default store to `IStore`. This keeps plugin-backed state visible
as its own product surface instead of pretending an app has a custom DI-owned state class. Rows expose default/named
store shape, initial-state value kind, options-versus-action-handler form, action-handler count, and optional handles
for exact follow-up. `StateIssues` carries the framework-runtime raw Error lane for the same substrate: `.withStore('default', ...)`
is rejected at the builder boundary, and duplicate store names are reported at the store-registry registration phase.
Those rows use `frameworkRawErrorAuthority` instead of synthetic AUR codes because `@aurelia/state` throws raw
`Error` instances at those sites.

`ValidationIssues` exposes the first validation package source-diagnostic lane. It is deliberately separate from
validation-html binding behavior diagnostics: validation-html owns template `& validate` bind-time behavior, while this
query owns source-authored `@aurelia/validation` rule construction and model-rule hydration. The current exact rows
cover `AUR4101`, `AUR4102`, `AUR4105`, `AUR4106`, and `AUR4108` only when the framework branch is statically closed;
serialized validation payloads and live custom-rule execution remain unclaimed until semantic-runtime admits those
product surfaces.

When `createSemanticRuntime` is opened without explicit projects, boot discovers package/tsconfig project frames for
monorepo-shaped workspaces. Default `openApp()` chooses an `aurelia-app` project from import/receiver-grounded bootstrap
signals without constructing and
emitting rejected candidates into the shared kernel store; callers with a known app package should still pass
`projectKey` explicitly. If no app-shaped project exists, `openApp()` now fails closed instead of treating an arbitrary
app-source or resource-library project as a runtime app; authoring/LSP callers should pass `projectKey` or a
`sourceFilePath` so the intended resource-library/project frame is selected explicitly.
`SemanticRuntimeSummary.projects` exposes both `shapeKind` and `analysisKind`. The shape records what was discovered
from package/source signals; the analysis kind is the current app-opening policy: app worlds, resource-library authoring
worlds, Aurelia package inspection, or outside-Aurelia. Pressure scripts use that policy by default so monorepo utility
packages are still visible in summary counts but are not opened as fake app worlds unless a caller explicitly filters
for their shape.
Repeated authoring queries may open the same runtime with different cursor or file loci. Source-file admission is
idempotent for the same project/path handles, and the direct cursor/file APIs first reuse an already-opened app whose
compiled template owns the requested source file. This keeps app-context queries from forking duplicate kernel records
when a caller alternates between app-scope and LSP-scope answers.
Cursor/file APIs accept absolute host paths, app-project-relative paths, and workspace-relative paths at the boundary;
once a source file is admitted, source-address paths are the workspace-relative authority.
Each opened app-world emission carries a compact phase profile for diagnostic lanes. The public queries still expose
semantic products rather than profiler rows, but pressure scripts can attribute `openApp` cost to static evaluation,
TypeChecker project construction, resource recognition, app-world composition, and template compilation without
persisting project names or source paths.
The app pressure script also separates projects with app roots from resource-only/library packages. In monorepos, a
library package can carry many Aurelia resources and even open seams without being an app entrypoint; keep that
distinction visible before treating every seam as an app-startup failure. The script reports opened app-world emissions
instead of "apps" because the same `openApp()` substrate is used for real app projects and standalone library authoring
worlds.
When the selected shape is `aurelia-resource-library`, the script asks for a bounded set of admitted template source
files through the authoring-template lane. That keeps resource-library pressure close to editor/LSP usage: app-runtime
template counts remain honest, while standalone component templates still exercise diagnostics, value channels, and
open seams.
Cursor/LSP pressure has the same project-shape scoping via
`SEMANTIC_RUNTIME_CURSOR_PRESSURE_PROJECT_SHAPES`, so app-only cursor sampling and standalone resource-library cursor
sampling can be compared without changing the underlying API. Use exact `SemanticProjectShapeKind` values in both
shape env vars: `aurelia-app`, `aurelia-resource-library`, `aurelia-package`, and `non-aurelia`.

`UnresolvedModules` expands the summary's `unresolvedModuleEdges` count into module-key, module-specifier, and source
rows. Use it for project/source-root footing pressure before treating a missing import as an evaluator or Aurelia
semantic gap.

`OpenSeams` is app-emission scoped, not a raw dump of the shared workspace kernel store. In a monorepo runtime session,
opening another project should not make seam rows bleed into the first app answer. The projection includes source-
addressed seams owned by the app's admitted/evaluated sources plus emission-local DI, template, runtime rendering,
observer, value-channel, and data-flow seams that may not have a precise authored address yet.
Rows expose both human `summary` text and typed `reasonKinds`. Pressure scripts should aggregate the typed reason kinds
when present, reserving summary text for human inspection and raw-detail debugging. For example, a router resource whose
instruction value depends on host environment state remains a router open seam, but carries both
`router-instruction-needs-static-value` and `host-environment-value` as stable machine-readable pressure.
When the same router seam is blocked by a binding expression, router materialization should preserve its own
`router-instruction-needs-static-value` reason and attach the lower-level binding-source reason, such as a runtime scope
slot without a static value carrier. This keeps ownership honest: router owns the product seam; observation owns the
source-value explanation.
Dynamic `href` router-resource seams can also carry `router-href-externality-open`. That reason means the framework
would decide at runtime whether the value is an external URL before creating viewport instructions; semantic-runtime has
not proven either the external lane or a static internal route string. Click-interception facts are separate:
`router-href-click-interception-disabled` is for proven disabled gates such as `useHref=false`, non-anchor hosts, or a
co-located `load` custom attribute, while `router-href-click-interception-target-open` is for anchor `target` values
that must be compared with the runtime window name. In both cases, `HrefCustomAttribute.valueChanged(...)` still needs
the runtime value to decide whether to write the raw URL or generate an internal router URL.
Authoring orientation lifts that into runtime boundary and intent rows on repair clusters. The important distinction is
whether the boundary is router href classification, static route instruction closure, or binding-source runtime value,
and whether the next operation needs href ownership intent, an explicit external-href declaration, a static navigation
target, or a stronger binding source. When the seam has source provenance, that cluster should carry a
`runtime-boundary:source` action target so future repair planning starts from the authored value span instead of a
source-less app-level bucket.
Observation-owned seams can also carry typed reasons. For example, `SelectValueObserver` channels distinguish unclosed
option values, empty option domains, missing authored select targets, dynamic `multiple.bind` whose source cannot carry
both runtime branches, and multi-select source-shape pressure; any data-flow row blocked by that channel preserves the
same reason instead of flattening the pressure into an untyped binding seam.

`EvaluationIssues` exposes product-owned diagnostics from the static evaluation layer and framework-shaped evaluator
handoffs. `ModuleLoader` transform-input validation reports `aliasedResourcesRegistry(...)` and
`IModuleLoader.load(...)` inputs that statically close to invalid direct values as
`invalid_module_transform_input` / `AUR0021` with the rejected evaluator value kind and exact input-expression source.
The framework API issue pass also reports source-local framework utility guards such as EventAggregator falsy
channel/type inputs, `firstDefined(...)` with no defined argument, and `Metadata.define(...)` with no metadata key. Raw
framework utility guards use `frameworkRawErrorAuthority` instead of synthetic AUR codes. `AppDiagnostics` reports these
rows under the `evaluation` domain and links back to `evaluation-issues`.

`ResourceDefinitions` exposes converged Aurelia resource definitions recognized from explicit decorators, runtime
definition objects, static fields, metadata, and project conventions before app-world/compiler visibility is known.
This is the right query for plugin-library and monorepo package pressure where a package can define resources without
booting an app root. Rows include resource kind, declaration modes, name/key/aliases, target name/source, bindables,
dependencies, template shape, watch metadata, attribute-pattern entries, custom-element/custom-attribute flags, and
optional kernel handles. Declaration modes preserve the convergence carrier mechanism, so authoring orientation can
distinguish decorator, static, definition-object/factory, and current convention resource styles without re-reading
source.
Watch rows expose the metadata shape that resource convergence can statically close: expression kind/property key,
callback kind/property key, flush mode, and source references for the expression/callback carriers when known.
`ResourceIssues` exposes known framework failures in that same resource metadata lane. It is for closed static errors,
not open seams: if Aurelia would throw for malformed bindable metadata, a malformed `@processContent(...)` hook, a
malformed `@watch(...)`, or a static/definition-object watcher, resource convergence should publish a resource issue
with exact framework code authority; if the metadata is runtime-dependent, the convergence path should keep a typed open
seam instead. It also owns runtime-html duplicate resource-definition registration warnings (`AUR0153`-`AUR0156`) when
DI registration spending can prove the duplicate named resource slot, plus direct runtime-html resource API failures
(`AUR0151`, `AUR0152`, `AUR0759`, `AUR0760`, `AUR0761`) when TypeChecker-resolved call sites and recognized resource
definitions prove the same framework path.
`ResourceVisibility` stays narrower: it answers which definitions are visible to a particular compiler world after
configuration, DI, and resource-scope composition have materialized.

`ConfigurationIssues` exposes known framework failures discovered while reading source-backed configuration products.
It currently includes direct runtime `Scope` API nullish-argument failures (`null_scope` / `AUR0203` and
`create_scope_with_null_context` / `AUR0204`), `NodeObserverLocator` duplicate mapping failures
(`node_observer_mapping_existed` / `AUR0653`), and `AttrMapper` duplicate mapping failures
(`compiler_attr_mapper_duplicate_mapping` / `AUR0719`). `DiIssues` exposes source-backed
DI world-construction issues. It currently includes duplicate source/static `$au` resource keys
(`resource_already_exists` / `AUR0007`) as warning rows with container/resource handles when requested, ambient
`resolve(...)` context/key failures
(`no_active_container_for_resolve` / `AUR0016`, `null_undefined_key` / `AUR0014`), and invalid `@inject`-family
decorator targets (`invalid_inject_decorator_usage` / `AUR0022`). Observation issues expose source-backed runtime
observation diagnostics such as invalid `@astTrack` non-method targets (`ast_track_decorator_not_a_method` / `AUR0117`)
and invalid `@observable` decorator contexts (`invalid_observable_decorator_usage` / `AUR0224`) that are not resource
metadata. `AppDiagnostics` aggregates configuration, DI, observation,
evaluation, template, resource, router, and route-recognizer diagnostics by reading each owning diagnostic row set first, then applying the
app-level page; do not page one diagnostic domain before aggregation or app-level counts will drift.

`RouterOptions` exposes effective option products materialized from `RouterConfiguration` admissions and
owner-tagged `customize(...)` option contributions. Rows include the framework-defaulted booleans and strings that are
already used by static topology, especially `useHref`, `useUrlFragmentHash`, and `useEagerLoading`. These rows are the
authoring/API view of router option convergence; they are not a navigation runtime state snapshot.

`Routes` exposes source-backed authored router route configs recognized from `@route(...)`, `Route.configure(...)`, and
Aurelia's static route metadata path used by `Route.getConfig(...)`. Rows preserve route kind, paths,
origin kind, value kind, id/title/redirect/viewport/data/nav/fallback presence, child-route cardinality, routeable component reference kind,
whether that routeable has resolved to a concrete resource definition, source, and optional handles. Dynamic
`import(...)` route components are reported through the promise routeable lane even when their fulfilled custom element
definition is already known.

`RoutePatterns` is the next lower route-recognizer layer. It parses closed route-config paths into
`ConfigurableRoute`-shaped rows with `Parameter`, `StaticSegment`, `DynamicSegment`, and `StarSegment` facts,
case-sensitivity, route-config-context ownership, recognizer handles, optional parent path, recognizer path, and exact
path-source handles when available. In eager-loading mode, child contexts reuse the root recognizer and publish
parent-prefixed recognizer paths while keeping the local authored route path separate.
`RouteEndpoints` exposes the next `RouteRecognizer.add(..., true)` product: primary endpoints plus the framework's
residual catch-all endpoints for routes that do not already end in a star parameter.
`RouteRecognizerStates` exposes those state graph nodes directly: state kind, value, segment name/pattern presence,
forward `nextStates` cardinality, previous state label, endpoint closure, dynamic/optional/constrained flags, source, and
optional handles. This is the route-recognizer x-ray layer needed before candidate matching can be trusted without
guessing from route config rows.
`RouteRecognizerIssues` exposes source-backed route-recognizer conditions where Aurelia would throw while registering
the graph, currently duplicate path registration and ambiguous endpoint assignment. These rows are not open seams: they
are known framework failure semantics carried as product facts so diagnostics can cite the recognizer, endpoint/state
references, message, source, optional `frameworkRawErrorAuthority`, and optional handles while the rest of the static
app graph remains inspectable. Raw authority keys are used only for exact public framework raw Error sites; mapped
router `Events` still flow through `frameworkErrorCode`.
`RouterIssues` exposes source-backed router runtime conditions outside the lower-level recognizer graph. Route config
validation publishes `invalid-route-config-property` / `AUR3554` and `invalid-route-config` / `AUR3555` rows before
downstream router materializers consume normalized route facts; rows carry the framework property path, expected
surface, actual closed value, route-config reference, source, and optional handles. RouteTree redirect-parameter
migration publishes `redirect-unexpected-expression-kind` with exact router `exprUnexpectedKind` / `AUR3502` authority
when redirect `path` or `redirectTo` RouteExpression trees contain grouped or sibling expressions.
RouteConfigContext eager path generation publishes `eager-path-generation-failed` with exact
`rcEagerPathGenerationFailed` / `AUR3166` authority when object navigation instructions close to a routeable component
whose endpoint path cannot be generated from the provided params. Rows preserve route-config and recognized-route
references when available, the component/path/redirect fields relevant to the owning router algorithm, source, and
optional handles.
Template diagnostics also project router issue rows whose authored source belongs to the selected template. Those rows
use `router-framework-error` so file-level and cursor-locus APIs can surface `load`/`href` expression parser,
instruction creation, recognition, viewport-resolution, and eager path-generation failures without moving issue
ownership out of the router domain. `AppDiagnostics` still reads the owning router issue lane and filters those
template-projected copies to avoid double-counting. Cursor-info uses the same projection path and should prefer the
exact expression/value span from parser or HTML value provenance over the broader attribute carrier when a router issue
originates in a template value.
`RecognizedRoutes` exposes the next layer for closed static router-resource instruction paths. Rows carry the recognized
path, residue presence, fulfilled parameter count, recognizer reference, causing `ViewportInstruction` /
`ViewportInstructionTree`, route-context closure, redirect depth, redirect source route config, endpoint
path/residual closure, source, and optional handles. The
recognizer walk mirrors Aurelia's `RouteRecognizer.recognize(...)` candidate chain, including the handler-based endpoint
grouping that keeps multi-path and residual endpoints attached to the same route config. Closed static redirects publish
additional recognized-route rows for their re-recognized target paths with `redirectDepth > 0` and
`redirectSourceRouteConfig` pointing at the redirect route config that produced the target. These rows are still
pre-transition facts: the original `ViewportInstruction` rows remain the instruction-tree creation products, while
recognized-route rows are the handoff into route-tree compilation.

Resolved routeable components also seed template compilation. That recursive rendering bridge lets routed component
templates and nested `au-viewport` / `ViewportAgent` topology show up before a future route-tree/navigation emulator
exists. App roots seed the route-context topology when they are known; resource-only package analysis can still fall
back to graph roots. Treat this as static route/component topology, not as proof that viewport activation or guard
lifecycles ran.
The app summary also distinguishes configured-route contexts from runtime route contexts: `routeConfigContexts` counts
the `RouteConfigContext`/recognizer topology, while `routeContexts` counts the static `RouteContext` products that join
those config contexts to parent/root context, modeled child containers, and hosting viewport agents. `routerViewports`
and `viewportAgents` are owned by those runtime route contexts, not by the config-context layer. The
`RouteContexts`, `RouterViewports`, and `ViewportAgents` queries expand those counts into compact rows with labels,
source references, container/host-controller closure, and optional handles.
`RouteTrees` and `RouteNodes` expose the route-tree layers that are currently closed: the synthetic root tree/node that
`Router.routeTree` creates before navigation, and context-relative transition trees compiled from closed static
`ViewportInstructionTree` products when their recognized routes point at non-redirect route configs. Rows carry
instruction-tree closure, root context/config/component labels, node counts, effective options closure, query/fragment
shape, instruction/original-instruction references, recognized-route references, params/query/fragment facts,
viewport/residue shape, path/final-path, child counts, source references, and optional handles. Treat these rows as
pre-activation route-tree compilation facts; the runtime still does not claim to have run guards, scheduled viewport
updates, activated component agents, or exhausted every redirect edge case. Redirect routes that reach transition
compilation without a modeled redirect target still surface an explicit router open-seam reason instead of silently
disappearing from the transition tree. Closed static redirect targets are consumed through their
`redirectSourceRouteConfig` edge, and framework-rejected redirect targets or expression shapes surface as
`RouterIssues` / `AppDiagnostics` instead of generic open seams.
`TypedNavigationInstructions`, `ViewportInstructions`, and `ViewportInstructionTrees` expose the handoff products that
router resources create before route-recognizer matching and route-node transition compilation. Rows keep the
RouteExpression-backed typed instruction kind/value lane, viewport wrapper shape, child cardinality, parameter count,
grouping open/close markers, route-context closure, absolute/query/fragment flags, and optional handles visible without
claiming that navigation or viewport activation has run. Static string values and interpolation/template strings with a
static route prefix can both materialize this layer; dynamic holes become opaque segment/query values so the recognizer
can still reason about route shape. Getter/field-backed string values may also close through binding-source value
evaluation. Fully dynamic or host-dependent values remain open with the lower-level binding/evaluator reason preserved
as typed open-seam reason kinds. Object-form router resource values first run through the eager path-generation
substrate; successful generation re-enters this RouteExpression-backed lane, while framework-shaped failures surface in
`RouterIssues` and `AppDiagnostics`.

`ComponentAgents` exposes the first static `RouteContext._createComponentAgent(...)` handoff for recognized transition
nodes. Rows connect the route context, route node, selected viewport agent, resolved routeable component, and routed
controller product. The corresponding `RuntimeControllers` rows use the `routed-custom-element` creation kind and
`created` readiness: the controller and child container exist as framework-shaped pre-activation facts, but guards,
viewport scheduling, and component activation are still outside the current runtime claim.

Summary and template-compilation rows now distinguish configuration DI containers from renderer-created runtime child
containers. `appTasks` counts both source-observed AppTask products and framework-owned AppTasks surfaced while spending
known framework registrations. Use `runtimeChildContainers` and `runtimeChildContextResolverSlots` as the compact
pressure signal for whether component/template-controller rendering has closed enough container shape for deeper DI
answers.
`runtimeBindingDataFlowSourceTypeGaps` is the compact count of closed binding data-flow rows whose source expression
could not be typed through the current TypeChecker-backed scope. These are strictness/type-projection pressures, not
runtime binding open seams. Spread value bindings use the same lane when the spread object type does not expose one of
the target component's bindable keys: runtime can still read `undefined`, while the TypeChecker gap remains visible on
the row.
Reverse-write strictness is similarly product-owned. Binding data-flow rows expose both the human
`sourceAssignmentReason` and typed `sourceAssignmentReasonKinds`, so pressure scripts and future policy layers can
aggregate readonly members, owner-member projection gaps, TypeChecker target-to-source mismatches, and runtime
unassignable expression shapes without parsing prose. The compact summary uses
`runtimeBindingDataFlowSourceAssignmentPressures` rather than "gaps" because runtime assignability and TypeScript
strictness are separate axes: a two-way binding can be honest Aurelia runtime flow while still carrying policy pressure
for diagnostics or authoring guidance. Pressure output prints assignment-kind/reason-kind cross-products so runtime
unassignable rows stay distinct from runtime-assignable-with-strictness rows.
Framework `astAssign` only throws exact runtime codes for reserved `$host` assignment (`AUR0106`), strict nullish
member/keyed assignment (`AUR0116`), and destructuring source failures (`AUR0112`); non-assignable expression kinds
such as calls or tagged templates are framework-runtime no-ops and should stay code-less diagnostics unless a future
framework usage path changes that authority.
It also prints generalized reason-by-source-type, reason-by-assignment-target-type, reason-by-target-type, and
reason-by-writeability cross-tabs. Use those before opening raw app rows: they reveal whether a pressure class is a
real unsupported assignment, a readonly TypeChecker surface, an `unknown`/`any` target value channel, or a
value-converter/repeat local that lost element specificity. For member writes whose full expression type is open,
`sourceAssignmentTargetType` can still carry the owner type that diagnostic suggestions should navigate to.
Public binding projections use the same combined template basis as diagnostics: app-runtime resources plus any
source-selected authoring resources opened for resource-library/package pressure. Keep those bases aligned; otherwise
diagnostic rows and binding data-flow rows count different template worlds in monorepo/resource-library pressure.

`RuntimeControllers` exposes controller frames created or reached during runtime `Rendering`, including the resource
definition, creating instruction, parent/child counts, binding count, scope presence, template-controller flow/cardinality
semantics, a compact controller readiness value, a compressed lifecycle timeline, and the recursive hydration handoff
that is currently modeled. Lifecycle timeline rows are consecutive-step aggregates over the framework-shaped events the
semantic runtime can currently see: controller creation, child-container setup, `Controller.addChild`,
`Controller.addBinding`, `IViewFactory` creation, synthetic-view creation, `Rendering.render`, Scope attachment, and
`Controller.bind`. Custom-element controllers report
`compiled-template` when the controller has a first-class `ControllerUsesCompiledTemplate` claim. Template-controller
controllers report `instruction-sequence` when their hydration instruction owns a nested child sequence and expose the
modeled `IViewFactory` association. The factory carries a generated embedded custom-element definition product, creates
an aggregate `synthetic-view` controller row for the `IViewFactory.create(...) -> Controller.$view(...) ->
_hydrateSynthetic() -> Rendering.render(...)` pass, and publishes both definition and instruction-sequence claims.
Aggregate rows are intentionally cardinality-aware rather than instance-precise: `repeat` still reports `many`, while
`if` and promise branches report their optional/single branch shape. Template-controller branch rows also expose
`templateControllerLinkKind` and `linkedTemplateControllerName` when Aurelia's `link(...)` hook connects them to a
controlling template controller, such as `else -> if` or `then/catch -> promise`.

`BindingTargetAccesses` exposes target-side accessor/observer lookup selected during `Controller.bind` for runtime
property bindings and interpolations: accessor versus observer lookup, target kind, target property, selected built-in
strategy, DOM events, target/property type displays, target type source, writability, observability, authority, source
address, and optional handles. This is the compact authoring pressure signal for form controls, class/style property access, and later
TS-backed source/target flow through ObserverLocator-shaped semantics. Standards-shaped attribute access such as
`data-*`, `aria-*`, and generated SVG-analyzer attributes reports the `data-attribute-accessor` strategy, matching
Aurelia's `NodeObserverLocator` routing. Native node target types also distinguish exact DOM tag-map resolution from
broad `HTMLElement`/`SVGElement` fallback, so unknown custom-host or web-component tags remain visible without
tag-name heuristics. Target access rows can also carry exact framework error-code authority when the observer lookup
itself would throw. The current modeled case is runtime-html `node_observer_strategy_not_found` (`AUR0652`) when
`NodeObserverLocator.allowDirtyCheck` is disabled and an existing native node property has no configured observer
strategy; the row uses `diagnosticReason` for that closed framework rejection while `openReason` remains reserved for
unresolved observer-locator semantics. `TemplateDiagnostics` and `AppDiagnostics` surface the closed rejection as
`binding-target-access-framework-error` with a `configure-node-observer` suggestion that points at the observer-config
boundary, and the value-channel row reports `rejected-target-access` rather than opening data-flow again.

`TargetOperations` exposes direct target updates that do not ask `ObserverLocator`. Rows include an owner lane:
renderer-owned operations from `SetPropertyRenderer`, `SetAttributeRenderer`, `SetClassAttributeRenderer`, and
`SetStyleAttributeRenderer`, plus binding-owned operations from `AttributeBinding.updateTarget(...)` for `.class`,
`.style`, ordinary attribute writes, `ContentBinding.updateTarget(...)` for text content writes, and
`ListenerBinding.bind(...)` for event listener subscription. Rows report owner kind, binding/renderer kind, target
attribute, target property/token/key, static value when one exists, operation kind, affected names, authority, source
address, optional handles, and row-local open pressure. `BindingTargetOperations` remains as a compatibility entrypoint
for the same projection while callers migrate to the broader name.

`BindingSourceOperations` exposes source-side binding behavior that should not be squeezed into DOM target updates.
`RefBinding.updateSource(...)` publishes a `ref-assign-target` operation after resolving Aurelia's ref target lane:
`element` returns the authored node, `component`/named custom elements return a controller view-model, custom attribute
names return the custom attribute view-model, `controller` returns the controller product, and unsupported `view.ref`
stays open. These rows are consumed by value-channel and data-flow projections as `ref-target` target-to-source flow.

`BindingBehaviorApplications` exposes successfully materialized runtime binding-behavior applications after the
compiler resource scope, rendered binding product, controller bind phase, and binding-behavior materializer have all had
their say. Rows intentionally describe positive applications rather than errors: behavior name, owning binding kind,
phase, argument count, static scalar/template literal argument values, target kind/property, source address, and
optional handles. Authoring
verification uses this lane for fact-level effects such as "the generated validated form actually produced `& validate`
applications" before deriving higher-level validation ownership taste.

`BindingValueChannels` exposes the observer/accessor or direct-operation value shape that runtime data flow should use
instead of blindly treating the raw DOM property as the transported value. Rows also carry `usesCustomMatcher` so
checked/select channels can report that Aurelia runtime comparison is delegated to an app-provided matcher even though
the matcher function body remains outside static execution. Static single-select options now surface a
literal value domain such as `'ship' | 'pickup'`, and expression-backed `model.bind`/`value.bind` can supply option,
radio, and checkbox element values through the lowered sibling binding products. `checked.bind` surfaces boolean,
radio-value, checkbox array/set-membership, and checkbox map keyed-boolean branches. Static multi-selects expose
selected option element domains for array sources. Dynamic `multiple.bind` surfaces as `select-dynamic-option-value`
when the source type can accept both
single-select scalar updates and multi-select array updates; otherwise it remains channel pressure. Non-literal dynamic
element values should stay visible as channel pressure until their observer semantics are closed. Select-channel open
rows carry typed reason kinds such as
`binding-value-channel-dynamic-select-multiple`,
`binding-value-channel-select-option-value-open`, `binding-value-channel-select-option-domain-open`, and
`binding-value-channel-select-multiple-source-open` on both the value-channel row and any dependent open data-flow seam,
so scripts can aggregate the framework concept without parsing the human summary.
`multiple.bind` closes as static only for literal `true`/`false` expressions or single boolean-literal TypeChecker
projections. A normal `boolean` source remains runtime-dependent, but that dependency is represented by the dynamic
channel when the value source is broad enough rather than by an open seam.
Class/style value channels report `class.bind` and class interpolation token channels, `.class` toggle channels with
their toggled class names, `style.bind` and style interpolation rule channels, and `.style` property channels with the
targeted CSS property. Text interpolation through `ContentBinding` reports `text-content` channels backed by
`text-content-set` target operations. `SpreadValueBinding` reports the target/value shape of its per-bindable inner
`PropertyBinding` fan-out when the target component's bindable keys are statically known, instead of pretending that
`...$bindables` is a static DOM property. `SpreadBinding`-owned inner bindings created from captured `...$attrs` are
reported through the same target-access, target-operation, value-channel, and data-flow projections as ordinary
bindings, while their ownership remains a binding-to-binding runtime claim under the hood.

`BindingDataFlows` exposes the source/target edge after scopes plus target access or target operation are materialized.
Rows report binding direction, parser publication state/result kind, value-site kind, source expression
lane/name/root/type, raw target property type, observer/direct-operation runtime value type, TypeChecker source-type
pressure, source writability for target-to-source flows, TypeChecker assignability checks in the active directions,
optional framework error code, source address, optional handles, and row-local runtime data-flow open pressure. This is the compact pressure signal for
two-way form controls, setter-backed state, class/style presentation bindings, template-controller value bindings, and
future validation/write diagnostics. Direct spread value bindings appear here as source-to-target flow from each spread
object property into the corresponding target bindable, such as `featuredCardBindings.productId -> productId`.
Captured `...$attrs` flows appear as the concrete inner binding that `TemplateCompiler.compileSpread(...)` produced,
for example a forwarded `disabled.bind="false"` reporting boolean-to-boolean flow on the inner input element. Captured
parent expressions can also surface here: the storefront `field-shell` wrapper reports forwarded `value.bind="email"`
as an inner input value flow typed against the checkout-form parent scope.
Current product-owned framework-code rows include runtime-html `select_observer_array_on_non_multi_select` (`AUR0654`)
for array sources flowing into single-select channels, runtime `assign_readonly_size` (`AUR0220`) for source-to-target
writes through `CollectionSizeObserver`, and runtime `assign_readonly_readonly_property_from_computed` (`AUR0221`) for
source-to-target writes through getter-only `ComputedObserver` targets. Template and app diagnostics surface those as
`runtime-binding-framework-error` rows with `binding-data-flow:<code>` as the compact missing input.
`sourceName` preserves the display expression summary, while `sourceRootName` records the component scope member that
owns the flow when it can be determined. API joins should use the root when they need to connect a member chain or
single-root interpolation back to the component getter/setter that implements the behavior.

## Fixture Pressure

Authoring fixtures live under `../../fixtures/authoring`. They should look like code we would be comfortable
recommending to Aurelia users, even when that makes the semantic runtime work harder. See
[../authoring/README.md](../authoring/README.md) and [../application/README.md](../application/README.md) for the
authoring/topology boundaries behind those fixtures.

Analyzer stress fixtures should be separate from authoring fixtures. Avoid adding brittle golden snapshots around either
kind of fixture; the valuable signal is whether the API can expose precise, navigable open seams and compact high-level
answers after the app is reopened.
