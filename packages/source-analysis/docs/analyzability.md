# Analyzability

The package should be able to say not just what exists, but how far it can reason about it.

There are a few separate questions here:

- What regime or profile is active?
- What is the current deterministic ceiling?
- What tier does a specific path or focus fall into?
- What blocks deeper closure?

Long term, the important move is path-level classification. An evaluator should be able to say things like:

- this path is source-analyzable
- this path is type-assisted
- this path is runtime-only because a decisive value or registration only exists at runtime

That is different from repo-level posture. The repo can be broadly analyzable while a specific path still falls outside the current ceiling.

