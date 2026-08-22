# WS04 — Incremental Lifecycle, Cancellation, Performance, and Retention

Status: `queued`

## Governing invariant

Project inputs, semantic generations, request guards, diagnostic receipts, workers, and caches converge on the newest
authored state without stale publication, starvation, long host stalls, or unbounded retention.

## Entry criteria

- WS01 foundation baseline is stable.
- Feature-specific WS02/WS03 lifecycle journeys name the generations and caches they pressure.
- Performance thresholds and sample sizes are fixed before measurement.

## Initial threat matrix

- Dirty edit -> answer -> undo -> answer -> save -> close/reopen.
- Rapid A -> B -> A and cross-file dependent refresh.
- Source/topology create/delete with multiple roots and open documents.
- Session withdrawal/replacement with requests in flight.
- Stale cancellation, latest-result wins, and Worker restart.
- Diagnostic proof, app/query claim, TypeChecker generation, resource paging, and Explorer cache bounds.
- Cold/warm/unchanged request tails and sustained edit/pull memory growth.

## Work

1. Supply deterministic lifecycle tests to WS02 and WS03 before their checkpoints close.
2. Run currentness and cancellation stress across rename, diagnostics, references, resources, and explanations.
3. Run the preregistered 20-sample current and 5-sample minimum host-tail cohort.
4. Run protocol, incrementality, managed-query, and sustained retention profiles.
5. Audit cache limits, retirement, and heap/process cleanup after restarts and multi-root churn.

## Exit criteria

- F-LIF-001 is verified closed with retained measurements.
- Currentness/cancellation stress has no stale result, starvation, or unbounded retention.
- Exact final implementation meets predeclared latency and memory budgets.
- WS02/WS03 checkpoint receipts include their relevant WS04 proofs.
