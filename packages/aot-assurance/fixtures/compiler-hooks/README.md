# Compiler-hook assurance scope

The same application runs in the ordinary JIT lane and the AOT integration's explicit compatible lane. The latter
preserves the whole application as JIT because the imported helpers and mutable class-receiver flags are not proven
stable through eventual template compilation. This is fallback correctness coverage, not a compiler-free or optimized
hook golden. The authored sources deliberately retain those inputs instead of substituting build-time constants.

It covers `processContent` return decisions, a pure root `compiling` hook, and component-local CSS Modules.

`processContent` only skips children when it returns `false`. Host bindings and the element's own view still compile.
The root `compiling` hook also returns `false`, but that return value is ignored. Earlier CSS hook passes can therefore
rewrite classes in children whose interpolation, custom-element, template-controller, and projection markup is later
left uncompiled. The executable expectations check these distinctions rather than assuming raw source is untouched.

Two local CSS registrations share one mapping and run twice on static classes. Dynamic class bindings use one lookup.
An ordinary child does not inherit its parent's local mapping; compiler-created local template types do.

Root-level `cssModules(...)` registration is intentionally outside this positive fixture. Its registry factory and
distinct root mapping ownership need completion in the shared semantic runtime. The unsupported case remains a separate
provider negative test; replacing it with an AOT-only registry allowlist would not establish the missing semantics.

Framework grounding: `process-content.spec.ts`, `template-compiler.hooks.spec.ts`, and `styles.integration.spec.ts` in
`aurelia/packages/__tests__/src/3-runtime-html`, plus the framework's `process-content.md` and CSS Modules documentation.
