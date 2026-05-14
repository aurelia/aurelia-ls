# semantic-runtime

`semantic-runtime` is the in-repo Aurelia semantic substrate for the language server, Atlas, AI-assisted authoring, and
future compiler or analysis work.

It owns product semantics: kernel records, auLink anchors, static evaluation, resource recognition, configuration
admission, DI world construction, template/compiler modeling, expression parsing, TypeChecker-backed projection,
application topology, authoring plans, and verification pressure. It does not own the retired snapshot/query CLI
surface.

The package is intentionally source-first while the substrate is still moving. Build it with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime build
```

Run the aggregate app API pressure lane with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime pressure:app-api
```

Its default input set is discovered from `fixtures/authoring/generated-*`, `fixtures/authoring/storefront`, and every
subfolder under `fixtures/pressure`, so adding a durable fixture makes it part of the broad aggregate lane without
updating the script.

Refresh durable generated authoring fixtures from their recipe source plans with:

```powershell
pnpm --filter @aurelia-ls/semantic-runtime fixtures:authoring
```

Set `SEMANTIC_RUNTIME_PRESSURE_ROOTS` to a path-delimited list of external roots when using external clean-room apps as a
transient pressure surface. Treat the output as local inspection material: do not promote exact paths, project keys,
row names, source text, or app-specific open-reason details from external clean-room roots into tracked files. The pressure
script defaults to `SEMANTIC_RUNTIME_PRESSURE_DETAIL=summary`, which buckets source-assignment and open-seam detail
into durable pressure categories; use `SEMANTIC_RUNTIME_PRESSURE_DETAIL=raw` only for local, non-committed debugging.
It also defaults to `SEMANTIC_RUNTIME_PRESSURE_OUTPUT=aggregate` because the built-in fixture list is broad and
future-you usually needs the combined cross-root pressure shape before opening per-input detail. Use
`SEMANTIC_RUNTIME_PRESSURE_OUTPUT=inputs` for a single isolated root, and `SEMANTIC_RUNTIME_PRESSURE_OUTPUT=both` only
when comparing a combined signal with its contributing roots.
The authoring pressure section prints both value counts and axis-keyed counts/open reasons so broad ontology axes do
not hide unobserved narrow surfaces such as validation ownership, template rendering boundaries, or style resource
ownership. It also prints focused taste sections for style binding, style ownership, form value channels, state
ownership, and validation ownership because those low-count values are often the exact signal needed for the next
authoring or fixture pass. Build-tool profile is also printed as a focused taste section because generated recipe
fixtures intentionally distinguish host-selected build-tool policy from observed typecheck-only project tooling.
Recipe expected-effect output has two lanes: the all-recipe lane keeps cross-recipe failures visible, while the
applicable-recipe lane filters out `not-applicable` recipes so generated fixture drift can be checked without mistaking
missing discriminator facts from unrelated recipes for verifier failures.
Its timing section is phase-oriented: `open-app` is decomposed into app-world pass phases such as static evaluation,
TypeChecker project construction, resource recognition, app-world composition, and template compilation so large-app
friction can be attributed before deciding whether a manual deep dive is worth it.

Keep durable semantics in typed records, vocabulary, claims, provenance, materialized products, and open seams. Use Atlas as the live orientation and inspection layer over this package instead of maintaining parallel static document packets. When a semantic-runtime note should guide future autonomous work, promote its durable essence into `packages/atlas/memory` and link back to the owning README or workbench rather than relying on `.temp` notes.

For the durable folder map, read [src/README.md](src/README.md). For recent context while the package is still settling,
read [src/WORKBENCH.md](src/WORKBENCH.md). Recommendable generated and hand-authored fixture lanes are documented in
[fixtures/authoring/README.md](fixtures/authoring/README.md); analyzer stress fixtures that should not become authoring
recommendations are documented in [fixtures/pressure/README.md](fixtures/pressure/README.md).
