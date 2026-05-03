# scripts

`scripts` contains package-local maintenance entrypoints.

These scripts should check static coherence rather than trying to prove runtime usefulness. The package is intentionally contract-first, so the early checks should verify things like lens-to-substrate references, required vocabulary shape, active terrain, and answer algebra invariants.

## Current Scripts

- [orient.ts](orient.ts) prints the top-level Atlas orientation bundle through the auto-starting session API.
- [self-check.ts](self-check.ts) validates the current inquiry surface map through the auto-starting session API.
- [framework-emulation-symbols-report.ts](framework-emulation-symbols-report.ts) writes the deterministic
  StandardConfiguration/framework emulation Markdown golden by calling the named session report endpoint.
- [inquiry-playground.ts](inquiry-playground.ts) runs the auto-starting session API and prints compact answer summaries.
- [inquiry-session-ensure.ts](inquiry-session-ensure.ts) starts or reuses the local inquiry daemon and leaves it available until its idle timeout.
- [inquiry-session-playground.ts](inquiry-session-playground.ts) exercises idempotent daemon startup, protocol calls, self-check, continuation following, and polite shutdown.
- [inquiry-session-shutdown.ts](inquiry-session-shutdown.ts) stops an existing local inquiry daemon without starting a new one.

## Dependency Rule

Scripts may depend on [../inquiry](../inquiry/README.md) and [../session](../session/README.md). They should avoid becoming hidden production code paths.
