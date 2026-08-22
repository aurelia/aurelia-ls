# WS03 — Diagnostics, Recovery, and Problems Policy

Status: `queued`

## Governing invariant

Problems describe the current authored workspace, at exact owned ranges, and disappear when their owning fact, document,
configuration, or session disappears.

## Entry criteria

- WS01 identity canaries are green.
- Existing focused diagnostic suites and lane baselines are recorded.
- WS04 can supply currentness/session test support.

## Initial threat matrix

- Native CSS/JavaScript false Problems versus `aurelia-html` suppression tradeoffs.
- File/folder rename, delete/recreate, configuration membership, and workspace retirement.
- Dirty malformed tags, attributes, quotes, comments, SVG, and `foreignObject`.
- Rapid invalid -> valid and A -> B -> A edits.
- Framework/plugin spellings, dynamic registration, Web Components, aliases, and app-owned shadows.
- Semantic primary plus native TypeScript related/duplicate presentation.
- Finding-policy severity transitions and final clearing.

## Work

1. Make an explicit tested product decision for the native diagnostic default and onboarding.
2. Plant diagnostics, then exercise file/folder/config/session transitions and prove old URI collections clear.
3. Decide which HTML recovery facts become Aurelia Problems when native validators are suppressed.
4. Run a bounded external-app corpus and classify false-positive pressure instead of tuning from synthetic fixtures only.
5. Test `information -> warning -> error -> off` through the real Problems UI.
6. Review contextual checker evidence alongside native TypeScript Problems for noisy double presentation.

## Exit criteria

- F-DIA-001 through F-DIA-004 have explicit verified outcomes.
- No stale Aurelia Problem survives supported file/folder/config/session transitions.
- Dirty malformed edits follow a bounded actionable recovery policy without stale cascades.
- Native suppression behavior matches settings, README, and changelog.
- Focused semantic/LSP suites, diagnostic lanes, dependent-file tests, and current/min host journeys are green after the
  final WS03 change.
