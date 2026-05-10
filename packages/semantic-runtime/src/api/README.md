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

## Shape

Use `createSemanticRuntime(...)` to boot a workspace, then `runtime.openApp(...)` to materialize the current app-world
view for one project. `SemanticApp.ask(...)` accepts a small query envelope for app facts, while named methods such as
`summary()`, `sourceFiles(...)`, `unresolvedModules(...)`, `appTopology(...)`, `resourceDefinitions(...)`,
`routerOptions(...)`, `routes(...)`, `routeContexts(...)`, `routePatterns(...)`, `routeEndpoints(...)`,
`routeRecognizerStates(...)`, `recognizedRoutes(...)`, `typedNavigationInstructions(...)`, `viewportInstructions(...)`, `viewportInstructionTrees(...)`,
`routeTrees(...)`, `routeNodes(...)`, `routerViewports(...)`, `viewportAgents(...)`, `componentAgents(...)`,
`resourceVisibility(...)`,
`templateCompilations(...)`, `templateCompletions(...)`, `templateCursorInfo(...)`,
`runtimeControllers(...)`, `bindingTargetAccesses(...)`, `targetOperations(...)`,
`bindingTargetOperations(...)`, `bindingSourceOperations(...)`, `bindingValueChannels(...)`, and
`bindingDataFlows(...)` are available for TypeScript callers.
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
enables authoring-template compilation by default, and opens a stable project authoring world rather than one app
variant per cursor file. App callers can still pass `projectKey`, `includeAuthoringTemplates: false`, or explicit
authoring source options when they need a narrower app-open behavior.

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
const app = await runtime.openApp();

