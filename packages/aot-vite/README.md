# `@aurelia-ls/aot-vite`

This private package is the Vite 8 adapter for Aurelia AOT. It owns bundler
ordering and build lifecycle, not semantic analysis or artifact generation.

`aureliaAot()` runs the AOT authored-source transform before the official
conventions and standard-decorator transforms. A transformed module may claim
shared runtime support and any number of resource-addressed payload modules;
only exact specifiers returned by that transform are resolved, and every load
must come back through the same build session with matching identity and digest.

The official plugin's HTML import callback remains reserved for
`?aurelia-aot` modules as a transitional standalone-HTML realization. Both
paths fail closed: claimed artifacts never fall through to JIT generation.

The provider and session types are a narrow structural port. `@aurelia-ls/aot`'s
`SemanticAotArtifactProvider` implements it without making the Vite adapter own
or import semantic-runtime. The private assurance adapter composes both packages.

The initial adapter accepts only one-shot client production builds. Serve,
watch, SSR, workers, and non-client environments fail explicitly. Optional
receipts expose resource-addressed artifacts, the input graph, and final
chunk-module rendering without assuming one artifact per source filename.
