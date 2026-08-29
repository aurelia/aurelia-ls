# @aurelia-ls/aot

Bundler-neutral Aurelia AOT artifact projection over `@aurelia-ls/semantic-runtime`.

Semantic-runtime owns reusable Aurelia semantics and the detached compiler-final handoff. This package turns that
handoff into executable browser template nodes, runtime AST wires, definition references, dependency imports,
JavaScript modules, source maps, and build evidence. It does not expose generation-bound semantic-runtime objects.

The current public API is deliberately narrow:

- `SemanticAotArtifactProvider` opens a semantic build session and materializes template artifacts.
- `AotTemplateModuleEmitter` realizes a detached template artifact as an executable JavaScript module.

The current emitter is a CSR baseline. It preserves the compiler's exact DOM node graph rather than serializing and
reparsing HTML, because reparsing can merge adjacent text nodes that Aurelia instruction rows address separately.
Resource-carrier-neutral source transforms, generated runtime configuration, finer source maps, and optimization are
the next production boundaries. SSR and AOT remain independent axes.

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
