# @aurelia-ls/aot

Clean-slate Aurelia AOT compiler package over `@aurelia-ls/semantic-runtime`.

The first implementation chapter is normalized compiled-definition parity with Aurelia's real JIT
`ITemplateCompiler`. This package will later own residual policy, ordered registration planning, emission, source maps,
and build integration. Reusable Aurelia/application semantics, causal open seams, provenance, and negative closure stay
in their owning semantic-runtime layers.

The package deliberately has no public compiler API yet. Compiled-definition parity is the current characterization
lane; it does not predetermine whether the first proven public boundary is a compiler/session, decision plan, or narrow
generation-bound projection. Do not expose private app-emission orchestration or freeze a wire format prematurely.

Current commands:

```powershell
pnpm --filter @aurelia-ls/aot build
pnpm --filter @aurelia-ls/aot typecheck:test
pnpm --filter @aurelia-ls/aot test
pnpm --filter @aurelia-ls/aot oracle:jit -- --query=property-binding
```

The real corpus will not become one Vitest test per compiler case. `oracle:jit` is the first bespoke batched runner: it
uses one process-lifetime JSDOM/browser platform (required by the framework's markup cache), creates fresh root/child
framework DI containers per case, registers definition dependencies in the child compilation container, reports aggregate and
slow-case timing, bounds failure output, and supports query/id/tag filters, stable shards, repetition, fail-fast, list,
and JSON modes. This keeps large corpus iteration cheap and makes external process sharding possible without sharing
mutable compiler containers.

Vitest is reserved for a small number of harness invariants. The initial contract proves that the isolated container
boots the actual framework `StandardConfiguration`, resolves the real `ITemplateCompiler`, and compiles an explicit
custom-element definition. It is the first executable oracle boundary, not the normalized comparator itself.

Examples:

```powershell
pnpm --filter @aurelia-ls/aot oracle:jit -- --list
pnpm --filter @aurelia-ls/aot oracle:jit:built -- --tag=binding --repeat=20 --timing
node packages/aot/scripts/run-jit-oracle.mjs --shard=1/4 --json
```

Machine consumers should build once and invoke the Node runner directly (or use a silent package-script invocation) so
stdout contains exactly one JSON receipt. Case bodies run sequentially; process shards are the parallelism boundary.
An outer CI timeout guards synchronous compiler hangs without paying one subprocess per case.

An active case is gating: it passes or fails. Deferred semantic families stay outside the active registry until their
normalization/closure contract exists; the runner does not convert mismatches into expected failures or local bailouts.
Every ordinary case uses an explicit definition name and fresh definition/template input. Anonymous generated-name
behavior and other framework module-global state require a separately controlled characterization lane before they can
join an order-independent batch.

Case modules and case bodies must not write directly to stdout or leave asynchronous work unsettled after returning.
Synchronous console output is captured and retained only with bounded failure detail; a subprocess contract proves JSON
mode emits exactly one versioned receipt. Receipts record the AOT/repository identity, semantic-runtime version,
framework version/submodule revision, dirty state, caller build id, and a deterministic case-registry fingerprint.
Repository/framework authority is sampled before execution and rechecked before publication so a long batch cannot be
labeled with a branch or submodule revision that moved underneath it. Dirty receipts are explicitly non-reproducible.

Filters must match at least one case before sharding. A valid stable shard may then contain zero cases and returns a
successful zero-execution receipt without creating JSDOM or looping through repeats. Selected case count multiplied by
repeat is guarded by an explicit execution budget.

One compile request can choose `resolveResources`, ordered root registrations before or after
`StandardConfiguration`, local compilation registrations, and definition dependencies. This keeps hooks, custom
syntax/resources, provider order, and resource-resolution canaries reachable without sharing a mutable container.

`src/testing` is package-private and absent from `exports`; it may use JSDOM and the JIT compiler for characterization.
Before production compiler modules grow, move this tooling into a separate build boundary so core source cannot acquire
an accidental JSDOM, `StandardConfiguration`, or JIT dependency.

Do not depend on the retiring `compiler`, `semantic-workspace`, `ssr`, `ssg`, `transform`, `vite-plugin`, or
`integration-harness` packages. Verified browser, bundler, or process mechanics may be extracted later without
inheriting their semantic contracts, wire formats, or snapshots.

## Build-tool boundary

The compiler core and parity harness are bundler-neutral. They do not depend on Vite or treat the existing conventions
plugin as semantic authority. The greenfield production integration may later be a thin latest-Vite adapter, an Aurelia-
repo-owned wrapper, a standalone adapter, or a two-lane choice between the established conventions plugin and an
experimental AOT-plus-conventions plugin.

If two lanes remain supported, semantic-runtime must model which transform provider and convention dialect is admitted,
including ordering, options, source maps, and open configuration, so IDE and MCP analyze the same effective build world.
Adapter packaging and eventual `npx makes aurelia` selection remain outside this package's current compiler contract.
