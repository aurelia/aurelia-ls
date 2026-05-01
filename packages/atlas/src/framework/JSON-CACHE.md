# Framework JSON Cache

Atlas keeps the live TypeScript `Program` and `TypeChecker` as authority. The framework JSON cache is only a derived
memory layer for expensive, deterministic substrate atoms that can be reattached to a fresh Program through source
handles and fingerprints.

## Current Shape

The current entity cache family root is `framework.discovery.entity-catalog.*`. It stores package-scoped chunks for
framework existence atoms:

- `package-exports`
- `registry-exports`
- `di-interfaces`
- `resource-carriers`
- `resources`
- `syntax-products`
- `instruction-slots`
- `binding-admissions`
- `binding-products`
- `observers`
- `app-tasks`
- `router-entities`
- `expression-entities`
- `rendering-structures`

Each chunk lives under `.temp/atlas/cache/framework/`, is ignored by git, and contains one package's rows for one
catalog. Cache size and timing are intentionally not recorded here because they are source-basis and implementation
dependent; re-measure locally when performance decisions depend on them.

The cached rows are not inquiry answers. They are serializable atoms that the `framework.discovery` projections page,
filter, decorate with evidence, and continue from at query time.

The first relationship cache family is `framework.di.relationship-atoms`. It stores package-scoped DI key and
relationship atoms produced by the framework DI index. It follows the same contract: JSON is derived memory, TypeScript
remains authority, and continuations are created at query time rather than persisted.

The first evaluator-derived admission cache family is `framework.discovery.bundle-admissions`. It stores
package-scoped bundle/configuration rows and their normalized registration associations. These rows are not existence
catalog atoms, so they live in their own family and invalidate against all admitted framework package fingerprints:
bundle associations can depend on resources, DI keys, and registry exports declared outside the bundle's package.

## Inclusion Policy

The cache should not depend on somebody remembering a projection name. A framework atom family belongs in JSON when it
has all of these properties:

- deterministic from source text, TypeScript, and Atlas analyzer code
- expensive enough to matter during daemon restart or repeated broad queries
- reused by more than one projection, continuation, or future relationship layer
- representable as serializable atoms with source handles and exact provenance
- safe to validate against the live Program before hydration
- stable enough that the JSON shape is not just a final answer layout

The current policy is:

- package-local existence atoms use package-scoped chunks
- entity atoms that embed cross-package joins must declare dependency package fingerprints
- relationship/effect families should get their own family ids instead of being smuggled into entity chunks
- bundle admission chunks depend on all admitted framework packages until the evaluator can record a narrower
  per-association dependency set
- projection paging, filtering, evidence shaping, and continuations stay outside the cache

This makes the entity catalog a seed layer, not a one-off. As Atlas adds DI, lifecycle, compiler, activation, and
observer relationship lenses, each durable relationship atom family should be promoted into its own cache family once
its row shape is stable.

## Invalidation Keys

Every package chunk carries:

- cache schema version
- cache family id
- family-local version
- producer version
- TypeScript version
- absolute repo root
- `SourceProject` identity
- package fingerprint

Cache reads first check the cheap header fields above, including producer and source-project identity, before hashing
package contents. Package fingerprints are only computed after the chunk is plausibly current. This keeps stale chunks
from old analyzer builds from making daemon startup pay source hashing costs.

The package fingerprint hashes:

- package id/name/root/tsconfig metadata
- tsconfig content
- every owned source file path and text for that package

The producer version combines a human-readable family version with a SHA-256 hash of the compiled module that owns the
recognition logic. This is intentionally conservative: edits to `framework-lenses` invalidate the current entity
catalog family without relying on a maintainer to remember to bump a version string.

## Hydration Contract

JSON hydration must only skip repeated discovery work. It must not replace TypeScript authority.

Safe to store:

- stable source/package/export identities
- serializable TypeChecker display facts used as cached evidence
- source ranges and declaration targets
- classifier roles/capabilities and exact match provenance
- evaluator facts once they have stable atom shapes

Not safe to store as authority:

- `ts.Node`, `ts.Symbol`, `ts.Type`, `SourceFile`, or checker objects
- final `Answer` objects
- continuations as persisted output
- type-display strings as the only semantic proof for future relationship work

If a later projection needs richer facts than the cached atom carries, it should use the cached source handles to ask
the live TypeChecker instead of adding projection-shaped fields to the JSON.

## Trade-Offs

Package-scoped chunks were chosen over one giant manifest because they give cheap partial invalidation and reduce write
contention as Atlas grows. A change in router source should not invalidate expression-parser rows. A future evaluator
family should be free to bump its own schema without rewriting unrelated entity catalogs.

The first implementation keeps the family file format simple JSON instead of a compact binary or JSONL index. The
payload is intended to stay human-inspectable and cheap to parse. If framework graph families grow large enough that
JSON parsing dominates startup, the right next move is probably per-family JSONL or a tiny local KV store, not
projection caching.

The producer hash is conservative and can invalidate more than necessary. That is acceptable while the analyzer logic is
moving quickly. If invalidations become too frequent, split producer modules by family and hash only the smaller
recognition modules.

## Falsifiers

Revisit this design if any of these become true:

- Warm daemon startup is dominated by JSON parse or package fingerprint hashing.
- Cache size grows enough that reading family chunks costs more than recomputing narrowed TypeChecker queries.
- Relationship projections start requiring projection-specific cached fields instead of stable semantic atoms.
- Source moves or refactors frequently invalidate unrelated package chunks.
- A cached row cannot be reattached to live TypeScript source when the package fingerprint still matches.
- A family needs backward-compatible additive schema evolution often enough that hard invalidation becomes disruptive.

In those cases, keep the principle but change the storage: TypeScript remains authority, JSON remains derived memory, and
the cache should move toward smaller atom families with explicit source handles and migration paths.

## Measurement Guidance

On the current framework source basis, the cache should show this qualitative pattern:

- first fill still pays the full TypeChecker/evaluator discovery cost
- fresh hydrate from JSON should be materially faster than recomputing the same catalog atoms
- daemon restart plus `orient()` should benefit after the cache has been filled

The first fill still pays the full TypeChecker/evaluator discovery cost. That is intentional: the cache is a restart
accelerator, not a replacement for the analysis substrate.
