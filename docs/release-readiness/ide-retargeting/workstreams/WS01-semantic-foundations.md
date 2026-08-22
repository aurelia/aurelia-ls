# WS01 — Semantic Identity, Provenance, and Compiler-World Invariants

Status: `complete`

Start baseline: `5924c3eb2eabd1a1b5aacbb9e83eb6c6750ca47b` on a clean worktree.

Completion commits: `489cc2bed986fca0b47c457ae9ec88fea3e176cc` and
`e507dabc8aea46fe5f3339f158ec60384fe202b3`.

Findings F-FND-001 through F-FND-008 are fixed. Atlas reporting accuracy remains routed to F-AUT-005 in WS06.

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
6. Reconnect runtime target-access observer/adapter/setup/override causality and direct structural product references.
7. Converge RouterOptions winning contributions, product detail, structural closure, and public projection on one product.
8. Enforce singular field provenance through aggregate multi-contributor records, including registry parameters and state
   handlers.
9. Consolidate duplicate structural/name-source derivations and reconnect template-to-router authored provenance only
   after the owning semantic products are correct.

## Exit criteria

- F-FND-001 through F-FND-008 have verified dispositions.
- No authority lookup chooses a longer suffix over an exact path or silently chooses among ambiguous suffixes.
- Cross-lane collision fixtures are green.
- Full semantic-runtime tests and semantic conformance are green after the last WS01 change.
- WS06 has admitted the foundation gates or records a concrete same-checkpoint landing dependency.

## Completion evidence

- Compiler owner membership is distinct from exact runtime resource lookup; routed shadow/same-name canaries pass.
- Boot, query, TypeScript, kernel, and LSP paths converge on exact logical source identity. Ambiguous relative domains and
  mixed-project batches fail closed; linked and outside-workspace sources keep navigation without acquiring edit authority.
- Field provenance is singular, multi-cause fields aggregate deterministic evidence, and target-access overrides discard
  stale losing causality.
- RouterOptions and viewport models have typed product details, exact contributing products, authored provenance, and
  direct structural closure.
- `pnpm run build:ide:types` passed.
- `node scripts/run-vitest.mjs packages/semantic-runtime/test` passed 84 files / 900 tests.
- Semantic conformance passed 684/684 active assertions with zero known gaps.
- Affected template, observation, router, overlay, source-carrier, LSP session, completion, and hover contracts passed.
- Atlas product-architecture pressure passed; its remaining DI callback-expression false positives are F-AUT-005.

## Next action

WS06 must admit the full semantic suite and conformance/lane runners into CI/publication parity before CP1 can close.
WS02, WS03, and the feature-critical WS04 slices are now unblocked for implementation review.
