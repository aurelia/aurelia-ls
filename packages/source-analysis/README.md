# What should it do?

Two things at once:

1) To help build itself
2) To help Aurelia developers build Aurelia apps and plugins

That means it is both:

- an internal self-development instrument that helps the package understand and improve its own architecture
- an external engineering interface that exposes structured and semantic program knowledge to AI while giving operators more clarity, confidence, and reviewability over the resulting work

# What problem should it solve?

It is meant to solve a problem that is very specific to exactly today's zeitgeist: to make AI-driven engineering actually work at scale.

More specifically, it should:

- compress large TypeScript codebases into queryable, provenance-bearing structure
- make AI-generated changes more understandable, reviewable, and steerable for operators
- provide a self-healing intermediate interface that can guide inquiry, explain misses, and suggest continuations
- carry design intent and operator direction forward instead of forcing every session to reconstruct them from scratch

The package is still becoming what it wants to be. Near term, it focuses on raising the analyzability ceiling over real codebases while keeping a clean boundary between the framework-agnostic core and the framework-aware layer above it. Aurelia-aware semantics should land soon, but on top of better shared primitives rather than as early contamination of the core.

# Working map

The governing notes are meant to be read directly, not restated here.

Before non-trivial work, start with [docs/working-map.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/working-map.md).

For machine-facing API work, read [docs/machine-legible-api-reset.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/machine-legible-api-reset.md) before touching inquiry or host surfaces.

For framework-aware work, read [docs/aurelia/README.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/aurelia/README.md) before designing Aurelia-specific surfaces.

# Campaign continuity

Long-running autonomous work should resume through repo-owned continuity files,
not chat memory.

Start with [docs/resume-protocol.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/resume-protocol.md),
then read the campaign and handoff files it points to.

# Seed docs

These are short guidance notes, not a frozen design:

- [docs/working-map.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/working-map.md)
- [docs/resume-protocol.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/resume-protocol.md)
- [docs/authority-first-campaign.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/authority-first-campaign.md)
- [docs/current-handoff.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/current-handoff.md)
- [docs/decision-log.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/decision-log.md)
- [docs/current-state.json](C:/projects/aurelia-ls2/packages/source-analysis/docs/current-state.json)
- [docs/governing-axes.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/governing-axes.md)
- [docs/shared-semantic-authority.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/shared-semantic-authority.md)
- [docs/strategy.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/strategy.md)
- [docs/architecture-layers.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/architecture-layers.md)
- [docs/roadmap.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/roadmap.md)
- [docs/semantic-analysis.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/semantic-analysis.md)
- [docs/provenance-and-steering.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/provenance-and-steering.md)
- [docs/analyzability.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/analyzability.md)
- [docs/self-pressure-test.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/self-pressure-test.md)
- [docs/open-tensions.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/open-tensions.md)
- [docs/machine-legible-api-reset.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/machine-legible-api-reset.md)
- [docs/aurelia/README.md](C:/projects/aurelia-ls2/packages/source-analysis/docs/aurelia/README.md)

# Open tensions

Some important questions are still intentionally open:

- What is the true center of gravity of the system: live inquiry engine, language-service substrate, derived projection/export producer, or a layered combination of all three?
- What should count as canonical truth for which concern: live TypeScript sessions, the claim graph, an internal persistent store, or derived projections?
- How should analyzability be represented operationally: who classifies it, from what evidence, and how are blockers and open fronts carried forward?
- Where is the boundary between framework-agnostic substrate and Aurelia-specific semantic adapters?
- How should the system balance broad cheap structural recovery against deeper semantic interpretation?
- How should it balance stable public contracts against a rapidly evolving internal model while the architecture is still taking shape?
- How should it preserve operator control and taste without reducing everything to undocumented heuristics?

