# @aurelia-ls/aot-assurance

Private executable parity harness for the Aurelia AOT program.

It builds the same broad fixture twice with Vite 8, serves both production outputs, launches Chromium once, runs one
ordered interaction program per lane, and compares DOM, live form state, model state, events, errors, teardown, and
runtime compiler/parser probes. The AOT lane is supplied by the real semantic-runtime provider and `aot-vite` preset;
there is no pass-through or hidden JIT fallback.

```powershell
pnpm --filter @aurelia-ls/aot-assurance test
pnpm --filter @aurelia-ls/aot-assurance assure
node packages/aot-assurance/out/cli.js --receipt .temp/aot-assurance-receipt.json
```

The default test and `assure` both perform the two production builds and real browser run; `test` additionally
typechecks the fixture. Build evidence requires one semantic analysis, compiler-final artifacts,
source maps, `needsCompile: false`, positive JIT probe controls, and zero AOT compiler/parser calls. Bundle size, heap,
and timing outcomes belong to the benchmark scorecard; package or implementation names are diagnostic evidence rather
than assurance purity gates.

The `--falsifier mutate-instruction`, `--falsifier restore-needs-compile`, and
`--falsifier drop-nested-definition` options mutate emitted artifacts and are expected to make the real assurance run
fail. They remain explicit negative controls rather than a synthetic success-only test mode.

The current G0 fixture intentionally uses standards-valid table structure. Its original foster-parenting pressure
exposed a distinct G4 compiler-accounting blocker and remains tracked rather than being normalized away here.
