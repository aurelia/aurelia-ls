# @aurelia-ls/aot-assurance

Private executable parity harness for the Aurelia AOT program.

It builds the same broad fixture twice with Vite 8, serves both production outputs, launches Chromium once, runs one
ordered interaction program per lane, and compares DOM, live form state, model state, events, errors, teardown, and
runtime compiler/parser probes. The AOT lane is supplied by the real semantic-runtime provider and `aot-vite` preset;
there is no pass-through or hidden JIT fallback.

```powershell
pnpm --filter @aurelia-ls/aot-assurance test
pnpm --filter @aurelia-ls/aot-assurance assure
node packages/aot-assurance/out/cli.js --require-bundle-closure --receipt .temp/aot-g0-receipt.json
```

The default fast test builds the runner, typechecks the fixture, and exercises local falsifiers. `assure` performs both
production builds and the real browser run. Build evidence requires one semantic analysis, at least the root and paired
child artifacts, exact source maps, `needsCompile: false`, positive JIT probe controls, and zero AOT compiler/parser
calls. Rendered implementation-code absence is reported separately and can be required explicitly.

The `--require-bundle-closure` command is currently expected to fail: StandardConfiguration still renders the
framework compiler and parser implementations. This keeps G8 visibly separate from the green G0/G1 behavior contract.

The current G0 fixture intentionally uses standards-valid table structure. Its original foster-parenting pressure
exposed a distinct G4 compiler-accounting blocker and remains tracked rather than being normalized away here.
