# Source Plan

`source-plan` owns neutral source artifact planning: source text, file edit envelopes, source-pattern metadata,
parameter schemas, and project-tooling files that a host may apply after a policy decision.

It is shared by app-builder, future diagnostic/edit planning, and fixture materialization. It must not grow
recipe-specific domain fixtures or verification assertions; those belong in app-builder, fixture verification, or a
dedicated fixture/reference layer.
