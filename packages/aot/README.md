# @aurelia-ls/aot

Bundler-neutral Aurelia AOT artifact projection over `@aurelia-ls/semantic-runtime`.

Semantic-runtime owns reusable Aurelia semantics, effective resource/carrier identity, and the detached compiler-final
handoff. This package turns those values into executable browser template nodes, runtime AST wires, resource-addressed
compiler payloads, carrier-aware TypeScript/JavaScript transforms, source maps, and build evidence. It does not expose
generation-bound semantic-runtime objects.

The current public API is deliberately narrow:

- `SemanticAotArtifactProvider` opens one semantic build session, emits complete convention definition modules,
  transforms compiler-patch-owning source modules, and serves the virtual modules required by compiler-patch routes.
  Its compilation cohort is the application's admitted resources, including visible registrations, resolved routes,
  and recursive declared dependencies. Standalone IDE/MCP authoring templates are not implicitly part of a build.
  Unknown runtime demand still prevents unsafe compiler/configuration removal; this is not whole-program dead-code
  analysis or permission to omit a registered resource merely because no current template names it.
- `AotCompilerPatchModuleEmitter` emits only compiler-owned fields while retaining generated controller/projection
  definitions. Source-owned local-template forests allocate every generated Type shell first, then wire the exact
  owner/peer/nested dependency graph before attaching compiler-final definitions and appending only direct local Types
  to the authored owner.
- `AotSourceTransformEmitter` attaches those payloads to carrier-owned decorators, static `$au`, and nested/anonymous
  `CustomElement.define(...)` calls without reconstructing authored metadata. Convention resources whose HTML module
  is already the complete definition do not receive a second carrier patch. The transform also replaces exact
  semantic-runtime browser-facade references with the build-specific AOT facade; it never searches source text for an
  `Aurelia` name.
- `AotRuntimeConfigurationModuleEmitter` emits the compile-free parser/compiler services, conservative runtime
  fallbacks or exact semantic-runtime-selected resource/renderer leaves, BrowserPlatform container, and base-runtime
  Aurelia facade used by strict AOT builds. Runtime-configuration protocol v2 includes the lookup-only captured-spread
  compiler contract; its content address cannot collide with the earlier blanket-refusal module semantics.
- `AotTemplateModuleEmitter` remains the standalone HTML-resource realization.
- `AotFrameworkLinkEmitter` combines compiler/parser ABI facades with optional framework-published link graphs.
  The current RC2 build-only derivation pins all three core package manifests independently of the original RC2
  package graph. It admits them only after the session's existing compiler/spread/configuration closure checks;
  `readAotFrameworkLinkPackage` verifies the published file contract and captures modules/maps before emission.

Local-template execution has two exact owner-Type realizations. Carrier-owned compiler patches receive the authored
owner Type and its converged dependency prefix; standalone convention DefinitionModules allocate their root Type shell
before local shells, wire the same cyclic graph, then define and register that root Type. Generated local Types retain
only compiler-final definition metadata in this first wire; JIT's separate raw static `$au`/initial dependency surface
remains an explicit introspection/SSR parity cell rather than a hidden approximation.

Paired HTML has two explicit roles from semantic-runtime. A convention view-definition module is the sole
compiler-final namespace/header realization; the official conventions transform attaches that namespace at the final
class location without an AOT-injected pre-conventions class reference. Its template artifact carries resource and
compiler-variant identity directly and does not pretend to own a virtual patch. A template-value import instead
re-exports `template` from the already-validated compiler payload owned by the source transform, avoiding a second
dependency/header realization. The bridge carries its payload identity and digest so bundlers do not depend on
source-before-HTML traversal order. Inline and other carrier-owned templates use the same patch route without an HTML
bridge.
This split does not infer unresolved convention composition: named/local dependencies, registry-valued dependencies,
and executable header values remain subject to the complete emitter's existing fail-closed checks.

The current emitter is a CSR baseline. It preserves the compiler's exact DOM node graph rather than serializing and
reparsing HTML, because reparsing can merge adjacent text nodes that Aurelia instruction rows address separately.
Handoff v8 carries final carrier/content document affiliation, each element's original native `is` creation input,
parser-inert HTML script state, and a nullable parsed-range initialization description.
The emitter constructs the complete graph in the inert template-contents document, then adopts generated-context
content into the platform document when requested by semantic-runtime. Native custom elements therefore do not
construct during module loading. The original `is` creation value stays distinct from hook-rewritten attributes.
This also preserves JIT Rendering's first-import versus cached-clone upgrade timing; simply keeping all content inert
would change repeated generated-template views. Adjacent text nodes remain separate throughout.
Parser-inert HTML scripts need one additional creation step: an empty script skeleton is parsed before attributes and
child nodes are applied. Creating such a script with createElement would incorrectly make it executable on attachment.
Only the empty skeleton and escaped original `is` value use parsing; authored code/text is still built as DOM nodes.
SVG scripts and explicitly dynamic script creation are not silently made inert. Direct DOM output also permits valid
DOM children under HTML void elements, which HTML serialization alone could not preserve.

