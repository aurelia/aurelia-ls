# Strategy

`source-analysis` is meant to do two things at once:

- help build itself
- help Aurelia developers build and maintain Aurelia apps and plugins

The near-term job is to make large TypeScript codebases easier for AI and humans to work with by turning them into something queryable, explainable, and reviewable.

The package needs a clean separation between a framework-agnostic core and a framework-aware semantic layer on top. Aurelia-specific meaning should arrive fairly soon, but it should land on better shared primitives rather than getting mixed into the base substrate too early.

This package already has tech debt. Some features are only half-spent, some layers are not clean yet, and some of the self-documenting and continuation behavior is still uneven. The point is not to hide that. The point is to improve it in a way that also improves the tool's ability to guide further improvement.
