# Source Substrate

The source substrate owns the hot TypeScript world for the internal repo packages. It admits source into a shared
LanguageService-backed Program, keeps the current TypeChecker available, and gives higher lenses stable source and
declaration addresses without importing package runtime exports.

## Responsibilities

- Admit `packages/atlas` and `packages/semantic-runtime` source through their tsconfigs for TypeChecker-first internal analysis.
- Keep a hot TypeScript `Program`, `TypeChecker`, and later language-service reference machinery in the daemon process.
- Normalize file, span, declaration, symbol, and package identities into source-level records.
- Stay semantics-neutral: source declarations are not vocabulary facts, product claims, DI facts, or framework facts.
- Provide a boring base that TypeChecker-driven product, self-analysis, and source navigation lenses can share.

## Non-Responsibilities

- Executing or importing `@aurelia-ls/semantic-runtime`.
- Inferring Aurelia semantics from private pattern tables.
- Owning ECMAScript static evaluation, TypeChecker projection policy, or product materialization.
- Serving as a user-facing lens by itself.

## Pressure

This substrate should remain less clever than the lenses above it. Its job is to hold the expensive compiler state
and make source facts addressable. Internal package semantics should prefer explicit types and TypeChecker projection.
Framework analysis can spend this same kind of source project as basis, but its evaluator closure belongs to the
framework-facing evaluation substrate rather than this internal package source map.
