# Provenance And Steering

The package should not blur together different kinds of truth.

At minimum it needs to keep track of:

- what was directly observed from source or compiler state
- what was inferred by an evaluator
- what was chosen because of operator direction or taste
- what is still only a hypothesis or open front

This matters because the tool is supposed to guide engineering work, not just produce plausible stories.

Operator direction is part of the real grounding model here. It is not noise. A preferred architectural direction, an excluded path, or a design taste can legitimately shape the next continuation, as long as that influence is visible.

