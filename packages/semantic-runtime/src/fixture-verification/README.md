# Fixture Verification

This folder owns row-backed verification contracts for reopened app fixtures and generated source plans.

`ExpectedSemanticEffect` is not a generator recipe and not a file snapshot assertion. It describes the semantic facts an
opened app should expose through API rows: topology, resources, controllers, binding flows, routes, diagnostics,
observation, open seams, and related product projections.

Verification is intentionally neutral: it should not infer taste, generate source, or plan repairs. Fixture manifests may
live next to pressure fixtures to describe semantic contracts that should survive refactors, while app-builder remains
the future owner of recommendable app generation.

`effect-kind-descriptor.ts` is the runtime-readable map from `ExpectedSemanticEffectKind` to verifier observation
surfaces, public query families, and docs/tests seed posture. Use it when app-builder, MCP, IDE, or future fixture tools
need to explain semantic product families without scraping enum comments or inventing local glossaries.

Fixture typechecking is intentionally outside app-builder. `scripts/typecheck-fixtures.mjs`
checks project-backed fixtures through their tracked `package.json` and `tsconfig.json`;
source-only semantic fixtures with `semantic-fixture.json` and `src/**/*.ts` are checked
through a transient TypeScript config so standalone SourcePlan artifacts do not need fake
project tooling just to participate in verification.
