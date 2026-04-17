# What should it do?

Two things at once:

1) To help build itself
2) To help Aurelia developers build Aurelia apps and plugins

That means it is both:

- an internal self-development instrument that helps the package understand and improve its own architecture
- an external engineering interface that helps humans and AI work on Aurelia codebases with better structural and semantic awareness

# What problem should it solve?

It is meant to solve a problem that is very specific to exactly today's zeitgeist: to make AI-driven engineering actually work at scale.

More specifically, it should:

- compress large TypeScript codebases into queryable, provenance-bearing structure
- make AI-generated changes more understandable, reviewable, and steerable for human operators
- provide a self-healing intermediate interface that can guide inquiry, explain misses, and suggest continuations
- carry design intent and operator direction forward instead of forcing every session to reconstruct them from scratch

The package is still becoming what it wants to be. Near term, it focuses on raising the analyzability ceiling over real codebases while keeping a clean boundary between the framework-agnostic core and the framework-aware layer above it. Aurelia-aware semantics should land soon, but on top of better shared primitives rather than as early contamination of the core.

# Seed docs

These are short guidance notes, not a frozen design:

- [docs/strategy.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/strategy.md)
- [docs/architecture-layers.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/architecture-layers.md)
- [docs/provenance-and-steering.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/provenance-and-steering.md)
- [docs/analyzability.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/analyzability.md)
- [docs/self-pressure-test.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/self-pressure-test.md)
- [docs/open-tensions.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/open-tensions.md)

# Open tensions

Some important questions are still intentionally open:

- What is the true center of gravity of the system: snapshot producer, live inquiry engine, language-service substrate, or a layered combination of all three?
- What should count as canonical truth for which concern: live TypeScript sessions, the claim graph, an internal persistent store, or materialized JSON views?
- How should analyzability be represented operationally: who classifies it, from what evidence, and how are blockers and open fronts carried forward?
- Where is the boundary between framework-agnostic substrate and Aurelia-specific semantic adapters?
- How should the system balance broad cheap structural recovery against deeper semantic interpretation?
- How should it balance stable public contracts against a rapidly evolving internal model while the architecture is still taking shape?
- How should it preserve human control and operator taste without reducing everything to undocumented heuristics?

