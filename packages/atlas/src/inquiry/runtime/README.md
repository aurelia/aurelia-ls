# runtime

`runtime` executes inquiry contracts against an in-memory world.

This is not a compatibility layer for old readers and not the default caller surface. It is the package-local implementation workbench used by the durable session daemon.

## Responsibilities

- [world.ts](world.ts) owns the static in-memory contract world.
- [engine.ts](engine.ts) validates and answers inquiries against that world.
- [api.ts](api.ts) exposes the in-memory inquiry API used inside the daemon.
- [lenses.ts](lenses.ts) contains implemented in-memory lenses over static contracts.

The first runtime lenses answer only contract-world questions. Thick TypeScript, product, and framework substrates should later plug into this layer by satisfying the same inquiry and answer contracts.
