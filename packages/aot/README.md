# @aurelia-ls/aot

Clean-slate Aurelia AOT assurance and artifact-projection package over `@aurelia-ls/semantic-runtime`.

The current program chapter is broad compiler conservation against Aurelia's real JIT `ITemplateCompiler` and the
framework compiler/runtime corpus. It is not an emitted-code vertical or a narrow normalized-parity milestone. The
corpus must span browser-effective structure, built-in lowering, transformed effects, definition values, diagnostics,
extension effects, provenance, and distinct closure claims before artifact projection begins.

Reusable Aurelia/application semantics, compiler-effect outcomes, consumer-neutral framework definition values,
causal open seams, provenance, and negative closure stay in semantic-runtime. This package will select target
guarantees and later own residual policy, ordered registration/import planning, JavaScript serialization, generated
source maps, artifact realization, and build integration.

The package deliberately has no public compiler API yet. Do not expose private app-emission orchestration, freeze a
wire format, or mirror semantic-runtime's expression/compiler rules merely to make this package larger.

Current commands:

```powershell
pnpm --filter @aurelia-ls/aot build
pnpm --filter @aurelia-ls/aot typecheck:test
pnpm --filter @aurelia-ls/aot test
pnpm --filter @aurelia-ls/aot oracle:browser
pnpm --filter @aurelia-ls/aot oracle:jit -- --query=property-binding
pnpm --filter @aurelia-ls/aot oracle:semantic -- --timing
```

`oracle:browser` is a separate 17-case batched Chromium contract and is intentionally absent from the default fast
Vitest path. It launches Chromium once, parses the complete case registry through `HTMLTemplateElement.innerHTML`, and compares
both serialization and a namespace-aware structural normal form with semantic-runtime's pinned browser-template draft.
Its receipt records the Chromium version, semantic-runtime parse5 authority profile, and exact case-registry digest.
The rows use the same conservation-case base, provenance, obligations, effects, claims, invariants, and closure language
as compiler worlds, so their evidence feeds the canonical obligation audit without pretending to be JIT-executable.
The current customizable-select row is a declared version-scoped divergence: Chromium admits its button and
`selectedcontent` subtree while parse5 8.0.1 still uses legacy in-select parsing. The oracle fails if that divergence
changes or disappears until the case is deliberately reviewed and converted to equivalence.

