# `@aurelia-ls/aot-vite`

This private package is the Vite 8 adapter for Aurelia AOT. It owns bundler
ordering and build lifecycle, not semantic analysis or artifact generation.

`aureliaAot()` composes the official `@aurelia/vite-plugin`, reserving its
HTML import rewrite callback for `?aurelia-aot` modules. Every such module is
an AOT claim: the injected provider must return an artifact, and provider or
validation failures stop the build. There is intentionally no JIT fallback.

The provider and session types are a narrow structural port. `@aurelia-ls/aot`'s
`SemanticAotArtifactProvider` implements it without making the Vite adapter own
or import semantic-runtime. The private assurance adapter composes both packages.

The initial adapter accepts only one-shot client production builds. Serve,
watch, SSR, workers, and non-client environments fail explicitly. Optional
receipts expose the input graph and final chunk-module rendering needed by the
assurance runner without making assurance machinery part of the AOT core.