Range controls need their parsed initialization, not just final attributes: sequential attribute writes can produce a
different default value, and the compiler can consume native `min`, `type`, or other attributes as Aurelia resources.
Semantic-runtime projects its existing pre-walk attribute snapshot and ordered removals for originally parsed ranges.
The emitter restores consumed native inputs temporarily, recomputes the clean default with a value content-attribute
write, then repeats those removals. It does not assign `.value`, reorder retained attributes, or simulate numeric
sanitization. Dirty-value behavior, reset and runtime cloning remain native. Arbitrary source-hook range histories
retain their separate unsupported boundary; this is not blanket normalization of factory-created controls.
Carrier affiliation is preserved separately: an implicit wrapper is platform-owned, whereas a selected authored
outer template can remain inert. Semantic-runtime supplies these final facts from the same forest that answers
source hooks' temporal ownerDocument reads; AOT does not derive them again from definition kind or final parentage.
A small virtual runtime helper applies compiler fields to carrier-owned Aurelia definitions after resource definition and
before its first `Rendering.compile`; this is the candidate for a later additive framework hook. The generated facade
keeps Aurelia/AppRoot lifecycle while replacing implicit `StandardConfiguration` installation through an exact
old-text-validated source carrier. Runtime-html resources, renderers, and event-modifier support are selected
independently from the detached browser-final requirements; uncertainty retains only the affected aggregate group.
Static compiler patches remain usable with the authored JIT configuration when runtime spread closure is nonexact;
profiles that replace `StandardConfiguration` require exact spread closure for every admitted resource and refuse
typed general-compiler pressure from incomplete cohorts, open registration/program sources, `AuCompose`, `enhance`, or
other programmatic compiler use before emitting the lookup-only `AotTemplateCompiler`.
Generated binding evaluation/dependency specialization and broader compiler admission remain separate production
boundaries. Full mapped framework-link profiles remain open; SSR and AOT remain independent axes.

`compilationMode: 'compatible'` permits application-wide JIT fallback when semantic-runtime identifies an unsupported
reached `processContent` invocation. Its effects are not proven template-local: it might change another component's
definition before that component first compiles. Consequently **no** definition, source module or runtime configuration
is patched, including otherwise exact siblings. Every requested HTML module uses ordinary JIT conventions, even when
it was outside the static resource cohort. The real compiler/parser and authored registrations remain available.

The shared typed refusal is the trigger; AOT does not classify error messages or infer scope from a successful prefix
of hook evaluation. Source-attachment gaps do not prevent leaving source untouched. Open sibling analysis may remain
under JIT, but abrupt, pending, ineligible and issue-backed outcomes still block this initial compatible admission.
Those are conservative build boundaries, not a claim that every such application necessarily fails under JIT.
Generic hook-registration/provider uncertainty and unsupported root `compiling` hooks do not independently trigger
fallback yet. Failed artifact production is never converted into JIT.

Evidence reports `fallbackScope: 'application'`, the trigger and preserved cohort. The provider supplies the non-fatal
`AOT_APPLICATION_JIT_FALLBACK` advisory for build adapters; suppressing the warning does not change the fallback.
The effective configuration mode becomes `preserve` even when replacement was requested. Compiler-removing framework
links cannot apply: `allow-c0-fallback` keeps the original graph, while `require-applied` remains an explicit conflict.
Strict remains the default, and compatible builds with no fallback trigger still compile normally.

Shared hook support includes owned document factories, node copying, text edits, contextual innerHTML, structural
selectors, variadic append and generated
binding/controller/projection lowering, including native and Aurelia slots.
Native custom-element construction and unclosed resource effects in the platform document remain explicit unsupported
hook results; native-state and parser-profile boundaries follow the same compatible policy, not a separate
partial-template fallback. The shared template README owns the precise supported DOM envelope.

Compiler-hook registration is retained runtime DI/metadata behavior, not a request to compile a template. The linked
compiler facade preserves `ITemplateCompilerHooks`, `TemplateCompilerHooks` and its decorator while real compilation
APIs remain guarded. The strict hook/CSS Modules browser golden emits seven artifacts with no fallback; its original
compatible counterpart still preserves all source when mutable hook captures lack temporal authority. Registration
preservation does not bypass callable/world closure.

`src/testing` contains two retained low-level characterization lanes:

- the direct JIT oracle batches compiler worlds in one process and supports filters, shards, repetition, timing, and
  JSON receipts;
- the browser-tree oracle compares browser parsing with semantic-runtime's browser-template model in one Chromium
  session.

These lanes are diagnostic tools. End-to-end correctness belongs to `@aurelia-ls/aot-assurance`, which builds the same
application through JIT and AOT and compares browser-visible outcomes.

## Commands

```powershell
pnpm --filter @aurelia-ls/aot build
pnpm --filter @aurelia-ls/aot typecheck:test
pnpm --filter @aurelia-ls/aot test
pnpm --filter @aurelia-ls/aot oracle:browser
pnpm --filter @aurelia-ls/aot oracle:jit -- --query=property-binding
pnpm --filter @aurelia-ls/aot-vite test
pnpm --filter @aurelia-ls/aot-assurance test
pnpm run assure:aot
```

`oracle:browser` is intentionally outside the default fast Vitest path because it launches Chromium. Machine consumers
can build once and invoke the corresponding scripts directly when they need a single JSON receipt:

```powershell
node packages/aot/scripts/run-browser-tree-oracle.mjs --json
node packages/aot/scripts/run-jit-oracle.mjs --shard=1/4 --json
```