The real corpus will not become one Vitest test per compiler case. `oracle:jit` is a bespoke batched runner: it
uses one process-lifetime JSDOM/browser platform (required by the framework's markup cache), creates fresh root/child
framework DI containers per case, registers definition dependencies in the child compilation container, reports
aggregate and slow-case timing, bounds failure output, and supports query/id/tag filters, stable shards, repetition,
fail-fast, list, and JSON modes. This keeps large corpus iteration cheap and makes external process sharding possible
without sharing mutable compiler containers.

`oracle:semantic` is a separate observation lane over the same 50 canonical compiler worlds. It generates one
in-memory Aurelia source gallery and asks the real semantic-runtime app/compiler front door to analyze every admitted
definition in one generation, amortizing TypeChecker, static evaluation, DI, and framework support. The current
adapter admits 33 markup/no-setup worlds and reports all 17 unsupported worlds with typed reasons; it never filters
them into apparent success. Each observation retains the canonical world fingerprint, declared effects, actual
semantic compiler profile, root/surrogate instruction kinds, diagnostics, open seams, and authored recovery counts.
The receipt explicitly labels the current compiler-input tree profile as authored HTML; the browser-effective products
are materialized in semantic-runtime but are not yet connected to the production compiler front door.

This lane is raw conservation pressure, not a parity oracle. Semantic-runtime currently fixes `debug=false` and
`resolveResources=true`, while the JIT characterizations use `resolveResources=false`; gallery cases also share a
resource scope, use generated concrete definition types, and traverse authored rather than browser-effective compiler
structure. Those differences are explicit on every admitted row and recomputed from the observed compiler profile. The
current gallery projection still omits the final compiler-mutated family required by most `template.outerHTML`
invariants, and no standalone lane may satisfy a cross-lane equivalence claim. Semantic-runtime now exposes that family
through a generation-bound in-process compiler result; the next AOT adapter must normalize it while its candidate is
current. A later coordinator must validate both authority-bound receipts, compare an exhaustive shared product, and
only then feed satisfied claim IDs into the obligation audit.

The public template-compilation summary contributes its own portable source/model basis. Rich compiler observations
currently come from a synchronous `app.emission` bracket, are currentness-checked again before egress, and deliberately
report no portable observation basis; the runtime incarnation is retired before the JSON result returns. The new
context-family compiler capability closes that semantic-runtime prerequisite, but raw executable/frozen objects still
must not escape this bracket; AOT needs a portable structural characterization before coordination.
The CLI separately content-addresses the executed AOT and semantic-runtime JavaScript trees and the full dirty-worktree
delta so an ignored or already-dirty build artifact cannot masquerade as unchanged authority.

Vitest is reserved for harness and contract invariants. The current 50-case JIT registry spans compile-entry bypass,
diagnostics, static/debug markup, bindings/interpolation/let, slots/projection, surrogates, compileSpread, resource
precedence, capture/spread/ref, native form ordering, generated controller interactions, hooks, processContent, and
nested template controllers. It also pins two DOM-presence distinctions exposed by Chapter 1 pressure: absent versus
present-empty `as-element`, and progressive attribute removal changing a later mapper-selected binding mode. Four
browser/compiler interactions additionally fix fostered target order, paragraph
controller topology, duplicate-binding elision, and current comment-shield carrier behavior. They remain JIT-only
consequences until the multi-lane coordinator joins browser structure to compiled output.

Cases are declarative `aurelia-ls/compiler-case/v1` records. They carry pinned source/test provenance, semantic
obligation witnesses, a runner-neutral compiler/resource world, explicit setup references and registration placement,
focused invariants, oracle lanes, contrasts, extension effects, and multidimensional closure claims. The generic batch
engine receives an executor separately; case records contain no `run(...)` callback. Named executable setups have a
neutral versioned factory/description plus independent lane materializers, fresh values, canonical witnesses, and
reverse-order disposal.

The source-reviewed obligation catalog currently names 223 independent compiler burdens across entry, browser tree,
extensions, nodes, elements, attributes, commands, custom attributes, controllers, projection, local elements, let,
capture/spread, surrogates, ordering, definitions, wire fields, diagnostics, and interactions. The audit deliberately
shows unwitnessed, open, and not-yet-claimed rows; it does not project a coverage percentage. The inert template-fragment
context is the first closure-ready catalog obligation, but the static audit keeps it `witnessed-not-claimed` until a
coordinator supplies a successful authority-validated execution receipt. Browser recovery remains open because the
known Chromium/parse5 select divergence and authored/compiler lineage are not yet resolved.

Examples:

```powershell
node packages/aot/scripts/run-browser-tree-oracle.mjs --json
pnpm --filter @aurelia-ls/aot oracle:jit -- --list
pnpm --filter @aurelia-ls/aot oracle:jit:built -- --audit
pnpm --filter @aurelia-ls/aot oracle:jit:built -- --tag=binding --repeat=20 --timing
node packages/aot/scripts/run-jit-oracle.mjs --shard=1/4 --json
pnpm --filter @aurelia-ls/aot oracle:semantic:built -- --list
node packages/aot/scripts/run-semantic-compiler-oracle.mjs --shard=1/4 --json
```

Machine consumers should build once and invoke the Node runner directly (or use a silent package-script invocation) so
stdout contains exactly one JSON receipt. Case executions run sequentially; process shards are the parallelism boundary.
An outer CI timeout guards synchronous compiler hangs without paying one subprocess per case.

An active JIT characterization passes or fails. The obligation ledger keeps absent semantic families visible outside
the executable registry. The runner does not convert mismatches or open effects into expected failures or local
bailouts, and it rejects equivalence/closed claims until a multi-lane coordinator can actually prove them.
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

One declared world can select compile or compileSpread, debug/resource representation, exact root-before/root-after/
compilation-local/definition-dependency placement, DOM inputs, and named resources or effects without hiding the whole
world inside an imperative fixture. Case and obligation authority remains pinned to the framework revision; the JIT
runner refuses to relabel cases when the submodule moves without review.

`src/testing` is package-private and absent from `exports`; it may use JSDOM and the JIT compiler for characterization.
Before production compiler modules grow, move this tooling into a separate build boundary so core source cannot acquire
an accidental JSDOM, `StandardConfiguration`, or JIT dependency.

The predecessor compiler, semantic-workspace, SSR, SSG, transform, Vite-plugin, and integration-harness packages were
removed at `6dc45b640`. Historical evidence is available at
`ab95afe6658f7e9526c6d15409bd122e0b85bc25`; never restore a dependency on their semantic contracts, wire formats, or
snapshots.

## Build-tool boundary

The AOT artifact layer and conservation harness are bundler-neutral. They do not depend on Vite or treat the existing
conventions plugin as semantic authority. The greenfield production integration may later be a thin latest-Vite
adapter, an Aurelia-repo-owned wrapper, a standalone adapter, or a two-lane choice between the established conventions
plugin and an experimental AOT-plus-conventions plugin.

If two lanes remain supported, semantic-runtime must model which transform provider and convention dialect is admitted,
including ordering, options, source maps, and open configuration, so IDE and MCP analyze the same effective build world.
Adapter packaging and eventual `npx makes aurelia` selection remain outside this package's current compiler contract.
