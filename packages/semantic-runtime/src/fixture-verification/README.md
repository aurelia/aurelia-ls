# Fixture Verification

This folder owns row-backed verification contracts for reopened app fixtures and generated source plans.

`ExpectedSemanticEffect` is not a generator recipe and not a file snapshot assertion. It describes the semantic facts an
opened app should expose through API rows: topology, resources, controllers, binding flows, routes, diagnostics,
observation, open seams, and related product projections.

Verification is intentionally neutral: it should not infer taste, generate source, or plan repairs. Fixture manifests may
live next to pressure fixtures to describe semantic contracts that should survive refactors, while app-builder remains
the future owner of recommendable app generation.
