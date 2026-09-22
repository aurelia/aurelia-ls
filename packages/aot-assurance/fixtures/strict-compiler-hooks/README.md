# Strict compiler-hook assurance scope

This is the strict-AOT counterpart to `compiler-hooks`, not a replacement for its compatible-fallback evidence.
Its `processContent` hooks return literal false, true, or undefined without reading mutable captures or receivers.
Its pure root `compiling` hook returns false, which must not suppress compilation.

The two fixtures intentionally share the same DOM vocabulary, CSS Modules material, eight-step browser journey,
and source-derived expectations. This fixture requires seven compiler-final artifacts, no fallback, and replacement
runtime configuration. The original fixture keeps its imported helpers and mutable receiver flags and still requires
application-wide preservation with zero artifacts.

Owner-local CSS runs before content suppression. Child components do not inherit their parent's mapping, while
compiler-created local template types do. Repeated local registrations share a mapping and make successive static
passes; dynamic bindings perform a single lookup. Updates, repeated views, hiding/reactivation and teardown check
that these distinctions survive actual emitted definitions.

Root-level `cssModules(...)` registration is not covered: its registry factory and mapping ownership are a distinct
shared-engine boundary. No temporal-authority or unknown-dependency guard is weakened for this fixture.
