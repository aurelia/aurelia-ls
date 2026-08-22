# WS06 — Assurance Admission, Documentation, and Exact Release Evidence

Status: `active`

## Governing invariant

Anything relied upon for release confidence is mandatory, current, and causally bound to the exact clean commit and
installed artifact being accepted.

## Entry criteria

- CP0 records the baseline and known red evidence.
- No behavior snapshot is updated without intentional review.
- Exact-artifact packaging remains package-once and install-once per commit.

## Initial threat matrix

- Tests exist but CI/publication omits them.
- Stale snapshots normalize behavior drift without review.
- Narrow green suites hide shared semantic red contracts.
- Performance evidence belongs to an earlier commit.
- Docs, settings, keybindings, schemas, and changelog disagree.
- Development-extension acceptance is mistaken for exact VSIX acceptance.
- A platform/version lane is claimed without a real host gate.

## Work

1. Gate the complete semantic-runtime Vitest suite in CI and publication.
2. Gate semantic conformance.
3. Add aggregate detection-mode execution for admitted lane fixture/lane snapshots; update only reviewed behavior.
4. Retain full language-server/VS Code, bounded support, current/min host, and changed compiler gates.
5. Place authoritative performance/retention cohorts at the appropriate checkpoint.
6. Reconcile README, schema, changelog, commands, icons, native diagnostics, support envelope, and package boundaries.
7. Build the final clean HEAD-addressed VSIX once, verify inventory/checksum/receipt, install those exact bytes once, and
   retain evidence.

## Exit criteria

- F-AUT-001 through F-AUT-004 are verified closed.
- Every checkpoint command belongs to CI, publication, or a named manual release gate.
- No known-red or stale snapshot suite remains outside the evidence story.
- Product documentation matches final behavior and support boundaries.
- The accepted installed artifact is addressed to the same clean commit that passed all final gates.

## Immediate work

Design aggregate semantic/conformance/lane admission in parallel with WS01, without changing expected behavior or
claiming a green baseline until F-FND-001 and snapshot drift are resolved.
