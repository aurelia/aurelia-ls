# WS01 — Semantic Identity, Provenance, and Compiler-World Invariants

Status: `ready`

## Governing invariant

Every authority-bearing request resolves to one intended source, project, snapshot, and semantic owner—or returns an
explicit absent/ambiguous outcome without selecting a different one.

## Entry criteria

- CP0 is complete.
- F-FND-001 through F-FND-003 are reproducible from the audit baseline.
- All shared path/provenance consumers are enumerated before changing the primitive.

## Initial threat matrix

- Exact root path versus a longer identical suffix.
- Relative versus absolute input.
- Multiple project roots with the same relative tail.
- Linked/symlinked package source and authored edit boundary.
- Windows case and separator variation.
- Browser-normalized resource identity versus authored spelling.
- Equal numeric offsets in different source files.
- Generated/product provenance accidentally granting authored field-edit precision.
- Routeable owner retained by a cohort but intentionally absent from exact child lookup.

## Work

1. Ground the cohort owner-resource invariant in framework/runtime ownership; change implementation or contract for
   semantic reasons, not merely to make the test green.
2. Replace bidirectional suffix selection with exact-first identity and explicit ambiguity handling.
3. Audit every matcher consumer and distinguish display lookup from authority-bearing lookup.
4. Add one collision fixture and drive hover, completion, definition, references, rename, diagnostics, semantic tokens,
   and resource navigation through it.
5. Review same-handle `FieldProvenance` fan-out and prove it cannot authorize false field-specific edits or diagnostics.

## Exit criteria

- F-FND-001 through F-FND-003 have verified dispositions.
- No authority lookup chooses a longer suffix over an exact path or silently chooses among ambiguous suffixes.
- Cross-lane collision fixtures are green.
- Full semantic-runtime tests and semantic conformance are green after the last WS01 change.
- WS06 has admitted the foundation gates or records a concrete same-checkpoint landing dependency.

## Next action

Reproduce F-FND-001, write the intended owner-resource contract, and identify the commit that changed the lookup policy.
