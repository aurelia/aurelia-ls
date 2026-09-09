# Application-wide compiler-hook fallback

This is a negative optimization case, not recommended `processContent` usage. After a geometry read unsupported by
the build evaluator, `DynamicGate` deliberately mutates another resource's definition through `Object.assign`.
The replacement changes both template structure and expression behavior before `LateTarget` is first compiled.
Preserving only the consuming `RuntimePage` would not justify precompiling the other resource.

The common assurance harness compares ordinary JIT with explicit compatible-mode application fallback. It checks
that the hook has not run before lazy activation, runs only once across cached hide/reactivation, produces the
rewritten uppercase binding, and does not inherit the build evaluator's tentative `data-passes` mutation. The
standalone HTML import is data, not a component template, so it also exercises official HTML loading outside the
statically selected resource cohort. Both compatible hook scenarios require zero AOT artifacts and preserved
runtime configuration; they make no optimization or compiler-free claim.
