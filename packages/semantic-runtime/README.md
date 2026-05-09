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

Set `SEMANTIC_RUNTIME_PRESSURE_ROOTS` to a path-delimited list of external roots when using proprietary apps as a
transient pressure surface. Treat the output as local inspection material: do not promote exact paths, project keys,
row names, source text, or app-specific open-reason details from proprietary roots into tracked files. The pressure
script defaults to `SEMANTIC_RUNTIME_PRESSURE_DETAIL=summary`, which buckets source-assignment and open-seam detail
into durable pressure categories; use `SEMANTIC_RUNTIME_PRESSURE_DETAIL=raw` only for local, non-committed debugging.
Its timing section is phase-oriented: `open-app` is decomposed into app-world pass phases such as static evaluation,
TypeChecker project construction, resource recognition, app-world composition, and template compilation so large-app
friction can be attributed before deciding whether a manual deep dive is worth it.

Keep durable semantics in typed records, vocabulary, claims, provenance, materialized products, and open seams. Use Atlas as the live orientation and inspection layer over this package instead of maintaining parallel static document packets.

For the durable folder map, read [src/README.md](src/README.md). For recent context while the package is still settling,
read [src/WORKBENCH.md](src/WORKBENCH.md).
