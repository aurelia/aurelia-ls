# Project analysis

`project-analysis` owns project-scoped facts that are downstream of boot/source-world membership but upstream of any
one semantic consumer. IDE, MCP, and future AOT consumers must use these facts rather than deriving package wiring or
source-link behavior independently.

Package identity has two layers. `ResolvedPackageOwner` names one physical package root plus its manifest identity.
`ResolvedPackageInstance` adds a logical package-manager locator only when TypeScript's `preserveSymlinks` policy keeps
that locator semantically distinct. Equal package metadata at different physical roots never collapses. A locator
retarget is an exact project-input `realpath` change, not a package-name heuristic.

`ProjectModuleResolver` is the normalized module-resolution implementation. Native TypeScript resolution always runs
first, so authored `paths`, package exports, installed declarations, and ordinary source entrypoints retain their
meaning. Only an otherwise unresolved bare import through an exact `node_modules` link can open the linked-source lane.
That lane validates logical and physical manifest identity, lets TypeScript select one advertised missing declaration,
reads the linked package's `rootDir`/`declarationDir` config chain, and accepts exactly one output-equivalent source.
Unsupported layouts and ambiguous candidates remain typed openings; they never become ambient workspace scans.

After one link establishes an exact package owner in a receipt, sources inside that owner may resolve its self-exports
and package `#imports` through the same declaration/source proof. This lane is evidence-driven: an unseeded physical
checkout is not scanned, a nested `node_modules` owner cannot be mistaken for its container, and preserved symlinks stay
bound to the exact locator. Earlier unresolved probes are reconsidered when the receipt gains that owner evidence.
The exact TypeScript `ResolutionMode` is an input to ordinary resolution, linked declaration selection, cache identity,
and source-link revision. Consumers must pass the mode of the concrete usage rather than resolving one package
specifier once and replaying it across import and require conditions.

Resolver instances are receipt-local. Evaluator and TypeSystem computations each construct an instance over their own
captured project-input read scope, so a cache hit cannot hide manifest, negative-existence, config, source, or realpath
reads from a consumer receipt. Deterministic package keys and source-link revisions let those instances publish the same
semantic decision without sharing mutable caches across committed computations.

Source-link readability is not authored ownership. Resolving a dependency source for TypeScript does not make it a boot
root, editable project source, evaluator-admitted module, or diagnostic owner. Evaluator package participation and graph
confinement remain evaluator policy; TypeSystem root/editability authority remains boot/source ownership.
