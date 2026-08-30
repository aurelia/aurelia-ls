# @aurelia-ls/aot

Bundler-neutral Aurelia AOT artifact projection over `@aurelia-ls/semantic-runtime`.

Semantic-runtime owns reusable Aurelia semantics, effective resource/carrier identity, and the detached compiler-final
handoff. This package turns those values into executable browser template nodes, runtime AST wires, resource-addressed
compiler payloads, carrier-aware TypeScript/JavaScript transforms, source maps, and build evidence. It does not expose
generation-bound semantic-runtime objects.

The current public API is deliberately narrow:

- `SemanticAotArtifactProvider` opens one semantic build session, transforms owning source modules, and serves claimed
  compiler-patch/runtime virtual modules.
- `AotCompilerPatchModuleEmitter` emits only compiler-owned fields while retaining generated controller/projection
  definitions.
- `AotSourceTransformEmitter` attaches those payloads to decorators, static `$au`, conventions, and nested/anonymous
  `CustomElement.define(...)` calls without reconstructing authored metadata. It also replaces exact semantic-runtime
  browser-facade references with the build-specific AOT facade; it never searches source text for an `Aurelia` name.
- `AotRuntimeConfigurationModuleEmitter` emits the compile-free parser/compiler services, conservative runtime
  fallbacks or exact semantic-runtime-selected resource/renderer leaves, BrowserPlatform container, and base-runtime
  Aurelia facade used by strict AOT builds. Runtime-configuration protocol v2 includes the lookup-only captured-spread
  compiler contract; its content address cannot collide with the earlier blanket-refusal module semantics.
- `AotTemplateModuleEmitter` remains the standalone HTML-resource realization.

Paired HTML has two explicit roles from semantic-runtime. A convention view-definition module keeps the complete
namespace/header surface. A template-value import instead re-exports `template` from the already-validated compiler
payload owned by the source transform, avoiding a second dependency/header realization. The bridge carries its payload
identity and digest so bundlers do not depend on source-before-HTML traversal order.

The current emitter is a CSR baseline. It preserves the compiler's exact DOM node graph rather than serializing and
reparsing HTML, because reparsing can merge adjacent text nodes that Aurelia instruction rows address separately. A
small virtual runtime helper applies compiler fields to Aurelia's cached definition after resource definition and
before its first `Rendering.compile`; this is the candidate for a later additive framework hook. The generated facade
keeps Aurelia/AppRoot lifecycle while replacing implicit `StandardConfiguration` installation through an exact
old-text-validated source carrier. Runtime-html resources, renderers, and event-modifier support are selected
independently from the detached browser-final requirements; uncertainty retains only the affected aggregate group.
Static compiler patches remain usable with the authored JIT configuration when runtime spread closure is nonexact;
profiles that replace `StandardConfiguration` require exact spread closure for every admitted resource and refuse
typed general-compiler pressure from incomplete cohorts, open registration/program sources, `AuCompose`, `enhance`, or
other programmatic compiler use before emitting the lookup-only `AotTemplateCompiler`.
Finer payload maps and broader observation/binding optimization are the next production boundaries. SSR and AOT remain
independent axes.

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
