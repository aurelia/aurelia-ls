# `@aurelia-ls/aot-vite`

This private package is the Vite 8 adapter for Aurelia AOT. It owns bundler
ordering and build lifecycle, not semantic analysis or artifact generation.

`aureliaAot()` runs the AOT authored-source transform before the official
conventions and standard-decorator transforms. A transformed module may claim
shared runtime support, build-specific configuration/browser-facade modules,
and any number of resource-addressed payload modules;
only exact specifiers returned by that transform are resolved, and every load
must come back through the same build session with matching identity and digest.

The official plugin's HTML import callback remains reserved for
`?aurelia-aot` modules. A complete view-definition artifact stays standalone;
an exact template-value bridge carries its resource payload claim directly, so
the payload resolves even when the HTML graph is visited before the owning
source transform. A later matching source claim is idempotent and a conflicting
digest/variant fails closed. Neither path falls through to JIT generation.

The provider and session types are a narrow structural port. `@aurelia-ls/aot`'s
`SemanticAotArtifactProvider` implements it without making the Vite adapter own
or import semantic-runtime. The private assurance adapter composes both packages.
Each build session also carries the exact convention include/exclude reach and
string-pattern resolution base captured by the active `aureliaAot()` invocation.
That invocation-scoped declaration lets the semantic provider recognize
convention output in programmatic builds without a redundant `vite.config`
source; a missing declaration or explicit disablement never asks semantic-runtime
to infer convention eligibility from class/file shape.

The initial adapter accepts only one-shot client production builds. Serve,
watch, SSR, workers, and non-client environments fail explicitly. Optional
receipts expose resource-addressed artifacts, the input graph, and final
chunk-module rendering without assuming one artifact per source filename.
