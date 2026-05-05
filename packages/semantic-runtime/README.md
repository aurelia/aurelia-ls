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

Keep durable semantics in typed records, vocabulary, claims, provenance, materialized products, and open seams. Use Atlas as the live orientation and inspection layer over this package instead of maintaining parallel static document packets.

For the durable folder map, read [src/README.md](src/README.md). For recent context while the package is still settling,
read [src/WORKBENCH.md](src/WORKBENCH.md).
