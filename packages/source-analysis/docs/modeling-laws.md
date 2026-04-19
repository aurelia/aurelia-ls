# Modeling Laws

Use this note when adding or refactoring canonical records, evaluators,
projections, or focused semantic lenses in `packages/source-analysis`.

These laws exist to keep the package derivation-first, reviewable, and honest
about cost.

## 1. Canonical Records Are Plain Data

Canonical records should be:

- serializable
- deterministic
- diffable
- free of hidden computation

Do not make object behavior, getters, or lazy traversal part of the canonical
truth carrier by default.

If a consumer wants richer ergonomics, build a projection or wrapper on top of
the record.

## 2. Derivation Must Be Explicit

If a fact is computed, the computation should live in an explicit evaluator,
deriver, or helper.

Do not hide meaningful semantic work behind:

- getters
- property access with unexpected cost
- incidental constructor work

The caller should be able to see when the package is spending analysis.

## 3. No Canonical Field Without Irreducible Value

No field belongs in a canonical record if it can be mechanically derived from
other canonical fields in the same record.

Redundant fields may still exist in:

- projections
- review views
- CLI rows
- golden shapers

but not in the canonical carrier without a strong reason.

## 4. Every Canonical Field Must Answer A Burden

Each canonical field should correspond to a distinct semantic burden such as:

- resolution
- explanation
- registration effect
- diff / retreat
- continuation support

If two fields do not answer distinct burdens, prefer the smaller carrier and
derive the other view mechanically.

## 5. Projections May Be Redundant

Projections are allowed to repeat or reshape canonical data when that improves:

- reviewability
- CLI usability
- golden readability
- debugging

Projection redundancy is healthy when it is explicit and mechanically derived.

Canonical redundancy is usually debt.

## 6. Prefer Shared Context Over Reopening The World

When several lenses or evaluators spend the same repo/session/outputs/programs,
thread a shared context through them.

Do not reopen live analysis just because a second lens needs nearby truth.

Shared substrate reuse is a first-class design constraint in this package.

## 7. Prefer Source Grounding Over Build Artifacts

When both source and declaration/build artifact grounding are available in the
analyzed repo, prefer source as the primary review/debugging location.

Declaration artifacts may still be admissible evidence, but they should not
win silently over repo-owned source when both exist.

## 8. Keep Evaluator Ceilings Bounded

Do not quietly expand a focused lens into:

- whole-program eager traversal
- open-ended recursive call-outcome recovery
- implicit runtime simulation

Prefer:

- export-lens entry
- bounded local value closure
- known API whitelists
- explicit open/frontier outcomes

## 9. Scope Drift Must Be Named

If a lens starts missing load-bearing framework surfaces, either:

- widen the charter explicitly
- or mark those surfaces out of scope explicitly

Do not let silent omission masquerade as a representative slice.