const overview = app.ask({ kind: SemanticAppQueryKind.Summary });
const unresolvedModules = app.ask({ kind: SemanticAppQueryKind.UnresolvedModules });
const topology = app.ask({ kind: SemanticAppQueryKind.AppTopology });
const definitions = app.ask({ kind: SemanticAppQueryKind.ResourceDefinitions });
const routerOptions = app.ask({ kind: SemanticAppQueryKind.RouterOptions });
const routes = app.ask({ kind: SemanticAppQueryKind.Routes });
const routeContexts = app.ask({ kind: SemanticAppQueryKind.RouteContexts });
const routePatterns = app.ask({ kind: SemanticAppQueryKind.RoutePatterns });
const routeEndpoints = app.ask({ kind: SemanticAppQueryKind.RouteEndpoints });
const routeRecognizerStates = app.ask({ kind: SemanticAppQueryKind.RouteRecognizerStates });
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
const valueChannelRows = app.ask({
  kind: SemanticAppQueryKind.BindingValueChannels,
});
const dataFlowRows = app.ask({
  kind: SemanticAppQueryKind.BindingDataFlows,
});
```

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
owner type.
Those member declarations may come from app source, source-shipped packages, or Program-only declaration files. The API
should surface the source reference when the TypeChecker can name the declaration. If the cursor is on a member of an
index-signature-only owner, cursor-info may report that selected member as an index-signature access with the indexed
value type and no source reference; completions should still treat that owner as non-enumerable weak-type pressure rather
than inventing candidate names.
The cursor pressure script derives hover targets, navigation targets, diagnostic signals, and compact LSP envelopes
from this same result so feature pressure stays on the shared cursor-info substrate instead of becoming separate source
scans. It labels index-signature selected members as synthetic so those rows do not look like lost TypeChecker
declaration provenance.
It also seeds a bounded `diagnostic-probe` lane from file/app diagnostic source ranges before generic expression
sampling. The reader may inspect more diagnostic rows than it samples and then chooses loci by diagnostic pressure class,
so rare diagnostics such as binding assignment strictness are not hidden behind a dominant weak-owner class. That keeps
cursor-locus pressure aligned with the diagnostic sites discovered by broader file/app loci, especially weak owner
surfaces that a first-N expression walk may miss.
In multi-project pressure runs, the script passes the current `projectKey` into the public cursor APIs before comparing
them with the lower-level inquiry answer. That keeps wrapper-drift pressure separate from legitimate app-context
ambiguity when the same template source is visible through more than one opened app-world.
Cursor-info carries first-pass diagnostic rows from two sources: completion-context weak expression-member owner
surfaces, and binding data-flow assignment diagnostics whose source span contains the cursor. These rows are not text
edits yet; they expose a typed diagnostic kind, diagnostic authority, optional framework error code, selected member,
owner/value type displays, owner type projection origin, source, a suggestion kind such as `declare-explicit-member`,
and an action target envelope. The action target is the
semantic thing a future code action should operate on: an `owner-type` with source for explicit member or owner-type
repairs, a `scope-slot` source when the write/read pressure has not resolved to a TypeChecker owner, or an `expression`
source for runtime-noop assignment rewrites. This gives future code actions a typed foothold without making autocomplete
invent names from `Record<string, any>` or `any`. When the owner type cannot be materialized because the template scope
slot itself has no TypeChecker-backed type, the diagnostic uses `expression-member-owner-type:missing-slot-type` with a
`declare-scope-slot-type` suggestion instead of pretending a member lookup happened on a known owner.
Diagnostic rows keep `missingInput` as the primary compact reason and also expose `missingInputs` for the full reason
set. Binding assignment strictness can legitimately carry multiple TypeScript-policy reasons for one authored source
span, so consumers should aggregate `missingInputs` when they need pressure counts or code-action routing.
Runtime-unassignable target-to-source bindings are separate from TypeScript strictness. Aurelia's `astAssign` falls
through without updating unsupported expression targets, so semantic-runtime reports those as
`binding-source-assignment-runtime-noop` with `use-assignable-expression` guidance rather than as framework errors.
Current weak-owner and strictness diagnostics use `diagnosticAuthority: "semantic-authoring-policy"`;
runtime-noop assignment rows use `diagnosticAuthority: "framework-runtime-behavior"` with `frameworkErrorCode: null`.
Rows with `diagnosticAuthority: "framework-error-code"` should only be introduced after checking Aurelia source through
Atlas `framework.errors` and should carry the exact framework code.
The policy for turning weak owner and binding assignment pressure into cursor/file diagnostic rows lives in
`template-diagnostic-policy.ts`. Keep that boundary honest: cursor/template readers should locate source and semantic
context, while the policy module owns severity, suggestion kind, action target, and product-policy wording.
`TemplateDiagnostics` lifts those same weak-owner facts from a cursor answer into a file/app-locus answer. It scans the
opened app's compiled template basis, or the requested `sourceFile` when supplied, through parser-owned member-name
spans and returns exact source ranges for diagnostic rows. Keep this as an aggregation over the same cursor-info
substrate until diagnostics grow their own materializer: cursor remains the sharpest probe, while file/app loci are the
batch surfaces that editors, CI, and agents need.
Batch diagnostic scans read authored template text through the admitted source-file address, whose path is workspace-
relative. Do not resolve those addresses relative to the selected app project: nested app packages and source-shipped
dependency packages can both contribute compiled templates to one app-world.
The scan caches source text together with line-start offsets. Keep offset-to-line conversion indexed rather than
prefix-splitting per diagnostic span; file/app loci intentionally walk many expression member spans.
Template completion and cursor-info answers preserve `missingInputs` from the inquiry substrate. For expression-member
sites, weak owner shapes such as `any`, index-signature-only records, or owner types with no projected members are still
reported there so callers can explain the absence of candidates. They are not, by themselves, proof of a missing
semantic-runtime rule; pressure scripts classify them as weak-type pressure unless a concrete typed member was lost
between scope construction and the answer.

`AppTopology` is the first app-building projection. It composes already-materialized configuration, resource, compiler,
template, and authored router facts into app roots, components, route configs, bindables, component dependencies, external template assets, and roleful
source files. Conventional state, service, and model support files are surfaced as source roles so app-building plans can
verify the shape they asked for without treating those files as Aurelia resources. Keep the projection verification-
oriented: if a future authoring plan cannot be checked by this projection or another narrow semantic answer, improve the
substrate before adding source-generation convenience.

When `createSemanticRuntime` is opened without explicit projects, boot discovers package/tsconfig project frames for
monorepo-shaped workspaces. Default `openApp()` chooses an `aurelia-app` project from import/receiver-grounded bootstrap
signals without constructing and
emitting rejected candidates into the shared kernel store; callers with a known app package should still pass
`projectKey` explicitly.
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
not proven either the external lane or a static internal route string.
Observation-owned seams can also carry typed reasons. For example, `SelectValueObserver` channels distinguish dynamic
`multiple.bind`, unclosed option values, empty option domains, missing authored select targets, and multi-select source
shape pressure; any data-flow row blocked by that channel preserves the same reason instead of flattening the pressure
into an untyped binding seam.

`ResourceDefinitions` exposes converged Aurelia resource definitions recognized from explicit decorators, runtime
definition objects, static fields, metadata, and project conventions before app-world/compiler visibility is known.
This is the right query for plugin-library and monorepo package pressure where a package can define resources without
booting an app root. Rows include resource kind, name/key/aliases, target name/source, bindables, dependencies, template
shape, watch metadata, attribute-pattern entries, custom-element/custom-attribute flags, and optional kernel handles.
Watch rows expose the metadata shape that resource convergence can statically close: expression kind/property key,
callback kind/property key, flush mode, and source references for the expression/callback carriers when known.
`ResourceVisibility` stays narrower: it answers which definitions are visible to a particular compiler world after
configuration, DI, and resource-scope composition have materialized.

`RouterOptions` exposes effective option products materialized from `RouterConfiguration` admissions and
owner-tagged `customize(...)` option contributions. Rows include the framework-defaulted booleans and strings that are
already used by static topology, especially `useHref`, `useUrlFragmentHash`, and `useEagerLoading`. These rows are the
authoring/API view of router option convergence; they are not a navigation runtime state snapshot.

`Routes` exposes source-backed authored router route configs recognized from `@route(...)`, `Route.configure(...)`, and
Aurelia's static route metadata path used by `Route.getConfig(...)`. Rows preserve route kind, paths,
id/title/redirect/viewport/data/nav/fallback presence, child-route cardinality, routeable component reference kind,
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
`RecognizedRoutes` exposes the next layer for closed static router-resource instruction paths. Rows carry the recognized
path, residue presence, fulfilled parameter count, recognizer reference, causing `ViewportInstruction` /
`ViewportInstructionTree`, route-context closure, redirect depth, endpoint path/residual closure, source, and optional handles. The
recognizer walk mirrors Aurelia's `RouteRecognizer.recognize(...)` candidate chain, including the handler-based endpoint
grouping that keeps multi-path and residual endpoints attached to the same route config. Closed static redirects publish
additional recognized-route rows for their re-recognized target paths with `redirectDepth > 0`. These rows are still
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
compilation without a modeled redirect target now surface an explicit router open-seam reason instead of silently
disappearing from the transition tree.
`TypedNavigationInstructions`, `ViewportInstructions`, and `ViewportInstructionTrees` expose the handoff products that
router resources create before route-recognizer matching and route-node transition compilation. Rows keep the
RouteExpression-backed typed instruction kind/value lane, viewport wrapper shape, child cardinality, parameter count,
grouping open/close markers, route-context closure, absolute/query/fragment flags, and optional handles visible without
claiming that navigation or viewport activation has run. Static string values and interpolation/template strings with a
static route prefix can both materialize this layer; dynamic holes become opaque segment/query values so the recognizer
can still reason about route shape. Getter/field-backed string values may also close through binding-source value
evaluation. Fully dynamic or host-dependent values remain open with the lower-level binding/evaluator reason preserved
as typed open-seam reason kinds.

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
strategy, DOM events, target/property type displays, writability, observability, authority, source address, and optional
handles. This is the compact authoring pressure signal for form controls, class/style property access, and later
TS-backed source/target flow through ObserverLocator-shaped semantics. Standards-shaped attribute access such as
`data-*`, `aria-*`, and generated SVG-analyzer attributes reports the `data-attribute-accessor` strategy, matching
Aurelia's `NodeObserverLocator` routing.

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

`BindingValueChannels` exposes the observer/accessor or direct-operation value shape that runtime data flow should use
instead of blindly treating the raw DOM property as the transported value. Static single-select options now surface a
literal value domain such as `'ship' | 'pickup'`, and expression-backed `model.bind`/`value.bind` can supply option,
radio, and checkbox element values through the lowered sibling binding products. `checked.bind` surfaces boolean,
radio-value, and checkbox array/set-membership branches. Static multi-selects expose selected option element domains for
array sources, while dynamic `multiple.bind`, non-literal dynamic element values, custom matcher semantics, and map
key/value modes should stay visible as channel pressure until their observer semantics are closed. Select-channel open
rows carry typed reason kinds such as `binding-value-channel-dynamic-select-multiple`,
`binding-value-channel-select-option-value-open`, `binding-value-channel-select-option-domain-open`, and
`binding-value-channel-select-multiple-source-open` on both the value-channel row and any dependent open data-flow seam,
so scripts can aggregate the framework concept without parsing the human summary.
`multiple.bind` closes as static only for literal `true`/`false` expressions or single boolean-literal TypeChecker
projections; a normal `boolean` source remains runtime-dependent because Aurelia's `SelectValueObserver` branches on
the live element state.
Class/style value channels report `class.bind` and class interpolation token channels, `.class` toggle channels with
their toggled class names, `style.bind` and style interpolation rule channels, and `.style` property channels with the
targeted CSS property. Text interpolation through `ContentBinding` reports `text-content` channels backed by
`text-content-set` target operations. `SpreadValueBinding` reports the target/value shape of its per-bindable inner
`PropertyBinding` fan-out when the target component's bindable keys are statically known, instead of pretending that
`...$bindables` is a static DOM property. `SpreadBinding`-owned inner bindings created from captured `...$attrs` are
reported through the same target-access, target-operation, value-channel, and data-flow projections as ordinary
bindings, while their ownership remains a binding-to-binding runtime claim under the hood.

`BindingDataFlows` exposes the source/target edge after scopes plus target access or target operation are materialized.
Rows report binding direction, parser publication state/result kind, source expression lane/name/type, raw target
property type, observer/direct-operation runtime value type, TypeChecker source-type pressure, source writability for
target-to-source flows, TypeChecker assignability checks in the active directions, source address, optional handles, and
row-local runtime data-flow open pressure. This is the compact pressure signal for
two-way form controls, setter-backed state, class/style presentation bindings, template-controller value bindings, and
future validation/write diagnostics. Direct spread value bindings appear here as source-to-target flow from each spread
object property into the corresponding target bindable, such as `featuredCardBindings.productId -> productId`.
Captured `...$attrs` flows appear as the concrete inner binding that `TemplateCompiler.compileSpread(...)` produced,
for example a forwarded `disabled.bind="false"` reporting boolean-to-boolean flow on the inner input element. Captured
parent expressions can also surface here: the storefront `field-shell` wrapper reports forwarded `value.bind="email"`
as an inner input value flow typed against the checkout-form parent scope.

## Fixture Pressure

Authoring fixtures live under `../../fixtures/authoring`. They should look like code we would be comfortable
recommending to Aurelia users, even when that makes the semantic runtime work harder. See
[../authoring/README.md](../authoring/README.md) and [../application/README.md](../application/README.md) for the
authoring/topology boundaries behind those fixtures.

Analyzer stress fixtures should be separate from authoring fixtures. Avoid adding brittle golden snapshots around either
kind of fixture; the valuable signal is whether the API can expose precise, navigable open seams and compact high-level
answers after the app is reopened.
